"""Plain python3 tests for province D, rock3d, cutaway and the page:  python3 landform/tests/test_volcano.py
(needs numpy + PIL; the page test needs node + playwright (NODE_PATH=/opt/node-tools/node_modules) and is skipped with a note if missing)."""
import json, os, subprocess, sys, tempfile, time
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
LF = os.path.join(HERE, '..')
sys.path.insert(0, LF)
import world as W
import rock3d as R
import cutaway as C
import volcano_checks as VC

ROOT = os.path.abspath(os.path.join(LF, '..'))
ok = fail = 0
def check(name, cond, info=''):
    global ok, fail
    ok += bool(cond); fail += (not cond)
    print(('PASS ' if cond else 'FAIL ') + name + ('  ' + str(info) if info != '' else ''))

# ---- A, B, C unchanged: hashes recorded before province D existed (n=257)
GOLD = {"A1122": "933729d41929cd06", "B1122": "f0a0cde0c470b1b1", "C1122": "b235743084191bca", "A2001": "80d79581e1979cf8",
        "B2001": "e5bbc3b08a2d3067", "C2001": "b2327b36bab6ff1a", "A2101": "ed58a8e597ca8d1c", "B2101": "26019b25df24c75d",
        "C2101": "2667e07f0e46b6f9", "A2201": "e26f0e3f64b51b2d", "B2201": "6867b5744cbcfbb7", "C2201": "3d78336e8584c163"}
bad = [k for k, v in GOLD.items() if W.world_bytes_hash(W.make_world(int(k[1:]), k[0], n=257)) != v]
check('A, B, C world hashes unchanged for seeds 1122, 2001, 2101, 2201 (12 worlds, n=257)', not bad, bad)

# ---- province D: determinism, bands
a = W.world_bytes_hash(W.make_world_D(100, n=257)); b = W.world_bytes_hash(W.make_world_D(100, n=257))
check('D deterministic (same seed, same bytes)', a == b, a)
check('D different seed differs', W.world_bytes_hash(W.make_world_D(101, n=257)) != a)
check("make_world(seed,'D') dispatches to the 1536 m / n=513 window", W.make_world(5, 'D', n=257).size_m == 1536.0)
t = time.perf_counter(); w = W.make_world_D(100, n=513); t513 = time.perf_counter() - t
check('D n=513 under 15 s', t513 < 15, round(t513, 2))
m = VC.measure_D(w)
h = w.height
check('D window is 1536 m at 3 m cells', w.size_m == 1536.0 and w.n == 513 and abs(w.dx - 3.0) < 1e-9)
check('D summit 200 to 280 m', 200 <= m['summit_m'] <= 280, round(m['summit_m'], 1))
check('D vertical exaggeration documented 2 to 3.2', 2.0 <= m['vexag'] <= 3.2, round(m['vexag'], 2))
check('D skirt slope median 3 to 12 deg', 3 <= m['skirt_slope_med'] <= 12, round(m['skirt_slope_med'], 1))
check('D young cone slope median 20 to 38 deg', 20 <= m['cone_slope_med'] <= 38, round(m['cone_slope_med'], 1))
check('D 12 to 30 small cones', 12 <= m['n_cones'] <= 30, m['n_cones'])
check('D 3 to 6 flows, at least one reaches the sea', 3 <= m['n_flows'] <= 6 and m['flows_reach_sea'] >= 1, (m['n_flows'], m['flows_reach_sea']))
check('D barrancos present (6 to 40 valleys per 360 deg)', 6 <= m['barrancos_per_360'] <= 40, round(m['barrancos_per_360'], 1))
check('D sea floor drops steeply: shoreline to -50 m under 200 m, edge depth over 100 m', m['shelf_to_50m_m'] < 200 and m['edge_depth_m'] > 100, (m['shelf_to_50m_m'], round(m['edge_depth_m'])))
check('D coast mix has black sand and rock', m['coast_black_sand'] > 0.01 and m['coast_rock'] > 0.3, (round(m['coast_black_sand'], 2), round(m['coast_rock'], 2)))
check('D belts present and windward wetter', m['belts_present'] >= 4 and m['wet_dry_split'] > 0.0, (m['belts_present'], round(m['wet_dry_split'], 2)))
check('D no NaN, bounded', np.isfinite(h).all() and h.min() > -400 and h.max() < 400)
check('D rock ids 14..20 used, veg belt ids 13..19 used', len(set(np.unique(w.rock).tolist()) & set(range(14, 21))) >= 5 and len(set(np.unique(w.veg).tolist()) & set(range(13, 20))) >= 4)
rgb = W.surface_colour(w)
check('D surface_colour is uint8 RGB with several colours', rgb.dtype == np.uint8 and rgb.shape == (513, 513, 3) and len(np.unique(rgb.reshape(-1, 3), axis=0)) > 50)
# the south edge is cut through the vent: the vent is inside the window, a few metres from the south edge
check('D vent is 3 to 10 m inside the south edge', 3 <= w.volcano['V'][1] + 768 <= 10, round(w.volcano['V'][1] + 768, 1))

# ---- rock3d
vol = R.Volcano3D(w); p = w.volcano
Vx, Vy = p['V']
ij = np.unravel_index(np.argmin(h), h.shape)
zs, col = vol.column(-768 + ij[1] * w.dx, -768 + ij[0] * w.dx)   # the deepest sea column: order from the bottom
cl = col.tolist()
first = {k: cl.index(k) for k in set(cl)}
check('rock3d layer order in a sea column: crust, then edifice/sediment, then water, then air',
      cl[0] == R.CRUST and cl[-1] == R.AIR and (R.SEA in cl) and first[R.CRUST] < first.get(R.SEA, 1e9) < first[R.AIR],
      [R.NAMES[k] for k in dict.fromkeys(cl)])
hh = float(vol.surface(np.float32(-100.0), np.float32(-200.0)))
zs, col = vol.column(-100.0, -200.0)
check('rock3d: rock below the surface, air above (land column)', (col[zs < hh - 3] != R.AIR).all() and (col[zs > max(hh, 0) + 2] == R.AIR).all())
cz = p['chamber']['z']
check('rock3d: chamber centre is magma', vol.rock(np.float32(Vx), np.float32(Vy), np.float32(cz)) == R.MAGMA)
check('rock3d: chamber is a flat ellipsoid (wider than tall) and sits 1-2 km scaled depth below the summit', p['chamber']['a'] > 3 * p['chamber']['c'] and 250 < vol.H - cz < 400, (p['chamber']['a'], p['chamber']['c'], round(vol.H - cz)))
check('rock3d: just above the chamber on the axis is feeder magma or conduit', vol.rock(np.float32(Vx), np.float32(Vy), np.float32(cz + p['chamber']['c'] + 20)) in (R.MAGMA, R.CONDUIT))
check('rock3d: deep feeder below the chamber', vol.rock(np.float32(Vx), np.float32(Vy), np.float32(vol.z0 + 15)) == R.MAGMA)
check('rock3d: far from the vent, same depth, is not magma', vol.rock(np.float32(Vx + 400), np.float32(Vy + 400), np.float32(cz)) != R.MAGMA)
dk = max(p['dikes'], key=lambda d: d['L'])
a_, L_ = dk['az'], dk['L']
al = 0.7 * L_
nx, ny = -np.sin(a_), np.cos(a_)
hp = float(vol.surface(np.float32(Vx + al * np.cos(a_)), np.float32(Vy + al * np.sin(a_)))); zq = min(40.0, hp - 15.0)
s0 = dk['off'] - dk['tilt'] * (zq - cz)                  # plane: n.(p - V) - off + tilt (z - z_chamber) = 0
px = Vx + al * np.cos(a_) + s0 * nx; py = Vy + al * np.sin(a_) + s0 * ny
sc = np.linspace(-8, 8, 321, dtype=np.float32)
ids = vol.rock(px + sc * nx, py + sc * ny, np.full_like(sc, zq))
isd = np.isin(ids, (R.DIKE_LIGHT, R.DIKE_DARK))
cen = float(sc[isd].mean()) if isd.any() else 99
check('rock3d: a dike plane is found at its computed position, centred on it, 1 to 6 m thick', isd.any() and abs(cen) < 1.0 and 0.5 < isd.sum() * 0.05 < 6.5, (hp > zq + 3, round(cen, 2), round(isd.sum() * 0.05, 2)))
# lens: Ghyben-Herzberg, base depth = 40 x head
ii, jj = np.unravel_index(np.argmax(w.head), w.head.shape)
x0 = np.float32(-768 + jj * w.dx); y0 = np.float32(-768 + ii * w.dx); hd = float(vol._sample(vol.head, x0, y0))
d1 = vol.detail(x0, y0, np.float32(-40.0 * hd + 0.4)); d2 = vol.detail(x0, y0, np.float32(-40.0 * hd - 0.6))
check('rock3d: fresh-water lens base is 40 x head (inside just above, outside just below)', bool(d1['lens']) and not bool(d2['lens']), (round(hd, 2), round(40 * hd, 1)))
d3 = vol.detail(np.float32(-700.0), np.float32(600.0), np.float32(-30.0))
check('rock3d: no lens under the sea', not bool(d3['lens']))
check('rock3d: tide line flag at z = 0 in rock only', bool(vol.detail(x0, y0, np.float32(0.0))['tide']) and not bool(vol.detail(x0, y0, np.float32(40.0))['tide']))
# beds follow the old surface: same depth below h_shield -> same bed (+-1) at two flank points
def pt(x, y, dep):
    hs_ = float(vol._sample(vol.h_shield, np.float32(x), np.float32(y))); return vol.detail(np.float32(x), np.float32(y), np.float32(hs_ - dep))
b1 = pt(-300.0, -400.0, 21.0); b2 = pt(-100.0, -250.0, 21.0)
check('rock3d: beds follow the old surface (equal depth below it gives the same bed index +-1, old stack)', int(b1['kind']) == 0 and int(b2['kind']) == 0 and abs(int(b1['bed']) - int(b2['bed'])) <= 1, (int(b1['bed']), int(b2['bed'])))
ra = p['rc'] * 0.84 - 0.18 * (p['floor_lv'] - (-20.0))
cx_, cy_ = p['C1']
fd = vol.detail(np.float32(cx_ + ra), np.float32(cy_), np.float32(-20.0))
check('rock3d: ring fault flagged where the caldera block is offset', bool(fd['fault']))
fl = vol.detail(np.float32(cx_), np.float32(cy_), np.float32(p['floor_lv'] - 4.0))
check('rock3d: caldera fill is flat-bedded (kind 2) just under the caldera floor', int(fl['kind']) == 2, int(fl['kind']))
zc = vol.rock(np.full(400, Vx, np.float32) + 30, np.full(400, Vy, np.float32) + 30, np.linspace(vol.z0, vol.H, 400).astype(np.float32))
check('rock3d: crust at the very base', vol.rock(np.float32(-300), np.float32(-300), np.float32(vol.z0 + 2)) == R.CRUST)

# ---- cutaway: edge cut is straight (wall profile = heights along the edge), wall textures
n = w.n; half = w.size_m / 2
nodes = np.arange(n, dtype=np.float32) * w.dx
okedge = True
for name in C.WALLS:
    x, y = C.wall_xy(w, name, nodes)
    prof = vol.surface(x, y)
    if name == 's': ref = h[0, :]
    elif name == 'e': ref = h[:, n - 1]
    elif name == 'n': ref = h[n - 1, ::-1]
    else: ref = h[::-1, 0]
    emax = float(np.abs(prof - ref).max()); okedge &= bool(emax < 2e-3)
    okedge &= bool(np.all(np.isclose(y if name in 'sn' else x, -half if name in 'sw' else half)))
check('cutaway: each edge is straight and its wall profile equals the heightfield edge heights (float32 position error < 2 mm)', okedge, emax)
img, prof, (z0, zmax) = C.bake_wall(vol, w, 's', 512, 256)
check('cutaway: baked wall has 4 px edge padding and is RGB', img.shape == (256, 512, 3) and (img[:, 0] == img[:, 4]).all() and (img[:, 3] == img[:, 4]).all() and (img[:, -1] == img[:, -5]).all())
vd = os.path.join(LF, 'volcano')
man = json.load(open(os.path.join(vd, 'manifest.json')))
sz = {f: Image.open(os.path.join(vd, f)).size for f in os.listdir(vd) if f.startswith('wall_')}
check('shipped wall textures: 4 x 2048x1024 and 4 x 1024x512', sum(s == (2048, 1024) for s in sz.values()) == 4 and sum(s == (1024, 512) for s in sz.values()) == 4, sz)
hf = np.fromfile(os.path.join(vd, 'height.f32'), dtype='<f4')
check('shipped heightfield is n*n float32 and matches the manifest', hf.size == man['n'] ** 2 and abs(float(hf.max()) - man['summit_m']) < 1e-3)
w_ship = W.make_world_D(man['seed'])
check('shipped heightfield equals a fresh bake of the same seed (no Python needed at run time, but reproducible)', np.array_equal(hf.reshape(man['n'], man['n']), w_ship.height.astype('<f4')))
tot = sum(os.path.getsize(os.path.join(vd, f)) for f in os.listdir(vd))
check('committed binaries under 8 MB', tot < 8e6, round(tot / 1e6, 2))
c_img = Image.open(os.path.join(vd, 'wall_s_2048.png')).convert('RGB')
check('front wall is not blank (many colours incl. orange magma)', len(set(c_img.resize((256, 128)).getdata())) > 40)

# ---- the page over http with 0 console errors, JS edge check
node = subprocess.run(['which', 'node'], capture_output=True, text=True).stdout.strip()
if node and os.path.isdir('/opt/node-tools/node_modules'):
    tmp = tempfile.mkdtemp()
    env = dict(os.environ, NODE_PATH='/opt/node-tools/node_modules')
    r = subprocess.run([node, os.path.join(ROOT, 'tests', 'cutaway-shoot.js'), 'out=' + tmp, 'only=2', 'port=8791'], capture_output=True, text=True, env=env, timeout=400)
    out = r.stdout + r.stderr
    errline = [l for l in out.splitlines() if l.startswith('errors')]
    edge = [l for l in out.splitlines() if l.startswith('edge')]
    check('cutaway.html loads over http with 0 console errors', errline and errline[0].split()[1] == '0', errline[:1])
    ej = json.loads(edge[0][5:]) if edge else {}
    check('page: wall profile vertices equal the terrain edge vertices, straight walls', ej.get('maxDiff', 1) < 1e-4 and ej.get('straight') is True, ej)
    check('page screenshot written and not blank', os.path.exists(os.path.join(tmp, 'volcano-cutaway-2.png')) and len(set(Image.open(os.path.join(tmp, 'volcano-cutaway-2.png')).convert('RGB').resize((64, 40)).getdata())) > 30)
else:
    print('SKIP page test: node/playwright not found')
print('\n%d passed, %d failed' % (ok, fail))
sys.exit(1 if fail else 0)
