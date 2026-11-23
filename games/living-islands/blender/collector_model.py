"""BEACH COLLECTOR, HERO MODEL (design A, the low tortoise, with design D's tip-up shell). See COLLECTOR_MODEL.md.
Headless:  blender -b --python collector_model.py -- --out DIR [--lod hero|live|far|all] [--pose rest|sun|grab|park]
Pure python + numpy: the geometry, the weathering (baked into vertex colours and one small detail texture) and the glTF 2.0 binary writer are all in this file, so it also runs under plain python3 (python3 collector_model.py --out DIR). Blender is only needed for the pictures (collector_shots.py).
Frame while building: +X forward, +Y left, +Z up, metres, ground at z = 0. The GLB is written in the glTF frame (Y up, +Z forward, +X left): (x, y, z) -> (y, z, x).
Every moving part is its own named node with its pivot at the joint, so the live page can rotate it by name (see NODES and AXES). Parts that other family members reuse are separate functions:
part_tracks, part_lamp, part_shell_half (and shell_cells), part_hopper, part_head, part_arm, part_chassis; the weathering is bake_colour().
Original design, no maker names, no lettering, no eyes: a head pod with one dark visor band, a small side sensor and one amber lamp. Deterministic (seeded)."""
import sys, os, math, json, struct, zlib, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import collector_sheet as CS      # primitives (rounded boxes, cylinders, hull, tread helpers), read-only reuse of the concept sheet's helpers

LODS = ('hero', 'live', 'far')
POSES = ('rest', 'sun', 'grab', 'park')
BUDGET = {'hero': (15000, 26000), 'live': (3000, 5200), 'far': (500, 1100)}          # triangles, (min, max)
SIZE_KB = {'hero': 1500, 'live': 400, 'far': 100}
LEN_M, TALL_M = 1.0, 0.58

# ------------------------------------------------------------------------------------------------- level of detail settings
LOD = {
    'hero': dict(pitch=0.034, links=True, guide=True, hub_bolts=8, dome=(28, 15), dome_in=(8, 4), cells=(0, 0, 2), rim_bolts=13, litter=12, tex=True, seg=12, wear_decals=True, rods=8, fingers=True, fine=True, circ=40, simple=False, texn=512),
    'live': dict(pitch=0.075, links=False, guide=False, hub_bolts=0, dome=(16, 10), dome_in=(0, 0), cells=(0, 0, 1), rim_bolts=0, litter=0, tex=True, seg=8, wear_decals=False, rods=5, fingers=True, fine=False, circ=16, simple=False, texn=256),
    'far': dict(pitch=0.0, links=False, guide=False, hub_bolts=0, dome=(9, 5), dome_in=(0, 0), cells=(0, 0, 0), rim_bolts=0, litter=0, tex=False, seg=6, wear_decals=False, rods=4, fingers=False, fine=False, circ=8, simple=True, texn=0),
}

# ------------------------------------------------------------------------------------------------- materials: key -> (glTF material, base colour (linear rgb))
MATS = {
    'paint': ('Paint', (0.085, 0.185, 0.130)), 'paint2': ('Paint', (0.070, 0.155, 0.112)), 'patch': ('Paint', (0.50, 0.27, 0.06)), 'arm': ('Paint', (0.62, 0.34, 0.07)), 'mark': ('Paint', (0.62, 0.60, 0.52)),
    'decal': ('Paint', (0.28, 0.095, 0.035)),
    'guard': ('Metal', (0.11, 0.115, 0.12)), 'metal': ('Metal', (0.15, 0.15, 0.155)), 'hub': ('Metal', (0.22, 0.22, 0.22)), 'bolt': ('Metal', (0.115, 0.098, 0.088)),
    'link': ('Rubber', (0.04, 0.04, 0.045)), 'rubber': ('Rubber', (0.026, 0.026, 0.03)),
    'grime': ('Grime', (0.012, 0.012, 0.013)), 'frame': ('Grime', (0.020, 0.024, 0.030)),
    'cell': ('Cell', (0.018, 0.038, 0.090)), 'visor': ('Lens', (0.012, 0.016, 0.02)), 'lens': ('Lens', (0.02, 0.028, 0.034)), 'lamp': ('Lamp', (0.9, 0.45, 0.05)),
    'tape': ('Cord', (0.52, 0.47, 0.33)), 'twine': ('Cord', (0.30, 0.20, 0.10)), 'sand': ('Cord', (0.26, 0.19, 0.10)),
    'lit_blue': ('Plastic', (0.04, 0.12, 0.30)), 'lit_orange': ('Plastic', (0.55, 0.2, 0.04)), 'lit_white': ('Plastic', (0.55, 0.55, 0.5)),
    'lit_glass': ('Plastic', (0.04, 0.22, 0.14)), 'lit_red': ('Plastic', (0.40, 0.05, 0.04)),
}
GLTF_MATS = {   # name: (metallic, roughness, texture name or None, emissive rgb or None)
    'Paint': (0.0, 0.78, 'paint', None), 'Metal': (0.55, 0.58, 'dirt', None), 'Rubber': (0.0, 0.95, 'dirt', None), 'Grime': (0.0, 0.95, None, None),
    'Cell': (0.05, 0.55, None, None), 'Lens': (0.0, 0.28, None, None), 'Lamp': (0.0, 0.3, None, (1.0, 0.52, 0.06)), 'Cord': (0.0, 1.0, None, None), 'Plastic': (0.0, 0.5, 'dirt', None),
}
# the fixed look of the one machine; seed changes the dirt per machine, not the design
SEED = 7
SAND = np.array((0.26, 0.19, 0.10)); RUST = np.array((0.28, 0.095, 0.035)); SALT = np.array((0.80, 0.79, 0.72)); BARE = np.array((0.30, 0.29, 0.27))


# ------------------------------------------------------------------------------------------------- noise (value noise, vectorised, deterministic)
def _h3(ix, iy, iz, seed):
    h = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + iz.astype(np.int64) * 2147483629 + int(seed) * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF) / float(0xFFFFFF)

def vnoise(P, seed=0):
    P = np.asarray(P, float); fl = np.floor(P); f = P - fl; u = f * f * (3 - 2 * f); ix, iy, iz = fl[:, 0], fl[:, 1], fl[:, 2]
    out = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (u[:, 0] if dx else 1 - u[:, 0]) * (u[:, 1] if dy else 1 - u[:, 1]) * (u[:, 2] if dz else 1 - u[:, 2])
                out = out + w * _h3(ix + dx, iy + dy, iz + dz, seed)
    return out

def fbm(P, seed=0, octaves=3):
    P = np.asarray(P, float); a = 0.5; tot = 0.0; norm = 0.0
    for o in range(octaves):
        tot = tot + a * vnoise(P * (2.0 ** o), seed + 17 * o); norm += a; a *= 0.5
    return tot / norm

def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)

def mixc(a, b, t):
    t = np.asarray(t, float)[:, None] if np.ndim(t) else t
    return a * (1 - t) + b * t


# ------------------------------------------------------------------------------------------------- the builder: the concept sheet's Builder plus per-vertex extras
class MB(CS.Builder):
    """collects geometry per (material key, smooth). Besides the vertices it remembers for every vertex an edge value (0 flat, 1 sharp rim, used for paint wear) and a UV mode."""
    def __init__(self):
        super().__init__(); self.x = {}; self._kind = 'box'; self._mode = 0

    def _put(self, mat, smooth, v, f, M):
        super()._put(mat, smooth, v, f, M)
        u = np.abs(np.asarray(v, float) * 2.0)
        if self._kind == 'sq':
            n = u ** 6; nn = n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9); e = np.clip((1.0 - nn.max(1)) * 1.8, 0, 1)
        elif self._kind == 'cyl':
            e = ((np.hypot(u[:, 0], u[:, 1]) > 0.95) & (u[:, 2] > 0.95)).astype(float) * 0.6
        else:
            e = np.zeros(len(u))
        self.x.setdefault((mat, smooth), []).append((e, np.full(len(u), self._mode, np.int8), None))

    def _k(self, kind, fn, *a, **kw):
        self._kind = kind; fn(*a, **kw); self._kind = 'box'

    def box(self, mat, p, s, r=(0, 0, 0), skip=(), **kw):
        """a box; skip = indices of faces not to build (0 -z, 1 +z, 2 -y, 3 +x, 4 +y, 5 -x of the box's own frame), for faces nobody can see"""
        v, f = CS.unit_cube(); f = [q for i, q in enumerate(f) if i not in skip]; self._kind = 'box'; self._put(mat, False, v, f, CS.XF(p, s, r, **kw))
    def sq(self, *a, **kw): self._k('sq', super().sq, *a, **kw)
    def cyl(self, *a, **kw): self._k('cyl', super().cyl, *a, **kw)
    def rod(self, *a, **kw): self._k('cyl', super().rod, *a, **kw)
    def prism(self, *a, **kw): self._k('box', super().prism, *a, **kw)

    def raw(self, mat, smooth, verts, faces, edge=None, mode=0, normals=None):
        """custom geometry in world coordinates. normals (optional) are used as given."""
        verts = np.asarray(verts, float); self._kind = 'box'
        bk = self.buckets.setdefault((mat, smooth), [[], [], 0])
        bk[0].append(verts); bk[1].extend([tuple(i + bk[2] for i in q) for q in faces]); bk[2] += len(verts)
        self.x.setdefault((mat, smooth), []).append((np.zeros(len(verts)) if edge is None else np.asarray(edge, float), (np.full(len(verts), mode, np.int8) if np.ndim(mode) == 0 else np.asarray(mode, np.int8)),
                                                     None if normals is None else np.asarray(normals, float)))


class Node:
    def __init__(self, name, parent, pivot, axes=None, note=''):
        self.name = name; self.parent = parent; self.pivot = np.array(pivot, float); self.b = MB(); self.axes = axes or {}; self.note = note; self.q = (0.0, 0.0, 0.0, 1.0); self.cells = 0; self.centres = []


# ------------------------------------------------------------------------------------------------- small maths
def quat_axis(axis, deg):
    a = math.radians(deg) / 2.0; s = math.sin(a); v = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[axis]
    return (v[0] * s, v[1] * s, v[2] * s, math.cos(a))

def quat_mul(p, q):
    px, py, pz, pw = p; qx, qy, qz, qw = q
    return (pw * qx + px * qw + py * qz - pz * qy, pw * qy - px * qz + py * qw + pz * qx, pw * qz + px * qy - py * qx + pz * qw, pw * qw - px * qx - py * qy - pz * qz)

def rot_seq(seq):
    q = (0.0, 0.0, 0.0, 1.0)
    for ax, d in seq: q = quat_mul(q, quat_axis(ax, d))
    return q


# ------------------------------------------------------------------------------------------------- shared dimensions (the family keeps these)
TRACK_Y = 0.25; TRACK_W = 0.13
WHEELS = [(-0.26, 0.112, 0.10), (0.285, 0.127, 0.115)]       # sprocket (rear), idler (front, a little bigger and higher: the nose of the tread climbs)
SHELL = dict(xc=-0.05, a=0.34, b=0.31, y0=0.045, c=0.38, z0=0.26, e1=1.3, e2=0.9)
HINGE = np.array([0.25, 0.0, 0.27])
SHOULDER = np.array([0.03, 0.0, 0.31])
ARM_L1, ARM_L2 = 0.30, 0.28
ELBOW_STOW = SHOULDER + np.array([-ARM_L1, 0, 0]); WRIST_STOW = ELBOW_STOW + np.array([ARM_L2, 0, 0])
ARM_DY = 0.022               # upper arm runs in the plane y = +ARM_DY, the forearm in y = -ARM_DY
HEAD_PIVOT = np.array([0.335, 0.0, 0.305])
HOP = dict(x0=-0.55, x1=-0.385, w=0.38, z0=0.15, z1=0.40)
LAMP_AT = np.array([0.395, 0.0, 0.370])
GRAB_TARGET = (0.575, 0.25, 0.115)      # where the fingertips close in the grab pose (a lifted bottle)


def bolts(b, items, d=0.016, h=0.01, mat='bolt'):
    for p in items: b.cyl(mat, p, d, h, seg=6)

def bolts_x(b, items, d=0.016, h=0.01, mat='bolt', facing=1):
    for p in items: b.cyl(mat, p, d, h, r=(0, 90, 0), seg=6)

def bolts_y(b, items, d=0.016, h=0.01, mat='bolt'):
    for p in items: b.cyl(mat, p, d, h, r=(90, 0, 0), seg=6)


# ------------------------------------------------------------------------------------------------- part: tracks (shared by every family member)
def track_loop(wheels, pitch, circ=40):
    pts = [(x + r * math.cos(a), z + r * math.sin(a)) for x, z, r in wheels for a in np.linspace(0, 2 * math.pi, circ, endpoint=False)]
    poly = CS.hull2d(pts); total = float(np.linalg.norm(np.roll(poly, -1, axis=0) - poly, axis=1).sum())
    n = max(8, int(round(total / pitch))); loop, _ = CS.resample_loop(poly, n)
    return poly, loop

def part_tracks(nd, side, L, wheels=WHEELS, yc=TRACK_Y, width=TRACK_W, dent=0.0):
    """one tracked side into node nd (pivot at the track centre). hero: real tread links (pad, cleat, guide tooth), side plates, sprocket and idler hubs with bolts. live: a solid belt plus cleats. far: the belt only."""
    b = nd.b; y = side * yc; poly, loop = track_loop(wheels, L['pitch'] if L['pitch'] else 0.5, L['circ'])
    if L['links']:
        pitch = L['pitch']; thick = 0.014; cleat = 0.014
        for k, (p, t) in enumerate(loop):
            ang = -math.degrees(math.atan2(t[1], t[0])); nrm = np.array([t[1], -t[0]]); c = p - nrm * thick / 2
            b.box('link', (c[0], y, c[1]), (pitch * 0.92, width, thick), (0, ang, 0), skip=(1,))
            c2 = p + nrm * cleat / 2 - nrm * 0.002; tv = np.array([t[0], t[1]])
            for sg_ in (-1, 1):
                c2b = c2 + tv * sg_ * pitch * 0.24; b.box('rubber', (c2b[0], y, c2b[1]), (pitch * 0.15, width * 0.94, cleat), (0, ang, 0), skip=(1,))
            if L['guide']:
                c3 = p - nrm * (thick + 0.007)
                b.box('metal', (c3[0], y, c3[1]), (pitch * 0.30, 0.026, 0.014), (0, ang, 0), skip=(0,))
    else:
        # a solid belt: the hull outline as a slab between two thin plates, with a cleat every few pitches on the outside (live) or none (far)
        inner = CS.hull2d([(x + (r - 0.012) * math.cos(a), z + (r - 0.012) * math.sin(a)) for x, z, r in wheels for a in np.linspace(0, 2 * math.pi, 18, endpoint=False)])
        b.prism('link', poly, y - width / 2 + 0.004, y + width / 2 - 0.004)
        if L['pitch']:
            for k, (p, t) in enumerate(loop):
                ang = -math.degrees(math.atan2(t[1], t[0])); nrm = np.array([t[1], -t[0]]); c2 = p + nrm * 0.006
                b.box('rubber', (c2[0], y, c2[1]), (L['pitch'] * 0.30, width * 0.94, 0.012), (0, ang, 0))
    if not L['links']:                                          # live and far: a solid belt with two thin guard plates and the end hubs
        inner = CS.hull2d([(x + (r - 0.028) * math.cos(a), z + (r - 0.028) * math.sin(a)) for x, z, r in wheels for a in np.linspace(0, 2 * math.pi, 20, endpoint=False)])
        b.prism('guard', inner, y - width / 2 - 0.007, y - width / 2 + 0.004); b.prism('guard', inner, y + width / 2 - 0.004, y + width / 2 + 0.007)
        for x, z, r in (wheels if not L['simple'] else ()):
            for sg in (-1, 1): b.cyl_y('hub', (x, y + sg * (width / 2 + 0.012), z), r * 1.15, 0.016, seg=L['seg'])
    else:
        # the running gear seen through the open side: sprocket and idler drums, four road wheels, and a narrow frame bar on each side joining the axles
        (xs_, zs_, rs_), (xi_, zi_, ri_) = wheels[0], wheels[1]; seg = L['seg']; w_in = width - 0.036
        b.cyl_y('metal', (xs_, y, zs_), 2 * (rs_ - 0.016), w_in, seg=seg + 4); b.cyl_y('metal', (xi_, y, zi_), 2 * (ri_ - 0.016), w_in, seg=seg + 4)
        for xr in (-0.135, -0.03, 0.075, 0.18):
            b.cyl_y('rubber', (xr, y, 0.065), 0.074, width - 0.05, seg=seg)
        for sg in (-1, 1):
            ys = y + sg * (width / 2 + 0.002)
            ang = math.degrees(math.atan2(zi_ - zs_, xi_ - xs_)); L_ = math.hypot(xi_ - xs_, zi_ - zs_)
            b.box('guard', ((xs_ + xi_) / 2, ys, (zs_ + zi_) / 2 - 0.012), (L_, 0.012, 0.034), (0, -ang, 0))
            for xr in (-0.135, -0.03, 0.075, 0.18): b.cyl_y('hub', (xr, ys + sg * 0.003, 0.065), 0.044, 0.012, seg=10)
            for x, z, r in wheels:
                b.cyl_y('hub', (x, ys + sg * 0.004, z), r * 1.05, 0.014, seg=seg)
                for k in range(L['hub_bolts']):
                    a = 2 * math.pi * k / L['hub_bolts'] + (0.3 if sg > 0 else 0.0)
                    b.cyl_y('bolt', (x + 0.60 * r * 0.78 * math.cos(a), ys + sg * 0.010, z + 0.60 * r * 0.78 * math.sin(a)), 0.011, 0.009, seg=6)
                b.cyl_y('bolt', (x, ys + sg * 0.010, z), r * 0.30, 0.012, seg=6 if seg > 6 else 5)
            for xr in (-0.135, -0.03, 0.075, 0.18): b.cyl_y('metal', (xr, ys + sg * 0.009, 0.065), 0.018, 0.010, seg=6)
    if dent:
        b.box('guard', (wheels[1][0] + 0.02, y, wheels[1][1] + wheels[1][2] * 0.55), (0.12, width + 0.03, 0.022), (0, dent, 0))
    if L['fine']:                                               # sand packed against the sprocket end
        b.sq('sand', (wheels[0][0] - 0.07, y + side * 0.03, 0.025), (0.16, 0.12, 0.06), (0, 0, 20 * side), e1=0.9, e2=0.9, nu=4, nv=8, smooth=True, half=True)

# ------------------------------------------------------------------------------------------------- part: lamp (the one status lamp, shared)
def part_lamp(nd, at, L, stalk=0.032, d=0.05):
    """the lamp: a short stalk, a bezel ring, one amber dome (the only emissive material). nd pivot is the base."""
    b = nd.b; x, y, z = at
    if L['simple']:
        b.sq('lamp', (x, y, z + stalk), (d * 1.3, d * 1.3, d * 1.6), e1=0.9, e2=0.9, nu=2, nv=5, smooth=True, half=True); return
    b.rod('metal', (x, y, z), (x, y, z + stalk), 0.02, 0.02, seg=6)
    b.cyl('metal', (x, y, z + stalk), d * 1.3, 0.014, seg=L['seg'])
    b.sq('lamp', (x, y, z + stalk + 0.007), (d, d, d * 1.4), e1=0.9, e2=0.9, nu=5 if L['fine'] else (2 if L['simple'] else 3), nv=10 if L['fine'] else (6 if L['simple'] else 7), smooth=True, half=True)

# ------------------------------------------------------------------------------------------------- part: shell (two tip-up halves)
def dome_z(x, y, S=SHELL, gd=0.16, gw=0.05):
    dx = np.abs((x - S['xc']) / S['a']); dy = np.abs(y / S['b'])
    s = (dx ** (2.0 / S['e2']) + dy ** (2.0 / S['e2'])) ** S['e2']
    return S['c'] * np.clip(1.0 - s, 0, None) ** (S['e1'] / 2.0) * (1.0 - gd * np.exp(-((y - S['y0']) / gw) ** 2)), s

def _grid_normals(V, F):
    N = np.zeros_like(V)
    for q in F:
        t = [q[0], q[1], q[2]]; n = np.cross(V[t[1]] - V[t[0]], V[t[2]] - V[t[0]]); N[list(q)] += n
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)

def _arc_pick(t, pts, n):
    """n parameter values from t (dense, ascending) whose 3D points pts are evenly spaced along the curve"""
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)]); targets = np.linspace(0, cum[-1], n)
    return np.interp(targets, cum, t)

def shell_surface(S, nx, nt):
    """the outer surface of one half (the +y half), a grid of x columns by plan rows from the slot to the rim, spaced evenly along the surface so that the quads are nearly square.
    Returns world verts, quads, per-vertex edge, the index grid, the x of each column and the y of each row per column."""
    xe = S['a'] * 0.985; dense = np.linspace(-xe, xe, 400) + S['xc']; yref = 0.5 * (S['y0'] + S['b'] * 0.9)
    zr, _ = dome_z(dense, np.full(400, yref), S); pts = np.stack([dense, np.full(400, yref), zr], 1)
    xs = _arc_pick(dense, pts, nx); V = np.zeros((nx, nt, 3)); E = np.zeros((nx, nt)); YS = np.zeros((nx, nt))
    for i, x in enumerate(xs):
        ym = S['b'] * max(1 - abs((x - S['xc']) / S['a']) ** (2 / S['e2']), 1e-6) ** (S['e2'] / 2)
        dy = np.linspace(S['y0'], ym, 300); zz, _ = dome_z(np.full(300, x), dy, S); ys = _arc_pick(dy, np.stack([np.full(300, x), dy, zz], 1), nt)
        z, _ = dome_z(np.full(nt, x), ys, S); V[i, :, 0] = x; V[i, :, 1] = ys; V[i, :, 2] = S['z0'] + z; YS[i] = ys
        E[i, nt - 1] = 1.0; E[i, 0] = 0.55
        if i in (0, nx - 1): E[i, :] = 0.8
    verts = V.reshape(-1, 3); idx = np.arange(nx * nt).reshape(nx, nt)
    quads = [(idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]) for i in range(nx - 1) for j in range(nt - 1)]
    return verts, quads, E.ravel(), idx, xs, YS

def shell_cells(b, S, V3, idx, nx, nt, sub, z_off=0.0035, inset=0.09, rows=None):
    """one raised solar cell on every grid quad of the rows given (they follow the dome, sub x sub small quads each); returns the cell count and the centres"""
    n = 0; centres = []; rows = range(2, nt - 3) if rows is None else rows
    for i in range(3, nx - 4):
        for j in rows:
            c = [V3[idx[i, j]], V3[idx[i + 1, j]], V3[idx[i + 1, j + 1]], V3[idx[i, j + 1]]]
            if min(np.linalg.norm(c[1] - c[0]), np.linalg.norm(c[3] - c[0])) < 0.018: continue
            g = np.linspace(inset, 1 - inset, sub + 1); Vv = []; F = []
            for u in g:
                for v in g:
                    p = (c[0] * (1 - u) + c[1] * u) * (1 - v) + (c[3] * (1 - u) + c[2] * u) * v
                    zz, _ = dome_z(np.array([p[0]]), np.array([p[1]]), S); Vv.append((p[0], p[1], S['z0'] + zz[0] + z_off))
            for u in range(sub):
                for v in range(sub):
                    a = u * (sub + 1) + v; F.append((a, a + sub + 1, a + sub + 2, a + 1))
            b.raw('cell', False, Vv, F); n += 1; centres.append(((c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2))
    return n, centres

def stain(b, p0, nrm, length, width, side=(1.0, 0.0, 0.0)):
    """a rust run: a small strip that starts under a fixing and runs down the surface, strongest at the top and in the middle, fading into the paint at the sides and the foot (vertex colours do the fade)."""
    p0 = np.array(p0, float); nrm = np.array(nrm, float); side = np.array(side, float); V = []; E = []
    for r in (0.0, 0.22, 0.55, 1.0):
        for c in (-1, 0, 1):
            w = width * (1.0 - 0.5 * r) * (1.0 if r < 1 else 0.55)
            V.append(p0 + side * c * w + np.array([0, 0, -length * r]) + nrm * 0.0013); E.append(min(1.0, max(abs(c) * 0.9, r ** 1.5)))
    F = [(i * 3 + j, i * 3 + j + 1, (i + 1) * 3 + j + 1, (i + 1) * 3 + j) for i in range(3) for j in range(2)]
    n = np.cross(V[1] - V[0], V[3] - V[0])
    if np.dot(n, nrm) < 0: F = [tuple(reversed(q)) for q in F]
    b.raw('decal', False, V, F, edge=E)

def surf_y_at(S, x, z):
    """the plan y on the outer surface of a half at column x and absolute height z (nearest of a dense sample)"""
    ym = S['b'] * max(1 - abs((x - S['xc']) / S['a']) ** (2 / S['e2']), 1e-6) ** (S['e2'] / 2); ys = np.linspace(S['y0'], ym, 500); zz, _ = dome_z(np.full(500, x), ys, S)
    return float(ys[int(np.argmin(np.abs(S['z0'] + zz - z)))])

def part_shell_half(nd, side, L, seed, patch=False, crack=False, tape_strip=False):
    """one half of the domed solar shell, hinged at the front. nd pivot = the hinge. Closed solid: outer dome, the wall facing the arm slot, a flat underside. The cells are separate raised quads."""
    S = SHELL; b = nd.b; nx, nt = L['dome']
    V, Q, E, idx, xs, YS = shell_surface(S, nx, nt)
    N = _grid_normals(V, [(q[0], q[1], q[2]) for q in Q])
    qall = Q
    zone = np.zeros(nx * nt, bool)
    if L['cells'][2]:
        for i in range(3, nx - 4):
            for j in range(2, nt - 3): zone[idx[i, j]] = zone[idx[i + 1, j]] = zone[idx[i + 1, j + 1]] = zone[idx[i, j + 1]] = True
    sgn = side
    def put(mat, smooth, verts, quads, edge, normals=None, mode=0, flip=False):
        v = verts.copy(); nrm = None if normals is None else normals.copy(); f = [tuple(q) for q in quads]
        if sgn < 0:
            v[:, 1] *= -1
            if nrm is not None: nrm[:, 1] *= -1
            f = [tuple(reversed(q)) for q in f]
        if flip: f = [tuple(reversed(q)) for q in f]
        b.raw(mat, smooth, v, f, edge, mode, nrm)
    put('paint', True, V, qall, E, N, mode=np.where(zone, 3, 1))
    # the wall that faces the arm slot, and the flat underside
    ti = idx[:, 0]; top = V[ti]; base = top.copy(); base[:, 2] = S['z0']
    wv = np.concatenate([top, base]); nx_ = len(top); wq = [(i + 1, i, nx_ + i, nx_ + i + 1) for i in range(nx_ - 1)]
    wn = np.tile(np.array([0.0, -1.0, 0.0]), (len(wv), 1)); put('paint2', False, wv, wq, np.r_[np.full(nx_, 0.3), np.full(nx_, 0.9)], wn)
    rim = V[idx[:, -1]]; loop = np.concatenate([base[:, :], rim[::-1][1:-1] * np.array([1, 1, 0]) + np.array([0, 0, S['z0']])])
    cen = np.array([S['xc'], (S['y0'] + S['b']) / 2, S['z0']]); bv = np.concatenate([loop, cen[None]]); c = len(loop)
    put('frame', False, bv, [(c, (k + 1) % c, k) for k in range(c)], np.zeros(len(bv)), mode=2)
    # the solar cells
    if L['cells'][2]:
        cb = MB(); n, centres = shell_cells(cb, S, V, idx, nx, nt, L['cells'][2])
        for (m, sm), bk in cb.buckets.items():
            vv = np.concatenate(bk[0]); ff = bk[1]
            if sgn < 0: vv = vv * np.array([1, -1, 1]); ff = [tuple(reversed(q)) for q in ff]
            b.raw(m, sm, vv, ff, None, 0)
        nd.cells = n; nd.centres = [(cx, sgn * cy) for cx, cy in centres]
    # rim bolts, a bit of tape, a repair patch in the wrong colour, a cracked cover held with tape
    def surf(x, y, off=0.0):
        z, _ = dome_z(np.array([x]), np.array([y]), S); return np.array([x, sgn * y, S['z0'] + z[0] + off])
    if L['rim_bolts']:
        for k in range(L['rim_bolts']):
            x = S['xc'] + S['a'] * 0.90 * math.sin(-math.pi / 2 * 0.95 + math.pi * 0.95 * k / (L['rim_bolts'] - 1)); y = surf_y_at(S, x, S['z0'] + 0.045)
            b.cyl('bolt', (x, sgn * (y + 0.0012), S['z0'] + 0.045), 0.015, 0.006, r=(90, 0, 0), seg=6)
    if patch:
        p = surf(S['xc'] - 0.17, 0.215, 0.002); b.box('patch', tuple(p + np.array([0, 0, 0.0])), (0.15, 0.115, 0.007), (side * 7, 5, 8))
        for dx, dy in (((-0.066, -0.048), (0.066, -0.048), (-0.066, 0.048), (0.066, 0.048)) if L['fine'] else ()):
            b.cyl('bolt', tuple(p + np.array([dx, dy * side, 0.006])), 0.011, 0.006, seg=6)
    if tape_strip:
        p = surf(S['xc'] + 0.08, 0.20, 0.003); b.box('tape', tuple(p), (0.19, 0.045, 0.004), (side * 9, 14, 24))
    if crack and nd.centres:
        cx, cy = nd.centres[min(len(nd.centres) // 2 + 1, len(nd.centres) - 1)]; p = surf(cx, abs(cy), 0.009)
        for a in (20, 75, 130, 170):
            r = math.radians(a); q = p + np.array([0.034 * math.cos(r), side * 0.026 * math.sin(r), 0.0]); b.rod('grime', tuple(p), tuple(q), 0.0035, 0.0025, seg=3)
        b.box('tape', tuple(p + np.array([0, 0, 0.002])), (0.07, 0.016, 0.003), (0, 0, 35))
    # rust runs below the rim bolts, lying on the dome (every row is placed on the surface at its own height)
    if L['wear_decals']:
        for k, f in enumerate((0.12, 0.3, 0.52, 0.7, 0.88)):
            x = S['xc'] + S['a'] * 0.9 * math.sin(-math.pi / 2 * 0.95 + math.pi * 0.95 * f); ln = 0.032 + 0.012 * ((k * 7 + seed) % 3); w = 0.006 + 0.0015 * (k % 2)
            V3 = []; E3 = []
            for r in (0.0, 0.25, 0.6, 1.0):
                z = S['z0'] + 0.040 - ln * r
                for c in (-1, 0, 1):
                    xx = x + c * w * (1.0 - 0.5 * r) * (1.0 if r < 1 else 0.6); yy = surf_y_at(S, xx, z); V3.append((xx, sgn * (yy + 0.0012), z)); E3.append(min(1.0, max(abs(c) * 0.9, r ** 1.5)))
            F3 = [(i * 3 + j, i * 3 + j + 1, (i + 1) * 3 + j + 1, (i + 1) * 3 + j) for i in range(3) for j in range(2)]
            if sgn > 0: F3 = [tuple(reversed(q)) for q in F3]
            b.raw('decal', False, V3, F3, edge=E3)
    return nd


# ------------------------------------------------------------------------------------------------- part: hopper bin and lid
def part_hopper(nd_bin, nd_lid, L, seed, hop=HOP, mat='paint2'):
    """the bin at the back: open-topped, dark inside, litter heaped in it (hero), a hinged lid in its own node. About 15 L inside (0.165 x 0.34 x 0.26 m)."""
    b = nd_bin.b; x0, x1, w, z0, z1 = hop['x0'], hop['x1'], hop['w'], hop['z0'], hop['z1']; wall = 0.022
    cx = (x0 + x1) / 2; sx = x1 - x0; cz = (z0 + z1) / 2; sz = z1 - z0
    if L['simple']:
        b.box(mat, (cx, 0, cz), (sx, w, sz)); nd_lid.b.box(mat, (cx, 0, z1 + 0.016), (sx + 0.02, w + 0.02, 0.02)); return nd_bin, nd_lid
    b.box('grime', (cx, 0, z0 + 0.03), (sx - 0.01, w - 0.01, 0.02))
    b.box(mat, (cx, 0, z0 + wall / 2), (sx, w, wall))
    b.box(mat, (cx, -w / 2 + wall / 2, cz), (sx, wall, sz)); b.box(mat, (cx, w / 2 - wall / 2, cz), (sx, wall, sz))
    b.box(mat, (x0 + wall / 2, 0, cz), (wall, w - 2 * wall + 0.004, sz)); b.box(mat, (x1 - wall / 2, 0, cz), (wall, w - 2 * wall + 0.004, sz))
    b.box('grime', (cx, 0, z1 - 0.05), (sx - 2 * wall, w - 2 * wall, 0.004))
    for sy in (-1, 1):                                        # top rim lips and reinforcing ribs
        b.box('metal', (cx, sy * (w / 2 - 0.004), z1 - 0.002), (sx + 0.014, 0.012, 0.012))
    b.box('metal', (x0 + 0.003, 0, z1 - 0.002), (0.012, w, 0.012)); b.box('metal', (x1 - 0.003, 0, z1 - 0.002), (0.012, w, 0.012))
    if L['fine']:
        for xr in (cx - 0.04, cx + 0.04): b.box('metal', (xr, w / 2 + 0.001, cz - 0.02), (0.012, 0.004, sz * 0.7)); b.box('metal', (xr, -w / 2 - 0.001, cz - 0.02), (0.012, 0.004, sz * 0.7))
        bolts_y(b, [(cx - 0.07, w / 2 + 0.006, z1 - 0.03), (cx + 0.07, w / 2 + 0.006, z1 - 0.03), (cx - 0.07, w / 2 + 0.006, z0 + 0.04), (cx + 0.07, w / 2 + 0.006, z0 + 0.04),
                    (cx - 0.07, -w / 2 - 0.006, z1 - 0.03), (cx + 0.07, -w / 2 - 0.006, z1 - 0.03)], 0.014)
        b.rod('metal', (x0 - 0.002, -0.07, z0 + 0.03), (x0 - 0.002, 0.07, z0 + 0.03), 0.016, 0.016, seg=7)        # a towing bar low on the back
        bolts_x(b, [(x0 - 0.004, yy, zz) for yy in (-0.12, 0.0, 0.12) for zz in (z0 + 0.09, z1 - 0.06)], 0.013)
        b.cyl_y('metal', (x1 - 0.004, 0, z1 + 0.004), 0.02, w * 0.92, seg=8)
        for sy in (-1, 1): b.box('metal', (cx, sy * (w / 2 + 0.002), z0 + 0.05), (sx - 0.02, 0.006, 0.014))
    if L['litter']:
        CS.litter_bits(b, (cx, 0, z0 + 0.06), (sx / 2 - 0.045, w / 2 - 0.06, 0.20), L['litter'], 11 + seed)
        b.cyl('lit_glass', (cx + 0.01, 0.06, z0 + 0.12), 0.07, 0.15, r=(0, 78, 20), seg=9, taper=0.5)            # a bottle sticks up under the lid
    # the lid in its own node: hinged at the front edge (next to the shell), opens up and back
    lb = nd_lid.b; px = nd_lid.pivot[0]; lz = z1 + 0.012
    lb.sq(mat, (cx - 0.005, 0, lz + 0.004), (sx + 0.02, w + 0.02, 0.022), e1=0.3, e2=0.3, nu=3, nv=8, smooth=False)
    if L['fine']: lb.box('metal', (cx, 0, lz + 0.017), (sx - 0.05, w - 0.1, 0.006))
    lb.cyl_y('metal', (px, 0, lz), 0.026, w * 0.9, seg=8)
    if L['fine']:
        lb.rod('metal', (x0 + 0.03, -0.05, lz + 0.016), (x0 + 0.03, 0.05, lz + 0.016), 0.014, 0.014, seg=7)       # handle
        bolts(lb, [(cx - 0.05, -w / 2 + 0.03, lz + 0.016), (cx - 0.05, w / 2 - 0.03, lz + 0.016), (cx + 0.05, 0.0, lz + 0.016)], 0.014)
        lb.box('tape', (cx + 0.02, -0.06, lz + 0.017), (0.06, 0.1, 0.003), (0, 0, 14))
    return nd_bin, nd_lid


# ------------------------------------------------------------------------------------------------- part: head pod (visor, side sensor, lamp base)
def part_head(nd, L, seed):
    """a small head pod on a short neck. One wide dark visor band under a brow hood, a small round side sensor; nothing round and staring in the middle. nd pivot = the neck."""
    b = nd.b
    for k in range(4 if not L['simple'] else 1):                                              # the bellows of the neck: four ribs of rubber
        b.cyl('rubber', (0.318 + 0.019 * k, 0, 0.300), 0.092 if k % 2 == 0 else 0.080, 0.016 if not L['simple'] else 0.07, r=(0, 90, 0), seg=L['seg'])
    b.sq('paint', (0.425, 0, 0.306), (0.150, 0.205, 0.128), (0, -3, 0), e1=0.6, e2=0.62, nu=6 if L['fine'] else (2 if L['simple'] else 3), nv=18 if L['fine'] else (6 if L['simple'] else 8), smooth=True)
    b.box('visor', (0.4985, 0.0, 0.304), (0.012, 0.15, 0.048), (0, -3, 0))                    # the visor band
    b.box('metal', (0.4965, 0.0, 0.3375), (0.040, 0.17, 0.012), (0, -3, 0))                    # brow hood above it
    if L['fine']:
        b.box('metal', (0.495, 0.0, 0.2735), (0.026, 0.15, 0.008), (0, -3, 0))
        b.cyl('lens', (0.480, 0.088, 0.330), 0.026, 0.02, r=(0, 90, 0), seg=10); b.cyl('metal', (0.4755, 0.088, 0.330), 0.036, 0.016, r=(0, 90, 0), seg=10)   # side sensor
        for sy in (-1, 1):
            b.box('metal', (0.405, sy * 0.1015, 0.296), (0.07, 0.006, 0.05)); bolts_y(b, [(0.385, sy * 0.106, 0.296), (0.425, sy * 0.106, 0.296)], 0.011, 0.006)
        b.cyl('hub', (0.352, 0.0, 0.300), 0.052, 0.012, r=(0, 90, 0), seg=10)
        for k in range(4): b.box('grime', (0.43 + 0.012 * k, 0.0, 0.372 - 0.001 * k), (0.006, 0.12, 0.003))        # vent slits in the top of the pod
        bolts(b, [(0.46, 0.07, 0.368), (0.46, -0.07, 0.368), (0.39, 0.07, 0.366), (0.39, -0.07, 0.366)], 0.011, 0.006)
        b.box('tape', (0.40, 0.04, 0.3705), (0.07, 0.05, 0.003), (0, 0, 30))                  # tape over a crack in the lid
        CS.twine(b, (0.50, -0.06, 0.280), 0.11)
    return nd


# ------------------------------------------------------------------------------------------------- part: grabber arm (three joints, cable, two fingers)
def _rod_seg(b, p0, p1, d, L, seg_color='metal'):
    b.rod('arm', p0, p1, d, d, seg=L['rods']); mid0 = p0 + (p1 - p0) * 0.12; mid1 = p0 + (p1 - p0) * 0.38
    b.rod('rubber', mid0, mid1, d * 1.35, d * 1.35, seg=L['rods'])

def part_arm_simple(n_base, n_mid, n_tip, n_fl, n_fr, L):
    S = SHOULDER; E = ELBOW_STOW; W = WRIST_STOW; dy = ARM_DY
    n_base.b.rod('arm', tuple(S + np.array([0, dy, 0])), tuple(E + np.array([0, dy, 0])), 0.032, 0.032, seg=4)
    n_mid.b.rod('arm', tuple(E + np.array([0, -dy, 0])), tuple(W + np.array([0, -dy, 0])), 0.032, 0.032, seg=4)
    n_tip.b.box('metal', tuple(W + np.array([0.05, -dy, 0])), (0.1, 0.05, 0.05))
    for nd, s_ in ((n_fl, 1), (n_fr, -1)):
        nd.pivot = W + np.array([0.1, s_ * 0.026 - dy, 0.0]); nd.b.box('rubber', tuple(nd.pivot + np.array([0.04, 0, 0])), (0.08, 0.018, 0.02))

def part_arm(n_base, n_mid, n_tip, n_fl, n_fr, L, seed):
    """folding grabber: shoulder housing (arm_base), upper arm, elbow (arm_mid), forearm, wrist and palm (arm_tip), two fingers with rubber pads (finger_l, finger_r).
    The meshes are drawn in the STOWED pose (upper arm pointing back, forearm folded forward beside it); node rotations are relative to that."""
    if L['simple']: return part_arm_simple(n_base, n_mid, n_tip, n_fl, n_fr, L)
    S = SHOULDER; E = ELBOW_STOW; W = WRIST_STOW; dy = ARM_DY; d = 0.030
    b = n_base.b
    b.cyl_y('metal', tuple(S), 0.078, 0.062 + 2 * dy, seg=L['seg']); b.cyl_y('hub', tuple(S + np.array([0, 0.046 + dy, 0])), 0.05, 0.014, seg=L['seg'])
    if L['fine']:
        bolts_y(b, [tuple(S + np.array([0.022 * math.cos(a), 0.054 + dy, 0.022 * math.sin(a)])) for a in (0.4, 2.0, 3.6, 5.2)], 0.010)
    up0 = S + np.array([0, dy, 0]); up1 = E + np.array([0, dy, 0]); _rod_seg(b, up0, up1, d, L)
    if L['fine']:
        q0 = up0 + np.array([-0.03, 0.02, 0.012]); q1 = up1 + np.array([0.03, 0.02, 0.012]); m = (q0 + q1) / 2 + np.array([0, 0.004, -0.028])
        b.rod('grime', tuple(q0), tuple(m), 0.007, 0.007, seg=4); b.rod('grime', tuple(m), tuple(q1), 0.007, 0.007, seg=4)     # the cable with its slack
        b.cyl('tape', tuple((up0 + up1) / 2 + np.array([0.02, 0, 0])), 0.04, 0.02, r=(0, 90, 0), seg=8)
    if L['fine']:                                                                      # a thin second rod (a piston) beside each segment, cable clamps
        for k in (0.35, 0.6, 0.82): b.cyl('metal', tuple(up0 + (up1 - up0) * k + np.array([0, 0.016, 0])), 0.026, 0.014, r=(90, 0, 0), seg=8)
        b.rod('metal', tuple(up0 + (up1 - up0) * 0.08 + np.array([0, 0.03, 0.026])), tuple(up0 + (up1 - up0) * 0.7 + np.array([0, 0.03, 0.018])), 0.012, 0.012, seg=6)
    bm = n_mid.b
    bm.cyl_y('hub', tuple(E + np.array([0, 0, 0])), 0.058, 2 * dy + 0.05, seg=L['seg']); bm.cyl_y('bolt', tuple(E + np.array([0, dy + 0.03, 0])), 0.022, 0.012, seg=6)
    bm.cyl_y('bolt', tuple(E + np.array([0, -dy - 0.03, 0])), 0.022, 0.012, seg=6)
    f0 = E + np.array([0, -dy, 0]); f1 = W + np.array([0, -dy, 0]); _rod_seg(bm, f0, f1, d, L)
    if L['fine']:
        bm.rod('rubber', tuple(f1 + np.array([-0.06, 0, 0])), tuple(f1 + np.array([-0.01, 0, 0])), 0.04, 0.04, seg=8)
        for k in (0.3, 0.55, 0.78): bm.cyl('metal', tuple(f0 + (f1 - f0) * k + np.array([0, -0.016, 0])), 0.026, 0.014, r=(90, 0, 0), seg=8)
        bm.rod('metal', tuple(f0 + (f1 - f0) * 0.1 + np.array([0, -0.03, 0.026])), tuple(f0 + (f1 - f0) * 0.72 + np.array([0, -0.03, 0.018])), 0.012, 0.012, seg=6)
    bt = n_tip.b; Wp = W + np.array([0, -dy, 0])
    bt.cyl_y('hub', tuple(Wp), 0.05, 0.05, seg=L['seg']); bt.box('metal', tuple(Wp + np.array([0.04, 0, 0])), (0.06, 0.05, 0.05))
    if L['fine']: bt.box('rubber', tuple(Wp + np.array([0.075, 0, 0])), (0.012, 0.056, 0.056))
    if L['fine']: bolts_y(bt, [tuple(Wp + np.array([0.0, -0.03, 0.0]))], 0.016)
    for nd, s in ((n_fl, 1), (n_fr, -1)):
        pv = Wp + np.array([0.08, s * 0.026, 0.0]); nd.pivot = pv.copy(); fb = nd.b
        tipf = pv + np.array([0.09, -s * 0.006, 0.0])
        fb.rod('hub', tuple(pv), tuple(tipf), 0.022, 0.014, seg=5)
        fb.rod('rubber', tuple(pv + (tipf - pv) * 0.45), tuple(tipf + np.array([0.006, -s * 0.004, 0])), 0.028, 0.02, seg=5)
        if L['fine']: fb.cyl_y('bolt', tuple(pv), 0.018, 0.012 + 0.0, seg=6)

def arm_pose_angles(yaw, a1, a2, a3):
    """absolute segment angles in the vertical plane (degrees above +x, counter-clockwise seen from +y) -> node rotations relative to the stowed pose.
    Rotation about +y by t degrees lowers a direction angle by t, so the relative angle is stow - target."""
    stow = (180.0, 0.0, -8.0)
    t1 = stow[0] - a1; t2 = (stow[1] - a2) - t1; t3 = (stow[2] - a3) - (t1 + t2)
    return yaw, t1, t2, t3

def arm_ik(target, yaw_hint=None, grip_len=0.17, grip_down=-80.0):
    """a tip target (x, y, z) on the ground ahead -> (yaw, a1, a2, a3, reach points). Two-link planar solution with the elbow up, wrist above the target by the gripper length."""
    S = SHOULDER; dx, dy_ = target[0] - S[0], target[1] - S[1]; yaw = math.degrees(math.atan2(dy_, dx)) if yaw_hint is None else yaw_hint
    d = math.hypot(dx, dy_); g = math.radians(grip_down); wx = d - grip_len * math.cos(g); wz = target[2] - S[2] - grip_len * math.sin(g)
    r = min(math.hypot(wx, wz), ARM_L1 + ARM_L2 - 0.005); base = math.atan2(wz, wx)
    cos_e = (ARM_L1 ** 2 + r ** 2 - ARM_L2 ** 2) / (2 * ARM_L1 * r); e = math.acos(max(-1, min(1, cos_e)))
    a1 = base + e; ex, ez = ARM_L1 * math.cos(a1), ARM_L1 * math.sin(a1)
    a2 = math.atan2(wz - ez, wx - ex)
    return yaw, math.degrees(a1), math.degrees(a2), grip_down


# ------------------------------------------------------------------------------------------------- part: chassis (body panels, deck, neck mount, arm turret, fenders, data plate)
def part_chassis(nd, L, seed):
    """the body under the shell: tub, belly skid, mud guards, deck collar, hinge brackets, arm turret, front plate, rear deck, and (hero) the data plate, tape and patch, bolts with rust runs, louvres, conduit"""
    b = nd.b; fine = L['fine']; simple = L['simple']
    tub = lambda m, p, s, **kw: b.sq(m, p, s, e1=0.22, e2=0.22, nu=3, nv=8, **kw) if fine else b.box(m, p, s)
    tub('paint2', (-0.105, 0, 0.20), (0.89, 0.405, 0.15))                                # the main tub under the shell, from the hopper floor to the neck
    b.box('grime', (-0.09, 0, 0.125), (0.82, 0.30, 0.03))                              # belly skid
    for sy in (-1, 1):
        b.box('guard', (-0.11, sy * (TRACK_Y + 0.0), 0.250), (0.36, TRACK_W + 0.008, 0.008), (0, 0, 0))   # mud guard over each track
    if not simple:
        # the deck round the shell: a low collar ring so the shell halves sit on something, hinge brackets, the arm turret
        b.box('metal', (-0.05, 0, 0.268), (0.64, 0.06, 0.012)); b.box('metal', (0.0, 0.205, 0.263), (0.62, 0.012, 0.016)); b.box('metal', (0.0, -0.205, 0.263), (0.62, 0.012, 0.016))
        b.box('metal', (0.295, 0, 0.268), (0.012, 0.42, 0.014)); b.box('metal', (-0.395, 0, 0.268), (0.012, 0.42, 0.014))
        for sy in (-1, 1):
            b.box('metal', (HINGE[0] + 0.015, sy * 0.175, 0.272), (0.04, 0.05, 0.016)); b.cyl_y('hub', (HINGE[0], sy * 0.175, HINGE[2] + 0.003), 0.024, 0.07, seg=8)
        b.cyl('metal', tuple(SHOULDER + np.array([0, 0, -0.04])), 0.10, 0.045, seg=L['seg'])
    b.sq('paint', (0.33, 0, 0.215), (0.07, 0.34, 0.12), e1=0.3, e2=0.3, nu=3, nv=8) if fine else b.box('paint', (0.33, 0, 0.215), (0.07, 0.34, 0.12))     # front plate
    if not simple: b.cyl('metal', (0.36, 0, 0.30), 0.09, 0.03, r=(0, 90, 0), seg=L['seg'])
    b.box('paint2', (-0.43, 0, 0.255), (0.07, 0.40, 0.05))                              # rear deck under the hopper
    if fine:
        b.box('metal', tuple(SHOULDER + np.array([0, 0, -0.045])), (0.12, 0.09, 0.02))
        # the data plate (a plain metal rectangle, nothing written on it), two rivets, a bleached arrow mark
        b.box('metal', (0.12, -0.2075, 0.20), (0.075, 0.004, 0.034)); bolts_y(b, [(0.087, -0.211, 0.20), (0.153, -0.211, 0.20)], 0.009, 0.006)
        ax, az = 0.00, 0.165
        b.raw('mark', False, [(ax - 0.06, -0.2065, az - 0.008), (ax + 0.02, -0.2065, az - 0.008), (ax + 0.02, -0.2065, az - 0.022), (ax + 0.065, -0.2065, az + 0.0), (ax + 0.02, -0.2065, az + 0.022), (ax + 0.02, -0.2065, az + 0.008), (ax - 0.06, -0.2065, az + 0.008)],
              [(6, 5, 1, 0), (1, 2, 3), (1, 3, 4), (1, 4, 5)])
        # tape and a repair plate in the wrong colour on the right side, bolt rows and rust runs under them
        b.box('tape', (-0.22, 0.2085, 0.22), (0.10, 0.006, 0.05), (0, 0, 0)); b.box('patch', (-0.12, 0.2095, 0.205), (0.11, 0.005, 0.075), (0, 0, 2))
        bolts_y(b, [(-0.165, 0.213, 0.235), (-0.075, 0.213, 0.235), (-0.165, 0.213, 0.175), (-0.075, 0.213, 0.175)], 0.011, 0.007)
        bolts_y(b, [(-0.30, -0.211, 0.24), (0.20, -0.211, 0.24), (-0.30, 0.211, 0.17), (0.2, 0.211, 0.17), (-0.45, 0.211, 0.20), (-0.45, -0.211, 0.20), (0.30, 0.211, 0.20), (0.30, -0.211, 0.20)], 0.012, 0.007)
        for (x, y, z) in ((-0.30, -0.2065, 0.24), (0.20, -0.2065, 0.24), (-0.165, 0.2065, 0.175), (-0.075, 0.2065, 0.175), (-0.165, 0.2065, 0.235), (-0.075, 0.2065, 0.235)):
            sg = 1 if y > 0 else -1; stain(b, (x, sg * 0.2085, z - 0.006), (0.0, sg, 0.0), 0.06, 0.006)
        # louvres behind the tracks' rear end, a battery cover on the rear deck, a skid plate with ribs, cable conduit along the deck
        for sy in (-1, 1):
            for k in range(6): b.box('grime', (-0.40, sy * 0.2045, 0.145 + 0.014 * k), (0.07, 0.004, 0.006), (0, 0, 0))
            b.rod('rubber', (-0.39, sy * 0.19, 0.282), (0.27, sy * 0.19, 0.282), 0.016, 0.016, seg=7)
            for xk in (-0.3, -0.15, 0.0, 0.15, 0.25): b.cyl('metal', (xk, sy * 0.19, 0.282), 0.024, 0.014, r=(0, 90, 0), seg=7)
        b.box('metal', (-0.435, 0, 0.283), (0.05, 0.3, 0.008)); bolts(b, [(-0.45, 0.12, 0.29), (-0.45, -0.12, 0.29), (-0.42, 0.12, 0.29), (-0.42, -0.12, 0.29)], 0.012)
        for k in range(6): b.box('metal', (-0.33 + 0.1 * k, 0, 0.108), (0.014, 0.28, 0.012))
        b.rod('grime', (0.30, 0.15, 0.17), (0.38, 0.13, 0.20), 0.012, 0.012, seg=5)
        b.cyl_x('metal', (0.372, 0.0, 0.2), 0.05, 0.016, seg=10)                       # a tow eye at the front
    return nd


# ------------------------------------------------------------------------------------------------- the whole machine
NODES = ['collector', 'chassis', 'track_l', 'track_r', 'shell_l', 'shell_r', 'head', 'lamp', 'arm_base', 'arm_mid', 'arm_tip', 'finger_l', 'finger_r', 'hopper', 'hopper_lid']
AXES = {
    'shell_l': dict(axis='y', rest=0, range=[0, 32], note='rotate about the hinge at the front; positive lifts the rear (tips the cells to the sun)'),
    'shell_r': dict(axis='y', rest=0, range=[0, 32], note='as shell_l; the two halves are tipped by slightly different angles'),
    'head': dict(axis='y then x', rest=0, range=[-14, 16], note='pitch about y (negative looks up), then roll about x for the head tilt (+-18)'),
    'arm_base': dict(axis='z then y', rest=0, range=[-60, 60], pitch_range=[0, 180], note='yaw about z (to the sides, +-60), then pitch about y; pitch 0 = stowed pointing back, about 175 = swung up and over, reaching forward and down'),
    'arm_mid': dict(axis='y', rest=0, range=[-200, 10], note='elbow, relative to the upper arm; the stowed forearm lies folded forward'),
    'arm_tip': dict(axis='y', rest=0, range=[-40, 80], note='wrist, relative to the forearm'),
    'finger_l': dict(axis='z', rest=0, range=[-5, 30], note='gripper finger, positive opens'),
    'finger_r': dict(axis='z', rest=0, range=[-30, 5], note='gripper finger, negative opens'),
    'hopper_lid': dict(axis='y', rest=0, range=[0, 70], note='hinged at the front edge, positive lifts the back edge'),
    'track_l': dict(axis=None, note='rigid tread (hero has real links); the page scrolls the tread by moving the sand and rocking the body, or swaps UV on live'),
    'track_r': dict(axis=None, note='as track_l'),
    'lamp': dict(axis=None, note='the emissive amber dome; set the material emissive strength (or colour, per the status code) from the page'),
}

def pose_rotations(pose):
    """node name -> rotation sequence [(axis, degrees)] relative to the stowed rest pose"""
    P = {}
    if pose == 'sun':
        P['shell_l'] = [('y', 24)]; P['shell_r'] = [('y', 19)]; P['head'] = [('y', -9), ('x', 6)]
    elif pose == 'park':
        P['shell_l'] = [('y', 29)]; P['shell_r'] = [('y', 26)]; P['head'] = [('y', 5)]
    elif pose == 'grab':
        yaw, a1, a2, a3 = arm_ik(GRAB_TARGET, grip_down=-82.0)
        y, t1, t2, t3 = arm_pose_angles(yaw, a1, a2, a3)
        P['arm_base'] = [('z', y), ('y', t1)]; P['arm_mid'] = [('y', t2)]; P['arm_tip'] = [('y', t3)]
        P['finger_l'] = [('z', 14)]; P['finger_r'] = [('z', -14)]; P['head'] = [('y', 11), ('x', -9)]
        P['shell_l'] = [('y', 12)]; P['hopper_lid'] = [('y', 38)]
    return P

def build(lod='hero', pose='rest', seed=SEED):
    L = LOD[lod]; nodes = {}
    def N(name, parent, pivot):
        n = Node(name, parent, pivot, AXES.get(name)); nodes[name] = n; return n
    root = N('collector', None, (0, 0, 0)); ch = N('chassis', 'collector', (0, 0, 0))
    tl = N('track_l', 'collector', (0, TRACK_Y, 0.112)); tr = N('track_r', 'collector', (0, -TRACK_Y, 0.112))
    sl = N('shell_l', 'collector', HINGE + np.array([0, 0.175, 0])); sr = N('shell_r', 'collector', HINGE + np.array([0, -0.175, 0]))
    hd = N('head', 'collector', HEAD_PIVOT); lp = N('lamp', 'head', LAMP_AT)
    ab = N('arm_base', 'collector', SHOULDER); am = N('arm_mid', 'arm_base', ELBOW_STOW + np.array([0, 0, 0])); at = N('arm_tip', 'arm_mid', WRIST_STOW + np.array([0, -ARM_DY, 0]))
    fl = N('finger_l', 'arm_tip', WRIST_STOW); fr = N('finger_r', 'arm_tip', WRIST_STOW)
    hp = N('hopper', 'collector', (HOP['x1'], 0, HOP['z1'])); hl = N('hopper_lid', 'hopper', (HOP['x1'], 0, HOP['z1'] + 0.012))
    part_chassis(ch, L, seed)
    part_tracks(tl, 1, L, dent=0.0); part_tracks(tr, -1, L, dent=(-13 if L['fine'] else 0.0))
    part_shell_half(sl, 1, L, seed, patch=False, crack=True, tape_strip=True); part_shell_half(sr, -1, L, seed, patch=True, crack=False, tape_strip=False)
    part_head(hd, L, seed); part_lamp(lp, LAMP_AT, L)
    part_arm(ab, am, at, fl, fr, L, seed)
    part_hopper(hp, hl, L, seed)
    if lod == 'far':                                         # far: the same shapes, merged parts and nothing small
        pass
    for k, seq in pose_rotations(pose).items(): nodes[k].q = rot_seq(seq)
    return nodes


# ------------------------------------------------------------------------------------------------- weathering baked into vertex colours
CREVICES = []

def bake_colour(key, P, N, edge, tvar, seed, pivots, ao=None):
    """linear rgb per vertex from the material key, the rest-pose position P (n x 3, metres), the normal N, the edge value and an extra parameter. The same look as the concept sheet's procedural materials,
    frozen into the vertices: faded paint with sun-bleached chalky tops, edge wear to bare metal, rust runs that follow Z, salt crust below 17 cm, a sand-scoured band, sand in the joints (near pivots)."""
    n = len(P); base = np.array(MATS[key][1], float); gname = MATS[key][0]; z = P[:, 2]; nz = N[:, 2]; side = 1.0 - np.abs(nz)
    sd = seed * 13
    if key == 'decal':
        t = np.clip(edge, 0, 1); paint = np.array(MATS['paint'][1]) * 0.8
        col = mixc(RUST * (0.7 + 0.4 * fbm(P * 11, sd)[:, None]) * 0.8 + paint * 0.2, paint, sstep(0.0, 1.0, t) ** 0.7)
        return col
    if gname == 'Lens':
        haze = fbm(P * 11, sd + 3); return mixc(np.array(base), np.array((0.26, 0.27, 0.26)), (sstep(0.35, 0.85, haze) * 0.55))
    if gname == 'Lamp': return np.tile(base, (n, 1))
    if gname == 'Cell':
        q = np.round(P / 0.055) * 0.055; r = fbm(q * 9, sd + 5, 2); fade = fbm(P * 3.5, sd + 8)
        col = base[None] * (0.7 + 1.7 * r[:, None]) * (0.8 + 1.1 * fade[:, None]); dust = sstep(0.40, 0.85, fbm(P * 12, sd + 9)) * 0.55
        col = mixc(col, np.array((0.42, 0.40, 0.34)), dust * (0.4 + 0.6 * np.clip(nz, 0, 1))); haze = sstep(0.0, 1.0, np.clip(nz, 0, 1)) * 0.10
        return mixc(col, np.array((0.20, 0.23, 0.27)), haze)
    if gname in ('Cord', 'Grime'):
        d = (0.85 + 0.3 * fbm(P * 11, sd + 2))[:, None]; col = base[None] * d
        if key in ('tape', 'twine', 'sand'): col = mixc(col, SAND * 0.7, sstep(0.0, 0.12, 0.12 - z) * 0.5)
        return col
    if gname == 'Plastic':
        f = fbm(P * 12, sd + 4); col = base[None] * (0.55 + 0.7 * f[:, None]); return mixc(col, np.array((0.5, 0.48, 0.42)), 0.25 * sstep(0.3, 0.8, fbm(P * 11, sd + 6)))
    fade = fbm(P * 3.0, sd + 1); col = base[None] * (0.86 + 0.30 * fade[:, None])
    if gname == 'Paint':
        chalk = np.clip((nz - 0.30) / 0.6, 0, 1) * (0.12 + 0.30 * fbm(P * 4, sd + 2)); col = mixc(col, base * 0.45 + 0.30, chalk)
        sun = sstep(0.55, 0.9, fbm(P * 2.1 + 5, sd + 9)) * 0.16 * np.clip(nz + 0.4, 0, 1); col = mixc(col, base * 0.5 + 0.25, sun)
        zone = (np.asarray(tvar) == 3)
        if zone.any(): col = np.where(zone[:, None], base[None] * 0.12 + np.array((0.012, 0.018, 0.03)), col)
        if key == 'patch': col = mixc(col, col * 0.85, 0.0)
    if gname == 'Metal':
        col = col * 0.85; col = mixc(col, RUST * 1.1, sstep(0.62, 0.85, fbm(P * np.array([10, 10, 5]), sd + 7)) * (0.35 if key != 'bolt' else 0.8))
    if gname == 'Rubber':
        dust = np.clip(nz, 0, 1) * sstep(0.35, 0.8, fbm(P * 12, sd + 10)); col = mixc(col, np.array((0.14, 0.115, 0.075)), dust * 0.4)
        crack = sstep(0.62, 0.7, fbm(P * np.array([14, 14, 14]), sd + 12)) * 0.5; col = col * (1 - 0.25 * crack[:, None])
    if gname == 'Paint':
        gz = sstep(0.0, 1.0, np.clip((0.274 - z) / 0.014, 0, 1)) * (np.asarray(tvar) >= 1)
        col = mixc(col, np.array((0.02, 0.02, 0.022)), gz * 0.9)
    # rust runs that follow Z, paint chips that show bare metal on edges
    run = sstep(0.68, 0.86, fbm(P * np.array([11, 11, 2.4]), sd + 3)) * side * 0.7
    rust_k = {'Paint': 0.8, 'Metal': 0.0, 'Rubber': 0.0}.get(gname, 0.0) * (0.35 if key == 'patch' else 1.0)
    col = mixc(col, RUST * (0.8 + 0.5 * fbm(P * 11, sd + 4)[:, None]), run * rust_k)
    if gname in ('Paint',):
        ew = sstep(0.30, 0.85, edge * (0.45 + 0.9 * fbm(P * 11, sd + 5)))
        col = mixc(col, mixc(BARE * 1.0, RUST * 1.2, sstep(0.5, 0.85, fbm(P * 11, sd + 6))), ew * (0.35 if key == 'patch' else 0.55))
        # chips on the up-facing and rim areas, a satin sand-scoured band
        chip = sstep(0.80, 0.85, fbm(P * 11, sd + 11)) * sstep(0.45, 0.8, fbm(P * 5, sd + 12)) * (0.25 + 0.75 * np.clip(edge * 1.4, 0, 1)); col = mixc(col, np.array((0.20, 0.19, 0.17)), chip * 0.7)
        scour = sstep(0.0, 0.12, 0.13 - z) * (0.5 + 0.5 * fbm(P * 12, sd + 13)) * np.clip(side + 0.3, 0, 1); col = mixc(col, np.array((0.30, 0.26, 0.20)), scour * 0.65)
    # salt crust: white tide-mark crust in the lowest 17 cm and in pale blooms on top
    zz = np.clip(1.0 - z / 0.17, 0, 1); crust = sstep(0.34, 0.70, fbm(P * np.array([10, 10, 10]), sd + 14)) * zz ** 1.3
    bloom = sstep(0.66, 0.86, fbm(P * 6, sd + 15)) * np.clip(nz, 0, 1) * 0.16
    col = mixc(col, SALT * 0.92, np.clip(crust * 0.62 + bloom, 0, 1) * (0.45 if gname != 'Paint' else 0.9))
    # sand in the crevices: under-facing and low surfaces, and near every pivot
    sand = np.clip(-nz * 0.9, 0, 1) * 0.5 + sstep(0.0, 0.05, 0.05 - z) * 0.5
    for pv in pivots:
        d = np.linalg.norm(P - pv, axis=1); sand = np.maximum(sand, sstep(0.05, 0.0, d) * 0.45)
    col = mixc(col, SAND * (0.8 + 0.4 * fbm(P * 11, sd + 16)[:, None]), np.clip(sand, 0, 0.6 if gname != 'Rubber' else 0.25))
    col = col * (1.0 - 0.35 * np.clip(-nz, 0, 1))[:, None]
    if ao is not None:
        a_ = np.asarray(ao)[:, None]; col = mixc(col, SAND * 0.5 * (0.6 + 0.4 * a_), np.clip((0.55 - a_[:, 0]) * 0.9, 0, 0.35 if gname != 'Rubber' else 0.12) * (nz > -0.3)); col = col * (0.38 + 0.62 * a_) ** 1.0
    return np.clip(col, 0.0, 1.0)


# ------------------------------------------------------------------------------------------------- the detail textures (tiny PNGs, white = no change, multiplied with the vertex colour)
def png_bytes(arr):
    """8-bit PNG (grey for a 2-d array, RGB for a 3-d one) with a per-row filter picked by the smallest sum of absolute values (none, sub or up)"""
    h, w = arr.shape[:2]; ch = 3 if arr.ndim == 3 else 1; a = np.clip(arr, 0, 255).astype(np.uint8).reshape(h, w * ch).astype(np.int16)
    rows = []; prev = np.zeros(w * ch, np.int16)
    for y in range(h):
        cur = a[y]; sub = cur.copy(); sub[ch:] = cur[ch:] - cur[:-ch]; up = cur - prev
        cand = [(0, cur), (1, sub), (2, up)]; best = min(cand, key=lambda c: int(np.abs(((c[1] + 128) % 256) - 128).sum()))
        rows.append(bytes([best[0]]) + (best[1] % 256).astype(np.uint8).tobytes()); prev = cur
    raw = b''.join(rows)
    def chunk(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2 if ch == 3 else 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

def tile_noise(n, cells, rng):
    g = rng.random((cells, cells)); xs = np.arange(n) * cells / n; i0 = np.floor(xs).astype(int); f = xs - i0; u = f * f * (3 - 2 * f)
    i1 = (i0 + 1) % cells; i0 = i0 % cells
    a = g[np.ix_(i0, i0)]; b_ = g[np.ix_(i0, i1)]; c = g[np.ix_(i1, i0)]; d = g[np.ix_(i1, i1)]
    uu = u[:, None]; vv = u[None, :]
    return (a * (1 - uu) + c * uu) * (1 - vv) + (b_ * (1 - uu) + d * uu) * vv

def make_texture(kind, n=512, seed=3):
    """tileable multiply maps (white = no change), 512 x 512, about 1 mm per texel at the 2 tiles per metre of the box projection. v grows downward in the image, the same as down in the world.
    paint: grain, bare-metal chips, scratches, faint dirt streaks that run down and a few dark specks. dirt (rubber, metal, plastic): grain, scratches, soot."""
    rng = np.random.default_rng(seed + (0 if kind == 'paint' else 100))
    grain = tile_noise(n, n // 2, rng); mid = tile_noise(n, 16, rng); low = tile_noise(n, 4, rng)
    t = 0.95 + 0.05 * (grain - 0.5) + 0.06 * (mid - 0.5) + 0.05 * (low - 0.5)
    img = np.stack([t, t, t], -1)
    # scratches: thin random lines, a little darker
    lines = np.zeros((n, n))
    for k in range(150 if kind == 'paint' else 90):
        x0 = rng.uniform(0, n); y0 = rng.uniform(0, n); a = rng.uniform(0, math.pi); ln = rng.uniform(n * 0.03, n * 0.16); ts = np.arange(0, ln, 0.7)
        xs = (x0 + ts * math.cos(a)).astype(int) % n; ys = (y0 + ts * math.sin(a)).astype(int) % n; lines[ys, xs] = np.maximum(lines[ys, xs], rng.uniform(0.3, 1.0))
    img *= (1 - 0.20 * lines)[..., None]
    if kind == 'paint':
        blob = np.clip((tile_noise(n, 70, rng) * tile_noise(n, 18, rng) - 0.30) * 9, 0, 1)               # chips: bare metal and primer showing
        edge = np.clip(blob - np.roll(blob, 2, axis=0) * 0.7, 0, 1)
        blob = (blob + np.roll(blob, 1, 0) + np.roll(blob, -1, 0) + np.roll(blob, 1, 1) + np.roll(blob, -1, 1)) / 5.0; img *= (1 - 0.11 * blob)[..., None]; img += (0.05 * edge)[..., None]
        streak = np.zeros((n, n))
        for k in range(12):
            x0 = rng.integers(0, n); w = rng.integers(3, 9); y0 = rng.integers(0, n); ln = rng.integers(n // 5, n * 3 // 5); a = rng.uniform(0.3, 0.8)
            yy = (y0 + np.arange(ln)) % n; prof = a * (1 - np.arange(ln) / ln) ** 1.3
            for dx in range(-w, w + 1): streak[yy, (x0 + dx) % n] = np.maximum(streak[yy, (x0 + dx) % n], prof * (1 - abs(dx) / (w + 1)))
        streak *= (0.5 + 0.9 * mid)
        for c, tgt in enumerate((0.94, 0.80, 0.68)): img[..., c] = img[..., c] * (1 - 0.30 * streak) + img[..., c] * tgt * 0.30 * streak
        spk = np.clip((tile_noise(n, 90, rng) - 0.74) * 9, 0, 1); img *= (1 - 0.20 * spk)[..., None]
    else:
        soot = np.clip((mid - 0.35) * 1.6, 0, 1); img *= (1 - 0.15 * soot)[..., None]
        pits = np.clip((tile_noise(n, 70, rng) - 0.76) * 9, 0, 1); img *= (1 - 0.18 * pits)[..., None]
    return np.clip(img.mean(2) * 255.0 + 0.5, 0, 255)                                         # grey: colour comes from the vertices


# ------------------------------------------------------------------------------------------------- glTF 2.0 binary writer
def _box_uv(P, N, mode, scale=2.0):
    """per-vertex box projection by the dominant normal axis (mode 0), planar from above (mode 1, the dome) or from below (mode 2). v runs down the image, so down in the world."""
    uv = np.zeros((len(P), 2)); a = np.abs(N)
    ax = np.argmax(a, axis=1)
    x_, y_, z_ = P[:, 0], P[:, 1], P[:, 2]
    uv[:, 0] = np.where(ax == 0, y_, np.where(ax == 1, x_, x_)); uv[:, 1] = np.where(ax == 2, -y_, -z_)
    top = (mode == 1) | (mode == 3); uv[top, 0] = x_[top]; uv[top, 1] = -y_[top]
    bot = mode == 2; uv[bot, 0] = x_[bot]; uv[bot, 1] = y_[bot]
    return uv * scale

def _geometry(nd):
    """per material key: world vertices, normals, edge, mode, triangles (flat buckets are split per face, smooth ones keep shared vertices)"""
    out = []
    for (mat, smooth), (vs, fs, _) in nd.b.buckets.items():
        V = np.concatenate(vs); ex = nd.b.x[(mat, smooth)]
        edge = np.concatenate([e[0] for e in ex]); mode = np.concatenate([e[1] for e in ex])
        given = None if any(e[2] is None for e in ex) else np.concatenate([e[2] for e in ex])
        tris = []
        for q in fs:
            for k in range(1, len(q) - 1): tris.append((q[0], q[k], q[k + 1]))
        T = np.array(tris, int)
        if given is not None or smooth:
            if given is not None: Nv = given
            else:
                Nv = np.zeros_like(V); fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
                for k in range(3): np.add.at(Nv, T[:, k], fn)
                Nv = Nv / (np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12)
            Pv, Ev, Mv, Tv = V, edge, mode, T
        else:
            cr = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]]); keep = np.linalg.norm(cr, axis=1) > 1e-12
            T = T[keep]; fn = cr[keep] / np.linalg.norm(cr[keep], axis=1, keepdims=True)
            Pv = V[T.ravel()]; Ev = edge[T.ravel()]; Mv = mode[T.ravel()]; Nv = np.repeat(fn, 3, axis=0); Tv = np.arange(len(Pv)).reshape(-1, 3)
        out.append((mat, Pv, Nv, Ev, Mv, Tv))
    return out

AO_CELL = 0.012
def occupancy(geoms):
    """a voxel grid (12 mm cells) of every surface in the machine, for the baked ambient occlusion"""
    pts = []
    for g in geoms:
        for mat, Pv, Nv, Ev, Mv, Tv in g:
            if mat in ('decal', 'mark', 'sand', 'twine'): continue
            A, B, C = Pv[Tv[:, 0]], Pv[Tv[:, 1]], Pv[Tv[:, 2]]; area = 0.5 * np.linalg.norm(np.cross(B - A, C - A), axis=1)
            k = np.clip((area / (AO_CELL * AO_CELL * 0.8)).astype(int) + 1, 1, 60)
            for ki in np.unique(k):
                m = k == ki; r = np.random.default_rng(int(ki)).random((int(m.sum()), int(ki), 2)); r = np.where(r.sum(2, keepdims=True) > 1, 1 - r, r)
                w = np.concatenate([r, 1 - r.sum(2, keepdims=True)], 2)
                pp = w[..., 0:1] * A[m][:, None] + w[..., 1:2] * B[m][:, None] + w[..., 2:3] * C[m][:, None]; pts.append(pp.reshape(-1, 3))
    pts = np.concatenate(pts); lo = pts.min(0) - 0.15; hi = pts.max(0) + 0.15; dims = np.ceil((hi - lo) / AO_CELL).astype(int) + 1
    grid = np.zeros(dims, bool); ix = ((pts - lo) / AO_CELL).astype(int); grid[ix[:, 0], ix[:, 1], ix[:, 2]] = True
    return grid, lo

def vertex_ao(P, N, occ, strength=0.62, reach=(0.016, 0.03, 0.05, 0.08, 0.12)):
    grid, lo = occ; rng = np.random.default_rng(5)
    base = []; 
    for k in range(12):
        el = math.radians(rng.uniform(32, 88)); az = rng.uniform(0, 2 * math.pi); base.append((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    base = np.array(base)
    up = np.where(np.abs(N[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]])); t1 = np.cross(N, up); t1 /= np.linalg.norm(t1, axis=1, keepdims=True) + 1e-12; t2 = np.cross(N, t1)
    hit = np.zeros(len(P)); start = P + N * 0.004
    for d in base:
        dirv = t1 * d[0] + t2 * d[1] + N * d[2]; blocked = np.zeros(len(P), bool)
        for r in reach:
            q = start + dirv * r; ix = ((q - lo) / AO_CELL).astype(int); ok = (ix >= 0).all(1) & (ix < np.array(grid.shape)).all(1)
            h = np.zeros(len(P), bool); h[ok] = grid[ix[ok, 0], ix[ok, 1], ix[ok, 2]]; blocked |= h
        hit += blocked
    return 1.0 - strength * (hit / len(base))

def _mesh_arrays(nd, geom, ao_list, seed, pivots, use_tex):
    """returns {gltf material: (P local, N, UV, C u8, idx)} for one node"""
    tmp = {}
    for (mat, Pv, Nv, Ev, Mv, Tv), ao in zip(geom, ao_list):
        C = bake_colour(mat, Pv, Nv, Ev, Mv, seed, pivots, ao)
        tmp.setdefault(MATS[mat][0], []).append((Pv, Nv, Mv, C, Tv))
    out = {}
    for g, items in tmp.items():
        off = 0; P = []; N = []; M = []; C = []; T = []
        for Pv, Nv, Mv, Cv, Tv in items: P.append(Pv); N.append(Nv); M.append(Mv); C.append(Cv); T.append(Tv + off); off += len(Pv)
        P = np.concatenate(P); N = np.concatenate(N); M = np.concatenate(M); C = np.concatenate(C); T = np.concatenate(T)
        uv = _box_uv(P - nd.pivot, N, M) if (use_tex and GLTF_MATS[g][2]) else None
        out[g] = (P - nd.pivot, N, uv, C, T)
    return out

def to_gltf_xyz(a):
    a = np.asarray(a, float); return np.stack([a[..., 1], a[..., 2], a[..., 0]], -1)

def weld(P, N, uv, C, T, tol=1e-5):
    """merge identical vertices (same position, normal, uv, colour) so flat boxes and smooth meshes share what they can"""
    q = [np.round(P / tol).astype(np.int64), np.round(N * 200).astype(np.int64), np.round(C * 255).astype(np.int64)]
    if uv is not None: q.append(np.round(uv * 4000).astype(np.int64))
    key = np.concatenate(q, axis=1); _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel(); order = np.argsort(first); remap = np.empty(len(first), int); remap[order] = np.arange(len(first)); idx = remap[inv]
    keep = first[order]
    return P[keep], N[keep], (uv[keep] if uv is not None else None), C[keep], idx[T]

def write_glb(path, nodes, lod, pose, seed=SEED):
    L = LOD[lod]; use_tex = L['tex']
    pivots = [n.pivot for n in nodes.values() if n.name in ('shell_l', 'shell_r', 'arm_base', 'arm_mid', 'arm_tip', 'hopper_lid', 'head')]
    binbuf = bytearray(); views = []; accs = []; images = []; textures = []; samplers = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    def add_view(data, target=None):
        while len(binbuf) % 4: binbuf.append(0)
        views.append({'buffer': 0, 'byteOffset': len(binbuf), 'byteLength': len(data), **({'target': target} if target else {})}); binbuf.extend(data); return len(views) - 1
    def add_acc(arr, ctype, ncomp, target, normalized=False, minmax=False):
        a = np.ascontiguousarray(arr); vi = add_view(a.tobytes(), target)
        d = {'bufferView': vi, 'componentType': ctype, 'count': int(len(a)), 'type': {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[ncomp]}
        if normalized: d['normalized'] = True
        if minmax: d['min'] = [float(v) for v in a.min(0)]; d['max'] = [float(v) for v in a.max(0)]
        accs.append(d); return len(accs) - 1
    tex_index = {}
    if use_tex:
        for k in ('paint', 'dirt'):
            vi = add_view(png_bytes(make_texture(k, L['texn'] if k == 'paint' else min(256, L['texn']), seed))); images.append({'bufferView': vi, 'mimeType': 'image/png', 'name': 'detail_' + k}); textures.append({'sampler': 0, 'source': len(images) - 1}); tex_index[k] = len(textures) - 1
    mats = []; mat_index = {}
    for g, (met, rough, tex, em) in GLTF_MATS.items():
        m = {'name': g, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': met, 'roughnessFactor': rough}, 'doubleSided': False}
        if g == 'Lamp': m['pbrMetallicRoughness']['baseColorFactor'] = [0.9, 0.45, 0.05, 1.0]
        if tex and use_tex: m['pbrMetallicRoughness']['baseColorTexture'] = {'index': tex_index[tex]}
        if em: m['emissiveFactor'] = list(em); m['extensions'] = {'KHR_materials_emissive_strength': {'emissiveStrength': 6.0}}
        mat_index[g] = len(mats); mats.append(m)
    geoms = {n: _geometry(nodes[n]) for n in nodes if nodes[n].b.buckets}; occ = occupancy(list(geoms.values()))
    aos = {n: [vertex_ao(g[1], g[2], occ) if (g[0] not in ('decal', 'mark', 'lamp')) else np.ones(len(g[1])) for g in geoms[n]] for n in geoms}
    meshes = []; gnodes = []; name_idx = {}; stats = {'triangles': 0, 'vertices': 0, 'per_node': {}}
    order = [n for n in NODES if n in nodes]
    for name in order: name_idx[name] = len(gnodes); gnodes.append({'name': name})
    for name in order:
        nd = nodes[name]; gn = gnodes[name_idx[name]]
        par = nodes.get(nd.parent) if nd.parent else None
        rel = nd.pivot - (par.pivot if par else np.zeros(3)); gn['translation'] = [float(v) for v in to_gltf_xyz(rel)]
        q = nd.q; gn['rotation'] = [float(q[1]), float(q[2]), float(q[0]), float(q[3])]
        ex = {'axes': {k: v for k, v in (nd.axes or {}).items()}}
        if nd.note: ex['note'] = nd.note
        gn['extras'] = ex
        if nd.parent: gnodes[name_idx[nd.parent]].setdefault('children', []).append(name_idx[name])
        if nd.b.buckets:
            prims = []; tri_n = 0
            for g, (P, N, uv, C, T) in _mesh_arrays(nd, geoms[name], aos[name], seed, pivots, use_tex).items():
                P, N, uv, C, T = weld(P, N, uv, C, T)
                T = T.astype(np.uint16) if len(P) < 65536 else T.astype(np.uint32)
                at = {'POSITION': add_acc(to_gltf_xyz(P).astype(np.float32), 5126, 3, 34962, minmax=True), 'NORMAL': add_acc(to_gltf_xyz(N).astype(np.float32), 5126, 3, 34962)}
                if uv is not None: at['TEXCOORD_0'] = add_acc(uv.astype(np.float32), 5126, 2, 34962)
                c8 = np.concatenate([np.clip(C, 0, 1), np.ones((len(C), 1))], 1); at['COLOR_0'] = add_acc((c8 * 255.0 + 0.5).astype(np.uint8), 5121, 4, 34962, normalized=True)
                ia = add_acc(T.reshape(-1), 5123 if T.dtype == np.uint16 else 5125, 1, 34963)
                prims.append({'attributes': at, 'indices': ia, 'material': mat_index[g], 'mode': 4}); tri_n += len(T); stats['vertices'] += len(P)
            meshes.append({'name': name + '_mesh', 'primitives': prims}); gn['mesh'] = len(meshes) - 1; stats['triangles'] += tri_n; stats['per_node'][name] = tri_n
    doc = {'asset': {'version': '2.0', 'generator': 'collector_model.py (living-islands)'}, 'extensionsUsed': ['KHR_materials_emissive_strength'], 'scene': 0, 'scenes': [{'name': 'collector', 'nodes': [name_idx['collector']]}],
           'nodes': gnodes, 'meshes': meshes, 'materials': mats, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(binbuf)}]}
    if images: doc['images'] = images; doc['textures'] = textures; doc['samplers'] = samplers
    doc['scenes'][0]['extras'] = {'lod': lod, 'pose': pose, 'frame': 'glTF: +Y up, +Z forward (the machine faces +Z), +X left; metres', 'length_m': LEN_M, 'triangles': stats['triangles'],
                                  'poses': {p: {k: v for k, v in pose_rotations(p).items()} for p in POSES}, 'status_lamp': 'node lamp, material Lamp (emissive amber)'}
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4); bb = bytes(binbuf) + b'\x00' * ((4 - len(binbuf) % 4) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\x00') + bb
    with open(path, 'wb') as f: f.write(data)
    stats['bytes'] = len(data); return stats


# ------------------------------------------------------------------------------------------------- command line
def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Beach collector hero model: GLB per level of detail and pose.')
    ap.add_argument('--out', required=True, help='output directory (made if missing)')
    ap.add_argument('--lod', default='all', help='hero, live, far or all')
    ap.add_argument('--pose', default='rest', help='rest, sun, grab or park (or all)')
    ap.add_argument('--seed', type=int, default=SEED)
    a = ap.parse_args(argv)
    a.lods = list(LODS) if a.lod == 'all' else [a.lod]
    a.poses = list(POSES) if a.pose == 'all' else [a.pose]
    if any(l not in LODS for l in a.lods): ap.error('--lod must be one of hero, live, far, all')
    if any(p not in POSES for p in a.poses): ap.error('--pose must be one of rest, sun, grab, park, all')
    return a

def out_name(lod, pose): return 'collector_%s%s.glb' % (lod, '' if pose == 'rest' else '_' + pose)

def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True); rep = {}
    for lod in a.lods:
        for pose in a.poses:
            nodes = build(lod, pose, a.seed); fn = os.path.join(a.out, out_name(lod, pose)); st = write_glb(fn, nodes, lod, pose, a.seed)
            rep[out_name(lod, pose)] = st; print('GLB', fn, 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1))
    with open(os.path.join(a.out, 'collector_report.json'), 'w') as f: json.dump({k: {kk: vv for kk, vv in v.items()} for k, v in rep.items()}, f, indent=1)


if __name__ == '__main__':
    main()
