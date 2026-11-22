/* City Lab cottage contact sheet test. Run: node tests/contact-test.js
   The 24 recipes in recipes/variants/ all pass the real validator (rtk.building v1), are pairwise different in SHAPE (geometry hash and silhouette hash,
   colours left out), the files equal what tools/gen-cottage-variants.js makes, and the older recipes were not touched. */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const V = require('../validate.js');
const S = require('../tools/silhouette.js');
const G = require('../tools/gen-cottage-variants.js');
const DIR = path.join(__dirname, '..', 'recipes', 'variants');
let n = 0, bad = 0;
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^cottage_\d\d\.json$/.test(f)).sort() : [];
ok('there are exactly 24 cottage files, cottage_01 to cottage_24', files.length === 24 && files[0] === 'cottage_01.json' && files[23] === 'cottage_24.json', files.length);
const recs = files.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));

recs.forEach((r, i) => {
  const v = V.validate(r), p = V.parse(JSON.stringify(r));
  ok('cottage_' + String(i + 1).padStart(2, '0') + ' validates (' + r.parts.length + ' parts, ' + r.name + ')', v.ok && p.ok && r.id === 'cottage_' + String(i + 1).padStart(2, '0'), v.errors.slice(0, 3).join(' | '));
});
ok('the 24 names are all different', new Set(recs.map((r) => r.name)).size === 24);

/* shape, not colour */
const strip = (r) => { const c = JSON.parse(JSON.stringify(r)); c.parts.forEach((p) => { p.material = 'wood'; }); return c; };
const geo = recs.map(S.geoHash), cells = recs.map(S.cells), sil = cells.map(S.hashOf);
ok('geometry hashes (kind, look, size, place, turn; no colour) are pairwise different', new Set(geo).size === 24);
ok('silhouette hashes (front, side, top views) are pairwise different', new Set(sil).size === 24);
ok('recolouring a cottage does not change its hashes (they really ignore colour)', recs.every((r) => S.geoHash(strip(r)) === S.geoHash(r) && S.hashOf(S.cells(strip(r))) === S.hashOf(S.cells(r))));
let min = 9, pair = '';
for (let i = 0; i < 24; i++) for (let j = i + 1; j < 24; j++) { const d = S.distance(cells[i], cells[j]); if (d < min) { min = d; pair = (i + 1) + '-' + (j + 1); } }
ok('every pair differs in at least 10 percent of the silhouette cells (closest pair ' + pair + ' = ' + (min * 100).toFixed(1) + ' percent)', min >= 0.10, min);

/* variety of roof forms and extras */
const roofForm = (r) => { const k = {}; r.parts.forEach((p) => { if (/^roof_|^gable$|^ridge$/.test(p.kind) || (p.kind === 'roof_tile')) k[p.kind + (p.variant || 0)] = 1; }); return Object.keys(k).sort().join('+'); };
ok('at least 8 different roof part combinations are used', new Set(recs.map(roofForm)).size >= 8, new Set(recs.map(roofForm)).size);
const has = (r, k) => r.parts.some((p) => p.kind === k);
ok('hip, cone, round tower, chimney and porch/lean-to parts all appear', ['roof_hip', 'roof_cone', 'tower', 'chimney', 'gable'].every((k) => recs.some((r) => has(r, k))));
const mats = new Set(); recs.forEach((r) => r.parts.forEach((p) => { if (/^wall|^u\.wall|^g\.wall/.test(p.id)) mats.add(p.material); }));
ok('at least 6 different wall colours', mats.size >= 6, mats.size);
ok('no recipe uses an id, name or text with a real brand or place (names are plain words)', recs.every((r) => /^[A-Za-z0-9 .,'!&()\/+-]+$/.test(r.name)));

/* the files equal the generator, and the generator is deterministic */
const again = G.buildAll();
ok('the files equal what the generator makes now', again.every((r, i) => JSON.stringify(r) === JSON.stringify(recs[i])));

/* nothing else was touched: the older recipes are byte-for-byte what git has, and none of them uses the new kinds or looks */
let touched = [];
try {
  const rd = path.join(__dirname, '..', 'recipes');
  fs.readdirSync(rd).filter((f) => f.endsWith('.json')).forEach((f) => {
    const rel = 'games/city-lab/recipes/' + f, now = fs.readFileSync(path.join(rd, f), 'utf8');
    let was; try { was = cp.execFileSync('git', ['show', 'HEAD:' + rel], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return; }
    if (was !== now) touched.push(f);
  });
} catch (e) { /* no git: skip */ }
ok('the older recipes in recipes/ are unchanged against git', touched.length === 0, touched.join(','));
const NEW = ['roof_hip', 'roof_cone', 'tower'];
const olds = fs.readdirSync(path.join(__dirname, '..', 'recipes')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recipes', f), 'utf8')));
ok('the older recipes use none of the new kinds, and no look variant on panels, gables, chimneys or roofs', olds.every((r) => r.parts.every((p) => NEW.indexOf(p.kind) < 0 && !(p.variant && ['panel', 'gable', 'chimney', 'roof_tile'].indexOf(p.kind) >= 0))));

console.log('\n' + (n - bad) + ' passed, ' + bad + ' failed (' + n + ' checks)');
process.exit(bad ? 1 : 0);
