/* BLEND ROUND 1 test for blend.html (headless chromium, software GL, page served over http because the CC0 kit needs it).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/blend-test.js
   Checks: 0 console errors/warnings for A, B, C and ?post=0; world hash deterministic; pixel hash deterministic with every clock frozen
   (?freeze=3); under 150k triangles; kit layers present; ink hulls only in B; Blender rocks only in C; ?post=0 path draws a real picture. */
import crypto from 'node:crypto';
import { launch, open, noise } from './blend-lib.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const L = await launch(1200, 900);
const q = (b, extra) => '?ui=0&q=high&seed=1122&tide=0&freeze=3&blend=' + b + (extra || '');
const grab = async p => { await p.evaluate(() => { __li.setTide(0); __li.home(); }); return await p.evaluate(() => __li.shot()); };
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const info = p => p.evaluate(() => ({ ...__li.stats(), kit: __li.kit(), layers: __li.layers(), inkOn: __li.inkOn, hs: __li.hashStatic() }));

const a = await open(L, q('A'));
const ia = await info(a.page);
const bad = a.errs.filter(e => !noise(e));
ok(bad.length === 0, 'A loads with 0 console errors/warnings' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''));
ok(ia.kit === true, 'CC0 kit loaded over http');
ok(ia.tris < 150000, 'A triangle budget under 150k: ' + ia.tris);
ok(ia.layers.sprites > 20 && (ia.layers.tris.sprites | 0) > 0, 'far trees are billboard sprites: ' + ia.layers.sprites);
const t = ia.layers.tris, has = k => Object.keys(t).some(n => n.startsWith(k));
ok(has('rock-Rock_Medium') && has('tree-') && t.tussock > 0 && t.heather > 0, 'kit rocks, kit trees, tussocks and heather are instanced');
ok(!has('rock-blender') && !(t.ink > 0), 'A has no Blender rocks and no ink hulls');
const px1 = await grab(a.page);
const hs1 = ia.hs;
await a.page.close();

const a2 = await open(L, q('A'));
const hs2 = (await info(a2.page)).hs;
const px2 = await grab(a2.page);
ok(hs1 === hs2, 'world hash deterministic (' + hs1 + ')');
ok(sha(px1) === sha(px2), 'pixel hash deterministic with frozen time (' + sha(px1) + ')');
await a2.page.close();

const p0 = await open(L, q('A', '&post=0'));
const i0 = await info(p0.page);
const bad0 = p0.errs.filter(e => !noise(e));
ok(bad0.length === 0, '?post=0 (no screen-space post pass) loads with 0 console errors' + (bad0.length ? ': ' + bad0.slice(0, 3).join(' | ') : ''));
const px0 = await grab(p0.page);
ok(px0.length > 200000 && sha(px0) !== sha(px1), '?post=0 draws a real picture, different from the post path');
ok(i0.tris < 150000, '?post=0 triangles under 150k: ' + i0.tris);
await p0.page.close();

const b = await open(L, q('B'));
const ib = await info(b.page);
const badB = b.errs.filter(e => !noise(e));
ok(badB.length === 0, 'B loads with 0 console errors' + (badB.length ? ': ' + badB.slice(0, 3).join(' | ') : ''));
ok(ib.inkOn && ib.layers.tris.ink > 0, 'B adds inverted-hull ink: ' + Math.round(ib.layers.tris.ink) + ' triangles');
ok(ib.tris < 150000, 'B triangle budget under 150k: ' + ib.tris);
ok(ib.hs === hs1, 'B has the same world as A');
await b.page.close();

const c = await open(L, q('C'));
const ic = await info(c.page);
const badC = c.errs.filter(e => !noise(e));
ok(badC.length === 0, 'C loads with 0 console errors' + (badC.length ? ': ' + badC.slice(0, 3).join(' | ') : ''));
ok(Object.keys(ic.layers.tris).some(n => n.startsWith('rock-blender')), 'C uses the Blender pilot rock');
ok(ic.tris < 150000, 'C triangle budget under 150k: ' + ic.tris);
await c.page.close();
await L.close();
process.exit(fails ? 1 : 0);
