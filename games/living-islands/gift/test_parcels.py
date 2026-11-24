"""Plain python3 tests for gift/parcels.py:  python3 gift/test_parcels.py   (numpy only, deterministic, about 40 seconds)"""
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parcels as G

ok = fail = 0


def check(name, cond, info=''):
    global ok, fail
    if cond:
        ok += 1
        print('ok   ' + name)
    else:
        fail += 1
        print('FAIL ' + name + ' ' + str(info))


def spearman(a, b):
    ra = np.argsort(np.argsort(a)).astype(float)
    rb = np.argsort(np.argsort(b)).astype(float)
    return float(np.corrcoef(ra, rb)[0, 1])


def dump(p):
    return json.dumps(p, sort_keys=True, default=float)


t0 = time.time()
chart = G.Chart(1)
parcels, home = chart.build()
by_id = {p['id']: p for p in parcels}

# 1 determinism: a second chart object gives the same parcel, byte for byte
chart2 = G.Chart(1)
reg = chart.registry()
check('registry is the same on a second build', reg == chart2.registry())
ci, cj = reg[len(reg) // 2]
a, b = chart.parcel(ci, cj), chart2.parcel(ci, cj)
check('same seed and square give the same parcel', dump(a) == dump(b))
# 2 a different planet seed gives a different chart
c3 = G.Chart(2)
check('another planet seed gives another registry', c3.registry() != reg)

# 3 registry: size, no overlaps, all on open ocean inside the region
check('registry holds a few hundred parcels', 150 <= len(parcels) <= 600, len(parcels))
ids = [p['id'] for p in parcels]
check('parcel ids are unique', len(set(ids)) == len(ids))
lon = np.array([p['lon'] for p in parcels])
lat = np.array([p['lat'] for p in parcels])
mind = 1e9
for i in range(len(parcels)):
    d = G.gc_km(lon[i], lat[i], lon[i + 1:], lat[i + 1:])
    if d.size:
        mind = min(mind, float(d.min()))
check('no two parcels overlap (centres at least two radii apart)', mind > 2 * G.PARCEL_RADIUS_KM, mind)
r = chart.region
check('all parcels are inside the chart region', bool(((lon >= r['lon0']) & (lon < r['lon1']) & (lat >= r['lat0']) & (lat < r['lat1'])).all()))
import planet as PL
jj, ii = PL.cell_of(lon, lat)
check('every parcel sits on an ocean cell, none on ice', bool(chart.planet.ocean[jj, ii].all() and not chart.planet.ice[jj, ii].any()))
dd = chart.land_d[jj, ii]
rate = {k: np.mean([1 for q in dd if q == k]) for k in (1, 2)}
check('parcels are denser near coasts than in open sea', (dd == 1).mean() > 0.4 and (dd >= 3).mean() < 0.35, [(dd == k).mean() for k in (1, 2, 3)])

# 4 scores in range
okr = all(0.0 <= p['parts'][k] <= 1.0 for p in parcels for k in G.PARTS) and all(0.0 <= p['suitability'] <= 1.0 and 0.0 <= p['hazard'] <= 1.0 for p in parcels)
check('all score parts, hazard and suitability are within 0..1', okr)
check('weights sum to one', abs(sum(G.WEIGHTS.values()) - 1.0) < 1e-9)
S = np.array([p['suitability'] for p in parcels])
check('suitability has spread (not all the same)', S.std() > 0.05, S.std())
for k in G.PARTS:
    v = np.array([p['parts'][k] for p in parcels])
    if v.std() < 0.05:
        check('part %s varies' % k, False, v.std())
check('every part varies across the registry', all(np.array([p['parts'][k] for p in parcels]).std() >= 0.05 for k in G.PARTS))

# 5 price rises with suitability (formula, then registry)
prev = 0
mono = True
for s in np.linspace(0.1, 0.9, 17):
    pr = G.price_formula(s, 3.0, 0.5, 100.0)
    mono &= pr > prev
    prev = pr
check('price strictly rises with suitability (other things equal)', mono)
P = np.array([p['price'] for p in parcels])
check('prices are inside the clip and above the floor', bool((P >= G.PRICE_MIN).all() and (P <= G.PRICE_MAX).all()))
check('registry: price follows suitability (Spearman > 0.7)', spearman(S, P) > 0.7, spearman(S, P))
check('median parcel costs well under the 1,000,000 gift, best parcels cost more', 150000 < np.median(P) < 900000 and P.max() > 900000, (np.median(P), P.max()))

# 6 remote parcels cost less to buy but more to reach
check('price formula falls with remoteness (other things equal)', G.price_formula(0.5, 3, 0.5, 1500) < G.price_formula(0.5, 3, 0.5, 100) < G.price_formula(0.5, 3, 0.5, 0))
rem = np.array([p['remote_km'] for p in parcels])
resid = np.log(P) - G.PRICE_K * S                     # what is left of the price after suitability
check('registry: remote parcels are cheaper once suitability is removed', spearman(resid, rem) < -0.2, spearman(resid, rem))
vd = np.array([p['voyage_days'] for p in parcels])
dh = np.array([p['dist_home_km'] for p in parcels])
fin = np.isfinite(vd)
check('every parcel in the region is reachable by sea from home', bool(fin.all()), int((~fin).sum()))
check('voyage days rise with distance from home (Spearman > 0.9)', spearman(vd[fin], dh[fin]) > 0.9, spearman(vd[fin], dh[fin]))
sc = np.array([p['survey_cost'] for p in parcels])
check('survey cost rises with voyage days', spearman(sc[fin], vd[fin]) > 0.99)
near, far = np.argsort(dh)[:30], np.argsort(dh)[-30:]
check('far parcels cost more to reach than near ones', sc[far].mean() > 5 * sc[near].mean(), (sc[far].mean(), sc[near].mean()))
check('the gifted parcel is the cheapest to reach', home['voyage_days'] <= 0.1 + 1e-9 and home['reachable'])

# 7 climate follows latitude
T = np.array([p['climate']['t_mean'] for p in parcels])
L = np.abs(lat)
check('annual mean temperature falls with latitude (r < -0.8)', np.corrcoef(T, L)[0, 1] < -0.8, np.corrcoef(T, L)[0, 1])
lo, hi = L <= np.percentile(L, 33), L >= np.percentile(L, 67)
check('the low-latitude third is at least 5 C warmer than the high-latitude third', T[lo].mean() - T[hi].mean() > 5.0, T[lo].mean() - T[hi].mean())
check('rain is plausible (every parcel 200 to 7000 mm)', all(200 < p['climate']['rain_mm'] < 7000 for p in parcels))
check('summer is warmer than winter at every parcel', all(p['climate']['t_warm'] > p['climate']['t_cold'] for p in parcels))
# coast effect: the same latitude row, sea air has a smaller seasonal swing than a continental cell would
sw = np.array([p['climate']['t_warm'] - p['climate']['t_cold'] for p in parcels])
check('sea parcels have a modest seasonal range (median under 18 C)', np.median(sw) < 18.0, np.median(sw))

# 8 window stand-ins: flips and rotations keep the areas, the registry uses several windows
m0, m5 = G.window_metrics(153, 0), G.window_metrics(153, 5)
check('a flipped window keeps its flat area and skerry count', abs(m0['flat_area'] - m5['flat_area']) < 1e-6 and m0['skerries'] == m5['skerries'])
check('a registry of this size uses at least 10 of the 12 windows', len({p['window_seed'] for p in parcels}) >= 10, len({p['window_seed'] for p in parcels}))
check('island counts per parcel are 3 to 8', all(3 <= p['n_islands'] <= 8 for p in parcels))
check('different windows give different scores', len({round(p['suitability'], 3) for p in parcels}) > 40)

# 9 what washes up depends on place
fy = [p['washup']['finds_per_year'] for p in parcels]
srcs = {tuple(p['washup']['source_ids']) for p in parcels}
check('wash-up differs from place to place', len(srcs) > 5 and np.std(fy) > 0.5, (len(srcs), np.std(fy)))

# 10 acquisition forms
rich = max(parcels, key=lambda p: p['parts']['wildlife'])
of = {o['form']: o for o in G.offers(rich)}
check('fixed price equals the list price', abs(of['fixed']['upfront'] - rich['price']) < 1e-6)
check('a lease costs less up front than buying and has rent', of['lease']['upfront'] < 0.2 * rich['price'] and of['lease']['annual'] > 0)
check('high-wildlife parcels offer a conservation grant at 40 percent', 'conservation_grant' in of and abs(of['conservation_grant']['upfront'] - 0.4 * rich['price']) < 1e-6)
low = min(parcels, key=lambda p: p['parts']['wildlife'])
check('low-wildlife parcels offer no grant', all(o['form'] != 'conservation_grant' for o in G.offers(low)))
check('auction final price is repeatable', G.offers(rich)[2]['upfront'] == G.offers(rich)[2]['upfront'])
n_ruin = sum(any(o['form'] == 'inherited_ruin' for o in G.offers(p)) for p in parcels)
check('a few parcels (1 to 8 percent) come as inherited ruins', 0.005 * len(parcels) <= n_ruin <= 0.12 * len(parcels), n_ruin)

# 11 survey and fog of war
lv = G.survey_reveal(parcels, home)
check('a survey reveals the target in full and neighbours in part', lv[home['id']] == 3 and len(lv) > 1 and all(v in (2, 3) for v in lv.values()))
est = G.price_estimate(home, 1), G.price_estimate(home, 2), G.price_estimate(home, 3)
check('price band narrows with knowledge', (est[0][1] - est[0][0]) > (est[1][1] - est[1][0]) > (est[2][1] - est[2][0]) == 0 and G.price_estimate(home, 0) is None)

# 12 sixty parcels run end to end from a clean chart
t1 = time.time()
c4 = G.Chart(1)
sixty, h4 = c4.build(limit=60)
check('60 parcels run end to end', len(sixty) == 60 and all(np.isfinite(p['price']) for p in sixty), len(sixty))
check('60 parcels agree with the full run (same ids and prices)', all(abs(by_id[p['id']]['price'] - p['price']) < 1e-6 for p in sixty))
print('60-parcel build %.1f s, whole test %.1f s' % (time.time() - t1, time.time() - t0))

print('%d ok, %d failed' % (ok, fail))
sys.exit(1 if fail else 0)
