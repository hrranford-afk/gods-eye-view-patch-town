import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert('RGB') for f in files]
W = max(i.width for i in ims); H = sum(i.height for i in ims) + 4 * (len(ims) - 1)
o = Image.new('RGB', (W, H), (30, 30, 30)); y = 0
for i in ims:
    o.paste(i, (0, y)); y += i.height + 4
o.save(out)
