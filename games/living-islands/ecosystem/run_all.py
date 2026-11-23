# run_all: runs N world seeds x 3 player policies for a simulated 200 days (two calendars), plus the over-delivery recovery
# tests, and writes results.json and a short REPORT.md to an output folder. No network, no screen, python3 plus numpy only.
#   python3 run_all.py [--seeds 60] [--days 200] [--out DIR] [--first-seed 1]
# It writes only inside the output folder (default: ecosystem/out next to this file).
import argparse
import hashlib
import json
import os
import statistics
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import eco_common as C
import collector_econ as E
import wildlife_place as P
import shore_catch as S

STARTS = (('spring', 60), ('winter', C.DOY0_MACRO))       # day of year at day 0: early March, mid October (macro_sea.js start)
STRESS = (2, 5, 10)


def clean(o):
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.floating,)):
        return round(float(o), 4)
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    return o


def seed_record(seed, days):
    base = E.build_base(seed)
    wl = base['wl']
    rec = dict(seed=seed, province=base['province'], has_landing=base['village'] is not None,
               catch=base['catch'], islands=base['isl'][:6],
               landing=(dict(island=base['village']['island'], kind=base['village']['kind'], frontage_m=base['village']['frontage_m'],
                             has_collector_shore=base['village']['collector_seg'] is not None) if base['village'] else None),
               seals=dict(sites=len(wl['seal_sites']), candidates=wl['n_haul_candidates'],
                          capacity=sum(s['capacity'] for s in wl['seal_sites']),
                          peak_undisturbed=P.peak_seals(wl, False), peak_with_village=P.peak_seals(wl, True),
                          usable_sites=sum(1 for s in wl['seal_sites'] if s['usable']),
                          sites_within_150m_of_lane_or_houses=sum(1 for s in wl['seal_sites'] if s['D'] > 0.0)),
               birds=dict(ledge_m=round(wl['birds']['ledge_m'], 1), colonies=len(wl['birds']['colonies']),
                          puffin_turf_m2=round(wl['birds']['puffin_turf_m2'], 0),
                          peak_pairs=max(P.bird_pairs(wl, m) for m in range(12))),
               otters=wl['otters'], kelp=dict(fraction_of_near=wl['kelp']['fraction_of_near'], beds=wl['kelp']['n_beds'],
                                              bands=wl['kelp']['bands']),
               runs={})
    for label, sd in STARTS:
        ctx = E.with_clock(base, days, sd)
        runs = {}
        for name, cls in E.POLICIES.items():
            runs[name] = E.run_sim(ctx, cls())
        free = E.run_sim(ctx, E.Ignoring(), hopper_kg=1e6)
        runs['free_run'] = dict(kg_per_day=free['kg_per_day'], items_per_tide=free['items_per_tide'], work_h_per_day=free['work_h_per_day'],
                                kg_by_month=free['kg_by_month'], mat_kg=free['mat_kg'], stuck=free['stuck'], storm_park_days=free['storm_park_days'],
                                collector_class=free['collector_class'], mispick_rate=free['mispick_rate'])
        runs['stress'] = {str(f): E.recovery_test(ctx, f) for f in STRESS}
        rec['runs'][label] = runs
    return rec


def pct(a, q):
    return float(np.percentile(a, q)) if len(a) else 0.0


def build_report(recs, meta):
    L = []
    n = len(recs)
    L.append('# Ecosystem test report')
    L.append('')
    L.append('%d world seeds (first %d), %d simulated days, two calendars (spring start day %d, winter start day %d). Same seeds give the same numbers; '
             'every number here is a design number unless ECOSYSTEM_TEST.md says otherwise.' % (n, meta['first_seed'], meta['days'], STARTS[0][1], STARTS[1][1]))
    L.append('')
    # --- catch
    cls = {k: [r for r in recs if r['catch']['klass'] == k] for k in ('none', 'poor', 'normal', 'rich')}
    best = [r['catch']['best_rate'] for r in recs if r['catch']['klass'] != 'none']
    lw = [r['catch']['length_weighted_rate'] for r in recs if r['catch']['klass'] != 'none']
    L.append('## 1. Shore catch: rich and poor seeds')
    L.append('')
    L.append('Best collectable strandline per seed, items per metre per tide (anchors: poor 0.2, normal 1, rich 5).')
    L.append('')
    L.append('| class | seeds | share |')
    L.append('|---|---|---|')
    for k in ('rich', 'normal', 'poor', 'none'):
        L.append('| %s | %d | %d%% |' % (k, len(cls[k]), round(100 * len(cls[k]) / n)))
    L.append('')
    L.append('Best rate: min %.2f, p25 %.2f, median %.2f, p75 %.2f, max %.2f (spread max/min about %.0fx). Length-weighted rate over all collectable shore: median %.2f.' % (
        min(best), pct(best, 25), pct(best, 50), pct(best, 75), max(best), max(best) / max(min(best), 1e-6), pct(lw, 50)))
    L.append('')
    L.append('| province | seeds | with a collectable strandline | median best rate | median collectable shore (m) |')
    L.append('|---|---|---|---|---|')
    for pv, nm in (('A', 'gneiss'), ('B', 'sandstone'), ('C', 'basalt')):
        rs = [r for r in recs if r['province'] == pv]
        if not rs:
            continue
        ok = [r for r in rs if r['catch']['klass'] != 'none']
        L.append('| %s (%s) | %d | %d | %.2f | %.0f |' % (pv, nm, len(rs), len(ok), pct([r['catch']['best_rate'] for r in ok], 50) if ok else 0.0,
                                                       pct([r['catch']['collectable_m'] for r in rs], 50)))
    L.append('')
    shares = []
    for r in recs:
        tot = sum(i['items_per_tide'] for i in r['islands'])
        if tot > 0:
            shares.append(100.0 * max(i['items_per_tide'] for i in r['islands']) / tot)
    L.append('Within a world the richest of the six biggest islands carries a median of %.0f percent of that group\'s drift catch (range %.0f to %.0f), so a seed has one rich island and several poor ones.' % (
        pct(shares, 50), min(shares) if shares else 0, max(shares) if shares else 0))
    L.append('')
    # --- wildlife
    L.append('## 2. Wildlife per seed')
    L.append('')
    sc = [r['seals']['sites'] for r in recs]
    pk = [r['seals']['peak_undisturbed'] for r in recs]
    pw = [r['seals']['peak_with_village'] for r in recs]
    L.append('| thing | min | median | max | research target |')
    L.append('|---|---|---|---|---|')
    L.append('| seal haul-outs kept (top 12) | %d | %d | %d | 3 to 12 per group |' % (min(sc), pct(sc, 50), max(sc)))
    L.append('| haul-out candidates found | %d | %d | %d | |' % (min(r['seals']['candidates'] for r in recs), pct([r['seals']['candidates'] for r in recs], 50), max(r['seals']['candidates'] for r in recs)))
    L.append('| peak seals ashore, no village | %d | %d | %d | group sizes 5 to 150 per haul-out |' % (min(pk), pct(pk, 50), max(pk)))
    L.append('| peak seals ashore, with village and boat lane | %d | %d | %d | 20 to 60 percent of haul-outs within 150 m |' % (min(pw), pct(pw, 50), max(pw)))
    pd = [100.0 * r['seals']['sites_within_150m_of_lane_or_houses'] / max(1, r['seals']['sites']) for r in recs]
    L.append('| haul-outs within 150 m of lane or houses, percent | %.0f | %.0f | %.0f | 20 to 60 |' % (min(pd), pct(pd, 50), max(pd)))
    ld = [r['birds']['ledge_m'] for r in recs]
    L.append('| cliff ledge length (m) | %.0f | %.0f | %.0f | 100 to 3,000 (real); window is 512 m |' % (min(ld), pct(ld, 50), max(ld)))
    L.append('| skerry bird colonies | %d | %d | %d | 2 to 8 |' % (min(r['birds']['colonies'] for r in recs), pct([r['birds']['colonies'] for r in recs], 50), max(r['birds']['colonies'] for r in recs)))
    L.append('| peak seabird pairs | %d | %d | %d | |' % (min(r['birds']['peak_pairs'] for r in recs), pct([r['birds']['peak_pairs'] for r in recs], 50), max(r['birds']['peak_pairs'] for r in recs)))
    L.append('| otters (shore with fresh water) | %d | %d | %d | about 1 per 1.1 km |' % (min(r['otters']['otters'] for r in recs), pct([r['otters']['otters'] for r in recs], 50), max(r['otters']['otters'] for r in recs)))
    kf = [100 * r['kelp']['fraction_of_near'] for r in recs]
    L.append('| kelp share of near-shore cells, percent | %.0f | %.0f | %.0f | 15 to 40 |' % (min(kf), pct(kf, 50), max(kf)))
    L.append('')
    zero = [r['seed'] for r in recs if r['seals']['sites'] == 0]
    L.append('Seeds with no seal haul-out at all: %s.' % (', '.join(map(str, zero)) if zero else 'none'))
    L.append('')
    # --- collector
    for label, sd in STARTS:
        runs = [(r, r['runs'][label]) for r in recs]
        L.append('## 3%s. Collector and tender, %s start' % ('a' if label == 'spring' else 'b', label))
        L.append('')
        L.append('Yields use the "ignoring" run (the player never orders, so the hopper empties only when the tender calls). Free-run means a hopper that never fills: what supply and daylight allow.')
        L.append('')
        L.append('| shore class | seeds | kg/day (4.5 kg hopper) | kg/day (free-run) | target kg/day | fills/week | days waiting full | kg/visit to stockpile | empty calls | tender lateness at end (days) |')
        L.append('|---|---|---|---|---|---|---|---|---|---|')
        tg = dict(poor='0.1 to 0.3', normal='1 to 2', rich='4 to 8')
        for k in ('poor', 'normal', 'rich'):
            rr = [(r, ru) for r, ru in runs if ru['ignoring']['collector_class'] == k]
            if not rr:
                continue
            ig = [ru['ignoring'] for r, ru in rr]
            fr = [ru['free_run'] for r, ru in rr]
            L.append('| %s | %d | %.2f | %.2f | %s | %.2f | %d | %.1f | %.1f | %.1f |' % (
                k, len(rr), statistics.mean(i['kg_per_day'] for i in ig), statistics.mean(f['kg_per_day'] for f in fr), tg[k],
                statistics.mean(i['fills_per_week'] for i in ig), statistics.mean(i['full_wait_days'] for i in ig),
                statistics.mean(i['pickup_kg_per_visit'] for i in ig), statistics.mean(i['empty_calls'] for i in ig),
                statistics.mean(i['tender_lateness_days_last'] for i in ig)))
        nc = sum(1 for r, ru in runs if ru['ignoring']['collector_class'] == 'none')
        L.append('')
        L.append('Seeds with no collector shore (no sand or gentle ledge near the landing): %d. Mis-pick rate across all runs: %.3f (limit 0.03). Items gathered per tide, all seeds with a collector: median %.1f.' % (
            nc, statistics.mean(ru['ignoring']['mispick_rate'] for r, ru in runs if ru['ignoring']['has_collector']) if nc < n else 0.0,
            pct([ru['ignoring']['items_per_tide'] for r, ru in runs if ru['ignoring']['has_collector']], 50)))
        L.append('')
    # --- policies
    for label, sd in STARTS:
        L.append('## 4%s. Three player policies, %s start' % ('a' if label == 'spring' else 'b', label))
        L.append('')
        L.append('| policy | seeds | stable village at end | had a harm episode | recovered | still in harm at end | seal sites that left | sites back | peak litter load (kg/m, median / max) | people unwell (person-days, median / max) | built kg (median) | thriving |')
        L.append('|---|---|---|---|---|---|---|---|---|---|---|---|')
        for pol in ('careful', 'greedy', 'ignoring'):
            rr = [r['runs'][label][pol] for r in recs]
            L.append('| %s | %d | %d | %d | %d | %d | %d | %d | %.2f / %.2f | %.0f / %.0f | %.0f | %d |' % (
                pol, len(rr), sum(x['stable'] for x in rr), sum(x['had_harm'] for x in rr), sum(x['recovered'] for x in rr),
                sum(x['stuck_in_harm'] for x in rr), sum(x['sites_ever_left'] for x in rr), sum(x['sites_returned'] for x in rr),
                pct([x['peak_load_kg_m'] for x in rr], 50), max(x['peak_load_kg_m'] for x in rr),
                pct([x['ill_person_days'] for x in rr], 50), max(x['ill_person_days'] for x in rr),
                pct([x['built_kg'] for x in rr], 50), sum(x['thriving'] for x in rr)))
        L.append('')
    # --- stress
    L.append('## 5. Over-delivery and recovery (tender delivers 2x, 5x, 10x the normal 4 kg a visit for 60 days, then deliveries stop and the village clears by hand)')
    L.append('')
    L.append('Pass = the litter load is back under the seal leave line (%.1f kg/m) within 30 days of stopping, with no reset. "Comfort" is the line seals need before they trust the shore again (%.1f kg/m).' % (P.LEAVE_KG_PER_M, P.STAY_KG_PER_M))
    L.append('')
    L.append('| calendar | factor | seeds with a landing | passed | load went over the leave line | worst days to under the line | worst days to seal comfort | seeds where seals left | sites back by day 200 / sites that left |')
    L.append('|---|---|---|---|---|---|---|---|---|')
    fails = []
    for label, sd in STARTS:
        for f in STRESS:
            tt = [r['runs'][label]['stress'][str(f)] for r in recs if r['has_landing']]
            ex = [t for t in tt if t['exceeded_leave_line']]
            dd = [t['days_to_below_threshold'] for t in ex if t['days_to_below_threshold'] is not None]
            dc = [t['days_to_seal_comfort'] for t in ex if t['days_to_seal_comfort'] is not None]
            lost = sum(t['seal_sites_left'] for t in tt)
            back = sum(t['seal_sites_returned'] for t in tt)
            L.append('| %s | %dx | %d | %d | %d | %s | %s | %d | %d / %d |' % (
                label, f, len(tt), sum(t['passed'] for t in tt), len(ex), max(dd) if dd else '-', max(dc) if dc else '-',
                sum(1 for t in tt if t['seal_sites_left'] > 0), back, lost))
            for t in tt:
                if not t['passed']:
                    fails.append((label, f, t['seed']))
    L.append('')
    # --- impossible
    L.append('## 6. Any case where recovery is impossible?')
    L.append('')
    pf = []
    mid = []
    for r in recs:
        for label, sd in STARTS:
            for pol in ('careful', 'greedy', 'ignoring'):
                x = r['runs'][label][pol]
                if x['stuck_in_harm']:
                    nd = x.get('notice_day')
                    if nd is not None and x['days'] - (nd + 14) < 30:
                        mid.append((r['seed'], label, pol, x['days'] - (nd + 14)))
                    else:
                        pf.append((r['seed'], label, pol, x['harm_days'], x['peak_load_kg_m']))
    if fails:
        L.append('Stress tests that did NOT recover within 30 days: %s.' % '; '.join('seed %d (%s, %dx)' % (s, lb, f) for lb, f, s in fails))
    else:
        L.append('No stress test failed: every seed with a landing returned under the leave line within 30 days of stopping deliveries, at 2x, 5x and 10x, in both calendars.')
    L.append('')
    if mid:
        L.append('Policy runs still in harm when the 200 days ended because the village had not yet had 30 days of recovery effort (a negative number means it had not yet noticed or started; not a dead end): %s.' % '; '.join('seed %d %s %s (clearing for %d days)' % x for x in mid[:20]))
        L.append('')
    if pf:
        L.append('Policy runs ending in harm with 30 or more days of recovery effort (or none possible): %s.' % '; '.join('seed %d %s %s (harm days %d, peak load %.2f)' % x for x in pf[:20]))
    else:
        L.append('No policy run ended in harm after a full 30 days of recovery effort.')
    nl = [r['seed'] for r in recs if not r['has_landing']]
    L.append('')
    L.append('Worlds with no landing at all (tender cannot call, nothing is delivered, not a dead end but a different game): %s.' % (', '.join(map(str, nl)) if nl else 'none'))
    nocol = [r['seed'] for r in recs if r['has_landing'] and not r['landing']['has_collector_shore']]
    L.append('')
    L.append('Worlds with a landing but no strandline the collector can work (deliveries only, no beach income): %d of %d.' % (len(nocol), n))
    L.append('')
    # --- checks
    L.append('## 7. Side checks')
    L.append('')
    c = meta['checks']
    for k, v in c.items():
        L.append('- %s: %s' % (k, v))
    L.append('')
    L.append('Runtime: %.0f s for %d seeds.' % (meta['seconds'], n))
    return '\n'.join(L) + '\n'


def side_checks(recs):
    neg = 0
    mis_max = 0.0
    mis_n = mis_t = 0
    for r in recs:
        for label in r['runs']:
            for pol in ('careful', 'greedy', 'ignoring'):
                x = r['runs'][label][pol]
                if x['kg'] < 0 or x['items'] < 0 or x['built_kg'] < 0 or x['pile_end_kg'] < 0 or min(x['mat_kg'].values()) < 0:
                    neg += 1
                mis_max = max(mis_max, x['mispick_rate'])
                mis_t += x['items']
                mis_n += x['mispick_rate'] * (x['items'] / max(1e-9, 1.0 - x['mispick_rate']))
    # idempotency: the same run twice into one ledger credits nothing the second time
    base = E.build_base(recs[0]['seed'])
    ctx = E.with_clock(base, 60, 60)
    led = C.Ledger()
    a = E.run_sim(ctx, E.Careful(), ledger=led)
    n1 = len(led)
    b = E.run_sim(ctx, E.Careful(), ledger=led)
    idem = (b['credited_items'] == 0 and b['credited_kg'] == 0 and len(led) == n1 and b['ledger_refused'] > 0 and a['credited_items'] == a['items'])
    # determinism: same seed twice gives the same record
    ra = clean(seed_record(recs[0]['seed'], 60))
    rb = clean(seed_record(recs[0]['seed'], 60))
    det = json.dumps(ra, sort_keys=True) == json.dumps(rb, sort_keys=True)
    return {'negative values found': neg, 'mis-pick rate over all runs (set at 0.03, so about 0.03 is correct)': round(mis_n / max(1.0, mis_t + mis_n), 4),
            'worst single run mis-pick rate (small samples scatter)': round(mis_max, 4),
            'a find or delivery is claimed once (second run credits nothing)': bool(idem),
            'two runs of the same seed are identical': bool(det)}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', type=int, default=60)
    ap.add_argument('--first-seed', type=int, default=1)
    ap.add_argument('--days', type=int, default=200)
    ap.add_argument('--out', default=os.path.join(C.HERE, 'out'))
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    t0 = time.time()
    recs = []
    for i in range(a.seeds):
        sd = a.first_seed + i
        recs.append(clean(seed_record(sd, a.days)))
        if (i + 1) % 10 == 0:
            print('seeds done: %d / %d  (%.0f s)' % (i + 1, a.seeds, time.time() - t0), flush=True)
    meta = dict(seeds=a.seeds, first_seed=a.first_seed, days=a.days, starts=dict(STARTS), stress=list(STRESS))
    meta['checks'] = side_checks(recs)
    meta['seconds'] = time.time() - t0
    body = json.dumps(dict(meta=dict((k, v) for k, v in meta.items() if k != 'seconds'), seeds=recs), sort_keys=True, indent=1)
    meta['results_sha256'] = hashlib.sha256(body.encode()).hexdigest()
    with open(os.path.join(a.out, 'results.json'), 'w') as f:
        f.write(body + '\n')
    rep = build_report(recs, meta)
    rep += '\nResults hash (sha256 of results.json body): %s\n' % meta['results_sha256']
    with open(os.path.join(a.out, 'REPORT.md'), 'w') as f:
        f.write(rep)
    print(rep)
    return 0


if __name__ == '__main__':
    sys.exit(main())
