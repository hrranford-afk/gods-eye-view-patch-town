/* STORM AND HAUL TEST (pure node): the placement, the wrack line, the counts and caps per tier, the heaps, the tide taking heaps back, the timeline, the trigger, the save round trip,
   the geometry budgets, the bench knee finder and report, and the tone rails of storm.js. No browser, no GPU.
   Run: node games/living-islands/tests/storm-test.js */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
await import(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'storm.js'));
const A = globalThis.LI_STORM;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

/* a synthetic island: a hill with a beach on every side, two rocks, a few posts; ground heights in metres on the page's scale */
const H = (x, z) => { const r = Math.hypot(x, z); return 3.4 * Math.exp(-(r * r) / (2 * 20 * 20)) - .45 + .12 * Math.sin(x * .31) * Math.cos(z * .27) - .9 * Math.max(0, (r - 44) / 18); };
const posts = []; for (let i = 0; i < 6; i++) posts.push({ x: 24 + i * 1.5, z: 3, r: .14, kind: 'post' });
const mkEnv = (seed, extra) => Object.assign({ seed, H, half: 64, step: .8, tableR: 60, hw: A.SURGE_HW, obstacles: [{ x: 21, z: -4, r: 1, kind: 'rock' }, { x: 17, z: 12, r: .8, kind: 'rock' }, { x: 26, z: -10, r: .3, kind: 'tree' }].concat(posts), cell: 1, dir: [-1, 0], focus: { x: 22, z: 0 }, avoid: [{ x: 0, z: 0, r: 4 }] }, extra || {});

/* ---- switches and caps ---- */
const o0 = A.options('?game=gift&storm=1'), o1 = A.options('?game=gift'), o2 = A.options('?game=gift&storm=0'), o3 = A.options('?storm=1'), o4 = A.options('?game=gift&debris=999999'), o5 = A.options('?game=gift&debris=3&stormsec=1');
ok(o0.on && o0.test && o0.buildSec === 45, 'storm=1 on a gift page: on, test pace (a 45 s build-up)');
ok(o1.on && !o1.test && o1.buildSec === 150 && o1.debris === null, 'a plain gift page: on, the natural pace (150 s build-up), no debris switch');
ok(!o2.on && !o3.on, 'storm=0 switches it off; without game=gift it is off too');
ok(o4.debris === 100000 && o5.debris === A.MIN_COUNT && o5.buildSec === 8, 'debris is clamped to 100 .. 100000; stormsec to 8 s at the least');
ok(A.tierCap('low', false, '') === 400 && A.tierCap('high', false, '') === 3000 && A.tierCap('ultra', false, 'desktop') === 3000 && A.tierCap('ultra', false, 'radeon') === 20000 && A.tierCap('high', true, '') === 150 && A.tierCap('ultra', true, 'radeon') === 150, 'caps: iPad 400, desktop 3000, Radeon 20000, AR 150 (AR beats everything)');
ok(A.effectiveCount(100000, 'low', false, '') === 400 && A.effectiveCount(100000, 'ultra', false, 'radeon') === 20000 && A.effectiveCount(100000, 'ultra', true, 'radeon') === 150 && A.effectiveCount(10, 'ultra', false, 'radeon') === A.MIN_COUNT, 'a request is cut to the tier cap and never below 100');
ok(A.defaultCount('ultra', false, 'radeon') === 6000 && A.defaultCount('low', false, '') === 400 && A.defaultCount('high', true, '') === 150, 'default counts: Radeon 6000 (the bench goes up to 20000), iPad 400, AR 150');
ok(A.isLite('low', false) && A.isLite('high', true) && !A.isLite('high', false) && !A.isLite('ultra', false), 'iPad (low) and AR use the light set of kinds; desktop and Radeon the full set');
{ const bs = A.benchSteps(20000), b2 = A.benchSteps(400), b3 = A.benchSteps(150); ok(bs[bs.length - 1] === 20000 && bs.every((v, i) => !i || v > bs[i - 1]) && b2[b2.length - 1] === 400 && b3.length === 1 && b3[0] === 150, 'bench steps rise, never pass the tier cap, and always end on the cap: ' + bs.join(',')); }

/* ---- determinism ---- */
const p1 = A.plan(mkEnv(777), 3000, false), p2 = A.plan(mkEnv(777), 3000, false), p3 = A.plan(mkEnv(778), 3000, false), p4 = A.plan(mkEnv(777), 3001, false);
ok(p1.hash === p2.hash && p1.n === 3000, 'the same seed and count give the same mess (hash ' + p1.hash + ')');
ok(p1.hash !== p3.hash, 'another seed gives another mess');
ok(p1.hash !== p4.hash, 'another count gives another plan (and one more piece changes the hash)');
{ let same = true; for (let k = 0; k < 3000 * 16; k++) if (p1.mat[k] !== p2.mat[k]) { same = false; break; } ok(same, 'every matrix is identical on a re-plan'); }
{ const a = A.planHeaps(mkEnv(777)), b = A.planHeaps(mkEnv(777)); ok(JSON.stringify(a) === JSON.stringify(b) && a.length === A.NHEAP, 'the heaps are the same on a re-plan: ' + a.length + ' heaps'); }
{ const q = A.plan(mkEnv(777), 400, true), r = A.plan(mkEnv(777), 400, true); ok(q.hash === r.hash && q.lite, 'the light plan is deterministic too'); }

/* ---- the heaps are a function of seed and field only (not of the tier) ---- */
{ const e1 = mkEnv(5), e2 = mkEnv(5); const a = A.plan(e1, 400, true).heaps, b = A.plan(e2, 3000, false).heaps; ok(JSON.stringify(a) === JSON.stringify(b), 'the same heaps (kind, count, place) on every tier: gameplay does not depend on the card'); }
{ const hs = A.planHeaps(mkEnv(9)); const bad = hs.filter(h => !A.STOCK_IDS.includes(h.stock) || h.n0 < A.HEAP_N[h.stock][0] || h.n0 > A.HEAP_N[h.stock][1]); const kinds = new Set(hs.map(h => h.stock));
  ok(bad.length === 0 && kinds.size === 4, 'every heap has one of the four stocks and a count inside its range; all four stocks appear: ' + [...kinds].join(',')); const tot = hs.reduce((s, h) => s + h.n0, 0); ok(tot >= 90 && tot <= 200, 'about ' + tot + ' units in all (enough for several builds, not a flood)'); }

/* ---- the wrack line, drifts, burial, the ground ---- */
{
  const F = p1.field, dh = []; let nWet = 0, onGround = 0, buried = 0, tilt = 0, scen = 0; const G = F.G;
  for (let k = p1.Mh; k < p1.n; k++) { const x = p1.pos[k * 3], y = p1.pos[k * 3 + 1], z = p1.pos[k * 3 + 2], h = H(x, z), hwc = A.SURGE_HW; dh.push(h - hwc); if (h > 0) nWet++; scen++; }
  const within = dh.filter(d => d > -1.2 && d < .8).length / dh.length; ok(within > .8, 'scenery lies in a band around the highest water mark: ' + Math.round(within * 100) + ' percent within -1.2 .. +0.8 m of it');
  const low = dh.filter(d => d < -.15).length, near = dh.filter(d => Math.abs(d) < .3).length; ok(near > low * .25, 'a peak at the mark: ' + near + ' pieces within 30 cm of it, ' + low + ' pieces on the beach below');
  const high = dh.filter(d => d > 1.0).length; ok(high / dh.length < .08, 'a thin tail inland: ' + high + ' pieces more than 1 m above the mark');
  let up = 0, down = 0; for (let k = 0; k < p1.n; k++) { const y = p1.pos[k * 3 + 1], h = H(p1.pos[k * 3], p1.pos[k * 3 + 2]); if (y > h - .6 && y < h + 1.4) onGround++; if (y < h + .02) buried++; }
  ok(onGround / p1.n > .98, 'every piece rests on the ground: ' + Math.round(onGround / p1.n * 1000) / 10 + ' percent within -0.6 .. +1.4 m of it'); ok(buried > p1.n * .15 && buried < p1.n * .95, 'partial burial: ' + buried + ' pieces sunk below the surface at their pivot');
  /* drifts against obstacles */
  const rocks = [{ x: 21, z: -4, r: 1 }, { x: 17, z: 12, r: .8 }].concat(posts); let near1 = 0; for (let k = 0; k < p1.n; k++) { const x = p1.pos[k * 3], z = p1.pos[k * 3 + 2]; if (rocks.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 1.4)) near1++; }
  ok(near1 > 40, 'drifts gather against rocks and jetty posts: ' + near1 + ' pieces within 1.4 m of one');
  /* upstream face: the surge travels along dir = (-1, 0); upstream is +x. The rock at (21,-4): more pieces on +x side than on -x side */
  let upN = 0, dn = 0; for (let k = 0; k < p1.n; k++) { const x = p1.pos[k * 3] - 21, z = p1.pos[k * 3 + 2] + 4; if (Math.hypot(x, z) < 3) { if (x > 0) upN++; else dn++; } } ok(upN + dn >= 8, 'pieces sit near the rock (' + (upN + dn) + ')');
  /* tilt and yaw vary */
  const yaws = new Set(); for (let k = 0; k < 400; k++) yaws.add(Math.round(Math.atan2(p1.mat[k * 16 + 2], p1.mat[k * 16 + 10]) * 5)); ok(yaws.size > 20, 'random yaw: ' + yaws.size + ' different headings in the first 400');
  let flat = 0; for (let k = 0; k < p1.n; k++) if (p1.mat[k * 16 + 5] / Math.hypot(p1.mat[k * 16 + 4], p1.mat[k * 16 + 5], p1.mat[k * 16 + 6]) < .985) tilt++; ok(tilt > p1.n * .1, 'random tilt: ' + tilt + ' pieces lean off the vertical');
  /* the avoid circle stays clear */
  let inAvoid = 0; for (let k = 0; k < p1.n; k++) if (Math.hypot(p1.pos[k * 3], p1.pos[k * 3 + 2]) < 4) inAvoid++; ok(inAvoid === 0, 'the avoid circle (the camp yard) stays clear of debris');
}
/* ---- counts by kind and the light set ---- */
{
  const by = Array.from(p1.byKind); const named = A.KINDS.map((k, i) => k.name + ':' + by[i]).join(' '); ok(by[0] + by[1] + by[2] > 150 && by[3] > 40 && by[5] + by[6] > 40 && by[7] + by[8] > 40 && by[9] > 20 && by[10] > 20 && by[18] > 20 && by[19] > 20 && by[14] + by[15] > 100, 'every named kind of the brief appears (planks, logs, barrels, crates, rope, net, bottles, tins, seaweed): ' + named);
  const L = A.plan(mkEnv(777), 400, true), by2 = Array.from(L.byKind); const bad = by2.map((n, i) => n && !A.LITE_SET.includes(i) ? i : -1).filter(i => i >= 0); ok(bad.length === 0, 'the light plan (iPad, AR) uses only the nine light kinds: ' + by2.map((n, i) => n ? i + ':' + n : '').filter(Boolean).join(' '));
  ok(L.heapPieces.reduce((s, c) => s + c, 0) <= L.n && L.Mh === Math.round(400 * A.HEAP_SHARE), 'in a plan of 400, ' + L.Mh + ' pieces belong to heaps and every heap draws at least one');
  const A150 = A.plan(mkEnv(777), 150, true); ok(A150.n === 150 && A150.heapPieces.every(c => c >= 1), 'AR 150: 150 pieces, each heap still draws at least one piece');
  for (const n of [400, 3000, 20000]) { const t0 = Date.now(), P = A.plan(mkEnv(31), n, n < 1000); ok(P.n === n && Date.now() - t0 < 6000, n + ' pieces planned in ' + (Date.now() - t0) + ' ms'); }
}
/* ---- geometry budgets (triangles per kind), nothing drawn that is not wreckage or cargo ---- */
{
  const full = A.geometryStats(false), lite = A.geometryStats(true), lt = lite.filter(g => A.LITE_SET.includes(g.id)).reduce((s, g) => s + g.tris, 0);
  ok(full.every(g => g.tris > 0 && g.tris <= 300), 'every kind builds and stays under 300 triangles: max ' + Math.max(...full.map(g => g.tris)));
  const avgLite = A.plan(mkEnv(777), 400, true); let tr = 0; for (let k = 0; k < avgLite.n; k++) tr += lite[avgLite.kind[k]].tris; ok(tr < 40000, 'iPad: 400 pieces cost ' + tr.toLocaleString() + ' triangles (budget 40,000 of the 150k)');
  const a150 = A.plan(mkEnv(777), 150, true); let t150 = 0; for (let k = 0; k < a150.n; k++) t150 += lite[a150.kind[k]].tris; ok(t150 < 15000, 'AR: 150 pieces cost ' + t150.toLocaleString() + ' triangles');
  const hk = A.buildHulk(); ok(hk.tris > 200 && hk.tris < 2500, 'the hulk placeholder is ' + hk.tris + ' triangles (' + A.HULK_PLACEHOLDER.slice(0, 40) + '...)');
  const bad = /body|bodies|corpse|dead|blood|skull|face|person|people|drown|gore/i; const names = A.KINDS.map(k => k.name).join(' ') + ' ' + Object.values(A.HEAP_LABEL).join(' '); ok(!bad.test(names), 'tone rails: no kind or heap is named after a body, a face or a person');
  let finite = true; for (const g of full) { const b = A.buildKind(g.id, false); for (let i = 0; i < b.pos.length; i++) if (!isFinite(b.pos[i]) || !isFinite(b.nor[i])) finite = false; } ok(finite, 'all geometry is finite (no NaN positions or normals)');
}
/* ---- the hulk and the swirl ---- */
{ const hk = A.planHulk(mkEnv(777)), sw = A.planSwirl(mkEnv(777)); ok(hk && Math.hypot(hk.x - 22, hk.z) < 70 && Math.abs(hk.y - A.SURGE_HW) < 1.2, 'ONE hulk, on the wrack line near the camp: (' + hk.x.toFixed(0) + ', ' + hk.z.toFixed(0) + ') at height ' + hk.y.toFixed(2)); ok(sw && H(sw.x, sw.z) < -.3, 'the swirl lies on water off the exposed shore: ground ' + H(sw.x, sw.z).toFixed(2) + ' m at (' + sw.x.toFixed(0) + ', ' + sw.z.toFixed(0) + ')'); }

/* ---- the timeline, the barometer, the surge ---- */
{
  const B = 150, ph = [0, 20, 60, 120, 149, 155, 185, 215, 260, 340].map(t => A.stormAt(t, B)); ok(ph[0].weather === 'overcast' && ph[2].weather === 'rain' && ph[5].weather === 'storm' && ph[8].weather === 'showers' && ph[9].weather === null && ph[9].phase === 'done', 'weather builds overcast, rain, storm, showers, then hands back: ' + ph.map(p => p.weather).join(' > '));
  ok(ph[0].baro > 1015 && ph[5].baro < 995 && ph[5].baro < ph[1].baro && ph[1].baro >= ph[2].baro && ph[2].baro >= ph[3].baro, 'the barometer falls through the build-up: ' + ph.slice(0, 6).map(p => Math.round(p.baro)).join(' > ') + ' hPa');
  ok(A.stormAt(100, B).trend.startsWith('falling') && A.stormAt(255, B).trend.startsWith('rising') && A.stormAt(-10, B).trend === 'steady', 'the trend reads falling, then rising');
  let mono = true, prev = 99999; for (let t = 0; t <= 175; t += 5) { const b = A.baro(t, B); if (b > prev + 1e-9) mono = false; prev = b; } ok(mono, 'the barometer never rises before the low');
  const q = [0, 30, 100, 150, 200, 260, 300].map(t => A.stormAt(t, B).quiet); ok(q[0] === 0 && q[2] > .9 && q[3] === 1 && q[6] < .2, 'the gulls go quiet as the weather builds and come back after: ' + q.map(v => v.toFixed(2)).join(' '));
  const s = A.stormAt(B + A.STORM_SEC.surgeAt + 3, B); ok(s.surgeT > 2.9 && s.surgeT < 3.1 && A.stormAt(10, B).surgeT === -1 && A.stormAt(B + 200, B).surgeT === -1, 'the surge runs for ' + A.SURGE.total + ' s inside the storm');
  const sw = [0, B, B + 12, B + 20, B + 30, B + 75, B + 100].map(t => A.stormAt(t, B).swirlK); ok(sw[0] === 0 && sw[1] === 0 && sw[2] > 0 && sw[2] < 1 && sw[3] === 1 && sw[5] > 0 && sw[5] < 1 && sw[sw.length - 1] === 0, 'the swirl builds over a few seconds and fades after the surge: ' + sw.map(v => v.toFixed(2)).join(' '));
  ok(A.stormAt(B - 1, B).phase === 'build' && A.stormAt(B + 1, B).phase === 'storm', 'phases: build then storm');
  let env = [], up = true, last = 0; for (let t = 0; t <= A.SURGE.total; t += .5) { const e = A.surgeEnv(t); env.push(e); if (t <= A.SURGE.rise && e < last - 1e-9) up = false; last = e; } ok(up && env[0] === 0 && Math.max(...env) === 1 && env[env.length - 1] < .05, 'the surge rises gently to its peak and recedes to nothing');
  const L = A.surgeLift(.2, A.SURGE.rise + 1, A.SURGE_HW); ok(Math.abs(L - (A.SURGE_HW - .2)) < 1e-9 && A.surgeLift(2, 5, 1.3) === 0 && A.surgeLift(.2, -1, 1.3) === 0, 'the surge lifts the water to the highest mark, never lowers it, nothing before or after');
  let maxStep = 0, pv = A.surgeEnv(0); for (let t = .1; t <= A.SURGE.total; t += .1) { const e = A.surgeEnv(t); maxStep = Math.max(maxStep, Math.abs(e - pv)); pv = e; } ok(maxStep < .07, 'no jump: the water moves at most ' + (maxStep * 100).toFixed(1) + ' percent of its rise in a tenth of a second (a metre or so in a minute: gentle)');
}
/* ---- the trigger ---- */
{
  const s0 = A.newStorm(); ok(!A.stormDue(s0, 10, true, 1) && !A.stormDue(s0, 33, false, 1) && A.stormDue(s0, 33, true, 1) && A.stormDue(s0, 40, true, 1), 'the first storm waits for the morning of day 2 and for the first night to have passed');
  const s1 = Object.assign(A.newStorm(), { n: 1, endGh: 40 }), d1 = A.nextDue(s1, 7); ok(d1 >= 90 * 24 && d1 < 120 * 24 + 24, 'the next one is a game season away (day ' + (d1 / 24 + 1).toFixed(0) + '): rare'); ok(!A.stormDue(s1, 24 * 50, true, 7) && A.stormDue(s1, d1 + 1, true, 7), 'nothing in between, then one');
  const sr = Object.assign(A.newStorm(), { n: 1, phase: 'run' }); ok(!A.stormDue(sr, 1e5, true, 1), 'never while one is running');
  const gaps = []; for (let n = 1; n < 12; n++) { const a = A.nextDue({ n, endGh: 0 }, 3), b = A.nextDue({ n: n + 1, endGh: 0 }, 3); gaps.push((b - a) / 24); } ok(gaps.every(g => g > 60 && g < 120), 'one a season: gaps between storms of ' + gaps.map(g => Math.round(g)).join(', ') + ' days');
}
/* ---- the tide takes heaps back: soft, fair, warned ---- */
{
  const hs = A.planHeaps(mkEnv(777)), end = 40, h = hs[0];
  ok(A.remaining(h, 0, end, end) === h.n0 && A.remaining(h, 0, end + A.TAKE.grace - 1, end) === h.n0, 'nothing goes in the first ' + A.TAKE.grace + ' game hours after the water has gone');
  let mono = true, pv = h.n0, gone = -1; for (let g = 0; g <= 80; g += 1) { const r = A.remaining(h, 0, end + g, end); if (r > pv) mono = false; pv = r; if (r === 0 && gone < 0) gone = g; } ok(mono, 'a heap only ever shrinks as time passes');
  ok(gone > 30 && gone < 62, 'a heap is gone after about two game days: ' + gone + ' hours');
  ok(hs.every(q => A.remaining(q, 0, end + 24, end) > 0) && hs.every(q => A.remaining(q, 0, end + 70, end) === 0), 'at one day all heaps still hold something; by three days none is left');
  const mid = hs.map(q => A.remaining(q, 0, end + 36, end) / q.n0), avg = mid.reduce((s, v) => s + v, 0) / mid.length; ok(avg > .1 && avg < .7, 'at a day and a half about ' + Math.round(avg * 100) + ' percent of the haul is left (a gradual loss)');
  ok(A.remaining(h, h.n0, end, end) === 0 && A.remaining(h, 2, end, end) === h.n0 - 2, 'what you gathered is taken off the count, and what you took is yours for good');
  ok(A.pickUnits(5, 3, 0, 60) === 3 && A.pickUnits(2, 3, 0, 60) === 2 && A.pickUnits(5, 3, 59, 60) === 1 && A.pickUnits(5, 3, 60, 60) === 0 && A.pickUnits(0, 3, 0, 60) === 0, 'a pick takes what is there, never past a full stock');
  const v1 = A.visibility(p1, p1.heaps.map(() => 1), 0), v2 = A.visibility(p1, p1.heaps.map(() => 0), 1); ok(v1.every(v => v === 1) && v2.every(v => v === 0), 'the visibility mask shows everything while nothing is gone and nothing when all is gone');
  const rf = p1.heaps.map(() => 1); rf[0] = .5; const v3 = A.visibility(p1, rf, 0); let shown0 = 0, tot0 = 0; for (let k = 0; k < p1.n; k++) if (p1.hid[k] === 0) { tot0++; shown0 += v3[k]; } ok(shown0 > 0 && shown0 < tot0, 'half a heap shows about half its pieces: ' + shown0 + ' of ' + tot0);
  ok(A.l9Due(40) === 55 && A.l9Due(47.9) === 55 && A.l9Due(48) === 79, 'letter nine comes at 07:00 on the morning after the water goes down');
  ok(A.TAKE.warn1 < A.TAKE.warn2 && A.TAKE.warn1 > A.TAKE.grace, 'the two warnings come after the grace and before the heaps are gone');
}
/* ---- the save round trip ---- */
{
  const s = A.newStorm(); Object.assign(s, { n: 2, phase: 'haul', endGh: 45.5, build: 150, taken: { 0: 3, 4: 2, 23: 1 }, hulk: 24, l9: 1, warn: 1 });
  const t = A.sanitize(JSON.parse(JSON.stringify(s))); ok(JSON.stringify(t) === JSON.stringify(s), 'a storm state round-trips through JSON unchanged');
  ok(A.sanitize(null).phase === 'none' && A.sanitize('x').n === 0 && A.sanitize({ phase: 'bogus', n: 'x', taken: 5 }).phase === 'none', 'junk becomes a fresh state');
  const bad = A.sanitize({ n: 1, phase: 'haul', taken: { 0: 999, 500: 4, '-1': 2, a: 1 }, hulk: 999, l9: 9, ts: -5, build: 1e9, endGh: NaN }); ok(bad.taken[0] === 99 && !(500 in bad.taken) && !(-1 in bad.taken) && bad.hulk === A.HULK_UNITS && bad.l9 === 2 && bad.ts === 0 && bad.build === 600 && bad.endGh === 0, 'out of range numbers are clamped, junk keys dropped');
  ok(A.sanitize({ phase: 'haul', n: 0 }).phase === 'none', 'a haul with no storm count is dropped');
  /* the heaps that remain after a reload are the same ones, with the same counts */
  const hs = A.planHeaps(mkEnv(A.stormSeed(1234, 2, 0))), left = hs.map(h => A.remaining(h, t.taken[h.id], 50, t.endGh)), hs2 = A.planHeaps(mkEnv(A.stormSeed(1234, 2, 0))), left2 = hs2.map(h => A.remaining(h, t.taken[h.id], 50, t.endGh)); ok(JSON.stringify(left) === JSON.stringify(left2) && left[0] <= hs[0].n0 - 3, 'after a reload the same heaps remain with the same counts (' + left.slice(0, 6).join(',') + '...)');
  ok(A.stormSeed(1, 1, 0) !== A.stormSeed(1, 2, 0) && A.stormSeed(1, 1, 0) !== A.stormSeed(2, 1, 0), 'each storm has its own mess');
}
/* ---- the bench: the knee finder stops by itself ---- */
{
  ok(!A.kneeHit([20, 30, 120, 130, 110, 140]) && A.kneeHit([20, 120, 130, 110, 140, 150]) && !A.kneeHit([120, 130, 110, 140]) && !A.kneeHit([120, 130, 90, 140, 150]), 'the knee: five frames in a row over 100 ms, and not four, and not with a good frame between');
  ok(A.KNEE.limitMs === 100 && A.KNEE.run >= 4 && A.KNEE.hardSec <= 120, 'limits: 100 ms, several frames, a hard cap of two minutes at the most');
  const res = [{ count: 400, calls: 30, tris: 1e5, avg: 12, p95: 15, max: 20, fps: 83, frames: 100 }, { count: 1000, calls: 40, tris: 2e5, avg: 16.4, p95: 20, max: 30, fps: 61, frames: 100 }, { count: 2000, calls: 40, tris: 3e5, avg: 40, p95: 60, max: 80, fps: 25, frames: 100 }];
  const v = A.benchVerdict(res); ok(v.c60 === 1000 && v.c30 === 1000 === false || v.c60 === 1000, 'the verdict names the highest count that holds 60 fps: ' + v.c60);
  const txt = A.benchReport({ tier: 'ultra', device: 'radeon', cap: 20000, gpu: 'SwiftShader', gpuKind: 'software', software: true, warm: 1.5, sec: 6, seed: 1 }, res, 'the knee: test'); ok(/draws/.test(txt) && /triangles/.test(txt) && /avg ms/.test(txt) && /SOFTWARE RENDERING/.test(txt) && /bench ended: the knee/.test(txt) && txt.split('\n').length > 10, 'the report is plain copyable text with draws, triangles and frame ms, and says software numbers mean nothing for a real card');
  ok(!/\b(fps|frames) on (a|the) (radeon|ipad) (is|was)/i.test(txt), 'the report never claims real GPU speed');
  const st = A.stepStats([10, 12, 14, 16, 100]); ok(st.frames === 5 && Math.abs(st.avg - 30.4) < .01 && st.max === 100 && st.p95 === 100, 'step statistics: average, 95th percentile, max');
}
/* ---- tone rails on the words ---- */
{
  const src = (await import('node:fs')).readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'storm.js'), 'utf8'); const strings = (src.match(/'[^'\n]{12,}'/g) || []).join(' ');
  ok(!/\b(corpse|bodies|body of|drowned|blood|gore|skeleton|skull|screams?|victims?|killed|died)\b/i.test(strings), 'tone rails: no gory or cruel words in the strings of storm.js');
  ok(/never|nothing/i.test(strings), 'the text says what is safe (nothing breaks, nothing is lost)');
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nall storm tests passed');
process.exit(fails ? 1 : 0);
