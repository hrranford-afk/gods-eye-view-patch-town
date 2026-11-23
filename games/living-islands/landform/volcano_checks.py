"""Realism numbers for province D (volcanic island).  python3 volcano_checks.py [nseeds=20] [n=513] [base=100]
Targets come from research/VOLCANIC_ISLAND_AND_CUTAWAY.md (tags there: PLAUSIBLE or TUNING; the shield and cone slope ranges are
from USGS/NPS extracts for REAL volcanoes, here used on a diorama that exaggerates height 2 to 3 times, so they are TUNING bands)."""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import world as W            # noqa: E402


def measure_D(w):
    h = w.height.astype(np.float64)
    p = w.volcano
    X, Y, dx = w.X, w.Y, w.dx
    gy, gx = np.gradient(h, dx)
    sl = np.degrees(np.arctan(np.hypot(gx, gy)))
    Cx, Cy = p['C1']
    Vx, Vy = p['V']
    r1 = np.hypot(X - Cx, Y - Cy)
    r2 = np.hypot(X - Vx, Y - Vy)
    land = h > 1.0
    m = {}
    m['summit_m'] = float(h.max())
    m['summit_target_ratio'] = float(h.max() / p['H_target'])
    m['vexag'] = float(h.max() / (W.D_REAL_HEIGHT_RATIO * p['Rc']))
    sk = land & (r2 > 1.05 * p['rb']) & (r1 > 0.62 * p['Rc']) & (r1 < 0.95 * p['Rc']) & (h > 2.0) & (w.flow_thick < 0.2)
    m['skirt_slope_med'] = float(np.median(sl[sk])) if sk.any() else float('nan')
    m['skirt_slope_p90'] = float(np.percentile(sl[sk], 90)) if sk.any() else float('nan')
    cone = land & (r2 < 0.55 * p['rb']) & (w.flow_thick < 0.2) & (h > p['floor_lv'] + 5.0) & (np.abs(r1 - p['rc']) > 0.30 * p['rc'])   # not the caldera wall
    m['cone_slope_med'] = float(np.median(sl[cone])) if cone.any() else float('nan')
    m['cone_slope_p90'] = float(np.percentile(sl[cone], 90)) if cone.any() else float('nan')
    m['n_cones'] = len(p['cones'])
    # barrancos: valleys crossing a circle at 0.5 Rc round the old centre, scaled to 360 degrees
    ang = np.linspace(0, 2 * math.pi, 1440, endpoint=False)
    cnts = []
    for rho in (0.45, 0.60):
        R_ = rho * p['Rc']
        xs, ys = Cx + R_ * np.cos(ang), Cy + R_ * np.sin(ang)
        ok = (np.abs(xs) < w.size_m / 2 - 5) & (np.abs(ys) < w.size_m / 2 - 5)
        j = np.clip(((xs + w.size_m / 2) / dx).astype(int), 0, w.n - 1)
        i = np.clip(((ys + w.size_m / 2) / dx).astype(int), 0, w.n - 1)
        z = h[i, j]
        k = max(int(60.0 / (R_ * 2 * math.pi / 1440)) | 1, 3)
        sm = np.convolve(np.pad(z, k, mode='wrap'), np.ones(k) / k, mode='same')[k:-k]
        dev = z - sm
        low = (dev < -4.0) & ok
        starts = low & ~np.roll(low, 1)
        cnts.append(float(starts.sum()) * 1440.0 / max(int(ok.sum()), 1))
    m['barrancos_per_360'] = float(np.mean(cnts))
    # shelf narrowness: median distance from the shoreline to the -50 m contour along rays from the old centre (north half)
    ds = []
    for a in np.radians(np.arange(15, 166, 5)):
        rr = np.arange(0.0, 1400.0, 3.0)
        xs, ys = Cx + rr * math.cos(a), Cy + rr * math.sin(a)
        ok = (np.abs(xs) < w.size_m / 2 - 3) & (np.abs(ys) < w.size_m / 2 - 3)
        j = ((xs + w.size_m / 2) / dx).astype(int).clip(0, w.n - 1)
        i = ((ys + w.size_m / 2) / dx).astype(int).clip(0, w.n - 1)
        z = np.where(ok, h[i, j], np.nan)
        zi = np.nan_to_num(z, nan=9e9)
        a0 = np.argmax(zi < 0.0)
        if a0 == 0 or not ok[a0:].any():
            continue
        b0 = np.argmax((zi < -50.0) & ok)
        if b0 > a0 and zi[b0] < -50.0:
            ds.append((b0 - a0) * 3.0)
    m['shelf_to_50m_m'] = float(np.median(ds)) if ds else float('nan')
    m['edge_depth_m'] = float(-h.min())
    # coast mix
    sea = h <= 0.0
    shore = (h > 0) & (np.roll(sea, 1, 0) | np.roll(sea, -1, 0) | np.roll(sea, 1, 1) | np.roll(sea, -1, 1))
    shore &= (np.abs(X) < w.size_m / 2 - 6) & (np.abs(Y) < w.size_m / 2 - 6)
    n_sh = max(int(shore.sum()), 1)
    m['coast_black_sand'] = float((shore & (w.rock == W.R_BSAND)).sum() / n_sh)
    m['coast_boulder'] = float((shore & (w.rock == W.R_COBBLE)).sum() / n_sh)
    m['coast_rock'] = float(1.0 - m['coast_black_sand'] - m['coast_boulder'])
    m['n_flows'] = len(p['flows'])
    m['flows_reach_sea'] = int(sum(1 for f in p['flows'] if f['reaches_sea']))
    m['land_frac'] = float((h > 0).mean())
    zone_land = w.zone[w.zone > 0]
    m['belts_present'] = int(len(np.unique(zone_land)))
    wet = w.moisture
    hi = (h > 5)
    m['wet_dry_split'] = float(np.mean(wet[hi & (X < Cx)]) - np.mean(wet[hi & (X > Cx)])) if (hi & (X < Cx)).any() and (hi & (X > Cx)).any() else float('nan')
    m['time_s'] = w.timings['total']
    return m


TARGETS = [
    # key, lo, hi, tag, text
    ('summit_m', 200.0, 280.0, 'TUNING (note 1.4: 200 to 280 m)', 'summit height m'),
    ('vexag', 2.0, 3.2, 'TUNING (note: 2.5 to 3x)', 'vertical exaggeration'),
    ('skirt_slope_med', 3.0, 12.0, 'TUNING (note: shield 6 to 10 deg; USGS 3 to 12 for real shields)', 'skirt median slope deg'),
    ('cone_slope_med', 20.0, 35.0, 'TUNING (NPS cinder 25 to 32; composite 20 to 35)', 'cone median slope deg'),
    ('n_cones', 12, 30, 'TUNING (note: 12 to 30)', 'small cones'),
    ('barrancos_per_360', 8.0, 30.0, 'TUNING (note: 8 to 16 major; tributaries add)', 'valleys per 360 deg'),
    ('shelf_to_50m_m', 20.0, 160.0, 'TUNING (note: shelf break within 1-5 km real = 25-125 m here)', 'shoreline to -50 m, m'),
    ('coast_black_sand', 0.02, 0.35, 'TUNING', 'black sand share of shore'),
    ('coast_boulder', 0.0, 0.30, 'TUNING', 'boulder beach share'),
    ('coast_rock', 0.35, 0.95, 'TUNING', 'rock cliff / bench share'),
    ('flows_reach_sea', 1, 9, 'TUNING (>=1 lava delta)', 'flows reaching the sea'),
    ('belts_present', 4, 6, 'TUNING (note: 4 to 5 belts)', 'altitude belts present'),
    ('wet_dry_split', 0.05, 1.0, 'TUNING (windward wetter)', 'moisture W minus E'),
    ('time_s', 0.0, 15.0, 'budget (n=513 under 15 s)', 'seconds'),
]


def table(nseeds=20, n=513, base=100, quiet=False):
    rows = []
    for k in range(nseeds):
        seed = base + 7 * k
        w = W.make_world_D(seed, n=n)
        m = measure_D(w)
        m['seed'] = seed
        rows.append(m)
        if not quiet:
            print('seed', seed, 'done', round(m['time_s'], 1), 's', flush=True)
    return rows


def report(rows):
    print('\nProvince D realism, %d seeds.  columns: median [min..max]; share of worlds in band; status of the band' % len(rows))
    print('%-20s %-9s %-24s %-8s  %s' % ('metric', 'band', 'median [min..max]', 'in band', 'status'))
    for key, lo, hi, tag, text in TARGETS:
        v = np.array([r[key] for r in rows], dtype=float)
        ok = np.mean([(x == x) and lo <= x <= hi for x in v])
        verified = 'measured in band' if ok >= 0.8 else ('TUNING needed' if ok < 0.5 else 'mostly in band')
        print('%-20s %-9s %-24s %5.0f%%   %s | %s' % (key, '%g-%g' % (lo, hi), '%.2f [%.2f..%.2f]' % (np.nanmedian(v), np.nanmin(v), np.nanmax(v)), 100 * ok, verified, tag))


if __name__ == '__main__':
    ns = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 513
    base = int(sys.argv[3]) if len(sys.argv) > 3 else 100
    rows = table(ns, n, base)
    report(rows)
