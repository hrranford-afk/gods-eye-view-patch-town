"""Writes the base64 twin of the committed live wrecked-jetty GLB as a classic script (so file:// pages can read it).
Run: python3 tools/jetty_b64.py   (reads assets/kit/kit_wrecked_jetty_live.glb, writes assets/repair/jetty_b64.js: window.LI_JETTY_GLB.live = base64)"""
import base64, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(HERE, 'assets', 'kit', 'kit_wrecked_jetty_live.glb')
out = os.path.join(HERE, 'assets', 'repair', 'jetty_b64.js')
os.makedirs(os.path.dirname(out), exist_ok=True)
data = open(src, 'rb').read()
open(out, 'w').write("window.LI_JETTY_GLB=window.LI_JETTY_GLB||{};\nwindow.LI_JETTY_GLB.live='%s';\n" % base64.b64encode(data).decode())
print(out, os.path.getsize(out))
