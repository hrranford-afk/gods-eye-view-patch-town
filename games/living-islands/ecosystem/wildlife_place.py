# wildlife_place: seals, seabirds, otters and kelp from the world's shared fields, as counts and sites per seed.
# Deterministic. Rules follow research/WILDLIFE.md (rule seal_haulout, rule seabird_colony, section 3 otters, section 7 kelp bands).
# Counted, never tracked: a haul-out is a number of seals on a rock, not a list of animals.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import eco_common as C

# ---- TUNING numbers (WILDLIFE.md section 12 says these are design choices, not measurements) -------
SEAL_M2_EACH = 4.0           # TUNING (WILDLIFE.md rule seal_haulout)
SEAL_CAP = 300               # TUNING cap per haul-out
HAUL_MIN_FLAT_M2 = 40.0      # TUNING: WILDLIFE.md section 11 says at least 20 m2; 40 m2 here so thin shore ramps do not count
HAUL_MAX_SITES = 12          # TUNING: WILDLIFE.md section 11 target 3 to 12 per group; the biggest 12 are kept, the rest are only counted
HAUL_DEEP_WITHIN_M = 100.0   # deep water (over 3 m) within 100 m
HAUL_TOP_MAX_M = 3.0         # a low rock or skerry top: not above 3 m over the sea
FLAT_SLOPE = 0.45            # TUNING: a flat top
SEAL_D_RADIUS_M = 150.0      # WILDLIFE.md: boat lane or building within 150 m
BIRD_D_BUILD_M, BIRD_D_BOAT_M = 200.0, 500.0     # WILDLIFE.md rule seabird_colony
LEDGE_MIN_HEIGHT_M = 6.0     # TUNING: the world window is small; real ledges are over 10 m (WILDLIFE.md section 11)
CLIFF_BAND_M = 12.0         # TUNING: cliff cells are counted within 12 m of the water, then turned into face length
LEDGE_USABLE = 0.5           # TUNING: share of a cliff face that is ledge
GUILLEMOT_PER_M, KITTIWAKE_PER_M = 8.0, 2.0      # WILDLIFE.md rule seabird_colony (TUNING)
GANNET_PER_M2, TERN_PER_M2, GULL_PER_M2, PUFFIN_PER_M2 = 1.5, 0.3, 0.1, 0.15   # TUNING (puffin value from WILDLIFE.md)
PUFFIN_USABLE = 0.25         # TUNING: share of turf that is burrowable
OTTER_KM_EACH = 1.1          # about 1 otter per 0.9 to 1.2 km of coast (WILDLIFE.md section 3, VERIFIED approximate)
OTTER_FRESH_M = 150.0        # TUNING: WILDLIFE.md section 11 says 300 m; halved because the world window is only 512 m across and any coast is near a lake otherwise
OTTER_MAX_E = 0.6            # TUNING: sheltered enough
KELP_NEAR_M = 150.0          # near-shore band for the kelp fraction
FRESH_WET = 0.5              # TUNING: wetness at or above this counts as a burn or flush
# the quiet-stakes dynamics (TUNING; WILDLIFE.md says seals drop to 20 percent after 2 seasons and return to 60 after 2 quiet,
# far too slow for a 200 day test, so the day rates below are faster and are a game choice)
LEAVE_KG_PER_M = 2.0         # TUNING: litter load (kg per metre of shore) that drives seals away if it lasts
STAY_KG_PER_M = 0.7          # TUNING: load must fall below this before they trust the shore again
FADE_PER_DAY = 0.04          # fidelity falls 0.04 a day under stress: gone (0.2) in 20 days
RETURN_PER_DAY = 0.0067      # +0.4 over 60 quiet days (to 0.6), then half that speed to full
FID_MIN, FID_BACK = 0.2, 0.6


def chamfer(mask):
    # distance in cells to the nearest True cell of mask (two passes, axis step 1, diagonal 1.414); large where none
    big = 1e6
    d = np.where(mask, 0.0, big)
    n, m = d.shape
    idx = np.arange(m, dtype=np.float64)

    def sweep(row):
        a = np.minimum.accumulate(row - idx) + idx
        b = (np.minimum.accumulate((row + idx)[::-1])[::-1]) - idx
        return np.minimum(row, np.minimum(a, b))
    for rng_ in (range(n), range(n - 1, -1, -1)):
        prev = None
        for i in rng_:
            r = d[i]
            if prev is not None:
                up = prev + 1.0
                dl = np.concatenate(([big], prev[:-1])) + 1.414
                dr = np.concatenate((prev[1:], [big])) + 1.414
                r = np.minimum(r, np.minimum(up, np.minimum(dl, dr)))
            r = sweep(r)
            d[i] = r
            prev = r
    return d


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    L2 = vx * vx + vy * vy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / L2))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def disturbance_sources(village, size_m):
    # the boat lane runs from the landing straight out to sea (the tender and settlers' boats), the houses sit inland
    if village is None:
        return None
    x, y = village['xy']
    ox, oy = village['out']
    return dict(lane=((x, y), (x + 420.0 * ox, y + 420.0 * oy)), landing=(x, y), houses=village['village_xy'])


def disturbance_at(px, py, src, r_lane, r_build):
    if src is None:
        return 0.0, 0.0, 0.0
    dl = seg_dist(px, py, src['lane'][0][0], src['lane'][0][1], src['lane'][1][0], src['lane'][1][1])
    dh = min(math.hypot(px - src['houses'][0], py - src['houses'][1]), math.hypot(px - src['landing'][0], py - src['landing'][1]))
    D = max(max(0.0, 1.0 - dl / r_lane), max(0.0, 1.0 - dh / r_build))
    return float(D), float(dl), float(dh)


def tide_exposed_fraction(top_m, amp=C.MID_TIDE_AMP):
    # share of the tide cycle a rock whose top is top_m over mean sea is dry (sinusoidal tide of half range amp)
    z = top_m / amp
    if z >= 1.0:
        return 1.0
    if z <= -1.0:
        return 0.0
    return 1.0 - math.acos(z) / math.pi


def seal_season(month, kind):
    # month 0 = January. common seals: pups June to July, moult August, peak August. grey: ashore Sep to Dec, some in Feb and Mar.
    if kind == 'common':
        return {5: 0.9, 6: 0.95, 7: 1.0}.get(month, 0.45)
    return {8: 0.9, 9: 1.0, 10: 1.0, 11: 0.9, 1: 0.6, 2: 0.6}.get(month, 0.4)


def bird_season(doy_month, species):
    cal = dict(guillemot=(2, 6), kittiwake=(1, 7), gannet=(4, 8), tern=(4, 7), gull=(3, 7), puffin=(3, 7))
    a, b = cal[species]
    return 1.0 if a <= doy_month <= b else 0.0


def place_wildlife(w, segs, village, seed):
    import world as W
    dx = w.dx
    sea = w.sea_level
    h = w.height.astype(np.float64)
    amp = w.tide_amp
    slope = np.clip(w.slope, 0, 3)
    lab = w.island_label.astype(np.int32)
    src = disturbance_sources(village, w.size_m)
    out = dict(seed=int(seed), province=w.province, has_landing=village is not None)

    # ---- seals: low rocks that dry at low tide, flat top, deep water near ---------------------------------
    deep = chamfer(h < sea - 3.0) * dx
    mask = (h > sea - amp) & (h <= sea + HAUL_TOP_MAX_M) & (slope < FLAT_SLOPE)
    cl, nc = W.label4(mask)
    sites = []
    for c in range(1, nc + 1):
        idx = np.flatnonzero(cl.ravel() == c)
        flat = len(idx) * dx * dx
        if flat < HAUL_MIN_FLAT_M2:
            continue
        rr, cc = np.divmod(idx, h.shape[1])
        dd = float(deep[rr, cc].min())
        if dd > HAUL_DEEP_WITHIN_M:
            continue
        x, y = float(w.X[rr, cc].mean()), float(w.Y[rr, cc].mean())
        top = float(h[rr, cc].mean() - sea)
        E = float(w.exposure[rr, cc].mean())
        kind = 'common' if E < 0.25 else 'grey'
        cap = int(min(SEAL_CAP, flat / SEAL_M2_EACH))
        D, dl, dh = disturbance_at(x, y, src, SEAL_D_RADIUS_M, SEAL_D_RADIUS_M)
        sites.append(dict(xy=(x, y), flat_m2=float(flat), top_m=top, kind=kind, exposure=E, capacity=cap,
                          exposed_fraction=tide_exposed_fraction(top, amp), D=D, lane_m=dl, houses_m=dh,
                          dist_landing_m=(math.hypot(x - village['xy'][0], y - village['xy'][1]) if village else None),
                          deep_m=dd))
    sites.sort(key=lambda s: (-s['capacity'], round(s['xy'][0], 2), round(s['xy'][1], 2)))
    out['n_haul_candidates'] = len(sites)
    sites = sites[:HAUL_MAX_SITES]
    for i, s in enumerate(sites):
        s['id'] = i
        s['usable'] = bool(s['D'] < 0.5)
    out['seal_sites'] = sites

    # ---- seabirds ----------------------------------------------------------------------------------------
    land = lab > 0
    water = ~land
    shore = land & (np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1))
    near_sea = (chamfer(water) * dx) <= CLIFF_BAND_M
    cliff = land & near_sea & (slope >= 0.9) & ((h - sea) >= LEDGE_MIN_HEIGHT_M)
    rr, cc = np.nonzero(cliff)
    ledge_m = float(len(rr) * dx * 0.785 * LEDGE_USABLE * dx / CLIFF_BAND_M)   # cells in a band CLIFF_BAND_M deep, back to a face length
    mx = my = None
    if len(rr):
        mx, my = float(w.X[rr, cc].mean()), float(w.Y[rr, cc].mean())
    D_cl, _, _ = disturbance_at(mx if mx is not None else 1e5, my if my is not None else 1e5, src, BIRD_D_BOAT_M, BIRD_D_BUILD_M)
    cliff_pairs = dict(guillemot=ledge_m * 0.5 * GUILLEMOT_PER_M, kittiwake=ledge_m * 0.3 * KITTIWAKE_PER_M)
    # skerry tops: separate small islands (not the largest two), flat top above the tide
    colonies = []
    for isl in w.islands:
        if isl['id'] <= 2 or isl['area_m2'] > 4000:
            continue
        m = (lab == isl['id']) & (slope < FLAT_SLOPE) & ((h - sea) >= 1.5)
        r2, c2 = np.nonzero(m)
        flat = len(r2) * dx * dx
        if flat < 30.0:
            continue
        x, y = float(w.X[r2, c2].mean()), float(w.Y[r2, c2].mean())
        top = float((h[r2, c2] - sea).mean())
        kind = 'gannet' if (flat >= 200 and top >= 4.0) else 'tern' if top < 3.5 else 'gull'
        dens = dict(gannet=GANNET_PER_M2, tern=TERN_PER_M2, gull=GULL_PER_M2)[kind]
        D, _, _ = disturbance_at(x, y, src, BIRD_D_BOAT_M if kind == 'tern' else SEAL_D_RADIUS_M * 2, BIRD_D_BUILD_M)
        colonies.append(dict(island=isl['id'], xy=(x, y), flat_m2=float(flat), top_m=top, kind=kind,
                             pairs_undisturbed=float(flat * dens), D=D))
    colonies.sort(key=lambda c: (-c['pairs_undisturbed'], c['island']))
    colonies = colonies[:12]
    veg = w.veg
    near_coast = chamfer(shore) * dx <= 60.0
    turf = np.isin(veg, (3, 5, 6, 7)) & near_coast & ((h - sea) >= 3.0) & (slope < 0.9) & land
    turf_m2 = float(turf.sum() * dx * dx)
    out['birds'] = dict(ledge_m=ledge_m, cliff_D=float(D_cl), cliff_pairs=cliff_pairs, colonies=colonies,
                        puffin_turf_m2=turf_m2, puffin_pairs_undisturbed=turf_m2 * PUFFIN_USABLE * PUFFIN_PER_M2)

    # ---- otters: rocky sheltered shore with fresh water within 300 m -----------------------------------
    fresh = land & ((w.lake_depth > 0.05) | (w.wetness >= FRESH_WET)) & (h - sea > 1.0)
    dfresh = chamfer(fresh) * dx
    ot_m = 0.0
    ot_total = 0.0
    for s in segs:
        if s['kind'] in ('sand', 'shingle'):
            continue
        ot_total += s['length_m']
        j = int(np.clip(round((s['xy'][0] + w.size_m / 2) / dx), 0, w.n - 1))
        i = int(np.clip(round((s['xy'][1] + w.size_m / 2) / dx), 0, w.n - 1))
        if dfresh[i, j] <= OTTER_FRESH_M and s['exposure'] <= OTTER_MAX_E:
            ot_m += s['length_m']
    out['otters'] = dict(shore_m=float(ot_m), rocky_shore_m=float(ot_total), territories=ot_m / 1000.0 / OTTER_KM_EACH,
                         holts=int(math.ceil(ot_m / 1100.0)) if ot_m >= 100.0 else 0,
                         otters=int(round(ot_m / 1000.0 / OTTER_KM_EACH)))

    # ---- kelp: hard bed by depth band ------------------------------------------------------------------
    dland = chamfer(land) * dx
    depth = sea - h
    wet = ~land
    names = [r['name'] for r in w.rocks]
    soft = np.isin(w.rock, [i for i, n in enumerate(names) if n in ('shell_sand', 'black_sand', 'cobble_shingle', 'mudstone', 'siltstone_soft')])
    hard = wet & ~soft
    near = wet & (dland <= KELP_NEAR_M)
    bands = {}
    cell_ha = dx * dx / 10000.0
    for name, a, b in (('dense_0_5m', 0.0, 5.0), ('thin_5_10m', 5.0, 10.0), ('park_10_20m', 10.0, 20.0)):
        m = hard & near & (depth >= a) & (depth < b)
        bands[name] = dict(cells=int(m.sum()), ha=float(m.sum() * cell_ha))
    kelp_mask = hard & near & (depth >= 0.0) & (depth < 15.0)
    klab, kn = W.label4(kelp_mask)
    beds = []
    for c in range(1, kn + 1):
        idx = np.flatnonzero(klab.ravel() == c)
        if len(idx) < 12:
            continue
        r3, c3 = np.divmod(idx, h.shape[1])
        beds.append(dict(xy=(float(w.X[r3, c3].mean()), float(w.Y[r3, c3].mean())), ha=float(len(idx) * cell_ha),
                         mean_depth_m=float(depth[r3, c3].mean())))
    beds.sort(key=lambda b: (-b['ha'], b['xy']))
    out['kelp'] = dict(bands=bands, near_shore_cells=int(near.sum()), kelp_cells=int(kelp_mask.sum()),
                       fraction_of_near=float(kelp_mask.sum() / max(1, near.sum())), beds=beds[:8], n_beds=len(beds))
    return out


def seal_count(site, month, fidelity=1.0, tide_low=True):
    # seals on the rock now: capacity, season, how much they trust the shore, how close the disturbance is, and the tide
    base = site['capacity'] * seal_season(month, site['kind']) * fidelity * (1.0 - 0.8 * site['D'])
    if not tide_low:
        base *= site['exposed_fraction']
    return int(round(base))


def seal_totals(wl, month, fidelity=1.0):
    return sum(seal_count(s, month, fidelity) for s in wl['seal_sites'])


def peak_seals(wl, with_disturbance=True):
    best = 0
    for m in range(12):
        t = 0
        for s in wl['seal_sites']:
            base = s['capacity'] * seal_season(m, s['kind'])
            t += base * ((1.0 - 0.8 * s['D']) if with_disturbance else 1.0)
        best = max(best, int(round(t)))
    return best


def bird_pairs(wl, month):
    b = wl['birds']
    tot = 0.0
    for sp, n in b['cliff_pairs'].items():
        tot += n * bird_season(month, sp) * (1.0 - 0.7 * b['cliff_D'])
    for c in b['colonies']:
        tot += c['pairs_undisturbed'] * bird_season(month, c['kind']) * (1.0 - 0.7 * c['D'])
    tot += b['puffin_pairs_undisturbed'] * bird_season(month, 'puffin')
    return int(round(tot))


class SealColony:
    # day-stepped dynamics. fidelity per site: 1 = trusts the shore, 0.2 = has left, 0.6 = back in smaller numbers.
    # stress when the litter load near the site stays over LEAVE_KG_PER_M; calm when it stays under STAY_KG_PER_M.
    def __init__(self, sites):
        self.sites = sites
        self.fid = [1.0] * len(sites)
        self.left_days = 0
        self.ever_left = [False] * len(sites)
        self.returned = [False] * len(sites)

    def step(self, loads):
        # loads: litter load in kg per metre near each site (list, same order)
        for i, L in enumerate(loads):
            f = self.fid[i]
            if L >= LEAVE_KG_PER_M:
                f = max(FID_MIN, f - FADE_PER_DAY)
            elif L <= STAY_KG_PER_M:
                f = min(1.0, f + (RETURN_PER_DAY if f < FID_BACK else RETURN_PER_DAY * 0.5))
            if f <= FID_MIN + 1e-9:
                self.ever_left[i] = True
            if self.ever_left[i] and f >= FID_BACK:
                self.returned[i] = True
            self.fid[i] = f
        self.left_days += sum(1 for f in self.fid if f < 0.5)

    def present(self, month):
        return sum(seal_count(s, month, self.fid[i]) for i, s in enumerate(self.sites))
