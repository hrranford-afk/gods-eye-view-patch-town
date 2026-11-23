"""rock3d: a cheap interior for the volcano world (province D): rock(x, y, z) -> material id, vectorised numpy.

Frame as world.py: x east, y north, z up, metres, sea level 0.  Inputs may be any broadcastable arrays.
The interior is a description, not a simulation (research/VOLCANIC_ISLAND_AND_CUTAWAY.md section 4.2):
  * beds follow the OLD edifice surface (h_shield) so they dip away from the vent, steeper near the summit; the young pile above
    it (cone, ash, flows) has beds parallel to the PRESENT surface;
  * caldera: ring faults (dipping inward with depth) drop the old stack by `dcol`; the dropped block is capped by FLAT fill beds;
  * dikes are thin tilted planes through the conduit region, cutting the beds; sills are flat slabs;
  * feeder conduit (wavy pipe) from the chamber to the crater, a deep feeder pipe below the chamber, the magma chamber is a flat
    ellipsoid with a baked-rock aureole, a hydrothermal halo round the conduit above the chamber;
  * crust (dark) at the base, thin sea-floor sediment that thickens at the foot of the flank and under the collapse scar;
  * soil strip on the land surface, young lava flow slabs where the surface has flows;
  * fresh-water lens, Ghyben-Herzberg: base depth = 40 x head (head from the world's `head` grid), pale blue, zero at the shore;
  * the tide line is a flag (|z| < 0.9) in detail().
It is vectorised: a 2048 x 1024 wall is about 2 M samples, about 2 s.
"""
import math
import os
import sys

import numpy as np

AIR, SEA, SOIL, LAVA, ASH, SCORIA, BASEMENT, CRUST, SEDIMENT, DIKE_LIGHT, MAGMA, CONDUIT, CONTACT, HYDRO, FRESH, \
    FILL, LAVA_FLOW, DIKE_DARK = range(18)
NAMES = ['air', 'sea water', 'soil', 'lava beds', 'ash and tuff', 'scoria', 'old basement', 'oceanic crust', 'sea-floor sediment',
         'dike (pale)', 'magma', 'feeder conduit', 'baked contact rock', 'hydrothermal zone', 'fresh-water lens',
         'caldera fill (flat beds)', 'young lava flow', 'dike (dark)']
# block-diagram colours (research 3.3; strongly contrasting; reds for volcanics)
PALETTE = np.array([(0, 0, 0), (62, 150, 200), (118, 82, 50), (120, 104, 96), (216, 180, 112), (178, 74, 52), (92, 80, 108),
                    (60, 72, 102), (240, 228, 192), (222, 222, 214), (255, 112, 20), (150, 38, 30), (124, 72, 62),
                    (190, 180, 72), (168, 226, 242), (196, 186, 154), (48, 42, 48), (40, 38, 44)], dtype=np.float32)


def _sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _hash01(b, salt=0.0):
    v = np.sin(b.astype(np.float64) * 12.9898 + salt * 78.233) * 43758.5453
    return (v - np.floor(v)).astype(np.float32)


class Volcano3D:
    """Interior model built from a province-D world (or from saved arrays + the parameter dict, see from_dict)."""

    def __init__(self, w=None, height=None, h_shield=None, flow_thick=None, head=None, params=None, size_m=None):
        if w is not None:
            height, h_shield, flow_thick, head, params, size_m = w.height, w.h_shield, w.flow_thick, w.head, w.volcano, w.size_m
        self.height = np.asarray(height, dtype=np.float32)
        self.h_shield = np.asarray(h_shield, dtype=np.float32)
        self.flow = np.asarray(flow_thick, dtype=np.float32)
        self.head = np.asarray(head, dtype=np.float32)
        self.n = self.height.shape[0]
        self.size = float(size_m)
        self.half = self.size / 2.0
        self.dx = self.size / (self.n - 1)
        self.p = p = params
        self.V = p['V']
        self.C1 = p['C1']
        self.rc = p['rc']
        self.dcol = p['dcol']
        self.dc = p['dc']
        self.Rc = p['Rc']
        self.floor_lv = p['floor_lv']
        self.r_f0 = 0.84 * p['rc']                       # foot of the caldera wall = top of the ring fault
        self.zc_top = -(p['Dfloor'] + 8.0)               # top of the oceanic crust
        self.z0 = self.zc_top - 55.0                     # base of the block
        ch = p['chamber']
        self.ch = ch
        self.ch_top = ch['z'] + ch['c']
        self.H = p.get('H_actual', p['H_target'])
        self.hv = float(self._sample(self.height, np.float32(self.V[0]), np.float32(self.V[1])))

    # ------------------------------------------------------------------ grid lookup
    def _sample(self, arr, x, y):
        gx = np.clip((x + self.half) / self.dx, 0.0, self.n - 1.001)
        gy = np.clip((y + self.half) / self.dx, 0.0, self.n - 1.001)
        j = gx.astype(np.int32)
        i = gy.astype(np.int32)
        fx = (gx - j).astype(np.float32)
        fy = (gy - i).astype(np.float32)
        a00 = arr[i, j]
        a01 = arr[i, j + 1]
        a10 = arr[i + 1, j]
        a11 = arr[i + 1, j + 1]
        return (a00 * (1 - fx) + a01 * fx) * (1 - fy) + (a10 * (1 - fx) + a11 * fx) * fy

    def surface(self, x, y):
        return self._sample(self.height, np.asarray(x, dtype=np.float32), np.asarray(y, dtype=np.float32))

    def lens_base(self, head):
        """Ghyben-Herzberg: the fresh water goes down 40 x head below sea level."""
        return -40.0 * head

    # ------------------------------------------------------------------ the evaluation
    def _eval(self, x, y, z, detail):
        x, y, z = np.broadcast_arrays(np.asarray(x, dtype=np.float32), np.asarray(y, dtype=np.float32), np.asarray(z, dtype=np.float32))
        shp = x.shape
        x = x.ravel()
        y = y.ravel()
        z = z.ravel()
        p = self.p
        Vx, Vy = self.V
        Cx, Cy = self.C1
        h = self._sample(self.height, x, y)
        hsh = self._sample(self.h_shield, x, y)
        ft = self._sample(self.flow, x, y)
        head = self._sample(self.head, x, y)
        solid = z <= h
        r = np.hypot(x - Cx, y - Cy)
        rv = np.hypot(x - Vx, y - Vy)
        wob = (0.5 * np.sin(x * 0.011 + z * 0.017) + 0.35 * np.sin(y * 0.013 - x * 0.007 + 1.7) + 0.25 * np.sin((x + y) * 0.021 + z * 0.03)).astype(np.float32)
        # ---- caldera block, ring fault dipping inward with depth
        below_floor = z < self.floor_lv
        r_ring = self.r_f0 - 0.18 * (self.floor_lv - z)
        inring = below_floor & (r < r_ring)
        zeff = z + self.dcol * inring
        u = hsh - zeff                                                      # depth below the old surface
        fill = inring & (u < 0.0)
        young = (z > hsh) | ((r < self.r_f0) & (z >= self.floor_lv) & (z > hsh - self.dc - 2.0))
        young = young & ~fill
        ub = np.maximum(h - z, 0.0)
        cf = np.exp(-(rv / (0.55 * self.Rc)) ** 2).astype(np.float32)
        # ---- old stack beds
        t_old = 6.0 + 8.0 * _sm(0.1 * self.Rc, 0.9 * self.Rc, rv)
        Tcore = 55.0 + 0.6 * np.maximum(hsh, 0.0)
        is_base = u > Tcore
        t_use = np.where(is_base, t_old * 1.8, t_old)
        v_old = (np.maximum(u, 0.0) + 2.4 * wob) / t_use
        bed_old = np.floor(v_old)
        frac_old = (v_old - bed_old).astype(np.float32)
        # ---- young pile beds (parallel to the present surface)
        t_y = 3.0 + 3.0 * _sm(0.0, 0.8 * self.Rc, rv)
        v_y = (ub + 1.4 * wob) / t_y
        bed_y = np.floor(v_y)
        frac_y = (v_y - bed_y).astype(np.float32)
        # ---- flat fill beds
        v_f = (self.floor_lv - z) / 3.5
        bed_f = np.floor(v_f)
        frac_f = (v_f - bed_f).astype(np.float32)
        bed = np.where(fill, bed_f, np.where(young, bed_y, bed_old))
        frac = np.where(fill, frac_f, np.where(young, frac_y, frac_old))
        u01 = _hash01(bed, 1.0) * np.where(fill, 1.0, 1.0)
        # types
        old_id = np.where(u01 < 0.62 - 0.30 * cf, LAVA, np.where(u01 < 0.84 - 0.08 * cf, ASH, SCORIA))
        young_id = np.where(u01 < 0.28 + 0.25 * (1 - cf), LAVA, np.where(u01 < 0.62 + 0.10 * (1 - cf), ASH, SCORIA))
        fill_id = np.where(u01 < 0.5, FILL, ASH)
        idv = np.where(fill, fill_id, np.where(young, young_id, np.where(is_base, BASEMENT, old_id))).astype(np.uint8)
        # ---- below the edifice: crust, sea-floor sediment
        sed = 3.0 + 12.0 * _sm(-30.0, -160.0, h)
        ang = np.arctan2(y - Cy, x - Cx)
        dang = np.abs((ang - p['phi_scar'] + math.pi) % (2 * math.pi) - math.pi)
        sed = sed + 9.0 * _sm(p['scar_half'] + 0.2, p['scar_half'] - 0.1, dang) * _sm(0.6 * self.rc, 1.3 * self.Rc, r)
        idv = np.where((h < 0.0) & (z > h - sed), SEDIMENT, idv).astype(np.uint8)
        idv = np.where(z < self.zc_top, CRUST, idv).astype(np.uint8)
        # ---- young lava flows and the soil strip on the surface
        idv = np.where(ft > 0.25, np.where(z > h - ft, LAVA_FLOW, idv), idv).astype(np.uint8)
        soil = (z > h - (1.0 + 0.6 * (wob + 1.0) * 0.5)) & (h > 0.3) & (ft < 0.25)
        idv = np.where(soil, SOIL, idv).astype(np.uint8)
        # ---- fresh-water lens (only inside rock under land)
        lens = (head > 0.01) & (z < np.minimum(head, h)) & (z > -40.0 * head) & (z > self.zc_top) & (h > 0.0)
        # ---- dikes and sills
        dike_hit = np.zeros(x.shape, dtype=np.int8)           # 0 none, 1 pale, 2 dark
        zr = self.ch['z']
        in_rock = solid & (z > self.ch_top - 6.0) & (z < h - 3.0)
        for k in self.p['dikes']:
            a = k['az']
            sa, ca = math.sin(a), math.cos(a)
            along = (x - Vx) * ca + (y - Vy) * sa
            d = -(x - Vx) * sa + (y - Vy) * ca - k['off'] + k['tilt'] * (z - zr)
            wk = 0.5 * k['w'] * (1.0 - 0.6 * np.minimum(np.abs(along) / k['L'], 1.0))
            m_ = in_rock & (np.abs(d) < wk) & (np.abs(along) < k['L'])
            dike_hit[m_] = 1 if k['light'] else 2
        for s_ in self.p['sills']:
            m_ = solid & (np.abs(z - s_['z']) < 0.5 * s_['t']) & (np.hypot(x - Vx - s_['cx'], y - Vy - s_['cy']) < s_['rs']) & (z < h - 8.0)
            dike_hit[m_] = 1
        # ---- hydrothermal halo above the chamber, round the conduit
        hyd = solid & (rv < 40.0 + 9.0 * wob) & (z > self.ch_top) & (z < h - 1.0) & (wob > -0.15)
        # ---- feeder conduit, deep feeder, chamber and its aureole
        cr = self.p['conduit_r'] * (1.0 + 0.15 * np.sin(z / 17.0) + 0.10 * np.sin(z / 7.0 + 1.0))
        z_mag_top = self.ch_top + 0.55 * (self.hv - self.ch_top)
        conduit = solid & (rv < cr) & (z > self.ch_top - 4.0)
        magma_c = conduit & (z < z_mag_top)
        feeder = (rv < 7.0 * (1.0 + 0.2 * np.sin(z / 11.0))) & (z < self.ch['z'] - self.ch['c'] + 3.0) & (z >= self.z0)
        ca_, sa_ = math.cos(self.ch['az']), math.sin(self.ch['az'])
        ex = ((x - Vx) * ca_ + (y - Vy) * sa_) / self.ch['a']
        ey = (-(x - Vx) * sa_ + (y - Vy) * ca_) / self.ch['b']
        ez = (z - self.ch['z']) / self.ch['c']
        q = ex * ex + ey * ey + ez * ez
        chamber = q < 1.0
        aureole = q < 1.35 ** 2
        out = idv
        out = np.where(lens & (out != SOIL), FRESH, out)
        out = np.where(dike_hit == 1, DIKE_LIGHT, np.where(dike_hit == 2, DIKE_DARK, out))
        out = np.where(hyd & (dike_hit == 0), HYDRO, out)
        out = np.where(aureole & (z < self.ch['z'] + self.ch['c'] * 1.4), CONTACT, out)
        out = np.where(conduit, CONDUIT, out)
        out = np.where(magma_c | feeder | chamber, MAGMA, out).astype(np.uint8)
        # ---- outside the solid
        out = np.where(solid, out, np.where(z <= 0.0, SEA, AIR)).astype(np.uint8)
        # solid below the window floor is crust
        if not detail:
            return out.reshape(shp)
        d = dict(id=out.reshape(shp), bed=bed.astype(np.int32).reshape(shp), frac=frac.reshape(shp),
                 lens=lens.reshape(shp), tide=(solid & (np.abs(z) < 0.9)).reshape(shp),
                 magma_core=(chamber & (q < 0.30)).reshape(shp), h=h.reshape(shp), kind=np.where(fill, 2, np.where(young, 1, 0)).astype(np.uint8).reshape(shp),
                 fault=(below_floor & (np.abs(r - r_ring) < 1.3) & (z > -70.0)).reshape(shp),
                 base=is_base.reshape(shp), layer=idv.reshape(shp))
        return d

    def rock(self, x, y, z):
        """Material id (uint8, see NAMES) at world coordinates; broadcastable inputs."""
        return self._eval(x, y, z, False)

    def detail(self, x, y, z):
        """dict: id, bed index, frac (0 = top of the bed), lens, tide flag, magma core, surface height, kind (0 old, 1 young, 2 fill), fault, base."""
        return self._eval(x, y, z, True)

    # ------------------------------------------------------------------ helpers for tests / the baker
    def column(self, x, y, z0=None, z1=None, step=0.5):
        z0 = self.z0 if z0 is None else z0
        z1 = (self.H + 10) if z1 is None else z1
        zs = np.arange(z0, z1, step, dtype=np.float32)
        return zs, self.rock(np.full_like(zs, x), np.full_like(zs, y), zs)


def from_world(w):
    return Volcano3D(w)


def params_to_json(w):
    """The JSON-able parameter dict of a province-D world (volcano params without numpy)."""
    import json
    p = dict(w.volcano)
    def conv(o):
        if isinstance(o, (np.floating,)):
            return float(o)
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        raise TypeError(type(o))
    return json.loads(json.dumps(p, default=conv))
