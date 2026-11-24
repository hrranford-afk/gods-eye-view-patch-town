/* LIFE tests (Living Islands, LIFE_VIEW.md). Headless chromium, software GL, file:// pages.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/life-test.js [quick=1]   (quick: 3 worlds instead of 12)
   Checks: life.json files (12 worlds, under 200 KB in total, the exporter reproduces them); the default page is unchanged (hash 8d962c0c, 88,790 triangles, no life API, no extra scripts);
   for every world with &life=1: 0 console errors in default, ?q=low and ?post=0; triangles of the animals under the tier allowance (desk 25k, low = handheld low 9k) at the home view and at close views,
   the whole scene under 150k at high; determinism (hash of every placement is the same on reload and with other clocks); no animal below the water, on a cliff or above the sky (seals, colony birds,
   puffins, kelp, fish, gannets through a whole dive, robots); the disturbance API (seals leave and return; the camera and a boat make them slip away); robots (1 to 3, on the ground, routine, prints). */
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const quick = process.argv.includes('quick=1');
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const list = quick ? idx.filter(w => [153, 99, 2].includes(w.seed)) : idx;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
/* ---- 1 files */
let tot = 0, have = 0; for (const w of idx) { const p = path.join(ROOT, 'landform/worlds/seed' + String(w.seed).padStart(4, '0')); if (fs.existsSync(p + '/life.json') && fs.existsSync(p + '/life.js')) { have++; tot += fs.statSync(p + '/life.json').size; } }
ok(have === 12, 'a life.json and life.js exist for all 12 worlds (' + have + ')');
ok(tot < 200000, 'the 12 life.json files are ' + tot + ' bytes in total (limit 200,000)');
for (const w of idx) { const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed' + String(w.seed).padStart(4, '0') + '/life.json'), 'utf8'));
  const bad = []; if (!L.seals.length) bad.push('no seal site'); if (!L.robots.length || L.robots.filter(r => r.use).length < 1 || L.robots.filter(r => r.use).length > 3) bad.push('robots use 1..3'); if (!L.kelp.length) bad.push('no kelp'); if (!L.shoals.length) bad.push('no shoal');
  if (L.robots.some(r => !['cleaner', 'scout', 'hauler', 'sorter', 'maintainer', 'planter'].includes(r.role))) bad.push('role');
  ok(bad.length === 0, 'life.json of world ' + w.seed + ': ' + L.seals.length + ' seal sites (' + L.seals.map(s => s.n).join(','), ') colonies ' + L.colonies.length + ', puffin sites ' + L.puffins.length + ', kelp ' + L.kelp.length + ', shoals ' + L.shoals.length + ', robots ' + L.robots.filter(r => r.use).length + (bad.length ? ' | ' + bad.join(',') : '')); }
if (!quick) { const ex = spawnSync('python3', [path.join(ROOT, 'landform/export_life.py'), 'check'], { encoding: 'utf8' });
  ok(ex.status === 0 && (ex.stdout.match(/^SAME/gm) || []).length === 12, 're-running export_life.py reproduces all 12 life.json files byte for byte (' + (ex.stdout.match(/^SAME/gm) || []).length + ' SAME)'); }
/* ---- 2 default page unchanged */
const { browser, ctx } = await launch();
async function open(qs, wait) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !noise(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + qs);
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  if (wait) await page.waitForFunction(() => !__li.life || !__li.life.robots || __li.life.robots.count() === 0 || __li.life.robots.loaded(), null, { timeout: 300000 });
  return { page, errs };
}
{ const { page, errs } = await open('?ui=0&q=high&seed=1122'); const r = await page.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris, life: __li.life, scripts: [...document.scripts].map(s => s.src).filter(s => /animals|robots|GLTF|collector_live/.test(s)).length }));
  ok(errs.length === 0 && r.h === '8d962c0c' && r.t === 88790 && !r.life && r.scripts === 0, 'default page unchanged: hash ' + r.h + ', ' + r.t + ' triangles, no life API, no life scripts loaded'); await page.close(); }
{ const { page, errs } = await open('?world=153&ui=0'); const r = await page.evaluate(() => ({ life: __li.life, scripts: [...document.scripts].map(s => s.src).filter(s => /animals|robots|GLTF|collector_live/.test(s)).length, t: __li.stats().tris }));
  ok(errs.length === 0 && !r.life && r.scripts === 0, 'world page without &life=1 has no life layer (' + r.t + ' triangles)'); await page.close(); }
/* ---- 3 each world */
const ALLOW = { high: 25000, low: 9000 };
const hashes = {};
for (const w of list) {
  const bad = []; let o = {};
  for (const mode of ['', '&q=low', '&post=0']) {
    const { page, errs } = await open('?world=' + w.seed + '&life=1&ui=0&seat=3&tide=0.15' + mode, mode !== '&post=0');
    if (errs.length) bad.push(mode + ': ' + errs[0]);
    if (mode === '' || mode === '&q=low') {
      const q = mode === '' ? 'high' : 'low';
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const L = __li.life, out = { tier: L.tier, budget: L.budget(), counts: L.counts(), scene: __li.stats().tris, robotsTris: L.robots.tris(), nrobots: L.robots.count(), hash: L.hash(), views: [] };
        const sites = L.sites().sort((a, b) => b.slots - a.slots);
        const spots = [[0, 0, 390]].concat(sites.slice(0, 2).map(s => [s.x, s.z, 40])).concat(L.birds().colony.slice(0, 1).map(b => [b.x, b.z, 40])).concat(L.kelp().slice(0, 1).map(b => [b.x, b.z, 40]));
        for (const [x, z, d] of spots) { __li.setView({ tx: x, tz: z, dist: d, phi: .7, theta: .5 }); L.advance(.3); out.views.push(L.drawnTris()); }
        __li.home(); L.advance(.3); out.views.push(L.drawnTris());
        return out; });
      const mx = Math.max(...r.views);
      ok(mx <= ALLOW[q] && r.budget.total <= ALLOW[q], 'world ' + w.seed + ' ' + q + ' tier ' + r.tier + ': animals draw at most ' + mx + ' triangles over ' + r.views.length + ' views (allowance ' + ALLOW[q] + '), capacity ' + r.budget.total + '; counts ' + JSON.stringify(r.counts));
      if (mode === '') { o = r; ok(r.scene < 150000, 'world ' + w.seed + ' high: whole scene ' + r.scene + ' triangles with life (robots ' + r.robotsTris + ', ' + r.nrobots + ' robots), under 150k'); hashes[w.seed] = r.hash; }
      else ok(r.scene < o.scene, 'world ' + w.seed + ' low scene is smaller than high (' + r.scene + ' vs ' + o.scene + ')');
    }
    await page.close();
  }
  ok(bad.length === 0, 'world ' + w.seed + ': 0 console errors with &life=1 in default, ?q=low, ?post=0' + (bad.length ? ' | ' + bad.join(' | ') : ''));
}
/* ---- 3b the other two tiers by option (&tier=hhhi, &tier=ar) */
for (const [tier, allow] of [['hhhi', 15000], ['ar', 6000]]) {
  const { page, errs } = await open('?world=' + list[0].seed + '&life=1&ui=0&seat=3&tide=0.15&tier=' + tier, false);
  const r = await page.evaluate(() => { const L = __li.life, o = { tier: L.tier, b: L.budget(), views: [] }; const sites = L.sites().sort((a, b) => b.slots - a.slots);
    for (const [x, z, d] of [[0, 0, 390], [sites[0].x, sites[0].z, 40], [L.birds().colony.length ? L.birds().colony[0].x : 0, L.birds().colony.length ? L.birds().colony[0].z : 0, 40]]) { __li.setView({ tx: x, tz: z, dist: d, phi: .7, theta: .5 }); L.advance(.3); o.views.push(L.drawnTris()); } return o; });
  ok(errs.length === 0 && r.tier === tier && r.b.total <= allow && Math.max(...r.views) <= allow, 'tier ' + tier + ' (&tier=' + tier + ') on world ' + list[0].seed + ': animals draw at most ' + Math.max(...r.views) + ' triangles (allowance ' + allow + '), capacity ' + r.b.total + ', 0 errors'); await page.close(); }
/* ---- 4 determinism: same hash on reload and with other clocks; different worlds differ */
for (const seed of (quick ? [153] : [153, 99, 2])) { const a = await open('?world=' + seed + '&life=1&ui=0&seat=1'); const b = await open('?world=' + seed + '&life=1&ui=0&seat=77&auto=1'); await b.page.waitForTimeout(2500);
  const ha = await a.page.evaluate(() => __li.life.hash()), hb = await b.page.evaluate(() => __li.life.hash()); ok(ha === hashes[seed] && hb === hashes[seed], 'world ' + seed + ' life placement hash is the same on reload and with other clocks (' + ha + ', ' + hb + ', first run ' + hashes[seed] + ')'); await a.page.close(); await b.page.close(); }
ok(new Set(Object.values(hashes)).size === Object.keys(hashes).length, 'the worlds have different life hashes: ' + Object.values(hashes).join(' '));
/* ---- 5 placement sanity: nothing below the water, on a cliff or above the sky, in four worlds (all in quick mode) */
for (const w of (quick ? list : list.filter(w => [153, 147, 99, 5].includes(w.seed)))) {
  const { page } = await open('?world=' + w.seed + '&life=1&ui=0&seat=3&tide=0.15', true);
  const r = await page.evaluate(() => { const L = __li.life, H = __li.H, tide = 0.15, out = { seals: 0, sealsBad: 0, birds: 0, birdsBad: 0, kelp: 0, kelpBad: 0, fish: 0, fishBad: 0, gan: 0, ganBad: 0, ganMinY: 99, ganMaxY: -99, dives: 0, splashes: 0, robots: [], robotBad: 0 };
    for (const s of L.seals()) { out.seals++; const h = H(s.x, s.z); if (s.away < .01 && (s.y > h + .35 || s.y < h - .5 || s.y < tide - .15)) out.sealsBad++; }
    const b = L.birds(); for (const p of b.colony.concat(b.puffins)) { out.birds++; const h = H(p.x, p.z); if (Math.abs(p.y - h) > .05 || h < 1.1) out.birdsBad++; }
    for (const k of L.kelp()) { out.kelp++; if (Math.abs(H(k.x, k.z) - k.bed) > .01 || k.bed > tide - .35) out.kelpBad++; }
    L.advance(.2); for (const f of L.fish()) { out.fish++; const h = H(f[0], f[2]); if (f[1] > tide - .3 || f[1] < h + .45 || !isFinite(f[1])) out.fishBad++; }
    for (let k = 0; k < L.counts().gannets; k++) { const d = L.gannetDive(k); let sp = false, dived = false; for (let t = d.start; t < d.start + 2 * d.P; t += .25) { const g = L.gannetAt(k, t); out.gan++; out.ganMinY = Math.min(out.ganMinY, g.y); out.ganMaxY = Math.max(out.ganMaxY, g.y); if (!isFinite(g.x + g.y + g.z) || g.y < tide - 2.3 || g.y > 45 || Math.hypot(g.x, g.z) > 150) out.ganBad++; if (g.splash >= 0) sp = true; if (g.fold > .9) dived = true; } if (sp) out.splashes++; if (dived) out.dives++; }
    for (const r of L.robots.list()) { const sl = (() => { const e = .5; return Math.hypot(H(r.x + e, r.z) - H(r.x - e, r.z), H(r.x, r.z + e) - H(r.x, r.z - e)) / (2 * e); })(); out.robots.push([r.role, +r.ground.toFixed(2), +sl.toFixed(2), r.beach]); const pon = r.kind === 'pontoon' && !r.beached; if (pon ? (r.ground > tide - .5 || Math.abs(r.y - tide) > .6) : (r.ground < tide + .15 || sl > .62 || (r.y !== null && Math.abs(r.y - r.ground) > .5))) out.robotBad++;   /* a pontoon floats on the water (see robots-world-test.js) */ }
    return out; });
  ok(r.sealsBad === 0 && r.birdsBad === 0 && r.kelpBad === 0 && r.fishBad === 0 && r.ganBad === 0 && r.robotBad === 0,
    'world ' + w.seed + ' placement: ' + r.seals + ' seals, ' + r.birds + ' perched birds, ' + r.kelp + ' kelp, ' + r.fish + ' fish, ' + r.gan + ' gannet samples (y ' + r.ganMinY.toFixed(1) + '..' + r.ganMaxY.toFixed(1) + '), robots ' + JSON.stringify(r.robots) + ' | bad ' + JSON.stringify({ s: r.sealsBad, b: r.birdsBad, k: r.kelpBad, f: r.fishBad, g: r.ganBad, r: r.robotBad }));
  ok(r.dives >= 1 && r.splashes >= 1, 'world ' + w.seed + ' gannets dive (' + r.dives + ' with folded wings, ' + r.splashes + ' with a splash) over two cycles');
  await page.close(); }
/* ---- 6 the disturbance API, the camera and a boat */
{ const { page } = await open('?world=153&life=1&ui=0&seat=3&tide=0.15&q=low', true);
  /* baseline: a few seconds so the seals the page's own sailing boat keeps scared have already gone (boats scare seals too) */
  const r = await page.evaluate(() => { const L = __li.life, o = {}; L.advance(5); o.n0 = L.sealsVisible(); o.base = L.seals().map(s => +s.away.toFixed(2)); o.sites = L.sites().map(s => [s.id, s.slots, s.visible]);
    L.setDisturbance(0, 0.9); L.advance(1.5); o.mid = L.sites()[0].visible; L.advance(6); o.gone = L.sites()[0].visible; o.goneFlag = L.sites()[0].gone; o.others = L.sealsVisible() - L.sites()[0].visible;
    L.setDisturbance(0, 0.1); L.advance(30); o.back = L.sites()[0].visible; o.backAll = L.sealsVisible();
    L.setDisturbance('all', 1); L.advance(8); o.allGone = L.sealsVisible(); L.setDisturbance('all', 0); L.advance(30); o.allBack = L.sealsVisible(); return o; });
  ok(r.n0 > 0 && r.mid <= r.sites[0][2] && r.gone === 0 && r.goneFlag === true && r.others > 0, 'setDisturbance(0, 0.9): site 0 seals slide off (' + r.sites[0][2] + ' -> ' + r.mid + ' -> ' + r.gone + ') while the others stay (' + r.others + ' visible)');
  ok(r.backAll === r.n0 && r.back > 0, 'setDisturbance(0, 0.1): they come back (site 0 ' + r.back + ', all sites ' + r.backAll + ' of ' + r.n0 + ' before)');
  ok(r.allGone === 0 && r.allBack === r.n0, "setDisturbance('all', 1) clears every haul-out (" + r.allGone + ") and 0 brings them all back (" + r.allBack + ' of ' + r.n0 + ')');
  /* the camera: put the eye a few metres above a seal (real frames, so the camera really moves), then take it away */
  const s0 = await page.evaluate(() => { const L = __li.life, all = L.seals(), idx = all.findIndex(s => s.away < .01); const s = all[idx]; __li.setView({ tx: s.x, tz: s.z, dist: 9, phi: 1.45, theta: .5 }); return { idx, x: s.x, z: s.z, flee: L.fleeM }; });
  await page.waitForTimeout(2500); await page.evaluate(() => __li.life.advance(4));
  const cam = await page.evaluate(s0 => __li.life.seals().map(s => ({ d: Math.hypot(s.x - s0.x, s.z - s0.z), a: +s.away.toFixed(2) })), s0);
  await page.evaluate(() => __li.home()); await page.waitForTimeout(2500); await page.evaluate(() => __li.life.advance(40));
  const camBack = await page.evaluate(() => __li.life.seals().map(s => +s.away.toFixed(2)));
  const nearAll = cam.filter(c => c.d < 8).every(c => c.a > .9), farStay = cam.filter(c => c.d > 25 && r.base[cam.indexOf(c)] < .02).every(c => c.a < .5);
  ok(cam[s0.idx].a > .9 && nearAll && farStay && camBack.every((a, i) => Math.abs(a - r.base[i]) < .02), 'the camera within ' + s0.flee + ' m makes the seals under it leave (' + cam.filter(c => c.d < 12).map(c => c.a).join(',') + ') and the ones 25 m away stay (' + cam.filter(c => c.d > 25).length + ' checked); all return to where they were when it goes (' + camBack.filter((a, i) => Math.abs(a - r.base[i]) >= .02).length + ' differ from the baseline)'); await page.close(); }
/* ---- 7 robots: routine, prints, recipe tint, determinism of the sites */
{ const { page } = await open('?world=62&life=1&ui=0&seat=3&tide=0.15', true);
  const r = await page.evaluate(() => { const L = __li.life, R = L.robots, o = { n: R.count() }; o.roles = R.list().map(x => x.role + '/' + x.palette);
    const seen = new Set(); let prints = 0, clips = new Set(), maxMove = 0; let x0 = R.list()[0].x, z0 = R.list()[0].z;
    for (let t = 0; t < 140; t += 1) { L.setTime(t); const q = R.list()[0]; if (q.clip) clips.add(q.clip); maxMove = Math.max(maxMove, Math.hypot(q.x - x0, q.z - z0)); }
    L.setTime(null); o.clips = [...clips]; o.maxMove = maxMove; o.stamps = R.list()[0].stamps; o.prints = R.prints()[0]; R.forceSun(true);
    for (let t = 0; t < 140; t += 1) { L.setTime(t + 200); const q = R.list()[0]; if (q.clip) clips.add(q.clip); } o.clips2 = [...clips]; return o; });
  ok(r.n >= 1 && r.n <= 3 && r.maxMove > 2, 'robots: ' + r.n + ' on world 62 (' + r.roles.join(', ') + '), the first one drives ' + r.maxMove.toFixed(1) + ' m along the beach in a 140 s sweep');
  ok(['arm_unfold', 'arm_stow', 'head_tilt'].every(c => r.clips.includes(c)) && r.clips2.includes('sun_open'), 'routine plays the committed clips: ' + r.clips2.join(', '));
  ok(r.stamps > 5 && r.prints > 5, 'track prints are stamped behind the driving robot (' + r.stamps + ' stamps, ' + r.prints + ' quads on the ring)'); await page.close(); }
/* ---- 8 the full stack still fits */
{ const { page, errs } = await open('?world=153&life=1&ui=0&flow=1&seabed=1&weather=auto&macro=1&boats=2', true); const t = await page.evaluate(() => __li.stats().tris); ok(errs.length === 0 && t < 150000, 'world + life + flow + seabed + weather + macro + boats=2: ' + t + ' triangles, ' + errs.length + ' errors' + (errs.length ? ' | ' + errs[0] : '')); await page.close(); }
await browser.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
