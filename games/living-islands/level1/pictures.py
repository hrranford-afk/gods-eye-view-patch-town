# level1/pictures.py -- pictures of a layout (PIL + numpy only): the grey-box height render, the plan with roles and routes, side profiles, the sweep grid.
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import layout as LY  # noqa: E402

MAPS = os.path.join(HERE, 'maps')
PX = 5                                   # pixels per 2 m cell in the big pictures
ROLE_COL = {'home': (214, 120, 60), 'woods': (70, 140, 70), 'hoard': (150, 90, 170), 'wreck': (180, 60, 60), 'seals': (60, 120, 190), 'rock': (110, 110, 110)}


def font(sz=14):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def hillshade(H, az=315.0, alt=40.0, z=2.0):
    gy, gx = np.gradient(H.astype(np.float64) * z, LY.DX)
    sl = np.arctan(np.hypot(gx, gy))
    asp = np.arctan2(-gx, gy)
    a, al = math.radians(az), math.radians(alt)
    return np.clip(np.sin(al) * np.cos(sl) + np.cos(al) * np.sin(sl) * np.cos(a - asp), 0, 1)


def base_rgb(L, tide=0.0, shade=True):
    H = L['H'].astype(np.float64)
    img = np.zeros(H.shape + (3,), np.float64)
    depth = np.clip(-H, 0, 9) / 9.0
    sea = np.stack([60 - 40 * depth, 130 - 60 * depth, 170 - 55 * depth], -1)
    sh = hillshade(H)
    land = H > tide
    veg = L['veg']
    col = np.zeros_like(img)
    col[:] = (150, 140, 110)
    for v, c in ((14, (60, 105, 60)), (15, (52, 90, 70)), (8, (110, 130, 80)), (13, (110, 130, 80)), (3, (140, 110, 130)), (6, (130, 150, 90)), (7, (125, 150, 95)), (5, (150, 160, 100)),
                 (9, (232, 220, 170)), (10, (170, 165, 150)), (1, (150, 145, 140)), (2, (150, 150, 135)), (4, (110, 110, 80)), (11, (120, 140, 100))):
        col[veg == v] = c
    hh = np.clip(H / 14.0, 0, 1)[..., None]
    col = col * (0.85 + 0.25 * hh)
    shallow = (H <= tide) & (H > tide - 0.9)
    out = np.where(land[..., None], col, sea)
    out[shallow & ~land] = (150, 200, 200)
    if shade:
        k = (0.55 + 0.75 * sh)[..., None]
        out = np.where(land[..., None], out * k, out * (0.85 + 0.3 * sh)[..., None])
    return np.clip(out, 0, 255).astype(np.uint8)


def up(img, px=PX):
    return Image.fromarray(img).resize((img.shape[1] * px, img.shape[0] * px), Image.BICUBIC)


def to_px(x, z, px=PX):
    return ((x + LY.HALF) / LY.DX * px + px / 2, (z + LY.HALF) / LY.DX * px + px / 2)


def table_ring(d, px=PX, col=(255, 255, 255)):
    cx, cy = to_px(0, 0, px)
    r = LY.TABLE_R / LY.DX * px
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=col, width=2)


def grey_box(L, path):
    H = L['H'].astype(np.float64)
    lo, hi = -9.0, 20.0
    g = np.clip((H - lo) / (hi - lo), 0, 1)
    sh = hillshade(H, z=3.0)
    v = np.clip(0.25 + 0.55 * g ** 0.8, 0, 1) * (0.55 + 0.7 * sh)
    img = np.stack([v * 255] * 3, -1)
    img = np.where((H <= 0)[..., None], img * np.array([0.55, 0.75, 0.95]) + 25, img)
    im = up(np.clip(img, 0, 255).astype(np.uint8), 4)
    d = ImageDraw.Draw(im)
    table_ring(d, 4)
    f = font(13)
    d.text((8, 6), 'Level 1 grey box, layout seed %d  (hash %s)  height shade only; sea and land share one surface; ring = table radius %d m' % (L['seed'], L['hash'], LY.TABLE_R), fill=(255, 255, 255), font=f)
    im.save(path)
    return path


def side_profiles(L, path, lines):
    # lines: (name, [points (x, z) of a polyline], marked tide level or None); draws the ground height along each polyline, with the high, mean and low tide lines
    f = font(12)
    W_, Hh = 900, 150 * len(lines) + 20
    im = Image.new('RGB', (W_, Hh), (245, 243, 236))
    d = ImageDraw.Draw(im)
    H = L['H']
    for i, (name, pts, mark) in enumerate(lines):
        y0 = 10 + i * 150
        P = np.array(pts, float)
        seg = np.hypot(*np.diff(P, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        n = 420
        s_ = np.linspace(0, cum[-1], n)
        xs = np.interp(s_, cum, P[:, 0])
        zs = np.interp(s_, cum, P[:, 1])
        ci = np.clip(np.round((xs + LY.HALF) / LY.DX).astype(int), 0, LY.NX - 1)
        ri = np.clip(np.round((zs + LY.HALF) / LY.DX).astype(int), 0, LY.NX - 1)
        h = H[ri, ci]
        base = y0 + 112
        Y = lambda v: base - v * 6.0
        poly = [(40 + k * (W_ - 60) / n, Y(h[k])) for k in range(n)]
        d.polygon([(40, base + 30)] + poly + [(W_ - 20, base + 30)], fill=(190, 170, 130))
        for lv, col, w_ in ((1.1, (60, 120, 200), 1), (0.0, (30, 80, 160), 2), (-1.1, (60, 120, 200), 1)):
            d.line([40, Y(lv), W_ - 20, Y(lv)], fill=col, width=w_)
        if mark is not None:
            d.line([40, Y(mark), W_ - 20, Y(mark)], fill=(200, 40, 40), width=2)
        d.text((44, y0 - 2), '%s  (%.0f m along the line; blue: tide +1.1, sea 0, -1.1; height 6 px a metre)' % (name, cum[-1]), fill=(20, 20, 20), font=f)
        if mark is not None:
            d.text((44, y0 + 12), 'red: the tide level at which this walk is dry (%.2f m)' % mark, fill=(160, 30, 30), font=f)
    im.save(path)
    return path


def arrow(d, p0, p1, col, w=3, head=9):
    d.line([p0, p1], fill=col, width=w)
    a = math.atan2(p1[1] - p0[1], p1[0] - p0[0])
    for s_ in (-0.5, 0.5):
        d.line([p1, (p1[0] - head * math.cos(a + s_), p1[1] - head * math.sin(a + s_))], fill=col, width=w)


def plan(L, R, path, px=5):
    # top-down plan: land colours by vegetation, roles, boat routes (blue), the Hoard walk (purple), the woods sill walk (dashed green), surge arrows (red), tide-crossing bars
    A = R['analysis']
    img = base_rgb(L, 0.0)
    im = up(img, px)
    d = ImageDraw.Draw(im, 'RGBA')
    f, fb = font(13), font(16)
    # low-tide shallows (bed between -1.1 and 0) pale, so the bars and reefs show
    H = L['H']
    lo = (H <= 0) & (H > -1.1)
    ov = np.zeros(H.shape + (4,), np.uint8)
    ov[lo] = (255, 240, 170, 110)
    im.alpha_composite(up(ov, px).convert('RGBA')) if im.mode == 'RGBA' else None
    im = im.convert('RGBA')
    im.alpha_composite(up(ov, px).convert('RGBA'))
    d = ImageDraw.Draw(im, 'RGBA')
    table_ring(d, px)
    P = lambda xz: to_px(xz[0], xz[1], px)
    # boat routes at mid tide
    pal = {k: (90, 235, 255, 255) for k in ('home>woods', 'home>seals', 'home>wreck', 'home>rock', 'home>hoard', 'woods>hoard')}
    for k, t in R['trips'].items():
        if t.get('path'):
            d.line([P(p) for p in t['path']], fill=pal[k], width=3)
            mid = t['path'][len(t['path']) // 2]
            d.text((P(mid)[0] + 4, P(mid)[1] - 6), '%s s' % round(t['mid_s']), fill=(255, 255, 255, 255), font=f, stroke_width=2, stroke_fill=(10, 50, 110, 255))
    # robot walks
    rb = R['robots']
    if rb.get('hoard'):
        d.line([P(p) for p in rb['hoard']['path']], fill=(170, 60, 190, 255), width=3)
    if rb.get('woods'):
        pts = [P(p) for p in rb['woods']['path']]
        for i in range(0, len(pts) - 1, 2):
            d.line([pts[i], pts[i + 1]], fill=(40, 150, 60, 255), width=3)
    # bars
    for b in L['bars']:
        pts = [P(p) for p in b['path']]
        d.line(pts, fill=(255, 255, 255, 255), width=1)
    # surge arrows: per shore segment, the storm exposure from the west-south-west
    for s in A.segs:
        e = s['E_storm']
        if e < 0.30:
            continue
        x, z = s['xz']
        ang = math.radians(240.0)             # the weather comes from compass 240: points to its direction of travel (toward ENE), page x east, z south
        vx, vz = -math.sin(ang), math.cos(ang)
        p1 = P((x, z))
        p0 = (p1[0] - vx * 34 * e, p1[1] - vz * 34 * e)
        arrow(d, p0, p1, (210, 40, 40, 220), 2, 6)
    # role labels and key spots
    labels = {'home': 'HOME', 'woods': 'WOODS', 'hoard': 'HOARD', 'wreck': 'WRECK REEF', 'seals': 'SEALS AND BIRDS', 'rock': 'BARE ROCK'}
    for k, r in enumerate(LY.ROLES):
        m = (L['owner'] == k)
        if r == 'wreck' and L['reef']:
            cx, cz = L['reef']['centre']
        elif m.any():
            rr, cc = np.nonzero(m)
            cx, cz = LY.XS[int(cc.mean())], LY.XS[int(rr.mean())]
        else:
            continue
        x, y = P((cx, cz))
        d.text((x - 30, y - 62), labels[r], fill=ROLE_COL[r] + (255,), font=fb, stroke_width=2, stroke_fill=(255, 255, 255, 255))
    sp = L['spots']
    for name, key, col in (('lamp', 'stump', (255, 220, 0)), ('hut', 'hut', (120, 70, 30)), ('landing', 'beach', (255, 255, 255)), ('yard', None, (255, 120, 0))):
        xz = A.spots['yard'] if name == 'yard' else sp[key]
        x, y = P(xz)
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=col + (255,), outline=(0, 0, 0, 255))
        d.text((x + 8, y - 8), name, fill=(0, 0, 0, 255), font=f, stroke_width=1, stroke_fill=(255, 255, 255, 255))
    if L['depot']:
        x, y = P(L['depot']['xy'])
        d.rectangle([x - 6, y - 6, x + 6, y + 6], fill=(150, 90, 170, 255), outline=(0, 0, 0, 255))
        d.text((x + 8, y - 8), 'depot', fill=(0, 0, 0, 255), font=f, stroke_width=1, stroke_fill=(255, 255, 255, 255))
    if L['reef']:
        for h in L['reef']['heads']:
            x, y = P(h)
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(200, 40, 40, 255))
    for (x_, z_) in L.get('ledges', []):
        x, y = P((x_, z_))
        d.ellipse([x - 4, y - 4, x + 4, y + 4], outline=(255, 255, 255, 255), width=2)
    # scale bar and legend
    bx, by = 24, im.size[1] - 40
    m50 = 50.0 / LY.DX * px
    d.rectangle([bx, by, bx + m50, by + 8], fill=(0, 0, 0, 255))
    d.rectangle([bx + m50 / 2, by, bx + m50, by + 8], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255))
    d.text((bx, by + 10), '0        25       50 m      (table %d m across, round table radius %d m)' % ((LY.NX - 1) * LY.DX, LY.TABLE_R), fill=(255, 255, 255, 255), font=f, stroke_width=1, stroke_fill=(0, 0, 0, 255))
    lg = ['cyan: boat route at mid tide, seconds at the tender', 'purple: robots to the Hoard (on foot); green dashes: to the woods (spring lows only)', 'red arrows: storm surge from the WSW on exposed shore', 'pale yellow: sea bed between low water and sea level (bars, reef, shoals)', 'white rings: seal ledges; red dots: reef heads']
    for i, t in enumerate(lg):
        d.text((24, 26 + 16 * i), t, fill=(255, 255, 255, 255), font=f, stroke_width=1, stroke_fill=(0, 0, 0, 255))
    d.text((24, 6), 'Level 1 plan, layout seed %d' % L['seed'], fill=(255, 255, 255, 255), font=fb, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    im.convert('RGB').save(path)
    return path


def sweep_grid(rows, path):
    cols = 10
    n = len(rows)
    rws = (n + cols - 1) // cols
    cw, ch = 118, 62
    im = Image.new('RGB', (cols * cw + 20, rws * ch + 60), (245, 243, 236))
    d = ImageDraw.Draw(im)
    f, fs = font(13), font(10)
    d.text((10, 6), 'Level 1 sweep: layout seeds 1 to %d. Green = every hard check passes; red = the first failed checks are named.' % n, fill=(20, 20, 20), font=f)
    for i, r in enumerate(rows):
        x, y = 10 + (i % cols) * cw, 30 + (i // cols) * ch
        col = (170, 215, 170) if r['ok'] else (225, 170, 160)
        d.rectangle([x, y, x + cw - 4, y + ch - 4], fill=col, outline=(80, 80, 80))
        d.text((x + 4, y + 2), 'seed %d %s' % (r['seed'], 'PASS' if r['ok'] else 'fail'), fill=(10, 10, 10), font=f)
        for j, nm in enumerate(r['fails'][:3]):
            d.text((x + 4, y + 18 + 11 * j), nm[:22], fill=(60, 20, 20), font=fs)
        if len(r['fails']) > 3:
            d.text((x + 4, y + 18 + 33), '+%d more' % (len(r['fails']) - 3), fill=(60, 20, 20), font=fs)
    im.save(path)
    return path


def make_all(seed):
    import json
    import validate as V
    L = LY.build_layout(seed)
    R = V.validate(L)
    os.makedirs(MAPS, exist_ok=True)
    grey_box(L, os.path.join(MAPS, 'level1_gray.png'))
    plan(L, R, os.path.join(MAPS, 'level1_plan.png'))
    rows = json.load(open(os.path.join(HERE, 'sweep.json')))
    sweep_grid(rows, os.path.join(MAPS, 'level1_sweep.png'))
    A = R['analysis']
    st, bc = L['spots']['stump'], L['spots']['beach']
    hb = R['robots']['hoard']
    ww = R['robots'].get('woods')
    lines = [('The Hoard walk, yard to depot, on foot', hb['path'], hb['tstar']),
             ('Lamp to the seal ring: the sight line over the table', [tuple(st), tuple(A.moor['seals'] or st)], None),
             ('Woods sill walk from the yard (spring lows only)', ww['path'] if ww else [tuple(bc), tuple(A.landings['woods'])], ww['tstar'] if ww else None)]
    side_profiles(L, os.path.join(MAPS, 'level1_profiles.png'), lines)
    return L, R


if __name__ == '__main__':
    make_all(int(sys.argv[1]) if len(sys.argv) > 1 else int(open(os.path.join(HERE, 'chosen_seed.txt')).read().strip()))
    print('pictures written to', MAPS)
