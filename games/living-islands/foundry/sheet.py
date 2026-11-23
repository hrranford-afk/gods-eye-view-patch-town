"""foundry/sheet.py -- the ONE contact sheet to look at: seeds/shortlist_sheet.png, the top 24 (8 per province, one row each) as hillshade
plan views from the cache, with province, seed, rank, score and key numbers stamped, the start landing marked (ring) and the start island
number. Under 1.5 MB (palette-quantised if needed). It reads only the shortlist and the cached thumbnails; nothing is recomputed."""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
NAMES = {'A': 'gneiss', 'B': 'sandstone', 'C': 'basalt'}
MAX_BYTES = 1_500_000


def font(sz):
    try:
        return ImageFont.truetype(FONT, sz)
    except Exception:
        return ImageFont.load_default()


def make_sheet(seeds_dir, cache_dir=None, per_row=8, tile=224, out_name='shortlist_sheet.png'):
    import sweep
    cache_dir = cache_dir or sweep.CACHE
    sl = json.load(open(os.path.join(seeds_dir, 'shortlist.json')))
    provs = sorted(sl['by_province'])
    gap = 4
    W_px = per_row * tile + (per_row + 1) * gap
    H_px = len(provs) * tile + (len(provs) + 1) * gap
    img = Image.new('RGB', (W_px, H_px), (18, 20, 24))
    d = ImageDraw.Draw(img)
    f = font(11)
    for r, p in enumerate(provs):
        for c, e in enumerate(sl['by_province'][p][:per_row]):
            th = os.path.join(cache_dir, 'worlds', e['hash'] + '.png')
            x0, y0 = gap + c * (tile + gap), gap + r * (tile + gap)
            if os.path.exists(th):
                im = Image.open(th).convert('RGB')
                if im.size != (tile, tile):
                    im = im.resize((tile, tile), Image.LANCZOS)
                img.paste(im, (x0, y0))
            lxy = e.get('start_landing_xy')
            if lxy:
                px, py = x0 + (lxy[0] / 512.0 + 0.5) * tile, y0 + (0.5 - lxy[1] / 512.0) * tile
                d.ellipse([px - 6, py - 6, px + 6, py + 6], outline=(255, 235, 60), width=2)
            n = e['numbers']
            lines = ['%s %s  seed %d  #%d' % (p, NAMES.get(p, ''), e['seed'], c + 1),
                     'score %.2f  isl %s  skerry %s' % (e['score'], n['n_islands'], n['n_skerry']),
                     'K %.2f  D %.2f  coves %s' % (n['korcak_K'] or 0, n['coast_D'] or 0, n['coves_n']),
                     'start #%s  %sm  row %sm' % (e['start_island'], int(e['start_extent_m'] or 0), int(n['row_gap_start_m'] or 0))]
            y = y0 + 2
            for ln in lines:
                d.text((x0 + 3, y), ln, fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(0, 0, 0))
                y += 13
    path = os.path.join(seeds_dir, out_name)
    img.save(path, optimize=True)
    note = 'rgb'
    if os.path.getsize(path) > MAX_BYTES:
        img.quantize(colors=160, method=Image.MEDIANCUT, dither=Image.NONE).save(path, optimize=True)
        note = 'quantised'
    return dict(path=path, bytes=os.path.getsize(path), size=[W_px, H_px], mode=note, tiles=sum(min(len(v), per_row) for v in sl['by_province'].values()))


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    print(json.dumps(make_sheet(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'seeds'))))
