#!/usr/bin/env python3
"""VARIETY JUDGE: how alike are the pictures of a batch? Plain numpy + PIL, no Blender.
  python3 variety_judge.py FOLDER [--glob 'hero_*.jpg'] [--thr 0.90] [--top 15] [--json OUT.json]
For every image: (1) a colour signature = joint RGB histogram (4x4x4 bins) of a 96 px wide copy, (2) a layout signature = a 32x20 grey
thumbnail, mean-removed and unit length (where the land, sea, sky and bright parts are). The similarity of two pictures is
    sim = 0.5 * histogram_intersection + 0.5 * max(0, correlation of the grey thumbnails)         (1 = same picture, 0 = nothing alike)
Reported: the mean pairwise similarity (the headline number, LOWER = more varied), the share of pairs at or above --thr, the number of
look-alike clusters (union of pairs >= thr; images in no pair are clusters of one) and the closest pairs. If *.recipe.json files sit in the
folder (written by hero_render.py) the recipe spread is counted too: distinct island types, rock types, contents, cameras, times, weather.
The pass mark is NOT decided here: it is set with the owner. Exit code 0 always unless --max-mean is given and exceeded."""
import argparse, glob, json, os, sys
import numpy as np
from PIL import Image

BINS = 4
GW, GH = 32, 20

def signature(path):
    im = Image.open(path).convert('RGB')
    a = im.copy(); a.thumbnail((96, 96)); px = np.asarray(a).reshape(-1, 3) // (256 // BINS)
    hist = np.bincount(px[:, 0] * BINS * BINS + px[:, 1] * BINS + px[:, 2], minlength=BINS ** 3).astype(np.float64)
    hist /= hist.sum()
    g = np.asarray(im.convert('L').resize((GW, GH), Image.BILINEAR), np.float64)
    g = g - g.mean(); n = np.linalg.norm(g)
    g = g / n if n > 1e-9 else g
    return hist, g.ravel()

def pairwise(sigs):
    H = np.stack([s[0] for s in sigs]); G = np.stack([s[1] for s in sigs]); n = len(sigs)
    inter = np.zeros((n, n))
    for i in range(n):
        inter[i] = np.minimum(H[i][None, :], H).sum(1)
    corr = np.clip(G @ G.T, 0, 1)
    return 0.5 * inter + 0.5 * corr, inter, corr

def clusters(sim, thr):
    n = len(sim); parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for i in range(n):
        for j in range(i + 1, n):
            if sim[i, j] >= thr:
                parent[find(i)] = find(j)
    return len({find(i) for i in range(n)})

def recipe_spread(folder):
    out = {}
    files = sorted(glob.glob(os.path.join(folder, '*.recipe.json')) + glob.glob(os.path.join(folder, 'recipe_seed*.json')))
    seen = {}
    for f in files:
        try:
            r = json.load(open(f))
        except (OSError, ValueError):
            continue
        seen[r.get('seed', f)] = r
    if not seen:
        return None
    pick = {'island_types': lambda r: r['island']['type'], 'rock_types': lambda r: r['rock']['code'], 'contents': lambda r: r['content']['kind'],
            'cameras': lambda r: r['camera']['kind'], 'times': lambda r: r['time']['name'], 'weathers': lambda r: r['weather']['name'], 'tree_mixes': lambda r: r['trees']['mix']}
    for k, fn in pick.items():
        out[k] = len({fn(r) for r in seen.values()})
    out['recipes'] = len(seen)
    return out

def judge(folder, pattern='hero_*.jpg', thr=0.90, top=15):
    files = sorted(glob.glob(os.path.join(folder, pattern)))
    if len(files) < 2:
        raise SystemExit('need at least two images matching %s in %s' % (pattern, folder))
    sigs = [signature(f) for f in files]
    sim, inter, corr = pairwise(sigs)
    n = len(files); iu = np.triu_indices(n, 1); v = sim[iu]
    order = np.argsort(-v)
    pairs = [(os.path.basename(files[iu[0][k]]), os.path.basename(files[iu[1][k]]), round(float(v[k]), 4)) for k in order[:top]]
    # nearest neighbour similarity per image: a picture is "lonely" (unique) when even its closest match is low
    np.fill_diagonal(sim, -1); nn = sim.max(1)
    res = dict(images=n, pattern=pattern, threshold=thr, mean_pairwise=round(float(v.mean()), 4), median_pairwise=round(float(np.median(v)), 4),
               mean_hist_intersection=round(float(inter[iu].mean()), 4), mean_layout_corr=round(float(corr[iu].mean()), 4),
               share_pairs_ge_thr=round(float((v >= thr).mean()), 4), pairs_ge_thr=int((v >= thr).sum()), clusters=clusters(np.where(sim < 0, 0, sim), thr),
               mean_nearest=round(float(nn.mean()), 4), images_with_lookalike=int((nn >= thr).sum()), closest_pairs=pairs)
    sp = recipe_spread(folder)
    if sp:
        res['recipe_spread'] = sp
    return res

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('folder'); ap.add_argument('--glob', default='hero_*.jpg'); ap.add_argument('--thr', type=float, default=0.90)
    ap.add_argument('--top', type=int, default=15); ap.add_argument('--json', default=''); ap.add_argument('--max-mean', type=float, default=None)
    a = ap.parse_args()
    r = judge(a.folder, a.glob, a.thr, a.top)
    print('images %d  mean pairwise similarity %.4f (lower = more varied)  nearest-neighbour mean %.4f' % (r['images'], r['mean_pairwise'], r['mean_nearest']))
    print('pairs >= %.2f: %d (%.1f%% of pairs)  clusters: %d of %d images  images with a look-alike: %d' % (a.thr, r['pairs_ge_thr'], 100 * r['share_pairs_ge_thr'], r['clusters'], r['images'], r['images_with_lookalike']))
    print('hist intersection %.4f  layout correlation %.4f' % (r['mean_hist_intersection'], r['mean_layout_corr']))
    if 'recipe_spread' in r:
        print('recipe spread:', json.dumps(r['recipe_spread']))
    print('closest pairs:')
    for p in r['closest_pairs']:
        print('  %.4f  %s  %s' % (p[2], p[0], p[1]))
    if a.json:
        json.dump(r, open(a.json, 'w'), indent=1)
    sys.exit(1 if (a.max_mean is not None and r['mean_pairwise'] > a.max_mean) else 0)
