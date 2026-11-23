"""Cycles REFERENCE for the bake bridge pilot: the SAME content the page draws (land + seabed, 16+4 boulders, 17 conifers, sea) from the SAME
camera as hero_render.py (no tents, boat, fire or grass tufts: the page has none of them), no depth of field, Filmic Medium High Contrast,
exposure -0.4, sky and sun as the bake. For comparing the page against Blender without content differences.
   python bridge_ref.py [--w 1200 --h 800 --samples 128 --out ref.png] [--sun-el 20] [--no-sea]
LI_DEVICE / LI_GPU_NAME honoured via li_scene.reset()."""
import sys, os, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import li_scene as LS
import bridge_scene as BS

ap = argparse.ArgumentParser()
ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=128)
ap.add_argument('--out', default='bridge_ref.png'); ap.add_argument('--sun-el', type=float, default=BS.SUN_EL); ap.add_argument('--sun-az', type=float, default=BS.SUN_AZ)
ap.add_argument('--no-sea', action='store_true'); ap.add_argument('--sun-strength', type=float, default=-1.0)
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
t0 = time.time()
W = BS.build_scene(1122, 129, sun_el=a.sun_el, sun_az=a.sun_az, sea=not a.no_sea)
sc = W['sc']
if a.sun_strength >= 0:
    W['sun'].data.energy = a.sun_strength
BS.add_hero_camera(sc)
LS.render_settings(sc, a.w, a.h, a.samples, True, exposure=BS.HERO_CAM['exposure'])
sc.render.filepath = os.path.abspath(a.out)
print('scene build s', round(time.time() - t0, 1))
t1 = time.time()
bpy.ops.render.render(write_still=True)
print('render s', round(time.time() - t1, 1), 'total s', round(time.time() - t0, 1))
