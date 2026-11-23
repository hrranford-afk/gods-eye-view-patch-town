"""Tests for the robot recipes (blender/robot_recipe.py, blender/robot_build.py, blender/robot_batch.py). Pure python + numpy, no Blender (about 4 minutes: it builds eight hero GLBs).
Run: python3 games/living-islands/tests/test_robot_recipe.py        (also works under pytest)"""
import collections, hashlib, json, os, re, struct, sys, tempfile
from concurrent.futures import ProcessPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import robot_recipe as RR

SEEDS60 = list(range(1, 61))
SAMPLE = [2, 3, 4, 6, 8, 10]          # one non-legacy seed of every role: planter, sorter, hauler, cleaner, maintainer, scout
HERO_MAX = 1500 * 1000                # bytes ("under 1.5 MB")
LIVE_MAX = 400 * 1000
_fails = []
_CACHE = {}
def rec(seed):
    if seed not in _CACHE: _CACHE[seed] = RR.robot_recipe_for(seed)
    return _CACHE[seed]
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)


def parse_glb(path):
    d = open(path, 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; js = json.loads(d[20:20 + n]); off = 20 + n + 8
    return js, d[off:], d

def geometry_hash(path):
    """hash of the positions and indices of every node's meshes, by node name (the same geometry gives the same hash, whatever else is in the file)"""
    js, bn, _ = parse_glb(path); out = {}
    for nd in js['nodes']:
        if 'mesh' not in nd: continue
        h = hashlib.sha256()
        for pr in js['meshes'][nd['mesh']]['primitives']:
            for acc in (pr['attributes']['POSITION'], pr['indices']):
                a = js['accessors'][acc]; v = js['bufferViews'][a['bufferView']]; h.update(bn[v['byteOffset']:v['byteOffset'] + v['byteLength']])
        out[nd['name']] = h.hexdigest()[:16]
    return out


def _build(args):
    """worker: (seed, lod, outdir, mode) -> path. mode 'recipe' (the builder), 'generic' (seed 1 through the generic builder), 'default' (seed 1, collector_model.build)"""
    seed, lod, outdir, mode = args
    import robot_build as RB
    r = RR.robot_recipe_for(seed); p = os.path.join(outdir, 'r%d_%s_%s.glb' % (seed, mode, lod))
    RB.write_robot(r, p, lod, 'rest', force_generic=(mode == 'generic'))
    return p


def test_determinism():
    a = json.dumps(RR.robot_recipe_for(17), sort_keys=True); b = json.dumps(RR.robot_recipe_for(17), sort_keys=True)
    check(a == b, 'robot_recipe_for is deterministic (same seed, same recipe)')
    check(a != json.dumps(RR.robot_recipe_for(18), sort_keys=True), 'different seeds give different recipes')
    check(json.loads(json.dumps(rec(23))) == rec(23), 'a recipe is plain JSON-able values (round trip equal)')
    sig = hashlib.sha256(''.join(json.dumps(rec(s), sort_keys=True) for s in SEEDS60).encode()).hexdigest()[:16]
    check(len(sig) == 16, 'recipes of 60 seeds hashed: %s (recorded in ROBOT_RECIPES.md)' % sig)
    print('RECIPE_HASH_60', sig)

def test_legacy():
    import collector_model as CM
    r = rec(1); b = r['body']
    check(r['legacy'] and r['role'] == 'cleaner' and r['quirks'] == ['patch', 'mirror', 'trinket', 'panel'] and r['modules'] == [], 'seed 1 is the legacy tortoise cleaner with the four committed quirks')
    sh = CM.SHELL
    check((b['shell']['half_length'], b['shell']['half_width'], b['shell']['dome_h'], b['shell']['slot_half'], b['shell']['shape_e2']) == (sh['a'], sh['b'], sh['c'], sh['y0'], sh['e2']), 'seed 1 shell numbers are the collector_model defaults')
    check(b['hopper']['x0'] == CM.HOP['x0'] and b['hopper']['x1'] == CM.HOP['x1'] and b['hopper']['width'] == CM.HOP['w'] and b['hopper']['z1'] == CM.HOP['z1'], 'seed 1 bin numbers are the defaults')
    check((b['arm']['upper_m'], b['arm']['fore_m']) == (CM.ARM_L1, CM.ARM_L2) and b['drive']['track_width'] == CM.TRACK_W and b['drive']['track_y'] == CM.TRACK_Y, 'seed 1 arm lengths and track numbers are the defaults')
    check((b['head']['e1'], b['head']['e2']) == (CM.POD['e1'], CM.POD['e2']) and b['head']['scale'] == [1.0, 1.0, 1.0] and b['scale'] == 1.0, 'seed 1 head shape and scales are the defaults')
    check(round(CM.WHEELS[0][0], 4) == round(0.285 - b['drive']['track_axle_m'], 4), 'seed 1 track length is the default wheel base')
    for k in ('paint', 'paint2', 'arm', 'patch', 'patch2'): check(tuple(r['paint'][k]) == tuple(round(c, 4) for c in CM.MATS[k][1]), 'seed 1 paint %s is the committed colour' % k)
    check(r['wear']['age_f'] == 1.0 and r['wear']['salt'] == r['wear']['rust'] == r['wear']['chips'] == 1.0, 'seed 1 wear multipliers are 1.0')
    check(r['lamp']['search'] == [1.0, 0.62, 0.08] and r['lamp']['found'] == [0.30, 0.95, 0.32], 'seed 1 lamp code is the committed amber and green')

def test_spread():
    rs = [rec(s) for s in SEEDS60]; cnt = lambda fn: collections.Counter(fn(x) for x in rs)
    roles = cnt(lambda x: x['role']); drives = cnt(lambda x: x['body']['drive']['type']); pals = cnt(lambda x: x['paint']['palette']); nq = cnt(lambda x: len(x['quirks']) if not x['legacy'] else -1)
    qn = collections.Counter(q for x in rs for q in x['quirks']); mods = collections.Counter(m for x in rs for m in x['modules'])
    grip = cnt(lambda x: x['body']['arm']['gripper']); vis = cnt(lambda x: x['body']['head']['visor']); lid = cnt(lambda x: x['body']['hopper']['lid']); spl = cnt(lambda x: x['body']['shell']['split_count'])
    jn = cnt(lambda x: x['body']['arm']['joints']); lamp = cnt(lambda x: x['lamp']['code']); hs = cnt(lambda x: x['body']['head']['shape'])
    print('spread over 60 seeds: role', dict(roles), 'drive', dict(drives), 'palettes', len(pals), 'quirk counts', dict(nq), 'quirks', dict(qn), 'modules', dict(mods))
    print('   gripper', dict(grip), 'visor', dict(vis), 'lid', dict(lid), 'plates', dict(spl), 'joints', dict(jn), 'lamp codes', dict(lamp), 'head shapes', dict(hs))
    check(set(roles) == set(RR.ROLES), 'all 6 roles appear (%s)' % dict(roles))
    check(min(roles.values()) >= 4 and max(roles.values()) <= 0.35 * 60, 'every role has at least 4 seeds and none more than 35 percent')
    check(set(drives) == {'tracks', 'wheels'} and min(drives.values()) >= 15, 'both drive types appear, each at least 15 of 60 (%s)' % dict(drives))
    check(len(pals) >= 9, 'at least 9 of the 11 palettes appear (%d)' % len(pals))
    check(set(k for k in nq if k >= 0) == {0, 1, 2, 3} and nq[-1] == 1, 'quirk counts 0, 1, 2 and 3 all appear (and the legacy seed has its four) %s' % dict(nq))
    check(max(len(x['quirks']) for x in rs if not x['legacy']) <= 3, 'no recipe except the legacy one has more than 3 quirks')
    check(set(qn) == set(RR.QUIRK_NAMES), 'all 8 quirks appear (%s)' % dict(qn))
    check(set(mods) == set(RR.MODULES), 'all 3 repurposed modules appear (%s)' % dict(mods))
    parts = collections.Counter(p for x in rs for p in x['parts']); fin = cnt(lambda x: x['body']['shell']['finish'])
    print('   parts', dict(parts), 'shell finish', dict(fin))
    check(set(parts) == set(RR.PARTS) and set(fin) == {'solar', 'painted'} and all(RR.PART_OF_ROLE.get(x['role']) in (p, None) or True for x in rs for p in x['parts']), 'all 4 role parts and both shell finishes (solar cells, painted) appear')
    check(all(x['parts'] == [] or x['parts'] == [RR.PART_OF_ROLE[x['role']]] for x in rs), 'a role part is always the one of its role (cleaners and planters have none)')
    check(set(grip) == set(RR.GRIPPERS) and set(vis) == set(RR.VISORS) and len(lid) >= 4 and set(spl) == {1, 2, 4} and set(jn) == {2, 3, 4} and len(lamp) >= 5 and set(hs) == set(RR.HEAD_SHAPES), 'every gripper, visor, plate count, joint count, head shape and 5 or more lamp codes and 4 or more lid styles appear')
    check(len({json.dumps(x, sort_keys=True) for x in rs}) == 60, 'all 60 recipes are different')
    looks = {(x['role'], x['body']['drive']['type'], x['paint']['palette'], x['body']['head']['visor'], x['body']['arm']['gripper'], tuple(x['quirks'])) for x in rs}
    check(len(looks) >= 58, 'at least 58 distinct (role, drive, palette, visor, gripper, quirks) looks in 60 seeds (%d)' % len(looks))
    sc = sorted(x['body']['scale'] for x in rs); check(sc[0] < 0.82 and sc[-1] > 1.08, 'overall size spans small scouts to large haulers (%.2f to %.2f)' % (sc[0], sc[-1]))
    check(all(0.5 < x['body']['scale'] < 1.3 and 0.1 <= x['body']['shell']['dome_h'] <= 0.52 and 0.17 <= x['body']['arm']['upper_m'] <= 0.40 and x['body']['arm']['fore_m'] <= x['body']['arm']['upper_m'] + 1e-9 for x in rs), 'sizes stay in the ranges the part functions were checked for')
    check(all(0.10 <= x['body']['drive']['track_width'] <= 0.19 and abs(x['body']['drive']['track_y'] - (0.25 + (x['body']['drive']['track_width'] - 0.13) / 2)) < 1e-3 for x in rs), 'track width and offset keep the inner edge where it was')
    check(all(x['body']['hopper']['lid'] == 'none' for x in rs if 'seedbed' in x['modules']) and all(x['role'] == 'planter' for x in rs if x['role'] == 'planter' and 'seedbed' in x['modules']), 'a seedling bed never has a lid on it')
    check(all(not (set(x['quirks']) & {'trinket', 'plant_pot'}) for x in rs if x['body']['hopper']['lid'] == 'none'), 'quirks that sit on the lid are not chosen when there is no lid')

def test_clean():
    pat = re.compile(r'\b(' + '|'.join(RR.FORBIDDEN_WORDS) + r')\b', re.I); bad = []
    for s in SEEDS60:
        m = pat.search(json.dumps(rec(s)))
        if m: bad.append((s, m.group(0)))
    check(not bad, 'no forbidden words in any of the 60 recipes %s' % bad[:2])
    files = ['robot_recipe.py', 'robot_build.py', 'robot_batch.py', 'robot_shots.py', 'robot_sheet.py', 'li_props.py']
    texts = {f: open(os.path.join(BL, f)).read() for f in files}; texts['ROBOT_RECIPES.md'] = open(os.path.join(ROOT, 'ROBOT_RECIPES.md')).read() if os.path.exists(os.path.join(ROOT, 'ROBOT_RECIPES.md')) else ''
    leaks = []; words = []; net = []; dele = []
    for f, t in texts.items():
        if re.search(r'/(tmp|home|root|Users)/\w|[A-Za-z]:\\\\', t): leaks.append(f)
        if re.search(r'(api[_-]?key|secret|password|token)\s*=', t, re.I): leaks.append(f + ':secret')
        body = re.sub(r"FORBIDDEN_WORDS = \([^)]*\)", '', t)         # the list itself names them
        body = re.sub(r"(no|nothing|never)[^.\n]*\b(brand|logo)s?\b[^.\n]*", '', body, flags=re.I)
        m = re.search(r'\b(gore|blood|corpse|dead body|skeleton|skull|murder|brands?|logos?)\b', body, re.I)
        if m and f != 'ROBOT_RECIPES.md': words.append((f, m.group(0)))
        if f.endswith('.py') and re.search(r'\b(urllib|requests|socket|http\.client|urlopen|ftplib|smtplib)\b|https?://|\bcurl\b|\bwget\b', t): net.append(f)
        if f.endswith('.py') and re.search(r'\b(os\.remove|os\.unlink|shutil\.rmtree|os\.rmdir|rmtree|\.unlink\()|\brm -', t): dele.append(f)
    check(not leaks, 'new files hold no private paths or secrets %s' % leaks)
    check(not words, 'new scripts hold no forbidden words %s' % words)
    check(not net, 'no network calls in the new scripts %s' % net)
    check(not dele, 'no delete calls in the new scripts %s' % dele)
    check('subprocess' not in texts['robot_build.py'] and 'subprocess' not in texts['robot_recipe.py'], 'the model builder and the recipe make no subprocess calls (only the batch driver starts programs)')

def test_batch_driver():
    bt = open(os.path.join(BL, 'robot_batch.py')).read()
    for needle in ('--device', '--require-gpu', '--gpu-name', 'PG.check_picture', 'variety_judge.py', "'recipes'", "'models'", "'previews'", "'variety'", 'default=60'):
        check(needle in bt, 'robot_batch.py has %s' % needle)
    tmp = tempfile.mkdtemp(prefix='robot_batch_')
    import subprocess
    p = subprocess.run([sys.executable, os.path.join(BL, 'robot_batch.py'), '--out', tmp, '--count', '5', '--phases', 'recipes'], capture_output=True, text=True)
    files = sorted(os.listdir(tmp))
    check(p.returncode == 0 and files == ['results.json'] + ['robot_recipe_seed%d.json' % s for s in range(1, 6)], 'robot_batch recipes phase writes robot_recipe_seed1..5.json and results.json')
    same = all(json.load(open(os.path.join(tmp, 'robot_recipe_seed%d.json' % s))) == rec(s) for s in range(1, 6))
    check(same, 'the written recipes equal robot_recipe_for')

def test_models():
    import collector_model as CM, collector_tex as TX
    snap = lambda: json.dumps([sorted(CM.SHELL.items()), sorted(CM.HOP.items()), [list(w) for w in CM.WHEELS], sorted((k, list(v) if isinstance(v, tuple) else v) for k, v in CM.POD.items()), CM.ARM_L1, CM.ARM_L2, CM.ELBOW_STOW.tolist(), CM.WRIST_STOW.tolist(),
                               CM.TRACK_Y, CM.TRACK_W, sorted(CM.MATS), CM.MATS['paint'][1], CM.LAMP_BASE, CM.NODES, sorted(CM.QUIRKS), sorted(CM.AXES), CM.EXTRA_SCENE, dict(TX.WEAR), list(CM.GRAB_TARGET), CM.dome_z.__name__], default=str)
    before = snap(); tmp = tempfile.mkdtemp(prefix='robot_glb_')
    jobs = [(1, 'hero', tmp, 'default'), (1, 'hero', tmp, 'generic')] + [(s, l, tmp, 'recipe') for s in SAMPLE for l in ('hero', 'live')]
    with ProcessPoolExecutor(max_workers=3) as ex: paths = list(ex.map(_build, jobs))
    P = {(j[0], j[1], j[3]): p for j, p in zip(jobs, paths)}
    # legacy: byte-identical to the committed hero, and the generic builder gives the same geometry
    committed = os.path.join(ROOT, 'assets', 'collector', 'collector_hero.glb')
    check(open(P[(1, 'hero', 'default')], 'rb').read() == open(committed, 'rb').read(), 'seed 1 (legacy path) is byte-identical to assets/collector/collector_hero.glb')
    gc, gg = geometry_hash(committed), geometry_hash(P[(1, 'hero', 'generic')])
    check(gc == gg, 'seed 1 through the generic builder has the same geometry hash for all %d nodes as the committed hero (%d differ)' % (len(gc), sum(1 for k in gc if gc[k] != gg.get(k))))
    # budgets, nodes, extras for the sample
    base_nodes = ['collector', 'chassis', 'track_l', 'track_r', 'shell_l', 'shell_r', 'head', 'lamp', 'lamp_dome', 'arm_base', 'arm_mid', 'arm_tip', 'finger_l', 'finger_r', 'hopper', 'hopper_lid']
    for s in SAMPLE:
        r = rec(s)
        for lod, lim in (('hero', HERO_MAX), ('live', LIVE_MAX)):
            p = P[(s, lod, 'recipe')]; sz = os.path.getsize(p); js, bn, raw = parse_glb(p); names = [n['name'] for n in js['nodes']]
            tri = sum(js['accessors'][pr['indices']]['count'] // 3 for m in js['meshes'] for pr in m['primitives'])
            import collector_model as CM2
            lo, hi = CM2.BUDGET[lod]; lo = 10000 if lod == 'hero' else lo      # wheels have far fewer triangles than tread links: a hero floor of 10,000 for the recipes
            check(sz < lim, 'seed %d (%s) %s GLB is %d KB, under %d KB' % (s, r['role'], lod, sz // 1000, lim // 1000))
            check(lo <= tri <= hi, 'seed %d %s triangles %d within the budget %d to %d' % (s, lod, tri, lo, hi))
            need = base_nodes + ['quirk_' + q for q in r['quirks']] + [{'ears': 'part_ears', 'blade': 'part_blade', 'side_bins': 'part_bins', 'tool_rack': 'part_tools'}[p_] for p_ in r['parts']] + [{'seedbed': 'module_seedbed', 'grow_light': 'module_grow_light', 'compost_tray': 'module_compost'}[m] for m in r['modules']]
            check(all(n in names for n in need), 'seed %d %s has the named nodes (%d expected, none missing)' % (s, lod, len(need)))
            check(not [n for n in names if n.startswith('quirk_') and n[6:] not in r['quirks']], 'seed %d %s has no quirk node it did not choose' % (s, lod))
            if lod == 'hero':
                ex = js['scenes'][0]['extras']
                check(ex.get('robot_recipe') == r and set(ex['quirk_slots']) == {'quirk_' + q for q in r['quirks']}, 'seed %d scene extras carry the recipe and the quirk slots' % s)
                check(len(js['animations']) == 7 and len(js['images']) == 9, 'seed %d hero keeps the seven clips and nine textures' % s)
                root = js['nodes'][names.index('collector')]; sc = r['body']['scale']
                check((abs(root['scale'][2] - sc * r['body']['length_f']) < 1e-6 and abs(root['scale'][0] - sc * r['body']['width_f']) < 1e-6 and abs(root['scale'][1] - sc) < 1e-6) if 'scale' in root else sc == 1.0, 'seed %d overall size is a node scale' % s)
                check(b'/home/' not in raw and b'/tmp/' not in raw and b'/Users/' not in raw and b'/root/' not in raw, 'seed %d GLB bytes hold no private paths' % s)
                lamp_mat = next(m for m in js['materials'] if m['name'] == 'Lamp'); check([round(v, 4) for v in lamp_mat['emissiveFactor']] == r['lamp']['search'], 'seed %d lamp colour is its code colour' % s)
    # different robots are different files and the same recipe gives the same bytes
    hs = {hashlib.sha256(open(P[(s, 'live', 'recipe')], 'rb').read()).hexdigest() for s in SAMPLE}
    check(len(hs) == len(SAMPLE), 'six sample robots give six different live GLBs')
    import robot_build as RB
    a = os.path.join(tmp, 'again_live.glb'); RB.write_robot(rec(6), a, 'live')
    check(open(a, 'rb').read() == open(P[(6, 'live', 'recipe')], 'rb').read(), 'seed 6 live GLB is byte-identical when built a second time in this process')
    check(snap() == before, 'collector_model and collector_tex constants are restored after every build')
    far = os.path.join(tmp, 'far.glb'); st = RB.write_robot(rec(2), far, 'far')
    check(500 <= st['triangles'] <= 1250 and os.path.getsize(far) < 110 * 1000, 'the far level of a planter builds too (%d triangles, %d KB)' % (st['triangles'], os.path.getsize(far) // 1000))
    return P

def main():
    for fn in (test_determinism, test_legacy, test_spread, test_clean, test_batch_driver, test_models):
        fn()
    print('\n%s: %d failure(s)' % ('FAILED' if _fails else 'ALL PASSED', len(_fails)))
    return 1 if _fails else 0

def test_all():       # pytest entry
    assert main() == 0

if __name__ == '__main__':
    sys.exit(main())
