"""Shared deterministic island generator for the approaches showcase.
Ridged noise + strata layering + thermal erosion, numpy only. Same seed => same bytes.
Writes island.npy (float32 N x N, metres, sea level 0) and island.json (heights in cm + scene props + camera + sun).
World: x east, z south, metres, island centred near origin. Grid N=256 over SIZE=320 m."""
import json, sys, os, hashlib
import numpy as np
N = 256; SIZE = 320.0; SEED = 1122
HERE = os.path.dirname(os.path.abspath(__file__))

def _lattice_noise(rng, n, f):
    g = rng.random((f + 2, f + 2)).astype(np.float64)
    t = np.linspace(0, f, n, endpoint=False)
    i = t.astype(int); u = t - i; u = u * u * u * (u * (u * 6 - 15) + 10)
    a = g[i][:, i]; b = g[i][:, i + 1]; c = g[i + 1][:, i]; d = g[i + 1][:, i + 1]
    U = u[None, :]; V = u[:, None]
    return (a * (1 - U) + b * U) * (1 - V) + (c * (1 - U) + d * U) * V

def fbm(rng, n, base, octs, ridged=False):
    out = np.zeros((n, n)); amp = 1.0; tot = 0
    for o in range(octs):
        v = _lattice_noise(rng, n, base * 2 ** o)
        if ridged: v = 1 - np.abs(2 * v - 1); v = v * v
        out += v * amp; tot += amp; amp *= 0.5
    return out / tot

def thermal(h, iters, talus, k=0.5):
    for _ in range(iters):
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = np.roll(h, (dy, dx), (0, 1))
            d = h - nb
            m = np.where(d > talus, (d - talus) * k * 0.25, 0)
            h -= m; np.roll(h, (-dy, -dx), (0, 1))
            h += np.roll(m, (-dy, -dx), (0, 1))
    return h

def make(seed=SEED):
    rng = np.random.default_rng(seed)
    ys, xs = (np.mgrid[0:N, 0:N] + 0.5) / N * SIZE - SIZE / 2
    warp_x = (fbm(rng, N, 3, 3) - .5) * 70; warp_y = (fbm(rng, N, 3, 3) - .5) * 70
    wx = xs + warp_x; wy = ys + warp_y
    ang = np.arctan2(wy, wx)
    rad = np.hypot(wx / 1.18, wy)                       # slightly elongated east-west
    lobes = 1 + .14 * np.sin(ang * 2 + 1) + .09 * np.sin(ang * 3 + 2) + .05 * np.sin(ang * 5)
    d = rad / (88 * lobes)
    dome = np.clip(1 - d, 0, 1) ** 0.9
    ridge = fbm(rng, N, 4, 5, ridged=True); bump = fbm(rng, N, 5, 5)
    h = dome * (6 + 24 * ridge) + dome ** .5 * 5 * bump
    # strata: soft terraces stacked as layers, strongest on the slopes
    layer = 3.2; s = h / layer; f = s - np.floor(s)
    terr = (np.floor(s) + np.clip((f - .5) * 3 + .5, 0, 1)) * layer
    h = h * .55 + terr * .45
    # sea shelf: below zero a drop-off that deepens quickly
    h = h - 3.0 * np.clip(d - .86, 0, 1) * 4 + np.where(h < .4, -2.5 * np.clip(d - 1, 0, 2), 0)
    h = h - 1.1
    # south beach: flatten a bay toward the +z side (camera side)
    bx, bz = 4.0, 60.0
    bd = np.hypot((xs - bx) / 1.5, ys - bz)
    bw = np.clip(1 - bd / 52, 0, 1) ** 1.3
    beach = 0.5 + 1.8 * np.clip((bz + 26 - ys) / 70, 0, 1) + 0.35 * fbm(rng, N, 8, 3)
    beach = beach - 3.2 * np.clip((ys - (bz + 6)) / 22, 0, 1)    # slopes below the surf
    h = h * (1 - bw) + beach * bw
    h = thermal(h, 30, 0.55)
    h = h - 0.0
    return xs.astype(np.float32), ys.astype(np.float32), h.astype(np.float32)

def sample(h, x, z):
    j = (x + SIZE / 2) / SIZE * N - .5; i = (z + SIZE / 2) / SIZE * N - .5
    j = min(max(j, 0), N - 1.001); i = min(max(i, 0), N - 1.001)
    i0, j0 = int(i), int(j); u, v = j - j0, i - i0
    return float((h[i0, j0] * (1 - u) + h[i0, j0 + 1] * u) * (1 - v) + (h[i0 + 1, j0] * (1 - u) + h[i0 + 1, j0 + 1] * u) * v)

def props(h, seed=SEED):
    r = np.random.default_rng(seed + 7)
    conifers = []; rocks = []
    tries = 0
    while len(conifers) < 34 and tries < 6000:
        tries += 1
        x, z = r.uniform(-90, 90), r.uniform(-80, 70)
        y = sample(h, x, z)
        if 5 < y < 22 and (not conifers or min((x - a['x']) ** 2 + (z - a['z']) ** 2 for a in conifers) > 49):
            if np.hypot(x - 4, z - 55) > 22:
                conifers.append(dict(x=round(x, 2), z=round(z, 2), y=round(y, 2), h=round(float(r.uniform(5, 10)), 2)))
    tries = 0
    while len(rocks) < 70 and tries < 8000:
        tries += 1
        x, z = r.uniform(-105, 105), r.uniform(-95, 95)
        y = sample(h, x, z)
        if -0.6 < y < 1.6 and np.hypot(x - 4, z - 62) > 14:
            rocks.append(dict(x=round(x, 2), z=round(z, 2), y=round(y, 2), s=round(float(r.uniform(.8, 2.6)), 2)))
    cx, cz = 4.0, 55.0
    fy = sample(h, cx, cz)
    camp = dict(
        fire=dict(x=cx, z=cz, y=round(fy, 2)),
        tents=[dict(x=cx - 11, z=cz - 9, rot=20, color='orange', y=round(sample(h, cx - 11, cz - 9), 2)),
               dict(x=cx + 12, z=cz - 7, rot=-35, color='blue', y=round(sample(h, cx + 12, cz - 7), 2))],
        boat=dict(x=cx - 17, z=cz + 9, rot=75, y=round(sample(h, cx - 17, cz + 9), 2)))
    return dict(conifers=conifers, rocks=rocks, camp=camp)

def build():
    xs, zs, h = make()
    p = props(h)
    sun_az = -132.0; sun_el = 15.0
    cam = dict(pos=[58, 25, 128], target=[0, 2, 50], fov=34)
    return h, dict(seed=SEED, n=N, size=SIZE, sea_level=0.0, heights_cm=np.round(h * 100).astype(int).ravel().tolist(),
                   **p, sun=dict(az=sun_az, el=sun_el), camera=cam)

if __name__ == '__main__':
    h, js = build()
    np.save(os.path.join(HERE, 'island.npy'), h)
    with open(os.path.join(HERE, 'island.json'), 'w') as f: json.dump(js, f, separators=(',', ':'))
    print('hash', hashlib.sha1(h.tobytes()).hexdigest()[:12], 'min/max', h.min(), h.max(), 'land%', (h > 0).mean())
