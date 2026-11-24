# level1/report.py -- prints the numbers of one layout seed as markdown tables (the design doc quotes them) and writes level1/chosen.json.
#   python3 level1/report.py [seed]
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import layout as LY    # noqa: E402
import validate as V   # noqa: E402
import tide as TD      # noqa: E402


def md(rows, head):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def main(seed):
    L = LY.build_layout(seed)
    R = V.validate(L)
    M, A = R['metrics'], R['analysis']
    out = {}
    print('## seed', seed, 'hash', L['hash'], 'ok', R['ok'], R['fails'], 'soft', R['soft_fails'])
    rows = []
    for k, r in enumerate(LY.ROLES):
        d = L['roles'][r]
        m = (L['owner'] == k) & (L['H'] > 0)
        rr, cc = np.nonzero(m)
        ext = (max(rr.max() - rr.min(), cc.max() - cc.min()) + 1) * LY.DX if len(rr) else 0
        rows.append([r, d['key'], d['prov'], 'k%d%s' % (d['k'], ' mirrored' if d['flip'] else ''), '(%.0f, %.0f)' % tuple(d['at']), int(M['area_m2'][r]), '%.0f' % ext, '%.1f' % (L['H'][m].max() if m.any() else 0), M['flat_m2'][r]])
    print(md(rows, ['role', 'source', 'prov', 'turn', 'at (x, z) m', 'land m2', 'extent m', 'top m', 'flat m2']))
    rows = []
    for k, t in R['trips'].items():
        f = lambda v: '-' if v is None else '%.0f' % v
        rows.append([k.replace('>', ' to '), f(t.get('mid_m')), f(t.get('mid_s')), f(t.get('low_s')), f(t.get('high_s')), f(t.get('mid_fast_s')), '%d to %d' % (t['lo'], t['hi'])])
    print(md(rows, ['trip', 'metres (mid)', 'tender s mid', 'tender s low', 'tender s high', 'fast boat s mid', 'target s']))
    hw = M['hoard_walk']
    print('hoard walk', {k: v for k, v in hw.items() if k != 'list'})
    print('windows', hw['list'])
    print('sill', M.get('woods_sill'))
    # tide table for the first 10 days: low-water minimum and hoard bar window
    h0 = TD.GIFT_START_HOURS - 5.0
    rows = []
    ts = hw['tstar']
    for day in range(1, 15):
        t = np.arange(h0 + (day - 1) * 24, h0 + day * 24, 1 / 60.0)
        lv = TD.level(t)
        ws = [w for w in TD.windows(ts, h0 + (day - 1) * 24, h0 + day * 24)]
        sill = [w for w in TD.windows(M['woods_sill']['tstar'], h0 + (day - 1) * 24, h0 + day * 24)] if M.get('woods_sill') else []
        rows.append([day, '%.2f' % lv.min(), '%.2f' % lv.max(), '; '.join('%s to %s (%d min)' % (TD.clock_str(a)[6:], TD.clock_str(b)[6:], round((b - a) * 60)) for a, b in ws) or '-', '; '.join('%d min' % round((b - a) * 60) for a, b in sill) or '-'])
    print(md(rows, ['day', 'lowest tide m', 'highest m', 'Hoard bar open (tide at or under %.2f m)' % ts, 'woods sill open (min)']))
    rows = []
    for r in LY.ROLES:
        s = M['shores'][r]
        rows.append([r, int(s['coast_m']), int(s['collectable_m']), '%.2f' % s['E_prev'], '%.2f' % s['E_storm'], int(s['lee_m']), int(s['haul_pieces']), '%.0f' % s['items_per_tide']])
    print(md(rows, ['island', 'coast m', 'strand m', 'E (prevailing)', 'E (storm WSW)', 'lee m (<0.30)', 'Great Wash pieces', 'wrack items per tide']))
    print('timber', M['timber'])
    print('hydrology', M['hydrology'])
    print('drift', M['drift'])
    print('wildlife', M['wildlife'], M.get('seal_sites_by_role'))
    print('tiers', M['tiers'])
    print('sight', {k: (round(v, 2) if isinstance(v, float) else v) for k, v in M['sight'].items()})
    print('robots', M['robots'])
    print('depot', L['depot'], 'reef', L['reef'] and {k: v for k, v in L['reef'].items() if k != 'heads'}, 'bars', [(b['name'], round(b['length_m']), round(b['crest_mid'], 2)) for b in L['bars']])
    print('landmarks', L['landmarks'])
    print('spots', {k: tuple(round(x) for x in v) for k, v in A.spots.items()}, 'landings', A.landings, 'moor', A.moor)
    print('notes', L['notes'].get('crest'))
    json.dump(dict(seed=seed, hash=L['hash'], ok=R['ok'], metrics=M, roles=L['roles']), open(os.path.join(HERE, 'chosen.json'), 'w'), indent=1, sort_keys=True, default=float)


if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 1)
