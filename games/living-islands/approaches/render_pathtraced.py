"""Approach 1: offline heightfield ray-march in numpy. Baked area-light sun shadows (48 samples across a wide solar disc),
horizon sky occlusion, water with Beer-Lambert depth tint + refraction offset + shoreline-distance foam, aerial haze.
Usage: python3 render_pathtraced.py [out.png] [W H]"""
import sys, json, time, os, numpy as np
from multiprocessing import Pool
from PIL import Image, ImageFilter
import heightmap as HM, scene2d as S
HERE = os.path.dirname(os.path.abspath(__file__))
js = json.load(open(os.path.join(HERE, 'island.json')))
SC = S.build(); T = SC['T']; G = SC['G']; A = SC['A']; E = SC['E']; D = SC['D']
M, R = S.M, S.R
def unit(v): v = np.asarray(v, np.float32); return v / np.linalg.norm(v, axis=-1, keepdims=True)
def sun_dir(az, el):
    a, e = np.radians(az), np.radians(el); return np.array([np.sin(a) * np.cos(e), np.sin(e), np.cos(a) * np.cos(e)], np.float32)
L = sun_dir(js['sun']['az'], js['sun']['el'])
Tc = np.maximum(T, 0).astype(np.float32)

def shifted(a, di, dj):
    out = np.full_like(a, -50.0)
    si = slice(max(di, 0), M + min(di, 0)); sj = slice(max(dj, 0), M + min(dj, 0))
    ti = slice(max(-di, 0), M + min(-di, 0)); tj = slice(max(-dj, 0), M + min(-dj, 0))
    out[ti, tj] = a[si, sj]; return out

def horizon(h_dir, dists):
    m = np.full((M, M), -9.0, np.float32); last = (None, None)
    for s in dists:
        di, dj = int(round(s * h_dir[1] / R)), int(round(s * h_dir[0] / R))
        if (di, dj) == last: continue
        last = (di, dj)
        m = np.maximum(m, (shifted(Tc, di, dj) - Tc) / max(np.hypot(di, dj) * R, 1e-3))
    return m

def bake():
    cache = os.path.join(HERE, '.cache_bake.npz')
    if os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(os.path.join(HERE, '.cache_scene.npz')):
        z = np.load(cache); return z['sh'], z['ao']
    rng = np.random.default_rng(3); dists = np.geomspace(0.5, 140, 130)
    sh = np.zeros((M, M), np.float32); ns = 128
    az0, el0 = js['sun']['az'], js['sun']['el']
    for k in range(ns):
        r = np.sqrt(rng.random()) * 2.6; th = rng.random() * 6.283
        d = sun_dir(az0 + r * np.cos(th) / np.cos(np.radians(el0)), el0 + r * np.sin(th))
        h = d[[0, 2]] / np.hypot(d[0], d[2]); te = d[1] / np.hypot(d[0], d[2])
        m = horizon(h, dists); sh += np.clip((te - m) / 0.03 + .5, 0, 1)
    sh /= ns
    gy, gx = np.gradient(Tc, R); ao = np.zeros((M, M), np.float32); na = 48; d2 = np.geomspace(0.5, 70, 60)
    for k in range(na):
        a = k / na * 6.283; h = np.array([np.cos(a), np.sin(a)], np.float32)
        m = horizon(h, d2); tang = gx * h[0] + gy * h[1]
        ao += 1 / (1 + np.clip(m - tang, 0, 5) ** 2)
    ao /= na
    np.savez(cache, sh=sh, ao=ao); return sh, ao

SH, AO = bake()
gy_, gx_ = np.gradient(Tc, R)
rngn = np.random.default_rng(11)
NT = (rngn.random((256, 256)).astype(np.float32))
def tile(x, z, sc):
    u = (x / sc) % 256; v = (z / sc) % 256; i0 = u.astype(int) % 256; j0 = v.astype(int) % 256; fu = u - np.floor(u); fv = v - np.floor(v)
    fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv)
    a = NT[j0, i0]; b = NT[j0, (i0 + 1) % 256]; c = NT[(j0 + 1) % 256, i0]; d = NT[(j0 + 1) % 256, (i0 + 1) % 256]
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv

def sky(d, hazeonly=False):
    y = np.clip(d[..., 1], 0, 1)[..., None]
    zen = np.array([.14, .32, .70], np.float32); hor = np.array([.88, .68, .55], np.float32)
    col = hor * (1 - y) ** 2.2 + zen * (1 - (1 - y) ** 2.2)
    s = np.clip((d * L).sum(-1), 0, 1)[..., None]
    col = col + np.array([1., .55, .25], np.float32) * (s ** 8 * .55 + s ** 80 * 1.2)
    return col

SUNC = np.array([1.0, .60, .30], np.float32) * 3.6
SKYA = np.array([.26, .38, .62], np.float32) * 1.25
GROUND_BOUNCE = np.array([.5, .34, .2], np.float32) * .35
FIREP = np.array([js['camp']['fire']['x'], js['camp']['fire']['y'] + .6, js['camp']['fire']['z']], np.float32)

def march(o, d):
    n = len(o); t = np.zeros(n, np.float32); ymax = 26.0
    t0 = np.maximum((ymax - o[:, 1]) / np.minimum(d[:, 1], -1e-4), 0)
    tsea = -o[:, 1] / np.minimum(d[:, 1], -1e-4)
    t = t0.copy(); hit = np.zeros(n, bool); alive = np.ones(n, bool) & (t0 < tsea)
    idx = np.nonzero(alive)[0]; tl = t.copy()
    for it in range(700):
        if len(idx) == 0: break
        p = o[idx] + d[idx] * t[idx, None]
        hh = S.bil(T, p[:, 0], p[:, 2]); gap = p[:, 1] - hh
        below = gap < 0.02
        hit[idx[below]] = True
        cont = (~below) & (t[idx] < tsea[idx]) & ~((p[:, 1] > ymax) & (d[idx, 1] > 0))
        # step
        step = np.maximum(0.1, 0.38 * gap)
        tl[idx] = t[idx]; t[idx] = t[idx] + step
        idx = idx[cont]
    # refine hit
    hi = np.nonzero(hit)[0]
    lo_t = tl[hi].copy(); hi_t = t[hi].copy(); hi_t = np.minimum(hi_t, t[hi])
    for _ in range(8):
        mid = (lo_t + hi_t) / 2; p = o[hi] + d[hi] * mid[:, None]
        under = p[:, 1] < S.bil(T, p[:, 0], p[:, 2])
        hi_t = np.where(under, mid, hi_t); lo_t = np.where(under, lo_t, mid)
    th = np.where(hit, 0, tsea).astype(np.float32); th[hi] = hi_t
    # a hit beyond the sea plane is water
    hit &= th < tsea + 1e-3
    return hit, th, tsea

def aces(x):
    a, b, c, d, e = 2.51, .03, 2.43, .59, .14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)

def shade(o, d, tm):
    hit, th, tsea = march(o, d)
    n = len(o); col = np.zeros((n, 3), np.float32)
    p = o + d * th[:, None]
    # ---- land
    li = np.nonzero(hit)[0]
    if len(li):
        pl = p[li]; x, z = pl[:, 0], pl[:, 2]
        dx = S.bil(gx_, x, z); dz = S.bil(gy_, x, z)
        micro = tile(x, z, .22) - .5; micro2 = tile(x * 1.0, z * 1.0, .9) - .5
        N = unit(np.stack([-dx - micro2 * .10, np.ones_like(dx), -dz + micro * .08], -1))
        alb = S.bil(A, x, z) * (1 + (micro * .22 + micro2 * .3))[:, None]
        sh = S.bil(SH, x, z); ao = S.bil(AO, x, z)
        ndl = np.clip((N * L).sum(-1), 0, 1)
        sunl = (ndl * sh)[:, None] * SUNC
        sk = (SKYA * (.45 + .45 * N[:, 1:2])) * ao[:, None] * .85
        bounce = GROUND_BOUNCE * (1 - N[:, 1:2]) * ao[:, None] * (.4 + .6 * sh[:, None])
        # fire glow
        fv = FIREP - pl; fd = np.linalg.norm(fv, axis=1); fl = np.clip((N * (fv / fd[:, None])).sum(-1), 0, 1) * 26 / (1 + fd ** 2 * .5)
        fire = fl[:, None] * np.array([1., .45, .14], np.float32) * (0.9 + .2 * np.sin(tm * 9 + fd))[:, None]
        c = alb * (sunl + sk + bounce + fire)
        em = S.bil(E, x, z)[:, None]; c = c * (1 - em) + em * np.array([4., 2., .6], np.float32) * (.8 + .5 * micro[:, None] * 2)
        # wet sand glisten near waterline, foam on coast rocks/sand edge
        dd = S.bil(D, x, z)
        wetf = np.clip(1 - np.abs(dd + .2) / 1.2, 0, 1)
        foam = np.clip(1 - np.abs(dd) / .9, 0, 1) * np.clip(0.6 + micro * 2.2, 0, 1)
        c = c * (1 - .25 * wetf[:, None]) + foam[:, None] * np.array([1., .98, .95]) * (sunl.mean(-1, keepdims=True) * .5 + .45 + sk * .2) * .8
        col[li] = c
    # ---- water
    wi = np.nonzero(~hit)[0]
    if len(wi):
        pw = o[wi] + d[wi] * tsea[wi, None]; x, z = pw[:, 0], pw[:, 2]; dv = d[wi]
        w = 0.5 * np.stack([
            np.cos(x * .35 + z * .12 + tm * .8) * .06 + np.cos(x * .9 - z * .5 + tm * 1.3) * .03 + np.cos(x * 2.4 + z * 1.7 + tm * 2.2) * .012 + (tile(x, z, .5) - .5) * .05,
            np.cos(z * .3 - x * .15 + tm * .7) * .06 + np.cos(z * .8 + x * .6 + tm * 1.1) * .03 + np.cos(z * 2.1 - x * 1.9 + tm * 2.0) * .012 + (tile(x + 7, z + 3, .5) - .5) * .05], -1)
        w = w * np.clip(1.15 - tsea[wi] / 260, .18, 1)[:, None]
        Nw = unit(np.stack([-w[:, 0], np.ones(len(wi)), -w[:, 1]], -1))
        cosi = np.clip(-(dv * Nw).sum(-1), .02, 1)
        F = .02 + .98 * (1 - cosi) ** 5; F = np.clip(F * .75, 0, 1)
        rv = dv + 2 * cosi[:, None] * Nw; rv[:, 1] = np.abs(rv[:, 1])
        refl = sky(unit(rv))
        h_ = unit(L - dv); spec = np.clip((h_ * Nw).sum(-1), 0, 1)
        glint = (spec ** 900 * 38 + spec ** 120 * 2.2 + spec ** 14 * .25)[:, None] * np.array([1., .62, .34], np.float32)
        depth = np.maximum(-S.bil(G, x, z), 0.03)
        # refracted ray to floor
        rr = unit(np.stack([dv[:, 0] * .75, dv[:, 1] - (dv[:, 1] * 0), dv[:, 2] * .75], -1) * 1); rr[:, 1] = -np.sqrt(np.clip(1 - (.75 * np.hypot(dv[:, 0], dv[:, 2])) ** 2, .01, 1))
        path = depth / np.abs(rr[:, 1]); fx = x + rr[:, 0] * path; fz = z + rr[:, 2] * path
        depth2 = np.maximum(-S.bil(G, fx, fz), depth * .5)
        floor = S.bil(A, fx, fz); fsh = S.bil(SH, fx, fz) * .85 + .15
        sig = np.array([.30, .07, .045], np.float32)
        trans = np.exp(-path[:, None] * 1.0 * sig)
        floorlit = floor * ((L[1] * 1.0 * fsh)[:, None] * SUNC * .55 + SKYA * .55) * trans
        shadow_w = S.bil(SH, x, z)
        body_light = (0.45 + .55 * shadow_w)[:, None] * SUNC * .22 + SKYA * .45
        deepc = np.array([.012, .08, .24], np.float32); turq = np.array([.05, .56, .55], np.float32)
        k = (1 - np.exp(-depth * .26))[:, None]
        body = (turq * (1 - k) + deepc * k) * body_light * (1 - trans.mean(-1, keepdims=True) * .0)
        blend = np.exp(-path * .55)[:, None]
        refr = floorlit * blend + body * (1 - blend * .55)
        c = refr * (1 - F[:, None]) + refl * F[:, None] + glint * (1 - 0.5 * np.clip(1 - shadow_w, 0, 1))[:, None]
        # foam from shoreline distance field
        dd = S.bil(D, x, z); nz = tile(x, z, .25); nz2 = tile(x * 1.3 + 5, z * 1.3, 1.3)
        edge = np.clip(1 - (dd - .15 + (nz - .5) * .8) / 1.1, 0, 1)
        pulse = (.5 + .5 * np.sin(dd * 2.1 - tm * 1.2 + nz2 * 4)) ** 3 * np.exp(-dd / 6) * (dd > .6) * (nz2 > .42)
        foam = np.clip(edge ** 1.3 * 1.0 + pulse * .55, 0, 1)
        fl = (SKYA * .6 + (SUNC * .22) * (.4 + .6 * shadow_w)[:, None]) * np.array([1., .99, .97], np.float32)
        c = c * (1 - foam[:, None]) + foam[:, None] * np.clip(fl * 1.15, 0, 2.2)
        col[wi] = c
    # ---- haze (aerial perspective)
    tt = np.where(hit, th, tsea); tt = np.where(tt > 6000, 6000, tt)
    sdot = np.clip((d * L).sum(-1), 0, 1)[:, None]
    hz = np.array([.40, .45, .58], np.float32) * (.95) + np.array([1., .6, .3], np.float32) * sdot ** 5 * 1.2
    f = 1 - np.exp(-tt * .0008)
    col = col * (1 - f[:, None]) + hz * f[:, None] * .6
    return col

def render_rows(args):
    y0, y1, W, H, cam, tm = args
    pos = np.array(cam['pos'], np.float32); tgt = np.array(cam['target'], np.float32)
    fw = unit(tgt - pos); rt = unit(np.cross(fw, [0, 1, 0])); up = np.cross(rt, fw)
    th = np.tan(np.radians(cam['fov']) / 2); asp = W / H
    ys, xs = np.mgrid[y0:y1, 0:W]; ss = 1
    acc = np.zeros((y1 - y0, W, 3), np.float32); rng = np.random.default_rng(y0)
    sub = [((i + .5) / 3, (j + .5) / 3) for i in range(3) for j in range(3)]
    for (ox, oy) in sub:
        u = ((xs + ox) / W * 2 - 1) * th * asp; v = (1 - (ys + oy) / H * 2) * th
        d = unit(fw + rt * u[..., None] + up * v[..., None]).reshape(-1, 3)
        o = np.broadcast_to(pos, d.shape).copy()
        acc += shade(o, d, tm).reshape(y1 - y0, W, 3)
    return acc / len(sub)

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'shots', 'appr-1.png')
    W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1200, 800)
    cam = js['camera']; t0 = time.time()
    rows = list(range(0, H, 10)); jobs = [(y, min(y + 10, H), W, H, cam, 3.0) for y in rows]
    with Pool(4) as p: parts = p.map(render_rows, jobs, chunksize=1)
    img = np.concatenate(parts, 0)
    # grade: exposure, ACES, light bloom, vignette
    hdr = img * 1.0
    pil = Image.fromarray((np.clip(hdr / (1 + hdr), 0, 1) * 255).astype('uint8'))
    bl = np.asarray(Image.fromarray((np.clip(np.maximum(hdr - 1.2, 0) * .5, 0, 1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(14)), np.float32) / 255
    hdr = hdr + bl * 1.3
    yy, xx = np.mgrid[0:H, 0:W]; vg = 1 - .28 * (((xx / W - .5) ** 2 + (yy / H - .5) ** 2) * 2)[..., None]
    ldr = aces(hdr * .50 * vg); ldr = ldr ** (1 / 2.2)
    # gentle warm/cool split grade
    lum = ldr.mean(-1, keepdims=True); ldr = np.clip(ldr + (ldr - lum) * .12 + np.array([.012, 0, -.006]) * (1 - lum), 0, 1)
    Image.fromarray((ldr * 255 + .5).astype('uint8')).save(out)
    print('rendered', out, W, H, 'in %.1fs' % (time.time() - t0))
