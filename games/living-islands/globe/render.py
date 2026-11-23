# render.py: one simple world map per seed, numpy plus PIL only. Land, ocean tinted by sea temperature, current streamlines with
# arrowheads (width and colour by speed), the default table marker, and the source cells of its arrivals as small rings.
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import planet as PL
import circulation as CI
import arrivals as AR

PX = 20                                       # pixels per five degree cell
W, H = PL.NLON * PX, PL.NLAT * PX


def to_xy(lon, lat):
    return (lon + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H


def _ocean_image(world):
    sst = world.circ.sst
    t = np.clip((sst + 2.0) / 32.0, 0, 1)
    cold = np.array([22, 52, 96.0])
    warm = np.array([40, 140, 168.0])
    img = cold[None, None, :] * (1 - t[..., None]) + warm[None, None, :] * t[..., None]
    img = np.flipud(img).astype(np.uint8)
    im = Image.fromarray(img, 'RGB').resize((W, H), Image.BILINEAR)
    return im


def _land_layer(world):
    land = np.flipud(world.planet.land).astype(np.uint8) * 255
    ice = np.flipud(world.planet.ice).astype(np.uint8) * 255
    m = Image.fromarray(land).resize((W, H), Image.NEAREST).filter(ImageFilter.GaussianBlur(PX * 0.45))
    m = m.point(lambda v: 255 if v > 127 else 0)
    mi = Image.fromarray(ice).resize((W, H), Image.NEAREST)
    return m, mi


def _streams(world, rng, n=900, steps=22):
    c = world.circ
    UV = np.stack([c.u, c.v], axis=-1)
    oj, oi = np.nonzero(world.planet.ocean & (np.abs(PL.LAT2) < 75))
    pick = rng.choice(len(oj), size=min(n, len(oj)), replace=False)
    lon = PL.LON[oi[pick]] + rng.uniform(-2.5, 2.5, len(pick))
    lat = PL.LAT[oj[pick]] + rng.uniform(-2.5, 2.5, len(pick))
    paths = [[(lon[k], lat[k])] for k in range(len(pick))]
    alive = np.ones(len(pick), dtype=bool)
    for _ in range(steps):
        v = CI.bilinear(UV, lon, lat)
        sp = np.hypot(v[:, 0], v[:, 1])
        step = 1.1                                              # degrees per step along the flow
        dl = np.where(sp > 1e-6, v[:, 0] / np.maximum(sp, 1e-6) * step / np.maximum(np.cos(np.radians(lat)), 0.2), 0)
        dp = np.where(sp > 1e-6, v[:, 1] / np.maximum(sp, 1e-6) * step, 0)
        lon2 = (lon + dl + 180.0) % 360.0 - 180.0
        lat2 = np.clip(lat + dp, -80, 80)
        j, i = PL.cell_of(lon2, lat2)
        alive &= world.planet.ocean[j, i] & (sp > 0.01)
        for k in np.nonzero(alive)[0]:
            paths[k].append((lon2[k], lat2[k]))
        lon, lat = np.where(alive, lon2, lon), np.where(alive, lat2, lat)
    return paths


def render_world(world, path, title=None):
    base = _ocean_image(world).convert('RGBA')
    landm, icem = _land_layer(world)
    green = Image.new('RGBA', (W, H), (150, 170, 110, 255))
    base.paste(green, (0, 0), landm)
    base.paste(Image.new('RGBA', (W, H), (236, 242, 246, 255)), (0, 0), icem)
    # soft coast line
    edge = landm.filter(ImageFilter.FIND_EDGES)
    base.paste(Image.new('RGBA', (W, H), (70, 84, 60, 255)), (0, 0), edge)
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    rng = np.random.default_rng(world.seed + 31)
    UV = np.stack([world.circ.u, world.circ.v], axis=-1)
    for p in _streams(world, rng):
        if len(p) < 4:
            continue
        pts = [to_xy(a, b) for a, b in p]
        if any(abs(pts[k + 1][0] - pts[k][0]) > W / 2 for k in range(len(pts) - 1)):
            continue                                            # a wrap across the seam, skip
        sp = float(np.hypot(*CI.bilinear(UV, np.array([p[len(p) // 2][0]]), np.array([p[len(p) // 2][1]]))[0]))
        f = min(sp / 0.45, 1.0)
        col = (int(235 * f + 200 * (1 - f)), int(240 - 90 * f), int(235 - 190 * f), int(130 + 110 * f))
        d.line(pts, fill=col, width=1 + int(2.2 * f))
        (x1, y1), (x0, y0) = pts[-1], pts[-3]
        ang = np.arctan2(y1 - y0, x1 - x0)
        L = 7 + 5 * f
        d.polygon([(x1 + 1.5 * np.cos(ang), y1 + 1.5 * np.sin(ang)),
                   (x1 - L * np.cos(ang - 0.45), y1 - L * np.sin(ang - 0.45)),
                   (x1 - L * np.cos(ang + 0.45), y1 - L * np.sin(ang + 0.45))], fill=col)
    # the default table and where its arrivals came from
    # a typical table: of the first 8 default tables, the one whose arrival count is closest to their median
    cand = []
    for k in range(8):
        lo_k, la_k = AR.default_table(world, k)
        cand.append((lo_k, la_k, AR.arrivals_for_table(world, lo_k, la_k)))
    med = float(np.median([c[2]['summary']['n_arrivals'] for c in cand]))
    lon, lat, t = min(cand, key=lambda c: abs(c[2]['summary']['n_arrivals'] - med))
    src = {}
    for a in t['arrivals']:
        k = a['source_region_id']
        src[k] = src.get(k, 0) + 1
    # source regions as 30 x 25 degree outlines, line weight by share of arrivals
    tot = max(sum(src.values()), 1)
    for rid, n in src.items():
        lb, bb = int(rid[1:3]), int(rid[4])
        x0, y1 = to_xy(-180 + 30 * lb, -90 + 25 * bb)
        x1, y0 = to_xy(-180 + 30 * (lb + 1), min(-90 + 25 * (bb + 1), 90))
        d.rectangle([x0, y0, x1, y1], outline=(255, 214, 90, 200), width=1 + int(5 * n / tot))
    x, y = to_xy(lon, lat)
    d.ellipse([x - 13, y - 13, x + 13, y + 13], outline=(255, 255, 255, 255), width=3)
    d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(230, 60, 50, 255), outline=(255, 255, 255, 255))
    out = Image.alpha_composite(base, ov).convert('RGB')
    dd = ImageDraw.Draw(out)
    font = ImageFont.load_default()
    for k in range(-60, 61, 30):
        yy = to_xy(0, k)[1]
        dd.line([(0, yy), (W, yy)], fill=(255, 255, 255), width=1) if k == 0 else None
        dd.text((4, yy + 2), '%d' % k, fill=(235, 235, 235), font=font)
    s = t['summary']
    cap = title or ('seed %d   land %.0f%%   table %s %s (%.0f, %.0f)   %d arrivals in %d days from %d regions   median travel %s d   current at table %.2f m/s'
                    % (world.seed, 100 * world.planet.land_fraction, t['table']['band'], '', lon, lat, s['n_arrivals'], world.days, s['n_sources'],
                       ('%.0f' % s['travel_median']) if s['travel_median'] is not None else 'n/a', t['table']['drift_speed']))
    dd.rectangle([0, H - 36, W, H], fill=(14, 24, 40))
    dd.text((8, H - 30), cap, fill=(240, 240, 240), font=font)
    dd.text((8, H - 16), 'white ring and red dot: the table.  Gold boxes: source regions of its arrivals (thicker = more).  Arrows: surface current (orange = faster).  Colour of sea: temperature.  Invented planet, no real geography.', fill=(200, 210, 225), font=font)
    out.save(path)
    return t


def render_seed(seed, days, path):
    w = AR.World(seed, days)
    return render_world(w, path)
