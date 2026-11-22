"""Approach 3: a painted storybook chart of the same island, made from the shared heightmap with numpy + PIL.
Pipeline: oblique painter's-algorithm terrain -> toon-quantised hillshade -> pigment wobble/edge pooling -> brush strokes along the slope
-> ink outlines (coast, cliffs) -> pictogram trees/tents/boat/fire -> watercolour sea bands -> paper grain, title, compass.
Usage: python3 paint_illustration.py [out.png]"""
import sys, os, json, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import heightmap as HM, scene2d as S
HERE = os.path.dirname(os.path.abspath(__file__))
js = json.load(open(os.path.join(HERE, 'island.json')))
SC = S.build(); step = 2
G = SC['G'][::step, ::step].copy(); A0 = SC['A0'][::step, ::step].copy(); M2 = G.shape[0]; cell = S.R * step
SS = 2; W, H = 1200 * SS, 800 * SS
s_ = 8.6; KY = .50; KH = 1.0; CX, CZ, CY = 0.0, 8.0, 520 * SS
rng = np.random.default_rng(42)
def noise(n, base, oct=3, seed=0):
    return HM.fbm(np.random.default_rng(seed), n, base, oct).astype(np.float32)
NZ = noise(2400, 5, 4, 1); NZ2 = noise(2400, 40, 3, 2); NZ3 = noise(2400, 14, 3, 3)
def sx(x): return W / 2 + (x - CX) * s_
def sy(z, h): return CY + (z - CZ) * s_ * KY - h * s_ * KH
def shade_color(base, tone): return np.clip(base * tone[..., None], 0, 1)

zs = ((np.arange(M2) + .5) * cell - HM.SIZE / 2).astype(np.float32); xs = zs.copy()
Hd = np.maximum(G, 0)
gy, gx = np.gradient(blur := S.blur(Hd, 2), cell)
Nrm = np.stack([-gx, np.ones_like(gx), -gy], -1); Nrm /= np.linalg.norm(Nrm, axis=-1, keepdims=True)
Ld = np.array([-.55, .78, .45], np.float32); Ld /= np.linalg.norm(Ld)
lam = np.clip((Nrm * Ld).sum(-1), 0, 1)
# toon bands, soft edges
q = np.floor(lam * 4.2) / 4.2 * .65 + lam * .35
tone = .56 + .80 * q
# painterly palette (more saturated/warm than the physical albedo)
base = A0.copy()
lum = base.mean(-1, keepdims=True); base = np.clip(lum + (base - lum) * 1.25, 0, 1)
base = base * np.array([1.04, 1.0, .88], np.float32) + np.array([.03, .02, 0], np.float32)
land_col = shade_color(base, tone)
# sea palette by depth bands
dep = np.maximum(-G, 0)
def ramp(d):
    stops = [(0, (.62, .88, .80)), (1.2, (.34, .78, .78)), (3.5, (.20, .58, .74)), (8, (.13, .38, .66)), (30, (.07, .22, .50))]
    out = np.zeros(d.shape + (3,), np.float32)
    for (a, ca), (b, cb) in zip(stops[:-1], stops[1:]):
        t = np.clip((d - a) / (b - a), 0, 1)[..., None]; m = ((d >= a) & (d < b))[..., None]
        out = np.where(m, np.array(ca, np.float32) * (1 - t) + np.array(cb, np.float32) * t, out)
    return np.where((d >= stops[-1][0])[..., None], np.array(stops[-1][1], np.float32), out)
band = np.floor(dep / 1.6) * 1.6 + 0.35 * (dep - np.floor(dep / 1.6) * 1.6)
sea_col = ramp(band)
col = np.where((G > .05)[..., None], land_col, sea_col)
# cliff face colour for steps
face_col = np.clip(base * .52 + np.array([.0, .0, .06], np.float32), 0, 1)

canvas = np.zeros((H, W, 3), np.float32); canvas[:] = ramp(np.array(40.0))
zb = np.full((H, W), -1, np.int16); face = np.zeros((H, W), bool); hpx = np.zeros((H, W), np.float32); lpx = np.zeros((H, W), np.float32); landpx = np.zeros((H, W), bool)
cw = int(np.ceil(cell * s_)) + 1; dzs = cell * s_ * KY
X0 = np.round(sx(xs - cell / 2)).astype(int)
tops = [sy(zs[i], Hd[i]) for i in range(M2)]
for i in range(M2):
    yt = tops[i]; yn = tops[i + 1] if i + 1 < M2 else yt + dzs
    yb = np.maximum(yt + dzs, yn) + 1
    yt_i = np.round(yt).astype(int); n = np.round(yb - yt).astype(int)
    onland = Hd[i] > .05
    for k in range(int(max(n.max(), 1))):
        m = k < n
        if not m.any(): break
        yy = yt_i + k; ok = m & (yy >= 0) & (yy < H)
        isface = (k >= np.round(dzs)) & ((yn - yt - dzs) > 2.2 * dzs)
        c = np.where((isface & onland)[:, None], face_col[i], col[i])
        for dx in range(cw):
            xx = X0 + dx; ok2 = ok & (xx >= 0) & (xx < W)
            canvas[yy[ok2], xx[ok2]] = c[ok2]; zb[yy[ok2], xx[ok2]] = i
            face[yy[ok2], xx[ok2]] = (isface & onland)[ok2]
            hpx[yy[ok2], xx[ok2]] = Hd[i][ok2]; lpx[yy[ok2], xx[ok2]] = lam[i][ok2]; landpx[yy[ok2], xx[ok2]] = onland[ok2]
# ---- smooth blocky edges, pigment wobble (domain warp)
def warp(img, amp, nz1, nz2):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = (nz1[:H, :W] - .5) * amp; dy = (nz2[:H, :W] - .5) * amp
    xi = np.clip(xx + dx, 0, W - 1).astype(np.int32); yi = np.clip(yy + dy, 0, H - 1).astype(np.int32)
    return img[yi, xi]
canvas = warp(canvas, 9 * SS, NZ3[:, ::-1], NZ2.T)
face = warp(face, 9 * SS, NZ3[:, ::-1], NZ2.T); landpx = warp(landpx, 9 * SS, NZ3[:, ::-1], NZ2.T); hpx = warp(hpx, 9 * SS, NZ3[:, ::-1], NZ2.T); lpx = warp(lpx, 9 * SS, NZ3[:, ::-1], NZ2.T); zb = warp(zb, 9 * SS, NZ3[:, ::-1], NZ2.T)
img = Image.fromarray((canvas * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
canvas = np.asarray(img, np.float32) / 255
# granulation + wash variation
gran = (noise(2400, 150, 2, 4)[:H, :W] - .5)
wash = (NZ[:H, :W] - .5)
canvas = np.clip(canvas * (1 + gran[..., None] * .16 + wash[..., None] * .22), 0, 1)
# edge pooling (pigment gathers where colour changes)
lumc = canvas.mean(-1); bl = np.asarray(Image.fromarray((lumc * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5 * SS)), np.float32) / 255
pool = np.clip(np.abs(lumc - bl) * 4.0, 0, .35)
canvas = canvas * (1 - pool[..., None] * .55)
# ---- brush strokes along contours
st = Image.fromarray((canvas * 255).astype(np.uint8)).convert('RGBA'); lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
hb = np.asarray(Image.fromarray(np.clip(hpx * 12, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6 * SS)), np.float32) / 12
gyp, gxp = np.gradient(hb); ang_c = np.arctan2(gxp, -gyp)
ys_, xs_ = np.nonzero(landpx[::6, ::6]); ys_ *= 6; xs_ *= 6
sel = rng.permutation(len(ys_))[:30000]
for k in sel:
    y, x = ys_[k], xs_[k]; c = canvas[y, x]; a = ang_c[y, x] + rng.normal(0, .35); L = rng.uniform(9, 20) * SS * .75
    f = rng.uniform(.82, 1.14); cc = tuple(int(np.clip(v * f * 255, 0, 255)) for v in c)
    dr.line([(x - np.cos(a) * L / 2, y - np.sin(a) * L / 2), (x + np.cos(a) * L / 2, y + np.sin(a) * L / 2)], fill=cc + (70,), width=int(3 * SS * .6))
# ink-ish hatch strokes in the shaded slopes
hy, hx = np.nonzero((lpx[::5, ::5] < .30) & landpx[::5, ::5]); hy *= 5; hx *= 5
for k in rng.permutation(len(hy))[:9000]:
    y, x = hy[k], hx[k]; a = ang_c[y, x] + 1.57 + rng.normal(0, .25); L = rng.uniform(8, 15) * SS * .7
    dr.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=(60, 40, 40, 85), width=max(1, int(1.2 * SS * .8)))
st.alpha_composite(lay); canvas = np.asarray(st.convert('RGB'), np.float32) / 255
# ---- ink: coast + cliff edges + isobath lines
ink = np.array([.17, .11, .09], np.float32)
lm = Image.fromarray((landpx * 255).astype(np.uint8))
er = np.asarray(lm.filter(ImageFilter.MinFilter(5)), np.float32) / 255; di = np.asarray(lm.filter(ImageFilter.MaxFilter(7)), np.float32) / 255
coast = (di - er) > .5
cl = np.asarray(Image.fromarray((coast * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.9 * SS)), np.float32) / 255
canvas = canvas * (1 - np.clip(cl * 1.5, 0, .9)[..., None]) + ink * np.clip(cl * 1.5, 0, .9)[..., None]
# second, broken blue-ink coast line out at sea (chart style)
ring = np.asarray(lm.filter(ImageFilter.MaxFilter(25)), np.float32) / 255; ring2 = np.asarray(lm.filter(ImageFilter.MaxFilter(21)), np.float32) / 255
rl = ((ring - ring2) > .5) & (NZ3[:H, :W] > .44)
rl = np.asarray(Image.fromarray((rl * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8 * SS)), np.float32) / 255
canvas = canvas * (1 - rl[..., None] * .55) + np.array([.12, .30, .50], np.float32) * rl[..., None] * .55
# cliff/ridge ink lines where a vertical face begins
fm = face.astype(np.uint8) * 255
fe = (np.asarray(Image.fromarray(fm).filter(ImageFilter.MaxFilter(3)), np.float32) - np.asarray(Image.fromarray(fm).filter(ImageFilter.MinFilter(3)), np.float32)) > 100
fl = np.asarray(Image.fromarray((fe * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7 * SS)), np.float32) / 255
canvas = canvas * (1 - np.clip(fl * 1.1, 0, .8)[..., None]) + ink * np.clip(fl * 1.1, 0, .8)[..., None]
# isobath rings in the sea
dpx = np.where(landpx, 0, 1)
# approximate depth band edges via the painted sea colour
sc_l = canvas.mean(-1); gm = np.hypot(*np.gradient(np.asarray(Image.fromarray((sc_l * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3 * SS)), np.float32)))
ib = np.clip(gm * .08 - .0, 0, .30) * (~landpx)
canvas = canvas * (1 - ib[..., None] * .7) + np.array([.78, .93, .95], np.float32) * ib[..., None] * .7
# ---- props (pictograms), z-occluded by nearer terrain
def put(drawfn, wz, box):
    x0, y0, x1, y1 = [int(v) for v in box]; x0 = max(x0, 0); y0 = max(y0, 0); x1 = min(x1, W); y1 = min(y1, H)
    if x1 <= x0 or y1 <= y0: return
    L = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0)); d = ImageDraw.Draw(L); drawfn(d, -x0, -y0)
    row = int((wz + HM.SIZE / 2) / cell); vis = (zb[y0:y1, x0:x1] <= row + 2) | (zb[y0:y1, x0:x1] < 0)
    a = np.asarray(L)[..., 3].astype(np.float32) * vis; arr = np.asarray(L, np.float32).copy(); arr[..., 3] = a
    base_ = Image.fromarray((canvas[y0:y1, x0:x1] * 255).astype(np.uint8)).convert('RGBA')
    base_.alpha_composite(Image.fromarray(arr.astype(np.uint8)))
    canvas[y0:y1, x0:x1] = np.asarray(base_.convert('RGB'), np.float32) / 255
def gh(x, z): return max(HM.sample(np.load(os.path.join(HERE, 'island.npy')), x, z), 0)
H256 = np.load(os.path.join(HERE, 'island.npy')); gh = lambda x, z: max(HM.sample(H256, x, z), 0)
rgb = lambda c, f=1: tuple(int(np.clip(v * f * 255, 0, 255)) for v in c)
INK = rgb(ink); lw = int(2.2 * SS * .8)
objs = []
for c in js['conifers']: objs.append(('tree', c['z'], c))
for r in js['rocks']:
    if r['y'] > -.4: objs.append(('rock', r['z'], r))
for t in js['camp']['tents']: objs.append(('tent', t['z'], t))
objs.append(('boat', js['camp']['boat']['z'], js['camp']['boat'])); objs.append(('fire', js['camp']['fire']['z'], js['camp']['fire']))
for dx, dz, c in ((-14.5, 4.0, (.2, .35, .75)), (-12.8, 5.6, (.95, .78, .12)), (3.0, 1.6, (.82, .15, .1))): objs.append(('person', js['camp']['fire']['z'] + dz, dict(x=js['camp']['fire']['x'] + dx, z=js['camp']['fire']['z'] + dz, c=c)))
for kind, wz, o in sorted(objs, key=lambda t: t[1]):
    x, z = o['x'], o['z']; h = gh(x, z); X, Y = sx(x), sy(z, h)
    if kind == 'tree':
        Hh = o['h'] * 1.5; sc = s_ * .95
        def f(d, ox, oy, X=X, Y=Y, Hh=Hh, sc=sc, x=x):
            X += ox; Y += oy
            d.ellipse([X - Hh * sc * .22, Y - 4, X + Hh * sc * .5, Y + Hh * sc * .09], fill=(40, 60, 30, 90))
            d.rectangle([X - 2.5 * SS, Y - Hh * sc * .15, X + 2.5 * SS, Y], fill=rgb((.35, .22, .12)), outline=INK)
            for t_ in range(3):
                bw = Hh * sc * (.27 - .06 * t_) * 1.0; y1 = Y - Hh * sc * (.08 + .27 * t_); y0 = y1 - Hh * sc * .42
                d.polygon([(X, y0), (X + bw, y1), (X - bw, y1)], fill=rgb((.13, .38, .24) if t_ % 2 == 0 else (.16, .44, .27)), outline=INK)
                d.polygon([(X, y0), (X - bw * .02, y1), (X - bw, y1)], fill=rgb((.22, .52, .32)))
                d.line([(X, y0), (X + bw, y1), (X - bw, y1), (X, y0)], fill=INK, width=lw)
                d.line([(X + bw * .2, y0 + (y1 - y0) * .4), (X + bw * .7, y1 - 2), (X + bw * .35, y1 - 2)], fill=rgb((.07, .22, .14)), width=SS)
        put(f, wz, (X - Hh * s_ * .3, Y - Hh * s_ * .8, X + Hh * s_ * .5, Y + 20))
    elif kind == 'rock':
        r = o['s'] * s_ * .8
        def f(d, ox, oy, X=X, Y=Y, r=r):
            X += ox; Y += oy
            d.polygon([(X - r, Y), (X - r * .6, Y - r * .8), (X + r * .3, Y - r * .95), (X + r, Y - r * .1), (X + r * .5, Y + r * .2)], fill=rgb((.55, .5, .46)), outline=INK)
            d.polygon([(X - r, Y), (X - r * .6, Y - r * .8), (X + r * .1, Y - r * .6), (X - r * .3, Y)], fill=rgb((.72, .66, .6)))
            d.line([(X - r, Y), (X - r * .6, Y - r * .8), (X + r * .3, Y - r * .95), (X + r, Y - r * .1), (X + r * .5, Y + r * .2), (X - r, Y)], fill=INK, width=lw)
        put(f, wz, (X - r - 4, Y - r - 6, X + r + 4, Y + r * .4 + 6))
    elif kind == 'tent':
        a = np.radians(o['rot']); tw = 5.6 * s_ * .85; th = 3.1 * s_ * KH * 1.5; cl_ = (.93, .45, .12) if o['color'] == 'orange' else (.16, .32, .68)
        def f(d, ox, oy, X=X, Y=Y, tw=tw, th=th, cl_=cl_):
            X += ox; Y += oy
            d.polygon([(X - tw * .9, Y + 4), (X + tw * 1.2, Y + 4), (X + tw * .9, Y + 12), (X - tw * .8, Y + 12)], fill=(70, 55, 40, 70))
            d.polygon([(X - tw, Y), (X, Y - th), (X + tw, Y)], fill=rgb(cl_), outline=INK)
            d.polygon([(X - tw, Y), (X, Y - th), (X, Y)], fill=rgb(cl_, .8))
            d.polygon([(X - tw * .25, Y), (X, Y - th * .55), (X + tw * .25, Y)], fill=rgb((.14, .1, .08)))
            d.polygon([(X + tw, Y), (X + tw * 1.4, Y - th * .28), (X + tw * .4, Y - th * .78), (X, Y - th)], fill=rgb(cl_, 1.12), outline=INK)
            d.line([(X - tw, Y), (X, Y - th), (X + tw, Y), (X - tw, Y)], fill=INK, width=lw)
        put(f, wz, (X - 90, Y - 120, X + 120, Y + 30))
    elif kind == 'boat':
        bl_ = 4.4 * s_ * .9; bh = 1.3 * s_ * .9
        def f(d, ox, oy, X=X, Y=Y, bl_=bl_, bh=bh):
            X += ox; Y += oy
            d.polygon([(X - bl_, Y - bh), (X + bl_, Y - bh * .6), (X + bl_ * .6, Y + bh * .6), (X - bl_ * .7, Y + bh * .8)], fill=rgb((.14, .27, .6)), outline=INK)
            d.polygon([(X - bl_ * .85, Y - bh * .7), (X + bl_ * .85, Y - bh * .5), (X + bl_ * .5, Y + bh * .2), (X - bl_ * .6, Y + bh * .3)], fill=rgb((.76, .56, .34)))
            for k in (-.35, .15, .55): d.line([(X + bl_ * k, Y - bh * .6), (X + bl_ * (k - .08), Y + bh * .25)], fill=rgb((.45, .3, .16)), width=SS)
            d.line([(X - bl_, Y - bh), (X + bl_, Y - bh * .6), (X + bl_ * .6, Y + bh * .6), (X - bl_ * .7, Y + bh * .8), (X - bl_, Y - bh)], fill=INK, width=lw)
        put(f, wz, (X - 70, Y - 40, X + 70, Y + 40))
    elif kind == 'fire':
        R = 1.0 * s_ * .9
        def f(d, ox, oy, X=X, Y=Y, R=R):
            X += ox; Y += oy
            d.ellipse([X - R * 4, Y - R * 2.4, X + R * 4, Y + R * 2.6], fill=(255, 200, 90, 55)); d.ellipse([X - R * 2.5, Y - R * 1.5, X + R * 2.5, Y + R * 1.6], fill=(255, 190, 80, 80))
            for k in range(8):
                a = k / 8 * 6.283; d.ellipse([X + np.cos(a) * R * 1.3 - 5, Y + np.sin(a) * R * .6 - 4, X + np.cos(a) * R * 1.3 + 5, Y + np.sin(a) * R * .6 + 4], fill=rgb((.5, .48, .45)), outline=INK)
            d.polygon([(X, Y - R * 3.2), (X + R * .9, Y - R * .4), (X + R * .4, Y), (X - R * .4, Y), (X - R * .9, Y - R * .5)], fill=rgb((.98, .52, .12)), outline=INK)
            d.polygon([(X, Y - R * 2.0), (X + R * .45, Y - R * .3), (X - R * .45, Y - R * .3)], fill=rgb((1, .88, .3)))
            for k, (dx_, dy_) in enumerate(((.6, -4), (1.2, -5.2), (.5, -6.4))): d.ellipse([X + R * dx_ * 1.6 - 6 - k * 3, Y + R * dy_ * 1.1 - 6, X + R * dx_ * 1.6 + 6 + k * 3, Y + R * dy_ * 1.1 + 6], fill=(150, 150, 160, 90 - k * 22))
        put(f, wz, (X - 70, Y - 140, X + 90, Y + 40))
    else:
        c = o['c']
        def f(d, ox, oy, X=X, Y=Y, c=c):
            X += ox; Y += oy
            d.ellipse([X - 9, Y - 2, X + 13, Y + 6], fill=(60, 50, 40, 70))
            d.polygon([(X - 6, Y), (X - 5, Y - 18), (X + 5, Y - 18), (X + 6, Y)], fill=rgb(c), outline=INK)
            d.ellipse([X - 5, Y - 28, X + 5, Y - 18], fill=rgb((.95, .74, .58)), outline=INK)
        put(f, wz, (X - 20, Y - 40, X + 24, Y + 14))
# ---- sea decoration: wave ticks and a sun glint
lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
for k in range(520):
    x = rng.uniform(40 * SS, W - 40 * SS); y = rng.uniform(40 * SS, H - 40 * SS)
    if landpx[int(y), int(x)]: continue
    pxc = canvas[int(y), int(x)]
    if pxc[2] < pxc[0] + .12: continue
    L = rng.uniform(16, 30) * SS * .7
    dr.arc([x - L, y - L * .35, x, y + L * .35], 200, 340, fill=(235, 248, 250, 150), width=int(1.6 * SS)); dr.arc([x, y - L * .35, x + L, y + L * .35], 200, 340, fill=(235, 248, 250, 150), width=int(1.6 * SS))
cv = Image.fromarray((canvas * 255).astype(np.uint8)).convert('RGBA'); cv.alpha_composite(lay)
# ---- paper, vignette wash edge, frame, title, compass
paper = np.zeros((H, W, 3), np.float32); paper[:] = np.array([.94, .89, .77], np.float32)
fib = noise(2400, 90, 3, 9)[:H, :W]; paper *= (1 + (fib[..., None] - .5) * .08 + (NZ[:H, :W, None] - .5) * .08)
mx, my = 58 * SS, 52 * SS; yy, xx = np.mgrid[0:H, 0:W]
dd = np.minimum(np.minimum(xx - mx, W - mx - xx), np.minimum(yy - my, H - my - yy)).astype(np.float32) + (NZ3[:H, :W] - .5) * 90 * SS * .5
alpha = np.clip(dd / (26 * SS) + .1, 0, 1); alpha = alpha * alpha * (3 - 2 * alpha)
canvasf = np.asarray(cv.convert('RGB'), np.float32) / 255
out = paper * (1 - alpha[..., None]) + (canvasf * (1 + (fib[..., None] - .5) * .05)) * alpha[..., None]
# soft golden-hour light: sun glow top-left, warm tint
glow = np.exp(-(((xx - W * .08) / (W * .45)) ** 2 + ((yy - H * .02) / (H * .5)) ** 2))[..., None]
out = np.clip(out + glow * np.array([.07, .04, .0], np.float32) * alpha[..., None], 0, 1)
img = Image.fromarray((out * 255).astype(np.uint8)); d = ImageDraw.Draw(img)
fnt = lambda n, s: ImageFont.truetype('/usr/share/fonts/truetype/freefont/' + n, int(s * SS))
d.rectangle([18 * SS, 18 * SS, W - 18 * SS, H - 18 * SS], outline=INK, width=int(2.2 * SS)); d.rectangle([24 * SS, 24 * SS, W - 24 * SS, H - 24 * SS], outline=INK, width=SS)
# title cartouche
d.rounded_rectangle([46 * SS, 44 * SS, 480 * SS, 128 * SS], 14 * SS, fill=(247, 238, 214), outline=INK, width=int(2 * SS))
d.text((62 * SS, 52 * SS), 'The Isle of the First Tide', font=fnt('FreeSerifBoldItalic.ttf', 31), fill=INK)
d.text((64 * SS, 94 * SS), 'a chart of the home island, drawn for the settlers', font=fnt('FreeSerifItalic.ttf', 17), fill=rgb((.35, .22, .15)))
# compass rose bottom-right
cx, cy, r = W - 120 * SS, H - 110 * SS, 52 * SS
d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=INK, width=int(1.6 * SS), fill=(246, 236, 210))
for a in range(0, 360, 90):
    ar = np.radians(a); n = ((np.sin(ar), -np.cos(ar)), (np.sin(ar + 1.57), -np.cos(ar + 1.57)), (np.sin(ar - 1.57), -np.cos(ar - 1.57)))
    d.polygon([(cx + n[0][0] * r * 1.25, cy + n[0][1] * r * 1.25), (cx + n[1][0] * r * .2, cy + n[1][1] * r * .2), (cx, cy), (cx + n[2][0] * r * .2, cy + n[2][1] * r * .2)], fill=rgb((.85, .3, .2)) if a == 0 else rgb((.3, .3, .5)), outline=INK)
d.text((cx - 6 * SS, cy - r * 1.62), 'N', font=fnt('FreeSerifBold.ttf', 22), fill=INK)
# little sun with rays, top-right
sx_, sy_ = W - 150 * SS, 100 * SS
for k in range(16):
    a = k / 16 * 6.283; d.line([(sx_ + np.cos(a) * 30 * SS, sy_ + np.sin(a) * 30 * SS), (sx_ + np.cos(a) * (50 if k % 2 else 42) * SS, sy_ + np.sin(a) * (50 if k % 2 else 42) * SS)], fill=rgb((.93, .62, .15)), width=int(2.4 * SS))
d.ellipse([sx_ - 26 * SS, sy_ - 26 * SS, sx_ + 26 * SS, sy_ + 26 * SS], fill=rgb((1, .82, .3)), outline=INK, width=int(2 * SS))
# scale bar
d.line([(60 * SS, H - 60 * SS), (60 * SS + 20 * s_, H - 60 * SS)], fill=INK, width=int(3 * SS)); d.text((60 * SS, H - 90 * SS), '20 m', font=fnt('FreeSerifItalic.ttf', 18), fill=INK)
# paper grain over everything, downsample
a = np.asarray(img, np.float32) / 255; a = a * (1 + (noise(2400, 300, 2, 5)[:H, :W, None] - .5) * .07)
img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((1200, 800), Image.LANCZOS)
out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'shots', 'appr-3.png'); img.save(out_path); print('wrote', out_path)
