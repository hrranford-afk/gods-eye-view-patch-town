"""CYCLES HERO RENDER of the camp island. Headless: python hero_render.py [--seed N] [--w W --h H --samples S] [--out PATH]
Deterministic scene for a given seed (render noise aside)."""
import sys, os, time, math, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
import island_common as IC
import li_scene as LS
import li_camp as LC

ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1122); ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800)
ap.add_argument('--samples', type=int, default=256); ap.add_argument('--out', default='hero.png'); ap.add_argument('--grid', type=int, default=257)
ap.add_argument('--blend', default=''); ap.add_argument('--view', default='hero')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
t0 = time.time()
sc = LS.reset()
seed = a.seed
land, fields = LS.make_land(seed, a.grid)
LS.land_material(land, seed)
trees, tree_pts = LS.make_conifers(fields, seed)
tufts = LS.make_tufts(seed)
# boulders along the rocky coast
rock_mat = LS.rock_material('BoulderMat', seed + 9, 1.0)
rng = np.random.default_rng(seed + 77)
placed = 0
tries = 0
while placed < 16 and tries < 4000:
    tries += 1
    x = rng.uniform(-20, 20); y = rng.uniform(-16, 16)
    F = IC.height_fields(np.array([[x]]), np.array([[y]]), seed)
    h = F['h'][0, 0]
    if not (-0.5 < h < 1.6) or F['rock'][0, 0] < 0.25:
        continue
    if math.hypot(x - IC.CAMP[0], (y - IC.CAMP[1]) * 1.3) < 6.5:
        continue
    b = LS.boulder(seed + placed * 13, rng.uniform(0.35, 1.0), (x, y, h - 0.05), rng.uniform(0, 6.28), 4)
    b.data.materials.append(rock_mat); placed += 1
cx, cy = IC.CAMP
# feature rocks (large stratified boulders) framing the landing
for k, (fx, fy, fs) in enumerate(((cx + 10.5, cy - 4.0, 1.9), (cx - 10.0, cy - 2.5, 1.6), (cx + 13.0, cy + 3.5, 2.3), (cx - 12.5, cy + 4.5, 2.0))):
    for yy in np.arange(fy, fy + 8, 0.25):
        pass
    fz = float(IC.height_at(fx, fy, seed)[0, 0])
    b = LS.boulder(seed + 300 + k, fs, (fx, fy, fz - 0.1), rng.uniform(0, 6.28), 5)
    b.data.materials.append(rock_mat)
# camp
cx, cy = IC.CAMP
hz = lambda x, y: float(IC.height_at(x, y, seed)[0, 0])
LC.campfire((cx + 0.5, cy + 0.3, hz(cx + 0.5, cy + 0.3)), seed, rock_mat)
canv1 = LC.canvas_material('Canvas1', (0.58, 0.34, 0.14), seed)       # weathered ochre
canv2 = LC.canvas_material('Canvas2', (0.30, 0.38, 0.40), seed)       # faded blue-grey
LC.tent('TentA', (cx - 3.6, cy + 3.6, hz(cx - 3.6, cy + 3.6) - 0.02), math.radians(141), 3.0, 2.2, 1.55, canv1, seed)
LC.tent('TentB', (cx + 4.6, cy + 2.4, hz(cx + 4.6, cy + 2.4) - 0.02), math.radians(24), 2.8, 2.0, 1.4, canv2, seed + 1)
# boat: find shoreline south-west of camp
bx = cx - 5.5
by = cy
for yy in np.arange(cy, cy - 20, 0.25):
    if hz(bx, yy) < 0.08:
        by = yy + 0.9; break
slope = (hz(bx, by + 1.2) - hz(bx, by - 1.2)) / 2.4
LC.rowboat((bx, by, hz(bx, by) + 0.12), math.radians(70), 0.0, seed)
# sea, sky, light
depth_img = LS.make_foam_depth_image(fields, seed=seed)
LS.make_sea(seed, depth_img)
sky = LS.make_sky(sun_elev_deg=20.0, sun_az_deg=320.0, strength=0.22)
el = math.radians(20.0); th = math.radians(320.0)
sd = np.array([math.sin(th) * math.cos(el), math.cos(th) * math.cos(el), math.sin(el)])
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
sun.data.color = (1.0, 0.76, 0.5); sun.data.angle = math.radians(1.0); sun.data.energy = 12.0
from mathutils import Vector
sun.rotation_euler = Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
# camera
cam = bpy.data.cameras.new('Cam'); cam.lens = 36; cam.sensor_width = 36
cam.dof.use_dof = True; cam.dof.focus_distance = 25.0; cam.dof.aperture_fstop = 11.0
co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (-9.0, -29.0, 10.0)
tgt = np.array([0.0, -2.0, 1.2])
from mathutils import Vector
dirv = Vector(tuple(tgt - np.array(co.location)))
co.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
cam.dof.focus_distance = dirv.length * 0.95
if a.view == 'top':
    co.location = (0, -0.1, 60); co.rotation_euler = (0, 0, 0); cam.lens = 60
if a.view == 'close':
    co.location = (cx + 3.5, cy - 9.0, 3.2); tgt = np.array([cx - 1.0, cy + 2.5, 0.8]); cam.lens = 40
    dirv = Vector(tuple(tgt - np.array(co.location))); co.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler(); cam.dof.focus_distance = dirv.length
LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=-0.4)
sc.render.filepath = os.path.abspath(a.out)
print('scene build s', round(time.time() - t0, 1))
if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=a.blend)
t1 = time.time()
bpy.ops.render.render(write_still=True)
print('render s', round(time.time() - t1, 1), 'total s', round(time.time() - t0, 1))
