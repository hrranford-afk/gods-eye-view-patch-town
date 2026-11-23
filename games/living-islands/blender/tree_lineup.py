"""TREE LINEUP: every species and age class side by side on a flat plane, same sun and sky as the landform scenes.
  blender -b --python tree_lineup.py -- --out shots/trees-lineup.png [--w 2400 --samples 48 --seed 7] [--band trees|cover|both]
Writes OUT.png (the render, two bands stacked: trees, then scrub / ground cover / dead wood enlarged 2.5x) and OUT.labels.json (pixel anchors and
captions); labels are drawn afterwards with PIL (lineup_labels.py) so the render needs no fonts.
Age classes: sapling = 0.45 scale of a mature variant; mature = variant below the veteran index; veteran = a veteran variant (gnarled, wider, dead limb) at
1.2 scale; species without a veteran variant (thickets, scrub, dead wood) show the mature variant at 1.2 scale and say so in the caption."""
import os, sys, math, json, argparse, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'landform'))
import numpy as np
import bpy
import li_scene as LS
import li_trees as LT

TREES = ['pine', 'spruce', 'birch', 'rowan', 'oak']
TREES2 = ['hazel', 'willow', 'wind_pine', 'wind_thorn', 'snag', 'log']
ENL = dict(juniper=3.0, gorse=3.0, bracken=3.5, heather=6.0, cotton=8.0, snag=1.0, log=2.0)
COVER = ['juniper', 'gorse', 'bracken', 'heather', 'cotton']
NAMES = dict(pine='Scots pine', spruce='spruce / fir', birch='birch', rowan='rowan', oak='oak', hazel='hazel thicket', willow='willow', wind_pine='wind pine (flag)',
             wind_thorn='wind thorn', juniper='juniper', gorse='gorse', bracken='bracken', heather='heather', cotton='bog cotton', snag='snag (dead)', log='fallen log')

def band_items(names, seed, pitch, enlarge):
    """enlarge: a number, or the ENL dict (per-species factor; scrub and ground cover are drawn bigger than life so they can be read, the caption says by how much)."""
    items = []; labels = []
    x = 0.0
    for sp in names:
        spd = LT.SPECIES[sp]; vets = [i for i in range(spd['n']) if i >= spd['vet']]; nonv = [i for i in range(spd['n']) if i < spd['vet']]
        for age, base in (('sapling', 0.45), ('mature', 1.0), ('veteran', 1.2)):
            vi = (vets[0] if vets else nonv[min(2, len(nonv) - 1)]) if age == 'veteran' else nonv[0 if age == 'sapling' else min(1, len(nonv) - 1)]
            en = enlarge[sp] if isinstance(enlarge, dict) else enlarge; sc = base * en
            items.append(dict(kind=spd['kind'], sp=sp, vi=vi, x=x, y=0.0, z=0.0, sc=sc, sw=sc, yaw=0.0 if spd['kind'] != 'wind' else 0.0, lean=0.0, lean_dir=0.0, age=age,
                              col=(0.0, 1.0, 0.0)))
            labels.append(dict(sp=sp, age=age + ('*' if (age == 'veteran' and not vets) else ''), x=x, h=spd['h'] * sc, en=en))
            x += max(spd['r'] * 2.4 * sc * (1.0 if age != 'sapling' else 1.3), 0.7 * en if spd['kind'] == 'cover' else 2.4) + (0.8 * en if sp == 'log' else 0.4)
        x += 0.9 * (enlarge[sp] if isinstance(enlarge, dict) else enlarge)
    return items, labels, x

def render_band(names, enlarge, out, w_px, samples, seed, tag):
    from mathutils import Vector
    sc = LS.reset()
    items, labels, xend = band_items(names, seed, 1.0, enlarge)
    width = xend + 4.0; hmax = max(l['h'] for l in labels)
    h_px = int(w_px * (hmax * 1.3 + 9.0 * math.sin(math.radians(24))) / width)
    # ground
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(width / 2 - 2.0, 0, 0)); g = bpy.context.object; g.scale = (width + 40, 30, 1)
    m = bpy.data.materials.new('Ground'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.7; nz.inputs['Detail'].default_value = 4
    cr = LS.ramp(nt, nz.outputs['Fac'], [(0.3, (0.05, 0.075, 0.025, 1)), (0.6, (0.12, 0.14, 0.05, 1)), (0.85, (0.2, 0.19, 0.08, 1))], (-100, 0))
    tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(cr.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.95
    g.data.materials.append(m)
    LT.reset_cache(); LT.instantiate(items, seed, 1)
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = width; cam.clip_end = 400
    co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
    el = math.radians(24); cx = width / 2 - 2.0; zc = hmax * 0.5 + 0.8
    co.location = (cx, -60 * math.cos(el), zc + 60 * math.sin(el)); co.rotation_euler = (math.radians(90) - el, 0, 0)
    cam.shift_y = -0.0
    # same light as the landform scenes: golden sun low, from the camera's left-front
    cam_az = 180.0; sun_az = (cam_az + 125.0) % 360.0; sun_el = 17.0
    LS.make_sky(sun_elev_deg=sun_el, sun_az_deg=sun_az, strength=0.22)
    # plain pale backdrop (the Nishita sky renders black under an orthographic camera looking at the horizon); the sun and the sky light stay as in the scenes
    wn = bpy.context.scene.world.node_tree
    bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.62, 0.70, 0.78, 1); bg.inputs['Strength'].default_value = 0.35
    lp = wn.nodes.new('ShaderNodeLightPath'); mxw = wn.nodes.new('ShaderNodeMixShader'); outw = [n for n in wn.nodes if n.bl_idname == 'ShaderNodeOutputWorld'][0]
    skyn = [l.from_node for l in wn.links if l.to_node == outw][0]
    wn.links.new(lp.outputs['Is Camera Ray'], mxw.inputs['Fac']); wn.links.new(skyn.outputs[0], mxw.inputs[1]); wn.links.new(bg.outputs[0], mxw.inputs[2]); wn.links.new(mxw.outputs[0], outw.inputs['Surface'])
    el_r = math.radians(sun_el); th = math.radians(sun_az)
    sd = np.array([math.sin(th) * math.cos(el_r), math.cos(th) * math.cos(el_r), math.sin(el_r)])
    bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object
    sun.data.color = (1.0, 0.76, 0.5); sun.data.angle = math.radians(1.0); sun.data.energy = 12.0
    sun.rotation_euler = Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
    LS.render_settings(sc, w_px, h_px, samples, True, exposure=-0.15)
    sc.render.filepath = os.path.abspath(out)
    t = time.time(); bpy.ops.render.render(write_still=True)
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    anchors = []
    for it, lb in zip(items, labels):
        p = world_to_camera_view(sc, co, Vector((it['x'], 0.0, 0.0)))
        anchors.append(dict(sp=lb['sp'], age=lb['age'], en=lb['en'], px=float(p.x * w_px), py=float((1 - p.y) * h_px)))
    return dict(tag=tag, w=w_px, h=h_px, anchors=anchors, enlarge=enlarge, render_s=round(time.time() - t, 1),
                tris=int(sum(LT.variant(i['sp'], i['vi'], seed, 1)['tris'] for i in items)), variants=len({(i['sp'], i['vi']) for i in items}))

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='trees-lineup'); ap.add_argument('--w', type=int, default=2400); ap.add_argument('--samples', type=int, default=48)
    ap.add_argument('--seed', type=int, default=7); ap.add_argument('--band', default='both')
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    base = os.path.splitext(a.out)[0]; meta = dict(bands=[])
    if a.band in ('trees', 'both'):
        meta['bands'].append(render_band(TREES, 1.0, base + '_trees.png', a.w, a.samples, a.seed, 'trees'))
        meta['bands'].append(render_band(TREES2, 1.0, base + '_trees2.png', a.w, a.samples, a.seed, 'trees2'))
    if a.band in ('cover', 'both'):
        meta['bands'].append(render_band(COVER, ENL, base + '_cover.png', a.w, a.samples, a.seed, 'cover'))
    meta['names'] = NAMES
    json.dump(meta, open(base + '.labels.json', 'w'))
    print('LINEUP_META ' + json.dumps(dict(bands=[{k: v for k, v in b.items() if k != 'anchors'} for b in meta['bands']])))
