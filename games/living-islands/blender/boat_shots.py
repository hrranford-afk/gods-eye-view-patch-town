"""PICTURES OF THE BOAT KIT, rendered from the GLB files (not from the builder), so what is seen is what ships. See BOAT_MODEL.md.
Headless:  blender -b --python boat_shots.py -- --glb DIR --out DIR [--w 1200 --h 800 --samples 64] [--only 1,2,3,4,5,sheet,lods] [--prefix boat]
DIR for --glb holds the GLB files written by boat_model.py (boat_<boat>_<lod>.glb). Poses that are not at rest are written into a scratch folder by the same writer (never committed).
Writes <prefix>-1.png (dinghy rowing, afloat), -2 (sailer, sail filled), -3 (work boat, davit out), -4 (the wreck on the strand), -5 (inside the dinghy, dry), <prefix>-sheet.png (3 boats x 3 views and the wreck, labelled), <prefix>-lods.png.
Same sky, light and look as the other Living Islands pictures (li_scene.make_sky and render_settings). Blender 5.x patterns, CPU Cycles, fixed seed.
The sea is a plane at z = 0 with a hole cut exactly along the hull at the waterline (a Boolean with a prism of the waterline outline), which is what the depth-only `hullmask` lid does on the page. The hullmask node itself is not rendered."""
import sys, os, math, argparse, tempfile, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Boat kit pictures from the GLB files.')
    ap.add_argument('--glb', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=64)
    ap.add_argument('--only', default='1,2,3,4,5,sheet,lods'); ap.add_argument('--prefix', default='boat'); ap.add_argument('--lod', default='hero')
    a = ap.parse_args(argv); a.only = [s.strip() for s in a.only.split(',') if s.strip()]
    return a


GLYPHS = {
    'V': '10001 10001 10001 10001 01010 01010 00100', 'G': '01110 10001 10000 10111 10001 10001 01111', 'K': '10001 10010 10100 11000 10100 10010 10001',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'P': '11110 10001 10001 11110 10000 10000 10000', 'U': '10001 10001 10001 10001 10001 10001 01110',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'W': '10001 10001 10001 10101 10101 11011 10001',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00110 01000 10000 11111',
    '5': '11111 10000 11110 00001 00001 10001 01110', '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100', '.': '00000 00000 00000 00000 00000 01100 01100',
    'Q': '01110 10001 10001 10001 10101 10010 01101', 'J': '00111 00010 00010 00010 00010 10010 01100', 'X': '10001 10001 01010 00100 01010 10001 10001', '-': '00000 00000 00000 11111 00000 00000 00000',
}

# tuned views: (camera position, target, lens) in the boat frame (bow +X), the boat sits at the origin with the waterline at z = 0
VIEWS = {
    'dinghy': {'3q': ((4.3, -4.4, 2.0), (1.85, 0.0, 0.05), 40.0), 'side': ((2.0, -6.0, 0.7), (1.95, 0.0, 0.1), 38.0), 'top': ((2.0, 0.0, 6.6), (2.0, 0.0, 0.0), 40.0)},
    'sailer': {'3q': ((6.8, -8.5, 3.2), (2.9, 0.0, 1.3), 42.0), 'side': ((3.0, -10.5, 1.4), (3.0, 0.0, 1.3), 42.0), 'top': ((3.0, 0.0, 10.5), (3.0, 0.0, 0.0), 40.0)},
    'work': {'3q': ((7.8, -7.6, 3.2), (3.4, 0.0, 0.5), 40.0), 'side': ((3.5, -10.0, 0.9), (3.5, 0.0, 0.5), 40.0), 'top': ((3.5, 0.0, 10.8), (3.5, 0.0, 0.0), 42.0)},
    'wreck': {'3q': ((3.6, -3.8, 1.5), (1.9, 0.0, 0.05), 40.0), 'side': ((1.9, -5.4, 0.55), (1.9, 0.0, 0.1), 38.0), 'top': ((2.0, 0.0, 6.2), (2.0, 0.0, 0.0), 40.0)},
}


def scene(a, sun_el=26.0, sun_az=125.0, exposure=-0.15, w=None, h=None):
    import bpy
    import li_scene as LS
    import collector_sheet as CS
    sc = LS.reset(); LS.render_settings(sc, w or a.w, h or a.h, a.samples, True, exposure=exposure)
    sc.cycles.seed = 11
    try: sc.cycles.use_animated_seed = False
    except Exception: pass
    LS.make_sky(sun_elev_deg=sun_el, sun_az_deg=sun_az, strength=0.40, overcast=0.0, haze=0.30, horizon_soften=0.5)
    CS._sun(sc, sun_el, sun_az, 8.0, colour=(1.0, 0.86, 0.68))
    return LS, sc


def new_mat(name, base, rough=0.9, **kw):
    import bpy
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*base, 1); bs.inputs['Roughness'].default_value = rough
    for k, v in kw.items():
        try: bs.inputs[k].default_value = v
        except Exception: pass
    return m


def sand_material(name='Sand'):
    import bpy
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.6; n1.inputs['Detail'].default_value = 6
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 220.0; n2.inputs['Detail'].default_value = 2
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.35; rp.color_ramp.elements[1].position = 0.7
    rp.color_ramp.elements[0].color = (0.30, 0.22, 0.12, 1); rp.color_ramp.elements[1].color = (0.46, 0.36, 0.22, 1); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac'])
    nt.links.new(rp.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.95
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.7; bm.inputs['Distance'].default_value = 0.01; nt.links.new(n2.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], bs.inputs['Normal'])
    return m


def sea_material():
    import bpy
    m = bpy.data.materials.new('Sea'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); nt.links.new(mix.outputs[0], out.inputs['Surface'])
    g = nt.nodes.new('ShaderNodeBsdfPrincipled'); g.inputs['Base Color'].default_value = (0.05, 0.16, 0.17, 1); g.inputs['Roughness'].default_value = 0.05
    try: g.inputs['Transmission Weight'].default_value = 0.85
    except Exception: pass
    try: g.inputs['IOR'].default_value = 1.33
    except Exception: pass
    d = nt.nodes.new('ShaderNodeBsdfDiffuse'); d.inputs['Color'].default_value = (0.012, 0.05, 0.055, 1)
    nt.links.new(g.outputs['BSDF'], mix.inputs[1]); nt.links.new(d.outputs['BSDF'], mix.inputs[2]); mix.inputs['Fac'].default_value = 0.42
    tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 2.4; n1.inputs['Detail'].default_value = 5
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 14.0; n2.inputs['Detail'].default_value = 2
    nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; nt.links.new(n1.outputs['Fac'], ad.inputs[0]); nt.links.new(n2.outputs['Fac'], ad.inputs[1])
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.35; bm.inputs['Distance'].default_value = 0.06; nt.links.new(ad.outputs[0], bm.inputs['Height'])
    nt.links.new(bm.outputs['Normal'], g.inputs['Normal']); nt.links.new(bm.outputs['Normal'], d.inputs['Normal'])
    return m


def foam_material():
    import bpy
    m = bpy.data.materials.new('Foam'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); nt.links.new(mix.outputs[0], out.inputs['Surface'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); df = nt.nodes.new('ShaderNodeBsdfDiffuse'); df.inputs['Color'].default_value = (0.8, 0.84, 0.82, 1)
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18.0; nz.inputs['Detail'].default_value = 4
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.28; rp.color_ramp.elements[1].position = 0.55; rp.color_ramp.elements[1].color = (0.9, 0.9, 0.9, 0.7)
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(df.outputs[0], mix.inputs[2]); return m


def import_boat(path, loc=(0, 0, 0), yaw=0.0, roll=0.0, pitch=0.0, hide=('hullmask',)):
    """import a GLB: the root pivot sits at loc with the heading yaw (deg about Z), roll (about the boat's X) and pitch (about Y). The glTF boat faces +Z; the importer's Y-up swap makes it face -Y, so it is turned 90 degrees to face +X."""
    import bpy
    before = set(bpy.data.objects.keys()); bpy.ops.import_scene.gltf(filepath=path)
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    apply_node_pose(path, new)
    roots = [o for o in new if o.parent is None]
    piv = bpy.data.objects.new('BoatPivot', None); bpy.context.scene.collection.objects.link(piv)
    inner = bpy.data.objects.new('BoatFace', None); bpy.context.scene.collection.objects.link(inner); inner.parent = piv; inner.rotation_euler = (0, 0, math.radians(90.0))
    for r in roots: r.parent = inner
    piv.location = loc; piv.rotation_euler = (math.radians(roll), math.radians(pitch), math.radians(yaw)); piv.rotation_mode = 'ZYX' if False else 'XYZ'
    for o in new:
        if o.name.split('.')[0] in hide: o.hide_render = True; o.hide_viewport = True
    return piv, new


def apply_node_pose(path, objs):
    """the importer plays the first animation clip (pose_rest) on its own; drop the actions and set every node's own translation, rotation and scale from the file, so the pose in the file is the pose in the picture"""
    import bpy, struct
    from mathutils import Quaternion, Vector
    d = open(path, 'rb').read(); jl = struct.unpack('<I4s', d[12:20])[0]; js = json.loads(d[20:20 + jl].decode())
    by = {o.name.split('.')[0]: o for o in objs}
    for o in objs:
        if o.animation_data: o.animation_data_clear()
    for n in js['nodes']:
        o = by.get(n['name'])
        if o is None: continue
        t = n.get('translation', [0, 0, 0]); q = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1])
        o.rotation_mode = 'QUATERNION'; o.location = Vector((t[0], -t[2], t[1])); o.rotation_quaternion = Quaternion((q[3], q[0], -q[2], q[1])); o.scale = Vector((s[0], s[2], s[1]))


def set_foam(objs, z=0.0035):
    import bpy
    fm = foam_material()
    for o in objs:
        if o.name.split('.')[0] == 'waterline' and o.type == 'MESH':
            o.data.materials.clear(); o.data.materials.append(fm); o.location.z += 0
            o.show_in_front = False


def sea_with_hole(H, spec, piv, pad=0.0, size=300.0, seabed_z=-2.2):
    """the sea plane at z = 0 with a hole cut along the hull's waterline outline (what the depth-only hullmask does on the page) and a sand seabed under it."""
    import bpy
    import numpy as np
    from mathutils import Vector
    us = H.ustations(48); tz = H.t_at_z(us, np.zeros_like(us)); Pw = H.surf(us, tz)
    port = [(float(p[0]), float(p[1]) + pad) for p in Pw]; star = [(float(p[0]), -float(p[1]) - pad) for p in Pw[::-1]]
    poly = port + star[1:-1] if False else port[1:-1] + star[1:-1] if False else port + star
    poly = [p for i, p in enumerate(poly) if i == 0 or (abs(p[0] - poly[i - 1][0]) > 1e-4 or abs(p[1] - poly[i - 1][1]) > 1e-4)]
    # slab: polygon extruded from z = -0.25 to +0.25 in the boat frame (parented to the boat pivot so it heels with it)
    n = len(poly); verts = [(x, y, -0.25) for x, y in poly] + [(x, y, 0.25) for x, y in poly]
    cx = sum(p[0] for p in poly) / n; cy = sum(p[1] for p in poly) / n
    verts += [(cx, cy, -0.25), (cx, cy, 0.25)]
    faces = []
    for i in range(n):
        j = (i + 1) % n; faces.append((i, j, n + j, n + i)); faces.append((j, i, 2 * n, ) if False else (i, j, 2 * n)); faces.append((n + j, n + i, 2 * n + 1))
    me = bpy.data.meshes.new('HoleSlab'); me.from_pydata(verts, [], faces); me.update(); slab = bpy.data.objects.new('HoleSlab', me); bpy.context.scene.collection.objects.link(slab)
    bpy.context.view_layer.objects.active = slab
    bpy.ops.object.select_all(action='DESELECT'); slab.select_set(True)
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    slab.parent = piv; slab.rotation_euler = (0, 0, 0); slab.hide_render = True
    # the slab mesh is in the boat frame, the pivot supplies the roll and heading; the glTF root has the extra 90 degree turn, which the slab does not, so the slab is parented to the BoatFace's parent
    sea = bpy.data.objects.new('Sea', bpy.data.meshes.new('Sea')); bpy.context.scene.collection.objects.link(sea)
    s = size; sea.data.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)]); sea.data.update()
    sea.data.materials.append(sea_material())
    md = sea.modifiers.new('Hole', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.operand_type = 'OBJECT'; md.object = slab; md.solver = 'EXACT'
    bed = bpy.data.objects.new('Seabed', bpy.data.meshes.new('Seabed')); bpy.context.scene.collection.objects.link(bed)
    bed.data.from_pydata([(-s, -s, seabed_z), (s, -s, seabed_z), (s, s, seabed_z), (-s, s, seabed_z)], [], [(0, 1, 2, 3)]); bed.data.update(); bed.data.materials.append(sand_material('SeabedSand'))
    return sea


def sand_plane(z, size=300.0):
    import bpy
    ob = bpy.data.objects.new('Strand', bpy.data.meshes.new('Strand')); bpy.context.scene.collection.objects.link(ob)
    s = size; ob.data.from_pydata([(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z)], [], [(0, 1, 2, 3)]); ob.data.update(); ob.data.materials.append(sand_material())
    return ob


def stones(z, rng, n=60, centre=(2.0, 0.0), rad=4.0):
    import bpy
    import collector_sheet as CS
    mat = new_mat('Stone', (0.22, 0.21, 0.19), 0.85)
    for i in range(n):
        x = centre[0] + rng.uniform(-rad, rad); y = centre[1] + rng.uniform(-rad, rad)
        if abs(x - centre[0]) < 2.4 and abs(y) < 0.9: continue
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(x, y, z + 0.01))
        o = bpy.context.active_object; r = rng.uniform(0.03, 0.12); o.scale = (r * rng.uniform(1, 1.8), r * rng.uniform(0.8, 1.4), r * 0.55); o.rotation_euler = (0, 0, rng.uniform(0, 6)); o.data.materials.append(mat)
        o.data.polygons.foreach_set('use_smooth', [True] * len(o.data.polygons))


def pose_glb(boat, lod, pose, glb_dir, tmp):
    """the committed GLB for the rest pose, a scratch GLB written by the same writer for another pose"""
    import boat_model as BM
    if pose == 'rest' and os.path.exists(os.path.join(glb_dir, BM.out_name(boat, lod))): return os.path.join(glb_dir, BM.out_name(boat, lod))
    p = os.path.join(tmp, BM.out_name(boat, lod, pose)); BM.write_glb(p, boat, lod, pose); return p


def cam(sc, loc, tgt, lens):
    import collector_sheet as CS
    return CS._cam(sc, 'Cam', loc, tgt, lens)


def render(sc, c, path):
    import bpy
    sc.camera = c; sc.render.filepath = path; bpy.ops.render.render(write_still=True); print('PICTURE', path, flush=True)


def afloat(a, boat, pose, view, out, glb, tmp, lod='hero', roll=0.0, pitch=0.0, yaw=0.0, w=None, h=None, sun=(26.0, 125.0), cam_override=None, exposure=-0.15):
    import bpy
    import boat_model as BM
    LS, sc = scene(a, sun[0], sun[1], exposure, w, h)
    spec = BM.SPECS[boat]; H = BM.Hull(spec)
    piv, objs = import_boat(pose_glb(boat, lod, pose, glb, tmp), (0, 0, 0), yaw, roll, pitch)
    set_foam(objs)
    sea_with_hole(H, spec, piv)
    cp, tg, ln = cam_override or VIEWS[boat][view]
    c = cam(sc, cp, tg, ln); render(sc, c, out)


def beached(a, boat, pose, view, out, glb, tmp, lod='hero', roll=8.0, w=None, h=None, sun=(24.0, 118.0), cam_override=None):
    import bpy
    import boat_model as BM
    LS, sc = scene(a, sun[0], sun[1], -0.15, w, h)
    spec = BM.SPECS[boat]
    piv, objs = import_boat(pose_glb(boat, lod, pose, glb, tmp), (0, 0, 0), 0.0, roll)
    for o in objs:
        if o.name.split('.')[0] == 'waterline': o.hide_render = True
    sand_plane(-spec['draft'] - 0.012 + 0.04); stones(-spec['draft'] + 0.0, np.random.default_rng(5))
    cp, tg, ln = cam_override or VIEWS[boat][view]
    c = cam(sc, cp, tg, ln); render(sc, c, out)


def shot_1(a, out, glb, tmp):
    afloat(a, 'dinghy', 'rowing', '3q', os.path.join(out, a.prefix + '-1.png'), glb, tmp, roll=1.5, pitch=-0.8, yaw=0.0, cam_override=((4.6, -3.9, 1.5), (1.9, 0.0, 0.18), 40.0))

def shot_2(a, out, glb, tmp):
    afloat(a, 'sailer', 'sailing', '3q', os.path.join(out, a.prefix + '-2.png'), glb, tmp, roll=-7.0, pitch=-0.5, yaw=0.0, cam_override=((7.8, -7.6, 2.6), (2.9, 0.0, 1.5), 40.0), sun=(30.0, 150.0))

def shot_3(a, out, glb, tmp):
    afloat(a, 'work', 'working', '3q', os.path.join(out, a.prefix + '-3.png'), glb, tmp, roll=2.0, cam_override=((8.4, -6.4, 2.7), (3.4, 0.0, 0.55), 40.0))

def shot_4(a, out, glb, tmp):
    beached(a, 'wreck', 'rest', '3q', os.path.join(out, a.prefix + '-4.png'), glb, tmp, roll=9.0, cam_override=((3.3, -3.4, 0.95), (1.9, 0.0, 0.2), 42.0), sun=(22.0, 120.0))

def shot_5(a, out, glb, tmp):
    afloat(a, 'dinghy', 'rest', 'top', os.path.join(out, a.prefix + '-5.png'), glb, tmp, roll=0.0, cam_override=((0.2, -1.6, 2.7), (2.1, 0.0, -0.05), 52.0))


def label_png(path, labels, scale=3):
    import collector_sheet as CS
    CS.FONT.update(GLYPHS); img = CS.read_png(path)
    for (x, y, text) in labels: CS.draw_text(img, x, y, text, scale, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(path, img)


def shot_sheet(a, out, glb, tmp):
    """3 boats x 3 views (three-quarter, side, from above) and the wreck, labelled. Each cell is rendered on its own and put together."""
    import collector_sheet as CS
    cw, ch = 640, 420; rows = [('dinghy', 'rowing'), ('sailer', 'sailing'), ('work', 'working'), ('wreck', 'rest')]
    cells = []
    sheet_a = argparse.Namespace(**vars(a)); sheet_a.samples = max(24, a.samples // 2)
    names = {'dinghy': 'ROWING DINGHY 4 M', 'sailer': 'SAILING BOAT 6 M', 'work': 'WORK BOAT 7 M', 'wreck': 'WRECK OF THE DINGHY'}
    for bi, (boat, pose) in enumerate(rows):
        for vi, view in enumerate(('3q', 'side', 'top')):
            p = os.path.join(out, 'cell-%d-%d.png' % (bi, vi))
            ov = VIEWS[boat][view]
            if os.environ.get('BOAT_REUSE_CELLS') and os.path.exists(p): pass
            elif boat == 'wreck': beached(sheet_a, boat, pose, view, p, glb, tmp, roll=9.0, w=cw, h=ch, cam_override=ov)
            else: afloat(sheet_a, boat, pose, view, p, glb, tmp, roll=(-6.0 if (boat == 'sailer' and pose == 'sailing') else 0.0), w=cw, h=ch)
            cells.append(CS.read_png(p))
    pad = 8; top = 40
    W = pad + 3 * (cw + pad); Hh = top + 4 * (ch + pad)
    sheet = np.full((Hh, W, 3), 0.12, np.float32); CS.FONT.update(GLYPHS)
    for ci, cap in enumerate(('THREE QUARTER', 'SIDE', 'FROM ABOVE')): CS.draw_text(sheet, pad + ci * (cw + pad) + 6, 12, cap, 3, (0.92, 0.9, 0.84))
    for bi, (boat, pose) in enumerate(rows):
        for vi in range(3):
            y = top + bi * (ch + pad); x = pad + vi * (cw + pad); sheet[y:y + ch, x:x + cw] = cells[bi * 3 + vi][:ch, :cw]
        CS.draw_text(sheet, pad + 8, top + bi * (ch + pad) + 8, names[boat], 2, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(out, a.prefix + '-sheet.png'), sheet)


def wire_override():
    import bpy
    m = bpy.data.materials.new('WireFlat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); wf = nt.nodes.new('ShaderNodeWireframe'); wf.use_pixel_size = True; wf.inputs['Size'].default_value = 1.0
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = (0.90, 0.88, 0.82, 1); mx.inputs[7].default_value = (0.05, 0.05, 0.06, 1)
    nt.links.new(wf.outputs['Fac'], mx.inputs[0]); nt.links.new(mx.outputs[2], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def shot_lods(a, out, glb, tmp):
    """hero, live, far of the dinghy and the sailer: shaded on top, wire below, each on a plain sand ground"""
    import bpy, json
    import collector_sheet as CS
    import boat_model as BM
    cw, ch = 400, 260; cells = {}
    rep = {}
    try: rep = json.load(open(os.path.join(glb, 'boat_report.json')))
    except Exception: pass
    boats = ('dinghy', 'sailer', 'work')
    for boat in boats:
        for lod in ('hero', 'live', 'far'):
            for wire in (False, True):
                LS, sc = scene(a, 30.0, 125.0, -0.1, cw, ch)
                piv, objs = import_boat(pose_glb(boat, lod, 'rest', glb, tmp), (0, 0, 0), 20.0)
                for o in objs:
                    if o.name.split('.')[0] == 'waterline': o.hide_render = True
                spec = BM.SPECS[boat]; sand_plane(-spec['draft'] - 0.01)
                L = spec['L']; cp = (L * 0.5 + L * 0.95, -L * 0.8, L * 0.42); c = cam(sc, cp, (L * 0.5, 0, 0.35 * L * 0.2 + 0.2), 38.0)
                if wire:
                    bpy.context.view_layer.material_override = wire_override(); sc.cycles.samples = 8
                    for o in bpy.data.objects:
                        if o.name.startswith('Strand'): o.hide_render = True
                    nt = sc.world.node_tree; nt.nodes.clear(); o_ = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.18, 0.19, 0.2, 1); nt.links.new(bg.outputs[0], o_.inputs['Surface'])
                    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 0.0
                p = os.path.join(out, 'lod-%s-%s-%d.png' % (boat, lod, wire)); render(sc, c, p); cells[(boat, lod, wire)] = CS.read_png(p)
                bpy.context.view_layer.material_override = None
    rows = []
    for boat in boats:
        for wire in (False, True): rows.append(np.concatenate([cells[(boat, lod, wire)] for lod in ('hero', 'live', 'far')], 1))
    img = np.concatenate(rows, 0); CS.FONT.update(GLYPHS)
    for bi, boat in enumerate(boats):
        for li, lod in enumerate(('hero', 'live', 'far')):
            fn = 'boat_%s_%s.glb' % (boat, lod); st = rep.get(fn, {}); y = bi * 2 * ch + 8
            CS.draw_text(img, li * cw + 8, y, '%s %s %d TRI %d KB' % (boat.upper(), lod.upper(), st.get('triangles', 0), round(st.get('bytes', 0) / 1024.0)), 2, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(out, a.prefix + '-lods.png'), img)


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True); tmp = tempfile.mkdtemp(prefix='boat_pose_')
    jobs = {'1': shot_1, '2': shot_2, '3': shot_3, '4': shot_4, '5': shot_5, 'sheet': shot_sheet, 'lods': shot_lods}
    for k in a.only:
        if k in jobs: jobs[k](a, a.out, a.glb, tmp)


if __name__ == '__main__':
    main()
