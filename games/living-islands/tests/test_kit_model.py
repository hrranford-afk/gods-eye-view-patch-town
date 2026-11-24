"""Tests for blender/kit_model.py (the eight kit pieces, GLB per level of detail). Pure python + numpy, no Blender (a last check imports the GLBs in bpy when it is installed).
Run: python3 games/living-islands/tests/test_kit_model.py        (also works under pytest)
The GLBs are built into a scratch folder with the model's own writer and read back with struct and json only; the same checks run on the committed files in assets/kit/ when they exist."""
import os, re, sys, json, struct, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import kit_model as KM

SRC_PATHS = [os.path.join(BL, 'kit_model.py'), os.path.join(BL, 'kit_tex.py'), os.path.join(BL, 'kit_shots.py')]
DOC_PATH = os.path.join(ROOT, 'KIT_PIECES.md')
ASSET_DIR = os.path.join(ROOT, 'assets', 'kit')
NEEDED = {'relic_hull': ['hull', 'hatch', 'plate_1', 'footprint'], 'lighthouse_stump': ['tower', 'lantern', 'lens', 'footprint'], 'crate_stack': ['crate_1', 'crate_5', 'crate_6', 'drum', 'plank_01', 'footprint'],
          'cairn': ['body', 'stone_cap', 'stone_01', 'rag', 'footprint'], 'drying_rack': ['fish_01', 'cover', 'plank_01', 'footprint'], 'lean_to': ['sail', 'door', 'plank_01', 'footprint'],
          'rain_barrel': ['wall', 'door', 'barrel', 'lid', 'gutter', 'bucket', 'footprint'], 'wrecked_jetty': ['plank_01', 'bollard', 'footprint']}
_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

_CACHE = {}
def built():
    if not _CACHE:
        out = tempfile.mkdtemp(prefix='kit_test_')
        for p in KM.PIECES:
            for lod in KM.LODS:
                f = os.path.join(out, KM.out_name(p, lod)); KM.write_glb(f, KM.build(p, lod)); _CACHE[(p, lod)] = f
    return _CACHE

def read_glb(path):
    d = open(path, 'rb').read(); magic, ver, total = struct.unpack('<4sII', d[:12]); jl, jt = struct.unpack('<I4s', d[12:20]); js = json.loads(d[20:20 + jl].decode()); off = 20 + jl
    bl, bt = struct.unpack('<I4s', d[off:off + 8]); return dict(magic=magic, version=ver, total=total, size=len(d), json=js, bin=d[off + 8:off + 8 + bl], raw=d)

def acc(g, i):
    a = g['json']['accessors'][i]; v = g['json']['bufferViews'][a['bufferView']]; ct = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5120: np.int8, 5121: np.uint8}[a['componentType']]
    nc = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]; stride = v.get('byteStride', np.dtype(ct).itemsize * nc); n = a['count']; base = v['byteOffset'] + a.get('byteOffset', 0)
    if stride == np.dtype(ct).itemsize * nc: return np.frombuffer(g['bin'], ct, n * nc, base).reshape(n, nc)
    raw = np.frombuffer(g['bin'], np.uint8, n * stride, base).reshape(n, stride); return np.frombuffer(np.ascontiguousarray(raw[:, :np.dtype(ct).itemsize * nc]).tobytes(), ct).reshape(n, nc)

def jpeg_size(d):
    i = 2
    while i < len(d):
        if d[i] != 0xFF: return None
        m = d[i + 1]; ln = struct.unpack('>H', d[i + 2:i + 4])[0]
        if m in (0xC0, 0xC2): h, w = struct.unpack('>HH', d[i + 5:i + 9]); return w, h, d[i + 9]
        i += 2 + ln
    return None

def world_bbox(g):
    js = g['json']; nodes = js['nodes']; parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []): parent[c] = i
    def pos(i):
        p = np.array(nodes[i].get('translation', [0, 0, 0]), float)
        while i in parent: i = parent[i]; p = p + np.array(nodes[i].get('translation', [0, 0, 0]), float)
        return p
    lo = np.full(3, 1e9); hi = np.full(3, -1e9)
    for i, n in enumerate(nodes):
        if 'mesh' not in n or n['name'] == 'footprint': continue
        o = pos(i)
        for pr in js['meshes'][n['mesh']]['primitives']:
            a = js['accessors'][pr['attributes']['POSITION']]; lo = np.minimum(lo, np.array(a['min']) + o); hi = np.maximum(hi, np.array(a['max']) + o)
    return lo, hi

def glb_checks(tag, path, piece, lod):
    g = read_glb(path); js = g['json']
    check(g['magic'] == b'glTF' and g['version'] == 2 and g['total'] == g['size'], '%s: valid GLB header' % tag)
    check(not any('uri' in x for x in js.get('images', []) + js.get('buffers', [])), '%s: no external uris (everything is embedded)' % tag)
    names = {n['name'] for n in js['nodes']}
    check(set(NEEDED[piece]) <= names, '%s: named nodes present %s' % (tag, NEEDED[piece]))
    tri = 0; ok = True
    for n in js['nodes']:
        if 'mesh' not in n: continue
        for pr in js['meshes'][n['mesh']]['primitives']:
            idx = acc(g, pr['indices']); tri += len(idx) // 3; ok &= len(idx) % 3 == 0 and int(idx.max()) < js['accessors'][pr['attributes']['POSITION']]['count'] and 'NORMAL' in pr['attributes']
    check(ok, '%s: whole triangles, indices in range, normals present' % tag)
    lo_, hi_ = KM.BUDGET[lod]; check(lo_ <= tri <= hi_, '%s: %d triangles inside the budget %d to %d' % (tag, tri, lo_, hi_))
    check(js['scenes'][0]['extras']['triangles'] == tri, '%s: the extras count matches the real triangle count' % tag)
    check(g['size'] <= KM.SIZE_KB[lod] * 1024, '%s: %.0f KB, under %d KB' % (tag, g['size'] / 1024.0, KM.SIZE_KB[lod]))
    fp = [n for n in js['nodes'] if n['name'] == 'footprint'][0]; Pf = acc(g, js['meshes'][fp['mesh']]['primitives'][0]['attributes']['POSITION']); poly = fp['extras']['polygon']
    area = 0.5 * abs(sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))))
    check(np.ptp(Pf[:, 1]) < 1e-6 and 0.0 < Pf[0, 1] < 0.01 and area > 1.0 and len(poly) >= 4, '%s: footprint is a flat polygon at y = 0.003 with an area of %.1f m2' % (tag, area))
    imgs = js.get('images', []); want = 1 if lod == 'far' else 3; check(len(imgs) == want, '%s: %d embedded images' % (tag, len(imgs)))
    good = True; sizes = []
    for im in imgs:
        v = js['bufferViews'][im['bufferView']]; d = g['bin'][v['byteOffset']:v['byteOffset'] + v['byteLength']]; sz = jpeg_size(d); good &= sz is not None and sz[2] == 3 and d[-2:] == b'\xff\xd9'; sizes.append(sz[:2] if sz else None)
    check(good and all(max(s) <= KM.QL[lod]['atlas'] for s in sizes), '%s: images are three-channel JPEGs no bigger than the atlas %s' % (tag, sizes))
    uv = np.concatenate([acc(g, pr['attributes']['TEXCOORD_0']).astype(float) / 65535.0 for m in js['meshes'] for pr in m['primitives'] if 'TEXCOORD_0' in pr['attributes']])
    check(uv.min() >= 0 and uv.max() <= 1 and uv.std(0).min() > 0.12, '%s: texture coordinates inside 0..1 and spread over the atlas' % tag)
    ex = js['scenes'][0]['extras']
    mv = ex['movable']; check(len(mv) >= 2 and all(k in names for k in mv), '%s: movable nodes are listed (%d) and exist' % (tag, len(mv)))
    return g

def test_args():
    a = KM.parse_args(['--out', 'x']); check(a.lods == ['hero', 'live', 'far'] and len(a.pieces) == 8, 'defaults: all levels, all eight pieces')
    for bad in ([], ['--out', 'x', '--lod', 'huge'], ['--out', 'x', '--piece', 'castle']):
        try: KM.parse_args(bad); ok = False
        except SystemExit: ok = True
        check(ok, 'bad arguments are refused: %s' % (bad,))

def test_models():
    for p in KM.PIECES:
        for lod in KM.LODS:
            g = glb_checks('%s %s' % (p, lod), built()[(p, lod)], p, lod)
            lo, hi = world_bbox(g); size = hi - lo
            check(-1.8 <= lo[1] <= 0.1, '%s %s: on the ground, only piles and hull buried (lowest point %.3f m)' % (p, lod, lo[1]))
            dims = {'relic_hull': (7.0, 13.0, 2.0, 4.5), 'lighthouse_stump': (3.5, 11.0, 3.0, 6.0), 'crate_stack': (2.0, 5.5, 1.2, 2.0), 'cairn': (1.2, 3.0, 1.2, 2.6), 'drying_rack': (3.5, 7.5, 1.8, 2.4),
                    'lean_to': (3.0, 6.0, 1.3, 2.2), 'rain_barrel': (3.0, 5.5, 1.8, 2.5), 'wrecked_jetty': (8.0, 11.0, 1.0, 3.5)}[p]
            check(dims[0] <= max(size[0], size[2]) <= dims[1] and dims[2] <= size[1] <= dims[3], '%s %s: size %.1f x %.1f x %.1f m is believable' % (p, lod, size[0], size[1], size[2]))

def test_lod_consistency():
    for p in KM.PIECES:
        names = []
        for lod in KM.LODS: names.append({n['name'] for n in read_glb(built()[(p, lod)])['json']['nodes']})
        check(set(NEEDED[p]) <= names[2] and names[2] <= names[1] <= names[0], '%s: far names are a subset of live, live of hero, the required parts are in all three' % p)
        s = [os.path.getsize(built()[(p, lod)]) for lod in KM.LODS]; check(s[0] > s[1] > s[2], '%s: hero > live > far in bytes' % p)

def test_deterministic():
    d = tempfile.mkdtemp(prefix='kit_det_')
    for p in ('cairn', 'lean_to'):
        for lod in ('far', 'live'):
            KM.write_glb(os.path.join(d, 'a.glb'), KM.build(p, lod)); KM.write_glb(os.path.join(d, 'b.glb'), KM.build(p, lod))
            check(open(os.path.join(d, 'a.glb'), 'rb').read() == open(os.path.join(d, 'b.glb'), 'rb').read(), '%s %s: two builds give identical bytes' % (p, lod))

def test_committed_assets():
    if not os.path.isdir(ASSET_DIR): check(True, 'no committed GLBs yet'); return
    files = [f for f in os.listdir(ASSET_DIR) if f.endswith('.glb')]; tot = sum(os.path.getsize(os.path.join(ASSET_DIR, f)) for f in os.listdir(ASSET_DIR))
    check(len(files) == 24, '24 committed GLBs (%d)' % len(files)); check(tot < KM.TOTAL_KB * 1024, 'committed set is %.2f MB, under 5 MB' % (tot / 1048576.0))
    for p in KM.PIECES:
        for lod in KM.LODS:
            f = os.path.join(ASSET_DIR, KM.out_name(p, lod))
            if os.path.exists(f): glb_checks('committed %s %s' % (p, lod), f, p, lod)

def test_source_clean():
    banned = ['import requests', 'import urllib', 'urllib.', 'import socket', 'import http', 'import subprocess', 'subprocess.', 'os.system', 'os.popen', 'os.remove', 'os.unlink', 'os.rmdir', 'shutil.', 'rmtree', 'eval(', 'exec(', 'webbrowser']
    for path in SRC_PATHS:
        src = open(path).read(); nm = os.path.basename(path)
        hits = [w for w in banned if w in src]; check(not hits, '%s: no network, subprocess or delete calls %s' % (nm, hits))
        check(not re.search(r'https?://|www\.', src), '%s: no web addresses' % nm)
        check(not re.search(r'/(tmp|home|root|Users)/\w', src), '%s: no private or absolute paths' % nm)
        check(not re.search(r'(api[_-]?key|secret|password|token)\s*=', src, re.I), '%s: no secrets' % nm)
    pat = re.compile(r'\b(' + '|'.join(('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')) + r')\b', re.I)
    text = ''.join(open(p).read() for p in SRC_PATHS) + (open(DOC_PATH).read() if os.path.exists(DOC_PATH) else '')
    m = pat.search(text); check(not m, 'no forbidden words in the scripts or the note %s' % (m.group(0) if m else ''))
    check(os.path.exists(DOC_PATH) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC_PATH).read()), 'KIT_PIECES.md exists and has no private paths')

def test_bpy_import():
    try: import bpy
    except ImportError: check(True, 'bpy not installed here, import check skipped'); return
    for p in KM.PIECES:
        bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=built()[(p, 'live')])
        check(len([o for o in bpy.data.objects if o.type == 'MESH']) >= 3, '%s: imports in bpy %s' % (p, bpy.app.version_string))

TESTS = [test_args, test_source_clean, test_models, test_lod_consistency, test_deterministic, test_committed_assets, test_bpy_import]
if __name__ == '__main__':
    for t in TESTS: t()
    print('\n%d failures' % len(_fails)); sys.exit(1 if _fails else 0)
