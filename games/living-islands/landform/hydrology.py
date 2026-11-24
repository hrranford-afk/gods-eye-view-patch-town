"""landform/hydrology.py -- headless hydrology on a heightfield (numpy only, deterministic). Research: research/RIVERS_LAKES_WATER_CYCLE.md.

    python3 landform/hydrology.py            # write landform/HYDROLOGY_REPORT.md and landform/hydrology_maps/*.png for the 12 exported worlds
    python3 landform/test_hydrology.py       # the checks

Pipeline (all on one grid, row 0 = north edge like landform/worlds/*/world.bin):
  priority_flood   Priority-Flood with epsilon (Barnes, Lehman, Mulla 2014): fills pits and gives every land cell a receiver (D8 parent); sea cells and window-edge cells are outlets.
  accumulate       flow accumulation (area or runoff volume) in reverse pop order (donors before receivers: no sort needed).
  lakes            cells that filling raised by more than `min_depth` metres, grouped into connected lakes with a level and an area.
  rivers           land cells whose catchment area is at least `thr_m2`; Strahler order from the receiver graph.
  hand / twi       height above nearest drainage (floodplain) and a topographic wetness index (bog, fen, seep candidates).
  hydrograph       a rain pulse over a catchment routed by travel time plus two linear stores (quick, slow): rising and falling limb.
Everything physical here is TUNING or PLAUSIBLE (see the note); the graph algorithms are standard. No real names, no I/O outside landform/worlds.
"""
import heapq
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
WORLDS = os.path.join(HERE, 'worlds')
EPS = 1e-6                      # metres added per step across a flat so that every cell has a strictly lower receiver (chain of 16k cells = 0.016 m, below the 1/256 m = 0.0039 m export step x4)
NB = ((-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0), (-1, -1, math.sqrt(2)), (-1, 1, math.sqrt(2)), (1, -1, math.sqrt(2)), (1, 1, math.sqrt(2)))


# ---------------------------------------------------------------- loading
def load_world(seed):
    """Read landform/worlds/seedNNNN: returns dict(height m, wetness 0..1, veg, rock, dx, sea, nx, manifest). Row 0 = north edge."""
    d = os.path.join(WORLDS, 'seed%04d' % seed)
    man = json.load(open(os.path.join(d, 'manifest.json')))
    blob = open(os.path.join(d, 'world.bin'), 'rb').read()
    nx = man['nx']
    a = man['arrays']

    def arr(name, dt):
        o = a[name]['offset']
        return np.frombuffer(blob, dtype=dt, count=nx * nx, offset=o).reshape(nx, nx)
    h = arr('height', '<i2').astype(np.float64) / man['height_scale']
    return dict(height=h, wetness=arr('wetness', 'u1').astype(np.float64) / 255.0, veg=arr('veg', 'u1'), rock=arr('rock', 'u1'), dx=float(man['dx']),
                sea=float(man['sea_level']), nx=nx, manifest=man, seed=seed)


# ---------------------------------------------------------------- core graph algorithms
def priority_flood(h, sea=0.0, edge_outlets=True):
    """Priority-Flood with epsilon. Outlets: every cell with h <= sea (sea, parent -1) and, if edge_outlets, every window-edge cell (water leaves the window, parent -1).
    Returns filled (float64), parent (int32 flat index of the receiver, -1 for outlets), order (flat indices in pop order = ascending filled; a receiver always precedes its donors)."""
    ny, nx = h.shape
    flat = h.ravel()
    n = ny * nx
    filled = np.full(n, np.inf)
    parent = np.full(n, -1, np.int32)
    closed = np.zeros(n, bool)
    heap = []
    for i in range(n):
        r, c = divmod(i, nx)
        if flat[i] <= sea or (edge_outlets and (r == 0 or c == 0 or r == ny - 1 or c == nx - 1)):
            filled[i] = flat[i]
            closed[i] = True
            heap.append((flat[i], i))
    heapq.heapify(heap)
    order = []
    fl = filled
    while heap:
        v, i = heapq.heappop(heap)
        order.append(i)
        r, c = divmod(i, nx)
        for dr, dc, _ in NB:
            rr, cc = r + dr, c + dc
            if rr < 0 or cc < 0 or rr >= ny or cc >= nx:
                continue
            j = rr * nx + cc
            if closed[j]:
                continue
            closed[j] = True
            nv = flat[j]
            if nv < v + EPS:
                nv = v + EPS
            fl[j] = nv
            parent[j] = i
            heapq.heappush(heap, (nv, j))
    # cells never reached (no outlet at all) keep inf: only possible with edge_outlets False and no sea
    return fl.reshape(ny, nx), parent, np.asarray(order, np.int64)


def accumulate(parent, order, weight):
    """Sum `weight` (per cell: area m2, or runoff volume m3) down the receiver graph. Donors are processed before receivers by walking `order` backwards."""
    acc = np.asarray(weight, np.float64).ravel().copy()
    for i in order[::-1]:
        p = parent[i]
        if p >= 0:
            acc[p] += acc[i]
    return acc


def label_components(mask):
    """8-connected labels of a boolean mask (0 = none). Plain stack fill, deterministic scan order."""
    ny, nx = mask.shape
    lab = np.zeros((ny, nx), np.int32)
    k = 0
    for r in range(ny):
        for c in range(nx):
            if mask[r, c] and lab[r, c] == 0:
                k += 1
                st = [(r, c)]
                lab[r, c] = k
                while st:
                    a, b = st.pop()
                    for dr, dc, _ in NB:
                        aa, bb = a + dr, b + dc
                        if 0 <= aa < ny and 0 <= bb < nx and mask[aa, bb] and lab[aa, bb] == 0:
                            lab[aa, bb] = k
                            st.append((aa, bb))
    return lab, k


# ---------------------------------------------------------------- the analysis
def analyse(h, dx, sea=0.0, rain_mm_yr=None, runoff=0.7, thr_m2=800.0, min_lake_depth=0.05, min_lake_cells=3):
    """Full pass. rain_mm_yr: scalar or array (mm per year at each cell; default 2000, a wet Atlantic island, TUNING). runoff: annual runoff coefficient (PLAUSIBLE 0.6..0.8 for a wet cool island).
    thr_m2: contributing area at which a channel exists (TUNING; real values 1e3..1e5 m2, smaller on steep wet ground)."""
    ny, nx = h.shape
    n = ny * nx
    flat = h.ravel()
    land = (h > sea)
    filled, parent, order = priority_flood(h, sea)
    ff = filled.ravel()
    rain = np.full((ny, nx), 2000.0) if rain_mm_yr is None else np.broadcast_to(np.asarray(rain_mm_yr, np.float64), (ny, nx))
    q_cell = (rain / 1000.0) * runoff * dx * dx            # m3 of runoff per year produced in each cell
    area = accumulate(parent, order, np.full(n, dx * dx))   # contributing area m2 (includes the cell itself)
    qv = accumulate(parent, order, q_cell.ravel())          # runoff volume per year through each cell, m3/yr
    qmean = qv / (365.25 * 86400.0)                         # mean discharge m3/s
    depth = (filled - h)
    lake_cells = land & (depth > min_lake_depth)
    lab, nl = label_components(lake_cells)
    lakes = []
    keep = np.zeros((ny, nx), bool)
    for k in range(1, nl + 1):
        m = lab == k
        cnt = int(m.sum())
        if cnt < min_lake_cells:
            continue
        keep |= m
        lv = filled[m]
        lakes.append(dict(id=len(lakes) + 1, cells=cnt, area_m2=cnt * dx * dx, level=float(np.median(lv)), level_spread=float(lv.max() - lv.min()), max_depth=float(depth[m].max()),
                          mean_depth=float(depth[m].mean()), cell=int(np.flatnonzero(m.ravel())[0])))
    lake = keep
    net = land & (area >= thr_m2).reshape(ny, nx)           # the channel network (lake cells on the path are kept as pass-through)
    # Strahler order, upstream first
    maxo = np.zeros(n, np.int32)
    cnt = np.zeros(n, np.int32)
    ordr = np.zeros(n, np.int32)
    netf = net.ravel()
    for i in order[::-1]:
        if not netf[i]:
            continue
        o = 1 if maxo[i] == 0 else (maxo[i] if cnt[i] == 1 else maxo[i] + 1)
        ordr[i] = o
        p = parent[i]
        if p >= 0 and netf[p]:
            if o > maxo[p]:
                maxo[p], cnt[p] = o, 1
            elif o == maxo[p]:
                cnt[p] += 1
    ordr = ordr.reshape(ny, nx)
    # land root (the last land cell before the water or the window edge) -> catchments
    root = np.full(n, -1, np.int64)
    landf = land.ravel()
    for i in order:
        if not landf[i]:
            continue
        p = parent[i]
        root[i] = i if (p < 0 or not landf[p]) else root[p]
    # travel distance along the flow path to the root, and HAND (height above the nearest channel or water)
    drain_elev = np.zeros(n)
    for i in order:
        p = parent[i]
        if p < 0 or not landf[i] or netf[i] or not landf[p]:
            drain_elev[i] = flat[i]
        else:
            drain_elev[i] = drain_elev[p]
    hand = np.maximum(0.0, flat - drain_elev).reshape(ny, nx)
    # topographic wetness index ln(a / tan(beta)) (a = specific contributing area m2 per m of contour), slope from the filled surface to the receiver
    dist = np.ones(n)
    nxr = parent % nx
    rr = parent // nx
    ii = np.arange(n)
    ri, ci = ii // nx, ii % nx
    diag = (np.abs(rr - ri) + np.abs(nxr - ci)) == 2
    dist = np.where(diag, dx * math.sqrt(2), dx)
    slope = np.where(parent >= 0, (ff - ff[np.maximum(parent, 0)]) / dist, 0.0)
    slope = np.maximum(slope, 0.002)
    twi = np.log((area / dx) / slope).reshape(ny, nx)
    return dict(h=h, dx=dx, sea=sea, land=land, filled=filled, parent=parent, order=order, area=area.reshape(ny, nx), qmean=qmean.reshape(ny, nx), qv=qv.reshape(ny, nx), depth=depth,
                lake=lake, lake_lab=lab, lakes=lakes, net=net, strahler=ordr, root=root.reshape(ny, nx), hand=hand, twi=twi, slope_recv=slope.reshape(ny, nx), dist=dist.reshape(ny, nx),
                thr_m2=thr_m2, nx=nx, ny=ny)


def falls(A, min_drop=0.5, min_slope=0.35):
    """Waterfall candidates: channel cells (not lake) whose step to the receiver drops at least min_drop metres at a slope of at least min_slope (about 19 degrees). Returns [(flat index, drop m, Q mean m3/s)]."""
    out = []
    par = A['parent']
    nf = A['net'].ravel()
    ff = A['filled'].ravel()
    lk = A['lake'].ravel()
    dist = A['dist'].ravel()
    q = A['qmean'].ravel()
    for i in np.flatnonzero(nf & ~lk):
        p = par[i]
        if p < 0:
            continue
        d = ff[i] - ff[p]
        if d >= min_drop and d / dist[i] >= min_slope:
            out.append((int(i), float(d), float(q[i])))
    return out


# ---------------------------------------------------------------- hydraulic geometry (bankfull), PLAUSIBLE small gravel streams
def channel_geometry(q_bankfull):
    """width m, depth m from bankfull discharge m3/s: w = 3.0 Q^0.5, d = 0.30 Q^0.4 (Leopold and Maddock exponents 0.5, 0.4; coefficients TUNING)."""
    q = np.maximum(q_bankfull, 1e-9)
    return 3.0 * q ** 0.5, 0.30 * q ** 0.4


def river_stats(A, bankfull_ratio=5.0):
    """Counts and lengths per Strahler order, mouths, heads, catchments. bankfull_ratio: bankfull flow / mean flow (TUNING 3..8 for a flashy wet-island stream)."""
    dx = A['dx']
    net, so, parent, nx = A['net'], A['strahler'], A['parent'], A['nx']
    nf = net.ravel()
    sof = so.ravel()
    landf = A['land'].ravel()
    length = {}
    total = 0.0
    heads = 0
    donors = np.zeros(len(parent), np.int32)
    for i in np.flatnonzero(nf):
        p = parent[i]
        if p >= 0 and nf[p]:
            donors[p] += 1
    for i in np.flatnonzero(nf):
        if A['lake'].ravel()[i]:
            continue
        p = parent[i]
        step = 0.0 if p < 0 else (dx * math.sqrt(2) if (abs(p // nx - i // nx) + abs(p % nx - i % nx)) == 2 else dx)
        length[int(sof[i])] = length.get(int(sof[i]), 0.0) + step
        total += step
    for i in np.flatnonzero(nf):
        if donors[i] == 0:
            heads += 1
    area = A['area'].ravel()
    mouths = [int(i) for i in np.flatnonzero(nf) if (parent[i] < 0 or not landf[parent[i]])]
    mouths.sort(key=lambda i: -area[i])
    qb = A['qmean'].ravel()[mouths[0]] * bankfull_ratio if mouths else 0.0
    w, d = channel_geometry(qb)
    return dict(total_len_m=total, len_by_order=dict(sorted(length.items())), n_heads=heads, n_mouths=len(mouths), mouths=mouths, max_order=int(so.max()), net_cells=int(net.sum()),
                biggest_catchment_m2=float(area[mouths[0]]) if mouths else 0.0, biggest_q_mean=float(A['qmean'].ravel()[mouths[0]]) if mouths else 0.0, biggest_width_m=float(w), biggest_depth_m=float(d))


# ---------------------------------------------------------------- the checks (used by the tests and the report)
def check_flow(A, tol_orig=0.02, max_lake_spread=0.02):
    """Returns a dict of booleans and counts. All must hold."""
    parent, filled, h, landf = A['parent'], A['filled'].ravel(), A['h'].ravel(), A['land'].ravel()
    nx = A['nx']
    idx = np.flatnonzero(parent >= 0)
    p = parent[idx]
    up_filled = int((filled[idx] <= filled[p]).sum())                     # receiver must be strictly lower on the filled surface
    # a cell the filling raised (any pit, lake or not) legitimately drains over its rim, so only cells that stayed at their own height are tested
    dry = idx[(filled[idx] - h[idx] <= tol_orig) & landf[idx]]
    up_orig = int((h[parent[dry]] > h[dry] + tol_orig).sum())             # on the real surface a dry-land cell may not drain to ground higher than itself (beyond tolerance)
    # every river head and every lake reaches the sea or the window edge: walk the receivers with a step cap, count terminations
    ends = {'sea': 0, 'edge': 0, 'loop_or_stuck': 0}
    ny = A['ny']
    heads = [i for i in np.flatnonzero(A['net'].ravel())]
    donor = np.zeros(len(parent), bool)
    for i in heads:
        if parent[i] >= 0:
            donor[parent[i]] = True
    starts = [i for i in heads if not donor[i]]
    starts += [lk['cell'] for lk in A['lakes']]
    for s in starts:
        i, steps = s, 0
        while parent[i] >= 0 and steps <= len(parent):
            i = parent[i]
            steps += 1
        if steps > len(parent):
            ends['loop_or_stuck'] += 1
        else:
            r, c = divmod(int(i), nx)
            ends['sea' if not landf[i] else 'edge'] += 1
    spread = max([lk['level_spread'] for lk in A['lakes']] + [0.0])
    return dict(uphill_filled=up_filled, uphill_orig=up_orig, ends=ends, n_starts=len(starts), lake_spread_max=spread, unreached=int(np.isinf(filled).sum()))


def mass_check(A, runoff=0.7, rain_mm=2000.0):
    """Total runoff volume leaving at outlets vs rain x land+sea cells: accumulation conserves mass. Returns (out, produced)."""
    parent = A['parent']
    out = float(A['qv'].ravel()[parent < 0].sum())
    produced = float(A['h'].size) * A['dx'] ** 2 * rain_mm / 1000.0 * runoff
    return out, produced


# ---------------------------------------------------------------- rain: altitude and windward/lee (TUNING numbers, PLAUSIBLE shape)
def rain_field(h, dx, wind_from_deg=250.0, base=1500.0, per_100m=250.0, upslope_gain=4.0, sea=0.0):
    """Annual rain mm. base at sea level on the windward coast; +per_100m per 100 m of altitude (Atlantic hills gain roughly 100 to 300 mm per 100 m, PLAUSIBLE);
    an upslope term (positive when the ground rises along the wind) and a lee shadow (negative on the falling ground), from the smoothed gradient along the wind. Clipped to 0.5x..2.2x of base."""
    wd = math.radians(wind_from_deg)
    ux, uy = -math.sin(wd), -math.cos(wd)           # direction the wind blows TO, x east, y north
    hs = h.copy()
    for _ in range(3):                                 # light box smoothing so the cue is the hill, not the pixel
        hs = (hs + np.roll(hs, 1, 0) + np.roll(hs, -1, 0) + np.roll(hs, 1, 1) + np.roll(hs, -1, 1)) / 5.0
    gy, gx = np.gradient(hs, dx)                       # row increases to the south, so d/dnorth = -gy
    along = gx * ux + (-gy) * uy                       # rise per metre along the wind
    f = 1.0 + per_100m * np.maximum(h - sea, 0.0) / 100.0 / base + upslope_gain * along
    return np.clip(f, 0.5, 2.2) * base


# ---------------------------------------------------------------- rain pulse -> hydrograph
def hydrograph(A, gauge_root, rain_xy_m, sigma_m, pulse_mm_h=10.0, pulse_min=30.0, dt=60.0, hours=60.0, quick=0.30, slow=0.20, v_hill=0.08, v_chan=0.8, k_quick_s=600.0, k_slow_s=6 * 3600.0):
    """Discharge at the mouth of one catchment after a rain pulse of `pulse_mm_h` for `pulse_min` minutes over a gaussian footprint (centre rain_xy_m in window metres from the NW corner (x east, y south),
    sigma sigma_m; sigma <= 0 means uniform). A cell's runoff is split into a quick part (delayed by travel time along its flow path: hillslope speed v_hill, channel speed v_chan, then a linear store k_quick)
    and a slow part (soil and ground water, linear store k_slow); the rest is lost to storage and evaporation. Returns (t seconds, Q m3/s, runoff volume m3 in, catchment cell count).
    All numbers TUNING; the SHAPE (delay, rise, fall, long baseflow tail) is the physical part."""
    ny, nx, dx = A['ny'], A['nx'], A['dx']
    parent, order = A['parent'], A['order']
    root = A['root'].ravel()
    in_c = root == gauge_root
    landf = A['land'].ravel()
    netf = A['net'].ravel()
    tt = np.zeros(ny * nx)
    dist = A['dist'].ravel()
    for i in order:                                    # receivers first
        p = parent[i]
        if p < 0 or not in_c[i] or i == gauge_root:
            continue
        v = v_chan if netf[i] else v_hill
        tt[i] = tt[p] + dist[i] / v
    ii = np.arange(ny * nx)
    x = (ii % nx) * dx
    y = (ii // nx) * dx
    if sigma_m > 0:
        wgt = np.exp(-((x - rain_xy_m[0]) ** 2 + (y - rain_xy_m[1]) ** 2) / (2 * sigma_m ** 2))
    else:
        wgt = np.ones(ny * nx)
    nst = int(hours * 3600 / dt)
    npulse = max(1, int(round(pulse_min * 60 / dt)))
    mm_per_step = pulse_mm_h * dt / 3600.0
    cells = np.flatnonzero(in_c & landf)
    vol_cell = wgt[cells] * mm_per_step / 1000.0 * dx * dx        # m3 per rain step per cell
    delay = np.minimum((tt[cells] / dt).astype(int), nst - 1)
    inflow_q = np.zeros(nst + 1)
    inflow_s = np.zeros(nst + 1)
    tot = float(vol_cell.sum()) * npulse
    for k in range(npulse):
        np.add.at(inflow_q, np.minimum(delay + k, nst), vol_cell * quick)
        inflow_s[min(k, nst)] += float(vol_cell.sum()) * slow
    # linear stores (exact discretisation): outflow = S/k, S gains inflow
    q = np.zeros(nst)
    sq = ss = 0.0
    aq = math.exp(-dt / k_quick_s)
    as_ = math.exp(-dt / k_slow_s)
    for t in range(nst):
        sq += inflow_q[t]
        ss += inflow_s[t]
        oq = sq * (1 - aq)
        os_ = ss * (1 - as_)
        sq -= oq
        ss -= os_
        q[t] = (oq + os_) / dt
    return np.arange(nst) * dt, q, tot * (quick + slow), int(len(cells))


# ---------------------------------------------------------------- report helpers
def ascii_map(A, cols=65, rows=33):
    ny, nx = A['ny'], A['nx']
    out = []
    h = A['h']
    lo, hi = np.percentile(h[A['land']], [40, 85]) if A['land'].any() else (0, 1)
    bog = A['land'] & ~A['net'] & (A['twi'] > np.percentile(A['twi'][A['land']], 93)) & (A['slope_recv'] < 0.12)
    for r in range(rows):
        s = ''
        for c in range(cols):
            r0, r1 = r * ny // rows, max(r * ny // rows + 1, (r + 1) * ny // rows)
            c0, c1 = c * nx // cols, max(c * nx // cols + 1, (c + 1) * nx // cols)
            sub = (slice(r0, r1), slice(c0, c1))
            if A['lake'][sub].any():
                s += 'O'
            elif A['net'][sub].any() and A['land'][sub].any():
                s += str(min(9, int(A['strahler'][sub].max())))
            elif not A['land'][sub].any():
                s += '~'
            elif bog[sub].any():
                s += '%'
            else:
                m = float(h[sub][A['land'][sub]].mean())
                s += '.' if m < lo else ':' if m < hi else '^'
        out.append(s)
    return '\n'.join(out)


def write_png(A, path, scale=4):
    from PIL import Image
    h, land = A['h'], A['land']
    ny, nx = A['ny'], A['nx']
    gy, gx = np.gradient(h, A['dx'])
    shade = np.clip(0.6 + 0.9 * (-gx * 0.7 + gy * 0.7), 0.35, 1.2)      # light from the north-west
    img = np.zeros((ny, nx, 3), np.float64)
    hh = np.clip(h / max(1.0, h.max()), 0, 1)
    base = np.stack([112 + 40 * hh, 128 + 30 * hh, 86 + 40 * hh], -1)
    img[:] = base * shade[..., None]
    sea = np.stack([np.full_like(h, 30.0), 70 + np.clip(h, -20, 0) * 1.5, 120 + np.clip(h, -20, 0) * 2.0], -1)
    img[~land] = sea[~land]
    bog = land & ~A['net'] & (A['twi'] > np.percentile(A['twi'][land], 93)) & (A['slope_recv'] < 0.12)
    img[bog] = [96, 104, 60]
    img[A['lake']] = [90, 170, 215]
    so = A['strahler']
    for k in range(1, int(so.max()) + 1):
        m = A['net'] & (so == k) & ~A['lake']
        img[m] = [40 + 10 * k, 110 + 15 * k, 235 - 5 * k]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((nx * scale, ny * scale), Image.NEAREST)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)


def synthetic_island(n=256, dx=16.0, seed=7, peak=500.0, beta=2.2, breach=False):
    """INVENTED test terrain for the scale demo: a radially tapered fractal island (spectral noise, f^-beta), peak in metres. Not from the landform tool."""
    rng = np.random.RandomState(seed)
    f = np.fft.fftfreq(n)
    fr = np.hypot(*np.meshgrid(f, f)) + 1.0 / n
    spec = (rng.randn(n, n) + 1j * rng.randn(n, n)) / fr ** beta
    z = np.real(np.fft.ifft2(spec))
    z = (z - z.min()) / (z.max() - z.min())
    yy, xx = np.mgrid[0:n, 0:n]
    r = np.hypot(xx - n / 2, yy - n / 2) / (n * 0.46)
    cone = np.clip(1 - r ** 1.5, 0, 1)
    if breach:      # a horseshoe: a ring of hills round a basin that drains through one gap (a breached crater or a glacial amphitheatre), so one big catchment exists
        ang = np.arctan2(yy - n / 2, xx - n / 2)
        gap = 1.0 - 0.92 * np.exp(-(ang / 0.22) ** 2)
        ring = np.exp(-((r - 0.72) / 0.22) ** 2) * gap
        cone = np.clip(0.18 * (1 - r ** 2) + 0.9 * ring, 0, 1) * np.clip(1.6 - 1.6 * r ** 3, 0, 1)
    return (cone * (0.55 + 0.45 * z)) * peak - 4.0


def erode(h, dx, iters=40, K=2e-6, m=0.5, U=2e-4, dt=1e4, sea=0.0):
    """Stream-power erosion (implicit, n = 1; the 'fastscape' scheme: Braun and Willett 2013) on a heightfield: uplift U (m/yr) on land, incision K * A^m * slope. Run offline to GROW a coherent river network
    on invented terrain (a bigger island). Sea cells stay fixed. Each step costs one priority_flood + one accumulate. TUNING constants; the form (stream power) is the standard one."""
    h = h.astype(np.float64).copy()
    ny, nx = h.shape
    for _ in range(iters):
        land = h > sea
        h[land] += U * dt
        filled, parent, order = priority_flood(h, sea, edge_outlets=False)
        hf = filled.ravel().copy()
        area = accumulate(parent, order, np.full(ny * nx, dx * dx))
        out = hf.copy()
        landf = land.ravel()
        for i in order:
            p = parent[i]
            if p < 0 or not landf[i]:
                continue
            r, c = divmod(int(i), nx)
            pr, pc = divmod(int(p), nx)
            dist = dx * (math.sqrt(2) if (r != pr and c != pc) else 1.0)
            f = K * dt * area[i] ** m / dist
            out[i] = (hf[i] + f * out[p]) / (1.0 + f)
            if out[i] <= sea:
                out[i] = sea + 0.01
        h = out.reshape(ny, nx)
    return h


def main():
    import time
    idx = json.load(open(os.path.join(WORLDS, 'index.json')))['worlds']
    lines = []
    P = lines.append
    P('# Hydrology report (generated by landform/hydrology.py; do not edit by hand)')
    P('')
    P('Method: Priority-Flood with epsilon, D8 receivers, accumulation, channel threshold 800 m2, runoff 0.7 of 2000 mm a year (TUNING), Strahler order from the receiver graph. Windows are the 12 exported worlds (256 m, 2 m cells; volcanic 258 m, 3 m cells). Maps in landform/hydrology_maps/. Legend of the ASCII maps: ~ sea, . : ^ land low/mid/high, O lake, 1..9 river by Strahler order, wet ground (high wetness index, flat).')
    P('')
    P('## Table, all 12 exported windows')
    P('')
    P('| seed | rock | land % | land cells draining out | river heads | max order | channel length m | mouths | steep-step cells | lakes | lake area m2 | biggest catchment m2 | its mean flow L/s | bankfull width m | no uphill (filled / dry land) | all reach sea or edge | secs |')
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    maps = {}
    for w in idx:
        W = load_world(w['seed'])
        t0 = time.time()
        A = analyse(W['height'], W['dx'], W['sea'])
        S = river_stats(A)
        C = check_flow(A)
        dt = time.time() - t0
        maps[w['seed']] = (W, A)
        write_png(A, os.path.join(HERE, 'hydrology_maps', 'seed%04d.png' % w['seed']))
        lk = A['lakes']
        edge_land = int(((A['parent'] < 0) & A['land'].ravel()).sum())
        ok_reach = C['ends']['loop_or_stuck'] == 0 and C['n_starts'] == C['ends']['sea'] + C['ends']['edge']
        P('| %d | %s | %.0f | %d | %d | %d | %.0f | %d | %d | %d | %.0f | %.0f | %.2f | %.2f | %s | %s | %.1f |' % (
            w['seed'], W['manifest']['rock'], 100.0 * A['land'].mean(), edge_land, S['n_heads'], S['max_order'], S['total_len_m'], S['n_mouths'], len(falls(A)), len(lk), sum(l['area_m2'] for l in lk),
            S['biggest_catchment_m2'], S['biggest_q_mean'] * 1000, S['biggest_width_m'], 'yes' if (C['uphill_filled'] == 0 and C['uphill_orig'] == 0) else 'NO', ('n/a (no river or lake)' if C['n_starts'] == 0 else 'yes (%d sea, %d edge)' % (C['ends']['sea'], C['ends']['edge'])) if ok_reach else 'NO', dt))
    P('')
    P('Reading: one window is about 6.6 ha. The largest mean flow in any window is about 0.5 L/s (half a litre a second: a trickle you can step over); the biggest catchments are one hectare or less. Steep-step cells are channel cells that drop 0.5 m or more at over 19 degrees (waterfall candidates, counted per cell, not per fall). These are rills and burns, not rivers. See the note, section 5, for the window size a real river needs.')
    P('')
    P('## Flood test (rain pulse on the largest catchment of each world)')
    P('')
    P('Pulse 10 mm/h for 30 min over a gaussian footprint (sigma 90 m) centred on the catchment, versus the same pulse 600 m away. Quick part 30 percent (travel time along the flow path, then a 10 min store), slow part 20 percent (6 h store). TUNING all.')
    P('')
    P('| seed | catchment cells | peak Q L/s | time of peak after rain start min | back to half peak after min | peak with rain 600 m away L/s | volume out / in |')
    P('|---|---|---|---|---|---|---|')
    for w in idx:
        W, A = maps[w['seed']]
        S = river_stats(A)
        if not S['mouths']:
            continue
        g = int(A['root'].ravel()[S['mouths'][0]])
        gy, gx = divmod(g, A['nx'])
        in_c = np.flatnonzero((A['root'].ravel() == g) & A['land'].ravel())
        cy, cx = np.mean(in_c // A['nx']) * A['dx'], np.mean(in_c % A['nx']) * A['dx']
        t, q, vin, nc = hydrograph(A, g, (cx, cy), 90.0)
        t2, q2, _, _ = hydrograph(A, g, (cx + 600.0, cy), 90.0)
        k = int(q.argmax())
        half = next((j for j in range(k, len(q)) if q[j] < 0.5 * q[k]), len(q) - 1)
        vout = float(q.sum() * 60.0)
        P('| %d | %d | %.2f | %.0f | %.0f | %.4f | %.3f |' % (w['seed'], nc, q[k] * 1000, t[k] / 60 - 0, (t[half] - t[k]) / 60, q2.max() * 1000, vout / vin if vin else 0))
    P('')
    P('## Maps (ASCII, 2 cells per column, 4 per row)')
    for sd in (4, 153, 139, 56):
        W, A = maps[sd]
        P('')
        P('### seed %d (%s)' % (sd, W['manifest']['label']))
        P('')
        P('![seed %d](hydrology_maps/seed%04d.png)' % (sd, sd))
        P('')
        P('```')
        P(ascii_map(A))
        P('```')
    P('')
    P('All 12 PNG maps: hydrology_maps/seedNNNN.png (blue lines = rivers by order, cyan = lakes, olive = wet flat ground).')
    P('')
    P('## Scale demo (INVENTED terrain, not from the landform tool)')
    P('')
    P('Synthetic islands (a radial cone and a horseshoe with one gap, each grown by stream-power erosion), peak 300 m before erosion, to see what a bigger island yields and what the headless pass costs here (numpy plus a python heap, one thread). Mean rain 2000 mm, runoff 0.7.')
    P('')
    P('| terrain | grid | cell m | side km | pass time s | river heads | max Strahler | channel km | mouths | biggest catchment km2 | its mean flow m3/s | bankfull width m |')
    P('|---|---|---|---|---|---|---|---|---|---|---|---|')
    big = None
    for name, n, d, br in (('radial cone, eroded', 192, 40.0, False), ('horseshoe (one gap), eroded', 192, 40.0, True), ('horseshoe (one gap), eroded', 256, 40.0, True)):
        h = erode(synthetic_island(n, d, seed=7, beta=2.8, peak=300.0, breach=br), d, iters=60, K=5e-6, dt=2e4)
        t0 = time.time()
        A = analyse(h, d, 0.0, thr_m2=40000.0)
        tp = time.time() - t0
        S = river_stats(A)
        if br and n == 192:
            big = (A, S)
        P('| %s | %d x %d | %.0f | %.1f | %.1f | %d | %d | %.0f | %d | %.2f | %.2f | %.1f |' % (name, n, n, d, n * d / 1000, tp, S['n_heads'], S['max_order'], S['total_len_m'] / 1000, S['n_mouths'],
                                                                                         S['biggest_catchment_m2'] / 1e6, S['biggest_q_mean'], S['biggest_width_m']))
    A, S = big
    write_png(A, os.path.join(HERE, 'hydrology_maps', 'invented_horseshoe.png'), scale=3)
    P('')
    P('(The terrain is first grown by 60 steps of stream-power erosion, about 8 to 15 s each here; "pass time" is the hydrology analysis alone.) Map of the 192 x 192 horseshoe: hydrology_maps/invented_horseshoe.png.')
    P('')
    g = int(A['root'].ravel()[S['mouths'][0]])
    t, q, vin, nc = hydrograph(A, g, (0, 0), 0.0, pulse_mm_h=6.0, pulse_min=180.0, dt=600.0, hours=120.0, k_quick_s=3 * 3600.0, k_slow_s=48 * 3600.0)
    k = int(q.argmax())
    hh = next((j for j in range(k, len(q)) if q[j] < 0.5 * q[k]), len(q) - 1)
    P('Flood on the horseshoe, biggest catchment %d cells = %.1f km2: uniform storm 6 mm/h for 3 h (quick store 3 h, slow store 48 h, hillslope 0.08 m/s, channel 0.8 m/s; TUNING): peak %.2f m3/s (mean flow %.2f, so %.1fx), peak %.1f h after the storm began, back to half peak %.1f h after the peak, volume out / in %.3f.' % (
        nc, nc * 40.0 * 40.0 / 1e6, q[k], S['biggest_q_mean'], q[k] / S['biggest_q_mean'], t[k] / 3600, (t[hh] - t[k]) / 3600, q.sum() * 600.0 / vin))
    P('')
    P('Channel threshold in the demo is 0.04 km2 (4 ha), a mid value for wet cool ground (TUNING). Island sizes here are the point: only the horseshoe, one big catchment of about 20 km2, makes a stream wide enough (6 m bankfull) to read as a river.')
    open(os.path.join(HERE, 'HYDROLOGY_REPORT.md'), 'w').write('\n'.join(lines) + '\n')
    print('wrote HYDROLOGY_REPORT.md')


if __name__ == '__main__':
    main()
