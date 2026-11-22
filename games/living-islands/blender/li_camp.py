"""Camp props for the hero render: two canvas tents, a clinker rowboat, a campfire with stones, logs and pot. Seeded, bpy+numpy."""
import math
import bpy
import numpy as np
import island_common as IC
from li_scene import mesh_obj, node, link, ramp, principled, pin, boulder

def mat_simple(name, rgb, rough=0.8, nodes_fn=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough
    return m

def canvas_material(name, rgb, seed=1):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (900, 0)); bs = principled(nt, (600, 0))
    tc = node(nt, 'ShaderNodeTexCoord', (-900, 0))
    wv = node(nt, 'ShaderNodeTexWave', (-600, 200), wave_type='BANDS'); wv.inputs['Scale'].default_value = 60; wv.inputs['Distortion'].default_value = 1.5
    link(nt, tc.outputs['Object'], wv.inputs['Vector'])
    nz = node(nt, 'ShaderNodeTexNoise', (-600, -100), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 6; nz.inputs['Detail'].default_value = 6
    link(nt, tc.outputs['Object'], nz.inputs['Vector'])
    mx = node(nt, 'ShaderNodeMix', (-200, 100), data_type='RGBA', blend_type='MULTIPLY'); mx.inputs['Factor'].default_value = 0.7
    mx.inputs['A'].default_value = (*rgb, 1)
    cr = ramp(nt, nz.outputs['Fac'], [(0.25, (0.55, 0.52, 0.48, 1)), (0.7, (1.1, 1.08, 1.0, 1))], (-450, -100)); link(nt, cr.outputs['Color'], mx.inputs['B'])
    link(nt, mx.outputs['Result'], bs.inputs['Base Color']); pin(bs, 'Roughness', 0.95)
    bm = node(nt, 'ShaderNodeBump', (300, -200)); bm.inputs['Strength'].default_value = 0.25; bm.inputs['Distance'].default_value = 0.01
    link(nt, wv.outputs['Fac'], bm.inputs['Height']); link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    return m

def wood_material(name, rgb, seed=1, scale=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (900, 0)); bs = principled(nt, (600, 0))
    tc = node(nt, 'ShaderNodeTexCoord', (-900, 0))
    mp = node(nt, 'ShaderNodeMapping', (-700, 0)); mp.inputs['Scale'].default_value = (1.5 * scale, 14 * scale, 14 * scale)
    link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    nz = node(nt, 'ShaderNodeTexNoise', (-450, 0), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 3; nz.inputs['Detail'].default_value = 8
    link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
    cr = ramp(nt, nz.outputs['Fac'], [(0.3, (rgb[0] * .5, rgb[1] * .5, rgb[2] * .5, 1)), (0.7, (rgb[0] * 1.15, rgb[1] * 1.15, rgb[2] * 1.1, 1))], (-200, 0))
    link(nt, cr.outputs['Color'], bs.inputs['Base Color']); pin(bs, 'Roughness', 0.75)
    bm = node(nt, 'ShaderNodeBump', (300, -200)); bm.inputs['Strength'].default_value = 0.3; bm.inputs['Distance'].default_value = 0.01
    link(nt, nz.outputs['Fac'], bm.inputs['Height']); link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    return m

def cylinder(name, p0, p1, r0, r1, seg=8):
    p0 = np.array(p0, float); p1 = np.array(p1, float); ax = p1 - p0; L = np.linalg.norm(ax); ax /= L
    t = np.array([0, 0, 1.0]) if abs(ax[2]) < .95 else np.array([1.0, 0, 0])
    a = np.cross(ax, t); a /= np.linalg.norm(a); b = np.cross(ax, a)
    verts = []
    for p, r in ((p0, r0), (p1, r1)):
        for i in range(seg):
            ang = 2 * math.pi * i / seg
            verts.append(p + r * (math.cos(ang) * a + math.sin(ang) * b))
    faces = [(i, (i + 1) % seg, seg + (i + 1) % seg, seg + i) for i in range(seg)]
    verts += [p0, p1]; c0 = 2 * seg; c1 = 2 * seg + 1
    faces += [((i + 1) % seg, i, c0) for i in range(seg)] + [(seg + i, seg + (i + 1) % seg, c1) for i in range(seg)]
    return mesh_obj(name, verts, faces, True)

def box(name, c, size, rotz=0.0):
    sx, sy, sz = [s / 2 for s in size]
    v = np.array([(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)])
    ca, sa = math.cos(rotz), math.sin(rotz)
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]])
    v = v @ R.T + np.array(c)
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh_obj(name, v, f, False)

def tent(name, base, yaw, length, width, height, mat, seed, door_mat=None):
    """A-frame tent. Local +x is the long axis, +y the width, front (door) at -x end. sag via noise."""
    rng = np.random.default_rng(seed)
    n = 9
    verts = []; faces = []
    def panel(p00, p10, p01, p11, sag, flip=False):
        base_i = len(verts)
        for j in range(n):
            for i in range(n):
                s = i / (n - 1); t = j / (n - 1)
                p = (p00 * (1 - s) * (1 - t) + p10 * s * (1 - t) + p01 * (1 - s) * t + p11 * s * t)
                p = p + np.array([0, 0, -sag * math.sin(math.pi * s) * math.sin(math.pi * t)])
                p = p + rng.normal(0, 0.004, 3)
                verts.append(p)
        for j in range(n - 1):
            for i in range(n - 1):
                a = base_i + j * n + i; b = a + 1; c = a + n + 1; d = a + n
                faces.append((a, d, c, b) if flip else (a, b, c, d))
    L, W, H = length / 2, width / 2, height
    r0 = np.array([-L, 0, H]); r1 = np.array([L, 0, H])
    # left and right roof panels
    panel(np.array([-L, -W, 0.0]), np.array([L, -W, 0.0]), r0, r1, 0.03)
    panel(r0, r1, np.array([-L, W, 0.0]), np.array([L, W, 0.0]), 0.03)
    # back triangle: grid collapsed
    base_i = len(verts)
    verts += [np.array([L, -W, 0.0]), np.array([L, W, 0.0]), r1]; faces.append((base_i, base_i + 2, base_i + 1))
    # front: two flaps leaving an opening
    fo = 0.18 * W
    verts_f = len(verts)
    verts += [np.array([-L, -W, 0.0]), np.array([-L, -fo, 0.0]), np.array([-L, 0, H * 0.97]), np.array([-L, fo, 0.0]), np.array([-L, W, 0.0])]
    faces += [(verts_f, verts_f + 2, verts_f + 1), (verts_f + 3, verts_f + 2, verts_f + 4)]
    # ground sheet and dark interior hint
    v = np.array(verts)
    ca, sa = math.cos(yaw), math.sin(yaw)
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]])
    v = v @ R.T + np.array(base)
    ob = mesh_obj(name, v, faces, True)
    ob.data.materials.append(mat)
    # inside: dark floor patch so the door is a dark hole
    fl = mesh_obj(name + 'Floor', (np.array([[-L, -W * .98, .02], [L, -W * .98, .02], [L, W * .98, .02], [-L, W * .98, .02]]) @ R.T + np.array(base)), [(0, 1, 2, 3)], False)
    fl.data.materials.append(mat_simple('TentFloor', (0.03, 0.03, 0.03), 1.0))
    # ridge pole stubs and guy lines with pegs
    objs = [ob, fl]
    for sgn in (-1, 1):
        for end in (-1, 1):
            p_top = np.array([end * L, 0, H]); p_peg = np.array([end * (L + 0.9), sgn * (W + 1.1) * 0.55, 0.0])
            a = p_top @ R.T + np.array(base); b = p_peg @ R.T + np.array(base)
            c = cylinder(name + 'Guy', a, b, 0.006, 0.006, 4); c.data.materials.append(mat_simple('Rope', (0.22, 0.17, 0.10), 1.0)); objs.append(c)
    return objs

def rowboat(base, yaw, tilt, seed, length=3.4, beam=1.35, depth=0.5):
    """lapstrake-ish rowboat hull as lofted station rings, with gunwale thickness, thwarts and two oars."""
    ns = 22; nr = 9
    st = np.linspace(-1, 1, ns)
    outer = np.zeros((ns, nr, 3)); inner = np.zeros((ns, nr, 3))
    for i, s in enumerate(st):
        taper = (1 - s ** 2) ** 0.55
        bw = beam / 2 * taper
        keel = -depth * (0.55 + 0.45 * taper) * (1 if abs(s) < .97 else 0.6)
        sheer = 0.05 * s ** 2 + (0.16 * abs(s) ** 3 if abs(s) > 0.5 else 0)   # bow and stern rise
        for j in range(nr):
            t = j / (nr - 1)                       # 0 keel -> 1 gunwale
            ang = t * math.pi / 2
            y = bw * math.sin(ang) ** 1.3
            z = keel + (0 - keel) * (1 - math.cos(ang) ** 1.0) + sheer * t
            outer[i, j] = (s * length / 2, y, z + depth * 0.5)
            inner[i, j] = (s * length / 2 * 0.998, y * 0.93 - 0.02 * (1 - t), z + depth * 0.5 + 0.03 + 0.02 * (1 - t))
    verts = []; faces = []
    def add(arr, side, flip):
        base_i = len(verts)
        for i in range(ns):
            for j in range(nr):
                p = arr[i, j].copy(); p[1] *= side; verts.append(p)
        for i in range(ns - 1):
            for j in range(nr - 1):
                a = base_i + i * nr + j; b = a + 1; c = a + nr + 1; d = a + nr
                faces.append((a, b, c, d) if (flip ^ (side < 0)) else (a, d, c, b))
    add(outer, 1, False); add(outer, -1, False); add(inner, 1, True); add(inner, -1, True)
    # gunwale cap: connect outer top to inner top both sides
    for side in (1, -1):
        base_i = len(verts)
        for i in range(ns):
            p = outer[i, -1].copy(); p[1] *= side; q = inner[i, -1].copy(); q[1] *= side
            verts += [p, q]
        for i in range(ns - 1):
            a = base_i + 2 * i; faces.append((a, a + 1, a + 3, a + 2) if side > 0 else (a, a + 2, a + 3, a + 1))
    v = np.array(verts)
    # plank lines: add small z ripple per ring row (lapstrake)
    ca, sa = math.cos(yaw), math.sin(yaw)
    cb, sb = math.cos(tilt), math.sin(tilt)
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]]) @ np.array([[1, 0, 0], [0, cb, -sb], [0, sb, cb]])
    def tr(a): return a @ R.T + np.array(base)
    hull = mesh_obj('Rowboat', tr(v), faces, True)
    # materials: outside faded blue-grey, inside pale wood; assign by face normal in local space? simple: one weathered paint material mixed by Z
    m = bpy.data.materials.new('BoatPaint'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (900, 0)); bs = principled(nt, (600, 0))
    geo = node(nt, 'ShaderNodeNewGeometry', (-900, 0)); tc = node(nt, 'ShaderNodeTexCoord', (-900, 200))
    mp = node(nt, 'ShaderNodeMapping', (-700, 200)); mp.inputs['Scale'].default_value = (1, 1, 1)
    link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    nz = node(nt, 'ShaderNodeTexNoise', (-450, 200), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 7; nz.inputs['Detail'].default_value = 7
    link(nt, mp.outputs['Vector'], nz.inputs['Vector'])
    pl = node(nt, 'ShaderNodeTexWave', (-450, -100), wave_type='BANDS', bands_direction='Z'); pl.inputs['Scale'].default_value = 7; pl.inputs['Distortion'].default_value = 0.4
    link(nt, tc.outputs['Object'], pl.inputs['Vector'])
    paint = ramp(nt, nz.outputs['Fac'], [(0.35, (0.07, 0.14, 0.20, 1)), (0.6, (0.10, 0.20, 0.27, 1)), (0.8, (0.45, 0.38, 0.28, 1))], (-200, 200))
    seam = ramp(nt, pl.outputs['Fac'], [(0.0, (0.5, 0.5, 0.5, 1)), (0.2, (1, 1, 1, 1))], (-200, -100))
    mx = node(nt, 'ShaderNodeMix', (150, 100), data_type='RGBA', blend_type='MULTIPLY'); mx.inputs['Factor'].default_value = 1
    link(nt, paint.outputs['Color'], mx.inputs['A']); link(nt, seam.outputs['Color'], mx.inputs['B'])
    # inside is wood: flip on backfacing
    inside = mat_simple('x', (0.45, 0.33, 0.2))
    wd = node(nt, 'ShaderNodeMix', (400, 100), data_type='RGBA'); wd.inputs['B'].default_value = (0.30, 0.20, 0.11, 1)
    link(nt, geo.outputs['Backfacing'], wd.inputs['Factor']); link(nt, mx.outputs['Result'], wd.inputs['A'])
    link(nt, wd.outputs['Result'], bs.inputs['Base Color']); pin(bs, 'Roughness', 0.65)
    bm = node(nt, 'ShaderNodeBump', (300, -250)); bm.inputs['Strength'].default_value = 0.3; bm.inputs['Distance'].default_value = 0.02
    link(nt, pl.outputs['Fac'], bm.inputs['Height']); link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    hull.data.materials.append(m)
    wm = wood_material('BoatWood', (0.38, 0.27, 0.15))
    objs = [hull]
    for k, x in enumerate((-0.55, 0.15, 0.85)):
        taper = (1 - (x / (length / 2)) ** 2) ** 0.55
        w = beam * taper * 0.86
        th = box('Thwart%d' % k, (0, 0, 0), (0.22, w, 0.035))
        th.location = (0, 0, 0)
        for vv in th.data.vertices:
            vv.co.x += x; vv.co.z += depth * 0.5 + 0.06 - 0.05
        th.data.materials.append(wm)
        th.rotation_euler = (0, 0, 0)
        objs.append(th)
    for o in objs[1:]:
        # apply boat transform to thwarts
        mw = np.array(o.data.vertices[0].co)
        co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', co); co = tr(co.reshape(-1, 3)); o.data.vertices.foreach_set('co', co.ravel()); o.data.update()
    # oars resting inside
    for sgn in (-1, 1):
        p0 = tr(np.array([[-0.9, sgn * 0.05, 0.25]]))[0]; p1 = tr(np.array([[0.9, sgn * 0.55, 0.32]]))[0]
        o = cylinder('Oar', p0, p1, 0.018, 0.018, 6); o.data.materials.append(wm); objs.append(o)
        bl = tr(np.array([[0.9, sgn * 0.55, 0.32]]))[0]; bl2 = tr(np.array([[1.45, sgn * 0.8, 0.28]]))[0]
        o2 = cylinder('Blade', bl, bl2, 0.05, 0.05, 6); o2.scale = (1, 1, 1); o2.data.materials.append(wm); objs.append(o2)
    return objs

def campfire(center, seed, rock_mat=None):
    rng = np.random.default_rng(seed + 900)
    cx, cy, cz = center
    objs = []
    # stone ring
    for i in range(11):
        a = 2 * math.pi * i / 11 + rng.uniform(-.1, .1); r = 0.52 + rng.uniform(-.05, .06)
        b = boulder(seed + 50 + i, rng.uniform(0.13, 0.2), (cx + r * math.cos(a), cy + r * math.sin(a), cz + 0.02), rng.uniform(0, 6.28), 2)
        if rock_mat is not None: b.data.materials.append(rock_mat)
        objs.append(b)
    # embers bed
    emb = cylinder('Embers', (cx, cy, cz + 0.01), (cx, cy, cz + 0.05), 0.42, 0.40, 14)
    m = bpy.data.materials.new('Embers'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); bs = principled(nt, (300, 0))
    nz = node(nt, 'ShaderNodeTexNoise', (-300, 0), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 30; nz.inputs['Detail'].default_value = 4
    tc = node(nt, 'ShaderNodeTexCoord', (-600, 0)); link(nt, tc.outputs['Object'], nz.inputs['Vector'])
    cr = ramp(nt, nz.outputs['Fac'], [(0.35, (0.01, 0.01, 0.01, 1)), (0.55, (0.7, 0.12, 0.02, 1)), (0.8, (1.0, 0.45, 0.08, 1))], (-100, 0))
    link(nt, cr.outputs['Color'], bs.inputs['Base Color']); link(nt, cr.outputs['Color'], bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value = 6.0
    link(nt, bs.outputs['BSDF'], out.inputs['Surface']); emb.data.materials.append(m); objs.append(emb)
    # logs in a tepee
    wm = wood_material('Log', (0.20, 0.13, 0.07), scale=0.7)
    for i in range(5):
        a = 2 * math.pi * i / 5 + rng.uniform(-.2, .2)
        o = cylinder('Log', (cx + 0.34 * math.cos(a), cy + 0.34 * math.sin(a), cz + 0.05), (cx + 0.04 * math.cos(a + .3), cy + 0.04 * math.sin(a + .3), cz + 0.62), 0.045, 0.035, 7)
        o.data.materials.append(wm); objs.append(o)
    # flame: stacked emissive cones
    fm = bpy.data.materials.new('Flame'); fm.use_nodes = True; nt = fm.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (600, 0)); em = node(nt, 'ShaderNodeEmission', (300, 0)); em.inputs['Color'].default_value = (1.0, 0.42, 0.07, 1); em.inputs['Strength'].default_value = 14
    tr_ = node(nt, 'ShaderNodeBsdfTransparent', (300, -150)); mixn = node(nt, 'ShaderNodeMixShader', (450, 0)); mixn.inputs['Fac'].default_value = 0.35
    link(nt, tr_.outputs[0], mixn.inputs[1]); link(nt, em.outputs[0], mixn.inputs[2]); link(nt, mixn.outputs[0], out.inputs['Surface'])
    for i in range(4):
        a = i * 1.7
        h = rng.uniform(0.45, 0.72)
        o = cylinder('Flame', (cx + 0.08 * math.cos(a), cy + 0.08 * math.sin(a), cz + 0.18), (cx + 0.05 * math.cos(a), cy + 0.05 * math.sin(a), cz + 0.18 + h), 0.14, 0.005, 7)
        o.data.materials.append(fm); objs.append(o)
    bpy.ops.object.light_add(type='POINT', location=(cx, cy, cz + 0.55))
    L = bpy.context.object; L.data.energy = 220; L.data.color = (1.0, 0.55, 0.22); L.data.shadow_soft_size = 0.25; L.name = 'FireLight'
    objs.append(L)
    # tripod and pot
    for i in range(3):
        a = 2 * math.pi * i / 3 + 0.5
        o = cylinder('Tripod', (cx + 0.75 * math.cos(a), cy + 0.75 * math.sin(a), cz), (cx, cy, cz + 1.35), 0.02, 0.014, 5)
        o.data.materials.append(wm); objs.append(o)
    pot = cylinder('Pot', (cx, cy, cz + 0.88), (cx, cy, cz + 1.12), 0.16, 0.19, 12)
    pot.data.materials.append(mat_simple('Iron', (0.02, 0.02, 0.022), 0.5)); objs.append(pot)
    # log seats
    for i, (a, d) in enumerate(((2.4, 1.35), (4.0, 1.4), (5.4, 1.3))):
        p0 = (cx + d * math.cos(a) - 0.5 * math.sin(a), cy + d * math.sin(a) + 0.5 * math.cos(a), cz + 0.17)
        p1 = (cx + d * math.cos(a) + 0.5 * math.sin(a), cy + d * math.sin(a) - 0.5 * math.cos(a), cz + 0.17)
        o = cylinder('Seat', p0, p1, 0.17, 0.16, 9); o.data.materials.append(wm); objs.append(o)
    return objs
