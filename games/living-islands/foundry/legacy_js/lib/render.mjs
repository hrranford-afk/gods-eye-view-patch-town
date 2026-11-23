/* foundry/lib/render.mjs -- no-browser plan view, visual metrics, PNG writer, 5x7 bitmap font, contact sheet. Node built-ins only. */
import zlib from 'node:zlib';

/* ---------- PNG (RGB 8-bit) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const o = Buffer.alloc(12 + data.length); o.writeUInt32BE(data.length, 0); o.write(type, 4, 'ascii'); data.copy(o, 8); o.writeUInt32BE(crc32(o.subarray(4, 8 + data.length)), 8 + data.length); return o; }
export function encodePNG(rgb, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 1;                        /* filter: Sub */
    for (let x = 0; x < w * 3; x++) { const a = x >= 3 ? rgb[y * w * 3 + x - 3] : 0; raw[y * (w * 3 + 1) + 1 + x] = (rgb[y * w * 3 + x] - a) & 255; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- palette (muted olive / grey / navy; the target of the palette-restraint metric) */
export const PAL = { deep: [22, 34, 56], shallow: [64, 96, 108], sand: [168, 160, 130], grass: [112, 118, 68], wood: [78, 88, 54], rock: [126, 126, 120] };
export const TARGET = [PAL.deep, PAL.shallow, PAL.sand, PAL.grass, PAL.wood, PAL.rock];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
function colour(h, noise) {
  if (h <= 0) { const d = -h; return d < .25 ? mix(PAL.sand, PAL.shallow, d / .25 * .9 + .1 * 0) : mix(PAL.shallow, PAL.deep, cl((d - .25) / 4.4, 0, 1)); }
  if (h < .9) return mix(PAL.sand, PAL.grass, cl((h - .5) / .5, 0, 1));
  if (h < 3.2) return mix(PAL.grass, PAL.wood, cl((h - .9) / 2.3, 0, 1) * .7 + noise * .15);
  if (h < 6.5) return mix(PAL.wood, PAL.rock, cl((h - 3.2) / 3.3, 0, 1) * .55);
  return mix(PAL.wood, PAL.rock, cl(.55 + (h - 6.5) / 4, 0, 1));
}
/* plan render of a heightfield window (nx*nz) to W x W pixels, hill-shaded from the north-west (matches the game's sun azimuth side) */
export function plan(F, W = 240) {
  const { h, nx, nz } = F, out = new Uint8Array(W * W * 3), L = [-.55, -.6, .58]; const ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const H = (x, y) => h[cl(y, 0, nz - 1) * nx + cl(x, 0, nx - 1)];
  for (let py = 0; py < W; py++) for (let px = 0; px < W; px++) {
    const fx = (px + .5) / W * nx - .5, fy = (py + .5) / W * nz - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const hh = (H(x0, y0) * (1 - u) + H(x0 + 1, y0) * u) * (1 - v) + (H(x0, y0 + 1) * (1 - u) + H(x0 + 1, y0 + 1) * u) * v;
    const dx = (H(x0 + 1, y0) - H(x0 - 1, y0)) / 2, dy = (H(x0, y0 + 1) - H(x0, y0 - 1)) / 2;
    const k = 3.0 / F.cell * 2; let nxn = -dx * k * .35, nyn = -dy * k * .35, nzn = 1; const nl = Math.hypot(nxn, nyn, nzn); nxn /= nl; nyn /= nl; nzn /= nl;
    const sh = hh > -0.2 ? cl(.72 + .55 * (nxn * L[0] + nyn * L[1] + nzn * L[2]) - .55 * .8, .45, 1.3) : 1;
    const nz2 = ((Math.imul(px, 73856093) ^ Math.imul(py, 19349663)) >>> 0) / 4294967296;
    const c = colour(hh, nz2); const o = (py * W + px) * 3;
    for (let q = 0; q < 3; q++) out[o + q] = cl(Math.round(c[q] * (hh > -0.2 ? sh : 1)), 0, 255);
  }
  return { w: W, h: W, rgb: out };
}

/* ---------- visual metrics: cheap, no browser. They measure the image, not taste. */
export function visualMetrics(img) {
  const { w, h, rgb } = img, n = w * h, L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = (0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2]) / 255;
  let mean = 0; for (let i = 0; i < n; i++) mean += L[i]; mean /= n; let vr = 0; for (let i = 0; i < n; i++) vr += (L[i] - mean) ** 2;
  let ge = 0, edges = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x;
    const gx = (L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1]) - (L[i - w - 1] + 2 * L[i - 1] + L[i + w - 1]), gy = (L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]) - (L[i - w - 1] + 2 * L[i - w] + L[i - w + 1]);
    const g = Math.hypot(gx, gy) / 4; ge += g; if (g > 0.05) edges++; }
  /* palette restraint: mean chromaticity distance to the nearest target colour (luminance-normalised), 1 = on palette */
  const chrom = (r, g, b) => { const s = r + g + b + 1e-6; return [r / s, g / s]; };
  const tc = TARGET.map((t) => chrom(...t)); let dsum = 0; const bins = new Map();
  for (let i = 0; i < n; i += 3) { const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2], c = chrom(r, g, b); let m = 9; for (const t of tc) m = Math.min(m, Math.hypot(c[0] - t[0], c[1] - t[1])); dsum += m;
    const key = (r >> 6) * 16 + (g >> 6) * 4 + (b >> 6); bins.set(key, (bins.get(key) || 0) + 1); }
  const samples = Math.ceil(n / 3), used = [...bins.values()].filter((v) => v / samples > 0.005).length;
  return { contrast: +Math.sqrt(vr / n).toFixed(4), edge_energy: +(ge / ((w - 2) * (h - 2))).toFixed(4), edge_fraction: +(edges / ((w - 2) * (h - 2))).toFixed(4),
    palette_restraint: +Math.max(0, 1 - dsum / samples / 0.06).toFixed(4), colours_used: used, mean_luma: +mean.toFixed(4) };
}

/* ---------- 5x7 bitmap font */
const G = {
  '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00010 00100 01000 11111', '3': '11110 00001 00001 01110 00001 00001 11110',
  '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110', '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000', G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001', S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 11011 10001', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  '.': '00000 00000 00000 00000 00000 01100 01100', ':': '00000 01100 01100 00000 01100 01100 00000', '/': '00001 00010 00010 00100 01000 01000 10000', '-': '00000 00000 00000 11111 00000 00000 00000',
  '%': '11001 11010 00010 00100 01000 01011 10011', '+': '00000 00100 00100 11111 00100 00100 00000', '#': '01010 01010 11111 01010 11111 01010 01010', ' ': '00000 00000 00000 00000 00000 00000 00000'
};
export function text(img, str, x, y, col = [235, 235, 225], s = 1) {
  for (const chRaw of String(str).toUpperCase()) { const g = (G[chRaw] || G[' ']).split(' ');
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const px = x + c * s + xx, py = y + r * s + yy; if (px >= 0 && py >= 0 && px < img.w && py < img.h) { const o = (py * img.w + px) * 3; img.rgb[o] = col[0]; img.rgb[o + 1] = col[1]; img.rgb[o + 2] = col[2]; } }
    x += 6 * s; }
}
export function downscale(img, W) {
  const out = new Uint8Array(W * W * 3), f = img.w / W;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let r = 0, g = 0, b = 0, c = 0; for (let yy = Math.floor(y * f); yy < Math.floor((y + 1) * f); yy++) for (let xx = Math.floor(x * f); xx < Math.floor((x + 1) * f); xx++) { const o = (yy * img.w + xx) * 3; r += img.rgb[o]; g += img.rgb[o + 1]; b += img.rgb[o + 2]; c++; }
    const o = (y * W + x) * 3; out[o] = r / c; out[o + 1] = g / c; out[o + 2] = b / c; }
  return { w: W, h: W, rgb: out };
}
/* contact sheet: items = [{img, lines:[...]}] in a grid of `cols` */
export function sheet(items, cols = 6, thumb = 192, lineH = 9) {
  const rows = Math.ceil(items.length / cols), lines = Math.max(...items.map((i) => i.lines.length)), ch = thumb + lines * lineH + 6, pad = 4;
  const W = cols * (thumb + pad) + pad, Hh = rows * (ch + pad) + pad, out = { w: W, h: Hh, rgb: new Uint8Array(W * Hh * 3) };
  for (let i = 0; i < out.rgb.length; i += 3) { out.rgb[i] = 16; out.rgb[i + 1] = 20; out.rgb[i + 2] = 26; }
  items.forEach((it, k) => { const cx = pad + (k % cols) * (thumb + pad), cy = pad + Math.floor(k / cols) * (ch + pad), t = it.img.w === thumb ? it.img : downscale(it.img, thumb);
    for (let y = 0; y < thumb; y++) for (let x = 0; x < thumb; x++) { const o = ((cy + y) * W + cx + x) * 3, p = (y * thumb + x) * 3; out.rgb[o] = t.rgb[p]; out.rgb[o + 1] = t.rgb[p + 1]; out.rgb[o + 2] = t.rgb[p + 2]; }
    if (it.mark) for (const m of it.mark) { const px = cx + Math.round(m[0] * thumb), py = cy + Math.round(m[1] * thumb); for (let d = -3; d <= 3; d++) for (const [ax, ay] of [[d, 0], [0, d]]) { const X = px + ax, Y = py + ay; if (X >= 0 && Y >= 0 && X < W && Y < Hh) { const o = (Y * W + X) * 3; out.rgb[o] = 245; out.rgb[o + 1] = 240; out.rgb[o + 2] = 210; } } }
    it.lines.forEach((ln, r) => text(out, ln, cx + 1, cy + thumb + 3 + r * lineH, r === 0 ? [245, 240, 210] : [175, 185, 190])); });
  return out;
}
