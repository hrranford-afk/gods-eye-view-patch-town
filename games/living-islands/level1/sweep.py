# level1/sweep.py -- build and validate layout seeds 1..N (default 50) and write level1/sweep.json: pass or fail per seed and the reasons.
#   python3 level1/sweep.py [N]
import json
import multiprocessing as mp
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def one(seed):
    import layout as LY
    import validate as V
    t = time.time()
    try:
        L = LY.build_layout(seed)
        R = V.validate(L)
        M = R['metrics']
        row = dict(seed=seed, ok=R['ok'], hash=R['hash'], fails=R['fails'], soft_fails=R['soft_fails'], secs=round(time.time() - t, 1),
                   roles={r: d['key'] for r, d in L['roles'].items()},
                   trips={k: (round(v['mid_s']) if v.get('mid_s') else None) for k, v in M['trips'].items()},
                   hoard_walk={k: (round(v, 2) if isinstance(v, float) else v) for k, v in M.get('hoard_walk', {}).items() if k != 'list'},
                   timber=M['timber'], tiers={k: v for k, v in M['tiers'].items()},
                   sight=dict(water=round(M['sight']['water_share'], 2), shares={k: round(v, 2) for k, v in M['sight']['island_shares'].items()}),
                   wildlife=M['wildlife'], area=M['area_m2'], flat=M['flat_m2'], n_failed_checks=sum(1 for c in R['checks'] if not c['ok']))
    except Exception as e:     # a seed that cannot even be built is a result, not a crash
        row = dict(seed=seed, ok=False, hash=None, fails=['build_error: %s' % (str(e)[:80])], soft_fails=[], secs=round(time.time() - t, 1))
    return row


def run(n=50, procs=4):
    import pool
    pool.load_pool()           # build the cache once before the workers start
    with mp.Pool(procs) as p:
        rows = p.map(one, range(1, n + 1), chunksize=1)
    rows.sort(key=lambda r: r['seed'])
    return rows


if __name__ == '__main__':
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    t = time.time()
    rows = run(n)
    json.dump(rows, open(os.path.join(HERE, 'sweep.json'), 'w'), indent=1, sort_keys=True, default=float)
    ok = [r['seed'] for r in rows if r['ok']]
    print('seeds', n, 'pass', len(ok), ok, round(time.time() - t), 's')
    from collections import Counter
    c = Counter(f for r in rows for f in r['fails'])
    for k, v in c.most_common():
        print('  %-34s %d' % (k, v))
