/* CAMP PAGE TEST (headless chromium, software GL): the camp start on the real page.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/camp-page-test.js [quick=1]   (quick=1 skips the look-test child run)
   Checks: 0 console errors on the default table (high, q=low, post=0, AR) and on a world page; no cottages, no village jetty, no moored harbour boats; the kit pieces and robots appear and stand on the
   ground; robots enter their bays at dusk (&clock=1); the same seed gives the same plan; a failed GLB falls back to simple shapes with 0 errors; the layers combine (boatkit, repair, clock, light, moods);
   the default page without start=camp is unchanged (tests/look-test.js: hash 8d962c0c, 88,790 triangles). */
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch();
async function open(qs, wait = true) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (wait) await p.waitForFunction(() => __li.campstart && __li.campstart.rt() && __li.campstart.rt().ready(), null, { timeout: 180000 }).catch(() => { });
  return { p, errs };
}
const info = p => p.evaluate(() => { const c = __li.campstart, rt = c.rt(); return { village: c.village(), kit: rt.kit(), robots: rt.robots(), counts: rt.counts(), hud: rt.hud(), stat: rt.stat(), notes: c.notes(), hash: c.hash(), tris: __li.stats().tris, hashPage: __li.hash(), yard: rt.yard(), plan: c.plan() }; });
const B = '?ui=0&seed=1122&start=camp';
/* ---- default table, high ---- */
let { p, errs } = await open(B + '&q=high');
ok(errs.length === 0, 'start=camp high: 0 console errors/warnings' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : ''));
let a = await info(p);
ok(a.village.houses === 0 && !a.village.jetty && a.village.moored === 0, 'no cottages, no village jetty, no moored harbour boats (' + JSON.stringify(a.village) + ')');
ok(await p.evaluate(() => __li.counts().houses === 0 && __li.houses() === 0), 'the page reports 0 houses');
ok(a.kit.length === 7 && a.counts.robots === 3 && a.stat.glb === 'ok' && a.stat.botsLoaded === 3, 'seven kit pieces (live and far GLBs) and three robots loaded: ' + a.kit.map(k => k.kind).join(','));
ok(a.hud === 'Camp: day one  ·  kit pieces 7  ·  robots 3  ·  in yard now ' + a.counts.inYard && /Camp: day one/.test(await p.evaluate(() => document.getElementById('campChip').textContent)), 'the HUD reads: ' + a.hud);
const groundOK = await p.evaluate(() => { const rt = __li.campstart.rt(); return rt.kit().filter(k => k.kind !== 'wrecked_jetty').every(k => { const h = __li.H(k.cx, k.cz); return k.kind === 'relic_hull' ? (h - k.y) > .3 && (h - k.y) < .6 : Math.abs(h - k.y) < .08; }); });
ok(groundOK, 'kit pieces sit on the ground (footprint centre height within 8 cm; the hull half buried)');
ok(a.robots.every(r => r.ready && Math.abs(r.y - r.ground) < .35), 'robots stand on the ground (' + a.robots.map(r => (r.y - r.ground).toFixed(2)).join(' ') + ')');
ok(new Set(a.robots.map(r => r.bay)).size === 3, 'one bay each (' + a.robots.map(r => r.bay).join(',') + ')');
ok(a.robots.every(r => r.lamp === 'amber' || r.lamp === 'green' || r.lamp === 'dim'), 'lamp codes are amber, green or dim: ' + a.robots.map(r => r.lamp).join(','));
/* the routine on the page: work the shore, leave tracks, return at dusk, rain */
await p.evaluate(() => { const c = __li.campstart.rt(); c.force({ rain: false, night: false }); c.advance(100); });
let b = await info(p);
ok(b.robots.some(r => r.state !== 'bay') && b.robots.some(r => r.prints > 0), 'by day robots are out on the shore and leave prints (' + b.robots.map(r => r.state + '/' + r.prints).join(' ') + ')');
const tide = await p.evaluate(() => { const c = __li.campstart.rt(); const before = c.erased(); __li.setTide(1.1); return new Promise(res => setTimeout(() => res({ before, after: c.erased(), left: c.robots().map(r => r.prints) }), 800)); });
ok(tide.after > tide.before || tide.left.every(n => n === 0), 'a rising tide erases prints (erased ' + tide.before + ' -> ' + tide.after + ')');
await p.evaluate(() => { __li.setTide(0); const c = __li.campstart.rt(); c.force({ night: true }); c.advance(260); });
b = await info(p);
ok(b.robots.every(r => r.state === 'bay') && b.counts.inYard === 3, 'at dusk every robot is in its bay and in the yard (' + b.robots.map(r => r.state).join(',') + ', in yard ' + b.counts.inYard + ')');
ok(b.robots.every(r => r.lamp === 'green' || r.lamp === 'dim'), 'parked lamps: green when charged, dim when low (' + b.robots.map(r => r.lamp).join(',') + ')');
await p.evaluate(() => { const c = __li.campstart.rt(); c.force({ night: false, rain: true }); c.advance(10); });
await p.evaluate(() => { const c = __li.campstart.rt(); c.force({ night: false, rain: false }); c.advance(200); });
b = await info(p);
ok(b.robots.some(r => r.state !== 'bay'), 'robots leave again once it is day and dry (' + b.robots.map(r => r.state).join(',') + ')');
ok(b.tris > 100000 && b.tris < 150000, 'triangles under the 150k budget at high: ' + b.tris);
const lod = await p.evaluate(() => { const rt = __li.campstart.rt(); rt.forceLod('far'); const far = __li.stats().tris; rt.forceLod('live'); const live = __li.stats().tris; rt.forceLod(null); return { far, live }; });
ok(lod.live > lod.far, 'far level of detail is cheaper than live (' + lod.far + ' vs ' + lod.live + ')');
const camLod = await p.evaluate(() => { __li.setView({ tx: 0, tz: 0, dist: 300, phi: .9, theta: .4 }); return new Promise(res => setTimeout(() => { const k = __li.campstart.rt().kit(); res({ far: k.filter(x => x.lod === 'far').length, n: k.length }); }, 600)); });
ok(camLod.far === camLod.n, 'at the home distance every piece is on its far level (' + camLod.far + ' of ' + camLod.n + ')');
await p.close();
/* ---- determinism: same seed, same plan hash ---- */
({ p } = await open(B + '&q=high'));
const a2 = await info(p); ok(a2.hash === a.hash && JSON.stringify(a2.plan.pieces) === JSON.stringify(a.plan.pieces), 'same seed, same camp plan (hash ' + a.hash + ')'); await p.close();
/* ---- low ---- */
({ p, errs } = await open(B + '&q=low'));
let lo = await info(p);
ok(errs.length === 0 && lo.kit.length === 5 && lo.counts.robots === 2, 'q=low: 0 errors, fewer pieces (' + lo.kit.length + ') and robots (' + lo.counts.robots + ')'); await p.close();
/* ---- post=0 ---- */
({ p, errs } = await open(B + '&q=low&post=0'));
ok(errs.length === 0, 'post=0: 0 errors'); await p.close();
/* ---- AR profile ---- */
({ p, errs } = await open(B + '&q=low&tier=ar&post=0'));
const ar = await info(p);
ok(errs.length === 0 && ar.kit.length === 3 && ar.counts.robots === 1, 'AR profile: 0 errors, ' + ar.kit.length + ' pieces, ' + ar.counts.robots + ' robot'); await p.close();
/* ---- world pages ---- */
({ p, errs } = await open('?ui=0&q=low&world=1&start=camp&post=0'));
const w1 = await info(p);
ok(errs.length === 0 && w1.village.houses === 0 && !w1.village.jetty, 'world 1: 0 errors, no houses, no village jetty' + (errs.length ? ' ' + errs[0] : ''));
ok(w1.kit.length >= 4 && w1.counts.robots === 2 && w1.robots.every(r => r.ready), 'world 1: pieces and robots appear (' + w1.kit.length + ' pieces, ' + w1.counts.robots + ' robots: ' + w1.robots.map(r => r.kind).join(',') + ')'); await p.close();
({ p, errs } = await open('?ui=0&q=low&world=4&start=camp&post=0'));
const w4 = await info(p);
ok(errs.length === 0 && w4.village.houses === 0 && w4.counts.robots >= 1, 'world 4: 0 errors, no houses, robots ' + w4.counts.robots); await p.close();
/* ---- dusk with the sky clock ---- */
({ p, errs } = await open(B + '&q=low&post=0&clock=1&cfreeze=1&seat=3'));
await p.evaluate(() => { const C = SkyClock, st = __li.clock.state(); let best = 12, bv = 1e9; for (let m = 600; m < 1440; m++) { const lst = m / 60, c = C.clock(1122, C.hoursFor(121, lst, 4, { doy0: st.doy0 }), { lat: st.lat, doy0: st.doy0 }); const d = Math.abs(c.sun.elev + 3) + (c.lst < 14 ? 99 : 0); if (d < bv) { bv = d; best = lst; } } __li.clock.setSky(121, best, 4); __li.clock.setSpeed(0); });
await p.waitForTimeout(600);
await p.evaluate(() => __li.campstart.rt().advance(300));
const dk = await info(p);
ok(errs.length === 0 && dk.robots.every(r => r.state === 'bay') && dk.counts.inYard === dk.counts.robots, 'clock dusk (sun below 2.5 deg): robots are in their bays (' + dk.robots.map(r => r.state).join(',') + ')');
await p.evaluate(() => { const C = SkyClock, st = __li.clock.state(); __li.clock.setSky(121, 12.4, 4); __li.clock.setSpeed(0); });
await p.waitForTimeout(600);
await p.evaluate(() => __li.campstart.rt().advance(240));
const dy = await info(p);
ok(dy.robots.some(r => r.state !== 'bay'), 'clock noon: robots are out again (' + dy.robots.map(r => r.state).join(',') + ')'); await p.close();
/* ---- GLB failures ---- */
({ p, errs } = await open(B + '&q=low&post=0&campkit=fail&campbots=fail'));
const gf = await info(p);
ok(errs.length === 0 && gf.kit.every(k => k.simple) && gf.robots.every(r => r.simple && r.ready), 'GLB load failure: simple shapes stand in, 0 console errors (' + gf.stat.glb + ', kit simple ' + gf.kit.filter(k => k.simple).length + ', robots simple ' + gf.robots.filter(r => r.simple).length + ')'); await p.close();
({ p, errs } = await open(B + '&q=low&post=0&campkit=bad&campbots=fallback'));
const gb = await info(p);
ok(errs.length === 0 && gb.kit.length >= 3 && gb.robots.every(r => r.ready), 'corrupt kit GLB and committed-tortoise fallback for the robots: 0 console errors (' + gb.stat.glb + ', ' + gb.stat.botsFallback + ' fallback robots)'); await p.close();
/* ---- the layers together ---- */
({ p, errs } = await open(B + '&q=low&post=0&boatkit=1&repair=1&clock=1&light=1&moods=1'));
await p.waitForFunction(() => __li.repair && __li.repair.ready() && __li.boatkit && __li.boatkit.ready(), null, { timeout: 180000 }).catch(() => { });
const lay = await info(p);
const rp = await p.evaluate(() => __li.repair ? { site: !!__li.repair.dbg().site, built: __li.repair.ready() } : null);
ok(errs.length === 0 && lay.village.houses === 0 && lay.kit.every(k => k.kind !== 'wrecked_jetty'), 'boatkit + repair + clock + light + moods: 0 errors, no village, the repair layer owns the wrecked jetty (' + lay.kit.length + ' camp pieces, repair ' + JSON.stringify(rp) + ')' + (errs.length ? ' ' + errs[0] : '')); await p.close();
({ p, errs } = await open(B + '&q=low&post=0&boatkit=1&life=1'));
ok(errs.length === 0, 'boatkit + life: 0 errors'); await p.close();
/* ---- the default page is unchanged ---- */
await browser.close();
if (arg('quick') !== '1') {
  const r = spawnSync('node', [ROOT + '/tests/look-test.js'], { encoding: 'utf8', env: process.env, timeout: 600000 });
  console.log(r.stdout.trim());
  ok(r.status === 0 && /8d962c0c/.test(r.stdout) && /88790/.test(r.stdout), 'look-test: default page unchanged (hash 8d962c0c, 88790 triangles), no start=camp');
}
function arg(k) { return (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1]; }
process.exit(fails ? 1 : 0);
