#!/usr/bin/env python3
"""Stack the two lineup bands and write the labels (PIL, system python): python3 lineup_labels.py BASE OUT.png
BASE.labels.json comes from tree_lineup.py; BASE_trees.png and BASE_cover.png are its renders."""
import sys, json
from PIL import Image, ImageDraw, ImageFont
base, out = sys.argv[1], sys.argv[2]
meta = json.load(open(base + '.labels.json')); names = meta['names']
def font(sz):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()
bands = []; total_h = 0
for b in meta['bands']:
    im = Image.open('%s_%s.png' % (base, b['tag'])).convert('RGB'); bands.append((b, im)); total_h += im.height
head = 64; foot = 40; W = bands[0][1].width
canvas = Image.new('RGB', (W, total_h + head + foot), (22, 26, 24)); d = ImageDraw.Draw(canvas)
d.text((24, 16), 'Tree species lineup: sapling / mature / veteran, flat plane, same sun and sky as the landform renders', fill=(235, 232, 220), font=font(26))
y = head
f1, f2 = font(17), font(14)
for b, im in bands:
    canvas.paste(im, (0, y))
    seen = set()
    for a in b['anchors']:
        x = a['px']; yy = y + im.height - 26
        d.text((x, yy), {'sapling': 'sap.', 'mature': 'mat.', 'veteran': 'vet.', 'veteran*': 'vet.*'}[a['age']], fill=(235, 232, 220), font=f2, anchor='mm')
    # species captions centred over their three anchors
    for sp in dict.fromkeys(a['sp'] for a in b['anchors']):
        xs = [a['px'] for a in b['anchors'] if a['sp'] == sp]; en = [a['en'] for a in b['anchors'] if a['sp'] == sp][0]
        cap = names[sp] + (' (x%g life size)' % en if en != 1.0 else '')
        d.text((sum(xs) / len(xs), y + im.height - 10), cap, fill=(255, 214, 120), font=f1, anchor='mm')
    y += im.height
d.text((24, canvas.height - 24), 'Cover band: scrub, ground cover and dead wood enlarged as captioned. * = no veteran variant, mature variant shown at 1.2x.', fill=(200, 200, 190), font=f2, anchor='lm')
canvas.save(out, optimize=True)
print('saved', out, canvas.size)
