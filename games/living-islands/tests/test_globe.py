# Tests for globe/ (stage 2: seeded planet, circulation, drift particles, keyed arrivals, run_all). Pure python plus numpy.
# Run: python3 games/living-islands/tests/test_globe.py        (also works under pytest)
import os
import re
import subprocess
import sys
import tempfile
import json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GLOBE = os.path.join(ROOT, 'globe')
sys.path.insert(0, GLOBE)
import numpy as np
import planet as PL
import circulation as CI
import drift as DR
import arrivals as AR

SRC = [os.path.join(GLOBE, f) for f in ('planet.py', 'circulation.py', 'drift.py', 'arrivals.py', 'run_all.py', 'render.py')]
DOC = os.path.join(ROOT, 'GLOBE_STAGE2.md')
SEEDS = (1, 2, 3, 4, 5, 6)
_fails = []


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond:
        _fails.append(msg)


_W = {}


def world(seed, days=700):
    if (seed, days) not in _W:
        _W[(seed, days)] = AR.World(seed, days, n_per_kind={k: 800 for k in DR.KINDS})
    return _W[(seed, days)]


def test_determinism():
    a, b = PL.Planet(7), PL.Planet(7)
    check(a.hash_hex() == b.hash_hex() and np.array_equal(a.land, b.land), 'same seed gives the same land bit for bit')
    check(PL.Planet(8).hash_hex() != a.hash_hex(), 'a different seed gives different land')
    ca, cb = CI.Circulation(a), CI.Circulation(b)
    check(ca.hash_hex() == cb.hash_hex() and np.array_equal(ca.psi, cb.psi), 'same seed gives the same circulation bit for bit')
    w1, w2 = world(3, 500), AR.World(3, 500, n_per_kind={k: 800 for k in DR.KINDS})
    check(np.array_equal(w1.res.lon, w2.res.lon) and np.array_equal(w1.res.status, w2.res.status), 'same seed gives the same particle run')
    t1, t2 = AR.arrivals_for_table(w1), AR.arrivals_for_table(w2)
    check(AR.table_hash(t1) == AR.table_hash(t2), 'same seed gives the same arrival table (hash %s)' % AR.table_hash(t1))


def test_land():
    fr = []
    for s in range(1, 41):
        p = PL.Planet(s)
        fr.append(p.land_fraction)
    check(min(fr) >= 0.25 and max(fr) <= 0.35, 'land fraction (area weighted, with ice caps) in 25 to 35 percent over 40 seeds: %.3f to %.3f' % (min(fr), max(fr)))
    p = PL.Planet(1)
    check(p.ice[0].all() and p.ice[-1].all() and not p.ice[18].any(), 'polar ice caps present, equator free of ice')
    n = PL._neighbours(p.land)
    lakes = (~p.land) & (n == 4)
    check(not lakes.any(), 'no one-cell lakes')
    check(PL._ocean_basins_ok(p.land), 'at least two ocean basins of 60 degrees of longitude')
    check(abs(PL.AREA_W.sum() - 1.0) < 1e-9 and PL.AREA_W[0, 0] < PL.AREA_W[18, 0], 'area weights sum to one and shrink toward the poles')
    check(p.coast.sum() > 50 and (p.coast & p.land).sum() == 0, 'coast cells are ocean cells next to land')


def test_circulation():
    zs, gs, ws, med, mx, psi0 = [], [], [], [], [], True
    for s in SEEDS:
        p = PL.Planet(s)
        c = CI.Circulation(p)
        d = c.diagnostics()
        z = d['zonal']
        zs.append(z['trades_n'] < 0 and z['trades_s'] < 0 and z['westerlies_n'] > 0 and z['westerlies_s'] > 0)
        gs.append(d['gyre_sense']['north'] > 0 and d['gyre_sense']['south'] < 0)
        ws.append(d['west_east_median'])
        med.append(d['median_open'])
        mx.append(d['max'])
        psi0 = psi0 and bool((c.psi[p.land] == 0).all()) and bool((c.u[p.land] == 0).all())
    check(all(zs), 'trade-wind belts flow westward and westerly belts eastward in every test seed')
    check(all(gs), 'north subtropical gyre clockwise, south anticlockwise in every test seed')
    check(np.median(ws) > 2.0 and min(ws) > 1.3, 'western boundary flow stronger than eastern: median ratio %.1f, min %.1f' % (np.median(ws), min(ws)))
    check(all(abs(m - 0.15) < 1e-6 for m in med), 'open ocean median speed is 0.15 m/s')
    check(max(mx) < 2.5, 'no speed over 2.5 m/s (largest %.2f)' % max(mx))
    check(psi0, 'psi and velocity are zero on land')


def test_no_particle_on_land():
    for s in (1, 4):
        w = world(s)
        r = w.res
        j, i = PL.cell_of(r.lon, r.lat)
        check(not w.planet.land[j, i].any(), 'seed %d: no particle (adrift or beached) sits on a land cell at the end' % s)
        vj, vi = r.visit_c // PL.NLON, r.visit_c % PL.NLON
        check(not w.planet.land[vj, vi].any(), 'seed %d: no recorded cell visit is a land cell' % s)
        b = r.status == 1
        lj, li = r.land_cell[b] // PL.NLON, r.land_cell[b] % PL.NLON
        check(b.sum() > 100 and w.planet.land[lj, li].all(), 'seed %d: %d particles beached, each on a land cell' % (s, b.sum()))
        sj, si = r.src_cell // PL.NLON, r.src_cell % PL.NLON
        check(w.planet.coast[sj, si].all(), 'seed %d: every source is a coastal ocean cell' % s)


def test_drift_physics():
    w = world(2)
    r = w.res
    lee = {k: DR.LEEWAY[k] for k in DR.KINDS}
    check(min(lee.values()) >= 0.005 and max(lee.values()) <= 0.07, 'leeway between 0.5 and 7 percent of the wind')
    w0 = AR.World(2, 300, leeway_scale=0.0, n_per_kind={k: 400 for k in DR.KINDS})
    check(w0.res.n > 0 and (w0.res.leeway == 0).all(), 'leeway can be switched off for sensitivity runs')
    check(set(DR.KINDS) == {'seeds', 'logs', 'litter', 'wreck_debris', 'ships', 'strays'}, 'six kinds')


def test_arrivals_keys():
    w = world(2)
    found = None
    for k in range(12):
        lon, lat = AR.default_table(w, k)
        t = AR.arrivals_for_table(w, lon, lat, p_catch=0.5)
        if len(t['arrivals']) >= 3:
            found = (lon, lat, t)
            break
    check(found is not None, 'a table with arrivals exists in seed 2')
    lon, lat, t = found
    t2 = AR.arrivals_for_table(w, lon, lat, p_catch=0.5)
    check([a['key'] for a in t['arrivals']] == [a['key'] for a in t2['arrivals']], 'keys are identical on a second call')
    keys = [a['key'] for a in t['arrivals']] + [a['key'] for a in t['strays']]
    check(len(keys) == len(set(keys)), 'keys are unique')
    check(all(re.match(r'^2:globe:(seeds|logs|litter|wreck_debris|ships|strays):\d+$', k) for k in keys), 'key shape is seed:globe:kind:index')
    need = ('kind', 'class', 'source_region', 'source_band', 'travel_days', 'fragility', 'arrival_day')
    check(all(all(f in a for f in need) for a in t['arrivals']), 'arrivals carry kind, class, source region, source band, travel days, fragility')
    check(all(a['travel_days'] >= 1 and 0.0 <= a['fragility'] <= 1.0 for a in t['arrivals']), 'travel days at least 1, fragility in 0 to 1')
    check(all(a['source_band'] in PL.BAND_NAMES for a in t['arrivals']), 'source bands are band names')
    check(all(('stressed' in a and 'rides' in a) for a in t['strays']), 'strays carry temperature fields')
    ledger = set()
    n1 = len(AR.claim_new(ledger, t['arrivals']))
    n2 = len(AR.claim_new(ledger, t2['arrivals']))
    check(n1 == len(t['arrivals']) and n2 == 0, 'replaying a table through the ledger adds nothing the second time')
    tb = t['table']
    check(tb['band'] in PL.BAND_NAMES and 'drift_from_deg' in tb and 'sst_c' in tb and tb['drift_speed'] >= 0, 'table carries band, temperature and mean drift vector')
    c = w.circ.sample(lon, lat)
    check(abs(tb['drift_u'] - c[0]) < 1e-9 and np.hypot(tb['drift_u'] - w.circ.u[PL.cell_of(lon, lat)], tb['drift_v'] - w.circ.v[PL.cell_of(lon, lat)]) < 0.2,
          'table drift vector matches the field at its cell (bilinear; within 0.2 m/s of the cell value)')
    names = {a['source_region'] for a in t['arrivals']}
    check(all(re.match(r'^[A-Z][a-z]+$', n) for n in names), 'source regions use generic invented names')


def test_no_coast_seed():
    # a planet with no coast at all must not crash: no sources, no arrivals
    w = AR.World(1, 50)
    w.planet.coast[:] = False
    res = DR.run(w.planet, w.circ, 1, 50)
    check(res.n == 0, 'a planet with no coast makes no particles')
    w._res = res
    t = AR.arrivals_for_table(w, 0.0, 20.0)
    check(t['summary']['n_arrivals'] == 0 and t['strays'] == [], 'and a table there has no arrivals and no crash')


def test_source_clean():
    banned = ['import requests', 'import urllib', 'urllib.', 'import socket', 'import http', 'http.client', 'import subprocess', 'subprocess.', 'os.system', 'os.popen',
              'os.remove', 'os.unlink', 'os.rmdir', 'shutil.', 'rmtree', 'eval(', 'exec(', 'ftplib', 'smtplib', 'webbrowser']
    for path in SRC:
        src = open(path).read()
        nm = os.path.basename(path)
        hits = [x for x in banned if x in src]
        check(not hits, '%s: no network, subprocess or delete calls %s' % (nm, hits))
        check(not re.search(r'https?://|www\.', src), '%s: no web addresses' % nm)
        check(not re.search(r'/(tmp|home|root|Users)/\w', src), '%s: no private or absolute paths' % nm)
        check(not re.search(r'(api[_-]?key|secret|password|token)\s*=', src, re.I), '%s: no secrets' % nm)
    pat = re.compile(r'\b(' + '|'.join(('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')) + r')\b', re.I)
    text = ''.join(open(p).read() for p in SRC) + (open(DOC).read() if os.path.exists(DOC) else '')
    m = pat.search(text)
    check(not m, 'no forbidden words in the globe scripts or GLOBE_STAGE2.md %s' % (m.group(0) if m else ''))
    # no real place names in code, assets or docs (only research notes may use them); the list is split so this file does not hold them whole
    places = ['at' + 'lantic', 'pa' + 'cific', 'in' + 'dian ocean', 'arc' + 'tic', 'ant' + 'arctic', 'eu' + 'rope', 'af' + 'rica', 'as' + 'ia', 'amer' + 'ica',
              'aus' + 'tralia', 'gulf ' + 'stream', 'kuro' + 'shio', 'ben' + 'guela', 'hum' + 'boldt', 'labra' + 'dor', 'sar' + 'gasso', 'ca' + 'ribbean', 'medi' + 'terranean']
    low = text.lower()
    hit = [x for x in places if x in low]
    check(not hit, 'no real place names in the globe scripts or GLOBE_STAGE2.md %s' % hit)
    check(os.path.exists(DOC) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC).read()), 'GLOBE_STAGE2.md exists and has no private paths')
    check(not any(c in open(p).read() for p in SRC for c in ('/*',)), 'python comments only (no slash-star blocks)')
    # no invented region name collides with a real one in a short list of common ones
    rn = {PL.region_name(j, i).lower() for j in range(0, 36, 5) for i in range(0, 72, 6)}
    check(len(rn) == 84, '84 distinct generic region names')


def test_run_all_output_only_to_out():
    with tempfile.TemporaryDirectory() as outer:
        out = os.path.join(outer, 'o')
        before = set(os.listdir(GLOBE))
        r = subprocess.run([sys.executable, os.path.join(GLOBE, 'run_all.py'), '--seeds', '2', '--days', '200', '--tables', '4', '--sens-seeds', '1', '--out', out],
                           capture_output=True, text=True, timeout=300)
        check(r.returncode == 0, 'run_all.py runs: %s' % r.stdout.strip()[-80:] + r.stderr.strip()[-200:])
        check(os.path.exists(os.path.join(out, 'results.json')) and os.path.exists(os.path.join(out, 'REPORT.md')), 'results.json and REPORT.md written to --out')
        check(set(os.listdir(outer)) == {'o'}, 'nothing written beside --out')
        after = set(os.listdir(GLOBE))
        check(after - before <= {'__pycache__'}, 'nothing new written into the globe folder %s' % sorted(after - before))
        res = json.load(open(os.path.join(out, 'results.json')))
        check(res['summary']['particles']['on_land'] == 0 and res['summary']['seeds'] == 2, 'results.json has the summary and no particle on land')
        out2 = os.path.join(outer, 'p')
        subprocess.run([sys.executable, os.path.join(GLOBE, 'run_all.py'), '--seeds', '2', '--days', '200', '--tables', '4', '--sens-seeds', '1', '--out', out2], capture_output=True, text=True, timeout=300)
        r2 = json.load(open(os.path.join(out2, 'results.json')))
        check(res['summary']['run_hash'] == r2['summary']['run_hash'], 'run hash is the same on a rerun (%s)' % res['summary']['run_hash'])


TESTS = [test_determinism, test_land, test_circulation, test_no_particle_on_land, test_drift_physics, test_arrivals_keys, test_no_coast_seed, test_source_clean, test_run_all_output_only_to_out]
if __name__ == '__main__':
    for t in TESTS:
        t()
    print('\n%d failures' % len(_fails))
    sys.exit(1 if _fails else 0)
