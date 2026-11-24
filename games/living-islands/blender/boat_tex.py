"""BOAT KIT TEXTURES (pure python and numpy): the baked wear atlas for the boats built by boat_model.py. See BOAT_MODEL.md.
One atlas per boat: colour (sRGB), normal map (OpenGL, +Y up the image) and an ORM map (occlusion R, roughness G, metal B).
Layout (canonical 1024 x 1152 texels, the live level uses half of it):
  region O: outer planking, one band per strake and side (NB bands per side), u along the length, s across the strake. The wear is computed from the strake's real height above the waterline (z).
  region I: inner planking bands (lower resolution).
  region C: swatches for the parts (thwarts, floor, ribs, oars, rope, spars, iron, leather, canvas, deck, cabin, crates, net, sacks ...), each mapped once with a small inset.
Deterministic (seeded numpy generators). No lettering anywhere."""
import numpy as np

W0, H0 = 1024, 1152
NB = 7                                   # most strakes per side
BAND_O, PAD_O = 48, 3
BAND_I, PAD_I = 14, 2
Y_O = 0
Y_I = 2 * NB * BAND_O                    # 672
Y_C = Y_I + 2 * NB * BAND_I              # 868

SW = {   # name -> (x, y, w, h) in canonical texels
    'thwart': (0, 868, 256, 32), 'floor': (256, 868, 256, 32), 'rib': (512, 868, 256, 32), 'oar': (768, 868, 256, 32),
    'gunwale': (0, 900, 256, 32), 'keel': (256, 900, 256, 32), 'rope': (512, 900, 256, 32), 'spar': (768, 900, 256, 32),
    'iron': (0, 932, 128, 32), 'leather': (128, 932, 128, 32), 'tar': (256, 932, 128, 32), 'net': (384, 932, 128, 32), 'buoy': (512, 932, 128, 32),
    'crate': (640, 932, 256, 32), 'paintw': (896, 932, 128, 32),
    'canvas': (0, 964, 512, 128), 'deck': (512, 964, 256, 128), 'cabin': (768, 964, 256, 128),
    'sack': (0, 1092, 128, 56), 'glass': (128, 1092, 128, 56), 'barrel': (256, 1092, 128, 56), 'sand': (384, 1092, 256, 56), 'weed': (640, 1092, 128, 56),
}
SWATCH_INSET = 0.07

PALETTES = {   # sRGB. top = topsides, sheer = top strake, anti = antifoul, bt = boot-top band, inner = inside wood of the planking
    'dinghy': dict(top=(0.30, 0.44, 0.43), sheer=(0.78, 0.74, 0.62), anti=(0.40, 0.17, 0.12), bt=(0.80, 0.76, 0.62), inner=(0.62, 0.52, 0.36), sail=(0.72, 0.60, 0.42), wear=1.0),
    'sailer': dict(top=(0.80, 0.77, 0.67), sheer=(0.22, 0.34, 0.27), anti=(0.36, 0.14, 0.10), bt=(0.62, 0.68, 0.66), inner=(0.66, 0.56, 0.40), sail=(0.60, 0.43, 0.31), wear=1.0),
    'work': dict(top=(0.15, 0.24, 0.33), sheer=(0.80, 0.78, 0.70), anti=(0.34, 0.12, 0.09), bt=(0.78, 0.72, 0.56), inner=(0.58, 0.48, 0.33), sail=(0.72, 0.60, 0.42), wear=1.2),
    'wreck': dict(top=(0.20, 0.30, 0.26), sheer=(0.52, 0.48, 0.38), anti=(0.26, 0.10, 0.08), bt=(0.55, 0.52, 0.44), inner=(0.36, 0.30, 0.22), sail=(0.72, 0.60, 0.42), wear=2.6),
}


# ------------------------------------------------------------------------------------------------- noise
def noise2(h, w, sx, sy, seed):
    """smooth value noise, feature size sx x sy texels, values 0..1"""
    rng = np.random.default_rng(seed)
    gx = int(w / sx) + 3; gy = int(h / sy) + 3
    g = rng.random((gy, gx)).astype(np.float32)
    x = (np.arange(w, dtype=np.float32) + 0.5) / sx; y = (np.arange(h, dtype=np.float32) + 0.5) / sy
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    fxx = fx[None, :]; fyy = fy[:, None]
    return (a * (1 - fxx) + b * fxx) * (1 - fyy) + (c * (1 - fxx) + d * fxx) * fyy


def fbm2(h, w, sx, sy, seed, octaves=3):
    tot = 0.0; amp = 1.0; norm = 0.0
    for o in range(octaves):
        tot = tot + amp * noise2(h, w, max(1.0, sx / 2 ** o), max(1.0, sy / 2 ** o), seed + 31 * o); norm += amp; amp *= 0.5
    return tot / norm


def sst(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)


def mix(a, b, t):
    a = np.asarray(a, np.float32); b = np.asarray(b, np.float32); t = np.asarray(t, np.float32)
    return a * (1 - t[..., None]) + b * t[..., None]


def srgb_to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


# ------------------------------------------------------------------------------------------------- layout helpers (shared with the model)
def band_rect(inner, side, k):
    """(x, y, w, h, pad) of a plank band in canonical texels. side 0 = port, 1 = starboard"""
    bi = side * NB + k
    if inner: return (0, Y_I + bi * BAND_I, W0, BAND_I, PAD_I)
    return (0, Y_O + bi * BAND_O, W0, BAND_O, PAD_O)


def band_uv(inner, side, k, u, s):
    """texture coordinates for a point on a plank: u 0..1 along the hull (stern to bow), s 0..1 across the strake (0 lower edge). u and s are arrays."""
    x, y, w, h, pad = band_rect(inner, side, k)
    px = x + 0.5 + np.clip(u, 0, 1) * (w - 1)
    py = y + h - pad - np.clip(s, 0, 1) * (h - 2 * pad)          # lower edge at the bottom of the band
    return np.stack([px / W0, py / H0], -1)


def sw_uv(name, a, b):
    """map local (a, b) in 0..1 (b up) onto a swatch with an inset"""
    x, y, w, h = SW[name]
    a = SWATCH_INSET + np.clip(a, 0, 1) * (1 - 2 * SWATCH_INSET); b = SWATCH_INSET + np.clip(b, 0, 1) * (1 - 2 * SWATCH_INSET)
    return np.stack([(x + a * w) / W0, (y + (1 - b) * h) / H0], -1)


# ------------------------------------------------------------------------------------------------- swatches (colour, height, roughness, metal, occlusion)
def _wood(w, h, seed, base, dark, grain=1.0, wear=0.5, knots=2, streak=0.5, split=0.0):
    """grain runs along x"""
    n1 = fbm2(h, w, 70, 1.6, seed, 3); n2 = noise2(h, w, 18, 5, seed + 5); n3 = noise2(h, w, 300, 24, seed + 9)
    ring = 0.5 + 0.5 * np.sin((np.arange(h)[:, None] * 0.55 + n1 * 5.0 + n3 * 3) * 1.7)
    g = np.clip(0.55 * n1 + 0.25 * ring + 0.2 * n2, 0, 1)
    col = mix(np.array(base, np.float32), np.array(dark, np.float32), np.clip((g - 0.35) * 1.7 * grain, 0, 1))
    rng = np.random.default_rng(seed + 77)
    for _ in range(knots):
        cx = rng.uniform(0.1, 0.9) * w; cy = rng.uniform(0.2, 0.8) * h; r = rng.uniform(2, 4)
        yy, xx = np.mgrid[0:h, 0:w]; d = np.hypot((xx - cx) / 2.2, yy - cy) / r
        col = mix(col, np.array(dark, np.float32) * 0.55, np.clip(1.2 - d, 0, 1) * 0.8)
    wr = sst(1 - wear, 1.0, fbm2(h, w, 40, 6, seed + 3, 3)); col = mix(col, np.array((0.50, 0.47, 0.42), np.float32) * np.mean(base) / 0.5, wr * 0.45 * streak)
    ht = (0.35 * ring + 0.5 * n1 - 0.2 * wr + 0.15 * noise2(h, w, 3, 2, seed + 4)).astype(np.float32)
    ro = np.clip(0.78 + 0.2 * wr - 0.1 * g, 0.3, 1.0); me = np.zeros((h, w), np.float32); ao = np.clip(0.9 + 0.1 * g, 0, 1)
    return col, ht * 0.5, ro, me, ao


def _rope(w, h, seed, base):
    x = np.arange(w)[None, :].astype(np.float32); y = np.arange(h)[:, None].astype(np.float32)
    tw = 0.5 + 0.5 * np.sin((x * 0.55 + y * 1.9) * 1.0)           # twist: diagonal ridges across the rope
    n = fbm2(h, w, 14, 3, seed, 3)
    col = mix(np.array(base, np.float32), np.array(base, np.float32) * 0.45, np.clip(0.5 * (1 - tw) + 0.35 * n, 0, 1)); ht = tw * 0.9
    return col, ht, np.full((h, w), 0.95, np.float32), np.zeros((h, w), np.float32), 0.55 + 0.45 * tw


def _flat(w, h, seed, base, var=0.15, rough=0.8, metal=0.0, ht=0.0, rust=None, chips=None, sx=30, sy=6):
    n = fbm2(h, w, sx, sy, seed, 3); col = mix(np.array(base, np.float32) * (1 - var), np.array(base, np.float32) * (1 + var), n)
    if rust is not None:
        rm = sst(0.55, 0.8, fbm2(h, w, 12, 5, seed + 2, 3)); col = mix(col, np.array(rust, np.float32), rm * 0.85)
    if chips is not None:
        cm = sst(0.62, 0.7, fbm2(h, w, 8, 5, seed + 3, 3)); col = mix(col, np.array(chips, np.float32), cm)
    return col, n * ht, np.full((h, w), rough, np.float32), np.full((h, w), metal, np.float32), np.full((h, w), 1.0, np.float32)


def swatch(name, w, h, seed, pal):
    """returns colour (h,w,3), height (h,w), roughness, metal, ao"""
    s = seed + sum(ord(c) for c in name) * 13
    if name == 'thwart': return _wood(w, h, s, (0.66, 0.54, 0.36), (0.45, 0.34, 0.21), 1.0, 0.7, 2, 0.7)
    if name == 'floor':
        c, ht, ro, me, ao = _wood(w, h, s, (0.38, 0.28, 0.17), (0.22, 0.16, 0.10), 1.0, 0.5, 1, 0.3)
        salt = sst(0.62, 0.8, fbm2(h, w, 30, 7, s + 8, 3)); c = mix(c, np.array((0.62, 0.58, 0.5), np.float32), salt * 0.55)
        for gx in (1, w // 2):
            pass
        return c, ht, ro, me, ao
    if name == 'rib': return _wood(w, h, s, (0.43, 0.30, 0.18), (0.26, 0.17, 0.10), 1.0, 0.4, 1, 0.3)
    if name == 'oar':
        c, ht, ro, me, ao = _wood(w, h, s, (0.74, 0.64, 0.46), (0.52, 0.42, 0.28), 0.8, 0.8, 1, 0.8)
        c[:, int(w * 0.80):] = mix(c[:, int(w * 0.80):], np.array((0.30, 0.42, 0.40), np.float32), 0.55)           # painted blade end
        return c, ht, ro, me, ao
    if name == 'gunwale': return _wood(w, h, s, (0.46, 0.37, 0.27), (0.30, 0.23, 0.16), 0.9, 0.9, 1, 0.8)
    if name == 'keel':
        c, ht, ro, me, ao = _wood(w, h, s, (0.34, 0.27, 0.19), (0.10, 0.085, 0.07), 1.2, 0.6, 0, 0.5)
        tar = sst(0.35, 0.6, fbm2(h, w, 40, 8, s + 2, 3)); return mix(c, np.array((0.07, 0.06, 0.05), np.float32), tar * 0.8), ht, ro, me, ao
    if name == 'rope': return _rope(w, h, s, (0.60, 0.48, 0.30))
    if name == 'spar': return _wood(w, h, s, (0.60, 0.44, 0.26), (0.40, 0.27, 0.15), 0.9, 0.6, 2, 0.4)
    if name == 'iron': return _flat(w, h, s, (0.12, 0.105, 0.10), 0.2, 0.55, 0.8, 0.2, rust=(0.36, 0.17, 0.07))
    if name == 'leather': return _flat(w, h, s, (0.30, 0.18, 0.09), 0.25, 0.6, 0.0, 0.3)
    if name == 'tar': return _flat(w, h, s, (0.06, 0.055, 0.05), 0.2, 0.35, 0.0, 0.1)
    if name == 'buoy': return _flat(w, h, s, (0.78, 0.33, 0.08), 0.2, 0.5, 0.0, 0.1, chips=(0.62, 0.58, 0.5))
    if name == 'paintw': return _flat(w, h, s, (0.74, 0.72, 0.64), 0.12, 0.6, 0.0, 0.1, chips=(0.45, 0.42, 0.36))
    if name == 'net':
        x = np.arange(w)[None, :]; y = np.arange(h)[:, None]
        m = (((x + y) % 12) < 2) | (((x - y) % 12) < 2); n = fbm2(h, w, 20, 8, s, 3)
        col = np.where(m[..., None], np.array((0.22, 0.24, 0.15), np.float32) * (0.7 + 0.5 * n[..., None]), np.array((0.05, 0.05, 0.04), np.float32))
        return col.astype(np.float32), m.astype(np.float32) * 0.8, np.full((h, w), 0.95, np.float32), np.zeros((h, w), np.float32), np.where(m, 1.0, 0.4).astype(np.float32)
    if name == 'crate':
        c, ht, ro, me, ao = _wood(w, h, s, (0.60, 0.54, 0.45), (0.42, 0.37, 0.30), 1.0, 0.95, 2, 0.9)
        return c, ht, ro, me, ao
    if name == 'canvas':
        x = np.arange(w)[None, :].astype(np.float32); y = np.arange(h)[:, None].astype(np.float32)
        weave = 0.5 + 0.25 * np.sin(x * 2.4) + 0.25 * np.sin(y * 2.4); pan = np.floor(x / (w / 5.0))             # five panels across, stitched
        seam = (np.abs((x % (w / 5.0))) < 1.3).astype(np.float32); tone = noise2(h, w, 60, 40, s) * 0.5 + 0.5 * noise2(h, w, 7, 7, s + 1)
        base = np.array(pal.get('sail', (0.72, 0.6, 0.42)), np.float32)
        col = mix(base * 0.88, base * 1.06, 0.4 * tone + 0.15 * (pan % 2)[..., None][..., 0] * np.ones_like(tone))
        stain = sst(0.65, 0.85, fbm2(h, w, 50, 30, s + 6, 3)); col = mix(col, base * 0.55, stain * 0.55)
        col = mix(col, base * 0.55, seam * 0.5); hem = (y < 7) | (y > h - 7) | (x < 7) | (x > w - 7); col = mix(col, base * 0.7, hem.astype(np.float32) * 0.5)
        ht = weave * 0.35 - seam * 0.8; return col.astype(np.float32), ht.astype(np.float32), np.full((h, w), 0.92, np.float32), np.zeros((h, w), np.float32), (0.85 + 0.15 * weave).astype(np.float32)
    if name == 'deck':
        y = np.arange(h)[:, None]; seam = ((y % 16) < 2).astype(np.float32)
        c, ht, ro, me, ao = _wood(w, h, s, (0.60, 0.50, 0.33), (0.40, 0.31, 0.20), 1.0, 0.9, 3, 0.9)
        c = mix(c, np.array((0.05, 0.045, 0.04), np.float32), seam * 0.85); return c, ht - seam * 0.6, ro, me, ao * (1 - 0.5 * seam)
    if name == 'cabin':
        y = np.arange(h)[:, None].astype(np.float32); seam = ((y % 20) < 2).astype(np.float32)
        c, ht, ro, me, ao = _flat(w, h, s, (0.76, 0.74, 0.66), 0.12, 0.65, 0.0, 0.1, chips=(0.42, 0.38, 0.30), sx=40, sy=10)
        c = mix(c, np.array((0.30, 0.28, 0.24), np.float32), seam * 0.6); return c, ht - seam * 0.5, ro, me, ao
    if name == 'sack':
        x = np.arange(w)[None, :].astype(np.float32); y = np.arange(h)[:, None].astype(np.float32); wv = 0.5 + 0.25 * np.sin(x * 1.9) + 0.25 * np.sin(y * 1.9); n = fbm2(h, w, 16, 10, s, 3)
        return mix(np.array((0.58, 0.47, 0.30), np.float32) * 0.8, np.array((0.62, 0.52, 0.34), np.float32), n * 0.7 + 0.3 * wv), wv * 0.4, np.full((h, w), 0.95, np.float32), np.zeros((h, w), np.float32), np.full((h, w), 1.0, np.float32)
    if name == 'glass': return _flat(w, h, s, (0.035, 0.06, 0.07), 0.3, 0.12, 0.0, 0.0)
    if name == 'barrel':
        c, ht, ro, me, ao = _wood(w, h, s, (0.42, 0.30, 0.18), (0.26, 0.18, 0.10), 1.0, 0.6, 1, 0.3)
        x = np.arange(w)[None, :]; hoop = ((x % (w // 4)) < 5).astype(np.float32) * 0.9 * np.ones((h, 1), np.float32)
        return mix(c, np.array((0.11, 0.10, 0.10), np.float32), hoop), ht + hoop * 0.5, np.where(hoop > 0.5, 0.5, ro), np.where(hoop > 0.5, 0.7, me), ao
    if name == 'sand':
        n = fbm2(h, w, 4, 4, s, 3); return mix(np.array((0.62, 0.53, 0.37), np.float32), np.array((0.46, 0.38, 0.25), np.float32), n), n * 0.5, np.full((h, w), 1.0, np.float32), np.zeros((h, w), np.float32), np.full((h, w), 1.0, np.float32)
    if name == 'weed':
        n = fbm2(h, w, 10, 5, s, 3); return mix(np.array((0.10, 0.12, 0.04), np.float32), np.array((0.26, 0.24, 0.08), np.float32), n), n * 0.6, np.full((h, w), 0.6, np.float32), np.zeros((h, w), np.float32), np.full((h, w), 1.0, np.float32)
    return _flat(w, h, s, (0.5, 0.5, 0.5))


# ------------------------------------------------------------------------------------------------- hull bands
def outer_band(spec, side, k, w, h, pad, seed, zf):
    """colour and maps for one outer strake band. spec has: ns (strakes), pal, th (lap step), seams (butt positions), L. zf(u, t) -> height above the waterline (m)."""
    pal = spec['pal']; ns = spec['ns']; wear = pal['wear'] * spec.get('wear', 1.0)
    inner_h = h - 2 * pad
    u = (np.arange(w, dtype=np.float32) + 0.5) / w
    sr = np.clip((h - pad - (np.arange(h, dtype=np.float32) + 0.5)) / inner_h, -0.05, 1.05)          # s from the lower edge up
    t0, t1 = k / ns, (k + 1) / ns
    tt = t0 + (t1 - t0) * np.clip(sr, 0, 1)
    U = np.broadcast_to(u[None, :], (h, w)); T = np.broadcast_to(tt[:, None], (h, w)); S = np.broadcast_to(np.clip(sr, 0, 1)[:, None], (h, w))
    z = zf(U, T)                                                                                     # metres above the waterline
    sd = seed + 101 * k + 7919 * side
    # real lengths for texel metrics: the strake is about L long and (stake height) wide
    Lm = spec['L']; wm = max(0.05, float(np.mean(zf(np.full(8, 0.5), np.full(8, t1)) - zf(np.full(8, 0.5), np.full(8, t0)))) * 1.15)
    xm = U * Lm
    # base paint
    topc = np.array(pal['sheer'] if k == ns - 1 else pal['top'], np.float32); anti = np.array(pal['anti'], np.float32); bt = np.array(pal['bt'], np.float32)
    wob = (noise2(h, w, 60, 6, sd + 1) - 0.5) * 0.012                                                 # a hand-painted, slightly wavy waterline
    zb = z + wob
    col = np.broadcast_to(topc, (h, w, 3)).copy()
    col = mix(col, anti, (zb < 0.054).astype(np.float32))
    col = mix(col, bt, ((zb > -0.014) & (zb < 0.054)).astype(np.float32))
    # slight tone differences per plank, and a replaced, newer plank section
    tone = 0.93 + 0.14 * noise2(h, w, 200, 30, sd + 2); col = col * tone[..., None]
    rng = np.random.default_rng(sd)
    butts = sorted(rng.uniform(0.12, 0.88, 2)) if k % 2 == 0 else sorted(rng.uniform(0.2, 0.8, 1))
    newp = np.zeros((h, w), np.float32)
    if rng.random() < 0.55 * min(1.5, wear):
        a = rng.uniform(0.15, 0.7); b = a + rng.uniform(0.12, 0.25); newp = ((U > a) & (U < b)).astype(np.float32)
        col = mix(col, np.array((0.55, 0.44, 0.30), np.float32), newp * 0.55)
    # wood grain and bare wood under the paint
    grain = fbm2(h, w, 90, 1.5, sd + 3, 3)
    wood = mix(np.array((0.47, 0.42, 0.35), np.float32), np.array((0.28, 0.25, 0.21), np.float32), grain) * (0.9 + 0.2 * noise2(h, w, 150, 20, sd + 4))[..., None] * (1.0 - 0.22 * min(1.0, max(0.0, wear - 1.0)))
    # paint loss: edges of the strake, the bow, the gunwale and the keel line, the waterline scuffs, plus patches
    edge = np.maximum(sst(0.18, 0.0, S), sst(0.9, 1.0, S) * 0.7)
    bow = sst(0.82, 1.0, U) + sst(0.07, 0.0, U) * 0.6
    scuff = sst(0.14, 0.0, np.abs(zb - 0.02)) * 0.6
    lowk = sst(0.12, 0.0, T) * 0.8 if k == 0 else 0.0
    nloss = fbm2(h, w, 55, 8, sd + 5, 4)
    loss = np.clip((nloss - 0.5) * 2.2 + 0.30 * edge + 0.30 * bow + 0.25 * scuff + lowk + (wear - 1.0) * 0.5 + (0.6 if k == 0 else 0.0) * 0.0, 0, 1)
    pm = sst(0.52, 0.62, loss * (0.55 + 0.45 * np.minimum(wear, 1.6)))
    col = mix(col, wood, np.clip(pm, 0, 1))
    chipedge = np.clip(pm - sst(0.52, 0.62, loss * 0.9 * (0.55 + 0.45 * np.minimum(wear, 1.6)) - 0.02), 0, 1)
    # below the water: red or black antifoul gets chalky, scuffed, and barnacles then weed grow in a band at the waterline
    under = (zb < 0.0).astype(np.float32)
    slime = np.clip(sst(0.05, -0.02, zb) * sst(-0.36, -0.08, zb), 0, 1) * (0.5 + 0.8 * fbm2(h, w, 45, 8, sd + 6, 3)); slime = np.clip(slime * 1.15, 0, 0.9)
    col = mix(col, np.array((0.13, 0.19, 0.07), np.float32), slime * np.clip(wear, 0.5, 1.4) * 0.8)
    weed = sst(0.7, 0.82, fbm2(h, w, 30, 5, sd + 7, 3)) * sst(0.04, -0.03, zb) * sst(-0.28, -0.04, zb)
    col = mix(col, np.array((0.06, 0.09, 0.04), np.float32), weed * 0.8)
    bar = (noise2(h, w, 3.2, 3.2, sd + 8) > 0.84).astype(np.float32) * sst(-0.015, -0.05, zb) * sst(-0.4, -0.16, zb) * 1.0
    col = mix(col, np.array((0.66, 0.64, 0.58), np.float32), bar * 0.7)
    # tar in the laps: a dark line along the lower edge of the strake, and bled streaks below the nails
    tarline = sst(0.0, 0.10, 0.10 - S) * 0.75
    col = mix(col, np.array((0.045, 0.04, 0.035), np.float32), tarline * 0.7)
    for b in butts:                                                                                   # plank butt joint: a thin vertical dark line
        d = np.abs(U - b) * Lm; col = mix(col, np.array((0.05, 0.045, 0.04), np.float32), sst(0.012, 0.0, d) * 0.9)
    # rivets (roves) along the lap, every ~9 cm at s = 0.14, and rust streaks under them
    pitch = 0.09; ph = (xm / pitch) % 1.0; dx = (np.minimum(ph, 1 - ph)) * pitch; dy = np.abs((S - 0.13) * wm)
    rv = np.clip(1 - np.hypot(dx, dy) / 0.0055, 0, 1)
    col = mix(col, np.array((0.10, 0.085, 0.075), np.float32), (rv > 0.2).astype(np.float32) * 0.9)
    rustst = np.clip(1 - dx / 0.0055, 0, 1) * (S <= 0.13) * sst(-0.05, 0.1, 0.13 - S) * (noise2(h, w, 40, 3, sd + 9) > 0.35)
    col = mix(col, np.array((0.36, 0.17, 0.08), np.float32), rustst * 0.45 * np.minimum(wear, 1.5) * (1 - under))
    # grime, salt and general age: darker near the lap lines on the upper face, lightened and chalky on exposed paint
    dirt = fbm2(h, w, 80, 14, sd + 10, 3); col = col * (0.88 + 0.22 * dirt)[..., None]
    col = mix(col, np.array((0.70, 0.69, 0.65), np.float32), sst(0.72, 0.9, fbm2(h, w, 100, 12, sd + 11, 3)) * 0.2 * (1 - under) * (1 - pm))
    col = np.clip(col, 0, 1)
    # height (mm-ish scale): grain, seams, rivets, paint thickness steps
    ht = 0.5 * grain * (0.4 + 0.6 * pm) - 0.9 * sst(0.07, 0.0, S) + 0.9 * (rv > 0.2)
    for b in butts: ht = ht - 0.7 * sst(0.012, 0.0, np.abs(U - b) * Lm)
    ht = ht + 0.35 * pm - 0.35 * (1 - pm)                                                              # paint sits proud of bare wood
    ht = ht + 0.3 * bar + 0.25 * weed
    rough = np.clip(0.52 + 0.30 * pm + 0.12 * (1 - slime) + 0.18 * loss - 0.18 * (slime > 0.15) - 0.1 * under, 0.25, 1.0)
    metal = (rv > 0.2).astype(np.float32) * 0.8
    ao = np.clip(1.0 - 0.55 * sst(0.16, 0.0, S) - 0.35 * (rv > 0.2) - 0.25 * grain * pm, 0.15, 1.0)
    return col.astype(np.float32), ht.astype(np.float32), rough.astype(np.float32), metal, ao.astype(np.float32)


def inner_band(spec, side, k, w, h, pad, seed, zf):
    pal = spec['pal']; wear = pal['wear'] * spec.get('wear', 1.0)
    u = (np.arange(w, dtype=np.float32) + 0.5) / w; sr = np.clip((h - pad - (np.arange(h, dtype=np.float32) + 0.5)) / (h - 2 * pad), 0, 1)
    U = np.broadcast_to(u[None, :], (h, w)); S = np.broadcast_to(sr[:, None], (h, w)); ns = spec['ns']
    sd = seed + 733 * k + 31 * side
    base = np.array(pal['inner'], np.float32); gr = fbm2(h, w, 80, 1.4, sd, 3)
    col = mix(base * 0.95, base * 0.55, gr)
    zl = (k / ns); dark = sst(0.45, 0.0, zl + S / ns) * 0.55                                           # darker, wetter at the bottom
    col = mix(col, np.array((0.10, 0.075, 0.05), np.float32), np.clip(dark * 1.25, 0, 1) * (0.7 + 0.3 * fbm2(h, w, 40, 6, sd + 1, 3)))
    col = mix(col, np.array((0.62, 0.59, 0.52), np.float32), sst(0.65, 0.8, fbm2(h, w, 60, 8, sd + 2, 3)) * 0.35 * (zl > 0.2))   # salt bloom
    col = mix(col, np.array((0.04, 0.035, 0.03), np.float32), sst(0.1, 0.0, S) * 0.55)
    ht = 0.4 * gr - 0.8 * sst(0.12, 0.0, S)
    return np.clip(col, 0, 1).astype(np.float32), ht.astype(np.float32), np.full((h, w), 0.85, np.float32), np.zeros((h, w), np.float32), np.clip(1 - 0.5 * sst(0.2, 0.0, S) - 0.35 * dark, 0.2, 1).astype(np.float32)


# ------------------------------------------------------------------------------------------------- atlas
def normal_from_height(ht, gain):
    gy, gx = np.gradient(ht.astype(np.float32))
    n = np.stack([-gx * gain, +gy * gain, np.ones_like(ht)], -1)           # +Y up the image: height rises downward in rows -> green = +d/drow
    n /= np.linalg.norm(n, axis=-1, keepdims=True); return n * 0.5 + 0.5


def bake(spec, scale=1.0, seed=7, zf=None, only_parts=None):
    """-> dict(color (H,W,3) srgb 0..1, normal, orm). scale 1.0 = 1024 x 1152 canonical texels, 0.5 = half"""
    sp = spec['pal']; Wp, Hp = int(W0 * scale), int(H0 * scale)
    color = np.zeros((Hp, Wp, 3), np.float32); ht = np.zeros((Hp, Wp), np.float32); ro = np.full((Hp, Wp), 0.8, np.float32); me = np.zeros((Hp, Wp), np.float32); ao = np.ones((Hp, Wp), np.float32)
    color[...] = np.array(sp['inner'], np.float32)
    def put(x, y, w, h, c, hh, r, m, a):
        xs, ys, ws, hs = int(x * scale), int(y * scale), max(1, int(w * scale)), max(1, int(h * scale))
        color[ys:ys + hs, xs:xs + ws] = c[:hs, :ws]; ht[ys:ys + hs, xs:xs + ws] = hh[:hs, :ws]; ro[ys:ys + hs, xs:xs + ws] = r[:hs, :ws]; me[ys:ys + hs, xs:xs + ws] = m[:hs, :ws]; ao[ys:ys + hs, xs:xs + ws] = a[:hs, :ws]
    def pad_rows(y, h, pad):   # repeat the edge rows into the band's padding so mip and filtering do not bleed the neighbour
        ys, hs, ps = int(y * scale), max(1, int(h * scale)), max(1, int(round(pad * scale)))
        for arr in (color, ht, ro, me, ao):
            arr[ys:ys + ps] = arr[ys + ps:ys + ps + 1]; arr[ys + hs - ps:ys + hs] = arr[ys + hs - ps - 1:ys + hs - ps]
    ns = spec['ns']
    for side in (0, 1):
        for k in range(ns):
            x, y, w, h, pad = band_rect(False, side, k); wp, hp, pp = max(1, int(w * scale)), max(1, int(h * scale)), max(1, int(round(pad * scale)))
            r = outer_band(spec, side, k, wp, hp, pp, seed, zf); put(x, y, w, h, *r); pad_rows(y, h, pad)
            x, y, w, h, pad = band_rect(True, side, k); wp, hp, pp = max(1, int(w * scale)), max(1, int(h * scale)), max(1, int(round(pad * scale)))
            r = inner_band(spec, side, k, wp, hp, pp, seed, zf); put(x, y, w, h, *r); pad_rows(y, h, pad)
    for name, (x, y, w, h) in SW.items():
        wp, hp = max(8, int(w * scale)), max(4, int(h * scale))
        r = swatch(name, wp, hp, seed, sp); r = [np.broadcast_to(a, (hp, wp) + a.shape[2:]) if a.shape[:2] != (hp, wp) else a for a in r]
        put(x, y, w, h, *r)
    nrm = normal_from_height(ht, 2.2 * (1.0 if scale >= 1 else 0.7))
    orm = np.stack([ao, ro, me], -1)
    return dict(color=np.clip(color, 0, 1), normal=nrm, orm=orm)


def encode(maps, scale, q=(62, 70, 46)):
    import collector_jpeg as J
    def to8(a): return (np.clip(a, 0, 1) * 255.0 + 0.5).astype(np.uint8)
    def down(a, f):
        if f == 1: return a
        h, w = a.shape[:2]; return a.reshape(h // f, f, w // f, f, -1).mean((1, 3))
    f = 2 if scale >= 1 else 2
    return (J.jpeg_bytes(to8(maps['color']), q[0], subsample=True), J.jpeg_bytes(to8(down(maps['normal'], f)), q[1], chroma_scale=0.6), J.jpeg_bytes(to8(down(maps['orm'], f)), q[2], chroma_scale=0.6))
