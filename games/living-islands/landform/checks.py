"""REALISM CHECKS per world, as numbers (numpy only).
  python3 checks.py [nseeds=20] [n=257]   -> table per province + target comparison
Target status: VERIFIED = figure seen in a named source extract of the research notes (the figure, not our
mapping of it); PLAUSIBLE = standard knowledge; TUNING = a design range of ours.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import world as W            # noqa: E402

A_MIN = 60.0        # m2: islands smaller than this (about 15 cells at n=257) are not counted in the size statistics
FIT_MIN_ISL = 6


def korcak(areas):
    """Slope K of N(>A) ~ A^-K from the rank-size list of islands >= A_MIN."""
    a = np.sort(np.array([x for x in areas if x >= A_MIN]))[::-1]
    if len(a) < FIT_MIN_ISL:
        return float('nan'), len(a)
    rank = np.arange(1, len(a) + 1)
    la, lr = np.log(a), np.log(rank)
    # fit on log-binned means to avoid the dense small-island tail dominating
    k = -np.polyfit(la, lr, 1)[0]
    return float(k), len(a)


def box_dim(edge):
    n = edge.shape[0]
    sizes = [2, 3, 4, 6, 8, 12, 16, 24, 32]
    cs, ns = [], []
    for s in sizes:
        m = (n // s) * s
        e = edge[:m, :m].reshape(m // s, s, m // s, s).any(axis=(1, 3))
        cs.append(s)
        ns.append(max(int(e.sum()), 1))
    sl = np.polyfit(np.log(1.0 / np.array(cs)), np.log(ns), 1)[0]
    return float(sl)


def nearest_gaps(w, min_area=600.0):
    """Edge-to-edge distance from each island (>= min_area) to its nearest neighbour island (m)."""
    big = [i for i in w.islands if i['area_m2'] >= min_area]
    if len(big) < 2:
        return []
    pts = []
    own = []
    lab = w.island_label
    land = lab > 0
    edge = land & ~(np.roll(land, 1, 0) & np.roll(land, -1, 0) & np.roll(land, 1, 1) & np.roll(land, -1, 1))
    for k, i in enumerate(big):
        ys, xs = np.nonzero(edge & (lab == i['id']))
        if len(ys) > 60:
            sel = np.linspace(0, len(ys) - 1, 60).astype(int)
            ys, xs = ys[sel], xs[sel]
        pts.append(np.stack([w.X[0, xs], w.Y[ys, 0]], 1))
        own += [k] * len(ys)
    P = np.concatenate(pts)
    own = np.array(own)
    d = np.hypot(P[:, None, 0] - P[None, :, 0], P[:, None, 1] - P[None, :, 1])
    d[own[:, None] == own[None, :]] = 1e9
    return [float(d[own == k].min()) for k in range(len(big))]


def coves(w):
    """Sheltered coves: low-exposure water, 1-15 m deep, enclosed by land; components >= 150 m2."""
    h = w.height.astype(np.float64)
    land = h > w.sea_level
    enclosed = W.blur(land.astype(np.float64), 10, 1) > 0.18
    cove = (~land) & (w.exposure < 0.2) & enclosed & (w.sea_level - h > 1.0) & (w.sea_level - h < 15)
    lab, n = W.label4(cove)
    c = np.bincount(lab.ravel(), minlength=n + 1)[1:]
    return int((c * w.dx * w.dx >= 150.0).sum())


def measure(w):
    h = w.height.astype(np.float64)
    lv = w.sea_level
    land = h > lv
    nland = max(int(land.sum()), 1)
    areas = [i['area_m2'] for i in w.islands]
    K, nfit = korcak(areas)
    big = sorted(areas, reverse=True)
    sig = [a for a in big if a >= A_MIN]
    ratio_ls = (sig[0] / sig[-1]) if len(sig) > 1 else float('nan')
    r20 = (sig[0] / sig[19]) if len(sig) >= 20 else float('nan')
    edge = land & ~(np.roll(land, 1, 0) & np.roll(land, -1, 0) & np.roll(land, 1, 1) & np.roll(land, -1, 1))
    D = box_dim(edge)
    gy, gx = np.gradient(h, w.dx)
    sl = np.degrees(np.arctan(np.hypot(gx, gy)))
    ls = sl[land & (h > lv + 0.3)]
    # shore classes
    wat = ~land
    shore = land & (np.roll(wat, 1, 0) | np.roll(wat, -1, 0) | np.roll(wat, 1, 1) | np.roll(wat, -1, 1))
    sand_sh = shore & ((w.rock == W.R_SAND) | (w.rock == W.R_COBBLE))
    nsh = max(int(shore.sum()), 1)
    expo = shore & (w.exposure > 0.5)
    lee = shore & (w.exposure < 0.3)
    gaps = nearest_gaps(w)
    shelf = float(((h <= lv) & (h >= lv - 30)).mean())
    cand = w.landing_candidates
    return dict(
        n_islands=len(w.islands), n_ge_Amin=nfit, korcak_K=K, ratio_largest_smallest=ratio_ls, ratio_largest_20th=r20,
        largest_share=float(big[0] / max(sum(big), 1.0)) if big else float('nan'),
        coast_D=D, slope_median_deg=float(np.median(ls)) if len(ls) else float('nan'),
        slope_gt45=float((ls > 45).mean()) if len(ls) else 0.0, slope_gt60=float((ls > 60).mean()) if len(ls) else 0.0,
        slope_hist=np.histogram(ls, bins=[0, 5, 10, 20, 30, 45, 60, 90])[0] / max(len(ls), 1),
        sand_share=float(sand_sh.sum() / nsh), sand_share_lee=float((sand_sh & lee).sum() / max(lee.sum(), 1)),
        sand_share_exposed=float((sand_sh & expo).sum() / max(expo.sum(), 1)),
        land_frac=float(land.mean()), land_lt10=float((land & (h < lv + 10)).sum() / nland),
        nn_gap_mean=float(np.mean(gaps)) if gaps else float('nan'), nn_gap_median=float(np.median(gaps)) if gaps else float('nan'),
        coves=coves(w), landing=len(cand), landing_islands=len({c['island'] for c in cand}), shelf_frac=shelf,
        relief_ratio=float(np.mean([i['max_height_m'] / max(math.sqrt(i['area_m2'] / math.pi), 1.0) for i in w.islands if i['area_m2'] >= 2500])) if any(i['area_m2'] >= 2500 for i in w.islands) else float('nan'),
        n_stacks=len(w.features['stacks']), n_arches=len(w.features['arches']), n_geos=len(w.features['geos']))


# target ranges: (lo, hi, status, source/notes).  Island-size and coast numbers are scale-free, so they transfer
# to our 512 m window; the metre-based ones (spacing) do not, and are TUNING for this scale.
TARGETS = {
    'korcak_K':       (0.50, 0.85, 'VERIFIED figure 0.65 (S3 extract); band is TUNING', 'Korcak exponent of Earth islands'),
    'ratio_largest_20th': (30.0, 300.0, 'PLAUSIBLE (arithmetic from K)', 'largest / 20th island area'),
    'coast_D':        (1.10, 1.35, 'VERIFIED 1.2-1.3 rocky (S5); our grid cannot resolve below 2 m, band TUNING', 'box-count dimension of coast'),
    'slope_median_deg': (5.0, 25.0, 'UNVERIFIED (research: 5-15 gneiss, 10-25 slate)', 'median land slope'),
    'slope_gt60':     (0.0, 0.03, 'UNVERIFIED (research: <=3%)', 'share of land above 60 deg'),
    'sand_share':     (0.0, 0.25, 'TUNING (research: P1 5-25%, P6 0-5%, P4 0-15%)', 'sand+shingle share of shore'),
    'land_lt10':      (0.25, 0.80, 'TUNING (low archipelago 40-70%, steep <25%)', 'share of land below 10 m'),
    'shelf_frac':     (0.10, 0.90, 'PLAUSIBLE (shelf 10-40 m deep inside archipelagos)', 'field share 0-30 m deep'),
    'coves':          (1, 99, 'TUNING (research: >=1 harbour-like cove)', 'sheltered coves'),
    'landing':        (2, 999, 'TUNING', 'landing candidates'),
    'n_islands':      (8, 400, 'TUNING', 'islands >= 4 cells'),
}
PROV_SAND = {'A': (0.05, 0.25), 'B': (0.0, 0.15), 'C': (0.0, 0.08)}     # TUNING per province (research table)
PROV_SLOPE = {'A': (8, 30), 'B': (10, 35), 'C': (10, 40)}
PROV_LT10 = {'A': (0.35, 0.80), 'B': (0.25, 0.65), 'C': (0.0, 0.40)}


def province_table(prov, nseeds=20, n=257, base=3000, quiet=False):
    rows = []
    for k in range(nseeds):
        seed = base + 7 * k
        w = W.make_world(seed, prov, n=n)
        m = measure(w)
        m['seed'] = seed
        m['time'] = w.timings['total']
        rows.append(m)
    return rows


COLS = [('n_islands', '%4d', 'isl'), ('n_ge_Amin', '%4d', 'big'), ('korcak_K', '%5.2f', 'K'), ('ratio_largest_20th', '%6.0f', 'L/20th'),
        ('largest_share', '%5.2f', 'Lshr'), ('coast_D', '%5.2f', 'D'), ('slope_median_deg', '%5.1f', 'slp50'),
        ('slope_gt60', '%5.3f', '>60'), ('sand_share', '%5.2f', 'sand'), ('land_frac', '%5.2f', 'land'), ('land_lt10', '%5.2f', '<10m'),
        ('nn_gap_median', '%5.0f', 'gap_m'), ('coves', '%3d', 'cov'), ('landing', '%4d', 'land'), ('shelf_frac', '%5.2f', 'shelf'),
        ('n_stacks', '%3d', 'stk'), ('time', '%5.2f', 's')]


def print_table(prov, rows):
    print('\nProvince %s (%s)   n=%d worlds' % (prov, W.PROV[prov]['name'], len(rows)))
    print('seed  ' + ' '.join('%*s' % (len(c[1] % 0) if True else 5, c[2]) for c in COLS))
    for r in rows:
        print('%-5d ' % r['seed'] + ' '.join((c[1] % r[c[0]]) if r[c[0]] == r[c[0]] else '  nan' for c in COLS))
    mean = {c[0]: np.nanmean([r[c[0]] for r in rows]) for c in COLS}
    print('mean  ' + ' '.join((c[1] % mean[c[0]]) for c in COLS))
    return mean


def summarise(all_rows):
    print('\n=== target comparison (share of worlds inside the band; status of the target) ===')
    head = '%-20s %-9s %s' % ('metric', 'band', ' '.join('%-9s' % ('prov ' + p) for p in all_rows))
    print(head + '   status')
    for key, (lo, hi, status, what) in TARGETS.items():
        cells = []
        for p, rows in all_rows.items():
            l, h_ = lo, hi
            if key == 'sand_share':
                l, h_ = PROV_SAND[p]
            if key == 'slope_median_deg':
                l, h_ = PROV_SLOPE[p]
            if key == 'land_lt10':
                l, h_ = PROV_LT10[p]
            vals = [r[key] for r in rows]
            ok = np.mean([(v == v) and l <= v <= h_ for v in vals])
            cells.append('%3.0f%% (%s)' % (100 * ok, ('%.2f' % np.nanmean(vals))[:5]))
        print('%-20s %-9s %s   %s' % (key, '%g-%g' % (lo, hi), ' '.join('%-9s' % c for c in cells), status))


if __name__ == '__main__':
    ns = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 257
    allr = {}
    for p in 'ABC':
        rows = province_table(p, ns, n)
        print_table(p, rows)
        allr[p] = rows
    summarise(allr)
