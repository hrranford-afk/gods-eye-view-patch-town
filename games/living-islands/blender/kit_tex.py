"""KIT TEXTURES (pure python and numpy): procedural 3D materials with baked wear, and the atlas baker for the kit pieces built by kit_model.py. See KIT_PIECES.md.
How it works: every surface patch of a piece is a "chunk" with its own little chart (an island) in one atlas. The baker rasterises every triangle into its chart, so each texel
knows its true 3D position and normal; the material functions below are evaluated there (stone, driftwood, rusted iron, old paint, plaster, sailcloth, rope, sand, dried fish ...)
together with the wear of the piece: tide line and barnacles, salt crust, moss, lichen, bleached wood, rust runs, chipped paint. Because the patterns come from 3D position the charts never show seams.
Outputs per level: colour (sRGB), normal map (OpenGL, +Y up the image) and an ORM map (occlusion R, roughness G, metal B). Deterministic (integer hash noise, no random state). No lettering anywhere."""
import numpy as np

M32 = 0xFFFFFFFF


# ------------------------------------------------------------------------------------------------- noise on 3D points
def _hash(ix, iy, iz, seed):
    h = (ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791) ^ ((int(seed) * 668265263) & M32)
    h &= M32
    h = ((h ^ (h >> 15)) * 2246822519) & M32
    h = ((h ^ (h >> 13)) * 3266489917) & M32
    h ^= h >> 16
    return (h & 0xFFFFFF).astype(np.float32) * np.float32(1.0 / 16777215.0)


def noise3(P, s, seed=0):
    """smooth value noise 0..1; s is a scalar or a per-axis scale (features per metre)"""
    x = np.asarray(P, np.float32) * np.asarray(s, np.float32)
    i = np.floor(x); f = x - i; i = i.astype(np.int64); u = f * f * (3 - 2 * f)
    ix, iy, iz = i[:, 0], i[:, 1], i[:, 2]; ux, uy, uz = u[:, 0], u[:, 1], u[:, 2]
    def h(a, b, c): return _hash(ix + a, iy + b, iz + c, seed)
    c00 = h(0, 0, 0) * (1 - ux) + h(1, 0, 0) * ux; c10 = h(0, 1, 0) * (1 - ux) + h(1, 1, 0) * ux
    c01 = h(0, 0, 1) * (1 - ux) + h(1, 0, 1) * ux; c11 = h(0, 1, 1) * (1 - ux) + h(1, 1, 1) * ux
    return (c00 * (1 - uy) + c10 * uy) * (1 - uz) + (c01 * (1 - uy) + c11 * uy) * uz


def fbm3(P, s, octaves=3, seed=0):
    tot = 0.0; amp = 1.0; norm = 0.0; s = np.asarray(s, np.float32)
    for o in range(octaves):
        tot = tot + amp * noise3(P, s * (2.03 ** o), seed + 17 * o); norm += amp; amp *= 0.5
    return tot / norm


def worley(P, s, seed=0, f2=False):
    """distance to the nearest jittered cell point (cell units, about 0..0.9) and a per-cell random number; with f2 also the distance to the second nearest"""
    x = np.asarray(P, np.float32) * np.float32(s); b = np.floor(x - 0.5).astype(np.int64)
    best = np.full(len(x), 9.0, np.float32); rid = np.zeros(len(x), np.float32); second = np.full(len(x), 9.0, np.float32)
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                cx = b[:, 0] + dx; cy = b[:, 1] + dy; cz = b[:, 2] + dz
                px = cx + _hash(cx, cy, cz, seed + 1); py = cy + _hash(cx, cy, cz, seed + 2); pz = cz + _hash(cx, cy, cz, seed + 3)
                d = np.sqrt((x[:, 0] - px) ** 2 + (x[:, 1] - py) ** 2 + (x[:, 2] - pz) ** 2)
                m = d < best; second = np.where(m, best, np.minimum(second, d)); best = np.where(m, d, best); rid = np.where(m, _hash(cx, cy, cz, seed + 4), rid)
    return (best, rid, second) if f2 else (best, rid)


def sst(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)


def mixc(a, b, t):
    a = np.asarray(a, np.float32); b = np.asarray(b, np.float32); t = np.asarray(t, np.float32)[..., None]
    return a * (1 - t) + b * t


def srgb_to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


class Ctx:
    """the texels of one batch: P (n,3) position, N (n,3) normal, u and v the chart coordinates in metres, edge the distance to the chart border in metres, prm the material parameters, W the wear of the piece"""
    def __init__(self, P, N, u, v, edge, prm, W, su, sv):
        self.P = P.astype(np.float32); self.N = N.astype(np.float32); self.u = u.astype(np.float32); self.v = v.astype(np.float32); self.edge = edge.astype(np.float32)
        self.prm = prm; self.W = W; self.su = su; self.sv = sv; self.n = len(P); self.seed = int(prm.get('seed', 1))


# ------------------------------------------------------------------------------------------------- the wear shared by all materials
def weather(c, col, ht, rough, allow):
    """tide line, barnacles, weed, salt crust, moss, lichen on top of a base colour. allow: which of them the material takes."""
    W = c.W; P = c.P; N = c.N; y = P[:, 1]; sd = c.seed
    tide = W.get('tide', 0.0)
    if tide > 0 and 'wet' in allow:
        wob = (noise3(P, 2.5, sd + 5) - 0.5) * 0.25 * tide
        wet = sst(tide + 0.06 + wob, tide - 0.06 + wob, y)
        col = col * (1 - 0.38 * wet)[:, None]; rough = rough * (1 - 0.35 * wet)
        if 'barn' in allow and W.get('barnacle', 0) > 0:
            d, rid = worley(P, 62, sd + 9); sz = 0.16 + 0.22 * rid
            b = (d < sz) * sst(tide * 0.92 + wob, tide * 0.35 + wob, y) * (noise3(P, 9, sd + 31) < 0.35 + 0.45 * W['barnacle'])
            col = mixc(col, (0.66, 0.64, 0.58), b * 0.9); ht = ht + b * 0.006 * (1 - d / np.maximum(sz, 0.05)); rough = np.where(b > 0.5, 0.9, rough)
        if 'weed' in allow:
            wd = sst(tide * 0.55, 0.0, y) * sst(0.4, 0.62, fbm3(P, 5, 3, sd + 40)); col = mixc(col, (0.13, 0.19, 0.07), wd * 0.8); ht = ht + wd * 0.004
    if W.get('salt', 0) > 0 and 'salt' in allow:
        zone = sst(tide + 1.6, tide + 0.1, y) * (0.35 + 0.65 * sst(0.0, 0.6, N[:, 1] + 0.3))
        sm = zone * sst(0.42, 0.7, fbm3(P, 6, 3, sd + 50)) * W['salt']
        col = mixc(col, (0.80, 0.78, 0.72), sm * 0.5); rough = rough + sm * 0.1
    if W.get('moss', 0) > 0 and 'moss' in allow:
        shade = sst(-0.1, 0.55, N[:, 1])
        m = sst(0.5 - 0.22 * W['moss'], 0.68 - 0.1 * W['moss'], fbm3(P, 4.2, 4, sd + 60) * 0.8 + 0.2 * noise3(P, 30, sd + 61)) * shade * sst(0.0, 0.08, y)
        mc = mixc((0.12, 0.17, 0.07), (0.25, 0.30, 0.12), noise3(P, 40, sd + 62))
        col = mixc(col, mc, m * 0.93); ht = ht + m * (0.004 + 0.006 * noise3(P, 120, sd + 63)); rough = np.where(m > 0.4, 0.97, rough)
    if W.get('lichen', 0) > 0 and 'lichen' in allow:
        d, rid = worley(P, 11, sd + 70); m = sst(0.34 * rid + 0.02, 0.2 * rid, d) * (rid > 1 - 0.55 * W['lichen']) * sst(-0.3, 0.3, N[:, 1])
        lc = mixc((0.66, 0.67, 0.55), (0.72, 0.56, 0.30), ((rid * 7.0) % 1.0) ** 2)
        col = mixc(col, lc, m * 0.8); ht = ht + m * 0.0015
    return col, ht, rough


# ------------------------------------------------------------------------------------------------- materials: each returns colour (n,3) sRGB, height (n) metres, roughness, metal, occlusion
STONE_TONES = {'grey': ((0.40, 0.39, 0.37), (0.55, 0.54, 0.50)), 'slate': ((0.24, 0.26, 0.28), (0.38, 0.39, 0.40)), 'warm': ((0.46, 0.40, 0.33), (0.62, 0.55, 0.45)),
               'dark': ((0.21, 0.21, 0.21), (0.33, 0.32, 0.31)), 'pale': ((0.58, 0.56, 0.51), (0.72, 0.70, 0.64)), 'rust': ((0.44, 0.30, 0.22), (0.58, 0.42, 0.30))}


def m_stone(c):
    P = c.P; sd = c.seed; A, B = STONE_TONES[c.prm.get('tone', 'grey')]
    n1 = fbm3(P, 1.7, 3, sd); n2 = fbm3(P, 7, 3, sd + 3); fine = noise3(P, 90, sd + 7); fine2 = noise3(P, 280, sd + 8)
    col = mixc(A, B, sst(0.25, 0.75, n1)) * (0.84 + 0.30 * n2)[:, None] * (0.93 + 0.14 * fine)[:, None]
    col = mixc(col, (0.80, 0.78, 0.72), sst(0.80, 0.88, fine2) * 0.5); col = col * (1 - 0.35 * sst(0.2, 0.1, fine2))[:, None]
    if c.prm.get('tone') == 'slate':
        lay = noise3(P, np.array([2.0, 26.0, 2.0]), sd + 12); col = col * (0.88 + 0.22 * lay)[:, None]
    cr = sst(0.03, 0.0, np.abs(fbm3(P, 2.6, 3, sd + 11) - 0.5))
    col = col * (1 - 0.55 * cr)[:, None]
    ht = 0.007 * n2 + 0.003 * fine - 0.006 * cr; rough = 0.9 - 0.12 * fine
    col, ht, rough = weather(c, col, ht, rough, ('moss', 'lichen', 'salt', 'barn', 'wet', 'weed'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.4 * cr


def _grain(c, ustretch=0.35, vscale=22.0):
    """wood coordinates: grain runs along u"""
    uo = (c.seed * 1.37) % 5.0
    Q = np.stack([c.u * ustretch + uo, c.v * vscale, np.full(c.n, c.seed * 0.7, np.float32)], 1)
    return Q


def m_wood(c):
    sd = c.seed; tone = c.prm.get('tone', 'drift'); P = c.P
    Q = _grain(c); g1 = fbm3(Q, 1.0, 3, sd); fib = noise3(np.stack([c.u * 1.2, c.v * 260, np.full(c.n, sd, np.float32)], 1), 1.0, sd + 4)
    ring = 0.5 + 0.5 * np.sin(c.v * 70 + 7 * fbm3(np.stack([c.u * 0.5, c.v * 6, np.zeros(c.n, np.float32)], 1), 1.0, 2, sd + 2))
    palette = {'drift': ((0.47, 0.44, 0.39), (0.27, 0.24, 0.21)), 'dark': ((0.20, 0.16, 0.12), (0.10, 0.08, 0.06)), 'oak': ((0.40, 0.27, 0.16), (0.22, 0.14, 0.08)),
               'pale': ((0.58, 0.54, 0.47), (0.40, 0.36, 0.30)), 'tarred': ((0.13, 0.11, 0.09), (0.06, 0.05, 0.04))}
    A, B = palette[tone]; t = np.clip(0.55 * g1 + 0.3 * ring + 0.15 * fib, 0, 1)
    col = mixc(A, B, sst(0.25, 0.75, t))
    # weathered silver cover: more on the sides facing the sky and the weather, pale salt dust in the grain
    bl = c.W.get('bleach', 0.5) if tone in ('drift', 'pale', 'oak') else 0.15
    sil = sst(0.35 - 0.3 * bl, 0.8, fbm3(P, 3.5, 3, sd + 9)) * bl
    col = mixc(col, (0.52, 0.51, 0.48), sil * 0.5)
    # checks and splits along the grain, dark nail holes with rust stains
    sp = sst(0.05, 0.0, np.abs(noise3(np.stack([c.u * 1.8, c.v * 38, np.full(c.n, sd + 3, np.float32)], 1), 1.0, sd + 21) - 0.5)) * sst(0.45, 0.7, fbm3(P, 3, 2, sd + 22))
    col = col * (1 - 0.6 * sp)[:, None]
    ht = (0.0025 * (ring - 0.5) + 0.002 * (fib - 0.5) - 0.004 * sp) * (1.0 + sil)
    if tone == 'drift': ht = ht + 0.004 * (fbm3(P, 14, 2, sd + 30) - 0.5)
    rough = 0.84 + 0.12 * sil
    if c.prm.get('paint') is not None:
        # old paint: faded, chipped to bare wood along edges and where the weather got at it
        chip = sst(0.45 - 0.35 * c.W.get('chip', 0.5), 0.8, fbm3(P, 8, 3, sd + 41) * 0.7 + 0.35 * sst(0.05, 0.0, c.edge) + 0.15 * (1 - sst(-0.2, 0.6, c.N[:, 1])))
        pc = np.asarray(c.prm['paint'], np.float32) * (0.86 + 0.2 * noise3(P, 12, sd + 42))[:, None]
        col = mixc(pc, col, chip); ht = ht + (1 - chip) * 0.0012; rough = np.where(chip < 0.5, 0.7, rough)
    if c.prm.get('stripe') is not None:
        # a faded band of colour across the board, as paint on a crate or a spar
        s0, s1, scol = c.prm['stripe']; band = sst(s0 - 0.01, s0, c.v / np.maximum(c.sv, 1e-3)) * sst(s1 + 0.01, s1, c.v / np.maximum(c.sv, 1e-3)) * (1 - 0.4 * sp)
        col = mixc(col, np.asarray(scol, np.float32) * (0.9 + 0.15 * g1)[:, None], band * 0.75 * (0.6 + 0.4 * sst(0.3, 0.7, fbm3(P, 9, 2, sd + 43))))
    col, ht, rough = weather(c, col, ht, rough, ('moss', 'salt', 'barn', 'wet', 'weed'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.35 * sp


def m_iron(c):
    """rusted steel, old paint, galvanised sheet. prm: paint colour or None, galv bool, rivet spacing or 0, rust 0..1"""
    sd = c.seed; P = c.P; prm = c.prm; W = c.W; ru = prm.get('rust', W.get('rust', 0.6))
    streak = np.array([1.0, 0.22, 1.0], np.float32)
    n1 = fbm3(P * streak, 3.0, 3, sd); n2 = fbm3(P, 14, 3, sd + 5); fine = noise3(P, 150, sd + 6)
    steel = (0.30, 0.31, 0.32) if prm.get('galv') else (0.17, 0.17, 0.17)
    col = np.tile(np.asarray(steel, np.float32), (c.n, 1)) * (0.9 + 0.2 * n2)[:, None]
    rm = sst(0.55 - 0.3 * ru, 0.75 - 0.2 * ru, n1 * 0.75 + n2 * 0.25 + 0.15 * (1 - sst(0.0, 0.5, c.N[:, 1] + 0.5)))
    rc = mixc((0.40, 0.21, 0.10), (0.22, 0.11, 0.07), sst(0.3, 0.8, fbm3(P, 9, 3, sd + 7)))
    rc = mixc(rc, (0.52, 0.31, 0.14), sst(0.7, 0.9, fine) * 0.5)
    col = mixc(col, rc, rm)
    ht = 0.004 * (n2 - 0.5) + rm * 0.005 * (fine - 0.3) - 0.003 * sst(0.8, 0.95, noise3(P, 40, sd + 8))
    rough = 0.55 + 0.4 * rm; metal = (1 - rm) * 0.85; ao = 1 - 0.25 * rm
    sp = prm.get('rivets', 0)
    if sp:
        a = (c.u / sp) % 1.0 - 0.5; b = (c.v / sp) % 1.0 - 0.5; d = np.sqrt(a * a + b * b) * sp
        rv = sst(0.011, 0.007, d); ht = ht + rv * 0.004; col = mixc(col, (0.36, 0.17, 0.07), sst(0.02, 0.011, d) * 0.5 * (1 - rv)); col = col * (1 - 0.25 * rv)[:, None]
        # rust runs below rivets and along seams
        run = sst(0.016, 0.0, np.abs(a * sp)) * (0.5 + 0.5 * noise3(P, 6, sd + 9)); col = mixc(col, (0.30, 0.12, 0.05), run * 0.35)
    if prm.get('paint') is not None:
        pc = np.asarray(prm['paint'], np.float32)
        pm = sst(0.5 - 0.3 * W.get('chip', 0.6) - 0.1, 0.66, fbm3(P * np.array([1, 0.4, 1], np.float32), 5.5, 4, sd + 10) * 0.75 + 0.25 * sst(0.06, 0.0, c.edge))
        # paint survives where it is thick (inside the plate) and chalks to a pale bloom
        pcol = pc * (0.80 + 0.3 * noise3(P, 9, sd + 11))[:, None]; pcol = mixc(pcol, (0.60, 0.60, 0.55), 0.12 * noise3(P, 20, sd + 12))
        col = mixc(pcol, col, pm); ht = ht + (1 - pm) * 0.0015; rough = np.where(pm < 0.5, 0.78, rough); metal = metal * pm
    pl = prm.get('plates')
    if pl:
        # plate seams: lapped edges every pu along u and pv along v, with a step and a dark crack
        pu, pv = pl; fu = (c.u / pu) % 1.0; fv = (c.v / pv) % 1.0; seam = np.maximum(sst(0.012, 0.0, fu * pu) + sst(0.988, 1.0, fu), sst(0.012, 0.0, fv * pv) + sst(0.988, 1.0, fv))
        seam = np.clip(seam, 0, 1); step = (np.floor(c.u / pu) % 2) * 0.004 + (np.floor(c.v / pv) % 2) * 0.003
        col = col * (1 - 0.5 * seam)[:, None]; ht = ht - 0.005 * seam + step
    if prm.get('holes'):
        # rust-through: dark pits with a thin bright rim of fresh rust
        d, rid = worley(P, prm['holes'], sd + 13); hm = (rid > 0.55) * sst(0.30 * rid, 0.18 * rid, d) * sst(0.4, 0.6, fbm3(P, 2.0, 2, sd + 14)); rim = sst(0.40 * rid, 0.30 * rid, d) * (1 - hm)
        col = mixc(col, (0.02, 0.018, 0.016), hm); col = mixc(col, (0.55, 0.28, 0.1), rim * 0.5 * (rid > 0.55)); ht = ht - hm * 0.01; ao = ao * (1 - 0.7 * hm)
    col, ht, rough = weather(c, col, ht, rough, ('barn', 'wet', 'weed'))
    return col, ht, rough, metal.astype(np.float32), ao


def m_plaster(c):
    """old limewash over masonry: courses of blocks, flaking to bare stone, a faded band, runs of grime"""
    P = c.P; sd = c.seed; prm = c.prm; ax = prm.get('axis', (0.0, 0.0)); ch = prm.get('course', 0.26)
    x = P[:, 0] - ax[0]; z = P[:, 2] - ax[1]
    if prm.get('rubble'):
        return m_rubble(c)
    if prm.get('flat'):
        # a straight wall: blocks 0.55 m long along the wall direction
        dx, dz = prm.get('dir', (1.0, 0.0)); ang = (x * dx + z * dz) / 0.55 * 2 * np.pi; nb = 1.0
    else:
        ang = np.arctan2(z, x); nb = np.maximum(3, np.round(2 * np.pi * max(prm.get('radius', 1.8), 0.3) / 0.55))
    ci = np.floor(P[:, 1] / ch); fy = P[:, 1] / ch - ci
    ja = (ang / (2 * np.pi) * nb + 0.5 * (ci % 2) + 0.11 * _hash(ci.astype(np.int64), np.zeros(c.n, np.int64), np.zeros(c.n, np.int64), sd)) % 1.0
    bid = np.floor(ang / (2 * np.pi) * nb + 0.5 * (ci % 2)); rb = _hash(bid.astype(np.int64), ci.astype(np.int64), np.zeros(c.n, np.int64), sd + 1)
    mortar = np.maximum(sst(0.07, 0.0, fy) + sst(0.93, 1.0, fy), sst(0.035, 0.0, ja) + sst(0.965, 1.0, ja)); mortar = np.clip(mortar, 0, 1)
    stone = mixc((0.27, 0.27, 0.26), (0.45, 0.43, 0.40), rb) * (0.82 + 0.34 * fbm3(P, 12, 3, sd + 2))[:, None]
    stone = stone * (1 - 0.4 * sst(0.7, 0.9, noise3(P, 60, sd + 3)) * 0.5)[:, None]
    wash = np.asarray(prm.get('wash', (0.52, 0.50, 0.45)), np.float32)
    flake = sst(0.44 - 0.2 * c.W.get('chip', 0.6), 0.68, fbm3(P * np.array([1, 0.5, 1], np.float32), 3.2, 4, sd + 4) * 0.8 + 0.2 * mortar * 0.5)
    wcol = wash * (0.82 + 0.25 * fbm3(P, 16, 3, sd + 5))[:, None]
    # grime runs down from the top and dark damp near the ground
    run = fbm3(P * np.array([14, 0.9, 14], np.float32), 1.0, 3, sd + 6); wcol = wcol * (1 - 0.35 * sst(0.55, 0.85, run))[:, None]
    b = prm.get('band')
    if b is not None:
        b0, b1, bc = b; inb = sst(b0 - 0.05, b0, P[:, 1]) * sst(b1 + 0.05, b1, P[:, 1]); bcol = np.asarray(bc, np.float32) * (0.8 + 0.3 * noise3(P, 10, sd + 7))[:, None]
        wcol = mixc(wcol, bcol, inb * 0.95 * sst(0.0, 0.3, fbm3(P, 4, 3, sd + 8) + 0.5 * inb))
    col = mixc(wcol, stone, flake); col = mixc(col, col * 0.38, mortar * 0.85)
    ht = -0.02 * mortar + 0.008 * (rb - 0.5) + 0.004 * (fbm3(P, 25, 2, sd + 9) - 0.5) - 0.004 * flake + 0.002 * fbm3(P, 80, 2, sd + 10)
    rough = np.where(flake < 0.5, 0.9, 0.92).astype(np.float32)
    col, ht, rough = weather(c, col, ht, rough, ('moss', 'lichen', 'salt', 'wet', 'barn'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.55 * mortar


def m_rubble(c):
    """lime-washed rubble wall: irregular stones in mortar under whitewash that has flaked away"""
    P = c.P; sd = c.seed; prm = c.prm; dx, dz = prm.get('dir', (1.0, 0.0)); s = P[:, 0] * dx + P[:, 2] * dz
    Q = np.stack([s, P[:, 1] * 1.7, np.full(c.n, 0.31, np.float32)], 1)
    d1, rid, d2 = worley(Q, 2.4, sd + 3, True); edge = d2 - d1
    mortar = sst(0.16, 0.02, edge)
    stone = mixc((0.36, 0.34, 0.31), (0.54, 0.51, 0.45), rid) * (0.86 + 0.28 * fbm3(P, 13, 3, sd + 2))[:, None]
    wash = np.asarray(prm.get('wash', (0.76, 0.73, 0.65)), np.float32)
    flake = sst(0.34 - 0.2 * c.W.get('chip', 0.6), 0.6, fbm3(P * np.array([1, 0.6, 1], np.float32), 3.0, 4, sd + 4) * 0.7 + 0.3 * sst(0.0, 0.5, edge * 3))
    wcol = wash * (0.82 + 0.25 * fbm3(P, 15, 3, sd + 5))[:, None]
    run = fbm3(P * np.array([14, 0.9, 14], np.float32), 1.0, 3, sd + 6); wcol = wcol * (1 - 0.3 * sst(0.55, 0.85, run))[:, None]
    b = prm.get('band')
    if b is not None:
        b0, b1, bc = b; inb = sst(b1 + 0.18, b1, P[:, 1]) * (0.55 + 0.45 * fbm3(P, 5, 3, sd + 8)); wcol = mixc(wcol, np.asarray(bc, np.float32), inb * 0.75)
    col = mixc(wcol, stone, flake); col = mixc(col, np.array([0.28, 0.27, 0.25], np.float32), mortar * 0.55)
    ht = -0.016 * mortar + 0.012 * (rid - 0.5) * sst(0.02, 0.2, edge) + 0.006 * fbm3(P, 22, 2, sd + 9) - 0.004 * flake
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.92, np.float32), ('moss', 'lichen', 'salt', 'wet'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.5 * mortar


def m_canvas(c):
    sd = c.seed; P = c.P; prm = c.prm
    base = np.asarray(prm.get('base', (0.56, 0.50, 0.38)), np.float32) * 0.82; n = fbm3(P, 5, 3, sd); wv = noise3(np.stack([c.u * 380, c.v * 380, np.zeros(c.n, np.float32)], 1), 1.0, sd + 1)
    col = base * (0.80 + 0.3 * n)[:, None] * (0.94 + 0.1 * wv)[:, None]
    # panel seams, double stitched
    pw = prm.get('panel', 0.55); f = (c.v / pw) % 1.0; sm = sst(0.02, 0.0, f) + sst(0.98, 1.0, f); st = sm * (0.5 + 0.5 * (np.sin(c.u * 330) > 0))
    col = col * (1 - 0.35 * np.clip(sm, 0, 1) - 0.25 * st)[:, None]
    # a faded stripe, tide-marks, mildew, tar at the lower hem
    sp = prm.get('stripe')
    if sp is not None:
        s0, s1, scol = sp; fr = c.v / np.maximum(c.sv, 1e-3); band = sst(s0 - 0.01, s0, fr) * sst(s1 + 0.01, s1, fr); col = mixc(col, np.asarray(scol, np.float32) * (0.85 + 0.2 * n)[:, None], band * 0.7)
    mil = sst(0.55, 0.75, fbm3(P, 9, 3, sd + 3)); col = mixc(col, (0.25, 0.27, 0.19), mil * 0.5)
    stain = sst(0.5, 0.8, fbm3(P * np.array([2, 8, 2], np.float32), 2.0, 3, sd + 4)); col = col * (1 - 0.22 * stain)[:, None]
    # patches: lighter rectangles sewn on at hashed places
    pi = np.floor(c.u / 0.5); pj = np.floor(c.v / 0.45); hh = _hash(pi.astype(np.int64), pj.astype(np.int64), np.zeros(c.n, np.int64), sd + 5)
    lu = (c.u / 0.5) % 1.0; lv = (c.v / 0.45) % 1.0; inp = (hh > 0.8) * sst(0.1, 0.12, lu) * sst(0.9, 0.88, lu) * sst(0.1, 0.12, lv) * sst(0.9, 0.88, lv)
    edgeP = np.minimum(np.minimum(lu, 1 - lu), np.minimum(lv, 1 - lv)); col = mixc(col, col * np.array([1.12, 1.0, 0.82], np.float32) * 0.92, inp * 0.8)
    col = col * (1 - 0.3 * inp * sst(0.2, 0.12, edgeP) * (0.5 + 0.5 * (np.sin(c.u * 400 + c.v * 400) > 0)))[:, None]
    ht = 0.0012 * (wv - 0.5) - 0.0015 * np.clip(sm, 0, 1) + 0.0015 * inp
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.95, np.float32), ('salt',))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.2 * sm


def m_rope(c):
    """twisted rope; u along the rope, v around it"""
    sd = c.seed; P = c.P; prm = c.prm; pitch = prm.get('pitch', 0.06); strands = prm.get('strands', 3)
    ph = (c.u / pitch + strands * (c.v / np.maximum(c.sv, 1e-3))) % 1.0; tw = 0.5 + 0.5 * np.cos(ph * 2 * np.pi)
    base = np.asarray(prm.get('base', (0.55, 0.47, 0.34)), np.float32); n = fbm3(P, 8, 3, sd)
    col = mixc(base * 0.5, base * (0.9 + 0.3 * n)[:, None], 0.25 + 0.75 * tw) * (0.7 + 0.5 * sst(0.3, 0.8, noise3(P, 3, sd + 1)))[:, None]
    col = mixc(col, (0.62, 0.6, 0.55), 0.35 * sst(0.4, 0.7, fbm3(P, 12, 2, sd + 2)))
    fz = noise3(np.stack([c.u * 500, c.v * 500, np.zeros(c.n, np.float32)], 1), 1.0, sd + 3)
    col, ht, rough = weather(c, col, 0.003 * tw + 0.0015 * fz, np.full(c.n, 0.96, np.float32), ('salt', 'moss', 'wet', 'weed'))
    return col, ht, rough, np.zeros(c.n, np.float32), 0.55 + 0.45 * tw


def m_sand(c):
    """sand, shingle and shell grit. prm: grit 0 sand .. 1 pebbles"""
    sd = c.seed; P = c.P; gr = c.prm.get('grit', 0.0); W = c.W
    rip = np.sin((P[:, 0] * 0.8 + P[:, 2] * 1.7) * 9 + 4 * fbm3(P, 1.5, 2, sd)) * 0.5 + 0.5
    n = fbm3(P, 6, 3, sd + 1); f = noise3(P, 220, sd + 2)
    col = mixc((0.46, 0.40, 0.30), (0.60, 0.54, 0.42), sst(0.3, 0.7, n)) * (0.92 + 0.14 * f)[:, None]
    wet = sst(0.15, 0.0, P[:, 1] + (noise3(P, 3, sd + 3) - 0.5) * 0.1); col = col * (1 - 0.35 * wet)[:, None]
    ht = 0.008 * rip * (1 - gr) + 0.004 * n
    d, rid = worley(P, 14, sd + 4); pb = sst(0.45, 0.30, d) * (rid < 0.25 + 0.7 * gr)
    pc = mixc((0.38, 0.37, 0.35), (0.62, 0.58, 0.50), (rid * 11) % 1.0); col = mixc(col, pc * (0.75 + 0.4 * (1 - d))[:, None], pb); ht = ht + pb * 0.03 * (1 - d / 0.45)
    d2, r2 = worley(P, 40, sd + 5); sh = sst(0.12, 0.06, d2) * (r2 > 0.82); col = mixc(col, (0.86, 0.82, 0.74), sh * 0.8); ht = ht + sh * 0.003
    rough = np.full(c.n, 0.95, np.float32)
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.2 * pb


def m_kelp(c):
    sd = c.seed; P = c.P; n = fbm3(P, 12, 3, sd); st = 0.5 + 0.5 * np.sin(c.u * 90 + 5 * n)
    col = mixc((0.10, 0.11, 0.05), (0.28, 0.24, 0.09), sst(0.2, 0.8, n)) * (0.8 + 0.3 * st)[:, None]
    col = mixc(col, (0.55, 0.52, 0.40), sst(0.7, 0.9, fbm3(P, 5, 2, sd + 1)) * 0.5)
    return col, 0.004 * st, np.full(c.n, 0.6, np.float32), np.zeros(c.n, np.float32), 0.7 + 0.3 * st


def m_fish(c):
    """dried split fish: golden flesh side, grey-brown skin side, salt crust, a darker edge and tail fork"""
    sd = c.seed; P = c.P; n = fbm3(P, 24, 3, sd); fr = c.v / np.maximum(c.sv, 1e-3); fu = c.u / np.maximum(c.su, 1e-3)
    flesh = mixc((0.62, 0.45, 0.24), (0.46, 0.31, 0.16), sst(0.2, 0.8, n)); skin = mixc((0.30, 0.27, 0.22), (0.18, 0.16, 0.13), sst(0.2, 0.8, n))
    col = flesh if c.prm.get('side', 0) else skin
    col = col * (0.9 + 0.2 * noise3(np.stack([c.u * 60, c.v * 6, np.zeros(c.n, np.float32)], 1), 1.0, sd + 2))[:, None]
    sc = sst(0.5, 0.75, fbm3(P, 38, 2, sd + 1)); col = mixc(col, (0.80, 0.77, 0.68), sc * 0.55)
    spine = sst(0.06, 0.0, np.abs(fr - 0.5)); col = mixc(col, col * 0.6, spine * 0.4)
    edge = sst(0.04, 0.0, c.edge); col = col * (1 - 0.3 * edge)[:, None]
    return col, 0.003 * spine + 0.002 * n, np.full(c.n, 0.8, np.float32), np.zeros(c.n, np.float32), 1 - 0.2 * edge


def m_glass(c):
    sd = c.seed; P = c.P; n = fbm3(P, 18, 3, sd); fr = np.abs(((c.v / 0.04) % 1.0) - 0.5)
    col = mixc((0.14, 0.22, 0.19), (0.30, 0.40, 0.34), n) * (0.85 + 0.25 * sst(0.0, 0.5, fr))[:, None]
    dirt = sst(0.55, 0.8, fbm3(P, 7, 3, sd + 1)); col = mixc(col, (0.62, 0.60, 0.52), dirt * 0.55)
    return col, 0.002 * sst(0.0, 0.5, fr), 0.15 + 0.7 * dirt, np.zeros(c.n, np.float32), np.ones(c.n, np.float32)


def m_turf(c):
    sd = c.seed; P = c.P; n = fbm3(P, 9, 3, sd); f = noise3(P, 170, sd + 1)
    col = mixc((0.17, 0.22, 0.08), (0.34, 0.38, 0.13), n) * (0.8 + 0.4 * f)[:, None]
    col = mixc(col, (0.40, 0.33, 0.20), sst(0.65, 0.85, fbm3(P, 5, 2, sd + 2)) * 0.6)
    return col, 0.01 * f, np.full(c.n, 0.97, np.float32), np.zeros(c.n, np.float32), 0.7 + 0.3 * f


def m_char(c):
    sd = c.seed; P = c.P; n = fbm3(P, 20, 3, sd); col = mixc((0.05, 0.045, 0.04), (0.24, 0.22, 0.20), sst(0.5, 0.9, n))
    return col, 0.006 * n, np.full(c.n, 0.9, np.float32), np.zeros(c.n, np.float32), 0.6 + 0.4 * n


MATERIALS = {'stone': m_stone, 'wood': m_wood, 'iron': m_iron, 'plaster': m_plaster, 'canvas': m_canvas, 'rope': m_rope, 'sand': m_sand, 'kelp': m_kelp,
             'fish': m_fish, 'glass': m_glass, 'turf': m_turf, 'char': m_char}


def freeze(prm):
    return tuple(sorted((k, tuple(v) if isinstance(v, (list, tuple, np.ndarray)) and not isinstance(v, str) and all(not isinstance(x, (list, tuple)) for x in v) else (str(v) if isinstance(v, (list, tuple)) else v)) for k, v in prm.items()))


# ------------------------------------------------------------------------------------------------- charts: packing and rasterising
def pack(sizes, S, pad, dens_max):
    """shelf-pack charts of physical size (su, sv) m into an S x S atlas. Finds the largest texel density that fits. returns (rects, density)"""
    n = len(sizes)
    if n == 0: return [], 1.0
    def attempt(d):
        wh = []
        for (su, sv, w) in sizes:
            dd = d * w; wh.append((max(3, int(np.ceil(su * dd))) + 2 * pad, max(3, int(np.ceil(sv * dd))) + 2 * pad))
        order = sorted(range(n), key=lambda i: (-wh[i][1], -wh[i][0], i)); rects = [None] * n; x = 0; y = 0; rowh = 0
        for i in order:
            w, h = wh[i]
            if w > S or h > S: return None
            if x + w > S: x = 0; y += rowh; rowh = 0
            if y + h > S: return None
            rects[i] = (x, y, w, h); x += w; rowh = max(rowh, h)
        return rects
    lo, hi = 1.0, dens_max
    best = attempt(lo)
    while best is None and lo > 0.05: lo *= 0.5; best = attempt(lo)
    if attempt(hi) is not None: return attempt(hi), hi
    for _ in range(14):
        mid = (lo + hi) / 2; r = attempt(mid)
        if r is None: hi = mid
        else: lo = mid; best = r
    return best, lo


def rasterise(UVp, P, N, F, uv01, su, sv, pad):
    """texel centres of every triangle of one chart: returns pixel x, y, position, normal, chart u, v in metres"""
    xs = []; ys = []; Ps = []; Ns = []; Us = []; Vs = []
    for f in F:
        a, b, cc = UVp[f[0]], UVp[f[1]], UVp[f[2]]
        den = (b[1] - cc[1]) * (a[0] - cc[0]) + (cc[0] - b[0]) * (a[1] - cc[1])
        if abs(den) < 1e-9: continue
        x0 = int(np.floor(min(a[0], b[0], cc[0]) - 0.6)); x1 = int(np.ceil(max(a[0], b[0], cc[0]) + 0.6)); y0 = int(np.floor(min(a[1], b[1], cc[1]) - 0.6)); y1 = int(np.ceil(max(a[1], b[1], cc[1]) + 0.6))
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); px = gx.ravel() + 0.5; py = gy.ravel() + 0.5
        w0 = ((b[1] - cc[1]) * (px - cc[0]) + (cc[0] - b[0]) * (py - cc[1])) / den; w1 = ((cc[1] - a[1]) * (px - cc[0]) + (a[0] - cc[0]) * (py - cc[1])) / den; w2 = 1 - w0 - w1
        m = (w0 >= -0.03) & (w1 >= -0.03) & (w2 >= -0.03)
        if not m.any(): continue
        w0 = np.clip(w0[m], 0, 1)[:, None]; w1 = np.clip(w1[m], 0, 1)[:, None]; w2 = np.clip(w2[m], 0, 1)[:, None]; s = w0 + w1 + w2; w0 /= s; w1 /= s; w2 /= s
        xs.append(gx.ravel()[m]); ys.append(gy.ravel()[m])
        Ps.append(w0 * P[f[0]] + w1 * P[f[1]] + w2 * P[f[2]]); nn = w0 * N[f[0]] + w1 * N[f[1]] + w2 * N[f[2]]; Ns.append(nn / np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9))
        uu = w0 * uv01[f[0]] + w1 * uv01[f[1]] + w2 * uv01[f[2]]; Us.append(uu[:, 0] * su); Vs.append(uu[:, 1] * sv)
    if not xs: return None
    return np.concatenate(xs), np.concatenate(ys), np.concatenate(Ps), np.concatenate(Ns), np.concatenate(Us), np.concatenate(Vs)


def dilate(img, mask, iters):
    for _ in range(iters):
        if mask.all(): break
        acc = np.zeros_like(img); cnt = np.zeros(mask.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            m2 = np.roll(mask, (dy, dx), (0, 1)); i2 = np.roll(img, (dy, dx), (0, 1))
            add = m2 & ~mask; acc += np.where(add[..., None] if img.ndim == 3 else add, i2, 0); cnt += add
        new = (cnt > 0)
        if img.ndim == 3: img = np.where(new[..., None], acc / np.maximum(cnt, 1)[..., None], img)
        else: img = np.where(new, acc / np.maximum(cnt, 1), img)
        mask = mask | new
    return img, mask


def bake(chunks, S, W, dens_max, pad=3, ao_fn=None, want_maps=True):
    """chunks: objects with .mat .prm .P .N .UV (chart coordinates 0..1, v down) .F .su .sv .w .rect (set here). returns dict of images and the density"""
    rects, dens = pack([(c.su, c.sv, c.w) for c in chunks], S, pad, dens_max)
    col = np.zeros((S, S, 3), np.float32); ht = np.zeros((S, S), np.float32); ro = np.full((S, S), 0.9, np.float32); me = np.zeros((S, S), np.float32); ao = np.ones((S, S), np.float32)
    cover = np.zeros((S, S), bool); batches = {}
    for c, r in zip(chunks, rects):
        x, y, w, h = r; c.rect = r; c.dens = dens * c.w
        UVp = np.stack([x + pad + c.UV[:, 0] * (w - 2 * pad), y + pad + c.UV[:, 1] * (h - 2 * pad)], 1)
        c.UVatlas = np.stack([UVp[:, 0] / S, UVp[:, 1] / S], 1)
        if not want_maps: continue
        rr = rasterise(UVp, c.P, c.N, c.F, c.UV, c.su, c.sv, pad)
        if rr is None: continue
        px, py, P, N, u, v = rr
        ok = (px >= 0) & (px < S) & (py >= 0) & (py < S); px, py, P, N, u, v = px[ok], py[ok], P[ok], N[ok], u[ok], v[ok]
        edge = np.minimum(np.minimum(u, c.su - u), np.minimum(v, c.sv - v))
        batches.setdefault((c.mat, freeze(c.prm)), []).append((c.prm, px, py, P, N, u, v, edge, c.su, c.sv))
    if not want_maps: return None, dens
    for (mat, _), items in batches.items():
        prm = items[0][0]; px = np.concatenate([i[1] for i in items]); py = np.concatenate([i[2] for i in items]); P = np.concatenate([i[3] for i in items]); N = np.concatenate([i[4] for i in items])
        u = np.concatenate([i[5] for i in items]); v = np.concatenate([i[6] for i in items]); edge = np.concatenate([i[7] for i in items])
        su = np.concatenate([np.full(len(i[1]), i[8], np.float32) for i in items]); sv = np.concatenate([np.full(len(i[1]), i[9], np.float32) for i in items])
        cx = Ctx(P, N, u, v, edge, prm, W, su, sv); cx.su = su; cx.sv = sv
        cl, h_, r_, m_, a_ = MATERIALS[mat](cx)
        if ao_fn is not None: a_ = a_ * ao_fn(P, N)
        col[py, px] = np.clip(cl, 0, 1); ht[py, px] = h_; ro[py, px] = r_; me[py, px] = m_; ao[py, px] = a_; cover[py, px] = True
    it = pad + 2
    col, cm = dilate(col, cover, it); ht, _ = dilate(ht, cover, it); ro, _ = dilate(ro, cover, it); me, _ = dilate(me, cover, it); ao, _ = dilate(ao, cover, it)
    col[~cm] = (0.4, 0.4, 0.38)
    return dict(color=np.clip(col, 0, 1), height=ht, rough=ro, metal=me, ao=ao, cover=cm), dens


def normal_map(ht, dens, gain=1.5):
    gy, gx = np.gradient(ht.astype(np.float32)); k = dens * gain
    n = np.stack([-gx * k, +gy * k, np.ones_like(ht)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True); return n * 0.5 + 0.5


def down(a, f):
    if f == 1: return a
    h, w = a.shape[:2]; return a.reshape(h // f, f, w // f, f, *a.shape[2:]).mean((1, 3))


def encode(maps, dens, nrm_div=2, q=(66, 66, 50), colour_only=False):
    import collector_jpeg as J
    def to8(a): return (np.clip(a, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    jc = J.jpeg_bytes(to8(maps['color']), q[0], subsample=True)
    if colour_only: return jc, None, None
    nm = normal_map(maps['height'], dens)
    nm = down(nm, nrm_div); orm = down(np.stack([maps['ao'], maps['rough'], maps['metal']], -1), nrm_div)
    return jc, J.jpeg_bytes(to8(nm), q[1], chroma_scale=0.6), J.jpeg_bytes(to8(orm), q[2], chroma_scale=0.6)
