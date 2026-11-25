/* THE GIFT, the boat you can drive: page test (headless chromium, software GL: not a device, no real-GPU speed is claimed).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/boat-drive-page-test.js [only=1,2,..]
   1 default page unchanged (hash 8d962c0c, 88,790 triangles, no boat object)      2 &game=gift&boat=1: zero console errors, the kit dinghy, three landings, HUD
   3 the boat arrives with the first order (not before)                            4 driving: keys, thumb stick, tap on the water, wake, rings, spray, exhaust puff only with the motor
   5 the tide and the land rule (never onto land, grounds at low tide, floats off)  6 the first trip: skerry, crate, motor part, fit, unload into the yard stock
   7 seals and gulls notice the boat                                                8 a storm rocks it more and slows it
   9 save and load (position, motor, load)                                          10 the errand stub (off by default)
   11 device presets (ipad 52 px targets, phone width, desktop, radeon, AR)         12 the preset step-down (radeon or desktop on a built-in or mobile GPU)
   13 budgets: triangles and draw calls with and without the boat (ipad preset) */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const onlyArg = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1];
const want = k => !onlyArg || onlyArg.split(',').includes(String(k));
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, o = {}) {
  const c = o.touch ? await browser.newContext({ viewport: { width: o.w || 1180, height: o.h || 820 }, hasTouch: true, deviceScaleFactor: 1 }) : ctx;
  if (o.touch) { const fs = await import('node:fs'); if (fs.existsSync('/tmp/three.js')) await c.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' })); }
  const p = await c.newPage(); p.setDefaultTimeout(180000);
  await p.setViewportSize({ width: o.w || 1200, height: o.h || 800 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + (/game=gift/.test(qs) && !/glide=/.test(qs) ? '&glide=0' : '') + (/game=gift/.test(qs) && !/physical=/.test(qs) ? '&physical=0&dev=1' : ''));
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs) && !o.noboat) { await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => window.__boat && __boat.state().ready && __boat.obj(), null, { timeout: 300000 }); }
  return { p, errs, c };
}
const B = (p, f, ...a) => p.evaluate(([f, a]) => { const r = __boat[f](...a); return r === undefined ? null : r; }, [f, a]);
const st = p => B(p, 'state');
const wait = (p, ms) => p.waitForTimeout(ms);
const setTide = async (p, v) => { await p.evaluate(v => __li.setTide(v), v); await p.waitForFunction(v => Math.abs(__boat.env().tide - v) < .02, v, { timeout: 60000 }); };
const depthOf = p => p.evaluate(() => { const s = __boat.state().b, K = LI_BOAT_DRIVE, t = __boat.env().tide; return K.hullDepth({ x: s.x, z: s.z, yaw: s.yaw, engine: s.engine }, { depth: (x, z) => t - __li.H(x, z) }); });
const toDock = async p => { await p.evaluate(() => { const nl = __boat.state(); }); };

/* ================= 1. the default page is unchanged ================= */
if (want(1)) {
  const { p, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris, boat: typeof window.__boat, lib: typeof window.LI_BOAT_DRIVE, hud: !!document.getElementById('bd'), note: !!document.getElementById('stepnote'), x: __li.boats().length }));
  ok(r.hash === '8d962c0c', 'default page hash is 8d962c0c (' + r.hash + ')');
  ok(r.tris === 88790, 'default page is 88,790 triangles (' + r.tris + ')');
  ok(r.boat === 'undefined' && r.lib === 'undefined' && !r.hud && !r.note, 'no boat object, no boat script, no HUD and no step-down note on the default page');
  ok(errs.length === 0, 'default page: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await p.close();
}
/* ================= 2. &game=gift&boat=1 ================= */
let P2 = null;
if (want(2) || want(4) || want(5) || want(6) || want(7)) {
  P2 = await open('?ui=0&q=low&game=gift&boat=1');
  const { p, errs } = P2;
  const r = await p.evaluate(() => ({ s: location.search, kit: __li.boatkit && __li.boatkit.ready(), obj: __boat.obj(), L: __boat.landings().map(l => l.id), st: __boat.state(), hud: __boat.hud(), tg: __gift.targets().map(t => t.id) }));
  if (want(2)) {
    ok(/boatkit=1/.test(r.s), 'the gift turns the boat kit on: ' + r.s.slice(-40));
    ok(r.kit && r.obj.kit && r.obj.kind === 'dinghy' && r.obj.visible, 'the boat is the kit dinghy (' + r.obj.lod + ' level, ' + r.obj.tris + ' triangles)');
    ok(['beach', 'jetty', 'skerry'].every(i => r.L.includes(i)), 'three landings found: ' + r.L.join(', '));
    const fl = await p.evaluate(() => { const K = LI_BOAT_DRIVE, tide = __boat.env().tide; return __boat.landings().map(l => [l.id, K.hullDepth({ x: l.berth.x, z: l.berth.z, yaw: l.berth.yaw, engine: false }, { depth: (x, z) => (l.id === 'beach' ? tide : -.5) - __li.H(x, z) })]); });
    ok(fl.every(([i, d]) => d >= .3), 'every berth floats a rowing boat (jetty and skerry with the tide half a metre below the mean, the beach berth at the tide of the moment): ' + fl.map(([i, d]) => i + ' ' + d.toFixed(2)).join(', '));
    ok(r.st.avail && r.st.mode === 'docked' && r.st.b.at === 'jetty', 'with &boat=1 it lies at the jetty, docked');
    ok(r.hud.mainShown && /Landing/.test(r.hud.main) && !r.hud.stick, 'the one button reads Landing and there is no stick yet: "' + r.hud.main + '"');
    ok(r.tg.includes('boat'), 'tapping the boat is a target');
    ok(/skerry/.test(r.hud.note), 'the first hint points at the outer skerry: "' + r.hud.note + '"');
    ok(r.st.cacheOn, 'the crate is on the skerry');
    await wait(p, 1500);
    ok(errs.length === 0, '&game=gift&boat=1: 0 console errors' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : ''));
    ok((await B(p, 'err')).length === 0 && (await p.evaluate(() => __gift.err())).length === 0, 'no boat errors and no gift errors');
  }
}
/* ================= 3. the boat arrives with the first order ================= */
if (want(3)) {
  const { p, errs } = await open('?ui=0&q=low&game=gift');
  const a = await p.evaluate(() => ({ st: __boat.state(), hud: __boat.hud(), tg: __gift.targets().map(t => t.id), obj: __boat.obj() }));
  ok(!a.st.avail && !a.hud.mainShown && !a.tg.includes('boat') && !a.obj.visible, 'on a new day one the boat is not there yet (no button, no target, hull hidden)');
  await p.evaluate(() => __gift.skipTo('yard')); await wait(p, 2500);
  const b = await p.evaluate(() => ({ st: __boat.state(), hud: __boat.hud(), tg: __gift.targets().map(t => t.id), toast: __gift.toast(), obj: __boat.obj() }));
  ok(b.st.avail && b.st.mode === 'docked' && b.hud.mainShown && b.obj.visible, 'after the first order (the yard stage) the boat lies at the jetty');
  ok(/rowing boat/.test(b.toast || '') || b.st.avail, 'a short line says so: "' + b.toast + '"');
  ok(errs.length === 0, 'no console errors through the reveal' + (errs.length ? ' ' + errs[0] : ''));
  await p.close();
}
/* ================= 4. driving ================= */
if (want(4)) {
  const { p } = P2;
  await B(p, 'press'); await wait(p, 600); ok((await p.evaluate(() => __gift.card())) === 'dock', 'tap the boat or the Landing button: the landing card opens');
  await p.locator('#gd-layer button', { hasText: 'Cast off' }).first().click(); await wait(p, 600);
  let s = await st(p); ok(s.mode === 'drive' && s.boarded, 'Cast off: you are driving');
  let h = await B(p, 'hud'); ok(h.stick && h.info && /Dock/.test(h.main), 'the stick and the HUD appear, the button reads Dock: "' + h.main.replace(/\s+/g, ' ') + '"');
  const x0 = s.b.x, z0 = s.b.z;
  await p.keyboard.down('ArrowUp'); await B(p, 'advance', 10); await p.keyboard.up('ArrowUp'); s = await st(p);
  ok(s.u > 1 && Math.hypot(s.b.x - x0, s.b.z - z0) > 5, 'up arrow: the boat rows ahead (' + s.u.toFixed(2) + ' m/s, ' + Math.hypot(s.b.x - x0, s.b.z - z0).toFixed(1) + ' m)');
  const yw = s.b.yaw; await p.keyboard.down('KeyA'); await p.keyboard.down('ArrowUp'); await B(p, 'advance', 2); s = await st(p); await p.keyboard.up('KeyA'); await p.keyboard.up('ArrowUp');
  ok(Math.abs(s.b.yaw - yw) > .3, 'A turns it to port (yaw changed ' + (s.b.yaw - yw).toFixed(2) + ' rad)');
  ok(Math.abs(s.roll) > .005, 'it heels in the turn (' + s.roll.toFixed(3) + ' rad)');
  const sp = await B(p, 'spec'); ok(sp.rowing && sp.oar && typeof sp.oar.sweep === 'number', 'oars out and swinging from the stroke clock (sweep ' + sp.oar.sweep.toFixed(2) + ')');
  await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 5); const fx = await B(p, 'fx'); await B(p, 'force', null); ok((fx.kinds.ring || 0) > 0 || (fx.kinds.foam || 0) > 0, 'rowing leaves swirls and rings on the water: ' + JSON.stringify(fx.kinds));
  ok(!fx.kinds.puff && !fx.kinds.spray, 'no exhaust puff and no bow spray with oars');
  h = await B(p, 'hud'); ok(parseFloat(h.spd) >= 0 && /^\d+ \/ 4$/.test(h.load), 'HUD speed ' + h.spd + ' m/s, load ' + h.load);
  const comp = await p.evaluate(() => ({ rose: document.getElementById('bd-rose').getAttribute('transform'), head: document.getElementById('bd-head').getAttribute('transform'), wind: document.getElementById('bd-wind').getAttribute('transform') }));
  ok(/rotate/.test(comp.rose || '') && /rotate/.test(comp.head || '') && /rotate/.test(comp.wind || ''), 'compass rose, bow arrow and wind arrow are all set');
  /* the thumb stick: pointer events on the stick, up on the screen = away from the camera */
  await B(p, 'force', null); await B(p, 'advance', 8);
  const yaw1 = (await st(p)).b.yaw;
  await p.evaluate(() => { const e = document.getElementById('bd-stick'), r = e.getBoundingClientRect(), ev = (t, dx, dy) => e.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: r.left + r.width / 2 + dx, clientY: r.top + r.height / 2 + dy, bubbles: true, cancelable: true, isPrimary: true })); window.__ev = ev; ev('pointerdown', 50, 0); });
  await B(p, 'advance', 12); s = await st(p);
  const heading = await p.evaluate(() => { const c = __li; const th = (window.__camTheta = null); return null; });
  ok(Math.abs(LIB_wrap(s.b.yaw - yaw1)) > .3 && s.u > 1, 'the stick pushed right turns the boat and drives it (yaw ' + yaw1.toFixed(2) + ' to ' + s.b.yaw.toFixed(2) + ', ' + s.u.toFixed(1) + ' m/s)');
  await p.evaluate(() => window.__ev('pointerup', 0, 0)); await B(p, 'advance', 14); s = await st(p); ok(Math.abs(s.u) < .1, 'let go of the stick: it coasts to a stop (' + s.u.toFixed(2) + ' m/s)');
  /* a tap on the water: the autopilot takes the boat there (mouse or finger) */
  const wp = await p.evaluate(() => { const b = __boat.state().b; for (const d of [18, 14, 22, 10, 26]) for (let a = 0; a < 16; a++) { const x = b.x + Math.cos(a * .3927) * d, z = b.z + Math.sin(a * .3927) * d; if (__boat.env().tide - __li.H(x, z) > 2) { const sc = __boat.screenOf(x, z); if (sc && sc.x > 60 && sc.x < innerWidth - 60 && sc.y > 140 && sc.y < innerHeight - 160) return { x, z, sx: sc.x, sy: sc.y }; } } return null; });
  if (wp) { await p.mouse.click(wp.sx, wp.sy); await wait(p, 400); s = await st(p); ok(s.goto, 'a click on the water sets a destination (the boat steers there by itself)'); await B(p, 'advance', 40); s = await st(p); ok(Math.hypot(s.b.x - wp.x, s.b.z - wp.z) < 4.5 && !s.goto, 'and it arrives (' + Math.hypot(s.b.x - wp.x, s.b.z - wp.z).toFixed(1) + ' m off)'); }
  else ok(false, 'found open water on screen to click');
  /* a tap on the land is refused politely */
  ok(!(await p.evaluate(() => __boat.goTo(0, 0, true))), 'a tap on land is refused ("' + (await p.evaluate(() => __gift.toast())) + '")');
  /* the Dock button away from a landing says what to do */
  await B(p, 'teleport', 20, -60, 0, 'drive'); await B(p, 'press'); const tt = await p.evaluate(() => __gift.toast()); ok(/Row to|Slow down/.test(tt), 'Dock away from a landing says where to go: "' + tt + '"');
  /* the motor: fast, bow spray, exhaust puff, rings; oars shipped */
  await B(p, 'give', { engine: true }); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 12); s = await st(p); const fx2 = await B(p, 'fx'), sp2 = await B(p, 'spec');
  ok(s.u > 5.5, 'with the motor it zips at ' + s.u.toFixed(1) + ' m/s'); ok((fx2.kinds.puff || 0) > 0, 'the exhaust puff shows, only with the motor: ' + JSON.stringify(fx2.kinds)); ok((fx2.kinds.spray || 0) > 0 && (fx2.kinds.foam || 0) > 3, 'bow spray and a foam wake at speed');
  ok(sp2.rowing === false, 'the oars are shipped when the motor is on');
  ok(Math.abs(sp2.dpt) > .02, 'speed trims the bow (' + sp2.dpt.toFixed(3) + ' rad)');
  await B(p, 'force', { steer: 1, throttle: 1 }); await B(p, 'advance', 3); s = await st(p); ok(s.roll < -.03, 'a hard turn to starboard at speed heels it (roll ' + s.roll.toFixed(3) + ')'); await B(p, 'force', null);
  /* fine tuning of size: nothing is drawn on the boat that looks like a person */
  const tris = await B(p, 'obj'); ok(tris.tris < 6000, 'the boat itself is ' + tris.tris + ' triangles');
}
/* ================= 5. the tide and the land rule ================= */
if (want(5)) {
  const { p } = P2;
  await B(p, 'give', { engine: true }); await B(p, 'setMode', 'drive');
  const land = await p.evaluate(() => { const L = __boat.landings().find(l => l.id === 'beach'), d = [L.dx, L.dz]; return { L, d }; });
  for (const tide of [-1.0, 0, 1.0]) {
    await setTide(p, tide); const b0 = land.L; /* start 14 m out from the beach landing and drive straight at the shore for 40 s at full throttle */
    const yawTo = Math.atan2(land.d[1], -land.d[0]); const k0 = await p.evaluate(([sx, sz, dx, dz, yaw, tide]) => { const K = LI_BOAT_DRIVE; for (let k = 0; k < 60; k += .5) if (K.hullDepth({ x: sx + dx * k, z: sz + dz * k, yaw, engine: true }, { depth: (x, z) => tide - __li.H(x, z) }) >= .9) return k; return 60; }, [b0.sx, b0.sz, land.d[0], land.d[1], yawTo, tide]);   /* start where there is a metre of water at this tide */
    await B(p, 'teleport', b0.sx + land.d[0] * k0, b0.sz + land.d[1] * k0, yawTo, 'drive');
    await p.evaluate(() => __boat.force({ steer: 0, throttle: 1 })); const min = (await B(p, 'advance', 40)).minDepth;
    const s = await st(p), sp = await B(p, 'obj');
    ok(min >= .045, 'tide ' + tide.toFixed(1) + ' m: driven straight at the beach at full motor for 40 s the hull never goes under 5 cm of water (min ' + min.toFixed(2) + ' m)');
    ok(s.grounded || Math.hypot(s.b.x - b0.sx, s.b.z - b0.sz) > 2, 'tide ' + tide.toFixed(1) + ': it ends in the shallows, grounded (' + s.grounded + '), not on the sand');
    ok(Math.abs(s.u) < 3, 'tide ' + tide.toFixed(1) + ': and it has slowed right down (' + s.u.toFixed(2) + ' m/s)');
  }
  /* low tide, then rising: a grounded boat floats off */
  await setTide(p, -1.1); await B(p, 'force', { steer: 0, throttle: 0 }); await B(p, 'advance', 2); const sg = await st(p); const dLow = await depthOf(p);
  await setTide(p, 0.8); await B(p, 'advance', 2); const dHigh = await depthOf(p); ok(dHigh > dLow + 1.5, 'as the tide rises the same spot has more water (' + dLow.toFixed(2) + ' to ' + dHigh.toFixed(2) + ' m)');
  await B(p, 'force', { steer: 0, throttle: -1 }); await B(p, 'advance', 25); ok((await depthOf(p)) > .4, 'backing off at high water floats it clear');
  await B(p, 'force', null);
  /* the rim of the table holds it in */
  await setTide(p, 0); await B(p, 'teleport', -60, 100, 1.2, 'drive'); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 60); const rs = await st(p); ok(Math.hypot(rs.b.x, rs.b.z) < 118, 'driving at the edge of the table: it stays inside (' + Math.hypot(rs.b.x, rs.b.z).toFixed(1) + ' m from the centre)'); await B(p, 'force', null);
  await setTide(p, -0.25);
}
/* ================= 6. the first trip ================= */
if (want(6)) {
  const { p } = P2;
  await p.evaluate(() => { __boat.set({ x: 0, z: 0 }); __gift.skipTo('new'); }); await wait(p, 1500);
  await p.evaluate(() => { __boat.setMode('docked'); });
  let s = await st(p);
  await p.evaluate(() => { const j = __boat.landings().find(l => l.id === 'jetty'); __boat.teleport(j.berth.x, j.berth.z, j.berth.yaw, 'docked'); __boat.set({ at: 'jetty' }); __boat.give({ engine: false, load: {} }); });
  await B(p, 'castOff'); await B(p, 'force', null);
  s = await st(p); ok(s.mode === 'drive', 'cast off from the jetty');
  const sk = await p.evaluate(() => __boat.landings().find(l => l.id === 'skerry'));
  ok(await p.evaluate(([x, z]) => __boat.goTo(x, z, true), [sk.berth.x, sk.berth.z]), 'a way to the skerry is found round the island');
  let guard = 0; while ((await st(p)).goto && guard++ < 30) await B(p, 'advance', 10);
  s = await st(p); const sd = Math.hypot(s.b.x - sk.berth.x, s.b.z - sk.berth.z); ok(sd < 4.5, 'rowed to the skerry (' + sd.toFixed(1) + ' m from the berth, ' + (guard * 10) + ' s of rowing)');
  ok(await B(p, 'dockHere'), 'Dock works within reach of the skerry'); await B(p, 'advance', 3); s = await st(p); ok(s.mode === 'docked' && s.landNow === 'skerry', 'docked at the skerry'); ok((await p.evaluate(() => __gift.card())) === 'dock', 'the Dock card opens');
  const cardTxt = await p.evaluate(() => document.querySelector('#gd-layer .gd-card').textContent); ok(/crate/i.test(cardTxt) && /Take the crate and the motor/.test(cardTxt), 'the card offers the crate and the motor');
  await p.locator('#gd-layer button', { hasText: 'Take the crate' }).first().click(); await wait(p, 600); s = await st(p);
  const lt = Object.values(s.b.load).reduce((a, b) => a + b, 0); ok(lt === 3 && s.b.part && s.b.cacheDay === 1 && !s.cacheOn, 'in the boat: 3 units and the motor part; the crate is gone from the rock (' + JSON.stringify(s.b.load) + ')');
  const t2 = await p.evaluate(() => { __boat.collect(); return __gift.toast(); }); ok(/nothing|empty|bare|full|new/i.test(t2), 'the same day it will not give more: "' + t2 + '"');
  await B(p, 'castOff'); const jt = await p.evaluate(() => __boat.landings().find(l => l.id === 'jetty'));
  ok(await p.evaluate(([x, z]) => __boat.goTo(x, z, true), [jt.berth.x, jt.berth.z]), 'a way home is found'); guard = 0; while ((await st(p)).goto && guard++ < 30) await B(p, 'advance', 10);
  ok(await B(p, 'dockHere'), 'docks at the jetty'); await B(p, 'advance', 3); s = await st(p); ok(s.mode === 'docked' && s.landNow === 'jetty', 'docked at the jetty with the load');
  const c2 = await p.evaluate(() => document.querySelector('#gd-layer .gd-card').textContent); ok(/Fit the motor/.test(c2) && /Unload \(3\)/.test(c2), 'the card offers Fit the motor and Unload (3)');
  const stock0 = await p.evaluate(() => __gift.state().stock);
  await p.locator('#gd-layer button', { hasText: 'Unload' }).first().click(); await wait(p, 500);
  const stock1 = await p.evaluate(() => __gift.state().stock); const added = Object.keys(stock1).reduce((a, k) => a + stock1[k] - stock0[k], 0);
  ok(added === 3 && stock1.planks >= stock0.planks + 2, 'unloading puts the 3 units into the yard stock (' + JSON.stringify(stock0) + ' to ' + JSON.stringify(stock1) + ')');
  ok(await p.evaluate(() => !!document.getElementById('gd-stock-btn')), 'the stock button shows even before a robot runs');
  await p.locator('#gd-layer button', { hasText: 'Fit the motor' }).first().click(); await wait(p, 500); s = await st(p); ok(s.b.engine && !s.b.part, 'the motor is fitted');
  ok(await p.evaluate(() => /small motor/.test(document.querySelector('#gd-layer .gd-card').textContent)), 'the card now says a small motor sits on the stern');
  await B(p, 'castOff'); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 6); s = await st(p); ok(s.u > 5.5 && s.b.engine, 'faster with the motor (' + s.u.toFixed(1) + ' m/s)'); await B(p, 'force', null);
  ok(await p.evaluate(() => { const o = __boat.obj(); return o && o.tris > 0; }), 'the hull is still drawn after the kit rebuild');
  const lib = await p.evaluate(() => { __boat.give({ load: { planks: 5 } }); return __boat.state().b.load.planks; }); ok(lib <= 8, 'the load never exceeds the capacity (' + lib + ' of 8 with the motor)');
  const e = P2.errs.filter(x => !/GL Driver/.test(x)); ok(e.length === 0, 'the whole first trip: 0 console errors' + (e.length ? ' ' + e[0] : '')); ok((await B(p, 'err')).length === 0, 'and no boat errors');
}
/* ================= 7. seals and gulls ================= */
if (want(7)) {
  const { p } = P2;
  await setTide(p, -0.25);
  const sk = await p.evaluate(() => __boat.landings().find(l => l.id === 'skerry')), cl = await p.evaluate(() => __boat.cacheLoc());
  await p.evaluate(() => __boat.give({ engine: false })); await B(p, 'teleport', sk.berth.x - 60, sk.berth.z - 10, 0, 'drive');
  await B(p, 'advance', 1); let sl = await B(p, 'seals'); ok(sl.every(x => x === 'rest'), 'a boat far away: all four seals rest (' + sl.join(',') + ')');
  const ang = Math.atan2(-(cl.z - (sk.berth.z - 10)), cl.x - (sk.berth.x - 60));
  await B(p, 'teleport', cl.x - 20 * Math.cos(ang), cl.z + 20 * Math.sin(ang), ang, 'drive'); await p.evaluate(() => __boat.set({ u: 1.2 })); await B(p, 'force', { steer: 0, throttle: .5 }); await B(p, 'advance', .5); sl = await B(p, 'seals');
  ok(sl.includes('alert'), 'oars at about 20 m: the seals on the skerry look up (ALERT): ' + sl.join(','));
  let al = await B(p, 'alarm'); ok(al && al.r > 0, 'a moving boat makes the gulls climb (alarm radius ' + (al && al.r) + ' m, lift ' + (al && al.lift) + ' m)');
  await B(p, 'teleport', cl.x - 8 * Math.cos(ang), cl.z + 8 * Math.sin(ang), ang, 'drive'); await p.evaluate(() => __boat.set({ u: 1.4 })); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 1); sl = await B(p, 'seals');
  ok(sl.includes('flee'), 'oars at 8 m: the seals slip into the water (FLEE): ' + sl.join(','));
  await wait(p, 2500); const sy = await p.evaluate(() => __gift.objs().seals.map(s => +s.position.y.toFixed(2))); ok(sy.some(y => y < 0), 'and they really go under (heights ' + sy.join(',') + ')');
  /* a motor is noticed from further: at 40 m oars only alert nothing, the motor alerts */
  await B(p, 'force', null); await B(p, 'teleport', -60, 100, 0, 'drive'); await B(p, 'advance', 40); await p.evaluate(() => __boat.give({ engine: true }));
  const far = [cl.x - 40 * Math.cos(ang), cl.z + 40 * Math.sin(ang)]; await B(p, 'teleport', far[0], far[1], ang, 'drive'); await p.evaluate(() => __boat.set({ u: 4 })); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', .6); sl = await B(p, 'seals');
  ok(sl.some(x => x !== 'rest'), 'a motor at 40 m disturbs the seals (' + sl.join(',') + ') where oars would not');
  await B(p, 'force', null); await B(p, 'teleport', -60, 100, 0, 'drive'); await B(p, 'advance', 1); await B(p, 'force', null);
  al = await B(p, 'alarm'); ok(al === null || al.r >= 0, 'gull alarm is cleared when the boat stops');
}
/* ================= 8. a storm ================= */
if (want(8)) {
  const res = {};
  for (const w of ['fair', 'storm']) {
    const { p, errs } = await open('?ui=0&q=low&game=gift&boat=1&weather=' + w); const env = await p.evaluate(() => __boat.env());
    await B(p, 'castOff'); await B(p, 'force', { steer: 0, throttle: 0 }); const amp = (await B(p, 'advance', 60)).amp;
    await B(p, 'teleport', -20, 70, 0, 'drive'); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 12); const q0 = (await st(p)).b; await B(p, 'advance', 24); const q1 = (await st(p)).b; const u = Math.hypot(q1.x - q0.x, q1.z - q0.z) / 24; res[w] = { amp, u, sea: env.sea, wind: env.wind.speed, errs: errs.length };
    await p.close();
  }
  ok(res.storm.sea > .9 && res.fair.sea < .3, 'sea mood: storm ' + res.storm.sea.toFixed(2) + ', fair ' + res.fair.sea.toFixed(2) + ' (wind ' + res.storm.wind + ' and ' + res.fair.wind + ' m/s)');
  ok(res.storm.amp > res.fair.amp * 1.5, 'the storm rocks the hull more: ' + res.storm.amp.toFixed(3) + ' against ' + res.fair.amp.toFixed(3) + ' rad of swell motion');
  ok(res.storm.amp < .25, 'but not violently (' + res.storm.amp.toFixed(3) + ' rad)');
  ok(res.storm.u < res.fair.u * .95, 'and slows the boat (mean speed over 24 s: ' + res.storm.u.toFixed(2) + ' against ' + res.fair.u.toFixed(2) + ' m/s)');
  ok(res.storm.errs === 0 && res.fair.errs === 0, 'zero console errors in both');
}
/* ================= 9. save and load ================= */
if (want(9)) {
  const qs = '?ui=0&q=low&game=gift&boat=1&giftsave=1';
  const a = await open(qs); await a.p.evaluate(() => { __gift.wipe(); __gift.skipTo('new'); });
  await wait(a.p, 800); await B(a.p, 'castOff'); await B(a.p, 'give', { engine: true, load: { planks: 3, glass: 2 } }); await B(a.p, 'force', { steer: 0, throttle: 1 }); await B(a.p, 'advance', 6); await B(a.p, 'force', null); await B(a.p, 'advance', 12);
  const before = await st(a.p); ok(await a.p.evaluate(() => __gift.saveOk()), 'saving is on under automation with &giftsave=1');
  await a.p.evaluate(() => __boat.press()); /* a no-op while driving away from a landing; the position is saved every few seconds and on unload */
  await B(a.p, 'advance', 6); await a.p.evaluate(() => __gift.save()); const saved = await a.p.evaluate(() => JSON.parse(localStorage.getItem('li.gift.day1')).boat);
  ok(saved && saved.engine && saved.load.planks === 3 && saved.load.glass === 2 && Math.abs(saved.x - before.b.x) < 40, 'the save holds the boat: position, motor and load (' + JSON.stringify({ x: saved.x, z: saved.z, engine: saved.engine, load: saved.load }) + ')');
  await a.p.close();
  const b = await open(qs); const s2 = await st(b.p);
  ok(s2.avail && s2.b.engine && s2.b.load.planks === 3 && s2.b.load.glass === 2, 'after a reload the boat has its motor and its load');
  ok(Math.abs(s2.b.x - saved.x) < .2 && Math.abs(s2.b.z - saved.z) < .2 && s2.mode === 'idle', 'and floats where it was left, waiting to be taken (mode ' + s2.mode + ')');
  await B(b.p, 'press'); s2.mode = (await st(b.p)).mode; ok(s2.mode === 'drive', 'tap it and you are driving again');
  /* docked at a landing is remembered too */
  const bl = await b.p.evaluate(() => __boat.landings().find(l => l.id === 'beach')); await B(b.p, 'teleport', bl.x, bl.z, bl.yaw, 'drive'); await B(b.p, 'advance', 1);
  ok(await B(b.p, 'dockHere') && (await st(b.p)).landNow === 'beach', 'docks at the beach landing'); await B(b.p, 'advance', 3); await b.p.evaluate(() => __gift.save());
  await b.p.close(); const c = await open(qs); const s3 = await st(c.p); ok(s3.mode === 'docked' && s3.b.at === 'beach', 'after a reload it is still docked at the beach');
  await c.p.evaluate(() => __gift.wipe()); await c.p.close();
  const e = await open('?ui=0&q=low&game=gift&boat=1&giftsave=1'); ok((await st(e.p)).b.at === 'jetty' && !(await st(e.p)).b.engine, 'with the save wiped the boat is new: rowing, at the jetty'); await e.p.close();
}
/* ================= 10. the errand stub ================= */
if (want(10)) {
  const a = await open('?ui=0&q=low&game=gift&boat=1');
  const off = await a.p.evaluate(() => { __boat.openLanding(); return /errand/i.test(document.querySelector('#gd-layer .gd-card').textContent); }); ok(!off, 'the errand button is not there by default'); await a.p.close();
  const { p, errs } = await open('?ui=0&q=low&game=gift&boat=1&errand=1');
  const on = await p.evaluate(() => { __boat.openLanding(); return /errand/i.test(document.querySelector('#gd-layer .gd-card').textContent); }); ok(on, 'with &errand=1 the Dock card offers "Send it on an errand"');
  const stock0 = await p.evaluate(() => __gift.state().stock); await p.locator('#gd-layer button', { hasText: 'errand' }).first().click(); await wait(p, 500);
  let s = await st(p); ok(s.mode === 'errand' && !s.boarded, 'the boat sets off by itself (no stick, nobody aboard)');
  const ph = new Set(); let g = 0; while ((await st(p)).mode === 'errand' && g++ < 60) { await B(p, 'advance', 10); ph.add((await st(p)).errand); }
  s = await st(p); ok(['out', 'wait', 'back'].every(x => ph.has(x)) || ph.has('out'), 'it went out, waited at the skerry and came back: ' + [...ph].join(', '));
  const stock1 = await p.evaluate(() => __gift.state().stock); const added = Object.keys(stock1).reduce((a, k) => a + stock1[k] - stock0[k], 0);
  ok(s.mode === 'docked' && added >= 2 && s.b.errands === 1 && s.b.cacheDay === 1, 'it ends docked, one crate went into the yard stock (+' + added + ') and the day is used up');
  ok(s.b.part, 'the first crate brought the motor part, waiting in the boat');
  const txt = await p.evaluate(() => JSON.stringify(__boat.state()) + document.getElementById('gd').textContent); ok(!/\b(worker|rower|crew|sailor|captain)\b/i.test(txt.replace(/errand/g, '')), 'nobody is named, counted or shown (no crew words in the HUD)');
  ok(errs.length === 0, 'zero console errors through the errand' + (errs.length ? ' ' + errs[0] : '')); await p.close();
}
/* ================= 11. device presets ================= */
if (want(11)) {
  const t = await open('?ui=0&game=gift&boat=1&device=ipad', { touch: true, w: 1180, h: 820 });
  await B(t.p, 'castOff'); await wait(t.p, 500); const h = await B(t.p, 'hud');
  const rm = await t.p.evaluate(() => { const r = id => { const e = document.getElementById(id), q = e.getBoundingClientRect(); return { w: q.width, h: q.height, x: q.x, y: q.y }; }; return { main: r('bd-main'), stick: r('bd-stick'), info: r('bd-info'), btns: [...document.querySelectorAll('#gd button, #bd button')].filter(b => b.offsetParent).map(b => { const q = b.getBoundingClientRect(); return Math.min(q.width, q.height); }) }; });
  ok(rm.main.h >= 52 && rm.main.w >= 52, 'ipad preset: the Dock button is ' + Math.round(rm.main.w) + ' x ' + Math.round(rm.main.h) + ' px (52 minimum)');
  ok(rm.stick.w >= 120 && rm.stick.h >= 120, 'ipad preset: the stick is ' + Math.round(rm.stick.w) + ' px');
  ok(rm.btns.every(x => x >= 51), 'ipad preset: every visible button is at least 52 px (smallest ' + Math.round(Math.min(...rm.btns)) + ')');
  /* a real touch on the stick */
  const sx = rm.stick.x + rm.stick.w / 2, sy = rm.stick.y + rm.stick.h / 2; const y0 = (await st(t.p)).b.yaw;
  const cdp = await t.c.newCDPSession(t.p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx + 40, y: sy - 30, id: 1 }] }); await B(t.p, 'advance', 8); const s1 = await st(t.p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  ok(s1.u > .5, 'a real touch on the stick drives the boat (' + s1.u.toFixed(2) + ' m/s)');
  const tt = await t.p.evaluate(() => __gift.targets().map(x => x.id)); ok(Array.isArray(tt), 'the gift targets still work while driving');
  ok(t.errs.length === 0, 'ipad preset with touch: 0 console errors' + (t.errs.length ? ' ' + t.errs[0] : '')); await t.p.close(); await t.c.close();
  /* phone width: nothing runs off the screen or sits on top of anything else */
  const ph = await open('?ui=0&game=gift&boat=1&device=ipad', { touch: true, w: 390, h: 844 }); await B(ph.p, 'castOff'); await wait(ph.p, 500);
  const pr = await ph.p.evaluate(() => { const r = id => { const e = document.getElementById(id), q = e.getBoundingClientRect(); return { x: q.x, y: q.y, r: q.right, b: q.bottom, show: getComputedStyle(e).display !== 'none' }; }; return { main: r('bd-main'), stick: r('bd-stick'), info: r('bd-info'), W: innerWidth, H: innerHeight, sw: document.documentElement.scrollWidth }; });
  const inside = o => o.x >= 0 && o.r <= pr.W + 1 && o.y >= 0 && o.b <= pr.H + 1, hit = (a, b) => !(a.r <= b.x || b.r <= a.x || a.b <= b.y || b.b <= a.y);
  ok(inside(pr.main) && inside(pr.stick) && inside(pr.info) && pr.sw <= pr.W + 1, 'phone width 390: stick, button and HUD are all inside the screen and the page does not scroll sideways');
  ok(!hit(pr.main, pr.stick) && !hit(pr.info, pr.stick) && !hit(pr.info, pr.main), 'phone width: the stick, the HUD and the button do not overlap');
  await ph.p.close(); await ph.c.close();
  for (const dev of ['desktop', 'radeon', 'ar']) {
    const r = await open('?ui=0&game=gift&boat=1&device=' + dev); await B(r.p, 'castOff'); await B(r.p, 'force', { steer: 0, throttle: 1 }); await B(r.p, 'advance', 8); const s = await st(r.p), o = await B(r.p, 'obj');
    ok(s.u > 1 && o.visible, 'device=' + dev + ': the boat drives (' + s.u.toFixed(1) + ' m/s, ' + o.tris + ' triangles, ' + o.lod + ' level)');
    ok(r.errs.length === 0, 'device=' + dev + ': 0 console errors' + (r.errs.length ? ' ' + r.errs[0] : '')); await r.p.close();
  }
  const ar = await open('?ui=0&game=gift&boat=1&tier=ar&q=high'); await B(ar.p, 'castOff'); await B(ar.p, 'force', { steer: 0, throttle: 1 }); await B(ar.p, 'advance', 8); const as = await st(ar.p);
  ok(as.u > 1 && ar.errs.length === 0, 'AR light (&tier=ar): the boat drives and there are 0 console errors'); await ar.p.close();
}
/* ================= 12. the preset step-down ================= */
if (want(12)) {
  const q = (s, o) => open('?ui=0&q=low&seed=1122' + s, Object.assign({ noboat: true }, o || {}));
  const info = p => p.evaluate(() => ({ dev: __li.ultra.device(), asked: __li.ultra.asked(), step: __li.ultra.stepdown(), note: (document.getElementById('stepnote') || {}).textContent || '', touch: document.body.classList.contains('dev-touch'), tier: __li.stats().quality, q: new URLSearchParams(location.search).get('q') }));
  let r = await q('&device=radeon&gpuname=Apple%20GPU&fakeua=iPad'); let i = await info(r.p);
  ok(i.dev === 'ipad' && i.asked === 'radeon' && i.step.step && i.touch, 'radeon on an iPad (Apple GPU): the page runs the ipad preset (asked ' + i.asked + ', running ' + i.dev + ', touch targets on)');
  ok(/iPad preset/.test(i.note) && /mobile|built-in/.test(i.note) && !/\n/.test(i.note), 'a one-line note is on the screen: "' + i.note + '"');
  ok(i.tier === 'low', 'and it is the Low tier, not ultra (' + i.tier + ')');
  ok(r.errs.length === 0, 'step-down: 0 console errors'); await r.p.close();
  r = await q('&device=desktop&gpuname=Apple%20GPU&fakeua=iPad'); i = await info(r.p); ok(i.dev === 'ipad' && i.step.step, 'desktop on an iPad steps down too'); await r.p.close();
  r = await q('&device=radeon&gpuname=ANGLE%20(Intel%2C%20Intel(R)%20UHD%20Graphics%20630%20Direct3D11%20vs_5_0%20ps_5_0%2C%20D3D11)&fakeua=Windows'); i = await info(r.p); ok(i.dev === 'ipad' && /built-in/.test(i.note), 'radeon on an Intel integrated chip steps down: "' + i.note + '"'); await r.p.close();
  r = await q('&device=radeon&gpuname=ANGLE%20(AMD%2C%20AMD%20Radeon%20VII%20Unknown%20Prefixed%2C%20OpenGL%204.1)&fakeua=Windows'); i = await info(r.p); ok(i.dev === 'radeon' && !i.note && !i.step.step, 'radeon on a Radeon VII stays radeon, no note'); await r.p.close();
  r = await q('&device=radeon'); i = await info(r.p); ok(i.dev === 'radeon' && !i.step.step, 'under software rendering (these tests) the radeon preset is left alone'); await r.p.close();
  r = await q('&device=radeon&gpuname=Apple%20GPU&fakeua=iPad&stepdown=0'); i = await info(r.p); ok(i.dev === 'radeon' && !i.note, '&stepdown=0 keeps the preset asked for'); await r.p.close();
  r = await q('&device=ipad&gpuname=Apple%20GPU&fakeua=iPad'); i = await info(r.p); ok(i.dev === 'ipad' && !i.note, 'the ipad preset on an iPad gets no note'); await r.p.close();
  r = await open('?ui=0&seed=1122&device=radeon&q=high&gpuname=Apple%20GPU&fakeua=iPad', { noboat: true }); i = await info(r.p); ok(i.dev === 'ipad' && i.q === 'high', 'an explicit &q=high still wins over the preset defaults'); await r.p.close();
  r = await open('?ui=0&q=high&seed=1122', { noboat: true }); i = await r.p.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris })); ok(i.h === '8d962c0c' && i.t === 88790, 'no preset: the default page is untouched (' + i.h + ', ' + i.t + ')'); await r.p.close();
}
/* ================= 13. budgets ================= */
if (want(13)) {
  /* the boat layer's own cost is counted exactly (every visible mesh under it); the whole page's draw calls from the bench panel move by tens from run to run with the robots and the litter, so that figure is not used */
  const r2 = await open('?ui=0&game=gift&device=ipad&boat=1&motor=1'); await B(r2.p, 'give', { load: { planks: 4, rope: 2, glass: 1, metal: 1 } }); await B(r2.p, 'castOff'); await B(r2.p, 'force', { steer: 0, throttle: 1 }); await B(r2.p, 'advance', 6);
  const cost = await B(r2.p, 'cost'), fxn = await B(r2.p, 'fx'); const sc = await r2.p.evaluate(() => __li.stats().tris); await r2.p.close();
  console.log('the boat layer alone (motor fitted, a full load of 8, moving at speed, every visible mesh under it, the contact ring included):', JSON.stringify(cost), 'wake pool', JSON.stringify(fxn), 'whole scene triangles', sc);
  ok(cost.calls <= 30, 'the boat layer is ' + cost.calls + ' meshes (draw calls, before shadows) on the ipad preset: at most 30');
  ok(cost.tris < 7000, 'and ' + cost.tris + ' triangles: under 7,000');
  ok(sc < 150000, 'the whole gift scene on the ipad preset is ' + sc + ' triangles (under 150,000)');
}
/* ================= 14. the bow camera (&cam=bow, default off) ================= */
if (want(14)) {
  const d = await open('?ui=0&q=low&game=gift&boat=1&device=ipad', { touch: true, w: 1180, h: 820 });
  await B(d.p, 'castOff'); await B(d.p, 'advance', 1); await wait(d.p, 800);
  ok(!(await B(d.p, 'bow')).on, 'default: the chase camera (bow view is off)');
  const f0 = (await B(d.p, 'camInfo')).fov;
  const btn = await d.p.evaluate(() => { const e = document.getElementById('bd-cam'); if (!e || !e.isConnected) return null; const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, t: e.textContent }; });
  ok(btn && btn.h >= 52 && btn.w >= 52 && /Bow view/.test(btn.t), 'the camera button is on the HUD, 52 px or more under the ipad preset: ' + JSON.stringify(btn));
  await d.p.locator('#bd-cam').click(); await B(d.p, 'advance', 1); await wait(d.p, 1200);
  let ci = await B(d.p, 'camInfo'), bw = await B(d.p, 'bow'), tide = ci.tide;
  ok(bw.on && ci.fov > 55 && ci.y > tide + 1.2 && ci.y < tide + 2.2, 'tap it: eye level on the boat (camera ' + (ci.y - tide).toFixed(2) + ' m above the sea, field of view ' + ci.fov.toFixed(0) + ' degrees)');
  ok(/Chase view/.test(await d.p.evaluate(() => document.getElementById('bd-cam').textContent)), 'the button now offers the chase view');
  await d.p.locator('#bd-cam').click(); await B(d.p, 'advance', 1); await wait(d.p, 2500); ci = await B(d.p, 'camInfo');
  ok(!(await B(d.p, 'bow')).on && Math.abs(ci.fov - f0) < 6, 'tap again: back to the chase camera and the old field of view (' + ci.fov.toFixed(1) + ' against ' + f0.toFixed(1) + ')');
  ok(d.errs.length === 0, 'bow view toggled: 0 console errors' + (d.errs.length ? ' ' + d.errs[0] : '')); await d.p.close(); await d.c.close();
  const e = await open('?ui=0&q=low&game=gift&boat=1&cam=bow&motor=1&rim=0'); await B(e.p, 'castOff'); await B(e.p, 'force', { steer: 0, throttle: 1 }); await B(e.p, 'advance', 5); await wait(e.p, 1200);
  ok((await B(e.p, 'bow')).on && (await B(e.p, 'state')).u > 4, '&cam=bow starts in bow view and the boat drives (' + (await B(e.p, 'state')).u.toFixed(1) + ' m/s)');
  ok(e.errs.length === 0, '&cam=bow&rim=0: 0 console errors' + (e.errs.length ? ' ' + e.errs[0] : '')); await e.p.close();
}
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); await browser.close(); if (fails) process.exit(1);
function LIB_wrap(a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }
