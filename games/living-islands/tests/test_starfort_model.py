"""Tests for the star fort kit: blender/starfort_model.py (parts as GLB files), starfort_tex.py, starfort_layout.py (the whole fort from sockets), starfort_shots.py.
Pure python + numpy, no Blender needed (a last check imports GLBs in bpy when it is installed).
Run: python3 games/living-islands/tests/test_starfort_model.py        (also works under pytest)
The model is built into a scratch folder with its own writer for a few pieces; the checks on all 66 committed files in assets/starfort/ run when that folder exists."""
import os, re, sys, json, math, struct, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import starfort_model as SM
import starfort_layout as SL

SRC_PATHS = [os.path.join(BL, n) for n in ('starfort_model.py', 'starfort_tex.py', 'starfort_layout.py', 'starfort_shots.py')]
DOC_PATH = os.path.join(ROOT, 'STAR_FORT_KIT.md')
ASSET_DIR = os.path.join(ROOT, 'assets', 'starfort')
WALL = ['intact', 'cracked', 'breached', 'endcap_a', 'endcap_b', 'socket_a', 'socket_b', 'footprint']
NEEDED = {p: WALL for p in ('curtain', 'bastion_face', 'bastion_flank', 'bastion_salient', 'bastion_shoulder_a75', 'bastion_shoulder_a66', 'flank_junction', 'flank_junction_a75',
                            'ravelin_wall', 'ravelin_salient', 'counterscarp', 'covered_way', 'bastion_gorge')}
NEEDED['sally_gate'] = WALL + ['door', 'door_2', 'bridge', 'frame', 'tunnel', 'socket_bridge']
NEEDED['ditch_floor'] = ['intact', 'silted', 'socket_a', 'socket_b', 'footprint']
NEEDED['glacis'] = ['intact', 'cracked', 'breached', 'socket_a', 'socket_b', 'footprint']
NEEDED['gun_platform'] = ['intact', 'cracked', 'breached', 'barrel', 'carriage', 'ammo', 'socket_terreplein', 'footprint']
NEEDED['powder_store'] = ['intact', 'cracked', 'breached', 'door', 'barrel_01', 'socket_door', 'footprint']
NEEDED['sentry_box'] = ['intact', 'cracked', 'breached', 'socket_mount', 'footprint']
NEEDED['guardhouse'] = ['intact', 'cracked', 'breached', 'door', 'socket_door', 'footprint']
NEEDED['flagstaff'] = ['intact', 'breached', 'flag', 'socket_base', 'footprint']
NEEDED['loose_props'] = ['stone_block_01', 'gabion_01', 'cannonballs', 'barrel_01', 'footprint']
_fails = []


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)


def read_glb(path):
    d = open(path, 'rb').read(); magic, ver, total = struct.unpack('<4sII', d[:12]); jl, jt = struct.unpack('<I4s', d[12:20]); js = json.loads(d[20:20 + jl].decode()); off = 20 + jl
    bl, bt = struct.unpack('<I4s', d[off:off + 8]); return dict(magic=magic, version=ver, total=total, size=len(d), json=js, bin=d[off + 8:off + 8 + bl], raw=d, jtype=jt, btype=bt)


def tri_count(g):
    js = g['json']; n = 0
    for m in js['meshes']:
        for pr in m['primitives']: n += js['accessors'][pr['indices']]['count'] // 3
    return n


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


def bbox(g):
    """bounding box of all mesh nodes except the footprint, with node translations summed down the tree"""
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
    check(g['magic'] == b'glTF' and g['version'] == 2 and g['total'] == g['size'] and g['jtype'] == b'JSON' and g['btype'] == b'BIN\x00', '%s: glTF 2.0 container, lengths agree' % tag)
    names = [n['name'] for n in js['nodes']]
    miss = [n for n in NEEDED[piece] if n not in names]
    check(not miss, '%s: named nodes present (missing %s)' % (tag, miss))
    check(len(set(names)) == len(names), '%s: node names are unique' % tag)
    check(not any('uri' in x for x in js.get('images', []) + js.get('buffers', [])), '%s: no external uris (everything is embedded)' % tag)
    check(not any(p in g['raw'] for p in (b'/home', b'/tmp/', b'/root', b'/Users', b'C:\\', b'scratchpad', b'claude')), '%s: no private paths in the file' % tag)
    check(set(js.get('extensionsUsed', [])) == set() and not js.get('extensionsRequired'), '%s: plain glTF 2.0, no extensions' % tag)
    check(all(pr.get('mode', 4) == 4 for m in js['meshes'] for pr in m['primitives']), '%s: triangle lists only' % tag)
    tri = tri_count(g); lo_, hi_ = SM.BUDGET[lod]
    check(lo_ <= tri <= hi_, '%s: %d triangles inside the %s budget %d to %d' % (tag, tri, lod, lo_, hi_))
    ex = js['scenes'][0]['extras']; check(ex['triangles'] == tri, '%s: the extras count matches the real triangle count' % tag)
    check(g['size'] <= SM.SIZE_KB[lod] * 1024, '%s: %.0f KB, under %d KB' % (tag, g['size'] / 1024.0, SM.SIZE_KB[lod]))
    ok = True
    for n in js['nodes']:
        if 'mesh' not in n: continue
        for pr in js['meshes'][n['mesh']]['primitives']:
            idx = acc(g, pr['indices']); ok &= len(idx) % 3 == 0 and int(idx.max()) < js['accessors'][pr['attributes']['POSITION']]['count'] and 'NORMAL' in pr['attributes']
    check(ok, '%s: whole triangles, indices in range, normals present' % tag)
    imgs = js.get('images', []); want = 1 if lod == 'far' else 3; check(len(imgs) == want, '%s: %d embedded images' % (tag, len(imgs)))
    good = True; sizes = []
    for im in imgs:
        v = js['bufferViews'][im['bufferView']]; d = g['bin'][v['byteOffset']:v['byteOffset'] + v['byteLength']]; sz = jpeg_size(d); good &= sz is not None and sz[2] == 3 and d[-2:] == b'\xff\xd9'; sizes.append(sz[:2] if sz else None)
    check(good and all(max(s) <= SM.QL[lod]['atlas'] for s in sizes), '%s: images are three-channel JPEGs no bigger than the atlas %s' % (tag, sizes))
    uv = np.concatenate([acc(g, pr['attributes']['TEXCOORD_0']).astype(float) / 65535.0 for m in js['meshes'] for pr in m['primitives'] if 'TEXCOORD_0' in pr['attributes']])
    check(uv.min() >= 0 and uv.max() <= 1.0001, '%s: texture coordinates inside 0..1' % tag)
    fp = [n for n in js['nodes'] if n['name'] == 'footprint'][0]; poly = fp['extras']['polygon']
    area = 0.5 * abs(sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))))
    check(len(poly) >= 4 and area > 0.5, '%s: footprint polygon of %.1f m2' % (tag, area))
    socks = [n for n in js['nodes'] if n['name'].startswith('socket_')]
    check(all(n['extras'].get('role') == 'socket' and 'yaw_deg' in n['extras'] and 'translation' in n for n in socks) and len(socks) == len(ex['sockets']), '%s: %d sockets with position and yaw, listed in the scene extras' % (tag, len(socks)))
    return g


_CACHE = {}


def built():
    if not _CACHE:
        out = tempfile.mkdtemp(prefix='sf_test_')
        for p, lods in (('curtain', SM.LODS), ('sentry_box', SM.LODS), ('flagstaff', ('live', 'far')), ('sally_gate', ('live', 'far'))):
            for lod in lods:
                f = os.path.join(out, SM.out_name(p, lod)); SM.write_glb(f, SM.build(p, lod)); _CACHE[(p, lod)] = f
    return _CACHE


def test_args():
    a = SM.parse_args(['--out', 'x']); check(a.lods == ['hero', 'live', 'far'] and len(a.pieces) == len(SM.PIECES) == 22, 'defaults: all levels, all 22 pieces')
    for bad in ([], ['--out', 'x', '--lod', 'huge'], ['--out', 'x', '--piece', 'castle']):
        try: SM.parse_args(bad); ok = False
        except SystemExit: ok = True
        check(ok, 'bad arguments are refused: %s' % (bad,))


def test_built_files():
    for (p, lod), f in sorted(built().items()):
        g = glb_checks('built %s %s' % (p, lod), f, p, lod)
    g = read_glb(built()[('curtain', 'hero')]); lo, hi = bbox(g); ex = g['json']['scenes'][0]['extras']
    fp = np.array(ex['footprint_polygon_xz']); ext = fp.max(0) - fp.min(0)
    check(abs(ext[0] - 4.0) < 0.01, 'curtain segment is 4 m long (footprint x extent %.3f m)' % ext[0])
    check(abs(ext[1] - (DEPTH_CHECK + 0.2)) < 0.01, 'curtain is %.1f m deep from the scarp foot to the inner toe' % ext[1])
    check(-2.2 <= lo[1] <= -1.9 and 4.1 <= hi[1] <= 4.6, 'curtain rises from the ditch floor at -2 m to the parapet crest and the tufts (%.2f to %.2f m)' % (lo[1], hi[1]))
    check(abs((hi[0] - lo[0]) - 4.0) < 0.2, 'the whole mesh, rubble and caps included, stays within 0.2 m of the 4 m run (x extent %.2f m)' % (hi[0] - lo[0]))
    so = {s['name']: s for s in ex['sockets']}
    check(abs(so['socket_b']['position'][0] - so['socket_a']['position'][0] - 4.0) < 1e-6 and abs(abs(so['socket_a']['yaw_deg'] - so['socket_b']['yaw_deg']) - 180.0) < 1e-6, 'curtain sockets are 4 m apart on the face line, facing opposite ways')
    hp = ex['hp_hint']; check(hp['facing']['hp_per_m'] == 52 and hp['backing']['hp_per_m'] == 30 and hp['state_hp']['breached'] == 0.0 and hp['state_hp']['cracked'] == hp['state_hp']['intact'] / 2, 'hp_hint uses the stone (52) and earth (30) hit points per metre of fortify/ballistics_toy.py and halves at cracked')
    from_toy = open(os.path.join(ROOT, 'fortify', 'ballistics_toy.py')).read()
    check("'stone':    dict(hp_per_m=52" in from_toy and "'earth':    dict(hp_per_m=30" in from_toy, 'the toy model still has the numbers the hints are taken from')
    gt = read_glb(built()[('sally_gate', 'live')])
    for n in gt['json']['nodes']:
        if n['name'] == 'bridge': check(n['extras'].get('movable') == 'swing' and n['extras'].get('swing')[0] == 'x', 'the drawbridge node swings about X')
        if n['name'] == 'door': check(n['extras'].get('movable') == 'swing' and n['extras'].get('hp_hint')['material'] == 'timber', 'the door node swings and carries timber hit points')
    check('animations' in gt['json'] and len(gt['json']['animations'][0]['channels']) >= 3, 'the gate has an open clip moving door, door_2 and bridge')


DEPTH_CHECK = SM.DEPTH


def test_lod_consistency():
    for p in ('curtain', 'sentry_box'):
        names = [{n['name'] for n in read_glb(built()[(p, lod)])['json']['nodes']} for lod in SM.LODS]
        check(set(NEEDED[p]) <= names[2] and names[2] <= names[1] <= names[0], '%s: far names are a subset of live, live of hero, the required parts are in all three' % p)
        s = [os.path.getsize(built()[(p, lod)]) for lod in SM.LODS]; check(s[0] > s[1] > s[2], '%s: hero > live > far in bytes' % p)


def test_deterministic():
    d = tempfile.mkdtemp(prefix='sf_det_')
    for p in ('curtain', 'sally_gate'):
        for lod in ('far', 'live'):
            SM.write_glb(os.path.join(d, 'a.glb'), SM.build(p, lod)); SM.write_glb(os.path.join(d, 'b.glb'), SM.build(p, lod))
            check(open(os.path.join(d, 'a.glb'), 'rb').read() == open(os.path.join(d, 'b.glb'), 'rb').read(), '%s %s: two builds give identical bytes' % (p, lod))


def test_dimensions_from_research():
    check(SM.STRAIGHT_LEN['curtain'] == 4.0, 'a curtain segment is 4 m (the research table had 3 m; the brief says 4 m)')
    check(SM.STRAIGHT_LEN['bastion_face'] == 6.0, 'a bastion face segment is 6 m (research: fort_bastion_point 6 x 6)')
    check(SM.GATE_HW * 2 == 2.0, 'the sally gate opening is 2 m wide')
    for p in SM.STRAIGHT_LEN:
        k = SM.build(p, 'far'); so = {s['name']: s for s in k.sockets}; L = SM.STRAIGHT_LEN[p]
        d = so['socket_b']['position'][0] - so['socket_a']['position'][0]
        check(abs(d - L) < 1e-6, '%s: sockets %.3f m apart (expected %.1f)' % (p, d, L))
    for p, (a1, a2, turn) in SM.CORNER_DEF.items():
        k = SM.build(p, 'far'); so = {s['name']: s for s in k.sockets}; (xa, za), (xb, zb), yb = SL.piece_ends(p)
        check(np.allclose(so['socket_a']['position'][::2], (xa, za), atol=1e-3) and np.allclose(so['socket_b']['position'][::2], (xb, zb), atol=1e-3) and abs(((so['socket_b']['yaw_deg'] - yb + 180) % 360) - 180) < 1e-3, '%s: sockets of the model agree with the layout constants (turn %.0f degrees)' % (p, turn))
        # the rear mitre needs arms of at least depth * tan(half the convex turn)
        dep = SM.RAVELIN_DEPTH if p == 'ravelin_salient' else SM.DEPTH
        if turn < 0: check(a1 >= dep * math.tan(math.radians(-turn / 2.0)) - 1e-6, '%s: arms %.1f m cover the rear mitre (%.1f m needed for a depth of %.1f m)' % (p, a1, dep * math.tan(math.radians(-turn / 2.0)), dep))
    for n in (3, 4, 5):
        s = -SM.SAL_TURN - 2 * SM.SHOULDER[n][0] + 2 * SM.JUNC_TURN[n]
        check(abs(s + 360.0 / n) < 1e-9, 'n = %d: the turns of one unit add up to -360 / n (%.3f degrees)' % (n, s))


def test_layout_closes():
    for n in (3, 4, 5):
        for radius, yaw, ditch in ((30.0, 0.0, 6.0), (60.0, 33.0, 6.0), (45.0, 217.0, 8.0)):
            lay = SL.layout(n, radius, ditch, yaw)
            wall = [p for p in lay['parts'] if p['role'] == 'wall']; sock = {}
            for name in set(p['piece'] for p in wall): sock[name] = {s['name']: s for s in SM.build(name, 'far').sockets}
            worst = 0.0; worst_yaw = 0.0
            for i, p in enumerate(wall):
                q = wall[(i + 1) % len(wall)]
                sb = sock[p['piece']]['socket_b']; sa = sock[q['piece']]['socket_a']
                (bx, bz), byaw = SL.socket_world(p, sb['position'], sb['yaw_deg']); (ax, az), ayaw = SL.socket_world(q, sa['position'], sa['yaw_deg'])
                worst = max(worst, math.hypot(bx - ax, bz - az)); worst_yaw = max(worst_yaw, abs(((byaw - ayaw) % 360.0) - 180.0))
            check(worst < 0.01, 'n = %d, radius asked %.0f, yaw %.0f: all %d wall joints within 1 cm (worst %.2g m), the ring closes' % (n, radius, yaw, len(wall), worst))
            check(worst_yaw < 1e-6, 'n = %d: every pair of sockets faces opposite ways (worst error %.2g degrees)' % (n, worst_yaw))
            check(lay['closure']['end_gap_m'] < 0.01 and abs(lay['closure']['heading_error_deg']) < 1e-6, 'n = %d: the walk ends where it began (gap %.2g m)' % (n, lay['closure']['end_gap_m']))
            check(len(set((round(p['x'], 3), round(p['z'], 3), p['piece']) for p in lay['parts'])) == len(lay['parts']), 'n = %d: no two parts sit on the same spot' % n)
            rmin = SL.layout(n, 1.0, ditch, yaw)['radius']
            check(lay['radius'] >= rmin - 1e-9 and (radius < rmin or abs(lay['radius'] - radius) <= 4.0), 'n = %d: radius %.1f m (asked %.0f m, smallest star %.1f m; a whole number of 4 m curtain pieces moves it in steps of about 3 m)' % (n, lay['radius'], radius, rmin))
    lay = SL.layout(5, 52.0)
    cnt = {}
    for p in lay['parts']: cnt[p['piece']] = cnt.get(p['piece'], 0) + 1
    check(cnt.get('bastion_salient') == 5 and cnt.get('sally_gate') == 1 and cnt.get('ravelin_salient') == 5 and cnt.get('sentry_box') == 5 and cnt.get('flagstaff') == 1, '5-bastion star: five tips, five ravelins, five sentry boxes, one gate, one flagstaff')
    lay3 = SL.layout(3, 40.0); check(any(p['piece'] == 'flank_junction_a75' for p in lay3['parts']) and any(p['piece'] == 'bastion_shoulder_a75' for p in lay3['parts']), '3-bastion star uses the 75 degree junction and shoulder')
    lay5 = SL.layout(5, 52.0); check(any(p['piece'] == 'bastion_shoulder_a66' for p in lay5['parts']) and not any(p['piece'] == 'flank_junction_a75' for p in lay5['parts']), '5-bastion star uses the 66 degree shoulder and the 90 degree junction')


def test_fire_covers_neighbours():
    for n, radius in ((3, 40.0), (4, 46.0), (5, 52.0), (5, 70.0)):
        lay = SL.layout(n, radius, 6.0, 11.0)
        fc = SL.fire_check(lay); dg = SL.dead_ground(lay)
        worst_face = min(f['face_covered'] for f in fc); worst_cur = min(f['curtain_covered'] for f in fc)
        check(len(fc) == 2 * n, 'n = %d: %d flanks checked, two on every bastion' % (n, len(fc)))
        check(worst_face >= 0.999, 'n = %d (radius %.0f): every flank covers the whole face of the neighbouring bastion by a clear line of fire within 78 degrees of its normal (worst %.2f of %d samples)' % (n, lay['radius'], worst_face, fc[0]['face_samples']))
        check(worst_cur >= 0.999, 'n = %d: every flank covers the whole curtain it looks along (worst %.2f)' % (n, worst_cur))
        check(dg['unseen'] == 0 and dg['samples'] > 10, 'n = %d: no dead ground along the curtains: %d of %d sample points unseen from every flank' % (n, dg['unseen'], dg['samples']))
    # the check must be able to fail: stretch a bastion by moving a flank's gun behind the wall
    lay = SL.layout(4, 46.0); poly = lay['polygons']['face_line']; f = SL.flank_guns(lay)[0]
    a, b = poly[0], poly[1]; mx, mz = 0.5 * (a[0] + b[0]), 0.5 * (a[1] + b[1]); L = math.hypot(b[0] - a[0], b[1] - a[1]); nx, nz = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
    check(not SL.clear_line((mx - nx * 5, mz - nz * 5), (mx + nx * 5, mz + nz * 5), poly) and SL.clear_line((mx + nx * 3, mz + nz * 3), (mx + nx * 9, mz + nz * 9), poly), 'the check can fail: a line through the wall outline is blocked, one outside it is clear')
    # a 90 degree shoulder lays the neighbour's face edge-on to the flank: the same check must then report uncovered face samples
    import starfort_model as SMM
    old = (SMM.SHOULDER[4], SMM.CORNER_DEF['bastion_shoulder_a75'])
    SMM.CORNER_DEF['bastion_shoulder_a75'] = (7.5, 7.5, -90.0); SMM.CORNER_DEF['flank_junction'] = (SMM.JUNC_ARM, SMM.JUNC_ARM, 105.0 - 15.0 + 0.0)
    try:
        parts, pos, phi = SL.walk_ring(4, 4, 1, 0, 0.0, -1)
        for p in parts: p['role'] = 'wall'
        lay2 = dict(n=4, parts=parts, polygons={'face_line': SL.simplify(SL.polygon_points(parts))}); fc2 = SL.fire_check(lay2)
        check(min(x['face_covered'] for x in fc2) < 0.9, 'with a 90 degree shoulder the neighbour face is edge-on and the check reports it uncovered (%.2f)' % min(x['face_covered'] for x in fc2))
    finally:
        SMM.CORNER_DEF['bastion_shoulder_a75'] = (SMM.SHOULDER_ARM[75.0], SMM.SHOULDER_ARM[75.0], -75.0); SMM.CORNER_DEF['flank_junction'] = (SMM.JUNC_ARM, SMM.JUNC_ARM, 90.0)


def test_layout_deterministic():
    a = json.dumps(SL.layout(5, 52.0, 6.0, 17.0), sort_keys=True); b = json.dumps(SL.layout(5, 52.0, 6.0, 17.0), sort_keys=True)
    check(a == b, 'the layout is deterministic (identical json from two runs)')
    check(json.dumps(SL.layout(4, 46.0), sort_keys=True) != json.dumps(SL.layout(4, 46.0, 6.0, 9.0), sort_keys=True), 'a different yaw gives a different layout')
    try: SL.layout(6, 40.0); ok = False
    except ValueError: ok = True
    check(ok, 'n outside 3 to 5 is refused')


def test_outer_works():
    lay = SL.layout(5, 52.0, 6.0, 5.0)
    poly = lay['polygons']; face = poly['face_line']
    def perim(p): return sum(math.hypot(p[(i + 1) % len(p)][0] - p[i][0], p[(i + 1) % len(p)][1] - p[i][1]) for i in range(len(p)))
    for role, piece, off in (('ditch', 'ditch_floor', 0.0), ('ditch_wall', 'counterscarp', 6.0), ('covered_way', 'covered_way', 7.3), ('glacis', 'glacis', 11.9)):
        parts = [p for p in lay['parts'] if p['piece'] == piece and p.get('ravelin') is None]
        total = sum(4.0 * p['scale'][0] for p in parts)
        need = perim(SL.simplify(SL.offset_polygon(face, off)))
        gap = 40.0 * 5 if role in ('ditch_wall', 'covered_way', 'glacis') else 0.0     # the gap left in front of each ravelin (at most 20 m)
        check(total <= need + 1.0 and total >= need - gap - 1.0, '%s: %.0f m of %s along %.0f m of ring (ravelin gaps %.0f m)' % (role, total, piece, need, gap))
        sc = [p['scale'][0] for p in parts]; check(0.69 < min(sc) and max(sc) < 1.36, '%s pieces are stretched between %.2f and %.2f along their length' % (piece, min(sc), max(sc)))
    check(all(p['scale'][2] == 1.0 or p['piece'] in ('ditch_floor', 'loose_props') for p in lay['parts']), 'only the ditch floor (across) and the small prop piles (all axes) are scaled across their width')
    lay8 = SL.layout(5, 52.0, 8.0, 5.0); check(lay8['parts'][-1] is not None and abs(max(p['scale'][2] for p in lay8['parts']) - 8.0 / 6.0) < 1e-6, 'a ditch of 8 m scales the floor module across by 8 / 6')


def test_committed_assets():
    if not os.path.isdir(ASSET_DIR): check(True, 'no committed GLBs yet'); return
    files = [f for f in os.listdir(ASSET_DIR) if f.endswith('.glb')]; tot = sum(os.path.getsize(os.path.join(ASSET_DIR, f)) for f in os.listdir(ASSET_DIR))
    check(len(files) == len(SM.PIECES) * 3, '%d committed GLBs (22 pieces x 3 levels)' % len(files)); check(tot < SM.TOTAL_KB * 1024, 'committed set is %.2f MB, under 8 MB' % (tot / 1048576.0))
    for p in SM.PIECES:
        for lod in SM.LODS:
            f = os.path.join(ASSET_DIR, SM.out_name(p, lod))
            if os.path.exists(f): glb_checks('committed %s %s' % (p, lod), f, p, lod)
        names = []
        for lod in SM.LODS:
            f = os.path.join(ASSET_DIR, SM.out_name(p, lod))
            if os.path.exists(f): names.append({n['name'] for n in read_glb(f)['json']['nodes']})
        if len(names) == 3: check(set(NEEDED[p]) <= names[2] and names[2] <= names[1] <= names[0], '%s: names nest far <= live <= hero and keep the required nodes' % p)
        sizes = [os.path.getsize(os.path.join(ASSET_DIR, SM.out_name(p, lod))) for lod in SM.LODS if os.path.exists(os.path.join(ASSET_DIR, SM.out_name(p, lod)))]
        if len(sizes) == 3: check(sizes[0] > sizes[1] > sizes[2], '%s: hero > live > far in bytes' % p)
        f = os.path.join(ASSET_DIR, SM.out_name(p, 'live'))
        if os.path.exists(f):
            ex = read_glb(f)['json']['scenes'][0]['extras']
            if p in SM.STRAIGHT_LEN: so = {s['name']: s for s in ex['sockets']}; check(abs(so['socket_b']['position'][0] - so['socket_a']['position'][0] - SM.STRAIGHT_LEN[p]) < 1e-3, '%s: committed sockets are %.0f m apart' % (p, SM.STRAIGHT_LEN[p]))
            if p in SM.CORNER_DEF: so = {s['name']: s for s in ex['sockets']}; (xa, za), (xb, zb), yb = SL.piece_ends(p); check(abs(so['socket_b']['position'][0] - xb) < 1e-3 and abs(so['socket_b']['position'][2] - zb) < 1e-3, '%s: committed corner sockets agree with the layout' % p)
            hp = ex.get('hp_hint')
            if p in SM.STRAIGHT_LEN or p in SM.CORNER_DEF: check(hp is not None and hp['facing']['hp_per_m'] == 52 and hp['backing']['hp_per_m'] == 30 and hp['state_hp']['breached'] == 0.0, '%s: hit point hint from the toy model (stone 52, earth 30 per metre)' % p)
            elif hp: check(hp['state_hp']['breached'] == 0.0 or 'deck' in hp or 'mast' in hp, '%s: hit point hint has the states' % p)


def test_source_clean():
    banned = ['import requests', 'import urllib', 'urllib.', 'import socket', 'import http', 'http.client', 'import subprocess', 'subprocess.', 'os.system', 'os.popen',
              'os.remove', 'os.unlink', 'os.rmdir', 'shutil.', 'rmtree', 'eval(', 'exec(', 'ftplib', 'smtplib', 'webbrowser']
    for path in SRC_PATHS:
        src = open(path).read(); nm = os.path.basename(path)
        hits = [w for w in banned if w in src]; check(not hits, '%s: no network, subprocess or delete calls %s' % (nm, hits))
        check(not re.search(r'https?://|www\.', src), '%s: no web addresses' % nm)
        check(not re.search(r'/(tmp|home|root|Users)/\w', src), '%s: no private or absolute paths' % nm)
        check(not re.search(r'(api[_-]?key|secret|password|token)\s*=', src, re.I), '%s: no secrets' % nm)
    pat = re.compile(r'\b(' + '|'.join(('gore', 'blood', 'corpse', 'dead body', 'skeleton', 'skull', 'murder', 'kill', 'weapon', 'gun', 'brand', 'logo')) + r')\b', re.I)
    text = ''.join(open(p).read() for p in SRC_PATHS) + (open(DOC_PATH).read() if os.path.exists(DOC_PATH) else '')
    m = pat.search(text); check(not m, 'no forbidden words in the scripts or the note %s' % (m.group(0) if m else ''))
    check(os.path.exists(DOC_PATH) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC_PATH).read()), 'STAR_FORT_KIT.md exists and has no private paths')
    check('/*' not in open(SRC_PATHS[0]).read().replace('"""', ''), 'python comments only (no slash-star blocks)')
    place_words = re.compile(r'\b(vauban|neuf-brisach|saint-martin|longwy|blaye|besan[cç]on|lille|carcassonne|fort boyard|fort de)\b', re.I)
    m = place_words.search(text); check(not m, 'no real fort or place names in the scripts or the note %s' % (m.group(0) if m else ''))
    check(not os.path.exists(os.path.join(ROOT, 'islands_look.html')) or 'starfort' not in open(os.path.join(ROOT, 'islands_look.html')).read(), 'no page file refers to the star fort kit yet')


def test_bpy_import():
    try: import bpy
    except Exception: check(True, 'bpy not installed here: import check skipped'); return
    files = [built()[(p, lod)] for (p, lod) in sorted(built())][:3] + [built()[('sally_gate', 'live')]]
    if os.path.isdir(ASSET_DIR):
        for p in ('bastion_salient', 'gun_platform', 'powder_store'):
            f = os.path.join(ASSET_DIR, SM.out_name(p, 'hero'))
            if os.path.exists(f): files.append(f)
    for f in files:
        bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=f)
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']; tr = sum(len(o.data.polygons) for o in meshes)
        check(len(meshes) >= 3 and tr > 100, 'bpy %s imports: %d mesh objects, %d faces' % (bpy.app.version_string, len(meshes), tr))
        check(any(o.name.startswith('intact') or o.name.startswith('footprint') for o in meshes), 'bpy: named nodes survive the import (%s)' % os.path.basename(f))


def main():
    for name, fn in sorted(globals().items()):
        if name.startswith('test_') and callable(fn): fn()
    print('\n%d failed' % len(_fails) if _fails else '\nall passed')
    return 1 if _fails else 0


if __name__ == '__main__':
    sys.exit(main())
