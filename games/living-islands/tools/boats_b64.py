"""Writes the base64 twins of the live and far boat GLBs as classic scripts (so file:// pages can read them).
Run: python3 tools/boats_b64.py   (reads assets/boats/boat_<boat>_<lod>.glb, writes assets/boatkit/boats_<lod>_b64.js (outside assets/boats, whose size cap the model test checks))
Each file sets window.LI_BOAT_GLB[<boat>_<lod>] = base64 string."""
import base64, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(HERE, 'assets', 'boats')
OUT = os.path.join(HERE, 'assets', 'boatkit')
os.makedirs(OUT, exist_ok=True)
for lod in ('live', 'far'):
    out = ['window.LI_BOAT_GLB=window.LI_BOAT_GLB||{};']
    for boat in ('dinghy', 'sailer', 'work', 'wreck'):
        data = open(os.path.join(D, 'boat_%s_%s.glb' % (boat, lod)), 'rb').read()
        out.append("window.LI_BOAT_GLB['%s_%s']='%s';" % (boat, lod, base64.b64encode(data).decode()))
    p = os.path.join(OUT, 'boats_%s_b64.js' % lod)
    open(p, 'w').write('\n'.join(out) + '\n')
    print(p, os.path.getsize(p))
