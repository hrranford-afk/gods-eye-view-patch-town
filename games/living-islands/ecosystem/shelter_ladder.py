# shelter_ladder: how many days a small starting colony needs to reach each rung of the shelter ladder, from the shore catch.
# Spec: research/FIRST_SHELTER_AND_MATERIALS.md section 9. Headless, python and numpy only, deterministic from the seed.
# Rungs: 1 camp lean-to, 2 turf-and-stone hut, 3 thatched cottage, 4 slate cottage. Every number below is TUNING unless stated;
# the building quantities are scaled from research/HOUSE_BILL_OF_MATERIALS.md types A and B, the catch from shore_catch.py.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import eco_common as C
import shore_catch as S

HORIZON_DAYS = 400
START_DOY = 105                 # TUNING: spring landing (a landing in autumn is the harder case, see the note)
PEOPLE = 6                      # TUNING: the small starting party
WORK_FRACTION = 0.7             # TUNING: share of a person-day left after water, fire, food and rest
STORM_WORK = 0.3                # TUNING: work done on a day with storm strength 4 or more
COMB_M_PER_PD = 250.0           # TUNING: metres of strandline one person combs in a day, picking only useful items
COMB_RECOVERY = 0.6             # TUNING: share of the useful arrivals on the combed stretch that is actually found
REACH_M = 600.0                 # TUNING: strandline within this of the landing counts as the home shore
# what the catch is made of, per 100 items (litter shares from collector_econ MAT_SHARE; wood is a TUNING guess, the biggest unknown)
WOOD_PER_100 = 8.0              # TUNING: usable spars or planks (driftwood, wreck timber) per 100 catch items
ROPE_CLOTH_PER_100 = 10.0       # 7 rope (MAT_SHARE) plus 3 cloth or net, TUNING
METAL_PER_100 = 4.0             # MAT_SHARE
GLASS_PER_100 = 6.0             # MAT_SHARE
KIT = dict(wood=0.0, rope=3.0, metal=0.0, glass=0.0)   # TUNING: a sail is worth 3 rope-and-cloth units; the axe is a labour speed-up, see AXE
AXE_WORK = 1.0                  # with the axe, wood is worked at full speed; without it labour on timber would be x0.6 (not modelled further)
# the ladder: materials in catch units, labour in person-days, trade = tender calls needed (slates, lime, nails, panes come by sea)
RUNGS = (
    dict(name='camp lean-to', wood=6, rope=4, metal=0, glass=0, labour=2, trade=0),
    dict(name='turf-and-stone hut', wood=14, rope=8, metal=0, glass=0, labour=45, trade=0),
    dict(name='thatched cottage', wood=22, rope=15, metal=0, glass=0, labour=130, trade=0),
    dict(name='slate cottage', wood=12, rope=6, metal=200, glass=12, labour=160, trade=3),
)
# collector and tender (collector_econ numbers, simplified)
COLLECTOR_ITEMS_MAX = 120.0
COLLECTOR_EFF = 0.5
COLLECTOR_REACH_LEN = 200.0
TENDER_INTERVAL = (8.0, 14.0)
TENDER_LATE = 0.25
TENDER_SKIP = 0.04
TENDER_MAX_ITEMS = 200.0        # 8 kg at 40 g
POLICIES = {
    'comb_heavy': dict(comb=0.6, collector=False),
    'build_heavy': dict(comb=0.2, collector=False),
    'collector_led': dict(comb=0.1, collector=True),
}


def _home_shore(segs, village):
    # the combable strandline near the landing, best first. Returns (segments, collector segment or None)
    if village is None:
        return [], None
    x, y = village['xy']
    ss = [s for s in segs if s['collectable'] and s['island'] == village['island'] and math.hypot(s['xy'][0] - x, s['xy'][1] - y) <= REACH_M]
    ss.sort(key=lambda s: (-s['rate_items_m_tide'], s['id']))
    col = None
    if village.get('collector_seg') is not None:
        col = next((s for s in segs if s['id'] == village['collector_seg']), None)
    return ss, col


def _tender_days(seed, horizon):
    r = C.rng_for(seed, 51)
    iv = TENDER_INTERVAL[0] + (TENDER_INTERVAL[1] - TENDER_INTERVAL[0]) * r.random()
    ph = 2 + 6 * r.random()
    r2 = C.rng_for(seed, 52)
    out, k, prev = [], 0, -10
    while ph + k * iv <= horizon:
        late = TENDER_LATE * k + 0.4 * r2.standard_normal()
        skip = r2.random() < TENDER_SKIP
        d = max(int(round(ph + k * iv + max(late, -1.0))), prev + 3)
        if not skip:
            out.append(d)
            prev = d
        k += 1
    return out


def _need_met(stock, rung, trade_calls):
    return min([stock[k] / rung[k] for k in ('wood', 'rope', 'metal', 'glass') if rung[k] > 0] + [1.0 if trade_calls >= rung['trade'] else 0.0])


def simulate(seed, policy, start_doy=START_DOY, people=PEOPLE, horizon=HORIZON_DAYS, _ctx=None):
    # returns dict(days=[day each rung finished or None], ...). Deterministic.
    if _ctx is None:
        w = C.load_world(seed)
        segs = S.build_shores(w, seed)
        village = S.choose_landing(w, segs, seed)
    else:
        segs, village = _ctx
    pol = POLICIES[policy] if isinstance(policy, str) else policy
    home, col = _home_shore(segs, village)
    storm = C.storm_schedule(seed, start_doy, horizon)
    tender = set(_tender_days(seed, horizon))
    stock = dict(KIT)
    hopper = 0.0
    calls = 0
    rung_i = 0
    progress = 0.0              # person-days spent on the current rung
    done = [None] * len(RUNGS)
    comb_pd_total = 0.0
    if not home:
        return dict(days=done, reason='no home shore', comb_pd=0.0)
    home_len = sum(s['length_m'] for s in home)
    for day in range(horizon):
        doy = start_doy + day
        st = float(storm[day])
        labour = people * WORK_FRACTION * (C.daylight_hours(doy) / 12.0) ** 0.5 * (STORM_WORK if st >= 4.0 else 1.0)
        rung = RUNGS[rung_i] if rung_i < len(RUNGS) else None
        # who combs: the policy share, or everyone when the build is blocked for lack of materials
        ready = _need_met(stock, rung, calls) if rung else 1.0
        blocked = rung is not None and (ready < 1.0 and progress >= ready * rung['labour'])
        comb_pd = labour if (blocked or rung is None) else labour * pol['comb']
        build_pd = labour - comb_pd
        # catch for the combing: best strandline first, limited by what arrives
        if comb_pd > 0:
            cover = comb_pd * COMB_M_PER_PD
            got = 0.0
            for s in home:
                m0, m1 = (S.tide_multiplier(seed, s['id'], day, t, start_doy, max(1.0, st)) for t in (0, 1))
                m = m0 + m1
                take = min(cover, s['length_m'])
                got += take * s['rate_items_m_tide'] * m * COMB_RECOVERY
                cover -= take
                if cover <= 0:
                    break
            stock['wood'] += got * WOOD_PER_100 / 100.0
            stock['rope'] += got * ROPE_CLOTH_PER_100 / 100.0
            stock['metal'] += got * METAL_PER_100 / 100.0
            stock['glass'] += got * GLASS_PER_100 / 100.0
            comb_pd_total += comb_pd
        # the collector works the home beach on its own (fills its hopper, up to the cap)
        if pol['collector'] and col is not None:
            sol = float(np.clip((C.daylight_hours(doy) - 5.0) / 12.0, 0.1, 1.0))
            m0, m1 = (S.tide_multiplier(seed, col['id'], day, t, start_doy, max(1.0, st)) for t in (0, 1))
            items = min(COLLECTOR_ITEMS_MAX * sol, COLLECTOR_EFF * col['rate_items_m_tide'] * min(col['length_m'], COLLECTOR_REACH_LEN) * (m0 + m1) * sol)
            hopper = min(TENDER_MAX_ITEMS, hopper + items)
        if day in tender:
            calls += 1
            if hopper > 0:
                stock['rope'] += hopper * ROPE_CLOTH_PER_100 / 100.0
                stock['metal'] += hopper * METAL_PER_100 / 100.0
                stock['glass'] += hopper * GLASS_PER_100 / 100.0
                stock['wood'] += hopper * WOOD_PER_100 / 100.0 * 0.0     # the hopper gets litter, not timber
                hopper = 0.0
        # build: progress is capped by the share of materials in hand
        if rung is not None and build_pd > 0:
            cap = _need_met(stock, rung, calls) * rung['labour']
            progress = min(progress + build_pd, cap)
            if progress >= rung['labour'] - 1e-9 and _need_met(stock, rung, calls) >= 1.0:
                for k in ('wood', 'rope', 'metal', 'glass'):
                    stock[k] -= rung[k]
                done[rung_i] = day + 1
                rung_i += 1
                progress = 0.0
    return dict(days=done, reason='ok', comb_pd=comb_pd_total, calls=calls, stock=stock, home_m=home_len)


def run_seeds(seeds, policies=None, **kw):
    out = {}
    for sd in seeds:
        w = C.load_world(sd)
        segs = S.build_shores(w, sd)
        village = S.choose_landing(w, segs, sd)
        out[sd] = {p: simulate(sd, p, _ctx=(segs, village), **kw) for p in (policies or POLICIES)}
    return out


def headline(res):
    # per policy and rung: share of seeds reaching it, median and p10/p90 of days among those that did
    pols = sorted({p for r in res.values() for p in r})
    rows = {}
    all_res = res
    res = {sd: r for sd, r in all_res.items() if all(v['reason'] == 'ok' for v in r.values())}     # seeds with no home shore are counted apart
    for p in pols:
        rows[p] = []
        for k in range(len(RUNGS)):
            d = [r[p]['days'][k] for r in res.values() if r[p]['days'][k] is not None]
            n = len(res)
            rows[p].append(dict(rung=RUNGS[k]['name'], reached=len(d) / n,
                                median=(float(np.median(d)) if d else None),
                                p10=(float(np.percentile(d, 10)) if d else None), p90=(float(np.percentile(d, 90)) if d else None)))
    rows['_no_home_shore'] = len(all_res) - len(res)
    rows['_with_home_shore'] = len(res)
    return rows


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', type=int, default=60)
    a = ap.parse_args(argv)
    res = run_seeds(range(1, a.seeds + 1))
    for p, rows in headline(res).items():
        if p.startswith('_'):
            print(p, rows)
            continue
        print(p)
        for r in rows:
            f = lambda v: '-' if v is None else '%.0f' % v
            print('  %-20s reached %3.0f%%  median %5s  p10 %5s  p90 %5s' % (r['rung'], 100 * r['reached'], f(r['median']), f(r['p10']), f(r['p90'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
