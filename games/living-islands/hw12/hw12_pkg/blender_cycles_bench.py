"""HW-12 Cycles benchmark scenes, built headless with no files. Run one scene per Blender process:
  blender -b -P blender_cycles_bench.py -- --scene NAME --out DIR [--device GPU --gpu-name Radeon] [--smoke] [--samples 128]
Scenes: tri_1M tri_5M tri_20M (4 unique ico-sphere meshes, 1.3M / 5.2M / 21M triangles), tex_4K_x4 tex_4K_x16 tex_8K_x4 tex_8K_x16
(procedural image textures made in memory), glass_volume, and growth (use --nsph N --k K: N spheres of subdivision K, small render).
Renders at 1920x1080 and 3840x2160, 128 samples (--res to change). Picks ONLY the AMD GPU in Cycles (never the CPU; exits 4 if it is not
found unless --device CPU is asked for in a test). Writes DIR/<scene>.json and tiny PNG thumbnails. Exit 0 ok, 1 failed, 4 GPU not found.
Written for Blender 3.6 (Metal) and checked on a newer Blender with CPU Cycles; only long-standing API is used."""
import json
import os
import sys
import time
import traceback

import bpy
import numpy as np
from mathutils import Vector

sys.dont_write_bytecode = True

SCENES = ['tri_1M', 'tri_5M', 'tri_20M', 'tex_4K_x4', 'tex_4K_x16', 'tex_8K_x4', 'tex_8K_x16', 'glass_volume', 'growth']
# (spheres, ico subdivisions): faces = 20 * 4^(k-1) per sphere
TRI_PLAN = {'tri_1M': (4, 8), 'tri_5M': (4, 9), 'tri_20M': (4, 10)}
TRI_SMOKE = {'tri_1M': (4, 3), 'tri_5M': (4, 4), 'tri_20M': (4, 5)}


def parse_args(argv):
    a = {'scene': None, 'out': None, 'device': 'GPU', 'gpu_name': 'Radeon', 'smoke': False, 'samples': 128,
         'res': '1920x1080,3840x2160', 'nsph': 4, 'k': 10, 'max_mtris': 1000.0}
    i = 0
    while i < len(argv):
        t = argv[i]
        if t == '--smoke':
            a['smoke'] = True
            i += 1
            continue
        key = t.lstrip('-').replace('-', '_')
        if key in a and i + 1 < len(argv):
            v = argv[i + 1]
            a[key] = type(a[key])(v) if not isinstance(a[key], str) and a[key] is not None else v
            i += 2
        else:
            raise SystemExit('unknown argument %s' % t)
    if not a['scene'] or not a['out']:
        raise SystemExit('need --scene and --out')
    return a


# ---------------------------------------------------------------- device
def configure_device(scene, want, name):
    """Select only the matching GPU in Cycles preferences. Returns (kind, [device names]). Raises SystemExit(4) if none matches (no CPU fallback)."""
    if want == 'CPU':
        scene.cycles.device = 'CPU'
        print('HW12_DEVICE_USED CPU (test run, not the Radeon)')
        return 'CPU', ['CPU']
    prefs = bpy.context.preferences.addons['cycles'].preferences
    seen = []
    for kind in ('METAL', 'HIP', 'OPTIX', 'CUDA', 'ONEAPI'):
        try:
            prefs.compute_device_type = kind
        except Exception:
            continue
        try:
            prefs.get_devices()
        except Exception:
            try:
                prefs.refresh_devices()
            except Exception:
                pass
        for d in prefs.devices:
            seen.append((kind, d.name, d.type))
            print('HW12_DEVICE_LIST', kind, '|', d.name, '|', d.type)
        chosen = [d for d in prefs.devices if d.type != 'CPU' and name.lower() in d.name.lower()]
        if chosen:
            for d in prefs.devices:
                d.use = d in chosen
            scene.cycles.device = 'GPU'
            names = [d.name for d in chosen]
            print('HW12_DEVICE_USED', kind, names)
            return kind, names
    print('HW12_DEVICE_NOT_FOUND wanted a GPU whose name contains %r; seen %s' % (name, seen))
    raise SystemExit(4)


# ---------------------------------------------------------------- scene building
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def add_camera(scene, loc, target):
    cam = bpy.data.cameras.new('cam')
    cam.lens = 35
    cam.clip_end = 500.0
    obj = bpy.data.objects.new('cam', cam)
    scene.collection.objects.link(obj)
    obj.location = Vector(loc)
    obj.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = obj
    return obj


def add_sun(scene, energy=3.0, rot=(0.9, 0.2, 0.6)):
    d = bpy.data.lights.new('sun', 'SUN')
    d.energy = energy
    obj = bpy.data.objects.new('sun', d)
    obj.rotation_euler = rot
    scene.collection.objects.link(obj)


def set_world(scene, color=(0.55, 0.65, 0.8), strength=0.9):
    w = bpy.data.worlds.new('world')
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (color[0], color[1], color[2], 1.0)
    bg.inputs['Strength'].default_value = strength
    scene.world = w


def principled(name, color, rough=0.4, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (color[0], color[1], color[2], 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    for k, v in extra.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    return m


def add_plane(scene, size, mat, z=0.0):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    o = bpy.context.active_object
    o.data.materials.append(mat)
    return o


def build_spheres(scene, nsph, k, radius=1.6):
    """nsph unique ico-sphere meshes (own mesh data each) on a grid; returns total triangle count."""
    cols = max(1, int(np.ceil(np.sqrt(nsph))))
    mat = principled('sphere_mat', (0.8, 0.45, 0.25), 0.35)
    tris = 0
    for i in range(nsph):
        gx, gy = i % cols, i // cols
        loc = ((gx - (cols - 1) / 2.0) * radius * 2.4, (gy - (cols - 1) / 2.0) * radius * 2.4, radius)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=k, radius=radius, location=loc)
        o = bpy.context.active_object
        o.data.materials.append(mat)
        bpy.ops.object.shade_smooth()
        tris += len(o.data.polygons)
    return tris


def too_big(nsph, k, args):
    """Skip text if building nsph spheres of subdivision k would exceed the triangle safety limit (checked BEFORE building anything)."""
    est = nsph * 20 * 4 ** (k - 1)
    if est / 1e6 > args['max_mtris']:
        return {'skip': 'scene would have %.1f M triangles, above the safety limit %.1f M for this machine\'s memory' % (est / 1e6, args['max_mtris']),
                'triangles': est, 'spheres': nsph, 'subdivisions': k}
    return None


def scene_tri(scene, name, smoke, args):
    nsph, k = (TRI_SMOKE if smoke else TRI_PLAN)[name]
    skip = too_big(nsph, k, args)
    if skip:
        return skip
    cols = max(1, int(np.ceil(np.sqrt(nsph))))
    span = cols * 1.6 * 2.4
    add_plane(scene, span * 4, principled('ground', (0.35, 0.4, 0.3), 0.8))
    tris = build_spheres(scene, nsph, k)
    add_camera(scene, (0, -span * 1.6, span * 0.9), (0, 0, 1.0))
    add_sun(scene)
    set_world(scene)
    return {'triangles': tris, 'spheres': nsph, 'subdivisions': k}


def scene_growth(scene, smoke, args):
    nsph, k = (2, 4) if smoke else (args['nsph'], args['k'])
    skip = too_big(nsph, k, args)
    if skip:
        return skip
    cols = max(1, int(np.ceil(np.sqrt(nsph))))
    span = cols * 1.6 * 2.4
    add_plane(scene, span * 4, principled('ground', (0.35, 0.4, 0.3), 0.8))
    tris = build_spheres(scene, nsph, k)
    add_camera(scene, (0, -span * 1.6, span * 0.9), (0, 0, 1.0))
    add_sun(scene)
    set_world(scene)
    return {'triangles': tris, 'spheres': nsph, 'subdivisions': k}


def make_texture_pixels(size):
    """RGBA float32 pattern, size x size, made without any file: stripes and rings so a sampling error would show."""
    u = np.linspace(0.0, 1.0, size, dtype=np.float32)
    a = np.sin(u * 40.0).astype(np.float32) * 0.5 + 0.5
    b = np.cos(u * 25.0).astype(np.float32) * 0.5 + 0.5
    arr = np.empty((size, size, 4), dtype=np.float32)
    arr[..., 0] = a[None, :]
    arr[..., 1] = b[:, None]
    arr[..., 2] = (a[None, :] * b[:, None])
    arr[..., 3] = 1.0
    return arr


def ram_bytes():
    try:
        return os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES')
    except Exception:
        return 0


def scene_tex(scene, name, smoke, args):
    parts = name.split('_')              # tex_4K_x16
    size = {'4K': 4096, '8K': 8192}[parts[1]]
    count = int(parts[2][1:])
    if smoke:
        size = 128 if size == 4096 else 256
    # host memory need: the float32 pattern (16 bytes a pixel) plus, for every image, Blender's copy and Cycles' copy (4 bytes each)
    need = size * size * 16 + count * size * size * 8
    ram = ram_bytes()
    if ram and need > 0.6 * ram:
        return {'skip': 'textures need about %.1f GB of host memory, more than 60 percent of this Mac\'s %.1f GB' % (need / 2 ** 30, ram / 2 ** 30),
                'texture_size': size, 'texture_count': count}
    arr = make_texture_pixels(size).ravel()
    mat = bpy.data.materials.new('tex_mat')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfDiffuse')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    acc = None
    t0 = time.perf_counter()
    for i in range(count):
        img = bpy.data.images.new('hw12_tex_%d' % i, size, size, alpha=False, float_buffer=False)
        img.pixels.foreach_set(arr)
        img.update()
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1.0 + 0.37 * i, 1.0 + 0.23 * i, 1.0)
        mp.inputs['Location'].default_value = (0.11 * i, 0.07 * i, 0.0)
        it = nt.nodes.new('ShaderNodeTexImage')
        it.image = img
        it.interpolation = 'Linear'
        it.extension = 'REPEAT'
        nt.links.new(tc.outputs['UV'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], it.inputs['Vector'])
        if acc is None:
            acc = it.outputs['Color']
        else:
            vm = nt.nodes.new('ShaderNodeVectorMath')
            vm.operation = 'ADD'
            nt.links.new(acc, vm.inputs[0])
            nt.links.new(it.outputs['Color'], vm.inputs[1])
            acc = vm.outputs['Vector']
    sc = nt.nodes.new('ShaderNodeVectorMath')
    sc.operation = 'SCALE'
    nt.links.new(acc, sc.inputs[0])
    sc.inputs['Scale'].default_value = 1.0 / count
    nt.links.new(sc.outputs['Vector'], bsdf.inputs['Color'])
    prep = time.perf_counter() - t0
    bpy.ops.mesh.primitive_plane_add(size=16, location=(0, 0, 0))
    o = bpy.context.active_object
    o.data.materials.append(mat)
    add_camera(scene, (0, -6.0, 9.0), (0, 0, 0))
    add_sun(scene, 3.0)
    set_world(scene)
    return {'texture_size': size, 'texture_count': count, 'texture_mb_8bit': round(size * size * 4 * count / 2 ** 20, 1), 'texture_prep_seconds': round(prep, 2)}


def scene_glass(scene, smoke, args):
    add_plane(scene, 60, principled('ground', (0.5, 0.5, 0.5), 0.6))
    glass = bpy.data.materials.new('glass')
    glass.use_nodes = True
    nt = glass.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    g = nt.nodes.new('ShaderNodeBsdfGlass')
    g.inputs['IOR'].default_value = 1.45
    g.inputs['Roughness'].default_value = 0.0
    nt.links.new(g.outputs['BSDF'], out.inputs['Surface'])
    seg = 24 if smoke else 128
    n = 0
    for gx in (-1, 0, 1):
        for gy in (-1, 0, 1):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=0.9, location=(gx * 2.2, gy * 2.2, 1.0))
            o = bpy.context.active_object
            o.data.materials.append(glass)
            bpy.ops.object.shade_smooth()
            n += len(o.data.polygons)
    vol = bpy.data.materials.new('vol')
    vol.use_nodes = True
    vn = vol.node_tree
    for nd in list(vn.nodes):
        vn.nodes.remove(nd)
    vout = vn.nodes.new('ShaderNodeOutputMaterial')
    pv = vn.nodes.new('ShaderNodeVolumePrincipled')
    pv.inputs['Density'].default_value = 0.35
    vn.links.new(pv.outputs['Volume'], vout.inputs['Volume'])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 2.2))
    c = bpy.context.active_object
    c.scale = (4.2, 4.2, 2.4)
    c.data.materials.append(vol)
    ld = bpy.data.lights.new('area', 'AREA')
    ld.energy = 900.0
    ld.size = 4.0
    lo = bpy.data.objects.new('area', ld)
    lo.location = (0, 0, 7.5)
    scene.collection.objects.link(lo)
    add_camera(scene, (0, -11.0, 5.5), (0, 0, 1.4))
    add_sun(scene, 1.5)
    set_world(scene)
    scene.cycles.max_bounces = 16
    scene.cycles.transmission_bounces = 12
    scene.cycles.volume_bounces = 4
    return {'glass_polygons': n, 'volume': 'principled volume cube density 0.35'}


# ---------------------------------------------------------------- render and measure
def peak_rss_mb():
    try:
        import resource
        v = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return round(v / (2 ** 20 if sys.platform == 'darwin' else 1024.0), 1)
    except Exception:
        return None


def setup_thumb_output(scene, outdir):
    """Compositor chain Render Layers -> Scale (absolute 192 px wide) -> File Output, so a tiny PNG is written with every render and the
    full-size picture is never written (Render Result pixels cannot be read in background mode). Returns the File Output node or None."""
    try:
        scene.use_node_tree = True if hasattr(scene, 'use_node_tree') else None
    except Exception:
        pass
    try:
        scene.use_nodes = True
        tree = scene.node_tree
        tree.nodes.clear()
        rl = tree.nodes.new('CompositorNodeRLayers')
        sc = tree.nodes.new('CompositorNodeScale')
        sc.space = 'ABSOLUTE'
        fo = tree.nodes.new('CompositorNodeOutputFile')
        comp = tree.nodes.new('CompositorNodeComposite')
        fo.base_path = outdir
        fo.format.file_format = 'PNG'
        fo.format.color_mode = 'RGB'
        tree.links.new(rl.outputs['Image'], sc.inputs['Image'])
        tree.links.new(sc.outputs['Image'], fo.inputs[0])
        tree.links.new(rl.outputs['Image'], comp.inputs['Image'])
        return {'tree': tree, 'scale': sc, 'file': fo}
    except Exception as e:
        print('HW12_THUMB_SETUP_FAILED', type(e).__name__, e)
        return None


def aim_thumb(chain, w, h, base):
    sc, fo = chain['scale'], chain['file']
    tw = 192
    th = max(1, int(round(tw * h / float(w))))
    sc.inputs[1].default_value = tw
    sc.inputs[2].default_value = th
    fo.file_slots[0].path = base + '_'
    return tw, th


def read_png_level(path):
    img = bpy.data.images.load(path)
    n = img.size[0] * img.size[1] * 4
    buf = np.empty(n, dtype=np.float32)
    img.pixels.foreach_get(buf)
    bpy.data.images.remove(img)
    rgb = buf.reshape(-1, 4)[:, :3]
    return float(rgb.mean()), float(rgb.max())


def render_one(scene, w, h, samples, outdir, base, chain):
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = w, h, 100
    scene.cycles.samples = samples
    if chain:
        aim_thumb(chain, w, h, base)
    t0 = time.perf_counter()
    bpy.ops.render.render(write_still=False)
    sec = time.perf_counter() - t0
    r = {'resolution': '%dx%d' % (w, h), 'samples': samples, 'seconds': round(sec, 2), 'samples_per_s': round(samples / sec, 3),
         'msamples_per_s': round(w * h * samples / sec / 1e6, 2), 'peak_rss_mb': peak_rss_mb(), 'black': False}
    produced = [f for f in os.listdir(outdir) if f.startswith(base + '_') and f.endswith('.png')] if chain else []
    if not produced:
        r['picture'] = 'no thumbnail was written; picture not checked'
        return r
    src = os.path.join(outdir, sorted(produced)[0])
    dst = os.path.join(outdir, base + '.png')
    os.replace(src, dst)
    try:
        mean, mx = read_png_level(dst)
        r['mean_level'], r['max_level'] = round(mean, 4), round(mx, 4)
        r['black'] = bool(mean < 0.01 or not np.isfinite(mean))
    except Exception as e:
        r['picture'] = 'thumbnail not readable: %s: %s' % (type(e).__name__, e)
    r['thumb'] = os.path.basename(dst)
    return r


def setup_cycles(scene, samples):
    scene.render.engine = 'CYCLES'
    c = scene.cycles
    c.samples = samples
    c.use_adaptive_sampling = False
    c.use_denoising = False
    c.max_bounces = 8
    scene.render.use_persistent_data = False
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.view_transform = 'Standard'


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    a = parse_args(argv)
    os.makedirs(a['out'], exist_ok=True)
    name = a['scene']
    tag = name if name != 'growth' else 'growth_%dx%d' % (a['nsph'], a['k'])
    res = {'scene': tag, 'status': 'FAILED', 'smoke': a['smoke'], 'blender': bpy.app.version_string, 'renders': []}
    path = os.path.join(a['out'], tag + '.json')

    def save():
        with open(path, 'w') as fh:
            json.dump(res, fh, indent=1)
    try:
        scene = reset()
        kind, names = configure_device(scene, a['device'], a['gpu_name'])
        res['device_kind'], res['device_names'] = kind, names
        setup_cycles(scene, a['samples'])
        if name.startswith('tri_'):
            info = scene_tri(scene, name, a['smoke'], a)
        elif name == 'growth':
            info = scene_growth(scene, a['smoke'], a)
        elif name.startswith('tex_'):
            info = scene_tex(scene, name, a['smoke'], a)
        elif name == 'glass_volume':
            info = scene_glass(scene, a['smoke'], a)
        else:
            raise SystemExit('unknown scene %s' % name)
        res.update(info)
        if info.get('skip'):
            res['status'] = 'SKIPPED'
            res['error'] = info['skip']
            save()
            print('HW12_SKIPPED', res['error'])
            return 0
        res['peak_rss_after_build_mb'] = peak_rss_mb()
        resolutions = [tuple(int(v) for v in r.split('x')) for r in a['res'].split(',')]
        # warm-up: the first render on Metal compiles kernels (can take minutes); keep that out of the timed numbers
        t0 = time.perf_counter()
        scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 64, 36, 100
        scene.cycles.samples = 1
        bpy.ops.render.render(write_still=False)
        res['warmup_seconds'] = round(time.perf_counter() - t0, 2)
        print('HW12_WARMUP seconds=%s' % res['warmup_seconds'], flush=True)
        save()
        samples = a['samples']
        if name == 'growth':
            resolutions, samples = [(480, 270)], 16
        if a['smoke']:
            resolutions, samples = [(160, 90), (320, 180)][:len(resolutions)], min(samples, 8)
        chain = setup_thumb_output(scene, a['out'])
        for (w, h) in resolutions:
            r = render_one(scene, w, h, samples, a['out'], '%s_%dx%d' % (tag, w, h), chain)
            r['device'] = ','.join(names)
            res['renders'].append(r)
            print('HW12_RENDER', tag, r['resolution'], 'seconds=%s' % r['seconds'], 'samples=%d' % samples, 'device=%s' % r['device'], flush=True)
            save()
        res['status'] = 'PASSED' if not any(r.get('black') for r in res['renders']) else 'FAILED'
        if res['status'] == 'FAILED':
            res['error'] = 'a render came out black'
    except SystemExit as e:
        res['error'] = 'exit %s' % e.code
        save()
        raise
    except BaseException as e:
        res['error'] = '%s: %s' % (type(e).__name__, e)
        res['trace'] = traceback.format_exc()[-1500:]
        print('HW12_ERROR', res['error'], flush=True)
        save()
        return 1
    save()
    print('HW12_DONE', tag, res['status'])
    return 0 if res['status'] == 'PASSED' else 1


if __name__ == '__main__':
    rc = main()
    sys.stdout.flush()
    sys.exit(rc)
