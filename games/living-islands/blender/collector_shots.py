"""PICTURES OF THE BEACH COLLECTOR HERO MODEL (version 2), rendered from the GLB files (not from the builder), so what is seen is what ships.
Headless:  blender -b --python collector_shots.py -- --glb DIR --out DIR [--w 1200 --h 800 --samples 64] [--only 1,2,3,4,face,quirks,lods] [--prefix collector-v2]
DIR for --glb holds the files written by collector_model.py (collector_hero.glb, collector_hero_sun.glb, collector_hero_grab.glb, collector_live.glb, collector_far.glb, collector_report.json).
Writes <prefix>-1.png (three-quarter, rest, on sand), -2 (sun pose, shell tipped), -3 (close-up of the wear and the tracks), -4 (grab pose with a bottle), -face (the head close up), -quirks (the quirk parts, two views), -lods (hero, live and far side by side, shaded and wire).
Same sky, sand, light and look as the other Living Islands pictures (li_scene.make_sky and render_settings, the concept sheet's sand with real tread prints). Blender 3.6 patterns, CPU Cycles, fixed seed. The status lamp is set to strength 3.2 here so that it reads amber."""
import sys, os, math, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Beach collector hero pictures from the GLB files.')
    ap.add_argument('--glb', required=True, help='folder with the GLB files'); ap.add_argument('--out', required=True, help='output folder')
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=64)
    ap.add_argument('--only', default='1,2,3,4,face,quirks,lods'); ap.add_argument('--prefix', default='collector-v2', help='picture file prefix')
    a = ap.parse_args(argv); a.only = [s.strip() for s in a.only.split(',') if s.strip()]
    return a


GLYPHS = {   # extra 5x7 glyphs for the labels (the concept sheet font has the rest)
    'V': '10001 10001 10001 10001 01010 01010 00100', 'G': '01110 10001 10000 10111 10001 10001 01111', 'K': '10001 10010 10100 11000 10100 10010 10001',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'P': '11110 10001 10001 11110 10000 10000 10000', 'U': '10001 10001 10001 10001 10001 10001 01110',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'W': '10001 10001 10001 10101 10101 11011 10001',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00110 01000 10000 11111',
    '5': '11111 10000 11110 00001 00001 10001 01110', '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100', '.': '00000 00000 00000 00000 00000 01100 01100',
}


def import_glb(path, loc=(0, 0, 0), yaw_deg=0.0, scale=1.0):
    """import a GLB and return its root object (the node named collector). The glTF machine faces +Z; after the importer's Y-up to Z-up swap it faces -Y, so the root is turned +90 degrees about Z to face +X."""
    import bpy
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=path)
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    roots = [o for o in new if o.parent is None]
    root = bpy.data.objects.new('CollectorRoot', None); bpy.context.scene.collection.objects.link(root)
    for r in roots: r.parent = root
    root.rotation_euler = (0, 0, math.radians(90.0 + yaw_deg)); root.location = loc; root.scale = (scale,) * 3
    return root, new


def fix_materials(objs, extra_emission=None):
    """the importer keeps the vertex colour times the detail texture; make sure the lamp reads as light and nothing is mirror-like."""
    import bpy
    for ob in objs:
        if ob.type != 'MESH': continue
        for sl in ob.material_slots:
            m = sl.material
            if m is None or not m.use_nodes: continue
            for n in m.node_tree.nodes:
                if n.bl_idname == 'ShaderNodeBsdfPrincipled' and m.name.startswith('Lamp'):
                    try:
                        n.inputs['Emission Strength'].default_value = 3.2 if extra_emission is None else extra_emission
                    except Exception: pass


def bottle(LS, M, at, yaw, lying=True, lift=0.0):
    """a glass bottle with its neck, a faded blue one, lying on the sand at 'at', axis along yaw (degrees); returns the objects."""
    import collector_sheet as CS
    b = CS.Builder(); x, y, z = at; a = math.radians(yaw)
    body_c = (x, y, 0.04 + lift); neck_c = (x + 0.11 * math.cos(a), y + 0.11 * math.sin(a), 0.032 + lift)
    b.cyl('lit_glass', body_c, 0.078, 0.18, r=(0, 90, yaw), seg=12, smooth=True)
    b.cyl('lit_glass', neck_c, 0.034, 0.10, r=(0, 90, yaw), seg=10, smooth=True, taper=0.8)
    b.cyl('lit_blue', (x + 0.165 * math.cos(a), y + 0.165 * math.sin(a), 0.032 + lift), 0.036, 0.014, r=(0, 90, yaw), seg=10)
    objs = []
    for (mat, smooth), (vs, fs, _) in b.buckets.items():
        ob = LS.mesh_obj('Bottle_' + mat, np.concatenate(vs), fs, smooth); ob.data.materials.append(M[mat]); objs.append(ob)
    return objs


def litter_on_sand(LS, M, seed=3):
    """a few faded bits on the sand for scale: caps, a shard, a bit of rope"""
    import collector_sheet as CS
    b = CS.Builder(); rng = np.random.default_rng(seed)
    spots = [(0.95, -0.38), (1.15, -0.2), (0.78, 0.46), (-0.7, 0.45), (-1.0, -0.2), (1.25, 0.28), (0.6, -0.62)]
    mats = ['lit_orange', 'lit_white', 'lit_red', 'lit_blue', 'lit_white', 'lit_orange', 'lit_red']
    for (x, y), m in zip(spots, mats): b.cyl(m, (x, y, 0.007), 0.034, 0.014, r=(rng.uniform(-8, 8), rng.uniform(-8, 8), 0), seg=8)
    b.box('lit_glass', (1.05, 0.2, 0.012), (0.06, 0.035, 0.024), (10, 5, 40))
    objs = []
    for (mat, smooth), (vs, fs, _) in b.buckets.items():
        ob = LS.mesh_obj('Litter_' + mat, np.concatenate(vs), fs, smooth); ob.data.materials.append(M[mat]); objs.append(ob)
    return objs


def scene(a, sun_el=24.0, sun_az=125.0, exposure=-0.25, ground=True):
    import bpy
    import li_scene as LS
    import collector_sheet as CS
    sc = LS.reset(); LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=exposure)
    sc.cycles.seed = 11
    try: sc.cycles.use_animated_seed = False
    except Exception: pass
    M, weathered, plain = CS._mats(LS)
    objs = []
    if ground: objs = CS._ground(LS, M, plain)
    LS.make_sky(sun_elev_deg=sun_el, sun_az_deg=sun_az, strength=0.34, overcast=0.0, haze=0.25, horizon_soften=0.5)
    CS._sun(sc, sun_el, sun_az, 8.5, colour=(1.0, 0.86, 0.68))
    return LS, sc, M


def render(sc, cam, path):
    sc.camera = cam; sc.render.filepath = path
    import bpy
    bpy.ops.render.render(write_still=True)
    print('PICTURE', path)


def shot_hero_1(a, out, glb):
    import collector_sheet as CS
    LS, sc, M = scene(a)
    root, objs = import_glb(os.path.join(glb, 'collector_hero.glb')); fix_materials(objs)
    bottle(LS, M, (1.0, -0.46, 0), 20); litter_on_sand(LS, M)
    cam = CS._cam(sc, 'Cam', (1.55, -1.75, 0.66), (0.0, 0.0, 0.29), 46.0)
    render(sc, cam, os.path.join(out, a.prefix + '-1.png'))

def shot_hero_2(a, out, glb):
    import collector_sheet as CS
    LS, sc, M = scene(a, sun_el=26.0, sun_az=118.0)
    root, objs = import_glb(os.path.join(glb, 'collector_hero_sun.glb')); fix_materials(objs)
    bottle(LS, M, (1.0, -0.5, 0), 25); litter_on_sand(LS, M)
    cam = CS._cam(sc, 'Cam', (1.45, -1.6, 0.52), (-0.02, 0.0, 0.30), 44.0)
    render(sc, cam, os.path.join(out, a.prefix + '-2.png'))

def shot_hero_3(a, out, glb):
    import collector_sheet as CS
    LS, sc, M = scene(a, sun_el=18.0, sun_az=100.0)
    root, objs = import_glb(os.path.join(glb, 'collector_hero.glb')); fix_materials(objs)
    litter_on_sand(LS, M)
    cam = CS._cam(sc, 'Cam', (0.80, -0.78, 0.32), (-0.02, -0.14, 0.23), 40.0)
    render(sc, cam, os.path.join(out, a.prefix + '-3.png'))

def shot_hero_4(a, out, glb):
    import collector_sheet as CS
    LS, sc, M = scene(a, sun_el=22.0, sun_az=140.0)
    root, objs = import_glb(os.path.join(glb, 'collector_hero_grab.glb')); fix_materials(objs)
    import collector_model as CM
    tgt = CM.GRAB_TARGET; yaw = math.degrees(math.atan2(tgt[1] - CM.SHOULDER[1], tgt[0] - CM.SHOULDER[0]))
    bottle(LS, M, (tgt[0] - 0.01 * math.cos(math.radians(yaw)), tgt[1] - 0.01 * math.sin(math.radians(yaw)), 0), yaw, lift=tgt[2] - 0.04)
    litter_on_sand(LS, M)
    cam = CS._cam(sc, 'Cam', (1.55, -1.1, 0.62), (0.18, 0.1, 0.24), 44.0)
    render(sc, cam, os.path.join(out, a.prefix + '-4.png'))


def shot_face(a, out, glb):
    """close-up of the head: the visor with its glow strip, the sensor window, the lamp, the mirror quirk"""
    import collector_sheet as CS
    LS, sc, M = scene(a, sun_el=22.0, sun_az=112.0, exposure=-0.15)
    root, objs = import_glb(os.path.join(glb, 'collector_hero_sun.glb')); fix_materials(objs)
    cam = CS._cam(sc, 'Cam', (0.95, -0.52, 0.52), (0.45, 0.0, 0.31), 34.0)
    render(sc, cam, os.path.join(out, a.prefix + '-face.png'))

def shot_quirks(a, out, glb):
    """two views side by side: rear left (the leaning panel, the trinket on the hopper lid) and rear right (the repair patch, the trinket); the mirror is on the head and shows in the face picture"""
    import bpy
    import collector_sheet as CS
    cells = []
    for i, (cpos, look) in enumerate((((-1.30, 1.00, 0.72), (-0.15, 0.05, 0.28)), ((-1.35, -0.95, 0.72), (-0.15, -0.05, 0.28)))):
        LS, sc, M = scene(a, sun_el=26.0, sun_az=(60.0 if i == 0 else 60.0))
        sc.render.resolution_x = a.w // 2; sc.render.resolution_y = a.h
        root, objs = import_glb(os.path.join(glb, 'collector_hero.glb')); fix_materials(objs); litter_on_sand(LS, M)
        cam = CS._cam(sc, 'Cam', cpos, look, 40.0); p = os.path.join(out, 'quirk-%d.png' % i); render(sc, cam, p); cells.append(CS.read_png(p))
    CS.write_png(os.path.join(out, a.prefix + '-quirks.png'), np.concatenate(cells, 1))


def shot_dbg(a, out, glb):
    """quick check views of a pose: side, front, top (orthographic) in one picture"""
    import collector_sheet as CS
    import bpy
    pose = os.environ.get('COLLECTOR_POSE', '')
    LS, sc, M = scene(a, sun_el=40.0, sun_az=150.0)
    root, objs = import_glb(os.path.join(glb, 'collector_hero%s.glb' % ('_' + pose if pose else ''))); fix_materials(objs)
    cams = [CS._cam(sc, 'S', (0.0, -4.0, 0.33), (0.0, 0.0, 0.33), 50.0, ortho=1.5), CS._cam(sc, 'F', (4.0, 0.0, 0.33), (0.0, 0.0, 0.33), 50.0, ortho=1.5),
            CS._cam(sc, 'T', (0.0, 0.0, 4.0), (0.0, 0.0, 0.0), 50.0, ortho=1.5)]
    ps = []
    for i, c in enumerate(cams):
        p = os.path.join(out, 'dbg%d.png' % i); render(sc, c, p); ps.append(CS.read_png(p))
    CS.write_png(os.path.join(out, 'collector-dbg.png'), np.concatenate(ps, 1))


def label_png(path, labels, scale=3):
    import collector_sheet as CS
    CS.FONT.update(GLYPHS)
    img = CS.read_png(path)
    for (x, y, text) in labels: CS.draw_text(img, x, y, text, scale, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(path, img)


def wire_override():
    import bpy
    m = bpy.data.materials.new('WireFlat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); wf = nt.nodes.new('ShaderNodeWireframe'); wf.use_pixel_size = True; wf.inputs['Size'].default_value = 1.1
    mx = nt.nodes.new('ShaderNodeMixRGB'); mx.inputs['Color1'].default_value = (0.90, 0.88, 0.82, 1); mx.inputs['Color2'].default_value = (0.05, 0.05, 0.06, 1)
    nt.links.new(wf.outputs['Fac'], mx.inputs['Fac']); nt.links.new(mx.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m

def shot_lods(a, out, glb):
    """hero, live and far side by side (top row shaded, bottom row wire), each framed on its own, same camera and light"""
    import bpy, json
    import collector_sheet as CS
    rep = {}
    try: rep = json.load(open(os.path.join(glb, 'collector_report.json')))
    except Exception: pass
    cw, ch = a.w // 3, int(a.h * 0.62)
    cells = {}
    for name, fn in (('hero', 'collector_hero.glb'), ('live', 'collector_live.glb'), ('far', 'collector_far.glb')):
        for wire in (False, True):
            LS, sc, M = scene(a, sun_el=30.0, sun_az=125.0, exposure=-0.2)
            sc.render.resolution_x = cw; sc.render.resolution_y = ch
            root, objs = import_glb(os.path.join(glb, fn), yaw_deg=24.0); fix_materials(objs)
            cam = CS._cam(sc, 'Cam', (2.1, -0.8, 0.66), (0.0, 0.0, 0.28), 44.0)
            if wire:
                bpy.context.view_layer.material_override = wire_override(); sc.cycles.samples = max(8, a.samples // 4)
                for ob in list(bpy.data.objects):
                    if ob.name.startswith('SandFine') or ob.name.startswith('SandBig'): ob.hide_render = True
                nt = sc.world.node_tree; nt.nodes.clear(); o = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.18, 0.19, 0.2, 1); bg.inputs['Strength'].default_value = 1.0
                nt.links.new(bg.outputs[0], o.inputs['Surface']); sc.view_settings.view_transform = 'Standard'
                try: sc.view_settings.look = 'None'
                except Exception: pass
                sc.view_settings.exposure = 0.0
            p = os.path.join(out, 'lod-%s-%s.png' % (name, 'wire' if wire else 'shaded')); render(sc, cam, p); cells[(name, wire)] = CS.read_png(p)
            bpy.context.view_layer.material_override = None
    rows = [np.concatenate([cells[(n, wr)] for n in ('hero', 'live', 'far')], 1) for wr in (False, True)]
    img = np.concatenate(rows, 0); CS.FONT.update(GLYPHS)
    for i, (name, fn) in enumerate((('hero', 'collector_hero.glb'), ('live', 'collector_live.glb'), ('far', 'collector_far.glb'))):
        tri = rep.get(fn, {}).get('triangles', 0); kb = rep.get(fn, {}).get('bytes', 0) / 1024.0
        CS.draw_text(img, 12 + i * cw, 10, '%s %d TRI' % (name.upper(), tri), 2, (0.97, 0.96, 0.9), bg=0.08); CS.draw_text(img, 12 + i * cw, 36, '%d KB GLB' % round(kb), 2, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(out, a.prefix + '-lods.png'), img)


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True)
    jobs = {'1': shot_hero_1, '2': shot_hero_2, '3': shot_hero_3, '4': shot_hero_4, 'face': shot_face, 'quirks': shot_quirks, 'lods': shot_lods, 'dbg': shot_dbg}
    for k in a.only:
        if k in jobs: jobs[k](a, a.out, a.glb)


if __name__ == '__main__':
    main()
