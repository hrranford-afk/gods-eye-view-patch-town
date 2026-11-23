# Shared helpers for the headless ecosystem test: paths, seeded randomness, world loading,
# the event ledger (idempotent keys) and the season / tide / storm clocks.
# Every number tagged TUNING is a design choice, not a measurement (see ECOSYSTEM_TEST.md).
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LANDFORM = os.path.join(os.path.dirname(HERE), 'landform')
if LANDFORM not in sys.path:
    sys.path.insert(0, LANDFORM)

PROVINCES = ('A', 'B', 'C')          # gneiss, sandstone, basalt (province D is the cutaway block, not used here)
MID_TIDE_AMP = 1.1                   # metres, same window as landform/world.py TIDE_AMP
DOY0_MACRO = 290                     # TUNING: macro_sea.js starts at mid October (storm season)


def province_for_seed(seed):
    return PROVINCES[int(seed) % 3]


def rng_for(*key):
    # one independent deterministic stream per key tuple (ints only)
    return np.random.default_rng([int(k) & 0x7FFFFFFF for k in key])


_WORLD_CACHE = {}


def load_world(seed, province=None):
    import world as W                # landform/world.py
    prov = province or province_for_seed(seed)
    k = (int(seed), prov)
    if k not in _WORLD_CACHE:
        if len(_WORLD_CACHE) > 8:
            _WORLD_CACHE.clear()
        _WORLD_CACHE[k] = W.make_world(int(seed), prov)
    return _WORLD_CACHE[k]


class Ledger:
    # every find, delivery and empty is one event with an idempotent key: claimed once, ever
    def __init__(self):
        self.keys = set()
        self.refused = 0

    def claim(self, key):
        if key in self.keys:
            self.refused += 1
            return False
        self.keys.add(key)
        return True

    def __len__(self):
        return len(self.keys)


# ---- clocks (python re-implementation of the shape of macro_sea.js, not its numbers) ----------
def season_w(doy):
    # 1 at mid January (storm and wrack season), 0 at mid July. Same shape as macro_sea.js seasonW.
    return 0.5 + 0.5 * math.cos(2 * math.pi * (doy - 15) / 365.0)


def springness(day):
    # 1 near new and full moon, 0 near the quarters (synodic month 29.53 d, phase origin TUNING)
    ph = (day % 29.53) / 29.53
    return 0.5 + 0.5 * math.cos(4 * math.pi * ph)


def daylight_hours(doy):
    # about 58 degrees north (TUNING latitude): 6.5 h midwinter, 17.5 h midsummer
    return 12.0 + 5.5 * math.sin(2 * math.pi * (doy - 80) / 365.0)


def month_of(doy):
    return int(((doy % 365) / 365.0) * 12) % 12      # 0 = January


def storm_schedule(seed, start_doy, days):
    # storms come in 48 h slots (as macro_sea.js STORM_SLOT_H). Chance by season is TUNING.
    # returns an array of per-day storm strength (0 = calm, 3..10 = catch multiplier at the peak day)
    out = np.zeros(days + 4)
    r = rng_for(seed, 9001)
    for k in range((days + 4) // 2 + 1):
        doy = start_doy + 2 * k
        p = 0.10 + 0.40 * season_w(doy)             # TUNING: about 1 storm in 4 slots in winter, 1 in 10 in summer
        u = r.random(3)
        if u[0] < p:
            peak = 3.0 + 7.0 * u[1] ** 1.5           # catch spike 3 to 10 times (BEACH_COLLECTOR section 5)
            d0 = 2 * k
            for j, f in enumerate((1.0, 0.6, 0.25)):
                if d0 + j < len(out):
                    out[d0 + j] = max(out[d0 + j], peak * f)
    return out


FORBIDDEN_WORDS = (
    # real places and bodies, brands, and anything graphic: kept out of every code and doc file here
    'scot' + 'land', 'scot' + 'tish', 'heb' + 'rid', 'shet' + 'land', 'ork' + 'ney', 'os' + 'par', 'nature' + 'scot',
    'rs' + 'pb', 'jn' + 'cc', 'ire' + 'land', 'wal' + 'es', 'eng' + 'land', 'ice' + 'land', 'nor' + 'way', 'ama' + 'zon',
    'goo' + 'gle', 'micro' + 'soft', 'ap' + 'ple', 'te' + 'sla', 'be' + 'bot', 'sand ' + 'man', 'ki' + 'll', 'cu' + 'll',
    'slaugh' + 'ter', 'cor' + 'pse', 'bl' + 'ood', 'gh' + 'ost', 'sur' + 'veil',
)
PRIVATE_MARKERS = ('/ho' + 'me/', '/ro' + 'ot/', '/Us' + 'ers/', 'C:' + '\\', 'cla' + 'ude.ai', 'ses' + 'sion_', 'api' + '_key', 'pass' + 'word')
