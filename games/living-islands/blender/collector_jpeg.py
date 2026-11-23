"""Baseline JPEG writer in numpy and plain python (no imaging package), used by collector_model.py so the textures inside the GLB files are small.
jpeg_bytes(rgb_u8, quality, subsample): an (h, w, 3) uint8 array (h and w multiples of 16) -> JPEG bytes. Optimised Huffman tables (built from the image's own symbol counts), YCbCr, optional 2 x 2 chroma subsampling.
Deterministic: the same array gives the same bytes."""
import struct
import numpy as np

ZZ = np.array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63])
QLUM = np.array([16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77,
                 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99], float).reshape(8, 8)
QCHR = np.full((8, 8), 99.0); QCHR[:4, :4] = np.array([[17, 18, 24, 47], [18, 21, 26, 66], [24, 26, 56, 99], [47, 66, 99, 99]], float)
_D = np.array([[(np.sqrt(1 / 8) if u == 0 else np.sqrt(2 / 8)) * np.cos((2 * x + 1) * u * np.pi / 16) for x in range(8)] for u in range(8)])


def _qtab(base, quality):
    q = max(1, min(100, int(quality))); s = 5000 / q if q < 50 else 200 - 2 * q
    return np.clip((base * s + 50) // 100, 1, 255).astype(int)


def _blocks(plane):
    h, w = plane.shape
    return plane.reshape(h // 8, 8, w // 8, 8).transpose(0, 2, 1, 3).reshape(-1, 8, 8)


def _coefs(plane, qt):
    """plane (h, w) float, level shifted -> (nblocks, 64) quantised ints in zigzag order, blocks row by row"""
    b = _blocks(plane); d = np.einsum('ij,njk,lk->nil', _D, b, _D)
    q = np.rint(d / qt[None]).astype(np.int32).reshape(-1, 64)
    return q[:, ZZ]


def _huff_table(freq):
    """optimal length-limited (16 bit) Huffman table from symbol counts (the procedure of the JPEG standard, annex K.2). Returns bits[1..16] and the symbols in code order."""
    f = [0] * 257
    for s, c in freq.items(): f[s] = c
    f[256] = 1; size = [0] * 257; others = [-1] * 257
    while True:
        v1 = -1; m = 1 << 60
        for i in range(257):
            if 0 < f[i] <= m: m = f[i]; v1 = i
        v2 = -1; m = 1 << 60
        for i in range(257):
            if 0 < f[i] <= m and i != v1: m = f[i]; v2 = i
        if v2 < 0: break
        f[v1] += f[v2]; f[v2] = 0; size[v1] += 1
        while others[v1] >= 0: v1 = others[v1]; size[v1] += 1
        others[v1] = v2; size[v2] += 1
        while others[v2] >= 0: v2 = others[v2]; size[v2] += 1
    bits = [0] * 33
    for i in range(257):
        if size[i]: bits[size[i]] += 1
    for i in range(32, 16, -1):
        while bits[i] > 0:
            j = i - 2
            while bits[j] == 0: j -= 1
            bits[i] -= 2; bits[i - 1] += 1; bits[j + 1] += 2; bits[j] -= 1
    i = 16
    while bits[i] == 0: i -= 1
    bits[i] -= 1
    syms = [s for ln in range(1, 33) for s in range(256) if size[s] == ln]
    code = 0; k = 0; table = {}
    for ln in range(1, 17):
        for _ in range(bits[ln]): table[syms[k]] = (code, ln); code += 1; k += 1
        code <<= 1
    return bits[1:17], syms, table


def _comp_symbols(q):
    """per block: (dc diff, [(zero run, value)...] with the run/size symbol and end-of-block handling done later). Returns the list of dc diffs and, per block, the list of (symbol, size, amp)"""
    dc = np.diff(np.concatenate([[0], q[:, 0]]))
    acs = []
    for row in q:
        nz = np.flatnonzero(row[1:]); out = []; last = 0
        for p in nz:
            run = int(p) - last
            while run > 15: out.append((0xF0, 0, 0)); run -= 16
            v = int(row[1 + p]); s = abs(v).bit_length(); amp = v if v >= 0 else v + (1 << s) - 1
            out.append(((run << 4) | s, s, amp)); last = int(p) + 1
        if last < 63: out.append((0x00, 0, 0))
        acs.append(out)
    return dc, acs


def jpeg_bytes(rgb, quality=80, subsample=False, chroma_scale=1.0):
    """rgb: (h, w, 3) uint8, h and w multiples of 16 (8 without subsampling)."""
    a = np.asarray(rgb, float); h, w = a.shape[:2]
    Y = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2] - 128.0
    Cb = -0.168736 * a[..., 0] - 0.331264 * a[..., 1] + 0.5 * a[..., 2]; Cr = 0.5 * a[..., 0] - 0.418688 * a[..., 1] - 0.081312 * a[..., 2]
    if subsample:
        Cb = Cb.reshape(h // 2, 2, w // 2, 2).mean((1, 3)); Cr = Cr.reshape(h // 2, 2, w // 2, 2).mean((1, 3))
    ql = _qtab(QLUM, quality); qc = _qtab(QCHR * chroma_scale, quality)
    cy = _coefs(Y, ql); ccb = _coefs(Cb, qc); ccr = _coefs(Cr, qc)
    sy = [_comp_symbols(c) for c in (cy, ccb, ccr)]
    # block order inside each MCU
    bw = w // 8; bh = h // 8
    if subsample:
        mw = w // 16; mh = h // 16
        mi = np.arange(mw * mh); my_, mx_ = mi // mw, mi % mw
        order_y = np.stack([(2 * my_ + dy) * bw + 2 * mx_ + dx for dy, dx in ((0, 0), (0, 1), (1, 0), (1, 1))], 1)
        order_c = mi[:, None]
        # the dc prediction runs in the order the blocks are written, so recompute dc diffs for Y in that order
        ydc = np.diff(np.concatenate([[0], cy[order_y.ravel(), 0]]))
        dcs = [ydc, sy[1][0], sy[2][0]]; ypos = {int(b): i for i, b in enumerate(order_y.ravel())}
    else:
        order_y = np.arange(bw * bh)[:, None]; order_c = order_y; dcs = [sy[0][0], sy[1][0], sy[2][0]]
    nmcu = len(order_y)
    # symbol streams in write order
    stream = []                                       # (table kind 0 dc / 1 ac, symbol, size, amp)
    dcf = {}; acf = {}
    for m in range(nmcu):
        for k in range(order_y.shape[1]):
            bi = int(order_y[m, k]); d = int(dcs[0][m * order_y.shape[1] + k]); s = abs(d).bit_length(); amp = d if d >= 0 else d + (1 << s) - 1
            stream.append((0, s, s, amp)); dcf[s] = dcf.get(s, 0) + 1
            for sym, sz, am in sy[0][1][bi]: stream.append((1, sym, sz, am)); acf[sym] = acf.get(sym, 0) + 1
        for c in (1, 2):
            bi = int(order_c[m, 0]); d = int(dcs[c][m]); s = abs(d).bit_length(); amp = d if d >= 0 else d + (1 << s) - 1
            stream.append((0, s, s, amp)); dcf[s] = dcf.get(s, 0) + 1
            for sym, sz, am in sy[c][1][bi]: stream.append((1, sym, sz, am)); acf[sym] = acf.get(sym, 0) + 1
    dbits, dsyms, dtab = _huff_table(dcf); abits, asyms, atab = _huff_table(acf)
    acc = 0; nb = 0; out = bytearray()
    for kind, sym, sz, amp in stream:
        code, ln = (dtab if kind == 0 else atab)[sym]
        acc = (acc << ln) | code; nb += ln
        if sz: acc = (acc << sz) | (amp & ((1 << sz) - 1)); nb += sz
        while nb >= 8:
            nb -= 8; out.append((acc >> nb) & 0xFF)
        acc &= (1 << nb) - 1
    if nb: out.append(((acc << (8 - nb)) | ((1 << (8 - nb)) - 1)) & 0xFF)
    ent = bytes(out).replace(b'\xff', b'\xff\x00')
    def seg(marker, data): return b'\xff' + bytes([marker]) + struct.pack('>H', len(data) + 2) + data
    dqt = b''.join(bytes([i]) + bytes(int(v) for v in t[:, :].reshape(-1)[ZZ]) for i, t in ((0, ql), (1, qc)))
    ys = 0x22 if subsample else 0x11
    sof = struct.pack('>BHHB', 8, h, w, 3) + bytes([1, ys, 0, 2, 0x11, 1, 3, 0x11, 1])
    dht = bytes([0x00]) + bytes(dbits) + bytes(dsyms) + bytes([0x10]) + bytes(abits) + bytes(asyms)
    sos = bytes([3, 1, 0x00, 2, 0x00, 3, 0x00, 0, 63, 0])
    return (b'\xff\xd8' + seg(0xE0, b'JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00') + seg(0xDB, dqt) + seg(0xC0, sof) + seg(0xC4, dht) + seg(0xDA, sos) + ent + b'\xff\xd9')
