# level1/test_layout.py -- tests for the Level 1 layout, validator and sweep (plain asserts; run:  python3 level1/test_layout.py   or with pytest).
# The chosen seed is CHOSEN_SEED below. Full run takes a few minutes (the sweep of 50 seeds is read from level1/sweep.json and spot-checked by rebuilding 3 seeds).
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import layout as LY    # noqa: E402
import pool as POOL    # noqa: E402
import tide as TD      # noqa: E402
import validate as V   # noqa: E402

CHOSEN_SEED = 0        # set by the sweep (level1/chosen_seed.txt); read below
try:
    CHOSEN_SEED = int(open(os.path.join(HERE, 'chosen_seed.txt')).read().strip())
except Exception:
    CHOSEN_SEED = 1

_CACHE = {}


def built(seed):
    if seed not in _CACHE:
        L = LY.build_layout(seed)
        _CACHE[seed] = (L, V.validate(L))
    return _CACHE[seed]


def test_tide_port_matches_page_clock():
    # the Python tide equals sky_clock.js tide() at several hours (through node when it exists)
    hours = [0.0, 5.5, 100.3, 2000.7, TD.GIFT_START_HOURS, TD.GIFT_START_HOURS + 30.0, TD.GIFT_START_HOURS + 333.3]
    mine = TD.level(np.array(hours))
    js = os.path.join(ROOT, 'sky_clock.js')
    node = subprocess.run(['which', 'node'], capture_output=True, text=True).stdout.strip()
    if not node or not os.path.exists(js):
        print('  (node missing: the JS comparison is skipped)')
        return
    code = "import %s;const S=globalThis.SkyClock;console.log(JSON.stringify(%s.map(h=>S.tide(h).level)));console.log(S.hoursFor(121,5,9))" % (json.dumps('file://' + js), json.dumps(hours))
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False) as f:
        f.write(code)
    out = subprocess.run([node, f.name], capture_output=True, text=True).stdout.strip().split('\n')
    os.unlink(f.name)
    ref = np.array(json.loads(out[0]))
    assert np.max(np.abs(ref - mine)) < 1e-9, (ref, mine)
    assert abs(float(out[1]) - TD.GIFT_START_HOURS) < 1e-6


def test_pool_comes_from_the_foundry_shortlist():
    sl = json.load(open(os.path.join(ROOT, 'foundry', 'seeds', 'shortlist.json')))
    ok = {(p, e['seed']) for p, lst in sl['by_province'].items() for e in lst}
    P = POOL.load_pool()
    assert len(P) > 300
    assert all((p['prov'], p['seed']) in ok for p in P)
    assert {p['prov'] for p in P} == {'A', 'B', 'C'}


def test_roles_use_the_intended_geology():
    L, R = built(CHOSEN_SEED)
    assert L['roles']['home']['key'] == 'B9001.1'
    assert L['roles']['woods']['prov'] == 'B' and L['roles']['hoard']['prov'] == 'B'
    assert L['roles']['seals']['prov'] == 'A'
    assert L['roles']['wreck']['prov'] == 'C' and L['roles']['rock']['prov'] == 'C'


def test_determinism():
    a = LY.build_layout(CHOSEN_SEED)
    b = LY.build_layout(CHOSEN_SEED)
    assert a['hash'] == b['hash']
    assert np.array_equal(a['H'], b['H']) and np.array_equal(a['veg'], b['veg']) and np.array_equal(a['owner'], b['owner'])
    assert LY.build_layout(CHOSEN_SEED + 1)['hash'] != a['hash']


def test_home_island_is_the_builders_island():
    L, R = built(CHOSEN_SEED)
    hc = LY.home_candidate()
    r0, c0 = LY.cell_off(hc, *LY.HOME_AT)
    sub = L['H'][r0:r0 + 129, c0:c0 + 129]
    changed = int((np.abs(sub - hc['H'])[hc['H'] > 0] > 0.02).sum())
    assert changed <= 40, changed


def test_chosen_seed_passes_every_hard_check():
    L, R = built(CHOSEN_SEED)
    assert R['ok'], R['fails']
    names = {c['name'] for c in R['checks']}
    for must in ('hoard_bar_tide_window', 'robot_crossing_fits_window', 'boat_trips_in_target', 'home_lee_shore', 'home_wrack_capacity', 'timber_for_five_builds', 'home_water_by_rain',
                 'woods_fresh_water', 'home_buildable', 'lighthouse_sees_the_water', 'budget_T2_ipad', 'budget_T4_ar', 'seals_have_haulouts', 'no_overlap_gap'):
        assert must in names, must


def test_every_robot_route_is_walkable_at_the_right_tide():
    L, R = built(CHOSEN_SEED)
    H = R['analysis'].H
    for k, rt in R['robots'].items():
        if rt is None:
            continue
        for p in rt['path']:
            r, c = V.xz_to_rc(*p)
            assert H[int(round(r)), int(round(c))] + V.WADE >= rt['tstar'] - 1e-6, (k, p)
        # and the step rise never exceeds the robot limit
        for a, b in zip(rt['path'][:-1], rt['path'][1:]):
            ra, ca = V.xz_to_rc(*a)
            rb, cb = V.xz_to_rc(*b)
            dh = abs(H[int(round(rb)), int(round(cb))] - H[int(round(ra)), int(round(ca))])
            assert dh / (np.hypot(rb - ra, cb - ca) * LY.DX) <= V.ROBOT_SLOPE + 1e-6
    hb = R['robots']['hoard']
    assert hb['tstar'] < 0.0                       # the Hoard needs low water
    ws = V.crossing_windows(hb['tstar'], 40, 0)
    assert len(ws) >= 8                            # about twice a day in the good half of the month
    day1 = [w for w in ws if w['day'] == 1]
    assert not day1                                # day 1 is near neap: the bar is not open on the first morning (the Hoard is a second goal)


def test_boat_trips_inside_target_times_and_tide_sensitivity():
    L, R = built(CHOSEN_SEED)
    for k, t in R['trips'].items():
        assert t['lo'] <= t['mid_s'] <= t['hi'], (k, t['mid_s'])
        assert t['high_s'] is not None and t['low_s'] is not None
        assert t['mid_fast_s'] < t['mid_s'] * 0.55
        # the bed under the route clears the keel at mid tide
        H = R['analysis'].H
        for p in t['path'][::3]:
            r, c = V.xz_to_rc(*p)
            assert 0.0 - H[int(np.clip(round(r), 0, LY.NX - 1)), int(np.clip(round(c), 0, LY.NX - 1))] >= V.BOAT_CLEAR - 0.9, (k, p)   # 4 m cells: the 2 m cell inside may be up to 0.9 m higher


def test_surge_and_wrack_numbers_exist_for_every_island():
    L, R = built(CHOSEN_SEED)
    sh = R['metrics']['shores']
    for r in LY.ROLES:
        assert r in sh and 0.0 <= sh[r]['E_storm'] <= 1.0 and sh[r]['coast_m'] > 0
    assert sh['home']['lee_m'] >= 60 and sh['home']['haul_pieces'] >= 600
    # the exposed side is a different shore from the lee side: some island is clearly more exposed than the home
    assert max(sh[r]['E_storm'] for r in LY.ROLES if r != 'home') > sh['home']['E_storm']


def test_resources_against_first_day_costs_and_catalogue():
    builds, cat = V.first_day_numbers()
    assert set(builds) == {'jetty', 'cottage', 'cistern', 'hide', 'kiosk'}, builds
    assert builds['cottage'] == 85000 and 'rope' in cat and len(cat) == 10 and 'timber' not in cat
    L, R = built(CHOSEN_SEED)
    t = R['metrics']['timber']
    assert t['supply_year1_m3'] >= t['need_five_builds_m3']
    assert R['metrics']['drift']['total'] > 0


def test_fresh_water_home_and_woods():
    L, R = built(CHOSEN_SEED)
    h = R['metrics']['hydrology']
    assert h['home']['q_max_m3_day'] < 4.5            # no real stream on the home island, as the builder says
    assert h['woods']['q_max_m3_day'] >= 2.2 and h['woods']['channel_cells'] >= 3
    chk = {c['name']: c for c in R['checks']}
    assert chk['home_water_by_rain']['ok']


def test_slope_and_buildable_limits():
    L, R = built(CHOSEN_SEED)
    fl = R['metrics']['flat_m2']
    assert fl['home'] >= 1200 and fl['woods'] >= 120 and fl['hoard'] >= 150
    assert fl['seals'] <= 400
    dp = L['depot']
    assert dp['pad_h'] >= 1.5 and dp['cut_fill_m3'] <= 600


def test_no_overlaps_and_everything_inside_the_table():
    L, R = built(CHOSEN_SEED)
    own, H = L['owner'], L['H']
    assert not ((H > 0) & (np.hypot(LY.X, LY.Z) > LY.LAND_R)).any()
    gaps = [c for c in R['checks'] if c['name'] == 'no_overlap_gap'][0]
    assert gaps['value'] >= LY.MIN_GAP_M - 0.1
    assert (own >= 0).any() and set(np.unique(own[own >= 0])) == set(range(6))


def test_budget_estimates_by_tier():
    L, R = built(CHOSEN_SEED)
    te = R['metrics']['tiers']
    assert set(te) == set(V.TIERS)
    assert te['T4 AR']['tris'] <= 90000 and te['T2 iPad high']['tris'] <= 150000


def test_lighthouse_sight_line():
    L, R = built(CHOSEN_SEED)
    s = R['metrics']['sight']
    assert s['water_share'] >= 0.70 and all(v is True for v in s['key'].values())
    # a sight line that is blocked is reported as blocked: put a 30 m wall of rock between the stump and the depot
    H2 = R['analysis'].H.copy()
    sr, sc = V.xz_to_rc(*L['spots']['stump'])
    dr, dc = V.xz_to_rc(*L['depot']['xy'])
    mr, mc = int(round((sr + dr) / 2)), int(round((sc + dc) / 2))
    H2[mr - 3:mr + 4, mc - 3:mc + 4] = 40.0
    assert not V.los_clear(H2, (sr, sc), (dr, dc), H2[int(sr), int(sc)] + V.LIGHT_H, H2[int(dr), int(dc)] + 1.0)


def test_validator_catches_a_bar_that_never_dries():
    L, R0 = built(CHOSEN_SEED)
    import copy
    L2 = dict(L)
    H = L['H'].copy()
    b = [x for x in L['bars'] if x['name'] == 'hoard bar'][0]
    for (x, z) in b['path']:
        r, c = V.xz_to_rc(x, z)
        r, c = int(round(r)), int(round(c))
        H[r - 4:r + 5, c - 4:c + 5] = np.minimum(H[r - 4:r + 5, c - 4:c + 5], np.where(L['owner'][r - 4:r + 5, c - 4:c + 5] >= 0, H[r - 4:r + 5, c - 4:c + 5], -1.8))
    L2['H'] = H
    R2 = V.validate(L2)
    assert not R2['ok'] and ('hoard_route_walkable' in R2['fails'] or 'hoard_bar_tide_window' in R2['fails'] or 'robot_crossing_fits_window' in R2['fails']), R2['fails']


def test_validator_catches_a_blocked_sound_and_a_bare_woods():
    L, R0 = built(CHOSEN_SEED)
    L2 = dict(L)
    L2['wood'] = np.zeros_like(L['wood'])
    R2 = V.validate(L2)
    assert 'timber_for_five_builds' in R2['fails'] and 'timber_sustainable' in R2['fails']
    # a land wall from the home shore to the table rim cuts the boat routes
    H = L['H'].copy()
    r0 = int(V.xz_to_rc(0, 40)[0])
    c0, c1 = int(V.xz_to_rc(-30, 40)[1]), int(V.xz_to_rc(120, 40)[1])
    H[r0 - 2:r0 + 3, :] = np.where(H[r0 - 2:r0 + 3, :] < 2.0, 2.0, H[r0 - 2:r0 + 3, :])
    L3 = dict(L)
    L3['H'] = H
    R3 = V.validate(L3)
    assert not R3['ok'] and ('boat_trips_in_target' in R3['fails'] or 'low_tide_detours_sane' in R3['fails'] or 'land_inside_table' in R3['fails'])


def test_sweep_reports_which_seeds_pass_and_why_others_fail():
    rows = json.load(open(os.path.join(HERE, 'sweep.json')))
    assert len(rows) == 50 and [r['seed'] for r in rows] == list(range(1, 51))
    passed = [r['seed'] for r in rows if r['ok']]
    failed = [r for r in rows if not r['ok']]
    assert CHOSEN_SEED in passed
    assert len(passed) >= 1 and len(failed) >= 5
    assert all(r['fails'] for r in failed)                       # every failure names its reason
    reasons = {f for r in failed for f in r['fails']}
    assert len(reasons) >= 5                                      # and the reasons differ: the validator is not one blunt rule
    # spot check: three seeds rebuild to the stored hash and verdict
    for s in (CHOSEN_SEED, 2, 7):
        L, R = built(s)
        row = rows[s - 1]
        assert row['hash'] == L['hash'] and row['ok'] == R['ok'] and row['fails'] == R['fails'], s


def test_export_round_trip():
    L, R = built(CHOSEN_SEED)
    with tempfile.TemporaryDirectory() as d:
        man = LY.export_level(L, d)
        blob = open(os.path.join(d, 'world.bin'), 'rb').read()
        n2 = LY.NX * LY.NX
        h = np.frombuffer(blob, '<i2', n2, man['arrays']['height']['offset']).reshape(LY.NX, LY.NX) / 256.0
        assert np.abs(h - L['H']).max() < 0.005
        assert man['nx'] == LY.NX and man['bytes'] == len(blob)


def test_tide_windows_example_table():
    # the hoard bar's windows in the first fortnight (the doc quotes these)
    L, R = built(CHOSEN_SEED)
    hb = R['robots']['hoard']
    ws = V.crossing_windows(hb['tstar'], 14, 0)
    assert ws and all(w['minutes'] > 0 for w in ws)
    assert ws[0]['day'] >= 2


def test_no_real_names_or_private_paths_in_new_files():
    bad = ['/home/', 'C:\\\\', '@gmail', 'Hebrides', 'Orkney', 'Shetland', 'Scilly']
    for fn in os.listdir(HERE):
        if fn.endswith(('.py', '.md', '.json')) and fn not in ('sweep.json', 'drift_table.json'):
            t = open(os.path.join(HERE, fn), encoding='utf-8').read()
            for b in bad:
                if fn == 'test_layout.py':
                    continue
                assert b not in t, (fn, b)


if __name__ == '__main__':
    import time
    fails = 0
    for name, fn in sorted(globals().items()):
        if name.startswith('test_') and callable(fn):
            t = time.time()
            try:
                fn()
                print('ok   %s (%.1fs)' % (name, time.time() - t))
            except Exception as e:
                fails += 1
                import traceback
                print('FAIL %s: %r' % (name, e))
                traceback.print_exc()
    print('failures:', fails)
    sys.exit(1 if fails else 0)
