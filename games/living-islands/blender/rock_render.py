"""Cycles still of the rock GLB on a patch of beach: python rock_render.py GLB OUT.png [--angle DEG] [--w --h --samples]
(Turntable still: one frame of a turntable; --angle sets the yaw.)"""
import sys, os, math, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
import li_scene as LS
ap = argparse.ArgumentParser(); ap.add_argument('glb'); ap.add_argument('out'); ap.add_argument('--angle', type=float, default=30)
ap.add_argument('--w', type=int, default=900); ap.add_argument('--h', type=int, default=700); ap.add_argument('--samples', type=int, default=128)
ap.add_argument('--sheet', action='store_true')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
t0 = time.time()
sc = LS.reset()
bpy.ops.import_scene.gltf(filepath=a.glb)
rocks = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in rocks:
    o.rotation_euler = (0, 0, math.radians(a.angle))
# plinth: pebbly sand disc and a turntable-style backdrop
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -0.001)); g = bpy.context.object
m = bpy.data.materials.new('Sand'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40; nz.inputs['Detail'].default_value = 8
cr = LS.ramp(nt, nz.outputs['Fac'], [(0.3, (0.30, 0.24, 0.16, 1)), (0.7, (0.55, 0.47, 0.34, 1))], (-200, 0))
nt.links.new(cr.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.95
bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.4; bm.inputs['Distance'].default_value = 0.02; nt.links.new(nz.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
g.data.materials.append(m)
LS.make_sky(14, 320, 0.5)
import mathutils
bpy.ops.object.light_add(type='SUN'); sun = bpy.context.object; sun.data.energy = 9; sun.data.color = (1, 0.8, 0.58); sun.data.angle = math.radians(1.5)
el = math.radians(26); th = math.radians(325)
sd = np.array([math.sin(th) * math.cos(el), math.cos(th) * math.cos(el), math.sin(el)])
sun.rotation_euler = mathutils.Vector(tuple(-sd)).to_track_quat('-Z', 'Y').to_euler()
cam = bpy.data.cameras.new('c'); cam.lens = 55; co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (3.6, -6.2, 2.4); d = mathutils.Vector((0, 0, 0.55)) - co.location
co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.dof.use_dof = True; cam.dof.focus_distance = d.length; cam.dof.aperture_fstop = 16
LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=-0.2)
sc.render.filepath = os.path.abspath(a.out)
bpy.ops.render.render(write_still=True)
print('render s', round(time.time() - t0, 1))
