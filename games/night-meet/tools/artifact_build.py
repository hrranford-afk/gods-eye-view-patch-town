"""Build an artifact-friendly copy of Night Meet (artifacts serve only common web types).

- .glb cars and .gltf+.bin props become .json glTF files with the binary buffer embedded as a data: URI
  (GLTFLoader reads JSON glTF whatever the file name); prop textures stay as .jpg next to them.
- the .hdr night sky becomes a .png holding the same RGBE bytes (exponent lowered by 2, which is the darkening the
  game applies itself), loaded with TextureLoader as RGBEEncoding.
- index.html paths are patched to match. The game on GitHub is unchanged.
Usage: python3 -I nm_artifact_build.py <night-meet folder> <output folder>
"""
import base64, json, os, re, shutil, struct, sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
if os.path.exists(out):
    shutil.rmtree(out)
os.makedirs(out)

def glb_to_json(path):
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack_from('<III', b, 0)
    assert magic == 0x46546C67, path
    off, js, binc = 12, None, None
    while off < length:
        clen, ctype = struct.unpack_from('<II', b, off)
        chunk = b[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(chunk.decode('utf8'))
        elif ctype == 0x004E4942:
            binc = chunk
        off += 8 + clen
    if binc is not None:
        js['buffers'][0]['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binc).decode()
    return js

def gltf_embed(path):
    js = json.load(open(path))
    base = os.path.dirname(path)
    for buf in js.get('buffers', []):
        uri = buf.get('uri', '')
        if uri and not uri.startswith('data:'):
            buf['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(open(os.path.join(base, uri), 'rb').read()).decode()
    return js

def read_hdr_rgbe(path):
    b = open(path, 'rb').read()
    i = b.index(b'\n\n') + 2
    j = b.index(b'\n', i)
    m = re.match(rb'-Y (\d+) \+X (\d+)', b[i:j])
    H, W = int(m.group(1)), int(m.group(2))
    p = j + 1
    img = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        if b[p] == 2 and b[p + 1] == 2 and (b[p + 2] << 8 | b[p + 3]) == W:  # new RLE
            p += 4
            for c in range(4):
                x = 0
                while x < W:
                    n = b[p]; p += 1
                    if n > 128:
                        n -= 128
                        img[y, x:x + n, c] = b[p]; p += 1
                    else:
                        img[y, x:x + n, c] = np.frombuffer(b[p:p + n], np.uint8); p += n
                    x += n
        else:  # flat
            img[y] = np.frombuffer(b[p:p + W * 4], np.uint8).reshape(W, 4); p += W * 4
    return img

# copy everything except shots/tests/docs, then convert
for r, ds, fs in os.walk(src):
    rel = os.path.relpath(r, src)
    if rel.split(os.sep)[0] in ('shots', 'tests'):
        continue
    for f in fs:
        if f.endswith('.md') and rel == '.':
            continue
        s = os.path.join(r, f)
        rr = os.path.relpath(s, src)
        d = os.path.join(out, rr)
        os.makedirs(os.path.dirname(d), exist_ok=True)
        if f.endswith('.glb'):
            json.dump(glb_to_json(s), open(d[:-4] + '.json', 'w'))
        elif f.endswith('.gltf'):
            json.dump(gltf_embed(s), open(d[:-5] + '.json', 'w'))
        elif f.endswith('.bin'):
            pass  # embedded into the .json
        elif f.endswith('.hdr'):
            img = read_hdr_rgbe(s)
            e = img[..., 3].astype(int)
            img[..., 3] = np.where(e > 0, np.maximum(e - 2, 1), 0).astype(np.uint8)  # the game's own darkening
            Image.fromarray(img, 'RGBA').save(d[:-4] + '.png', optimize=True)
        else:
            shutil.copy2(s, d)

# patch the page
p = os.path.join(out, 'index.html')
h = open(p).read()
def rep(a, b):
    global h
    assert h.count(a) >= 1, a
    h = h.replace(a, b)
rep("hdr: 'assets/hdri/rooftop_night_1k.hdr'", "hdr: 'assets/hdri/rooftop_night_1k.png'")
h = re.sub(r"(assets/cars/q_\w+)\.glb", r"\1.json", h)
rep("`assets/models/${k}/${k}_1k.gltf`", "`assets/models/${k}/${k}_1k.json`")
rep("job(ld(new THREE.RGBELoader().setDataType(THREE.UnsignedByteType), ASSET_LIST.hdr).then((t) => { ASSET.hdr = t; }), 'night sky');",
    "job(ld(texL, ASSET_LIST.hdr).then((t) => { t.encoding = THREE.RGBEEncoding; t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = true; ASSET.hdr = t; }), 'night sky'); // artifact copy: RGBE bytes in a PNG, already darkened")
open(p, 'w').write(h)
print('ok', sum(len(fs) for _, _, fs in os.walk(out)), 'files')
