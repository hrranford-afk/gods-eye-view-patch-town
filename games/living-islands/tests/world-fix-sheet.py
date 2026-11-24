# Sheet for the worlds fix: python3 world-fix-sheet.py RAWDIR BEFOREDIR OUT.png index.json   (PIL only)
# top row: before and after of world 153 and of the volcano world 5 (large); below: all 12 worlds small, numbered and labelled.
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
raw, before, out, idx = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
worlds = json.load(open(idx))['worlds']
try:
    font = ImageFont.load_default(size=19); small = ImageFont.load_default(size=15)
except TypeError:
    font = small = ImageFont.load_default()
BW, BH = 480, 320
SW, SH_ = 360, 240
cols = 4
rows = (len(worlds) + cols - 1) // cols
Wd = max(4 * BW, cols * SW) + 5 * 6
sheet = Image.new('RGB', (Wd, BH + rows * SH_ + (rows + 2) * 6), (24, 22, 20))
g = ImageDraw.Draw(sheet)
def put(f, x, y, w, h, t, fnt):
    if not os.path.exists(f):
        return
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    sheet.paste(im, (x, y))
    g.rectangle([x, y, x + 10 + g.textlength(t, font=fnt), y + 26], fill=(20, 18, 16))
    g.text((x + 6, y + 3), t, fill=(255, 244, 220), font=fnt)
items = [('b-0153.png', before, 'before: world 153 gneiss'), ('after-0153.png', raw, 'after: world 153 gneiss'), ('b-0005.png', before, 'before: world 5 volcanic'), ('after-0005.png', raw, 'after: world 5 volcanic')]
for k, (fn, d, t) in enumerate(items):
    put(os.path.join(d, fn), 6 + k * (BW + 6), 6, BW, BH, t, font)
for k, w in enumerate(worlds):
    x, y = 6 + (k % cols) * (SW + 6), BH + 12 + (k // cols) * (SH_ + 6)
    put(os.path.join(raw, 'after-%04d.png' % w['seed']), x, y, SW, SH_, '%d  world %d  %s, %s' % (k + 1, w['seed'], w['rock'], w['island_type']), small)
sheet.save(out, optimize=True)
print('wrote', out, sheet.size)
