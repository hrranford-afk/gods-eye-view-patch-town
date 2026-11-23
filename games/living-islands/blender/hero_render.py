"""CYCLES HERO RENDER of the island, built from the per-seed RECIPE (recipe.py). Headless: python hero_render.py [--seed N] [--w W --h H --samples S] [--out PATH]
  --legacy       the old camp picture (two tents, fire, boat, row of conifers, golden hour, one camera) on this seed's coastline (the HW-3 batch look)
  --recipe FILE  build from a recipe.json (for example an edited one) instead of recipe_for(seed)
  --recipe-only  write the recipe next to --out and stop (no Blender scene)
Seed 1122 is the legacy picture either way. Deterministic scene for a given seed (render noise aside). Writes <out stem>.recipe.json beside the picture.
Blender 3.6 patterns (S() for Mix sockets, Filmic fallback, sky type fallback) and the LI_DEVICE guard live in li_scene.py / li_device.py and are unchanged."""
import sys, os, time, math, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import island_common as IC
import recipe as RC

ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1122); ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800)
ap.add_argument('--samples', type=int, default=256); ap.add_argument('--out', default='hero.png'); ap.add_argument('--grid', type=int, default=257)
ap.add_argument('--blend', default=''); ap.add_argument('--view', default='hero')
ap.add_argument('--legacy', action='store_true'); ap.add_argument('--recipe', default=''); ap.add_argument('--recipe-only', action='store_true')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
t0 = time.time()
seed = a.seed
if a.recipe:
    recipe = json.load(open(a.recipe)); seed = int(recipe['seed'])
else:
    recipe = RC.recipe_for(seed, legacy_scene=a.legacy)
rpath = os.path.splitext(os.path.abspath(a.out))[0] + '.recipe.json'
RC.write_recipe(recipe, rpath)
print('RECIPE', seed, RC.summary(recipe) if not recipe['legacy'] else 'legacy camp picture')
if a.recipe_only:
    sys.exit(0)
import bpy
import li_scene as LS
import li_camp as LC
import li_trees as LT
import li_props as LP
from mathutils import Vector

RC.use_island(recipe)                     # island_common now draws this recipe's island type and puts the clearing at its site
rk = recipe['rock']; cont = recipe['content']; site = cont['site']; theta = cont['theta']; cx, cy = site
def rot(lx, ly):
    c, s = math.cos(theta), math.sin(theta); return (site[0] + c * lx - s * ly, site[1] + s * lx + c * ly)
hz = lambda x, y: float(IC.height_at(x, y, seed)[0, 0])

sc = LS.reset()
land, fields = LS.make_land(seed, a.grid)
if rk['look'] == 'legacy':
    LS.land_material(land, seed); rock_kw = {}
else:
    rock_kw = dict(palette=tuple(tuple(p) for p in rk['palette']), bed_normal=tuple(rk['bed_normal']), columnar=rk['columnar'], crack_w=rk['crack_w'])
    LS.land_material(land, seed, rock_kw=dict(rock_kw, wander=0.8 if not rk['columnar'] else 0.5, lichen=1.4, streaks=0.5), rock_scale=rk['scale'])
# trees: the legacy row of conifers, or the species plan from the island map (li_trees)
tr = recipe['trees']
if tr['mode'] == 'legacy_conifers':
    trees, tree_pts = LS.make_conifers(fields, seed)
else:
    LT.reset_cache()
    plan = RC.plan_trees(recipe)
    LT.instantiate(plan['items'], seed, 1)
    print('TREES', plan['n'], plan['counts'])
tufts = LS.make_tufts(seed) if recipe['legacy'] else LS.make_tufts(seed, count=recipe['tufts']['count'], heather=recipe['tufts']['heather'])
# boulders along the rocky coast
rock_mat = LS.rock_material('BoulderMat', seed + 9, 1.0, **(dict(rock_kw, lichen=1.2) if rock_kw else {}))
rng = np.random.default_rng(seed + 77)
placed = 0
tries = 0
while placed < recipe['boulders']['n'] and tries < 4000:
    tries += 1
    x = rng.uniform(-20, 20); y = rng.uniform(-16, 16)
    F = IC.height_fields(np.array([[x]]), np.array([[y]]), seed)
    h = F['h'][0, 0]
    if not (-0.5 < h < 1.6) or F['rock'][0, 0] < 0.25:
        continue
    if math.hypot(x - cx, (y - cy) * 1.3) < 6.5:
        continue
    b = LS.boulder(seed + placed * 13, rng.uniform(0.35, 1.0) * recipe['boulders']['scale'], (x, y, h - 0.05), rng.uniform(0, 6.28), 4)
    b.data.materials.append(rock_mat); placed += 1
# feature rocks (large stratified boulders) framing the landing
for k, (lx, ly, fs) in enumerate(recipe['boulders']['features']):
    fx, fy = rot(lx, ly)
    fz = hz(fx, fy); rot_z = rng.uniform(0, 6.28)
    if fz < -0.6 and not recipe['legacy']:          # a recipe's feature rock that fell in deep water is skipped (the legacy one stays, as it always was)
        continue
    b = LS.boulder(seed + 300 + k, fs, (fx, fy, fz - 0.1), rot_z, 5)
    b.data.materials.append(rock_mat)
# what is there
camp = cont['camp']
if camp:
    fx, fy = camp['fire']
    LC.campfire((fx, fy, hz(fx, fy)), seed, rock_mat)
    for k, t in enumerate(camp['tents']):
        m = LC.canvas_material('Canvas%d' % (k + 1), tuple(t['colour']), seed)
        LC.tent(t['name'], (t['pos'][0], t['pos'][1], hz(*t['pos']) - 0.02), t['yaw'], t['length'], t['width'], t['height'], m, seed + t['seed_off'])
    bt = camp['boat']
    if bt:
        bx, by = bt['start']; d = bt['dir']
        for t_ in (np.arange(0, 20, 0.25) if bt.get('seek_shore', True) else []):          # walk seaward from the start until the water, then stand the boat 0.9 m up the beach
            if hz(bx + d[0] * t_, by + d[1] * t_) < 0.08:
                bx, by = bx + d[0] * (t_ - bt['inland_m']), by + d[1] * (t_ - bt['inland_m']); break
        LC.rowboat((bx, by, hz(bx, by) + 0.12), bt['yaw'], 0.0, seed)
for p in cont['props']:
    k = p['kind']; pos = p['pos']
    if k == 'wreck':
        LP.wreck(pos, p['yaw'], hz, p['length'], p['tilt'], seed)
    elif k == 'hut':
        LP.hut(pos, p['yaw'], hz, tuple(p['colour']), tuple(p['size']), seed)
    elif k == 'lighthouse':
        LP.lighthouse(pos, p['yaw'], hz, p['height'], p['bands'], rock_mat, seed)
    elif k == 'ruins':
        LP.ruins(pos, p['yaw'], hz, tuple(p['plan']), rock_mat, seed + p['seed_off'])
# sea, sky, light
depth_img = LS.make_foam_depth_image(fields, seed=seed)
LS.make_sea(seed, depth_img, density=recipe['sea']['density'])
tm = recipe['time']; wx = recipe['weather']
sky = LS.make_sky(sun_elev_deg=tm['sun_el_deg'], sun_az_deg=tm['sun_az_deg'], strength=tm['sky_strength'], overcast=wx['overcast'], haze=wx['haze'])
el = math.radians(tm['sun_el_deg']); th = math.radians(tm['sun_az_deg'])
sd = np.array([math.sin(th) * math.cos(el), math.cos(th) * math.cos(el), math.sin(el)])
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
sun.data.color = tuple(tm['sun_colour']); sun.data.angle = math.radians(tm['sun_angle_deg']); sun.data.energy = tm['sun_energy']
sun.rotation_euler = Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
# camera
cm = recipe['camera']
cam = bpy.data.cameras.new('Cam'); cam.lens = cm['lens']; cam.sensor_width = 36
cam.dof.use_dof = True; cam.dof.focus_distance = 25.0; cam.dof.aperture_fstop = cm['fstop']
co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = tuple(cm['pos'])
tgt = np.array(cm['target'])
dirv = Vector(tuple(tgt - np.array(co.location)))
co.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
cam.dof.focus_distance = dirv.length * 0.95
if a.view == 'top':
    co.location = (0, -0.1, 60); co.rotation_euler = (0, 0, 0); cam.lens = 26
if a.view == 'close':
    px, py = rot(3.5, -9.0)
    co.location = (px, py, 3.2 + (0.0 if recipe['legacy'] else hz(cx, cy) - 0.55)); tx, ty = rot(-1.0, 2.5); tgt = np.array([tx, ty, 0.8 + (0.0 if recipe['legacy'] else hz(cx, cy) - 0.55)]); cam.lens = 40
    dirv = Vector(tuple(tgt - np.array(co.location))); co.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler(); cam.dof.focus_distance = dirv.length
LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=tm['exposure'])
sc.render.filepath = os.path.abspath(a.out)
print('scene build s', round(time.time() - t0, 1))
if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=a.blend)
t1 = time.time()
bpy.ops.render.render(write_still=True)
print('render s', round(time.time() - t1, 1), 'total s', round(time.time() - t0, 1))
