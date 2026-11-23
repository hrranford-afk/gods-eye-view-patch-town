"""BAKE BRIDGE pilot, Blender side (research/BAKE_BRIDGE.md section 6). SPLIT, SCENE-LINEAR bake of island seed 1122 with the SEA REMOVED
(the seabed is the continuous land mesh) so the live page can light it again:
  light   DIFFUSE Direct+Indirect, NO Color, sun lamp off, sky on        -> irradiance-over-pi for white albedo (page: lightMap, uv2)
  albedo  DIFFUSE Color only                                            -> flat colour (page: map)
  normal  NORMAL tangent space (bump of the land material)              -> normalMap
  shadow  SHADOW pass, sky off, sun on, one position per channel (R,G,B)-> sun mask for the live sun
  pano    1024x512 equirect render of the same sky (sun lamp off), 3 sun elevations -> SH9 in tools/bridge_pack.py
  wedge   grey (+ colour) step wedge pushed through the scene's Filmic 'Medium High Contrast' look -> tone curve fit
  glb     land (UV0 = atlas, UV1 = same atlas, TEXCOORD_1 check), trunks, foliage, boulders; albedo JPEG inside
Float intermediates go to --work as .npy (never committed). tools/bridge_pack.py turns them into the shipped files.
   python bake_bridge.py [--seed 1122] [--out assets/bridge] [--work assets/bridge/_float] [--tex 2048] [--samples 64] [--passes light,albedo,normal,shadow,pano,wedge,glb] [--no-bake]
Keeps Blender 3.6 patterns (S() lives in li_scene, no 4.x-only calls). LI_DEVICE / LI_GPU_NAME are honoured by li_scene.reset() -> li_device."""
import sys, os, time, math, argparse, json, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np, mathutils
import island_common as IC
import li_scene as LS
import bridge_scene as BS

ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1122); ap.add_argument('--out', default='assets/bridge'); ap.add_argument('--work', default='')
ap.add_argument('--tex', type=int, default=2048); ap.add_argument('--samples', type=int, default=64); ap.add_argument('--grid', type=int, default=129)
ap.add_argument('--shadow-samples', type=int, default=64); ap.add_argument('--pad', type=int, default=16)
ap.add_argument('--passes', default='light,albedo,normal,shadow,pano,wedge,glb'); ap.add_argument('--no-bake', action='store_true')
ap.add_argument('--suns', default='20,35,50', help='sun elevations (deg) of the R,G,B shadow mask channels and the three panoramas; azimuth is 320')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
a.out = os.path.abspath(a.out); a.work = os.path.abspath(a.work or os.path.join(a.out, '_float'))
os.makedirs(a.out, exist_ok=True); os.makedirs(a.work, exist_ok=True)
passes = [p for p in a.passes.split(',') if p]
T = a.tex; PAD = a.pad
SUN_ELS = [float(x) for x in a.suns.split(',')]
T0 = time.time(); times = {}

W = BS.build_scene(a.seed, a.grid)
sc = W['sc']; land = W['land']; trunk, fol = W['trees']; boulders = W['boulders']; sun = W['sun']; sky = W['sky']

# ---------------------------------------------------------------- atlas UVs: UV0 and UV1 both the 2048 atlas with a PAD px gutter
me = land.data
loops = np.array([l.vertex_index for l in me.loops])
u_all, v_all, _f = IC.grid(a.grid, a.seed)
uu = (u_all.ravel()[loops] + IC.HALF) / (2 * IC.HALF); vv = (v_all.ravel()[loops] + IC.HALF) / (2 * IC.HALF)
inset = lambda x: (PAD + x * (T - 2 * PAD)) / T
uv_arr = np.stack([inset(uu), inset(vv)], -1).astype(np.float32)
first = me.uv_layers[0]; first.name = 'UVAlbedo'; first.data.foreach_set('uv', uv_arr.ravel())
second = me.uv_layers.new(name='UVLight'); second.data.foreach_set('uv', uv_arr.ravel())
me.uv_layers.active = second
# mesh hash (positions, uv0, uv1 rounded): the determinism check used by the test
pos = np.array([v.co[:] for v in me.vertices], np.float64)
hsh = hashlib.sha256(np.round(pos, 4).tobytes() + np.round(uv_arr, 5).tobytes()).hexdigest()[:16]
print('HASH', 'land', hsh, 'verts', len(me.vertices), 'uv_layers', [l.name for l in me.uv_layers])
if a.no_bake:
    sys.exit(0)

# ---------------------------------------------------------------- bake plumbing
mat = land.data.materials[0]; nt = mat.node_tree
tn = nt.nodes.new('ShaderNodeTexImage'); nt.nodes.active = tn
bpy.ops.object.select_all(action='DESELECT'); land.select_set(True); bpy.context.view_layer.objects.active = land
bk = sc.render.bake
bk.use_selected_to_active = False; bk.margin = PAD; bk.margin_type = 'EXTEND'
LS.render_settings(sc, 64, 64, a.samples, False)
sc.cycles.use_denoising = False
sc.cycles.sample_clamp_indirect = 10.0
bg = BS.world_background_node()


def new_float(name, ncolor=True):
    img = bpy.data.images.new(name, T, T, alpha=False, float_buffer=True)
    if not ncolor:
        img.colorspace_settings.name = 'Non-Color'
    return img


def read_rgb(img):
    p = np.empty(T * T * 4, np.float32); img.pixels.foreach_get(p)
    return p.reshape(T, T, 4)[..., :3].copy()          # row 0 = bottom, as Blender stores it


def bake(kind, name, samples, direct=False, indirect=False, color=False, non_color=False):
    img = new_float(name, ncolor=not non_color)
    tn.image = img; nt.nodes.active = tn
    sc.cycles.samples = samples
    bk.use_pass_direct = direct; bk.use_pass_indirect = indirect; bk.use_pass_color = color
    t = time.time()
    bpy.ops.object.bake(type=kind)
    times[name] = round(time.time() - t, 1)
    print('BAKE', name, kind, 's', times[name], flush=True)
    return read_rgb(img)


def srgb_enc(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-8), 1 / 2.4) - 0.055)


if 'light' in passes:
    sun.data.energy = 0.0                                # sun off: sun-independent sky GI + AO
    bg.inputs['Strength'].default_value = BS.SKY_STRENGTH
    L = bake('DIFFUSE', 'bridge_light', a.samples, direct=True, indirect=True, color=False)
    L = np.clip(L, 0, None)
    np.save(os.path.join(a.work, 'light_f32.npy'), L)
    print('LIGHT stats mean', L.mean((0, 1)), 'p50', np.percentile(L.mean(2), 50), 'p99.9', np.percentile(L.mean(2), 99.9), 'max', L.max())

if 'albedo' in passes:
    A = bake('DIFFUSE', 'bridge_albedo', 4, color=True)
    np.save(os.path.join(a.work, 'albedo_f32.npy'), A)
    print('ALBEDO mean', A.mean((0, 1)))

if 'normal' in passes:
    bk.normal_space = 'TANGENT'
    N = bake('NORMAL', 'bridge_normal', 4, non_color=True)
    np.save(os.path.join(a.work, 'normal_f32.npy'), N)
    print('NORMAL mean', N.mean((0, 1)))

if 'shadow' in passes:
    # sky off, sun on: one SHADOW bake per sun position, written to R, G, B of the mask. White sun so the colour does not matter.
    bg.inputs['Strength'].default_value = 0.0
    sun.data.energy = 1.0; sun.data.color = (1, 1, 1)
    chans = []
    for el in SUN_ELS[:3]:
        BS.aim_sun(sun, el, BS.SUN_AZ)
        m = bake('SHADOW', 'bridge_shadow_%d' % int(el), a.shadow_samples, non_color=True)
        chans.append(m.mean(2)); print('SHADOW el', el, 'mean', chans[-1].mean(), 'p5', np.percentile(chans[-1], 5), 'p95', np.percentile(chans[-1], 95))
    while len(chans) < 3:
        chans.append(chans[-1])
    np.save(os.path.join(a.work, 'shadow_f32.npy'), np.stack(chans, -1).astype(np.float32))
    sun.data.color = BS.SUN_COLOR; sun.data.energy = 0.0
    bg.inputs['Strength'].default_value = BS.SKY_STRENGTH

if 'pano' in passes:
    # a clean sky panorama: only the world, a camera at 3 m above the island centre, sun lamp off (it is invisible to cameras anyway)
    for o in [land, trunk, fol] + boulders:
        o.hide_render = True
    sun.data.energy = 0.0
    cam = bpy.data.cameras.new('PanoCam'); co = bpy.data.objects.new('PanoCam', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (0, 0, 3.0); co.rotation_euler = (math.pi / 2, 0, 0)       # looks along +Y (north); image centre = north
    cam.type = 'PANO'
    try:
        cam.panorama_type = 'EQUIRECTANGULAR'          # Blender 4.x and later
    except Exception:
        cam.cycles.panorama_type = 'EQUIRECTANGULAR'   # Blender 3.6
    for k, v in (('latitude_min', -math.pi / 2), ('latitude_max', math.pi / 2), ('longitude_min', -math.pi), ('longitude_max', math.pi)):
        for obj in (cam, getattr(cam, 'cycles', None)):
            if obj is not None and hasattr(obj, k):
                setattr(obj, k, v)
    sc.render.resolution_x = 1024; sc.render.resolution_y = 512; sc.render.resolution_percentage = 100
    sc.cycles.samples = 8; sc.cycles.use_denoising = False; sc.cycles.use_adaptive_sampling = False
    sc.view_settings.view_transform = 'Standard'
    try:
        sc.view_settings.look = 'None'
    except Exception:
        pass
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'; sc.render.image_settings.color_mode = 'RGB'
    panos = {}
    for el in SUN_ELS[:3]:
        sky.sun_elevation = math.radians(el)
        p = os.path.join(a.work, 'pano_el%d.exr' % int(el))
        sc.render.filepath = p
        t = time.time(); bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(p); im.colorspace_settings.name = 'Non-Color'
        w, h = im.size
        arr = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(arr); arr = arr.reshape(h, w, 4)[..., :3].copy()
        np.save(os.path.join(a.work, 'pano_el%d.npy' % int(el)), arr); panos[el] = arr
        print('PANO el', el, 's', round(time.time() - t, 1), 'mean', arr.mean((0, 1)), 'max', arr.max(), flush=True)
    sky.sun_elevation = math.radians(BS.SUN_EL)
    for o in [land, trunk, fol] + boulders:
        o.hide_render = False
    sc.camera = None

if 'wedge' in passes:
    # Grey step wedge (row 0) and colour rows through the scene view transform (Filmic, Medium High Contrast, exposure 0). 128 patches per row,
    # scene-linear 2^-10 .. 2^5.9. Image.save_render applies exactly the view transform and look of the scene; read back 16-bit.
    LS.render_settings(sc, 64, 64, 8, False, exposure=0.0)
    NP = 128
    ev = np.linspace(-10.0, 5.9, NP); s = (2.0 ** ev)
    rows = [(1, 1, 1), (1, 0, 0), (0, 1, 0), (0, 0, 1), (0.50, 0.40, 0.26), (0.075, 0.12, 0.03), (0.30, 0.50, 0.90), (1.0, 0.76, 0.5)]
    wl = np.zeros((len(rows), NP, 4), np.float32)
    for r, c in enumerate(rows):
        for ch in range(3):
            wl[r, :, ch] = s * c[ch]
    wl[..., 3] = 1
    im = bpy.data.images.new('wedge', NP, len(rows), alpha=False, float_buffer=True)
    im.pixels.foreach_set(wl.ravel()); im.update()
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '16'; sc.render.image_settings.color_mode = 'RGB'
    wp = os.path.join(a.work, 'wedge_filmic_mhc.png')
    im.save_render(wp, scene=sc)
    back = bpy.data.images.load(wp); back.colorspace_settings.name = 'Non-Color'
    bp = np.empty(NP * len(rows) * 4, np.float32); back.pixels.foreach_get(bp); bp = bp.reshape(len(rows), NP, 4)[..., :3]
    out = {'ev': ev.tolist(), 'rows': [list(c) for c in rows], 'in': wl[..., :3].tolist(), 'out_srgb': bp.tolist(),
           'view': sc.view_settings.view_transform, 'look': sc.view_settings.look, 'exposure': sc.view_settings.exposure,
           'blender': bpy.app.version_string}
    json.dump(out, open(os.path.join(a.work, 'wedge.json'), 'w'))
    print('WEDGE', sc.view_settings.view_transform, sc.view_settings.look, 'grey out at EV -3,0,+3:', [round(float(bp[0, int(np.argmin(abs(ev - e)))].mean()), 3) for e in (-3, 0, 3)])

if 'glb' in passes:
    Apath = os.path.join(a.work, 'albedo_f32.npy')
    A = np.load(Apath)
    srgb = srgb_enc(A)
    px = np.ones((T, T, 4), np.float32); px[..., :3] = srgb
    final = bpy.data.images.new('albedo_srgb', T, T, alpha=False)
    final.colorspace_settings.name = 'Non-Color'          # values already sRGB-encoded by hand; glTF treats the file as sRGB colour
    final.pixels.foreach_set(px.ravel()); final.update()
    final.filepath_raw = os.path.join(a.work, 'albedo.png'); final.file_format = 'PNG'; final.save()

    def flat(name, rgb, rough=0.9):
        m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
        return m
    bm = bpy.data.materials.new('LandBridge'); bm.use_nodes = True; bnt = bm.node_tree; bb = bnt.nodes['Principled BSDF']; bb.inputs['Roughness'].default_value = 1.0
    ti = bnt.nodes.new('ShaderNodeTexImage'); ti.image = final; bnt.links.new(ti.outputs['Color'], bb.inputs['Base Color'])
    uvn = bnt.nodes.new('ShaderNodeUVMap'); uvn.uv_map = 'UVAlbedo'; bnt.links.new(uvn.outputs['UV'], ti.inputs['Vector'])
    land.data.materials.clear(); land.data.materials.append(bm)
    trunk.data.materials.clear(); trunk.data.materials.append(flat('Bark', (0.10, 0.06, 0.04)))
    fol.data.materials.clear(); fol.data.materials.append(flat('Needles', (0.05, 0.13, 0.06)))
    bpy.ops.object.select_all(action='DESELECT')
    grey = flat('BoulderGrey', (0.30, 0.27, 0.24))      # ONE shared material: the old per-boulder materials made 20 primitives
    for b in boulders:
        b.data.materials.clear(); b.data.materials.append(grey); b.select_set(True)
    bpy.context.view_layer.objects.active = boulders[0]
    bpy.ops.object.join()
    rocks = bpy.context.object; rocks.name = 'Boulders'
    for o in (land, trunk, fol, rocks):                  # vertex colours are not used by the page: drop them (about 0.3 MB on the land)
        try:
            for ca in list(o.data.color_attributes):
                o.data.color_attributes.remove(ca)
        except Exception:
            pass
    bpy.ops.object.select_all(action='DESELECT')
    for o in (land, trunk, fol, rocks):
        o.select_set(True)
    glb = os.path.join(a.out, 'island_bridge.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_cameras=False, export_lights=False, export_yup=True,
                              export_image_format='JPEG', export_jpeg_quality=90, export_extras=False, export_animations=False)
    # which attributes did the land primitive get? (TEXCOORD_1 check)
    b = open(glb, 'rb').read(); n = int.from_bytes(b[12:16], 'little'); gj = json.loads(b[20:20 + n])
    attrs = sorted({k for m in gj['meshes'] for p in m['primitives'] for k in p['attributes']})
    print('GLB attributes', attrs, 'bytes', len(b))
    def tris(o):
        o.data.calc_loop_triangles(); return len(o.data.loop_triangles)
    info = {'seed': a.seed, 'grid': a.grid, 'tex': T, 'pad_px': PAD, 'samples': a.samples, 'shadow_samples': a.shadow_samples, 'sun_els': SUN_ELS, 'sun_az': BS.SUN_AZ,
            'sky_strength': BS.SKY_STRENGTH, 'sun_strength': BS.SUN_STRENGTH, 'sun_color': list(BS.SUN_COLOR), 'bake_seconds': times, 'total_seconds': round(time.time() - T0, 1),
            'tris': {'land': tris(land), 'trunks': tris(trunk), 'foliage': tris(fol), 'boulders': tris(rocks)}, 'half': IC.HALF, 'mesh_hash': hsh,
            'glb_attributes': attrs, 'glb_bytes': os.path.getsize(glb), 'blender': bpy.app.version_string, 'look': os.environ.get('LI_LOOK', 'bright'),
            'sun_dir_blender': [float(x) for x in BS.sun_dir(BS.SUN_EL, BS.SUN_AZ)]}
    json.dump(info, open(os.path.join(a.out, 'bake_info.json'), 'w'), indent=1)
    print(info)
print('TOTAL s', round(time.time() - T0, 1), times)
