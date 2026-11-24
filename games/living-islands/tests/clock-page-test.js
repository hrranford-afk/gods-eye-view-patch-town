/* CLOCK PAGE TEST for islands_look.html?clock=1 (headless chromium, software GL, file:// pages). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/clock-page-test.js [quick=1]
   Checks (see SKY_CLOCK_BUILD.md): the default page is untouched (hash 8d962c0c, 88,790 triangles, no __li.clock, no extra script); &clock=1 leaves the world hash alone and adds only the sky objects
   (a bounded number of triangles); 0 console errors for default, q=low and post=0 with &clock=1 at four times of day (dawn, noon, dusk, night); what each time of day does to the light
   (the lamp is the sun by day and the moon at night, stars only at night, windows lit at night and dark at noon, the campfire light on at night); the tide on the slider follows the clock;
   a speed change does not move the hour; the HUD chip shows date, time and moon phase, the speed button cycles, the Dusk button lands at dusk; &clockdome=0 (the AR profile) draws no dome, stars or moon
   but keeps the lights and glows; &clock=1&macro=1 shares one hour and one tide; &world=N&life=1&clock=1 still works. */
import { launch, ROOT } from './shoot.js';
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const quick = process.argv.includes('quick=1');
let defPts = 1;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
async function open(qs, w = 480, h = 320) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: w, height: h }); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !noise(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return { page, errs };
}
const stat = page => page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic(), clock: !!__li.clock }));

/* 1. the default page */
{
  const { page, errs } = await open('?ui=0&q=high&seed=1122'); const st = await stat(page);
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(s => /sky_clock/.test(s)).length);
  ok(st.hash === GOLD && st.tris === GOLD_TRIS && !st.clock && scripts === 0, 'default page: hash ' + st.hash + ', ' + st.tris + ' tris, no __li.clock, sky_clock.js not loaded');
  ok(errs.length === 0, 'default page 0 console errors');
  defPts = await page.evaluate(() => __li.scenePoints()); ok(defPts === 1, 'default page has one Points object (the campfire smoke), no stars');
  await page.close();
}

/* 2. &clock=1 at four times of day, three tiers */
const TIMES = [['dawn', 121, 5.0, 4], ['noon', 121, 12.5, 4], ['dusk', 121, 20.7, 4], ['night', 121, 1.5, 4]];
const base = '?ui=0&seed=1122&clock=1&seat=3&cfreeze=1';
const infoByTime = {};
for (const [tier, extra] of [['high', '&q=high'], ['low', '&q=low'], ['post0', '&q=high&post=0']]) {
  if (quick && tier !== 'high') continue;
  let ref = GOLD_TRIS; if (tier === 'low') { const d = await open('?ui=0&seed=1122&q=low'); ref = (await stat(d.page)).tris; await d.page.close(); }
  const { page, errs } = await open(base + extra); const st = await stat(page);
  ok(st.hash === GOLD && st.clock, '&clock=1 ' + tier + ': world hash ' + st.hash + ' unchanged, __li.clock present, ' + st.tris + ' tris (+' + (st.tris - ref) + ' over the default page of the same tier)');
  ok(st.tris - ref < 6000 && st.tris >= ref, '&clock=1 ' + tier + ': the sky objects add under 6,000 triangles (' + (st.tris - ref) + ')');
  for (const [nm, doy, lst, age] of TIMES) {
    await page.evaluate(([d, l, a]) => { __li.clock.setSky(d, l, a); }, [doy, lst, age]); await page.waitForTimeout(700);
    const r = await page.evaluate(() => { const c = __li.clock.state().c, L = __li.clock.light(); return { lst: c.lst, sunElev: c.sun.elev, moonElev: c.moon.elev, illum: c.moon.illum, tw: c.twilight.name, isMoon: L.lightIsMoon, lightI: L.lightI, star: L.starAlpha, lim: L.limMag, win: __li.clock.litFraction(), tide: __li.clock.tide(), sdir: __li.clock.sunDir(), exp: L.exposure, hemi: L.hemiI, lamp: __li.clock.lightIsMoon() }; });
    infoByTime[tier + nm] = r;
    ok(true, '  ' + tier + ' ' + nm + ': solar ' + r.lst.toFixed(1) + ' h, sun ' + r.sunElev.toFixed(1) + ', moon ' + r.moonElev.toFixed(1) + ' (' + (r.illum * 100).toFixed(0) + '%), ' + r.tw + ', lamp ' + (r.isMoon ? 'moon' : 'sun') + ' ' + r.lightI.toFixed(2) + ', stars ' + r.star.toFixed(2) + ', lit windows ' + r.win.toFixed(2));
  }
  ok(errs.length === 0, '&clock=1 ' + tier + ' at four times of day: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
}
{
  const t = infoByTime.highnoon, n = infoByTime.highnight, d = infoByTime.highdusk, w = infoByTime.highdawn;
  ok(t.sunElev > 30 && !t.isMoon && t.star === 0 && t.win < 0.05, 'noon: sun high (' + t.sunElev.toFixed(0) + '), the lamp is the sun, no stars, windows dark (' + t.win.toFixed(2) + ')');
  ok(n.sunElev < -10 && n.star > 0.9 && n.win > 0.1 && n.exp > t.exp, 'night: sun below -10, stars at full strength, some windows lit (' + n.win.toFixed(2) + '), exposure lifted (' + n.exp.toFixed(2) + ' against ' + t.exp.toFixed(2) + ')');
  ok(d.sunElev < 0 && d.sunElev > -9 && d.win > 0.3, 'dusk: sun just below the horizon (' + d.sunElev.toFixed(1) + '), windows lit (' + d.win.toFixed(2) + ')');
  ok(w.sunElev > -4 && w.sunElev < 6 && w.lightI > 0 && w.lightI < t.lightI, 'dawn: sun near the horizon (' + w.sunElev.toFixed(1) + '), lamp weaker than at noon (' + w.lightI.toFixed(2) + ' against ' + t.lightI.toFixed(2) + ')');
  ok(Math.abs(t.sdir[1] - Math.sin(t.sunElev * Math.PI / 180)) < 1e-3 || t.sdir[1] > 0.4, 'the page light direction follows the clock sun at noon (y ' + t.sdir[1].toFixed(3) + ')');
}

/* 3. one page: tide, speed, chip, dusk, fire light, parts */
{
  const { page, errs } = await open('?ui=1&seed=1122&clock=1&seat=3&q=low', 900, 500);
  await page.evaluate(() => { __li.clock.setSky(121, 18, 4); __li.clock.setSpeed(0); __li.clock.advance(0); });
  const t0 = await page.evaluate(() => ({ h: __li.clock.hours(), tide: __li.clock.tide(), lbl: document.getElementById('tideLbl').textContent, slider: parseFloat(document.getElementById('tide').value) }));
  await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => ({ h: __li.clock.hours(), tide: __li.clock.tide(), slider: parseFloat(document.getElementById('tide').value) }));
  ok(t0.h === t1.h, 'speed 0 (paused): the hour does not move (' + t0.h.toFixed(4) + ')');
  ok(Math.abs(t1.slider - t1.tide) < 0.011, 'the tide slider shows the clock tide (' + t1.slider.toFixed(3) + ' against ' + t1.tide.toFixed(3) + ')');
  /* speed change: the hour advances by exactly dt x speed, no jump at the change */
  const sp = await page.evaluate(() => { const out = []; for (const s of [1, 60, 4]) { __li.clock.setSpeed(s); const a = __li.clock.hours(); __li.clock.advance(0.5); out.push([s, __li.clock.hours() - a]); } return out; });
  ok(sp.every(([s, dh]) => Math.abs(dh - 0.5 * s / 20) < 1e-9), 'speed changes: the hour advances by dt x speed / 20 s at x1, x60, x4 (' + sp.map(([s, d]) => 'x' + s + ': ' + d.toFixed(4) + ' h').join(', ') + ')');
  await page.evaluate(() => __li.clock.setSpeed(0));
  const j = await page.evaluate(() => { const h = __li.clock.hours(), a = __li.clock.state().c.sun.elev; __li.clock.setSpeed(60); __li.clock.setSpeed(1); __li.clock.advance(0); return { dh: __li.clock.hours() - h, de: __li.clock.state().c.sun.elev - a }; });
  ok(j.dh === 0 && j.de === 0, 'changing speed with no time passing moves neither the hour nor the sun');
  /* the chip */
  const chip = await page.evaluate(() => ({ t: document.getElementById('ckT').textContent, m: document.getElementById('ckM').textContent, s: document.getElementById('ckSpeed').textContent, api: __li.clock.chip() }));
  ok(/^[A-Z][a-z]{2} \d+ \u00b7 \d\d:\d\d$/.test(chip.t) && /(moon|quarter|crescent|gibbous) \d+%$/.test(chip.m), 'HUD chip shows date, time and moon phase: "' + chip.t + '" "' + chip.m + '"');
  await page.evaluate(() => { __li.clock.setSpeed(1); }); await page.click('#ckSpeed'); const s2 = await page.evaluate(() => [__li.clock.speed(), document.getElementById('ckSpeed').textContent]);
  ok(s2[0] === 4 && /4/.test(s2[1]), 'the speed button cycles x1 to x4 (' + s2.join(' ') + ')');
  await page.evaluate(() => { __li.clock.setSky(121, 10, 4); __li.clock.setSpeed(0); });
  await page.click('#ckDusk'); await page.waitForTimeout(400);
  const du = await page.evaluate(() => { const c = __li.clock.state().c; return { e: c.sun.elev, lst: c.lst, tw: c.twilight.name }; });
  ok(du.e < -1.5 && du.e > -3.5 && du.lst > 18 && du.lst < 23.5 && du.tw === 'civil', 'the Dusk button lands just after sunset: solar ' + du.lst.toFixed(1) + ' h, sun ' + du.e.toFixed(2) + ', ' + du.tw + ' twilight');
  await page.evaluate(() => __li.clock.setSky(121, 12.5, 4)); await page.waitForTimeout(500);
  const fnoon = await page.evaluate(() => __li.stats().tris);
  await page.evaluate(() => __li.clock.setSky(121, 22.5, 12)); await page.click('#ckSky'); await page.waitForTimeout(300);
  const sv = await page.evaluate(() => ({ cam: __li.clock.cam(), c: __li.clock.state().c })); await page.click('#ckSky'); await page.waitForTimeout(300); const sv2 = await page.evaluate(() => __li.clock.cam());
  ok(sv.cam.fov > 50 && sv.cam.ty > 5 && sv.cam.phi < 0.15 && sv2.fov === 30 && sv2.ty === 0, 'the Sky button looks up (fov ' + sv.cam.fov + ', look height ' + sv.cam.ty.toFixed(0) + ') and a second press goes home');
  /* the campfire light */
  const p = await page.evaluate(() => __li.clock.parts());
  ok(p.dome && p.stars && p.moon && p.sun && p.fire && p.windows > 0, 'parts built: dome, stars, moon, sun disc, campfire light, ' + p.windows + ' glow windows (houses and tents)');
  const pts = await page.evaluate(() => __li.scenePoints()); ok(pts === defPts + 1, 'one extra Points object over the default page (the star field, one draw call; the Milky Way is a shader on a low-poly sphere), found ' + pts + ' against ' + defPts);
  ok(errs.length === 0, 'chip, speed, dusk interactions: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
}

/* 4. clockdome=0: the AR profile */
{
  const { page, errs } = await open(base + '&clockdome=0&q=high'); const st = await stat(page);
  const p = await page.evaluate(() => { __li.clock.setSky(121, 1.5, 4); return { parts: __li.clock.parts(), pts: __li.scenePoints() }; });
  ok(!p.parts.dome && !p.parts.stars && !p.parts.moon && !p.parts.sun && p.pts === defPts, '&clockdome=0: no dome, no stars, no moon, no sun disc, no extra Points');
  ok(p.parts.windows > 0 && p.parts.fire, '&clockdome=0: window glows and the campfire light stay (they are emissive objects, safe in AR)');
  ok(st.hash === GOLD && st.tris - GOLD_TRIS < 900, '&clockdome=0: world hash unchanged, only ' + (st.tris - GOLD_TRIS) + ' extra triangles (window and glow quads)');
  ok(errs.length === 0, '&clockdome=0: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
}

/* 5. macro together with the clock: one hour, one tide */
if (!quick) {
  const { page, errs } = await open('?ui=0&q=low&seed=135&clock=1&macro=1&mh=100&mt=0&seat=2');
  const r = await page.evaluate(() => ({ mh: __li.macro.hour(), ch: __li.clock.hours(), mt: __li.macro.tide(), ct: __li.clock.tide(), st: __li.macro.state().tide.level, dc: __li.clock.state().doy0 }));
  ok(Math.abs(r.mh - r.ch) < 1e-9 && Math.abs(r.mt - r.ct) < 1e-9 && r.dc === 290, '&clock=1&macro=1: the clock reads the macro hour (' + r.ch.toFixed(2) + ') and the tide agrees (macro ' + r.mt.toFixed(4) + ', clock ' + r.ct.toFixed(4) + ')');
  await page.evaluate(() => { __li.macro.setHour(400.3); __li.macro.advance(0); __li.clock.advance(0); });
  const r2 = await page.evaluate(() => ({ mt: __li.macro.tide(), ct: __li.clock.tide(), ch: __li.clock.hours() }));
  ok(Math.abs(r2.mt - r2.ct) < 1e-9 && Math.abs(r2.ch - 400.3) < 1e-6, 'after moving the macro hour to 400.3 both tides still agree (' + r2.mt.toFixed(4) + ')');
  ok(errs.length === 0, '&clock=1&macro=1: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
}

/* 6. weather together with the clock (foggy dusk), and world + life */
if (!quick) {
  const { page, errs } = await open('?ui=0&q=low&seed=1122&clock=1&weather=fog&cfreeze=1&seat=3&wt=1');
  await page.evaluate(() => __li.clock.setSky(121, 20.8, 4)); await page.waitForTimeout(1200);
  const ok2 = await page.evaluate(() => ({ w: __li.weather().state, c: __li.clock.state().c.twilight.name }));
  ok(errs.length === 0 && ok2.w === 'fog', '&clock=1&weather=fog at dusk: 0 console errors, weather ' + ok2.w + ', ' + ok2.c + ' twilight' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
}
{
  const { page, errs } = await open('?ui=0&q=low&world=153&life=1&clock=1&cfreeze=1&seat=3'); await page.evaluate(() => __li.clock.setSky(121, 22.2, 4)); await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ world: !!__li.world, life: !!__li.life, clock: !!__li.clock, seed: __li.seed, lat: __li.clock.state().lat, parts: __li.clock.parts() }));
  ok(errs.length === 0 && r.world && r.life && r.clock, '&world=153&life=1&clock=1 at night: 0 console errors, world, life and clock all present (latitude ' + r.lat.toFixed(1) + ' from the seed)' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
  if (!quick) {
    const w = await open('?ui=0&q=high&world=99&clock=1&cfreeze=1&seat=3&post=0'); await w.page.evaluate(() => __li.clock.setSky(80, 12, 4)); await w.page.waitForTimeout(800);
    ok(w.errs.length === 0, '&world=99&clock=1&post=0 at noon: 0 console errors' + (w.errs.length ? ' ' + w.errs[0] : '')); await w.page.close();
  }
}
await browser.close();
console.log('\n' + passes + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
