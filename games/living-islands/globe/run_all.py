# run_all: builds N seeded planets, solves the circulation, runs the drift particles, makes keyed arrival tables for sample
# tables and writes results.json and a short REPORT.md into one output folder. Python 3 plus numpy only, no network.
#   python3 run_all.py [--seeds 60] [--days 1500] [--tables 30] [--out DIR] [--first-seed 1] [--jobs 4] [--sens-seeds 3]
# It writes only inside the output folder (default: globe/out next to this file). Optional --maps N draws world maps (needs PIL).
import argparse
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np

import planet as PL
import circulation as CI
import drift as DR
import arrivals as AR

HERE = os.path.dirname(os.path.abspath(__file__))


def clean(o):
    if isinstance(o, dict):
        return {str(k): clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, np.floating):
        return round(float(o), 4)
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


def one_seed(args):
    seed, days, ntab = args
    t0 = time.time()
    w = AR.World(seed, days)
    t_solve = time.time() - t0
    res = w.res
    t_drift = time.time() - t0 - t_solve
    tabs = []
    for k in range(ntab):
        lon, lat = AR.default_table(w, k)
        t = AR.arrivals_for_table(w, lon, lat)
        tabs.append(dict(table=t['table'], summary=t['summary'], per_year=t['per_year'], hash=AR.table_hash(t),
                         travel=[a['travel_days'] for a in t['arrivals']], sources=[a['source_region_id'] for a in t['arrivals']],
                         source_bands=[a['source_band'] for a in t['arrivals']], kinds=[a['kind'] for a in t['arrivals']],
                         frag=[a['fragility'] for a in t['arrivals']]))
    j, i = PL.cell_of(res.lon, res.lat)
    kinds = {}
    for kk, kn in enumerate(DR.KINDS):
        m = res.kind == kk
        b = m & (res.status == 1)
        kinds[kn] = dict(n=int(m.sum()), beached_share=float(b.sum() / max(m.sum(), 1)),
                         median_days=float(np.median(res.end_day[b] - res.release_day[b])) if b.any() else None)
    diag = w.circ.diagnostics()
    return dict(seed=seed, planet=dict(land_fraction=w.planet.land_fraction, attempt=w.planet.attempt, hash=w.planet.hash_hex(), coast=int(w.planet.coast.sum())),
                circ=diag, circ_hash=w.circ.hash_hex(), particles=int(res.n), on_land=int(w.planet.land[j, i].sum()),
                adrift_share=float((res.status == 0).mean()), kinds=kinds, tables=tabs,
                seconds=dict(solve=round(t_solve, 2), drift=round(t_drift, 2), total=round(time.time() - t0, 2)))


def sens_one(args):
    seed, days, name, opts = args
    w = AR.World(seed, days, **opts)
    counts, srcs, trav = [], [], []
    for k in range(10):
        lon, lat = AR.default_table(w, k)
        t = AR.arrivals_for_table(w, lon, lat)
        counts.append(t['summary']['n_arrivals'])
        srcs.append(t['summary']['n_sources'])
        trav.extend(a['travel_days'] for a in t['arrivals'])
    return dict(seed=seed, variant=name, median_arrivals=float(np.median(counts)), median_sources=float(np.median(srcs)),
                none=int(sum(1 for c in counts if c == 0)), travel_median=float(np.median(trav)) if trav else None)


def pct(a, q):
    return float(np.percentile(a, q)) if len(a) else None


def structure_check(recs):
    # source-to-sink structure: the share of a table's arrivals from its top source region, against the same arrivals with the
    # source labels shuffled across tables of one seed (a null with no geography)
    real, null = [], []
    rng = np.random.default_rng(5)
    for r in recs:
        allsrc = [s for t in r['tables'] for s in t['sources']]
        if len(allsrc) < 30:
            continue
        for t in r['tables']:
            n = len(t['sources'])
            if n < 8:
                continue
            _, c = np.unique(t['sources'], return_counts=True)
            real.append(c.max() / n)
            samp = rng.choice(allsrc, size=n, replace=False)
            _, c2 = np.unique(samp, return_counts=True)
            null.append(c2.max() / n)
    return dict(real_top_share=float(np.mean(real)) if real else None, null_top_share=float(np.mean(null)) if null else None, n_tables=len(real))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--seeds', type=int, default=60)
    ap.add_argument('--first-seed', type=int, default=1)
    ap.add_argument('--days', type=int, default=1500)
    ap.add_argument('--tables', type=int, default=30)
    ap.add_argument('--jobs', type=int, default=min(4, os.cpu_count() or 1), help='worker processes (default: cores, at most 4)')
    ap.add_argument('--sens-seeds', type=int, default=3)
    ap.add_argument('--maps', type=int, default=0, help='draw this many world maps into OUT/maps (needs PIL)')
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    t0 = time.time()
    seeds = list(range(a.first_seed, a.first_seed + a.seeds))
    jobs = [(s, a.days, a.tables) for s in seeds]
    if a.jobs > 1:
        import multiprocessing as mp
        with mp.Pool(a.jobs) as pool:
            recs = pool.map(one_seed, jobs, chunksize=1)
    else:
        recs = [one_seed(j) for j in jobs]
    t_main = time.time() - t0
    # ---- sensitivity on a few seeds: leeway 0 and 2x, K 10x, beaching probability halved
    variants = [('base', {}), ('leeway x0', dict(leeway_scale=0.0)), ('leeway x2', dict(leeway_scale=2.0)),
                ('K x10', dict(k_diff=DR.K_DIFF * 10)), ('p_beach x0.5', dict(p_beach_scale=0.5))]
    sj = [(s, a.days, nm, op) for s in seeds[:a.sens_seeds] for (nm, op) in variants]
    if a.jobs > 1 and sj:
        import multiprocessing as mp
        with mp.Pool(a.jobs) as pool:
            sens = pool.map(sens_one, sj, chunksize=1)
    else:
        sens = [sens_one(x) for x in sj]
    # ---- aggregate
    tabs = [t for r in recs for t in r['tables']]
    counts = np.array([t['summary']['n_arrivals'] for t in tabs])
    srcn = np.array([t['summary']['n_sources'] for t in tabs])
    alltr = np.array([x for t in tabs for x in t['travel']])
    strays = np.array([t['summary']['n_strays'] for t in tabs])
    bands = {}
    for t in tabs:
        bands.setdefault(t['table']['band'], []).append(t['summary']['n_arrivals'])
    seed_med = np.array([np.median([t['summary']['n_arrivals'] for t in r['tables']]) for r in recs])
    seed_tot = np.array([sum(t['summary']['n_arrivals'] for t in r['tables']) for r in recs])
    kind_share = {}
    for t in tabs:
        for k in t['kinds']:
            kind_share[k] = kind_share.get(k, 0) + 1
    ntot = max(sum(kind_share.values()), 1)
    kind_share = {k: round(v / ntot, 3) for k, v in sorted(kind_share.items())}
    allfrag = np.array([x for t in tabs for x in t['frag']])
    sbands = {}
    for t in tabs:
        for b in t['source_bands']:
            sbands[b] = sbands.get(b, 0) + 1
    fill = lambda k: [r['circ'][k] for r in recs]
    circ = dict(median_open=pct(fill('median_open'), 50), p995_median=pct(fill('p995'), 50), max_over_seeds=float(max(fill('max'))),
                west_east_median=pct(fill('west_east_median'), 50), west_stronger_share=float(np.mean(fill('west_stronger_share'))),
                west_over2_share=float(np.mean(fill('west_over2_share'))),
                north_psi_positive=float(np.mean([r['circ']['gyre_sense']['north'] > 0 for r in recs])),
                south_psi_negative=float(np.mean([r['circ']['gyre_sense']['south'] < 0 for r in recs])),
                trades_westward=float(np.mean([r['circ']['zonal']['trades_n'] < 0 and r['circ']['zonal']['trades_s'] < 0 for r in recs])),
                westerlies_eastward=float(np.mean([r['circ']['zonal']['westerlies_n'] > 0 and r['circ']['zonal']['westerlies_s'] > 0 for r in recs])))
    summary = dict(
        seeds=len(recs), tables=len(tabs), days=a.days,
        arrivals=dict(min=int(counts.min()), p10=pct(counts, 10), median=pct(counts, 50), p90=pct(counts, 90), max=int(counts.max()),
                      none=int((counts == 0).sum()), none_share=float((counts == 0).mean()), cv=float(counts.std() / max(counts.mean(), 1e-9)),
                      seed_median_cv=float(seed_med.std() / max(seed_med.mean(), 1e-9)), seed_total_cv=float(seed_tot.std() / max(seed_tot.mean(), 1e-9)),
                      by_band={b: dict(n=len(v), median=pct(v, 50), none=int(sum(1 for x in v if x == 0))) for b, v in sorted(bands.items())}),
        sources=dict(median=pct(srcn, 50), p90=pct(srcn, 90), max=int(srcn.max()), median_where_any=pct(srcn[counts > 0], 50) if (counts > 0).any() else None,
                     one_source_or_fewer_share=float((srcn <= 1).mean()), of_total_regions=PL.N_LON_BLOCKS * PL.N_LAT_BLOCKS),
        travel=dict(n=int(len(alltr)), p10=pct(alltr, 10), median=pct(alltr, 50), p90=pct(alltr, 90), over_365_share=float((alltr > 365).mean()) if len(alltr) else None,
                    under_30_share=float((alltr < 30).mean()) if len(alltr) else None),
        strays=dict(median=pct(strays, 50), none_share=float((strays == 0).mean())),
        kind_share=kind_share, source_band_counts=sbands, fragility=dict(median=pct(allfrag, 50), p90=pct(allfrag, 90)),
        structure=structure_check(recs), circulation=circ,
        planet=dict(land_min=min(r['planet']['land_fraction'] for r in recs), land_max=max(r['planet']['land_fraction'] for r in recs),
                    reseeded_share=float(np.mean([r['planet']['attempt'] > 0 for r in recs]))),
        particles=dict(on_land=int(sum(r['on_land'] for r in recs)), adrift_share=float(np.mean([r['adrift_share'] for r in recs])),
                       per_seed=recs[0]['particles']),
        timing=dict(wall_seconds=round(t_main, 1), per_seed_total=pct([r['seconds']['total'] for r in recs], 50), solve=pct([r['seconds']['solve'] for r in recs], 50),
                    jobs=a.jobs))
    sens_sum = {}
    for s in sens:
        sens_sum.setdefault(s['variant'], []).append(s)
    sens_tab = {v: dict(median_arrivals=pct([x['median_arrivals'] for x in L], 50), median_sources=pct([x['median_sources'] for x in L], 50),
                        none=int(sum(x['none'] for x in L)), travel_median=pct([x['travel_median'] for x in L if x['travel_median'] is not None], 50))
                for v, L in sens_sum.items()}
    # ---- the run hash: planets, circulations and tables
    h = hashlib.sha256()
    for r in recs:
        h.update(r['planet']['hash'].encode() + r['circ_hash'].encode() + ''.join(t['hash'] for t in r['tables']).encode())
    summary['run_hash'] = h.hexdigest()[:16]
    out = dict(summary=summary, sensitivity=sens_tab, seeds=[dict(seed=r['seed'], planet=r['planet'], circ=r['circ'], kinds=r['kinds'], seconds=r['seconds'],
                                                                 tables=[dict(table=t['table'], summary=t['summary'], per_year=t['per_year'], hash=t['hash']) for t in r['tables']])
                                                            for r in recs])
    with open(os.path.join(a.out, 'results.json'), 'w') as f:
        json.dump(clean(out), f, indent=1, sort_keys=True)
    write_report(os.path.join(a.out, 'REPORT.md'), summary, sens_tab, recs, a.sens_seeds)
    if a.maps:
        import render
        os.makedirs(os.path.join(a.out, 'maps'), exist_ok=True)
        for s in seeds[:a.maps]:
            render.render_seed(s, a.days, os.path.join(a.out, 'maps', 'globe-map-%d.png' % s))
    print('done: %d seeds, %d tables, hash %s, %.1f s -> %s' % (len(recs), len(tabs), summary['run_hash'], time.time() - t0, a.out))


def write_report(path, S, sens, recs, n_sens=5):
    A, SO, T, C = S['arrivals'], S['sources'], S['travel'], S['circulation']
    L = []
    L.append('# Globe stage 2 report')
    L.append('')
    L.append('Run: %d seeds, %d tables (%d per seed), %d days, run hash `%s`, wall time %.0f s with %d job(s).' % (S['seeds'], S['tables'], S['tables'] // max(S['seeds'], 1), S['days'], S['run_hash'], S['timing']['wall_seconds'], S['timing']['jobs']))
    L.append('All numbers are TUNING-grade: they test the recipe, not the real ocean (see GLOBE_STAGE2.md).')
    L.append('')
    L.append('## Stage checks (research note 8.2) against the note prototype')
    L.append('')
    L.append('| Check | This run | Note prototype | Verdict |')
    L.append('|---|---|---|---|')
    L.append('| Arrivals per table in %d days, median (min to max) | %.0f (%d to %d) | 14 to 20 (0 to about 170) | %s |' % (S['days'], A['median'], A['min'], A['max'], 'in range' if 8 <= A['median'] <= 40 else 'outside'))
    L.append('| Tables with no arrivals | %d of %d (%.0f percent) | 5 to 8 of 30 (17 to 27 percent) | %s |' % (A['none'], S['tables'], 100 * A['none_share'], 'in range' if 0.08 <= A['none_share'] <= 0.35 else 'outside'))
    L.append('| Source regions per table, median (max) of %d | %.0f (%d) | median 3 to 4, max 8 to 10 of 37 to 41 | %s |' % (SO['of_total_regions'], SO['median'], SO['max'], 'ok, at least 3' if SO['median'] >= 3 else 'below the 3 rule'))
    L.append('| Travel time days p10 / median / p90 | %.0f / %.0f / %.0f | 5 to 7 / 57 to 83 / 230 to 445 | longer tail: %.0f percent beyond a year |' % (T['p10'] or 0, T['median'] or 0, T['p90'] or 0, 100 * (T['over_365_share'] or 0)))
    L.append('| Richness spread, CV of arrivals across tables | %.2f | 1.07 to 1.26 | shore_catch today: SUPPLY_SIGMA 0.45 (CV about 0.5) |' % A['cv'])
    L.append('')
    L.append('Per seed spread: CV of the per-seed median %.2f, CV of the per-seed total %.2f (60-seed richness spread asked by the note, check 6).' % (A['seed_median_cv'], A['seed_total_cv']))
    L.append('')
    L.append('Arrivals by latitude band of the table (median, count of tables, tables with none):')
    L.append('')
    for b, v in A['by_band'].items():
        L.append('- %s: median %.0f, %d tables, %d with none' % (b, v['median'], v['n'], v['none']))
    L.append('')
    L.append('Share of tables with only one source region or none: %.0f percent. Stray arrivals per table: median %.0f, tables with none %.0f percent.' % (100 * SO['one_source_or_fewer_share'], S['strays']['median'], 100 * S['strays']['none_share']))
    L.append('Mix of kinds among arrivals: %s. Source bands: %s. Fragility median %.2f, p90 %.2f.' % (S['kind_share'], S['source_band_counts'], S['fragility']['median'], S['fragility']['p90']))
    st = S['structure']
    L.append('')
    L.append('## Source to sink structure (check 7)')
    L.append('')
    L.append('Share of a table\'s arrivals that come from its single biggest source region: %.2f real against %.2f when the source labels are shuffled across tables of the same seed (%d tables). %s' % (st['real_top_share'] or 0, st['null_top_share'] or 0, st['n_tables'], 'Structure present (real above null).' if (st['real_top_share'] or 0) > (st['null_top_share'] or 1) else 'No structure beyond noise.'))
    L.append('')
    L.append('## Sensitivity (check 8), first %d seeds, 10 tables each' % min(len(recs), n_sens))
    L.append('')
    L.append('| Variant | Median arrivals | Median sources | Tables with none | Travel median days |')
    L.append('|---|---|---|---|---|')
    for v, d in sens.items():
        L.append('| %s | %.0f | %.1f | %d | %s |' % (v, d['median_arrivals'], d['median_sources'], d['none'], ('%.0f' % d['travel_median']) if d['travel_median'] is not None else 'n/a'))
    L.append('')
    L.append('## Field and planet checks')
    L.append('')
    L.append('- Land fraction %.3f to %.3f (target 0.25 to 0.35); %.0f percent of seeds needed a reseed for the two-basin rule.' % (S['planet']['land_min'], S['planet']['land_max'], 100 * S['planet']['reseeded_share']))
    L.append('- Open ocean median speed %.3f m/s, 99.5th percentile %.2f m/s, largest speed over all seeds %.2f m/s (limit 2.5).' % (C['median_open'], C['p995_median'], C['max_over_seeds']))
    L.append('- Trades westward in %.0f percent of seeds, westerlies eastward in %.0f percent; north subtropical gyre clockwise in %.0f percent, south anticlockwise in %.0f percent.' % (100 * C['trades_westward'], 100 * C['westerlies_eastward'], 100 * C['north_psi_positive'], 100 * C['south_psi_negative']))
    L.append('- Western boundary against eastern boundary strongest meridional speed, median ratio %.1f; west stronger in %.0f percent of basins, more than 2 times in %.0f percent.' % (C['west_east_median'], 100 * C['west_stronger_share'], 100 * C['west_over2_share']))
    L.append('- Particles on land at the end of the runs: %d. Share still adrift after %d days: %.0f percent.' % (S['particles']['on_land'], S['days'], 100 * S['particles']['adrift_share']))
    L.append('- Time per seed (planet, solve, particles, 30 tables): median %.1f s, of which planet and solve %.2f s.' % (S['timing']['per_seed_total'], S['timing']['solve']))
    L.append('')
    with open(path, 'w') as f:
        f.write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
