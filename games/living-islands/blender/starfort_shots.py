"""PICTURES OF THE STAR FORT KIT, rendered from the GLB files (not from the builder), so what is seen is what ships. See STAR_FORT_KIT.md.
Headless:  blender -b --python starfort_shots.py -- --glb DIR --out DIR [--w 1200 --h 800 --samples 64] [--only sheet,1,2,3,try:<cell>,<piece>:<state>] [--lod hero]
DIR for --glb holds the GLB files written by starfort_model.py (starfort_<piece>_<lod>.glb). Writes starfort-sheet.png (labelled 3 x 3) and starfort-1.png .. starfort-3.png (the three best, 1200 x 800).
Same sky, light and look as the other Living Islands pictures (boat_shots.scene: li_scene.make_sky and render_settings), with the sea reaching the horizon. Blender 5.x patterns, CPU Cycles, fixed seed.
Each GLB is imported once and its objects are copied (sharing mesh data) for every placed part; the placement is the layout of starfort_layout.py. Frame: glTF x, y, z becomes Blender (x, -z, y)."""
import sys, os, math, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

STATE_NODES = ('intact', 'cracked', 'breached', 'silted')
SKIP_NODES = ('footprint',)
HIDE_BREACHED = {'sally_gate': ('frame', 'tunnel', 'door', 'door_2'), 'powder_store': ('door',), 'guardhouse': ('door',)}


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Star fort kit pictures from the GLB files.')
    ap.add_argument('--glb', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=64)
    ap.add_argument('--only', default='sheet,1,2,3'); ap.add_argument('--lod', default='hero')
    a = ap.parse_args(argv); a.only = [s.strip() for s in a.only.split(',') if s.strip()]
    return a


def B(p): return (p[0], -p[2], p[1])


# ------------------------------------------------------------------------------------------------- importing and placing parts
class Library:
    """each GLB is imported once; placements copy the objects (the mesh data is shared)"""
    def __init__(self, glb_dir, lod):
        self.dir = glb_dir; self.lod = lod; self.cache = {}

    def template(self, piece, lod=None):
        import bpy
        key = (piece, lod or self.lod)
        if key in self.cache: return self.cache[key]
        path = os.path.join(self.dir, 'starfort_%s_%s.glb' % (piece, lod or self.lod))
        before = set(bpy.data.objects.keys()); bpy.ops.import_scene.gltf(filepath=path)
        new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
        for o in new:
            if o.animation_data: o.animation_data_clear()
        bpy.context.view_layer.update()
        info = []
        for o in new:
            chain = []; q = o
            while q is not None: chain.append(q.name.split('.')[0]); q = q.parent
            info.append((o, chain, o.matrix_world.copy()))
        for o in new: o.hide_render = True; o.hide_viewport = True
        self.cache[key] = info; return info

    def place(self, piece, x, z, yaw_deg, state='intact', lod=None, y=0.0, pose=None, hide=(), scale=(1.0, 1.0, 1.0), only=None):
        """copy the parts of a piece into the scene at glTF position (x, y, z) with yaw about +Y. pose: {node name: ((px, py, pz) glTF pivot, 'x'|'y'|'z' glTF axis, degrees)}"""
        import bpy
        from mathutils import Matrix, Vector
        info = self.template(piece, lod)
        psi = math.radians(yaw_deg); c, s = math.cos(psi), math.sin(psi)
        Pm = Matrix(((c, -s, 0, x), (s, c, 0, -z), (0, 0, 1, y), (0, 0, 0, 1)))
        Rq = Pm.to_quaternion()
        if tuple(scale) != (1.0, 1.0, 1.0): Pm = Pm @ Matrix.Diagonal((scale[0], scale[2], scale[1], 1.0))
        hide = set(hide) | (set(HIDE_BREACHED.get(piece, ())) if state == 'breached' else set())
        made = []
        for o, chain, mw in info:
            if o.type != 'MESH': continue
            st = [n for n in chain if n in STATE_NODES]
            if st and st[0] != state: continue
            if any(n in SKIP_NODES or n.startswith('socket_') for n in chain): continue
            if any(n in hide for n in chain): continue
            if only is not None and not any(n in only for n in chain): continue
            no = o.copy(); bpy.context.scene.collection.objects.link(no); no.hide_render = False; no.hide_viewport = False; no.parent = None
            M = Pm @ mw
            if pose:
                for pn, (piv, axis, deg) in pose.items():
                    if pn in chain:
                        pw = Pm @ Vector((piv[0], -piv[2], piv[1])); ax = Rq @ Vector({'x': (1, 0, 0), 'y': (0, 0, 1), 'z': (0, -1, 0)}[axis])
                        M = Matrix.Translation(pw) @ Matrix.Rotation(math.radians(deg), 4, ax) @ Matrix.Translation(-pw) @ M
            no.matrix_world = M; made.append(no)
        return made


# ------------------------------------------------------------------------------------------------- scene, ground, sea
def scene(a, sun_el=26.0, sun_az=125.0, exposure=-0.1, w=None, h=None):
    import boat_shots as BS
    ns = argparse.Namespace(**vars(a)); LS, sc = BS.scene(ns, sun_el, sun_az, exposure, w, h)
    return LS, sc


def flat_plane(z, size, mat, name):
    import bpy
    me = bpy.data.meshes.new(name); me.from_pydata([(-size, -size, z), (size, -size, z), (size, size, z), (-size, size, z)], [], [(0, 1, 2, 3)]); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); me.materials.append(mat); return ob


def rect_plane(x0, y0, x1, y1, z, mat, name):
    import bpy
    me = bpy.data.meshes.new(name); me.from_pydata([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], [], [(0, 1, 2, 3)]); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); me.materials.append(mat); return ob


def poly_surface(loops, z, mat, name):
    """a flat surface at height z bounded by the first loop with the other loops as holes; loops are lists of Blender (x, y)"""
    import bpy, bmesh
    bm = bmesh.new(); edges = []
    for loop in loops:
        vs = [bm.verts.new((x, y, z)) for x, y in loop]; edges += [bm.edges.new((vs[i], vs[(i + 1) % len(vs)])) for i in range(len(vs))]
    bmesh.ops.triangle_fill(bm, use_beauty=False, use_dissolve=False, edges=edges)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return ob


def fan_surface(poly, z, mat, name):
    """a flat surface over a polygon that is star-shaped about its centroid: triangles from the centroid (a fort outline is star-shaped; overlaps of a self-crossing inner outline lie in one plane)"""
    import bpy
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    verts = [(cx, cy, z)] + [(x, y, z) for x, y in poly]; faces = [(0, 1 + i, 1 + (i + 1) % len(poly)) for i in range(len(poly))]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return ob


def ground_material(kind='earth'):
    import bpy
    m = bpy.data.materials.new('G_' + kind); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.12; n1.inputs['Detail'].default_value = 6
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 2.6; n2.inputs['Detail'].default_value = 4
    n3 = nt.nodes.new('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 120.0; n3.inputs['Detail'].default_value = 2
    for n in (n1, n2, n3): nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac'])
    cols = {'turf': ((0.05, 0.10, 0.028), (0.14, 0.23, 0.06)), 'dune': ((0.30, 0.24, 0.14), (0.50, 0.42, 0.27)), 'earth': ((0.10, 0.075, 0.045), (0.22, 0.17, 0.10)), 'court': ((0.16, 0.14, 0.09), (0.30, 0.26, 0.17))}[kind]
    rp.color_ramp.elements[0].position = 0.35; rp.color_ramp.elements[1].position = 0.65; rp.color_ramp.elements[0].color = (*cols[0], 1); rp.color_ramp.elements[1].color = (*cols[1], 1)
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 0.45
    nt.links.new(rp.outputs['Color'], mix.inputs[6]); nt.links.new(n2.outputs['Color'], mix.inputs[7]); nt.links.new(mix.outputs[2], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.95
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.6; bm.inputs['Distance'].default_value = 0.03; nt.links.new(n3.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], bs.inputs['Normal'])
    return m


def big_sea(level):
    import bpy
    import boat_shots as BS
    R = 60000.0
    me = bpy.data.meshes.new('Sea'); me.from_pydata([(-R, -R, level), (R, -R, level), (R, R, level), (-R, R, level)], [], [(0, 1, 2, 3)]); me.update()
    ob = bpy.data.objects.new('Sea', me); bpy.context.scene.collection.objects.link(ob); me.materials.append(BS.sea_material()); return ob


def island_ground(sc, hole=None, courtyard=None, bed=None, radius=190.0, sea=-2.6):
    """a round plateau at y = 0 with a beach ring falling to the sea; the fort stands in a hole of it (the pieces make the floor of the ditch and the glacis); sea out to the horizon"""
    import bpy
    th = np.linspace(0, 2 * math.pi, 73)[:-1]
    outer = [(radius * math.cos(t), radius * math.sin(t)) for t in th]
    loops = [outer] + ([hole] if hole else [])
    poly_surface(loops, 0.0, ground_material('turf'), 'Plateau')
    r0, r1 = radius - 0.05, radius + 26.0; verts = []; faces = []
    for i, t in enumerate(th):
        verts.append((r0 * math.cos(t), r0 * math.sin(t), 0.0)); verts.append((r1 * math.cos(t), r1 * math.sin(t), sea - 0.3))
    n = len(th)
    for i in range(n): faces.append((2 * i, 2 * i + 1, 2 * ((i + 1) % n) + 1, 2 * ((i + 1) % n)))
    me = bpy.data.meshes.new('Beach'); me.from_pydata(verts, [], faces); me.update(); ob = bpy.data.objects.new('Beach', me); bpy.context.scene.collection.objects.link(ob); me.materials.append(ground_material('dune'))
    for p in me.polygons: p.use_smooth = True
    if courtyard: poly_surface([courtyard], 0.001, ground_material('court'), 'Court')
    if bed: flat_plane(-2.02, radius, ground_material('earth'), 'DitchBed')
    big_sea(sea)


def cam(sc, loc, tgt, lens):
    import boat_shots as BS
    return BS.cam(sc, B(loc), B(tgt), lens)


def render(sc, c, path):
    import boat_shots as BS
    BS.render(sc, c, path)


SMLEN = {'bastion_face': 6.0}


# ------------------------------------------------------------------------------------------------- one piece on its own, for looking at while building
def single(a, piece, state, out, loc, tgt, lens, sun=(30.0, 135.0), yaw=0.0, lod='hero', w=None, h=None):
    LS, sc = scene(a, sun[0], sun[1], -0.1, w or a.w, h or a.h)
    rect_plane(-300, -300, 300, 300, -2.0, ground_material('earth'), 'Bed'); rect_plane(-300, -300, 300, 300, 0.0, ground_material('court'), 'Court') if piece in ('powder_store', 'guardhouse', 'flagstaff', 'loose_props', 'sentry_box', 'gun_platform') else None
    if piece not in ('powder_store', 'guardhouse', 'flagstaff', 'loose_props', 'sentry_box', 'gun_platform'):
        rect_plane(-300, -300, 300, -8.7, 0.0, ground_material('court'), 'Back') if False else None
        rect_plane(-300, 8.7, 300, 300, 0.0, ground_material('court'), 'Court')
        rect_plane(-300, -300, 300, -8.0, 0.0, ground_material('turf'), 'Front')
    big_sea(-2.6)
    lib = Library(a.glb, lod); nrep = 1
    if '*' in piece: piece, nrep = piece.split('*'); nrep = int(nrep)
    L = SMLEN.get(piece, 4.0)
    for i in range(nrep): lib.place(piece, (i - (nrep - 1) / 2.0) * L, 0.0, yaw, state)
    c = cam(sc, loc, tgt, lens); render(sc, c, out)


# ------------------------------------------------------------------------------------------------- fort scenes
def bl(poly): return [(x, -z) for x, z in poly]


def place_fort(lib, lay, cam_pos=None, near=60.0, mid=130.0, state_fn=None, hide_roles=()):
    n = 0
    for p in lay['parts']:
        if p.get('role') in hide_roles: continue
        d = math.hypot(p['x'] - cam_pos[0], p['z'] - cam_pos[2]) if cam_pos else 0.0
        lod = 'hero' if d < near else ('live' if d < mid else 'far')
        if lib.lod != 'hero': lod = lib.lod
        st = state_fn(p) if state_fn else 'intact'
        pose = None; piece = p['piece']
        if piece == 'sally_gate' and st != 'breached':
            pose = {'door': ((-0.97, 0.0, -0.55), 'y', 92.0), 'door_2': ((0.97, 0.0, -0.55), 'y', -92.0)}
        if piece == 'ditch_floor' and st == 'breached': st = 'silted'
        lib.place(piece, p['x'], p['z'], p['yaw'], st, lod=lod, y=p.get('y', 0.0), scale=tuple(p.get('scale', [1, 1, 1])), pose=pose); n += 1
    return n


def sun_rel(cam_loc, tgt, el, rel_deg):
    """sun (elevation, azimuth) so the light comes from behind the camera, turned rel_deg to the left of the view direction"""
    vx, vy = tgt[0] - cam_loc[0], -(tgt[2] - cam_loc[2]); az = math.degrees(math.atan2(-vx, -vy)) - rel_deg
    return (el, az % 360.0)


def fort_scene(a, lay, w, h, cam_loc, tgt, lens, sun, out, lod='hero', state_fn=None, near=60.0, mid=130.0, exposure=-0.1, hide_roles=()):
    if sun[0] == 'rel': sun = sun_rel(cam_loc, tgt, sun[1], sun[2])
    LS, sc = scene(a, sun[0], sun[1], exposure, w, h)
    polys = lay['polygons']; hole = bl(polys['ditch_edge']); court = bl(polys['face_line']); bed = bl(polys['bed_edge'])
    island_ground(sc, hole=hole, courtyard=court, bed=bed)
    lib = Library(a.glb, lod); place_fort(lib, lay, cam_loc, near, mid, state_fn, hide_roles)
    c = cam(sc, cam_loc, tgt, lens); render(sc, c, out)


def damage_rng(seed, p_breach, p_crack):
    import random
    rnd = random.Random(seed)
    def fn(p):
        if p.get('role') not in ('wall', 'ravelin', 'ditch_wall', 'covered_way', 'glacis'): return 'intact'
        r = rnd.random()
        return 'breached' if r < p_breach else ('cracked' if r < p_breach + p_crack else 'intact')
    return fn


def cell_5star(a, out, w=None, h=None, lod='live'):
    import starfort_layout as SL
    lay = SL.layout(5, 52.0, 6.0, 8.0)
    fort_scene(a, lay, w or a.w, h or a.h, (0.0, 175.0, 120.0), (0.0, 0.0, -2.0), 38.0, (34.0, 140.0), out, lod=lod, near=0.0, mid=0.0, exposure=-0.05)


def cell_3star_golden(a, out, w=None, h=None, lod='hero'):
    import starfort_layout as SL
    lay = SL.layout(3, 42.0, 6.0, 20.0, ravelins=False)
    (tx, tz), (ox, oz) = bastion_focus(lay, 0)
    cam_loc = (tx + ox * 30.0 - oz * 36.0, 11.0, tz + oz * 30.0 + ox * 36.0); tgt = (tx - ox * 8.0, 3.4, tz - oz * 8.0)
    fort_scene(a, lay, w or a.w, h or a.h, cam_loc, tgt, 30.0, ('rel', 11.0, 40.0), out, lod=lod, near=95.0, mid=190.0, exposure=0.5)


def bastion_focus(lay, k=0):
    """the position of the k-th salient vertex and the outward direction from the centre"""
    import starfort_layout as SL
    tips = [(p['x'], p['z'], p['yaw']) for p in lay['parts'] if p['piece'] == 'bastion_salient']
    x, z, yaw = tips[k]; vx, vz = SL.rot(yaw, 0.0, 0.0); tx, tz = x + vx, z + vz; d = math.hypot(tx, tz); return (tx, tz), (tx / d, tz / d)


def cell_bastion(a, out, w=None, h=None, lod='hero'):
    import starfort_layout as SL
    lay = SL.layout(5, 52.0, 6.0, 8.0, ravelins=False)
    (tx, tz), (ox, oz) = bastion_focus(lay, 2)
    cam_loc = (tx + ox * 15.0 - oz * 19.0, 10.5, tz + oz * 15.0 + ox * 19.0); tgt = (tx - ox * 7.0, 3.2, tz - oz * 7.0)
    fort_scene(a, lay, w or a.w, h or a.h, cam_loc, tgt, 38.0, ('rel', 38.0, 45.0), out, lod=lod, near=70.0, mid=140.0)


def cell_gate(a, out, w=None, h=None, lod='hero'):
    import starfort_layout as SL
    lay = SL.layout(5, 80.0, 6.0, 8.0, ravelins=False)
    g = [p for p in lay['parts'] if p['piece'] == 'sally_gate'][0]; gx, gz = g['x'], g['z']; ox, oz = SL.rot(g['yaw'], 0.0, 1.0); px, pz = SL.rot(g['yaw'], 1.0, 0.0)
    cam_loc = (gx + ox * 19.0 + px * 6.5, 7.8, gz + oz * 19.0 + pz * 6.5); tgt = (gx + ox * 0.5, 1.0, gz + oz * 0.5)
    fort_scene(a, lay, w or a.w, h or a.h, cam_loc, tgt, 36.0, ('rel', 38.0, 40.0), out, lod=lod, near=80.0, mid=150.0)


def cell_states(a, out, w=None, h=None, lod='hero'):
    """intact, cracked and breached curtain side by side across a ditch floor, seen from the covered way"""
    LS, sc = scene(a, 30.0, 140.0, -0.1, w or a.w, h or a.h)
    rect_plane(-300, -300, 300, 300, -2.0, ground_material('earth'), 'Bed')
    rect_plane(-300, 8.7, 300, 300, 0.0, ground_material('court'), 'Court'); rect_plane(-300, -300, 300, -7.3, 0.0, ground_material('turf'), 'Front')
    big_sea(-2.6); lib = Library(a.glb, lod)
    for i, st in enumerate(('intact', 'cracked', 'breached')):
        lib.place('curtain', (i - 1) * 4.0, 0.0, 0.0, st); lib.place('ditch_floor', (i - 1) * 4.0, 0.0, 0.0, 'intact')
        lib.place('counterscarp', (i - 1) * 4.0, 6.0, 180.0, st)
    c = cam(sc, (0.0, 3.4, 19.5), (0.0, 1.0, -1.0), 38.0); render(sc, c, out)


def cell_stores(a, out, w=None, h=None, lod='hero'):
    LS, sc = scene(a, 30.0, 140.0, -0.1, w or a.w, h or a.h)
    flat_plane(0.0, 300, ground_material('court'), 'Court'); big_sea(-2.6); lib = Library(a.glb, lod)
    lib.place('powder_store', -5.0, 0.0, 12.0, 'intact', pose={'door': ((-0.62, 0.36, 2.66), 'y', -95.0)}); lib.place('guardhouse', 5.5, 0.5, -18.0, 'intact', pose={'door': ((-1.8, 0.36, 2.04), 'y', -70.0)})
    lib.place('flagstaff', 0.0, -4.5, 0.0, 'intact'); lib.place('loose_props', 1.0, 6.5, 190.0, 'intact')
    c = cam(sc, (4.0, 4.2, 17.5), (0.0, 1.6, 0.0), 40.0); render(sc, c, out)


def cell_covered_way(a, out, w=None, h=None, lod='hero'):
    import starfort_layout as SL
    lay = SL.layout(5, 80.0, 6.0, 8.0, ravelins=False)
    cw = [p for p in lay['parts'] if p['piece'] == 'covered_way'][4]; cx, cz = cw['x'], cw['z']; ox2, oz2 = SL.rot(cw['yaw'], 0.0, 1.0); ax, az = SL.rot(cw['yaw'], 1.0, 0.0)
    cam_loc = (cx + ox2 * 1.0 - ax * 4.0, 1.7, cz + oz2 * 1.0 - az * 4.0); tgt = (cx - ox2 * 4.0 + ax * 30.0, 0.9, cz - oz2 * 4.0 + az * 30.0)
    fort_scene(a, lay, w or a.w, h or a.h, cam_loc, tgt, 30.0, (22.0, 150.0), out, lod=lod, near=60.0, mid=120.0)


def cell_ruin(a, out, w=None, h=None, lod='hero'):
    import starfort_layout as SL
    lay = SL.layout(4, 46.0, 6.0, 20.0, ravelins=True)
    fort_scene(a, lay, w or a.w, h or a.h, (-55.0, 22.0, 95.0), (4.0, 1.5, -8.0), 40.0, (24.0, 220.0), out, lod=lod, state_fn=damage_rng(5, 0.34, 0.40), near=75.0, mid=150.0, exposure=-0.05)


CATALOGUE = [('curtain', 0.0), ('bastion_face', 0.0), ('bastion_flank', 0.0), ('sally_gate', 0.0), ('counterscarp', 180.0), ('covered_way', 0.0), ('ravelin_wall', 0.0), ('bastion_gorge', 180.0), ('ditch_floor', 0.0), ('glacis', 0.0)]
CATALOGUE_SMALL = ['gun_platform', 'powder_store', 'sentry_box', 'guardhouse', 'flagstaff', 'loose_props']
CATALOGUE_CORNERS = ['bastion_salient', 'bastion_shoulder_a75', 'bastion_shoulder_a66', 'flank_junction', 'flank_junction_a75', 'ravelin_salient']


CAT_NAMES = {'curtain': 'CURTAIN', 'bastion_face': 'FACE', 'bastion_flank': 'FLANK', 'sally_gate': 'GATE', 'counterscarp': 'DITCH WALL', 'covered_way': 'COVERED WAY', 'ravelin_wall': 'RAVELIN', 'bastion_gorge': 'GORGE',
             'ditch_floor': 'DITCH', 'glacis': 'GLACIS', 'gun_platform': 'CANNON', 'powder_store': 'POWDER', 'sentry_box': 'SENTRY', 'guardhouse': 'GUARD', 'flagstaff': 'FLAG', 'loose_props': 'PROPS',
             'bastion_salient': 'TIP 60', 'bastion_shoulder_a75': 'SHOULDER 75', 'bastion_shoulder_a66': 'SHOULDER 66', 'flank_junction': 'JOINT 90', 'flank_junction_a75': 'JOINT 75', 'ravelin_salient': 'RAVELIN TIP'}


def cell_catalogue(a, out, w=None, h=None, lod='live'):
    """every part laid out in rows on flat ground: wall runs at the back, the loose buildings in the middle, the corner pieces in front, each named"""
    import bpy
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector
    import collector_sheet as CS, boat_shots as BS
    w = w or a.w; h = h or a.h
    LS, sc = scene(a, 42.0, 150.0, -0.05, w, h)
    flat_plane(0.0, 400, ground_material('court'), 'Court'); big_sea(-2.6); lib = Library(a.glb, lod); marks = []
    x = -36.0
    for piece, yaw in CATALOGUE:
        z = -14.0 if piece in ('counterscarp', 'covered_way', 'ditch_floor', 'glacis', 'bastion_gorge') else -4.0
        lib.place(piece, x, z, yaw, 'intact'); marks.append((piece, x, z + (0.0 if piece != 'glacis' else 6.0))); x += 8.6
    x = -30.0
    for piece in CATALOGUE_SMALL: lib.place(piece, x, 12.0, 0.0, 'intact'); marks.append((piece, x, 12.0)); x += 12.0
    xx = -42.0
    for piece in CATALOGUE_CORNERS:
        px = xx + (6.0 if piece == 'bastion_salient' else 0.0); lib.place(piece, px, 38.0, 0.0, 'intact'); marks.append((piece, px, 38.0 + (4.0 if 'a' in piece else 0.0))); xx += 17.5
    c = cam(sc, (0.0, 84.0, 74.0), (0.0, 0.0, 12.0), 31.0); render(sc, c, out)
    CS.FONT.update(BS.GLYPHS); CS.FONT.update(GLYPHS_EXTRA)
    img = CS.read_png(out)
    for i, (piece, mx, mz) in enumerate(marks):
        v = world_to_camera_view(sc, c, Vector(B((mx, 0.0, mz + 3.5))))
        px = int(v.x * w); py = int((1.0 - v.y) * h) + 12 * (i % 2); txt = CAT_NAMES[piece]
        CS.draw_text(img, max(2, px - 3 * len(txt)), min(h - 14, py), txt, 1 if w < 900 else 2, (0.97, 0.96, 0.9), bg=0.1)
    CS.write_png(out, img)


GLYPHS_EXTRA = {'Z': '11111 00001 00010 00100 01000 10000 11111', 'C': '01110 10001 10000 10000 10000 10001 01110', 'S': '01111 10000 10000 01110 00001 00001 11110', 'F': '11111 10000 10000 11110 10000 10000 10000', 'L': '10000 10000 10000 10000 10000 10000 11111',
                'D': '11110 10001 10001 10001 10001 10001 11110', 'R': '11110 10001 10001 11110 10100 10010 10001', 'B': '11110 10001 10001 11110 10001 10001 11110', 'H': '10001 10001 10001 11111 10001 10001 10001',
                'N': '10001 11001 10101 10011 10001 10001 10001', 'T': '11111 00100 00100 00100 00100 00100 00100', 'A': '01110 10001 10001 11111 10001 10001 10001', 'E': '11111 10000 10000 11110 10000 10000 11111',
                'I': '01110 00100 00100 00100 00100 00100 01110', 'O': '01110 10001 10001 10001 10001 10001 01110', 'W': '10001 10001 10001 10101 10101 11011 10001', '3': '11110 00001 00001 01110 00001 00001 11110',
                '4': '00010 00110 01010 10010 11111 00010 00010', ' ': '00000 00000 00000 00000 00000 00000 00000', ',': '00000 00000 00000 00000 00110 00100 01000', '/': '00001 00010 00010 00100 01000 01000 10000'}


CELLS = [
    ('5 BASTION STAR FROM ABOVE', cell_5star), ('3 BASTION FORT AT GOLDEN HOUR', cell_3star_golden), ('BASTION AND CANNON', cell_bastion),
    ('SALLY GATE AND BRIDGE', cell_gate), ('INTACT CRACKED BREACHED', cell_states), ('POWDER STORE AND GUARDHOUSE', cell_stores),
    ('DITCH AND GLACIS', cell_covered_way), ('RUIN MODE', cell_ruin), ('PARTS CATALOGUE', cell_catalogue),
]


def shot_sheet(a, only_cells=None):
    import collector_sheet as CS, boat_shots as BS
    CS.FONT.update(BS.GLYPHS); CS.FONT.update(GLYPHS_EXTRA)
    cw, ch = 640, 427; cells = []
    for i, (title, fn) in enumerate(CELLS):
        pth = os.path.join(a.out, 'cell-%d.png' % (i + 1))
        if (only_cells is None or (i + 1) in only_cells) and not (os.environ.get('SF_REUSE_CELLS') and os.path.exists(pth)):
            fn(argparse.Namespace(**dict(vars(a), samples=max(24, a.samples // 2))), pth, cw, ch, 'live' if fn in (cell_catalogue, cell_5star) else a.lod)
        cells.append(CS.read_png(pth) if os.path.exists(pth) else np.full((ch, cw, 3), 0.2, np.float32))
    pad = 8; top = 8; W = pad + 3 * (cw + pad); Hh = top + 3 * (ch + pad)
    sheet = np.full((Hh, W, 3), 0.12, np.float32)
    for i, (title, fn) in enumerate(CELLS):
        r, c = divmod(i, 3); y = top + r * (ch + pad); x = pad + c * (cw + pad); sheet[y:y + ch, x:x + cw] = cells[i][:ch, :cw]
        CS.draw_text(sheet, x + 10, y + 10, title, 3, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(a.out, 'starfort-sheet.png'), sheet)


HERO = {'1': cell_5star, '2': cell_bastion, '3': cell_ruin}   # the three best pictures at full size: the whole star, a bastion with its cannon, the ruin
TRY = dict(five=cell_5star, golden=cell_3star_golden, bastion=cell_bastion, gate=cell_gate, states=cell_states, stores=cell_stores, way=cell_covered_way, ruin=cell_ruin, cat=cell_catalogue)


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True)
    for k in a.only:
        if k == 'sheet': shot_sheet(a)
        elif k.startswith('cells:'): shot_sheet(a, [int(v) for v in k[6:].split('+')])
        elif k in HERO: HERO[k](a, os.path.join(a.out, 'starfort-%s.png' % k), None, None, 'live' if k == '1' else a.lod)
        elif k.startswith('try:'): TRY[k[4:]](a, os.path.join(a.out, 'try-%s.png' % k[4:]), None, None, a.lod)
        elif ':' in k:
            piece, state = k.split(':'); cv = os.environ.get('CAM'); cc = [float(v) for v in cv.split(',')] if cv else [9.0, 3.0, 11.0, 0.0, 1.0, -2.0, 40.0]
            single(a, piece, state, os.path.join(a.out, 'try-%s-%s%s.png' % (piece, state, os.environ.get('TAG', ''))), tuple(cc[:3]), tuple(cc[3:6]), cc[6], lod=a.lod)


if __name__ == '__main__':
    main()
