"""Copy the handful of CC0 models used by the kit into assets/, downscale textures, drop normal maps.
Input packs are untrusted data: only json/png/glb are read, nothing is executed.
Usage: python3 -I pack_assets.py <cc0-dir>"""
import json, os, shutil, sys
from PIL import Image
src = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'assets')
Q = os.path.join(src, 'quaternius-megakit', 'glTF')
K = next(os.path.join(src, 'kenney-nature', 'Models', d) for d in os.listdir(os.path.join(src, 'kenney-nature', 'Models')) if d.startswith('GLTF'))
os.makedirs(out, exist_ok=True)
tex_done = {}
def tex(name, size):
    if name not in tex_done:
        im = Image.open(os.path.join(Q, name)); im.thumbnail((size, size), Image.LANCZOS)
        if name == 'Leaves_TwistedTree_C.png':   # the pack ships this one as red autumn foliage: re-tint to the same green family as the other trees
            import numpy as np; a = np.asarray(im.convert('RGBA')).astype(float); r = a[..., 0].copy()
            a[..., 0] = r * .55; a[..., 1] = r * .78 + a[..., 1] * .2; a[..., 2] = a[..., 2] * .1; im = Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGBA')
        o = name
        if name.startswith('Leaves_') or name.startswith('Leaf_'):   # brighten the pack's dark leaf cards so they read in flat lighting
            import numpy as np; a = np.asarray(im.convert('RGBA')).astype(float); a[..., :3] = (255 * (a[..., :3] / 255) ** .93) * 1.0; im = Image.fromarray(a.clip(0, 255).astype('uint8'), 'RGBA')
        if im.mode == 'RGBA' and im.getextrema()[3][0] < 250: im.save(os.path.join(out, o), optimize=True)
        else: o = os.path.splitext(name)[0] + '.jpg'; im.convert('RGB').save(os.path.join(out, o), quality=82)
        tex_done[name] = o
    return tex_done[name]
for n in ['Pine_1','Pine_3','Pine_5','CommonTree_1','CommonTree_3','TwistedTree_2','Bush_Common','Rock_Medium_1','Rock_Medium_2','Rock_Medium_3']:
    g = json.load(open(os.path.join(Q, n + '.gltf')))
    for im in g['images']: im['uri'] = tex(im['uri'], 512 if 'Bark' in im['uri'] or 'Rocks' in im['uri'] else 256)
    for m in g['materials']: m.get('pbrMetallicRoughness', {}); m.pop('normalTexture', None)
    # drop normal-map images/textures from the list if unreferenced is skipped: keep indices valid, but point them to the small diffuse
    for im in g['images']:
        pass
    json.dump(g, open(os.path.join(out, n + '.gltf'), 'w'), separators=(',', ':'))
    shutil.copy(os.path.join(Q, n + '.bin'), out)
for n in ['rock_largeA','rock_tallA','rock_smallB','tent_smallOpen','canoe','campfire_logs','log']:
    shutil.copy(os.path.join(K, n + '.glb'), out)
