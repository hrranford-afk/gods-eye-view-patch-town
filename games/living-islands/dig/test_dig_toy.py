"""dig/test_dig_toy.py -- checks for dig_toy.py.   python3 dig/test_dig_toy.py   (numpy only, deterministic, about a minute)"""
import hashlib
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dig_toy as D

VOLC, GNEISS = 5, 62          # one volcanic cone window and one gneiss window from landform/worlds
RESULTS = []


def check(name, ok, msg=''):
    RESULTS.append((name, bool(ok), msg))
    print(('PASS ' if ok else 'FAIL ') + name + ('   ' + msg if msg else ''))
    return ok


def flat_patch(material, n_m=24.0, dx=0.5, h=5.0):
    """A level patch of one material, far from any sea, for the wall tests."""
    n = int(n_m / dx)
    g = D.Ground(np.full((n, n), h), np.full((n, n), h - 1), np.full((n, n), D.MI['soft_rock']), np.full((n, n), D.MI['soil']), np.full((n, n), 0.2),
                 np.full((n, n), 6), dx, 0.0, name='flat ' + material)
    g.set_material(material)
    return g


def trench_in(material, depth=1.2, soaked=False, props=False, frozen=False):
    g = flat_patch(material)
    g.frozen = frozen
    if soaked:
        g.soak[:] = 1.0
    mid = 12.0
    info = D.dig_trench(g, (mid - 3, mid), (mid + 3, mid), width=1.0, depth=depth, bank_width=2.5)
    if props:
        # timber panels hold the two walls: mark the cells next to the cut
        cut = info['cut']
        p = np.zeros_like(cut)
        for di in (-2, -1, 0, 1, 2):
            p |= np.roll(cut, di, 0)
        g.props = p
    s = D.slump(g)
    cut = info['cut']
    centre_depth = float((g.h0[cut] - g.h[cut]).mean())
    # width of ground more than 0.3 m below the old surface across the middle row
    mid_col = int(mid / g.dx)
    row = g.h0[:, mid_col] - g.h[:, mid_col]
    width = float((row > 0.3).sum() * g.dx)
    return dict(g=g, info=info, slump=s, depth=centre_depth, width=width)


def t_volume_conserved():
    errs = []
    for mat in ('sand', 'clay', 'soft_rock'):
        g = flat_patch(mat)
        before = g.h.sum() * g.dx ** 2
        info = D.dig_trench(g, (9, 12), (15, 12), 1.0, 1.2)
        after_dig = g.h.sum() * g.dx ** 2
        e1 = D.conservation(info)
        loose_gain = after_dig - before                     # spoil placed loose minus hole: equals (bulk - 1) x removed
        e2 = abs(loose_gain - (info['bulk'] - 1.0) * info['removed_m3']) / info['removed_m3']
        s = D.slump(g)
        e3 = abs(g.h.sum() * g.dx ** 2 - after_dig) / after_dig
        errs += [e1, e2, e3]
    check('volume is conserved (dig, bank, slump)', max(errs) < 0.01, 'worst relative error %.2e (limit 1 percent), three materials' % max(errs))
    g = D.build_ground(D.load_world(VOLC))
    before = g.h.sum() * g.dx ** 2
    r = D.level_pad(g, 40, 40, 9.0)
    check('level pad: cut equals fill', abs(r['cut_m3'] - r['fill_m3']) / max(r['cut_m3'], 1e-9) < 0.01, 'cut %.1f m3, fill %.1f m3' % (r['cut_m3'], r['fill_m3']))


def t_slump_converges():
    t = trench_in('sand', depth=1.2)
    s = t['slump']
    t2 = trench_in('sand', depth=1.2)
    again = D.slump(t['g'])
    check('slump converges', s['converged'] and s['iters'] < 6000, '%d iterations, residual %.4f m' % (s['iters'], s['residual_m']))
    check('slump is finished: a second pass moves nothing', again['moved_m3'] < 0.02 * max(s['moved_m3'], 1e-9) + 1e-6, 'first pass moved %.2f m3, second %.4f m3' % (s['moved_m3'], again['moved_m3']))
    bad = D.stand_height(t['g'])
    check('slump keeps heights finite', np.isfinite(t['g'].h).all())


def t_walls():
    rock = trench_in('hard_rock')
    sand = trench_in('sand')
    soft = trench_in('soft_rock')
    check('trench in hard rock keeps its walls', rock['depth'] > 1.15 and rock['width'] <= 1.6 and rock['slump']['moved_m3'] < 0.01,
          'depth %.2f of 1.20 m, width %.1f m, slump moved %.3f m3' % (rock['depth'], rock['width'], rock['slump']['moved_m3']))
    check('the same trench in sand slumps', sand['depth'] < 0.8 * 1.2 and sand['width'] > 1.5 * rock['width'] and sand['slump']['moved_m3'] > 1.0,
          'depth %.2f of 1.20 m, width %.1f m (rock %.1f m), moved %.2f m3' % (sand['depth'], sand['width'], rock['width'], sand['slump']['moved_m3']))
    check('soft rock stands at 1.2 m', soft['depth'] > 1.15, 'depth %.2f m' % soft['depth'])
    dry = trench_in('clay')
    wet = trench_in('clay', soaked=True)
    check('clay stands dry and slumps soaked (rain softens)', dry['depth'] > 1.15 and wet['depth'] < dry['depth'] - 0.2,
          'dry depth %.2f m, soaked %.2f m' % (dry['depth'], wet['depth']))
    deep = trench_in('clay', depth=2.2)
    check('clay deeper than its stand height slumps', deep['depth'] < 2.0, 'cut 2.2 m deep stands at %.2f m' % deep['depth'])
    pr = trench_in('sand', props=True)
    check('timber props hold a sand trench', pr['depth'] > 1.0 and pr['slump']['moved_m3'] < sand['slump']['moved_m3'] * 0.5,
          'with props depth %.2f m (moved %.2f m3); without %.2f m (moved %.2f m3)' % (pr['depth'], pr['slump']['moved_m3'], sand['depth'], sand['slump']['moved_m3']))
    # angle of repose: the slumped sand face is near the repose angle
    g = sand['g']
    mid_col = int(12.0 / g.dx)
    prof = g.h[:, mid_col]
    sl = np.degrees(np.arctan(np.abs(np.diff(prof)) / g.dx))
    check('slumped sand face is no steeper than its repose angle', sl.max() < D.PROPS['sand']['repose'] + 4.0, 'steepest %.1f degrees, repose %.0f' % (sl.max(), D.PROPS['sand']['repose']))
    fz = trench_in('clay', frozen=True, depth=1.9)
    th = trench_in('clay', frozen=False, depth=1.9)
    check('frozen ground stands taller than thawed', fz['depth'] > th['depth'], 'frozen %.2f m, thawed %.2f m (cut 1.9)' % (fz['depth'], th['depth']))


def t_cost():
    hrs = {}
    for m in D.MAT:
        g = flat_patch(m)
        info = D.dig_trench(g, (9, 12), (15, 12), 1.0, 1.0)
        hrs[m] = info['hours'] / info['removed_m3']
    order = ['sand', 'soil', 'clay', 'gravel', 'soft_rock', 'hard_rock']
    mono = all(hrs[order[i]] <= hrs[order[i + 1]] + 1e-9 for i in range(len(order) - 1))
    check('dig cost rises sand < soil < clay < gravel < soft rock < hard rock', mono, ' '.join('%s %.1f' % (m, hrs[m]) for m in D.MAT) + '  (person-hours per m3)')
    g = flat_patch('clay')
    a = D.dig_trench(g, (9, 12), (15, 12), 1.0, 1.0)['hours'] / 6.0
    g = flat_patch('clay')
    g.frozen = True
    b = D.dig_trench(g, (9, 12), (15, 12), 1.0, 1.0)['hours'] / 6.0
    check('frozen ground costs about 3 times more', 2.5 < b / a < 4.5, 'ratio %.2f' % (b / a))
    ok = all(D.PROPS[m]['rate_lo'] <= D.PROPS[m]['rate'] <= D.PROPS[m]['rate_hi'] for m in D.MAT)
    check('rates sit inside their stated ranges', ok)
    g = flat_patch('clay')
    sh = D.dig_trench(g, (9, 12), (15, 12), 1.0, 1.0)['hours']
    g = flat_patch('clay')
    dp = D.dig_trench(g, (9, 12), (15, 12), 1.0, 2.0)['hours']
    check('a deeper trench costs more than double per m3', dp / sh > 2.0, 'depth 2 m costs %.2f x the 1 m trench' % (dp / sh))
    tn = D.tunnel_hours(D.build_ground(D.load_world(GNEISS)), 64, 64, 12.0)
    check('tunnel cost reports a volume and hours', tn['hours'] > 0 and tn['volume_m3'] > 0, '%s: %.1f m3, %.0f person-hours' % (tn['material'], tn['volume_m3'], tn['hours']))


def t_materials_from_worlds():
    for seed, expect in ((VOLC, ('ash', 'hard_rock')), (GNEISS, ('hard_rock', 'soil'))):
        g = D.build_ground(D.load_world(seed))
        land = g.h > g.sea
        used = {D.MAT[i] for i in np.unique(g.surface_mat()[land])}
        check('materials from the %s window' % g.name, all(e in used for e in expect), 'surface materials on land: ' + ', '.join(sorted(used)))


def t_viewshed():
    g = D.synthetic_ridge()
    obs = (20, 8)                       # west of the ridge (ridge at column 50)
    vis, m = D.viewshed(g.h, g.dx, obs, sea=g.sea)
    west = vis[:, 12:44].mean()
    east = vis[:, 56:90].mean()
    check('viewshed shrinks behind a ridge', west > 0.9 and east < 0.3, 'seen on the near side %.0f percent, behind the ridge %.0f percent' % (100 * west, 100 * east))
    check('dead ground has positive cover margin', m[20, 70] > 2.0, 'ridge rises %.1f m above the sight line at column 70' % m[20, 70])
    h2 = g.h.copy()
    h2[:, 30:34] += 3.0                  # a spoil bank across the lane
    v2, _ = D.viewshed(h2, g.dx, obs, sea=g.sea)
    check('a mound shrinks the view', v2[:, 36:48].mean() < vis[:, 36:48].mean() - 0.1, 'before %.2f, after %.2f' % (vis[:, 36:48].mean(), v2[:, 36:48].mean()))
    w = D.load_world(VOLC)
    gv = D.build_ground(w)
    a = D.approach_points(gv)[0]
    v, _ = D.viewshed(gv.h, gv.dx, a, sea=gv.sea)
    land = gv.h > gv.sea
    check('real cone has dead ground', 0.05 < 1 - v[land].mean() < 0.95, 'volcanic window: %.0f percent of land hidden from the first landing' % (100 * (1 - v[land].mean())))


def t_drainage():
    g = flat_patch('clay')
    n = g.shape[0]
    yy, xx = np.meshgrid(np.arange(n), np.arange(n), indexing='ij')
    g.h = g.h + 0.02 * xx * g.dx          # falls to the west: 2 percent
    g.h0 = g.h.copy()
    info = D.dig_trench(g, (9, 12), (15, 12), 1.0, 1.2, bank_width=2.5)
    d = D.drainage(g.h, g.dx, g.sea)
    pond = float(d['pond'][info['cut']].max())
    r0 = int(12.0 / g.dx)
    c0 = int(9.0 / g.dx)
    dd = D.carve_drain(g, (r0, c0), fall=0.01)
    d2 = D.drainage(g.h, g.dx, g.sea)
    pond2 = float(d2['pond'][info['cut']].max())
    check('water pools in a new trench', pond > 0.5, 'standing depth %.2f m with no outlet (source: %s)' % (pond, d['source']))
    check('a drain ditch lets it out', pond2 < 0.1 and pond2 < pond * 0.25, 'after a %d-cell drain (%.1f m3 cut) standing depth %.2f m' % (dd['cells'], dd['volume_m3'], pond2))
    wt = D.water_table_depth(D.build_ground(D.load_world(GNEISS)))
    check('water table depth is sensible', 0.15 <= wt.min() and wt.max() <= 6.0, 'range %.2f to %.2f m' % (wt.min(), wt.max()))


def t_sites():
    g = D.synthetic_ridge()
    ap = [(20, 8)]
    res = D.score_sites(g, ap, top_k=5000)
    sites = D.best_sites(res, g, k=3, min_sep_m=15.0)
    cols = [c for r, c in sites]
    check('site finder prefers the dry reverse slope', all(52 <= c <= 64 for c in cols[:2]), 'best columns %s (ridge 50, wet hollow 66 to 80)' % cols)
    hollow = res['score'][:, 68:78]
    top = res['score'][sites[0]]
    check('...over the wet hollow', top > np.nanmax(np.where(np.isnan(hollow), -1, hollow)) if not np.isnan(hollow).all() else True,
          'best %.2f; best in the hollow %.2f' % (top, np.nanmax(hollow) if not np.isnan(hollow).all() else float('nan')))
    # forward slope (facing the approach) must score worse than the reverse slope
    fwd = np.nanmax(res['score'][:, 38:47]) if not np.isnan(res['score'][:, 38:47]).all() else 0.0
    check('...and over the forward slope', top > fwd, 'forward slope best %.2f' % fwd)
    for seed in (VOLC, GNEISS):
        gw = D.build_ground(D.load_world(seed))
        r = D.score_sites(gw)
        s5 = D.best_sites(r, gw, k=5)
        sc = r['score']
        ok_all = r['land'] & ~np.isnan(r['cover'])
        mean_cover_top = float(np.mean([r['cover'][s] for s in s5])) if s5 else 0.0
        mean_cover_all = float(r['cover'][r['land']].mean())
        mean_drain_top = float(np.mean([r['drain'][s] for s in s5])) if s5 else 0.0
        wet_mask = r['land'] & (r['drain'] < 0.3)
        check('best sites on %s have more cover and drier floors than the average land' % gw.name, len(s5) > 0 and mean_cover_top > mean_cover_all and mean_drain_top > 0.6,
              'cover top %.2f vs land %.2f; drain top %.2f; wet cells %d' % (mean_cover_top, mean_cover_all, mean_drain_top, int(wet_mask.sum())))
        if wet_mask.any():
            wet_best = float(np.nanmax(np.where(wet_mask & ~np.isnan(sc), sc, np.nan))) if (wet_mask & ~np.isnan(sc)).any() else 0.0
            check('no wet hollow beats the best site on %s' % gw.name, wet_best <= sc[s5[0]] + 1e-12, 'best wet cell %.2f, best site %.2f' % (wet_best, sc[s5[0]]))


def digest(seed):
    g = D.build_ground(D.load_world(seed))
    r = D.score_sites(g)
    s = D.best_sites(r, g, k=5)
    t = D.try_trench_at(g, *s[0]) if s else None
    blob = np.nan_to_num(r['score']).tobytes() + repr(s).encode() + (np.round(t['ground'].h, 9).tobytes() if t else b'')
    return hashlib.sha1(blob).hexdigest()[:12]


def t_determinism():
    a = [digest(VOLC), digest(GNEISS)]
    b = [digest(VOLC), digest(GNEISS)]
    check('results are deterministic (same digest twice)', a == b, 'volcanic %s, gneiss %s' % (a[0], a[1]))


def t_random_sites():
    rng = np.random.default_rng(11)
    rows = []
    t0 = time.time()
    for seed in (VOLC, GNEISS):
        g = D.build_ground(D.load_world(seed))
        land = np.argwhere((g.h > g.sea + 1.0) & (D.slope_deg(g.h, g.dx) < 35))
        land = land[(land[:, 0] > 6) & (land[:, 0] < g.shape[0] - 7) & (land[:, 1] > 6) & (land[:, 1] < g.shape[1] - 7)]
        pick = rng.choice(len(land), 30, replace=False)
        for k in pick:
            r, c = (int(v) for v in land[k])
            t = D.try_trench_at(g, r, c)
            rows.append((seed, r, c, t))
    errs = [D.conservation(t['info']) for *_, t in rows]
    sums = [t['sum_err'] for *_, t in rows]
    conv = [t['slump']['converged'] for *_, t in rows]
    fin = all(np.isfinite(t['hours']) and np.isfinite(t['floor_depth']) for *_, t in rows)
    depth = np.array([t['floor_depth'] for *_, t in rows])
    check('60 random sites run', len(rows) == 60 and fin, '%d sites in %.0f s' % (len(rows), time.time() - t0))
    check('60 sites: volume conserved to 1 percent', max(errs) < 0.01 and max(sums) / 100.0 < 0.01, 'worst bank error %.1e, worst slump drift %.1e m (sum of heights)' % (max(errs), max(sums)))
    check('60 sites: slump converges', all(conv), '%d of 60' % sum(conv))
    check('60 sites: some trenches hold, some slump', depth.min() < 1.0 and depth.max() > 1.1, 'standing depth after slump from %.2f to %.2f m (cut 1.2)' % (depth.min(), depth.max()))
    hard = [t['floor_depth'] for s, r, c, t in rows if D.MAT[D.build_ground(D.load_world(s)).surface_mat()[r, c]] == 'hard_rock']
    loose = [t['floor_depth'] for s, r, c, t in rows if D.MAT[D.build_ground(D.load_world(s)).surface_mat()[r, c]] in ('sand', 'gravel', 'ash')]
    if hard and loose:
        check('hard-rock sites hold more depth than loose sites', np.mean(hard) > np.mean(loose), 'hard rock %.2f m (n=%d), loose %.2f m (n=%d)' % (np.mean(hard), len(hard), np.mean(loose), len(loose)))


def main():
    for f in (t_volume_conserved, t_slump_converges, t_walls, t_cost, t_materials_from_worlds, t_viewshed, t_drainage, t_sites, t_determinism, t_random_sites):
        f()
    bad = [n for n, ok, _ in RESULTS if not ok]
    print('\n%d checks, %d failed' % (len(RESULTS), len(bad)))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
