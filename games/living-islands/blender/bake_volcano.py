"""Cutaway finish pass: Blender side. Bakes the SUN-INDEPENDENT sky light and the SUN SHADOW of the volcano block of landform/volcano/ (the
heightfield of cutaway.html) with Cycles, the same split as the bake bridge (blender/BRIDGE_PILOT.md): the page lights the land live from
  light   DIFFUSE Direct+Indirect, NO Color, sun lamp off, sky on     -> lightMap (uv2)           sky GI + AO, scene linear, stored sRGB-coded JPEG
  shadow  SHADOW pass, sky off, sun on (one position)               -> sun mask (uv2)           multiplies the live DirectionalLight on the land
  pano    1024x512 equirect render of the same sky, sun lamp off    -> hemisphere colours for trees and rocks (tools/volcano_pack.py)
The mesh is the 513 x 513 heightfield itself (524,288 triangles, 3 m cells, y north, z up, 1 Blender unit = 1 m), UV = planar over the 1536 m block with a
PAD px gutter, so the page needs no GLB: it builds the same mesh and uses the same planar UV as uv and uv2. The sea is NOT in the scene (the seabed is the
continuous mesh, lit as dry ground, exactly as in the bridge pilot). Blender 3.6 compatible patterns only (S() from li_scene, no 4.x-only calls).
   python bake_volcano.py [--vol ../landform/volcano] [--work <float dir>] [--tex 1024] [--samples 128] [--shadow-samples 32] [--sun-el 30] [--sun-az 235]
                          [--passes light,shadow,pano] [--no-bake]
Float intermediates go to --work as .npy (never committed); tools/volcano_pack.py turns them into the shipped files."""
import sys, os, time, math, argparse, json, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np, mathutils
import li_scene as LS

ap = argparse.ArgumentParser()
ap.add_argument('--vol', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'landform', 'volcano'))
ap.add_argument('--work', default=''); ap.add_argument('--tex', type=int, default=1024); ap.add_argument('--pad', type=int, default=8)
ap.add_argument('--samples', type=int, default=128); ap.add_argument('--shadow-samples', type=int, default=32)
ap.add_argument('--sun-el', type=float, default=30.0); ap.add_argument('--sun-az', type=float, default=235.0)
ap.add_argument('--sky-strength', type=float, default=0.22); ap.add_argument('--sun-strength', type=float, default=12.0)
ap.add_argument('--passes', default='light,shadow,pano'); ap.add_argument('--no-bake', action='store_true')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
a.vol = os.path.abspath(a.vol); a.work = os.path.abspath(a.work or os.path.join(a.vol, 'finish', '_float'))
os.makedirs(a.work, exist_ok=True)
passes = [p for p in a.passes.split(',') if p]
T = a.tex; PAD = a.pad
SUN_COLOR = (1.0, 0.76, 0.5)
T0 = time.time(); times = {}

man = json.load(open(os.path.join(a.vol, 'manifest.json')))
n = man['n']; size = man['size_m']; half = size / 2.0
H = np.fromfile(os.path.join(a.vol, man['heights_file']), '<f4').reshape(n, n)       # row 0 = south, col 0 = west


def sun_dir(el_deg, az_deg):
    el = math.radians(el_deg); th = math.radians(az_deg)
    return np.array([math.sin(th) * math.cos(el), math.cos(th) * math.cos(el), math.sin(el)])


sc = LS.reset()
# ---------------------------------------------------------------- the land mesh: the heightfield, planar UV with a gutter
xs = np.linspace(-half, half, n)
X, Y = np.meshgrid(xs, xs)
verts = np.stack([X.ravel(), Y.ravel(), H.ravel().astype(np.float64)], 1)
ii, jj = np.meshgrid(np.arange(n - 1), np.arange(n - 1), indexing='ij')
p = (ii * n + jj).ravel()
quads = np.stack([p, p + 1, p + n + 1, p + n], 1)
me = bpy.data.meshes.new('Volcano'); me.from_pydata(verts.tolist(), [], quads.tolist()); me.update()
land = bpy.data.objects.new('Volcano', me); sc.collection.objects.link(land)
me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
loops = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', loops)
inset = lambda x: (PAD + x * (T - 2 * PAD)) / T
uu = inset((verts[loops, 0] + half) / size); vv = inset((verts[loops, 1] + half) / size)
uv_arr = np.stack([uu, vv], -1).astype(np.float32)
uvl = me.uv_layers.new(name='UVLight'); uvl.data.foreach_set('uv', uv_arr.ravel()); me.uv_layers.active = uvl
hsh = hashlib.sha256(np.round(verts, 3).tobytes()).hexdigest()[:16]
print('HASH', 'volcano', hsh, 'verts', len(me.vertices), 'tris', len(me.polygons) * 2, flush=True)
mat = bpy.data.materials.new('VolcanoWhite'); mat.use_nodes = True; nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1); bsdf.inputs['Roughness'].default_value = 1.0
me.materials.append(mat)
tn = nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active = tn

sky = LS.make_sky(sun_elev_deg=a.sun_el, sun_az_deg=a.sun_az, strength=a.sky_strength)
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
sun.data.color = SUN_COLOR; sun.data.angle = math.radians(1.0); sun.data.energy = a.sun_strength


def aim_sun(el, az):
    sd = sun_dir(el, az)
    sun.rotation_euler = mathutils.Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()


aim_sun(a.sun_el, a.sun_az)
info = {'vol_hash': hsh, 'n': n, 'size_m': size, 'tex': T, 'pad_px': PAD, 'samples': a.samples, 'shadow_samples': a.shadow_samples, 'sun_el': a.sun_el, 'sun_az': a.sun_az,
        'sun_strength': a.sun_strength, 'sun_color': list(SUN_COLOR), 'sky_strength': a.sky_strength, 'blender': bpy.app.version_string, 'tris': len(me.polygons) * 2,
        'sun_dir_blender': [float(x) for x in sun_dir(a.sun_el, a.sun_az)]}
if a.no_bake:
    sys.exit(0)

# ---------------------------------------------------------------- bake plumbing
bpy.ops.object.select_all(action='DESELECT'); land.select_set(True); bpy.context.view_layer.objects.active = land
bk = sc.render.bake
bk.use_selected_to_active = False; bk.margin = PAD; bk.margin_type = 'EXTEND'
LS.render_settings(sc, 64, 64, a.samples, False)
sc.cycles.use_denoising = False
sc.cycles.use_adaptive_sampling = False
sc.cycles.sample_clamp_indirect = 10.0
bgn = None
for nd in sc.world.node_tree.nodes:
    if nd.bl_idname == 'ShaderNodeBackground':
        bgn = nd


def new_float(name, color=True):
    img = bpy.data.images.new(name, T, T, alpha=False, float_buffer=True)
    if not color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def read_rgb(img):
    px = np.empty(T * T * 4, np.float32); img.pixels.foreach_get(px)
    return px.reshape(T, T, 4)[..., :3].copy()          # row 0 = bottom, as Blender stores it


def bake(kind, name, samples, direct=False, indirect=False, color=False, non_color=False):
    img = new_float(name, color=not non_color)
    tn.image = img; nt.nodes.active = tn
    sc.cycles.samples = samples
    bk.use_pass_direct = direct; bk.use_pass_indirect = indirect; bk.use_pass_color = color
    t = time.time()
    bpy.ops.object.bake(type=kind)
    times[name] = round(time.time() - t, 1)
    print('BAKE', name, kind, 's', times[name], flush=True)
    return read_rgb(img)


if 'light' in passes:
    sun.data.energy = 0.0                                # sun off: sun-independent sky GI + AO
    bgn.inputs['Strength'].default_value = a.sky_strength
    L = np.clip(bake('DIFFUSE', 'volcano_light', a.samples, direct=True, indirect=True, color=False), 0, None)
    np.save(os.path.join(a.work, 'light_f32.npy'), L)
    print('LIGHT stats mean', L.mean((0, 1)), 'p50', np.percentile(L.mean(2), 50), 'p99.9', np.percentile(L.mean(2), 99.9), 'max', L.max(), flush=True)

if 'shadow' in passes:
    bgn.inputs['Strength'].default_value = 0.0
    sun.data.energy = 1.0; sun.data.color = (1, 1, 1)
    m = bake('SHADOW', 'volcano_shadow', a.shadow_samples, non_color=True).mean(2)
    np.save(os.path.join(a.work, 'shadow_f32.npy'), m.astype(np.float32))
    print('SHADOW mean', float(m.mean()), 'p5', float(np.percentile(m, 5)), 'p95', float(np.percentile(m, 95)), flush=True)
    sun.data.color = SUN_COLOR; sun.data.energy = 0.0
    bgn.inputs['Strength'].default_value = a.sky_strength

if 'pano' in passes:
    land.hide_render = True
    sun.data.energy = 0.0
    cam = bpy.data.cameras.new('PanoCam'); co = bpy.data.objects.new('PanoCam', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (0, 0, 3.0); co.rotation_euler = (math.pi / 2, 0, 0)       # looks along +Y (north); image centre = north
    cam.type = 'PANO'
    try:
        cam.panorama_type = 'EQUIRECTANGULAR'
    except Exception:
        cam.cycles.panorama_type = 'EQUIRECTANGULAR'
    for k, v in (('latitude_min', -math.pi / 2), ('latitude_max', math.pi / 2), ('longitude_min', -math.pi), ('longitude_max', math.pi)):
        for obj in (cam, getattr(cam, 'cycles', None)):
            if obj is not None and hasattr(obj, k):
                setattr(obj, k, v)
    sc.render.resolution_x = 1024; sc.render.resolution_y = 512; sc.render.resolution_percentage = 100
    sc.cycles.samples = 8; sc.cycles.use_denoising = False
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.view_settings.look = 'None'
    except Exception:
        pass
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'; sc.render.image_settings.color_mode = 'RGB'
    pth = os.path.join(a.work, 'pano.exr'); sc.render.filepath = pth
    t = time.time(); bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(pth); im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    arr = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(arr); arr = arr.reshape(h, w, 4)[..., :3].copy()
    np.save(os.path.join(a.work, 'pano.npy'), arr)
    print('PANO s', round(time.time() - t, 1), 'mean', arr.mean((0, 1)), 'max', arr.max(), flush=True)
    land.hide_render = False

info['bake_seconds'] = times; info['total_seconds'] = round(time.time() - T0, 1)
json.dump(info, open(os.path.join(a.work, 'bake_info.json'), 'w'), indent=1)
print('TOTAL s', info['total_seconds'], times)
