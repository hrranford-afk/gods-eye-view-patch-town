"""Plain python3 tests for landform/hydrology.py:  python3 landform/test_hydrology.py   (numpy only, deterministic, about 15 s)"""
import hashlib
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hydrology as H

ok = fail = 0


def check(name, cond, info=''):
    global ok, fail
    if cond:
        ok += 1
        print('ok   ' + name)
    else:
        fail += 1
        print('FAIL ' + name + ' ' + str(info))


def digest(A):
    return hashlib.sha256(A['parent'].tobytes() + A['area'].astype(np.float64).tobytes() + A['strahler'].tobytes()).hexdigest()[:16]


# 1. tiny hand-made field: a bowl with a rim and a gap, checks the algorithm itself
h = np.full((9, 9), 5.0)
h[3:6, 3:6] = 1.0               # a pit in the middle
h[4, 8] = 4.0                   # the edge cell is lower: outlet
h[4, 6:8] = 4.5                 # a low notch from the rim to the edge
h[0, :] = 6.0
filled, parent, order = H.priority_flood(h, sea=0.0)
check('pit is filled to the spill height', abs(filled[4, 4] - 4.5) < 1e-3, filled[4, 4])
check('every cell has an outlet path', int(np.isinf(filled).sum()) == 0)
check('order is receivers first', all((parent[i] < 0) or (list(order).index(parent[i]) < k) for k, i in enumerate(order[:200])))
acc = H.accumulate(parent, order, np.ones(81))
check('accumulation conserves cells at outlets', int(acc[parent < 0].sum()) == 81, acc[parent < 0].sum())

# 2. real exported worlds: one per rock, the volcanic and the gneiss included, plus all 12 for the general rules
SEEDS = {'volcanic': 4, 'gneiss': 153, 'sandstone': 139, 'basalt': 56}
res = {}
for rock, sd in SEEDS.items():
    W = H.load_world(sd)
    A = H.analyse(W['height'], W['dx'], W['sea'])
    C = H.check_flow(A)
    S = H.river_stats(A)
    res[rock] = (W, A, C, S)
    check('%s %d: heightfield loads 1/256 m, sea at 0, has land and sea' % (rock, sd), W['height'].shape == (W['nx'], W['nx']) and 0.05 < (W['height'] > 0).mean() < 0.95)
    check('%s: water never runs uphill on the filled surface' % rock, C['uphill_filled'] == 0, C)
    check('%s: dry ground never drains to higher ground' % rock, C['uphill_orig'] == 0, C)
    check('%s: every river head and lake reaches the sea or the window edge' % rock, C['ends']['loop_or_stuck'] == 0 and C['n_starts'] == C['ends']['sea'] + C['ends']['edge'], C)
    check('%s: lake surfaces are level (spread < 2 cm)' % rock, C['lake_spread_max'] < 0.02, C['lake_spread_max'])
    out, prod = H.mass_check(A)
    check('%s: runoff leaving the outlets equals runoff produced (mass)' % rock, abs(out - prod) / prod < 1e-9, (out, prod))
    check('%s: determinism (two runs, same hash)' % rock, digest(A) == digest(H.analyse(W['height'], W['dx'], W['sea'])))
    # catchment areas partition the land
    land_cells = int(A['land'].sum())
    roots = A['root'][A['land']]
    check('%s: every land cell belongs to one catchment' % rock, (roots >= 0).all() and len(roots) == land_cells)
    # Strahler: order is >= 1 on every channel cell and a river never loses order downstream
    so = A['strahler'].ravel()
    nf = A['net'].ravel()
    par = A['parent']
    dec = [1 for i in np.flatnonzero(nf) if par[i] >= 0 and nf[par[i]] and so[par[i]] < so[i]]
    check('%s: Strahler order never drops downstream' % rock, len(dec) == 0 and (so[nf] >= 1).all())
    # contributing area grows downstream
    bad = [1 for i in np.flatnonzero(par >= 0) if A['area'].ravel()[par[i]] < A['area'].ravel()[i]]
    check('%s: contributing area never shrinks downstream' % rock, len(bad) == 0)

W, A, C, S = res['volcanic']
check('volcanic: the cone gives several rivers (>= 5 heads) of order >= 2', S['n_heads'] >= 5 and S['max_order'] >= 2, S)
check('volcanic: rivers are short (a window is 258 m): total channel < 2 km', S['total_len_m'] < 2000, S['total_len_m'])
fl = H.falls(res['volcanic'][1])
check('falls: every candidate drops >= 0.5 m on a channel cell', all(d >= 0.5 for _, d, _ in fl))
W, A, C, S = res['gneiss']
check('gneiss: flat skerries give few or no rivers (honest: <= 3 heads)', S['n_heads'] <= 3, S)

# all 12 windows: the general rules
tot_uphill = tot_bad = 0
for w in __import__('json').load(open(os.path.join(H.WORLDS, 'index.json')))['worlds']:
    W = H.load_world(w['seed'])
    A = H.analyse(W['height'], W['dx'], W['sea'])
    C = H.check_flow(A)
    tot_uphill += C['uphill_filled'] + C['uphill_orig']
    tot_bad += C['ends']['loop_or_stuck']
check('all 12 exported windows: no uphill flow, no loops', tot_uphill == 0 and tot_bad == 0, (tot_uphill, tot_bad))

# 3. hydraulic geometry and rain shape
w1, d1 = H.channel_geometry(np.array([0.01, 1.0, 100.0]))
check('channel width and depth grow with discharge, width faster than depth is not required but both rise', (np.diff(w1) > 0).all() and (np.diff(d1) > 0).all())
check('1 m3/s bankfull is about 3 m wide and 0.3 m deep (the tuned constants)', abs(w1[1] - 3.0) < 1e-9 and abs(d1[1] - 0.3) < 1e-9)
cone = np.fromfunction(lambda r, c: 12.0 * np.clip(1 - np.hypot(r - 64, c - 64) / 60.0, 0, 1) - 2.0, (129, 129))
rf = H.rain_field(cone, 4.0, wind_from_deg=270.0)                    # wind from the west
west = rf[64, 40:56].mean()
east = rf[64, 72:88].mean()
check('rain shadow: the windward (west) flank of a cone gets more rain than the lee', west > 1.4 * east, (west, east))
flat = np.zeros((40, 40))
flat[:, 20:] = 100.0
rf2 = H.rain_field(flat, 100.0, wind_from_deg=0.0)
check('rain rises with altitude: a flat 100 m plateau gets 250 mm more than flat lowland (per_100m)', abs((rf2[20, 30] - rf2[20, 5]) - 250.0) < 1.0, (rf2[20, 30], rf2[20, 5]))

# 4. rain pulse -> hydrograph on the biggest catchment of the volcanic window
W, A, C, S = res['volcanic']
g = int(A['root'].ravel()[S['mouths'][0]])
inc = np.flatnonzero((A['root'].ravel() == g) & A['land'].ravel())
cy, cx = np.mean(inc // A['nx']) * A['dx'], np.mean(inc % A['nx']) * A['dx']
t, q, vin, nc = H.hydrograph(A, g, (cx, cy), 90.0)
t_off, q_off, _, _ = H.hydrograph(A, g, (cx + 600.0, cy), 90.0)
k = int(q.argmax())
check('hydrograph: starts near zero, rises to a peak, falls again', q[0] < 0.2 * q[k] and q[k] > 0 and q[-1] < 0.05 * q[k] and (np.diff(q[:k]) >= -1e-12).all(), (q[0], q[k], q[-1]))
check('hydrograph: falls after the peak (monotone within 1 percent)', (np.diff(q[k:]) <= 0.01 * q[k]).all())
check('hydrograph: peak is not before the rain starts, and the flow keeps going after the pulse ends (baseflow tail)', t[k] >= 0 and q[120] > 0.01 * q[k])
check('hydrograph: volume out equals volume in over 60 h (within 1 percent)', abs(q.sum() * 60.0 / vin - 1.0) < 0.01, q.sum() * 60.0 / vin)
check('hydrograph: rain 600 m away produces < 1 percent of the peak', q_off.max() < 0.01 * q[k], (q_off.max(), q[k]))
t2, q2, _, _ = H.hydrograph(A, g, (cx, cy), 90.0, pulse_mm_h=20.0)
check('hydrograph: double the rain rate gives double the peak (linear stores)', abs(q2.max() / q.max() - 2.0) < 1e-6)
t3, q3, _, _ = H.hydrograph(A, g, (cx, cy), 90.0, pulse_mm_h=10.0, pulse_min=90.0)
check('hydrograph: a longer pulse (three times the rain) gives a larger peak and later peak', q3.max() > q.max() and q3.argmax() >= q.argmax())

# 5. cost: the pass on a 65k-cell grid stays under a few seconds in numpy and python (budget, not a browser measure)
import time
n = 256
h = H.synthetic_island(n, 16.0, seed=3, beta=2.8)
t0 = time.time()
A = H.analyse(h, 16.0, 0.0, thr_m2=40000.0)
dt = time.time() - t0
check('hydrology pass on 256 x 256 (65k cells) takes < 8 s here (%.1f s)' % dt, dt < 8.0)

print('\n%d passed, %d failed' % (ok, fail))
sys.exit(1 if fail else 0)
