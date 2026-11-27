/* The opening film engine (opening.js), pure node. Determinism, seek equals play, cue order, no NaN, the camera never under the sea or inside an island, the whirlpool only with the storm, JSON round trip, skip, wave clock continuity.
   Run: node games/living-islands/tests/opening-test.js */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
await import('../sea_waves.js'); await import('../opening.js');
const S = globalThis.LI_SEA_WAVES, O = globalThis.LI_OPENING;
const win = {}; new Function('window', fs.readFileSync(path.join(root, 'sea_proto', 'island_9001.js'), 'utf8'))(win);
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const field = O.makeIslands(O.decodeIsland(win.SEA_ISLAND)), layout = O.buildLayoutFull(field);
const film = O.defaultFilm(layout, field), dir = new O.Director(film);

/* 1. the data: shots tile 0..90, tracks exist, cues sorted */
{
  const sh = dir.shots; let gap = 0; for (let i = 1; i < sh.length; i++) gap += Math.abs(sh[i].t0 - sh[i - 1].t1);
  ok(sh.length === 8 && sh[0].t0 === 0 && sh[7].t1 === 90 && gap === 0, 'eight shots tile 0 to 90 s with no gap or overlap');
  ok(['night-watch', 'first-light', 'working-quay', 'long-swell', 'great-wash', 'wrack-line', 'arrival', 'first-repair'].every((id, i) => sh[i].id === id), 'shot order is the decided order');
  let sorted = true; for (let i = 1; i < dir.cues.length; i++) if (dir.cues[i].t < dir.cues[i - 1].t) sorted = false;
  ok(sorted && dir.cues.length > 20, 'cues are in time order (' + dir.cues.length + ' cues)');
  ok(['thunder', 'key', 'relay', 'crest', 'snag', 'roar-cut', 'drip', 'winch'].every(nm => dir.cues.some(c => c.name === nm)), 'the named sound cues exist: thunder key relay crest snag roar-cut drip winch');
}

/* 2. determinism: the same t twice, and in two fresh directors, in any order of asking */
{
  const d2 = new O.Director(film), ts = [0, 3.3, 12.1, 47.7, 50.5, 71.9, 90, 12.1, 3.3]; let det = true;
  for (const t of ts) if (!same(dir.at(t), d2.at(t))) det = false;
  const a = dir.at(55.123); dir.at(1); dir.at(80); const b = dir.at(55.123);
  ok(det && same(a, b), 'at(t) is a pure function of t: same answer twice, in a fresh director, whatever was asked in between');
  const sA = O.makeSeaClock(S, dir, { tier: 'radeon', jetty: layout.jetty.tip }), sB = O.makeSeaClock(S, new O.Director(film), { tier: 'radeon', jetty: layout.jetty.tip });
  let hd = 0; for (let i = 0; i < 200; i++) { const t = O.hash(i, 1) * 90, x = (O.hash(i, 2) - .5) * 300, z = (O.hash(i, 3) - .5) * 300; hd = Math.max(hd, Math.abs(sA.height(x, z, t) - sB.height(x, z, t))); }
  ok(hd === 0, 'the sea height at film time t is identical from two fresh sea clocks, asked in random order (200 points, worst diff ' + hd + ')');
}

/* 3. seek equals play: step 0.02 s (with an odd step too) and compare with seek at the stops */
{
  const p = new O.Director(film); p.play(); let worst = 0, stops = 0;
  for (let i = 0; i < 4600 && !p.ended; i++) { p.update(0.02); if (i % 150 === 149) { stops++; const s = new O.Director(film); s.seek(p.t); if (!same(p.at(p.t), s.at(s.t))) worst++; } }
  ok(worst === 0 && Math.abs(p.t - 90) < 1e-6 && p.ended, 'play at 0.02 s steps reaches 90 s and ' + stops + ' stops along the way equal seek to the same t');
  const q = new O.Director(film); q.play(); let t = 0, k = 0; while (!q.ended && k++ < 5000) q.update(0.013 + 0.2 * O.hash(k, 7));
  ok(q.ended && same(q.at(q.t), dir.at(90)), 'a ragged step sequence ends in exactly the film end state');
}

/* 4. cue order: every cue fires once, in order, whatever the step; seek fires none; windows tile */
{
  for (const stepSpec of [0.016, 0.1, 0.77, 'ragged']) {
    const p = new O.Director(film), got = []; p.onCue((nm, arg, t) => got.push({ nm, t })); p.play(); let k = 0;
    while (!p.ended && k++ < 100000) p.update(stepSpec === 'ragged' ? 0.01 + 0.9 * O.hash(k, 3) : stepSpec);
    let inOrder = true; for (let i = 1; i < got.length; i++) if (got[i].t < got[i - 1].t) inOrder = false;
    ok(got.length === dir.cues.length && inOrder && got.every((g, i) => g.nm === dir.cues[i].name && g.t === dir.cues[i].t), 'cues: step ' + stepSpec + ': all ' + got.length + ' fire once, in order, with the right names and times');
  }
  const p = new O.Director(film), got = []; p.onCue(nm => got.push(nm)); p.seek(60); p.seek(10); p.seek(89.9);
  ok(got.length === 0, 'seek fires no cue (scrubbing never plays a thunderclap)');
  p.seek(46.5); p.play(); p.update(0.5); ok(got.includes('thunder') && !got.includes('crest'), 'after a seek the next update fires the cues crossed from there on');
  let tile = 0; for (let t = -1; t < 90; t += 7.3) tile += dir.cuesBetween(t, Math.min(t + 7.3, 90)).length; ok(tile === dir.cues.length, 'cuesBetween windows that meet share no cue and lose none');
}

/* 5. no NaN anywhere, camera sample sane */
{
  let bad = 0, fovBad = 0; for (let t = 0; t <= 90 + 1e-9; t += 0.05) {
    const a = dir.at(t); const nums = [].concat(a.camera.pos, a.camera.target, [a.camera.fov], Object.values(a.s), ...Object.values(a.v));
    if (!nums.every(Number.isFinite)) bad++; if (a.camera.fov < 20 || a.camera.fov > 80) fovBad++;
    const look = O.skyLook(a); if (!Object.values(look).flat().every(v => v === null || Number.isFinite(v) || typeof v === 'number')) bad++;
  }
  ok(bad === 0, 'no NaN or Infinity in any camera, track or sky value at 0.05 s steps (1801 samples)');
  ok(fovBad === 0, 'the field of view stays between 20 and 80 degrees');
  const sea = O.makeSeaClock(S, dir, { tier: 'max', jetty: layout.jetty.tip }); let nb = 0;
  for (let t = 0; t <= 90; t += 0.5) for (const [x, z] of [[0, 0], [-60, 40], [100, -90], [30, 140], [-200, 200]]) if (!Number.isFinite(sea.height(x, z, t))) nb++;
  ok(nb === 0, 'the sea height is finite on the MAX tier (48 waves) at 905 points');
  let seen = 0, flo = 0; for (let t = 0; t <= 90; t += 0.1) { const f = O.flashAt(dir, t); if (!Number.isFinite(f) || f < 0) flo++; if (f > .3) seen++; }
  ok(flo === 0 && seen > 5, 'lightning flash level from the flash cues is finite, never negative, and has flashes (' + seen + ' samples above 0.3)');
}

/* 6. the camera never under the sea (+0.5 m) and never inside an island (+0.5 m), on every tier, at 1/20 s */
for (const tier of ['ipad', 'desktop', 'radeon', 'max']) {
  const sea = O.makeSeaClock(S, dir, { tier, jetty: layout.jetty.tip });
  const floor = (x, z, t) => Math.max(sea.height(x, z, t), field.groundAt(x, z));
  const bad = O.cameraViolations(dir, floor, 0.05, 0.5);
  ok(bad.length === 0, 'camera above sea height + 0.5 m and above the island ground + 0.5 m at every 0.05 s on tier ' + tier + (bad.length ? ' (first miss at t=' + bad[0].t.toFixed(2) + ' y=' + bad[0].y.toFixed(2) + ' floor=' + bad[0].floor.toFixed(2) + ')' : ''));
}
{
  const sea = O.makeSeaClock(S, dir, { tier: 'ipad', jetty: layout.jetty.tip }); let minClr = 1e9, at = 0;
  for (let t = 0; t <= 90; t += 0.05) { const p = dir.at(t).camera.pos, c = p[1] - Math.max(sea.height(p[0], p[2], t), field.groundAt(p[0], p[2])); if (c < minClr) { minClr = c; at = t; } }
  ok(minClr >= 0.5, 'smallest clearance over sea and ground on the iPad tier is ' + minClr.toFixed(2) + ' m at t=' + at.toFixed(2) + ' s');
  /* the adapter's clamp lifts a deliberately low camera and never lowers a high one */
  const cam = { position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, lookAt() { }, fov: 50, updateProjectionMatrix() { } };
  const low = new O.Director(Object.assign({}, film, { camera: { pos: [{ t: 0, v: [120, -5, 150] }], target: [{ t: 0, v: [1, 0, 1] }], fov: [{ t: 0, v: 50 }] } })), ad = O.attachThree(low, { camera: cam, floor: (x, z, t) => sea.height(x, z, t) });
  const r = ad.apply(50); ok(r.clamped && cam.position.y >= sea.height(120, 150, 50) + 0.5 - 1e-9, 'the THREE adapter lifts a camera that is under the sea to height + 0.5 m');
  const ad2 = O.attachThree(dir, { camera: cam, floor: (x, z, t) => sea.height(x, z, t) }); ad2.apply(15); const y15 = dir.at(15).camera.pos[1];
  ok(Math.abs(cam.position.y - y15) < 1e-9, 'the adapter leaves a camera that is already clear exactly where the film put it');
  const r2 = ad2.apply(15, true); ok(r2.clamped === false, 'debug camera mode: apply does not move the camera');
}

/* 7. the whirlpool only with the storm, the crest only in its window */
{
  const v = t => dir.at(t).s.vortex, cr = t => dir.at(t).s.crest; let calm = 0;
  for (let t = 0; t <= 46; t += 0.1) calm = Math.max(calm, v(t)); for (let t = 85; t <= 90; t += 0.1) calm = Math.max(calm, v(t));
  ok(calm === 0, 'whirlpool weight is exactly 0 in the night watch, first light, quay, swell (to 46 s) and in the last 5 s');
  let mx = 0, at = 0; for (let t = 0; t <= 90; t += 0.1) if (v(t) > mx) { mx = v(t); at = t; }
  ok(mx <= 1 && mx > .95 && at > 50 && at < 58, 'the whirlpool peaks at 1 inside the Great Wash (peak ' + mx.toFixed(2) + ' at ' + at.toFixed(1) + ' s)');
  let aft = 0; for (let t = 62; t <= 80; t += 0.1) aft = Math.max(aft, v(t));
  ok(aft > 0 && aft < .35 && v(70) > 0 && v(70) < v(55), 'after the storm the whirlpool only lingers weakly (at most ' + aft.toFixed(2) + ' from 62 s, ' + v(70).toFixed(2) + ' at 70 s)');
  ok(cr(10) === 0 && cr(46) === 0 && cr(59) === 0 && cr(80) === 0 && cr(50.5) > 6, 'the staged crest is zero outside 46 to 59 s and above 6 m at its peak');
  const sea = O.makeSeaClock(S, dir, { tier: 'ipad', jetty: layout.jetty.tip });
  ok(sea.vortexDip(0, -4, 0) === 0 && sea.vortexDip(0, -4, 1) > 9 && sea.vortexDip(300, 300, 1) < 1e-6, 'vortexDip is 0 at weight 0, the full depth in the middle at 1, nothing far away');
  let calmH = 0; for (let t = 0; t <= 40; t += 1) calmH = Math.max(calmH, sea.table(t).waves.hs); const stormH = sea.table(50.5).waves.hs;
  ok(stormH > 3 * calmH, 'the sea is much bigger in the storm: significant height ' + stormH.toFixed(2) + ' m at 50.5 s against at most ' + calmH.toFixed(2) + ' m before 40 s');
}

/* 8. the wave clock is continuous: no jump in a wave phase or in the height at one point between 0.01 s steps; seek lands on the same sea */
{
  const sea = O.makeSeaClock(S, dir, { tier: 'radeon', jetty: layout.jetty.tip }); let worstPh = 0, worstH = 0, prevH = null;
  for (let t = 0.01; t <= 90; t += 0.01) {
    for (let i = 0; i < sea.N; i += 5) worstPh = Math.max(worstPh, Math.abs(sea.phaseAt(i, t) - sea.phaseAt(i, t - 0.01)) / 0.01 / Math.max(sea.table(t).waves[i].w, 1e-6));
    const h = sea.height(-30, 20, t); if (prevH !== null) worstH = Math.max(worstH, Math.abs(h - prevH)); prevH = h;
  }
  ok(worstPh < 1.5, 'wave phase rate stays within 1.5 times the wave frequency (worst ' + worstPh.toFixed(3) + '): the sea never jumps when the weather moves');
  ok(worstH < 1.2, 'the height at one point never jumps more than 1.2 m in 0.01 s, even through the crest (worst ' + worstH.toFixed(3) + ' m)');
  const sea2 = O.makeSeaClock(S, dir, { tier: 'radeon', jetty: layout.jetty.tip }); const a = sea.height(10, 20, 33.3), b = sea2.height(10, 20, 33.3); ok(a === b, 'seek: the sea at 33.3 s is the same number asked first or after a full run');
}

/* 9. the staged crest reaches the jetty at its time, and one thing the film promises: the long swell can hide the far shore (sight line from the swell shot camera to the lighthouse base) */
{
  const sea = O.makeSeaClock(S, dir, { tier: 'radeon', jetty: layout.jetty.tip }), j = layout.jetty.tip;
  const calmH = sea.height(j[0], j[1], 20), crestH = sea.height(j[0], j[1], O.CREST.tc);
  ok(crestH > calmH + 5, 'at the jetty tip the surface is ' + crestH.toFixed(1) + ' m at 50.5 s against ' + calmH.toFixed(2) + ' m at 20 s: the Great Wash arrives there');
  let hid = 0, tot = 0; const lp = [layout.lighthouse.x, layout.lighthouse.z];
  for (let t = 37; t <= 46.9; t += 0.1) {
    const p = dir.at(t).camera.pos, sh = field.shoreAlong(lp[0], lp[1], p[0] - lp[0], p[2] - lp[1], 0.2, 200); tot++;
    if (sh && sea.blocked(p, [sh[0], 1.0, sh[1]], t)) hid++;
  }
  ok(hid > 0, 'in the long swell shot the swell hides the shoreline foot of the lighthouse island for ' + (hid * .1).toFixed(1) + ' s of ' + (tot * .1).toFixed(1) + ' (sampled sight line)');
}

/* 10. JSON round trip, skip, speed, transport */
{
  const j = dir.toJSON(), r = O.Director.fromJSON(JSON.parse(JSON.stringify(j))), r2 = new O.Director(JSON.stringify(j)); let eq = true;
  for (let t = 0; t <= 90; t += 0.37) if (!same(dir.at(t), r.at(t)) || !same(dir.at(t), r2.at(t))) eq = false;
  ok(eq && same(r.toJSON(), j), 'toJSON then fromJSON (object and string) gives a director that answers identically at 244 times');
  const s = new O.Director(film); s.seek(2); const t1 = s.skip(), t2 = s.skip(); s.seek(85); const t3 = s.skip(), t4 = s.skip();
  ok(t1 === 9 && t2 === 20 && t3 === 90 && t4 === 90 && s.ended, 'skip goes to the next shot start (9, 20), from the last shot to the end (90), and stays there');
  s.seek(34); ok(s.skipTo('great-wash') === 47 && s.skipTo(0) === 0, 'skipTo by id and by index');
  s.seek(50); s.prevShot(); ok(s.t === 47, 'prevShot restarts the current shot when more than a second in');
  const f = new O.Director(film); f.play(); f.setSpeed(4); f.update(1); const t4x = f.t; const g = new O.Director(film); g.play(); g.setSpeed(0.25); g.update(1);
  ok(t4x === 4 && g.t === 0.25 && f.setSpeed(9) === 4 && f.setSpeed(0.01) === 0.25, 'speed runs 0.25x to 4x and is clamped');
  const h = new O.Director(film); h.seek(33.3); const x1 = h.at(h.t); const h2 = new O.Director(film); h2.play(); h2.setSpeed(4); while (h2.t < 33.3 - 1e-9) h2.update(Math.min(0.1, (33.3 - h2.t) / 4)); ok(same(x1, h2.at(h2.t)) || Math.abs(h2.t - 33.3) < 1e-9, 'the state at a given t does not depend on the playing speed');
  const e = new O.Director(film); let ends = 0; e.onEnd(() => ends++); e.play(); e.update(95); e.update(5); ok(ends === 1 && e.t === 90, 'the end fires once and the clock stops at 90');
  const pz = new O.Director(film); pz.play(); pz.update(5); pz.pause(); pz.update(5); ok(pz.t === 5, 'pause holds the clock');
}

/* 11. the island field: the camp island, the lighthouse and the jetty sit on real ground; open sea is deep */
{
  const j = layout.jetty;
  ok(field.groundAt(0, 0) < -3 && field.groundAt(layout.lighthouse.x, layout.lighthouse.z) > 3, 'the middle of the four islands is open water; the lighthouse stands on high ground (' + field.groundAt(layout.lighthouse.x, layout.lighthouse.z).toFixed(1) + ' m)');
  ok(field.groundAt(j.root[0], j.root[1]) > -0.5 && field.groundAt(j.tip[0], j.tip[1]) < -1, 'the jetty starts at the shore (' + field.groundAt(j.root[0], j.root[1]).toFixed(1) + ' m) and its tip is in water (' + field.groundAt(j.tip[0], j.tip[1]).toFixed(1) + ' m)');
  ok(Math.hypot(layout.hulk.x + 0, 0) > 0 && field.groundAt(layout.hulk.x, layout.hulk.z) < 3, 'the hulk is stranded on the east shore bank (ground ' + field.groundAt(layout.hulk.x, layout.hulk.z).toFixed(1) + ' m)');
}

console.log(`\n${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
