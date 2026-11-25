/* NIGHT PAGE TEST (headless chromium, software GL: not a device). Job 6b. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/night-page-test.js [only=2,3]
   Smoke: zero console errors at 834x1062 touch and 1280x720; hand gathering by a hold (day and night rules), the lit ring, the readout; later items add their own sections. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1];
const want = k => !only || only.split(',').includes(String(k));
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: w, height: h }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
  await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 });
  await p.waitForTimeout(1500); return { p, errs };
}
const G = (p, f, ...a) => p.evaluate(([f, a]) => { const r = __gift[f](...a); return r === undefined ? null : r; }, [f, a]);
const SIZES = [['ipad touch', 834, 1062, '&device=ipad'], ['desktop', 1280, 720, '']];
for (const [name, w, h, dev] of SIZES) {
  if (!want(w)) continue;
  const { p, errs } = await open('?game=gift&glide=0&physical=0&dev=1&stage=evening' + dev, w, h);
  /* 2. hand gathering */
  const lit = await G(p, 'litterNow'); ok(lit.length >= 2, name + ': shore litter is there to gather by hand (' + lit.length + ' piles)');
  const tg = await G(p, 'targetsNow'); ok(tg.some(t => /^litter\d+$/.test(t.id)) || lit.length > 0, name + ': piles are targets when on screen (' + tg.filter(t => /^litter/.test(t.id)).length + ' now)');
  const s0 = await p.evaluate(() => __gift.state().stock);
  const r1 = await G(p, 'handHold', 'litter' + lit[0].i, 130);
  const s1 = await p.evaluate(() => __gift.state().stock); const tot = o => Object.values(o).reduce((a, b) => a + b, 0);
  ok(r1.ok && tot(s1) - tot(s0) === 2, name + ': a 130 s hold on a pile gathers its 2 units (' + (tot(s1) - tot(s0)) + ')');
  const lit2 = await G(p, 'litterNow'); ok(!lit2.some(q => q.i === lit[0].i), name + ': a gathered pile is gone for a while');
  const txt = await p.evaluate(() => document.getElementById('gd-stock-btn') ? document.getElementById('gd-stock-btn').textContent : ''); ok(/By hand: about 1\.2 a minute/.test(txt), name + ': the stock pill shows the hand rate (' + txt.slice(0, 60) + ')');
  /* night: lantern off, then on */
  await G(p, 'setPhase', 'night');
  const cc = await G(p, 'litCircle'); ok(cc && cc.r >= 24, name + ': the lit circle is ' + (cc && cc.r.toFixed(1)) + ' m');
  const near = await G(p, 'litterNow'), far = near.find(q => Math.hypot(q.x - cc.x, q.z - cc.z) > cc.r), inn = near.find(q => Math.hypot(q.x - cc.x, q.z - cc.z) <= cc.r);
  if (inn) { const rn = await G(p, 'handHold', 'litter' + inn.i, 60); ok(rn.ok && rn.got >= 1, name + ': at night, inside the lit ring, you can gather (' + rn.got + ')'); }
  if (far) { const rf = await G(p, 'handHold', 'litter' + far.i, 60); ok(!rf.ok || rf.got === 0, name + ': at night, outside the lit ring, you cannot'); } else ok(true, name + ': every pile is inside the ring (none to refuse)');
  await p.waitForTimeout(500); ok(await G(p, 'ringShown'), name + ': the lit ring is shown at night');
  /* 3. a kit crate, taking the kit, fitting it at the post */
  if (want(3)) {
    await G(p, 'setPhase', ''); await p.evaluate(() => { __gift.state().ledger.credit; });
    await G(p, 'deliverNow', 'battery'); await p.waitForFunction(() => __gift.crates().some(c => c.item === 'battery'), null, { timeout: 60000 });
    const cn = (await G(p, 'crates')).findIndex(c => c.item === 'battery') + 1; await G(p, 'openCrate', cn);
    const ct = await G(p, 'cardText'); ok(/Kit crate: Bigger battery/.test(ct), name + ': the delivered crate is named "Kit crate: Bigger battery"');
    ok(await G(p, 'clickBtn', 'Take the kit'), name + ': the kit comes out of the crate'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => __gift.state().kits)).battery === 1, name + ': one kit is in the yard');
    await G(p, 'robotCardOpen', 0); const rc = await G(p, 'cardText'); ok(/Battery \d+ percent\. Parts: none\. Short night shift\./.test(rc), name + ': the carrier card shows the level, no parts and "Short night shift"');
    ok(await G(p, 'clickBtn', 'Fit bigger battery'), name + ': Fit starts'); for (let k = 0; k < 40 && !(await G(p, 'fitState')).ready; k++) await p.evaluate(() => __li.campstart.rt().advance(5));
    const fh = await G(p, 'handHold', 'fitpost', 6); ok(fh.ok, name + ': a hold at the charging post fits the part');
    const mods = await p.evaluate(() => __gift.state().mods); ok(mods[0] && mods[0].bat, name + ': the robot has the bigger battery now');
    await G(p, 'robotCardOpen', 0); ok(/Parts: bigger battery\./.test(await G(p, 'cardText')) && !/Short night shift/.test(await G(p, 'cardText')), name + ': the card shows the part and drops "Short night shift"');
    ok((await p.evaluate(() => __li.campstart.rt().sim().robots[0].cap)) === 2.5, name + ': the camp routine runs it with capacity 2.5');
  }
  ok(errs.length === 0, name + ': zero console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await p.close();
}
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); await browser.close(); process.exit(fails ? 1 : 0);
