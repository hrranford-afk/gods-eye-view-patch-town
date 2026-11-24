"""Tests for blender/seal_model.py (the seals: grey male, grey female, white pup, harbour seal; GLB per level of detail). Pure python + numpy, no Blender (one optional import check runs only where bpy exists).
Run: python3 games/living-islands/tests/test_seal_model.py        (also works under pytest)
The GLBs are built into a scratch folder with the model's own writer, then read back with struct and json only (the same checks run on the committed files in assets/seals/ when they exist)."""
import os, re, sys, json, struct, math, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BL = os.path.join(ROOT, 'blender')
sys.path.insert(0, BL)
import numpy as np
import seal_model as SM

SRC_PATHS = [os.path.join(BL, 'seal_model.py'), os.path.join(BL, 'seal_tex.py'), os.path.join(BL, 'seal_shots.py')]
DOC_PATH = os.path.join(ROOT, 'SEAL_MODEL.md')
ASSET_DIR = os.path.join(ROOT, 'assets', 'seals')
NEEDED = ['eye_target', 'root', 'body', 'chest', 'neck', 'head', 'jaw', 'hips', 'tail', 'eye_l', 'eye_r', 'whisker_l', 'whisker_r', 'flipper_fl_l', 'flipper_fl_r', 'flipper_hind', 'flipper_hind_l', 'flipper_hind_r', 'footprint', 'seal_skin']
CLIPS = {'rest': 5.0, 'alert': 6.0, 'scratch': 4.2, 'hump_crawl': 2.8, 'slide_in': 3.8, 'swim': 1.6, 'surface_look': 5.0, 'pup_cry': 3.0, 'yawn': 3.4, 'look_around': 6.0, 'blink_loop': 4.2, 'curious_tilt': 3.6}
LOOPING = ['rest', 'alert', 'hump_crawl', 'swim', 'surface_look', 'pup_cry', 'look_around', 'blink_loop', 'curious_tilt']
LENGTH = {'grey_male': (2.2, 2.4), 'grey_female': (1.7, 1.9), 'grey_pup': (0.95, 1.05), 'harbour': (1.5, 1.75)}
_fails = []
def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: _fails.append(msg)

_CACHE = {}
def built():
    """{(species, lod): path}, built once into a scratch folder"""
    if not _CACHE:
        out = tempfile.mkdtemp(prefix='seal_test_')
        for sp in SM.SPECIES:
            for lod in SM.LODS:
                p = os.path.join(out, SM.out_name(sp, lod)); SM.write_glb(p, SM.build(sp, lod)); _CACHE[(sp, lod)] = p
    return _CACHE

def read_glb(path):
    d = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<4sII', d[:12]); jl, jt = struct.unpack('<I4s', d[12:20]); js = json.loads(d[20:20 + jl].decode()); off = 20 + jl
    bl, bt = struct.unpack('<I4s', d[off:off + 8]); binary = d[off + 8:off + 8 + bl]
    return dict(magic=magic, version=ver, total=total, size=len(d), json=js, bin=binary, raw=d)

def read_acc(g, ai):
    a = g['json']['accessors'][ai]; v = g['json']['bufferViews'][a['bufferView']]; ct = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a['componentType']]
    nc = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]; off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(g['bin'], ct, a['count'] * nc, off).reshape(a['count'], nc)

def tri_count(g):
    n = 0
    for m in g['json']['meshes']:
        for pr in m['primitives']: n += g['json']['accessors'][pr['indices']]['count'] // 3
    return n

def jpeg_size(data):
    i = 2
    while i < len(data):
        m = data[i + 1]; ln = struct.unpack('>H', data[i + 2:i + 4])[0]
        if m in (0xC0, 0xC2): h, w = struct.unpack('>HH', data[i + 5:i + 9]); return w, h
        i += 2 + ln
    return None

def node_names(g): return [n['name'] for n in g['json']['nodes']]

def run_glb_checks(tag, path, sp, lod):
    g = read_glb(path); js = g['json']; names = node_names(g)
    check(g['magic'] == b'glTF' and g['version'] == 2 and g['total'] == g['size'], '%s: glTF 2.0 container' % tag)
    check(all(n in names for n in NEEDED), '%s: named nodes %s' % (tag, [n for n in NEEDED if n not in names]))
    lo, hi = SM.BUDGET[lod]; tris = tri_count(g); check(lo <= tris <= hi, '%s: %d triangles in budget %d to %d' % (tag, tris, lo, hi))
    kb = g['size'] / 1024.0; check(kb < SM.SIZE_KB[lod], '%s: file %.0f KB under %d KB' % (tag, kb, SM.SIZE_KB[lod]))
    check(all('uri' not in b for b in js['buffers']) and not any('uri' in i for i in js.get('images', [])), '%s: no external uris' % tag)
    raw = g['raw']; check(not any(p in raw for p in (b'/home', b'/tmp/', b'/root', b'/Users', b'C:\\', b'scratchpad', b'claude')), '%s: no private paths in the file' % tag)
    sk = js['skins'][0]; jn = [js['nodes'][j]['name'] for j in sk['joints']]
    check(all(n in jn for n in ('root', 'body', 'head', 'jaw', 'tail', 'flipper_fl_l', 'flipper_hind')) and len(read_acc(g, sk['inverseBindMatrices'])) == len(jn), '%s: skin joints and inverse bind matrices' % tag)
    bad = 0
    for pr in js['meshes'][0]['primitives']:
        at = pr['attributes']; J = read_acc(g, at['JOINTS_0']); W = read_acc(g, at['WEIGHTS_0'])
        if J.max() >= len(jn) or not np.all(W.astype(int).sum(1) == 255): bad += 1
    check(bad == 0, '%s: joints in range and weights sum to 1' % tag)
    okb = True
    for m in js['meshes']:
        for pr in m['primitives']:
            P = read_acc(g, pr['attributes']['POSITION']); a = js['accessors'][pr['attributes']['POSITION']]
            if not (np.all(P.min(0) >= np.array(a['min']) - 1e-5) and np.all(P.max(0) <= np.array(a['max']) + 1e-5)): okb = False
            if read_acc(g, pr['indices']).max() >= len(P): okb = False
    check(okb, '%s: accessor bounds and indices valid' % tag)
    an = {a['name']: a for a in js['animations']}
    want = {k: v for k, v in CLIPS.items() if not (lod == 'far' and k == 'blink_loop')}      # blink_loop plays on morph targets, which the far level does not have
    check(sorted(an) == sorted(want), '%s: clip names %s' % (tag, sorted(an)))
    ok = True
    for cn, dur in want.items():
        a = an[cn]; mx = 0
        for s in a['samplers']: mx = max(mx, float(read_acc(g, s['input']).max()))
        ok = ok and abs(mx - dur) < 1e-3 and len(a['channels']) >= 2
        for ch in a['channels']:
            sm = a['samplers'][ch['sampler']]; o = read_acc(g, sm['output']); i = read_acc(g, sm['input'])
            ok = ok and (len(o) == len(i) if ch['target']['path'] != 'weights' else len(o) % len(i) == 0) and np.all(np.isfinite(o)) and np.all(np.diff(i[:, 0]) > 0)
    check(ok, '%s: all clips (%d), durations match, channels valid' % (tag, len(want)))
    lo_, hi_ = SM.LOD[lod], None
    ex = js['scenes'][0]['extras']; d = ex['dimensions_m']
    check(LENGTH[sp][0] <= d['length_with_flippers'] <= LENGTH[sp][1], '%s: length %.2f m in %s' % (tag, d['length_with_flippers'], LENGTH[sp]))
    check(0.15 < d['height'] < 0.6 and d['width'] > 0.3, '%s: height %.2f width %.2f plausible' % (tag, d['height'], d['width']))
    if lod != 'far':
        im = [js['images'][i] for i in range(len(js['images']))]; sizes = []
        for i in im:
            v = js['bufferViews'][i['bufferView']]; sizes.append(jpeg_size(g['bin'][v['byteOffset']:v['byteOffset'] + v['byteLength']]))
        check(len(im) == 3 and sizes[0] == SM.LOD[lod]['tex']['atlas'] and all(s[0] % 16 == 0 and s[1] % 16 == 0 for s in sizes), '%s: three JPEG maps, colour at atlas size %s' % (tag, sizes))
        uv = np.concatenate([read_acc(g, pr['attributes']['TEXCOORD_0']) for pr in js['meshes'][0]['primitives'] if 'TEXCOORD_0' in pr['attributes']])
        check(uv.min() >= 0 and uv.max() <= 65535, '%s: texture coordinates inside 0 to 1' % tag)
        check('KHR_materials_variants' in js.get('extensionsUsed', []) and len(js['extensions']['KHR_materials_variants']['variants']) == 2, '%s: dry and wet material variants' % tag)
    else:
        check(any('COLOR_0' in pr['attributes'] for pr in js['meshes'][0]['primitives']) and 'images' not in js, '%s: far level uses vertex colours, no images' % tag)
    return g


def test_face():
    # eye size relative to head width: pup > harbour > cow > bull (large round eyes on the pup and the dog-like harbour seal; the grey bull has the smallest in proportion)
    ratio = {}
    for sp in SM.SPECIES:
        b = SM.Body(sp); zc, hh, a, cap = b.rings(np.array([b.t_eye])); ratio[sp] = 2 * SM.SP[sp]['eye_r'] / (2 * float(a[0]))
    check(ratio['grey_pup'] > ratio['harbour'] > ratio['grey_female'] > ratio['grey_male'] > 0.2, 'eye diameter against head width: %s' % {k: round(v, 2) for k, v in ratio.items()})
    for sp, lod in (('grey_male', 'live'), ('harbour', 'hero'), ('grey_pup', 'hero')):
        g = read_glb(built()[(sp, lod)]); js = g['json']; names = {n['name']: n for n in js['nodes']}; tag = '%s %s' % (sp, lod)
        want = {'seal_skin': SM.SEAL_TARGETS, 'eye_l': SM.EYE_TARGETS, 'eye_r': SM.EYE_TARGETS, 'whisker_l': SM.WHISKER_TARGETS, 'whisker_r': SM.WHISKER_TARGETS}
        ok = True
        for nn, tn in want.items():
            m = js['meshes'][names[nn]['mesh']]; ok = ok and m['extras']['targetNames'] == tn and len(m['weights']) == len(tn) and all(len(pr['targets']) == len(tn) for pr in m['primitives'])
            for pr in m['primitives']:
                for tg in pr['targets']:
                    a = js['accessors'][tg['POSITION']]; sp_ = a['sparse']; ok = ok and sp_['count'] >= 1 and 'bufferView' not in a
                    iv = js['bufferViews'][sp_['indices']['bufferView']]; ct = {5123: np.uint16, 5125: np.uint32}[sp_['indices']['componentType']]
                    ind = np.frombuffer(g['bin'], ct, sp_['count'], iv.get('byteOffset', 0)); ok = ok and ind.max() < a['count']
        check(ok, '%s: morph targets by name on the head mesh, both eyes and both whisker meshes, sparse and valid' % tag)
        mats = {m['name']: m for m in js['materials']}
        check('Highlight' in mats and mats['Highlight']['emissiveFactor'] == [1.0, 1.0, 1.0] and 'Eye' in mats and 'Lid' in mats, '%s: eye materials: glossy eye, wet highlight (emissive), lid' % tag)
        eyem = js['meshes'][names['eye_l']['mesh']]; check(any(js['materials'][pr['material']]['name'] == 'Highlight' for pr in eyem['primitives']) and any('COLOR_0' in pr['attributes'] for pr in eyem['primitives']), '%s: the eye has an iris (vertex colours) and a highlight primitive' % tag)
        ex = js['scenes'][0]['extras']; allnames = set(SM.SEAL_TARGETS) | set(SM.EYE_TARGETS) | set(SM.WHISKER_TARGETS)
        check(all(set(v) <= allnames for v in ex['expressions'].values()) and {'neutral', 'blink', 'sleepy', 'curious', 'startled', 'calling', 'content', 'nostril_flare'} <= set(ex['expressions']), '%s: the expression table uses real target names' % tag)
        an = {a['name']: a for a in js['animations']}
        ch = [(js['nodes'][c['target']['node']]['name'], c['target']['path']) for c in an['blink_loop']['channels']]
        check(('eye_l', 'weights') in ch and ('eye_r', 'weights') in ch, '%s: blink_loop plays the blink weights on both eyes' % tag)
        c0 = [c for c in an['blink_loop']['channels'] if js['nodes'][c['target']['node']]['name'] == 'eye_l'][0]; sm = an['blink_loop']['samplers'][c0['sampler']]
        n_in = js['accessors'][sm['input']]['count']; n_out = js['accessors'][sm['output']]['count']
        check(n_out == 4 * n_in, '%s: weights channel has four weights a key' % tag)
        w = read_acc(g, sm['output']).reshape(-1, 4)[:, 0]; check(w.max() > 0.9 and w.min() == 0, '%s: the blink closes fully and opens' % tag)
        # the lid moves further than 5 mm between open and shut, and the jaw morph moves the lower jaw
        lid = [pr for pr in eyem['primitives'] if js['materials'][pr['material']]['name'] == 'Lid' and pr['targets']][-1]; ta = js['accessors'][lid['targets'][0]['POSITION']]
        iv = js['bufferViews'][ta['sparse']['values']['bufferView']]; vals = np.frombuffer(g['bin'], np.float32, ta['sparse']['count'] * 3, iv.get('byteOffset', 0)).reshape(-1, 3)
        check(np.abs(vals).max() > 0.004, '%s: the blink target moves the lid by %.1f mm' % (tag, np.abs(vals).max() * 1000))
        coat = js['meshes'][0]['primitives'][0]; tc = js['accessors'][coat['targets'][2]['POSITION']]
        check(tc['sparse']['count'] > 50, '%s: the calling target moves %d jaw vertices' % (tag, tc['sparse']['count']))
    g = read_glb(built()[('grey_male', 'far')]); check('targets' not in g['json']['meshes'][0]['primitives'][0], 'far level has no morph targets')

def test_args():
    a = SM.parse_args(['--out', 'x', '--species', 'harbour', '--lod', 'far', '--variant', '3', '--wet'])
    check(a.species_list == ['harbour'] and a.lods == ['far'] and a.variant == 3 and a.wet, 'arguments parse')
    try: SM.parse_args(['--out', 'x', '--variant', '9']); ok = False
    except SystemExit: ok = True
    check(ok, 'a bad variant is refused')

def test_models():
    for (sp, lod), p in built().items(): run_glb_checks('%s %s' % (sp, lod), p, sp, lod)
    tot = sum(os.path.getsize(p) for p in built().values()) / 1024.0
    check(tot < SM.SET_KB, 'the whole set of 12 files is %.0f KB, under %d KB' % (tot, SM.SET_KB))

def test_names_and_shape():
    for sp in SM.SPECIES:
        b = SM.Body(sp); m = b.mass_kg(); lo, hi = SP_RANGE[sp]
        check(lo * 0.8 <= m <= hi * 1.05, '%s: modelled mass %.0f kg against the real range %s' % (sp, m, SM.SP[sp]['mass']))
    mm = SM.Body('grey_male'); ff = SM.Body('grey_female')
    check(mm.sp['total'] > ff.sp['total'] > SM.Body('grey_pup').sp['total'], 'male longer than female longer than pup')
    check(SM.SP['grey_male']['snout'] > SM.SP['harbour']['snout'], 'the grey male has the longer snout, the harbour seal the shorter, rounder face')

SP_RANGE = {k: v['mass'] for k, v in SM.SP.items()}

def test_clip_content():
    JP = {j: np.zeros(3) for j in SM.JOINT_ORDER}
    for cn in LOOPING:
        ch, T, loop, note = SM.sample_clip(cn, JP); ok = loop
        for (jn, path), (times, vals) in ch.items():
            a, b = np.array(vals[0]), np.array(vals[-1])
            if path == 'rotation': ok = ok and (abs(abs(float(np.dot(a, b))) - 1) < 1e-4)
            elif cn != 'hump_crawl': ok = ok and np.allclose(a, b, atol=1e-4)
        check(ok, 'clip %s loops (first and last keys match)' % cn)
    check(not SM.CLIPS['yawn'][2] and not SM.CLIPS['slide_in'][2] and not SM.CLIPS['scratch'][2], 'yawn, slide_in and scratch are one-shot')
    ch, T, loop, note = SM.sample_clip('yawn', JP); r = ch[('jaw', 'rotation')][1]; q = max(abs(v[1]) for v in r)
    check(2 * math.degrees(math.asin(min(1, q))) > 30, 'the yawn opens the jaw more than 30 degrees')
    ch, T, loop, note = SM.sample_clip('slide_in', JP); tz = [v[2] for v in ch[('root', 'translation')][1]]
    check(min(tz) < -0.5 and ch[('root', 'translation')][1][-1][0] > 1.5, 'slide_in carries the root forward and down into the water')
    for p in SM.POSES: check(all(j in SM.JOINT_ORDER for j in SM.POSES[p]), 'pose %s names real joints' % p)
    check(len(SM.POSES) >= 6, 'a pose set of %d poses' % len(SM.POSES))

def test_variants_and_determinism():
    out = tempfile.mkdtemp(prefix='seal_var_'); cols = []; sizes = []
    for v in range(6):
        p = os.path.join(out, 'v%d.glb' % v); SM.write_glb(p, SM.build('grey_male', 'live', v)); g = read_glb(p); cols.append(g['bin']); sizes.append(os.path.getsize(p))
        check(g['json']['scenes'][0]['extras']['variant'] == v, 'variant %d is labelled' % v)
    check(len(set(cols)) == 6, 'six variants give six different files (colour and pattern)')
    a = SM.build('harbour', 'live', 2); b = SM.build('harbour', 'live', 2); pa = os.path.join(out, 'a.glb'); pb = os.path.join(out, 'b.glb'); SM.write_glb(pa, a); SM.write_glb(pb, b)
    check(open(pa, 'rb').read() == open(pb, 'rb').read(), 'building twice gives identical bytes (deterministic)')
    pw = os.path.join(out, 'w.glb'); SM.write_glb(pw, SM.build('grey_pup', 'live', 0, True)); gw = read_glb(pw)
    check(gw['json']['materials'][0]['name'] == 'SealCoatWet' and gw['json']['scenes'][0]['extras']['wet'], 'wet build makes the wet material the default')
    pp = os.path.join(out, 'p.glb'); SM.write_glb(pp, SM.build('grey_female', 'live', 0, False, SM.SEED, 'alert')); gp = read_glb(pp)
    nd = {n['name']: n for n in gp['json']['nodes']}
    check('rotation' in nd['neck'] and 'rotation' not in read_glb(built()[('grey_female', 'live')])['json']['nodes'][SM.JOINT_ORDER.index('neck')], 'a pose file turns the neck, the rest file does not')

def test_committed_assets():
    if not os.path.isdir(ASSET_DIR): check(True, 'no committed assets yet (skipped)'); return
    tot = 0
    for sp in SM.SPECIES:
        for lod in SM.LODS:
            p = os.path.join(ASSET_DIR, SM.out_name(sp, lod)); check(os.path.exists(p), 'committed %s' % os.path.basename(p))
            if os.path.exists(p): run_glb_checks('committed %s %s' % (sp, lod), p, sp, lod); tot += os.path.getsize(p)
    check(tot < SM.SET_KB * 1024, 'committed set is %.0f KB' % (tot / 1024.0))

def test_bpy_import():
    try: import bpy
    except Exception: check(True, 'bpy not available here (import check skipped)'); return
    bpy.ops.wm.read_factory_settings(use_empty=True); p = built()[('grey_male', 'live')]; bpy.ops.import_scene.gltf(filepath=p)
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE']; acts = [a.name.split('.')[0] for a in bpy.data.actions]
    check(len(arm) == 1 and all(c in acts for c in CLIPS), 'bpy imports the GLB with an armature and nine actions')

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
    check(os.path.exists(DOC_PATH) and not re.search(r'/(tmp|home|root|Users)/\w', open(DOC_PATH).read()), 'SEAL_MODEL.md exists and has no private paths')
    check('/*' not in open(SRC_PATHS[0]).read().replace('"""', ''), 'python comments only')

TESTS = [test_args, test_face, test_source_clean, test_names_and_shape, test_clip_content, test_models, test_variants_and_determinism, test_committed_assets, test_bpy_import]
if __name__ == '__main__':
    for t in TESTS: t()
    print('\n%d failures' % len(_fails)); sys.exit(1 if _fails else 0)
