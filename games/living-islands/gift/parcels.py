"""gift/parcels.py -- headless prototype of the Gift world chart: parcel registry, local climate, suitability score, price, reach and survey.
numpy only (PIL only for the two pictures). Deterministic: the same planet seed gives the same chart, byte for byte.
Design: research/THE_GIFT_DESIGN.md.   Report: gift/GIFT_PROTOTYPE.md.   Tests: python3 gift/test_parcels.py   Pictures: python3 gift/parcels.py

Pipeline per parcel (everything is a pure function of planet seed + square index):
  registry      1 degree chart squares; a square holds a parcel with a probability that depends on the distance to land (hash, no state)
  climate       globe/climate.py monthly fields sampled at the parcel position (temperature, rain, storms, sea temperature)
  window        STAND-IN: one of the 12 exported landform windows (256 m) picked by hash, with one of 8 flips/rotations. Full generation of a 1.5 km island group is not done here.
  suitability   seven parts from the real window arrays (beach, flat ground, harbour, view, wildlife, fresh water, boat-trip gaps) minus a hazard share
  price         in-game pounds from suitability, size, climate comfort and remoteness
  reach         Dijkstra over the ocean cells from the home parcel, with currents and storm delay -> voyage days; survey cost from that
  washup        globe/arrivals.py drift table for the parcel's ocean cell
Every number marked TUNING is a guess to be balanced, not a measurement.
"""
import hashlib
import heapq
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, 'globe'))
sys.path.insert(0, os.path.join(ROOT, 'landform'))
import planet as PL          # noqa: E402
import circulation as CI     # noqa: E402
import climate as CL         # noqa: E402
import arrivals as AR        # noqa: E402
import hydrology as HY       # noqa: E402

# ---------------------------------------------------------------- tuning numbers (all TUNING = guesses)
SQ_DEG = 1.0                     # chart square size in degrees (about 111 km)
SQ_PER_CELL = int(round(PL.DEG / SQ_DEG))
P_OCC = {1: 0.33, 2: 0.18, 3: 0.05}   # chance that a square holds a parcel by distance (in cells) from land: coast, one cell off, open sea
REGION_DEG = (60.0, 30.0)        # the shipped chart region: 60 degrees of longitude by 30 of latitude (about 250 parcels)
PARCEL_RADIUS_KM = 0.75          # a parcel is an island group over about 1.5 km
EARTH_KM_PER_DEG = 111.195
BOAT_KMH = 9.0                   # small survey boat, about 5 knots
SAIL_HOURS_PER_DAY = 10.0
BOAT_DAY_COST = 420.0            # pounds per boat-day: skipper, fuel, food (guess)
SURVEY_FEE = 250.0               # chart and paperwork fee per survey (guess)
WEIGHTS = dict(beach=0.15, flat=0.20, harbour=0.20, view=0.10, wildlife=0.12, water=0.15, gaps=0.08)
HAZARD_PENALTY = 0.30            # suitability is multiplied by (1 - 0.30 * hazard)
PRICE_A = 450000.0               # price of a median parcel (suitability 0.5, three-island size, neutral climate, near market)
PRICE_K = 3.4                    # log price slope per unit suitability
REMOTE_FLOOR, REMOTE_SCALE_KM = 0.45, 600.0
TILES_PER_ISLAND = 0.6           # how many window-equivalents of ground one island of the group stands for
PRICE_MIN, PRICE_MAX = 25000.0, 6000000.0

PARTS = tuple(WEIGHTS)


def sat(x):
    return 1.0 - np.exp(-np.maximum(x, 0.0))


def h64(*vals):
    # deterministic integer hash of integers -> uint64-like python int
    h = hashlib.sha256(('|'.join(str(int(v)) for v in vals)).encode()).digest()
    return int.from_bytes(h[:8], 'little')


def u01(*vals):
    return (h64(*vals) >> 11) / float(1 << 53)


# ---------------------------------------------------------------- geometry on the invented planet
def gc_km(lon1, lat1, lon2, lat2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dl = np.radians(np.asarray(lon2) - np.asarray(lon1))
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * 6371.0 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def land_distance_cells(land):
    # Chebyshev distance in cells from the nearest land cell (longitude wraps); 0 on land
    d = np.full(land.shape, 99, int)
    d[land] = 0
    for k in range(1, 6):
        reach = np.zeros_like(land)
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                s = np.roll(d == k - 1, di, 1)
                if dj == 1:
                    s = np.vstack([s[1:], np.zeros((1, land.shape[1]), bool)])
                elif dj == -1:
                    s = np.vstack([np.zeros((1, land.shape[1]), bool), s[:-1]])
                reach |= s
        d = np.where((d == 99) & reach, k, d)
    return d


# ---------------------------------------------------------------- the 12 stand-in windows
_WIN_CACHE = {}


def window_list():
    return [w['seed'] for w in json.load(open(os.path.join(HY.WORLDS, 'index.json')))['worlds']]


def _load(seed):
    if seed not in _WIN_CACHE:
        W = HY.load_world(seed)
        m = W['manifest']
        blob = open(os.path.join(HY.WORLDS, 'seed%04d' % seed, 'world.bin'), 'rb').read()
        nx = m['nx']

        def arr(name):
            return np.frombuffer(blob, dtype='u1', count=nx * nx, offset=m['arrays'][name]['offset']).reshape(nx, nx)
        W['shore'] = arr('shore')
        W['exposure'] = arr('exposure').astype(float) / 255.0
        _WIN_CACHE[seed] = W
    return _WIN_CACHE[seed]


def transform(a, k):
    # one of the 8 flips and rotations of a square array
    a = np.rot90(a, k % 4)
    return a[:, ::-1] if k >= 4 else a


def _dilate(m, r):
    out = m.copy()
    for _ in range(int(r)):
        n = out.copy()
        n[1:] |= out[:-1]
        n[:-1] |= out[1:]
        n[:, 1:] |= out[:, :-1]
        n[:, :-1] |= out[:, 1:]
        out = n
    return out


def _enclosure(land, dx, reach_m=60.0, ndir=16):
    # share of 16 compass directions in which land is met within reach_m (per cell); a bay has many blocked directions
    steps = int(math.ceil(reach_m / dx))
    ny, nx = land.shape
    blocked = np.zeros((ndir, ny, nx), bool)
    pad = steps + 1
    L = np.pad(land, pad)
    for d in range(ndir):
        ang = 2 * math.pi * d / ndir
        for s in range(1, steps + 1):
            oy, ox = int(round(-math.cos(ang) * s)), int(round(math.sin(ang) * s))
            blocked[d] |= L[pad + oy:pad + oy + ny, pad + ox:pad + ox + nx]
    return blocked.mean(0)


def _view(h, dx, sea=0.0, ndir=16, reach_m=140.0):
    # from the highest cell: height above the sea and the share of 16 directions with a clear line of sight to open water
    iy, ix = np.unravel_index(np.argmax(h), h.shape)
    eye = h[iy, ix] + 1.7
    ny, nx = h.shape
    open_dirs = 0
    for d in range(ndir):
        ang = 2 * math.pi * d / ndir
        best = -1e9
        seen = False
        for s in range(1, int(reach_m / dx) + 1):
            y, x = int(round(iy - math.cos(ang) * s)), int(round(ix + math.sin(ang) * s))
            if not (0 <= y < ny and 0 <= x < nx):
                break
            ang_v = (h[y, x] - eye) / (s * dx)
            if h[y, x] <= sea and ang_v > best:
                seen = True
                break
            best = max(best, ang_v)
        open_dirs += seen
    return float(h[iy, ix]), open_dirs / ndir


def window_metrics(seed, k):
    """Everything climate-independent about one window under one transform. Cached. Lengths in metres, areas in square metres."""
    key = (seed, k)
    c = _WIN_CACHE.setdefault('m', {})
    if key in c:
        return c[key]
    W = _load(seed)
    dx = W['dx']
    h = transform(W['height'], k)
    shore = transform(W['shore'], k)
    ex = transform(W['exposure'], k)
    veg = transform(W['veg'], k)
    sea = W['sea']
    land = h > sea
    water = ~land
    gy, gx = np.gradient(h, dx)
    slope = np.hypot(gx, gy)
    near_water = _dilate(water, 1) & land
    # beach: sand and shingle cells on the shoreline, weighted by shelter of the water next to them
    beach = ((shore == 1) | (shore == 2)) & near_water
    exw = np.where(water, ex, 0.0)
    ex_nb = np.maximum.reduce([np.roll(exw, s, a) for a in (0, 1) for s in (1, -1)])
    beach_len = float(beach.sum() * dx)
    beach_eff = float((beach * (1.0 - np.clip(ex_nb, 0, 1))).sum() * dx)
    # flat buildable ground: gentle slope, above the storm line (tide range plus a margin), not wet
    flat = land & (slope < 0.15) & (h >= 1.5) & (transform(W['wetness'], k) < 0.6)
    flat_area = float(flat.sum() * dx * dx)
    # sheltered bay for a harbour: near land, deep enough, enclosed by land and low in exposure, with flat ground close by
    enc = _enclosure(land, dx)
    harb = water & _dilate(land, int(math.ceil(30 / dx))) & (h <= -1.5) & (enc >= 0.55) & (ex < 0.40) & _dilate(flat, int(math.ceil(40 / dx)))
    harb_area = float(harb.sum() * dx * dx)
    harb_shelter = float(1.0 - ex[harb].mean()) if harb.any() else 0.0
    hmax, view_open = _view(h, dx, sea)
    # components of land: islands and skerries
    lab, n = HY.label_components(land)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)[1:] * dx * dx if n else np.zeros(0)
    skerries = int(((sizes >= 8) & (sizes < 600)).sum())
    big = int((sizes >= 600).sum())
    cliff_len = float(((shore == 5) & near_water).sum() * dx)
    land_v = veg[land]
    shares = np.bincount(land_v.astype(int), minlength=24) / max(land_v.size, 1)
    rich = int((shares[1:] >= 0.02).sum())
    wet_share = float(shares[[4, 11]].sum()) if shares.size > 11 else 0.0
    # gaps: nearest-neighbour distance between island edges for the 8 largest components (>= 8 m2)
    order = np.argsort(-sizes)[:8]
    edges = []
    for o in order:
        if sizes[o] < 8:
            continue
        m = (lab == o + 1) & near_water
        ys, xs = np.nonzero(m)
        pts = np.stack([ys, xs], 1)[::max(1, len(ys) // 100)] * dx
        edges.append(pts)
    nn = []
    for i, p in enumerate(edges):
        best = 1e9
        for j, q in enumerate(edges):
            if i != j:
                best = min(best, float(np.sqrt(((p[:, None, :] - q[None, :, :]) ** 2).sum(-1)).min()))
        nn.append(best)
    trip_ok = [20.0 <= g <= 250.0 for g in nn]
    gaps = (float(np.mean(trip_ok)) * float(sat(len(edges) / 3.0))) if len(edges) >= 2 else 0.0
    # hazards
    shore_cells = int(near_water.sum())
    cliff_share = float(((shore == 5) & near_water).sum() / max(shore_cells, 1))
    ex_shore = float(ex[water & _dilate(land, 2)].mean()) if (water & _dilate(land, 2)).any() else 0.5
    shoal = water & (h > -1.5) & ~_dilate(land, int(math.ceil(20 / dx)))
    shoal_area = float(shoal.sum() * dx * dx)
    # hydrology on the window (rain 1500 mm a year as the reference; discharge scales with rain)
    A = HY.analyse(h, dx, sea, rain_mm_yr=1500.0)
    amax = float(A['area'][land].max()) if land.any() else 0.0
    # main island width for the freshwater lens: area over longest extent of the biggest component
    if n:
        ys, xs = np.nonzero(lab == int(np.argmax(sizes)) + 1)
        longest = max(ys.max() - ys.min(), xs.max() - xs.min(), 1) * dx
        width = float(sizes.max() / longest)
    else:
        width = 0.0
    out = dict(seed=seed, k=k, dx=dx, land_m2=float(land.sum() * dx * dx), n_islands=int(W['manifest']['n_islands']), big=big, skerries=skerries, beach_len=beach_len,
               beach_eff=beach_eff, flat_area=flat_area, harb_area=harb_area, harb_shelter=harb_shelter, hmax=hmax, view_open=view_open, cliff_len=cliff_len, rich=rich,
               wet_share=wet_share, gaps=gaps, nn_gaps=[round(g, 1) for g in nn], cliff_share=cliff_share, ex_shore=ex_shore, shoal_area=shoal_area, amax=amax,
               n_lakes=len(A['lakes']), width=width, rock=W['manifest']['rock'])
    c[key] = out
    return out


# ---------------------------------------------------------------- the chart: planet, climate, drift, registry
class Chart:
    """One invented planet seen as a sea chart. Building it takes about 5 seconds (climate, circulation, drift); everything after is cheap."""

    def __init__(self, seed=1, region=None, drift_days=1500):
        self.seed = int(seed)
        self.planet = PL.Planet(self.seed)
        self.circ = CI.Circulation(self.planet)
        self.clim = CL.Climate(self.planet, self.circ.sst)
        self.world = AR.World(self.seed, days=drift_days)
        self.land_d = land_distance_cells(self.planet.land)
        self.region = region or self.pick_region()
        self._sea_graph = None
        self._reg = None
        self._cell_cache = {}

    # ---- region and registry
    def pick_region(self):
        # the 60 x 30 degree window in the temperate and subpolar belts (lat 30 to 70) with the most coast and near-coast ocean: a deterministic, content-rich default
        nc, nr = int(REGION_DEG[0] / PL.DEG), int(REGION_DEG[1] / PL.DEG)
        w = np.where(self.planet.ocean & (self.land_d <= 2), 1.0, 0.0) + np.where(self.planet.ocean & (self.land_d == 1), 1.0, 0.0)
        best, arg = -1, None
        for j0 in range(int((30 + 90) / PL.DEG), int((70 + 90) / PL.DEG) - nr + 1):
            for i0 in range(PL.NLON):
                cols = [(i0 + c) % PL.NLON for c in range(nc)]
                s = w[j0:j0 + nr][:, cols].sum() - 3.0 * self.planet.land[j0:j0 + nr][:, cols].sum() * 0.0
                if s > best:
                    best, arg = s, (i0, j0)
        i0, j0 = arg
        return dict(lon0=-180.0 + i0 * PL.DEG, lat0=-90.0 + j0 * PL.DEG, lon1=-180.0 + (i0 + nc) * PL.DEG, lat1=-90.0 + (j0 + nr) * PL.DEG)

    def squares(self):
        r = self.region
        ci0 = int(round(r['lon0'] + 180.0))
        cj0 = int(round(r['lat0'] + 90.0))
        n_lon, n_lat = int(round(r['lon1'] - r['lon0'])), int(round(r['lat1'] - r['lat0']))
        for dj in range(n_lat):
            for di in range(n_lon):
                yield (ci0 + di) % int(360 / SQ_DEG), cj0 + dj

    def parcel_position(self, ci, cj):
        lon = -180.0 + (ci + 0.15 + 0.7 * u01(self.seed, ci, cj, 11)) * SQ_DEG
        lat = -90.0 + (cj + 0.15 + 0.7 * u01(self.seed, ci, cj, 12)) * SQ_DEG
        return lon, lat

    def occupied(self, ci, cj):
        lon, lat = self.parcel_position(ci, cj)
        j, i = PL.cell_of(lon, lat)
        j, i = int(j), int(i)
        if not self.planet.ocean[j, i] or self.planet.ice[j, i]:
            return False
        d = int(self.land_d[j, i])
        p = P_OCC.get(d, P_OCC[3])
        return u01(self.seed, ci, cj, 10) < p

    def registry(self):
        if self._reg is None:
            self._reg = [(ci, cj) for ci, cj in self.squares() if self.occupied(ci, cj)]
        return self._reg

    # ---- local climate (from climate.py)
    def local_climate(self, lon, lat, hmax=10.0):
        c = self.clim
        T = np.array([float(CI.bilinear(c.T[m], lon, lat)) for m in range(12)])
        P = np.array([float(CI.bilinear(c.precip[m], lon, lat)) for m in range(12)]) * CL.MONTH_DAYS
        S = np.array([float(CI.bilinear(c.sst_m[m], lon, lat)) for m in range(12)])
        storm = np.array([float(CI.bilinear(c.storm_w[m], lon, lat)) for m in range(12)])
        rain = float(P.sum()) * (1.0 + 0.02 * hmax)           # TUNING: a little extra rain from the island's own hills
        warm, cold = float(T.max()), float(T.min())
        comfort = 0.5 * np.clip((warm - 8.0) / 14.0, 0, 1) + 0.25 * np.clip((cold + 5.0) / 12.0, 0, 1) + 0.25 * (1.0 - 0.6 * np.clip((rain - 600.0) / 2400.0, 0, 1))
        return dict(lon=round(float(lon), 3), lat=round(float(lat), 3), band=PL.band_name(lat), t_mean=float(T.mean()), t_warm=warm, t_cold=cold, sst_summer=float(S.max()),
                    sst_winter=float(S.min()), rain_mm=rain, storm_index=float(storm.mean()), storm_peak=float(storm.max()), comfort=float(comfort))

    # ---- what washes up (from drift)
    def washup(self, lon, lat):
        j, i = AR.nearest_ocean_cell(self.planet, lon, lat)
        key = (int(j), int(i))
        if key not in self._cell_cache:
            t = AR.arrivals_for_table(self.world, lon, lat)
            self._cell_cache[key] = dict(per_year=t['per_year'], n_sources=t['summary']['n_sources'], strays_per_year=t['per_year'].get('strays', 0.0), source_ids=t['summary']['source_ids'],
                                         finds_per_year=float(sum(v for k, v in t['per_year'].items() if k != 'strays')), median_travel_days=t['summary']['travel_median'])
        return self._cell_cache[key]

    # ---- sea graph: Dijkstra from a start cell
    def sea_days_from(self, lon, lat):
        """Days of sailing from a position to every ocean cell centre, as an array [NLAT, NLON] (inf = no sea route, sea ice and land block). Currents help or hinder, storms delay."""
        p = self.planet
        ok = p.ocean & ~p.ice
        c = self.circ
        storm = self.clim.storm_w.mean(0)
        sn = np.clip(storm / max(float(storm[ok].max()), 1e-9), 0, 1)
        delay = 1.0 + 0.6 * sn                                 # TUNING: storm belts slow a small boat by up to 60 percent
        j0, i0 = AR.nearest_ocean_cell(p, lon, lat)
        dist = np.full(ok.shape, np.inf)
        dist[j0, i0] = 0.0
        pq = [(0.0, int(j0), int(i0))]
        while pq:
            d, j, i = heapq.heappop(pq)
            if d > dist[j, i]:
                continue
            for dj in (-1, 0, 1):
                for di in (-1, 0, 1):
                    if dj == 0 and di == 0:
                        continue
                    jj, ii = j + dj, (i + di) % PL.NLON
                    if not (0 <= jj < PL.NLAT) or not ok[jj, ii]:
                        continue
                    if dj and di and not (ok[jj, i] and ok[j, ii]):
                        continue                                # no squeezing diagonally between two land corners
                    km = float(gc_km(PL.LON[i], PL.LAT[j], PL.LON[ii], PL.LAT[jj]))
                    brg = math.atan2((PL.LON[ii] - PL.LON[i]) * math.cos(math.radians(PL.LAT[j])) * (1 if abs(PL.LON[ii] - PL.LON[i]) < 180 else -1), PL.LAT[jj] - PL.LAT[j])
                    cur = (0.5 * (c.u[j, i] + c.u[jj, ii])) * math.sin(brg) + (0.5 * (c.v[j, i] + c.v[jj, ii])) * math.cos(brg)   # m/s along the track
                    spd = max(3.0, BOAT_KMH + 3.6 * float(cur))
                    days = km / spd / SAIL_HOURS_PER_DAY * 0.5 * (delay[j, i] + delay[jj, ii])
                    nd = d + days
                    if nd < dist[jj, ii]:
                        dist[jj, ii] = nd
                        heapq.heappush(pq, (nd, jj, ii))
        return dist

    # ---- one parcel
    def parcel(self, ci, cj, home=None, sea_days=None):
        lon, lat = self.parcel_position(ci, cj)
        pid = 'P%03d.%03d' % (ci, cj)
        widx = int(u01(self.seed, ci, cj, 20) * 12) % 12
        k = int(u01(self.seed, ci, cj, 21) * 8) % 8
        wseed = window_list()[widx]
        m = window_metrics(wseed, k)
        n_isl = int(np.clip(round(m['n_islands'] / 4.0), 3, 8))
        tiles = n_isl * TILES_PER_ISLAND
        cl = self.local_climate(lon, lat, m['hmax'])
        parts = self.score_parts(m, cl, tiles)
        hazard = self.hazard(m, cl)
        suit = float(sum(WEIGHTS[p] * parts[p] for p in PARTS) * (1.0 - HAZARD_PENALTY * hazard))
        j, i = PL.cell_of(lon, lat)
        land_km = float(np.min(gc_km(lon, lat, PL.LON2[self.planet.land & ~self.planet.ice], PL.LAT2[self.planet.land & ~self.planet.ice]))) if (self.planet.land & ~self.planet.ice).any() else 9999.0
        remote_km = max(0.0, land_km - 0.5 * CL.CELL_KM)
        price = price_formula(suit, tiles, cl['comfort'], remote_km)
        out = dict(id=pid, ci=ci, cj=cj, lon=lon, lat=lat, window_seed=wseed, flip=k, n_islands=n_isl, tiles=tiles, climate=cl, parts=parts, hazard=hazard, suitability=suit,
                   remote_km=remote_km, price=price, rock=m['rock'], washup=self.washup(lon, lat),
                   buildable_ha=m['flat_area'] * tiles / 1e4, beach_m=m['beach_len'] * tiles, harbour_m2=m['harb_area'] * tiles, metrics=dict(m))
        if home is not None and sea_days is not None:
            out.update(self.reach(out, home, sea_days))
        return out

    def score_parts(self, m, cl, tiles):
        beach = float(sat(m['beach_eff'] * tiles / 250.0))
        flat = float(sat(m['flat_area'] * tiles / 1500.0))
        harbour = float(sat(m['harb_area'] * tiles / 6000.0) * (0.5 + 0.5 * m['harb_shelter']))
        view = float(sat((m['hmax'] - 2.0) / 8.0) * (0.4 + 0.6 * m['view_open']))
        wild = float(0.30 * sat(m['skerries'] / 5.0) + 0.25 * sat(m['cliff_len'] * tiles / 300.0) + 0.25 * min(1.0, m['rich'] / 6.0) + 0.10 * min(1.0, m['wet_share'] * 4.0 + (m['n_lakes'] > 0) * 0.5) + 0.10 * float(sat(m['beach_len'] / 150.0)))
        # fresh water: a stream from a catchment (discharge scales with rain) or a freshwater lens under the main island (climate.freshwater_lens), whichever is better
        burn = float(sat(m['amax'] * (cl['rain_mm'] / 1500.0) / 15000.0))
        _, _, usable = CL.freshwater_lens(0.45 * cl['rain_mm'], m['width'])
        lens = float(np.clip(usable / 4.0, 0.0, 1.0))
        water = float(min(1.0, max(burn, lens) + (0.15 if m['n_lakes'] else 0.0)))
        return dict(beach=beach, flat=flat, harbour=harbour, view=view, wildlife=min(1.0, wild), water=water, gaps=float(m['gaps']))

    def hazard(self, m, cl):
        storm = float(np.clip(cl['storm_index'] / 1.2, 0, 1))
        return float(np.clip(0.35 * m['cliff_share'] + 0.25 * m['ex_shore'] + 0.20 * sat(m['shoal_area'] / 2500.0) + 0.20 * storm, 0, 1))

    def reach(self, p, home, sea_days):
        j, i = AR.nearest_ocean_cell(self.planet, p['lon'], p['lat'])
        jh, ih = AR.nearest_ocean_cell(self.planet, home['lon'], home['lat'])
        direct = float(gc_km(home['lon'], home['lat'], p['lon'], p['lat']))
        d = float(sea_days[j, i])
        if not math.isfinite(d):
            return dict(reachable=False, voyage_days=float('inf'), survey_cost=float('inf'), survey_days=float('inf'), reach_cost=float('inf'))
        if (j, i) == (jh, ih):
            d = direct / BOAT_KMH / SAIL_HOURS_PER_DAY             # same ocean cell: a straight run
        else:
            # cell-centre to cell-centre path plus the two short legs inside the end cells; never faster than the straight line
            legs = float(gc_km(p['lon'], p['lat'], PL.LON[i], PL.LAT[j]) + gc_km(home['lon'], home['lat'], PL.LON[ih], PL.LAT[jh]))
            d = max(d + legs / BOAT_KMH / SAIL_HOURS_PER_DAY, direct / BOAT_KMH / SAIL_HOURS_PER_DAY)
        d = max(d, 0.1)
        return dict(reachable=True, voyage_days=d, survey_days=2.0 * d + 1.0, survey_cost=SURVEY_FEE + BOAT_DAY_COST * (2.0 * d + 1.0), reach_cost=BOAT_DAY_COST * d)

    def build(self, limit=None, home_id=None):
        reg = self.registry()
        if limit:
            reg = reg[:limit]
        parcels = [self.parcel(ci, cj) for ci, cj in reg]
        home = self.pick_home(parcels) if home_id is None else next(p for p in parcels if p['id'] == home_id)
        sd = self.sea_days_from(home['lon'], home['lat'])
        for p in parcels:
            p.update(self.reach(p, home, sd))
            p['dist_home_km'] = float(gc_km(home['lon'], home['lat'], p['lon'], p['lat']))
        return parcels, home

    def pick_home(self, parcels):
        # the gifted parcel: near a market, every part decent, little hazard; deterministic
        best, bp = -1, None
        for p in parcels:
            if p['remote_km'] > 900:
                continue
            s = min(p['parts'][k] for k in ('beach', 'flat', 'harbour', 'water')) + 0.5 * p['suitability'] - 0.5 * p['hazard']
            if s > best:
                best, bp = s, p
        return bp or parcels[0]


# ---------------------------------------------------------------- price, offers, survey
def remote_factor(remote_km):
    return REMOTE_FLOOR + (1.0 - REMOTE_FLOOR) * math.exp(-remote_km / REMOTE_SCALE_KM)


def price_formula(suit, tiles, comfort, remote_km):
    """In-game pounds.  P = A * exp(K (S - 0.5)) * (tiles / 1.8)^0.6 * (0.85 + 0.5 comfort) * remote_factor(km), clipped.  S in 0..1."""
    p = PRICE_A * math.exp(PRICE_K * (suit - 0.5)) * (max(tiles, 0.5) / 1.8) ** 0.6 * (0.85 + 0.5 * comfort) * remote_factor(remote_km)
    return float(min(max(p, PRICE_MIN), PRICE_MAX))


def price_estimate(p, level):
    """Fog of war: what the player sees. level 0 unknown, 1 rumour (wide band), 2 surveyed (narrower), 3 visited (exact). Returns (low, high) or None."""
    if level <= 0:
        return None
    band = {1: 0.45, 2: 0.15, 3: 0.0}[min(level, 3)]
    return p['price'] * (1 - band), p['price'] * (1 + band)


def offers(p, owned_now=0):
    """The ways to acquire a parcel. Pure function of the parcel (auction final price is a hash of the id, so it replays)."""
    price = p['price']
    res = [dict(form='fixed', upfront=price, annual=0.0, note='buy outright')]
    res.append(dict(form='lease', upfront=0.10 * price, annual=0.06 * price, note='10 percent down, 6 percent a year, no building without consent'))
    final = price * (0.75 + 0.6 * u01(h64(p['ci'], p['cj']), 31))
    res.append(dict(form='auction', upfront=final, annual=0.0, note='reserve %d, three rival bids (counted, not named), final price may fall either side' % int(0.7 * price), reserve=0.7 * price))
    if p['parts']['wildlife'] >= 0.55:
        res.append(dict(form='conservation_grant', upfront=0.4 * price, annual=0.0, note='grant pays 60 percent, covenant: no building on the habitat shore for 25 years', covenant_years=25))
    if u01(h64(p['ci'], p['cj']), 32) < 0.06:
        res.append(dict(form='inherited_ruin', upfront=0.0, annual=0.0, note='free, but the old buildings need repair first', repair_cost=0.12 * price))
    return res


def survey_reveal(parcels, target, radius_km=160.0):
    """A survey voyage to `target` reveals every parcel within radius_km of it (fog level 2) and the target itself (level 3). Returns {id: level}."""
    out = {}
    for p in parcels:
        d = float(gc_km(target['lon'], target['lat'], p['lon'], p['lat']))
        if p['id'] == target['id']:
            out[p['id']] = 3
        elif d <= radius_km:
            out[p['id']] = 2
    return out


# ---------------------------------------------------------------- pictures (PIL)
def ramp(t):
    # sequential, light to dark, colour-blind safe (yellow, orange, magenta, indigo)
    stops = [(0.0, (253, 231, 140)), (0.35, (240, 150, 70)), (0.65, (190, 60, 110)), (1.0, (60, 30, 120))]
    t = float(min(max(t, 0.0), 1.0))
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if t <= b:
            f = (t - a) / (b - a)
            return tuple(int(ca[k] + f * (cb[k] - ca[k])) for k in range(3))
    return stops[-1][1]


def kilo(x):
    # the default picture font has no pound sign, so pictures say '238k' and the caption says in-game pounds
    return '%dk' % int(round(x / 1000.0))


def draw_chart(chart, parcels, home, path, scale=14):
    from PIL import Image, ImageDraw, ImageFont
    r = chart.region
    nlon, nlat = int(r['lon1'] - r['lon0']), int(r['lat1'] - r['lat0'])
    W, H = nlon * scale, nlat * scale
    top, left, bot = 54, 10, 54
    im = Image.new('RGB', (W + left * 2, H + top + bot), (246, 242, 230))
    d = ImageDraw.Draw(im)
    try:
        f, fs = ImageFont.load_default(size=14), ImageFont.load_default(size=11)
    except TypeError:
        f = fs = ImageFont.load_default()
    for jj in range(nlat):
        for ii in range(nlon):
            lon, lat = r['lon0'] + ii + 0.5, r['lat0'] + jj + 0.5
            j, i = PL.cell_of(lon, lat)
            col = (176, 160, 120) if chart.planet.land[j, i] else (196, 220, 232)
            if chart.planet.ice[j, i]:
                col = (236, 240, 244)
            x0, y0 = left + ii * scale, top + (nlat - 1 - jj) * scale
            d.rectangle([x0, y0, x0 + scale - 1, y0 + scale - 1], fill=col)
    for g in range(0, nlon + 1, 5):
        d.line([left + g * scale, top, left + g * scale, top + H], fill=(150, 170, 185), width=1)
    for g in range(0, nlat + 1, 5):
        d.line([left, top + g * scale, left + W, top + g * scale], fill=(150, 170, 185), width=1)
    lp = np.log([p['price'] for p in parcels])
    lo, hi = float(lp.min()), float(lp.max())
    for p in parcels:
        x = left + (p['lon'] - r['lon0']) * scale
        y = top + (r['lat1'] - p['lat']) * scale
        rad = 2.2 + 1.2 * (p['n_islands'] - 3) / 5.0
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=ramp((math.log(p['price']) - lo) / (hi - lo)), outline=(40, 40, 50))
    x = left + (home['lon'] - r['lon0']) * scale
    y = top + (r['lat1'] - home['lat']) * scale
    d.ellipse([x - 8, y - 8, x + 8, y + 8], outline=(20, 20, 20), width=2)
    d.text((x + 10, y - 16), 'gift', fill=(20, 20, 20), font=f)
    d.text((left, 10), 'Sea chart: %d parcels, colour = price (invented planet, seed %d)' % (len(parcels), chart.seed), fill=(30, 30, 40), font=f)
    d.text((left, 30), 'grid lines every 5 degrees; dot size = islands in the group; tan = land; ring = the gifted parcel', fill=(70, 70, 80), font=fs)
    # legend bar
    bx, by, bw = left, top + H + 14, 260
    for k in range(bw):
        d.line([bx + k, by, bx + k, by + 12], fill=ramp(k / (bw - 1)))
    d.text((bx, by + 16), kilo(math.exp(lo)), fill=(30, 30, 40), font=fs)
    d.text((bx + bw - 60, by + 16), kilo(math.exp(hi)), fill=(30, 30, 40), font=fs)
    d.text((bx + bw + 14, by), 'price in thousands of in-game pounds (log scale)', fill=(30, 30, 40), font=fs)
    im.save(path)


def money(x):
    return '£%s' % format(int(round(x, -3)), ',')


def draw_parts(parcels, picks, path):
    from PIL import Image, ImageDraw, ImageFont
    try:
        f, fs = ImageFont.load_default(size=14), ImageFont.load_default(size=11)
    except TypeError:
        f = fs = ImageFont.load_default()
    cols = [(86, 140, 200), (232, 160, 60), (150, 70, 130)]
    names = list(PARTS) + ['hazard', 'suitability']
    W, H = 880, 420
    im = Image.new('RGB', (W, H), (250, 248, 242))
    d = ImageDraw.Draw(im)
    d.text((16, 12), 'Suitability parts for three parcels (0 to 1)', fill=(30, 30, 40), font=f)
    x0, y0, y1 = 50, 60, 330
    for t in (0, 0.25, 0.5, 0.75, 1.0):
        y = y1 - t * (y1 - y0)
        d.line([x0, y, W - 20, y], fill=(220, 218, 210))
        d.text((16, y - 6), '%.2f' % t, fill=(90, 90, 100), font=fs)
    gw = (W - 20 - x0) / len(names)
    bw = gw / 4.0
    for gi, nme in enumerate(names):
        for pi, p in enumerate(picks):
            v = p['hazard'] if nme == 'hazard' else p['suitability'] if nme == 'suitability' else p['parts'][nme]
            xx = x0 + gi * gw + 6 + pi * bw
            d.rectangle([xx, y1 - v * (y1 - y0), xx + bw - 2, y1], fill=cols[pi])
        d.text((x0 + gi * gw + 6, y1 + 6), nme, fill=(40, 40, 50), font=fs)
    for pi, p in enumerate(picks):
        d.rectangle([x0 + pi * 270, 366, x0 + pi * 270 + 12, 378], fill=cols[pi])
        d.text((x0 + pi * 270 + 18, 364), '%s  S=%.2f  price %s (in-game pounds)' % (p['id'], p['suitability'], kilo(p['price'])), fill=(30, 30, 40), font=fs)
    d.text((x0, 392), 'window stand-ins: ' + ', '.join('%s=seed %d' % (p['id'], p['window_seed']) for p in picks), fill=(90, 90, 100), font=fs)
    im.save(path)


def main():
    import time
    t = time.time()
    chart = Chart(1)
    parcels, home = chart.build()
    os.makedirs(os.path.join(HERE, 'maps'), exist_ok=True)
    draw_chart(chart, parcels, home, os.path.join(HERE, 'maps', 'sea_chart_price.png'))
    ordered = sorted(parcels, key=lambda p: p['price'])
    picks = [ordered[len(ordered) // 10], ordered[len(ordered) // 2], ordered[-3]]
    draw_parts(parcels, picks, os.path.join(HERE, 'maps', 'score_parts.png'))
    prices = np.array([p['price'] for p in parcels])
    print('parcels', len(parcels), 'region', chart.region, 'home', home['id'], money(home['price']), 'S=%.2f' % home['suitability'])
    print('price pct 10/50/90', [money(np.percentile(prices, q)) for q in (10, 50, 90)], 'min/max', money(prices.min()), money(prices.max()))
    print('reachable', sum(p['reachable'] for p in parcels), 'picks', [(p['id'], round(p['suitability'], 2), money(p['price'])) for p in picks])
    print('seconds %.1f' % (time.time() - t))
    return chart, parcels, home


if __name__ == '__main__':
    main()
