import sys
from PIL import Image, ImageDraw
d = sys.argv[1]
W, H = 600, 400
out = Image.new('RGB', (W * 2 + 4, H * 2 + 4), (30, 30, 30))
g = ImageDraw.Draw(out)
for r, v in enumerate(('bar', 'skerry')):
    for c, n in enumerate(('low', 'high')):
        im = Image.open('%s/look-4-%s-%s.png' % (d, v, n)).convert('RGB').resize((W, H), Image.LANCZOS)
        out.paste(im, (c * (W + 4), r * (H + 4)))
        t = ('LOW TIDE  -1.00 m' if n == 'low' else 'HIGH TIDE  +1.00 m')
        x, y = c * (W + 4) + 12, r * (H + 4) + 10
        g.text((x + 1, y + 1), t, fill=(0, 0, 0)); g.text((x, y), t, fill=(255, 255, 255))
out.save(d + '/look-4.png')
