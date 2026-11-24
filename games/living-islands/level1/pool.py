# level1/pool.py -- the island pool: islands cut out of landform worlds (landform/world.py make_world, n=257, 2 m cells) taken from the
# foundry shortlist (foundry/seeds/shortlist.json, by_province) instead of invented. Each candidate is the island plus the land within
# 24 m of it, with the sea round it down to a falloff weight, in PAGE orientation (row 0 north, x east, z south), 2 m cells.
# numpy only. Building the pool takes about 1.3 s per world; the result is cached as an .npz in level1/.cache (not committed).
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, 'landform'))
import world as W  # noqa: E402

DX = 2.0
POOL_PROVINCES = {'A': 10, 'B': 12, 'C': 10}      # first N seeds of the shortlist per province (all qualified worlds)
KEEP_NEAR_M = 24.0                                # land within this of the chosen island comes along (skerries)
FULL_M, FADE_M = 16.0, 64.0                       # weight 1 within FULL_M of kept land, 0 beyond FADE_M
CACHE = os.path.join(HERE, '.cache')


def dilate_dist(mask, max_steps):
    # octagonal distance in cells from True cells, capped at max_steps+1 (repeated 3x3 dilation, cheap on small windows)
    d = np.full(mask.shape, max_steps + 1, np.int16)
    m = mask.copy()
    d[m] = 0
    for s in range(1, max_steps + 1):
        p = np.pad(m, 1)
        n = m.copy()
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if di or dj:
                    n |= p[1 + di:1 + di + m.shape[0], 1 + dj:1 + dj + m.shape[1]]
        new = n & ~m
        d[new] = s
        m = n
        if not new.any():
            break
    return d


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def shortlist_seeds():
    s = json.load(open(os.path.join(ROOT, 'foundry', 'seeds', 'shortlist.json')))
    out = []
    for prov, n in POOL_PROVINCES.items():
        for e in s['by_province'][prov][:n]:
            out.append((prov, int(e['seed'])))
    return out


def cut_candidates(prov, seed):
    # all usable islands of one world, each as a dict of page-oriented arrays
    w = W.make_world(seed, prov, 512, 257)
    fl = lambda a: np.flipud(np.asarray(a))
    H = fl(w.height).astype(np.float32)
    lab = fl(w.island_label).astype(np.int32)
    rock, veg = fl(w.rock), fl(w.veg)
    wet = np.clip(fl(w.wetness) * 255.0, 0, 255).astype(np.uint8) if float(np.max(w.wetness)) <= 1.5 else fl(w.wetness).astype(np.uint8)
    slope = fl(w.slope).astype(np.float32)
    n = H.shape[0]
    out = []
    for isl in w.islands:
        iid = isl['id']
        M = lab == iid
        if M.sum() < 40:
            continue
        rr, cc = np.nonzero(M)
        if rr.min() < 6 or cc.min() < 6 or rr.max() > n - 7 or cc.max() > n - 7:
            continue                                                  # touches the world edge: skip
        near = dilate_dist(M, int(KEEP_NEAR_M / DX)) <= int(KEEP_NEAR_M / DX)
        K = near & (lab > 0)                                           # kept land: the island and land within 24 m
        # the kept land must not be cut by the world edge either
        d = dilate_dist(K, int(FADE_M / DX) + 1).astype(np.float32) * DX
        wgt = 1.0 - smooth((d - FULL_M) / (FADE_M - FULL_M))
        r, c = np.nonzero(wgt > 0.002)
        r0, r1, c0, c1 = max(0, r.min()), min(n, r.max() + 1), max(0, c.min()), min(n, c.max() + 1)
        sl = (slice(r0, r1), slice(c0, c1))
        Kc = K[sl]
        Hh = H[sl]
        land = Hh > 0
        flat_dry = int(((Hh > 1.3) & (slope[sl] < 0.2) & Kc).sum() * DX * DX)
        shoal = int(((Hh < -0.15) & (Hh > -1.3) & (d[sl] > 0) & (d[sl] < 30)).sum() * DX * DX)
        sand = int((np.isin(rock[sl], [12]) & Kc).sum())
        kr, kc = np.nonzero(Kc)
        out.append(dict(
            prov=prov, seed=seed, island=iid, key='%s%d.%d' % (prov, seed, iid),
            area_m2=float(isl['area_m2']), max_h=float(isl['max_height_m']), coast_m=float(isl['coast_length_m']),
            extent_m=float(max(kr.max() - kr.min(), kc.max() - kc.min()) * DX), flat_dry_m2=flat_dry, shoal_m2=shoal,
            sand_cells=sand, land_cells=int(Kc.sum()), joins_low=list(isl['joins_at_low_tide']),
            centroid=(float((kc.mean() + 0.5) * DX), float((kr.mean() + 0.5) * DX)),    # (x, z) inside the window array, metres from its corner
            H=Hh.copy(), rock=rock[sl].copy(), veg=veg[sl].copy(), wet=wet[sl].copy(), wgt=wgt[sl].astype(np.float32), K=Kc.copy(),
            veg_share={int(k): float(v) / max(1, int(Kc.sum())) for k, v in enumerate(np.bincount(veg[sl][Kc], minlength=20)) if v}))
    return out


def build_pool(verbose=False):
    pool = []
    for prov, seed in shortlist_seeds():
        pool += cut_candidates(prov, seed)
        if verbose:
            print(prov, seed, len(pool), flush=True)
    return pool


def load_pool(verbose=False):
    # cached: the pool is a pure function of landform/world.py and the shortlist; the cache key is the world.py size and the list
    key = '%d_%s' % (os.path.getsize(os.path.join(ROOT, 'landform', 'world.py')), '-'.join('%s%d' % s for s in shortlist_seeds()))
    path = os.path.join(CACHE, 'pool_%s.npz' % (abs(hash(key)) % 10 ** 8 if False else __import__('hashlib').sha1(key.encode()).hexdigest()[:10]))
    if os.path.exists(path):
        z = np.load(path, allow_pickle=True)
        return list(z['pool'])
    pool = build_pool(verbose)
    os.makedirs(CACHE, exist_ok=True)
    np.savez_compressed(path, pool=np.array(pool, dtype=object))
    return pool


if __name__ == '__main__':
    import time
    t = time.time()
    P = load_pool(True)
    print(len(P), 'candidates', round(time.time() - t, 1), 's')
