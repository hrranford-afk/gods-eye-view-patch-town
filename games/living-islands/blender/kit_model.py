"""KIT PIECES: eight weathered shore pieces of the first settlement as GLB files (pure python and numpy, no Blender needed). See KIT_PIECES.md.
  relic_hull (half-buried old-world hull)  lighthouse_stump (collapsed tower)  crate_stack (washed-up shipping crates)  cairn (stone waymark)
  drying_rack (fish-drying rack)  lean_to (driftwood and sailcloth shelter)  rain_barrel (barrel, gutter and a low wall)  wrecked_jetty (broken landing stage)
Run:  python3 kit_model.py --out DIR [--piece NAME|all] [--lod hero|live|far|all]
Frame in the file (glTF): +Y up, metres, y = 0 is the ground, the piece is centred on x = z = 0, its front faces +Z. Node `footprint` is a flat polygon at y = 0.003 (the same polygon is in the node extras)
for placing the piece on terrain. Parts that move or can be taken are named nodes with their pivot at the joint (plank_*, crate_*, stone_*, fish_*, door, lid, hatch ...); `extras.movable` says how.
Every surface patch has its own chart in one atlas per level; kit_tex.py bakes the wear (tide line, salt, moss, lichen, bleach, rust, chipped paint) into it from the true 3D position.
Original designs: no maker names, no lettering. Deterministic (hashed noise and seeded generators)."""
import sys, os, math, json, struct, argparse, zlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_tex as TX

LODS = ('hero', 'live', 'far')
PIECES = ('relic_hull', 'lighthouse_stump', 'crate_stack', 'cairn', 'drying_rack', 'lean_to', 'rain_barrel', 'wrecked_jetty')
BUDGET = {'hero': (8000, 15000), 'live': (1500, 4000), 'far': (300, 700)}
SIZE_KB = {'hero': 1024, 'live': 300, 'far': 80}
TOTAL_KB = 5120
# per level: grid resolution factor, detail count, atlas size, normal and orm divisor, biggest texel density (texels per metre)
QL = {
    'hero': dict(pad=3, res=1.0, detail=2, atlas=1024, ndiv=2, dens=330, far=False, q=(66, 68, 52)),
    'live': dict(pad=2, res=0.42, detail=1, atlas=512, ndiv=2, dens=170, far=False, q=(62, 64, 48)),
    'far': dict(pad=1, res=0.16, detail=0, atlas=256, ndiv=2, dens=90, far=True, q=(58, 58, 48)),
}


# ------------------------------------------------------------------------------------------------- small maths
def unit(v):
    v = np.asarray(v, float); n = np.linalg.norm(v, axis=-1, keepdims=True); return v / np.maximum(n, 1e-12)

def rot_x(a): c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def rot_y(a): c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rot_z(a): c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def eul(rx=0.0, ry=0.0, rz=0.0): return rot_y(math.radians(ry)) @ rot_x(math.radians(rx)) @ rot_z(math.radians(rz))
def lerp(a, b, t): return np.asarray(a, float) * (1 - t) + np.asarray(b, float) * t

def quat_axis(axis, deg):
    a = math.radians(deg) / 2.0; s = math.sin(a); v = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[axis]; return (v[0] * s, v[1] * s, v[2] * s, math.cos(a))

def frame_from(tdir, ref=(0, 1, 0)):
    ex = unit(tdir); r = np.array(ref, float); ey = np.cross(r, ex)
    if np.linalg.norm(ey) < 1e-6: ey = np.cross(np.array((1, 0, 0.0)), ex)
    ey = unit(ey); ez = np.cross(ex, ey); return np.stack([ex, ey, ez], 0)

def stable_seed(*parts):
    return zlib.crc32('|'.join(str(p) for p in parts).encode()) & 0x7FFFFFFF


# ------------------------------------------------------------------------------------------------- containers
class Chunk:
    """one surface patch with its own chart: positions, normals, chart coordinates 0..1 (v down), triangles, physical chart size in metres, material and parameters"""
    def __init__(s, mat, prm, P, N, UV, F, su, sv, w=1.0, double=False):
        s.mat = mat; s.prm = prm; s.P = P; s.N = N; s.UV = UV; s.F = F; s.su = max(su, 0.004); s.sv = max(sv, 0.004); s.w = w; s.double = double; s.rect = None; s.UVatlas = None


class Node:
    def __init__(s, name, parent, pivot, extras=None):
        s.name = name; s.parent = parent; s.pivot = np.asarray(pivot, float); s.chunks = []; s.extras = dict(extras or {})

    def tris(s): return sum(len(c.F) for c in s.chunks)


def grid_faces(nr, nc):
    i = (np.arange(nr - 1)[:, None] * nc + np.arange(nc - 1)[None, :]).ravel(); a = i; b = i + 1; c = i + nc + 1; d = i + nc
    return np.stack([np.stack([a, b, c], 1), np.stack([a, c, d], 1)], 1).reshape(-1, 3), (np.arange(nr - 1)[:, None] * np.ones((1, nc - 1), int)).ravel()


class Kit:
    """the builder for one piece at one level of detail"""
    def __init__(s, piece, lod):
        s.piece = piece; s.lod = lod; s.Q = QL[lod]; s.nodes = {}; s.order = []; s.footprint = []; s.meta = {}
        s.node('root', None, (0, 0, 0))

    def R(s, n, lo=2): return max(lo, int(round(n * s.Q['res'])))
    def rnd(s, *key): return np.random.default_rng(stable_seed(s.piece, *key))
    def sd(s, *key): return stable_seed(s.piece, 'm', *key) % 997 + 1

    def node(s, name, parent='root', pivot=(0, 0, 0), **extras):
        nd = Node(name, parent, pivot, extras); s.nodes[name] = nd; s.order.append(name); return nd

    # ---- surfaces
    def grid(s, node, mat, P, prm=None, out=None, wrap=None, w=1.0, double=False, keep=None, rim=None):
        """a (nr, nc) grid of points as one surface chart (u along the columns, v along the rows). out: direction (or vector field) the normals should face. keep: (nr-1, nc-1) bool of cells that exist."""
        P = np.asarray(P, float); nr, nc = P.shape[:2]; prm = dict(prm or {}); prm.setdefault('seed', s.sd(node, mat, len(s.nodes[node].chunks)))
        if wrap == 'u':
            Pu = P[:, :-1]; du = np.roll(Pu, -1, 1) - np.roll(Pu, 1, 1); dv = np.gradient(Pu, axis=0) if nr > 1 else np.zeros_like(Pu); N = np.cross(du, dv); N = np.concatenate([N, N[:, :1]], 1)
        elif wrap == 'v':
            Pv = P[:-1]; dv = np.roll(Pv, -1, 0) - np.roll(Pv, 1, 0); du = np.gradient(Pv, axis=1) if nc > 1 else np.zeros_like(Pv); N = np.cross(du, dv); N = np.concatenate([N, N[:1]], 0)
        else:
            du = np.gradient(P, axis=1) if nc > 1 else np.zeros_like(P); dv = np.gradient(P, axis=0) if nr > 1 else np.zeros_like(P); N = np.cross(du, dv)
        ln = np.linalg.norm(N, axis=-1, keepdims=True); N = N / np.maximum(ln, 1e-12)
        sg = 1.0; bad = ln[..., 0] < 1e-9
        if out is not None:
            o = np.broadcast_to(np.asarray(out, float), P.shape); good = ~bad
            sg = 1.0 if (np.mean(np.sum(N[good] * o[good], -1)) >= 0 if good.any() else True) else -1.0
        F, rowid = grid_faces(nr, nc)
        if keep is not None: F = F[np.repeat(np.asarray(keep, bool).reshape(-1), 2)]
        if sg < 0: N = -N; F = F[:, [0, 2, 1]]
        if out is not None and bad.any(): N = np.where(bad[..., None], unit(np.broadcast_to(np.asarray(out, float), P.shape)), N)
        su = float(np.mean(np.linalg.norm(np.diff(P, axis=1), axis=-1).sum(1))); sv = float(np.mean(np.linalg.norm(np.diff(P, axis=0), axis=-1).sum(0)))
        UV = np.stack([np.broadcast_to(np.linspace(0, 1, nc)[None, :], (nr, nc)), np.broadcast_to(np.linspace(0, 1, nr)[:, None], (nr, nc))], -1).reshape(-1, 2)
        s._add(node, Chunk(mat, prm, P.reshape(-1, 3), N.reshape(-1, 3), UV, F, su, sv, w, double))

    def _add(s, node, ch):
        if len(ch.F) == 0: return
        used = np.unique(ch.F); remap = np.full(len(ch.P), -1); remap[used] = np.arange(len(used))
        ch.P = ch.P[used]; ch.N = ch.N[used]; ch.UV = ch.UV[used]; ch.F = remap[ch.F]
        g = np.cross(ch.P[ch.F[:, 1]] - ch.P[ch.F[:, 0]], ch.P[ch.F[:, 2]] - ch.P[ch.F[:, 0]]); bad = np.sum(g * ch.N[ch.F].mean(1), 1) < 0
        ch.F = np.where(bad[:, None], ch.F[:, [0, 2, 1]], ch.F); s.nodes[node].chunks.append(ch)

    def quad(s, node, mat, a, b, c, d, prm=None, w=1.0, double=False):
        """one flat four-corner chart a, b, c, d (a to b is u, a to d is v)"""
        P = np.array([[a, b], [d, c]], float); n = unit(np.cross(P[0, 1] - P[0, 0], P[1, 0] - P[0, 0]))
        s.grid(node, mat, P, prm, out=n, w=w, double=double)

    def box(s, node, mat, c, size, R=None, prm=None, uax=0, w=1.0, skip=(), taper=None):
        """a box: size (x, y, z) along the local axes of R, grain along local axis uax. taper: (sx, sz) end scale of the +y face for a tapering post"""
        R = np.eye(3) if R is None else np.asarray(R, float); c = np.asarray(c, float); h = np.asarray(size, float) / 2.0
        for axis in range(3):
            for sg in (-1, 1):
                if (axis, sg) in skip: continue
                o = [i for i in range(3) if i != axis]; i0, i1 = o
                ua = uax if uax in o else i0; va = i1 if ua == i0 else i0
                nvec = R[:, axis] * sg; ux = R[:, ua]; vx = R[:, va]
                o0 = c + nvec * h[axis] - ux * h[ua] - vx * h[va]
                P = np.array([[o0, o0 + ux * 2 * h[ua]], [o0 + vx * 2 * h[va], o0 + ux * 2 * h[ua] + vx * 2 * h[va]]])
                s.grid(node, mat, P, prm, out=nvec, w=w)

    def tube(s, node, mat, path, radii, m=8, prm=None, rect=None, wob=0.0, wseed=1, caps=(True, True), ref=(0, 1, 0), w=1.0, twist=0.0):
        """a swept tube along a polyline. radii: scalar, (n,) or (n, 2) (across, along the reference). rect: exponent for a rounded rectangle section (None = round). wob: relative bumpiness."""
        path = np.asarray(path, float); n = len(path); rad = np.asarray(radii, float)
        rad = np.full((n, 2), float(rad)) if rad.ndim == 0 else (np.stack([rad, rad], 1) if rad.ndim == 1 else rad)
        if s.Q['far']:
            m = min(m, 4 if not rect else 4); k_ = 2 if (n <= 4 or np.linalg.norm(np.gradient(path, axis=0), axis=1).std() < 1e-3 and False) else 3
            if n > k_: ix = np.linspace(0, n - 1, k_).round().astype(int); path = path[ix]; rad = rad[ix]; n = k_
            wob = 0.0
        tang = unit(np.gradient(path, axis=0)); frames = []; prev = None
        for i in range(n):
            if prev is None: f = frame_from(tang[i], ref)
            else:
                ex = tang[i]; ey = prev[1] - np.dot(prev[1], ex) * ex
                if np.linalg.norm(ey) < 1e-6: ey = prev[2]
                ey = unit(ey); f = np.stack([ex, ey, np.cross(ex, ey)], 0)
            frames.append(f); prev = f
        ang = np.linspace(0, 2 * np.pi, m + 1); ca = np.cos(ang); sa = np.sin(ang)
        if rect: ca = np.sign(ca) * np.abs(ca) ** (2.0 / rect); sa = np.sign(sa) * np.abs(sa) ** (2.0 / rect)
        P = np.zeros((m + 1, n, 3)); Nrm = np.zeros((m + 1, n, 3)); ln = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
        for j in range(n):
            f = frames[j]; tw = math.radians(twist) * (ln[j] / max(ln[-1], 1e-9)); c_, s_ = math.cos(tw), math.sin(tw)
            y_ = f[1] * c_ + f[2] * s_; z_ = -f[1] * s_ + f[2] * c_
            off = np.outer(ca * rad[j, 0], y_) + np.outer(sa * rad[j, 1], z_); P[:, j] = path[j] + off
            Nrm[:, j] = unit(np.outer(ca / max(rad[j, 0], 1e-6), y_) + np.outer(sa / max(rad[j, 1], 1e-6), z_))
        if wob > 0 and s.Q['res'] > 0.3:
            q = TX.fbm3(P.reshape(-1, 3).astype(np.float32), 5.0, 3, wseed) - 0.5; q2 = TX.noise3(P.reshape(-1, 3).astype(np.float32), 26.0, wseed + 9) - 0.5
            rr = np.maximum(rad[:, 0], rad[:, 1])[None, :, None]; d = ((q + 0.3 * q2) * 2.0 * wob).reshape(m + 1, n, 1) * rr
            d[-1] = d[0]; P = P + Nrm * d
        s.grid(node, mat, P, prm, out=Nrm, wrap='v', w=w)
        for end, do in ((0, caps[0]), (n - 1, caps[1])):
            if not do: continue
            ring = P[:-1, end]; cen = path[end]; nrm = tang[end] * (-1 if end == 0 else 1); k = len(ring)
            Pc = np.vstack([ring, cen]); ang2 = np.linspace(0, 2 * np.pi, k, endpoint=False); UV = np.vstack([np.stack([0.5 + 0.5 * np.cos(ang2), 0.5 + 0.5 * np.sin(ang2)], 1), [[0.5, 0.5]]])
            Fc = np.array([[i, (i + 1) % k, k] for i in range(k)]); Nc = np.repeat(nrm[None], k + 1, 0); pr = dict(prm or {}); pr.setdefault('seed', s.sd(node, mat, 'cap', end))
            r_ = float(max(rad[end]))
            s._add(node, Chunk(mat, pr, Pc, Nc, UV, Fc, 2 * r_, 2 * r_, 0.6))

    def blob(s, node, mat, c, radii, R=None, prm=None, nu=10, nv=5, e=(2.0, 2.0), amp=0.12, flat=None, freq=3.0, wseed=1, w=1.0):
        """a superellipsoid stone or lump, bumpy; flat: cut the bottom at this height below the centre"""
        R = np.eye(3) if R is None else np.asarray(R, float); c = np.asarray(c, float)
        ph = np.linspace(-np.pi / 2, np.pi / 2, nv + 1)[:, None]; th = np.linspace(0, 2 * np.pi, nu + 1)[None, :]
        def sp(x, p): return np.sign(x) * np.abs(x) ** p
        cp = sp(np.cos(ph), 2.0 / e[0]); sy = sp(np.sin(ph), 2.0 / e[0])
        x = cp * sp(np.cos(th), 2.0 / e[1]); z = cp * sp(np.sin(th), 2.0 / e[1]); y = sy * np.ones_like(th)
        U = np.stack([x, y, z], -1)
        if amp > 0:
            q = TX.fbm3((U.reshape(-1, 3) * 1.0 + c * 7.3).astype(np.float32), freq, 2, wseed) - 0.5; U = U * (1 + amp * 2 * q.reshape(nv + 1, nu + 1, 1))
        U = U * np.asarray(radii, float)
        if flat is not None: U[..., 1] = np.maximum(U[..., 1], -flat)
        P = c + U @ R.T; U0 = U
        s.grid(node, mat, P, prm, out=P - c, wrap='u', w=w)

    def lathe(s, node, mat, c, prof, seg=16, prm=None, R=None, w=1.0, caps=False):
        """a surface of revolution about the local y axis; prof: list of (radius, height); u runs along the profile, v around"""
        R = np.eye(3) if R is None else np.asarray(R, float); c = np.asarray(c, float); prof = np.asarray(prof, float)
        a = np.linspace(0, 2 * np.pi, seg + 1)[:, None]
        U = np.stack([prof[None, :, 0] * np.cos(a), np.broadcast_to(prof[None, :, 1], (seg + 1, len(prof))), prof[None, :, 0] * np.sin(a)], -1)
        P = c + U @ R.T; cen = c + (np.stack([np.zeros(len(prof)), prof[:, 1], np.zeros(len(prof))], -1) @ R.T)[None]
        s.grid(node, mat, P, prm, out=P - cen, wrap='v', w=w)

    def disc(s, node, mat, c, r, nrm, prm=None, k=12, w=0.6):
        nrm = unit(nrm); fr = frame_from(nrm, (0, 1, 0) if abs(nrm[1]) < 0.95 else (1, 0, 0)); ang = np.linspace(0, 2 * np.pi, k, endpoint=False)
        ring = np.asarray(c, float) + r * (np.outer(np.cos(ang), fr[1]) + np.outer(np.sin(ang), fr[2])); Pc = np.vstack([ring, c]); Fc = np.array([[i, (i + 1) % k, k] for i in range(k)])
        UV = np.vstack([np.stack([0.5 + 0.5 * np.cos(ang), 0.5 + 0.5 * np.sin(ang)], 1), [[0.5, 0.5]]]); pr = dict(prm or {}); pr.setdefault('seed', s.sd(node, mat, 'disc'))
        s._add(node, Chunk(mat, pr, Pc, np.repeat(nrm[None], k + 1, 0), UV, Fc, 2 * r, 2 * r, w))

    def foot(s, pts):
        """the footprint polygon (x, z) in metres, counter-clockwise seen from above"""
        s.footprint = [(float(x), float(z)) for x, z in pts]


# ------------------------------------------------------------------------------------------------- shared small builders
def tone_cycle(rng, tones):
    return tones[int(rng.integers(0, len(tones)))]


def stone_at(K, node, c, radii, rng, tone, nu=None, nv=None, amp=0.1, e=(1.7, 1.7), flat=None, yaw=None, tilt=(0, 0), w=1.0):
    nu = nu or K.R(14, 5); nv = nv or max(2, nu // 2)
    if K.Q['far']: nu, nv = 5, 2
    R = eul(tilt[0], yaw if yaw is not None else float(rng.uniform(0, 360)), tilt[1])
    K.blob(node, 'stone', c, radii, R, {'tone': tone}, nu, nv, e, amp, flat, 3.0, int(rng.integers(1, 900)), w)


def ground_mound(K, node, prm, cx, cz, rx, rz, h, n=14, seed=1, nrings=3, tone_hint=None, edge_y=0.0):
    """a low heap of sand or shingle with an irregular outline, rising to h in the middle, flat at the ground on its rim"""
    na = K.R(n, 8); nr_ = max(2, K.R(nrings, 2)); rng = K.rnd('mound', node, seed)
    if K.Q['far']: na = 8; nr_ = 2
    a = np.linspace(0, 2 * np.pi, na + 1); rr = 1 + 0.18 * (rng.random(na + 1) - 0.5); rr[-1] = rr[0]
    P = np.zeros((nr_ + 1, na + 1, 3))
    for i in range(nr_ + 1):
        t = i / nr_; r = (1 - t)
        prof = h * (1 - r ** 1.7) if i else 0.0
        P[i, :, 0] = cx + rx * r * rr * np.cos(a); P[i, :, 2] = cz + rz * r * rr * np.sin(a); P[i, :, 1] = edge_y + (h * (t ** 0.8) * (1 + 0.12 * (rng.random(na + 1) - 0.5)) if i else edge_y)
    P[:, -1] = P[:, 0]
    K.grid(node, 'sand', P, prm, out=np.broadcast_to([0, 1, 0], P.shape), wrap='u', w=0.45)


# ------------------------------------------------------------------------------------------------- the pieces
PIECE_DEFS = {}


def piece(name, title, wear, build, size_note=''):
    PIECE_DEFS[name] = dict(title=title, wear=wear, build=build, note=size_note)


def build_cairn(K):
    """a waymark cairn of about forty flat stones on a ring of boulders, a faded rag tied to the top, a few small stones at the foot"""
    K.node('body')
    tones = ['grey', 'slate', 'warm', 'pale', 'rust', 'grey', 'dark', 'slate']
    nl = 11; y = -0.05; idx = 0
    for li in range(nl):
        rng = K.rnd('layer', li); t = li / (nl - 1); rad = 0.64 * (1 - t) ** 0.95 + 0.03
        cnt = max(1, int(round(2 * np.pi * rad / 0.46))) if li < nl - 1 else 1
        if K.Q['far'] and cnt > 2: cnt = int(round(cnt * 0.45))
        for k in range(cnt):
            ang = 2 * np.pi * (k + 0.5 * (li % 2) + 0.2 * rng.random()) / cnt; rr = rad * (0.88 + 0.22 * rng.random()) if cnt > 1 else 0.0
            ra = (0.36 - 0.16 * t) * (0.8 + 0.4 * rng.random()); rb = (0.125 - 0.03 * t) * (0.75 + 0.5 * rng.random()); rc = ra * (0.6 + 0.35 * rng.random())
            c = np.array([rr * math.cos(ang), y + rb * 0.9, rr * math.sin(ang)])
            tone = tones[int(rng.integers(0, len(tones)))]; node = 'body'
            if li >= 8 and cnt > 1 or li == 9:
                node = 'stone_%02d' % (len([n for n in K.nodes if n.startswith('stone_') and n != 'stone_cap']) + 1)
                K.node(node, 'root', c, movable='take', note='a stone of the cairn top, can be lifted off')
            stone_at(K, node, c, (ra, rb, rc), rng, tone, nu=K.R(14, 6), nv=K.R(6, 3), e=(3.6, 2.7), amp=0.14, flat=rb * 0.5, yaw=float(np.degrees(ang) + rng.uniform(-30, 30)), tilt=(float(rng.uniform(-7, 7)), float(rng.uniform(-7, 7))))
            idx += 1
        y += rb * 1.75
    # the rubble core fills the middle so no gap shows a hole
    K.tube('body', 'stone', [(0, -0.05, 0), (0, y * 0.5, 0), (0, y - 0.02, 0)], [0.52, 0.30, 0.06], m=K.R(10, 6), prm={'tone': 'dark', 'seed': 77}, caps=(False, True), w=0.25)
    # capstone, upright and a little off true
    rng = K.rnd('cap'); K.node('stone_cap', 'root', (0.0, y, 0.0), movable='take', note='the capstone')
    stone_at(K, 'stone_cap', (0.0, y + 0.08, 0.0), (0.10, 0.11, 0.085), rng, 'pale', nu=K.R(12, 6), nv=K.R(6, 3), e=(3.4, 2.6), tilt=(5, -7), flat=0.04)
    top = y + 0.2
    # the rag: a strip of faded cloth tied on a bit of line, hanging from the capstone and stirring in the wind
    K.node('rag', 'root', (0.04, top - 0.05, 0.0), movable='swing', note='a rag of faded sailcloth tied to the cairn')
    nr_, nc = 4, 6; P = np.zeros((nr_, nc, 3))
    for i in range(nr_):
        for j in range(nc):
            t = j / (nc - 1); P[i, j] = (0.04 + 0.34 * t + 0.02 * math.sin(i), top - 0.05 - 0.05 * i * 0.9 + 0.02 * t * math.sin(t * 5), 0.02 * math.sin(t * 7 + i) + 0.002 * i)
    P[:, :, 1] -= 0.09 * np.linspace(0, 1, nc)[None, :] ** 2
    P[:, :, 2] += np.linspace(-0.045, 0.045, nr_)[:, None]
    K.grid('rag', 'canvas', P, {'base': (0.55, 0.50, 0.40), 'stripe': (0.3, 0.55, (0.28, 0.36, 0.45)), 'panel': 0.3, 'seed': 5}, out=(0, 0, 1), double=True, w=0.5)
    # shingle and small stones around the foot
    rng = K.rnd('foot')
    ground_mound(K, 'body', {'grit': 0.9, 'seed': 3}, 0, 0, 1.15, 1.1, 0.10, 18, 1, 3)
    for i in range(K.R(14, 3) if not K.Q['far'] else 0):
        ang = rng.uniform(0, 2 * np.pi); rr = rng.uniform(0.75, 1.15); s_ = rng.uniform(0.05, 0.12)
        stone_at(K, 'body', (rr * math.cos(ang), s_ * 0.3, rr * math.sin(ang)), (s_ * 1.3, s_ * 0.6, s_), rng, tone_cycle(rng, tones), nu=K.R(9, 5), nv=3, e=(3.0, 2.4), flat=s_ * 0.2)
    K.foot([(1.1 * math.cos(a), 1.1 * math.sin(a)) for a in np.linspace(0, 2 * np.pi, 13)[:-1]])


piece('cairn', 'Stone cairn waymark', dict(tide=0.0, moss=0.55, lichen=0.8, salt=0.3, bleach=0.5, chip=0.5, rust=0.5, barnacle=0.0), build_cairn, 'a hip-high waymark of stacked flat stones')


# ------------------------------------------------------------------------------------------------- shared builders for timber, rope and cloth
def spar(K, node, p0, p1, r0, r1=None, tone='drift', seed=1, bow=0.0, wob=0.3, m=None, caps=(True, True), n=None, extra=None, w=1.0):
    """a driftwood pole, a little bent and knobbly; grain runs along it"""
    n = n or K.R(12, 3); m = m or max(5, K.R(10, 5)); r1 = r0 if r1 is None else r1
    p0 = np.array(p0, float); p1 = np.array(p1, float); t = np.linspace(0, 1, n); P = p0 + (p1 - p0) * t[:, None]
    if bow: P = P + unit(np.cross(p1 - p0, (0.31, 0.17, 0.93))) * bow * np.sin(np.pi * t)[:, None]
    prm = {'tone': tone, 'seed': seed}; prm.update(extra or {})
    K.tube(node, 'wood', P, np.linspace(r0, r1, n), m=m, prm=prm, wob=wob, wseed=seed, caps=caps, w=w)


def board(K, node, c, d, nrm, L, Wd, T, tone='drift', seed=1, extra=None, warp=0.0, w=1.0, rough_end=False):
    """a plank centred at c: length L along direction d, width Wd, thickness T along nrm. Hero level: slightly bowed with worn edges; live and far: a box."""
    d = unit(d); nrm = unit(nrm - np.dot(nrm, d) * d); lat = np.cross(nrm, d); prm = {'tone': tone, 'seed': seed}; prm.update(extra or {}); c = np.asarray(c, float)
    if K.Q['res'] >= 0.9:
        n = 4; t = np.linspace(-0.5, 0.5, n); path = c + d * L * t[:, None] + nrm * warp * (1 - (2 * t) ** 2)[:, None]
        K.tube(node, 'wood', path, np.stack([np.full(n, Wd / 2), np.full(n, T / 2)], 1), m=8, prm=prm, rect=5.0, wob=0.0, wseed=seed, caps=(True, True), ref=nrm, w=w)
    else:
        R = np.stack([d, nrm, lat], 1); K.box(node, 'wood', c, (L, T, Wd), R, prm, uax=0, w=w)


def rope_line(K, node, path, r=0.012, seed=3, base=(0.55, 0.47, 0.34), caps=(True, True), pitch=None):
    path = np.asarray(path, float); K.tube(node, 'rope', path, r, m=max(4, K.R(6, 4)), prm={'seed': seed, 'base': base, 'pitch': pitch or r * 5.0}, caps=caps, w=0.7)


def helix(c, axis_a, axis_b, r, turns, n, y0=0.0, dy=0.0, along=None, dalong=0.0):
    t = np.linspace(0, 2 * np.pi * turns, n); c = np.asarray(c, float)
    P = c + np.outer(np.cos(t) * r, axis_a) + np.outer(np.sin(t) * r, axis_b)
    if along is not None: P = P + np.outer(np.linspace(0, dalong, n), along)
    return P


def lashing(K, node, c, axis, r, seed=3, turns=3.0):
    """a few turns of line round a pole at c (axis = the pole direction)"""
    if K.Q['detail'] < 1: return
    axis = unit(axis); fr = frame_from(axis, (0, 1, 0)); n = 22 if K.Q['detail'] >= 2 else 12
    rope_line(K, node, helix(c - axis * 0.02, fr[1], fr[2], r, turns, n, along=axis, dalong=0.045), 0.0085, seed)


def cloth_grid(K, node, P, prm=None, w=0.8, out=(0, 1, 0)):
    K.grid(node, 'canvas', P, prm, out=out, double=True, w=w)


def kelp_ribbon(K, node, path, width, seed=1):
    """a strand of wrack: a long ribbon with a wavy edge, twisting as it lies"""
    path = np.asarray(path, float); n0 = len(path); n = max(6, n0 * 2)
    t0 = np.linspace(0, 1, n0); t1 = np.linspace(0, 1, n); path = np.stack([np.interp(t1, t0, path[:, k]) for k in range(3)], 1)
    path = path + np.stack([0.025 * np.sin(t1 * 11 + seed), 0.0 * t1, 0.025 * np.cos(t1 * 9 + seed)], 1)
    tg = unit(np.gradient(path, axis=0)); side = unit(np.cross(tg, (0.3, 0.9, 0.2))); wv = width * 0.5 * (0.6 + 0.4 * np.sin(t1 * 13 + seed) ** 2) * (1 - 0.7 * t1 ** 3)
    tw = np.sin(t1 * 6 + seed)[:, None]; lift = np.stack([0 * t1, 0.015 * np.abs(tw[:, 0]), 0 * t1], 1)
    P = np.stack([path - side * wv[:, None] + lift, path, path + side * wv[:, None] * (1 + 0.3 * tw) + lift], 0)
    K.grid(node, 'kelp', P, {'seed': seed}, out=(0, 1, 0), double=True, w=0.4)


def stones_around(K, node, centre, radius, count, rng, size=(0.07, 0.13), tones=('grey', 'slate', 'warm', 'pale'), y0=0.0, nu=None):
    for i in range(count):
        a = 2 * np.pi * (i + rng.uniform(-0.2, 0.2)) / count; rr = radius * rng.uniform(0.9, 1.1); sz = rng.uniform(*size)
        stone_at(K, node, (centre[0] + rr * math.cos(a), y0 + sz * 0.38, centre[2] + rr * math.sin(a)), (sz * 1.2, sz * 0.62, sz), rng, tone_cycle(rng, tones), nu=nu or K.R(10, 5), nv=max(3, K.R(5, 3)), e=(3.0, 2.4), amp=0.14, flat=sz * 0.2)


# ------------------------------------------------------------------------------------------------- the pieces
def build_rain_barrel(K):
    """a corner of a whitewashed turf-capped cottage wall with a door, a rusty eave of corrugated sheet, a gutter, a downpipe into an oak barrel with an ajar lid, a bucket and a step stone"""
    K.node('body'); K.node('wall'); PL = {'rubble': True, 'flat': True, 'dir': (1.0, 0.0), 'wash': (0.76, 0.73, 0.65), 'band': (0.0, 0.5, (0.17, 0.2, 0.14))}
    def wallbox(c, size, seed): K.box('wall', 'plaster', c, size, None, dict(PL, seed=seed), uax=0)
    wallbox((-1.35, 1.0, 0.0), (0.30, 2.0, 0.52), 11)
    wallbox((0.55, 1.0, 0.0), (1.9, 2.0, 0.52), 12)
    wallbox((-0.8, 1.82, 0.0), (0.8, 0.36, 0.52), 13)
    # the lintel, a squared driftwood beam
    board(K, 'wall', (-0.8, 1.62, 0.09), (1, 0, 0), (0, 1, 0), 1.08, 0.22, 0.17, 'dark', 21)
    K.box('wall', 'wood', (-0.8, 0.77, -0.2), (0.82, 1.55, 0.04), None, {'tone': 'tarred', 'seed': 5}, uax=1, w=0.25)
    # turf cap
    path = [(-1.55 + 3.1 * t, 1.99 + 0.03 * math.sin(t * 9), 0.0) for t in np.linspace(0, 1, K.R(10, 4))]
    K.tube('wall', 'turf', path, [(0.31, 0.06)] * len(path), m=max(6, K.R(12, 6)), prm={'seed': 4}, wob=0.5, wseed=8, caps=(True, True), ref=(0, 1, 0))
    # the door, hinged on its left, boards with two battens and strap hinges
    K.node('door', 'root', (-1.18, 0.0, 0.1), movable='swing', swing=('y', -78), note='plank door, swings inward on strap hinges')
    for i in range(1 if K.Q['far'] else 5):
        x = -1.18 + 0.152 * i + 0.076
        if K.Q['far']: board(K, 'door', (-0.8, 0.78, 0.1), (0, 1, 0), (0, 0, 1), 1.5, 0.76, 0.035, 'drift', 30); break
        board(K, 'door', (x, 0.78, 0.1), (0, 1, 0), (0, 0, 1), 1.5, 0.148, 0.035, 'drift', 30 + i, {'bleach': 0.7}, w=1.0)
    for y in (() if K.Q['far'] else (0.35, 1.2)): K.box('door', 'wood', (-0.8, y, 0.128), (0.78, 0.09, 0.025), None, {'tone': 'dark', 'seed': 40}, uax=0)
    for y in (() if K.Q['far'] else (0.35, 1.2)): K.box('door', 'iron', (-1.0, y, 0.145), (0.4, 0.05, 0.012), None, {'seed': 50, 'rust': 0.8}, uax=0, w=0.7)
    # eave: rafters and two sheets of rusty corrugated iron
    for i, x in enumerate((-1.3, -0.45, 0.45, 1.3)): spar(K, 'wall', (x, 2.05, -0.3), (x, 1.80, 1.05), 0.04, 0.035, 'drift', 60 + i, wob=0.3)
    ppw = K.R(5, 3); nper = 21 if K.Q['res'] > 0.9 else 12
    for si, (x0, x1) in enumerate(((-1.65, 0.0), (0.0, 1.65))):
        nx = max(8, int(nper * (x1 - x0) / 0.076 / 4) * 1) if K.Q['res'] > 0.9 else K.R(14, 6)
        nx = 2 if K.Q['far'] else int((x1 - x0) / 0.076 * ppw); xs = np.linspace(x0, x1, nx + 1); zs = np.linspace(-0.12, 1.12, 4); P = np.zeros((len(zs), len(xs), 3))
        for j, z in enumerate(zs):
            t = (z + 0.12) / 1.24; P[j, :, 0] = xs; P[j, :, 2] = z; P[j, :, 1] = 2.14 - 0.34 * t + 0.022 * np.sin(xs / 0.076 * 2 * np.pi) + 0.012 * np.sin(t * 3 + si)
        K.grid('wall', 'iron', P, {'galv': True, 'rust': 0.55, 'seed': 70 + si}, out=(0, 1, 0), double=True)
    # gutter along the lip, falling to the right, with iron brackets
    gz = 1.13; r = 0.065; xs = np.linspace(-1.6, 1.62, K.R(8, 3)); ar = np.linspace(0, np.pi, K.R(8, 4)); P = np.zeros((len(ar), len(xs), 3))
    for i, a in enumerate(ar): P[i, :, 0] = xs; P[i, :, 2] = gz + r * np.cos(a); P[i, :, 1] = 1.78 - 0.035 * (xs + 1.6) / 3.2 - r * np.sin(a)
    K.node('gutter', 'root', (0, 1.75, gz), note='the half-round gutter, can be taken for salvage')
    K.grid('gutter', 'iron', P, {'galv': True, 'rust': 0.65, 'seed': 80}, out=(0, 1, 0), double=True)
    for x in (() if K.Q['far'] else (-1.2, -0.2, 0.9)): K.box('gutter', 'iron', (x, 1.76 - 0.035 * (x + 1.6) / 3.2, gz), (0.03, 0.02, 0.17), None, {'seed': 81, 'rust': 0.8}, uax=2, w=0.5)
    # downpipe from the gutter's low end into the barrel
    K.tube('body', 'iron', [(1.62, 1.70, gz), (1.55, 1.55, gz + 0.02), (1.42, 1.24, gz + 0.02), (1.30, 1.04, gz + 0.02)], 0.032, m=max(5, K.R(8, 5)), prm={'galv': True, 'rust': 0.7, 'seed': 82}, caps=(True, True), w=0.6)
    # the barrel: oak staves with iron hoops and a lid ajar
    bx, bz = 1.25, 1.02; hh = 0.92; prof = [(0.285 + 0.05 * math.sin(math.pi * t) - 0.01 * abs(2 * t - 1), hh * t) for t in np.linspace(0, 1, K.R(9, 4))]
    K.node('barrel', 'root', (bx, 0.0, bz), note='oak rain barrel')
    K.lathe('barrel', 'wood', (bx, 0.0, bz), prof, seg=K.R(20, 10), prm={'tone': 'oak', 'seed': 90, 'paint': None}, w=1.0)
    for hy in (() if K.Q['far'] else (0.10, 0.28, 0.66, 0.84)):
        rr = 0.285 + 0.05 * math.sin(math.pi * hy / hh) - 0.01 * abs(2 * hy / hh - 1)
        K.lathe('barrel', 'iron', (bx, 0.0, bz), [(rr - 0.004, hy - 0.022), (rr + 0.01, hy - 0.018), (rr + 0.01, hy + 0.018), (rr - 0.004, hy + 0.022)], seg=K.R(20, 10), prm={'seed': 91, 'rust': 0.85}, w=0.7)
    K.disc('barrel', 'glass', (bx, hh - 0.14, bz), 0.27, (0, 1, 0), {'seed': 92}, k=K.R(16, 8))
    K.tube('barrel', 'iron', [(bx - 0.0, 0.2, bz + 0.325), (bx, 0.2, bz + 0.40), (bx + 0.0, 0.17, bz + 0.46)], 0.022, m=5, prm={'seed': 93, 'rust': 0.7}, w=0.4)
    K.node('lid', 'root', (bx - 0.285, hh, bz), movable='swing', swing=('z', 55), rest=('z', 14), note='the barrel lid, lifts off or swings up')
    K.lathe('lid', 'wood', (bx, hh, bz), [(0.0, 0.035), (0.28, 0.035), (0.29, 0.02), (0.29, 0.0), (0.0, 0.0)], seg=K.R(20, 10), prm={'tone': 'pale', 'seed': 94}, w=0.7)
    # a galvanised bucket with a rope handle
    bk = (0.45, 0.0, 1.25)
    K.node('bucket', 'root', bk, movable='take', note='a rusty bucket')
    K.lathe('bucket', 'iron', bk, [(0.105, 0.0), (0.11, 0.02), (0.15, 0.27), (0.158, 0.275), (0.145, 0.265), (0.10, 0.02)], seg=K.R(16, 8), prm={'galv': True, 'rust': 0.7, 'seed': 95}, w=0.8)
    hp = [(bk[0] + 0.15 * math.cos(a), 0.27 + 0.17 * math.sin(a), bk[2]) for a in np.linspace(0, np.pi, K.R(9, 4))]
    if not K.Q['far']: rope_line(K, 'bucket', hp, 0.009, 96)
    # protruding stones in the wall face and quoins at the corner, firewood stacked on the left of the door
    rw = K.rnd('wallstones')
    for i in range(K.R(34, 1) if K.Q['res'] > 0.3 else 0):
        x = rw.uniform(-1.45, 1.45); y = rw.uniform(0.1, 1.8); side = 1 if rw.random() > 0.35 else -1
        if -1.22 < x < -0.38 and y < 1.6: continue
        sz = rw.uniform(0.09, 0.17)
        stone_at(K, 'wall', (x, y, side * 0.255), (sz * 1.5, sz * 0.8, sz * 0.5), rw, tone_cycle(rw, ['grey', 'warm', 'pale', 'slate']), nu=K.R(8, 5), nv=4, e=(4.0, 3.5), amp=0.12, yaw=float(rw.uniform(-4, 4)) + (0 if side > 0 else 180.0))
    for k in range(0 if K.Q['res'] < 0.4 else 9):
        row, col = k % 3, k // 3; yy = 0.05 + 0.09 * col; zz = 0.34 + 0.095 * row + (0.02 if col == 1 else 0.0)
        spar(K, 'body', (0.08 + 0.05 * (k % 2), yy, zz), (0.92 - 0.04 * (k % 3), yy + 0.01, zz + 0.01), 0.046, 0.04, 'drift', 330 + k, wob=0.3, n=K.R(10, 3))
    # step stone and shingle
    rng = K.rnd('step')
    stone_at(K, 'body', (-0.8, 0.05, 0.62), (0.34, 0.07, 0.22), rng, 'slate', nu=K.R(14, 6), nv=K.R(6, 3), e=(3.4, 2.8), amp=0.1, flat=0.02)
    ground_mound(K, 'body', {'grit': 0.8, 'seed': 6}, 0.2, 0.9, 2.1, 1.0, 0.07, 18, 2, 3)
    stones_around(K, 'body', (0.2, 0, 0.05), 1.7, 0 if K.Q['far'] else K.R(10, 3), K.rnd('footstones'), (0.06, 0.12), y0=0.0)
    K.foot([(-1.75, -0.35), (1.95, -0.35), (1.95, 1.65), (-1.75, 1.65)])


piece('rain_barrel', 'Rain barrel, gutter and cottage wall', dict(tide=0.0, moss=0.5, lichen=0.4, salt=0.35, bleach=0.6, chip=0.7, rust=0.7, barnacle=0.0), build_rain_barrel, 'low whitewashed wall with a door, rusty eave, gutter, downpipe and an oak rain barrel')


def build_wrecked_jetty(K):
    """a landing stage that lost its seaward half to a storm: pile pairs of different heights, a collapsing deck of bleached planks (each one a node), snapped stringers, diagonal braces, bollard, ladder, rope and kelp"""
    K.node('body'); rng = K.rnd('piles')
    xs = [-4.1, -2.75, -1.4, -0.05, 1.3, 2.65, 4.0]
    tops = {(0, -1): 0.55, (0, 1): 0.9, (1, -1): 1.1, (1, 1): 1.1, (2, -1): 1.18, (2, 1): 0.7, (3, -1): 1.2, (3, 1): 1.2, (4, -1): 1.15, (4, 1): 1.25, (5, -1): 0.4, (5, 1): 1.2, (6, -1): 1.25, (6, 1): 0.8}
    sunk = {0: 0.2, 1: 0.35, 2: 0.6, 3: 0.9, 4: 1.15, 5: 1.4, 6: 1.65}
    for i, x in enumerate(xs):
        for sgn in (-1, 1):
            if K.Q['far'] and i in (1, 4): continue
            r2 = K.rnd('pile', i, sgn); top = tops[(i, sgn)]; lean = r2.uniform(-0.05, 0.05)
            spar(K, 'body', (x + 0.02, -sunk[i], sgn * 0.72), (x + lean + 0.02, top, sgn * 0.72 + lean * 0.5), 0.115, 0.095, 'dark', 100 + i * 2 + (sgn > 0), bow=0.015, wob=0.35, w=1.2, extra={'bleach': 0.2})
    # caps (cross beams) and stringers where they still hold
    for i in (1, 3, 4, 6):
        board(K, 'body', (xs[i] + 0.02, 1.2 if i != 1 else 1.12, 0.0), (0, 0, 1), (0, 1, 0), 1.8, 0.2, 0.13, 'dark', 120 + i, w=1.0)
    for j, z in enumerate((-0.5, 0.5)):
        board(K, 'body', (1.9, 1.34, z), (1, 0, 0), (0, 1, 0), 4.7, 0.16, 0.12, 'dark', 130 + j, warp=0.01)
    board(K, 'body', (-2.5, 1.2, -0.5), (1, 0.12, 0), (0, 1, 0), 3.0, 0.16, 0.12, 'dark', 135)                      # a stringer sagging toward the beach
    board(K, 'body', (-2.7, 0.75, 0.5), (1, -0.45, 0.06), (0, 1, 0), 2.0, 0.16, 0.12, 'dark', 136)                 # the other one snapped and dropped
    # diagonal braces and bolts
    for i, (a, b) in enumerate(((3, 4), (4, 6), (0, 1))):
        spar(K, 'body', (xs[a], 0.1, -0.74), (xs[b], 1.0, -0.74), 0.045, 0.04, 'drift', 140 + i, wob=0.2)
    # the deck: bleached planks across the stringers, many gone; each is its own node
    pid = 0
    for i in range(0, 30, 3 if K.Q['far'] else 1):
        x = -0.8 + i * 0.205
        if x > 4.6: break
        r3 = K.rnd('plank', i); keep = r3.random() > (0.25 + 0.04 * max(0, 2 - i * 0.2))
        if not keep or (i in (9, 10, 22)): continue
        pid += 1; nm = 'plank_%02d' % pid; y = 1.43 + (0.02 if i > 14 else 0.0); tilt = 0.0
        if i in (3, 4, 15): tilt = 0.09 * (1 if i % 2 else -1)
        K.node(nm, 'root', (x, y, 0.0), movable='take', note='a deck plank of the jetty, can be pulled up and reused')
        board(K, nm, (x, y, 0.0 + r3.uniform(-0.02, 0.02)), (0, 0.0, 1.0) if tilt == 0 else (0.0, tilt, 1.0), (0, 1, 0), r3.uniform(1.55, 1.7), 0.185 + r3.uniform(-0.01, 0.02), 0.045, 'drift', 150 + i, {'bleach': 0.8}, warp=0.012)
    # planks fallen and lying on the beach side
    for i, (x, z, yaw) in enumerate(((-3.5, 0.7, 35), (-3.9, -0.9, -50), (-2.4, 1.15, 100))):
        pid += 1; nm = 'plank_%02d' % pid; r3 = K.rnd('fallen', i)
        K.node(nm, 'root', (x, 0.1, z), movable='take', note='a fallen plank in the shingle')
        d = (math.cos(math.radians(yaw)), 0.05, math.sin(math.radians(yaw))); board(K, nm, (x, 0.07, z), d, (0, 1, 0), 1.6, 0.18, 0.045, 'drift', 170 + i, {'bleach': 0.8}, warp=0.0)
    # iron: bollard on the deck and a ladder down the seaward end
    K.node('bollard', 'root', (3.4, 1.45, 0.2), movable='take', note='a rusty mooring bollard')
    K.lathe('bollard', 'iron', (3.4, 1.4, 0.2), [(0.09, 0.0), (0.075, 0.12), (0.06, 0.2), (0.085, 0.24), (0.1, 0.27), (0.0, 0.27)], seg=K.R(12, 6), prm={'seed': 180, 'rust': 0.9}, w=0.8)
    if K.Q['res'] > 0.3:
        for z in (-0.18, 0.18): K.tube('body', 'iron', [(4.58, 1.35, z), (4.58, 0.4, z)], 0.02, m=5, prm={'seed': 181, 'rust': 0.9}, caps=(True, True), w=0.5)
        for k in range(K.R(6, 3)): K.tube('body', 'iron', [(4.58, 1.2 - 0.17 * k, -0.18), (4.58, 1.2 - 0.17 * k, 0.18)], 0.013, m=5, prm={'seed': 182, 'rust': 0.9}, caps=(True, True), w=0.4)
    # rope: a coil on the deck and a length trailing over the edge; kelp caught on a cap
    cp = helix((2.2, 1.49, -0.3), (1, 0, 0), (0, 0, 1), 0.16, 3.0, K.R(40, 12), dy=0.0) + np.outer(np.linspace(0, 1, K.R(40, 12)), (0, 0.05, 0))
    rope_line(K, 'body', cp, 0.016, 183, caps=(True, True))
    rope_line(K, 'body', [(2.35, 1.5, -0.32), (2.5, 1.45, -0.7), (2.6, 1.2, -0.95), (2.6, 0.85, -0.9)], 0.016, 184)
    for k in range(3): kelp_ribbon(K, 'body', [(2.65 + 0.1 * k, 1.12 - 0.5 * t * (1 + 0.3 * k), 0.72 + 0.04 * math.sin(t * 5 + k) * 1.0) for t in np.linspace(0, 1, K.R(10, 3))], 0.07, 190 + k)
    ground_mound(K, 'body', {'grit': 0.9, 'seed': 8}, -3.2, 0.0, 2.4, 1.5, 0.22, 18, 3, 3)
    stones_around(K, 'body', (-3.3, 0, 0.0), 1.5, K.R(14, 3), K.rnd('jstones'), (0.07, 0.16))
    K.foot([(-4.8, -1.05), (4.8, -1.05), (4.8, 1.05), (-4.8, 1.05)])


piece('wrecked_jetty', 'Wrecked jetty', dict(tide=0.5, moss=0.15, lichen=0.1, salt=0.8, bleach=0.9, chip=0.5, rust=0.8, barnacle=0.9), build_wrecked_jetty, 'a storm-broken timber landing stage, 9 m long')


def build_lean_to(K):
    """rung one of the shelter ladder: a ridge pole on two forked posts, a faded patched sail over it with stones on the hem, a driftwood windbreak, a stone fire ring in front"""
    K.node('body'); y_b, y_f = 1.12, 1.52
    for z, h, sd in ((-1.2, y_b, 1), (1.2, y_f, 2)):
        spar(K, 'body', (0.0, -0.05, z), (0.0, h - 0.18, z), 0.06, 0.05, 'drift', 200 + sd, bow=0.03, wob=0.35)
        for s_ in (-1, 1): spar(K, 'body', (0.0, h - 0.2, z), (s_ * 0.11, h + 0.05, z), 0.035, 0.03, 'drift', 210 + sd + (s_ > 0), wob=0.3, n=K.R(6, 3))
    spar(K, 'body', (0.0, y_b + 0.04 - 0.02, -1.62), (0.02, y_f + 0.04, 1.7), 0.048, 0.04, 'drift', 220, bow=0.02, wob=0.3, n=K.R(16, 4))
    def ridge_y(z): return y_b + 0.04 + (z + 1.2) / 2.4 * (y_f - y_b) + 0.0
    K.node('sail', 'root', (0, 0, 0), note='the old sail laid over the ridge, stones on its hem')
    nz = K.R(26, 6); nt = K.R(12, 4); zs = np.linspace(-1.5, 1.55, nz); ts = np.linspace(0, 1, nt); rr = K.rnd('hem')
    hemz = 0.05 + 0.06 * np.array([rr.random() for _ in range(nz)])
    for sgn in (-1, 1):
        P = np.zeros((nt, nz, 3))
        for i, t in enumerate(ts):
            for j, z in enumerate(zs):
                ry = ridge_y(z) + 0.02; xo = sgn * (0.02 + 1.12 * t + 0.07 * math.sin(math.pi * t) + 0.012 * math.sin(z * 9 + t * 3)); yo = ry * (1 - t ** 1.15) + hemz[j] * t ** 2 + 0.02 * math.sin(z * 7) * math.sin(math.pi * t)
                P[i, j] = (xo, yo, z + 0.03 * t * sgn)
        cloth_grid(K, 'sail', P, {'base': (0.52, 0.47, 0.37), 'stripe': (0.52, 0.66, (0.30, 0.36, 0.43)), 'panel': 0.6, 'seed': 230 + (sgn > 0)}, w=1.0, out=(sgn, 1, 0))
    # back wall of cloth, a triangle pulled tight and tied
    nb = K.R(8, 3); P = np.zeros((nb, nb + 2, 3))
    for i in range(nb):
        t = i / (nb - 1)
        for j in range(nb + 2):
            u = j / (nb + 1) * 2 - 1; P[i, j] = (u * 1.08 * t, ridge_y(-1.58) * (1 - t) + 0.05 * t, -1.58 - 0.05 * math.sin(math.pi * t) * (1 - abs(u)))
    # a tent end as a fan: rows from the apex out to the ground line
    cloth_grid(K, 'sail', P, {'base': (0.62, 0.57, 0.44), 'panel': 0.5, 'seed': 232}, w=0.8, out=(0, 0.2, -1))
    # the door flap: hangs from the front apex, tied back to one side
    K.node('door', 'root', (0.0, ridge_y(1.5), 1.55), movable='swing', swing=('y', 85), note='the front flap of the sail, rolls aside')
    nd = K.R(9, 3); P = np.zeros((nd, nd, 3))
    for i in range(nd):
        t = i / (nd - 1)
        for j in range(nd):
            u = j / (nd - 1); ww = 1.0 * t * u; P[i, j] = (-ww * 1.0 - 0.05 * math.sin(u * 5) * t, ridge_y(1.55) * (1 - t) + 0.14 * t - 0.07 * u * t, 1.55 + 0.1 * math.sin(math.pi * t) * u + 0.04 * u * t)
    cloth_grid(K, 'door', P, {'base': (0.64, 0.58, 0.44), 'stripe': (0.2, 0.34, (0.30, 0.36, 0.43)), 'panel': 0.5, 'seed': 233}, w=0.9, out=(0, 0.2, 1))
    # ropes lashed over the sail from hem to hem, so the wind cannot lift it
    for ri, z in enumerate((-0.95, -0.2, 0.55, 1.2)):
        if K.Q['far']: break
        pts = []
        for t in np.linspace(-1, 1, K.R(26, 8)):
            xo = 1.17 * t + 0.0; yo = ridge_y(z) * (1 - abs(t) ** 1.15) + 0.05 * abs(t) ** 2 + 0.035 + 0.012 * math.sin(abs(t) * 3.1)
            pts.append((xo, yo, z + 0.03 * abs(t) * (1 if t > 0 else -1)))
        rope_line(K, 'body', pts, 0.014, 320 + ri)
        if K.Q['detail'] >= 2:
            for side in (-1, 1): stone_at(K, 'body', (side * 1.2, 0.09, z + 0.05), (0.1, 0.07, 0.08), K.rnd('tie', ri, side), 'dark', nu=8, nv=4, e=(3.0, 2.5), flat=0.03)
    # stones on the hem, guy lines to stakes
    rng = K.rnd('hemstones')
    for sgn in (-1, 1):
        for k in range(2 if K.Q['far'] else K.R(8, 3)):
            z = -1.4 + 2.85 * (k + rng.uniform(-0.15, 0.15)) / max(1, (2 if K.Q['far'] else K.R(8, 3)) - 1); sz = rng.uniform(0.09, 0.15)
            stone_at(K, 'body', (sgn * (1.18 + rng.uniform(0, 0.08)), sz * 0.4, z), (sz * 1.3, sz * 0.6, sz), rng, tone_cycle(rng, ['grey', 'slate', 'warm', 'pale']), nu=K.R(10, 5), nv=3, e=(3.0, 2.4), amp=0.14, flat=sz * 0.2)
    for sgn in (-1, 1):
        for z in (() if K.Q['far'] else (-0.9, 0.6)):
            spar(K, 'body', (sgn * 1.75, -0.04, z), (sgn * 1.68, 0.3, z + 0.0), 0.025, 0.02, 'drift', 240 + int(z * 3) + (sgn > 0), wob=0.2, n=K.R(5, 3), m=5)
            rope_line(K, 'body', [(sgn * 1.12, 0.14 + 0.0, z), (sgn * 1.4, 0.2, z + 0.0), (sgn * 1.68, 0.28, z)], 0.01, 250 + int(z * 3))
    # inside, rafters under the cloth (seen through the open flap)
    if K.Q['detail'] >= 1:
        for sgn in (-1, 1):
            for z in (-0.7, 0.0, 0.7): spar(K, 'body', (sgn * 0.03, ridge_y(z) - 0.04, z), (sgn * 1.05, 0.1, z), 0.025, 0.02, 'drift', 260 + int(z * 4) + (sgn > 0), wob=0.2, n=K.R(7, 3), m=5, w=0.6)
    # driftwood windbreak on the west side: leaning boards, spars laid across
    rb = K.rnd('windbreak'); k = 0
    for i in range(K.R(9, 5)):
        z = -1.0 + 2.0 * i / max(1, K.R(9, 5) - 1); k += 1; nm = 'plank_%02d' % k; ht = rb.uniform(1.0, 1.55)
        K.node(nm, 'root', (-1.55, 0.0, z), movable='take', note='a driftwood board of the windbreak')
        top = np.array([-1.18 - 0.1 * rb.random(), ht, z + rb.uniform(-0.04, 0.04)]); bot = np.array([-1.72 - 0.15 * rb.random(), -0.02, z + rb.uniform(-0.05, 0.05)])
        board(K, nm, (top + bot) / 2, top - bot, (1, 0.3 * rb.uniform(-1, 1), 0.2), np.linalg.norm(top - bot), rb.uniform(0.14, 0.24), 0.04, 'drift', 270 + i, {'bleach': 0.85}, warp=0.02)
    for j, hy in enumerate((0.35, 0.75)):
        spar(K, 'body', (-1.62 + 0.15 * hy, hy, -1.25), (-1.62 + 0.15 * hy, hy, 1.25), 0.04, 0.035, 'drift', 290 + j, bow=0.04, wob=0.4, n=K.R(14, 4))
    # fire ring with charred sticks and ash
    c = np.array([0.1, 0.0, 2.55]); stones_around(K, 'body', c, 0.38, 4 if K.Q['far'] else K.R(10, 6), K.rnd('ring'), (0.07, 0.11))
    K.disc('body', 'char', (c[0], 0.03, c[2]), 0.27, (0, 1, 0), {'seed': 300}, k=K.R(12, 7), w=0.5)
    for i in range(0 if K.Q['far'] else K.R(4, 3)):
        a = i * 1.7; spar(K, 'body', (c[0] - 0.2 * math.cos(a), 0.05, c[2] - 0.2 * math.sin(a)), (c[0] + 0.2 * math.cos(a), 0.09, c[2] + 0.2 * math.sin(a)), 0.025, 0.02, 'tarred', 301 + i, wob=0.2, n=4, m=5)
    cp = helix((-0.75, 0.04, 1.9), (1, 0, 0), (0, 0, 1), 0.17, 3.0, K.R(36, 12)) + np.outer(np.linspace(0, 1, K.R(36, 12)), (0, 0.06, 0))
    if not K.Q['far']: rope_line(K, 'body', cp, 0.016, 310)
    ground_mound(K, 'body', {'grit': 0.5, 'seed': 9}, -0.2, 0.7, 2.3, 2.6, 0.06, 18, 4, 3)
    K.foot([(-2.3, -1.9), (1.8, -1.9), (1.8, 3.1), (-2.3, 3.1)])


piece('lean_to', 'Driftwood lean-to', dict(tide=0.0, moss=0.3, lichen=0.2, salt=0.7, bleach=0.9, chip=0.6, rust=0.5, barnacle=0.0), build_lean_to, 'rung one of the shelter ladder: sail over a ridge pole, stones on the hem, windbreak, fire ring')


def build_drying_rack(K):
    """two driftwood A-frames carrying a ridge pole and two rails, lashed with line, hung with split dried fish; a canvas cover over one end, a gutting plank on two stumps, salt stones and kelp"""
    K.node('body'); X = 1.25
    for sgn in (-1, 1):
        x = sgn * X
        for zs in (-1, 1):
            spar(K, 'body', (x + 0.04 * zs, -0.05, zs * 0.62), (x, 1.96, 0.0), 0.058, 0.045, 'drift', 400 + int(sgn > 0) * 2 + (zs > 0), bow=0.03, wob=0.35)
        lashing(K, 'body', np.array([x, 1.85, 0.0]), (0, 1, 0), 0.07, 410)
        spar(K, 'body', (x - 0.0, 0.62, -0.38), (x, 0.62, 0.38), 0.035, 0.03, 'drift', 420 + (sgn > 0), wob=0.25, n=K.R(6, 3))
    spar(K, 'body', (-X - 0.45, 1.92, 0.0), (X + 0.45, 1.98, 0.0), 0.05, 0.045, 'drift', 430, bow=0.03, wob=0.35, n=K.R(16, 4))
    for z in (-0.3, 0.3): spar(K, 'body', (-X - 0.2, 1.22 + 0.01 * z, z), (X + 0.2, 1.22, z), 0.035, 0.03, 'drift', 440 + int(z * 4), bow=0.025, wob=0.3, n=K.R(16, 4))
    for sgn in (-1, 1):
        for z in (-0.3, 0.3): lashing(K, 'body', np.array([sgn * X, 1.22, z]), (1, 0, 0), 0.05, 450)
    # split fish hung over the ridge and the rails by their tails: flat leaf shapes, pale flesh and dark skin
    rf = K.rnd('fish'); k = 0
    rows = [(1.98, 0.0, 14, 0.52), (1.22, -0.3, 11, 0.42), (1.22, 0.3, 11, 0.42)]
    for yr, zr, cnt, ln in rows:
        for i in range(K.R(cnt, 4)):
            x = -X - 0.1 + (2 * X + 0.2) * (i + 0.5) / K.R(cnt, 4) + rf.uniform(-0.03, 0.03); k += 1; nm = 'fish_%02d' % k; L = ln * rf.uniform(0.8, 1.1); sw = rf.uniform(-0.06, 0.06)
            K.node(nm, 'root', (x, yr, zr), movable='take', note='a split dried fish on the rack')
            for side in (0, 1):
                if K.Q['far'] and side == 0: continue
                nf = K.R(9, 3); P = np.zeros((4, nf, 3))
                for a in range(4):
                    for b in range(nf):
                        t = b / (nf - 1); wd = (0.075 * math.sin(math.pi * min(1, t * 1.15 + 0.05)) ** 0.7 if t < 0.82 else 0.06 * (1 - (t - 0.82) / 0.18) + 0.045 * ((t - 0.82) / 0.18)) * 0.85
                        if t > 0.9: wd = 0.07 * (abs((a / 3) * 2 - 1)) * 0.9 + 0.01
                        P[a, b] = (x + (a / 3 * 2 - 1) * wd + sw * t, yr - 0.025 - t * L, zr + (0.012 if side else -0.012) + 0.012 * math.sin(t * 6 + k) + 0.02 * (a / 3 - 0.5) ** 2 * (1 if side else -1))
                K.grid(nm, 'fish', P, {'side': side, 'seed': 460 + k}, out=(0, 0, 1 if side else -1), w=0.8)
    # canvas cover over the left end of the ridge pole
    nz = K.R(12, 4); nx = K.R(14, 5); P = np.zeros((nz, nx, 3))
    for i in range(nz):
        t = i / (nz - 1) * 2 - 1
        for j in range(nx):
            u = j / (nx - 1); x = -X - 0.4 + 1.1 * u; P[i, j] = (x, 1.99 - 0.62 * abs(t) ** 1.2 + 0.03 * math.sin(u * 11 + t * 4), 0.12 * t * 1.0 * (1.0 + 0.2 * math.sin(u * 7)) + 0.52 * t * abs(t) * 0.8)
    K.node('cover', 'root', (-X, 1.98, 0.0), movable='take', note='a patch of old sailcloth laid over the end of the ridge to keep the rain off')
    cloth_grid(K, 'cover', P, {'base': (0.62, 0.57, 0.44), 'stripe': (0.4, 0.56, (0.30, 0.36, 0.43)), 'panel': 0.45, 'seed': 470}, w=1.0, out=(0, 1, 0))
    # gutting plank on two stumps with a salt tub, stones, kelp
    sx, sz = 2.35, 0.5
    for dx in (-0.45, 0.45): spar(K, 'body', (sx + dx, -0.02, sz), (sx + dx + 0.01, 0.52, sz), 0.15, 0.14, 'dark', 480 + int(dx > 0), wob=0.4, n=K.R(6, 3), m=max(6, K.R(10, 6)))
    K.node('plank_01', 'root', (sx, 0.56, sz), movable='take', note='the gutting plank')
    board(K, 'plank_01', (sx, 0.56, sz), (1, 0, 0), (0, 1, 0), 1.35, 0.3, 0.055, 'drift', 485, {'bleach': 0.9, 'stripe': (0.3, 0.7, (0.55, 0.52, 0.45))}, warp=0.01)
    K.lathe('body', 'wood', (sx - 0.2, 0.585, sz + 0.02), [(0.15, 0.0), (0.16, 0.05), (0.165, 0.2), (0.15, 0.2), (0.15, 0.04)], seg=K.R(14, 8), prm={'tone': 'oak', 'seed': 486}, w=0.7)
    rng = K.rnd('rackstones'); stones_around(K, 'body', (0.0, 0, 0.0), 0.95, K.R(7, 3), rng, (0.06, 0.12))
    for i in range(K.R(4, 2)): kelp_ribbon(K, 'body', [(1.55 + 0.12 * i + 0.3 * t, 0.06 + 0.05 * math.sin(t * 9 + i), -0.9 + 0.45 * t + 0.1 * i) for t in np.linspace(0, 1, K.R(10, 4))], 0.07, 490 + i)
    ground_mound(K, 'body', {'grit': 0.55, 'seed': 10}, 0.5, 0.2, 3.5, 1.6, 0.05, 20, 5, 3)
    K.foot([(-2.0, -1.0), (3.1, -1.0), (3.1, 1.2), (-2.0, 1.2)])


piece('drying_rack', 'Fish-drying rack', dict(tide=0.0, moss=0.2, lichen=0.15, salt=0.9, bleach=0.9, chip=0.6, rust=0.5, barnacle=0.0), build_drying_rack, 'two A-frames, ridge pole and rails, about twenty hung split fish, a canvas cover, a gutting plank')


# ------------------------------------------------------------------------------------------------- thick surfaces: a shell with holes whose edges have thickness
def thick_surface(K, node, Pout, Pin, keep, prm_out, prm_in, mat_out='iron', mat_in='iron', mat_rim='iron', prm_rim=None, floor=0.02, w_in=0.6):
    """Pout and Pin: (nr, nc, 3) grids of the outer and inner skin; keep: (nr-1, nc-1) bool, the cells that exist. The cut edges get a rim between the skins, except where both ends are below the ground."""
    keep = np.asarray(keep, bool)
    K.grid(node, mat_out, Pout, prm_out, out=Pout - Pin, keep=keep)
    K.grid(node, mat_in, Pin, prm_in, out=Pin - Pout, keep=keep, w=w_in)
    nr, nc = Pout.shape[:2]; quads = []
    for i in range(nr - 1):
        for j in range(nc - 1):
            if not keep[i, j]: continue
            for (di, dj, a0, a1) in ((-1, 0, (i, j), (i, j + 1)), (1, 0, (i + 1, j), (i + 1, j + 1)), (0, -1, (i, j), (i + 1, j)), (0, 1, (i, j + 1), (i + 1, j + 1))):
                ni, nj = i + di, j + dj
                if 0 <= ni < nr - 1 and 0 <= nj < nc - 1 and keep[ni, nj]: continue
                if Pout[a0][1] < floor and Pout[a1][1] < floor: continue
                quads.append((Pout[a0], Pout[a1], Pin[a1], Pin[a0]))
    if not quads: return
    q = np.array(quads); nq = len(q); P = q.reshape(-1, 3); Nn = np.repeat(unit(np.cross(q[:, 1] - q[:, 0], q[:, 3] - q[:, 0])), 4, 0)
    F = (np.arange(nq)[:, None] * 4 + np.array([[0, 1, 2, 0, 2, 3]])).reshape(-1, 3)
    UV = np.stack([np.repeat(np.arange(nq), 4) / nq + np.tile([0, 1 / nq, 1 / nq, 0], nq), np.tile([0, 0, 1, 1], nq)], 1)
    pr = dict(prm_rim or prm_out); pr['seed'] = pr.get('seed', 1) + 5
    ln = float(np.mean(np.linalg.norm(q[:, 1] - q[:, 0], axis=1))) * nq; th = float(np.mean(np.linalg.norm(q[:, 3] - q[:, 0], axis=1)))
    ch = Chunk(mat_rim, pr, P, Nn, UV, F, ln, th, 0.5, True); K._add(node, ch)


def hole_mask(P3, thr, seed, scale=2.3, bias=None):
    """cells whose centre noise exceeds thr are holes; P3 (nr-1, nc-1, 3) cell centres"""
    q = TX.fbm3(P3.reshape(-1, 3).astype(np.float32), scale, 3, seed).reshape(P3.shape[:2])
    if bias is not None: q = q + bias
    return q < thr


def cell_centres(P):
    return 0.25 * (P[:-1, :-1] + P[1:, :-1] + P[:-1, 1:] + P[1:, 1:])


# ------------------------------------------------------------------------------------------------- relic hull
def build_relic_hull(K):
    """the rusted hull of an old-world boat, half buried and listing in the shingle: plating rusted through in places and gone from one quarter so the frames show, a bulkhead with a hatch, loose plates leaning on it, a bollard, pipes and a ladder inside, sand drifted into the hull"""
    K.node('body'); K.node('hull'); roll = 15.0; Rr = rot_x(math.radians(roll)) @ rot_z(math.radians(-3.0))
    L = 9.2; X0 = -4.6; bmax = 1.72
    def sec(s):
        s = np.asarray(s, float); b = np.where(s < 0.42, 1.15 + (bmax - 1.15) * (1 - ((0.42 - s) / 0.42) ** 2), bmax * (1 - np.clip((s - 0.42) / 0.58, 0, 1) ** 2.2))
        yd = 2.35 + 1.0 * np.clip((s - 0.5) / 0.5, 0, 1) ** 2.2; dep = 3.25 * (1 - 0.35 * np.clip((s - 0.55) / 0.45, 0, 1) ** 1.6)
        return b, yd, dep
    def hp(s, t, u=1.0):
        """a point of the hull skin: s along (0 stern .. 1 bow), t down the side (0 deck edge .. 1 keel), u = +1 starboard, -1 port; returns (..., 3) in hull coordinates"""
        s, t = np.broadcast_arrays(np.asarray(s, float), np.asarray(t, float)); b, yd, dep = sec(s)
        z = u * b * np.clip(1 - t ** 2.3, 0, 1) ** (1 / 1.5); y = yd - dep * t; x = X0 + L * s + 1.15 * (1 - t) ** 1.4 * s ** 6
        return np.stack([x, y, z], -1)
    probe = Rr @ hp(np.linspace(0, 1, 30), np.ones(30)).T; off = np.array([0.0, -0.95 - probe[1].min() * 0 - (probe[1].min()) * 0.0, 0.0])
    keel = (Rr @ hp(0.4, 1.0).T).T; off = np.array([0.0, -0.9 - keel[1], 0.0])
    def T(p): p = np.asarray(p, float); return (p.reshape(-1, 3) @ Rr.T + off).reshape(p.shape)
    far = K.Q['far']; ns = 6 if far else K.R(46, 8); nt = 3 if far else K.R(16, 5)
    for side, u in (('s', 1.0), ('p', -1.0)):
        ss = np.linspace(0.0, 1.0, ns + 1); tt = np.linspace(0.0, 1.0, nt + 1); S, Tt = np.meshgrid(ss, tt)
        Pout = T(hp(S, Tt, u)); th = 0.014
        # the inner skin: the same surface pulled in along the section normal
        eps = 1e-3; nrm = unit(np.cross(T(hp(S + eps, Tt, u)) - T(hp(S - eps, Tt, u)), T(hp(S, np.clip(Tt + eps, 0, 1), u)) - T(hp(S, np.clip(Tt - eps, 0, 1), u))))
        c0 = np.array([0.0, 0.0, 0.0]); outw = Pout - T(np.stack([X0 + L * S, 1.2 * np.ones_like(S) - 0.0, 0 * S], -1)); nrm = np.where(np.sum(nrm * outw, -1, keepdims=True) < 0, -nrm, nrm)
        Pin = Pout - nrm * th
        cc = cell_centres(Pout); hot = TX.fbm3(cc.reshape(-1, 3).astype(np.float32), 1.35, 3, 31 + int(u)).reshape(cc.shape[:2])
        # decay: holes where the noise is low, more near the deck edge and near the waterline; one whole quarter of the high side is gone
        sc = cell_centres(np.stack([S, Tt, 0 * S], -1)); tcell = sc[..., 1]; scell = sc[..., 0]
        keep = hot > (0.36 + 0.2 * np.exp(-((tcell - 0.0) / 0.1) ** 2) + 0.08 * np.exp(-((tcell - 0.65) / 0.1) ** 2))
        if u < 0: keep &= ~((scell > 0.3) & (scell < 0.66) & (tcell < 0.62 - 0.0 * scell))
        if u < 0: keep &= ~((scell > 0.18) & (scell < 0.3) & (tcell < 0.3))
        keep &= cc[..., 1] > -0.1
        keep &= ~((tcell > 0.93) & False)
        pm = {'paint': (0.34, 0.41, 0.41) if u > 0 else (0.30, 0.37, 0.37), 'rust': 0.85, 'plates': (1.15, 0.62), 'rivets': 0.12, 'holes': 4.5, 'seed': 500 + int(u > 0) * 10}
        thick_surface(K, 'hull', Pout, Pin, keep, pm, dict(pm, paint=None, seed=pm['seed'] + 1, rust=1.0, plates=None, holes=0), prm_rim=dict(rust=1.0, seed=pm['seed'] + 2))
    # transom
    nu_ = 3 if far else K.R(10, 4); tt = np.linspace(0, 1, nt + 1); uu = np.linspace(-1, 1, nu_ + 1); Tt, U = np.meshgrid(tt, uu, indexing='ij'); S0 = np.zeros_like(Tt)
    b, yd, dep = sec(0.0); Pt = T(np.stack([X0 + 0 * Tt - 0.02, yd - dep * Tt, U * b * np.clip(1 - Tt ** 2.3, 0, 1) ** (1 / 1.5)], -1))
    kk = Pt[:-1, :-1, 1] > -0.1; kk = kk & (TX.fbm3(cell_centres(Pt).reshape(-1, 3).astype(np.float32), 2.1, 3, 77).reshape(kk.shape) > 0.4)
    K.grid('hull', 'iron', Pt, {'paint': (0.50, 0.55, 0.52), 'rust': 0.9, 'plates': (1.2, 0.6), 'rivets': 0.12, 'seed': 520}, out=(-1, 0, 0), keep=kk, double=True)
    # the foredeck, plated over, with a hole where its hatch was
    nsd_ = 3 if far else K.R(10, 4); nud = 4 if far else K.R(10, 4); ss = np.linspace(0.72, 1.0, nsd_ + 1); uu = np.linspace(-1, 1, nud + 1); Sd, Ud = np.meshgrid(ss, uu, indexing='ij'); bd, yd_, dp_ = sec(Sd)
    Pd = T(np.stack([X0 + L * Sd + 1.15 * Sd ** 6, yd_ - 0.02, Ud * bd], -1)); cd = cell_centres(Pd)
    kd = (cd[..., 1] > -0.1) & (TX.fbm3(cd.reshape(-1, 3).astype(np.float32), 1.6, 3, 93).reshape(cd.shape[:2]) > 0.40) & (np.linalg.norm(cd[..., [0, 2]] - T(np.array([X0 + L * 0.86, 3, 0.0]))[[0, 2]], axis=-1) > 0.4)
    thick_surface(K, 'hull', Pd, Pd - np.array([0, 0.016, 0.0]), kd, {'paint': (0.30, 0.36, 0.30), 'rust': 0.9, 'plates': (1.1, 0.8), 'rivets': 0.12, 'holes': 5.0, 'seed': 680}, {'rust': 1.0, 'seed': 681, 'paint': None}, prm_rim={'rust': 1.0, 'seed': 682})
    # a rubbing strake along each sheer, flat bar
    for u in (1.0, -1.0):
        pth = T(hp(np.linspace(0.02, 1.0, K.R(14, 4)), 0.0, u)); pth = pth[pth[:, 1] > -0.05]
        if len(pth) > 2: K.tube('hull', 'iron', pth + np.array([0, 0.02, 0]), np.array([[0.06, 0.02]] * len(pth)), m=6, prm={'rust': 0.9, 'seed': 690, 'paint': (0.30, 0.36, 0.36)}, rect=6, ref=(0, 1, 0), w=0.7)
    # frames: flat-bar ribs inside the skin every 0.95 m, showing where the plates are gone
    nfr = 0 if far else K.R(9, 3); rr_ = K.rnd('frames')
    for k in range(nfr):
        s = 0.07 + 0.88 * k / max(1, nfr - 1)
        for u in (1.0, -1.0):
            if u < 0 and 0.3 < s < 0.66 and k % 2 == 0: continue
            tt = np.linspace(0.0, 0.97, K.R(9, 4)); pth = T(hp(s, tt, u)); eps = 1e-3
            nrm = unit(np.cross(T(hp(s + eps, tt, u)) - T(hp(s - eps, tt, u)), T(hp(s, np.clip(tt + 0.01, 0, 1), u)) - T(hp(s, np.clip(tt - 0.01, 0, 1), u))))
            outw = pth - T(np.stack([X0 + L * s + 0 * tt, 1.2 + 0 * tt, 0 * tt], -1)); nrm = np.where(np.sum(nrm * outw, -1, keepdims=True) < 0, -nrm, nrm)
            pth2 = pth - nrm * 0.1; keepm = pth2[:, 1] > -0.05
            if keepm.sum() < 3: continue
            top = int(np.argmax(keepm)); pth2 = pth2[keepm]
            if u < 0 and 0.3 < s < 0.7: pth2 = pth2[: max(2, len(pth2) // 2)]
            K.tube('hull', 'iron', pth2, np.stack([np.full(len(pth2), 0.012), np.full(len(pth2), 0.1)], 1), m=6, prm={'rust': 0.95, 'seed': 540 + k, 'paint': None}, rect=6, ref=(0, 1, 0), caps=(True, True), w=0.6)
    # deck beams across, snapped on the low side
    for k in range(0 if far else K.R(6, 3)):
        s = 0.12 + 0.8 * k / max(1, K.R(6, 3) - 1); b, yd, dep = sec(s); ztop = 0.95 * b
        a = T(np.array([X0 + L * s, yd - 0.05, -ztop])); c = T(np.array([X0 + L * s, yd - 0.05, ztop * (1.0 if k % 2 else 0.5)]))
        K.tube('hull', 'iron', np.array([a, (a + c) / 2, c]), np.array([[0.012, 0.09]] * 3), m=6, prm={'rust': 0.9, 'seed': 560 + k}, rect=6, ref=(0, 1, 0), caps=(True, True), w=0.6)
    # bulkhead with a hatch
    sb = 0.56; b, yd, dep = sec(sb); nbt = 3 if far else K.R(14, 6); nbu = 4 if far else K.R(16, 6); tt = np.linspace(0, 1, nbt + 1); uu = np.linspace(-1, 1, nbu + 1); Tt, U = np.meshgrid(tt, uu, indexing='ij')
    Pb = T(np.stack([X0 + L * sb + 0 * Tt, yd - dep * Tt, U * b * np.clip(1 - Tt ** 2.3, 0, 1) ** (1 / 1.5) * 0.985], -1)); cc = cell_centres(Pb)
    hc = T(np.array([X0 + L * sb, 1.1, -0.25])); hr = 0.46
    kb = (cc[..., 1] > -0.1) & (np.linalg.norm(cc[..., [0, 1, 2]] - hc, axis=-1) > hr) & (TX.fbm3(cc.reshape(-1, 3).astype(np.float32), 2.2, 3, 91).reshape(cc.shape[:2]) > 0.37)
    Pb_in = Pb - np.array([1, 0, 0.0]) * 0.012
    thick_surface(K, 'hull', Pb, Pb + np.array([0.012, 0, 0.0]), kb, {'paint': (0.55, 0.52, 0.42), 'rust': 0.9, 'plates': (1.0, 0.7), 'rivets': 0.1, 'seed': 600}, {'rust': 1.0, 'seed': 601, 'paint': None}, prm_rim={'rust': 1.0, 'seed': 602})
    K.node('hatch', 'root', hc + np.array([0, hr, 0]) * 0.0 + (Rr @ np.array([0, 0.5, 0])), movable='swing', swing=('z', 60), rest=('z', 8), note='round hatch cover on the bulkhead, hinged at the top')
    hn = Rr @ np.array([1.0, 0, 0])
    if not far: K.lathe('hatch', 'iron', hc + (Rr @ np.array([0, 0.5, 0])) * 0.0, [(0.0, 0.0), (hr + 0.04, 0.0), (hr + 0.05, 0.03), (hr + 0.02, 0.05), (0.0, 0.05)], seg=K.R(20, 8), prm={'rust': 0.9, 'paint': (0.52, 0.50, 0.40), 'seed': 610, 'rivets': 0.0}, R=Rr @ rot_z(math.radians(-90.0)), w=0.8)
    # bow details: a hawse pipe, mooring bollards on the foredeck
    for z in (() if far else (-0.5, 0.5)):
        pb = T(np.array([X0 + L * 0.8, 2.35 + 1.0 * 0.5 * 1.0, z])); K.lathe('hull', 'iron', pb, [(0.11, 0.0), (0.085, 0.14), (0.065, 0.24), (0.1, 0.3), (0.13, 0.34), (0.0, 0.34)], seg=K.R(12, 6), prm={'rust': 0.9, 'seed': 620 + int(z > 0)}, R=Rr, w=0.7)
    # a ladder up the inside of the stern, a rusty pipe run along the inner skin
    if K.Q['res'] > 0.3:
        for z in (-0.28, 0.28): K.tube('hull', 'iron', [T(np.array([X0 + 1.1, 0.3, z - 0.9])), T(np.array([X0 + 1.1, 2.3, z - 0.9]))], 0.02, m=5, prm={'rust': 0.95, 'seed': 630}, caps=(True, True), w=0.4)
        for k in range(K.R(8, 3)): K.tube('hull', 'iron', [T(np.array([X0 + 1.1, 0.4 + 0.25 * k, -1.18])), T(np.array([X0 + 1.1, 0.4 + 0.25 * k, -0.62]))], 0.014, m=5, prm={'rust': 0.95, 'seed': 631}, caps=(True, True), w=0.4)
        pp = np.array([T(np.array([X0 + 1.4 + 1.5 * t, 1.55 + 0.04 * math.sin(t * 5), -1.28 + 0.02 * t])) for t in np.linspace(0, 1, K.R(7, 3))]); K.tube('hull', 'iron', pp, 0.045, m=max(5, K.R(8, 5)), prm={'rust': 0.9, 'seed': 632, 'paint': (0.5, 0.52, 0.45)}, caps=(True, True), w=0.6)
    # loose plates leaning on the hull and lying in the sand
    for i, (cx, cz, tilt, yaw) in enumerate(((-3.1, 2.55, 62, 85), (0.2, 2.9, 12, 160), (3.6, -2.4, 70, -75))):
        nm = 'plate_%d' % (i + 1); K.node(nm, 'root', (cx, 0.0, cz), movable='take', note='a loose hull plate, salvage')
        R2 = eul(tilt, yaw, 0) if False else (rot_y(math.radians(yaw)) @ rot_z(math.radians(tilt))); c = np.array([cx, 0.45 * math.sin(math.radians(tilt)) + 0.05, cz]); a_, b_ = 0.6, 0.42
        gu = np.linspace(-a_, a_, K.R(6, 2) + 1); gv = np.linspace(-b_, b_, K.R(4, 2) + 1); Gu, Gv = np.meshgrid(gu, gv)
        Pp = np.stack([Gu, Gv * 0 + 0.0, Gv], -1); Pp[..., 1] += 0.02 * np.sin(Gu * 5) * np.cos(Gv * 4)
        Pp = (Pp @ R2.T) + c; Pp[..., 1] = np.maximum(Pp[..., 1], 0.012); nrm = unit(R2 @ np.array([0, 1, 0.0]))
        kp = np.ones((len(gv) - 1, len(gu) - 1), bool); thick_surface(K, nm, Pp, Pp - nrm * 0.014, kp, {'paint': (0.52, 0.56, 0.54), 'rust': 0.8, 'rivets': 0.1, 'seed': 640 + i}, {'rust': 1.0, 'seed': 645 + i, 'paint': None}, prm_rim={'rust': 1.0, 'seed': 650 + i})
    # drifts of sand and shingle inside and around the hull, a heap of weed on the low side
    ground_mound(K, 'body', {'grit': 0.7, 'seed': 12}, 0.0, 0.0, 5.8, 3.3, 0.35, 22, 6, 3)
    ground_mound(K, 'body', {'grit': 0.2, 'seed': 13}, -0.6, 0.15, 3.6, 1.2, 0.95, 18, 7, 3, edge_y=0.0)
    stones_around(K, 'body', (0, 0, 0), 3.9, 0 if far else K.R(18, 4), K.rnd('hullstones'), (0.07, 0.16))
    for i in range(0 if far else K.R(4, 2)): kelp_ribbon(K, 'body', [(-1.4 + 0.45 * i + 0.3 * t, 0.12 + 0.04 * math.sin(t * 7 + i), 2.0 + 0.5 * t + 0.1 * i) for t in np.linspace(0, 1, K.R(10, 4))], 0.08, 660 + i)
    K.foot([(5.0 * math.cos(a), 3.0 * math.sin(a)) for a in np.linspace(0, 2 * np.pi, 15)[:-1]])


piece('relic_hull', 'Half-buried relic hull', dict(tide=0.75, moss=0.1, lichen=0.1, salt=0.85, bleach=0.5, chip=0.8, rust=0.9, barnacle=0.8), build_relic_hull, 'an old-world boat hull, 9 m long, listing 15 degrees, half buried in shingle')


# ------------------------------------------------------------------------------------------------- lighthouse stump
def build_lighthouse_stump(K):
    """the lower tower of a collapsed lighthouse: a masonry ring broken to a jagged top and breached on the front, stone steps cantilevered inside, a toppled lantern frame and lens in the rubble, fallen blocks"""
    K.node('body'); K.node('tower'); R0, R1, H = 2.15, 1.7, 5.4; wt = 0.62; ch = 0.26
    far = K.Q['far']; nth = 20 if far else K.R(96, 24); ny = 4 if far else K.R(18, 5); th = np.linspace(0, 2 * np.pi, nth + 1)
    def top_h(a):
        # ragged top: high at the back, a deep breach on the front (+z), stepped by block courses
        base = 1.5 + 3.4 * (0.5 + 0.5 * np.cos(a - 4.4)) ** 1.1
        r_ = np.random.default_rng(55).random(64); j = np.interp(a % (2 * np.pi), np.linspace(0, 2 * np.pi, 64), r_)
        h = base + 0.55 * (j - 0.5) * 2
        breach = np.exp(-(((a - np.pi / 2 + np.pi) % (2 * np.pi) - np.pi) / 0.2) ** 4)
        h = h * (1 - breach) + 0.0 * breach
        return np.maximum(np.floor(h / ch) * ch, 0.0)
    hts = top_h(th[:-1]); hts = np.append(hts, hts[0]); hts_s = hts
    def radius(y): return R0 + (R1 - R0) * np.clip(y / H, 0, 1)
    Pout = np.zeros((ny + 1, nth + 1, 3)); Pin = np.zeros_like(Pout)
    for j in range(nth + 1):
        for i in range(ny + 1):
            hh = max(hts[j], 0.0) if hts[j] > 0.01 else 0.0; y = hh * i / ny - 0.06 * (1 - i / ny)
            r1 = radius(y) + 0.012 * math.sin(y * 7 + th[j] * 5); r0 = radius(y) - wt
            Pout[i, j] = (r1 * math.cos(th[j]), y, r1 * math.sin(th[j])); Pin[i, j] = (r0 * math.cos(th[j]), y, r0 * math.sin(th[j]))
    keep = np.ones((ny, nth), bool)
    for j in range(nth): keep[:, j] = (hts[j] > 0.01) and (hts[j + 1] > 0.01)
    # slight irregularity of the outer face so the courses are not machined
    thick_surface(K, 'tower', Pout, Pin, keep, {'axis': (0.0, 0.0), 'radius': 2.0, 'course': ch, 'band': (0.4, 1.7, (0.40, 0.13, 0.10)), 'wash': (0.50, 0.48, 0.43), 'seed': 700}, {'axis': (0.0, 0.0), 'radius': 1.4, 'course': ch, 'wash': (0.33, 0.30, 0.26), 'seed': 701},
                  mat_out='plaster', mat_in='plaster', mat_rim='stone', prm_rim={'tone': 'warm', 'seed': 702}, floor=0.0, w_in=0.55)
    # stone steps cantilevered from the inner wall, climbing round to where the wall ends
    nst = 0 if far else K.R(13, 5)
    for k in range(nst):
        a = 3.2 + k * 0.40; y = 0.28 + k * 0.2; r_in = radius(y) - wt; ang = a % (2 * np.pi); hh = float(np.interp(ang, th, hts))
        if hh < y + 0.3: continue
        ctr = (0.5 * (r_in + r_in - 0.95) * math.cos(a), y, 0.5 * (r_in + r_in - 0.95) * math.sin(a)); R = rot_y(-a)
        K.box('tower', 'stone', ctr, (0.97, 0.12, 0.62), R, {'tone': 'warm', 'seed': 710 + k}, uax=0, w=0.6)
    # collapsed ground floor rubble and fallen blocks (the breach faces +z)
    rng = K.rnd('rubble'); tones = ['warm', 'pale', 'grey', 'warm']
    for i in range(K.R(30, 6)):
        a = math.pi / 2 + rng.normal(0, 0.55); rr = rng.uniform(1.0, 4.2) if i > 4 else rng.uniform(0.2, 1.4); sz = rng.uniform(0.18, 0.4) * (1.3 if i < 6 else 1.0)
        stone_at(K, 'body', (rr * math.cos(a), sz * 0.45, rr * math.sin(a)), (sz * 1.3, sz * 0.8, sz), rng, tone_cycle(rng, tones), nu=K.R(10, 5), nv=max(3, K.R(5, 3)), e=(4.5, 3.8), amp=0.12, flat=sz * 0.35, tilt=(float(rng.uniform(-14, 14)), float(rng.uniform(-14, 14))))
    # the toppled lantern: two iron rings, mullions between them, a green copper roof cone, lying on its side
    lc = np.array([3.2, 0.62, 2.9]); Rl = rot_y(math.radians(-40)) @ rot_z(math.radians(78))
    K.node('lantern', 'root', lc, movable='take', note='the toppled lantern frame, salvage')
    def LP(p): return lc + Rl @ np.asarray(p, float)
    rad = 0.82; hl = 1.2
    for yy in (() if far else (0.0, hl)):
        ring = [LP((rad * math.cos(a), yy, rad * math.sin(a))) for a in np.linspace(0, 2 * np.pi, K.R(20, 8) + 1)]
        K.tube('lantern', 'iron', np.array(ring), 0.03, m=6, prm={'rust': 0.9, 'seed': 720, 'paint': (0.22, 0.34, 0.30)}, caps=(False, False), w=0.6)
    for k in range(0 if far else K.R(12, 5)):
        a = 2 * np.pi * k / K.R(12, 5); K.tube('lantern', 'iron', [LP((rad * math.cos(a), 0.0, rad * math.sin(a))), LP((rad * math.cos(a), hl, rad * math.sin(a)))], 0.016, m=5, prm={'rust': 0.9, 'seed': 721, 'paint': (0.30, 0.46, 0.40)}, caps=(True, True), w=0.5)
    K.lathe('lantern', 'iron', lc, [(rad + 0.1, hl), (rad * 0.8, hl + 0.28), (rad * 0.28, hl + 0.55), (0.06, hl + 0.7), (0.0, hl + 0.78)], seg=K.R(20, 8), prm={'rust': 0.55, 'paint': (0.20, 0.34, 0.30), 'seed': 722, 'galv': False}, R=Rl, w=0.9)
    K.node('lens', 'root', lc + Rl @ np.array([0, 0.5, 0]), movable='take', note='the lamp lens, a stack of glass rings')
    for k in range(0 if far else K.R(6, 3)):
        yy = 0.15 + 0.15 * k; K.lathe('lens', 'glass', lc, [(0.5 - 0.03 * abs(k - 2.5), yy), (0.62 - 0.05 * abs(k - 2.5), yy + 0.04), (0.5 - 0.03 * abs(k - 2.5), yy + 0.12)], seg=K.R(18, 8), prm={'seed': 730 + k}, R=Rl, w=0.6)
    ground_mound(K, 'body', {'grit': 0.75, 'seed': 14}, 0.6, 1.2, 4.8, 4.0, 0.3, 24, 8, 3)
    K.foot([(3.1 * math.cos(a), 3.1 * math.sin(a)) for a in np.linspace(0, 2 * np.pi, 15)[:-1]])


piece('lighthouse_stump', 'Collapsed lighthouse stump', dict(tide=0.0, moss=0.4, lichen=0.55, salt=0.7, bleach=0.5, chip=0.75, rust=0.8, barnacle=0.0), build_lighthouse_stump, 'a broken masonry tower base, 4.3 m across and up to 5 m high at the back')


# ------------------------------------------------------------------------------------------------- crate stack
def build_crate_stack(K):
    """washed-up shipping crates: slatted wooden crates with faded paint, a split one with loose slats, two grey plastic crates, a rusty drum half sunk in the sand, a rope, weed and a drift of shingle"""
    K.node('body'); sd = [800]
    def nsd(): sd[0] += 1; return sd[0]
    def slatted(name, c, size, yaw, roll=0.0, pitch=0.0, paint=None, stripe=None, broken=False, tone='drift'):
        K.node(name, 'root', c, movable='take', note='a shipping crate, can be opened, moved or stacked')
        L, H, Wd = size; R = eul(roll, yaw, pitch); c = np.asarray(c, float); pr = {'tone': tone, 'paint': paint, 'stripe': stripe}
        if K.Q['far']:
            K.box(name, 'wood', c, (L, H, Wd), R, dict(pr, seed=nsd()), uax=0); return
        def lb(p, sz, uax=0, seed=None, tn=None): K.box(name, 'wood', c + R @ np.asarray(p, float), sz, R, dict(pr, seed=seed or nsd(), **({'tone': tn} if tn else {})), uax=uax)
        def lboard(p, d, nrm, l, wd, t, tn=None):
            board(K, name, c + R @ np.asarray(p, float), R @ np.asarray(d, float), R @ np.asarray(nrm, float), l, wd, t, tn or tone, nsd(), dict(paint=paint, stripe=stripe))
        pw = 0.055
        for sx in (-1, 1):
            for sz_ in (-1, 1): lb((sx * (L / 2 - pw / 2), 0, sz_ * (Wd / 2 - pw / 2)), (pw, H, pw), uax=1)
        K.box(name, 'wood', c + R @ np.array([0, 0.0, 0]), (L - 0.08, H - 0.1, Wd - 0.08), R, {'tone': 'tarred', 'seed': nsd()}, uax=0, w=0.15)
        nsl = 4; sh = (H - 0.06) / nsl
        for sz_ in (-1, 1):
            for i in range(nsl):
                if broken and sz_ > 0 and i in (1, 2): continue
                lboard((0, -H / 2 + 0.03 + sh * (i + 0.5), sz_ * (Wd / 2 - 0.012)), (1, 0, 0), (0, 0, 1), L - 0.01, sh - 0.025, 0.024)
        for sx in (-1, 1):
            for i in range(nsl):
                lboard((sx * (L / 2 - 0.012), -H / 2 + 0.03 + sh * (i + 0.5), 0), (0, 0, 1), (1, 0, 0), Wd - 0.01, sh - 0.025, 0.024)
        nt = 5; tw = (Wd - 0.06) / nt
        for i in range(nt):
            if broken and i in (1, 3): continue
            lboard((0, H / 2 - 0.012, -Wd / 2 + 0.03 + tw * (i + 0.5)), (1, 0, 0), (0, 1, 0), L - 0.01, tw - 0.02, 0.024)
            lboard((0, -H / 2 + 0.012, -Wd / 2 + 0.03 + tw * (i + 0.5)), (1, 0, 0), (0, 1, 0), L - 0.01, tw - 0.02, 0.024)
        for sx in (-0.3, 0.3): lboard((sx * L, H / 2 + 0.002, 0), (0, 0, 1), (0, 1, 0), Wd + 0.02, 0.07, 0.02, 'dark')
    slatted('crate_1', (-0.62, 0.28, 0.0), (1.0, 0.56, 0.62), 4, paint=(0.34, 0.42, 0.36), stripe=(0.35, 0.55, (0.62, 0.55, 0.38)))
    slatted('crate_2', (0.55, 0.25, 0.1), (0.9, 0.5, 0.58), -14, 3, paint=(0.46, 0.30, 0.24))
    slatted('crate_3', (-0.52, 0.84, 0.02), (0.88, 0.52, 0.56), 26, paint=(0.58, 0.55, 0.46), stripe=(0.4, 0.6, (0.30, 0.38, 0.46)))
    slatted('crate_4', (0.58, 0.72, -0.02), (0.78, 0.44, 0.5), -3, 9, 4, broken=True)
    slatted('crate_5', (-0.5, 1.28, 0.0), (0.6, 0.38, 0.44), 52, paint=(0.34, 0.42, 0.36))
    # plastic crates: grey, faded, with hand holes; one stacked, one on its side in the sand
    for nm, c, yaw, roll in (('crate_6', (1.35, 0.15, 0.82), 20, 0.0), ('crate_7', (1.05, 0.46, 0.7), 8, 0.0)):
        K.node(nm, 'root', c, movable='take', note='a faded plastic crate')
        R = eul(roll, yaw, 0); cc = np.asarray(c, float); sz = (0.6, 0.3, 0.4)
        K.box(nm, 'iron', cc, sz, R, {'galv': False, 'paint': (0.34, 0.42, 0.50), 'rust': 0.1, 'seed': nsd()}, uax=0, w=0.8)
        for sx in (() if K.Q['far'] else (-0.18, 0.18)): K.box(nm, 'iron', cc + R @ np.array([sx, 0.0, 0.205]), (0.1, 0.05, 0.008), R, {'galv': False, 'paint': (0.2, 0.22, 0.24), 'rust': 0.0, 'seed': nsd()}, uax=0, w=0.3)
    # loose slats
    for i, (x, z, yaw) in enumerate(((0.1, 1.0, 30), (-1.15, 0.9, -40), (1.0, -0.8, 70), (-0.2, -1.05, 12))):
        nm = 'plank_%02d' % (i + 1); K.node(nm, 'root', (x, 0.03, z), movable='take', note='a slat from a broken crate')
        board(K, nm, (x, 0.03, z), (math.cos(math.radians(yaw)), 0.0, math.sin(math.radians(yaw))), (0, 1, 0), 0.85, 0.09, 0.022, 'drift', nsd(), {'bleach': 0.8})
    # the drum, rusted, half sunk
    dc = np.array([-1.25, 0.28, -0.78]); Rd = rot_z(math.radians(80)) @ rot_y(math.radians(25)); K.node('drum', 'root', dc, movable='take', note='a rusty steel drum')
    K.lathe('drum', 'iron', dc, [(0.0, -0.44), (0.29, -0.44), (0.30, -0.40), (0.285, -0.38), (0.30, -0.3), (0.29, -0.1), (0.30, 0.0), (0.29, 0.1), (0.30, 0.3), (0.285, 0.38), (0.30, 0.40), (0.29, 0.44), (0.0, 0.44)], seg=K.R(18, 8),
            prm={'rust': 0.85, 'paint': (0.30, 0.34, 0.40), 'seed': nsd(), 'rivets': 0.0}, R=Rd, w=1.0)
    for yy in (() if K.Q['far'] else (-0.2, 0.2)): K.lathe('drum', 'iron', dc, [(0.287, yy - 0.02), (0.31, yy - 0.015), (0.31, yy + 0.015), (0.287, yy + 0.02)], seg=K.R(18, 8), prm={'rust': 0.9, 'seed': nsd()}, R=Rd, w=0.5)
    # rope and weed
    cp = helix((1.1, 0.03, -0.6), (1, 0, 0), (0, 0, 1), 0.18, 3.0, K.R(36, 12)) + np.outer(np.linspace(0, 1, K.R(36, 12)), (0, 0.06, 0))
    if not K.Q['far']: rope_line(K, 'body', cp, 0.016, 3)
    if not K.Q['far']: rope_line(K, 'body', [(0.45, 0.62, 0.62), (0.75, 0.4, 0.95), (1.05, 0.12, 1.1), (1.4, 0.03, 1.2)], 0.014, 4)
    for i in range(0 if K.Q['far'] else K.R(5, 2)): kelp_ribbon(K, 'body', [(-0.9 + 0.35 * i + 0.4 * t, 0.62 * (1 - t) ** 1.2 + 0.04 + 0.03 * math.sin(t * 8 + i), 0.34 + 0.65 * t + 0.1 * i) for t in np.linspace(0, 1, K.R(10, 4))], 0.08, 840 + i)
    ground_mound(K, 'body', {'grit': 0.85, 'seed': 15}, 0.0, 0.0, 2.5, 1.9, 0.14, 20, 9, 3)
    stones_around(K, 'body', (0.0, 0, 0.0), 1.85, 0 if K.Q['far'] else K.R(12, 4), K.rnd('cstones'), (0.06, 0.13))
    K.foot([(-1.9, -1.35), (1.9, -1.35), (2.0, 1.45), (-1.9, 1.45)])


piece('crate_stack', 'Washed-up crate stack', dict(tide=0.28, moss=0.15, lichen=0.0, salt=0.9, bleach=0.85, chip=0.7, rust=0.8, barnacle=0.7), build_crate_stack, 'five wooden crates, two plastic crates and a drum in a drift of shingle, about 1.4 m high')


# ------------------------------------------------------------------------------------------------- build, bake and the GLB writer
def build(piece_name, lod):
    K = Kit(piece_name, lod); PIECE_DEFS[piece_name]['build'](K)
    # the footprint: a flat fan at y = 0.003
    fp = K.footprint
    if fp:
        K.node('footprint', 'root', (0, 0, 0), role='footprint', polygon=[[round(x, 3), round(z, 3)] for x, z in fp])
    return K


def to_gltf_xyz(a): return np.asarray(a, np.float32)


def weld(P, N, UV, F, tol=1e-5):
    q = [np.round(P / tol).astype(np.int64), np.round(N * 90).astype(np.int64), np.round(UV * 8192).astype(np.int64)]
    key = np.concatenate(q, axis=1); _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel(); order = np.argsort(first); remap = np.empty(len(first), int); remap[order] = np.arange(len(first)); idx = remap[inv]; keep = first[order]
    Fn = idx[F]; good = (Fn[:, 0] != Fn[:, 1]) & (Fn[:, 1] != Fn[:, 2]) & (Fn[:, 0] != Fn[:, 2])
    return P[keep], N[keep], UV[keep], Fn[good]


def write_glb(path, K, seed=11):
    spec = PIECE_DEFS[K.piece]; lod = K.lod; Q = K.Q; W = spec['wear']
    chunks = [c for n in K.order for c in K.nodes[n].chunks if n != 'footprint']
    # the atlas: all charts of the piece
    def ao_fn(P, N):
        return (0.72 + 0.28 * TX.sst(0.0, 0.5, P[:, 1])).astype(np.float32)
    maps, dens = TX.bake(chunks, Q['atlas'], W, Q['dens'], pad=Q['pad'], ao_fn=ao_fn)
    jc, jn, jo = TX.encode(maps, dens, Q['ndiv'], Q['q'], colour_only=Q['far'])
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
    images = []; textures = []; mats = []; mat_index = {}
    ids = []
    for kind, data in (('color', jc), ('normal', jn), ('orm', jo)):
        if data is None: continue
        vi = add_view(data); images.append({'bufferView': vi, 'mimeType': 'image/jpeg', 'name': '%s_%s_%s' % (K.piece, lod, kind)}); textures.append({'sampler': 0, 'source': len(images) - 1}); ids.append(len(textures) - 1)
    for nm, ds in (('Kit', False), ('KitTwo', True)):
        if Q['far']:
            m = {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 0.0, 'roughnessFactor': 0.92}, 'doubleSided': ds, 'extras': {'maps': 'baseColor only (far level)'}}
        else:
            m = {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 1.0, 'roughnessFactor': 1.0, 'metallicRoughnessTexture': {'index': ids[2]}},
                 'normalTexture': {'index': ids[1], 'scale': 1.0}, 'occlusionTexture': {'index': ids[2], 'strength': 1.0}, 'doubleSided': ds, 'extras': {'maps': 'baseColor sRGB jpeg, normal jpeg (OpenGL), occlusion R / roughness G / metal B packed jpeg'}}
        mat_index[nm] = len(mats); mats.append(m)
    mat_index['Footprint'] = len(mats)
    mats.append({'name': 'Footprint', 'pbrMetallicRoughness': {'baseColorFactor': [0.2, 0.9, 0.3, 0.0], 'metallicFactor': 0.0, 'roughnessFactor': 1.0}, 'alphaMode': 'BLEND', 'doubleSided': True, 'extras': {'note': 'invisible placement polygon at y = 0.003; the page may show it as a ghost'}})
    gnodes = []; name_idx = {}; meshes = []
    for name in K.order: name_idx[name] = len(gnodes); gnodes.append({'name': name})
    stats = {'triangles': 0, 'vertices': 0, 'per_node': {}}
    for name in K.order:
        nd = K.nodes[name]; gn = gnodes[name_idx[name]]; par = K.nodes.get(nd.parent) if nd.parent else None
        rel = nd.pivot - (par.pivot if par else np.zeros(3)); gn['translation'] = [float(v) for v in rel]
        rr = nd.extras.get('rest'); gn['rotation'] = list(quat_axis(rr[0], rr[1])) if rr else [0.0, 0.0, 0.0, 1.0]
        ex = {k: v for k, v in nd.extras.items()}
        if nd.parent: gnodes[name_idx[nd.parent]].setdefault('children', []).append(name_idx[name])
        gn['extras'] = ex
        if name == 'footprint':
            fp = K.footprint; k = len(fp); Pf = np.array([[x, 0.003, z] for x, z in fp] + [[sum(p[0] for p in fp) / k, 0.003, sum(p[1] for p in fp) / k]], np.float32)
            Ff = np.array([[i, (i + 1) % k, k] for i in range(k)], np.uint16)
            if np.sum(np.cross(Pf[Ff[0, 1]] - Pf[Ff[0, 0]], Pf[Ff[0, 2]] - Pf[Ff[0, 0]])[1]) < 0: Ff = Ff[:, [0, 2, 1]]
            at = {'POSITION': add_acc(Pf, 5126, 3, 34962, minmax=True)}
            n8 = np.zeros((len(Pf), 4), np.int8); n8[:, 1] = 127; at['NORMAL'] = add_acc(n8, 5120, 4, 34962, normalized=True, stride=4); accs[at['NORMAL']]['type'] = 'VEC3'
            ia = add_acc(Ff.reshape(-1), 5123, 1, 34963); meshes.append({'name': 'footprint_mesh', 'primitives': [{'attributes': at, 'indices': ia, 'material': mat_index['Footprint'], 'mode': 4}]}); gn['mesh'] = len(meshes) - 1
            stats['triangles'] += len(Ff); stats['per_node'][name] = len(Ff); stats['vertices'] += len(Pf); continue
        if not nd.chunks: continue
        prims = []; tri_n = 0; bymat = {}
        for ch in nd.chunks: bymat.setdefault('KitTwo' if ch.double else 'Kit', []).append(ch)
        for mat, items in bymat.items():
            Pl = []; Nl = []; Ul = []; Fl = []; off = 0
            for ch in items:
                Pl.append(ch.P - nd.pivot); Nl.append(ch.N); Ul.append(ch.UVatlas); Fl.append(ch.F + off); off += len(ch.P)
            P = np.concatenate(Pl); N = unit(np.concatenate(Nl)); UV = np.concatenate(Ul); F = np.concatenate(Fl)
            P, N, UV, F = weld(P, N, UV, F)
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
    # open clips for the swinging nodes
    anims = []
    swings = [(n, K.nodes[n].extras['swing']) for n in K.order if 'swing' in K.nodes[n].extras]
    if swings:
        samp = []; chans = []
        for n, (axis, deg) in swings:
            times = add_acc(np.array([0.0, 1.5], np.float32), 5126, 1, None, minmax=True); rr = K.nodes[n].extras.get('rest'); q0 = quat_axis(rr[0], rr[1]) if rr else (0.0, 0.0, 0.0, 1.0); q1 = quat_axis(axis, deg)
            out = add_acc(np.array([q0, q1], np.float32), 5126, 4, None); samp.append({'input': times, 'output': out, 'interpolation': 'LINEAR'}); chans.append({'sampler': len(samp) - 1, 'target': {'node': name_idx[n], 'path': 'rotation'}})
        anims.append({'name': 'open', 'samplers': samp, 'channels': chans, 'extras': {'note': 'swings every node that has extras.swing to its open angle in 1.5 s; play backwards to close'}})
    allP = np.concatenate([c.P for c in chunks]) if chunks else np.zeros((1, 3))
    mov = {n: {'how': K.nodes[n].extras['movable'], 'pivot_m': [round(float(v), 3) for v in K.nodes[n].pivot], 'swing': K.nodes[n].extras.get('swing')} for n in K.order if 'movable' in K.nodes[n].extras}
    scene_ex = {'piece': K.piece, 'title': spec['title'], 'lod': lod, 'triangles': stats['triangles'], 'frame': 'glTF: +Y up, metres, y = 0 is the ground, centred on x = z = 0, front faces +Z',
                'bbox_min': [round(float(v), 3) for v in allP.min(0)], 'bbox_max': [round(float(v), 3) for v in allP.max(0)], 'footprint_polygon_xz': [[round(x, 3), round(z, 3)] for x, z in K.footprint],
                'movable': mov, 'wear': W, 'texel_density_per_m': round(float(dens), 1), 'atlas_px': Q['atlas'], 'note': spec['note'], 'node_tree': {n: K.nodes[n].parent for n in K.order}}
    doc = {'asset': {'version': '2.0', 'generator': 'kit_model.py (living-islands)'}, 'scene': 0, 'scenes': [{'name': K.piece, 'nodes': [name_idx['root']], 'extras': scene_ex}], 'nodes': gnodes, 'meshes': meshes, 'materials': mats,
           'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(binbuf)}], 'images': images, 'textures': textures, 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]}
    if anims: doc['animations'] = anims
    js = json.dumps(doc, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4); bb = bytes(binbuf) + b'\x00' * ((4 - len(binbuf) % 4) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\x00') + bb
    with open(path, 'wb') as f: f.write(data)
    stats['bytes'] = len(data); stats['texel_density_per_m'] = round(float(dens), 1); stats['image_bytes'] = [len(x) for x in (jc, jn, jo) if x is not None]
    return stats


def out_name(piece_name, lod): return 'kit_%s_%s.glb' % (piece_name, lod)


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Kit piece GLB files.')
    ap.add_argument('--out', required=True); ap.add_argument('--piece', default='all', choices=['all'] + list(PIECES)); ap.add_argument('--lod', default='all', choices=['all'] + list(LODS))
    a = ap.parse_args(argv); a.pieces = list(PIECES) if a.piece == 'all' else [a.piece]; a.lods = list(LODS) if a.lod == 'all' else [a.lod]
    return a


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True); rp = os.path.join(a.out, 'kit_report.json'); rep = {}
    if os.path.exists(rp):
        try: rep = json.load(open(rp))
        except Exception: rep = {}
    for p in a.pieces:
        if p not in PIECE_DEFS: continue
        for lod in a.lods:
            fn = os.path.join(a.out, out_name(p, lod)); st = write_glb(fn, build(p, lod))
            rep[os.path.basename(fn)] = st; print('GLB', fn, 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1), 'images', st['image_bytes'], flush=True)
    with open(rp, 'w') as f: json.dump(dict(sorted(rep.items())), f, indent=1)


if __name__ == '__main__':
    main()
