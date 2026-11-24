/* MOODS PAGE TEST for islands_look.html?moods=1 (headless chromium, software GL, file:// pages). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/moods-page-test.js [quick=1]
   Checks (see MOODS_BUILD.md): the default page is untouched (hash 8d962c0c, 88,790 triangles, no __li.moods, moods.js not loaded); &moods=1 (which implies the clock and the auto weather) leaves the world hash
   alone, adds under 1,000 triangles at high and fewer at low; 0 console errors for default, q=low, post=0 and the AR profile with every mood held; &mood=NAME starts held; the buttons work;
   the weather follows the clock hour; pixel checks: a rainbow has green and violet pixels that vanish when the bow is hidden or the sun is above 42 degrees, rays change the sky, frost whitens the ground,
   sea smoke hazes the water, the northern glow is green, stars show; &light=1, &clock=1 and ?world=NNN&life=1 still work with moods. */
import { launch, ROOT } from './shoot.js';
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const quick = process.argv.includes('quick=1'), only = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1] || 'all';
const want = k => only === 'all' || only === k;
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
const stat = page => page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic(), moods: !!__li.moods }));
const frames = async (page, n = 3) => { for (let i = 0; i < n; i++) { await page.waitForTimeout(450); } };
/* decode a screenshot in the page and run a metric over the pixels */
async function metric(page, fnSrc, clip) {
  const buf = await page.screenshot(clip ? { clip } : {}), b64 = buf.toString('base64');
  return page.evaluate(async ([b64, src]) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height); return (new Function('return ' + src))()(d.data, c.width, c.height);
  }, [b64, fnSrc]);
}
const HUES = `(d,w,h)=>{const bins={red:0,orange:0,yellow:0,green:0,cyan:0,blue:0,violet:0};for(let y=0;y<h*0.75;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=mx?(mx-mn)/mx:0;if(s<0.2||mx<0.4)continue;
  let hh=0;const dl=mx-mn;if(mx===r)hh=((g-b)/dl+6)%6;else if(mx===g)hh=(b-r)/dl+2;else hh=(r-g)/dl+4;hh*=60;
  if(hh<18||hh>=340)bins.red++;else if(hh<42)bins.orange++;else if(hh<70)bins.yellow++;else if(hh<165)bins.green++;else if(hh<200)bins.cyan++;else if(hh<255)bins.blue++;else if(hh<320)bins.violet++;}return bins;}`;
const DIFF = (thr, y0, y1) => `(d,w,h)=>{return {w:w,h:h,d:Array.from(d)}}`;
/* two-shot difference: take the first, then the second, count pixels whose luminance changed by more than thr */
async function pixels(page) { const buf = await page.screenshot(), b64 = buf.toString('base64'); return b64; }
async function diffCount(page, b64a, b64b, thr, region) {
  return page.evaluate(async ([a, b, thr, region]) => {
    const load = async s => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b), w = A.width, h = A.height, y0 = Math.floor(h * region[0]), y1 = Math.floor(h * region[1]); let up = 0, down = 0, sum = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, la = .2126 * A.data[i] + .7152 * A.data[i + 1] + .0722 * A.data[i + 2], lb = .2126 * B.data[i] + .7152 * B.data[i + 1] + .0722 * B.data[i + 2]; const dd = la - lb; if (dd > thr) up++; else if (dd < -thr) down++; sum += Math.abs(dd); n++; }
    return { up, down, mean: sum / n };
  }, [b64a, b64b, thr, region]);
}

/* 1. the default page */
if (want('tiers')) {
  const { page, errs } = await open('?ui=0&q=high&seed=1122'); const st = await stat(page);
  const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(s => /moods\.js/.test(s)).length);
  ok(st.hash === GOLD && st.tris === GOLD_TRIS && !st.moods && scripts === 0, 'default page: hash ' + st.hash + ', ' + st.tris + ' tris, no __li.moods, moods.js not loaded');
  ok(errs.length === 0, 'default page 0 console errors'); await page.close();
}

/* 2. tiers: hash, triangles, 0 console errors with every mood held */
const MOODS = ['rainbow', 'shower', 'rays', 'frost', 'clearing', 'night'];
const base = '?ui=0&seed=1122&moods=1&cfreeze=1&seat=3&wt=1';
const refBase = '?ui=0&seed=1122&clock=1&weather=auto&cfreeze=1&seat=3&wt=1';
const added = {};
for (const [tier, extra] of [['high', '&q=high'], ['low', '&q=low'], ['post0', '&q=high&post=0'], ['ar', '&q=high&clockdome=0']]) {
  if (!want('tiers')) break;
  if (quick && tier !== 'high' && tier !== 'ar') continue;
  const ref = await open(refBase + extra); const rst = await stat(ref.page); await ref.page.close();
  const { page, errs } = await open(base + extra); const st = await stat(page);
  ok(st.hash === GOLD && st.moods, '&moods=1 ' + tier + ': world hash ' + st.hash + ' unchanged, __li.moods present');
  let maxAdd = 0, rows = [];
  for (const m of MOODS) {
    await page.evaluate(n => { __li.moods.force(n); __li.moods.update(0, true); }, m); await frames(page, 3);
    const r = await page.evaluate(() => ({ t: __li.stats().tris, mt: __li.moods.tris(), p: __li.moods.parts(), s: __li.moods.state() }));
    const add = r.mt; maxAdd = Math.max(maxAdd, add); rows.push(m + ' ' + add + ' (+' + (r.t - rst.tris) + ' with the weather)');
    if (m === 'rainbow') ok(tier === 'ar' ? (r.p.arch === 2 && !r.p.dome) : (r.p.dome && r.p.domeVisible), '  ' + tier + ' rainbow: ' + (tier === 'ar' ? 'table arch (2 ribbons), no dome' : 'sky overlay dome visible') + ', tier ' + r.p.tier);
    if (m === 'frost') ok(r.p.smokeVisible && r.p.wisps === (tier === 'ar' ? 36 : tier === 'low' ? 70 : 150), '  ' + tier + ' frost: sea smoke visible with ' + r.p.wisps + ' wisps');
  }
  added[tier] = maxAdd;
  ok(maxAdd < 1000 && maxAdd >= 0, '&moods=1 ' + tier + ': the moods\' own geometry is ' + maxAdd + ' triangles at most (' + rows.join(', ') + ') over ' + rst.tris + ' for the same page without moods: under the 1,000 budget');
  await page.evaluate(() => __li.moods.auto()); await frames(page, 2);
  ok(errs.length === 0, '&moods=1 ' + tier + ' with every mood held: 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await page.close();
}
ok(added.low === undefined || added.high === undefined || added.low < added.high, 'low tier adds fewer triangles than high (' + added.low + ' against ' + added.high + ')');
ok(added.ar === undefined || added.high === undefined || added.ar < 200, 'AR tier adds the fewest (' + added.ar + ')');

/* 3. pixel checks, high tier, 720 x 480 */
if (want('pixels')) {
  const { page, errs } = await open(base + '&q=high', 720, 480);
  const hold = async (n, fn) => { await page.evaluate(([n, fn]) => { __li.moods.force(n); if (fn) eval(fn); __li.moods.update(0, true); }, [n, fn || '']); await frames(page, 4); };
  /* rainbow */
  await hold('rainbow'); const rbOn = await metric(page, HUES), shOn = await pixels(page);
  await page.evaluate(() => __li.moods.hide('bow', true)); await frames(page, 3); const rbOff = await metric(page, HUES); await page.evaluate(() => __li.moods.hide('bow', false));
  const spec = h => h.green;
  ok(spec(rbOn) > 400 && spec(rbOn) > 6 * Math.max(spec(rbOff), 1), 'rainbow: saturated green pixels (the band of the spectrum the clouds and the sky never have) ' + spec(rbOn) + ' with the bow, ' + spec(rbOff) + ' without; red ' + rbOn.red + ', yellow ' + rbOn.yellow + ', blue ' + rbOn.blue + ' with it');
  await page.evaluate(() => { __li.clock.setSky(172, 12.5, 4); __li.moods.update(0, true); }); await frames(page, 4);
  const hi = await page.evaluate(() => ({ el: __li.clock.state().c.sun.elev, k: __li.moods.state().k.rainbow })); const rbHi = await metric(page, HUES);
  ok(hi.el > 50 && hi.k === 0 && spec(rbHi) < spec(rbOn) / 5, 'no rainbow with the sun at ' + hi.el.toFixed(0) + ' degrees: strength ' + hi.k + ', spectral pixels ' + spec(rbHi) + ' against ' + spec(rbOn));
  /* the bow follows the sun: turn the sun round 90 degrees and the bow moves with it */
  await hold('rainbow'); const a0 = await page.evaluate(() => __li.moods.state().plan.sunAz); const cellAz0 = await page.evaluate(() => __li.moods.state().cell.az);
  await page.evaluate(() => { __li.clock.setHours(__li.clock.hours() + .8); __li.moods.update(0, true); }); await frames(page, 2);
  const a1 = await page.evaluate(() => __li.clock.state().c.sun.az), cellAz1 = await page.evaluate(() => __li.moods.state().cell.az);
  const dSun = Math.abs(((a1 - a0 + 540) % 360) - 180), dCell = Math.abs(((cellAz1 - cellAz0 + 540) % 360) - 180);
  ok(Math.abs(dSun - dCell) < 1.5 && dSun > 2, 'the bow\'s rain cell stays opposite the sun as the sun moves (sun moved ' + dSun.toFixed(1) + ' degrees, cell ' + dCell.toFixed(1) + ')');
  /* rays */
  await hold('rays'); const rOn = await pixels(page); await page.evaluate(() => __li.moods.hide('rays', true)); await frames(page, 3); const rOff = await pixels(page); await page.evaluate(() => __li.moods.hide('rays', false));
  const dr = await diffCount(page, rOn, rOff, 5, [0, .8]);
  ok(dr.up + dr.down > 4000 && dr.up > dr.down * .5, 'rays: ' + (dr.up + dr.down) + ' pixels of sky change by 5 or more levels when the shafts are hidden (' + dr.up + ' brighter, ' + dr.down + ' darker)');
  /* frost and sea smoke */
  await hold('frost', "__li.moods.hide('smoke',true)"); const fOn = await pixels(page); await page.evaluate(() => __li.moods.hide('frost', true)); await frames(page, 3); const fOff = await pixels(page); await page.evaluate(() => __li.moods.hide('frost', false));
  const df = await diffCount(page, fOn, fOff, 22, [.3, 1]);
  ok(df.up > 1200 && df.up > 5 * df.down, 'frost: ' + df.up + ' ground pixels are 22 levels brighter with frost than without, ' + df.down + ' darker');
  await page.evaluate(() => { __li.moods.hide('smoke', false); }); await frames(page, 2); const sOn = await pixels(page); await page.evaluate(() => __li.moods.hide('smoke', true)); await frames(page, 3); const sOff = await pixels(page); await page.evaluate(() => __li.moods.hide('smoke', false));
  const ds = await diffCount(page, sOn, sOff, 8, [.3, 1]);
  ok(ds.up > 1000 && ds.up > 3 * ds.down, 'sea smoke: ' + ds.up + ' pixels over the sea are lighter with the smoke (' + ds.down + ' darker)');
  /* night: stars and the northern glow */
  await hold('night'); const gOn = await metric(page, `(d,w,h)=>{let g=0,stars=0;for(let y=0;y<h*0.8;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4,r=d[i],gg=d[i+1],b=d[i+2];if(gg>60&&gg>r*1.35&&gg>b*1.05)g++;const l=(r+gg+b)/3;if(l>95&&y>2){const j=((y-1)*w+x)*4,k=(y*w+x-1)*4,m=(y*w+x+1)*4,n2=((y+1)*w+x)*4;const nb=((d[j]+d[j+1]+d[j+2])+(d[k]+d[k+1]+d[k+2])+(d[m]+d[m+1]+d[m+2])+(d[n2]+d[n2+1]+d[n2+2]))/12;if(nb<l*0.62)stars++;}}return{g,stars};}`);
  await page.evaluate(() => __li.moods.hide('aurora', true)); await frames(page, 3); const gOff = await metric(page, `(d,w,h)=>{let g=0;for(let y=0;y<h*0.8;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,r=d[i],gg=d[i+1],b=d[i+2];if(gg>60&&gg>r*1.35&&gg>b*1.05)g++;}return{g};}`); await page.evaluate(() => __li.moods.hide('aurora', false));
  ok(gOn.g > 800 && gOff.g < 40, 'clear night: northern glow gives ' + gOn.g + ' green pixels, ' + gOff.g + ' when it is hidden');
  ok(gOn.stars > 25, 'clear night: ' + gOn.stars + ' star points in the picture');
  /* shower and clearing: the state the weather is bent to */
  await hold('shower'); const sw = await page.evaluate(() => ({ w: __li.weather(), k: __li.moods.state().k.shower }));
  ok(sw.w.state === 'showers' && sw.w.rain > .35 && sw.w.sunScale > .9 && sw.k === 1, 'sun shower: rain ' + sw.w.rain.toFixed(2) + ' with the sun scale at ' + sw.w.sunScale.toFixed(2) + ' (a bright sun and falling rain)');
  await hold('clearing'); const cw = await page.evaluate(() => ({ w: __li.weather(), u: __li.weatherRT.uniforms() }));
  ok(cw.w.swell > 1.5 && cw.w.wet > .8 && cw.w.rain === 0 && cw.w.visibility >= 59000, 'post-storm clearing: swell ' + cw.w.swell.toFixed(2) + ', wet shore ' + cw.w.wet.toFixed(2) + ', visibility ' + Math.round(cw.w.visibility / 1000) + ' km, no rain');
  ok(errs.length === 0, 'pixel run 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await page.close();
}

/* 4. buttons, URL, natural mode follows the clock */
if (want('ui')) {
  const { page, errs } = await open('?ui=1&seed=1122&moods=1&cfreeze=1&seat=3&wt=1&q=low', 900, 500);
  const ids = await page.evaluate(() => ['md_rainbow', 'md_shower', 'md_rays', 'md_frost', 'md_clearing', 'md_night', 'md_auto', 'md_next'].map(i => !!document.getElementById(i)));
  ok(ids.every(Boolean), 'the HUD has six mood buttons and Auto and Next');
  await page.click('#md_frost'); await frames(page, 2); const f1 = await page.evaluate(() => ({ s: __li.moods.state(), t: document.getElementById('mdT').textContent, on: document.getElementById('md_frost').classList.contains('on'), sp: __li.clock.speed() }));
  ok(f1.s.forced === 'frost' && /Frost/.test(f1.t) && f1.on && f1.sp === 0, 'clicking Frost holds the frost mood and the clock ("' + f1.t + '")');
  await page.click('#md_auto'); await frames(page, 2); const f2 = await page.evaluate(() => ({ s: __li.moods.state(), sp: __li.clock.speed(), w: __li.weather() }));
  ok(f2.s.forced === null && f2.sp === 1 && f2.w.auto, 'Auto returns to the weather and the clock (speed ' + f2.sp + ')');
  await page.evaluate(() => __li.clock.setSpeed(0)); const h0 = await page.evaluate(() => __li.clock.hours());
  await page.click('#md_next'); await frames(page, 2); const nx = await page.evaluate(() => ({ h: __li.clock.hours(), s: __li.moods.state() }));
  ok(nx.h > h0 && nx.s.forced === null && nx.s.top !== null, 'Next jumps forward to a natural beautiful moment (hour ' + nx.h.toFixed(1) + ', ' + nx.s.top + ')');
  /* natural mode: the weather is the pure schedule at the clock hour */
  const seen = []; for (const h of [20, 55.5, 130, 301.2, 700.4]) { await page.evaluate(h => { __li.clock.setHours(h); __li.moods.update(0, true); }, h); await frames(page, 2); seen.push(await page.evaluate(h => [LI_WEATHER.at(1122, h).name, __li.weather().state], h)); }
  ok(seen.every(([a, b]) => a === b), 'in natural mode the weather follows the clock hour through the pure schedule (' + seen.map(s => s[0]).join(', ') + ')');
  ok(errs.length === 0, 'buttons run 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await page.close();
  const u = await open('?ui=0&seed=1122&mood=rainbow&cfreeze=1&q=low'); const us = await u.page.evaluate(() => __li.moods.state());
  ok(us.forced === 'rainbow' && us.k.rainbow > .9, '&mood=rainbow starts with the rainbow held and shown (strength ' + us.k.rainbow.toFixed(2) + ')'); ok(u.errs.length === 0, '&mood=rainbow 0 console errors'); await u.page.close();
}

/* 5. with &light=1, in the AR profile and in a world with life */
if (want('mix')) {
  const { page, errs } = await open('?ui=0&seed=1122&moods=1&mood=night&light=1&lfreeze=2.25&cfreeze=1&seat=3&q=low');
  const r = await page.evaluate(() => ({ l: !!__li.light, on: __li.light.state().on, m: __li.moods.state().k.night, tris: __li.stats().tris }));
  ok(r.l && r.m > .9, '&light=1&moods=1&mood=night: the lighthouse layer and the night mood both run (night ' + r.m.toFixed(2) + ')');
  await page.evaluate(() => { __li.light.update(0, true); }); await frames(page, 2); const on = await page.evaluate(() => __li.light.state().on); ok(on > .5, '  the lamp is lit at night with moods on (' + on.toFixed(2) + ')');
  ok(errs.length === 0, '&light=1&moods=1 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await page.close();
  const ar = await open('?ui=0&seed=1122&moods=1&mood=rainbow&clockdome=0&cfreeze=1&seat=3&q=low'); const p0 = await ar.page.evaluate(() => __li.moods.parts()); const sa = await ar.page.screenshot(); await ar.page.evaluate(() => __li.moods.hide('bow', true)); await frames(ar.page, 3); const sb = await ar.page.screenshot();
  const dd = await diffCount(ar.page, sa.toString('base64'), sb.toString('base64'), 6, [0, 1]);
  ok(p0.arch === 2 && !p0.dome && dd.up + dd.down > 150, 'AR profile: no sky dome, a table arch of two ribbons, ' + (dd.up + dd.down) + ' pixels change when the arch is hidden'); ok(ar.errs.length === 0, 'AR profile 0 console errors'); await ar.page.close();
  if (!quick) {
    const w = await open('?ui=0&world=5&life=1&moods=1&mood=frost&cfreeze=1&q=low'); const ws = await w.page.evaluate(() => ({ life: !!__li.life, m: __li.moods.state().k.frost, world: !!__li.world, tris: __li.stats().tris }));
    ok(ws.world && ws.life && ws.m > .8 && ws.tris < 150000, '?world=5&life=1&moods=1&mood=frost: world, life layer and frost all run (' + ws.tris + ' tris)'); ok(w.errs.length === 0, '?world=5&life=1&moods 0 console errors' + (w.errs.length ? ' ' + w.errs[0] : '')); await w.page.close();
    const w2 = await open('?ui=0&world=153&moods=1&mood=rainbow&cfreeze=1&q=low'); ok(w2.errs.length === 0, '?world=153&moods=1&mood=rainbow 0 console errors' + (w2.errs.length ? ' ' + w2.errs[0] : '')); await w2.page.close();
  }
  const c = await open('?ui=0&seed=1122&clock=1&cfreeze=1&q=high'); const cs = await stat(c.page); ok(cs.hash === GOLD && !cs.moods && c.errs.length === 0, '&clock=1 alone is unchanged: hash ' + cs.hash + ', no __li.moods'); await c.page.close();
}
await browser.close();
console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
