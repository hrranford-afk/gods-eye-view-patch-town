#!/usr/bin/env python3
"""LANDFORM RENDER tests. Run with a python that has Blender as a module (bpy) and numpy:
    BPY_PYTHON=/path/to/venv/bin/python; $BPY_PYTHON games/living-islands/tests/landform-render-test.py
Checks: the scene mesh is deterministic for a seed (mesh hash), the chosen island and the camp site are deterministic and sensible, a tiny render
is not blank, the committed landform shots exist, are under 1.5 MB and are not blank, and the old batch (hero + bake of the legacy island, seed 1122)
and the new landform phase still run end to end. Without bpy the bpy tests are skipped and say so."""
import os, sys, json, subprocess, tempfile, shutil, math
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL); sys.path.insert(0, os.path.join(ROOT, 'landform'))
fails = 0; skips = 0
def ok(c, m):
    global fails
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails += 1
def skip(m):
    global skips
    print('SKIP ' + m); skips += 1

try:
    import numpy as np
    import bpy  # noqa
    import landform_scene as LF
    import world as W
    has_bpy = True
except Exception as e:
    has_bpy = False
    skip('bpy / numpy not importable (%s): run with BPY_PYTHON' % e)

def pixels(path):
    """RGB 0..255 array (rows top to bottom) read back through Blender (no PIL in the venv)."""
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size; a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return (a.reshape(h, w, 4)[::-1, :, :3] * 255.0).astype(float)

if has_bpy:
    # 1 determinism of the mesh, the island and the camp
    a = LF.build('A', 2001, 'hero', meta_only=True); b = LF.build('A', 2001, 'hero', meta_only=True)
    c = LF.build('A', 2005, 'hero', meta_only=True)
    ok(a['mesh_hash'] == b['mesh_hash'] and len(a['mesh_hash']) == 16, 'terrain mesh hash is the same for the same seed (%s)' % a['mesh_hash'])
    ok(a['mesh_hash'] != c['mesh_hash'], 'a different seed gives a different mesh (%s)' % c['mesh_hash'])
    ok(a['island'] == b['island'] and a['landing'] == b['landing'] and a['camp'] == b['camp'], 'chosen island %d, landing and camp positions are deterministic' % a['island'])
    # 2 the choice obeys its rules, for all six hero worlds (world 2201 is the one allowed exception: no island under the cap has a landing)
    for prov, seed in (('A', 2001), ('A', 2005), ('B', 2101), ('B', 2105), ('C', 2201), ('C', 2205)):
        w = W.make_world(seed, prov, n=513)
        iid, site = LF.choose_island(w)
        isl = w.islands[iid - 1]; ex = max(LF.island_extent(w, iid))
        sx, sy = site['xy']; col = int(round((sx + w.size_m / 2) / w.dx)); row = int(round((sy + w.size_m / 2) / w.dx))
        near = w.island_label[max(row - 2, 0):row + 3, max(col - 2, 0):col + 3]
        ok((near == iid).any(), '%s %d: landing site (%.0f, %.0f) lies on island %d (%s, %.2f)' % (prov, seed, sx, sy, iid, site['source'], site['score']))
        ok(ex <= LF.MAX_EXTENT_M or (prov, seed) == ('C', 2201), '%s %d: island extent %.0f m within the %.0f m cap' % (prov, seed, ex, LF.MAX_EXTENT_M))
        ok(abs(math.hypot(*site['normal']) - 1.0) < 1e-6, '%s %d: seaward normal is a unit vector' % (prov, seed))
    # camp is on dry ground above the high-tide line, tents are not in the water
    hi = a['tide_levels']['high']; cp = a['camp']
    ok(cp is not None and cp['pad_level_m'] > hi + 0.5, 'camp pad %.2f m is above high tide %.2f m' % (cp['pad_level_m'], hi))
    # 3 a tiny render is not blank
    tmp = tempfile.mkdtemp(prefix='lf_test_')
    png = os.path.join(tmp, 'tiny.png')
    m = LF.build('B', 2105, 'hero', w_px=240, h_px=160, samples=4, out=png)
    px = pixels(png)
    ok(os.path.exists(png) and px.std() > 12 and 20 < px.mean() < 235, 'tiny render is not blank (mean %.0f, std %.0f, %.1f s)' % (px.mean(), px.std(), m['t_render_s']))
    ok(m['trees'] > 0 and m['tufts'] > 0 and m['boulders'] > 0, 'trees %d, tufts %d, boulders %d placed' % (m['trees'], m['tufts'], m['boulders']))
    # 4 committed shots
    names = ['landform-gneiss-2001', 'landform-gneiss-2005', 'landform-sandstone-2101', 'landform-sandstone-2105', 'landform-basalt-2201', 'landform-basalt-2205', 'landform-wide-2001']
    for n in names:
        p = os.path.join(ROOT, 'shots', n + '.png')
        if not os.path.exists(p):
            skip(n + '.png not rendered yet'); continue
        ok(os.path.getsize(p) < 1.5e6, '%s.png under 1.5 MB (%d bytes)' % (n, os.path.getsize(p)))
        q = pixels(p); ok(q.shape[:2] == (800, 1200) and q.std() > 20, '%s.png is 1200x800 and not blank (std %.0f)' % (n, q.std()))
    # 5 old batch: legacy hero + bake of seed 1122 and the landform phase, through the fake blender wrapper
    wrapper = os.path.join(tmp, 'fakeblender.sh')
    open(wrapper, 'w').write('#!/bin/bash\nscript=""; args=()\nwhile [ $# -gt 0 ]; do case "$1" in -b) shift;; --python) script="$2"; shift 2;; --) shift; args=("$@"); break;; *) shift;; esac; done\nexec %s "$script" -- "${args[@]}"\n' % sys.executable)
    os.chmod(wrapper, 0o755)
    out = os.path.join(tmp, 'batch')
    r = subprocess.run([sys.executable, os.path.join(BL, 'batch.py'), '--blender', wrapper, '--seeds', '1122', '--out', out, '--phases', 'previews,bakes',
                        '--hero-w', '160', '--hero-h', '100', '--hero-samples', '4', '--bake-samples', '2', '--tex', '256'], capture_output=True, text=True)
    res = json.load(open(os.path.join(out, 'results.json'))) if os.path.exists(os.path.join(out, 'results.json')) else {'jobs': [], 'stopped_because': 'no results'}
    ok(r.returncode == 0 and res['stopped_because'] == 'finished' and len(res['jobs']) == 4 and all(j['returncode'] == 0 and j['files'] for j in res['jobs']),
       'old batch (hero, top, close, bake of seed 1122) still runs: %d jobs, %s' % (len(res['jobs']), res['stopped_because']))
    out2 = os.path.join(tmp, 'batch2')
    r = subprocess.run([sys.executable, os.path.join(BL, 'batch.py'), '--blender', wrapper, '--seeds', '2105', '--out', out2, '--phases', 'landform', '--lf-provinces', 'B',
                        '--hero-w', '160', '--hero-h', '100', '--lf-samples', '4'], capture_output=True, text=True)
    res2 = json.load(open(os.path.join(out2, 'results.json'))) if os.path.exists(os.path.join(out2, 'results.json')) else {'jobs': [], 'stopped_because': 'no results'}
    ok(r.returncode == 0 and len(res2['jobs']) == 1 and res2['jobs'][0]['returncode'] == 0 and res2['jobs'][0]['files'], 'batch landform phase renders a world hero: %s' % res2['stopped_because'])
    shutil.rmtree(tmp, ignore_errors=True)

print('\n%d FAILED' % fails if fails else '\nALL PASSED' + (' (%d skipped)' % skips if skips else ''))
sys.exit(1 if fails else 0)
