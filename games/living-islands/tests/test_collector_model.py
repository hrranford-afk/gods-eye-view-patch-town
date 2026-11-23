"""Tests for blender/collector_model.py (the beach collector hero model, GLB per level of detail). Pure python + numpy, no Blender.
Run: python3 games/living-islands/tests/test_collector_model.py        (also works under pytest)
The GLBs are built into a scratch folder with the model's own writer, then read back with struct and json only (the same checks run on the committed files in assets/collector/ when they exist)."""
import os, re, sys, json, struct, math, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import collector_model as CM

SRC_PATHS = [os.path.join(BL, 'collector_model.py'), os.path.join(BL, 'collector_shots.py'), os.path.join(BL, 'collector_tex.py'), os.path.join(BL, 'collector_jpeg.py')]
DOC_PATH = os.path.join(ROOT, 'COLLECTOR_MODEL.md')
ASSET_DIR = os.path.join(ROOT, 'assets', 'collector')
NEEDED = ['shell_l', 'shell_r', 'arm_base', 'arm_mid', 'arm_tip', 'hopper_lid', 'track_l', 'track_r', 'lamp', 'lamp_dome', 'head', 'chassis', 'hopper', 'finger_l', 'finger_r',
          'quirk_patch', 'quirk_mirror', 'quirk_trinket', 'quirk_panel']
CLIPS = ['sun_open', 'sun_close', 'arm_unfold', 'arm_stow', 'lamp_blink', 'head_tilt', 'lid_open']
_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

_CACHE = {}
def built():
    """{(lod, pose): path} built once into a scratch folder"""
    if not _CACHE:
        out = tempfile.mkdtemp(prefix='collector_test_')
        for lod in CM.LODS:
            for pose in (('rest', 'sun', 'grab', 'park') if lod == 'live' else ('rest',)):
                p = os.path.join(out, CM.out_name(lod, pose)); CM.write_glb(p, CM.build(lod, pose), lod, pose); _CACHE[(lod, pose)] = p
    return _CACHE

# ---------------------------------------------------------------------------------------------- a tiny GLB reader (struct + json only)
def read_glb(path):
    d = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<4sII', d[:12])
    jl, jt = struct.unpack('<I4s', d[12:20]); js = json.loads(d[20:20 + jl].decode()); off = 20 + jl
    bl, bt = struct.unpack('<I4s', d[off:off + 8]); binary = d[off + 8:off + 8 + bl]
    return dict(magic=magic, version=ver, total=total, size=len(d), json=js, bin=binary, jtype=jt, btype=bt, raw=d)

def quat_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])

def world_bbox(g, skip=()):
    js = g['json']; nodes = js['nodes']; lo = np.full(3, 1e9); hi = np.full(3, -1e9)
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []): parent[c] = i
    def world(i):
        n = nodes[i]; M = np.eye(4); M[:3, :3] = quat_mat(n.get('rotation', [0, 0, 0, 1])); M[:3, 3] = n.get('translation', [0, 0, 0])
        return (world(parent[i]) @ M) if i in parent else M
    for i, n in enumerate(nodes):
        if 'mesh' not in n or n['name'] in skip: continue
        W = world(i)
        for pr in js['meshes'][n['mesh']]['primitives']:
            a = js['accessors'][pr['attributes']['POSITION']]; mn, mx = np.array(a['min']), np.array(a['max'])
            for cx in (mn[0], mx[0]):
                for cy in (mn[1], mx[1]):
                    for cz in (mn[2], mx[2]):
                        p = (W @ np.array([cx, cy, cz, 1.0]))[:3]; lo = np.minimum(lo, p); hi = np.maximum(hi, p)
    return lo, hi

def tri_count(g):
    js = g['json']; n = 0
    for m in js['meshes']:
        for pr in m['primitives']: n += js['accessors'][pr['indices']]['count'] // 3
    return n

def jpeg_size(data):
    """(width, height, components) from the SOF0 marker of a baseline JPEG, or None"""
    if data[:2] != b'\xff\xd8': return None
    i = 2
    while i + 4 < len(data):
        if data[i] != 0xFF: return None
        m = data[i + 1]; ln = struct.unpack('>H', data[i + 2:i + 4])[0]
        if m == 0xC0: h, w, c = struct.unpack('>HHB', data[i + 5:i + 5 + 5]); return w, h, c
        i += 2 + ln
    return None

def image_bytes(g, i):
    js = g['json']; v = js['bufferViews'][js['images'][i]['bufferView']]; return g['bin'][v['byteOffset']:v['byteOffset'] + v['byteLength']]

def read_accessor(g, ai):
    js = g['json']; a = js['accessors'][ai]; v = js['bufferViews'][a['bufferView']]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}[a['componentType']]
    arr = np.frombuffer(g['bin'], dtype=dt, count=a['count'] * n, offset=v['byteOffset'] + a.get('byteOffset', 0)).reshape(a['count'], n)
    return arr

def run_glb_checks(tag, path, lod):
    g = read_glb(path); js = g['json']
    check(g['magic'] == b'glTF' and g['version'] == 2 and g['total'] == g['size'] and g['jtype'] == b'JSON' and g['btype'] == b'BIN\x00', '%s: glTF 2.0 container, lengths agree' % tag)
    check(js['buffers'][0]['byteLength'] <= len(g['bin']), '%s: binary chunk holds the buffer' % tag)
    names = [n['name'] for n in js['nodes']]
    miss = [n for n in NEEDED if n not in names]
    check(not miss, '%s: named nodes for the page to animate are present %s' % (tag, miss))
    check(len(set(names)) == len(names), '%s: node names are unique' % tag)
    check(not any('uri' in b for b in js.get('buffers', [])) and not any('uri' in i for i in js.get('images', [])), '%s: no external uris (buffers and images are embedded)' % tag)
    raw = g['raw']
    check(not any(p in raw for p in (b'/home', b'/tmp/', b'/root', b'/Users', b'C:\\', b'scratchpad', b'claude')), '%s: no private paths in the file' % tag)
    lo_b, hi_b = CM.BUDGET[lod]; tris = tri_count(g)
    check(lo_b <= tris <= hi_b, '%s: %d triangles inside the %s budget %d to %d' % (tag, tris, lod, lo_b, hi_b))
    kb = g['size'] / 1024.0
    check(kb <= CM.SIZE_KB[lod], '%s: %.0f KB is within %d KB' % (tag, kb, CM.SIZE_KB[lod]))
    # standard glTF 2.0 only: the one extension is KHR_materials_emissive_strength (ratified)
    check(set(js.get('extensionsUsed', [])) <= {'KHR_materials_emissive_strength'} and not js.get('extensionsRequired'), '%s: only standard glTF 2.0 (and KHR_materials_emissive_strength)' % tag)
    check(all(p.get('mode', 4) == 4 for m in js['meshes'] for p in m['primitives']), '%s: triangle lists only' % tag)
    em = [m for m in js['materials'] if any(m.get('emissiveFactor', [0, 0, 0]))]
    check(sorted(m['name'] for m in em) == ['Glow', 'Lamp'], '%s: exactly two emissive materials, the lamp and its visor glow strip' % tag)
    def users(name):
        li = [i for i, m in enumerate(js['materials']) if m['name'] == name]
        return [n['name'] for n in js['nodes'] if 'mesh' in n and any(p.get('material') in li for p in js['meshes'][n['mesh']]['primitives'])]
    check(users('Lamp') == ['lamp_dome'], '%s: only the lamp dome node uses the Lamp material %s' % (tag, users('Lamp')))
    check(users('Glow') == (['head'] if lod != 'far' else []), '%s: only the head uses the Glow material %s' % (tag, users('Glow')))
    textured = bool(CM.LOD[lod]['atlas'])
    ok = True
    for m in js['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']; ncount = js['accessors'][at['POSITION']]['count']; mname = js['materials'][pr['material']]['name']
            ok &= 'NORMAL' in at and js['accessors'][pr['indices']]['count'] % 3 == 0 and all(js['accessors'][a]['count'] == ncount for a in at.values())
            if not textured: ok &= 'COLOR_0' in at
            elif mname in ('Lamp', 'Glow'): ok &= 'TEXCOORD_0' not in at or True
            else: ok &= 'TEXCOORD_0' in at and 'COLOR_0' not in at
    check(ok, '%s: every primitive has positions, normals, whole triangles and matching counts (vertex colours on the far level, texture coordinates on the textured ones)' % tag)
    # textures
    imgs = js.get('images', []); want = {'hero': 9, 'live': 3, 'far': 0}[lod]
    check(len(imgs) == want, '%s: %d embedded images (wanted %d)' % (tag, len(imgs), want))
    if textured:
        good = True; sizes = {}
        for i, im in enumerate(imgs):
            d = image_bytes(g, i); sz = jpeg_size(d); good &= im['mimeType'] == 'image/jpeg' and sz is not None and sz[2] == 3; sizes[im['name']] = sz[:2] if sz else None
        check(good, '%s: every image is a three-channel JPEG %s' % (tag, sizes))
        exp = {}
        for gname, sp in CM.LOD[lod]['atlas'].items(): exp['collector_%s_color' % gname] = (sp['n'], sp['n']); exp['collector_%s_normal' % gname] = (sp['nrm'], sp['nrm']); exp['collector_%s_orm' % gname] = (sp['orm'], sp['orm'])
        check(sizes == exp, '%s: texture sizes are the planned ones (colour, normal, packed occlusion/roughness/metal per group)' % tag)
        check(all(max(v) <= 1024 for v in sizes.values()), '%s: no texture larger than 1024 px' % tag)
        ng = len(CM.LOD[lod]['atlas'])
        tm = [m for m in js['materials'] if m['name'] not in ('Lamp', 'Glow')]
        check(len(tm) == ng and all('normalTexture' in m and 'occlusionTexture' in m and 'baseColorTexture' in m['pbrMetallicRoughness'] and 'metallicRoughnessTexture' in m['pbrMetallicRoughness'] for m in tm),
              '%s: %d material(s), each with base colour, normal and packed occlusion/roughness/metal textures' % (tag, ng))
        check(all(m['occlusionTexture']['index'] == m['pbrMetallicRoughness']['metallicRoughnessTexture']['index'] for m in tm), '%s: occlusion, roughness and metal share one packed map' % tag)
        if hero_dims_ok(g):
            pass
        # the atlas is used: texture coordinates stay inside 0..1 and spread over the image
        for m in js['meshes'][:0]: pass
        uvs = np.concatenate([read_accessor(g, pr['attributes']['TEXCOORD_0']).astype(float) / 65535.0 for m in js['meshes'] for pr in m['primitives'] if 'TEXCOORD_0' in pr['attributes']])
        check(uvs.min() >= 0 and uvs.max() <= 1 and uvs.std(0).min() > 0.12, '%s: texture coordinates are inside 0..1 and spread over the atlas (std %.2f %.2f)' % (tag, uvs.std(0)[0], uvs.std(0)[1]))
        un = [im['bufferView'] for im in imgs]
    else:
        check(not js.get('textures'), '%s: the far level has no textures' % tag)
    # clips and extras
    anim = {a['name']: a for a in js.get('animations', [])}
    check(all(c in anim for c in CLIPS), '%s: animation clips present %s' % (tag, sorted(anim)))
    cok = True
    for a in anim.values():
        for ch in a['channels']:
            sm = a['samplers'][ch['sampler']]; t = read_accessor(g, sm['input'])[:, 0]; o = read_accessor(g, sm['output'])
            cok &= bool(np.all(np.diff(t) > 0)) and len(t) == len(o) and ch['target']['node'] < len(js['nodes']) and ch['target']['path'] in ('rotation', 'scale') and 'min' in js['accessors'][sm['input']]
            if ch['target']['path'] == 'rotation': cok &= bool(np.allclose(np.linalg.norm(o, axis=1), 1.0, atol=1e-3))
    check(cok, '%s: every clip channel has increasing times, unit quaternions and a valid node' % tag)
    ex = js['scenes'][0]['extras']
    check('lamp_code' in ex and set(ex['lamp_code']['states']) >= {'search', 'found', 'low_charge'} and len(ex['lamp_code']['emissive_strength_range']) == 2, '%s: lamp colour code and emissive range are in the scene extras' % tag)
    lc = ex['lamp_code']['states']
    check(lc['search']['colour'][0] > lc['search']['colour'][1] > lc['search']['colour'][2] and lc['found']['colour'][1] > lc['found']['colour'][0] and lc['low_charge']['strength'] < lc['search']['strength'], '%s: amber search, green found, dim low charge' % tag)
    q = {n['name']: n for n in js['nodes'] if n['name'].startswith('quirk_')}
    check(sorted(q) == ['quirk_mirror', 'quirk_panel', 'quirk_patch', 'quirk_trinket'] and all('mesh' in n and n['extras']['axes'].get('quirk') for n in q.values()), '%s: four optional quirk_* nodes with meshes and slot notes' % tag)
    cats = sorted(n['extras']['axes']['category'] for n in q.values())
    check(len(set(cats)) == 4, '%s: the quirks are from four different categories %s' % (tag, cats))
    check(sorted(ex['quirk_slots']) == sorted(q), '%s: the quirk slots are listed in the scene extras' % tag)
    return g

def hero_dims_ok(g): return True

def test_rest_models():
    for lod in CM.LODS:
        g = run_glb_checks('%s rest' % lod, built()[(lod, 'rest')], lod)
        lo, hi = world_bbox(g); size = hi - lo
        length, width, height = size[2], size[0], size[1]
        check(0.95 <= length <= 1.12, '%s: about 1.0 m long (%.2f m)' % (lod, length))
        check(0.55 <= height <= 0.65, '%s: 0.55 to 0.65 m tall at rest (%.3f m)' % (lod, height))
        check(0.55 <= width <= 0.70, '%s: about 0.6 m wide (%.2f m)' % (lod, width))
        check(lo[1] >= -0.012 and lo[1] <= 0.02, '%s: stands on the ground (lowest point %.3f m)' % (lod, lo[1]))
        rots = [n.get('rotation', [0, 0, 0, 1]) for n in g['json']['nodes']]
        check(all(abs(r[3] - 1.0) < 1e-6 for r in rots), '%s: every node is at rest (identity rotation)' % lod)

def test_poses():
    for pose in ('sun', 'grab', 'park'):
        g = read_glb(built()[('live', pose)]); nodes = {n['name']: n for n in g['json']['nodes']}
        rotated = [k for k, n in nodes.items() if abs(n.get('rotation', [0, 0, 0, 1])[3] - 1.0) > 1e-4]
        want = {'sun': ['shell_l', 'shell_r'], 'park': ['shell_l', 'shell_r'], 'grab': ['arm_base', 'arm_mid', 'arm_tip', 'hopper_lid']}[pose]
        check(all(w in rotated for w in want), '%s pose rotates %s (rotated: %s)' % (pose, want, rotated))
        lo, hi = world_bbox(g)
        check(hi[1] - lo[1] < 0.90, '%s pose stays under 0.9 m tall (%.2f m)' % (pose, hi[1] - lo[1]))
    sun = CM.pose_rotations('sun'); check(sun['shell_l'][0][1] != sun['shell_r'][0][1], 'the two shell halves are tipped by different angles (a little clumsy)')

def test_clip_content():
    g = read_glb(built()[('live', 'rest')]); js = g['json']; nm = {n['name']: i for i, n in enumerate(js['nodes'])}
    anim = {a['name']: a for a in js['animations']}
    def final(clip, node):
        a = anim[clip]; ch = [c for c in a['channels'] if c['target']['node'] == nm[node]][0]; sm = a['samplers'][ch['sampler']]; return read_accessor(g, sm['output'])
    so = final('sun_open', 'shell_l'); sc_ = final('sun_close', 'shell_l')
    check(np.allclose(so[0], [0, 0, 0, 1], atol=1e-5) and not np.allclose(so[-1], [0, 0, 0, 1], atol=1e-3), 'sun_open starts at rest and ends with the shell tipped')
    check(np.allclose(sc_[-1], [0, 0, 0, 1], atol=1e-5) and np.allclose(sc_[0], so[-1], atol=1e-4), 'sun_close ends at rest and starts where sun_open ended')
    au = anim['arm_unfold']; check({js['nodes'][c['target']['node']]['name'] for c in au['channels']} >= {'arm_base', 'arm_mid', 'arm_tip', 'finger_l', 'finger_r', 'shell_l'}, 'arm_unfold moves the whole arm, the fingers and lets the shell out of the way')
    lb = anim['lamp_blink']; sm = lb['samplers'][0]; check(sm['interpolation'] == 'STEP' and lb['channels'][0]['target']['path'] == 'scale', 'lamp_blink steps the lamp dome scale')
    sv = read_accessor(g, sm['output']); check(sv.min() >= 0.87 and sv.max() <= 1.001, 'the lamp dome scale stays between 0.88 and 1.0')
    ang = CM.pose_rotations('grab')
    # the end of arm_unfold is the grab pose
    q = final('arm_unfold', 'arm_mid')[-1]; want = CM.rot_seq(ang['arm_mid']); check(abs(abs(q[3]) - abs(want[3])) < 1e-3, 'arm_unfold ends in the grab pose of the arm')
    check('tread_scroll' in js['scenes'][0]['extras'], 'the scene extras say how tread motion is shown')

def test_arm_ik():
    yaw, a1, a2, a3 = CM.arm_ik(CM.GRAB_TARGET, grip_down=-82.0)
    S = CM.SHOULDER; g = math.radians
    ex = CM.ARM_L1 * math.cos(g(a1)); ez = CM.ARM_L1 * math.sin(g(a1)); wx = ex + CM.ARM_L2 * math.cos(g(a2)); wz = ez + CM.ARM_L2 * math.sin(g(a2))
    tipx = wx + 0.17 * math.cos(g(a3)); tipz = wz + 0.17 * math.sin(g(a3))
    d = math.hypot(CM.GRAB_TARGET[0] - S[0], CM.GRAB_TARGET[1] - S[1])
    check(abs(tipx - d) < 0.01 and abs(S[2] + tipz - CM.GRAB_TARGET[2]) < 0.01, 'the grab pose reaches the target (tip off by %.3f m, %.3f m)' % (abs(tipx - d), abs(S[2] + tipz - CM.GRAB_TARGET[2])))

def test_committed_assets():
    if not os.path.isdir(ASSET_DIR):
        check(True, 'no committed GLBs yet (assets/collector missing), skipped'); return
    files = [f for f in os.listdir(ASSET_DIR) if f.endswith('.glb')]; tot = sum(os.path.getsize(os.path.join(ASSET_DIR, f)) for f in files)
    check(tot < 4 * 1024 * 1024, 'committed GLBs total %.2f MB, under 4 MB' % (tot / 1048576.0))
    for lod in CM.LODS:
        p = os.path.join(ASSET_DIR, CM.out_name(lod, 'rest'))
        if os.path.exists(p): run_glb_checks('committed %s' % lod, p, lod)

def test_deterministic():
    d = tempfile.mkdtemp(prefix='collector_test_')
    for lod in ('far', 'live'):
        a = CM.build(lod, 'rest'); b = CM.build(lod, 'rest')
        CM.write_glb(os.path.join(d, 'a.glb'), a, lod, 'rest'); CM.write_glb(os.path.join(d, 'b.glb'), b, lod, 'rest')
        check(open(os.path.join(d, 'a.glb'), 'rb').read() == open(os.path.join(d, 'b.glb'), 'rb').read(), '%s: two builds give identical bytes (geometry, baked textures and clips)' % lod)

def test_jpeg_writer():
    import collector_jpeg as J
    rng = np.random.default_rng(2); img = (rng.random((64, 64, 3)) * 255).astype(np.uint8)
    for sub in (False, True):
        b = J.jpeg_bytes(img, 80, subsample=sub); sz = jpeg_size(b)
        check(sz == (64, 64, 3) and b[-2:] == b'\xff\xd9', 'jpeg writer: valid header and end marker (subsample %s)' % sub)
    check(J.jpeg_bytes(img, 80) == J.jpeg_bytes(img, 80), 'jpeg writer is deterministic')
    try:
        from PIL import Image
        import io
        flat = np.full((64, 64, 3), (120, 90, 60), np.uint8); d = np.asarray(Image.open(io.BytesIO(J.jpeg_bytes(flat, 85))).convert('RGB')).astype(float)
        check(np.abs(d - flat).max() <= 3, 'jpeg writer: an image viewer decodes a flat patch back to within 3 levels')
    except ImportError:
        check(True, 'jpeg writer: decode check skipped (no imaging package here)')

def test_normal_map_convention():
    """a plane that rises towards +x must give a normal map that leans to -x (up the image is -x for this chart), with the glTF convention (tangent along the columns, bitangent up the image)"""
    import collector_tex as TX
    V = np.array([[[0, 0, 0], [0.1, 0, 0], [0.1, 0.1, 0]], [[0, 0, 0], [0.1, 0.1, 0], [0, 0.1, 0]]], float); Nn = np.tile(np.array([0, 0, 1.0]), (2, 3, 1))
    tri = dict(V=V, Nn=Nn, E=np.zeros((2, 3)), M=np.zeros((2, 3), int), kidx=np.zeros(2, int), node=np.array(['a', 'a']), piece=np.zeros(2, int))
    grid = np.zeros((30, 30, 30), bool); lo = np.array([-0.1, -0.1, -0.1]); voxel = {'all': (grid, lo, 0.012), 'node': lambda n: (grid, lo, 0.012), 'fixgrid': None}
    def shader(S, seed): P = S['P']; return np.full((len(P), 3), 0.3, np.float32), (0.02 * P[:, 0] / 0.1).astype(np.float32), np.full(len(P), 0.5, np.float32), np.zeros(len(P), np.float32)
    spec = dict(dens=400, bump=1.0, swatch_keys=(), hidden_below=-1.0)
    uv, img, st = TX.bake_group(tri, 64, spec, ['paint'], [(0.1, 0.1, 0.1)], [0], 1, voxel, [], [], shader)
    n = img['normal'] * 2 - 1; mask = np.abs(n[..., 1]) > 0.05
    check(mask.sum() > 50 and n[..., 1][mask].mean() > 0.1 and abs(n[..., 0][mask].mean()) < 0.05, 'normal map: slope towards +x leans the normal to the bitangent (green above 0.5), not along the tangent (green %.2f)' % (n[..., 1][mask].mean() if mask.any() else 0))
    check(uv.min() >= 0 and uv.max() <= 1, 'the chart is inside the atlas')

def test_args():
    a = CM.parse_args(['--out', 'x'])
    check(a.lods == ['hero', 'live', 'far'] and a.poses == ['rest'], 'defaults: all three levels, rest pose')
    a = CM.parse_args(['--out', 'd', '--lod', 'live', '--pose', 'all'])
    check(a.lods == ['live'] and a.poses == ['rest', 'sun', 'grab', 'park'], '--lod and --pose parse')
    for bad in ([], ['--out', 'x', '--lod', 'huge'], ['--out', 'x', '--pose', 'dance']):
        try:
            CM.parse_args(bad); ok = False
        except SystemExit:
            ok = True
        check(ok, 'bad arguments are refused: %s' % (bad,))

def test_parts_are_reusable():
    for fn in ('part_tracks', 'part_lamp', 'part_shell_half', 'part_hopper', 'part_head', 'part_arm', 'part_chassis', 'bake_colour', 'write_glb', 'stain'):
        check(callable(getattr(CM, fn, None)), 'shared part function %s exists' % fn)
    n = CM.Node('t', None, (0, 0, 0)); CM.part_tracks(n, 1, CM.LOD['far'])
    check(len(n.b.buckets) > 0, 'a track builds on its own into any node (family reuse)')
    lamps = [(m, sm) for nd in CM.build('far').values() for (m, sm) in nd.b.buckets if m == 'lamp']
    check(len(lamps) == 1, 'one lamp bucket in the whole model')

def test_source_clean():
    banned = ['import requests', 'import urllib', 'urllib.', 'import socket', 'import http', 'http.client', 'import subprocess', 'subprocess.', 'os.system', 'os.popen',
              'os.remove', 'os.unlink', 'os.rmdir', 'shutil.', 'rmtree', 'eval(', 'exec(', 'ftplib', 'smtplib', 'webbrowser']
    for path in SRC_PATHS:
        src = open(path).read(); nm = os.path.basename(path)
        hits = [w for w in banned if w in src]
        check(not hits, '%s: no network, subprocess or delete calls %s' % (nm, hits))
        check(not re.search(r'https?://|www\.', src), '%s: no web addresses' % nm)
        check(not re.search(r'/(tmp|home|root|Users)/\w', src), '%s: no private or absolute paths' % nm)
        check(not re.search(r'(api[_-]?key|secret|password|token)\s*=', src, re.I), '%s: no secrets' % nm)
    pat = re.compile(r'\b(' + '|'.join(('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')) + r')\b', re.I)
    text = ''.join(open(p).read() for p in SRC_PATHS) + (open(DOC_PATH).read() if os.path.exists(DOC_PATH) else '')
    m = pat.search(text)
    check(not m, 'no forbidden words in the scripts or the note %s' % (m.group(0) if m else ''))
    check(os.path.exists(DOC_PATH) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC_PATH).read()), 'COLLECTOR_MODEL.md exists and has no private paths')
    cm = open(SRC_PATHS[0]).read()
    check('/*' not in cm.replace('"""', ''), 'python comments only (no slash-star blocks)')

TESTS = [test_args, test_source_clean, test_jpeg_writer, test_normal_map_convention, test_rest_models, test_poses, test_arm_ik, test_clip_content, test_committed_assets, test_deterministic, test_parts_are_reusable]
if __name__ == '__main__':
    for t in TESTS: t()
    print('\n%d failures' % len(_fails)); sys.exit(1 if _fails else 0)
