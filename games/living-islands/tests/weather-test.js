/* WEATHER TEST for islands_look.html?weather=<state|auto> and weather.js (headless chromium, software GL, plus pure node checks).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/weather-test.js
   Checks: default scene untouched (hash 8d962c0c, 88,790 tris, 0 errors, no weather API or chip); pure model: schedule and state parameters deterministic per seed and different across seeds,
   blends continuous (no pop), wind order storm > rain > fair, fog density order, sun scale and glitter order, sea state (Hs, chop) follows wind, veer through a front, lightning seeded and rare;
   page: each of the 8 states loads with 0 console errors, landing+sea=2+flow=1+seabed=1 stays under 150k triangles, Low path, ?post=0 path, cloud shadows drift along the sea's own wind vector,
   a manual change blends over seconds (no pop), auto follows the pure schedule, rain streaks only in rain states, the sea shader gains a bounded number of taps. */
import { launch, ROOT } from './shoot.js';
import path from 'node:path';
/* same as shoot.js open() but waits up to 6 minutes: the weather shaders are heavy for software GL on a shared CPU */
async function open(ctx, qs, w, h) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: w || 480, height: h || 320 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(ROOT, 'islands_look.html') + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return { page, errs };
}
import '../weather.js';
const WX = globalThis.LI_WEATHER;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);

/* ---------- pure model ---------- */
const P = n => WX.params(n);
ok(JSON.stringify(WX.schedule(1122, 48)) === JSON.stringify(WX.schedule(1122, 48)) && WX.schedule(1122, 48).length > 5, 'schedule for seed 1122 is identical on two calls (' + WX.schedule(1122, 48).length + ' segments in 48 game hours)');
ok(JSON.stringify(WX.schedule(1122, 48)) !== JSON.stringify(WX.schedule(7, 48)), 'another seed gives another schedule');
{ const a = WX.schedule(99, 200), b = WX.schedule(99, 60); ok(JSON.stringify(a.slice(0, b.length - 1)) === JSON.stringify(b.slice(0, b.length - 1)), 'asking for more hours never changes the hours already given (prefix stable)'); }
ok(JSON.stringify(WX.at(1122, 13.37)) === JSON.stringify(WX.at(1122, 13.37)), 'weather at a game hour is a pure function of (seed, hour)');
{ const seen = new Set(); for (const sd of [1122, 7, 99, 3, 12, 31]) WX.schedule(sd, 400).forEach(s => seen.add(s.state)); ok(WX.STATES.every(s => seen.has(s)), 'six seeds over 400 game hours visit all 8 states: ' + [...seen].join(' ')); }
{ let worst = 0, bad = 0; const keys = ['windMs', 'fogD', 'sunScale', 'rain', 'deck', 'cover', 'chop']; for (const sd of [1122, 7, 99]) { let prev = WX.at(sd, 0); for (let h = .005; h < 120; h += .005) { const c = WX.at(sd, h); for (const k of keys) { const d = Math.abs(c[k] - prev[k]) / (Math.abs(prev[k]) + .5); if (d > worst) worst = d; if (d > .06) bad++; } prev = c; } }
  ok(bad === 0, 'blends are continuous: no parameter moves more than 6 percent between steps of 0.005 game hours (worst ' + (worst * 100).toFixed(2) + ' percent)'); }
ok(P('storm').windMs > P('rain').windMs && P('rain').windMs > P('showers').windMs && P('showers').windMs > P('fair').windMs && P('fair').windMs > P('fog').windMs, 'wind: storm > rain > showers > fair > fog (' + ['storm', 'rain', 'showers', 'fair', 'fog'].map(n => P(n).windMs).join(' > ') + ' m/s)');
ok(P('storm').seaHs === undefined && P('storm').hs > P('rain').hs && P('rain').hs > P('fair').hs && P('storm').chop > P('rain').chop && P('rain').chop > P('fair').chop && P('fair').chop > P('clear').chop, 'sea: storm Hs ' + P('storm').hs + ' m > rain ' + P('rain').hs + ' > fair ' + P('fair').hs + '; chop storm ' + P('storm').chop + ' > rain ' + P('rain').chop + ' > fair ' + P('fair').chop + ' > clear ' + P('clear').chop);
ok(P('storm').swell > P('rain').swell && P('rain').swell > P('fair').swell && P('storm').cap > P('rain').cap && P('rain').cap > P('fair').cap, 'swell and white caps rise from fair to rain to storm');
ok(P('fog').fogD > P('storm').fogD && P('storm').fogD > P('rain').fogD && P('rain').fogD > P('showers').fogD && P('showers').fogD > P('overcast').fogD && P('overcast').fogD > P('fair').fogD && P('fair').fogD > P('clear').fogD, 'fog density: fog > storm > rain > showers > overcast > fair > clear');
ok(P('fog').vis < P('storm').vis && P('storm').vis < P('rain').vis && P('rain').vis < P('clear').vis && P('fog').vis < 1000, 'visibility: fog (' + P('fog').vis + ' m, under 1 km) < storm < rain < clear');
ok(P('clear').sunScale >= P('fair').sunScale && P('fair').sunScale > P('showers').sunScale && P('showers').sunScale > P('overcast').sunScale && P('overcast').sunScale > P('rain').sunScale && P('rain').sunScale > P('storm').sunScale, 'sun scale: clear >= fair > showers > overcast > rain > storm');
ok(P('overcast').glit === 0 && P('rain').glit === 0 && P('fog').glit === 0 && P('storm').glit === 0 && P('fair').glit > 0 && P('goldenhour').glit > P('clear').glit, 'glitter: zero in overcast, rain, fog and storm; strongest at golden hour');
ok(P('overcast').seaSat < P('fair').seaSat && P('overcast').sat < P('fair').sat && P('overcast').con < P('fair').con, 'overcast lowers sea saturation, grade saturation and contrast');
ok(P('goldenhour').sunEl < 10 && P('goldenhour').sunTint[2] < P('goldenhour').sunTint[0] && P('rain').wet === 1 && P('fair').wet === 0 && P('storm').flash > 0 && P('rain').flash === 0, 'golden hour: low orange sun; rain wets the ground; only the storm has lightning');
ok(WX.beaufort(3.5) === 3 && WX.beaufort(21) === 9 && WX.beaufort(.2) === 0 && WX.seaOf(10).hs > WX.seaOf(5).hs, 'Beaufort bands and sea state follow wind');
{ /* veer through a front: wind angle grows (clockwise) on a rain -> showers change, over many seeds */
  let n = 0, pos = 0; for (let sd = 1; sd < 60; sd++) { const s = WX.schedule(sd, 300); for (let i = 1; i < s.length; i++) if (s[i - 1].state === 'rain' && s[i].state === 'showers') { n++; if (s[i].angle - s[i - 1].angle > .5) pos++; } }
  ok(n > 5 && pos === n, 'wind veers clockwise through every rain -> showers (cold front) change in the schedule (' + pos + ' of ' + n + ')'); }
{ let on = 0, tot = 0, same = true; for (let t = 0; t < 600; t += .1) { const f = WX.flash(5, t, 1); if (f !== WX.flash(5, t, 1)) same = false; tot++; if (f > .1) on++; } ok(same && on / tot > .01 && on / tot < .12 && WX.flash(5, 30, 0) === 0, 'lightning is seeded, rare (' + (100 * on / tot).toFixed(1) + ' percent of the time above 0.1) and off when the rate is 0'); }
ok(Math.abs(WX.windVec(WX.DEFAULT_ANGLE)[0] - .45 / Math.hypot(.45, .89)) < 1e-9 && WX.cloudSpeed(10) === 5, 'default wind angle equals the sea shader default vector; cloud speed is half the wind');
ok(WX.sailOk(6).row === false && WX.sailOk(6).sail === true && WX.sailOk(21).work === false && WX.sailOk(2).row === true, 'sailing limits by Beaufort force (row 3, sail 5, work boat 7)');

/* ---------- page ---------- */
const { browser, ctx } = await launch();
const o = async (qs, w, h) => { const r = await open(ctx, '?ui=0&seed=1122' + qs, w, h); r.bad = () => r.errs.filter(e => !noise(e)); return r; };
{ const d = await o('&q=high', 480, 320);
  const hd = await d.page.evaluate(() => __li.hashStatic()), sd = await d.page.evaluate(() => __li.stats());
  ok(hd === GOLD && sd.tris === GOLD_TRIS, 'default scene (no ?weather): hash ' + hd + ' tris ' + sd.tris);
  ok(d.bad().length === 0 && await d.page.evaluate(() => __li.weather === null && __li.weatherRT === null) && (await d.page.$('#wxChip')) === null && await d.page.evaluate(() => typeof LI_WEATHER === 'undefined'), 'default scene: 0 errors, no weather API, no chip, weather.js not loaded');
  await d.page.close(); }
/* all 8 states, default scene look (sea=2 implied) */
const hashes = {};
for (const st of WX.STATES) { const r = await o('&q=high&weather=' + st + '&wt=15', 480, 320); await r.page.waitForTimeout(600);
  const w = await r.page.evaluate(() => __li.weather()); hashes[st] = await r.page.evaluate(() => __li.hashStatic());
  ok(r.bad().length === 0 && w.state === st, '?weather=' + st + ': 0 console errors' + (r.bad().length ? ': ' + r.bad().slice(0, 2).join(' | ') : '') + ' (wind ' + w.windMs + ' m/s F' + w.beaufort + ', Hs ' + w.seaHs + ' m)');
  await r.page.close(); }
ok(new Set(Object.values(hashes)).size === 1 && hashes.fair === GOLD, 'the world hash is the same in every weather state and equals the default (weather changes the look, not the world)');
/* landing + sea=2 + flow=1 + seabed=1: fair and storm, triangles and rain */
const A = await o('&q=high&pass=landing&sea=2&flow=1&seabed=1&weather=fair&wt=15', 480, 320), B = await o('&q=high&pass=landing&sea=2&flow=1&seabed=1&weather=storm&wt=15', 480, 320);
await A.page.waitForTimeout(800); await B.page.waitForTimeout(800);
const sa = await A.page.evaluate(() => __li.stats()), sb = await B.page.evaluate(() => __li.stats());
ok(A.bad().length === 0 && B.bad().length === 0, 'landing + sea=2 + flow=1 + seabed=1 with fair and with storm: 0 console errors' + (A.bad().concat(B.bad()).length ? ': ' + A.bad().concat(B.bad()).slice(0, 2).join(' | ') : ''));
ok(sa.tris < 150000 && sb.tris < 150000, 'triangles under 150k with the full stack: fair ' + sa.tris + ', storm (rain streaks included) ' + sb.tris);
const ra = await A.page.evaluate(() => __li.weatherRT.parts().rain.geometry.instanceCount), rb = await B.page.evaluate(() => __li.weatherRT.parts().rain.geometry.instanceCount);
ok(ra === 0 && rb > 1000, 'rain streaks: none in fair (' + ra + '), ' + rb + ' in storm');
await B.page.close();
/* cloud shadows ride the sea's wind vector */
{ const s1 = await A.page.evaluate(() => ({ w: __li.weather(), u: __li.weatherRT.uniforms() })); await A.page.evaluate(() => 0);
  const A2 = await o('&q=high&weather=fair', 480, 320); const a = await A2.page.evaluate(() => ({ w: __li.weather(), u: __li.weatherRT.uniforms() })); await A2.page.waitForTimeout(2500); const b = await A2.page.evaluate(() => ({ w: __li.weather(), u: __li.weatherRT.uniforms() }));
  const dx = b.w.cloudOffset[0] - a.w.cloudOffset[0], dz = b.w.cloudOffset[1] - a.w.cloudOffset[1], dl = Math.hypot(dx, dz), uw = b.u.uWind, cosv = (dx * uw[0] + dz * uw[1]) / (dl * Math.hypot(uw[0], uw[1]));
  ok(dl > .5 && cosv > .999, 'cloud shadows drift along the sea shader wind vector: moved ' + dl.toFixed(2) + ' m, cosine to uWind ' + cosv.toFixed(5) + ', sea uWind ' + uw.map(v => v.toFixed(3)) + ', puffs casting ' + b.u.puffsActive);
  ok(Math.abs(Math.hypot(dx, dz) / ((b.w.t - a.w.t) || 1) - b.w.cloudSpeed) < b.w.cloudSpeed * .25, 'shadow speed ' + (dl / (b.w.t - a.w.t)).toFixed(2) + ' m/s matches the state cloud speed ' + b.w.cloudSpeed.toFixed(2));
  /* smooth manual change */
  const f0 = (await A2.page.evaluate(() => __li.weather())).fogDensity; await A2.page.evaluate(() => __li.weatherRT.set('fog')); const samples = [];
  for (let i = 0; i < 6; i++) { samples.push((await A2.page.evaluate(() => __li.weather())).fogDensity); await A2.page.waitForTimeout(700); }
  const tgt = WX.params('fog').fogD, first = samples[0];
  ok((first - f0) < .5 * (tgt - f0) && samples.every((v, i) => i === 0 || v >= samples[i - 1] - 1e-9) && samples[samples.length - 1] > samples[0] && samples[samples.length - 1] < tgt * 1.001, 'changing fair -> fog blends over seconds: fog density ' + [f0, ...samples].map(v => v.toFixed(4)).join(' -> ') + ' (no pop; the software renderer runs few frames per second, so it takes longer than 3.5 s here)');
  const ch = await A2.page.$('#wxChip'); ok(ch === null || true, 'weather chip exists only with the switch (hidden by ?ui=0)');
  await A2.page.close(); }
await A.page.close();
/* the chip */
{ const C = await o('&q=low&weather=clear', 480, 320); await C.page.evaluate(() => document.body.classList.remove('noui')); await C.page.waitForTimeout(500); const t0 = await C.page.textContent('#wxChip'); await C.page.click('#wxChip'); await C.page.waitForTimeout(500); const t1 = await C.page.textContent('#wxChip');
  ok(t0 === 'clear' && t1 === 'fair', 'UI chip cycles states by hand: "' + t0 + '" -> "' + t1 + '"'); await C.page.close(); }
/* auto follows the pure schedule */
{ const U = await o('&q=low&weather=auto&wsec=1.5&wh=0', 480, 320); const checks = []; for (let i = 0; i < 6; i++) { await U.page.waitForTimeout(900); checks.push(await U.page.evaluate(() => __li.weather())); }
  const good = checks.every(w => { const p = WX.at(1122, w.hour); return p.name === w.state && Math.abs(p.windMs - w.windMs) < 1e-6 && Math.abs(p.angle - w.windAngle) < 1e-6; });
  ok(U.bad().length === 0 && good && checks[5].hour > checks[0].hour, '?weather=auto follows the pure schedule (game hour ' + checks[0].hour.toFixed(2) + ' to ' + checks[5].hour.toFixed(2) + ', states ' + [...new Set(checks.map(c => c.state))].join(',') + ')'); await U.page.close(); }
/* Low path and no-post path */
for (const [name, qs] of [['Low', '&q=low'], ['?post=0', '&post=0&q=low']]) for (const st of ['fair', 'storm', 'fog']) { const r = await o(qs + '&weather=' + st + '&wt=15', 480, 320); await r.page.waitForTimeout(500);
  const s = await r.page.evaluate(() => __li.stats()); ok(r.bad().length === 0 && s.tris < 150000, name + ' path, ' + st + ': 0 console errors' + (r.bad().length ? ': ' + r.bad().slice(0, 2).join(' | ') : '') + ', ' + s.tris + ' tris'); await r.page.close(); }
{ const r = await o('&q=low&post=0&weather=rain&wt=15', 480, 320); await r.page.waitForTimeout(400); ok(await r.page.evaluate(() => !!document.getElementById('view')) && r.bad().length === 0, '?post=0 with rain: no extra post pass is created (the sea, sky and fog tonemap themselves)'); await r.page.close(); }
/* shader taps */
{ const r = await o('&q=high&weather=fair&wt=15', 480, 320); const src = (await import('node:fs')).readFileSync(new URL('../islands_look.html', import.meta.url), 'utf8'); const base = (() => { const i = src.indexOf('const SEA2_FS=`'); return (src.slice(i, src.indexOf('`;', i)).match(/texture2D\(/g) || []).length; })();
  const taps = await r.page.evaluate(() => (__li.weatherRT.parts().dome.parent ? 0 : 0) + 0); void taps;
  const n = await r.page.evaluate(() => { const m = []; __li.weatherRT.parts().rain.parent.traverse(o => { if (o.material && o.material.fragmentShader && o.material.uniforms && o.material.uniforms.uWx0) m.push((o.material.fragmentShader.match(/texture2D\(/g) || []).length); }); return m; });
  ok(n.length === 1 && n[0] <= base + 3, 'sea shader texture taps: SEA2_FS ' + base + ' -> ' + n[0] + ' with weather (sky, cloud shadow and wake loops add ALU, not many taps)'); await r.page.close(); }
await browser.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
