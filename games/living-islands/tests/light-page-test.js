/* LIGHT PAGE TEST for islands_look.html?light=1 (headless chromium, software GL, file:// pages). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/light-page-test.js [quick=1]
   Checks (see LIGHTHOUSE_BUILD.md): the default page is untouched (hash 8d962c0c, 88,790 triangles, no __li.light, no light_range.js); &light=1 leaves the world hash alone and adds a few hundred triangles;
   0 console errors for default, q=low, post=0 and the AR profile with &light=1&clock=1 at dusk and at night, in default mode, ?world=153 and ?world=5&life=1; every rung and every flash character builds;
   the lamp is lit at night and in fog, dark by day (and ?lightnight=1 lights it without the clock); the HUD chip shows rung, character and range; the range follows the weather (fog cuts it) and the ring of sight follows the range;
   tiers (low: no point light, on/off flash; AR: no dome, no point light, crossed cards only, short); the arrivals API is deterministic and matches light_range.js; a wreck makes a morning salvage crate;
   the beam is visible in fog by a pixel brightness difference (light on against lamp off) and the same beam in clear air is far fainter; triangle budget under 150k at high with life and clock on. */
import { launch, ROOT } from './shoot.js';
import fs from 'node:fs';
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const quick = process.argv.includes('quick=1');
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
async function open(qs, w = 480, h = 320) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: w, height: h }); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !noise(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  return { page, errs };
}
const stat = page => page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic(), light: !!__li.light }));
const set = (page, doy, lst, age) => page.evaluate(([d, l, a]) => { if (__li.clock) { __li.clock.setSky(d, l, a); __li.clock.setSpeed(0); } __li.light.update(0, true); }, [doy, lst, age]);
const settle = async (page, n = 2) => { for (let i = 0; i < n; i++) { await page.waitForTimeout(500); await page.evaluate(() => __li.light.update(0, true)); } };
/* mean luminance of a clip of a screenshot (PNG decoded in the page with a canvas) */
async function lum(page, clip) {
  const buf = await page.screenshot({ clip }); const b64 = buf.toString('base64');
  return page.evaluate(async ([b64, w, h]) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return s / (d.length / 4); }, [b64, clip.width, clip.height]);
}

/* 1. the default page */
{
  const { page, errs } = await open('?ui=0&q=high&seed=1122'); const st = await stat(page);
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(s => /light_range/.test(s)).length);
  ok(st.hash === GOLD && st.tris === GOLD_TRIS && !st.light && scripts === 0, 'default page: hash ' + st.hash + ', ' + st.tris + ' tris, no __li.light, light_range.js not loaded');
  ok(errs.length === 0, 'default page 0 console errors'); await page.close();
}

/* 2. &light=1 on the default table: hash, triangles, parts, three tiers */
const base = '?ui=0&seed=1122&clock=1&seat=3&cfreeze=1&light=1&lfreeze=2.25';
let tris = {};
for (const [tier, extra] of [['high', '&q=high'], ['low', '&q=low'], ['post0', '&q=high&post=0'], ['ar', '&q=high&lightar=1']]) {
  if (quick && tier !== 'high' && tier !== 'ar') continue;
  let ref = GOLD_TRIS; if (tier === 'low') { const d = await open('?ui=0&seed=1122&q=low'); ref = (await stat(d.page)).tris; await d.page.close(); }
  const { page, errs } = await open(base + extra); const st = await stat(page);
  const clk = await open('?ui=0&seed=1122&clock=1&seat=3&cfreeze=1&q=' + (tier === 'low' ? 'low' : 'high') + (tier === 'post0' ? '&post=0' : '')); const cst = await stat(clk.page); await clk.page.close();
  tris[tier] = st.tris;
  ok(st.hash === GOLD && st.light, '&light=1&clock=1 ' + tier + ': world hash ' + st.hash + ' unchanged, __li.light present, ' + st.tris + ' tris (+' + (st.tris - cst.tris) + ' over &clock=1 alone)');
  ok(st.tris - cst.tris < 2500 && st.tris >= cst.tris && st.tris < 150000, '&light=1 ' + tier + ': the lighthouse adds under 2,500 triangles (' + (st.tris - cst.tris) + ') and the page stays under 150k (' + st.tris + ')');
  for (const [nm, doy, lst, age] of [['dusk', 121, 20.0, 4], ['night', 121, 23.0, 4]]) {
    await set(page, doy, lst, age); await settle(page, 2);
    const r = await page.evaluate(() => { const s = __li.light.state(), p = __li.light.parts(); return { on: s.on, rangeNm: s.rangeNm, tier: s.tier, p, chip: __li.light.chip() }; });
    ok(r.tier === (tier === 'ar' ? 'ar' : tier === 'low' ? 'low' : 'high'), '  ' + tier + ' ' + nm + ': tier ' + r.tier + ', lamp lit ' + r.on.toFixed(2) + ', range ' + r.rangeNm.toFixed(1) + ' nm, sprites ' + r.p.sprites);
    if (nm === 'night') {
      if (tier === 'high' || tier === 'post0') ok(r.p.tower && r.p.dome && r.p.pointLight && r.p.beams[0].cards === 2, '  high tier: tower, lens dome, point light, sharp blade + haze card');
      if (tier === 'low') ok(r.p.tower && r.p.dome && !r.p.pointLight && r.p.beams[0].cards === 2 && r.p.sprites <= 20, '  low tier: tower, dome, no point light, two crossed cards, ' + r.p.sprites + ' sprites (budget 20)');
      if (tier === 'ar') ok(r.p.tower && !r.p.dome && !r.p.pointLight && r.p.beams[0].cards === 2 && r.p.sprites <= 20, '  AR tier: no dome, no point light, two crossed cards only, ' + r.p.sprites + ' sprites');
    }
  }
  ok(errs.length === 0, '&light=1&clock=1 ' + tier + ' at dusk and night: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await page.close();
}
ok(tris.ar === undefined || tris.high === undefined || tris.ar <= tris.high, 'AR profile has no more triangles than high (' + tris.ar + ' against ' + tris.high + ')');

/* 3. one page: rungs, characters, chip, lit rules, ring, weather, arrivals, salvage */
{
  const { page, errs } = await open('?ui=1&seed=1122&clock=1&seat=3&cfreeze=1&light=1&lfreeze=2.25&q=low', 900, 500);
  /* rungs and characters */
  const rows = [];
  for (let i = 0; i < 5; i++) { const r = await page.evaluate(i => { __li.light.setRung(i); __li.light.update(0, true); const s = __li.light.state(); return { id: s.rung, ch: s.char, nm: s.rangeNm, hor: s.horizonNm, tri: __li.light.parts().towerTris, chip: __li.light.chip() }; }, i); rows.push(r); }
  ok(rows.map(r => r.id).join() === 'fire,post,small,big,relic', 'the rung switcher visits fire, post lamp, small lens, big lens, relic');
  ok(rows.every(r => r.nm > 0 && r.nm <= r.hor + 1e-9 && r.tri > 100 && r.tri < 1500), 'every rung builds a tower of 100 to 1,500 triangles and has a range below its horizon (' + rows.map(r => r.id + ' ' + r.nm.toFixed(1) + ' nm ' + r.tri + ' tris').join(', ') + ')');
  const chars = await page.evaluate(() => { const out = []; __li.light.setRung(3); for (const c of __li.light.characters()) { __li.light.setChar(c.id); const s = __li.light.state(); out.push([c.id, s.char, __li.light.chip().t]); } return out; });
  ok(chars.length === 8 && chars.every(c => c[0] === c[1]), 'all eight flash characters can be set: ' + chars.map(c => c[2].split('·')[1].trim()).join(', '));
  /* chip */
  await page.evaluate(() => { __li.light.setRung(3); __li.light.setChar('Fl2_10'); __li.light.update(0, true); }); await page.waitForTimeout(400);
  const chip = await page.evaluate(() => ({ t: document.getElementById('ltT').textContent, m: document.getElementById('ltM').textContent, api: __li.light.chip() }));
  ok(/^Big lens · Fl\(2\) 10s$/.test(chip.t) && /^range \d+(\.\d)? nm · vis \d+(\.\d)? km$/.test(chip.m), 'HUD chip shows the rung, the character and the day\'s range: "' + chip.t + '" "' + chip.m + '"');
  /* buttons */
  const b = await page.evaluate(() => { document.getElementById('ltRung').click(); const a = __li.light.state().rung; document.getElementById('ltPat').click(); const c = __li.light.state().char; document.getElementById('ltRingB').click(); const r = __li.light.state().ring; document.getElementById('ltRingB').click(); return { a, c, r, r2: __li.light.state().ring }; });
  ok(b.a === 'relic' && b.c !== 'Fl2_10' && b.r === true && b.r2 === false, 'HUD buttons: Rung (to ' + b.a + '), Pattern (to ' + b.c + '), Ring toggles on and off');
  /* lit rules: by day dark, at dusk and night lit, in fog lit by day */
  await page.evaluate(() => __li.light.setRung(3));
  const lit = {};
  for (const [nm, lst] of [['noon', 12.4], ['dusk', 20.0], ['night', 23.0]]) { await set(page, 121, lst, 4); const s = await page.evaluate(() => __li.light.state()); lit[nm] = s.on; }
  ok(lit.noon < 0.02 && lit.dusk > 0.5 && lit.night > 0.98, 'lamp: dark at noon (' + lit.noon.toFixed(2) + '), lit at dusk (' + lit.dusk.toFixed(2) + ') and at night (' + lit.night.toFixed(2) + ')');
  await set(page, 121, 12.4, 4); await page.evaluate(() => { __li.light.setVis(0.4); __li.light.update(0, true); }); const fogNoon = await page.evaluate(() => __li.light.state());
  ok(fogNoon.on > 0.98 && fogNoon.rangeNm < 1.0, 'lamp lit at noon in fog (vis 0.4 km): on ' + fogNoon.on.toFixed(2) + ', range ' + fogNoon.rangeNm.toFixed(2) + ' nm');
  /* range follows the weather */
  const rg = await page.evaluate(() => { const out = []; for (const v of [40, 10, 2, 0.4]) { __li.light.setVis(v); __li.light.update(0, true); out.push([v, __li.light.rangeNm(), __li.light.ringRadius()]); } return out; });
  ok(rg.every((x, i) => i === 0 || x[1] < rg[i - 1][1]) && rg.every((x, i) => i === 0 || x[2] < rg[i - 1][2]), 'range and ring radius fall as the visibility falls: ' + rg.map(x => x[0] + ' km: ' + x[1].toFixed(2) + ' nm, ring ' + x[2].toFixed(0) + ' m').join('; '));
  await page.evaluate(() => __li.light.setVis(null));
  /* arrivals */
  const ar = await page.evaluate(() => { const a = __li.light.arrivals(0, 24 * 20), b = __li.light.arrivals(0, 24 * 20), c = __li.light.arrivals(0, 24 * 20, { rung: null }), d = __li.light.arrivals(0, 24 * 20, { rung: 'big', marked: true }); return { a: JSON.stringify(a), b: JSON.stringify(b), n: a.events.length, sa: a.summary, sc: c.summary, sd: d.summary, key: a.events[0] && a.events[0].key, ex: a.events[0] }; });
  ok(ar.a === ar.b && ar.n > 3, 'arrivals API is deterministic (' + ar.n + ' boats in 20 days, first ' + ar.key + ')');
  ok(ar.sa.landed > ar.sc.landed && ar.sa.seenByLight > 0, 'with the big lens ' + ar.sa.landed + ' of ' + ar.sa.boats + ' boats land against ' + ar.sc.landed + ' with no light; ' + ar.sa.seenByLight + ' were seen by the light');
  ok(ar.sd.wrecked <= ar.sa.wrecked, 'a marked harbour mouth wrecks no more boats than an unmarked one (' + ar.sd.wrecked + ' against ' + ar.sa.wrecked + ')');
  const see = await page.evaluate(() => [__li.light.arrivalSeen(40, 12, { night: true }), __li.light.arrivalSeen(0.4, 12, { night: true }), __li.light.arrivalSeen(40, 12, { night: true, rung: null })]);
  ok(see[0].seen && !see[1].seen && !see[2].seen, 'arrivalSeen: seen at 12 nm in clear night air, not in fog, not without a light');
  /* a wreck makes a morning salvage crate */
  const sv = await page.evaluate(() => { const r = __li.light.arrivals(0, 24 * 120, { rung: 'big', marked: false }); const e = r.events.find(e => e.salvage); return e ? { hour: e.salvage.hour, key: e.salvage.key, from: e.hour } : null; });
  ok(!!sv, 'a wreck was found in 120 days at an unmarked mouth: ' + (sv ? sv.key : 'none'));
  if (sv) {
    await page.evaluate(h => { __li.clock.setHours(h + 1.0); __li.clock.setSpeed(0); __li.light.update(0, true); }, sv.hour);
    await page.waitForTimeout(500); await page.evaluate(() => __li.light.update(0, true));
    const on = await page.evaluate(() => ({ crate: __li.light.parts().crate, s: __li.light.state().salvage }));
    await page.evaluate(h => { __li.clock.setHours(h + 40); __li.light.update(0, true); }, sv.hour); await page.waitForTimeout(300); await page.evaluate(() => __li.light.update(0, true));
    const later = await page.evaluate(() => __li.light.parts().crate);
    ok(on.crate && on.s && on.s.key === sv.key && !later, 'the salvage crate drifts near the reef the morning after the wreck (' + sv.key + ') and is gone a day later');
  }
  ok(errs.length === 0, 'rungs, characters, buttons, weather, arrivals and salvage: 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await page.close();
}

/* 4. no clock: ?lightnight=1, ?lvis, default sea */
{
  const a = await open('?ui=0&seed=1122&seat=3&light=1&lfreeze=2.25&q=low');
  const s0 = await a.page.evaluate(() => { __li.light.update(0, true); return __li.light.state(); });
  ok(s0.on < 0.02 && s0.tier === 'low' , 'no clock, no override: the lamp is dark by day (' + s0.on.toFixed(2) + ')');
  await a.page.evaluate(() => { __li.light.setNight(1); __li.light.update(0, true); }); const s1 = await a.page.evaluate(() => __li.light.state());
  ok(s1.on > 0.98, 'setNight(1) (the ?lightnight=1 override) lights the lamp without the clock (' + s1.on.toFixed(2) + ')');
  ok(a.errs.length === 0, 'no clock: 0 console errors'); await a.page.close();
  const b = await open('?ui=0&seed=1122&seat=3&light=1&lightnight=1&lfreeze=2.25&q=low&lrung=1&lchar=Oc8&lring=1'); const sb = await b.page.evaluate(() => { __li.light.update(0, true); return __li.light.state(); });
  ok(sb.on > 0.98 && sb.rung === 'post' && sb.char === 'Oc8' && sb.ring === true, '?lightnight=1&lrung=1&lchar=Oc8&lring=1: lit, post lamp, Oc 8s, ring on');
  ok(b.errs.length === 0, '?lightnight=1 page: 0 console errors'); await b.page.close();
}

/* 5. world pages */
if (!quick) for (const [qs, nm] of [['&world=153', 'world 153'], ['&world=5&life=1', 'world 5 with life']]) {
  const base2 = '?ui=0&clock=1&seat=3&cfreeze=1&light=1&lfreeze=2.25&q=high';
  const ref = await open(qs.replace('&', '?') + '&clock=1&seat=3&cfreeze=1&ui=0&q=high'); const rs = await stat(ref.page); const refH = rs.hash; await ref.page.close();
  const { page, errs } = await open(base2 + qs); const st = await stat(page);
  await set(page, 121, 23.0, 4); await settle(page, 2);
  const s = await page.evaluate(() => { const s = __li.light.state(); return { site: s.site, on: s.on, found: __li.light.parts().tower, y: s.site.y, minH: s.site.minH, h: __li.H(s.site.x, s.site.z) }; });
  ok(st.hash === refH, nm + ': world hash ' + st.hash + ' identical with and without &light=1');
  ok(s.found && s.on > 0.98 && Math.abs(s.h - s.y) < 1.5 && s.y > 0.5, nm + ': lighthouse stands on high ground (y ' + s.y.toFixed(1) + ' m, foundation to ' + s.minH.toFixed(1) + ' m) at (' + s.site.x.toFixed(0) + ', ' + s.site.z.toFixed(0) + '), lamp lit');
  ok(st.tris < 150000, nm + ': ' + st.tris + ' triangles with the clock' + (qs.includes('life') ? ', life' : '') + ' and the light on (budget 150,000)');
  for (const [tn, lst] of [['dusk', 20.0], ['night', 23.0]]) { await set(page, 121, lst, 4); await settle(page, 1); }
  ok(errs.length === 0, nm + ' with &light=1&clock=1 at dusk and night: 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await page.close();
}

/* 6. the beam in fog: a pixel brightness difference. Same night, same camera, same flash and beam angle; lamp forced on against forced off; fog against clear air. */
{
  const clip = { x: 0, y: 40, width: 640, height: 300 };
  async function shot(qsExtra) {
    const { page, errs } = await open('?ui=0&seed=1122&clock=1&seat=3&cfreeze=1&light=1&lfreeze=2.25&q=high&post=0' + qsExtra, 640, 360);
    await page.evaluate(() => { __li.clock.setSky(121, 23.0, 4); __li.clock.setSpeed(0); __li.light.view('tower', { dist: 150, phi: 0.2, side: 0.7 }); __li.light.setYaw(0); __li.light.update(0, true); });
    await settle(page, 3);
    const lOn = await lum(page, clip);
    await page.evaluate(() => { __li.light.setNight(0); __li.light.update(0, true); }); await settle(page, 2);
    const lOff = await lum(page, clip);
    await page.evaluate(() => { __li.light.setNight(null); __li.light.update(0, true); __li.light.hide('haze', true); __li.light.hide('card', true); __li.light.hide('streak', true); }); await settle(page, 2);
    const lNoBeam = await lum(page, clip);
    await page.close(); return { lOn, lOff, lNoBeam, errs };
  }
  const fog = await shot('&weather=fog&wt=1'), clr = await shot('');
  const dFog = fog.lOn - fog.lOff, dClr = clr.lOn - clr.lOff, beamFog = fog.lOn - fog.lNoBeam, beamClr = clr.lOn - clr.lNoBeam;
  ok(dFog > 2.0, 'fog at night: mean brightness of the beam region rises by ' + dFog.toFixed(2) + ' (of 255) with the light on (' + fog.lOff.toFixed(1) + ' to ' + fog.lOn.toFixed(1) + ')');
  ok(beamFog > 1.0 && beamFog > 3 * Math.max(beamClr, 0.05), 'the beam itself (blade, haze and sea streak) adds ' + beamFog.toFixed(2) + ' in fog against ' + beamClr.toFixed(2) + ' in clear air: it shows in fog and is nearly invisible in clear air');
  ok(dFog > dClr, 'the lit lamp matters more in fog than in clear air (+' + dFog.toFixed(2) + ' against +' + dClr.toFixed(2) + ')');
  ok(fog.errs.length === 0 && clr.errs.length === 0, 'beam pixel test pages: 0 console errors');
}

console.log('\n' + passes + ' passed, ' + fails + ' failed');
await browser.close();
process.exit(fails ? 1 : 0);
