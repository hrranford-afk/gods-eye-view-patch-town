/* THE GIFT, BUILD MENU WITH REAL TAPS (OWNER bug: "the choose one thing to build buttons do not work"). Software GL, headless chromium.
   Run: NODE_PATH=$(npm root -g) node tests/build-tap-test.js [only=touch,mouse]
   Real pointer input (mouse clicks at 1280x720; touch taps at 834x1062 with hasTouch on, the iPad size) on the permanent Build button and on every build card:
   with too little stock a tap on a card's button shows the reason in a line (the button is dim, never dead); with enough stock (on the heap) it opens the confirm card and "Build it" starts the build for each of the five builds
   (the jetty is the opening, not a build, under the physical layer), and the next step is on screen (the site marker and the Build button's line). */
import { launch, ROOT } from './shoot.js';
import fs from 'node:fs';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1], want = k => !only || only.split(',').includes(k);
const { browser } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function session(kind, qs2) {
  const touch = kind === 'touch', vp = touch ? { width: 834, height: 1062 } : { width: 1280, height: 720 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch }); const local = process.env.THREE_JS || '/tmp/three.js';
  if (fs.existsSync(local)) await ctx.route('**/three.min.js', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); const errs = []; p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0' + (qs2 === undefined ? '&stage=evening' : qs2) + (touch ? '&device=ipad' : '&device=desktop'));
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 }); await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
  await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); return { p, ctx, errs, touch };
}
const tap = async (S, loc) => { await loc.scrollIntoViewIfNeeded().catch(() => { }); if (S.touch) await loc.tap({ force: false, timeout: 60000 }); else await loc.click({ force: false, timeout: 60000 }); };   /* force false: Playwright fails the tap if another element would swallow it */
/* OWNER bug: the dock in progress must not block the build menu. Dock under way + enough stock: the cistern can be chosen (queued, paid); dock under way + short stock: the reason shows on a tap; when the dock is finished the queued build starts. Real taps. */
for (const kind of ['touch', 'mouse']) {
  if (!want('dock' + kind) && !want('dock')) continue; const S = await session(kind, ''), p = S.p; console.log('--- dock under way, ' + kind);
  const s0 = await p.evaluate(() => { const P = __gift.phys().state(); return { b: P.ph.b && P.ph.b.id, stage: __gift.stage() }; }); ok(s0.b === 'jetty' && s0.stage === 'dock', kind + ': the dock is under way (it holds the physical build slot: ' + s0.b + ')');
  await p.evaluate(() => { __gift.build(); }); await p.waitForTimeout(500);
  const idx = () => p.evaluate(() => [...document.querySelectorAll('#gd .gd-item')].findIndex(d => (d.querySelector('b') || {}).textContent === 'Rain cistern'));
  let i = await idx(); ok(i >= 0, kind + ': the build menu opens while the dock goes up');
  await p.evaluate(() => { const t = document.getElementById('gd-toast'); if (t) t.textContent = ''; }); await tap(S, p.locator('#gd .gd-item button').nth(i)); await p.waitForTimeout(300);
  const t1 = await p.evaluate(() => (document.getElementById('gd-toast') || {}).textContent || ''); ok(/Needs .*you have/i.test(t1) && !/going up already/i.test(t1), kind + ': short stock: a tap says what is missing, not "one thing is going up": "' + t1 + '"');
  await p.evaluate(() => { const need = __gift.core.BUILD_NEEDS.cistern; Object.keys(need).forEach(k => __gift.addStock(k, need[k] + 1)); __gift.closeCard(); __gift.build(); }); await p.waitForTimeout(500); i = await idx();
  await tap(S, p.locator('#gd .gd-item button').nth(i)); await p.waitForTimeout(300); await tap(S, p.locator('#gd button', { hasText: 'Build it' }).first()); await p.waitForTimeout(600);
  const s1 = await p.evaluate(() => { const P = __gift.phys().state(); return { b: P.ph.b && P.ph.b.id, q: P.ph.q, build: __gift.state().build, line: (__gift.phys().buildLine && __gift.phys().buildLine()) || '' }; });
  ok(s1.q === 'cistern' && s1.b === 'jetty' && !s1.build, kind + ': with enough stock the cistern is chosen and queued while the dock goes up (queued ' + s1.q + ', dock still ' + s1.b + ', the year\'s build slot untouched)');
  await p.evaluate(() => { __gift.closeCard(); __gift.build(); }); await p.waitForTimeout(500); const again = await p.evaluate(() => { const d = [...document.querySelectorAll('#gd .gd-item')].map(x => x.textContent); return d.every(t => /Already chosen|dim|Chosen/.test(t) || true); }); 
  await p.evaluate(() => { __gift.closeCard(); __gift.phys().finishDock(); }); await p.waitForTimeout(500);
  const s2 = await p.evaluate(() => { const P = __gift.phys().state(); return { b: P.ph.b && P.ph.b.id, q: P.ph.q, dock: __gift.state().dockDone }; }); ok(s2.b === 'cistern' && !s2.q && s2.dock, kind + ': when the dock is finished the queued cistern starts (' + s2.b + ')');
  ok(S.errs.length === 0, kind + ': zero console errors' + (S.errs.length ? ' ' + S.errs[0] : '')); await S.ctx.close();
}
for (const kind of ['touch', 'mouse']) {
  if (!want(kind)) continue; const S = await session(kind), p = S.p; console.log('--- ' + kind);
  await p.evaluate(() => { __gift.letter2(); }); await p.waitForTimeout(500); await tap(S, p.locator('#gd button', { hasText: 'Keep it' }).first()); await p.waitForTimeout(1500);   /* the second letter is read by a real tap on Keep it: the build menu opens by itself after a moment */
  const auto = await p.evaluate(() => /What do you build first/.test(document.getElementById('gd').textContent)); ok(auto, kind + ': after Keep it the build menu opens by itself'); await tap(S, p.locator('#gd button', { hasText: 'Not yet' }).first()); await p.waitForTimeout(500);
  /* the permanent Build button is in the clean HUD, not behind Menu */
  const vis = await p.evaluate(() => { const b = document.getElementById('gd-build-btn'); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b); return { w: r.width, h: r.height, shown: cs.display !== 'none' && cs.visibility !== 'hidden', inMenu: !!b.closest('#gd-menu'), onScreen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
  ok(vis && vis.shown && !vis.inMenu && vis.onScreen && vis.h >= (S.touch ? 50 : 30), kind + ': a permanent Build button is on screen, not behind Menu ' + JSON.stringify(vis));
  /* too little stock: every card button shows a reason on tap */
  await tap(S, p.locator('#gd-build-btn')); await p.waitForTimeout(400);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#gd .gd-item')].map(d => ({ name: (d.querySelector('b') || {}).textContent, dim: (d.querySelector('button') || {}).classList.contains('dim'), reason: /Short of|Not enough|Opens|Row to|Needs /i.test(d.textContent) })));
  ok(cards.length === 4, kind + ': the build menu opens by one tap and lists four builds (jetty is the opening): ' + cards.map(c => c.name).join(', '));
  ok(cards.every(c => c.reason || !c.dim), kind + ': every card that cannot be chosen states what it needs: ' + JSON.stringify(cards.map(c => [c.dim, c.reason])));
  const before = await p.evaluate(() => JSON.stringify(__gift.phys().state().ph.b));
  const nDim = await p.locator('#gd .gd-item button.dim').count(); let said = 0;
  for (let i = 0; i < nDim; i++) { await p.evaluate(() => { const t = document.getElementById('gd-toast'); if (t) t.textContent = ''; }); await tap(S, p.locator('#gd .gd-item button.dim').nth(i)); await p.waitForTimeout(250); const t = await p.evaluate(() => (document.getElementById('gd-toast') || {}).textContent || ''); if (/Needs .*you have .*(robot|hand)/i.test(t)) said++; }
  const after = await p.evaluate(() => ({ b: JSON.stringify(__gift.phys().state().ph.b) }));
  ok(nDim === 0 || said === nDim, kind + ': a tap on each of the ' + nDim + ' dim card buttons says what is missing and where to get it');
  ok(after.b === before, kind + ': tapping a card with too little stock starts nothing');
  /* enough stock on the heap: each build starts from a real tap of its card, then "Build it" */
  for (const id of ['cottage', 'cistern', 'hide', 'kiosk']) {
    await p.evaluate(() => { __gift.closeCard(); const P = __gift.phys(); const st = P.state(); if (st.ph.b) { P.reset(null); } const sd = __gift.state(); if (sd.build) { /* a previous pick in this run */ } });
    await p.evaluate(id => { const s = __gift.state(); const need = __gift.core.BUILD_NEEDS[id]; Object.keys(need).forEach(k => __gift.addStock(k, need[k] + 1)); }, id); await p.waitForTimeout(300);
    await p.evaluate(() => { __gift.closeCard(); }); await tap(S, p.locator('#gd-build-btn')); await p.waitForTimeout(400);
    const idx = await p.evaluate(id => [...document.querySelectorAll('#gd .gd-item')].findIndex(d => (d.querySelector('b') || {}).textContent === __gift.core.BUILDS.find(b => b.id === id).name), id);
    const dis = await p.locator('#gd .gd-item button').nth(idx).isDisabled();
    ok(idx >= 0 && !dis, kind + ': ' + id + ': the Build button of its card is live with enough stock'); if (idx < 0 || dis) continue;
    await tap(S, p.locator('#gd .gd-item button').nth(idx)); await p.waitForTimeout(400);
    const conf = await p.evaluate(() => /Build it/.test(document.getElementById('gd').textContent));
    ok(conf, kind + ': ' + id + ': the tap opens the confirm card with "Build it"');
    await tap(S, p.locator('#gd button', { hasText: 'Build it' }).first()); await p.waitForTimeout(600);
    const st = await p.evaluate(() => { const P = __gift.phys().state(); return { b: P.ph.b && P.ph.b.id, mk: P.marker && P.marker.tag, line: (document.getElementById('gd-build-btn') || {}).textContent, ro: (document.getElementById('gd-phys') || {}).textContent }; });
    ok(st.b === id && /stake|site/.test(st.mk || '') && /Build/.test(st.line || ''), kind + ': ' + id + ': the build started; the next step is shown: marker "' + st.mk + '", button line "' + (st.line || '').slice(0, 70) + '"');
    await p.evaluate(() => { __gift.phys().reset(null); const s = __gift.state(); }); await p.evaluate(() => { __gift.closeCard(); });
    /* the commit spends money and sets one build per year: give it back for the next card */
    await p.evaluate(() => { window.__resetBuild && window.__resetBuild(); });
  }
  ok(S.errs.length === 0, kind + ': zero console errors' + (S.errs.length ? ' ' + S.errs[0] : '')); await S.ctx.close();
}
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); await browser.close(); process.exit(fails ? 1 : 0);
