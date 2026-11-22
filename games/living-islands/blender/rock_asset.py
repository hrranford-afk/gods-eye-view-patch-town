"""LAYERED COASTAL ROCK, asset-contract GLB (class prop). Headless:
   python rock_asset.py [--seed N] [--out DIR] [--no-bake] [--hash]
Pipeline: bevelled block -> subdivision (rounded edges) -> displace modifiers (lumps, strata ledges, joint grooves) = ~150k tri
source -> flat base, exact recipe size, origin at base centre -> decimate to a prop budget (LOD0 <= 1900 tris, LOD1 ~ 700)
-> UV unwrap -> Cycles bakes from the high source (diffuse colour + AO multiplied in, tangent normal map) -> GLB + manifest.
Contract: metres, y up, front +z, origin at base centre, node `collider` with extras.box [w,h,d]."""
import sys, os, time, math, argparse, json, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
import li_scene as LS

ap = argparse.ArgumentParser()
ap.add_argument('--seed', type=int, default=1122); ap.add_argument('--out', default='rock_out')
ap.add_argument('--no-bake', action='store_true'); ap.add_argument('--hash', action='store_true')
ap.add_argument('--tex', type=int, default=1024); ap.add_argument('--samples', type=int, default=48)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
SEED = a.seed
T0 = time.time()
W, D, H = 2.4, 1.8, 1.3         # recipe footprint (X, Y in Blender; width and depth in glTF) and height
LOD0_TRIS, LOD1_TRIS = 1900, 700

def build_source(seed):
    sc = LS.reset()
    rng = np.random.default_rng(seed)
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    ob = bpy.context.object; ob.name = 'RockSrc'
    ob.scale = (W * 0.98, D * 0.98, H * 1.02)
    bpy.ops.object.transform_apply(scale=True)
    # skew the block a little so it is not a perfect slab (seeded)
    me = ob.data
    for v in me.vertices:
        v.co.x += v.co.z * rng.uniform(-0.12, 0.12) * (1 if v.co.z > 0 else .3)
        v.co.y += v.co.z * rng.uniform(-0.1, 0.1)
        v.co.x *= 1 - 0.18 * (v.co.z > 0)
    def mod(kind, name, **kw):
        m = ob.modifiers.new(name, kind)
        for k, v in kw.items(): setattr(m, k, v)
        return m
    mod('BEVEL', 'bev', width=0.34, segments=4, limit_method='NONE', profile=0.6)
    mod('SUBSURF', 'sub', levels=5, render_levels=5, subdivision_type='CATMULL_CLARK')
    off = rng.uniform(-50, 50, 3)
    # 1 lumps: clouds
    e1 = bpy.data.objects.new('lumpsE', None); bpy.context.scene.collection.objects.link(e1); e1.location = tuple(off); e1.scale = (0.5, 0.5, 0.5)
    t1 = bpy.data.textures.new('lumps', 'CLOUDS'); t1.noise_scale = 1.2; t1.noise_depth = 3; t1.noise_basis = 'BLENDER_ORIGINAL'
    mod('DISPLACE', 'lumps', texture=t1, texture_coords='OBJECT', texture_coords_object=e1, strength=0.34, mid_level=0.5, direction='NORMAL')
    # 2 strata: saw-tooth bands in world z -> ledges
    e2 = bpy.data.objects.new('strataE', None); bpy.context.scene.collection.objects.link(e2)
    e2.location = (0, 0, float(rng.uniform(0, 1))); e2.rotation_euler = (0.05, math.radians(96), 0.04); e2.scale = (0.30, 800.0, 800.0)   # huge y,z scale: legacy WOOD bands run along (x+y+z), this keeps them on x only
    t2 = bpy.data.textures.new('strata', 'WOOD'); t2.wood_type = 'BANDNOISE'; t2.noise_basis_2 = 'SAW'; t2.noise_scale = 0.9; t2.turbulence = 5.5
    mod('DISPLACE', 'strata', texture=t2, texture_coords='OBJECT', texture_coords_object=e2, strength=0.075, mid_level=0.5, direction='NORMAL')
    # 3 joints: voronoi cell edges as grooves
    e3 = bpy.data.objects.new('jointE', None); bpy.context.scene.collection.objects.link(e3); e3.location = tuple(off[::-1]); e3.scale = (0.9, 0.9, 0.9)
    t3 = bpy.data.textures.new('joints', 'VORONOI'); t3.distance_metric = 'DISTANCE'; t3.color_mode = 'INTENSITY'; t3.noise_scale = 1.0
    t3.weight_1 = -1.0; t3.weight_2 = 1.0; t3.weight_3 = 0.0; t3.weight_4 = 0.0; t3.noise_intensity = 1.0
    mod('DISPLACE', 'joints', texture=t3, texture_coords='OBJECT', texture_coords_object=e3, strength=-0.07, mid_level=0.0, direction='NORMAL')
    # 4 fine weathering grain
    e4 = bpy.data.objects.new('grainE', None); bpy.context.scene.collection.objects.link(e4); e4.location = tuple(off + 7); e4.scale = (0.06, 0.06, 0.06)
    t4 = bpy.data.textures.new('grain', 'CLOUDS'); t4.noise_scale = 1.0; t4.noise_depth = 4
    mod('DISPLACE', 'grain', texture=t4, texture_coords='OBJECT', texture_coords_object=e4, strength=0.022, mid_level=0.5, direction='NORMAL')
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me2 = bpy.data.meshes.new_from_object(ev)
    hi = bpy.data.objects.new('RockHi', me2); bpy.context.scene.collection.objects.link(hi)
    bpy.data.objects.remove(ob)
    for e in (e1, e2, e3): bpy.data.objects.remove(e)
    # flatten base, then exact size and origin at base centre
    co = np.empty(len(me2.vertices) * 3); me2.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    zmin, zmax = co[:, 2].min(), co[:, 2].max()
    base_z = zmin + 0.10 * (zmax - zmin)
    co[:, 2] = np.maximum(co[:, 2], base_z)
    co -= np.array([(co[:, 0].max() + co[:, 0].min()) / 2, (co[:, 1].max() + co[:, 1].min()) / 2, co[:, 2].min()])
    co[:, 0] *= W / (co[:, 0].max() - co[:, 0].min()); co[:, 1] *= D / (co[:, 1].max() - co[:, 1].min()); co[:, 2] *= H / co[:, 2].max()
    me2.vertices.foreach_set('co', co.ravel()); me2.update()
    for p in me2.polygons: p.use_smooth = True
    return hi

def decimate_copy(hi, tris, name):
    me = hi.data.copy(); ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    t = ob.modifiers.new('tri', 'TRIANGULATE'); t.min_vertices = 4
    d = ob.modifiers.new('dec', 'DECIMATE'); d.decimate_type = 'COLLAPSE'
    cur = len(hi.data.polygons) * 2
    d.ratio = min(1.0, tris / max(cur, 1)); d.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob); ob2 = bpy.data.objects.new(name, me2); bpy.context.scene.collection.objects.link(ob2)
    for p in me2.polygons: p.use_smooth = True
    return ob2

def tri_count(ob):
    ob.data.calc_loop_triangles(); return len(ob.data.loop_triangles)

def mesh_hash(ob):
    co = np.empty(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get('co', co)
    return hashlib.sha256(np.round(co, 4).astype('<f4').tobytes() + str(len(ob.data.polygons)).encode()).hexdigest()[:16]

hi = build_source(SEED)
print('source tris', len(hi.data.polygons) * 2 if False else len(hi.data.polygons), 'faces; s', round(time.time() - T0, 1))
lod0 = decimate_copy(hi, LOD0_TRIS, 'rock')
lod1 = decimate_copy(hi, LOD1_TRIS, 'rock_lod1')
print('LOD0 tris', tri_count(lod0), 'LOD1 tris', tri_count(lod1))
print('HASH', mesh_hash(lod0), mesh_hash(lod1))
if a.hash or a.no_bake:
    sys.exit(0)

# ------------------------------------------------------------------ bake
os.makedirs(a.out, exist_ok=True)
sc = bpy.context.scene
LS.render_settings(sc, 64, 64, a.samples, False)
sc.cycles.use_denoising = False
hi.data.materials.append(LS.rock_material('RockHiMat', SEED + 3, 1.0, coords='object'))
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
def unwrap(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
T = a.tex
def bake(low, kind, img_name, extra=None):
    sc.cycles.samples = {'DIFFUSE': 4, 'NORMAL': 4, 'AO': a.samples}[kind]
    img = bpy.data.images.new(img_name, T, T, alpha=False)
    if kind == 'NORMAL': img.colorspace_settings.name = 'Non-Color'
    m = bpy.data.materials.new(img_name + 'M'); m.use_nodes = True
    nt = m.node_tree; tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
    low.data.materials.clear(); low.data.materials.append(m)
    bpy.ops.object.select_all(action='DESELECT'); hi.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
    sc.render.bake.use_selected_to_active = True
    sc.render.bake.cage_extrusion = 0.06; sc.render.bake.max_ray_distance = 0.25
    sc.render.bake.margin = 6; sc.render.bake.margin_type = 'EXTEND'
    if kind == 'DIFFUSE':
        sc.render.bake.use_pass_direct = False; sc.render.bake.use_pass_indirect = False; sc.render.bake.use_pass_color = True
    if kind == 'NORMAL':
        sc.render.bake.normal_space = 'TANGENT'
    bpy.ops.object.bake(type=kind)
    return img
res = {}
for low in (lod0, lod1):
    unwrap(low)
t1 = time.time()
cimg = bake(lod0, 'DIFFUSE', 'rock_color')
aoimg = bake(lod0, 'AO', 'rock_ao')
nimg = bake(lod0, 'NORMAL', 'rock_normal')
print('bake s', round(time.time() - t1, 1))
# multiply AO into colour (soft)
cp = np.empty(T * T * 4, np.float32); cimg.pixels.foreach_get(cp)
ap_ = np.empty(T * T * 4, np.float32); aoimg.pixels.foreach_get(ap_)
cp = cp.reshape(-1, 4); ap_ = ap_.reshape(-1, 4)
cp[:, :3] *= (0.45 + 0.55 * ap_[:, :1])
cimg.pixels.foreach_set(cp.ravel()); cimg.update()
cimg.pack(); nimg.pack()

def lod1_bake():
    # LOD1 has its own UVs: re-bake (cheap)
    c = bake(lod1, 'DIFFUSE', 'rock_color1'); o = bake(lod1, 'AO', 'rock_ao1'); n = bake(lod1, 'NORMAL', 'rock_normal1')
    p = np.empty(T * T * 4, np.float32); c.pixels.foreach_get(p); q = np.empty(T * T * 4, np.float32); o.pixels.foreach_get(q)
    p = p.reshape(-1, 4); q = q.reshape(-1, 4); p[:, :3] *= (0.45 + 0.55 * q[:, :1]); c.pixels.foreach_set(p.ravel()); c.update(); c.pack(); n.pack()
    return c, n
c1, n1 = lod1_bake()

def final_material(name, cimg_, nimg_):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = cimg_; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    n = nt.nodes.new('ShaderNodeTexImage'); n.image = nimg_
    nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

bpy.data.objects.remove(hi)
for ob, im, nm_ in ((lod0, cimg, nimg), (lod1, c1, n1)):
    ob.data.materials.clear(); ob.data.materials.append(final_material('RockCoastal', im, nm_))

# ------------------------------------------------------------------ export
def to_gltf_ready(ob, nm):
    ob.name = nm; ob.data.name = nm
for ob, nm in ((lod0, 'rock'), (lod1, 'rock_lod1')):
    ob.name = nm; ob.data.name = nm
def export(ob, path):
    for o in list(bpy.context.scene.objects):
        o.select_set(False)
    col = bpy.data.objects.new('collider', None); col.empty_display_type = 'CUBE'
    bpy.context.scene.collection.objects.link(col)
    col.location = (0, 0, H / 2); col.scale = (W / 2, D / 2, H / 2)
    col['box'] = [float(W), float(H), float(D)]
    ob.select_set(True); col.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_cameras=False, export_lights=False,
                              export_extras=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=88, export_animations=False,
                              export_materials='EXPORT', export_texcoords=True, export_normals=True, export_tangents=False)
    bpy.data.objects.remove(col)
    ob.select_set(False)
f0 = os.path.join(a.out, 'rock_01.glb'); f1 = os.path.join(a.out, 'rock_01.lod1.glb')
export(lod0, f0); export(lod1, f1)
print('GLB bytes', os.path.getsize(f0), os.path.getsize(f1))

# ------------------------------------------------------------------ preview + turntable still render
if os.environ.get('ROCK_RENDER', '1') == '1':
    sys.argv = [sys.argv[0]]
    # reuse rock_render for the still
print('total s', round(time.time() - T0, 1))
