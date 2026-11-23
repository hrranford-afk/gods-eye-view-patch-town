#!/usr/bin/env python3
"""foundry/sweep.py -- the SEED FOUNDRY SWEEP on the land formation tool (landform/world.py).  One orchestrator command.

  python3 foundry/sweep.py --seeds 200 --provinces ABC --n 257 --workers 2        sweep + shortlist + sheet + orders
  python3 foundry/sweep.py sweep    [options]     only the sweep (worlds -> cache -> seeds/catalogue.json)
  python3 foundry/sweep.py shortlist              rank from the catalogue with foundry/weights.json (never recomputes a world)
  python3 foundry/sweep.py sheet                  seeds/shortlist_sheet.png (top 24, 8 per province)
  python3 foundry/sweep.py orders                 seeds/../render_orders.json (data only)
  python3 foundry/sweep.py tiles --province B --seed 5   tile table of one world (data only)

How it works: for every (province, seed) a MANIFEST {province, seed, size_m, n, world.py hash, checks.py hash, metrics hash, patch}
is hashed; the result (metrics JSON + plan thumbnail) is cached under foundry/.cache/ by that hash, so nothing is computed twice
and a changed world.py or metric code changes every hash.  The sweep SNAPSHOTS world.py (and checks.py, sheet.py) once at the start
into .cache/snap/<hash>/ (sheet.py is copied as lfplan.py) and every worker imports the snapshot, so if another job edits landform/world.py during the sweep the
sweep still finishes with the hash it started with (the catalogue records both).  Weights are NOT part of the hash.
"""
import argparse
import hashlib
import importlib
import json
import multiprocessing as mp
import os
import resource
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                                  # games/living-islands
LANDFORM = os.path.join(ROOT, 'landform')
CACHE = os.environ.get('FOUNDRY_CACHE') or os.path.join(HERE, '.cache')
SEEDS_DIR = os.environ.get('FOUNDRY_SEEDS') or os.path.join(HERE, 'seeds')
sys.path.insert(0, HERE)


def sha(b, n=16):
    return hashlib.sha256(b).hexdigest()[:n]


def file_hash(path, n=16):
    with open(path, 'rb') as f:
        return sha(f.read(), n)


def metrics_hash():
    h = hashlib.sha256()
    for f in ('lfmetrics.py',):
        h.update(open(os.path.join(HERE, f), 'rb').read())
    h.update(open(os.path.join(LANDFORM, 'sheet.py'), 'rb').read())
    return h.hexdigest()[:16]


# ---------------------------------------------------------------- snapshot of the tool
def snapshot(world_path=None):
    """Copy world.py/checks.py/sheet.py once, from the bytes we hash, into the cache. Returns dict(dir, world_hash, checks_hash)."""
    world_path = world_path or os.path.join(LANDFORM, 'world.py')
    wb = open(world_path, 'rb').read()
    cb = open(os.path.join(os.path.dirname(world_path), 'checks.py'), 'rb').read()
    dd = os.path.dirname(world_path)
    sb = open(os.path.join(dd, 'sheet.py' if os.path.exists(os.path.join(dd, 'sheet.py')) else 'lfplan.py'), 'rb').read()
    wh, ch = sha(wb), sha(cb)
    d = os.path.join(CACHE, 'snap', wh + '_' + ch[:6] + '_' + sha(sb, 6))
    if not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)
        for name, b in (('world.py', wb), ('checks.py', cb), ('lfplan.py', sb)):
            with open(os.path.join(d, name), 'wb') as f:
                f.write(b)
    return dict(dir=d, world_hash=wh, checks_hash=ch)


def catalogue_snapshot():
    """The snapshot the catalogue was built with (so tuning and orders use the same world.py as the sweep), else a fresh one."""
    import glob
    try:
        h = load_catalogue()['run']['world_py_hash']
        g = sorted(glob.glob(os.path.join(CACHE, 'snap', h + '_*')))
        if g:
            return dict(dir=g[0], world_hash=h, checks_hash=os.path.basename(g[0]).split('_')[1])
    except Exception:
        pass
    return snapshot()


def manifest(province, seed, size_m, n, snap, mhash, patch=None):
    m = dict(province=province, seed=int(seed), size_m=float(size_m), n=int(n), world_hash=snap['world_hash'],
             checks_hash=snap['checks_hash'], metrics_hash=mhash, patch=patch or {})
    m['hash'] = sha(json.dumps(m, sort_keys=True).encode())
    return m


def cache_paths(mh):
    return os.path.join(CACHE, 'worlds', mh + '.json'), os.path.join(CACHE, 'worlds', mh + '.png')


def read_cache(mh):
    p, _ = cache_paths(mh)
    try:
        with open(p) as f:
            return json.load(f)
    except Exception:
        return None


def write_cache(mh, rec):
    p, _ = cache_paths(mh)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + '.%d.tmp' % os.getpid()
    with open(tmp, 'w') as f:
        json.dump(rec, f, separators=(',', ':'))
    os.replace(tmp, p)


# ---------------------------------------------------------------- worker
_MODS = {}


def load_mods(snapdir):
    """Import the snapshot world/checks/sheet once per process (module names 'world', 'checks', 'sheet')."""
    if _MODS.get('dir') != snapdir:
        for k in ('world', 'checks', 'lfplan'):
            sys.modules.pop(k, None)
        sys.path.insert(0, snapdir)
        import world as W, checks as CH, lfplan as SH
        import lfmetrics as M
        _MODS.update(dir=snapdir, W=W, CH=CH, SH=SH, M=M)
    return _MODS


def compute(man, snapdir, thumbs=True):
    """Build the world for one manifest and return the cache record (no file I/O except the thumbnail)."""
    mods = load_mods(snapdir)
    W, CH, SH, M = mods['W'], mods['CH'], mods['SH'], mods['M']
    t0 = time.perf_counter()
    w = W.make_world(man['seed'], man['province'], size_m=man['size_m'], n=man['n'])
    t1 = time.perf_counter()
    thumb = cache_paths(man['hash'])[1] if thumbs else None
    if thumb:
        os.makedirs(os.path.dirname(thumb), exist_ok=True)
    m = M.measure_world(W, CH, w, SH, thumb)
    t2 = time.perf_counter()
    rec = dict(manifest=man, metrics=m, array_hash=W.world_bytes_hash(w), t_world=round(t1 - t0, 3), t_metrics=round(t2 - t1, 3),
               rss_mb=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0, 1), pid=os.getpid())
    return rec


def work(task):
    man, snapdir = task
    rec = compute(man, snapdir)
    write_cache(man['hash'], rec)
    return man['hash'], rec['t_world'], rec['t_metrics'], rec['rss_mb']


# ---------------------------------------------------------------- the sweep
def plan(a, snap):
    mh = metrics_hash()
    mans = []
    for p in a.provinces:
        for k in range(a.seeds):
            mans.append(manifest(p, a.start + k, a.size, a.n, snap, mh))
    return mans


def run_sweep(a, quiet=False):
    t_start = time.time()
    snap = snapshot(a.world)
    mans = plan(a, snap)
    todo = [m for m in mans if read_cache(m['hash']) is None or not os.path.exists(cache_paths(m['hash'])[1])]
    hits = len(mans) - len(todo)
    if not quiet:
        print('sweep: %d worlds, %d cached, %d to compute, world.py %s, workers %d' % (len(mans), hits, len(todo), snap['world_hash'], a.workers), flush=True)
    t0 = time.perf_counter()
    done = 0
    if todo:
        if a.workers <= 1:
            for m in todo:
                work((m, snap['dir']))
                done += 1
        else:
            ctx = mp.get_context('fork')
            with ctx.Pool(a.workers) as pool:
                for _ in pool.imap_unordered(work, [(m, snap['dir']) for m in todo], chunksize=1):
                    done += 1
                    if not quiet and done % 50 == 0:
                        print('  %d/%d  %.0fs' % (done, len(todo), time.perf_counter() - t0), flush=True)
    wall = time.perf_counter() - t0
    peak_child = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024.0
    peak_self = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0
    # world.py changed while we ran?
    now = file_hash(a.world or os.path.join(LANDFORM, 'world.py'))
    changed = now != snap['world_hash']
    # collect
    rows = []
    for m in mans:
        rec = read_cache(m['hash'])
        rows.append(rec)
    run = dict(world_py_hash=snap['world_hash'], checks_py_hash=snap['checks_hash'], metrics_hash=mans[0]['metrics_hash'] if mans else None,
               world_py_changed_during_sweep=changed, world_py_hash_at_end=now,
               note=('world.py changed while the sweep ran; every result here is from the snapshot with hash %s' % snap['world_hash']) if changed else 'world.py unchanged during the sweep',
               provinces=a.provinces, seeds=a.seeds, start=a.start, size_m=a.size, n=a.n, workers=a.workers,
               worlds=len(mans), cache_hits=hits, computed=len(todo), wall_s=round(wall, 2), wall_per_world_s=round(wall / max(len(todo), 1), 3),
               peak_rss_mb_child=round(peak_child, 1), peak_rss_mb_parent=round(peak_self, 1),
               sum_t_world_s=round(sum(r['t_world'] for r in rows), 1), sum_t_metrics_s=round(sum(r['t_metrics'] for r in rows), 1))
    if not todo:      # a pure cache-hit run keeps the numbers of the run that computed the worlds
        try:
            old = load_catalogue()['run']
            if old.get('world_py_hash') == run['world_py_hash'] and old.get('n') == run['n']:
                run['compute_run'] = old.get('compute_run') or {k: old[k] for k in ('wall_s', 'wall_per_world_s', 'workers', 'computed', 'peak_rss_mb_child', 'peak_rss_mb_parent', 'world_py_changed_during_sweep', 'world_py_hash_at_end', 'note') if k in old}
                for k in ('world_py_changed_during_sweep', 'world_py_hash_at_end', 'note'):
                    run[k] = old.get(k, run[k])
        except Exception:
            pass
    cat = write_catalogue(rows, run)
    if not quiet:
        print(json.dumps({k: run[k] for k in ('worlds', 'cache_hits', 'computed', 'wall_s', 'peak_rss_mb_child', 'world_py_changed_during_sweep')}), flush=True)
    return cat


CAT_KEYS = ['n_islands', 'n_ge_Amin', 'korcak_K', 'ratio_largest_20th', 'largest_share', 'coast_D', 'slope_median_deg', 'slope_gt60', 'sand_share',
            'land_frac', 'land_lt10', 'nn_gap_median', 'coves', 'coves_n', 'landing', 'shelf_frac', 'n_skerry', 'n_small', 'n_medium_large',
            'start_island', 'start_ok', 'start_failed', 'start_score', 'start_extent_m', 'start_area_m2', 'start_loch_m2', 'start_wet_m2', 'start_timber_m2',
            'start_landing_score', 'start_landing_kind', 'start_landing_exposure', 'start_landing_xy', 'landings_start', 'landing_dist_other_m', 'landings_other_within_150m',
            'cove_dist_m', 'coves_within_100m', 'row_gap_start_m', 'start_joins_low_tide', 'n_merge_isl', 'merge_largest_group', 'deepest_channel_m',
            'strait_min_m', 'deepest_m', 'edge_energy', 'contrast', 'palette_muted', 'veg_variety', 'n_stacks', 'n_geos']


def _r(v):
    if isinstance(v, float):
        return None if v != v or v in (float('inf'), float('-inf')) else round(v, 4)
    if isinstance(v, (list, tuple)):
        return [_r(x) for x in v]
    return v


def write_catalogue(rows, run, path=None):
    path = path or os.path.join(SEEDS_DIR, 'catalogue.json')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    worlds = []
    for r in rows:
        man, m = r['manifest'], r['metrics']
        d = dict(province=man['province'], seed=man['seed'], hash=man['hash'], array_hash=r['array_hash'], world_hash=man['world_hash'],
                 t_world=r['t_world'], t_metrics=r['t_metrics'])
        for k in CAT_KEYS:
            if k in m:
                d[k] = _r(m[k])
        worlds.append(d)
    cat = dict(run=run, worlds=worlds)
    with open(path, 'w') as f:
        json.dump(cat, f, separators=(',', ':'))
    return cat


def load_catalogue(path=None):
    with open(path or os.path.join(SEEDS_DIR, 'catalogue.json')) as f:
        return json.load(f)


# ---------------------------------------------------------------- tiles (data only)
def tiles(province, seed, n, tile=128.0, overlap=8.0, size=512.0):
    """Tile table of one world: origins and sizes (m) of the windows that cover it with overlap, and the cell range of each."""
    step = tile - overlap
    out = []
    x = -size / 2
    k = 0
    while x < size / 2 - overlap:
        y = -size / 2
        while y < size / 2 - overlap:
            out.append(dict(id=k, x0=x, y0=y, x1=min(x + tile, size / 2), y1=min(y + tile, size / 2)))
            k += 1
            y += step
        x += step
    return dict(province=province, seed=seed, n=n, tile_m=tile, overlap_m=overlap, tiles=out)


# ---------------------------------------------------------------- CLI
def parse(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', nargs='?', default='all', choices=['all', 'sweep', 'shortlist', 'sheet', 'orders', 'tiles'])
    ap.add_argument('--seeds', type=int, default=200, help='seeds per province')
    ap.add_argument('--start', type=int, default=1, help='first seed')
    ap.add_argument('--provinces', default='ABC')
    ap.add_argument('--n', type=int, default=257)
    ap.add_argument('--size', type=float, default=512.0)
    ap.add_argument('--workers', type=int, default=2)
    ap.add_argument('--world', default=None, help='path of world.py (default landform/world.py)')
    ap.add_argument('--province', default='A')
    ap.add_argument('--seed', type=int, default=1)
    a = ap.parse_args(argv)
    a.provinces = [p for p in a.provinces.upper() if p in 'ABC']
    return a


def main(argv=None):
    a = parse(argv if argv is not None else sys.argv[1:])
    out = {}
    if a.cmd in ('all', 'sweep'):
        run_sweep(a)
    if a.cmd in ('all', 'shortlist', 'sheet', 'orders'):
        import shortlist as SL
        sl = SL.run(SEEDS_DIR) if a.cmd in ('all', 'shortlist') else None
        if sl:
            print(json.dumps({'shortlist': {p: [e['seed'] for e in sl['by_province'][p]] for p in sl['by_province']}, 'disqualified': sl['summary']['disqualified']}), flush=True)
    if a.cmd in ('all', 'sheet'):
        import sheet as SHT
        print(json.dumps(SHT.make_sheet(SEEDS_DIR)), flush=True)
    if a.cmd in ('all', 'orders'):
        import orders as OR
        print(json.dumps(OR.make_orders(SEEDS_DIR, workers=a.workers)), flush=True)
    if a.cmd == 'tiles':
        print(json.dumps(tiles(a.province, a.seed, a.n)))


if __name__ == '__main__':
    main()
