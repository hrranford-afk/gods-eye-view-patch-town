"""Tests for the radical robot plans (blender/robot_recipe.py robot_recipe_for(seed, radical=True), blender/robot_radical.py, blender/robot_batch.py --radical). Python 3 + numpy, no Blender needed
(the bpy import check runs only when a bpy python is found: this interpreter, or the one named in the environment variable LI_BPY_PYTHON; otherwise it is reported as SKIP).
About 6 minutes: it builds 60 live GLBs and 8 hero GLBs.
Run: python3 games/living-islands/tests/test_robot_radical.py        (also works under pytest)"""
import collections, hashlib, json, os, re, struct, subprocess, sys, tempfile
from concurrent.futures import ProcessPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import robot_recipe as RR

SEEDS60 = list(range(1, 61))
HERO_SAMPLE = {'walker': 8, 'pontoon': 3, 'spotter': 5, 'spotter_mast': 21, 'roller': 7, 'snail': 11, 'crab': 20, 'scout': 2}      # one seed of every plan (and the mast variant of the spotter)
HERO_MAX = 1500 * 1000                # bytes ("under 1.5 MB")
LIVE_MAX = 400 * 1000
CORE_NODES = ['collector', 'chassis', 'track_l', 'track_r', 'shell_l', 'shell_r', 'head', 'lamp', 'lamp_dome', 'arm_base', 'arm_mid', 'arm_tip', 'finger_l', 'finger_r', 'hopper', 'hopper_lid']
PLAN_NODE_EXPECT = {'walker': ['leg_1', 'leg_2', 'leg_3', 'leg_4'], 'pontoon': ['paddle_l', 'paddle_r'], 'spotter': [], 'roller': ['wheel_big', 'caster'], 'snail': [], 'crab': ['leg_1', 'leg_2', 'claw_l', 'claw_r', 'claw_l_jaw', 'claw_r_jaw'], 'scout': []}
PLAN_CLIP_EXPECT = {'walker': 'walk', 'pontoon': 'paddle_spin', 'roller': 'roll', 'crab': 'claw_sort'}
_fails = []
_CACHE = {}
def rec(seed):
    if seed not in _CACHE: _CACHE[seed] = RR.robot_recipe_for(seed, radical=True)
    return _CACHE[seed]
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)


def parse_glb(path):
    d = open(path, 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; js = json.loads(d[20:20 + n]); off = 20 + n + 8
    return js, d[off:], d


def _build(args):
    """worker: (seed, lod, outdir) -> path, through the radical writer (the scout goes through the ordinary builder inside it)"""
    seed, lod, outdir = args
    import robot_radical as RAD
    r = RR.robot_recipe_for(seed, radical=True); p = os.path.join(outdir, 'rad%d_%s.glb' % (seed, lod))
    RAD.write_radical(r, p, lod, 'rest')
    return p


def _build_legacy(args):
    """worker: (seed, lod, outdir) -> path of the committed (not radical) recipe, through robot_build"""
    seed, lod, outdir = args
    import robot_build as RB
    r = RR.robot_recipe_for(seed); p = os.path.join(outdir, 'leg%d_%s.glb' % (seed, lod))
    RB.write_robot(r, p, lod, 'rest')
    return p


def test_determinism():
    a = json.dumps(rec(17), sort_keys=True); b = json.dumps(RR.robot_recipe_for(17, radical=True), sort_keys=True)
    check(a == b, 'radical recipes are deterministic (same seed, same recipe)')
    check(all(json.dumps(RR.robot_recipe_for(s, radical=True), sort_keys=True) != json.dumps(RR.robot_recipe_for(s + 1, radical=True), sort_keys=True) for s in range(1, 30)), 'neighbouring seeds give different recipes')
    check(json.loads(json.dumps(rec(23))) == rec(23), 'a radical recipe is plain JSON-able values (round trip equal)')
    sig = hashlib.sha256(''.join(json.dumps(rec(s), sort_keys=True) for s in SEEDS60).encode()).hexdigest()[:16]
    print('RADICAL_RECIPE_HASH_60', sig)
    check(len(set(json.dumps(rec(s), sort_keys=True) for s in SEEDS60)) == 60, 'all 60 radical recipes are different')
    check(RR.robot_recipe_for(1, radical=True)['legacy'] is False and RR.robot_recipe_for(1, radical=True).get('plan') in RR.RADICAL_PLANS, 'seed 1 is not special in the radical set')


def test_legacy_unchanged():
    ref = json.load(open(os.path.join(HERE, 'robot_legacy_hashes.json')))
    bad = [s for s in range(1, 121) if hashlib.sha256(json.dumps(RR.robot_recipe_for(s), sort_keys=True).encode()).hexdigest()[:20] != ref['recipes'][str(s)]]
    check(not bad, 'recipes of seeds 1 to 120 (default, radical off) hash exactly as before the radical plans (changed: %s)' % bad)
    check(all(json.dumps(RR.robot_recipe_for(s), sort_keys=True) == json.dumps(RR.robot_recipe_for(s, radical=False), sort_keys=True) for s in (1, 2, 14, 60)), 'radical=False is the default')
    check(all('plan' not in RR.robot_recipe_for(s) for s in (1, 2, 14, 60)), 'a default recipe has no plan field (the current plan is the default)')
    sig = hashlib.sha256(''.join(json.dumps(RR.robot_recipe_for(s), sort_keys=True) for s in SEEDS60).encode()).hexdigest()[:16]
    print('RECIPE_HASH_60', sig)
    with tempfile.TemporaryDirectory() as td, ProcessPoolExecutor(4) as ex:
        seeds = [int(k) for k in ref['live_glb']]
        paths = list(ex.map(_build_legacy, [(s, 'live', td) for s in seeds]))
        bad = [s for s, p in zip(seeds, paths) if hashlib.sha256(open(p, 'rb').read()).hexdigest() != ref['live_glb'][str(s)]]
        check(not bad, 'live GLBs of the committed seeds %s are byte-identical to the build before the radical plans (changed: %s)' % (seeds, bad))
        hp = _build_legacy((1, 'hero', td)); committed = os.path.join(ROOT, 'assets', 'collector', 'collector_hero.glb')
        check(open(hp, 'rb').read() == open(committed, 'rb').read(), 'seed 1 hero is still byte-identical to the committed v2 GLB assets/collector/collector_hero.glb')


def test_spread():
    recs = [rec(s) for s in SEEDS60]; plans = collections.Counter(r['plan'] for r in recs)
    print('PLANS', dict(plans))
    check(set(plans) == set(RR.RADICAL_PLANS), 'all seven plans (the ear scout and six new ones) appear over 60 seeds: %s' % dict(plans))
    check(all(plans[p] >= 6 for p in RR.NEW_PLANS), 'each new plan appears at least 6 times in 60 seeds: %s' % {p: plans[p] for p in RR.NEW_PLANS})
    check(12 <= plans['scout'] <= 18 and plans['scout'] == max(plans.values()), 'the ear scout is the most frequent plan, about a quarter (%d of 60)' % plans['scout'])
    blocks_ok = all(collections.Counter(RR.plan_for_seed(s) for s in range(b, b + 16)) == collections.Counter(RR.PLAN_WEIGHTS) for b in (1, 17, 33, 49, 65, 81, 97))
    check(blocks_ok, 'mix rule: every block of 16 seeds holds 4 scouts and 2 of each new plan')
    check(all(r['role'] == RR.PLAN_ROLE[r['plan']] for r in recs), 'role mapping: every recipe has the role of its plan %s' % RR.PLAN_ROLE)
    check(len(set(r['role'] for r in recs)) >= 5, 'the plans cover at least five of the six roles: %s' % sorted(set(r['role'] for r in recs)))
    pals = collections.Counter(r['paint']['palette'] for r in recs)
    check(len(pals) >= 10, '%d of 11 palettes appear over 60 seeds: %s' % (len(pals), dict(pals)))
    sc = [r for r in recs if r['plan'] == 'scout']
    check(sum(r['paint']['palette'] == 'mustard_clay' for r in sc) >= 0.55 * len(sc), 'the scouts are mustard_clay at least 55 percent of the time (%d of %d)' % (sum(r['paint']['palette'] == 'mustard_clay' for r in sc), len(sc)))
    check(all(r['body']['drive']['type'] == 'wheels' and r['body']['drive']['wheels_per_side'] == 3 and r['parts'] == ['ears'] for r in sc), 'every scout has three wheels a side (six wheels) and ears')
    check(all(r['body']['scale'] <= 0.9 for r in sc), 'every scout is small (scale at most 0.9: %s)' % sorted(set(r['body']['scale'] for r in sc))[-3:])
    check(len(set(r['lamp']['code'] for r in recs)) >= 5, 'at least five lamp codes appear')
    qn = collections.Counter(len(r['quirks']) for r in recs); check(set(qn) >= {0, 1, 2}, 'quirk counts vary: %s' % dict(qn))
    check(len(set(q for r in recs for q in r['quirks'])) >= 7, 'at least seven of the eight quirk slots appear')
    D = lambda p: [r['body']['dims'] for r in recs if r['plan'] == p]
    check({d['legs'] for d in D('walker')} == {4, 6}, 'walkers have 4 or 6 legs (both appear)')
    check({d['drive'] for d in D('pontoon')} == {'paddle', 'prop'}, 'pontoons have paddle wheels or props (both appear)')
    check({d['variant'] for d in D('spotter')} == {'stilts', 'mast'}, 'spotters stand on stilts or a mast (both appear)')
    check({d['style'] for d in D('roller')} == {'banded', 'tyre'}, 'rollers have a banded or a bare lugged ball (both appear)')
    check({d['coil_style'] for d in D('snail')} == {'spiral', 'rings'}, 'snail shells are spirals or rings (both appear)')
    check(len({d['claw_pose'] for d in D('crab')}) >= 2, 'crab claw poses vary')
    check(any('seedbed' in r['modules'] for r in recs if r['plan'] == 'roller'), 'some rollers carry a seedling bed')
    looks = set((r['plan'], r['paint']['palette'], tuple(r['quirks']), json.dumps(r['body'].get('dims', {}), sort_keys=True), r['body']['head']['visor'], r['body']['head']['shape'], r['body']['shell']['finish'], r['body']['shell']['split_count'], r['lamp']['code']) for r in recs)
    check(len(looks) == 60, 'all 60 are distinct looks (plan, palette, quirks, dimensions, head, shell, lamp code)')
    check(all((r['body']['hopper']['lid'] != 'none') or not any(q in r['quirks'] for q in ('trinket', 'plant_pot')) for r in recs), 'no lid quirk on a machine without a lid')


def test_no_forbidden_words_or_paths():
    text = ' '.join(json.dumps(rec(s), sort_keys=True) for s in range(1, 121)).lower() + ' ' + ' '.join(RR.PLAN_NAMES.values()).lower()
    bad = [w for w in RR.FORBIDDEN_WORDS if re.search(r'\b' + w + r'\b', text)]
    check(not bad, 'no forbidden words in 120 radical recipes and the plan names (%s)' % bad)
    priv = ['/' + 'home/', '/' + 'root/', '/' + 'tmp/', 'C:' + chr(92), '/' + 'Users/', '@' + 'gmail', 'sk-ant']
    for fn in ('robot_radical.py', 'robot_recipe.py', 'robot_batch.py', 'robot_sheet.py', 'robot_shots.py'):
        s = open(os.path.join(BL, fn)).read(); hits = [p for p in priv if p in s]
        check(not hits, 'no private path or secret in blender/%s (%s)' % (fn, hits))
    s = open(os.path.join(BL, 'robot_radical.py')).read().lower(); bad = [w for w in RR.FORBIDDEN_WORDS if re.search(r'\b' + w + r'\b', s)]
    check(not bad, 'no forbidden words in robot_radical.py (%s)' % bad)
    for fn in ('ROBOT_RADICAL.md',):
        p = os.path.join(ROOT, fn)
        if os.path.exists(p):
            s = open(p).read(); hits = [x for x in priv if x in s]
            check(not hits, 'no private path or secret in %s (%s)' % (fn, hits))


def test_constants_restored():
    import collector_model as CM, collector_tex as TX, robot_radical as RAD
    before = (dict(CM.SHELL), dict(CM.HOP), list(CM.NODES), sorted(CM.MATS), sorted(CM.KEYGROUP), dict(TX.WEAR), CM.clip_table, sorted(CM.AXES), dict(CM.POD), list(CM.LAMP_BASE), repr(CM.LAMP_CODE), dict(CM.EXTRA_SCENE))
    with tempfile.TemporaryDirectory() as td:
        for s in (8, 20):
            RAD.write_radical(rec(s), os.path.join(td, 'x.glb'), 'live', 'rest')
    after = (dict(CM.SHELL), dict(CM.HOP), list(CM.NODES), sorted(CM.MATS), sorted(CM.KEYGROUP), dict(TX.WEAR), CM.clip_table, sorted(CM.AXES), dict(CM.POD), list(CM.LAMP_BASE), repr(CM.LAMP_CODE), dict(CM.EXTRA_SCENE))
    check(before == after, 'collector_model and collector_tex constants (shell, bin, nodes, materials, wear, clips, axes, head pod, lamp, scene extras) are restored after radical builds')


def test_builds():
    import robot_radical as RAD
    seeds = list(HERO_SAMPLE.values())
    with tempfile.TemporaryDirectory() as td, ProcessPoolExecutor(4) as ex:
        jobs = [(s, 'hero', td) for s in seeds] + [(s, 'live', td) for s in SEEDS60]
        paths = list(ex.map(_build, jobs, chunksize=1))
        heroes = dict(zip(seeds, paths[:len(seeds)])); lives = dict(zip(SEEDS60, paths[len(seeds):]))
        # sizes
        hs = {s: os.path.getsize(p) for s, p in heroes.items()}; ls = {s: os.path.getsize(p) for s, p in lives.items()}
        print('HERO_KB', {rec(s)['plan'] + str(s): round(v / 1024.0) for s, v in hs.items()}); print('LIVE_KB min %d max %d' % (min(ls.values()) / 1024, max(ls.values()) / 1024))
        check(all(v < HERO_MAX for v in hs.values()), 'hero GLBs of the eight sample machines are under 1.5 MB (largest %d KB)' % (max(hs.values()) / 1024))
        check(all(v < LIVE_MAX for v in ls.values()), 'all 60 live GLBs are under 400 KB (largest %d KB)' % (max(ls.values()) / 1024))
        by_plan = collections.defaultdict(list)
        for s in SEEDS60: by_plan[rec(s)['plan']].append(ls[s] / 1024.0)
        print('LIVE_KB_BY_PLAN', {p: (round(min(v)), round(max(v))) for p, v in by_plan.items()})
        # structure of the hero GLBs
        for name, s in HERO_SAMPLE.items():
            js, bn, raw = parse_glb(heroes[s]); r = rec(s); plan = r['plan']; names = [n['name'] for n in js['nodes']]
            check(raw[:4] == b'glTF' and struct.unpack('<I', raw[8:12])[0] == len(raw), '%s (seed %d): a well-formed GLB' % (name, s))
            check(all(n in names for n in CORE_NODES), '%s (seed %d): the 16 committed node names are present' % (name, s))
            check(all(n in names for n in PLAN_NODE_EXPECT[plan]), '%s (seed %d): the plan nodes are present (%s)' % (name, s, PLAN_NODE_EXPECT[plan]))
            check(all(('quirk_' + q) in names for q in r['quirks']) and all(('quirk_' + q) not in names for q in RR.QUIRK_NAMES if q not in r['quirks']), '%s (seed %d): the quirk nodes are those of the recipe %s' % (name, s, r['quirks']))
            check(all(('part_' + {'ears': 'ears', 'tool_rack': 'tools', 'side_bins': 'bins'}[p]) in names for p in r['parts']), '%s (seed %d): the role parts are present %s' % (name, s, r['parts']))
            for want in ('lamp_dome', 'shell_l', 'shell_r', 'hopper'):
                check(want in names, '%s (seed %d): family element %s' % (name, s, want))
            clips = [a['name'] for a in js.get('animations', [])]
            check(all(c in clips for c in ('sun_open', 'sun_close', 'lamp_blink', 'head_tilt', 'lid_open')), '%s (seed %d): the committed clips are still there' % (name, s))
            if plan in PLAN_CLIP_EXPECT: check(PLAN_CLIP_EXPECT[plan] in clips, '%s (seed %d): the plan clip %s is there' % (name, s, PLAN_CLIP_EXPECT[plan]))
            sx = js['scenes'][0]['extras']; check(sx.get('robot_recipe', {}).get('plan') == plan or plan == 'scout', '%s (seed %d): the recipe is in the scene extras' % (name, s))
            check(js['scenes'][0]['extras']['triangles'] >= 5000, '%s (seed %d): %d triangles in the hero' % (name, s, js['scenes'][0]['extras']['triangles']))
            lamp = js['materials'][[m['name'] for m in js['materials']].index('Lamp')]; check(len(lamp['emissiveFactor']) == 3 and max(lamp['emissiveFactor']) <= 1.0001, '%s (seed %d): the status lamp material is emissive with a colour' % (name, s))
            blob = json.dumps(js).lower(); bad = [w for w in RR.FORBIDDEN_WORDS if re.search(r'\b' + w + r'\b', blob)]
            check(not bad, '%s (seed %d): no forbidden words in the GLB json (%s)' % (name, s, bad))
            check(not any(p in json.dumps(js) for p in ('/' + 'home/', '/' + 'root/', '/' + 'tmp/', chr(92) + 'Users')), '%s (seed %d): no private path in the GLB json' % (name, s))
        # the new plans differ in size and shape from each other: bounding boxes of the hero position accessors
        def extent(path):
            """world size in metres (glTF axes: x across, y up, z along the machine) from the mesh bounds of every node moved by the node translations and the root scale (rotations of the rest pose are small and ignored)"""
            js, bn, raw = parse_glb(path); par = {}
            for i, n in enumerate(js['nodes']):
                for c in n.get('children', []): par[c] = i
            def world(i):
                t = np.zeros(3)
                while True:
                    n = js['nodes'][i]; t = t + np.array(n.get('translation', [0, 0, 0])) * (1.0 if i not in par else 1.0)
                    if i not in par: break
                    i = par[i]
                return t
            sc = np.array(js['nodes'][0].get('scale', [1, 1, 1])); lo = np.full(3, 1e9); hi = np.full(3, -1e9)
            for i, n in enumerate(js['nodes']):
                if 'mesh' not in n: continue
                w = world(i)
                for pr in js['meshes'][n['mesh']]['primitives']:
                    a = js['accessors'][pr['attributes']['POSITION']]; lo = np.minimum(lo, np.array(a['min']) + w); hi = np.maximum(hi, np.array(a['max']) + w)
            return (hi - lo) * sc
        ext = {name: extent(heroes[s]) for name, s in HERO_SAMPLE.items()}
        check(ext['spotter_mast'][1] > 1.05 and ext['spotter'][1] > 0.8 and ext['walker'][1] < 0.85 and ext['spotter_mast'][1] > 1.5 * ext['scout'][1], 'the spotters are tall (mast %.2f m, stilts %.2f m by mesh extent) and the walker low (%.2f m)' % (ext['spotter_mast'][1], ext['spotter'][1], ext['walker'][1]))
        check(ext['crab'][0] > 0.95 and ext['crab'][0] > ext['crab'][2] * 1.1, 'the crab is wider than long (width %.2f m, length %.2f m)' % (ext['crab'][0], ext['crab'][2]))
        check(ext['scout'][2] < 1.0 and ext['scout'][1] < 0.6, 'the scout is small (%.2f m long, %.2f m high)' % (ext['scout'][2], ext['scout'][1]))
        # the hero meshes of different plans are different geometry (not recolours): the position buffers of the chassis hash differently
        hashes = {}
        for name, s in HERO_SAMPLE.items():
            js, bn, raw = parse_glb(heroes[s]); h = hashlib.sha256()
            for nd in js['nodes']:
                if 'mesh' in nd:
                    for pr in js['meshes'][nd['mesh']]['primitives']:
                        a = js['accessors'][pr['attributes']['POSITION']]; v = js['bufferViews'][a['bufferView']]; h.update(bn[v['byteOffset']:v['byteOffset'] + v['byteLength']])
            hashes[name] = h.hexdigest()
        check(len(set(hashes.values())) == len(hashes), 'the eight sample heroes have eight different geometries')
        # determinism of a build: the same recipe gives the same bytes
        p2 = _build((8, 'live', td)); check(open(p2, 'rb').read() == open(lives[8], 'rb').read(), 'building the same recipe twice gives the same GLB bytes')
        keep = os.environ.get('LI_KEEP_GLBS')
        if keep:
            os.makedirs(keep, exist_ok=True)
            for name, s in HERO_SAMPLE.items(): open(os.path.join(keep, 'radical_%s_hero.glb' % name), 'wb').write(open(heroes[s], 'rb').read())
        # bpy import (optional)
        check_bpy(heroes, lives)


BPY_SCRIPT = r'''
import sys, os, json
sys.path.insert(0, sys.argv[1])
import bpy, collector_shots as SH
out = []
for path in sys.argv[2:]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root, objs = SH.import_glb(path)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    names = [o.name for o in bpy.data.objects]
    out.append(dict(file=os.path.basename(path), root=root.name if root else None, meshes=len(meshes), objects=len(names), tris=sum(len(o.data.polygons) for o in meshes), has_lamp=any('lamp_dome' in n for n in names), has_collector=('collector' in names)))
print('BPYJSON ' + json.dumps(out))
'''


def check_bpy(heroes, lives):
    py = os.environ.get('LI_BPY_PYTHON') or sys.executable
    ok = subprocess.run([py, '-c', 'import bpy'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if not ok:
        print('SKIP the GLBs load in bpy (no bpy python: set LI_BPY_PYTHON)'); return
    files = [heroes[s] for s in HERO_SAMPLE.values()] + [lives[s] for s in (8, 3, 5, 7, 11, 20)]
    r = subprocess.run([py, '-c', BPY_SCRIPT, BL] + files, capture_output=True, text=True)
    line = [l for l in r.stdout.splitlines() if l.startswith('BPYJSON ')]
    check(bool(line), 'bpy loaded the GLBs through collector_shots.import_glb (returncode %d)' % r.returncode)
    if line:
        res = json.loads(line[0][8:]); print('BPY', res)
        check(all(x['root'] == 'CollectorRoot' and x['has_collector'] and x['meshes'] >= 8 and x['has_lamp'] for x in res), 'every GLB imports in bpy (importer of collector_shots.py): the node named collector, at least 8 mesh objects and the lamp dome (%d files)' % len(res))


def test_batch():
    with tempfile.TemporaryDirectory() as td:
        o1 = os.path.join(td, 'a'); o2 = os.path.join(td, 'b')
        r = subprocess.run([sys.executable, os.path.join(BL, 'robot_batch.py'), '--out', o1, '--seeds', '2,3,4', '--phases', 'recipes'], capture_output=True, text=True)
        recs1 = [json.load(open(os.path.join(o1, 'robot_recipe_seed%d.json' % s))) for s in (2, 3, 4)]
        check(r.returncode == 0 and all('plan' not in x for x in recs1), 'robot_batch.py without --radical writes the committed recipes (no plan field): --radical is off by default')
        r = subprocess.run([sys.executable, os.path.join(BL, 'robot_batch.py'), '--out', o2, '--seeds', '2,3,4,5', '--phases', 'recipes,models', '--lods', 'live', '--radical', '--jobs', '4'], capture_output=True, text=True)
        recs2 = [json.load(open(os.path.join(o2, 'robot_recipe_seed%d.json' % s))) for s in (2, 3, 4, 5)]
        check(r.returncode == 0 and all('plan' in x and x['radical'] for x in recs2), 'robot_batch.py --radical writes radical recipes (plans %s)' % [x['plan'] for x in recs2])
        check(all(os.path.getsize(os.path.join(o2, 'robot_seed%d_live.glb' % s)) < LIVE_MAX for s in (2, 3, 4, 5)), 'robot_batch.py --radical builds the GLBs of the radical plans (live under 400 KB)')
        res = json.load(open(os.path.join(o2, 'results.json'))); check(res.get('radical') is True and res['stopped_because'] == 'finished', 'results.json records radical and a finished run')
        sh = open(os.path.join(BL, 'robot_sheet.py')).read(); import robot_sheet as RS
        lines = RS.label_lines(recs2[1]); check(recs2[1]['plan'].upper() in lines[0] and recs2[1]['role'].upper() in lines[1], 'the sheet labels a radical robot with seed, plan, role, palette and quirks (%s)' % lines)


def main():
    for t in (test_determinism, test_legacy_unchanged, test_spread, test_no_forbidden_words_or_paths, test_constants_restored, test_builds, test_batch):
        print('--', t.__name__); t()
    print('FAILURES: %d' % len(_fails))
    for f in _fails: print('  ' + f)
    return 1 if _fails else 0


def test_all():       # pytest entry
    assert main() == 0


if __name__ == '__main__':
    sys.exit(main())
