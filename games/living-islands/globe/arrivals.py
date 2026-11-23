# arrivals.py: from a finished drift run to what one table (a 200 m window on the sea) sees.
# A table sits in one ocean cell. Every particle that first enters that cell is a candidate; a fixed share (P_CATCH) of them
# find the table's shore (hash of seed, particle and cell, so the answer never depends on call order).
# Keys are  seed:globe:kind:index  with index the rank by arrival day; calling twice gives identical keys (idempotent).
# Strays (floating animals) go to their own list with their own keys. Source regions use the generic invented names of planet.py.
import hashlib
import json
import numpy as np
import planet as PL
import circulation as CI
import drift as DR

P_CATCH = 0.10               # TUNING: share of the particles entering the table cell that reach its shore (about a 55 km island across a 555 km cell)
CLASSES = {                  # generic classes per kind, chosen by hash of the particle (no real names)
    'seeds': ('drift_bean', 'pod', 'winged_seed'),
    'logs': ('whole_log', 'root_mass', 'branch_raft'),
    'litter': ('float_bottle', 'net_scrap', 'crate_lid', 'foam_block'),
    'wreck_debris': ('plank', 'spar', 'hatch_cover', 'barrel'),
    'ships': ('relic_skiff', 'drifting_hull', 'lost_dinghy'),
}
STRAY_CLASSES = {            # by source band: (class, base fragility)
    'tropical': ('warm_turtle', 'sail_floater'),
    'subtropical': ('young_turtle', 'jelly_bloom'),
    'temperate': ('lost_seal_pup', 'big_jelly'),
    'subpolar': ('cold_fish_school',),
    'polar': ('ice_drifter',),
}
COLD_STUN_C = 5.0            # TUNING: a stray whose source is this much warmer than the table arrives stressed


def _mix(x):
    # splitmix64 finaliser on uint64 arrays
    x = (x ^ (x >> np.uint64(30))) * np.uint64(0xBF58476D1CE4E5B9)
    x = (x ^ (x >> np.uint64(27))) * np.uint64(0x94D049BB133111EB)
    return x ^ (x >> np.uint64(31))


def hash01(seed, a, b, salt):
    # deterministic uniform in [0, 1) from integers; a, b arrays or scalars
    with np.errstate(over='ignore'):
        x = np.asarray(a, dtype=np.uint64) * np.uint64(0x9E3779B97F4A7C15) + np.asarray(b, dtype=np.uint64) * np.uint64(0xC2B2AE3D27D4EB4F)
        x = x + np.uint64(int(seed) * 2654435761 + int(salt) * 40503 + 12345)
        x = _mix(_mix(x))
    return (x >> np.uint64(11)).astype(np.float64) / float(1 << 53)


class World:
    # one seed: planet, circulation, and (built on first use) the drift run
    def __init__(self, seed, days=1500, **drift_opts):
        self.seed = int(seed)
        self.days = days
        self.planet = PL.Planet(seed)
        self.circ = CI.Circulation(self.planet)
        self.drift_opts = drift_opts
        self._res = None

    @property
    def res(self):
        if self._res is None:
            self._res = DR.run(self.planet, self.circ, self.seed, self.days, **self.drift_opts)
        return self._res


def default_table(world, index=0):
    # deterministic table cell for a seed: an ocean cell between 10 and 60 degrees, uniform by area; index picks another table
    p = world.planet
    ok = p.ocean & (np.abs(PL.LAT2) >= 10.0) & (np.abs(PL.LAT2) <= 60.0)
    w = (PL.AREA_W * ok).ravel()
    rng = np.random.default_rng([world.seed, 8000, index])
    c = int(rng.choice(w.size, p=w / w.sum()))
    j, i = c // PL.NLON, c % PL.NLON
    return float(PL.LON[i]), float(PL.LAT[j])


def nearest_ocean_cell(planet, lon, lat):
    j, i = PL.cell_of(lon, lat)
    j, i = int(j), int(i)
    if planet.ocean[j, i]:
        return j, i
    best = None
    for r in range(1, 6):
        for dj in range(-r, r + 1):
            for di in range(-r, r + 1):
                jj, ii = j + dj, (i + di) % PL.NLON
                if 0 <= jj < PL.NLAT and planet.ocean[jj, ii]:
                    d = dj * dj + di * di
                    if best is None or d < best[0]:
                        best = (d, jj, ii)
        if best:
            return best[1], best[2]
    raise ValueError('no ocean near the requested table location')


def table_climate(world, j, i, lon, lat):
    c = world.circ
    u = float(c.u[j, i])
    v = float(c.v[j, i])
    cu, cv = c.sample(lon, lat)
    sp = float(np.hypot(cu, cv))
    bearing_to = float(np.degrees(np.arctan2(cu, cv)) % 360.0)       # compass bearing the water moves toward
    wu, wv = DR.wind_at(np.array([lat]), 0.0)
    wind_from = float((np.degrees(np.arctan2(wu[0], wv[0])) + 180.0) % 360.0)
    sst = float(c.sst[j, i])
    lat_c = PL.LAT[j]
    swing = float(1.0 + 6.0 * np.sin(np.radians(abs(lat_c))) ** 1.5)  # TUNING: seasonal half range of the SST in C
    return dict(cell=[int(j), int(i)], lon=float(lon), lat=float(lat), band=PL.band_name(lat_c), sst_c=sst, sst_swing_c=swing,
                drift_u=float(cu), drift_v=float(cv), drift_speed=sp, drift_to_deg=bearing_to,
                drift_from_deg=float((bearing_to + 180.0) % 360.0),
                leeway3_u=float(0.03 * wu[0]), leeway3_v=float(0.03 * wv[0]), wind_from_deg=wind_from,
                season_amplitude=DR.SEASON_CURRENT, grid_cell_u=u, grid_cell_v=v)


def arrivals_for_table(world, lon=None, lat=None, p_catch=P_CATCH, start_doy=290):
    # returns dict(table, arrivals, strays, per_year, summary). Pure function of the world and the table cell.
    pl = world.planet
    if lon is None:
        lon, lat = default_table(world)
    j, i = nearest_ocean_cell(pl, lon, lat)
    lon, lat = float(PL.LON[i]) if abs(lon - PL.LON[i]) > 2.5 else float(lon), float(PL.LAT[j]) if abs(lat - PL.LAT[j]) > 2.5 else float(lat)
    cell = j * PL.NLON + i
    r = world.res
    tab = table_climate(world, j, i, lon, lat)
    sel = np.nonzero(r.visit_c == cell)[0]
    pid = r.visit_p[sel]
    day = r.visit_d[sel]
    caught = hash01(world.seed, pid, cell, 5) < p_catch
    pid, day = pid[caught], day[caught]
    out, strays = [], []
    counters = {k: 0 for k in DR.KINDS}
    for p_, d_ in zip(pid.tolist(), day.tolist()):
        kname = DR.KINDS[int(r.kind[p_])]
        sc = int(r.src_cell[p_])
        sj, si = sc // PL.NLON, sc % PL.NLON
        sband = PL.BAND_NAMES[int(PL.band_index(PL.LAT[sj]))]
        travel = max(1, int(d_ - r.release_day[p_]))
        dband = abs(int(PL.band_index(PL.LAT[sj])) - int(PL.band_index(PL.LAT[j])))
        dT = float(world.circ.sst[sj, si] - world.circ.sst[j, i])
        counters[kname] += 1
        idx = counters[kname] - 1
        rec = dict(key='%d:globe:%s:%d' % (world.seed, kname, idx), kind=kname,
                   source_region=PL.region_name(sj, si), source_region_id=PL.region_id(sj, si), source_label=PL.region_label(sj, si),
                   source_band=sband, travel_days=travel, arrival_day=int(d_), release_day=int(r.release_day[p_]),
                   band_distance=dband, temp_mismatch_c=round(dT, 2),
                   fragility=round(float(0.5 * dband / 4.0 + 0.5 * min(abs(dT) / 20.0, 1.0)), 3))
        if kname == 'strays':
            opts = STRAY_CLASSES[sband]
            rec['class'] = opts[int(hash01(world.seed, p_, 1, 6) * len(opts)) % len(opts)]
            rec['rides'] = 'warm_current' if dT > 1.0 else 'cool_current' if dT < -1.0 else 'mixed_water'
            rec['stressed'] = bool(dT >= COLD_STUN_C)
            rec['season_day_of_year'] = int((start_doy + d_) % 365)
            strays.append(rec)
        else:
            opts = CLASSES[kname]
            rec['class'] = opts[int(hash01(world.seed, p_, 1, 6) * len(opts)) % len(opts)]
            out.append(rec)
    # rank by arrival day (stable on the particle order already sorted by day) and key per kind by that order
    for lst in (out, strays):
        lst.sort(key=lambda a: (a['arrival_day'], a['source_region_id'], a['class']))
        cnt = {}
        for a in lst:
            n = cnt.get(a['kind'], 0)
            cnt[a['kind']] = n + 1
            a['key'] = '%d:globe:%s:%d' % (world.seed, a['kind'], n)
    years = world.days / 365.0
    per_year = {k: round(sum(1 for a in out if a['kind'] == k) / years, 3) for k in DR.KINDS if k != 'strays'}
    per_year['strays'] = round(len(strays) / years, 3)
    srcs = sorted({a['source_region_id'] for a in out})
    tt = np.array([a['travel_days'] for a in out]) if out else np.zeros(0)
    summary = dict(n_arrivals=len(out), n_strays=len(strays), n_sources=len(srcs), source_ids=srcs,
                   travel_median=float(np.median(tt)) if len(tt) else None,
                   travel_p10=float(np.percentile(tt, 10)) if len(tt) else None, travel_p90=float(np.percentile(tt, 90)) if len(tt) else None,
                   long_share=float((tt > 365).mean()) if len(tt) else None, per_year_total=round(len(out) / years, 3))
    return dict(seed=world.seed, table=tab, arrivals=out, strays=strays, per_year=per_year, summary=summary)


def table_hash(t):
    s = json.dumps([t['table'], t['arrivals'], t['strays']], sort_keys=True)
    return hashlib.sha256(s.encode()).hexdigest()[:16]


def claim_new(ledger, arrivals):
    # idempotent use of the keys: a ledger (a set) accepts each key once, so replaying a table never doubles a find
    fresh = []
    for a in arrivals:
        if a['key'] not in ledger:
            ledger.add(a['key'])
            fresh.append(a)
    return fresh
