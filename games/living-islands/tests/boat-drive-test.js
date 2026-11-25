/* THE GIFT, the boat you can drive: pure node test (no browser). Speed, turning, heel, the tide and the land rule, load and capacity, the skerry cache, the autopilot, path finding,
   the errand stub, the save round trip, the first-trip hint, tone rails on the text, and the preset step-down rule (ultra.js).
   Run: node games/living-islands/tests/boat-drive-test.js */
await import('../boat_drive.js');
await import('../ultra.js');
const K = globalThis.LI_BOAT_DRIVE, U = globalThis.LI_ULTRA;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const near = (a, b, e) => Math.abs(a - b) <= e;
const open = { depth: () => 5, wind: { x: 0, z: 0, speed: 0 }, sea: 0, t: 0 };
const run = (b, inp, env, secs, dt = .05) => { for (let i = 0; i < secs / dt; i++) { K.step(b, typeof inp === 'function' ? inp(b, i * dt) : inp, env, dt); env.t = (env.t || 0) + dt; } return b; };

/* ---- 1. speed ---- */
{
  let b = K.newBoat({ x: 0, z: 0, yaw: 0 }); const e = Object.assign({}, open); run(b, { steer: 0, throttle: 1 }, e, 12);
  let t0 = b.x, sum = 0, m = 0; for (let i = 0; i < 400; i++) { K.step(b, { steer: 0, throttle: 1 }, e, .05); e.t += .05; sum += b.u; m++; }
  ok(near(sum / m, 1.7, .12), 'rowing: a steady pull settles at about 1.7 m/s (' + (sum / m).toFixed(2) + ')');
  ok(b.x > t0 && Math.abs(b.z) < .05, 'it goes straight ahead along the heading and stays on its line');
  let c = K.newBoat({ x: 0, z: 0, yaw: 0 }); c.engine = true; run(c, { steer: 0, throttle: 1 }, Object.assign({}, open), 8);
  ok(c.u > 5.9 && c.u <= 6.2001, 'with the small motor it settles at about 6.2 m/s (' + c.u.toFixed(2) + ')');
  ok(c.u / b.u > 3, 'the motor is more than three times faster than the oars');
  let d = K.newBoat({ x: 0, z: 0, yaw: 0 }); const e2 = Object.assign({}, open); let t90 = null; for (let i = 0; i < 400; i++) { K.step(d, { steer: 0, throttle: 1 }, e2, .05); e2.t += .05; if (t90 === null && d.u > 1.5) t90 = i * .05; }
  ok(t90 !== null && t90 < 6, 'oars reach 1.5 m/s in under six seconds (' + t90 + ' s): it answers a push');
  let f = K.newBoat({ x: 0, z: 0, yaw: 0 }); f.load = { planks: 4, rope: 0, glass: 0, metal: 0 }; run(f, { steer: 0, throttle: 1 }, Object.assign({}, open), 14);
  ok(f.u < b.u * .9 && f.u > b.u * .6, 'a full load slows the boat by about a quarter (' + f.u.toFixed(2) + ' against ' + b.u.toFixed(2) + ')');
  let g = K.newBoat({ x: 0, z: 0, yaw: 0 }); run(g, { steer: 0, throttle: 1 }, Object.assign({}, open, { sea: 1 }), 14);
  ok(g.u < b.u * .92 && g.u > b.u * .7, 'a rough sea costs about a fifth of the speed (' + g.u.toFixed(2) + ')');
  let h = K.newBoat({ x: 0, z: 0, yaw: 0 }); run(h, { steer: 0, throttle: 1 }, Object.assign({}, open), 8); run(h, { steer: 0, throttle: 0 }, Object.assign({}, open), 10);
  ok(Math.abs(h.u) < .05, 'let go of the stick and the boat coasts to a stop');
  let r = K.newBoat({ x: 0, z: 0, yaw: 0 }); run(r, { steer: 0, throttle: -1 }, Object.assign({}, open), 10);
  ok(r.u < -.4 && r.u > -.7 && r.x < 0, 'backing water: slow astern (' + r.u.toFixed(2) + ') and the boat goes backward');
  let w = K.newBoat({ x: 0, z: 0, yaw: 0 }); run(w, { steer: 0, throttle: 0 }, Object.assign({}, open, { wind: { x: 0, z: -1, speed: 21 } }), 20);
  ok(w.z < -2 && w.z > -6, 'drifting in a gale (21 m/s) pushes it slowly downwind: ' + w.z.toFixed(1) + ' m in 20 s, not more');
}
/* ---- 2. turning, heel, trim ---- */
{
  const e = Object.assign({}, open); let b = K.newBoat({ x: 0, z: 0, yaw: 0 }); b.engine = true; run(b, { steer: 0, throttle: 1 }, e, 6);
  const y0 = b.yaw; run(b, { steer: -1, throttle: 1 }, e, 1);
  ok(b.yaw - y0 > 1.1, 'steer to port: the yaw grows (up to 1.9 rad/s with the motor): ' + (b.yaw - y0).toFixed(2) + ' rad in 1 s');
  ok(b.roll > .05, 'turning to port heels the boat away from the turn (port side up, roll ' + b.roll.toFixed(3) + ')');
  let c = K.newBoat({ x: 0, z: 0, yaw: 0 }); c.engine = true; run(c, { steer: 0, throttle: 1 }, e, 6); run(c, { steer: 1, throttle: 1 }, e, 1);
  ok(c.yaw < -1.1 && c.roll < -.05, 'steer to starboard: the yaw falls and the heel flips (roll ' + c.roll.toFixed(3) + ')');
  ok(Math.abs(b.roll) <= .16 + 1e-9, 'heel is capped at about nine degrees');
  ok(b.pitch > .05 && b.pitch <= .09, 'the motor boat trims bow up with speed (' + b.pitch.toFixed(3) + ' rad)');
  let d = K.newBoat({ x: 0, z: 0, yaw: 0 }); run(d, { steer: 0, throttle: 1 }, e, 12);
  ok(Math.abs(d.pitch) < .005, 'the rowing boat does not trim');
  let s = K.newBoat({ x: 0, z: 0, yaw: 0 }); const ys = s.yaw; run(s, { steer: 1, throttle: 0 }, e, 3);
  ok(Math.abs(s.yaw - ys) > .5, 'at rest the oars can still pivot the boat (' + (s.yaw - ys).toFixed(2) + ' rad)');
  let m = K.newBoat({ x: 0, z: 0, yaw: 0 }); m.engine = true; const ym = m.yaw; run(m, { steer: 1, throttle: 0 }, e, 1);
  let m2 = K.newBoat({ x: 0, z: 0, yaw: 0 }); m2.engine = true; run(m2, { steer: 0, throttle: 1 }, e, 6); const ym2 = m2.yaw; run(m2, { steer: 1, throttle: 1 }, e, 1);
  ok(Math.abs(m.yaw - ym) < Math.abs(m2.yaw - ym2) * .7, 'a motor with no way on turns the boat less than at speed (' + Math.abs(m.yaw - ym).toFixed(2) + ' against ' + Math.abs(m2.yaw - ym2).toFixed(2) + ' rad in 1 s)');
  const rk = K.rock({ x: 5, z: 5, yaw: .3, engine: false }, 3, 0); const rs = K.rock({ x: 5, z: 5, yaw: .3, engine: false }, 3, 1);
  let calmMax = 0, stormMax = 0; for (let t = 0; t < 60; t += .25) { const a = K.rock({ x: 5, z: 5, yaw: .3, engine: false }, t, .1), z = K.rock({ x: 5, z: 5, yaw: .3, engine: false }, t, 1); calmMax = Math.max(calmMax, Math.abs(a.roll) + Math.abs(a.pitch)); stormMax = Math.max(stormMax, Math.abs(z.roll) + Math.abs(z.pitch)); }
  ok(stormMax > calmMax * 1.5 && stormMax < .2, 'a storm rocks the hull more than a calm sea (' + calmMax.toFixed(3) + ' against ' + stormMax.toFixed(3) + ' rad) and stays below 0.2 rad');
}
/* ---- 3. the tide, grounding and the land rule: a beach that slopes up toward +x, ground height h = 0.06 * (x - 40) - 2, so the waterline at tide 0 is at x = 73 ---- */
{
  const H = x => 0.06 * (x - 40) - 2, mk = tide => ({ depth: (x, z) => tide - H(x), wind: { x: 0, z: 0, speed: 0 }, sea: 0, t: 0 });
  let b = K.newBoat({ x: 40, z: 0, yaw: 0 }); const e = mk(0); let minDepth = 99;
  run(b, (bb) => { minDepth = Math.min(minDepth, K.hullDepth(bb, e)); return { steer: 0, throttle: 1 }; }, e, 80);
  ok(minDepth >= K.LAND_DEPTH - 1e-6, 'driving straight at the beach for 80 s: the hull never goes below 5 cm of water (' + minDepth.toFixed(3) + ')');
  ok(b.x < 74 && b.x > 60, 'it stops at the waterline (x = ' + b.x.toFixed(1) + ', the waterline is at 73)');
  ok(b.grounded, 'it is grounded on the shallows (draft 0.22 m)');
  const sp = Math.abs(b.u); ok(sp < .6, 'it scrapes along slowly in the shallows (' + sp.toFixed(2) + ' m/s)');
  /* the tide falls 0.6 m while it lies there: the beach grows and the boat is left on it, never moved onto the sand */
  const low = mk(-.6); const xb = b.x; run(b, { steer: 0, throttle: 0 }, low, 10);
  ok(K.hullDepth(b, low) < K.SPECS.row.draft, 'with the tide down 0.6 m it sits grounded');
  run(b, { steer: 0, throttle: -1 }, low, 90); ok(b.x < xb - 3 && K.hullDepth(b, low) > .2, 'backing water pushes it off toward deeper water (never stuck): x = ' + b.x.toFixed(1));
  /* an engine boat is slowed in the shallows too, and the engine boat has a deeper draft */
  let c = K.newBoat({ x: 40, z: 0, yaw: 0 }); c.engine = true; run(c, { steer: 0, throttle: 1 }, mk(0), 30);
  ok(c.x < 74 && c.grounded, 'the motor boat also stops at the waterline and grounds (x = ' + c.x.toFixed(1) + ')');
  /* a boat saved on dry ground (the tide has gone out) may only move toward deeper water */
  let d = K.newBoat({ x: 80, z: 0, yaw: 0 }); const e3 = mk(0); const before = K.hullDepth(d, e3); run(d, { steer: 0, throttle: 1 }, e3, 10); ok(K.hullDepth(d, e3) >= before - 1e-6, 'a boat on dry ground cannot drive further up the beach');
  run(d, { steer: 0, throttle: -1 }, e3, 40); ok(d.x < 80, 'but it can be pushed back toward the sea');
  /* a rim: inside() stops it at the edge of the table */
  let r = K.newBoat({ x: 0, z: 0, yaw: 0 }); const er = Object.assign({}, open, { inside: (x, z) => Math.hypot(x, z) < 20 }); run(r, { steer: 0, throttle: 1 }, er, 40); ok(Math.hypot(r.x, r.z) < 20.01, 'the rim of the table holds it in');
}
/* ---- 4. load and capacity ---- */
{
  let b = K.newBoat(), st = { planks: 6, rope: 3, glass: 0, metal: 2 };
  ok(K.capacityOf(b) === 4, 'rowing boat carries 4 units');
  let r = K.loadFromStock(b, st, 'planks', 9); ok(r.moved === 4 && r.boat.load.planks === 4 && r.stock.planks === 2, 'asking for 9 planks loads only 4: ' + r.moved);
  ok(b.load.planks === 0 && st.planks === 6, 'the old objects are not changed (pure)');
  let r2 = K.loadFromStock(r.boat, r.stock, 'rope', 1); ok(r2.moved === 0, 'a full boat takes no more');
  let r3 = K.loadFromStock(b, st, 'glass', 2); ok(r3.moved === 0, 'cannot load what the yard does not have');
  let r4 = K.loadFromStock(b, st, 'nonsense', 2); ok(r4.moved === 0, 'an unknown kind loads nothing');
  let e = Object.assign(K.newBoat(), { engine: true }); ok(K.capacityOf(e) === 8, 'with the motor it carries 8 units');
  let u = K.unloadToStock(r.boat, { planks: 59, rope: 0, glass: 0, metal: 0 }); ok(u.stock.planks === 60 && u.boat.load.planks === 3 && u.moved === 1, 'unloading respects the yard cap of 60: one plank fits, three stay aboard');
  let u2 = K.unloadToStock(r.boat, { planks: 0, rope: 0, glass: 0, metal: 0 }); ok(u2.stock.planks === 4 && K.loadTotal(u2.boat) === 0 && u2.boat.trips === 1, 'unloading empties the boat into the stock and counts a trip');
  let u3 = K.unloadToStock(b, st); ok(u3.moved === 0 && u3.boat.trips === 0, 'unloading an empty boat is not a trip');
  const sum = o => K.STOCK_IDS.reduce((a, k) => a + o[k], 0); ok(sum(u2.stock) + sum(u2.boat.load) === sum(r.boat.load), 'nothing is made or lost by moving it');
}
/* ---- 5. the skerry cache and the motor ---- */
{
  let b = K.newBoat(); const a = K.cacheFor(9001, 1, true), a2 = K.cacheFor(9001, 1, true), c = K.cacheFor(9001, 2, false), c3 = K.cacheFor(9001, 3, false);
  ok(JSON.stringify(a) === JSON.stringify(a2), 'the cache is the same for the same seed and day');
  ok(a.engine && a.n === 3 && a.units.planks === 2, 'the first cache holds the small motor and three units (two planks)');
  ok(!c.engine && c.n >= 2 && c.n <= 3 && !c3.engine, 'later caches are two or three units and no motor');
  ok(JSON.stringify(K.cacheFor(1, 2, false)) !== JSON.stringify(K.cacheFor(7, 2, false)) || JSON.stringify(K.cacheFor(1, 5, false)) !== JSON.stringify(K.cacheFor(7, 5, false)), 'other seeds give other caches');
  let r = K.collectCache(b, 9001, 1); ok(r.ok && r.boat.part && r.boat.got.engine && K.loadTotal(r.boat) === 3 && r.boat.cacheDay === 1, 'the first trip: load of three units and the motor part');
  ok(!K.collectCache(r.boat, 9001, 1).ok, 'the same day the skerry is empty');
  let r2 = K.collectCache(r.boat, 9001, 2); ok(!r2.ok && /full|unload/.test(r2.why), 'the boat with a load of 3 is too full for a crate of 2 or 3: ' + r2.why);
  let un = K.unloadToStock(r.boat, K.newBoat().load).boat; let r3 = K.collectCache(un, 9001, 2); ok(r3.ok && !r3.cache.engine && r3.boat.part, 'next day, unloaded: a plain crate, no second motor (the first part is still in hand, not yet fitted)');
  let f = K.fitEngine(r.boat); ok(f.ok && f.boat.engine && !f.boat.part, 'with the part in hand the motor can be fitted');
  ok(!K.fitEngine(b).ok && !K.fitEngine(f.boat).ok, 'no part or already fitted: refused with a reason');
  let f2 = K.fitEngine(r.boat).boat; let full = Object.assign({}, f2, { load: { planks: 3, rope: 0, glass: 0, metal: 0 } }); ok(K.collectCache(full, 9001, 3).ok, 'with the motor fitted the boat carries 8, so a load of 3 plus a crate fits');
}
/* ---- 6. landings, the autopilot ---- */
{
  const L = [{ id: 'jetty', name: 'Jetty', x: 10, z: 10, r: 8 }, { id: 'beach', name: 'Beach', x: 60, z: -10, r: 9 }];
  let b = K.newBoat({ x: 14, z: 12, yaw: 0 }); const nl = K.nearestLanding(b, L); ok(nl.landing.id === 'jetty' && nl.near && K.canDock(b, L[0]), 'close to the jetty: it can dock');
  b.x = 40; ok(!K.nearestLanding(b, L).near && !K.canDock(b, L[0]), 'in the open it cannot dock');
  b.x = 14; b.u = 5; ok(!K.canDock(b, L[0]), 'too fast to dock: slow down first');
  const e = Object.assign({}, open); let a = K.newBoat({ x: 0, z: 0, yaw: Math.PI / 2 }); let done = false; for (let i = 0; i < 4000 && !done; i++) { const ap = K.autopilot(a, 40, 30, {}); if (ap.done) done = true; K.step(a, ap, e, .05); e.t += .05; }
  ok(done && Math.hypot(a.x - 40, a.z - 30) < 3.5, 'the autopilot brings a rowing boat to a tapped point (' + Math.hypot(a.x - 40, a.z - 30).toFixed(1) + ' m off)');
  const hc = K.headingControl(a, 0, .01); ok(hc.throttle === 0 && hc.steer === 0, 'a stick left at rest gives no throttle');
  let s2 = K.newBoat({ x: 0, z: 0, yaw: 0 }); const e2 = Object.assign({}, open); for (let i = 0; i < 400; i++) { const c = K.headingControl(s2, Math.PI / 2, 1); K.step(s2, c, e2, .05); e2.t += .05; }
  ok(Math.abs(K.wrap(s2.yaw - Math.PI / 2)) < .25 && s2.u > 1, 'the stick pushed at a heading turns the boat to it and goes (yaw ' + s2.yaw.toFixed(2) + ')');
}
/* ---- 7. path finding round an island ---- */
{
  const isWater = (x, z) => Math.hypot(x - 20, z) > 14 && Math.hypot(x, z) < 120;   /* a round island of radius 14 at (20, 0) */
  const isSafe = (x, z) => Math.hypot(x - 20, z) > 19 && Math.hypot(x, z) < 120;   /* the page keeps its paths a hull and a half off the land */
  const p = K.findPath(isSafe, { x: -30, z: 0 }, { x: 70, z: 0 }, { cell: 3 });
  ok(p && p.length >= 3 && Math.hypot(p[p.length - 1][0] - 70, p[p.length - 1][1]) < 4, 'a path round the island exists: ' + (p ? p.length : 0) + ' waypoints');
  let all = true; if (p) for (let i = 0; i < p.length - 1; i++) for (let t = 0; t <= 20; t++) { const x = p[i][0] + (p[i + 1][0] - p[i][0]) * t / 20, z = p[i][1] + (p[i + 1][1] - p[i][1]) * t / 20; if (!isSafe(x, z)) all = false; }
  ok(all, 'every leg of the path is water');
  const q = K.findPath((x, z) => false, { x: 0, z: 0 }, { x: 10, z: 10 }, { cell: 3 }); ok(q === null, 'no water at all gives no path (null, no crash)');
  const e = Object.assign({}, open, { depth: (x, z) => isWater(x, z) ? 3 : -2 });
  let b = K.newBoat({ x: -30, z: 0, yaw: 0 }); const er = K.errandNew(p); let phases = new Set(), guard = 0; let hit = false;
  while (!er.done && guard++ < 20000) { const r = K.errandStep(er, b, .05); phases.add(r.phase); K.step(b, r.input, e, .05); e.t += .05; if (K.hullDepth(b, e) < K.LAND_DEPTH) hit = true; }
  ok(er.done && phases.has('out') && phases.has('wait') && phases.has('back'), 'the errand goes out, waits at the far end and comes back: ' + [...phases].join(', ') + ' in ' + (guard * .05).toFixed(0) + ' s');
  ok(Math.hypot(b.x + 30, b.z) < 4, 'it ends where it began (' + Math.hypot(b.x + 30, b.z).toFixed(1) + ' m from the start)');
  ok(!hit, 'and never touched the island on the way');
}
/* ---- 8. save and load ---- */
{
  let b = K.newBoat({ x: 51.234, z: -20.5, yaw: 1.2 }); b.engine = true; b.avail = true; b.at = 'jetty'; b.load = { planks: 3, rope: 2, glass: 0, metal: 1 }; b.trips = 4; b.cacheDay = 2; b.errands = 1; b.got.engine = true;
  const txt = JSON.stringify(K.serializeBoat(b)), r = K.sanitize(JSON.parse(txt));
  ok(r.x === 51.23 && r.z === -20.5 && near(r.yaw, 1.2, .001) && r.engine && r.avail && r.at === 'jetty' && r.trips === 4 && r.cacheDay === 2 && r.errands === 1 && r.got.engine, 'position, motor, load, trips and cache day survive a save and load');
  ok(JSON.stringify(r.load) === JSON.stringify(b.load), 'the load survives (' + JSON.stringify(r.load) + ')');
  ok(JSON.stringify(K.serializeBoat(r)) === txt, 'a second round trip gives the same text');
  const bad = K.sanitize({ x: 'a', z: NaN, yaw: 'x', engine: 'yes', load: { planks: 99, rope: 99 }, at: '../../x', cacheDay: -4 });
  ok(bad.x === 0 && bad.z === 0 && bad.engine === false && K.loadTotal(bad) === 4 && bad.at === null && bad.cacheDay === 0, 'odd values become safe defaults, the load is capped at the capacity (' + K.loadTotal(bad) + ')');
  ok(K.sanitize(null).avail === false && K.sanitize(undefined).engine === false, 'no saved boat: the defaults');
  const part = K.sanitize({ part: true, engine: true }); ok(part.engine && !part.part, 'a fitted motor leaves no spare part');
}
/* ---- 9. hints, words, tone rails ---- */
{
  let b = K.newBoat(); ok(K.hintFor(b, 1) === '', 'no hint until the boat is there');
  b.avail = true; ok(/skerry/.test(K.hintFor(b, 1)), 'first hint points at the outer skerry');
  b.part = true; b.got.engine = true; ok(/motor/.test(K.hintFor(b, 1)), 'with the part in hand: fit the motor');
  const text = [K.hintFor(Object.assign(K.newBoat(), { avail: true }), 1), K.cacheFor(1, 1, true).text, K.cacheFor(1, 2, false).text, K.SPECS.row.name, K.SPECS.engine.name, K.collectCache(K.newBoat(), 1, 1).boat && '', K.collectCache(Object.assign(K.newBoat(), { cacheDay: 5 }), 1, 5).why, K.fitEngine(K.newBoat()).why].join(' ');
  ok(!/\b(blood|dead|death|kill|corpse|drown|gore|wound|scream|crew|sailor|captain|skipper|he |she |his |her )\b/i.test(text), 'tone rails: nothing gory, no people named or shown in the boat text');
  ok(!/\b(AI|artificial|helper|robot)\b/.test(text), 'the helper is not named');
  ok(K.speedWord(Object.assign(K.newBoat(), { u: 0 })) === 'still' && K.speedWord(Object.assign(K.newBoat(), { u: 1.6 })) === 'fast', 'speed words');
}
/* ---- 10. the preset step-down rule (ultra.js deviceStepDown) ---- */
{
  const S = U.deviceStepDown;
  ok(typeof S === 'function', 'LI_ULTRA.deviceStepDown exists');
  const ipadUA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  const winUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
  const r1 = S('radeon', 'Apple GPU', ipadUA, 5); ok(r1.step && r1.to === 'ipad' && /built-in|mobile/i.test(r1.note) && /iPad preset/.test(r1.note), 'radeon on an iPad (Apple GPU): steps down to the ipad preset with a one-line note: ' + r1.note);
  ok(S('desktop', 'Apple GPU', ipadUA, 5).step, 'desktop on an iPad steps down');
  ok(S('radeon', 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)', winUA, 0).step, 'radeon on an Intel integrated chip steps down');
  ok(S('radeon', 'ANGLE (AMD, AMD Radeon VII Unknown Prefixed, OpenGL 4.1)', winUA, 0).step === false, 'radeon on a real Radeon VII does not step down');
  ok(S('radeon', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)', winUA, 0).step === false, 'a discrete card does not step down');
  ok(S('radeon', 'Google SwiftShader', winUA, 0).step === false, 'software rendering is left alone (not a built-in chip): no step down');
  ok(S('radeon', '', ipadUA, 5).step, 'an iPad that hides its GPU name still steps down (touch device by user agent)');
  ok(S('radeon', '', macUA, 5).step, 'an iPad that asks for the desktop site (Mac user agent, five touch points) still steps down');
  ok(S('radeon', '', macUA, 0).step === false, 'a real Mac with no touch and no GPU name is left alone');
  ok(S('radeon', '', androidUA, 5).step, 'an Android phone steps down');
  ok(S('ipad', 'Apple GPU', ipadUA, 5).step === false && S('ar', 'Apple GPU', ipadUA, 5).step === false && S('', 'Apple GPU', ipadUA, 5).step === false, 'the ipad and ar presets and no preset are never changed');
  ok(S('radeon', 'Apple GPU', ipadUA, 5, { off: true }).step === false, 'a switch can turn the step-down off (&stepdown=0)');
  const note = r1.note; ok(note.length < 260 && !/\n/.test(note), 'the note is one short line (' + note.length + ' characters)');
  /* OWNER bug: Radeon VII on a dual-GPU Mac, the probe saw the Intel chip */
  const intelProbe = 'ANGLE (Intel Inc., Intel(R) UHD Graphics 630, OpenGL 4.1)', radeonMac = 'ANGLE (AMD, AMD Radeon VII Unknown Prefixed, OpenGL 4.1)', radeonWin = 'ANGLE (AMD, AMD Radeon VII Direct3D11 vs_5_0 ps_5_0, D3D11)';
  ok(S('radeon', intelProbe, macUA, 0).step === true, 'a laptop with only the integrated Intel chip steps down');
  ok(S('radeon', intelProbe, macUA, 0, { renderer: radeonMac }).step === false, 'probe says Intel UHD 630 but the renderer says Radeon VII: no step-down');
  ok(S('radeon', radeonMac, macUA, 0).step === false && S('radeon', radeonWin, winUA, 0).step === false, 'ANGLE strings for the Radeon VII on a Mac and on Windows: no step-down');
  ok(S('radeon', radeonMac, macUA, 0, {}).detail.indexOf('Radeon VII') >= 0 && /Mac/.test(S('radeon', radeonMac, macUA, 0).detail) && /touch 0/.test(S('radeon', radeonMac, macUA, 0).detail), 'the detail line names the raw GPU, the user agent class and the touch points');
  ok(S('radeon', 'Apple GPU', macUA, 5).step === true && S('radeon', radeonMac, macUA, 0).step === false, 'an iPad on a desktop UA steps down but a Mac (touch 0, eGPU or not) never counts as a phone');
  ok(S('radeon', intelProbe, macUA, 0, { off: true }).step === false, '&stepdown=0 overrides even an integrated probe');
  ok(/probe: .*; .*; touch \d/.test(S('radeon', 'Apple GPU', ipadUA, 5).note), 'a step-down note shows the probe string, the user agent class and the touch points');
  ok(S('radeon', 'ANGLE (NVIDIA, NVIDIA Quadro P2000 Direct3D11, D3D11)', winUA, 0).step === false && S('radeon', 'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics, D3D11)', winUA, 0).step === false && S('radeon', 'AMD Radeon Pro 5500M', macUA, 0).step === false, 'Quadro, Intel Arc and Radeon Pro never step down');
}
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); if (fails) process.exit(1);
