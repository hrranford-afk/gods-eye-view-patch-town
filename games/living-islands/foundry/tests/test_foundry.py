#!/usr/bin/env python3
"""Plain-python tests of the seed foundry (python3 foundry/tests/test_foundry.py). Temp cache and seeds dirs; n=129 worlds so it runs in under a minute."""
import json
import os
import shutil
import sys
import tempfile
import time
import types

HERE = os.path.dirname(os.path.abspath(__file__))
FOUNDRY = os.path.dirname(HERE)
TMP = tempfile.mkdtemp(prefix='foundry_test_')
os.environ['FOUNDRY_CACHE'] = os.path.join(TMP, 'cache')
os.environ['FOUNDRY_SEEDS'] = os.path.join(TMP, 'seeds')
sys.path.insert(0, FOUNDRY)
import sweep            # noqa: E402
import shortlist as SL  # noqa: E402
import sheet as SHT     # noqa: E402

PASSED = []


def check(name, cond, extra=''):
    PASSED.append(name)
    print(('ok   ' if cond else 'FAIL ') + name + (' ' + str(extra) if extra else ''))
    if not cond:
        raise AssertionError(name)


def args(**kw):
    a = types.SimpleNamespace(seeds=4, start=11, provinces=['A', 'B'], n=129, size=512.0, workers=2, world=None)
    a.__dict__.update(kw)
    return a


def main():
    snap = sweep.snapshot()
    mh = sweep.metrics_hash()
    # 1 manifest hash determinism and sensitivity
    m1 = sweep.manifest('A', 5, 512, 257, snap, mh)
    m2 = sweep.manifest('A', 5, 512, 257, snap, mh)
    check('manifest hash deterministic', m1['hash'] == m2['hash'] and len(m1['hash']) == 16)
    check('hash changes with seed, province, n, world hash, patch',
          len({m1['hash'], sweep.manifest('A', 6, 512, 257, snap, mh)['hash'], sweep.manifest('B', 5, 512, 257, snap, mh)['hash'],
               sweep.manifest('A', 5, 512, 129, snap, mh)['hash'], sweep.manifest('A', 5, 512, 257, dict(snap, world_hash='x' * 16), mh)['hash'],
               sweep.manifest('A', 5, 512, 257, snap, mh, {'k': 1})['hash']}) == 6)
    check('snapshot hash is the file hash', snap['world_hash'] == sweep.file_hash(os.path.join(sweep.LANDFORM, 'world.py')) and os.path.exists(os.path.join(snap['dir'], 'world.py')))
    # a changed world.py gives another snapshot dir
    alt = os.path.join(TMP, 'altland')
    os.makedirs(alt)
    for f in ('world.py', 'checks.py', 'sheet.py'):
        shutil.copy(os.path.join(sweep.LANDFORM, f), os.path.join(alt, f))
    with open(os.path.join(alt, 'world.py'), 'a') as f:
        f.write('\n# changed\n')
    snap2 = sweep.snapshot(os.path.join(alt, 'world.py'))
    check('changed world.py -> new snapshot and new manifest hashes', snap2['dir'] != snap['dir'] and sweep.manifest('A', 5, 512, 257, snap2, mh)['hash'] != m1['hash'])
    # 2 sweep, cache hit on rerun, recompute is bit-identical
    a = args()
    t0 = time.time()
    cat1 = sweep.run_sweep(a, quiet=True)
    t1 = time.time() - t0
    check('first sweep computes every world', cat1['run']['computed'] == 8 and cat1['run']['cache_hits'] == 0, cat1['run']['computed'])
    t0 = time.time()
    cat2 = sweep.run_sweep(a, quiet=True)
    t2 = time.time() - t0
    check('second sweep is all cache hits and fast', cat2['run']['computed'] == 0 and cat2['run']['cache_hits'] == 8 and t2 < 2.0, '%.2fs vs %.2fs' % (t2, t1))
    h = cat1['worlds'][0]['hash']
    rec1 = sweep.read_cache(h)
    os.remove(sweep.cache_paths(h)[0])
    cat3 = sweep.run_sweep(args(workers=1), quiet=True)
    rec3 = sweep.read_cache(h)
    check('recompute of one world is bit-identical (array hash and metrics)', rec3['array_hash'] == rec1['array_hash'] and rec3['metrics'] == rec1['metrics'] and cat3['run']['computed'] == 1)
    check('catalogue records world.py hash and per-world timing', cat1['run']['world_py_hash'] == snap['world_hash'] and all(w['t_world'] > 0 and w['world_hash'] == snap['world_hash'] for w in cat1['worlds']))
    check('catalogue is small', os.path.getsize(os.path.join(sweep.SEEDS_DIR, 'catalogue.json')) < 2_000_000)
    # 3 shortlist stable and weights outside the hash
    s1 = SL.run(sweep.SEEDS_DIR)
    j1 = open(os.path.join(sweep.SEEDS_DIR, 'shortlist.json')).read()
    s2 = SL.run(sweep.SEEDS_DIR)
    j2 = open(os.path.join(sweep.SEEDS_DIR, 'shortlist.json')).read()
    check('shortlist ranking is stable (byte-identical rerun)', j1 == j2 and len(s1['by_province']['A']) >= 1)
    sc = [e['score'] for e in s1['by_province']['A']]
    wts = SL.load_weights()
    wts2 = json.loads(json.dumps(wts))
    for t in wts2['terms']:
        t['w'] = 0.0 if t['group'] != 'visual' else 1.0
    wp = os.path.join(TMP, 'w2.json')
    json.dump(wts2, open(wp, 'w'))
    s3 = SL.run(sweep.SEEDS_DIR, wp)
    check('changing weights changes scores without touching the cache', [e['score'] for e in s3['by_province']['A']] != sc and sweep.read_cache(h) is not None)
    SL.run(sweep.SEEDS_DIR)
    # 4 a deliberately bad world is disqualified: no island can pass the size rule (monkeypatched)
    import lfmetrics as M
    mods = sweep.load_mods(snap['dir'])
    w = mods['W'].make_world(14, 'A', n=129)
    good = M.measure_world(mods['W'], mods['CH'], w, mods['SH'])
    old = M.EXT_MAX
    M.EXT_MAX = 5.0
    try:
        bad = M.measure_world(mods['W'], mods['CH'], w, mods['SH'])
    finally:
        M.EXT_MAX = old
    check('monkeypatched world has no suitable start island', good['start_ok'] is True and bad['start_ok'] is False and 'size' in bad['start_failed'], (good['start_ok'], bad['start_failed']))
    cat = json.load(open(os.path.join(sweep.SEEDS_DIR, 'catalogue.json')))
    row = dict(cat['worlds'][0])
    row.update(seed=9999, hash='bad0bad0bad0bad0', start_ok=False, start_failed=bad['start_failed'])
    cat['worlds'].append(row)
    json.dump(cat, open(os.path.join(sweep.SEEDS_DIR, 'catalogue.json'), 'w'))
    s4 = SL.run(sweep.SEEDS_DIR)
    listed = [e['seed'] for p in s4['by_province'].values() for e in p]
    check('bad seed is disqualified (listed with its reason, never ranked)', [row['province'], 9999, bad['start_failed']] in s4['disqualified'] and 9999 not in listed)
    # a world that is merely ugly (zero palette scores) is NOT disqualified
    cat['worlds'][-1].update(seed=9998, start_ok=True, start_failed=[], palette_muted=0.0, contrast=0.0, edge_energy=0.0, veg_variety=0.0)
    json.dump(cat, open(os.path.join(sweep.SEEDS_DIR, 'catalogue.json'), 'w'))
    s5 = SL.run(sweep.SEEDS_DIR)
    check('taste alone never disqualifies', not any(d[1] == 9998 for d in s5['disqualified']))
    # 5 contact sheet exists and is small
    cat['worlds'] = [x for x in cat['worlds'] if x['seed'] < 9990]
    json.dump(cat, open(os.path.join(sweep.SEEDS_DIR, 'catalogue.json'), 'w'))
    SL.run(sweep.SEEDS_DIR)
    r = SHT.make_sheet(sweep.SEEDS_DIR, per_row=4)
    check('contact sheet exists and is under 1.5 MB', os.path.exists(r['path']) and 0 < r['bytes'] < 1_500_000, r['bytes'])
    # 6 tiles table covers the world
    t = sweep.tiles('A', 1, 257)
    check('tile table covers the world with overlap', t['tiles'][0]['x0'] == -256 and max(x['x1'] for x in t['tiles']) == 256 and len(t['tiles']) >= 16)
    # 7 real committed catalogue (if present): shortlist sheet under 1.5 MB
    real = os.path.join(FOUNDRY, 'seeds', 'shortlist_sheet.png')
    if os.path.exists(real):
        check('committed shortlist sheet under 1.5 MB', os.path.getsize(real) < 1_500_000, os.path.getsize(real))
    print('%d checks passed' % len(PASSED))


if __name__ == '__main__':
    try:
        main()
    finally:
        shutil.rmtree(TMP, ignore_errors=True)
