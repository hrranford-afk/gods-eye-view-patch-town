/* HOLD FEEDBACK, page test (Job 6c item 4; headless chromium, software GL). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/hold-test.js
   For every hold or press action (dock and build stakes, stage hold, beam lift, heavy crate, light crate, lantern, kit fit, hand gather): a one-line hint BEFORE it, a visible cause (a bar with words and a
   percent, or the lit lantern) WHILE it goes on, and a short message AFTER it. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: 1280, height: 720 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0&dev=0' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); return { p, errs };
}
const bar = p => p.evaluate(() => { const e = document.getElementById('gd-holdbar'); return e && e.style.display !== 'none' ? e.textContent : null; });
const toast = p => p.evaluate(() => __gift.toast());
const adv = (p, s) => p.evaluate(s => __gift.phys().advance(s), s);
const hint = p => p.evaluate(() => __gift.phys().hint());
const st = p => p.evaluate(() => __gift.phys().state());
{
  const { p, errs } = await open('&stage=evening');
  /* 1 and 2: the site holds */
  for (const [stage, key, doing] of [[0, 'stake', 'Driving the stakes'], [1, 'hold', 'Setting this stage']]) {
    await p.evaluate(([s]) => __gift.phys().forceBuild('cistern', s), [stage]); await adv(p, 1);
    const h0 = await hint(p); ok(new RegExp('^Hold to ' + (key === 'stake' ? 'drive the stakes' : 'set this stage') + '\\.$').test(h0 || ''), key + ' before: the hint says "' + h0 + '"');
    await p.evaluate(() => __gift.phys().hold('psite')); await adv(p, .4); const b = await bar(p);
    ok(b && b.includes(doing) && /\d+ percent/.test(b), key + ' while: a bar shows the cause "' + b + '"');
    await adv(p, 2.5); const t = await toast(p); await p.evaluate(() => __gift.phys().hold(null)); const s2 = await st(p);
    ok(/cistern/i.test(t || '') && s2.ph.b && s2.ph.b.stage === stage + 1, key + ' after: "' + t + '" (stage ' + (s2.ph.b && s2.ph.b.stage) + ')');
    ok(!(await bar(p)), key + ': the bar goes away when the hold is done');
  }
  /* 3: the beam */
  await p.evaluate(() => { __gift.phys().forceBuild('cistern', 2); __li.campstart.rt().sim().robots.forEach(r => { r.charge = .9; }); });
  let at = false; for (let k = 0; k < 30 && !at; k++) { await adv(p, 4); const s = await st(p); at = !!(s.beam && s.beam.robotAt); }
  ok(at, 'the beam: a robot reaches its end');
  const hb = await hint(p); ok(hb === 'Hold to lift the beam.', 'beam before: the hint says "' + hb + '"');
  await p.evaluate(() => __gift.phys().hold('pbeamA')); await adv(p, 2); const bb = await bar(p); ok(bb && /Lifting the beam/.test(bb) && /[1-9]\d* percent/.test(bb), 'beam while: "' + bb + '"');
  for (let k = 0; k < 40; k++) { await adv(p, 3); const s = await st(p); if (!s.beam) break; } await p.evaluate(() => __gift.phys().hold(null)); const tb = await toast(p); ok(/The beam is down/.test(tb || ''), 'beam after: "' + tb + '"');
  /* 4: the heavy crate */
  await p.evaluate(() => { __gift.phys().forceBuild(null); __gift.startEvening(); __li.campstart.rt().sim().robots.forEach(r => { r.charge = .9; }); });
  let mk = null; for (let k = 0; k < 40 && mk !== 'heavy'; k++) { await adv(p, 4); const s = await st(p); mk = s.marker && s.marker.tag; }
  const nH = await p.evaluate(() => __gift.crates().length); const h1 = await hint(p); ok(mk === 'heavy' && /Tap the crate/.test(h1), 'heavy crate before (tap to call a robot): "' + h1 + '"');
  await p.evaluate(n => __gift.act('crate' + n), nH); let at2 = false; for (let k = 0; k < 30 && !at2; k++) { await adv(p, 4); const s = await st(p); at2 = !!(s.beam && s.beam.robotAt); }
  const h2 = await hint(p); ok(at2 && h2 === 'Hold to lift the crate.', 'heavy crate before (hold): the hint says "' + h2 + '"');
  await p.evaluate(() => __gift.phys().hold('pbeamA')); await adv(p, 2); const bh = await bar(p); ok(bh && /Lifting the crate/.test(bh), 'heavy crate while: "' + bh + '"');
  for (let k = 0; k < 40; k++) { await adv(p, 3); const s = await st(p); if (!s.beam) break; } await p.evaluate(() => __gift.phys().hold(null)); const th = await toast(p); ok(/Crate number \d+ is up at the yard/.test(th || ''), 'heavy crate after: "' + th + '"');
  /* 5: a light crate in your hands (no robot free) */
  await p.evaluate(() => { __gift.setRobots([false, false, false]); __gift.crateAdd('plain'); });
  let mk2 = null; for (let k = 0; k < 40 && mk2 !== 'crate'; k++) { await adv(p, 4); const s = await st(p); mk2 = s.marker && s.marker.tag; }
  const nL = await p.evaluate(() => __gift.crates().length); const h3 = await hint(p); ok(mk2 === 'crate' && h3 === 'Hold to carry the crate up.', 'light crate before: the hint says "' + h3 + '"');
  await p.evaluate(n => { __gift.phys().startCarry(n, false); __gift.phys().hold('pcrate' + n); }, nL); await adv(p, 1.5); const bl = await bar(p); ok(bl && /Carrying the crate up/.test(bl), 'light crate while: "' + bl + '"');
  for (let k = 0; k < 40; k++) { await adv(p, 3); const s = await p.evaluate(() => __gift.phys().holdStatus()); if (!s) break; } await p.evaluate(() => __gift.phys().hold(null)); const tl = await toast(p); ok(/Crate number \d+ is up at the yard/.test(tl || ''), 'light crate after: "' + tl + '"');
  ok(errs.length === 0 && (await p.evaluate(() => __gift.err())).length === 0 && (await p.evaluate(() => __gift.phys().state().errs)).length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
{
  const { p, errs } = await open('&stage=night'); await adv(p, 3);
  let mk = null; for (let k = 0; k < 10 && mk !== 'lantern'; k++) { await adv(p, 2); const s = await st(p); mk = s.marker && s.marker.tag; }
  const hl = await hint(p); ok(mk === 'lantern' && hl === 'Tap the lantern to light it.', 'lantern before: the hint says "' + hl + '"');
  await p.evaluate(() => __gift.act('plantern')); const tl = await toast(p); const lit = (await st(p)).ph.lantern; ok(lit && /lit the lantern/.test(tl || ''), 'lantern after: "' + tl + '" and the lantern is lit (the light and the flare are the visible cause)');
  /* kit fit */
  await p.evaluate(() => { __gift.giveKit('battery'); const sim = __li.campstart.rt().sim(); sim.robots[0].state = 'bay'; sim.robots[0].timer = 1e9; __gift.startFit(0, 'battery'); }); await p.waitForTimeout(2200);
  const hf = await p.evaluate(() => __gift.hintNow()); ok(/Hold on the charging post/.test(hf), 'kit fit before: the hint says "' + hf + '"');
  await p.evaluate(() => { const t = __gift.targets().find(q => q.id === 'fitpost'); window.__fp = t; });
  const fp = await p.evaluate(() => window.__fp); if (fp) { await p.mouse.move(fp.x, fp.y); await p.mouse.down(); await p.waitForTimeout(1500); const bf = await p.evaluate(() => { const e = document.getElementById('gd-hand'); return e && e.style.display !== 'none' ? e.textContent : null; }); await p.mouse.up(); ok(bf && /Fitting the part/.test(bf), 'kit fit while: "' + bf + '"'); } else ok(false, 'kit fit: the charging post is a target on screen');
  await p.evaluate(() => { __gift.handHold('fitpost', 5); }); const tf = await toast(p); ok(/Fitted: /.test(tf || ''), 'kit fit after: "' + tf + '"');
  /* hand gather */
  const lit0 = await p.evaluate(() => { const L = __gift.litterNow(); return L[0] && L[0].i; });
  if (lit0 !== undefined && lit0 !== null) {
    await p.evaluate(i => { const sp = __gift.litterNow().find(q => q.i === i); __li.setView({ tx: sp.x, tz: sp.z, dist: 22, phi: .9, theta: .6 }); }, lit0); await p.waitForTimeout(2500);
    const tgt = await p.evaluate(i => __gift.targets().find(q => q.id === 'litter' + i), lit0); const ins = await p.evaluate(i => __gift.inspect('litter' + i), lit0);
    ok(ins && /^Hold to gather/.test(ins.action), 'hand gather before: the card says "' + (ins && ins.action) + '" and "' + (ins && ins.needs) + '"');
    if (tgt && tgt.x > 0 && tgt.y > 0 && tgt.x < 1280 && tgt.y < 720) { await p.mouse.move(tgt.x, tgt.y); await p.mouse.down(); await p.waitForTimeout(1500); const bg = await p.evaluate(() => { const e = document.getElementById('gd-hand'); return e && e.style.display !== 'none' ? e.textContent : null; }); await p.mouse.up(); ok(bg && /Gathering .*Keep holding/.test(bg), 'hand gather while: "' + bg + '"'); }
    else ok(false, 'hand gather: the pile is on screen');
    await p.evaluate(i => { __gift.handHold('litter' + i, 52); }, lit0); const th = await toast(p); ok(/^\+1 .* by hand\.$/.test(th || ''), 'hand gather after: "' + th + '"');
  } else ok(false, 'hand gather: a pile to gather exists');
  ok(errs.length === 0 && (await p.evaluate(() => __gift.err())).length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(n - fails + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
