"""Writes the base64 twin of the committed kit GLBs (live and far level) that the camp start uses, as one classic script (so file:// pages can read it).
Run: python3 tools/camp_b64.py   (reads assets/kit/kit_<piece>_<live|far>.glb, writes assets/camp/kit_b64.js: window.LI_KIT_GLB[<piece>_<lod>] = base64)
Only the committed HEAD files are read; nothing is downloaded or rebuilt."""
import base64, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIECES = ['lean_to', 'rain_barrel', 'drying_rack', 'cairn', 'crate_stack', 'relic_hull', 'wrecked_jetty']
out = os.path.join(HERE, 'assets', 'camp', 'kit_b64.js')
os.makedirs(os.path.dirname(out), exist_ok=True)
lines = ['window.LI_KIT_GLB=window.LI_KIT_GLB||{};']
for p in PIECES:
    for lod in ('live', 'far'):
        data = open(os.path.join(HERE, 'assets', 'kit', 'kit_%s_%s.glb' % (p, lod)), 'rb').read()
        lines.append("window.LI_KIT_GLB['%s_%s']='%s';" % (p, lod, base64.b64encode(data).decode()))
open(out, 'w').write('\n'.join(lines) + '\n')
print(out, os.path.getsize(out))
