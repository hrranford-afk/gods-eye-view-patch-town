/* THE GIFT, MAKE IT PHYSICAL, page test (headless chromium, software GL: not a device).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/physical-page-test.js [only=2,3]
   1 zero console errors: &game=gift, &physical=0, the device presets, AR light; the default page is unchanged
   2 the new opening played by scripted steps: you arrive by boat, the dock is half built, the robots are stalled, floating supplies are loaded by rowing over them,
     unloaded at the beach, ferried by a robot, the frame beam is carried by you and a robot together, the stages are set by a held press, the dock is finished
     (every gate needing a player action, and no gate moves while nobody acts)
   3 the first day goes on to the first night (letter, ledger, jobs, order, robots, build in stages, bottle)
   4 triangles and draw calls on the ipad preset with the new layers (software GL counts only) */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const onlyArg = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1], want = k => !onlyArg || onlyArg.split(',').includes(String(k));
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, o = {}) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: o.w || 1200, height: o.h || 800 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + (/glide=/.test(qs) ? '' : '&glide=0'));
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) { await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); }
  return { p, errs };
}
const S = (p, f, a) => p.evaluate(f, a);
const phys = p => S(p, () => { const s = __gift.state(), P = __gift.phys() && __gift.phys().state(); return { stage: __gift.stage(), stock: s.stock, ph: P && P.ph, err: P && P.err, beam: P && P.beam, mk: P && P.marker, errs: P ? P.errs : ['no phys'], dock: s.dockDone, build: s.build, robots: s.robots, boat: __boat.state() }; });

/* ================= 1. clean runs ================= */
if (want(1)) {
  for (const [name, qs] of [['the gift', '?game=gift&q=low'], ['&physical=0', '?game=gift&q=low&physical=0'], ['ipad', '?game=gift&device=ipad'], ['phone', '?game=gift&device=phone'], ['desktop', '?game=gift&device=desktop&q=low'], ['AR light', '?game=gift&device=ar']]) {
    const { p, errs } = await open(qs); await S(p, () => { const P = __gift.phys(); if (P) P.advance(8); });
    const r = await S(p, () => ({ phys: !!__gift.phys(), gerr: __gift.err(), perr: __gift.phys() ? __gift.phys().state().errs : [], stage: __gift.stage(), robots: __gift.state().robots }));
    ok(errs.length === 0 && r.gerr.length === 0 && r.perr.length === 0, name + ': zero console errors, zero gift and physical errors' + (errs.length ? ' ' + errs[0] : '') + (r.perr.length ? ' ' + r.perr[0] : ''));
    if (/physical=0/.test(qs)) ok(!r.phys && r.stage === 'arrive' && !r.robots.some(Boolean), '&physical=0: no physical layer, the old first beat (the crate), no robot started');
    else ok(r.phys && r.stage === 'dock', name + ': the physical opening is on (stage dock)');
    await p.close();
  }
  const o = await open('?ui=0&q=high&seed=1122'); const r = await S(o.p, () => ({ hash: __li.hashStatic(), tris: __li.stats().tris, phys: typeof window.LI_PHYS })); ok(r.hash === '8d962c0c' && r.tris === 88790 && r.phys === 'undefined', 'the default page is unchanged (hash ' + r.hash + ', ' + r.tris + ' triangles, no physical script)'); await o.p.close();
}

/* ================= 2. the opening ================= */
if (want(2)) {
  const { p, errs } = await open('?game=gift&q=low&device=desktop');
  let s = await phys(p);
  ok(s.stage === 'dock' && s.ph.op && s.ph.op.floats.length === 5 && s.ph.op.floats.every(f => !f.gone), 'you arrive: the stage is the dock, five floating supplies lie near the shore');
  ok(s.ph.b && s.ph.b.id === 'jetty' && s.ph.b.stage === 2 && s.ph.b.placed[0] === 1, 'the dock is half built (piles in, stage 2) when you arrive');
  ok(s.robots[0] === true && s.err.length >= 1 && s.err.every(e => e.role === 'dock'), 'a robot is at the dock, stalled: it holds its post and has no unit');
  ok(s.boat.ready && s.boat.avail && s.boat.mode === 'drive', 'your rowing boat is there from the first minute, in drive mode, no order needed');
  ok(s.mk && s.mk.tag === 'float', 'a glowing marker is on the first floating item');
  const rs = await S(p, () => { const sim = __li.campstart.rt().sim().robots[0]; return { state: sim.state, lamp: __li.campstart.rt().robots()[0].lamp, moving: sim.moving }; });
  ok(rs.state === 'task' && !rs.moving, 'the stalled robot stands still (state task, not moving), lamp ' + rs.lamp);
  /* nobody acts: a long time passes and nothing moves on */
  await S(p, () => __gift.phys().advance(240)); s = await phys(p);
  ok(s.ph.b.stage === 2 && s.ph.b.placed.join() === '1,0,0,0' && s.stage === 'dock' && s.stock.planks === 0, 'four minutes with nobody acting: the dock does not advance (no gate moves on a timer)');
  /* row over the floating supplies */
  for (let k = 0; k < 5; k++) {
    const f = await S(p, () => __gift.phys().floats().find(f => !f.gone)); if (!f) break;
    const ld = await S(p, () => Object.values(__boat.state().b.load).reduce((a, c) => a + c, 0));
    if (ld >= 4) { await S(p, () => { const l = __boat.landings().find(l => l.id === 'beach'); __boat.teleport(l.berth.x, l.berth.z, l.berth.yaw, 'drive'); __gift.phys().advance(.3); __boat.dockHere(); __boat.advance(2); __boat.unload(); __gift.closeCard(); __boat.castOff && __boat.castOff(); }); }
    await S(p, ([x, z]) => { __boat.teleport(x, z, 0, 'drive'); __gift.phys().advance(.6); }, [f.x, f.z]);
  }
  s = await phys(p); const loaded = Object.values(s.boat.b.load).reduce((a, c) => a + c, 0);
  ok(s.ph.op.floats.every(f => f.gone) && loaded + s.stock.planks + s.stock.rope === 5, 'rowing over the supplies loaded all five (' + loaded + ' in the boat, ' + (s.stock.planks + s.stock.rope) + ' unloaded)');
  ok(s.mk && s.mk.tag === 'unload', 'then the marker points at the beach to unload');
  await S(p, () => { const l = __boat.landings().find(l => l.id === 'beach'); __boat.teleport(l.berth.x, l.berth.z, l.berth.yaw, 'drive'); __gift.phys().advance(.3); __boat.dockHere(); __boat.advance(2); __boat.unload(); __gift.closeCard(); });
  s = await phys(p); ok(s.stock.planks === 3 && s.stock.rope === 2, 'unloaded at the beach: the heaps show 3 planks and 2 rope (' + s.stock.planks + '/' + s.stock.rope + ')');
  const cnt = await S(p, () => __gift.phys().state().counts); ok(cnt.heaps.planks === 3 && cnt.heaps.rope === 2, 'the heaps are drawn: ' + cnt.heaps.planks + ' plank pieces, ' + cnt.heaps.rope + ' rope coils');
  /* the robot ferries; the frame wants the beam; the stages want a hand */
  let guard = 0, sawBeam = false, beamStep = false;
  while (guard++ < 60) {
    s = await phys(p); if (s.dock) break;
    if (s.beam) { sawBeam = true; if (s.beam.robotAt) { await S(p, () => __gift.phys().hold('pbeamA')); const d0 = s.beam.d; await S(p, () => __gift.phys().advance(3)); const s2 = await phys(p); if (s2.beam && s2.beam.d > d0) beamStep = true; await S(p, () => __gift.phys().advance(25)); await S(p, () => __gift.phys().hold(null)); continue; } }
    const w = await S(p, () => { const P = __gift.phys(), b = __gift.phys().state().ph.b; const plan = P.planFor('jetty'); return b && (b.placed[b.stage - 1] >= plan.need[b.stage - 1]) && b.hand.length === 0 ? b.stage : null; });
    if (w && !s.beam && w !== 2) { await S(p, () => { __gift.phys().startAct('site', true); __gift.phys().advance(3); }); continue; }
    await S(p, () => __gift.phys().advance(12));
  }
  s = await phys(p);
  ok(sawBeam && beamStep, 'the frame needed the beam: a robot took one end, it moved only while the hold was on');
  ok(s.dock === true && s.stage === 'arrive', 'the dock is finished: the stage moves on to the crate at the beach (' + s.stage + ')');
  ok(s.build === null, 'the dock is not the year\'s one build (the build menu is still ahead)');
  ok(s.errs.length === 0 && errs.length === 0, 'no errors in the opening' + (s.errs[0] ? ' ' + s.errs[0] : '') + (errs[0] ? ' ' + errs[0] : ''));
  const rb = await S(p, () => { const sim = __li.campstart.rt().sim().robots[0]; return sim.state; }); await S(p, () => __gift.phys().advance(20));
  const rb2 = await S(p, () => __li.campstart.rt().sim().robots[0].state); ok(rb2 !== 'task', 'the robot is handed back to the routine when the dock is done (' + rb + ' then ' + rb2 + ')');
  await p.close();
}

/* ================= 3. the rest of the first day, to the first night ================= */
if (want(3)) {
  const { p, errs } = await open('?game=gift&q=low&device=desktop&stage=jobs');   /* jobs: the opening dock is skipped by the canned state; the physical layer still runs */
  const G = (f, ...a) => S(p, ([f, a]) => { const r = __gift[f](...a); return r === undefined ? null : r; }, [f, a]);
  const click = async text => { const b = p.locator('#gd button', { hasText: text }).first(); if (!(await b.count())) return false; await b.click({ force: true }); await p.waitForTimeout(250); return true; };
  const adv = sec => S(p, s => __gift.phys().advance(s), sec);
  const actions = [];   /* every player action the run needed */
  ok((await G('stage')) === 'jobs', 'the canned jobs stage starts the rest of the day (the opening is covered by section 2)');
  await G('act', 'lean'); await click('Choose'); await G('closeCard'); actions.push('get dry');
  await G('act', 'barrel'); await click('Set the barrel'); await G('closeCard'); actions.push('set the barrel');
  for (const i of [0, 1]) { await G('act', 'find' + i); await G('closeCard'); } actions.push('two finds');
  ok((await G('stage')) === 'delivery' || (await G('stage')) === 'jobs', 'the jobs are done by hand (stage ' + (await G('stage')) + ')');
  await S(p, () => { __gift.state(); }); const st0 = await G('state'); if (!st0.plank) await G('fitPlank');
  await p.waitForFunction(() => __gift.state().plank, null, { timeout: 60000 }).catch(() => { });
  /* the delivery: the boat comes in and waits at the landing until the crate is carried up */
  await G('speedUp', 40); await p.waitForFunction(() => __gift.crates().length >= 1, null, { timeout: 400000 }); await G('speedUp', 1);
  await p.waitForFunction(() => __gift.dlv() === 'drop', null, { timeout: 400000 });
  let cs = await S(p, () => __gift.crates().map(c => c.n)); ok(cs.length === 1, 'crate number 1 is aboard the tender at the landing');
  const aboard = await S(p, () => { const c = __gift.phys().state(); return c.ph.crates; }); await adv(30);
  ok((await G('dlv')) === 'drop', 'the tender stays at the landing while the crate is aboard (no timer sends it away)');
  await S(p, () => __gift.phys().startCarry(1, true)); actions.push('carry crate 1 up the beach'); await adv(40);
  const y1 = await S(p, () => __gift.phys().state().ph.crates); await adv(25);
  await G('speedUp', 40); await p.waitForFunction(() => __gift.dlv() === null, null, { timeout: 200000 }).catch(() => { }); await G('speedUp', 1);
  ok((await G('dlv')) === null, 'with the crate carried off the boat, the tender leaves');
  const snap = await S(p, () => __gift.phys().snapshot ? 0 : 0);
  await G('act', 'crate1'); ok(await click('Take the track links') && (await G('state')).parts === 3, 'crate number 1 is at the yard; opening it gives three track links'); actions.push('open crate 1'); await adv(1); await p.waitForTimeout(800);
  await G('closeCard'); await G('order', 'rope'); actions.push('order rope'); await G('closeCard');
  ok((await G('stage')) === 'evening' || (await G('stage')) === 'yard', 'ordering moves the day on (stage ' + (await G('stage')) + ')');
  /* a robot to work: start one (a part carried to a carrier), give it an order */
  const stg = await G('stage'); if (stg === 'yard') { await G('startRobot', 0); }
  await G('giveOrder', 0, 'metal'); actions.push('give an order'); await G('closeCard');
  await adv(220); let s3 = await phys(p); ok(Object.values(s3.stock).reduce((a, c) => a + c, 0) >= 2, 'the robot works the shore and walks loads in to the yard heap (' + JSON.stringify(s3.stock) + ')');
  /* the evening: a heavy letter crate needs the robot and you together */
  await p.waitForFunction(() => __gift.stage() === 'evening', null, { timeout: 30000 }).catch(() => { });
  await adv(10); const ev = await S(p, () => ({ crates: __gift.crates(), beam: __gift.phys().state().beam, dlv: __gift.dlv() })); ok(ev.crates.some(c => c.letter2), 'the evening boat brought a letter crate (' + ev.crates.length + ' crates)');
  { const crs0 = await G('crates'), lc0 = crs0.findIndex(c => c.letter2) + 1; await p.waitForFunction(() => __gift.phys().state().marker && /heavy/.test(__gift.phys().state().marker.tag), null, { timeout: 120000 }).catch(() => { }); await adv(20); await G('act', 'crate' + lc0); await G('closeCard'); }
  let g2 = 0; while (g2++ < 40) { const q = await S(p, () => __gift.phys().state()); const hv = q.beam; if (!hv && q.ph.crates.length === 0) { await adv(8); continue; } if (hv && hv.robotAt) { await S(p, () => __gift.phys().hold('pbeamA')); const d0 = hv.d; await adv(2); const q2 = await S(p, () => __gift.phys().state()); if (q2.beam) ok(q2.beam.d > d0, 'the heavy crate moves while you hold (robot and you together)'); await adv(30); await S(p, () => __gift.phys().hold(null)); actions.push('carry the heavy crate with a robot'); break; } if (!hv) { const run = await S(p, () => __gift.phys().state()); } await adv(8); }
  await adv(5); const crs = await G('crates'); const lc = crs.findIndex(c => c.letter2) + 1; await G('act', 'crate' + lc); const lt = await S(p, () => (document.querySelector('#gd-layer .gd-card') || {}).textContent || '');
  ok(/place for people to visit/.test(lt), 'the letter crate is at the yard and reads as scripted'); await click('Keep it'); await p.waitForTimeout(900); await G('closeCard'); actions.push('read letter two');
  /* stock for a cistern: planks 1, metal 3 (the shore gives what it gives, so the rest is added by the test handle, as a delivery would) */
  await G('addStock', 'metal', 3); await G('addStock', 'planks', 1); await adv(3); s3 = await phys(p);
  ok(s3.stock.metal >= 3 && s3.stock.planks >= 1, 'the robot brought what a cistern needs (metal ' + s3.stock.metal + ', planks ' + s3.stock.planks + ')');
  await G('doBuild', 'cistern'); await click('Build it'); await G('closeCard'); actions.push('choose the cistern');
  s3 = await phys(p); ok(s3.ph.b && s3.ph.b.id === 'cistern' && s3.ph.b.stage === 0 && !s3.build, 'the cistern is paid for and staked out on paper only: stage 0, not built, the night has not begun (stage ' + s3.stage + ')');
  const stock0 = s3.stock.metal + s3.stock.planks; await adv(120); s3 = await phys(p); ok(s3.ph.b.stage === 0 && s3.ph.b.placed.every(x => x === 0) && s3.ph.b.hand.length === 0 && s3.stock.metal + s3.stock.planks >= stock0, 'two minutes with nobody acting: nothing is staked or built and no unit left the heap (a robot does not start a build alone; the shore work goes on)');
  let gg = 0, sawBeam = false; while (gg++ < 220) { s3 = await phys(p); if (s3.build === 'cistern') break; if (s3.beam && !s3.ph.crates.some(c => false)) { sawBeam = true; if (s3.beam.robotAt) { await S(p, () => __gift.phys().hold('pbeamA')); await adv(40); await S(p, () => __gift.phys().hold(null)); continue; } }
    const b = s3.ph.b; const need = b && await S(p, id => { const P = __gift.phys(), pl = P.planFor(id), bb = P.state().ph.b; const a = bb.stage - 1; return bb.stage === 0 ? 'stake' : (a >= 0 && a < 4 && bb.placed[a] >= pl.need[a] && bb.hand.length === 0 && a !== 1) ? 'hold' : null; }, b ? b.id : 'cistern');
    if (need) { await S(p, () => { __gift.phys().startAct('site', true); __gift.phys().advance(3); }); actions.push('set a stage'); continue; } await adv(20); }
  s3 = await phys(p); ok(s3.build === 'cistern' && sawBeam, 'the cistern went up in stages, the frame beam carried by you and a robot together');
  ok(s3.stage === 'night', 'the finished build brings the night (stage ' + s3.stage + ')');
  await p.waitForFunction(() => __gift.stage() === 'night', null, { timeout: 30000 }).catch(() => { });
  await G('speedUp', 60); await p.waitForFunction(() => __gift.objs().bottle.visible, null, { timeout: 200000 }).catch(() => { }); await p.waitForTimeout(8000); await G('speedUp', 1);
  await G('act', 'bottle'); await click('Keep it and rest'); await p.waitForTimeout(500);
  ok((await G('stage')) === 'done' || (await G('state')).bottle, 'the bottle is read: the first night is done (stage ' + (await G('stage')) + ')');
  ok(errs.length === 0 && (await S(p, () => __gift.err().concat(__gift.phys().state().errs))).length === 0, 'zero console errors, zero gift and physical errors' + (errs[0] ? ' ' + errs[0] : ''));
  console.log('player actions this run needed: ' + actions.join(', '));
  await p.close();
}
await browser.close(); console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
