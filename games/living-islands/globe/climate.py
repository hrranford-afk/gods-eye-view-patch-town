# climate.py: a headless, deterministic monthly climate for the invented planet (72 x 36 grid). numpy only (PIL only for maps).
# Recipe from research/WATER_AND_RAIN_REAL_WORLD.md section 7:
#   1. sun: daily mean insolation from tilt and day of year  -> sea-level air temperature (with lag and sea/land damping)
#   2. circulation: Hadley edge from spin (Held-Hou style, 1/spin), ITCZ placed where the surface is warmest, subtropical descent,
#      mid-latitude storm tracks (strength from the temperature gradient), polar descent  -> a vertical-motion index W
#   3. rain = W (up) x moisture available (Clausius-Clapeyron, 7 percent per K) x marine moisture fraction (upwind ocean, decays over land)
#      x sea-surface-temperature anomaly factor (cold current dries a coast), plus orographic lift (wind . slope), minus lee descent
#   4. ocean evaporation by the bulk formula; land evaporation by a Hargreaves-type PET and a soil bucket; snow store; groundwater store
#   5. the SIZE of the rain is set by closing the planet's water budget (global evaporation = global rain), so the pattern is dynamics
#      and the magnitude is the evaporation budget. This is how the real planet works at the global scale (energy limits evaporation).
# Honest limits: one layer, no real wind or moisture transport, no clouds-radiation feedback, 5 degree cells. A toy that gets the
# first-order geography right, not a forecast. Nothing here names a real place.
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planet as PL

NLAT, NLON = PL.NLAT, PL.NLON
LAT2, AREA_W = PL.LAT2, PL.AREA_W
LATV = PL.LAT
S0 = 1361.0                                   # W/m2 solar constant (High)
EARTH_TILT = 23.44
MONTH_DAYS = np.array([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], dtype=float)
MONTH_MID = np.cumsum(MONTH_DAYS) - MONTH_DAYS / 2.0          # day of year at mid month
YEAR = 365.0
CELL_KM = 111.2 * PL.DEG                      # 556 km

# ---- tuning numbers (all TUNING unless noted) ----
HADLEY_EARTH_DEG = 30.0                       # edge of the Hadley cell at spin 1 (Medium: 25 to 35 in reality)
HADLEY_SPIN_EXP = 0.7                         # Held-Hou says 1.0, weaker in full models: Medium/Low
STORM_RATIO = 1.65                            # storm track latitude / Hadley edge (Earth about 45-55 / 30)
T_CONT = (27.5, 38.0)                         # continental annual mean sea-level air temperature = 27.5 - 38 sin2(lat) (fit to Earth, Medium)
LAND_SLOPE, OCEAN_SLOPE = 0.07, 0.022         # K of seasonal swing per W/m2 of insolation anomaly (land, sea): Earth 50N land +-14, sea +-4.5
LAND_LAG, OCEAN_LAG = 15.0, 55.0              # days the temperature lags the insolation
LAPSE = 6.0                                   # K per km (Medium: 6.5 standard, 5 to 7 observed)
RH_SEA = 0.8
CE = 1.2e-3                                   # bulk transfer coefficient (Medium)
SOIL_MAX = 150.0                              # mm bucket
MELT = 3.0                                    # mm per K per day degree-day melt (Medium)
K_ORO = 0.30                                  # share of the lifted vapour flux that falls (TUNING; real 0.2 to 0.6)
MOIST_L_KM = 3500.0                           # e-folding distance of marine moisture over land (TUNING)


# ---------------------------------------------------------------- small helpers
def blur(f, passes=1):
    # 3 x 3 mean, longitude wraps, latitude edge repeats
    g = f.astype(float)
    for _ in range(passes):
        a = (np.roll(g, 1, 1) + g + np.roll(g, -1, 1)) / 3.0
        up = np.vstack([a[1:], a[-1:]])
        dn = np.vstack([a[:1], a[:-1]])
        g = (up + a + dn) / 3.0
    return g


def blur_lon(f, passes=1):
    g = f.astype(float)
    for _ in range(passes):
        g = (np.roll(g, 1, 1) + g + np.roll(g, -1, 1)) / 3.0
    return g


def norm_blur(f, wt, passes=3):
    # smooth f only using cells where wt > 0 (normalised convolution); where nothing is near, return the plain row mean of f
    num = blur(f * wt, passes)
    den = blur(wt.astype(float), passes)
    return np.where(den > 1e-6, num / np.maximum(den, 1e-6), np.nan)


def sat_vapour_hpa(t):
    return 6.112 * np.exp(17.67 * t / (t + 243.5))


def qsat(t, p_hpa=1013.0):
    es = sat_vapour_hpa(t)
    return 0.622 * es / (p_hpa - es)


def insolation(lat_deg, doy, tilt_deg):
    # daily mean top-of-atmosphere insolation W/m2 for a circular orbit (High: standard astronomy)
    lam = 2.0 * np.pi * (doy - 80.0) / YEAR
    dec = np.arcsin(np.sin(np.radians(tilt_deg)) * np.sin(lam))
    phi = np.radians(np.clip(lat_deg, -89.5, 89.5))
    x = np.clip(-np.tan(phi) * np.tan(dec), -1.0, 1.0)
    h0 = np.arccos(x)
    return S0 / np.pi * (h0 * np.sin(phi) * np.sin(dec) + np.cos(phi) * np.cos(dec) * np.sin(h0)), np.degrees(dec)


def hadley_edge(spin):
    # latitude of the Hadley cell edge in degrees: sin(edge) scales as spin ** -HADLEY_SPIN_EXP, capped at 70
    s = np.sin(np.radians(HADLEY_EARTH_DEG)) * float(spin) ** (-HADLEY_SPIN_EXP)
    return float(min(np.degrees(np.arcsin(min(s, 1.0))), 70.0))


def elevation_from_planet(planet):
    # invented heights, metres: noise above the land threshold, powered so there are few high peaks, ice caps a plateau
    f = planet.field
    land = planet.land & ~planet.ice
    lo, hi = f[land].min(), f[land].max()
    h = np.where(land, np.clip((f - lo) / max(hi - lo, 1e-9), 0.0, 1.0) ** 1.5 * 3500.0, 0.0)
    return np.where(planet.ice, 2200.0, h)


def bilin_cells(f, jj, ii):
    # sample f at fractional (row, col); columns wrap, rows clamp
    j0 = np.floor(jj).astype(int)
    i0 = np.floor(ii).astype(int)
    tj, ti = jj - j0, ii - i0
    j1 = np.clip(j0 + 1, 0, NLAT - 1)
    j0 = np.clip(j0, 0, NLAT - 1)
    i1 = (i0 + 1) % NLON
    i0 = i0 % NLON
    return (1 - tj) * ((1 - ti) * f[j0, i0] + ti * f[j0, i1]) + tj * ((1 - ti) * f[j1, i0] + ti * f[j1, i1])


JJ, II = np.meshgrid(np.arange(NLAT, dtype=float), np.arange(NLON, dtype=float), indexing='ij')


def wind_field(lat2, hadley, shift):
    # prescribed surface wind (u east, v north) m/s. Same shape as drift.wind_at (cos 3 lat) but the width follows the Hadley edge H:
    # trades (easterly) inside H, westerlies out to 3 H, polar easterlies beyond; surface flow toward the equator inside H, poleward from H to 2 H.
    # shift: latitude of the ITCZ per cell; the belts follow it at 0.6
    sgn = np.sign(lat2)
    phi = lat2 - 0.6 * shift
    a = np.abs(phi)
    th = 0.5 * np.pi * a / hadley
    ut = np.where(a < hadley, 6.5, np.where(a < 3.0 * hadley, 8.5, 3.0))
    u = -ut * np.cos(th) * (0.55 + 0.45 * np.minimum(1.0, a / (0.4 * hadley)))      # doldrums at the equator
    v = -sgn * 2.0 * np.sin(np.pi * a / hadley) * (a < 2.0 * hadley)
    return u, v


def bucket(P, pet, T, ice, years=6):
    # monthly land water balance on arrays [12, ...]: snow store (degree-day melt), soil bucket (field capacity SOIL_MAX), ET limited by soil
    # wetness, surplus split into fast runoff (70 percent) and groundwater recharge (30 percent), slow drainage of the soil, a groundwater
    # store that feeds baseflow (20 percent a month). Spun up for several years so the annual change in storage is about zero.
    shp = P.shape[1:]
    S = np.full(shp, 60.0)
    swe = np.zeros(shp)
    G = np.full(shp, 100.0)
    for y in range(years):
        ET, Q, QB, SW, MLT, RCH, SOIL, SNOWP = [np.zeros(P.shape) for _ in range(8)]
        for m in range(12):
            d = MONTH_DAYS[m]
            p = P[m] * d
            ps = 1.0 / (1.0 + np.exp((T[m] - 1.0) / 1.2))
            snow = p * ps
            swe = swe + snow
            melt = np.minimum(swe, MELT * np.maximum(T[m], 0.0) * d)
            swe = swe - melt
            inflow = (p - snow) + melt
            avail = S + inflow
            et = np.minimum(pet[m] * d * np.clip(avail / (0.5 * SOIL_MAX), 0.0, 1.0), avail)
            et = np.where(ice, np.minimum(0.04 * pet[m] * d, avail), et)
            S2 = avail - et
            surplus = np.maximum(S2 - SOIL_MAX, 0.0)
            S2 = S2 - surplus
            slow = 0.03 * S2
            S2 = S2 - slow
            rech = 0.3 * surplus + slow
            G = G + rech
            qb = 0.2 * G
            G = G - qb
            qfast = 0.7 * surplus
            qfast = np.where(ice, np.maximum(inflow - et, 0.0), qfast)      # ice caps shed everything (calving, melt): no storage
            S = np.where(ice, 0.0, S2)
            ET[m] = et / d; Q[m] = (qfast + qb) / d; QB[m] = qb / d; SW[m] = swe; MLT[m] = melt / d; RCH[m] = rech / d
            SOIL[m] = S; SNOWP[m] = snow / d
        swe = np.where(ice, 0.0, swe)
    return dict(et=ET, q=Q, qbase=QB, swe=SW, melt=MLT, recharge=RCH, soil=SOIL, snow=SNOWP)



# ---------------------------------------------------------------- the model
class Climate:
    # planet: anything with .land .ice .ocean .field (field only needed if elevation is None); sst: [NLAT, NLON] annual mean sea surface
    # temperature in C; elevation: metres [NLAT, NLON] or None to invent from planet.field; tilt degrees; spin relative to Earth
    def __init__(self, planet, sst, tilt=EARTH_TILT, spin=1.0, elevation=None):
        self.tilt = float(tilt)
        self.spin = float(spin)
        self.land, self.ice, self.ocean = planet.land.copy(), planet.ice.copy(), planet.ocean.copy()
        self.elev = elevation_from_planet(planet) if elevation is None else np.asarray(elevation, float)
        self.hadley = hadley_edge(spin)
        self.storm_lat = min(STORM_RATIO * self.hadley, 85.0)
        self.sst_in = np.asarray(sst, float)
        self._temperature()
        self._rain_pattern()
        self._water_balance()

    # ---- 1. temperature
    def _temperature(self):
        tilt = self.tilt
        lat = LAT2
        qb = np.zeros_like(lat)
        for m in range(12):
            qb += insolation(lat, MONTH_MID[m], tilt)[0] / 12.0
        qref = np.zeros_like(lat)
        for m in range(12):
            qref += insolation(lat, MONTH_MID[m], EARTH_TILT)[0] / 12.0
        dtilt = 0.12 * (qb - qref)                                # annual-mean shift when the tilt differs from Earth (Low)
        wo = np.clip(blur(self.ocean.astype(float), 3) * 1.15, 0.0, 1.0)
        wo = np.where(self.ocean, 1.0, wo)
        self.w_ocean = wo
        sst = np.maximum(self.sst_in + dtilt, -1.8)
        sst_near = norm_blur(sst, self.ocean, 4)
        rowmean = np.array([np.nanmean(np.where(self.ocean[j], sst[j], np.nan)) if self.ocean[j].any() else np.nan for j in range(NLAT)])
        fill = np.where(np.isnan(rowmean), np.nanmean(rowmean), rowmean)[:, None] * np.ones((1, NLON))
        sst_near = np.where(np.isnan(sst_near), fill, sst_near)
        t_cont = T_CONT[0] - T_CONT[1] * np.sin(np.radians(lat)) ** 2 + dtilt
        t_mean_sea = np.where(self.ocean, sst, sst_near) - 0.5
        self.sst_mean = np.where(self.ocean, sst, sst_near)       # smooth sea-surface field also used on land cells near the coast
        tmean = wo * t_mean_sea + (1.0 - wo) * t_cont             # sea-level annual mean air temperature
        self.t_sl_mean = tmean
        self.t_atm_zonal = np.zeros((12, NLAT))                   # free-air zonal temperature (land-like response, no sea damping) for baroclinicity
        T = np.zeros((12, NLAT, NLON))
        SST = np.zeros((12, NLAT, NLON))
        icef = np.where(self.ice, 0.5, 1.0)
        for m in range(12):
            ql = insolation(lat, MONTH_MID[m] - LAND_LAG, tilt)[0]
            qo = insolation(lat, MONTH_MID[m] - OCEAN_LAG, tilt)[0]
            an_l = np.clip(LAND_SLOPE * (ql - self._qlag_mean(LAND_LAG, lat)), -20, 20)
            an_o = np.clip(OCEAN_SLOPE * (qo - self._qlag_mean(OCEAN_LAG, lat)), -8, 8)
            self.t_atm_zonal[m] = tmean.mean(1) + 0.8 * an_l[:, 0]
            T[m] = tmean + (wo * an_o + (1.0 - wo) * an_l) * icef
            SST[m] = np.maximum(self.sst_mean + an_o - 0.0, -1.8)
        self.sst_m = SST
        T = np.where(self.ocean, np.maximum(T, -1.8 - 0.5), T)
        self.t_sl = T                                             # sea-level air temperature C, [12, NLAT, NLON]
        self.T = T - LAPSE * self.elev / 1000.0 * (self.elev > 0)
        self.T = np.where(self.ice, np.minimum(self.T, 0.0), self.T)

    def _qlag_mean(self, lag, lat):
        return sum(insolation(lat, MONTH_MID[m] - lag, self.tilt)[0] for m in range(12)) / 12.0

    # ---- 2. rain pattern
    def _rain_pattern(self):
        H, SL = self.hadley, self.storm_lat
        lat = LAT2
        hr = np.radians
        # (a) ITCZ latitude per longitude and month: where the sea-level surface is warmest inside the tropics, smoothed
        sel = np.abs(LATV) <= 40.0
        cap = min(0.9 * self.tilt, 40.0)
        itcz = np.zeros((12, NLON))
        for m in range(12):
            tt = blur_lon(self.t_sl[m], 2)[sel]
            wgt = np.exp((tt - tt.max(0, keepdims=True)) / 1.5)
            loc = (wgt * LATV[sel][:, None]).sum(0) / wgt.sum(0)
            loc = blur_lon(loc[None, :], 3)[0]
            itcz[m] = np.clip(0.75 * (0.5 * loc + 0.5 * loc.mean()), -cap, cap)
        self.itcz = itcz                                          # degrees, [12, NLON]
        # (b) vertical-motion index W
        W = np.zeros((12, NLAT, NLON))
        shift_all = np.zeros((12, NLAT, NLON))
        SI = np.zeros((12, 2))
        tz = self.t_atm_zonal                                     # zonal mean free-air T [12, NLAT]
        self.storm_w = np.zeros((12, NLAT, NLON))
        for m in range(12):
            ph = itcz[m][None, :] * np.ones((NLAT, 1))            # ITCZ latitude per column
            shift_all[m] = ph
            d = lat - ph
            w = 0.62 * np.exp(-(d / 6.5) ** 2)                    # ITCZ ascent
            for s in (1.0, -1.0):
                c = s * H + 0.5 * ph
                w -= 0.60 * np.exp(-((lat - c) / (6.0 + 0.12 * H)) ** 2)      # subtropical descent
                cs = s * SL + 0.25 * ph
                # baroclinicity: equator-to-pole temperature drop across the storm track, K per 20 degrees
                ja = int(np.clip(np.round((s * SL - 10 + 90) / PL.DEG - 0.5), 0, NLAT - 1))
                jb = int(np.clip(np.round((s * SL + 10 + 90) / PL.DEG - 0.5), 0, NLAT - 1))
                g = abs(tz[m][ja] - tz[m][jb]) if s > 0 else abs(tz[m][ja] - tz[m][jb])
                amp = 0.62 * np.clip(g / 14.0, 0.2, 1.6) ** 1.7 * np.clip((85.0 - SL) / 25.0, 0.0, 1.0)
                sw = amp * np.exp(-((lat - cs) / (7.0 + 0.1 * SL)) ** 2) * (np.sign(lat) == s)
                w += sw
                self.storm_w[m] += sw
            w -= 0.35 * np.exp(-((np.abs(lat) - 90.0) / 14.0) ** 2)        # polar descent
            W[m] = w
        self.W = W
        # (c) winds, uplift over hills, marine moisture
        self.u = np.zeros((12, NLAT, NLON))
        self.v = np.zeros((12, NLAT, NLON))
        for m in range(12):
            self.u[m], self.v[m] = wind_field(lat, H, shift_all[m])
        dy = CELL_KM * 1000.0
        dx = dy * np.cos(hr(np.clip(lat, -85, 85)))
        hx = (np.roll(self.elev, -1, 1) - np.roll(self.elev, 1, 1)) / (2.0 * dx)
        hy = np.gradient(self.elev, axis=0) / dy
        self.uplift = self.u * hx + self.v * hy                   # m/s, positive = forced up
        P = np.zeros((12, NLAT, NLON))
        self.p_oro = np.zeros((12, NLAT, NLON))
        self.marine = np.zeros((12, NLAT, NLON))
        anom_s = self.sst_mean - np.array([np.nanmean(np.where(self.ocean[j], self.sst_mean[j], np.nan)) if self.ocean[j].any() else self.sst_mean[j].mean()
                                           for j in range(NLAT)])[:, None]
        anom_s = np.clip(anom_s, -8, 8)
        self.sst_anom = anom_s
        for m in range(12):
            tsea = np.clip(self.t_sl[m], -30, 35)
            cq = np.exp(0.0693 * (tsea - 15.0))                   # Clausius-Clapeyron: 7 percent per K (High)
            ws = self.uplift[m]
            speed = np.hypot(self.u[m], self.v[m]) + 2.0
            # oro rain mm/day: lifted vapour mass flux x share that falls
            rho_qv = 1.2 * RH_SEA * qsat(np.clip(self.T[m] - 2.0, -30, 35))
            p_oro = K_ORO * np.maximum(ws, 0.0) * rho_qv * 86400.0
            p_oro = np.minimum(p_oro, 25.0)
            self.p_oro[m] = p_oro
            mar = self._marine(m, p_oro, speed)
            self.marine[m] = mar
            meff = 0.25 + 0.75 * mar
            stab = np.clip(np.exp(0.08 * anom_s), 0.5, 1.6)
            lee = 1.0 / (1.0 + np.maximum(-ws, 0.0) / 0.012)
            wpos = np.maximum(W[m], 0.0)
            floor = 0.12 * np.clip(1.0 + W[m], 0.0, 1.0)
            Pm = cq * (wpos * stab + floor) * meff * lee * 9.9 + p_oro * meff
            P[m] = Pm
        self.p_raw = P                                            # mm/day, unscaled

    def _marine(self, m, p_oro, speed):
        u, v = self.u[m], self.v[m]
        n = np.hypot(u, v) + 1e-6
        uh, vh = u / n, v / n
        step_i = np.clip(uh / np.cos(np.radians(np.clip(LAT2, -80, 80))), -3, 3)
        jj = JJ - vh
        ii = II - step_i
        decay = np.exp(-CELL_KM / MOIST_L_KM) * np.exp(-p_oro / 6.0)
        mar = np.where(self.ocean, 1.0, 0.5)
        for _ in range(60):
            mar = np.where(self.ocean, 1.0, bilin_cells(mar, jj, ii) * decay)
        return mar

    # ---- evaporation, water balance and the closure
    def _evap_ocean(self):
        E = np.zeros((12, NLAT, NLON))
        for m in range(12):
            U = np.hypot(self.u[m], self.v[m]) + 3.5               # plus gustiness
            sst = self.sst_m[m]
            ta = sst - 1.0
            dq = np.maximum(qsat(sst) - RH_SEA * qsat(ta), 0.0)
            e = 1.2 * CE * U * dq * 86400.0                        # mm/day (kg/m2/s x 86400)
            e = np.where(sst < -1.0, 0.1 * e, e)
            E[m] = e
        return E

    def _pet(self):
        out = np.zeros((12, NLAT, NLON))
        tr = 4.5 + 7.0 * (1.0 - self.w_ocean)                     # diurnal range C
        for m in range(12):
            ra = insolation(LAT2, MONTH_MID[m], self.tilt)[0] / 28.9      # mm/day equivalent
            t = self.T[m]
            out[m] = np.maximum(0.0023 * ra * (np.maximum(t, -17.0) + 17.8) * np.sqrt(tr), 0.0) * (t > -1.0)
        return out

    def _land_run(self, P, pet, years=6):
        return bucket(P, pet, self.T, self.ice, years)

    def _water_balance(self):
        Eo = self._evap_ocean()
        pet = self._pet()
        self.pet = pet
        wd = MONTH_DAYS[:, None, None]
        area = AREA_W[None]
        e_ocean_tot = float((Eo * wd * area * self.ocean[None]).sum())
        praw_tot = float((self.p_raw * wd * area).sum())
        f = e_ocean_tot / praw_tot * 1.35
        for it in range(60):
            res = self._land_run(self.p_raw * f, pet)
            e_tot = e_ocean_tot + float((res['et'] * wd * area * self.land[None]).sum())
            p_tot = float((self.p_raw * f * wd * area).sum())
            fn = f * e_tot / p_tot
            if abs(fn / f - 1.0) < 1e-6:
                f = fn
                break
            f = fn
        self.f_scale = f
        self.iterations = it + 1
        self.precip = self.p_raw * f                              # mm/day
        res = self._land_run(self.precip, pet)
        self.res = res
        self.evap = np.where(self.ocean[None], Eo, res['et'])    # ocean E, land ET, mm/day
        self.runoff = np.where(self.land[None], res['q'], 0.0)
        e_tot = float((self.evap * wd * area).sum())
        p_tot = float((self.precip * wd * area).sum())
        self.global_E_mm = e_tot                                  # area-weighted mm per year
        self.global_P_mm = p_tot
        self.closure = (p_tot - e_tot) / max(e_tot, 1e-9)

    # ---------------------------------------------------------------- outputs
    def annual(self, f):
        return (f * MONTH_DAYS[:, None, None]).sum(0)

    def annual_precip(self):
        return self.annual(self.precip)

    def annual_evap(self):
        return self.annual(self.evap)

    def annual_temp(self):
        return (self.T * MONTH_DAYS[:, None, None]).sum(0) / YEAR

    def zonal_precip(self, month=None):
        P = self.annual_precip() if month is None else self.precip[month] * MONTH_DAYS[month]
        return P.mean(1)

    def land_balance(self):
        # annual area-weighted land totals in mm: P, ET, Q (internal check P = ET + Q + dS; ice caps count their runoff as Q)
        wl = AREA_W * self.land
        s = wl.sum()
        P = float((self.annual_precip() * wl).sum() / s)
        ET = float((self.annual(self.evap) * wl).sum() / s)
        Q = float((self.annual(self.runoff) * wl).sum() / s)
        return dict(P=P, ET=ET, Q=Q, dS=P - ET - Q)

    def itcz_range(self):
        zm = self.itcz.mean(1)
        return float(zm.max() - zm.min())

    def season_index(self):
        # (summer-half rain minus winter-half rain) / annual, northern-hemisphere sign: +1 = all rain in northern summer (AMJJAS-ish JJA)
        jja = self.precip[[5, 6, 7]].sum(0) * 30.4
        djf = self.precip[[11, 0, 1]].sum(0) * 30.4
        return (jja - djf) / np.maximum(self.annual_precip(), 1e-6)

    def local(self, j, i, size_km=10.0):
        # climate for an island that sits in cell (j, i); values for a small island (mostly set by the sea around it)
        Pm = self.precip[:, j, i] * MONTH_DAYS
        ann = float(Pm.sum())
        T = self.T[:, j, i]
        isl = bucket(self.precip[:, j:j + 1, i:i + 1], self.pet[:, j:j + 1, i:i + 1], self.T[:, j:j + 1, i:i + 1], np.zeros((1, 1), bool))
        isl = {k: v[:, 0, 0] for k, v in isl.items()}
        wet3 = int(np.argmax(np.convolve(np.r_[Pm, Pm[:2]], np.ones(3), 'valid')[:12]))
        dry3 = int(np.argmin(np.convolve(np.r_[Pm, Pm[:2]], np.ones(3), 'valid')[:12]))
        wo = float(self.w_ocean[j, i])
        sigma = 3.0 + 3.5 * (1.0 - wo)                             # day-to-day temperature spread
        from math import erf, sqrt
        frz = sum(MONTH_DAYS[m] * 0.5 * (1.0 + erf((0.0 - T[m]) / (sigma * sqrt(2.0)))) for m in range(12))
        ps = 1.0 / (1.0 + np.exp((T - 1.0) / 1.2))
        pday = Pm / MONTH_DAYS
        wetfrac = np.clip(1.0 - np.exp(-pday / 4.5), 0.0, 0.85)
        rain_days = float((wetfrac * MONTH_DAYS).sum())
        snow_days = float((wetfrac * ps * MONTH_DAYS).sum())
        snow_mm = float((Pm * ps).sum())
        storm = float(self.storm_w[:, j, i].mean() + 0.35 * self.storm_w[:, j, i].max())
        gale_days = float(np.clip(45.0 * storm * (0.4 + 0.6 * wo), 0.0, 120.0))
        # sea fog: warm moist air over cooler water; advected from two cells upwind
        fog = 0.0
        for m in range(12):
            u, v = self.u[m, j, i], self.v[m, j, i]
            n = np.hypot(u, v) + 1e-6
            jj = np.array([[j - 2.0 * v / n]])
            ii = np.array([[i - 2.0 * u / n / max(np.cos(np.radians(LATV[j])), 0.3)]])
            up = float(bilin_cells(self.t_sl[m], jj[0], ii[0])[0])
            sea_here = float(self.sst_m[m, j, i]) if self.ocean[j, i] else float(self.sst_m[m, j, i])
            dT = up - sea_here
            fog += MONTH_DAYS[m] * float(np.clip(0.02 + 0.045 * max(dT, 0.0), 0.0, 0.5)) * (1.0 if T[m] > -3.0 else 0.4)
        fog_days = float(fog * (0.5 + 0.5 * wo))
        return dict(cell=(int(j), int(i)), lat=float(LATV[j]), lon=float(PL.LON[i]),
                    annual_rain_mm=ann, monthly_rain_mm=Pm, wettest3_start=wet3, driest3_start=dry3,
                    wet_dry_ratio=float(Pm.max() / max(Pm.min(), 1e-6)), mean_temp=float((T * MONTH_DAYS).sum() / YEAR),
                    coldest_month=float(T.min()), warmest_month=float(T.max()), freeze_days=float(frz), rain_days=rain_days,
                    snow_days=snow_days, snow_mm=snow_mm, gale_days=gale_days, fog_days=fog_days,
                    pet_mm=float((self.pet[:, j, i] * MONTH_DAYS).sum()), et_mm=float((isl['et'] * MONTH_DAYS).sum()),
                    runoff_mm=float((isl['q'] * MONTH_DAYS).sum()), recharge_mm=float((isl['recharge'] * MONTH_DAYS).sum()),
                    sea_evap_mm=float((self.evap[:, j, i] * MONTH_DAYS).sum()) if self.ocean[j, i] else None,
                    ocean_weight=wo)

    def hash_hex(self):
        import hashlib
        return hashlib.sha256(np.round(self.precip, 7).tobytes() + np.round(self.T, 6).tobytes()).hexdigest()[:16]


def world_climate(seed, tilt=EARTH_TILT, spin=1.0):
    import circulation as CI
    p = PL.Planet(seed)
    c = CI.Circulation(p)
    return p, c, Climate(p, c.sst, tilt=tilt, spin=spin)


# ---------------------------------------------------------------- fresh water on a small island (Dupuit + Ghyben-Herzberg)
GH_RATIO = 40.0          # rho_f / (rho_s - rho_f) with 1000 and 1025 kg/m3 (High)


def freshwater_lens(recharge_mm_yr, width_m, k_m_day=10.0):
    # strip island of width L, recharge W, hydraulic conductivity K. Water table head above sea at the centre h = (L/2) sqrt(W / (K (1 + d))),
    # d = 40; the lens reaches (d) h below sea level (Ghyben-Herzberg). Returns head m, lens thickness m, and a usable thickness (half is brackish mix).
    W = recharge_mm_yr / 1000.0 / (YEAR * 86400.0)
    K = k_m_day / 86400.0
    h = 0.5 * width_m * np.sqrt(max(W, 0.0) / (K * (1.0 + GH_RATIO)))
    thick = (1.0 + GH_RATIO) * h
    return float(h), float(thick), float(0.5 * thick)


def lens_min_width(recharge_mm_yr, k_m_day=10.0, need_thickness_m=4.0):
    # width where the usable fresh layer reaches need_thickness_m (inverts freshwater_lens, linear in width)
    h1, t1, u1 = freshwater_lens(recharge_mm_yr, 1.0, k_m_day)
    return float(need_thickness_m / u1) if u1 > 0 else float('inf')


# ---------------------------------------------------------------- maps and a command line
def _ramp(x, stops):
    xs = np.array([s[0] for s in stops], float)
    cols = np.array([s[1] for s in stops], float)
    return np.stack([np.interp(x, xs, cols[:, k]) for k in range(3)], -1)


def save_map(path, field, stops, land, scale=8, title=None, lo_label='', hi_label=''):
    from PIL import Image, ImageDraw
    rgb = _ramp(field, stops)
    img = np.flipud(rgb).astype(np.uint8)
    im = Image.fromarray(img).resize((NLON * scale, NLAT * scale), Image.NEAREST)
    # coast outline
    d = ImageDraw.Draw(im)
    lf = np.flipud(land)
    for j in range(NLAT):
        for i in range(NLON):
            if lf[j, i]:
                if j == 0 or not lf[j - 1, i]:
                    d.line([(i * scale, j * scale), ((i + 1) * scale, j * scale)], fill=(20, 20, 20))
                if j == NLAT - 1 or not lf[j + 1, i]:
                    d.line([(i * scale, (j + 1) * scale), ((i + 1) * scale, (j + 1) * scale)], fill=(20, 20, 20))
                if not lf[j, (i - 1) % NLON]:
                    d.line([(i * scale, j * scale), (i * scale, (j + 1) * scale)], fill=(20, 20, 20))
                if not lf[j, (i + 1) % NLON]:
                    d.line([((i + 1) * scale, j * scale), ((i + 1) * scale, (j + 1) * scale)], fill=(20, 20, 20))
    if title:
        d.rectangle([0, 0, 8 * len(title) + 8, 14], fill=(255, 255, 255))
        d.text((4, 2), title, fill=(0, 0, 0))
    im.save(path)


RAIN_STOPS = [(0, (240, 228, 190)), (250, (230, 200, 130)), (600, (170, 210, 150)), (1200, (80, 170, 190)), (2000, (40, 100, 190)), (3200, (40, 40, 140)), (5000, (90, 20, 110))]
TEMP_STOPS = [(-30, (60, 60, 150)), (-10, (120, 160, 220)), (0, (220, 235, 245)), (10, (250, 240, 150)), (20, (240, 170, 80)), (30, (200, 60, 40))]
SEAS_STOPS = [(-1, (200, 110, 40)), (-0.3, (240, 200, 140)), (0, (240, 240, 240)), (0.3, (140, 200, 230)), (1, (30, 80, 190))]


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', default='1,2,3')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'climate_maps'))
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    for s in [int(x) for x in a.seeds.split(',')]:
        p, c, cl = world_climate(s)
        save_map(os.path.join(a.out, 'rain_seed%d.png' % s), cl.annual_precip(), RAIN_STOPS, p.land, title='annual rain mm, seed %d' % s)
        save_map(os.path.join(a.out, 'temp_seed%d.png' % s), cl.annual_temp(), TEMP_STOPS, p.land, title='annual temperature C, seed %d' % s)
        save_map(os.path.join(a.out, 'season_seed%d.png' % s), cl.season_index(), SEAS_STOPS, p.land, title='north-summer minus north-winter rain / annual, seed %d' % s)
        lb = cl.land_balance()
        print('seed %d  f=%.3f closure=%.2e  globalP=%.0f mm  land P %.0f ET %.0f Q %.0f  itcz range %.1f deg  hash %s' % (
            s, cl.f_scale, cl.closure, cl.global_P_mm, lb['P'], lb['ET'], lb['Q'], cl.itcz_range(), cl.hash_hex()))


if __name__ == '__main__':
    main()
