"""Scene building blocks shared by the hero render and the land bake. Needs bpy (Blender as a python module) + numpy.
Everything is seeded: same seed -> same meshes. Frame: Blender X east, Y north, Z up, metres."""
import math, os
import bpy
import numpy as np
import island_common as IC

# ---------------------------------------------------------------- Blender 3.6 compatibility (added by Hardware Claude, 22 Nov 2026)
# In Blender 3.6 the Mix node (ShaderNodeMix) has Float, Vector and Color sockets that SHARE the names A, B, Factor and Result;
# a lookup by name returns the Float one even when data_type is 'RGBA'. Pick by identifier instead (works on 3.6 and newer).
# Principled BSDF 'Emission Color' was called 'Emission' before Blender 4.0.
def S(n, side, name):
    socks = getattr(n, side)
    if n.bl_idname == 'ShaderNodeMix' and name in ('A', 'B', 'Result', 'Factor'):
        suffix = {'RGBA': 'Color', 'FLOAT': 'Float', 'VECTOR': 'Vector'}.get(getattr(n, 'data_type', ''), '')
        if name == 'Factor' and suffix != 'Vector': suffix = 'Float'
        for s in socks:
            if s.identifier == name + '_' + suffix:
                return s
    if name not in socks.keys() and name == 'Emission Color' and 'Emission' in socks.keys():
        return socks['Emission']
    return socks[name]

# ---------------------------------------------------------------- helpers
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try:
        bpy.ops.preferences.addon_enable(module='cycles')
    except Exception:
        pass
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    if os.environ.get('LI_DEVICE', 'CPU').upper() == 'GPU':
        # optional GPU rendering (set LI_DEVICE=GPU); falls back to CPU if no GPU backend is usable
        try:
            prefs = bpy.context.preferences.addons['cycles'].preferences
            for kind in ('METAL', 'OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
                try:
                    prefs.compute_device_type = kind
                    prefs.get_devices()
                    gpus = [d for d in prefs.devices if d.type != 'CPU']
                    if gpus:
                        for d in prefs.devices:
                            d.use = (d.type != 'CPU')
                        sc.cycles.device = 'GPU'
                        print('LI_DEVICE_USED', kind, [d.name for d in gpus])
                        break
                except Exception:
                    continue
        except Exception as e:
            print('LI_DEVICE_FALLBACK_CPU', e)
    return sc

def mesh_obj(name, verts, faces, smooth=True, col=None, collection=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(np.asarray(verts, float).tolist(), [], [tuple(int(i) for i in f) for f in faces])
    me.update()
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    if col is not None:
        ca = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='POINT')
        ca.data.foreach_set('color', np.asarray(col, np.float32).ravel())
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob

def set_color_attr(me, name, rgb):
    """extra per-vertex colour attribute (linear rgb, n x 3) next to the 'Col' one; read in shaders with an Attribute node."""
    rgb = np.asarray(rgb, np.float32).reshape(-1, 3)
    ca = me.color_attributes.new(name=name, type='FLOAT_COLOR', domain='POINT')
    ca.data.foreach_set('color', np.concatenate([rgb, np.ones((len(rgb), 1), np.float32)], 1).ravel())

def set_float_attr(me, name, arr):
    a = me.attributes.new(name, 'FLOAT', 'POINT')
    a.data.foreach_set('value', np.asarray(arr, np.float32).ravel())

def node(nt, kind, loc=(0, 0), **kw):
    n = nt.nodes.new(kind); n.location = loc
    for k, v in kw.items():
        setattr(n, k, v)
    return n

def link(nt, a, b):
    nt.links.new(a, b)

def ramp(nt, fac_sock, stops, loc=(0, 0)):
    r = node(nt, 'ShaderNodeValToRGB', loc)
    cr = r.color_ramp
    while len(cr.elements) > 1:
        cr.elements.remove(cr.elements[-1])
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = stops[0][1]
    for p, c in stops[1:]:
        e = cr.elements.new(p); e.color = c
    link(nt, fac_sock, r.inputs['Fac'])
    return r

def principled(nt, loc=(600, 0)):
    return node(nt, 'ShaderNodeBsdfPrincipled', loc)

def pin(bsdf, name, val):
    if name in bsdf.inputs:
        bsdf.inputs[name].default_value = val

# ---------------------------------------------------------------- rock shader (strata, cracks, lichen)
def _colour_in(nt, spec, loc):
    """a palette entry: an (r,g,b) tuple (linear), a ('attr', name) vertex/point attribute, or an existing colour socket."""
    if isinstance(spec, tuple) and len(spec) == 2 and spec[0] == 'attr':
        a = node(nt, 'ShaderNodeAttribute', loc, attribute_name=spec[1]); return a.outputs['Color']
    if isinstance(spec, (tuple, list)):
        r = node(nt, 'ShaderNodeRGB', loc); r.outputs[0].default_value = (*spec[:3], 1.0); return r.outputs[0]
    return spec

def rock_nodes(nt, pos_sock, normal_sock, seed=1, scale=1.0, loc=(-800, 0), palette=None, joint=None, bed_normal=None, columnar=False, wander=0.35, lichen=1.0, streaks=0.0):
    """returns (color_socket, height_socket): strata colour bands, dark cracks, lichen patches. pos in metres.
    Optional (the landform scene uses them; the defaults keep the original look exactly):
      palette=(fresh, weathered, lichen) : each a linear (r,g,b) tuple, ('attr', 'Name') or a colour socket. Bands alternate weathered<->fresh
                                           and the lichen colour comes from the table instead of the fixed brown/olive ramp;
      joint=('attr', 'Name') or float socket : bedding / foliation spacing in metres (band thickness; a coarser macro-banding rides on top);
      bed_normal=(x,y,z) : bands follow planes with this normal (dipping beds / foliation) instead of horizontal ones;
      columnar=True : crack cells are vertical prisms (basalt columns): the crack Voronoi is squashed along z;
      wander : how far (in units of scale metres) the bands wander, so beds and foliation are wavy rather than ruled lines (default 0.35 = original);
      lichen : > 1 spreads the lichen patches (1 = original); streaks : 0..1 dark vertical water-staining on steep faces (0 = none, as the original)."""
    x, y = loc
    off = node(nt, 'ShaderNodeVectorMath', (x, y), operation='ADD')
    link(nt, pos_sock, off.inputs[0]); off.inputs[1].default_value = (seed * 7.1, seed * 3.3, seed * 1.9)
    sep = node(nt, 'ShaderNodeSeparateXYZ', (x + 150, y)); link(nt, off.outputs[0], sep.inputs[0])
    # warp the position for wavy bands
    warp = node(nt, 'ShaderNodeTexNoise', (x + 150, y - 200), noise_dimensions='3D')
    warp.inputs['Scale'].default_value = 0.7 / scale; warp.inputs['Detail'].default_value = 3
    link(nt, off.outputs[0], warp.inputs['Vector'])
    zw = node(nt, 'ShaderNodeMath', (x + 300, y), operation='MULTIPLY_ADD')
    link(nt, warp.outputs['Fac'], zw.inputs[0]); zw.inputs[1].default_value = wander * scale
    if bed_normal is not None:
        bd = node(nt, 'ShaderNodeVectorMath', (x + 300, y + 150), operation='DOT_PRODUCT')
        link(nt, off.outputs[0], bd.inputs[0]); bd.inputs[1].default_value = tuple(bed_normal)
        link(nt, bd.outputs['Value'], zw.inputs[2])
    else:
        link(nt, sep.outputs['Z'], zw.inputs[2])
    band = node(nt, 'ShaderNodeMath', (x + 450, y), operation='MULTIPLY')
    link(nt, zw.outputs[0], band.inputs[0]); band.inputs[1].default_value = 3.1 / scale
    macro = None
    if joint is not None:
        jsock = _colour_in(nt, joint, (x + 300, y + 300)) if isinstance(joint, tuple) else joint
        jf = node(nt, 'ShaderNodeSeparateColor', (x + 380, y + 300)); link(nt, jsock, jf.inputs['Color'])
        jm = node(nt, 'ShaderNodeMath', (x + 450, y + 300), operation='MAXIMUM'); link(nt, jf.outputs['Red'], jm.inputs[0]); jm.inputs[1].default_value = 0.6
        ji = node(nt, 'ShaderNodeMath', (x + 520, y + 300), operation='DIVIDE'); ji.inputs[0].default_value = 1.0; link(nt, jm.outputs[0], ji.inputs[1])
        link(nt, ji.outputs[0], band.inputs[1])
        mb = node(nt, 'ShaderNodeMath', (x + 520, y + 450), operation='MULTIPLY'); link(nt, zw.outputs[0], mb.inputs[0]); link(nt, ji.outputs[0], mb.inputs[1])
        mb2 = node(nt, 'ShaderNodeMath', (x + 600, y + 450), operation='MULTIPLY'); link(nt, mb.outputs[0], mb2.inputs[0]); mb2.inputs[1].default_value = 0.17
        mfl = node(nt, 'ShaderNodeMath', (x + 680, y + 450), operation='FLOOR'); link(nt, mb2.outputs[0], mfl.inputs[0])
        msn = node(nt, 'ShaderNodeMath', (x + 760, y + 450), operation='SINE'); link(nt, mfl.outputs[0], msn.inputs[0])
        macro = node(nt, 'ShaderNodeMath', (x + 840, y + 450), operation='MULTIPLY_ADD'); link(nt, msn.outputs[0], macro.inputs[0]); macro.inputs[1].default_value = 0.16; macro.inputs[2].default_value = 1.0
    # layer index -> colour: hash each band with a fractional step
    fl = node(nt, 'ShaderNodeMath', (x + 600, y), operation='FLOOR'); link(nt, band.outputs[0], fl.inputs[0])
    rnd = node(nt, 'ShaderNodeMath', (x + 750, y), operation='SINE'); link(nt, fl.outputs[0], rnd.inputs[0])
    sh = node(nt, 'ShaderNodeMath', (x + 900, y), operation='MULTIPLY_ADD')
    link(nt, rnd.outputs[0], sh.inputs[0]); sh.inputs[1].default_value = 0.5; sh.inputs[2].default_value = 0.5
    if palette is None:
        layer = ramp(nt, sh.outputs[0], [
            (0.0, (0.17, 0.155, 0.14, 1)), (0.35, (0.27, 0.235, 0.20, 1)), (0.65, (0.36, 0.28, 0.21, 1)), (1.0, (0.24, 0.24, 0.235, 1))], (x + 1050, y))
        layer_col = layer.outputs['Color']
    else:
        pf, pw, pl = [_colour_in(nt, c, (x + 900, y + 650 - 120 * i)) for i, c in enumerate(palette)]
        shc = node(nt, 'ShaderNodeMath', (x + 980, y + 100), operation='MULTIPLY_ADD'); link(nt, sh.outputs[0], shc.inputs[0]); shc.inputs[1].default_value = 0.55; shc.inputs[2].default_value = 0.22   # softer fresh/weathered contrast
        lay = node(nt, 'ShaderNodeMix', (x + 1050, y + 100), data_type='RGBA'); link(nt, shc.outputs[0], S(lay, 'inputs', 'Factor'))
        link(nt, pw, S(lay, 'inputs', 'A')); link(nt, pf, S(lay, 'inputs', 'B'))
        layer_col = S(lay, 'outputs', 'Result')
        if macro is not None:
            mm = node(nt, 'ShaderNodeMix', (x + 1150, y + 250), data_type='RGBA', blend_type='MULTIPLY'); S(mm, 'inputs', 'Factor').default_value = 1.0
            link(nt, layer_col, S(mm, 'inputs', 'A'))
            mcol = node(nt, 'ShaderNodeCombineColor', (x + 1050, y + 400))
            for ch in ('Red', 'Green', 'Blue'): link(nt, macro.outputs[0], mcol.inputs[ch])
            link(nt, mcol.outputs['Color'], S(mm, 'inputs', 'B')); layer_col = S(mm, 'outputs', 'Result')
    # fine grain
    grain = node(nt, 'ShaderNodeTexNoise', (x + 900, y - 350), noise_dimensions='3D')
    grain.inputs['Scale'].default_value = 14 / scale; grain.inputs['Detail'].default_value = 8; grain.inputs['Roughness'].default_value = 0.65
    link(nt, off.outputs[0], grain.inputs['Vector'])
    gm = node(nt, 'ShaderNodeMix', (x + 1250, y), data_type='RGBA', blend_type='MULTIPLY')
    S(gm, 'inputs', 'Factor').default_value = 0.55
    link(nt, layer_col, S(gm, 'inputs', 'A'))
    gr = ramp(nt, grain.outputs['Fac'], [(0.3, (0.78, 0.78, 0.78, 1)), (0.7, (1.12, 1.1, 1.08, 1))], (x + 1100, y - 350))
    link(nt, gr.outputs['Color'], S(gm, 'inputs', 'B'))
    # cracks: distance-to-edge voronoi, two scales
    cpos = off.outputs[0]
    if columnar:
        sq = node(nt, 'ShaderNodeVectorMath', (x + 750, y - 750), operation='MULTIPLY'); link(nt, off.outputs[0], sq.inputs[0]); sq.inputs[1].default_value = (1.0, 1.0, 0.04)
        cpos = sq.outputs[0]
    v1 = node(nt, 'ShaderNodeTexVoronoi', (x + 900, y - 650), feature='DISTANCE_TO_EDGE', voronoi_dimensions='3D')
    v1.inputs['Scale'].default_value = 1.9 / scale; link(nt, cpos, v1.inputs['Vector'])
    v2 = node(nt, 'ShaderNodeTexVoronoi', (x + 900, y - 850), feature='DISTANCE_TO_EDGE', voronoi_dimensions='3D')
    v2.inputs['Scale'].default_value = 6.5 / scale; link(nt, cpos, v2.inputs['Vector'])
    c1raw = ramp(nt, v1.outputs['Distance'], [(0.0, (0, 0, 0, 1)), (0.03, (1, 1, 1, 1))], (x + 1100, y - 650))
    brk = node(nt, 'ShaderNodeTexNoise', (x + 900, y - 1500), noise_dimensions='3D'); brk.inputs['Scale'].default_value = 1.7 / scale; brk.inputs['Detail'].default_value = 3
    link(nt, off.outputs[0], brk.inputs['Vector'])
    brkr = ramp(nt, brk.outputs['Fac'], [(0.45, (1, 1, 1, 1)), (0.58, (0, 0, 0, 1))], (x + 1100, y - 1500))
    c1m = node(nt, 'ShaderNodeMix', (x + 1250, y - 700), data_type='RGBA'); link(nt, brkr.outputs['Color'], S(c1m, 'inputs', 'Factor'))
    link(nt, c1raw.outputs['Color'], S(c1m, 'inputs', 'A')); S(c1m, 'inputs', 'B').default_value = (1, 1, 1, 1)
    c1 = c1m
    c2 = ramp(nt, v2.outputs['Distance'], [(0.0, (0.62, 0.62, 0.62, 1)), (0.05, (1, 1, 1, 1))], (x + 1100, y - 850))
    cm = node(nt, 'ShaderNodeMix', (x + 1350, y - 700), data_type='RGBA', blend_type='MULTIPLY'); S(cm, 'inputs', 'Factor').default_value = 1.0
    link(nt, S(c1, 'outputs', 'Result'), S(cm, 'inputs', 'A')); link(nt, c2.outputs['Color'], S(cm, 'inputs', 'B'))
    rm = node(nt, 'ShaderNodeMix', (x + 1500, y), data_type='RGBA', blend_type='MULTIPLY'); S(rm, 'inputs', 'Factor').default_value = 1.0
    link(nt, S(gm, 'outputs', 'Result'), S(rm, 'inputs', 'A')); link(nt, S(cm, 'outputs', 'Result'), S(rm, 'inputs', 'B'))
    # lichen: patchy, favours up-facing surfaces
    ln = node(nt, 'ShaderNodeTexNoise', (x + 900, y - 1050), noise_dimensions='3D')
    ln.inputs['Scale'].default_value = 3.4 / scale; ln.inputs['Detail'].default_value = 6; ln.inputs['Roughness'].default_value = 0.7
    link(nt, off.outputs[0], ln.inputs['Vector'])
    nz = node(nt, 'ShaderNodeSeparateXYZ', (x + 900, y - 1250)); link(nt, normal_sock, nz.inputs[0])
    lm = node(nt, 'ShaderNodeMath', (x + 1100, y - 1100), operation='MULTIPLY_ADD')
    link(nt, nz.outputs['Z'], lm.inputs[0]); lm.inputs[1].default_value = 0.30; link(nt, ln.outputs['Fac'], lm.inputs[2])
    lmask = ramp(nt, lm.outputs[0], [(0.72 - 0.10 * (lichen - 1), (0, 0, 0, 1)), (0.80 - 0.06 * (lichen - 1), (1, 1, 1, 1))], (x + 1250, y - 1100))
    lcol_n = node(nt, 'ShaderNodeTexNoise', (x + 1100, y - 1300), noise_dimensions='3D'); lcol_n.inputs['Scale'].default_value = 22 / scale
    link(nt, off.outputs[0], lcol_n.inputs['Vector'])
    if palette is None:
        lcol = ramp(nt, lcol_n.outputs['Fac'], [(0.3, (0.40, 0.42, 0.10, 1)), (0.55, (0.52, 0.46, 0.13, 1)), (0.8, (0.58, 0.58, 0.42, 1))], (x + 1300, y - 1300))
        lichen_col = lcol.outputs['Color']
    else:
        lg = ramp(nt, lcol_n.outputs['Fac'], [(0.3, (0.55, 0.55, 0.5, 1)), (0.8, (1.25, 1.2, 1.1, 1))], (x + 1300, y - 1300))
        lmx = node(nt, 'ShaderNodeMix', (x + 1500, y - 1300), data_type='RGBA', blend_type='MULTIPLY'); S(lmx, 'inputs', 'Factor').default_value = 1.0
        link(nt, pl, S(lmx, 'inputs', 'A')); link(nt, lg.outputs['Color'], S(lmx, 'inputs', 'B')); lichen_col = S(lmx, 'outputs', 'Result')
    lx = node(nt, 'ShaderNodeMix', (x + 1700, y - 100), data_type='RGBA')
    link(nt, lmask.outputs['Color'], S(lx, 'inputs', 'Factor')); link(nt, S(rm, 'outputs', 'Result'), S(lx, 'inputs', 'A')); link(nt, lichen_col, S(lx, 'inputs', 'B'))
    # height for bump: strata ridges + grain - cracks
    hh = node(nt, 'ShaderNodeMath', (x + 1500, y - 400), operation='ADD')
    link(nt, grain.outputs['Fac'], hh.inputs[0]); link(nt, S(c1, 'outputs', 'Result'), hh.inputs[1])
    colour_out = S(lx, 'outputs', 'Result')
    if streaks > 0:
        # run-off staining: noise stretched along z, strongest where the surface is steep (normal z small)
        sq = node(nt, 'ShaderNodeVectorMath', (x + 1500, y - 1700), operation='MULTIPLY'); link(nt, off.outputs[0], sq.inputs[0]); sq.inputs[1].default_value = (1.0, 1.0, 0.10)
        sn = node(nt, 'ShaderNodeTexNoise', (x + 1650, y - 1700), noise_dimensions='3D'); sn.inputs['Scale'].default_value = 2.6 / scale; sn.inputs['Detail'].default_value = 4
        link(nt, sq.outputs[0], sn.inputs['Vector'])
        sm = ramp(nt, sn.outputs['Fac'], [(0.42, (0, 0, 0, 1)), (0.68, (1, 1, 1, 1))], (x + 1800, y - 1700))
        stp = ramp(nt, nz.outputs['Z'], [(0.35, (1, 1, 1, 1)), (0.85, (0, 0, 0, 1))], (x + 1800, y - 1900))
        sp = node(nt, 'ShaderNodeMath', (x + 1950, y - 1800), operation='MULTIPLY'); link(nt, sm.outputs['Color'], sp.inputs[0]); link(nt, stp.outputs['Color'], sp.inputs[1])
        sd = node(nt, 'ShaderNodeMath', (x + 2100, y - 1800), operation='MULTIPLY_ADD'); link(nt, sp.outputs[0], sd.inputs[0]); sd.inputs[1].default_value = -streaks; sd.inputs[2].default_value = 1.0
        sx2 = node(nt, 'ShaderNodeMix', (x + 2250, y - 1700), data_type='RGBA', blend_type='MULTIPLY'); S(sx2, 'inputs', 'Factor').default_value = 1.0
        link(nt, colour_out, S(sx2, 'inputs', 'A'))
        dc = node(nt, 'ShaderNodeCombineColor', (x + 2150, y - 1900))
        for ch in ('Red', 'Green', 'Blue'): link(nt, sd.outputs[0], dc.inputs[ch])
        link(nt, dc.outputs['Color'], S(sx2, 'inputs', 'B')); colour_out = S(sx2, 'outputs', 'Result')
    return colour_out, hh.outputs[0]

# ---------------------------------------------------------------- land
def land_vertex_data(u, v, f, seed):
    """per-vertex ground colour (linear rgb) + rock amount."""
    h = f['h']; rock = f['rock']
    rng = IC
    n1 = IC.fbm(u * .8, v * .8, seed + 21, 4)
    n2 = IC.fbm(u * .12, v * .12, seed + 23, 3)
    n3 = IC.fbm(u * 2.3, v * 2.3, seed + 25, 3)
    sand = np.array([0.50, 0.40, 0.26]); wet = np.array([0.20, 0.15, 0.10]); seabed = np.array([0.66, 0.60, 0.44]); deep = np.array([0.02, 0.05, 0.08])
    grass = np.array([0.075, 0.12, 0.030]); grass2 = np.array([0.14, 0.15, 0.045]); heather = np.array([0.15, 0.055, 0.10]); heather2 = np.array([0.10, 0.06, 0.07])
    # base: grass with patches of heather (higher, windier ground) and dry yellow tussock
    hz = np.clip(IC.smooth(.35, .7, n2 + (h - 1.2) * 0.08), 0, 1)[..., None]
    g = grass * (1 - n1[..., None]) + grass2 * n1[..., None]
    hv = heather * (1 - n3[..., None]) + heather2 * n3[..., None]
    c = g * (1 - hz) + hv * hz
    # sand strip near shore / camp flat
    sandw = IC.smooth(0.75, 0.25, h + (n3 - .5) * 0.25 + (n1 - .5) * 0.3)[..., None]
    dcamp = np.sqrt((u - IC.CAMP[0]) ** 2 + ((v - IC.CAMP[1]) * 1.3) ** 2)
    sandw = np.maximum(sandw, (IC.smooth(6.0, 2.6, dcamp + (n1 - .5) * 3.0) * 0.92)[..., None])
    c = c * (1 - sandw) + (sand * (0.75 + 0.5 * n3[..., None])) * sandw
    wetw = IC.smooth(0.22, -0.05, h + (n3 - .5) * 0.1)[..., None]
    c = c * (1 - wetw) + wet * wetw
    sb = IC.smooth(0.0, -3.5, h)[..., None]
    sub = seabed * (1 - sb) + deep * sb
    c = np.where((h < -0.05)[..., None], sub * (0.8 + 0.4 * n3[..., None]), c)
    return np.clip(c, 0, 1), rock

def make_land(seed, n=257, name='Land'):
    u, v, f = IC.grid(n, seed)
    h = f['h']
    verts = np.stack([u.ravel(), v.ravel(), h.ravel()], -1)
    idx = np.arange(n * n).reshape(n, n)
    a = idx[:-1, :-1].ravel(); b = idx[:-1, 1:].ravel(); c_ = idx[1:, 1:].ravel(); d = idx[1:, :-1].ravel()
    faces = np.stack([a, b, c_, d], -1)
    col, rock = land_vertex_data(u, v, f, seed)
    rgba = np.concatenate([col.reshape(-1, 3), np.ones((n * n, 1))], 1)
    ob = mesh_obj(name, verts, faces, True, rgba)
    # uv: planar top-down 0..1 (also used by the bake)
    uvl = ob.data.uv_layers.new(name='UVMap')
    loops = np.array([l.vertex_index for l in ob.data.loops])
    uvs = np.stack([(u.ravel()[loops] + IC.HALF) / (2 * IC.HALF), (v.ravel()[loops] + IC.HALF) / (2 * IC.HALF)], -1)
    uvl.data.foreach_set('uv', uvs.astype(np.float32).ravel())
    set_float_attr(ob.data, 'Rock', rock.ravel())
    return ob, (u, v, f)

def land_material(ob, seed, bake_colour_only=False, rock_kw=None, rock_attr='Rock', tide=None, loch_attr=None, rock_scale=1.0):
    """rock_kw: extra rock_nodes arguments (palette / joint / bed_normal / columnar); rock_attr: float attribute giving the rock amount;
    tide=(low, high) metres: darkens the wet intertidal band between the two levels; loch_attr: float attribute that makes the ground glossy."""
    m = bpy.data.materials.new('LandMat'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (1800, 0))
    geo = node(nt, 'ShaderNodeNewGeometry', (-1500, 0))
    vc = node(nt, 'ShaderNodeAttribute', (-1500, 300), attribute_name='Col')
    rk = node(nt, 'ShaderNodeAttribute', (-1500, 500), attribute_name=rock_attr)
    rcol, rhgt = rock_nodes(nt, geo.outputs['Position'], geo.outputs['Normal'], seed + 3, rock_scale, (-1400, -400), **(rock_kw or {}))
    # fine grass / ground texture
    gn = node(nt, 'ShaderNodeTexNoise', (-800, 600), noise_dimensions='3D'); gn.inputs['Scale'].default_value = 18; gn.inputs['Detail'].default_value = 8
    link(nt, geo.outputs['Position'], gn.inputs['Vector'])
    gn2 = node(nt, 'ShaderNodeTexNoise', (-800, 850), noise_dimensions='3D'); gn2.inputs['Scale'].default_value = 90; gn2.inputs['Detail'].default_value = 3
    link(nt, geo.outputs['Position'], gn2.inputs['Vector'])
    gm = node(nt, 'ShaderNodeMix', (-500, 450), data_type='RGBA', blend_type='MULTIPLY'); S(gm, 'inputs', 'Factor').default_value = 0.65
    link(nt, vc.outputs['Color'], S(gm, 'inputs', 'A'))
    gr = ramp(nt, gn.outputs['Fac'], [(0.25, (0.55, 0.55, 0.5, 1)), (0.75, (1.35, 1.3, 1.2, 1))], (-700, 450)); link(nt, gr.outputs['Color'], S(gm, 'inputs', 'B'))
    gm2 = node(nt, 'ShaderNodeMix', (-300, 450), data_type='RGBA', blend_type='MULTIPLY'); S(gm2, 'inputs', 'Factor').default_value = 0.4
    link(nt, S(gm, 'outputs', 'Result'), S(gm2, 'inputs', 'A'))
    gr2 = ramp(nt, gn2.outputs['Fac'], [(0.3, (0.7, 0.7, 0.7, 1)), (0.7, (1.25, 1.25, 1.25, 1))], (-500, 800)); link(nt, gr2.outputs['Color'], S(gm2, 'inputs', 'B'))
    # rock factor sharpened by noise
    rn = node(nt, 'ShaderNodeTexNoise', (-800, 150), noise_dimensions='3D'); rn.inputs['Scale'].default_value = 2.2; rn.inputs['Detail'].default_value = 5
    link(nt, geo.outputs['Position'], rn.inputs['Vector'])
    rk2 = node(nt, 'ShaderNodeMath', (-700, 250), operation='MULTIPLY'); link(nt, rk.outputs['Fac'], rk2.inputs[0]); rk2.inputs[1].default_value = 1.25
    rn2 = node(nt, 'ShaderNodeMath', (-700, 50), operation='MULTIPLY_ADD'); link(nt, rn.outputs['Fac'], rn2.inputs[0]); rn2.inputs[1].default_value = 0.5; rn2.inputs[2].default_value = -0.25
    rsum = node(nt, 'ShaderNodeMath', (-600, 150), operation='ADD'); link(nt, rk2.outputs[0], rsum.inputs[0]); link(nt, rn2.outputs[0], rsum.inputs[1])
    rr = ramp(nt, rsum.outputs[0], [(0.45, (0, 0, 0, 1)), (0.8, (1, 1, 1, 1))], (-400, 150))
    mix = node(nt, 'ShaderNodeMix', (0, 300), data_type='RGBA')
    link(nt, rr.outputs['Color'], S(mix, 'inputs', 'Factor'))
    # underwater and sand stay ground colour (rock only above -0.2)
    link(nt, S(gm2, 'outputs', 'Result'), S(mix, 'inputs', 'A')); link(nt, rcol, S(mix, 'inputs', 'B'))
    bsdf = principled(nt, (1300, 0))
    base_out = S(mix, 'outputs', 'Result')
    if tide is not None:
        # wet band: darker and a little saturated between low and high water (seaweed / wet rock / wet sand), blends to dry above
        sz = node(nt, 'ShaderNodeSeparateXYZ', (400, 700)); link(nt, geo.outputs['Position'], sz.inputs[0])
        tn = node(nt, 'ShaderNodeTexNoise', (400, 500), noise_dimensions='3D'); tn.inputs['Scale'].default_value = 0.35; tn.inputs['Detail'].default_value = 4
        link(nt, geo.outputs['Position'], tn.inputs['Vector'])
        tz = node(nt, 'ShaderNodeMath', (600, 700), operation='MULTIPLY_ADD'); link(nt, tn.outputs['Fac'], tz.inputs[0]); tz.inputs[1].default_value = 0.8; link(nt, sz.outputs['Z'], tz.inputs[2])
        wetm = ramp(nt, tz.outputs[0], [(tide[0] - 0.4, (1, 1, 1, 1)), (tide[1] + 0.2, (1, 1, 1, 1)), (tide[1] + 1.0, (0, 0, 0, 1))], (800, 700))
        wx = node(nt, 'ShaderNodeMix', (1000, 600), data_type='RGBA', blend_type='MULTIPLY'); link(nt, wetm.outputs['Color'], S(wx, 'inputs', 'Factor'))
        link(nt, base_out, S(wx, 'inputs', 'A')); S(wx, 'inputs', 'B').default_value = (0.42, 0.40, 0.34, 1)
        base_out = S(wx, 'outputs', 'Result')
    link(nt, base_out, bsdf.inputs['Base Color'])
    pin(bsdf, 'Roughness', 0.92)
    if loch_attr:
        la = node(nt, 'ShaderNodeAttribute', (1000, -600), attribute_name=loch_attr)
        lr = node(nt, 'ShaderNodeMath', (1150, -600), operation='MULTIPLY_ADD'); link(nt, la.outputs['Fac'], lr.inputs[0]); lr.inputs[1].default_value = -0.8; lr.inputs[2].default_value = 0.92
        link(nt, lr.outputs[0], bsdf.inputs['Roughness'])
    for nm in ('Specular IOR Level',):
        pin(bsdf, nm, 0.25)
    # bump: rock strata+cracks, ground micro
    bh = node(nt, 'ShaderNodeMath', (800, -300), operation='MULTIPLY_ADD')
    link(nt, rhgt, bh.inputs[0]); bh.inputs[1].default_value = 1.0; link(nt, gn.outputs['Fac'], bh.inputs[2])
    bmp = node(nt, 'ShaderNodeBump', (1100, -300)); bmp.inputs['Strength'].default_value = 0.28; bmp.inputs['Distance'].default_value = 0.12
    link(nt, bh.outputs[0], bmp.inputs['Height'])
    link(nt, bmp.outputs['Normal'], bsdf.inputs['Normal'])
    link(nt, bsdf.outputs['BSDF'], out.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(m)
    return m

# ---------------------------------------------------------------- vegetation
def _cone(rng, cx, cy, z0, h, r0, r1, seg=11, rings=2, jitter=0.18, droop=0.0):
    """ragged cone frustum as verts/faces (no cap) with per-vertex jitter."""
    verts = []; faces = []
    for ri in range(rings + 1):
        t = ri / rings
        r = r0 + (r1 - r0) * t
        for si in range(seg):
            a = 2 * math.pi * si / seg + rng.uniform(-.12, .12)
            rr = r * (1 + rng.uniform(-jitter, jitter)) * (1 if ri < rings else 1)
            verts.append((cx + rr * math.cos(a), cy + rr * math.sin(a), z0 + h * t - droop * (r / max(r0, 1e-6)) * (1 if ri == 0 else 0)))
    for ri in range(rings):
        for si in range(seg):
            a = ri * seg + si; b = ri * seg + (si + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    return verts, faces

def make_conifers(land_fields, seed, count=17, n_avoid=None, pts=None, size=(0.7, 1.35)):
    """pts=[(x, y, ground_z), ...] places trees where the caller decided (the landform scene picks suitable soil); otherwise the
    original island picks its own spots. size = (min, max) scale of the 3.9 m conifer."""
    rng = np.random.default_rng(seed + 400)
    given = pts is not None
    pts = list(pts) if given else []
    if not given:
        u, v, f = land_fields
    tries = 0
    while not given and len(pts) < count and tries < 6000:
        tries += 1
        x = rng.uniform(-15, 12); y = rng.uniform(-2, 13)
        h = IC.height_at(x, y, seed)[0, 0]
        d = IC.height_fields(np.array([[x]]), np.array([[y]]), seed)
        if h < 1.2 or h > 4.2 or d['rock'][0, 0] > 0.55:
            continue
        if math.hypot(x - IC.CAMP[0], (y - IC.CAMP[1]) * 1.3) < 7.5:
            continue
        if any(math.hypot(x - p[0], y - p[1]) < 2.6 for p in pts):
            continue
        pts.append((x, y, h))
    trunk_v = []; trunk_f = []; fol_v = []; fol_f = []
    for (x, y, h) in pts:
        s = rng.uniform(*size)
        H = 3.9 * s; z0 = h - 0.15
        # trunk
        tv, tf = _cone(rng, x, y, z0, H * 0.4, 0.20 * s, 0.10 * s, 7, 2, 0.1)
        base = len(trunk_v); trunk_v += tv; trunk_f += [tuple(i + base for i in q) for q in tf]
        tiers = 5
        for k in range(tiers):
            t = k / tiers
            zz = z0 + H * (0.22 + 0.72 * t)
            hh = H * 0.32 * (1.0 - 0.25 * t)
            r = 1.15 * s * (1 - t) ** 0.85 + 0.18
            tv, tf = _cone(rng, x + rng.uniform(-.08, .08), y + rng.uniform(-.08, .08), zz, hh, r, 0.03, 12, 2, 0.28, droop=0.0)
            # flare lower ring outward/down for a drooping skirt
            tv = [(a, b, c - (0.25 * s if i < 12 else 0)) for i, (a, b, c) in enumerate(tv)]
            base = len(fol_v); fol_v += tv; fol_f += [tuple(i + base for i in q) for q in tf]
    trunk = mesh_obj('TreeTrunks', trunk_v, trunk_f, True)
    fol = mesh_obj('TreeFoliage', fol_v, fol_f, True)
    mt = bpy.data.materials.new('Bark'); mt.use_nodes = True; b = mt.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.12, 0.075, 0.05, 1); b.inputs['Roughness'].default_value = 1
    trunk.data.materials.append(mt)
    mf = bpy.data.materials.new('Needles'); mf.use_nodes = True; nt = mf.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (800, 0)); bs = principled(nt, (500, 0))
    geo = node(nt, 'ShaderNodeNewGeometry', (-600, 0))
    nz = node(nt, 'ShaderNodeTexNoise', (-400, 0), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 9; nz.inputs['Detail'].default_value = 6
    link(nt, geo.outputs['Position'], nz.inputs['Vector'])
    cr = ramp(nt, nz.outputs['Fac'], [(0.3, (0.012, 0.045, 0.02, 1)), (0.6, (0.03, 0.085, 0.035, 1)), (0.85, (0.07, 0.12, 0.04, 1))], (-150, 0))
    link(nt, cr.outputs['Color'], bs.inputs['Base Color']); pin(bs, 'Roughness', 0.9)
    bm = node(nt, 'ShaderNodeBump', (150, -250)); bm.inputs['Strength'].default_value = 0.8; bm.inputs['Distance'].default_value = 0.05
    nz2 = node(nt, 'ShaderNodeTexNoise', (-150, -300), noise_dimensions='3D'); nz2.inputs['Scale'].default_value = 60; nz2.inputs['Detail'].default_value = 3
    link(nt, geo.outputs['Position'], nz2.inputs['Vector']); link(nt, nz2.outputs['Fac'], bm.inputs['Height']); link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    fol.data.materials.append(mf)
    return [trunk, fol], pts

def make_tufts(seed, count=5200, heather=520, sites=None, scale=1.0):
    """sites=(xs, ys, zs, heather_ok) places the tufts where the caller decided (landform scene: grass areas from the soil map);
    scale enlarges blades and clumps for a bigger scene. Without sites the original island picks its own spots."""
    rng = np.random.default_rng(seed + 500)
    verts = []; faces = []; cols = []
    if sites is None:
        xs = rng.uniform(-18, 18, count * 3); ys = rng.uniform(-16, 16, count * 3)
        F = IC.height_fields(xs.reshape(1, -1), ys.reshape(1, -1), seed)
        hs = F['h'][0]; rk = F['rock'][0]
        ok = np.where((hs > 0.35) & (rk < 0.45))[0]
        sel = []
        for i in ok:
            if math.hypot(xs[i] - IC.CAMP[0], (ys[i] - IC.CAMP[1]) * 1.3) < 3.2:
                continue
            sel.append(i)
            if len(sel) >= count:
                break
        heather_ok = None
    else:
        xs, ys, hs, heather_ok = sites
        sel = list(range(len(xs)))
    cnt = 0
    for i in sel:
        x, y, z = xs[i], ys[i], hs[i] - 0.03
        blades = rng.integers(4, 7)
        hgt = rng.uniform(0.18, 0.42) * scale
        shade = rng.uniform(0.7, 1.25)
        for b in range(blades):
            a = rng.uniform(0, 6.283); lean = rng.uniform(0.05, 0.28) * hgt; w = 0.022 * scale
            bx = x + rng.uniform(-.05, .05); by = y + rng.uniform(-.05, .05)
            base = len(verts)
            ca, sa = math.cos(a), math.sin(a)
            verts += [(bx - sa * w, by + ca * w, z), (bx + sa * w, by - ca * w, z),
                      (bx + ca * lean * 0.5, by + sa * lean * 0.5, z + hgt * .55 + 0.0), (bx + ca * lean, by + sa * lean, z + hgt)]
            faces += [(base, base + 1, base + 2), (base + 2, base + 1, base + 3)]
            cols += [shade] * 4
    # heather clumps: squashed blobs
    hv = []; hf = []
    cnt = 0
    hsel = [i for i in sel if heather_ok[i]] if heather_ok is not None else sel[::max(1, len(sel) // max(heather, 1))]
    for i in hsel[:heather]:
        x, y, z = xs[i], ys[i], hs[i]
        if hs[i] < 0.9 or (heather_ok is not None and not heather_ok[i]):
            continue
        r = rng.uniform(0.08, 0.18) * scale
        for k in range(5):
            ox, oy = rng.uniform(-r, r, 2); rr = r * rng.uniform(.5, 1)
            base = len(hv)
            for q in range(7):
                a = 6.283 * q / 7
                hv.append((x + ox + rr * math.cos(a), y + oy + rr * math.sin(a), z - 0.02))
            for q in range(7):
                a = 6.283 * q / 7 + .4
                hv.append((x + ox + rr * .55 * math.cos(a), y + oy + rr * .55 * math.sin(a), z + rr * rng.uniform(.9, 1.4)))
            hv.append((x + ox, y + oy, z + rr * 1.6))
            for q in range(7):
                qn = (q + 1) % 7
                hf.append((base + q, base + qn, base + 7 + qn, base + 7 + q))
                hf.append((base + 7 + q, base + 7 + qn, base + 14))
    ob = mesh_obj('Tufts', verts, faces, False)
    ob2 = mesh_obj('Heather', hv, hf, True)
    mg = bpy.data.materials.new('Grass'); mg.use_nodes = True; nt = mg.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (800, 0)); bs = principled(nt, (500, 0))
    geo = node(nt, 'ShaderNodeNewGeometry', (-600, 0))
    nz = node(nt, 'ShaderNodeTexNoise', (-400, 0), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 0.9; nz.inputs['Detail'].default_value = 2
    link(nt, geo.outputs['Position'], nz.inputs['Vector'])
    cr = ramp(nt, nz.outputs['Fac'], [(0.3, (0.07, 0.11, 0.025, 1)), (0.6, (0.18, 0.20, 0.06, 1)), (0.85, (0.30, 0.27, 0.10, 1))], (-150, 0))
    link(nt, cr.outputs['Color'], bs.inputs['Base Color']); pin(bs, 'Roughness', 0.8)
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    ob.data.materials.append(mg)
    mh = bpy.data.materials.new('HeatherMat'); mh.use_nodes = True; nt = mh.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (800, 0)); bs = principled(nt, (500, 0))
    geo = node(nt, 'ShaderNodeNewGeometry', (-600, 0))
    nz = node(nt, 'ShaderNodeTexNoise', (-400, 0), noise_dimensions='3D'); nz.inputs['Scale'].default_value = 40; nz.inputs['Detail'].default_value = 5
    link(nt, geo.outputs['Position'], nz.inputs['Vector'])
    cr = ramp(nt, nz.outputs['Fac'], [(0.25, (0.05, 0.028, 0.035, 1)), (0.6, (0.10, 0.055, 0.07, 1)), (0.9, (0.10, 0.08, 0.05, 1))], (-150, 0))
    link(nt, cr.outputs['Color'], bs.inputs['Base Color']); pin(bs, 'Roughness', 0.85)
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    ob2.data.materials.append(mh)
    return [ob, ob2]

# ---------------------------------------------------------------- boulders (use rock_lib for shape)
def rock_material(name='RockMat', seed=5, scale=1.0, coords='world', **rock_kw):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (2400, 0))
    geo = node(nt, 'ShaderNodeNewGeometry', (-1500, 0))
    if coords == 'object':
        tc = node(nt, 'ShaderNodeTexCoord', (-1500, -200)); pos = tc.outputs['Object']
    else:
        pos = geo.outputs['Position']
    col, hgt = rock_nodes(nt, pos, geo.outputs['Normal'], seed, scale, (-1300, -300), **rock_kw)
    bs = principled(nt, (2000, 0)); link(nt, col, bs.inputs['Base Color']); pin(bs, 'Roughness', 0.88); pin(bs, 'Specular IOR Level', 0.3)
    bm = node(nt, 'ShaderNodeBump', (1800, -300)); bm.inputs['Strength'].default_value = 0.7; bm.inputs['Distance'].default_value = 0.1 * scale
    link(nt, hgt, bm.inputs['Height']); link(nt, bm.outputs['Normal'], bs.inputs['Normal'])
    link(nt, bs.outputs['BSDF'], out.inputs['Surface'])
    return m

def boulder(seed, size, loc, rot=0.0, res=4):
    rng = np.random.default_rng(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=res, radius=1.0)
    ob = bpy.context.object
    me = ob.data
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    s = np.array([rng.uniform(.9, 1.5), rng.uniform(.7, 1.2), rng.uniform(.45, .8)])
    n = IC.fbm(co[:, 0] * 1.3 + seed, co[:, 1] * 1.3, seed, 4, 2.2, .55)
    n2 = IC.ridged(co[:, 1] * 1.8 + co[:, 2], co[:, 0] * 1.8 - seed, seed + 4, 3)
    co = co * (0.78 + 0.5 * n[:, None] + 0.12 * n2[:, None]) * s
    # flat bottom, angular facets via terrace on z
    st = 0.22
    co[:, 2] = np.where(co[:, 2] > -0.1, (np.floor(co[:, 2] / st) + IC.smooth(0, .4, co[:, 2] / st - np.floor(co[:, 2] / st))) * st * 0.5 + co[:, 2] * 0.5, -0.1)
    co *= size
    me.vertices.foreach_set('co', co.ravel()); me.update()
    for p in me.polygons:
        p.use_smooth = True
    ob.location = loc; ob.rotation_euler = (0, 0, rot)
    return ob

# ---------------------------------------------------------------- sea
def depth_image_from_grid(h2d, name='SeaDepth', exposure2d=None):
    """float image of water depth (R,G,B = metres below sea level, -1 on land, clipped to 8 m; row 0 = south). Used by the sea
    material for foam. If exposure2d is given, the G channel carries wave exposure (0..1) instead of the depth."""
    h2d = np.asarray(h2d, float); ny, nx = h2d.shape
    d = np.clip(-h2d, -1, 8)
    img = bpy.data.images.new(name, nx, ny, alpha=False, float_buffer=True, is_data=True)
    px = np.zeros((ny, nx, 4), np.float32); px[..., 0] = d; px[..., 1] = d if exposure2d is None else exposure2d; px[..., 2] = d; px[..., 3] = 1
    img.pixels.foreach_set(px.ravel())
    return img

def make_foam_depth_image(land_fields, name='SeaDepth', n=512, seed=1122):
    xs = np.linspace(-IC.HALF, IC.HALF, n)
    u, v = np.meshgrid(xs, xs)
    return depth_image_from_grid(IC.height_fields(u, v, seed)['h'], name)

def make_sea(seed, depth_img, size=1800.0, floor=-7.0, half=None, centre=(0.0, 0.0), density=0.7, foam_scale=5.5, wave_scale=1.0, exposure_foam=False, scatter=0.0):
    """half/centre: the square (centre +- half, metres) that the depth image covers (default: the original island's +-IC.HALF);
    density: absorption per metre (depth tint); foam_scale / wave_scale multiply the foam-noise and wave-bump frequencies
    (smaller for big scenes seen from far away); scatter: density of a blue-green in-scattering volume (0 = pure absorption, as the original); exposure_foam: the image G channel is wave exposure, which widens the foam on exposed shores."""
    half = IC.HALF if half is None else half
    # closed water box (top at z=0) so volume absorption makes depth colour; seabed/land poke through it.
    top = 0.0
    hs = size / 2
    verts = [(-hs, -hs, floor), (hs, -hs, floor), (hs, hs, floor), (-hs, hs, floor), (-hs, -hs, top), (hs, -hs, top), (hs, hs, top), (-hs, hs, top)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    # subdivide top for nothing: shading uses bump only
    ob = mesh_obj('Sea', verts, faces, False)
    ob.visible_shadow = False
    m = bpy.data.materials.new('SeaMat'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', (1800, 0))
    tc = node(nt, 'ShaderNodeTexCoord', (-1800, 0))
    # waves: layered noise bump in world xy, stretched along the swell
    mp = node(nt, 'ShaderNodeMapping', (-1500, 100)); mp.inputs['Scale'].default_value = (1, 1, 1)
    link(nt, tc.outputs['Object'], mp.inputs['Vector'])
    n1 = node(nt, 'ShaderNodeTexNoise', (-1200, 300), noise_dimensions='3D'); n1.inputs['Scale'].default_value = 0.35 * wave_scale; n1.inputs['Detail'].default_value = 4; n1.inputs['Roughness'].default_value = 0.55
    n2 = node(nt, 'ShaderNodeTexNoise', (-1200, 0), noise_dimensions='3D'); n2.inputs['Scale'].default_value = 2.2 * wave_scale; n2.inputs['Detail'].default_value = 6; n2.inputs['Roughness'].default_value = 0.6
    n3 = node(nt, 'ShaderNodeTexNoise', (-1200, -300), noise_dimensions='3D'); n3.inputs['Scale'].default_value = 11 * wave_scale; n3.inputs['Detail'].default_value = 3
    for n_ in (n1, n2, n3):
        link(nt, mp.outputs['Vector'], n_.inputs['Vector'])
    # animate-free: w input fixed
    s1 = node(nt, 'ShaderNodeMath', (-900, 250), operation='MULTIPLY'); link(nt, n1.outputs['Fac'], s1.inputs[0]); s1.inputs[1].default_value = 1.0
    s2 = node(nt, 'ShaderNodeMath', (-900, 50), operation='MULTIPLY_ADD'); link(nt, n2.outputs['Fac'], s2.inputs[0]); s2.inputs[1].default_value = 0.32; link(nt, s1.outputs[0], s2.inputs[2])
    s3 = node(nt, 'ShaderNodeMath', (-900, -150), operation='MULTIPLY_ADD'); link(nt, n3.outputs['Fac'], s3.inputs[0]); s3.inputs[1].default_value = 0.08; link(nt, s2.outputs[0], s3.inputs[2])
    bm = node(nt, 'ShaderNodeBump', (-600, 0)); bm.inputs['Strength'].default_value = 0.9; bm.inputs['Distance'].default_value = 0.9
    link(nt, s3.outputs[0], bm.inputs['Height'])
    # foam mask from depth image
    sep = node(nt, 'ShaderNodeSeparateXYZ', (-1500, -400)); link(nt, tc.outputs['Object'], sep.inputs[0])
    ux = node(nt, 'ShaderNodeMath', (-1300, -450), operation='MULTIPLY_ADD'); link(nt, sep.outputs['X'], ux.inputs[0]); ux.inputs[1].default_value = 1 / (2 * half); ux.inputs[2].default_value = 0.5 - centre[0] / (2 * half)
    uy = node(nt, 'ShaderNodeMath', (-1300, -600), operation='MULTIPLY_ADD'); link(nt, sep.outputs['Y'], uy.inputs[0]); uy.inputs[1].default_value = 1 / (2 * half); uy.inputs[2].default_value = 0.5 - centre[1] / (2 * half)
    comb = node(nt, 'ShaderNodeCombineXYZ', (-1100, -500)); link(nt, ux.outputs[0], comb.inputs['X']); link(nt, uy.outputs[0], comb.inputs['Y'])
    it = node(nt, 'ShaderNodeTexImage', (-900, -500)); it.image = depth_img; it.interpolation = 'Linear'; it.extension = 'EXTEND'
    link(nt, comb.outputs[0], it.inputs['Vector'])
    sepd = node(nt, 'ShaderNodeSeparateColor', (-650, -500)); link(nt, it.outputs['Color'], sepd.inputs['Color'])
    # depth d (m below sea level). foam where d small, broken by noise, plus a few wave-lines further out
    fn = node(nt, 'ShaderNodeTexNoise', (-900, -800), noise_dimensions='3D'); fn.inputs['Scale'].default_value = foam_scale; fn.inputs['Detail'].default_value = 7
    link(nt, mp.outputs['Vector'], fn.inputs['Vector'])
    add = node(nt, 'ShaderNodeMath', (-450, -600), operation='ADD'); link(nt, sepd.outputs['Red'], add.inputs[0])
    sc = node(nt, 'ShaderNodeMath', (-600, -800), operation='MULTIPLY_ADD'); link(nt, fn.outputs['Fac'], sc.inputs[0]); sc.inputs[1].default_value = -0.75; sc.inputs[2].default_value = 0.45
    link(nt, sc.outputs[0], add.inputs[1])
    foam = ramp(nt, add.outputs[0], [(0.0, (1, 1, 1, 1)), (0.13, (0.75, 0.75, 0.75, 1)), (0.30, (0, 0, 0, 1))], (-250, -600))
    # second foam band (surf line) further offshore, patchy
    add2 = node(nt, 'ShaderNodeMath', (-450, -900), operation='ADD'); link(nt, sepd.outputs['Red'], add2.inputs[0])
    sc2 = node(nt, 'ShaderNodeMath', (-600, -1000), operation='MULTIPLY_ADD'); link(nt, fn.outputs['Fac'], sc2.inputs[0]); sc2.inputs[1].default_value = -1.6; sc2.inputs[2].default_value = 0.7
    link(nt, sc2.outputs[0], add2.inputs[1])
    foam2 = ramp(nt, add2.outputs[0], [(0.38, (0, 0, 0, 1)), (0.5, (0.55, 0.55, 0.55, 1)), (0.62, (0, 0, 0, 1))], (-250, -900))
    fsum = node(nt, 'ShaderNodeMath', (50, -700), operation='ADD'); link(nt, foam.outputs['Color'], fsum.inputs[0]); link(nt, foam2.outputs['Color'], fsum.inputs[1])
    fclamp = node(nt, 'ShaderNodeMath', (200, -700), operation='MINIMUM'); link(nt, fsum.outputs[0], fclamp.inputs[0]); fclamp.inputs[1].default_value = 1.0
    if exposure_foam:
        # sheltered water gets a thin foam line, exposed shores (G = exposure) a broad surf zone
        ef = node(nt, 'ShaderNodeMath', (-450, -300), operation='MULTIPLY_ADD'); link(nt, sepd.outputs['Green'], ef.inputs[0]); ef.inputs[1].default_value = 1.6; ef.inputs[2].default_value = 0.35
        em = node(nt, 'ShaderNodeMath', (350, -700), operation='MULTIPLY'); link(nt, fclamp.outputs[0], em.inputs[0]); link(nt, ef.outputs[0], em.inputs[1])
        fclamp = node(nt, 'ShaderNodeMath', (500, -700), operation='MINIMUM'); link(nt, em.outputs[0], fclamp.inputs[0]); fclamp.inputs[1].default_value = 1.0
    # water surface: glass-ish, slight roughness
    # no refraction (it darkens the lit seabed in Cycles): transparent + fresnel-weighted mirror, bump-lit
    gl = node(nt, 'ShaderNodeBsdfGlossy', (300, 300)); gl.inputs['Roughness'].default_value = 0.04
    gl.inputs['Color'].default_value = (1, 1, 1, 1)
    link(nt, bm.outputs['Normal'], gl.inputs['Normal'])
    fr = node(nt, 'ShaderNodeFresnel', (300, 500)); fr.inputs['IOR'].default_value = 1.333; link(nt, bm.outputs['Normal'], fr.inputs['Normal'])
    tp = node(nt, 'ShaderNodeBsdfTransparent', (300, 150))
    wmix = node(nt, 'ShaderNodeMixShader', (550, 300)); link(nt, fr.outputs['Fac'], wmix.inputs['Fac']); link(nt, tp.outputs[0], wmix.inputs[1]); link(nt, gl.outputs[0], wmix.inputs[2])
    fo = principled(nt, (300, -100)); fo.inputs['Base Color'].default_value = (0.9, 0.93, 0.92, 1); fo.inputs['Roughness'].default_value = 0.9
    link(nt, bm.outputs['Normal'], fo.inputs['Normal'])
    mix = node(nt, 'ShaderNodeMixShader', (900, 100)); link(nt, fclamp.outputs[0], mix.inputs['Fac']); link(nt, wmix.outputs[0], mix.inputs[1]); link(nt, fo.outputs['BSDF'], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs['Surface'])
    # volume: depth-tinted absorption (red dies first -> turquoise shallows, deep blue) + a touch of scatter
    ab = node(nt, 'ShaderNodeVolumeAbsorption', (900, -400)); ab.inputs['Color'].default_value = (0.30, 0.82, 0.92, 1); ab.inputs['Density'].default_value = density
    if scatter > 0:
        sv = node(nt, 'ShaderNodeVolumeScatter', (900, -550)); sv.inputs['Color'].default_value = (0.10, 0.42, 0.55, 1); sv.inputs['Density'].default_value = scatter
        av = node(nt, 'ShaderNodeAddShader', (1150, -450)); link(nt, ab.outputs['Volume'], av.inputs[0]); link(nt, sv.outputs['Volume'], av.inputs[1])
        link(nt, av.outputs[0], out.inputs['Volume'])
    else:
        link(nt, ab.outputs['Volume'], out.inputs['Volume'])
    fm = bpy.data.materials.new('SeaFloor'); fm.use_nodes = True; b = fm.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.004, 0.03, 0.06, 1); b.inputs['Roughness'].default_value = 1.0
    ob.data.materials.append(m); ob.data.materials.append(fm)
    for p in ob.data.polygons:
        p.material_index = 0 if p.index == 1 else 1
    return ob

# ---------------------------------------------------------------- sky and light
def make_sky(sun_elev_deg=13.0, sun_az_deg=250.0, strength=1.0):
    w = bpy.data.worlds.new('Sky'); bpy.context.scene.world = w
    w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputWorld', (400, 0)); bg = node(nt, 'ShaderNodeBackground', (200, 0)); sk = node(nt, 'ShaderNodeTexSky', (-100, 0))
    sk.sky_type = 'MULTIPLE_SCATTERING' if 'MULTIPLE_SCATTERING' in [i.identifier for i in sk.bl_rna.properties['sky_type'].enum_items] else 'NISHITA'; sk.sun_disc = False; sk.sun_size = math.radians(1.2); sk.sun_intensity = 1.0
    sk.sun_elevation = math.radians(sun_elev_deg); sk.sun_rotation = math.radians(sun_az_deg)
    sk.air_density = 2.3; setattr(sk, 'aerosol_density' if hasattr(sk, 'aerosol_density') else 'dust_density', 0.35); sk.ozone_density = 2.5; sk.altitude = 20.0
    # glossy rays (the sea's mirror) see a bluer, cleaner sky than the sunset-pink camera sky: keeps the water deep blue
    lp = node(nt, 'ShaderNodeLightPath', (-400, 200)); tcg = node(nt, 'ShaderNodeTexCoord', (-700, -200))
    sp = node(nt, 'ShaderNodeSeparateXYZ', (-500, -200)); link(nt, tcg.outputs['Generated'], sp.inputs[0])
    vz = node(nt, 'ShaderNodeVectorMath', (-600, -400), operation='NORMALIZE'); 
    gc = node(nt, 'ShaderNodeNewGeometry', (-800, -400))
    sz = node(nt, 'ShaderNodeSeparateXYZ', (-450, -400)); link(nt, gc.outputs['Incoming'], vz.inputs[0]); link(nt, vz.outputs[0], sz.inputs[0])
    neg = node(nt, 'ShaderNodeMath', (-300, -400), operation='MULTIPLY'); link(nt, sz.outputs['Z'], neg.inputs[0]); neg.inputs[1].default_value = -1.0
    blue = ramp(nt, neg.outputs[0], [(0.0, (2.2, 2.8, 3.4, 1)), (0.25, (0.8, 1.6, 3.2, 1)), (1.0, (0.2, 0.6, 2.4, 1))], (-100, -400))
    mix = node(nt, 'ShaderNodeMix', (100, 100), data_type='RGBA'); link(nt, lp.outputs['Is Glossy Ray'], S(mix, 'inputs', 'Factor'))
    link(nt, sk.outputs['Color'], S(mix, 'inputs', 'A')); link(nt, blue.outputs['Color'], S(mix, 'inputs', 'B'))
    link(nt, S(mix, 'outputs', 'Result'), bg.inputs['Color']); bg.inputs['Strength'].default_value = strength
    link(nt, bg.outputs['Background'], out.inputs['Surface'])
    return sk

def render_settings(sc, w, h, samples, denoise=True, exposure=0.0, look='AgX - Punchy'):
    sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = denoise
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 10; sc.cycles.transmission_bounces = 8; sc.cycles.volume_bounces = 0; sc.cycles.transparent_max_bounces = 8
    sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 4
    sc.cycles.sample_clamp_indirect = 8.0; sc.cycles.sample_clamp_direct = 0
    sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    sc.render.threads_mode = 'AUTO'
    try:
        sc.view_settings.view_transform = 'AgX'
        try:
            sc.view_settings.look = look
        except Exception:
            pass
    except TypeError:
        # Blender before 4.0 has no AgX: use Filmic so the same script runs on 3.x (colours differ a little)
        sc.view_settings.view_transform = 'Filmic'
        try:
            sc.view_settings.look = 'Medium High Contrast'
        except Exception:
            pass
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    sc.render.image_settings.compression = 15
