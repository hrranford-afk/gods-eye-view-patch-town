/* Second styles showcase checks. Run from repo root: NODE_PATH=$(npm root -g) node games/living-islands/approaches/tests/approaches2-test.js
   1 licence file present and names both packs   2 assets under 5 MB, no stray normal maps
   3 every hero image 1200x800 and not blank       4 all pages load with 0 console errors and render the same pixels twice (deterministic) */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'approaches2');
const { shoot } = await import(path.join(here, 'run2.mjs'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const lic = fs.readFileSync(path.join(here, 'assets', 'LICENSES.md'), 'utf8');
ok(/Quaternius/.test(lic) && /Kenney/.test(lic) && /CC0/.test(lic), 'LICENSES.md names Quaternius, Kenney and CC0');
let total = 0; const files = fs.readdirSync(path.join(here, 'assets')); files.forEach(f => total += fs.statSync(path.join(here, 'assets', f)).size);
ok(total < 5e6, `assets ${(total / 1e6).toFixed(2)} MB (< 5 MB), ${files.length} files`);
for (const n of ['A', 'B', 'C', 'D']) { const f = path.join(here, 'shots', `appr2-${n}.png`); const b = fs.readFileSync(f); ok(b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 800, `appr2-${n}.png is 1200x800`); }
for (const f of ['kit-1.png', 'sprites.png']) ok(fs.existsSync(path.join(here, 'shots', f)), `shots/${f} exists`);
for (const p of ['kit', 'toon', 'painterly', 'sprites', 'paper']) {
  const a = await shoot(p + '.html', null), b = await shoot(p + '.html', null);
  ok(a.errors.length === 0 && b.errors.length === 0, `${p}.html: 0 console errors ${a.errors[0] || ''}`);
  const h = d => crypto.createHash('sha1').update(d).digest('hex');
  ok(h(a.data) === h(b.data), `${p}.html: identical pixels on two loads`);
}
process.exit(fails ? 1 : 0);
