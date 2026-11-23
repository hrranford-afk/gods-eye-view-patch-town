"""Contact sheet and the three views of one world.  PIL + numpy.
  python3 sheet.py sheet        -> landform/contact_sheet.png (24 worlds, 8 per province)
  python3 sheet.py views [seed] -> landform/world-<seed>-plan.png / -section.png / -tides.png
  python3 sheet.py quick P seed -> one plan to the scratch path given as argv[4] (for looking while tuning)
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import world as W            # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def font(sz):
    try:
        return ImageFont.truetype(FONT, sz)
    except Exception:
        return ImageFont.load_default()


DEPTH_STOPS = [(0.0, (156, 222, 208)), (0.6, (110, 206, 206)), (2.0, (60, 170, 190)), (6.0, (32, 118, 168)),
               (14.0, (22, 76, 142)), (28.0, (14, 48, 108)), (50.0, (8, 28, 72))]


def depth_colour(d):
    xs = [s[0] for s in DEPTH_STOPS]
    out = np.zeros(d.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(d, xs, [s[1][c] for s in DEPTH_STOPS])
    return out


def hillshade(h, dx, ve, az=315.0, alt=38.0):
    gy, gx = np.gradient(h * ve, dx)
    slope = np.arctan(np.hypot(gx, gy))
    asp = np.arctan2(gy, -gx)
    zen = math.radians(90 - alt)
    a = math.radians(az)
    return np.clip(math.cos(zen) * np.cos(slope) + math.sin(zen) * np.sin(slope) * np.cos(a - asp), 0, 1)


def render_plan(w, level=None, scale=1, sand_tint=True):
    """North-up RGB uint8.  Hillshade + hypsometric colour; coast line drawn at `level`."""
    lv = w.sea_level if level is None else level
    h = w.height.astype(np.float64)
    land = h > lv
    surf = W.surface_colour(w).astype(np.float64)
    # land by height tint: slightly lighter higher up
    hh = np.clip((h - lv) / 40.0, 0, 1)[..., None]
    land_c = surf * (0.92 + 0.14 * hh)
    sea_c = depth_colour(np.maximum(lv - h, 0))
    sandy = (w.rock == W.R_SAND)[..., None] & ~land[..., None]
    sea_c = np.where(sandy, sea_c * 0.80 + np.array([200, 225, 190]) * 0.20, sea_c)
    # tidal flat strip: land between low and high water looks wet
    rgb = np.where(land[..., None], land_c, sea_c)
    sh_land = hillshade(np.maximum(h, lv), w.dx, 2.2)
    sh_sea = hillshade(np.minimum(h, lv), w.dx, 0.6)
    sh = np.where(land, sh_land, sh_sea)
    k = (0.40 + 0.9 * sh)[..., None]
    rgb = rgb * np.where(land[..., None], k, 0.75 + 0.5 * (sh_sea[..., None] - 0.5) + 0.25)
    img = np.clip(rgb, 0, 255).astype(np.uint8)[::-1]
    im = Image.fromarray(img)
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    # coast line
    land_f = land[::-1]
    edge = land_f & ~(np.roll(land_f, 1, 0) & np.roll(land_f, -1, 0) & np.roll(land_f, 1, 1) & np.roll(land_f, -1, 1))
    if scale == 1:
        arr = np.array(im).astype(np.float64)
        arr[edge] = arr[edge] * 0.45 + np.array([20, 24, 30]) * 0.55
        im = Image.fromarray(arr.astype(np.uint8))
    else:
        em = Image.fromarray((edge * 255).astype(np.uint8)).resize(im.size, Image.BILINEAR)
        a = np.array(em).astype(np.float64)[..., None] / 255.0
        arr = np.array(im).astype(np.float64)
        arr = arr * (1 - 0.6 * a) + np.array([20, 24, 30]) * 0.6 * a
        im = Image.fromarray(arr.astype(np.uint8))
    return im


def key_numbers(w):
    import checks
    m = checks.measure(w)
    return m


def stamp(im, lines, size=11):
    d = ImageDraw.Draw(im)
    f = font(size)
    y = 2
    for ln in lines:
        d.text((4, y), ln, fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
        y += size + 2
    return im


def contact_sheet(path, seeds_per=8, base_seed=2000, tile=256):
    import checks
    cols = seeds_per
    gap = 4
    lab_h = 0
    W_px = cols * tile + (cols + 1) * gap
    H_px = 3 * tile + 4 * gap
    sheet = Image.new('RGB', (W_px, H_px), (18, 20, 24))
    for r, prov in enumerate('ABC'):
        for c in range(cols):
            seed = base_seed + 100 * r + c
            w = W.make_world(seed, prov, n=257)
            m = checks.measure(w)
            im = render_plan(w)
            im = im.resize((tile, tile), Image.LANCZOS) if im.width != tile else im
            stamp(im, ['%s %s  seed %d' % (prov, w.province_name, seed),
                       'isl %d  K %.2f  D %.2f' % (m['n_islands'], m['korcak_K'] if m['korcak_K'] == m['korcak_K'] else 0, m['coast_D']),
                       'land %.0f%%  <10m %.0f%%' % (100 * m['land_frac'], 100 * m['land_lt10'])], 11)
            sheet.paste(im, (gap + c * (tile + gap), gap + r * (tile + gap)))
    q = sheet.quantize(colors=160, method=Image.MEDIANCUT, dither=Image.NONE)
    q.save(path, optimize=True)
    return path


# ------------------------------------------------------------------ one world, three views
def _bilinear(a, x, y, w):
    gx = (x + w.size_m / 2) / w.dx
    gy = (y + w.size_m / 2) / w.dx
    i0 = np.clip(np.floor(gy).astype(int), 0, w.n - 2)
    j0 = np.clip(np.floor(gx).astype(int), 0, w.n - 2)
    fy = gy - i0
    fx = gx - j0
    return (a[i0, j0] * (1 - fx) * (1 - fy) + a[i0, j0 + 1] * fx * (1 - fy) + a[i0 + 1, j0] * (1 - fx) * fy + a[i0 + 1, j0 + 1] * fx * fy)


def section_profile(w, isl_a, isl_b, extend=60.0, nsamp=900):
    pa = np.array(w.islands[isl_a - 1]['peak_xy'])
    pb = np.array(w.islands[isl_b - 1]['peak_xy'])
    d = pb - pa
    L = np.hypot(*d)
    u = d / L
    q0, q1 = -extend, L + extend
    # clip to the world
    half = w.size_m / 2 - 1
    qs = np.linspace(q0, q1, nsamp)
    pts = pa[None, :] + qs[:, None] * u[None, :]
    ok = (np.abs(pts[:, 0]) < half) & (np.abs(pts[:, 1]) < half)
    qs, pts = qs[ok], pts[ok]
    hz = _bilinear(w.height.astype(np.float64), pts[:, 0], pts[:, 1], w)
    rk = np.rint(_bilinear(w.rock.astype(np.float64), pts[:, 0], pts[:, 1], w)).astype(int)
    rk = w.rock[np.clip(np.rint((pts[:, 1] + w.size_m / 2) / w.dx).astype(int), 0, w.n - 1),
                np.clip(np.rint((pts[:, 0] + w.size_m / 2) / w.dx).astype(int), 0, w.n - 1)]
    return qs, pts, hz, rk


def render_section(w, path, isl_a=1, isl_b=2, ve=None):
    qs, pts, hz, rk = section_profile(w, isl_a, isl_b)
    Wp, Hp = 1500, 640
    im = Image.new('RGB', (Wp, Hp), (236, 240, 244))
    d = ImageDraw.Draw(im)
    ml, mr, mt, mb = 70, 30, 70, 90
    pw, ph = Wp - ml - mr, Hp - mt - mb
    zmin = min(hz.min() - 4, -w.params['shelf'] - 4)
    zmax = max(hz.max() + 6, 12)
    xs = ml + (qs - qs[0]) / (qs[-1] - qs[0]) * pw
    ys = lambda z: mt + (zmax - z) / (zmax - zmin) * ph
    ve = (ph / (zmax - zmin)) / (pw / (qs[-1] - qs[0]))
    lvh, lvl = w.sea_level + w.tide_amp, w.sea_level - w.tide_amp
    # water body
    d.rectangle([ml, ys(w.sea_level), ml + pw, mt + ph], fill=(150, 205, 222))
    d.rectangle([ml, ys(lvh), ml + pw, ys(lvl)], fill=(120, 190, 215))
    # ground, coloured by rock under the surface
    for k in range(len(qs) - 1):
        r = w.rocks[int(rk[k])]
        col = r['colour_weathered']
        d.rectangle([xs[k], ys(hz[k]), xs[k + 1] + 1, mt + ph], fill=tuple(int(v) for v in col))
    # sand deposits lighter
    # surface line
    pts_l = [(float(xs[k]), float(ys(hz[k]))) for k in range(len(qs))]
    d.line(pts_l, fill=(20, 24, 30), width=3)
    f = font(13)
    for lv, lab in ((lvh, 'high tide +%.1f m' % w.tide_amp), (w.sea_level, 'sea level 0'), (lvl, 'low tide -%.1f m' % w.tide_amp)):
        d.line([(ml, ys(lv)), (ml + pw, ys(lv))], fill=(30, 80, 140), width=1)
        d.text((ml + pw - 150, ys(lv) - 15), lab, fill=(20, 60, 120), font=f)
    # depth ticks
    for z in range(int(math.ceil(zmin / 10) * 10), int(zmax) + 1, 10):
        d.line([(ml - 5, ys(z)), (ml, ys(z))], fill=(60, 60, 60))
        d.text((ml - 40, ys(z) - 7), '%d' % z, fill=(60, 60, 60), font=f)
    # labels for the two peaks
    for isl in (isl_a, isl_b):
        pk = np.array(w.islands[isl - 1]['peak_xy'])
        qq = np.hypot(*(pk - pts[0]))
        px = ml + qq / (qs[-1] - qs[0]) * pw
        zz = w.islands[isl - 1]['max_height_m']
        d.ellipse([px - 5, ys(zz) - 5, px + 5, ys(zz) + 5], outline=(200, 30, 30), width=2)
        d.text((px - 60, ys(zz) - 38), 'island %d peak, %.0f m' % (isl, zz), fill=(160, 20, 20), font=font(15))
    # saddle between them
    lo = np.argmin(np.where((xs > xs[0]) & (qs > 0), hz, 1e9)) if False else None
    d.text((ml, 14), 'World %s %d: section through the peaks of island %d and island %d' % (w.province_name, w.seed, isl_a, isl_b),
           fill=(10, 10, 10), font=font(20))
    d.text((ml, 42), 'One continuous surface: the islands are its peaks, the channel is its saddle. Vertical exaggeration x%.1f. Rock colour below the line (weathered).' % ve,
           fill=(50, 50, 50), font=font(13))
    d.text((ml, Hp - 70), 'distance along section (m): 0 to %.0f' % (qs[-1] - qs[0]), fill=(60, 60, 60), font=f)
    # rock legend
    used = sorted(set(int(v) for v in rk))
    x = ml
    for u_ in used:
        r = w.rocks[u_]
        d.rectangle([x, Hp - 46, x + 18, Hp - 30], fill=tuple(r['colour_weathered']), outline=(0, 0, 0))
        d.text((x + 24, Hp - 47), r['name'], fill=(20, 20, 20), font=f)
        x += 34 + 8 * len(r['name'])
    # inset plan with the section line
    ins = render_plan(w).resize((190, 190), Image.LANCZOS)
    di = ImageDraw.Draw(ins)
    def to_px(p):
        return ((p[0] + w.size_m / 2) / w.size_m * 190, 190 - (p[1] + w.size_m / 2) / w.size_m * 190)
    di.line([to_px(pts[0]), to_px(pts[-1])], fill=(255, 220, 0), width=2)
    di.rectangle([0, 0, 189, 189], outline=(0, 0, 0))
    im.paste(ins, (Wp - 190 - 20, 12))
    im.save(path, optimize=True)
    return path


def render_tides(w, path):
    tiles = []
    for name in ('low', 'mid', 'high'):
        lv = W.tide_levels(w)[name]
        im = render_plan(w, level=lv, scale=2)
        lab, n = W._islands_at(w.height.astype(np.float64), lv, w.dx)
        area = float((w.height > lv).sum() * w.dx * w.dx)
        stamp(im, ['%s tide  level %+.1f m' % (name, lv - w.sea_level), '%d islands, land %.1f ha' % (n, area / 1e4)], 18)
        tiles.append(im)
    wd = sum(t.width for t in tiles) + 8 * 4
    out = Image.new('RGB', (wd, tiles[0].height + 16), (18, 20, 24))
    x = 8
    for t in tiles:
        out.paste(t, (x, 8))
        x += t.width + 8
    out.quantize(colors=200, dither=Image.NONE).save(path, optimize=True)
    return path


def render_plan_annotated(w, path, section=(1, 2)):
    im = render_plan(w, scale=2)
    d = ImageDraw.Draw(im)
    f = font(15)
    S = im.width / w.size_m
    def px(p):
        return ((p[0] + w.size_m / 2) * S, im.height - (p[1] + w.size_m / 2) * S)
    qs, pts, hz, rk = section_profile(w, *section)
    d.line([px(pts[0]), px(pts[-1])], fill=(255, 220, 0), width=2)
    for i in w.islands[:14]:
        x, y = px(i['centroid'])
        d.text((x + 4, y - 18), '%d' % i['id'], fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    # scale bar and north arrow
    d.rectangle([20, im.height - 40, 20 + 100 * S, im.height - 34], fill=(255, 255, 255), outline=(0, 0, 0))
    d.text((20, im.height - 62), '100 m', fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
    d.text((im.width - 40, 10), 'N', fill=(255, 255, 255), font=font(22), stroke_width=2, stroke_fill=(0, 0, 0))
    stamp(im, ['World %s %d (%s) - plan: hillshade, depth colour, coast at sea level' % (w.province, w.seed, w.province_name),
               '%d islands, land %.1f%%, cell %.1f m' % (len(w.islands), 100 * (w.height > 0).mean(), w.dx)], 16)
    im.quantize(colors=220, dither=Image.NONE).save(path, optimize=True)
    return path


def three_views(seed=1122, prov='A', n=513, outdir=HERE):
    w = W.make_world(seed, prov, n=n)
    p1 = render_plan_annotated(w, os.path.join(outdir, 'world-%d-plan.png' % seed))
    p2 = render_section(w, os.path.join(outdir, 'world-%d-section.png' % seed))
    p3 = render_tides(w, os.path.join(outdir, 'world-%d-tides.png' % seed))
    return w, [p1, p2, p3]


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'sheet'
    if cmd == 'sheet':
        p = contact_sheet(os.path.join(HERE, 'contact_sheet.png'))
        print(p, os.path.getsize(p))
    elif cmd == 'views':
        seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1122
        w, ps = three_views(seed)
        for p in ps:
            print(p, os.path.getsize(p))
    elif cmd == 'export':
        import json
        man = []
        os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
        for p in 'ABC':
            w = W.make_world(1122, p)
            fn = 'world_%s_%d.npz' % (w.province_name, w.seed)
            W.export_npz(w, os.path.join(HERE, 'out', fn))
            man.append(W.manifest_entry(w, fn))
        json.dump(man, open(os.path.join(HERE, 'out', 'manifest.json'), 'w'), indent=1)
        print('exported', [m['file'] for m in man])
    elif cmd == 'quick':
        prov, seed, out = sys.argv[2], int(sys.argv[3]), sys.argv[4]
        w = W.make_world(seed, prov, n=int(sys.argv[5]) if len(sys.argv) > 5 else 257)
        render_plan(w, scale=2).save(out)
        print(len(w.islands), w.timings['total'])
