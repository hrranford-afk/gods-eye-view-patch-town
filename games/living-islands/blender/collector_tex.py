"""BAKED TEXTURES FOR THE BEACH COLLECTOR (pure numpy; used by collector_model.py).
What it does, in order:
  1. takes every triangle of the machine (rest pose, builder frame: +X forward, +Y left, +Z up, metres) with its normals, edge value and material key;
  2. finds the hard edges of the mesh (convex ones become paint chips and bright metal, concave ones collect dirt) and how exposed each triangle is (hidden ones share a tiny swatch);
  3. unwraps simply: connected triangles with similar normals become flat charts (planar projection), the charts are packed into one square atlas per material group;
  4. rasterises the atlas, so every texel knows its 3D position, normal, edge distance, ambient occlusion (from a voxel grid, own part plus the static body, so it does not depend on the pose);
  5. shades every texel from those facts (paint fade, chalk, rain streaks, edge wear, chips down to primer and steel, rust that grows from chips and runs under fixings, salt crust, sand scour,
     panel seams with rivets, tread grooves, pits, dust on the solar glass) into base colour, a height map (turned into a tangent-space normal map) and a packed occlusion / roughness / metal map.
The tangent space follows glTF: u along the image columns, the bitangent points up the image (so +v of glTF runs down), normal = tangent x bitangent. Everything is deterministic."""
import math
import numpy as np

# ------------------------------------------------------------------------------------------------- noise (value noise from a lattice table, vectorised, deterministic)
_TAB = np.random.default_rng(20261123).random(1 << 16).astype(np.float32)

def vnoise(P, seed=0):
    P = np.asarray(P, np.float32); fl = np.floor(P); f = P - fl; u = f * f * (3 - 2 * f); i = fl.astype(np.int64)
    ix, iy, iz = i[:, 0] + seed * 7919, i[:, 1] + seed * 104729, i[:, 2] + seed * 1299709; out = 0.0
    ux, uy, uz = u[:, 0], u[:, 1], u[:, 2]
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                h = (((ix + dx) * 73856093) ^ ((iy + dy) * 19349663) ^ ((iz + dz) * 83492791)) & 0xFFFF
                w = (ux if dx else 1 - ux) * (uy if dy else 1 - uy) * (uz if dz else 1 - uz)
                out = out + w * _TAB[h]
    return out

def fbm(P, seed=0, octaves=3):
    P = np.asarray(P, np.float32); a = 0.5; tot = 0.0; norm = 0.0
    for o in range(octaves):
        tot = tot + a * vnoise(P * (2.0 ** o), seed + 17 * o); norm += a; a *= 0.5
    return tot / norm

def sstep(a, b, x):
    t = np.clip((np.asarray(x, np.float32) - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)

def mixc(a, b, t):
    t = np.asarray(t, np.float32)
    t = t[:, None] if t.ndim == 1 else t
    return a * (1 - t) + b * t

def srgb(lin):
    lin = np.clip(lin, 0, 1); return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)


# ------------------------------------------------------------------------------------------------- the mesh facts: hard edges, charts
def corner_ids(V):
    """V (n, 3, 3) corner positions -> (n, 3) ids of the unique positions (to 0.1 mm)"""
    q = np.round(V.reshape(-1, 3) * 1e4).astype(np.int64)
    _, inv = np.unique(q, axis=0, return_inverse=True)
    return inv.ravel().reshape(-1, 3)

def edge_facts(V, hard_deg=28.0):
    """per triangle edge slot (0: c0-c1, 1: c1-c2, 2: c2-c0): is it a hard edge, is it convex, and the neighbour (or -1).
    Boundary edges (one triangle only) count as hard and convex: the rim of a plate."""
    n = len(V); vid = corner_ids(V); fn = np.cross(V[:, 1] - V[:, 0], V[:, 2] - V[:, 0]); ln = np.linalg.norm(fn, axis=1, keepdims=True); fn = fn / np.maximum(ln, 1e-12)
    cen = V.mean(1); a = np.stack([vid[:, 0], vid[:, 1], vid[:, 2]], 1); b = np.stack([vid[:, 1], vid[:, 2], vid[:, 0]], 1)
    lo = np.minimum(a, b).ravel().astype(np.int64); hi = np.maximum(a, b).ravel().astype(np.int64); key = lo * (int(vid.max()) + 2) + hi
    order = np.argsort(key, kind='stable'); ks = key[order]
    nbr = np.full(n * 3, -1, np.int64); cnt = np.zeros(n * 3, np.int64)
    starts = np.flatnonzero(np.r_[True, ks[1:] != ks[:-1]]); ends = np.r_[starts[1:], len(ks)]
    for s, e in zip(starts, ends):
        m = e - s; idx = order[s:e]; cnt[idx] = m
        if m == 2: nbr[idx[0]] = idx[1] // 3; nbr[idx[1]] = idx[0] // 3
    hard = np.zeros(n * 3, bool); convex = np.ones(n * 3, bool)
    tri = np.arange(n * 3) // 3; has = nbr >= 0
    nb = np.where(has, nbr, 0)
    dots = np.einsum('ij,ij->i', fn[tri], fn[nb]); ang_hard = dots < math.cos(math.radians(hard_deg))
    side = np.einsum('ij,ij->i', fn[tri], cen[nb] - cen[tri])
    hard = np.where(has, ang_hard, True) | (cnt > 2); convex = np.where(has, side < 1e-6, True)
    return hard.reshape(n, 3), convex.reshape(n, 3), nbr.reshape(n, 3), fn

def seg_dist(P, A, B):
    d = B - A; t = np.clip(np.einsum('ij,ij->i', P - A, d) / np.maximum(np.einsum('ij,ij->i', d, d), 1e-12), 0, 1)
    return np.linalg.norm(P - (A + d * t[:, None]), axis=1)

def exposure(V, N, grid, lo, cell, rays=14, reach=0.7, step=0.02):
    """fraction of hemisphere rays from each triangle's centre that leave the machine (voxel grid march); hidden insides get near 0"""
    n = len(V); cen = V.mean(1); fn = np.cross(V[:, 1] - V[:, 0], V[:, 2] - V[:, 0]); fn = fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    # the stored normals decide the side that counts (a flipped winding must not turn a visible face into a hidden one)
    sn = N.mean(1); sn = sn / np.maximum(np.linalg.norm(sn, axis=1, keepdims=True), 1e-12)
    fn = np.where((np.einsum('ij,ij->i', fn, sn) < 0)[:, None], -fn, fn)
    rng = np.random.default_rng(3); base = []
    for k in range(rays):
        el = math.asin(0.15 + 0.85 * (k + 0.5) / rays); az = rng.uniform(0, 2 * math.pi); base.append((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    base = np.array(base)
    up = np.where(np.abs(fn[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]])); t1 = np.cross(fn, up); t1 /= np.linalg.norm(t1, axis=1, keepdims=True) + 1e-12; t2 = np.cross(fn, t1)
    esc = np.zeros(n); start = cen + fn * 0.014; dims = np.array(grid.shape)
    for d in base:
        dirv = t1 * d[0] + t2 * d[1] + fn * d[2]; blocked = np.zeros(n, bool)
        for r in np.arange(0.026, reach, step):
            q = start + dirv * r; ix = ((q - lo) / cell).astype(int); ok = (ix >= 0).all(1) & (ix < dims).all(1)
            h = np.zeros(n, bool); h[ok] = grid[ix[ok, 0], ix[ok, 1], ix[ok, 2]]; blocked |= h | (q[:, 2] < 0.0)          # the ground blocks too
        esc += ~blocked
    return esc / len(base)

def texel_ao(P, N, grid, lo, cell, strength=0.68, reach=(0.012, 0.022, 0.036, 0.055, 0.085, 0.13), rays=14):
    """ambient occlusion per point from the voxel grid"""
    rng = np.random.default_rng(5); base = []
    for k in range(rays):
        el = math.radians(rng.uniform(28, 88)); az = rng.uniform(0, 2 * math.pi); base.append((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    base = np.array(base); dims = np.array(grid.shape); out = np.zeros(len(P))
    for s0 in range(0, len(P), 120000):
        p = P[s0:s0 + 120000]; nn = N[s0:s0 + 120000]
        up = np.where(np.abs(nn[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]])); t1 = np.cross(nn, up); t1 /= np.linalg.norm(t1, axis=1, keepdims=True) + 1e-12; t2 = np.cross(nn, t1)
        hit = np.zeros(len(p)); start = p + nn * 0.004
        for d in base:
            dirv = t1 * d[0] + t2 * d[1] + nn * d[2]; blocked = np.zeros(len(p), bool)
            for r in reach:
                q = start + dirv * r; ix = ((q - lo) / cell).astype(int); ok = (ix >= 0).all(1) & (ix < dims).all(1)
                h = np.zeros(len(p), bool); h[ok] = grid[ix[ok, 0], ix[ok, 1], ix[ok, 2]]; blocked |= h
            hit += blocked
        out[s0:s0 + 120000] = 1.0 - strength * (hit / len(base))
    return out


def grow_charts(V, fn, nbr, hard, piece, cos_t=0.80, max_ext=0.20, fixed_keys=()):
    """region growing over soft shared edges within one piece (same part and material). Returns a chart id per triangle and per chart the frame (T, B, Nc, origin and the u, v bounds)."""
    n = len(V); chart = np.full(n, -1, np.int64); charts = []
    Yw = np.array([0, 1.0, 0]); Xw = np.array([1.0, 0, 0])
    for s in range(n):
        if chart[s] >= 0: continue
        Nc = fn[s]
        T = Yw - Nc * Nc[1]
        if np.linalg.norm(T) < 0.3: T = Xw - Nc * Nc[0]
        T = T / np.linalg.norm(T); B = np.cross(Nc, T); cid = len(charts); chart[s] = cid; stack = [s]; members = [s]
        pts = V[s]; ub = [float((pts @ T).min()), float((pts @ T).max())]; vb = [float((pts @ B).min()), float((pts @ B).max())]
        while stack:
            t = stack.pop()
            for e in range(3):
                m = nbr[t, e]
                if m < 0 or chart[m] >= 0 or hard[t, e] or piece[m] != piece[s]: continue
                if float(fn[m] @ Nc) < cos_t: continue
                pp = V[m]; u = pp @ T; v = pp @ B
                nu0, nu1 = min(ub[0], float(u.min())), max(ub[1], float(u.max())); nv0, nv1 = min(vb[0], float(v.min())), max(vb[1], float(v.max()))
                if nu1 - nu0 > max_ext or nv1 - nv0 > max_ext: continue
                ub = [nu0, nu1]; vb = [nv0, nv1]; chart[m] = cid; stack.append(m); members.append(m)
        if (int(piece[s]) % 1000) not in fixed_keys and len(members) > 1:
            # turn the chart to the orientation with the smallest bounding rectangle (better packing); the tread keeps its fixed axes (its grooves follow them)
            pts = V[members].reshape(-1, 3); u = pts @ T; v = pts @ B; best = ((ub[1] - ub[0]) * (vb[1] - vb[0]), 0.0)
            for k in range(1, 12):
                a_ = math.pi / 2 * k / 12; c_, s_ = math.cos(a_), math.sin(a_); uu = u * c_ + v * s_; vv = -u * s_ + v * c_; ar = (uu.max() - uu.min()) * (vv.max() - vv.min())
                if ar < best[0] * 0.92: best = (ar, a_)
            if best[1] != 0.0:
                c_, s_ = math.cos(best[1]), math.sin(best[1]); T2 = T * c_ + B * s_; B2 = np.cross(Nc, T2); T, B = T2, B2; u = pts @ T; v = pts @ B
                ub = [float(u.min()), float(u.max())]; vb = [float(v.min()), float(v.max())]
        charts.append(dict(T=T, B=B, N=Nc, u0=ub[0], u1=ub[1], v0=vb[0], v1=vb[1], tris=members, piece=int(piece[s])))
    return chart, charts

def shelf_pack(sizes, N):
    order = sorted(range(len(sizes)), key=lambda i: (-sizes[i][1], -sizes[i][0], i)); pos = [None] * len(sizes); x = y = rowh = 0
    for i in order:
        w, h = sizes[i]
        if w > N or h > N: return None
        if x + w > N: x = 0; y += rowh; rowh = 0
        if y + h > N: return None
        pos[i] = (x, y); x += w; rowh = max(rowh, h)
    return pos


def raster(uvpx, N, margin=0.8):
    """uvpx (n, 3, 2) in pixels -> per pixel the triangle that covers it (or -1) and its barycentric weights. Pixels whose centre is within margin of a triangle count (so edges are covered)."""
    n = len(uvpx); tid = np.full(N * N, -1, np.int64); lam = np.zeros((N * N, 3), np.float32)
    a, b, c = uvpx[:, 0], uvpx[:, 1], uvpx[:, 2]
    area2 = (b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0])
    la = np.linalg.norm(c - b, axis=1); lb = np.linalg.norm(a - c, axis=1); lc = np.linalg.norm(b - a, axis=1)
    ok = np.abs(area2) > 1e-6
    h = np.stack([np.abs(area2) / np.maximum(la, 1e-9), np.abs(area2) / np.maximum(lb, 1e-9), np.abs(area2) / np.maximum(lc, 1e-9)], 1)
    mn = np.floor(uvpx.min(1) - 1.5).astype(int); mx = np.ceil(uvpx.max(1) + 1.5).astype(int); sz = np.maximum(mx - mn, 1).max(1)
    cls = np.where(sz <= 8, 8, np.where(sz <= 16, 16, np.where(sz <= 32, 32, np.where(sz <= 64, 64, np.where(sz <= 128, 128, np.where(sz <= 256, 256, 512))))))
    allp = []; allt = []; alll = []
    for S in (8, 16, 32, 64, 128, 256, 512):
        ids = np.flatnonzero((cls == S) & ok)
        if not len(ids): continue
        ch = max(1, 1500000 // (S * S)); jj, ii = np.meshgrid(np.arange(S), np.arange(S))
        for s0 in range(0, len(ids), ch):
            t = ids[s0:s0 + ch]; px = mn[t, 0][:, None, None] + jj[None] + 0.5; py = mn[t, 1][:, None, None] + ii[None] + 0.5
            ax, ay = a[t, 0][:, None, None], a[t, 1][:, None, None]; bx, by = b[t, 0][:, None, None], b[t, 1][:, None, None]; cx, cy = c[t, 0][:, None, None], c[t, 1][:, None, None]
            ar = area2[t][:, None, None]
            l0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / ar; l1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / ar; l2 = 1.0 - l0 - l1
            hh = h[t][:, None, None, :]
            inside = (l0 * hh[..., 0] > -margin) & (l1 * hh[..., 1] > -margin) & (l2 * hh[..., 2] > -margin) & (px > 0) & (px < N) & (py > 0) & (py < N)
            ti, yi, xi = np.nonzero(inside)
            if len(ti):
                pxi = np.floor(px[ti, 0, xi]).astype(np.int64) if False else (mn[t[ti], 0] + xi); pyi = mn[t[ti], 1] + yi
                allp.append(pyi * N + pxi); allt.append(t[ti]); alll.append(np.stack([l0[ti, yi, xi], l1[ti, yi, xi], l2[ti, yi, xi]], 1))
    if allp:
        p = np.concatenate(allp); t = np.concatenate(allt); l = np.concatenate(alll)
        inb = (p >= 0) & (p < N * N); p, t, l = p[inb], t[inb], l[inb]
        # a texel owned by several triangles: the one whose weights are most inside wins
        score = np.min(l, axis=1); o = np.lexsort((score, p)); p, t, l = p[o], t[o], l[o]
        tid[p] = t; lam[p] = l
    return tid, lam


def dilate(img, valid, iters=3):
    """copy valid texels into the invalid neighbours (8 directions), iters times. img (N, N, c), valid (N, N) bool"""
    img = img.copy(); valid = valid.copy()
    for _ in range(iters):
        if valid.all(): break
        acc = np.zeros_like(img); cnt = np.zeros(valid.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0: continue
                sv = np.roll(np.roll(valid, dy, 0), dx, 1); si = np.roll(np.roll(img, dy, 0), dx, 1)
                acc += si * sv[..., None]; cnt += sv
        new = (~valid) & (cnt > 0); img[new] = acc[new] / cnt[new][:, None]; valid = valid | new
    return img, valid

def downsample(img, f):
    if f == 1: return img
    h, w = img.shape[:2]; return img.reshape(h // f, f, w // f, f, -1).mean((1, 3))


# ------------------------------------------------------------------------------------------------- shading
PAINT_KEYS = ('paint', 'paint2', 'patch', 'arm', 'mark', 'decal')
CORD_KEYS = ('tape', 'twine', 'sand')
RUBBER_KEYS = ('link', 'rubber')
GLASS_KEYS = ('cell', 'visor', 'lens', 'cap', 'lit_blue', 'lit_orange', 'lit_white', 'lit_glass', 'lit_red')

PRIMER = np.array((0.13, 0.052, 0.040), np.float32); STEEL = np.array((0.27, 0.27, 0.265), np.float32); RUSTC = np.array((0.23, 0.078, 0.030), np.float32)
SALTC = np.array((0.74, 0.72, 0.64), np.float32); SANDC = np.array((0.30, 0.22, 0.12), np.float32); DIRT = np.array((0.045, 0.036, 0.028), np.float32)

def seam_field(S):
    """panel seams: returns (groove 0..1, rivet 0..1) from distances to seam lines in world coordinates, by part"""
    P = S['P']; N = S['N']; node = S['node']; n = len(P); groove = np.zeros(n, np.float32); rivet = np.zeros(n, np.float32)
    side = np.abs(N[:, 1]) > 0.6; front = np.abs(N[:, 0]) > 0.6; top = N[:, 2] > 0.6
    def vline(x0, m, depth=1.0):
        d = np.abs(P[:, 0] - x0); g = np.exp(-(d / 0.0024) ** 2) * m
        r = np.exp(-((d - 0.0075) / 0.0024) ** 2) * m * (np.abs(((P[:, 2] / 0.026) % 1.0) - 0.5) < 0.17)
        return g * depth, r
    def hline(z0, m, depth=1.0):
        d = np.abs(P[:, 2] - z0); g = np.exp(-(d / 0.0024) ** 2) * m
        r = np.exp(-((d - 0.0075) / 0.0024) ** 2) * m * (np.abs(((P[:, 0] / 0.026) % 1.0) - 0.5) < 0.17)
        return g * depth, r
    def yline(y0, m, depth=1.0):
        d = np.abs(np.abs(P[:, 1]) - y0); g = np.exp(-(d / 0.0024) ** 2) * m
        r = np.exp(-((d - 0.0075) / 0.0024) ** 2) * m * (np.abs(((P[:, 0] / 0.026) % 1.0) - 0.5) < 0.17)
        return g * depth, r
    isn = lambda *names: np.isin(node, names)
    for x0 in (-0.30, 0.04, 0.27):
        g, r = vline(x0, (side & isn('chassis')).astype(np.float32)); groove = np.maximum(groove, g); rivet = np.maximum(rivet, r)
    g, r = hline(0.172, (side & isn('chassis')).astype(np.float32)); groove = np.maximum(groove, g); rivet = np.maximum(rivet, r)
    g, r = hline(0.285, (side & isn('chassis', 'shell_l', 'shell_r')).astype(np.float32)); groove = np.maximum(groove, g); rivet = np.maximum(rivet, r)
    g, r = vline(-0.46, (side & isn('hopper')).astype(np.float32)); groove = np.maximum(groove, g)
    g, r = hline(0.275, (side & isn('hopper')).astype(np.float32)); groove = np.maximum(groove, g); rivet = np.maximum(rivet, r)
    g, r = vline(-0.455, (front & isn('hopper')).astype(np.float32)); groove = np.maximum(groove, g)
    g, r = yline(0.07, (top & isn('chassis', 'hopper')).astype(np.float32)); groove = np.maximum(groove, g); rivet = np.maximum(rivet, r)
    g, r = vline(0.45, (side & isn('head')).astype(np.float32)); groove = np.maximum(groove, g)
    g, r = hline(0.285, (side & isn('head')).astype(np.float32)); groove = np.maximum(groove, g)
    return groove, rivet


def shade_body(S, seed):
    """painted body (paint, patch, arm, tape, twine, sand). returns colour (linear), height (m), roughness, metal"""
    P = S['P']; N = S['N']; nz = N[:, 2]; z = P[:, 2]; K = len(P); sd = seed * 13; kidx = S['kidx']; keys = S['keys']; base = S['base']
    up = np.clip(nz, 0, 1); side = 1.0 - np.abs(nz); ao = S['ao']; ed = S['ed']; cd = S['cd']; E = S['E']
    isk = lambda *names: np.isin(kidx, [keys.index(k) for k in names if k in keys])
    paintish = isk(*PAINT_KEYS); cord = isk(*CORD_KEYS); tape = isk('tape'); twine = isk('twine'); sand = isk('sand'); decal = isk('decal'); backing = (S['M'] == 3)
    col = base.copy()
    fade = fbm(P * 2.6, sd + 1, 3); col = col * (0.88 + 0.26 * fade)[:, None]
    # sun-bleached chalk on the upward faces, patchy
    bl = up * sstep(0.30, 0.80, fbm(P * 3.2, sd + 2, 3)) * 0.62
    col = mixc(col, base * 0.5 + np.array((0.20, 0.215, 0.18), np.float32), bl * 0.62)
    # rain runs: tall thin dirty streaks on the walls
    sw = fbm(P * np.array([34, 34, 1.7], np.float32), sd + 3, 3); sk = sstep(0.50, 0.76, sw) * np.clip(side + 0.1, 0, 1) * (0.45 + 0.55 * fbm(P * 5, sd + 4, 2))
    col = mixc(col, col * np.array((0.52, 0.47, 0.40), np.float32), sk * 0.80)
    low = sstep(0.24, 0.04, z) * (0.45 + 0.55 * fbm(P * 7, sd + 21, 3)); col = mixc(col, np.array((0.05, 0.042, 0.032), np.float32), low * 0.42)       # splash and grime zone
    fine = fbm(P * 260, sd + 5, 2)
    # edge wear, chips, rust, scratches
    we = np.maximum(np.exp(-ed / 0.0030), sstep(0.35, 1.0, E))
    halo = S['halo']; fixs = S['streak']
    scour_z = sstep(0.16, 0.025, z)
    chipn = fbm(P * 48, sd + 6, 3) + 0.45 * we + 0.38 * halo + 0.14 * scour_z + 0.10 * (1 - ao)
    chip = sstep(0.72, 0.745, chipn); chip_halo = sstep(0.685, 0.72, chipn) * (1 - chip)
    bare = chip * sstep(0.38, 0.8, we * (0.4 + fine) + 0.35 * halo + 0.25 * fbm(P * 40, sd + 7, 2))
    primer = PRIMER * (0.8 + 0.5 * fine)[:, None]
    rustn = 0.55 + 0.9 * fbm(P * 90, sd + 8, 2)
    rust = np.clip(chip_halo * 0.8 + fixs * 0.8 + halo * 0.25 * sstep(0.5, 0.8, fbm(P * 50, sd + 9, 2)), 0, 1) * np.clip(side + 0.35, 0, 1)
    col = mixc(col, RUSTC[None] * rustn[:, None], np.clip(rust * 0.85, 0, 1))
    col = mixc(col, primer, chip)
    col = mixc(col, STEEL[None] * (0.7 + 0.6 * fine)[:, None], bare)
    # scratches (thin pale lines along the work directions)
    scr = np.maximum(sstep(0.76, 0.80, fbm(P * np.array([90, 14, 14], np.float32), sd + 10, 2)), sstep(0.77, 0.81, fbm(P * np.array([14, 14, 90], np.float32), sd + 11, 2)))
    scr = scr * (0.25 + 0.75 * we + 0.5 * scour_z)
    col = mixc(col, STEEL[None] * 0.55 + PRIMER[None] * 0.5, np.clip(scr, 0, 1) * 0.55 * (1 - chip))
    # seams
    groove, rivet = seam_field(S)
    col = col * (1 - 0.78 * groove)[:, None]; col = mixc(col, col * 1.35 + 0.01, rivet * 0.4)
    # the gasket line at the foot of the shells and the dark backing between the solar cells
    gz = sstep(0.0, 1.0, np.clip((0.274 - z) / 0.014, 0, 1)) * (np.isin(S['node'], ('shell_l', 'shell_r')) & (z > 0.255)) * paintish
    col = mixc(col, np.array((0.018, 0.018, 0.02), np.float32), gz * 0.9)
    bk = np.array((0.012, 0.016, 0.024), np.float32) * (0.7 + 0.8 * fade)[:, None]
    col = np.where(backing[:, None], mixc(bk, col * 0.18, 0.3), col)
    # sand scour near the ground: paint rubbed pale and dull
    scour = scour_z * sstep(0.42, 0.68, fbm(P * np.array([14, 70, 70], np.float32), sd + 12, 3))
    col = mixc(col, SANDC[None] * (0.9 + 0.3 * fine)[:, None], np.clip(scour * 0.55, 0, 0.7))
    # salt crust: white, in the lowest 20 cm and in pale blooms on top
    sz = np.clip(1.0 - z / 0.16, 0, 1)
    sn = fbm(P * 40, sd + 13, 3); salt = sstep(0.54 - 0.18 * sz, 0.72 - 0.18 * sz, sn) * sz ** 1.5
    bloom = sstep(0.66, 0.84, fbm(P * 9, sd + 14, 3)) * sstep(0.45, 0.85, fbm(P * 55, sd + 15, 2)) * up * 0.35
    salt = np.clip(salt + bloom, 0, 1) * (1 - 0.4 * chip)
    col = mixc(col, SALTC[None] * (0.88 + 0.22 * fine)[:, None], salt * 0.9)
    # sand packed into crevices, dirt where occlusion is high
    cav = np.clip((0.70 - ao) * 2.2, 0, 1); col = mixc(col, SANDC[None] * 0.75, np.clip(cav * 0.5 + sstep(0.0, 0.06, 0.06 - z) * 0.3, 0, 0.7))
    col = col * (0.52 + 0.48 * np.clip(ao * 1.15, 0, 1))[:, None] * (1.0 - 0.4 * np.clip(-nz, 0, 1))[:, None]
    col = mixc(col, DIRT[None], np.clip(cd * 0 + 0.0, 0, 1))
    # decals: the rust runs fade into the paint at their edges
    if decal.any():
        t = np.clip(E, 0, 1); rc = RUSTC[None] * (0.7 + 0.5 * fine)[:, None] * 0.9
        col = np.where(decal[:, None], mixc(rc, col, sstep(0.0, 1.0, t) ** 0.7), col)
    # cord: tape, twine, sand lumps
    if cord.any():
        wv = 0.55 + 0.45 * np.abs(np.sin(P[:, 0] * 520) * np.sin(P[:, 1] * 520 + P[:, 2] * 520))
        tc = base * (0.62 + 0.5 * fbm(P * 40, sd + 16, 2))[:, None] * (0.8 + 0.2 * wv)[:, None]
        tc = mixc(tc, SANDC[None] * 0.9, sstep(0.0, 0.12, 0.12 - z) * 0.5 + 0.18 * cav)
        tc = mixc(tc, DIRT[None] * 3, sk * 0.35)
        col = np.where(cord[:, None], tc, col)
    col = np.clip(col, 0, 1)
    # heights in metres
    h = 0.00012 * (fine - 0.5) + 0.00010 * (fbm(P * 260, sd + 17, 1) - 0.5)
    h = h - 0.00040 * chip - 0.00055 * groove + 0.00075 * rivet + 0.0004 * rust * (fbm(P * 150, sd + 18, 2) - 0.3) + 0.0006 * salt * (0.4 + fbm(P * 220, sd + 19, 2)) - 0.00025 * scr * (1 - chip)
    h = h + 0.0004 * bare * (fine - 0.5)
    h = np.where(tape, 0.00035 * (np.sin(P[:, 0] * 900) * np.sin(P[:, 1] * 900 + P[:, 2] * 900)), h)
    h = np.where(twine, 0.0006 * np.sin((P[:, 0] + P[:, 1] + P[:, 2]) * 1100), h)
    h = np.where(sand, 0.0008 * (fbm(P * 600, sd + 20, 1) - 0.5), h)
    # roughness and metal
    rough = 0.60 + 0.14 * fade - 0.10 * (1 - np.clip(we * 2, 0, 1)) * 0 + 0.0
    rough = rough + 0.22 * bl
    rough = mixc(rough[:, None], np.array([0.84], np.float32), chip[:, None])[:, 0]
    rough = mixc(rough[:, None], np.array([0.38], np.float32), bare[:, None])[:, 0]
    rough = mixc(rough[:, None], np.array([0.92], np.float32), np.clip(rust, 0, 1)[:, None])[:, 0]
    rough = mixc(rough[:, None], np.array([0.96], np.float32), np.clip(salt, 0, 1)[:, None])[:, 0]
    rough = mixc(rough[:, None], np.array([0.86], np.float32), np.clip(scour * 0.8, 0, 1)[:, None])[:, 0]
    rough = np.where(cord, 0.96, rough); rough = np.where(backing, 0.45, rough)
    rough = np.clip(rough - 0.10 * groove * 0 + 0.05 * (fine - 0.5), 0.2, 1.0)
    metal = np.clip(bare * 0.95 * (1 - salt) * (1 - 0.8 * rust), 0, 1); metal = np.where(cord, 0.0, metal)
    return col, h, rough, metal


def shade_metal(S, seed):
    """metal and tracks (steel, guards, hubs, frame, grime, rubber links and cleats)"""
    P = S['P']; N = S['N']; nz = N[:, 2]; z = P[:, 2]; sd = seed * 13 + 5; kidx = S['kidx']; keys = S['keys']; base = S['base']
    up = np.clip(nz, 0, 1); side = 1.0 - np.abs(nz); ao = S['ao']; ed = S['ed']; cd = S['cd']; E = S['E']
    isk = lambda *names: np.isin(kidx, [keys.index(k) for k in names if k in keys])
    rub = isk(*RUBBER_KEYS); link = isk('link'); hub = isk('hub')
    fade = fbm(P * 2.8, sd + 1, 3); fine = fbm(P * 280, sd + 2, 2)
    col = base * np.where(rub, 0.92 + 0.16 * fade, 0.70 + 0.35 * fade)[:, None]
    we = np.maximum(np.exp(-ed / 0.0026), sstep(0.35, 1.0, E)); wn = fbm(P * 120, sd + 3, 2)
    wear = np.clip(we * (0.30 + 1.1 * wn), 0, 1)
    # bright worn steel on the edges and the high spots, brushed along the work direction
    brush = fbm(P * np.array([40, 340, 340], np.float32), sd + 4, 2)
    steel = STEEL[None] * (0.42 + 0.6 * brush)[:, None]
    col = np.where(rub[:, None], col, mixc(col, steel, np.clip(wear * 0.75, 0, 0.75)))
    # rubber: worn grey on the tips, cracks, dust on up faces
    rwear = np.clip(we * (0.35 + wn), 0, 1) * 0.6
    col = np.where(rub[:, None], mixc(col, np.array((0.10, 0.095, 0.09), np.float32) * (0.7 + 0.5 * fine)[:, None], rwear[:, None] * 0.7), col)
    crack = sstep(0.60, 0.64, fbm(P * np.array([60, 60, 60], np.float32), sd + 6, 3)) * (1 - 0.0)
    col = np.where(rub[:, None], col * (1 - 0.45 * crack)[:, None], col)
    # rust blooms: from pits and edges, and under fixings
    rn = fbm(P * 20, sd + 7, 3) + 0.16 * wear + 0.30 * S['halo'] + 0.08 * (1 - ao)
    rust = sstep(0.70, 0.88, rn) * np.where(rub, 0.0, 1.0); rust = np.clip(rust + S['streak'] * 0.8 * (~rub), 0, 1)
    col = mixc(col, RUSTC[None] * (0.45 + 0.7 * fbm(P * 100, sd + 8, 2))[:, None], rust * 0.80)
    # oil and grime near the joints and low parts
    grime = sstep(0.50, 0.82, fbm(P * np.array([30, 30, 5.0], np.float32), sd + 9, 3)) * 0.24
    col = mixc(col, col * 0.45, grime * (1 - rust) * np.where(rub, 0.0, 0.6))
    # salt crust, sand
    sz = np.clip(1.0 - z / 0.15, 0, 1); sn = fbm(P * 40, sd + 10, 3)
    salt = sstep(0.56 - 0.18 * sz, 0.74 - 0.18 * sz, sn) * sz ** 1.5
    bloom = sstep(0.68, 0.86, fbm(P * 8, sd + 11, 3)) * up * 0.22
    salt = np.clip(salt + bloom, 0, 1)
    col = mixc(col, SALTC[None] * (0.85 + 0.25 * fine)[:, None], np.clip(salt * np.where(rub, 0.10, 0.60), 0, 0.7))
    cav = np.clip((0.72 - ao) * 2.4, 0, 1)
    dusty = np.where(rub, 0.55, 0.40)
    col = mixc(col, SANDC[None] * (0.55 + 0.4 * fine)[:, None], np.clip(cav * np.where(rub, 0.30, 0.45) + up * 0.14 * sstep(0.4, 0.8, fbm(P * 20, sd + 12, 3)) * dusty + sstep(0.0, 0.05, 0.05 - z) * np.where(rub, 0.10, 0.18), 0, 0.6))
    col = col * (0.55 + 0.45 * np.clip(ao * 1.15, 0, 1))[:, None]
    col = np.clip(col, 0, 1)
    # heights: pits, brushing, rust flakes, tread grooves on the pads (chart coordinates), cracks in the rubber
    pits = sstep(0.70, 0.76, fbm(P * 150, sd + 13, 2))
    h = 0.00008 * (fine - 0.5) - 0.0005 * pits * (1 - rub) + 0.00012 * (brush - 0.5) * (1 - rub) + 0.0007 * rust * (fbm(P * 160, sd + 14, 2) - 0.3) + 0.0006 * salt * (0.4 + fbm(P * 220, sd + 15, 2))
    groove = np.where(link, 0.5 + 0.5 * np.cos(S['cv'] * (2 * math.pi / 0.0065)), 0.0) * (nz > -2)
    h = h - 0.0007 * groove * link - 0.0008 * crack * rub
    h = h + 0.0004 * np.where(hub, np.sin(np.hypot(P[:, 0], P[:, 2]) * 700), 0.0) * 0.0
    rough = np.where(rub, 0.90 + 0.06 * fine, 0.50 + 0.18 * fade - 0.28 * np.clip(wear, 0, 1) + 0.10 * brush)
    rough = np.where(rust > 0.3, 0.88, rough); rough = np.where(salt > 0.3, 0.95, rough)
    rough = np.clip(rough + 0.12 * cav, 0.18, 1)
    metal = np.where(rub, 0.0, np.clip(0.78 + 0.2 * wear - 0.95 * rust - 0.9 * salt - 0.5 * cav, 0, 1))
    return col, h, rough, metal


def shade_glass(S, seed):
    """solar cells, visor and lens, litter glass and plastic"""
    P = S['P']; N = S['N']; nz = N[:, 2]; z = P[:, 2]; sd = seed * 13 + 9; kidx = S['kidx']; keys = S['keys']; base = S['base']
    up = np.clip(nz, 0, 1); side = 1.0 - np.abs(nz); ao = S['ao']; ed = S['ed']; cd = S['cd']; E = S['E']
    isk = lambda *names: np.isin(kidx, [keys.index(k) for k in names if k in keys])
    cell = isk('cell'); lens = isk('visor', 'lens', 'cap'); lit = isk('lit_blue', 'lit_orange', 'lit_white', 'lit_glass', 'lit_red')
    q = np.round(P / 0.056) * 0.056; r = fbm(q * 9, sd + 1, 2); fade = fbm(P * 3.5, sd + 2, 3); fine = fbm(P * 300, sd + 3, 2)
    col = base * (0.70 + 1.5 * r)[:, None] * (0.80 + 1.0 * fade)[:, None]
    # fine cell structure: busbars (two thin lines) and a faint grid of fingers
    cu = (P[:, 0] / 0.0125) % 1.0; bus = (np.abs(cu - 0.33) < 0.05) | (np.abs(cu - 0.66) < 0.05)
    cellv = np.where(np.abs(N[:, 2]) > 0.4, 1.0, 0.0)
    col = np.where((cell & bus)[:, None], col * 1.5 + 0.012, col)
    # dust film on the up faces, washed in tall clean runs, plus bird-lime blotches
    dn = fbm(P * np.array([40, 40, 3.5], np.float32), sd + 4, 3); dust = sstep(0.30, 0.78, fbm(P * 11, sd + 5, 3)) * (0.30 + 0.70 * sstep(0.3, 0.7, dn)) * (0.45 + 0.55 * up)
    dust = np.where(cell, dust * 0.80, dust * 0.55)
    col = mixc(col, np.array((0.40, 0.37, 0.30), np.float32) * (0.85 + 0.3 * fine)[:, None], np.clip(dust * 0.80, 0, 0.8))
    salt = sstep(0.62, 0.80, fbm(P * 26, sd + 6, 3)) * (0.25 + 0.75 * np.clip(1 - z / 0.5, 0, 1)) * 0.55
    col = mixc(col, SALTC[None], np.clip(salt * (cell | lit), 0, 0.7))
    col = mixc(col, np.array((0.42, 0.40, 0.33), np.float32), sstep(0.0, 1.0, np.clip(E, 0, 1)) * 0.2 * cell)
    # cracks: a spider crack on the marked cell
    crack = np.zeros(len(P), np.float32)
    for (cx, cy, cz, rad) in S.get('cracks', []):
        d = np.linalg.norm(P - np.array((cx, cy, cz)), axis=1); ang = np.arctan2(P[:, 1] - cy, P[:, 0] - cx)
        rays = np.abs(np.sin(ang * 4.5 + 3.0 * np.sin(ang * 1.7 + d * 80))) ; line = np.exp(-(rays / 0.07) ** 2) * (d < rad) * np.exp(-d / (rad * 0.8))
        rings = np.exp(-(((d % 0.0105) - 0.005) / 0.0007) ** 2) * (d < rad * 0.6) * 0.7
        crack = np.maximum(crack, np.clip(line + rings, 0, 1))
    col = mixc(col, np.array((0.55, 0.56, 0.55), np.float32), crack * 0.7)
    # lens and visor: smoky, hazed, with pale scratches
    haze = fbm(P * 90, sd + 7, 3); lcol = base * 1.0 + np.array((0.16, 0.17, 0.17), np.float32) * (sstep(0.30, 0.95, haze) * 0.30)[:, None] * (0.4 + 0.6 * up)[:, None]
    scr = sstep(0.78, 0.82, fbm(P * np.array([250, 60, 60], np.float32), sd + 8, 2)) * 0.6
    lcol = mixc(lcol, np.array((0.4, 0.4, 0.38), np.float32), scr * 0.45)
    col = np.where(lens[:, None], lcol, col)
    # litter: faded plastic, scuffed
    lc = base * (0.55 + 0.7 * fbm(P * 12, sd + 9, 3))[:, None]; lc = mixc(lc, np.array((0.5, 0.48, 0.42), np.float32), 0.25 * sstep(0.3, 0.8, fbm(P * 11, sd + 10, 3)))
    lc = mixc(lc, SANDC[None], 0.25 * np.clip(1 - ao, 0, 1) + 0.0)
    col = np.where(lit[:, None], lc, col)
    col = col * (0.55 + 0.45 * np.clip(ao * 1.15, 0, 1))[:, None]
    col = np.clip(col, 0, 1)
    h = 0.00006 * (fine - 0.5) + 0.00030 * dust * (fbm(P * 400, sd + 11, 1) - 0.5) - 0.0006 * crack + 0.00015 * np.where(cell, np.sin(P[:, 0] * 500) * np.sin(P[:, 1] * 500) * 0.0, 0.0)
    rough = np.where(cell, 0.16 + 0.55 * np.clip(dust, 0, 1), np.where(lens, 0.30 + 0.35 * sstep(0.4, 0.85, haze), 0.45 + 0.2 * fine))
    rough = np.clip(rough + 0.25 * salt * (cell | lit) - 0.05 * crack, 0.08, 1)
    metal = np.where(cell, 0.06, 0.0)
    return col, h, rough, metal


SHADERS = {'body': shade_body, 'metal': shade_metal, 'glass': shade_glass, 'all': None}

def shade_all(S, seed):
    """the single atlas of the live level: each texel by the shader of its group"""
    K = len(S['P']); col = np.zeros((K, 3), np.float32); h = np.zeros(K, np.float32); rough = np.zeros(K, np.float32); metal = np.zeros(K, np.float32)
    grp = S['kgroup'][S['kidx']]
    for gi, g in enumerate(('body', 'metal', 'glass')):
        m = grp == gi
        if not m.any(): continue
        sub = {k: (v[m] if isinstance(v, np.ndarray) and len(v) == K else v) for k, v in S.items()}
        c, hh, r, me = SHADERS[g](sub, seed); col[m] = c; h[m] = hh; rough[m] = r; metal[m] = me
    return col, h, rough, metal


# ------------------------------------------------------------------------------------------------- the atlas build
def bake_group(tri, N, spec, keys, base, kgroup, seed, voxel, fixes, cracks, shader, verbose=False):
    """tri: dict of per-triangle arrays for one atlas (V (n,3,3), Nn (n,3,3), E (n,3), M (n,3), kidx (n), node (n) str array, piece (n)).
    N: atlas size, spec: dict(dens, swatch_keys, hidden_below). Returns uv (n,3,2) in 0..1 and the images dict {'color','normal','orm'} as float arrays (sRGB colour, 0..1 normal rgb, orm)."""
    V = tri['V']; Nn = tri['Nn']; n = len(V); grid_all, lo, cell = voxel['all']; kidx = tri['kidx']
    hard, convex, nbr, fn = edge_facts(V)
    expo = exposure(V, Nn, grid_all, lo, cell)
    swk = np.isin(kidx, [keys.index(k) for k in spec.get('swatch_keys', ()) if k in keys])
    swatch = swk | (expo < spec.get('hidden_below', 0.07))
    chart, charts = grow_charts(V, fn, nbr, hard, tri['piece'] * 1000 + kidx, cos_t=spec.get('cos', 0.80), max_ext=spec.get('max_ext', 0.20), fixed_keys=[keys.index(k) for k in spec.get('fixed_keys', ()) if k in keys])
    # charts made of visible triangles only (a hidden triangle forms its own chart and is then moved to the swatch)
    keep = []
    for ci, c in enumerate(charts):
        tr = np.array(c['tris']); vis = ~swatch[tr]
        if vis.any(): keep.append(ci)
    dens0 = spec['dens']; pad = 1; area_w = {}
    # chart density: undersides take less
    cmul = []
    for ci in keep:
        c = charts[ci]; tr = np.array(c['tris']); nzm = float(Nn[tr][:, :, 2].mean()); cmul.append(0.55 if nzm < -0.5 else 1.0)
    def sizes_for(s):
        out = []
        for j, ci in enumerate(keep):
            c = charts[ci]; d = dens0 * s * cmul[j]
            out.append((int(math.ceil((c['u1'] - c['u0']) * d)) + 1 + 2 * pad, int(math.ceil((c['v1'] - c['v0']) * d)) + 1 + 2 * pad))
        return out
    swkeys_used = sorted(set(int(k) for k in np.unique(kidx[swatch]))) if swatch.any() else []
    SW = 14
    lo_s, hi_s = 0.05, 1.0; best = None
    for _ in range(14):
        mid = (lo_s + hi_s) / 2; sz = sizes_for(mid) + [(SW + 2 * pad, SW + 2 * pad)] * len(swkeys_used); pos = shelf_pack(sz, N)
        if pos is None: hi_s = mid
        else: best = (mid, sz, pos); lo_s = mid
    s, sz, pos = best
    dens_chart = np.zeros(n, np.float32); uvpx = np.zeros((n, 3, 2), np.float64); cidimg = np.full(n, -1, np.int64)
    chart_of_tri = np.full(n, -1, np.int64)
    for j, ci in enumerate(keep):
        c = charts[ci]; x0, y0 = pos[j]; d = dens0 * s * cmul[j]
        for t in c['tris']:
            if swatch[t]: continue
            p = V[t]; u = p @ c['T']; v = p @ c['B']
            uvpx[t, :, 0] = x0 + pad + 0.5 + (u - c['u0']) * d; uvpx[t, :, 1] = y0 + pad + 0.5 + (c['v1'] - v) * d; dens_chart[t] = d; chart_of_tri[t] = j
    # swatch triangles: a tiny non-degenerate patch inside the swatch block of their material key
    sw_pos = {}
    for k, kk in enumerate(swkeys_used): x0, y0 = pos[len(keep) + k]; sw_pos[kk] = (x0 + pad + SW / 2.0 + 1.0, y0 + pad + SW / 2.0 + 1.0)
    for kk in swkeys_used:
        tr = np.flatnonzero(swatch & (kidx == kk)); cx, cy = sw_pos[kk]
        q = np.round(V[tr].reshape(-1, 3) * 1e4).astype(np.int64); hsh = ((q[:, 0] * 73856093) ^ (q[:, 1] * 19349663) ^ (q[:, 2] * 83492791)) & 0xFFFF
        ang = hsh / 65535.0 * 2 * math.pi * 7.0; rad = 1.5 + 1.3 * (((hsh >> 3) & 255) / 255.0)
        uvpx[tr, :, 0] = (cx + np.cos(ang) * rad).reshape(-1, 3); uvpx[tr, :, 1] = (cy + np.sin(ang) * rad).reshape(-1, 3); dens_chart[tr] = 1.0
    # raster: visible triangles only
    vis_t = np.flatnonzero(~swatch)
    tid, lam = raster(uvpx[vis_t], N); valid = tid >= 0; vi = np.flatnonzero(valid); tt = vis_t[tid[vi]]; ll = lam[vi]
    K = len(vi); P = np.einsum('ij,ijk->ik', ll, V[tt]); Nt = np.einsum('ij,ijk->ik', ll, Nn[tt]); Nt = Nt / np.maximum(np.linalg.norm(Nt, axis=1, keepdims=True), 1e-9)
    Et = np.einsum('ij,ij->i', ll, tri['E'][tt]); Mt = np.rint(np.einsum('ij,ij->i', ll, tri['M'][tt].astype(float))).astype(int); kt = kidx[tt]; nodet = tri['node'][tt]
    # distance to convex and concave hard edges of the triangle
    ed = np.full(K, 9.0, np.float32); cd = np.full(K, 9.0, np.float32)
    for sl in range(3):
        A = V[tt, sl]; B = V[tt, (sl + 1) % 3]; dd = seg_dist(P, A, B); hd = hard[tt, sl]; cv_ = convex[tt, sl]
        ed = np.where(hd & cv_, np.minimum(ed, dd), ed); cd = np.where(hd & ~cv_, np.minimum(cd, dd), cd)
    # chart coordinates (metres from the chart corner), for tread grooves
    cu = np.zeros(K, np.float32); cv = np.zeros(K, np.float32)
    ch_of = chart_of_tri[tt]
    for j in np.unique(ch_of):
        m = ch_of == j; c = charts[keep[j]]; cu[m] = P[m] @ c['T'] - c['u0']; cv[m] = P[m] @ c['B'] - c['v0']
    # ambient occlusion per texel, own part plus the static body
    ao = np.ones(K)
    for nm in np.unique(nodet):
        m = np.flatnonzero(nodet == nm); g, glo, gcell = voxel['node'](nm); ao[m] = texel_ao(P[m], Nt[m], g, glo, gcell)
    # fixings: halo and rust runs from the bolts
    halo, streak = fix_fields(P, fixes, voxel['fixgrid'], seed)
    S = dict(P=P, N=Nt, E=Et, M=Mt, kidx=kt, node=nodet, ed=ed, cd=cd, cu=cu, cv=cv, ao=ao, halo=halo, streak=streak, keys=keys, base=np.asarray(base, np.float32)[kt], kgroup=np.asarray(kgroup), cracks=cracks)
    col, hgt, rough, metal = shader(S, seed)
    # to images
    img_c = np.zeros((N * N, 3), np.float32); img_h = np.zeros(N * N, np.float32); img_o = np.zeros((N * N, 3), np.float32); img_s = np.ones(N * N, np.float32) * 0.003
    img_c[vi] = srgb(col); img_h[vi] = hgt; img_o[vi] = np.stack([np.clip(ao ** 0.9, 0, 1), rough, metal], 1); img_s[vi] = 1.0 / np.maximum(dens_chart[tt], 1.0)
    # swatches: flat patches with the mean of the material (taken from the visible texels of the same material when there are some, else a plain value)
    sw_fill = {}
    for kk in swkeys_used:
        m = kt == kk
        if m.any(): sw_fill[kk] = (img_c[vi][m].mean(0), img_o[vi][m].mean(0))
        else:
            b = np.asarray(base, np.float32)[kk]; sw_fill[kk] = (srgb(b * 0.8), np.array([0.8, 0.7, 0.4 if keys[kk] in ('bolt',) else 0.0], np.float32))
    img_c = img_c.reshape(N, N, 3); img_o = img_o.reshape(N, N, 3); img_h = img_h.reshape(N, N); img_s = img_s.reshape(N, N); vmask = valid.reshape(N, N).copy()
    # normal map from the height: image-space differences within the chart (neighbours must be valid)
    def nb(a, dy, dx): return np.roll(np.roll(a, dy, 0), dx, 1)
    vl, vr, vu, vd = nb(vmask, 0, 1), nb(vmask, 0, -1), nb(vmask, 1, 0), nb(vmask, -1, 0)
    hl, hr, hu, hd_ = nb(img_h, 0, 1), nb(img_h, 0, -1), nb(img_h, 1, 0), nb(img_h, -1, 0)
    hl = np.where(vl, hl, img_h); hr = np.where(vr, hr, img_h); hu = np.where(vu, hu, img_h); hd_ = np.where(vd, hd_, img_h)
    gx = (hr - hl) / (2 * img_s); gy = (hu - hd_) / (2 * img_s)      # slopes: along +u (columns) and up the image
    gain = spec.get('bump', 1.0); nx = -gx * gain; ny = -gy * gain; nzz = np.ones_like(nx); ln = np.sqrt(nx * nx + ny * ny + nzz * nzz)
    nrm = np.stack([nx / ln, ny / ln, nzz / ln], -1) * 0.5 + 0.5
    # fill gutters
    both = np.concatenate([img_c, nrm.astype(np.float32), img_o], -1); both, v2 = dilate(both, vmask, 2)
    for kk in swkeys_used:
        cx, cy = sw_pos[kk]; x0 = int(cx - SW / 2 - 1); y0 = int(cy - SW / 2 - 1)
        both[y0:y0 + SW + 2, x0:x0 + SW + 2, 0:3] = sw_fill[kk][0]; both[y0:y0 + SW + 2, x0:x0 + SW + 2, 3:6] = (0.5, 0.5, 1.0); both[y0:y0 + SW + 2, x0:x0 + SW + 2, 6:9] = sw_fill[kk][1]; v2[y0:y0 + SW + 2, x0:x0 + SW + 2] = True
    mean_c = both[v2][:, 0:3].mean(0) if v2.any() else np.array([0.3, 0.3, 0.3]); mean_o = both[v2][:, 6:9].mean(0) if v2.any() else np.array([1, 0.8, 0])
    both[~v2, 0:3] = mean_c; both[~v2, 3:6] = (0.5, 0.5, 1.0); both[~v2, 6:9] = mean_o
    uv = (uvpx / N).astype(np.float32)
    stats = dict(charts=len(keep), swatch_tris=int(swatch.sum()), visible_tris=int((~swatch).sum()), scale=round(s, 3), texels=K, fill=round(K / float(N * N), 3), dens=round(dens0 * s))
    return uv, dict(color=both[..., 0:3], normal=both[..., 3:6], orm=both[..., 6:9]), stats


def fix_fields(P, fixes, fixgrid, seed):
    """halo (0..1, round about a fixing) and streak (0..1, a rust run below it) per point, from a voxel grid made by make_fixgrid"""
    if fixgrid is None: return np.zeros(len(P), np.float32), np.zeros(len(P), np.float32)
    halo_g, streak_g, lo, cell = fixgrid; ix = ((P - lo) / cell).astype(int); dims = np.array(halo_g.shape); ok = (ix >= 0).all(1) & (ix < dims).all(1)
    h = np.zeros(len(P), np.float32); s = np.zeros(len(P), np.float32)
    h[ok] = halo_g[ix[ok, 0], ix[ok, 1], ix[ok, 2]] / 255.0; s[ok] = streak_g[ix[ok, 0], ix[ok, 1], ix[ok, 2]] / 255.0
    s = s * (0.45 + 0.9 * fbm(P * np.array([160, 160, 8], np.float32), seed + 99, 2))
    return h, np.clip(s, 0, 1)

def make_fixgrid(fixes, lo, hi, cell=0.004):
    """a voxel grid with a halo (a ball of 11 mm) and a rust run (down to 8 cm, thickening then thinning) for every fixing"""
    dims = np.ceil((hi - lo) / cell).astype(int) + 1; halo = np.zeros(dims, np.uint8); streak = np.zeros(dims, np.uint8)
    rng = np.random.default_rng(17)
    for p in fixes:
        c = ((np.asarray(p) - lo) / cell).astype(int); r = 3
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                for dz in range(-r, r + 1):
                    d = math.sqrt(dx * dx + dy * dy + dz * dz)
                    if d > r + 0.5: continue
                    q = c + (dx, dy, dz)
                    if (q >= 0).all() and (q < dims).all(): halo[q[0], q[1], q[2]] = max(halo[q[0], q[1], q[2]], int(255 * (1 - d / (r + 1)) ** 0.8))
        ln = int(rng.integers(10, 21)); wd = 1 + int(rng.integers(0, 2))
        for k in range(0, ln + 1):
            f = k / float(ln); w = wd + (1 if 0.2 < f < 0.8 else 0)
            for dx in range(-w, w + 1):
                for dy in range(-w, w + 1):
                    if dx * dx + dy * dy > w * w + 0.5: continue
                    q = c + (dx, dy, -k - 1)
                    if (q >= 0).all() and (q < dims).all():
                        v = int(255 * (1 - f) ** 0.7 * (1 - 0.25 * (abs(dx) + abs(dy)) / max(w, 1)))
                        streak[q[0], q[1], q[2]] = max(streak[q[0], q[1], q[2]], v)
    return halo, streak, lo, cell
