"""PICTURES OF THE KIT PIECES, rendered from the GLB files (not from the builder), so what is seen is what ships. See KIT_PIECES.md.
Headless:  blender -b --python kit_shots.py -- --glb DIR --out DIR [--w 1200 --h 800 --samples 64] [--only sheet,1,2,3,<piece>] [--lod hero]
DIR for --glb holds the GLB files written by kit_model.py (kit_<piece>_<lod>.glb). Writes kit-sheet.png (labelled 2 x 4 grid of all eight pieces) and kit-1.png .. kit-3.png (the three best, 1200 x 800).
Same sky, light and look as the other Living Islands pictures (boat_shots.scene: li_scene.make_sky and render_settings). Blender 5.x patterns, CPU Cycles, fixed seed.
The glTF frame is Y up with the front toward +Z; Blender imports it as (x, -z, y), so every camera below is written in glTF coordinates and converted here."""
import sys, os, math, argparse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PIECES = ('relic_hull', 'lighthouse_stump', 'crate_stack', 'cairn', 'drying_rack', 'lean_to', 'rain_barrel', 'wrecked_jetty')
NAMES = {'relic_hull': 'RELIC HULL', 'lighthouse_stump': 'LIGHTHOUSE STUMP', 'crate_stack': 'CRATE STACK', 'cairn': 'CAIRN', 'drying_rack': 'FISH DRYING RACK', 'lean_to': 'DRIFTWOOD LEAN-TO',
         'rain_barrel': 'RAIN BARREL AND GUTTER', 'wrecked_jetty': 'WRECKED JETTY'}
# camera (glTF coordinates), target, lens, sun (elevation, azimuth), ground kind
VIEWS = {
    'cairn': {'a': ((3.6, 1.5, 4.4), (0.0, 0.75, 0.0), 42.0)},
    'relic_hull': {'a': ((9.5, 3.0, 8.0), (0.0, 1.1, 0.0), 40.0)},
    'lighthouse_stump': {'a': ((7.5, 2.5, 8.5), (0.0, 1.8, 0.0), 40.0)},
    'crate_stack': {'a': ((3.8, 1.6, 4.6), (0.0, 0.8, 0.0), 42.0)},
    'drying_rack': {'a': ((4.2, 1.5, 4.8), (0.0, 1.1, 0.0), 42.0)},
    'lean_to': {'a': ((4.5, 1.7, 5.0), (0.0, 0.9, 0.0), 42.0)},
    'rain_barrel': {'a': ((3.6, 1.5, 4.4), (0.0, 0.9, 0.0), 42.0)},
    'wrecked_jetty': {'a': ((7.5, 2.3, 6.0), (1.0, 0.7, 0.0), 40.0)},
}
GROUND = {'relic_hull': dict(sea=None), 'wrecked_jetty': dict(sea=-0.55, slope=True)}
GLYPHS = {'Z': '11111 00001 00010 00100 01000 10000 11111', 'G': '01110 10001 10000 10111 10001 10001 01111', 'K': '10001 10010 10100 11000 10100 10010 10001', 'M': '10001 11011 10101 10101 10001 10001 10001',
          'P': '11110 10001 10001 11110 10000 10000 10000', 'U': '10001 10001 10001 10001 10001 10001 01110', 'Y': '10001 10001 01010 00100 00100 00100 00100', 'V': '10001 10001 10001 10001 01010 01010 00100',
          'J': '00111 00010 00010 00010 00010 10010 01100', 'Q': '01110 10001 10001 10001 10101 10010 01101', 'X': '10001 10001 01010 00100 01010 10001 10001', '-': '00000 00000 00000 11111 00000 00000 00000',
          '.': '00000 00000 00000 00000 00000 01100 01100', '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00110 01000 10000 11111',
          '5': '11111 10000 11110 00001 00001 10001 01110', '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000', '8': '01110 10001 10001 01110 10001 10001 01110',
          '9': '01110 10001 10001 01111 00001 00010 01100', ',': '00000 00000 00000 00000 00110 00100 01000'}


def parse_args(argv=None):
    if argv is None: argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser(description='Kit piece pictures from the GLB files.')
    ap.add_argument('--glb', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=800); ap.add_argument('--samples', type=int, default=64)
    ap.add_argument('--only', default='sheet,1,2,3'); ap.add_argument('--lod', default='hero'); ap.add_argument('--view', default='a')
    a = ap.parse_args(argv); a.only = [s.strip() for s in a.only.split(',') if s.strip()]
    return a


def B(p): return (p[0], -p[2], p[1])


def import_piece(path):
    import bpy
    before = set(bpy.data.objects.keys()); bpy.ops.import_scene.gltf(filepath=path)
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    for o in new:
        if o.animation_data: o.animation_data_clear()
        if o.name.split('.')[0] == 'footprint': o.hide_render = True; o.hide_viewport = True
    return new


def ground(piece, sc):
    """sand ground at y = 0 (a gently rippled grid), a sea plane for the jetty, small pebbles scattered out of the way"""
    import bpy
    import boat_shots as BS
    g = GROUND.get(piece, {})
    n = 70; s = 40.0; xs = np.linspace(-s, s, n); X, Y = np.meshgrid(xs, xs)
    Z = np.zeros_like(X)
    if g.get('slope'):
        # the beach falls away toward +x (the sea side of the jetty): a smooth ramp from the dune to the water
        Z = -np.clip((X - 0.2) * 0.17, 0, 1.6) * (X > 0.2) - 0.0 * Y
    verts = [(float(X[i, j]), float(Y[i, j]), float(Z[i, j])) for i in range(n) for j in range(n)]
    faces = [(i * n + j, i * n + j + 1, (i + 1) * n + j + 1, (i + 1) * n + j) for i in range(n - 1) for j in range(n - 1)]
    me = bpy.data.meshes.new('Strand'); me.from_pydata(verts, [], faces); me.update(); ob = bpy.data.objects.new('Strand', me); bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    me.materials.append(BS.sand_material())
    if g.get('sea') is not None:
        sea = bpy.data.objects.new('Sea', bpy.data.meshes.new('Sea')); bpy.context.scene.collection.objects.link(sea)
        sea.data.from_pydata([(-s, -s, g['sea']), (s, -s, g['sea']), (s, s, g['sea']), (-s, s, g['sea'])], [], [(0, 1, 2, 3)]); sea.data.update(); sea.data.materials.append(BS.sea_material())
    return ob


def render_piece(a, piece, view, out, lod='hero', w=None, h=None, samples=None, sun=(30.0, 135.0), exposure=-0.1):
    import bpy
    import boat_shots as BS
    ns = argparse.Namespace(**vars(a)); ns.samples = samples or a.samples
    LS, sc = BS.scene(ns, sun[0], sun[1], exposure, w, h)
    import_piece(os.path.join(a.glb, 'kit_%s_%s.glb' % (piece, lod)))
    ground(piece, sc)
    cp, tg, ln = VIEWS[piece][view]
    c = BS.cam(sc, B(cp), B(tg), ln); BS.render(sc, c, out)


def label_png(path, text):
    import collector_sheet as CS
    CS.FONT.update(GLYPHS)


def shot_sheet(a):
    import collector_sheet as CS
    CS.FONT.update(GLYPHS); CS.FONT.update({k: v for k, v in GLYPHS.items()})
    import boat_shots as BS
    CS.FONT.update(BS.GLYPHS)
    cw, ch = 640, 440; cells = []
    for p in PIECES:
        pth = os.path.join(a.out, 'cell-%s.png' % p)
        if not (os.environ.get('KIT_REUSE_CELLS') and os.path.exists(pth)):
            render_piece(a, p, 'a', pth, a.lod, cw, ch, max(24, a.samples // 2))
        cells.append(CS.read_png(pth))
    pad = 8; top = 8
    W = pad + 4 * (cw + pad); Hh = top + 2 * (ch + pad)
    sheet = np.full((Hh, W, 3), 0.12, np.float32)
    for i, p in enumerate(PIECES):
        r, c = divmod(i, 4); y = top + r * (ch + pad); x = pad + c * (cw + pad); sheet[y:y + ch, x:x + cw] = cells[i][:ch, :cw]
        CS.draw_text(sheet, x + 10, y + 10, NAMES[p], 3, (0.97, 0.96, 0.9), bg=0.08)
    CS.write_png(os.path.join(a.out, 'kit-sheet.png'), sheet)


# the three hero pictures: (piece, camera, target, lens, sun)
HERO_SHOTS = {
    '1': ('relic_hull', ((8.4, 2.4, 7.0), (0.0, 1.2, 0.0), 38.0), (24.0, 120.0)),
    '2': ('lighthouse_stump', ((6.5, 2.2, 7.5), (0.0, 2.0, 0.0), 38.0), (22.0, 130.0)),
    '3': ('lean_to', ((3.6, 1.3, 4.2), (0.0, 0.85, 0.0), 40.0), (26.0, 125.0)),
}


def shot_hero(a, k):
    import boat_shots as BS
    piece, (cp, tg, ln), sun = HERO_SHOTS[k]
    VIEWS[piece]['hero'] = (cp, tg, ln)
    render_piece(a, piece, 'hero', os.path.join(a.out, 'kit-%s.png' % k), a.lod, None, None, None, sun)


def main():
    a = parse_args(); os.makedirs(a.out, exist_ok=True)
    for k in a.only:
        if k == 'sheet': shot_sheet(a)
        elif k in HERO_SHOTS: shot_hero(a, k)
        elif k in PIECES: render_piece(a, k, a.view, os.path.join(a.out, 'try-%s-%s.png' % (k, a.view)), a.lod)


if __name__ == '__main__':
    main()
