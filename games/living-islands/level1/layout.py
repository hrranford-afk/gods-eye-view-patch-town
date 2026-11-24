# level1/layout.py -- the Level 1 table: a small archipelago built deterministically from a layout seed, numpy only, no downloads.
#   python3 level1/layout.py [seed]      # builds the layout, prints the role table and the data hash
# WHAT IT DOES. The table is 416 m across (209 x 209 cells of 2 m, the same cell as the exported worlds). The home island is the first-day builder's
# island, landform/worlds/seed9001, pasted in unchanged (never edited). Every other island is CUT from a real landform world (landform/world.py
# make_world, n=257) taken from the foundry shortlist, one geology per role (A gneiss: seals; B sandstone: woods, hoard; C basalt: wreck reef,
# bare rock), turned by a seeded dihedral move, placed by a small solver (inside the table disc, gaps kept) and blended onto one sea floor with the
# falloff weights of level1/pool.py. Then, by designed rules (stand-ins where the sediment engine is not built, SEDIMENT_PHYSICS.md): sand-link bars
# (tombolo-type drying causeways, crest set from the tide model), a painted reef with drying heads round the wreck, a levelled depot pad, a woodland
# overlay on the woods island (the tool paints no trees), landmarks. After that the landform tool's own passes run on the WHOLE table: exposure for
# two wave directions, slope (d8), islands at low, mid and high tide, landing candidates, ecosystem/shore_catch shores and wildlife_place seals/birds.
# Page orientation: row 0 north, x east, z SOUTH (z = -world y), origin at the table centre, sea level 0, tide +-1.1 m.
import hashlib
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
for p in (HERE, os.path.join(ROOT, 'landform'), os.path.join(ROOT, 'ecosystem')):
    if p not in sys.path:
        sys.path.insert(0, p)
import pool as POOL   # noqa: E402
import world as W     # noqa: E402
import hydrology as HY  # noqa: E402

NX, DX = 209, 2.0
HALF = (NX - 1) * DX / 2                  # 208 m
TABLE_R = 196.0                           # the round table (page disc) radius, metres
LAND_R = 188.0                            # land must lie inside this (the rim sinks to deep water outside)
BASE_FLOOR = -9.0
WAVE_PREV_COMPASS, WAVE_STORM_COMPASS = 345.0, 240.0      # prevailing (as seed9001) and storm (west-south-west) directions the weather comes FROM
MIN_GAP_M = 24.0                          # open water between two islands' land
HOME_AT = (34.0, -26.0)                   # where the seed9001 window centre sits on the table
ROLES = ('home', 'woods', 'hoard', 'wreck', 'seals', 'rock')
TARGETS = {'woods': (36.0, 124.0), 'hoard': (-122.0, -6.0), 'wreck': (-72.0, 76.0), 'seals': (108.0, -124.0), 'rock': (146.0, 66.0)}
JITTER = {'woods': 14.0, 'hoard': 10.0, 'wreck': 14.0, 'seals': 12.0, 'rock': 12.0}
XS = -HALF + np.arange(NX) * DX
X, Z = np.meshgrid(XS, XS)                # row = z index (row 0 north), column = x index


def compass_to_math(c):
    return math.radians((90.0 - c) % 360.0)


def hash_arrays(*arrs):
    h = hashlib.sha256()
    for a in arrs:
        h.update(np.ascontiguousarray(a).tobytes())
    return h.hexdigest()[:16]


# ---------------------------------------------------------------- sources
def home_candidate():
    # the first-day builder's island, read as it is (landform/worlds/seed9001): 129 x 129 cells of 2 m, page orientation already
    d = os.path.join(ROOT, 'landform', 'worlds', 'seed9001')
    m = json.load(open(os.path.join(d, 'manifest.json')))
    b = open(os.path.join(d, 'world.bin'), 'rb').read()
    nx, A = m['nx'], m['arrays']
    n2 = nx * nx
    H = (np.frombuffer(b, '<i2', n2, A['height']['offset']).reshape(nx, nx) / float(m['height_scale'])).astype(np.float32)
    rd = lambda k: np.frombuffer(b, np.uint8, n2, A[k]['offset']).reshape(nx, nx).copy()
    K = H > 0.05
    d_ = POOL.dilate_dist(K, int(POOL.FADE_M / POOL.DX) + 1).astype(np.float32) * POOL.DX
    wgt = (1.0 - POOL.smooth((d_ - POOL.FULL_M) / (POOL.FADE_M - POOL.FULL_M))).astype(np.float32)
    return dict(prov='B', seed=9001, island=1, key='B9001.1', H=H, rock=rd('rock'), veg=rd('veg'), wet=rd('wetness'), wgt=wgt, K=K,
                centroid=(128.0, 128.0), gift=m['gift'], manifest=m, area_m2=float(m['start_area_m2']), max_h=float(m['start_max_height_m']))


def catchment(p):
    # the biggest contributing area on the island's land at 2 m cells (hydrology.py priority flood), cached in the candidate: a burn needs about 900 m2 of hill behind it
    if 'catch_m2' not in p:
        R = HY.analyse(p['H'].astype(np.float64), DX, 0.0, 1500.0, 0.7, 250.0)
        m = p['K'] & (p['H'] > 0)
        p['catch_m2'] = float(R['area'][m].max()) if m.any() else 0.0
    return p['catch_m2']


def eligible(P, role):
    f = {
        'woods': lambda p: p['prov'] == 'B' and 9500 <= p['area_m2'] <= 18000 and 7 <= p['max_h'] <= 26 and p['extent_m'] <= 215 and catchment(p) >= 850.0,
        'hoard': lambda p: p['prov'] == 'B' and 1800 <= p['area_m2'] <= 9000 and p['max_h'] <= 11 and p['flat_dry_m2'] >= 300 and p['extent_m'] <= 170,
        'seals': lambda p: p['prov'] == 'A' and 1500 <= p['area_m2'] <= 9000 and p['max_h'] >= 8 and p['extent_m'] <= 120,
        'wreck': lambda p: p['prov'] == 'C' and 150 <= p['area_m2'] <= 2500 and p['extent_m'] <= 90,
        'rock': lambda p: p['prov'] == 'C' and 250 <= p['area_m2'] <= 1600 and p['max_h'] >= 4 and p['extent_m'] <= 70,
    }[role]
    return sorted([p for p in P if f(p)], key=lambda p: p['key'])


def orient(c, k, flip):
    # dihedral move of a candidate: k quarter turns, optional mirror (the 8 looks of gift/parcels.py)
    o = dict(c)
    for key in ('H', 'rock', 'veg', 'wet', 'wgt', 'K'):
        a = np.rot90(c[key], k)
        o[key] = np.ascontiguousarray(a[:, ::-1] if flip else a)
    kr, kc = np.nonzero(o['K'])
    o['centroid'] = ((kc.mean() + 0.5) * DX, (kr.mean() + 0.5) * DX)
    return o


def cell_off(c, tx, tz):
    # integer cell offset (row0, col0) that puts the candidate's kept-land centroid at table metres (tx, tz)
    cx, cz = c['centroid']
    return int(round((tz - cz + HALF) / DX)), int(round((tx - cx + HALF) / DX))


def land_cells(c, off):
    r0, c0 = off
    kr, kc = np.nonzero(c['K'] & (c['H'] > 0))
    return kr + r0, kc + c0


def rim_ok(c, off, margin=0.0):
    rr, cc = land_cells(c, off)
    if len(rr) == 0 or rr.min() < 0 or cc.min() < 0 or rr.max() >= NX or cc.max() >= NX:
        return False
    d = np.hypot(XS[cc], XS[rr])
    return bool(d.max() <= LAND_R - margin)


def min_gap(pts_a, pts_b):
    # smallest distance in metres between two sets of (row, col) cells, on subsampled shoreline points
    a = pts_a[::max(1, len(pts_a) // 220)]
    b = pts_b[::max(1, len(pts_b) // 220)]
    dd = np.hypot(a[:, None, 0] - b[None, :, 0], a[:, None, 1] - b[None, :, 1])
    return float(dd.min() * DX)


def shore_pts(c, off):
    rr, cc = land_cells(c, off)
    m = np.zeros((NX + 4, NX + 4), bool)
    m[np.clip(rr, 0, NX - 1) + 2, np.clip(cc, 0, NX - 1) + 2] = True
    e = m.copy()
    e[1:-1, 1:-1] &= ~(m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:])
    r, c_ = np.nonzero(e)
    return np.stack([r - 2, c_ - 2], 1)


def solve_placement(seed, P):
    # pick a source per role, orient it, place it. Returns the placements (in role order) and a log of what the solver had to do.
    rng = np.random.default_rng([int(seed), 4401])
    placed = []
    log = []
    hc = home_candidate()
    off = cell_off(hc, *HOME_AT)
    placed.append(dict(role='home', cand=hc, off=off, t=HOME_AT, k=0, flip=False, shore=shore_pts(hc, off)))
    for role in ROLES[1:]:
        pool = eligible(P, role)
        if not pool:
            raise RuntimeError('no candidate for ' + role)
        # every (candidate, quarter turn, mirror) in a seeded order; the first that fits is taken (never more than 48 tried)
        combos = [(i, k, f) for i in range(len(pool)) for k in range(4) for f in (False, True)]
        order = rng.permutation(len(combos))[:48]
        tx0, tz0 = TARGETS[role]
        j = JITTER[role]
        jx, jz = rng.uniform(-j, j), rng.uniform(-j, j)
        cand_t = [(tx0 + jx, tz0 + jz)]
        for s_ in (0.08, 0.16, 0.25, 0.35):                      # pull toward the table centre
            cand_t.append(((tx0 + jx) * (1 - s_), (tz0 + jz) * (1 - s_)))
        for rad in (10, 20, 30, 42, 56, 70, 86, 104):
            for a in range(0, 360, 45):
                cand_t.append((tx0 + jx + rad * math.cos(math.radians(a)), tz0 + jz + rad * math.sin(math.radians(a))))
        found = None
        for attempt, oi in enumerate(order):
            ci, k, flip = combos[int(oi)]
            c = orient(pool[ci], k, flip)
            for ti, (tx, tz) in enumerate(cand_t):
                off = cell_off(c, tx, tz)
                if not rim_ok(c, off, 24.0 if role == 'wreck' else 0.0):
                    continue
                sh = shore_pts(c, off)
                if all(min_gap(sh, q['shore']) >= MIN_GAP_M for q in placed if len(q['shore'])):
                    if role == 'hoard' and min_gap(sh, placed[0]['shore']) > 70:
                        continue                                      # the hoard must be a bar's length from home land, not a boat trip
                    found = (c, off, (tx, tz), k, flip, attempt, ti, sh)
                    break
            if found:
                break
        if found is None:
            c = orient(pool[0], 0, False)
            log.append('%s: NO SPOT after %d draws (placed at its wish, may overlap)' % (role, len(order)))
            found = (c, cell_off(c, tx0, tz0), (tx0, tz0), 0, False, len(order), -1, np.zeros((0, 2), int))
        c, off, t_, k, flip, attempt, ti, sh = found
        log.append('%s: %s %s k=%d flip=%d draw %d spot %d' % (role, c['key'], c['prov'], k, flip, attempt, ti))
        placed.append(dict(role=role, cand=c, off=off, t=t_, k=k, flip=flip, tries=attempt, shore=sh))
    return placed, log


# ---------------------------------------------------------------- composing
def smooth_noise(rng, n, scale_cells):
    g = int(n / scale_cells) + 3
    a = rng.random((g, g))
    # bicubic-ish: repeated separable box blur on an upsampled grid
    up = np.kron(a, np.ones((int(scale_cells), int(scale_cells))))[:n + 8, :n + 8]
    for _ in range(3):
        up = (up + np.roll(up, 1, 0) + np.roll(up, -1, 0)) / 3.0
        up = (up + np.roll(up, 1, 1) + np.roll(up, -1, 1)) / 3.0
    return up[4:4 + n, 4:4 + n] - 0.5


def compose(placed, seed):
    rng = np.random.default_rng([int(seed), 4402])
    S = np.zeros((NX, NX))
    HS = np.zeros((NX, NX))
    best = np.zeros((NX, NX))
    rock = np.full((NX, NX), 12, np.uint8)       # shell sand under the water, as seed9001 does
    veg = np.zeros((NX, NX), np.uint8)
    wet = np.zeros((NX, NX), np.uint8)
    owner = np.full((NX, NX), -1, np.int8)       # role index of the land (kept cells above the sea)
    dmin = np.full((NX, NX), 99.0)               # distance to the nearest kept land of any island, and that island's own bed there (the core is kept exactly)
    Hcore = np.zeros((NX, NX))
    for ri, p in enumerate(placed):
        c = p['cand']
        r0, c0 = p['off']
        h, w = c['H'].shape
        ra, rb, ca, cb = max(0, r0), min(NX, r0 + h), max(0, c0), min(NX, c0 + w)
        if ra >= rb or ca >= cb:
            continue
        sa = (slice(ra - r0, rb - r0), slice(ca - c0, cb - c0))
        sl = (slice(ra, rb), slice(ca, cb))
        wg = c['wgt'][sa]
        S[sl] += wg
        HS[sl] += wg * c['H'][sa]
        upd = wg > best[sl]
        for arr, key in ((rock, 'rock'), (veg, 'veg'), (wet, 'wet')):
            v = arr[sl]
            v[upd] = c[key][sa][upd]
        best[sl] = np.maximum(best[sl], wg)
        kl = c['K'][sa] & (c['H'][sa] > 0)
        o = owner[sl]
        o[kl] = ri
        dd = POOL.dilate_dist(c['K'][sa] & (c['H'][sa] > 0), 7).astype(np.float64) * DX
        better = dd < dmin[sl]
        dm = dmin[sl]
        hc_ = Hcore[sl]
        dm[better] = dd[better]
        hc_[better] = c['H'][sa][better]
    F = BASE_FLOOR + 2.2 * smooth_noise(rng, NX, 12)
    Hc = np.where(S < 1.0, HS + (1.0 - S) * F, HS / np.maximum(S, 1e-9)).astype(np.float64)
    f = 1.0 - POOL.smooth((dmin - 6.0) / 6.0)          # 1 within 6 m of land: the source's own ground, exactly; 0 beyond 12 m
    Hc = Hc * (1.0 - f) + Hcore * f
    orphan = (Hc > 0) & (owner < 0)                # land that the blend tails of a neighbour's window left behind: lowered to a shoal
    Hc[orphan] = -0.8
    veg[Hc <= 0] = 0
    return Hc, rock, veg, wet, owner


def pick_hoard_crest(rng):
    # the crest of the Hoard bar is set from the tide model, not by taste: the robots need the wet stretch dry (WADE 0.10 m) for about 50 game minutes; choose the crest for which the
    # first such window falls on day 3 to 8 of the game (day 1 is near neap tides) and about 55 percent of the days from day 9 to 40 have one. Same for every layout seed, plus a
    # small seeded wobble (+- 0.025 m).
    import tide as TD
    h0 = TD.GIFT_START_HOURS - 5.0
    best = None
    for c in np.arange(-0.90, -0.30, 0.025):
        ws = [w for w in TD.windows(c + 0.10, h0, h0 + 40 * 24.0) if (w[1] - w[0]) * 60 >= 50]
        days = sorted({int((w[0] - h0) // 24) + 1 for w in ws})
        if not days:
            continue
        frac = len([d for d in days if d >= 9]) / 32.0
        pen = abs(frac - 0.55) + (0 if 3 <= days[0] <= 8 else 1.0)
        if best is None or pen < best[0]:
            best = (pen, float(c), days[0], frac)
    return best[1] + float(rng.uniform(-0.025, 0.025)), best


# ---------------------------------------------------------------- designed pieces (stand-ins for the sediment engine, said so in the brief)
def line_cells(a, b):
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    return [(a[0] + (b[0] - a[0]) * t / max(1, n - 1), a[1] + (b[1] - a[1]) * t / max(1, n - 1)) for t in range(n)]


def carve_bar(H, pa, pb, crest_mid, crest_end, width_m, rng, wander_m=5.0):
    # a drying sand bar between two shore points (row, col): crest dips to crest_mid in the middle (the last place to dry), rises to crest_end at both
    # foots; sides fall at 0.17 m per metre. Only raises the bed. Returns the path (list of (row, col) floats) and the crest profile.
    L = math.hypot(pb[0] - pa[0], pb[1] - pa[1]) * DX
    ph = rng.uniform(0, 6.28)
    amp = min(wander_m, 0.12 * L) / DX
    path = []
    npt = max(8, int(L / DX) * 2)
    nrm = np.array([-(pb[1] - pa[1]), (pb[0] - pa[0])], float)
    nrm /= np.linalg.norm(nrm) + 1e-9
    for i in range(npt + 1):
        t = i / npt
        off = amp * math.sin(math.pi * t) * math.sin(2 * math.pi * t * 1.0 + ph)
        path.append((pa[0] + (pb[0] - pa[0]) * t + nrm[0] * off, pa[1] + (pb[1] - pa[1]) * t + nrm[1] * off))
    path = np.array(path)
    seg = np.diff(path, axis=0)
    cum = np.concatenate([[0], np.cumsum(np.hypot(seg[:, 0], seg[:, 1]))])
    tot = cum[-1]
    rr, cc = np.mgrid[0:NX, 0:NX]
    hw = width_m / 2.0
    prof = []
    out = H.copy()
    # distance from every cell to the path (vectorised over path points, small)
    best_d = np.full((NX, NX), 1e9)
    best_t = np.zeros((NX, NX))
    for i, (pr, pc) in enumerate(path):
        d = np.hypot(rr - pr, cc - pc) * DX
        m = d < best_d
        best_d[m] = d[m]
        best_t[m] = cum[i] / tot
    near = best_d < hw + 9.0
    t = best_t
    crest = crest_mid + (crest_end - crest_mid) * (np.abs(2 * t - 1) ** 2)
    z = crest - 0.17 * np.maximum(best_d - hw, 0.0)
    out = np.where(near, np.maximum(H, z), H)
    return out, path, [float(crest_mid + (crest_end - crest_mid) * abs(2 * (i / 20) - 1) ** 2) for i in range(21)]


def nearest_pair(A, B):
    a = A[::max(1, len(A) // 400)]
    b = B[::max(1, len(B) // 400)]
    dd = (a[:, None, 0] - b[None, :, 0]) ** 2 + (a[:, None, 1] - b[None, :, 1]) ** 2
    i, j = np.unravel_index(np.argmin(dd), dd.shape)
    return tuple(a[i]), tuple(b[j]), float(math.sqrt(dd[i, j]) * DX)


def paint_reef(H, centre_rc, rng, a_m=34.0, b_m=14.0):
    # the wreck reef: a hard-rock ridge (basalt dykes read as a line) at -0.2 to -1.0 with drying heads; painted, not simulated
    rr, cc = np.mgrid[0:NX, 0:NX]
    th = rng.uniform(0, math.pi)
    dy, dx_ = (rr - centre_rc[0]) * DX, (cc - centre_rc[1]) * DX
    u = dx_ * math.cos(th) + dy * math.sin(th)
    v = -dx_ * math.sin(th) + dy * math.cos(th)
    r = np.sqrt((u / a_m) ** 2 + (v / b_m) ** 2)
    n = smooth_noise(rng, NX, 5)
    ridge = -0.25 - 0.9 * np.clip(r, 0, 1.6) ** 2 + 0.55 * n
    ridge = np.where(r < 1.5, ridge, -99)
    heads = []
    for k in range(4):
        hu = (k - 1.5) * 0.45 * a_m + rng.uniform(-3, 3)
        hr = (centre_rc[0] * DX + hu * math.sin(th) + rng.uniform(-2, 2), centre_rc[1] * DX + hu * math.cos(th) + rng.uniform(-2, 2))
        heads.append((hr[0] / DX, hr[1] / DX))
        g = np.exp(-(((rr * DX - hr[0]) ** 2 + (cc * DX - hr[1]) ** 2) / (2 * 3.2 ** 2)))
        ridge = np.where(g > 0.01, np.maximum(ridge, -0.9 + (0.45 + 0.35 * rng.random() + 0.9) * g), ridge)
    out = np.maximum(H, np.where(ridge > -90, ridge, -99))
    return out, heads, th


def paint_haulouts(H, rock, veg, owner, ri, away_from_xz, rng, n=3):
    # seal ledges: the tool's gneiss islands are steep, with no low flat rock, so the haul-outs of the seal island are painted shelves 8 to 12 m long, top +0.9 m, in deep water,
    # spread round the island and on the shores that face away from the home landing (wildlife_place.py counts a shelf of >= 40 m2, top under 3 m, flat, deep water near).
    land = (owner == ri) & (H > 0)
    water = ~(H > 0)
    sh = land & (np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1))
    pts = np.argwhere(sh)
    if len(pts) == 0:
        return H, []
    cen = np.argwhere(land).mean(0)
    others = np.argwhere((owner >= 0) & (owner != ri) & (H > 0))
    if len(others):
        oo = others[::max(1, len(others) // 1500)]
        dd_ = np.hypot(pts[:, None, 0] - oo[None, :, 0], pts[:, None, 1] - oo[None, :, 1]).min(axis=1) * DX
        keep = dd_ >= MIN_GAP_M + 14.0
        if keep.sum() >= 3:
            pts = pts[keep]
    inner = np.hypot(XS[pts[:, 1]], XS[pts[:, 0]]) <= LAND_R - 16.0
    if inner.sum() >= 3:
        pts = pts[inner]
    xs, zs = XS[pts[:, 1]], XS[pts[:, 0]]
    d_home = np.hypot(xs - away_from_xz[0], zs - away_from_xz[1])
    chosen = []
    cand = np.arange(len(pts))
    first = int(np.argmax(d_home))
    chosen.append(first)
    while len(chosen) < n:
        dd = np.min([np.hypot(xs - xs[c], zs - zs[c]) for c in chosen], axis=0)
        score = dd + 0.15 * d_home
        score[np.hypot(xs, zs) > LAND_R - 8] = -1
        chosen.append(int(np.argmax(score)))
    rr, cc = np.mgrid[0:NX, 0:NX]
    out = H.copy()
    made = []
    for k, c in enumerate(chosen):
        r, c_ = pts[c]
        nrm = np.array([r - cen[0], c_ - cen[1]], float)
        nrm /= np.linalg.norm(nrm) + 1e-9
        ctr = np.array([r, c_]) + nrm * (3.5 / DX)
        a_m, b_m = 7.0 + 1.5 * rng.random(), 5.0 + 1.0 * rng.random()
        t = np.array([-nrm[1], nrm[0]])
        dy, dx_ = (rr - ctr[0]) * DX, (cc - ctr[1]) * DX
        u = dx_ * t[1] + dy * t[0]
        v = dx_ * nrm[1] + dy * nrm[0]
        rad = np.sqrt((u / a_m) ** 2 + (v / b_m) ** 2)
        top = 0.9
        shelf = np.where(rad < 1.0, top, np.where(rad < 2.0, top - (rad - 1.0) * 1.9, -9.0))
        out = np.maximum(out, shelf)
        made.append((float(XS[int(round(ctr[1]))]), float(XS[int(round(ctr[0]))])))
    newland = (out > 0) & (H <= 0)
    owner[newland] = ri
    veg[newland] = 1
    rock[newland] = 4
    return out, made


def carve_path(H, p_from, p_to, half_w=1.8, smax=0.30):
    # a gentle foot path for the robots between two points (row, col): the height follows the ground along the line but never rises or falls more than smax per metre (forward and
    # backward pass), starts at the bar's foot height 0.35 m and ends at the pad height; blended into the ground over 2.5 m. Returns the new field and the cut and fill in m3.
    a, b = np.array(p_from, float), np.array(p_to, float)
    n = max(4, int(np.hypot(*(b - a)) * 1.5))
    ts = np.linspace(0, 1, n)
    pts = a[None, :] + (b - a)[None, :] * ts[:, None]
    z = np.array([H[int(np.clip(round(p[0]), 0, NX - 1)), int(np.clip(round(p[1]), 0, NX - 1))] for p in pts], float)
    ds = float(np.hypot(*(b - a))) * DX / (n - 1)
    z[0] = 0.35
    z[-1] = float(H[int(round(b[0])), int(round(b[1]))])
    for i in range(1, n):
        z[i] = np.clip(z[i], z[i - 1] - smax * ds, z[i - 1] + smax * ds)
    for i in range(n - 2, -1, -1):
        z[i] = np.clip(z[i], z[i + 1] - smax * ds, z[i + 1] + smax * ds)
    rr, cc = np.mgrid[0:NX, 0:NX]
    v = b - a
    L2 = float(v @ v) + 1e-9
    t = np.clip(((rr - a[0]) * v[0] + (cc - a[1]) * v[1]) / L2, 0, 1)
    d = np.hypot(rr - (a[0] + v[0] * t), cc - (a[1] + v[1] * t)) * DX
    f = 1.0 - POOL.smooth((d - half_w) / 2.5)
    prof = np.interp(t, ts, z)
    out = np.where(f > 0, H * (1 - f) + prof * f, H)
    return out, float(np.sum(np.abs(out - H)) * DX * DX)


def level_pad(H, rc, radius_m, min_h=1.7):
    # a levelled terrace (the one place the field is edited, as the builder does for the camp): median height of the disc, at least min_h
    rr, cc = np.mgrid[0:NX, 0:NX]
    d = np.hypot(rr - rc[0], cc - rc[1]) * DX
    m = d <= radius_m
    z = max(min_h, float(np.median(H[m])))
    f = 1.0 - POOL.smooth((d - radius_m) / 5.0)
    out = H * (1 - f) + z * f
    vol = float(np.sum(np.abs(out - H)) * DX * DX)
    return out, z, vol


def find_flat_patch(H, mask, slope, rad_cells=5, hmin=1.7, hmax=9.0, near_rc=None):
    ok = mask & (H >= hmin) & (H <= hmax) & (slope < 0.22)
    k = np.ones((2 * rad_cells + 1, 2 * rad_cells + 1))
    # box count by cumulative sums
    c = np.cumsum(np.cumsum(np.pad(ok.astype(np.int32), rad_cells), 0), 1)
    n = ok.shape[0]
    s = 2 * rad_cells + 1
    box = c[s - 1:s - 1 + n, s - 1:s - 1 + n]
    box = box - np.pad(c, ((1, 0), (1, 0)))[:n, s - 1:s - 1 + n] if False else None
    # simple and clear: loop over candidate cells (few)
    best, bv = None, -1e9
    rr, cc = np.nonzero(ok)
    for i in range(0, len(rr), 2):
        r, c_ = rr[i], cc[i]
        sub = ok[max(0, r - rad_cells):r + rad_cells + 1, max(0, c_ - rad_cells):c_ + rad_cells + 1]
        v = float(sub.sum())
        if near_rc is not None:
            v -= 0.6 * math.hypot(r - near_rc[0], c_ - near_rc[1])      # the patch near the causeway end wins unless a much flatter one lies further
        if v > bv:
            best, bv = (int(r), int(c_)), v
    return best, int(max(bv, 0))


def slope_of(H):
    gy, gx = np.gradient(H.astype(np.float64), DX)
    return np.hypot(gx, gy)


def woodland_overlay(veg, rock, H, slope, expo, mask, rng):
    # the landform tool paints no trees (veg 14 and 15 are never assigned): woodland on sheltered, soil-bearing ground of the woods island. A designed rule, said so.
    n = smooth_noise(rng, NX, 8) + 0.5
    soil = (~np.isin(rock, [12, 13, 4]) | True)
    ok = mask & (H > 0.9) & (H < 21) & (slope < 1.3) & (expo < 0.95) & ~np.isin(veg, [9, 10, 1, 18, 12])
    wood = ok & (n > 0.38)
    pine = wood & (expo > 0.50) & (n > 0.58)
    v = veg.copy()
    v[wood] = 14
    v[pine] = 15
    return v, wood


# ---------------------------------------------------------------- the table as a landform World (so the tool's own passes run on it)
def make_table_world(H, rock, veg, wet, seed):
    w = W.World()
    flip = lambda a: np.ascontiguousarray(np.flipud(a))
    w.seed, w.province, w.province_name = int(seed), 'M', 'mixed provinces (level1)'
    w.n, w.dx, w.size_m = NX, DX, (NX - 1) * DX
    w.sea_level, w.tide_amp = 0.0, W.TIDE_AMP
    w.X, w.Y = np.meshgrid(XS, XS)                    # tool orientation: row 0 south; X east
    w.Y = flip(-np.meshgrid(XS, XS)[1])               # y north = -z
    w.height = flip(H).astype(np.float32)
    w.rock, w.veg = flip(rock), flip(veg)
    w.wetness = (flip(wet).astype(np.float32) / 255.0)
    w.lake_depth = np.zeros_like(w.height)
    w.rocks, w.veg_legend = W.ROCKS, W.VEG_LEGEND
    w.params, w.structure, w.features, w.timings = {}, {}, [], {}
    h64 = w.height.astype(np.float64)
    rec, slp = W.d8(h64)
    w.slope = slp
    w.exposure_prev = W.exposure(h64 > 0, DX, compass_to_math(WAVE_PREV_COMPASS), 0.4 * w.size_m).astype(np.float32)
    w.exposure_storm = W.exposure(h64 > 0, DX, compass_to_math(WAVE_STORM_COMPASS), 0.4 * w.size_m).astype(np.float32)
    w.exposure = w.exposure_prev
    w.wind_exposure = w.exposure
    lab, n = W._islands_at(h64, 0.0, DX)
    lab_low, nl = W._islands_at(h64, -W.TIDE_AMP, DX)
    lab_high, nh = W._islands_at(h64, W.TIDE_AMP, DX)
    w.island_label = lab.astype(np.int16)
    w.islands = W._stats(w, lab, n, lab_low, lab_high, nl, nh, w.exposure)
    cands = W.landing_candidates(w, lab, w.exposure)
    for c in cands:
        w.islands[c['island'] - 1]['landing_candidates'].append(c)
    w.landing_candidates = cands
    return w


# ---------------------------------------------------------------- the build
def build_layout(seed, P=None):
    seed = int(seed)
    P = P if P is not None else POOL.load_pool()
    rng = np.random.default_rng([seed, 4403])
    placed, log = solve_placement(seed, P)
    H, rock, veg, wet, owner = compose(placed, seed)
    N = {'log': log}
    rc_of = lambda x, z: ((z + HALF) / DX, (x + HALF) / DX)
    xz_of = lambda r, c: (float(XS[int(round(c))]), float(XS[int(round(r))]))
    home_gift = placed[0]['cand']['gift']
    hx, hz = HOME_AT
    spots = dict(stump=(hx + home_gift['stump'][0], hz + home_gift['stump'][1]), hut=(hx + home_gift['hut'][0], hz + home_gift['hut'][1]),
                 beach=(hx + placed[0]['cand']['manifest']['landing']['xy'][0], hz + placed[0]['cand']['manifest']['landing']['xy'][1]),
                 skerry_w=(hx + home_gift['skerries'][0][0], hz + home_gift['skerries'][0][1]), skerry_e=(hx + home_gift['skerries'][1][0], hz + home_gift['skerries'][1][1]))
    # --- bars (designed sand links)
    def land_of(ri):
        r, c = np.nonzero(owner == ri)
        return np.stack([r, c], 1)
    home_land = land_of(0)
    sk = np.array(rc_of(*spots['skerry_w']))
    skerry_pts = home_land[np.hypot(home_land[:, 0] - sk[0], home_land[:, 1] - sk[1]) * DX < 11.0]
    hoard_land = land_of(ROLES.index('hoard'))
    bars = []
    if len(skerry_pts) and len(hoard_land):
        a, b, L = nearest_pair(skerry_pts, hoard_land)
        crest, crest_info = pick_hoard_crest(rng)
        N['crest'] = crest_info
        H, path, prof = carve_bar(H, a, b, crest, 0.35, 6.0, rng)
        bars.append(dict(name='hoard bar', a=xz_of(*a), b=xz_of(*b), length_m=L, crest_mid=crest, path=[xz_of(*p) for p in path[::4]]))
        # the lobe-to-skerry link: already shallow in seed9001; a short bar makes it a sure thing at most low tides
        lobe = np.array(rc_of(hx - 63.0, hz + 12.0))
        lobe_pts = home_land[np.hypot(home_land[:, 0] - lobe[0], home_land[:, 1] - lobe[1]) * DX < 9.0]
        if len(lobe_pts):
            a2, b2, L2 = nearest_pair(lobe_pts, skerry_pts)
            H, path2, _ = carve_bar(H, a2, b2, -0.10, 0.3, 6.0, rng, 2.0)
            bars.append(dict(name='skerry link', a=xz_of(*a2), b=xz_of(*b2), length_m=L2, crest_mid=-0.10, path=[xz_of(*p) for p in path2[::4]]))
    # the woods sill: a spring-low-only sill from the home shore across the lee sound to the woods
    wl = land_of(ROLES.index('woods'))
    if len(wl) and len(home_land):
        hl = home_land[(home_land[:, 0] * DX - HALF) > hz + 10]          # home land south of its middle
        if len(hl):
            a, b, L = nearest_pair(hl, wl)
            crest = float(-0.97 + 0.03 * rng.uniform(-1, 1))
            H, path, _ = carve_bar(H, a, b, crest, -0.2, 6.0, rng, 3.0)
            bars.append(dict(name='woods sill', a=xz_of(*a), b=xz_of(*b), length_m=L, crest_mid=crest, path=[xz_of(*p) for p in path[::4]]))
    # --- wreck reef (painted over the basalt islet of the wreck role)
    wr = land_of(ROLES.index('wreck'))
    reef = None
    if len(wr):
        c0 = wr.mean(0)
        H, heads, th = paint_reef(H, c0, rng)
        reef = dict(centre=xz_of(*c0), heads=[xz_of(*h) for h in heads], angle=float(th))
    # --- depot pad on the hoard island
    slope0 = slope_of(H)
    depot = None
    if len(hoard_land):
        m = owner == ROLES.index('hoard')
        hb0 = [b for b in bars if b['name'] == 'hoard bar']
        patch, cnt = find_flat_patch(H, m, slope0, 4, 1.3, 7.0, rc_of(*hb0[0]['b']) if hb0 else None)
        if patch is None:
            hh = hoard_land[np.argmax(H[hoard_land[:, 0], hoard_land[:, 1]])]
            patch = (int(hh[0]), int(hh[1]))
        H, zpad, vol = level_pad(H, patch, 6.5, 1.7)
        ramp_vol = 0.0
        hb_ = [b for b in bars if b['name'] == 'hoard bar']
        if hb_:
            b_rc = np.array(rc_of(*hb_[0]['b']))
            a_bar = np.array(rc_of(*hb_[0]['a']))
            dirv = (a_bar - b_rc) / (np.linalg.norm(a_bar - b_rc) + 1e-9)
            start = b_rc + dirv * 3.0                 # 6 m back along the bar, where the crest is still near 0.35 m
            H, ramp_vol = carve_path(H, tuple(start), patch)
        depot = dict(xy=xz_of(*patch), pad_h=zpad, cut_fill_m3=vol + ramp_vol, ramp_m3=ramp_vol, flat_before_cells=cnt)
    # --- seal ledges
    ledges = []
    si = ROLES.index('seals')
    if (owner == si).any():
        H, ledges = paint_haulouts(H, rock, veg, owner, si, spots['beach'], rng)
    # --- woods overlay and a lone tree island landmark
    slope1 = slope_of(H)
    w0 = make_table_world(H, rock, veg, wet, seed)
    expo_page = np.flipud(w0.exposure_prev)
    wm = owner == ROLES.index('woods')
    veg2, wood = woodland_overlay(veg, rock, H, slope1, expo_page, wm, rng)
    # veg of the home island stays exactly the builder's
    veg = veg2
    w = make_table_world(H, rock, veg, wet, seed)
    L = dict(seed=seed, H=H.astype(np.float32), rock=rock, veg=veg, wet=wet, owner=owner, wood=wood, w=w, placed=placed, bars=bars, reef=reef, depot=depot, spots=spots, log=log, ledges=ledges,
             exposure=np.flipud(w.exposure_prev), exposure_storm=np.flipud(w.exposure_storm), slope=np.flipud(w.slope), label=np.flipud(w.island_label))
    # --- BOLD landmarks (data only; see level1/CHANGELOG.md B1 to B3): cairns along the causeway, ribs on the highest reef head, a lone tree on the bare rock
    lm = {'cairns': [], 'ribs': None, 'lone_tree': None}
    hb2 = [b for b in bars if b['name'] == 'hoard bar']
    if hb2:
        pth = hb2[0]['path']
        idx = np.linspace(0, len(pth) - 1, 5).astype(int)
        lm['cairns'] = [tuple(pth[i]) for i in idx]
    if reef:
        hh = [(H[int(round((z + HALF) / DX)), int(round((x + HALF) / DX))], (x, z)) for (x, z) in reef['heads']]
        lm['ribs'] = max(hh)[1]
    rk = np.argwhere((owner == ROLES.index('rock')) & (H > 0))
    if len(rk):
        top = rk[np.argmax([H[r, c] for r, c in rk])]
        lm['lone_tree'] = (float(XS[top[1]]), float(XS[top[0]]))
    L['landmarks'] = lm
    L['notes'] = N
    L['hash'] = hash_arrays(np.round(H * 256).astype(np.int16), rock, veg, wet)
    L['roles'] = {r: dict(key=placed[i]['cand']['key'], prov=placed[i]['cand']['prov'], k=placed[i]['k'], flip=placed[i]['flip'], at=placed[i]['t']) for i, r in enumerate(ROLES)}
    return L


def export_level(L, outdir):
    # the table in the page's export format (landform/export_world.py: world.bin arrays height int16 1/256 m, rock, veg, shore, exposure, wetness, bed; row 0 north) plus a manifest.
    # Written to a folder of its own (level1/out/), not into landform/worlds/: wiring it into the page is the build plan's job.
    import export_world as EW
    os.makedirs(outdir, exist_ok=True)
    w = L['w']
    shore = np.flipud(EW.shore_class(w)).astype(np.uint8)
    H16 = np.round(L['H'].astype(np.float64) * 256.0).astype(np.int16)
    expo = np.clip(L['exposure'] * 255.0, 0, 255).astype(np.uint8)
    bed = np.where(L['H'] > 0, 255, np.clip(np.round(60 + 40 * (L['rock'] != 12)), 0, 255)).astype(np.uint8)
    arrays = [('height', H16.astype('<i2')), ('rock', L['rock']), ('veg', L['veg']), ('shore', shore), ('exposure', expo), ('wetness', L['wet']), ('bed', bed)]
    blob, off, meta = b'', 0, {}
    for k, a in arrays:
        b = np.ascontiguousarray(a).tobytes()
        meta[k] = dict(offset=off, dtype=str(a.dtype), bytes=len(b))
        blob += b
        off += len(b)
    open(os.path.join(outdir, 'world.bin'), 'wb').write(blob)
    man = dict(version=1, seed=L['seed'], layout='level1', nx=NX, dx=DX, window_m=(NX - 1) * DX, table_radius_m=TABLE_R, sea_level=0.0, tide_amp=W.TIDE_AMP, height_scale=256.0,
               axes='page x east, z south (z = -world y); row 0 = north edge, column 0 = west edge', arrays=meta, bytes=len(blob), data_sha=hashlib.sha256(blob).hexdigest()[:16], hash=L['hash'],
               roles=L['roles'], spots={k: list(v) for k, v in L['spots'].items()}, depot=L['depot'], reef=L['reef'], ledges=[list(p) for p in L['ledges']],
               bars=[dict(name=b['name'], a=list(b['a']), b=list(b['b']), length_m=b['length_m'], crest_mid=b['crest_mid'], path=[list(p) for p in b['path']]) for b in L['bars']],
               landmarks={k: ([list(p) for p in v] if isinstance(v, list) else (list(v) if v else None)) for k, v in L['landmarks'].items()}, wave_prev_from_deg=WAVE_PREV_COMPASS, wave_storm_from_deg=WAVE_STORM_COMPASS,
               veg_legend=W.VEG_LEGEND, rocks=[r['name'] for r in W.ROCKS])
    json.dump(man, open(os.path.join(outdir, 'manifest.json'), 'w'), indent=1, sort_keys=True, default=float)
    return man


if __name__ == '__main__':
    import time
    s = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    t = time.time()
    L = build_layout(s)
    print('seed', s, 'hash', L['hash'], round(time.time() - t, 1), 's')
    for r, d in L['roles'].items():
        print(' ', r, d)
    print(L['log'])
    print([(b['name'], round(b['length_m']), round(b['crest_mid'], 2)) for b in L['bars']])
    print('islands', [(i['id'], int(i['area_m2'])) for i in L['w'].islands])
