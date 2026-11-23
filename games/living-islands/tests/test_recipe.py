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
_CACHE = {}
def rec(seed):
    if seed not in _CACHE: _CACHE[seed] = RC.recipe_for(seed)
    return _CACHE[seed]
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
    camps = [rec(x)['content']['camp'] for x in range(2001, 2061)]
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
    rs = [rec(s) for s in SEEDS61]
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
        r = rec(s); c = r['content']
        pts = [c['site']] + [p['pos'] for p in c['props']] + [r['camera']['pos'][:2]]
        z = _ground(r, pts)
        if c['kind'] != 'wreck' and z[0] < 0.2: bad_site.append((s, round(z[0], 2)))
        if r['camera']['pos'][2] < z[-1] + 0.9: bad_cam.append((s, r['camera']['pos'][2], round(z[-1], 2)))
        if c['kind'] == 'camp' and c['camp']['boat']:
            pass
    check(not bad_site, 'what-is-there site stands on land for every seed %s' % (bad_site[:3],))
    check(not bad_cam, 'camera is above the ground for every seed %s' % (bad_cam[:3],))
    r = rec(2005); items = RC.plan_trees(r)['items']
    z = _ground(r, [(i['x'], i['y']) for i in items])
    check(all(zz > -0.1 for zz in z), 'planted items stand on land (cliffs seed 2005, %d items)' % len(items))
    cs = r['content']['site']
    check(all(math.hypot(i['x'] - cs[0], i['y'] - cs[1]) > 5.5 for i in items if i['kind'] in ('tree', 'wind', 'shrub')), 'no tree inside the camp clearing')
    import li_trees as LT
    check(all(i['sp'] in LT.SPECIES for i in items), 'every planted species is one of the 16 li_trees species')

def test_framing():
    """HW-4: cameras inside rock, looking straight down, one object filling the frame, island tiny. Checked from geometry, for all 61 seeds, hero and close-up."""
    import li_trees as LT
    bad = collections.defaultdict(list); n = 0
    F = RC.FRAME
    for s in SEEDS61[1:]:
        r = rec(s); zf = RC._terrain(r['island']['style'], r['island']['carve'], s)
        for nm in ('camera', 'camera_close'):
            c = r[nm]; fr = c['framing']; P = c['pos']; n += 1
            foot = [(P[0] + dx, P[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
            if P[2] < float(zf([q[0] for q in foot], [q[1] for q in foot]).max()) + F['cam_clear'] - 0.02: bad['inside terrain'].append((s, nm))
            if not (F['sub_lo'] <= fr['subject_frac'] <= F['sub_hi']): bad['subject size'].append((s, nm, fr['subject_frac']))
            if fr['pitch_deg'] > F['pitch'][c['kind']]: bad['looking down'].append((s, nm, fr['pitch_deg']))
            if c['kind'] == 'high_wide' and fr['island_width_frac'] < F['isl_w']: bad['island small'].append((s, fr['island_width_frac']))
            if not fr['ok']: bad['framing not ok'].append((s, nm, fr['failed']))
            if fr['sight_clearance_m'] < F['ray_clear'] - 0.01: bad['sight line in terrain'].append((s, nm))
    for k in ('inside terrain', 'subject size', 'looking down', 'island small', 'framing not ok', 'sight line in terrain'):
        check(not bad[k], 'framing: no %s over %d cameras of 60 seeds %s' % (k, n, bad[k][:3]))
    fixed = [s for s in SEEDS61[1:] if rec(s)['camera']['framing']['adjusted']]
    check(len(fixed) >= 10, 'framing: the check changed the camera of %d seeds (so it is doing something)' % len(fixed))
    for s in (2004, 2005, 2012, 2015, 2016, 2017, 2020, 2021, 2023, 2029):      # seeds named by the hardware
        fr = rec(s)['camera']['framing']
        check(fr['ok'] and fr['pitch_deg'] < 35 and 0.25 <= fr['subject_frac'] <= 0.7, 'framing: HW-4 seed %d now passes (subject %.0f%%, pitch %.0f)' % (s, 100 * fr['subject_frac'], fr['pitch_deg']))
    leg = RC.recipe_for(1122)
    check('framing' not in leg['camera'] and 'camera_close' not in leg and leg['camera']['pos'] == [-9.0, -29.0, 10.0], 'framing: legacy 1122 camera is untouched (no framing field, no close camera)')

def test_framing_unit():
    """the geometry helpers on made-up cases."""
    zf = lambda x, y: np.zeros(len(np.atleast_1d(x)))
    S = np.array([0.0, 0.0, 1.0]); R = 3.0
    ctx = dict(zf=zf, S=S, R=R, trees=np.zeros((0, 2)), isl=np.array([[-10.0, 0, 1], [10, 0, 1]]))
    # a camera 12 m away, 36 mm: sphere diameter 6 m over a 12 x tan(vfov/2) = 12 x 0.333 x 2 frame -> 0.75 of the height (too big)
    m = RC._measure(ctx, np.array([0.0, -12.0, 1.5]), S, 36.0, 'low_beach')
    check(abs(m['size'] - (3.0 / math.sqrt(144 - 9)) / (12 / 36.0)) < 0.02 and 'big' in RC._violations(m, 'low_beach'), 'framing unit: a 6 m subject at 12 m is too big (%.2f)' % m['size'])
    P, T, lens, m2, v, it = RC._adjust(ctx, np.array([0.0, -12.0, 1.5]), S.copy(), 36.0, 'low_beach')
    check(not v and RC.FRAME['sub_lo'] <= m2['size'] <= RC.FRAME['sub_hi'], 'framing unit: _adjust backs off to a legal size (%.2f, %d steps)' % (m2['size'], it))
    # a camera under the ground is lifted; a camera looking steeply down is brought below the pitch limit
    zh = lambda x, y: np.full(len(np.atleast_1d(x)), 5.0)
    ctx2 = dict(ctx, zf=zh)
    P, T, lens, m3, v, it = RC._adjust(ctx2, np.array([0.0, -14.0, 2.0]), S.copy(), 36.0, 'low_beach')
    check(P[2] >= 5.0 + RC.FRAME['cam_clear'] - 0.01, 'framing unit: a camera inside the ground is lifted above it (z %.2f)' % P[2])
    P, T, lens, m4, v, it = RC._adjust(ctx, np.array([0.0, -6.0, 9.0]), S.copy(), 36.0, 'low_beach')
    check(m4['pitch'] <= RC.FRAME['pitch']['low_beach'] and 'pitch' not in v, 'framing unit: straight-down camera brought to %.0f degrees (limit %.0f)' % (m4['pitch'], RC.FRAME['pitch']['low_beach']))
    # too small: moves in, or tightens the lens, but never inside the subject
    P, T, lens, m5, v, it = RC._adjust(ctx, np.array([0.0, -70.0, 2.0]), S.copy(), 36.0, 'from_sea')
    check(m5['gap'] >= RC.FRAME['gap'] and m5['size'] >= RC.FRAME['sub_lo'], 'framing unit: a far camera is brought in (size %.2f, distance %.1f)' % (m5['size'], m5['dist']))

def test_framing_deterministic():
    a = RC.recipe_for(2029); b = RC.recipe_for(2029)
    check(json.dumps(a['camera'], sort_keys=True) == json.dumps(b['camera'], sort_keys=True) and json.dumps(a['camera_close'], sort_keys=True) == json.dumps(b['camera_close'], sort_keys=True), 'framing is deterministic (2029 twice)')
    check(IC.STYLE is None and IC.CAMP == (-1.5, -7.0), 'framing leaves island_common as it found it')
    c = RC.recipe_for(2029); fr = c['camera']['framing']
    check(set(('ok', 'clearance_m', 'pitch_deg', 'subject_frac', 'island_width_frac', 'distance_m', 'initial', 'subject', 'band')) <= set(fr), 'recipe json records the framing fields')
    check(json.loads(json.dumps(c)) == c, 'recipe with framing is plain JSON')

def test_cliff_site_not_a_pit():
    """HW-4 2004, 2005, 2029: the camp clearing on a cliff plateau was dug down to beach level, a pit with the camera on its rim."""
    for s in (2004, 2005, 2029):
        r = rec(s); site = r['content']['site']
        z = _ground(r, [site, (site[0] + 6, site[1]), (site[0] - 6, site[1]), (site[0], site[1] + 6), (site[0], site[1] - 6)])
        check(r['island']['style'].get('bench') and min(z[1:]) > z[0] - 1.5, 'cliff camp %d: the clearing is level with its surroundings (site %.1f m, ring min %.1f m)' % (s, z[0], min(z[1:])))

def test_picture_guard():
    import picture_guard as PG
    try:
        from PIL import Image
    except ImportError:
        Image = None
    d = tempfile.mkdtemp(prefix='pg_'); rng = np.random.default_rng(5)
    def save(name, arr):
        p = os.path.join(d, name)
        if Image: Image.fromarray(arr.astype(np.uint8)).save(p)
        else: raise RuntimeError('no PIL')
        return p
    if Image:
        black = save('black.png', np.zeros((120, 180, 3))); noisy_black = save('nb.png', rng.integers(0, 3, (120, 180, 3)))
        flat = save('flat.png', np.full((120, 180, 3), 128)); mostly_black = save('mb.png', np.pad(np.full((12, 18, 3), 200), ((0, 108), (0, 162), (0, 0))))
        grad = np.tile(np.linspace(20, 230, 180)[None, :, None], (120, 1, 3)) + rng.integers(-5, 6, (120, 180, 3)); good = save('good.png', np.clip(grad, 0, 255))
        dusk = save('dusk.png', np.clip(rng.normal(30, 12, (120, 180, 3)), 0, 255))
        check(not PG.check_picture(black)[0] and 'black' in PG.check_picture(black)[1], 'guard: an all-black picture fails with a clear message')
        check(not PG.check_picture(noisy_black)[0], 'guard: near-black noise fails')
        check(not PG.check_picture(flat)[0] and 'flat' in PG.check_picture(flat)[1], 'guard: a flat grey picture fails')
        check(not PG.check_picture(mostly_black)[0], 'guard: a picture that is 99 percent black fails')
        check(PG.check_picture(good)[0] and PG.check_picture(dusk)[0], 'guard: a normal and a dim dusk picture pass')
        # the numpy-only PNG decoder (Blender's Python has no PIL) agrees with PIL
        g1 = PG._png_gray(good); g2 = np.asarray(Image.open(good).convert('L'), float)
        check(g1 is not None and abs(g1.mean() - g2.mean()) < 1.0, 'guard: the PIL-free PNG decoder agrees with PIL (%.2f vs %.2f)' % (g1.mean(), g2.mean()))
    check(not PG.check_picture(os.path.join(d, 'nope.png'))[0], 'guard: a missing file fails')
    empty = os.path.join(d, 'empty.png'); open(empty, 'wb').write(b'')
    check(not PG.check_picture(empty)[0], 'guard: an empty file fails')
    # batch.py and hero_render.py both call the guard
    bt = open(os.path.join(BL, 'batch.py')).read(); hr = open(os.path.join(BL, 'hero_render.py')).read()
    check('PG.check_picture' in bt and 'picture_guard' in hr and 'sys.exit(3)' in hr, 'guard: batch.py and hero_render.py both run it after a render')

def test_sky_softening_recorded():
    lows = [(s, rec(s)['time']) for s in SEEDS61[1:] if rec(s)['time']['sun_el_deg'] < 12]
    check(lows and all(t['horizon_soften'] > 0.2 for s, t in lows), 'low-sun recipes ask for horizon softening (%d seeds)' % len(lows))
    check(all(rec(s)['time']['horizon_soften'] == 0 for s in SEEDS61[1:] if rec(s)['time']['sun_el_deg'] >= 36) and 'horizon_soften' not in RC.recipe_for(1122)['time'], 'sun above 36 degrees and the legacy recipe get none')
    ls = open(os.path.join(BL, 'li_scene.py')).read()
    check('horizon_soften=0.0' in ls and 'ShaderNodeRGBToBW' in ls, 'make_sky: horizon_soften defaults to 0 (the original sky) and uses only 3.6-compatible nodes')

def test_forbidden_words_unchanged():
    check(RC.FORBIDDEN_WORDS == ('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'brand', 'logo'), 'FORBIDDEN_WORDS is unchanged (the owner has not confirmed a change to the tone rails)')

def test_clean():
    pat = re.compile(r'\b(' + '|'.join(RC.FORBIDDEN_WORDS) + r')\b', re.I)
    bad = []
    for s in SEEDS61:
        txt = json.dumps(rec(s))
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
    for fn in (test_determinism, test_legacy_1122, test_spread, test_sites_and_cameras, test_framing, test_framing_unit, test_framing_deterministic, test_cliff_site_not_a_pit, test_picture_guard, test_sky_softening_recorded, test_forbidden_words_unchanged, test_clean, test_judge):
        fn()
    print('\n%s: %d failure(s)' % ('FAILED' if _fails else 'ALL PASSED', len(_fails)))
    return 1 if _fails else 0

def test_all():       # pytest entry
    assert main() == 0

if __name__ == '__main__':
    sys.exit(main())
