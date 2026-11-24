"""dig/dig_toy.py -- headless digging-in toy on a landform heightfield (numpy only, deterministic).

    python3 dig/dig_toy.py            # write the three maps in dig/maps/ and print a short table
    python3 dig/test_dig_toy.py       # the checks

Research: research/DIGGING_IN_GEOGRAPHY.md.  Report and honest limits: dig/DIG_MODEL.md.

What is here (all game-level; no soldiers, no weapons):
  load / build_ground   read landform/worlds/seedNNNN (world.bin) into a Ground: height, top of bedrock (a soil mantle sits on rock), rock id -> material, wetness.
  refine                cut a small window out at fine cells (0.25 to 0.5 m): the game grid is 2 to 3 m, far too coarse for a 1 m wide trench.
  dig_trench, level_pad cut and fill with volume conservation: spoil goes to a bank (parapet or parados), bulking is a stated factor.
  cost_hours            person-hours by material, depth, frozen ground.
  slump                 cellular automaton: a face taller than the material can stand relaxes to its angle of repose; sum(height) is exactly conserved.
  viewshed, los_points  line of sight over the heightfield, with a margin (metres of ground in the way) that stands for cover.
  drainage              Priority-Flood from landform/hydrology.py if it can be imported, else a small copy: pond depth after a cut, and a drain ditch.
  score_sites           best dugout site: reverse-slope cover, concealment, drainage, dig cost, view of the approach.
Every number marked TUNING is a game choice; see the PROPS table and DIG_MODEL.md for what is real physics and what is a toy.
No real place names in this file.
"""
import heapq
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LI = os.path.dirname(HERE)
WORLDS = os.path.join(LI, 'landform', 'worlds')
MAPS = os.path.join(HERE, 'maps')

# ------------------------------------------------------------------ materials
MAT = ['sand', 'peat', 'soil', 'clay', 'gravel', 'ash', 'soft_rock', 'hard_rock']
MI = {m: i for i, m in enumerate(MAT)}
# rate: person-metres-cubed per hour for a fit digger with a spade or pick, shallow work, mid value (range in rate_lo, rate_hi).
# stand: vertical height (m) a cut face of that material stands unsupported when DRY. repose: angle (deg) it relaxes to when it slumps.
# soften: share of `stand` lost when fully soaked. bulk: loosening factor (spoil takes more room than the hole).
# TUNING values chosen inside the ranges reported in research/DIGGING_IN_GEOGRAPHY.md (sections 2.2 and 2.3).
PROPS = {
    'sand':      dict(rate=0.60, rate_lo=0.40, rate_hi=0.80, stand=0.35, repose=34.0, soften=0.9, bulk=1.12),
    'peat':      dict(rate=0.45, rate_lo=0.30, rate_hi=0.60, stand=0.90, repose=30.0, soften=0.3, bulk=1.30),
    'soil':      dict(rate=0.50, rate_lo=0.35, rate_hi=0.65, stand=1.10, repose=33.0, soften=0.5, bulk=1.25),
    'clay':      dict(rate=0.40, rate_lo=0.25, rate_hi=0.55, stand=1.60, repose=28.0, soften=0.6, bulk=1.30),
    'gravel':    dict(rate=0.35, rate_lo=0.20, rate_hi=0.50, stand=0.30, repose=38.0, soften=0.0, bulk=1.20),
    'ash':       dict(rate=0.60, rate_lo=0.40, rate_hi=0.80, stand=0.70, repose=33.0, soften=0.6, bulk=1.15),
    'soft_rock': dict(rate=0.10, rate_lo=0.05, rate_hi=0.20, stand=3.00, repose=60.0, soften=0.1, bulk=1.45),
    'hard_rock': dict(rate=0.02, rate_lo=0.01, rate_hi=0.04, stand=8.00, repose=80.0, soften=0.0, bulk=1.55),
}
_arr = lambda k: np.array([PROPS[m][k] for m in MAT], np.float64)
RATE, STAND, REPOSE, SOFTEN, BULK = (_arr(k) for k in ('rate', 'stand', 'repose', 'soften', 'bulk'))
TAN_REPOSE = np.tan(np.radians(REPOSE))
FROZEN_RATE = 0.30        # TUNING: frozen soil digs at 30 percent of the thawed rate (rock: unchanged)
FROZEN_STAND = 1.40       # TUNING: frozen soil stands 1.4 times taller (until it thaws)
TIMBER_BONUS = 1.8        # TUNING: extra standing height (m) behind a timber revetment panel
DEPTH_PENALTY = 0.20      # TUNING: each metre of depth beyond 1 m costs 20 percent more time (throwing the spoil up)

# exported rock id (manifest "rocks") -> material
ROCK_MAT = ['hard_rock', 'hard_rock', 'soft_rock', 'hard_rock', 'soft_rock', 'soft_rock', 'soft_rock', 'clay', 'hard_rock', 'soft_rock', 'clay',
            'gravel', 'sand', 'gravel', 'hard_rock', 'soft_rock', 'gravel', 'ash', 'hard_rock', 'sand', 'ash']
# exported vegetation class -> (mantle material, mantle thickness in m on flat ground); None = no mantle
VEG_MANTLE = {0: (None, 0.0), 1: (None, 0.0), 2: ('soil', 0.05), 3: ('soil', 0.5), 4: ('peat', 1.5), 5: ('sand', 2.0), 6: ('soil', 0.8), 7: ('soil', 0.4), 8: ('soil', 0.6),
              9: ('sand', 3.0), 10: ('gravel', 2.0), 11: ('peat', 0.8), 12: (None, 0.0), 13: ('soil', 0.5), 14: ('soil', 0.9), 15: ('soil', 0.8), 16: ('soil', 0.4),
              17: (None, 0.0), 18: (None, 0.0), 19: ('ash', 3.0)}
VEG_CONCEAL = {0: 0.0, 1: 0.0, 2: 0.0, 3: 0.4, 4: 0.3, 5: 0.15, 6: 0.15, 7: 0.1, 8: 0.6, 9: 0.0, 10: 0.0, 11: 0.3, 12: 0.0, 13: 0.5, 14: 0.9, 15: 0.9, 16: 0.6, 17: 0.0, 18: 0.0, 19: 0.0}
LOCH = 12


# ------------------------------------------------------------------ ground
class Ground:
    """A heightfield with what is under it. Row 0 = north edge (as the export). dx metres per cell."""

    def __init__(self, h, base, mat_rock, mat_soil, wet, veg, dx, sea=0.0, name=''):
        self.h = np.asarray(h, np.float64).copy()
        self.h0 = self.h.copy()
        self.base = np.asarray(base, np.float64).copy()          # top of bedrock; soil above it
        self.mat_rock = np.asarray(mat_rock, np.int64).copy()
        self.mat_soil = np.asarray(mat_soil, np.int64).copy()
        self.wet = np.asarray(wet, np.float64).copy()            # 0..1 export wetness
        self.veg = np.asarray(veg, np.int64).copy()
        self.dx = float(dx)
        self.sea = float(sea)
        self.name = name
        self.soak = np.zeros_like(self.h)                        # 0 dry .. 1 soaked (rain raises it)
        self.frozen = False
        self.props = np.zeros(self.h.shape, bool)                # True where a revetment panel holds the face

    @property
    def shape(self):
        return self.h.shape

    def copy(self):
        g = Ground(self.h, self.base, self.mat_rock, self.mat_soil, self.wet, self.veg, self.dx, self.sea, self.name)
        g.h0 = self.h0.copy()
        g.soak = self.soak.copy()
        g.frozen = self.frozen
        g.props = self.props.copy()
        return g

    def surface_mat(self):
        return np.where(self.h > self.base + 1e-9, self.mat_soil, self.mat_rock)

    def set_material(self, name):
        """Override: the whole ground is one material (tests and what-if). Soft and hard rock make the surface rock; the others make it a deep soil of that material."""
        i = MI[name]
        self.mat_soil[:] = i
        self.mat_rock[:] = i
        self.base[:] = (self.h.max() + 100.0) if name in ('soft_rock', 'hard_rock') else (self.h.min() - 100.0)


def slope_deg(h, dx):
    gy, gx = np.gradient(h, dx)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def load_world(seed):
    """Read landform/worlds/seedNNNN without importing anything else."""
    d = os.path.join(WORLDS, 'seed%04d' % seed)
    man = json.load(open(os.path.join(d, 'manifest.json')))
    blob = open(os.path.join(d, 'world.bin'), 'rb').read()
    nx = man['nx']

    def arr(name, dt):
        return np.frombuffer(blob, dtype=dt, count=nx * nx, offset=man['arrays'][name]['offset']).reshape(nx, nx)
    return dict(height=arr('height', '<i2').astype(np.float64) / man['height_scale'], rock=arr('rock', 'u1').astype(np.int64), veg=arr('veg', 'u1').astype(np.int64),
                wetness=arr('wetness', 'u1').astype(np.float64) / 255.0, dx=float(man['dx']), sea=float(man['sea_level']), nx=nx, seed=seed, rock_word=man['rock'])


def build_ground(w):
    h = w['height']
    dx = w['dx']
    sl = slope_deg(h, dx)
    mant_mat = np.full(h.shape, MI['soil'], np.int64)
    mant_t = np.zeros(h.shape)
    for v, (m, t) in VEG_MANTLE.items():
        sel = w['veg'] == v
        if m is not None:
            mant_mat[sel] = MI[m]
            mant_t[sel] = t
    mant_t *= np.clip(1.0 - sl / 40.0, 0.0, 1.0)          # thin soil on steep ground
    rock_mat = np.array([MI[m] for m in ROCK_MAT], np.int64)[np.clip(w['rock'], 0, len(ROCK_MAT) - 1)]
    # a rock that is itself loose (sand, gravel, ash) has no separate mantle: soil layer takes that material
    loose = np.isin(rock_mat, [MI['sand'], MI['gravel'], MI['ash'], MI['clay']])
    mant_mat = np.where(loose & (mant_t < 0.5), rock_mat, mant_mat)
    mant_t = np.where(loose, np.maximum(mant_t, 3.0), mant_t)
    return Ground(h, h - mant_t, rock_mat, mant_mat, w['wetness'], w['veg'], dx, w['sea'], name='seed%04d %s' % (w['seed'], w['rock_word']))


def refine(g, r, c, size_m, dx_new):
    """Fine copy of a square window centred on coarse cell (r, c): bilinear heights, nearest materials. Returns a new Ground (its own origin)."""
    n = int(round(size_m / dx_new))
    half = size_m / 2.0
    ys = (r * g.dx - half) + (np.arange(n) + 0.5) * dx_new
    xs = (c * g.dx - half) + (np.arange(n) + 0.5) * dx_new
    rr = np.clip(ys / g.dx, 0, g.h.shape[0] - 1)
    cc = np.clip(xs / g.dx, 0, g.h.shape[1] - 1)
    R, C = np.meshgrid(rr, cc, indexing='ij')
    h = sample(g.h, R, C)
    base = sample(g.base, R, C)
    wet = sample(g.wet, R, C)
    ri = np.clip(np.round(R).astype(int), 0, g.h.shape[0] - 1)
    ci = np.clip(np.round(C).astype(int), 0, g.h.shape[1] - 1)
    f = Ground(h, np.minimum(base, h), g.mat_rock[ri, ci], g.mat_soil[ri, ci], wet, g.veg[ri, ci], dx_new, g.sea, name=g.name + ' fine')
    f.soak = g.soak[ri, ci].copy()
    f.frozen = g.frozen
    return f


def sample(a, r, c):
    """Bilinear sample of array a at fractional (row, col); out of range is clamped to the edge."""
    r = np.clip(r, 0, a.shape[0] - 1.0000001)
    c = np.clip(c, 0, a.shape[1] - 1.0000001)
    r0 = np.floor(r).astype(int)
    c0 = np.floor(c).astype(int)
    fr = r - r0
    fc = c - c0
    return (a[r0, c0] * (1 - fr) * (1 - fc) + a[r0 + 1, c0] * fr * (1 - fc) + a[r0, c0 + 1] * (1 - fr) * fc + a[r0 + 1, c0 + 1] * fr * fc)


# ------------------------------------------------------------------ stability: stand height and slump
def stand_height(g):
    """Vertical height (m) each cell's face stands unsupported now: material, wet (soak and the export wetness), frozen, revetment."""
    m = g.surface_mat()
    soak = np.clip(g.soak + 0.0 * g.wet, 0, 1)
    s = STAND[m] * (1.0 - SOFTEN[m] * soak)
    if g.frozen:
        s = np.where(m < MI['soft_rock'], s * FROZEN_STAND, s)
    s = s + np.where(g.props, TIMBER_BONUS, 0.0)
    s = np.where(g.h > g.h0 + 0.02, 0.0, s)       # heaped spoil has no cohesion: it only stands at its angle of repose
    return s


def _face_height(h, dx, radius_m=1.5):
    """How tall a face stands at each cell: height above the lowest cell within radius (square window)."""
    k = max(1, int(round(radius_m / dx)))
    p = np.pad(h, k, mode='edge')
    lo = h.copy()
    n0, n1 = h.shape
    for di in range(-k, k + 1):
        for dj in range(-k, k + 1):
            lo = np.minimum(lo, p[k + di:k + di + n0, k + dj:k + dj + n1])
    return h - lo


_DIRS = [(0, 1, 1.0), (1, 0, 1.0), (1, 1, math.sqrt(2)), (1, -1, math.sqrt(2))]


def slump(g, max_iter=6000, tol=0.004, rate=0.10, refresh=4):
    """Relax every face that is taller than its material stands, down to the angle of repose. A face of height <= stand height is left alone
    (a cut in hard rock keeps its walls; a vertical cut in dry sand fails at once). Material moves from the higher cell to the lower; sum(h) is conserved
    to rounding. Returns dict(iters, converged, moved_m3, residual_m)."""
    h = g.h
    dx = g.dx
    t0 = h.sum()
    start = h.copy()
    resid = 0.0
    it = 0
    for it in range(1, max_iter + 1):
        if (it - 1) % refresh == 0:
            m = g.surface_mat()
            tanp = TAN_REPOSE[m]
            fh = _face_height(h, dx)
            fh = np.where(h > g.base + 1e-9, np.minimum(fh, np.maximum(h - g.base, 0.0)), fh)     # a soil layer only fails over its own thickness
            tall = fh > stand_height(g) + 1e-9
        out = np.zeros_like(h)
        mx = 0.0
        n0, n1 = h.shape
        for di, dj, ln in _DIRS:
            L = ln * dx
            # pair (a, b): a = [i, j], b = [i+di, j+dj]; slice both
            a = (slice(0, n0 - di), slice(max(0, -dj), n1 - max(0, dj)))
            b = (slice(di, n0), slice(max(0, dj), n1 - max(0, -dj)))
            ha, hb = h[a], h[b]
            d = ha - hb                              # >0: a higher than b
            for sgn in (1, -1):
                dd = d * sgn
                hi = a if sgn == 1 else b
                d0 = (g.h0[a] - g.h0[b]) * sgn
                allowed = np.maximum(L * tanp[hi], d0)      # ground that stood before we came keeps standing: only new steepness fails
                ex = dd - allowed
                act = (ex > 1e-12) & tall[hi]
                if not act.any():
                    continue
                mv = np.where(act, rate * ex, 0.0)
                mx = max(mx, float(np.where(act, ex, 0.0).max()))
                lo = b if sgn == 1 else a
                out[hi] -= mv
                out[lo] += mv
        h += out
        resid = mx
        if mx < tol:
            break
    g.h = h
    moved = float(np.abs(h - start).sum() * 0.5 * dx * dx)
    return dict(iters=it, converged=bool(resid < tol), moved_m3=moved, residual_m=float(resid), sum_change=float(h.sum() - t0))


# ------------------------------------------------------------------ cost
def cost_hours(g, h_new, mask=None):
    """Person-hours to lower the surface from g.h to h_new (only cells where h_new < h; fill costs nothing here). Soil layer and rock layer have their own rates;
    each metre of depth beyond 1 m adds DEPTH_PENALTY; frozen soil is slower."""
    cut = np.clip(g.h - h_new, 0, None)
    if mask is not None:
        cut = np.where(mask, cut, 0.0)
    top = g.h
    soil_t = np.clip(top - np.maximum(h_new, g.base), 0, None)
    rock_t = cut - soil_t
    rs = RATE[g.mat_soil].copy()
    rr = RATE[g.mat_rock].copy()
    if g.frozen:
        rs = np.where(g.mat_soil < MI['soft_rock'], rs * FROZEN_RATE, rs)
        rr = np.where(g.mat_rock < MI['soft_rock'], rr * FROZEN_RATE, rr)
    depth = np.clip(g.h0 - h_new, 0, None)
    pen = 1.0 + DEPTH_PENALTY * np.clip(depth - 1.0, 0, None)
    hrs = (soil_t / rs + rock_t / rr) * g.dx * g.dx * pen
    return float(hrs.sum())


def tunnel_hours(g, r, c, length_m, section_m2=1.2, depth_m=2.0):
    """Hours to drive a small gallery from a mouth at cell (r, c): section in m2 (a crawl-high gallery is about 1.2) times length, at the material rate under the mouth
    (rock below the mantle if the mantle is thinner than the cover). Muck is hauled out and banked (volume x bulk)."""
    m_soil = g.mat_soil[r, c]
    m_rock = g.mat_rock[r, c]
    thick = max(0.0, g.h[r, c] - g.base[r, c])
    m = m_rock if thick < depth_m else m_soil
    vol = length_m * section_m2
    rate = RATE[m] * (0.7 if length_m > 10 else 1.0)       # TUNING: hauling slows the face once the gallery is long
    return dict(material=MAT[m], volume_m3=vol, hours=vol / rate, spoil_m3=vol * BULK[m])


# ------------------------------------------------------------------ cut, fill, bank
def _seg_coords(g, p0, p1):
    """For each cell centre: along-distance t (m) from p0 and signed perpendicular distance s (m, positive to the left of p0->p1 when looking along it, y south)."""
    n0, n1 = g.shape
    ys = (np.arange(n0) + 0.5) * g.dx
    xs = (np.arange(n1) + 0.5) * g.dx
    X, Y = np.meshgrid(xs, ys)
    dxv, dyv = p1[0] - p0[0], p1[1] - p0[1]
    ln = math.hypot(dxv, dyv)
    ux, uy = dxv / ln, dyv / ln
    rx, ry = X - p0[0], Y - p0[1]
    t = rx * ux + ry * uy
    s = rx * uy - ry * ux          # left of travel (y down): positive when the cell is to the left
    return t, s, ln


def dig_trench(g, p0, p1, width=1.0, depth=1.2, spoil_side='right', bank_width=2.5, bulk=None, bank_cap=None, bank_offset=1.0):
    """Cut a straight trench from p0 to p1 (metres in the Ground frame: x east, y south) and bank the spoil beside it.
    The floor is `depth` below each cell's own ground (it follows the slope). The bank is a strip of `bank_width` beside the trench on `spoil_side`
    ('right' or 'left' looking from p0 to p1), set back `bank_offset` (1.0 m) from the lip so its weight is not on the edge; loose spoil volume = removed volume x bulk (bulk defaults to the material's). Returns a dict with the volumes."""
    t, s, ln = _seg_coords(g, p0, p1)
    along = (t >= 0) & (t <= ln)
    cutm = along & (np.abs(s) <= width / 2.0)
    side = -1.0 if spoil_side == 'right' else 1.0
    bank = along & (side * s >= width / 2.0 + bank_offset) & (side * s <= width / 2.0 + bank_offset + bank_width)
    if not cutm.any() or not bank.any():
        return dict(removed_m3=0.0, placed_m3=0.0, bulk=1.0, cells_cut=0, cells_bank=int(bank.sum()), hours=0.0, cut=cutm, bank=bank)
    new = g.h.copy()
    new[cutm] = g.h[cutm] - depth
    removed = float((g.h[cutm] - new[cutm]).sum() * g.dx * g.dx)
    hours = cost_hours(g, new, cutm)
    mmat = g.surface_mat()[cutm]
    b = float((BULK[mmat] * (g.h[cutm] - new[cutm])).sum() / max((g.h[cutm] - new[cutm]).sum(), 1e-12)) if bulk is None else bulk
    place_loose = removed * b
    add = place_loose / (bank.sum() * g.dx * g.dx)
    if bank_cap is not None:
        add = min(add, bank_cap)
    new[bank] += add
    placed = float(add * bank.sum() * g.dx * g.dx)
    g.h = new
    return dict(removed_m3=removed, placed_m3=placed, bulk=b, cells_cut=int(cutm.sum()), cells_bank=int(bank.sum()), hours=hours, cut=cutm, bank=bank)


def conservation(info):
    """Relative error of (loose spoil placed / bulk) against solid volume removed. 0 means exact."""
    if info['removed_m3'] <= 0:
        return 0.0
    return abs(info['placed_m3'] / info['bulk'] - info['removed_m3']) / info['removed_m3']


def level_pad(g, r, c, radius_m, bulk=1.0):
    """Level a round pad on a slope with cut = fill (a bench): the pad height is the mean height, so what is cut from the high side fills the low side.
    Returns dict(cut_m3, fill_m3, hours)."""
    n0, n1 = g.shape
    Y, X = np.meshgrid((np.arange(n0) + 0.5) * g.dx, (np.arange(n1) + 0.5) * g.dx, indexing='ij')
    cx, cy = (c + 0.5) * g.dx, (r + 0.5) * g.dx
    m = np.hypot(X - cx, Y - cy) <= radius_m
    z = float(g.h[m].mean())
    new = g.h.copy()
    new[m] = z
    cut = float(np.clip(g.h - new, 0, None).sum() * g.dx * g.dx)
    fill = float(np.clip(new - g.h, 0, None).sum() * g.dx * g.dx)
    hrs = cost_hours(g, np.where(m, np.minimum(new, g.h), g.h))
    g.h = new
    return dict(cut_m3=cut, fill_m3=fill, hours=hrs, level=z)


# ------------------------------------------------------------------ line of sight
def los_points(h, dx, obs, targets, eye=1.6, tgt_h=0.5, sea=0.0, nsteps=64):
    """Margin (m) for observer cell obs=(r, c, [z override]) to each target (K,2) of fractional cells: the greatest height by which ground rises above the sight line.
    margin <= 0: seen. margin > 0: that many metres of ground are in the way (cover). The sight line runs from eye height above the observer to tgt_h above the target."""
    hs = np.maximum(h, sea)
    targets = np.asarray(targets, np.float64).reshape(-1, 2)
    r0, c0 = obs[0], obs[1]
    z0 = float(sample(hs, np.array(float(r0)), np.array(float(c0)))) + eye
    zt = sample(hs, targets[:, 0], targets[:, 1]) + tgt_h
    margin = np.full(len(targets), -1e9)
    for i in range(1, nsteps):
        t = i / nsteps
        rr = r0 + t * (targets[:, 0] - r0)
        cc = c0 + t * (targets[:, 1] - c0)
        line = z0 + t * (zt - z0)
        margin = np.maximum(margin, sample(hs, rr, cc) - line)
    return margin


def viewshed(h, dx, obs, eye=1.6, tgt_h=0.5, sea=0.0, nsteps=None):
    """Whole-grid margin from one observer (see los_points) and visible = margin <= 0. Returns (visible bool, margin float)."""
    n0, n1 = h.shape
    R, C = np.meshgrid(np.arange(n0, dtype=np.float64), np.arange(n1, dtype=np.float64), indexing='ij')
    if nsteps is None:
        nsteps = int(max(n0, n1) * 1.2) + 8
    m = los_points(h, dx, obs, np.stack([R.ravel(), C.ravel()], 1), eye, tgt_h, sea, nsteps).reshape(n0, n1)
    return m <= 1e-9, m


# ------------------------------------------------------------------ drainage
def _import_hydrology():
    try:
        sys.path.insert(0, os.path.join(LI, 'landform'))
        import hydrology
        return hydrology
    except Exception:
        return None
    finally:
        try:
            sys.path.remove(os.path.join(LI, 'landform'))
        except ValueError:
            pass


_HYD = _import_hydrology()
_NB = ((-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0), (-1, -1, math.sqrt(2)), (-1, 1, math.sqrt(2)), (1, -1, math.sqrt(2)), (1, 1, math.sqrt(2)))


def _priority_flood(h, sea, eps=1e-6):
    """Small copy of the Priority-Flood with epsilon (Barnes, Lehman, Mulla 2014): used only when landform/hydrology.py cannot be imported."""
    ny, nx = h.shape
    flat = h.ravel()
    n = ny * nx
    filled = np.full(n, np.inf)
    parent = np.full(n, -1, np.int32)
    closed = np.zeros(n, bool)
    heap = []
    for i in range(n):
        r, c = divmod(i, nx)
        if flat[i] <= sea or r == 0 or c == 0 or r == ny - 1 or c == nx - 1:
            filled[i] = flat[i]
            closed[i] = True
            heap.append((flat[i], i))
    heapq.heapify(heap)
    order = []
    while heap:
        z, i = heapq.heappop(heap)
        order.append(i)
        r, c = divmod(i, nx)
        for dr, dc, _ in _NB:
            rr, cc = r + dr, c + dc
            if 0 <= rr < ny and 0 <= cc < nx:
                j = rr * nx + cc
                if not closed[j]:
                    closed[j] = True
                    parent[j] = i
                    filled[j] = max(flat[j], z + eps)
                    heapq.heappush(heap, (filled[j], j))
    return filled, parent, np.array(order, np.int64)


def drainage(h, dx, sea=0.0):
    """Returns dict(filled, pond (m, standing depth if nothing is bailed), parent, area (m2 draining through each cell)). Uses landform/hydrology.py if present."""
    if _HYD is not None:
        filled, parent, order = _HYD.priority_flood(h, sea)
        area = _HYD.accumulate(parent, order, np.full(h.size, dx * dx))
        src = 'landform/hydrology.py'
    else:
        filled, parent, order = _priority_flood(h, sea)
        area = np.full(h.size, dx * dx)
        for i in order[::-1]:
            p = parent[i]
            if p >= 0:
                area[p] += area[i]
        src = 'built-in copy'
    filled = filled.reshape(h.shape)
    return dict(filled=filled, pond=np.where(h > sea, filled - h, 0.0), parent=parent, area=area.reshape(h.shape), source=src)


def carve_drain(g, start, fall=0.01, max_cells=400, width_cells=1):
    """Cut a drain ditch from `start` (row, col) downhill along the flow path until it leaves the window or reaches the sea. The ditch bed falls at least `fall` (1 percent) per metre,
    so water in the trench has somewhere to go. The cut volume is banked nowhere (it is small): the returned volume says how much. Returns dict(cells, volume_m3, hours)."""
    d = drainage(g.h, g.dx, g.sea)
    parent = d['parent']
    ny, nx = g.shape
    i = start[0] * nx + start[1]
    path = [i]
    z = g.h[start]
    new = g.h.copy()
    prev_z = new[start]
    k = 0
    while parent[i] >= 0 and k < max_cells:
        j = int(parent[i])
        step = math.hypot((j // nx - i // nx), (j % nx - i % nx)) * g.dx
        want = prev_z - fall * step
        r, c = divmod(j, nx)
        if new[r, c] > want:
            new[r, c] = want
        prev_z = new[r, c]
        path.append(j)
        i = j
        k += 1
        if g.h[r, c] <= g.sea:
            break
    vol = float(np.clip(g.h - new, 0, None).sum() * g.dx * g.dx)
    hrs = cost_hours(g, new)
    g.h = new
    return dict(cells=len(path), volume_m3=vol, hours=hrs)


def water_table_depth(g):
    """Depth (m) of the water table below the surface: TUNING from the export wetness (wet ground: shallow) plus a little more under high ground (a thin fresh-water lens)."""
    return np.clip(0.3 + 3.2 * (1.0 - g.wet) ** 2 + 0.05 * np.clip(g.h - g.sea, 0, None), 0.15, 6.0)


# ------------------------------------------------------------------ best dugout site
DUG_VOLUME = 8.0       # m3 of a starter dugout with its entrance (3 x 2 x 1.4 plus the stair)
DUG_FLOOR = 1.4        # m below the surface


def approach_points(g, k=3):
    """Deterministic landing places: coastal land cells with gentle slope, spread with farthest-point picks. Returns list of (row, col)."""
    land = g.h > g.sea
    sea_n = np.zeros_like(land)
    sea_n[1:] |= ~land[:-1]
    sea_n[:-1] |= ~land[1:]
    sea_n[:, 1:] |= ~land[:, :-1]
    sea_n[:, :-1] |= ~land[:, 1:]
    sl = slope_deg(g.h, g.dx)
    cand = np.argwhere(land & sea_n & (sl < 25))
    if len(cand) == 0:
        cand = np.argwhere(land & sea_n)
    if len(cand) == 0:
        return []
    picks = [tuple(cand[0])]
    d = np.hypot(*(cand - np.array(picks[0])).T)
    while len(picks) < k and len(cand) > len(picks):
        j = int(np.argmax(d))
        picks.append(tuple(cand[j]))
        d = np.minimum(d, np.hypot(*(cand - cand[j]).T))
    return [(int(a), int(b)) for a, b in picks]


def score_sites(g, approaches=None, top_k=1500, w=None):
    """Score every cell as a dugout site. Returns dict of arrays (nan where not a candidate): score, cover, conceal, drain, cost, view, hours, plus `approaches`.
    cover   = ground between site and each approach (viewshed margin, 4 m of rise = 1.0)
    conceal = not seen from the approaches (60 percent) plus plant cover (40 percent)
    drain   = floor 1.4 m down stays above the water table, not a hollow, not on a channel
    cost    = exp(-hours / 30) for the 8 m3 starter dugout in the material under the site
    view    = share of a lane toward each approach that a lookout (highest cell within 15 m) can see, less for a longer walk to it
    Score = weighted sum, times (0.4 + 0.6 drain). The expensive view term is only run for the best `top_k` by the cheap terms."""
    w = w or dict(cover=0.30, conceal=0.15, drain=0.20, cost=0.15, view=0.20)
    h = g.h
    dx = g.dx
    n0, n1 = h.shape
    ap = approaches if approaches is not None else approach_points(g)
    sl = slope_deg(h, dx)
    land = (h > g.sea + 1.5) & (sl < 30) & (g.veg != LOCH)
    land[:4] = land[-4:] = False                # the window edge cuts the island: no sites there
    land[:, :4] = land[:, -4:] = False
    margins = []
    seen = []
    for a in ap:
        vis, m = viewshed(h, dx, a, eye=1.6, tgt_h=0.5, sea=g.sea)
        margins.append(m)
        seen.append(vis)
    cover = np.clip(np.mean([np.clip(m, 0, None) for m in margins], 0) / 4.0, 0, 1) if ap else np.zeros_like(h)
    vis_share = np.mean([s.astype(float) for s in seen], 0) if ap else np.ones_like(h)
    plant = np.array([VEG_CONCEAL.get(i, 0.0) for i in range(32)])[np.clip(g.veg, 0, 31)]
    conceal = (1 - vis_share) * 0.6 + 0.4 * plant
    # drainage
    dr = drainage(h, dx, g.sea)
    dry = np.clip((water_table_depth(g) - DUG_FLOOR) / 1.0, 0, 1)
    p = np.pad(h, 2, mode='edge')
    mean5 = sum(p[i:i + n0, j:j + n1] for i in range(5) for j in range(5)) / 25.0
    hollow = np.clip((mean5 - h) / 1.0, 0, 1)
    channel = np.clip(dr['area'] / (40.0 * dx * dx), 0, 1)
    drain = dry * (1 - 0.7 * hollow) * (1 - 0.5 * channel) * (1 - np.clip(dr['pond'] / 0.5, 0, 1))
    # cost
    soil_ok = np.clip(g.h - g.base, 0, None)
    depth = DUG_FLOOR
    soil_part = np.clip(soil_ok, 0, depth) / depth
    rate = soil_part * RATE[g.mat_soil] + (1 - soil_part) * RATE[g.mat_rock]
    bench = 1.0 + np.clip(np.tan(np.radians(sl)), 0, 1.0) * 1.5          # a site on a slope needs a bench: more volume
    hours = DUG_VOLUME * bench / np.maximum(rate, 1e-3) * (1.0 + DEPTH_PENALTY * 0.4)
    cost = np.exp(-hours / 30.0)
    pre = w['cover'] * cover + w['conceal'] * conceal + w['drain'] * drain + w['cost'] * cost
    pre = np.where(land, pre, -1.0)
    view = np.full(h.shape, np.nan)
    idx = np.argsort(-pre.ravel(), kind='stable')[:top_k]
    for f in idx:
        if pre.ravel()[f] < 0:
            break
        r, c = divmod(int(f), n1)
        kk = max(2, int(round(15.0 / dx)))                 # a lookout may be up to 15 m from the dugout
        r0, r1, c0, c1 = max(0, r - kk), min(n0, r + kk + 1), max(0, c - kk), min(n1, c + kk + 1)
        win = h[r0:r1, c0:c1]
        k = int(np.argmax(win))
        lr, lc = r0 + k // win.shape[1], c0 + k % win.shape[1]
        walk = math.hypot(lr - r, lc - c) * dx
        near = max(0.0, 1.0 - walk / 25.0)                 # the further you walk to look, the less it counts
        share = []
        for a in ap:
            ts = np.array([[r + (a[0] - r) * t, c + (a[1] - c) * t] for t in np.linspace(0.15, 0.85, 10)])
            m = los_points(h, dx, (lr, lc), ts, eye=1.6, tgt_h=0.8, sea=g.sea, nsteps=48)
            share.append(float((m <= 0).mean()))
        view[r, c] = (float(np.mean(share)) if share else 0.0) * near
    score = np.full(h.shape, np.nan)
    ok = ~np.isnan(view)
    sc = w['cover'] * cover + w['conceal'] * conceal + w['drain'] * drain + w['cost'] * cost + w['view'] * np.nan_to_num(view)
    sc = sc * (0.4 + 0.6 * drain)
    score[ok] = sc[ok]
    return dict(score=score, cover=cover, conceal=conceal, drain=drain, cost=cost, view=view, hours=hours, approaches=ap, pre=pre, land=land)


def best_sites(res, g, k=5, min_sep_m=30.0):
    """Top k scored cells, at least min_sep_m apart. Ties break on row-major order, so the answer is deterministic."""
    s = np.where(np.isnan(res['score']), -1.0, res['score'])
    order = np.argsort(-s.ravel(), kind='stable')
    n1 = g.shape[1]
    out = []
    for f in order:
        if s.ravel()[f] <= 0:
            break
        r, c = divmod(int(f), n1)
        if all(math.hypot(r - a, c - b) * g.dx >= min_sep_m for a, b in out):
            out.append((r, c))
            if len(out) >= k:
                break
    return out


# ------------------------------------------------------------------ one starter work on a fine patch (used by the 60-site run)
def try_trench_at(g, r, c, length=4.0, width=1.0, depth=1.2, size_m=24.0, dx_fine=0.5, soaked=False):
    """Dig a short trench centred on coarse cell (r, c) of ground g on a fine patch, slump it, report volumes, hours, standing depth."""
    f = refine(g, r, c, size_m, dx_fine)
    if soaked:
        f.soak[:] = 1.0
    mid = size_m / 2.0
    info = dig_trench(f, (mid - length / 2, mid), (mid + length / 2, mid), width, depth, spoil_side='right', bank_width=2.5)
    before = f.h.copy()
    s = slump(f)
    cut = info['cut']
    floor_after = float((f.h0[cut] - f.h[cut]).mean()) if cut.any() else 0.0
    return dict(info=info, slump=s, floor_depth=floor_after, hours=info['hours'], sum_err=abs(float(f.h.sum() - before.sum())), ground=f)


# ------------------------------------------------------------------ synthetic ridge world (tests)
def synthetic_ridge(ny=40, nx=100, dx=3.0, material='soil'):
    """A west-east test island: sea on the west edge, a ridge at column 50 (14 m), a dry reverse slope east of it, a wet hollow at columns 66 to 80. Row 0 north."""
    c = np.arange(nx, dtype=np.float64)
    prof = 3.0 + 0.02 * c + 14.0 * np.exp(-((c - 50.0) / 7.0) ** 2) - 2.5 * np.exp(-((c - 72.0) / 5.0) ** 2)
    prof[:6] = np.linspace(-1.0, prof[6], 6)
    h = np.tile(prof, (ny, 1))
    wet = np.full((ny, nx), 0.25)
    wet[:, 66:80] = 0.97
    veg = np.full((ny, nx), 6, np.int64)
    return Ground(h, h - 1.0, np.full((ny, nx), MI['soft_rock']), np.full((ny, nx), MI[material]), wet, veg, dx, 0.0, name='synthetic ridge')


# ------------------------------------------------------------------ maps
def hillshade(h, dx, az=315.0, alt=40.0):
    gy, gx = np.gradient(h, dx)
    az_r, alt_r = np.radians(az), np.radians(alt)
    slope = np.arctan(np.hypot(gx, gy))
    asp = np.arctan2(-gx, gy)
    return np.clip(np.sin(alt_r) * np.cos(slope) + np.cos(alt_r) * np.sin(slope) * np.cos(az_r - asp), 0, 1)


def write_maps(seed=5, outdir=MAPS):
    from PIL import Image, ImageDraw
    os.makedirs(outdir, exist_ok=True)
    g = build_ground(load_world(seed))
    ap = approach_points(g)
    land = g.h > g.sea
    hs = hillshade(g.h, g.dx)
    base = np.stack([60 + 150 * hs] * 3, -1)
    base[~land] = np.array([40, 70, 110]) + 40 * hs[~land][:, None]
    S = 6

    def up(a):
        return np.kron(a, np.ones((S, S) + ((1,) if a.ndim == 3 else ()), a.dtype))

    def save(img, name, title, marks=()):
        im = Image.fromarray(np.clip(up(img), 0, 255).astype(np.uint8))
        d = ImageDraw.Draw(im)
        for (r, c), col, rad in marks:
            x, y = (c + 0.5) * S, (r + 0.5) * S
            d.ellipse([x - rad, y - rad, x + rad, y + rad], outline=col, width=2)
        d.rectangle([0, 0, im.width, 14], fill=(20, 20, 20))
        d.text((4, 2), title, fill=(255, 255, 255))
        im.save(os.path.join(outdir, name))
    # viewshed from the first approach point
    a0 = ap[0]
    vis, m = viewshed(g.h, g.dx, a0, sea=g.sea)
    img = base.copy()
    img[land & vis] = img[land & vis] * 0.5 + np.array([120, 120, 20])
    save(img, 'viewshed_seed%04d.png' % seed, 'viewshed from the landing (ring); yellow = seen', [(a0, (255, 255, 255), 6)])
    # dead ground from all approaches
    allv = np.zeros(g.shape, bool)
    for a in ap:
        v, _ = viewshed(g.h, g.dx, a, sea=g.sea)
        allv |= v
    img = base.copy()
    dead = land & ~allv
    img[dead] = img[dead] * 0.4 + np.array([30, 90, 160])
    save(img, 'deadground_seed%04d.png' % seed, 'dead ground (blue) hidden from all %d landings' % len(ap), [(a, (255, 255, 255), 6) for a in ap])
    # best sites
    res = score_sites(g, ap)
    sites = best_sites(res, g, k=5)
    img = base.copy()
    sc = np.nan_to_num(res['score'], nan=0.0)
    mk = sc > 0
    if mk.any():
        t = sc / sc.max()
        img[mk] = img[mk] * 0.5 + np.stack([255 * t[mk], 200 * t[mk], 30 * np.ones(mk.sum())], -1) * 0.5
    save(img, 'sites_seed%04d.png' % seed, 'best dugout sites (rings 1-5); landings white', [(s, (255, 40, 40), 7) for s in sites] + [(a, (255, 255, 255), 4) for a in ap])
    return sites, ap, res


if __name__ == '__main__':
    sites, ap, res = write_maps(5)
    print('landings', ap)
    for s in sites:
        print('site', s, 'score %.2f cover %.2f conceal %.2f drain %.2f cost %.2f view %.2f hours %.0f' % tuple(float(res[k][s]) for k in ('score', 'cover', 'conceal', 'drain', 'cost', 'view', 'hours')))
