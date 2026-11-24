# tools/gift_b64.py -- base64 twin of the kit lighthouse stump for the Gift first day (file:// cannot fetch a GLB).
#   python3 tools/gift_b64.py   -> assets/gift/stump_b64.js
import base64, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
b = open(os.path.join(ROOT, 'assets/kit/kit_lighthouse_stump_live.glb'), 'rb').read()
os.makedirs(os.path.join(ROOT, 'assets/gift'), exist_ok=True)
open(os.path.join(ROOT, 'assets/gift/stump_b64.js'), 'w').write("/* base64 twin of assets/kit/kit_lighthouse_stump_live.glb (so file:// works); built by tools/gift_b64.py */\nwindow.LI_KIT_GLB=window.LI_KIT_GLB||{};\nwindow.LI_KIT_GLB['lighthouse_stump_live']='%s';\n" % base64.b64encode(b).decode())
print('wrote assets/gift/stump_b64.js', len(b))
