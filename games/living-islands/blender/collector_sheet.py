"""CONCEPT SILHOUETTE SHEET of the four beach-collector designs (research/BEACH_COLLECTOR.md, section 10), so the owner can choose by eye.
Headless:  blender -b --python collector_sheet.py -- --out DIR [--w 960 --h 640 --samples 48] [--only ABCD]
Per design (A low tortoise, B terrier, C wheelbarrow, D beetle) it renders three views, each one PNG in DIR:
  <X>_3q.png     three-quarter view on sand, soft sun, tread prints trailing behind
  <X>_side.png   side silhouette: flat dark on light, orthographic, same scale for all four, a bottle beside it for size
  <X>_front.png  front view on sand
and one contact sheet DIR/collector-sheet.png (4 rows by 3 columns, every frame labelled A/B/C/D, drawn in this script with a tiny built-in
bitmap font through bpy images, so no extra python packages are needed).
Original designs, built from primitives (rounded boxes, cylinders, tread links), dog-sized (about 1.0 m long, 0.6 m tall), tracked with visible
tread links, solar shell, folding grabber arm, hopper, one small amber status lamp. No writing on the bodies, no real product, no face with eyes:
a head pod or sensor cluster only. Wear (faded paint, chips, rust runs, salt crust, sand in the joints, chalky tops) is procedural materials only.
Blender 3.6 patterns as in li_scene.py (S() for Mix sockets, sky type and look fallbacks, LI_DEVICE guard through LS.reset()). Deterministic.
Frame of every model: +X forward, +Y left, +Z up, metres, ground at z = 0."""
import sys, os, math, argparse, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

DESIGNS = 'ABCD'
NAMES = {'A': 'TORTOISE', 'B': 'TERRIER', 'C': 'WHEELBARROW', 'D': 'BEETLE'}
VIEWS = (('3q', '3/4'), ('side', 'SIDE'), ('front', 'FRONT'))


def parse_args(argv=None):
    """argv is the list after the double dash (or the whole command line when there is none)."""
    if argv is None:
        argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Beach collector concept sheet (four designs, three views each).')
    ap.add_argument('--out', required=True, help='output directory (made if missing)')
    ap.add_argument('--w', type=int, default=960); ap.add_argument('--h', type=int, default=640)
    ap.add_argument('--samples', type=int, default=48)
    ap.add_argument('--only', default=DESIGNS, help='letters of the designs to render, default ABCD')
    ap.add_argument('--views', default='3q,side,front', help='comma list of views to render (the contact sheet needs all three)')
    a = ap.parse_args(argv)
    a.views = tuple(v for v in a.views.split(',') if v in ('3q', 'side', 'front')) or ('3q', 'side', 'front')
    a.only = ''.join(c for c in a.only.upper() if c in DESIGNS) or DESIGNS
    if a.w < 64 or a.h < 64 or a.samples < 1:
        ap.error('--w and --h must be at least 64 and --samples at least 1')
    return a


# ------------------------------------------------------------------------------------------------- small maths
def rot_xyz(r):
    rx, ry, rz = [math.radians(v) for v in r]
    cx, sx, cy, sy, cz, sz = math.cos(rx), math.sin(rx), math.cos(ry), math.sin(ry), math.cos(rz), math.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]]); Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]); Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx

def XF(p=(0, 0, 0), s=(1, 1, 1), r=(0, 0, 0), pivot=None, prot=(0, 0, 0)):
    """4x4: scale, rotate (euler degrees, XYZ), move. pivot/prot: an extra rotation about a point applied last (a hinge)."""
    M = np.eye(4); M[:3, :3] = rot_xyz(r) @ np.diag(s); M[:3, 3] = p
    if pivot is not None:
        H = np.eye(4); H[:3, :3] = rot_xyz(prot); H[:3, 3] = np.array(pivot) - H[:3, :3] @ np.array(pivot)
        M = H @ M
    return M

def aim(p0, p1, d0, d1=None):
    """matrix that maps a unit cylinder (axis z, height 1, diameter 1) onto the rod from p0 to p1 with diameters d0 -> d1 (taper by the shape)."""
    p0 = np.array(p0, float); p1 = np.array(p1, float); v = p1 - p0; L = np.linalg.norm(v); z = v / L
    t = np.array([1.0, 0, 0]) if abs(z[0]) < 0.9 else np.array([0, 1.0, 0])
    x = np.cross(t, z); x /= np.linalg.norm(x); y = np.cross(z, x)
    M = np.eye(4); M[:3, 0] = x * d0; M[:3, 1] = y * d0; M[:3, 2] = z * L; M[:3, 3] = (p0 + p1) / 2
    return M

def hull2d(pts):
    pts = sorted(set((round(float(x), 6), round(float(z), 6)) for x, z in pts))
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    up = []
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1], float)         # counter-clockwise in the x (right), z (up) plane

def resample_loop(poly, n):
    seg = np.roll(poly, -1, axis=0) - poly; ln = np.linalg.norm(seg, axis=1); cum = np.concatenate([[0], np.cumsum(ln)]); total = cum[-1]
    out = []
    for i in range(n):
        s = total * (i + 0.5) / n; k = int(np.searchsorted(cum, s, side='right') - 1); k = min(k, len(poly) - 1)
        f = (s - cum[k]) / max(ln[k], 1e-9); out.append((poly[k] + seg[k] * f, seg[k] / max(ln[k], 1e-9)))
    return out, total


# ------------------------------------------------------------------------------------------------- unit primitives
_CACHE = {}

def unit_cube():
    v = np.array([(-.5, -.5, -.5), (.5, -.5, -.5), (.5, .5, -.5), (-.5, .5, -.5), (-.5, -.5, .5), (.5, -.5, .5), (.5, .5, .5), (-.5, .5, .5)], float)
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return v, f

def _sp(w, e):
    return np.sign(w) * np.abs(w) ** e

def unit_superq(nu, nv, e1, e2, half=False):
    """superellipsoid inside the unit cube (poles on z). half=True: the upper half only, with a flat closed base at z = 0."""
    key = ('sq', nu, nv, e1, e2, half)
    if key in _CACHE: return _CACHE[key]
    u0 = 0.0 if half else -math.pi / 2
    us = np.linspace(u0, math.pi / 2, nu + 1); vs = np.linspace(0, 2 * math.pi, nv, endpoint=False)
    verts = []; faces = []
    for iu, u in enumerate(us):
        cu = _sp(math.cos(u), e1); su = _sp(math.sin(u), e1)
        if abs(abs(u) - math.pi / 2) < 1e-9:
            verts.append((0, 0, 0.5 * np.sign(u))); continue
        for v in vs:
            verts.append((0.5 * cu * _sp(math.cos(v), e2), 0.5 * cu * _sp(math.sin(v), e2), 0.5 * su))
    ring = [];  idx = 0
    for iu, u in enumerate(us):
        if abs(abs(u) - math.pi / 2) < 1e-9: ring.append((idx, 1)); idx += 1
        else: ring.append((idx, nv)); idx += nv
    for k in range(len(us) - 1):
        a0, na = ring[k]; b0, nb = ring[k + 1]
        for j in range(nv):
            j2 = (j + 1) % nv
            if na == 1 and nb == 1: continue
            if na == 1: faces.append((a0, b0 + j2, b0 + j))
            elif nb == 1: faces.append((a0 + j, a0 + j2, b0))
            else: faces.append((a0 + j, a0 + j2, b0 + j2, b0 + j))
    if half:
        verts.append((0, 0, 0)); c = len(verts) - 1
        for j in range(nv): faces.append((c, (j + 1) % nv, j))
    out = (np.array(verts, float), faces); _CACHE[key] = out
    return out

def unit_cyl(seg, taper=1.0):
    key = ('cy', seg, taper)
    if key in _CACHE: return _CACHE[key]
    an = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    v = [(0.5 * math.cos(a), 0.5 * math.sin(a), -0.5) for a in an] + [(0.5 * taper * math.cos(a), 0.5 * taper * math.sin(a), 0.5) for a in an] + [(0, 0, -0.5), (0, 0, 0.5)]
    f = [(i, (i + 1) % seg, seg + (i + 1) % seg, seg + i) for i in range(seg)]
    f += [((i + 1) % seg, i, 2 * seg) for i in range(seg)] + [(seg + i, seg + (i + 1) % seg, 2 * seg + 1) for i in range(seg)]
    out = (np.array(v, float), f); _CACHE[key] = out
    return out


class Builder:
    """collects geometry per (material key, smooth) so that a whole robot is a handful of mesh objects."""
    def __init__(self):
        self.buckets = {}

    def _put(self, mat, smooth, v, f, M):
        flip = np.linalg.det(M[:3, :3]) < 0
        w = (np.c_[v, np.ones(len(v))] @ M.T)[:, :3]
        ff = [tuple(reversed(q)) for q in f] if flip else [tuple(q) for q in f]
        bk = self.buckets.setdefault((mat, smooth), [[], [], 0])
        bk[0].append(w); bk[1].extend([tuple(i + bk[2] for i in q) for q in ff]); bk[2] += len(w)

    def box(self, mat, p, s, r=(0, 0, 0), **kw):
        v, f = unit_cube(); self._put(mat, False, v, f, XF(p, s, r, **kw))

    def sq(self, mat, p, s, r=(0, 0, 0), e1=0.7, e2=0.7, nu=6, nv=12, smooth=False, half=False, top=None, **kw):
        """rounded body. top=(material, min normal z): faces that look up by that much take the other material (the solar panel)."""
        v, f = unit_superq(nu, nv, e1, e2, half); M = XF(p, s, r, **kw)
        if top is None:
            self._put(mat, smooth, v, f, M); return
        w = (np.c_[v, np.ones(len(v))] @ M.T)[:, :3]; fa = []; fb = []
        for q in f:
            P = w[list(q)]; n = np.cross(P[1] - P[0], P[2] - P[0]) if len(q) >= 3 else np.zeros(3)
            n = n / (np.linalg.norm(n) + 1e-12)
            if np.linalg.det(M[:3, :3]) < 0: n = -n
            (fb if n[2] > top[1] else fa).append(q)
        if fa: self._put(mat, smooth, v, fa, M)
        if fb: self._put(top[0], smooth, v, fb, M)

    def cyl(self, mat, p, d, h, r=(0, 0, 0), seg=10, taper=1.0, smooth=False, **kw):
        v, f = unit_cyl(seg, taper); self._put(mat, smooth, v, f, XF(p, (d, d, h), r, **kw))

    def cyl_y(self, mat, p, d, h, seg=12, **kw):
        """disc or axle along the Y axis"""
        self.cyl(mat, p, d, h, r=(90, 0, 0), seg=seg, **kw)

    def cyl_x(self, mat, p, d, h, seg=12, **kw):
        self.cyl(mat, p, d, h, r=(0, 90, 0), seg=seg, **kw)

    def rod(self, mat, p0, p1, d0, d1=None, seg=7, smooth=False):
        d1 = d0 if d1 is None else d1
        v, f = unit_cyl(seg, d1 / d0 if d0 else 1.0); self._put(mat, smooth, v, f, aim(p0, p1, d0))

    def prism(self, mat, poly, y0, y1):
        """convex polygon in the x,z plane extruded between y0 and y1"""
        n = len(poly); v = [(x, y0, z) for x, z in poly] + [(x, y1, z) for x, z in poly] + [(poly[:, 0].mean(), y0, poly[:, 1].mean()), (poly[:, 0].mean(), y1, poly[:, 1].mean())]
        f = [(i, (i + 1) % n, 2 * n) for i in range(n)] + [(2 * n + 1, n + i, n + (i + 1) % n) for i in range(n)] + [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
        self._put(mat, False, np.array(v, float), f, np.eye(4))


# ------------------------------------------------------------------------------------------------- parts shared by the designs
def track(b, wheels, yc, width, pitch=0.036, thick=0.016, cleat=0.014, plate_in=0.028, hub=True, dent=0.0):
    """one tracked side: tread links and cleats around the convex hull of the wheels, side plates, wheel hubs. wheels = [(x, z, r)]"""
    pts = []
    for x, z, r in wheels:
        for a in np.linspace(0, 2 * math.pi, 28, endpoint=False): pts.append((x + r * math.cos(a), z + r * math.sin(a)))
    poly = hull2d(pts); total = float(np.linalg.norm(np.roll(poly, -1, axis=0) - poly, axis=1).sum()); n = int(round(total / pitch))
    loop, _ = resample_loop(poly, n)
    for k, (p, t) in enumerate(loop):
        ang = -math.degrees(math.atan2(t[1], t[0])); nrm = np.array([t[1], -t[0]])
        c = p - nrm * thick / 2
        b.box('link', (c[0], yc, c[1]), (pitch * 0.9, width, thick), (0, ang, 0))
        c2 = p + nrm * cleat / 2 - nrm * 0.002
        b.box('rubber', (c2[0], yc, c2[1]), (pitch * 0.42, width * 0.94, cleat), (0, ang, 0))
    inner = hull2d([(x + (r - plate_in) * math.cos(a), z + (r - plate_in) * math.sin(a)) for x, z, r in wheels for a in np.linspace(0, 2 * math.pi, 20, endpoint=False)])
    b.prism('paint2' if yc < 0 else 'guard', inner, yc - width / 2 - 0.006, yc - width / 2 + 0.004)
    b.prism('paint2' if yc > 0 else 'guard', inner, yc + width / 2 - 0.004, yc + width / 2 + 0.006)
    for x, z, r in wheels:
        for sgn in (-1, 1):
            b.cyl_y('hub', (x, yc + sgn * (width / 2 + 0.012), z), r * 1.15, 0.016, seg=10)
            b.cyl_y('bolt', (x, yc + sgn * (width / 2 + 0.024), z), r * 0.34, 0.012, seg=6)
    if dent:
        b.box('guard', (wheels[0][0] + 0.02, yc, wheels[0][1] + wheels[0][2] * 0.5), (0.1, width + 0.03, 0.02), (0, dent, 0))

def lamp(b, p, stalk=0.045, d=0.055, lean=(0, 0, 0)):
    """the one status lamp: a little stalk, a bezel ring and an amber dome"""
    x, y, z = p
    b.rod('metal', (x, y, z), (x, y, z + stalk), 0.02, 0.02, seg=6)
    b.cyl('metal', (x, y, z + stalk), d * 1.3, 0.014, seg=10)
    b.sq('lamp', (x, y, z + stalk + 0.006), (d, d, d * 1.5), e1=0.9, e2=0.9, nu=5, nv=10, smooth=True, half=True)

def lens(b, p, d, facing='x', hood=True, tilt=0.0):
    """a sensor lens: dull dark glass in a bezel, a little hood above it. Hazed by sand, so it does not stare."""
    x, y, z = p
    if facing == 'x':
        b.cyl('metal', (x, y, z), d * 1.35, 0.024, r=(0, 90 + tilt, 0), seg=14)
        b.cyl('lens', (x + 0.006, y, z), d, 0.024, r=(0, 90 + tilt, 0), seg=14)
        if hood: b.box('metal', (x - 0.004, y, z + d * 0.78), (0.05, d * 1.5, 0.012), (0, tilt, 0))

def bolts(b, items, d=0.016):
    for p in items:
        b.cyl('bolt', p, d, 0.01, seg=6)

def tape(b, p, s, r=(0, 0, 0)):
    b.box('tape', p, s, r)

def litter_bits(b, centre, spread, count, seed):
    """a few faded bits of litter: caps, a bottle neck, glass chunks, rope, a can"""
    rng = np.random.default_rng(seed); cx, cy, cz = centre
    mats = ['lit_blue', 'lit_orange', 'lit_white', 'lit_glass', 'lit_red']
    for i in range(count):
        m = mats[i % len(mats)]; p = (cx + rng.uniform(-spread[0], spread[0]), cy + rng.uniform(-spread[1], spread[1]), cz + rng.uniform(0, spread[2]))
        k = i % 4
        if k == 0: b.cyl(m, p, 0.034, 0.014, r=(rng.uniform(-30, 30), rng.uniform(-30, 30), 0), seg=8)
        elif k == 1: b.cyl(m, p, 0.05, 0.12, r=(rng.uniform(60, 100), 0, rng.uniform(0, 180)), seg=8, taper=0.45)
        elif k == 2: b.box(m, p, (0.05, 0.035, 0.03), (rng.uniform(0, 40), rng.uniform(0, 40), rng.uniform(0, 90)))
        else: b.sq(m, p, (0.09, 0.07, 0.06), (0, 0, rng.uniform(0, 90)), e1=0.8, e2=0.8, nu=4, nv=8, smooth=False)

def hopper_box(b, c, size, wall=0.022, lid=None, sloped_front=0.0, litter_seed=3, litter=5, mat='paint'):
    """open-topped bin: floor and four walls, dark inside, litter heaped in it. lid = (hinge side +/-1 along x, angle deg) or None"""
    cx, cy, cz = c; sx, sy, sz = size
    b.box('grime', (cx, cy, cz - sz / 2 + wall / 2 + 0.01), (sx - 0.01, sy - 0.01, wall))
    b.box(mat, (cx, cy, cz - sz / 2 + wall / 2), (sx - 2 * wall + 0.006, sy - 2 * wall + 0.006, wall))
    b.box(mat, (cx, cy - sy / 2 + wall / 2, cz), (sx, wall, sz))
    b.box(mat, (cx, cy + sy / 2 - wall / 2, cz), (sx, wall, sz))
    b.box(mat, (cx - sx / 2 + wall / 2, cy, cz), (wall, sy - 2 * wall + 0.006, sz))
    b.box(mat, (cx + sx / 2 - wall / 2, cy, cz + 0.0), (wall, sy - 2 * wall + 0.006, sz), (0, sloped_front, 0))
    b.box('grime', (cx, cy, cz + sz / 2 - 0.05), (sx - 2 * wall, sy - 2 * wall, 0.004))
    if litter: litter_bits(b, (cx, cy, cz - sz / 2 + 0.05), (sx / 2 - 0.05, sy / 2 - 0.05, sz * 0.55), litter, litter_seed)
    if lid:
        side, ang = lid; hx = cx + side * sx / 2
        b.box(mat, (cx, cy, cz + sz / 2 + wall / 2), (sx + 0.01, sy + 0.01, wall), (0, 0, 0), pivot=(hx, cy, cz + sz / 2), prot=(0, side * ang, 0))

def grabber(b, base, pts_ang, d=0.026, open_deg=28, finger=0.085, yc=None, cable=False):
    """folding grabber arm in the x,z plane at y = base.y: segments [(length, pitch deg above +x)], joint discs, a two-finger gripper at the end.
    The last angle is also the gripper direction."""
    x, y, z = base; p = np.array([x, y, z], float); joints = [p.copy()]
    for L, a in pts_ang:
        q = p + np.array([L * math.cos(math.radians(a)), 0, L * math.sin(math.radians(a))]); b.rod('link', p, q, d, d, seg=7)
        b.rod('rubber', p + (q - p) * 0.15, p + (q - p) * 0.35, d * 1.25, d * 1.25, seg=7)
        p = q; joints.append(p.copy())
    for j in joints[:-1]:
        b.cyl_y('hub', (j[0], j[1], j[2]), d * 1.7, d * 1.15, seg=10); b.cyl_y('bolt', (j[0], j[1], j[2]), d * 0.7, d * 1.4, seg=6)
    a = pts_ang[-1][1]; ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
    b.box('hub', (p[0] + ca * 0.02, y, p[2] + sa * 0.02), (0.05, d * 1.4, d * 1.4), (0, -a, 0))
    for s in (-1, 1):
        ang = a + s * open_deg
        q0 = p + np.array([ca * 0.04, 0, sa * 0.04]); q1 = q0 + finger * np.array([math.cos(math.radians(ang)), 0, math.sin(math.radians(ang))])
        b.rod('hub', q0, q1, d * 0.7, d * 0.45, seg=5)
        b.rod('rubber', q0 + (q1 - q0) * 0.55, q1, d * 0.8, d * 0.55, seg=5)
    if cable:
        q = joints[1] + np.array([0.03, 0.02, 0.0]); r = joints[2] + np.array([-0.01, 0.02, 0.0]); m = (q + r) / 2 + np.array([0.02, 0.0, -0.035])
        b.rod('grime', q, m, 0.007, 0.007, seg=4); b.rod('grime', m, r, 0.007, 0.007, seg=4)
    return joints, p

def sand_drift(b, p, s, seed=0):
    b.sq('sand', (p[0], p[1], p[2] - 0.01), (s[0], s[1], s[2] * 0.6), (0, 0, seed * 30), e1=0.9, e2=0.9, nu=4, nv=8, smooth=True, half=True)

def hopper_tub(b, c, size, wall=0.024, litter_seed=3, flare=0.035, mat='paint'):
    """a wheelbarrow tub: sloped front, tapered sides, heaped litter standing above the rim"""
    cx, cy, cz = c; sx, sy, sz = size; z0 = cz - sz / 2; z1 = cz + sz / 2
    side = np.array([(cx - sx / 2, z0), (cx + sx / 2 - 0.05, z0), (cx + sx / 2 + flare, z1), (cx - sx / 2, z1)], float)
    b.prism(mat, side, sy / 2 - wall, sy / 2); b.prism(mat, side, -sy / 2, -sy / 2 + wall)
    b.box('grime', (cx, cy, z0 + wall + 0.005), (sx - 0.1, sy - 2 * wall, 0.01))
    b.box(mat, (cx, cy, z0 + wall / 2), (sx - 0.04, sy - 2 * wall + 0.006, wall))
    b.box(mat, (cx - sx / 2 + wall / 2, cy, cz), (wall, sy - 2 * wall + 0.006, sz))
    fb = np.array([cx + sx / 2 - 0.05, z0]); ft = np.array([cx + sx / 2 + flare, z1]); v = ft - fb; L = float(np.linalg.norm(v))
    b.box(mat, ((fb[0] + ft[0]) / 2, cy, (fb[1] + ft[1]) / 2), (wall, sy - 2 * wall + 0.006, L), (0, math.degrees(math.atan2(v[0], v[1])), 0))
    litter_bits(b, (cx, cy, z0 + 0.08), (sx / 2 - 0.08, sy / 2 - 0.07, sz * 0.9), 15, litter_seed)
    b.sq('lit_white', (cx - 0.05, cy + 0.02, z0 + 0.1), (0.3, 0.3, 0.14), e1=0.8, e2=0.8, nu=4, nv=8, half=True)

def twine(b, p0, drop, d=0.006):
    """a hanging bit of twine that does not belong to anything"""
    p0 = np.array(p0, float); q1 = p0 + np.array([0.01, 0, -drop * 0.5]); q2 = q1 + np.array([-0.01, 0.005, -drop * 0.5])
    b.rod('twine', p0, q1, d, d, seg=4); b.rod('twine', q1, q2, d, d, seg=4)


# ------------------------------------------------------------------------------------------------- the four designs
def design_A(b):
    """A, low tortoise: long domed solar shell over almost everything, four short chunky tracks at the corners, folded arm in a slot, round bin at the back."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            xc = sx * 0.295; yc = sy * 0.255
            track(b, [(xc - 0.07, 0.105, 0.105), (xc + 0.07, 0.105, 0.105)], yc, 0.135, pitch=0.034, dent=(14 if (sx, sy) == (-1, 1) else 0))
    b.box('paint2', (0, 0, 0.145), (0.80, 0.40, 0.10))
    b.sq('paint', (-0.02, 0, 0.17), (0.78, 0.64, 0.56), e1=0.62, e2=0.78, nu=7, nv=16, half=True, top=('solar_scute', 0.55))
    b.box('metal', (-0.02, 0, 0.175), (0.74, 0.60, 0.02))
    # the head: a small bump at the front, one hazed lens under a hood, tilted up as if it were looking at the sky
    b.sq('paint2', (0.455, 0, 0.255), (0.17, 0.21, 0.145), (0, -8, 0), e1=0.8, e2=0.8, nu=6, nv=12, smooth=True)
    lens(b, (0.535, 0, 0.262), 0.062, tilt=-8)
    b.box('metal', (0.41, 0, 0.176), (0.2, 0.14, 0.03))
    # the slot in the front of the shell and the grabber folded flat in it
    b.box('grime', (0.18, 0.0, 0.405), (0.30, 0.085, 0.034), (0, 22, 0))
    pts, tip = grabber(b, (0.045, 0.0, 0.452), [(0.12, -2), (0.11, -22)], d=0.022, open_deg=20, finger=0.055)
    # the bin at the back with a hinged lid, half propped open
    hopper_box(b, (-0.45, 0, 0.215), (0.20, 0.40, 0.15), lid=(1, 14), litter=4, litter_seed=11, mat='paint2')
    sand_drift(b, (-0.52, 0.2, 0.03), (0.2, 0.12, 0.06), 1)
    lamp(b, (-0.21, 0.13, 0.43), stalk=0.04, d=0.05)
    tape(b, (0.07, -0.285, 0.30), (0.10, 0.012, 0.045), (0, 0, 0)); tape(b, (0.24, -0.25, 0.33), (0.07, 0.07, 0.006), (0, 0, 0))
    b.box('patch2', (-0.16, -0.12, 0.43), (0.17, 0.12, 0.012), (10, 6, 0))
    bolts(b, [(0.30, 0.0, 0.356), (-0.3, 0.14, 0.38), (-0.3, -0.14, 0.38), (-0.1, 0.22, 0.31), (-0.1, -0.22, 0.31)])
    twine(b, (0.55, 0.06, 0.20), 0.1)

def design_B(b):
    """B, terrier: raised front, sloping back, long angled tracks like legs, a head pod on a short neck with a tilt, flat shell over the back, boxy pack, thin arm under the chin."""
    wheels = [(-0.34, 0.085, 0.085), (0.0, 0.07, 0.07), (0.34, 0.165, 0.12)]
    for yc in (-0.21, 0.21):
        track(b, wheels, yc, 0.09, pitch=0.031)
    b.box('metal', (0.0, 0, 0.19), (0.62, 0.32, 0.06), (0, -6, 0))
    b.sq('paint', (-0.06, 0, 0.355), (0.66, 0.38, 0.30), (0, -9, 0), e1=0.55, e2=0.7, nu=6, nv=14)
    b.sq('paint', (0.22, 0, 0.405), (0.30, 0.31, 0.31), (0, -16, 0), e1=0.6, e2=0.7, nu=6, nv=12)
    for k, f in enumerate((0.1, 0.4, 0.7)):
        c = np.array([0.30, 0, 0.45]) * (1 - f) + np.array([0.385, 0, 0.50]) * f
        b.cyl('rubber', tuple(c), 0.10 - 0.008 * k, 0.03, r=(0, -28, 0), seg=10)
    b.rod('metal', (0.30, 0, 0.45), (0.385, 0, 0.50), 0.06, 0.06, seg=8)
    # head pod: boxy, rolled about the nose axis (a head tilt), one dark visor window, one small side sensor, two floppy ears
    roll = 13
    b.sq('paint2', (0.425, 0, 0.54), (0.30, 0.215, 0.165), (roll, -6, 0), e1=0.55, e2=0.55, nu=5, nv=12)
    b.box('visor', (0.572, 0, 0.535), (0.012, 0.17, 0.065), (roll, -6, 0))
    lens(b, (0.578, 0.075, 0.572), 0.024, hood=False)
    b.box('metal', (0.57, 0.0, 0.587), (0.05, 0.19, 0.012), (roll, -6, 0))
    b.rod('paint', (0.375, -0.07, 0.61), (0.325, -0.12, 0.695), 0.045, 0.014, seg=5); b.rod('paint', (0.375, 0.075, 0.61), (0.35, 0.15, 0.665), 0.045, 0.014, seg=5)
    # thin arm folded under the chin
    grabber(b, (0.33, 0.0, 0.40), [(0.10, -58), (0.095, 20), (0.075, 150)], d=0.018, open_deg=24, finger=0.05)
    # flat solar plate on four posts over the back
    for px, py in ((-0.38, 0.15), (-0.38, -0.15), (0.0, 0.15), (0.0, -0.15)):
        b.rod('metal', (px, py, 0.40), (px, py, 0.545 - (0.0 if px < -0.1 else 0.02)), 0.016, 0.016, seg=6)
    b.box('metal', (-0.19, 0, 0.566), (0.50, 0.38, 0.016), (0, -4, 0))
    b.box('solar', (-0.19, 0, 0.576), (0.47, 0.35, 0.012), (0, -4, 0))
    # boxy pack at the rear: the hopper, lid ajar, a strap
    hopper_box(b, (-0.335, 0, 0.385), (0.23, 0.32, 0.20), lid=(-1, 16), litter=5, litter_seed=21)
    tape(b, (-0.12, 0, 0.35), (0.03, 0.40, 0.2), (0, -9, 0))
    # tail antenna with the lamp on its tip
    b.rod('metal', (-0.44, 0, 0.35), (-0.50, 0.0, 0.52), 0.014, 0.01, seg=5)
    lamp(b, (-0.50, 0.0, 0.515), stalk=0.02, d=0.05)
    bolts(b, [(0.0, 0.17, 0.43), (0.0, -0.17, 0.43), (-0.2, 0.171, 0.31), (-0.2, -0.171, 0.31)])
    tape(b, (0.18, 0.18, 0.30), (0.06, 0.012, 0.05), (0, -9, 0))
    sand_drift(b, (0.1, -0.31, 0.02), (0.22, 0.1, 0.05), 2)
    twine(b, (0.52, 0.04, 0.50), 0.1)

def design_C(b):
    """C, wheelbarrow: boxy open work machine. A big open hopper in front, a short back with the panel on a frame, two long bulldozer tracks, a tall spindly crane arm with the head pod at its elbow."""
    wheels = [(-0.34, 0.15, 0.15), (0.0, 0.065, 0.065), (0.40, 0.105, 0.105)]
    for yc in (-0.27, 0.27):
        track(b, wheels, yc, 0.13, pitch=0.034, dent=(10 if yc < 0 else 0))
    b.box('metal', (0.0, 0, 0.215), (0.86, 0.40, 0.07))
    # the hopper: half the machine
    hopper_tub(b, (0.235, 0, 0.35), (0.46, 0.46, 0.26), litter_seed=31)
    # heaped litter standing above the rim: a bottle, a jug, a coil of rope
    b.cyl('lit_glass', (0.30, -0.09, 0.50), 0.075, 0.26, r=(18, -14, 0), seg=9, taper=0.55)
    b.box('lit_blue', (0.17, 0.10, 0.49), (0.12, 0.09, 0.16), (10, 0, 25))
    for k in range(10):
        a0 = 2 * math.pi * k / 10; a1 = 2 * math.pi * (k + 1) / 10
        b.rod('lit_orange', (0.33 + 0.07 * math.cos(a0), 0.11 + 0.07 * math.sin(a0), 0.465), (0.33 + 0.07 * math.cos(a1), 0.11 + 0.07 * math.sin(a1), 0.465), 0.022, 0.022, seg=5)
    # the back: an equipment box and four frame posts holding the panel
    b.box('paint2', (-0.30, 0, 0.32), (0.26, 0.38, 0.19))
    for px, py in ((-0.42, 0.2), (-0.42, -0.2), (-0.17, 0.2), (-0.17, -0.2)):
        b.rod('metal', (px, py, 0.40), (px, py, 0.50 + (0.05 if px < -0.3 else 0.0)), 0.02, 0.02, seg=6)
    b.box('metal', (-0.30, 0, 0.545), (0.38, 0.50, 0.018), (0, 9, 0))
    b.box('solar', (-0.30, 0, 0.557), (0.355, 0.47, 0.012), (0, 9, 0))
    # the crane arm: base at the front of the back, up, elbow with the head pod, down toward the hopper
    pts, tip = grabber(b, (-0.07, 0.0, 0.40), [(0.25, 68), (0.30, -34)], d=0.024, open_deg=30, finger=0.075, cable=True)
    ex, ey, ez = pts[1]
    b.cyl_x('paint', (ex + 0.04, 0, ez + 0.0), 0.10, 0.12, seg=12)
    b.sq('paint', (ex - 0.005, 0, ez), (0.09, 0.10, 0.10), e1=0.9, e2=0.9, nu=5, nv=10, smooth=True)
    lens(b, (ex + 0.108, 0, ez + 0.005), 0.055)
    b.box('metal', (ex + 0.04, 0, ez + 0.062), (0.12, 0.12, 0.012))
    lamp(b, (-0.42, -0.2, 0.555), stalk=0.03, d=0.05)
    tape(b, (-0.30, 0.19, 0.33), (0.14, 0.012, 0.05)); tape(b, (0.3, 0.2, 0.48), (0.12, 0.05, 0.006))
    b.box('patch2', (-0.30, -0.19, 0.31), (0.12, 0.012, 0.11))
    bolts(b, [(-0.18, 0.192, 0.28), (-0.42, 0.192, 0.28), (-0.18, 0.192, 0.36), (-0.42, 0.192, 0.36)])
    sand_drift(b, (0.15, 0.4, 0.03), (0.26, 0.12, 0.06), 3)
    twine(b, (0.15, 0.0, 0.44), 0.12)

def design_D(b):
    """D, beetle: a high rounded back of two wing-case shells hinged at the front and tipped up to the sun, a low head with mandible pincers folded in front, short wide tracks like legs, a belly tray, a head pod tucked into a recess."""
    for yc in (-0.26, 0.26):
        track(b, [(-0.19, 0.11, 0.11), (0.19, 0.11, 0.11)], yc, 0.16, pitch=0.034, dent=(12 if yc > 0 else 0))
        b.sq('paint', (0.0, yc, 0.245), (0.56, 0.19, 0.11), e1=0.6, e2=0.5, nu=4, nv=10, half=True)
    b.sq('paint2', (-0.04, 0, 0.25), (0.80, 0.40, 0.24), e1=0.6, e2=0.8, nu=5, nv=14)
    b.sq('grime', (-0.12, 0, 0.34), (0.58, 0.34, 0.07), e1=0.5, e2=0.6, nu=3, nv=10)
    # the wing cases: hexagonal plan, rounded back, hinged at the front, rear tipped up (the two a little differently)
    hinge = 0.17
    for sy, lift in ((-1, 9), (1, 4)):
        b.sq('paint', (-0.14, sy * 0.17, 0.335), (0.62, 0.34, 0.46), (0, 0, 0), e1=0.85, e2=1.0, nu=5, nv=6, half=True, top=('solar', 0.5),
             pivot=(hinge, sy * 0.17, 0.34), prot=(sy * 3, lift, 0))
    b.box('metal', (hinge, 0, 0.35), (0.03, 0.40, 0.03))
    # pronotum: the low front plate over the head, with the pod tucked in a recess under it
    b.sq('paint', (0.30, 0, 0.325), (0.26, 0.38, 0.22), (0, -6, 0), e1=0.6, e2=0.75, nu=5, nv=12, half=True)
    b.box('grime', (0.405, 0, 0.235), (0.06, 0.25, 0.11))
    b.sq('metal', (0.415, 0, 0.225), (0.12, 0.2, 0.085), e1=0.7, e2=0.7, nu=4, nv=10, smooth=True)
    b.box('visor', (0.472, 0.02, 0.228), (0.012, 0.15, 0.04))
    lens(b, (0.478, -0.075, 0.228), 0.04, hood=False)
    for k in range(3): b.box('grime', (0.474, 0.02 + (k - 1) * 0.045, 0.195), (0.012, 0.025, 0.012))
    # mandible pincers folded in front
    for s in (-1, 1):
        pts = [(0.37, s * 0.155, 0.15), (0.51, s * 0.19, 0.14), (0.62, s * 0.135, 0.125), (0.66, s * 0.05, 0.125)]
        for i in range(3): b.rod('link', pts[i], pts[i + 1], 0.026 - 0.004 * i, 0.026 - 0.004 * (i + 1), seg=6)
        b.cyl('hub', pts[0], 0.05, 0.05, r=(90, 0, 0), seg=8); b.cyl('hub', pts[1], 0.04, 0.045, r=(90, 0, 0), seg=8)
        b.rod('rubber', pts[2], pts[3], 0.022, 0.012, seg=5)
    # belly tray under the body, its lip sticking out at the back
    hopper_box(b, (-0.22, 0, 0.105), (0.52, 0.34, 0.07), wall=0.02, litter=5, litter_seed=41, mat='paint2')
    b.box('paint2', (-0.50, 0, 0.12), (0.05, 0.34, 0.05), (0, 28, 0))
    lamp(b, (0.30, 0.0, 0.43), stalk=0.04, d=0.05)
    tape(b, (-0.05, -0.2, 0.30), (0.09, 0.012, 0.05)); b.box('patch2', (0.20, 0.205, 0.29), (0.1, 0.012, 0.07), (0, 12, 0))
    bolts(b, [(0.1, 0.20, 0.31), (0.1, -0.2, 0.31), (-0.3, 0.2, 0.27), (-0.3, -0.2, 0.27)])
    sand_drift(b, (0.3, 0.36, 0.03), (0.2, 0.1, 0.05), 4)
    twine(b, (0.65, 0.05, 0.13), 0.08)

BUILD = {'A': design_A, 'B': design_B, 'C': design_C, 'D': design_D}
# faded paint (linear rgb), the repair patch that looks wrong, ridge/second paint
PAINT = {'A': ((0.105, 0.27, 0.16), (0.52, 0.30, 0.07)), 'B': ((0.52, 0.34, 0.07), (0.07, 0.26, 0.25)),
         'C': ((0.42, 0.10, 0.06), (0.22, 0.30, 0.15)), 'D': ((0.13, 0.22, 0.34), (0.50, 0.22, 0.06))}


# ------------------------------------------------------------------------------------------------- materials (need bpy)
def _mats(LS):
    import bpy
    node, link, ramp, S, pin = LS.node, LS.link, LS.ramp, LS.S, LS.pin

    def new(name):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        out = node(nt, 'ShaderNodeOutputMaterial', (1800, 0)); bs = LS.principled(nt, (1500, 0)); link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
        return m, nt, bs

    def mixc(nt, fac, a, b_, loc):
        mx = node(nt, 'ShaderNodeMix', loc, data_type='RGBA')
        if hasattr(fac, 'node'): link(nt, fac, S(mx, 'inputs', 'Factor'))
        else: S(mx, 'inputs', 'Factor').default_value = float(fac)
        for nm, v in (('A', a), ('B', b_)):
            if hasattr(v, 'node'): link(nt, v, S(mx, 'inputs', nm))
            else: S(mx, 'inputs', nm).default_value = (*v, 1.0)
        return S(mx, 'outputs', 'Result')

    def noise(nt, vec, scale, detail=5, loc=(0, 0)):
        n = node(nt, 'ShaderNodeTexNoise', loc, noise_dimensions='3D'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
        link(nt, vec, n.inputs['Vector']); return n.outputs['Fac']

    def mapped(nt, tc, scale, off=(0, 0, 0), loc=(-1500, 0)):
        mp = node(nt, 'ShaderNodeMapping', loc); mp.inputs['Scale'].default_value = scale; mp.inputs['Location'].default_value = off
        link(nt, tc.outputs['Object'], mp.inputs['Vector']); return mp.outputs['Vector']

    def sepz(nt, vec, loc):
        s = node(nt, 'ShaderNodeSeparateXYZ', loc); link(nt, vec, s.inputs[0]); return s.outputs['Z']

    def thresh(nt, fac, a, b_, loc):
        r = ramp(nt, fac, [(a, (0, 0, 0, 1)), (b_, (1, 1, 1, 1))], loc); return r.outputs['Color']

    def ao_node(nt, loc, dist=0.07):
        try:
            ao = node(nt, 'ShaderNodeAmbientOcclusion', loc); ao.inputs['Distance'].default_value = dist; return ao.outputs['AO']
        except Exception:
            return None

    def weathered(name, base, seed, chips=1.0, rust=1.0, salt=1.0):
        """faded paint: sun-bleached and chalky on top, chipped to bare metal, rust runs down from fixings, salt crust low down, sand in the crevices."""
        m, nt, bs = new(name); off = (seed * 3.7, seed * 1.9, seed * 2.3)
        tc = node(nt, 'ShaderNodeTexCoord', (-1800, 0)); geo = node(nt, 'ShaderNodeNewGeometry', (-1800, -300))
        p_lo = mapped(nt, tc, (6, 6, 6), off, (-1600, 300)); p_hi = mapped(nt, tc, (38, 38, 38), off, (-1600, 100)); p_st = mapped(nt, tc, (46, 46, 3.2), off, (-1600, -100))
        zco = sepz(nt, tc.outputs['Object'], (-1600, -400)); nz = sepz(nt, geo.outputs['Normal'], (-1600, -550))
        fade = noise(nt, p_lo, 3.0, 4, (-1400, 300))
        col = mixc(nt, ramp(nt, fade, [(0.3, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))], (-1250, 300)).outputs['Color'], tuple(c * 0.8 for c in base), tuple(min(1.0, c * 1.15 + 0.02) for c in base), (-1100, 300))
        chalk = ramp(nt, nz, [(0.45, (0, 0, 0, 1)), (0.95, (0.22, 0.22, 0.22, 1))], (-1250, 150)).outputs['Color']
        col = mixc(nt, chalk, col, tuple(min(1.0, c * 0.4 + 0.45) for c in base), (-900, 300))
        chip = thresh(nt, noise(nt, p_hi, 4.0, 6, (-1400, 100)), 0.60 + 0.06 * (1 - chips), 0.66 + 0.06 * (1 - chips), (-1200, 80))
        chip2 = thresh(nt, noise(nt, p_lo, 14.0, 4, (-1400, -60)), 0.64, 0.74, (-1200, -60))
        chipm = LS.node(nt, 'ShaderNodeMath', (-1000, 40), operation='MULTIPLY'); link(nt, chip, chipm.inputs[0]); link(nt, chip2, chipm.inputs[1])
        col = mixc(nt, chipm.outputs[0], col, (0.20, 0.19, 0.18), (-700, 300))
        rusty = thresh(nt, noise(nt, p_st, 2.6, 4, (-1400, -250)), 0.64 - 0.06 * rust, 0.80, (-1200, -250))
        col = mixc(nt, rusty, col, (0.28, 0.095, 0.035), (-500, 300))
        zs = ramp(nt, zco, [(0.0, (1, 1, 1, 1)), (0.17, (0, 0, 0, 1))], (-1250, -420)).outputs['Color']
        crust = thresh(nt, noise(nt, p_hi, 3.0, 5, (-1400, -420)), 0.30, 0.62, (-1200, -500))
        saltm = LS.node(nt, 'ShaderNodeMath', (-1000, -450), operation='MULTIPLY'); link(nt, zs, saltm.inputs[0]); link(nt, crust, saltm.inputs[1])
        saltk = LS.node(nt, 'ShaderNodeMath', (-850, -450), operation='MULTIPLY'); link(nt, saltm.outputs[0], saltk.inputs[0]); saltk.inputs[1].default_value = 0.6 * salt
        col = mixc(nt, saltk.outputs[0], col, (0.80, 0.79, 0.72), (-300, 300))
        ao = ao_node(nt, (-1300, -650), 0.09)
        if ao is not None:
            sandy = ramp(nt, ao, [(0.0, (0.5, 0.5, 0.5, 1)), (0.5, (0, 0, 0, 1))], (-1100, -650)).outputs['Color']
            col = mixc(nt, sandy, col, (0.26, 0.19, 0.10), (-100, 300))
        link(nt, col, bs.inputs['Base Color'])
        rr = ramp(nt, fade, [(0.0, (0.5, 0.5, 0.5, 1)), (1.0, (0.72, 0.72, 0.72, 1))], (900, -200)); link(nt, rr.outputs['Color'], bs.inputs['Roughness'])
        pin(bs, 'Metallic', 0.0)
        bm = node(nt, 'ShaderNodeBump', (1200, -300)); bm.inputs['Strength'].default_value = 0.25; bm.inputs['Distance'].default_value = 0.004
        link(nt, noise(nt, p_hi, 30.0, 3, (900, -450)), bm.inputs['Height']); link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
        return m

    def plain(name, rgb, rough=0.7, metal=0.0, grime=0.0, seed=1):
        m, nt, bs = new(name); tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); col = tuple(rgb)
        if grime > 0:
            p = mapped(nt, tc, (22, 22, 22), (seed, seed * 2, seed * 3), (-1000, 0)); nzf = noise(nt, p, 5.0, 5, (-800, 0))
            colk = mixc(nt, ramp(nt, nzf, [(0.35, (0, 0, 0, 1)), (0.75, (grime, grime, grime, 1))], (-600, 0)).outputs['Color'], col, (0.36, 0.30, 0.20), (-300, 0))
            ao = ao_node(nt, (-600, -250), 0.08)
            if ao is not None:
                sd = ramp(nt, ao, [(0.0, (0.6, 0.6, 0.6, 1)), (0.5, (0, 0, 0, 1))], (-400, -250)).outputs['Color']; colk = mixc(nt, sd, colk, (0.34, 0.26, 0.15), (-100, -100))
            link(nt, colk, bs.inputs['Base Color'])
        else:
            bs.inputs['Base Color'].default_value = (*col, 1)
        bs.inputs['Roughness'].default_value = rough; pin(bs, 'Metallic', metal)
        return m

    def solar(name, scute=False, seed=2):
        m, nt, bs = new(name); tc = node(nt, 'ShaderNodeTexCoord', (-1400, 0)); p = mapped(nt, tc, (1, 1, 1), (seed, 0, 0), (-1200, 0))
        cell = (0.016, 0.034, 0.085); fadec = (0.07, 0.10, 0.17)
        if scute:
            vo = node(nt, 'ShaderNodeTexVoronoi', (-1000, 200), voronoi_dimensions='3D', feature='DISTANCE_TO_EDGE'); vo.inputs['Scale'].default_value = 7.0
            link(nt, p, vo.inputs['Vector']); edge = ramp(nt, vo.outputs['Distance'], [(0.0, (1, 1, 1, 1)), (0.045, (0, 0, 0, 1))], (-800, 200)).outputs['Color']
            br = node(nt, 'ShaderNodeTexBrick', (-1000, -100)); br.inputs['Scale'].default_value = 24.0
        else:
            br = node(nt, 'ShaderNodeTexBrick', (-1000, -100)); br.inputs['Scale'].default_value = 17.0
        link(nt, p, br.inputs['Vector'])
        for k, v in (('Color1', cell), ('Color2', tuple(c * 1.25 for c in cell)), ('Mortar', (0.40, 0.40, 0.42))):
            br.inputs[k].default_value = (*v, 1)
        br.inputs['Mortar Size'].default_value = 0.025; br.inputs['Brick Width'].default_value = 1.0; br.inputs['Row Height'].default_value = 1.0
        try: br.offset = 0.0
        except Exception: pass
        col = br.outputs['Color']
        fadeN = noise(nt, p, 2.4, 4, (-800, -250)); col = mixc(nt, ramp(nt, fadeN, [(0.3, (0, 0, 0, 1)), (0.75, (0.55, 0.55, 0.55, 1))], (-600, -250)).outputs['Color'], col, fadec, (-400, -100))
        dust = ramp(nt, noise(nt, p, 9.0, 5, (-800, -500)), [(0.45, (0, 0, 0, 1)), (0.8, (0.6, 0.6, 0.6, 1))], (-600, -500)).outputs['Color']
        col = mixc(nt, dust, col, (0.46, 0.43, 0.36), (-200, -100))
        if scute:
            col = mixc(nt, edge, col, (0.10, 0.25, 0.15), (0, -100))       # the ridges between the scutes show paint
        link(nt, col, bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.3; pin(bs, 'Specular IOR Level', 0.6); pin(bs, 'Specular', 0.6)
        return m

    def lens_mat():
        m, nt, bs = new('Lens'); tc = node(nt, 'ShaderNodeTexCoord', (-900, 0)); p = mapped(nt, tc, (30, 30, 30), (0, 0, 0), (-700, 0))
        haze = ramp(nt, noise(nt, p, 6.0, 4, (-500, 0)), [(0.3, (0.0, 0.0, 0.0, 1)), (0.8, (0.7, 0.7, 0.7, 1))], (-300, 0)).outputs['Color']
        link(nt, mixc(nt, haze, (0.012, 0.018, 0.025), (0.30, 0.31, 0.30), (-100, 0)), bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.35
        return m

    def lamp_mat():
        m, nt, bs = new('Lamp'); bs.inputs['Base Color'].default_value = (0.9, 0.45, 0.05, 1); bs.inputs['Roughness'].default_value = 0.3
        S(bs, 'inputs', 'Emission Color').default_value = (1.0, 0.52, 0.06, 1); pin(bs, 'Emission Strength', 9.0)
        return m

    def rubber():
        m, nt, bs = new('Rubber'); tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); p = mapped(nt, tc, (30, 30, 30), (1, 2, 3), (-1000, 0))
        wear = ramp(nt, noise(nt, p, 5.0, 5, (-800, 0)), [(0.4, (0, 0, 0, 1)), (0.8, (0.35, 0.35, 0.35, 1))], (-600, 0)).outputs['Color']
        col = mixc(nt, wear, (0.028, 0.027, 0.03), (0.16, 0.13, 0.08), (-300, 0))
        ao = ao_node(nt, (-600, -250), 0.05)
        if ao is not None:
            sd = ramp(nt, ao, [(0.0, (0.3, 0.3, 0.3, 1)), (0.4, (0, 0, 0, 1))], (-400, -250)).outputs['Color']; col = mixc(nt, sd, col, (0.20, 0.15, 0.08), (-150, -100))
        link(nt, col, bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.92
        return m

    def litter(name, rgb, rough=0.6):
        return plain(name, rgb, rough, 0.0, 0.5, seed=5)

    M = {}
    M['sand'] = plain('SandBit', (0.26, 0.19, 0.10), 1.0, 0.0, 0.0)
    M['rubber'] = rubber(); M['link'] = plain('Link', (0.05, 0.05, 0.055), 0.75, 0.4, 0.8, 7)
    M['guard'] = plain('Guard', (0.11, 0.115, 0.12), 0.8, 0.3, 0.9, 9); M['hub'] = plain('Hub', (0.22, 0.22, 0.22), 0.55, 0.7, 0.8, 3)
    M['bolt'] = plain('Bolt', (0.28, 0.17, 0.10), 0.7, 0.5, 0.6, 4)       # tiny rusty fixings
    M['metal'] = plain('Metal', (0.15, 0.15, 0.155), 0.6, 0.6, 0.9, 11)
    M['grime'] = plain('Grime', (0.012, 0.012, 0.013), 0.95)
    M['visor'] = plain('Visor', (0.012, 0.016, 0.02), 0.28)
    M['lens'] = lens_mat(); M['lamp'] = lamp_mat()
    M['tape'] = plain('Tape', (0.52, 0.47, 0.33), 0.9, 0.0, 0.7, 6); M['twine'] = plain('Twine', (0.30, 0.20, 0.10), 1.0)
    M['lit_blue'] = litter('LitBlue', (0.04, 0.12, 0.30)); M['lit_orange'] = litter('LitOrange', (0.55, 0.2, 0.04)); M['lit_white'] = litter('LitWhite', (0.55, 0.55, 0.5))
    M['lit_glass'] = litter('LitGlass', (0.04, 0.22, 0.14), 0.15); M['lit_red'] = litter('LitRed', (0.40, 0.05, 0.04))
    M['solar'] = solar('Solar'); M['solar_scute'] = solar('SolarScute', scute=True)
    return M, weathered, plain


def _bottle(b):
    """the same prop in every picture, for size: a glass bottle lying on the sand with two bottle tops"""
    b.cyl('lit_glass', (1.02, -0.46, 0.04), 0.075, 0.17, r=(0, 90, 22), seg=10)
    b.cyl('lit_glass', (1.12, -0.435, 0.04), 0.03, 0.10, r=(0, 90, 22), seg=8)
    b.cyl('lit_blue', (0.87, -0.60, 0.007), 0.034, 0.014, seg=8); b.cyl('lit_red', (1.22, -0.30, 0.007), 0.034, 0.014, seg=8)


def _ground(LS, M, plain, seed=7):
    """sand: a fine grid with the tread prints trailing behind the machine, a big plane round it. Tread prints are real depressions plus a bump on the cross bars."""
    import bpy
    n = 330; ext = 2.4
    xs = np.linspace(-3.0, 2.8, n); ys = np.linspace(-3.0, 2.4, n)
    X, Y = np.meshgrid(xs, ys)
    # trail: the machine came in from the back-left and curved onto its heading; centre line y = -0.36 * s^2 for s = -x
    path = lambda x: np.where(x < 0, -0.34 * (np.minimum(-x, 3.2)) ** 2 * 0.62, 0.0)
    Z = np.zeros_like(X); G = np.zeros_like(X); PH = np.zeros_like(X)
    dyd = np.gradient(path(xs)) / (xs[1] - xs[0])
    for side in (-1, 1):
        cy = path(X) + side * 0.255
        d = np.abs(Y - cy)
        m = np.clip(1 - (d / 0.075) ** 2, 0, 1) * (X < 0.02) * np.clip((0.02 - X) / 0.12, 0, 1)
        G = np.maximum(G, m); Z -= 0.014 * m
        slope = np.interp(X, xs, dyd); PH = np.where(m > 0, -X * np.sqrt(1 + slope ** 2), PH)
        rim = np.clip(1 - ((d - 0.095) / 0.03) ** 2, 0, 1) * (X < 0); Z += 0.004 * rim
    Z += 0.0012 * (np.sin(Y * 11.0 + 2 * np.sin(X * 3.0)) + 0.5 * np.sin(Y * 23 + X * 5))
    # a smooth damp-sand swirl where the machine turned and a few scuffs
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    idx = np.arange(n * n).reshape(n, n); faces = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    ob = LS.mesh_obj('SandFine', verts, faces, True)
    LS.set_float_attr(ob.data, 'Groove', G.ravel()); LS.set_float_attr(ob.data, 'Phase', PH.ravel())
    big = LS.mesh_obj('SandBig', [(-60, -60, -0.03), (60, -60, -0.03), (60, 60, -0.03), (-60, 60, -0.03)], [(0, 3, 2, 1)], False)
    m = bpy.data.materials.new('Sand'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); node, link, ramp, S = LS.node, LS.link, LS.ramp, LS.S
    out = node(nt, 'ShaderNodeOutputMaterial', (1400, 0)); bs = LS.principled(nt, (1100, 0)); link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    tc = node(nt, 'ShaderNodeTexCoord', (-1200, 0)); mp = node(nt, 'ShaderNodeMapping', (-1000, 0)); link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    nz = node(nt, 'ShaderNodeTexNoise', (-800, 100), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 6; link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
    fine = node(nt, 'ShaderNodeTexNoise', (-800, -150), noise_dimensions='3D'); fine.inputs['Scale'].default_value = 260.0; fine.inputs['Detail'].default_value = 2; link(nt, mp.outputs['Vector'], fine.inputs['Vector'])
    base = ramp(nt, nz.outputs['Fac'], [(0.3, (0.30, 0.22, 0.12, 1)), (0.7, (0.44, 0.34, 0.20, 1))], (-500, 100))
    gr = node(nt, 'ShaderNodeAttribute', (-800, -400), attribute_name='Groove'); gr.attribute_type = 'GEOMETRY'
    mx = node(nt, 'ShaderNodeMix', (-200, 100), data_type='RGBA'); link(nt, gr.outputs['Fac'], S(mx, 'inputs', 'Factor')); link(nt, base.outputs['Color'], S(mx, 'inputs', 'A')); S(mx, 'inputs', 'B').default_value = (0.17, 0.12, 0.06, 1)
    link(nt, S(mx, 'outputs', 'Result'), bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.95
    ph = node(nt, 'ShaderNodeAttribute', (-1000, -600), attribute_name='Phase'); ph.attribute_type = 'GEOMETRY'
    sc = node(nt, 'ShaderNodeMath', (-800, -600), operation='MULTIPLY'); link(nt, ph.outputs['Fac'], sc.inputs[0]); sc.inputs[1].default_value = 2 * math.pi / 0.034
    sn = node(nt, 'ShaderNodeMath', (-600, -600), operation='SINE'); link(nt, sc.outputs[0], sn.inputs[0])
    hs = node(nt, 'ShaderNodeMath', (-400, -600), operation='MULTIPLY'); link(nt, sn.outputs[0], hs.inputs[0]); link(nt, gr.outputs['Fac'], hs.inputs[1])
    add = node(nt, 'ShaderNodeMath', (-200, -450), operation='ADD'); link(nt, fine.outputs['Fac'], add.inputs[0]); link(nt, hs.outputs[0], add.inputs[1])
    bm = node(nt, 'ShaderNodeBump', (700, -300)); bm.inputs['Strength'].default_value = 0.9; bm.inputs['Distance'].default_value = 0.012; link(nt, add.outputs[0], bm.inputs['Height'])
    link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
    ob.data.materials.append(m); big.data.materials.append(m)
    return [ob, big]


# ------------------------------------------------------------------------------------------------- scene, render, sheet
def _make_robot(LS, key, M, weathered, plain):
    import bpy
    b = Builder(); BUILD[key](b); _bottle(b)
    base, patch = PAINT[key]; si = DESIGNS.index(key) + 1
    M = dict(M); M['paint'] = weathered('Paint' + key, base, si); M['paint2'] = weathered('PaintB' + key, tuple(c * 0.8 + 0.02 for c in base), si + 10, chips=1.3)
    M['patch'] = weathered('Patch' + key, patch, si + 20, chips=0.5, rust=0.3, salt=0.4); M['patch2'] = weathered('PatchB' + key, patch, si + 30, chips=0.5, rust=0.3, salt=0.4)
    objs = []
    for (mat, smooth), (vs, fs, _) in sorted(b.buckets.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        ob = LS.mesh_obj('%s_%s' % (key, mat), np.concatenate(vs), fs, smooth)
        ob.data.materials.append(M[mat]); objs.append(ob)
    return objs

def _cam(sc, name, loc, target, lens=50.0, ortho=None):
    import bpy
    from mathutils import Vector
    c = bpy.data.cameras.new(name); c.lens = lens
    if ortho: c.type = 'ORTHO'; c.ortho_scale = ortho
    ob = bpy.data.objects.new(name, c); sc.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = Vector(tuple(np.array(target) - np.array(loc))).to_track_quat('-Z', 'Y').to_euler()
    return ob

def _sun(sc, el, az, energy, colour=(1.0, 0.93, 0.8)):
    import bpy
    from mathutils import Vector
    el_, th = math.radians(el), math.radians(az)
    sd = np.array([math.sin(th) * math.cos(el_), math.cos(th) * math.cos(el_), math.sin(el_)])
    L = bpy.data.lights.new('Sun', 'SUN'); L.energy = energy; L.color = colour; L.angle = math.radians(4.0)
    ob = bpy.data.objects.new('Sun', L); sc.collection.objects.link(ob); ob.rotation_euler = Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()

def _silhouette_world(sc):
    import bpy
    w = bpy.data.worlds.new('SilWorld'); w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.93, 0.92, 0.89, 1); bg.inputs['Strength'].default_value = 1.0
    nt.links.new(bg.outputs[0], out.inputs['Surface']); return w

def render_design(LS, key, a, M, weathered, plain, outdir):
    import bpy
    sc = LS.reset(); LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=-0.7)
    M, weathered, plain = _mats(LS)
    sc.cycles.seed = 11
    try: sc.cycles.use_animated_seed = False
    except Exception: pass
    _make_robot(LS, key, M, weathered, plain)
    ground = _ground(LS, M, plain)
    sky_world = None
    LS.make_sky(sun_elev_deg=36.0, sun_az_deg=150.0, strength=0.55, overcast=0.0, haze=0.2); sky_world = sc.world
    _sun(sc, 36.0, 150.0, 3.4)
    sil = bpy.data.materials.new('SilFlat'); sil.use_nodes = True; nt = sil.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.02, 0.022, 0.026, 1); e.inputs['Strength'].default_value = 1.0
    nt.links.new(e.outputs[0], o.inputs['Surface'])
    sil_world = _silhouette_world(sc)
    cams = {'3q': _cam(sc, 'Cam3q', (1.75, -1.85, 0.74), (0.05, 0.0, 0.31), 50.0),
            'front': _cam(sc, 'CamFront', (2.9, 0.10, 0.40), (0.0, 0.0, 0.31), 55.0),
            'side': _cam(sc, 'CamSide', (0.30, -4.0, 0.33), (0.30, 0.0, 0.33), 50.0, ortho=2.0)}
    files = {}
    for vk, _ in VIEWS:
        if vk not in a.views: continue
        sc.camera = cams[vk]; fp = os.path.join(outdir, '%s_%s.png' % (key, vk)); sc.render.filepath = fp
        if vk == 'side':
            sc.world = sil_world; bpy.context.view_layer.material_override = sil; sc.view_settings.view_transform = 'Standard'
            try: sc.view_settings.look = 'None'
            except Exception: pass
            sc.view_settings.exposure = 0.0
            for g in ground: g.hide_render = True
            flat = LS.mesh_obj('SilFloor', [(-3, -1.5, -0.03), (3, -1.5, -0.03), (3, 1.5, -0.03), (-3, 1.5, -0.03), (-3, -1.5, 0), (3, -1.5, 0), (3, 1.5, 0), (-3, 1.5, 0)],
                               [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], False)
        else:
            sc.world = sky_world
        bpy.ops.render.render(write_still=True)
        if vk == 'side':
            bpy.context.view_layer.material_override = None
            for g in ground: g.hide_render = False
            bpy.data.objects.remove(flat, do_unlink=True)
            LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=-0.7)
        files[vk] = fp
    return files


# 5x7 bitmap font, enough for the captions
FONT = {
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110', 'C': '01110 10001 10000 10000 10000 10001 01110',
    'D': '11110 10001 10001 10001 10001 10001 11110', 'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
    'H': '10001 10001 10001 11111 10001 10001 10001', 'I': '01110 00100 00100 00100 00100 00100 01110', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'N': '10001 11001 10101 10011 10001 10001 10001', 'O': '01110 10001 10001 10001 10001 10001 01110', 'R': '11110 10001 10001 11110 10100 10010 10001',
    'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100', 'W': '10001 10001 10001 10101 10101 11011 10001',
    '3': '11110 00001 00001 01110 00001 00001 11110', '4': '10010 10010 10010 11111 00010 00010 00010', '/': '00001 00010 00010 00100 01000 01000 10000', ' ': '00000 00000 00000 00000 00000 00000 00000',
}

def draw_text(img, x, y, text, scale, colour, bg=None):
    """img: H x W x 3 float array, row 0 at the top. Draws the text with its top-left corner at (x, y)."""
    w = len(text) * 6 * scale
    if bg is not None:
        img[max(0, y - scale * 2): y + 9 * scale, max(0, x - scale * 2): x + w + scale * 2] = bg
    for k, ch in enumerate(text):
        rows = FONT.get(ch.upper(), FONT[' ']).split()
        for r, row in enumerate(rows):
            for c, bit in enumerate(row):
                if bit == '1':
                    yy = y + r * scale; xx = x + (k * 6 + c) * scale
                    if 0 <= yy and yy + scale <= img.shape[0] and 0 <= xx and xx + scale <= img.shape[1]:
                        img[yy:yy + scale, xx:xx + scale] = colour

def read_png(path):
    import bpy
    im = bpy.data.images.load(path); im.colorspace_settings.name = 'Non-Color'
    w, h = im.size; px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    arr = px.reshape(h, w, 4)[::-1, :, :3].copy(); bpy.data.images.remove(im); return arr

def write_png(path, arr):
    import bpy
    h, w = arr.shape[:2]; im = bpy.data.images.new('SheetOut', w, h, alpha=False); im.colorspace_settings.name = 'Non-Color'
    rgba = np.concatenate([arr[::-1], np.ones((h, w, 1), np.float32)], -1).astype(np.float32); im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = path; im.file_format = 'PNG'; im.save(); bpy.data.images.remove(im)

def contact_sheet(frames, keys, outpath, pad=10):
    """frames[key][view] -> png path. Rows are the designs, columns the three views. Each frame carries its letter; each column and row a caption."""
    imgs = {k: {v: read_png(frames[k][v]) for v, _ in VIEWS} for k in keys}
    h, w = imgs[keys[0]]['3q'].shape[:2]; top = 8 * 3 + 2 * pad + 6
    W = pad + 3 * (w + pad); H = top + len(keys) * (h + pad)
    sheet = np.full((H, W, 3), 0.15, np.float32)
    sc = max(2, w // 200)
    for ci, (vk, cap) in enumerate(VIEWS):
        draw_text(sheet, pad + ci * (w + pad) + 4, pad + 2, cap, 3, 0.88)
    for ri, k in enumerate(keys):
        for ci, (vk, cap) in enumerate(VIEWS):
            y0 = top + ri * (h + pad); x0 = pad + ci * (w + pad)
            sheet[y0:y0 + h, x0:x0 + w] = imgs[k][vk]
            draw_text(sheet, x0 + 8, y0 + 8, k, sc, (0.98, 0.98, 0.95), bg=0.10)
            if ci == 0: draw_text(sheet, x0 + 8 + 8 * sc, y0 + 8 + 2 * sc, NAMES[k], max(2, sc // 2), (0.98, 0.98, 0.95), bg=0.10)
    write_png(outpath, sheet)


def main():
    a = parse_args()
    t0 = time.time()
    import li_scene as LS
    os.makedirs(a.out, exist_ok=True)
    frames = {}
    for key in a.only:
        frames[key] = render_design(LS, key, a, None, None, None, a.out)
        print('DESIGN', key, NAMES[key], 'done', round(time.time() - t0, 1), 's')
    if len(a.views) == len(VIEWS):
        contact_sheet(frames, list(a.only), os.path.join(a.out, 'collector-sheet.png'))
        print('SHEET', os.path.join(a.out, 'collector-sheet.png'), 'total s', round(time.time() - t0, 1))
    else:
        print('views', a.views, 'rendered; no contact sheet', round(time.time() - t0, 1))


if __name__ == '__main__':
    main()
