# landform/export_world.py -- export chosen worlds of the land formation tool as compact files for the page (numpy only).
# Page side: islands_look.html?world=NNN (world_view.js). See WORLD_VIEW.md.
#   python3 landform/export_world.py            # export the 12 worlds below into landform/worlds/seedNNNN/ and write the index
#   python3 landform/export_world.py check      # re-export in memory and compare the hashes with the files on disk (determinism)
# Per world: a WINDOW of 256 m (province D: 258 m) cut out of the tool's field, centred on the start island, written as
#   seedNNNN/world.bin   little-endian arrays, one after another, row 0 = NORTH edge of the window (page z = -world y), column 0 = WEST edge:
#                        height int16 (1/256 m), rock u8 (tool rock id), veg u8 (tool vegetation class), shore u8 (shore class, below),
#                        exposure u8 (0..255 = 0..1), wetness u8, bed u8 (bed hardness 0 sand .. 255 hard rock; read on the sea floor)
#   seedNNNN/manifest.json   sizes, offsets, island table, landing and landing candidates, shore segments, hashes, label
#   seedNNNN/world.js    the same file as base64 inside a classic script (the page loads this one: works from file:// and from a server)
# worlds/index.json and worlds/index.js list the 12 worlds (the Lab index and the on-page selector read them).
# Page coordinates: x east, z SOUTH (z = -world y), origin at the window centre; y up, metres, sea level 0.
# Start islands come from the foundry rules (foundry/lfmetrics.start_island: size 60..200 m, not on the edge, a good lee landing, fresh water, timber).
# The seeds are the first three of each province in foundry/seeds/shortlist.json (diversity ranked); province D (the volcano) has no foundry
# entry: three seeds are chosen here by hand and the window is put on a gentle landing of the coast (see pick_d_window).
import base64
import hashlib
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'foundry'))
sys.path.insert(0, os.path.join(ROOT, 'ecosystem'))
import world as W            # noqa: E402
import lfmetrics as LM       # noqa: E402
import shore_catch as SC     # noqa: E402

OUT = os.path.join(HERE, 'worlds')
WINDOW_M = 256.0
# (province, seed): first three of each foundry province list that pass the start rules on the current world.py, then three volcano seeds
WORLDS = [('A', 153), ('A', 147), ('A', 62), ('B', 139), ('B', 23), ('B', 174), ('C', 56), ('C', 99), ('C', 106), ('D', 4), ('D', 2), ('D', 5)]
SHORE = {'water': 0, 'sand': 1, 'shingle': 2, 'gentle': 3, 'ledge': 4, 'cliff': 5, 'land': 6}
ROCK_WORD = {'A': 'gneiss', 'B': 'sandstone', 'C': 'basalt', 'D': 'volcanic'}
SCALE_H = 256.0
# Page colours of the rocks that the tool's own table paints too pink or too green-brown for the page (the tool's table in world.py is untouched; the manifest carries the corrected
# [fresh, weathered, lichen] sRGB triples, which world_view.js reads for boulders and for the rock under the vegetation). Gneiss: grey and warm rust instead of mauve; volcanic: basalt black,
# brown weathered basalt, red scoria, dark ash.
PALETTE_FIX = {
    'gneiss_pink': [[150, 138, 126], [112, 98, 86], [184, 150, 60]],
    'gneiss_grey': [[150, 150, 148], [96, 94, 92], [190, 160, 70]],
    'schist_soft': [[108, 106, 108], [84, 74, 64], [140, 150, 90]],
    'fault_breccia': [[126, 98, 80], [102, 80, 66], [150, 130, 70]],
    'basalt_fresh': [[28, 27, 31], [50, 46, 48], [112, 104, 70]],
    'basalt_weathered': [[62, 50, 42], [88, 70, 58], [130, 120, 70]],
    'scoria_red': [[112, 50, 32], [86, 44, 32], [120, 100, 60]],
    'ash_soil': [[58, 48, 40], [74, 62, 50], [100, 100, 60]],
    'lava_flow': [[24, 23, 26], [42, 38, 38], [110, 104, 80]],
    'obsidian_pumice': [[150, 140, 122], [120, 110, 96], [140, 130, 90]],
}


def shore_class(w):
    h = w.height.astype(np.float64)
    land = h > w.sea_level
    water = ~land
    near_water = np.zeros(land.shape, bool)
    for ax in (0, 1):
        for sg in (1, -1):
            near_water |= np.roll(water, sg, axis=ax)
    rk = w.rock.astype(np.int64)
    sand_ids = [i for i, r in enumerate(w.rocks) if r['name'] in ('shell_sand', 'black_sand')]
    shingle_ids = [i for i, r in enumerate(w.rocks) if r['name'] == 'cobble_shingle']
    sl = np.asarray(w.slope, dtype=np.float64)
    shore = land & (near_water | (h < 1.3))
    out = np.zeros(land.shape, np.uint8)
    out[land] = SHORE['land']
    cls = np.full(land.shape, SHORE['gentle'], np.uint8)
    cls[sl > 0.30] = SHORE['ledge']
    cls[sl > 0.85] = SHORE['cliff']
    cls[np.isin(rk, shingle_ids) | (w.veg == 10)] = SHORE['shingle']
    cls[np.isin(rk, sand_ids) | (w.veg == 9)] = SHORE['sand']
    out[shore] = cls[shore]
    return out


def island_type(w, prov, iid):
    """One word for the shape of the world (the recipe vocabulary of blender/recipe.py plus province forms)."""
    h = w.height.astype(np.float64)
    land = h > 0
    n = len(w.islands)
    sand = float(((w.rock == 12) | (w.veg == 9)).sum()) / max(1, int(land.sum()))
    if prov == 'D':
        return 'volcanic coast'
    isl = w.islands[iid - 1]
    maxh = isl['max_height_m']
    if n >= 28:
        return 'archipelago'
    if sand > 0.06:
        return 'sandbar shores'
    if prov == 'C':
        return 'stepped plateaus' if maxh > 12 else 'low lava shelves'
    if prov == 'B':
        return 'cuesta ridges' if maxh > 16 else 'plain'
    return 'whalebacks and skerries' if n >= 20 else 'cliffs' if maxh > 24 else 'plain'


def window_slice(arr, r0, c0, nx, pad_val=None):
    """arr[r0:r0+nx, c0:c0+nx] with the edge replicated outside the array."""
    n = arr.shape[0]
    pad = nx
    p = np.pad(arr, pad, mode='edge')
    return p[r0 + pad:r0 + pad + nx, c0 + pad:c0 + pad + nx]


def pick_d_window(w, nx, dx):
    """Province D: the 258 m window is swept (6-cell steps, 36 cells either way) round every landing candidate that is a gentle shore. A window is kept when 30 to 65 percent of it is land,
    the candidate lies 12 cells inside the edge and the field is not cut by the array edge; the score is the 98th percentile of the land height (so the window holds a real slope of the cone,
    not the flat ash apron), plus a bonus for a gentle landing and a low-exposure shore. Returns (candidate, centre row, centre column, relief) or None."""
    best, bs = None, -1e9
    h = w.height.astype(np.float64)
    land = h > w.sea_level
    n = h.shape[0]
    half = nx // 2
    jj, ii = np.mgrid[-half:half + 1, -half:half + 1]
    rr = np.hypot(ii, jj) * dx
    inner = rr <= 90.0                   # the page's table is a disc of radius 122 m: land outside about 80 m rolls down into the rim over 44 m (world_view.js, province D)
    rim = rr > 100.0
    for c in w.landing_candidates:
        if c['kind'] == 'rock ledge' and c['slope'] > 0.25:
            continue
        x, y = c['xy']
        ci = int(round((x + w.size_m / 2) / w.dx))
        ri = int(round((y + w.size_m / 2) / w.dx))
        for dr in range(-45, 46, 3):
            for dc in range(-45, 46, 3):
                r0, c0 = ri + dr - half, ci + dc - half
                if r0 < 0 or c0 < 0 or r0 + nx > n or c0 + nx > n or math.hypot(ci - c0 - half, ri - r0 - half) * dx > 80.0:
                    continue
                sub = h[r0:r0 + nx, c0:c0 + nx]
                sl = land[r0:r0 + nx, c0:c0 + nx]
                frac = float(sl[inner].mean())
                if not 0.30 < frac < 0.70 or not sl[inner].any():
                    continue
                p98 = float(np.percentile(sub[inner & sl], 98))
                rim_max = float(sub[rim].max())
                sc = min(p98, 45.0) - 0.7 * max(0.0, rim_max - 45.0) - 30.0 * abs(frac - 0.5) + (12.0 if c['kind'].startswith('gentle') else 0.0) - 25.0 * c['exposure']
                if sc > bs:
                    best, bs = (c, ri + dr, ci + dc, p98), sc
    return best


def build_one(prov, seed):
    n = 257 if prov != 'D' else 513
    w = W.make_world(seed, prov, n=n)
    dx = float(w.dx)
    nx = int(round(WINDOW_M / dx)) + 1
    if prov == 'D':
        nx = 87
    iid, landing = None, None
    if prov != 'D':
        best, rows = LM.start_island(W, w)
        if not best['ok']:
            raise SystemExit('seed %d province %s: no start island passes the foundry rules' % (seed, prov))
        iid = best['island']
        L = best['landing']
        ys, xs = np.nonzero(w.island_label == iid)
        cx, cy = (w.X[0, xs.min()] + w.X[0, xs.max()]) / 2.0, (w.Y[ys.min(), 0] + w.Y[ys.max(), 0]) / 2.0
        landing = dict(xy=L['xy'], normal=L['normal'], kind=L['kind'], source=L['source'], score=L['score'], exposure=L['exposure'], slope=L['slope'])
        extent_m = best['extent_m']
    else:
        iid = 1
        pk = pick_d_window(w, nx, dx)
        if pk is None:
            raise SystemExit('province D seed %d: no window with a landing candidate and a cone slope' % seed)
        c, rrow, ccol, _ = pk
        cx, cy = -w.size_m / 2 + ccol * dx, -w.size_m / 2 + rrow * dx
        ang = math.radians(c['facing_deg'])
        nrm = (math.cos(ang), math.sin(ang))
        landing = dict(xy=c['xy'], normal=nrm, kind=c['kind'], source='tool', score=0.0, exposure=c['exposure'], slope=c['slope'])
        extent_m = None
    ci = int(round((cx + w.size_m / 2) / dx))
    ri = int(round((cy + w.size_m / 2) / dx))
    c0, r0 = ci - nx // 2, ri - nx // 2
    ox = -w.size_m / 2 + (c0 + nx // 2) * dx          # world x of the window centre (cell centre, so grid aligned)
    oy = -w.size_m / 2 + (r0 + nx // 2) * dx

    def cut(a):
        return window_slice(np.asarray(a), r0, c0, nx)[::-1]       # flip: row 0 = north

    shore = shore_class(w)
    h16 = np.clip(np.round(cut(w.height).astype(np.float64) * SCALE_H), -32767, 32767).astype('<i2')
    rock = cut(w.rock).astype(np.uint8)
    veg = cut(w.veg).astype(np.uint8)
    shr = cut(shore).astype(np.uint8)
    expo = np.clip(np.round(cut(w.exposure).astype(np.float64) * 255), 0, 255).astype(np.uint8)
    wet = np.clip(np.round(cut(w.wetness).astype(np.float64) * 255), 0, 255).astype(np.uint8)
    hard = np.array([r['hardness'] for r in w.rocks])
    bed = np.clip(np.round(hard[rock.astype(np.int64)] / 1.8 * 255), 0, 255).astype(np.uint8)
    arrays = [('height', h16), ('rock', rock), ('veg', veg), ('shore', shr), ('exposure', expo), ('wetness', wet), ('bed', bed)]
    blob = b''.join(np.ascontiguousarray(a).tobytes() for _, a in arrays)
    offs, o = {}, 0
    for name, a in arrays:
        offs[name] = dict(offset=o, dtype=str(a.dtype), bytes=int(a.nbytes))
        o += int(a.nbytes)

    def P(x, y):      # world metres -> page metres (x east, z south), window centre = origin
        return [round(float(x - ox), 2), round(float(-(y - oy)), 2)]

    def inwin(x, y, m=0.0):
        return abs(x - ox) <= (nx - 1) * dx / 2 - m and abs(y - oy) <= (nx - 1) * dx / 2 - m

    islands = []
    for i in w.islands:
        if not inwin(*i['centroid'], m=-40):
            continue
        ys, xs = np.nonzero(w.island_label == i['id'])
        x0, x1, y0, y1 = w.X[0, xs.min()], w.X[0, xs.max()], w.Y[ys.min(), 0], w.Y[ys.max(), 0]
        islands.append(dict(id=i['id'], xy=P(*i['centroid']), area_m2=round(i['area_m2']), rx=round(float((x1 - x0) / 2 + dx), 1), rz=round(float((y1 - y0) / 2 + dx), 1),
                            max_h=round(i['max_height_m'], 1), size=i['size_class'], start=(i['id'] == iid)))
    islands = sorted(islands, key=lambda d: -d['area_m2'])[:12]
    cands = []
    for c in w.landing_candidates:
        if inwin(*c['xy']):
            a = math.radians(c['facing_deg'])
            cands.append(dict(island=c['island'], xy=P(*c['xy']), normal=[round(math.cos(a), 3), round(-math.sin(a), 3)], kind=c['kind'], exposure=round(c['exposure'], 3),
                              slope=round(c['slope'], 3), length_m=round(c['length_m'], 1)))
    segs = SC.build_shores(w, seed)
    shores = []
    for s in sorted(segs, key=lambda s: -s['length_m']):
        if inwin(*s['xy']) and len(shores) < 40:
            a = math.radians(s['facing_deg'])
            shores.append(dict(island=s['island'], xy=P(*s['xy']), normal=[round(math.cos(a), 3), round(-math.sin(a), 3)], length_m=round(s['length_m'], 1), kind=s['kind'],
                               exposure=round(s['exposure'], 3), klass=s['klass'], rate=round(s['rate_items_m_tide'], 2), collectable=bool(s['collectable'])))
    isl = w.islands[iid - 1]
    ln = landing
    lx, ly = ln['xy']
    nrm = ln['normal']
    typ = island_type(w, prov, iid)
    man = dict(version=1, seed=int(seed), province=prov, rock=ROCK_WORD[prov], island_type=typ, n_islands=len(w.islands), start_island=int(iid),
               start_extent_m=extent_m, start_area_m2=round(isl['area_m2']), start_max_height_m=round(isl['max_height_m'], 1),
               label=('%s, %s, start island %d m' % (ROCK_WORD[prov], typ, int(round(extent_m)))) if extent_m else ('%s, %s, gentle landing on the flank of a cone' % (ROCK_WORD[prov], typ)),
               nx=nx, dx=dx, window_m=round((nx - 1) * dx, 1), centre_world_xy=[round(float(ox), 2), round(float(oy), 2)], sea_level=float(w.sea_level), tide_amp=float(w.tide_amp),
               height_scale=SCALE_H, axes='page x east, z south (z = -world y); row 0 = north edge, column 0 = west edge',
               arrays=offs, bytes=len(blob), shore_legend={v: k for k, v in SHORE.items()}, veg_legend=list(W.VEG_LEGEND), rocks=[r['name'] for r in w.rocks],
               rock_rgb=[PALETTE_FIX.get(r['name']) or [list(r['colour_fresh']), list(r['colour_weathered']), list(r['colour_lichen'])] for r in w.rocks],
               islands=islands, landing=dict(xy=P(lx, ly), normal=[round(nrm[0], 3), round(-nrm[1], 3)], kind=ln['kind'], source=ln['source'], score=round(ln['score'], 3),
                                             exposure=round(ln['exposure'], 3), slope=round(ln['slope'], 3)),
               landing_candidates=cands, shores=shores, wave_from_deg=round(math.degrees(float(w.structure.get('wave_from', math.pi))), 1),
               source=dict(tool='landform/world.py make_world(%d, %r, n=%d)' % (seed, prov, n), world_hash=W.world_bytes_hash(w), cell_m=dx,
                           world_py_sha=hashlib.sha256(open(os.path.join(HERE, 'world.py'), 'rb').read()).hexdigest()[:16]),
               data_sha=hashlib.sha256(blob).hexdigest()[:16])
    return man, blob, w


def write_one(prov, seed):
    man, blob, w = build_one(prov, seed)
    d = os.path.join(OUT, 'seed%04d' % seed)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'world.bin'), 'wb') as f:
        f.write(blob)
    with open(os.path.join(d, 'manifest.json'), 'w') as f:
        json.dump(man, f, separators=(',', ':'))
    with open(os.path.join(d, 'world.js'), 'w') as f:
        f.write('/* generated by landform/export_world.py: world %d (%s). Do not edit. */\n' % (seed, man['label']))
        f.write('(window.LI_WORLDS=window.LI_WORLDS||{})[%d]=%s;\n' % (seed, json.dumps(dict(man, b64=base64.b64encode(blob).decode('ascii')), separators=(',', ':'))))
    return man


def main():
    check = len(sys.argv) > 1 and sys.argv[1] == 'check'
    idx = []
    bad = 0
    for prov, seed in WORLDS:
        if check:
            man, blob, _ = build_one(prov, seed)
            p = os.path.join(OUT, 'seed%04d' % seed, 'manifest.json')
            old = json.load(open(p))
            same = old['data_sha'] == man['data_sha']
            bad += 0 if same else 1
            print(('SAME ' if same else 'DIFF ') + 'seed %d %s %s' % (seed, prov, man['data_sha']))
            continue
        man = write_one(prov, seed)
        print('wrote seed %d %s: %s, %d bytes' % (seed, prov, man['label'], man['bytes']))
        idx.append(dict(seed=seed, province=prov, rock=man['rock'], island_type=man['island_type'], label=man['label'], n_islands=man['n_islands'],
                        start_extent_m=man['start_extent_m'], bytes=man['bytes'], data_sha=man['data_sha']))
    if check:
        sys.exit(1 if bad else 0)
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump(dict(version=1, worlds=idx), f, indent=1)
    with open(os.path.join(OUT, 'index.js'), 'w') as f:
        f.write('/* generated by landform/export_world.py */\nwindow.LI_WORLD_INDEX=%s;\n' % json.dumps(idx, separators=(',', ':')))
    tot = sum(os.path.getsize(os.path.join(dp, fn)) for dp, _, fs in os.walk(OUT) for fn in fs)
    print('total bytes in landform/worlds: %d (%.2f MB)' % (tot, tot / 1e6))


if __name__ == '__main__':
    main()
