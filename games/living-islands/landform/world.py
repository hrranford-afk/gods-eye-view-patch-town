"""Living Islands LAND FORMATION TOOL v0.

ONE continuous terrain height field over the whole world region, seabed included.
Sea level is a plane that cuts it; islands are the peaks above the plane, skerries the small
ones; shelves, sills, channels, sheltered bays and reefs are the SAME surface below the water.
The tide only moves the cut.  Islands are never placed: they are found (connected components of
height > level) after the field exists.

Frame (same as blender/island_common.py): x east, y north, z up, metres, sea level 0.
Arrays are indexed [row, col] = [y index, x index]; row 0 is the SOUTH edge (flip for a north-up image).
Angles are maths angles (radians, 0 = east, counter-clockwise).

numpy only (PIL only in sheet.py).  Deterministic from (seed, province, size_m, n).
Pipeline (see LANDFORM.md): 1 uplift + tilt, 2 rock map (dip bands + faults), 3 glacial/structural
streamlining, 5a choose sea level cut, 4 stream-power + thermal erosion (rock hardness = erodibility),
6 wave erosion by exposure (16 bearings), 7 lee deposition, 8 soil / vegetation / colour, then
5b island labelling by connected components at sea_level +/- tide.
"""
import math
import sys
import time
from collections import deque

import numpy as np

TIDE_AMP = 1.1          # metres, half range of the tide window (seabed pass amplitude, LI-1a contract window)
PROVINCE_NAMES = {'A': 'gneiss', 'B': 'sandstone', 'C': 'basalt', 'D': 'volcanic'}
_ALIASES = {'a': 'A', 'b': 'B', 'c': 'C', 'gneiss': 'A', 'sandstone': 'B', 'basalt': 'C',
            'p1': 'A', 'p2': 'B', 'p3': 'C', 'd': 'D', 'volcanic': 'D', 'p7': 'D'}

# ----------------------------------------------------------------------------------------------
# Rock table.  hardness = resistance, granite = 1.0 (research note: erosion rate = 1/hardness;
# the ratios are TUNING, not measurements).  joint_m = typical joint / bedding spacing (metres).
# slope_max = tan of the stable slope angle used by the thermal pass (TUNING).
# colours are (fresh, weathered, lichen) 0..255 RGB (PLAUSIBLE, from the research table).
# ----------------------------------------------------------------------------------------------
def _rock(name, hard, joint, fresh, weath, lich, soil, soil_m, veg, smax, prov):
    return dict(name=name, hardness=hard, erodibility=1.0 / hard, joint_m=joint, colour_fresh=fresh,
                colour_weathered=weath, colour_lichen=lich, soil=soil, soil_depth_m=soil_m,
                vegetation=veg, slope_max=smax, province=prov)

ROCKS = [
    _rock('gneiss_pink', 1.43, 2.0, (176, 150, 142), (128, 112, 104), (170, 140, 70), 'acid peaty', 0.15,
          ['heather', 'bog', 'lichen'], 1.7, 'A'),
    _rock('gneiss_grey', 1.35, 1.5, (140, 140, 142), (104, 100, 98), (150, 150, 110), 'acid peaty', 0.15,
          ['heather', 'bog', 'lichen'], 1.7, 'A'),
    _rock('schist_soft', 0.70, 0.2, (120, 118, 120), (96, 86, 78), (120, 130, 100), 'acid peaty', 0.25,
          ['rush', 'bog', 'heather'], 0.9, 'A'),
    _rock('dyke_hard', 1.80, 3.0, (60, 62, 66), (74, 66, 60), (120, 110, 70), 'bare', 0.02,
          ['lichen'], 2.2, 'ABC'),
    _rock('sandstone_red', 0.75, 1.5, (170, 98, 80), (124, 76, 64), (160, 150, 110), 'loam', 0.4,
          ['turf', 'pasture', 'thrift'], 2.0, 'B'),
    _rock('sandstone_flag', 0.85, 0.3, (150, 104, 90), (110, 84, 74), (170, 160, 110), 'loam', 0.35,
          ['turf', 'pasture'], 2.2, 'B'),
    _rock('siltstone_soft', 0.50, 0.1, (150, 90, 76), (112, 78, 66), (130, 130, 90), 'loam', 0.5,
          ['pasture', 'rush meadow'], 0.8, 'B'),
    _rock('mudstone', 0.40, 0.05, (120, 84, 80), (96, 72, 68), (110, 120, 90), 'clay loam', 0.5,
          ['rush meadow', 'pasture'], 0.7, 'B'),
    _rock('basalt_columnar', 1.00, 0.8, (70, 72, 78), (104, 102, 104), (126, 126, 104), 'brown loam', 0.3,
          ['grass', 'thrift'], 3.0, 'C'),
    _rock('basalt_vesicular_top', 0.75, 0.4, (74, 68, 66), (100, 90, 80), (170, 150, 80), 'brown loam', 0.45,
          ['grass', 'heather'], 1.6, 'C'),
    _rock('bole_ash', 0.45, 0.1, (150, 76, 60), (130, 78, 62), (140, 130, 80), 'red clay', 0.4,
          ['rush meadow'], 0.7, 'C'),
    _rock('fault_breccia', 0.30, 0.05, (110, 96, 90), (96, 82, 74), (120, 120, 90), 'stony', 0.1,
          ['bare'], 0.8, 'ABC'),
    _rock('shell_sand', 0.10, 0.0, (232, 222, 190), (222, 210, 172), (222, 210, 172), 'lime sand', 0.6,
          ['marram', 'machair grass'], 0.55, 'deposit'),
    _rock('cobble_shingle', 0.30, 0.0, (150, 144, 136), (130, 124, 116), (140, 140, 120), 'stony', 0.05,
          ['bare'], 0.6, 'deposit'),
    # ---- province D (volcanic) additions: ids 14..20.  Colours (fresh, weathered, lichen) TUNING.
    _rock('basalt_fresh', 1.70, 1.0, (52, 50, 54), (86, 78, 74), (120, 112, 92), 'thin black soil', 0.05,
          ['lichen', 'moss'], 1.5, 'D'),
    _rock('basalt_weathered', 1.10, 0.8, (88, 72, 64), (128, 98, 78), (150, 130, 90), 'brown loam', 0.3,
          ['heather', 'grass'], 0.47, 'D'),
    _rock('scoria_red', 0.55, 0.2, (146, 66, 48), (122, 70, 54), (150, 120, 80), 'cinder', 0.05,
          ['bare'], 0.70, 'D'),
    _rock('ash_soil', 0.67, 0.1, (112, 92, 70), (96, 80, 60), (130, 120, 80), 'andosol (ash soil)', 0.8,
          ['grass', 'heather', 'birch scrub'], 0.70, 'D'),
    _rock('lava_flow', 1.43, 0.5, (34, 32, 36), (62, 56, 54), (130, 126, 100), 'none', 0.0,
          ['lichen', 'bare'], 1.0, 'D'),
    _rock('black_sand', 0.10, 0.0, (36, 36, 40), (46, 44, 48), (46, 44, 48), 'black sand', 0.5,
          ['marram'], 0.55, 'deposit'),
    _rock('obsidian_pumice', 1.00, 0.3, (214, 204, 176), (170, 160, 136), (40, 40, 46), 'pumice', 0.05,
          ['bare'], 0.70, 'D'),
]
R_GNEISS_P, R_GNEISS_G, R_SCHIST, R_DYKE, R_SST_RED, R_SST_FLAG, R_SILT, R_MUD, R_BAS, R_BAS_TOP, R_BOLE, \
    R_FAULT, R_SAND, R_COBBLE = range(14)
R_BASALT_F, R_BASALT_W, R_SCORIA, R_ASH, R_LAVA, R_BSAND, R_PUMICE = range(14, 21)
HARD = np.array([r['hardness'] for r in ROCKS])
ERODE = 1.0 / HARD
JOINT = np.array([r['joint_m'] for r in ROCKS])
SMAX = np.array([r['slope_max'] for r in ROCKS])

VEG_LEGEND = ['water', 'bare rock', 'lichen rock', 'heather', 'peat bog', 'machair', 'pasture', 'turf / thrift',
              'scrub', 'sand beach', 'shingle', 'rush meadow', 'loch',
              'coastal scrub', 'woodland', 'pine / birch belt', 'high scrub', 'bare lava', 'summit rock', 'bare ash']
V_WATER, V_BARE, V_LICHEN, V_HEATHER, V_BOG, V_MACHAIR, V_PASTURE, V_TURF, V_SCRUB, V_SAND, V_SHINGLE, \
    V_RUSH, V_LOCH = range(13)
V_D_COAST, V_D_WOOD, V_D_PINE, V_D_HIGH, V_D_LAVA, V_D_SUMMIT, V_D_ASH = range(13, 20)
VEG_RGB = np.array([(0, 0, 0), (0, 0, 0), (0, 0, 0), (132, 108, 92), (92, 104, 62), (128, 168, 82),
                    (112, 158, 78), (122, 150, 84), (78, 112, 66), (226, 214, 176), (142, 136, 126),
                    (108, 140, 92), (40, 96, 130),
                    (118, 128, 72), (56, 98, 60), (92, 118, 66), (138, 128, 90), (0, 0, 0), (0, 0, 0), (0, 0, 0)], dtype=np.float64)

# ----------------------------------------------------------------------------------------------
# Province parameters (all TUNING; the research note gives only qualitative rules)
# ----------------------------------------------------------------------------------------------
PROV = {
    'A': dict(name='gneiss', land=(0.13, 0.20), shelf=26.0, k_fluv=0.15, wave_k=0.33, sand=1.0,
              fault_depth=5.0, fault_w=2.6, sup_k=2.4, bio=1.56, thermal_passes=2, iters=24, n_wave=5),
    'B': dict(name='sandstone', land=(0.17, 0.25), shelf=20.0, k_fluv=0.23, wave_k=0.45, sand=0.45,
              fault_depth=4.0, fault_w=3.0, sup_k=2.4, bio=0.8, thermal_passes=2, iters=24, n_wave=5),
    'C': dict(name='basalt', land=(0.12, 0.18), shelf=36.0, k_fluv=0.38, wave_k=0.36, sand=0.12,
              fault_depth=11.0, fault_w=3.4, sup_k=1.2, bio=0.6, thermal_passes=2, iters=28, n_wave=5),
    # D (volcanic island): land fraction is not a cut here (the edifice sets it); the numbers are in D_* below
    'D': dict(name='volcanic', land=(0.30, 0.55), shelf=190.0, k_fluv=1.0, wave_k=0.30, sand=0.0,
              fault_depth=0.0, fault_w=1.0, sup_k=2.0, bio=0.0, thermal_passes=2, iters=32, n_wave=3),
}

# ----------------------------------------------------------------------------------------------
# Small numeric helpers
# ----------------------------------------------------------------------------------------------
def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def rot(x, y, th):
    c, s = math.cos(th), math.sin(th)
    return x * c + y * s, -x * s + y * c


def vnoise(rng, s, t, ls, lt):
    """Smooth value noise on a lattice with cell size ls (along s) and lt (along t) metres."""
    u = s / ls
    v = t / lt
    iu = np.floor(u)
    iv = np.floor(v)
    i0 = int(iu.min())
    j0 = int(iv.min())
    m = int(iu.max()) - i0 + 2
    q = int(iv.max()) - j0 + 2
    lat = rng.standard_normal((m, q)).ravel()
    fu = u - iu
    fv = v - iv
    fu = fu * fu * (3 - 2 * fu)
    fv = fv * fv * (3 - 2 * fv)
    a = (iu.astype(np.int64) - i0) * q + (iv.astype(np.int64) - j0)
    v00 = lat[a]
    v10 = lat[a + q]
    v01 = lat[a + 1]
    v11 = lat[a + q + 1]
    return (v00 * (1 - fu) + v10 * fu) * (1 - fv) + (v01 * (1 - fu) + v11 * fu) * fv


LMIN = 6.0     # smallest lattice cell (m): finer octaves would alias on a 2 m grid, and the world is the same at any n


def fbm(rng, s, t, ls, lt, octs=5, gain=0.55, lac=2.0, lmin=None):
    lmin = LMIN if lmin is None else lmin
    out = np.zeros_like(s)
    amp = 1.0
    tot = 0.0
    for k in range(octs):
        if k and min(ls, lt) < lmin:
            break
        out += amp * vnoise(rng, s, t, ls, lt)
        tot += amp * amp
        amp *= gain
        ls /= lac
        lt /= lac
    return out / math.sqrt(tot) / 0.62      # roughly unit variance (value noise std is about 0.62)


def _box1(a, r, axis):
    n = a.shape[axis]
    pad = [(0, 0), (0, 0)]
    pad[axis] = (r + 1, r)
    p = np.pad(a, pad, mode='edge')
    cs = np.cumsum(p, axis=axis, dtype=np.float64)
    z = np.zeros([1 if ax == axis else a.shape[ax] for ax in (0, 1)])
    cs = np.concatenate([z, cs], axis=axis)
    hi = [slice(None)] * 2
    lo = [slice(None)] * 2
    hi[axis] = slice(2 * r + 1, 2 * r + 1 + n)
    lo[axis] = slice(0, n)
    return (cs[tuple(hi)] - cs[tuple(lo)]) / (2 * r + 1)


def blur(a, r, passes=2):
    a = a.astype(np.float64)
    for _ in range(passes):
        a = _box1(_box1(a, r, 0), r, 1)
    return a


def shift(a, di, dj, fill=0.0):
    """out[i, j] = a[i+di, j+dj] with fill outside."""
    n, m = a.shape
    out = np.full_like(a, fill)
    i0, i1 = max(0, -di), min(n, n - di)
    j0, j1 = max(0, -dj), min(m, m - dj)
    if i1 > i0 and j1 > j0:
        out[i0:i1, j0:j1] = a[i0 + di:i1 + di, j0 + dj:j1 + dj]
    return out


def blur_dir(a, th, k):
    """Average along direction th (maths angle), +-k cells."""
    acc = np.zeros_like(a)
    for q in range(-k, k + 1):
        acc += shift(a, int(round(q * math.sin(th))), int(round(q * math.cos(th))), fill=0.0)
    out = acc / (2 * k + 1)
    return out


def label4(mask):
    """4-connected components; returns int32 label array (0 = none) and count."""
    n, m = mask.shape
    w = m + 2
    mp = np.zeros((n + 2, w), dtype=bool)
    mp[1:-1, 1:-1] = mask
    flat = mp.ravel().tolist()
    lab = [0] * len(flat)
    idx = np.flatnonzero(mp.ravel()).tolist()
    cur = 0
    for s in idx:
        if lab[s]:
            continue
        cur += 1
        lab[s] = cur
        st = [s]
        pop = st.pop
        push = st.append
        while st:
            c = pop()
            for nb in (c - 1, c + 1, c - w, c + w):
                if flat[nb] and not lab[nb]:
                    lab[nb] = cur
                    push(nb)
    out = np.array(lab, dtype=np.int32).reshape(n + 2, w)[1:-1, 1:-1]
    return out, cur


# ----------------------------------------------------------------------------------------------
# Shared structure of the whole field (this is what makes neighbouring islands relate)
# ----------------------------------------------------------------------------------------------
def make_structure(seed, prov, size_m):
    r = np.random.default_rng([int(seed), ord(prov), 11])
    st = {'province': prov}
    st['wave_from'] = math.pi + math.radians(r.uniform(-30, 30))      # waves arrive from the west (+-30)
    half = size_m / 2.0
    faults = []
    if prov == 'A':
        flow = r.uniform(0, 2 * math.pi)                              # ice-flow direction (towards)
        st['flow'] = flow
        st['dip_dir'] = flow + math.radians(r.uniform(-30, 30))        # foliation dip / crustal tilt direction
        st['dip_deg'] = float(r.uniform(35, 70))
        st['tilt_m'] = float(r.uniform(5, 8))                         # high side up-flow, gentle side down-flow
        for k in range(5):
            base = flow + math.radians(60 if k < 3 else 125)
            faults.append(dict(theta=base + math.radians(r.uniform(-12, 12)), offset=r.uniform(-0.5, 0.5) * size_m,
                               throw=float(r.choice([-1, 1]) * r.uniform(8, 26))))
    elif prov == 'B':
        st['dip_dir'] = r.uniform(0, 2 * math.pi)
        st['strike'] = st['dip_dir'] + math.pi / 2
        st['dip_deg'] = float(r.uniform(3, 7))
        st['tilt_m'] = float(r.uniform(2, 4))
        st['flow'] = st['dip_dir']
        for k in range(3):
            faults.append(dict(theta=st['strike'] + math.radians(r.choice([-1, 1]) * r.uniform(22, 40)),
                               offset=r.uniform(-0.45, 0.45) * size_m,
                               throw=float(r.choice([-1, 1]) * r.uniform(25, 55))))
    else:
        st['dip_dir'] = r.uniform(0, 2 * math.pi)
        st['dip_deg'] = float(r.uniform(0.5, 2.0))
        st['tilt_m'] = float(r.uniform(4, 8))
        st['flow'] = st['dip_dir']
        trend = r.uniform(0, math.pi)
        st['dyke_trend'] = trend
        pos = np.sort(r.uniform(-0.55, 0.55, 6)) * size_m
        for k in range(6):
            faults.append(dict(theta=trend + math.radians(r.uniform(-3, 3)), offset=float(pos[k]),
                               throw=float(r.uniform(-3, 3))))
        for k in range(2):
            faults.append(dict(theta=trend + math.pi / 2 + math.radians(r.uniform(-12, 12)),
                               offset=r.uniform(-0.4, 0.4) * size_m, throw=float(r.uniform(-4, 4))))
    st['faults'] = faults
    st['land_frac'] = float(PROV[prov]['land'][0] + (PROV[prov]['land'][1] - PROV[prov]['land'][0]) * r.random())
    return st


def fault_dist(X, Y, f):
    return -X * math.sin(f['theta']) + Y * math.cos(f['theta']) - f['offset']


# ----------------------------------------------------------------------------------------------
# Step 2: rock map
# ----------------------------------------------------------------------------------------------
def _bands(rng, L, kinds):
    """kinds: list of (rock_id, weight, wmin, wmax).  Returns (bounds, ids)."""
    w = np.array([k[1] for k in kinds], float)
    w /= w.sum()
    pos = -L
    bounds, ids = [], []
    while pos < L:
        k = kinds[int(rng.choice(len(kinds), p=w))]
        pos += rng.uniform(k[2], k[3])
        bounds.append(pos)
        ids.append(k[0])
    return np.array(bounds), np.array(ids, dtype=np.uint8)


def rock_map(ctx):
    X, Y, st, prov, rng = ctx['X'], ctx['Y'], ctx['st'], ctx['prov'], ctx['rng_r']
    u = X * math.cos(st['dip_dir']) + Y * math.sin(st['dip_dir'])
    shifts = np.zeros_like(u)
    fd = []
    for f in st['faults']:
        d = fault_dist(X, Y, f)
        fd.append(d)
        shifts += f['throw'] * np.tanh(d / 5.0) * 0.5
    ctx['u_shift'] = u + shifts
    ctx['fault_d'] = fd
    L = ctx['size'] * 0.9
    warp = 12.0 * fbm(rng, X, Y, 150.0, 150.0, 3, 0.5)
    if prov == 'A':
        kinds = [(R_GNEISS_P, 0.34, 35, 110), (R_GNEISS_G, 0.38, 35, 100), (R_SCHIST, 0.18, 14, 38), (R_DYKE, 0.10, 4, 10)]
        bounds, ids = _bands(rng, L, kinds)
        rid = ids[np.clip(np.searchsorted(bounds, ctx['u_shift'] + warp), 0, len(ids) - 1)]
    elif prov == 'B':
        kinds = [(R_SST_RED, 0.34, 28, 70), (R_SILT, 0.22, 12, 30), (R_SST_FLAG, 0.28, 18, 45), (R_MUD, 0.16, 8, 22)]
        bounds, ids = _bands(rng, L, kinds)
        rid = ids[np.clip(np.searchsorted(bounds, ctx['u_shift'] + warp), 0, len(ids) - 1)]
    else:
        rid = np.full(X.shape, R_BAS, dtype=np.uint8)        # refined after the trap terraces exist (needs z)
    return rid.astype(np.uint8)


def stamp_faults(ctx, rid, width_m):
    out = rid.copy()
    for d in ctx['fault_d']:
        out[np.abs(d) < width_m] = R_FAULT
    return out


def fault_trench(ctx, depth, width):
    """Narrow, segmented trenches along the faults (geos where they meet the sea)."""
    X, Y, rng = ctx['X'], ctx['Y'], ctx['rng_h']
    tr = np.zeros_like(X)
    for f, d in zip(ctx['st']['faults'], ctx['fault_d']):
        sl, _ = rot(X, Y, f['theta'])
        seg = 0.55 + 0.45 * np.tanh(1.6 * fbm(rng, sl, d, 70.0, 70.0, 2, 0.5))      # broken along strike
        tr += depth * np.exp(-(d / width) ** 2) * np.clip(seg, 0, 1)
    return tr


# ----------------------------------------------------------------------------------------------
# Province height builders: return the pre-datum height (m) and extra info.  Datum (sea level cut)
# is set by quantile afterwards (step 5a) so land fraction is a seeded property of the province.
# ----------------------------------------------------------------------------------------------
def _edge_taper(ctx, strength=24.0):
    r = np.maximum(np.abs(ctx['X']), np.abs(ctx['Y'])) / (ctx['size'] / 2.0)
    return strength * smoothstep(0.70, 1.0, r) ** 1.2


def build_A(ctx, hard_s):
    X, Y, st, rng = ctx['X'], ctx['Y'], ctx['st'], ctx['rng_h']
    f = st['flow']
    s, t = rot(X, Y, f)
    big = fbm(rng, X, Y, 360.0, 360.0, 3, 0.6)
    half = ctx['size'] / 2.0
    tilt = -(s / half) * st['tilt_m'] * 0.5
    # glacially streamlined knolls: noise stretched along the ice-flow direction (whalebacks / knock-and-lochan)
    w1 = fbm(rng, s, t, 170.0, 56.0, 4, 0.6, lmin=14.0)
    coarse = 3.5 * big + tilt + 7.0 * w1 + 1.1 * (hard_s - 1.1)
    soft = np.clip(1.15 - hard_s, 0, 1)
    coarse -= 5.0 * blur_dir(soft, f, 5)                          # glacial scour of soft rock, smeared along flow
    # finer streaked set that makes the skerries; subdued on high ground
    w2 = fbm(rng, s, t, 46.0, 15.0, 3, 0.7, lmin=8.0)
    w3 = fbm(rng, s, t, 26.0, 9.0, 2, 0.7, lmin=8.0)
    env = fine_envelope(coarse, st['land_frac'], 4.5, 0.28)
    H = coarse + env * (5.6 * w2 + 3.6 * w3)
    # troughs along the flow (fjord / voe like), with a shallow lip at the downstream end
    for k in range(3):
        c = rng.uniform(-0.45, 0.45) * ctx['size']
        s0 = rng.uniform(-0.55, 0.0) * ctx['size']
        L = rng.uniform(0.35, 0.65) * ctx['size']
        wd = rng.uniform(16, 30)
        along = smoothstep(s0, s0 + 0.3 * L, s) * (1 - smoothstep(s0 + 0.75 * L, s0 + L, s))
        lip = 1.0 - 0.55 * np.exp(-((s - (s0 + L * 0.92)) / 22.0) ** 2)
        H -= 9.0 * np.exp(-((t - c) / wd) ** 2) * along * lip
    H -= _edge_taper(ctx)
    return H


def build_B(ctx, hard_s):
    X, Y, st, rng = ctx['X'], ctx['Y'], ctx['st'], ctx['rng_h']
    dd = st['dip_dir']
    u, v = rot(X, Y, dd)
    u = ctx['u_shift']                                              # faults throw the beds sideways along dip
    sk, tk = rot(X, Y, st['strike'])                                # s along strike
    half = ctx['size'] / 2.0
    tilt = -(rot(X, Y, dd)[0] / half) * st['tilt_m'] * 0.5
    topo = 6.0 * fbm(rng, X, Y, 210.0, 210.0, 5, 0.66)
    rm = 0.5 + 0.5 * np.tanh(1.4 * fbm(rng, sk, tk, 170.0, 55.0, 3, 0.5))
    lam = rng.uniform(85, 135)
    ph = u / lam + 0.12 * fbm(rng, X, Y, 140.0, 140.0, 2, 0.5)
    p = ph - np.floor(ph)
    saw = np.where(p < 0.2, p / 0.2, 1.0 - (p - 0.2) / 0.8) ** 1.25           # steep scarp up-dip, long dip slope
    fine = 5.0 * fbm(rng, sk, tk, 60.0, 20.0, 3, 0.7, lmin=9.0)
    coarse = topo + tilt + 13.0 * saw * (0.25 + 0.75 * rm)
    H = coarse + fine_envelope(coarse, st['land_frac'], 4.0, 0.25) * fine * 1.3
    H += 3.0 * (hard_s - 0.65)
    H -= _edge_taper(ctx)
    return H


# Province C relief constants (TUNING): unchanged from v0, so the coast, the islands and every statistic of the heightfield at the cut are the v0 ones.
# C_RELIEF compresses the land above C_RELIEF_FROM metres after all the erosion (the 512 m world squeezes real relief into a few tens of metres horizontally,
# which gave 48 degree median slopes: red cones). The shoreline contour does not move.
C_RELIEF, C_RELIEF_FROM = 0.45, 1.5
C_COARSE, CAMP_REL2, CAMP_REL3 = 28.0, 20.0, 10.0
C_TREAD_M, C_RISER_W = 7.0, 0.10
C_BOLE_BAND, C_BOLE_PATCH = (0.10, 0.12), 0.965     # patch share of the noise field that becomes bole soil on treads


def rock_visible(fr, X, Y, seed, prov):
    """province C output rock map from the lava-stack phase fr (0 on the flat tread = flow top, 0..1 up the riser): tread = vesicular flow top (brown
    loam, grass), riser = columnar basalt (dark grey, joints), a thin red bole band at the foot of each riser, bole-soil patches on a few treads."""
    rid = np.where(fr < 0.10, R_BAS_TOP, np.where(fr < C_BOLE_BAND[1], R_BOLE, R_BAS)).astype(np.uint8)
    patch = fbm(np.random.default_rng([seed, ord(prov), 55]), X, Y, 26.0, 26.0, 3, 0.55)
    return np.where((fr < 0.10) & (patch > np.quantile(patch, C_BOLE_PATCH)), R_BOLE, rid).astype(np.uint8)


def build_C(ctx, hard_s):
    X, Y, st, rng = ctx['X'], ctx['Y'], ctx['st'], ctx['rng_h']
    s, t = rot(X, Y, st['dip_dir'])
    half = ctx['size'] / 2.0
    tilt = -(s / half) * st['tilt_m'] * 0.5
    P = fbm(rng, s, t, 300.0, 200.0, 4, 0.55)
    P2 = fbm(rng, s, t, 70.0, 48.0, 3, 0.7, lmin=12.0)
    P3 = fbm(rng, s, t, 34.0, 24.0, 2, 0.7, lmin=12.0)
    coarse = C_COARSE * P + tilt
    H = coarse + fine_envelope(coarse, st['land_frac'], 5.0, 0.5) * (CAMP_REL2 * P2 + CAMP_REL3 * P3)
    H -= _edge_taper(ctx, 30.0)
    return H


def fine_envelope(coarse, land_frac, scale=3.5, floor=0.08):
    """Fine-scale relief is strongest near and below the cut (skerries, reefs, knock-and-lochan lowland) and
    subdued on high ground (smooth hills); this keeps slopes sane while giving many small islets."""
    thr = np.quantile(coarse, 1.0 - land_frac)
    return np.exp(-np.maximum(coarse - thr, 0.0) / scale) * (1 - floor) + floor


def terrace(H, tb, wmap, phase):
    z = (H - phase) / tb
    k = np.floor(z)
    fr = z - k
    r = smoothstep(1.0 - wmap, 1.0, fr)
    return (k + r) * tb + phase


# ----------------------------------------------------------------------------------------------
# Step 4: D8 flow accumulation + stream power + thermal relaxation
# ----------------------------------------------------------------------------------------------
_NB8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def d8(h):
    n = h.shape[0]
    hp = np.pad(h, 1, constant_values=np.inf)
    idx = np.arange(n * n).reshape(n, n)
    best = np.zeros_like(h)
    rec = idx.copy()
    for di, dj in _NB8:
        nb = hp[1 + di:1 + di + n, 1 + dj:1 + dj + n]
        dist = 1.41421356 if (di and dj) else 1.0
        s = (h - nb) / dist
        m = s > best
        best = np.where(m, s, best)
        rec = np.where(m, idx + di * n + dj, rec)
    return rec.ravel(), best


def flow_accum(h, rec, floor=-0.5):
    flat = h.ravel()
    land = np.flatnonzero(flat > floor)
    order = land[np.argsort(-flat[land], kind='stable')].tolist()
    acc = (flat > floor).astype(np.float64).tolist()
    rl = rec.tolist()
    for i in order:
        r = rl[i]
        if r != i:
            acc[r] += acc[i]
    return np.array(acc).reshape(h.shape)


def thermal(h, tmax, dx, passes):
    for _ in range(passes):
        for ax in (0, 1):
            if ax == 0:
                d = h[1:] - h[:-1]
                lim = np.minimum(tmax[1:], tmax[:-1]) * dx
            else:
                d = h[:, 1:] - h[:, :-1]
                lim = np.minimum(tmax[:, 1:], tmax[:, :-1]) * dx
            ex = np.abs(d) - lim
            mv = np.where(ex > 0, 0.3 * ex * np.sign(d), 0.0)
            if ax == 0:
                h[1:] -= mv
                h[:-1] += mv
            else:
                h[:, 1:] -= mv
                h[:, :-1] += mv
    return h


def fluvial(h, rock, dx, kf, iters, passes, z=0.0):
    erod = ERODE[rock]
    tmax = SMAX[rock]
    tmax = np.where(h < z - 1.0, 0.9, tmax)
    cell = dx * dx
    for _ in range(iters):
        rec, slope = d8(h)
        A = flow_accum(h, rec) * cell
        hr = h.ravel()[rec].reshape(h.shape)
        S = slope / dx
        dh = kf * 0.012 * erod * np.sqrt(A) * S * (h > z + 0.25)
        dh = np.minimum(dh, 0.4 * np.maximum(h - hr, 0.0))
        h -= dh
        thermal(h, tmax, dx, passes)
    return h


# ----------------------------------------------------------------------------------------------
# Step 6: exposure by fetch rays (16 bearings), wave erosion; step 7: lee deposition
# ----------------------------------------------------------------------------------------------
def exposure(land, dx, wave_from, fmax_m, nb=16):
    n = land.shape[0]
    fmax = max(4, int(fmax_m / dx))
    steps = []
    s = 1
    while s < fmax:
        steps.append(s)
        s = s + 1 if s < 6 else int(s * 1.3) + 1
    steps.append(fmax)
    P = fmax + 1
    water = np.pad(~land, P, constant_values=True)
    E = np.zeros(land.shape)
    wsum = 0.0
    for k in range(nb):
        phi = 2 * math.pi * k / nb
        wgt = 0.2 + 0.8 * math.cos((phi - wave_from) / 2.0) ** 2
        alive = np.ones(land.shape, dtype=bool)
        run = np.zeros(land.shape)
        prev = 0
        for s in steps:
            di = int(round(s * math.sin(phi)))
            dj = int(round(s * math.cos(phi)))
            alive &= water[P + di:P + di + n, P + dj:P + dj + n]
            run += alive * (s - prev)
            prev = s
        E += wgt * run / fmax
        wsum += wgt
    return E / wsum


def wave_and_deposit(h, rock, dx, st, par, rng_unused, z=0.0):
    """One wave-erosion + lee-deposition round.  Returns (h, sand_deposit_thickness)."""
    erod = ERODE[rock]
    jf = (1.5 / (0.3 + JOINT[rock])) ** 0.3
    land = h > z
    E = exposure(land, dx, st['wave_from'], 0.4 * h.shape[0] * dx)
    wf = blur((~land).astype(np.float64), 3, 1)
    zone = wf > 0.10
    band = np.where(h >= z, np.exp(-np.maximum(h - z, 0) / 4.5), np.exp(-(z - h) / 3.2))
    e = par['wave_k'] * 0.55 * E * erod * jf * zone * band
    e = np.minimum(e, 0.9)
    h = h - e
    # sediment budget: eroded rock + biogenic shell sand where the province has it
    V = e
    sup = blur(V, 9, 2)
    di = int(round(5 * math.sin(st['wave_from'] + math.pi)))
    dj = int(round(5 * math.cos(st['wave_from'] + math.pi)))
    sup = shift(sup, -di, -dj)                                    # drift towards the lee
    enclosure = np.clip(blur(land.astype(np.float64), 5, 1) * 2.8, 0, 1)
    shallow = smoothstep(-4.0, -0.8, h - z) * (1.0 - smoothstep(0.5, 1.3, h - z))
    Lw = (1.0 - E) ** 2.0 * shallow * (0.35 + 1.0 * enclosure)
    near = blur(land.astype(np.float64), 14, 1) > 0.02
    Lw = Lw * near
    D = (par['sup_k'] * sup + par['sand'] * par['bio'] * 0.05) * Lw
    D = np.minimum(D, 0.8)
    h = h + D
    return h, D, E


# ----------------------------------------------------------------------------------------------
# Island finding (the only place an island exists)
# ----------------------------------------------------------------------------------------------
MIN_CELLS = 4


def _island_stats(h, lab, count, dx):
    n = h.shape[0]
    cnt = np.bincount(lab.ravel(), minlength=count + 1)
    return cnt


class World:
    pass


def find_islands(w, level=None, tide=None):
    """Label land (h > level) and return island list sorted by area (id 1 = largest).
    level defaults to the world's sea level; tide shifts the cut (+ high water, - low water)."""
    lv = (w.sea_level if level is None else level) + (0.0 if tide is None else tide)
    return _islands_at(w.height.astype(np.float64), lv, w.dx)


def _islands_at(h, lv, dx):
    mask = h > lv
    lab, cnt = label4(mask)
    c = np.bincount(lab.ravel(), minlength=cnt + 1)
    keep = [i for i in range(1, cnt + 1) if c[i] >= MIN_CELLS]
    keep.sort(key=lambda i: (-c[i], i))
    remap = np.zeros(cnt + 1, dtype=np.int32)
    for new, old in enumerate(keep, 1):
        remap[old] = new
    lab2 = remap[lab]
    return lab2, len(keep)


def _stats(w, lab, nisl, lab_low, lab_high, nl, nh, E):
    h = w.height.astype(np.float64)
    n = h.shape[0]
    dx = w.dx
    X, Y = w.X, w.Y
    lv = w.sea_level
    flat = lab.ravel()
    area = np.bincount(flat, minlength=nisl + 1)
    sx = np.bincount(flat, weights=X.ravel(), minlength=nisl + 1)
    sy = np.bincount(flat, weights=Y.ravel(), minlength=nisl + 1)
    land = lab > 0
    # coast edges (4-neighbour land/water edges) with Manhattan-to-Euclid correction 1/1.273
    edges = np.zeros(h.shape)
    for ax in (0, 1):
        for sg in (1, -1):
            sh = np.roll(land, sg, axis=ax)
            if ax == 0:
                sh[0 if sg == 1 else -1, :] = True
            else:
                sh[:, 0 if sg == 1 else -1] = True
            edges += (land & ~sh)
    coast = np.bincount(flat, weights=edges.ravel(), minlength=nisl + 1) * dx * 0.785
    maxh = np.zeros(nisl + 1)
    pk = np.zeros(nisl + 1, dtype=np.int64)
    order = np.argsort(h.ravel())
    for i in order[np.isin(flat[order], np.arange(1, nisl + 1))][::1]:
        pk[flat[i]] = i                                       # ascending sweep leaves the highest cell last
    for i in range(1, nisl + 1):
        maxh[i] = h.ravel()[pk[i]] - lv
    nr = len(ROCKS)
    mix = np.bincount((flat * nr + w.rock.ravel().astype(np.int64))[flat > 0], minlength=(nisl + 1) * nr).reshape(nisl + 1, nr)
    # tide behaviour
    lowid = lab_low.ravel()[pk]
    low_area = np.bincount(lab_low.ravel(), minlength=nl + 1) * dx * dx
    hi_flat = lab_high.ravel()
    isl = []
    for i in range(1, nisl + 1):
        a = area[i] * dx * dx
        cells = flat == i
        hi_cells = hi_flat[cells]
        hi_pieces = len(np.unique(hi_cells[hi_cells > 0]))
        a_hi = float((hi_cells > 0).sum() * dx * dx)
        merged = sorted({int(j) for j in np.unique(flat[(lab_low.ravel() == lowid[i])]) if j > 0 and j != i})
        mx = (mix[i] / max(mix[i].sum(), 1))
        rock_mix = {ROCKS[k]['name']: round(float(mx[k]), 3) for k in np.argsort(-mx) if mx[k] >= 0.02}
        cls = 'large' if a > 12000 else 'medium' if a > 2500 else 'small' if a > 500 else 'skerry'
        isl.append(dict(id=i, area_m2=float(a), centroid=(float(sx[i] / area[i]), float(sy[i] / area[i])),
                        max_height_m=float(maxh[i]), peak_xy=(float(X.ravel()[pk[i]]), float(Y.ravel()[pk[i]])),
                        coast_length_m=float(coast[i]), rock_mix=rock_mix, size_class=cls,
                        area_low_tide_m2=float(low_area[lowid[i]]), area_high_tide_m2=a_hi,
                        joins_at_low_tide=merged, pieces_at_high_tide=int(hi_pieces),
                        landing_candidates=[]))
    return isl


def landing_candidates(w, lab, E):
    """Gentle, lee-side shore cells with enough water offshore; clustered along the coast."""
    h = w.height.astype(np.float64)
    dx = w.dx
    land = lab > 0
    gy, gx = np.gradient(blur(h, 1, 1), dx)
    slope = np.hypot(gx, gy)
    water = ~land
    shore = land & (np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1))
    # water depth reachable offshore: deepest of water cells within 4 cells must exceed 0.8 m and sea level is at w.sea_level
    dep = np.zeros(h.shape)
    for di in range(-4, 5):
        for dj in range(-4, 5):
            if di * di + dj * dj <= 16:
                dep = np.maximum(dep, shift(np.where(water, w.sea_level - h, 0.0), di, dj))
    ok = shore & (slope < 0.38) & (E < 0.45) & (dep > 0.8) & (dep < 14)
    cl, nc = label4(ok)
    out = []
    flatc = cl.ravel()
    for c in range(1, nc + 1):
        idx = np.flatnonzero(flatc == c)
        if len(idx) < 3:
            continue
        rr, cc = np.divmod(idx, h.shape[1])
        x = float(w.X[rr, cc].mean())
        y = float(w.Y[rr, cc].mean())
        isl = int(lab[rr[0], cc[0]])
        rm = int(np.bincount(w.rock[rr, cc]).argmax())
        sl = float(slope[rr, cc].mean())
        # outward normal: points down slope across the coast = from land centroid of a 5x5 window towards water
        r0, c0 = int(rr.mean()), int(cc.mean())
        r1, r2 = max(0, r0 - 4), min(h.shape[0], r0 + 5)
        c1, c2 = max(0, c0 - 4), min(h.shape[1], c0 + 5)
        wm = water[r1:r2, c1:c2]
        yy, xx = np.mgrid[r1:r2, c1:c2]
        nx = float((xx[wm] - c0).mean()) if wm.any() else 0.0
        ny = float((yy[wm] - r0).mean()) if wm.any() else 0.0
        kind = 'sand' if rm == R_SAND else 'shingle' if rm == R_COBBLE else ('rock ledge' if sl > 0.2 else 'gentle rock/turf')
        out.append(dict(island=isl, xy=(x, y), length_m=float(len(idx) * dx), slope=sl,
                        exposure=float(E[rr, cc].mean()), kind=kind, facing_deg=float(math.degrees(math.atan2(ny, nx)) % 360),
                        dry_flat_width_m=float(2 * TIDE_AMP / max(sl, 0.02))))
    return out


# ----------------------------------------------------------------------------------------------
# Step 8: wetness, soils, vegetation, colour
# ----------------------------------------------------------------------------------------------
def lakes_and_wetness(h, rock, rec_acc, dx, z=0.0):
    """Priority-flood fill of land depressions only (outlet = sea).  Returns lake depth map and wetness."""
    import heapq
    n = h.shape[0]
    land = h > z
    fill = np.full(h.shape, np.inf)
    fl = fill.ravel()
    hl = h.ravel().tolist()
    land_l = land.ravel().tolist()
    fl = [np.inf] * (n * n)
    seen = [False] * (n * n)
    heap = []
    # seeds: land cells with a non-land 4-neighbour or on the border
    for i in np.flatnonzero(land.ravel()).tolist():
        r, c = divmod(i, n)
        if r == 0 or c == 0 or r == n - 1 or c == n - 1 or not (land_l[i - 1] and land_l[i + 1] and land_l[i - n] and land_l[i + n]):
            fl[i] = hl[i]
            seen[i] = True
            heap.append((hl[i], i))
    heapq.heapify(heap)
    while heap:
        lv, i = heapq.heappop(heap)
        r, c = divmod(i, n)
        for j, ok in ((i - 1, c > 0), (i + 1, c < n - 1), (i - n, r > 0), (i + n, r < n - 1)):
            if ok and land_l[j] and not seen[j]:
                seen[j] = True
                nl = hl[j] if hl[j] > lv else lv
                fl[j] = nl
                heapq.heappush(heap, (nl, j))
    filled = np.array(fl).reshape(n, n)
    filled[~land] = h[~land]
    lake = np.where(land, np.maximum(filled - h, 0.0), 0.0)
    lake[lake < 0.15] = 0.0
    gy, gx = np.gradient(h, dx)
    slope = np.hypot(gx, gy)
    la = np.log1p(rec_acc)
    la = la / max(la.max(), 1e-9)
    wet = np.clip(0.55 * blur(la, 2, 1) * 1.6 + 0.45 * (1 - np.clip(slope / 0.3, 0, 1)) * 0.8 + (lake > 0) * 1.0, 0, 1)
    wet = np.where(land, wet, 1.0)
    return lake, wet, slope


def classify_surface(w, dep, E):
    h = w.height.astype(np.float64)
    land = h > 0
    slope = w.slope
    rock = w.rock
    prov = w.province
    hh = np.maximum(h, 0)
    coastal = blur(np.where(land, 0.0, 1.0), 2, 1) > 0.0
    # wind exposure inland: normalised convolution of shore exposure, decays with distance from the coast
    shore = (land & (blur((~land).astype(np.float64), 1, 1) > 0.05)).astype(np.float64)
    num = blur(E * shore, 7, 2)
    den = blur(shore, 7, 2)
    Ew = np.where(den > 1e-6, num / np.maximum(den, 1e-6), 0.0)
    Ew = np.clip(Ew * np.exp(-blur(np.where(land, 1.0, 0.0), 14, 1) * 0.5) * 1.0 + 0.4 * smoothstep(4, 25, hh), 0, 1)
    wet = w.wetness
    veg = np.zeros(h.shape, dtype=np.uint8)
    if prov == 'A':
        veg[:] = V_HEATHER
        veg[(wet > 0.62) & (slope < 0.22)] = V_BOG
        veg[(wet > 0.78) & (slope < 0.12)] = V_RUSH
        veg[(slope > 0.9) | (Ew > 0.8)] = V_LICHEN
        veg[slope > 1.3] = V_BARE
        sheltered = (Ew < 0.22) & (slope < 0.3) & (hh < 9) & (wet < 0.6)
        veg[sheltered] = V_SCRUB
    elif prov == 'B':
        veg[:] = V_PASTURE
        veg[Ew > 0.5] = V_TURF
        veg[(wet > 0.72) & (slope < 0.2)] = V_RUSH
        veg[slope > 0.8] = V_LICHEN
        veg[slope > 1.4] = V_BARE
        veg[(Ew < 0.2) & (slope < 0.25) & (hh < 10) & (wet < 0.65)] = V_PASTURE
    else:
        veg[:] = V_TURF
        veg[(slope < 0.35) & (Ew < 0.55)] = V_PASTURE
        veg[(slope < 0.30) & (Ew < 0.78) & (hh > 1.2)] = V_PASTURE          # flat flow tops are grass (plateaus)
        veg[(wet > 0.75) & (slope < 0.25)] = V_RUSH
        veg[slope > 1.0] = V_LICHEN
        veg[slope > 1.8] = V_BARE
        veg[(Ew < 0.18) & (slope > 0.3) & (slope < 0.9) & (hh < 20)] = V_SCRUB
    veg[rock == R_SAND] = np.where(h[rock == R_SAND] < 1.4, V_SAND, V_MACHAIR)
    veg[rock == R_COBBLE] = V_SHINGLE
    veg[w.lake_depth > 0] = V_LOCH
    veg[~land] = V_WATER
    return veg, Ew


def surface_colour(w):
    """uint8 RGB of the land surface (rock + vegetation), for plan views / texture baking."""
    if getattr(w, 'province', '') == 'D':
        return surface_colour_D(w)
    veg = w.veg.astype(np.int64)
    base = VEG_RGB[veg].copy()
    rk = w.rock.astype(np.int64)
    weath = np.array([r['colour_weathered'] for r in ROCKS], dtype=np.float64)[rk]
    lich = np.array([r['colour_lichen'] for r in ROCKS], dtype=np.float64)[rk]
    fresh = np.array([r['colour_fresh'] for r in ROCKS], dtype=np.float64)[rk]
    bare = (veg == V_BARE)[..., None]
    lichen = (veg == V_LICHEN)[..., None]
    vegd = ~(bare | lichen)
    col = np.where(bare, 0.75 * weath + 0.25 * fresh, base)
    col = np.where(lichen, 0.62 * weath + 0.18 * lich + 0.2 * fresh, col)
    col = np.where(vegd, 0.82 * base + 0.18 * weath, col)
    return np.clip(col, 0, 255).astype(np.uint8)


# ----------------------------------------------------------------------------------------------
# Stacks, arches, geos (features a heightfield cannot fully hold are flagged for the mesh builder)
# ----------------------------------------------------------------------------------------------
def add_stacks(w, h, E, rng, par):
    dx = w.dx
    n = h.shape[0]
    land = h > 0
    X, Y = w.X, w.Y
    water_f = blur((~land).astype(np.float64), 3, 1)
    Ed = np.zeros_like(E)
    for di in range(-3, 4):
        for dj in range(-3, 4):
            Ed = np.maximum(Ed, shift(E, di, dj))
    cliff = land & (h > 4) & (water_f > 0.03) & (Ed > 0.5)
    cells = np.flatnonzero(cliff.ravel())
    feats = {'stacks': [], 'arches': [], 'geos': []}
    if len(cells) == 0:
        return h, feats
    gy, gx = np.gradient(blur(land.astype(np.float64), 3, 1), dx)
    want = int(np.clip(len(cells) * dx / 40.0, 2, 14))
    chosen = rng.choice(cells, size=min(want, len(cells)), replace=False)
    wave_dx = math.cos(w.structure['wave_from'])
    for ci in chosen:
        r, c = divmod(int(ci), n)
        gn = math.hypot(gx[r, c], gy[r, c])
        if gn < 1e-6:
            continue
        nx, ny = -gx[r, c] / gn, -gy[r, c] / gn                       # outward (towards water)
        dist = rng.uniform(7, 14)                                      # metres offshore
        rad = rng.uniform(3.0, 6.5)
        px, py = X[r, c] + nx * dist, Y[r, c] + ny * dist
        pr, pc = int(round((py + w.size_m / 2) / dx)), int(round((px + w.size_m / 2) / dx))
        if not (6 < pr < n - 6 and 6 < pc < n - 6):
            continue
        if h[pr, pc] < -14 or h[pr, pc] > 0:
            continue
        top = float(h[r, c]) * rng.uniform(0.55, 0.85)
        d2 = np.hypot(X - px, Y - py)
        prof = top * (1.0 - smoothstep(rad * 0.65, rad * 1.1, d2))
        h = np.maximum(h, np.where(d2 < rad * 1.2, prof + 0.0, -1e9))
        arch = rng.random() < 0.35
        feats['stacks'].append(dict(xy=(float(px), float(py)), radius_m=float(rad), top_m=float(top), arch=bool(arch)))
        if arch:
            # a low natural bridge back to the cliff: heightfield keeps a saddle just above high water,
            # the mesh builder must cut the opening (flagged)
            for q in np.linspace(0.0, 1.0, 12):
                bx, by = X[r, c] + nx * dist * q, Y[r, c] + ny * dist * q
                d3 = np.hypot(X - bx, Y - by)
                h = np.maximum(h, np.where(d3 < 2.0, top * 0.35 + 1.5, -1e9))
            feats['arches'].append(dict(xy=(float((X[r, c] + px) / 2), float((Y[r, c] + py) / 2)),
                                        axis_deg=float(math.degrees(math.atan2(ny, nx)) % 360), span_m=float(dist),
                                        needs_mesh_opening=True))
    return h, feats


def find_geos(w, h):
    out = []
    for f in w.structure['faults']:
        th = f['theta']
        ux, uy = math.cos(th), math.sin(th)
        px, py = -math.sin(th) * f['offset'] * -1.0, 0.0
        # point on the line: offset along the normal (-sin, cos)
        bx, by = -math.sin(th) * f['offset'], math.cos(th) * f['offset']
        prev = None
        for q in np.arange(-w.size_m / 2, w.size_m / 2, w.dx):
            x, y = bx + ux * q, by + uy * q
            if abs(x) >= w.size_m / 2 - 2 or abs(y) >= w.size_m / 2 - 2:
                prev = None
                continue
            j = int(round((x + w.size_m / 2) / w.dx))
            i = int(round((y + w.size_m / 2) / w.dx))
            is_land = h[i, j] > 0
            if prev is not None and prev != is_land:
                out.append(dict(xy=(float(x), float(y)), bearing_deg=float(math.degrees(th) % 180)))
            prev = is_land
    return out


# ----------------------------------------------------------------------------------------------
# The main entry point
# ----------------------------------------------------------------------------------------------
def _norm_prov(p):
    p = str(p)
    key = _ALIASES.get(p.lower(), p)
    if key not in PROV:
        raise ValueError('province must be A (gneiss), B (sandstone), C (basalt) or D (volcanic)')
    return key


def make_world(seed, province='A', size_m=512, n=257, sea_level=0.0, timings=None):
    t00 = time.perf_counter()
    prov = _norm_prov(province)
    if prov == 'D':
        return make_world_D(seed, size_m=(D_SIZE_M if size_m == 512 else size_m), n=(D_N if n == 257 else n), timings=timings)
    par = PROV[prov]
    seed = int(seed)
    tm = {}

    def tick(name, t0):
        tm[name] = time.perf_counter() - t0

    st = make_structure(seed, prov, size_m)
    xs = np.linspace(-size_m / 2.0, size_m / 2.0, n)
    X, Y = np.meshgrid(xs, xs)
    dx = size_m / (n - 1)
    ctx = dict(X=X, Y=Y, st=st, prov=prov, size=float(size_m),
               rng_r=np.random.default_rng([seed, ord(prov), 22]),
               rng_h=np.random.default_rng([seed, ord(prov), 33]),
               rng_f=np.random.default_rng([seed, ord(prov), 44]))

    # --- step 2: rock map -------------------------------------------------------------------
    t0 = time.perf_counter()
    rid = rock_map(ctx)
    rid = stamp_faults(ctx, rid, 1.4) if prov != 'C' else rid
    hard_s = blur(HARD[rid], 3, 2)
    tick('2_rock_map', t0)

    # --- steps 1 + 3: uplift surface, tilt, glacial / structural streamlining ---------------
    t0 = time.perf_counter()
    if prov == 'A':
        H = build_A(ctx, hard_s)
    elif prov == 'B':
        H = build_B(ctx, hard_s)
    else:
        H = build_C(ctx, hard_s)
    tick('1_3_uplift_structure', t0)

    # --- step 5a: choose the cut (land fraction is a seeded property of the province) --------
    rid_vis = None
    t0 = time.perf_counter()
    H = H - np.quantile(H, 1.0 - st['land_frac'])
    if prov == 'B':
        wm = np.clip(0.2 + 0.5 * (1.25 - hard_s), 0.2, 0.7)
        H = terrace(H, 2.8, wm, 1.0)
        H -= fault_trench(ctx, par["fault_depth"], par["fault_w"])
    elif prov == 'C':
        wm = np.full(H.shape, C_RISER_W)
        H = terrace(H, C_TREAD_M, wm, 2.5)
        # rock follows the lava stack: bole at the foot, vesicular top, columnar middle. The erosion passes use this v0 labelling (soft bole treads),
        # so the heightfield is the v0 one; the rock map that is OUTPUT is rock_visible() below (v0 made the treads red clay, so plateaus and most of
        # every island rendered as red cones with no columns).
        zz = (H - 2.5) / C_TREAD_M
        fr = zz - np.floor(zz)
        rid = np.where(fr < 0.10, R_BOLE, np.where(fr > 0.90, R_BAS_TOP, R_BAS)).astype(np.uint8)
        rid_vis = rock_visible(fr, X, Y, seed, prov)
        H -= fault_trench(ctx, par['fault_depth'], par['fault_w'])
        rid = stamp_faults(ctx, rid, 1.5)
        rid_vis = np.where(rid == R_FAULT, R_FAULT, rid_vis).astype(np.uint8)
    else:
        H -= fault_trench(ctx, par['fault_depth'], par['fault_w'])
    # the seabed is the same surface: flat shelf with a soft shelf break, troughs already carved above
    Dsh = par['shelf']
    H = np.where(H < 0, -Dsh * np.tanh(-H / Dsh), H)
    tick('5a_cut_and_shelf', t0)

    # --- step 4: stream power + thermal erosion with hardness as erodibility ---------------
    t0 = time.perf_counter()
    H = fluvial(H, rid, dx, par['k_fluv'], par['iters'], par['thermal_passes'])
    tick('4_fluvial_thermal', t0)

    # --- steps 6 + 7: wave erosion by exposure, deposition in the lee ----------------------
    t0 = time.perf_counter()
    dep_total = np.zeros(H.shape)
    for _ in range(par['n_wave']):
        H, D, E = wave_and_deposit(H, rid, dx, st, par, None)
        dep_total += D
        H = thermal(H, np.where(H < 0, 0.7, SMAX[rid]), dx, 1)
    tick('6_7_wave_deposit', t0)

    # --- features (stacks / arches / geos), field stays one surface -----------------------
    t0 = time.perf_counter()
    feats = {'stacks': [], 'arches': [], 'geos': []}
    w = World()
    w.seed, w.province, w.province_name, w.size_m, w.n, w.dx = seed, prov, par['name'], float(size_m), n, dx
    w.sea_level, w.tide_amp = float(sea_level), TIDE_AMP
    w.X, w.Y, w.structure, w.params = X, Y, st, par
    if prov == 'C':
        E0 = exposure(H > 0, dx, st['wave_from'], 0.4 * size_m)
        H, feats = add_stacks(w, H, E0, ctx['rng_f'], par)
        H = thermal(H, np.full(H.shape, 3.0), dx, 4)      # stack walls stay inside the stable-slope cap
    feats['geos'] = find_geos(w, H)
    # deposits become sand / shingle rock cells
    if prov == 'C':
        H = np.where(H > C_RELIEF_FROM, C_RELIEF_FROM + (H - C_RELIEF_FROM) * C_RELIEF, H)
        rid = rid_vis
        gy_, gx_ = np.gradient(H, dx); sl_ = np.hypot(gx_, gy_)
        rid = np.where((sl_ > 0.8) & (H > -1.0) & (rid != R_FAULT), R_BAS, rid).astype(np.uint8)       # every cliff face is columnar basalt
    rid = rid.copy()
    E = exposure(H > sea_level, dx, st['wave_from'], 0.4 * size_m)
    sand = (dep_total > 0.45) & (H < 4.0) & (E < 0.35)
    rid[sand] = R_SAND
    if prov != 'A':
        # storm-ridge cobbles at the foot of exposed cliffs
        gy, gx = np.gradient(H, dx)
        sl0 = np.hypot(gx, gy)
        rid[(~sand) & (E > 0.7) & (H > 0) & (H < 2.0) & (sl0 < 0.3) & (blur((H < 0).astype(np.float64), 2, 1) > 0.05)] = R_COBBLE
    tick('features', t0)

    # --- finalise arrays ---------------------------------------------------------------
    w.height = H.astype(np.float32)
    w.rock = rid.astype(np.uint8)
    h64 = w.height.astype(np.float64)

    t0 = time.perf_counter()
    rec, slope = d8(h64)
    acc = flow_accum(h64, rec)
    lake, wet, slp = lakes_and_wetness(h64, w.rock, acc, dx, sea_level)
    w.lake_depth = lake.astype(np.float32)
    w.wetness = wet.astype(np.float32)
    w.slope = slp
    w.exposure = E.astype(np.float32)
    veg, Ew = classify_surface(w, dep_total, E)
    w.veg = veg
    w.wind_exposure = Ew.astype(np.float32)
    tick('8_soil_veg_wet', t0)

    # --- step 5b: islands by connected components at the sea level and at the tide window --
    t0 = time.perf_counter()
    lab, nisl = _islands_at(h64, sea_level, dx)
    lab_low, nl = _islands_at(h64, sea_level - TIDE_AMP, dx)
    lab_high, nh = _islands_at(h64, sea_level + TIDE_AMP, dx)
    w.island_label = lab.astype(np.int16)
    w.islands = _stats(w, lab, nisl, lab_low, lab_high, nl, nh, E)
    cands = landing_candidates(w, lab, E)
    for c in cands:
        w.islands[c['island'] - 1]['landing_candidates'].append(c)
    w.landing_candidates = cands
    w.features = feats
    w.rocks = ROCKS
    w.veg_legend = VEG_LEGEND
    tick('5b_islands', t0)
    tm['total'] = time.perf_counter() - t00
    w.timings = tm
    if timings is not None:
        timings.update(tm)
    return w


# ==============================================================================================
# PROVINCE D: composite volcanic island (research/VOLCANIC_ISLAND_AND_CUTAWAY.md, landform/VOLCANO.md)
# ONE height field again, but the window is a CUTAWAY: 1536 m, the vent sits a few metres inside the SOUTH
# edge, so the south wall slices through the crater, the conduit and the magma chamber; the island is bigger
# than the window to the south and west, so those edges cut the lava stack too.  All numbers are TUNING.
# Vertical exaggeration: the summit is 205-270 m over a land radius of 640-760 m; a real island of that radius
# would have a summit of about 0.15 x R = 100-115 m, so the diorama exaggerates height 2 to 2.5 times.
# ==============================================================================================
D_SIZE_M, D_N = 1536.0, 513
D_PAD_M = 72.0                  # the field is computed 72 m beyond the window and cropped (no edge artefacts in the erosion)
D_REAL_HEIGHT_RATIO = 0.15      # summit / island radius of the reference island (3.7 km / 25 km)


def _d_params(seed, size_m):
    """All the structural choices of one volcano, from the seed only (JSON-able; rock3d reads them back)."""
    r = np.random.default_rng([int(seed), ord('D'), 11])
    half = size_m / 2.0
    p = {}
    p['H_target'] = float(r.uniform(215.0, 270.0))
    p['Rc'] = float(r.uniform(560.0, 660.0))
    p['rc'] = p['Rc'] * float(r.uniform(0.30, 0.36))             # caldera (ring fault) radius
    p['dc'] = float(r.uniform(36.0, 50.0))                       # caldera depth below the old rim (surface)
    p['fill'] = float(r.uniform(10.0, 16.0))                     # flat fill thickness on the dropped block
    p['dcol'] = p['dc'] + p['fill']                              # throw of the ring faults
    p['dwall'] = float(r.uniform(4.0, 9.0))                      # vent distance north of the south wall
    p['V'] = (float(r.uniform(-0.22, 0.06) * size_m), -half + p['dwall'])
    phi_c = math.radians(r.uniform(60.0, 120.0))
    p['C1'] = (p['V'][0] + 0.38 * p['rc'] * math.cos(phi_c), p['V'][1] + 0.38 * p['rc'] * math.sin(phi_c))
    p['phi_scar'] = float(math.radians(r.uniform(15.0, 165.0)))
    p['scar_half'] = float(math.radians(r.uniform(30.0, 40.0)))
    p['wind_from'] = float(math.pi + math.radians(r.uniform(-35.0, 35.0)))      # wet winds arrive from the west (+-35)
    p['wave_from'] = p['wind_from'] + float(math.radians(r.uniform(-10.0, 10.0)))
    p['Dfloor'] = float(r.uniform(170.0, 195.0))                  # deep sea floor (asymptote), diorama scale
    p['s_sub'] = float(r.uniform(0.62, 0.82))                     # submarine flank tan(slope) below the shelf break
    p['shelf_w'] = float(r.uniform(25.0, 60.0))                   # narrow shelf
    p['north_stretch'] = float(r.uniform(1.3, 1.5))              # flatlands: the north flank is longer and gentler
    p['cone_slope_deg'] = float(r.uniform(21.0, 25.0))            # mean slope of the young cone
    nar = int(r.integers(2, 4))
    a0 = math.radians(r.uniform(28.0, 55.0))
    arms = []
    for k in range(nar):
        a = a0 + k * math.radians(r.uniform(50.0, 78.0))
        if a > math.radians(152.0):
            a = math.radians(152.0) - math.radians(r.uniform(0, 20))
        arms.append(dict(az=float(a), L=float(r.uniform(0.35, 0.70) * p['Rc']), Hr=float(r.uniform(9.0, 17.0)),
                         wr=float(r.uniform(40.0, 62.0))))
    p['arms'] = arms
    p['n_cones'] = int(r.integers(16, 30))
    p['n_flows'] = int(r.integers(3, 7))
    # interior (rock3d)
    p['chamber'] = dict(z=-float(r.uniform(48.0, 62.0)), a=float(r.uniform(95.0, 125.0)), b=float(r.uniform(85.0, 110.0)),
                        c=float(r.uniform(24.0, 30.0)), az=float(r.uniform(0.0, math.pi)))
    p['conduit_r'] = float(r.uniform(13.0, 17.0))
    p['hmax_head'] = float(r.uniform(1.0, 1.5))                    # water-table head inland (m)
    dikes = []
    for k in range(30):
        if k < 16:
            ar = arms[int(r.integers(0, nar))]['az'] + math.radians(r.normal(0.0, 7.0))
        else:
            ar = float(r.uniform(0.0, 2 * math.pi))
        dikes.append(dict(az=float(ar), off=float(r.normal(0.0, 12.0)), w=float(r.uniform(1.0, 2.6)),
                          L=float(r.uniform(90.0, 420.0)), tilt=float(r.normal(0.0, 0.08)), light=bool(r.random() < 0.45)))
    p['dikes'] = dikes
    sills = []
    for k in range(int(r.integers(2, 5))):
        sills.append(dict(z=float(r.uniform(-20.0, 70.0)), t=float(r.uniform(2.0, 3.2)), rs=float(r.uniform(80.0, 190.0)),
                          cx=float(r.normal(0.0, 30.0)), cy=float(r.normal(0.0, 30.0))))
    p['sills'] = sills
    p['seed_noise'] = int(r.integers(0, 2 ** 31 - 1))
    return p


def _d_table(p):
    """1-D radial profile of the OLD edifice (shield + flank), above the sea by integrating a slope that is gentle on the
    skirt (2 to 8.5 deg), steeper on the middle flank (up to 19 deg) and steep near the old rim, below the sea by a
    narrow shelf and a steep submarine flank that flattens onto the sea floor."""
    Rc = p['Rc']
    r = np.arange(0.0, 2800.0, 1.0)
    rho = r / Rc
    s = (0.032 + 0.105 * smoothstep(0.97, 0.60, rho) + 0.13 * smoothstep(0.60, 0.34, rho) - 0.17 * smoothstep(0.34, 0.20, rho))
    z = np.zeros_like(r)
    inside = r <= Rc
    seg = s * 1.0
    # z(r) = sum of slope from r to Rc
    rev = np.cumsum(np.where(inside, seg, 0.0)[::-1])[::-1]
    z = np.where(inside, rev - seg, 0.0)
    d = np.maximum(r - Rc, 0.0)
    depth = 0.04 * d + p['Dfloor'] * np.tanh(np.maximum(d - p['shelf_w'], 0.0) * p['s_sub'] / p['Dfloor'])
    z = np.where(inside, z, -depth)
    return r, z


def _patch(H, X0, dx, cx, cy, rad):
    m = H.shape[0]
    j0 = max(0, int((cx - rad - X0) / dx)); j1 = min(m, int((cx + rad - X0) / dx) + 2)
    i0 = max(0, int((cy - rad - X0) / dx)); i1 = min(m, int((cy + rad - X0) / dx) + 2)
    if j1 <= j0 or i1 <= i0:
        return None
    xs = X0 + np.arange(j0, j1) * dx
    ys = X0 + np.arange(i0, i1) * dx
    XX, YY = np.meshgrid(xs, ys)
    return i0, i1, j0, j1, XX, YY


def _add_cone(H, X0, dx, cx, cy, hc, ri, crater=0.4, breach=None):
    pt = _patch(H, X0, dx, cx, cy, ri * 1.3)
    if pt is None:
        return
    i0, i1, j0, j1, XX, YY = pt
    r = np.hypot(XX - cx, YY - cy)
    prof = hc * np.clip(1 - r / ri, 0, 1) ** 1.1 - crater * hc * np.exp(-(r / (0.26 * ri)) ** 2) * (r < ri)
    if breach is not None:
        ux, uy = math.cos(breach), math.sin(breach)
        al = (XX - cx) * ux + (YY - cy) * uy
        pe = -(XX - cx) * uy + (YY - cy) * ux
        prof = prof - 0.5 * hc * np.exp(-(pe / (0.2 * ri)) ** 2) * smoothstep(0.1 * ri, 0.5 * ri, al) * (r < ri)
    H[i0:i1, j0:j1] += prof * (r < ri)


NB8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def _trace_flow(Hs, i, j, rng, nmax=1500, sea_run=(5, 15)):
    """Steepest descent on the (smoothed) eroded surface with noise and momentum, until the sea and a few cells beyond."""
    m = Hs.shape[0]
    path = [(i, j)]
    seen = {(i, j)}
    vi = vj = 0.0
    sea = 0
    n_sea = int(rng.integers(sea_run[0], sea_run[1]))
    for _ in range(nmax):
        best, bs = None, 1e9
        for di, dj in NB8:
            ni, nj = i + di, j + dj
            if not (0 <= ni < m and 0 <= nj < m) or (ni, nj) in seen:
                continue
            dist = 1.41421356 if (di and dj) else 1.0
            sc = (Hs[ni, nj] - Hs[i, j]) / dist + 0.03 * rng.standard_normal() - 0.05 * (di * vi + dj * vj)
            if sc < bs:
                bs, best = sc, (ni, nj, di, dj)
        if best is None:
            break
        if bs > 0.08:                                         # pit: jump to the lowest unseen cell within 6 cells
            lo, lc = 1e9, None
            for di in range(-6, 7):
                for dj in range(-6, 7):
                    ni, nj = i + di, j + dj
                    if 0 <= ni < m and 0 <= nj < m and (ni, nj) not in seen and Hs[ni, nj] < lo:
                        lo, lc = Hs[ni, nj], (ni, nj, di, dj)
            if lc is None or lo >= Hs[i, j]:
                break
            best = lc
        ni, nj, di, dj = best
        nn = max(math.hypot(di, dj), 1.0)
        vi, vj = 0.7 * vi + 0.3 * di / nn, 0.7 * vj + 0.3 * dj / nn
        i, j = ni, nj
        seen.add((i, j))
        path.append((i, j))
        if Hs[i, j] < -0.3:
            sea += 1
            if sea >= n_sea:
                break
        if i <= 0 or j <= 0 or i >= m - 1 or j >= m - 1:
            break
    return path


def _paint_flow(H, flow_t, delta_m, path, X0, dx, rng, wbase, thick):
    """Raise the surface along the path (valley-filling, lobed edges, a fan on low slopes) and build a delta at the sea."""
    m = H.shape[0]
    ph = rng.uniform(0, 6.28, 3)
    bed_prev = None
    sea_k = None
    for k, (i, j) in enumerate(path):
        cx, cy = X0 + j * dx, X0 + i * dx
        if H[i, j] > -0.3:
            sl = 0.0
            if k + 4 < len(path):
                i2, j2 = path[k + 4]
                sl = (H[i, j] - H[i2, j2]) / (4 * dx * 1.2)
            wid = wbase * (1.0 + 0.28 * math.sin(k * 0.21 + ph[0]) + 0.18 * math.sin(k * 0.53 + ph[1]))
            if sl < 0.07:
                wid *= 1.5
            hw = max(wid * 0.5, 4.0)
            pt = _patch(H, X0, dx, cx, cy, hw * 1.3)
            if pt is None:
                continue
            i0, i1, j0, j1, XX, YY = pt
            loc = H[i0:i1, j0:j1]
            bed = min(float(H[max(i - 1, 0):i + 2, max(j - 1, 0):j + 2].min()), bed_prev if bed_prev is not None else 1e9)
            bed_prev = bed + 0.02
            d = np.hypot(XX - cx, YY - cy) / hw
            prof = np.clip(1 - d * d, 0, 1) ** 0.7
            new = np.maximum(loc, np.minimum(loc, bed) + thick * prof)
            ft = flow_t[i0:i1, j0:j1]
            np.maximum(ft, new - loc, out=ft)
            H[i0:i1, j0:j1] = new
        else:
            if sea_k is None:
                sea_k = k
            frac = (k - sea_k + 1.0) / max(len(path) - sea_k, 1)
            rd = (22.0 + 24.0 * rng.random()) * (0.55 + 0.9 * frac)
            pt = _patch(H, X0, dx, cx, cy, rd * 1.15)
            if pt is None:
                continue
            i0, i1, j0, j1, XX, YY = pt
            ang_ = np.arctan2(YY - cy, XX - cx)
            dd = np.hypot(XX - cx, YY - cy) / rd / (1.0 + 0.30 * np.sin(3 * ang_ + ph[2]) + 0.18 * np.sin(5 * ang_ + ph[0]) + 0.10 * np.sin(8 * ang_ + ph[1]))   # lobed, not a disc
            prof = 1.6 - 15.0 * smoothstep(0.50, 1.0, dd)
            loc = H[i0:i1, j0:j1]
            new = np.where(dd < 1.0, np.maximum(loc, prof), loc)
            dm = delta_m[i0:i1, j0:j1]
            np.maximum(dm, ((new - loc) > 0.05).astype(np.float32), out=dm)
            H[i0:i1, j0:j1] = new


def thermal8(h, tmax, dx, passes):
    """Thermal relaxation along 4 directions (two axes and both diagonals): no grid-aligned terraces on steep cones."""
    for _ in range(passes):
        for (di, dj, f) in ((0, 1, 1.0), (1, 0, 1.0), (1, 1, 1.41421356), (1, -1, 1.41421356)):
            if dj >= 0:
                a_ = h[di:, :h.shape[1] - dj] if dj else h[di:, :]
                b_ = h[:h.shape[0] - di, dj:] if dj else h[:h.shape[0] - di, :]
                ta = tmax[di:, :h.shape[1] - dj] if dj else tmax[di:, :]
                tb = tmax[:h.shape[0] - di, dj:] if dj else tmax[:h.shape[0] - di, :]
            else:
                a_ = h[di:, 1:]
                b_ = h[:h.shape[0] - di, :h.shape[1] - 1]
                ta = tmax[di:, 1:]
                tb = tmax[:h.shape[0] - di, :h.shape[1] - 1]
            d = a_ - b_
            lim = np.minimum(ta, tb) * dx * f
            ex = np.abs(d) - lim
            mv = np.where(ex > 0, 0.16 * ex * np.sign(d), 0.0)
            a_ -= mv
            b_ += mv
    return h


def fluvial_D(h, rock, dx, kf, iters, passes, z=0.0, rng=None):
    """world.fluvial for the volcano, three changes: (1) STOCHASTIC D8 routing (the surface used to route flow gets a fresh random
    perturbation of about a third of a cell rise each iteration), so the channels are not locked to the 8 grid directions (no stripes);
    (2) incision fades out on flat ground (slope x (1 + sqrt(A)/150) < 0.045..0.11), so lava plains are not scored; (3) thermal
    relaxation along four directions."""
    rng = rng if rng is not None else np.random.default_rng(5)
    erod = ERODE[rock]
    tmax = np.where(h < z - 1.0, 0.9, SMAX[rock])
    cell = dx * dx
    m = h.shape[0]
    idx = np.arange(m * m)
    for _ in range(iters):
        gy, gx = np.gradient(h, dx)
        hn = h + (rng.random(h.shape) - 0.5) * 0.7 * dx * np.hypot(gx, gy)
        rec, _s = d8(hn)
        A = flow_accum(hn, rec) * cell
        dr = np.hypot((rec // m) - (idx // m), (rec % m) - (idx % m)).reshape(h.shape)
        hr = h.ravel()[rec].reshape(h.shape)
        S = np.maximum(h - hr, 0.0) / (np.maximum(dr, 1.0) * dx)
        dh = kf * 0.012 * erod * np.sqrt(A) * S * (h > z + 0.25) * smoothstep(0.045, 0.11, S * (1.0 + np.sqrt(A) / 150.0))
        dh = np.minimum(dh, 0.4 * np.maximum(h - hr, 0.0))
        h -= dh
        thermal8(h, tmax, dx, passes)
    return h


def surface_colour_D(w):
    """RGB of the volcano surface: altitude belts (veg ids 13..19) in a cool Atlantic palette, rock colours on bare lava, scoria, sand."""
    veg = w.veg.astype(np.int64)
    rk = w.rock.astype(np.int64)
    fresh = np.array([r['colour_fresh'] for r in ROCKS], dtype=np.float64)[rk]
    weath = np.array([r['colour_weathered'] for r in ROCKS], dtype=np.float64)[rk]
    lich = np.array([r['colour_lichen'] for r in ROCKS], dtype=np.float64)[rk]
    base = VEG_RGB[veg].copy()
    rockish = np.isin(veg, [V_BARE, V_LICHEN, V_D_LAVA, V_D_SUMMIT, V_D_ASH, V_SAND, V_SHINGLE])
    rc = np.where((veg == V_D_ASH)[..., None], 0.55 * fresh + 0.45 * weath, 0.7 * fresh + 0.3 * weath)
    rc = np.where((veg == V_D_SUMMIT)[..., None], 0.35 * fresh + 0.65 * weath, rc)
    rc = np.where((veg == V_LICHEN)[..., None], 0.6 * weath + 0.4 * lich, rc)
    col = np.where(rockish[..., None], rc, 0.84 * base + 0.16 * weath)
    # patch noise (4 m scale hash noise, deterministic) so belts are not flat
    n = w.height.shape[0]
    rr = np.random.default_rng(int(w.seed) + 9)
    nz = rr.standard_normal((n // 3 + 2, n // 3 + 2))
    big = np.kron(nz, np.ones((3, 3)))[:n, :n]
    big = blur(big, 2, 1)
    col = col * (1.0 + 0.07 * np.clip(big * 2.2, -1, 1))[..., None]
    return np.clip(col, 0, 255).astype(np.uint8)


def make_world_D(seed, size_m=D_SIZE_M, n=D_N, sea_level=0.0, timings=None):
    t00 = time.perf_counter()
    seed = int(seed)
    prov = 'D'
    par = PROV['D']
    tm = {}

    def tick(name, t0):
        tm[name] = time.perf_counter() - t0

    t0 = time.perf_counter()
    p = _d_params(seed, size_m)
    half = size_m / 2.0
    dx = size_m / (n - 1)
    pc = int(round(D_PAD_M / dx))
    m = n + 2 * pc
    X0 = -half - pc * dx
    xs = X0 + np.arange(m) * dx
    X, Y = np.meshgrid(xs, xs)
    rng_h = np.random.default_rng([seed, ord('D'), 33])
    rng_f = np.random.default_rng([seed, ord('D'), 44])
    rng_c = np.random.default_rng([seed, ord('D'), 55])
    Vx, Vy = p['V']
    Cx, Cy = p['C1']
    Rc, rc, dc = p['Rc'], p['rc'], p['dc']
    # --- the old edifice (shield + flank), lobed and stretched to the north (flatlands) --------------
    lobe = fbm(rng_h, X, Y, 520.0, 520.0, 3, 0.5)
    dxc, dyc = X - Cx, Y - Cy
    sN = 1.0 + (p['north_stretch'] - 1.0) * smoothstep(0.0, 420.0, dyc)
    r_old = np.hypot(dxc, dyc / sN) * (1.0 + 0.085 * lobe)
    rt, zt = _d_table(p)
    hs = np.interp(r_old, rt, zt)
    h_shield = hs.copy()                                                   # kept for the cutaway (beds follow this surface)
    # --- caldera: wall, flat floor, ring ridge; the collapse scar opens it to the sea -----------------
    r1 = np.hypot(dxc, dyc) * (1.0 + 0.10 * fbm(rng_h, X, Y, 300.0, 300.0, 2, 0.5))
    wall = smoothstep(0.80 * rc, rc, r1)
    H = hs - p['dc'] * (1.0 - wall) + 4.0 * np.exp(-((r1 - rc) / 11.0) ** 2) + 1.5 * fbm(rng_h, X, Y, 60.0, 60.0, 2, 0.6) * (1 - wall)
    floor_lv = float(np.interp(0.0, rt, zt)) - dc                         # caldera floor level
    ang = np.arctan2(dyc, dxc)
    dang = np.abs((ang - p['phi_scar'] + math.pi) % (2 * math.pi) - math.pi)
    sw = smoothstep(p['scar_half'] + 0.14, p['scar_half'] - 0.06, dang) * smoothstep(0.35 * rc, 0.9 * rc, r1)
    scar_floor = floor_lv - 0.085 * np.maximum(r1 - 0.7 * rc, 0.0)
    coast_fade = 1.0 - smoothstep(0.50 * Rc, 0.95 * Rc, r_old)
    H = H - sw * np.minimum(np.maximum(H - scar_floor, 0.0), 70.0) * coast_fade
    fan = 13.0 * np.exp(-((r1 - 1.12 * Rc) / 170.0) ** 2) * sw * (0.55 + 0.45 * np.tanh(fbm(rng_h, X, Y, 70.0, 70.0, 2, 0.6)))
    H = H + fan * (H < 0)
    H = H + 7.0 * np.clip(0.5 + 0.35 * fbm(rng_h, X, Y, 430.0, 430.0, 2, 0.5), 0.0, 1.0) * smoothstep(-6.0, 8.0, H) * (1 - smoothstep(60.0, 120.0, H))
    # --- young cone, off centre (the vent is on the south wall's inside) ---------------------------
    zb = float(np.interp(0.0, rt, zt)) - dc                                 # ground under the cone foot (caldera floor)
    Hc = max(p['H_target'] - zb, 80.0)
    rb = Hc / math.tan(math.radians(p['cone_slope_deg']))
    r2 = np.hypot(X - Vx, Y - Vy) * (1.0 + 0.07 * fbm(rng_h, X, Y, 260.0, 260.0, 2, 0.5))
    base_pre = H.copy()
    ground = np.maximum(base_pre, zb)

    def cone_surface(Hc_):
        prof = Hc_ * np.clip(1 - r2 / rb, 0, 1) ** 1.1
        crater = 0.085 * Hc_ * np.exp(-(r2 / (0.10 * rb)) ** 2)
        return np.where(prof > 0.0, np.maximum(base_pre, zb + prof - crater), base_pre), prof

    tslope = math.tan(math.radians(p['cone_slope_deg']))
    for _it in range(4):                                                  # the crater dip and the ground under the cone lower the top: re-fit height AND base
        top = cone_surface(Hc)[0].max()
        Hc *= (p['H_target'] - zb) / max(top - zb, 1.0)
        rb = Hc / tslope
    H, prof = cone_surface(Hc)
    cone_foot = prof > 1.0
    # --- rift ridges and the small cones along them --------------------------------------------
    arm_geom = []
    for a in p['arms']:
        ux, uy = math.cos(a['az']), math.sin(a['az'])
        al = (X - Vx) * ux + (Y - Vy) * uy
        pe = -(X - Vx) * uy + (Y - Vy) * ux
        pe = pe + 14.0 * fbm(rng_h, al, pe * 0 + a['az'] * 100.0, 120.0, 120.0, 2, 0.5)
        ridge = a['Hr'] * np.exp(-(pe / a['wr']) ** 2) * smoothstep(0.0, 0.12 * Rc, al) * np.clip(1 - al / a['L'], 0, 1)
        H = H + ridge * (H > -2.0)
        arm_geom.append((ux, uy))
    cones = []
    tries = 0
    want = p['n_cones']
    while len(cones) < want and tries < 4000:
        tries += 1
        k = int(rng_c.integers(0, len(p['arms'])))
        a = p['arms'][k]
        s = rng_c.uniform(0.18, 1.0) * a['L']
        ux, uy = arm_geom[k]
        cx = Vx + ux * s - uy * rng_c.normal(0.0, 0.25 * a['wr'])
        cy = Vy + uy * s + ux * rng_c.normal(0.0, 0.25 * a['wr'])
        if abs(cx) > half + 40 or abs(cy) > half + 40:
            continue
        gi, gj = int(round((cy - X0) / dx)), int(round((cx - X0) / dx))
        if not (0 <= gi < m and 0 <= gj < m) or H[gi, gj] < 3.0:
            continue
        if any(math.hypot(cx - o['x'], cy - o['y']) < 42.0 for o in cones):
            continue
        cones.append(dict(x=float(cx), y=float(cy), h=float(rng_c.uniform(8.0, 25.0)), r=float(rng_c.uniform(30.0, 60.0)),
                          breach=(float(p['wind_from'] + math.pi) if rng_c.random() < 0.3 else None), arm=k))
    for c in cones:
        _add_cone(H, X0, dx, c['x'], c['y'], c['h'], c['r'], 0.4, c['breach'])
    tick('D1_edifice', t0)

    # --- rock classes for erosion (ash cone erodes fast, old lava slowly, walls hold) -----------------
    t0 = time.perf_counter()
    gy0, gx0 = np.gradient(blur(H, 1, 1), dx)
    tan0 = np.hypot(gx0, gy0)
    rid = np.full(H.shape, R_BASALT_W, dtype=np.uint8)
    rid[(tan0 > 0.45) & (H > -3)] = R_BASALT_F
    rid[cone_foot & (H > floor_lv - 2)] = R_ASH
    for c in cones:
        pt = _patch(H, X0, dx, c['x'], c['y'], c['r'])
        if pt is not None:
            i0, i1, j0, j1, XX, YY = pt
            msk = np.hypot(XX - c['x'], YY - c['y']) < c['r']
            sub = rid[i0:i1, j0:j1]
            sub[msk] = R_SCORIA
    # seed for gullies: noise of a few metres, stronger on the ash cone (never stripes: the noise is isotropic and fbm)
    nz = fbm(rng_h, X, Y, 170.0, 170.0, 4, 0.65, lmin=8.0)
    amp = np.where(rid == R_ASH, 3.6, 3.6) * (H > 2.0) * np.clip((tan0 - 0.035) / 0.22, 0.12, 1.0)
    H = H + amp * nz
    # --- barrancos: flow routing + stream power + thermal relaxation (the world's own erosion) --------------
    H = fluvial_D(H, rid, dx, par['k_fluv'], par['iters'], par['thermal_passes'], rng=np.random.default_rng([seed, ord('D'), 88]))
    tick('D2_barrancos', t0)

    # --- waves: wave-cut cliffs, benches, black sand in coves (rock erodibility from the table) ----------
    t0 = time.perf_counter()
    st = dict(wave_from=p['wave_from'])
    dep_total = np.zeros(H.shape)
    for _ in range(par['n_wave']):
        H, D_, E_ = wave_and_deposit(H, rid, dx, st, par, None)
        dep_total += D_
        H = thermal(H, np.where(H < 0, 0.9, SMAX[rid]), dx, 1)
    tick('D3_waves', t0)

    # --- young lava flows and lava deltas (after erosion, so they sit in the barrancos and are not carved) -----
    t0 = time.perf_counter()
    flow_t = np.zeros(H.shape, dtype=np.float32)
    delta_m = np.zeros(H.shape, dtype=np.float32)
    Hs = blur(H, 1, 1) + 0.0
    vents = [(Vx + 6.0 * math.cos(1.0), Vy + 6.0 * math.sin(1.0))]
    pool = [(c['x'], c['y']) for c in cones if c['h'] > 11.0]
    rng_f.shuffle(pool)
    vents += pool[:max(p['n_flows'] - 2, 1)]
    ph = rng_f.uniform(0.0, 6.28)
    vents.append((Vx + 0.5 * rb * math.cos(ph) * (0.2 if math.sin(ph) < 0 else 1.0), Vy + abs(0.5 * rb * math.sin(ph)) + 20.0))
    flows = []
    for (vx_, vy_) in vents[:p['n_flows']]:
        gi, gj = int(round((vy_ - X0) / dx)), int(round((vx_ - X0) / dx))
        gi = min(max(gi, 1), m - 2); gj = min(max(gj, 1), m - 2)
        path = _trace_flow(Hs, gi, gj, rng_f)
        wb = float(rng_f.uniform(10.0, 26.0)); th = float(rng_f.uniform(2.2, 4.8))
        _paint_flow(H, flow_t, delta_m, path, X0, dx, rng_f, wb, th)
        flows.append(dict(vent=(float(vx_), float(vy_)), n=len(path), width=wb, thick=th,
                          reaches_sea=bool(any(Hs[i, j] < -0.3 for (i, j) in path))))
    H = thermal(H, np.where(H < 0, 0.9, 1.0), dx, 1)
    tick('D4_flows', t0)

    # --- crop to the window -------------------------------------------------------------------
    sl = (slice(pc, pc + n), slice(pc, pc + n))
    Hc_ = H[sl].copy()
    Hshield = h_shield[sl].astype(np.float32)
    flow_t = flow_t[sl]; delta_m = delta_m[sl]; dep_total = dep_total[sl]
    rid = rid[sl].copy()
    cone_m = cone_foot[sl]
    Xc, Yc = X[sl], Y[sl]

    t0 = time.perf_counter()
    w = World()
    w.seed, w.province, w.province_name, w.size_m, w.n, w.dx = seed, prov, par['name'], float(size_m), n, dx
    w.sea_level, w.tide_amp = float(sea_level), TIDE_AMP
    w.X, w.Y = Xc, Yc
    st_full = dict(province='D', wave_from=p['wave_from'], wind_from=p['wind_from'], faults=[], flow=p['wind_from'] + math.pi, dip_dir=0.0)
    w.structure, w.params = st_full, par
    h64 = Hc_.astype(np.float64)
    E = exposure(h64 > sea_level, dx, p['wave_from'], 0.4 * size_m)
    gy, gx = np.gradient(h64, dx)
    tan = np.hypot(gx, gy)
    # --- surface rock ----------------------------------------------------------------------------
    fH = np.maximum(h64, 0.0) / max(h64.max(), 1.0)
    rid = np.where(rid == R_ASH, R_ASH, R_BASALT_W).astype(np.uint8)
    rid[(tan > 0.55) & (h64 > -1.0)] = R_BASALT_F
    rid[(tan < 0.42) & (h64 > 1.0) & (rid == R_BASALT_W) & (fH < 0.62)] = R_ASH      # ash soil on the gentle lower slopes
    for c in cones:
        i0 = int(round((c['y'] + half) / dx)); j0 = int(round((c['x'] + half) / dx))
        rad = int(c['r'] / dx) + 2
        a0, a1, b0, b1 = max(i0 - rad, 0), min(i0 + rad + 1, n), max(j0 - rad, 0), min(j0 + rad + 1, n)
        if a1 > a0 and b1 > b0:
            yy, xx = np.mgrid[a0:a1, b0:b1]
            msk = np.hypot(xx - j0, yy - i0) * dx < c['r'] * 0.8
            rid[a0:a1, b0:b1][msk & (h64[a0:a1, b0:b1] > 1.0)] = R_SCORIA
    pum = fbm(np.random.default_rng([seed, ord('D'), 66]), Xc, Yc, 40.0, 40.0, 3, 0.55)
    hi_cone = cone_m & (fH > 0.84) & (pum > -0.2)
    rid[hi_cone] = R_SCORIA
    lee_side = (np.cos(np.arctan2(Yc - Cy, Xc - Cx) - p['wind_from']) < 0.0)
    rid[cone_m & (fH > 0.60) & lee_side & (pum > 0.9)] = R_PUMICE
    rid[(flow_t > 0.25)] = R_LAVA
    near_coast = blur((h64 < 0).astype(np.float64), 2, 1) > 0.04
    shore_band = (h64 > 0.0) & (h64 < 2.2) & (blur((h64 < 0).astype(np.float64), 4, 1) > 0.03)
    rid[shore_band & (rid != R_LAVA)] = R_BASALT_F                       # black bench / low cliff by default
    landfrac = blur((h64 > 0).astype(np.float64), 10, 2)                 # > 0.6 on the shore of a concave bay (cove)
    acc_c = blur(np.log1p(flow_accum(h64, d8(h64)[0])), 2, 1)
    mouth = acc_c > 5.0
    sand = ((dep_total > 0.40) | (delta_m > 0.5)) & (h64 < 3.0) & (h64 > -1.5) & (E < 0.62)
    cove = (E < 0.34) & (tan < 0.35) & (h64 > 0.0) & (h64 < 2.6) & near_coast & ((landfrac > 0.66) | mouth)
    rid[sand | cove] = R_BSAND
    rid[(~(sand | cove)) & (E > 0.55) & (h64 > 0.0) & (h64 < 2.2) & near_coast & (tan < 0.45)] = R_COBBLE
    w.height = Hc_.astype(np.float32)
    w.rock = rid.astype(np.uint8)
    w.exposure = E.astype(np.float32)
    w.h_shield = Hshield
    w.flow_thick = flow_t.astype(np.float32)
    w.delta = delta_m.astype(np.float32)
    # --- wetness, lakes, belts ----------------------------------------------------------------
    rec, slope = d8(h64)
    acc = flow_accum(h64, rec)
    lake, wet, slp = lakes_and_wetness(h64, w.rock, acc, dx, sea_level)
    lake = np.where(lake > 0.8, lake, 0.0)                    # only real crater / moat lakes, not noise pits
    w.lake_depth = lake.astype(np.float32)
    w.wetness = wet.astype(np.float32)
    w.slope = slp
    veg, zone, M = classify_D(w, p, h64, tan, E, flow_t, fH)
    w.veg = veg
    w.zone = zone
    w.moisture = M.astype(np.float32)
    w.wind_exposure = E.astype(np.float32)
    # water table head (cutaway lens, Ghyben-Herzberg): the land mask smoothed, zero at the shore
    landf = blur((h64 > sea_level).astype(np.float64), 25, 3)
    w.head = (p['hmax_head'] * np.clip((landf - 0.5) / 0.5, 0, 1) ** 0.8 * (h64 > sea_level)).astype(np.float32)
    tick('D5_classify', t0)

    t0 = time.perf_counter()
    lab, nisl = _islands_at(h64, sea_level, dx)
    lab_low, nl = _islands_at(h64, sea_level - TIDE_AMP, dx)
    lab_high, nh = _islands_at(h64, sea_level + TIDE_AMP, dx)
    w.island_label = lab.astype(np.int16)
    w.islands = _stats(w, lab, nisl, lab_low, lab_high, nl, nh, E)
    cands = landing_candidates(w, lab, E)
    for c in cands:
        w.islands[c['island'] - 1]['landing_candidates'].append(c)
    w.landing_candidates = cands
    w.features = dict(stacks=[], arches=[], geos=[], cones=cones, flows=flows)
    w.rocks = ROCKS
    w.veg_legend = VEG_LEGEND
    p['H_actual'] = float(h64.max())
    p['arms_geom'] = [dict(az=a['az'], L=a['L']) for a in p['arms']]
    p['cones'] = cones
    p['flows'] = flows
    p['rb'] = float(rb); p['Hc'] = float(Hc); p['zb'] = float(zb); p['floor_lv'] = float(floor_lv)
    w.volcano = p
    tick('D6_islands', t0)
    tm['total'] = time.perf_counter() - t00
    w.timings = tm
    if timings is not None:
        timings.update(tm)
    return w


def classify_D(w, p, h, tan, E, flow_t, fH):
    """Altitude belts as fractions of the summit height, windward-wet / lee-dry (research 2.1, 2.2; cool Atlantic palette)."""
    n = h.shape[0]
    X, Y = w.X, w.Y
    land = h > 0
    rr = np.random.default_rng([w.seed, ord('D'), 77])
    nz = 0.045 * fbm(rr, X, Y, 90.0, 90.0, 3, 0.55)
    wfx, wfy = math.cos(p['wind_from']), math.sin(p['wind_from'])
    cx, cy = p['C1']
    dd = np.hypot(X - cx, Y - cy) + 1e-6
    Lw = ((X - cx) * wfx + (Y - cy) * wfy) / dd                          # +1 windward side of the island
    gy, gx = np.gradient(blur(h, 2, 1), w.dx)
    gn = np.hypot(gx, gy) + 1e-9
    asp = (-gx * wfx - gy * wfy) / gn                                    # +1 when the slope faces the wind
    M = np.clip(0.5 + 0.32 * Lw + 0.18 * asp * np.clip(gn / 0.2, 0, 1), 0.0, 1.0)
    f = np.maximum(h, 0.0) / max(float(h.max()), 1.0)
    b0 = 0.15 + 0.10 * (1 - M) + nz
    b1 = 0.27 + 0.13 * M + nz
    b2 = 0.57 + nz
    b3 = 0.80 + nz
    b4 = 0.93 + nz
    zone = np.zeros(h.shape, dtype=np.uint8)      # 0 sea, 1 coast scrub, 2 woodland, 3 pine/birch, 4 high scrub, 5 bare lava, 6 summit
    zone[land] = 1
    zone[land & (f >= b0) & (f < b1) & (M > 0.5)] = 2
    zone[land & (f >= b1) & (f < b2)] = 3
    zone[land & (f >= b2) & (f < b3)] = 4
    zone[land & (f >= b3) & (f < b4)] = 5
    zone[land & (f >= b4)] = 6
    veg = np.zeros(h.shape, dtype=np.uint8)
    lut = np.array([V_WATER, V_D_COAST, V_D_WOOD, V_D_PINE, V_D_HIGH, V_D_LAVA, V_D_SUMMIT], dtype=np.uint8)
    veg = lut[zone]
    rk = w.rock
    veg[(rk == R_SCORIA) | (rk == R_PUMICE)] = V_D_ASH
    veg[(rk == R_LAVA)] = V_D_LAVA
    veg[(rk == R_ASH) & (tan > 0.55) & (f > 0.5)] = V_D_ASH
    veg[(tan > 0.9) & land & (f > 0.1)] = V_BARE
    veg[(rk == R_BASALT_F) & (tan > 0.6) & land] = V_LICHEN
    veg[rk == R_BSAND] = V_SAND
    veg[rk == R_COBBLE] = V_SHINGLE
    veg[w.lake_depth > 0] = V_LOCH
    veg[~land] = V_WATER
    return veg, zone, M


# ----------------------------------------------------------------------------------------------
# Island-centred sub-field, camera suggestion, exports (for Blender and the page)
# ----------------------------------------------------------------------------------------------
def island_window(w, island_id, size_m=128.0):
    """Sub-field centred on the island's bounding box.  size_m=None picks the island extent + 24 m.
    Returns dict(height, rock, exposure, wetness, veg, island_mask, origin_xy (x,y of cell [0,0]), dx, centre_xy,
    size_m, clipped).  Cells outside the world are padded with the edge value."""
    isl = w.islands[island_id - 1]
    ys, xs = np.nonzero(w.island_label == island_id)
    x0, x1 = w.X[0, xs.min()], w.X[0, xs.max()]
    y0, y1 = w.Y[ys.min(), 0], w.Y[ys.max(), 0]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ext = max(x1 - x0, y1 - y0)
    clipped = False
    if size_m is None:
        size_m = math.ceil((ext + 24.0) / 8.0) * 8.0
    elif ext + 8 > size_m:
        clipped = True
    m = int(round(size_m / w.dx)) + 1
    c0 = int(round((cx + w.size_m / 2) / w.dx)) - m // 2
    r0 = int(round((cy + w.size_m / 2) / w.dx)) - m // 2
    pad = m
    out = {}
    for key, arr in (('height', w.height), ('rock', w.rock), ('exposure', w.exposure), ('wetness', w.wetness),
                     ('veg', w.veg), ('island_mask', (w.island_label == island_id).astype(np.uint8))):
        p = np.pad(arr, pad, mode='edge')
        out[key] = p[r0 + pad:r0 + pad + m, c0 + pad:c0 + pad + m].copy()
    out['origin_xy'] = (float(-w.size_m / 2 + c0 * w.dx), float(-w.size_m / 2 + r0 * w.dx))
    out['dx'] = w.dx
    out['centre_xy'] = (float(cx), float(cy))
    out['size_m'] = float(size_m)
    out['clipped'] = clipped
    out['sea_level'] = w.sea_level
    out['island'] = isl['id']
    return out


def island_camera(w, island_id, lens_mm=50.0, azimuth_deg=180.0, elevation_deg=38.0, margin=1.12):
    """Suggest a camera that frames the whole island (sensor 36 x 24 mm; the shorter side must fit).
    azimuth_deg is the compass bearing OF THE CAMERA seen from the target (180 = camera south of it, looking north).
    Frame: x east, y north, z up, metres = Blender world axes of the island scripts."""
    isl = w.islands[island_id - 1]
    ys, xs = np.nonzero(w.island_label == island_id)
    xx, yy = w.X[ys, xs], w.Y[ys, xs]
    cx, cy = (xx.min() + xx.max()) / 2, (yy.min() + yy.max()) / 2
    R_h = float(np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2).max()) + w.dx
    zc = max(isl['max_height_m'], 0.0) * 0.4
    R = math.sqrt(R_h ** 2 + (max(isl['max_height_m'], 0.0) / 2) ** 2)
    vfov = 2 * math.atan(12.0 / lens_mm)
    d = R * margin / math.sin(vfov / 2)
    az, el = math.radians(azimuth_deg), math.radians(elevation_deg)
    pos = (float(cx + d * math.cos(el) * math.sin(az)), float(cy + d * math.cos(el) * math.cos(az)), float(zc + d * math.sin(el)))
    return dict(position=pos, target=(float(cx), float(cy), float(zc)), lens_mm=float(lens_mm), sensor_mm=(36.0, 24.0),
                vfov_deg=math.degrees(vfov), distance_m=float(d), azimuth_deg=float(azimuth_deg),
                elevation_deg=float(elevation_deg), footprint_radius_m=R_h)


def tide_levels(w):
    return {'low': w.sea_level - w.tide_amp, 'mid': w.sea_level, 'high': w.sea_level + w.tide_amp}


def land_mask(w, tide='mid'):
    return w.height > tide_levels(w)[tide]


def export_npz(w, path):
    np.savez_compressed(path, height=w.height, rock=w.rock, exposure=w.exposure,
                        meta=np.array([w.seed, w.n, w.size_m, w.sea_level, w.tide_amp], dtype=np.float64),
                        province=np.array(w.province))
    return path


def manifest_entry(w, file=None):
    return dict(file=file, seed=w.seed, province=w.province, province_name=w.province_name, size_m=w.size_m, n=w.n,
                cell_m=w.dx, sea_level=w.sea_level, tide_amp=w.tide_amp, n_islands=len(w.islands),
                land_fraction=float((w.height > w.sea_level).mean()),
                islands=[dict(id=i['id'], area_m2=round(i['area_m2'], 1), centroid=[round(v, 1) for v in i['centroid']],
                              max_height_m=round(i['max_height_m'], 2), coast_length_m=round(i['coast_length_m'], 1),
                              size_class=i['size_class'], rock_mix=i['rock_mix'],
                              n_landing_candidates=len(i['landing_candidates'])) for i in w.islands[:40]],
                rocks=[r['name'] for r in ROCKS], axes='x east, y north, z up, metres; arrays [row=y, col=x], row 0 south',
                structure={k: (round(v, 4) if isinstance(v, float) else v) for k, v in w.structure.items() if k != 'faults'},
                n_faults=len(w.structure['faults']), timings_s={k: round(v, 3) for k, v in w.timings.items()},
                features=dict(stacks=len(w.features['stacks']), arches=len(w.features['arches']), geos=len(w.features['geos'])))


def world_bytes_hash(w):
    import hashlib
    hs = hashlib.sha256()
    for a in (w.height, w.rock, w.exposure):
        hs.update(np.ascontiguousarray(a).tobytes())
    return hs.hexdigest()[:16]


if __name__ == '__main__':
    prov = sys.argv[1] if len(sys.argv) > 1 else 'A'
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1122
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 257
    w = make_world(seed, prov, n=n)
    print('province', w.province, w.province_name, 'seed', seed, 'n', n, 'hash', world_bytes_hash(w))
    print('timings', {k: round(v, 2) for k, v in w.timings.items()})
    print('islands', len(w.islands), 'land %.1f%%' % (100 * (w.height > 0).mean()))
    for i in w.islands[:8]:
        print(' ', i['id'], round(i['area_m2']), i['size_class'], round(i['max_height_m'], 1), len(i['landing_candidates']))
