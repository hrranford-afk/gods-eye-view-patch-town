"""BOAT KIT: four original wooden boats of a cool Atlantic island as GLB files (pure python and numpy, no Blender needed). See BOAT_MODEL.md.
  dinghy  (4.0 m lapstrake rowing dinghy)   sailer (6.0 m clinker sailing boat, gaff sail)   work (7.0 m half-decked work boat with cuddy, crates, net, davit)   wreck (the dinghy, beached and broken)
Run:  python3 boat_model.py --out DIR [--boat dinghy|sailer|work|wreck|all] [--lod hero|live|far|all] [--pose rest|sailing|rowing|beached]
Frame while building: +X forward (bow), +Y port, +Z up, metres, z = 0 is the design waterline, the keel is below it. The GLB is written in the glTF frame (Y up, +Z forward, +X left): (x, y, z) -> (y, z, x).
Every moving part is a named node with its pivot at the joint (oar_l, oar_r, sail, boom, tiller, rudder, rudder_pin, mast, davit, hull ...); `hullmask` is a depth-only lid that closes the opening so the sea plane never shows inside;
`waterline` is a flat band at z = 0 (foam or contact ring); seat_1 .. seat_n are empty markers at the thwarts. Poses live in the scene extras and as one-keyframe animation clips.
Original designs: no maker names, no lettering. Deterministic (seeded)."""
import sys, os, math, json, struct, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import boat_tex as BT

LODS = ('hero', 'live', 'far')
BOATS = ('dinghy', 'sailer', 'work', 'wreck')
POSES = ('rest', 'sailing', 'rowing', 'beached')
BUDGET = {'hero': (15000, 25000), 'live': (2600, 5800), 'far': (480, 1000)}
SIZE_KB = {'hero': 1500, 'live': 400, 'far': 100}
TOTAL_KB = 4096
SEED = 11

# per level of detail: stations along the hull, rows across a strake, sides of round tubes, and which details exist
QL = {
    'hero': dict(nu=70, rows=2, seg=10, ribs=1.0, detail=3, tex=1.0, rope_pts=22, rail_nu=40, keel_nu=30),
    'live': dict(nu=16, rows=1, seg=6, ribs=0.3, detail=1, tex=0.5, rope_pts=0, rail_nu=9, keel_nu=9),
    'far': dict(nu=7, rows=1, seg=4, ribs=0.0, detail=0, tex=0.0, rope_pts=0, rail_nu=6, keel_nu=5),
}

# one entry per boat: hull parameters, strakes, palette, thwart stations (fraction of length), crew seats
SPECS = {
    'dinghy': dict(title='Lapstrake rowing dinghy', L=4.0, B=1.45, fb=0.34, draft=0.15, sr_b=0.13, sr_s=0.06, kr_b=0.14, kr_s=0.03, R=0.26, Tr=0.11, tw=0.50, ns=5, e0=0.40, e1=0.55, flare=0.16, pb=2.3, qb=1.25, ps=2.2,
                   thw=(0.17, 0.45, 0.76), pal='dinghy', keel=(0.05, 0.05), wearf=1.0),
    'sailer': dict(title='Clinker sailing boat', L=6.0, B=1.95, fb=0.50, draft=0.30, sr_b=0.22, sr_s=0.09, kr_b=0.27, kr_s=0.05, R=0.36, Tr=0.15, tw=0.40, ns=6, e0=0.42, e1=0.6, flare=0.14, pb=2.4, qb=1.3, ps=2.3,
                   thw=(0.13, 0.33, 0.52, 0.76), pal='sailer', keel=(0.07, 0.07), wearf=1.0, rib_gap=0.31, floor_h=0.23),
    'work': dict(title='Half-decked work boat', L=7.0, B=2.45, fb=0.62, draft=0.38, sr_b=0.26, sr_s=0.08, kr_b=0.34, kr_s=0.06, R=0.45, Tr=0.20, tw=0.62, ns=6, e0=0.44, e1=0.62, flare=0.18, pb=2.2, qb=1.2, ps=2.0,
                 thw=(0.30, 0.50), pal='work', keel=(0.08, 0.08), wearf=1.0, rib_gap=0.34, floor_h=0.27),
    'wreck': dict(title='Beached wreck of the dinghy', L=4.0, B=1.45, fb=0.34, draft=0.15, sr_b=0.13, sr_s=0.06, kr_b=0.14, kr_s=0.03, R=0.26, Tr=0.11, tw=0.50, ns=5, e0=0.40, e1=0.55, flare=0.16, pb=2.3, qb=1.25, ps=2.2,
                  thw=(0.17, 0.45, 0.76), pal='wreck', keel=(0.05, 0.05), wearf=1.0),
}
# crew seats: thwart index and a sideways offset (m) of the marker; the first seat is aft
TH_LAP, TH_PLANK = 0.014, 0.013


# ------------------------------------------------------------------------------------------------- small maths
def unit(v):
    v = np.asarray(v, float); n = np.linalg.norm(v, axis=-1, keepdims=True); return v / np.maximum(n, 1e-12)

def sst(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def rot_x(a): c, s = math.cos(a), math.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def rot_y(a): c, s = math.cos(a), math.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rot_z(a): c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

def frame_from(tdir, ref=(0, 0, 1)):
    """right-handed frame (ex, ey, ez) with ex along tdir, ez as close to ref as possible"""
    ex = unit(tdir); r = np.array(ref, float)
    ey = np.cross(r, ex)
    if np.linalg.norm(ey) < 1e-6: ey = np.cross(np.array((0, 1, 0.0)), ex)
    ey = unit(ey); ez = np.cross(ex, ey); return np.stack([ex, ey, ez], 0)

def quat_axis(axis, deg):
    a = math.radians(deg) / 2.0; s = math.sin(a); v = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[axis]; return (v[0] * s, v[1] * s, v[2] * s, math.cos(a))

def quat_mul(p, q):
    px, py, pz, pw = p; qx, qy, qz, qw = q
    return (pw * qx + px * qw + py * qz - pz * qy, pw * qy - px * qz + py * qw + pz * qx, pw * qz + px * qy - py * qx + pz * qw, pw * qw - px * qx - py * qy - pz * qz)

def rot_seq(seq):
    q = (0.0, 0.0, 0.0, 1.0)
    for ax, d in seq: q = quat_mul(q, quat_axis(ax, d))
    return q


# ------------------------------------------------------------------------------------------------- geometry containers
class Part:
    """geometry of one node in build-frame world coordinates (rest pose). chunks: material, positions, normals, uv, triangles, colours (far level) """
    def __init__(self): self.ch = []

    def add(self, mat, P, N, UV, F, col=None):
        P = np.asarray(P, float).reshape(-1, 3); N = np.asarray(N, float).reshape(-1, 3); UV = np.asarray(UV, float).reshape(-1, 2); F = np.asarray(F, int).reshape(-1, 3)
        if len(F):
            g = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]); bad = np.sum(g * N[F].mean(1), 1) < 0
            F = np.where(bad[:, None], F[:, [0, 2, 1]], F)                  # every triangle winds the way its vertex normals face
            self.ch.append((mat, P, N, UV, F, col))

    def tris(self): return sum(len(c[4]) for c in self.ch)


def grid_faces(nr, nc):
    i = np.arange(nr - 1)[:, None] * nc + np.arange(nc - 1)[None, :]
    a = i.ravel(); b = a + 1; c = a + nc + 1; d = a + nc
    return np.stack([np.stack([a, b, c], 1), np.stack([a, c, d], 1)], 1).reshape(-1, 3)


def grid_normals(P):
    """smooth vertex normals of a (nr, nc, 3) grid, direction du x dv (du along columns, dv along rows)"""
    du = np.gradient(P, axis=1) if P.shape[1] > 1 else np.zeros_like(P); dv = np.gradient(P, axis=0) if P.shape[0] > 1 else np.zeros_like(P)
    return unit(np.cross(du, dv))


def add_grid(part, mat, P, UV, hint=None, flip=False, col=None, smooth=True):
    """a (nr, nc) grid of points as a surface; hint = (nr, nc, 3) vector field that the normals should face (flips the whole grid when most normals face away)"""
    P = np.asarray(P, float); nr, nc = P.shape[:2]; N = grid_normals(P); F = grid_faces(nr, nc)
    sgn = 1.0
    if hint is not None:
        if np.mean(np.sum(N * np.asarray(hint), -1)) < 0: sgn = -1.0
    elif flip: sgn = -1.0
    if sgn < 0: N = -N; F = F[:, [0, 2, 1]]
    part.add(mat, P.reshape(-1, 3), N.reshape(-1, 3), np.asarray(UV, float).reshape(-1, 2), F, None if col is None else np.broadcast_to(col, P.shape).reshape(-1, 3))


def add_quads(part, mat, quads, uv, col=None):
    """flat quads: quads (n,4,3); uv (n,4,2). The normal follows the winding a,b,c,d."""
    q = np.asarray(quads, float); n = len(q)
    if n == 0: return
    N = unit(np.cross(q[:, 1] - q[:, 0], q[:, 2] - q[:, 0])); Nn = np.repeat(N[:, None], 4, 1)
    F = (np.arange(n)[:, None] * 4 + np.array([[0, 1, 2, 0, 2, 3]])).reshape(-1, 3)
    part.add(mat, q.reshape(-1, 3), Nn.reshape(-1, 3), np.asarray(uv, float).reshape(-1, 2), F, None if col is None else np.repeat(np.broadcast_to(col, (n, 3)), 4, 0))


def add_box(part, mat, centre, size, R=None, sw='thwart', uax=0, col=None, skip=()):
    """a box with a swatch mapped on every face: local u along the box axis `uax`, v along another axis"""
    R = np.eye(3) if R is None else np.asarray(R, float); c = np.asarray(centre, float); h = np.asarray(size, float) / 2.0
    ax = [R[:, 0], R[:, 1], R[:, 2]]; quads = []; uvs = []
    ob = [i for i in range(3) if i != uax]; vax = ob[0]
    for axis in range(3):
        for sgn in (-1, 1):
            if (axis, sgn) in skip: continue
            o = [i for i in range(3) if i != axis]; i0, i1 = o
            n = ax[axis] * sgn
            p0 = c + n * h[axis] - ax[i0] * h[i0] - ax[i1] * h[i1]; p1 = c + n * h[axis] + ax[i0] * h[i0] - ax[i1] * h[i1]
            p2 = c + n * h[axis] + ax[i0] * h[i0] + ax[i1] * h[i1]; p3 = c + n * h[axis] - ax[i0] * h[i0] + ax[i1] * h[i1]
            q = np.array([p0, p1, p2, p3])
            if np.dot(np.cross(q[1] - q[0], q[2] - q[0]), n) < 0: q = q[::-1]; flipq = True
            else: flipq = False
            # uv: each corner by its (i0, i1) coordinates; the u axis picks which of them runs along the tile
            cs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
            if flipq: cs = cs[::-1]
            uv = []
            for a0, a1 in cs:
                loc = {i0: a0, i1: a1}
                u = (loc[uax] + 1) / 2 if uax in loc else 0.5 + 0.0
                v = (loc[vax] + 1) / 2 if vax in loc else (loc[[i for i in loc if i != uax][0]] + 1) / 2
                if uax not in loc: u = (loc[o[0]] + 1) / 2; v = (loc[o[1]] + 1) / 2
                uv.append(BT.sw_uv(sw, u, v))
            quads.append(q); uvs.append(uv)
    add_quads(part, mat, quads, uvs, col)


def add_tube(part, mat, path, radii, nseg=8, sw='rope', cap=(True, True), col=None, ref=(0, 0, 1), vrep=1.0, uoff=0.0, uspan=1.0):
    """a smooth tube along a polyline. radii: scalar, (n,) or (n, 2) for an ellipse (across, along the reference up). u of the swatch follows the path length."""
    path = np.asarray(path, float); n = len(path)
    rad = np.broadcast_to(np.asarray(radii, float), (n,) if np.ndim(radii) < 2 else (n, 2)) if np.ndim(radii) < 2 else np.asarray(radii, float)
    rad = np.stack([rad, rad], 1) if rad.ndim == 1 else rad
    if np.ndim(radii) == 0: rad = np.full((n, 2), float(radii))
    tang = np.gradient(path, axis=0); tang = unit(tang)
    frames = []; prev = None
    for i in range(n):
        if prev is None: f = frame_from(tang[i], ref)
        else:
            ex = tang[i]; ey = prev[1] - np.dot(prev[1], ex) * ex
            if np.linalg.norm(ey) < 1e-6: ey = prev[2]
            ey = unit(ey); f = np.stack([ex, ey, np.cross(ex, ey)], 0)
        frames.append(f); prev = f
    ang = np.linspace(0, 2 * np.pi, nseg + 1)
    ca, sa = np.cos(ang), np.sin(ang)
    P = np.zeros((n, nseg + 1, 3)); N = np.zeros((n, nseg + 1, 3))
    for i in range(n):
        f = frames[i]; off = np.outer(ca * rad[i, 0], f[1]) + np.outer(sa * rad[i, 1], f[2]); P[i] = path[i] + off
        nn = np.outer(ca / max(rad[i, 0], 1e-6), f[1]) + np.outer(sa / max(rad[i, 1], 1e-6), f[2]); N[i] = unit(nn)
    ln = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]); ln = ln / max(ln[-1], 1e-9)
    U = np.broadcast_to((uoff + ln * uspan)[:, None], (n, nseg + 1)); V = np.broadcast_to((np.linspace(0, 1, nseg + 1) * vrep % 1.0)[None, :], (n, nseg + 1))
    UV = BT.sw_uv(sw, np.clip(U, 0, 1), V)
    F = grid_faces(n, nseg + 1)
    # grid_faces winding gives normal du x dv with du along columns (around) and dv along rows (path): flip to face outwards
    Fo = F[:, [0, 2, 1]]
    C = None if col is None else np.broadcast_to(col, P.shape).reshape(-1, 3)
    part.add(mat, P.reshape(-1, 3), N.reshape(-1, 3), UV.reshape(-1, 2), Fo, C)
    k = 0
    for end, do in ((0, cap[0]), (n - 1, cap[1])):
        if not do: continue
        f = frames[end]; c = path[end]; nrm = tang[end] * (-1 if end == 0 else 1)
        ring = P[end, :-1]; m = len(ring); Pc = np.vstack([ring, c]); Nc = np.repeat(nrm[None], m + 1, 0)
        uvc = BT.sw_uv(sw, np.full(m + 1, 0.5), np.full(m + 1, 0.5)); Ff = np.array([[i, (i + 1) % m, m] for i in range(m)])
        if end == 0: Ff = Ff[:, [0, 2, 1]]
        # make the cap face outwards
        tri_n = np.cross(Pc[Ff[0, 1]] - Pc[Ff[0, 0]], Pc[Ff[0, 2]] - Pc[Ff[0, 0]])
        if np.dot(tri_n, nrm) < 0: Ff = Ff[:, [0, 2, 1]]
        part.add(mat, Pc, Nc, uvc, Ff, None if col is None else np.broadcast_to(col, Pc.shape))


def add_sweep(part, mat, path, ex, profile, sw='gunwale', closed=True, col=None, uspan=1.0):
    """sweep a flat-sided profile along a path. ex (n,3): the 'a' direction of the profile at each point; the 'b' direction is tangent x ex. profile: (m,2) polygon in (a, b), counter-clockwise seen along the tangent."""
    path = np.asarray(path, float); n = len(path); prof = np.asarray(profile, float); m = len(prof)
    tang = unit(np.gradient(path, axis=0)); ex = unit(np.asarray(ex, float) - np.sum(np.asarray(ex, float) * tang, -1, keepdims=True) * tang); eb = np.cross(tang, ex)
    ln = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]); ln = ln / max(ln[-1], 1e-9)
    ne = m if closed else m - 1
    for e in range(ne):
        p0 = prof[e]; p1 = prof[(e + 1) % m]; d = p1 - p0
        P0 = path + ex * p0[0] + eb * p0[1]; P1 = path + ex * p1[0] + eb * p1[1]
        nrm = unit(ex * d[1] - eb * d[0]) * 1.0
        G = np.stack([P0, P1], 1)             # (n, 2, 3)
        UV = BT.sw_uv(sw, np.broadcast_to((ln * uspan)[:, None], (n, 2)), np.broadcast_to(np.array([0.2, 0.8])[None, :], (n, 2)))
        F = grid_faces(n, 2); N = np.repeat(nrm[:, None, :], 2, 1)
        # orient triangles so that the geometric normal agrees with nrm
        t = np.cross(G[1, 0] - G[0, 0], G[1, 1] - G[0, 0]); 
        Fq = F
        g0 = G.reshape(-1, 3)[F[0]]; gn = np.cross(g0[1] - g0[0], g0[2] - g0[0])
        if np.dot(gn, nrm[0]) < 0: Fq = F[:, [0, 2, 1]]
        part.add(mat, G.reshape(-1, 3), N.reshape(-1, 3), UV.reshape(-1, 2), Fq, None if col is None else np.broadcast_to(col, G.shape).reshape(-1, 3))
    # end caps (fan)
    for end in (0, n - 1):
        pts = path[end] + ex[end][None] * prof[:, :1] + eb[end][None] * prof[:, 1:2]; c = pts.mean(0)
        Pc = np.vstack([pts, c]); Ff = np.array([[i, (i + 1) % m, m] for i in range(m)]); nrm = tang[end] * (-1 if end == 0 else 1)
        tn = np.cross(Pc[Ff[0, 1]] - Pc[Ff[0, 0]], Pc[Ff[0, 2]] - Pc[Ff[0, 0]])
        if np.dot(tn, nrm) < 0: Ff = Ff[:, [0, 2, 1]]
        part.add(mat, Pc, np.repeat(nrm[None], m + 1, 0), BT.sw_uv(sw, np.full(m + 1, 0.5), np.full(m + 1, 0.5)), Ff, None if col is None else np.broadcast_to(col, Pc.shape))


def rect_profile(a, b, r=0.0):
    """rectangle (a wide, b high) centred, counter-clockwise in (a, b)"""
    return [(-a / 2, -b / 2), (a / 2, -b / 2), (a / 2, b / 2), (-a / 2, b / 2)]


# ------------------------------------------------------------------------------------------------- the hull
class Hull:
    """lofted clinker hull. u runs 0 (stern, transom) to 1 (stem); t runs 0 (keel) to 1 (sheer); port half, mirrored for starboard."""
    def __init__(s, spec):
        s.p = dict(spec); s.ns = spec['ns']; s.L = spec['L']
        s.um_k = 0.5; s.um_s = 0.45; s.um_b = 0.48

    def zs(s, u):
        p = s.p; um = s.um_s; u = np.asarray(u, float)
        a = np.where(u < um, p['sr_s'] * (np.clip(um - u, 0, None) / um) ** 2, p['sr_b'] * (np.clip(u - um, 0, None) / (1 - um)) ** 2.2)
        return p['fb'] + a

    def zk(s, u):
        p = s.p; um = s.um_k; u = np.asarray(u, float)
        a = np.where(u < um, p['kr_s'] * (np.clip(um - u, 0, None) / um) ** 2.5, p['kr_b'] * (np.clip(u - um, 0, None) / (1 - um)) ** 2.4)
        return -p['draft'] + a

    def bs(s, u):
        p = s.p; um = s.um_b; u = np.asarray(u, float)
        bow = (1 - np.clip((u - um) / (1 - um), 0, 1) ** p['pb']) ** (1.0 / p['qb'])
        stern = p['tw'] + (1 - p['tw']) * (1 - np.clip((um - u) / um, 0, 1) ** p['ps'])
        return p['B'] / 2 * np.where(u >= um, bow, stern)

    def sec(s, u, t):
        p = s.p; e = p['e0'] + p['e1'] * np.abs(2 * np.asarray(u, float) - 1) ** 1.5; fl = p['flare']
        return (1 - fl) * np.power(np.clip(t, 0, 1), e) + fl * np.power(np.clip(t, 0, 1), 3.0)

    def surf(s, u, t):
        """port-half point (x, y >= 0, z); u and t broadcast"""
        p = s.p; u, t = np.broadcast_arrays(np.asarray(u, float), np.asarray(t, float))
        zs, zk = s.zs(u), s.zk(u)
        z = zk + (zs - zk) * t; y = s.bs(u) * s.sec(u, t)
        gs = sst(0.55, 1.0, u); gt = np.clip(1 - u / 0.14, 0, 1) ** 2
        x = p['Tr'] + u * (s.L - p['Tr']) - p['R'] * (1 - t) * gs - p['Tr'] * t * gt
        return np.stack([x, y, z], -1)

    def nrm(s, u, t):
        """outward unit normal of the port half"""
        e = 1e-3; u = np.asarray(u, float); t = np.asarray(t, float)
        du = (s.surf(np.clip(u + e, 0, 1), t) - s.surf(np.clip(u - e, 0, 1), t)); dt = (s.surf(u, np.clip(t + e, 0, 1)) - s.surf(u, np.clip(t - e, 0, 1)))
        n = unit(np.cross(dt, du)); return n

    def ustations(s, nu):
        k = np.linspace(0, 1, nu); return 0.5 - 0.5 * np.cos(np.pi * k)

    def z_water(s, u, t):
        return s.surf(u, t)[..., 2]

    def t_at_z(s, u, z):
        zs, zk = s.zs(u), s.zk(u); return np.clip((z - zk) / (zs - zk), 0, 1)

    def u_at_x(s, x, z):
        us = np.linspace(0, 1, 1201); t = s.t_at_z(us, z); X = s.surf(us, t)[..., 0]; return float(np.interp(x, X, us))

    def y_inner(s, x, z, off=0.02):
        """half width of the inside of the planking at a station x and height z (port side, y > 0)"""
        u = s.u_at_x(x, z); t = s.t_at_z(u, z); return float(s.surf(u, t)[1] - off)

    def sheer_z(s, x):
        u = s.u_at_x(x, s.p['fb']); return float(s.zs(u))


# ------------------------------------------------------------------------------------------------- hull parts
def mirror_pts(P): P = np.array(P, float); P[..., 1] *= -1; return P


def build_hull_shell(H, part, Q, spec, brk=None):
    """outer and inner planking (strakes with real laps), step faces and ledges. brk: wreck description (strake gaps) or None"""
    ns = H.ns; nu = Q['nu']; rows = Q['rows']; us = H.ustations(nu)
    for side in (0, 1):
        sgn = 1 if side == 0 else -1
        for k in range(ns):
            t0, t1 = k / ns, (k + 1) / ns
            ivs = [(0.0, 1.0)] if brk is None else brk.get('strake_u', {}).get((side, k), [(0.0, 1.0)])
            for (u0, u1) in ivs:
                _shell_piece(H, part, Q, brk, side, k, t0, t1, u0, u1, us)
        if not Q['detail']:                                   # far level: one simple inner skin per side
            ts = np.linspace(0, 1, 3); U, T = np.meshgrid(us, ts); P = H.surf(U, T) + H.nrm(U, T) * -TH_PLANK
            if side == 1: P = mirror_pts(P)
            UV = BT.band_uv(True, side, ns // 2, U, np.full_like(U, 0.5)); hint = -H.nrm(U, T); hint = mirror_pts(hint) if side == 1 else hint
            add_grid(part, 'Boat', P, UV, hint=hint)


def _shell_piece(H, part, Q, brk, side, k, t0, t1, u0, u1, us):
    ns = H.ns; rows = Q['rows']
    if True:
        if True:
            if u1 - u0 < 0.02: return
            uu = us[(us >= u0 - 1e-9) & (us <= u1 + 1e-9)]
            if len(uu) < 3: uu = np.linspace(u0, u1, 6)
            if brk is not None and (u0 > 0 or u1 < 1) and Q['detail'] > 0:
                uu = np.unique(np.concatenate([[u0], uu, [u1]]))
            ts = t0 + (t1 - t0) * np.linspace(0, 1, rows + 1)
            U, T = np.meshgrid(uu, ts); S = (T - t0) / (t1 - t0)
            P = H.surf(U, T); N = H.nrm(U, T)
            for inner in ((False, True) if Q['detail'] else (False,)):
                off = TH_LAP * (1 - S) - (TH_PLANK if inner else 0.0)
                if brk is not None and (side, k) in brk.get('sag', {}): off = off + 0.0
                PP = P + N * off[..., None]
                if brk is not None and (side, k) in brk.get('push', {}):                  # a sprung plank: bowed outwards in the middle
                    amp = brk['push'][(side, k)]; PP = PP + N * (amp * np.sin(np.pi * np.clip((U - u0) / max(u1 - u0, 1e-6), 0, 1)) ** 2)[..., None]
                if side == 1: PP = mirror_pts(PP)
                UV = BT.band_uv(inner, side, k, U, S)
                hint = (N * (1 if not inner else -1)); hint = mirror_pts(hint) if side == 1 else hint
                add_grid(part, 'Boat', PP, UV, hint=hint)
            # step faces at the lower edge of strake k (k > 0): outside facing down, inside (ledge) facing up
            if k > 0 and Q['detail']:
                for inner in (False, True):
                    tt = np.full_like(uu, t0)
                    Pb = H.surf(uu, tt); Nb = H.nrm(uu, tt)
                    o1 = TH_LAP if not inner else 0.0; o0 = 0.0 if not inner else -TH_PLANK
                    A = Pb + Nb * o0; B = Pb + Nb * o1
                    if inner: A = Pb + Nb * (0.0 - TH_PLANK); B = Pb + Nb * 0.0
                    if side == 1: A = mirror_pts(A); B = mirror_pts(B)
                    G = np.stack([A, B], 0)                                         # (2, nu, 3)
                    # hint: the face looks along -t (outer step) or +t (inner ledge)
                    dt = H.surf(uu, np.full_like(uu, min(t0 + 0.01, 1))) - H.surf(uu, np.full_like(uu, t0 - 0.01))
                    if side == 1: dt = mirror_pts(dt)
                    hint = np.broadcast_to((-dt if not inner else dt)[None], G.shape)
                    UV = BT.band_uv(inner, side, k, uu[None, :].repeat(2, 0), np.array([[0.0], [0.04]]).repeat(len(uu), 1))
                    add_grid(part, 'Boat', G, UV, hint=hint)


def add_transom(H, part, spec, Q, brk=None):
    p = H.p; ts = np.linspace(0, 1, 9 if Q['detail'] else 4)
    A = H.surf(np.zeros_like(ts), ts); B = mirror_pts(A)
    # aft face
    quads = []; uvs = []
    ns = H.ns
    for i in range(len(ts) - 1):
        q = np.array([A[i], B[i], B[i + 1], A[i + 1]]); quads.append(q)
        t0 = ts[i]; k = min(ns - 1, int(t0 * ns)); s0 = (ts[i] * ns) % 1.0; s1 = s0 + (ts[1] - ts[0]) * ns
        uvs.append([BT.band_uv(False, 0, k, 0.40 + 0.2 * a, b) for a, b in ((0, s0), (1, s0), (1, s1), (0, s1))])
    # orient so that the face looks aft (-x)
    qq = []; uq = []
    for q, uv in zip(quads, uvs):
        n = np.cross(q[1] - q[0], q[2] - q[0])
        if n[0] > 0: q = q[::-1]; uv = uv[::-1]
        qq.append(q); uq.append(uv)
    add_quads(part, 'Boat', qq, uq)
    # inside face: the board is 22 mm thick, set forward along the plane normal; plus the top edge
    n = unit(np.cross(A[-1] - A[0], B[0] - A[0])); fwd = np.array([1.0, 0, 0]); n = n if n[0] > 0 else -n
    th = 0.022; A2 = A + n * th; B2 = B + n * th
    qq = []; uq = []
    for i in range(len(ts) - 1):
        q = np.array([A2[i], B2[i], B2[i + 1], A2[i + 1]])
        if np.cross(q[1] - q[0], q[2] - q[0])[0] < 0: q = q[::-1]
        qq.append(q); uq.append([BT.sw_uv('thwart', a, b) for a, b in ((0, 0), (1, 0), (1, 1), (0, 1))])
    add_quads(part, 'Boat', qq, uq)
    # top edge
    q = np.array([A[-1], B[-1], B2[-1], A2[-1]])
    if np.cross(q[1] - q[0], q[2] - q[0])[2] < 0: q = q[::-1]
    add_quads(part, 'Boat', [q], [[BT.sw_uv('gunwale', a, b) for a, b in ((0, 0), (1, 0), (1, 1), (0, 1))]])
    return A, B, n


def add_keel_stem(H, part, spec, Q):
    us = H.ustations(Q['keel_nu']); p = H.p
    kw, kd = spec['keel']
    # keel: a proud strip along the centre line of the bottom, from the transom to the forefoot
    path = H.surf(us, np.zeros_like(us)); path[:, 1] = 0.0; path[:, 2] -= kd * 0.35
    ex = np.tile(np.array([0, 1.0, 0]), (len(us), 1))
    add_sweep(part, 'Boat', path, ex, rect_profile(kw, kd), 'keel', True)
    # stem: a post up the stem line from the forefoot to the sheer
    ts = np.linspace(0, 1, 14 if Q['detail'] > 1 else (7 if Q['detail'] else 4)); line = H.surf(np.ones_like(ts), ts); line[:, 1] = 0
    nrm = np.stack([np.ones_like(ts), np.zeros_like(ts), np.zeros_like(ts)], 1)
    d = np.gradient(line, axis=0); out = unit(np.cross(d, np.array([0, 1.0, 0]))); out = out * np.sign(out[:, 0:1] + 1e-9)
    path2 = line + out * 0.012
    add_sweep(part, 'Boat', path2, np.tile(np.array([0, 1.0, 0]), (len(ts), 1)), rect_profile(0.05, 0.045), 'keel', True)
    # inner stem and breasthook: a block behind the stem head, a triangular plate across the top
    head = H.surf(1.0, 1.0); head = np.array(head); head[1] = 0
    bh = H.surf(0.93, 1.0); w = bh[1] - 0.03
    add_box(part, 'Boat', head + np.array([-0.07, 0, -0.035]), (0.14, max(0.05, 2 * w * 0.5), 0.045), None, 'gunwale', 0)


def rail_path(H, u, t, off_n, up=0.0, inner=False):
    """port-half path along the hull at fixed t, offset along the outward normal"""
    P = H.surf(u, t); N = H.nrm(u, t); return P + N * off_n + np.array([0, 0, up])


def add_rails(H, part, spec, Q):
    us = H.ustations(Q['rail_nu'])
    for side in (0, 1):
        sg = 1 if side == 0 else -1
        # inwale: inside the top strake, top face flush with the sheer, 30 x 45 mm
        P = rail_path(H, us, np.ones_like(us), -(TH_PLANK + 0.017), 0.0); P[:, 2] += 0.0
        if side: P = mirror_pts(P)
        ex = np.tile(np.array([0, 1.0 * sg, 0]), (len(us), 1)) * -1
        add_sweep(part, 'Boat', P, ex, rect_profile(0.034, 0.05), 'gunwale', True)
        # capping strip over the plank edge
        if Q['detail'] < 2: continue
        Pc = rail_path(H, us, np.ones_like(us), 0.0, 0.012)
        if side: Pc = mirror_pts(Pc)
        add_sweep(part, 'Boat', Pc, np.tile(np.array([0, 1.0, 0]), (len(us), 1)), rect_profile(0.06, 0.02), 'gunwale', True)
        # rubbing strake: a half-round on the outside of the top strake
        if Q['detail'] > 0:
            tt = np.full_like(us, 1.0 - 0.5 / H.ns + 0.04); Pr = rail_path(H, us, tt, TH_LAP + 0.012, 0.0)
            if side: Pr = mirror_pts(Pr)
            # outward direction for the profile
            ex = np.tile(np.array([0, 1.0 * sg, 0]), (len(us), 1))
            add_sweep(part, 'Boat', Pr, ex, [(-0.012, -0.02), (0.012, -0.02), (0.018, 0.0), (0.012, 0.02), (-0.012, 0.02)][::1], 'gunwale', True)


def add_ribs(H, part, spec, Q, brk=None):
    """steamed ribs from gunwale to gunwale over the inside of the planking, about every 0.26 m"""
    L = H.L; gap = spec.get('rib_gap', 0.26) / max(Q['ribs'], 0.01) if Q['ribs'] > 0 else None
    if gap is None: return
    n = max(3, int(L / gap)); xs = np.linspace(0.42, L - 0.5, n)
    ts = np.concatenate([np.linspace(0.97, 0.0, 14), np.linspace(0.0, 0.97, 14)[1:]]) if Q['detail'] > 1 else np.concatenate([np.linspace(0.97, 0.0, 6), np.linspace(0.0, 0.97, 6)[1:]])
    half = len(ts) // 2 + 1
    for i, x in enumerate(xs):
        z0 = -spec['draft'] * 0.5; u = H.u_at_x(x, z0)
        P = np.array([H.surf(u, t) + H.nrm(u, t) * (-TH_PLANK - 0.0035) for t in ts])
        if True:
            # the second half goes over the starboard side
            P2 = P.copy(); P2[half - 1:, 1] *= -1; P = P2
        top = len(ts) - 1
        if brk is not None:
            br = brk.get('ribs', {}).get(i)
            if br is not None:                                                         # a broken rib stops short (port side, starboard side) as a number of rungs of the path
                a, b = br; P = P[a:len(ts) - b]
        if len(P) < 2: continue
        ex = np.tile(np.array([1.0, 0, 0]), (len(P), 1))
        add_sweep(part, 'Boat', P, ex, rect_profile(0.028, 0.016), 'rib', True, uspan=1.0)
        if brk is not None and br is not None and (br[0] or br[1]):                      # splintered ends
            for e in (0, -1):
                add_box(part, 'Boat', P[e] + np.array([0.0, 0, 0.0]), (0.022, 0.03, 0.05), rot_y(0.5), 'rib', 2)


def add_thwarts(H, part, spec, Q, nodes, brk=None):
    L = H.L; seats = []
    for i, f in enumerate(spec['thw']):
        x = f * L; ztop = H.sheer_z(x) - 0.17
        half = min(H.y_inner(x - 0.13, ztop - 0.03, 0.0), H.y_inner(x + 0.13, ztop - 0.03, 0.0)) - 0.002
        add_box(part, 'Boat', (x, 0, ztop - 0.014), (0.25, 2 * half, 0.028), None, 'thwart', 1)
        # riser cleats under the ends and a pair of knees
        for sg in (1, -1):
            yy = sg * (half - 0.025)
            if Q['detail'] > 1: add_box(part, 'Boat', (x, yy, ztop - 0.045), (0.30, 0.04, 0.034), None, 'gunwale', 0)
            if Q['detail'] > 1:
                for dx in (-0.1, 0.1):
                    yin = lambda z: H.y_inner(x + dx, z, 0.0) - 0.01
                    pts = np.array([[x + dx, sg * yin(ztop - 0.23), ztop - 0.23], [x + dx, sg * yin(ztop - 0.12), ztop - 0.12], [x + dx, sg * (yin(ztop - 0.06) - 0.02), ztop - 0.06], [x + dx, sg * (half - 0.14), ztop - 0.045]])
                    add_sweep(part, 'Boat', pts, np.tile(np.array([1.0, 0, 0]), (len(pts), 1)), rect_profile(0.03, 0.026), 'rib', True)
        seats.append((x, ztop))
    return seats


def floor_z(spec): return -spec['draft'] + spec.get('floor_h', 0.105)


def add_floor(H, part, spec, Q):
    L = H.L; zf = floor_z(spec)
    x0 = spec['thw'][0] * L - 0.10; x1 = L - 0.42
    nb = 5 if spec['L'] < 5 else 7; bw = 0.15 if spec['L'] < 5 else 0.17
    ys = (np.arange(nb) - (nb - 1) / 2) * (bw + 0.006)
    for y in ys:
        xa, xb = x0, x1
        # clip the board where the hull is narrower than the board edge at that height
        for xt in np.linspace(x0, x1, 40):
            if H.y_inner(xt, zf, 0.01) < abs(y) + bw / 2 + 0.005: pass
        xs = np.linspace(x0, x1, 40); ok = np.array([H.y_inner(xt, zf, 0.012) > abs(y) + bw / 2 for xt in xs])
        if not ok.any(): continue
        xa, xb = xs[ok].min(), xs[ok].max()
        if xb - xa < 0.2: continue
        add_box(part, 'Boat', ((xa + xb) / 2, y, zf), (xb - xa, bw, 0.02), rot_z(0.0), 'floor', 0)
    # bearers under the boards
    for xb in np.linspace(x0 + 0.1, x1 - 0.1, 4):
        w = H.y_inner(xb, zf - 0.03, 0.02)
        add_box(part, 'Boat', (xb, 0, zf - 0.03), (0.05, 2 * w - 0.02, 0.03), None, 'rib', 1)


def coil_path(c, r0, r1, turns, per, z0, dz):
    n = int(turns * per) + 1; a = np.linspace(0, turns * 2 * np.pi, n)
    rr = np.linspace(r0, r1, n); zz = z0 + dz * a / (2 * np.pi)
    return np.stack([c[0] + rr * np.cos(a), c[1] + rr * np.sin(a), zz], -1)


def add_painter_and_bailer(H, part, spec, Q, rng):
    L = H.L; zf = floor_z(spec)
    if Q['rope_pts']:
        c = np.array([L - 0.62, 0.02, zf + 0.012]); path = coil_path(c, 0.115, 0.08, 3.0, Q['rope_pts'], c[2] + 0.009, 0.0135)
        # the end of the painter runs up to the stem ring and a short tail lies on the coil
        tail = np.array([[path[-1][0], path[-1][1], path[-1][2]], [L - 0.5, 0.0, path[-1][2] + 0.04], [L - 0.36, -0.03, zf + 0.14], [L - 0.20, 0.0, H.surf(1.0, 1.0)[2] - 0.10]])
        from_tail = np.array([np.interp(np.linspace(0, 1, 12), np.linspace(0, 1, 4), tail[:, i]) for i in range(3)]).T
        add_tube(part, 'Boat', path, 0.0085, 6, 'rope', (False, False), uspan=1.0)
        add_tube(part, 'Boat', from_tail, 0.0085, 6, 'rope', (False, True))
    # ring bolt on the stem, an iron ring
    hd = H.surf(1.0, 0.9); hd[1] = 0; ang = np.linspace(0, 2 * np.pi, 14 if Q['detail'] else 7)
    ring = np.stack([hd[0] - 0.045 + 0.02 * np.cos(ang) * 0, hd[1] + 0.02 * np.sin(ang), hd[2] - 0.06 + 0.02 * np.cos(ang)], -1)
    if Q['detail'] > 1: add_tube(part, 'Boat', ring, 0.004, 5, 'iron', (False, False))
    # bailer: a cut-off bottle, a scoop on its side by the aft thwart
    if Q['detail'] > 0:
        bx = spec['thw'][0] * L + 0.30; by = -0.30; zb = floor_z(spec) + 0.01
        th = np.linspace(-1.1 * np.pi, 0.1 * np.pi, 14); hh = np.linspace(0, 1, 4)
        R_ = 0.045; Hh = 0.13
        TH_, HH_ = np.meshgrid(th, hh); cut = 1 - 0.45 * (1 - np.cos(TH_ + np.pi / 2)) / 2
        P = np.stack([bx + R_ * np.cos(TH_) * 0.9, by + R_ * np.sin(TH_) + 0.0 * HH_, zb + R_ * 0.0 + HH_ * Hh * cut * 0 + R_ * 0], -1)
        P = np.stack([bx + HH_ * Hh * cut, by + R_ * np.cos(TH_), zb + R_ + R_ * np.sin(TH_)], -1)
        add_grid(part, 'BoatTwo', P, BT.sw_uv('paintw', np.clip((TH_ + 1.1 * np.pi) / (1.2 * np.pi), 0, 1), HH_), hint=None)


def add_rowlock_blocks(H, part, spec, Q, x_r):
    out = []
    for sg in (1, -1):
        zs = H.sheer_z(x_r); y = sg * (H.y_inner(x_r, zs - 0.01, -0.025) + 0.0)
        add_box(part, 'Boat', (x_r, y - sg * 0.015, zs + 0.016), (0.16, 0.05, 0.04), None, 'gunwale', 0)
        # iron crutch: a U of round iron in a socket
        if Q['detail'] > 0:
            ang = np.linspace(-0.2, np.pi + 0.2, 10); cx, cy, cz = x_r, y + sg * 0.012, zs + 0.075
            path = np.stack([cx + 0.032 * np.cos(ang) * 0 + 0.0 * ang, cy + 0.0 * ang + 0.0, cz + 0.0 * ang], -1)
            u_path = np.stack([cx + 0.035 * np.cos(ang), np.full_like(ang, cy), cz + 0.03 * np.sin(ang) - 0.0], -1)
            add_tube(part, 'Boat', u_path, 0.0055, 5, 'iron', (True, True))
            add_tube(part, 'Boat', np.array([[cx, cy, zs + 0.034], [cx, cy, cz - 0.0]]), 0.007, 5, 'iron', (True, False))
        out.append(np.array([x_r, y + sg * 0.012, zs + 0.075]))
    return out


# ------------------------------------------------------------------------------------------------- oars
def build_oar(part, Q, length=2.5, inboard=0.78, sgn=1):
    """oar for the port (sgn +1) or starboard (sgn -1) side, built in the rowing position about the pivot at the origin (the rowlock): the loom runs out along +-Y, a little swept aft, the blade end at the far end."""
    n = 12 if Q['detail'] else 3; out = length - inboard
    # handle end at -inboard (towards the boat's centre), blade at +out
    s = np.linspace(-inboard, out, n)
    axis = np.array([-0.16, 1.0, 0.0]); axis = unit(axis)
    path = np.array([axis * v for v in s]) * np.array([1.0, sgn, 1.0])
    rr = np.interp(s, [-inboard, -inboard + 0.2, 0.3, out - 0.6, out - 0.55, out], [0.017, 0.021, 0.022, 0.017, 0.016, 0.007])
    add_tube(part, 'Boat', path, rr, Q['seg'], 'oar', (True, False), ref=(0, 0, 1))
    # blade: a flattened spoon, 0.58 m long, 0.115 wide
    bl = np.linspace(out - 0.6, out, 8 if Q['detail'] else 3); pb = np.array([axis * v for v in bl]) * np.array([1.0, sgn, 1.0])
    wid = np.interp(bl, [out - 0.6, out - 0.45, out - 0.05, out], [0.02, 0.075, 0.072, 0.045]); thk = np.interp(bl, [out - 0.6, out - 0.5, out], [0.017, 0.012, 0.005])
    rad = np.stack([wid, thk], 1)
    add_tube(part, 'Boat', pb, rad, Q['seg'], 'oar', (False, True), ref=(0, 0, 1), uoff=0.8, uspan=0.2)
    # leather collar and a rope button
    cpos = 0.0
    p0 = np.array([axis * (-0.09), axis * (0.09)]) * np.array([1.0, sgn, 1.0])
    if Q['detail'] > 0: add_tube(part, 'Boat', p0, 0.028, Q['seg'], 'leather', (True, True))
    # handle grip: slightly thicker end
    if Q['detail'] > 0: add_tube(part, 'Boat', np.array([axis * (-inboard), axis * (-inboard + 0.17)]) * np.array([1.0, sgn, 1.0]), 0.0215, Q['seg'], 'oar', (True, True))


# ------------------------------------------------------------------------------------------------- more primitives
def add_prism(part, mat, poly, origin, ex, ey, th, sw='spar', col=None):
    """extrude a convex polygon (k, 2) given in the plane (ex, ey) at `origin` by th along ex x ey (centred)"""
    poly = np.asarray(poly, float); k = len(poly); ex = unit(ex); ey = unit(ey); n = np.cross(ex, ey); o = np.asarray(origin, float)
    P2 = o + ex * poly[:, :1] + ey * poly[:, 1:2]; a = P2 + n * th / 2; b = P2 - n * th / 2
    cen = P2.mean(0)
    for pts, nn, up in ((a, n, True), (b, -n, False)):
        c = pts.mean(0); Pc = np.vstack([pts, c]); F = np.array([[i, (i + 1) % k, k] for i in range(k)])
        if np.dot(np.cross(Pc[F[0, 1]] - Pc[F[0, 0]], Pc[F[0, 2]] - Pc[F[0, 0]]), nn) < 0: F = F[:, [0, 2, 1]]
        lo, hi = poly.min(0), poly.max(0); uvp = (poly - lo) / np.maximum(hi - lo, 1e-9)
        uv = np.vstack([uvp, uvp.mean(0)]); part.add(mat, Pc, np.repeat(nn[None], k + 1, 0), BT.sw_uv(sw, uv[:, 0], uv[:, 1]), F, None if col is None else np.broadcast_to(col, Pc.shape))
    quads = []; uvs = []
    for i in range(k):
        j = (i + 1) % k; q = np.array([b[i], b[j], a[j], a[i]])
        if np.dot(np.cross(q[1] - q[0], q[2] - q[0]), (P2[i] + P2[j]) / 2 - cen) < 0: q = q[::-1]
        quads.append(q); uvs.append([BT.sw_uv(sw, x, y) for x, y in ((0, 0), (1, 0), (1, 1), (0, 1))])
    add_quads(part, mat, quads, uvs, col)


def add_sphere(part, mat, c, radii, sw='buoy', nu=10, nv=6, bump=None, rng=None, ref=None):
    """an ellipsoid; bump (0..1) adds lumps (a heap of net)"""
    th = np.linspace(0, 2 * np.pi, nu + 1); ph = np.linspace(0.0, np.pi, nv + 1)
    TH, PH = np.meshgrid(th, ph); r = np.asarray(radii, float)
    k = np.ones_like(TH)
    if bump:
        rg = rng or np.random.default_rng(3); a = rg.random((nv + 2, nu + 2)); k = 1 + bump * (a[:nv + 1, :nu + 1] - 0.5); k[:, -1] = k[:, 0]
    P = np.stack([c[0] + r[0] * k * np.sin(PH) * np.cos(TH), c[1] + r[1] * k * np.sin(PH) * np.sin(TH), c[2] + r[2] * k * np.cos(PH)], -1)
    UV = BT.sw_uv(sw, TH / (2 * np.pi), PH / np.pi)
    hint = P - np.asarray(c, float)
    add_grid(part, mat, P, UV, hint=hint)


def fit_y(H, x, z, y, hw, margin=0.04):
    """clamp a sideways position so that something hw wide stays inside the planking at that station and height"""
    lim = H.y_inner(x, z + 0.04, 0.02) - hw - margin
    return math.copysign(min(abs(y), max(lim, 0.0)), y if y != 0 else 1.0)


def add_bag(part, c, size, rng, yaw=0.0, sw='sack', nu=10, nv=7, Q=None):
    if Q is not None and Q['detail'] < 2: nu, nv = (7, 5) if Q['detail'] else (5, 3)
    """a sack lying down: a soft ellipsoid with a tied neck"""
    th = np.linspace(0, 2 * np.pi, nu + 1); ph = np.linspace(0.0, np.pi, nv + 1); TH, PH = np.meshgrid(th, ph)
    a, b, h = size; sq = 1 - 0.35 * np.abs(np.sin(PH)) ** 3 * (np.cos(TH) ** 2) * 0
    P = np.stack([a * np.cos(PH) * (1 + 0.1 * np.sin(3 * TH)), b * np.sin(PH) * np.cos(TH), h * np.sin(PH) * np.sin(TH) * 0.0 + h * np.abs(np.sin(PH)) * np.sin(TH) * 0 + h * np.sin(PH) * np.sin(TH)], -1)
    P[..., 2] = np.where(P[..., 2] < 0, P[..., 2] * 0.35, P[..., 2])
    P = P @ rot_z(yaw).T + np.asarray(c, float)
    add_grid(part, 'Boat', P, BT.sw_uv(sw, TH / (2 * np.pi), PH / np.pi), hint=P - np.asarray(c, float) - np.array([0, 0, -0.02]))


def add_crate(part, c, size, Q, yaw=0.0):
    sx, sy, sz = size; R = rot_z(yaw); cc = np.asarray(c, float)
    if Q['detail'] < 2:
        add_box(part, 'Boat', cc + np.array([0, 0, sz / 2]), size, R, 'crate', 0); return
    t = 0.016
    def bx(off, sz_):
        add_box(part, 'Boat', cc + R @ np.array(off), sz_, R, 'crate', 0)
    bx((0, 0, t / 2), (sx, sy, t))
    for ex_ in (-1, 1):
        for ey_ in (-1, 1): bx((ex_ * (sx / 2 - 0.02), ey_ * (sy / 2 - 0.02), sz / 2), (0.04, 0.04, sz))
    for z in (sz * 0.25, sz * 0.62, sz - 0.03):
        for ey_ in (-1, 1): bx((0, ey_ * (sy / 2 - 0.006), z), (sx, 0.012, sz * 0.2))
        for ex_ in (-1, 1): bx((ex_ * (sx / 2 - 0.006), 0, z), (0.012, sy - 0.07, sz * 0.2))


# ------------------------------------------------------------------------------------------------- nodes
class Node:
    def __init__(s, name, parent, pivot, note='', axes=None):
        s.name = name; s.parent = parent; s.pivot = np.array(pivot, float); s.part = Part(); s.note = note; s.axes = axes or {}


def add_seats(nodes, H, spec, seats, xs=None):
    for i, (x, zt) in enumerate(seats):
        n = Node('seat_%d' % (i + 1), 'boat', (x, 0.0, zt + 0.0), 'crew slot: a seated figure\'s hip point on thwart %d (+X forward); empty marker, no mesh' % (i + 1))
        nodes[n.name] = n


def add_hullmask_waterline(H, nodes, spec, Q, x_max=None, none=False):
    nm = Node('hullmask', 'boat', (0, 0, 0), 'depth-only lid closing the opening just under the inwale: draw with colorWrite false, depthWrite true, renderOrder 1 (BOATS_PASS.md)')
    nu = 18 if Q['detail'] else 6; us = H.ustations(nu)
    if x_max is not None:
        us = us[H.surf(us, np.ones_like(us))[:, 0] <= x_max]
        us = np.unique(np.concatenate([us, [H.u_at_x(x_max, H.p['fb'])]]))
    if none or len(us) < 2:
        nm.part.add('HullMask', np.array([[0, 0, 0], [0.01, 0, 0], [0, 0.01, 0]]), np.tile([0, 0, 1.0], (3, 1)), np.zeros((3, 2)), np.array([[0, 1, 2]]))
    else:
        t = np.ones_like(us); A = H.surf(us, t); A = A + H.nrm(us, t) * (-(TH_PLANK + 0.02)) ; A[:, 2] -= 0.045; B = mirror_pts(A)
        G = np.stack([A, B], 0); F = grid_faces(2, len(us)); N = grid_normals(G); N = np.where(N[..., 2:3] < 0, -N, N)
        Fq = F
        g0 = G.reshape(-1, 3)[F[0]]
        if np.cross(g0[1] - g0[0], g0[2] - g0[0])[2] < 0: Fq = F[:, [0, 2, 1]]
        nm.part.add('HullMask', G.reshape(-1, 3), N.reshape(-1, 3), np.zeros((G.size // 3, 2)), Fq)
    nodes['hullmask'] = nm
    wl = Node('waterline', 'boat', (0, 0, 0), 'flat band at z = 0 just outside the hull at the waterline (foam, contact ring); the page floats the boat so that this band lies in the sea surface. extras carry draft and freeboard')
    us = H.ustations(30 if Q['detail'] > 1 else (14 if Q['detail'] else 7)); tz = H.t_at_z(us, np.zeros_like(us)); Pw = H.surf(us, tz); Nw = H.nrm(us, tz)
    Nw[:, 2] = 0; Nw = unit(Nw)
    A = Pw + Nw * (TH_LAP * 0.9); A[:, 2] = 0.0; B = A + Nw * 0.05; B[:, 2] = 0.0
    keep = (np.abs(Pw[:, 1]) > 0.004)
    bands = []
    for side in (0, 1):
        a = A.copy(); b = B.copy()
        if side: a = mirror_pts(a); b = mirror_pts(b)
        G = np.stack([a, b], 0); F = grid_faces(2, len(us)); N = np.tile([0, 0, 1.0], (G.size // 3, 1))
        g0 = G.reshape(-1, 3)[F[0]]
        Fq = F if np.cross(g0[1] - g0[0], g0[2] - g0[0])[2] > 0 else F[:, [0, 2, 1]]
        wl.part.add('Waterline', G.reshape(-1, 3), N, np.zeros((G.size // 3, 2)), Fq)
    nodes['waterline'] = wl


def build_dinghy_gear(H, nodes, spec, Q, rng, wreck=False):
    L = H.L; x_r = spec['thw'][1] * L + 0.10
    for sg, name in ((1, 'oar_l'), (-1, 'oar_r')):
        zs = H.sheer_z(x_r); y = sg * (H.y_inner(x_r, zs - 0.01, -0.025) + 0.012)
        piv = np.array([x_r, y, zs + 0.075]); nd = Node(name, 'boat', piv, 'oar, pivot at the rowlock (+Y port); built in the rowing position, rest pose ships it along the thwarts')
        pt = Part(); build_oar(pt, Q, 2.5 if spec['L'] < 5 else 2.9, 0.78 if spec['L'] < 5 else 0.86, sg)
        for c in pt.ch: nd.part.add(c[0], c[1] + piv, c[2], c[3], c[4], c[5])
        if wreck and sg == -1:                                  # the starboard oar is half gone: cut the blade off by trimming vertices beyond
            pass
        nodes[name] = nd
    return x_r


def build_wreck_desc(rng):
    return dict(strake_u={(0, 4): [(0.0, 0.20), (0.80, 1.0)], (1, 4): [(0.0, 0.36), (0.88, 1.0)], (0, 3): [(0.0, 0.31), (0.63, 1.0)], (1, 3): [(0.0, 0.18), (0.30, 1.0)]},
                push={(0, 2): 0.035, (1, 2): 0.02, (0, 3): 0.03}, ribs={1: (4, 0), 3: (9, 0), 4: (3, 6), 6: (0, 8), 7: (6, 3), 9: (2, 0), 11: (7, 4)})


def add_sand_and_weed(H, part, spec, rng):
    L = H.L; zf = floor_z(spec)
    xs = np.linspace(0.5, L - 0.55, 16); ys = np.linspace(-1, 1, 7)
    X, Y = np.meshgrid(xs, ys); P = np.zeros(X.shape + (3,))
    for i in range(X.shape[0]):
        for j in range(X.shape[1]):
            w = H.y_inner(X[i, j], zf + 0.08, 0.0) * 0.96; P[i, j] = (X[i, j], Y[i, j] * w, zf + 0.075 + 0.04 * (1 - Y[i, j] ** 2) + 0.05 * math.sin(X[i, j] * 3.1 + Y[i, j] * 2) + 0.03 * rng.random() - 0.0 * Y[i, j])
    P[..., 2] += 0.06 * np.exp(-((X - 1.6) / 0.8) ** 2) - 0.03
    add_grid(part, 'Boat', P, BT.sw_uv('sand', (X - xs[0]) / (xs[-1] - xs[0]), (Y + 1) / 2), hint=np.broadcast_to(np.array([0, 0, 1.0]), P.shape))
    # weed draped over the side planking: a few ribbons
    for sg, x0 in ((1, 1.2), (-1, 2.6), (1, 2.9)):
        ts = np.linspace(0, 1, 7); path = np.array([[x0 + 0.05 * math.sin(t * 6), sg * (H.y_inner(x0, 0.2, 0.0) - 0.0 + 0.04 * t), 0.30 - 0.4 * t] for t in ts])
        add_tube(part, 'BoatTwo', path, np.linspace(0.02, 0.005, 7), 4, 'weed', (False, False))


def pose_defs(boat, spec, H, extra):
    """pose tables: node -> dict(t=(dx, dy, dz) from the built position, r=[(axis, deg), ...], s=scale)"""
    P = {k: {} for k in POSES + ('working',)}
    hide = 0.001
    x_r = extra.get('x_r'); zr = extra.get('z_oar_rest')
    if boat in ('dinghy', 'wreck', 'sailer'):
        for sg, name in ((1, 'oar_l'), (-1, 'oar_r')):
            ship = {'t': (0.0, -sg * (extra['oar_in']), extra['oar_dz']), 'r': [('z', sg * 90.0)]}
            for pn in ('rest', 'sailing', 'beached', 'working'): P[pn][name] = dict(ship)
            P['rowing'][name] = {'t': (0, 0, 0), 'r': [('z', sg * -8.0)]}
    if boat in ('dinghy', 'wreck'):
        P['beached']['boat'] = {'t': (0, 0, 0), 'r': [('x', 8.0)]}
        if boat == 'wreck': P['rest']['boat'] = {'t': (0, 0, 0), 'r': [('x', 8.0)]}
        P['rowing']['boat'] = {'t': (0, 0, 0), 'r': [('y', -1.2)]}
    if boat == 'sailer':
        P['rest']['sail'] = {'t': (0, 0, 0), 'r': [], 's': hide}
        P['rowing']['sail'] = {'t': (0, 0, 0), 'r': [], 's': hide}; P['beached']['sail'] = {'t': (0, 0, 0), 'r': [], 's': hide}
        P['sailing']['sail_furled'] = {'t': (0, 0, 0), 'r': [], 's': hide}
        P['sailing']['sail'] = {'t': (0, 0, 0), 'r': [('z', 26.0)]}
        P['sailing']['boom'] = {'t': (0, 0, 0), 'r': [('z', 26.0)]}
        P['sailing']['rudder_pin'] = {'t': (0, 0, 0), 'r': [('z', -5.0)]}
        P['sailing']['boat'] = {'t': (0, 0, 0), 'r': [('x', -7.0)]}
        P['working']['sail'] = {'t': (0, 0, 0), 'r': [], 's': hide}
    if boat == 'work':
        P['working']['davit'] = {'t': (0, 0, 0), 'r': [('z', -78.0)]}
        P['sailing']['boat'] = {'t': (0, 0, 0), 'r': [('x', -2.0)]}
        P['beached']['boat'] = {'t': (0, 0, 0), 'r': [('x', 6.0)]}
        P['rowing']['davit'] = {'t': (0, 0, 0), 'r': [('z', -30.0)]}
    if boat in ('sailer', 'work'):
        P['working']['rudder_pin'] = {'t': (0, 0, 0), 'r': [('z', 10.0)]}
    return P


def add_cyl(part, mat, p0, p1, r, nseg=8, sw='iron', caps=(True, True), r1=None):
    p0 = np.asarray(p0, float); p1 = np.asarray(p1, float); path = np.array([p0, (p0 + p1) / 2, p1]); rr = np.array([r, (r + (r if r1 is None else r1)) / 2, r if r1 is None else r1])
    add_tube(part, mat, path, rr, nseg, sw, caps)


def torus_path(c, R, plane='xy', n=14, closed=True):
    a = np.linspace(0, 2 * np.pi, n + 1)
    if plane == 'xy': p = np.stack([c[0] + R * np.cos(a), c[1] + R * np.sin(a), np.full_like(a, c[2])], -1)
    elif plane == 'yz': p = np.stack([np.full_like(a, c[0]), c[1] + R * np.cos(a), c[2] + R * np.sin(a)], -1)
    else: p = np.stack([c[0] + R * np.cos(a), np.full_like(a, c[1]), c[2] + R * np.sin(a)], -1)
    return p


def build_hull_common(H, nodes, spec, Q, rng, brk=None, wreck=False):
    hull = Node('hull', 'boat', (0, 0, 0), 'planking with laps, inner skin, ribs, thwarts and knees, transom, keel, stem, rails, floorboards, rowlock blocks, painter and bailer (everything that does not move)')
    nodes['hull'] = hull; part = hull.part
    build_hull_shell(H, part, Q, spec, brk)
    A, B, nrm = add_transom(H, part, spec, Q, brk); add_keel_stem(H, part, spec, Q); add_rails(H, part, spec, Q)
    if Q['detail']: add_ribs(H, part, spec, Q, brk)
    seats = add_thwarts(H, part, spec, Q, nodes, brk)
    if brk is not None: pass
    if Q['detail']: add_floor(H, part, spec, Q)
    return seats


def far_hull_cleanup(H, part): pass


def build_dinghy(boat, lod):
    spec = SPECS[boat]; Q = QL[lod]; H = Hull(spec); rng = np.random.default_rng(SEED + BOATS.index(boat)); nodes = {}
    root = Node('boat', None, (0, 0, 0), 'the boat; origin at the design waterline amidships-ish: z = 0 is the waterline, +X bow, +Y port, metres'); nodes['boat'] = root
    wreck = boat == 'wreck'; brk = build_wreck_desc(rng) if wreck else None
    if wreck:
        seats = build_hull_common(H, nodes, spec, Q, rng, brk, True)
        # the forward thwart is broken off; keep the stubs only
    else:
        seats = build_hull_common(H, nodes, spec, Q, rng, None)
    x_r = build_dinghy_gear(H, nodes, spec, Q, rng, wreck)
    part = nodes['hull'].part
    add_rowlock_blocks(H, part, spec, Q, x_r)
    if not wreck: add_painter_and_bailer(H, part, spec, Q, rng)
    else:
        add_sand_and_weed(H, part, spec, rng)
        add_painter_and_bailer(H, part, spec, Q, rng)
    zs = H.sheer_z(x_r); ztop = seats[1][1]
    extra = dict(x_r=x_r, oar_in=0.36, oar_dz=(ztop + 0.05) - (zs + 0.075))
    add_seats(nodes, H, spec, seats)
    add_hullmask_waterline(H, nodes, spec, Q, none=wreck)
    return nodes, H, extra


def build_sailer(boat, lod):
    spec = SPECS[boat]; Q = QL[lod]; H = Hull(spec); rng = np.random.default_rng(SEED + 5); nodes = {}
    root = Node('boat', None, (0, 0, 0), 'the boat; z = 0 is the waterline, +X bow, +Y port, metres'); nodes['boat'] = root
    seats = build_hull_common(H, nodes, spec, Q, rng)
    L = H.L; part = nodes['hull'].part
    x_r = build_dinghy_gear(H, nodes, spec, Q, rng)
    add_rowlock_blocks(H, part, spec, Q, x_r)
    zf = floor_z(spec)
    # a bit of cargo: two sacks aft of the mast, a hooped barrel and a crate forward, a coil, a fisherman's anchor
    cx = spec['thw'][1] * L - 0.55
    add_bag(part, (cx + 0.1, fit_y(H, cx + 0.1, zf, -0.30, 0.22), zf + 0.12), (0.34, 0.20, 0.17), rng, 0.3, Q=Q); add_bag(part, (cx + 0.55, fit_y(H, cx + 0.55, zf, 0.18, 0.2), zf + 0.12), (0.33, 0.19, 0.16), rng, -0.5, Q=Q)
    if Q['detail'] > 0: add_bag(part, (cx + 0.33, -0.05, zf + 0.30), (0.30, 0.18, 0.15), rng, 0.1, Q=Q)
    xb = 0.64 * L
    bz = zf + 0.01; seg = 10 if Q['detail'] else 6; by = fit_y(H, xb, bz, 0.36, 0.17)
    add_cyl(part, 'Boat', (xb, by, bz), (xb, by, bz + 0.42), 0.17, seg, 'barrel', (True, True), r1=0.17)
    if Q['detail'] > 0:
        for zz in (0.08, 0.34): add_tube(part, 'Boat', torus_path((xb, by, bz + zz), 0.175, 'xy', 18), 0.007, 5, 'iron', (False, False))
    add_crate(part, (xb + 0.05, fit_y(H, xb + 0.05, bz, -0.40, 0.30), bz), (0.48, 0.32, 0.26), Q, 0.25)
    if Q['detail'] > 0:
        # anchor
        a0 = np.array([0.80 * L - 0.35, -0.05, bz + 0.03])
        add_cyl(part, 'Boat', a0, a0 + np.array([0.80, 0.0, 0.05]), 0.016, 6, 'iron'); add_cyl(part, 'Boat', a0 + np.array([0.70, -0.27, 0.05]), a0 + np.array([0.70, 0.27, 0.05]), 0.013, 6, 'iron')
        arm = np.array([[a0[0] - 0.03 + 0.0, a0[1] + sg * (0.04 + 0.2 * math.sin(t)), a0[2] - 0.03 + 0.1 * (1 - math.cos(t))] for sg in (1, -1) for t in np.linspace(0, 1.2, 6)]).reshape(2, 6, 3)
        for sgi in range(2):
            add_tube(part, 'Boat', arm[sgi], 0.014, 5, 'iron', (True, True))
        add_tube(part, 'Boat', torus_path(a0 + np.array([0.8, 0, 0.05]), 0.045, 'xz', 12), 0.008, 5, 'iron', (False, False))
        # coil of rope by the aft thwart
        c = np.array([spec['thw'][0] * L + 0.55, 0.25, zf + 0.02])
        if Q['rope_pts']: add_tube(part, 'Boat', coil_path(c, 0.17, 0.10, 3.0, 26, c[2], 0.012), 0.0095, 6, 'rope', (False, False))
    # mast
    x_m = spec['thw'][2] * L; zstep = -spec['draft'] + 0.20; zsh = H.sheer_z(x_m); ztop = zsh + 4.55
    mast = Node('mast', 'boat', (x_m, 0, zstep), 'mast, pivot at the step on the keel; stays and shrouds are part of it'); nodes['mast'] = mast
    zs_ = np.linspace(zstep, ztop, 14 if Q['detail'] else 4); mp = np.stack([x_m - 0.06 * (zs_ - zstep) / 5.0, np.zeros_like(zs_), zs_], -1)
    rr = np.interp(zs_, [zstep, zsh, zsh + 2, ztop - 0.3, ztop], [0.05, 0.05, 0.043, 0.03, 0.026])
    add_tube(mast.part, 'Boat', mp, rr, Q['seg'], 'spar', (True, True))
    add_box(mast.part, 'Boat', (x_m, 0, zstep + 0.1), (0.2, 0.16, 0.12), None, 'keel', 0)
    if Q['detail'] > 0:
        add_cyl(mast.part, 'Boat', mp[-1] + np.array([0, 0, 0.0]), mp[-1] + np.array([0, 0, 0.09]), 0.03, 8, 'spar', (True, True), 0.012)
        zh = zsh + 3.7; xm_h = x_m - 0.06 * (zh - zstep) / 5.0
        for sg in (1, -1):
            for dx in (0.0, -0.45):
                yg = H.y_inner(x_m + dx, zsh - 0.02, -0.05) * sg
                add_tube(mast.part, 'Boat', np.array([[xm_h, sg * 0.03, zh - 0.05 * (dx != 0)], [x_m + dx, yg, zsh]]), 0.0045, 4, 'iron', (True, True))
        add_tube(mast.part, 'Boat', np.array([[xm_h, 0, zh], [L - 0.04, 0, H.surf(1.0, 1.0)[2] - 0.02]]), 0.0045, 4, 'iron', (True, True))
        for dx in (0.0, -0.45):
            for sg in (1, -1): add_box(mast.part, 'Boat', (x_m + dx, sg * (H.y_inner(x_m + dx, zsh - 0.02, -0.02)), zsh - 0.04), (0.05, 0.02, 0.12), None, 'iron', 2)
    # boom with gooseneck
    zg = zsh + 0.62; G = np.array([x_m - 0.06 * (zg - zstep) / 5.0 + 0.0, 0.0, zg]); bl = 3.15
    boom = Node('boom', 'mast', G, 'boom, pivot at the gooseneck (rotate about Z to sheet)'); nodes['boom'] = boom
    bp = np.stack([np.linspace(G[0] + 0.22, G[0] - bl, 8 if Q['detail'] else 3), np.zeros(8 if Q['detail'] else 3), np.full(8 if Q['detail'] else 3, zg)], 1)
    add_tube(boom.part, 'Boat', bp, np.interp(np.linspace(0, 1, len(bp)), [0, 0.1, 0.5, 1], [0.03, 0.036, 0.034, 0.027]), Q['seg'], 'spar', (True, True))
    if Q['detail'] > 0:
        add_box(boom.part, 'Boat', G + np.array([0.04, 0, 0]), (0.11, 0.07, 0.08), None, 'iron', 0)
        add_box(boom.part, 'Boat', G + np.array([-bl + 0.1, 0, -0.07]), (0.07, 0.05, 0.07), None, 'iron', 0)
        add_tube(boom.part, 'Boat', np.array([G + np.array([-bl + 0.1, 0, -0.1]), G + np.array([-bl + 0.1, 0.0, -0.4]), G + np.array([-bl + 0.18, 0.0, -0.55])]), 0.008, 5, 'rope', (True, True))
    # sail: gaff, filled (the bulge to starboard, -Y); the rest pose hides it and shows the furled bundle
    sail = Node('sail', 'mast', G, 'gaff sail, filled; pivot at the mast axis at boom height (rotate about Z with the boom). Hidden at rest by scale ~0'); nodes['sail'] = sail
    T = G + np.array([0.06, 0, 0.12]); C = G + np.array([-bl + 0.12, 0, 0.12]); Th = G + np.array([0.05, 0, 2.45]); Pk = Th + np.array([-2.15, 0, 1.30])
    na = 14 if Q['detail'] > 1 else (8 if Q['detail'] else 3); nb = 12 if Q['detail'] > 1 else (6 if Q['detail'] else 3)
    a = np.linspace(0, 1, na); b = np.linspace(0, 1, nb); AA, BB = np.meshgrid(a, b)
    base = (1 - BB)[..., None] * ((1 - AA)[..., None] * T + AA[..., None] * C) + BB[..., None] * ((1 - AA)[..., None] * Th + AA[..., None] * Pk)
    belly = (0.30 * np.sin(np.pi * np.clip(AA, 0, 1) ** 0.9) * np.sin(np.pi * np.clip(BB, 0, 1) ** 0.85) * (1 - 0.35 * BB))
    flutter = 0.025 * np.sin(AA * 18 + BB * 3) * np.sin(np.pi * AA) if Q['detail'] > 1 else 0 * AA
    Sg = base + np.stack([0 * AA, -(belly + flutter), 0 * AA], -1)
    add_grid(sail.part, 'BoatTwo', Sg, BT.sw_uv('canvas', AA, BB), hint=np.broadcast_to(np.array([0, 1.0, 0]), Sg.shape))
    add_grid(sail.part, 'BoatTwo', Sg[:, :, :] + 0, BT.sw_uv('canvas', AA, BB), hint=np.broadcast_to(np.array([0, -1.0, 0]), Sg.shape))
    if Q['detail'] > 0: add_cyl(sail.part, 'Boat', Th + np.array([0.05, 0, 0.0]), Pk, 0.022, Q['seg'], 'spar', (True, True), 0.016)
    if Q['detail'] > 1:
        edges = [np.array([Sg[i, 0] for i in range(nb)]), np.array([Sg[0, j] for j in range(na)]), np.array([Sg[-1, j] for j in range(na)]), np.array([Sg[i, -1] for i in range(nb)])]
        for e in edges: add_tube(sail.part, 'Boat', e, 0.0085, 5, 'rope', (False, False))
        add_tube(sail.part, 'Boat', np.array([mp[-1], Pk + np.array([0, 0, 0.05])]), 0.0045, 4, 'rope', (True, True))
        add_tube(sail.part, 'Boat', np.array([mp[-1] + np.array([0, 0, -0.1]), Th + np.array([0.05, 0, 0.03])]), 0.0045, 4, 'rope', (True, True))
        # reef points: two rows of short ties hanging from the cringles
        for bb in (0.17, 0.33):
            for aa in np.linspace(0.07, 0.95, 12 if Q['detail'] > 1 else 6):
                p = (1 - bb) * ((1 - aa) * T + aa * C) + bb * ((1 - aa) * Th + aa * Pk); bel = 0.30 * math.sin(math.pi * aa ** 0.9) * math.sin(math.pi * bb ** 0.85) * (1 - 0.35 * bb)
                p = p + np.array([0, -bel, 0])
                for sgn in (-1, 1):
                    add_tube(sail.part, 'Boat', np.array([p + np.array([0, sgn * 0.02, 0.0]), p + np.array([0, sgn * 0.045, -0.07]), p + np.array([0, sgn * 0.05, -0.17])]), 0.0045, 4, 'rope', (True, True))
        # mast hoops
        for zz in np.linspace(0.25, 2.3, 5): add_tube(sail.part, 'Boat', torus_path(np.array([G[0] - 0.0, 0, G[2] + zz]) - np.array([0.06 * zz / 5, 0, 0]), 0.058, 'xy', 12), 0.007, 4, 'iron', (False, False))
    furl = Node('sail_furled', 'mast', G, 'the sail brailed up on the boom with gaskets (the rest pose shows it; hidden while sailing by scale ~0)'); nodes['sail_furled'] = furl
    fp = np.stack([np.linspace(G[0] + 0.05, G[0] - bl + 0.2, 9 if Q['detail'] else 3), np.zeros(9 if Q['detail'] else 3), np.full(9 if Q['detail'] else 3, zg + 0.10)], 1)
    fr = 0.085 + 0.025 * np.sin(np.linspace(0, 9, len(fp)) + 1.0) * (Q['detail'] > 0)
    add_tube(furl.part, 'BoatTwo', fp, fr, Q['seg'], 'canvas', (True, True))
    if Q['detail'] > 0:
        for xx in np.linspace(G[0] - 0.3, G[0] - bl + 0.4, 5): add_tube(furl.part, 'Boat', torus_path(np.array([xx, 0, zg + 0.10]), 0.092, 'yz', 12), 0.006, 4, 'rope', (False, False))
        add_cyl(furl.part, 'Boat', np.array([G[0] - 0.1, 0.07, zg + 0.24]), np.array([G[0] - 2.0, 0.09, zg + 0.22]), 0.02, 6, 'spar', (True, True), 0.015)
    # rudder and tiller on the transom
    build_rudder(H, nodes, spec, Q, 0.55, 0.36, tiller=0.95)
    extra = dict(x_r=x_r, oar_in=0.34, oar_dz=(seats[1][1] + 0.05) - (H.sheer_z(x_r) + 0.075), mast_top=ztop, boom_len=bl)
    add_seats(nodes, H, spec, seats); add_hullmask_waterline(H, nodes, spec, Q)
    return nodes, H, extra


def build_rudder(H, nodes, spec, Q, depth, chord, tiller=0.9):
    p = H.p; zt = H.zs(0.0) + 0.0; xp = -0.075 - p['Tr'] * 0.0
    zt = float(H.zs(np.array(0.0))); zbot = -spec['draft'] - depth + 0.35
    piv = np.array([xp, 0, zt - 0.05]); pin = Node('rudder_pin', 'boat', piv, 'pivot of the rudder on its pintles (rotate about Z to steer); rudder and tiller are its children'); nodes['rudder_pin'] = pin
    rd = Node('rudder', 'rudder_pin', piv, 'rudder blade'); nodes['rudder'] = rd; ti = Node('tiller', 'rudder_pin', piv, 'tiller (rotates with the rudder; lift about Y to stow)'); nodes['tiller'] = ti
    poly = np.array([[0.0, zt - 0.02], [-chord * 0.85, zt - 0.02], [-chord, zbot + 0.12], [-chord * 0.75, zbot], [-0.01, zbot], [0.0, zt - 0.02]])[:-1]
    # the blade lies in x-z, extruded in y by 38 mm
    add_prism(rd.part, 'Boat', poly, np.array([xp, 0, 0.0]), np.array([1.0, 0, 0]), np.array([0, 0, 1.0]), 0.038, 'spar')
    if Q['detail'] > 0:
        for zz in (zt - 0.12, zbot + 0.25):
            add_cyl(rd.part, 'Boat', np.array([xp, 0, zz - 0.07]), np.array([xp, 0, zz + 0.07]), 0.012, 6, 'iron')
            add_box(rd.part, 'Boat', (xp - 0.1, 0, zz), (0.22, 0.045, 0.035), None, 'iron', 0)
            add_box(rd.part, 'Boat', (xp + 0.04 + 0.0, 0, zz), (0.05, 0.05, 0.05), None, 'iron', 0)
    tp = np.array([[xp - 0.12, 0, zt + 0.05], [xp + 0.2, 0, zt + 0.12], [xp + tiller * 0.55, 0, zt + 0.22], [xp + tiller, 0, zt + 0.30]])
    tpp = np.stack([np.interp(np.linspace(0, 1, 10), np.linspace(0, 1, 4), tp[:, i]) for i in range(3)], 1)
    add_tube(ti.part, 'Boat', tpp, np.interp(np.linspace(0, 1, 10), [0, 0.7, 1], [0.03, 0.022, 0.018]), Q['seg'], 'gunwale', (True, True))
    # gudgeons on the transom
    if Q['detail'] > 0:
        for zz in (zt - 0.12, zbot + 0.25):
            add_box(nodes['hull'].part, 'Boat', (xp + 0.075, 0, zz), (0.07, 0.05, 0.035), None, 'iron', 0)


def build_work(boat, lod):
    spec = SPECS[boat]; Q = QL[lod]; H = Hull(spec); rng = np.random.default_rng(SEED + 9); nodes = {}
    root = Node('boat', None, (0, 0, 0), 'the boat; z = 0 is the waterline, +X bow, +Y port, metres'); nodes['boat'] = root
    seats = build_hull_common(H, nodes, spec, Q, rng); L = H.L; part = nodes['hull'].part
    xd = 0.60 * L; ud = H.u_at_x(xd, spec['fb'] + 0.05)
    nd = 26 if Q['detail'] > 1 else (12 if Q['detail'] else 6); us = ud + (1.0 - ud) * (0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 0.985, nd)))
    cols = 9 if Q['detail'] else 3; sy = np.linspace(-1, 1, cols); D = np.zeros((nd, cols, 3)); UVd = np.zeros((nd, cols, 2))
    for i, u in enumerate(us):
        zd = float(H.zs(u)) - 0.10; t = float(H.t_at_z(u, zd)); pt = H.surf(u, t); yin = pt[1] - 0.025
        for j, s_ in enumerate(sy): D[i, j] = (pt[0], s_ * yin, zd + 0.045 * (1 - s_ ** 2)); UVd[i, j] = BT.sw_uv('deck', (pt[0] - xd) / (L - xd), (s_ + 1) / 2)
    add_grid(part, 'Boat', D, UVd, hint=np.broadcast_to(np.array([0, 0, 1.0]), D.shape))
    # underside of the deck, a beam and the cuddy's bulkhead at the aft end of the deck
    add_grid(part, 'Boat', D - np.array([0, 0, 0.03]), UVd, hint=np.broadcast_to(np.array([0, 0, -1.0]), D.shape))
    zdk = lambda x: H.sheer_z(x) - 0.10
    x0, x1 = xd + 0.05, xd + 1.45; z0 = zdk(x1) + 0.0; wy = 0.62; hh = 0.62
    # cuddy walls (sides, front, aft with a doorway), roof with camber, windows, a hatch and a stove pipe
    for sg in (1, -1):
        add_box(part, 'Boat', ((x0 + x1) / 2, sg * wy, z0 + hh / 2 - 0.02), (x1 - x0, 0.04, hh), None, 'cabin', 0)
        if Q['detail'] > 0:
            add_box(part, 'Boat', ((x0 + x1) / 2 + 0.05, sg * (wy + 0.022), z0 + hh * 0.58), (0.38, 0.012, 0.22), None, 'glass', 0)
            add_box(part, 'Boat', ((x0 + x1) / 2 + 0.05, sg * (wy + 0.027), z0 + hh * 0.58), (0.44, 0.006, 0.28), None, 'paintw', 0, skip=((1, 1),)) if False else None
    add_box(part, 'Boat', (x1, 0, z0 + hh / 2 - 0.02), (0.04, 2 * wy, hh), None, 'cabin', 1)
    add_box(part, 'Boat', (x0, -wy * 0.62 - 0.0, z0 + hh / 2 - 0.02), (0.04, wy * 0.76, hh), None, 'cabin', 1); add_box(part, 'Boat', (x0, wy * 0.62, z0 + hh / 2 - 0.02), (0.04, wy * 0.76, hh), None, 'cabin', 1)
    add_box(part, 'Boat', (x0, 0, z0 + hh - 0.1), (0.04, wy * 0.5, 0.2), None, 'cabin', 1); add_box(part, 'Boat', (x0 + 0.25, 0, z0 + 0.02), (0.5, wy * 0.5, 0.03), None, 'floor', 0)
    add_box(part, 'Boat', (x0 + 0.3, 0, z0 + hh / 2 - 0.02), (0.02, wy * 0.5, hh * 0.9), None, 'glass', 1)
    ya = np.linspace(-1, 1, 9 if Q['detail'] else 3); xa = np.linspace(x0 - 0.08, x1 + 0.06, 6 if Q['detail'] else 3); R_ = np.zeros((len(xa), len(ya), 3)); UVr = np.zeros((len(xa), len(ya), 2))
    for i, x in enumerate(xa):
        for j, s_ in enumerate(ya): R_[i, j] = (x, s_ * (wy + 0.07), z0 + hh + 0.075 * (1 - s_ ** 2)); UVr[i, j] = BT.sw_uv('deck', (x - xa[0]) / (xa[-1] - xa[0]), (s_ + 1) / 2)
    add_grid(part, 'Boat', R_, UVr, hint=np.broadcast_to(np.array([0, 0, 1.0]), R_.shape)); add_grid(part, 'Boat', R_ - np.array([0, 0, 0.03]), UVr, hint=np.broadcast_to(np.array([0, 0, -1.0]), R_.shape))
    for sg in (1, -1):
        add_box(part, 'Boat', ((x0 + x1) / 2, sg * (wy + 0.07), z0 + hh + 0.0), (x1 - x0 + 0.14, 0.03, 0.05), None, 'gunwale', 0)
    if Q['detail'] > 0:
        add_box(part, 'Boat', (x0 + 0.5, 0.0, z0 + hh + 0.11), (0.5, 0.42, 0.06), None, 'spar', 0)
        add_cyl(part, 'Boat', (x1 - 0.25, 0.30, z0 + hh + 0.05), (x1 - 0.25, 0.30, z0 + hh + 0.50), 0.038, 8, 'iron', (True, True))
        add_cyl(part, 'Boat', (x1 - 0.25, 0.30, z0 + hh + 0.50), (x1 - 0.25, 0.30, z0 + hh + 0.56), 0.055, 8, 'iron', (True, True))
        for xx in (L - 0.75, L - 0.60):
            for sg in (1, -1): add_cyl(part, 'Boat', (xx, sg * 0.14, zdk(xx) + 0.02), (xx, sg * 0.14, zdk(xx) + 0.30), 0.04, 8, 'spar', (True, True))
        add_box(part, 'Boat', (L - 0.675, 0, zdk(L - 0.675) + 0.26), (0.24, 0.34, 0.04), None, 'spar', 1)
        add_tube(part, 'Boat', coil_path(np.array([L - 1.45, 0.0, zdk(L - 1.45) + 0.06]), 0.18, 0.10, 3.0, Q['rope_pts'] or 12, zdk(L - 1.45) + 0.06, 0.016), 0.011, 6, 'rope', (False, False)) if Q['rope_pts'] else None
    # the open cockpit: floorboards come from add_floor; crates in two stacks, a heap of net with floats, rope fenders
    zf = floor_z(spec)
    xs_ = spec['thw'][1] * L - 0.95
    for k in range(3): add_crate(part, (xs_, fit_y(H, xs_, zf + 0.5, -0.50, 0.30), zf + 0.02 + k * 0.28), (0.52, 0.36, 0.28), Q, 0.04 * (k - 1))
    for k in range(2): add_crate(part, (xs_ + 0.05, fit_y(H, xs_, zf + 0.5, 0.45, 0.30), zf + 0.02 + k * 0.28), (0.52, 0.36, 0.28), Q, -0.1 + 0.05 * k)
    xn = spec['thw'][0] * L + 0.75
    add_sphere(part, 'Boat', (xn, 0.12, zf + 0.20), (0.62, 0.50, 0.30), 'net', 14 if Q['detail'] > 1 else (8 if Q['detail'] else 5), 8 if Q['detail'] > 1 else (5 if Q['detail'] else 3), bump=0.30 if Q['detail'] else 0.0, rng=rng)
    for dx, dy in ((-0.2, -0.05), (0.15, 0.15), (0.0, 0.30)): add_sphere(part, 'Boat', (xn + dx, dy, zf + 0.46 + 0.02 * (dy > 0.1)), (0.10, 0.10, 0.10), 'buoy', 10 if Q['detail'] > 1 else (6 if Q['detail'] else 4), 6 if Q['detail'] > 1 else 3)
    if Q['detail'] > 0:
        for xf in (1.9, 3.2):
            yy = H.y_inner(xf, H.sheer_z(xf) - 0.1, -0.12) + 0.05; z_top = H.sheer_z(xf) - 0.02
            add_cyl(part, 'Boat', (xf, -yy - 0.0, z_top - 0.30), (xf, -yy, z_top - 0.02), 0.075, 8, 'rope', (True, True))
    # davit on the starboard gunwale: upright and curved arm with a block, rope and hook; pivot at its base
    xdv = xd - 0.35; zsd = H.sheer_z(xdv); ydv = -(H.y_inner(xdv, zsd - 0.02, -0.03)) + 0.12
    dv = Node('davit', 'boat', (xdv, ydv, zsd), 'davit for hauling pots and crates; pivot at its base on the starboard gunwale (rotate about Z; the working pose swings the arm outboard)'); nodes['davit'] = dv
    add_box(dv.part, 'Boat', (xdv, ydv, zsd + 0.04), (0.2, 0.2, 0.08), None, 'iron', 0)
    up = np.array([[xdv, ydv, zsd + 0.04], [xdv, ydv, zsd + 0.50], [xdv, ydv, zsd + 0.82]])
    ptp = np.stack([np.interp(np.linspace(0, 1, 8 if Q['detail'] else 3), np.linspace(0, 1, 3), up[:, i]) for i in range(3)], 1)
    add_tube(dv.part, 'Boat', ptp, np.interp(np.linspace(0, 1, len(ptp)), [0, 1], [0.05, 0.038]), Q['seg'], 'iron', (True, True))
    ang = np.linspace(0, 1.25, 10 if Q['detail'] else 4); arm = np.stack([xdv + 0.80 * np.sin(ang) * 1.0, np.full_like(ang, ydv), zsd + 0.82 + 0.45 * (1 - np.cos(ang)) * 0.5 - 0.0 * ang], -1)
    add_tube(dv.part, 'Boat', arm, np.interp(np.linspace(0, 1, len(arm)), [0, 1], [0.036, 0.026]), Q['seg'], 'iron', (False, True))
    tip = arm[-1]
    add_box(dv.part, 'Boat', tip + np.array([0, 0, -0.07]), (0.07, 0.05, 0.1), None, 'iron', 2)
    if Q['detail'] > 0:
        add_tube(dv.part, 'Boat', np.array([tip + np.array([0, 0, -0.12]), tip + np.array([0, 0, -0.55]), tip + np.array([0, 0, -0.88])]), 0.009, 5, 'rope', (True, True))
        add_tube(dv.part, 'Boat', torus_path(tip + np.array([0, 0, -0.93]), 0.04, 'xz', 10), 0.008, 5, 'iron', (False, False))
    build_rudder(H, nodes, spec, Q, 0.62, 0.42, tiller=1.0)
    extra = dict(x_r=0, oar_in=0, oar_dz=0, x_deck=xd)
    add_seats(nodes, H, spec, seats); add_hullmask_waterline(H, nodes, spec, Q, x_max=xd - 0.02)
    return nodes, H, extra


def build(boat, lod):
    if boat in ('dinghy', 'wreck'): nodes, H, extra = build_dinghy(boat, lod)
    elif boat == 'sailer': nodes, H, extra = build_sailer(boat, lod)
    else: nodes, H, extra = build_work(boat, lod)
    return nodes, H, extra


# ------------------------------------------------------------------------------------------------- the GLB writer
def to_gltf_xyz(a):
    a = np.asarray(a, float); return np.stack([a[..., 1], a[..., 2], a[..., 0]], -1)


def weld(P, N, UV, C, F, tol=1e-5):
    q = [np.round(P / tol).astype(np.int64), np.round(N * 90).astype(np.int64), np.round(UV * 4096).astype(np.int64)]
    if C is not None: q.append(np.round(C * 255).astype(np.int64))
    key = np.concatenate(q, axis=1); _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel(); order = np.argsort(first); remap = np.empty(len(first), int); remap[order] = np.arange(len(first)); idx = remap[inv]; keep = first[order]
    Fn = idx[F]; good = (Fn[:, 0] != Fn[:, 1]) & (Fn[:, 1] != Fn[:, 2]) & (Fn[:, 0] != Fn[:, 2])
    return P[keep], N[keep], UV[keep], (C[keep] if C is not None else None), Fn[good]


NODE_ORDER = ['boat', 'hull', 'hullmask', 'waterline', 'oar_l', 'oar_r', 'mast', 'boom', 'sail', 'sail_furled', 'rudder_pin', 'rudder', 'tiller', 'davit']


def far_colours(boat, spec, UV, tex_cache={}):
    key = boat
    if key not in tex_cache:
        sp = dict(ns=spec['ns'], pal=BT.PALETTES[spec['pal']], L=spec['L'], wear=spec.get('wearf', 1.0)); H = Hull(spec)
        zf = lambda U, T: H.surf(U, T)[..., 2]
        tex_cache[key] = BT.bake(sp, 0.25, SEED, zf)['color']
    img = tex_cache[key]; h, w = img.shape[:2]
    px = np.clip((UV[:, 0] * w).astype(int), 0, w - 1); py = np.clip((UV[:, 1] * h).astype(int), 0, h - 1)
    return BT.srgb_to_lin(img[py, px]).astype(np.float32)


def write_glb(path, boat, lod, pose='rest', nodes_H=None, seed=SEED):
    nodes, H, extra = nodes_H if nodes_H else build(boat, lod)
    spec = SPECS[boat]; Q = QL[lod]; textured = Q['tex'] > 0
    poses = pose_defs(boat, spec, H, extra)
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
    mats = []; mat_index = {}; images = []; textures = []; samplers = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]; tex_stats = {}
    def add_mat(name, m): mat_index[name] = len(mats); mats.append(m)
    if textured:
        pal = BT.PALETTES[spec['pal']]; sp = dict(ns=spec['ns'], pal=pal, L=spec['L'], wear=spec.get('wearf', 1.0)); zf = lambda U, T: H.surf(U, T)[..., 2]
        maps = BT.bake(sp, Q['tex'], seed, zf); jc, jn, jo = BT.encode(maps, Q['tex'])
        ids = []
        for kind, data in zip(('color', 'normal', 'orm'), (jc, jn, jo)):
            vi = add_view(data); images.append({'bufferView': vi, 'mimeType': 'image/jpeg', 'name': 'boat_%s_%s' % (boat, kind)}); textures.append({'sampler': 0, 'source': len(images) - 1}); ids.append(len(textures) - 1)
        tex_stats = {'colour_px': [int(maps['color'].shape[1]), int(maps['color'].shape[0])], 'bytes': [len(jc), len(jn), len(jo)]}
        for nm, ds in (('Boat', False), ('BoatTwo', True)):
            add_mat(nm, {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 1.0, 'roughnessFactor': 1.0, 'metallicRoughnessTexture': {'index': ids[2]}},
                         'normalTexture': {'index': ids[1], 'scale': 1.0}, 'occlusionTexture': {'index': ids[2], 'strength': 1.0}, 'doubleSided': ds,
                         'extras': {'maps': 'baseColor sRGB jpeg, normal jpeg (OpenGL), occlusion R / roughness G / metal B packed jpeg', 'atlas_px': tex_stats['colour_px']}})
    else:
        for nm, ds in (('Boat', False), ('BoatTwo', True)):
            add_mat(nm, {'name': nm, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.0, 'roughnessFactor': 0.85}, 'doubleSided': ds, 'extras': {'maps': 'vertex colours only (far level)'}})
    add_mat('HullMask', {'name': 'HullMask', 'pbrMetallicRoughness': {'baseColorFactor': [0, 0, 0, 0], 'metallicFactor': 0.0, 'roughnessFactor': 1.0}, 'alphaMode': 'BLEND', 'doubleSided': True,
                         'extras': {'depthOnly': True, 'note': 'render with colorWrite false, depthWrite true, depthTest true, renderOrder 1 (after the opaque hull, before the sea)'}})
    add_mat('Waterline', {'name': 'Waterline', 'pbrMetallicRoughness': {'baseColorFactor': [0.86, 0.9, 0.9, 0.55], 'metallicFactor': 0.0, 'roughnessFactor': 0.4}, 'alphaMode': 'BLEND', 'doubleSided': True,
                          'extras': {'note': 'flat band at z = 0 outside the hull: foam or contact ring; the page may replace the material'}})
    gnodes = []; name_idx = {}; meshes = []
    order = [n for n in NODE_ORDER if n in nodes] + sorted(n for n in nodes if n not in NODE_ORDER)
    rest = poses['rest'] if pose == 'rest' else poses.get(pose, {})
    for name in order: name_idx[name] = len(gnodes); gnodes.append({'name': name})
    stats = {'triangles': 0, 'vertices': 0, 'per_node': {}}
    spec_ex = {}
    for name in order:
        nd = nodes[name]; gn = gnodes[name_idx[name]]; par = nodes.get(nd.parent) if nd.parent else None
        rel = nd.pivot - (par.pivot if par else np.zeros(3)); pz = rest.get(name, {})
        t = np.array(pz.get('t', (0, 0, 0)), float); gn['translation'] = [float(v) for v in to_gltf_xyz(rel + t)]
        q = rot_seq(pz.get('r', [])); gn['rotation'] = [float(q[1]), float(q[2]), float(q[0]), float(q[3])]
        if 's' in pz: gn['scale'] = [float(pz['s'])] * 3
        ex = {'note': nd.note} if nd.note else {}
        if nd.parent: gnodes[name_idx[nd.parent]].setdefault('children', []).append(name_idx[name])
        gn['extras'] = ex
        if not nd.part.ch: continue
        prims = []; tri_n = 0; bymat = {}
        for (mat, P, N, UV, F, C) in nd.part.ch: bymat.setdefault(mat, []).append((P, N, UV, F, C))
        for mat, items in bymat.items():
            Pl = []; Nl = []; Ul = []; Fl = []; Cl = []; off = 0
            for P, N, UV, F, C in items:
                Pl.append(P - nd.pivot); Nl.append(N); Ul.append(UV); Fl.append(F + off); off += len(P)
                if mat in ('Boat', 'BoatTwo') and not textured: Cl.append(far_colours(boat, spec, UV))
            P = np.concatenate(Pl); N = unit(np.concatenate(Nl)); UV = np.concatenate(Ul); F = np.concatenate(Fl); C = np.concatenate(Cl) if Cl else None
            P, N, UV, C, F = weld(P, N, UV, C, F)
            if len(F) == 0: continue
            T = F.astype(np.uint16) if len(P) < 65536 else F.astype(np.uint32)
            at = {'POSITION': add_acc(to_gltf_xyz(P).astype(np.float32), 5126, 3, 34962, minmax=True)}
            n8 = np.zeros((len(N), 4), np.int8); n8[:, :3] = np.clip(np.rint(to_gltf_xyz(N) * 127), -127, 127).astype(np.int8)
            at['NORMAL'] = add_acc(n8[:, :3] if False else n8, 5120, 4, 34962, normalized=True, stride=4)
            # a VEC3 BYTE accessor with stride 4 keeps the attribute 4-byte aligned
            accs[at['NORMAL']]['type'] = 'VEC3'
            if textured and mat in ('Boat', 'BoatTwo'): at['TEXCOORD_0'] = add_acc(np.rint(np.clip(UV, 0, 1) * 65535.0).astype(np.uint16), 5123, 2, 34962, normalized=True)
            if C is not None: at['COLOR_0'] = add_acc((np.concatenate([np.clip(C, 0, 1), np.ones((len(C), 1))], 1) * 255.0 + 0.5).astype(np.uint8), 5121, 4, 34962, normalized=True)
            ia = add_acc(T.reshape(-1), 5123 if T.dtype == np.uint16 else 5125, 1, 34963)
            prims.append({'attributes': at, 'indices': ia, 'material': mat_index[mat], 'mode': 4}); tri_n += len(T); stats['vertices'] += len(P)
        if not prims: continue
        meshes.append({'name': name + '_mesh', 'primitives': prims}); gn['mesh'] = len(meshes) - 1
        if name not in ('hullmask', 'waterline'): stats['triangles'] += tri_n
        stats['per_node'][name] = tri_n
    # poses as one-keyframe animation clips (translation, rotation, scale of the nodes a pose moves; every node a pose touches in any pose is keyed in all so that clips reset each other)
    touched = sorted({n for pn in poses.values() for n in pn})
    anims = []; pose_extras = {}
    for pn in ('rest', 'sailing', 'rowing', 'beached', 'working'):
        tb = poses[pn]; chans = []; samp = []
        for n in touched:
            nd = nodes[n]; par = nodes.get(nd.parent) if nd.parent else None; rel = nd.pivot - (par.pivot if par else np.zeros(3)); pz = tb.get(n, {})
            t = to_gltf_xyz(rel + np.array(pz.get('t', (0, 0, 0)), float)); q = rot_seq(pz.get('r', [])); s = pz.get('s', 1.0)
            times = add_acc(np.array([0.0, 1.0], np.float32), 5126, 1, None, minmax=True)
            for path_, val, nc in (('translation', np.tile(t.astype(np.float32), (2, 1)), 3), ('rotation', np.tile(np.array([q[1], q[2], q[0], q[3]], np.float32), (2, 1)), 4), ('scale', np.full((2, 3), s, np.float32), 3)):
                out = add_acc(val, 5126, nc, None); samp.append({'input': times, 'output': out, 'interpolation': 'LINEAR'}); chans.append({'sampler': len(samp) - 1, 'target': {'node': name_idx[n], 'path': path_}})
        anims.append({'name': 'pose_' + pn, 'samplers': samp, 'channels': chans, 'extras': {'note': 'sets the pose %s (one keyframe held 1 s)' % pn}})
        pose_extras[pn] = {n: {'translate_m': list(map(float, v.get('t', (0, 0, 0)))), 'rotate': [[a, float(d)] for a, d in v.get('r', [])], 'scale': float(v.get('s', 1.0))} for n, v in tb.items()}
    # loopable clips: rowing stroke and rudder swing
    def clip(name, nodes_, dur, keys, note):
        samp = []; chans = []
        for n, axis, degs in nodes_:
            times = np.linspace(0, dur, len(degs)).astype(np.float32); ti = add_acc(times, 5126, 1, None, minmax=True)
            base = poses['rowing' if name == 'row' else 'rest'].get(n, {}).get('r', [])
            qs = np.array([[rot_seq(list(base) + [(axis, d)])[i] for i in (1, 2, 0, 3)] for d in degs], np.float32)
            out = add_acc(qs, 5126, 4, None); samp.append({'input': ti, 'output': out, 'interpolation': 'LINEAR'}); chans.append({'sampler': len(samp) - 1, 'target': {'node': name_idx[n], 'path': 'rotation'}})
        anims.append({'name': name, 'samplers': samp, 'channels': chans, 'extras': {'note': note, 'duration': dur}})
    if 'oar_l' in nodes: clip('row', [('oar_l', 'z', [-14, 14, -14]), ('oar_r', 'z', [14, -14, 14])], 2.4, None, 'a rowing stroke: both oars swing fore and aft about the rowlock, loopable')
    if 'rudder_pin' in nodes: clip('rudder_swing', [('rudder_pin', 'z', [0, -14, 0, 14, 0])], 4.0, None, 'rudder swings 14 degrees each way, loopable')
    scene_ex = {'boat': boat, 'title': spec['title'], 'lod': lod, 'pose': pose, 'frame': 'glTF: +Y up, +Z forward (the boat bow points +Z), +X left (port); metres; y = 0 is the design waterline', 'triangles': stats['triangles'],
                'length_m': spec['L'] + spec['Tr'] * 0 if True else 0, 'beam_m': spec['B'], 'draft_m': spec['draft'], 'freeboard_m': spec['fb'], 'strakes_per_side': spec['ns'],
                'waterline': {'y': 0.0, 'note': 'float the boat so that y = 0 of the file lies on the sea surface (draft below, freeboard above)'},
                'hullmask': {'node': 'hullmask', 'material': 'HullMask', 'use': 'depth-only: colorWrite false, depthWrite true, renderOrder 1'},
                'poses': pose_extras, 'default_pose': 'rest', 'clips': [a['name'] for a in anims],
                'seats': [n for n in order if n.startswith('seat_')], 'ground_y_when_beached': -spec['draft'],
                'textures': tex_stats if textured else 'vertex colours only', 'node_tree': {n: nodes[n].parent for n in order}}
    scene_ex.update({'mast_top_m': extra.get('mast_top')} if boat == 'sailer' else {})
    doc = {'asset': {'version': '2.0', 'generator': 'boat_model.py (living-islands)'}, 'scene': 0, 'scenes': [{'name': 'boat', 'nodes': [name_idx['boat']], 'extras': scene_ex}], 'nodes': gnodes, 'meshes': meshes, 'materials': mats,
           'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(binbuf)}], 'animations': anims, 'samplers': samplers if images else []}
    if images: doc['images'] = images; doc['textures'] = textures
    else: doc.pop('samplers')
    js = json.dumps(doc, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4); bb = bytes(binbuf) + b'\x00' * ((4 - len(binbuf) % 4) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\x00') + bb
    with open(path, 'wb') as f: f.write(data)
    stats['bytes'] = len(data); stats['textures'] = tex_stats; stats['hero_tris_masks'] = {k: v for k, v in stats['per_node'].items() if k in ('hullmask', 'waterline')}
    return stats


def out_name(boat, lod, pose='rest'): return 'boat_%s_%s%s.glb' % (boat, lod, '' if pose == 'rest' else '_' + pose)


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Boat kit GLB files.')
    ap.add_argument('--out', required=True); ap.add_argument('--boat', default='all'); ap.add_argument('--lod', default='all'); ap.add_argument('--pose', default='rest')
    a = ap.parse_args(argv); a.boats = list(BOATS) if a.boat == 'all' else [a.boat]; a.lods = list(LODS) if a.lod == 'all' else [a.lod]
    return a


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True); rp = os.path.join(a.out, 'boat_report.json'); rep = {}
    if os.path.exists(rp):
        try: rep = json.load(open(rp))
        except Exception: rep = {}
    for b in a.boats:
        for lod in a.lods:
            fn = os.path.join(a.out, out_name(b, lod, a.pose)); st = write_glb(fn, b, lod, a.pose)
            rep[os.path.basename(fn)] = st; print('GLB', fn, 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1), flush=True)
    with open(rp, 'w') as f: json.dump(dict(sorted(rep.items())), f, indent=1)


if __name__ == '__main__':
    main()
