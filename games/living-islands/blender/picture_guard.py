#!/usr/bin/env python3
"""PICTURE GUARD: a render that wrote a file is not necessarily a picture. HW-4 seed 2029 wrote an all-black hero and the batch reported success.
  python3 picture_guard.py FILE [FILE ...]      exit 0 if every picture passes, 3 if any is black or nearly flat (message on stdout)
  check_picture(path) -> (ok, message, stats)   used by hero_render.py (after the render) and batch.py (after every picture job)
Ground truth, measured on the pixels with PIL + numpy: mean luminance (0-255), the fraction of pixels brighter than DARK_PX, and the luminance spread
(standard deviation). Fails when the mean is below MIN_MEAN, or fewer than MIN_LIT of the pixels are lit, or the spread is below MIN_STD.
Calibrated on the 90 HW-4 hardware pictures (800 px JPEGs): every legitimate one has mean 22 or more, and 5 close-ups (seeds 2004, 2005, 2006, 2028, 2029) plus the 2029 hero are black (mean 1 or less, no lit pixels). The weakest legitimate dusk pictures have 50 percent lit pixels.
If PIL is missing (Blender's own Python) a plain 8-bit PNG is decoded with numpy and zlib and gets the same measurements. If numpy is missing too, or the file is a JPEG, it falls back to a cheap check on the file: a missing or tiny file, or a PNG/JPEG that compresses to under MIN_BYTES_PER_PX
bytes per pixel (a flat or black picture compresses to almost nothing); that cannot see a dark-but-textured fault, and the message says so."""
import os, struct, sys

MIN_MEAN = 6.0        # mean luminance, 0-255
DARK_PX = 12          # a pixel at or below this luminance counts as black
MIN_LIT = 0.15        # at least this fraction of pixels above DARK_PX
MIN_STD = 4.0         # luminance standard deviation
MIN_BYTES_PER_PX = 0.02

def _image_size_cheap(path):
    with open(path, 'rb') as f:
        head = f.read(32)
    if head[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', head[16:24])
    return None

def _png_gray(path):
    """luminance array of a plain 8-bit non-interlaced PNG (grey, RGB, RGBA, grey+alpha) with numpy and zlib only: Blender's own Python has numpy but no PIL. None if it is another kind of PNG."""
    import zlib
    import numpy as np
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    pos = 8; idat = []; hdr = None
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8]); body = data[pos + 8:pos + 8 + ln]; pos += 12 + ln
        if typ == b'IHDR': hdr = struct.unpack('>IIBBBBB', body)
        elif typ == b'IDAT': idat.append(body)
        elif typ == b'IEND': break
    if not hdr: return None
    w, h, depth, ctype, _, _, inter = hdr
    ch = {0: 1, 2: 3, 4: 2, 6: 4}.get(ctype)
    if depth != 8 or inter != 0 or ch is None:
        return None
    raw = np.frombuffer(zlib.decompress(b''.join(idat)), np.uint8).reshape(h, 1 + w * ch)
    out = np.zeros((h, w * ch), np.int32); prev = np.zeros(w * ch, np.int32)
    for y in range(h):
        f = raw[y, 0]; line = raw[y, 1:].astype(np.int32)
        if f == 0: cur = line
        elif f == 2: cur = (line + prev) & 255
        elif f == 1:
            cur = line.copy()
            for c in range(ch, w * ch): cur[c] = (cur[c] + cur[c - ch]) & 255
        elif f == 3:
            cur = line.copy()
            for c in range(w * ch): cur[c] = (cur[c] + (((cur[c - ch] if c >= ch else 0) + prev[c]) >> 1)) & 255
        else:
            cur = line.copy()
            for c in range(w * ch):
                a_ = cur[c - ch] if c >= ch else 0; b_ = prev[c]; c_ = prev[c - ch] if c >= ch else 0
                pa, pb, pc = abs(b_ - c_), abs(a_ - c_), abs(a_ + b_ - 2 * c_)
                cur[c] = (cur[c] + (a_ if pa <= pb and pa <= pc else (b_ if pb <= pc else c_))) & 255
        out[y] = cur; prev = cur
    px = out.reshape(h, w, ch)
    if ch >= 3: return 0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]
    return px[..., 0].astype(np.float64)

def _lit_box(a):
    """Blender 3.6 writes the compositor thumbnail as a small picture in the middle of a full-size black frame. If more than 90 percent of the frame is
    black and the lit pixels sit in one box covering under half the frame, judge the box. A frame with no lit pixels at all stays black."""
    import numpy as np
    lit = a > DARK_PX
    if lit.mean() > 0.10 or not lit.any():
        return a
    ys, xs = np.where(lit)
    box = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    if box.size < 0.5 * a.size and box.shape[0] >= 32 and box.shape[1] >= 32:
        return box
    return a

def _stats(a, size):
    return dict(mean=round(float(a.mean()), 2), lit_fraction=round(float((a > DARK_PX).mean()), 4), std=round(float(a.std()), 2), bytes=size)

def check_picture(path):
    """returns (ok, message, stats). Never raises for a bad picture: a bad picture is a failed check."""
    if not os.path.exists(path):
        return False, 'PICTURE_GUARD FAIL %s: no file was written' % path, {}
    size = os.path.getsize(path)
    if size < 200:
        return False, 'PICTURE_GUARD FAIL %s: file is only %d bytes' % (path, size), {'bytes': size}
    try:
        import numpy as np
        from PIL import Image
    except ImportError:
        try:
            g = _png_gray(path)
        except Exception:
            g = None
        if g is not None:
            st = _stats(g, size); st['decoder'] = 'png-numpy'
            return _verdict(path, st)
        wh = _image_size_cheap(path)
        if wh:
            bpp = size / float(wh[0] * wh[1])
            ok = bpp >= MIN_BYTES_PER_PX
            return ok, ('PICTURE_GUARD %s %s: %.3f bytes per pixel (cheap check only: PIL or numpy is missing, a dark picture with texture would not be caught)' % ('ok' if ok else 'FAIL black or flat picture', path, bpp)), {'bytes': size, 'bytes_per_px': bpp, 'cheap': True}
        return True, 'PICTURE_GUARD ok %s: only the file size was checked (PIL or numpy is missing)' % path, {'bytes': size, 'cheap': True}
    try:
        im = Image.open(path).convert('L')
        a = np.asarray(im, dtype=np.float64)
    except Exception as e:
        return False, 'PICTURE_GUARD FAIL %s: cannot read the picture (%s)' % (path, e), {'bytes': size}
    a = _lit_box(a)
    return _verdict(path, _stats(a, size))

def _verdict(path, st):
    why = []
    if st['mean'] < MIN_MEAN: why.append('mean luminance %.1f is below %.1f (black)' % (st['mean'], MIN_MEAN))
    if st['lit_fraction'] < MIN_LIT: why.append('only %.1f%% of pixels are lit (need %.0f%%)' % (100 * st['lit_fraction'], 100 * MIN_LIT))
    if st['std'] < MIN_STD: why.append('luminance spread %.1f is below %.1f (flat)' % (st['std'], MIN_STD))
    if why:
        return False, 'PICTURE_GUARD FAIL %s: %s' % (path, '; '.join(why)), st
    return True, 'PICTURE_GUARD ok %s: mean %.1f, lit %.1f%%, spread %.1f' % (path, st['mean'], 100 * st['lit_fraction'], st['std']), st

# ---------------------------------------------------------------- SKY SMOOTHNESS (HW-11)
# HW-6 on Blender 3.6 showed a flat band at the top of many renders with a hard lower edge (the finite sea box's far edge, plus a horizon with nothing soft about it).
# Measure: take the top SKY_TOP_FRAC of the rows (the picture is first resampled to SKY_REF_H rows tall, so the numbers do not depend on the render size) and cut it into columns SKY_COLS wide.
# For every row and every column strip, the step is the RGB distance (0-255) between the two rows below and the two rows above. The ROW STEP is the SKY_PCT-th percentile of the step over the strips:
# a hard band edge or hard horizon runs across the whole picture, so nearly every strip steps and the percentile is large; an island, tree, tent or hill covers only part of the width, so a
# smooth sky between them keeps the percentile small. The horizon is the row of the biggest row step. Fail if that step is bigger than SKY_MAX_HORIZON_STEP (a hard edge), or if any row step
# away from the horizon is bigger than SKY_MAX_SKY_STEP (a stripe in the sky). A picture whose land covers nearly the whole width at a ridge in the top rows can be a false alarm.
# A picture whose horizon is lower than the top 35 percent is only checked for stripes in the rows it shows; the canary uses shots whose horizon is in the top 35 percent.
# Calibrated in tests/test_sky_smooth.py on the HW-6 hardware JPEGs (old, must fail) and the HW-11 renders of the same seeds (new, must pass); the numbers are in SKY_FIX.md.
SKY_TOP_FRAC = 0.35
SKY_REF_H = 533
SKY_COLS = 8
SKY_PCT = 20
SKY_MAX_HORIZON_STEP = 14.0
SKY_MAX_SKY_STEP = 8.0
SKY_HORIZON_SKIP = 8          # rows (of SKY_REF_H) either side of the horizon row that the 'stripe in the sky' test ignores

def sky_steps(path):
    """(steps, horizon_row): steps[i] = the row step between row i and row i+1 (see above) for the top SKY_TOP_FRAC of the picture; horizon_row = argmax of the steps. Needs PIL and numpy."""
    import numpy as np
    from PIL import Image
    im = Image.open(path).convert('RGB')
    w = min(im.size[0], 800) // SKY_COLS * SKY_COLS
    a = np.asarray(im.resize((w, SKY_REF_H), Image.BOX), dtype=np.float64)
    n = int(SKY_REF_H * SKY_TOP_FRAC)
    a = a[:n + 2].reshape(n + 2, w // SKY_COLS, SKY_COLS, 3).mean(2)            # column strips
    d = np.zeros(n)
    for i in range(n):
        lo = a[max(i - 1, 0):i + 1].mean(0); hi = a[i + 1:i + 3].mean(0)
        d[i] = np.percentile(np.sqrt(((hi - lo) ** 2).sum(1)), SKY_PCT)
    return d, int(d.argmax())

def check_sky_smooth(path, max_horizon_step=None, max_sky_step=None):
    """returns (ok, message, stats): a smooth sky has no hard single-row edge in the top 35 percent of the picture. Never raises for a bad picture."""
    mh = SKY_MAX_HORIZON_STEP if max_horizon_step is None else max_horizon_step
    ms = SKY_MAX_SKY_STEP if max_sky_step is None else max_sky_step
    try:
        import numpy as np
        d, hr = sky_steps(path)
    except Exception as e:
        return False, 'SKY_SMOOTH FAIL %s: cannot measure (%s)' % (path, e), {}
    far = np.concatenate([d[:max(0, hr - SKY_HORIZON_SKIP)], d[hr + SKY_HORIZON_SKIP + 1:]])
    sky_max = float(far.max()) if len(far) else 0.0
    st = dict(horizon_row=hr, horizon_step=round(float(d[hr]), 2), sky_step=round(sky_max, 2), rows=len(d))
    why = []
    if st['horizon_step'] > mh: why.append('a hard edge: one row steps %.1f levels at row %d of %d (limit %.1f)' % (st['horizon_step'], hr, SKY_REF_H, mh))
    if sky_max > ms: why.append('a stripe in the sky: a row steps %.1f levels (limit %.1f)' % (sky_max, ms))
    if why:
        return False, 'SKY_SMOOTH FAIL %s: %s' % (path, '; '.join(why)), st
    return True, 'SKY_SMOOTH ok %s: biggest row step %.1f at row %d, in the sky %.1f' % (path, st['horizon_step'], hr, sky_max), st

if __name__ == '__main__':
    args = sys.argv[1:]
    sky = bool(args) and args[0] == '--sky'
    if sky: args = args[1:]          # python3 picture_guard.py --sky FILE ...: the sky smoothness check instead of the black-picture check
    bad = 0
    for p in args:
        ok, msg, _ = (check_sky_smooth if sky else check_picture)(p); print(msg); bad += (not ok)
    sys.exit(3 if bad else 0)
