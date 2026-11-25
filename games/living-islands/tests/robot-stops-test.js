/* ROBOT STOPS TEST (pure node): Job 6c item 2. A scripted day on the camp routine with 3 robots (day with orders, a rain spell, a high tide, dusk, a night with shifts, dawn; one robot has no order for a while)
   logs every transition into a stopped state with its reason code (camp_start.js stopTrack) and tallies the causes. Fails if any robot stands still without a code, any code is unknown, or any code lacks an icon or a sentence.
   Run: node games/living-islands/tests/robot-stops-test.js [report=1 prints the tally] */
await import('../camp_start.js'); await import('../gift_day.js');
const C = globalThis.LI_CAMP, K = globalThis.LI_GIFT.core;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const plan = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });
const mk = () => { const sim = C.simCreate(plan, [{ kind: 'family' }, { kind: 'scout' }, { kind: 'walker' }], {}); sim.shifts = true; sim.robots.forEach((r, i) => { r.timer = .3 + i * 3; }); return sim; };
/* the script, in game minutes: [minutes, env, orders] (orders: robot 2 has no order until minute 20) */
const SCRIPT = [[40, { night: false, rain: false, tide: 0 }], [15, { night: false, rain: true, tide: 0 }], [25, { night: false, rain: false, tide: 0 }], [20, { night: false, rain: false, tide: 1.6 }], [30, { night: false, rain: false, tide: 0 }], [150, { night: true, rain: false, tide: 0 }], [30, { night: false, rain: false, tide: 0 }]];
const sim = mk(); const want = ['wood', 'metal', 'plastic'];
let t = 0, still = 0, bad = 0; const last = sim.robots.map(r => ({ x: r.x, z: r.z, t: 0, st: r.state })), unexplained = [];
for (const [mins, env] of SCRIPT) for (let k = 0; k < mins * 60; k += .5) {
  sim.robots.forEach((r, i) => { r.want = i === 2 && t < 20 * 60 ? undefined : want[i]; if (i === 2 && t < 20 * 60) { if (r.state === 'bay') r.timer = Math.max(r.timer, 1e9); } else if (r.state === 'bay' && r.timer > 1e8) r.timer = 1; });
  C.simStep(sim, .5, env); t += .5;
  sim.robots.forEach((r, i) => { const l = last[i], mv = Math.hypot(r.x - l.x, r.z - l.z) > .05 || r.state !== l.st; if (mv || r.state === 'work' || r.state === 'drop' || r.state === 'sort') { l.t = t; l.x = r.x; l.z = r.z; l.st = r.state; } else if (t - l.t > 5) { still++; if (!C.stopReason(sim, r)) { bad++; if (unexplained.length < 5) unexplained.push('t=' + t + ' robot ' + i + ' ' + r.state); } } });
}
const L = sim.stops;
ok(L.length > 5, 'the day logged ' + L.length + ' stop entries (' + still + ' still robot-steps checked)');
ok(bad === 0, 'no robot stands still for more than 5 s without a reason code' + (bad ? ': ' + unexplained.join(', ') : ''));
ok(L.every(e => C.STOPS[e.code] && e.code !== 'unknown'), 'every logged transition has a known reason code');
ok(C.STOP_CODES.every(c => C.STOPS[c].icon && K.STOP_ICONS[C.STOPS[c].icon] && typeof C.STOPS[c].say === 'function' && C.STOPS[c].say(12).length > 8 && C.STOPS[c].label), 'every code has an icon, a label and a sentence');
ok(C.STOPS.battery_low.say(12) === 'Stopped: battery low, 12 percent. Heading to the charger.', 'the battery sentence: ' + C.STOPS.battery_low.say(12));
ok(C.STOP_CODES.every(c => !/blood|dead|kill|gore|died|angry|sad|happy|feel|afraid/i.test(C.STOPS[c].say(50))), 'tone: no feelings written, nothing gory');
ok(L.every(e => typeof e.place === 'string' && e.place.length > 2 && e.pct >= 0 && e.pct <= 100), 'every entry has a place and a battery reading');
const tally = {}; L.forEach(e => { const d = e.dur === null ? (sim.t - e.t0) : e.dur; const o = tally[e.code] || (tally[e.code] = { n: 0, s: 0 }); o.n++; o.s += d; });
const ranked = Object.keys(tally).sort((a, b) => tally[b].s - tally[a].s);
if (process.argv.includes('report=1') || true) { console.log('  causes by time stopped (3 robots, ' + Math.round(t / 60) + ' game minutes):'); ranked.forEach(c => console.log('   ' + c.padEnd(14) + String(tally[c].n).padStart(4) + ' stops  ' + (tally[c].s / 60).toFixed(1).padStart(6) + ' robot-minutes')); }
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); process.exit(fails ? 1 : 0);
