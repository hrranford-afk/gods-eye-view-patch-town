"""Cutaway finish pass: export the world maps the page needs to place kit trees and rocks (no real place names).
   python3 landform/volcano_maps.py [seed=100] [outdir=landform/volcano]
Writes maps.png (RGB, 513 x 513, no alpha so a canvas read-back keeps every value exact; PNG row 0 = NORTH edge like colour.png): R rock id (world.py ROCKS
index, 13..20 on this island), G vegetation id (world.py VEG_LEGEND, 13..19 are the volcanic belts), B wave exposure x 255. Same world as `cutaway.py bake` (same seed, same code), so the
maps line up with height.f32 cell for cell; the script checks that against the shipped height.f32 and refuses to write if they differ."""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import world as W   # noqa: E402

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 100
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'volcano')
w = W.make_world_D(seed)
h = np.fromfile(os.path.join(out, 'height.f32'), '<f4').reshape(w.n, w.n)
if not np.array_equal(h, w.height):
    sys.exit('world for seed %d does not match %s/height.f32' % (seed, out))
a = np.zeros((w.n, w.n, 3), np.uint8)
a[..., 0] = w.rock
a[..., 1] = w.veg
a[..., 2] = np.clip(w.exposure * 255.0 + 0.5, 0, 255)
p = os.path.join(out, 'maps.png')
Image.fromarray(a[::-1].copy(), 'RGB').save(p, optimize=True)
print('wrote', p, os.path.getsize(p), 'bytes; rock ids on land', sorted(set(np.unique(w.rock[w.height > 0]).tolist())), 'veg ids on land', sorted(set(np.unique(w.veg[w.height > 0]).tolist())))
