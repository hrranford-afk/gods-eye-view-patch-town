# Tests for the headless ecosystem package. Run:  python3 -m pytest ecosystem/tests -q   (or python3 ecosystem/tests/test_ecosystem.py)
# Short on purpose: a handful of seeds and 60 to 90 simulated days.
import glob
import json
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, PKG)
import numpy as np

import eco_common as C
import collector_econ as E
import run_all as R
import shore_catch as S
import wildlife_place as P

SEEDS = (1, 3, 5, 8)        # one gneiss, one sandstone, basalt seeds included on purpose (basalt has no beach)


def _base(seed):
    return E.build_base(seed)


def test_shore_catch_ranges_and_determinism():
    for sd in SEEDS:
        w = C.load_world(sd)
        a = S.build_shores(w, sd)
        b = S.build_shores(w, sd)
        assert json.dumps(a, sort_keys=True, default=float) == json.dumps(b, sort_keys=True, default=float)
        assert len(a) > 5
        for s in a:
            assert S.RATE_MIN <= s['rate_items_m_tide'] <= S.RATE_MAX
            assert 0.0 <= s['exposure'] <= 1.0
            assert s['length_m'] > 0 and 0.0 <= s['wrack_index'] <= 1.0
            assert s['klass'] in ('poor', 'normal', 'rich')
        isl = S.island_catch(a, w)
        assert sorted(d['rank'] for d in isl) == list(range(1, len(isl) + 1))


def test_catch_spread_between_seeds():
    rates = []
    for sd in (1, 3, 4, 6, 7, 9):
        w = C.load_world(sd)
        sm = S.seed_catch_summary(S.build_shores(w, sd))
        if sm['klass'] != 'none':
            rates.append(sm['best_rate'])
    assert max(rates) / min(rates) > 3.0        # some seeds are clearly richer than others


def test_tide_catch_deterministic_and_seasonal():
    seg = dict(id=7, rate_items_m_tide=1.0)
    a = S.tide_catch_rate(seg, 5, 10, 0, 60, 0.0)
    b = S.tide_catch_rate(seg, 5, 10, 0, 60, 0.0)
    assert a == b and a > 0
    # a storm multiplies the arrival
    assert S.tide_catch_rate(seg, 5, 10, 0, 60, 6.0) > 3 * a


def test_wildlife_ranges_and_determinism():
    for sd in SEEDS:
        w = C.load_world(sd)
        segs = S.build_shores(w, sd)
        v = S.choose_landing(w, segs, sd)
        a = P.place_wildlife(w, segs, v, sd)
        b = P.place_wildlife(w, segs, v, sd)
        assert json.dumps(a, sort_keys=True, default=float) == json.dumps(b, sort_keys=True, default=float)
        assert len(a['seal_sites']) <= P.HAUL_MAX_SITES
        for s in a['seal_sites']:
            assert 0 < s['capacity'] <= P.SEAL_CAP and 0.0 <= s['D'] <= 1.0 and 0.0 <= s['exposed_fraction'] <= 1.0
        assert a['otters']['otters'] >= 0 and 0.0 <= a['kelp']['fraction_of_near'] <= 1.0
        assert P.peak_seals(a, True) <= P.peak_seals(a, False)


def test_seals_leave_and_return():
    site = dict(capacity=100, kind='common', D=0.0, exposed_fraction=1.0)
    col = P.SealColony([site])
    assert P.seal_count(site, 7, col.fid[0]) == 100
    for _ in range(30):
        col.step([5.0])            # a pile well over the leave line
    assert col.ever_left[0] and col.present(7) <= 25
    for _ in range(120):
        col.step([0.1])            # cleared and quiet
    assert col.returned[0] and col.present(7) >= 60


def test_economy_deterministic_ranges_and_no_dead_end():
    base = _base(3)
    ctx = E.with_clock(base, 90, 60)
    for name, cls in E.POLICIES.items():
        a = E.run_sim(ctx, cls())
        b = E.run_sim(ctx, cls())
        assert json.dumps(a, sort_keys=True, default=float) == json.dumps(b, sort_keys=True, default=float)
        assert a['kg'] >= 0 and a['items'] >= 0 and a['built_kg'] >= 0 and a['pile_end_kg'] >= 0
        assert a['mispick_rate'] <= 0.08
        assert a['kg_per_day'] <= 25.0
    for f in (2, 5, 10):
        t = E.recovery_test(E.with_clock(base, 200, 60), f)
        assert t['passed'], t


def test_hopper_limits_the_yield():
    ctx = E.with_clock(_base(3), 90, 60)
    small = E.run_sim(ctx, E.Ignoring(), hopper_kg=E.HOPPER_KG)
    free = E.run_sim(ctx, E.Ignoring(), hopper_kg=1e6)
    assert free['kg'] >= small['kg']
    # per day the hopper never holds more than its capacity: every visit carries at most 4.5 kg
    assert small['pickup_kg_per_visit'] <= E.HOPPER_KG + 1e-9


def test_tender_timetable_drifts_late_and_is_ordered():
    ctx = E.with_clock(_base(4), 200, 60)
    tt = E.tender_timetable(ctx)
    days = [v['day'] for v in tt]
    assert days == sorted(days) and len(set(days)) == len(days)
    assert tt[-1]['late'] > tt[0]['late']
    assert E.tender_timetable(ctx) == tt


def test_idempotent_events():
    led = C.Ledger()
    assert led.claim('find:1:2:3:0') is True
    assert led.claim('find:1:2:3:0') is False
    assert len(led) == 1 and led.refused == 1
    ctx = E.with_clock(_base(3), 60, 60)
    led = C.Ledger()
    a = E.run_sim(ctx, E.Careful(), ledger=led)
    n = len(led)
    b = E.run_sim(ctx, E.Careful(), ledger=led)
    assert a['credited_items'] == a['items'] > 0
    assert b['credited_items'] == 0 and b['credited_kg'] == 0 and len(led) == n and b['ledger_refused'] > 0
    # a delivery key belongs to one visit only
    keys = [k for k in led.keys if k.startswith('delivery:')]
    assert len(keys) == len(set(keys))


def test_run_all_small_writes_only_to_out():
    with tempfile.TemporaryDirectory() as d:
        before = set(glob.glob(os.path.join(PKG, '**', '*'), recursive=True))
        rc = R.main(['--seeds', '2', '--days', '60', '--out', d])
        assert rc == 0
        assert os.path.exists(os.path.join(d, 'results.json')) and os.path.exists(os.path.join(d, 'REPORT.md'))
        res = json.load(open(os.path.join(d, 'results.json')))
        assert len(res['seeds']) == 2
        rep = open(os.path.join(d, 'REPORT.md')).read()
        assert 'Ecosystem test report' in rep
        after = set(glob.glob(os.path.join(PKG, '**', '*'), recursive=True))
        assert {p for p in after - before if not p.endswith('__pycache__') and '__pycache__' not in p} == set()


def _text_files():
    out = []
    for p in sorted(glob.glob(os.path.join(PKG, '*.py')) + glob.glob(os.path.join(PKG, '*.md')) + glob.glob(os.path.join(HERE, '*.py'))):
        out.append(p)
    return out


def test_no_forbidden_words_no_private_paths():
    pats = [re.compile(r'\b' + re.escape(w) + r'\b', re.I) for w in C.FORBIDDEN_WORDS]
    for p in _text_files():
        txt = open(p, encoding='utf-8').read()
        for w, pat in zip(C.FORBIDDEN_WORDS, pats):
            assert not pat.search(txt), '%s contains forbidden word %r' % (os.path.basename(p), w)
        for m in C.PRIVATE_MARKERS:
            assert m not in txt, '%s contains private marker %r' % (os.path.basename(p), m)
        if p.endswith('.py'):
            assert ('/' + '*') not in txt, 'python files use # comments only'


def test_no_network_imports():
    bad = ('socket', 'urllib', 'requests', 'http.client', 'subprocess')
    for p in glob.glob(os.path.join(PKG, '*.py')):
        txt = open(p, encoding='utf-8').read()
        for b in bad:
            assert not re.search(r'^\s*(import|from)\s+' + re.escape(b), txt, re.M), '%s imports %s' % (os.path.basename(p), b)


if __name__ == '__main__':
    fails = 0
    for name, fn in sorted(globals().items()):
        if name.startswith('test_') and callable(fn):
            try:
                fn()
                print('ok  ', name)
            except Exception as e:
                fails += 1
                print('FAIL', name, repr(e))
    sys.exit(1 if fails else 0)
