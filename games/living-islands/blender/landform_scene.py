"""LANDFORM RENDER v0: draw an island (or a whole stretch of sea) from the land formation tool, not from the invented island.
Headless: blender -b --python landform_scene.py -- --province A --seed 2001 [--view hero|wide|top] [--w 1200 --h 800 --samples 80] [--out PATH]
Reuses li_scene.py (rock shader, boulders, tufts, conifers, sea, sky, render settings) and li_camp.py (tent, boat, fire).
One terrain mesh carries the whole window including the seabed, so the sea floor and the shelf can be seen through the water: each island is a
different peak of the one surface, cut by the sea plane at z = 0. Frame: x east, y north, z up, metres (same as the tool and the other scripts).
Deterministic: same (province, seed, size) gives the same mesh hash, the same island and the same camp site (print line LANDFORM_META).
Blender 3.6 patterns kept (S() for Mix sockets, Filmic fallback, sky type fallback live in li_scene.py)."""
import os, sys, math, time, json, hashlib, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'landform'))
import numpy as np
import world as W
import island_common as IC
import bpy
import li_scene as LS
import li_camp as LC

MAX_EXTENT_M = 200.0     # biggest island (bounding box side) we draw as a hero: the owner's believable scale, a few tens of metres up to ~150-250
MIN_AREA_M2 = 1500.0
GOOD_LANDING = 0.85      # score a landing must reach to count as good (see _score)
ROCK_SCALE = 3.0         # rock texture scale: cracks, lichen and grain sized for a 0.2-0.3 m pixel (the boulders of the camp scenes use 1.0)

# ---------------------------------------------------------------- small maths
def lin(rgb255):
    c = np.asarray(rgb255, float) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def upsample(a, k):
    """Catmull-Rom up-sampling of a 2-D grid by an integer factor: (n-1)*k+1 samples per axis, original samples kept."""
    a = np.asarray(a, np.float64)
    if k == 1:
        return a
    for ax in (0, 1):
        n = a.shape[ax]
        ap = np.pad(a, [(1, 2) if i == ax else (0, 0) for i in range(2)], mode='edge')
        outs = []
        for j in range(k):
            t = j / k
            wts = (-0.5 * t ** 3 + t ** 2 - 0.5 * t, 1.5 * t ** 3 - 2.5 * t ** 2 + 1, -1.5 * t ** 3 + 2 * t ** 2 + 0.5 * t, 0.5 * t ** 3 - 0.5 * t ** 2)
            outs.append(sum(wts[q] * np.take(ap, np.arange(q, q + n - 1), axis=ax) for q in range(4)))
        shp = list(a.shape); shp[ax] = (n - 1) * k
        a = np.concatenate([np.stack(outs, axis=ax + 1).reshape(shp), np.take(a, [n - 1], axis=ax)], axis=ax)
    return a

def bilinear(Z, ox, oy, d, x, y):
    """sample grid Z (row = y, col = x, origin ox,oy, spacing d) at points x,y (any shape)."""
    fx = np.clip((np.asarray(x, float) - ox) / d, 0, Z.shape[1] - 1.001); fy = np.clip((np.asarray(y, float) - oy) / d, 0, Z.shape[0] - 1.001)
    i = fx.astype(int); j = fy.astype(int); tx = fx - i; ty = fy - j
    return (Z[j, i] * (1 - tx) * (1 - ty) + Z[j, i + 1] * tx * (1 - ty) + Z[j + 1, i] * (1 - tx) * ty + Z[j + 1, i + 1] * tx * ty)

# ---------------------------------------------------------------- choosing the island and the landing
def island_extent(w, iid):
    ys, xs = np.nonzero(w.island_label == iid)
    return (xs.max() - xs.min() + 1) * w.dx, (ys.max() - ys.min() + 1) * w.dx

def touches_edge(w, iid, margin_m=14.0):
    """island cells within margin_m of the world edge: the window would run off the world (padding repeats the edge), so such islands are not drawn."""
    ys, xs = np.nonzero(w.island_label == iid); k = int(margin_m / w.dx); n = w.height.shape[0]
    return bool(xs.min() < k or ys.min() < k or xs.max() > n - 1 - k or ys.max() > n - 1 - k)

def _room(w, relaxed=False):
    """0..1: how much dry, gentle, high-enough ground lies within about 8 m (room for tents, a fire, a boat pulled up).
    relaxed=True accepts steeper and higher ground (basalt worlds have almost no gentle ground at this scale)."""
    if relaxed:
        ok = ((w.height > 1.2) & (w.height < 16.0) & (w.slope < 0.85)).astype(np.float64)
    else:
        ok = ((w.height > 1.5) & (w.height < 9.0) & (w.slope < 0.45) & (w.wetness < 0.7)).astype(np.float64)
    return W.blur(ok, 8, 1)

_KIND = {'sand': 1.0, 'gentle rock/turf': 0.8, 'shingle': 0.45, 'rock ledge': 0.2}

def _score(kind, exposure, slope, length, room):
    return _KIND.get(kind, 0.3) + (0.45 - exposure) * 1.5 - slope * 1.0 + min(length, 16.0) / 16.0 * 0.5 + room * 1.2

def pick_landing(w, iid):
    """Best sheltered landing for island iid: the tool's own candidates (gentle lee shore with depth offshore) scored by kind, exposure, slope,
    length and the dry room behind; if the tool found none (basalt worlds often have none) scan the island's shore cells the same way.
    Returns dict(xy, kind, source 'tool'|'scan', score, normal (unit vector pointing seaward), exposure, slope) or None. Deterministic."""
    room = _room(w)
    best = None
    for c in w.islands[iid - 1]['landing_candidates']:
        c0, r0 = int(round((c['xy'][0] + w.size_m / 2) / w.dx)), int(round((c['xy'][1] + w.size_m / 2) / w.dx))
        rm = float(room[min(max(r0, 0), room.shape[0] - 1), min(max(c0, 0), room.shape[1] - 1)])
        sc = _score(c['kind'], c['exposure'], c['slope'], c['length_m'], rm)
        if rm > 0.12 and (best is None or sc > best['score']):
            best = dict(xy=(float(c['xy'][0]), float(c['xy'][1])), kind=c['kind'], source='tool', score=float(sc), exposure=float(c['exposure']), slope=float(c['slope']))
    if best is None:
        land = w.island_label == iid
        water = ~land
        shore = land & (np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1)) & (w.height < 1.4)
        rr, cc = np.nonzero(shore & (room > 0.2))
        if len(rr) == 0:
            room = _room(w, relaxed=True) + 0.21; shore = shore | (land & (w.height < 3.0) & (np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1)))
            rr, cc = np.nonzero(shore & (room > 0.2))
        if len(rr) == 0:
            return None
        sc = np.array([_score('gentle rock/turf', w.exposure[r, c], w.slope[r, c], 6.0, room[r, c]) for r, c in zip(rr, cc)])
        k = int(np.argmax(sc))                      # first maximum: deterministic
        best = dict(xy=(float(w.X[rr[k], cc[k]]), float(w.Y[rr[k], cc[k]])), kind='scan (rock/turf shore)', source='scan', score=float(sc[k]),
                    exposure=float(w.exposure[rr[k], cc[k]]), slope=float(w.slope[rr[k], cc[k]]))
    # seaward normal from the smoothed surface
    hs = W.blur(w.height.astype(np.float64), 2, 2)
    gy, gx = np.gradient(hs, w.dx)
    c0 = int(round((best['xy'][0] + w.size_m / 2) / w.dx)); r0 = int(round((best['xy'][1] + w.size_m / 2) / w.dx))
    nx, ny = -gx[r0, c0], -gy[r0, c0]
    if math.hypot(nx, ny) < 1e-3:
        cx, cy = w.islands[iid - 1]['centroid']; nx, ny = best['xy'][0] - cx, best['xy'][1] - cy
    L = math.hypot(nx, ny); best['normal'] = (nx / L, ny / L)
    return best

def choose_island(w, island=None):
    """The best island of a world: the largest (bounding box <= MAX_EXTENT_M, area >= MIN_AREA_M2) whose best landing (the tool's candidate, else a
    scanned shore cell, see pick_landing) scores >= GOOD_LANDING; if none does, the one with the best score. island=N forces island N."""
    if island:
        return island, pick_landing(w, island)   # forced: no size or edge checks
    fallback = None
    for isl in w.islands:
        ex = max(island_extent(w, isl['id']))
        if isl['area_m2'] < MIN_AREA_M2 or ex > MAX_EXTENT_M or touches_edge(w, isl['id']):
            continue
        p = pick_landing(w, isl['id'])
        if p is None:
            continue
        if p['score'] >= GOOD_LANDING:
            return isl['id'], p
        if fallback is None or p['score'] > fallback[1]['score']:
            fallback = (isl['id'], p)
    if fallback:
        return fallback
    return 1, pick_landing(w, 1)

# ---------------------------------------------------------------- window arrays
def crop_like(w, arr, win):
    """crop a world array to the island_window cells (same indexing, edge padded)."""
    m = win['height'].shape[0]; dx = w.dx
    c0 = int(round((win['origin_xy'][0] + w.size_m / 2) / dx)); r0 = int(round((win['origin_xy'][1] + w.size_m / 2) / dx))
    p = np.pad(arr, m, mode='edge')
    return p[r0 + m:r0 + 2 * m, c0 + m:c0 + 2 * m].copy()

def full_window(w):
    win = {k: getattr(w, k).copy() for k in ('height', 'rock', 'exposure', 'wetness', 'veg')}
    win.update(island_mask=(w.island_label > 0).astype(np.uint8), origin_xy=(-w.size_m / 2, -w.size_m / 2), dx=w.dx, centre_xy=(0.0, 0.0),
               size_m=w.size_m, clipped=False, sea_level=w.sea_level, island=0)
    return win

# ---------------------------------------------------------------- terrain
VEG_PAL = {   # linear rgb pairs (a, b) blended by noise; rock-like cover (bare, lichen) is handled by the rock amount instead
    W.V_HEATHER: (lin((52, 38, 40)), lin((74, 58, 32))), W.V_BOG: (lin((46, 48, 28)), lin((72, 62, 34))),
    W.V_MACHAIR: (lin((78, 118, 40)), lin((108, 136, 52))), W.V_PASTURE: (lin((66, 104, 36)), lin((98, 122, 44))),
    W.V_TURF: (lin((84, 108, 46)), lin((118, 118, 56))), W.V_SCRUB: (lin((40, 66, 32)), lin((56, 76, 34))),
    W.V_SAND: (lin((226, 212, 170)), lin((206, 190, 148))), W.V_SHINGLE: (lin((140, 134, 124)), lin((112, 108, 100))),
    W.V_RUSH: (lin((96, 112, 52)), lin((128, 128, 64))), W.V_LOCH: (lin((38, 54, 52)), lin((52, 66, 58))),
    W.V_BARE: (lin((120, 112, 100)), lin((96, 90, 84))), W.V_LICHEN: (lin((120, 112, 100)), lin((96, 90, 84))), W.V_WATER: (lin((120, 112, 100)), lin((96, 90, 84))),
}

def bed_normal(w):
    """unit normal of the bedding / foliation planes (dip direction and angle from the shared structure)."""
    st = w.structure; dd = st['dip_dir']; t = math.tan(math.radians(st['dip_deg']))
    n = np.array([t * math.cos(dd), t * math.sin(dd), 1.0]); return n / np.linalg.norm(n)

def flatten_pad(H, X, Y, centre, level, r_in, r_out):
    r = np.hypot(X - centre[0], Y - centre[1])
    t = smooth(r_out, r_in, r)
    return H * (1 - t) + level * t

def build_terrain(w, win, up=2, seed=0, rim=0.0, camp=None):
    """Numpy only. Returns dict(H, X, Y, d, verts, quads, colours...). camp = dict(fire=(x,y), pad_level, pad_r) flattens a camp clearing."""
    dx = win['dx']; ox, oy = win['origin_xy']; m = win['height'].shape[0]
    d = dx / up
    H = upsample(win['height'], up)
    ny_, nx_ = H.shape
    X1 = ox + np.arange(nx_) * d; Y1 = oy + np.arange(ny_) * d
    X, Y = np.meshgrid(X1, Y1)
    # categorical maps: nearest cell after a small domain warp so contacts are wavy rather than stair-stepped
    wx = (IC.fbm(X / 5.0, Y / 5.0, seed + 301, 3) - 0.5) * 1.8 * dx; wy = (IC.fbm(X / 5.0 + 17, Y / 5.0 - 9, seed + 303, 3) - 0.5) * 1.8 * dx
    ci = np.clip(np.rint((X + wx - ox) / dx).astype(int), 0, m - 1); ri = np.clip(np.rint((Y + wy - oy) / dx).astype(int), 0, m - 1)
    rock = win['rock'][ri, ci]; veg = win['veg'][ri, ci]
    E = np.clip(upsample(win['exposure'], up), 0, 1); wet = np.clip(upsample(win['wetness'], up), 0, 1)
    wind = np.clip(upsample(win['wind_exposure'], up), 0, 1) if 'wind_exposure' in win else np.zeros_like(H)
    soil_t = np.array([r['soil_depth_m'] for r in W.ROCKS])
    soil = soil_t[rock]
    # camp clearing (a levelled pad; the tool's field has no level ground this small)
    if camp:
        H = flatten_pad(H, X, Y, camp['fire'], camp['level'], camp['r_in'], camp['r_out'])
    # skirt: the window's rim sinks into deep water so the block has no wall
    if rim > 0:
        edge = np.minimum(np.minimum(X - X1[0], X1[-1] - X), np.minimum(Y - Y1[0], Y1[-1] - Y))
        t = smooth(0.0, rim * (X1[-1] - X1[0]), edge)
        H = H * t + np.minimum(H, -40.0) * (1 - t)
    # slope on the final surface
    gy, gx = np.gradient(H, d); slope = np.hypot(gx, gy)
    n1 = IC.fbm(X / 3.0, Y / 3.0, seed + 311, 4); n2 = IC.fbm(X / 14.0, Y / 14.0, seed + 313, 3); n3 = IC.fbm(X / 1.1, Y / 1.1, seed + 317, 3)
    land = H > 0.0
    # ---- ground colour by vegetation id
    G = np.zeros(H.shape + (3,))
    for vid, (ca, cb) in VEG_PAL.items():
        sel = veg == vid
        if not sel.any():
            continue
        t = np.clip(n1 * 1.4 - 0.2, 0, 1)[sel][:, None]
        G[sel] = ca * (1 - t) + cb * t
    # heather and grass patches inside each other (a pure id colour reads as a flat carpet)
    pat = (n2 > 0.52)[..., None] & ((veg == W.V_HEATHER) | (veg == W.V_TURF) | (veg == W.V_PASTURE))[..., None]
    other = np.where((veg == W.V_HEATHER)[..., None], lin((64, 96, 36)), lin((70, 54, 40)))
    G = np.where(pat, 0.55 * G + 0.45 * other, G)
    G = G * (0.78 + 0.5 * n3)[..., None] * (0.88 + 0.24 * n2)[..., None]
    # ---- rock amount: bare / lichen veg, steep ground, thin soil outcrops, exposed splash zone
    thin = np.clip(1 - soil / 0.45, 0, 1)
    out_ = smooth(0.62, 0.8, n2 * 0.55 + n1 * 0.45 + thin * 0.22 - 0.06)
    rockamt = np.maximum.reduce([(veg == W.V_BARE) * 1.0, (veg == W.V_LICHEN) * 0.92, smooth(0.85, 1.4, slope), out_ * 0.95])
    splash = smooth(2.8, 1.0, H) * smooth(0.12, 0.4, E) * (rock != W.R_SAND) * (rock != W.R_COBBLE)
    rockamt = np.maximum(rockamt, splash * (0.6 + 0.4 * n3))
    sandy = (rock == W.R_SAND) | (veg == W.V_SAND) | (veg == W.V_SHINGLE)
    rockamt = np.where(sandy | (veg == W.V_LOCH), 0.0, rockamt)
    # ---- rock colours by id (fresh / weathered / lichen) and bedding spacing
    fresh = np.array([lin(r['colour_fresh']) for r in W.ROCKS])[rock]; weath = np.array([lin(r['colour_weathered']) for r in W.ROCKS])[rock]
    weath = 0.78 * (0.7 * weath + 0.3 * weath.mean(-1, keepdims=True))   # lichen crust and damp dull the table's weathered colour
    # gentle ground is weathered and lichen-crusted, steep faces and the wave-washed splash zone show fresh rock
    fr = np.clip(0.1 + smooth(0.5, 1.3, slope) * 0.6 + smooth(2.8, 0.5, H) * E * 0.5 + (n2 - 0.5) * 0.4, 0, 1)[..., None]
    fresh = weath + (fresh - weath) * fr
    lich = np.array([lin(r['colour_lichen']) for r in W.ROCKS])[rock]
    joint = np.array([r['joint_m'] for r in W.ROCKS])[rock]
    # ---- below the water: sediment where the bed is flat or the rule laid sand, kelp-stained rock elsewhere
    dep = -H
    under = dep > 0.0
    sed = ((rock == W.R_SAND) | ((slope < 0.2) & (dep > 1.2) & (rock != W.R_DYKE))) & under
    bed_sand = lin((196, 178, 128)) * (0.65 + 0.5 * n3)[..., None]
    bed_mud = lin((92, 84, 66)) * (0.7 + 0.5 * n3)[..., None]
    dsand = smooth(6.0, 22.0, dep)[..., None]
    sandcol = bed_sand * (1 - dsand) + bed_mud * dsand
    kelp = lin((58, 52, 26)); kmix = (smooth(0.0, 1.5, dep) * smooth(16.0, 6.0, dep) * (0.55 + 0.45 * n1))[..., None]
    rockbed = (0.5 * weath + 0.5 * kelp * 1.0) * (1 - kmix) + kelp * kmix * (0.8 + 0.6 * n3)[..., None]
    G = np.where(under[..., None], np.where(sed[..., None], sandcol, rockbed), G)
    rockamt = np.where(under, np.where(sed, 0.0, 0.55), rockamt)
    # ---- the camp pad: trampled bare ground
    if camp:
        r = np.hypot(X - camp['fire'][0], Y - camp['fire'][1])
        tp = smooth(camp['r_out'] - 0.5, camp['r_in'] - 1.0, r)[..., None] * (H > 0.5)[..., None]
        G = G * (1 - tp) + lin((120, 98, 66)) * (0.8 + 0.4 * n3)[..., None] * tp
        rockamt = rockamt * (1 - tp[..., 0])
    # ---- micro relief: rock gets rough, steep strata get ledges (bedding steps), soil stays smooth
    bn = bed_normal(w)
    coord = X * bn[0] + Y * bn[1] + H * bn[2]
    saw = coord / np.maximum(joint, 0.8) % 1.0
    ledge = (smooth(0.0, 0.25, saw) - 0.5) * np.minimum(np.maximum(joint, 0.8), 2.0) * 0.16
    rough = (IC.fbm(X / 1.6, Y / 1.6, seed + 331, 4) - 0.5) * 0.5 + (IC.fbm(X / 0.6, Y / 0.6, seed + 333, 2) - 0.5) * 0.12
    mic = rockamt * (rough + ledge * smooth(0.3, 0.9, slope)) * (H > -1.5)
    H = H + mic
    verts = np.stack([X.ravel(), Y.ravel(), H.ravel()], -1)
    idx = np.arange(ny_ * nx_).reshape(ny_, nx_)
    quads = np.stack([idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel(), idx[1:, 1:].ravel(), idx[1:, :-1].ravel()], -1)
    hh = hashlib.sha256()
    hh.update(np.ascontiguousarray(verts, np.float32).tobytes()); hh.update(np.ascontiguousarray(np.clip(G * 255, 0, 255), np.uint8).tobytes())
    hh.update(np.ascontiguousarray(rockamt * 255, np.uint8).tobytes())
    return dict(H=H, X=X, Y=Y, X1=X1, Y1=Y1, d=d, verts=verts, quads=quads, ground=G, rockamt=rockamt, fresh=fresh, weath=weath, lich=lich, joint=joint,
                rock=rock, veg=veg, E=E, wet=wet, slope=slope, soil=soil, wind=wind, n1=n1, n2=n2, hash=hh.hexdigest()[:16])

def make_terrain_obj(T, name='Terrain'):
    me = bpy.data.meshes.new(name)
    V = T['verts']; Q = T['quads']; nf = len(Q)
    me.vertices.add(len(V)); me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    me.loops.add(4 * nf); me.loops.foreach_set('vertex_index', Q.astype(np.int32).ravel())
    me.polygons.add(nf); me.polygons.foreach_set('loop_start', (np.arange(nf) * 4).astype(np.int32)); me.polygons.foreach_set('loop_total', np.full(nf, 4, np.int32))
    me.polygons.foreach_set('use_smooth', np.ones(nf, bool))
    me.update()
    LS.set_color_attr(me, 'Col', T['ground'].reshape(-1, 3)); LS.set_color_attr(me, 'Fresh', T['fresh'].reshape(-1, 3))
    LS.set_color_attr(me, 'Weath', T['weath'].reshape(-1, 3)); LS.set_color_attr(me, 'Lich', T['lich'].reshape(-1, 3))
    LS.set_float_attr(me, 'RockAmt', T['rockamt'].ravel()); LS.set_float_attr(me, 'Joint', T['joint'].ravel())
    LS.set_float_attr(me, 'Loch', (T['veg'] == W.V_LOCH).astype(np.float32).ravel())
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob

# ---------------------------------------------------------------- vegetation, rocks, camp (sites chosen from the tool's maps)
def poisson(rng, cand, min_d, limit):
    """greedy dart throwing over candidate (x, y) rows, in the order given."""
    pts = []
    for p in cand:
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 >= min_d * min_d for q in pts[-400:]) and all(
                (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 >= min_d * min_d for q in pts[:-400]):
            pts.append((float(p[0]), float(p[1])))
            if len(pts) >= limit:
                break
    return pts

def sample_map(T, A, x, y):
    return bilinear(A, T['X1'][0], T['Y1'][0], T['d'], x, y)

def tree_sites(T, seed, limit, camp_xy, avoid_r=9.0):
    """conifers only on soil that can carry them: deep enough soil (or the tool's scrub class), sheltered from the wind, gentle, drained,
    above the splash zone, not on sand, shingle or rock outcrop, not on the camp."""
    rng = np.random.default_rng(seed + 4101)
    X, Y, H = T['X'], T['Y'], T['H']
    deep = (T['soil'] >= 0.25) | (T['veg'] == W.V_SCRUB)
    okm = deep & (T['wind'] < 0.34) & (T['slope'] < 0.42) & (T['wet'] < 0.62) & (H > 2.2) & (H < 22) & (T['rockamt'] < 0.35) & \
        ~np.isin(T['veg'], [W.V_SAND, W.V_SHINGLE, W.V_LOCH, W.V_BARE, W.V_LICHEN, W.V_BOG, W.V_RUSH, W.V_MACHAIR])
    if camp_xy is not None:
        okm &= np.hypot(X - camp_xy[0], Y - camp_xy[1]) > avoid_r
    rr, cc = np.nonzero(okm)
    if len(rr) == 0:
        return [], 0
    sel = rng.permutation(len(rr))[:6000]
    cand = np.stack([X[rr[sel], cc[sel]] + rng.uniform(-0.4, 0.4, len(sel)), Y[rr[sel], cc[sel]] + rng.uniform(-0.4, 0.4, len(sel))], -1)
    pts = poisson(rng, cand, 4.6, limit)
    return [(x, y, float(sample_map(T, H, x, y))) for x, y in pts], int(okm.sum())

def tuft_sites(T, seed, count, camp_xy):
    rng = np.random.default_rng(seed + 4201)
    X, Y, H = T['X'], T['Y'], T['H']
    dens = np.zeros(H.shape)
    for v, k in ((W.V_PASTURE, 1.0), (W.V_TURF, 0.9), (W.V_MACHAIR, 1.0), (W.V_RUSH, 0.8), (W.V_BOG, 0.45), (W.V_HEATHER, 0.35), (W.V_SCRUB, 0.6)):
        dens[T['veg'] == v] = k
    dens = dens * (1 - T['rockamt']) * (H > 0.9) * (T['slope'] < 0.95)
    if camp_xy is not None:
        dens = dens * smooth(2.5, 5.5, np.hypot(X - camp_xy[0], Y - camp_xy[1]))
    area = (X.max() - X.min()) * (Y.max() - Y.min())
    n_try = int(min(count * 6, area * 1.2))
    xs = rng.uniform(X.min(), X.max(), n_try); ys = rng.uniform(Y.min(), Y.max(), n_try)
    dd = sample_map(T, dens, xs, ys); keep = rng.random(n_try) < dd
    xs, ys = xs[keep][:count], ys[keep][:count]
    hz = sample_map(T, H, xs, ys)
    vg = np.rint(sample_map(T, T['veg'].astype(float), xs, ys)).astype(int)
    return xs, ys, hz, vg == W.V_HEATHER

def coast_rock_sites(T, seed, n_small, n_big):
    """boulders along the shore, more where waves reach (exposure) and where the ground is steep; none on sand."""
    rng = np.random.default_rng(seed + 4301)
    X, Y, H = T['X'], T['Y'], T['H']
    shore = smooth(2.6, 0.6, H) * smooth(-1.2, -0.2, H) * (T['rock'] != W.R_SAND) * (~np.isin(T['veg'], [W.V_SAND]))
    wgt = shore * (0.15 + T['E']) * (0.4 + np.minimum(T['slope'], 1.0))
    flat = wgt.ravel(); p = flat / flat.sum()
    pick = rng.choice(len(flat), size=n_small + n_big, replace=False, p=p)
    rr, cc = np.divmod(pick, H.shape[1])
    out = []
    for k, (r, c) in enumerate(zip(rr, cc)):
        big = k >= n_small
        size = rng.uniform(1.9, 3.6) if big else rng.uniform(0.45, 1.5) * (0.7 + 0.8 * T['E'][r, c])
        out.append(dict(x=float(X[r, c] + rng.uniform(-.3, .3)), y=float(Y[r, c] + rng.uniform(-.3, .3)), size=float(size), rock=int(T['rock'][r, c]), rot=float(rng.uniform(0, 6.28)), big=bool(big)))
    return out

def layout_camp(T, site, tide_hi):
    """Camp on the chosen landing: fire on the flattest dry ground within reach behind the shore, two tents either side with their doors to the
    fire, the boat pulled up above the high-tide line on the shore the landing faces. Metres; deterministic."""
    sx, sy = site['xy']; nx_, ny_ = site['normal']; px, py = -ny_, nx_
    H = T['H']
    best = None
    for hmin, hmax, rmin in ((1.8, 9.0, 1.3), (1.4, 24.0, 0.2)):          # second pass: steep basalt, accept a rougher spot (the pad levels it)
        for dist in np.arange(4.0, 17.0, 1.5):
            for lat in np.arange(-9.0, 9.5, 1.5):
                x = sx - nx_ * dist + px * lat; y = sy - ny_ * dist + py * lat
                hz = float(sample_map(T, H, x, y))
                if not (hmin <= hz <= hmax):
                    continue
                ring = [float(sample_map(T, H, x + 4.5 * math.cos(a), y + 4.5 * math.sin(a))) for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
                if min(ring) < rmin:
                    continue
                cost = np.std(ring + [hz]) * 3.0 + 0.10 * dist + 0.05 * abs(lat) + (0.8 if float(sample_map(T, T['slope'], x, y)) > 0.35 else 0)
                if best is None or cost < best[0]:
                    best = (cost, x, y, hz, float(np.median(ring + [hz])))
        if best is not None:
            break
    if best is None:
        return None
    _, fx, fy, fz, lvl = best
    level = (lvl + fz) / 2
    ip, jp = nx_, ny_
    # boat: walk from the fire towards the sea until the ground drops below the pulled-up line
    bx, by = fx, fy
    for t in np.arange(0.0, 40.0, 0.25):
        x = fx + nx_ * t; y = fy + ny_ * t
        if float(sample_map(T, H, x, y)) < tide_hi + 0.55:
            bx, by = x - nx_ * 0.4, y - ny_ * 0.4; break
    return dict(fire=(fx, fy), level=level, r_in=5.0, r_out=8.5, site=(sx, sy), normal=(nx_, ny_),
                tent_a=(fx + px * 4.4 - nx_ * 1.2, fy + py * 4.4 - ny_ * 1.2), tent_b=(fx - px * 4.6 - nx_ * 2.2, fy - py * 4.6 - ny_ * 2.2),
                boat=(bx, by), boat_yaw=math.atan2(ny_, nx_))

def build_camp(T, camp, seed, rock_mat):
    H = T['H']
    hz = lambda x, y: float(sample_map(T, H, x, y))
    fx, fy = camp['fire']
    LC.campfire((fx, fy, hz(fx, fy)), seed, rock_mat)
    canv1 = LC.canvas_material('Canvas1', (0.58, 0.34, 0.14), seed); canv2 = LC.canvas_material('Canvas2', (0.30, 0.38, 0.40), seed)
    for nm, key, mat, dl, ln, wd, ht, sd in (('TentA', 'tent_a', canv1, 0, 3.0, 2.2, 1.55, seed), ('TentB', 'tent_b', canv2, 0, 2.8, 2.0, 1.4, seed + 1)):
        x, y = camp[key]
        yaw = math.atan2(y - fy, x - fx)       # local -x (the door end) points at the fire
        LC.tent(nm, (x, y, hz(x, y) - 0.02), yaw, ln, wd, ht, mat, sd)
    bx, by = camp['boat']
    LC.rowboat((bx, by, hz(bx, by) + 0.12), camp['boat_yaw'], 0.0, seed)

# ---------------------------------------------------------------- camera
def fit_camera(points, target0, az_deg, el_deg, lens_mm, aspect=1.5, margin=1.06, sensor_w=36.0):
    """Distance and target so that all points sit inside the frame (the shorter fit wins), looking from compass bearing az (camera seen from the target)
    at elevation el. Starts from island_camera's direction; refines the distance and recentres in the image plane. Returns position, target."""
    az, el = math.radians(az_deg), math.radians(el_deg)
    dirc = np.array([math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)])
    fwd = -dirc; right = np.cross(fwd, [0, 0, 1.0]); right /= np.linalg.norm(right); upv = np.cross(right, fwd)
    tan_h = (sensor_w / 2) / lens_mm; tan_v = tan_h / aspect
    P = np.asarray(points, float); tgt = np.asarray(target0, float).copy(); dist = 300.0
    for _ in range(8):
        R = P - tgt; xr = R @ right; yu = R @ upv; zf = R @ fwd
        # recentre in the image plane
        for _k in range(3):
            dep = dist + zf
            ux, uy = xr / dep, yu / dep
            tgt = tgt + right * ((ux.max() + ux.min()) / 2 * dist) + upv * ((uy.max() + uy.min()) / 2 * dist)
            R = P - tgt; xr = R @ right; yu = R @ upv; zf = R @ fwd
        lo, hi = 5.0, 5000.0
        for _k in range(40):
            mid = (lo + hi) / 2; dep = mid + zf
            fit = max((np.abs(xr) / dep).max() / tan_h, (np.abs(yu) / dep).max() / tan_v)
            if fit * margin > 1.0:
                lo = mid
            else:
                hi = mid
        dist = hi
    return tuple(float(v) for v in (tgt + dirc * dist)), tuple(float(v) for v in tgt), float(dist)

def look_at(co, pos, tgt):
    from mathutils import Vector
    co.location = pos
    co.rotation_euler = Vector(tuple(np.array(tgt) - np.array(pos))).to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- the scene
def build(province, seed, view='hero', n=513, island=None, w_px=1200, h_px=800, samples=80, out=None, blend=None, meta_only=False,
          sea_density=None, tufts=None, up=None, exposure=-0.15, az_offset=0.0, el=None, lens=None):
    T0 = time.time(); meta = {'province': province, 'seed': seed, 'view': view, 'n': n}
    t = time.perf_counter(); w = W.make_world(seed, province, n=n); meta['t_world_s'] = round(time.perf_counter() - t, 2)
    meta['world_hash'] = W.world_bytes_hash(w); levels = W.tide_levels(w)
    iid, site = choose_island(w, island)
    isl = w.islands[iid - 1]; ex = island_extent(w, iid)
    meta.update(island=iid, island_area_m2=round(isl['area_m2']), island_extent_m=[float(ex[0]), float(ex[1])], island_max_height_m=round(isl['max_height_m'], 1),
                landing=dict(xy=[round(site['xy'][0], 2), round(site['xy'][1], 2)], kind=site['kind'], source=site['source'], score=round(site['score'], 3)) if site else None,
                tide_levels=levels)
    wide = view == 'wide'
    if wide:
        win = full_window(w); rim = 0.0; upf = 1
    else:
        win = W.island_window(w, iid, size_m=min(300.0, max(ex) * 1.5 + 44.0)); rim = 0.12; upf = up or 2
    for k in ('slope', 'wind_exposure', 'lake_depth'):
        win[k] = win['height'] * 0 + (getattr(w, k) if wide else crop_like(w, getattr(w, k), win))
    # first pass without camp to lay it out on the real surface, then the pad
    T = build_terrain(w, win, upf, seed, rim)
    camp = layout_camp(T, site, levels['high']) if site else None
    if camp:
        T = build_terrain(w, win, upf, seed, rim, camp=camp)
        # the pad moves ground at the camp only; recompute boat position on the new surface
    meta.update(mesh_hash=T['hash'], verts=int(len(T['verts'])), camp=None if not camp else dict(fire=[round(v, 2) for v in camp['fire']], tent_a=[round(v, 2) for v in camp['tent_a']],
                tent_b=[round(v, 2) for v in camp['tent_b']], boat=[round(v, 2) for v in camp['boat']], pad_level_m=round(camp['level'], 2)))
    if meta_only:
        meta['t_total_s'] = round(time.time() - T0, 1); return meta
    sc = LS.reset()
    ob = make_terrain_obj(T)
    pal_rock = int(np.bincount(T['rock'][T['H'] > 0].ravel(), minlength=len(W.ROCKS)).argmax()) if (T['H'] > 0).any() else 0
    bn = bed_normal(w)
    LS.land_material(ob, seed, rock_kw=dict(palette=(('attr', 'Fresh'), ('attr', 'Weath'), ('attr', 'Lich')), joint=('attr', 'Joint'),
                                          bed_normal=tuple(float(v) for v in bn), columnar=(province.upper() == 'C'), wander=1.2, lichen=1.7, streaks=0.65),
                     rock_attr='RockAmt', tide=(levels['low'], levels['high']), loch_attr='Loch', rock_scale=ROCK_SCALE)
    # trees on suitable soil
    camp_xy = camp['fire'] if camp else None
    tlimit = 420 if wide else 90
    tpts, tsuit = tree_sites(T, seed, tlimit, camp_xy)
    if tpts:
        LS.make_conifers(None, seed, pts=tpts, size=(0.9, 1.7))
    # grass tufts and heather clumps where the soil map says grass / heather
    ntuft = tufts if tufts is not None else (0 if wide else 15000)
    nt_made = 0
    if ntuft:
        xs, ys, hz, hth = tuft_sites(T, seed, ntuft, camp_xy)
        nt_made = len(xs)
        if nt_made:
            LS.make_tufts(seed, sites=(xs, ys, hz, hth), heather=500, scale=2.0)
    # boulders at the coast by exposure; the rock shader uses the rock's own palette
    mats = {}
    def rmat(rid):
        if rid not in mats:
            r = W.ROCKS[rid]
            mats[rid] = LS.rock_material('Boulder_%s' % r['name'], seed + 9, 1.6,
                                        palette=(tuple(lin(r['colour_fresh'])), tuple(lin(r['colour_weathered'])), tuple(lin(r['colour_lichen']))),
                                        bed_normal=tuple(float(v) for v in bn), columnar=(province.upper() == 'C'), lichen=1.5, streaks=0.4)
        return mats[rid]
    rocks = coast_rock_sites(T, seed, 14 if wide else 34, 6 if wide else 10)
    for k, r in enumerate(rocks):
        rid = r['rock'] if r['rock'] not in (W.R_SAND,) else pal_rock
        b = LS.boulder(seed + 13 * k, r['size'], (r['x'], r['y'], float(sample_map(T, T['H'], r['x'], r['y'])) - 0.12 * r['size']), r['rot'], 5 if r['big'] else 4)
        b.data.materials.append(rmat(rid))
    if camp:
        build_camp(T, camp, seed, rmat(pal_rock))
    # sea: depth image over the same window (plus exposure for foam), a deep floor under the lowest seabed
    hwin = win['height']; ext = win['size_m'] / 2
    img = LS.depth_image_from_grid(hwin, 'SeaDepth', crop_exposure(w, win) if not wide else win['exposure'])
    dens = sea_density if sea_density is not None else (0.26 if wide else 0.3)
    floor = float(min(T['H'].min(), -8.0)) - 6.0
    LS.make_sea(seed, img, size=2400.0, floor=floor, half=ext, centre=win['centre_xy'], density=dens, foam_scale=1.7, wave_scale=0.22, exposure_foam=True, scatter=0.012)
    # camera
    cam_az, cam_el, cam_lens = None, None, None
    if wide:
        pts = []
        for isl_ in w.islands[:12]:
            yy, xx = np.nonzero(w.island_label == isl_['id'])
            pts.append(np.stack([w.X[yy, xx][::6], w.Y[yy, xx][::6], w.height[yy, xx][::6]], -1))
        P = np.concatenate(pts)
        cam_az, cam_el, cam_lens = 185.0 + az_offset, el or 32.0, lens or 34.0
        c0 = P.mean(0)
    else:
        ic = W.island_camera(w, iid, 50.0)
        cx, cy = isl['centroid']
        ys_, xs_ = np.nonzero(w.island_label == iid)
        P = np.stack([w.X[ys_, xs_][::3], w.Y[ys_, xs_][::3], np.maximum(w.height[ys_, xs_][::3], 0)], -1)
        if site:                                    # look from the side of the island the landing is on
            sx, sy = site['xy']; cam_az = math.degrees(math.atan2(sx - ic['target'][0], sy - ic['target'][1])) % 360 + az_offset
        else:
            cam_az = ic['azimuth_deg']
        cam_el, cam_lens = el or 33.0, lens or 50.0
        c0 = np.array(ic['target'])
    pos, tgt, dist = fit_camera(P, c0, cam_az, cam_el, cam_lens)
    if view == 'top':
        pos = (tgt[0], tgt[1] - 0.001, dist); cam_az = 180.0
    meta.update(camera=dict(pos=[round(v, 1) for v in pos], target=[round(v, 1) for v in tgt], distance_m=round(dist, 1), az_deg=round(cam_az, 1), el_deg=cam_el, lens_mm=cam_lens))
    cam = bpy.data.cameras.new('Cam'); cam.lens = cam_lens; cam.sensor_width = 36; cam.clip_end = 6000
    co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
    look_at(co, pos, tgt)
    # golden hour: the sun low on the camera's left, in front of it, so the island is side-lit and casts shadows over the sea
    sun_az = (cam_az + 125.0) % 360.0
    sun_el = 17.0
    sky = LS.make_sky(sun_elev_deg=sun_el, sun_az_deg=sun_az, strength=0.22)
    el_r = math.radians(sun_el); th = math.radians(sun_az)
    sd = np.array([math.sin(th) * math.cos(el_r), math.cos(th) * math.cos(el_r), math.sin(el_r)])
    bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
    sun.data.color = (1.0, 0.76, 0.5); sun.data.angle = math.radians(1.0); sun.data.energy = 12.0
    from mathutils import Vector
    sun.rotation_euler = Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
    LS.render_settings(sc, w_px, h_px, samples, True, exposure=exposure)
    meta.update(trees=len(tpts), tree_suitable_cells=tsuit, tufts=nt_made, boulders=len(rocks), sun_az_deg=round(sun_az, 1), sun_el_deg=sun_el, sea_density=dens)
    meta['t_build_s'] = round(time.time() - T0, 1)
    if out:
        sc.render.filepath = os.path.abspath(out)
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=blend)
    if out:
        t1 = time.time(); bpy.ops.render.render(write_still=True); meta['t_render_s'] = round(time.time() - t1, 1)
    meta['t_total_s'] = round(time.time() - T0, 1)
    return meta

def crop_exposure(w, win):
    return crop_like(w, w.exposure, win)

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--province', default='A'); ap.add_argument('--seed', type=int, default=2001); ap.add_argument('--view', default='hero', choices=['hero', 'wide', 'top'])
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=80)
    ap.add_argument('--out', default=''); ap.add_argument('--blend', default=''); ap.add_argument('--grid', type=int, default=513); ap.add_argument('--island', type=int, default=0)
    ap.add_argument('--meta-only', action='store_true'); ap.add_argument('--sea-density', type=float, default=None); ap.add_argument('--tufts', type=int, default=None)
    ap.add_argument('--exposure', type=float, default=-0.15); ap.add_argument('--az-offset', type=float, default=0.0); ap.add_argument('--el', type=float, default=None); ap.add_argument('--lens', type=float, default=None)
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    m = build(a.province, a.seed, a.view, a.grid, a.island or None, a.w, a.h, a.samples, a.out or None, a.blend or None, a.meta_only, a.sea_density, a.tufts,
              exposure=a.exposure, az_offset=a.az_offset, el=a.el, lens=a.lens)
    print('LANDFORM_META ' + json.dumps(m, sort_keys=True))
