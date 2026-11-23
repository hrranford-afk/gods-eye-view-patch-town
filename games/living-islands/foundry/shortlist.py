"""foundry/shortlist.py -- the transparent ranking. Reads seeds/catalogue.json and foundry/weights.json; writes seeds/shortlist.json.
Weights are not part of any cache hash, so changing them never recomputes a world.
  top 12 per province (greedy diversity pick on the score), top 24 overall = best 8 of each province (so the sheet shows all three),
  reasons (strongest and weakest terms) for each, and for every other world its failed realism checks and, for a disqualified world, why.
DISQUALIFIED only when no start island passes the rules (playability), never for taste."""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def load_weights(path=None):
    with open(path or os.path.join(HERE, 'weights.json')) as f:
        return json.load(f)


def trap(v, a, b, c, d):
    if v is None or v != v:
        return 0.0
    if v <= a or v >= d:
        return 0.0
    if v < b:
        return (v - a) / (b - a)
    if v <= c:
        return 1.0
    return (d - v) / (d - c)


def score_world(row, wts):
    parts, tot, ws = {}, 0.0, 0.0
    groups = {}
    for t in wts['terms']:
        band = t['band_by_prov'][row['province']] if 'band_by_prov' in t else t['band']
        v = row.get(t['key'])
        d = trap(v, *band)
        parts[t['key']] = round(d, 3)
        tot += t['w'] * d
        ws += t['w']
        g = groups.setdefault(t['group'], [0.0, 0.0])
        g[0] += t['w'] * d
        g[1] += t['w']
    return round(tot / ws if ws else 0.0, 4), parts, {g: round(a / b, 3) if b else 0.0 for g, (a, b) in groups.items()}


def features(row, wts):
    out = []
    for k, scale in wts['diversity_features']:
        v = row.get(k)
        out.append(0.0 if v is None else float(v) / scale)
    return out


def mmr(rows, K, wts):
    lam, sig = wts['mmr']['lambda'], wts['mmr']['sigma']
    pool = [dict(r) for r in rows]
    for r in pool:
        r['_f'] = features(r, wts)
    chosen = []
    while pool and len(chosen) < K:
        best, bv, bpen = None, -1e9, 0.0
        for c in pool:
            pen = 0.0
            for o in chosen:
                d2 = sum((a - b) ** 2 for a, b in zip(c['_f'], o['_f']))
                pen = max(pen, math.exp(-d2 / (2 * sig * sig)))
            v = c['score'] - lam * pen
            if v > bv + 1e-12 or (abs(v - bv) <= 1e-12 and best is not None and c['seed'] < best['seed']):
                best, bv, bpen = c, v, pen
        pool.remove(best)
        best['adjusted'], best['penalty'] = round(bv, 4), round(bpen, 3)
        chosen.append(best)
    return chosen


def failed_checks(row, parts, thresh=0.2):
    return sorted(k for k, d in parts.items() if d < thresh)


def entry(row, rank=None):
    p = row['parts']
    srt = sorted(p.items(), key=lambda kv: (-kv[1], kv[0]))
    e = dict(rank=rank, province=row['province'], seed=row['seed'], hash=row['hash'], score=row['score'], groups=row['groups'],
             start_island=row.get('start_island'), start_extent_m=row.get('start_extent_m'), start_landing_kind=row.get('start_landing_kind'), start_landing_xy=row.get('start_landing_xy'),
             strongest=[k for k, v in srt[:3]], weakest=['%s %.2f' % (k, v) for k, v in srt[-3:]][::-1], failed=failed_checks(row, p))
    if 'adjusted' in row:
        e['adjusted'], e['diversity_penalty'] = row['adjusted'], row['penalty']
    keys = ('n_islands', 'korcak_K', 'coast_D', 'land_frac', 'n_skerry', 'coves_n', 'landings_start', 'row_gap_start_m', 'landing_dist_other_m', 'n_merge_isl', 'start_score')
    e['numbers'] = {k: row.get(k) for k in keys}
    return e


def run(seeds_dir, weights_path=None, k_prov=12, k_sheet=8):
    wts = load_weights(weights_path)
    with open(os.path.join(seeds_dir, 'catalogue.json')) as f:
        cat = json.load(f)
    rows = []
    for w in cat['worlds']:
        r = dict(w)
        r['score'], r['parts'], r['groups'] = score_world(r, wts)
        r['disqualified'] = not r.get('start_ok')
        rows.append(r)
    by_prov, disq, summary = {}, [], {'disqualified': 0, 'worlds': len(rows), 'per_province': {}}
    for p in sorted({r['province'] for r in rows}):
        pr = [r for r in rows if r['province'] == p]
        ok = [r for r in pr if not r['disqualified']]
        ok.sort(key=lambda r: (-r['score'], r['seed']))
        chosen = mmr(ok, k_prov, wts)
        by_prov[p] = [entry(r, i + 1) for i, r in enumerate(chosen)]
        nd = len(pr) - len(ok)
        summary['disqualified'] += nd
        summary['per_province'][p] = dict(worlds=len(pr), qualified=len(ok), disqualified=nd,
                                          mean_score=round(sum(r['score'] for r in ok) / max(len(ok), 1), 3),
                                          best_score=round(ok[0]['score'], 3) if ok else None)
        for r in pr:
            if r['disqualified']:
                disq.append([p, r['seed'], r.get('start_failed')])
    overall = []
    for p in by_prov:
        overall += by_prov[p][:k_sheet]
    overall.sort(key=lambda e: (-e['score'], e['province'], e['seed']))
    for i, e in enumerate(overall):
        e = dict(e)
        e['overall_rank'] = i + 1
        overall[i] = e
    # pure global ranking (not balanced), so the effect of balancing is visible
    allq = sorted([r for r in rows if not r['disqualified']], key=lambda r: (-r['score'], r['province'], r['seed']))
    out = dict(weights_version=wts['version'], catalogue_run={k: cat['run'].get(k) for k in ('world_py_hash', 'worlds', 'n', 'size_m')},
               summary=summary, top24=overall, by_province=by_prov,
               global_top24_unbalanced=[[r['province'], r['seed'], r['score']] for r in allq[:24]],
               disqualified=disq,
               others=[[r['province'], r['seed'], r['score'], 'DISQ' if r['disqualified'] else '', failed_checks(r, r['parts'])]
                       for r in sorted(rows, key=lambda r: (r['province'], -r['score'], r['seed']))])
    with open(os.path.join(seeds_dir, 'shortlist.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    return out


if __name__ == '__main__':
    d = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'seeds')
    o = run(d)
    print(json.dumps(o['summary']))
