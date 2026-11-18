/* tests/png.js: a tiny PNG reader and writer for the Node tests (8-bit grey or RGB/RGBA, not interlaced). Node's own zlib only. */
import zlib from 'zlib';
import fs from 'fs';
export function readGray(file) {
  const b = fs.readFileSync(file); let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len); if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error('png: only 8-bit, not interlaced'); } else if (type === 'IDAT') idat.push(data); p += 12 + len; }
  const ch = ct === 0 ? 1 : ct === 2 ? 3 : ct === 6 ? 4 : ct === 4 ? 2 : 0; if (!ch) throw new Error('png: colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * ch, cur = new Uint8Array(st), prev = new Uint8Array(st), g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], o = y * (st + 1) + 1;
    for (let i = 0; i < st; i++) { const a = i >= ch ? cur[i - ch] : 0, up = prev[i], c = i >= ch ? prev[i - ch] : 0; let v = raw[o + i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pcc = Math.abs(pp - c); v += pa <= pb && pa <= pcc ? a : pb <= pcc ? up : c; } cur[i] = v & 255; }
    for (let x = 0; x < w; x++) g[y * w + x] = ch >= 3 ? (cur[x * ch] * 77 + cur[x * ch + 1] * 150 + cur[x * ch + 2] * 29) >> 8 : cur[x * ch];
    prev.set(cur); }
  return { gray: g, w, h };
}
export function writePNG(file, data, w, h, ch) { /* ch 1 = grey, 3 = RGB */
  const st = w * ch, raw = Buffer.alloc((st + 1) * h); for (let y = 0; y < h; y++) { raw[y * (st + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * st, st).copy(raw, y * (st + 1) + 1); }
  const chunk = (type, d) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length, 0); o.write(type, 4, 'ascii'); d.copy(o, 8); o.writeUInt32BE(zlib.crc32(o.subarray(4, 8 + d.length)) >>> 0, 8 + d.length); return o; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = ch === 1 ? 0 : 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]));
}
