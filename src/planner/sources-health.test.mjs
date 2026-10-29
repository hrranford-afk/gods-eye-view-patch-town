import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ahahByArea, latestMonths, noiseShares, parseTiff, per1000, ym } from '../../scripts/sources/health.mjs';

/** Build a tiny float32 TIFF: 4x4 pixels, 2x2 tiles (tiled) or 2-row strips, either byte order. */
function tiff({ le, tiled }) {
  const w = 4, h = 4, px = (x, y) => y * 10 + x;
  const buf = new ArrayBuffer(1024), v = new DataView(buf);
  const u16 = (o, n) => v.setUint16(o, n, le), u32 = (o, n) => v.setUint32(o, n, le);
  u16(0, le ? 0x4949 : 0x4d4d); u16(2, 42); u32(4, 8);
  const chunks = tiled ? [[0, 0], [2, 0], [0, 2], [2, 2]] : [[0, 0], [0, 2]], cw = tiled ? 2 : 4;
  const tags = [[256, 3, 1, w], [257, 3, 1, h], [258, 3, 1, 32], [259, 3, 1, 1], [339, 3, 1, 3]];
  const dataAt = 400, offAt = 300;
  tags.push(tiled ? [322, 3, 1, 2] : [278, 3, 1, 2], ...(tiled ? [[323, 3, 1, 2]] : []), [tiled ? 324 : 273, 4, chunks.length, offAt]);
  u16(8, tags.length);
  tags.forEach(([t, ty, c, val], i) => {
    const e = 10 + i * 12;
    u16(e, t); u16(e + 2, ty); u32(e + 4, c);
    if (ty === 3) u16(e + 8, val); else u32(e + 8, val);
  });
  chunks.forEach(([x0, y0], n) => {
    u32(offAt + n * 4, dataAt + n * 16);
    for (let y = 0; y < 2; y++) for (let x = 0; x < cw; x++) v.setFloat32(dataAt + n * 16 + (y * cw + x) * 4, px(x0 + x, y0 + y), le);
  });
  return new Uint8Array(buf);
}

for (const le of [true, false]) {
  for (const tiled of [true, false]) {
    test(`parseTiff reads ${tiled ? 'tiled' : 'stripped'} ${le ? 'little' : 'big'}-endian float32`, () => {
      const img = parseTiff(tiff({ le, tiled }));
      assert.equal(img.width, 4);
      assert.equal(img.height, 4);
      assert.equal(img.data[0], 0);
      assert.equal(img.data[3], 3);
      assert.equal(img.data[2 * 4 + 1], 21);
      assert.equal(img.data[15], 33);
    });
  }
}

test('parseTiff refuses compressed data', () => {
  const t = tiff({ le: true, tiled: false });
  new DataView(t.buffer).setUint16(10 + 3 * 12 + 8, 5, true);
  assert.throws(() => parseTiff(t), /uncompressed/);
});

test('noiseShares weights homes and counts nodata as quiet', () => {
  const homes = [{ area: 'A', w: 3, db: 66 }, { area: 'A', w: 1, db: 0 }, { area: 'B', db: 56 }, { area: 'B', db: undefined }, { w: 5, db: 90 }];
  const out = noiseShares(homes, (h) => h.db, [55, 65]);
  assert.deepEqual(out.A, [0.75, 0.75]);
  assert.deepEqual(out.B, [0.5, 0]);
  assert.equal(Object.keys(out).length, 2);
});

test('latestMonths keeps the newest EPD tables', () => {
  const pkg = { result: { resources: ['EPD_202504', 'EPD_202506', 'notes', 'EPD_202505', 'EPD_202503'].map((name) => ({ name })) } };
  assert.deepEqual(latestMonths(pkg, 3), ['EPD_202504', 'EPD_202505', 'EPD_202506']);
  assert.deepEqual(latestMonths({}), []);
  assert.equal(ym('EPD_202506'), '2025-06');
});

test('per1000 averages months over list size', () => {
  assert.equal(per1000([100, 200, 300], 10000), 20);
  assert.equal(per1000([100, NaN], 1000), 100);
  assert.equal(per1000([], 1000), null);
  assert.equal(per1000([5], 0), null);
});

test('ahahByArea keeps wanted LSOAs and rounds', () => {
  const rows = [
    { lsoa21cd: 'E01', ahah: '12.34567', ahah_pct: '60', domain_h: '0.1234', domain_g: '-1', domain_e: '2', domain_r: '3' },
    { lsoa21cd: 'E02', ahah: '1', ahah_pct: '1', domain_h: '1', domain_g: '1', domain_e: '1', domain_r: '1' },
  ];
  const out = ahahByArea(rows, ['E01']);
  assert.deepEqual(Object.keys(out), ['E01']);
  assert.equal(out.E01.ahah, 12.346);
  assert.equal(out.E01.ahahGreenDomain, -1);
  assert.equal(out.E01.ahahPercentile, 60);
});
