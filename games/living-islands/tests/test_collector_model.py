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

SRC_PATHS = [os.path.join(BL, 'collector_model.py'), os.path.join(BL, 'collector_shots.py')]
DOC_PATH = os.path.join(ROOT, 'COLLECTOR_MODEL.md')
ASSET_DIR = os.path.join(ROOT, 'assets', 'collector')
NEEDED = ['shell_l', 'shell_r', 'arm_base', 'arm_mid', 'arm_tip', 'hopper_lid', 'track_l', 'track_r', 'lamp', 'head']
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
    em = [m for m in js['materials'] if any(m.get('emissiveFactor', [0, 0, 0]))]
    check(len(em) == 1 and em[0]['name'] == 'Lamp', '%s: exactly one emissive material (the lamp)' % tag)
    li = js['materials'].index(em[0]) if em else -1
    users = [n['name'] for n in js['nodes'] if 'mesh' in n and any(p.get('material') == li for p in js['meshes'][n['mesh']]['primitives'])]
    check(users == ['lamp'], '%s: only the lamp node uses the emissive material %s' % (tag, users))
    ok = True
    for m in js['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']; ncount = js['accessors'][at['POSITION']]['count']
            ok &= 'NORMAL' in at and 'COLOR_0' in at and js['accessors'][pr['indices']]['count'] % 3 == 0 and all(js['accessors'][a]['count'] == ncount for a in at.values())
    check(ok, '%s: every primitive has positions, normals, vertex colours, whole triangles and matching counts' % tag)
    check(bool(js.get('images')) == CM.LOD[lod]['tex'], '%s: embedded detail textures only where the level asks for them (%d images)' % (tag, len(js.get('images', []))))
    return g

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
    check(tot < 3 * 1024 * 1024, 'committed GLBs total %.2f MB, under 3 MB' % (tot / 1048576.0))
    for lod in CM.LODS:
        p = os.path.join(ASSET_DIR, CM.out_name(lod, 'rest'))
        if os.path.exists(p): run_glb_checks('committed %s' % lod, p, lod)

def test_deterministic():
    a = CM.build('far', 'rest'); b = CM.build('far', 'rest'); d = tempfile.mkdtemp(prefix='collector_test_')
    CM.write_glb(os.path.join(d, 'a.glb'), a, 'far', 'rest'); CM.write_glb(os.path.join(d, 'b.glb'), b, 'far', 'rest')
    check(open(os.path.join(d, 'a.glb'), 'rb').read() == open(os.path.join(d, 'b.glb'), 'rb').read(), 'two builds give identical bytes')

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

TESTS = [test_args, test_source_clean, test_rest_models, test_poses, test_arm_ik, test_committed_assets, test_deterministic, test_parts_are_reusable]
if __name__ == '__main__':
    for t in TESTS: t()
    print('\n%d failures' % len(_fails)); sys.exit(1 if _fails else 0)
