#!/usr/bin/env python3
"""Compare the page variants with the Blender reference (research/BAKE_BRIDGE.md section 6, step 4). numpy + PIL only.
   python3 bridge_compare.py --ref <blender.png> --shots <dir with bridge-A..E.png> [--regions bridge_regions.json] [--out <dir>] [--hero hero.png]
Per image and region: mean RGB (display 0..1), mean luminance Yd, p5/p50/p95 of Yd, 64-bin histogram earth-mover distance to the reference,
16x16 block mean-colour DeltaE76 in CIELAB (median and mean over blocks fully inside the region), mean saturation (HSV).
Yd = sRGB-encoded Rec.709 luminance of the linearised pixels (so it is 0..1 display luminance).
Regions are polygons in image pixels (hand drawn once, saved in bridge_regions.json: ground = open ground without trees, boulders or tents; trees; sea; sky).
Writes <out>/bridge-compare.png (side by side), <out>/bridge-heat.png (DeltaE heat maps) and <out>/bridge-metrics.json."""
import argparse, json, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--ref', required=True); ap.add_argument('--shots', required=True); ap.add_argument('--out', default=None)
ap.add_argument('--regions', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bridge_regions.json'))
ap.add_argument('--hero', default=None, help='the original hero render (has tents, boat, fire and grass the page does not draw): secondary reference')
ap.add_argument('--variants', default='A,B,C,D,E'); ap.add_argument('--ref-for', action='append', default=[], help='VARIANT=path: compare that variant with its own Blender render (D with the sun-off render, E with the second sun elevation)'); ap.add_argument('--compare-out', default=None)
a = ap.parse_args()
OUT = a.out or a.shots
os.makedirs(OUT, exist_ok=True)


def load(p):
    return np.asarray(Image.open(p).convert('RGB'), np.float32) / 255.0


def dec(y):
    return np.where(y <= 0.04045, y / 12.92, np.power((y + 0.055) / 1.055, 2.4))


def enc(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-8), 1 / 2.4) - 0.055)


def lum_d(img):
    lin = dec(img); y = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    return enc(y)


def to_lab(img):
    lin = dec(img)
    M = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def poly_mask(shape, polys):
    im = Image.new('L', (shape[1], shape[0]), 0); d = ImageDraw.Draw(im)
    for p in polys:
        d.polygon([tuple(q) for q in p], fill=255)
    return np.asarray(im) > 0


def emd(x, y, bins=64):
    hx, _ = np.histogram(x, bins=bins, range=(0, 1)); hy, _ = np.histogram(y, bins=bins, range=(0, 1))
    hx = hx / max(hx.sum(), 1); hy = hy / max(hy.sum(), 1)
    return float(np.abs(np.cumsum(hx) - np.cumsum(hy)).sum() / bins)       # 1D earth mover distance, units of full range (0..1)


def sat(img):
    mx = img.max(-1); mn = img.min(-1)
    return np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)


B = 16
def block_de(lab_a, lab_b, mask):
    h, w = mask.shape; hb, wb = h // B, w // B
    m = mask[:hb * B, :wb * B].reshape(hb, B, wb, B).all(axis=(1, 3))
    A_ = lab_a[:hb * B, :wb * B].reshape(hb, B, wb, B, 3).mean(axis=(1, 3)); B_ = lab_b[:hb * B, :wb * B].reshape(hb, B, wb, B, 3).mean(axis=(1, 3))
    de = np.sqrt(((A_ - B_) ** 2).sum(-1))
    return de, m


def region_stats(img, ref, mask):
    y = lum_d(img)[mask]; yr = lum_d(ref)[mask]
    lab_i, lab_r = to_lab(img), to_lab(ref)
    de, m = block_de(lab_i, lab_r, mask)
    return {'pixels': int(mask.sum()), 'mean_rgb': img[mask].mean(0).round(4).tolist(), 'ref_mean_rgb': ref[mask].mean(0).round(4).tolist(),
            'mean_Y': float(y.mean()), 'ref_mean_Y': float(yr.mean()), 'dY_mean': float(y.mean() - yr.mean()),
            'p5': float(np.percentile(y, 5)), 'p50': float(np.percentile(y, 50)), 'p95': float(np.percentile(y, 95)),
            'ref_p5': float(np.percentile(yr, 5)), 'ref_p50': float(np.percentile(yr, 50)), 'ref_p95': float(np.percentile(yr, 95)),
            'dp5': float(np.percentile(y, 5) - np.percentile(yr, 5)), 'dp95': float(np.percentile(y, 95) - np.percentile(yr, 95)),
            'emd': emd(y, yr), 'sat': float(sat(img)[mask].mean()), 'ref_sat': float(sat(ref)[mask].mean()),
            'block_dE_median': float(np.median(de[m])) if m.any() else None, 'block_dE_mean': float(de[m].mean()) if m.any() else None, 'blocks': int(m.sum())}


ref = load(a.ref); H, W, _ = ref.shape
regs = json.load(open(a.regions))
masks = {k: poly_mask((H, W), v) for k, v in regs.items() if not k.startswith('_')}
names = a.variants.split(',')
imgs = {k: load(os.path.join(a.shots, 'bridge-%s.png' % k)) for k in names if os.path.exists(os.path.join(a.shots, 'bridge-%s.png' % k))}
refs = {kv.split('=')[0]: load(kv.split('=', 1)[1]) for kv in a.ref_for}
res = {'ref': os.path.basename(a.ref), 'ref_for': {kv.split('=')[0]: os.path.basename(kv.split('=', 1)[1]) for kv in a.ref_for}, 'regions': {k: int(m.sum()) for k, m in masks.items()}, 'variants': {}}
for k, im in imgs.items():
    assert im.shape == ref.shape, (k, im.shape, ref.shape)
    rk = refs.get(k, ref); assert rk.shape == im.shape
    res['variants'][k] = {r: region_stats(im, rk, m) for r, m in masks.items()}
if a.hero and os.path.exists(a.hero):
    hero = load(a.hero)
    res['hero_secondary'] = {k: {r: region_stats(im, hero, m) for r, m in masks.items() if r in ('ground', 'sky')} for k, im in imgs.items()}
    res['hero_vs_matched_ref'] = {r: region_stats(hero, ref, m) for r, m in masks.items() if r in ('ground', 'sky')}
# pass/fail against the note's numbers (TUNING) on the ground region
tests = {}
if 'C' in res['variants']:
    c = res['variants']['C']['ground']; aa = res['variants'].get('A', {}).get('ground'); bb = res['variants'].get('B', {}).get('ground')
    tests = {'ground_mean_Y_within_0.03': abs(c['dY_mean']) <= 0.03, 'ground_p5_within_0.05': abs(c['dp5']) <= 0.05, 'ground_p95_within_0.05': abs(c['dp95']) <= 0.05,
             'ground_emd_under_0.04': c['emd'] < 0.04, 'ground_emd_at_most_half_of_A': (aa is not None and c['emd'] <= 0.5 * aa['emd']),
             'ground_block_dE_median_under_8': (c['block_dE_median'] or 99) < 8}
    res['pass_fail_C_ground'] = tests
json.dump(res, open(os.path.join(OUT, 'bridge-metrics.json'), 'w'), indent=1)

# ---- side by side and heat map
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
except Exception:
    FONT = ImageFont.load_default()


def labelled(img, text):
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, im.width, 26], fill=(0, 0, 0)); d.text((8, 3), text, fill=(255, 255, 255), font=FONT)
    return im


def grid(panels, cols, width):
    pw = width // cols; ph = int(pw * H / W)
    rows = math.ceil(len(panels) / cols); canvas = Image.new('RGB', (pw * cols, ph * rows), (20, 20, 20))
    for i, p in enumerate(panels):
        canvas.paste(p.resize((pw, ph), Image.LANCZOS), ((i % cols) * pw, (i // cols) * ph))
    return canvas


lab = {'A': 'A today live lighting', 'B': 'B today baked beauty', 'C': 'C bridge', 'D': 'D bridge, sun off', 'E': 'E bridge, sun el 35'}
panels = [labelled(ref, 'Blender Cycles (same content)')] + [labelled(imgs[k], lab[k]) for k in names if k in imgs]
for k in ('D', 'E'):
    if k in refs:
        panels.append(labelled(refs[k], 'Blender ref for ' + k))
grid(panels, 3, 1200).save(a.compare_out or os.path.join(OUT, 'bridge-compare.png'))


def heat(de):
    t = np.clip(de / 30.0, 0, 1)
    r = np.clip(3 * t, 0, 1); g = np.clip(3 * t - 1, 0, 1) * np.clip(3 - 3 * t + 0.0, 0, 1); b = np.clip(1.2 - 3 * t, 0, 1) * 0.6
    return np.stack([r, g, b], -1)


lab_ref = to_lab(ref); hp = []
for k in [x for x in ('A', 'B', 'C') if x in imgs]:
    d = np.sqrt(((to_lab(imgs[k]) - lab_ref) ** 2).sum(-1))
    # smooth to 4 px to read as blocks, overlay the ground region outline
    hm = heat(d); im = Image.fromarray((hm * 255).astype(np.uint8)); dr = ImageDraw.Draw(im)
    for poly in regs.get('ground', []):
        dr.line([tuple(p) for p in poly] + [tuple(poly[0])], fill=(255, 255, 255), width=2)
    dr.rectangle([0, 0, im.width, 26], fill=(0, 0, 0))
    gm = res['variants'][k]['ground']
    dr.text((8, 3), '%s dE76 vs Blender (0..30), ground median %.1f' % (k, gm['block_dE_median'] or -1), fill=(255, 255, 255), font=FONT)
    hp.append(im)
grid(hp, 3, 1200).save(os.path.join(OUT, 'bridge-heat.png'))
print(json.dumps({k: {'ground': {m: round(v, 4) if isinstance(v, float) else v for m, v in res['variants'][k]['ground'].items() if m in ('mean_Y', 'ref_mean_Y', 'dp5', 'dp95', 'emd', 'block_dE_median')}} for k in res['variants']}, indent=1))
print(json.dumps(tests))
