# landform/export_life.py -- export the life of the 12 exported worlds as a small life.json each (numpy only, deterministic).
# Page side: islands_look.html?world=NNN&life=1 (animals.js, robots in the same file). See LIFE_VIEW.md.
#   python3 landform/export_life.py            # write landform/worlds/seedNNNN/life.json and life.js for the 12 worlds, print a table
#   python3 landform/export_life.py check      # re-derive in memory and compare with the files on disk (determinism)
# What it does: for each world seed it re-makes the tool world (landform/world.py, the same call as export_world.py), runs the ecosystem placement
# (ecosystem/wildlife_place.py: seal haul-outs, seabird colonies, kelp; ecosystem/shore_catch.py: shore segments and the landing), keeps what falls in the
# 256 m window of the page, and adds the window-local pieces the ecosystem does not produce (cliff-top puffin turf, shoal cells, collector robot sites).
# Everything is a COUNT or a SITE, never an animal: "a haul-out with n seals", "a ledge with p pairs", "a cell with shoal index s". Nobody is tracked.
# Page coordinates as in export_world.py: x east, z SOUTH (z = -world y), origin at the window centre, y up, sea level 0, metres.
# Honest flags: a seal site that the ecosystem rule did not give inside the window is made by the same rule with a smaller flat area ("relaxed": true);
# shoal cells and puffin turf sites are made here (the ecosystem has no shoal engine); robot sites are made here from the shore classes.
import hashlib
import json
import math
import os
import random
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'foundry'))
sys.path.insert(0, os.path.join(ROOT, 'ecosystem'))
sys.path.insert(0, os.path.join(ROOT, 'blender'))
import world as W                 # noqa: E402
import export_world as EW         # noqa: E402
import shore_catch as SC          # noqa: E402
import wildlife_place as WP       # noqa: E402
import eco_common as C            # noqa: E402
import robot_recipe as RR         # noqa: E402

OUT = EW.OUT
VERSION = 1
TABLE_LAND_R = 108.0              # the page table is a disc of radius 122 m and the last 16 m sink to sea: land sites stay inside 108 m
TABLE_SEA_R = 114.0
MONTH = 10                        # November (0 = January): grey seals ashore and pupping (WILDLIFE.md calendar), gannets gone south but the page shows them (TUNING, see LIFE_VIEW.md)
PUP_SHARE = 0.18                  # TUNING: share of a grey seal haul-out that is pups in autumn
RELAX_MIN_FLAT_M2 = 20.0          # WILDLIFE.md section 11: at least 20 m2 (the ecosystem rule uses 40)
SEAL_SITES_MAX = 8
HAUL_BLOCK_M = 24.0
KELP_MAX = 110
KELP_GRID_M = 7.0
SHOAL_MAX = 4
PUFFIN_SITES_MAX = 5
ROBOT_CANDIDATES = 5
# The recipes of the robot sites come from a POOL of recipe seeds that were built as live GLBs (landform/build_world_robots.py): 10 distinct machines for the 12 worlds keep the whole set near 3 MB.
# RAD_POOL: plan -> seeds of robot_recipe_for(seed, radical=True) (ROBOT_RADICAL.md); FAM_POOL: seeds of the family (robot_recipe_for(seed)). Changing a list changes which GLBs the worlds need.
RAD_POOL = dict(walker=[13, 32], pontoon=[3], spotter=[5], roller=[7], snail=[11], crab=[20], scout=[18])
FAM_POOL = [9, 6]
RADICAL_SHARE = 2.0 / 3.0         # about two thirds of the sites get a radical plan
SHELTER_MAX = 0.30                # pontoon: shore exposure (fetch rays, 0 sheltered to 1 open) at the site at most this
WATER_NEAR_M = 12.0               # pontoon: open water (0.5 m deep at mean sea) within this distance of the site along the shore normal
VILLAGE_CLEAR_M = 62.0            # the page puts up to 10 houses within 62 m of the landing: colonies and puffin turf keep out of that disc


def rnd(a, n=1):
    return [round(float(v), n) for v in a]


def window_masks(w, man):
    ox, oy = man['centre_world_xy']
    half = man['window_m'] / 2.0
    X, Y = w.X, w.Y
    inwin = (np.abs(X - ox) <= half) & (np.abs(Y - oy) <= half)
    rr = np.hypot(X - ox, Y - oy)
    return ox, oy, inwin, rr


def to_page(ox, oy, x, y):
    return [round(float(x - ox), 1), round(float(-(y - oy)), 1)]


def haulout_sites(w, man, out, ox, oy, rr, village):
    """Seal haul-outs by the ecosystem rule of wildlife_place.py (a low flat top that dries, deep water within 100 m: h between sea-tide and sea+3 m, slope under 0.5), with three window-local refinements
    so that the picture reads as shore and not as meadow: the cells must be within 8 m of open water, not woodland or scrub, 40 m from the page landing (the village), and at least 20 m2 (WILDLIFE.md section 11).
    Each site is kept as a centre and a principal-axis ellipse (a thin shore apron is not a disc). `eco` is true when the ecosystem's own site list has a site within 15 m."""
    dx = w.dx
    sea = w.sea_level
    h = w.height.astype(np.float64)
    amp = w.tide_amp
    slope = np.clip(w.slope, 0, 3)
    land = w.island_label > 0
    dwater = WP.chamfer(~land) * dx
    deep = WP.chamfer(h < sea - 3.0) * dx
    L = man['landing']
    lx, ly = ox + L['xy'][0], oy - L['xy'][1]
    far = np.hypot(w.X - lx, w.Y - ly) >= 40.0
    mask = (h > sea - amp) & (h <= sea + WP.HAUL_TOP_MAX_M) & (slope < 0.5) & (dwater <= 8.0) & (~np.isin(w.veg, (8, 13, 14, 15, 16))) & (rr <= TABLE_LAND_R) & far
    cl, nc = W.label4(mask)
    src = disturbance_src = WP.disturbance_sources(village, w.size_m)
    eco = [s['xy'] for s in out['seal_sites']]
    sites = []
    for c in range(1, nc + 1):
        idx_all = np.flatnonzero(cl.ravel() == c)
        if len(idx_all) * dx * dx < RELAX_MIN_FLAT_M2:
            continue
        r_a, c_a = np.divmod(idx_all, h.shape[1])
        # a long shore apron is cut into 24 m blocks: one haul-out is a place a seal group can fill, not a whole coast
        bx = np.floor((w.X[r_a, c_a] - ox) / HAUL_BLOCK_M).astype(np.int64)
        by = np.floor((w.Y[r_a, c_a] - oy) / HAUL_BLOCK_M).astype(np.int64)
        key = bx * 100003 + by
        for kk in np.unique(key):
            sel = key == kk
            r_, c_ = r_a[sel], c_a[sel]
            flat = len(r_) * dx * dx
            if flat < RELAX_MIN_FLAT_M2:
                continue
            if float(deep[r_, c_].min()) > WP.HAUL_DEEP_WITHIN_M:
                continue
            xs, ys = w.X[r_, c_], w.Y[r_, c_]
            x, y = float(xs.mean()), float(ys.mean())
            cov = np.cov(np.vstack([xs - x, ys - y])) if len(r_) > 2 else np.eye(2) * dx * dx
            ev, evec = np.linalg.eigh(cov)
            ev = np.maximum(ev, (0.6 * dx) ** 2)
            a1, a2 = 2.0 * math.sqrt(ev[1]), 2.0 * math.sqrt(ev[0])
            rot = math.atan2(-evec[1, 1], evec[0, 1])               # page angle of the long axis (z = -y)
            top = float(h[r_, c_].mean() - sea)
            E = float(w.exposure[r_, c_].mean())
            D, dl, dh = WP.disturbance_at(x, y, src, WP.SEAL_D_RADIUS_M, WP.SEAL_D_RADIUS_M)
            sites.append(dict(xy=(x, y), flat_m2=float(flat), top_m=top, kind='common' if E < 0.25 else 'grey', exposure=E, capacity=int(min(WP.SEAL_CAP, flat / WP.SEAL_M2_EACH)),
                              exposed_fraction=WP.tide_exposed_fraction(top, amp), D=D, a1=a1, a2=a2, rot=rot, eco=any(math.hypot(x - ex, y - ey) < 15.0 for ex, ey in eco)))
    sites.sort(key=lambda s: (-s['capacity'], round(s['xy'][0], 2), round(s['xy'][1], 2)))
    return sites


def seal_block(w, man, out, ox, oy, rr, village):
    sites = haulout_sites(w, man, out, ox, oy, rr, village)[:SEAL_SITES_MAX]
    res = []
    for i, s in enumerate(sites):
        n = WP.seal_count(s, MONTH, 1.0, True)
        n = max(n, 3) if s['capacity'] >= 6 else max(n, 2) if s['capacity'] >= 3 else n
        pups = int(round(n * PUP_SHARE)) if s['kind'] == 'grey' else 0
        res.append(dict(id=i, xy=to_page(ox, oy, *s['xy']), n=int(n), pups=pups, capacity=int(s['capacity']), kind=s['kind'], flat_m2=round(s['flat_m2']),
                        r=round(math.sqrt(s['flat_m2'] / math.pi), 1), a1=round(s['a1'], 1), a2=round(s['a2'], 1), rot=round(s['rot'], 2), top=round(s['top_m'], 2),
                        exposed_fraction=round(s['exposed_fraction'], 2), D=round(float(s['D']), 2), eco=bool(s['eco'])))
    return res


def bird_blocks(w, man, out, ox, oy, rr, seed):
    """Colonies on skerry tops (ecosystem) and puffin turf sites (made here from the veg and height maps)."""
    L = man['landing']
    lx, ly = ox + L['xy'][0], oy - L['xy'][1]
    cols = []
    for c in out['birds']['colonies']:
        x, y = c['xy']
        if math.hypot(x - ox, y - oy) > TABLE_LAND_R:
            continue
        if math.hypot(x - lx, y - ly) < VILLAGE_CLEAR_M:
            continue
        cols.append(c)
    cols.sort(key=lambda c: (-c['pairs_undisturbed'], c['island']))
    colonies = []
    for i, c in enumerate(cols[:6]):
        season = WP.bird_season(6, c["kind"])       # a June look (breeding season) for the drawn colony: TUNING, the page draws pairs
        colonies.append(dict(id=i, kind=c['kind'], xy=to_page(ox, oy, *c['xy']), flat_m2=round(c['flat_m2']), top=round(c['top_m'], 1), r=round(math.sqrt(c['flat_m2'] / math.pi), 1),
                             pairs=int(round(c['pairs_undisturbed'] * (1.0 if season else 0.0))), island=int(c['island'])))
    # puffin turf: turf and pasture cells within 25 m of the coast, 3 m or more over the sea, not flat bog (WILDLIFE.md rule seabird_colony, puffin density 0.15 per m2 of usable turf)
    dx = w.dx
    sea = w.sea_level
    h = w.height.astype(np.float64)
    slope = np.clip(w.slope, 0, 3)
    land = w.island_label > 0
    water = ~land
    shore = land & (np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1))
    dcoast = WP.chamfer(shore) * dx
    turf = np.isin(w.veg, (3, 5, 6, 7)) & land & (dcoast <= 25.0) & ((h - sea) >= 3.0) & (slope < 0.9) & (rr <= TABLE_LAND_R) & (np.hypot(w.X - lx, w.Y - ly) >= VILLAGE_CLEAR_M)
    puff = []
    if turf.any():
        ys, xs = np.nonzero(turf)
        bx = np.floor((w.X[ys, xs] - ox) / 24.0).astype(np.int64)
        by = np.floor((w.Y[ys, xs] - oy) / 24.0).astype(np.int64)
        keys = bx * 1000 + by
        bins = {}
        for k in np.unique(keys):
            m = keys == k
            cnt = int(m.sum())
            area = cnt * dx * dx
            if area < 60.0:
                continue
            cx, cy = float(w.X[ys[m], xs[m]].mean()), float(w.Y[ys[m], xs[m]].mean())
            cd = float(dcoast[ys[m], xs[m]].mean())
            bins[int(k)] = (area, cx, cy, cd, float(h[ys[m], xs[m]].mean() - sea))
        order = sorted(bins.items(), key=lambda kv: (kv[1][3], -kv[1][0], kv[0]))      # nearest the coast first
        for k, (area, cx, cy, cd, top) in order[:PUFFIN_SITES_MAX]:
            pairs = int(min(80, area * WP.PUFFIN_USABLE * WP.PUFFIN_PER_M2))
            puff.append(dict(id=len(puff), xy=to_page(ox, oy, cx, cy), area_m2=round(area), r=round(min(14.0, math.sqrt(area / math.pi)), 1), top=round(top, 1), pairs=pairs, dcoast=round(cd, 1)))
    return colonies, puff, dict(ledge_m=round(out['birds']['ledge_m']), puffin_turf_m2=round(out['birds']['puffin_turf_m2']))


def kelp_block(w, ox, oy, rr, seed):
    """Kelp patch centres on a jittered 7 m grid: hard bed, 1 to 10 m deep, within 150 m of land (rule of ecosystem/wildlife_place.py section kelp), thinned by a seeded noise so beds have edges."""
    dx = w.dx
    land = w.island_label > 0
    dland = WP.chamfer(land) * dx
    depth = w.sea_level - w.height.astype(np.float64)
    names = [r['name'] for r in w.rocks]
    soft = np.isin(w.rock, [i for i, n in enumerate(names) if n in ('shell_sand', 'black_sand', 'cobble_shingle', 'mudstone', 'siltstone_soft')])
    ok = (~land) & (~soft) & (depth >= 1.0) & (depth <= 10.0) & (dland <= WP.KELP_NEAR_M) & (dland >= 3.0) & (rr <= TABLE_SEA_R)
    rng = C.rng_for(seed, 701)
    n = w.height.shape[0]
    pts = []
    gx = np.arange(-TABLE_SEA_R, TABLE_SEA_R + 0.1, KELP_GRID_M)
    # smooth seeded field so patches form beds
    f = rng.random((len(gx) // 3 + 3, len(gx) // 3 + 3))
    def fld(i, j):
        a, b = i / 3.0, j / 3.0
        i0, j0 = int(a), int(b)
        ta, tb = a - i0, b - j0
        return (f[i0, j0] * (1 - ta) * (1 - tb) + f[i0 + 1, j0] * ta * (1 - tb) + f[i0, j0 + 1] * (1 - ta) * tb + f[i0 + 1, j0 + 1] * ta * tb)
    for i, px in enumerate(gx):
        for j, pz in enumerate(gx):
            jx, jz = rng.random() * KELP_GRID_M * 0.7, rng.random() * KELP_GRID_M * 0.7
            x, z = px + jx, pz + jz
            wx, wy = ox + x, oy - z
            c = int(round((wx - w.X[0, 0]) / dx))
            r = int(round((wy - w.Y[0, 0]) / dx))
            if not (0 <= r < n and 0 <= c < n) or not ok[r, c]:
                continue
            if fld(i, j) < 0.38:
                continue
            pts.append((x, z, float(depth[r, c])))
    order = rng.permutation(len(pts))
    pts = [pts[k] for k in order][:KELP_MAX]
    return [[round(x, 1), round(z, 1), round(d, 1)] for x, z, d in pts]


def shoal_block(w, ox, oy, rr, seed, kelp):
    """Shoal cells: no engine exists (WILDLIFE.md section 6 gives the rule as plankton at fronts), so the index is made here: 3 to 14 m of water,
    10 to 80 m off land, more over steep bed (a front), near kelp (shoals gather at kelp edges) and in shallower water, times a seeded smooth field. Local maxima on a 16 m block grid, the best 4."""
    dx = w.dx
    land = w.island_label > 0
    dland = WP.chamfer(land) * dx
    depth = w.sea_level - w.height.astype(np.float64)
    gy, gx = np.gradient(depth, dx)
    steep = np.clip(np.hypot(gx, gy) / 0.5, 0, 1)
    rng = C.rng_for(seed, 702)
    f = rng.random((40, 40))
    n = w.height.shape[0]
    cells = []
    for bx in range(-7, 7):
        for bz in range(-7, 7):
            x = bx * 16.0 + 8.0
            z = bz * 16.0 + 8.0
            if math.hypot(x, z) > TABLE_SEA_R - 8:
                continue
            wx, wy = ox + x, oy - z
            c = int(round((wx - w.X[0, 0]) / dx))
            r = int(round((wy - w.Y[0, 0]) / dx))
            if not (0 <= r < n and 0 <= c < n) or land[r, c]:
                continue
            d = float(depth[r, c])
            dl = float(dland[r, c])
            if d < 3.0 or d > 16.0 or dl < 10.0 or dl > 80.0:
                continue
            noise = 0.5 * f[(bx + 20) % 40, (bz + 20) % 40] + 0.5 * f[((bx + 20) // 2 + 7) % 40, ((bz + 20) // 2 + 11) % 40]
            kb = min(1.0, sum(1 for q in kelp if abs(q[0] - x) < 30 and abs(q[1] - z) < 30 and math.hypot(q[0] - x, q[1] - z) < 30) / 4.0)       # shoals gather at kelp edges
            idx = (0.35 + 0.4 * steep[r, c] + 0.25 * min(1.0, dl / 40.0) + 0.5 * kb - 0.02 * max(0.0, d - 6.0)) * (0.35 + 0.65 * noise)
            cells.append((idx, x, z, d, dl))
    cells.sort(key=lambda t: (-t[0], round(t[1], 1), round(t[2], 1)))
    pick = []
    for idx, x, z, d, dl in cells:
        if all(math.hypot(x - p[1], z - p[2]) > 36.0 for p in pick):
            pick.append((idx, x, z, d, dl))
        if len(pick) >= SHOAL_MAX:
            break
    mx = max([p[0] for p in pick] or [1.0])
    return [dict(id=i, xy=[round(x, 1), round(z, 1)], index=round(min(1.0, idx / max(0.5, mx) * 0.9 + 0.1), 2), depth=round(d, 1), r=round(3.0 + 7.0 * min(1.0, idx / max(0.5, mx)), 1))
            for i, (idx, x, z, d, dl) in enumerate(pick)]


def recipe_hash(rec):
    """10 hex digits of the recipe (plain values, sorted keys): the name of its GLB, so that two sites with the same machine share one file"""
    return hashlib.sha256(json.dumps(rec, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:10]


def assign_recipe(seed, i, feat, used):
    """The recipe of robot site i of world `seed`: (recipe seed, radical, plan), deterministic from the world seed, the site id and the site features only.
    About two thirds of the sites are radical (ROBOT_RADICAL.md), the rest family tortoises. Role to site rules: pontoon only on a sheltered shore with open water within WATER_NEAR_M;
    walker, spotter and the ear scout anywhere; snail and crab on a beach (sand, shingle or gentle); roller on flat sand or gentle beach (slope under 0.15). `used` = (radical, plan) already given in this world: a repeat is made less likely."""
    rng = random.Random('life-robot-%d-%d' % (seed, i))
    radical = rng.random() < RADICAL_SHARE
    if not radical:
        pool = [(False, 'family', q) for q in FAM_POOL]
        k = rng.randrange(len(pool))
        return pool[k][2], False, 'family'
    beach = feat['beach'] in ('sand', 'shingle', 'gentle')
    sheltered = feat['beach'] != 'turf' and feat['slope'] < 0.35 and feat['exposure'] <= SHELTER_MAX and feat['water_m'] is not None and feat['water_m'] <= WATER_NEAR_M
    plans = {'walker': 1.0, 'spotter': 1.0, 'scout': 0.8}
    if beach:
        plans['snail'] = 1.0
        plans['crab'] = 1.0
    if feat['beach'] in ('sand', 'gentle') and feat['slope'] < 0.15:
        plans['roller'] = 1.0
    if sheltered:
        plans['pontoon'] = 3.0
    names = sorted(plans)
    wts = [plans[n] * ((0.0 if n == 'pontoon' else 0.25) if (True, n) in used else 1.0) for n in names]
    plan = names[rng.choices(range(len(names)), weights=wts, k=1)[0]]
    seeds = RAD_POOL[plan]
    return seeds[rng.randrange(len(seeds))], True, plan


def robot_block(w, man, ox, oy, rr, seed, seals):
    """1 to 3 collector robot sites (plus spare candidates) on gentle beach: sand, shingle or gentle shore class, slope under 0.35, 0.55 to 3.5 m over the sea (the page robot retreats up the beach when the tide covers it),
    within 16 m of water, away from the landing; each site gets a role and palette from blender/robot_recipe.py and a straight beach path along the shore to drive back and forth."""
    dx = w.dx
    sea = w.sea_level
    h = w.height.astype(np.float64)
    slope = np.clip(w.slope, 0, 3)
    shr = EW.shore_class(w)
    land = w.island_label > 0
    dwater = WP.chamfer(~land) * dx
    cand = np.isin(shr, (1, 2, 3, 6)) & (slope < 0.40) & ((h - sea) >= 0.40) & ((h - sea) <= 3.5) & (dwater <= 16.0) & (dwater >= 1.5) & (rr <= 96.0)
    L = man['landing']
    lx, ly = ox + L['xy'][0], oy - L['xy'][1]
    # beach width score: number of candidate cells in a 12 m neighbourhood (a wide gentle beach, not a ramp)
    from numpy.lib.stride_tricks import sliding_window_view
    k = 7
    pad = np.pad(cand.astype(np.float32), k // 2)
    cnt = sliding_window_view(pad, (k, k)).sum(axis=(2, 3))
    sandish = np.isin(shr, (1, 2)).astype(np.float64)
    score = np.where(cand, cnt / float(k * k) + 0.35 * sandish + 0.15 * np.isin(shr, (1, 2, 3)), -1.0)
    # drop cells too near the landing
    near_l = np.hypot(w.X - lx, w.Y - ly) < 26.0
    score[near_l] = -1.0
    # steepest descent toward water gives the shore normal
    gyy, gxx = np.gradient(dwater, dx)
    order = np.dstack(np.unravel_index(np.argsort(-score, axis=None, kind='stable'), score.shape))[0]
    seal_xy = [(ox + a['xy'][0], oy - a['xy'][1]) for a in seals]
    sites = []
    for excl in (22.0, 12.0, 0.0):
        sites = []
        for r, c in order[:4000]:
            if score[r, c] < 0.12:
                break
            x, y = float(w.X[r, c]), float(w.Y[r, c])
            if any(math.hypot(x - s['wx'], y - s['wy']) < 38.0 for s in sites):
                continue
            if any(math.hypot(x - sx, y - sy) < excl for sx, sy in seal_xy):
                continue
            nx_, ny_ = -gxx[r, c], -gyy[r, c]      # toward water
            ln = math.hypot(nx_, ny_)
            if ln < 1e-6:
                continue
            nx_, ny_ = nx_ / ln, ny_ / ln
            tx, ty = -ny_, nx_                     # along the shore
            # march both ways along the tangent while the cell stays beach (candidate-ish)
            ext = []
            for sg in (1.0, -1.0):
                d = 0.0
                while d < 9.0:
                    px, py = x + sg * tx * (d + 1.0), y + sg * ty * (d + 1.0)
                    cc = int(round((px - w.X[0, 0]) / dx)); rw = int(round((py - w.Y[0, 0]) / dx))
                    if not (0 <= rw < h.shape[0] and 0 <= cc < h.shape[1]) or not (cand[rw, cc] or (slope[rw, cc] < 0.5 and (h[rw, cc] - sea) >= 0.35 and land[rw, cc])):
                        break
                    d += 1.0
                ext.append(d)
            if ext[0] + ext[1] < 6.0:
                continue
            a = (x + tx * ext[0], y + ty * ext[0])
            b = (x - tx * ext[1], y - ty * ext[1])
            sites.append(dict(wx=x, wy=y, a=a, b=b, nrm=(nx_, ny_), score=float(score[r, c]), kind=int(shr[r, c])))
            if len(sites) >= ROBOT_CANDIDATES:
                break
        if len(sites) >= 1:
            break
    n_use = 1 + (seed % 3)
    n_use = min(n_use, max(1, len(sites)))
    res = []
    used_ids = set()
    for i, s in enumerate(sites):
        x, y = s['wx'], s['wy']
        r0 = int(round((y - w.Y[0, 0]) / dx)); c0 = int(round((x - w.X[0, 0]) / dx))
        expo = float(np.asarray(w.exposure)[max(0, r0 - 2):r0 + 3, max(0, c0 - 2):c0 + 3].mean())
        slp = float(slope[max(0, r0 - 1):r0 + 2, max(0, c0 - 1):c0 + 2].mean())
        water_m = None                      # distance along the shore normal to water at least 0.5 m deep (mean sea level)
        for d in np.arange(1.0, 40.0, 1.0):
            px, py = x + s['nrm'][0] * d, y + s['nrm'][1] * d
            cc = int(round((px - w.X[0, 0]) / dx)); rw = int(round((py - w.Y[0, 0]) / dx))
            if not (0 <= rw < h.shape[0] and 0 <= cc < h.shape[1]):
                break
            if h[rw, cc] < sea - 0.5:
                water_m = float(d)
                break
        beach = 'sand' if s['kind'] == 1 else 'shingle' if s['kind'] == 2 else 'gentle' if s['kind'] == 3 else 'turf'
        feat = dict(beach=beach, exposure=round(expo, 2), slope=round(slp, 2), water_m=None if water_m is None else round(water_m, 1))
        rseed, radical, plan = assign_recipe(seed, i, feat, used_ids)
        used_ids.add((radical, plan))
        rec = RR.robot_recipe_for(rseed, radical=radical)
        rh = recipe_hash(rec)
        res.append(dict(id=i, use=bool(i < n_use), xy=to_page(ox, oy, s['wx'], s['wy']), a=to_page(ox, oy, *s['a']), b=to_page(ox, oy, *s['b']),
                        normal=[round(s['nrm'][0], 3), round(-s['nrm'][1], 3)], beach=beach, exposure=feat['exposure'], slope=feat['slope'], water_m=feat['water_m'],
                        recipe_seed=rseed, radical=radical, plan=plan, recipe_hash=rh, glb='assets/collector/world_robots/robot_%s_live.glb' % rh,
                        role=rec['role'], palette=rec['paint']['palette'], paint=rec['paint']['paint'], paint2=rec['paint']['paint2'], arm=rec['paint']['arm'],
                        lamp=rec['lamp']['code'], lamp_search=rec['lamp']['search'], lamp_found=rec['lamp']['found'], scale=rec['body']['scale'], drive=rec['body']['drive']['type'],
                        quirks=rec['quirks'], age_years=rec['wear']['age_years']))
    return res


def build_life(prov, seed):
    man = json.load(open(os.path.join(OUT, 'seed%04d' % seed, 'manifest.json')))
    n = 257 if prov != 'D' else 513
    w = W.make_world(seed, prov, n=n)
    ox, oy, inwin, rr = window_masks(w, man)
    assert abs(ox - man['centre_world_xy'][0]) < 1e-6
    segs = SC.build_shores(w, seed)
    village = SC.choose_landing(w, segs, seed)
    out = WP.place_wildlife(w, segs, village, seed)
    seals = seal_block(w, man, out, ox, oy, rr, village)
    colonies, puffins, bi = bird_blocks(w, man, out, ox, oy, rr, seed)
    kelp = kelp_block(w, ox, oy, rr, seed)
    shoals = shoal_block(w, ox, oy, rr, seed, kelp)
    robots = robot_block(w, man, ox, oy, rr, seed, seals)
    life = dict(version=VERSION, seed=int(seed), province=prov, rock=man['rock'], month=MONTH, window_m=man['window_m'],
                note='counts and sites only; page coordinates x east, z south, metres from the window centre; see landform/export_life.py and LIFE_VIEW.md',
                seals=seals, colonies=colonies, puffins=puffins, birds=bi, kelp=kelp, shoals=shoals, robots=robots,
                source=dict(world_hash=man['source']['world_hash'], data_sha=man['data_sha']))
    return life


def dump(life):
    return json.dumps(life, separators=(',', ':'), sort_keys=True)


def main():
    check = len(sys.argv) > 1 and sys.argv[1] == 'check'
    tot = 0
    bad = 0
    print('seed prov | seals(sites:n) | colonies | puffin sites | kelp | shoals | robots(role) | bytes')
    for prov, seed in EW.WORLDS:
        life = build_life(prov, seed)
        s = dump(life)
        d = os.path.join(OUT, 'seed%04d' % seed)
        p = os.path.join(d, 'life.json')
        if check:
            old = open(p).read() if os.path.exists(p) else ''
            same = old == s
            bad += 0 if same else 1
            print(('SAME ' if same else 'DIFF ') + 'seed %d %s' % (seed, hashlib.sha256(s.encode()).hexdigest()[:12]))
            continue
        with open(p, 'w') as f:
            f.write(s)
        with open(os.path.join(d, 'life.js'), 'w') as f:
            f.write('/* generated by landform/export_life.py: life of world %d. Do not edit. */\n(window.LI_LIFE=window.LI_LIFE||{})[%d]=%s;\n' % (seed, seed, s))
        tot += len(s)
        print('%4d %s | %s | %s | %s | %d | %d | %d | %s | %d' % (
            seed, prov, ' '.join('%d' % x['n'] for x in life['seals']) or '-', ' '.join('%s%d' % (c['kind'][0], c['pairs']) for c in life['colonies']) or '-',
            ' '.join('%d' % x['pairs'] for x in life['puffins']) or '-', len(life['kelp']), len(life['shoals']), len(life['robots']),
            ' '.join(r['role'][:4] + ('*' if r['use'] else '') for r in life['robots']) or '-', len(s)))
    if check:
        sys.exit(1 if bad else 0)
    print('total life.json bytes: %d' % tot)


if __name__ == '__main__':
    main()
