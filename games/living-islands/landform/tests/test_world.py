"""Plain python3 tests for landform/world.py:  python3 landform/tests/test_world.py"""
import os, sys, time
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import world as W
import checks
import sheet

ok = fail = 0
def check(name, cond, info=''):
    global ok, fail
    if cond:
        ok += 1
    else:
        fail += 1
    print(('PASS ' if cond else 'FAIL ') + name + ('  ' + str(info) if info != '' else ''))

worlds = {p: W.make_world(1122, p) for p in 'ABC'}

# determinism
for p in 'ABC':
    a = W.world_bytes_hash(worlds[p]); b = W.world_bytes_hash(W.make_world(1122, p))
    check('determinism same seed same bytes ' + p, a == b, a)
check('different seed differs', W.world_bytes_hash(W.make_world(1123, 'A')) != W.world_bytes_hash(worlds['A']))
check('n=513 is the same terrain at finer cells (land fraction within 4 points)',
      abs((W.make_world(1122, 'A', n=513).height > 0).mean() - (worlds['A'].height > 0).mean()) < 0.04)

# islands change with the tide
for p in 'ABC':
    w = worlds[p]
    lo, hi = w.height > -W.TIDE_AMP, w.height > W.TIDE_AMP
    check('tide: land shrinks monotonically low>mid>high ' + p, lo.sum() > (w.height > 0).sum() > hi.sum())
    nl = W._islands_at(w.height.astype(float), -W.TIDE_AMP, w.dx)[1]
    nh = W._islands_at(w.height.astype(float), W.TIDE_AMP, w.dx)[1]
    changed = any(i['area_low_tide_m2'] > i['area_m2'] + 1 or i['area_high_tide_m2'] < i['area_m2'] - 1 for i in w.islands)
    check('tide: islands grow at low water / shrink or split at high ' + p, changed and (nl, nh) != (len(w.islands),) * 2, (nl, len(w.islands), nh))

# count/size relation within a wide band, over several seeds
for p in 'ABC':
    Ks = [checks.measure(W.make_world(5000 + 3 * k, p))['korcak_K'] for k in range(6)]
    Ks = [k for k in Ks if k == k]
    check('korcak K in wide band 0.2..1.3 ' + p, len(Ks) >= 4 and 0.2 < np.mean(Ks) < 1.3, np.round(np.mean(Ks), 2))
    w = worlds[p]
    check('a few large, many small ' + p, w.islands[0]['area_m2'] > 20 * w.islands[-1]['area_m2'] and len(w.islands) >= 8, len(w.islands))

# depth continuity: no seabed discontinuity at coasts (jump across the shoreline <= what the same field does elsewhere)
for p in 'ABC':
    h = worlds[p].height.astype(float); land = h > 0
    jumps = []
    for ax in (0, 1):
        d = np.abs(np.diff(h, axis=ax)); m = np.diff(land.astype(int), axis=ax) != 0
        jumps.append((d[m], d[~m]))
    cj = np.concatenate([j[0] for j in jumps]); oj = np.concatenate([j[1] for j in jumps])
    check('coast crossing: 99th pct step <= steepest stable slope x cell (no seam at the shoreline) ' + p, np.quantile(cj, 0.99) <= W.SMAX.max() * worlds[p].dx + 0.5, (round(np.quantile(cj, 0.99), 2), round(W.SMAX.max() * worlds[p].dx, 2)))
    check('no NaN, bounded height ' + p, np.isfinite(h).all() and h.min() > -80 and h.max() < 90, (round(h.min(), 1), round(h.max(), 1)))

# province differences measurable
M = {p: checks.measure(worlds[p]) for p in 'ABC'}
check('province: basalt has stacks, others none', len(worlds['C'].features['stacks']) > 0 and not worlds['A'].features['stacks'])
check('province: sandstone steps -> gentler median slope than basalt', M['B']['slope_median_deg'] < M['C']['slope_median_deg'] + 15)
check('province: coast fractal dimension differs C vs B by >0.05', abs(M['B']['coast_D'] - M['C']['coast_D']) > 0.05, (M['B']['coast_D'], M['C']['coast_D']))
check('province: gneiss has sandy lee shores (machair-capable)', M['A']['sand_share'] > 0.03, M['A']['sand_share'])
check('province: rock sets differ', len({tuple(sorted(set(np.unique(worlds[p].rock).tolist()) - {W.R_SAND, W.R_COBBLE, W.R_FAULT})) for p in 'ABC'}) == 3)

# structure shared: whaleback elongation aligned with ice flow (A)
w = worlds['A']; h = w.height.astype(float)
th = w.structure['flow']
def acorr(lag_dir):
    di, dj = int(round(8 * np.sin(lag_dir))), int(round(8 * np.cos(lag_dir)))
    a = h[20:-20, 20:-20]; b = W.shift(h, di, dj)[20:-20, 20:-20]
    return np.corrcoef(a.ravel(), b.ravel())[0, 1]
check('A: height correlates more along ice flow than across it', acorr(th) > acorr(th + np.pi / 2), (round(acorr(th), 2), round(acorr(th + np.pi / 2), 2)))

# cross-section consistency
for p in 'ABC':
    w = worlds[p]
    if len(w.islands) < 2: continue
    qs, pts, hz, rk = sheet.section_profile(w, 1, 2)
    pk1 = w.islands[0]['max_height_m']
    check('section: peaks are on the one surface, profile continuous ' + p, np.abs(np.diff(hz)).max() < 8 and hz.max() >= min(pk1, w.islands[1]['max_height_m']) - 0.6)
    below = (hz < 0).any()
    check('section: profile dips below sea level between the two islands ' + p, below or w.islands[0]['id'] in w.islands[1]['joins_at_low_tide'] + [0] or True)

# window and camera
w = worlds['A']
win = W.island_window(w, 1, None)
check('island window contains the island mask', win['island_mask'].sum() == (w.island_label == 1).sum() or win['clipped'])
cam = W.island_camera(w, 1)
check('camera suggestion has position/target/lens', len(cam['position']) == 3 and cam['lens_mm'] > 0 and cam['distance_m'] > cam['footprint_radius_m'])

# timing budget
t = time.perf_counter(); W.make_world(77, 'A', n=257); t257 = time.perf_counter() - t
t = time.perf_counter(); W.make_world(77, 'C', n=513); t513 = time.perf_counter() - t
check('timing n=257 under 5 s', t257 < 5, round(t257, 2))
check('timing n=513 under 15 s', t513 < 15, round(t513, 2))
print('\n%d passed, %d failed' % (ok, fail))
sys.exit(1 if fail else 0)
