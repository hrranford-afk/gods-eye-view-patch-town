# tools/make_gift_world.py -- the dedicated Gift island, world 9001 (used only under islands_look.html?game=gift or ?world=9001).
# Deterministic, numpy only, no downloads. Writes landform/worlds/seed9001/{world.js,world.bin,manifest.json,life.js} in the format of
# landform/export_world.py (so world_view.js reads it unchanged) and shots/gift-island-plan.png (a plan view with labels, needs PIL).
#   python3 tools/make_gift_world.py          # write the files
#   python3 tools/make_gift_world.py check    # rebuild in memory and compare the data hash with the file on disk
# Page coordinates: x east, z south, metres from the window centre. 129 x 129 cells of 2 m (a 256 m window). Sea level 0, tide +-1.1 m.
# The island (see GIFT_FIRST_DAY.md): lee beach on the south shore (arrival, finds, jetty), a raised turf shelf behind it (camp, yard, hut rise),
# a hill, a steep exposed north coast, an east shingle cove, a NE headland with a flat knoll for the lighthouse stump, two skerries for seals.
# NO spring on purpose: water comes from rain (barrel, cistern). No person is drawn anywhere.
import base64, hashlib, json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'landform', 'worlds', 'seed9001')
SEED = 9001
NX, DX = 129, 2.0
HALF = (NX - 1) * DX / 2
SCALE_H = 256.0
V = dict(water=0, bare=1, lichen=2, heather=3, bog=4, machair=5, pasture=6, turf=7, scrub=8, sand=9, shingle=10, rush=11)
SH = dict(water=0, sand=1, shingle=2, gentle=3, ledge=4, cliff=5, land=6)
WAVE_FROM_DEG = 345.0                      # waves and weather come from the north-north-west: the south shore is the lee

def vnoise(x, z, s, sc):
    # smooth value noise, deterministic (hash lattice), range 0..1
    def h(i, j):
        n = (i * 374761393 + j * 668265263 + s * 2147483647) & 0xFFFFFFFF
        n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
        return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0
    x = x / sc; z = z / sc
    i0 = np.floor(x).astype(np.int64); j0 = np.floor(z).astype(np.int64)
    fx = x - i0; fz = z - j0
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz)
    hv = np.vectorize(h)
    a = hv(i0, j0); b = hv(i0 + 1, j0); c = hv(i0, j0 + 1); d = hv(i0 + 1, j0 + 1)
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz

def smooth(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

def build():
    xs = -HALF + np.arange(NX) * DX
    X, Z = np.meshgrid(xs, xs)               # row index = z (row 0 = north, z = -HALF), column = x
    def ell(cx, cz, a, b, rot):
        c, s = math.cos(rot), math.sin(rot); dx = X - cx; dz = Z - cz
        u = dx * c + dz * s; v = -dx * s + dz * c
        r = np.sqrt((u / a) ** 2 + (v / b) ** 2)
        return (1 - r) * min(a, b)           # metres inland, roughly
    def cap(x0, z0, r0, x1, z1, r1):
        px = X - x0; pz = Z - z0; vx = x1 - x0; vz = z1 - z0
        t = np.clip((px * vx + pz * vz) / (vx * vx + vz * vz), 0, 1)
        d = np.hypot(px - vx * t, pz - vz * t); r = r0 + (r1 - r0) * t
        return r - d
    n1 = vnoise(X, Z, 11, 30.0) - .5; n2 = vnoise(X, Z, 23, 9.0) - .5
    f = ell(0, 2, 64, 44, 0.06)
    f = np.maximum(f, cap(24, -16, 14, 56, -36, 7))                 # NE headland
    f = np.maximum(f, cap(-54, -2, 12, -63, 12, 9))                 # west lobe (the lee cove on the west side)
    f = np.maximum(f, ell(-90, 18, 6.5, 5.0, .4))                   # west skerry (seals)
    f = np.maximum(f, ell(72, 46, 5.0, 4.2, -.3))                   # east skerry (seals)
    f = f + n1 * 9.0 + n2 * 2.2
    # outward normal from the gradient of f (f is inland distance)
    gz, gx = np.gradient(f, DX)
    gl = np.hypot(gx, gz) + 1e-6
    nxo, nzo = -gx / gl, -gz / gl                                   # outward
    wr = math.radians(WAVE_FROM_DEG); wdx, wdz = math.sin(wr), -math.cos(wr)     # unit vector toward where the weather comes FROM (page x east, z south)
    expo = np.clip(.5 + .5 * (nxo * wdx + nzo * wdz), 0, 1)         # 1 facing the weather, 0 in the lee
    expo = np.where(f > -30, expo, expo)
    # smooth the exposure over the sea side so it is not noisy
    shoreSlope = .13 + .65 * smooth((expo - .45) / .4)               # beach slope on the lee, cliffs on the weather side
    # height profile
    h = np.zeros_like(f)
    sea = f <= 0
    d = -f
    # sea floor: falls from the shore at the shore slope to 3.4 m, then slowly to 6.2 m
    ss = np.where(sea, shoreSlope, 0)
    hs = -np.minimum(d * np.maximum(ss, .09), 3.4) - np.clip(d - 28, 0, 60) * .035
    hs = np.maximum(hs, -6.2)
    # land: shore ramp up to the shelf at 2.4 m over a width that depends on the slope
    ramp = 2.4 / np.maximum(shoreSlope, .05)                       # inland distance at which the shelf is reached
    land_h = 2.4 * smooth(f / np.maximum(ramp, 1.0)) * 0 + np.minimum(f * shoreSlope, 2.4)
    land_h = land_h + 0.0
    # blend the ramp into a flat shelf with a soft shoulder
    land_h = 2.4 * (1 - np.exp(-np.maximum(f, 0) * shoreSlope / 2.4))
    land_h = np.where(f > 0, land_h, 0)
    h = np.where(sea, hs, land_h)
    # shelf texture and features (land only, away from the shore band)
    inland = smooth((f - 14) / 8)
    undul = (vnoise(X, Z, 31, 22.0) - .5) * .9 + (vnoise(X, Z, 41, 7.0) - .5) * .25
    h = h + inland * undul
    def bump(cx, cz, amp, sig, flat=0.0):
        r = np.hypot(X - cx, Z - cz)
        g = np.exp(-((np.maximum(r - flat, 0) / sig) ** 2))
        return amp * g
    hill = bump(-6, -16, 4.6, 12.0, 2.0)                           # the lookout hill
    hut = bump(22, -2, 1.35, 7.0, 4.0)                            # the hut rise: a low terrace (flat top 4 m radius)
    knoll = bump(52, -36, 4.4, 7.5, 3.4)                           # headland knoll with a flat top for the lighthouse stump
    ridge = bump(30, -12, 1.4, 12.0, 0.0)
    h = h + np.where(f > 6, (hill + hut + knoll + ridge) * smooth((f - 6) / 6), 0)
    # the sea side of the NE headland drops steeply: nothing more needed, the exposure ramp does it
    # skerries are low rocks: lift a little so they show at low tide
    skerry = np.maximum(np.maximum(ell(-90, 18, 6.5, 5.0, .4), ell(72, 46, 5.0, 4.2, -.3)), -99)
    h = np.where(skerry > -1.5, np.maximum(h, .5 + .9 * smooth((skerry + 1.5) / 4)), h)
    # a calm shallow bay in front of the south beach (finds, a landing): the sea floor there is sand
    slope = np.hypot(*np.gradient(h, DX)[::-1])
    land = h > .05
    # veg and rock
    veg = np.full(h.shape, V['water'], np.uint8)
    rock = np.full(h.shape, 12, np.uint8)       # shell sand under the water
    nz = vnoise(X, Z, 51, 14.0)
    nz2 = vnoise(X, Z, 61, 6.0)
    for (i, j), _ in np.ndenumerate(h[:0]):
        pass
    veg[land] = V['pasture']
    rock[land] = 5
    lee_beach = land & (expo < .55) & (f < 11) & (slope < .3)
    veg[lee_beach] = V['sand']; rock[lee_beach] = 12
    east_cove = land & (X > 36) & (Z > -2) & (f < 7) & (slope < .3) & (expo < .75)
    veg[east_cove] = V['shingle']; rock[east_cove] = 13
    dune = land & (expo < .6) & (f >= 9) & (f < 17) & (h < 2.5)
    veg[dune] = V['machair']
    heath = land & ((h > 3.6) | (slope > .22)) & (f > 8)
    veg[heath] = V['heather']
    scrub = land & (f > 14) & (nz2 > .62) & (h < 4.5) & ~heath
    veg[scrub] = V['scrub']
    bare = land & ((expo > .7) & (f < 10) | (h > 5.3) & (X > 38))
    veg[bare] = V['bare']; rock[bare] = 4
    lich = land & (veg == V['bare']) & (nz > .55); veg[lich] = V['lichen']
    veg[land & (skerry > -1.5) & (h < 1.6)] = V['bare']
    cliffband = land & (slope > .55) & (f < 9)
    rock[cliffband] = 4
    # shore class
    sh = np.zeros(h.shape, np.uint8)
    sh[land] = SH['land']
    near = land & (f < 12)
    sh[near & (slope <= .45)] = SH['gentle']
    sh[near & (slope > .45) & (slope <= .8)] = SH['ledge']
    sh[near & (slope > .8)] = SH['cliff']
    sh[land & (veg == V['sand']) & (h < 1.7)] = SH['sand']
    sh[land & (veg == V['shingle']) & (h < 1.7)] = SH['shingle']
    sh[land & (skerry > -1.5)] = SH['ledge']
    expo8 = np.clip(np.round(expo * 255), 0, 255).astype(np.uint8)
    wet = np.clip(np.round((.12 + .1 * (vnoise(X, Z, 71, 20.0)) + .25 * smooth((6 - h) / 6) * (land)) * 255), 0, 255).astype(np.uint8)   # no spring: nothing above .5
    bed = np.where(land | (f > -6), 40, 40).astype(np.float64)
    bed = np.where(expo > .6, 150 + 80 * (vnoise(X, Z, 81, 10.0)), 35 + 25 * vnoise(X, Z, 91, 10.0))
    bed = np.clip(bed, 0, 255).astype(np.uint8)
    h16 = np.clip(np.round(h * SCALE_H), -32767, 32767).astype('<i2')
    return dict(h=h, f=f, expo=expo, slope=slope, land=land, veg=veg, rock=rock, sh=sh, X=X, Z=Z,
                arrays=[('height', h16), ('rock', rock), ('veg', veg), ('shore', sh), ('exposure', expo8), ('wetness', wet), ('bed', bed)])

def shore_z(B, x, zlo=0, zhi=HALF):
    # the page z (south positive) of the waterline of the south shore at column x
    i = int(round((x + HALF) / DX)); col = B['h'][:, i]
    for r in range(len(col) - 1, 0, -1):
        if col[r] > .05: return -HALF + (r + 1) * DX
    return None

def manifest(B, blob):
    t = json.load(open(os.path.join(ROOT, 'landform', 'worlds', 'seed0001', 'manifest.json')))     # the rock table, palettes and legends come from a committed world
    offs, o = {}, 0
    for name, a in B['arrays']:
        offs[name] = dict(offset=o, dtype=str(a.dtype), bytes=int(a.nbytes)); o += int(a.nbytes)
    zl = shore_z(B, -24); zc = shore_z(B, 22); ze = shore_z(B, 4)
    landing = dict(xy=[-24.0, round(zl - 1.0, 2)], normal=[0.0, 1.0], kind='sand beach, lee', source='gift', score=1.0, exposure=0.12, slope=0.13)
    cands = [dict(island=1, xy=[-24.0, round(zl - 1, 2)], normal=[0.0, 1.0], kind='sand beach, lee', exposure=0.12, slope=0.13, length_m=40.0),
             dict(island=1, xy=[22.0, round(zc - 1, 2)], normal=[0.0, 1.0], kind='sand beach, lee', exposure=0.1, slope=0.13, length_m=34.0),
             dict(island=1, xy=[4.0, round(ze - 1, 2)], normal=[0.0, 1.0], kind='sand beach, lee', exposure=0.1, slope=0.13, length_m=30.0)]
    shores = [dict(island=1, xy=c['xy'], normal=c['normal'], length_m=c['length_m'], kind='sand beach', exposure=c['exposure'], klass='good', rate=1.1, collectable=True) for c in cands]
    shores.append(dict(island=1, xy=[44.0, 14.0], normal=[1.0, 0.0], length_m=24.0, kind='shingle cove', exposure=0.4, klass='fair', rate=0.7, collectable=True))
    # gift places (our own key; world_view.js ignores it): where the story pieces go
    kn = np.unravel_index(np.argmax(np.where((B['X'] > 40) & (B['Z'] < -25), B['h'], -99)), B['h'].shape)
    gift = dict(note='story places in page metres (x east, z south); the page scans the rest', stump=[round(float(B['X'][kn]), 1), round(float(B['Z'][kn]), 1)],
                hut=[22.0, -2.0], skerries=[[-90.0, 18.0], [72.0, 46.0]], spring=False, water='rain only: no spring on this island', wave_from_deg=WAVE_FROM_DEG)
    isl = [dict(id=1, xy=[0.0, 2.0], area_m2=int(B['land'].sum() * DX * DX), rx=64.0, rz=44.0, max_h=round(float(B['h'].max()), 1), size='small', start=True)]
    man = dict(version=1, seed=SEED, province='B', rock='sandstone', island_type='gift island', n_islands=1, start_island=1, start_extent_m=120.0,
               start_area_m2=isl[0]['area_m2'], start_max_height_m=isl[0]['max_h'], label='sandstone, the gift island (lee beach, turf shelf, hill, headland)',
               nx=NX, dx=DX, window_m=(NX - 1) * DX, centre_world_xy=[0.0, 0.0], sea_level=0.0, tide_amp=1.1, height_scale=SCALE_H,
               axes=t['axes'], arrays=offs, bytes=len(blob), shore_legend=t['shore_legend'], veg_legend=t['veg_legend'], rocks=t['rocks'], rock_rgb=t['rock_rgb'],
               islands=isl, landing=landing, landing_candidates=cands, shores=shores, wave_from_deg=WAVE_FROM_DEG,
               source=dict(tool='tools/make_gift_world.py', world_hash='gift9001', cell_m=DX, world_py_sha='none'), gift=gift,
               data_sha=hashlib.sha256(blob).hexdigest()[:16])
    return man

def plan_png(B, man, path):
    from PIL import Image, ImageDraw
    S = 6; n = NX; img = Image.new('RGB', (n * S, n * S))
    h = B['h']; px = img.load()
    for j in range(n):
        for i in range(n):
            v = h[j, i]
            if v < 0:
                t = min(1, -v / 5); c = (int(40 - 20 * t), int(110 - 40 * t), int(150 - 40 * t))
            else:
                vg = B['veg'][j, i]
                base = {9: (226, 210, 160), 10: (150, 144, 136), 5: (170, 180, 100), 6: (120, 160, 80), 3: (150, 120, 90), 8: (70, 110, 60), 1: (110, 100, 96), 2: (125, 120, 100)}.get(int(vg), (120, 150, 80))
                k = .8 + .06 * min(v, 6); c = tuple(min(255, int(q * k)) for q in base)
            for a in range(S):
                for b in range(S): px[i * S + a, j * S + b] = c
    d = ImageDraw.Draw(img)
    def P(x, z): return ((x + HALF) / DX * S + S / 2, (z + HALF) / DX * S + S / 2)
    def tag(x, z, s, col=(255, 255, 255)):
        p = P(x, z); d.ellipse([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=(200, 40, 40), outline=(255, 255, 255)); d.text((p[0] + 8, p[1] - 6), s, fill=col)
    g = man['gift']; L = man['landing']['xy']
    tag(L[0], L[1], 'landing and wrecked jetty (page finds the plank site)')
    tag(g['hut'][0], g['hut'][1], 'rusted hut rise')
    tag(g['stump'][0], g['stump'][1], 'lighthouse stump knoll')
    tag(22, shore_z(B, 22) - 8, 'camp shore (tents, fire, yard on the shelf)')
    tag(-6, -14, 'lookout hill')
    tag(44, 14, 'shingle cove')
    tag(-52, 6, 'west lee cove: finds wash up')
    tag(g['skerries'][0][0], g['skerries'][0][1], 'seal skerry'); tag(g['skerries'][1][0], g['skerries'][1][1], 'seal skerry')
    d.text((8, 8), 'THE GIFT, world 9001 (plan, north up, 2 m cells, 256 m window). No spring on purpose: rain only.', fill=(255, 255, 255))
    d.text((8, 22), 'Weather comes from the north-north-west: north coast steep and rocky, south shore is the lee.', fill=(255, 255, 255))
    d.text((8, 36), 'Blue = water (darker = deeper), sand/green/brown = land by vegetation. Red dots = story places. Not a render of the page.', fill=(255, 255, 255))
    img.save(path)

def main():
    B = build()
    blob = b''.join(np.ascontiguousarray(a).tobytes() for _, a in B['arrays'])
    man = manifest(B, blob)
    if len(sys.argv) > 1 and sys.argv[1] == 'check':
        old = json.load(open(os.path.join(OUT, 'manifest.json')))
        print('SAME' if old['data_sha'] == man['data_sha'] else 'DIFF', man['data_sha']); sys.exit(0 if old['data_sha'] == man['data_sha'] else 1)
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, 'world.bin'), 'wb').write(blob)
    json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'), separators=(',', ':'))
    open(os.path.join(OUT, 'world.js'), 'w').write('/* generated by tools/make_gift_world.py: world 9001 (the gift island). Do not edit. */\n(window.LI_WORLDS=window.LI_WORLDS||{})[%d]=%s;\n' % (SEED, json.dumps(dict(man, b64=base64.b64encode(blob).decode('ascii')), separators=(',', ':'))))
    life = dict(birds=dict(ledge_m=0, puffin_turf_m2=0), colonies=[], kelp=[], month=5, note='gift island: no robots of its own, the camp yard tops up from recipes by seed', province='B', puffins=[], robots=[])
    open(os.path.join(OUT, 'life.js'), 'w').write('/* generated by tools/make_gift_world.py: life of world 9001. Do not edit. */\n(window.LI_LIFE=window.LI_LIFE||{})[%d]=%s;\n' % (SEED, json.dumps(life, separators=(',', ':'))))
    json.dump(life, open(os.path.join(OUT, 'life.json'), 'w'), separators=(',', ':'))
    os.makedirs(os.path.join(ROOT, 'shots'), exist_ok=True)
    plan_png(B, man, os.path.join(ROOT, 'shots', 'day-0.png'))
    print('wrote', OUT, 'sha', man['data_sha'], 'land m2', isl_area(man), 'max h', man['start_max_height_m'], 'landing', man['landing']['xy'], 'stump', man['gift']['stump'])

def isl_area(m): return m['start_area_m2']

if __name__ == '__main__':
    main()
