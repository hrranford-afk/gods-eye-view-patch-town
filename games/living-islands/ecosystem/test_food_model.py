# Tests for food_model.py. Run:  python3 -m pytest ecosystem/test_food_model.py -q   (or python3 ecosystem/test_food_model.py)
# They check the shape of the trade-offs (no strategy wins everything, each has a failure mode), not exact numbers.
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np

import eco_common as C
import food_model as F

SEEDS = range(1, 61)
_CACHE = {}


def _res():
    if 'r' not in _CACHE:
        _CACHE['r'] = F.simulate(SEEDS)
    return _CACHE['r']


def _sum(sc):
    return {s: F.summarize(v) for s, v in _res()[sc].items()}


def test_sixty_seeds_eight_strategies():
    r = _res()
    assert set(r) == {'spring', 'autumn', 'long', 'village'}
    for sc in r:
        assert set(r[sc]) == set(F.NAMES) and len(F.NAMES) == 8
        assert all(len(v) == 60 for v in r[sc].values())


def test_deterministic():
    a = F.run(7, 'mixed', 105, 120)
    b = F.run(7, 'mixed', 105, 120)
    assert a == b
    assert F.run(8, 'mixed', 105, 120) != a


def test_numbers_are_sane():
    for sc, per in _res().items():
        for s, runs in per.items():
            for r in runs:
                assert 0.0 <= r['S_end'] <= 1.0 and 0.0 <= r['S_min'] <= 1.0
                assert 0.2 <= r['seal_T'] <= 1.0 and 0.05 <= r['colony'] <= 1.0
                assert 0 <= r['people'] <= F.SCENARIOS[sc][2] and r['lost'] >= 0
                assert 0.0 <= r['eaten_share'] <= 1.0001 and r['stock_end'] >= -1e-6


def test_no_single_strategy_wins_everything():
    m = _sum('spring')
    # lower is better for fail share, higher for the others
    best = {
        'fail': {s for s in m if m[s]['fail_rate'] <= min(x['fail_rate'] for x in m.values()) + 1e-9},
        'shoal': {s for s in m if m[s]['S_end'] >= max(x['S_end'] for x in m.values()) - 0.02},
        'seals': {s for s in m if m[s]['seal_T'] >= max(x['seal_T'] for x in m.values()) - 0.02},
        'build': {s for s in m if m[s]['build_h'] >= max(x['build_h'] for x in m.values()) * 0.97},
        'colony': {s for s in m if m[s]['colony'] >= max(x['colony'] for x in m.values()) - 0.02},
    }
    assert not set.intersection(*best.values()), best
    # the strategy that feeds people best is not the one that keeps the shoal fullest
    assert best['fail'] != best['shoal'] and not (best['fail'] & best['shoal'])


def test_pareto_front_is_wide():
    # no strategy is beaten on every one of: fewer failures, fuller shoal, more seal trust, more building time
    m = _sum('spring')
    keys = (lambda x: -x['fail_rate'], lambda x: x['S_end'], lambda x: x['seal_T'], lambda x: x['build_h'])
    front = []
    for s in m:
        dominated = any(all(k(m[o]) >= k(m[s]) - 1e-9 for k in keys) and any(k(m[o]) > k(m[s]) + 1e-9 for k in keys) for o in m if o != s)
        if not dominated:
            front.append(s)
    assert len(front) >= 4, front


def test_each_strategy_has_a_failure_mode():
    # a scenario where at least a quarter of seeds fail, with the named cause among the causes
    want = {
        'shore': ('spring', 'hunger'),      # the rocks cannot feed a party alone
        'line': ('autumn', 'hunger'),       # short days, storms and thin winter shoals
        'nets': ('long', 'seals'),          # nets are cheap effort and seals mind them
        'garden': ('spring', 'hunger'),     # the gap before the first harvest
        'eggs': ('spring', 'colony'),       # the colony takes the hit
        'trader': ('autumn', 'seals'),      # packaging litter drives seals away
        'scav': ('spring', 'hunger'),       # the wreck runs out
        'mixed': ('village', 'shoal'),      # many mouths, one sea
    }
    for s, (sc, why) in want.items():
        m = _sum(sc)[s]
        assert m['fail_rate'] >= 0.25, (s, sc, m['fail_rate'])
        assert m['reasons'].get(why, 0) >= 15, (s, sc, why, m['reasons'])


def test_failure_causes_differ():
    causes = set()
    for sc in ('spring', 'autumn', 'long', 'village'):
        for s, m in _sum(sc).items():
            for k, v in m['reasons'].items():
                if v >= 15:
                    causes.add(k)
    assert causes == {'hunger', 'shoal', 'seals', 'colony'}


def test_mixed_is_best_to_eat_but_not_free_and_not_safe():
    sp, lg, vl = _sum('spring'), _sum('long'), _sum('village')
    assert sp['mixed']['fail_rate'] <= min(x['fail_rate'] for x in sp.values()) + 1e-9
    # but it builds less than the one-route fisher (labour goes to many chores), and it still fails in a long or crowded run
    assert sp['mixed']['build_h'] < max(x['build_h'] for x in sp.values())
    assert lg['mixed']['fail_rate'] >= 0.15 and vl['mixed']['fail_rate'] >= 0.15


def test_eggs_are_a_treat_not_a_staple_and_greedy_eggs_hurt_the_colony():
    m = _sum('spring')
    assert m['eggs']['colony'] < 0.7                      # taking nearly every clutch breaks the colony
    assert m['mixed']['colony'] >= 0.99                   # the safe quarter does not
    assert F.EGG_SAFE * F.EGGS_STOCK * F.EGG_KCAL < 2 * F.KCAL_PER_PERSON * F.PEOPLE   # the safe harvest is under two days of food


def test_fish_hurt_the_shoal_only_when_effort_is_big():
    sp, vl = _sum('spring'), _sum('village')
    assert sp['line']['S_min'] > 0.3 and sp['nets']['S_min'] > 0.3     # four settlers cannot empty the inshore
    assert vl['nets']['S_min'] < 0.25 and vl['line']['S_end'] < sp['line']['S_end'] - 0.15


def test_gardens_are_an_investment():
    sp, lg = _sum('spring'), _sum('long')
    assert sp['garden']['fail_rate'] >= 0.3               # the gap before the first harvest
    # staple bed ready in 105 days: nothing in the stock before that, a garden is planted in the window
    r = F.run(3, 'garden', 105, 200)
    assert r['beds'] >= F.FOUND_BEDS


def test_hunger_is_gentle():
    # nobody is lost in the first 20 days of any run, and the loss rule needs a long, deep hunger
    for s in F.NAMES:
        for seed in range(1, 11):
            assert F.run(seed, s, 270, 20)['lost'] == 0
    assert F.LOSS_AFTER >= 15 and F.STAGES[2] >= 0.6


def test_rain_arithmetic():
    # 1 mm on 1 m2 with a 0.8 roof is 0.8 litre; a camp tarp gives drinking water, not washing water
    assert abs(1.0 * 1.0 * F.CATCH_COEF - 0.8) < 1e-9
    mean_mm = (np.mean(F.RAIN_P) * F.RAIN_MM_WET)
    litres_tarp = mean_mm * F.TARP_M2 * F.CATCH_COEF
    assert litres_tarp < F.WATER_NEED_L * F.PEOPLE         # a tarp alone is short
    assert mean_mm * F.ROOF_M2[-1][1] * F.CATCH_COEF > F.WATER_NEED_L * F.PEOPLE    # a cottage roof is enough


def test_no_real_names_or_private_paths_in_new_files():
    for fn in ('food_model.py', 'test_food_model.py', 'FOOD_MODEL.md'):
        p = os.path.join(HERE, fn)
        if not os.path.exists(p):
            continue
        t = open(p).read().lower()
        for w in C.FORBIDDEN_WORDS + C.PRIVATE_MARKERS:
            if fn == 'test_food_model.py':
                continue    # this file names the lists, not the words
            assert w.lower() not in t, (fn, w)


if __name__ == '__main__':
    import traceback
    fails = 0
    for name, fn in sorted(globals().items()):
        if name.startswith('test_') and callable(fn):
            try:
                fn()
                print('ok  ', name)
            except Exception:
                fails += 1
                print('FAIL', name)
                traceback.print_exc()
    sys.exit(1 if fails else 0)
