"""BAKED TEXTURES FOR THE SEALS (pure numpy; used by seal_model.py).
One atlas per animal: the body chart is the loft itself (u along the body from the nose, v around the ring from the back, the head gets twice the texel density), and two small flipper charts (fore and hind), each with
the back of the flipper on the top half and the sole on the bottom half. Every texel knows its 3D position and normal on the real surface, so the coat is made from the body, not painted on a flat picture:
  grey seals   dark base with cream-grey blotches (male) or silver base with dark blotches (female), a paler belly, dapple of fine flecks, dark nose pad and eye rims with a tear streak, whisker pad follicles,
               neck folds with dark creases, pale scars (males), claw scratches, sand dusting low on the flanks and salt crust on the back
  pup          white fluffy coat with a hint of cream, strands along the body, grey moult patches, damp smudges
  harbour seal tan-grey with dark spots and pale rings (3D cells, so the spots are round on the curved body)
Outputs: base colour (sRGB), a tangent-space normal map (glTF convention: u along the columns, bitangent up the image) and one packed occlusion / roughness / metal map. Deterministic."""
import math
import numpy as np
import seal_model as SM
from collector_tex import vnoise, fbm, sstep

def lin(h):
    c = np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], np.float32) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)

def srgb(l):
    l = np.clip(l, 0, 1); return np.where(l <= 0.0031308, l * 12.92, 1.055 * np.power(l, 1 / 2.4) - 0.055)

def mix(a, b, t):
    t = np.asarray(t, np.float32); return a * (1 - t[:, None]) + b * t[:, None]

def nz(P, scale, seed, octaves=1):
    return fbm(P * scale, seed, octaves) if octaves > 1 else vnoise(P * scale, seed)


# ------------------------------------------------------------------------------------------------- variants: the colour and pattern knobs (the six variants of every species)
VAR = {   # variant: dict of multipliers and offsets
    0: dict(tone=0.0, warm=0.0, blot=1.0, scale=1.0, contrast=1.0, scars=1.0, sand=1.0, salt=1.0, moult=1.0, spots=1.0),
    1: dict(tone=0.09, warm=-0.01, blot=0.75, scale=0.9, contrast=0.8, scars=0.6, sand=0.7, salt=0.8, moult=0.4, spots=0.8),
    2: dict(tone=-0.09, warm=0.0, blot=1.0, scale=1.1, contrast=1.25, scars=1.0, sand=0.6, salt=0.8, moult=1.4, spots=1.15),
    3: dict(tone=0.0, warm=0.07, blot=0.9, scale=1.0, contrast=1.0, scars=0.8, sand=1.1, salt=1.0, moult=1.0, spots=0.95),
    4: dict(tone=0.02, warm=0.0, blot=1.5, scale=1.45, contrast=1.15, scars=1.0, sand=1.0, salt=1.0, moult=1.2, spots=1.4),
    5: dict(tone=-0.03, warm=0.03, blot=1.1, scale=0.85, contrast=1.0, scars=2.2, sand=2.4, salt=2.2, moult=2.0, spots=1.0),
}

def params(species, variant):
    v = dict(VAR[variant]); v['seed'] = 1000 + 37 * variant + SM.SPECIES.index(species) * 5; return v


# ------------------------------------------------------------------------------------------------- 3D cell spots (harbour seal)
def cell_spots(P, size, seed, radius=(0.30, 0.46), prob=0.85):
    """jittered 3D grid: returns the nearest spot's normalised distance (0 at its centre, 1 at its rim), a random value 0..1 for it and its size factor"""
    Q = P / size; base = np.floor(Q).astype(np.int64); best = np.full(len(P), 9.0, np.float32); rid = np.zeros(len(P), np.float32); rsz = np.ones(len(P), np.float32)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                c = base + np.array([dx, dy, dz]); h = ((c[:, 0] + seed * 7) * 73856093 ^ (c[:, 1] + seed * 13) * 19349663 ^ (c[:, 2] + seed * 29) * 83492791) & 0xFFFFFF
                r1 = (h & 255) / 255.0; r2 = ((h >> 8) & 255) / 255.0; r3 = ((h >> 16) & 255) / 255.0
                jit = np.stack([r1, r2, r3], 1) * 0.7 + 0.15; cen = c + jit
                has = (((h * 2654435761) >> 7) & 255) / 255.0 < prob
                rad = (radius[0] + (radius[1] - radius[0]) * ((h >> 3) & 255) / 255.0)
                d = np.linalg.norm(Q - cen, axis=1) / rad; d = np.where(has, d, 9.0)
                m = d < best; best = np.where(m, d, best); rid = np.where(m, r1, rid); rsz = np.where(m, rad, rsz)
    return best, rid, rsz


def segment_dist(P, A, B):
    ab = B - A; t = np.clip(np.sum((P - A) * ab, 1) / np.maximum(np.dot(ab, ab), 1e-9), 0, 1); return np.linalg.norm(P - (A + t[:, None] * ab), axis=1)


def line_marks(S, body, count, seed, length=(0.10, 0.28), region=(0.2, 0.75), side_only=False, bend=0.15):
    """thin curved marks (scars, claw scratches) as distance to short curved polylines on the surface; returns (distance, strand id) arrays"""
    rng = np.random.default_rng(seed); P = S['P']; d = np.full(len(P), 9.0, np.float32); wid = np.zeros(len(P), np.float32)
    for k in range(count):
        t0 = rng.uniform(*region); th0 = rng.uniform(0, SM.TAU) if not side_only else rng.choice([rng.uniform(0.8, 2.2), rng.uniform(4.1, 5.5)])
        ln = rng.uniform(*length); ang = rng.uniform(-0.5, 0.5) + (math.pi / 2 if rng.random() < 0.35 else 0.0); pts = []
        for s in np.linspace(0, 1, 7):
            tt = t0 + math.cos(ang) * s * ln / body.Lb * (1 if rng.random() < 2 else -1) + 0.0; thh = th0 + math.sin(ang) * s * ln / max(body.rings(np.array([t0]))[2][0] * 1.3, 0.05) + bend * math.sin(s * 3.0 + k)
            pts.append(body.pt(np.array([np.clip(tt, 0.01, 0.98)]), np.array([thh]))[0])
        w = rng.uniform(0.0015, 0.0035)
        for a, b in zip(pts[:-1], pts[1:]):
            dd = segment_dist(P, np.asarray(a, np.float32), np.asarray(b, np.float32)); m = dd < d; d = np.where(m, dd, d); wid = np.where(m, w, wid)
    return d, wid


# ------------------------------------------------------------------------------------------------- the body shader
COL = dict(
    male_dark=lin(0x37342f), male_mid=lin(0x59544c), male_pale=lin(0x9a9384), male_belly=lin(0x9c9486), male_head=lin(0x3d3935),
    fem_base=lin(0xa39d8e), fem_back=lin(0x827c70), fem_blot=lin(0x4a4640), fem_belly=lin(0xc6c0b1), fem_head=lin(0x6d675d),
    hb_base=lin(0x8b7d6b), hb_back=lin(0x5f5448), hb_belly=lin(0xbdb4a2), hb_spot=lin(0x35302a), hb_halo=lin(0xb4a892),
    pup_white=lin(0xece8dc), pup_cream=lin(0xe2d6bb), pup_back=lin(0xd9d4c7), pup_moult=lin(0x9c968a), pup_dirt=lin(0xa39879),
    sand=lin(0xb39d75), salt=lin(0xdad7cc), scar=lin(0xd6c7b4), nose=lin(0x1d1814), rim=lin(0x1d1a18), pad=lin(0x6a6359), lipdark=lin(0x151312),
)

def shade_body(S, body, species, V):
    P = S['P']; N = S['N']; t = S['t']; th = S['th']; n = len(P); seed = V['seed']; kind = body.sp['kind']
    up = N[:, 2]; z = P[:, 2]; hmask = 1 - sstep(0.7 * body.t_head, 0.30, t)
    xm = (body.xn - P[:, 0])                                    # metres from the nose
    wp = P + 0.045 * np.stack([nz(P, 7.0, seed + 1) - 0.5, nz(P, 7.0, seed + 2) - 0.5, nz(P, 7.0, seed + 3) - 0.5], 1)      # warped position for the blotches
    csh = sstep(0.55, -0.55, up)                                 # 0 on the back, 1 on the belly
    low = sstep(0.16, 0.0, z) * sstep(0.35, -0.2, up)             # near the ground, on a side or underneath
    fine = nz(P, 150.0, seed + 5); fine2 = nz(P, 420.0, seed + 6)
    strand = vnoise(np.stack([P[:, 0] * 18.0, P[:, 1] * 230.0, P[:, 2] * 230.0], 1), seed + 7)     # hair grain lying along the body
    tone = V['tone']
    if kind == 'grey' and species == 'grey_male':
        base = mix(COL['male_dark'], COL['male_mid'], 0.55 * csh + 0.25 * nz(wp, 5.0, seed + 8, 2)); base = mix(base, COL['male_belly'], 0.45 * csh)
        thr = 0.625 - 0.05 * (V['blot'] - 1) * 2; bl = fbm(wp * (6.2 / V['scale']), seed + 9, 3) + 0.14 * (nz(P, 55.0, seed + 10) - 0.5) + 0.06 * csh
        mask = sstep(thr, thr + 0.07 / V['contrast'], bl) * (0.55 + 0.45 * (1 - hmask * 0.6))
        base = mix(base, COL['male_pale'], mask * 0.62)
        d2 = fbm(wp * 14.0, seed + 11, 2); base = mix(base, COL['male_dark'], sstep(0.62, 0.70, d2) * 0.55 * (1 - mask))
        base = mix(base, COL['male_head'], hmask * 0.55)
    elif kind == 'grey':
        base = mix(COL['fem_back'], COL['fem_base'], sstep(-0.1, 0.65, -up) * 0.9 + 0.1); base = mix(base, COL['fem_belly'], csh * 0.75)
        thr = 0.560 - 0.04 * (V['blot'] - 1) * 2; bl = fbm(wp * (7.5 / V['scale']), seed + 9, 3) + 0.15 * (nz(P, 60.0, seed + 10) - 0.5) - 0.06 * csh
        mask = sstep(thr, thr + 0.06 / V['contrast'], bl) * (1 - 0.65 * csh)
        base = mix(base, COL['fem_blot'], mask * 0.82)
        sp2 = sstep(0.70, 0.76, nz(P, 70.0, seed + 12)) * (1 - 0.5 * csh); base = mix(base, COL['fem_blot'], sp2 * 0.5)
        base = mix(base, COL['fem_head'], hmask * 0.35)
    elif kind == 'harbour':
        base = mix(COL['hb_back'], COL['hb_base'], sstep(-0.4, 0.6, -up)); base = mix(base, COL['hb_belly'], csh * 0.9)
        base = mix(base, COL['hb_back'], hmask * 0.35 + 0.2 * nz(wp, 4.0, seed + 8, 2))
        d, rid, rsz = cell_spots(P, 0.052 / V['scale'] * (1.0 if True else 1), seed % 997, radius=(0.30, 0.47), prob=min(0.95, 0.80 * V['spots']))
        dens = 1.0 - 0.75 * sstep(-0.1, 0.8, -up) * 0 - 0.85 * csh; dens = np.clip(dens, 0, 1)
        core = 1 - sstep(0.62, 0.92, d); ring = sstep(0.95, 1.12, d) * (1 - sstep(1.15, 1.45, d)) * (rid > 0.45)
        base = mix(base, COL['hb_halo'], ring * 0.38 * dens); base = mix(base, COL['hb_spot'], core * (0.92 * dens))
        sp2 = sstep(0.66, 0.74, nz(P, 38.0, seed + 12)) * 0.5 * dens; base = mix(base, COL['hb_spot'], sp2)
    else:   # pup: white fluffy coat
        base = mix(COL['pup_white'], COL['pup_back'], (1 - csh) * 0.55); base = mix(base, COL['pup_cream'], (0.35 * csh + 0.55 * hmask * (1 - sstep(0.02, 0.09, xm))) * 0.9 + 0.12 * nz(wp, 5.0, seed + 8, 2))
        mt = fbm(wp * (9.0 / V['scale']), seed + 13, 3) + 0.2 * (nz(P, 40.0, seed + 14) - 0.5); thr = 0.64 - 0.05 * (V['moult'] - 1)
        moult = sstep(thr, thr + 0.05, mt) * (0.4 + 0.6 * (1 - csh)) * sstep(0.1, 0.25, t) * (V['moult'] > 0.3) * min(V['moult'], 1.6)
        base = mix(base, COL['pup_moult'], np.clip(moult, 0, 1) * 0.75); base = mix(base, COL['pup_dirt'], sstep(0.55, 0.8, nz(wp, 11.0, seed + 15)) * low * 0.55)
    # fur grain and dapple (small flecks that read as hair groups)
    gr = (strand - 0.5) * (0.20 if kind == 'pup' else 0.12) + (fine - 0.5) * 0.10 + (fine2 - 0.5) * 0.06
    base = base * (1 + gr[:, None]) * (1 + tone)
    dap = sstep(0.72, 0.78, nz(P, 95.0, seed + 16)); base = mix(base, base * (1.22 if kind != 'pup' else 0.93), dap * 0.5)
    if V['warm']: base = base * (1 + V['warm'] * np.array([1.0, 0.45, -0.7], np.float32))
    h = (strand - 0.5) * 0.00035 + (fine - 0.5) * 0.00035 + (fine2 - 0.5) * 0.0002; rough = 0.80 + 0.12 * (fine - 0.5) + 0.0 * csh
    if kind == 'pup': rough = rough + 0.08
    # neck folds: dark creases in the troughs of the rolls
    win = sstep(0.15 * body.k + 0.03, 0.20, t) * (1 - sstep(0.30, 0.37, t)); rr = np.sin(SM.TAU * (t - 0.17) / 0.052)
    crease = sstep(0.55, 0.98, -rr) * win * (0.45 + 0.55 * sstep(0.6, -0.8, np.cos(th))) * (body.sp['roll'] / 0.05 if body.sp['roll'] > 0 else 0)
    crease = np.clip(crease, 0, 1)
    base = base * (1 - 0.30 * crease[:, None]); h = h - 0.0016 * crease
    # nose pad, lips, eye rims, tear streak, whisker pad, ear
    dn = np.sqrt((xm * 1.0) ** 2 + 0.0)               # distance from the tip along x
    nose = (1 - sstep(0.018 * body.k * 1.0 + 0.012, 0.040 * body.k + 0.02, xm)) * sstep(-0.35, 0.25, up * 0 + np.cos(th) + 0.2)
    base = mix(base, COL['nose'], nose * 0.97); rough = np.where(nose > 0.5, 0.58, rough)
    tl = (np.abs(th - math.radians(SM.THETA_LIP)) < math.radians(2.2)) | (np.abs(th - (SM.TAU - math.radians(SM.THETA_LIP))) < math.radians(2.2))
    lipm = tl * (1 - sstep(body.t_comm - 0.006, body.t_comm + 0.014, t)) * 0.9; base = mix(base, COL['lipdark'], lipm); 
    ty = body.t_eye; eye_c = body.pt(np.array([ty]), np.array([math.radians(76.0)]))[0]; eye_c2 = eye_c * np.array([1, -1, 1], np.float32)
    de = np.minimum(np.linalg.norm(P - eye_c, axis=1), np.linalg.norm(P - (eye_c2 + np.array([0, 2 * body.yoff(np.array([ty]))[0], 0])), axis=1))
    rim = 1 - sstep(body.sp['eye_r'] * 1.3, body.sp['eye_r'] * (2.2 if kind == 'pup' else 2.7), de); base = mix(base, COL['rim'], rim * (0.55 if kind == 'pup' else 0.85)); rough = np.where(rim > 0.6, 0.55, rough)
    tear = 1 - sstep(0.0, 1.0, np.abs((P[:, 1] - np.sign(P[:, 1]) * (abs(eye_c[1]) + 0.005)) / 0.010)); tear = tear * sstep(0.0, 0.012, eye_c[2] - z) * (1 - sstep(0.05, 0.11, eye_c[2] - z)) * (np.abs(P[:, 1]) > 0.02)
    tear = tear * (1 - sstep(0.05, 0.11, xm - (body.xn - eye_c[0]))) * sstep(-0.01, 0.02, (body.xn - eye_c[0]) + 0.012 - xm * 0 - np.abs(xm - (body.xn - eye_c[0])) * 0) * 0.6
    base = mix(base, base * 0.55, np.clip(tear, 0, 1)); rough = np.where(tear > 0.3, 0.55, rough)
    # whisker pad: paler skin with dark follicle dots
    padc = body.pt(np.array([body.t_pad]), np.array([math.radians(108.0)]))[0]
    for sg in (1, -1):
        pc = padc * np.array([1, sg, 1.0], np.float32) + np.array([0, (2 * body.yoff(np.array([body.t_pad]))[0]) if sg < 0 else 0, 0])
        dp = np.linalg.norm((P - pc) * np.array([1.0, 1.0, 1.4], np.float32), axis=1); pmask = 1 - sstep(0.030 * body.sl ** 0.6 * 1.2, 0.050 * body.sl ** 0.6 * 1.2, dp)
        base = mix(base, COL['pad'], pmask * 0.35)
        q = (np.stack([xm * 1.0, np.arctan2(P[:, 2] - pc[2], P[:, 1] - pc[1]) * 0.06, dp], 1)); cellp = np.stack([P[:, 0], P[:, 1] * sg, P[:, 2]], 1) / 0.0058
        fr = cellp - np.floor(cellp); dd = np.sqrt(np.sum((fr - 0.5) ** 2, 1)); dots = (1 - sstep(0.17, 0.26, dd)) * pmask
        base = mix(base, COL['nose'], dots * 0.7); h = h + dots * 0.0007
    # scars (males), claw scratches, sand dusting, salt crust
    cnt_scar = int({'grey_male': 11, 'grey_female': 3, 'grey_pup': 0, 'harbour': 2}[species] * V['scars']); cnt_sc = int({'grey_male': 8, 'grey_female': 6, 'grey_pup': 2, 'harbour': 4}[species] * (0.7 + 0.3 * V['scars']))
    if cnt_scar:
        d1, w1 = line_marks(S, body, cnt_scar, seed + 21, length=(0.08, 0.26), region=(0.17, 0.60))
        sm = (1 - sstep(w1 * 0.5, w1 * 1.2, d1)); base = mix(base, COL['scar'] * (0.7 if kind != 'pup' else 0.6), sm * 0.55); h = h + sm * 0.0006; rough = np.where(sm > 0.4, 0.62, rough)
    if cnt_sc:
        d2_, w2 = line_marks(S, body, cnt_sc, seed + 22, length=(0.10, 0.34), region=(0.3, 0.8), bend=0.08)
        sm2 = (1 - sstep(w2 * 0.15, w2 * 0.55, d2_)); base = mix(base, base * 1.25 + 0.01, sm2 * 0.4); h = h - sm2 * 0.0004
    sand_amt = 0.35 * V['sand']
    sandm = sstep(0.55 - 0.3 * low, 0.80, nz(P, 90.0, seed + 31)) * (low * 0.9 + sstep(0.2, 1.0, up) * 0.18 * nz(P, 12.0, seed + 32)) * sand_amt
    sandm = np.clip(sandm, 0, 0.9) * (1 - 0.8 * sstep(-0.6, -1.0, up) * sstep(0.02, 0.0, z) * 0); base = mix(base, COL['sand'] * (0.85 + 0.3 * fine[:, None]), sandm * 0.8); rough = np.where(sandm > 0.2, 0.95, rough)
    saltm = sstep(0.62, 0.78, fbm(wp * 18.0, seed + 41, 2)) * sstep(0.2, 0.9, up) * sstep(0.2, 0.5, t) * 0.45 * V['salt'] * (0.5 + 0.5 * nz(P, 4.0, seed + 42))
    saltm += sstep(0.55, 0.9, nz(P, 60.0, seed + 43)) * 0.14 * V['salt'] * hmask
    saltm = np.clip(saltm, 0, 0.8); base = mix(base, COL['salt'], saltm * 0.7); h = h + saltm * 0.0004; rough = np.where(saltm > 0.25, 0.92, rough)
    # ambient occlusion (soft): ground contact, creases, under the chin, behind the flipper roots
    ao = 1.0 - 0.45 * sstep(0.10, 0.0, z) * sstep(0.2, -0.5, up) - 0.40 * crease - 0.18 * sstep(0.0, -0.8, up)
    for sgn, jn in ((1, 'fl'), (-1, 'fl')):
        pass
    ao = np.clip(ao, 0.25, 1.0)
    base = base * (1 - 0.22 * sstep(0.04, 0.0, z)[:, None])      # damp where it lies on the sand
    return base, h, rough, ao


# ------------------------------------------------------------------------------------------------- flipper shader
def shade_limb(kind, Pl, tt, qq, sign, plantar, species, V, body, hind=False):
    n = len(Pl); seed = V['seed'] + (50 if hind else 0); sp = body.sp; k = sp['kind']
    if k == 'pup': back = mix(COL['pup_white'][None, :].repeat(n, 0), COL['pup_back'][None, :].repeat(n, 0), 0.5 * nz(Pl, 30.0, seed + 1)); skin = lin(0x8b7e72)
    elif species == 'grey_male': back = mix(COL['male_dark'][None, :].repeat(n, 0), COL['male_mid'][None, :].repeat(n, 0), 0.5 * nz(Pl * 40, 1.0, seed + 1)); skin = lin(0x2d2824)
    elif k == 'grey': back = mix(COL['fem_back'][None, :].repeat(n, 0), COL['fem_base'][None, :].repeat(n, 0), 0.5 * nz(Pl * 40, 1.0, seed + 1)); skin = lin(0x3a3530)
    else: back = mix(COL['hb_back'][None, :].repeat(n, 0), COL['hb_base'][None, :].repeat(n, 0), 0.5 * nz(Pl * 40, 1.0, seed + 1)); skin = lin(0x3b342d)
    fine = nz(Pl, 220.0 * (0.5 if False else 1), seed + 2); gr = vnoise(np.stack([Pl[:, 0] * 25, Pl[:, 1] * 250, Pl[:, 2] * 250], 1), seed + 3)
    dig = np.array([-0.8, -0.4, 0.0, 0.4, 0.8]); dq = np.min(np.abs(qq[:, None] - dig[None, :]), 1)
    ridge = 0.5 + 0.5 * np.cos(SM.TAU * (qq - 0.0) / 0.4 * 1.0)
    if plantar:
        c = mix(skin[None, :].repeat(n, 0), skin[None, :].repeat(n, 0) * 1.5, 0.5 * nz(Pl, 60.0, seed + 4)); wr = sstep(0.55, 0.75, nz(Pl * np.array([1.0, 1.0, 1.0], np.float32), 140.0, seed + 5))
        c = c * (1 - 0.35 * wr[:, None]); h = -0.0006 * wr + 0.0004 * ridge; rough = 0.62 + 0.15 * wr
        if k == 'pup': c = mix(c, lin(0xb0a496)[None, :].repeat(n, 0), np.full(n, 0.4, np.float32))
    else:
        fade = sstep(0.55, 1.0, tt) if not hind else sstep(0.35, 0.95, tt)
        c = mix(back, skin[None, :].repeat(n, 0), fade * (0.35 if k == 'pup' else 0.85)); gdt = (gr - 0.5) * 0.18 + (fine - 0.5) * 0.10
        c = c * (1 + gdt[:, None]); h = (gr - 0.5) * 0.0003 + 0.0005 * ridge * (1 - fade); rough = 0.84 + 0.0 * fine
    edge = sstep(0.82, 1.0, np.abs(qq)) * 0.25; c = c * (1 - edge[:, None])
    ao = 1 - 0.35 * sstep(0.2, 0.0, tt) - 0.15 * edge
    return c, h, rough, ao


# ------------------------------------------------------------------------------------------------- normals
def normals_from_height(h, valid, texel_u, texel_v, gain, wrap_v=False):
    """h (H,W) metres; texel_u/v (H,W) the metres per texel along the columns and rows. glTF: tangent along the columns, bitangent up the image"""
    def sh(a, dy, dx): return np.roll(np.roll(a, dy, 0), dx, 1)
    hl, hr, hu, hd = sh(h, 0, 1), sh(h, 0, -1), sh(h, 1, 0), sh(h, -1, 0)
    vl, vr, vu, vd = sh(valid, 0, 1), sh(valid, 0, -1), sh(valid, 1, 0), sh(valid, -1, 0)
    hl = np.where(vl, hl, h); hr = np.where(vr, hr, h); hu = np.where(vu, hu, h); hd = np.where(vd, hd, h)
    gx = (hr - hl) / (2 * np.maximum(texel_u, 1e-5)); gy = (hu - hd) / (2 * np.maximum(texel_v, 1e-5))
    nx = -gx * gain; ny = -gy * gain; nzz = np.ones_like(nx); ln = np.sqrt(nx * nx + ny * ny + nzz * nzz)
    return np.stack([nx / ln, ny / ln, nzz / ln], -1) * 0.5 + 0.5


def bake(body, species, variant, lod, lay, seed=SM.SEED):
    V = params(species, variant); Wa, Ha = lay['atlas']; bx, by, bw, bh = lay['body']
    col = np.tile(np.array([0.40, 0.38, 0.35], np.float32), (Ha, Wa, 1)); hgt = np.zeros((Ha, Wa), np.float32); rgh = np.full((Ha, Wa), 0.85, np.float32); aoi = np.ones((Ha, Wa), np.float32)
    valid = np.zeros((Ha, Wa), bool); tu = np.full((Ha, Wa), 0.002, np.float32); tv = np.full((Ha, Wa), 0.002, np.float32)
    # ---- body chart
    rows, cols = np.mgrid[0:bh, 0:bw]; u = cols / (bw - 1.0); v = rows / (bh - 1.0); t = SM.t_of_u(body, u).astype(np.float64); th = (v * SM.TAU).astype(np.float64)
    out_c = np.zeros((bh, bw, 3), np.float32); out_h = np.zeros((bh, bw), np.float32); out_r = np.zeros((bh, bw), np.float32); out_a = np.zeros((bh, bw), np.float32)
    P_all = np.zeros((bh, bw, 3), np.float32)
    chunk = 120
    for r0 in range(0, bh, chunk):
        sl = slice(r0, min(bh, r0 + chunk)); tt = t[sl].reshape(-1); tth = th[sl].reshape(-1)
        P = body.pt(tt, tth); Nn = body.normal(tt, tth); S = dict(P=P.astype(np.float32), N=Nn.astype(np.float32), t=tt.astype(np.float32), th=tth.astype(np.float32))
        P_all[sl] = S['P'].reshape(-1, bw, 3)
        if r0 == 0: S_first = S
        c, h, r, a = shade_body_chunk(S, body, species, V)
        out_c[sl] = c.reshape(-1, bw, 3); out_h[sl] = h.reshape(-1, bw); out_r[sl] = r.reshape(-1, bw); out_a[sl] = a.reshape(-1, bw)
    col[by:by + bh, bx:bx + bw] = srgb(out_c); hgt[by:by + bh, bx:bx + bw] = out_h; rgh[by:by + bh, bx:bx + bw] = out_r; aoi[by:by + bh, bx:bx + bw] = out_a; valid[by:by + bh, bx:bx + bw] = True
    du = np.linalg.norm(np.diff(P_all, axis=1), axis=2); du = np.concatenate([du, du[:, -1:]], 1); dv = np.linalg.norm(np.diff(P_all, axis=0), axis=2); dv = np.concatenate([dv, dv[-1:]], 0)
    tu[by:by + bh, bx:bx + bw] = np.maximum(du, 1e-4); tv[by:by + bh, bx:bx + bw] = np.maximum(dv, 1e-4)
    # ---- flipper charts
    for key, kind, hind in (('fore', 'fore', False), ('hind', 'hind', True)):
        fx, fy, fw, fh = lay[key]; half = fh // 2
        L = body.sp['fore'] if not hind else body.sp['hind']; hw = 0.24 * L if not hind else 0.40 * L; thick = 0.052 * L if not hind else 0.034 * L / 0.31 * 0.9
        for sheet, (r0, sign, plantar) in enumerate(((0, 1, (hind)), (half, -1, (not hind)))):
            rr, cc = np.mgrid[0:half, 0:fw]; tt = (cc / (fw - 1.0)).reshape(-1); qq = (rr / (half - 1.0) * 2 - 1).reshape(-1)
            Pl = SM.plate_local(kind, L, hw, thick, tt, qq, sign).astype(np.float32)
            c, h, r, a = shade_limb(kind, Pl, tt, qq, sign, plantar, species, V, body, hind)
            col[fy + r0:fy + r0 + half, fx:fx + fw] = srgb(c).reshape(half, fw, 3); hgt[fy + r0:fy + r0 + half, fx:fx + fw] = h.reshape(half, fw); rgh[fy + r0:fy + r0 + half, fx:fx + fw] = r.reshape(half, fw) if np.ndim(r) else r
            aoi[fy + r0:fy + r0 + half, fx:fx + fw] = a.reshape(half, fw); valid[fy + r0:fy + r0 + half, fx:fx + fw] = True
            tu[fy + r0:fy + r0 + half, fx:fx + fw] = max(L / fw, 1e-4); tv[fy + r0:fy + r0 + half, fx:fx + fw] = max(2 * hw * 0.8 / half, 1e-4)
    # fill the unused area with a plain tone
    if not valid.all():
        m = col[valid].mean(0); col[~valid] = m
    gain = 1.0
    nrm = normals_from_height(hgt, valid, tu, tv, gain)
    nrm[~valid] = (0.5, 0.5, 1.0)
    orm = np.stack([np.clip(aoi, 0, 1) ** 0.9, np.clip(rgh, 0.2, 1.0), np.zeros_like(aoi)], -1)
    t_ = SM.LOD[lod]['tex']
    def down(a, f):
        if f == 1: return a
        H, W = a.shape[:2]; return a.reshape(H // f, f, W // f, f, *a.shape[2:]).mean((1, 3))
    return dict(color=col.astype(np.float32), normal=down(nrm.astype(np.float32), t_['nrm_div']), orm=down(orm.astype(np.float32), t_['orm_div']))


def shade_body_chunk(S, body, species, V):
    return shade_body(S, body, species, V)
