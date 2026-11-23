"""WHITE-CARD test, Blender half (research/BAKE_BRIDGE.md 2.2): a white diffuse horizontal card under (a) the sky only, (b) the sun only, (c) the
Cycles DIFFUSE light bake (Direct+Indirect, no Color) of the card under the sky. The page half is blender/bridge_whitecard.html: it lights a white
MeshStandardMaterial with a lightMap holding (c) and with a DirectionalLight of intensity S/pi and must read the same linear values.
   python bridge_whitecard.py [--out whitecard_blender.json]
Writes the mean scene-linear RGB the card shows. Same sky, sun and units as bake_bridge.py."""
import sys, os, json, math, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np, mathutils
import li_scene as LS
import bridge_scene as BS

ap = argparse.ArgumentParser(); ap.add_argument('--out', default='whitecard_blender.json'); ap.add_argument('--samples', type=int, default=256)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
sc = LS.reset()
bpy.ops.mesh.primitive_plane_add(size=40.0, location=(0, 0, 0)); card = bpy.context.object
m = bpy.data.materials.new('White'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (1, 1, 1, 1); b.inputs['Roughness'].default_value = 1.0
for nm in ('Specular IOR Level', 'Specular'):
    if nm in b.inputs.keys():
        b.inputs[nm].default_value = 0.0
card.data.materials.append(m)
sky = LS.make_sky(sun_elev_deg=BS.SUN_EL, sun_az_deg=BS.SUN_AZ, strength=BS.SKY_STRENGTH)
bg = BS.world_background_node()
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
sun.data.color = BS.SUN_COLOR; sun.data.angle = math.radians(1.0)
BS.aim_sun(sun, BS.SUN_EL, BS.SUN_AZ)
cam = bpy.data.cameras.new('C'); cam.type = 'ORTHO'; cam.ortho_scale = 2.0
co = bpy.data.objects.new('C', cam); sc.collection.objects.link(co); sc.camera = co; co.location = (0, 0, 10); co.rotation_euler = (0, 0, 0)
LS.render_settings(sc, 16, 16, a.samples, False)
sc.cycles.use_denoising = False; sc.cycles.use_adaptive_sampling = False
sc.view_settings.view_transform = 'Standard'
try:
    sc.view_settings.look = 'None'
except Exception:
    pass
sc.view_settings.exposure = 0.0
sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'
res = {}
def shoot(name):
    p = os.path.abspath('_wc_%s.exr' % name); sc.render.filepath = p; bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(p); im.colorspace_settings.name = 'Non-Color'
    arr = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(arr); arr = arr.reshape(-1, 4)[:, :3]
    os.remove(p); return arr.mean(0).tolist()
sun.data.energy = 0.0; bg.inputs['Strength'].default_value = BS.SKY_STRENGTH
res['sky_only_render_rgb'] = shoot('sky')
sun.data.energy = BS.SUN_STRENGTH; bg.inputs['Strength'].default_value = 0.0
res['sun_only_render_rgb'] = shoot('sun')
res['sun_only_expected_rgb'] = [BS.SUN_STRENGTH * math.sin(math.radians(BS.SUN_EL)) / math.pi * c for c in BS.SUN_COLOR]
# the bake, as bake_bridge.py does it, on the same card (sky only, sun off)
sun.data.energy = 0.0; bg.inputs['Strength'].default_value = BS.SKY_STRENGTH
T = 64
uvl = card.data.uv_layers.active or card.data.uv_layers.new(name='UV')
img = bpy.data.images.new('wc', T, T, alpha=False, float_buffer=True)
nt = m.node_tree; tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
bpy.ops.object.select_all(action='DESELECT'); card.select_set(True); bpy.context.view_layer.objects.active = card
bk = sc.render.bake; bk.use_selected_to_active = False; bk.use_pass_direct = True; bk.use_pass_indirect = True; bk.use_pass_color = False; bk.margin = 2
sc.cycles.samples = a.samples
bpy.ops.object.bake(type='DIFFUSE')
p = np.empty(T * T * 4, np.float32); img.pixels.foreach_get(p); res['sky_bake_rgb'] = p.reshape(-1, 4)[:, :3].mean(0).tolist()
res['sun'] = {'strength': BS.SUN_STRENGTH, 'color': list(BS.SUN_COLOR), 'el': BS.SUN_EL}
res['sky_strength'] = BS.SKY_STRENGTH
json.dump(res, open(a.out, 'w'), indent=1); print(json.dumps(res, indent=1))
