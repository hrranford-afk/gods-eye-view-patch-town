# drift.py: Lagrangian particles on the globe. One day Euler step, bilinear current, per-kind wind leeway, a random walk,
# beaching on land with a probability by shore type, and a first-visit record for every cell a particle enters.
# Kinds: seeds, logs, litter, wreck_debris, ships, strays (floating animals). Sources are coastal ocean cells; a source region
# is a 30 x 25 degree block (see planet.py). Pure python plus numpy, deterministic per (seed, parameters).
import numpy as np
import planet as PL
import circulation as CI

KINDS = ('seeds', 'logs', 'litter', 'wreck_debris', 'ships', 'strays')
KIND_ID = {k: n for n, k in enumerate(KINDS)}
# TUNING (research note 2.1 table): leeway as a share of the 10 m wind, and the divergence angle of the drift from downwind
LEEWAY = {'seeds': 0.008, 'logs': 0.02, 'litter': 0.03, 'wreck_debris': 0.025, 'ships': 0.05, 'strays': 0.07}
DIVERGE_DEG = {'seeds': 0.0, 'logs': 10.0, 'litter': 10.0, 'wreck_debris': 15.0, 'ships': 25.0, 'strays': 30.0}
# TUNING: particles released per kind per seed
N_PER_KIND = {'seeds': 3500, 'logs': 3500, 'litter': 3500, 'wreck_debris': 3500, 'ships': 2000, 'strays': 2500}
K_DIFF = 1000.0              # TUNING: m^2/s per one day step (note section 6); step sigma = sqrt(2 K dt) = 13 km
WIND_TRADE = 7.0             # TUNING: peak zonal 10 m wind in m/s, u10 = -7 cos(3 lat)
WIND_MERID = 1.5             # TUNING: weak meridional wind component, v10 = -1.5 sin(2 lat)
WIND_SIGMA = 0.45            # TUNING: lognormal day-to-day multiplier (storms), shared inside one 30 degree block per hemisphere
WIND_DIR_JITTER = 25.0       # TUNING: degrees of day-to-day direction scatter, same sharing
SEASON_CURRENT = 0.15        # TUNING: whole field scaled by 1 + 0.15 sin(season)
SEASON_BELT_SHIFT = 3.0      # TUNING: wind belts shift 3 degrees of latitude with the season
RELEASE_SHARE = 0.3          # release days are spread over the first 30 percent of the run so late releases still have a long window
M_PER_DEG = 111195.0
DAY_S = 86400.0


def source_weights(planet, kind):
    # [NLAT, NLON] weights of coastal ocean cells as sources of one kind (zero elsewhere); latitude bands per kind from note 7.4
    lat = np.abs(PL.LAT2)
    coast = planet.coast & (lat < 66.0)
    cos = PL.COSLAT
    size = planet.coast_land_size().astype(float)
    big = np.sqrt(size)
    if kind == 'seeds':
        w = coast * (lat < 25.0) * cos ** 2                      # tropical wet coasts
    elif kind == 'logs':
        w = coast * (lat < 60.0) * (size >= 8) * big * cos       # big land masses, wet bands, not frozen
    elif kind == 'litter':
        w = coast * (lat < 55.0) * big * cos ** 2 * (0.3 + planet_settle(planet))
    elif kind == 'wreck_debris':
        storm = np.exp(-((lat - 40.0) / 12.0) ** 2) + 0.8 * np.exp(-((lat - 16.0) / 8.0) ** 2)
        w = coast * (lat < 60.0) * (0.15 + storm)
    elif kind == 'ships':
        w = coast * (lat < 55.0) * (planet_port(planet) > 0.82) * cos
    elif kind == 'strays':
        w = coast * (planet.sst0 >= 22.0) * cos                  # warm shelf waters
    else:
        raise ValueError(kind)
    return np.asarray(w, dtype=float)


def _nb_max(planet, field):
    # for each ocean cell the maximum of a land-cell field over its eight neighbours
    out = np.zeros(planet.land.shape)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            if dj == 0 and di == 0:
                continue
            s = np.roll(field, di, 1)
            if dj == 1:
                s = np.vstack([s[1:], np.zeros((1, PL.NLON))])
            elif dj == -1:
                s = np.vstack([np.zeros((1, PL.NLON)), s[:-1]])
            out = np.maximum(out, s)
    return out


def planet_port(planet):
    return _nb_max(planet, np.where(planet.land & ~planet.ice, planet.port_score, 0.0))


def planet_settle(planet):
    return _nb_max(planet, np.where(planet.land & ~planet.ice, planet.settle_score, 0.0))


def wind_at(lat_deg, season_phase):
    # prescribed 10 m wind by latitude (m/s east, north), belts shifted a few degrees with the season, mirrored by hemisphere
    shift = SEASON_BELT_SHIFT * np.sin(season_phase) * np.sign(lat_deg)
    p = np.radians(lat_deg - shift)
    u = -WIND_TRADE * np.cos(3.0 * p)
    v = -WIND_MERID * np.sin(2.0 * p)
    return u, v


class DriftResult:
    pass


def run(planet, circ, seed, days=1500, n_per_kind=None, leeway_scale=1.0, k_diff=K_DIFF, p_beach_scale=1.0, kinds=KINDS):
    rng = np.random.default_rng([int(seed), 7000])
    npk = dict(N_PER_KIND)
    if n_per_kind:
        npk.update(n_per_kind)
    # ---- particles: kind, source cell, position inside the cell, release day, leeway, divergence side
    kind_l, cell_l = [], []
    for k in kinds:
        w = source_weights(planet, k).ravel()
        if w.sum() <= 0:
            continue
        pick = rng.choice(w.size, size=npk[k], p=w / w.sum())
        kind_l.append(np.full(npk[k], KIND_ID[k], dtype=np.int8))
        cell_l.append(pick)
    if not kind_l:
        return empty_result(planet, days)
    kind = np.concatenate(kind_l)
    cell = np.concatenate(cell_l)
    n = len(kind)
    cj, ci = cell // PL.NLON, cell % PL.NLON
    lon0 = -180.0 + PL.DEG * (ci + rng.uniform(0.1, 0.9, n))
    lat0 = -90.0 + PL.DEG * (cj + rng.uniform(0.1, 0.9, n))
    rel = np.floor(rng.uniform(0, RELEASE_SHARE * days, n)).astype(np.int32)
    lw = np.array([LEEWAY[k] for k in KINDS])[kind] * leeway_scale
    div = np.radians(np.array([DIVERGE_DEG[k] for k in KINDS])[kind]) * rng.choice([-1.0, 1.0], n) * rng.uniform(0.3, 1.0, n)
    order = np.argsort(rel, kind='stable')
    # per-day wind multiplier and direction jitter, shared inside one lon block and hemisphere
    mult = np.exp(WIND_SIGMA * rng.standard_normal((days, PL.N_LON_BLOCKS, 2)) - 0.5 * WIND_SIGMA ** 2)
    jit = np.radians(WIND_DIR_JITTER) * rng.standard_normal((days, PL.N_LON_BLOCKS, 2))
    sd = np.sqrt(2.0 * k_diff * DAY_S)
    UV = np.stack([circ.u, circ.v], axis=-1)
    shore_p = np.clip(planet.p_beach * p_beach_scale, 0.0, 1.0)
    land = planet.land
    # ---- state of every particle (index = particle id)
    lon = lon0.copy()
    lat = lat0.copy()
    status = np.zeros(n, dtype=np.int8)                  # 0 adrift, 1 beached
    end_day = np.full(n, days, dtype=np.int32)
    land_cell = -np.ones(n, dtype=np.int64)
    cur_cell = (np.floor((lat + 90.0) / PL.DEG).astype(np.int64) * PL.NLON + (np.floor((lon + 180.0) / PL.DEG).astype(np.int64) % PL.NLON))
    vis_p, vis_c, vis_d = [], [], []
    rel_sorted = rel[order]
    ptr = 0
    act = np.zeros(0, dtype=np.int64)
    for d in range(days):
        hi = np.searchsorted(rel_sorted, d, side='right')
        if hi > ptr:
            fresh = order[ptr:hi]
            act = np.concatenate([act, fresh])
            vis_p.append(fresh)
            vis_c.append(cur_cell[fresh])
            vis_d.append(np.full(len(fresh), d, dtype=np.int32))
            ptr = hi
        if len(act) == 0:
            continue
        lo_, la_ = lon[act], lat[act]
        ph = 2.0 * np.pi * (d % 365) / 365.0
        sc = 1.0 + SEASON_CURRENT * np.sin(ph)
        cur = CI.bilinear(UV, lo_, la_) * sc
        blk = (np.floor((lo_ + 180.0) / PL.DEG).astype(np.int64) % PL.NLON) // PL.BLOCK_LON_CELLS
        hem = (la_ < 0).astype(np.int64)
        wu, wv = wind_at(la_, ph)
        m = mult[d, blk, hem]
        a = jit[d, blk, hem] + div[act]
        ca, sa = np.cos(a), np.sin(a)
        ru = (wu * ca - wv * sa) * m
        rv = (wu * sa + wv * ca) * m
        vel_u = cur[:, 0] + lw[act] * ru
        vel_v = cur[:, 1] + lw[act] * rv
        rw = rng.standard_normal((len(act), 2)) * sd
        dx = vel_u * DAY_S + rw[:, 0]
        dy = vel_v * DAY_S + rw[:, 1]
        cosl = np.maximum(np.cos(np.radians(la_)), 0.2)
        nlat = np.clip(la_ + dy / M_PER_DEG, -89.9, 89.9)
        nlon = lo_ + dx / (M_PER_DEG * cosl)
        nlon = (nlon + 180.0) % 360.0 - 180.0
        nj, ni = PL.cell_of(nlon, nlat)
        hit = land[nj, ni]
        if hit.any():
            hi_idx = np.nonzero(hit)[0]
            u01 = rng.uniform(size=len(hi_idx))
            stay = u01 < shore_p[nj[hi_idx], ni[hi_idx]]
            beach_idx = hi_idx[stay]
            slide_idx = hi_idx[~stay]
            # beached: position stays at the last ocean point, the land cell is recorded
            pid = act[beach_idx]
            status[pid] = 1
            end_day[pid] = d + 1
            land_cell[pid] = nj[beach_idx] * PL.NLON + ni[beach_idx]
            nlon[beach_idx] = lo_[beach_idx]
            nlat[beach_idx] = la_[beach_idx]
            # slide: try the longitude move alone, then the latitude move alone, else stay
            if len(slide_idx):
                xl = nlon[slide_idx].copy()
                j1, i1 = PL.cell_of(xl, la_[slide_idx])
                okx = ~land[j1, i1]
                j2, i2 = PL.cell_of(lo_[slide_idx], nlat[slide_idx])
                oky = ~land[j2, i2]
                nlon[slide_idx] = np.where(okx, xl, lo_[slide_idx])
                nlat[slide_idx] = np.where(okx, la_[slide_idx], np.where(oky, nlat[slide_idx], la_[slide_idx]))
        lon[act] = nlon
        lat[act] = nlat
        nj, ni = PL.cell_of(nlon, nlat)
        nc = nj * PL.NLON + ni
        chg = (nc != cur_cell[act]) & (status[act] == 0)
        if chg.any():
            vis_p.append(act[chg])
            vis_c.append(nc[chg])
            vis_d.append(np.full(int(chg.sum()), d + 1, dtype=np.int32))
        cur_cell[act] = nc
        act = act[status[act] == 0]
    res = DriftResult()
    res.days = days
    res.n = n
    res.kind = kind
    res.src_cell = cell
    res.release_day = rel
    res.status = status
    res.end_day = end_day
    res.land_cell = land_cell
    res.lon = lon
    res.lat = lat
    res.leeway = lw
    if vis_p:
        vp = np.concatenate(vis_p)
        vc = np.concatenate(vis_c)
        vd = np.concatenate(vis_d)
        # first visit of each (particle, cell) pair
        key = vp.astype(np.int64) * (PL.NLAT * PL.NLON) + vc
        o = np.lexsort((vd, key))
        key_s = key[o]
        first = np.ones(len(o), dtype=bool)
        first[1:] = key_s[1:] != key_s[:-1]
        sel = o[first]
        sel = sel[np.argsort(vd[sel], kind='stable')]
        res.visit_p, res.visit_c, res.visit_d = vp[sel], vc[sel], vd[sel]
    else:
        res.visit_p = res.visit_c = np.zeros(0, dtype=np.int64)
        res.visit_d = np.zeros(0, dtype=np.int32)
    return res


def empty_result(planet, days):
    res = DriftResult()
    res.days = days
    res.n = 0
    for nm in ('kind',):
        setattr(res, nm, np.zeros(0, dtype=np.int8))
    for nm in ('src_cell', 'land_cell', 'visit_p', 'visit_c'):
        setattr(res, nm, np.zeros(0, dtype=np.int64))
    for nm in ('release_day', 'end_day', 'visit_d'):
        setattr(res, nm, np.zeros(0, dtype=np.int32))
    res.status = np.zeros(0, dtype=np.int8)
    res.lon = res.lat = res.leeway = np.zeros(0)
    return res
