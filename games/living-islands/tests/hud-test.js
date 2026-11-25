/* GIFT HUD PASS, page test (headless chromium, software GL: not a device).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/hud-test.js [only=834]
   Checks in &game=gift (no &dev=1): the pilot and test buttons are hidden (only Turn plank, and only while a plank is held), no two visible controls overlap at
   834x1062, 1194x834, 390x844 and 1280x720, at most 7 visible controls at once, touch targets 52 px under the ipad preset, the hint is under 8 words, the Menu
   holds the rest, the old crowded HUD is still there with &dev=1, the default page is unchanged. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1];
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(180000); await p.setViewportSize({ width: w, height: h }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) { await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); }
  await p.waitForTimeout(2500); return { p, errs };
}
/* the visible controls and pills, with their boxes; nested ones (a button in a pill) are not overlaps */
const boxes = p => p.evaluate(() => {
  const out = []; const sel = 'button,select,input,.gd-pill,.pill,#rpHud *';
  document.querySelectorAll(sel).forEach(e => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return; if (e.closest('#gd-layer')) return; const b = e.getBoundingClientRect(); if (b.width < 4 || b.height < 4) return; if (e.id === 'gd-toast' || e.id === 'rpMsg') return;
    let pa = e.parentElement, nested = false; out.push({ id: e.id || e.tagName + '.' + String(e.className).slice(0, 12), tag: e.tagName, x: b.x, y: b.y, w: b.width, h: b.height, txt: (e.textContent || '').trim().slice(0, 24), ctl: /^(BUTTON|SELECT|INPUT)$/.test(e.tagName), el: out.length }); });
  /* mark containment */
  const els = [...document.querySelectorAll(sel)].filter(e => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .05) return false; if (e.closest('#gd-layer')) return false; const b = e.getBoundingClientRect(); return b.width >= 4 && b.height >= 4 && e.id !== 'gd-toast' && e.id !== 'rpMsg'; });
  out.forEach((o, i) => { o.anc = els.filter((q, j) => j !== i && q.contains(els[i])).length; o.kids = els.filter((q, j) => j !== i && els[i].contains(q)).length; o.rel = els.map((q, j) => (j !== i && (q.contains(els[i]) || els[i].contains(q))) ? j : -1).filter(j => j >= 0); }); return out; });
const overlaps = bs => { const bad = []; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; if (a.rel.includes(j)) continue; const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); if (ix > 3 && iy > 3) bad.push(a.id + ' "' + a.txt + '" x ' + b.id + ' "' + b.txt + '"'); } return bad; };
const SIZES = [['ipad portrait', 834, 1062, '&device=ipad'], ['ipad landscape', 1194, 834, '&device=ipad'], ['phone', 390, 844, '&device=phone'], ['desktop', 1280, 720, '']];
for (const [name, w, h, dev] of SIZES) {
  if (only && String(w) !== only) continue;
  for (const st of ['arrive', 'evening']) {
    const { p, errs } = await open('?game=gift&glide=0&stage=' + st + dev, w, h);
    const bs = await boxes(p); const ov = overlaps(bs);
    ok(ov.length === 0, name + ' ' + w + 'x' + h + ' (' + st + '): no two visible controls overlap' + (ov.length ? ': ' + ov.slice(0, 4).join(' | ') : ''));
    const ctl = bs.filter(b => b.ctl && b.kids === 0), top = bs.filter(b => b.ctl); ok(top.length <= 8, name + ' (' + st + '): ' + top.length + ' visible buttons and selects (' + top.map(b => b.txt || b.id).join(', ') + ')');
    const off = bs.filter(b => b.x < -1 || b.y < -1 || b.x + b.w > w + 1 || b.y + b.h > h + 1); ok(off.length === 0, name + ' (' + st + '): everything is on screen' + (off.length ? ': ' + off.map(o => o.id).join(',') : ''));
    const hidden = await p.evaluate(() => ['rpGo', 'rpSurge', 'rpBig', 'rpWalk', 'rpMore', 'homeBtn', 'qBtn', 'ckSky', 'ckDusk', 'autoBtn', 'tide'].every(id => { const e = document.getElementById(id); return !e || e.getBoundingClientRect().width === 0; }));
    ok(hidden, name + ' (' + st + '): pilot and test buttons are hidden (Go to jetty, Test surge, Big surge, Walk out, More planks, Home, Quality, Sky, Dusk, tide bar)');
    const turn = await p.evaluate(() => { const e = document.getElementById('rpTurn'); return !e || e.getBoundingClientRect().width === 0; }); ok(turn, name + ' (' + st + '): "Turn plank" shows only while a plank is held');
    const ht = await p.evaluate(() => (document.getElementById('gd-hint') || {}).textContent || ''); ok(ht.split(/\s+/).filter(Boolean).length <= 8 && ht.length > 3, name + ' (' + st + '): the hint is one short sentence: "' + ht + '"');
    if (dev === '&device=ipad') { const small = bs.filter(b => b.ctl && (b.h < 51.5 || b.w < 51.5) && b.tag !== 'INPUT'); ok(small.length === 0, name + ' (' + st + '): touch targets are 52 px' + (small.length ? ': ' + small.map(b => b.id + ' ' + Math.round(b.w) + 'x' + Math.round(b.h)).join(', ') : '')); }
    ok(errs.length === 0, name + ' (' + st + '): 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
    if (st === 'evening') {   /* the menu opens, holds the rest, and nothing else moves */
      await p.locator('#gd-menu-btn').click(); await p.waitForTimeout(300); const mb = await boxes(p), mo = overlaps(mb.filter(b => !/^gd-hint|^gd-strip/.test(b.id)));
      ok(await p.locator('#gd-skip').isVisible() && await p.locator('#gd-dev-btn').isVisible(), name + ': the Menu holds Skip to and the test controls');
      await p.close();
    } else await p.close();
  }
}
if (!only) {
  const { p, errs } = await open('?game=gift&glide=0&dev=1&stage=jobs', 834, 1062);
  ok(await p.locator('#rpGo').isVisible() && await p.locator('#homeBtn').isVisible() && await p.locator('#gd-skip').isVisible(), '&dev=1 keeps the pilot buttons, Home and Skip to (the old HUD)'); await p.close();
  const o = await open('?ui=0&q=high&seed=1122', 1200, 800); const r = await o.p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris })); ok(r.hash === '8d962c0c' && r.tris === 88790, 'the default page is unchanged (hash ' + r.hash + ', ' + r.tris + ' triangles)'); await o.p.close();
}
await browser.close(); console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
