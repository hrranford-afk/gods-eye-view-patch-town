"""PICTURES OF THE SEALS, rendered from the GLB files (not from the builder), so what is seen is what ships. See SEAL_MODEL.md.
Headless:  blender -b --python seal_shots.py -- --glb DIR --out DIR [--w 1200 --h 800 --samples 64] [--only 1,2,3,sheet,variants,dbg] [--prefix seal]
DIR for --glb holds the files written by seal_model.py (seal_<species>_<lod>.glb); wet or posed files are written to a scratch folder by the same writer. Poses of a clip are taken from the animation inside the GLB
(the importer makes an action per clip; the frame is evaluated and frozen), so the pictures also prove that the clips play.
Writes <prefix>-1.png (haul-out group of six on a beach with a wet shoreline), -2 (close portrait of the head with whiskers), -3 (a seal sliding into the sea), <prefix>-sheet.png (labelled 3 x 4: male, female, pup, harbour seal,
each at rest, alert and swimming or crawling, plus the group, the portrait and the old crude seal beside the new one), <prefix>-variants.png (six colour variants).
Same sky, light and look as the other Living Islands pictures (li_scene.make_sky with the sea haze, render_settings). Blender 5.x patterns, CPU Cycles, fixed seed."""
import sys, os, math, argparse, tempfile, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Seal pictures from the GLB files.')
    ap.add_argument('--glb', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=64)
    ap.add_argument('--only', default='1,2,3,sheet,variants'); ap.add_argument('--prefix', default='seal'); ap.add_argument('--lod', default='hero')
    a = ap.parse_args(argv); a.only = [s.strip() for s in a.only.split(',') if s.strip()]
    return a


GLYPHS = {   # extra 5x7 glyphs for the labels (the concept sheet font has the rest)
    'V': '10001 10001 10001 10001 01010 01010 00100', 'G': '01110 10001 10000 10111 10001 10001 01111', 'K': '10001 10010 10100 11000 10100 10010 10001',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'P': '11110 10001 10001 11110 10000 10000 10000', 'U': '10001 10001 10001 10001 10001 10001 01110',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'W': '10001 10001 10001 10101 10101 11011 10001', 'J': '00111 00010 00010 00010 00010 10010 01100',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00110 01000 10000 11111',
    '5': '11111 10000 11110 00001 00001 10001 01110', '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100', '.': '00000 00000 00000 00000 00000 01100 01100',
    'X': '10001 01010 00100 00100 00100 01010 10001', 'Z': '11111 00001 00010 00100 01000 10000 11111', 'Q': '01110 10001 10001 10001 10101 10010 01101',
    '-': '00000 00000 00000 11111 00000 00000 00000', ',': '00000 00000 00000 00000 01100 00100 01000', ':': '00000 01100 01100 00000 01100 01100 00000',
}


# ------------------------------------------------------------------------------------------------- the scene
def scene(a, sun_el=24.0, sun_az=125.0, exposure=-0.55, w=None, h=None, sky_strength=0.40, haze=0.30):
    import bpy
    import li_scene as LS
    import collector_sheet as CS
    sc = LS.reset(); LS.render_settings(sc, w or a.w, h or a.h, a.samples, True, exposure=exposure)
    sc.cycles.seed = 11
    try: sc.cycles.use_animated_seed = False
    except Exception: pass
    sea = sea_plane()
    LS.make_sky(sun_elev_deg=sun_el, sun_az_deg=sun_az, strength=sky_strength, overcast=0.0, haze=haze, horizon_soften=0.5)      # after the sea exists, so the far sea fades into the horizon
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


def sea_plane(z=0.0):
    """the sea out to the horizon (80 km, the island renders' value): its material is named SeaMat so that make_sky fades the far sea into the sky"""
    import bpy
    import boat_shots as BS
    import li_scene as LS
    m = BS.sea_material(); m.name = 'SeaMat_seals'
    s = LS.SEA_REACH_M; ob = bpy.data.objects.new('Sea', bpy.data.meshes.new('Sea')); bpy.context.scene.collection.objects.link(ob)
    g = np.array([-s, -2000.0, -200.0, -30.0, -4.0, 0.0, 4.0, 30.0, 200.0, 2000.0, s]); n = len(g)       # a grid, so no triangle edge crosses the view near the seals
    V = [(x, y, z) for x in g for y in g]; Fq = [(i * n + j, (i + 1) * n + j, (i + 1) * n + j + 1, i * n + j + 1) for i in range(n - 1) for j in range(n - 1)]
    ob.data.from_pydata(V, [], Fq); ob.data.update(); ob.data.materials.append(m)
    return ob


def beach_height(x, y, slope=0.05, xs=3.0):
    """the beach: rises away from the water line at x = xs; low swell of the sand; the sea is at z = 0"""
    x = np.asarray(x, float); y = np.asarray(y, float)
    return slope * (xs - x) + 0.018 * np.sin(x * 1.7 + y * 0.9) + 0.012 * np.sin(y * 2.3 - x * 0.8) + 0.02 * np.sin(y * 0.31 + 1.0)


def beach_material():
    """dry sand above, damp and glossy darker sand near the water line, a thin foam line at the edge (all from the height z)"""
    import bpy
    m = bpy.data.materials.new('Beach'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.4; n1.inputs['Detail'].default_value = 6
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 240.0; n2.inputs['Detail'].default_value = 2
    n3 = nt.nodes.new('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 5.0; n3.inputs['Detail'].default_value = 4
    for n in (n1, n2, n3): nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.35; rp.color_ramp.elements[1].position = 0.7
    rp.color_ramp.elements[0].color = (0.34, 0.25, 0.14, 1); rp.color_ramp.elements[1].color = (0.52, 0.41, 0.26, 1); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac'])
    # wetness from the height: 1 at the water, fading to 0 at 0.07 m above it (with a wobbling edge)
    wob = nt.nodes.new('ShaderNodeMath'); wob.operation = 'MULTIPLY'; nt.links.new(n3.outputs['Fac'], wob.inputs[0]); wob.inputs[1].default_value = 0.045
    zz = nt.nodes.new('ShaderNodeMath'); zz.operation = 'SUBTRACT'; nt.links.new(sep.outputs['Z'], zz.inputs[0]); nt.links.new(wob.outputs[0], zz.inputs[1])
    wm = nt.nodes.new('ShaderNodeMapRange'); wm.inputs['From Min'].default_value = 0.0; wm.inputs['From Max'].default_value = 0.075; wm.inputs['To Min'].default_value = 1.0; wm.inputs['To Max'].default_value = 0.0; wm.clamp = True
    nt.links.new(zz.outputs[0], wm.inputs['Value'])
    dark = nt.nodes.new('ShaderNodeMix'); dark.data_type = 'RGBA'; dark.inputs[7].default_value = (0.13, 0.10, 0.065, 1)
    nt.links.new(wm.outputs[0], dark.inputs[0]); nt.links.new(rp.outputs['Color'], dark.inputs[6])
    fm = nt.nodes.new('ShaderNodeMapRange'); fm.inputs['From Min'].default_value = 0.0; fm.inputs['From Max'].default_value = 0.006; fm.inputs['To Min'].default_value = 1.0; fm.inputs['To Max'].default_value = 0.0; fm.clamp = True
    fz = nt.nodes.new('ShaderNodeMath'); fz.operation = 'SUBTRACT'; nt.links.new(sep.outputs['Z'], fz.inputs[0]); fz.inputs[1].default_value = 0.0
    nt.links.new(fz.outputs[0], fm.inputs['Value'])
    foam = nt.nodes.new('ShaderNodeMix'); foam.data_type = 'RGBA'; foam.inputs[7].default_value = (0.78, 0.8, 0.76, 1); nt.links.new(fm.outputs[0], foam.inputs[0]); nt.links.new(dark.outputs[2], foam.inputs[6])
    nt.links.new(foam.outputs[2], bs.inputs['Base Color'])
    rg = nt.nodes.new('ShaderNodeMapRange'); rg.inputs['From Min'].default_value = 0.0; rg.inputs['From Max'].default_value = 1.0; rg.inputs['To Min'].default_value = 0.95; rg.inputs['To Max'].default_value = 0.16; nt.links.new(wm.outputs[0], rg.inputs['Value'])
    nt.links.new(rg.outputs[0], bs.inputs['Roughness'])
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.7; bm.inputs['Distance'].default_value = 0.01; nt.links.new(n2.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], bs.inputs['Normal'])
    return m


def make_beach(size_x=(-40.0, 14.0), size_y=(-40.0, 40.0), res=0.35, xs=3.0, slope=0.05):
    """a height-field beach as one mesh (dense near the middle, coarse at the edges)"""
    import bpy
    xs_ = np.concatenate([np.arange(size_x[0], -6, 2.0), np.arange(-6, 12, res), np.arange(12, size_x[1], 2.0)]); ys_ = np.concatenate([np.arange(size_y[0], -9, 2.0), np.arange(-9, 9, res), np.arange(9, size_y[1] + 0.01, 2.0)])
    X, Y = np.meshgrid(xs_, ys_, indexing='ij'); Z = beach_height(X, Y, slope, xs)
    Z = np.where(X > xs, Z, Z)
    nx, ny = X.shape; verts = np.stack([X, Y, Z], -1).reshape(-1, 3); faces = []
    for i in range(nx - 1):
        for j in range(ny - 1): faces.append((i * ny + j, (i + 1) * ny + j, (i + 1) * ny + j + 1, i * ny + j + 1))
    ob = bpy.data.objects.new('Beach', bpy.data.meshes.new('Beach')); bpy.context.scene.collection.objects.link(ob)
    ob.data.from_pydata(verts.tolist(), [], faces); ob.data.update(); ob.data.polygons.foreach_set('use_smooth', [True] * len(ob.data.polygons)); ob.data.materials.append(beach_material())
    return ob


def stones_on(rng, n, area, xs=3.0, slope=0.05, avoid=()):
    import bpy
    mat = new_mat('Stone', (0.09, 0.085, 0.075), 0.85)
    for i in range(n):
        x = rng.uniform(*area[0]); y = rng.uniform(*area[1])
        if any(abs(x - ax) < ar and abs(y - ay) < ar for ax, ay, ar in avoid): continue
        r = rng.uniform(0.025, 0.07); z = float(beach_height(x, y, slope, xs))
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=(x, y, z + 0.004))
        o = bpy.context.active_object; o.scale = (r * rng.uniform(1, 1.8), r * rng.uniform(0.8, 1.4), r * 0.5); o.rotation_euler = (0, 0, rng.uniform(0, 6)); o.data.materials.append(mat)
        o.data.polygons.foreach_set('use_smooth', [True] * len(o.data.polygons))


def weed_on(rng, n, area, xs=3.0, slope=0.05):
    """dark strands of wrack along the tide line"""
    import bpy
    mat = new_mat('Wrack', (0.07, 0.06, 0.03), 0.6)
    for i in range(n):
        x = xs + rng.uniform(-0.7, 0.15); y = rng.uniform(*area[1]); z = float(beach_height(x, y, slope, xs)); ang = rng.uniform(0, 3.14); L = rng.uniform(0.15, 0.5)
        v = []; f = []; k = 6
        for s in range(k + 1):
            t = s / k; px = x + math.cos(ang) * L * t + 0.04 * math.sin(t * 7 + i); py = y + math.sin(ang) * L * t + 0.04 * math.cos(t * 5 + i); w = 0.012 * (1 - 0.6 * t)
            v += [(px - math.sin(ang) * w, py + math.cos(ang) * w, float(beach_height(px, py, slope, xs)) + 0.004), (px + math.sin(ang) * w, py - math.cos(ang) * w, float(beach_height(px, py, slope, xs)) + 0.004)]
        for s in range(k): f.append((2 * s, 2 * s + 1, 2 * s + 3, 2 * s + 2))
        ob = bpy.data.objects.new('Wrack', bpy.data.meshes.new('Wrack')); bpy.context.scene.collection.objects.link(ob); ob.data.from_pydata(v, [], f); ob.data.update(); ob.data.materials.append(mat)


# ------------------------------------------------------------------------------------------------- importing and posing a seal
def import_seal(path, loc=(0, 0, 0), yaw=0.0, pitch=0.0, roll=0.0, scale=1.0):
    """import a GLB. The glTF seal faces +Z; the importer's Y-up swap makes it face -Y, so the root empty is turned +90 degrees about Z to face +X, then yaw (deg) turns it on the spot.
    Returns (root empty, armature, objects, actions made by this import)"""
    import bpy
    from mathutils import Euler
    before = set(bpy.data.objects.keys()); abefore = set(bpy.data.actions.keys())
    bpy.ops.import_scene.gltf(filepath=path)
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]; acts = {a.name: a for a in bpy.data.actions if a.name not in abefore}
    roots = [o for o in new if o.parent is None]
    root = bpy.data.objects.new('SealRoot', None); bpy.context.scene.collection.objects.link(root)
    for r in roots: r.parent = root
    for o in new:
        if o.name.startswith('Icosphere'): o.hide_render = True; o.hide_viewport = True
    # euler ZYX so yaw is about the world up first
    root.rotation_mode = 'ZYX'; root.rotation_euler = Euler((math.radians(roll), math.radians(pitch), math.radians(90.0 + yaw)), 'XYZ') if False else (math.radians(roll), math.radians(-pitch), math.radians(90.0 + yaw))
    root.location = loc; root.scale = (scale,) * 3
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    return root, arm, new, acts


def freeze_pose(arm, acts, clip, seconds):
    """evaluate the clip's action at a time, copy the pose bone values, then drop the animation so the pose stays"""
    import bpy
    if clip is None: return
    sc = bpy.context.scene; fps = sc.render.fps; act = None
    for n, a in acts.items():
        if n == clip or n.startswith(clip + '.') or n.split('.')[0] == clip: act = a
    arm.animation_data_create(); arm.animation_data.action = act
    sc.frame_set(int(round(seconds * fps)))
    bpy.context.view_layer.update()
    vals = {}
    for pb in arm.pose.bones: vals[pb.name] = (tuple(pb.location), tuple(pb.rotation_quaternion), tuple(pb.scale))
    arm.animation_data.action = None; arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'; l, r, s = vals[pb.name]; pb.location = l; pb.rotation_quaternion = r; pb.scale = s
    bpy.context.view_layer.update()


def place_on_beach(root, x, y, yaw, xs=3.0, slope=0.05, sink=0.0, align=True):
    """put the seal's root on the beach at (x, y) facing yaw (deg), tilted to the slope under the body"""
    c, s = math.cos(math.radians(yaw)), math.sin(math.radians(yaw)); z0 = float(beach_height(x, y, slope, xs))
    zf = float(beach_height(x + c * 0.9, y + s * 0.9, slope, xs)); zb = float(beach_height(x - c * 0.9, y - s * 0.9, slope, xs))
    zl = float(beach_height(x - s * 0.5, y + c * 0.5, slope, xs)); zr = float(beach_height(x + s * 0.5, y - c * 0.5, slope, xs))
    pitch = math.degrees(math.atan2(zf - zb, 1.8)) if align else 0.0; roll = math.degrees(math.atan2(zl - zr, 1.0)) if align else 0.0
    z = (z0 + (zf + zb) / 2.0) / 2.0 - sink
    root.location = (x, y, z)
    root.rotation_mode = 'XYZ'
    from mathutils import Euler, Matrix
    # yaw about world z, pitch about the animal's y (nose down positive), roll about its x: build the matrix in the animal frame (x forward) then turn the root by the importer's 90 degrees
    R = Euler((0, 0, math.radians(yaw)), 'XYZ').to_matrix() @ Euler((math.radians(roll), math.radians(-pitch), 0), 'XYZ').to_matrix() @ Euler((0, 0, math.radians(90.0)), 'XYZ').to_matrix()
    root.rotation_euler = R.to_euler('XYZ')


def cam(sc, loc, tgt, lens):
    import collector_sheet as CS
    return CS._cam(sc, 'Cam', loc, tgt, lens)


def render(sc, c, path):
    import bpy
    sc.camera = c; sc.render.filepath = path; bpy.ops.render.render(write_still=True); print('PICTURE', path, flush=True)


def label_png(path, labels, scale=3):
    import collector_sheet as CS
    CS.FONT.update(GLYPHS); img = CS.read_png(path)
    for (x, y, text) in labels: CS.draw_text(img, x, y, text, scale, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(path, img)


_TMP = tempfile.mkdtemp(prefix='seal_shots_')

def glb_for(a, species, lod='hero', variant=0, wet=False, pose='rest', tmp=None):
    """the committed file when it has what is asked for, otherwise a scratch file written by the same writer"""
    import seal_model as SM
    name = SM.out_name(species, lod, variant, wet, pose); p = os.path.join(a.glb, name)
    if os.path.exists(p): return p
    tmp = tmp or os.environ.get('SEAL_CACHE') or _TMP; os.makedirs(tmp, exist_ok=True); p = os.path.join(tmp, name)
    if not os.path.exists(p): M = SM.build(species, lod, variant, wet, SM.SEED, pose); SM.write_glb(p, M)
    return p


# ------------------------------------------------------------------------------------------------- the pictures
def shot_dbg(a, out):
    """side, front and top (orthographic) of one species at rest, to check the shape"""
    import collector_sheet as CS
    sp = os.environ.get('SEAL_SPECIES', 'grey_male'); LS, sc = scene(a, sun_el=40.0, sun_az=150.0)
    make_beach(); root, arm, objs, acts = import_seal(glb_for(a, sp, a.lod)); root.location = (0, 0, float(beach_height(0, 0)))
    cams = [CS._cam(sc, 'S', (0.0, -4.0, 0.3), (0.0, 0.0, 0.3), 50.0, ortho=3.0), CS._cam(sc, 'F', (4.0, 0.0, 0.3), (0.0, 0.0, 0.3), 50.0, ortho=1.6), CS._cam(sc, 'T', (2.2, -1.9, 0.9), (0.2, 0.0, 0.2), 45.0)]
    ps = []
    for i, c in enumerate(cams):
        p = os.path.join(out, 'dbg%d.png' % i); render(sc, c, p); ps.append(CS.read_png(p))
    h = max(x.shape[0] for x in ps); ps = [np.pad(x, ((0, h - x.shape[0]), (0, 0), (0, 0))) for x in ps]
    CS.write_png(os.path.join(out, a.prefix + '-dbg.png'), np.concatenate(ps, 1))


def old_seal(loc, yaw, scale=2.3):
    """the crude seal of the life view (animals.js sealGeo, pose 0), ported: a ten-sided loft with a flat belly, noisy vertex colours, dark square eyes and flat triangle flippers, smooth brown with no spots and no whiskers"""
    import bpy
    import li_scene as LS
    prof = [(0, .1), (.05, .3), (.12, .55), (.22, .84), (.34, .99), (.46, 1), (.58, .9), (.68, .68), (.76, .62), (.82, .72), (.88, .64), (.93, .45), (.97, .32), (1, .12)]
    T = [0, .05, .12, .22, .34, .46, .58, .68, .76, .82, .88, .93, .97, 1]; segs = 10
    def f(t): return float(np.interp(t, [p[0] for p in prof], [p[1] for p in prof]))
    clamp = lambda x, a, b: max(a, min(b, x)); sm = lambda a, b, x: (lambda u: u * u * (3 - 2 * u))(clamp((x - a) / (b - a), 0, 1))
    rng = np.random.default_rng(11); noise = rng.random(576)
    back = np.array([0.33, 0.31, 0.29]) ** 2.2; belly = np.array([0.64, 0.60, 0.53]) ** 2.2; dark = np.array([0.12, 0.115, 0.105]) ** 2.2; flip = np.array([0.30, 0.28, 0.25]) ** 2.2
    V = []; C = []; F = []
    for r, t in enumerate(T):
        fr = f(t); y = .10 * clamp((.3 - t) / .3, 0, 1) ** 2 + .13 * clamp((t - .66) / .34, 0, 1) ** 2; z = .09 * math.sin(math.pi * t); rx, ry = .15 * fr, .115 * fr
        for s_ in range(segs):
            th = s_ / segs * 2 * math.pi; cs, sn = math.cos(th), math.sin(th); yy = ry * sn; zz = rx * cs
            if sn < 0: yy *= .35
            V.append((t - .5, y + yy + .115 * .35, z + zz))
            c = belly * (1 - sm(-.35, .45, sn)) + back * sm(-.35, .45, sn); b = noise[(r * 7 + s_ * 3) % 576]; c = c * (0.5 if b > .72 else 1.35 if b < .22 else .88 + .3 * b)
            if t > .9: c = c * .7
            C.append(c)
    for r in range(len(T) - 1):
        for s_ in range(segs):
            s2 = (s_ + 1) % segs; F += [(r * segs + s_, (r + 1) * segs + s_, (r + 1) * segs + s2), (r * segs + s_, (r + 1) * segs + s2, r * segs + s2)]
    def tri(a, b, c, col):
        n = len(V); V.extend([a, b, c]); C.extend([col] * 3); F.append((n, n + 1, n + 2))
    ey = .115 * .35 + .115 * .5; hz = .15 * .5; ex = .86 - .5
    for sg in (-1, 1):
        tri((ex, ey, sg * hz), (ex + .025, ey, sg * hz * .97), (ex + .012, ey + .025, sg * hz * .99), dark); tri((.08, .03, sg * .12), (.16, .025, sg * .19), (.2, .02, sg * .11), flip)
        tri((-.45, .12, sg * .012), (-.55, .13, sg * .085), (-.57, .14, sg * .015), flip)
    V = np.array(V); Vb = np.stack([V[:, 0], V[:, 2], V[:, 1]], 1) * scale     # js (x forward, y up, z side) to blender (x forward, y left, z up)
    ob = LS.mesh_obj('OldSeal', Vb, F, True, col=np.concatenate([np.array(C), np.ones((len(C), 1))], 1)); ob.location = loc; ob.rotation_euler = (0, 0, math.radians(yaw))
    m = bpy.data.materials.new('OldSealMat'); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']; at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'Col'
    nt.links.new(at.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 0.8; ob.data.materials.append(m)
    # the life view draws the faces flat shaded per vertex colour: smooth is close enough
    return ob


def put(a, species, x, y, yaw, clip=None, t=0.0, wet=False, variant=0, lod='hero', sink=0.0, z=None, align=True):
    root, arm, objs, acts = import_seal(glb_for(a, species, lod, variant, wet))
    freeze_pose(arm, acts, clip, t); place_on_beach(root, x, y, yaw, sink=sink, align=align)
    if z is not None: root.location = (x, y, z)
    return root, arm


GROUP = [('grey_male', 1.5, -0.3, 25, 'rest', 1.3, False, 0), ('grey_female', 0.6, 1.9, 140, 'alert', 0.0, False, 1), ('grey_female', 2.1, 1.3, 95, 'scratch', 2.0, True, 3),
         ('grey_pup', 1.1, 0.9, 215, 'pup_cry', 1.2, False, 0), ('harbour', 2.2, -1.8, 330, 'rest', 3.0, False, 0), ('grey_male', 0.2, -1.6, 65, 'rest', 0.2, False, 2)]

def beach_scene(a, sun_el=28.0, sun_az=290.0, w=None, h=None, exposure=-0.55):
    LS, sc = scene(a, sun_el, sun_az, exposure, w, h)
    make_beach(); rng = np.random.default_rng(5); stones_on(rng, 70, ((-6, 6), (-8, 8)), avoid=[(g[1], g[2], 0.9) for g in GROUP]); weed_on(rng, 26, ((0, 0), (-8, 8)))
    return LS, sc


def shot_1(a, out, w=None, h=None, path=None):
    LS, sc = beach_scene(a, w=w, h=h)
    for sp, x, y, yaw, clip, t, wet, var in GROUP: put(a, sp, x, y, yaw, clip, t, wet, var)
    c = cam(sc, (-2.9, 1.0, 1.55), (1.7, 0.1, 0.12), 34.0); render(sc, c, path or os.path.join(out, a.prefix + '-1.png'))


def shot_2(a, out, w=None, h=None, path=None):
    """portrait of the male's head: alert, whiskers, eye, nose, neck folds"""
    LS, sc = beach_scene(a, sun_el=22.0, sun_az=300.0, w=w, h=h, exposure=-0.5)
    root, arm = put(a, 'grey_male', 0.8, 0.0, 200, 'alert', 1.2, True if False else False)
    yw = math.radians(200.0); h = np.array([math.cos(yw), math.sin(yw)]); l = np.array([-math.sin(yw), math.cos(yw)]); nose = np.array([0.8, 0.0]) + h * 1.02
    pos = nose + h * 1.0 + l * 0.42; tgt = nose - h * 0.05
    c = cam(sc, (pos[0], pos[1], 0.50), (tgt[0], tgt[1], 0.53), 52.0); render(sc, c, path or os.path.join(out, a.prefix + '-2.png'))


def shot_3(a, out, w=None, h=None, path=None):
    """a male sliding into the sea: the slide_in clip at its belly-slide stage, wet"""
    LS, sc = beach_scene(a, sun_el=25.0, sun_az=300.0, w=w, h=h)
    root, arm, objs, acts = import_seal(glb_for(a, 'grey_male', 'hero', 0, True)); freeze_pose(arm, acts, 'slide_in', float(os.environ.get('SLIDE_T', 2.0)))
    place_on_beach(root, 1.7, 0.0, 0.0, sink=0.0)
    c = cam(sc, (3.9, -3.2, 0.75), (3.1, 0.0, 0.12), 40.0); render(sc, c, path or os.path.join(out, a.prefix + '-3.png'))


def shot_swim(a, species, out, path, w, h, clip='swim', t=0.4, view=0):
    LS, sc = scene(a, 26.0, 300.0, -0.5, w, h)
    root, arm, objs, acts = import_seal(glb_for(a, species, 'hero', 0, True)); freeze_pose(arm, acts, clip, t)
    ln = {'grey_male': 2.3, 'grey_female': 1.8, 'grey_pup': 1.0, 'harbour': 1.62}[species]
    root.location = (0, 0, -0.06 if species != 'grey_pup' else -0.04); root.rotation_euler = (0, 0, math.radians(90 + 25))
    d = ln * 1.4 + 0.9; ca = math.radians(25 + 62); c = cam(sc, (d * math.cos(ca), d * math.sin(ca), 0.32), (0.0, 0.0, 0.06), 42.0); render(sc, c, path)


def shot_cell(a, species, clip, t, out, path, w, h, pose_label=None, wet=False):
    LS, sc = beach_scene(a, 26.0, 295.0, w, h)
    ln = {'grey_male': 2.3, 'grey_female': 1.8, 'grey_pup': 1.0, 'harbour': 1.62}[species]
    root, arm, objs, acts = import_seal(glb_for(a, species, a.lod, 0, wet)); freeze_pose(arm, acts, clip, t); place_on_beach(root, 0.6, 0.0, 40.0)
    d = ln * 1.45 + 0.8; ca = math.radians(40.0 + 62.0)
    c = cam(sc, (0.6 + d * math.cos(ca), d * math.sin(ca), 0.30 + 0.10 * d), (0.6, 0.0, 0.15 + 0.04 * ln), 42.0); render(sc, c, path)


def shot_before_after(a, out, path, w, h):
    LS, sc = beach_scene(a, 26.0, 295.0, w, h)
    old_seal((0.0, -1.0, float(beach_height(0, -1.0)) + 0.0), 30.0)
    put(a, 'grey_male', 0.0, 0.9, 30, 'rest', 0.5)
    c = cam(sc, (-4.6, 0.0, 0.85), (0.3, 0.0, 0.2), 40.0); render(sc, c, path)


def shot_sheet(a, out):
    import collector_sheet as CS
    cw, ch = 560, 373; sa = argparse.Namespace(**vars(a)); sa.samples = max(24, a.samples // 2); tmp = os.path.join(out, 'cells'); os.makedirs(tmp, exist_ok=True)
    rows = [('grey_male', 'GREY SEAL MALE 2.3 M', [('rest', 1.2, 'REST'), ('alert', 2.0, 'ALERT'), ('hump_crawl', 0.9, 'HUMP CRAWL')]),
            ('grey_female', 'GREY SEAL FEMALE 1.8 M', [('rest', 3.0, 'REST'), ('alert', 3.2, 'ALERT'), ('swim', 0.4, 'SWIM')]),
            ('grey_pup', 'WHITE PUP 1.0 M', [('rest', 1.2, 'REST'), ('pup_cry', 1.2, 'CRY'), ('hump_crawl', 0.9, 'HUMP CRAWL')]),
            ('harbour', 'HARBOUR SEAL 1.6 M', [('rest', 2.2, 'REST'), ('alert', 2.0, 'ALERT'), ('swim', 0.4, 'SWIM')])]
    cells = []
    for sp, name, items in rows:
        for clip, t, lab in items:
            p = os.path.join(tmp, 'c-%s-%s.png' % (sp, clip))
            if os.environ.get('SEAL_REUSE') and os.path.exists(p): pass
            elif clip == 'swim': shot_swim(sa, sp, tmp, p, cw, ch, 'swim', t)
            else: shot_cell(sa, sp, clip, t, tmp, p, cw, ch)
            cells.append(CS.read_png(p))
    last = []
    for fn, nm in ((lambda p: shot_1(sa, tmp, cw, ch, p), 'g'), (lambda p: shot_2(sa, tmp, cw, ch, p), 'p'), (lambda p: shot_before_after(sa, tmp, p, cw, ch), 'b')):
        p = os.path.join(tmp, 'c-%s.png' % nm); fn(p); last.append(CS.read_png(p))
    pad = 8; top = 40; nrows = 5; W = pad + 3 * (cw + pad); H = top + nrows * (ch + pad)
    sheet = np.full((H, W, 3), 0.12, np.float32); CS.FONT.update(GLYPHS)
    for ci, cap in enumerate(('AT REST', 'ALERT OR CALLING', 'MOVING')): CS.draw_text(sheet, pad + ci * (cw + pad) + 6, 12, cap, 3, (0.92, 0.9, 0.84))
    allc = cells + last
    for k, im in enumerate(allc):
        r, c = divmod(k, 3); y = top + r * (ch + pad); x = pad + c * (cw + pad); sheet[y:y + ch, x:x + cw] = im[:ch, :cw]
    for r, (sp, name, items) in enumerate(rows):
        for c, (clip, t, lab) in enumerate(items): CS.draw_text(sheet, pad + c * (cw + pad) + 8, top + r * (ch + pad) + 8, '%s  %s' % (name if c == 0 else '', lab) if c == 0 else lab, 2, (0.97, 0.96, 0.9), bg=0.08)
    for c, lab in enumerate(('HAUL-OUT OF SIX', 'PORTRAIT', 'AFTER, LEFT. BEFORE (LIFE VIEW), RIGHT')): CS.draw_text(sheet, pad + c * (cw + pad) + 8, top + 4 * (ch + pad) + 8, lab, 2, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(out, a.prefix + '-sheet.png'), sheet)


def shot_variants(a, out):
    import collector_sheet as CS
    import seal_model as SM
    cw, ch = 400, 300; sa = argparse.Namespace(**vars(a)); sa.samples = max(24, a.samples // 2); tmp = os.path.join(out, 'cells'); os.makedirs(tmp, exist_ok=True); cells = []
    sa.lod = 'live'
    for v in range(6):
        LS, sc = beach_scene(sa, 26.0, 295.0, cw, ch)
        root, arm = put(sa, 'grey_male', 0.6, 0.0, 40, 'rest', 1.0, False, v, lod='live')
        d = 3.0; ca = math.radians(40 + 62); c = cam(sc, (0.6 + d * math.cos(ca), d * math.sin(ca), 0.62), (0.6, 0.0, 0.17), 40.0); p = os.path.join(tmp, 'v%d.png' % v); render(sc, c, p); cells.append(CS.read_png(p))
    img = np.concatenate([np.concatenate(cells[:3], 1), np.concatenate(cells[3:], 1)], 0); CS.FONT.update(GLYPHS)
    for v in range(6): CS.draw_text(img, 10 + (v % 3) * cw, 10 + (v // 3) * ch, 'VARIANT %d %s' % (v, SM.VARIANT_NAMES[v].upper()), 2, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(out, a.prefix + '-variants.png'), img)


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True)
    jobs = {'dbg': shot_dbg, '1': lambda a, o: shot_1(a, o), '2': lambda a, o: shot_2(a, o), '3': lambda a, o: shot_3(a, o), 'sheet': shot_sheet, 'variants': shot_variants}
    for k in a.only:
        if k in jobs: jobs[k](a, a.out)


if __name__ == '__main__':
    main()
