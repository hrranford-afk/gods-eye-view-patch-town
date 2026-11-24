"""STAR FORT TEXTURES (pure python and numpy): the procedural 3D materials for the star fort kit, registered into the kit baker (kit_tex.py, imported, not edited).
See STAR_FORT_KIT.md.
The baker evaluates every material at the true 3D position of each texel in the piece frame (x along the wall, y up, z outward), so the same maths that decides where a facing stone has
spalled off (spall_field, used by starfort_model.py to push the geometry in) also paints the exposed rubble core there. Materials added here:
  ashlar   dressed stone facing in 25 cm courses, running bond, drafted quoins, weeps and mortar stains, cracks and spalls when prm dmg > 0
  rough    rubble stone of the inner revetment and the cheek walls (irregular stones in lime mortar)
  core     the cut section of a breached wall: dressed skin, lime-mortared rubble core, earth backing (zones from the plan distance to the face line)
  earth    bare soil with pebbles and roots, fresh spoil
  grass    bright turf for the parapet, glacis and covered way (tufts, clover, a few dry patches)
  gravel   rammed gravel of the terreplein, banquette and covered way
  brick    soft red brick in stretcher bond with lime mortar (powder store, guardhouse)
  tile     clay roof tiles
Wear (moss, lichen, salt) comes from the shared weather() of kit_tex.py. Deterministic: hashed noise only. No lettering."""
import os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit_tex as TX
from kit_tex import fbm3, noise3, worley, sst, mixc, weather

COURSE = 0.25   # metres: the height of one course of facing stone


def hz(a, b, seed):
    """hash of two integer arrays to 0..1"""
    a = np.asarray(a).astype(np.int64); b = np.asarray(b).astype(np.int64)
    return TX._hash(a, b, np.zeros_like(a), seed)


def spall_field(P, seed, amount):
    """0..1 where facing stones have fallen away (shared by the geometry and the texture). P (n, 3) in the piece frame."""
    if amount <= 0: return np.zeros(len(P), np.float32)
    q = fbm3(P * np.array([1.0, 1.0, 1.0], np.float32), 1.9, 3, seed + 301)
    b = fbm3(P, 7.0, 2, seed + 302)
    m = sst(0.60 - 0.09 * amount, 0.70 - 0.09 * amount, q * 0.85 + 0.15 * b)
    return m.astype(np.float32)


def plan_dist(P, plan):
    """signed distance (positive outward) from points to the plan polyline of the face line; plan: [(x, z), ...] with the outward side on the right of the travel direction"""
    d = np.full(len(P), 1e9, np.float32); sg = np.zeros(len(P), np.float32)
    x = P[:, 0]; z = P[:, 2]
    for (ax, az), (bx, bz) in zip(plan[:-1], plan[1:]):
        tx, tz = bx - ax, bz - az; L = max((tx * tx + tz * tz) ** 0.5, 1e-6); tx /= L; tz /= L
        px = x - ax; pz = z - az; s = np.clip(px * tx + pz * tz, 0, L)
        dx = px - s * tx; dz = pz - s * tz; dd = np.sqrt(dx * dx + dz * dz)
        side = (-tz) * px + tx * pz   # outward normal is (-tz, tx)
        better = dd < d; d = np.where(better, dd, d); sg = np.where(better, np.sign(side) + (side == 0), sg)
    return d * sg


# ------------------------------------------------------------------------------------------------- dressed stone
def m_ashlar(c):
    P = c.P; sd = c.seed; prm = c.prm; y = P[:, 1]; u = c.u
    tone = prm.get('tone', 'wall')
    if tone == 'quoin': A, B = (0.54, 0.51, 0.45), (0.68, 0.645, 0.57)
    elif tone == 'dark': A, B = (0.30, 0.285, 0.26), (0.42, 0.40, 0.36)
    else: A, B = (0.36, 0.335, 0.295), (0.50, 0.465, 0.41)
    H = prm.get('course', COURSE)
    ci = np.floor(y / H + 0.0001); fy = y / H - ci
    # block lengths per course, running bond
    Lc = 0.46 + 0.42 * hz(ci, 0, sd + 1); oc = hz(ci, 1, sd + 2) * Lc
    uu = u
    qz = np.zeros(c.n, np.float32)
    quo = prm.get('quoin')
    if quo:
        for uq in quo:
            w = 0.62; inz = sst(w + 0.03, w - 0.03, np.abs(u - uq))
            qz = np.maximum(qz, inz)
            alt = (ci.astype(np.int64) % 2) == 0
            Lq = np.where(alt, 0.62, 0.34); lq = ((np.abs(u - uq)) % 1.0)
            # blocks of the quoin run out from the corner line: alternate long and short
            Lc = np.where(inz > 0.5, Lq, Lc); oc = np.where(inz > 0.5, 0.0, oc); uu = np.where(inz > 0.5, np.abs(u - uq), uu)
    ub = (uu + oc) / Lc; bi = np.floor(ub); fx = ub - bi
    jm = 0.011 + 0.005 * hz(ci, 3, sd)
    jx = sst(jm / Lc, 0.0, fx) + sst(1 - jm / Lc, 1.0, fx); jy = sst(jm / H, 0.0, fy) + sst(1 - jm / (H * 0.8), 1.0, fy)
    mort = np.clip(np.maximum(jx, jy), 0, 1)
    rb = hz(bi * 7 + ci * 13, ci, sd + 4); rb2 = hz(bi * 5 + ci * 3, bi, sd + 5)
    n1 = fbm3(P, 1.3, 3, sd); n2 = fbm3(P, 9.0, 3, sd + 3); fine = noise3(P, 95, sd + 7); fine2 = noise3(P, 300, sd + 8)
    base = mixc(A, B, np.clip(0.55 * rb + 0.45 * sst(0.25, 0.75, n1), 0, 1))
    col = base * (0.88 + 0.22 * n2)[:, None] * (0.93 + 0.14 * fine)[:, None]
    # warm and cool blocks, a few darker iron-stained stones
    col = col * (1 + 0.06 * (rb2 - 0.5)[:, None] * np.array([1.0, 0.2, -1.0], np.float32)[None, :])
    stain = sst(0.78, 0.92, rb2) * 0.25; col = col * (1 - stain)[:, None]
    # drafted margin on quoins and the cordon: a slightly recessed border of 2.5 cm
    draft = np.zeros(c.n, np.float32)
    if quo or tone == 'quoin':
        dm = np.minimum(np.minimum(fx * Lc, (1 - fx) * Lc), np.minimum(fy * H, (1 - fy) * H)); draft = sst(0.030, 0.012, dm) * np.maximum(qz, 1.0 if tone == 'quoin' else 0.0)
        col = col * (1 - 0.10 * draft)[:, None]
    # lighter stone for the quoin zone
    if quo: col = mixc(col, mixc((0.54, 0.51, 0.45), (0.68, 0.645, 0.57), rb), 0.78 * qz)
    # chipped arrises
    chip = sst(0.45, 0.8, fbm3(P, 38, 2, sd + 9)) * sst(0.05, 0.0, np.minimum(np.minimum(fx * Lc, (1 - fx) * Lc), np.minimum(fy * H, (1 - fy) * H)))
    col = mixc(col, col * 0.7, chip * 0.7)
    # mortar: pale lime, stained dark below weeps and green where wet
    mc = mixc((0.60, 0.58, 0.52), (0.50, 0.48, 0.43), fbm3(P, 14, 2, sd + 11))
    stn = sst(0.55, 0.9, fbm3(P * np.array([14, 0.7, 14], np.float32), 1.0, 3, sd + 12)) * 0.5
    mc = mc * (1 - 0.35 * stn)[:, None]
    col = mixc(col, mc, mort * 0.92)
    ht = 0.008 * (1 - ((2 * fx - 1) ** 2) * 0.5) * (1 - ((2 * fy - 1) ** 2) * 0.4) * (1 + 0.5 * (rb - 0.5)) - 0.012 * mort + 0.002 * (fine - 0.5) - 0.012 * chip - 0.004 * draft
    ht = ht + 0.004 * (n2 - 0.5)
    rough = np.full(c.n, 0.88, np.float32) - 0.1 * fine2
    # weeps: small dark drainage openings low in the wall, with a dark run below each
    wp = prm.get('weeps')
    if wp:
        wy = wp[0]; wsp = wp[1]; wk = np.floor(u / wsp + 0.5); wu = u - wk * wsp; jit = (hz(wk, 0, sd + 21) - 0.5) * 0.3
        dx = np.abs(wu - jit); dy = y - (wy + 0.0)
        hole = sst(0.045, 0.036, dx) * sst(0.05, 0.04, np.abs(dy)); run = sst(0.06, 0.02, dx + 0.02) * sst(0.0, -0.1, dy) * sst(-1.2, -0.2, dy) * (hz(wk, 1, sd + 22) > 0.25)
        col = col * (1 - 0.30 * run)[:, None]; col = mixc(col, (0.04, 0.04, 0.04), hole); ht = ht - 0.03 * hole
    # base courses: damp, algae and a bright salt crust at the foot of a ditch wall
    foot = sst(-1.0, -2.0, y)
    col = mixc(col, (0.20, 0.27, 0.15), foot * sst(0.55, 0.8, fbm3(P, 5, 3, sd + 30)) * 0.5)
    col, ht, rough = weather(c, col, ht, rough, ('moss', 'lichen', 'salt', 'wet'))
    # damage: cracks and spalled facing
    dm_ = prm.get('dmg', 0)
    ao = 1 - 0.35 * mort
    if dm_ > 0:
        sp = spall_field(P, prm.get('dseed', sd), dm_) * sst(-1.7, -0.6, y)
        d1, rid, d2 = worley(P * np.array([1.0, 1.0, 1.0], np.float32), 1.1, sd + 40, True); cr = sst(0.018, 0.0, d2 - d1)
        cmask = sst(0.45, 0.62, fbm3(P, 1.7, 3, sd + 41)) * (0.5 + 0.5 * dm_); cr = cr * cmask
        d1b, ridb, d2b = worley(P, 3.2, sd + 43, True); cr2 = sst(0.012, 0.0, d2b - d1b) * sst(0.5, 0.7, fbm3(P, 2.4, 3, sd + 44)) * dm_
        crk = np.clip(cr + cr2, 0, 1)
        col = col * (1 - 0.72 * crk)[:, None]; ht = ht - 0.010 * crk
        # moss and tufts along the cracks high up
        col = mixc(col, (0.20, 0.30, 0.10), crk * sst(0.2, 1.6, y) * 0.45 * (noise3(P, 18, sd + 45) > 0.4))
        # spalls: the facing is gone and the grey lime-and-rubble core shows
        cc = mixc((0.52, 0.49, 0.43), (0.36, 0.33, 0.29), worley(P, 16, sd + 46)[1]) * (0.8 + 0.4 * noise3(P, 70, sd + 47))[:, None]
        col = mixc(col, cc, sp * 0.95); ht = ht - 0.06 * sp; ao = ao * (1 - 0.35 * sp)
        edge = sst(0.1, 0.5, sp) * sst(0.95, 0.5, sp); col = col * (1 - 0.3 * edge)[:, None]
    return col, ht, rough.astype(np.float32), np.zeros(c.n, np.float32), ao


def m_rough(c):
    """rubble stones in lime mortar, in rough courses: inner revetment, cheek walls, gabion-like fill"""
    P = c.P; sd = c.seed; prm = c.prm
    s = c.u
    Q = np.stack([s * 1.0, P[:, 1] * 1.6, np.full(c.n, 0.31, np.float32)], 1)
    d1, rid, d2 = worley(Q, 5.2, sd + 3, True); edge = d2 - d1
    mortar = sst(0.12, 0.02, edge)
    stone = mixc((0.30, 0.285, 0.255), (0.48, 0.455, 0.405), rid) * (0.84 + 0.3 * fbm3(P, 11, 3, sd + 2))[:, None]
    stone = mixc(stone, stone * np.array([1.06, 0.98, 0.9], np.float32), sst(0.7, 0.9, hz((rid * 91).astype(np.int64), 0, sd)))
    col = mixc(stone, (0.50, 0.48, 0.43), mortar * 0.85)
    ht = -0.02 * mortar + 0.014 * (rid - 0.5) * sst(0.01, 0.18, edge) + 0.004 * fbm3(P, 22, 2, sd + 9)
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.92, np.float32), ('moss', 'lichen', 'salt', 'wet'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.5 * mortar


def m_core(c):
    """the cut section through a breached wall. zones by the plan distance behind the face line: dressed skin, rubble core in lime, earth backing"""
    P = c.P; sd = c.seed; prm = c.prm; plan = prm['plan']
    d = -plan_dist(P, plan) + 0.0  # metres behind the face line (positive inside the wall)
    mode = prm.get('mode', 'rampart')
    if mode == 'earth': d = np.full(c.n, 9.0, np.float32) + 0.0 * d
    elif mode == 'masonry': d = np.clip(d, 0.0, 2.0) * 0.0 + 1.4
    y = P[:, 1]
    # dressed skin: big blocks in section
    Qs = np.stack([P[:, 0] * 0.7 + P[:, 2] * 0.7, y * 3.2, np.zeros(c.n, np.float32)], 1)
    d1s, rs, d2s = worley(Qs, 1.7, sd + 5, True); es = d2s - d1s; ms = sst(0.12, 0.02, es)
    skin = mixc((0.46, 0.43, 0.38), (0.60, 0.57, 0.50), rs) * (0.9 + 0.2 * fbm3(P, 8, 3, sd + 6))[:, None]
    skin = mixc(skin, (0.56, 0.54, 0.48), ms * 0.8)
    # rubble core: rounded stones in pale lime mortar
    d1, rid, d2 = worley(P, 3.4, sd + 7, True); e = d2 - d1; mr = sst(0.22, 0.04, e)
    stn = mixc((0.38, 0.35, 0.31), (0.58, 0.55, 0.48), rid) * (0.82 + 0.34 * fbm3(P, 12, 3, sd + 8))[:, None]
    core = mixc(stn, (0.66, 0.63, 0.55), mr * 0.9)
    core = mixc(core, (0.45, 0.36, 0.26), sst(0.55, 0.8, fbm3(P, 5, 3, sd + 9)) * 0.35)
    # earth: brown, damp, with roots and pebbles
    n = fbm3(P, 4.5, 4, sd + 10); earth = mixc((0.26, 0.19, 0.12), (0.43, 0.32, 0.21), n) * (0.85 + 0.3 * noise3(P, 80, sd + 11))[:, None]
    dp, rp, _ = worley(P, 18, sd + 12, True); earth = mixc(earth, mixc((0.5, 0.46, 0.4), (0.3, 0.28, 0.25), rp), sst(0.14, 0.07, dp) * 0.8)
    skin_w = sst(0.95, 0.75, d + 0.5 * fbm3(P, 3, 2, sd + 13)); core_w = sst(2.9, 2.5, d + 0.7 * fbm3(P, 2.4, 2, sd + 14))
    col = mixc(earth, core, core_w); col = mixc(col, skin, skin_w)
    ht = 0.04 * (rid - 0.5) * (1 - mr) * core_w * (1 - skin_w) + 0.02 * (rs - 0.5) * skin_w - 0.012 * (mr * core_w + ms * skin_w) + 0.015 * (n - 0.5) * (1 - core_w)
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.95, np.float32), ('moss', 'salt'))
    # grass and roots hanging over the top edge
    top = sst(2.2, 3.0, y); col = mixc(col, (0.20, 0.28, 0.10), top * sst(0.5, 0.7, noise3(P, 9, sd + 15)) * 0.7)
    return col, ht, rough, np.zeros(c.n, np.float32), 0.6 + 0.4 * sst(0.0, 0.4, (1 - mr * core_w))


def m_earth(c):
    P = c.P; sd = c.seed; n = fbm3(P, 3.0, 4, sd); f = noise3(P, 120, sd + 1)
    col = mixc((0.27, 0.20, 0.13), (0.45, 0.35, 0.23), n) * (0.86 + 0.28 * f)[:, None]
    dp, rp, _ = worley(P, 16, sd + 2, True); pb = sst(0.15, 0.06, dp); col = mixc(col, mixc((0.52, 0.48, 0.42), (0.32, 0.30, 0.27), rp), pb * 0.85)
    wet = sst(0.3, -1.4, P[:, 1]); col = col * (1 - 0.3 * wet)[:, None]
    ht = 0.03 * n + 0.02 * pb + 0.006 * f
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.96, np.float32), ('moss', 'salt'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.3 * pb


def m_grass(c):
    """bright turf: tufts, clover, a few dry patches, worn earth where feet go (prm worn 0..1 along a path mask by the model)"""
    P = c.P; sd = c.seed; prm = c.prm
    n = fbm3(P, 1.6, 3, sd); n2 = fbm3(P, 8, 3, sd + 1); f = noise3(P, 150, sd + 2); f2 = noise3(P, 420, sd + 3)
    lush = prm.get('lush', 0.8)
    green = mixc((0.11, 0.18, 0.045), (0.25, 0.33, 0.085), sst(0.2, 0.8, n * 0.6 + n2 * 0.4))
    col = green * (0.80 + 0.40 * f)[:, None] * (0.93 + 0.14 * f2)[:, None]
    dry = sst(0.62, 0.8, fbm3(P, 2.2, 3, sd + 4)) * (1 - 0.6 * lush); col = mixc(col, (0.40, 0.37, 0.18), dry * 0.6)
    cl = sst(0.74, 0.82, fbm3(P, 5, 2, sd + 5)); col = mixc(col, (0.13, 0.26, 0.07), cl * 0.5)
    fl = (noise3(P, 60, sd + 6) > 0.93) * sst(0.5, 0.7, n2); col = mixc(col, (0.86, 0.80, 0.30), fl * 0.7)
    worn = prm.get('worn', 0.0)
    if worn > 0:
        wm = sst(0.5, 0.75, fbm3(P, 2.0, 3, sd + 7)) * worn; col = mixc(col, mixc((0.40, 0.33, 0.21), (0.52, 0.44, 0.30), n2), wm)
    # bare earth and stones where turf has been torn (prm torn level 0..1 set for the cracked state)
    tr = prm.get('torn', 0.0)
    if tr > 0:
        tm = sst(0.68 - 0.18 * tr, 0.78 - 0.1 * tr, fbm3(P, 2.8, 3, sd + 8)); col = mixc(col, mixc((0.30, 0.22, 0.14), (0.44, 0.34, 0.22), n2), tm)
    ht = 0.02 * (f - 0.4) + 0.012 * n
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.97, np.float32), ('salt',))
    return col, ht, rough, np.zeros(c.n, np.float32), 0.75 + 0.25 * f


def m_gravel(c):
    P = c.P; sd = c.seed
    n = fbm3(P, 2.4, 3, sd); f = noise3(P, 180, sd + 1)
    base = mixc((0.42, 0.38, 0.31), (0.56, 0.52, 0.43), n) * (0.85 + 0.3 * f)[:, None]
    dp, rp, _ = worley(P, 24, sd + 2, True); pb = sst(0.12, 0.05, dp)
    col = mixc(base, mixc((0.34, 0.33, 0.31), (0.66, 0.62, 0.54), rp), pb * 0.85)
    wd = sst(0.70, 0.84, fbm3(P, 13, 3, sd + 3)) * (1 - pb); col = mixc(col, (0.24, 0.31, 0.11), wd * 0.38)
    # a wheel rut or two of worn dark
    ht = 0.012 * pb + 0.01 * (n - 0.5) + 0.004 * f
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.95, np.float32), ('salt',))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.25 * pb


def m_brick(c):
    P = c.P; sd = c.seed; prm = c.prm; y = P[:, 1]
    H = 0.077
    if prm.get('vault'):
        yy = c.u; s = c.v
    else:
        yy = y; dx, dz = prm.get('dir', (1.0, 0.0)); s = P[:, 0] * dx + P[:, 2] * dz if prm.get('flat', True) else c.u
    ci = np.floor(yy / H + 0.0001); fy = yy / H - ci
    L = 0.23; ub = s / L + 0.5 * (ci % 2); bi = np.floor(ub); fx = ub - bi
    jm = 0.011; jx = sst(jm / L, 0.0, fx) + sst(1 - jm / L, 1.0, fx); jy = sst(jm / H, 0.0, fy) + sst(1 - jm / H, 1.0, fy)
    mort = np.clip(np.maximum(jx, jy), 0, 1)
    rb = hz(bi * 7 + ci * 11, ci, sd + 1); rb2 = hz(bi * 3 + ci * 5, bi, sd + 2)
    brickc = mixc((0.50, 0.25, 0.17), (0.62, 0.36, 0.24), rb)
    brickc = mixc(brickc, (0.30, 0.16, 0.13), sst(0.85, 0.97, rb2) * 0.8)
    col = brickc * (0.88 + 0.22 * fbm3(P, 12, 3, sd + 3))[:, None] * (0.95 + 0.1 * noise3(P, 140, sd + 4))[:, None]
    col = mixc(col, (0.62, 0.60, 0.54), mort * 0.9)
    eff = sst(0.6, 0.85, fbm3(P, 5, 3, sd + 5)) * sst(0.5, -0.5, y) * 0.5; col = mixc(col, (0.78, 0.76, 0.70), eff)
    ht = 0.004 * (1 - ((2 * fx - 1) ** 2) * 0.5) - 0.010 * mort + 0.003 * (rb - 0.5)
    ao = 1 - 0.4 * mort
    dm_ = prm.get('dmg', 0)
    if dm_ > 0:
        d1, rid, d2 = worley(P, 1.3, sd + 40, True); cr = sst(0.02, 0.0, d2 - d1) * sst(0.45, 0.62, fbm3(P, 1.8, 3, sd + 41)); crk = np.clip(cr, 0, 1)
        col = col * (1 - 0.7 * crk)[:, None]; ht = ht - 0.008 * crk
        sp = sst(0.64, 0.74, fbm3(P, 3.0, 3, sd + 42)) * dm_; col = mixc(col, (0.50, 0.46, 0.40), sp * 0.9); ht = ht - 0.02 * sp
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.9, np.float32), ('moss', 'lichen', 'salt', 'wet'))
    return col, ht, rough, np.zeros(c.n, np.float32), ao


def m_tile(c):
    P = c.P; sd = c.seed; prm = c.prm
    v = c.v; u = c.u
    R = 0.24; ri = np.floor(v / R); fr = v / R - ri
    L = 0.20; ub = u / L + 0.5 * (ri % 2); bi = np.floor(ub); fx = ub - bi
    rb = hz(bi * 5 + ri * 7, ri, sd + 1)
    base = mixc((0.50, 0.26, 0.17), (0.66, 0.36, 0.22), rb)
    sh = sst(0.0, 0.25, fr) * 0.35 + 0.65; col = base * sh[:, None] * (0.86 + 0.24 * fbm3(P, 10, 3, sd + 2))[:, None]
    joint = sst(0.05, 0.0, np.minimum(fx, 1 - fx)); col = col * (1 - 0.35 * joint)[:, None]
    moss = sst(0.55, 0.8, fbm3(P, 3.5, 3, sd + 3)); col = mixc(col, (0.28, 0.34, 0.14), moss * 0.55)
    ht = 0.014 * (1 - fr) * 0.8 - 0.004 * joint
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.88, np.float32), ('lichen', 'salt'))
    return col, ht, rough, np.zeros(c.n, np.float32), 0.7 + 0.3 * sst(0.0, 0.3, fr)


def m_cloth(c):
    """a plain two-field flag cloth, faded; no emblem. prm: a, b colours"""
    P = c.P; sd = c.seed; prm = c.prm
    a = np.asarray(prm.get('a', (0.66, 0.60, 0.50)), np.float32); b = np.asarray(prm.get('b', (0.56, 0.20, 0.15)), np.float32)
    f = c.v / np.maximum(c.sv, 1e-3); col = np.where((f < 0.5)[:, None], a, b).astype(np.float32)
    w = 0.88 + 0.2 * fbm3(P, 10, 3, sd); thread = 0.95 + 0.08 * noise3(np.stack([c.u * 400, c.v * 400, np.zeros(c.n, np.float32)], 1), 1.0, sd + 1)
    col = col * (w * thread)[:, None]; fray = sst(0.97, 1.0, c.u / np.maximum(c.su, 1e-3)); col = mixc(col, col * 0.7, fray)
    return col, 0.002 * (thread - 0.95), np.full(c.n, 0.9, np.float32), np.zeros(c.n, np.float32), np.ones(c.n, np.float32)


def m_frag(c):
    """a loose block of dressed or broken wall stone: speckled, weathered, with an old mortar face and lichen"""
    P = c.P; sd = c.seed; n1 = fbm3(P, 2.0, 3, sd); n2 = fbm3(P, 9, 3, sd + 1); f = noise3(P, 110, sd + 2)
    col = mixc((0.27, 0.25, 0.22), (0.42, 0.39, 0.34), sst(0.25, 0.75, n1)) * (0.82 + 0.36 * n2)[:, None] * (0.92 + 0.16 * f)[:, None]
    mo = sst(0.6, 0.75, fbm3(P, 4, 2, sd + 3)) * 0.4; col = mixc(col, (0.50, 0.47, 0.42), mo)
    cr = sst(0.02, 0.0, np.abs(fbm3(P, 3.0, 3, sd + 4) - 0.5)); col = col * (1 - 0.5 * cr)[:, None]
    ht = 0.012 * n2 + 0.004 * f - 0.006 * cr
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.9, np.float32), ('moss', 'salt'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.3 * cr


def m_heap(c):
    """the rubble slope in a breach: dressed fragments and rounded stones in earth and lime, turf creeping in from the edges"""
    P = c.P; sd = c.seed
    d1, rid, d2 = worley(P, 3.8, sd + 1, True); e = d2 - d1; st = sst(0.30, 0.06, d1)
    n = fbm3(P, 3.0, 4, sd + 2); earth = mixc((0.28, 0.21, 0.14), (0.46, 0.36, 0.24), n) * (0.85 + 0.3 * noise3(P, 90, sd + 3))[:, None]
    stone = mixc((0.38, 0.35, 0.30), (0.64, 0.61, 0.54), rid) * (0.82 + 0.34 * fbm3(P, 14, 3, sd + 4))[:, None]
    stone = mixc(stone, (0.70, 0.67, 0.60), sst(0.82, 0.95, hz((rid * 53).astype(np.int64), 1, sd)) * 0.6)
    col = mixc(earth, stone, st * 0.92)
    d3, r3 = worley(P, 16, sd + 5); pb = sst(0.14, 0.06, d3); col = mixc(col, mixc((0.5, 0.47, 0.41), (0.3, 0.29, 0.26), r3), pb * 0.6 * (1 - st))
    grass = sst(0.5, 0.75, fbm3(P, 2.3, 3, sd + 6) + 0.18 * sst(0.4, 1.8, P[:, 1])) * (1 - st * 0.8); col = mixc(col, mixc((0.18, 0.28, 0.07), (0.32, 0.43, 0.12), n), grass * 0.8)
    dust = sst(0.55, 0.85, fbm3(P, 6, 3, sd + 7)) * 0.3; col = mixc(col, (0.66, 0.62, 0.55), dust)
    ht = 0.05 * (rid - 0.5) * st + 0.015 * (n - 0.5) + 0.012 * pb
    col, ht, rough = weather(c, col, ht, np.full(c.n, 0.95, np.float32), ('moss', 'salt'))
    return col, ht, rough, np.zeros(c.n, np.float32), 1 - 0.3 * st


NEW = {'frag': m_frag, 'heap': m_heap, 'ashlar': m_ashlar, 'rough': m_rough, 'core': m_core, 'earth': m_earth, 'grass': m_grass, 'gravel': m_gravel, 'brick': m_brick, 'tile': m_tile, 'cloth': m_cloth}


def register():
    TX.MATERIALS.update(NEW)


register()
