# circulation.py: wind-driven surface circulation on the 5 degree grid.
# Stommel-type balance on the sphere:  r * lap(psi) + beta * psi_x = curl(tau),  psi = 0 on land and on the polar caps.
# Velocity u = -psi_y, v = psi_x, then scaled so the open-ocean median speed is 0.15 m/s (research note 7.2).
# A dense numpy solve of at most about 2000 unknowns, deterministic, about a tenth of a second.
# Plausible, not real: a Stommel gyre needs no hand drawing and respects any coast, but the jets are about 500 km wide and
# slower than a real western current, islands are plain land with psi = 0, and there is no deep or thermal circulation.
import numpy as np
import planet as PL

D = np.radians(PL.DEG)
FRICTION_R = 0.12            # TUNING: bottom friction in nondimensional units; boundary layer width r / beta is about 7 degrees (1 to 2 cells)
OPEN_OCEAN_MEDIAN = 0.15     # m/s, the note's recommended open-ocean median speed (TUNING; the real range is 0.1 to 0.3)
WIND_STRESS_SHIFT_DEG = 0.0  # seasonal shift of the wind belts (3 degrees at most), a parameter for a seasonal re-solve


def wind_stress_x(lat_deg, shift_deg=0.0):
    # tau_x = -cos(3 lat): trades (easterly, negative) from 0 to 30, westerlies from 30 to 60 (research note 7.2)
    return -np.cos(3.0 * np.radians(np.asarray(lat_deg) - shift_deg))


def wind_curl(lat_deg, shift_deg=0.0):
    # curl_z of (tau_x, 0) on the sphere:  -(1/cos) d(tau_x cos)/d(lat),  analytic
    p = np.radians(np.asarray(lat_deg) - shift_deg)
    d_tc = 3.0 * np.sin(3.0 * p) * np.cos(p) + np.cos(3.0 * p) * np.sin(p)
    return -d_tc / np.cos(np.radians(lat_deg))


def solve_psi(ocean, r=FRICTION_R, shift_deg=0.0):
    nj, ni = ocean.shape
    idx = -np.ones(ocean.shape, dtype=np.int64)
    oj, oi = np.nonzero(ocean)
    n = len(oj)
    idx[oj, oi] = np.arange(n)
    lat = PL.LAT[oj]
    c = np.cos(np.radians(lat))
    cn = np.cos(np.radians(lat + PL.DEG / 2.0))
    cs = np.cos(np.radians(lat - PL.DEG / 2.0))
    A = np.zeros((n, n))
    rows = np.arange(n)
    ew = r / (c * c * D * D)
    adv = 1.0 / (2.0 * D)                                  # beta psi_x with beta = cos(lat)
    center = -2.0 * ew - r * (cn + cs) / (c * D * D)
    A[rows, rows] = center
    for dj, di, coef in ((0, 1, ew + adv), (0, -1, ew - adv), (1, 0, r * cn / (c * D * D)), (-1, 0, r * cs / (c * D * D))):
        jj = oj + dj
        ii = (oi + di) % ni
        ok = (jj >= 0) & (jj < nj)
        jc = np.clip(jj, 0, nj - 1)
        nb = np.where(ok, idx[jc, ii], -1)
        m = nb >= 0                                        # land neighbours hold psi = 0, so they drop out
        A[rows[m], nb[m]] += coef[m]
    b = wind_curl(lat, shift_deg)
    psi_v = np.linalg.solve(A, b)
    psi = np.zeros(ocean.shape)
    psi[oj, oi] = psi_v
    return psi


def velocity_from_psi(psi, ocean):
    # centred differences on the sphere, land cells hold zero velocity; returns (u, v) in model units
    pe = np.roll(psi, -1, 1)
    pw = np.roll(psi, 1, 1)
    pn = np.vstack([psi[1:], psi[-1:] * 0.0])
    ps = np.vstack([psi[:1] * 0.0, psi[:-1]])
    u = -(pn - ps) / (2.0 * D)
    v = (pe - pw) / (2.0 * D * PL.COSLAT)
    return np.where(ocean, u, 0.0), np.where(ocean, v, 0.0)


def open_ocean_mask(planet):
    # ocean cells with no land within one cell (eight neighbours) and inside 70 degrees
    near_land = PL._neighbours(planet.land, diag=True) > 0
    return planet.ocean & ~near_land & (np.abs(PL.LAT2) <= 70.0)


class Circulation:
    def __init__(self, planet, shift_deg=WIND_STRESS_SHIFT_DEG, median=OPEN_OCEAN_MEDIAN):
        self.planet = planet
        psi = solve_psi(planet.ocean, shift_deg=shift_deg)
        u, v = velocity_from_psi(psi, planet.ocean)
        sp = np.hypot(u, v)
        m = open_ocean_mask(planet)
        med = float(np.median(sp[m])) if m.any() else float(np.median(sp[planet.ocean]))
        self.scale = median / max(med, 1e-12)
        self.psi = psi * self.scale
        self.u = u * self.scale                            # m/s eastward
        self.v = v * self.scale                            # m/s northward
        self.speed = np.hypot(self.u, self.v)
        self.open_mask = m
        self.sst = sst_field(planet, self)

    def vorticity_sign_check(self):
        # area-weighted mean psi in the subtropics of each hemisphere (positive north means clockwise)
        out = {}
        for name, lo, hi in (('north', 15.0, 40.0), ('south', -40.0, -15.0)):
            m = self.planet.ocean & (PL.LAT2 >= lo) & (PL.LAT2 <= hi)
            out[name] = float((self.psi * PL.AREA_W * m).sum() / max((PL.AREA_W * m).sum(), 1e-12))
        return out

    def zonal_means(self):
        # area-weighted mean eastward speed over open ocean in the trade belt and the westerly belt, both hemispheres
        out = {}
        for name, lo, hi in (('trades_n', 5.0, 25.0), ('trades_s', -25.0, -5.0), ('westerlies_n', 35.0, 55.0), ('westerlies_s', -55.0, -35.0)):
            m = self.open_mask & (PL.LAT2 >= lo) & (PL.LAT2 <= hi)
            w = PL.AREA_W * m
            out[name] = float((self.u * w).sum() / max(w.sum(), 1e-12))
        return out

    def boundary_ratios(self, min_run=6):
        # for each ocean run of at least min_run cells between 10 and 50 degrees of latitude, the strongest meridional speed within two
        # cells of the western coast over the strongest within two cells of the eastern coast
        out = []
        for j in range(PL.NLAT):
            if not (10.0 <= abs(PL.LAT[j]) <= 50.0):
                continue
            land = self.planet.land[j]
            if not land.any():
                continue
            k = int(np.argmax(land))
            r = np.roll(~land, -k)
            vr = np.roll(np.abs(self.v[j]), -k)
            i = 0
            n = len(r)
            while i < n:
                if r[i]:
                    s = i
                    while i < n and r[i]:
                        i += 1
                    if i - s >= min_run:
                        seg = vr[s:i]
                        out.append((j, float(seg[:2].max()), float(seg[-2:].max())))
                else:
                    i += 1
        return out

    def diagnostics(self):
        sp = self.speed[self.planet.ocean]
        br = self.boundary_ratios()
        ratios = [w / max(e, 1e-9) for (_, w, e) in br]
        return dict(scale=float(self.scale), median_open=float(np.median(self.speed[self.open_mask])) if self.open_mask.any() else 0.0,
                    p90=float(np.percentile(sp, 90)), p995=float(np.percentile(sp, 99.5)), max=float(sp.max()),
                    gyre_sense=self.vorticity_sign_check(), zonal=self.zonal_means(), n_runs=len(ratios),
                    west_east_median=float(np.median(ratios)) if ratios else 0.0,
                    west_stronger_share=float(np.mean([x > 1.0 for x in ratios])) if ratios else 0.0,
                    west_over2_share=float(np.mean([x > 2.0 for x in ratios])) if ratios else 0.0)

    def sample(self, lon, lat):
        # bilinear current at one point, (u, v) in m/s
        return bilinear(np.stack([self.u, self.v], axis=-1), np.atleast_1d(lon), np.atleast_1d(lat))[0]

    def hash_hex(self):
        import hashlib
        return hashlib.sha256(np.round(self.psi, 9).tobytes()).hexdigest()[:16]


def sst_field(planet, circ):
    # TUNING: base SST by latitude, plus 3 C times the poleward flow share (warm western jets) and minus 2 C times equatorward
    # flow share (cool eastern flow); the share saturates at a poleward speed of 0.2 m/s
    vpole = circ.v * np.sign(PL.LAT2)
    ref = 0.2
    warm = 3.0 * np.clip(vpole / ref, 0.0, 1.0)
    cool = 2.0 * np.clip(-vpole / ref, 0.0, 1.0)
    return np.maximum(planet.sst0 + warm - cool, -1.8)


def bilinear(field, lon, lat):
    # field [NLAT, NLON] or [NLAT, NLON, k]; lon wraps, lat clamps; points are in degrees, cell centres hold the values
    fj = (np.asarray(lat) + 90.0) / PL.DEG - 0.5
    fi = (np.asarray(lon) + 180.0) / PL.DEG - 0.5
    j0 = np.floor(fj).astype(np.int64)
    i0 = np.floor(fi).astype(np.int64)
    tj = fj - j0
    ti = fi - i0
    j1 = np.clip(j0 + 1, 0, PL.NLAT - 1)
    j0 = np.clip(j0, 0, PL.NLAT - 1)
    i1 = (i0 + 1) % PL.NLON
    i0 = i0 % PL.NLON
    if field.ndim == 3:
        tj = tj[..., None]
        ti = ti[..., None]
    return ((1 - tj) * ((1 - ti) * field[j0, i0] + ti * field[j0, i1]) + tj * ((1 - ti) * field[j1, i0] + ti * field[j1, i1]))
