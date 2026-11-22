"""Shared hi-res scene grids (0.25 m) built from the shared heightmap: ground G, top T (ground + props),
albedo A, emissive E, shore distance D, plus bilinear sampler. numpy only."""
import json, os, numpy as np
import heightmap as HM
HERE = os.path.dirname(os.path.abspath(__file__))
R = 0.25; M = int(HM.SIZE / R)   # 1280

def bil(A, x, z):
    """bilinear sample of A[M,M(,C)] at world x,z (arrays). outside grid -> edge clamp"""
    j = (x + HM.SIZE / 2) / R - .5; i = (z + HM.SIZE / 2) / R - .5
    j = np.clip(j, 0, M - 1.001); i = np.clip(i, 0, M - 1.001)
    i0 = i.astype(np.int32); j0 = j.astype(np.int32); u = (j - j0).astype(np.float32); v = (i - i0).astype(np.float32)
    if A.ndim == 3: u = u[..., None]; v = v[..., None]
    a = A[i0, j0]; b = A[i0, j0 + 1]; c = A[i0 + 1, j0]; d = A[i0 + 1, j0 + 1]
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v

def up(h):
    """bicubic-ish upsample of 256 grid to M via PIL float32 bicubic"""
    from PIL import Image
    im = Image.fromarray(h.astype(np.float32), mode='F').resize((M, M), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)

def blur(a, r):
    k = np.exp(-np.arange(-3 * r, 3 * r + 1) ** 2 / (2 * r * r)); k /= k.sum()
    from numpy.lib.stride_tricks import sliding_window_view as sw
    p = np.pad(a, ((3 * r, 3 * r), (0, 0)), mode='edge'); a = (sw(p, len(k), axis=0) * k).sum(-1)
    p = np.pad(a, ((0, 0), (3 * r, 3 * r)), mode='edge'); return (sw(p, len(k), axis=1) * k).sum(-1).astype(np.float32)

def chamfer(mask):
    """distance (in cells) to nearest True, two-pass chamfer 3-4"""
    INF = 1e6; d = np.where(mask, 0, INF).astype(np.float32)
    for _ in range(2):
        for i in range(1, M):
            d[i] = np.minimum(d[i], d[i - 1] + 1)
            d[i, 1:] = np.minimum(d[i, 1:], d[i - 1, :-1] + 1.414); d[i, :-1] = np.minimum(d[i, :-1], d[i - 1, 1:] + 1.414)
        for j in range(1, M): d[:, j] = np.minimum(d[:, j], d[:, j - 1] + 1)
        for j in range(M - 2, -1, -1): d[:, j] = np.minimum(d[:, j], d[:, j + 1] + 1)
        for i in range(M - 2, -1, -1): d[i] = np.minimum(d[i], d[i + 1] + 1)
        d = d[::-1, ::-1].copy() if False else d
    return d

def build(cache=True):
    path = os.path.join(HERE, '.cache_scene.npz')
    if cache and os.path.exists(path):
        z = np.load(path); return {k: z[k] for k in z.files}
    h256 = np.load(os.path.join(HERE, 'island.npy')); js = json.load(open(os.path.join(HERE, 'island.json')))
    rng = np.random.default_rng(5)
    xs = ((np.arange(M) + .5) * R - HM.SIZE / 2).astype(np.float32); X, Z = np.meshgrid(xs, xs)
    G = up(h256)
    # fine rocky detail where the ground is rocky (coast + steep), subtle elsewhere
    def noise(sc, oct=4):
        o = np.zeros((M, M), np.float32); a = 1
        for k in range(oct):
            n = HM._lattice_noise(rng, M, int(M / sc * 2 ** k * 0.5)); o += (n - .5) * a; a *= .5
        return o
    n1 = noise(14); n2 = noise(5)
    gy, gx = np.gradient(G, R); slope = np.hypot(gx, gy)
    rocky = np.clip(slope * 1.6 - .35, 0, 1) + np.clip(1 - np.abs(G - .6) / 1.8, 0, 1) * .5
    G = G + (n1 * 1.1 + n2 * 0.5) * (0.15 + .85 * np.clip(rocky, 0, 1)) * 0.9
    G = G.astype(np.float32)
    gy, gx = np.gradient(G, R); slope = np.hypot(gx, gy)
    # materials
    bd = np.hypot((X - 4.0) / 1.5, Z - 60.0); bw = np.clip(1 - bd / 52, 0, 1) ** 1.3
    nn = noise(9); nm = noise(3, 3)
    sand = np.array([.84, .70, .48], np.float32); wetsand = np.array([.52, .40, .27], np.float32)
    grass = np.array([.30, .43, .15], np.float32); grass2 = np.array([.42, .48, .18], np.float32)
    heath = np.array([.40, .24, .31], np.float32); heath2 = np.array([.30, .27, .14], np.float32)
    rock = np.array([.30, .27, .26], np.float32); rock2 = np.array([.52, .40, .32], np.float32)
    A = np.zeros((M, M, 3), np.float32)
    hmix = np.clip((G - 6) / 8 + nn * 1.2, 0, 1)[..., None]
    gcol = grass * (1 - (nn[..., None] + .5)) + grass2 * (nn[..., None] + .5)
    hcol = heath * (nm[..., None] + .6).clip(0, 1) + heath2 * (1 - (nm[..., None] + .6).clip(0, 1))
    A = gcol * (1 - hmix) + hcol * hmix
    band = (0.5 + 0.5 * np.sin(G * 3.1 + nn * 6))[..., None]
    rcol = rock * band + rock2 * (1 - band)
    rw = np.clip((slope - .55) * 3, 0, 1) + np.clip(1 - (G - .2) ** 2 / 3.5, 0, 1) * (1 - bw) * .8
    rw = np.clip(rw + nn * .6, 0, 1)[..., None]
    A = A * (1 - rw) + rcol * rw
    sw_ = (bw * (G < 3.2) * np.clip(1 - slope * 1.2, 0, 1) + 0)[..., None]
    sandc = sand * (1 - np.clip(.3 + nm * 1.5, 0, 1)[..., None] * .18)
    wet = np.clip((.45 - G) / .5, 0, 1)[..., None]
    sandc = sandc * (1 - wet) + wetsand * wet
    sw_ = np.clip(sw_ * 1.4, 0, 1)
    A = A * (1 - sw_) + sandc * sw_
    # underwater floor: sand to dark kelp rock with depth
    uw = np.clip(-G / 5, 0, 1)[..., None]
    A = np.where(G[..., None] < 0, A * (1 - uw) + np.array([.18, .26, .22], np.float32) * uw, A)
    A0 = A.copy()
    T = G.copy(); E = np.zeros((M, M), np.float32)
    ii = lambda a: np.asarray(a)

    def stamp(cx, cz, r, fn):
        j0 = int((cx - r + HM.SIZE / 2) / R); j1 = int((cx + r + HM.SIZE / 2) / R) + 1
        i0 = int((cz - r + HM.SIZE / 2) / R); i1 = int((cz + r + HM.SIZE / 2) / R) + 1
        sl = (slice(i0, i1), slice(j0, j1)); x = X[sl] - cx; z = Z[sl] - cz
        top, col, em = fn(x, z)
        m = top > T[sl] + 1e-4
        T[sl] = np.where(m, top, T[sl]); A[sl] = np.where(m[..., None], col, A[sl]); E[sl] = np.where(m, em, E[sl])

    for c in js['conifers']:
        H = c['h']; Rr = .21 * H; y0 = c['y']
        def fn(x, z, H=H, Rr=Rr, y0=y0, c=c):
            rr = np.hypot(x, z); t = np.clip(1 - rr / Rr, 0, 1)
            tier = np.floor(t * 6) / 6 * .6 + t * .4
            top = np.where(rr < Rr, y0 + 1.2 + (H - 1.2) * tier ** .95, -9)
            sh = .55 + .45 * (0.5 + .5 * np.sin(np.arctan2(z, x) * 5 + rr * 3))
            col = np.stack([.07 * sh + .02, .20 * sh + .04, .10 * sh + .02], -1) * (.7 + .3 * t[..., None])
            return top, col, 0 * x
        stamp(c['x'], c['z'], Rr + .2, fn)
    for rk in js['rocks']:
        s = rk['s']; y0 = rk['y']
        def fn(x, z, s=s, y0=y0, rk=rk):
            rr2 = (x * x + z * z * 1.2) / (s * s); wob = 1 + .28 * np.sin(x * 2.3 + z * 1.1 + y0 * 7) + .2 * np.sin(z * 3.7 - x * 1.9)
            rr2 = rr2 * wob
            top = np.where(rr2 < 1, y0 - .3 + s * .6 * (np.sqrt(np.clip(1 - rr2, 0, 1)) + .12 * np.sin(x * 6 + z * 5)), -9)
            return top, np.broadcast_to(np.array([.42, .36, .31], np.float32) + (np.cos(x * 4 + z * 3)[..., None] * .05), x.shape + (3,)), 0 * x
        stamp(rk['x'], rk['z'], s + .2, fn)
    camp = js['camp']
    cols = dict(orange=(.88, .40, .10), blue=(.12, .26, .62))
    for t in camp['tents']:
        a = np.radians(t['rot']); c, s = np.cos(a), np.sin(a); col = np.array(cols[t['color']], np.float32); y0 = t['y']
        def fn(x, z, c=c, s=s, col=col, y0=y0):
            u = x * c + z * s; v = -x * s + z * c
            top = np.where((np.abs(u) < 1.7) & (np.abs(v) < 2.0), y0 + .15 + 1.75 * (1 - np.abs(u) / 1.7), -9)
            end = (np.abs(v) > 1.75)[..., None]
            cc = np.where(end, np.array([.75, .68, .55], np.float32), col * (.8 + .2 * np.cos(u * 9)[..., None]))
            return top, cc, 0 * x
        stamp(t['x'], t['z'], 3, fn)
    b = camp['boat']; a = np.radians(b['rot']); c, s = np.cos(a), np.sin(a); y0 = b['y']
    def fnb(x, z):
        u = x * c + z * s; v = -x * s + z * c
        L, W = 2.3, .8
        k = (u / L) ** 2 + (v / (W * np.sqrt(np.clip(1 - (u / L) ** 4, .02, 1)))) ** 2
        inside = (np.abs(u) < L) & (np.abs(v) < W * np.sqrt(np.clip(1 - (u / L) ** 4, 0, 1)))
        rim = np.clip(np.abs(v) / (W * np.sqrt(np.clip(1 - (u / L) ** 4, .02, 1))), 0, 1)
        top = np.where(inside, y0 + .1 + .55 * (rim ** 4) + (0.35 * np.abs(u) / L) ** 2 * 1.3, -9)
        thwart = (np.abs((u + .2) % 1.4 - .7) < .08)
        col = np.where((rim > .86)[..., None], np.array([.13, .25, .55], np.float32), np.where(thwart[..., None], np.array([.62, .42, .2], np.float32), np.array([.55, .38, .22], np.float32)))
        return top, col, 0 * x
    stamp(b['x'], b['z'], 3, fnb)
    f = camp['fire']; fx, fz, fy = f['x'], f['z'], f['y']
    def fnf(x, z):
        rr = np.hypot(x, z)
        ring = np.where((rr > .55) & (rr < .85), fy + .25 * (.5 + .5 * np.sin(np.arctan2(z, x) * 9)), -9)
        flame = np.where(rr < .35, fy + .2 + 1.3 * np.clip(1 - rr / .35, 0, 1) ** 1.5, -9)
        top = np.maximum(ring, flame)
        col = np.where((rr < .38)[..., None], np.array([1., .65, .2], np.float32), np.array([.4, .38, .36], np.float32))
        return top, col, np.where(rr < .38, 1.0, 0.0).astype(np.float32)
    stamp(fx, fz, 1.2, fnf)
    # log seats and 3 people
    for dx, dz, rot in ((-2.6, .6, 10), (1.5, 2.6, 80), (2.8, -1.2, 100)):
        a = np.radians(rot); c, s = np.cos(a), np.sin(a); ly = sample = HM.sample(h256, fx + dx, fz + dz)
        def fnl(x, z, c=c, s=s, ly=ly):
            u = x * c + z * s; v = -x * s + z * c
            top = np.where((np.abs(u) < 1.0) & (np.abs(v) < .22), ly + .15 + .35 * np.sqrt(np.clip(1 - (v / .22) ** 2, 0, 1)), -9)
            return top, np.broadcast_to(np.array([.4, .26, .14], np.float32), x.shape + (3,)), 0 * x
        stamp(fx + dx, fz + dz, 1.4, fnl)
    for dx, dz, col, hh in ((-14.5, 4.0, (.2, .35, .75), 1.7), (-12.8, 5.6, (.9, .75, .1), 1.6), (3.0, 1.6, (.8, .15, .1), 1.2)):
        py = HM.sample(h256, fx + dx, fz + dz)
        def fnp(x, z, py=py, col=col, hh=hh):
            rr = np.hypot(x, z); body = np.where(rr < .32, py + hh * .78, -9); head = np.where(np.hypot(x, z) < .2, py + hh * .78 + .0, -9)
            head = np.where(np.hypot(x, z) < .2, py + hh + .0 - (np.hypot(x, z) / .2) ** 2 * .1, -9)
            top = np.maximum(body * (rr > .0), head)
            cc = np.where((top > py + hh * .78 + .02)[..., None], np.array([.85, .6, .45], np.float32), np.array(col, np.float32))
            return top, cc, 0 * x
        stamp(fx + dx, fz + dz, .6, fnp)
    # shore distance field (m): positive in sea, negative on land
    land = G > 0
    dsea = chamfer(land) * R; dland = chamfer(~land) * R
    D = (dsea - dland).astype(np.float32)
    out = dict(G=G, T=T, A=A, E=E, D=D, A0=A0)
    if cache: np.savez(path, **out)
    return out

if __name__ == '__main__':
    import time; t = time.time(); s = build(False); print({k: (v.shape, float(v.min()), float(v.max())) for k, v in s.items()}, time.time() - t)
