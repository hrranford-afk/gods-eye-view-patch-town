# level1/tide.py -- Python port of the page's tide (sky_clock.js, tide()), numpy only. Same five harmonics, same phase rules, same
# game window (level = clamp(h / 2.2, -1, 1) * 1.1 metres). level1/test_layout.py compares it with the JS file through node when node exists.
# Time: HOURS since the game epoch (a new moon at noon, hour 0). hours_for() gives the hour of a calendar date, as sky_clock.hoursFor does.
import math
import numpy as np

TAU = 2 * math.pi
DEG = math.pi / 180.0
SYNODIC = 29.530588
DOY0_MACRO = 290
TIDE_T0, SPRING_LAG_H = 5.5, 36.0
TIDE_HALF_RANGE, TIDE_WINDOW = 2.2, 1.1
# name, period h, speed deg/h, amplitude, phase deg
HARM = [('M2', 12.4206, 28.984104, 1.40, 0.0), ('S2', 12.0, 30.0, 0.50, (30.0 - 28.984104) * SPRING_LAG_H),
        ('N2', 12.6583, 28.43973, 0.28, 0.0), ('K1', 23.9345, 15.041069, 0.07, 0.0), ('O1', 25.8193, 13.943035, 0.06, 0.0)]


def raw(hours, doy0=DOY0_MACRO):
    # h in game metres of tide height before the clamp (vectorised over hours)
    hours = np.asarray(hours, dtype=np.float64)
    doy = doy0 + hours / 24.0
    eq = 1 + 0.04 * np.cos(4 * math.pi * (doy - 80) / 365)
    per = 1 + 0.03 * np.cos(TAU * hours / (27.55 * 24))
    h = np.zeros_like(hours)
    for i, (_, _, sp, a, ph) in enumerate(HARM):
        amp = a * (eq * per if i == 0 else eq if i == 1 else 1.0)
        h = h + amp * np.cos((sp * (hours - TIDE_T0) - ph) * DEG)
    return h


def level(hours, doy0=DOY0_MACRO):
    # the game's tide level in metres, -1.1 .. +1.1 (0 = mean sea level)
    return np.clip(raw(hours, doy0) / TIDE_HALF_RANGE, -1, 1) * TIDE_WINDOW


def moon_age(hours):
    return (np.asarray(hours, dtype=np.float64) / 24.0) % SYNODIC


def hours_for(doy, lst, moon_age_days=None, doy0=DOY0_MACRO):
    base = (doy - doy0) * 24 + lst - 12
    if moon_age_days is None:
        return base
    best, be = base, 1e9
    for n in range(700):
        h = base + n * 365 * 24
        a = float(moon_age(h))
        e = abs(((a - moon_age_days) % SYNODIC + 1.5 * SYNODIC) % SYNODIC - SYNODIC / 2)
        if e < be:
            be, best = e, h
    return best


# the first day of The Gift: calendar day 121, 05:00, moon age 9 days (gift_day.js sets cd=121, ch=5, cm=9)
GIFT_START_HOURS = hours_for(121, 5.0, 9.0)


def windows(thresh, h0, h1, step_min=1.0, below=True, doy0=DOY0_MACRO):
    # contiguous intervals [a, b] in hours where level <= thresh (below=True) or >= thresh, between h0 and h1
    t = np.arange(h0, h1, step_min / 60.0)
    lv = level(t, doy0)
    m = lv <= thresh if below else lv >= thresh
    if not m.any():
        return []
    d = np.diff(m.astype(np.int8))
    starts = list(np.nonzero(d == 1)[0] + 1)
    ends = list(np.nonzero(d == -1)[0] + 1)
    if m[0]:
        starts = [0] + starts
    if m[-1]:
        ends = ends + [len(t)]
    return [(float(t[s]), float(t[e - 1])) for s, e in zip(starts, ends)]


def clock_str(hours, start=GIFT_START_HOURS):
    # "day N hh:mm" counted from the first morning of the game (day 1, 05:00 = GIFT_START_HOURS)
    d = hours - (GIFT_START_HOURS - 5.0)
    day = int(d // 24) + 1
    m = int(round((d % 24) * 60))
    return 'day %d %02d:%02d' % (day, m // 60 % 24, m % 60)
