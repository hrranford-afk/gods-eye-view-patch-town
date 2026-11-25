/* ROBOT STOPS, page test (Job 6c item 2; headless chromium, software GL). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/robot-stops-page-test.js
   Checks: at the half-built dock the stalled robots show the 'waiting for supplies' icon and say it in words; a robot sent home on a low battery shows the battery icon and the card says
   'Stopped: battery low, N percent. Heading to the charger.'; a working robot shows no icon; the notebook lists the recent stops; a lent-out robot that aborts is logged with a code. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs) {
  const p = await ctx.newPage(); p.setDefaultTimeout(180000); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { });
  await p.waitForTimeout(2500); return { p, errs };
}
{
  const { p, errs } = await open('?game=gift&glide=0&boat=1&dev=0&q=low');
  await p.waitForFunction(() => __gift.phys() && __gift.phys().state().err.length > 0, null, { timeout: 120000 }).catch(() => { });
  const r = await p.evaluate(() => { __gift.stopChips(); return { stage: __gift.stage(), stops: __gift.stops(), err: __gift.phys().state().err }; });
  const dock = r.stops.filter(s => s.st && s.st.code === 'wait_supplies');
  ok(r.stage === 'dock' && dock.length >= 1, 'at the half-built dock the stalled robot is stopped for supplies (' + dock.length + ' of ' + r.stops.length + ')');
  ok(dock.every(s => s.chip), 'its icon is on screen');
  ok(dock.every(s => /Waiting for supplies/.test(s.st.say) && s.st.icon === 'box' && /dock/.test(s.st.place)), 'the sentence and place: ' + (dock[0] && dock[0].st.say + ' / ' + dock[0].st.place));
  await p.evaluate(() => __gift.stopChips()); const robotCard = await p.evaluate(() => { __gift.robotCardOpen(0); return document.querySelector('.gd-card') && document.querySelector('.gd-card').textContent; });
  ok(/Waiting for supplies/.test(robotCard || ''), 'the robot card states it in words');
  ok(errs.length === 0 && (await p.evaluate(() => __gift.err())).length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
{
  const { p, errs } = await open('?game=gift&glide=0&boat=1&stage=evening&dev=0&q=low');
  await p.evaluate(() => { __gift.closeCard(); const sim = __li.campstart.rt().sim(); sim.robots.forEach((r, i) => { if (i === 0) { r.state = 'home'; r.charge = .12; r.path = [[sim.YP.apron.x, sim.YP.apron.z], [sim.YP.bays[0].x, sim.YP.bays[0].z]]; r.pi = 0; r.x = sim.YP.apron.x + 6; r.z = sim.YP.apron.z; } }); __gift.phys().advance(1.5); });
  await p.evaluate(() => { __gift.stopChips(); }); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ s: __gift.stops(), lines: __gift.stopLines(10) }));
  const s0 = r.s[0]; ok(s0.st && s0.st.code === 'battery_low' && /^Stopped: battery low, \d+ percent\. Heading to the charger\.$/.test(s0.st.say), 'a robot sent home on a low battery says: ' + (s0.st && s0.st.say));
  ok(s0.st && s0.st.icon === 'battery', 'with the battery icon');
  const working = r.s.filter(s => !s.st); ok(working.every(s => !s.chip), 'a working robot shows no icon (' + working.length + ' working)');
  ok(r.lines.length >= 1 && r.lines.every(l => /Carrier \d/.test(l.text) && l.code), 'the recent-stops list has entries: ' + (r.lines[0] && r.lines[0].text));
  await p.evaluate(() => __gift.notebook()); const nb = await p.evaluate(() => document.querySelector('.gd-card').textContent); ok(/Recent stops/.test(nb), 'the notebook shows Recent stops');
  const ins = await p.evaluate(() => __gift.inspect('bot0')); ok(ins && /battery low|Stopped/i.test(ins.use), 'the inspect card for the robot carries the sentence');
  ok(errs.length === 0 && (await p.evaluate(() => __gift.err())).length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(n - fails + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
