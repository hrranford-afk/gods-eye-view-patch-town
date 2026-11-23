"""Shared, seeded, deterministic island generator (numpy only, no bpy needed for the maths).
Frame: u = east, v = north, h = up (metres), sea level 0. Blender uses (X,Y,Z)=(u,v,h).
`python island_common.py [seed]` prints the mesh hash (determinism check)."""
import hashlib, sys
import numpy as np

HALF = 28.0          # land mesh covers +-28 m
CAMP = (-1.5, -7.0)  # camp centre (south side, the camera side)

def _lat(ix, iz, seed):
    # integer lattice hash -> [0,1), vectorised, platform independent (uint64 maths)
    h = (ix.astype(np.uint64) * np.uint64(374761393) + iz.astype(np.uint64) * np.uint64(668265263)
         + np.uint64(seed) * np.uint64(2246822519)) & np.uint64(0xFFFFFFFF)
    h = ((h ^ (h >> np.uint64(13))) * np.uint64(1274126177)) & np.uint64(0xFFFFFFFF)
    h = h ^ (h >> np.uint64(16))
    return (h & np.uint64(0xFFFF)).astype(np.float64) / 65536.0

def vnoise(x, z, seed):
    ix = np.floor(x); iz = np.floor(z); fx = x - ix; fz = z - iz
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz)
    a = _lat(ix, iz, seed); b = _lat(ix + 1, iz, seed); c = _lat(ix, iz + 1, seed); d = _lat(ix + 1, iz + 1, seed)
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz

def fbm(x, z, seed, octs=5, lac=2.0, gain=0.5):
    s = 0; a = 1; tot = 0
    for o in range(octs):
        s = s + a * vnoise(x, z, seed + o * 17); tot += a; x = x * lac + 31.7; z = z * lac - 12.3; a *= gain
    return s / tot

def ridged(x, z, seed, octs=5):
    s = 0; a = 1; tot = 0
    for o in range(octs):
        n = 1 - np.abs(2 * vnoise(x, z, seed + o * 29) - 1); n = n * n
        s = s + a * n; tot += a; x = x * 2.1 + 7.7; z = z * 2.1 - 3.1; a *= 0.5
    return s / tot

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

LEGACY_SEED = 1122   # this seed keeps the original island exactly (the cloud's pilot renders and tests)

# Island type from the per-seed recipe (recipe.py). STYLE=None keeps every earlier behaviour bit for bit (seed 1122 and the old batches).
# STYLE is a plain dict: type (plain/sandbar/volcanic/cliffs/lagoon/archipelago), shape (overrides shape_params), blobs, peak, phase. set_style() also moves CAMP.
STYLE = None

def set_style(style=None, camp=None):
    global STYLE, CAMP
    STYLE = style
    CAMP = tuple(camp) if camp is not None else (-1.5, -7.0)

def shape_params(seed):
    """Seed-derived island shape. Seed 1122 gives the legacy values. Other seeds vary size, aspect, tilt, a second lobe and
    which side is the high rocky back, so different seeds give visibly different islands (the camp clearing is kept)."""
    if STYLE is not None and 'shape' in STYLE:
        return dict(STYLE['shape'])
    if seed == LEGACY_SEED:
        return dict(a=17.5, b=12.5, tilt=0.35, lobe=0.0, lob_u=0.0, lob_v=0.0, lob_r=1.0, back_ang=np.arctan2(0.8, -0.55), rough=0.16)
    r = np.random.default_rng(seed * 7919 + 13)
    a = float(r.uniform(13.5, 20.0)); b = float(r.uniform(9.0, 14.5))
    return dict(a=a, b=b, tilt=float(r.uniform(-0.6, 0.9)),
                lobe=float(r.uniform(0.0, 1.0) > 0.45),               # about half the seeds get a second lobe (a headland or islet joined to the main land)
                lob_u=float(r.uniform(-12, 12)), lob_v=float(r.uniform(-4, 11)), lob_r=float(r.uniform(0.45, 0.8)),
                back_ang=float(r.uniform(0, 2 * np.pi)), rough=float(r.uniform(0.10, 0.30)))

def _dist(wu, wv, P):
    ca, sa = np.cos(P['tilt']), np.sin(P['tilt'])
    pu = wu * ca + wv * sa; pv = -wu * sa + wv * ca
    d = np.sqrt((pu / P['a']) ** 2 + (pv / P['b']) ** 2)
    if STYLE is not None and STYLE.get('blobs'):
        # archipelago: several separate islets, each an ellipse (u0, v0, ra, rb, tilt); d is the smallest normalised distance
        d = None
        for (bu, bv, ra, rb, bt) in STYLE['blobs']:
            c_, s_ = np.cos(bt), np.sin(bt); du = wu - bu; dv = wv - bv
            dd = np.sqrt(((du * c_ + dv * s_) / ra) ** 2 + ((-du * s_ + dv * c_) / rb) ** 2)
            d = dd if d is None else np.minimum(d, dd)
    if P['lobe'] and not (STYLE is not None and STYLE.get('blobs')):
        d2 = np.sqrt(((wu - P['lob_u']) / (P['a'] * P['lob_r'])) ** 2 + ((wv - P['lob_v']) / (P['b'] * P['lob_r'])) ** 2)
        d = np.minimum(d, d2 * 1.05)
    return d, pu, pv

def _base(u, v, seed):
    """returns dict of arrays: h (metres), rock (0..1 rockiness), slope-free fields; all deterministic."""
    # domain warp for a ragged rocky coast
    wu = u + 3.2 * (fbm(u * .09, v * .09, seed + 1, 4) - .5) * 2
    wv = v + 3.2 * (fbm(u * .09 + 9, v * .09 - 4, seed + 2, 4) - .5) * 2
    # elongated island, long axis tilted (seed-derived; seed 1122 = legacy)
    P = shape_params(seed)
    d, pu, pv = _dist(wu, wv, P)                                  # 1 at nominal coast
    d_nom = d
    d = d * (1 + P['rough'] * (fbm(u * .21, v * .21, seed + 3, 4) - .5))
    dome = np.clip(1 - d * d, -2, 1)
    rid = ridged(u * .11, v * .11, seed + 5, 5)
    det = fbm(u * .5, v * .5, seed + 7, 4)
    inland = smooth(0.15, 0.95, 1 - d)
    # high rocky back (north-west), gentle toward camp
    back = smooth(-2, 12, u * np.cos(P['back_ang']) * 0.69 + v * np.sin(P['back_ang']) * 0.69) if seed != LEGACY_SEED else smooth(-2, 12, -(u * .55) + v * .8)
    h = dome * 3.0 + inland * (rid * 3.4 * (0.35 + back) + det * 0.5) - 0.35
    # rocky shoulder: a ragged cliff-and-ledge rim on the north, east and west coasts (the camp side stays beach)
    rockyside = smooth(-8, -1, v * 0.9 + 3.0 * (fbm(u * .17, v * .17, seed + 15, 3) - .5))
    rim = smooth(0.5, 0.85, d) * smooth(1.32, 0.95, d)
    h = h + rockyside * rim * (0.5 + 2.2 * ridged(u * .22, v * .22, seed + 31, 4))
    if STYLE is not None:
        h = _style_height(h, d, d_nom, u, v, pu, pv, seed)
    # camp clearing: gentle bench near sea level, grass
    dc = np.sqrt((u - CAMP[0]) ** 2 + ((v - CAMP[1]) * 1.3) ** 2)
    bench = (STYLE.get('bench', 0.55) if STYLE is not None else 0.55) + 0.12 * (fbm(u * .3, v * .3, seed + 9, 3) - .5)
    wc = smooth(9.5, 3.5, dc)
    land = h > 0
    h = np.where(land, h * (1 - wc) + np.maximum(bench, 0) * wc * (h > -0.2), h)
    return h, wc, pu, pv, rockyside, d_nom

def _style_height(h, d, d_nom, u, v, pu, pv, seed):
    """Island-type reshaping of the land height (sea stays as it is). Everything is smooth and deterministic."""
    t = STYLE.get('type', 'plain')
    land = h > 0
    if t == 'sandbar':          # long, low, nearly flat sand with a soft crest
        return np.where(land, np.minimum(h, 3.0) * 0.26 + 0.05 * fbm(u * .4, v * .4, seed + 41, 3), h)
    if t == 'volcanic':         # a cone with a crater, steep upper flanks, rocky; the beach ring stays
        pk = STYLE.get('peak', 10.0)
        cone = pk * np.clip(1 - d_nom, 0, 1) ** 1.35 + 1.1 * (ridged(u * .16, v * .16, seed + 43, 4) - .4) * smooth(0.0, 0.7, 1 - d_nom)
        crater = 0.6 * pk * smooth(0.20, 0.0, d_nom)
        return np.where(land, np.maximum(h * 0.35 + cone - crater, 0.05), h)
    if t == 'cliffs':           # a raised tableland with a steep ragged edge and a rough top
        top = smooth(0.12, 0.7, h) * (STYLE.get('cliff_h', 5.0) + 1.2 * (fbm(u * .13, v * .13, seed + 47, 3) - .5))
        return np.where(land, h * 0.3 + top, h)
    if t == 'lagoon':           # a ring reef island: low ring with gaps, a shallow lagoon in the middle
        ang = np.arctan2(pv, pu)
        ring = smooth(0.50, 0.66, d_nom) * smooth(1.02, 0.84, d_nom)
        gap = 1 - 0.85 * smooth(0.68, 0.97, np.sin(2 * ang + STYLE.get('phase', 0.0)) * 0.5 + 0.5 + 0.25 * (fbm(u * .2, v * .2, seed + 49, 2) - .5))
        hh = -0.25 + ring * gap * (1.35 + 0.7 * fbm(u * .35, v * .35, seed + 51, 3))
        lag = -0.45 * smooth(0.55, 0.30, d_nom)
        return np.where(d_nom < 1.12, np.minimum(hh + lag, 1.7), np.minimum(h, 0.0) - 0.35)
    return h

def height_fields(u, v, seed):
    """returns dict of arrays: h (metres), rock (0..1 rockiness); point-evaluable (no grid dependence)."""
    h, wc, pu, pv, rockyside, d_nom = _base(u, v, seed)
    e = 0.3
    hx = (_base(u + e, v, seed)[0] - _base(u - e, v, seed)[0]) / (2 * e)
    hy = (_base(u, v + e, seed)[0] - _base(u, v - e, seed)[0]) / (2 * e)
    slope = np.sqrt(hx * hx + hy * hy)
    coastband = smooth(2.2, 0.2, h) * (h > -0.35) * rockyside
    rock = np.clip(smooth(0.35, 0.9, slope) + coastband * 0.9 + smooth(3.2, 4.6, h) * .5, 0, 1)
    rock *= (1 - wc * 0.95)
    step = 0.34 + 0.08 * (fbm(u * .15, v * .15, seed + 11, 2) - .5)
    s = h / step
    terr = (np.floor(s) + smooth(0.0, 0.35, s - np.floor(s))) * step
    hm = np.where(h > -0.15, h * (1 - 0.6 * rock) + terr * 0.6 * rock, h)
    hm = hm + (fbm(u * 1.7, v * 1.7, seed + 13, 3) - .5) * 0.06 * rock
    # seabed shelf: shallow ring, then drop
    dist = d_nom
    sea_floor = -0.12 - 0.9 * smooth(0.9, 1.45, dist) - 2.9 * smooth(1.35, 2.3, dist)
    t = smooth(0.0, -0.8, hm)
    hm = np.where(hm < 0, hm * (1 - t) + (0.6 * hm + 0.4 * sea_floor) * t, hm)
    return {'h': hm, 'rock': rock, 'wc': wc, 'd': dist}

def grid(n, seed):
    xs = np.linspace(-HALF, HALF, n)
    u, v = np.meshgrid(xs, xs)
    f = height_fields(u, v, seed)
    return u, v, f

def mesh_hash(seed=1122, n=129):
    u, v, f = grid(n, seed)
    return hashlib.sha256(np.round(f['h'], 4).astype('<f4').tobytes()).hexdigest()[:16]

def height_at(x, y, seed):
    x = np.atleast_2d(np.asarray(x, float)); y = np.atleast_2d(np.asarray(y, float))
    return height_fields(x, y, seed)['h']

if __name__ == '__main__':
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1122
    print(mesh_hash(seed))
