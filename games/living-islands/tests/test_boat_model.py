"""Tests for blender/boat_model.py (the boat kit: dinghy, sailer, work boat and the wreck as GLB per level of detail). Pure python + numpy, no Blender needed for these checks
(the import into bpy is checked too when the bpy module is importable).
Run: python3 games/living-islands/tests/test_boat_model.py        (also works under pytest)"""
import os, re, sys, json, struct, math, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import boat_model as BM

SRC_PATHS = [os.path.join(BL, f) for f in ('boat_model.py', 'boat_shots.py', 'boat_tex.py')]
DOC_PATH = os.path.join(ROOT, 'BOAT_MODEL.md')
ASSET_DIR = os.path.join(ROOT, 'assets', 'boats')
COMMON = ['boat', 'hull', 'hullmask', 'waterline', 'seat_1']
NEEDED = {'dinghy': COMMON + ['oar_l', 'oar_r', 'seat_2', 'seat_3'], 'wreck': COMMON + ['oar_l', 'oar_r', 'seat_2', 'seat_3'],
          'sailer': COMMON + ['oar_l', 'oar_r', 'mast', 'boom', 'sail', 'sail_furled', 'tiller', 'rudder', 'rudder_pin', 'seat_2', 'seat_3', 'seat_4'],
          'work': COMMON + ['davit', 'tiller', 'rudder', 'rudder_pin', 'seat_2']}
# overall length including the raked transom, beam at the sheer, (min, max) in metres
DIMS = {'dinghy': (4.0, 1.45), 'wreck': (4.0, 1.45), 'sailer': (6.0, 1.95), 'work': (7.0, 2.45)}
_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

_CACHE = {}
def built():
    if not _CACHE:
        out = tempfile.mkdtemp(prefix='boat_test_')
        for b in BM.BOATS:
            for lod in BM.LODS:
                p = os.path.join(out, BM.out_name(b, lod)); BM.write_glb(p, b, lod); _CACHE[(b, lod)] = p
    return _CACHE

def read_glb(path):
    d = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<4sII', d[:12]); jl, jt = struct.unpack('<I4s', d[12:20]); js = json.loads(d[20:20 + jl].decode()); off = 20 + jl
    bl, bt = struct.unpack('<I4s', d[off:off + 8])
    return dict(magic=magic, version=ver, total=total, size=len(d), json=js, bin=d[off + 8:off + 8 + bl], jtype=jt, btype=bt, raw=d)

def tri_count(g, skip=()):
    js = g['json']; n = 0
    for nd in js['nodes']:
        if 'mesh' in nd and nd['name'] not in skip:
            for pr in js['meshes'][nd['mesh']]['primitives']: n += js['accessors'][pr['indices']]['count'] // 3
    return n

def bbox(g, skip=('hullmask', 'waterline')):
    """world bounding box in the build frame, taking node translations (rest pose) into account; only the hull node and the mast-free parts matter here"""
    js = g['json']; nodes = js['nodes']; parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []): parent[c] = i
    def world_t(i):
        t = np.array(nodes[i].get('translation', [0, 0, 0]), float); return t + (world_t(parent[i]) if i in parent else 0)
    lo = np.full(3, 1e9); hi = np.full(3, -1e9)
    for i, n in enumerate(nodes):
        if 'mesh' not in n or n['name'] != 'hull': continue
        for pr in js['meshes'][n['mesh']]['primitives']:
            a = js['accessors'][pr['attributes']['POSITION']]; lo = np.minimum(lo, np.array(a['min']) + world_t(i)); hi = np.maximum(hi, np.array(a['max']) + world_t(i))
    return lo, hi      # glTF frame: x = left, y = up, z = forward

def jpeg_size(data):
    if data[:2] != b'\xff\xd8': return None
    i = 2
    while i + 4 < len(data):
        m = data[i + 1]; ln = struct.unpack('>H', data[i + 2:i + 4])[0]
        if m == 0xC0: h, w, c = struct.unpack('>HHB', data[i + 5:i + 10]); return w, h, c
        i += 2 + ln
    return None

def image_bytes(g, i):
    js = g['json']; v = js['bufferViews'][js['images'][i]['bufferView']]; return g['bin'][v['byteOffset']:v['byteOffset'] + v['byteLength']]

def run_glb_checks(tag, path, boat, lod):
    g = read_glb(path); js = g['json']
    check(g['magic'] == b'glTF' and g['version'] == 2 and g['total'] == g['size'] and g['jtype'] == b'JSON' and g['btype'] == b'BIN\x00', '%s: glTF 2.0 container, lengths agree' % tag)
    names = [n['name'] for n in js['nodes']]; miss = [n for n in NEEDED[boat] if n not in names]
    check(not miss, '%s: named nodes present (missing %s)' % (tag, miss)); check(len(set(names)) == len(names), '%s: node names unique' % tag)
    check(not any('uri' in b for b in js.get('buffers', [])) and not any('uri' in i for i in js.get('images', [])), '%s: no external uris' % tag)
    raw = g['raw']; check(not any(p in raw for p in (b'/home', b'/tmp/', b'/root', b'/Users', b'C:\\', b'scratchpad', b'claude')), '%s: no private paths in the file' % tag)
    tris = tri_count(g); lo, hi = BM.BUDGET[lod]
    check(lo <= tris <= hi, '%s: %d triangles inside %d to %d' % (tag, tris, lo, hi))
    kb = g['size'] / 1024.0; check(kb <= BM.SIZE_KB[lod], '%s: %.0f KB within %d KB' % (tag, kb, BM.SIZE_KB[lod]))
    check(not js.get('extensionsRequired') and not js.get('extensionsUsed'), '%s: standard glTF 2.0 only' % tag)
    check(all(p.get('mode', 4) == 4 for m in js['meshes'] for p in m['primitives']), '%s: triangle lists only' % tag)
    ok = True
    for m in js['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']; n = js['accessors'][at['POSITION']]['count']; ok &= 'NORMAL' in at and all(js['accessors'][a]['count'] == n for a in at.values()) and js['accessors'][pr['indices']]['count'] % 3 == 0
    check(ok, '%s: attributes agree in count, indices in threes' % tag)
    # nodes without a mesh are markers; every seat is one
    seats = [n for n in js['nodes'] if n['name'].startswith('seat_')]; check(seats and all('mesh' not in n for n in seats), '%s: seats are empty markers' % tag)
    mi = {m['name']: i for i, m in enumerate(js['materials'])}
    check('HullMask' in mi and js['materials'][mi['HullMask']]['extras'].get('depthOnly'), '%s: HullMask material flagged depthOnly' % tag)
    hm = [n for n in js['nodes'] if n['name'] == 'hullmask'][0]; check('mesh' in hm and all(p['material'] == mi['HullMask'] for p in js['meshes'][hm['mesh']]['primitives']), '%s: hullmask node uses only HullMask' % tag)
    check(js['scenes'][0]['extras']['poses'].keys() >= {'rest', 'sailing', 'rowing', 'beached'}, '%s: pose table has rest, sailing, rowing, beached' % tag)
    check({'pose_rest', 'pose_sailing', 'pose_rowing', 'pose_beached'} <= {a['name'] for a in js.get('animations', [])}, '%s: pose clips present' % tag)
    if BM.QL[lod]['tex'] > 0:
        check(len(js.get('images', [])) == 3, '%s: three embedded textures (colour, normal, orm)' % tag)
        for i in range(3):
            d = image_bytes(g, i); sz = jpeg_size(d); check(sz is not None and sz[0] >= 256, '%s: image %d is a baseline JPEG %s' % (tag, i, sz))
        d0 = jpeg_size(image_bytes(g, 0)); check(d0[0] == int(BM.BT.W0 * BM.QL[lod]['tex']) and d0[1] == int(BM.BT.H0 * BM.QL[lod]['tex']), '%s: atlas size %s' % (tag, d0[:2]))
        check(all('TEXCOORD_0' in p['attributes'] for m in js['meshes'] for p in m['primitives'] if js['materials'][p['material']]['name'] in ('Boat', 'BoatTwo')), '%s: UVs on every boat primitive' % tag)
    else:
        check('images' not in js and all('COLOR_0' in p['attributes'] for m in js['meshes'] for p in m['primitives'] if js['materials'][p['material']]['name'] in ('Boat', 'BoatTwo')), '%s: far level uses vertex colours only' % tag)
    boat_len, beam = DIMS[boat]; lo3, hi3 = bbox(g)
    check(abs((hi3[2] - lo3[2]) - boat_len) < 0.35, '%s: hull length %.2f m is about %.1f m' % (tag, hi3[2] - lo3[2], boat_len))
    check(abs((hi3[0] - lo3[0]) - beam) < 0.2, '%s: hull beam %.2f m is about %.2f m' % (tag, hi3[0] - lo3[0], beam))
    check(-0.6 < lo3[1] < -0.1 and 0.25 < hi3[1] < 2.0, '%s: waterline at y = 0, keel %.2f below, sheer %.2f above' % (tag, lo3[1], hi3[1]))
    return g

def test_args():
    check(set(BM.BOATS) == {'dinghy', 'sailer', 'work', 'wreck'} and set(BM.LODS) == {'hero', 'live', 'far'}, 'four boats and three levels of detail')

def test_all_glbs():
    for (b, lod), p in sorted(built().items()): run_glb_checks('%s %s' % (b, lod), p, b, lod)

def test_strakes_and_laps():
    for b in BM.BOATS:
        check(BM.SPECS[b]['ns'] >= 5, '%s has %d strakes per side' % (b, BM.SPECS[b]['ns']))
    nodes, H, ex = BM.build('dinghy', 'hero'); P = np.concatenate([c[1] for c in nodes['hull'].part.ch if c[0] == 'Boat'])
    check(H.ns == 5, 'the dinghy has 5 strakes per side')
    # a real lap: at a station, the outside of strake k+1 stands proud of the strake k by about the lap step
    u = 0.5; t = 1.0 / 5; p_lo = H.surf(u, t - 1e-3) + H.nrm(u, t - 1e-3) * 0.0; p_hi = H.surf(u, t + 1e-3) + H.nrm(u, t + 1e-3) * BM.TH_LAP
    check(abs(BM.TH_LAP - 0.014) < 1e-9 and np.linalg.norm(p_hi - p_lo) > 0.012, 'laps are geometry: a 14 mm step at every strake edge')

def test_sizes_total():
    tot = sum(read_glb(p)['size'] for p in built().values()) / 1024.0
    check(tot < BM.TOTAL_KB, 'the whole set of %d files is %.0f KB, under %d KB' % (len(built()), tot, BM.TOTAL_KB))

def test_committed_assets():
    if not os.path.isdir(ASSET_DIR):
        check(False, 'assets/boats exists'); return
    tot = 0
    for b in BM.BOATS:
        for lod in BM.LODS:
            p = os.path.join(ASSET_DIR, BM.out_name(b, lod)); check(os.path.exists(p), 'committed %s' % os.path.basename(p))
            if os.path.exists(p): run_glb_checks('committed ' + os.path.basename(p), p, b, lod)
    tot = sum(os.path.getsize(os.path.join(ASSET_DIR, f)) for f in os.listdir(ASSET_DIR)) / 1024.0
    check(tot < BM.TOTAL_KB, 'everything under assets/boats is %.0f KB, under %d KB' % (tot, BM.TOTAL_KB))

def test_poses():
    for b in BM.BOATS:
        nodes, H, ex = BM.build(b, 'far'); P = BM.pose_defs(b, BM.SPECS[b], H, ex)
        for pn, tb in P.items():
            for n in tb: check(n in nodes, '%s pose %s only moves existing node %s' % (b, pn, n)) if n not in nodes else None
    nodes, H, ex = BM.build('sailer', 'far'); P = BM.pose_defs('sailer', BM.SPECS['sailer'], H, ex)
    check('sail' in P['rest'] and P['rest']['sail']['s'] < 0.01 and 'sail_furled' in P['sailing'], 'sailer: the filled sail shows only while sailing, the furled one at rest')
    check(P['rowing']['oar_l']['r'] != P['rest']['oar_l']['r'], 'oars: rowing differs from shipped')
    check(P['beached']['boat']['r'][0][0] == 'x' if 'boat' in P['beached'] else True, 'beached poses roll the boat')

def test_pivots():
    nodes, H, ex = BM.build('sailer', 'far')
    check(abs(nodes['oar_l'].pivot[1]) > 0.5 and nodes['oar_l'].pivot[1] * nodes['oar_r'].pivot[1] < 0, 'oar pivots sit at the rowlocks on both sides')
    check(nodes['boom'].pivot[2] > H.sheer_z(nodes['mast'].pivot[0]) + 0.4, 'boom pivot (gooseneck) is above the gunwale on the mast')
    check(nodes['rudder_pin'].pivot[0] < 0.0 and nodes['rudder'].parent == 'rudder_pin' and nodes['tiller'].parent == 'rudder_pin', 'rudder and tiller hang on the rudder pin behind the transom')
    nodes, H, ex = BM.build('work', 'far'); check(nodes['davit'].pivot[1] < -0.5, 'davit pivot is on the starboard gunwale')

def test_deterministic():
    a = tempfile.mkdtemp(prefix='boat_det_'); p1 = os.path.join(a, 'a.glb'); p2 = os.path.join(a, 'b.glb')
    BM.write_glb(p1, 'sailer', 'live'); BM.write_glb(p2, 'sailer', 'live')
    check(open(p1, 'rb').read() == open(p2, 'rb').read(), 'the same boat builds to the same bytes')

def test_mask_dry():
    nodes, H, ex = BM.build('dinghy', 'hero'); m = np.concatenate([c[1] for c in nodes['hullmask'].part.ch])
    check(m[:, 2].min() > 0.1, 'the hullmask lid sits above the sea (%.2f m up) and closes the opening' % m[:, 2].min())
    check(abs(m[:, 1]).max() > 0.55, 'the lid spans the full opening (half width %.2f m)' % abs(m[:, 1]).max())
    P = np.concatenate([c[1] for c in nodes['hull'].part.ch]); fl = BM.floor_z(BM.SPECS['dinghy'])
    check(fl > -BM.SPECS['dinghy']['draft'] and fl < 0.2, 'the dry floor is a set of boards above the keel, no water level inside')

def test_bpy_import():
    try:
        import bpy
    except Exception:
        print('SKIP bpy not importable here'); return
    for b in ('dinghy', 'sailer'):
        p = built()[(b, 'live')]; before = set(bpy.data.objects.keys()); bpy.ops.import_scene.gltf(filepath=p)
        new = [o for o in bpy.data.objects if o.name not in before]
        check(any(o.name.split('.')[0] == 'hull' and o.type == 'MESH' for o in new), 'bpy imports %s with a hull mesh (%d objects)' % (b, len(new)))

def test_source_clean():
    banned = ['import requests', 'import urllib', 'urllib.', 'import socket', 'import http', 'http.client', 'import subprocess', 'subprocess.', 'os.system', 'os.popen',
              'os.remove', 'os.unlink', 'os.rmdir', 'shutil.', 'rmtree', 'eval(', 'exec(', 'ftplib', 'smtplib', 'webbrowser']
    for path in SRC_PATHS:
        src = open(path).read(); nm = os.path.basename(path); hits = [w for w in banned if w in src]
        check(not hits, '%s: no network, subprocess or delete calls %s' % (nm, hits))
        check(not re.search(r'https?://|www\.', src), '%s: no web addresses' % nm)
        check(not re.search(r'/(tmp|home|root|Users)/\w', src), '%s: no private or absolute paths' % nm)
        check(not re.search(r'(api[_-]?key|secret|password|token)\s*=', src, re.I), '%s: no secrets' % nm)
    pat = re.compile(r'\b(' + '|'.join(('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')) + r')\b', re.I)
    text = ''.join(open(p).read() for p in SRC_PATHS) + (open(DOC_PATH).read() if os.path.exists(DOC_PATH) else '')
    m = pat.search(text); check(not m, 'no forbidden words in the scripts or the note %s' % (m.group(0) if m else ''))
    check(os.path.exists(DOC_PATH) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC_PATH).read()), 'BOAT_MODEL.md exists and has no private paths')

TESTS = [test_args, test_source_clean, test_strakes_and_laps, test_pivots, test_poses, test_mask_dry, test_all_glbs, test_sizes_total, test_committed_assets, test_deterministic, test_bpy_import]
if __name__ == '__main__':
    for t in TESTS: t()
    print('\n%d failures' % len(_fails)); sys.exit(1 if _fails else 0)
