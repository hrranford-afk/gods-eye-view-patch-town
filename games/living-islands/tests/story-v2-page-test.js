/* STORY V2 PAGE TEST (Job 6e). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/story-v2-page-test.js [only=2]
   Desktop 1280x720 and ipad 834x1062 touch, no console errors. Section 2 calendar; 3 brass key; 4 dry boards; 5 cheap props (added item by item). */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => /^only=/.test(a)) || '').slice(5); const want = k => !only || only.split(',').includes(String(k));
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: w, height: h }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0&dev=0' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); return { p, errs };
}
for (const [label, qs, w, h] of [['desktop 1280x720', '', 1280, 720], ['ipad 834x1062 touch', '&device=ipad', 834, 1062]]) {
  const { p, errs } = await open(qs, w, h);
  if (want(2)) {
    const c = await p.evaluate(() => __gift.calendar()); ok(c.label === '1 May' && c.season === 'spring' && c.year === 1, label + ': day 1 is ' + c.long);
    await p.evaluate(() => __gift.setHour(24 * 30 + 8)); await p.waitForTimeout(1500); const c2 = await p.evaluate(() => ({ c: __gift.calendar(), t: (document.querySelector('#gd-strip b') || {}).title })); ok(c2.c.label === '1 June' && c2.t === c2.c.long, label + ': day 31 is ' + c2.c.label + ' and the Day chip says "' + c2.t + '"');
  }
  if (want(3)) {
    const k0 = await p.evaluate(() => ({ i: __gift.keyInfo(), m: __gift.keyMeshes(), ins: __gift.inspect('key'), t: __gift.targetsNow().some(t => t.id === 'key') }));
    ok(k0.m === 1 && k0.i.count === 1 && k0.t && k0.ins && k0.ins.name === 'The brass key' && /no second key/.test(k0.ins.use), label + ': one key mesh on the lid, shown in the inspect layer: "' + (k0.ins && k0.ins.use) + '"');
    await p.evaluate(() => __gift.letter1()); await p.waitForTimeout(500);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#gd-layer button')].find(x => /Keep it/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(900);
    const k1 = await p.evaluate(() => ({ i: __gift.keyInfo(), m: __gift.keyMeshes(), t: __gift.targetsNow().some(t => t.id === 'key') }));
    ok(k1.i.where === 'yours' && k1.m === 1 && !k1.t, label + ': after the lid is lifted the key is yours, still one, no key on the lid');
    await p.evaluate(() => { __gift.closeCard(); __gift.notebook(); }); await p.waitForTimeout(500);
    const nb = await p.evaluate(() => { const c = document.querySelector('#gd-layer .gd-card'); return c ? c.textContent : ''; });
    ok(/The brass key/.test(nb) && /no second key/.test(nb), label + ': the notebook lists the one key');
  }
  ok(errs.length === 0, label + ': no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}

/* ================= 4. dry boards: a storm, letter three kept, then take (desktop) or hand them back (ipad) ================= */
if (want(4)) for (const [label, qs, w, h, choice] of [['desktop 1280x720', '', 1280, 720, 'decline'], ['ipad 834x1062 touch', '&device=ipad', 834, 1062, 'take']]) {
  const { p, errs } = await open('&storm=1&stormsec=8&giftsave=1&physical=0' + qs, w, h); await p.evaluate(() => __gift.wipe()).catch(() => { });
  await p.evaluate(() => { __gift.skipTo('evening'); }); await p.waitForTimeout(1500); await p.evaluate(() => { __gift.closeCard(); });   /* as storm-page-test: a day with a crate or two first */
  await p.evaluate(() => __storm.start({ build: 8 })); await p.evaluate(() => { __storm.setTs(8 + 30 + 20); __storm.finish(); }); await p.waitForFunction(() => __storm.state().phase === 'haul', null, { timeout: 120000 }); await p.waitForTimeout(1500);
  const sv = await p.evaluate(() => __storm.save()); ok(sv.big === false, label + ': the first storm is small');
  await p.evaluate(() => { __gift.setHour(__storm.save().endGh + 48); }); await p.waitForFunction(() => __storm.save().l9 === 1, null, { timeout: 60000 }); await p.waitForTimeout(1500);
  let st = await p.evaluate(() => __gift.boards().state); ok(st === null, label + ': no offer before the letter is kept');
  const cr = await p.evaluate(() => __gift.crates().find(c => c.l9)); await p.evaluate(n => __gift.act('crate' + n), cr.n); await p.waitForTimeout(800);
  const lt = await p.evaluate(() => (document.querySelector('#gd-layer .gd-card') || {}).textContent || ''); ok(/Letter three/.test(lt) && /Let them work/.test(lt), label + ': the letter is L3');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#gd-layer button')].find(x => /Keep it/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(2800);
  st = await p.evaluate(() => __gift.boards().state); ok(st === 'offered', label + ': after the letter is kept the dry boards are offered (' + st + ')');
  const card = await p.evaluate(() => (document.querySelector('#gd-layer .gd-card') || {}).textContent || ''); ok(/Dry boards/.test(card) && /Take the dry boards/.test(card) && /Hand them back/.test(card), label + ': the card offers both: ' + card.slice(0, 90));
  const before = await p.evaluate(() => ({ pl: __gift.state().stock.planks, led: JSON.stringify(__gift.state().ledger.cash) + JSON.stringify(__gift.state().ledger.credit) }));
  await p.evaluate(c => { const b = [...document.querySelectorAll('#gd-layer button')].find(x => (c === 'take' ? /Take the dry boards/ : /Hand them back/).test(x.textContent)); if (b) b.click(); }, choice); await p.waitForTimeout(900);
  const after = await p.evaluate(() => ({ pl: __gift.state().stock.planks, led: JSON.stringify(__gift.state().ledger.cash) + JSON.stringify(__gift.state().ledger.credit), b: __gift.boards(), toast: __gift.toast() }));
  ok(after.b.state === (choice === 'take' ? 'taken' : 'declined') && after.b.declinedGift === (choice === 'decline'), label + ': ' + choice + ' -> ' + after.b.state + ', declinedGift ' + after.b.declinedGift);
  ok(after.pl === before.pl + (choice === 'take' ? 8 : 3) && after.led === before.led, label + ': planks ' + before.pl + ' to ' + after.pl + ', cash and credit unchanged');
  ok(/./.test(after.toast || '') && (choice === 'take' ? /Taken/.test(after.toast) : /Handed back.*nothing was a test/.test(after.toast)), label + ': it says why: "' + (after.toast || '').slice(0, 80) + '"');
  await p.evaluate(() => __gift.save()); await p.reload(); await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForTimeout(2500);
  const re = await p.evaluate(() => __gift.boards()); ok(re.state === after.b.state, label + ': the choice survives a reload (' + re.state + ')');
  if (choice === 'decline') { await p.evaluate(() => __gift.setHour(__gift.state().gh + 49)); await p.waitForTimeout(2500); const t = await p.evaluate(() => ({ b: __gift.boards().state, toast: __gift.toast() })); ok(t.b === 'tender' && /usual day/.test(t.toast || ''), label + ': two days later the tender keeps its usual day: "' + (t.toast || '').slice(0, 70) + '"'); }
  ok(errs.length === 0, label + ': no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
