# Contact sheet of the 12 world views: python3 world-view-sheet.py RAWDIR OUT.png index.json   (PIL only)
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
raw, out, idx = sys.argv[1], sys.argv[2], sys.argv[3]
worlds = json.load(open(idx))['worlds']
TW, TH = 600, 400
cols = 4
rows = (len(worlds) + cols - 1) // cols
sheet = Image.new('RGB', (cols * TW + (cols + 1) * 6, rows * TH + (rows + 1) * 6), (24, 22, 20))
try:
    font = ImageFont.load_default(size=19)
except TypeError:
    font = ImageFont.load_default()
g = ImageDraw.Draw(sheet)
for k, w in enumerate(worlds):
    f = os.path.join(raw, 'w%04d.png' % w['seed'])
    if not os.path.exists(f):
        continue
    im = Image.open(f).convert('RGB').resize((TW, TH), Image.LANCZOS)
    x, y = 6 + (k % cols) * (TW + 6), 6 + (k // cols) * (TH + 6)
    sheet.paste(im, (x, y))
    t = '%d  world %d  %s, %s' % (k + 1, w['seed'], w['rock'], w['island_type'])
    g.rectangle([x, y, x + 10 + g.textlength(t, font=font), y + 28], fill=(20, 18, 16))
    g.text((x + 6, y + 4), t, fill=(255, 244, 220), font=font)
sheet.save(out, optimize=True)
print('wrote', out, sheet.size)
