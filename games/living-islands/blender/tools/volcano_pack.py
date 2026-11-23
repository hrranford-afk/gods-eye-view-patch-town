#!/usr/bin/env python3
"""Pack the float bakes of bake_volcano.py into the shipped files of the cutaway finish pass (numpy + PIL, no bpy).
   python3 volcano_pack.py --work <dir with light_f32.npy, pano.npy, bake_info.json> --vol ../../landform/volcano [--blur 1.0] [--jpeg-q 92]
Writes landform/volcano/finish/: lightmap.jpg (sky GI + AO, scene linear scaled by light_k, sRGB coded), sunmask.jpg (sun visibility 0..1, one sun position),
finish.json (sun, hemisphere colours from the panorama, light_k, file names, sizes), sky_pano.jpg (preview).
SUN MASK: Blender's SHADOW bake type returned 1.0 nearly everywhere on this mesh (0.04 percent of texels below 0.9 at a sun elevation of 30 degrees over a 237 m cone),
so the mask is ray marched here from the same heightfield instead (exact for a heightfield; soft edge of +-0.5 degrees of elevation for the sun disc and the diffuse
sky around it). Cycles still bakes the sky light and the AO. Conventions as in tools/bridge_pack.py: Blender arrays have row 0 at the BOTTOM, files are written top-down."""
import argparse, json, math, os
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--work', required=True); ap.add_argument('--vol', required=True); ap.add_argument('--jpeg-q', type=int, default=92)
ap.add_argument('--blur', type=float, default=1.0); ap.add_argument('--mask-soft-deg', type=float, default=0.5)
a = ap.parse_args()
O = os.path.join(a.vol, 'finish'); os.makedirs(O, exist_ok=True)
info = json.load(open(os.path.join(a.work, 'bake_info.json')))
man = json.load(open(os.path.join(a.vol, 'manifest.json')))
n = man['n']; size = man['size_m']; half = size / 2.0; T = info['tex']; PAD = info['pad_px']
rep = {}


def enc(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 1e-8), 1 / 2.4) - 0.055)


def dec(y):
    y = np.clip(y, 0, 1)
    return np.where(y <= 0.04045, y / 12.92, np.power((y + 0.055) / 1.055, 2.4))


def u8(x):
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)


def gauss(img, sigma):
    if sigma <= 0:
        return img
    r = int(3 * sigma + 1); k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    pad = np.pad(img, ((r, r), (0, 0), (0, 0)), mode='edge')
    img = sum(k[i] * pad[i:i + img.shape[0]] for i in range(2 * r + 1))
    pad = np.pad(img, ((0, 0), (r, r), (0, 0)), mode='edge')
    return sum(k[i] * pad[:, i:i + img.shape[1]] for i in range(2 * r + 1))


size_of = lambda p: os.path.getsize(p)

# ---- light map
L = gauss(np.load(os.path.join(a.work, 'light_f32.npy')), a.blur)
lum = L.mean(2); p999 = float(np.percentile(lum, 99.9))
k = 1.0 if p999 <= 0.95 else 0.95 / p999
Ls = np.clip(L * k, 0, 1)
img = Image.fromarray(u8(enc(Ls))[::-1])
img.save(os.path.join(a.work, 'lightmap.png'), optimize=True)
img.save(os.path.join(O, 'lightmap.jpg'), quality=a.jpeg_q, subsampling=0, optimize=True)
back = np.asarray(Image.open(os.path.join(O, 'lightmap.jpg')).convert('RGB'), np.float32)[::-1] / 255
err = np.abs(dec(back) - Ls)
rep['lightmap'] = {'png_bytes': size_of(os.path.join(a.work, 'lightmap.png')), 'jpg_bytes': size_of(os.path.join(O, 'lightmap.jpg')), 'k': k,
                   'jpeg_max_abs_err_linear': float(err.max()), 'jpeg_mean_abs_err_linear': float(err.mean()), 'p5_p50_p95_lum': [float(np.percentile(lum * k, q)) for q in (5, 50, 95)]}

# ---- sun mask by ray march over the heightfield (texel grid of the light map)
H = np.fromfile(os.path.join(a.vol, man['heights_file']), '<f4').reshape(n, n).astype(np.float64)
el, az = info['sun_el'], info['sun_az']
sdir = np.array([math.sin(math.radians(az)) * math.cos(math.radians(el)), math.cos(math.radians(az)) * math.cos(math.radians(el)), math.sin(math.radians(el))])
hx, hy = sdir[0] / math.hypot(sdir[0], sdir[1]), sdir[1] / math.hypot(sdir[0], sdir[1])
# texel centres in the planar uv with gutter: u = (PAD + x01 * (T - 2 PAD)) / T, row 0 of the array = v 0 = south
tex = (np.arange(T) + 0.5)
x01 = np.clip((tex - PAD) / (T - 2 * PAD), 0, 1)
XX, YY = np.meshgrid(x01 * size - half, x01 * size - half)          # [row = south..north, col = west..east]


def hsample(x, y):
    gx = np.clip((x + half) / (size / (n - 1)), 0, n - 1.0001); gy = np.clip((y + half) / (size / (n - 1)), 0, n - 1.0001)
    j = gx.astype(np.int32); i = gy.astype(np.int32); fx = gx - j; fy = gy - i
    return (H[i, j] * (1 - fx) + H[i, j + 1] * fx) * (1 - fy) + (H[i + 1, j] * (1 - fx) + H[i + 1, j + 1] * fx) * fy


h0 = hsample(XX, YY) + 0.6
tan_e = math.tan(math.radians(el)); soft = math.radians(a.mask_soft_deg)
worst = np.full(XX.shape, -9.0)
t = 3.0
while t < 2400.0:
    px = XX + hx * t; py = YY + hy * t
    inside = (np.abs(px) < half) & (np.abs(py) < half)
    ang = np.arctan2(hsample(px, py) - h0, t)                       # elevation angle of the terrain seen from the texel along the sun azimuth
    worst = np.maximum(worst, np.where(inside, ang, -9.0))
    t *= 1.012
d = (worst - math.radians(el)) / soft                               # > 1: fully blocked, < -1: fully lit
vis = 1.0 - np.clip(0.5 + 0.5 * d, 0, 1)
vis = gauss(vis[..., None], 0.8)[..., 0]
Image.fromarray(u8(vis)[::-1], 'L').save(os.path.join(O, 'sunmask.jpg'), quality=90, optimize=True)
rep['sunmask'] = {'jpg_bytes': size_of(os.path.join(O, 'sunmask.jpg')), 'mean': float(vis.mean()), 'shadowed_fraction_below_0.5': float((vis < 0.5).mean()),
                  'method': 'heightfield ray march, soft edge +-%.2f deg' % a.mask_soft_deg}

# ---- hemisphere colours from the panorama (sky irradiance over pi for an up-facing normal, horizon and zenith radiance, ground bounce)
P = np.load(os.path.join(a.work, 'pano.npy'))
h, w, _ = P.shape
v = (np.arange(h) + 0.5) / h; u = (np.arange(w) + 0.5) / w
LAT, LON = np.meshgrid((v - 0.5) * math.pi, (u - 0.5) * 2 * math.pi, indexing='ij')[0], np.meshgrid((v - 0.5) * math.pi, (u - 0.5) * 2 * math.pi, indexing='ij')[1]
dom = np.cos(LAT) * (math.pi / h) * (2 * math.pi / w)
up = LAT > 0
E_up = np.array([(P[..., c] * np.maximum(np.sin(LAT), 0) * dom * up).sum() for c in range(3)])
sky_up = E_up / math.pi
hor = np.array([P[..., c][np.abs(LAT) < math.radians(8)].mean() for c in range(3)])
zen = np.array([P[..., c][LAT > math.radians(70)].mean() for c in range(3)])
ground = np.array([0.30, 0.27, 0.22]) * sky_up * 0.9
rep['sky'] = {'sky_up_E_over_pi_rgb': sky_up.round(4).tolist(), 'horizon_rgb': hor.round(4).tolist(), 'zenith_rgb': zen.round(4).tolist(), 'ground_bounce_rgb': ground.round(4).tolist()}
Image.fromarray(u8(enc(P * 1.5))[::-1]).save(os.path.join(O, 'sky_pano.jpg'), quality=85)

sd3 = [float(sdir[0]), float(sdir[2]), float(-sdir[1])]             # Blender (x, y, z) -> three (x, z, -y)
fin = {'version': 1, 'sun_el': el, 'sun_az': az, 'sun_dir_three': sd3, 'sun_strength_w_m2': info['sun_strength'], 'sun_color_linear': info['sun_color'], 'sky_strength': info['sky_strength'],
       'light_k': k, 'light_intensity': 1.0 / k, 'tex': T, 'pad_px': PAD, 'sky_up': sky_up.round(5).tolist(), 'sky_horizon': hor.round(5).tolist(), 'sky_zenith': zen.round(5).tolist(), 'ground': ground.round(5).tolist(),
       'samples': info['samples'], 'blender': info['blender'], 'bake_seconds': info.get('bake_seconds'), 'vol_hash': info['vol_hash'],
       'files': {'lightmap': 'lightmap.jpg', 'sunmask': 'sunmask.jpg'}}
json.dump(fin, open(os.path.join(O, 'finish.json'), 'w'), indent=1)
rep['bytes'] = {f: size_of(os.path.join(O, f)) for f in os.listdir(O) if os.path.isfile(os.path.join(O, f))}
json.dump(rep, open(os.path.join(O, 'pack_report.json'), 'w'), indent=1)
print(json.dumps(rep, indent=1))
