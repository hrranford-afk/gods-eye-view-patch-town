"""PICTURES OF THE ROBOT FAMILY, rendered from the GLB files (what ships is what is seen): one three-quarter view of one robot on sand, in the look of collector_shots.py.
Headless:  blender -b --python robot_shots.py -- --glb robot_seed5_hero.glb --out robot_seed5.png [--w 1200 --h 800 --samples 48] [--zoom 1.0]
Same sky, sand, light, bottle for scale and litter as collector-v2-1.png (CPU or GPU from the LI_DEVICE environment variables, see li_device.py). Fixed seeds: the same GLB gives the same picture.
The camera is the committed collector's three-quarter camera; --zoom moves it in (above 1) or out (below 1) along the same line. The sheet of many robots is assembled by robot_sheet.py (numpy and PIL, no Blender)."""
import sys, os, math, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='One three-quarter picture of a robot GLB on sand.')
    ap.add_argument('--glb', required=True, help="a GLB file, or 'none' for the empty scene (used to mask the background for the robot-only variety measure)"); ap.add_argument('--out', required=True)
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=48)
    ap.add_argument('--zoom', type=float, default=1.0)
    return ap.parse_args(argv)


def main():
    a = parse_args(); a.prefix = 'robot'
    import collector_shots as SH
    import collector_sheet as CS
    LS, sc, M = SH.scene(a)
    if a.glb != 'none':
        root, objs = SH.import_glb(a.glb); SH.fix_materials(objs)
    SH.bottle(LS, M, (1.0, -0.46, 0), 20); SH.litter_on_sand(LS, M)
    z = 1.0 / max(a.zoom, 0.1); tgt = (0.04, 0.0, 0.30); pos = (1.55, -1.75, 0.66)
    cam = CS._cam(sc, 'Cam', tuple(tgt[i] + (pos[i] - tgt[i]) * z for i in range(3)), tgt, 46.0)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    SH.render(sc, cam, os.path.abspath(a.out))


if __name__ == '__main__':
    main()
