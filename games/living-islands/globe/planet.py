# planet.py: a seeded 72 x 36 (five degree) planet. Land from 3D plane-wave noise on the unit sphere, polar ice caps,
# shore types, coast cells, source-region blocks and generic invented region names.
# Pure python plus numpy. Deterministic per seed. Nothing here is real geography and nothing is named after a real place.
# Arrays are indexed [lat_row, lon_col]; row 0 is the southernmost row, column 0 starts at 180 degrees west.
import numpy as np

NLON, NLAT = 72, 36
DEG = 5.0
LON = -180.0 + DEG * (np.arange(NLON) + 0.5)
LAT = -90.0 + DEG * (np.arange(NLAT) + 0.5)
LON2, LAT2 = np.meshgrid(LON, LAT)                        # both [NLAT, NLON]
COSLAT = np.cos(np.radians(LAT2))
AREA_W = COSLAT / COSLAT.sum()                            # area weights (cells are not equal area)
ICE_LAT = 75.0                                            # TUNING: cells centred poleward of this are ice cap (the note says 78; the 77.5 row is too thin to solve)
LAND_FRAC_RANGE = (0.27, 0.33)                            # TUNING: total land share including the ice caps; the test band is 25 to 35 percent
BLOCK_LON_CELLS, BLOCK_LAT_CELLS = 6, 5                   # a source region is 30 degrees of longitude by 25 degrees of latitude
N_LON_BLOCKS = NLON // BLOCK_LON_CELLS                    # 12
N_LAT_BLOCKS = 7                                          # rows 0-4, 5-9, ..., 30-35 (the last band has 6 rows)

BAND_NAMES = ('tropical', 'subtropical', 'temperate', 'subpolar', 'polar')
BAND_EDGES = (23.0, 35.0, 55.0, 65.0)                     # |lat| edges, from the research note section 4.1 (TUNING boundaries)

SHORE_NONE, SHORE_ROCK, SHORE_MIXED, SHORE_SAND, SHORE_ICE = 0, 1, 2, 3, 4
SHORE_NAMES = ('none', 'steep_rock', 'mixed', 'sand_shingle', 'ice')
SHORE_P_BEACH = np.array([0.0, 0.3, 0.6, 0.9, 0.8])       # TUNING: probability that a particle touching this shore stays (note 2.2: 0.3 rock to 0.9 sand)

_SYL_A = ('vel', 'mor', 'tha', 'kis', 'ond', 'ur', 'eph', 'sar', 'lin', 'dra', 'bex', 'qui')   # 12 longitude blocks
_SYL_B = ('ath', 'ora', 'eth', 'imal', 'unda', 'essa', 'ovi')                                  # 7 latitude bands


def band_index(lat_deg):
    a = np.abs(np.asarray(lat_deg, dtype=float))
    return np.searchsorted(np.array(BAND_EDGES), a, side='right')


def band_name(lat_deg):
    return BAND_NAMES[int(band_index(lat_deg))]


def sst_base(lat_deg):
    # TUNING: annual mean sea surface temperature by latitude, T = 29 cos(lat)^1.4 - 1, clipped at the freezing point of seawater
    c = np.clip(np.cos(np.radians(lat_deg)), 0.0, 1.0)
    return np.maximum(29.0 * c ** 1.4 - 1.0, -1.8)


def cell_of(lon_deg, lat_deg):
    # (row, col) of the cell holding a point; accepts arrays
    j = np.clip(np.floor((np.asarray(lat_deg) + 90.0) / DEG).astype(np.int64), 0, NLAT - 1)
    i = np.floor((np.asarray(lon_deg) + 180.0) / DEG).astype(np.int64) % NLON
    return j, i


def block_of_cell(j, i):
    # (lon block, lat band) of a cell; the last latitude band absorbs the leftover row
    return np.asarray(i) // BLOCK_LON_CELLS, np.minimum(np.asarray(j) // BLOCK_LAT_CELLS, N_LAT_BLOCKS - 1)


def region_id(j, i):
    lb, bb = block_of_cell(j, i)
    return 'R%02d-%d' % (int(lb), int(bb))


def region_name(j, i):
    # generic invented name for a block, the same for every seed (the land under it differs per seed)
    lb, bb = block_of_cell(j, i)
    return (_SYL_A[int(lb)] + _SYL_B[int(bb)]).capitalize()


def region_label(j, i):
    # what the game would say: no name, just a warm or cold shore in a direction (from the block's middle latitude)
    lb, bb = block_of_cell(j, i)
    lat = -90.0 + BLOCK_LAT_CELLS * DEG * (int(bb) + 0.5)
    b = BAND_NAMES[int(band_index(lat))]
    warm = {'tropical': 'warm', 'subtropical': 'mild', 'temperate': 'cool', 'subpolar': 'cold', 'polar': 'icy'}[b]
    side = 'northern' if lat >= 0 else 'southern'
    return 'the %s %s shore' % (warm, side)


def _neighbours(mask, diag=False):
    # number of True neighbours of each cell (longitude wraps, latitude edges count as False)
    n = np.zeros(mask.shape, dtype=np.int32)
    n += np.roll(mask, 1, 1) + np.roll(mask, -1, 1)
    up = np.zeros_like(mask); up[:-1] = mask[1:]
    dn = np.zeros_like(mask); dn[1:] = mask[:-1]
    n += up + dn
    if diag:
        for sx in (1, -1):
            n += np.roll(up, sx, 1) + np.roll(dn, sx, 1)
    return n


def label_components(mask, diag=False):
    # connected components of a boolean grid, longitude wraps; returns (labels, sizes) with label 0 = not in mask
    lab = np.zeros(mask.shape, dtype=np.int32)
    sizes = [0]
    steps = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    if diag:
        steps += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    cur = 0
    for j0 in range(NLAT):
        for i0 in range(NLON):
            if not mask[j0, i0] or lab[j0, i0]:
                continue
            cur += 1
            stack = [(j0, i0)]
            lab[j0, i0] = cur
            n = 0
            while stack:
                j, i = stack.pop()
                n += 1
                for dj, di in steps:
                    jj, ii = j + dj, (i + di) % NLON
                    if 0 <= jj < NLAT and mask[jj, ii] and not lab[jj, ii]:
                        lab[jj, ii] = cur
                        stack.append((jj, ii))
            sizes.append(n)
    return lab, np.array(sizes, dtype=np.int64)


def _noise_field(rng):
    # sum of random plane waves on the sphere, three octaves with 6, 12 and 24 directions (research note 7.1)
    lat = np.radians(LAT2); lon = np.radians(LON2)
    P = np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], axis=-1)   # [NLAT, NLON, 3]
    f = np.zeros(LAT2.shape)
    for ndir, freq, amp in ((6, 2.3, 1.0), (12, 4.6, 0.55), (24, 9.2, 0.28)):
        d = rng.standard_normal((ndir, 3))
        d /= np.linalg.norm(d, axis=1, keepdims=True)
        ph = rng.uniform(0, 2 * np.pi, ndir)
        fr = freq * rng.uniform(0.8, 1.25, ndir)
        for k in range(ndir):
            f += amp / np.sqrt(ndir / 6.0) * np.sin(fr[k] * (P @ d[k]) + ph[k])
    return f


def _weighted_quantile_threshold(f, w, frac_above):
    # value t such that the area-weighted share of cells with f > t is frac_above
    o = np.argsort(f.ravel())
    cs = np.cumsum(w.ravel()[o])
    cs /= cs[-1]
    k = int(np.searchsorted(cs, 1.0 - frac_above))
    return f.ravel()[o][min(k, len(o) - 1)]


def _cleanup(land, ice):
    # drop one-cell islands and one-cell lakes (no land neighbour / only land neighbours); ice caps stay as they are
    for _ in range(2):
        n = _neighbours(land)
        land = land & ~((n == 0) & ~ice)
        n = _neighbours(land)
        land = land | ((n == 4) & ~land)
    return land | ice


def ocean_runs(row_land):
    # lengths of the ocean runs along one latitude row (longitude wraps); a row with no land is one run of NLON
    if not row_land.any():
        return [NLON]
    k = int(np.argmax(row_land))
    r = np.roll(row_land, -k)
    runs, n = [], 0
    for v in r:
        if v:
            if n:
                runs.append(n)
            n = 0
        else:
            n += 1
    if n:
        runs.append(n)
    return runs


def _ocean_basins_ok(land):
    # at least two ocean basins of 60 degrees of longitude or more: at least 6 rows inside 45 degrees of the equator hold
    # two separate ocean runs of 12 or more cells each
    good = 0
    for j in range(NLAT):
        if abs(LAT[j]) <= 45.0 and sum(1 for n in ocean_runs(land[j]) if n >= 12) >= 2:
            good += 1
    return good >= 6


class Planet:
    # seed: the seed asked for; attempt: how many reseeds the basin rule needed (0 usually); all arrays [NLAT, NLON]
    def __init__(self, seed):
        self.seed = int(seed)
        ice = np.abs(LAT2) > ICE_LAT
        ice_area = float(AREA_W[ice].sum())
        for attempt in range(40):
            rng = np.random.default_rng([self.seed, 9000, attempt])
            target = rng.uniform(*LAND_FRAC_RANGE)
            f = _noise_field(rng)
            share = max((target - ice_area) / (1.0 - ice_area), 0.05)
            w = np.where(ice, 0.0, AREA_W)
            t = _weighted_quantile_threshold(f, w, share)
            land = _cleanup((f > t) & ~ice, ice)
            if _ocean_basins_ok(land):
                break
        self.attempt = attempt
        self.land = land
        self.ice = ice
        self.ocean = ~land
        self.field = f
        rs = np.random.default_rng([self.seed, 9100])
        u = rs.uniform(size=land.shape)
        st = np.where(u < 0.35, SHORE_ROCK, np.where(u < 0.60, SHORE_MIXED, SHORE_SAND))
        self.shore = np.where(ice, SHORE_ICE, np.where(land, st, SHORE_NONE)).astype(np.int8)
        self.p_beach = SHORE_P_BEACH[self.shore]
        # coast: ocean cells with a land neighbour (eight neighbours)
        self.coast = self.ocean & (_neighbours(land, diag=True) > 0)
        lab, sizes = label_components(land & ~ice)
        self.land_size = sizes[lab]                       # size in cells of the land mass each land cell belongs to (0 on ocean and ice)
        self.port_score = rs.uniform(size=land.shape)     # seeded: which coast cells hold a port
        self.settle_score = rs.uniform(size=land.shape)
        self.land_fraction = float((AREA_W * land).sum())
        self.noise_land_fraction = float((AREA_W * (land & ~ice)).sum() / (1.0 - ice_area))
        self.sst0 = sst_base(LAT2)

    def coast_land_size(self):
        # for each ocean cell, the size of the largest land mass among its eight neighbours (0 away from land)
        out = np.zeros(self.land.shape, dtype=np.int64)
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                if dj == 0 and di == 0:
                    continue
                s = np.roll(self.land_size, di, 1)
                if dj == 1:
                    s = np.vstack([s[1:], np.zeros((1, NLON), s.dtype)])
                elif dj == -1:
                    s = np.vstack([np.zeros((1, NLON), s.dtype), s[:-1]])
                out = np.maximum(out, s)
        return np.where(self.ocean, out, 0)

    def hash_hex(self):
        import hashlib
        return hashlib.sha256(np.packbits(self.land).tobytes() + self.shore.tobytes()).hexdigest()[:16]
