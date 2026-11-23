#!/usr/bin/env python3
"""Contact sheet of recipe heroes, each frame labelled with its seed and recipe, plus the picture guard result. Needs PIL (not Blender's own Python).
  python3 recipe_sheet.py --blender /path/to/blender --out DIR [--seeds 2004,2005,...] [--w 640 --h 420 --samples 24 --cols 4] [--sheet shots/recipe-fix-sheet.png]
Renders hero_render.py once per seed (skips a seed whose picture already exists in DIR), checks each with picture_guard, writes the sheet."""
import argparse, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import picture_guard as PG, recipe as RC
ap = argparse.ArgumentParser()
ap.add_argument('--blender', required=True); ap.add_argument('--out', required=True); ap.add_argument('--sheet', default='')
ap.add_argument('--seeds', default='2004,2005,2008,2012,2015,2016,2017,2020,2021,2023,2025,2029')
ap.add_argument('--w', type=int, default=640); ap.add_argument('--h', type=int, default=420); ap.add_argument('--samples', type=int, default=24); ap.add_argument('--cols', type=int, default=4)
ap.add_argument('--force', action='store_true'); ap.add_argument('--view', default='hero')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
seeds = [int(x) for x in a.seeds.split(',')]
try:
    font = ImageFont.truetype('DejaVuSans.ttf', 13)
except Exception:
    font = ImageFont.load_default()
tiles = []
for s in seeds:
    png = os.path.join(a.out, '%s_seed%d.png' % (a.view, s))
    if a.force or not os.path.exists(png):
        subprocess.run([a.blender, '-b', '--python', os.path.join(HERE, 'hero_render.py'), '--', '--seed', str(s), '--view', a.view, '--w', str(a.w), '--h', str(a.h), '--samples', str(a.samples), '--out', png], stdout=open(png + '.log', 'w'), stderr=subprocess.STDOUT)
    r = RC.recipe_for(s); fr = r['camera']['framing'] if a.view == 'hero' else r['camera_close']['framing']
    ok, msg, st = PG.check_picture(png) if os.path.exists(png) else (False, 'missing', {})
    l1 = '%d  %s' % (s, RC.summary(r)); l2 = 'subject %.0f%%  pitch %.0f  dist %.0f m  lens %s  guard %s' % (100 * fr['subject_frac'], fr['pitch_deg'], fr['distance_m'], (r['camera'] if a.view == 'hero' else r['camera_close'])['lens'], 'ok' if ok else 'FAIL')
    im = Image.open(png).convert('RGB') if os.path.exists(png) else Image.new('RGB', (a.w, a.h))
    t = Image.new('RGB', (a.w, a.h + 38), (255, 255, 255)); t.paste(im, (0, 38)); d = ImageDraw.Draw(t); d.text((4, 2), l1, fill=(0, 0, 0), font=font); d.text((4, 20), l2, fill=(0, 0, 0) if ok else (200, 0, 0), font=font)
    tiles.append(t)
rows = (len(tiles) + a.cols - 1) // a.cols
W = Image.new('RGB', (a.cols * a.w, rows * (a.h + 38)), (255, 255, 255))
for i, t in enumerate(tiles): W.paste(t, ((i % a.cols) * a.w, (i // a.cols) * (a.h + 38)))
sheet = a.sheet or os.path.join(a.out, 'recipe-sheet.png'); W.save(sheet); print('SHEET', sheet, W.size)
