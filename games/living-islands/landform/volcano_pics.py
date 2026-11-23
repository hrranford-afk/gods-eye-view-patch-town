"""Pictures for province D (PIL + numpy only): plan with contours and belts, a labelled section, the contact sheet.
  python3 volcano_pics.py plan [seed] [out.png]      hillshade plan with contour lines (20 m) and altitude belts
  python3 volcano_pics.py section [seed] [out.png]   cross-section through the summit (W-E and S-N), labelled
  python3 volcano_pics.py sheet [out.png]            12 worlds with realism numbers
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import world as W            # noqa: E402
import sheet as S            # noqa: E402

ZONE_NAMES = ['sea', 'coastal scrub', 'woodland (wet side)', 'pine / birch belt', 'high scrub', 'bare lava', 'summit rock']
ZONE_RGB = [(0, 0, 0), (118, 128, 72), (56, 98, 60), (92, 118, 66), (138, 128, 90), (52, 46, 48), (126, 84, 70)]


def plan_image(w, scale=2, contours=True, zones=False):
    h = w.height.astype(np.float64)
    land = h > 0
    surf = W.surface_colour(w).astype(np.float64)
    if zones:
        surf = np.array(ZONE_RGB, dtype=np.float64)[w.zone] * 0.85 + surf * 0.15
    sea = S.depth_colour(np.maximum(-h, 0) * 0.35)
    sh = S.hillshade(np.where(land, h, h * 0.2), w.dx, 2.6, az=300.0, alt=40.0)
    k = (0.35 + 0.95 * sh)[..., None]
    rgb = np.where(land[..., None], surf * k, sea * (0.8 + 0.3 * sh[..., None]))
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)[::-1])
    img = img.resize((img.width * scale, img.height * scale), Image.LANCZOS)
    if contours:
        a = np.array(img).astype(np.float64)
        hh = np.array(Image.fromarray(h.astype(np.float32)[::-1]).resize(img.size, Image.BILINEAR)).astype(np.float64)
        for lv, wt in [(v, 0.5 if v % 100 else 0.8) for v in range(20, 300, 20)] + [(-40, 0.3), (-80, 0.3), (-120, 0.3)]:
            c = (hh > lv)
            e = c ^ np.roll(c, 1, 0) | c ^ np.roll(c, 1, 1)
            a[e] = a[e] * (1 - wt) + np.array([30, 24, 20]) * wt
        c = hh > 0
        e = (c ^ np.roll(c, 1, 0)) | (c ^ np.roll(c, 1, 1))
        a[e] = a[e] * 0.3 + np.array([255, 255, 255]) * 0.7
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return img


# ------------------------------------------------------------------------------------------------ labelled section (front wall = through the vent)
def _font(sz):
    return S.font(sz)


def section_image(w, path, W_=2048, H_=1024):
    import rock3d as R
    import cutaway as C
    vol = R.Volcano3D(w)
    p = w.volcano
    z0, zmax = C.zrange(vol)
    img, prof, _ = C.bake_wall(vol, w, 's', W_, H_, z0, zmax)
    L = w.size_m
    def px(x): return (x + L / 2) / L * W_
    def pz(z): return (zmax - z) / (zmax - z0) * H_
    # canvas: sky, sea water above the seabed up to z = 0, rock texture below the profile
    top_pad, bot_pad = 70, 90
    can = Image.new('RGB', (W_, H_ + top_pad + bot_pad), (236, 241, 243))
    arr = np.array(can)
    zs = zmax - (np.arange(H_) + 0.5) / H_ * (zmax - z0)
    xs = (np.arange(W_) + 0.5) / W_ * L - L / 2
    hp = np.interp(xs, np.linspace(-L / 2, L / 2, w.n), w.height[0, :].astype(float))
    sea = (zs[:, None] <= 0.0) & (zs[:, None] > hp[None, :])
    depth = np.clip(-zs[:, None] + 0 * hp[None, :], 0, 260)
    cy, dp = np.array([128, 220, 224.0]), np.array([10, 44, 108.0])
    t = (1 - np.exp(-depth / 70.0))[..., None]
    water = cy * (1 - t) + dp * t
    rock = zs[:, None] <= hp[None, :]
    body = np.where(rock[..., None], img.astype(float), np.where(sea[..., None], water, np.array([236, 241, 243.0])))
    # tide stripe on the water: a dark band at z = 0
    r0 = int(pz(0.0))
    body[max(r0 - 2, 0):r0 + 2][sea[max(r0 - 2, 0):r0 + 2]] = (20, 50, 100)
    arr[top_pad:top_pad + H_] = np.clip(body, 0, 255).astype(np.uint8)
    im = Image.fromarray(arr)
    d = ImageDraw.Draw(im)
    f, fb, fs = _font(20), _font(26), _font(16)
    d.text((24, 14), 'Section through the vent: the south wall of the block (province D, seed %d)' % w.seed, fill=(20, 24, 28), font=fb)
    Vx, Vy = p['V']; cz = p['chamber']['z']
    def lab(x, z, text, dx_, dy_, col=(10, 10, 10)):
        X_, Y_ = px(x), pz(z) + top_pad
        d.line([(X_, Y_), (X_ + dx_, Y_ + dy_)], fill=col, width=2)
        d.ellipse([X_ - 4, Y_ - 4, X_ + 4, Y_ + 4], fill=col)
        tw = d.textlength(text, font=f)
        tx = min(max(X_ + dx_ + (6 if dx_ >= 0 else -tw - 6), 12), W_ - tw - 14)
        d.rectangle([tx - 4, Y_ + dy_ - 13, tx + tw + 4, Y_ + dy_ + 13], fill=(255, 255, 255))
        d.text((tx, Y_ + dy_ - 11), text, fill=col, font=f)
    cx_, cy_ = p['C1']
    lab(Vx + 60, cz - 12, 'magma chamber (flat ellipsoid)', 240, 70)
    lab(Vx, cz + 120, 'feeder conduit', 260, -20)
    lab(Vx + 14, cz + 50 + 130, 'dikes cut the beds', 300, -150)
    lab(Vx, vol.zc_top - 25, 'deep feeder', 190, 20)
    lab(Vx - p['rc'] * 0.55, p['floor_lv'] - 7, 'caldera fill, flat beds', -240, -150)
    rr = p['rc'] * 0.84 - 0.18 * (p['floor_lv'] + 20)
    lab(cx_ + rr * 0.97, -45, 'ring fault (offsets the beds)', 230, 70)
    lab(Vx + 280, 70, 'beds follow the old surface, steeper near the top', 140, -110)
    lab(-L / 2 + 60, -25, 'fresh-water lens (40 x head)', 260, -55)
    lab(Vx + 520, vol.zc_top + 60, 'old shield (basement)', 80, 40)
    lab(-L / 4, vol.zc_top - 22, 'oceanic crust', 60, -30)
    lab(L / 2 - 200, float(np.interp(L / 2 - 200, xs, hp)) - 4, 'sea-floor sediment', -50, 150)
    lab(L / 2 - 20, 0.0, 'tide line / sea level', -130, -120)
    lab(Vx, float(w.height[0, int((Vx + L / 2) / w.dx)]) - 1, 'crater and summit %d m' % round(w.height.max()), 160, -60)
    # frame, scale, vertical scale
    d.rectangle([0, top_pad, W_ - 1, top_pad + H_ - 1], outline=(10, 10, 10), width=2)
    y0_ = top_pad + H_ + 28
    d.line([(24, y0_), (24 + px(200) - px(0), y0_)], fill=(10, 10, 10), width=4)
    d.text((24, y0_ + 8), '200 m along the wall.  Drawn with the height stretched %.1fx against the width; the island is also %.1fx taller than a real island of this radius.' % ((H_ / (zmax - z0)) / (W_ / L), w.height.max() / (W.D_REAL_HEIGHT_RATIO * p['Rc'])), fill=(20, 24, 28), font=fs)
    d.text((24, y0_ + 30), 'Colours: lava beds grey-brown with red tops, ash tan, scoria red, basement purple-grey, crust blue-grey, sediment cream, dikes pale or dark, magma orange, lens pale cyan.', fill=(20, 24, 28), font=fs)
    im.save(path, optimize=True)
    return im


def plan_figure(w, path):
    im = plan_image(w, scale=2, contours=True, zones=False).convert('RGB')
    d = ImageDraw.Draw(im)
    f, fb = _font(18), _font(22)
    p = w.volcano
    d.text((12, 8), 'Province D plan, seed %d: hillshade, contours every 20 m (bold every 100 m), coast white' % w.seed, fill=(255, 255, 255), font=fb, stroke_width=3, stroke_fill=(0, 0, 0))
    # altitude belts legend
    names = [('coastal scrub / sea-spray heath', (118, 128, 72)), ('woodland (windward, wet)', (56, 98, 60)), ('pine / birch belt', (92, 118, 66)),
             ('high scrub / heath', (138, 128, 90)), ('bare lava, ash, scoria', (52, 46, 48)), ('scoria (red), pumice (pale)', (146, 66, 48)), ('black sand / boulder beach', (36, 36, 40))]
    y = 56
    for t, c in names:
        d.rectangle([12, y, 32, y + 16], fill=c, outline=(255, 255, 255))
        d.text((40, y - 2), t, fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
        y += 24
    # wind arrow (wet winds) and north
    wx, wy = math.cos(p['wind_from']), math.sin(p['wind_from'])
    cx, cy = 900, 120
    d.line([(cx + wx * 70, cy - wy * 70), (cx, cy)], fill=(255, 255, 255), width=4)
    d.text((cx - 40, cy + 14), 'wet wind', fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    d.text((985, 60), 'N', fill=(255, 255, 255), font=fb, stroke_width=3, stroke_fill=(0, 0, 0))
    # scale bar 200 m (1536 m = 1026 px)
    sc = 200.0 / w.size_m * im.width
    d.line([(im.width - 30 - sc, im.height - 30), (im.width - 30, im.height - 30)], fill=(255, 255, 255), width=5)
    d.text((im.width - 30 - sc, im.height - 58), '200 m', fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    # vent, cut wall, scar
    Vx, Vy = p['V']
    X_, Y_ = (Vx + w.size_m / 2) / w.size_m * im.width, (1 - (Vy + w.size_m / 2) / w.size_m) * im.height
    d.ellipse([X_ - 6, Y_ - 6, X_ + 6, Y_ + 6], outline=(255, 255, 0), width=3)
    d.text((X_ + 10, Y_ - 36), 'vent / summit %d m (cut by the south wall)' % round(w.height.max()), fill=(255, 255, 0), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    ca = (p['C1'][0] + w.size_m / 2) / w.size_m * im.width, (1 - (p['C1'][1] + w.size_m / 2) / w.size_m) * im.height
    a = p['phi_scar']
    sx, sy = ca[0] + math.cos(a) * 2.0 * p['rc'] / w.size_m * im.width, ca[1] - math.sin(a) * 0.9 * p['rc'] / w.size_m * im.height
    d.text((sx - 40, sy - 10), 'collapse scar', fill=(255, 230, 200), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    im.save(path, optimize=True)
    return im


def sheet_image(path, seeds, tile=340):
    import volcano_checks as VC
    cols = 4
    rows = (len(seeds) + cols - 1) // cols
    sh = Image.new('RGB', (cols * (tile + 6) + 6, rows * (tile + 6) + 6), (18, 20, 24))
    for k, sd in enumerate(seeds):
        w = W.make_world_D(sd)
        m = VC.measure_D(w)
        im = plan_image(w, scale=1, contours=False).convert('RGB').resize((tile, tile), Image.LANCZOS)
        S.stamp(im, ['D seed %d  summit %.0f m  VE x%.1f' % (sd, m['summit_m'], m['vexag']),
                     'skirt %.0f deg  cone %.0f deg  cones %d' % (m['skirt_slope_med'], m['cone_slope_med'], m['n_cones']),
                     'valleys %.0f  shelf %.0f m  sand %.0f%%' % (m['barrancos_per_360'], m['shelf_to_50m_m'], 100 * m['coast_black_sand'])], 11)
        sh.paste(im, (6 + (k % cols) * (tile + 6), 6 + (k // cols) * (tile + 6)))
        print('sheet', sd, flush=True)
    sh.quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    return sh


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'plan'
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, 'scratch.png')
    if cmd == 'plan':
        w = W.make_world_D(seed, n=int(os.environ.get('N', '513')))
        im = plan_figure(w, out) if os.environ.get('FIG') else plan_image(w)
        if os.environ.get('CROP'):
            x0, y0, x1, y1 = [int(v) for v in os.environ['CROP'].split(',')]
            im = im.crop((x0, y0, x1, y1))
        if not os.environ.get('FIG') or os.environ.get('CROP'):
            im.save(out)
    elif cmd == 'section':
        section_image(W.make_world_D(seed), out)
    elif cmd == 'sheet':
        sheet_image(out, [100 + 7 * k for k in range(12)])
