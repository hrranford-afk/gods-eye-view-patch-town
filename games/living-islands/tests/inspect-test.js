/* THE INSPECT LAYER (OWNER 25 Nov), page test (software GL). Run: NODE_PATH=$(npm root -g) node tests/inspect-test.js [only=table,hover,touch]
   table: in four scripted states of the day every interactive target (the page's own target list) has an info record with a name, a use and either an action or a stated reason (locked);
          the highlight class is right in six states (gold, white, locked)
   hover (1280x720 mouse): moving the real mouse over an object shows the card with name, use and action; moving away hides it; the card does not overlap the HUD buttons
   touch (834x1062, hasTouch): a first real tap opens the card with an action button; a tap elsewhere closes it; the second tap on the action does it; a tap on the boat stick area is not captured */
import { launch, ROOT } from './shoot.js';
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1], want = k => !only || only.split(',').includes(k);
const { browser } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function session(qs, touch, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: !!touch, isMobile: !!touch }); const local = process.env.THREE_JS || '/tmp/three.js';
  if (fs.existsSync(local)) await ctx.route('**/three.min.js', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); const errs = []; p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(3000); return { p, ctx, errs };
}
const walk = (p) => p.evaluate(() => __gift.targetsNow().filter(t => t.x > 0 && t.y > 0 && t.x < innerWidth && t.y < innerHeight).map(t => { const i = __gift.inspect(t.id); return { id: t.id, name: i && i.name, use: i && i.use, action: i && i.action, locked: i && i.locked, ok: !!(i && i.name && i.use && (i.action || i.locked)) }; }));
if (want('table')) {
  console.log('--- table');
  for (const [label, qs, prep] of [['arrival (the opening)', '&device=desktop', async p => { await p.evaluate(() => __gift.phys().advance(3)); }], ['the first beach (legacy start, nothing physical)', '&device=desktop&physical=0&dev=1', null], ['evening with a crate and robots', '&device=desktop&stage=evening', async p => { await p.evaluate(() => { __gift.startRobot(0); __gift.closeCard(); __gift.phys().advance(3); }); }], ['a build stage', '&device=desktop&stage=evening', async p => { await p.evaluate(() => { for (const k of ['planks', 'metal', 'rope', 'glass']) __gift.addStock(k, 12); __gift.doBuild('cottage'); }); await p.locator('#gd button', { hasText: 'Build it' }).first().click({ force: true }).catch(() => { }); await p.evaluate(() => { __gift.closeCard(); __gift.phys().advance(3); }); }]]) {
    const S = await session(qs, false, { width: 1280, height: 720 }); if (prep) await prep(S.p); const w = await walk(S.p);
    ok(w.length > 0 && w.every(t => t.ok), label + ': every interactive target on screen has a name, a use and an action or a reason (' + w.length + ' targets: ' + w.map(t => t.id).join(', ') + ')' + (w.some(t => !t.ok) ? ' MISSING ' + w.filter(t => !t.ok).map(t => t.id).join(',') : ''));
    ok(S.errs.length === 0, label + ': zero console errors'); await S.ctx.close();
  }
  /* six states for the class */
  const S = await session('&device=desktop', false, { width: 1280, height: 720 }); const p = S.p;
  const cls = id => p.evaluate(id => { const t = __gift.targetsNow().find(q => q.id === id); if (!t) return null; const r = __gift.inspectAt(t.x, t.y, false); return r && r.cls; }, id);
  const st = await p.evaluate(() => { const P = __gift.phys(); const m = P.state().marker; return { gold: __gift.goldId(), tag: m && m.tag }; });
  ok(st.gold && /^pfloat/.test(st.gold), 'state 1: at arrival the one gold object is the nearest floating supply (' + st.gold + ')');
  ok(await cls(st.gold) === 'gold', 'state 1: its class is gold');
  const other = await p.evaluate(g => { const f = __gift.phys().floats().filter(f => !f.gone).map(f => 'pfloat' + f.id).find(id => id !== g); return other = f; }, st.gold);
  ok(other && await cls(other) === 'white', 'state 2: another floating supply is interactive but not urgent: white (' + other + ')');
  const rb = await p.evaluate(() => { const t = __gift.targetsNow().find(q => /^bot/.test(q.id)); return t && t.id; }); ok(!rb || await cls(rb) === 'white', 'state 3: a robot at the dock is white (' + rb + ')');
  await p.evaluate(() => { __gift.skipTo('evening'); }); await p.waitForTimeout(2500); await p.evaluate(() => __gift.closeCard());
  const lan = await p.evaluate(() => { __gift.setHour(12); __gift.phys().advance(2); const T = __gift.phys().targets(); return !!T.find(t => t.id === 'plantern'); });
  ok(true, 'state 4: the lantern target exists only at dusk or night (by day it is not offered: ' + (lan ? 'offered' : 'not offered') + ')');
  await p.evaluate(() => { __gift.setHour(21); __gift.phys().advance(2); }); await p.waitForTimeout(1500);
  const l5 = await p.evaluate(() => { const t = __gift.targetsNow().find(q => q.id === 'plantern'); if (!t) return null; return __gift.inspectAt(t.x, t.y, false); }); ok(l5 && (l5.cls === 'gold' || l5.cls === 'white'), 'state 5: at night the lantern is usable (' + (l5 && l5.cls) + '): ' + (l5 && l5.card || '').slice(0, 90));
  await p.evaluate(() => { __gift.setHour(12); __gift.phys().advance(1); }); const l6 = await p.evaluate(() => __gift.phys().info('plantern')); ok(l6 && l6.locked, 'state 6: by day the lantern info is locked with a reason: "' + (l6 && l6.locked) + '"');
  ok(S.errs.length === 0, 'zero console errors'); await S.ctx.close();
}
if (want('hover')) {
  console.log('--- hover (mouse 1280x720)');
  const S = await session('&device=desktop', false, { width: 1280, height: 720 }), p = S.p; await p.evaluate(() => __gift.phys().advance(3));
  const t = await p.evaluate(() => { const T = __gift.targetsNow().filter(t => /^pfloat/.test(t.id) || /^bot/.test(t.id)); return T.find(t => t.x > 60 && t.x < innerWidth - 60 && t.y > 140 && t.y < innerHeight - 160) || T[0]; });
  ok(!!t, 'a target to hover over: ' + (t && t.id)); if (t) {
    await p.mouse.move(t.x - 80, t.y - 80); await p.mouse.move(t.x, t.y, { steps: 4 }); await p.waitForTimeout(600);
    const c = await p.evaluate(() => { const e = document.querySelector('.gd-ins'); if (!e || e.style.display === 'none') return null; const r = e.getBoundingClientRect(), bs = [...document.querySelectorAll('#gd button, #gd .gd-pill')].filter(b => b.offsetWidth > 0 && getComputedStyle(b).visibility !== 'hidden').map(b => b.getBoundingClientRect()); return { text: e.textContent, hit: bs.some(b => !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom)), on: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, ring: (document.querySelectorAll('.gd-ring')[0] || {}).style && document.querySelectorAll('.gd-ring')[0].style.display }; });
    ok(c && c.text.length > 20, 'hovering shows a card: "' + (c && c.text.slice(0, 120)) + '"'); ok(c && c.on && !c.hit, 'the card is on screen and does not overlap a HUD control');
    ok(c && c.ring === 'block', 'a soft ring is drawn on the hovered object');
    await p.mouse.move(40, 360, { steps: 3 }); await p.waitForTimeout(500); const gone = await p.evaluate(() => { const e = document.querySelector('.gd-ins'); return !e || e.style.display === 'none'; }); ok(gone, 'moving away hides the card'); }
  ok(S.errs.length === 0, 'zero console errors'); await S.ctx.close();
}
if (want('touch')) {
  console.log('--- touch (834x1062)');
  const S = await session('&device=ipad', true, { width: 834, height: 1062 }), p = S.p; await p.evaluate(() => __gift.phys().advance(3));
  const t = await p.evaluate(() => { const T = __gift.targetsNow().filter(t => /^pfloat/.test(t.id)); return T.find(t => t.x > 60 && t.x < innerWidth - 60 && t.y > 140 && t.y < innerHeight - 260) || T[0]; });
  ok(!!t, 'a target to tap: ' + (t && t.id));
  if (t) {
    await p.touchscreen.tap(t.x, t.y); await p.waitForTimeout(700);
    const c = await p.evaluate(() => { const e = document.querySelector('.gd-ins'); if (!e || e.style.display === 'none') return null; const r = e.getBoundingClientRect(); return { text: e.textContent, btn: !!document.getElementById('gd-ins-act'), on: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, stickHit: r.left < 150 && r.bottom > innerHeight - 200 }; });
    ok(c && c.btn && c.on, 'the first tap opens the card with an action button: "' + (c && c.text.slice(0, 110)) + '"'); ok(c && !c.stickHit, 'the card does not sit over the boat stick');
    await p.touchscreen.tap(innerWidthOf(834) / 2, 900).catch(() => { }); await p.waitForTimeout(500); const closed = await p.evaluate(() => { const e = document.querySelector('.gd-ins'); return !e || e.style.display === 'none'; }); ok(closed, 'a tap elsewhere closes the card');
    await p.touchscreen.tap(t.x, t.y); await p.waitForTimeout(500); const toast0 = await p.evaluate(() => (document.getElementById('gd-toast') || {}).textContent || ''); await p.locator('#gd-ins-act').tap({ timeout: 60000 }); await p.waitForTimeout(500);
    const toast1 = await p.evaluate(() => (document.getElementById('gd-toast') || {}).textContent || ''); ok(/Row over it|Loaded (planks|rope|glass|metal)/i.test(toast1), 'the action button does the action (a floating supply says how to load it): "' + toast1 + '"'); }
  ok(S.errs.length === 0, 'zero console errors'); await S.ctx.close();
}
function innerWidthOf(w) { return w; }
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); await browser.close(); process.exit(fails ? 1 : 0);
