"""foundry/lfmetrics.py -- per-world measures for the seed foundry sweep (numpy only; PIL only for the plan thumbnail).

Everything here takes the land formation tool as an argument (`W` = the world module, `CH` = checks module) so the
sweep can run a SNAPSHOT of world.py and the tuning study can run a monkeypatched one.  Nothing here edits world.py.

measure_world(W, CH, w) -> one flat dict of numbers: the checks.py realism numbers, the playability numbers (start island,
landings, coves, tide merges, seabed) and a cheap visual score from a hillshade plan view.  The start-island rule is the
owner's rule as written in the brief (mine to design; see FOUNDRY.md):
  largest island with bounding box 60..200 m, not within 14 m of the world edge, best landing score >= 0.85
  (the landing score is the same formula as blender/landform_scene.py, copied because that file imports bpy),
  fresh water (a loch or a wet bog patch), timber soil (a patch of gentle sheltered soil >= 0.15 m deep), sheltered lee landing.
"""
import math

import numpy as np

EXT_MIN, EXT_MAX = 60.0, 200.0       # bounding box side of the start island (m)
EDGE_MARGIN_M = 14.0
GOOD_LANDING = 0.85
LEE_MAX_EXPOSURE = 0.30
FRESH_LOCH_M2, FRESH_WET_M2 = 20.0, 80.0
TIMBER_SOIL_M, TIMBER_MIN_M2 = 0.15, 150.0
_KIND = {'sand': 1.0, 'gentle rock/turf': 0.8, 'shingle': 0.45, 'rock ledge': 0.2}


def _f(x, nd=4):
    """JSON-safe float: nan/inf -> None, rounded."""
    if x is None:
        return None
    x = float(x)
    if not math.isfinite(x):
        return None
    return round(x, nd)


# ---------------------------------------------------------------- landing score (copy of blender/landform_scene.py rules)
def _room(W, w, relaxed=False):
    if relaxed:
        ok = ((w.height > 1.2) & (w.height < 16.0) & (w.slope < 0.85)).astype(np.float64)
    else:
        ok = ((w.height > 1.5) & (w.height < 9.0) & (w.slope < 0.45) & (w.wetness < 0.7)).astype(np.float64)
    return W.blur(ok, 8, 1)


def _score(kind, exposure, slope, length, room):
    return _KIND.get(kind, 0.3) + (0.45 - exposure) * 1.5 - slope * 1.0 + min(length, 16.0) / 16.0 * 0.5 + room * 1.2


def pick_landing(W, w, iid, room):
    """Best landing of island iid: the tool's candidates scored by kind/exposure/slope/length/room, else a shore scan. dict or None."""
    best = None
    n = w.height.shape[0]
    for c in w.islands[iid - 1]['landing_candidates']:
        c0 = int(round((c['xy'][0] + w.size_m / 2) / w.dx))
        r0 = int(round((c['xy'][1] + w.size_m / 2) / w.dx))
        rm = float(room[min(max(r0, 0), n - 1), min(max(c0, 0), n - 1)])
        sc = _score(c['kind'], c['exposure'], c['slope'], c['length_m'], rm)
        if rm > 0.12 and (best is None or sc > best['score']):
            best = dict(xy=(float(c['xy'][0]), float(c['xy'][1])), kind=c['kind'], source='tool', score=float(sc),
                        exposure=float(c['exposure']), slope=float(c['slope']))
    if best is None:
        land = w.island_label == iid
        water = ~land
        edge = np.roll(water, 1, 0) | np.roll(water, -1, 0) | np.roll(water, 1, 1) | np.roll(water, -1, 1)
        shore = land & edge & (w.height < 1.4)
        rm_map = room
        rr, cc = np.nonzero(shore & (rm_map > 0.2))
        if len(rr) == 0:
            rm_map = _room(W, w, True) + 0.21
            shore = shore | (land & (w.height < 3.0) & edge)
            rr, cc = np.nonzero(shore & (rm_map > 0.2))
        if len(rr) == 0:
            return None
        sc = np.array([_score('gentle rock/turf', w.exposure[r, c], w.slope[r, c], 6.0, rm_map[r, c]) for r, c in zip(rr, cc)])
        k = int(np.argmax(sc))
        best = dict(xy=(float(w.X[rr[k], cc[k]]), float(w.Y[rr[k], cc[k]])), kind='scan (rock/turf shore)', source='scan',
                    score=float(sc[k]), exposure=float(w.exposure[rr[k], cc[k]]), slope=float(w.slope[rr[k], cc[k]]))
    hs = W.blur(w.height.astype(np.float64), 2, 2)
    gy, gx = np.gradient(hs, w.dx)
    c0 = int(round((best['xy'][0] + w.size_m / 2) / w.dx))
    r0 = int(round((best['xy'][1] + w.size_m / 2) / w.dx))
    nx, ny = -gx[r0, c0], -gy[r0, c0]
    if math.hypot(nx, ny) < 1e-3:
        cx, cy = w.islands[iid - 1]['centroid']
        nx, ny = best['xy'][0] - cx, best['xy'][1] - cy
    L = math.hypot(nx, ny) or 1.0
    best['normal'] = (nx / L, ny / L)
    return best


# ---------------------------------------------------------------- start island
def island_extent(w, iid):
    ys, xs = np.nonzero(w.island_label == iid)
    return (xs.max() - xs.min() + 1) * w.dx, (ys.max() - ys.min() + 1) * w.dx


def touches_edge(w, iid, margin_m=EDGE_MARGIN_M):
    ys, xs = np.nonzero(w.island_label == iid)
    k = int(margin_m / w.dx)
    n = w.height.shape[0]
    return bool(xs.min() < k or ys.min() < k or xs.max() > n - 1 - k or ys.max() > n - 1 - k)


def _island_resources(W, w, iid):
    isl = w.island_label == iid
    cell = w.dx * w.dx
    loch = float(((w.lake_depth > 0) & isl).sum() * cell)
    wet = float(((w.wetness > 0.7) & isl & (w.height > 0.3)).sum() * cell)
    soil = np.array([r['soil_depth_m'] for r in w.rocks])[w.rock]
    tim = isl & (soil >= TIMBER_SOIL_M) & (w.height > 1.5) & (w.height < 12.0) & (w.slope < 0.5) & (w.wind_exposure < 0.5)
    timber = float(tim.sum() * cell)
    return loch, wet, timber


def start_island(W, w, room=None):
    """Evaluate every island >= 1500 m2 against the six start rules. Returns (best, rows).
    best = dict(island, ok(bool), failed[list], score(0..1), ...) for the largest island passing all rules, else the best partial."""
    room = _room(W, w) if room is None else room
    rows = []
    for isl in w.islands:
        if isl['area_m2'] < 1500.0:
            break                                        # islands are sorted by area, largest first
        iid = isl['id']
        ex = max(island_extent(w, iid))
        edge = touches_edge(w, iid)
        land = pick_landing(W, w, iid, room)
        loch, wet, timber = _island_resources(W, w, iid)
        failed = []
        if not (EXT_MIN <= ex <= EXT_MAX):
            failed.append('size')
        if edge:
            failed.append('edge')
        if land is None or land['score'] < GOOD_LANDING:
            failed.append('landing')
        if not (loch >= FRESH_LOCH_M2 or wet >= FRESH_WET_M2):
            failed.append('water')
        if timber < TIMBER_MIN_M2:
            failed.append('timber')
        if land is None or land['exposure'] > LEE_MAX_EXPOSURE:
            failed.append('lee')
        comp = dict(
            size=1.0 if EXT_MIN <= ex <= EXT_MAX else max(0.0, 1 - min(abs(ex - EXT_MIN), abs(ex - EXT_MAX)) / 60.0),
            edge=0.0 if edge else 1.0,
            landing=0.0 if land is None else float(np.clip(land['score'] / 1.3, 0, 1)),
            water=float(np.clip(max(loch / 120.0, wet / 400.0), 0, 1)),
            timber=float(np.clip(timber / 600.0, 0, 1)),
            lee=0.0 if land is None else float(np.clip(1 - land['exposure'] / 0.6, 0, 1)))
        rows.append(dict(island=iid, area_m2=isl['area_m2'], extent_m=float(ex), edge=edge, landing=land, loch_m2=loch, wet_m2=wet,
                         timber_m2=timber, failed=failed, score=float(np.mean(list(comp.values()))), ok=not failed))
    if not rows:
        return None, rows
    ok = [r for r in rows if r['ok']]
    if ok:
        return ok[0], rows                               # largest passing island (rows are in area order)
    return sorted(rows, key=lambda r: (len(r['failed']), -r['area_m2']))[0], rows


# ---------------------------------------------------------------- geometry helpers
def _edge_pts(w, ids, cap=80):
    lab = w.island_label
    land = lab > 0
    edge = land & ~(np.roll(land, 1, 0) & np.roll(land, -1, 0) & np.roll(land, 1, 1) & np.roll(land, -1, 1))
    pts = []
    for i in ids:
        ys, xs = np.nonzero(edge & (lab == i))
        if len(ys) > cap:
            sel = np.linspace(0, len(ys) - 1, cap).astype(int)
            ys, xs = ys[sel], xs[sel]
        if len(ys):
            pts.append(np.stack([w.X[0, xs], w.Y[ys, 0]], 1))
    return np.concatenate(pts) if pts else np.zeros((0, 2))


def coves_detail(W, w):
    """Sheltered coves as (x, y, area_m2): same rule as checks.coves, with positions."""
    h = w.height.astype(np.float64)
    land = h > w.sea_level
    enclosed = W.blur(land.astype(np.float64), 10, 1) > 0.18
    cove = (~land) & (w.exposure < 0.2) & enclosed & (w.sea_level - h > 1.0) & (w.sea_level - h < 15)
    lab, n = W.label4(cove)
    out = []
    flat = lab.ravel()
    cnt = np.bincount(flat, minlength=n + 1)
    for c in range(1, n + 1):
        if cnt[c] * w.dx * w.dx >= 150.0:
            rr, cc = np.divmod(np.flatnonzero(flat == c), h.shape[1])
            out.append((float(w.X[rr, cc].mean()), float(w.Y[rr, cc].mean()), float(cnt[c] * w.dx * w.dx)))
    return out, enclosed


# ---------------------------------------------------------------- plan view and cheap visual score
def plan_image(sheet_mod, w):
    """North-up RGB PIL image of the world (the landform sheet's own renderer)."""
    return sheet_mod.render_plan(w)


def visual_scores(w, im):
    a = np.asarray(im).astype(np.float64) / 255.0
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    land = (w.height > w.sea_level)[::-1]
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    gy, gx = np.gradient(lum)
    edge_energy = float(np.hypot(gx, gy).mean())
    lm = float(lum[land].mean()) if land.any() else 0.0
    sm = float(lum[~land].mean()) if (~land).any() else 0.0
    contrast = abs(lm - sm)
    muted = float(((sat <= 0.45) & (mx > 0.15))[land].mean()) if land.any() else 0.0
    # variety: entropy of the vegetation classes on land (0..1 of log2(8))
    v = w.veg[w.height > w.sea_level]
    var = 0.0
    if len(v):
        p = np.bincount(v, minlength=13)[1:].astype(np.float64)
        p = p[p > 0] / p.sum()
        var = float(-(p * np.log2(p)).sum() / 3.0)
    return dict(edge_energy=edge_energy, contrast=contrast, palette_muted=muted, veg_variety=min(var, 1.0))


# ---------------------------------------------------------------- main
def measure_world(W, CH, w, sheet_mod=None, thumb_path=None, thumb_px=224):
    m = CH.measure(w)
    m.pop('slope_hist', None)
    lv = w.sea_level
    h = w.height.astype(np.float64)
    cell = w.dx * w.dx
    land = h > lv
    room = _room(W, w)
    best, rows = start_island(W, w, room)
    areas = np.array([i['area_m2'] for i in w.islands])
    n_skerry = int(((areas >= 64.0) & (areas < 500.0)).sum())
    n_small = int(((areas >= 500.0) & (areas < 2500.0)).sum())
    out = dict(m)
    out.update(n_skerry=n_skerry, n_small=n_small, n_medium_large=int((areas >= 2500.0).sum()),
               land_m2=float(land.sum() * cell), largest_m2=float(areas.max()) if len(areas) else 0.0)
    # start island
    if best is not None:
        iid = best['island']
        L = best['landing']
        out.update(start_island=iid, start_ok=bool(best['ok']), start_failed=best['failed'], start_score=best['score'],
                   start_area_m2=best['area_m2'], start_extent_m=best['extent_m'], start_loch_m2=best['loch_m2'], start_wet_m2=best['wet_m2'],
                   start_timber_m2=best['timber_m2'], start_landing_score=(L['score'] if L else None),
                   start_landing_kind=(L['kind'] if L else None), start_landing_exposure=(L['exposure'] if L else None),
                   start_landing_xy=(L['xy'] if L else None), start_landing_normal=(L['normal'] if L else None),
                   n_start_candidates=int(sum(1 for r in rows if r['ok'])))
        out['landings_start'] = len(w.islands[iid - 1]['landing_candidates'])
        # distance from the start landing to the nearest landing candidate on another island, and coves near it
        others = [c for c in w.landing_candidates if c['island'] != iid]
        cv, enclosed = coves_detail(W, w)
        if L is not None:
            lx, ly = L['xy']
            ds = [math.hypot(c['xy'][0] - lx, c['xy'][1] - ly) for c in others]
            out['landing_dist_other_m'] = min(ds) if ds else None
            out['landings_other_within_150m'] = int(sum(1 for d in ds if d <= 150.0))
            dc = [math.hypot(x - lx, y - ly) for x, y, _ in cv]
            out['cove_dist_m'] = min(dc) if dc else None
            out['coves_within_100m'] = int(sum(1 for d in dc if d <= 100.0))
        # row gap from the start island to the nearest other island >= 600 m2
        big = [i['id'] for i in w.islands if i['area_m2'] >= 600.0 and i['id'] != iid]
        if big:
            P0, P1 = _edge_pts(w, [iid]), _edge_pts(w, big)
            if len(P0) and len(P1):
                d = np.hypot(P0[:, None, 0] - P1[None, :, 0], P0[:, None, 1] - P1[None, :, 1])
                out['row_gap_start_m'] = float(d.min())
        isl = w.islands[iid - 1]
        out['start_joins_low_tide'] = len(isl['joins_at_low_tide'])
    else:
        out.update(start_island=None, start_ok=False, start_failed=['no island >= 1500 m2'], start_score=0.0)
        cv, enclosed = coves_detail(W, w)
    out['coves_n'] = len(cv)
    # tide merges
    mergers = [i for i in w.islands if i['joins_at_low_tide']]
    out['n_merge_isl'] = len(mergers)
    out['merge_largest_group'] = int(max([len(i['joins_at_low_tide']) + 1 for i in mergers], default=0))
    # seabed
    wd = lv - h
    chan = (~land) & enclosed
    out['deepest_channel_m'] = float(wd[chan].max()) if chan.any() else 0.0
    gaps = CH.nearest_gaps(w)
    out['strait_min_m'] = float(min(gaps)) if gaps else None
    out['deepest_m'] = float(wd.max())
    out['sand_cells_share'] = float((w.rock == W.R_SAND).mean())
    # visual
    if sheet_mod is not None:
        im = plan_image(sheet_mod, w)
        out.update(visual_scores(w, im))
        if thumb_path:
            from PIL import Image
            t = im.resize((thumb_px, thumb_px), Image.LANCZOS)
            t.save(thumb_path, optimize=True)
    return out
