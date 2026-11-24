"""SEALS, HERO MODEL (grey seal male, female, pup, and the spotted harbour seal). See SEAL_MODEL.md.
Headless:  python3 seal_model.py --out DIR [--species grey_male|grey_female|grey_pup|harbour|all] [--lod hero|live|far|all] [--variant 0..5] [--wet] [--pose NAME]
Pure python + numpy: the lofted body, the head with a real jaw, flippers with claws, whiskers, eyes, the rig (joints are named glTF nodes), the animation clips, the baked textures (seal_tex.py, with the
JPEG writer collector_jpeg.py reused) and the glTF 2.0 binary writer. It also runs inside Blender's python. The quaternion helpers are reused from collector_model.py (read only).
Frame while building: +X forward (the nose), +Y left, +Z up, metres, ground at z = 0, origin on the ground under the middle of the trunk. The GLB is written in the glTF frame (Y up, +Z forward): (x, y, z) -> (y, z, x).
The body is ONE smooth lofted spindle (rings from nose to rump, superellipse cross sections with a flat belly), so the head, the neck rolls and the tail end are one surface, and it is skinned to the joints
(a real glTF skin): joints are the named nodes root, body, chest, neck, head, jaw, hips, tail, flipper_fl_l, flipper_fl_r, flipper_hind (with flipper_hind_l and _r), eye_l, eye_r, whisker_l, whisker_r and
the marker footprint. The mouth is a real gap: the lower jaw is its own piece with a lining, tongue and teeth behind it, so a yawn shows a mouth. Deterministic."""
import sys, os, math, json, struct, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import collector_model as CM            # quaternion helpers (read only)

LODS = ('hero', 'live', 'far')
SPECIES = ('grey_male', 'grey_female', 'grey_pup', 'harbour')
BUDGET = {'hero': (8000, 15000), 'live': (1500, 4000), 'far': (300, 700)}      # triangles (min, max)
SIZE_KB = {'hero': 1024, 'live': 300, 'far': 80}                               # bytes limit per file, in KB; the whole set of 12 files must stay under 4 MB
SET_KB = 4096
SEED = 11
TAU = 2 * math.pi


# ------------------------------------------------------------------------------------------------- small maths
def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)

def sgnpow(x, p):
    return np.sign(x) * np.abs(x) ** p

def unit(v):
    v = np.asarray(v, float); return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)

def pchip(xk, yk):
    """monotone cubic Hermite interpolation (Fritsch and Carlson), vectorised; the profile curves of the body come from this so they are smooth without overshoot"""
    xk = np.asarray(xk, float); yk = np.asarray(yk, float); h = np.diff(xk); d = np.diff(yk) / h; n = len(xk); m = np.zeros(n)
    for k in range(1, n - 1):
        if d[k - 1] * d[k] > 0:
            w1 = 2 * h[k] + h[k - 1]; w2 = h[k] + 2 * h[k - 1]; m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k])
    def end(h0, h1, d0, d1):
        v = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
        if np.sign(v) != np.sign(d0): return 0.0
        if np.sign(d0) != np.sign(d1) and abs(v) > 3 * abs(d0): return 3 * d0
        return v
    m[0] = end(h[0], h[1], d[0], d[1]); m[-1] = end(h[-1], h[-2], d[-1], d[-2])
    def f(x):
        x = np.asarray(x, float); i = np.clip(np.searchsorted(xk, x) - 1, 0, n - 2); hh = h[i]; s = np.clip((x - xk[i]) / hh, 0, 1)
        h00 = 2 * s ** 3 - 3 * s ** 2 + 1; h10 = s ** 3 - 2 * s ** 2 + s; h01 = -2 * s ** 3 + 3 * s ** 2; h11 = s ** 3 - s ** 2
        return h00 * yk[i] + h10 * hh * m[i] + h01 * yk[i + 1] + h11 * hh * m[i + 1]
    return f


# ------------------------------------------------------------------------------------------------- the species: numbers with their sources (see SEAL_MODEL.md section 2)
# the template is the adult male grey seal in metres, rings along t = 0 (nose) to 1 (rump end), trunk 2.0 m: (t, z_top, z_bottom, half_width)
BASE_KNOTS = [
    (0.000, 0.150, 0.105, 0.030), (0.020, 0.188, 0.080, 0.048), (0.050, 0.236, 0.092, 0.058), (0.080, 0.282, 0.096, 0.068), (0.120, 0.330, 0.095, 0.086),
    (0.170, 0.368, 0.085, 0.112), (0.210, 0.330, 0.030, 0.150), (0.260, 0.362, 0.000, 0.208), (0.320, 0.422, 0.000, 0.262), (0.380, 0.448, 0.000, 0.286),
    (0.450, 0.445, 0.000, 0.291), (0.520, 0.430, 0.000, 0.285), (0.600, 0.402, 0.000, 0.268), (0.680, 0.360, 0.000, 0.240), (0.760, 0.308, 0.000, 0.204),
    (0.840, 0.248, 0.004, 0.155), (0.920, 0.170, 0.014, 0.100), (0.970, 0.120, 0.026, 0.060), (1.000, 0.092, 0.036, 0.036)]

SP = {
    'grey_male': dict(label='grey seal, adult male', total=2.30, trail=0.30, wfac=1.08, hfac=1.08, head_w=1.00, head_h=1.00, snout=1.00, bridge=1.0, fore=0.34, hind=0.31, roll=0.050, fold=0.022, sag=0.11, asy=0.30,
                      eye_r=0.0255, pad=0.30, brow=0.10, bend=0.045, whisk=(7, 6), whisk_len=0.13, claw=0.028, mass=(170, 310), kind='grey', neck_extra=1.0),
    'grey_female': dict(label='grey seal, adult female', total=1.80, trail=0.25, wfac=1.12, hfac=1.12, head_w=0.90, head_h=0.90, snout=0.86, bridge=0.35, fore=0.27, hind=0.25, roll=0.018, fold=0.014, sag=0.09, asy=0.28,
                        eye_r=0.0240, pad=0.24, brow=0.07, bend=0.040, whisk=(7, 6), whisk_len=0.105, claw=0.022, mass=(103, 180), kind='grey', neck_extra=0.6),
    'grey_pup': dict(label='grey seal, white-coated pup', total=1.00, trail=0.15, wfac=1.04, hfac=1.04, head_w=1.22, head_h=1.28, snout=0.60, bridge=-0.1, fore=0.16, hind=0.15, roll=0.030, fold=0.020, sag=0.07, asy=0.25,
                     eye_r=0.0255, pad=0.20, brow=0.05, bend=0.030, whisk=(6, 5), whisk_len=0.06, claw=0.012, mass=(10, 18), kind='pup', neck_extra=0.5),
    'harbour': dict(label='harbour seal, adult', total=1.62, trail=0.22, wfac=1.08, hfac=1.10, head_w=1.04, head_h=1.12, snout=0.58, bridge=-1.0, fore=0.24, hind=0.23, roll=0.016, fold=0.012, sag=0.08, asy=0.30,
                    eye_r=0.0285, pad=0.30, brow=0.03, bend=0.040, whisk=(7, 6), whisk_len=0.095, claw=0.020, mass=(55, 170), kind='harbour', neck_extra=0.3),
}
T_HEAD = 0.17        # template t of the back of the cranium (before the snout factor)
THETA_LIP = 97.5     # degrees from the dorsal midline: the lip line of the mouth

LOD = {
    'hero': dict(st_head=34, st_neck=10, st_trunk=29, cols=48, fl=(14, 20), hfl=(14, 20), claws=3, eye=(18, 12), whisk=True, whisk_seg=3, brow=True, mouth=True, teeth=True, nostril=True, ear=True, lipline=True,
                 tex=dict(atlas=(2048, 768), body=(1536, 768), q=(62, 70, 60), nrm_div=2, orm_div=4)),
    'live': dict(st_head=14, st_neck=5, st_trunk=14, cols=24, fl=(6, 9), hfl=(6, 9), claws=1, eye=(8, 6), whisk=True, whisk_seg=2, brow=False, mouth=True, teeth=False, nostril=True, ear=False, lipline=False,
                 tex=dict(atlas=(1024, 384), body=(768, 384), q=(60, 68, 58), nrm_div=2, orm_div=4)),
    'far': dict(st_head=6, st_neck=2, st_trunk=8, cols=12, fl=(3, 4), hfl=(3, 4), claws=0, eye=(0, 0), whisk=False, whisk_seg=0, brow=False, mouth=False, teeth=False, nostril=False, ear=False, lipline=False,
                tex=dict(atlas=(512, 192), body=(384, 192), q=(60, 68, 58), nrm_div=2, orm_div=2, embed=False)),
}

def layout(lod):
    """atlas rectangles in pixels: body chart (the loft), fore flipper chart and hind flipper chart (each: dorsal on the top half, plantar on the bottom half)"""
    t = LOD[lod]['tex']
    if t is None: return None
    W, H = t['atlas']; bw, bh = t['body']; fw = (W - bw) // 2
    return dict(atlas=(W, H), body=(0, 0, bw, bh), fore=(bw, 0, fw, fw), hind=(bw + fw, 0, fw, fw))


# ------------------------------------------------------------------------------------------------- the body: a lofted spindle
class Body:
    def __init__(self, species):
        self.species = species; sp = SP[species]; self.sp = sp; self.Lb = Lb = sp['total'] - sp['trail']; self.sl = sl = Lb / 2.0; self.k = k = sp['snout']
        kn = []
        for (t, zt, zb, a) in BASE_KNOTS:
            tt = t * k if t <= T_HEAD + 1e-9 else t
            kn.append((tt, zt, zb, a))
        tk = np.array([q[0] for q in kn]); self.f_zt = pchip(tk, [q[1] for q in kn]); self.f_zb = pchip(tk, [q[2] for q in kn]); self.f_a = pchip(tk, [q[3] for q in kn])
        self.t_head = T_HEAD * k; self.t_comm = 0.098 * k; self.t_chin = 0.012; self.t_eye = 0.112 * k; self.t_ear = 0.162 * k; self.t_pad = 0.028 * k + 0.008
        self.xn = Lb / 2.0                       # nose x
        self.flat_floor = True
        self.asym = sp['asy']

    # ---- ring parameters
    def yoff(self, t):
        # the spine curves a little in plan (the banana), more at the head end
        t = np.asarray(t, float); return self.sp['bend'] * (np.sin(math.pi * np.clip(t, 0, 1)) ** 1.2) * (1.0 + 1.6 * np.clip(0.2 - t, 0, 0.2) / 0.2)

    def x_of_t(self, t): return self.xn - np.asarray(t, float) * self.Lb

    def rings(self, t):
        """ring facts at t: z centre, half height, half width, exponents, modifiers (all arrays)"""
        sp = self.sp; sl = self.sl; t = np.asarray(t, float)
        zt = self.f_zt(t) * sl * sp['hfac']; zb = self.f_zb(t) * sl * sp['hfac']; a = self.f_a(t) * sl * sp['wfac']
        hw = 1.0 - sstep(0.7 * self.t_head, 0.30, t)                         # head weight: 1 on the head, fades by the shoulders
        zc = (zt + zb) / 2.0; hh = (zt - zb) / 2.0
        hh = hh * (1 + (sp['head_h'] - 1) * hw); a = a * (1 + (sp['head_w'] - 1) * hw)
        bridge = sp['bridge'] * 0.016 * sl * np.exp(-((t - 0.095 * self.k) / (0.034 * max(self.k, 0.6))) ** 2)
        zt2 = zc + hh + bridge * 1.0; zb2 = zc - hh
        zc = (zt2 + zb2) / 2.0; hh = (zt2 - zb2) / 2.0
        c0 = 0.020; c1 = 0.030
        cap = np.sqrt(np.clip(1 - (1 - np.clip(t / c0, 0, 1)) ** 2, 0, 1)) * np.sqrt(np.clip(1 - (1 - np.clip((1 - t) / c1, 0, 1)) ** 2, 0, 1))
        return zc, hh * cap, a * cap, cap

    def pt(self, t, th):
        """surface point (builder frame) for arrays t (0..1 from the nose) and th (radians, 0 = dorsal midline, +pi/2 = left side), same shape"""
        sp = self.sp; t = np.asarray(t, float); th = np.asarray(th, float)
        zc, hh, a, cap = self.rings(t)
        c = np.cos(th); s = np.sin(th)
        ev_t = 2.0 + 0.15 * sstep(0.2, 0.5, t); ev_b = 2.25 + 1.25 * sstep(0.15, 0.36, t) * (1 - 0.4 * sstep(0.86, 1.0, t)); el = 2.2 + 0.2 * sstep(0.3, 0.5, t)
        ev = np.where(c >= 0, ev_t, ev_b)
        dz = hh * sgnpow(c, 2.0 / ev); dy = a * sgnpow(s, 2.0 / el)
        # neck rolls (skin folds across the neck, stronger on the sides and underneath), flank folds, a little lumpiness
        wlow = 0.45 + 0.55 * sstep(0.6, -0.8, c)
        win = sstep(0.15 * self.k + 0.03, 0.20, t) * (1 - sstep(0.30, 0.37, t))
        roll = sp['roll'] * np.sin(TAU * (t - 0.17) / 0.052) * win * wlow
        win2 = sstep(0.34, 0.45, t) * (1 - sstep(0.70, 0.80, t))
        fold = sp['fold'] * np.sin(TAU * (t - 0.40) / 0.115 + 0.8) * win2 * (0.2 + 0.8 * sstep(0.3, -0.6, c)) * (np.abs(s) * 0.6 + 0.4)
        lump = 0.018 * (np.sin(th * 3.0 + t * 17.0) * np.sin(t * 9.0 + 1.3)) * sstep(0.12, 0.3, t)
        m = 1.0 + roll + fold + lump
        dy = dy * m; dz = dz * m
        # face: the puffy whisker pad (mystacial pad), the brow bump over the eye, a soft chin
        a_lat = np.minimum(th, TAU - th)
        tp = self.t_pad
        pad = sp['pad'] * np.exp(-((t - tp) / (0.024 * max(self.k, 0.6))) ** 2) * np.exp(-((a_lat - 1.90) / 0.38) ** 2)
        brow = sp['brow'] * np.exp(-((t - (self.t_eye - 0.004)) / (0.020 * max(self.k, 0.6))) ** 2) * np.exp(-((a_lat - 0.78) / 0.30) ** 2)
        chin = 0.09 * np.exp(-((t - 0.05 * self.k) / (0.026 * max(self.k, 0.6))) ** 2) * np.exp(-((np.abs(a_lat - math.pi)) / 0.55) ** 2)
        m2 = 1.0 + pad + brow + chin
        dy = dy * m2; dz = dz * m2
        # the belly spreads when resting, a little more on the left (asymmetric)
        low = sstep(0.15, -0.75, c) * sstep(0.12, 0.34, t)
        spread = sp['sag'] * (np.sin(math.pi * np.clip((t - 0.2) / 0.7, 0, 1)) ** 0.8) * low
        dy = dy * (1 + spread * (1 + self.asym * np.sign(s)))
        z = zc + dz; y = dy + self.yoff(t)
        # ground: the body lies on the sand; a soft floor at 3 mm
        zf = 0.003; z = np.maximum(z, zf)
        x = self.xn - t * self.Lb
        return np.stack([x, y, z], -1)

    def centre(self, t):
        zc, hh, a, cap = self.rings(t); t = np.asarray(t, float)
        return np.stack([self.xn - t * self.Lb, self.yoff(t), zc], -1)

    def normal(self, t, th):
        t = np.asarray(t, float); th = np.asarray(th, float); e1 = 1.5e-3; e2 = 2.0e-3
        t0 = np.clip(t, 4e-4, 1 - 4e-4)
        Pt = self.pt(t0 + e1, th) - self.pt(t0 - e1, th); Pq = self.pt(t0, th + e2) - self.pt(t0, th - e2)
        n = np.cross(Pq, Pt); n = unit(n)
        ctr = self.centre(t0); out = self.pt(t0, th) - ctr
        flip = np.sum(n * out, -1) < 0
        return np.where(flip[..., None], -n, n)

    def surf(self, t, th, lift=0.0):
        P = self.pt(t, th); return P + self.normal(t, th) * lift

    def mass_kg(self):
        t = np.linspace(0, 1, 400); zc, hh, a, cap = self.rings(t); area = math.pi * a * hh * 0.93; dx = self.Lb / 399
        return float(np.sum(area) * dx * 1000.0 * 0.98)


def u_of_t(body, t):
    """chart u (0..1) along the body: the head gets twice the texel density of the trunk"""
    t = np.asarray(t, float); tg = np.linspace(0, 1, 2001); w = 1.0 + 1.0 * (1 - sstep(0.7 * body.t_head, 0.3, tg)); cu = np.concatenate([[0.0], np.cumsum(0.5 * (w[1:] + w[:-1]))]); cu /= cu[-1]
    return np.interp(t, tg, cu)

def t_of_u(body, u):
    tg = np.linspace(0, 1, 2001); w = 1.0 + 1.0 * (1 - sstep(0.7 * body.t_head, 0.3, tg)); cu = np.concatenate([[0.0], np.cumsum(0.5 * (w[1:] + w[:-1]))]); cu /= cu[-1]
    return np.interp(np.asarray(u, float), cu, tg)


# ------------------------------------------------------------------------------------------------- flippers: a thin plate with scalloped digits (height field, two sheets that meet at the rim)
FORE_LEN = np.array([1.00, 0.985, 0.93, 0.84, 0.72])           # relative digit lengths I to V
HIND_LEN = np.array([0.94, 0.86, 0.82, 0.87, 0.97])

def plate_local(kind, L, hw, thick, t, q, sign):
    """local point (x along, y across, z thickness) and the digit centres. t in 0..1 along, q in -1..1 across, sign +1 top sheet, -1 bottom sheet"""
    t = np.asarray(t, float); q = np.asarray(q, float)
    dig = np.array([-0.8, -0.4, 0.0, 0.4, 0.8])
    lens = FORE_LEN if kind == 'fore' else HIND_LEN
    env = np.interp(q, dig, lens, left=lens[0], right=lens[-1])
    lobe = 0.5 * (1 + np.cos(TAU * (q[..., None] - dig) / 0.4)) * (np.abs(q[..., None] - dig) < 0.2)
    lobe = lobe.sum(-1)
    depth = 0.085 if kind == 'fore' else 0.115
    Lq = L * env * (1 - depth * (1 - lobe))
    x = t * Lq
    p = x / L
    if kind == 'fore':
        h = hw * (0.50 + 0.50 * np.sin(np.clip(p / 0.62, 0, 1) * math.pi / 2) ** 0.8) * (1 - 0.18 * sstep(0.7, 1.0, p))
        th = thick * (1 - np.abs(q) ** 3.0) ** 0.75 * (1 - sstep(0.0, 1.0, t) ** 5) ** 0.5 * (0.55 + 0.45 * (1 - p) ** 0.8) * (1 + 0.10 * lobe)
    else:
        h = hw * (0.20 + 0.80 * sstep(0.0, 0.85, p) ** 0.9)
        th = thick * (1 - np.abs(q) ** 3.0) ** 0.75 * (1 - sstep(0.0, 1.0, t) ** 5) ** 0.5 * (0.28 + 0.72 * (1 - p) ** 1.4) * (1 + 0.06 * lobe)
    y = q * h; z = sign * th
    return np.stack([x, y, z], -1)

def plate_mesh(kind, L, hw, thick, nt, nq):
    """grid for both sheets; returns local P, N (numeric), UV params (t, q, sign) and triangles"""
    tt = np.linspace(0, 1, nt + 1); qq = np.linspace(-1, 1, nq + 1); Pl = []; Nl = []; Tp = []; Qp = []; Sg = []; tris = []; base = 0
    for sign in (1, -1):
        T, Q = np.meshgrid(tt, qq, indexing='ij'); P = plate_local(kind, L, hw, thick, T, Q, sign)
        e = 1e-3
        dT = plate_local(kind, L, hw, thick, np.clip(T + e, 0, 1), Q, sign) - plate_local(kind, L, hw, thick, np.clip(T - e, 0, 1), Q, sign)
        dQ = plate_local(kind, L, hw, thick, T, np.clip(Q + e, -1, 1), sign) - plate_local(kind, L, hw, thick, T, np.clip(Q - e, -1, 1), sign)
        N = unit(np.cross(dT, dQ)) * sign
        # at the rim (|q| = 1, t = 1) the tangent vectors degenerate: use the surface direction
        bad = np.linalg.norm(np.cross(dT, dQ), axis=-1) < 1e-10
        N[bad] = np.array([0, 0, sign])
        idx = np.arange((nt + 1) * (nq + 1)).reshape(nt + 1, nq + 1) + base
        for i in range(nt):
            for j in range(nq):
                a, b, c, d = idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]
                if sign > 0: tris += [(a, b, c), (a, c, d)]
                else: tris += [(a, c, b), (a, d, c)]
        Pl.append(P.reshape(-1, 3)); Nl.append(N.reshape(-1, 3)); Tp.append(T.reshape(-1)); Qp.append(Q.reshape(-1)); Sg.append(np.full(T.size, sign)); base += P.size // 3
    return np.concatenate(Pl), np.concatenate(Nl), np.concatenate(Tp), np.concatenate(Qp), np.concatenate(Sg), np.array(tris, int)


def basis(ex, ez):
    ex = unit(ex); ez = unit(np.asarray(ez, float) - np.dot(ez, ex) * ex); ey = np.cross(ez, ex); return np.stack([ex, ey, ez], 1)     # columns


def tube_ribbon(pts, w0, w1, up_ref):
    """a flat tapered ribbon along a polyline (a whisker): returns P, N, tris"""
    pts = np.asarray(pts, float); n = len(pts); tang = unit(np.gradient(pts, axis=0)); side = unit(np.cross(tang, up_ref)); width = np.linspace(w0, w1, n) / 2.0
    P = np.concatenate([pts - side * width[:, None], pts + side * width[:, None]]); Nn = unit(np.cross(side, tang)); N = np.concatenate([Nn, Nn])
    tris = []
    for i in range(n - 1): tris += [(i, i + 1, n + i + 1), (i, n + i + 1, n + i)]
    return P, N, np.array(tris, int)


def uv_sphere(center, radii, nu, nv, rot=None):
    u = np.linspace(0, TAU, nu + 1); v = np.linspace(0, math.pi, nv + 1); U, V = np.meshgrid(u, v, indexing='ij')
    d = np.stack([np.sin(V) * np.cos(U), np.sin(V) * np.sin(U), np.cos(V)], -1).reshape(-1, 3)
    P = np.asarray(center) + d * np.asarray(radii); N = unit(d / np.asarray(radii))
    idx = np.arange((nu + 1) * (nv + 1)).reshape(nu + 1, nv + 1); tris = []
    for i in range(nu):
        for j in range(nv):
            a, b, c, e = idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]
            if j > 0: tris.append((a, b, e)) if False else tris.append((a, e, b))
            if j < nv - 1: tris.append((b, e, c))
    return P, N, np.array(tris, int)


def cone_mesh(base, tip, r, seg, curve=None):
    """a small cone (claw, tooth) from base to tip, optionally bent: curve = a vector added progressively to the tip direction"""
    base = np.asarray(base, float); tip = np.asarray(tip, float); ax = unit(tip - base)
    ref = np.array([0, 0, 1.0]) if abs(ax[2]) < 0.9 else np.array([1.0, 0, 0]); s = unit(np.cross(ax, ref)); u = np.cross(s, ax)
    ang = np.linspace(0, TAU, seg, endpoint=False); ring = base + r * (np.cos(ang)[:, None] * s + np.sin(ang)[:, None] * u)
    P = np.concatenate([ring, [tip], [base]]); N = unit(np.concatenate([(ring - base), [ax], [-ax]])); tris = []
    for i in range(seg):
        j = (i + 1) % seg; tris.append((i, j, seg)); tris.append((j, i, seg + 1))
    return P, N, np.array(tris, int)


# ------------------------------------------------------------------------------------------------- mesh accumulator (per material), skinned
class Acc:
    def __init__(self): self.d = {}
    def add(self, mat, P, N, T, joint, uv=None, col=None):
        """joint: an int (rigid to that joint) or (J (n,4) int, W (n,4) float)"""
        P = np.asarray(P, float); n = len(P)
        if isinstance(joint, (int, np.integer)): J = np.zeros((n, 4), int); J[:, 0] = joint; W = np.zeros((n, 4)); W[:, 0] = 1.0
        else: J, W = joint
        e = self.d.setdefault(mat, dict(P=[], N=[], UV=[], C=[], J=[], W=[], T=[], n=0))
        e['P'].append(P); e['N'].append(np.asarray(N, float)); e['J'].append(J); e['W'].append(W); e['T'].append(np.asarray(T, int) + e['n']); e['n'] += n
        e['UV'].append(uv if uv is not None else np.zeros((n, 2))); e['C'].append(col if col is not None else np.zeros((n, 3)))
        return e


# ------------------------------------------------------------------------------------------------- the rig
JOINT_ORDER = ['root', 'body', 'chest', 'neck', 'head', 'jaw', 'hips', 'tail', 'flipper_fl_l', 'flipper_fl_r', 'flipper_hind', 'flipper_hind_l', 'flipper_hind_r', 'eye_l', 'eye_r', 'whisker_l', 'whisker_r', 'eye_target', 'footprint']
JOINTS_SKIN = ['root', 'body', 'chest', 'neck', 'head', 'jaw', 'hips', 'tail', 'flipper_fl_l', 'flipper_fl_r', 'flipper_hind', 'flipper_hind_l', 'flipper_hind_r']
PARENT = {'body': 'root', 'chest': 'body', 'neck': 'chest', 'head': 'neck', 'jaw': 'head', 'hips': 'body', 'tail': 'hips', 'flipper_fl_l': 'chest', 'flipper_fl_r': 'chest', 'flipper_hind': 'tail',
          'flipper_hind_l': 'flipper_hind', 'flipper_hind_r': 'flipper_hind', 'eye_l': 'head', 'eye_r': 'head', 'whisker_l': 'head', 'whisker_r': 'head', 'eye_target': 'root', 'footprint': 'root', 'root': None}
SPINE = ['head', 'neck', 'chest', 'body', 'hips', 'tail']
AXES = {
    'body': 'translation any; pitch y -20..25 (positive = nose down), roll x +-20, yaw z +-15', 'chest': 'pitch y -35..20, roll x +-18, yaw z +-25; scale for breathing', 'neck': 'pitch y -45..20, yaw z +-40, roll x +-20',
    'head': 'pitch y -35..30, yaw z +-45, roll x +-25', 'jaw': 'pitch y 0..42 (positive opens the mouth)', 'hips': 'pitch y -25..25, yaw z +-25, roll x +-20', 'tail': 'yaw z +-30, pitch y -30..30',
    'flipper_fl_l': 'yaw z (swing back/forward) -50..70, roll x (lift) 0..70, pitch y +-30', 'flipper_fl_r': 'mirror of flipper_fl_l', 'flipper_hind': 'yaw z +-35 (the beat), pitch y +-25',
    'flipper_hind_l': 'yaw z 0..20 (splay)', 'flipper_hind_r': 'yaw z -20..0 (splay)', 'eye_l': 'scale z 1 open to 0.15 shut', 'eye_r': 'scale z 1 open to 0.15 shut',
    'whisker_l': 'yaw z +-25 (sweep), pitch y +-20 (droop)', 'whisker_r': 'yaw z +-25, pitch y +-20', 'root': 'the whole animal: translation and pitch for slide_in; leave at rest otherwise', 'footprint': 'marker only', 'eye_target': 'marker: the point the eyes look at in look_around (translate it, aim the eyes at it); parent root',
}

def joint_positions(body, sp, eye_at):
    """builder-frame pivots of every joint at rest"""
    Lb = body.Lb; J = {}
    def at(t, dz=0.0, dy=0.0):
        c = body.centre(np.array([t]))[0]; return np.array([c[0], c[1] + dy, c[2] + dz])
    kk = body.k
    J['root'] = np.array([0.0, 0.0, 0.0])
    J['head'] = at(body.t_head * 0.93); J['neck'] = at(0.255); J['chest'] = at(0.380, dz=-0.02); J['body'] = at(0.545, dz=-0.02); J['hips'] = at(0.765, dz=-0.01); J['tail'] = at(0.955)
    zc, hh, a, cap = body.rings(np.array([body.t_comm])); cm = body.centre(np.array([body.t_comm]))[0]
    J['jaw'] = np.array([cm[0], cm[1], cm[2] - 0.55 * hh[0]])
    tail_end = body.centre(np.array([0.995]))[0]
    J['flipper_hind'] = np.array([tail_end[0], tail_end[1], max(0.045, tail_end[2] - 0.02)])
    J['flipper_hind_l'] = J['flipper_hind'] + np.array([0.0, 0.028 * Lb / 2, 0.0]); J['flipper_hind_r'] = J['flipper_hind'] + np.array([0.0, -0.028 * Lb / 2, 0.0])
    ts = 0.325; cs = body.centre(np.array([ts]))[0]; zc, hh, a, cap = body.rings(np.array([ts]))
    J['flipper_fl_l'] = np.array([cs[0], cs[1] + a[0] * 0.80, 0.075]); J['flipper_fl_r'] = np.array([cs[0], cs[1] - a[0] * 0.80, 0.075])
    J['eye_l'] = eye_at['l']; J['eye_r'] = eye_at['r']
    J['whisker_l'] = eye_at['wl']; J['whisker_r'] = eye_at['wr']
    J['footprint'] = np.array([0.0, 0.0, 0.0])
    J['eye_target'] = np.array([body.xn + 1.1, 0.0, 0.40])
    return J


def spine_weights(x, jx):
    """linear blend along the spine: jx = x of head, neck, chest, body, hips, tail (descending). returns J (n,4) of spine joint ids and W (n,4)"""
    x = np.asarray(x, float); n = len(x); ids = [JOINTS_SKIN.index(s) for s in SPINE]
    Jm = np.zeros((n, 4), int); Wm = np.zeros((n, 4)); Jm[:, 0] = ids[0]
    for i in range(len(SPINE) - 1):
        xa, xb = jx[i], jx[i + 1]
        m = (x <= xa) & (x > xb)
        f = np.clip((xa - x[m]) / (xa - xb), 0, 1); f = f * f * (3 - 2 * f)
        Jm[m, 0] = ids[i]; Jm[m, 1] = ids[i + 1]; Wm[m, 0] = 1 - f; Wm[m, 1] = f
    Wm[x > jx[0], 0] = 1.0; Jm[x > jx[0], 0] = ids[0]
    m = x <= jx[-1]; Jm[m, 0] = ids[-1]; Wm[m, 0] = 1.0; Wm[m, 1] = 0
    return Jm, Wm


# ------------------------------------------------------------------------------------------------- build the geometry of one animal
def station_ts(body, L):
    th = body.t_head; tc = body.t_comm
    a = 0.5 * (1 - np.cos(np.linspace(0, math.pi / 2, max(3, L['st_head'] * 2 // 3) + 1)))          # nose to the commissure, dense at the nose
    a = a / a[-1] * tc
    b = np.linspace(tc, 0.30, L['st_neck'] + 1)[1:]
    u = np.linspace(0, 1, L['st_trunk'] + 1)[1:]; c = 0.30 + (1 - 0.30) * (0.55 * u + 0.45 * 0.5 * (1 - np.cos(math.pi * u)))
    ts = np.concatenate([a, b, c]); ts[0] = 0.0; ts[-1] = 1.0
    # extra rings between the commissure and the back of the cranium
    return ts


def build_geometry(species, lod, variant=0, wet=False, seed=SEED):
    L = LOD[lod]; body = Body(species); sp = body.sp; Lb = body.Lb; N_c = L['cols']
    ts = station_ts(body, L); S = len(ts); cols = np.arange(N_c + 1); th = TAU * cols / N_c
    # head hinge indices
    ic0 = int(np.argmin(np.abs(ts - body.t_chin))); ic1 = int(np.argmin(np.abs(ts - body.t_comm)))
    ts[ic1] = body.t_comm
    TT, TH = np.meshgrid(ts, th, indexing='ij')
    P = body.pt(TT, TH); Nn = body.normal(TT, TH)
    # eye and whisker pad positions
    te = body.t_eye; the = math.radians(76.0)
    pe_l = body.surf(np.array([te]), np.array([the]), lift=-0.004)[0]; pe_r = pe_l * np.array([1, -1, 1]) + np.array([0, 2 * body.yoff(np.array([te]))[0], 0])
    pad_t = body.t_chin + 0.012 + 0.0 * body.k; th_pad = math.radians(104.0)
    pw_l = body.surf(np.array([body.t_pad]), np.array([math.radians(108.0)]), lift=0.0)[0]; pw_r = pw_l * np.array([1, -1, 1]) + np.array([0, 2 * body.yoff(np.array([body.t_pad]))[0], 0])
    eye_at = dict(l=pe_l, r=pe_r, wl=pw_l, wr=pw_r)
    JP = joint_positions(body, sp, eye_at)
    jx = [JP[s][0] for s in SPINE]
    acc = Acc()
    jid = {n: i for i, n in enumerate(JOINTS_SKIN)}
    # ---- the trunk loft, triangle by triangle so jaw triangles can carry their own weights
    k_lip = int(round(THETA_LIP / 360.0 * N_c)); k_lip_r = N_c - k_lip
    if lod == 'far': mouth = False
    else: mouth = L['mouth']
    tri = []; kinds = []
    for i in range(S - 1):
        for k in range(N_c):
            a, b, c, d = i * (N_c + 1) + k, (i + 1) * (N_c + 1) + k, (i + 1) * (N_c + 1) + k + 1, i * (N_c + 1) + k + 1
            tri.append((a, b, c)); tri.append((a, c, d))
            isjaw = mouth and (ic0 <= i < ic1) and (k_lip <= k < k_lip_r)
            kinds.append(isjaw); kinds.append(isjaw)
    tri = np.array(tri, int); kinds = np.array(kinds)
    Pf = P.reshape(-1, 3); Nf = Nn.reshape(-1, 3)
    # winding check: face normal vs vertex normal
    fn = np.cross(Pf[tri[:, 1]] - Pf[tri[:, 0]], Pf[tri[:, 2]] - Pf[tri[:, 0]]); vn = Nf[tri[:, 0]] + Nf[tri[:, 1]] + Nf[tri[:, 2]]
    ok = np.sum(fn * vn, -1); good = np.abs(np.linalg.norm(fn, axis=1)) > 1e-12
    if np.sum(ok[good] < 0) > np.sum(ok[good] > 0): tri = tri[:, [0, 2, 1]]
    keep = np.linalg.norm(np.cross(Pf[tri[:, 1]] - Pf[tri[:, 0]], Pf[tri[:, 2]] - Pf[tri[:, 0]]), axis=1) > 1e-14
    tri = tri[keep]; kinds = kinds[keep]
    Jv, Wv = spine_weights(Pf[:, 0], jx)
    if mouth:       # the ring at the corner of the mouth, below the lip line, belongs to the jaw as well, so that no crack opens when the jaw turns
        rr_, cc_ = np.divmod(np.arange(len(Pf)), N_c + 1); sel = (rr_ == ic1) & (cc_ >= k_lip) & (cc_ <= N_c - k_lip)
        Jv = Jv.copy(); Wv = Wv.copy(); Jv[sel] = 0; Wv[sel] = 0; Jv[sel, 0] = jid['jaw']; Wv[sel, 0] = 1.0
    Jj = np.zeros((len(Pf), 4), int); Jj[:, 0] = jid['jaw']; Wj = np.zeros((len(Pf), 4)); Wj[:, 0] = 1.0
    if lod == 'far': pass
    lay = layout(lod)
    UV = None
    if lay:
        bx, by, bw, bh = lay['body']; Wa, Ha = lay['atlas']
        u = u_of_t(body, TT); v = (TH / TAU)
        UV = np.stack([(bx + u * (bw - 1) + 0.5) / Wa, (by + v * (bh - 1) + 0.5) / Ha], -1).reshape(-1, 2)
    for isj in (False, True):
        m = kinds == isj
        if not m.any(): continue
        T_ = tri[m]; ids = np.unique(T_); remap = -np.ones(len(Pf), int); remap[ids] = np.arange(len(ids))
        jw = (Jj[ids], Wj[ids]) if isj else (Jv[ids], Wv[ids])
        acc.add('Coat', Pf[ids], Nf[ids], remap[T_], jw, uv=(UV[ids] if UV is not None else None))
    body_info = dict(body=body, ts=ts, ic0=ic0, ic1=ic1, k_lip=k_lip, N_c=N_c, S=S, JP=JP, jid=jid, jx=jx, Pgrid=P, Ngrid=Nn)
    return acc, body_info, L, lay


def finish_geometry(species, lod, acc, info, L, lay, variant):
    """flippers, claws, head details, whiskers, eyes: everything that is not the trunk loft"""
    body = info['body']; sp = body.sp; JP = info['JP']; jid = info['jid']; Lb = body.Lb; ts = info['ts']; N_c = info['N_c']; ic0, ic1, k_lip = info['ic0'], info['ic1'], info['k_lip']
    P = info['Pgrid']; Nn = info['Ngrid']
    # ---- inner mouth lining, back wall, tongue, teeth (the gap of the open mouth)
    if L['mouth']:
        cols_up = list(range(0, k_lip + 1)) + list(range(N_c - k_lip, N_c + 1)); cols_lo = list(range(k_lip, N_c - k_lip + 1))
        def lining(colsel, joint, name='Mouth'):
            ii = list(range(ic0, ic1 + 1)); ctr = body.centre(ts[ii])
            Pi = P[np.ix_(ii, colsel)]; Ni = Nn[np.ix_(ii, colsel)]
            Pin = ctr[:, None, :] + (Pi - ctr[:, None, :]) * 0.84
            tr = []; idx = np.arange(len(ii) * len(colsel)).reshape(len(ii), len(colsel))
            for a in range(len(ii) - 1):
                for b in range(len(colsel) - 1):
                    if colsel[b + 1] - colsel[b] != 1: continue
                    p0, p1, p2, p3 = idx[a, b], idx[a + 1, b], idx[a + 1, b + 1], idx[a, b + 1]
                    tr += [(p0, p2, p1), (p0, p3, p2)]
            acc.add(name, Pin.reshape(-1, 3), -Ni.reshape(-1, 3), np.array(tr, int), joint)
            return Pin
        lining(cols_up, jid['head']); Pl = lining(cols_lo, jid['jaw'])
        # back wall: a dark disc at the commissure ring
        ctr = body.centre(np.array([ts[ic1]]))[0]; ring = P[ic1, :] ; ring = ctr + (ring - ctr) * 0.84
        n = len(ring); Pw = np.concatenate([ring, [ctr]]); tw = [(i, i + 1, n) for i in range(n - 1)]
        acc.add('Mouth', Pw, np.tile([1.0, 0, 0], (n + 1, 1)), np.array(tw, int), jid['head'])
        # tongue
        ta = np.linspace(body.t_chin + 0.012, body.t_comm - 0.004, 2); xa = body.centre(ta[:1])[0]; xb = body.centre(ta[1:])[0]
        cc = (xa + xb) / 2.0; zc, hh, aa, cap = body.rings(np.array([(ta[0] + ta[1]) / 2])); cc = cc.copy(); cc[2] = zc[0] - hh[0] * 0.55
        Pt, Nt, Tt = uv_sphere(cc, (abs(xa[0] - xb[0]) * 0.50, aa[0] * 0.38, hh[0] * 0.18), 10 if L['teeth'] else 6, 6 if L['teeth'] else 4)
        acc.add('Tongue', Pt, Nt, Tt, jid['jaw'])
        # lip lines (dark edge of the lips) and teeth
        if L['lipline']:
            for sg, kl in ((1, k_lip), (-1, N_c - k_lip)):
                for side_sel, jn in (('up', 'head'), ('lo', 'jaw')):
                    ii = list(range(ic0 - 1 if ic0 > 0 else 0, ic1 + 1)); thc = TAU * kl / N_c - sg * 0.0; dth = (-1.4e-2 if side_sel == 'up' else 1.4e-2) * (1 if sg > 0 else -1)
                    tt = ts[ii]; off = np.radians(8.0) * sstep(0.45 * body.t_comm, body.t_comm, tt) * sg; thv = thc - off
                    Pa = body.surf(tt, thv, lift=0.0006); Pb = body.surf(tt, thv + dth, lift=0.0010)
                    Na = body.normal(tt, thv); n = len(tt); Pp = np.concatenate([Pa, Pb]); Np = np.concatenate([Na, Na]); tr = []
                    for q in range(n - 1): tr += [(q, q + 1, n + q + 1), (q, n + q + 1, n + q)]
                    tr = np.array(tr, int)
                    if (sg > 0) != (side_sel == 'up'): tr = tr[:, [0, 2, 1]]
                    acc.add('Dark', Pp, Np, tr, jid[jn])
        if L['teeth']:
            r = 0.0034 * (body.sl / 1.0) ** 0.5
            for sg, kl in ((1, k_lip), (-1, N_c - k_lip)):
                for q in np.linspace(body.t_chin + 0.022, body.t_comm - 0.012, 5):
                    thc = TAU * kl / N_c
                    for up in (True, False):
                        p0 = body.surf(np.array([q]), np.array([thc]), lift=-0.0025)[0]; ctr = body.centre(np.array([q]))[0]
                        tip = p0 + np.array([0, 0, -1 if up else 1]) * r * 2.2 + (ctr - p0) * 0.12
                        Pc, Nc, Tc = cone_mesh(p0 + np.array([0, 0, 0.001 if up else -0.001]) * 0, tip, r, 5)
                        acc.add('Tooth', Pc, Nc, Tc, jid['head' if up else 'jaw'])
    # ---- nostrils, ears (dark small marks on the surface)
    def patch(name, joint, t0, th0, rx, ry, rot_deg, lift, nseg=10, shape='ellipse'):
        t0 = np.array([t0]); th0 = np.array([th0]); P0 = body.pt(t0, th0)[0]; N0 = body.normal(t0, th0)[0]
        e = 1e-3; Tt = (body.pt(t0 + e, th0) - body.pt(t0 - e, th0))[0] / (2 * e * 1.0); Tq = (body.pt(t0, th0 + e) - body.pt(t0, th0 - e))[0] / (2 * e)
        J2 = np.stack([Tt, Tq], 1); ang = np.linspace(0, TAU, nseg, endpoint=False); ca, sa = math.cos(math.radians(rot_deg)), math.sin(math.radians(rot_deg))
        pts = [np.zeros(2)]
        for a_ in ang:
            if shape == 'slit': ox, oy = rx * math.cos(a_), ry * math.sin(a_) * (0.55 + 0.45 * math.cos(a_))
            else: ox, oy = rx * math.cos(a_), ry * math.sin(a_)
            pts.append(np.array([ox * ca - oy * sa, ox * sa + oy * ca]))
        pts = np.array(pts)
        # metres on the surface -> (t, theta) offsets via the local frame
        e1 = unit(Tq); e2 = unit(np.cross(N0, e1)); ptsP = []
        for p in pts:
            d = e1 * p[0] + e2 * p[1]; dd, *_ = np.linalg.lstsq(J2, d, rcond=None)
            ptsP.append(body.surf(t0 + dd[0], th0 + dd[1], lift=lift)[0])
        Pp = np.array(ptsP); Np = np.tile(N0, (len(Pp), 1)); tr = [(0, i + 1, (i + 1) % nseg + 1) for i in range(nseg)]
        tr = np.array(tr, int)
        ctr_dir = body.centre(t0)[0] - P0
        fn = np.cross(Pp[tr[0, 1]] - Pp[tr[0, 0]], Pp[tr[0, 2]] - Pp[tr[0, 0]])
        if np.dot(fn, N0) < 0: tr = tr[:, [0, 2, 1]]
        acc.add(name, Pp, Np, tr, jid[joint])
        if name == 'Dark' and t0[0] < 0.05: info.setdefault('nostril_c', []).append(P0.copy())
    kind = sp['kind']
    if L['nostril']:
        tn = 0.011 + 0.006 * body.k
        for sg in (1, -1):
            thn = math.radians(0 + sg * (9 if kind == 'grey' else 6))
            if kind == 'harbour' or kind == 'pup':
                # V shape: the nostrils meet at the bottom: slits tilted
                rot = -sg * 42; thn = math.radians(sg * 8)
            else: rot = -sg * 12
            patch('Dark', 'head', tn, thn % TAU, 0.0042 * body.sl ** 0.5 * 1.35, 0.0105 * body.sl ** 0.5 * 1.6, rot, 0.0006, nseg=8, shape='slit')
    if L['ear']:
        for sg in (1, -1):
            patch('Dark', 'head', body.t_ear, math.radians(84.0 if sg > 0 else 276.0), 0.0045, 0.0045, 0, 0.0004, nseg=8)
    # ---- flippers: plate, claws; fore (left and right), hind (pair)
    Wa = Ha = 1
    if lay: Wa, Ha = lay['atlas']
    for side in (1, -1):
        jn = 'flipper_fl_l' if side > 0 else 'flipper_fl_r'
        Lf = sp['fore']; hw = 0.46 * Lf * 0.5 * 1.0 * 0.62; thick = 0.0155 * (Lf / 0.34) ** 0.5 * 1.35
        Pl, Nl, Tp, Qp, Sg, tris = plate_mesh('fore', Lf, 0.24 * Lf, 0.052 * Lf, *(L['fl']))
        yaw = math.radians(150.0 if side > 0 else -150.0)         # points back and out
        ex = np.array([math.cos(yaw), math.sin(yaw), -0.10]); ez = np.array([0, 0, 1.0]); R = basis(ex, ez)
        # the plate's local y runs ez x ex; mirror so that both are right handed
        Pw = JP[jn] + Pl @ R.T; Nw = Nl @ R.T
        if side < 0: pass
        tr = tris
        fnv = np.cross(Pw[tr[:, 1]] - Pw[tr[:, 0]], Pw[tr[:, 2]] - Pw[tr[:, 0]]); vn = Nw[tr[:, 0]] + Nw[tr[:, 1]] + Nw[tr[:, 2]]
        if np.sum(np.sum(fnv * vn, -1) < 0) > len(tr) / 2: tr = tr[:, [0, 2, 1]]
        uv = None
        if lay:
            fx, fy, fw, fh = lay['fore']
            qq = Qp * (1 if side > 0 else -1)
            uvx = fx + 0.5 + Tp * (fw - 1); half = fh // 2
            uvy = fy + 0.5 + (qq + 1) / 2 * (half - 1) + np.where(Sg > 0, 0, half)
            uv = np.stack([uvx / Wa, uvy / Ha], -1)
        acc.add('Coat', Pw, Nw, tr, jid[jn], uv=uv)
        if L['claws']:
            dig = np.array([-0.8, -0.4, 0.0, 0.4, 0.8])
            for dj, q in enumerate(dig):
                tipl = plate_local('fore', Lf, 0.24 * Lf, 0.052 * Lf, np.array(1.0), np.array(q), 1)
                tipl[2] = 0.0
                cl = sp['claw']; seg = 6 if lod_is(L, 'hero') else 4
                b0 = tipl - np.array([cl * 0.20, 0, 0]); mid = tipl + np.array([cl * 0.45, 0, -cl * 0.12]); tip = tipl + np.array([cl * 0.95, 0, -cl * 0.38])
                rr = 0.0052 * (cl / 0.028) ** 0.7
                parts = [(b0, mid, rr), (mid, tip, rr * 0.55)] if L['claws'] >= 2 else [(b0, tip, rr)]
                for (pa, pb, r_) in parts:
                    Pc, Nc, Tc = cone_mesh(pa @ R.T + JP[jn], pb @ R.T + JP[jn], r_, seg)
                    acc.add('Claw', Pc, Nc, Tc, jid[jn])
    # hind flippers
    Lh = sp['hind']
    for side in (1, -1):
        jn = 'flipper_hind_l' if side > 0 else 'flipper_hind_r'
        Pl, Nl, Tp, Qp, Sg, tris = plate_mesh('hind', Lh, 0.40 * Lh, 0.034 * Lh / 0.31 * 0.9, *(L['hfl']))
        yaw = math.radians(180.0 - side * 9.0)
        ex = np.array([math.cos(yaw), math.sin(yaw), 0.035]); ez = np.array([0, 0, -1.0]); R = basis(ex, ez)       # soles up: the plate is turned over
        Pw = JP[jn] + Pl @ R.T; Nw = Nl @ R.T
        tr = tris; fnv = np.cross(Pw[tr[:, 1]] - Pw[tr[:, 0]], Pw[tr[:, 2]] - Pw[tr[:, 0]]); vn = Nw[tr[:, 0]] + Nw[tr[:, 1]] + Nw[tr[:, 2]]
        if np.sum(np.sum(fnv * vn, -1) < 0) > len(tr) / 2: tr = tr[:, [0, 2, 1]]
        # keep it above the sand
        Pw[:, 2] = np.maximum(Pw[:, 2], 0.004)
        uv = None
        if lay:
            fx, fy, fw, fh = lay['hind']; half = fh // 2; qq = Qp * (1 if side > 0 else -1)
            # the sheet facing up (local z negative after the flip) is the plantar side: it uses the bottom half of the chart
            uvx = fx + 0.5 + Tp * (fw - 1); uvy = fy + 0.5 + (qq + 1) / 2 * (half - 1) + np.where(Sg > 0, half, 0)
            uv = np.stack([uvx / Wa, uvy / Ha], -1)
        acc.add('Coat', Pw, Nw, tr, jid[jn], uv=uv)
    return acc


def lod_is(L, name): return L is LOD[name]


EYE_TARGETS = ['blink', 'sleepy', 'wide', 'content']                      # morph targets of the eye meshes (the lid shell moves)
SEAL_TARGETS = ['brow_raise', 'pad_puff', 'calling', 'content', 'nostril_flare']   # morph targets of the head mesh (the skinned mesh)
WHISKER_TARGETS = ['whiskers_forward', 'whiskers_back']
LID_PSI = {'rest': 46.0, 'blink': 152.0, 'sleepy': 108.0, 'wide': 20.0, 'content': 68.0}      # degrees of the lid cap measured from the top of the eye
EXPRESSIONS = {   # morph target weights by name (every mesh takes the names it has and ignores the others)
    'neutral': {}, 'blink': {'blink': 1.0}, 'sleepy': {'sleepy': 1.0}, 'curious': {'wide': 0.45, 'brow_raise': 1.0, 'pad_puff': 1.0, 'whiskers_forward': 1.0},
    'startled': {'wide': 1.0, 'nostril_flare': 1.0, 'whiskers_back': 1.0, 'brow_raise': 0.6}, 'calling': {'calling': 1.0, 'sleepy': 0.45, 'nostril_flare': 0.35, 'whiskers_forward': 0.5},
    'content': {'content': 1.0, 'sleepy': 0.4, 'pad_puff': 0.4}, 'nostril_flare': {'nostril_flare': 1.0}}


def lid_cap(radii, psi_deg, nu, nv):
    """a thin shell over the top of the eye: u runs from the crown (0) to the rim (1); the rim angle psi decides how far the lid has come down"""
    ph = np.linspace(0, TAU, nu + 1); uu = np.linspace(0, 1, nv + 1); U, PH = np.meshgrid(uu, ph, indexing='ij'); psi = np.radians(psi_deg) * U
    d = np.stack([np.sin(psi) * np.cos(PH), np.sin(psi) * np.sin(PH), np.cos(psi)], -1).reshape(-1, 3)
    return d * np.asarray(radii)

def lid_mesh(radii, nu, nv):
    P0 = lid_cap(radii, LID_PSI['rest'], nu, nv); d = unit(P0 / np.asarray(radii)); N = d
    idx = np.arange((nu + 1) * (nv + 1)).reshape(nv + 1, nu + 1); tr = []
    for i in range(nv):
        for j in range(nu):
            a, b, c, e = idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]
            tr += [(a, b, c), (a, c, e)] if i > 0 else [(a, b, c)]
    tr = np.array(tr, int); fn = np.cross(P0[tr[:, 1]] - P0[tr[:, 0]], P0[tr[:, 2]] - P0[tr[:, 0]]); vn = N[tr[:, 0]] + N[tr[:, 1]] + N[tr[:, 2]]
    ok = np.sum(fn * vn, -1); good = np.linalg.norm(fn, axis=1) > 1e-14
    if np.sum(ok[good] < 0) > np.sum(ok[good] > 0): tr = tr[:, [0, 2, 1]]
    tr = tr[np.linalg.norm(np.cross(P0[tr[:, 1]] - P0[tr[:, 0]], P0[tr[:, 2]] - P0[tr[:, 0]]), axis=1) > 1e-14]
    morph = {k: lid_cap(radii, LID_PSI[k], nu, nv) - P0 for k in EYE_TARGETS}
    return P0, N, tr, morph


def eyes_and_whiskers(species, lod, info, L):
    """separate small meshes in their own nodes (relative to the node pivot): returns dict node -> list of (material, P, N, T, extra); extra holds vertex colours and morph deltas"""
    body = info['body']; sp = body.sp; JP = info['JP']; out = {}
    r = sp['eye_r']; hero = lod == 'hero'
    if L['eye'][0] > 0:
        for sg, jn in ((1, 'eye_l'), (-1, 'eye_r')):
            radii = (r * 0.84, r * 1.0, r * 1.0)
            Pe, Ne, Te = uv_sphere((0, 0, 0), radii, *L['eye'])
            dd = unit(Pe / np.asarray(radii)); ang = np.degrees(np.arccos(np.clip(dd[:, 0], -1, 1)))
            pup = 1 - sstep(16.0, 24.0, ang); iris = sstep(16.0, 24.0, ang) * (1 - sstep(44.0, 62.0, ang))
            C = np.array([0.004, 0.003, 0.002]) * pup[:, None] + np.array([0.040, 0.020, 0.010]) * iris[:, None] * (0.7 + 0.5 * sstep(44.0, 24.0, ang))[:, None] + np.array([0.016, 0.011, 0.008]) * (1 - pup - iris)[:, None]
            Ph, Nh, Th = uv_sphere(np.array([0.74, 0.30, 0.50]) / np.linalg.norm([0.74, 0.30, 0.50]) * r * 0.93, (r * 0.13, r * 0.20, r * 0.16), 10 if hero else 6, 6 if hero else 4)
            out[jn] = [('Eye', Pe, Ne, Te, dict(C=C)), ('Highlight', Ph, Nh, Th, {})]
            # skin collar around the eye (the lid fold below and behind)
            nu, nv = (20, 6) if hero else (10, 4)
            u = np.linspace(0, TAU, nu + 1); v = np.linspace(0, math.pi, nv + 1); U, V = np.meshgrid(u, v, indexing='ij')
            R0 = r * 1.20; rr = r * 0.34; px = np.cos(V) * rr * 0.60 - r * 0.30
            Pq = np.stack([np.zeros_like(U) + px, (R0 + np.sin(V) * rr) * np.cos(U), (R0 + np.sin(V) * rr) * np.sin(U) * 1.0], -1).reshape(-1, 3)
            Nq = unit(np.stack([np.cos(V) * 0.55, np.sin(V) * np.cos(U), np.sin(V) * np.sin(U)], -1).reshape(-1, 3))
            idx = np.arange((nu + 1) * (nv + 1)).reshape(nu + 1, nv + 1); tr = []
            for i in range(nu):
                for j in range(nv):
                    a, b, c, d = idx[i, j], idx[i + 1, j], idx[i + 1, j + 1], idx[i, j + 1]; tr += [(a, d, b), (b, d, c)]
            out[jn].append(('Lid', Pq, Nq, np.array(tr, int), {}))
            Pl, Nl, Tl, mo = lid_mesh((r * 0.97, r * 1.10, r * 1.10), 16 if hero else 10, 5 if hero else 3)
            out[jn].append(('Lid', Pl, Nl, Tl, dict(morph=mo)))
    return out


def whisker_morph(P):
    """deltas that fan the strand forward (curious) or sweep it back (startled): a turn about the root of the strand (left side; the right side is mirrored)"""
    n = len(P) // 2; root = (P[0] + P[n]) / 2.0; out = {}
    for name, deg in (('whiskers_forward', -15.0), ('whiskers_back', 58.0)):
        a = math.radians(deg); c, s_ = math.cos(a), math.sin(a); R = np.array([[c, -s_, 0], [s_, c, 0], [0, 0, 1.0]]); out[name] = (P - root) @ R.T + root - P
    return out


def whisker_strands(species, lod, info, L):
    """vibrissae of one side as ribbons, relative to the whisker node pivot (left side; the right is mirrored). Curved forward and a little down, wavy."""
    body = info['body']; sp = body.sp; JP = info['JP']
    if not L['whisk']: return []
    pivot = JP['whisker_l']; nrows, ncols = sp['whisk']; wl = sp['whisk_len']; rng = np.random.default_rng(31 + SPECIES.index(species))
    strands = []; seg = L['whisk_seg']
    t0 = body.t_pad
    nrow = nrows if lod == 'hero' else max(3, nrows - 2); ncol = ncols if lod == 'hero' else max(3, ncols - 2)
    for r_ in range(nrow):
        for c_ in range(ncol):
            tt = t0 + (c_ - (ncol - 1) / 2) * 0.0062 + 0.0034 * (r_ % 2); thh = math.radians(96.0 + 14.0 * (r_ / max(nrow - 1, 1)) - 3.0 * (r_ % 2))
            p0 = body.surf(np.array([tt]), np.array([thh]), lift=0.0)[0]; n0 = body.normal(np.array([tt]), np.array([thh]))[0]
            frac = 1.0 - 0.45 * abs(c_ - (ncol - 1) / 2) / (ncol / 2.0) - 0.20 * (r_ / max(nrow - 1, 1))
            ln = wl * frac * (0.8 + 0.4 * rng.random())
            fan = (c_ - (ncol - 1) / 2) / max(ncol - 1, 1) * 2.0; rowf = r_ / max(nrow - 1, 1)
            d0 = unit(n0 * 0.45 + np.array([1.0, 0, 0]) * (1.90 + 0.40 * (c_ / max(ncol - 1, 1))) + np.array([0, 0.42 * fan, 0.0]) + np.array([0, 0, 0.16 - 0.30 * rowf]))
            pts = [p0]; d = d0.copy()
            for s_ in range(seg):
                step = ln / seg
                d = unit(d + np.array([0.10, 0, -0.45]) * (1.0 / seg) + np.array([0, 0.06 * math.sin(2.4 * s_ + c_), 0]) * (1.0 / seg))
                pts.append(pts[-1] + d * step)
            P, N, T = tube_ribbon(np.array(pts), (0.0040 if lod == 'hero' else 0.0055) * (wl / 0.12) ** 0.6, 0.0008 * (wl / 0.12) ** 0.6, np.array([0, 0, 1.0]))
            strands.append((P - pivot, N, T, whisker_morph(P - pivot)))
    if L['brow']:
        for q in range(4):
            tt = body.t_eye - 0.012 + 0.008 * q; thh = math.radians(52.0 - 3 * q)
            p0 = body.surf(np.array([tt]), np.array([thh]), lift=0.0)[0]; n0 = body.normal(np.array([tt]), np.array([thh]))[0]
            d = unit(n0 * 0.8 + np.array([0.9, 0.2, 0.2])); pts = [p0]
            for s_ in range(3):
                d = unit(d + np.array([0.1, 0.0, -0.25])); pts.append(pts[-1] + d * 0.012)
            P, N, T = tube_ribbon(np.array(pts), 0.0036 * (wl / 0.12) ** 0.6, 0.0008, np.array([0, 0, 1.0])); strands.append((P - pivot, N, T, whisker_morph(P - pivot)))
    return strands


# ------------------------------------------------------------------------------------------------- poses and clips
def Q(yaw=0.0, pitch=0.0, roll=0.0):
    """rotation in the builder frame: yaw about z (positive turns left), pitch about y (positive = the front goes UP, the nose lifts), roll about x (positive = the left side goes up)"""
    return CM.rot_seq([('z', yaw), ('y', -pitch), ('x', roll)])

def ease(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)
def ramp(t, a, b): return ease((t - a) / (b - a))
def pulse(t, a, b, c, d): return ramp(t, a, b) * (1 - ramp(t, c, d))

def J(yaw=0.0, pitch=0.0, roll=0.0, t=None, s=None, w=None): return dict(r=(yaw, pitch, roll), t=t, s=s, w=w)

def clip_rest(t, T=5.0):
    w = math.sin(TAU * t / T); w2 = math.sin(TAU * t / T - 0.5)
    blink = pulse(t, 2.1, 2.22, 2.28, 2.42) + pulse(t, 3.9, 4.0, 4.04, 4.16)
    return {'chest': J(pitch=0.7 * w, s=(1 + 0.012 * w2, 1 + 0.016 * w2, 1 + 0.030 * w2)), 'body': J(s=(1, 1 + 0.008 * w2, 1 + 0.014 * w2)), 'hips': J(pitch=-0.4 * w2),
            'head': J(pitch=1.4 * w2 - 0.6, yaw=1.5 * math.sin(TAU * t / T + 1.0)), 'jaw': J(pitch=0.6 + 0.3 * w), 'tail': J(yaw=2.5 * math.sin(TAU * t / T * 2)),
            'eye_l': J(s=(1, 1, 1 - 0.85 * blink)), 'eye_r': J(s=(1, 1, 1 - 0.85 * blink)), 'whisker_l': J(pitch=-1.0 * w2, yaw=1.0 * w), 'whisker_r': J(pitch=-1.0 * w2, yaw=-1.0 * w),
            'flipper_fl_l': J(yaw=1.0 * w2), 'flipper_fl_r': J(yaw=-1.0 * w2)}

def clip_alert(t, T=6.0):
    up = pulse(t, 0.0, 1.0, 4.5, 5.8); lk = pulse(t, 1.0, 1.7, 2.0, 2.7) * 1 - pulse(t, 2.7, 3.4, 3.6, 4.3)
    sc = math.sin(TAU * t / 0.9) * pulse(t, 3.9, 4.0, 4.5, 4.7)
    return {'neck': J(pitch=26 * up, yaw=14 * lk), 'chest': J(pitch=9 * up), 'head': J(pitch=-6 * up, yaw=30 * lk), 'jaw': J(pitch=0.0),
            'body': J(pitch=-1.5 * up), 'whisker_l': J(yaw=9 * up + 3 * sc, pitch=-3 * up), 'whisker_r': J(yaw=-9 * up - 3 * sc, pitch=-3 * up),
            'flipper_fl_l': J(yaw=-5 * up), 'flipper_fl_r': J(yaw=5 * up), 'eye_l': J(s=(1, 1, 1 + 0.0 * up)), 'eye_r': J(s=(1, 1, 1))}

def clip_scratch(t, T=4.2):
    a = pulse(t, 0.0, 0.9, 3.2, 4.0); st = math.sin(TAU * t / 0.42) * pulse(t, 1.0, 1.2, 2.8, 3.1)
    return {'chest': J(roll=-14 * a, yaw=-5 * a), 'body': J(roll=-9 * a), 'neck': J(yaw=24 * a, pitch=-6 * a), 'head': J(yaw=12 * a, pitch=-12 * a),
            'flipper_fl_l': J(yaw=-62 * a + 9 * st, roll=48 * a, pitch=-14 * a + 6 * st), 'flipper_fl_r': J(yaw=4 * a), 'hips': J(roll=-4 * a),
            'whisker_l': J(yaw=-5 * a), 'whisker_r': J(yaw=5 * a), 'eye_l': J(s=(1, 1, 1 - 0.55 * a * pulse(t, 1.0, 1.3, 2.9, 3.2))), 'eye_r': J(s=(1, 1, 1 - 0.55 * a * pulse(t, 1.0, 1.3, 2.9, 3.2)))}

HUMP_STRIDE = 0.30
def clip_hump(t, T=2.8):
    f = t / T; A = ramp(f, 0.02, 0.50); B = ramp(f, 0.52, 0.98); stride = HUMP_STRIDE
    xr = stride * f; xc = stride * A; xh = stride * B
    ch_rel = xc - xr; hp_rel = xh - xr; mid_rel = 0.5 * (ch_rel + hp_rel)
    arch = pulse(f, 0.50, 0.70, 0.84, 1.0); lift = pulse(f, 0.0, 0.2, 0.36, 0.52)
    fl = math.sin(TAU * f)
    return {'root': J(t=(xr, 0, 0)), 'body': J(t=(mid_rel, 0, 0.055 * arch), pitch=0), 'chest': J(t=(ch_rel - mid_rel, 0, 0.035 * lift), pitch=10 * lift - 5 * arch),
            'hips': J(t=(hp_rel - mid_rel, 0, 0.0), pitch=-7 * arch + 2 * lift), 'neck': J(pitch=14 * lift - 6 * arch), 'head': J(pitch=-6 * lift + 2 * arch), 'tail': J(pitch=-6 * arch),
            'flipper_fl_l': J(yaw=-22 * pulse(f, 0.0, 0.1, 0.4, 0.5) + 8, roll=10 * lift), 'flipper_fl_r': J(yaw=22 * pulse(f, 0.0, 0.1, 0.4, 0.5) - 8, roll=-10 * lift),
            'flipper_hind': J(yaw=4 * math.sin(TAU * f * 2)), 'whisker_l': J(yaw=3 * lift), 'whisker_r': J(yaw=-3 * lift)}

def clip_slide(t, T=3.8):
    f = t / T; h1 = clip_hump(t * 0.60 / 0.60, 2.8) if False else None
    A = ramp(t, 0.1, 0.8); B = ramp(t, 0.7, 1.4); xr = 0.30 * (A + B) * 0.9; ch = 0.3 * A - xr * 0.5
    slide = ramp(t, 1.5, 3.2); dive = ramp(t, 2.3, 3.7)
    rx = 0.45 + 1.15 * slide + 0.35 * dive; rz = -0.38 * slide - 0.30 * dive
    arch = pulse(t, 0.6, 0.9, 1.2, 1.6); lift = pulse(t, 0.0, 0.3, 0.6, 1.0)
    return {'root': J(t=(0.45 * ramp(t, 0.0, 1.5) + 1.15 * slide + 0.35 * dive, 0, rz), pitch=-(19 * slide + 22 * dive)),
            'body': J(t=(0, 0, 0.05 * arch), pitch=-2 * slide), 'chest': J(pitch=9 * lift - 6 * slide, t=(0.06 * lift, 0, 0)), 'neck': J(pitch=12 * lift - 4 * slide), 'head': J(pitch=-5 * lift + 3 * slide, yaw=0),
            'hips': J(pitch=-5 * arch + 4 * slide), 'tail': J(pitch=-14 * dive, yaw=10 * math.sin(TAU * t / 0.9) * dive),
            'flipper_fl_l': J(yaw=-18 * lift + 40 * slide, roll=-14 * slide), 'flipper_fl_r': J(yaw=18 * lift - 40 * slide, roll=14 * slide),
            'flipper_hind': J(yaw=20 * math.sin(TAU * t / 0.8) * dive, pitch=12 * dive), 'whisker_l': J(yaw=-14 * slide), 'whisker_r': J(yaw=14 * slide),
            'eye_l': J(s=(1, 1, 1 - 0.6 * dive)), 'eye_r': J(s=(1, 1, 1 - 0.6 * dive))}

def clip_swim(t, T=1.6):
    w = TAU * t / T
    return {'root': J(t=(0, 0, 0.012 * math.sin(w + 0.4))), 'chest': J(yaw=-7 * math.sin(w - 0.2), roll=3 * math.sin(w - 0.4)), 'body': J(yaw=-5 * math.sin(w - 0.9), roll=2 * math.sin(w - 1.1)),
            'hips': J(yaw=-9 * math.sin(w - 1.8), pitch=2.5 * math.sin(w - 1.2)), 'tail': J(yaw=-14 * math.sin(w - 2.6)),
            'head': J(yaw=6 * math.sin(w - 0.5)), 'neck': J(yaw=4 * math.sin(w - 0.3), pitch=-4), 'flipper_hind': J(yaw=26 * math.sin(w - 3.0), pitch=4 * math.sin(w - 1.0)),
            'flipper_hind_l': J(yaw=-10), 'flipper_hind_r': J(yaw=10),
            'flipper_fl_l': J(yaw=-48 + 4 * math.sin(w), roll=-12), 'flipper_fl_r': J(yaw=48 - 4 * math.sin(w), roll=12), 'whisker_l': J(yaw=-16, pitch=-4), 'whisker_r': J(yaw=16, pitch=-4)}

def clip_surface(t, T=5.0):
    up = pulse(t, 0.0, 1.0, 3.8, 4.8); lk = math.sin(TAU * (t - 1.0) / 3.0) * pulse(t, 1.0, 1.5, 3.3, 3.8); dr = math.sin(TAU * t / 0.35) * pulse(t, 1.2, 1.3, 2.2, 2.6)
    return {'root': J(t=(0, 0, 0.08 * up), pitch=30 * up), 'chest': J(pitch=-4 * up), 'neck': J(pitch=6 * up, yaw=10 * lk), 'head': J(pitch=-12 * up, yaw=34 * lk, roll=3 * dr),
            'hips': J(pitch=4 * up), 'flipper_hind': J(yaw=18 * math.sin(TAU * t / 0.9) * up, pitch=6 * up), 'flipper_fl_l': J(yaw=-40 * up + 6 * math.sin(TAU * t / 1.1) * up, roll=-10 * up),
            'flipper_fl_r': J(yaw=40 * up - 6 * math.sin(TAU * t / 1.1) * up, roll=10 * up), 'whisker_l': J(pitch=-16 * up + 3 * dr, yaw=-6 * up), 'whisker_r': J(pitch=-16 * up + 3 * dr, yaw=6 * up)}

def clip_cry(t, T=3.0):
    up = pulse(t, 0.0, 0.5, 2.5, 3.0); op = pulse(t, 0.45, 0.7, 0.95, 1.15) + pulse(t, 1.2, 1.4, 1.65, 1.85) + pulse(t, 1.9, 2.1, 2.35, 2.55)
    wv = math.sin(TAU * (t - 0.6) / 0.7) * pulse(t, 0.6, 0.9, 2.2, 2.6)
    return {'neck': J(pitch=24 * up), 'chest': J(pitch=7 * up), 'head': J(pitch=10 * up + 5 * op), 'jaw': J(pitch=26 * min(op, 1.0)),
            'flipper_fl_l': J(yaw=-30 * up + 18 * wv, roll=42 * up + 14 * wv, pitch=-10 * up), 'flipper_fl_r': J(yaw=6 * up), 'whisker_l': J(yaw=10 * up), 'whisker_r': J(yaw=-10 * up),
            'eye_l': J(s=(1, 1, 1 - 0.45 * min(op, 1.0))), 'eye_r': J(s=(1, 1, 1 - 0.45 * min(op, 1.0))), 'body': J(s=(1, 1 + 0.01 * op, 1 + 0.02 * op)), 'tail': J(yaw=3 * wv)}

def clip_yawn(t, T=3.4):
    op = pulse(t, 0.3, 1.2, 2.0, 2.9); hd = pulse(t, 0.1, 1.0, 2.2, 3.2); sq = pulse(t, 0.5, 1.0, 2.1, 2.7)
    return {'head': J(pitch=18 * hd, roll=-3 * hd), 'neck': J(pitch=6 * hd), 'jaw': J(pitch=40 * op), 'chest': J(pitch=3 * hd, s=(1, 1 + 0.01 * op, 1 + 0.025 * op)),
            'eye_l': J(s=(1, 1, 1 - 0.88 * sq)), 'eye_r': J(s=(1, 1, 1 - 0.88 * sq)), 'whisker_l': J(yaw=8 * op, pitch=2 * op), 'whisker_r': J(yaw=-8 * op, pitch=2 * op),
            'flipper_fl_l': J(yaw=-10 * op, roll=8 * op), 'flipper_fl_r': J(yaw=10 * op, roll=-8 * op)}

def gaze(t_world, eye_jn, rest_dir, JPv):
    """yaw and pitch (degrees) that turn an eye from its rest direction towards a target, limited to 18 degrees"""
    v = np.asarray(t_world, float) - JPv[eye_jn]; yaw = math.degrees(math.atan2(v[1], v[0])) - math.degrees(math.atan2(rest_dir[1], rest_dir[0]))
    pit = math.degrees(math.atan2(v[2], math.hypot(v[0], v[1]))) - math.degrees(math.atan2(rest_dir[2], math.hypot(rest_dir[0], rest_dir[1])))
    yaw = (yaw + 180.0) % 360.0 - 180.0
    return max(-18.0, min(18.0, 0.5 * yaw)), max(-14.0, min(14.0, pit))

_GAZE = {}
def clip_look(t, T=6.0):
    pts = [(1.0, 0.0, 0.45), (0.9, 0.85, 0.40), (0.95, 0.85, 0.40), (1.0, -0.9, 0.85), (1.05, -0.9, 0.85), (0.9, 0.1, 0.05), (1.0, 0.0, 0.45)]
    tm = [0.0, 0.9, 1.7, 2.6, 3.5, 4.5, 6.0]
    k = max(i for i in range(len(tm) - 1) if t >= tm[i] - 1e-9); u = ease((t - tm[k]) / (tm[k + 1] - tm[k])); a = np.array(pts[k]); b = np.array(pts[k + 1]); rel = a + (b - a) * u
    base = _GAZE['base']; JPv = _GAZE['JP']; tw = base + rel * np.array([1.0, 1.0, 1.0]) - np.array([1.0, 0, 0.45]) * 0 - np.array([1.0, 0.0, 0.0]) * 0
    tw = np.array([base[0] - 1.1 + rel[0], rel[1], rel[2]])
    gl = gaze(tw, 'eye_l', _GAZE['dl'], JPv); gr = gaze(tw, 'eye_r', _GAZE['dr'], JPv)
    return {'eye_target': J(t=tuple(tw - base)), 'eye_l': J(yaw=gl[0], pitch=gl[1]), 'eye_r': J(yaw=gr[0], pitch=gr[1]), 'head': J(yaw=0.45 * math.degrees(math.atan2(rel[1], rel[0])), pitch=0.4 * math.degrees(math.atan2(rel[2] - 0.35, rel[0]))),
            'neck': J(yaw=0.2 * math.degrees(math.atan2(rel[1], rel[0]))), 'whisker_l': J(yaw=2.0 * math.sin(TAU * t / 1.5)), 'whisker_r': J(yaw=-2.0 * math.sin(TAU * t / 1.5))}

def clip_blink(t, T=4.2):
    b = pulse(t, 0.95, 1.03, 1.10, 1.22) + pulse(t, 2.60, 2.68, 2.75, 2.88) + 0.9 * pulse(t, 2.95, 3.01, 3.04, 3.12)
    b = min(b, 1.0); return {'eye_l': J(w=[b, 0, 0, 0]), 'eye_r': J(w=[b, 0, 0, 0])}

def clip_tilt(t, T=3.6):
    up = pulse(t, 0.0, 0.8, 2.5, 3.5); cu = pulse(t, 0.2, 0.9, 2.5, 3.4)
    return {'head': J(roll=16 * up, yaw=7 * up, pitch=3 * up), 'neck': J(pitch=9 * up, roll=3 * up), 'chest': J(pitch=3 * up),
            'seal_skin': J(w=[1.0 * cu, 1.0 * cu, 0, 0, 0.25 * cu]), 'eye_l': J(w=[0, 0, 0.5 * cu, 0]), 'eye_r': J(w=[0, 0, 0.5 * cu, 0]), 'whisker_l': J(w=[cu, 0]), 'whisker_r': J(w=[cu, 0])}

CLIPS = {   # name: (function, duration, loop, step in seconds, note)
    'rest': (clip_rest, 5.0, True, 0.5, 'resting: breathing (the chest and body swell and fall, period 5 s), a slow double blink, a small head drift'),
    'alert': (clip_alert, 6.0, True, 0.3, 'head up and looking around: the neck lifts, the head turns left then right, whiskers go forward and twitch, then it settles back (ends where it starts)'),
    'scratch': (clip_scratch, 4.2, False, 0.2, 'rolls a little to the right and rakes the left foreflipper across the flank and belly in four quick strokes, eyes half shut'),
    'hump_crawl': (clip_hump, 2.8, True, 0.2, 'the way real seals move on land: the chest reaches forward and the foreflippers pull, then the hips arch up and are drawn forward (caterpillar); the root travels 0.30 m a cycle'),
    'slide_in': (clip_slide, 3.8, False, 0.2, 'two humps to the water edge, then the belly slide: root travels about 1.95 m forward, sinks 0.68 m and tips nose down 41 degrees; flippers fold back, the hind flippers beat last'),
    'swim': (clip_swim, 1.6, True, 0.2, 'undulating glide: a travelling side to side wave down the trunk with the hind flippers sculling (period 1.6 s), foreflippers tucked back'),
    'surface_look': (clip_surface, 5.0, True, 0.25, 'head up out of the water (spy hop): the front rises, the head looks round, whiskers droop and shake as the water runs off'),
    'pup_cry': (clip_cry, 3.0, True, 0.15, 'pup raises its head, opens its mouth three times, one foreflipper waves'),
    'look_around': (clip_look, 6.0, True, 0.25, 'the eyes follow a marker (node eye_target) that wanders left, up right and low and back; the head follows a part of the way; eye turns are limited to 18 degrees'),
    'blink_loop': (clip_blink, 4.2, True, 0.1, 'idle layer: two slow blinks and a flick, played on the blink morph target of eye_l and eye_r (weights channels); play it over any other clip'),
    'curious_tilt': (clip_tilt, 3.6, True, 0.2, 'head tilt of 16 degrees with the neck lifting, brow raised, whisker pad puffed, whiskers fanned forward, eyes a little wider (morph weights); ends at rest'),
    'yawn': (clip_yawn, 3.4, False, 0.2, 'one-shot yawn: head tips back, the jaw opens 40 degrees and holds, eyes squeeze shut, then closes'),
}
ROOT_MOTION = {'hump_crawl': 'translation of root: 0.30 m forward each cycle (strip the channel to move the animal yourself)', 'slide_in': 'translation of root: 1.95 m forward and 0.68 m down; pitch nose down 41 degrees; the page puts the waterline where it likes',
               'swim': 'root bobs 12 mm; the page moves the animal', 'surface_look': 'root rises 80 mm and pitches 30 degrees nose up'}

POSES = {   # static joint rotations (yaw, pitch, roll) for the pose set
    'rest': {},
    'alert': {'neck': (0, 26, 0), 'chest': (0, 9, 0), 'head': (0, -6, 0)},
    'alert_left': {'neck': (14, 26, 0), 'chest': (0, 9, 0), 'head': (30, -6, 0)},
    'banana': {'neck': (-8, 22, 0), 'chest': (0, 7, 0), 'head': (-10, -6, 0), 'hips': (14, -12, 0), 'tail': (10, -16, 0), 'flipper_hind': (0, 12, 0)},
    'flat_asleep': {'neck': (6, -8, 0), 'head': (22, -6, 8), 'chest': (0, -2, 0)},
    'swim': {'chest': (-4, 0, 0), 'body': (-2, 0, 0), 'hips': (-5, 0, 0), 'tail': (-8, 0, 0), 'neck': (0, -4, 0), 'flipper_fl_l': (-48, 0, -12), 'flipper_fl_r': (48, 0, 12), 'flipper_hind': (14, 0, 0), 'flipper_hind_l': (-10, 0, 0), 'flipper_hind_r': (10, 0, 0)},
    'spy_hop': {'root': (0, 30, 0), 'neck': (0, 6, 0), 'head': (0, -12, 0), 'chest': (0, -4, 0), 'flipper_fl_l': (-40, 0, -10), 'flipper_fl_r': (40, 0, 10)},
    'yawn': {'head': (0, 18, 0), 'neck': (0, 6, 0), 'jaw': (0, 40, 0)},
}


def sample_clip(name, JP, coarse=False):
    """keyframes: {(joint, path): (times, values)}; pruned to channels that move. values: quaternions (builder xyzw, continuous), translations (absolute local, builder frame) or scales"""
    _GAZE.update(base=JP['eye_target'], JP=JP, dl=unit([0.5, 0.85, 0.3]), dr=unit([0.5, -0.85, 0.3]))
    fn, T, loop, step, note = CLIPS[name]; step = step * (2.0 if coarse else 1.0); n = max(2, int(round(T / step))); times = [float(x) for x in np.linspace(0.0, T, n + 1)]
    if loop: pass
    data = {}
    for t in times:
        d = fn(t)
        for jn, v in d.items():
            ch = data.setdefault(jn, dict(r=[], t=[], s=[], w=[]))
            ch['r'].append(Q(*v['r'])); ch['t'].append(v['t']); ch['s'].append(v['s']); ch['w'].append(v.get('w'))
        for jn in data:
            if jn not in d:
                data[jn]['r'].append(Q()); data[jn]['t'].append(None); data[jn]['s'].append(None); data[jn]['w'].append(None)
    out = {}
    parent_pos = lambda jn: (JP[jn] - (JP[PARENT[jn]] if PARENT[jn] else np.zeros(3)))
    for jn, ch in data.items():
        rs = ch['r']; fixed = []
        for i in range(len(rs)):
            q = rs[i]
            if fixed and sum(a * b for a, b in zip(q, fixed[-1])) < 0: q = tuple(-c for c in q)
            fixed.append(q)
        if max(abs(sum(a * b for a, b in zip(q, (0, 0, 0, 1))) - 1) for q in fixed) > 1e-5 or any(abs(c) > 1e-5 for q in fixed for c in q[:3]) and max(max(abs(c) for c in q[:3]) for q in fixed) > 1e-5:
            out[(jn, 'rotation')] = (times, fixed)
        ts_ = ch['t']
        if any(v is not None for v in ts_):
            base = parent_pos(jn); vals = [tuple(base + np.array(v if v is not None else (0, 0, 0))) for v in ts_]
            if max(np.linalg.norm(np.array(v) - base) for v in vals) > 1e-6: out[(jn, 'translation')] = (times, vals)
        ss_ = ch['s']
        if any(v is not None for v in ss_):
            vals = [tuple(v if v is not None else (1, 1, 1)) for v in ss_]
            if max(max(abs(c - 1) for c in v) for v in vals) > 1e-6: out[(jn, 'scale')] = (times, vals)
        ws_ = ch['w']
        if any(v is not None for v in ws_):
            k = len(next(v for v in ws_ if v is not None)); vals = [tuple(v) if v is not None else (0.0,) * k for v in ws_]
            if max(max(abs(c) for c in v) for v in vals) > 1e-6: out[(jn, 'weights')] = (times, vals)
    return out, T, loop, note


# ------------------------------------------------------------------------------------------------- materials
def lin(r, g, b): return [((c / 255.0 + 0.055) / 1.055) ** 2.4 if c / 255.0 > 0.04045 else c / 255.0 / 12.92 for c in (r, g, b)]
SOLID = {   # name: (linear base colour, roughness, metallic, doubleSided)
    'Mouth': (lin(104, 38, 46), 0.38, 0.0, True), 'Tongue': (lin(176, 84, 92), 0.30, 0.0, False), 'Tooth': (lin(196, 188, 164), 0.40, 0.0, False), 'Claw': (lin(46, 38, 32), 0.45, 0.0, False),
    'Dark': (lin(14, 12, 11), 0.55, 0.0, False), 'Eye': ([1.0, 1.0, 1.0], 0.16, 0.0, False), 'Lid': (lin(30, 26, 24), 0.75, 0.0, False), 'Whisker': (lin(226, 218, 196), 0.55, 0.0, True), 'Highlight': (lin(255, 255, 255), 0.05, 0.0, False),
}
LID_COL = {'grey': lin(44, 40, 36), 'pup': lin(104, 96, 88), 'harbour': lin(62, 55, 47)}
WET = dict(base=[0.66, 0.66, 0.66, 1.0], rough=0.50, clearcoat=0.10, clearcoat_rough=0.30)
DRY = dict(base=[1.0, 1.0, 1.0, 1.0], rough=1.0)


# ------------------------------------------------------------------------------------------------- build one animal (geometry + textures) and write the GLB
VARIANT_NAMES = {0: 'standard', 1: 'pale', 2: 'dark', 3: 'warm', 4: 'blotched', 5: 'scarred and sandy'}

def eye_axes(body, info):
    te = body.t_eye; the = math.radians(76.0); n0 = body.normal(np.array([te]), np.array([the]))[0]
    d = unit(n0 + np.array([0.45, 0, 0.0])); return d

def build(species, lod, variant=0, wet=False, seed=SEED, pose='rest', textures=True):
    acc, info, L, lay = build_geometry(species, lod, variant, wet, seed)
    finish_geometry(species, lod, acc, info, L, lay, variant)
    body = info['body']; sp = body.sp; JP = info['JP']
    eyes = eyes_and_whiskers(species, lod, info, L); strands = whisker_strands(species, lod, info, L)
    # orient the eyes: the collar ring lies on the surface, facing out and a little forward
    d = eye_axes(body, info); R = basis(d, np.array([0, 0, 1.0]))
    for jn, items in eyes.items():
        sg = 1 if jn == 'eye_l' else -1; Mi = np.array([1, sg, 1.0]); new = []
        for (mat, P, N, T, ex) in items:
            ex = dict(ex)
            if 'morph' in ex: ex['morph'] = {k: (v @ R.T) * Mi for k, v in ex['morph'].items()}
            new.append((mat, (P @ R.T) * Mi, (N @ R.T) * Mi, T if sg > 0 else T[:, [0, 2, 1]], ex))
        eyes[jn] = new
    tex = None
    if lay is not None and textures:
        import seal_tex as ST
        tex = ST.bake(body, species, variant, lod, lay, seed)
        if not LOD[lod]['tex'].get('embed', True):
            # far level: vertex colours sampled from the (not embedded) baked colour map
            Wa, Ha = lay['atlas']; img = tex['color']
            e = acc.d['Coat']; 
            for i, uv in enumerate(e['UV']):
                px = np.clip((uv[:, 0] * Wa - 0.5), 0, Wa - 1.001); py = np.clip((uv[:, 1] * Ha - 0.5), 0, Ha - 1.001); x0 = px.astype(int); y0 = py.astype(int); fx = (px - x0)[:, None]; fy = (py - y0)[:, None]
                c = img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
                e['C'][i] = c
    return dict(species=species, lod=lod, variant=variant, wet=wet, seed=seed, pose=pose, acc=acc, info=info, L=L, lay=lay, eyes=eyes, strands=strands, tex=tex)


def weld(P, N, uv, C, J_, W_, T):
    q = [np.round(P / 1e-5).astype(np.int64), np.round(N * 200).astype(np.int64), np.round(uv * 8000).astype(np.int64), np.round(C * 255).astype(np.int64), J_.astype(np.int64), np.round(W_ * 255).astype(np.int64)]
    key = np.concatenate(q, axis=1); _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel(); order = np.argsort(first); remap = np.empty(len(first), int); remap[order] = np.arange(len(first)); idx = remap[inv]; keep = first[order]
    return P[keep], N[keep], uv[keep], C[keep], J_[keep], W_[keep], idx[T]


def quant_weights(W):
    Wq = np.round(W * 255).astype(int); diff = 255 - Wq.sum(1); am = np.argmax(W, 1); Wq[np.arange(len(W)), am] += diff; return np.clip(Wq, 0, 255).astype(np.uint8)


def to_g(a):
    a = np.asarray(a, float); return np.stack([a[..., 1], a[..., 2], a[..., 0]], -1)


def write_glb(path, M):
    species = M['species']; lod = M['lod']; L = M['L']; lay = M['lay']; body = M['info']['body']; sp = body.sp; JP = M['info']['JP']; acc = M['acc']; wet = M['wet']; tex = M['tex']
    binbuf = bytearray(); views = []; accs = []; images = []; textures = []
    def add_view(data, target=None):
        while len(binbuf) % 4: binbuf.append(0)
        views.append({'buffer': 0, 'byteOffset': len(binbuf), 'byteLength': len(data), **({'target': target} if target else {})}); binbuf.extend(data); return len(views) - 1
    def add_acc(arr, ctype, ncomp, target, normalized=False, minmax=False):
        a = np.ascontiguousarray(arr); vi = add_view(a.tobytes(), target)
        d = {'bufferView': vi, 'componentType': ctype, 'count': int(len(a)), 'type': {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4', 16: 'MAT4'}[ncomp]}
        if normalized: d['normalized'] = True
        if minmax: d['min'] = [float(v) for v in np.atleast_1d(a.min(0))]; d['max'] = [float(v) for v in np.atleast_1d(a.max(0))]
        accs.append(d); return len(accs) - 1
    def add_morph(delta):
        """a morph target as a sparse POSITION accessor (glTF frame): only the vertices that move are stored"""
        d = to_g(delta).astype(np.float32); nz = np.flatnonzero(np.abs(d).max(1) > 1e-7)
        if len(nz) == 0: nz = np.array([0])
        ind = nz.astype(np.uint16 if len(d) < 65536 else np.uint32); vi_ = add_view(np.ascontiguousarray(ind).tobytes()); vv_ = add_view(np.ascontiguousarray(d[nz]).tobytes())
        accs.append({'componentType': 5126, 'count': int(len(d)), 'type': 'VEC3', 'sparse': {'count': int(len(nz)), 'indices': {'bufferView': vi_, 'componentType': 5123 if ind.dtype == np.uint16 else 5125}, 'values': {'bufferView': vv_}}})
        return len(accs) - 1
    # ---- materials
    mats = []; mi = {}; ext_used = set(); embed = bool(lay) and L['tex'].get('embed', True)
    if embed:
        import collector_jpeg as JP_
        q = L['tex']['q']; ids = []
        for kind, data, qq in (('color', tex['color'], q[0]), ('normal', tex['normal'], q[1]), ('orm', tex['orm'], q[2])):
            u8 = (np.clip(data, 0, 1) * 255.0 + 0.5).astype(np.uint8)
            by = JP_.jpeg_bytes(u8, qq, subsample=(kind == 'color'), chroma_scale=(1.0 if kind == 'color' else 0.6))
            vi = add_view(by); images.append({'bufferView': vi, 'mimeType': 'image/jpeg', 'name': 'seal_%s' % kind}); textures.append({'sampler': 0, 'source': len(images) - 1}); ids.append(len(textures) - 1)
        def coat(name, f):
            m = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': f['base'], 'baseColorTexture': {'index': ids[0]}, 'metallicFactor': 0.0, 'roughnessFactor': f['rough'], 'metallicRoughnessTexture': {'index': ids[2]}},
                 'normalTexture': {'index': ids[1], 'scale': 1.0}, 'occlusionTexture': {'index': ids[2], 'strength': 1.0}, 'doubleSided': False, 'extensions': {}}
            if f.get('clearcoat'): m['extensions']['KHR_materials_clearcoat'] = {'clearcoatFactor': f['clearcoat'], 'clearcoatRoughnessFactor': f['clearcoat_rough']}; ext_used.add('KHR_materials_clearcoat')
            if sp['kind'] == 'pup': m['extensions']['KHR_materials_sheen'] = {'sheenColorFactor': [0.80, 0.74, 0.62], 'sheenRoughnessFactor': 0.55}; ext_used.add('KHR_materials_sheen')
            if not m['extensions']: del m['extensions']
            return m
        dry = coat('SealCoat', DRY); wetm = coat('SealCoatWet', WET)
        a_, b_ = (wetm, dry) if wet else (dry, wetm)
        mi['Coat'] = 0; mats.append(a_); mi['CoatAlt'] = 1; mats.append(b_)
        variants = [{'name': 'wet' if wet else 'dry'}, {'name': 'dry' if wet else 'wet'}]
        ext_used.add('KHR_materials_variants')
    else:
        m = {'name': 'SealFar', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.0, 'roughnessFactor': 0.62 if wet else 0.85}, 'doubleSided': False}
        mi['Coat'] = 0; mats.append(m); variants = None
    for name, (col, rough, met, ds) in SOLID.items():
        f = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': [col[0], col[1], col[2], 1.0], 'metallicFactor': met, 'roughnessFactor': rough}, 'doubleSided': ds}
        if name == 'Eye': f['extensions'] = {'KHR_materials_clearcoat': {'clearcoatFactor': 0.6, 'clearcoatRoughnessFactor': 0.08}}; ext_used.add('KHR_materials_clearcoat')
        if name == 'Whisker': f['emissiveFactor'] = [0.30, 0.28, 0.24]
        if name == 'Highlight': f['emissiveFactor'] = [1.0, 1.0, 1.0]; f['extensions'] = {'KHR_materials_emissive_strength': {'emissiveStrength': 2.5}}; ext_used.add('KHR_materials_emissive_strength')
        if name == 'Lid': f['pbrMetallicRoughness']['baseColorFactor'] = LID_COL[sp['kind']] + [1.0]
        mi[name] = len(mats); mats.append(f)
    # ---- nodes
    order = JOINT_ORDER[:]; idx = {n: i for i, n in enumerate(order)}; gnodes = [{'name': n} for n in order]
    pose = POSES.get(M['pose'], {}) if isinstance(M['pose'], str) else M['pose']
    for n in order:
        nd = gnodes[idx[n]]; par = PARENT[n]; rel = JP[n] - (JP[par] if par else np.zeros(3)); nd['translation'] = [float(v) for v in to_g(rel)]
        if n in pose: q = Q(*pose[n]); nd['rotation'] = [float(q[1]), float(q[2]), float(q[0]), float(q[3])]
        ex = {}
        if n in AXES: ex['axes'] = AXES[n]
        if n == 'footprint':
            ex['marker'] = 'ground footprint of the resting animal (an ellipse on the ground under the root, metres): the page uses it to pack haul-out slots'
            ex['footprint'] = footprint(body)
        if ex: nd['extras'] = ex
        if par: gnodes[idx[par]].setdefault('children', []).append(idx[n])
    # meshes: the skinned one
    meshes = []; skin_mesh_prims = []
    def prim_arrays(e):
        P = np.concatenate(e['P']); N = np.concatenate(e['N']); UV = np.concatenate(e['UV']); C = np.concatenate(e['C']); Jn = np.concatenate(e['J']); Wn = np.concatenate(e['W']); T = np.concatenate(e['T'])
        return weld(P, N, UV, C, Jn, Wn, T.reshape(-1, 3))
    tri_total = 0; per_mat = {}
    for mat, e in acc.d.items():
        P, N, UV, C, Jn, Wn, T = prim_arrays(e); P = P.copy()
        at = {'POSITION': add_acc(to_g(P).astype(np.float32), 5126, 3, 34962, minmax=True), 'NORMAL': add_acc(to_g(N).astype(np.float32), 5126, 3, 34962)}
        if mat == 'Coat' and embed: at['TEXCOORD_0'] = add_acc(np.rint(np.clip(UV, 0, 1) * 65535.0).astype(np.uint16), 5123, 2, 34962, normalized=True)
        if mat == 'Coat' and not embed: at['COLOR_0'] = add_acc((np.concatenate([np.clip(C, 0, 1), np.ones((len(C), 1))], 1) * 255.0 + 0.5).astype(np.uint8), 5121, 4, 34962, normalized=True)
        at['JOINTS_0'] = add_acc(Jn.astype(np.uint8), 5121, 4, 34962); at['WEIGHTS_0'] = add_acc(quant_weights(Wn), 5121, 4, 34962, normalized=True)
        Ti = T.astype(np.uint16) if len(P) < 65536 else T.astype(np.uint32)
        ia = add_acc(Ti.reshape(-1), 5123 if Ti.dtype == np.uint16 else 5125, 1, 34963)
        pr = {'attributes': at, 'indices': ia, 'material': mi[mat], 'mode': 4}
        if mat == 'Coat' and variants:
            alt = 1; pr['extensions'] = {'KHR_materials_variants': {'mappings': [{'materials': [mi['CoatAlt']], 'variants': [1]}, {'materials': [mi['Coat']], 'variants': [0]}]}}
        if lod != 'far':
            mo = head_morphs(M['info'], mat, P, Jn); pr['targets'] = [{'POSITION': add_morph(mo[k])} for k in SEAL_TARGETS]
        skin_mesh_prims.append(pr); tri_total += len(T); per_mat[mat] = len(T)
    meshes.append({'name': 'seal_mesh', 'primitives': skin_mesh_prims, **({'weights': [0.0] * len(SEAL_TARGETS), 'extras': {'targetNames': SEAL_TARGETS}} if lod != 'far' else {})})
    # rigid meshes for eyes and whiskers
    def rigid_node(nname, items, targets):
        prims = []; n = 0
        for (mat, P, N, T, ex) in items:
            at = {'POSITION': add_acc(to_g(P).astype(np.float32), 5126, 3, 34962, minmax=True), 'NORMAL': add_acc(to_g(N).astype(np.float32), 5126, 3, 34962)}
            if 'C' in ex: at['COLOR_0'] = add_acc((np.concatenate([np.clip(ex['C'], 0, 1), np.ones((len(P), 1))], 1) * 255.0 + 0.5).astype(np.uint8), 5121, 4, 34962, normalized=True)
            Ti = np.asarray(T).astype(np.uint16); ia = add_acc(Ti.reshape(-1), 5123, 1, 34963); pr = {'attributes': at, 'indices': ia, 'material': mi[mat], 'mode': 4}
            mo = ex.get('morph', {}); pr['targets'] = [{'POSITION': add_morph(mo.get(k, np.zeros((len(P), 3))))} for k in targets]
            prims.append(pr); n += len(Ti)
        meshes.append({'name': nname + '_mesh', 'primitives': prims, 'weights': [0.0] * len(targets), 'extras': {'targetNames': targets}}); gnodes[idx[nname]]['mesh'] = len(meshes) - 1; per_mat[nname] = n; return n
    for jn, items in M['eyes'].items(): tri_total += rigid_node(jn, items, EYE_TARGETS)
    if M['strands']:
        for sg, jn in ((1, 'whisker_l'), (-1, 'whisker_r')):
            Ps = []; Ns = []; Ts = []; base = 0
            Ms = {k: [] for k in WHISKER_TARGETS}
            for (P, N, T, mo) in M['strands']:
                Pm = P * np.array([1, sg, 1.0]); Nm = N * np.array([1, sg, 1.0]); Tm = T if sg > 0 else T[:, [0, 2, 1]]
                Ps.append(Pm); Ns.append(Nm); Ts.append(Tm + base); base += len(P)
                for k in WHISKER_TARGETS: Ms[k].append(mo[k] * np.array([1, sg, 1.0]))
            tri_total += rigid_node(jn, [('Whisker', np.concatenate(Ps), np.concatenate(Ns), np.concatenate(Ts), dict(morph={k: np.concatenate(v) for k, v in Ms.items()}))], WHISKER_TARGETS)
    # skin
    skin_idx = len(gnodes); gnodes.append({'name': 'seal_skin', 'mesh': 0, 'skin': 0}); idx['seal_skin'] = skin_idx
    ibm = np.zeros((len(JOINTS_SKIN), 16), np.float32)
    for i, jn in enumerate(JOINTS_SKIN):
        g = to_g(JP[jn]); m = np.eye(4); m[:3, 3] = -g; ibm[i] = m.T.reshape(-1)
    ibm_acc = add_acc(ibm.reshape(-1, 16), 5126, 16, None)
    skin = {'joints': [idx[j] for j in JOINTS_SKIN], 'inverseBindMatrices': ibm_acc, 'name': 'seal_skin'}
    skin['skel' + 'eton'] = idx['root']
    # animations
    anims = []; clip_info = {}
    for cname in CLIPS:
        ch, T, loop, note = sample_clip(cname, JP, coarse=(lod == 'far')); samplers = []; channels = []
        blob = bytearray(); specs = []
        def put_arr(arr, ncomp, minmax=False):
            arr = np.ascontiguousarray(arr, np.float32); off = len(blob); blob.extend(arr.tobytes()); specs.append((off, arr, ncomp, minmax)); return len(specs) - 1
        tim = {}
        for (jn, path_), (times, vals) in sorted(ch.items()):
            if path_ == 'weights' and lod == 'far': continue
            key = tuple(times)
            if key not in tim: tim[key] = put_arr(np.array(times, np.float32), 1, True)
            if path_ == 'rotation': arr = np.array([[v[1], v[2], v[0], v[3]] for v in vals], np.float32); nc = 4
            elif path_ == 'weights': arr = np.array(vals, np.float32).reshape(-1); nc = 1
            else: arr = np.array([[v[1], v[2], v[0]] for v in vals], np.float32); nc = 3
            samplers.append((tim[key], put_arr(arr, nc), idx[jn], path_))
        vi = add_view(bytes(blob)) if blob else None; base_acc = len(accs); sam = []; chs = []
        for off, arr, nc, mm in specs:
            d = {'bufferView': vi, 'byteOffset': off, 'componentType': 5126, 'count': int(len(arr)), 'type': {1: 'SCALAR', 3: 'VEC3', 4: 'VEC4'}[nc]}
            if mm: d['min'] = [float(arr.min())]; d['max'] = [float(arr.max())]
            accs.append(d)
        for ti, oi, node, path_ in samplers:
            sam.append({'input': base_acc + ti, 'output': base_acc + oi, 'interpolation': 'LINEAR'}); chs.append({'sampler': len(sam) - 1, 'target': {'node': node, 'path': path_}})
        samplers, channels = sam, chs
        if not channels: continue
        anims.append({'name': cname, 'samplers': samplers, 'channels': channels, 'extras': {'note': note, 'loop': loop}})
        clip_info[cname] = {'duration': T, 'loop': loop, 'nodes': sorted(set(j for j, p in ch)), 'note': note, **({'root_motion': ROOT_MOTION[cname]} if cname in ROOT_MOTION else {})}
    length, height, width = dims_of(M)
    doc = {'asset': {'version': '2.0', 'generator': 'seal_model.py (living-islands)'}, 'scene': 0, 'scenes': [{'name': 'seal', 'nodes': [idx['root'], skin_idx]}], 'nodes': gnodes, 'meshes': meshes, 'materials': mats,
           'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(binbuf)}], 'skins': [skin], 'animations': anims}
    if images: doc['images'] = images; doc['textures'] = textures; doc['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}]
    ext_used = sorted(ext_used)
    if ext_used: doc['extensionsUsed'] = ext_used
    if variants: doc.setdefault('extensions', {})['KHR_materials_variants'] = {'variants': variants}
    doc['scenes'][0]['extras'] = {'species': species, 'label': sp['label'], 'lod': lod, 'variant': M['variant'], 'variant_name': VARIANT_NAMES.get(M['variant'], str(M['variant'])), 'wet': bool(wet), 'pose': M['pose'] if isinstance(M['pose'], str) else 'custom',
        'frame': 'glTF: +Y up, +Z forward (the nose points to +Z), +X left; metres; the ground is y = 0 and the origin is on the ground under the middle of the trunk', 'triangles': tri_total,
        'dimensions_m': {'length_with_flippers': round(length, 3), 'height': round(height, 3), 'width': round(width, 3), 'trunk_length': round(body.Lb, 3)},
        'model_mass_kg': round(body.mass_kg()), 'real_mass_range_kg': list(sp['mass']), 'footprint': footprint(body), 'clips': clip_info, 'poses': {k: {j: list(v) for j, v in p.items()} for k, p in POSES.items()},
        'expressions': EXPRESSIONS, 'morph_targets': {'seal_mesh (the skinned head mesh)': SEAL_TARGETS, 'eye_l and eye_r': EYE_TARGETS, 'whisker_l and whisker_r': WHISKER_TARGETS},
        'expression_note': 'set the weights of the morph targets by name on every mesh that has the name; the calling target also opens the jaw (24 degrees) without the jaw joint',
        'pose_convention': 'poses and clips use (yaw, pitch, roll) in degrees in the animal frame (x forward, y left, z up): yaw positive turns left, pitch positive lifts the front, roll positive lifts the left side',
        'wet_dry': {'method': 'KHR_materials_variants (dry, wet): the wet material is the same textures with a darker base factor and low roughness plus a clear coat (about 20 percent darker, glossy)', 'wet_factors': WET, 'dry_factors': DRY} if variants else 'far level: vertex colour only',
        'page_notes': {'skinned': 'the mesh node seal_skin is skinned to the named joints; play a clip by name with an AnimationMixer', 'footprint': 'node footprint holds the ground ellipse', 'eyes_whiskers': 'eye_l, eye_r, whisker_l, whisker_r are rigid mesh nodes under head'}}
    if lod == 'far':          # the far level keeps only what the page needs to place and animate it: no prose
        ex = doc['scenes'][0]['extras']
        for k in ('poses', 'pose_convention', 'wet_dry', 'page_notes', 'frame', 'expressions', 'morph_targets', 'expression_note'): ex.pop(k, None)
        for c in ex['clips'].values(): c.pop('note', None); c.pop('root_motion', None)
        for an in doc['animations']: an['extras'] = {'loop': an['extras']['loop']}
        for nd in doc['nodes']:
            if 'extras' in nd and 'axes' in nd['extras']: del nd['extras']['axes']
    js = json.dumps(doc, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4); bb = bytes(binbuf) + b'\x00' * ((4 - len(binbuf) % 4) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(bb)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(bb), b'BIN\x00') + bb
    with open(path, 'wb') as f: f.write(data)
    return dict(path=os.path.basename(path), bytes=len(data), triangles=tri_total, per_material=per_mat, vertices=sum(a['count'] for a in accs if a.get('type') == 'VEC3' and a.get('min') is not None), image_bytes=sum(views[i['bufferView']]['byteLength'] for i in images),
                dims=[round(length, 3), round(height, 3), round(width, 3)])


def head_morphs(info, mat, P, Jn):
    """morph target deltas (builder frame, metres) for one primitive of the skinned mesh: dict name -> (n, 3). brow_raise and pad_puff move the coat around the eye brow and the whisker pad; calling opens the jaw (24 degrees about the jaw joint, for
    everything weighted to the jaw); content lifts the corners of the mouth; nostril_flare widens the nostril slits."""
    body = info['body']; JP = info['JP']; n = len(P); out = {k: np.zeros((n, 3)) for k in SEAL_TARGETS}
    ym = lambda pt: np.array([pt[0], -pt[1] + 2 * body.yoff(np.array([0.1]))[0] * 0 + 0.0, pt[2]])
    def both(pt):
        pt = np.asarray(pt, float); return [pt, np.array([pt[0], -pt[1], pt[2]])]
    def pts(t, th_deg): return body.pt(np.array([t]), np.array([math.radians(th_deg)]))[0]
    if mat == 'Coat':
        yo = body.yoff(np.array([body.t_eye]))[0]
        for c in both(pts(body.t_eye - 0.004, 52.0)):
            d = np.linalg.norm(P - c, axis=1); wt = np.exp(-(d / 0.040) ** 2); out['brow_raise'] += np.stack([0.004 * wt, 0 * wt, 0.0075 * wt], 1)
        tp = body.t_pad
        for c in both(pts(tp, 108.0)):
            d = np.linalg.norm(P - c, axis=1); wt = np.exp(-(d / 0.045) ** 2); outv = P - np.array([P[:, 0], P[:, 1] * 0 + 0.0, P[:, 2]]).T * 0
            sgn = np.sign(c[1]) if abs(c[1]) > 1e-6 else 1.0
            out['pad_puff'] += np.stack([0.003 * wt, 0.0045 * wt * sgn, 0.0030 * wt], 1)
        for c in both(pts(body.t_comm, SM_THETA_LIP)):
            d = np.linalg.norm(P - c, axis=1); wt = np.exp(-(d / 0.050) ** 2); sgn = np.sign(c[1])
            out['content'] += np.stack([-0.002 * wt, 0.002 * wt * sgn, 0.0065 * wt], 1)
    if mat == 'Dark':
        lat = np.abs(P[:, 1] - body.yoff(np.array([0.1]))[0]) > 0.032; ear = P[:, 0] < body.xn - 0.30 * body.Lb * 0.5
        lip = lat & ~ear
        for c in both(pts(body.t_comm, SM_THETA_LIP)):
            d = np.linalg.norm(P - c, axis=1); wt = np.exp(-(d / 0.050) ** 2) * lip; sgn = np.sign(c[1])
            out['content'] += np.stack([-0.002 * wt, 0.002 * wt * sgn, 0.0065 * wt], 1)
        for c in info.get('nostril_c', []):
            d = np.linalg.norm(P - c, axis=1); wt = np.exp(-(d / 0.016) ** 2) * (~lat)
            out['nostril_flare'] += (P - c) * 0.55 * wt[:, None] + np.stack([0 * wt, 0 * wt, 0.0007 * wt], 1)
    jaw = JOINTS_SKIN.index('jaw'); isj = (Jn[:, 0] == jaw)
    if isj.any():
        a = math.radians(24.0); c, s_ = math.cos(a), math.sin(a); pv = JP['jaw']; R = np.array([[c, 0, s_], [0, 1, 0], [-s_, 0, c]])
        out['calling'][isj] = (P[isj] - pv) @ R.T + pv - P[isj]
    return out


SM_THETA_LIP = THETA_LIP


def footprint(body):
    t = np.linspace(0.18, 0.98, 40); zc, hh, a, cap = body.rings(t)
    return {'ellipse_semi_axes_m': [round(float(body.Lb * 0.40), 3), round(float(np.max(a) * 1.15), 3)], 'centre_x_m': round(float(body.xn - 0.58 * body.Lb), 3), 'note': 'long axis along the animal'}


def dims_of(M):
    acc = M['acc']; lo = np.full(3, 1e9); hi = np.full(3, -1e9)
    for mat, e in acc.d.items():
        if mat in ('Whisker',): continue
        P = np.concatenate(e['P']); lo = np.minimum(lo, P.min(0)); hi = np.maximum(hi, P.max(0))
    return float(hi[0] - lo[0]), float(hi[2] - lo[2]), float(hi[1] - lo[1])


# ------------------------------------------------------------------------------------------------- command line
def out_name(species, lod, variant=0, wet=False, pose='rest'):
    return 'seal_%s_%s%s%s%s.glb' % (species, lod, '' if variant == 0 else '_v%d' % variant, '_wet' if wet else '', '' if pose == 'rest' else '_' + pose)

def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Seal models: GLB per species and level of detail.')
    ap.add_argument('--out', required=True, help='output directory (made if missing)'); ap.add_argument('--species', default='all'); ap.add_argument('--lod', default='all')
    ap.add_argument('--variant', type=int, default=0); ap.add_argument('--wet', action='store_true'); ap.add_argument('--pose', default='rest'); ap.add_argument('--seed', type=int, default=SEED)
    a = ap.parse_args(argv)
    a.species_list = list(SPECIES) if a.species == 'all' else [a.species]; a.lods = list(LODS) if a.lod == 'all' else [a.lod]
    if any(s not in SPECIES for s in a.species_list): ap.error('--species must be one of %s or all' % ', '.join(SPECIES))
    if any(l not in LODS for l in a.lods): ap.error('--lod must be one of hero, live, far, all')
    if a.pose not in POSES: ap.error('--pose must be one of %s' % ', '.join(POSES))
    if not 0 <= a.variant <= 5: ap.error('--variant must be 0 to 5')
    return a

def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True); rep = {}
    for sp in a.species_list:
        for lod in a.lods:
            M = build(sp, lod, a.variant, a.wet, a.seed, a.pose); name = out_name(sp, lod, a.variant, a.wet, a.pose); st = write_glb(os.path.join(a.out, name), M); rep[name] = st
            print(name, st['triangles'], 'tris', st['bytes'] // 1024, 'KB', st['dims'])
    with open(os.path.join(a.out, 'seal_report%s.json' % ('' if a.variant == 0 and not a.wet and a.pose == 'rest' else '_v%d%s_%s' % (a.variant, '_wet' if a.wet else '', a.pose))), 'w') as f: json.dump(rep, f, indent=1, sort_keys=True)

if __name__ == '__main__':
    main()
