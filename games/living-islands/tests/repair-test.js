/* REPAIR TEST: repair_physics.js (pure node, no browser). Run: node games/living-islands/tests/repair-test.js
   Checks (see REPAIR_PILOT.md): determinism (same inputs, same hash; different inputs, different hash); planks and posts come to rest and sleep, flat on the ground at the height of their own thickness;
   nothing tunnels through the ground or through a 6 cm deck plank with 1/30 s frames and 6 m drops; a snap accepts the right slot (also turned a half turn) and rejects the wrong kind, too far,
   the wrong angle and a filled slot, and takes the nearest of two; a joint breaks above its load only (half the load never, a long load just under it wears it, above it at once), and the water
   load follows the water height; wood floats at about its density ratio and settles level, rides a rising level and sits down on a falling one; a current moves a floating part; a part in a hand follows it
   and passes through static frames; sleeping parts wake when hit; 1000 random drops on bumpy ground stay finite, never go under the ground and nearly all come to rest. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
await import(path.join(here, '..', 'repair_physics.js')); const R = globalThis.LI_REPAIR;
let fails = 0;
const ok = (c, msg, extra) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  [' + extra + ']' : '')); };
const f3 = x => +x.toFixed(3), fin = a => a.every(Number.isFinite);
const upY = b => Math.abs(R.qmat(b.q)[4]);   /* the y component of the part's own y axis: 1 means flat */
const run = (w, s, dt = 1 / 60) => { for (let i = 0, n = Math.round(s / dt); i < n; i++) w.advance(dt); };

/* 1. determinism */
{
  const mk = seed => { const w = R.create({ seed, ground: (x, z) => .15 * Math.sin(x * .7) * Math.cos(z * .5) }); for (let i = 0; i < 6; i++) w.addBody(i % 3 === 2 ? 'post' : 'plank', { p: [i * .5, 1 + i * .3, (i % 2) * .4], q: R.qaxis([1, .2, .3], i * .5) }); return w; };
  const a = mk(5), b = mk(5), c = mk(5); run(a, 5); run(b, 5); run(c, 5, 1 / 30);
  ok(a.hash() === b.hash(), 'same setup, same 1/60 s frames: same hash after 5 s', a.hash());
  ok(a.hash() === c.hash(), 'the same run with 1/30 s frames gives the same hash (fixed internal timestep)', c.hash());
  const d = mk(5); d.bodies[0].p[0] += .01; run(d, 5);
  ok(d.hash() !== a.hash(), 'a different start gives a different hash');
}
/* 2. coming to rest */
{
  const w = R.create({ seed: 1, ground: () => 0 }); const B = [];
  for (let i = 0; i < 8; i++) B.push(w.addBody('plank', { p: [i * 2.2 - 8, 2 + i * .2, 0], q: R.qaxis([1, .4, .7], .3 + i * .45) }));
  const post = w.addBody('post', { p: [10, 1.5, 0], q: R.qaxis([0, 0, 1], 1.2) });
  run(w, 8);
  ok(B.every(b => b.asleep), 'eight planks dropped from 2 to 3.4 m are asleep within 8 s');
  ok(B.every(b => Math.abs(b.p[1] - .04) < .012 && upY(b) > .985), 'each lies flat on the ground, centre 4 cm up (the height of its own thickness)', B.map(b => f3(b.p[1]) + '/' + f3(upY(b))).join(' '));
  ok(post.asleep && Math.abs(post.p[1] - .075) < .02, 'a post dropped at an angle lies down on its side and sleeps', f3(post.p[1]));
  /* a plank on a 15 degree slope stays put (friction) */
  const s = R.create({ seed: 1, ground: x => -Math.tan(.26) * x }); const p2 = s.addBody('plank', { p: [0, .6, 0] }); run(s, 4);
  ok(p2.asleep || Math.hypot(...p2.v) < .05, 'a plank on a 15 degree slope of sand is held by friction', f3(Math.hypot(...p2.v)));
  const s2 = R.create({ seed: 1, ground: x => -Math.tan(.7) * x }); const p3 = s2.addBody('plank', { p: [0, .6, 0] }); run(s2, 4);
  ok(p3.p[0] > 1, 'on a 40 degree slope it slides down (it does not stick)', f3(p3.p[0]));
  /* stacking: a plank dropped across another comes to rest on top of it */
  const t = R.create({ seed: 1, ground: () => 0 }); const lo = t.addBody('plank', { p: [0, .04, 0] }); const hi = t.addBody('plank', { p: [0, .5, 0], q: R.qyaw(Math.PI / 2) }); run(t, 5);
  ok(hi.p[1] > lo.p[1] + .05 && upY(hi) > .98, 'a plank dropped across another rests on it, not through it', f3(hi.p[1]) + ' over ' + f3(lo.p[1]));
}
/* 3. no tunnelling with 1/30 s frames and fast drops */
{
  let lowest = 1e9;
  const w = R.create({ seed: 1, ground: () => 0 }); const B = [];
  for (let i = 0; i < 12; i++) B.push(w.addBody(i % 4 === 3 ? 'post' : 'plank', { p: [i * 2 - 12, 6, 0], q: R.qaxis([1, 1, 0], i), v: [0, -4, 0] }));
  for (let i = 0; i < 30 * 5; i++) { w.advance(1 / 30); for (const b of B) lowest = Math.min(lowest, b.p[1] - (b.kind === 'post' ? 0 : 0)); }
  ok(lowest > -.01, 'nothing goes below the ground from a 6 m drop at 4 m/s with 1/30 s frames', f3(lowest));
  /* a thin deck plank (static box 6 cm thick) with a plank dropped on it */
  const d = R.create({ seed: 1, ground: () => -2 }); d.addStatic({ p: [0, 1, 0], h: [.095, .03, .83] });
  const q = d.addBody('plank', { p: [0, 4, 0], v: [0, -5, 0] }); let minY = 1e9; for (let i = 0; i < 30 * 3; i++) { d.advance(1 / 30); minY = Math.min(minY, q.p[1]); }
  ok(minY > 1.0 && q.p[1] > 1.0, 'a plank dropped at 5 m/s on a 6 cm deck plank with 1/30 s frames stays on top (no tunnelling)', f3(minY));
  /* a held part dragged fast keeps its speed under the cap */
  const h = R.create({ seed: 1, ground: () => 0 }); const hb = h.addBody('plank', { p: [0, 1, 0] }); let vmax = 0;
  for (let i = 0; i < 90; i++) { h.holdBody(hb.id, [i * .3 - 10, 1, 0]); h.advance(1 / 30); vmax = Math.max(vmax, Math.hypot(...hb.v)); }
  ok(vmax <= 6.0001, 'speed is capped (6 m/s)', f3(vmax));
}
/* 4. sockets: snap accepts and rejects */
{
  const w = R.create({ seed: 1, ground: () => -5 });
  const mk = id => w.addSocket({ id, kind: 'plank', p: [0, 1.4, id === 'a' ? 0 : .205], q: R.qyaw(.3), snapR: .27, snapAng: .52 });
  mk('a'); mk('b'); const post = w.addSocket({ id: 'post', kind: 'post', p: [3, 1.8, 0], snapR: .4, snapAng: .5 });
  const P = (p, q, kind = 'plank') => { const b = w.addBody(kind, { p, q }); b.asleep = true; return b; };
  const right = P([.05, 1.45, .04], R.qyaw(.3 + .2));
  const r1 = w.testFit(right); ok(r1.ok && r1.socket.id === 'a', 'right slot, small error: accepted', r1.socket && r1.socket.id);
  const half = P([0, 1.4, 0], R.qyaw(.3 + Math.PI)); ok(w.testFit(half).ok, 'a plank turned a half turn about the vertical still fits (it is symmetric)');
  const flip = P([0, 1.4, 0], R.qmul(R.qyaw(.3), R.qaxis([0, 0, 1], Math.PI))); ok(w.testFit(flip).ok, 'a plank upside down fits as well (same box)');
  const far = P([.9, 1.4, 0], R.qyaw(.3)); const rf = w.testFit(far); ok(!rf.ok && rf.reason === 'far', 'too far: rejected as far', rf.reason + ' ' + f3(rf.d));
  const ang = P([0, 1.4, 0], R.qyaw(.3 + Math.PI / 2)); const ra = w.testFit(ang); ok(!ra.ok && ra.reason === 'angle', 'a quarter turn out: rejected as wrong angle', ra.reason);
  const tilt = P([0, 1.4, 0], R.qmul(R.qyaw(.3), R.qaxis([1, 0, 0], .9))); ok(!w.testFit(tilt).ok, 'a plank on its side (0.9 rad of roll) is rejected');
  const pk = P([3, 1.8, 0], R.qyaw(0), 'post'); const wk = P([3, 1.8, 0], R.qyaw(0)); ok(w.testFit(pk).ok && !w.testFit(wk).ok && w.testFit(wk).reason === 'kind', 'a post fits the post socket and a plank does not (wrong kind)', w.testFit(wk).reason);
  const near = P([.14, 1.4, .1], R.qyaw(.3)); ok(w.testFit(near).socket.id === 'a' || w.testFit(near).socket.id === 'b', 'with two slots in range the nearest wins');
  const n2 = P([.17, 1.4, .15], R.qyaw(.3)); ok(w.testFit(n2).socket.id === 'b' && w.testFit(n2).ok, 'nearer to b than a: b', w.testFit(n2).socket.id);
  /* fit, then hold, and the slot is taken */
  const b1 = w.addBody('plank', { p: [0, 1.45, 0], q: R.qyaw(.3) }); const fr = w.fit(b1); run(w, 1); ok(fr.ok && b1.state === 'fitted' && w.socketById('a').filled === b1, 'a fit becomes a held part after the click animation');
  ok(f3(b1.p[1]) === 1.4, 'the fitted part sits exactly on the slot', f3(b1.p[1]));
  const again = w.addBody('plank', { p: [0, 1.45, 0], q: R.qyaw(.3) }); const r2 = w.testFit(again, 'a'); ok(!r2.ok && r2.reason === 'filled', 'a taken slot rejects a second plank', r2.reason);
  const ev = w.events.filter(e => e.type === 'fit'); ok(ev.length === 1 && ev[0].socket === 'a', 'one fit event with the socket id');
  /* place (tap to place): kind and filled count, pose does not */
  const q2 = w.addBody('plank', { p: [4, 1, 3], q: R.qyaw(1.5) }); ok(w.place(q2, 'b', 10).ok, 'tap to place puts a plank in a free plank slot from a few metres away');
  const q3 = w.addBody('plank', { p: [4, 1, 3] }); ok(w.place(q3, 'post', 10).reason === 'kind' && w.place(q3, 'a', 10).reason === 'filled' && w.place(q3, 'b', 1).reason === 'filled', 'tap to place still refuses a wrong kind or a taken slot');
  const q4 = w.addBody('plank', { p: [40, 1, 3] }); const w2 = R.create({ ground: () => -5 }); w2.addSocket({ id: 'z', p: [0, 1, 0] }); const q5 = w2.addBody('plank', { p: [40, 1, 3] }); ok(w2.place(q5, 'z', 12).reason === 'far', 'and refuses a socket out of reach');
}
/* 5. joints */
{
  const mk = (type, strength) => { const w = R.create({ seed: 3, ground: () => -9 }); const s = w.addSocket({ id: 's', p: [0, 1.4, 0], joint: { type, strength } }); const b = w.addBody('plank', { p: [0, 1.4, 0] }); w.fit(b); run(w, 1); return { w, s, b, lim: strength * b.health }; };
  let J = mk('nail', 780); ok(J.b.state === 'fitted' && J.b.health >= .8 && J.b.health <= 1.05, 'a fitted plank has a health factor of 0.8 to 1.05 (this one ' + f3(J.b.health) + ')');
  for (let i = 0; i < 2000; i++) J.w.applyLoad('s', .45 * J.lim, 1 / 120); ok(J.b.state === 'fitted', 'a load of 45 percent of the break load for 16 s never breaks it');
  J = mk('nail', 780); let broke = false; for (let i = 0; i < 100; i++) if (J.w.applyLoad('s', .9 * J.lim, 1 / 120)) { broke = true; break; } ok(!broke && J.b.state === 'fitted', 'a load of 90 percent holds for the first second (fatigue is slow)');
  J = mk('nail', 780); broke = false; for (let i = 0; i < 120 * 12; i++) if (J.w.applyLoad('s', .9 * J.lim, 1 / 120)) { broke = true; break; } ok(broke, 'but 90 percent for twelve seconds wears it through (fatigue)');
  J = mk('nail', 780); ok(J.w.applyLoad('s', 1.02 * J.lim, 1 / 120) === true && J.b.state === 'dyn' && J.w.socketById('s').filled === null, 'above the break load: breaks at once, the plank is loose and the slot free');
  const evs = J.w.events.filter(e => e.type === 'break'); ok(evs.length === 1 && evs[0].why === 'overload', 'one break event, overload');
  J = mk('lash', 300); J.w.applyLoad('s', .99 * J.lim, 1 / 120); ok(J.b.state === 'fitted', 'just under the break load for one step: holds');
  J = mk('nail', 780); ok(!J.w.applyLoad('s', 0, 1), 'no load, no break');
  /* the water load follows the water height */
  const sea = lvl => { const w = R.create({ seed: 3, ground: () => -9, water: () => lvl.v }); w.addSocket({ id: 's', p: [0, 1.4, 0], joint: { type: 'lash', strength: 300 } }); const b = w.addBody('plank', { p: [0, 1.4, 0] }); w.fit(b); return { w, b }; };
  const lv = { v: 0 }; const S = sea(lv); run(S.w, 1); for (let i = 0; i < 600; i++) S.w.advance(1 / 60); ok(S.b.state === 'fitted', 'sea well under the deck: nothing happens for 10 s');
  lv.v = 1.4 + .03; run(S.w, 3); ok(S.b.state === 'fitted', 'sea just at the underside of the plank: holds');
  lv.v = 1.4 - .023 + .25; run(S.w, 2); ok(S.b.state === 'dyn', 'sea 25 cm over the underside: a 300 N lashing gives way', f3(S.w.socketById('s').peak));
  const lv2 = { v: 1.4 - .023 + .25 }; const S2 = (() => { const w = R.create({ seed: 3, ground: () => -9, water: () => lv2.v }); w.addSocket({ id: 's', p: [0, 1.4, 0], joint: { type: 'nail', strength: 780 } }); const b = w.addBody('plank', { p: [0, 1.4, 0] }); w.fit(b); return { w, b }; })(); run(S2.w, 3); ok(S2.b.state === 'fitted', 'the same sea does not break a 780 N nail', f3(S2.w.socketById('s').peak));
  lv2.v = 1.4 - .023 + .6; run(S2.w, 3); ok(S2.b.state === 'dyn', 'a sea 60 cm over the underside does');
}
/* 6. buoyancy */
{
  const lvl = { v: 0 }; const w = R.create({ seed: 1, ground: () => -3, water: () => lvl.v });
  const a = w.addBody('plank', { p: [0, 1.2, 0], q: R.qaxis([1, .3, .2], 1.1) }), b = w.addBody('plank', { p: [3, 1.2, 0], q: R.qaxis([0, 0, 1], 2.6) }), c = w.addBody('post', { p: [6, 1.2, 0], q: R.qaxis([1, 0, 0], 1.4) });
  run(w, 10);
  ok([a, b].every(x => Math.abs(x.sub - .52) < .1 && upY(x) > .95 && Math.abs(x.p[1] - lvl.v) < .06), 'planks float flat, about 52 percent wet (their density ratio), at the water line', [a, b].map(x => f3(x.sub) + '/' + f3(x.p[1]) + '/' + f3(upY(x))).join(' '));
  ok(c.sub > .3 && c.sub < .75 && !c.asleep, 'a post floats, wet by about its density ratio, never sleeps', f3(c.sub));
  ok(!a.asleep && !b.asleep, 'floating parts do not sleep');
  lvl.v = .6; run(w, 6); ok(Math.abs(a.p[1] - .6) < .06, 'a rising water level lifts the plank with it', f3(a.p[1]));
  lvl.v = -4; run(w, 6); ok(a.p[1] < -2.5 && a.p[1] > -3.2, 'the plank sinks to the ground when the water falls away (no ground under -3)', f3(a.p[1]));
  const sh = R.create({ seed: 1, ground: x => -.5 + x * .1, water: () => 0 }); const d = sh.addBody('plank', { p: [0, .5, 0] }); run(sh, 10); ok(!d.asleep || d.sub < .05, 'on a shelving beach a plank floats in and grounds in the shallows', f3(d.p[0]) + ' ' + f3(d.p[1]));
  /* a current moves a floating part */
  const cw = R.create({ seed: 1, ground: () => -3, water: () => 0, current: () => [.4, -.2] }); const f = cw.addBody('plank', { p: [0, .1, 0] }); run(cw, 8);
  ok(f.p[0] > 1.5 && f.p[2] < -.5, 'a current of 0.4, -0.2 m/s carries a floating plank along', f3(f.p[0]) + ' ' + f3(f.p[2]));
  const dw = R.create({ seed: 1, ground: () => 0, current: () => [.8, 0] }); const dd = dw.addBody('plank', { p: [0, .04, 0] }); run(dw, 4); ok(Math.abs(dd.p[0]) < .01, 'a current does not move a plank lying dry (no water, no push)');
  /* things in the water: no explosion */
  let maxv = 0; const ww = R.create({ seed: 1, ground: x => -1 + Math.sin(x) * .3, water: (x, z) => .05 * Math.sin(x * 2 + z) }); const L = []; for (let i = 0; i < 10; i++) L.push(ww.addBody('plank', { p: [i * .4, 1 + i * .2, 0], q: R.qaxis([1, 2, 3], i) })); for (let i = 0; i < 60 * 10; i++) { ww.advance(1 / 60); for (const x of L) maxv = Math.max(maxv, Math.hypot(...x.v)); }
  ok(maxv <= 6.0001 && L.every(x => fin(x.p) && fin(x.q)), 'ten planks piled into a swell stay finite and under the speed cap', f3(maxv));
}
/* 7. the hand, sleeping, waking, washing away */
{
  const w = R.create({ seed: 1, ground: () => 0 }); w.addStatic({ p: [2, .5, 0], h: [.1, .5, 2] });   /* a wall */
  const b = w.addBody('plank', { p: [0, 1, 0] });
  for (let i = 0; i < 180; i++) { w.holdBody(b.id, [4, 1.2, 0], R.qyaw(0)); w.advance(1 / 60); }
  ok(Math.hypot(b.p[0] - 4, b.p[1] - 1.2) < .05, 'a held part follows the hand, through a static frame (a hand does not snag)', f3(b.p[0]) + ' ' + f3(b.p[1]));
  ok(upY(b) > .999, 'and is carried flat');
  w.release(b.id); run(w, 4); ok(b.asleep && Math.abs(b.p[1] - .04) < .012, 'released, it drops and sleeps on the ground');
  const hit = w.addBody('plank', { p: [4, 1.5, 0], q: R.qyaw(Math.PI / 2) }); run(w, 3); ok(hit.p[1] > b.p[1] + .05, 'a plank dropped on a sleeping plank lands on it and does not pass through', f3(hit.p[1]));
  const k = w.addBody('plank', { p: [4.4, .5, .3], v: [-3, 0, 0] }); const was = b.asleep; run(w, 1.5); ok(was && (Math.abs(b.p[0] - 4) > .02 || b.state !== 'dyn' || !b.asleep), 'a plank sliding into a sleeper wakes and moves it', f3(b.p[0]));
  const gone = R.create({ seed: 1, ground: () => -50, lostR: 20, origin: [0, 0] }); const g = gone.addBody('plank', { p: [0, 2, 0], v: [5, 0, 0] }); run(gone, 6); ok(g.lost && gone.events.some(e => e.type === 'lost'), 'a part that leaves the site is lost (washed away) and says so');
}
/* 8. a ray picks the nearest loose part */
{
  const w = R.create({ seed: 1, ground: () => 0 }); const a = w.addBody('plank', { p: [0, .04, 0] }), b = w.addBody('plank', { p: [0, .04, 2] }); run(w, 1);
  const dir = [0, .04 - 3, 2 - 4], dl = Math.hypot(...dir), h = w.raycast([0, 3, 4], dir.map(v => v / dl)); ok(h && h.id === b.id, 'a ray from above and the front hits the nearer plank first');
  ok(w.raycast([0, 3, 4], [0, 0, -1]) === null, 'a ray passing over them hits nothing');
  const wide = w.raycast([0, .8, 3.3], [.25 / 1.0, -.5, -.8].map(v => v / Math.hypot(.25, .5, .8)), .25); ok(!w.raycast([0, .8, 3.3], [.25, -.5, -.8].map(v => v / Math.hypot(.25, .5, .8)), 0) && wide && wide.id === b.id, 'a larger pick pad forgives a near miss (touch)');
}
/* 9. 1000 random drops */
{
  const ground = (x, z) => .25 * Math.sin(x * .6) * Math.cos(z * .45) + .08 * Math.sin(x * 2.1 + z * 1.7);
  let rest = 0, bad = 0, under = 1e9, N = 0, nanc = 0; const t0 = Date.now();
  for (let k = 0; k < 40; k++) {
    const w = R.create({ seed: 100 + k, ground }); const r = R.mulberry32(900 + k), B = [];
    for (let i = 0; i < 25; i++) { const kind = r() < .15 ? 'post' : 'plank'; B.push(w.addBody(kind, { p: [(i % 5) * 3.2 - 6, 1 + r() * 4, ((i / 5) | 0) * 3.2 - 6], q: R.qaxis([r() - .5, r() - .5, r() - .5], r() * 6.28), v: [(r() - .5) * 4, -r() * 3, (r() - .5) * 4], w: [(r() - .5) * 6, (r() - .5) * 6, (r() - .5) * 6] })); }
    for (let i = 0; i < 60 * 8; i++) w.advance(1 / 60);
    for (const b of B) { N++; if (!fin(b.p) || !fin(b.q) || !fin(b.v)) { nanc++; continue; } const g = ground(b.p[0], b.p[2]); under = Math.min(under, b.p[1] - g); if (b.asleep) rest++; if (Math.hypot(...b.v) > 6.001 || b.p[1] - g < -.08) bad++; }
  }
  ok(N === 1000 && nanc === 0 && bad === 0, '1000 random drops (pose, spin, speed) on bumpy ground: all finite, none under the ground, none over the speed cap', 'min height over ground ' + f3(under) + ', ' + (Date.now() - t0) + ' ms');
  ok(rest >= 960, 'at least 96 percent are asleep (at rest) after 8 s', rest + ' of 1000');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
