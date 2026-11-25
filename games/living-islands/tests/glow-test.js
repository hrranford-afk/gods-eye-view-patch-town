/* THE LIT-UP BOX, page test (Job 6c item 3; headless chromium, software GL). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/glow-test.js
   The owner met a box on the first evening that was lit up with nothing to do: the heavy evening crate (it needs a robot at the far end, and at night or with no robot running none can come).
   Walks a scripted day (the dock opening, every stage, the evening crate with a free robot, with every robot sheltering at night, in rain, with no robot running) and asserts for EVERY target and every glow:
   a name and a use line, either an action or a stated reason, a gold glow only on something you can act on now, a marker or hint ring only on something unlocked, and the hint line is not empty while a marker shows. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: 1280, height: 720 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0&dev=0' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); return { p, errs };
}
/* one audit of the page as it is now */
const audit = p => p.evaluate(() => {
  const T = __gift.targetsNow(), out = { targets: [], problems: [] }, g = __gift.glow(), gold = g.gold;
  T.forEach(t => { const i = __gift.inspect(t.id); if (!i) { out.problems.push(t.id + ': no info'); return; } out.targets.push(t.id + (i.locked ? ' (locked)' : ''));
    if (!i.name || !i.use) out.problems.push(t.id + ': no name or use line'); if (!i.action && !i.locked) out.problems.push(t.id + ': no action and no stated reason'); if (i.locked && i.locked.length < 8) out.problems.push(t.id + ': reason too short'); });
  if (gold) { const t = T.find(q => q.id === gold); if (t) { const i = __gift.inspect(gold); if (!i || i.locked || !i.action) out.problems.push('the gold glow is on ' + gold + ' which cannot be acted on now (' + (i && (i.locked || 'no action')) + ')'); } }
  if (g.mk && !g.hint) out.problems.push('a marker shows (' + g.mk.tag + ') and the hint line is empty');
  if (g.mk && ['crate', 'heavy', 'open', 'beam', 'beamA', 'site'].includes(g.mk.tag)) { if (!gold) out.problems.push('the ' + g.mk.tag + ' marker has no gold object behind it'); }
  if (g.ring && g.ringLocked) out.problems.push('the hint ring sits on something locked');
  out.mk = g.mk && g.mk.tag; out.gold = gold; out.hint = g.hint; return out; });
const report = (label, a) => ok(a.problems.length === 0, label + ': ' + a.targets.length + ' targets, marker ' + a.mk + ', gold ' + a.gold + ', hint "' + a.hint + '"' + (a.problems.length ? ' PROBLEMS ' + a.problems.join(' | ') : ''));
{
  const { p, errs } = await open(''); await p.evaluate(() => __gift.phys().advance(3)); report('the dock opening', await audit(p)); await p.evaluate(() => __gift.phys().advance(40)); report('the dock opening, 40 s later', await audit(p));
  for (const st of ['arrive', 'jobs', 'delivery', 'yard', 'night', 'done']) { await p.evaluate(s => __gift.skipTo(s), st); await p.waitForTimeout(1800); await p.evaluate(() => __gift.phys().advance(2)); report('stage ' + st, await audit(p)); }
  ok(errs.length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
{
  const { p, errs } = await open('&stage=evening'); await p.evaluate(() => { __gift.startEvening(); });
  for (let k = 0; k < 40; k++) { const m = await p.evaluate(() => { __gift.phys().advance(4); const s = __gift.phys().state().marker; return s && s.tag; }); if (m === 'heavy') break; }
  const a = await audit(p); report('evening, the heavy letter crate on the beach, a robot free', a); ok(a.mk === 'heavy' && a.gold === 'crate' + (await p.evaluate(() => __gift.crates().length)), 'the heavy crate glows gold when a robot can come (marker ' + a.mk + ', gold ' + a.gold + ')');
  const info = await p.evaluate(() => __gift.inspect('crate' + __gift.crates().length)); ok(info && !info.locked && /tap to call/i.test(info.needs), 'and it says what it needs: "' + (info && info.needs) + '"');
  const nN = await p.evaluate(() => __gift.crates().length);
  ok(/Tap the crate/.test(a.hint), 'the hint line tells you to tap it: "' + a.hint + '"');
  /* every robot switched off (a part not fitted yet, the first evening): it must not glow, and says why */
  await p.evaluate(() => { __gift.setRobots([false, false, false]); __gift.phys().advance(1); }); await p.waitForTimeout(1500);
  let b = await audit(p); report('the same crate with no robot running', b);
  const ib = await p.evaluate(n => __gift.inspect('crate' + n), nN); ok(b.mk !== 'heavy' && b.gold !== 'crate' + nN && ib && /No robot is running/.test(ib.locked || ''), 'it does not glow and says why: "' + (ib && ib.locked) + '"');
  const tapped = await p.evaluate(n => { __gift.act('crate' + n); return __gift.toast(); }, nN); ok(/No robot is running/.test(tapped || ''), 'tapping it states the reason: "' + tapped + '"');
  const noBeam = await p.evaluate(() => __gift.phys().state().beam); ok(!noBeam, 'and no beam is started that could never finish');
  ok(b.hint.length > 5, 'the hint line is not empty: "' + b.hint + '"');
  await p.evaluate(() => { __gift.setRobots([true, true, true]); __li.campstart.rt().sim().robots.forEach(r => { r.charge = .9; r.state = 'bay'; r.timer = 0; }); __gift.phys().advance(1); }); await p.waitForTimeout(1500); b = await audit(p); report('robots running again', b);
  ok(b.mk === 'heavy', 'with a robot running the crate lights up again (marker ' + b.mk + ')');
  ok(errs.length === 0 && (await p.evaluate(() => __gift.err())).length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(n - fails + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
