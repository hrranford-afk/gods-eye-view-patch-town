#!/usr/bin/env python3
"""Pack the float bakes of bake_bridge.py into the shipped files and fit the page's constants (numpy + PIL, no bpy).
   python3 bridge_pack.py --work <dir with *_f32.npy, pano_el*.npy, wedge.json> --out ../assets/bridge [--jpeg-q 92]
Writes: lightmap.jpg (+ lightmap.png for the size comparison, kept in --work), normal.png, sunmask.png, sky_pano.jpg (preview),
        bridge.json (light scale k, SH9 per sun elevation in three.js axes, tone curve table, desaturation table, sun, sizes), pack_report.json.
Conventions: Blender arrays have row 0 at the BOTTOM; image files are written top-down (flip), the glTF exporter flips V the same way, so the page
loads these with flipY = false."""
import argparse, json, os, math
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--work', required=True); ap.add_argument('--out', required=True); ap.add_argument('--jpeg-q', type=int, default=92)
ap.add_argument('--mask-blur', type=float, default=0.0, help='gaussian sigma (px) on the sun mask: softens the 1 degree sun to the penumbra Cycles shows in the beauty pass')
ap.add_argument('--blur', type=float, default=0.0, help='gaussian sigma (px) applied to the sky light map before packing (noise of the Cycles bake)')
a = ap.parse_args()
W, O = a.work, a.out
os.makedirs(O, exist_ok=True)
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


def size(p):
    return os.path.getsize(p)


# ---- light map: scene-linear, scaled so the p99.9 sits near 0.9, stored sRGB-encoded
L = np.load(os.path.join(W, 'light_f32.npy'))
L = gauss(L, a.blur)
lum = L.mean(2); p999 = float(np.percentile(lum, 99.9))
k = 1.0 if p999 <= 0.95 else 0.95 / p999
Ls = np.clip(L * k, 0, 1)
img = Image.fromarray(u8(enc(Ls))[::-1])
img.save(os.path.join(W, 'lightmap.png'), optimize=True)
img.save(os.path.join(O, 'lightmap.jpg'), quality=a.jpeg_q, subsampling=0, optimize=True)
img.save(os.path.join(W, 'lightmap_420.jpg'), quality=a.jpeg_q, optimize=True)
back = np.asarray(Image.open(os.path.join(O, 'lightmap.jpg')).convert('RGB'), np.float32)[::-1] / 255
err = np.abs(dec(back) - Ls)
rep['lightmap'] = {'png_bytes': size(os.path.join(W, 'lightmap.png')), 'jpg_bytes': size(os.path.join(O, 'lightmap.jpg')),
                   'jpg420_bytes': size(os.path.join(W, 'lightmap_420.jpg')), 'jpeg_q': a.jpeg_q, 'k': k,
                   'jpeg_max_abs_err_linear': float(err.max()), 'jpeg_mean_abs_err_linear': float(err.mean()),
                   'p5_p50_p95_lum': [float(np.percentile(lum * k, q)) for q in (5, 50, 95)]}

# ---- normal map (tangent space, 0..1, Non-Color)
N = np.load(os.path.join(W, 'normal_f32.npy'))
Image.fromarray(u8(N)[::-1]).save(os.path.join(W, 'normal.png'), optimize=True)
Image.fromarray(u8(N)[::-1]).save(os.path.join(O, 'normal.jpg'), quality=80, optimize=True)
nb = np.asarray(Image.open(os.path.join(O, 'normal.jpg')).convert('RGB'), np.float32)[::-1] / 255
rep['normal'] = {'png_bytes': size(os.path.join(W, 'normal.png')), 'jpg_q80_bytes': size(os.path.join(O, 'normal.jpg')), 'jpeg_mean_abs_err': float(np.abs(nb - N).mean()),
                 'std_xy': float(N[..., :2].std()), 'note': 'noisy bump from the 3.6 cm texel grain: PNG is huge, JPEG q80 keeps the shading'}

# ---- sun mask: R,G,B = three sun positions (PNG: JPEG chroma subsampling would mix the channels)
S = gauss(np.clip(np.load(os.path.join(W, 'shadow_f32.npy')), 0, 1), a.mask_blur)
Image.fromarray(u8(S)[::-1]).save(os.path.join(O, 'sunmask.png'), optimize=True)
rep['sunmask'] = {'png_bytes': size(os.path.join(O, 'sunmask.png')), 'mean_rgb': S.mean((0, 1)).tolist()}

# ---- SH9 from the panoramas (radiance SH in three.js axes), lower hemisphere replaced by sand bounce
info = json.load(open(os.path.join(O, 'bake_info.json')))
SUN_EL = info['sun_els']; SUN_AZ = info['sun_az']


def pano_dirs(h, w):
    v = (np.arange(h) + 0.5) / h; u = (np.arange(w) + 0.5) / w
    lat = (v - 0.5) * math.pi                        # row 0 = bottom
    lon = (u - 0.5) * 2 * math.pi                    # centre = north (+Y), positive to the right (+X); verified with the sun glow below
    LON, LAT = np.meshgrid(lon, lat)
    x = np.sin(LON) * np.cos(LAT); y = np.cos(LON) * np.cos(LAT); z = np.sin(LAT)      # Blender frame
    dom = np.cos(LAT) * (math.pi / h) * (2 * math.pi / w)
    return x, y, z, dom


def sh_basis(x, y, z):                                  # three.js SphericalHarmonics3.getBasisAt, three axes
    return [0.282095 + 0 * x, 0.488603 * y, 0.488603 * z, 0.488603 * x, 1.092548 * x * y, 1.092548 * y * z, 0.315392 * (3 * z * z - 1), 1.092548 * x * z, 0.546274 * (x * x - y * y)]


sh_all = {}; ground = np.array([0.40, 0.34, 0.22])
for el in SUN_EL:
    P = np.load(os.path.join(W, 'pano_el%d.npy' % int(el)))
    h, w, _ = P.shape
    bx, by, bz, dom = pano_dirs(h, w)
    up = bz > 0
    # check the mapping with the brightest 0.5 percent of the upper hemisphere: its centroid azimuth must be the sun azimuth
    Y = P.mean(2); thr = np.percentile(Y[up], 99.5); m = up & (Y >= thr)
    az = math.degrees(math.atan2(bx[m].mean(), by[m].mean())) % 360
    Eup = float((P.mean(2) * np.maximum(bz, 0) * dom * up).sum())            # greyscale E, for the ground bounce
    Eup_rgb = np.array([(P[..., c] * np.maximum(bz, 0) * dom * up).sum() for c in range(3)])
    Pg = P.copy()
    for c in range(3):
        Pg[..., c] = np.where(up, P[..., c], ground[c] * Eup_rgb[c] / math.pi)
    tx, ty, tz = bx, bz, -by                         # Blender (x,y,z) -> three (x, z, -y)
    B = sh_basis(tx, ty, tz)
    coef = np.array([[(Pg[..., c] * B[i] * dom).sum() for c in range(3)] for i in range(9)])
    sh_all[str(int(el))] = coef.round(5).tolist()
    # irradiance check: reconstruct E(normal = up)/pi from the SH (cosine-lobe convolution A0=pi, A1=2pi/3, A2=pi/4) and compare with the direct integral
    bn = [float(b) if np.ndim(b) == 0 else float(b.flat[0]) for b in sh_basis(np.array(0.0), np.array(1.0), np.array(0.0))]
    amp = [1.0, 2 / 3, 2 / 3, 2 / 3, 0.25, 0.25, 0.25, 0.25, 0.25]
    e_sh = sum(coef[i] * bn[i] * amp[i] for i in range(9))
    rep.setdefault('sh', {})[str(int(el))] = {'sun_azimuth_found_deg': round(az, 1), 'sun_azimuth_expected_deg': SUN_AZ, 'L_mean_upper_rgb': [float(P[..., c][up].mean()) for c in range(3)],
                                               'E_up_over_pi_rgb_integral': (Eup_rgb / math.pi).round(4).tolist(), 'E_up_over_pi_rgb_from_sh': np.round(e_sh, 4).tolist()}

# ---- tone fit from the wedge
wj = json.load(open(os.path.join(W, 'wedge.json')))
ev = np.array(wj['ev']); inn = np.array(wj['in']); outs = np.array(wj['out_srgb'])
grey_out = dec(outs[0].mean(1)); grey_ev = ev
EV0, STEP, NT = -10.0, 0.25, 65
tev = EV0 + STEP * np.arange(NT)
table = np.interp(tev, grey_ev, grey_out, left=grey_out[0], right=grey_out[-1])
table = np.maximum.accumulate(table)
grey_fit_err = float(np.abs(enc(np.interp(grey_ev, tev, table)) - enc(grey_out)).max())


def curve(x):
    e = np.log2(np.maximum(x, 1e-9)); f = np.clip((e - EV0) / STEP, 0, NT - 1.001); i = f.astype(int); t = f - i
    return table[i] * (1 - t) + table[i + 1] * t


# colour rows: per-channel curve alone, then with a luminance-dependent desaturation term s(EV)
LW = np.array([0.2126, 0.7152, 0.0722])
rows_err = {}
tgt = dec(outs)                                              # (rows, NP, 3) linear display
P = curve(inn)                                               # per channel
lP = (P * LW).sum(-1, keepdims=True)
ND = 33; dev = np.linspace(EV0, 5.9, ND)
Yin = (inn * LW).sum(-1)                                     # input luminance
s_num = np.zeros(ND); s_den = np.zeros(ND)
for r in range(1, inn.shape[0]):
    e_in = np.log2(np.maximum(Yin[r], 1e-9))
    for j in range(inn.shape[1]):
        b = int(np.clip(round((e_in[j] - EV0) / (dev[1] - dev[0])), 0, ND - 1))
        d = (P[r, j] - lP[r, j]); t = (tgt[r, j] - lP[r, j])
        s_num[b] += (d * t).sum(); s_den[b] += (d * d).sum()
s_tab = np.where(s_den > 1e-9, s_num / np.maximum(s_den, 1e-9), 1.0)
s_tab = np.clip(s_tab, 0, 1.5)
# smooth and fill empty bins
good = s_den > 1e-9
s_tab = np.interp(dev, dev[good], s_tab[good]) if good.any() else np.ones(ND)
s_tab = np.convolve(np.pad(s_tab, 2, mode='edge'), np.ones(5) / 5, 'valid')


def apply(inn_, use_desat):
    P_ = curve(inn_); l = (P_ * LW).sum(-1, keepdims=True)
    if use_desat:
        e = np.log2(np.maximum((inn_ * LW).sum(-1, keepdims=True), 1e-9)); s = np.interp(e, dev, s_tab)
        P_ = l + s * (P_ - l)
    return np.clip(P_, 0, 1)


names = ['grey', 'red', 'green', 'blue', 'sand', 'grass', 'sky', 'sun']
for use in (False, True):
    res = {}
    for r, nm in enumerate(names):
        q = apply(inn[r], use)
        res[nm] = {'mean_abs_srgb': float(np.abs(enc(q) - outs[r]).mean()), 'max_abs_srgb': float(np.abs(enc(q) - outs[r]).max())}
    rows_err['desat' if use else 'per_channel'] = res
# ACES (what r128 ships) for comparison on the same wedge, per three.js RRTAndODTFit with exposure 0.9 and the /0.6 factor
def aces(c, expo):
    inm = np.array([[0.59719, 0.35458, 0.04823], [0.07600, 0.90834, 0.01566], [0.02840, 0.13383, 0.83777]])
    outm = np.array([[1.60475, -0.53108, -0.07367], [-0.10208, 1.10813, -0.00605], [-0.00327, -0.07276, 1.07602]])
    v = (c * expo / 0.6) @ inm.T
    a_ = v * (v + 0.0245786) - 0.000090537; b_ = v * (0.983729 * v + 0.4329510) + 0.238081
    return np.clip((a_ / b_) @ outm.T, 0, 1)
rows_err['aces_0.9'] = {nm: {'mean_abs_srgb': float(np.abs(enc(aces(inn[r], 0.9)) - outs[r]).mean())} for r, nm in enumerate(names)}
rows_err['aces_grey_mid'] = {'mid_grey_in_0.18': {'blender': float(enc(grey_out[np.argmin(abs(ev - math.log2(0.18)))])), 'aces_0.9': float(enc(aces(np.array([[0.18] * 3]), 0.9))[0, 0])}}
use_desat = float(np.mean([rows_err['desat'][n]['mean_abs_srgb'] for n in names[1:]])) < 0.8 * float(np.mean([rows_err['per_channel'][n]['mean_abs_srgb'] for n in names[1:]]))
tone = {'ev0': EV0, 'step': STEP, 'table': table.round(6).tolist(), 'desat_ev0': EV0, 'desat_ev1': 5.9, 'desat': s_tab.round(4).tolist(), 'use_desat': bool(use_desat),
        'output': 'linear display values: the page applies the sRGB OETF afterwards (renderer.outputEncoding = sRGBEncoding)', 'view': wj['view'], 'look': wj['look'], 'blender': wj['blender'],
        'grey_fit_max_abs_srgb': grey_fit_err}
rep['tone'] = {'grey_fit_max_abs_srgb': grey_fit_err, 'rows': rows_err, 'use_desat': bool(use_desat)}

# ---- panorama preview (exposure x1.5, sRGB), 1024x512 JPEG
P20 = np.load(os.path.join(W, 'pano_el%d.npy' % int(SUN_EL[0])))
Image.fromarray(u8(enc(P20 * 1.5))[::-1]).save(os.path.join(O, 'sky_pano.jpg'), quality=88)
rep['sky_pano'] = {'jpg_bytes': size(os.path.join(O, 'sky_pano.jpg'))}

bridge = {'light_k': k, 'light_intensity': 1.0 / k, 'sun_az': SUN_AZ, 'sun_els': SUN_EL, 'sun_strength_w_m2': info['sun_strength'], 'sun_color_linear': info['sun_color'],
          'sky_strength': info['sky_strength'], 'sh': sh_all, 'tone': tone, 'tex': info['tex'], 'half': info['half'], 'exposure_ev_hero': -0.4,
          'files': {'glb': 'island_bridge.glb', 'lightmap': 'lightmap.jpg', 'normal': 'normal.jpg', 'sunmask': 'sunmask.png'}}
json.dump(bridge, open(os.path.join(O, 'bridge.json'), 'w'))
rep['bytes'] = {f: size(os.path.join(O, f)) for f in os.listdir(O) if os.path.isfile(os.path.join(O, f))}
json.dump(rep, open(os.path.join(O, 'pack_report.json'), 'w'), indent=1)
print(json.dumps(rep, indent=1)[:4000])
