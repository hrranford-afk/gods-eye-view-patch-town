"""STAR FORT KIT: modular parts of a masonry-faced, earth-backed bastion fort as GLB files (pure python and numpy, no Blender needed). See STAR_FORT_KIT.md.
Reuses kit_model.py (builder, writer pattern, node and chart handling) and kit_tex.py (baker), and adds its own materials in starfort_tex.py.
Run:  python3 starfort_model.py --out DIR [--piece NAME|all] [--lod hero|live|far|all]

Frame in the file (glTF): +Y up, metres, y = 0 is the natural ground and the courtyard level. A wall piece is a run of wall along +X whose OUTER FACE LINE at y = 0 passes through the origin;
+Z points out toward the enemy (the front of the piece), -Z is the fort. Corner pieces have the origin at the corner vertex of the face line. Everything else (buildings, props) is centred on x = z = 0.
Cross-section of a rampart (z, y): the ditch floor is at y = -2.0 and the scarp wall rises from it with a slight batter to the cordon at y = 1.6; above the cordon a turf parapet rises to a crest at y = 3.0 and 3.2,
behind it a dry-stone revetment drops to the banquette tread at y = 2.1, one step down to the terreplein at y = 1.6, and the inner slope falls to the courtyard at y = 0. Total depth 6.45 m.
Each structural part holds three child nodes, one per damage state, and the page shows one: `intact`, `cracked` (spalled facing, chips, vegetation), `breached` (a gap with a rubble slope, rubble core and earth backing laid open).
Sockets are empty nodes `socket_*`: position on the face line at y = 0, rotation about Y = yaw, whose local +Z points OUT of the piece; two pieces join when their sockets coincide and face each other.
Original designs: no maker names, no lettering. Deterministic (hashed noise and seeded generators)."""
import sys, os, math, json, struct, argparse, zlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_tex as TX
import kit_model as KM
import starfort_tex as ST
from kit_model import unit, eul, quat_axis, stable_seed, Chunk, grid_faces

LODS = ('hero', 'live', 'far')
BUDGET = {'hero': (8000, 15000), 'live': (1500, 4000), 'far': (300, 700)}
SIZE_KB = {'hero': 1024, 'live': 300, 'far': 80}
TOTAL_KB = 8192
# per level: texture atlas, normal and orm divisor, texel density limit (texels per metre), jpeg quality (colour, normal, orm)
QL = {
    'hero': dict(pad=3, atlas=1024, ndiv=(2, 8), dens=200, far=False, q=(48, 42, 36)),
    'live': dict(pad=2, atlas=512, ndiv=(2, 8), dens=110, far=False, q=(48, 42, 36)),
    'far': dict(pad=1, atlas=256, ndiv=(2, 8), dens=60, far=True, q=(48, 42, 36)),
}

# ------------------------------------------------------------------------------------------------- a tighter atlas packer (replaces the shelf packer of kit_tex for this kit)
def pack_maxrects(sizes, S, pad, dens_max):
    """pack charts of physical size (su, sv, w) into an S x S atlas with the max-rects best-short-side rule; finds the largest density up to dens_max. returns (rects, density) like kit_tex.pack"""
    n = len(sizes)
    if n == 0: return [], 1.0
    def attempt(d):
        wh = [(max(3, int(math.ceil(su * d * w))) + 2 * pad, max(3, int(math.ceil(sv * d * w))) + 2 * pad) for (su, sv, w) in sizes]
        order = sorted(range(n), key=lambda i: (-max(wh[i]), -min(wh[i]), i)); free = [(0, 0, S, S)]; rects = [None] * n
        for i in order:
            w, h = wh[i]; best = None
            for fi, (fx, fy, fw, fh) in enumerate(free):
                if w <= fw and h <= fh:
                    sc = (min(fw - w, fh - h), max(fw - w, fh - h), fy, fx)
                    if best is None or sc < best[0]: best = (sc, fi, fx, fy)
            if best is None: return None
            _, fi, x, y = best; rects[i] = (x, y, w, h); new = []
            for (fx, fy, fw, fh) in free:
                if x >= fx + fw or x + w <= fx or y >= fy + fh or y + h <= fy: new.append((fx, fy, fw, fh)); continue
                if x > fx: new.append((fx, fy, x - fx, fh))
                if x + w < fx + fw: new.append((x + w, fy, fx + fw - x - w, fh))
                if y > fy: new.append((fx, fy, fw, y - fy))
                if y + h < fy + fh: new.append((fx, y + h, fw, fy + fh - y - h))
            free = [r for r in new if not any(o is not r and r[0] >= o[0] and r[1] >= o[1] and r[0] + r[2] <= o[0] + o[2] and r[1] + r[3] <= o[1] + o[3] for o in new)]
        return rects
    lo, hi = 1.0, dens_max; best = attempt(lo)
    while best is None and lo > 0.05: lo *= 0.5; best = attempt(lo)
    r = attempt(hi)
    if r is not None: return r, hi
    for _ in range(12):
        mid = (lo + hi) / 2; r = attempt(mid)
        if r is None: hi = mid
        else: lo = mid; best = r
    return best, lo


TX.pack = pack_maxrects


# ------------------------------------------------------------------------------------------------- the rampart cross-section (z outward, y up)
DITCH_Y = -2.0
CORDON_Y = 2.58
CREST_Y = 4.0
TERR_Y = 2.6
BANQ_Y = 3.1
BATTER = 0.087         # scarp lean: 1 in 11.5
DEPTH = 8.7            # from the face line at the ditch floor back to the inner toe
SEG = 4.0              # a straight wall segment
# profile sections, outer base to inner toe: name, material, texture weight, polyline of (z, y), options (rs: row step, cs: column step in metres, hidden: not drawn)
RAMPART = [
    ('scarp',  'ashlar', 1.00, [(0.20, -2.00), (-0.20, 2.58)], dict(rs=0.25, cs=0.40)),
    ('cordon', 'ashlar', 0.55, [(-0.20, 2.58), (-0.12, 2.63), (-0.08, 2.70), (-0.12, 2.77), (-0.20, 2.82)], dict(rs=0.06, cs=0.5)),
    ('outer',  'grass',  0.40, [(-0.20, 2.82), (-0.36, 2.86), (-1.45, 4.00)], dict(rs=0.35, cs=0.4)),
    ('top',    'grass',  0.40, [(-1.45, 4.00), (-2.50, 4.20)], dict(rs=0.4, cs=0.4)),
    ('revet',  'rough',  0.45, [(-2.50, 4.20), (-2.65, 3.10)], dict(rs=0.3, cs=0.4)),
    ('banq',   'gravel', 0.40, [(-2.65, 3.10), (-3.55, 3.10)], dict(rs=0.45, cs=0.5)),
    ('riser',  'ashlar', 0.35, [(-3.55, 3.10), (-3.60, 2.60)], dict(rs=0.3, cs=0.5)),
    ('terr',   'gravel', 0.40, [(-3.60, 2.60), (-6.60, 2.60)], dict(rs=0.5, cs=0.5)),
    ('slope',  'grass',  0.40, [(-6.60, 2.60), (-8.70, 0.00)], dict(rs=0.4, cs=0.4)),
]
FOUND_Z = -1.3         # the masonry foundation of the scarp reaches back this far below ground
# the lower ravelin wall, a detached triangle in front of a curtain
RAVELIN = [
    ('scarp',  'ashlar', 1.00, [(0.20, -2.00), (-0.16, 1.20)], dict(rs=0.25, cs=0.40)),
    ('cordon', 'ashlar', 0.55, [(-0.16, 1.20), (-0.10, 1.25), (-0.06, 1.32), (-0.10, 1.39), (-0.16, 1.44)], dict(rs=0.06, cs=0.5)),
    ('outer',  'grass',  0.40, [(-0.16, 1.44), (-0.30, 1.48), (-1.20, 2.50)], dict(rs=0.35, cs=0.4)),
    ('top',    'grass',  0.40, [(-1.20, 2.50), (-2.10, 2.65)], dict(rs=0.4, cs=0.4)),
    ('revet',  'rough',  0.45, [(-2.10, 2.65), (-2.20, 1.85)], dict(rs=0.3, cs=0.4)),
    ('banq',   'gravel', 0.40, [(-2.20, 1.85), (-2.90, 1.85)], dict(rs=0.45, cs=0.5)),
    ('riser',  'ashlar', 0.35, [(-2.90, 1.85), (-2.95, 1.40)], dict(rs=0.3, cs=0.5)),
    ('terr',   'gravel', 0.40, [(-2.95, 1.40), (-3.80, 1.40)], dict(rs=0.5, cs=0.5)),
    ('slope',  'grass',  0.40, [(-3.80, 1.40), (-5.20, 0.00)], dict(rs=0.4, cs=0.4)),
]
RAVELIN_DEPTH = 5.2
# the counterscarp: the masonry wall on the far side of the ditch, face toward the fort (the piece is turned to face +Z and placed turned round)
COUNTERSCARP = [
    ('scarp',  'ashlar', 1.00, [(0.10, -2.00), (-0.05, 0.00)], dict(rs=0.25, cs=0.45)),
    ('cordon', 'ashlar', 0.55, [(-0.05, 0.00), (0.06, 0.04), (0.06, 0.16), (-0.10, 0.20)], dict(rs=0.05, cs=0.5)),
    ('coping', 'ashlar', 0.45, [(-0.10, 0.20), (-1.20, 0.20)], dict(rs=0.6, cs=0.5)),
    ('back',   'rough',  0.30, [(-1.20, 0.20), (-1.30, 0.00)], dict(rs=0.2, cs=0.5)),
    ('hide',   'rough',  0.10, [(-1.30, 0.00), (-1.30, -2.00)], dict(hidden=True)),
]
# the covered way and its low parapet, from the counterscarp coping outward (+Z) to the crest of the glacis
COVERED = [
    ('walk',   'gravel', 0.45, [(0.00, 0.00), (1.90, 0.00)], dict(rs=0.6, cs=0.5)),
    ('riser',  'ashlar', 0.40, [(1.90, 0.00), (1.92, 0.28)], dict(rs=0.2, cs=0.5)),
    ('banq',   'gravel', 0.40, [(1.92, 0.28), (2.40, 0.28)], dict(rs=0.5, cs=0.5)),
    ('riser2', 'ashlar', 0.40, [(2.40, 0.28), (2.42, 0.56)], dict(rs=0.2, cs=0.5)),
    ('banq2',  'gravel', 0.40, [(2.42, 0.56), (2.90, 0.56)], dict(rs=0.5, cs=0.5)),
    ('revet',  'rough',  0.45, [(2.90, 0.56), (3.05, 1.18)], dict(rs=0.3, cs=0.4)),
    ('top',    'grass',  0.40, [(3.05, 1.18), (3.80, 1.24)], dict(rs=0.4, cs=0.4)),
    ('outer',  'grass',  0.40, [(3.80, 1.24), (4.60, 0.95)], dict(rs=0.4, cs=0.4)),
    ('hide',   'earth',  0.10, [(4.60, 0.95), (4.60, 0.00), (0.00, 0.00)], dict(hidden=True)),
]


# ------------------------------------------------------------------------------------------------- the builder (kit_model.Kit with own quality levels and charts with their own coordinates)
class SFKit(KM.Kit):
    def __init__(s, piece, lod, res=1.0):
        s.piece = piece; s.lod = lod; s.Q = dict(QL[lod]); s.Q['res'] = res; s.Q['detail'] = {'hero': 2, 'live': 1, 'far': 0}[lod]
        s.nodes = {}; s.order = []; s.footprint = []; s.meta = {}; s.extra = {}; s.sockets = []; s.charts = {}
        s.node('root', None, (0, 0, 0))

    def grid2(s, node, mat, P, prm=None, out=None, w=1.0, double=False, keep=None, su=None, sv=None, u=None, v=None, share=None, reg=None):
        """like Kit.grid, but the chart coordinates u (0..1 along columns) and v (0..1 along rows) may be given per vertex, and the chart size in metres su, sv"""
        P = np.asarray(P, float); nr, nc = P.shape[:2]; prm = dict(prm or {}); prm.setdefault('seed', s.sd(node, mat, len(s.nodes[node].chunks)))
        du = np.gradient(P, axis=1) if nc > 1 else np.zeros_like(P); dv = np.gradient(P, axis=0) if nr > 1 else np.zeros_like(P); N = np.cross(du, dv)
        ln = np.linalg.norm(N, axis=-1, keepdims=True); N = N / np.maximum(ln, 1e-12); bad = ln[..., 0] < 1e-9
        F, rowid = grid_faces(nr, nc)
        if keep is not None: F = F[np.repeat(np.asarray(keep, bool).reshape(-1), 2)]
        sg = 1.0
        if out is not None:
            o = np.broadcast_to(np.asarray(out, float), P.shape); good = ~bad
            sg = 1.0 if (np.mean(np.sum(N[good] * o[good], -1)) >= 0 if good.any() else True) else -1.0
        if sg < 0: N = -N; F = F[:, [0, 2, 1]]
        if out is not None and bad.any(): N = np.where(bad[..., None], unit(np.broadcast_to(np.asarray(out, float), P.shape)), N)
        if su is None: su = float(np.mean(np.linalg.norm(np.diff(P, axis=1), axis=-1).sum(1)))
        if sv is None: sv = float(np.mean(np.linalg.norm(np.diff(P, axis=0), axis=-1).sum(0)))
        if u is None: u = np.broadcast_to(np.linspace(0, 1, nc)[None, :], (nr, nc))
        if v is None: v = np.broadcast_to(np.linspace(0, 1, nr)[:, None], (nr, nc))
        UV = np.stack([np.asarray(u, float), np.asarray(v, float)], -1).reshape(-1, 2)
        s._add(node, Chunk(mat, prm, P.reshape(-1, 3), N.reshape(-1, 3), UV, F, su, sv, w, double))
        ch = s.nodes[node].chunks[-1] if s.nodes[node].chunks else None
        if ch is not None:
            ch.share = share
            if reg is not None: s.charts[reg] = ch

    def count(s, n, lo=1): return max(lo, int(round(n * s.Q['res'])))


# ------------------------------------------------------------------------------------------------- the face-line path with mitred offsets
class Path:
    """a polyline of face-line vertices (x, z) in the piece frame. The outward normal of a segment with direction t is (-t_z, t_x). offset(z) of every vertex is mitred, so a corner
    of any angle is swept without a gap. Arms must be long enough that the rear offset lines of a convex corner meet inside them (arm >= depth * tan(turn / 2))."""
    def __init__(s, pts):
        s.V = np.array(pts, float); n = len(s.V); s.T = []; s.N = []; s.L = []
        for i in range(n - 1):
            d = s.V[i + 1] - s.V[i]; l = float(np.hypot(*d)); t = d / l; s.T.append(t); s.N.append(np.array([-t[1], t[0]])); s.L.append(l)
        s.S = np.concatenate([[0.0], np.cumsum(s.L)]); s.total = float(s.S[-1])
        s.M = []
        for i in range(n):
            if i == 0: s.M.append(s.N[0].copy())
            elif i == n - 1: s.M.append(s.N[-1].copy())
            else:
                a, b = s.N[i - 1], s.N[i]; s.M.append((a + b) / (1.0 + float(a @ b)))
        s.M = np.array(s.M); s.N = np.array(s.N); s.T = np.array(s.T)

    def at(s, S, Z):
        """positions (x, z) for chart coordinate S (nr, nc) along the path and offsets Z (nr,) from the face line. returns (nr, nc, 2)"""
        S = np.asarray(S, float); Z = np.asarray(Z, float)
        k = np.clip(np.searchsorted(s.S, S, side='right') - 1, 0, len(s.L) - 1); t = (S - s.S[k]) / np.array(s.L)[k]
        Mv = s.V[None, :, :] + Z[:, None, None] * s.M[None, :, :]       # (nr, nv, 2)
        rows = np.arange(len(Z))[:, None] * np.ones_like(k)
        A = Mv[rows, k]; B = Mv[rows, k + 1]
        return A + (B - A) * t[..., None]

    def normal_at(s, S):
        k = np.clip(np.searchsorted(s.S, np.asarray(S, float), side='right') - 1, 0, len(s.L) - 1); return s.N[k]


def straight_path(L=SEG):
    return Path([(-L / 2.0, 0.0), (L / 2.0, 0.0)])


def corner_path(a1, a2, turn_deg):
    """arm 1 along +x ending at the vertex (0, 0), then arm 2 turned by turn_deg (positive toward +z = concave, negative toward -z = convex)"""
    d = math.radians(turn_deg)
    return Path([(-a1, 0.0), (0.0, 0.0), (a2 * math.cos(d), a2 * math.sin(d))])


def yaw_of(dx, dz): return math.degrees(math.atan2(dx, dz))


# ------------------------------------------------------------------------------------------------- profile helpers
def prof_points(profile=RAMPART): return [p for sec in profile for p in sec[3]]


def width_at(profile, y, found=FOUND_Z):
    """(z_back, z_front) of the solid at height y: the innermost and outermost crossings of the profile with the horizontal line. below the ground the foundation block"""
    zs = []
    for sec in profile:
        pts = sec[3]
        for (z0, y0), (z1, y1) in zip(pts[:-1], pts[1:]):
            if (y0 - y) * (y1 - y) <= 0 and y0 != y1: zs.append(z0 + (z1 - z0) * (y - y0) / (y1 - y0))
            elif y0 == y1 == y: zs += [z0, z1]
    if not zs: return None
    return min(zs), max(zs)


def sec_rows(K, pts, step, align=None, lo=2):
    """sample a section polyline: rows (z, y) from first to last point. align: spacing in y to snap to (courses)"""
    pts = np.array(pts, float); seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); L = float(seg.sum())
    if align and len(pts) == 2:
        y0, y1 = pts[0, 1], pts[1, 1]; lo_, hi_ = min(y0, y1), max(y0, y1); ys = list(np.arange(math.ceil(lo_ / align - 1e-6) * align, hi_ - 1e-6, align)); ys = [y0] + [y for y in ys if abs(y - y0) > 1e-6] + [y1]
        ys = sorted(set(round(y, 5) for y in ys), reverse=(y1 < y0))
        if K.Q['res'] < 0.7: ys = ys[::max(1, int(round(1.0 / K.Q['res'] / 1.3)))]; ys = ys + ([y1] if ys[-1] != y1 else [])
        zs = np.interp(ys, [y0, y1] if y1 > y0 else [y1, y0], [pts[0, 0], pts[1, 0]] if y1 > y0 else [pts[1, 0], pts[0, 0]])
        return np.stack([zs, ys], 1)
    n = max(lo, int(math.ceil(L / step * K.Q['res'])) + 1)
    cum = np.concatenate([[0], np.cumsum(seg)]); t = np.linspace(0, L, n)
    return np.stack([np.interp(t, cum, pts[:, 0]), np.interp(t, cum, pts[:, 1])], 1)


def col_s(K, path, step, extra=()):
    """chart coordinates along the path: even steps, plus every vertex and any extras"""
    n = max(2, int(math.ceil(path.total / step * K.Q['res'])))
    s = list(np.linspace(0, path.total, n + 1)) + list(path.S) + list(extra)
    s = sorted(set(round(float(v), 4) for v in s)); out = [s[0]]
    for v in s[1:]:
        if v - out[-1] > 0.02: out.append(v)
    out[-1] = path.total
    return np.array(out)


# ------------------------------------------------------------------------------------------------- damage fields shared by geometry and texture
def lumps(P, seed, f=2.2, a=1.0):
    return (ST.fbm3(P.reshape(-1, 3).astype(np.float32), f, 3, seed).reshape(P.shape[:-1]) - 0.5) * 2.0 * a


def spall_geom(P, seed, amount):
    return ST.spall_field(P.reshape(-1, 3).astype(np.float32), seed, amount).reshape(P.shape[:-1])


def taper_ends(nr, nc, u, v, au, av):
    """0 at the border of a grid (chart coordinates u, v in metres from the edge), 1 inside"""
    return ST.sst(0.0, au, u) * ST.sst(0.0, au, np.max(u) - u) * ST.sst(0.0, av, v) * ST.sst(0.0, av, np.max(v) - v)


# ------------------------------------------------------------------------------------------------- the rampart band, in three damage states
def sweep_section(K, node, path, sec, state, seed, s_range=None, cut=None, wmat=None, base_prm=None, dispfn=None, share=None, reg=None, hole=None):
    """one profile section swept along the path. s_range (s0, s1) limits the run; cut = function (z, y) -> the s of a ragged end (for the s1 end; mirrored when cut_at == 0)"""
    name, mat, w, pts = sec[:4]; opts = sec[4] if len(sec) > 4 else {}
    if opts.get('hidden'): return None
    step_r = opts.get('rs', 0.35); cstep = opts.get('cs', 0.45)
    if state >= 1: cstep *= 0.62; step_r *= 0.8
    rows = sec_rows(K, pts, step_r, align=0.25 if name in ('scarp',) and K.Q['res'] > 0.7 else None, lo=2 if name != 'cordon' else (3 if K.Q['res'] > 0.5 else 2))
    nr = len(rows)
    if s_range is None:
        S1 = col_s(K, path, cstep); S = np.broadcast_to(S1[None, :], (nr, len(S1))).copy()
    else:
        s0, s1 = s_range; n = max(2, int(math.ceil((s1 - s0) / cstep * K.Q['res'])))
        t = np.linspace(0, 1, n + 1)[None, :]; send = np.full(nr, s1, float); sstart = np.full(nr, s0, float)
        if cut is not None:
            kind, fn = cut; vals = np.array([fn(z, y) for z, y in rows], float)
            if kind == 'end': send = vals
            else: sstart = vals
        S = sstart[:, None] + (send - sstart)[:, None] * t
    xz = path.at(S, rows[:, 0])
    P = np.stack([xz[..., 0], np.broadcast_to(rows[:, 1][:, None], S.shape), xz[..., 1]], -1)
    # out directions: profile normal (dy, -dz) mapped onto the plan normal
    dz = np.gradient(rows[:, 0]) if nr > 1 else np.array([0.0]); dy = np.gradient(rows[:, 1]) if nr > 1 else np.array([1.0]); ln = np.maximum(np.hypot(dz, dy), 1e-9)
    nz = dy / ln; ny = -dz / ln; Np = path.normal_at(S)
    out = np.stack([Np[..., 0] * nz[:, None], np.broadcast_to(ny[:, None], S.shape), Np[..., 1] * nz[:, None]], -1)
    if dispfn is not None:
        d = dispfn(name, P, S, rows, state, seed)
        if d is not None:
            tp = ST.sst(0.0, 0.22, S - S[:, :1]) * ST.sst(0.0, 0.22, S[:, -1:] - S) if s_range is None else 1.0
            ve = np.linspace(0, 1, nr)[:, None]; arcv = np.cumsum(np.concatenate([[0], np.hypot(np.diff(rows[:, 0]), np.diff(rows[:, 1]))]))[:, None]
            tv = ST.sst(0.0, 0.12, arcv) * ST.sst(0.0, 0.12, arcv[-1] - arcv)
            P = P + unit(out) * (d * tp * tv)[..., None]
    su = path.total if s_range is None else float(np.mean(S[:, -1] - S[:, 0])); arc = np.concatenate([[0], np.cumsum(np.hypot(np.diff(rows[:, 0]), np.diff(rows[:, 1])))])
    uu = S / max(path.total, 1e-6)
    vv = np.broadcast_to((arc / max(arc[-1], 1e-6))[:, None], S.shape)
    prm = dict(base_prm or {}); prm['seed'] = seed + stable_seed(name) % 97
    if s_range is None and name == 'scarp': prm.setdefault('quoin_all', None)
    keep = None
    if hole is not None and name == 'scarp':
        cx = 0.25 * (P[:-1, :-1] + P[1:, :-1] + P[:-1, 1:] + P[1:, 1:]); keep = ~hole(cx[..., 0], cx[..., 1], cx[..., 2])
    K.grid2(node, mat, P, prm, out=out, w=(wmat or {}).get(name, w), su=path.total, sv=float(arc[-1]), u=uu, v=vv, share=share, reg=reg, keep=keep)
    return P, rows, S


def wall_disp(name, P, S, rows, state, seed):
    """displacement along the section's outward normal, metres. state 0 intact (slight lumps), 1 cracked (spalls, bulges, torn turf)"""
    nr, nc = P.shape[:2]
    if name == 'scarp':
        d = 0.006 * lumps(P, seed + 1, 2.6) + 0.004 * lumps(P, seed + 2, 11.0)
        if state >= 1:
            sp = spall_geom(P, seed, 1.0) * ST.sst(-1.7, -0.6, P[..., 1]); d = d - 0.085 * sp + 0.02 * lumps(P, seed + 3, 1.1) - 0.012 * lumps(P, seed + 4, 14.0) * sp
        return d
    if name in ('outer', 'top', 'slope'):
        d = 0.05 * lumps(P, seed + 5, 2.2) + 0.015 * lumps(P, seed + 6, 9.0)
        if state >= 1: d = d - 0.10 * ST.sst(0.62, 0.78, ST.fbm3(P.reshape(-1, 3).astype(np.float32), 2.4, 3, seed + 7).reshape(P.shape[:-1])) + 0.04 * lumps(P, seed + 8, 3.4)
        return d
    if name == 'cordon':
        d = 0.004 * lumps(P, seed + 9, 6.0)
        if state >= 1: d = d - 0.05 * ST.sst(0.6, 0.78, ST.fbm3(P.reshape(-1, 3).astype(np.float32), 3.0, 3, seed + 10).reshape(P.shape[:-1]))
        return d
    if name in ('banq', 'terr', 'walk', 'banq2'): return 0.015 * lumps(P, seed + 11, 3.0) + (0.02 * lumps(P, seed + 12, 8.0) if state >= 1 else 0.0)
    if name == 'revet': return 0.02 * lumps(P, seed + 13, 4.0) + (0.04 * lumps(P, seed + 14, 3.0) if state >= 1 else 0.0)
    return None


# ------------------------------------------------------------------------------------------------- a wall piece: the three states, sockets, footprint
def hp_hint(thick_stone, thick_earth, length):
    """suggested hit points from fortify/ballistics_toy.py MATERIALS (hp_per_m: stone 52, earth 30 per metre of thickness) per 2 m part (TUNING, not measured)"""
    return {'source': 'fortify/ballistics_toy.py MATERIALS and Part (hp = hp_per_m x thickness; damaged at half, failed at zero)', 'confidence': 'Low (game tuning)',
            'part_length_m': 2.0, 'parts_in_piece': round(length / 2.0, 2),
            'facing': {'material': 'stone', 'hp_per_m': 52, 'thickness_m': thick_stone, 'max_hp': round(52 * thick_stone, 1), 'rubble_fraction': 0.25},
            'backing': {'material': 'earth', 'hp_per_m': 30, 'thickness_m': thick_earth, 'max_hp': round(30 * thick_earth, 1), 'rubble_fraction': 0.35},
            'state_hp': {'intact': round(52 * thick_stone, 1), 'cracked': round(26 * thick_stone, 1), 'breached': 0.0},
            'note': 'swap to cracked when the facing hp falls to half, to breached at zero; the earth backing then takes the shots'}


STATE_NAMES = ('intact', 'cracked', 'breached')


def add_sockets(K, items):
    """items: [(name, x, z, yaw_deg, kind)]: empty nodes whose +Z points out of the piece"""
    for name, x, z, yaw, kind in items:
        K.node(name, 'root', (x, 0.0, z), role='socket', kind=kind, yaw_deg=round(yaw, 4), rest=('y', yaw), note='local +Z points out of the piece; two sockets join when they coincide and face each other')
        K.sockets.append(dict(name=name, position=[round(x, 4), 0.0, round(z, 4)], yaw_deg=round(yaw, 4), kind=kind))


def band_footprint(path, profile=RAMPART, depth=DEPTH, zf=0.2):
    zb = -depth; n = len(path.V)
    outer = [tuple(path.V[i] + zf * path.M[i]) for i in range(n)]; inner = [tuple(path.V[i] + zb * path.M[i]) for i in range(n)][::-1]
    return outer + inner


def tufts(K, node, pts, rng, size=0.32, seed=1, tone=None):
    """small clumps of grass or weed: three crossed curved blades each (hero and live only)"""
    if K.Q['far'] or K.Q['res'] < 0.35: return
    for i, (x, y, z) in enumerate(pts):
        a = rng.uniform(0, math.pi); h = size * rng.uniform(0.7, 1.3)
        for k in range(4):
            ang = a + k * math.pi / 4; dx, dz = math.cos(ang) * 0.5 * h, math.sin(ang) * 0.5 * h; P = np.zeros((3, 3, 3))
            for r in range(3):
                t = r / 2.0
                for c_ in range(3):
                    f = (c_ - 1.0)
                    P[r, c_] = (x + f * dx * (1 - 0.55 * t) + 0.2 * h * t * t * math.cos(ang + 1.0), y + t * h, z + f * dz * (1 - 0.55 * t) + 0.2 * h * t * t * math.sin(ang + 1.0))
            K.grid2(node, 'grass', P, {'seed': seed + i, 'lush': 1.0}, out=(0, 1, 0), double=True, w=0.12, u=0.3 + 0.4 * np.broadcast_to(np.linspace(0, 1, 3)[None, :], (3, 3)), v=0.3 + 0.4 * np.broadcast_to(np.linspace(0, 1, 3)[:, None], (3, 3)), share=K.charts[('main', 'top')])


def share_blob(K, node):
    """all loose stones of a piece use one chart: the first one is baked, the rest read from it"""
    ch = K.nodes[node].chunks[-1]
    if 'stones' in K.charts and K.charts['stones'] is not ch: ch.share = K.charts['stones']
    else: K.charts['stones'] = ch; ch.share = None


def rubble_stones(K, node, rng, cx, cz, rx, rz, count, y_fn, size=(0.18, 0.5), tones=('grey', 'grey', 'pale', 'slate'), yaw=0.0, w=0.35):
    """dressed stone fragments lying on a heap: rounded blocks (superellipsoids) sitting on the surface height y_fn(x, z)"""
    for i in range(count):
        a = rng.uniform(0, 2 * math.pi); r = math.sqrt(rng.uniform(0, 1)); lx = rx * r * math.cos(a); lz = rz * r * math.sin(a)
        x = cx + lx * math.cos(math.radians(yaw)) + lz * math.sin(math.radians(yaw)); z = cz - lx * math.sin(math.radians(yaw)) + lz * math.cos(math.radians(yaw))
        sz = rng.uniform(*size); y = y_fn(x, z) + sz * 0.22
        nu = max(5, K.count(8, 5)); nv = max(2, K.count(3, 2))
        if K.Q['far']: nu, nv = 5, 2
        R = eul(float(rng.uniform(-35, 35)), float(rng.uniform(0, 360)), float(rng.uniform(-35, 35)))
        K.blob(node, 'frag', (x, y, z), (sz * rng.uniform(0.8, 1.35), sz * rng.uniform(0.45, 0.7), sz * rng.uniform(0.6, 0.95)), R, {'tone': 'grey', 'seed': 7}, nu, nv, (5.5, 4.6), 0.07, None, 3.0, int(rng.integers(1, 900)), w)
        share_blob(K, node)


def breach_heap(K, node, path, c, hw, seed, wplan, ramp, w=0.5):
    """the rubble slope in a gap: a bumpy height field across the window c +- hw (along the path) from the ditch out front to the inner toe; ramp = [(z, y), ...] its profile along z"""
    ds = 0.3 / max(K.Q['res'], 0.3) ** 0.5 if K.Q['res'] < 1 else 0.3; ds = max(ds, 0.3)
    s0 = max(0.0, c - hw - 1.4); s1 = min(path.total, c + hw + 1.4); ns = max(5, int(math.ceil((s1 - s0) / ds))); S1 = np.linspace(s0, s1, ns + 1)
    rz = np.array(ramp, float); zl = np.linspace(rz[0, 0], rz[-1, 0], max(6, K.count(24, 6))); zl = zl[::-1] if zl[0] < zl[-1] else zl
    zr = np.interp(-zl, -rz[:, 0] if rz[0, 0] > rz[-1, 0] else -rz[:, 0][::-1], rz[:, 1] if rz[0, 0] > rz[-1, 0] else rz[:, 1][::-1])
    S = np.broadcast_to(S1[None, :], (len(zl), len(S1))); xz = path.at(S, zl)
    g = ST.sst(hw + 1.5, hw * 0.3, np.abs(S - c)) * ST.sst(0.0, 0.9, S) * ST.sst(0.0, 0.9, path.total - S); base = DITCH_Y + (zr[:, None] - DITCH_Y) * (0.35 * ST.sst(0.0, 0.9, S) * ST.sst(0.0, 0.9, path.total - S) + 0.65 * g)
    P = np.stack([xz[..., 0], base, xz[..., 1]], -1)
    P[..., 1] = P[..., 1] + 0.22 * lumps(P, seed + 21, 1.6) * g + 0.06 * lumps(P, seed + 22, 6.0) * g
    out = np.broadcast_to(np.array([0.0, 1.0, 0.0]), P.shape)
    prm = dict(seed=seed + 23, plan=wplan)
    K.grid2(node, 'heap', P, prm, out=out, w=w * 0.6, su=float(S1[-1] - S1[0]), sv=float(abs(zl[0] - zl[-1])) * 1.1)
    return lambda x, z: float(np.interp(-z, -zl if zl[0] > zl[-1] else -zl[::-1], zr if zl[0] > zl[-1] else zr[::-1])) + 0.05


def end_cap(K, node, path, profile, s_fn, side, seed, plan, w=0.45, coarse=False, found=FOUND_Z, mode='rampart'):
    """the cut face of a stub: a grid over the cross-section polygon (rows by height, columns across the wall), pushed out and in by the ragged end function s_fn(z, y).
    side +1: the stub lies before the cut (face looks toward +s); side -1: it lies after the cut"""
    ymin = min(p[1] for sec in profile for p in sec[3]); ymax = max(p[1] for sec in profile for p in sec[3])
    py = sorted(set(round(p[1], 4) for sec in profile for p in sec[3]))
    eps = [round(y + d, 4) for y in py for d in (-0.003, 0.003) if ymin - 1e-9 <= y + d <= ymax + 1e-9]       # rows just below and above every corner, so a riser stays vertical
    ys_all = sorted(set(py + eps + ([] if coarse else list(np.arange(math.ceil(ymin / 0.25) * 0.25, ymax, 0.25)) + [ymax]) + ([-0.001, 0.0] if coarse and ymin < 0 else [])))
    ys = [y for y in ys_all if y >= ymin - 1e-6]
    rowsP = []; rows_idx = []
    nc = 3 if coarse else max(3, K.count(10, 3))
    allz = []
    for y in ys:
        wb = width_at(profile, y)
        if wb is None: continue
        zb, zf = wb
        if y < 0 and found is not None: zb = found if y < -0.001 else zb
        rowsP.append((y, zb, zf))
    if len(rowsP) < 3: return
    if K.Q['res'] < 0.6: rowsP = rowsP[::max(1, int(round(0.7 / K.Q['res'])))] + [rowsP[-1]]
    P = np.zeros((len(rowsP), nc, 3)); zz = np.zeros((len(rowsP), nc)); S = np.zeros((len(rowsP), nc))
    for i, (y, zb, zf) in enumerate(rowsP):
        for j in range(nc):
            f = j / (nc - 1.0); z = zb + (zf - zb) * f; zz[i, j] = z; S[i, j] = s_fn(z, y)
    xz = np.zeros((len(rowsP), nc, 2))
    for i in range(len(rowsP)):
        for j in range(nc):
            xz[i, j] = path.at(S[i:i + 1, j:j + 1], np.array([zz[i, j]]))[0, 0]
    P = np.stack([xz[..., 0], np.array([r[0] for r in rowsP])[:, None] * np.ones((1, nc)), xz[..., 1]], -1)
    t = np.array(path.T[min(len(path.L) - 1, int(np.searchsorted(path.S, S.mean(), side='right') - 1))]); out = np.broadcast_to(np.array([t[0], 0.0, t[1]]) * side, P.shape)
    zr = np.ptp(zz); yr = np.ptp(P[..., 1])
    u = (zz - zz.min()) / max(zr, 1e-6); v = 1.0 - (P[..., 1] - P[..., 1].min()) / max(yr, 1e-6)
    P2 = P + out * (0.10 * lumps(P, seed + 31, 3.2) + 0.03 * lumps(P, seed + 32, 11.0))[..., None] * ST.sst(0.0, 0.15, np.minimum(np.arange(nc)[None, :], nc - 1 - np.arange(nc)[None, :]) * 1.0)[..., None]
    K.grid2(node, 'core', P2, dict(seed=seed + 33, plan=plan, mode=mode), out=out, w=w, su=max(zr, 0.2), sv=max(yr, 0.2), u=u, v=v)


def build_wall(K, path, name, seed, profile=RAMPART, wear=None, quoin_s=(), weeps=True, damage_window=None, breach_ramp=None, extra_states=None, thick_stone=1.6, thick_earth=3.8, found=FOUND_Z, depth=DEPTH, mode='rampart', hole=None, foot_zf=0.2,
               sockets=None, plan_label=None, tuft_count=14, wmat=None, state_hook=None):
    """build the three damage states of one rampart run along path. damage_window: (c, hw) the centre (along the path) and half width of the gap in the breached state"""
    plan = [(float(x), float(z)) for x, z in path.V]
    wmat = wmat or {}
    for si, sname in enumerate(STATE_NAMES):
        nd = K.node(sname, 'root', (0, 0, 0), state=sname, hp=hp_hint(thick_stone, thick_earth, path.total)['state_hp'][sname], note={'intact': 'sound masonry, turf and gravel', 'cracked': 'spalled facing, cracks, chips, vegetation, torn turf', 'breached': 'a gap: rubble slope, rubble core and earth backing laid open'}[sname])
        sd = seed + 101 * si
        for sec in profile:
            if len(sec) > 4 and sec[4].get('hidden'): continue
            base = {'tone': 'wall', 'dmg': 0, 'dseed': seed + 101, 'plan': plan}
            if sec[0] == 'scarp':
                base.update(quoin=tuple(quoin_s), weeps=(-1.15, 1.25) if weeps else None, dmg=1.0 if si == 1 else 0.0)
            elif sec[0] == 'cordon': base.update(tone='quoin')
            elif sec[0] == 'riser': base.update(tone='dark')
            elif sec[0] in ('outer', 'top', 'slope'): base.update(torn=0.8 if si == 1 else 0.0, lush=0.85 if si == 0 else 0.55, worn=0.35 if sec[0] == 'slope' else 0.0)
            own = (si == 0) or (si == 1 and sec[0] == 'scarp') or (('main', sec[0]) not in K.charts)
            reg = ('main', sec[0]) if si == 0 else (('crk', sec[0]) if own else None); shr = None if own else K.charts[('main', sec[0])]
            if si < 2:
                sweep_section(K, sname, path, sec, si, sd, None, None, wmat, base, wall_disp, shr, reg, hole)
            else:
                c, hw = damage_window; rng = K.rnd('breach', name)
                def mk(side):
                    def cut(z, y, side=side):
                        j = 0.42 * (ST.noise3(np.array([[z * 1.3, y * 1.1, side * 3.0]], np.float32), 1.0, seed + 71)[0] - 0.5) * 2 + 0.22 * math.sin(y * 7.0 + side)
                        if sec[0] == 'scarp': j = j + 0.55 * (ST.hz(np.array([math.floor(y / 0.25)]), side + 3, seed)[0] - 0.5)
                        return (c - hw + j) if side > 0 else (c + hw - j)
                    return cut
                cutA = mk(+1); cutB = mk(-1)
                sweep_section(K, sname, path, sec, 2, sd, (0.0, c - hw), ('end', cutA), wmat, base, wall_disp, shr)
                sweep_section(K, sname, path, sec, 2, sd + 5, (c + hw, path.total), ('start', cutB), wmat, base, wall_disp, shr)
        if si == 2:
            c, hw = damage_window; rng = K.rnd('breach', name)
            fa = lambda z, y: (c - hw + 0.42 * (ST.noise3(np.array([[z * 1.3, y * 1.1, 3.0]], np.float32), 1.0, seed + 71)[0] - 0.5) * 2 + 0.22 * math.sin(y * 7.0 + 1) + (0.55 * (ST.hz(np.array([math.floor(y / 0.25)]), 4, seed)[0] - 0.5) if z > -0.6 else 0.0))
            fb = lambda z, y: (c + hw - 0.42 * (ST.noise3(np.array([[z * 1.3, y * 1.1, -3.0]], np.float32), 1.0, seed + 71)[0] - 0.5) * 2 - 0.22 * math.sin(y * 7.0 - 1) - (0.55 * (ST.hz(np.array([math.floor(y / 0.25)]), 2, seed)[0] - 0.5) if z > -0.6 else 0.0))
            end_cap(K, 'breached', path, profile, fa, +1, seed + 3, plan, w=0.32, found=found, mode=mode); end_cap(K, 'breached', path, profile, fb, -1, seed + 4, plan, w=0.32, found=found, mode=mode)
            yfn = breach_heap(K, 'breached', path, c, hw, seed, plan, breach_ramp or RAMP_DEFAULT)
            cp = path.at(np.array([[c]]), np.array([0.0]))[0, 0]; tdir = path.T[min(len(path.L) - 1, int(np.searchsorted(path.S, c, side='right') - 1))]; ang = math.degrees(math.atan2(tdir[1], tdir[0]))
            rubble_stones(K, 'breached', rng, float(cp[0]) - 0.0, float(cp[1]) - 0.2, hw * 0.9, 2.6, K.count(26, 6), lambda x, z: yfn(x, z), yaw=-ang)
        elif si == 1:
            rng = K.rnd('cracked', name)
            pts = []
            secs = [sc for sc in profile if sc[0] in ('top', 'outer', 'terr', 'slope', 'walk') and not (len(sc) > 4 and sc[4].get('hidden'))]
            for i in range(K.count(tuft_count, 3) if secs else 0):
                sc = secs[int(rng.integers(0, len(secs)))]; (z0, y0), (z1, y1) = sc[3][0], sc[3][-1]; t = float(rng.uniform(0.1, 0.9)); z = z0 + (z1 - z0) * t; y = y0 + (y1 - y0) * t
                s = float(rng.uniform(0.5, path.total - 0.5)); p = path.at(np.array([[s]]), np.array([z]))[0, 0]; pts.append((float(p[0]), y, float(p[1])))
            if ('main', 'top') in K.charts: tufts(K, 'cracked', pts, rng, 0.24, seed + 9)
            # a few fallen facing stones at the foot
            for i in range(K.count(5, 1)):
                s = float(rng.uniform(0.5, path.total - 0.5)); p = path.at(np.array([[s]]), np.array([0.7 + 0.5 * i / 5]))[0, 0]
                sz = float(rng.uniform(0.16, 0.30)); R = eul(float(rng.uniform(-20, 20)), float(rng.uniform(0, 360)), float(rng.uniform(-20, 20)))
                K.blob('cracked', 'frag', (float(p[0]), DITCH_Y + sz * 0.3, float(p[1])), (sz * 1.3, sz * 0.55, sz * 0.8), R, {'tone': 'grey', 'seed': 7}, max(5, K.count(8, 5)), max(2, K.count(3, 2)), (5.5, 4.6), 0.07, None, 3.0, 40 + i, 0.3); share_blob(K, 'cracked')
        if state_hook: state_hook(K, sname, si, path)
    for nm, sv_, sd_ in (('endcap_a', 0.0, 1), ('endcap_b', path.total, -1)):
        K.node(nm, 'root', (0, 0, 0), role='endcap', note='the cut section at the end of the run; the page hides it when a neighbour is joined here')
        end_cap(K, nm, path, profile, (lambda z, y, v=sv_: v), sd_, seed + 5, plan, w=0.16, coarse=True, found=found, mode=mode)
    if sockets: add_sockets(K, sockets)
    K.foot(band_footprint(path, profile, depth, foot_zf))
    K.extra['plan'] = plan


RAMP_DEFAULT = [(3.6, DITCH_Y), (2.2, -1.5), (0.8, -0.6), (-0.4, 0.5), (-1.4, 1.3), (-2.6, 1.85), (-3.6, 1.65), (-5.0, 1.0), (-6.45, 0.0)]


# ------------------------------------------------------------------------------------------------- registry and the writer
PIECE_DEFS = {}
PIECES = []


def piece(name, title, wear, build, note=''):
    PIECE_DEFS[name] = dict(title=title, wear=wear, build=build, note=note); KM.PIECE_DEFS[name] = PIECE_DEFS[name]
    if name not in PIECES: PIECES.append(name)


WALL_WEAR = dict(tide=0.0, moss=0.55, lichen=0.65, salt=0.5, bleach=0.3, chip=0.6, rust=0.55, barnacle=0.0)


def build(piece_name, lod, res=None):
    r = res if res is not None else RES.get((piece_name, lod), 1.0)
    K = SFKit(piece_name, lod, r); PIECE_DEFS[piece_name]['build'](K)
    if K.footprint: K.node('footprint', 'root', (0, 0, 0), role='footprint', polygon=[[round(x, 3), round(z, 3)] for x, z in K.footprint])
    return K


RES = {
    ('bastion_face', 'far'): 0.03,
    ('bastion_face', 'hero'): 0.801,
    ('bastion_face', 'live'): 0.313,
    ('bastion_flank', 'far'): 0.03,
    ('bastion_flank', 'hero'): 0.899,
    ('bastion_flank', 'live'): 0.351,
    ('bastion_gorge', 'far'): 0.082,
    ('bastion_gorge', 'hero'): 1.222,
    ('bastion_gorge', 'live'): 0.467,
    ('bastion_salient', 'far'): 0.03,
    ('bastion_salient', 'hero'): 0.401,
    ('bastion_salient', 'live'): 0.134,
    ('bastion_shoulder_a66', 'far'): 0.03,
    ('bastion_shoulder_a66', 'hero'): 0.61,
    ('bastion_shoulder_a66', 'live'): 0.251,
    ('bastion_shoulder_a75', 'far'): 0.03,
    ('bastion_shoulder_a75', 'hero'): 0.558,
    ('bastion_shoulder_a75', 'live'): 0.218,
    ('counterscarp', 'far'): 0.1,
    ('counterscarp', 'hero'): 1.394,
    ('counterscarp', 'live'): 0.551,
    ('covered_way', 'far'): 0.03,
    ('covered_way', 'hero'): 1.313,
    ('covered_way', 'live'): 0.501,
    ('curtain', 'far'): 0.03,
    ('curtain', 'hero'): 0.931,
    ('curtain', 'live'): 0.351,
    ('ditch_floor', 'far'): 0.625,
    ('ditch_floor', 'hero'): 2.168,
    ('ditch_floor', 'live'): 1.168,
    ('flagstaff', 'far'): 0.893,
    ('flagstaff', 'hero'): 4.051,
    ('flagstaff', 'live'): 1.465,
    ('flank_junction_a75', 'far'): 0.03,
    ('flank_junction_a75', 'hero'): 0.904,
    ('flank_junction_a75', 'live'): 0.351,
    ('flank_junction', 'far'): 0.03,
    ('flank_junction', 'hero'): 0.904,
    ('flank_junction', 'live'): 0.351,
    ('glacis', 'far'): 0.45,
    ('glacis', 'hero'): 2.118,
    ('glacis', 'live'): 0.951,
    ('guardhouse', 'far'): 0.312,
    ('guardhouse', 'hero'): 3.901,
    ('guardhouse', 'live'): 1.438,
    ('gun_platform', 'far'): 0.03,
    ('gun_platform', 'hero'): 3.101,
    ('gun_platform', 'live'): 0.901,
    ('loose_props', 'far'): 0.03,
    ('loose_props', 'hero'): 2.501,
    ('loose_props', 'live'): 0.031,
    ('powder_store', 'far'): 0.03,
    ('powder_store', 'hero'): 1.894,
    ('powder_store', 'live'): 0.031,
    ('ravelin_salient', 'far'): 0.03,
    ('ravelin_salient', 'hero'): 0.566,
    ('ravelin_salient', 'live'): 0.203,
    ('ravelin_wall', 'far'): 0.03,
    ('ravelin_wall', 'hero'): 1.051,
    ('ravelin_wall', 'live'): 0.373,
    ('sally_gate', 'far'): 0.03,
    ('sally_gate', 'hero'): 0.938,
    ('sally_gate', 'live'): 0.301,
    ('sentry_box', 'far'): 0.03,
    ('sentry_box', 'hero'): 4.939,
    ('sentry_box', 'live'): 1.465,
}   # tuned by tune(): each level lands inside its triangle budget
TARGET = {'hero': 1.004, 'live': 1.04, 'far': 1.08}   # aim a little above the lower end of each budget (the files are small that way)


def tris_of(K): return sum(K.nodes[n].tris() for n in K.order if K.nodes[n].chunks)


def tune(piece_name, lod):
    lo, hi = BUDGET[lod]; want = lo * TARGET[lod]; a, b = 0.03, 6.0
    for _ in range(14):
        m = math.sqrt(a * b); t = tris_of(build(piece_name, lod, m))
        if t < want: a = m
        else: b = m
    m = math.ceil(b * 1000) / 1000.0
    while tris_of(build(piece_name, lod, m)) < lo * 1.004: m = round(m * 1.01, 3)
    return m


def out_name(piece_name, lod): return 'starfort_%s_%s.glb' % (piece_name, lod)


CAPS = {'hero': (68000, 30000, 6000), 'live': (21000, 8500, 4000), 'far': (6800, 0, 0)}   # byte caps for colour, normal and packed maps: the quality is lowered until each fits (the files are small)


def jpeg_capped(arr8, q, cap, **kw):
    import collector_jpeg as J
    while True:
        d = J.jpeg_bytes(arr8, q, **kw)
        if len(d) <= cap or q <= 24: return d
        q -= 3


def encode_maps(maps, dens, ndiv, q, colour_only, caps=None):
    """colour, normal and occlusion/roughness/metal as JPEG; the normal map and the packed map are baked smaller than the colour (divisors ndiv = (normal, orm)); like kit_tex.encode with two divisors and a byte cap per map"""
    caps = caps or (1 << 30,) * 3
    def to8(a): return (np.clip(a, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    jc = jpeg_capped(to8(maps['color']), q[0], caps[0], subsample=True)
    if colour_only: return jc, None, None
    nm = TX.down(TX.normal_map(maps['height'], dens), ndiv[0]); orm = TX.down(np.stack([maps['ao'], maps['rough'], maps['metal']], -1), ndiv[1])
    return jc, jpeg_capped(to8(nm), q[1], caps[1], chroma_scale=0.6), jpeg_capped(to8(orm), q[2], caps[2], chroma_scale=0.6)


def write_glb(path, K):
    """the kit writer pattern (kit_model.write_glb), with the scene extras of this kit: sockets, hit point hints, states, dimensions"""
    spec = PIECE_DEFS[K.piece]; lod = K.lod; Q = K.Q; W = spec['wear']
    chunks = [c for n in K.order for c in K.nodes[n].chunks if n != 'footprint']
    def ao_fn(P, N):
        return (0.70 + 0.30 * TX.sst(-2.0, 0.6, P[:, 1])).astype(np.float32)
    prim = [c for c in chunks if getattr(c, 'share', None) is None]
    maps, dens = TX.bake(prim, Q['atlas'], W, Q['dens'], pad=Q['pad'], ao_fn=ao_fn)
    for c in chunks:
        sh = getattr(c, 'share', None)
        if sh is not None:
            x, y, w_, h_ = sh.rect; S_ = Q['atlas']; pad = Q['pad']; c.UVatlas = np.stack([(x + pad + c.UV[:, 0] * (w_ - 2 * pad)) / S_, (y + pad + c.UV[:, 1] * (h_ - 2 * pad)) / S_], 1)
    jc, jn, jo = encode_maps(maps, dens, Q['ndiv'], Q['q'], Q['far'], CAPS[lod])
    binbuf = bytearray(); views = []; accs = []
    def add_view(data, target=None, stride=None):
        while len(binbuf) % 4: binbuf.append(0)
        v = {'buffer': 0, 'byteOffset': len(binbuf), 'byteLength': len(data)}
        if target: v['target'] = target
        if stride: v['byteStride'] = stride
        views.append(v); binbuf.extend(data); return len(views) - 1
    def add_acc(arr, ctype, ncomp, target, normalized=False, minmax=False, stride=None):
        a = np.ascontiguousarray(arr); vi = add_view(a.tobytes(), target, stride)
        d = {'bufferView': vi, 'componentType': ctype, 'count': int(len(a)), 'type': {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[ncomp]}
        if normalized: d['normalized'] = True
        if minmax: d['min'] = [float(v) for v in np.atleast_1d(a.min(0))]; d['max'] = [float(v) for v in np.atleast_1d(a.max(0))]
        accs.append(d); return len(accs) - 1
    images = []; textures = []; mats = []; mat_index = {}; ids = []
    for kind, data in (('color', jc), ('normal', jn), ('orm', jo)):
        if data is None: continue
        vi = add_view(data); images.append({'bufferView': vi, 'mimeType': 'image/jpeg'}); textures.append({'sampler': 0, 'source': len(images) - 1}); ids.append(len(textures) - 1)
    for nm, ds in (('Fort', False), ('FortTwo', True)):
        if Q['far']:
            m = {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 0.0, 'roughnessFactor': 0.92}, 'doubleSided': ds}
        else:
            m = {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 1.0, 'roughnessFactor': 1.0, 'metallicRoughnessTexture': {'index': ids[2]}},
                 'normalTexture': {'index': ids[1], 'scale': 1.0}, 'occlusionTexture': {'index': ids[2], 'strength': 1.0}, 'doubleSided': ds}
        mat_index[nm] = len(mats); mats.append(m)
    mat_index['Footprint'] = len(mats)
    mats.append({'name': 'Footprint', 'pbrMetallicRoughness': {'baseColorFactor': [0.2, 0.9, 0.3, 0.0], 'metallicFactor': 0.0, 'roughnessFactor': 1.0}, 'alphaMode': 'BLEND', 'doubleSided': True})
    gnodes = []; name_idx = {}; meshes = []
    for name in K.order: name_idx[name] = len(gnodes); gnodes.append({'name': name})
    stats = {'triangles': 0, 'vertices': 0, 'per_node': {}}
    for name in K.order:
        nd = K.nodes[name]; gn = gnodes[name_idx[name]]; par = K.nodes.get(nd.parent) if nd.parent else None
        rel = nd.pivot - (par.pivot if par else np.zeros(3)); gn['translation'] = [float(v) for v in rel]
        rr = nd.extras.get('rest'); gn['rotation'] = list(quat_axis(rr[0], rr[1])) if rr else [0.0, 0.0, 0.0, 1.0]
        ex = {k: (list(v) if isinstance(v, tuple) else v) for k, v in nd.extras.items() if not (k == 'note' and lod != 'hero')}
        if nd.parent: gnodes[name_idx[nd.parent]].setdefault('children', []).append(name_idx[name])
        gn['extras'] = ex
        if name == 'footprint':
            fp = K.footprint; k = len(fp); Pf = np.array([[x, 0.003, z] for x, z in fp] + [[sum(p[0] for p in fp) / k, 0.003, sum(p[1] for p in fp) / k]], np.float32)
            Ff = np.array([[i, (i + 1) % k, k] for i in range(k)], np.uint16)
            if np.sum(np.cross(Pf[Ff[0, 1]] - Pf[Ff[0, 0]], Pf[Ff[0, 2]] - Pf[Ff[0, 0]])[1]) < 0: Ff = Ff[:, [0, 2, 1]]
            at = {'POSITION': add_acc(Pf, 5126, 3, 34962, minmax=True)}
            n8 = np.zeros((len(Pf), 4), np.int8); n8[:, 1] = 127; at['NORMAL'] = add_acc(n8, 5120, 4, 34962, normalized=True, stride=4); accs[at['NORMAL']]['type'] = 'VEC3'
            ia = add_acc(Ff.reshape(-1), 5123, 1, 34963); meshes.append({'name': 'footprint_mesh', 'primitives': [{'attributes': at, 'indices': ia, 'material': mat_index['Footprint'], 'mode': 4}]}); gn['mesh'] = len(meshes) - 1
            stats['vertices'] += len(Pf); stats['triangles'] += len(Ff); stats['per_node'][name] = len(Ff); continue
        if not nd.chunks: continue
        prims = []; tri_n = 0; bymat = {}
        for ch in nd.chunks: bymat.setdefault('FortTwo' if ch.double else 'Fort', []).append(ch)
        for mat, items in bymat.items():
            Pl = []; Nl = []; Ul = []; Fl = []; off = 0
            for ch in items:
                Pl.append(ch.P - nd.pivot); Nl.append(ch.N); Ul.append(ch.UVatlas); Fl.append(ch.F + off); off += len(ch.P)
            P = np.concatenate(Pl); N = KM.unit(np.concatenate(Nl)); UV = np.concatenate(Ul); F = np.concatenate(Fl)
            P, N, UV, F = KM.weld(P, N, UV, F)
            if len(F) == 0: continue
            T = F.astype(np.uint16) if len(P) < 65536 else F.astype(np.uint32)
            at = {'POSITION': add_acc(P.astype(np.float32), 5126, 3, 34962, minmax=True)}
            n8 = np.zeros((len(N), 4), np.int8); n8[:, :3] = np.clip(np.rint(N * 127), -127, 127).astype(np.int8)
            at['NORMAL'] = add_acc(n8, 5120, 4, 34962, normalized=True, stride=4); accs[at['NORMAL']]['type'] = 'VEC3'
            at['TEXCOORD_0'] = add_acc(np.rint(np.clip(UV, 0, 1) * 65535.0).astype(np.uint16), 5123, 2, 34962, normalized=True)
            ia = add_acc(T.reshape(-1), 5123 if T.dtype == np.uint16 else 5125, 1, 34963)
            prims.append({'attributes': at, 'indices': ia, 'material': mat_index[mat], 'mode': 4}); tri_n += len(T); stats['vertices'] += len(P)
        if not prims: continue
        meshes.append({'name': name + '_mesh', 'primitives': prims}); gn['mesh'] = len(meshes) - 1; stats['triangles'] += tri_n; stats['per_node'][name] = tri_n
    anims = []
    swings = [(n, K.nodes[n].extras['swing']) for n in K.order if 'swing' in K.nodes[n].extras]
    if swings:
        samp = []; chans = []
        for n, (axis, deg) in swings:
            times = add_acc(np.array([0.0, 1.5], np.float32), 5126, 1, None, minmax=True); rr = K.nodes[n].extras.get('rest'); q0 = quat_axis(rr[0], rr[1]) if rr else (0.0, 0.0, 0.0, 1.0); q1 = quat_axis(axis, deg)
            out = add_acc(np.array([q0, q1], np.float32), 5126, 4, None); samp.append({'input': times, 'output': out, 'interpolation': 'LINEAR'}); chans.append({'sampler': len(samp) - 1, 'target': {'node': name_idx[n], 'path': 'rotation'}})
        anims.append({'name': 'open', 'samplers': samp, 'channels': chans, 'extras': {'note': 'moves every node that has extras.swing to its open pose in 1.5 s; play backwards to close'}})
    allP = np.concatenate([c.P for c in chunks]) if chunks else np.zeros((1, 3))
    mov = {n: {'how': K.nodes[n].extras['movable'], 'pivot_m': [round(float(v), 3) for v in K.nodes[n].pivot], 'swing': K.nodes[n].extras.get('swing')} for n in K.order if 'movable' in K.nodes[n].extras}
    states = [n for n in K.order if n in STATE_NAMES or K.nodes[n].extras.get('state')]
    scene_ex = {'piece': K.piece, 'title': spec['title'], 'lod': lod, 'triangles': stats['triangles'],
                'frame': 'y up, metres, face line through the origin, +Z outward (STAR_FORT_KIT.md)',
                'bbox_min': [round(float(v), 3) for v in allP.min(0)], 'bbox_max': [round(float(v), 3) for v in allP.max(0)], 'footprint_polygon_xz': [[round(x, 3), round(z, 3)] for x, z in K.footprint],
                'sockets': K.sockets, 'states': states, 'movable': mov, 'hp_hint': K.extra.get('hp_hint'), 'texel_density_per_m': round(float(dens), 1), 'atlas_px': Q['atlas'],
                }
    if lod == 'hero': scene_ex['note'] = spec['note']; scene_ex['wear'] = W
    scene_ex.update({k: v for k, v in K.extra.items() if k not in scene_ex})
    doc = {'asset': {'version': '2.0', 'generator': 'starfort_model.py (living-islands)'}, 'scene': 0, 'scenes': [{'name': K.piece, 'nodes': [name_idx['root']], 'extras': scene_ex}], 'nodes': gnodes, 'meshes': meshes, 'materials': mats,
           'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(binbuf)}], 'images': images, 'textures': textures, 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]}
    if anims: doc['animations'] = anims
    js = json.dumps(doc, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4); bb = bytes(binbuf) + b'\x00' * ((4 - len(binbuf) % 4) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\x00') + bb
    with open(path, 'wb') as f: f.write(data)
    stats['bytes'] = len(data); stats['texel_density_per_m'] = round(float(dens), 1); stats['image_bytes'] = [len(x) for x in (jc, jn, jo) if x is not None]
    return stats


# ------------------------------------------------------------------------------------------------- the wall pieces
# ------------------------------------------------------------------------------------------------- straight rampart runs
def straight_sockets(L): return [('socket_a', -L / 2, 0.0, -90.0, 'wall'), ('socket_b', L / 2, 0.0, 90.0, 'wall')]


def steps_hook_flank(K, sname, si, path):
    """a flight of stone steps up the inner slope (once, on the root)"""
    if si != 0: return
    K.node('stairs', 'root', (0, 0, 0), role='stairs', note='a flight of steps cut into the inner slope from the courtyard to the terreplein; static, shown in every state')
    n = K.count(7, 4)
    for i in range(n):
        zc = -8.55 + (6.6 - 0.7) * 0 + 0.30 * i * (7.0 / n); top = 0.37 * (i + 1) * (7.0 / n)
        K.box('stairs', 'ashlar', (-1.0, top / 2.0 - 0.02, zc), (1.2, top + 0.04, 0.32 * (7.0 / n)), None, {'tone': 'wall', 'seed': 31 + i, 'weeps': None}, uax=0, w=0.35, skip=((1, -1), (2, 1)))


def build_curtain(K):
    p = straight_path(SEG); K.extra['hp_hint'] = hp_hint(1.6, 3.8, SEG)
    build_wall(K, p, 'curtain', 11, sockets=straight_sockets(SEG), damage_window=(2.0, 1.05))


def build_face(K):
    L = 6.0; p = straight_path(L); K.extra['hp_hint'] = hp_hint(1.8, 3.8, L)
    build_wall(K, p, 'face', 17, sockets=straight_sockets(L), damage_window=(3.0, 1.15), thick_stone=1.8)


def build_flank(K):
    L = SEG; p = straight_path(L); K.extra['hp_hint'] = hp_hint(1.6, 3.8, L)
    build_wall(K, p, 'flank', 23, sockets=straight_sockets(L), damage_window=(3.0, 0.9), state_hook=steps_hook_flank)


piece('curtain', 'Curtain wall segment, 4 m', WALL_WEAR, build_curtain, 'scarp with batter, cordon, turf parapet, banquette, terreplein, inner slope; intact, cracked, breached')
piece('bastion_face', 'Bastion face segment, 6 m', WALL_WEAR, build_face, 'a longer, thicker curtain-profile run for the faces of a bastion')
piece('bastion_flank', 'Bastion flank segment, 4 m', WALL_WEAR, build_flank, 'a curtain-profile run with a stair up the inner slope, for the flank of a bastion')


# ------------------------------------------------------------------------------------------------- corners
def corner_sockets(a1, a2, turn):
    d = math.radians(turn); return [('socket_a', -a1, 0.0, -90.0, 'wall'), ('socket_b', a2 * math.cos(d), a2 * math.sin(d), yaw_of(math.cos(d), math.sin(d)), 'wall')]


def build_corner_piece(K, name, a1, a2, turn, seed, hw, profile=RAMPART, depth=DEPTH, **kw):
    p = corner_path(a1, a2, turn); K.extra['hp_hint'] = hp_hint(1.8, 3.8, p.total); K.extra['turn_deg'] = turn; K.extra['arms_m'] = [a1, a2]
    build_wall(K, p, name, seed, profile=profile, quoin_s=(a1,), sockets=corner_sockets(a1, a2, turn), damage_window=(a1, hw), thick_stone=1.8, depth=depth, **kw)


SAL_TURN = 120.0                                   # the bastion tip has an interior angle of 60 degrees
SAL_ARM = 15.2                                     # arm >= depth * tan(turn / 2) so the rear mitre fits
SHOULDER_TURN = {3: 75.0, 4: 75.0, 5: 66.0}        # convex turn at the shoulder (interior angle 105, 105, 114 degrees)
SHOULDER_ARM = {75.0: 6.9, 66.0: 5.7}
SHOULDER = {n: (t, SHOULDER_ARM[t]) for n, t in SHOULDER_TURN.items()}     # n bastions: turn (degrees, convex) and equal arm length (m)
JUNC_TURN = {3: 75.0, 4: 90.0, 5: 90.0}            # the flank leaves the curtain at 90 degrees (75 for the 3-bastion star, a leaning flank)
JUNC_ARM = 2.0


def shoulder_name(n): return 'bastion_shoulder_a%d' % int(round(SHOULDER[n][0]))
def junction_name(n): return 'flank_junction_a75' if n == 3 else 'flank_junction'


def shoulder_builder(turn):
    def f(K): build_corner_piece(K, 'shoulder%d' % int(turn), SHOULDER_ARM[turn], SHOULDER_ARM[turn], -turn, 40 + int(turn), 2.4)
    return f


STRAIGHT_LEN = {'curtain': SEG, 'bastion_face': 6.0, 'bastion_flank': SEG, 'sally_gate': SEG, 'ravelin_wall': SEG, 'counterscarp': SEG, 'covered_way': SEG, 'bastion_gorge': SEG}
RAV_ARM = 9.2
CORNER_DEF = {'bastion_salient': (SAL_ARM, SAL_ARM, -SAL_TURN), 'flank_junction': (JUNC_ARM, JUNC_ARM, 90.0), 'flank_junction_a75': (JUNC_ARM, JUNC_ARM, 75.0), 'ravelin_salient': (RAV_ARM, RAV_ARM, -120.0)}
for _t in (75.0, 66.0): CORNER_DEF['bastion_shoulder_a%d' % int(_t)] = (SHOULDER_ARM[_t], SHOULDER_ARM[_t], -_t)

piece('bastion_salient', 'Bastion salient (tip), 70 degrees', WALL_WEAR, lambda K: build_corner_piece(K, 'salient', SAL_ARM, SAL_ARM, -SAL_TURN, 31, 2.8), 'the angled tip of a bastion: a mitred corner with a 70 degree interior angle and quoins')
for _t in (75.0, 66.0):
    piece('bastion_shoulder_a%d' % int(_t), 'Bastion shoulder, convex turn %d degrees' % int(_t), WALL_WEAR, shoulder_builder(_t), 'the corner between a face and a flank; %d degrees of turn: 105 degree interior for the 3 and 4 bastion stars, 114 for the 5 bastion star' % int(_t) if _t == 75.0 else 'the corner between a face and a flank, 114 degree interior, for the 5 bastion star')
piece('flank_junction', 'Flank and curtain junction, 90 degrees concave', WALL_WEAR, lambda K: build_corner_piece(K, 'junction', JUNC_ARM, JUNC_ARM, 90.0, 51, 1.1), 'the re-entrant corner where the flank meets the curtain')
piece('flank_junction_a75', 'Flank and curtain junction for the 3-bastion star, 75 degrees concave', WALL_WEAR, lambda K: build_corner_piece(K, 'junction75', JUNC_ARM, JUNC_ARM, 75.0, 52, 1.1), 'the leaning flank junction of the three-bastion star')


# ------------------------------------------------------------------------------------------------- the ravelin
def build_ravelin_wall(K):
    L = SEG; p = straight_path(L); K.extra['hp_hint'] = hp_hint(1.4, 2.8, L)
    build_wall(K, p, 'ravelin_wall', 61, profile=RAVELIN, depth=RAVELIN_DEPTH, sockets=straight_sockets(L), damage_window=(2.0, 1.0), thick_stone=1.4, thick_earth=2.8, breach_ramp=[(3.4, DITCH_Y), (2.0, -1.4), (0.8, -0.5), (-0.4, 0.5), (-1.4, 1.2), (-2.6, 1.5), (-3.6, 1.2), (-5.2, 0.0)])


piece('ravelin_wall', 'Ravelin wall segment, 4 m', WALL_WEAR, build_ravelin_wall, 'a lower rampart run for the detached triangle in front of a curtain')
piece('ravelin_salient', 'Ravelin salient, 60 degree tip', WALL_WEAR, lambda K: build_corner_piece(K, 'ravelin_salient', RAV_ARM, RAV_ARM, -120.0, 71, 2.8, profile=RAVELIN, depth=RAVELIN_DEPTH, breach_ramp=[(3.4, DITCH_Y), (2.0, -1.4), (0.8, -0.5), (-0.4, 0.5), (-1.4, 1.2), (-2.6, 1.5), (-3.6, 1.2), (-5.2, 0.0)]), 'the 60 degree tip of the ravelin')


# ------------------------------------------------------------------------------------------------- the ditch wall opposite (counterscarp), covered way and glacis
def build_counterscarp(K):
    L = SEG; p = straight_path(L); K.extra['hp_hint'] = hp_hint(1.2, 0.0, L)
    build_wall(K, p, 'counterscarp', 81, profile=COUNTERSCARP, depth=1.3, found=None, mode='masonry', thick_stone=1.2, thick_earth=0.0, weeps=True, sockets=straight_sockets(L), damage_window=(2.0, 0.9),
               breach_ramp=[(3.6, DITCH_Y), (2.4, -1.6), (1.2, -0.9), (0.2, -0.15), (-0.8, 0.25), (-1.6, 0.2)], tuft_count=6)


def build_covered_way(K):
    L = SEG; p = straight_path(L); K.extra['hp_hint'] = hp_hint(0.0, 2.2, L)
    build_wall(K, p, 'covered_way', 91, profile=COVERED, depth=0.0, foot_zf=4.6, found=None, mode='earth', thick_stone=0.0, thick_earth=2.2, weeps=False, sockets=straight_sockets(L), damage_window=(2.0, 0.9),
               breach_ramp=[(4.8, 0.0), (3.8, 0.55), (2.9, 0.75), (1.9, 0.5), (0.6, 0.2), (0.0, 0.0)], tuft_count=10)


piece('counterscarp', 'Ditch revetment (counterscarp), 4 m', WALL_WEAR, build_counterscarp, 'the masonry wall on the far side of the ditch, 2 m high; the face is toward +Z, so it is placed turned round')
piece('covered_way', 'Covered way and parapet, 4 m', WALL_WEAR, build_covered_way, 'the path behind a low parapet at the top of the counterscarp, with two banquette steps; starts at the coping line and runs out to the crest of the glacis')


# ------------------------------------------------------------------------------------------------- the gorge closure: a retaining wall with a raised floor behind it
GORGE = [
    ('scarp',  'ashlar', 1.00, [(0.05, 0.00), (-0.15, 2.58)], dict(rs=0.25, cs=0.40)),
    ('cordon', 'ashlar', 0.55, [(-0.15, 2.58), (-0.05, 2.62), (0.02, 2.70), (-0.05, 2.78), (-0.20, 2.80)], dict(rs=0.06, cs=0.5)),
    ('terr',   'gravel', 0.45, [(-0.20, 2.80), (-0.40, 2.62), (-3.90, 2.62)], dict(rs=0.5, cs=0.5)),
    ('kerb',   'ashlar', 0.35, [(-3.90, 2.62), (-3.95, 2.78), (-4.30, 2.78)], dict(rs=0.2, cs=0.5)),
    ('hide',   'earth',  0.10, [(-4.30, 2.78), (-4.30, 0.0), (0.05, 0.0)], dict(hidden=True)),
]


def build_gorge(K):
    L = SEG; p = straight_path(L); K.extra['hp_hint'] = hp_hint(1.4, 2.0, L)
    build_wall(K, p, 'gorge', 101, profile=GORGE, depth=4.3, found=None, mode='masonry', thick_stone=1.4, thick_earth=2.0, weeps=False, sockets=straight_sockets(L), damage_window=(2.0, 0.95), tuft_count=6,
               breach_ramp=[(2.6, 0.0), (1.4, 0.4), (0.4, 1.3), (-0.6, 2.2), (-1.6, 2.5), (-3.0, 2.3), (-4.3, 2.0)])


piece('bastion_gorge', 'Bastion gorge closure with terreplein floor, 4 m', WALL_WEAR, build_gorge, 'a retaining wall 2.6 m high facing the courtyard with a raised gravel floor behind it; the face is toward +Z (the courtyard side), so it is placed turned round across the open back of a bastion')


# ------------------------------------------------------------------------------------------------- arch helpers
def arch_ring(K, node, mat, prm, zc, facing, r, wid, y_spring, y_bot, x0=0.0, w=0.5, na=None):
    """a ring of voussoirs with two jambs, flat in the plane z = zc, round opening of radius r centred at (x0, y_spring); facing +1 or -1 along z"""
    na = na or K.count(10, 4); nj = K.count(3, 2)
    I = []; Nn = []
    for y in np.linspace(y_bot, y_spring, nj + 1): I.append((x0 - r, y)); Nn.append((-1.0, 0.0))
    for a in np.linspace(math.pi, 0.0, na + 1)[1:-1]: I.append((x0 + r * math.cos(a), y_spring + r * math.sin(a))); Nn.append((math.cos(a), math.sin(a)))
    for y in np.linspace(y_spring, y_bot, nj + 1): I.append((x0 + r, y)); Nn.append((1.0, 0.0))
    I = np.array(I); Nn = np.array(Nn); O = I + Nn * wid
    P = np.zeros((2, len(I), 3)); P[0, :, 0] = I[:, 0]; P[0, :, 1] = I[:, 1]; P[0, :, 2] = zc; P[1, :, 0] = O[:, 0]; P[1, :, 1] = O[:, 1]; P[1, :, 2] = zc
    ln = float(np.sum(np.hypot(*np.diff(I, axis=0).T)))
    K.grid2(node, mat, P, prm, out=(0, 0, facing), w=w, su=ln, sv=wid)


def half_cyl(K, node, mat, prm, x0, y_s, r, z0, z1, inward=True, w=0.4, nz=2, na=None, ru=None):
    na = na or K.count(10, 4); a = np.linspace(0, math.pi, na + 1); zs = np.linspace(z0, z1, nz + 1)
    P = np.zeros((len(zs), len(a), 3))
    for i, z in enumerate(zs): P[i, :, 0] = x0 + r * np.cos(a); P[i, :, 1] = y_s + r * np.sin(a); P[i, :, 2] = z
    rad = np.stack([np.cos(a), np.sin(a), np.zeros_like(a)], -1); out = -rad if inward else rad
    K.grid2(node, mat, P, prm, out=np.broadcast_to(out[None], P.shape), w=w, su=math.pi * r, sv=abs(z1 - z0))


def plank_box(K, node, c, size, seed, tone='oak', w=0.4, skip=(), uax=0, extra=None):
    prm = {'tone': tone, 'seed': seed}; prm.update(extra or {}); K.box(node, 'wood', c, size, None, prm, uax=uax, w=w, skip=skip)


# ------------------------------------------------------------------------------------------------- the sally gate: a gate in the curtain, with leaves and a drawbridge
GATE_HW = 1.0     # half width of the opening
GATE_SPRING = 1.0
GATE_RING = 0.5


def gate_hole(x, y, z):
    xx = np.abs(x); r = GATE_HW + 0.24
    return (y > -0.02) & (xx < r) & ((y < GATE_SPRING) | (xx * xx + (y - GATE_SPRING) ** 2 < r * r))


def build_gate(K):
    L = SEG; p = straight_path(L); K.extra['hp_hint'] = hp_hint(1.8, 3.8, L)
    K.extra['gate'] = dict(opening_width_m=2.0, arch_top_m=2.0, door_leaves=['door', 'door_2'], bridge_node='bridge', bridge_span_m=6.4, ditch_width_m=6.0, hide_in_breached=['frame', 'tunnel', 'door', 'door_2'])
    build_wall(K, p, 'sally_gate', 111, quoin_s=(-1.45 + 2.0, 1.45 + 2.0), sockets=straight_sockets(L) + [('socket_bridge', 0.0, 0.0, 0.0, 'bridge')], damage_window=(2.0, 1.6), hole=gate_hole, thick_stone=1.8)
    zf = 0.0
    K.node('frame', 'root', (0, 0, 0), role='gate_works', hide_in=['breached'], note='arch ring, jambs and the tunnel of the passage through the rampart')
    arch_ring(K, 'frame', 'ashlar', {'tone': 'quoin', 'seed': 5, 'course': 0.25}, 0.04, 1, GATE_HW, GATE_RING, GATE_SPRING, 0.0)
    K.node('tunnel', 'root', (0, 0, 0), role='gate_works', hide_in=['breached'])
    prm = {'tone': 'dark', 'seed': 7}
    for sx in (-1, 1):
        P = np.array([[(sx * GATE_HW, 0.0, 0.0), (sx * GATE_HW, 0.0, -7.6)], [(sx * GATE_HW, GATE_SPRING, 0.0), (sx * GATE_HW, GATE_SPRING, -7.6)]])
        K.grid2('tunnel', 'rough', P, {'seed': 8 + sx}, out=(-sx, 0, 0), w=0.3)
    half_cyl(K, 'tunnel', 'rough', {'seed': 9}, 0.0, GATE_SPRING, GATE_HW, 0.0, -7.6, True, 0.3, nz=K.count(4, 2))
    K.grid2('tunnel', 'gravel', np.array([[(-GATE_HW, 0.0, 0.0), (GATE_HW, 0.0, 0.0)], [(-GATE_HW, 0.0, -7.6), (GATE_HW, 0.0, -7.6)]]), {'seed': 10}, out=(0, 1, 0), w=0.3)
    # the rear portal: vault shell and arch ring where the passage comes out of the inner slope
    arch_ring(K, 'tunnel', 'ashlar', {'tone': 'quoin', 'seed': 6}, -7.62, -1, GATE_HW, GATE_RING, GATE_SPRING, 0.0, w=0.3)
    half_cyl(K, 'tunnel', 'ashlar', {'tone': 'wall', 'seed': 11}, 0.0, GATE_SPRING, GATE_HW + GATE_RING, -6.2, -7.62, False, 0.3, nz=2)
    for sx in (-1, 1):
        P = np.array([[(sx * (GATE_HW + GATE_RING), 0.0, -6.2), (sx * (GATE_HW + GATE_RING), 0.0, -7.62)], [(sx * (GATE_HW + GATE_RING), GATE_SPRING, -6.2), (sx * (GATE_HW + GATE_RING), GATE_SPRING, -7.62)]])
        K.grid2('tunnel', 'ashlar', P, {'tone': 'wall', 'seed': 12 + sx}, out=(sx, 0, 0), w=0.25)
    # the leaves, hinged on the jambs, opening inward
    for nm, sx, sw in (('door', -1, ('y', 92)), ('door_2', 1, ('y', -92))):
        K.node(nm, 'root', (sx * (GATE_HW - 0.03), 0.0, -0.55), movable='swing', swing=sw, hide_in=['breached'], hp_hint={'material': 'timber', 'hp_per_m': 24, 'thickness_m': 0.12, 'max_hp': round(24 * 0.12, 1)}, note='plank leaf, swings inward on strap hinges')
        wd = GATE_HW - 0.03; n = 1 if K.Q['far'] else 5
        for i in range(n):
            xc = sx * (wd - (i + 0.5) * wd / n) if n > 1 else sx * wd / 2
            plank_box(K, nm, (xc, 1.05, -0.55), (wd / n * 0.985 if n > 1 else wd, 2.1, 0.11), 20 + i + (3 if sx > 0 else 0), 'dark' if i % 2 else 'oak', 0.35, skip=((2, -1), (1, -1)), uax=1)
        if not K.Q['far']:
            for y in (0.45, 1.65):
                K.box(nm, 'iron', (sx * wd / 2, y, -0.47), (wd, 0.08, 0.03), None, {'seed': 40, 'rust': 0.85}, uax=0, w=0.25)
    # the bridge: a deck that lies across the ditch to the covered way, and lifts on its hinge at the sill
    K.node('bridge', 'root', (0.0, -0.1, 0.25), movable='swing', swing=('x', -86), note='drawbridge deck hinged at the sill (y = 0): lowered it spans a 6 m ditch to the covered way; swing to raise')
    nb = K.count(12, 3); Lb = 6.5; zs = np.linspace(0.3, 0.3 + Lb, nb + 1)
    for i in range(nb):
        zc = 0.5 * (zs[i] + zs[i + 1])
        plank_box(K, 'bridge', (0.0, -0.1, zc), (2.0, 0.12, (zs[i + 1] - zs[i]) * 0.94), 60 + i, 'oak' if i % 3 else 'dark', 0.4, skip=((1, -1),), uax=0)
    for sx in (-1, 1):
        plank_box(K, 'bridge', (sx * 0.94, -0.2, 0.3 + Lb / 2), (0.14, 0.26, Lb), 80 + sx, 'dark', 0.3, uax=2)
        if not K.Q['far']:
            K.tube('bridge', 'iron', [(sx * 1.0, 0.0, 0.3 + Lb), (sx * 1.0, 0.8, 0.3 + Lb * 0.65), (sx * 1.0, 1.6, 0.3 + Lb * 0.3), (sx * 1.0, 2.35, 0.05)], 0.022, m=5, prm={'seed': 90, 'rust': 0.75}, w=0.2)
    K.nodes['bridge'].extras['hp_hint'] = {'material': 'timber', 'hp_per_m': 24, 'thickness_m': 0.12, 'max_hp': round(24 * 0.12, 1)}


piece('sally_gate', 'Sally gate with drawbridge', WALL_WEAR, build_gate, 'a 4 m curtain run with a 2 m arched passage, two plank leaves (door, door_2) and a hinged drawbridge deck (bridge)')


# ------------------------------------------------------------------------------------------------- ditch floor and glacis
def build_ditch_floor(K):
    L = SEG; Wd = 6.0; K.extra['hp_hint'] = None
    K.extra['stretch'] = 'the module may be stretched along +Z (scale z 0.8 to 1.4) to fit the ditch width'
    nx = K.count(8, 2); nz = K.count(12, 2)
    for si, sname in enumerate(('intact', 'silted')):
        K.node(sname, 'root', (0, 0, 0), state=sname, note='ditch floor: gravel, silt and a drainage channel' if si == 0 else 'silted: mounded silt, fallen stone and reeds')
        xs = np.linspace(-L / 2, L / 2, nx + 1); zs = np.linspace(0.2, Wd, nz + 1); P = np.zeros((nz + 1, nx + 1, 3))
        for i, z in enumerate(zs):
            for j, x in enumerate(xs):
                ch = -0.14 * math.exp(-((z - 3.1) / 0.35) ** 2)
                m = (0.22 * ST.fbm3(np.array([[x * 0.8, 0.0, z * 0.8]], np.float32), 1.0, 3, 5 + si)[0] + 0.0) * (1 + 2.0 * si)
                P[i, j] = (x, DITCH_Y + ch + m * (0.3 if si == 0 else 1.0), z)
        K.grid2(sname, 'earth', P, {'seed': 3 + si}, out=(0, 1, 0), w=0.8, su=L, sv=Wd)
        if si == 1:
            rng = K.rnd('silt')
            for i in range(K.count(14, 3)): rubble_stones(K, sname, rng, float(rng.uniform(-1.6, 1.6)), float(rng.uniform(0.8, 5.5)), 0.01, 0.01, 1, lambda x, z: DITCH_Y + 0.05, size=(0.15, 0.4))
    K.foot([(-L / 2, 0.2), (L / 2, 0.2), (L / 2, Wd), (-L / 2, Wd)])
    add_sockets(K, [('socket_a', -L / 2, 0.0, -90.0, 'ditch'), ('socket_b', L / 2, 0.0, 90.0, 'ditch')])


GLACIS_L = 12.5
GLACIS_Y0 = 0.95


def glacis_y(z):
    t = np.clip(z / GLACIS_L, 0, 1); return GLACIS_Y0 * (1 - t) ** 1.25


def build_glacis(K):
    L = SEG; K.extra['hp_hint'] = hp_hint(0.0, 1.0, L); K.extra['slope'] = 'about 1 in 13 on average (1 in 10 to 1 in 20 in the research note)'
    nx = K.count(10, 2); nz = K.count(30, 3)
    for si, sname in enumerate(STATE_NAMES):
        K.node(sname, 'root', (0, 0, 0), state=sname, hp=hp_hint(0.0, 1.0, L)['state_hp'][sname], note=['turf over earth', 'rain gullies and bare earth', 'a shell crater with a raised rim'][si])
        xs = np.linspace(-L / 2, L / 2, nx + 1); zs = np.linspace(0.0, GLACIS_L, nz + 1); P = np.zeros((nz + 1, nx + 1, 3))
        for i, z in enumerate(zs):
            for j, x in enumerate(xs):
                y = float(glacis_y(z)) + 0.06 * (ST.fbm3(np.array([[x * 0.9, 0.0, z * 0.9]], np.float32), 1.0, 3, 9)[0] - 0.5) * 2
                if si == 1:
                    y -= 0.18 * math.exp(-((x - 0.7) / 0.28) ** 2) * ST.sst(0.5, 3.0, z) + 0.14 * math.exp(-((x + 1.1) / 0.24) ** 2) * ST.sst(1.5, 5.0, z)
                if si == 2:
                    r = math.hypot(x - 0.3, z - 6.0); y += -0.85 * math.exp(-(r / 1.5) ** 2) + 0.28 * math.exp(-((r - 2.1) / 0.55) ** 2)
                P[i, j] = (x, y, z)
        mat = 'heap' if si == 2 else 'grass'
        K.grid2(sname, mat, P, {'seed': 13 + si, 'torn': 0.9 if si == 1 else 0.0, 'lush': 0.7, 'worn': 0.1, 'plan': [(-2.0, 0.0), (2.0, 0.0)]}, out=(0, 1, 0), w=0.9, su=L, sv=GLACIS_L)
    K.foot([(-L / 2, 0.0), (L / 2, 0.0), (L / 2, GLACIS_L), (-L / 2, GLACIS_L)])
    add_sockets(K, [('socket_a', -L / 2, 0.0, -90.0, 'glacis'), ('socket_b', L / 2, 0.0, 90.0, 'glacis')])


piece('ditch_floor', 'Ditch floor module, 4 m by 6 m', WALL_WEAR, build_ditch_floor, 'the floor of the ditch at y = -2 with a drainage channel; intact and silted')
piece('glacis', 'Glacis earth slope module, 4 m by 12.5 m', WALL_WEAR, build_glacis, 'a long turf slope from the crest of the covered way down to the ground; intact, gullied, cratered')


# ------------------------------------------------------------------------------------------------- loose small builders
PROP_WEAR = dict(tide=0.0, moss=0.35, lichen=0.4, salt=0.3, bleach=0.55, chip=0.6, rust=0.7, barnacle=0.0)


def dense_path(pts, n):
    pts = np.array(pts, float); seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)]); t = np.linspace(0, cum[-1], max(n, len(pts)))
    return np.stack([np.interp(t, cum, pts[:, k]) for k in range(3)], 1)


def dense_radii(radii, pts, n):
    pts = np.array(pts, float); seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)]); t = np.linspace(0, cum[-1], max(n, len(pts))); return np.interp(t, cum, radii)


def sphere(K, node, mat, c, r, prm=None, w=0.5):
    nu = max(5, K.count(8, 5)); nv = max(3, K.count(5, 3))
    if K.Q['far']: nu, nv = 5, 3
    K.blob(node, mat, c, (r, r, r), None, prm or {}, nu, nv, (2.0, 2.0), 0.0, None, 3.0, 1, w)


def barrel(K, node, c, seed=1, scale=1.0):
    prof = [(0.001, 0.0), (0.19, 0.0), (0.245, 0.12), (0.275, 0.3), (0.245, 0.48), (0.19, 0.6), (0.001, 0.6)]
    prof = [(r * scale, h * scale) for r, h in prof]; seg = max(8, K.count(14, 8))
    if K.Q['far']: seg = 7
    K.lathe(node, 'wood', c, prof, seg, {'tone': 'oak', 'seed': seed}, None, 0.5)
    if not K.Q['far']:
        for h, r in ((0.1, 0.235), (0.5, 0.235), (0.3, 0.282)):
            K.tube(node, 'iron', [(c[0] + r * scale * math.cos(a), c[1] + h * scale, c[2] + r * scale * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 13)], 0.012 * scale, m=4, prm={'seed': seed + 3, 'rust': 0.6}, caps=(False, False), w=0.2)


def gabion(K, node, c, seed=1):
    seg = max(8, K.count(12, 6)); prof = [(0.001, 0.0), (0.32, 0.0), (0.34, 0.35), (0.33, 0.72), (0.001, 0.72)]
    if K.Q['far']: seg = 6
    K.lathe(node, 'wood', c, prof, seg, {'tone': 'oak', 'seed': seed, 'bleach': 0.1, 'stripe': (0.1, 0.25, (0.32, 0.24, 0.13))}, None, 0.5)
    K.disc(node, 'earth', (c[0], c[1] + 0.72, c[2]), 0.32, (0, 1, 0), {'seed': seed + 4}, k=max(6, K.count(10, 6)), w=0.2)


# ------------------------------------------------------------------------------------------------- the cannon platform
def build_gun_platform(K):
    K.extra['hp_hint'] = {'source': 'fortify/ballistics_toy.py MATERIALS', 'confidence': 'Low (game tuning)', 'deck': {'material': 'timber', 'hp_per_m': 24, 'thickness_m': 0.2, 'max_hp': 4.8},
                          'cannon': 'plain prop; the firing numbers live in the toy model', 'state_hp': {'intact': 4.8, 'cracked': 2.4, 'breached': 0.0}}
    K.extra['cannon'] = dict(barrel_node='barrel', carriage_node='carriage', trunnion_height_m=0.82, muzzle_direction='+Z', elevation_axis='x (rotate the barrel node about X to raise the muzzle)', recoil='slide the carriage node along -Z', disabled_pose='rotate barrel about X by -28 degrees and lower the carriage by 0.12 m')
    nplank = K.count(12, 4)
    for si, sname in enumerate(STATE_NAMES):
        K.node(sname, 'root', (0, 0, 0), state=sname, note=['sound timber deck on stone sleepers', 'worn, gapped planks and a split sleeper', 'a hole through the deck, splintered ends'][si])
        for i, x in enumerate((-1.25, -0.42, 0.42, 1.25)):
            if si == 2 and i in (1, 2): plank_box(K, sname, (x, 0.08, -0.7), (0.18, 0.16, 1.5), 5 + i, 'dark', 0.3, uax=2); continue
            plank_box(K, sname, (x, 0.08, 0.0), (0.18, 0.16, 3.0), 5 + i, 'dark', 0.3, uax=2, skip=((1, -1),))
        pw = 3.0 / nplank
        for i in range(nplank):
            zc = -1.5 + (i + 0.5) * pw; hole = si == 2 and abs(zc - 0.3) < 0.8 * (3.0 / 3.0) and True
            if hole and i % 2 == 0: continue
            tilt = 0.0; dy = 0.0
            if si >= 1 and i % 5 == 3: dy = 0.012 + 0.02 * si
            plank_box(K, sname, (0.0, 0.185 + dy, zc), (3.0 if not (hole) else 1.4, 0.05, pw * (0.94 if si == 0 else 0.86)), 20 + i + 50 * si, 'oak' if i % 3 else 'pale', 0.45, skip=((1, -1),), uax=0, extra={'bleach': 0.8})
        if si >= 1 and not K.Q['far']:
            rng = K.rnd('splinters', si)
            for i in range(K.count(5, 1)): plank_box(K, sname, (float(rng.uniform(-0.8, 0.8)), 0.23, float(rng.uniform(-0.9, 1.2))), (0.07, 0.03, float(rng.uniform(0.3, 0.6))), 80 + i, 'pale', 0.2, extra={'bleach': 0.9})
    # the cannon on a four-wheeled carriage
    K.node('carriage', 'root', (0.0, 0.3, 0.0), movable='slide', note='the carriage: two cheeks, two axles, four wheels; recoils along -Z')
    for sx in (-1, 1):
        plank_box(K, 'carriage', (sx * 0.31, 0.58, -0.05), (0.13, 0.38, 1.7), 100 + sx, 'dark', 0.3, uax=2)
        plank_box(K, 'carriage', (sx * 0.31, 0.38, -0.05), (0.13, 0.22, 1.3), 103 + sx, 'dark', 0.2, uax=2)
        if not K.Q['far']:
            K.box('carriage', 'iron', (sx * 0.31, 0.74, 0.1), (0.15, 0.04, 0.4), None, {'seed': 110, 'rust': 0.8}, uax=2, w=0.2)
    for zc in (-0.62, 0.55):
        K.tube('carriage', 'wood', [(-0.52, 0.3, zc), (0.52, 0.3, zc)], 0.05, m=6, prm={'tone': 'dark', 'seed': 120}, w=0.25)
        for sx in (-1, 1):
            K.tube('carriage', 'wood', [(sx * 0.5, 0.2, zc), (sx * 0.66, 0.2, zc)], 0.2 if not K.Q['far'] else 0.2, m=max(7, K.count(12, 7)), prm={'tone': 'oak', 'seed': 130 + int(zc * 10), 'bleach': 0.8}, w=0.4)
    plank_box(K, 'carriage', (0.0, 0.42, -0.9), (0.6, 0.12, 0.2), 140, 'dark', 0.2)
    K.node('barrel', 'root', (0.0, 0.82, -0.12), movable='elevate', note='the cannon barrel, a plain tapered iron tube; pivots at the trunnions about X')
    prof = [(0.001, -1.05), (0.07, -1.05), (0.075, -0.97), (0.215, -0.93), (0.24, -0.8), (0.235, -0.6), (0.21, -0.05), (0.19, 0.6), (0.17, 0.95), (0.205, 1.0), (0.2, 1.08), (0.16, 1.12), (0.001, 1.12)]
    K.lathe('barrel', 'iron', (0.0, 0.82, -0.12), prof, max(9, K.count(16, 9)) if not K.Q['far'] else 7, {'seed': 150, 'rust': 0.3}, eul(90, 0, 0), 0.7)
    K.tube('barrel', 'iron', [(-0.36, 0.82, -0.12), (0.36, 0.82, -0.12)], 0.05, m=6, prm={'seed': 151, 'rust': 0.3}, w=0.2)
    K.node('ammo', 'root', (1.0, 0.0, 0.9), movable='take', note='a small pile of cannonballs on the deck')
    rng_ = [(0.0, 0.0), (0.2, 0.0), (-0.2, 0.0), (0.1, 0.17), (-0.1, 0.17), (0.0, 0.34)]
    for (a, b) in (rng_ if not K.Q['far'] else rng_[:3]): sphere(K, 'ammo', 'iron', (1.0 + a, 0.215 + b * 0.8 + 0.08, 0.9 + (0.0 if b > 0 else 0.0)), 0.095, {'seed': 160, 'rust': 0.4}, 0.2)
    K.foot([(-1.5, -1.5), (1.5, -1.5), (1.5, 1.5), (-1.5, 1.5)])
    add_sockets(K, [('socket_terreplein', 0.0, -1.5, 180.0, 'platform'), ('socket_muzzle', 0.0, 1.5, 0.0, 'aim')])


piece('gun_platform', 'Cannon platform with a plain cannon, 3 m square', PROP_WEAR, build_gun_platform, 'a timber deck for the terreplein; a plain iron cannon on a four-wheeled carriage (nodes barrel, carriage, ammo)')


# ------------------------------------------------------------------------------------------------- the powder store
def powder_body(K, sname, si):
    prm_b = {'dir': (1.0, 0.0), 'dmg': 1.0 if si == 1 else 0.0}
    r = 1.95; ys = 1.75; zl = 2.55
    K.box(sname, 'ashlar', (0, 0.18, 0), (4.4, 0.36, 5.4), None, {'tone': 'wall', 'seed': 3, 'dmg': 1.0 if si == 1 else 0.0}, uax=0, w=0.4, skip=((1, -1),))
    for sx in (-1, 1):
        K.quad(sname, 'brick', (sx * 1.98, 0.36, zl), (sx * 1.98, 0.36, -zl), (sx * 1.98, ys, -zl), (sx * 1.98, ys, zl), dict(prm_b, dir=(0.0, 1.0), seed=4 + sx), w=0.8)
    # the barrel vault, brick courses running around it, earth and turf over the crown
    hole = None
    if si == 2: hole = lambda x, y, z: (np.abs(x + 0.35) < 1.1) & (z > -0.4) & (z < 1.6) & (y > 2.6)
    na = K.count(14, 6); a = np.linspace(0, math.pi, na + 1); nz = K.count(6, 3); zs = np.linspace(-zl, zl, nz + 1)
    P = np.zeros((nz + 1, na + 1, 3))
    for i, z in enumerate(zs): P[i, :, 0] = r * np.cos(a); P[i, :, 1] = ys + r * np.sin(a); P[i, :, 2] = z
    keep = None
    if hole is not None:
        cx = 0.25 * (P[:-1, :-1] + P[1:, :-1] + P[:-1, 1:] + P[1:, 1:]); keep = ~hole(cx[..., 0], cx[..., 1], cx[..., 2])
    rad = np.stack([np.cos(a), np.sin(a), np.zeros_like(a)], -1)
    K.grid2(sname, 'brick', P, dict(prm_b, vault=True, seed=6), out=np.broadcast_to(rad[None], P.shape), w=0.9, su=math.pi * r, sv=2 * zl, keep=keep)
    # turf cap over the crown (angles 22 to 158 degrees), lumpy
    a2 = np.linspace(math.radians(24), math.radians(156), K.count(9, 4) + 1); Pt = np.zeros((nz + 1, len(a2), 3))
    for i, z in enumerate(zs):
        taper = 1.0 - 0.0 * z
        for j, aa in enumerate(a2):
            Pt[i, j] = ((r + 0.16) * math.cos(aa), ys + (r + 0.16) * math.sin(aa) + 0.10 * (ST.fbm3(np.array([[math.cos(aa) * 2, z, math.sin(aa) * 2]], np.float32), 1.5, 2, 4)[0] - 0.5), z * 0.98)
    keep2 = None
    if hole is not None:
        cx = 0.25 * (Pt[:-1, :-1] + Pt[1:, :-1] + Pt[:-1, 1:] + Pt[1:, 1:]); keep2 = ~hole(cx[..., 0], cx[..., 1], cx[..., 2])
    radt = np.stack([np.cos(a2), np.sin(a2), np.zeros_like(a2)], -1)
    K.grid2(sname, 'grass', Pt, {'seed': 8, 'torn': 0.9 if si >= 1 else 0.0, 'lush': 0.8, 'plan': [(0.0, 0.0), (1.0, 0.0)]}, out=np.broadcast_to(radt[None], Pt.shape), w=0.5, su=math.pi * r * 0.7, sv=2 * zl, keep=keep2)
    # front and rear: brick gable under the arch
    for zf, fc in ((zl, 1), (-zl, -1)):
        K.quad(sname, 'brick', (-2.0, 0.36, zf), (2.0, 0.36, zf), (2.0, ys, zf), (-2.0, ys, zf), dict(prm_b, seed=9 + fc), w=0.8) if fc > 0 else K.quad(sname, 'brick', (2.0, 0.36, zf), (-2.0, 0.36, zf), (-2.0, ys, zf), (2.0, ys, zf), dict(prm_b, seed=9 + fc), w=0.8)
        nr = max(3, K.count(5, 3)); P = np.zeros((nr + 1, na + 1, 3))
        for i in range(nr + 1):
            for j, aa in enumerate(a): P[i, j] = (r * (i / nr) * math.cos(aa), ys + r * (i / nr) * math.sin(aa), zf)
        K.grid2(sname, 'brick', P, dict(prm_b, seed=11 + fc), out=(0, 0, fc), w=0.8, su=2 * r, sv=r)
    arch_ring(K, sname, 'ashlar', {'tone': 'quoin', 'seed': 12, 'course': 0.25}, zl + 0.03, 1, 0.62, 0.32, 1.45, 0.36, w=0.4)
    if not K.Q['far']:
        for sx in (-1.4, 1.4): K.box(sname, 'iron', (sx, 2.2, zl + 0.04), (0.5, 0.04, 0.03), None, {'seed': 14, 'rust': 0.9}, uax=0, w=0.15)
    if si >= 1 and not K.Q['far']:
        rng = K.rnd('pbricks', si)
        for i in range(K.count(10 if si == 2 else 4, 2)):
            K.box(sname, 'brick', (float(rng.uniform(-1.6, 1.0)), 0.07, float(rng.uniform(2.9, 3.6) if si == 1 else rng.uniform(-1.5, 2.8))), (0.23, 0.11, 0.11), eul(0, float(rng.uniform(0, 360)), 0), {'seed': 15 + i, 'dir': (1.0, 0.0)}, uax=0, w=0.15)


def build_powder_store(K):
    K.extra['hp_hint'] = {'source': 'fortify/ballistics_toy.py MATERIALS', 'confidence': 'Low (game tuning)', 'vault': {'material': 'stone', 'hp_per_m': 52, 'thickness_m': 0.7, 'max_hp': 36.4, 'note': 'brick is treated as stone'}, 'state_hp': {'intact': 36.4, 'cracked': 18.2, 'breached': 0.0}}
    for si, sname in enumerate(STATE_NAMES):
        K.node(sname, 'root', (0, 0, 0), state=sname, note=['brick vault under turf', 'cracked brick, torn turf', 'a hole through the vault, scattered brick'][si]); powder_body(K, sname, si)
    K.node('door', 'root', (-0.62, 0.36, 2.66), movable='swing', swing=('y', -105), hide_in=['breached'], note='iron-strapped plank door; no contents are modelled')
    for i in range(1 if K.Q['far'] else 4):
        n = 1 if K.Q['far'] else 4; xc = -0.62 + (i + 0.5) * 1.24 / n
        plank_box(K, 'door', (xc, 0.95, 2.66), (1.24 / n * 0.985, 1.8, 0.1), 30 + i, 'dark' if i % 2 else 'oak', 0.35, skip=((2, -1), (1, -1)), uax=1)
    if not K.Q['far']:
        for y in (0.45, 1.5): K.box('door', 'iron', (0.0, y, 2.73), (1.2, 0.07, 0.03), None, {'seed': 31, 'rust': 0.85}, uax=0, w=0.25)
    for i, (x, z) in enumerate(((1.7, 3.3), (2.3, 3.0), (1.95, 3.85))):
        if K.Q['far'] and i > 0: continue
        K.node('barrel_%02d' % (i + 1), 'root', (x, 0.0, z), movable='take', note='a small oak barrel (a prop; nothing is stored in it)'); barrel(K, 'barrel_%02d' % (i + 1), (x, 0.0, z), 40 + i)
    K.foot([(-2.3, -2.8), (2.3, -2.8), (2.3, 4.3), (-2.3, 4.3)]); add_sockets(K, [('socket_door', 0.0, 2.6, 0.0, 'door')])


piece('powder_store', 'Vaulted powder store', PROP_WEAR, build_powder_store, 'a low brick barrel vault under turf, a door and three barrels (no contents modelled)')


# ------------------------------------------------------------------------------------------------- the sentry box (guerite)
def sentry_body(K, sname, si):
    seg = max(8, K.count(14, 8))
    if K.Q['far']: seg = 7
    dm = 1.0 if si == 1 else 0.0; prm = {'tone': 'wall', 'dmg': dm, 'seed': 3, 'course': 0.25}
    top = 2.15 if si < 2 else 1.55
    K.lathe(sname, 'ashlar', (0, 0, 0), [(0.62, 0.0), (0.58, 0.12), (0.72, 0.4), (0.8, 0.62)], seg, dict(prm, tone='quoin'), None, 0.6)
    K.lathe(sname, 'ashlar', (0, 0, 0), [(0.62, 0.62), (0.62, top)], seg, prm, None, 0.8)
    if si < 2:
        K.lathe(sname, 'ashlar', (0, 0, 0), [(0.62, top), (0.72, top + 0.08), (0.72, top + 0.2), (0.6, top + 0.24)], seg, dict(prm, tone='quoin'), None, 0.5)
        K.lathe(sname, 'tile', (0, 0, 0), [(0.86, top + 0.2), (0.5, top + 0.7), (0.2, top + 1.15), (0.001, top + 1.4)], seg, {'seed': 5}, None, 0.7)
        sphere(K, sname, 'iron', (0, top + 1.45, 0), 0.07, {'seed': 6, 'rust': 0.7}, 0.15)
    else:
        rng = K.rnd('sb')
        for i in range(K.count(5, 2)):
            a = rng.uniform(0, 2 * math.pi); K.box(sname, 'ashlar', (0.62 * math.cos(a), top + 0.05, 0.62 * math.sin(a)), (0.28, 0.24 + 0.2 * float(rng.random()), 0.2), eul(0, float(np.degrees(-a)), 0), {'tone': 'wall', 'seed': 20 + i}, uax=0, w=0.2)
        K.lathe(sname, 'tile', (1.3, 0.0, 0.7), [(0.001, 0.0), (0.82, 0.06), (0.4, 0.5), (0.001, 0.9)], seg, {'seed': 5}, eul(0, 0, 80), 0.5)
    if not K.Q['far']:
        for a in (math.radians(40), math.radians(140)):
            K.quad(sname, 'iron', (0.625 * math.cos(a) - 0.04 * math.sin(a), 1.3, 0.625 * math.sin(a) + 0.04 * math.cos(a)), (0.625 * math.cos(a) + 0.04 * math.sin(a), 1.3, 0.625 * math.sin(a) - 0.04 * math.cos(a)),
                   (0.625 * math.cos(a) + 0.04 * math.sin(a), 1.62, 0.625 * math.sin(a) - 0.04 * math.cos(a)), (0.625 * math.cos(a) - 0.04 * math.sin(a), 1.62, 0.625 * math.sin(a) + 0.04 * math.cos(a)), {'seed': 7, 'rust': 0.3}, w=0.1)
        K.quad(sname, 'iron', (-0.2, 0.65, -0.63), (0.2, 0.65, -0.63), (0.2, 1.6, -0.63), (-0.2, 1.6, -0.63), {'seed': 8, 'rust': 0.1}, w=0.1)


def build_sentry_box(K):
    K.extra['hp_hint'] = {'source': 'fortify/ballistics_toy.py MATERIALS', 'confidence': 'Low (game tuning)', 'body': {'material': 'stone', 'hp_per_m': 52, 'thickness_m': 0.35, 'max_hp': 18.2}, 'state_hp': {'intact': 18.2, 'cracked': 9.1, 'breached': 0.0}}
    for si, sname in enumerate(STATE_NAMES):
        K.node(sname, 'root', (0, 0, 0), state=sname, note=['a slim stone turret with a tiled cone', 'spalled stone, cracks', 'the top torn off, the roof on the ground'][si]); sentry_body(K, sname, si)
    K.foot([(-0.85, -0.85), (0.85, -0.85), (0.85, 0.85), (-0.85, 0.85)]); add_sockets(K, [('socket_mount', 0.0, 0.0, 0.0, 'mount')])


piece('sentry_box', 'Sentry box (guerite) for a bastion corner', PROP_WEAR, build_sentry_box, 'a round corbelled stone turret with two loops, a doorway and a tiled cone roof')


# ------------------------------------------------------------------------------------------------- the guardhouse
def guard_body(K, sname, si):
    W, D, Hh = 6.0, 4.0, 2.9; zf = D / 2; xs = W / 2
    pl = {'flat': True, 'wash': (0.78, 0.74, 0.64), 'course': 0.26, 'band': (0.0, 0.5, (0.22, 0.2, 0.15))}
    K.box(sname, 'ashlar', (0, 0.18, 0), (W + 0.3, 0.36, D + 0.3), None, {'tone': 'wall', 'seed': 3}, uax=0, w=0.4, skip=((1, -1),))
    for (a, b, c, d, dr, sd) in (((-xs, 0.36, zf), (xs, 0.36, zf), (xs, Hh, zf), (-xs, Hh, zf), (1.0, 0.0), 4), ((xs, 0.36, -zf), (-xs, 0.36, -zf), (-xs, Hh, -zf), (xs, Hh, -zf), (1.0, 0.0), 5),
                                 ((xs, 0.36, zf), (xs, 0.36, -zf), (xs, Hh, -zf), (xs, Hh, zf), (0.0, 1.0), 6), ((-xs, 0.36, -zf), (-xs, 0.36, zf), (-xs, Hh, zf), (-xs, Hh, -zf), (0.0, 1.0), 7)):
        K.quad(sname, 'plaster', a, b, c, d, dict(pl, dir=dr, seed=sd), w=0.8)
    # corner quoins as pale blocks
    if not K.Q['far']:
        for sx in (-1, 1):
            for sz in (-1, 1): K.box(sname, 'ashlar', (sx * (xs + 0.02), Hh / 2 + 0.18, sz * (zf + 0.02)), (0.34, Hh - 0.36, 0.34), None, {'tone': 'quoin', 'seed': 8 + sx + 2 * sz}, uax=1, w=0.4)
    # roof: two tiled planes, gable ends in plaster
    ov = 0.45; rise = 1.55; y0 = Hh
    hole = None
    if si == 2: hole = lambda x, y, z: (np.abs(x - 0.9) < 1.0) & (z > 0.2)
    for sg in (1, -1):
        nu = K.count(8, 2); nv = K.count(5, 2); P = np.zeros((nv + 1, nu + 1, 3))
        for i in range(nv + 1):
            t = i / nv
            for j in range(nu + 1): P[i, j] = (-xs - ov + (W + 2 * ov) * j / nu, y0 + rise * (1 - t) - 0.12 * t, sg * (0.06 + (zf + ov - 0.06) * t))
        keep = None
        if hole is not None and sg > 0:
            cx = 0.25 * (P[:-1, :-1] + P[1:, :-1] + P[:-1, 1:] + P[1:, 1:]); keep = ~hole(cx[..., 0], cx[..., 1], cx[..., 2])
        K.grid2(sname, 'tile', P, {'seed': 9 + sg}, out=(0, 1, sg * 0.7), w=0.9, su=W + 2 * ov, sv=math.hypot(zf + ov, rise), keep=keep, double=False)
    for sx in (-1, 1):
        K.quad(sname, 'plaster', (sx * xs, y0, -zf), (sx * xs, y0, zf), (sx * xs, y0 + 0.0, zf), (sx * xs, y0, -zf), dict(pl, dir=(0, 1), seed=12), w=0.1) if False else None
        tri = np.array([[(sx * xs, y0, -zf), (sx * xs, y0, zf)], [(sx * xs, y0 + rise, 0.0), (sx * xs, y0 + rise, 0.0)]])
        K.grid2(sname, 'plaster', tri, dict(pl, dir=(0.0, 1.0), seed=13), out=(sx, 0, 0), w=0.5, su=D, sv=rise)
    K.box(sname, 'wood', (0, y0 + rise + 0.03, 0), (W + 2 * ov, 0.1, 0.18), None, {'tone': 'dark', 'seed': 14}, uax=0, w=0.2)
    # chimney
    K.box(sname, 'brick', (xs - 0.8, y0 + 1.1, -0.9), (0.55, 2.0, 0.55), None, {'dir': (1.0, 0.0), 'seed': 15, 'dmg': 1.0 if si == 1 else 0.0}, uax=0, w=0.5)
    # door and windows (frames; the leaf is a movable node)
    K.box(sname, 'wood', (-1.2, 1.2, zf + 0.03), (1.34, 2.05, 0.08), None, {'tone': 'dark', 'seed': 16}, uax=1, w=0.3, skip=((2, 1),)) if False else None
    for wx in (1.0, 2.15):
        K.box(sname, 'wood', (wx, 1.65, zf + 0.04), (0.78, 0.92, 0.06), None, {'tone': 'dark', 'seed': 17}, uax=0, w=0.25, skip=((1, -1),))
        K.box(sname, 'glass', (wx, 1.65, zf + 0.05), (0.6, 0.74, 0.03), None, {'seed': 18}, uax=0, w=0.15, skip=((1, -1),))
    if si >= 1 and not K.Q['far']:
        rng = K.rnd('gtiles', si)
        for i in range(K.count(6, 2)): K.box(sname, 'tile', (float(rng.uniform(-2.6, 2.6)), 0.06, float(rng.uniform(zf + 0.4, zf + 1.4))), (0.28, 0.05, 0.2), eul(float(rng.uniform(-8, 8)), float(rng.uniform(0, 360)), 0), {'seed': 20 + i}, uax=0, w=0.15)


def build_guardhouse(K):
    K.extra['hp_hint'] = {'source': 'fortify/ballistics_toy.py MATERIALS', 'confidence': 'Low (game tuning)', 'walls': {'material': 'stone', 'hp_per_m': 52, 'thickness_m': 0.5, 'max_hp': 26.0}, 'state_hp': {'intact': 26.0, 'cracked': 13.0, 'breached': 0.0}}
    for si, sname in enumerate(STATE_NAMES):
        K.node(sname, 'root', (0, 0, 0), state=sname, note=['whitewashed walls under a tiled roof', 'flaking plaster, cracks, moss on the tiles', 'a hole in the roof, tiles on the ground'][si]); guard_body(K, sname, si)
    K.node('door', 'root', (-1.8, 0.36, 2.04), movable='swing', swing=('y', -100), hide_in=['breached'], note='plank door on strap hinges')
    n = 1 if K.Q['far'] else 4
    for i in range(n): plank_box(K, 'door', (-1.8 + (i + 0.5) * 1.2 / n, 1.3, 2.04), (1.2 / n * 0.985, 1.9, 0.07), 40 + i, 'dark' if i % 2 else 'oak', 0.4, skip=((2, -1), (1, -1)), uax=1)
    if not K.Q['far']:
        for y in (0.5, 1.8): K.box('door', 'iron', (-1.2, y, 2.09), (1.2, 0.07, 0.03), None, {'seed': 41, 'rust': 0.8}, uax=0, w=0.2)
    K.foot([(-3.3, -2.3), (3.3, -2.3), (3.3, 3.0), (-3.3, 3.0)]); add_sockets(K, [('socket_door', -1.2, 2.0, 0.0, 'door')])


piece('guardhouse', 'Guardhouse block', PROP_WEAR, build_guardhouse, 'a whitewashed barracks block 6 m by 4 m under a tiled roof, door, two windows and a chimney')


# ------------------------------------------------------------------------------------------------- flagstaff
def build_flagstaff(K):
    K.extra['hp_hint'] = {'source': 'fortify/ballistics_toy.py MATERIALS', 'confidence': 'Low (game tuning)', 'mast': {'material': 'timber', 'hp_per_m': 24, 'thickness_m': 0.2, 'max_hp': 4.8}, 'state_hp': {'intact': 4.8, 'cracked': 4.8, 'breached': 0.0}}
    seg = max(8, K.count(14, 8)); mseg = max(6, K.count(10, 6))
    for si, sname in enumerate(('intact', 'breached')):
        K.node(sname, 'root', (0, 0, 0), state=sname, note=['a tall mast on a stone base', 'the mast snapped, the upper part lying on the ground'][si])
        K.lathe(sname, 'ashlar', (0, 0, 0), [(0.78, 0.0), (0.74, 0.22), (0.62, 0.26), (0.58, 0.55), (0.001, 0.55)], seg, {'tone': 'wall', 'seed': 3, 'course': 0.25}, None, 0.5)
        if si == 0:
            mp = [(0, 0.5, 0), (0, 3.5, 0), (0, 7.2, 0)]; nm = K.count(14, 3)
            K.tube(sname, 'wood', dense_path(mp, nm), dense_radii([0.13, 0.09, 0.05], mp, nm), m=mseg, prm={'tone': 'pale', 'seed': 4}, w=0.5)
            sphere(K, sname, 'iron', (0, 7.3, 0), 0.07, {'seed': 5, 'rust': 0.6}, 0.15)
            if not K.Q['far']:
                for y in (0.9, 2.5): K.tube(sname, 'iron', [(0.13 * math.cos(a), y, 0.13 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 11)], 0.018, m=4, prm={'seed': 6, 'rust': 0.5}, caps=(False, False), w=0.15)
        else:
            K.tube(sname, 'wood', [(0, 0.5, 0), (0.05, 1.5, 0.0), (0.1, 2.6, 0.02)], [0.13, 0.11, 0.1], m=mseg, prm={'tone': 'pale', 'seed': 4}, w=0.4)
            K.tube(sname, 'wood', [(0.1, 2.5, 0.02), (1.2, 0.25, 1.0), (4.6, 0.12, 2.4)], [0.1, 0.07, 0.05], m=mseg, prm={'tone': 'pale', 'seed': 7}, w=0.4)
    K.node('flag', 'root', (0.07, 6.55, 0.0), movable='swing', swing=('y', 28), note='a plain two-field cloth; no emblem; hoisted on the halyard')
    nu = K.count(6, 2); nv = K.count(3, 2); P = np.zeros((nv + 1, nu + 1, 3))
    for i in range(nv + 1):
        for j in range(nu + 1): P[i, j] = (0.07, 6.55 + 0.5 - 0.95 * i / nv - 0.025 * math.sin(j * 1.3), 0.08 + 1.6 * j / nu + 0.05 * math.sin(i * 2.0 + j * 0.7))
    P[:, :, 0] += 0.08 * np.sin(np.linspace(0, 3.2, nu + 1))[None, :]
    K.grid2('flag', 'cloth', P, {'seed': 8, 'a': (0.68, 0.64, 0.55), 'b': (0.30, 0.38, 0.46)}, out=(1, 0, 0), double=True, w=0.5, su=1.6, sv=0.95)
    if not K.Q['far']:
        K.tube('flag', 'rope', [(0.0, 6.2, 0.1), (0.0, 7.0, 0.1)], 0.01, m=4, prm={'seed': 9}, w=0.1)
    K.foot([(-0.85, -0.85), (0.85, -0.85), (0.85, 0.85), (-0.85, 0.85)]); add_sockets(K, [('socket_base', 0.0, 0.0, 0.0, 'mount')])


piece('flagstaff', 'Flagstaff on a stone base', PROP_WEAR, build_flagstaff, 'a 7 m mast, a plain two-field cloth (node flag) and a stone plinth; intact or snapped')


# ------------------------------------------------------------------------------------------------- loose props
def build_loose_props(K):
    K.extra['hp_hint'] = None; K.extra['note2'] = 'each prop is a node the page can pick up and place (movable take)'
    K.node('intact', 'root', (0, 0, 0), state='intact', note='the only state of the props')
    rng = K.rnd('props')
    blocks = [((-1.6, 0.15, -0.9), (0.62, 0.30, 0.34), 15.0), ((-1.0, 0.15, -0.55), (0.58, 0.30, 0.30), -25.0), ((-1.3, 0.45, -0.75), (0.6, 0.28, 0.32), 5.0), ((-0.2, 0.14, -1.2), (0.5, 0.28, 0.28), 40.0)]
    for i, (c, sz, yw) in enumerate(blocks):
        nm = 'stone_block_%02d' % (i + 1); K.node(nm, 'root', c, movable='take', note='a squared block of facing stone')
        K.box(nm, 'ashlar', c, sz, eul(0, yw, 0), {'tone': 'wall' if i % 2 else 'quoin', 'seed': 20 + i, 'course': 0.3}, uax=0, w=0.7)
    for i, c in enumerate(((1.3, 0.0, -0.9), (1.95, 0.0, -0.3), (1.2, 0.0, -0.1))):
        nm = 'gabion_%02d' % (i + 1); K.node(nm, 'root', c, movable='take', note='a wicker basket filled with earth'); gabion(K, nm, c, 30 + i)
    K.node('cannonballs', 'root', (0.0, 0.0, 0.9), movable='take', note='a pyramid of 14 iron balls')
    r = 0.1; base = [(0.0, 0.0), (0.2, 0.0), (0.4, 0.0), (0.1, 0.17), (0.3, 0.17), (0.2, 0.34), (-0.1, 0.0), (0.0, 0.17)]
    ball_pos = []
    for row, (cnt, yy) in enumerate(((4, 0.1), (3, 0.27), (2, 0.44), (1, 0.61))):
        for k in range(cnt): ball_pos.append((-0.0 + (k - (cnt - 1) / 2) * 0.205, yy, 0.9 + (row * 0.0)))
    for (x, y, z) in (ball_pos if not K.Q['far'] else ball_pos[:4]): sphere(K, 'cannonballs', 'iron', (x, y, z), r, {'seed': 40, 'rust': 0.45}, 0.15)
    for i, c in enumerate(((1.0, 0.0, 1.1), (1.55, 0.0, 1.35), (-1.2, 0.0, 1.2))):
        nm = 'barrel_%02d' % (i + 1); K.node(nm, 'root', c, movable='take', note='a small oak barrel'); barrel(K, nm, c, 50 + i)
    K.foot([(-2.2, -1.5), (2.4, -1.5), (2.4, 1.8), (-2.2, 1.8)])


piece('loose_props', 'Loose props: stone blocks, gabions, cannonballs, barrels', PROP_WEAR, build_loose_props, 'four dressed blocks, three gabions, a pile of cannonballs and three barrels, each a movable node')


# ------------------------------------------------------------------------------------------------- command line
def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Star fort kit GLB files.')
    ap.add_argument('--out', required=True); ap.add_argument('--piece', default='all', choices=['all'] + list(PIECE_DEFS)); ap.add_argument('--lod', default='all', choices=['all'] + list(LODS))
    a = ap.parse_args(argv); a.pieces = list(PIECES) if a.piece == 'all' else [a.piece]; a.lods = list(LODS) if a.lod == 'all' else [a.lod]
    return a


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True); rp = os.path.join(a.out, 'starfort_report.json'); rep = {}
    if os.path.exists(rp):
        try: rep = json.load(open(rp))
        except Exception: rep = {}
    for p in a.pieces:
        for lod in a.lods:
            fn = os.path.join(a.out, out_name(p, lod)); st = write_glb(fn, build(p, lod))
            rep[os.path.basename(fn)] = {k: st[k] for k in ('triangles', 'vertices', 'bytes', 'image_bytes', 'texel_density_per_m')}; print('GLB', fn, 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1), 'images', st['image_bytes'], flush=True)
    with open(rp, 'w') as f: json.dump(dict(sorted(rep.items())), f, indent=1)


if __name__ == '__main__':
    main()
