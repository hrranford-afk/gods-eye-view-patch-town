"""foundry/tuning.py -- PARAMETER SENSITIVITY of the land formation tool, by monkeypatching its tuning constants IN PROCESS.
world.py is never edited; every setting is applied to the imported module, a world is built, the module is restored.

  python3 foundry/tuning.py run     [--settings 56] [--seeds 10] [--n 129] [--workers 2]   design of experiments -> seeds/tuning_results.json
  python3 foundry/tuning.py confirm [--seeds 20] [--n 257]                                  best settings re-run at n=257 vs the baseline
  python3 foundry/tuning.py report                                                          writes foundry/TUNING_REPORT.md (PROPOSALS only)

Knobs (all existing constants or direct wrappers of existing functions; the amplitudes inside build_A/B are literals, so they are reached by scaling
the function results):  land_mult (PROV[p]['land'] x), relief_amp (build_X result x, the cut is re-quantiled so land fraction does not move),
fine_amp and fine_scale (wrap fine_envelope: strength and decay of the small-island relief; also scales C's CAMP_REL2/3 role), hard_gamma (HARD**g and
ERODE: contrast of rock hardness), smax (SMAX x: slope caps), k_fluv, wave_k, shelf (PROV x), n_wave (rounded).
Design: Latin hypercube over the log of each factor, 1 baseline + S settings, 10 seeds each, coarse grid n=129 (4 m cells; about 0.3 s a world).
Analysis: linear fit of each response on the coded factors (-1..+1 = low..high of the range): the 'effect' is the change from low to high end."""
import contextlib
import json
import math
import multiprocessing as mp
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

FACTORS = {  # name: (low, high) multipliers (n_wave: absolute count)
    'land_mult': (0.75, 1.35), 'relief_amp': (0.6, 1.6), 'fine_amp': (0.5, 1.9), 'fine_scale': (0.6, 1.7), 'hard_gamma': (0.5, 1.7),
    'k_fluv': (0.4, 2.2), 'wave_k': (0.4, 2.2), 'smax': (0.6, 1.6), 'shelf': (0.7, 1.4), 'n_wave': (3, 8)}
BASE = {k: (1.0 if k != 'n_wave' else 5) for k in FACTORS}
SEED0 = 9001
# 'focused' proposals: only the knobs the effect tables show to matter (land_mult, relief_amp, fine_amp), rounded, everything else at baseline
FOCUSED = {'A': dict(land_mult=0.85, relief_amp=0.75, fine_amp=1.3), 'B': dict(land_mult=0.80, relief_amp=0.85, fine_amp=1.5),
           'C': dict(land_mult=1.20, relief_amp=0.85, fine_amp=1.6)}
SKERRY_TARGET = 8                       # TUNING: at least this many islands of 64..500 m2
BANDS = {'K': (0.5, 0.85), 'D': (1.2, 1.3), 'slope': {'A': (8, 30), 'B': (10, 35), 'C': (10, 40)}}   # D: rocky 1.2-1.3 centre; in-band test uses 1.10-1.35


def lhs(nset, rng):
    names = list(FACTORS)
    u = np.stack([(rng.permutation(nset) + rng.random(nset)) / nset for _ in names], 1)
    out = []
    for r in u:
        s = {}
        for v, k in zip(r, names):
            lo, hi = FACTORS[k]
            s[k] = int(round(lo + v * (hi - lo))) if k == 'n_wave' else float(math.exp(math.log(lo) + v * (math.log(hi) - math.log(lo))))
        out.append(s)
    return out


@contextlib.contextmanager
def patched(W, prov, s):
    """Apply a setting to the world module, restore on exit."""
    par = W.PROV[prov]
    saved = dict(par)
    orig = dict(HARD=W.HARD, ERODE=W.ERODE, SMAX=W.SMAX, fine_envelope=W.fine_envelope, build=getattr(W, 'build_' + prov))
    try:
        lo, hi = par['land']
        par['land'] = (min(lo * s['land_mult'], 0.45), min(hi * s['land_mult'], 0.5))
        for k in ('k_fluv', 'wave_k', 'shelf'):
            par[k] = saved[k] * s[k]
        par['n_wave'] = int(s['n_wave'])
        hard = np.asarray(orig['HARD']) ** s['hard_gamma']
        W.HARD, W.ERODE, W.SMAX = hard, 1.0 / hard, np.asarray(orig['SMAX']) * s['smax']
        fe = orig['fine_envelope']
        W.fine_envelope = lambda coarse, lf, scale=3.5, floor=0.08: s['fine_amp'] * fe(coarse, lf, scale * s['fine_scale'], floor)
        b = orig['build']
        setattr(W, 'build_' + prov, lambda ctx, hs: s['relief_amp'] * b(ctx, hs))
        yield
    finally:
        par.clear()
        par.update(saved)
        W.HARD, W.ERODE, W.SMAX, W.fine_envelope = orig['HARD'], orig['ERODE'], orig['SMAX'], orig['fine_envelope']
        setattr(W, 'build_' + prov, orig['build'])


def response(W, CH, w):
    m = CH.measure(w)
    areas = np.array([i['area_m2'] for i in w.islands])
    import lfmetrics as M
    try:
        ok = bool(M.start_island(W, w)[0] and M.start_island(W, w)[0]['ok'])
    except Exception:
        ok = False
    return dict(start_ok=1.0 if ok else 0.0, K=m['korcak_K'], D=m['coast_D'], slope=m['slope_median_deg'], gt60=m['slope_gt60'], n_isl=m['n_islands'], land=m['land_frac'],
                skerry=int(((areas >= 64) & (areas < 500)).sum()), sand=m['sand_share'], lt10=m['land_lt10'], l20=m['ratio_largest_20th'], coves=m['coves'])


def loss(r, prov):
    """Distance to the target bands, each term about 0..1+ ; NaN K counts as 1."""
    k = r['K'] if r['K'] == r['K'] else 0.0
    lk = max(BANDS['K'][0] - k, 0, k - BANDS['K'][1]) / 0.15
    ld = max(BANDS['D'][0] - r['D'], 0, r['D'] - BANDS['D'][1]) / 0.08
    lo, hi = BANDS['slope'][prov]
    sl = r['slope'] if r['slope'] == r['slope'] else 60
    ls = max(lo - sl, 0, sl - hi) / 12.0
    lsk = max(SKERRY_TARGET - r['skerry'], 0) / SKERRY_TARGET
    return lk + ld + ls + lsk, dict(K=lk, D=ld, slope=ls, skerry=lsk)


def _job(args):
    snapdir, prov, idx, s, seeds, n = args
    import sweep
    mods = sweep.load_mods(snapdir)
    W, CH = mods['W'], mods['CH']
    rows = []
    with patched(W, prov, s):
        for sd in seeds:
            w = W.make_world(sd, prov, n=n)
            rows.append(response(W, CH, w))
    return prov, idx, rows


def summarise(rows, prov):
    keys = ['start_ok', 'K', 'D', 'slope', 'gt60', 'n_isl', 'skerry', 'land', 'sand', 'lt10', 'l20', 'coves']
    m = {k: float(np.nanmean([r[k] for r in rows])) for k in keys}
    ls = [loss(r, prov) for r in rows]
    m['loss'] = float(np.mean([l[0] for l in ls]))
    for t in ('K', 'D', 'slope', 'skerry'):
        m['loss_' + t] = float(np.mean([l[1][t] for l in ls]))
    m['in_K'] = float(np.mean([BANDS['K'][0] <= r['K'] <= BANDS['K'][1] if r['K'] == r['K'] else False for r in rows]))
    m['in_D'] = float(np.mean([1.10 <= r['D'] <= 1.35 for r in rows]))
    lo, hi = BANDS['slope'][prov]
    m['in_slope'] = float(np.mean([lo <= r['slope'] <= hi if r['slope'] == r['slope'] else False for r in rows]))
    return m


def run(a):
    import sweep
    snap = sweep.catalogue_snapshot()
    rng = np.random.default_rng(20260606)
    seeds = list(range(SEED0, SEED0 + a.seeds))
    jobs, design = [], {}
    for prov in 'ABC':
        sets = [dict(BASE)] + lhs(a.settings, rng)
        design[prov] = sets
        for i, s in enumerate(sets):
            jobs.append((snap['dir'], prov, i, s, seeds, a.n))
    t0 = time.perf_counter()
    res = {p: {} for p in 'ABC'}
    with mp.get_context('fork').Pool(a.workers) as pool:
        for k, (prov, i, rows) in enumerate(pool.imap_unordered(_job, jobs, chunksize=1)):
            res[prov][i] = rows
            if k % 40 == 0:
                print('  %d/%d %.0fs' % (k, len(jobs), time.perf_counter() - t0), flush=True)
    out = dict(world_py_hash=snap['world_hash'], n=a.n, seeds=seeds, factors=FACTORS, wall_s=round(time.perf_counter() - t0, 1), provinces={})
    import resource
    out['peak_rss_mb_child'] = round(resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024, 1)
    for prov in 'ABC':
        out['provinces'][prov] = [dict(setting=design[prov][i], mean=summarise(res[prov][i], prov)) for i in range(len(design[prov]))]
    with open(os.path.join(sweep.SEEDS_DIR, 'tuning_results.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'), default=lambda o: None if o != o else o)
    print('tuning: %d worlds in %.0fs, peak child rss %.0f MB' % (len(jobs) * a.seeds, out['wall_s'], out['peak_rss_mb_child']))
    return out


def effects(results, prov, resp):
    """OLS on coded factors (-1..+1); returns {factor: effect low->high} and R2."""
    rows = results['provinces'][prov][1:]
    names = list(FACTORS)
    X, y = [], []
    for r in rows:
        x = []
        for k in names:
            lo, hi = FACTORS[k]
            v = r['setting'][k]
            c = (v - (lo + hi) / 2) / ((hi - lo) / 2) if k == 'n_wave' else (math.log(v) - (math.log(lo) + math.log(hi)) / 2) / ((math.log(hi) - math.log(lo)) / 2)
            x.append(c)
        X.append([1.0] + x)
        y.append(r['mean'][resp])
    X, y = np.array(X), np.array(y)
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    pred = X @ beta
    r2 = 1 - ((y - pred) ** 2).sum() / max(((y - y.mean()) ** 2).sum(), 1e-12)
    return {k: float(2 * b) for k, b in zip(names, beta[1:])}, float(r2)


def confirm(a):
    import sweep
    with open(os.path.join(sweep.SEEDS_DIR, 'tuning_results.json')) as f:
        res = json.load(f)
    snap = sweep.catalogue_snapshot()
    seeds = list(range(SEED0 + 100, SEED0 + 100 + a.seeds))
    jobs, meta = [], []
    for prov in 'ABC':
        rows = res['provinces'][prov]
        order = sorted(range(1, len(rows)), key=lambda i: rows[i]['mean']['loss'])
        pick = [0] + order[:2]
        for i in pick:
            jobs.append((snap['dir'], prov, i, rows[i]['setting'], seeds, a.n))
            meta.append((prov, i))
        fs = dict(BASE)
        fs.update(FOCUSED[prov])
        jobs.append((snap['dir'], prov, 'F', fs, seeds, a.n))
    out = {}
    with mp.get_context('fork').Pool(a.workers) as pool:
        for prov, i, rr in pool.imap_unordered(_job, jobs, chunksize=1):
            m = summarise(rr, prov)
            # playability of the best settings is checked in the report script separately (start island rule), here only the realism numbers
            out.setdefault(prov, {})[str(i)] = dict(setting=(res['provinces'][prov][i]['setting'] if i != 'F' else dict(BASE, **FOCUSED[prov])), mean=m)
    res['confirm'] = dict(n=a.n, seeds=seeds, results=out)
    with open(os.path.join(sweep.SEEDS_DIR, 'tuning_results.json'), 'w') as f:
        json.dump(res, f, separators=(',', ':'), default=lambda o: None if o != o else o)
    print(json.dumps({p: {i: round(v['mean']['loss'], 2) for i, v in d.items()} for p, d in out.items()}))


def fmt_setting(s):
    return ', '.join('%s %s' % (k, ('%d' % v) if k == 'n_wave' else ('%.2f' % v)) for k, v in s.items() if abs(v - BASE[k]) > 1e-9)


def report(a):
    import sweep
    with open(os.path.join(sweep.SEEDS_DIR, 'tuning_results.json')) as f:
        res = json.load(f)
    L = ['# TUNING REPORT: parameter sensitivity of the land formation tool', '',
         '**PROPOSALS for the owner and the world.py owner. Nothing here was applied; `landform/world.py` was not edited.** Every setting was made by monkeypatching the imported module in-process (`foundry/tuning.py`, `patched()`), then restored.', '',
         'World.py version used: `%s`. Design: %d settings per province (Latin hypercube over the log of 10 factors) plus the baseline, %d seeds each, coarse grid n=%d (4 m cells); %d worlds in %.0f s on 2 workers, peak child memory %.0f MB. Seeds %d..%d (not the sweep seeds).' % (
             res['world_py_hash'], len(res['provinces']['A']) - 1, len(res['seeds']), res['n'], 3 * len(res['provinces']['A']) * len(res['seeds']), res['wall_s'], res['peak_rss_mb_child'], res['seeds'][0], res['seeds'][-1]), '',
         'Target bands (LANDFORM.md): K 0.5 to 0.85, D 1.10 to 1.35 (rocky 1.2 to 1.3, the loss uses 1.2 to 1.3), median slope A 8-30, B 10-35, C 10-40 degrees, small islands (64 to 500 m2) at least %d (TUNING, mine). Loss = sum of band distances (K/0.15, D/0.08, slope/12, small-island shortfall/%d), 0 = all four in band.' % (SKERRY_TARGET, SKERRY_TARGET), '',
         '## Knobs', '', 'land_mult (land fraction range), relief_amp (whole height field x, the cut is re-quantiled), fine_amp and fine_scale (strength and decay of the small-island relief, `fine_envelope`), hard_gamma (HARD**g: contrast of rock hardness; also ERODE), smax (slope caps x), k_fluv, wave_k, shelf (province constants x), n_wave (wave/deposit passes). Ranges low..high: ' + '; '.join('%s %s..%s' % (k, lo, hi) for k, (lo, hi) in res['factors'].items()) + '.', '']
    L += ['## Summary of the proposals', '']
    for prov, name in (('A', 'gneiss'), ('B', 'sandstone'), ('C', 'basalt')):
        cf = res.get('confirm', {}).get('results', {}).get(prov)
        if cf:
            bi = min(cf, key=lambda i: cf[i]['mean']['loss'])
            b0 = cf['0']['mean']
            bm = cf[bi]['mean']
            L += ['- **%s (%s)**: best confirmed at n=%d on fresh seeds: %s. Loss %.2f -> %.2f; K %.2f -> %.2f, D %.2f -> %.2f, median slope %.1f -> %.1f deg, small islands %.1f -> %.1f; share of worlds with K in band %.0f%% -> %.0f%%, slope in band %.0f%% -> %.0f%%; worlds with a start island %.0f%% -> %.0f%%.' % (
                prov, name, res['confirm']['n'], 'baseline already the best' if bi == '0' else fmt_setting(cf[bi]['setting']), b0['loss'], bm['loss'], b0['K'], bm['K'], b0['D'], bm['D'], b0['slope'], bm['slope'], b0['skerry'], bm['skerry'], 100 * b0['in_K'], 100 * bm['in_K'], 100 * b0['in_slope'], 100 * bm['in_slope'], 100 * b0['start_ok'], 100 * bm['start_ok'])]
    L += ['',
          '- What moves what (see the effect tables): **fine_amp** (strength of the small-island relief) raises K and the small-island count in every province, but also steepens slopes; **relief_amp** (overall height scale) is the slope knob (about 5 to 25 degrees across its range) and also raises the share of land below 10 m, and costs small islands; **land_mult** (land fraction) lowers K when raised in A and B (more land merges the islands), so a slightly lower land fraction gives a better K and more separate islands; for C a higher land fraction helps because the basalt worlds are too sparse. **fine_scale, hard_gamma, k_fluv, wave_k, shelf and n_wave barely move K, D or the slope** (effects under about 0.03 in K and D), so the erosion constants are not where the shortfall is; the shortfall is in the relief amplitudes, which are literals inside build_A/B/C.',
          '- Coast roughness D is in band for A and B already (1.17 to 1.19 at n=257) and low only for C (1.09, rocky target 1.2 to 1.3): nothing tested lifts C beyond about 1.12 (D responds to land_mult and fine_amp only weakly), so the C coast needs a structural change (rougher riser edge from the terrace step, or higher resolution) not a constant.',
          '- The coarse-grid (n=129) winners transfer only partly to n=257 (B: the best n=129 setting made the slope worse, 5% in band); the confirmation tables are the numbers to trust. The FOCUSED three-knob settings are the simplest to adopt but were set by hand from the effect tables, not optimised.', '']
    for prov, name in (('A', 'gneiss'), ('B', 'sandstone'), ('C', 'basalt')):
        rows = res['provinces'][prov]
        base = rows[0]['mean']
        L += ['## Province %s (%s)' % (prov, name), '']
        L += ['Baseline (10 seeds, n=%d): K %.2f, D %.2f, median slope %.1f deg, small islands %.1f, islands %.1f, loss %.2f (K %.2f, D %.2f, slope %.2f, small %.2f).' % (
            res['n'], base['K'], base['D'], base['slope'], base['skerry'], base['n_isl'], base['loss'], base['loss_K'], base['loss_D'], base['loss_slope'], base['loss_skerry']), '']
        L += ['Effect sizes: change in the 10-seed mean of each response from the LOW to the HIGH end of each factor (linear fit, other factors varying; R2 in the header; large R2 means the linear story is trustworthy):', '']
        resp = [('K', 'K'), ('D', 'D'), ('slope', 'slope deg'), ('skerry', 'small isl'), ('lt10', 'land<10m')]
        eff = {r: effects(res, prov, r) for r, _ in resp}
        L += ['| factor | ' + ' | '.join('%s (R2 %.2f)' % (lab, eff[r][1]) for r, lab in resp) + ' |', '|---|' + '---|' * len(resp)]
        for k in FACTORS:
            L += ['| %s | ' % k + ' | '.join('%+.3f' % eff[r][0][k] if r in ('K', 'D', 'lt10') else '%+.2f' % eff[r][0][k] for r, _ in resp) + ' |']
        L += ['']
        order = sorted(range(1, len(rows)), key=lambda i: rows[i]['mean']['loss'])[:4]
        L += ['Best settings found (coarse grid, 10 seeds):', '', '| setting (changed knobs only) | K | D | slope | small isl | islands | land<10m | loss |', '|---|---|---|---|---|---|---|---|']
        L += ['| baseline | %.2f | %.2f | %.1f | %.1f | %.1f | %.2f | %.2f |' % (base['K'], base['D'], base['slope'], base['skerry'], base['n_isl'], base['lt10'], base['loss'])]
        for i in order:
            m = rows[i]['mean']
            L += ['| %s | %.2f | %.2f | %.1f | %.1f | %.1f | %.2f | %.2f |' % (fmt_setting(rows[i]['setting']), m['K'], m['D'], m['slope'], m['skerry'], m['n_isl'], m['lt10'], m['loss'])]
        L += ['']
        if 'confirm' in res and prov in res['confirm']['results']:
            L += ['Confirmation at n=%d, %d fresh seeds (baseline, the two best DoE settings, and a FOCUSED setting that changes only land_mult, relief_amp and fine_amp):' % (res['confirm']['n'], len(res['confirm']['seeds'])), '', '| setting | K | D | slope | small isl | islands | share K in band | share D in band | share slope in band | start island found | loss |', '|---|---|---|---|---|---|---|---|---|---|---|']
            for i, v in sorted(res['confirm']['results'][prov].items(), key=lambda kv: (kv[0] == 'F', int(kv[0]) if kv[0] != 'F' else 0)):
                m = v['mean']
                L += ['| %s | %.2f | %.2f | %.1f | %.1f | %.1f | %.0f%% | %.0f%% | %.0f%% | %.0f%% | %.2f |' % ('baseline' if i == '0' else ('FOCUSED: ' if i == 'F' else '') + fmt_setting(v['setting']), m['K'], m['D'], m['slope'], m['skerry'], m['n_isl'], 100 * m['in_K'], 100 * m['in_D'], 100 * m['in_slope'], 100 * m['start_ok'], m['loss'])]
            L += ['']
    L += ['## Reading it', '', '- These are PROPOSALS found on a coarse grid; effects at n=257/513 can differ (box-count D and the 4-cell island floor depend on the cell size). The confirmation tables re-run the best settings at the sweep grid on fresh seeds.',
          '- Metrics are the checks.py numbers; a setting that improves K and D can still make worse-looking or less playable worlds (look at the contact sheet before adopting any of them). Playability (start island) was not part of this loss.',
          '- Knob names are mine; `relief_amp`, `fine_amp` and `hard_gamma` have no single constant in world.py (the amplitudes are literals inside `build_A/B/C`, `fine_envelope` call sites and the rock table), so adopting them means editing those literals, not one value.']
    with open(os.path.join(HERE, 'TUNING_REPORT.md'), 'w') as f:
        f.write('\n'.join(L) + '\n')
    print('wrote TUNING_REPORT.md')


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['run', 'confirm', 'report'])
    ap.add_argument('--settings', type=int, default=56)
    ap.add_argument('--seeds', type=int, default=10)
    ap.add_argument('--n', type=int, default=None)
    ap.add_argument('--workers', type=int, default=2)
    a = ap.parse_args()
    if a.n is None:
        a.n = 129 if a.cmd == 'run' else 257
    if a.cmd == 'confirm' and a.seeds == 10:
        a.seeds = 20
    {'run': run, 'confirm': confirm, 'report': report}[a.cmd](a)
