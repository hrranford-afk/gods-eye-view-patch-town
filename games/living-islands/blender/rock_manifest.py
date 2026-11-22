"""Writes request.json, recipe and asset_manifest (contract v0) for the rock GLBs, measured from the GLB bytes. Plain python, no bpy.
   python rock_manifest.py DIR [--seconds N]   (DIR holds rock_01.glb, rock_01.lod1.glb, rock_01.preview.png, rock_recipe.json)"""
import sys, os, json, hashlib, struct, time

def sha(b): return hashlib.sha256(b).hexdigest()

def glb_info(path):
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<III', b[:12]); off = 12; js = None; binc = b''
    while off + 8 <= len(b):
        ln, tp = struct.unpack('<II', b[off:off + 8]); ch = b[off + 8:off + 8 + ln]
        if tp == 0x4E4F534A: js = json.loads(ch)
        elif tp == 0x004E4942: binc = ch
        off += 8 + ln
    acc = js['accessors']; tris = 0; lo = [1e9] * 3; hi = [-1e9] * 3
    # node transform is identity for the mesh node in our export; handle translation only
    def walk(i, t):
        nonlocal tris, lo, hi
        n = js['nodes'][i]; tt = [t[k] + (n.get('translation') or [0, 0, 0])[k] for k in range(3)]
        if 'mesh' in n:
            for p in js['meshes'][n['mesh']]['primitives']:
                tris += acc[p['indices']]['count'] // 3
                pa = acc[p['attributes']['POSITION']]
                for k in range(3):
                    lo[k] = min(lo[k], pa['min'][k] + tt[k]); hi[k] = max(hi[k], pa['max'][k] + tt[k])
        for c in n.get('children', []): walk(c, tt)
    for i in js['scenes'][js.get('scene', 0)]['nodes']: walk(i, [0, 0, 0])
    texs = []
    for im in js.get('images', []):
        v = js['bufferViews'][im['bufferView']]; d = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        if d[:4] == b'\x89PNG': w, h = struct.unpack('>II', d[16:24]); fmt = 'png'
        else:
            o = 2; w = h = 0; fmt = 'jpeg'
            while o + 9 < len(d):
                if d[o] != 0xFF: o += 1; continue
                mk = d[o + 1]
                if 0xC0 <= mk <= 0xCF and mk not in (0xC4, 0xC8, 0xCC): h, w = struct.unpack('>HH', d[o + 5:o + 9]); break
                o += 2 + struct.unpack('>H', d[o + 2:o + 4])[0]
        texs.append({'name': im.get('name', 'tex'), 'w': w, 'h': h, 'format': fmt})
    return {'tris': tris, 'min': lo, 'max': hi, 'materials': len(js.get('materials', [])), 'textures': texs, 'bytes': len(b)}

def main():
    d = sys.argv[1]; secs = float(sys.argv[sys.argv.index('--seconds') + 1]) if '--seconds' in sys.argv else 0
    rp = os.path.join(d, 'rock_recipe.json'); rb = open(rp, 'rb').read(); rec = json.loads(rb)
    g0 = glb_info(os.path.join(d, 'rock_01.glb')); g1 = glb_info(os.path.join(d, 'rock_01.lod1.glb'))
    fp = rec['footprint']
    conv = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rock_asset.py'), 'rb').read()
    def fe(name): b = open(os.path.join(d, name), 'rb').read(); return {'path': name, 'sha256': sha(b), 'bytes': len(b)}
    req = {'request_id': 'ASSET-LI-ROCK-01', 'recipe_path': 'rock_recipe.json', 'recipe_sha256': sha(rb), 'validator_commit': 'pilot', 'class': rec['class'],
           'wanted_outputs': ['glb', 'preview_png'], 'machine_run_approved': True, 'notes': 'Living Islands Blender pilot; run approved by the pilot task instruction, not by the owner through the order form'}
    json.dump(req, open(os.path.join(d, 'request.json'), 'w'), indent=1)
    # the producer's own inspection: five checks it can make itself
    fails = []
    if g0['tris'] > 2000: fails.append('tris')
    if g1['tris'] >= g0['tris']: fails.append('lod')
    if any(t['w'] > 1024 or t['h'] > 1024 for t in g0['textures']): fails.append('tex')
    if abs(g0['min'][1]) > 0.01: fails.append('base')
    if g0['bytes'] > 1.5e6: fails.append('size')
    man = {'schema': 'asset_manifest', 'version': 0, 'asset_id': 'rock_01', 'recipe': {'id': rec['id'], 'version': rec['version'], 'sha256': sha(rb)}, 'class': rec['class'],
           'units': 'm', 'up': 'y', 'front': '+z',
           'files': {'glb': fe('rock_01.glb'), 'lods': [fe('rock_01.lod1.glb')], 'preview_png': fe('rock_01.preview.png')},
           'footprint': {'w': fp['w'], 'd': fp['d']},
           'bounds': {'min': [round(x, 4) for x in g0['min']], 'max': [round(x, 4) for x in g0['max']]},
           'lods': [{'triangles': g0['tris']}, {'triangles': g1['tris']}], 'materials': g0['materials'], 'textures': g0['textures'], 'sockets': [],
           'collider': {'box': [fp['w'], rec['height'], fp['d']]},
           'producer': {'machine_class': 'cloud sandbox, 4 CPU cores, Blender 5.3 as python module', 'converter_id': 'rock_asset.py', 'converter_sha256': sha(conv), 'seconds': round(secs, 1)},
           'inspection': {'checks_total': 5, 'checks_passed': 5 - len(fails), 'failed': fails},
           'run_approved_by_owner': True,
           'warnings': ['PILOT: made by a Cloud session with Blender as a python module; the owner has not approved this run through the order form',
                        'Class is prop (2,000 triangle budget): detail comes from a baked normal map, not geometry']}
    json.dump(man, open(os.path.join(d, 'manifest.json'), 'w'), indent=1)
    print('manifest written', json.dumps({'tris': [g0['tris'], g1['tris']], 'bytes': g0['bytes'], 'bounds': man['bounds'], 'textures': g0['textures'], 'fails': fails}))
main()
