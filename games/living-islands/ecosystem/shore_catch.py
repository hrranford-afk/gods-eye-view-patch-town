# shore_catch: per-shore exposure and drift catch rate (wrack / strandline items per metre per tide).
# Reads the shores that landform/world.py describes (island labels, exposure, slope, rock, veg) and ranks islands rich/poor.
# Source of the idea: EVOLUTION_TREE.md (the sea brings things) and research/FLOW_TYPES.md flow 16 (wrack lines:
# dense on sheltered gentle shores, rare on steep rock). Anchor rates from research/BEACH_COLLECTOR.md section 5.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import eco_common as C

# ---- TUNING numbers (all design choices; anchors from BEACH_COLLECTOR section 5: poor 0.2, normal 1, rich 5 items/m/tide)
RATE_NORMAL = 1.0           # TUNING: items per metre of strandline per tide on a normal shore
RATE_MIN, RATE_MAX = 0.02, 8.0
POOR_BELOW, RICH_FROM = 0.5, 2.5      # TUNING class edges (items/m/tide)
REF_RETAIN = 0.32           # TUNING: raw catch score that maps to RATE_NORMAL (set so the median shore is about normal)
SEG_BLOCK_M = 48.0          # shores are cut into segments by 48 m blocks along the coast
MIN_COLLECTABLE_M = 8.0     # a strandline shorter than this is not worth a patrol line
MAX_COLLECT_SLOPE = 0.9     # TUNING: sand and shingle; the world's shore cells include the back beach so this is looser than the 15 degree rule
MAX_COLLECT_SLOPE_ROCK = 0.6  # TUNING: gentle rock ledge only (BEACH_COLLECTOR section 3: refuses anything over 15 degrees on sand)
SUPPLY_SIGMA = 0.45         # TUNING: how much richer or poorer the open sea is for one world (lognormal sigma)
ISLAND_SIGMA = 0.20         # TUNING: and for one island (what upstream islands and wrecks happen to drift past)
SEASON_SWING = 0.35         # TUNING: winter 1.35 x, summer 0.65 x of the mean arrival
NOISE_SIGMA = 0.25          # TUNING: tide to tide scatter
DRIFT_FROM_DEG = 270.0      # TUNING: prevailing wind and swell from the west (compass); drift lands on west-facing shores
SAND_ROCKS = ('shell_sand', 'black_sand')
SHINGLE_ROCKS = ('cobble_shingle',)


def _shore_cells(w):
    lab = w.island_label.astype(np.int32)
    land = lab > 0
    water = ~land
    nb = np.zeros(land.shape, dtype=bool)
    out_dx = np.zeros(land.shape)
    out_dy = np.zeros(land.shape)
    for ax, sg in ((0, 1), (0, -1), (1, 1), (1, -1)):
        sh = np.roll(water, sg, axis=ax)
        if ax == 0:
            sh[0 if sg == 1 else -1, :] = False
        else:
            sh[:, 0 if sg == 1 else -1] = False
        nb |= sh
        # np.roll(x, 1, axis) puts the neighbour at index-1 into position index
        if ax == 0:
            out_dy += sh * (-sg)      # row axis is y (row 0 south): sg=1 means the water is at row-1, so south
        else:
            out_dx += sh * (-sg)
    return land & nb, out_dx, out_dy, lab


def build_shores(w, seed):
    # returns a list of shore segment dicts, deterministic from the world
    shore, ox, oy, lab = _shore_cells(w)
    names = [r['name'] for r in w.rocks]
    sand_ids = [i for i, n in enumerate(names) if n in SAND_ROCKS]
    shingle_ids = [i for i, n in enumerate(names) if n in SHINGLE_ROCKS]
    rr, cc = np.nonzero(shore)
    xs, ys = w.X[rr, cc], w.Y[rr, cc]
    key_i = lab[rr, cc].astype(np.int64)
    bx = np.floor((xs + 4096.0) / SEG_BLOCK_M).astype(np.int64)
    by = np.floor((ys + 4096.0) / SEG_BLOCK_M).astype(np.int64)
    keys = (key_i * 1000003 + bx) * 1000033 + by
    order = np.argsort(keys, kind='stable')
    keys_s = keys[order]
    cuts = np.flatnonzero(np.diff(keys_s)) + 1
    groups = np.split(order, cuts)
    r_sea = C.rng_for(seed, 31)
    sea_supply = math.exp(SUPPLY_SIGMA * r_sea.standard_normal() - 0.5 * SUPPLY_SIGMA ** 2)
    isl_supply = {}
    for i in range(1, len(w.islands) + 1):
        r = C.rng_for(seed, 32, i)
        isl_supply[i] = math.exp(ISLAND_SIGMA * r.standard_normal() - 0.5 * ISLAND_SIGMA ** 2)
    segs = []
    for g in groups:
        n = len(g)
        if n < 3:
            continue
        r_, c_ = rr[g], cc[g]
        isl = int(lab[r_[0], c_[0]])
        length = n * w.dx * 0.785           # same Manhattan-to-Euclid correction as landform/world.py
        E = float(w.exposure[r_, c_].mean())
        slope = float(np.clip(w.slope[r_, c_], 0, 3).mean())
        rid = w.rock[r_, c_]
        vg = w.veg[r_, c_]
        f_sand = float((np.isin(rid, sand_ids) | (vg == 9)).mean())          # veg 9 = sand beach in landform VEG_LEGEND
        f_shingle = float((np.isin(rid, shingle_ids) | (vg == 10)).mean())   # veg 10 = shingle
        nx, ny = float(ox[r_, c_].sum()), float(oy[r_, c_].sum())
        facing = math.degrees(math.atan2(ny, nx)) % 360.0 if (nx or ny) else 0.0   # maths degrees, 0 = east, 90 = north
        kind = 'sand' if f_sand >= 0.3 else 'shingle' if f_shingle >= 0.3 else 'rock ledge' if slope < 0.6 else 'cliff'
        kindf = {'sand': 1.0, 'shingle': 0.85, 'rock ledge': 0.25, 'cliff': 0.08}[kind]
        gentle = float(np.clip(1.0 - slope / 1.6, 0.1, 1.0))
        retention = kindf * (0.35 + 0.65 * gentle) * float(np.clip(1.15 - E, 0.1, 1.15))
        # onshore: a west-facing shore (outward normal pointing west) meets a west drift head on
        drift_to = math.radians((DRIFT_FROM_DEG + 180.0) % 360.0)           # compass bearing the drift travels to
        face_compass = math.radians((90.0 - facing) % 360.0)
        onshore = max(0.0, -math.cos(face_compass - drift_to))
        arrival = 0.45 + 0.55 * onshore
        rate = RATE_NORMAL * (retention * arrival / REF_RETAIN) * sea_supply * isl_supply[isl]
        rate = float(np.clip(rate, RATE_MIN, RATE_MAX))
        collectable = bool(length >= MIN_COLLECTABLE_M and ((kind in ('sand', 'shingle') and slope <= MAX_COLLECT_SLOPE) or (kind == 'rock ledge' and slope <= MAX_COLLECT_SLOPE_ROCK)))
        segs.append(dict(island=isl, xy=(float(w.X[r_, c_].mean()), float(w.Y[r_, c_].mean())), length_m=float(length),
                         exposure=E, slope=slope, kind=kind, facing_deg=float(facing), onshore=float(onshore),
                         rate_items_m_tide=rate, collectable=collectable,
                         wrack_index=float(min(1.0, rate / 5.0)),
                         klass='poor' if rate < POOR_BELOW else 'rich' if rate >= RICH_FROM else 'normal'))
    segs.sort(key=lambda s: (s['island'], round(s['xy'][0], 3), round(s['xy'][1], 3)))
    for k, s in enumerate(segs):
        s['id'] = k
    return segs


def island_catch(segs, w):
    # per island summary and a rank: richest first by total items per tide on collectable strandline
    out = []
    for i in range(1, len(w.islands) + 1):
        ss = [s for s in segs if s['island'] == i]
        col = [s for s in ss if s['collectable']]
        L = sum(s['length_m'] for s in col)
        tot = sum(s['length_m'] * s['rate_items_m_tide'] for s in col)
        best = max((s['rate_items_m_tide'] for s in col), default=0.0)
        out.append(dict(island=i, coast_m=sum(s['length_m'] for s in ss), collectable_m=L, items_per_tide=tot,
                        mean_rate=(tot / L if L else 0.0), best_rate=best,
                        klass=('none' if not col else 'poor' if best < POOR_BELOW else 'rich' if best >= RICH_FROM else 'normal')))
    ranked = sorted(out, key=lambda d: (-d['items_per_tide'], d['island']))
    for r, d in enumerate(ranked, 1):
        d['rank'] = r
    return out


def seed_catch_summary(segs):
    col = [s for s in segs if s['collectable']]
    L = sum(s['length_m'] for s in col)
    rates = sorted(s['rate_items_m_tide'] for s in col)
    return dict(n_segments=len(segs), n_collectable=len(col), collectable_m=L,
                best_rate=(rates[-1] if rates else 0.0), median_rate=(rates[len(rates) // 2] if rates else 0.0),
                length_weighted_rate=(sum(s['length_m'] * s['rate_items_m_tide'] for s in col) / L if L else 0.0),
                items_per_tide_all=sum(s['length_m'] * s['rate_items_m_tide'] for s in col),
                klass=('none' if not col else 'poor' if rates[-1] < POOR_BELOW else 'rich' if rates[-1] >= RICH_FROM else 'normal'))


def tide_multiplier(seed, shore_id, day, tide_idx, start_doy, storm_strength):
    # arrival multiplier for one tide: season, spring or neap, storm spike, scatter. Deterministic from (seed, shore, day, tide).
    doy = start_doy + day
    seas = 1.0 + SEASON_SWING * (2 * C.season_w(doy) - 1.0)
    spring = 0.85 + 0.30 * C.springness(day + 0.5 * tide_idx)
    storm = max(1.0, storm_strength)
    r = C.rng_for(seed, 41, shore_id, day, tide_idx)
    noise = math.exp(NOISE_SIGMA * r.standard_normal() - 0.5 * NOISE_SIGMA ** 2)
    return seas * spring * storm * noise


def tide_catch_rate(seg, seed, day, tide_idx, start_doy, storm_strength):
    # items per metre of strandline arriving on this tide
    return seg['rate_items_m_tide'] * tide_multiplier(seed, seg['id'], day, tide_idx, start_doy, storm_strength)


# ---- the village landing and the collector's shore ---------------------------------------------
LANDING_MIN_FRONTAGE, LANDING_MAX_FRONTAGE = 40.0, 80.0      # TUNING: metres of shore a pile spreads along (the landing itself is shorter)
COLLECTOR_REACH_M = 160.0                                    # TUNING: the collector's charge spot is within this of the landing


def choose_landing(w, segs, seed):
    # The settlers land where the landing finder says (gentle, lee side, deep enough), preferring the largest island and the
    # lowest exposure. Returns None when the world has no landing at all (then the tender cannot deliver: not a dead end, a
    # different game, flagged in the report).
    cands = list(w.landing_candidates)
    if not cands:
        return None
    best = sorted(cands, key=lambda c: (c['island'] != 1, round(c['exposure'], 3), -c['length_m'], c['xy']))[0]
    x, y = best['xy']
    face = math.radians(best['facing_deg'])
    out = (math.cos(face), math.sin(face))                    # unit vector pointing out to sea (x east, y north)
    col = [s for s in segs if s['collectable'] and s['island'] == best['island']]
    near = [s for s in col if math.hypot(s['xy'][0] - x, s['xy'][1] - y) <= COLLECTOR_REACH_M]
    pool = near or col
    cs = max(pool, key=lambda s: (s['rate_items_m_tide'] * s['length_m'], -s['id'])) if pool else None
    return dict(island=best['island'], xy=(x, y), facing_deg=best['facing_deg'], out=out, kind=best['kind'],
                frontage_m=float(np.clip(best['length_m'], LANDING_MIN_FRONTAGE, LANDING_MAX_FRONTAGE)),
                village_xy=(x - 30.0 * out[0], y - 30.0 * out[1]),         # houses 30 m inland of the landing
                collector_seg=(cs['id'] if cs else None))
