#!/usr/bin/env python3
"""PatchTown: draws the placeholder app icon (a cartoon cairn of stones on a warm background), 1024 x 1024,
no transparency (App Store Connect rejects icons with alpha). No brand marks.

Needs Pillow (pip install pillow). The PNG is committed, so this only needs running to change the icon:
    python3 scripts/make-icon.py
"""
import os
from PIL import Image, ImageDraw

S = 1024
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "PatchTown", "Resources", "Assets.xcassets", "AppIcon.appiconset", "icon-1024.png")

img = Image.new("RGB", (S, S), (246, 196, 120))
d = ImageDraw.Draw(img)

# warm sky gradient (top lighter)
for y in range(S):
    t = y / S
    r = int(250 - 18 * t)
    g = int(214 - 46 * t)
    b = int(150 - 50 * t)
    d.line([(0, y), (S, y)], fill=(r, g, b))

# sun
d.ellipse([650, 130, 870, 350], fill=(255, 236, 170))

# grassy hill
d.ellipse([-260, 760, 1284, 1500], fill=(120, 150, 84))
d.ellipse([-200, 790, 1224, 1500], fill=(134, 166, 94))

# the cairn: stones from bottom to top (centre x, centre y, half width, half height, colour)
stones = [
    (512, 800, 250, 82, (128, 120, 112)),
    (500, 668, 200, 68, (150, 142, 132)),
    (522, 556, 160, 56, (170, 160, 148)),
    (506, 462, 120, 46, (188, 178, 164)),
    (516, 384, 82, 36, (204, 194, 180)),
    (510, 322, 48, 26, (218, 210, 196)),
]
outline = (84, 70, 60)
for cx, cy, hw, hh, col in stones:
    d.ellipse([cx - hw + 10, cy - hh + 16, cx + hw + 10, cy + hh + 16], fill=(96, 110, 66))  # soft shadow
for cx, cy, hw, hh, col in stones:
    d.ellipse([cx - hw, cy - hh, cx + hw, cy + hh], fill=col, outline=outline, width=10)
    # a highlight on each stone
    d.ellipse([cx - hw * 0.55, cy - hh * 0.62, cx - hw * 0.05, cy - hh * 0.18], fill=tuple(min(255, c + 30) for c in col))

# a small flag on top (a patch of cloth)
d.line([(512, 300), (512, 190)], fill=outline, width=10)
d.polygon([(516, 192), (600, 214), (516, 244)], fill=(214, 92, 64), outline=outline)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print("wrote", os.path.normpath(OUT))
