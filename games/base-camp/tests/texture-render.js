/* Base Camp build 28: the fake room's own texture for the room-snapshot tests (posters, book spines, a rug, a patterned cushion, the plain tops of the furniture).
   Two plain functions (no closures over this file), so ar-fake.js can inject them into the page with toString() and node can call them directly.
   texFakeMake(kind, seed, w, h) -> { w, h, px: RGB bytes }: a seeded, non-repeating pattern ('rug', 'cushion', 'spines', 'poster', 'books', 'tray', 'plain').
   texFakeRender(o) -> RGBA bytes (W x H), o: { W, H, fx, fy, cx, cy, cam: camera-to-world (16, column-major, looks down -z), planes, seed }.
   A plane is { c: [3] centre, ax: [3], ay: [3] (unit, world), hw, hh (half sizes along ax / ay), tex: a texFakeMake result or null, tone: [r, g, b] }; the nearest plane
   along each pixel's ray wins (so the desk hides the rug under it). Behind everything a plain grey wall. */
function texFakeMake(kind, seed, w, h) {
  let sd = (seed >>> 0) || 1; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  const px = new Uint8ClampedArray(w * h * 3), pal = [[178, 52, 44], [36, 64, 128], [222, 196, 120], [30, 30, 34], [236, 232, 220], [64, 120, 74], [150, 90, 40], [200, 120, 150], [90, 170, 200], [120, 40, 90]];
  const col = () => pal[(rnd() * pal.length) | 0];
  const fill = (x0, y0, x1, y1, c, test) => { x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(w - 1, Math.ceil(x1)); y1 = Math.min(h - 1, Math.ceil(y1)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!test || test(x, y)) { const i = (y * w + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; } };
  const bg = kind === 'plain' ? [140, 134, 124] : kind === 'rug' ? [150, 60, 50] : kind === 'cushion' ? [230, 220, 196] : kind === 'poster' ? [236, 232, 220] : [120, 100, 80]; fill(0, 0, w - 1, h - 1, bg);
  if (kind === 'plain') return { w, h, px };
  if (kind === 'spines') { let x = 0; while (x < w) { const bw = 6 + rnd() * 18, c = col(); fill(x, rnd() * h * 0.15, x + bw - 1, h - 1, c); for (let k = 0; k < 3; k++) { const y = h * (0.2 + rnd() * 0.6), c2 = col(); fill(x + 1, y, x + bw - 2, y + 2 + rnd() * 6, c2); } x += bw + 1; } return { w, h, px }; }
  if (kind === 'rug') { const b = Math.round(Math.min(w, h) * 0.07); fill(0, 0, w - 1, b, [230, 210, 160]); fill(0, h - 1 - b, w - 1, h - 1, [230, 210, 160]); fill(0, 0, b, h - 1, [230, 210, 160]); fill(w - 1 - b, 0, w - 1, h - 1, [230, 210, 160]); }
  const n = kind === 'rug' ? 120 : kind === 'cushion' ? 70 : kind === 'poster' ? 40 : 50, sz = Math.min(w, h) * (kind === 'poster' ? 0.22 : 0.12);
  for (let k = 0; k < n; k++) {
    const x = rnd() * w, y = rnd() * h, r = sz * (0.25 + rnd()), c = col(), t = (rnd() * 4) | 0;
    if (t === 0) fill(x - r, y - r * 0.6, x + r, y + r * 0.6, c);
    else if (t === 1) fill(x - r, y - r, x + r, y + r, c, (u, v) => (u - x) ** 2 + (v - y) ** 2 < r * r);
    else if (t === 2) fill(x - r, y - r, x + r, y + r, c, (u, v) => Math.abs(u - x) + Math.abs(v - y) < r);
    else fill(x - r, y - r, x + r, y + r, c, (u, v) => { const d = (u - x) ** 2 + (v - y) ** 2; return d < r * r && d > r * r * 0.35; });
  }
  if (kind === 'poster') for (let k = 0; k < 6; k++) { const y = h * (0.7 + k * 0.045); let x = w * 0.1; while (x < w * 0.85) { const ww = 4 + rnd() * 14; fill(x, y, x + ww, y + 3, [30, 30, 34]); x += ww + 4; } }
  return { w, h, px };
}
function texFakeRender(o) {
  const W = o.W, H = o.H, out = new Uint8ClampedArray(W * H * 4), dep = new Float32Array(W * H).fill(1e9), m = o.cam, ox = m[12], oy = m[13], oz = m[14];
  let seed = (o.seed || 1) >>> 0; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < W * H; i++) { const g = 120 + ((i % W) / W) * 14; out[i * 4] = g; out[i * 4 + 1] = g * 0.98; out[i * 4 + 2] = g * 0.93; out[i * 4 + 3] = 255; }
  const toCam = (p) => { const dx = p[0] - ox, dy = p[1] - oy, dz = p[2] - oz; return [m[0] * dx + m[1] * dy + m[2] * dz, m[4] * dx + m[5] * dy + m[6] * dz, m[8] * dx + m[9] * dy + m[10] * dz]; };
  for (const P of o.planes || []) {
    const n = [P.ax[1] * P.ay[2] - P.ax[2] * P.ay[1], P.ax[2] * P.ay[0] - P.ax[0] * P.ay[2], P.ax[0] * P.ay[1] - P.ax[1] * P.ay[0]], nd = (P.c[0] - ox) * n[0] + (P.c[1] - oy) * n[1] + (P.c[2] - oz) * n[2];
    if (Math.abs(nd) < 1e-6) continue; let u0 = W, u1 = -1, v0 = H, v1 = -1, behind = 0;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [P.c[0] + P.ax[0] * a * P.hw + P.ay[0] * b * P.hh, P.c[1] + P.ax[1] * a * P.hw + P.ay[1] * b * P.hh, P.c[2] + P.ax[2] * a * P.hw + P.ay[2] * b * P.hh], c = toCam(p); if (c[2] > -0.02) { behind++; continue; } const u = o.cx + o.fx * c[0] / -c[2], v = o.cy - o.fy * c[1] / -c[2]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    if (behind === 4) continue; if (behind) { u0 = 0; v0 = 0; u1 = W - 1; v1 = H - 1; }
    u0 = Math.max(0, Math.floor(u0) - 1); v0 = Math.max(0, Math.floor(v0) - 1); u1 = Math.min(W - 1, Math.ceil(u1) + 1); v1 = Math.min(H - 1, Math.ceil(v1) + 1); if (u0 > u1 || v0 > v1) continue;
    const T = P.tex, tw = T ? T.w : 0, th = T ? T.h : 0, tp = T ? T.px : null, tone = P.tone || [140, 134, 124];
    for (let v = v0; v <= v1; v++) { const yc = -(v + 0.5 - o.cy) / o.fy;
      for (let u = u0; u <= u1; u++) {
        const xc = (u + 0.5 - o.cx) / o.fx, d0 = m[0] * xc + m[4] * yc - m[8], d1 = m[1] * xc + m[5] * yc - m[9], d2 = m[2] * xc + m[6] * yc - m[10], dn = d0 * n[0] + d1 * n[1] + d2 * n[2]; if (Math.abs(dn) < 1e-9) continue;
        const t = nd / dn, i = v * W + u; if (t <= 0 || t >= dep[i]) continue; const qx = ox + d0 * t - P.c[0], qy = oy + d1 * t - P.c[1], qz = oz + d2 * t - P.c[2], a = qx * P.ax[0] + qy * P.ax[1] + qz * P.ax[2], b = qx * P.ay[0] + qy * P.ay[1] + qz * P.ay[2];
        if (Math.abs(a) > P.hw || Math.abs(b) > P.hh) continue; dep[i] = t; let r = tone[0], g = tone[1], bl = tone[2];
        if (tp) { const fx = Math.max(0, Math.min(tw - 1.001, ((a + P.hw) / (2 * P.hw)) * tw - 0.5)), fy = Math.max(0, Math.min(th - 1.001, ((P.hh - b) / (2 * P.hh)) * th - 0.5)), x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, j = (y0 * tw + x0) * 3, j2 = j + tw * 3;
          r = (tp[j] * (1 - ax) + tp[j + 3] * ax) * (1 - ay) + (tp[j2] * (1 - ax) + tp[j2 + 3] * ax) * ay; g = (tp[j + 1] * (1 - ax) + tp[j + 4] * ax) * (1 - ay) + (tp[j2 + 1] * (1 - ax) + tp[j2 + 4] * ax) * ay; bl = (tp[j + 2] * (1 - ax) + tp[j + 5] * ax) * (1 - ay) + (tp[j2 + 2] * (1 - ax) + tp[j2 + 5] * ax) * ay; }
        out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = bl;
      } }
  }
  for (let i = 0; i < W * H; i++) { const nz = (rnd() - 0.5) * 5; out[i * 4] += nz; out[i * 4 + 1] += nz; out[i * 4 + 2] += nz; }
  return out;
}
module.exports = { texFakeMake, texFakeRender };
