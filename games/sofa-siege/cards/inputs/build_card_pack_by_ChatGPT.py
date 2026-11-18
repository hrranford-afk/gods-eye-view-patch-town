#!/usr/bin/env python3
"""Rebuild Round Table Kingdom A4 two-up print PDF and A5 reference images.

Usage: from the package root, python tools/build_card_pack.py
Dependencies: Pillow, reportlab. No internet, no game code changes.
Input art is the three source_sheets/*.png files; outputs are deterministic.
"""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'source_sheets'
CARDS = ROOT / 'cards_A5'
PRT = ROOT / 'print'
CARDS.mkdir(exist_ok=True)
PRT.mkdir(exist_ok=True)
SHEETS = [
    ('01_world_anchor_capture_flag.png', [('00', 'world_anchor'), ('03', 'capture_flag')]),
    ('02_blue_base_red_base.png', [('01', 'blue_base'), ('02', 'red_base')]),
    ('03_hill_build_camp.png', [('04', 'hill'), ('05', 'build_camp')]),
]
PDF = PRT / 'Round_Table_Kingdom_A4_two_A5_cards_per_page.pdf'
manifest = {
 'project': 'Round Table Kingdom',
 'version': 'AR card visual handover v1, 2026-11-18',
 'status': 'printable artwork reference; NOT a validated AR tracking set',
 'physical_card_size_mm': {'width': 210.0, 'height': 148.5, 'orientation':'landscape A5'},
 'paper': 'A4 portrait 210 x 297 mm; two cards each page',
 'print': 'black and white, 100% / Actual size; matte paper; cut horizontally at centre of each A4 sheet',
 'pdf': str(PDF.relative_to(ROOT)),
 'cards': []
}
cv = canvas.Canvas(str(PDF), pagesize=A4, pageCompression=1, invariant=1)
PAGE_W, PAGE_H = A4
for page, (srcfile, labels) in enumerate(SHEETS, start=1):
    path = SRC / srcfile
    im = Image.open(path).convert('RGB')
    w, h = im.size
    halfway = h//2
    assert w >= 800 and h >= 1200, f'Unexpected source size: {path}: {im.size}'
    for i, (cardid, slug) in enumerate(labels):
        y0,y1 = (0, halfway) if i == 0 else (halfway,h)
        target = CARDS / (f'{cardid}_{slug}_A5_artwork.png')
        im.crop((0, y0, w, y1)).save(target, format='PNG', optimize=True)
        manifest['cards'].append({
         'id': cardid, 'type': slug, 'image': str(target.relative_to(ROOT)),
         'source_sheet':str(path.relative_to(ROOT)), 'page': page,
         'half': 'top' if i == 0 else 'bottom', 'crop_pixels':[0,y0,w,y1],
         'sha256':sha256(target.read_bytes()).hexdigest(),
         'ar_tracking_validated':False
        })
    # The source artwork already has exactly two illustrated halves. Preserve as-is;
    # never redraw, distort, or place a made-up tracking symbol over the design.
    cv.drawImage(str(path), 0, 0, width=PAGE_W, height=PAGE_H, mask='auto')
    cv.showPage()
cv.setTitle('Round Table Kingdom - six black-and-white prototype AR cards, two A5 per A4')
cv.setAuthor('Round Table Kingdom design collaboration')
cv.save()
manifest['cards'].sort(key=lambda c: c['id'])
manifest['pdf_sha256'] = sha256(PDF.read_bytes()).hexdigest()
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf8')
print('Created:',PDF)
print('A4 pages:',len(SHEETS),'A5 cards:',len(manifest['cards']))
print('Card IDs:',[(x['id'],x['type']) for x in manifest['cards']])
