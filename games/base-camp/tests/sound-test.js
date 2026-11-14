/* Build 19 + sound: the sound pass. Every sound is synthesised in the game (Web Audio), nothing is downloaded.
   Checks: no audio before a gesture; the rate limiter caps a burst; every sound-board kind and ambience layer makes sound without throwing;
   music ducks under a fanfare; an 8-hour sim with ambience on has no errors and no runaway nodes; the volume slider persists. Screenshot: shots/64-soundboard.png (820x1180).
   Run: NODE_PATH=$(npm root -g) node tests/sound-test.js   (about 3 minutes) */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
/* wrap AudioContext: count contexts (and whether a gesture came first) and every node made */
const WRAP = () => {
  const au = window.__au = { ctx: 0, ctxBeforeGesture: 0, gesture: false, made: {}, total: 0 };
  for (const ev of ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click']) window.addEventListener(ev, (e) => { if (e.isTrusted) au.gesture = true; }, true);
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const proto = (window.BaseAudioContext || AC).prototype;
  for (const n of Object.getOwnPropertyNames(proto)) if (/^create/.test(n) && typeof proto[n] === 'function') { const f = proto[n]; proto[n] = function () { au.made[n] = (au.made[n] || 0) + 1; au.total++; return f.apply(this, arguments); }; }
  class W extends AC { constructor(o) { super(o); au.ctx++; if (!au.gesture) au.ctxBeforeGesture++; } }
  window.AudioContext = W; window.webkitAudioContext = W;
};
(async () => {
  const { srv, url } = await serve(); const { b, ctx, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await ctx.addInitScript(WRAP);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(2500);
  ok('build 23', await ev(() => __g.BUILD === 'build 23'));
  /* 1. nothing plays before a gesture: sounds, music and ambience asked for from code all stay silent */
  const pre = await ev(() => { sfx('cheer'); sfx('fanfare'); __g.bsfx('boom'); __g.partyToggle(true); __g.partyToggle(false); for (let i = 0; i < 8; i++) __g.SND_ambTick(0.3); return { ctx: __au.ctx, nodes: __au.total, armed: __g.SND.armed, sndCtx: !!__g.SND.ctx }; });
  ok('no audio before a gesture (no AudioContext, no nodes)', pre.ctx === 0 && pre.nodes === 0 && !pre.armed && !pre.sndCtx, JSON.stringify(pre));
  /* the first tap starts it: More, then the Practice room */
  for (let k = 0; k < 6; k++) { try { await p.click('#bMore', { timeout: 8000 }); await p.click('#bPrac', { timeout: 4000 }); break; } catch (e) { await sleep(1500); } }
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit' && __g.G.settlements.some((S) => S.placed))) break; }
  const post = await ev(() => ({ ctx: __au.ctx, before: __au.ctxBeforeGesture, state: __g.SND.ctx && __g.SND.ctx.state, bus: !!__g.SND.bus, comp: !!(__au.made.createDynamicsCompressor), nodes: __au.total }));
  ok('the first tap creates one AudioContext, after the gesture, with the mix bus (master, compressor, sfx/music/ambience)', post.ctx === 1 && post.before === 0 && post.bus && post.comp, JSON.stringify(post));
  await ev(() => { __g.ENV.hourOverride = 12; __g.setWxPick('clear'); });
  /* 2. the rate limiter: a burst of 50 identical sounds plays at most 3 */
  const burst = await ev(() => { const S = __g.SND; S.recent.squeak = []; const o0 = __au.made.createOscillator || 0, p0 = S.stat.played, d0 = S.stat.dropped; for (let i = 0; i < 50; i++) sfx('squeak', 1); return { osc: (__au.made.createOscillator || 0) - o0, played: S.stat.played - p0, dropped: S.stat.dropped - d0, max: S.RATE.max }; });
  ok('rate limiter: a burst of 50 squeaks plays at most ' + burst.max + ' (2 oscillators each)', burst.played <= burst.max && burst.played >= 1 && burst.dropped >= 50 - burst.max && burst.osc <= burst.max * 2, JSON.stringify(burst));
  await sleep(150);
  const jit = await ev(() => { const S = __g.SND; S.recent.zz = []; S.last.zz = 0; __g.SND_gate('zz'); const a = S.jit; __g.SND_gate('zz'); return [a, S.jit]; });
  ok('a quick repeat gets a little pitch jitter (the first does not)', jit[0] === 1 && jit[1] !== 1 && Math.abs(jit[1] - 1) < 0.05, JSON.stringify(jit));
  /* 3. every sound on the board plays and makes nodes (sfx swallows errors, so "made nodes" is the real check) */
  const kinds = await ev(() => { const bad = [], out = { n: 0 }; const run = (k, f) => { const n0 = __au.total; try { f(); } catch (e) { bad.push(k + ': ' + e.message); return; } if (__au.total - n0 < 1) bad.push(k + ': silent'); out.n++; };
    for (const k of Object.keys(__g.SND.KINDS)) { __g.SND.recent[k] = []; run(k, () => sfx(k, 1)); }
    for (const k of Object.keys(__g.SND.BKINDS)) { __g.SND.recent['b-' + k] = []; run('battle ' + k, () => __g.bsfx(k, 1)); }
    out.bad = bad; out.kinds = Object.keys(__g.SND.KINDS).length; out.b = Object.keys(__g.SND.BKINDS).length; return out; });
  ok('every sound kind on the board plays without throwing (' + kinds.kinds + ' colony + ' + kinds.b + ' battle)', kinds.bad.length === 0 && kinds.n === kinds.kinds + kinds.b, JSON.stringify(kinds.bad));
  await sleep(1500);
  const amb = await ev(async () => { const A = __g.SND_AMB, bad = []; for (const k of A.layers) { A.force = { [k]: true, any: true }; A.t[k] = 0; const n0 = __au.total; for (let i = 0; i < 6; i++) { A.modT = 0; __g.SND_ambTick(0.3); } if (__au.total - n0 < 1) bad.push(k); } A.force = {}; return { bad, loops: Object.keys(A.loops) }; });
  ok('every ambience layer on the board makes sound (birds, crickets, night, rain, trickle)', amb.bad.length === 0, JSON.stringify(amb));
  /* music ducks under a fanfare */
  const duck = await ev(async () => { __g.partyToggle(true); await new Promise((r) => setTimeout(r, 400)); const g = __g.SND.bus.music.gain, a = g.value; __g.SND.recent.fanfare = []; sfx('fanfare'); await new Promise((r) => setTimeout(r, 350)); const lo = g.value; await new Promise((r) => setTimeout(r, 2600)); const back = g.value; __g.partyToggle(false); return { a: +a.toFixed(2), lo: +lo.toFixed(2), back: +back.toFixed(2), state: __g.SND.ctx.state }; });
  ok('the music ducks under a fanfare and comes back', duck.lo < duck.a - 0.15 && duck.back > duck.lo + 0.15, JSON.stringify(duck));
  /* 4. 8 hours with ambience on: hours sweep 12:00 to 20:00 (birds, then crickets), rain comes and goes, a straw flows; nodes are stopped and unplugged */
  await sleep(2500);
  const live0 = await ev(() => __g.SND.live);
  const e0 = errs.length; let peak = 0, made = 0;
  for (let i = 0; i < 32; i++) {
    const r = await ev((i) => { const g = __g; g.SND.ambOn = true; g.ENV.hourOverride = 12 + i * 0.25; if (i % 8 === 2) g.setWxPick('rain'); if (i % 8 === 6) g.setWxPick('clear'); g.envUpdate && g.envUpdate();
      const n0 = __au.total; g.simulate(900, 3); for (let k = 0; k < 8; k++) { g.SND_AMB.modT = 0; g.SND_ambTick(0.25); } return { live: g.SND.live, made: __au.total - n0, lv: g.SND_AMB.lv, loops: Object.keys(g.SND_AMB.loops) }; }, i);
    peak = Math.max(peak, r.live); made += r.made; if (i % 4 === 0 || i === 31) console.log('  hour ' + (12 + i * 0.25).toFixed(2) + ' live ' + r.live + ' loops ' + r.loops.join('+') + ' levels ' + JSON.stringify(Object.fromEntries(Object.entries(r.lv).map(([k, v]) => [k, +v.toFixed(2)]))));
    await sleep(250);
  }
  await ev(() => { __g.SND.ambOn = false; __g.setWxPick('clear'); }); for (let i = 0; i < 20; i++) { await ev(() => { __g.SND_AMB.modT = 0; __g.SND_ambTick(0.25); }); await sleep(250); }
  await sleep(3000); const end = await ev(() => ({ live: __g.SND.live, loops: Object.keys(__g.SND_AMB.loops).length, state: __g.SND.ctx.state, t: +__g.SND.ctx.currentTime.toFixed(1) }));
  ok('8-hour sim with ambience: no errors', errs.length === e0, errs.slice(e0, e0 + 3).join(' | '));
  ok('8-hour sim: no runaway nodes (peak live sources ' + peak + ', ' + made + ' nodes made; afterwards ' + end.live + ' live, ' + end.loops + ' loops)', peak < 400 && end.live <= live0 + 4 && end.loops === 0, JSON.stringify(end));
  /* 5. the volume slider in the menu persists */
  await ev(() => __g.menuUi()); const has = await ev(() => !!document.getElementById('mVol') && !!document.getElementById('mAmb'));
  await ev(() => { const v = document.getElementById('mVol'); v.value = 35; v.dispatchEvent(new Event('input')); });
  const v1 = await ev(() => ({ vol: __g.SND.vol, gain: +__g.SND.bus.master.gain.value.toFixed(2), saved: localStorage.getItem('bc-volume') }));
  await p.reload(); await sleep(2500); await ev(() => __g.menuUi());
  const v2 = await ev(() => ({ vol: __g.SND.vol, slider: document.getElementById('mVol').value, saved: localStorage.getItem('bc-volume') }));
  ok('the menu has a volume slider and a room-sounds switch; the volume persists after a reload', has && v1.vol === 0.35 && v1.saved === '0.35' && v2.vol === 0.35 && v2.slider === '35', JSON.stringify([v1, v2]));
  /* the sound on/off switch still works and stops everything */
  const off = await ev(() => { __g.SND_setOn(false); const a = { on: __g.SND.on, saved: localStorage.getItem('bc-sound') }; __g.SND_setOn(true); return a; });
  ok('sound off is saved (bc-sound = 0)', off.on === false && off.saved === '0', JSON.stringify(off));
  await b.close();
  /* 6. the sound board, at iPad portrait size */
  { const { b: b2, ctx: c2, p: q, errs: e2 } = await launch(); await c2.addInitScript(WRAP); await q.setViewportSize({ width: 820, height: 1180 });
    await q.goto(url + '?soundboard=1'); await sleep(3000);
    const n = await q.evaluate(() => ({ board: !!document.getElementById('sndBoard'), btns: document.querySelectorAll('#sndBoard button[data-k]').length, amb: document.querySelectorAll('#sndBoard button[data-amb]').length, bt: document.querySelectorAll('#sndBoard button[data-b]').length, kinds: Object.keys(__g.SND.KINDS).length, bk: Object.keys(__g.SND.BKINDS).length, ctx: __au.ctx }));
    ok('?soundboard=1 shows one button per sound kind and per ambience layer (silent until tapped)', n.board && n.btns === n.kinds && n.bt === n.bk && n.amb === 5 && n.ctx === 0, JSON.stringify(n));
    await q.click('#sndBoard button[data-k="cheer"]'); await q.click('#sndBoard button[data-amb="birds"]'); await sleep(1200); await q.click('#sndBoard button[data-k="hutdone"]');
    const t = await q.evaluate(() => ({ ctx: __au.ctx, nodes: __au.total, birds: __g.SND_AMB.force.birds }));
    ok('tapping the board plays (one context, nodes made, the birds layer on)', t.ctx === 1 && t.nodes > 5 && t.birds === true, JSON.stringify(t));
    await q.click('#sndBoard button[data-amb="birds"]');
    await q.evaluate(() => { document.getElementById('sndBoard').scrollTop = 0; }); await sleep(300); await q.screenshot({ path: OUT + '64-soundboard.png' });
    ok('sound board: no page errors', e2.length === 0, e2.slice(0, 3).join(' | '));
    await b2.close(); }
  srv.close();
  console.log('\n' + res.filter((x) => x).length + '/' + res.length + ' passed'); process.exit(res.every((x) => x) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
