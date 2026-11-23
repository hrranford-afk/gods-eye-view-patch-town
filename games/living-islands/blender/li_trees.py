"""LI TREES: a seeded procedural species set for the landform renders (cool temperate Atlantic coast).
Replaces the single tiered conifer (li_scene.make_conifers, kept only for the invented legacy island) in landform_scene.py.

Species (each 4-8 mesh variants: branching trunks + blob / leaf-card crowns, all built in numpy, no bpy needed to build or to place):
  trees        pine (Scots-style, flat top, bare lower trunk, orange-grey bark)   spruce (irregular tiered boughs, drooping tips)
               birch (white bark, airy card crown)   rowan   oak (broad, gnarled; best soil only)
  wind-shaped  wind_pine, wind_thorn: stunted, flag crowns that stream downwind, instance leans downwind
  thicket      hazel (multi-stem), willow (sprawling, grey-green)
  scrub/cover  juniper, gorse (yellow flecks), bracken (autumn bronze fronds), heather (purple flecks), bog cotton
  dead wood    snag (lichened standing dead), log (driftwood / fallen)
Placement (`plan`) is numpy only and deterministic: weights come from the landform maps (province, soil depth, wind exposure, slope, wetness,
elevation, vegetation class), copse noise gives clusters with edge trees and sparse singles (the real Hebrides are largely treeless, so woodland is
sparse, sheltered and patchy), age classes sapling / mature / veteran set size, soil and exposure set height, lean follows the wind.
`instantiate` makes one Blender mesh per used variant and linked duplicates (shared mesh data) per tree, so a hero scene stays light.
Per-tree colour jitter (hue, value, autumn touches) rides on the object colour and is read by the leaf shaders (Object Info > Color).
Blender 3.6 patterns kept: S() for Mix sockets, Principled names through pin(), no 4.x-only calls."""
import math, hashlib
import numpy as np

# ---------------------------------------------------------------- numpy mesh helpers
def _norm(v):
    v = np.asarray(v, float); n = np.linalg.norm(v, axis=-1, keepdims=True); return v / np.maximum(n, 1e-9)

def smooth(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

class VM:
    """accumulates parts ('bark', 'leaf', 'card', 'fleck'): per part vertices, triangles, per-vertex (shade, aux) and uv."""
    def __init__(self):
        self.p = {}
    def add(self, part, V, F, shade=1.0, aux=0.0, uv=None):
        V = np.asarray(V, float); F = np.asarray(F, int)
        d = self.p.setdefault(part, dict(V=[], F=[], S=[], UV=[], n=0))
        d['V'].append(V); d['F'].append(F + d['n'])
        s = np.zeros((len(V), 2)); s[:, 0] = shade; s[:, 1] = aux
        d['S'].append(s); d['UV'].append(np.zeros((len(V), 2)) if uv is None else np.asarray(uv, float)); d['n'] += len(V)
    def finish(self):
        out = {}
        for k, d in self.p.items():
            out[k] = dict(V=np.concatenate(d['V']), F=np.concatenate(d['F']), S=np.concatenate(d['S']), UV=np.concatenate(d['UV']))
        return out

_ICO = {}
def ico(sub):
    if sub in _ICO:
        return _ICO[sub]
    t = (1 + 5 ** 0.5) / 2
    V = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6),
         (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    V = [tuple(np.array(v) / np.linalg.norm(v)) for v in V]
    for _ in range(sub):
        cache = {}; NF = []
        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in cache:
                m = (np.array(V[a]) + np.array(V[b])) / 2; V.append(tuple(m / np.linalg.norm(m))); cache[k] = len(V) - 1
            return cache[k]
        for a, b, c in F:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            NF += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        F = NF
    _ICO[sub] = (np.array(V), np.array(F)); return _ICO[sub]

def rotz(V, yaw):
    c, s = math.cos(yaw), math.sin(yaw)
    return np.stack([V[:, 0] * c - V[:, 1] * s, V[:, 0] * s + V[:, 1] * c, V[:, 2]], 1)

def blob(vm, rng, part, c, radii, sub=1, yaw=0.0, jit=0.22, inner=0.0, aux=0.0, squash_dir=None):
    """a displaced icosphere. inner: 0 outer crown .. 1 deep inside (darker). Shade also falls off towards the underside (cheap AO)."""
    U, F = ico(sub)
    r = 1 + jit * (rng.random(len(U)) - 0.5) * 2
    V = rotz(U * r[:, None] * np.asarray(radii, float), yaw) + np.asarray(c, float)
    sh = (0.62 + 0.38 * (U[:, 2] * 0.5 + 0.5)) * (1 - 0.42 * inner)
    vm.add(part, V, F, sh, aux)

def tube(pts, rad, sides=5, cap=False):
    pts = np.asarray(pts, float); rad = np.asarray(rad, float); k = len(pts)
    t = _norm(np.gradient(pts, axis=0) if k > 2 else np.stack([pts[1] - pts[0]] * 2))
    ref = np.array([0.0, 0.0, 1.0]) if abs(t[0][2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    n = _norm(np.cross(t[0], ref)); N = []; B = []
    for i in range(k):
        n = n - t[i] * np.dot(n, t[i]); n = _norm(n); N.append(n); B.append(np.cross(t[i], n))
    N = np.array(N); B = np.array(B); a = np.arange(sides) * 2 * math.pi / sides
    V = pts[:, None, :] + rad[:, None, None] * (np.cos(a)[None, :, None] * N[:, None, :] + np.sin(a)[None, :, None] * B[:, None, :])
    V = V.reshape(-1, 3)
    F = []
    for i in range(k - 1):
        for j in range(sides):
            p = i * sides + j; q = i * sides + (j + 1) % sides
            F += [(p, q, q + sides), (p, q + sides, p + sides)]
    if cap:
        c = len(V); V = np.vstack([V, pts[-1] + t[-1] * rad[-1] * 0.6]); e = (k - 1) * sides
        F += [(e + j, e + (j + 1) % sides, c) for j in range(sides)]
    return V, np.array(F)

def card_c(vm, part, c, u, v, w, h, aux=0.0, shade=1.0):
    """centred card: u, v unit vectors, half sizes w, h."""
    c = np.asarray(c, float); u = np.asarray(u, float); v = np.asarray(v, float)
    V = np.array([c - u * w - v * h, c + u * w - v * h, c + u * w + v * h, c - u * w + v * h])
    vm.add(part, V, [(0, 1, 2), (0, 2, 3)], shade, aux, uv=[(0, 0), (1, 0), (1, 1), (0, 1)])

def rand_card(vm, rng, part, c, size, aux=0.0, shade=1.0, flat=0.0):
    """leaf-cluster card in a random orientation (flat > 0 biases towards horizontal)."""
    n = _norm(rng.normal(size=3) + np.array([0, 0, flat * 2.0]))
    u = _norm(np.cross(n, [0, 0, 1.0]) + 1e-6 * rng.normal(size=3)); v = _norm(np.cross(n, u))
    sz = size * rng.uniform(0.75, 1.25)
    card_c(vm, part, c, u, v, sz, sz * rng.uniform(0.8, 1.1), aux, shade * rng.uniform(0.85, 1.05))

def strip(vm, part, pts, widths, aux=0.0, shade=1.0, side=None):
    """a curved ribbon (frond, blade): pts (k,3), half widths (k,), uv v along the length, u across."""
    pts = np.asarray(pts, float); k = len(pts)
    t = _norm(np.gradient(pts, axis=0)); sd = _norm(np.cross(t, [0, 0, 1.0])) if side is None else np.tile(_norm(side), (k, 1))
    L = pts[:, None, :] + np.stack([-sd, sd], 1) * np.asarray(widths)[:, None, None]
    V = L.reshape(-1, 3); F = []
    for i in range(k - 1):
        a = 2 * i; F += [(a, a + 1, a + 3), (a, a + 3, a + 2)]
    uv = np.array([(u, i / (k - 1)) for i in range(k) for u in (0, 1)])
    vm.add(part, V, F, shade, aux, uv=uv)

def oct_fleck(vm, c, r, rng, aux=0.0, part='fleck'):
    """tiny 8-triangle octahedron (berries, gorse and heather flowers, cotton heads)."""
    c = np.asarray(c, float); V = np.array([(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)], float) * r * np.array([1, 1, rng.uniform(.8, 1.2)])
    F = [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]
    vm.add(part, V + c, F, 1.0, aux)

def branch(rng, vm, p0, d0, length, r0, r1, nseg=4, bend=0.25, up=0.0, part='bark', aux=(0, 0), sides=4, cap=False):
    p = np.asarray(p0, float); d = _norm(d0); pts = [p]
    for _ in range(nseg):
        d = _norm(d + bend * rng.normal(size=3) * np.array([1, 1, 0.6]) + np.array([0, 0, up]))
        p = p + d * (length / nseg); pts.append(p)
    pts = np.array(pts); rad = np.linspace(r0, r1, nseg + 1)
    V, F = tube(pts, rad, sides, cap)
    vm.add(part, V, F, 1.0, np.concatenate([np.linspace(aux[0], aux[1], nseg + 1).repeat(sides)] + ([np.full(1, aux[1])] if cap else [])))
    return pts, _norm(pts[-1] - pts[-2])

def trunk_path(rng, H, n, amp, lean=(0.0, 0.0), twist=3.2):
    zs = np.linspace(0, H, n); f = zs / H; ph = rng.uniform(0, 6.28, 2)
    x = amp * np.sin(f * twist + ph[0]) * f + lean[0] * zs * f ** 0.6
    y = amp * 0.7 * np.sin(f * twist * 0.8 + ph[1]) * f + lean[1] * zs * f ** 0.6
    return np.stack([x, y, zs], 1)

def at(path, f):
    """point on a polyline at fraction f of its length index."""
    i = f * (len(path) - 1); i0 = int(min(max(math.floor(i), 0), len(path) - 2)); t = i - i0
    return path[i0] * (1 - t) + path[i0 + 1] * t

def dirv(az, el):
    return np.array([math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)])

# ---------------------------------------------------------------- species builders: (rng, vi, det) -> VM ; det 1 = full, 0 = reduced (wide view)
def b_pine(rng, vi, det):
    vm = VM(); vet = vi >= 4; sub = 1 if det else 0
    H = rng.uniform(6.6, 8.2) * (1.08 if vet else 1.0)
    path = trunk_path(rng, H, 9, rng.uniform(0.2, 0.6) * (1.5 if vet else 1.0), (rng.normal(0, 0.05), rng.normal(0, 0.05)), 3.4)
    f = np.linspace(0, 1, 9); r0 = (0.21 + 0.07 * vet) * H / 7.5
    rad = r0 * (1 - 0.74 * f ** 0.85); rad[0] *= 1.45; rad[1] *= 1.12
    V, F = tube(path, rad, 6, True); vm.add('bark', V, F, 1.0, np.concatenate([np.repeat(f, 6), [1.0]]))
    nb = rng.integers(4, 7) + (2 if vet else 0); az0 = rng.uniform(0, 6.28); gap = rng.uniform(0, 6.28)
    for k in range(nb):
        zt = rng.uniform(0.5, 0.9); base = at(path, zt); az = az0 + k * 2.4 + rng.uniform(-0.4, 0.4)
        L = rng.uniform(0.9, 2.3) * (1.15 if vet else 1.0) * (0.55 if abs(math.cos(az - gap)) > 0.85 else 1.0)
        pts, dd = branch(rng, vm, base, dirv(az, 0.28), L, 0.07 * H / 7.5, 0.025, 4, 0.2, 0.09, aux=(zt, 1.0), sides=4)
        end = pts[-1]
        if vet and k == 1:
            continue                                   # a dead stub on veterans
        blob(vm, rng, 'leaf', end + [0, 0, 0.12], (rng.uniform(0.8, 1.35), rng.uniform(0.7, 1.2), rng.uniform(0.3, 0.46)), sub, rng.uniform(0, 3), 0.26, 0.0)
        if det and L > 1.4:
            blob(vm, rng, 'leaf', at(pts, 0.55) + [0, 0, 0.1], (0.7, 0.6, 0.28), sub, rng.uniform(0, 3), 0.25, 0.35)
    top = path[-1]
    blob(vm, rng, 'leaf', top + [0, 0, 0.05], (rng.uniform(1.15, 1.7), rng.uniform(1.0, 1.5), rng.uniform(0.42, 0.55)), sub, rng.uniform(0, 3), 0.22, 0.0)
    if vi == 1:                                         # forked leader
        pts, dd = branch(rng, vm, at(path, 0.62), dirv(rng.uniform(0, 6.28), 1.05), H * 0.34, 0.09 * H / 7.5, 0.03, 4, 0.12, 0.05, aux=(0.62, 1.0), sides=5)
        blob(vm, rng, 'leaf', pts[-1] + [0, 0, 0.05], (1.0, 0.9, 0.4), sub, 0.5, 0.22, 0.0)
    return vm

def b_spruce(rng, vi, det):
    vm = VM(); H = rng.uniform(6.4, 8.6)
    Rmax = [1.05, 1.7, 1.35, 1.3, 1.25, 1.15][vi % 6] * H / 7.5
    lean = [(0, 0), (0.03, 0.0), (0.12, 0.05), (0.1, -0.1), (0, 0.05), (-0.07, 0.03)][vi % 6]
    path = trunk_path(rng, H, 8, rng.uniform(0.05, 0.3) * (2.0 if vi == 3 else 1.0), lean, 2.5)
    f = np.linspace(0, 1, 8); rad = 0.19 * H / 7.5 * (1 - 0.88 * f ** 0.9); rad[0] *= 1.3
    V, F = tube(path, rad, 6, False); vm.add('bark', V, F, 1.0, 0.0)
    for _ in range(5):                                  # dead lower twigs
        z = rng.uniform(0.03, 0.2); b = at(path, z)
        branch(rng, vm, b, dirv(rng.uniform(0, 6.28), 0.15), rng.uniform(0.4, 0.9), 0.025, 0.01, 2, 0.1, -0.02, aux=(1, 1), sides=3)
    nt = int(rng.integers(8, 11)) - (2 if vi == 5 else 0); seg = 9 if det else 7
    for k in range(nt):
        t = k / max(nt - 1, 1); z = H * (0.15 + 0.8 * t) * (1 + rng.uniform(-0.02, 0.02)); hh = H * 0.21 * (1 - 0.25 * t) * rng.uniform(0.85, 1.2)
        R = (Rmax * (1 - t) ** 0.85 + 0.12) * rng.uniform(0.82, 1.18)
        c = at(path, z / H) + np.array([rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12), 0.0]); c[2] = z
        miss = rng.uniform(0, 6.28) if (k < 4 and vi in (2, 5)) else None
        for layer in range(2 if det else 1):
            rot = layer * math.pi / seg + rng.uniform(-0.1, 0.1); rl = R * (1.0 if layer == 0 else 0.78); zl = z + layer * 0.22 * hh
            ang = rot + np.arange(seg) * 2 * math.pi / seg + rng.uniform(-0.14, 0.14, seg)
            rr = rl * np.where(np.arange(seg) % 2 == 0, rng.uniform(0.9, 1.3, seg), rng.uniform(0.55, 0.9, seg))
            if miss is not None:
                rr = rr * (1 - 0.55 * np.clip(np.cos(ang - miss) - 0.4, 0, 1) * 1.6)
            rim = np.stack([c[0] + rr * np.cos(ang), c[1] + rr * np.sin(ang), zl - 0.30 * rr - 0.08], 1)       # drooping tips
            mid = np.stack([c[0] + rr * 0.55 * np.cos(ang + 0.2), c[1] + rr * 0.55 * np.sin(ang + 0.2), np.full(seg, zl + hh * 0.5)], 1)
            top = np.array([[c[0], c[1], zl + hh]])
            V = np.vstack([rim, mid, top]); apex = 2 * seg; F = []
            for s in range(seg):
                s2 = (s + 1) % seg; F += [(s, s2, seg + s2), (s, seg + s2, seg + s), (seg + s, seg + s2, apex)]
            sh = np.concatenate([np.full(seg, 1.0), np.full(seg, 0.72), [0.8]]) * (1.0 if layer == 0 else 0.9) * (0.7 + 0.3 * (1 - t) ** 0.3)
            vm.add('leaf', V, F, sh, 0.0)
    tipz = path[-1]
    if vi == 4:                                         # dead top: silver spike
        branch(rng, vm, at(path, 0.9), (0.05, 0.0, 1.0), H * 0.12, 0.03, 0.008, 2, 0.05, 0, aux=(1, 1), sides=3)
    else:
        blob(vm, rng, 'leaf', tipz + [0, 0, -0.1], (0.14, 0.14, 0.5), 0, 0, 0.1, 0.0)
    return vm

def _limbs(rng, vm, base, n, el_rng, L_rng, r0, az0, droop, twig_n, tips, aux=(0.0, 1.0), bend=0.22, sides=4):
    """n limbs fanning out from base; returns tip positions with their directions."""
    for k in range(n):
        az = az0 + k * 2.399 + rng.uniform(-0.5, 0.5); el = rng.uniform(*el_rng)
        L = rng.uniform(*L_rng)
        pts, dd = branch(rng, vm, base, dirv(az, el), L, r0, r0 * 0.3, 4, bend, droop * -0.08 + 0.05, aux=aux, sides=sides)
        tips.append((pts[-1], dd, r0))
        for q in range(twig_n):
            pb = at(pts, rng.uniform(0.4, 0.9)); a2 = az + rng.uniform(-1.2, 1.2); e2 = el + rng.uniform(-0.4, 0.3)
            p2, d2 = branch(rng, vm, pb, dirv(a2, e2), L * rng.uniform(0.3, 0.5), r0 * 0.3, 0.008, 3, bend, droop * -0.1, aux=(1, 1), sides=3)
            tips.append((p2[-1], d2, r0 * 0.4))

def b_birch(rng, vi, det):
    vm = VM(); vet = vi >= 4; H = rng.uniform(4.4, 5.6) * (1.1 if vet else 1.0)
    path = trunk_path(rng, H * 0.55, 6, rng.uniform(0.1, 0.4) * (1.6 if vet else 1), (rng.normal(0, 0.06), rng.normal(0, 0.06)), 3.0)
    f = np.linspace(0, 1, 6); r0 = (0.095 + 0.04 * vet) * H / 6.0; rad = r0 * (1 - 0.6 * f); rad[0] *= 1.25
    V, F = tube(path, rad, 5, False); vm.add('bark', V, F, 1.0, 0.0)
    tips = []; base = path[-1]
    _limbs(rng, vm, base, int(rng.integers(3, 5)) + int(vet), (0.95, 1.35), (H * 0.42, H * 0.6), r0 * 0.6, rng.uniform(0, 6.28), 1.0, 2, tips, aux=(0.0, 0.9))
    for (p, d, r) in tips:
        n = 9 if det else 5
        for _ in range(n):
            rand_card(vm, rng, 'card', p + rng.normal(0, 0.34, 3) * [1, 1, 0.8] + [0, 0, -0.1], 0.27, aux=0.0, shade=rng.uniform(0.8, 1.0), flat=0.2)
        if rng.random() < 0.7:
            blob(vm, rng, 'leaf', p + [0, 0, -0.05], (0.36, 0.36, 0.28), 0, rng.uniform(0, 3), 0.25, 0.1)
    return vm

def b_rowan(rng, vi, det):
    vm = VM(); H = rng.uniform(3.6, 4.8); sub = 1 if det else 0
    path = trunk_path(rng, H * 0.4, 5, rng.uniform(0.05, 0.25), (rng.normal(0, 0.07), rng.normal(0, 0.07)), 2.8)
    f = np.linspace(0, 1, 5); rad = 0.11 * (1 - 0.5 * f); rad[0] *= 1.3
    V, F = tube(path, rad, 5, False); vm.add('bark', V, F, 1.0, 0.0)
    tips = []; _limbs(rng, vm, path[-1], int(rng.integers(4, 7)), (0.7, 1.15), (H * 0.45, H * 0.65), 0.06, rng.uniform(0, 6.28), 0.6, 1, tips, aux=(0.0, 1.0))
    cen = np.mean([t[0] for t in tips], 0)
    for (p, d, r) in tips:
        blob(vm, rng, 'leaf', p + [0, 0, 0.1], (rng.uniform(0.5, 0.85), rng.uniform(0.5, 0.85), rng.uniform(0.38, 0.6)), sub, rng.uniform(0, 3), 0.28, float(np.clip(1 - np.linalg.norm(p - cen) / 2.0, 0, 0.8)))
        if vi % 2 == 0:
            for _ in range(3 if det else 2):
                oct_fleck(vm, p + rng.normal(0, 0.42, 3) * [1, 1, 0.6] + [0, 0, 0.1], 0.075, rng, 0.0)
    return vm

def b_oak(rng, vi, det):
    vm = VM(); vet = vi >= 4; sub = 1 if det else 0; H = rng.uniform(4.6, 5.8) * (1.1 if vet else 1.0)
    path = trunk_path(rng, H * 0.38, 5, rng.uniform(0.2, 0.55), (rng.normal(0, 0.12), rng.normal(0, 0.12)), 3.6)
    f = np.linspace(0, 1, 5); r0 = (0.30 + 0.1 * vet); rad = r0 * (1 - 0.35 * f) ; rad[0] *= 1.4
    V, F = tube(path, rad, 7, False); vm.add('bark', V, F, 1.0, 0.0)
    tips = []; n = int(rng.integers(4, 6)) + int(vet)
    _limbs(rng, vm, path[-1], n, (0.45, 1.0), (H * 0.5, H * 0.8), 0.17, rng.uniform(0, 6.28), -0.5, 2, tips, aux=(0.0, 0.7), bend=0.34, sides=5)
    cen = np.mean([t[0] for t in tips], 0)
    for (p, d, r) in tips:
        if r < 0.1 and rng.random() < 0.25:
            continue
        s = rng.uniform(0.85, 1.5) * (1.15 if vet else 1.0)
        blob(vm, rng, 'leaf', p + [0, 0, 0.1], (s, s * rng.uniform(0.85, 1.1), s * rng.uniform(0.6, 0.78)), sub, rng.uniform(0, 3), 0.3, float(np.clip(1 - np.linalg.norm(p - cen) / 3.0, 0, 0.85)))
    if vet:                                              # a dead limb
        branch(rng, vm, at(path, 0.9), dirv(rng.uniform(0, 6.28), 0.9), 1.6, 0.1, 0.03, 3, 0.2, 0.0, aux=(1, 1), sides=4)
    return vm

def b_hazel(rng, vi, det):
    vm = VM(); sub = 1 if det else 0; n = int(rng.integers(6, 10)); cen = np.zeros(3)
    for k in range(n):
        az = rng.uniform(0, 6.28); H = rng.uniform(2.2, 3.3); el = rng.uniform(1.0, 1.4)
        pts, d = branch(rng, vm, np.array([rng.normal(0, 0.15), rng.normal(0, 0.15), 0]), dirv(az, el), H, 0.04, 0.012, 4, 0.15, 0.0, aux=(0, 1), sides=3)
        for q in range(int(rng.integers(2, 4))):
            p = at(pts, rng.uniform(0.55, 1.0))
            blob(vm, rng, 'leaf', p + [0, 0, 0.08], (rng.uniform(0.4, 0.62), rng.uniform(0.4, 0.62), rng.uniform(0.3, 0.45)), sub, rng.uniform(0, 3), 0.3, rng.uniform(0, 0.4))
    return vm

def b_willow(rng, vi, det):
    vm = VM(); n = int(rng.integers(5, 8))
    for k in range(n):
        az = k * 6.28 / n + rng.uniform(-0.3, 0.3); L = rng.uniform(1.7, 2.8)
        pts, d = branch(rng, vm, np.array([rng.normal(0, 0.1), rng.normal(0, 0.1), 0]), dirv(az, rng.uniform(0.55, 0.9)), L, 0.045, 0.012, 4, 0.12, 0.02, aux=(0, 1), sides=3)
        for q in range(7 if det else 4):
            p = at(pts, rng.uniform(0.35, 1.0))
            c = p + rng.normal(0, 0.14, 3); u = _norm(rng.normal(size=3) * [1, 1, 0.2]); v = _norm(np.array([rng.normal(0, 0.2), rng.normal(0, 0.2), -1.0]))
            card_c(vm, 'card', c, u, v, 0.12, 0.38, 0.0, rng.uniform(0.8, 1.0))
        blob(vm, rng, 'leaf', pts[-1] + [0, 0, 0.05], (0.42, 0.42, 0.3), 0, rng.uniform(0, 3), 0.3, 0.15)
    return vm

def b_wind_pine(rng, vi, det):
    """flag-shaped Scots pine, crown streams along +x (the instance is yawed so +x is downwind)."""
    vm = VM(); sub = 1 if det else 0; H = rng.uniform(2.8, 3.9); lean = rng.uniform(0.5, 0.9)
    zs = np.linspace(0, H, 7); f = zs / H; ph = rng.uniform(0, 6.28)
    path = np.stack([lean * H * 0.55 * f ** 1.7 + 0.08 * np.sin(f * 6 + ph), 0.1 * np.sin(f * 4 + ph), zs], 1)
    rad = 0.15 * H / 3.3 * (1 - 0.7 * f ** 0.8); rad[0] *= 1.5
    V, F = tube(path, rad, 6, True); vm.add('bark', V, F, 1.0, np.concatenate([np.repeat(f, 6), [1.0]]))
    for k in range(int(rng.integers(4, 6))):
        zt = rng.uniform(0.45, 0.95); b = at(path, zt); az = rng.uniform(-1.3, 1.3)
        L = rng.uniform(0.9, 2.1) * (0.6 + 0.6 * zt)
        pts, dd = branch(rng, vm, b, dirv(az, 0.12), L, 0.05, 0.02, 3, 0.15, 0.03, aux=(zt, 1), sides=4)
        blob(vm, rng, 'leaf', pts[-1] + [0.1, 0, 0.05], (rng.uniform(0.9, 1.4), rng.uniform(0.45, 0.7), rng.uniform(0.2, 0.3)), sub, rng.uniform(-0.3, 0.3), 0.25, 0.0)
    for k in range(2):                                   # bare windward stubs
        branch(rng, vm, at(path, rng.uniform(0.4, 0.8)), dirv(math.pi + rng.uniform(-0.6, 0.6), 0.1), rng.uniform(0.3, 0.6), 0.03, 0.01, 2, 0.1, 0, aux=(1, 1), sides=3)
    blob(vm, rng, 'leaf', path[-1] + [0.45, 0, 0.0], (1.1, 0.6, 0.28), sub, 0, 0.22, 0.0)
    return vm

def b_wind_thorn(rng, vi, det):
    """stunted hawthorn / rowan: low, twisted, wedge-shaped crown, windward side sheared close to the ground, leaves stream to +x."""
    vm = VM(); sub = 1 if det else 0; H = rng.uniform(1.7, 2.6); col = 'leaf'
    path = np.stack([np.linspace(-0.2, 0.7, 5) + rng.normal(0, 0.06, 5), 0.1 * np.sin(np.linspace(0, 5, 5) + vi), np.linspace(0, H * 0.6, 5)], 1)
    rad = 0.09 * (1 - 0.5 * np.linspace(0, 1, 5)); rad[0] *= 1.4
    V, F = tube(path, rad, 5, False); vm.add('bark', V, F, 1.0, 0.0)
    for k in range(int(rng.integers(3, 5))):
        pts, dd = branch(rng, vm, at(path, rng.uniform(0.4, 1.0)), dirv(rng.uniform(-1.1, 1.1), rng.uniform(0.2, 0.7)), rng.uniform(0.8, 1.6), 0.04, 0.012, 3, 0.18, 0.0, aux=(0, 1), sides=3)
    n = 9 if det else 6
    for k in range(n):
        t = k / (n - 1); x = -0.45 + 1.9 * t + rng.normal(0, 0.12); z = 0.45 + (H - 0.55) * (t ** 0.8) + rng.normal(0, 0.1)
        blob(vm, rng, 'leaf', (x, rng.normal(0, 0.3), z), (rng.uniform(0.45, 0.7), rng.uniform(0.4, 0.6), rng.uniform(0.28, 0.4)), sub, rng.uniform(-0.3, 0.3), 0.3, rng.uniform(0, 0.4))
    return vm

def b_juniper(rng, vi, det):
    vm = VM()
    if vi >= 3:                                           # upright columnar form
        for k in range(3):
            blob(vm, rng, 'leaf', (rng.normal(0, 0.05), rng.normal(0, 0.05), 0.5 + 0.55 * k), (0.34 - 0.07 * k, 0.34 - 0.07 * k, 0.5), 1, rng.uniform(0, 3), 0.3, 0.15 * (2 - k))
        return vm
    n = int(rng.integers(5, 9)); R = rng.uniform(0.55, 0.95)
    for k in range(n):
        a = rng.uniform(0, 6.28); d = rng.uniform(0, R)
        blob(vm, rng, 'leaf', (d * math.cos(a), d * math.sin(a), 0.18 + 0.2 * (1 - d / R)), (rng.uniform(0.35, 0.6), rng.uniform(0.3, 0.5), rng.uniform(0.2, 0.34)), 1, rng.uniform(0, 3), 0.3, d / R * 0.2)
    return vm

def b_gorse(rng, vi, det):
    vm = VM(); n = int(rng.integers(3, 6)); R = rng.uniform(0.35, 0.6)
    for k in range(n):
        a = rng.uniform(0, 6.28); d = rng.uniform(0, R)
        blob(vm, rng, 'leaf', (d * math.cos(a), d * math.sin(a), 0.3 + 0.25 * (1 - d / R)), (rng.uniform(0.38, 0.6), rng.uniform(0.38, 0.6), rng.uniform(0.3, 0.5)), 1, rng.uniform(0, 3), 0.42, d / R * 0.25)
    for k in range(26 if det else 14):
        a = rng.uniform(0, 6.28); e = rng.uniform(0.2, 1.2); r = rng.uniform(0.3, 0.8) * (0.6 + R)
        oct_fleck(vm, (r * math.cos(a) * math.cos(e) * 0.85, r * math.sin(a) * math.cos(e) * 0.85, 0.25 + r * math.sin(e) * 0.8), rng.uniform(0.045, 0.075), rng, 0.0)
    return vm

def b_bracken(rng, vi, det):
    vm = VM(); n = int(rng.integers(9, 14))
    for k in range(n):
        a = rng.uniform(0, 6.28); L = rng.uniform(0.7, 1.15); up = rng.uniform(0.35, 0.75)
        pts = []
        for s in range(4):
            t = s / 3; pts.append((math.cos(a) * L * t * 0.8, math.sin(a) * L * t * 0.8, up * math.sin(t * 2.2) * 0.9 + 0.05))
        strip(vm, 'card', np.array(pts) + rng.normal(0, 0.05, 3) * [1, 1, 0], np.array([0.04, 0.22, 0.25, 0.05]) * (L / 0.9), aux=0.0, shade=rng.uniform(0.8, 1.05), side=np.array([-math.sin(a), math.cos(a), 0.0]) * 1.0)
    return vm

def b_heather(rng, vi, det):
    vm = VM(); R = rng.uniform(0.2, 0.34)
    for k in range(2):
        blob(vm, rng, 'leaf', (rng.normal(0, R * 0.4), rng.normal(0, R * 0.4), 0.1 + 0.06 * k), (R * rng.uniform(0.9, 1.3), R * rng.uniform(0.9, 1.3), R * 0.55), 0, rng.uniform(0, 3), 0.35, 0.1)
    for k in range(10 if det else 6):
        a = rng.uniform(0, 6.28); r = rng.uniform(0, R * 1.05)
        oct_fleck(vm, (r * math.cos(a), r * math.sin(a), 0.12 + R * 0.5 * (1 - r / (R * 1.05)) + 0.03), rng.uniform(0.03, 0.05), rng, 0.0)
    return vm

def b_cotton(rng, vi, det):
    vm = VM(); n = int(rng.integers(5, 8))
    for k in range(n):
        a = rng.uniform(0, 6.28); h = rng.uniform(0.22, 0.42); l = rng.uniform(0.02, 0.1)
        top = np.array([l * math.cos(a), l * math.sin(a), h])
        strip(vm, 'card', np.array([(0, 0, 0), top * 0.55, top]) + rng.normal(0, 0.01, 3), [0.012, 0.01, 0.004], aux=0.0, shade=1.0, side=np.array([-math.sin(a), math.cos(a), 0]))
        oct_fleck(vm, top + [0, 0, 0.03], rng.uniform(0.032, 0.05), rng, 0.0)
    return vm

def b_snag(rng, vi, det):
    vm = VM(); H = [rng.uniform(3.0, 4.6), rng.uniform(1.4, 2.0), rng.uniform(3.6, 5.0), rng.uniform(2.4, 3.4), rng.uniform(3.2, 4.2)][vi % 5]
    path = trunk_path(rng, H, 7, rng.uniform(0.1, 0.35), (rng.normal(0, 0.1), rng.normal(0, 0.1)), 2.4); f = np.linspace(0, 1, 7)
    r0 = rng.uniform(0.14, 0.22) * (1 + 0.4 * (vi % 5 == 1)); rad = r0 * (1 - 0.6 * f ** 0.9); rad[0] *= 1.35
    V, F = tube(path, rad, 6, True); vm.add('bark', V, F, 1.0, np.concatenate([np.repeat(f, 6), [1.0]]))
    for k in range(int(rng.integers(0 if vi % 5 == 1 else 3, 6))):
        branch(rng, vm, at(path, rng.uniform(0.35, 0.92)), dirv(rng.uniform(0, 6.28), rng.uniform(0.0, 0.7)), rng.uniform(0.4, 1.4), 0.05, 0.015, 3, 0.2, -0.02, aux=(0.5, 1), sides=4, cap=True)
    if vi % 5 == 3:
        branch(rng, vm, at(path, 0.55), dirv(rng.uniform(0, 6.28), 1.0), H * 0.4, 0.07, 0.02, 3, 0.12, 0.02, aux=(0.5, 1), sides=4, cap=True)
    return vm

def b_log(rng, vi, det):
    vm = VM(); L = rng.uniform(2.2, 4.0); n = 6; r0 = rng.uniform(0.11, 0.2)
    xs = np.linspace(-L / 2, L / 2, n); path = np.stack([xs, 0.1 * np.sin(xs * 1.5 + vi), np.full(n, r0 * 0.85)], 1)
    rad = r0 * (1 - 0.35 * np.linspace(0, 1, n)); V, F = tube(path, rad, 6, True); vm.add('bark', V, F, 1.0, np.concatenate([np.repeat(np.linspace(0, 1, n), 6), [1.0]]))
    for k in range(int(rng.integers(1, 4))):
        branch(rng, vm, path[int(rng.integers(1, n - 1))], dirv(rng.uniform(0.5, 2.6) * rng.choice([-1, 1]), rng.uniform(0.2, 0.9)), rng.uniform(0.3, 0.8), 0.04, 0.012, 2, 0.1, 0, aux=(1, 1), sides=3, cap=True)
    if vi % 2 == 0:                                       # root plate
        blob(vm, rng, 'bark', path[0] + [-0.05, 0, 0.25], (0.12, r0 * 2.4, r0 * 2.2), 1, 0, 0.4, 1.0)
    return vm

# name -> (builder, variants, veteran-from index, mature height m (for the lineup / sizing), crown radius m (spacing), kind, materials)
SPECIES = {
    'pine':       dict(b=b_pine, n=6, vet=4, h=7.4, r=1.5, kind='tree'),
    'spruce':     dict(b=b_spruce, n=6, vet=5, h=7.5, r=1.3, kind='tree'),
    'birch':      dict(b=b_birch, n=6, vet=4, h=6.0, r=1.1, kind='tree'),
    'rowan':      dict(b=b_rowan, n=5, vet=4, h=4.2, r=1.0, kind='tree'),
    'oak':        dict(b=b_oak, n=6, vet=4, h=5.2, r=2.0, kind='tree'),
    'hazel':      dict(b=b_hazel, n=5, vet=9, h=3.0, r=1.0, kind='shrub'),
    'willow':     dict(b=b_willow, n=5, vet=9, h=2.4, r=1.2, kind='shrub'),
    'wind_pine':  dict(b=b_wind_pine, n=5, vet=9, h=3.4, r=1.2, kind='wind'),
    'wind_thorn': dict(b=b_wind_thorn, n=5, vet=9, h=2.2, r=1.0, kind='wind'),
    'juniper':    dict(b=b_juniper, n=5, vet=9, h=1.0, r=0.7, kind='cover'),
    'gorse':      dict(b=b_gorse, n=4, vet=9, h=1.0, r=0.6, kind='cover'),
    'bracken':    dict(b=b_bracken, n=4, vet=9, h=0.8, r=0.7, kind='cover'),
    'heather':    dict(b=b_heather, n=3, vet=9, h=0.4, r=0.3, kind='cover'),
    'cotton':     dict(b=b_cotton, n=3, vet=9, h=0.4, r=0.2, kind='cover'),
    'snag':       dict(b=b_snag, n=5, vet=9, h=3.8, r=0.6, kind='dead'),
    'log':        dict(b=b_log, n=4, vet=9, h=0.5, r=1.8, kind='dead'),
}
SP_ID = {k: i for i, k in enumerate(SPECIES)}
GROUP_TREE = ('pine', 'spruce', 'birch', 'rowan', 'oak', 'hazel', 'willow', 'wind_pine', 'wind_thorn')
_VCACHE = {}

def variant(sp, vi, seed=0, det=1):
    """built variant (cached): dict(parts=..., tris, height). Deterministic from (seed, species, index, detail)."""
    key = (sp, vi, seed, det)
    if key not in _VCACHE:
        rng = np.random.default_rng([int(seed) & 0xffff, SP_ID[sp], vi, det])
        parts = SPECIES[sp]['b'](rng, vi, det).finish()
        _VCACHE[key] = dict(parts=parts, tris=int(sum(len(p['F']) for p in parts.values())), height=float(max(p['V'][:, 2].max() for p in parts.values())))
    return _VCACHE[key]

# ---------------------------------------------------------------- site rules (pure functions of the landform maps: unit-tested)
FORBID_VEG_TREE = ('V_SAND', 'V_SHINGLE', 'V_LOCH', 'V_BARE', 'V_LICHEN', 'V_BOG', 'V_RUSH', 'V_MACHAIR', 'V_WATER')
PROV_W = {   # species weight by province (TUNING): A gneiss thin acid soil, B sandstone loam, C basalt brown loam
    'A': dict(pine=1.0, spruce=0.12, birch=1.0, rowan=0.55, oak=0.05, hazel=0.15, willow=0.5, juniper=1.0, gorse=0.45, bracken=0.3),
    'B': dict(pine=0.3, spruce=0.55, birch=0.6, rowan=0.3, oak=1.0, hazel=0.8, willow=0.5, juniper=0.3, gorse=0.8, bracken=1.0),
    'C': dict(pine=0.15, spruce=0.45, birch=0.5, rowan=0.5, oak=0.7, hazel=1.0, willow=0.5, juniper=0.2, gorse=1.0, bracken=0.7),
}
def soil_depth_map(soil_table, slope, wet, wind):
    """soil depth in metres from the rock table value, thinner on slopes and in the wind, deeper in gentle wet hollows."""
    return np.clip(soil_table * (0.6 + 0.9 * (1 - smooth(0.1, 0.5, slope))) * (1 + 0.5 * wet) * (1 - 0.45 * smooth(0.2, 0.7, wind)), 0, 1.5)

def species_weights(prov, soil, wind, slope, wet, H, veg_ok_tree, rockamt):
    """weights (>= 0, arrays) for every species from the maps. veg_ok_tree is the bool map of ground that may carry trees at all.
    Upright trees need shelter (wind < ~0.4); wind-shaped trees take the exposed band; oak needs deep soil and the most shelter; willow and hazel take
    the damp and deep ground; pine takes dry thin free-draining soil; nothing grows on steep ground, rock, bog, sand or shingle."""
    pw = PROV_W[prov]
    sheltered = 1 - smooth(0.16, 0.42, wind); exposed = smooth(0.28, 0.5, wind) * (1 - smooth(0.62, 0.78, wind))
    dry = 1 - smooth(0.3, 0.6, wet); moist = smooth(0.28, 0.55, wet) * (1 - smooth(0.68, 0.82, wet))
    deep = smooth(0.2, 0.4, soil); thin = 1 - smooth(0.2, 0.5, soil)
    gentle = 1 - smooth(0.28, 0.5, slope); gully = smooth(0.1, 0.28, slope) * (1 - smooth(0.42, 0.52, slope))
    ok = veg_ok_tree & (slope < 0.52) & (rockamt < 0.35) & (H > 1.8) & (H < 30)
    z = np.zeros_like(wind)
    W = {k: z.copy() for k in SPECIES}
    W['pine'] = pw['pine'] * dry * (0.35 + 0.65 * thin) * (1 - smooth(0.2, 0.42, wind)) * (soil > 0.08) * ok
    W['spruce'] = pw['spruce'] * deep * sheltered * (1 - 0.5 * moist) * gentle * ok
    W['birch'] = pw['birch'] * (0.35 + 0.55 * gully + 0.4 * moist) * sheltered * (soil > 0.08) * ok
    W['rowan'] = pw['rowan'] * (0.15 + gully) * sheltered * (0.6 + 0.4 * thin) * (soil > 0.08) * ok
    W['oak'] = pw['oak'] * smooth(0.3, 0.45, soil) * (1 - smooth(0.1, 0.28, wind)) * gentle * (1 - 0.5 * moist) * ok
    W['hazel'] = pw['hazel'] * deep * sheltered * (0.5 + 0.5 * moist) * (0.6 + 0.4 * gully) * ok
    W['willow'] = pw['willow'] * moist * (1 - smooth(0.2, 0.45, wind)) * ok
    exp_ok = ok & (soil > 0.1)
    W['wind_pine'] = 0.5 * exposed * smooth(0.08, 0.2, soil) * dry * (pw['pine'] + pw['spruce']) * exp_ok
    W['wind_thorn'] = 0.7 * exposed * smooth(0.08, 0.2, soil) * exp_ok
    return W

# ---------------------------------------------------------------- placement
def _hash_items(items):
    h = hashlib.sha256()
    for it in items:
        h.update(('%s|%d|%.2f|%.2f|%.2f|%.2f|%.2f|%s|' % (it['sp'], it['vi'], it['x'], it['y'], it['z'], it['sc'], it['yaw'], it['age'])).encode())
    return h.hexdigest()[:16]

HERO_SCALE = 1.3      # hero trees are drawn 1.3x: at island framing (about 7 px per metre) a 5 m tree is 35 px and the species read; wide view below
WIDE_SCALE = 1.8      # trees and shrubs are drawn 1.8x in the wide view (3-8 px otherwise); the unit tests check the placement, not this factor

def plan(T, seed, prov, wave_from, camp_xy, wide=False, W=None, IC=None, limit_trees=None):
    """Deterministic planting plan for a terrain dict T (landform_scene.build_terrain output). Returns dict(items, counts, tris, hash, ...).
    Each item: kind, sp (species), vi (variant), x, y, z, sc (height scale), sw (width scale), yaw, lean (rad), lean_dir, age, col (hue, value, autumn)."""
    import world as W_
    import island_common as IC_
    W = W or W_; IC = IC or IC_
    rng = np.random.default_rng(int(seed) + 4101)
    X, Y, H = T['X'], T['Y'], T['H']; ny, nx = H.shape; d = T['d']
    wind = np.asarray(T['wind']); slope = np.asarray(T['slope']); wet = np.asarray(T['wet']); rockamt = np.asarray(T['rockamt']); veg = T['veg']
    soil = soil_depth_map(np.asarray(T['soil']), slope, wet, wind)
    forbid = np.isin(veg, [getattr(W, n) for n in FORBID_VEG_TREE])
    ok_tree = ~forbid
    if camp_xy is not None:
        far = np.hypot(X - camp_xy[0], Y - camp_xy[1]) > 9.0
    else:
        far = np.ones(H.shape, bool)
    SW = species_weights(prov, soil, wind, slope, wet, H, ok_tree & far, rockamt)
    # copse field: clusters, edge trees, sparse singles (woodland is sparse and patchy; most ground stays open)
    C = IC.fbm(X / 20.0, Y / 20.0, int(seed) + 4151, 3)
    shelter_mean = 1 - smooth(0.15, 0.45, wind)
    cf = C + 0.18 * shelter_mean
    core = smooth(0.56, 0.66, cf); edge = smooth(0.47, 0.57, cf) * (1 - core)
    p_site = 0.92 * core + 0.30 * edge + 0.035 * shelter_mean
    wsum = np.zeros(H.shape)
    for k in GROUP_TREE:
        wsum = wsum + SW[k]
    dens = np.clip(p_site * np.minimum(wsum * 1.6, 1.0), 0, 1)
    lim = limit_trees if limit_trees is not None else (330 if wide else 150)
    rr, cc = np.nonzero(dens > 0.004)
    items = []; grid = {}
    wf = wave_from; down = (-math.cos(wf), -math.sin(wf))            # wind blows from wave_from towards the lee
    down_az = math.atan2(down[1], down[0])
    def sample(A, x, y):
        fx = np.clip((x - X[0, 0]) / d, 0, nx - 1.001); fy = np.clip((y - Y[0, 0]) / d, 0, ny - 1.001); i = int(fx); j = int(fy); tx = fx - i; ty = fy - j
        return float(A[j, i] * (1 - tx) * (1 - ty) + A[j, i + 1] * tx * (1 - ty) + A[j + 1, i] * (1 - tx) * ty + A[j + 1, i + 1] * tx * ty)
    def place(sp, x, y, kind, age, extra_sc=1.0, wind_here=0.0, soil_here=0.3):
        spd = SPECIES[sp]; vets = [i for i in range(spd['n']) if i >= spd['vet']]; nonv = [i for i in range(spd['n']) if i < spd['vet']]
        if age == 'veteran' and not vets:
            age = 'mature'
        vi = int(rng.choice(vets)) if age == 'veteran' else int(rng.choice(nonv))
        base = {'sapling': rng.uniform(0.34, 0.58), 'mature': rng.uniform(0.82, 1.08), 'veteran': rng.uniform(1.12, 1.32)}[age]
        hf = (0.62 + 0.55 * smooth(0.1, 0.5, soil_here)) * (1 - 0.45 * smooth(0.15, 0.6, wind_here))
        sc = base * hf * extra_sc * (WIDE_SCALE if wide else HERO_SCALE) * rng.uniform(0.92, 1.1); sw = sc * rng.uniform(0.88, 1.14) * (1.0 if age != 'sapling' else 0.9)
        z = sample(H, x, y)
        lean = math.radians(rng.uniform(0, 5) + 9 * wind_here * (1 if kind != 'wind' else 0)); ld = down_az + rng.uniform(-0.6, 0.6) if wind_here > 0.15 else rng.uniform(0, 6.28)
        yaw = (down_az + rng.uniform(-0.35, 0.35)) if kind == 'wind' else rng.uniform(0, 6.28)
        auto = 0.0
        if kind in ('tree', 'shrub', 'wind') and sp not in ('pine', 'spruce', 'wind_pine'):
            u = rng.random(); auto = rng.uniform(0.5, 0.95) if u < 0.10 else rng.uniform(0.0, 0.15)
        it = dict(kind=kind, sp=sp, vi=vi, x=float(x), y=float(y), z=float(z), sc=float(sc), sw=float(sw), yaw=float(yaw), lean=float(lean), lean_dir=float(ld), age=age,
                  col=(float(rng.normal(0, 0.45)), float(rng.uniform(0.75, 1.25)), float(auto)))
        return it
    sel = rng.permutation(len(rr))[:30000]
    ntree = 0
    for s_i in sel:
        if ntree >= lim:
            break
        r, c = rr[s_i], cc[s_i]
        if rng.random() > dens[r, c]:
            continue
        x = X[r, c] + rng.uniform(-d, d) * 0.0; y = Y[r, c] + rng.uniform(-d, d) * 0.0      # trees stand on the cell centre (the rules are cell rules); the draws keep the random stream
        w = np.array([SW[k][r, c] for k in GROUP_TREE]); tot = w.sum()
        if tot <= 1e-6:
            continue
        k = GROUP_TREE[int(rng.choice(len(GROUP_TREE), p=w / tot))]
        spd = SPECIES[k]
        # age: copse core mixes all ages, edge trees run small, lone trees skew old
        e = edge[r, c] > core[r, c]; single = p_site[r, c] < 0.2 and not e
        pr = np.array([0.38, 0.52, 0.10]) if e else (np.array([0.12, 0.43, 0.45]) if single else np.array([0.28, 0.54, 0.18]))
        age = ['sapling', 'mature', 'veteran'][int(rng.choice(3, p=pr))]
        wh = float(wind[r, c]); sh = float(soil[r, c])
        it = place(k, x, y, spd['kind'], age, 1.0, wh, sh)
        rad = spd['r'] * it['sw']
        # spacing (hash grid 4 m): crowns may overlap a little inside copses
        gx, gy = int(x // 4), int(y // 4); bad = False
        for ii in (gx - 1, gx, gx + 1):
            for jj in (gy - 1, gy, gy + 1):
                for o in grid.get((ii, jj), ()):
                    if math.hypot(o['x'] - x, o['y'] - y) < 0.62 * (o['rad'] + rad) + 0.3:
                        bad = True; break
                if bad: break
            if bad: break
        if bad:
            continue
        it['rad'] = rad; grid.setdefault((gx, gy), []).append(it); items.append(it); ntree += 1
    # shrubs / ground cover: weights from the same maps; scattered where the ground suits, denser inside the copse field for gorse and juniper
    def cover(sp, wmap, n, kind, rcell=0.0, scale=(0.8, 1.25), jit=0.5):
        rr2, cc2 = np.nonzero(wmap > 0.01)
        if len(rr2) == 0 or n <= 0:
            return
        p = wmap[rr2, cc2]; p = p / p.sum(); k = min(n, len(rr2))
        pick = rng.choice(len(rr2), size=k, replace=False, p=p) if k < len(rr2) else np.arange(len(rr2))
        for q in pick:
            r, c = rr2[q], cc2[q]; x = X[r, c] + rng.uniform(-d, d) * jit; y = Y[r, c] + rng.uniform(-d, d) * jit
            spd = SPECIES[sp]; vi = int(rng.integers(0, spd['n']))
            sc = rng.uniform(*scale) * (0.7 + 0.5 * smooth(0.05, 0.4, soil[r, c]))
            auto = rng.uniform(0.0, 1.0) if sp == 'bracken' else 0.0
            items.append(dict(kind=kind, sp=sp, vi=vi, x=float(x), y=float(y), z=float(sample(H, x, y)), sc=float(sc), sw=float(sc * rng.uniform(0.85, 1.2)), yaw=float(rng.uniform(0, 6.28)),
                              lean=0.0, lean_dir=0.0, age='mature', col=(float(rng.normal(0, 0.45)), float(rng.uniform(0.75, 1.25)), float(auto)), rad=spd['r'] * sc))
    land = (H > 1.0) & far & ~np.isin(veg, [W.V_SAND, W.V_SHINGLE, W.V_LOCH, W.V_WATER]) & (rockamt < 0.6)
    pw = PROV_W[prov]
    coastal = smooth(0.12, 0.5, wind)
    jun = pw['juniper'] * (0.3 + 0.7 * (1 - smooth(0.2, 0.5, soil))) * (1 - smooth(0.55, 0.75, wind)) * (1 - smooth(0.4, 0.6, wet)) * (slope < 0.85) * land * (veg != W.V_BOG)
    gor = pw['gorse'] * smooth(0.08, 0.25, soil) * (0.35 + 0.65 * np.maximum(coastal, smooth(0.1, 0.4, slope))) * (1 - smooth(0.6, 0.8, wind)) * (1 - smooth(0.4, 0.6, wet)) * (slope < 0.8) * land * ~np.isin(veg, [W.V_BOG, W.V_RUSH])
    brk = pw['bracken'] * smooth(0.18, 0.36, soil) * (1 - smooth(0.3, 0.6, wind)) * (1 - smooth(0.4, 0.6, wet)) * (0.4 + smooth(0.05, 0.3, slope)) * (slope < 0.7) * land * np.isin(veg, [W.V_PASTURE, W.V_TURF, W.V_HEATHER, W.V_SCRUB])
    hea = (np.isin(veg, [W.V_HEATHER]) * 1.0 + np.isin(veg, [W.V_TURF, W.V_SCRUB]) * 0.35) * (1 - smooth(0.35, 0.6, wet)) * (1 - smooth(0.65, 0.85, wind)) * (slope < 0.9) * land * (1 - rockamt)
    cot = np.isin(veg, [W.V_BOG, W.V_RUSH]) * smooth(0.45, 0.7, wet) * (H > 0.8) * (1 - rockamt) * far
    nS = 0.45 if wide else 1.0
    if wide:
        cover('juniper', jun, 60, 'cover'); cover('gorse', gor, 90, 'cover')
    else:
        cover('juniper', jun, 70, 'cover'); cover('gorse', gor, 110, 'cover', scale=(0.8, 1.4)); cover('bracken', brk, 90, 'cover', scale=(0.8, 1.5))
        cover('heather', hea, 320, 'cover', scale=(0.9, 1.6)); cover('cotton', cot, 140, 'cover', scale=(0.9, 1.4))
    # dead wood near the coast: snags among trees at the shore, driftwood logs on the upper beach (on sand / shingle too)
    shore = (H > 0.6) & (H < 5.0) & (wind > 0.12)
    sn = shore * (1 - rockamt) * (1 - smooth(0.35, 0.5, slope)) * far * ~np.isin(veg, [W.V_LOCH, W.V_WATER, W.V_BOG]) * (soil > 0.06)
    lg = ((H > 0.5) & (H < 3.2)) * (np.isin(veg, [W.V_SHINGLE, W.V_SAND, W.V_MACHAIR]) * 1.0 + 0.25) * (1 - smooth(0.25, 0.5, slope)) * far * ~np.isin(veg, [W.V_LOCH, W.V_WATER]) * (1 - 0.6 * rockamt)
    cover('snag', sn, 4 if wide else 9, 'dead', scale=(0.8, 1.3), jit=0.9)
    cover('log', lg, 4 if wide else 8, 'dead', scale=(0.8, 1.3), jit=0.9)
    cnt = {}
    for it in items:
        cnt[it['sp']] = cnt.get(it['sp'], 0) + 1
    det = 0 if wide else 1
    used = sorted({(it['sp'], it['vi']) for it in items})
    tris_total = sum(variant(sp, vi, seed, det)['tris'] for (sp, vi) in [(it['sp'], it['vi']) for it in items])
    tris_unique = sum(variant(sp, vi, seed, det)['tris'] for (sp, vi) in used)
    return dict(items=items, counts=cnt, n=len(items), n_trees=sum(1 for it in items if it['kind'] in ('tree', 'wind', 'shrub')), tris_instanced=int(tris_total), tris_unique=int(tris_unique),
                variants_used=len(used), hash=_hash_items(items), detail=det)

# ---------------------------------------------------------------- Blender materials and instances (bpy imported lazily)
AUTUMN = dict(birch=(0.46, 0.32, 0.05), rowan=(0.30, 0.10, 0.04), oak=(0.28, 0.16, 0.03), hazel=(0.42, 0.32, 0.05), willow=(0.42, 0.36, 0.08), wind_thorn=(0.36, 0.2, 0.04),
              bracken=(0.30, 0.14, 0.035), gorse=(0.04, 0.09, 0.02), pine=(0.06, 0.09, 0.03), spruce=(0.03, 0.07, 0.04), wind_pine=(0.06, 0.09, 0.03), juniper=(0.05, 0.09, 0.05),
              heather=(0.04, 0.03, 0.025), cotton=(0.14, 0.17, 0.06))
LEAF = dict(   # linear colour stops for the noise ramp: dark, mid, light
    pine=((0.016, 0.045, 0.03), (0.04, 0.085, 0.05), (0.075, 0.13, 0.07)), spruce=((0.012, 0.038, 0.03), (0.03, 0.075, 0.05), (0.055, 0.11, 0.06)),
    birch=((0.08, 0.15, 0.03), (0.17, 0.26, 0.05), (0.3, 0.36, 0.08)), rowan=((0.035, 0.09, 0.03), (0.08, 0.15, 0.045), (0.14, 0.21, 0.06)),
    oak=((0.04, 0.075, 0.02), (0.09, 0.13, 0.03), (0.17, 0.19, 0.045)), hazel=((0.09, 0.15, 0.03), (0.17, 0.24, 0.05), (0.28, 0.33, 0.07)),
    willow=((0.11, 0.15, 0.08), (0.2, 0.26, 0.15), (0.3, 0.35, 0.22)), wind_pine=((0.016, 0.045, 0.03), (0.04, 0.085, 0.05), (0.075, 0.13, 0.07)),
    wind_thorn=((0.07, 0.10, 0.04), (0.13, 0.16, 0.06), (0.2, 0.22, 0.09)), juniper=((0.02, 0.05, 0.04), (0.045, 0.09, 0.065), (0.08, 0.13, 0.09)),
    gorse=((0.014, 0.045, 0.015), (0.03, 0.08, 0.025), (0.05, 0.12, 0.035)), bracken=((0.17, 0.09, 0.025), (0.30, 0.16, 0.04), (0.42, 0.24, 0.06)),
    heather=((0.03, 0.022, 0.02), (0.06, 0.04, 0.035), (0.09, 0.06, 0.05)), cotton=((0.07, 0.10, 0.04), (0.12, 0.15, 0.06), (0.17, 0.19, 0.09)),
)
FLECK = dict(rowan=(0.55, 0.04, 0.02), gorse=(1.0, 0.62, 0.02), heather=(0.30, 0.06, 0.26), cotton=(0.95, 0.95, 0.9))
BARK = dict(pine='pine', wind_pine='pine', birch='birch', snag='snag', log='snag')
MASK = dict(birch='leaf', willow='blade', bracken='frond', cotton='blade')

_MAT = {}
def _mat_leaf(sp, card=False):
    import bpy, li_scene as LS
    key = ('leaf', sp, card)
    if key in _MAT:
        return _MAT[key]
    m = bpy.data.materials.new('Leaf_%s%s' % (sp, '_card' if card else '')); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    node, link, ramp, pin, S = LS.node, LS.link, LS.ramp, LS.pin, LS.S
    out = node(nt, 'ShaderNodeOutputMaterial', (1400, 0))
    oi = node(nt, 'ShaderNodeObjectInfo', (-1000, 200)); tc = node(nt, 'ShaderNodeTexCoord', (-1000, -100))
    try:
        sep = node(nt, 'ShaderNodeSeparateColor', (-800, 250))
    except Exception:
        sep = node(nt, 'ShaderNodeSeparateRGB', (-800, 250))
    link(nt, oi.outputs['Color'], sep.inputs[0])
    chan = lambda nm: sep.outputs[nm] if nm in sep.outputs.keys() else sep.outputs[{'Red': 'R', 'Green': 'G', 'Blue': 'B'}[nm]]
    # per-object noise offset so every tree is a different sample of the same pattern
    rm = node(nt, 'ShaderNodeMath', (-800, 100), operation='MULTIPLY'); link(nt, oi.outputs['Random'], rm.inputs[0]); rm.inputs[1].default_value = 43.0
    cm = node(nt, 'ShaderNodeCombineXYZ', (-650, 100)); link(nt, rm.outputs[0], cm.inputs['X']); link(nt, rm.outputs[0], cm.inputs['Z'])
    va = node(nt, 'ShaderNodeVectorMath', (-500, 0), operation='ADD'); link(nt, tc.outputs['Object'], va.inputs[0]); link(nt, cm.outputs[0], va.inputs[1])
    nz = node(nt, 'ShaderNodeTexNoise', (-300, 0), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 2.6; nz.inputs['Detail'].default_value = 5
    link(nt, va.outputs[0], nz.inputs['Vector'])
    lo, mid, hi = LEAF[sp]
    cr = ramp(nt, nz.outputs['Fac'], [(0.3, (*lo, 1)), (0.55, (*mid, 1)), (0.8, (*hi, 1))], (-100, 0))
    # hue and value jitter from the object colour (R: hue -1..1 mapped 0..1, G: value 0.6..1.4 mapped 0..1)
    hs = node(nt, 'ShaderNodeHueSaturation', (150, 0))
    hm = node(nt, 'ShaderNodeMath', (-100, 250), operation='MULTIPLY_ADD'); link(nt, chan('Red'), hm.inputs[0]); hm.inputs[1].default_value = 0.1; hm.inputs[2].default_value = 0.45
    vmul = node(nt, 'ShaderNodeMath', (-100, 350), operation='MULTIPLY_ADD'); link(nt, chan('Green'), vmul.inputs[0]); vmul.inputs[1].default_value = 0.8; vmul.inputs[2].default_value = 0.6
    link(nt, hm.outputs[0], hs.inputs['Hue']); link(nt, vmul.outputs[0], hs.inputs['Value']); link(nt, cr.outputs['Color'], hs.inputs['Color'])
    # vertex shade (cheap AO) and autumn patches
    at_ = node(nt, 'ShaderNodeAttribute', (-500, -250), attribute_name='Col')
    try:
        asep = node(nt, 'ShaderNodeSeparateColor', (-300, -250))
    except Exception:
        asep = node(nt, 'ShaderNodeSeparateRGB', (-300, -250))
    link(nt, at_.outputs['Color'], asep.inputs[0])
    sh = asep.outputs['Red'] if 'Red' in asep.outputs.keys() else asep.outputs['R']
    mx = node(nt, 'ShaderNodeMix', (400, 0), data_type='RGBA', blend_type='MULTIPLY'); S(mx, 'inputs', 'Factor').default_value = 1.0
    link(nt, hs.outputs['Color'], S(mx, 'inputs', 'A'))
    cs = node(nt, 'ShaderNodeCombineXYZ', (200, -250))
    for nm in ('X', 'Y', 'Z'): link(nt, sh, cs.inputs[nm])
    link(nt, cs.outputs[0], S(mx, 'inputs', 'B'))
    an = node(nt, 'ShaderNodeTexNoise', (-300, -450), noise_dimensions='3D'); an.inputs['Scale'].default_value = 1.4; an.inputs['Detail'].default_value = 3
    link(nt, va.outputs[0], an.inputs['Vector'])
    am = node(nt, 'ShaderNodeMath', (-100, -450), operation='MULTIPLY_ADD'); link(nt, chan('Blue'), am.inputs[0]); am.inputs[1].default_value = 1.5; link(nt, an.outputs['Fac'], am.inputs[2])
    asub = node(nt, 'ShaderNodeMath', (100, -450), operation='SUBTRACT'); link(nt, am.outputs[0], asub.inputs[0]); asub.inputs[1].default_value = 0.95
    amul = node(nt, 'ShaderNodeMath', (250, -450), operation='MULTIPLY', use_clamp=True); link(nt, asub.outputs[0], amul.inputs[0]); amul.inputs[1].default_value = 7.0
    ac = AUTUMN.get(sp, (0.3, 0.2, 0.05)); acol = node(nt, 'ShaderNodeRGB', (400, -250)); acol.outputs[0].default_value = (*ac, 1)
    ax = node(nt, 'ShaderNodeMix', (600, 0), data_type='RGBA'); link(nt, amul.outputs[0], S(ax, 'inputs', 'Factor'))
    link(nt, S(mx, 'outputs', 'Result'), S(ax, 'inputs', 'A')); link(nt, acol.outputs[0], S(ax, 'inputs', 'B'))
    bs = LS.principled(nt, (850, 0)); link(nt, S(ax, 'outputs', 'Result'), bs.inputs['Base Color']); pin(bs, 'Roughness', 0.85)
    tr = node(nt, 'ShaderNodeBsdfTranslucent', (850, -250)); link(nt, S(ax, 'outputs', 'Result'), tr.inputs['Color'])
    ms = node(nt, 'ShaderNodeMixShader', (1100, 0)); ms.inputs['Fac'].default_value = 0.22 if sp not in ('pine', 'spruce', 'wind_pine', 'juniper') else 0.06
    link(nt, bs.outputs['BSDF'], ms.inputs[1]); link(nt, tr.outputs['BSDF'], ms.inputs[2])
    final = ms.outputs['Shader']
    if card:
        uv = node(nt, 'ShaderNodeTexCoord', (-1000, -600)); us = node(nt, 'ShaderNodeSeparateXYZ', (-800, -600)); link(nt, uv.outputs['UV'], us.inputs[0])
        kind = MASK.get(sp, 'leaf')
        if kind == 'leaf':
            dn = node(nt, 'ShaderNodeVectorMath', (-600, -600), operation='DISTANCE'); link(nt, uv.outputs['UV'], dn.inputs[0]); dn.inputs[1].default_value = (0.5, 0.5, 0.0)
            nz2 = node(nt, 'ShaderNodeTexNoise', (-600, -800), noise_dimensions='3D'); nz2.inputs['Scale'].default_value = 7.0; link(nt, va.outputs[0], nz2.inputs['Vector'])
            dd = node(nt, 'ShaderNodeMath', (-400, -600), operation='MULTIPLY_ADD'); link(nt, dn.outputs['Value'], dd.inputs[0]); dd.inputs[1].default_value = 2.0; link(nt, nz2.outputs['Fac'], dd.inputs[2])
            dd2 = node(nt, 'ShaderNodeMath', (-250, -600), operation='SUBTRACT'); link(nt, dd.outputs[0], dd2.inputs[0]); dd2.inputs[1].default_value = 0.2
            mk = ramp(nt, dd2.outputs[0], [(0.0, (1, 1, 1, 1)), (0.55, (1, 1, 1, 1)), (0.8, (0, 0, 0, 1))], (-100, -600))
            mask = mk.outputs['Color']
        else:                                            # frond / blade: width tapers along v (pinnate teeth for fronds)
            ax_ = node(nt, 'ShaderNodeMath', (-600, -600), operation='SUBTRACT'); link(nt, us.outputs['X'], ax_.inputs[0]); ax_.inputs[1].default_value = 0.5
            ab = node(nt, 'ShaderNodeMath', (-450, -600), operation='ABSOLUTE'); link(nt, ax_.outputs[0], ab.inputs[0])
            a2 = node(nt, 'ShaderNodeMath', (-300, -600), operation='MULTIPLY'); link(nt, ab.outputs[0], a2.inputs[0]); a2.inputs[1].default_value = 2.0
            if kind == 'frond':
                sn_ = node(nt, 'ShaderNodeMath', (-600, -800), operation='MULTIPLY'); link(nt, us.outputs['Y'], sn_.inputs[0]); sn_.inputs[1].default_value = 70.0
                sn2 = node(nt, 'ShaderNodeMath', (-450, -800), operation='SINE'); link(nt, sn_.outputs[0], sn2.inputs[0])
                lim = node(nt, 'ShaderNodeMath', (-300, -800), operation='MULTIPLY_ADD'); link(nt, sn2.outputs[0], lim.inputs[0]); lim.inputs[1].default_value = 0.25; lim.inputs[2].default_value = 0.75
            else:
                lim = node(nt, 'ShaderNodeMath', (-300, -800), operation='ADD'); lim.inputs[0].default_value = 1.0; lim.inputs[1].default_value = 0.0
            tp = node(nt, 'ShaderNodeMath', (-150, -800), operation='SUBTRACT'); tp.inputs[0].default_value = 1.05; link(nt, us.outputs['Y'], tp.inputs[1])
            ed = node(nt, 'ShaderNodeMath', (0, -800), operation='MULTIPLY'); link(nt, tp.outputs[0], ed.inputs[0]); link(nt, lim.outputs[0], ed.inputs[1])
            gt = node(nt, 'ShaderNodeMath', (150, -700), operation='GREATER_THAN'); link(nt, ed.outputs[0], gt.inputs[0]); link(nt, a2.outputs[0], gt.inputs[1])
            mask = gt.outputs[0]
        tp_ = node(nt, 'ShaderNodeBsdfTransparent', (1100, -250))
        ms2 = node(nt, 'ShaderNodeMixShader', (1250, 0)); link(nt, mask, ms2.inputs['Fac']); link(nt, tp_.outputs['BSDF'], ms2.inputs[1]); link(nt, ms.outputs['Shader'], ms2.inputs[2])
        final = ms2.outputs['Shader']
    link(nt, final, out.inputs['Surface'])
    _MAT[key] = m; return m

def _mat_bark(sp):
    import bpy, li_scene as LS
    kind = BARK.get(sp, 'dark'); key = ('bark', sp if kind == 'dark' else kind)
    if key in _MAT:
        return _MAT[key]
    m = bpy.data.materials.new('Bark_%s' % kind); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    node, link, ramp, pin, S = LS.node, LS.link, LS.ramp, LS.pin, LS.S
    out = node(nt, 'ShaderNodeOutputMaterial', (900, 0)); bs = LS.principled(nt, (600, 0)); tc = node(nt, 'ShaderNodeTexCoord', (-800, 0))
    sq = node(nt, 'ShaderNodeVectorMath', (-600, 0), operation='MULTIPLY'); link(nt, tc.outputs['Object'], sq.inputs[0])
    nz = node(nt, 'ShaderNodeTexNoise', (-400, 0), noise_dimensions='3D'); nz.inputs['Detail'].default_value = 4
    at_ = node(nt, 'ShaderNodeAttribute', (-400, -300), attribute_name='Col')
    try:
        asep = node(nt, 'ShaderNodeSeparateColor', (-200, -300))
    except Exception:
        asep = node(nt, 'ShaderNodeSeparateRGB', (-200, -300))
    link(nt, at_.outputs['Color'], asep.inputs[0]); green = asep.outputs['Green'] if 'Green' in asep.outputs.keys() else asep.outputs['G']
    if kind == 'birch':
        sq.inputs[1].default_value = (4.0, 4.0, 22.0); nz.inputs['Scale'].default_value = 3.0
        link(nt, sq.outputs[0], nz.inputs['Vector'])
        cr = ramp(nt, nz.outputs['Fac'], [(0.42, (0.62, 0.6, 0.55, 1)), (0.5, (0.76, 0.75, 0.7, 1)), (0.6, (0.06, 0.05, 0.045, 1)), (0.7, (0.78, 0.77, 0.72, 1))], (-100, 0))
        cc = cr.outputs['Color']
        # thin twigs (aux ~1) are dark purple-brown
        mx = node(nt, 'ShaderNodeMix', (300, 0), data_type='RGBA'); link(nt, green, S(mx, 'inputs', 'Factor')); link(nt, cc, S(mx, 'inputs', 'A')); S(mx, 'inputs', 'B').default_value = (0.05, 0.035, 0.03, 1)
        cc = S(mx, 'outputs', 'Result')
    elif kind == 'pine':
        sq.inputs[1].default_value = (5.0, 5.0, 1.6); nz.inputs['Scale'].default_value = 5.0
        link(nt, sq.outputs[0], nz.inputs['Vector'])
        cr = ramp(nt, nz.outputs['Fac'], [(0.3, (0.11, 0.075, 0.055, 1)), (0.6, (0.2, 0.12, 0.08, 1)), (0.8, (0.3, 0.14, 0.06, 1))], (-100, 0))
        # upper trunk and boughs go orange-red (aux = height fraction)
        up = ramp(nt, green, [(0.35, (0.0, 0.0, 0.0, 1)), (0.8, (1.0, 1.0, 1.0, 1))], (100, -200))
        orng = node(nt, 'ShaderNodeRGB', (100, -350)); orng.outputs[0].default_value = (0.5, 0.2, 0.06, 1)
        mx = node(nt, 'ShaderNodeMix', (300, 0), data_type='RGBA'); link(nt, up.outputs['Color'], S(mx, 'inputs', 'Factor')); link(nt, cr.outputs['Color'], S(mx, 'inputs', 'A')); link(nt, orng.outputs[0], S(mx, 'inputs', 'B'))
        cc = S(mx, 'outputs', 'Result')
    elif kind == 'snag':
        sq.inputs[1].default_value = (3.0, 3.0, 1.2); nz.inputs['Scale'].default_value = 4.0
        link(nt, sq.outputs[0], nz.inputs['Vector'])
        cr = ramp(nt, nz.outputs['Fac'], [(0.3, (0.17, 0.155, 0.14, 1)), (0.6, (0.3, 0.28, 0.25, 1)), (0.8, (0.42, 0.4, 0.36, 1))], (-100, 0))
        ln = node(nt, 'ShaderNodeTexNoise', (-400, 250), noise_dimensions='3D'); ln.inputs['Scale'].default_value = 9.0; link(nt, tc.outputs['Object'], ln.inputs['Vector'])
        lm = ramp(nt, ln.outputs['Fac'], [(0.55, (0, 0, 0, 1)), (0.68, (1, 1, 1, 1))], (-100, 250))
        lc = node(nt, 'ShaderNodeRGB', (-100, 400)); lc.outputs[0].default_value = (0.36, 0.38, 0.14, 1)
        mx = node(nt, 'ShaderNodeMix', (300, 0), data_type='RGBA'); link(nt, lm.outputs['Color'], S(mx, 'inputs', 'Factor')); link(nt, cr.outputs['Color'], S(mx, 'inputs', 'A')); link(nt, lc.outputs[0], S(mx, 'inputs', 'B'))
        cc = S(mx, 'outputs', 'Result')
    else:
        sq.inputs[1].default_value = (5.0, 5.0, 1.8); nz.inputs['Scale'].default_value = 5.0
        link(nt, sq.outputs[0], nz.inputs['Vector'])
        cr = ramp(nt, nz.outputs['Fac'], [(0.3, (0.05, 0.04, 0.032, 1)), (0.6, (0.11, 0.085, 0.065, 1)), (0.8, (0.2, 0.17, 0.14, 1))], (-100, 0))
        cc = cr.outputs['Color']
    link(nt, cc, bs.inputs['Base Color']); pin(bs, 'Roughness', 0.95)
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    _MAT[key] = m; return m

def _mat_fleck(sp):
    import bpy, li_scene as LS
    key = ('fleck', sp)
    if key in _MAT:
        return _MAT[key]
    m = bpy.data.materials.new('Fleck_%s' % sp); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*FLECK.get(sp, (0.5, 0.5, 0.1)), 1); b.inputs['Roughness'].default_value = 0.7
    _MAT[key] = m; return m

_MESH = {}
def _mesh(sp, vi, seed, det):
    """one Blender mesh per variant (parts become material slots); linked duplicates share it."""
    import bpy, li_scene as LS
    key = (sp, vi, seed, det)
    if key in _MESH:
        return _MESH[key]
    v = variant(sp, vi, seed, det); parts = v['parts']; order = [k for k in ('bark', 'leaf', 'card', 'fleck') if k in parts]
    V = []; F = []; MI = []; S = []; UV = []; n = 0
    for mi, k in enumerate(order):
        p = parts[k]; V.append(p['V']); F.append(p['F'] + n); MI.append(np.full(len(p['F']), mi)); S.append(p['S']); UV.append(p['UV']); n += len(p['V'])
    V = np.concatenate(V); F = np.concatenate(F); MI = np.concatenate(MI); S = np.concatenate(S); UV = np.concatenate(UV)
    me = bpy.data.meshes.new('T_%s_%d' % (sp, vi))
    me.vertices.add(len(V)); me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    nf = len(F); me.loops.add(3 * nf); me.loops.foreach_set('vertex_index', F.astype(np.int32).ravel())
    me.polygons.add(nf); me.polygons.foreach_set('loop_start', (np.arange(nf) * 3).astype(np.int32)); me.polygons.foreach_set('loop_total', np.full(nf, 3, np.int32))
    me.polygons.foreach_set('use_smooth', np.ones(nf, bool)); me.polygons.foreach_set('material_index', MI.astype(np.int32))
    me.update()
    LS.set_color_attr(me, 'Col', np.stack([S[:, 0], S[:, 1], np.zeros(len(S))], 1))
    uvl = me.uv_layers.new(name='UV'); uvl.data.foreach_set('uv', UV[F.ravel()].astype(np.float32).ravel())
    for k in order:
        me.materials.append({'bark': lambda: _mat_bark(sp), 'leaf': lambda: _mat_leaf(sp, False), 'card': lambda: _mat_leaf(sp, True), 'fleck': lambda: _mat_fleck(sp)}[k]())
    _MESH[key] = me; return me

def reset_cache():
    _MAT.clear(); _MESH.clear()

def instantiate(items, seed=0, det=1, collection=None, name='Veg'):
    """linked duplicates of the variant meshes at the planned places. Returns the objects."""
    import bpy
    from mathutils import Matrix
    coll = collection or bpy.context.scene.collection; objs = []
    for k, it in enumerate(items):
        me = _mesh(it['sp'], it['vi'], seed, det)
        ob = bpy.data.objects.new('%s_%s_%d' % (name, it['sp'], k), me)
        coll.objects.link(ob)
        ca, sa = math.cos(it['yaw']), math.sin(it['yaw']); Rz = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1.0]])
        th = it.get('lean', 0.0); ld = it.get('lean_dir', 0.0)
        ax = np.array([-math.sin(ld), math.cos(ld), 0.0]); K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
        Rl = np.eye(3) + math.sin(th) * K + (1 - math.cos(th)) * (K @ K)
        R = Rl @ Rz
        M = R @ np.diag([it['sw'], it['sw'], it['sc']])
        mat = Matrix([[M[0, 0], M[0, 1], M[0, 2], it['x']], [M[1, 0], M[1, 1], M[1, 2], it['y']], [M[2, 0], M[2, 1], M[2, 2], it['z'] - 0.1 * it['sc']], [0, 0, 0, 1]])
        ob.matrix_world = mat
        hue, val, aut = it['col']
        ob.color = (float(np.clip(hue * 0.5 + 0.5, 0, 1)), float(np.clip((val - 0.6) / 0.8, 0, 1)), float(np.clip(aut, 0, 1)), 1.0)
        objs.append(ob)
    return objs
