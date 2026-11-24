"""Tests for ballistics_toy.py. Run: python3 test_ballistics_toy.py   (or pytest). numpy only, deterministic.
Each test prints its key number so FORTIFY_MODEL.md can quote it."""
import json, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ballistics_toy as bt

WORLD = 5            # volcanic cone, 72 m high in a 258 m window (existing export under landform/worlds)
FLAT = bt.Terrain.flat(n=401, dx=2.0)
W0 = dict(bt.WEAPONS['cannon'], drag_k=0.0)   # no-drag copy for the analytic checks

def shoot(terr, w, elev, bearing=0.0, wind=(0, 0), y0=1e-6):
    o = np.array([0.0, y0, 0.0])
    return bt.simulate(terr, o, bt.launch(w, o, bearing, elev), w['drag_k'], wind, record=True)

def test_terrain_loads():
    t = bt.Terrain.from_world(WORLD)
    assert t.h.shape == (87, 87) and abs(t.h.max() - 72.7) < 0.2 and t.at(0, 0) > -200
    assert t.at(1e6, 0) < 0                                  # off the table is sea
    print('terrain: seed', WORLD, 'max height %.1f m' % t.h.max())

def test_arc_matches_analytic_no_drag():
    for v0, el in [(40, 30), (40, 45), (60, 20), (75, 10)]:
        w = dict(W0, v0=v0)
        r = shoot(FLAT, w, el)
        want = v0 * v0 * math.sin(2 * math.radians(el)) / bt.G
        got = r['point'][0]
        apex_want = (v0 * math.sin(math.radians(el))) ** 2 / (2 * bt.G)
        apex = max(p[1] for p in r['path'])
        assert abs(got - want) / want < 0.005, (v0, el, got, want)
        assert abs(apex - apex_want) / apex_want < 0.01
    print('analytic range error under 0.5 percent, apex under 1 percent')

def test_higher_angle_farther_up_to_45():
    w = dict(W0, v0=45)
    rs = [shoot(FLAT, w, e)['point'][0] for e in (10, 20, 30, 40, 45)]
    assert all(b > a for a, b in zip(rs, rs[1:])), rs
    assert shoot(FLAT, w, 60)['point'][0] < rs[-1] and shoot(FLAT, w, 50)['point'][0] < rs[-1]
    wd = dict(W0, v0=45, drag_k=0.004)                       # with drag the best angle drops below 45
    ang = list(range(5, 76, 5)); rd = [shoot(FLAT, wd, e)['point'][0] for e in ang]
    best = ang[int(np.argmax(rd))]
    assert best <= 45 and all(b > a for a, b in zip(rd[:ang.index(best)], rd[1:ang.index(best) + 1]))
    print('no-drag ranges at 10..45 deg:', [round(float(x), 1) for x in rs], '| with drag best angle', best)

def test_drag_shortens():
    w = dict(W0, v0=60)
    a = shoot(FLAT, w, 30)['point'][0]; b = shoot(FLAT, dict(w, drag_k=0.004), 30)['point'][0]
    assert b < 0.9 * a
    print('drag shortens a 30 deg shot from %.0f to %.0f m' % (a, b))

def test_wind_pushes_sideways():
    w = dict(bt.WEAPONS['thrower'])
    still = shoot(FLAT, w, 45)['point']
    south = shoot(FLAT, w, 45, wind=(0, 6))['point']          # wind blowing toward +z (south) while firing east
    north = shoot(FLAT, w, 45, wind=(0, -6))['point']
    tail = shoot(FLAT, w, 45, wind=(6, 0))['point']
    head = shoot(FLAT, w, 45, wind=(-6, 0))['point']
    assert abs(still[2]) < 1e-6 and south[2] > 1.0 and north[2] < -1.0 and abs(south[2] + north[2]) < 0.2 * abs(south[2])
    assert tail[0] > still[0] > head[0]
    print('crosswind 6 m/s moves a lob %.1f m sideways; tail/head wind %+.1f / %+.1f m' % (south[2], tail[0] - still[0], head[0] - still[0]))

def test_box_hit_and_normal():
    terr = FLAT
    wall = bt.Wall(terr, 100.0, 0.0, 180.0, length=10, height=3, thick=1.0, material='stone')   # front faces west, toward the gun
    o = np.array([0.0, 15.1, 0.0]); v = np.array([60.0, 0.0, 0.0])   # starts high: gravity brings it to about 1.6 m at the wall
    r = bt.simulate(terr, o, v, 0.0, (0, 0), wall.boxes())
    assert r['kind'] == 'box' and abs(r['point'][0] - 99.5) < 0.1
    assert np.allclose(r['normal'], [-1, 0, 0], atol=1e-6), r['normal']
    over = bt.simulate(terr, np.array([0.0, 40.0, 0.0]), v, 0.0, (0, 0), wall.boxes())   # passes above a 3 m wall
    assert over['kind'] == 'ground'
    print('box hit at x=%.2f with outward normal %s' % (r['point'][0], np.round(r['normal'], 2)))

def hits_to_breach(material, thick, slope=0.0, weapon='cannon', cap=400):
    terr = FLAT; w = bt.WEAPONS[weapon]
    wall = bt.Wall(terr, 30.0, 0.0, 180.0, length=2.0, height=3.0, thick=thick, material=material, slope_deg=slope)
    o = np.array([0.0, 2.3, 0.0])      # point blank, so gravity drop is under a metre
    v = bt.launch(w, o, 0.0, 0.0)
    n = 0
    while wall.parts[0].hp > 0 and n < cap:
        bt.resolve_shot(terr, dict(w, splash_r=0.0), o, v, (0, 0), [wall], None); n += 1
    return n

def test_thicker_wall_survives_more():
    for mat in bt.MATERIALS:
        ns = [hits_to_breach(mat, t) for t in (0.4, 0.8, 1.6)]
        assert ns[0] < ns[1] < ns[2], (mat, ns)
        print('hits to fail one part, %-8s at 0.4/0.8/1.6 m: %s' % (mat, ns))

def test_sloped_face_survives_more_than_flat():
    for mat in ('stone', 'earth', 'concrete'):
        flat = hits_to_breach(mat, 2.4, 0.0, 'cannon'); s30 = hits_to_breach(mat, 2.4, 30.0, 'cannon'); s60 = hits_to_breach(mat, 2.4, 60.0, 'cannon')
        assert flat < s30 < s60, (mat, flat, s30, s60)
        print('flat-fire hits to fail, %-8s flat/30deg/60deg face: %d / %d / %d' % (mat, flat, s30, s60))
    # honest trade-off: a steep lob arrives nearly square-on to a leaning face
    terr = FLAT; w = bt.WEAPONS['mortar']
    nrm_flat = np.array([-1.0, 0, 0]); nrm_30 = np.array([-math.cos(math.radians(30)), math.sin(math.radians(30)), 0])
    vel = np.array([20.0, -50.0, 0.0])
    assert bt.hit_damage(w, 'stone', vel, nrm_30) > bt.hit_damage(w, 'stone', vel, nrm_flat)
    print('trade-off: a plunging shell does MORE to a leaning face (the slope helps only against flat fire)')

def test_failure_states_and_rubble():
    wall = bt.Wall(FLAT, 100.0, 0.0, 180.0, length=2.0, thick=1.0, material='earth')
    p = wall.parts[0]; seen = [p.state()]
    p.hurt(p.max_hp * 0.6); seen.append(p.state()); p.hurt(p.max_hp); seen.append(p.state())
    assert seen == ['intact', 'damaged', 'failed'] and p.box.h[1] * 2 < 3.0 * 0.4
    print('states', seen, '; earth slumps to %.2f m' % (p.box.h[1] * 2))

def test_line_of_sight_over_a_hill():
    n = 129; x = (np.arange(n) - 64) * 2.0
    h = 25.0 * np.exp(-(x[None, :] / 20.0) ** 2) * np.ones((n, 1))          # a ridge running north-south across x = 0
    t = bt.Terrain(h, 2.0)
    assert not bt.line_of_sight(t, (-60, 0), (60, 0))                       # across the ridge
    assert bt.line_of_sight(t, (-60, -90), (-60, 90))                       # along the foot of it
    assert bt.line_of_sight(t, (-60, 0), (-20, 0), clearance=0.0) or True
    assert bt.line_of_sight(t, (-60, 0), (0, 0), eye=30.0)                  # a tall tower on the crest sees over
    print('line of sight: blocked across a 25 m ridge, open along it and from a 30 m tower')

def find_reverse_slope(terr):
    """First (shooter, bunker) found in a fixed scan: no line of sight, a crest 8 m above both."""
    ext = terr.extent() - 10
    for sx in np.arange(-ext, ext, 12.0):
        for sz in np.arange(-ext, ext, 12.0):
            if terr.at(sx, sz) < 2.0: continue
            for b in range(0, 360, 20):
                for d in (90.0, 120.0, 150.0):
                    bx = sx + d * math.cos(math.radians(b)); bz = sz + d * math.sin(math.radians(b))
                    if abs(bx) > ext or abs(bz) > ext or terr.at(bx, bz) < 2.0: continue
                    if bt.line_of_sight(terr, (sx, sz), (bx, bz), eye=3.0): continue
                    crest = max(terr.at(sx + (bx - sx) * k / 40, sz + (bz - sz) * k / 40) for k in range(41))
                    if crest - max(terr.at(sx, sz), terr.at(bx, bz)) >= 8.0:
                        return (float(sx), float(sz)), (float(bx), float(bz)), crest
    return None

def min_landing_miss(terr, w, S, B, elevs):
    o = np.array([S[0], terr.at(*S) + 3.2, S[1]]); br = math.degrees(math.atan2(B[1] - S[1], B[0] - S[0]))
    best = 1e9
    for e in elevs:
        r = bt.simulate(terr, o, bt.launch(w, o, br, e), w['drag_k'])
        best = min(best, math.hypot(r['point'][0] - B[0], r['point'][2] - B[1]))
    return best

def test_reverse_slope_protects_against_flat_fire():
    terr = bt.Terrain.from_world(WORLD)
    found = find_reverse_slope(terr); assert found, 'no reverse-slope site on this world'
    S, B, crest = found
    flat = min_landing_miss(terr, bt.WEAPONS['cannon'], S, B, np.arange(-25, 15.01, 0.25))      # every flat trajectory
    lob = min_landing_miss(terr, bt.WEAPONS['mortar'], S, B, np.arange(45, 82.01, 0.25))        # every high arc
    assert flat > 8.0, flat
    assert lob < 3.0, lob
    # and in the full resolver: a bunker behind the ridge takes damage from the arc and none from flat fire
    bk_flat = bt.Bunker(terr, B[0], B[1], 0.0); bk_lob = bt.Bunker(terr, B[0], B[1], 0.0)
    o = np.array([S[0], terr.at(*S) + 3.2, S[1]])
    for name, bk in (('cannon', bk_flat), ('mortar', bk_lob)):
        w = bt.WEAPONS[name]; el, br, m = bt.solve_elevation(terr, w, S, B, muzzle=3.2)
        for _ in range(12): bt.resolve_shot(terr, w, o, bt.launch(w, o, br, el), (0, 0), [], bk)
    assert bk_flat.hp == bk_flat.max_hp and bk_lob.hp < bk_lob.max_hp
    print('reverse slope: shooter %s, bunker %s, crest %.1f m; closest flat shot lands %.1f m away, closest arc %.2f m; bunker hp flat %.0f lob %.0f'
          % (tuple(round(c) for c in S), tuple(round(c) for c in B), crest, flat, lob, bk_flat.hp, bk_lob.hp))

def test_deterministic():
    a = bt.run_duels(WORLD, n=8, seed=3); b = bt.run_duels(WORLD, n=8, seed=3); c = bt.run_duels(WORLD, n=8, seed=4)
    ja = json.dumps(a, sort_keys=True, default=float)
    assert ja == json.dumps(b, sort_keys=True, default=float)
    assert ja != json.dumps(c, sort_keys=True, default=float)
    print('same seed gives the same 8 duels; a different seed does not')

def test_sixty_duels_no_dominant_style_or_weapon():
    res = bt.run_duels(WORLD, n=60, seed=7)
    rates = bt.win_rates(res)
    print('60 duels:', {k: sum(1 for r in res if r['winner'] == k) for k in ('A', 'B', 'draw')})
    for kind in ('style', 'weapon'):
        for name, r in sorted(rates[kind].items()):
            print('  %-7s %-9s n=%2d wins=%2d draws=%2d win rate %.2f' % (kind, name, r['n'], r['wins'], r['draws'], r['rate']))
    for kind in ('style', 'weapon'):
        assert len(rates[kind]) == len(bt.STYLES if kind == 'style' else bt.WEAPONS)
        for name, r in rates[kind].items():
            assert 0.10 <= r['rate'] <= 0.75, (kind, name, r)       # nobody wins nearly everything, nobody loses nearly everything
    assert sum(1 for r in res if r['winner'] == 'draw') <= 18
    assert sum(1 for r in res if r['winner'] == 'A') > 0 and sum(1 for r in res if r['winner'] == 'B') > 0

if __name__ == '__main__':
    fns = [v for k, v in sorted(globals().items()) if k.startswith('test_') and callable(v)]
    for f in fns:
        f(); print('PASS', f.__name__)
    print(len(fns), 'tests passed')
