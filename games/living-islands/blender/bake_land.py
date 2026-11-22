"""BAKED LAND: Cycles bakes sky + low sun + bounce light (ambient occlusion, soft sun shadow, colour bleed) into one 2048 texture
for the island land mesh, then exports land + trees + boulders as a small GLB (Y up, metres) for baked_land.html.
   python bake_land.py [--seed N] [--out DIR] [--tex 2048] [--samples 96] [--grid 129]
Outputs in DIR: island_land.glb, land_depth.png (sea depth map for the live water shader), bake_info.json."""
import sys, os, time, math, argparse, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np, mathutils
import island_common as IC
import li_scene as LS

ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1122); ap.add_argument('--out', default='land_out'); ap.add_argument('--tex', type=int, default=2048)
ap.add_argument('--samples', type=int, default=96); ap.add_argument('--grid', type=int, default=129)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
os.makedirs(a.out, exist_ok=True)
T0 = time.time()
sc = LS.reset()
seed = a.seed
land, fields = LS.make_land(seed, a.grid)
LS.land_material(land, seed)
trees, pts = LS.make_conifers(fields, seed)
boulders = []
rock_mat = LS.rock_material('BoulderMat', seed + 9, 1.0)
rng = np.random.default_rng(seed + 77)
placed = 0; tries = 0
while placed < 16 and tries < 4000:
    tries += 1
    x = rng.uniform(-20, 20); y = rng.uniform(-16, 16)
    F = IC.height_fields(np.array([[x]]), np.array([[y]]), seed); h = F['h'][0, 0]
    if not (-0.5 < h < 1.6) or F['rock'][0, 0] < 0.25 or math.hypot(x - IC.CAMP[0], (y - IC.CAMP[1]) * 1.3) < 6.5:
        continue
    b = LS.boulder(seed + placed * 13, rng.uniform(0.35, 1.0), (x, y, h - 0.05), rng.uniform(0, 6.28), 3)
    b.data.materials.append(rock_mat); boulders.append(b); placed += 1
cx, cy = IC.CAMP
for k, (fx, fy, fs) in enumerate(((cx + 10.5, cy - 4.0, 1.9), (cx - 10.0, cy - 2.5, 1.6), (cx + 13.0, cy + 3.5, 2.3), (cx - 12.5, cy + 4.5, 2.0))):
    fz = float(IC.height_at(fx, fy, seed)[0, 0])
    b = LS.boulder(seed + 300 + k, fs, (fx, fy, fz - 0.1), rng.uniform(0, 6.28), 4)
    b.data.materials.append(rock_mat); boulders.append(b)

# light: same sky and low warm sun as the hero render
sky = LS.make_sky(sun_elev_deg=20.0, sun_az_deg=320.0, strength=0.22)
el = math.radians(20.0); th = math.radians(320.0)
sd = np.array([math.sin(th) * math.cos(el), math.cos(th) * math.cos(el), math.sin(el)])
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
sun.data.color = (1.0, 0.76, 0.5); sun.data.angle = math.radians(1.0); sun.data.energy = 12.0
sun.rotation_euler = mathutils.Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
LS.render_settings(sc, 64, 64, a.samples, False)
sc.cycles.use_denoising = False
sc.cycles.sample_clamp_indirect = 10.0

# bake target
T = a.tex
img = bpy.data.images.new('land_baked', T, T, alpha=False, float_buffer=True)
mat = land.data.materials[0]
nt = mat.node_tree
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
bpy.ops.object.select_all(action='DESELECT'); land.select_set(True); bpy.context.view_layer.objects.active = land
sc.render.bake.use_selected_to_active = False
sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = True
sc.render.bake.margin = 8; sc.render.bake.margin_type = 'EXTEND'
t1 = time.time()
bpy.ops.object.bake(type='DIFFUSE')
bake_s = time.time() - t1
_p = np.empty(T * T * 4, np.float32); img.pixels.foreach_get(_p); print('RAW bake mean', _p.reshape(-1,4)[:, :3].mean(0), 'max', _p.max())
print('bake s', round(bake_s, 1))
# post: light tone map so the baked texture is usable unlit (exposure matched to the hero), clamp
px = np.empty(T * T * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
rgb = np.clip(px[:, :3], 0, None); print('RAWPCT', np.percentile(rgb.mean(1), [5, 25, 50, 75, 95, 99]))
rgb = rgb * 1.0
rgb = 1.0 - np.exp(-rgb * 0.55 * 1.6)       # exponential shoulder (stand-in for the hero's AgX at -0.4 EV) so sun-lit sand does not clip
rgb = np.clip(rgb + 0.03, 0, 1)
px[:, :3] = rgb; px[:, 3] = 1
# sRGB-encode by hand into a fresh 8-bit image (saving the float bake image directly produced a black PNG in this bpy build)
srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(np.maximum(rgb, 1e-8), 1 / 2.4) - 0.055)
px[:, :3] = np.clip(srgb, 0, 1)
final = bpy.data.images.new('land_baked_srgb', T, T, alpha=False)
final.colorspace_settings.name = 'Non-Color'     # values are already sRGB-encoded; glTF will treat the file as sRGB
final.pixels.foreach_set(px.ravel()); final.update()
final.filepath_raw = os.path.join(a.out, 'land_baked.png'); final.file_format = 'PNG'; final.save()
img = final
# export materials
def flat(name, rgb, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
    return m
bake_mat = bpy.data.materials.new('LandBaked'); bake_mat.use_nodes = True; bn = bake_mat.node_tree; bb = bn.nodes['Principled BSDF']; bb.inputs['Roughness'].default_value = 1.0
ti = bn.nodes.new('ShaderNodeTexImage'); ti.image = img; bn.links.new(ti.outputs['Color'], bb.inputs['Base Color'])
land.data.materials.clear(); land.data.materials.append(bake_mat)
trunk, fol = trees
trunk.data.materials.clear(); trunk.data.materials.append(flat('Bark', (0.10, 0.06, 0.04)))
fol.data.materials.clear(); fol.data.materials.append(flat('Needles', (0.05, 0.13, 0.06)))
# merge boulders
bpy.ops.object.select_all(action='DESELECT')
for b in boulders:
    b.data.materials.clear(); b.data.materials.append(flat('BoulderGrey', (0.30, 0.27, 0.24)))
    b.select_set(True)
bpy.context.view_layer.objects.active = boulders[0]
bpy.ops.object.join()
rocks = bpy.context.object; rocks.name = 'Boulders'
for o in (land, trunk, fol, rocks):
    o.select_set(True)
# remove non-exported objects (sun lamp) from selection: use_selection exports only these
bpy.ops.object.select_all(action='DESELECT')
for o in (land, trunk, fol, rocks):
    o.select_set(True)
glb = os.path.join(a.out, 'island_land.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_cameras=False, export_lights=False, export_yup=True,
                          export_image_format='JPEG', export_jpeg_quality=85, export_extras=False, export_animations=False)
# sea depth map (R channel): h in [-6, 6] -> 0..255, 256x256 over +-HALF
n = 256
xs = np.linspace(-IC.HALF, IC.HALF, n); u, v = np.meshgrid(xs, xs)
hh = IC.height_fields(u, v, seed)['h']
dimg = bpy.data.images.new('depth', n, n, alpha=False); dimg.colorspace_settings.name = 'Non-Color'
d = np.zeros((n, n, 4), np.float32); e = np.clip((hh + 6.0) / 12.0, 0, 1); d[..., 0] = e; d[..., 1] = e; d[..., 2] = e; d[..., 3] = 1
dimg.pixels.foreach_set(d.ravel()); dimg.filepath_raw = os.path.join(a.out, 'land_depth.png'); dimg.file_format = 'PNG'; dimg.save()
# also tri counts
def tris(o):
    o.data.calc_loop_triangles(); return len(o.data.loop_triangles)
info = {'seed': seed, 'grid': a.grid, 'tex': T, 'samples': a.samples, 'bake_seconds': round(bake_s, 1), 'total_seconds': round(time.time() - T0, 1),
        'tris': {'land': tris(land), 'trunks': tris(trunk), 'foliage': tris(fol), 'boulders': tris(rocks)},
        'sun_dir_blender': [float(x) for x in sd], 'half': IC.HALF, 'depth_decode': 'h = r*12 - 6', 'glb_bytes': os.path.getsize(glb)}
json.dump(info, open(os.path.join(a.out, 'bake_info.json'), 'w'), indent=1)
print(info)
