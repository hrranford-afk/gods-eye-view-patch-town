"""cutaway: bake the table-edge cutaway of a province-D world so the page needs no Python.

  python3 cutaway.py bake [seed=7] [outdir=landform/volcano]     heightfield, surface colour, 4 wall textures (2048x1024 and 1024x512), manifest
  python3 cutaway.py slice [seed] [outdir]                       a few vertical slice strips through the vent (stretch goal: the page's SLICE tool)

Walls (looking at the block from OUTSIDE, left to right):  S: west to east (y = -L/2),  E: south to north (x = +L/2),
N: east to west (y = +L/2),  W: north to south (x = -L/2).  Texture row 0 is the TOP (z = zmax), row H-1 is the base (z0); the
wall mesh in the page maps v = (z - z0) / (zmax - z0) with the usual flipY.
Colours: standard block-diagram colours from rock3d.PALETTE, flat lighting, thin dark layer lines, 4 px edge padding (the colour
above the profile is the colour of the topmost rock in the column, so mip bleed at the profile is harmless).
"""
import json
import os
import sys
import time

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import world as W            # noqa: E402
import rock3d as R           # noqa: E402

WALLS = ['s', 'e', 'n', 'w']
TIDE_RGB = np.array([18, 54, 108], dtype=np.float32)
BOLE_RGB = np.array([156, 74, 52], dtype=np.float32)
CORE_RGB = np.array([255, 178, 72], dtype=np.float32)
LINE_DARK = 0.70
CONTACT_DARK = 0.38
BEDDED = (R.LAVA, R.ASH, R.SCORIA, R.FILL, R.BASEMENT, R.SEDIMENT)


def wall_xy(w, name, s):
    """World (x, y) of the point at distance s (m) along the wall, left to right seen from outside."""
    L = w.size_m
    h = L / 2.0
    if name == 's':
        return -h + s, np.full_like(s, -h)
    if name == 'e':
        return np.full_like(s, h), -h + s
    if name == 'n':
        return h - s, np.full_like(s, h)
    if name == 'w':
        return np.full_like(s, -h), h - s
    raise ValueError(name)


def zrange(vol):
    zmax = float(np.ceil((vol.H + 18.0) / 10.0) * 10.0)
    return vol.z0, zmax


def colourise(d, z):
    """Detail dict on a (rows, cols) grid -> float32 RGB image with layer lines, contacts, tide stripe, lens blend."""
    idv = d['id']
    rows, cols = idv.shape
    col = R.PALETTE[idv].copy()
    # per-bed brightness so neighbouring beds of one rock type differ a little
    bed = d['bed']
    jit = (R._hash01(bed, 3.0) - 0.5) * 0.16
    bedded = np.isin(idv, BEDDED)
    col = np.where(bedded[..., None], col * (1.0 + jit)[..., None], col)
    # red bole line at the top of each lava bed
    lava_top = (idv == R.LAVA) & (d['frac'] < 0.09)
    col = np.where(lava_top[..., None], BOLE_RGB, col)
    # fresh-water lens: pale cyan over the bed colour (the beds still show through)
    lens = idv == R.FRESH
    lay = d['layer']
    lcol = R.PALETTE[lay] * (1.0 + jit)[..., None]
    col = np.where(lens[..., None], 0.38 * lcol + 0.62 * R.PALETTE[R.FRESH], col)
    # magma core is lighter (flat colour, no glow)
    col = np.where(d['magma_core'][..., None], CORE_RGB, col)
    # thin dark lines: bed boundaries inside a layer cake, contacts between different materials
    kind = d['kind']
    bed_change = np.zeros(idv.shape, dtype=bool)
    bed_change[:, 1:] |= bed[:, 1:] != bed[:, :-1]
    bed_change[1:, :] |= bed[1:, :] != bed[:-1, :]
    bed_change &= bedded
    id_change = np.zeros(idv.shape, dtype=bool)
    id_change[:, 1:] |= (idv[:, 1:] != idv[:, :-1]) & (kind[:, 1:] == kind[:, :-1])
    id_change[1:, :] |= (idv[1:, :] != idv[:-1, :]) & (kind[1:, :] == kind[:-1, :])
    # kind change = unconformity (young pile over old stack, fill over dropped block): a contact line too
    kc = np.zeros(idv.shape, dtype=bool)
    kc[:, 1:] |= kind[:, 1:] != kind[:, :-1]
    kc[1:, :] |= kind[1:, :] != kind[:-1, :]
    fault = d['fault']
    dark = np.ones(idv.shape, dtype=np.float32)
    dark = np.where(bed_change, LINE_DARK, dark)
    dark = np.where(id_change | kc | fault, CONTACT_DARK, dark)
    # soften the lines to about 1.3 px
    blur = dark.copy()
    blur[:, 1:-1] = np.minimum(dark[:, 1:-1], 0.5 * dark[:, 1:-1] + 0.25 * (dark[:, :-2] + dark[:, 2:]))
    blur[1:-1, :] = np.minimum(blur[1:-1, :], 0.5 * blur[1:-1, :] + 0.25 * (blur[:-2, :] + blur[2:, :]))
    col = col * blur[..., None]
    # tide line: a thin dark-blue stripe across the rock at sea level
    col = np.where(d['tide'][..., None], 0.35 * col + 0.65 * TIDE_RGB, col)
    return col


def bake_wall(vol, w, name, W_=2048, H_=1024, z0=None, zmax=None):
    z0, zmax = (z0, zmax) if z0 is not None else zrange(vol)
    L = w.size_m
    s = (np.arange(W_, dtype=np.float32) + 0.5) / W_ * L
    zs = zmax - (np.arange(H_, dtype=np.float32) + 0.5) / H_ * (zmax - z0)
    x, y = wall_xy(w, name, s)
    d = vol.detail(x[None, :], y[None, :], zs[:, None])
    col = colourise(d, zs)
    h = d['h']
    valid = zs[:, None] <= h                               # rock exists below the profile
    # extend the topmost valid colour of each column upwards (padding above the profile), then pad the side edges
    first = np.argmax(valid, axis=0)                       # first valid row from the top (rows go downwards)
    top_col = col[first, np.arange(W_)]
    rows = np.arange(H_)[:, None]
    col = np.where(valid[..., None], col, top_col[None, :, :])
    # 4 px side padding
    for k in range(4):
        col[:, k] = col[:, 4]
        col[:, W_ - 1 - k] = col[:, W_ - 5]
    return np.clip(col, 0, 255).astype(np.uint8), h[0].astype(np.float32), (z0, zmax)


def save_png(arr, path, colours=160):
    im = Image.fromarray(arr)
    q = im.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q.save(path, optimize=True)
    return os.path.getsize(path)


def slice_strip(vol, w, p0, p1, W_=1024, H_=512, z0=None, zmax=None):
    """Colour strip of an arbitrary vertical plane from p0 to p1 (x, y metres) seen from the right-hand side of p0 -> p1."""
    z0, zmax = (z0, zmax) if z0 is not None else zrange(vol)
    t = (np.arange(W_, dtype=np.float32) + 0.5) / W_
    x = p0[0] + (p1[0] - p0[0]) * t
    y = p0[1] + (p1[1] - p0[1]) * t
    zs = zmax - (np.arange(H_, dtype=np.float32) + 0.5) / H_ * (zmax - z0)
    d = vol.detail(x[None, :], y[None, :], zs[:, None])
    col = colourise(d, zs)
    valid = zs[:, None] <= d['h']
    first = np.argmax(valid, axis=0)
    top_col = col[first, np.arange(W_)]
    col = np.where(valid[..., None], col, top_col[None, :, :])
    return np.clip(col, 0, 255).astype(np.uint8), d['h'][0].astype(np.float32)


def export_heightfield(w, outdir):
    """Compact binary heightfield (Float32, little endian, row 0 = south, n x n) + surface colour PNG."""
    h = np.ascontiguousarray(w.height.astype('<f4'))
    h.tofile(os.path.join(outdir, 'height.f32'))
    col = W.surface_colour(w)
    Image.fromarray(col[::-1].copy()).quantize(colors=200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(
        os.path.join(outdir, 'colour.png'), optimize=True)           # note: row 0 of the PNG is the NORTH edge (image convention)
    return h.nbytes


def bake(seed=7, outdir=None, slices=False, verbose=True):
    outdir = outdir or os.path.join(HERE, 'volcano')
    os.makedirs(outdir, exist_ok=True)
    t0 = time.perf_counter()
    w = W.make_world_D(seed)
    t_world = time.perf_counter() - t0
    vol = R.Volcano3D(w)
    z0, zmax = zrange(vol)
    sizes = {}
    profiles = {}
    t_walls = {}
    for name in WALLS:
        t1 = time.perf_counter()
        img, prof, _ = bake_wall(vol, w, name, 2048, 1024, z0, zmax)
        sizes['wall_%s_2048.png' % name] = save_png(img, os.path.join(outdir, 'wall_%s_2048.png' % name))
        small = np.array(Image.fromarray(img).resize((1024, 512), Image.LANCZOS))
        sizes['wall_%s_1024.png' % name] = save_png(small, os.path.join(outdir, 'wall_%s_1024.png' % name), 128)
        profiles[name] = prof
        t_walls[name] = time.perf_counter() - t1
        if verbose:
            print('wall', name, round(t_walls[name], 2), 's', sizes['wall_%s_2048.png' % name] // 1024, 'kB')
    hb = export_heightfield(w, outdir)
    p = R.params_to_json(w)
    man = dict(
        seed=int(seed), province='D', n=int(w.n), size_m=float(w.size_m), cell_m=float(w.dx), heights_file='height.f32',
        heights_format='float32 little endian, n*n, row 0 = south edge, column 0 = west edge, metres, sea level 0',
        colour_file='colour.png', colour_note='surface colour (rock + belts); PNG row 0 is the north edge',
        z0=float(z0), zmax=float(zmax), sea_level=0.0, tide_amp=float(w.tide_amp),
        summit_m=float(w.height.max()), min_height_m=float(w.height.min()),
        walls={n_: dict(file_2048='wall_%s_2048.png' % n_, file_1024='wall_%s_1024.png' % n_, size=[2048, 1024],
                        direction={'s': 'west to east', 'e': 'south to north', 'n': 'east to west', 'w': 'north to south'}[n_],
                        origin_world={'s': [-w.size_m / 2, -w.size_m / 2], 'e': [w.size_m / 2, -w.size_m / 2],
                                      'n': [w.size_m / 2, w.size_m / 2], 'w': [-w.size_m / 2, w.size_m / 2]}[n_],
                        top_height_max_m=float(profiles[n_].max())) for n_ in WALLS},
        legend=[dict(id=i, name=R.NAMES[i], rgb=[int(v) for v in R.PALETTE[i]]) for i in range(len(R.NAMES))],
        vent=p['V'], caldera_centre=p['C1'], caldera_radius_m=p['rc'], conduit_radius_m=p['conduit_r'],
        chamber=p['chamber'], wind_from_rad=p['wind_from'], wave_from_rad=p['wave_from'], Dfloor=p['Dfloor'],
        cutaway_wall_distance_m=p['dwall'], vertical_exaggeration=float(w.height.max() / (W.D_REAL_HEIGHT_RATIO * p['Rc'])),
        time_world_s=round(t_world, 2), time_walls_s={k: round(v, 2) for k, v in t_walls.items()},
        bytes=sizes)
    with open(os.path.join(outdir, 'manifest.json'), 'w') as f:
        json.dump(man, f, indent=1)
    if slices:
        bake_slices(vol, w, outdir)
    if verbose:
        tot = sum(sizes.values()) + hb + os.path.getsize(os.path.join(outdir, 'colour.png'))
        print('world %.2f s, total bytes %.2f MB' % (t_world, tot / 1e6))
    return w, vol, man


def bake_slices(vol, w, outdir, n=9):
    """W-E strips (the plane y = const through the vent region), north to south, stretch goal for the page's SLICE tool."""
    Vx, Vy = vol.V
    L = w.size_m
    ys = np.linspace(Vy + 4.0, Vy + 0.55 * L, n)
    info = []
    for k, y in enumerate(ys):
        img, prof = slice_strip(vol, w, (-L / 2, y), (L / 2, y), 1024, 512)
        fn = 'slice_%d.png' % k
        save_png(img, os.path.join(outdir, fn), 96)
        info.append(dict(file=fn, y=float(y)))
    with open(os.path.join(outdir, 'slices.json'), 'w') as f:
        json.dump(dict(axis='y', slices=info, width=1024, height=512), f, indent=1)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'bake'
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    out = sys.argv[3] if len(sys.argv) > 3 else None
    if cmd == 'bake':
        bake(seed, out)
    elif cmd == 'slice':
        bake(seed, out, slices=True)
