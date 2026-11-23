"""Tests for the per-seed recipe layer (blender/recipe.py) and the variety judge. Pure python + numpy (PIL for the judge test), no Blender.
Run: python3 games/living-islands/tests/test_recipe.py        (also works under pytest)"""
import collections, json, math, os, re, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import island_common as IC
import recipe as RC

SEEDS61 = [1122] + list(range(2001, 2061))          # the HW-3 batch
_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

def test_determinism():
    a = json.dumps(RC.recipe_for(2005), sort_keys=True); b = json.dumps(RC.recipe_for(2005), sort_keys=True)
    check(a == b, 'recipe_for is deterministic (same seed, same recipe)')
    check(json.dumps(RC.recipe_for(2005), sort_keys=True) != json.dumps(RC.recipe_for(2006), sort_keys=True), 'different seeds give different recipes')
    check(IC.STYLE is None and IC.CAMP == (-1.5, -7.0), 'recipe_for leaves island_common as it found it (style None, legacy camp)')
    p1 = RC.plan_trees(RC.recipe_for(2005)); p2 = RC.plan_trees(RC.recipe_for(2005))
    check(json.dumps(p1['items'], sort_keys=True) == json.dumps(p2['items'], sort_keys=True) and p1['n'] > 0, 'plan_trees is deterministic (%d items)' % p1['n'])
    check(IC.STYLE is None, 'plan_trees restores island_common')

def test_legacy_1122():
    """the constants below are copied from the old hero_render.py (camp at CAMP=(-1.5,-7), two tents, boat 5.5 m west, conifers, sun 20/320, camera)."""
    r = RC.recipe_for(1122)
    check(r == RC.legacy_recipe(1122) and r['legacy'], 'seed 1122 returns the legacy recipe')
    c = r['content']['camp']; cx, cy = -1.5, -7.0
    near = lambda p, q: abs(p[0] - q[0]) < 1e-9 and abs(p[1] - q[1]) < 1e-9
    check(near(c['fire'], (cx + 0.5, cy + 0.3)), 'legacy fire position')
    check(near(c['tents'][0]['pos'], (cx - 3.6, cy + 3.6)) and abs(c['tents'][0]['yaw'] - math.radians(141)) < 1e-12 and (c['tents'][0]['length'], c['tents'][0]['width'], c['tents'][0]['height']) == (3.0, 2.2, 1.55), 'legacy tent A')
    check(near(c['tents'][1]['pos'], (cx + 4.6, cy + 2.4)) and abs(c['tents'][1]['yaw'] - math.radians(24)) < 1e-12 and (c['tents'][1]['length'], c['tents'][1]['width'], c['tents'][1]['height']) == (2.8, 2.0, 1.4), 'legacy tent B')
    check(c['tents'][0]['colour'] == [0.58, 0.34, 0.14] and c['tents'][1]['colour'] == [0.30, 0.38, 0.40], 'legacy tent colours')
    check(near(c['boat']['start'], (cx - 5.5, cy)) and abs(c['boat']['dir'][0]) < 1e-9 and abs(c['boat']['dir'][1] + 1) < 1e-9 and abs(c['boat']['yaw'] - math.radians(70)) < 1e-12, 'legacy boat start, seaward direction and yaw')
    check(c['boat']['seek_shore'] is False, 'legacy boat stays at its start (the old shoreline search never ran)')
    camps = [RC.recipe_for(x)['content']['camp'] for x in range(2001, 2061)]
    check(all(cp['boat']['seek_shore'] for cp in camps if cp and cp['boat']), 'recipe boats seek the shore')
    check(r['boulders']['n'] == 16 and r['boulders']['features'] == [[10.5, -4.0, 1.9], [-10.0, -2.5, 1.6], [13.0, 3.5, 2.3], [-12.5, 4.5, 2.0]], 'legacy boulders and feature rocks')
    check(r['trees']['mode'] == 'legacy_conifers' and r['trees']['max_trees'] == 17 and r['tufts'] == dict(count=5200, heather=520), 'legacy conifers (17) and tufts (5200, 520)')
    t = r['time']
    check((t['sun_el_deg'], t['sun_az_deg'], t['sun_energy'], t['sun_colour'], t['sky_strength'], t['exposure'], t['sun_angle_deg']) == (20.0, 320.0, 12.0, [1.0, 0.76, 0.5], 0.22, -0.4, 1.0), 'legacy sun, sky and exposure')
    check(r['weather']['overcast'] == 0.0 and r['weather']['haze'] == 0.0, 'legacy weather adds no cloud or haze')
    cm = r['camera']
    check(cm['pos'] == [-9.0, -29.0, 10.0] and cm['target'] == [0.0, -2.0, 1.2] and cm['lens'] == 36.0 and cm['fstop'] == 11.0, 'legacy camera')
    check(r['rock']['look'] == 'legacy' and r['island']['style'] is None and r['sea']['density'] == 0.7, 'legacy rock look, island style None, sea density')
    # the island geometry itself is unchanged by the style hooks (mesh hashes recorded before the recipe layer)
    check(IC.mesh_hash(1122) == '3df32bf3229a4ab5' and IC.mesh_hash(77) == '43cefe7691513420' and IC.mesh_hash(2001) == 'd2294a9f8dad1340', 'island_common mesh hashes unchanged for 1122, 77, 2001')
    # legacy picture on another coastline (the old batch look) is the same recipe values with that seed
    l = RC.recipe_for(2001, legacy_scene=True)
    check(l['legacy'] and l['seed'] == 2001 and l['content'] == r['content'] and l['camera'] == r['camera'], 'legacy_scene=True gives the old camp picture for any seed')

def test_spread():
    rs = [RC.recipe_for(s) for s in SEEDS61]
    cnt = lambda fn: collections.Counter(fn(x) for x in rs)
    isl = cnt(lambda x: x['island']['type']); rock = cnt(lambda x: x['rock']['code']); con = cnt(lambda x: x['content']['kind'])
    cam = cnt(lambda x: x['camera']['kind']); tim = cnt(lambda x: x['time']['name']); wea = cnt(lambda x: x['weather']['name']); mix = cnt(lambda x: x['trees']['mix'])
    print('spread over 61 seeds: island', dict(isl), 'rock', dict(rock), 'content', dict(con), 'camera', dict(cam), 'time', dict(tim), 'weather', dict(wea), 'mix', len(mix))
    check(len(isl) == 6 and set(isl) == set(RC.ISLAND_TYPES), 'all 6 island types appear (%d)' % len(isl))
    check(len(rock) == 4, 'all 4 rock types appear (%d)' % len(rock))
    check(len(con) == 6, 'all 6 contents appear (%d)' % len(con))
    check(len(cam) == 3, 'all 3 cameras appear (%d)' % len(cam))
    check(len(tim) >= 5, 'all 5 times of day appear (%d)' % len(tim))
    check(len(wea) == 4, 'all 4 weathers appear (%d)' % len(wea))
    check(len(mix) >= 8, 'at least 8 tree mixes appear (%d)' % len(mix))
    check(max(isl.values()) <= 0.30 * 61 and max(con.values()) <= 0.40 * 61 and max(cam.values()) <= 0.55 * 61, 'no single island type above 30%, content above 40%, camera above 55%')
    check(min(isl.values()) >= 4 and min(rock.values()) >= 8, 'every island type has at least 4 seeds, every rock type at least 8')
    combos = {(x['island']['type'], x['rock']['code'], x['content']['kind'], x['camera']['kind']) for x in rs}
    check(len(combos) >= 40, 'at least 40 distinct (island, rock, content, camera) combinations in 61 seeds (%d)' % len(combos))
    sun = sorted(x['time']['sun_el_deg'] for x in rs); check(sun[0] < 9 and sun[-1] > 45, 'sun elevation spans dawn to noon (%.1f to %.1f)' % (sun[0], sun[-1]))

def _ground(r, pts):
    RC.use_island(r)
    try:
        return [float(IC.height_at(x, y, r['seed'])[0, 0]) for x, y in pts]
    finally:
        IC.set_style(None)

def test_sites_and_cameras():
    bad_site = []; bad_cam = []
    for s in SEEDS61[1:]:
        r = RC.recipe_for(s); c = r['content']
        pts = [c['site']] + [p['pos'] for p in c['props']] + [r['camera']['pos'][:2]]
        z = _ground(r, pts)
        if c['kind'] != 'wreck' and z[0] < 0.2: bad_site.append((s, round(z[0], 2)))
        if r['camera']['pos'][2] < z[-1] + 0.9: bad_cam.append((s, r['camera']['pos'][2], round(z[-1], 2)))
        if c['kind'] == 'camp' and c['camp']['boat']:
            pass
    check(not bad_site, 'what-is-there site stands on land for every seed %s' % (bad_site[:3],))
    check(not bad_cam, 'camera is above the ground for every seed %s' % (bad_cam[:3],))
    r = RC.recipe_for(2005); items = RC.plan_trees(r)['items']
    z = _ground(r, [(i['x'], i['y']) for i in items])
    check(all(zz > -0.1 for zz in z), 'planted items stand on land (cliffs seed 2005, %d items)' % len(items))
    cs = r['content']['site']
    check(all(math.hypot(i['x'] - cs[0], i['y'] - cs[1]) > 5.5 for i in items if i['kind'] in ('tree', 'wind', 'shrub')), 'no tree inside the camp clearing')
    import li_trees as LT
    check(all(i['sp'] in LT.SPECIES for i in items), 'every planted species is one of the 16 li_trees species')

def test_clean():
    pat = re.compile(r'\b(' + '|'.join(RC.FORBIDDEN_WORDS) + r')\b', re.I)
    bad = []
    for s in SEEDS61:
        txt = json.dumps(RC.recipe_for(s))
        m = pat.search(txt)
        if m: bad.append((s, m.group(0)))
    check(not bad, 'no forbidden words in any of the 61 recipes %s' % (bad[:2],))
    files = [os.path.join(BL, f) for f in ('recipe.py', 'li_props.py', 'hero_render.py', 'variety_judge.py')] + [os.path.join(ROOT, 'RECIPE_LAYER.md')]
    leaks = []
    for f in files:
        if not os.path.exists(f): continue
        t = open(f).read()
        if re.search(r'/(tmp|home|root|Users)/\w', t): leaks.append(os.path.basename(f))
        if re.search(r'(api[_-]?key|secret|password|token)\s*=', t, re.I): leaks.append(os.path.basename(f) + ':secret')
    check(not leaks, 'new files hold no private paths or secrets %s' % leaks)

def test_judge():
    try:
        from PIL import Image
    except ImportError:
        print('SKIP variety judge test (no PIL)'); return
    import variety_judge as VJ
    d = tempfile.mkdtemp(prefix='vj_')
    rng = np.random.default_rng(3)
    base = np.zeros((84, 128, 3), np.uint8); base[:40] = (120, 170, 220); base[40:] = (30, 90, 140); base[55:70, 40:90] = (200, 180, 120)
    for i in range(3):       # three near-identical pictures
        im = np.clip(base.astype(int) + rng.integers(-4, 5, base.shape), 0, 255).astype(np.uint8); Image.fromarray(im).save(os.path.join(d, 'hero_a%d.png' % i))
    for i in range(3):       # three clearly different pictures
        im = rng.integers(0, 256, (84, 128, 3)).astype(np.uint8)
        if i == 1: im[:, :64] = (250, 250, 240)
        if i == 2: im[:] = (20 + 60 * rng.random((84, 128, 1))).astype(np.uint8)
        Image.fromarray(im).save(os.path.join(d, 'hero_b%d.png' % i))
    r = VJ.judge(d, 'hero_*.png', 0.90)
    top = {frozenset(p[:2]) for p in r['closest_pairs'][:3]}
    check(top == {frozenset(('hero_a0.png', 'hero_a1.png')), frozenset(('hero_a0.png', 'hero_a2.png')), frozenset(('hero_a1.png', 'hero_a2.png'))}, 'judge lists the three near-identical pictures as the closest pairs')
    check(r['pairs_ge_thr'] == 3 and r['clusters'] == 4, 'judge: 3 look-alike pairs, 4 clusters of 6 images (%d, %d)' % (r['pairs_ge_thr'], r['clusters']))
    same = VJ.judge(d, 'hero_a*.png', 0.90)['mean_pairwise']; mixed = r['mean_pairwise']
    check(same > 0.97 and mixed < same, 'judge: similar set scores higher than a varied set (%.3f vs %.3f)' % (same, mixed))

def main():
    for fn in (test_determinism, test_legacy_1122, test_spread, test_sites_and_cameras, test_clean, test_judge):
        fn()
    print('\n%s: %d failure(s)' % ('FAILED' if _fails else 'ALL PASSED', len(_fails)))
    return 1 if _fails else 0

def test_all():       # pytest entry
    assert main() == 0

if __name__ == '__main__':
    sys.exit(main())
