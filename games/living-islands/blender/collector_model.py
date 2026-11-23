"""BEACH COLLECTOR, HERO MODEL, version 2 (design A, the low tortoise, with design D's tip-up shell). See COLLECTOR_MODEL.md.
Headless:  blender -b --python collector_model.py -- --out DIR [--lod hero|live|far|all] [--pose rest|sun|grab|park|all]
Pure python + numpy: the geometry, the baked textures (collector_tex.py: charts, atlas, wear, normal map; collector_jpeg.py: the JPEG writer), the animation clips and the glTF 2.0 binary writer, so it also runs under plain python3 (python3 collector_model.py --out DIR). Blender is only needed for the pictures (collector_shots.py).
Frame while building: +X forward, +Y left, +Z up, metres, ground at z = 0. The GLB is written in the glTF frame (Y up, +Z forward, +X left): (x, y, z) -> (y, z, x).
Every moving part is its own named node with its pivot at the joint, so the live page can rotate it by name (see NODES and AXES), and seven named clips move them (clip_table). Four optional quirk parts are nodes named quirk_*.
Parts that other family members reuse are separate functions: part_tracks, part_lamp, part_shell_half (and shell_cells), part_hopper, part_head, part_arm, part_chassis, part_quirk_*; the far level's weathering is bake_colour().
Original design, no maker names, no lettering, no round eyes: a head pod with one dark visor band with a faint glow strip, a small square sensor window and one status lamp. Deterministic (seeded)."""
import sys, os, math, json, struct, argparse
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
# tex: None (vertex colours, the far level) or the atlas plan: groups -> dict(n = atlas size, nrm = normal map size, orm = occlusion/roughness/metal size, q = jpeg qualities (colour, normal, orm),
# dens = texels per metre at most, swatch = material keys that share a tiny swatch instead of a chart, bump = normal map gain)
LOD = {
    'hero': dict(pitch=0.034, links=True, guide=True, hub_bolts=8, dome=(28, 15), dome_in=(8, 4), cells=(0, 0, 2), rim_bolts=13, litter=12, tex=True, seg=12, wear_decals=True, rods=8, fingers=True, fine=True, circ=40, simple=False,
                 atlas={'body': dict(n=1024, nrm=512, orm=512, q=(70, 76, 52), dens=700, bump=5.0), 'metal': dict(n=1024, nrm=512, orm=512, q=(70, 76, 52), dens=560, bump=5.0), 'glass': dict(n=512, nrm=512, orm=256, q=(74, 78, 55), dens=560, bump=3.5)}),
    'live': dict(pitch=0.075, links=False, guide=False, hub_bolts=0, dome=(16, 10), dome_in=(0, 0), cells=(0, 0, 1), rim_bolts=0, litter=0, tex=True, seg=8, wear_decals=False, rods=5, fingers=True, fine=False, circ=16, simple=False,
                 atlas={'all': dict(n=512, nrm=512, orm=256, q=(68, 74, 50), dens=420, bump=6.0, hidden=0.16)}),
    'far': dict(pitch=0.0, links=False, guide=False, hub_bolts=0, dome=(9, 5), dome_in=(0, 0), cells=(0, 0, 0), rim_bolts=0, litter=0, tex=False, seg=6, wear_decals=False, rods=4, fingers=False, fine=False, circ=8, simple=True, atlas=None),
}

# ------------------------------------------------------------------------------------------------- materials: key -> (glTF material for the far level, base colour (linear rgb))
MATS = {
    'paint': ('Paint', (0.112, 0.150, 0.100)), 'paint2': ('Paint', (0.092, 0.128, 0.088)), 'patch': ('Paint', (0.50, 0.27, 0.06)), 'arm': ('Paint', (0.62, 0.34, 0.07)), 'mark': ('Paint', (0.62, 0.60, 0.52)),
    'patch2': ('Paint', (0.14, 0.20, 0.25)),
    'decal': ('Paint', (0.28, 0.095, 0.035)),
    'guard': ('Metal', (0.11, 0.115, 0.12)), 'metal': ('Metal', (0.15, 0.15, 0.155)), 'hub': ('Metal', (0.13, 0.13, 0.135)), 'bolt': ('Metal', (0.115, 0.098, 0.088)),
    'link': ('Rubber', (0.04, 0.04, 0.045)), 'rubber': ('Rubber', (0.026, 0.026, 0.03)),
    'grime': ('Grime', (0.012, 0.012, 0.013)), 'frame': ('Grime', (0.020, 0.024, 0.030)),
    'cell': ('Cell', (0.018, 0.038, 0.090)), 'visor': ('Lens', (0.012, 0.016, 0.02)), 'lens': ('Lens', (0.02, 0.028, 0.034)), 'cap': ('Lens', (0.03, 0.025, 0.02)), 'lamp': ('Lamp', (0.9, 0.45, 0.05)), 'glow': ('Glow', (0.9, 0.45, 0.05)),
    'mirror': ('Lens', (0.30, 0.32, 0.33)), 'bead': ('Plastic', (0.03, 0.20, 0.30)), 'shellc': ('Plastic', (0.55, 0.45, 0.34)),
    'tape': ('Cord', (0.52, 0.47, 0.33)), 'twine': ('Cord', (0.30, 0.20, 0.10)), 'sand': ('Cord', (0.26, 0.19, 0.10)),
    'lit_blue': ('Plastic', (0.04, 0.12, 0.30)), 'lit_orange': ('Plastic', (0.55, 0.2, 0.04)), 'lit_white': ('Plastic', (0.55, 0.55, 0.5)),
    'lit_glass': ('Plastic', (0.04, 0.22, 0.14)), 'lit_red': ('Plastic', (0.40, 0.05, 0.04)),
}
GLTF_MATS = {   # far level: name: (metallic, roughness, emissive rgb or None); vertex colours carry the colour
    'Paint': (0.0, 0.70, None), 'Metal': (0.55, 0.55, None), 'Rubber': (0.0, 0.95, None), 'Grime': (0.0, 0.95, None),
    'Cell': (0.05, 0.45, None), 'Lens': (0.0, 0.28, None), 'Lamp': (0.0, 0.3, (1.0, 0.52, 0.06)), 'Glow': (0.0, 0.3, (1.0, 0.52, 0.06)), 'Cord': (0.0, 1.0, None), 'Plastic': (0.0, 0.5, None),
}
# which baked texture group a material key belongs to (hero: three atlases; live: one atlas for all three)
KEYGROUP = {'paint': 'body', 'paint2': 'body', 'patch': 'body', 'patch2': 'body', 'arm': 'body', 'mark': 'body', 'decal': 'body', 'tape': 'body', 'twine': 'body', 'sand': 'body',
            'guard': 'metal', 'metal': 'metal', 'hub': 'metal', 'bolt': 'metal', 'link': 'metal', 'rubber': 'metal', 'grime': 'metal', 'frame': 'metal',
            'cell': 'glass', 'visor': 'glass', 'lens': 'glass', 'cap': 'glass', 'mirror': 'glass', 'bead': 'glass', 'shellc': 'glass',
            'lit_blue': 'glass', 'lit_orange': 'glass', 'lit_white': 'glass', 'lit_glass': 'glass', 'lit_red': 'glass'}
UNTEXTURED = ('lamp', 'glow')
TEX_MATERIAL = {'body': 'Body', 'metal': 'Metal', 'glass': 'Glass', 'all': 'Collector'}
SWATCH_KEYS = ('bolt',)          # tiny parts: one shared swatch, shaded smooth (a domed bolt head), so they cost few vertices
SMOOTH_KEYS = ('bolt', 'cell')   # shaded smooth in the textured levels (shared vertices): bolts and the raised solar cells
# the fixed look of the one machine; seed changes the dirt per machine, not the design
SEED = 7
SAND = np.array((0.26, 0.19, 0.10)); RUST = np.array((0.28, 0.095, 0.035)); SALT = np.array((0.80, 0.79, 0.72)); BARE = np.array((0.30, 0.29, 0.27))


# ------------------------------------------------------------------------------------------------- noise and small helpers live in collector_tex.py
from collector_tex import vnoise, fbm, sstep, mixc


# ------------------------------------------------------------------------------------------------- the builder: the concept sheet's Builder plus per-vertex extras
class MB(CS.Builder):
    """collects geometry per (material key, smooth). Besides the vertices it remembers for every vertex an edge value (0 flat, 1 sharp rim, used for paint wear) and a UV mode."""
    def __init__(self):
        super().__init__(); self.x = {}; self._kind = 'box'; self._mode = 0; self.fix = []

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
    def cyl(self, *a, **kw):
        if a and a[0] == 'bolt': self.fix.append(np.array(a[1], float))           # the fixings: where rust runs and chips start
        self._k('cyl', super().cyl, *a, **kw)
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
        self.name = name; self.parent = parent; self.pivot = np.array(pivot, float); self.b = MB(); self.axes = axes or {}; self.note = note; self.q = (0.0, 0.0, 0.0, 1.0); self.cells = 0; self.centres = []; self.feats = []


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
def part_lamp(nd, nd_dome, at, L, stalk=0.032, d=0.05):
    """the lamp: nd = stalk, bezel and a dark smoky cap dome; nd_dome = the emissive dome, a hair larger than the cap, its pivot at its base. The page blinks the lamp by scaling nd_dome between 1.0 and 0.88
    (at 0.88 it sits inside the cap, so the lamp looks off but the housing stays): no emissive animation is needed. Far level: one dome only."""
    b = nd.b; x, y, z = at; bd = nd_dome.b; base = (x, y, z + stalk + 0.007); nd_dome.pivot = np.array(base, float)
    if L['simple']:
        bd.sq('lamp', (x, y, z + stalk), (d * 1.3, d * 1.3, d * 1.6), e1=0.9, e2=0.9, nu=2, nv=5, smooth=True, half=True); return
    b.rod('metal', (x, y, z), (x, y, z + stalk), 0.02, 0.02, seg=6)
    b.cyl('metal', (x, y, z + stalk), d * 1.3, 0.014, seg=L['seg'])
    nu = 5 if L['fine'] else 3; nv = 10 if L['fine'] else 7
    b.sq('cap', base, (d, d, d * 1.4), e1=0.9, e2=0.9, nu=nu, nv=nv, smooth=True, half=True)
    bd.sq('lamp', base, (d * 1.04, d * 1.04, d * 1.46), e1=0.9, e2=0.9, nu=nu, nv=nv, smooth=True, half=True)

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
        cx, cy = nd.centres[min(len(nd.centres) // 2 + 1, len(nd.centres) - 1)]; p = surf(cx, abs(cy), 0.009); nd.feats.append(('crack', tuple(p)))
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
        CS.litter_bits(b, (cx, 0, z0 + 0.06), (0.012, w / 2 - 0.115, 0.20), L['litter'], 11 + seed)      # kept well inside the walls (a bottle lies up to 6 cm either way)
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
POD = dict(c=(0.425, 0.0, 0.306), s=(0.150, 0.205, 0.128), e1=0.6, e2=0.62)

def pod_front_x(y, z):
    """x of the pod's front surface at (y, z) (the superellipsoid of the pod, before its small tilt)"""
    a, b_, c_ = POD['s'][0] / 2, POD['s'][1] / 2, POD['s'][2] / 2; e1, e2 = POD['e1'], POD['e2']
    zn = np.clip(np.abs((np.asarray(z) - POD['c'][2]) / c_), 0, 0.999); sinu = zn ** (1.0 / e1); cu = (1 - sinu ** 2) ** (e1 / 2.0)
    yn = np.clip(np.abs(np.asarray(y) / np.maximum(b_ * cu, 1e-6)), 0, 0.999); r = (1 - yn ** (2.0 / e2)) ** (e2 / 2.0)
    return POD['c'][0] + a * cu * r

def _strip_grid(b, mat, ys, zlo, zhi, nz, lift, smooth=True):
    """a curved strip hugging the pod front: columns ys, rows from zlo(y) to zhi(y); returns nothing, draws into b"""
    V = []; F = []; nz = max(nz, 1)
    for y in ys:
        for k in range(nz + 1):
            z = zlo(y) + (zhi(y) - zlo(y)) * k / nz; V.append((float(pod_front_x(y, z)) + lift, y, z))
    for i in range(len(ys) - 1):
        for k in range(nz):
            a_ = i * (nz + 1) + k; F.append((a_, a_ + nz + 1, a_ + nz + 2, a_ + 1))
    V = np.array(V); p = V[F[0][1]] - V[F[0][0]]; q = V[F[0][3]] - V[F[0][0]]
    if np.cross(p, q)[0] < 0: F = [tuple(reversed(f)) for f in F]
    b.raw(mat, smooth, V, F)

def part_head(nd, L, seed):
    """a small head pod on a short neck, asymmetric and a little cocked. One wide dark visor band, narrower and drooping on the right, under a tilted brow hood; a faint glow strip along the inner lower edge of the visor
    (the colour of the status lamp, about 8 per cent of its strength); one small rounded-square sensor window low on the right. Nothing round and staring. nd pivot = the neck (the head tilts about it)."""
    b = nd.b; fine = L['fine']; simple = L['simple']
    for k in range(4 if not simple else 1):                                              # the bellows of the neck: four ribs of rubber
        b.cyl('rubber', (0.318 + 0.019 * k, 0, 0.300), 0.092 if k % 2 == 0 else 0.080, 0.016 if not simple else 0.07, r=(0, 90, 0), seg=L['seg'])
    b.sq('paint', POD['c'], POD['s'], (1.5, -3, -2), e1=POD['e1'], e2=POD['e2'], nu=6 if fine else (2 if simple else 3), nv=18 if fine else (6 if simple else 8), smooth=True)
    if simple:
        b.box('visor', (0.4985, -0.004, 0.304), (0.012, 0.15, 0.048), (0, -3, 0)); b.box('metal', (0.4965, 0.0, 0.3375), (0.040, 0.17, 0.012), (0, -3, 0)); return nd
    # visor: left end (y > 0) taller than the right end, which droops (a cut corner of the band)
    n_y = 15 if fine else 7; ys = np.linspace(-0.080, 0.071, n_y)
    zhi = lambda y: 0.3265 - 0.0105 * (1 - (y + 0.080) / 0.151) ** 1.5 - 0.0 * y
    zlo = lambda y: 0.2885 + 0.0040 * (1 - (y + 0.080) / 0.151) + 0.0095 * np.clip((-y - 0.050) / 0.030, 0, 1)
    _strip_grid(b, 'visor', ys, zlo, zhi, 4 if fine else 2, 0.0035)
    ys2 = np.linspace(-0.040, 0.056, 9 if fine else 5)
    _strip_grid(b, 'glow', ys2, lambda y: zlo(y) + 0.0040, lambda y: zlo(y) + 0.0112, 1, 0.0046)
    b.box('metal', (0.4965, 0.012, 0.3385), (0.040, 0.17, 0.012), (3, -3, 0))                    # brow hood, tilted
    b.box('metal', (0.495, -0.002, 0.2735), (0.026, 0.15, 0.008), (0, -3, 0))                    # lower lip
    sx, sy_, sz = float(pod_front_x(-0.056, 0.270)) - 0.001, -0.056, 0.270
    b.sq('metal', (sx, sy_, sz), (0.014, 0.038, 0.030), (0, -3, 4), e1=0.25, e2=0.25, nu=2, nv=8, smooth=True)            # sensor bezel, a rounded square
    b.sq('lens', (sx + 0.0045, sy_, sz), (0.010, 0.026, 0.020), (0, -3, 4), e1=0.25, e2=0.25, nu=2, nv=8, smooth=True)    # sensor window
    if fine:
        for sy in (-1, 1):
            b.box('metal', (0.405, sy * 0.1015, 0.296), (0.07, 0.006, 0.05)); bolts_y(b, [(0.385, sy * 0.106, 0.296), (0.425, sy * 0.106, 0.296)], 0.011, 0.006)
        for k in range(3): b.box('grime', (0.40, 0.1055, 0.322 - 0.008 * k), (0.05, 0.003, 0.0035))     # hearing slits on the left side
        b.cyl('hub', (0.352, 0.0, 0.300), 0.052, 0.012, r=(0, 90, 0), seg=10)
        for k in range(4): b.box('grime', (0.43 + 0.012 * k, 0.0, 0.372 - 0.001 * k), (0.006, 0.12, 0.003))        # vent slits in the top of the pod
        bolts(b, [(0.46, 0.07, 0.368), (0.46, -0.07, 0.368), (0.39, 0.07, 0.366), (0.39, -0.07, 0.366)], 0.011, 0.006)
        b.box('tape', (0.40, 0.04, 0.3705), (0.07, 0.05, 0.003), (0, 0, 30))                  # tape over a crack in the lid
        CS.twine(b, (0.50, -0.06, 0.280), 0.11)
    return nd


# ------------------------------------------------------------------------------------------------- the quirk slots: optional parts, one node each (named quirk_*), so that a pick can plug in or out
QUIRKS = {
    'quirk_patch': dict(parent='hopper', category='repair', note='a riveted repair plate in the wrong colour with sealant and crossed tape, on the right (-y) wall of the hopper'),
    'quirk_mirror': dict(parent='head', category='accessory', note='a small mirror taped to a bent wire on the head, turned to see behind'),
    'quirk_trinket': dict(parent='hopper_lid', category='keepsake', note='a blue glass bead and a pale spiral shell, tied to the lid handle and kept there'),
    'quirk_panel': dict(parent='hopper', category='damage', note='a cover panel hanging by one top bolt, leaning out from the left (+y) wall of the hopper'),
}

def part_quirk_patch(nd, L, seed):
    b = nd.b; c = np.array((HOP['x0'] + 0.085, -0.1935, 0.255))
    if L['fine']: b.box('grime', tuple(c + np.array([0, 0.0012, 0])), (0.126, 0.0045, 0.106), (0, 0, -2))                       # the sealant bead round it, seen as a dark rim
    b.box('patch2', tuple(c + np.array([0, -0.0030, 0])), (0.112, 0.005, 0.092), (0, 0, -2))
    if not L['simple']:
        for dx in (-0.045, 0.0, 0.045):
            for dz in (-0.036, 0.036): b.cyl('bolt', tuple(c + np.array([dx, -0.0075, dz])), 0.011, 0.006, r=(90, 0, 0), seg=6)
        b.box('tape', tuple(c + np.array([0.0, -0.0065, 0.0])), (0.095, 0.002, 0.016), (0, 0, 34)); b.box('tape', tuple(c + np.array([0.0, -0.0066, 0.0])), (0.095, 0.002, 0.016), (0, 0, -34))
    return nd

def part_quirk_mirror(nd, L, seed):
    b = nd.b; base = np.array((0.455, 0.078, 0.368)); tip = base + np.array([0.010, 0.014, 0.046]); b.rod('metal', tuple(base), tuple(tip), 0.007, 0.007, seg=5)
    m = tip + np.array([0.006, 0.006, 0.012]); rot = (0, -28, 14)
    if L['fine']: b.box('metal', tuple(m), (0.005, 0.060, 0.044), rot)                                    # the frame of the little mirror
    b.box('mirror', tuple(m + np.array([0.0035, 0.0, 0.0012])), (0.004, 0.052, 0.036), rot)
    b.cyl('tape', tuple(base + np.array([0, 0, 0.012])), 0.018, 0.016, seg=7)
    return nd

def part_quirk_trinket(nd, L, seed):
    b = nd.b; lz = HOP['z1'] + 0.012 + 0.0225; p = np.array((HOP['x0'] + 0.085, -0.075, lz))
    b.sq('bead', tuple(p + np.array([0, 0, 0.013])), (0.030, 0.030, 0.030), e1=1.0, e2=1.0, nu=5 if L['fine'] else 3, nv=10 if L['fine'] else 6, smooth=True)
    q = np.array((HOP['x0'] + 0.045, 0.02, lz))
    b.cyl('shellc', tuple(q + np.array([0, 0, 0.011])), 0.030, 0.022, r=(0, 0, 0), seg=9 if L['fine'] else 6, taper=0.25, smooth=True)
    if L['fine']:
        b.rod('twine', (HOP['x0'] + 0.03, -0.05, lz + 0.003), tuple(p + np.array([0, 0.012, 0.006])), 0.003, 0.003, seg=4)
        b.rod('twine', (HOP['x0'] + 0.03, -0.05, lz + 0.003), tuple(q + np.array([0.01, -0.008, 0.002])), 0.003, 0.003, seg=4)
    return nd

def part_quirk_panel(nd, L, seed):
    b = nd.b; c = np.array((HOP['x0'] + 0.085, 0.1985, 0.255)); piv = c + np.array([0, 0, 0.046])
    b.box('paint2', tuple(c), (0.112, 0.006, 0.092), (0, 0, 0), pivot=tuple(piv), prot=(17, 0, 0))
    if not L['simple']:
        b.cyl('bolt', tuple(piv + np.array([0.0, 0.0035, -0.003])), 0.013, 0.007, r=(90, 0, 0), seg=6)
        b.box('tape', tuple(c + np.array([0.02, 0.004, -0.02])), (0.05, 0.002, 0.014), (0, 0, 20), pivot=tuple(piv), prot=(17, 0, 0))
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
NODES = ['collector', 'chassis', 'track_l', 'track_r', 'shell_l', 'shell_r', 'head', 'lamp', 'lamp_dome', 'arm_base', 'arm_mid', 'arm_tip', 'finger_l', 'finger_r', 'hopper', 'hopper_lid',
         'quirk_patch', 'quirk_mirror', 'quirk_trinket', 'quirk_panel']
AXES = {
    'shell_l': dict(axis='y', rest=0, range=[0, 32], note='rotate about the hinge at the front; positive lifts the rear (tips the cells to the sun)'),
    'shell_r': dict(axis='y', rest=0, range=[0, 32], note='as shell_l; the two halves are tipped by slightly different angles'),
    'head': dict(axis='y then x then z', rest=0, range=[-14, 16], note='pitch about y (negative looks up), roll about x for the head tilt (+-18), a little yaw about z (+-20); the visor, its glow strip and the lamp move with it'),
    'arm_base': dict(axis='z then y', rest=0, range=[-60, 60], pitch_range=[0, 180], note='yaw about z (to the sides, +-60), then pitch about y; pitch 0 = stowed pointing back, about 175 = swung up and over, reaching forward and down'),
    'arm_mid': dict(axis='y', rest=0, range=[-200, 10], note='elbow, relative to the upper arm; the stowed forearm lies folded forward'),
    'arm_tip': dict(axis='y', rest=0, range=[-40, 80], note='wrist, relative to the forearm'),
    'finger_l': dict(axis='z', rest=0, range=[-5, 30], note='gripper finger, positive opens'),
    'finger_r': dict(axis='z', rest=0, range=[-30, 5], note='gripper finger, negative opens'),
    'hopper_lid': dict(axis='y', rest=0, range=[0, 70], note='hinged at the front edge, positive lifts the back edge'),
    'track_l': dict(axis=None, note='rigid tread (hero has real links); see scene extras tread_scroll for how the page shows motion'),
    'track_r': dict(axis=None, note='as track_l'),
    'lamp': dict(axis=None, note='stalk, bezel and the dark smoky cap of the status lamp'),
    'lamp_dome': dict(axis='scale', rest=1.0, range=[0.88, 1.0], note='the emissive dome (material Lamp): scale 1.0 = lit, 0.88 = hidden inside the cap = off; the lamp_blink clip does this with STEP keys'),
}
for _q, _d in QUIRKS.items(): AXES[_q] = dict(axis=None, quirk=True, category=_d['category'], slot=_q, optional=True, default_visible=True, note=_d['note'] + '; hide or delete the node to take the quirk off')

# the status lamp code: one colour at a time on the lamp (the dome); the visor glow strip follows it at a small fraction. The page sets material Lamp emissiveFactor and KHR emissive strength (Glow: the same colour, ratio).
LAMP_CODE = {
    'emissive_strength_range': [0.3, 8.0], 'default_strength': 6.0, 'glow_ratio': 0.08,
    'states': {
        'search': {'colour': [1.0, 0.62, 0.08], 'strength': 4.0, 'pattern': 'slow blink, 1 s period, half on (clip lamp_blink)', 'meaning': 'amber: searching the strandline'},
        'found': {'colour': [0.30, 0.95, 0.32], 'strength': 6.0, 'pattern': 'steady with a 2 s flicker (the page jitters the strength 4 to 8)', 'meaning': 'green: item found and held'},
        'low_charge': {'colour': [1.0, 0.45, 0.04], 'strength': 0.6, 'pattern': 'dim, slow pulse of 4 s between 0.3 and 0.9', 'meaning': 'dim amber: low charge, heading for the charge spot'},
    },
    'research_note_states': 'the colour code of research/BEACH_COLLECTOR.md (steady pale green working, amber blinks for full or waiting) can be mapped onto the same three colours; the code is old and not logical, on purpose',
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
    hd = N('head', 'collector', HEAD_PIVOT); lp = N('lamp', 'head', LAMP_AT); ld = N('lamp_dome', 'lamp', LAMP_AT)
    ab = N('arm_base', 'collector', SHOULDER); am = N('arm_mid', 'arm_base', ELBOW_STOW + np.array([0, 0, 0])); at = N('arm_tip', 'arm_mid', WRIST_STOW + np.array([0, -ARM_DY, 0]))
    fl = N('finger_l', 'arm_tip', WRIST_STOW); fr = N('finger_r', 'arm_tip', WRIST_STOW)
    hp = N('hopper', 'collector', (HOP['x1'], 0, HOP['z1'])); hl = N('hopper_lid', 'hopper', (HOP['x1'], 0, HOP['z1'] + 0.012))
    part_chassis(ch, L, seed)
    part_tracks(tl, 1, L, dent=0.0); part_tracks(tr, -1, L, dent=(-13 if L['fine'] else 0.0))
    part_shell_half(sl, 1, L, seed, patch=False, crack=True, tape_strip=True); part_shell_half(sr, -1, L, seed, patch=True, crack=False, tape_strip=False)
    part_head(hd, L, seed); part_lamp(lp, ld, LAMP_AT, L)
    part_arm(ab, am, at, fl, fr, L, seed)
    part_hopper(hp, hl, L, seed)
    qp = {'quirk_patch': (HOP['x0'] + 0.085, -0.1935, 0.255), 'quirk_mirror': (0.455, 0.078, 0.368), 'quirk_trinket': (HOP['x0'] + 0.085, -0.075, HOP['z1'] + 0.0345), 'quirk_panel': (HOP['x0'] + 0.085, 0.1985, 0.30)}
    for q, d in QUIRKS.items(): N(q, d['parent'], qp[q])
    part_quirk_patch(nodes['quirk_patch'], L, seed); part_quirk_mirror(nodes['quirk_mirror'], L, seed); part_quirk_trinket(nodes['quirk_trinket'], L, seed); part_quirk_panel(nodes['quirk_panel'], L, seed)
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
    if gname in ('Lamp', 'Glow'): return np.tile(base, (n, 1))
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


# ------------------------------------------------------------------------------------------------- the geometry as the writer needs it
def _geometry(nd, smooth_keys=()):
    """per material key: world vertices, normals, edge, mode, triangles (flat buckets are split per face, smooth ones keep shared vertices; keys in smooth_keys are shaded smooth even when built flat)"""
    out = []
    for (mat, smooth), (vs, fs, _) in nd.b.buckets.items():
        V = np.concatenate(vs); ex = nd.b.x[(mat, smooth)]
        edge = np.concatenate([e[0] for e in ex]); mode = np.concatenate([e[1] for e in ex])
        given = None if any(e[2] is None for e in ex) else np.concatenate([e[2] for e in ex])
        tris = []
        for q in fs:
            for k in range(1, len(q) - 1): tris.append((q[0], q[k], q[k + 1]))
        T = np.array(tris, int)
        sm = smooth or mat in smooth_keys
        if given is not None or sm:
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
SKIP_AO = ('decal', 'mark', 'sand', 'twine', 'lamp', 'glow')
def occ_points(glist):
    """surface sample points (about one per 12 mm cell) of a list of geometry entries, for the occupancy grid"""
    pts = []
    for mat, Pv, Nv, Ev, Mv, Tv in glist:
        if mat in SKIP_AO: continue
        A, B, C = Pv[Tv[:, 0]], Pv[Tv[:, 1]], Pv[Tv[:, 2]]; area = 0.5 * np.linalg.norm(np.cross(B - A, C - A), axis=1)
        k = np.clip((area / (AO_CELL * AO_CELL * 0.8)).astype(int) + 1, 1, 60)
        for ki in np.unique(k):
            m = k == ki; r = np.random.default_rng(int(ki)).random((int(m.sum()), int(ki), 2)); r = np.where(r.sum(2, keepdims=True) > 1, 1 - r, r)
            w = np.concatenate([r, 1 - r.sum(2, keepdims=True)], 2)
            pp = w[..., 0:1] * A[m][:, None] + w[..., 1:2] * B[m][:, None] + w[..., 2:3] * C[m][:, None]; pts.append(pp.reshape(-1, 3))
    return np.concatenate(pts) if pts else np.zeros((0, 3))

def voxelise(pts, lo, dims):
    grid = np.zeros(dims, bool)
    if len(pts):
        ix = ((pts - lo) / AO_CELL).astype(int); ok = (ix >= 0).all(1) & (ix < dims).all(1); ix = ix[ok]; grid[ix[:, 0], ix[:, 1], ix[:, 2]] = True
    return grid

def occupancy(geoms):
    """a voxel grid (12 mm cells) of every surface in the machine (far level vertex occlusion)"""
    pts = np.concatenate([occ_points(g) for g in geoms]); lo = pts.min(0) - 0.15; hi = pts.max(0) + 0.15; dims = np.ceil((hi - lo) / AO_CELL).astype(int) + 1
    return voxelise(pts, lo, dims), lo

def vertex_ao(P, N, occ, strength=0.62, reach=(0.016, 0.03, 0.05, 0.08, 0.12)):
    grid, lo = occ; rng = np.random.default_rng(5)
    base = []
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


# ------------------------------------------------------------------------------------------------- the baked textures of the textured levels
STATIC_NODES = ('chassis', 'track_l', 'track_r', 'hopper')

def bake_textures(nodes, geoms, lod, seed):
    """unwrap and bake the atlas of every texture group of this level. Returns (uv per (node, geometry index) as (ntri, 3, 2) float32, {group: {'color', 'normal', 'orm': float images}}, stats)"""
    import collector_tex as TX
    L = LOD[lod]; keys = list(MATS.keys()); kgroup = np.array([('body', 'metal', 'glass').index(KEYGROUP[k]) if k in KEYGROUP else 0 for k in keys])
    base = [MATS[k][1] for k in keys]
    allpts = np.concatenate([occ_points(g) for g in geoms.values()]); lo = allpts.min(0) - 0.15; hi = allpts.max(0) + 0.15; dims = np.ceil((hi - lo) / AO_CELL).astype(int) + 1
    g_all = voxelise(allpts, lo, dims)
    g_static = voxelise(np.concatenate([occ_points(geoms[n]) for n in STATIC_NODES if n in geoms]), lo, dims); cache = {}
    def node_grid(name):
        if name not in cache:
            cache[name] = (g_static if name in STATIC_NODES else (g_static | voxelise(occ_points(geoms[name]), lo, dims)), lo, AO_CELL)
        return cache[name]
    fixes = [p for n in nodes.values() for p in n.b.fix]; fg = TX.make_fixgrid(fixes, lo, hi) if fixes else None
    cracks = [(f[1][0], f[1][1], f[1][2], 0.034) for n in nodes.values() for f in n.feats if f[0] == 'crack']
    voxel = {'all': (g_all, lo, AO_CELL), 'node': node_grid, 'fixgrid': fg}
    # collect the triangles per atlas group
    groups = {}
    for ni, name in enumerate(NODES):
        if name not in geoms: continue
        for gi, (mat, Pv, Nv, Ev, Mv, Tv) in enumerate(geoms[name]):
            if mat in UNTEXTURED: continue
            gname = 'all' if 'all' in L['atlas'] else KEYGROUP[mat]
            groups.setdefault(gname, []).append((name, gi, ni, mat, Pv[Tv], Nv[Tv], Ev[Tv], Mv[Tv]))
    uvs = {}; images = {}; stats = {}
    for gname in sorted(groups):
        spec = dict(L['atlas'][gname]); items = groups[gname]; ntri = [len(it[4]) for it in items]; off = np.concatenate([[0], np.cumsum(ntri)])
        tri = dict(V=np.concatenate([it[4] for it in items]), Nn=np.concatenate([it[5] for it in items]), E=np.concatenate([it[6] for it in items]), M=np.concatenate([it[7] for it in items]),
                   kidx=np.concatenate([np.full(len(it[4]), keys.index(it[3])) for it in items]), node=np.concatenate([np.full(len(it[4]), it[0]) for it in items]),
                   piece=np.concatenate([np.full(len(it[4]), j) for j, it in enumerate(items)]))
        spec['swatch_keys'] = SWATCH_KEYS; spec['hidden_below'] = spec.get('hidden', 0.08); spec['fixed_keys'] = ('link',)
        shader = TX.shade_all if gname == 'all' else TX.SHADERS[gname]
        uv, imgs, st = TX.bake_group(tri, spec['n'], spec, keys, base, kgroup, seed, voxel, fixes, cracks, shader)
        for j, it in enumerate(items): uvs[(it[0], it[1])] = uv[off[j]:off[j + 1]]
        images[gname] = imgs; stats[gname] = st
    return uvs, images, stats


def _encode_images(images, L):
    """float atlas images -> {group: (colour jpeg, normal jpeg, orm jpeg)}"""
    import collector_jpeg as J
    out = {}
    for g, im in images.items():
        sp = L['atlas'][g]; n = sp['n']; qc, qn, qo = sp['q']
        def to8(a, size):
            if size != n: a = TXdown(a, n // size)
            return (np.clip(a, 0, 1) * 255.0 + 0.5).astype(np.uint8)
        out[g] = (J.jpeg_bytes(to8(im['color'], n), qc, subsample=True), J.jpeg_bytes(to8(im['normal'], sp['nrm']), qn, chroma_scale=0.6), J.jpeg_bytes(to8(im['orm'], sp['orm']), qo, chroma_scale=0.6))
    return out

def TXdown(a, f):
    import collector_tex as TX
    return TX.downsample(a, f)


# ------------------------------------------------------------------------------------------------- animation clips (glTF animations: node rotation and scale keyframes)
def _ease(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)

def _qdot(a, b): return sum(x * y for x, y in zip(a, b))

def _track(seq_fn, spans, duration, n=7):
    """keyframes for one node. seq_fn(s) -> rotation sequence at progress s (0 to 1); spans = (t0, t1) over which s eases from 0 to 1. Returns times and quaternions (builder xyzw, hemisphere-continuous)"""
    t0, t1 = spans; times = [0.0]; 
    if t0 > 0: times.append(t0)
    for k in range(1, n): times.append(t0 + (t1 - t0) * k / n)
    times.append(t1)
    if duration > t1: times.append(duration)
    qs = []
    for t in times:
        q = rot_seq(seq_fn(_ease((t - t0) / max(t1 - t0, 1e-6))))
        if qs and _qdot(q, qs[-1]) < 0: q = tuple(-c for c in q)
        qs.append(q)
    return times, qs

def clip_table(lod):
    """name -> dict(duration, note, channels = [(node, path, times, values, interpolation)]); rotations are builder quaternions (xyzw), scale values are triples"""
    C = {}
    sun = pose_rotations('sun'); sl = sun['shell_l'][0][1]; sr = sun['shell_r'][0][1]; hy = sun['head'][0][1]; hx = sun['head'][1][1]
    def sun_chan(rev):
        ch = []
        for node, fn, sp in (('shell_l', lambda s: [('y', sl * s)], (0.0, 2.0)), ('shell_r', lambda s: [('y', sr * s)], (0.35, 2.4)), ('head', lambda s: [('y', hy * s), ('x', hx * s)], (0.8, 2.5))):
            t, q = _track(fn, sp, 2.6)
            if rev: t = [2.6 - x for x in reversed(t)]; q = list(reversed(q))
            ch.append((node, 'rotation', t, q, 'LINEAR'))
        return ch
    C['sun_open'] = dict(duration=2.6, note='rest to the sun pose: shell halves tip up (the left one first, a little clumsy), the head lifts and cocks', channels=sun_chan(False))
    C['sun_close'] = dict(duration=2.6, note='the sun pose back to rest', channels=sun_chan(True))
    yaw, a1, a2, a3 = arm_ik(GRAB_TARGET, grip_down=-82.0); y, t1, t2, t3 = arm_pose_angles(yaw, a1, a2, a3)
    def arm_chan(rev):
        dur = 3.6; ch = []
        specs = (('shell_l', lambda s: [('y', 12 * s)], (0.0, 0.8)), ('arm_base', None, None), ('arm_mid', lambda s: [('y', t2 * s)], (1.0, 2.9)), ('arm_tip', lambda s: [('y', t3 * s)], (1.7, 3.2)),
                 ('finger_l', lambda s: [('z', 14 * s)], (2.9, 3.5)), ('finger_r', lambda s: [('z', -14 * s)], (2.9, 3.5)))
        for node, fn, sp in specs:
            if node == 'arm_base':
                tt = sorted(set([0.0, 0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, dur])); qs = []
                for t in tt:
                    sp_ = _ease((t - 0.6) / 1.8); sy_ = _ease((t - 1.8) / 1.2); q = rot_seq([('z', y * sy_), ('y', t1 * sp_)])
                    if qs and _qdot(q, qs[-1]) < 0: q = tuple(-c for c in q)
                    qs.append(q)
                t_, q_ = tt, qs
            else: t_, q_ = _track(fn, sp, dur)
            if rev: t_ = [dur - x for x in reversed(t_)]; q_ = list(reversed(q_))
            ch.append((node, 'rotation', t_, q_, 'LINEAR'))
        return ch
    C['arm_unfold'] = dict(duration=3.6, note='the arm unfolds out of the slot between the shell halves (the left half tips 12 degrees to let it out) and reaches down to the left front, then the fingers open', channels=arm_chan(False))
    C['arm_stow'] = dict(duration=3.6, note='the reverse of arm_unfold', channels=arm_chan(True))
    C['lamp_blink'] = dict(duration=2.0, note='the lamp dome blinks: scale 1.0 (lit) and 0.88 (inside the cap, off), 1 s period, STEP keys; loop it. The page sets colour and strength by the status code', channels=[('lamp_dome', 'scale', [0.0, 0.5, 1.0, 1.5, 2.0], [(1.0,) * 3, (0.88,) * 3, (1.0,) * 3, (0.88,) * 3, (1.0,) * 3], 'STEP')])
    hq = lambda yv, xv, zv: rot_seq([('z', zv), ('y', yv), ('x', xv)])
    hk = [(0.0, 0, 0, 0), (0.7, -2, 9, 8), (1.1, -3, 10, 9), (1.8, -2, 9, 8), (2.4, 1, -4, -3), (3.0, 0, 0, 0)]; qs = []
    for t, yv, xv, zv in hk:
        q = hq(yv, xv, zv)
        if qs and _qdot(q, qs[-1]) < 0: q = tuple(-c for c in q)
        qs.append(q)
    C['head_tilt'] = dict(duration=3.0, note='a small curious head tilt and back (roll about 9 degrees, a little yaw), loopable', channels=[('head', 'rotation', [k[0] for k in hk], qs, 'LINEAR')])
    t, q = _track(lambda s: [('y', 38 * s)], (0.0, 1.2), 1.4); C['lid_open'] = dict(duration=1.4, note='the hopper lid lifts at the back', channels=[('hopper_lid', 'rotation', t, q, 'LINEAR')])
    return C


# ------------------------------------------------------------------------------------------------- glTF 2.0 binary writer
def to_gltf_xyz(a):
    a = np.asarray(a, float); return np.stack([a[..., 1], a[..., 2], a[..., 0]], -1)

def weld(P, N, uv, C, T, tol=1e-5):
    """merge identical vertices (same position, normal, uv, colour) so flat boxes and smooth meshes share what they can"""
    q = [np.round(P / tol).astype(np.int64), np.round(N * 200).astype(np.int64)]
    if C is not None: q.append(np.round(C * 255).astype(np.int64))
    if uv is not None: q.append(np.round(uv * 8000).astype(np.int64))
    key = np.concatenate(q, axis=1); _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel(); order = np.argsort(first); remap = np.empty(len(first), int); remap[order] = np.arange(len(first)); idx = remap[inv]
    keep = first[order]
    return P[keep], N[keep], (uv[keep] if uv is not None else None), (C[keep] if C is not None else None), idx[T]

def write_glb(path, nodes, lod, pose, seed=SEED):
    L = LOD[lod]; textured = bool(L['atlas'])
    smooth_keys = SMOOTH_KEYS if textured else ()
    geoms = {n: _geometry(nodes[n], smooth_keys) for n in NODES if n in nodes and nodes[n].b.buckets}
    binbuf = bytearray(); views = []; accs = []; images = []; textures = []; samplers = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]
    def add_view(data, target=None):
        while len(binbuf) % 4: binbuf.append(0)
        views.append({'buffer': 0, 'byteOffset': len(binbuf), 'byteLength': len(data), **({'target': target} if target else {})}); binbuf.extend(data); return len(views) - 1
    def add_acc(arr, ctype, ncomp, target, normalized=False, minmax=False):
        a = np.ascontiguousarray(arr); vi = add_view(a.tobytes(), target)
        d = {'bufferView': vi, 'componentType': ctype, 'count': int(len(a)), 'type': {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[ncomp]}
        if normalized: d['normalized'] = True
        if minmax: d['min'] = [float(v) for v in np.atleast_1d(a.min(0))]; d['max'] = [float(v) for v in np.atleast_1d(a.max(0))]
        accs.append(d); return len(accs) - 1
    mats = []; mat_index = {}; stats = {'triangles': 0, 'vertices': 0, 'per_node': {}}
    LAMP_RGB = [1.0, 0.52, 0.06]
    def add_emissive(name, strength, extras):
        m = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': [0.05, 0.03, 0.01, 1.0], 'metallicFactor': 0.0, 'roughnessFactor': 0.3}, 'emissiveFactor': LAMP_RGB, 'doubleSided': False,
             'extensions': {'KHR_materials_emissive_strength': {'emissiveStrength': strength}}, 'extras': extras}
        mat_index[name] = len(mats); mats.append(m)
    uvs = {}; tex_stats = {}
    if textured:
        uvs, atlas_imgs, tex_stats = bake_textures(nodes, geoms, lod, seed); enc = _encode_images(atlas_imgs, L)
        for g in sorted(enc):
            ids = []
            for kind, data in zip(('color', 'normal', 'orm'), enc[g]):
                vi = add_view(data); images.append({'bufferView': vi, 'mimeType': 'image/jpeg', 'name': 'collector_%s_%s' % (g, kind)}); textures.append({'sampler': 0, 'source': len(images) - 1}); ids.append(len(textures) - 1)
            m = {'name': TEX_MATERIAL[g], 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 1.0, 'roughnessFactor': 1.0, 'metallicRoughnessTexture': {'index': ids[2]}},
                 'normalTexture': {'index': ids[1], 'scale': 1.0}, 'occlusionTexture': {'index': ids[2], 'strength': 1.0}, 'doubleSided': False,
                 'extras': {'maps': 'baseColor sRGB jpeg, normal jpeg (OpenGL, +Y up the image), occlusion R / roughness G / metal B packed jpeg', 'atlas_px': L['atlas'][g]['n']}}
            mat_index[TEX_MATERIAL[g]] = len(mats); mats.append(m)
        add_emissive('Lamp', 6.0, {'intensity_range': LAMP_CODE['emissive_strength_range'], 'note': 'set emissiveFactor (colour) and the emissive strength from the lamp code in scene extras'})
        add_emissive('Glow', 0.5, {'follows': 'Lamp', 'ratio': LAMP_CODE['glow_ratio'], 'note': 'the visor glow strip: the colour of Lamp at about 8 per cent of its strength'})
    else:
        for g, (met, rough, em) in GLTF_MATS.items():
            if g in ('Lamp', 'Glow'): continue
            m = {'name': g, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': met, 'roughnessFactor': rough}, 'doubleSided': False}
            mat_index[g] = len(mats); mats.append(m)
        add_emissive('Lamp', 6.0, {'intensity_range': LAMP_CODE['emissive_strength_range'], 'note': 'set emissiveFactor (colour) and the emissive strength from the lamp code in scene extras'})
        add_emissive('Glow', 0.5, {'follows': 'Lamp', 'ratio': LAMP_CODE['glow_ratio']})
    pivots = [n.pivot for n in nodes.values() if n.name in ('shell_l', 'shell_r', 'arm_base', 'arm_mid', 'arm_tip', 'hopper_lid', 'head')]
    if not textured:
        occ = occupancy(list(geoms.values()))
    gnodes = []; name_idx = {}; meshes = []
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
        if name not in geoms: continue
        tmp = {}
        for gi, (mat, Pv, Nv, Ev, Mv, Tv) in enumerate(geoms[name]):
            if textured:
                gm = mat if mat in UNTEXTURED else None
                mname = {'lamp': 'Lamp', 'glow': 'Glow'}[mat] if mat in UNTEXTURED else TEX_MATERIAL['all' if 'all' in L['atlas'] else KEYGROUP[mat]]
                if gm: tmp.setdefault(mname, []).append((Pv[Tv].reshape(-1, 3), Nv[Tv].reshape(-1, 3), None, None))
                else: tmp.setdefault(mname, []).append((Pv[Tv].reshape(-1, 3), Nv[Tv].reshape(-1, 3), uvs[(name, gi)].reshape(-1, 2), None))
            else:
                ao = vertex_ao(Pv, Nv, occ) if mat not in ('decal', 'mark', 'lamp', 'glow') else np.ones(len(Pv))
                C = bake_colour(mat, Pv, Nv, Ev, Mv, seed, pivots, ao)
                tmp.setdefault(MATS[mat][0], []).append((Pv[Tv].reshape(-1, 3), Nv[Tv].reshape(-1, 3), None, C[Tv].reshape(-1, 3)))
        prims = []; tri_n = 0
        for g, items in tmp.items():
            P = np.concatenate([i[0] for i in items]) - nd.pivot; Nn = np.concatenate([i[1] for i in items])
            uv = None if items[0][2] is None else np.concatenate([i[2] for i in items]); C = None if items[0][3] is None else np.concatenate([i[3] for i in items])
            T = np.arange(len(P)).reshape(-1, 3)
            P, Nn, uv, C, T = weld(P, Nn, uv, C, T)
            T = T.astype(np.uint16) if len(P) < 65536 else T.astype(np.uint32)
            at = {'POSITION': add_acc(to_gltf_xyz(P).astype(np.float32), 5126, 3, 34962, minmax=True), 'NORMAL': add_acc(to_gltf_xyz(Nn).astype(np.float32), 5126, 3, 34962)}
            if uv is not None: at['TEXCOORD_0'] = add_acc(np.rint(np.clip(uv, 0, 1) * 65535.0).astype(np.uint16), 5123, 2, 34962, normalized=True)
            if C is not None: at['COLOR_0'] = add_acc((np.concatenate([np.clip(C, 0, 1), np.ones((len(C), 1))], 1) * 255.0 + 0.5).astype(np.uint8), 5121, 4, 34962, normalized=True)
            ia = add_acc(T.reshape(-1), 5123 if T.dtype == np.uint16 else 5125, 1, 34963)
            prims.append({'attributes': at, 'indices': ia, 'material': mat_index[g], 'mode': 4}); tri_n += len(T); stats['vertices'] += len(P)
        meshes.append({'name': name + '_mesh', 'primitives': prims}); gn['mesh'] = len(meshes) - 1; stats['triangles'] += tri_n; stats['per_node'][name] = tri_n
    # animation clips
    anims = []; clip_info = {}
    for cname, cl in clip_table(lod).items():
        samplers_a = []; channels = []
        for node, path_, times, vals, interp in cl['channels']:
            tin = add_acc(np.array(times, np.float32), 5126, 1, None, minmax=True)
            if path_ == 'rotation': arr = np.array([[q[1], q[2], q[0], q[3]] for q in vals], np.float32); nc = 4
            else: arr = np.array([[v[1], v[2], v[0]] for v in vals], np.float32); nc = 3
            tout = add_acc(arr, 5126, nc, None)
            samplers_a.append({'input': tin, 'output': tout, 'interpolation': interp}); channels.append({'sampler': len(samplers_a) - 1, 'target': {'node': name_idx[node], 'path': path_}})
        anims.append({'name': cname, 'samplers': samplers_a, 'channels': channels, 'extras': {'note': cl['note']}})
        clip_info[cname] = {'duration': cl['duration'], 'nodes': sorted(set(c[0] for c in cl['channels'])), 'note': cl['note']}
    doc = {'asset': {'version': '2.0', 'generator': 'collector_model.py (living-islands)'}, 'extensionsUsed': ['KHR_materials_emissive_strength'], 'scene': 0, 'scenes': [{'name': 'collector', 'nodes': [name_idx['collector']]}],
           'nodes': gnodes, 'meshes': meshes, 'materials': mats, 'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(binbuf)}], 'animations': anims}
    if images: doc['images'] = images; doc['textures'] = textures; doc['samplers'] = samplers
    doc['scenes'][0]['extras'] = {'lod': lod, 'pose': pose, 'frame': 'glTF: +Y up, +Z forward (the machine faces +Z), +X left; metres', 'length_m': LEN_M, 'triangles': stats['triangles'],
                                  'poses': {p: {k: v for k, v in pose_rotations(p).items()} for p in POSES}, 'status_lamp': 'node lamp_dome, material Lamp (emissive); the visor glow strip is material Glow',
                                  'lamp_code': LAMP_CODE, 'clips': clip_info,
                                  'quirk_slots': {q: {'parent': d['parent'], 'category': d['category'], 'note': d['note']} for q, d in QUIRKS.items()},
                                  'tread_scroll': 'the tread is baked into the atlas and the links are real geometry, so a UV offset cannot move it; the page shows motion by rocking the body, moving the sand and tracks marks (track_l and track_r are rigid)',
                                  'textures': {'groups': {g: {'atlas_px': L['atlas'][g]['n'], 'normal_px': L['atlas'][g]['nrm'], 'orm_px': L['atlas'][g]['orm']} for g in (L['atlas'] or {})}, 'uv': 'one atlas per group, planar charts, no tiling (clamp to edge)'} if textured else 'vertex colours only'}
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4); bb = bytes(binbuf) + b'\x00' * ((4 - len(binbuf) % 4) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\x00') + bb
    with open(path, 'wb') as f: f.write(data)
    stats['bytes'] = len(data); stats['textures'] = tex_stats; stats['image_bytes'] = sum(v['byteLength'] for v, i in zip([views[i['bufferView']] for i in images], images)) if images else 0
    return stats


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
    a = parse_args(); os.makedirs(a.out, exist_ok=True); rep = {}; rp = os.path.join(a.out, 'collector_report.json')
    if os.path.exists(rp):
        try: rep = json.load(open(rp))
        except Exception: rep = {}
    for lod in a.lods:
        for pose in a.poses:
            nodes = build(lod, pose, a.seed); fn = os.path.join(a.out, out_name(lod, pose)); st = write_glb(fn, nodes, lod, pose, a.seed)
            rep[out_name(lod, pose)] = st; print('GLB', fn, 'triangles', st['triangles'], 'vertices', st['vertices'], 'KB', round(st['bytes'] / 1024.0, 1))
    with open(rp, 'w') as f: json.dump({k: {kk: vv for kk, vv in v.items()} for k, v in sorted(rep.items())}, f, indent=1)


if __name__ == '__main__':
    main()
