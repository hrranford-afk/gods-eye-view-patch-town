/* Base Camp build 27: the fake camera picture for the sticker tests. One plain function (no closures over this file), so ar-fake.js can inject it
   into the page with toString() and node can call it directly.
   o: { W, H, fx, fy, cx, cy, cam: camera-to-world matrix (16, column-major, camera looks down -z), marks: [{ x, y, z, ax: [3], ay: [3], size, bits }], ss, seed }
   A mark is a printed 4x4 ArUco sticker: size is the black square's side (metres), ax / ay its right / up directions (unit, world), bits the 16 code bits
   (row 0 at the top, '1' = white). Around the black square is white paper (one cell wide), beyond it the grey room.
   Returns RGBA bytes (W x H). Pixels are sampled ss x ss times (anti-aliased edges, like a real lens). */
module.exports = function stkFakeRender(o) {
  const W = o.W, H = o.H, ss = o.ss || 3, out = o.base || new Uint8ClampedArray(W * H * 4), m = o.cam; /* build 28: o.base, a picture of the room (texture-render.js) to draw the stickers on */
  let seed = (o.seed || 1) >>> 0; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  if (!o.base) for (let i = 0; i < W * H; i++) { const g = 132 + ((i % W) / W) * 18 + (rnd() - 0.5) * 8; out[i * 4] = g; out[i * 4 + 1] = g * 0.97; out[i * 4 + 2] = g * 0.9; out[i * 4 + 3] = 255; }
  const ox = m[12], oy = m[13], oz = m[14];
  const toCam = (p) => { const dx = p[0] - ox, dy = p[1] - oy, dz = p[2] - oz; return [m[0] * dx + m[1] * dy + m[2] * dz, m[4] * dx + m[5] * dy + m[6] * dz, m[8] * dx + m[9] * dy + m[10] * dz]; };
  for (const k of o.marks || []) {
    const S = k.size, cell = S / 6, half = S / 2 + cell, n = [k.ax[1] * k.ay[2] - k.ax[2] * k.ay[1], k.ax[2] * k.ay[0] - k.ax[0] * k.ay[2], k.ax[0] * k.ay[1] - k.ax[1] * k.ay[0]];
    if ((ox - k.x) * n[0] + (oy - k.y) * n[1] + (oz - k.z) * n[2] <= 0) continue; /* seen from behind */
    let u0 = W, u1 = -1, v0 = H, v1 = -1, behind = false;
    for (const [a, b] of [[-half, -half], [half, -half], [half, half], [-half, half]]) {
      const p = [k.x + k.ax[0] * a + k.ay[0] * b, k.y + k.ax[1] * a + k.ay[1] * b, k.z + k.ax[2] * a + k.ay[2] * b], c = toCam(p); if (c[2] > -0.02) { behind = true; break; }
      const u = o.cx + o.fx * c[0] / -c[2], v = o.cy - o.fy * c[1] / -c[2]; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    if (behind) continue; u0 = Math.max(0, Math.floor(u0) - 1); v0 = Math.max(0, Math.floor(v0) - 1); u1 = Math.min(W - 1, Math.ceil(u1) + 1); v1 = Math.min(H - 1, Math.ceil(v1) + 1);
    const nd = (k.x - ox) * n[0] + (k.y - oy) * n[1] + (k.z - oz) * n[2];
    for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) {
      let acc = 0, hit = 0;
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const xc = (u + (sx + 0.5) / ss - o.cx) / o.fx, yc = -(v + (sy + 0.5) / ss - o.cy) / o.fy;
        const d = [m[0] * xc + m[4] * yc - m[8], m[1] * xc + m[5] * yc - m[9], m[2] * xc + m[6] * yc - m[10]], dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; if (Math.abs(dn) < 1e-9) continue;
        const t = nd / dn; if (t <= 0) continue; const q = [ox + d[0] * t - k.x, oy + d[1] * t - k.y, oz + d[2] * t - k.z], a = q[0] * k.ax[0] + q[1] * k.ax[1] + q[2] * k.ax[2], b = q[0] * k.ay[0] + q[1] * k.ay[1] + q[2] * k.ay[2];
        if (Math.abs(a) > half || Math.abs(b) > half) continue; hit++;
        if (Math.abs(a) >= S / 2 || Math.abs(b) >= S / 2) { acc += 236; continue; }
        const col = Math.floor((a + S / 2) / cell), row = Math.floor((S / 2 - b) / cell);
        acc += (row === 0 || row === 5 || col === 0 || col === 5) ? 22 : (k.bits[(row - 1) * 4 + (col - 1)] === '1' ? 236 : 22);
      }
      if (!hit) continue; const i = (v * W + u) * 4, f = hit / (ss * ss), g = acc / hit, nz = (rnd() - 0.5) * 6;
      for (let c = 0; c < 3; c++) out[i + c] = out[i + c] * (1 - f) + (g + nz) * f;
    }
  }
  return out;
};
