# level1/validate.py -- the Level 1 validator. validate(L) runs every check on a built layout and returns a dict:
#   {'seed', 'hash', 'ok', 'fails': [names], 'checks': [{name, ok, value, limit, note}], 'metrics': {...}}
# Every number tagged TUNING is a design choice (see level1/LEVEL1_DESIGN.md); the tide is the page's own (level1/tide.py, tested against sky_clock.js).
# Uses: landform/world.py (islands, landings, slope, exposure), landform/hydrology.py (streams), ecosystem/shore_catch.py and wildlife_place.py (shores,
# seals, birds), globe/climate.py (freshwater lens), level1/drift_table.py (globe drift arrivals), level1/tide.py (tide windows).
import heapq
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
for p in (HERE, os.path.join(ROOT, 'landform'), os.path.join(ROOT, 'ecosystem'), os.path.join(ROOT, 'globe')):
    if p not in sys.path:
        sys.path.insert(0, p)
import layout as LY    # noqa: E402
import tide as TD      # noqa: E402
import drift_table as DT   # noqa: E402
import world as W      # noqa: E402
import hydrology as HY   # noqa: E402
import shore_catch as SC   # noqa: E402
import wildlife_place as WP  # noqa: E402
import climate as CL   # noqa: E402

NX, DX, HALF = LY.NX, LY.DX, LY.HALF
# ---- speeds and clock (TUNING; sources in LEVEL1_DESIGN.md section 5)
TENDER_MS = 2.0            # rowing tender: 2.5 knots (BOATS.md 2 to 4 kn) = 1.3 m/s, times the 1.5 game exaggeration the robots use (camp_start SPEED_K)
FAST_MS = 4.2              # a faster boat: 5.5 knots = 2.8 m/s, times 1.5
ROBOT_MS = 0.85            # camp_start.js: 0.75 to 0.9 page m/s
CLOCK_S_PER_HOUR = 100.0   # gift_day.js sets cspeed 0.2 on a clock whose speed 1 is 20 s per game hour (sky_clock.js HOUR_REAL_SECONDS)
BOAT_CLEAR = 0.45          # water under the keel needed: draft 0.15 plus 0.3 margin
WADE = 0.10                # robots wade 0.10 m (tracks and arm bases are above that)
ROBOT_SLOPE = 0.6          # the rise of one step (|dH| over the step length), not the tool's steepest-neighbour map
TIDE_LOW, TIDE_MID, TIDE_HIGH = -1.1, 0.0, 1.1
LIGHT_H = 9.0              # lamp height above the stump ground (a stump of 6 m plus the lamp room; LIGHTHOUSE_BUILD.md)
TRIPS = {   # (from, to): (min s, max s) at tender speed, mid tide
    ('home', 'woods'): (25, 110), ('home', 'seals'): (35, 135), ('home', 'wreck'): (15, 90), ('home', 'rock'): (45, 140), ('home', 'hoard'): (15, 130), ('woods', 'hoard'): (40, 170)}
TIERS = {'T0 desktop big': (250000, 120), 'T1 desktop': (150000, 80), 'T2 iPad high': (150000, 60), 'T3 iPad low': (90000, 40), 'T4 AR': (90000, 40), 'T5 phone small': (60000, 30)}
PIECES_PER_M = (2.0, 12.0)   # Great Wash pieces per metre of collectable strand, poor to rich shore (TUNING)


def xz_to_rc(x, z):
    return (z + HALF) / DX, (x + HALF) / DX


def rc_to_xz(r, c):
    return float(-HALF + c * DX), float(-HALF + r * DX)


class Ctx:
    pass


def role_labels(L):
    lab, own = L['label'], L['owner']
    out = {}
    for k, r in enumerate(LY.ROLES):
        m = own == k
        if m.any():
            v = lab[m]
            v = v[v > 0]
            if len(v):
                out[r] = int(np.bincount(v).argmax())
    return out


# ---------------------------------------------------------------- boats
def coarse_clear(H, tide):
    # 4 m cells: the shallowest 2 m cell of each block decides (conservative)
    n = (NX - 1) // 2
    Hb = H[:2 * n, :2 * n].reshape(n, 2, n, 2).max(axis=(1, 3))
    return Hb, (tide - Hb) >= BOAT_CLEAR


def boat_route(H, a_xz, b_xz, tide, avoid=None):
    # Dijkstra on 4 m cells, 16 directions, cost 1 + 0.6 near the shallows (boats keep off); returns (length_m, path) or (None, None)
    Hb, ok = coarse_clear(H, tide)
    n = Hb.shape[0]
    land = (Hb > tide - 0.2)
    near = np.zeros_like(land)
    for di in (-2, -1, 0, 1, 2):
        for dj in (-2, -1, 0, 1, 2):
            near |= np.roll(np.roll(land, di, 0), dj, 1)
    pen = np.where(near, 0.6, 0.0)
    cs = 2 * DX
    toi = lambda xz: (int(np.clip(round((xz[1] + HALF - DX / 2) / cs), 0, n - 1)), int(np.clip(round((xz[0] + HALF - DX / 2) / cs), 0, n - 1)))
    s, t = toi(a_xz), toi(b_xz)
    if not (ok[s] and ok[t]):
        # nudge endpoints to the nearest clear cell within 3 cells
        def nud(p):
            best = None
            for di in range(-3, 4):
                for dj in range(-3, 4):
                    q = (p[0] + di, p[1] + dj)
                    if 0 <= q[0] < n and 0 <= q[1] < n and ok[q] and (best is None or di * di + dj * dj < best[0]):
                        best = (di * di + dj * dj, q)
            return best[1] if best else None
        s, t = nud(s), nud(t)
        if s is None or t is None:
            return None, None
    moves = [(di, dj) for di in range(-2, 3) for dj in range(-2, 3) if (di or dj) and (abs(di) <= 1 or abs(dj) <= 1 or abs(di) == abs(dj) and False)]
    moves = [m for m in moves if max(abs(m[0]), abs(m[1])) <= 2 and not (abs(m[0]) == 2 and abs(m[1]) == 2)]
    dist = np.full((n, n), np.inf)
    prev = {}
    dist[s] = 0.0
    pq = [(0.0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if u == t:
            break
        for di, dj in moves:
            v = (u[0] + di, u[1] + dj)
            if not (0 <= v[0] < n and 0 <= v[1] < n) or not ok[v]:
                continue
            if abs(di) == 2 or abs(dj) == 2:                    # knight or straight-2: both intermediate cells must be clear
                mi, mj = u[0] + di // 2 if abs(di) == 2 else u[0] + (di > 0), u[1] + dj // 2 if abs(dj) == 2 else u[1] + (dj > 0)
                if abs(di) == 2 and abs(dj) == 1:
                    cells = [(u[0] + di // 2, u[1]), (u[0] + di // 2, v[1]), (u[0] + di // 2, u[1] + dj)]
                elif abs(dj) == 2 and abs(di) == 1:
                    cells = [(u[0], u[1] + dj // 2), (v[0], u[1] + dj // 2), (u[0] + di, u[1] + dj // 2)]
                else:
                    cells = [((u[0] + v[0]) // 2, (u[1] + v[1]) // 2)]
                if not all(0 <= c[0] < n and 0 <= c[1] < n and ok[c] for c in cells):
                    continue
            elif di and dj and not (ok[u[0] + di, u[1]] and ok[u[0], u[1] + dj]):
                continue
            step = math.hypot(di, dj) * cs
            nd = d + step * (1.0 + pen[v])
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
    if not np.isfinite(dist[t]):
        return None, None
    path = [t]
    while path[-1] != s:
        path.append(prev[path[-1]])
    path = path[::-1]
    length = sum(math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) for i in range(len(path) - 1)) * cs
    return float(length), [(float(-HALF + DX / 2 + p[1] * cs), float(-HALF + DX / 2 + p[0] * cs)) for p in path]


def mooring(L, xz, rmax=44.0):
    # nearest water point to a shore point with the keel clear at the lowest tide plus a margin (bed at or below -1.1 - 0.45 - 0.35)
    H = L['H']
    r0, c0 = xz_to_rc(*xz)
    best = None
    R = int(rmax / DX)
    for di in range(-R, R + 1):
        for dj in range(-R, R + 1):
            r, c = int(round(r0)) + di, int(round(c0)) + dj
            if 0 <= r < NX and 0 <= c < NX and H[r, c] <= TIDE_LOW - BOAT_CLEAR - 0.35:
                d = di * di + dj * dj
                if best is None or d < best[0]:
                    best = (d, (r, c))
    return rc_to_xz(*best[1]) if best else None


def ring_point(L, land_mask, from_xz, dist_m):
    # a point on the water about dist_m from the given land cells (a viewing or approach ring), the one closest to from_xz; boats stop here
    H = L['H']
    rs, cs = np.nonzero(land_mask)
    if len(rs) == 0:
        return None
    sub = slice(None, None, max(1, len(rs) // 300))
    rs, cs = rs[sub], cs[sub]
    rr, cc = np.mgrid[0:NX, 0:NX]
    dmin = np.full((NX, NX), 1e9)
    for r, c in zip(rs, cs):
        dmin = np.minimum(dmin, np.hypot(rr - r, cc - c) * DX)
    ok = (np.abs(dmin - dist_m) < 3.5) & (H <= TIDE_LOW - BOAT_CLEAR - 0.1) & (np.hypot(X_, Z_) <= LY.LAND_R + 5)
    r, c = np.nonzero(ok)
    if len(r) == 0:
        return None
    k = np.argmin((X_[r, c] - from_xz[0]) ** 2 + (Z_[r, c] - from_xz[1]) ** 2)
    return float(X_[r[k], c[k]]), float(Z_[r[k], c[k]])


# ---------------------------------------------------------------- robots
def robot_route(H, slope, a_xz, b_xz):
    # 1) the highest tide level at which a walk exists (widest path: maximise the lowest bed on the way), 2) the shortest walk that is still dry enough at that level
    ra, ca = [int(round(v)) for v in xz_to_rc(*a_xz)]
    rb, cb = [int(round(v)) for v in xz_to_rc(*b_xz)]
    nb = [(di, dj) for di in (-1, 0, 1) for dj in (-1, 0, 1) if di or dj]
    best = np.full((NX, NX), -np.inf)
    best[ra, ca] = H[ra, ca]
    pq = [(-H[ra, ca], ra, ca)]
    while pq:
        b, r, c = heapq.heappop(pq)
        if -b < best[r, c]:
            continue
        if (r, c) == (rb, cb):
            break
        for di, dj in nb:
            r2, c2 = r + di, c + dj
            if not (0 <= r2 < NX and 0 <= c2 < NX):
                continue
            if abs(H[r2, c2] - H[r, c]) / (math.hypot(di, dj) * DX) > ROBOT_SLOPE:
                continue
            v = min(-b, float(H[r2, c2]))
            if v > best[r2, c2]:
                best[r2, c2] = v
                heapq.heappush(pq, (-v, r2, c2))
    bott = best[rb, cb]
    if not np.isfinite(bott):
        return None
    tstar = float(bott + WADE)                     # walkable while the tide level is at or below this
    okc = (H + WADE >= tstar - 1e-6)
    dist = np.full((NX, NX), np.inf)
    prev = {}
    dist[ra, ca] = 0.0
    pq = [(0.0, ra, ca)]
    while pq:
        d, r, c = heapq.heappop(pq)
        if d > dist[r, c]:
            continue
        if (r, c) == (rb, cb):
            break
        for di, dj in nb:
            r2, c2 = r + di, c + dj
            if not (0 <= r2 < NX and 0 <= c2 < NX) or not okc[r2, c2]:
                continue
            st = abs(H[r2, c2] - H[r, c]) / (math.hypot(di, dj) * DX)
            if st > ROBOT_SLOPE:
                continue
            nd = d + math.hypot(di, dj) * DX * (1.0 + 2.0 * st)
            if nd < dist[r2, c2]:
                dist[r2, c2] = nd
                prev[(r2, c2)] = (r, c)
                heapq.heappush(pq, (nd, r2, c2))
    if not np.isfinite(dist[rb, cb]):
        return None
    path = [(rb, cb)]
    while path[-1] != (ra, ca):
        path.append(prev[path[-1]])
    path = path[::-1]
    length = sum(math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) for i in range(len(path) - 1)) * DX
    wet = sum(math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) for i in range(len(path) - 1) if H[path[i + 1]] < 0.5) * DX
    return dict(tstar=tstar, length_m=float(length), wet_m=float(wet), path=[rc_to_xz(*p) for p in path])


def crossing_windows(tstar, days=40, need_min=0.0):
    h0 = TD.GIFT_START_HOURS - 5.0
    ws = TD.windows(tstar, h0, h0 + days * 24.0)
    out = []
    for a, b in ws:
        out.append(dict(start=a, end=b, minutes=(b - a) * 60.0, day=int((a - h0) // 24) + 1, clock=TD.clock_str(a)))
    return [w for w in out if w['minutes'] >= need_min]


def game_minutes(real_s):
    return real_s * 60.0 / CLOCK_S_PER_HOUR


# ---------------------------------------------------------------- sight lines
def los_clear(H, a, b, eye_a, eye_b, steps=None):
    # a, b in (row, col) float; True if the line between eye heights clears the ground (sea counted as height 0.0 +/- nothing: the high tide level 1.1 is ignored, the sea is a plane at 0)
    n = steps or int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) + 2)
    t = np.linspace(0, 1, n)
    rr = a[0] + (b[0] - a[0]) * t
    cc = a[1] + (b[1] - a[1]) * t
    r0 = np.clip(np.round(rr).astype(int), 0, NX - 1)
    c0 = np.clip(np.round(cc).astype(int), 0, NX - 1)
    g = np.maximum(H[r0, c0], 0.0)
    z = eye_a + (eye_b - eye_a) * t
    return bool(np.all(z[1:-1] >= g[1:-1] - 1e-6))


def viewshed_share(H, eye_rc, eye_h, mask, stride=3, tgt_h=0.4):
    rs, cs = np.nonzero(mask)
    sel = np.arange(0, len(rs), stride)
    vis = 0
    for k in sel:
        if los_clear(H, eye_rc, (rs[k], cs[k]), eye_h, max(H[rs[k], cs[k]], 0.0) + tgt_h):
            vis += 1
    return vis / max(1, len(sel))


# ---------------------------------------------------------------- budgets
def triangle_estimate(L):
    # ESTIMATE, calibrated on the page's own numbers (WORLD_VIEW.md, software GL counts, no fps). The world page of window 153 draws 57,153 triangles; the same terrain rule applied to
    # that window (2 triangles per mesh cell over land and sea bed shallower than 3 m inside the 122 m disc, 4-cell blocks merged on shallow bed: x0.72) gives 22,100 at a 1.0 m mesh,
    # so objects, sea, sky and boats are about 35,000 and are capped per world (150 conifers, 44 broadleaf ...). The Level 1 table is 1.48x wider, so: mesh cell 1.4 m (same density on
    # screen), caps x1.5 (objects 52,000); low profile 2.0 m cell, caps half; AR profile 2.0 m cell, deeper-than-2 m bed skipped, a quarter of the objects.
    H = L['H']
    inside = np.hypot(X_, Z_) <= LY.TABLE_R
    land = (H > 0) & inside
    out = {}
    for tier, (mc, depth, objs) in {'high': (1.4, 3.0, 52000), 'low': (2.0, 3.0, 26000), 'ar': (2.0, 2.0, 13000)}.items():
        shallow = (H <= 0) & (H > -depth) & inside
        cells = (land.sum() + 0.72 * shallow.sum()) * DX * DX / (mc * mc)
        out[tier] = int(2.0 * cells + objs)
    out['terrain_only_1m'] = int(2.0 * (land.sum() + 0.72 * ((H <= 0) & (H > -3.0) & inside).sum()) * DX * DX)
    return out


X_, Z_ = LY.X, LY.Z


def draw_call_estimate(L, tier):
    n_isl = sum(1 for r in LY.ROLES if (L['owner'] == LY.ROLES.index(r)).sum() > 60)
    base = {'high': 36, 'low': 26, 'ar': 24}[tier]
    per = {'high': 3, 'low': 1.5, 'ar': 1.0}[tier]
    return int(base + per * n_isl + (4 if L['wood'].sum() > 100 else 0))


def tier_estimates(L):
    tri = triangle_estimate(L)
    # tier -> which page profile it uses
    prof = {'T0 desktop big': 'high', 'T1 desktop': 'high', 'T2 iPad high': 'high', 'T3 iPad low': 'low', 'T4 AR': 'ar', 'T5 phone small': 'ar'}
    out = {}
    for tier, (tcap, ccap) in TIERS.items():
        p = prof[tier]
        t = tri[p] * (0.7 if tier == 'T5 phone small' else 1.0)
        c = draw_call_estimate(L, p)
        out[tier] = dict(tris=int(t), tris_cap=tcap, calls=c, calls_cap=ccap, ok=bool(t <= tcap and c <= ccap))
    return out


# ---------------------------------------------------------------- analysis
def first_day_numbers():
    # the first-day builder's numbers, read from gift_day.js itself so they cannot drift: build totals and the catalogue ids
    import re
    src = open(os.path.join(ROOT, 'gift_day.js'), encoding='utf-8').read()
    builds = {m.group(1): int(m.group(2)) for m in re.finditer(r"\{ id: '(\w+)', name: '[^']*', total: (\d+)", src)}
    cat = re.findall(r"\{ id: '(\w+)', name: '[^']*', price: \d+, extra", src)
    return builds, cat


TIMBER_M3 = {'jetty': 2.5, 'cottage': 6.0, 'cistern': 0.4, 'hide': 1.2, 'kiosk': 3.0}   # TUNING, anchored on HOUSE_BILL_OF_MATERIALS.md type C (a 4 x 3 m shed is 1.5 to 2.2 m3 sawn)
WOOD_M3_HA, WOOD_GROW_HA = 110.0, 5.0       # standing stock and sustainable growth of cool-Atlantic woodland per hectare (TUNING; stands vary 80 to 250 m3/ha)
FIRST_YEAR_CUT = 0.10                        # share of the standing stock the player may take in year one without hurting the wood


def analyse(L):
    A = Ctx()
    H = L['H'].astype(np.float64)
    w = L['w']
    A.H, A.w = H, w
    A.lab = L['label']
    A.rl = role_labels(L)
    slope = L['slope']
    A.slope = slope
    spots = dict(L['spots'])
    # ---- home details: yard, strand sites
    hr, hc = xz_to_rc(*spots['hut'])
    best = None
    R = 8
    for di in range(-R, R + 1):
        for dj in range(-R, R + 1):
            r, c = int(round(hr)) + di, int(round(hc)) + dj
            d = math.hypot(di, dj) * DX
            if 3.5 <= d <= 16 and 0 <= r < NX and 0 <= c < NX and H[r, c] >= 1.6 and L['owner'][r, c] == 0:
                sc = slope[max(0, r - 2):r + 3, max(0, c - 2):c + 3].mean() + 0.003 * d
                if best is None or sc < best[0]:
                    best = (sc, (r, c))
    spots['yard'] = rc_to_xz(*best[1]) if best else spots['hut']
    # ---- shores by the ecosystem tool, on the whole table
    segs = SC.build_shores(w, L['seed'])
    for s in segs:
        r, c = xz_to_rc(s['xy'][0], -s['xy'][1])
        r, c = int(np.clip(round(r), 0, NX - 1)), int(np.clip(round(c), 0, NX - 1))
        s['E_storm'] = float(L['exposure_storm'][max(0, r - 1):r + 2, max(0, c - 1):c + 2].mean())
        s['xz'] = (s['xy'][0], -s['xy'][1])
    A.segs = segs
    role_of_label = {v: k for k, v in A.rl.items()}
    A.shores = {}
    for role, lab_id in A.rl.items():
        ss = [s for s in segs if s['island'] == lab_id]
        col = [s for s in ss if s['collectable']]
        coast = sum(s['length_m'] for s in ss)
        colL = sum(s['length_m'] for s in col)
        items = sum(s['length_m'] * s['rate_items_m_tide'] for s in col)
        pieces = sum(s['length_m'] * (PIECES_PER_M[0] + (PIECES_PER_M[1] - PIECES_PER_M[0]) * s['wrack_index']) * (1.0 - 0.5 * s['E_storm']) for s in col)
        lee = sum(s['length_m'] for s in ss if s['E_storm'] < 0.30)
        A.shores[role] = dict(coast_m=coast, collectable_m=colL, items_per_tide=items, haul_pieces=pieces, lee_m=lee,
                              E_prev=float(np.average([s['exposure'] for s in ss], weights=[s['length_m'] for s in ss])) if ss else 0.0,
                              E_storm=float(np.average([s['E_storm'] for s in ss], weights=[s['length_m'] for s in ss])) if ss else 0.0,
                              best_rate=max([s['rate_items_m_tide'] for s in col], default=0.0))
    # strand sites on home: best four collectable segments
    hs = sorted([s for s in segs if s['island'] == A.rl.get('home') and s['collectable']], key=lambda s: -s['rate_items_m_tide'] * s['length_m'])
    A.strand_sites = [s['xz'] for s in hs[:4]]
    # ---- landings
    lands = {}
    for role in ('home', 'woods', 'hoard', 'rock'):
        lid = A.rl.get(role)
        cands = [c for c in w.landing_candidates if c['island'] == lid]
        if role == 'home':
            lands[role] = spots['beach']
        elif cands:
            c = sorted(cands, key=lambda c: (round(c['exposure'], 2), -c['length_m']))[0]
            lands[role] = (c['xy'][0], -c['xy'][1])
        else:
            lands[role] = None
    # shore fallbacks (no tool candidate): the gentlest shore cell, preferring low exposure
    for role in ('woods', 'hoard', 'rock'):
        if lands.get(role) is None:
            ss = sorted([s for s in segs if s['island'] == A.rl.get(role)], key=lambda s: (s['slope'] + s['exposure']))
            lands[role] = ss[0]['xz'] if ss else None
    A.landings = lands
    moor = {r: (mooring(L, p) if p else None) for r, p in lands.items()}
    own = L['owner']
    if 'seals' in A.rl:
        moor['seals'] = next((p for p in (ring_point(L, own == LY.ROLES.index('seals'), spots['beach'], d) for d in (30.0, 40.0, 52.0, 66.0)) if p), None)
    if L['reef']:
        moor['wreck'] = next((p for p in (ring_point(L, (own == LY.ROLES.index('wreck')) | reef_mask(L), spots['beach'], d) for d in (24.0, 34.0, 46.0)) if p), None)
    A.moor = moor
    A.spots = spots
    return A


def reef_mask(L):
    m = np.zeros((NX, NX), bool)
    if L['reef']:
        for hx_, hz_ in L['reef']['heads']:
            r, c = xz_to_rc(hx_, hz_)
            m[int(np.clip(round(r), 0, NX - 1)), int(np.clip(round(c), 0, NX - 1))] = True
        # the ridge itself: cells between -1.0 and 0 near the heads
        r0, c0 = xz_to_rc(*L['reef']['centre'])
        rr, cc = np.mgrid[0:NX, 0:NX]
        m |= (np.hypot(rr - r0, cc - c0) * DX < 36) & (L['H'] > -1.0)
    return m


def nearest_role(L, xz, rmax=40.0):
    # the role whose land is nearest to a point (within rmax metres), else None
    r0, c0 = xz_to_rc(*xz)
    R = int(rmax / DX)
    best = None
    own = L['owner']
    for di in range(-R, R + 1):
        for dj in range(-R, R + 1):
            r, c = int(round(r0)) + di, int(round(c0)) + dj
            if 0 <= r < NX and 0 <= c < NX and own[r, c] >= 0 and L['H'][r, c] > 0:
                d = di * di + dj * dj
                if best is None or d < best[0]:
                    best = (d, LY.ROLES[own[r, c]])
    return best[1] if best else None


def run_trips(L, A):
    out = {}
    for (a, b), (lo, hi) in TRIPS.items():
        pa, pb = A.moor.get(a), A.moor.get(b)
        rec = dict(lo=lo, hi=hi)
        if pa is None or pb is None:
            rec['missing'] = True
            out['%s>%s' % (a, b)] = rec
            continue
        for name, tide in (('low', TIDE_LOW), ('mid', TIDE_MID), ('high', TIDE_HIGH)):
            length, path = boat_route(A.H, pa, pb, tide)
            rec[name + '_m'] = length
            rec[name + '_s'] = (length / TENDER_MS) if length else None
            rec[name + '_fast_s'] = (length / FAST_MS) if length else None
            if name == 'mid':
                rec['path'] = path
        out['%s>%s' % (a, b)] = rec
    return out


def run_robots(L, A):
    out = {}
    spots = A.spots
    yard = spots['yard']
    dep = L['depot']['xy'] if L['depot'] else None
    if dep:
        out['hoard'] = robot_route(A.H, A.slope, yard, dep)
    if A.strand_sites:
        best = None
        for s in A.strand_sites:
            r = robot_route(A.H, A.slope, yard, s)
            if r and (best is None or r['tstar'] > best['tstar'] or (r['tstar'] == best['tstar'] and r['length_m'] < best['length_m'])):
                best = r
        out['wrack'] = best
    # the woods: from the yard to the woods shore across the sill
    wl = np.argwhere(L['owner'] == LY.ROLES.index('woods'))
    if len(wl):
        tgt = None
        sill = [b for b in L['bars'] if b['name'] == 'woods sill']
        if sill:
            tgt = sill[0]['b']
        else:
            r0, c0 = wl.mean(0)
            tgt = rc_to_xz(r0, c0)
        # nudge the target onto the woods land (the bar end is on the shore)
        r, c = xz_to_rc(*tgt)
        out['woods'] = robot_route(A.H, A.slope, yard, tgt)
    return out


def hydrology_summary(L, A):
    H = A.H
    rain = HY.rain_field(H, DX, wind_from_deg=250.0, base=1500.0)
    R = HY.analyse(H, DX, sea=0.0, rain_mm_yr=rain, runoff=0.7, thr_m2=250.0)
    out = {}
    own = L['owner']
    for k, role in enumerate(LY.ROLES):
        m = (own == k) & (H > 0)
        if not m.any():
            continue
        net = R['net'] & m
        q = R['qmean'][net]
        # a spring head: a channel cell with small catchment and a high bed
        head = net & (R['area'] < 500.0)
        hh = float(H[head].max()) if head.any() else 0.0
        rain_mean = float(rain[m].mean())
        area = float(m.sum() * DX * DX)
        runoff_m3_day = rain_mean / 1000.0 * 0.7 * area / 365.25
        perim = A.shores.get(role, {}).get('coast_m', 1.0) or 1.0
        width = 2.0 * area / max(perim, 1.0) * 1.0
        head_m, thick, usable = CL.freshwater_lens(rain_mean * 0.45, max(width, 1.0))
        out[role] = dict(max_catch_m2=float(R['area'][m].max()), area_m2=area, rain_mm=rain_mean, runoff_m3_day=runoff_m3_day, channel_cells=int(net.sum()), q_max_m3_day=float(q.max() * 86400.0) if len(q) else 0.0,
                         head_elev_m=hh, lakes=sum(1 for lk in R['lakes'] if m.flat[lk['cell']]), lens_usable_m=usable, mean_width_m=width)
    return out


def wildlife_summary(L, A):
    home_id = A.rl.get('home', 1)
    hb = A.spots['beach']
    lane_out = (0.0, -1.0)         # out to sea from the south beach: tool axes (x east, y north) so south is -y
    village = dict(island=home_id, xy=(hb[0], -hb[1]), facing_deg=270.0, out=lane_out, kind='sand', frontage_m=34.0,
                   village_xy=(hb[0], -hb[1] + 30.0), collector_seg=None)
    wl = WP.place_wildlife(L['w'], A.segs, village, L['seed'])
    return wl


def validate(L, quick=False):
    A = analyse(L)
    checks = []
    M = {}

    def chk(name, ok, value=None, limit=None, note='', hard=True):
        checks.append(dict(name=name, ok=bool(ok), value=value, limit=limit, note=note, hard=hard))

    own, H = L['owner'], A.H
    area = {r: float(((own == k) & (H > 0)).sum() * DX * DX) for k, r in enumerate(LY.ROLES)}
    M['area_m2'] = area
    # 1 roles present with a useful size
    mins = {'home': 8000, 'woods': 5000, 'hoard': 1500, 'seals': 1200, 'rock': 200, 'wreck': 100}
    bad = {r: int(area[r]) for r, m in mins.items() if area[r] < m}
    chk('roles_have_land', not bad, {r: int(a) for r, a in area.items()}, mins, 'land area of each role, m2' + ('; too small: %s' % bad if bad else ''))
    # 2 no overlap, everything inside the disc, gaps
    placed = L['placed']
    gaps = {}
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            a, b = np.argwhere((own == i) & (H > 0)), np.argwhere((own == j) & (H > 0))
            if len(a) and len(b):
                gaps['%s-%s' % (LY.ROLES[i], LY.ROLES[j])] = LY.min_gap(a, b)
    mg = min(gaps.values()) if gaps else 0
    chk('no_overlap_gap', mg >= LY.MIN_GAP_M - 0.1, round(mg, 1), '>= %.0f m' % LY.MIN_GAP_M, 'smallest open water between two islands (no bars counted)')
    rr_ = np.hypot(X_, Z_)
    outside = int(((H > 0) & (rr_ > LY.LAND_R)).sum())
    chk('land_inside_table', outside == 0, outside, 0, 'land cells outside radius %.0f m' % LY.LAND_R)
    # 3 solver succeeded for every role
    nospot = [x for x in L['log'] if 'NO SPOT' in x]
    chk('placement_found', not nospot, len(nospot), 0, '; '.join(nospot))
    # 4 home preserved
    hc = placed[0]['cand']
    r0, c0 = placed[0]['off']
    sub = H[r0:r0 + 129, c0:c0 + 129]
    diff = np.abs(sub - hc['H'])
    changed = int((diff[hc['H'] > 0] > 0.02).sum())
    chk('home_island_unchanged', changed <= 40, changed, '<= 40 cells (bars raise a few shore cells)', 'cells of the seed9001 land that differ from the builder\'s file')
    # 5 boats
    trips = run_trips(L, A)
    M['trips'] = {k: {kk: (vv if kk != 'path' else None) for kk, vv in v.items()} for k, v in trips.items()}
    bad_t, ok_t = [], 0
    for k, t in trips.items():
        if t.get('missing') or t.get('mid_s') is None:
            bad_t.append(k + ' no route at mid tide')
        elif not (t['lo'] <= t['mid_s'] <= t['hi']):
            bad_t.append('%s %.0f s (want %d to %d)' % (k, t['mid_s'], t['lo'], t['hi']))
        else:
            ok_t += 1
        if not t.get('missing') and t.get('high_s') is None:
            bad_t.append(k + ' no route at high tide')
    chk('boat_trips_in_target', not bad_t, {k: (round(t['mid_s']) if t.get('mid_s') else None) for k, t in trips.items()}, 'seconds at 2.0 m/s, mid tide', '; '.join(bad_t))
    lowbad = []
    for k in ('home>woods', 'home>hoard', 'woods>hoard'):
        t = trips.get(k)
        if t and not t.get('missing'):
            if t['low_s'] is None:
                lowbad.append(k + ' no low-tide route')
            elif t['mid_s'] and t['low_s'] > min(4.0 * t['mid_s'] + 30, 300):
                lowbad.append('%s low %.0f s vs mid %.0f s' % (k, t['low_s'], t['mid_s']))
    chk('low_tide_detours_sane', not lowbad, {k: (round(t['low_s']) if t.get('low_s') else None) for k, t in trips.items() if k in ('home>woods', 'home>hoard', 'woods>hoard')}, 'a route exists and costs at most 4x + 30 s (and under 300 s)', '; '.join(lowbad))
    fast_ok = all(t.get('mid_fast_s', 99) >= (5 if k.endswith('wreck') else 8) for k, t in trips.items() if t.get('mid_fast_s'))
    chk('fast_boat_trips_worth_it', fast_ok, {k: round(t['mid_fast_s']) for k, t in trips.items() if t.get('mid_fast_s')}, '>= 8 s each (5 s to the reef)', 'at 4.2 m/s a trip must still be long enough to enjoy')
    # 6 robots
    rob = run_robots(L, A)
    M['robots'] = {k: ({kk: vv for kk, vv in v.items() if kk != 'path'} if v else None) for k, v in rob.items()}
    hb = rob.get('hoard')
    if hb is None:
        chk('hoard_route_walkable', False, None, None, 'no walking route from the yard to the depot at any tide')
    else:
        cross_s = hb['wet_m'] / ROBOT_MS                      # only the stretch that the tide covers has to be dry while they walk it
        need = 1.25 * game_minutes(cross_s) + 10.0
        ws = crossing_windows(hb['tstar'], 40, need)
        days = sorted({w['day'] for w in ws})
        after = [d for d in days if d >= 9]
        frac = len(after) / 32.0
        first = days[0] if days else None
        mins = [w['minutes'] for w in ws]
        M['hoard_walk'] = dict(tstar=hb['tstar'], length_m=hb['length_m'], wet_m=hb['wet_m'], cross_s=cross_s, need_min=need, first_day=first, frac_days_9_40=frac, first_clock=ws[0]['clock'] if ws else None,
                               longest_min=max(mins) if mins else 0, windows_40d=len(ws), list=[(w['clock'], round(w['minutes'])) for w in ws[:8]],
                               walk_total_s=hb['length_m'] / ROBOT_MS)
        chk('hoard_route_walkable', True, round(hb['length_m']), None, 'yard to depot on foot, %.0f m (%.0f m of it tide-covered), dry at tide level %.2f m or lower' % (hb['length_m'], hb['wet_m'], hb['tstar']))
        chk('hoard_bar_tide_window', first is not None and 2 <= first <= 9 and 0.30 <= frac <= 0.85, dict(first_day=first, share_of_days_9_to_40=round(frac, 2), need_game_min=round(need)),
            'first usable window on day 2 to 9; on 30 to 85 percent of later days', 'robots cross the wet stretch and stay a tide on the Hoard island; the tide table must matter but never lock the Hoard away')
        chk('robot_crossing_fits_window', bool(mins) and max(mins) >= need * 1.2, dict(wet_walk_s=round(cross_s), longest_window_game_min=round(max(mins)) if mins else 0),
            'longest window >= 1.2 x need', 'the wet stretch is %.0f s of play, %.0f game minutes at 100 s per game hour' % (cross_s, game_minutes(cross_s)))
        chk('hoard_walk_not_too_long', hb['length_m'] / ROBOT_MS <= 240, round(hb['length_m'] / ROBOT_MS), '<= 240 s of play', 'the whole walk from the yard; longer and the player stops watching', hard=False)
    wr = rob.get('wrack')
    chk('wrack_route_dry', wr is not None and wr['tstar'] >= 0.3, round(wr['tstar'], 2) if wr else None, '>= 0.3 (walkable from low water to a little above mid tide)', 'yard to the best strand site; the tideline itself is wet at high water')
    chk('strand_sites', len(A.strand_sites) >= 3, len(A.strand_sites), '>= 3', 'collectable strand segments on the home island')
    ws_ = rob.get('woods')
    if ws_ is None:
        chk('woods_sill_spring_only', False, None, None, 'no walk to the woods even at the lowest tide', hard=False)
    else:
        wins = crossing_windows(ws_['tstar'], 40, 60)
        M['woods_sill'] = dict(tstar=ws_['tstar'], length_m=ws_['length_m'], windows_40d=len(wins), days=sorted({w['day'] for w in wins})[:12])
        chk('woods_sill_spring_only', -1.05 <= ws_['tstar'] <= -0.6, round(ws_['tstar'], 2), '-1.05 to -0.60', 'robots reach the woods on foot only around spring lows (about %d windows in 40 days)' % len(wins), hard=False)
    # 7 surge and wrack
    sh = A.shores
    M['shores'] = {r: {k: round(v, 3) for k, v in d.items()} for r, d in sh.items()}
    home_lee = sh['home']['lee_m'] if 'home' in sh else 0
    chk('home_lee_shore', home_lee >= 60, round(home_lee), '>= 60 m of shore with storm exposure < 0.30', 'the lee shore where finds wash up')
    chk('home_wrack_capacity', sh['home']['haul_pieces'] >= 600, round(sh['home']['haul_pieces']), '>= 600 pieces', 'what the home strand can hold after a Great Wash (2 to 12 pieces per metre by shore richness, TUNING)')
    tot_haul = sum(d['haul_pieces'] for d in sh.values())
    chk('table_haul_capacity', tot_haul >= 700, round(tot_haul), '>= 700 pieces', 'all shores together')
    chk('home_exposure_sane', sh['home']['E_storm'] <= 0.62, round(sh['home']['E_storm'], 2), '<= 0.62', 'mean storm exposure of the home shore', hard=False)
    # 8 resources
    builds, cat = first_day_numbers()
    M['builds'] = builds
    need_m3 = TIMBER_M3['cottage'] + TIMBER_M3['jetty'] + 0.4      # year one: the cottage, the jetty repair and a boat (the first-day build is one thing; the rest take years)
    wood_ha = float(L['wood'].sum() * DX * DX / 1e4)
    stock = wood_ha * WOOD_M3_HA
    supply1 = stock * FIRST_YEAR_CUT + wood_ha * WOOD_GROW_HA
    M['timber'] = dict(wood_ha=wood_ha, stock_m3=stock, supply_year1_m3=supply1, need_five_builds_m3=need_m3, sustainable_m3_yr=wood_ha * WOOD_GROW_HA)
    chk('timber_for_five_builds', supply1 >= need_m3, round(supply1, 1), '>= %.1f m3 (cottage + jetty + a dinghy; all five builds together need %.1f m3 over about three years)' % (need_m3, sum(TIMBER_M3[k] for k in builds if k in TIMBER_M3)), 'woods island: %.2f ha woodland, stock %.0f m3, year-one supply = 10%% of stock + growth; the catalogue holds no timber (%s)' % (wood_ha, stock, ','.join(cat)))
    chk('timber_sustainable', wood_ha * WOOD_GROW_HA >= 2.5, round(wood_ha * WOOD_GROW_HA, 1), '>= 2.5 m3 a year', 'after year one the wood must carry boats and repairs on its growth')
    dr = DT.load()
    M['drift'] = dict(per_year=dr['per_year'], total=dr['per_year_total'], table=dr['table'])
    hyd = hydrology_summary(L, A)
    M['hydrology'] = {r: {k: (round(v, 2) if isinstance(v, float) else v) for k, v in d.items()} for r, d in hyd.items()}
    hh = hyd.get('home', {})
    roof_l_day = 75.0 * hh.get('rain_mm', 1500) / 1000.0 * 0.8 / 365.25 * 1000.0
    chk('home_water_by_rain', roof_l_day >= 120, round(roof_l_day), '>= 120 L a day from 75 m2 of roof', 'no spring on the home island (as the first-day build): hut plus cottage roof, 80 percent collected')
    chk('home_spring_honest', hh.get('q_max_m3_day', 0) < 4.5, round(hh.get('q_max_m3_day', 0), 2), '< 4.5 m3 a day at the biggest gully', 'hydrology.py finds only wet-weather gullies on the home island (catchment %d m2): no spring, as the builder says' % hh.get('max_catch_m2', 0), hard=False)
    wh = hyd.get('woods', {})
    chk('woods_fresh_water', wh.get('channel_cells', 0) >= 3 and wh.get('q_max_m3_day', 0) >= 2.2 and wh.get('head_elev_m', 0) >= 2.0, dict(channel_cells=wh.get('channel_cells'), q_m3_day=round(wh.get('q_max_m3_day', 0), 1), head_m=round(wh.get('head_elev_m', 0), 1), catchment_m2=int(wh.get('max_catch_m2', 0))),
        '>= 3 channel cells, >= 2.2 m3/day at the outlet, a head above 2 m', 'a spring and trickle on the woods island (hydrology.py, rain_field 1500 mm base, runoff 0.7, channel from 250 m2); 2.2 m3 a day is 2200 L, barrels for a camp')
    chk('home_lens_note', True, round(hh.get('lens_usable_m', 0), 2), None, 'usable freshwater lens on the home island (climate.freshwater_lens), a well works if >= 2 m', hard=False)
    # 9 buildable and slope limits
    def flat_area(role, hmin=1.5, smax=0.15):
        m = (own == LY.ROLES.index(role)) & (H >= hmin) & (A.slope < smax)
        return float(m.sum() * DX * DX)
    fl = {r: flat_area(r) for r in LY.ROLES}
    M['flat_m2'] = {r: int(v) for r, v in fl.items()}
    chk('home_buildable', fl['home'] >= 1200, int(fl['home']), '>= 1200 m2 above 1.5 m and under slope 0.15', 'room for cottage, cistern, kiosk, yard (12.4 x 8.2 m) and hide')
    chk('woods_buildable', fl['woods'] >= 120, int(fl['woods']), '>= 120 m2', 'a sawmill shed and a landing')
    dp = L['depot']
    chk('hoard_pad', dp is not None and dp['cut_fill_m3'] <= 600 and fl['hoard'] >= 150, dict(pad_m=None if not dp else round(dp['pad_h'], 2), cut_fill_m3=None if not dp else round(dp['cut_fill_m3'])),
        'pad above 1.5 m, cut and fill <= 600 m3 (about 1200 person-hours of soil, dig/DIG_MODEL.md; the old crews did it), >= 150 m2 flat', 'the depot terrace (the one edited place), cut and fill by volume')
    chk('seals_not_for_building', fl['seals'] <= 400, int(fl['seals']), '<= 400 m2 flat', 'seal island must not read as a building site', hard=False)
    # 10 sight lines from the lighthouse stump
    st = A.spots['stump']
    sr, sc = xz_to_rc(*st)
    ground = H[int(round(sr)), int(round(sc))]
    eye = ground + LIGHT_H
    water_disc = (H <= 0) & (rr_ <= LY.TABLE_R - 6)
    land_disc = (H > 0) & (rr_ <= LY.TABLE_R)
    share_w = viewshed_share(H, (sr, sc), eye, water_disc, 3)
    share_l = viewshed_share(H, (sr, sc), eye, land_disc, 3)
    # share of each island's land that the lamp sees, plus single points that must be seen
    def land_share(role):
        m = (own == LY.ROLES.index(role)) & (H > 0)
        return viewshed_share(H, (sr, sc), eye, m, 2, 0.5) if m.any() else 0.0
    shares = {r: land_share(r) for r in ('woods', 'hoard', 'seals', 'rock')}
    pts = {'hoard depot': dp['xy'] if dp else None, 'seal ring': A.moor.get('seals'), 'reef head': L['reef']['heads'][0] if L['reef'] else None}
    seen = {}
    for k, p in pts.items():
        if p is None:
            seen[k] = None
            continue
        r, c = xz_to_rc(*p)
        seen[k] = los_clear(H, (sr, sc), (r, c), eye, max(H[int(np.clip(round(r), 0, NX - 1)), int(np.clip(round(c), 0, NX - 1))], 0) + 1.0)
    M['sight'] = dict(stump_ground_m=float(ground), eye_m=float(eye), water_share=share_w, land_share=share_l, island_shares=shares, key=seen)
    chk('lighthouse_sees_the_water', share_w >= 0.70, round(share_w, 2), '>= 0.70 of the water inside the table', 'from the stump at lamp height %.0f m' % LIGHT_H)
    chk('lighthouse_sees_the_islands', all(s >= 0.30 for s in shares.values()) and all(v is True for v in seen.values()), dict(shares={k: round(v, 2) for k, v in shares.items()}, points=seen),
        'at least 30 percent of each island seen, and the depot, a seal ring and a reef head', 'the whole table is a promise the light makes')
    yard = A.spots['yard']
    yr, yc = xz_to_rc(*yard)
    hidden = None
    if dp:
        r, c = xz_to_rc(*dp['xy'])
        hidden = not los_clear(H, (yr, yc), (r, c), H[int(yr), int(yc)] + 1.7, H[int(np.clip(round(r), 0, NX - 1)), int(np.clip(round(c), 0, NX - 1))] + 2.0)
        r2, c2 = xz_to_rc(*A.spots['beach'])
        hidden2 = not los_clear(H, (r2, c2), (r, c), 1.7, H[int(np.clip(round(r), 0, NX - 1)), int(np.clip(round(c), 0, NX - 1))] + 2.0)
        M['sight']['hoard_hidden_from_yard'] = hidden
        M['sight']['hoard_hidden_from_beach'] = hidden2
        chk('hoard_hidden_from_camp', bool(hidden and hidden2), dict(yard=hidden, beach=hidden2), 'depot out of sight from the yard and the beach (eye 1.7 m)', 'found by following the robots, not by looking; soft, the reveal is better when it holds', hard=False)
    # 11 wildlife on the seal island
    wl = wildlife_summary(L, A)
    ss = [s for s in wl['seal_sites'] if nearest_role(L, (s['xy'][0], -s['xy'][1])) == 'seals']
    M['seal_sites_by_role'] = {}
    for s_ in wl['seal_sites']:
        rn = nearest_role(L, (s_['xy'][0], -s_['xy'][1]))
        M['seal_sites_by_role'][rn] = M['seal_sites_by_role'].get(rn, 0) + int(s_['capacity'])
    peak = WP.peak_seals(wl)
    seal_cap = int(sum(s['capacity'] for s in ss))
    M['wildlife'] = dict(peak_seals_table=peak, seal_island_capacity=seal_cap, n_seal_sites=len(wl['seal_sites']), birds=WP.bird_pairs(wl, 5), kelp=round(wl['kelp']['fraction_of_near'], 2))
    chk('seals_have_haulouts', seal_cap >= 20, seal_cap, '>= 20 seals of capacity on the seal island', 'wildlife_place.py haul-out rule: low flat rock that dries, deep water near', hard=True)
    chk('hide_goal_reachable', peak >= 10, peak, '>= 10 seals at peak (the hide goal)', 'with disturbance from the home landing lane')
    chk('birds_present', M['wildlife']['birds'] >= 30, M['wildlife']['birds'], '>= 30 pairs in May', 'seabird pairs from ledges and colonies on the whole table', hard=False)
    # 12 wreck reef is a hazard
    hz = None
    if L['reef']:
        paths = [t.get('path') for k, t in trips.items() if t.get('path') and k.split('>')[0] != 'x']
        dmin = 1e9
        for p in paths:
            P = np.array(p)
            for hx_, hz_ in L['reef']['heads']:
                dmin = min(dmin, float(np.min(np.hypot(P[:, 0] - hx_, P[:, 1] - hz_))))
        hz = dmin
        M['reef_to_route_m'] = dmin
        chk('wreck_reef_is_a_hazard', 6.0 <= dmin <= 60.0, round(dmin, 1), '6 to 60 m from a regular boat route', 'near enough to be a hazard of the passage, clear enough that the route still works')
        heads = [L['H'][int(np.clip(round(xz_to_rc(*h)[0]), 0, NX - 1)), int(np.clip(round(xz_to_rc(*h)[1]), 0, NX - 1))] for h in L['reef']['heads']]
        dry_heads = sum(1 for v in heads if v > -0.8)
        chk('reef_heads_show_at_low_tide', dry_heads >= 3 and max(heads) > 0.0, [round(float(v), 2) for v in heads], '>= 3 heads shallower than -0.8, one above sea level', 'ribs and hulk show at low water, hide at high')
    # 13 budgets
    te = tier_estimates(L)
    M['tiers'] = te
    chk('budget_T2_ipad', te['T2 iPad high']['ok'], te['T2 iPad high'], 'tris <= 150k, calls <= 60', 'ESTIMATE (WORLD_VIEW.md numbers, software GL only)')
    chk('budget_T4_ar', te['T4 AR']['ok'], te['T4 AR'], 'tris <= 90k, calls <= 40', 'ESTIMATE; AR profile: mesh cell 2 m, low caps')
    chk('budget_T1_desktop', te['T1 desktop']['ok'], te['T1 desktop'], 'tris <= 150k, calls <= 80', 'ESTIMATE', hard=False)
    chk('budget_T0_big', te['T0 desktop big']['ok'], te['T0 desktop big'], 'tris <= 250k, calls <= 120', 'ESTIMATE', hard=False)
    chk('budget_T3_ipad_low', te['T3 iPad low']['ok'], te['T3 iPad low'], 'tris <= 90k, calls <= 40', 'ESTIMATE', hard=False)
    hard = [c for c in checks if c['hard']]
    fails = [c['name'] for c in hard if not c['ok']]
    soft_fails = [c['name'] for c in checks if (not c['hard']) and not c['ok']]
    return dict(seed=L['seed'], hash=L['hash'], ok=not fails, fails=fails, soft_fails=soft_fails, checks=checks, metrics=M, analysis=A, trips=trips, robots=rob)


def summary_line(R):
    return 'seed %d %s hash %s fails=%s soft=%s' % (R['seed'], 'PASS' if R['ok'] else 'FAIL', R['hash'], R['fails'], R['soft_fails'])


if __name__ == '__main__':
    import json
    import time
    s = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    t = time.time()
    Lo = LY.build_layout(s)
    R = validate(Lo)
    print(summary_line(R), round(time.time() - t, 1), 's')
    for c in R['checks']:
        print(('ok  ' if c['ok'] else 'FAIL') + ('' if c['hard'] else ' (soft)'), c['name'], '|', c['value'], '|', c['limit'], '|', c['note'][:100])
