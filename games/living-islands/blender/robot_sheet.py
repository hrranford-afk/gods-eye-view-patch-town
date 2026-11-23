"""CONTACT SHEET of robot pictures: numpy and PIL only (no Blender). Each frame is labelled with the seed, the role and the quirks (a small built-in bitmap font).
  python3 robot_sheet.py --dir DIR --seeds 1,2,3,... --out sheet.png [--cols 3]      frames are DIR/robot_seedN.png, recipes DIR/robot_recipe_seedN.json
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
FONT = {   # 5x7 bitmap glyphs, rows top to bottom
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110', 'C': '01110 10001 10000 10000 10000 10001 01110', 'D': '11110 10001 10001 10001 10001 10001 11110',
    'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000', 'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001',
    'I': '01110 00100 00100 00100 00100 00100 01110', 'J': '00111 00010 00010 00010 00010 10010 01100', 'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 11001 10101 10011 10001 10001 10001', 'O': '01110 10001 10001 10001 10001 10001 01110', 'P': '11110 10001 10001 11110 10000 10000 10000',
    'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001', 'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100',
    'U': '10001 10001 10001 10001 10001 10001 01110', 'V': '10001 10001 10001 10001 01010 01010 00100', 'W': '10001 10001 10001 10101 10101 11011 10001', 'X': '10001 01010 00100 00100 00100 01010 10001',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00110 01000 10000 11111', '3': '11110 00001 00001 01110 00001 00001 11110',
    '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110', '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
    ' ': '00000 00000 00000 00000 00000 00000 00000', '-': '00000 00000 00000 11111 00000 00000 00000', ',': '00000 00000 00000 00000 00110 00100 01000', ':': '00000 01100 01100 00000 01100 01100 00000',
    '.': '00000 00000 00000 00000 00000 01100 01100', '/': '00001 00010 00010 00100 01000 01000 10000', '+': '00000 00100 00100 11111 00100 00100 00000', '_': '00000 00000 00000 00000 00000 00000 11111',
}


def draw_text(img, x, y, text, scale, colour, bg=None):
    """img: H x W x 3 uint8; draws with the top-left corner at (x, y)"""
    w = len(text) * 6 * scale
    if bg is not None: img[max(0, y - scale * 2): y + 9 * scale, max(0, x - scale * 2): x + w + scale * 2] = bg
    for k, ch in enumerate(text):
        rows = FONT.get(ch.upper(), FONT[' ']).split()
        for r, row in enumerate(rows):
            for c, bit in enumerate(row):
                if bit == '1':
                    yy = y + r * scale; xx = x + (k * 6 + c) * scale
                    if 0 <= yy and yy + scale <= img.shape[0] and 0 <= xx and xx + scale <= img.shape[1]: img[yy:yy + scale, xx:xx + scale] = colour


def label_lines(rec):
    if rec.get('radical'):          # the radical plans: seed, plan, role, palette, quirks and parts
        q = ','.join(rec['quirks']) if rec['quirks'] else 'no quirks'; m = rec['modules'] + rec.get('parts', [])
        return ['SEED %d  %s' % (rec['seed'], rec['plan'].upper()), 'ROLE %s  %s' % (rec['role'].upper(), rec['paint']['palette'].upper()), q.upper() + (('  +' + '+'.join(m).upper()) if m else '')]
    q = ','.join(rec['quirks']) if rec['quirks'] else 'no quirks'
    m = ('  +' + '+'.join(rec['modules'] + rec.get('parts', []))) if (rec['modules'] or rec.get('parts')) else ''
    return ['SEED %d  %s' % (rec['seed'], rec['role'].upper()), '%s %s' % (rec['body']['drive']['type'].upper(), rec['paint']['palette'].upper()), q.upper() + m.upper()]


def sheet(dirn, seeds, out, cols=3, pad=6):
    frames = []
    for s in seeds:
        im = np.asarray(Image.open(os.path.join(dirn, 'robot_seed%d.png' % s)).convert('RGB')).copy(); rec = json.load(open(os.path.join(dirn, 'robot_recipe_seed%d.json' % s)))
        sc = max(1, im.shape[1] // 320)
        for i, line in enumerate(label_lines(rec)):
            draw_text(im, 8 * sc, 8 * sc + i * 11 * sc, line, sc, (250, 247, 235), bg=(22, 22, 24))
        frames.append(im)
    h, w = frames[0].shape[:2]; rows = (len(frames) + cols - 1) // cols
    img = np.full((rows * (h + pad) + pad, cols * (w + pad) + pad, 3), 36, np.uint8)
    for i, f in enumerate(frames):
        r, c = divmod(i, cols); img[pad + r * (h + pad): pad + r * (h + pad) + h, pad + c * (w + pad): pad + c * (w + pad) + w] = f
    Image.fromarray(img).save(out)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--dir', required=True); ap.add_argument('--seeds', required=True); ap.add_argument('--out', required=True); ap.add_argument('--cols', type=int, default=3)
    a = ap.parse_args(); print(sheet(a.dir, [int(x) for x in a.seeds.split(',')], a.out, a.cols))
