# Tests for ecosystem/shelter_ladder.py. Run: python3 -m pytest tests/test_shelter_ladder.py -q  (or python3 tests/test_shelter_ladder.py)
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'ecosystem'))
import shelter_ladder as L
import eco_common as C

SEEDS = (1, 3, 4, 2)        # 2 is a basalt seed with no beach on purpose


def test_deterministic():
    a = L.run_seeds(SEEDS)
    b = L.run_seeds(SEEDS)
    assert json.dumps(a, sort_keys=True, default=float) == json.dumps(b, sort_keys=True, default=float)


def test_rungs_in_order_and_policies_present():
    res = L.run_seeds((1, 3))
    for sd, r in res.items():
        assert set(r) == set(L.POLICIES)
        for p, o in r.items():
            d = [x for x in o['days'] if x is not None]
            assert d == sorted(d) and len(set(d)) == len(d)
            assert o['days'][0] is not None and o['days'][0] <= 10      # a lean-to goes up within days on a shore
            assert all(x is None or 1 <= x <= L.HORIZON_DAYS for x in o['days'])


def test_no_beach_is_reported_not_crashed():
    r = L.run_seeds((2,))[2]
    assert all(o['reason'] == 'no home shore' and all(x is None for x in o['days']) for o in r.values())
    h = L.headline(L.run_seeds((1, 2)))
    assert h['_no_home_shore'] == 1 and h['_with_home_shore'] == 1


def test_more_people_is_never_slower():
    ctx = L.run_seeds((1,), ['build_heavy'])
    few = L.simulate(1, 'build_heavy', people=4)['days']
    many = L.simulate(1, 'build_heavy', people=8)['days']
    for a, b in zip(few, many):
        assert b is not None and (a is None or b <= a)


def test_no_private_paths_or_brands_in_source():
    src = open(os.path.join(os.path.dirname(HERE), 'ecosystem', 'shelter_ladder.py')).read()
    for m in C.PRIVATE_MARKERS:
        assert m not in src


if __name__ == '__main__':
    for k, f in list(globals().items()):
        if k.startswith('test_'):
            f()
            print('ok', k)
