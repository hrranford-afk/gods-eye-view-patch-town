"""Plain python3 tests for globe/climate.py:  python3 globe/test_climate.py   (numpy only, deterministic, about a minute)"""
import os
import sys
import types

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import climate as C
import planet as PL
import circulation as CI

ok = fail = 0


def check(name, cond, info=''):
    global ok, fail
    if cond:
        ok += 1
        print('ok   ' + name)
    else:
        fail += 1
        print('FAIL ' + name + ' ' + str(info))


def band_mean(f, lo, hi):
    m = (np.abs(PL.LAT2) >= lo) & (np.abs(PL.LAT2) <= hi)
    return float((f * PL.AREA_W * m).sum() / (PL.AREA_W * m).sum())


def zonal_dry_lat(cl, hemi=1):
    # latitude of the driest zonal-mean row between 8 and 60 degrees
    zp = cl.zonal_precip()
    m = (PL.LAT * hemi >= 8.0) & (PL.LAT * hemi <= 0.9 * cl.storm_lat)
    return float(PL.LAT[m][np.argmin(zp[m])])


def aqua(land_cols=None, rows=None, ridge=None):
    # an invented test world: all sea except a block of land; returns (planet-like, sst, elevation)
    land = np.zeros((PL.NLAT, PL.NLON), bool)
    elev = np.zeros(land.shape)
    if land_cols is not None:
        land[rows[0]:rows[1], land_cols[0]:land_cols[1]] = True
        elev[land] = 150.0
    if ridge is not None:
        elev[rows[0]:rows[1], ridge[0]:ridge[1]] = 2800.0
    ice = np.abs(PL.LAT2) > PL.ICE_LAT
    land = land | ice
    pl = types.SimpleNamespace(land=land, ice=ice, ocean=~land, field=np.zeros(land.shape))
    return pl, PL.sst_base(PL.LAT2), elev


# ---- 1. one real invented planet, Earth-like spin and tilt
p, c, cl = C.world_climate(7)
check('global water closes (evaporation = precipitation) within 0.1 percent', abs(cl.closure) < 1e-3, cl.closure)
check('closure scale factor is near 1 (the independent evaporation and the rain pattern agree in size)', 0.5 < cl.f_scale < 2.0, cl.f_scale)
check('global mean rain 700 to 1400 mm a year (Earth about 1000)', 700 < cl.global_P_mm < 1400, cl.global_P_mm)
lb = cl.land_balance()
check('land balance P = ET + Q + dS: storage change below 15 mm a year', abs(lb['dS']) < 15, lb)
check('land evaporation is 40 to 95 percent of land rain', 0.4 < lb['ET'] / lb['P'] < 0.95, lb)
check('no negative rain, evaporation or runoff', cl.precip.min() >= 0 and cl.evap.min() >= 0 and cl.runoff.min() >= 0)
check('temperature falls from equator to pole by 30 to 70 C', 30 < band_mean(cl.annual_temp(), 0, 10) - band_mean(cl.annual_temp(), 75, 90) < 70)
check('the ocean evaporates more in the trades than at 60 degrees', band_mean(np.where(c.planet.ocean, cl.annual_evap(), 0), 10, 25) > band_mean(np.where(c.planet.ocean, cl.annual_evap(), 0), 55, 65))

# ---- 2. belts for Earth-like spin, on several seeds
good = 0
for seed in (1, 2, 3, 4, 5, 6):
    pp, cc, cx = C.world_climate(seed)
    P = cx.annual_precip()
    eq, sub = band_mean(P, 0, 8), 0.5 * (band_mean(P, 20, 32) + 0.0)
    wet_n, wet_s = band_mean(0, 0, 0) if False else 0, 0
    zp = cx.zonal_precip()
    eqz = zp[(np.abs(PL.LAT) <= 10)].mean()
    subz_n = zp[(PL.LAT >= 20) & (PL.LAT <= 32)].mean()
    subz_s = zp[(PL.LAT <= -20) & (PL.LAT >= -32)].mean()
    midz_n = zp[(PL.LAT >= 40) & (PL.LAT <= 58)].mean()
    midz_s = zp[(PL.LAT <= -40) & (PL.LAT >= -58)].mean()
    if eqz > 1.5 * max(subz_n, subz_s) and midz_n > 1.3 * subz_n and midz_s > 1.3 * subz_s:
        good += 1
check('wet equator, dry subtropics, wet mid-latitudes on 6 of 6 seeds', good == 6, good)
dn, ds = zonal_dry_lat(cl, 1), zonal_dry_lat(cl, -1)
check('driest zonal rows sit 15 to 40 degrees from the equator in both hemispheres (spin 1)', 15 <= dn <= 40 and 15 <= -ds <= 40, (dn, ds))

# ---- 3. spin and tilt move the belts
p0, c0 = cl.hadley, cl.storm_lat
slow = C.Climate(p, c.sst, spin=0.5)
fast = C.Climate(p, c.sst, spin=2.0)
check('Hadley edge: slower spin is wider, faster is narrower', slow.hadley > cl.hadley > fast.hadley, (slow.hadley, cl.hadley, fast.hadley))
check('slower spin moves the dry belt poleward (mean of both hemispheres)', 0.5 * (zonal_dry_lat(slow, 1) - zonal_dry_lat(slow, -1)) > 0.5 * (zonal_dry_lat(cl, 1) - zonal_dry_lat(cl, -1)) + 3.0,
      (zonal_dry_lat(slow, 1), zonal_dry_lat(slow, -1), dn, ds))
check('faster spin moves the dry belt toward the equator', 0.5 * (zonal_dry_lat(fast, 1) - zonal_dry_lat(fast, -1)) < 0.5 * (dn - ds) - 2.0,
      (zonal_dry_lat(fast, 1), zonal_dry_lat(fast, -1), dn, ds))
t0 = C.Climate(p, c.sst, tilt=0.0)
t45 = C.Climate(p, c.sst, tilt=45.0)
check('no tilt: the rain belt does not migrate (range under 2 degrees)', t0.itcz_range() < 2.0, t0.itcz_range())
check('more tilt: the rain belt migrates further (0 < 23 < 45)', t0.itcz_range() < cl.itcz_range() < t45.itcz_range(), (t0.itcz_range(), cl.itcz_range(), t45.itcz_range()))
check('no tilt: no seasons in temperature at 50 degrees (swing under 3 C)', np.ptp(t0.T[:, np.argmin(abs(PL.LAT - 52.5)), :][:, c.planet.ocean[np.argmin(abs(PL.LAT - 52.5))]].mean(1)) < 3.0)
check('Earth tilt: land at 50 degrees has a seasonal swing over 8 C', np.ptp(cl.T[:, np.argmin(abs(PL.LAT - 47.5)), :][:, c.planet.land[np.argmin(abs(PL.LAT - 47.5))]].mean(1)) > 8.0 if c.planet.land[np.argmin(abs(PL.LAT - 47.5))].any() else True)

# ---- 4. a mountain ridge: windward wetter than lee (westerlies at 50 degrees north)
pl, sst, el = aqua(land_cols=(20, 50), rows=(27, 31), ridge=(30, 32))      # rows 27..30 are 47.5 to 62.5 degrees north
cr = C.Climate(pl, sst, elevation=el)
j = 28
P = cr.annual_precip()
wind = cr.u[:, j, 25].mean()
check('the ridge test sits in the westerlies', wind > 2.0, wind)
check('windward slope and foothills wetter than the lee side (west 26-29 vs east 32-36)', P[j, 26:30].mean() > 1.3 * P[j, 32:37].mean(), (P[j, 26:30].mean(), P[j, 32:37].mean()))
check('the lee side is drier than the same latitude at sea (rain shadow)', P[j, 32:36].mean() < P[j, 8:14].mean(), (P[j, 32:36].mean(), P[j, 8:14].mean()))
flat = C.Climate(pl, sst, elevation=np.where(pl.land, 150.0, 0.0))
check('without the ridge the west-east gap is smaller', abs(flat.annual_precip()[j, 26:30].mean() / flat.annual_precip()[j, 32:37].mean() - 1.0) < 0.5 * (P[j, 26:30].mean() / P[j, 32:37].mean() - 1.0))

# ---- 5. seasons: the wet belt follows the sun
tz = cl.precip.mean(2)                                          # [12, NLAT]
tropic = np.abs(PL.LAT) <= 30
cen = [float((tz[m][tropic] * PL.LAT[tropic]).sum() / tz[m][tropic].sum()) for m in range(12)]
check('tropical rain centroid is north in July and south in January', cen[6] > cen[0] + 4.0, (cen[0], cen[6]))
nh_c = zonal_ns = float(cl.season_index()[(PL.LAT2 > 5) & (PL.LAT2 < 20) & c.planet.land].mean()) if (c.planet.land & (PL.LAT2 > 5) & (PL.LAT2 < 20)).any() else 1.0
sh_c = float(cl.season_index()[(PL.LAT2 < -5) & (PL.LAT2 > -20) & c.planet.land].mean()) if (c.planet.land & (PL.LAT2 < -5) & (PL.LAT2 > -20)).any() else -1.0
check('northern tropical land is wetter in northern summer, southern tropical land in northern winter', nh_c > 0.1 and sh_c < -0.1, (nh_c, sh_c))
oc = c.planet.ocean
mid = (PL.LAT2 > 40) & (PL.LAT2 < 60) & oc
check('mid-latitude sea: the wettest months are in the cool half (storm track stronger in winter)', float(cl.season_index()[mid].mean()) < 0.0, float(cl.season_index()[mid].mean()))

# ---- 6. island local climate in a cool maritime place
rows = [j for j in range(PL.NLAT) if 48 <= PL.LAT[j] <= 64]
cells = [(j, i) for j in rows for i in range(PL.NLON) if c.planet.coast[j, i]]
check('there are cool-latitude coast cells to test', len(cells) > 10, len(cells))
bad = []
for (j, i) in cells:
    d = cl.local(j, i)
    if not (600 < d['annual_rain_mm'] < 3600 and 0 <= d['freeze_days'] < 120 and 0 <= d['fog_days'] < 150 and 0 <= d['gale_days'] <= 120 and
            2 < d['mean_temp'] < 17 and 1.0 <= d['wet_dry_ratio'] < 8 and 60 < d['rain_days'] < 320 and 0 <= d['snow_days'] <= d['rain_days'] and
            d['runoff_mm'] > 0 and d['et_mm'] <= d['pet_mm'] + 1e-6 and abs(d['annual_rain_mm'] - d['et_mm'] - d['runoff_mm']) < 30):
        bad.append((j, i, {k: d[k] for k in ('annual_rain_mm', 'freeze_days', 'fog_days', 'gale_days', 'mean_temp', 'wet_dry_ratio', 'rain_days')}))
check('island climate outputs are in sane ranges for every cool coast cell', not bad, bad[:2])
check('cool maritime sea cells: wettest in autumn or winter (start month 7 to 11 or 0)', all(cl.local(j, i)['wettest3_start'] in (7, 8, 9, 10, 11, 0) for (j, i) in cells[:20]))

# ---- 7. fresh water lens
h, t, u = C.freshwater_lens(400.0, 1000.0, 10.0)
check('Ghyben-Herzberg: depth below sea is 40 times the head above', abs(t - 41.0 * h) < 1e-9)
check('wider island, thicker lens; more recharge, thicker lens', C.freshwater_lens(400, 2000)[1] > C.freshwater_lens(400, 1000)[1] and C.freshwater_lens(800, 1000)[1] > C.freshwater_lens(400, 1000)[1])
check('minimum width for a usable lens falls as rain rises', C.lens_min_width(1200) < C.lens_min_width(300))
check('10 m a day sand, 350 mm recharge: a 1 km island holds a lens of 15 to 60 m', 15 < C.freshwater_lens(350, 1000, 10.0)[1] < 60, C.freshwater_lens(350, 1000, 10.0))

# ---- 8. determinism and 60 seeds
a = C.Climate(p, c.sst).hash_hex()
b = C.Climate(p, c.sst).hash_hex()
check('deterministic: the same inputs give the same hash', a == b == cl.hash_hex(), (a, b, cl.hash_hex()))
worst = 0.0
allok = True
fz = []
for seed in range(1, 61):
    pp, cc, cx = C.world_climate(seed)
    worst = max(worst, abs(cx.closure))
    fin = np.isfinite(cx.precip).all() and np.isfinite(cx.T).all() and np.isfinite(cx.evap).all()
    allok &= bool(fin and cx.precip.min() >= 0 and 600 < cx.global_P_mm < 1500 and 0.4 < cx.f_scale < 2.5)
    fz.append(cx.f_scale)
check('60 seeds run, finite, global rain 600 to 1500 mm, closure scale 0.4 to 2.5', allok, (min(fz), max(fz)))
check('60 seeds: global water closes to 0.1 percent on every seed', worst < 1e-3, worst)

print('\n%d ok, %d failed' % (ok, fail))
sys.exit(1 if fail else 0)
