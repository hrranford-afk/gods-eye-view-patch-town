// Base Camp room-colony test (practice room, no AR): map a room, tag spots, away progress, alignment after the room is rotated and shifted,
// tidying (new land, recycling), squashing, learning, MOVED, export/import, memory. Scans are injected (the whole practice room at once) so it runs in about a minute.
// Run:  NODE_PATH=$(npm root -g) node games/base-camp/tests/room-test.js        (prints PASS/FAIL lines and a metrics summary)
const path = require('path'), fs = require('fs');
const { serve, launch } = require('./lib.js');
const OUT = path.join(__dirname, '..', 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const M = {};
const ok = (name, cond, extra) => { results.push([name, !!cond]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  const mem = () => ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6), kids: __g.scene.children.length }));
  const shot = async (n) => { await sleep(900); await p.screenshot({ path: OUT + n }); };
  const closeCards = () => ev(() => { for (const id of ['diary', 'ask']) document.getElementById(id).hidden = true; });
  const rescan = async () => { await ev(() => { __g.rescanFresh(); __g.injectScan(0.02); __g.doneScanning(); }); await sleep(250); };
  const lines = () => ev(() => (__g.G.report ? __g.G.report.lines : []).map((l) => l.text));
  const scr = (x, y, z) => ev(([x, y, z]) => { const v = new __g.THREE.Vector3(x, y, z).project(__g.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [x, y, z]);

  // ---- council data ----
  await p.goto(url); await sleep(1200);
  await ev(() => { __g.ENV.hourOverride = 12; localStorage.setItem('bc-wxchoice', 'no'); localStorage.removeItem('base-camp-map-v1'); localStorage.removeItem('base-camp-save-v2'); });
  const c = await ev(() => ({ c: __g.COUNCIL.almanac && __g.COUNCIL.rooms && __g.COUNCIL.creatures, names: __g.COLONY_ALMANAC.colonists.map((q) => q.name).join(','), spots: __g.ROOMS.spots.length, cre: __g.CREATURES.map((q) => q.name).join(','), ev: __g.COLONY_ALMANAC.events.length, req: __g.COLONY_ALMANAC.requests.filter((r) => r.council).length }));
  ok('council: almanac, rooms and creatures all loaded', c.c, JSON.stringify(c));
  ok('council: the six colonists and four creatures', c.names === 'Pip,Gizmo,Lila,Pipkin Bramble,Luna,Sunny' && c.cre === 'Glip,Grizzle,Fluffflur,Glimmerfluff');
  const m0 = await mem();

  // ---- map my room, tag spots ----
  await p.click('#bMore'); await p.click('#bMap'); await ev(() => __g.injectScan(0.02)); await ev(() => __g.doneScanning()); await sleep(400);
  ok('map mode goes to tagging after the scan', await ev(() => __g.G.phase === 'tag'));
  const zs = await ev(() => __g.G.zones.map((z) => [z.type, +z.area.toFixed(2), +z.y.toFixed(2)]));
  ok('zones found: floor, desk, speaker top, sill, shelf', zs.length === 5, JSON.stringify(zs));
  const sp = await ev(() => { const z = __g.G.zones.find((q) => q.type === 'SMALL'); return [z.cx, z.y, z.cz]; });
  let pt = await scr(...sp); await p.mouse.click(pt[0], pt[1]); await sleep(300);
  ok('tapping the speaker top opens the tag picker', await ev(() => !document.getElementById('tagpick').hidden));
  await p.click('#tagpick [data-tag=speaker]'); await sleep(200);
  await ev(() => {
    const pr = (id) => __g.PROPS.find((q) => q.id === id), top = (q) => q.base + q.h;
    __g.addSpot({ tag: 'warm', name: 'Radeon', x: pr('gpu').x, y: top(pr('gpu')), z: pr('gpu').z, area: 0.026 });
    __g.addSpot({ tag: 'cup', name: 'kettle mug', x: pr('cup').x, y: top(pr('cup')), z: pr('cup').z, area: 0.005 });
    __g.addSpot({ tag: 'can', name: 'Tin one', x: pr('can1').x, y: top(pr('can1')), z: pr('can1').z, area: 0.0034 });
    const sill = __g.G.zones.find((z) => z.type === 'SILL'); __g.addSpot({ tag: 'door', name: 'Window', x: sill.cx, y: sill.y, z: sill.cz, area: sill.area, zid: sill.id });
    __g.addCable(__g.G.spots.find((s) => s.name === 'Radeon').id, __g.G.spots.find((s) => s.tag === 'speaker').id); __g.G.music = true;
  });
  const roles = await ev(() => __g.G.spots.filter((s) => s.src !== 'default').map((s) => s.name + ':' + s.role).join(' '));
  ok('roles from the tags: speaker tower, Radeon forge, mug well, can silo', /Speaker:tower/.test(roles) && /Radeon:forge/.test(roles) && /kettle mug:well/.test(roles) && /Tin one:silo/.test(roles), roles);
  ok('a cable between two spots is marked', await ev(() => __g.G.cables.length === 1));
  await ev(() => { __g.tagTap; });
  await ev(() => { const c = document.getElementById('bSaveMap'); c.click(); }); await sleep(200);
  const mj = await ev(() => JSON.parse(localStorage.getItem('base-camp-map-v1')));
  ok('the room map is saved under its own key, versioned', mj.v === 1 && mj.kind === 'base-camp-room-map' && mj.zones.length === 5 && mj.spots.length >= 5 && mj.cables.length === 1, 'bytes=' + JSON.stringify(mj).length);
  ok('the colony is not in the map', !('settlements' in mj));
  await ev(() => { __g.focusOn(-0.1, 0.7, -0.5, 4.2); __g.P.yaw = 0.2; __g.P.pitch = 0.75; }); await ev(() => { document.getElementById('tagpick').hidden = true; });
  await shot('06-tag-spots.png');
  // export / import round trip
  const exp = await ev(() => { __g.ioUi(); return document.getElementById('ioText').value; });
  const j1 = JSON.parse(exp); await ev(() => { document.getElementById('modal').hidden = true; });
  await ev(() => { localStorage.removeItem('base-camp-map-v1'); __g.resetWorld(); });
  await ev((t) => { __g.importMapText(t); }, exp); await sleep(200);
  const j2 = await ev(() => JSON.parse(localStorage.getItem('base-camp-map-v1'))); const re = await ev(() => JSON.stringify(__g.mapToJSON()));
  const norm = (o) => { const q = JSON.parse(JSON.stringify(o)); delete q.saved; return JSON.stringify(q); };
  ok('export -> import round trip keeps the map exactly', norm(j1) === norm(j2) && norm(j1) === norm(JSON.parse(re)));
  const bad = await ev(() => { __g.importMapText('{"v":9,"kind":"base-camp-room-map","zones":[],"spots":[]}'); return document.getElementById('modal').innerText; });
  ok('a wrong-version map is refused with a message', /version 9/.test(bad)); await ev(() => { document.getElementById('modal').hidden = true; });

  // ---- found colonies, grow, away progress ----
  await ev(() => { const G = __g.G; G.zones.forEach((z) => (z.settled = null)); __g.settle('TABLE'); __g.settle('FLOOR'); __g.simulate(1500, 0.5); __g.saveNow(); });
  const cols0 = await ev(() => __g.G.settlements.map((S) => S.zoneName.split(' ')[0] + ':' + S.cols.length).join(' '));
  console.log('colonies before away:', cols0);
  const lm = await ev(() => __g.G.settlements.map((S) => S.things.filter((t) => t.kind === 'lm').map((t) => t.role).join('+')).join(' | '));
  ok('landmarks stand on the settled zones (forge, well, tower...)', /forge/.test(lm) && /tower/.test(lm), lm);
  ok('the ready-made cable carried settlers to the speaker (no player action)', await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Perch')); return !!S && S.cols.length > 0 && !S.awaiting; }));
  ok('the marked cable became a ready-made link', await ev(() => (__g.syncCables(), __g.G.links.some((l) => l.ready && l.cid))));
  const a8 = await ev(() => { const r = __g.awaySim(8 * 3600, 12); return { ms: r.ms, steps: r.steps, n: r.lines.length, lines: r.lines.map((l) => l.text) }; });
  const a24 = await ev(() => { const r = __g.awaySim(24 * 3600, 6); return { ms: r.ms, steps: r.steps, n: r.lines.length }; });
  M.away8hMs = Math.round(a8.ms); M.away24hMs = Math.round(a24.ms);
  ok('away sim 8 h and 24 h each take under 1 s', a8.ms < 1000 && a24.ms < 1000, '8h=' + M.away8hMs + 'ms (' + a8.steps + ' steps) 24h=' + M.away24hMs + 'ms (' + a24.steps + ' steps)');
  ok('the diary has 5 to 10 lines', a8.n >= 5 && a8.n <= 10 && a24.n >= 5 && a24.n <= 10, a8.n + ' / ' + a24.n);
  ok('the diary uses the spot roles', a8.lines.some((l) => /forge|tower|market|solar|hideout/.test(l)), a8.lines.filter((l) => /forge|tower|market/.test(l))[0]);
  ok('the diary says "the Giant"', a8.lines.some((l) => /Giant/.test(l)));
  await ev(() => { __g.saveNow(); });
  // the practice room's own Skip 8 hours button
  await ev(() => { __g.setPhase('play'); __g.barUi && 0; }); await ev(() => __g.G.zones.forEach((z) => __g.paintAll())); await p.click('#bSkip').catch(() => {});
  await ev(() => { const S = __g.G.settlements[0]; __g.focusZone(S.zoneRef); __g.P.yaw = 0.3; __g.P.pitch = 0.6; __g.focusOn(S.tf.x, S.tf.y, S.tf.z, 0.9); });
  await sleep(300); ok('Skip 8 hours shows the "While you were away" card', await ev(() => !document.getElementById('diary').hidden && /While you were away/.test(document.getElementById('diary').innerText)));
  await shot('07-away-diary.png');

  // ---- return: the room is rotated 30 degrees and shifted 0.5 m ----
  await ev(() => { __g.saveNow(); __g.saveMap(); });
  await p.reload(); await sleep(1200);
  await ev(() => { __g.ENV.hourOverride = 12; const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); s.t -= 5 * 3600 * 1000; localStorage.setItem('base-camp-save-v2', JSON.stringify(s)); __g.placeRoom(0.5236, 0.5, -0.3); });
  ok('Continue is offered when there is a map and a colony', await ev(() => !document.getElementById('bCont').hidden));
  await p.click('#bMore'); await p.click('#bMap'); await sleep(500);
  ok('on return the diary comes first, before any scan', await ev(() => !document.getElementById('diary').hidden && /5\.0 h/.test(document.getElementById('diary').innerText)));
  await p.click('#dClose'); await ev(() => __g.injectScan(0.02)); await ev(() => __g.doneScanning()); await sleep(300);
  ok('then the two-landmark alignment starts', await ev(() => __g.G.phase === 'align' && __g.G.landmarks.length === 2), await ev(() => __g.G.landmarks.map((l) => l.name).join(' & ')));
  await ev(() => __g.focusOn(0.2, 0.6, -0.4, 4.4));
  const taps = await ev(() => __g.G.landmarks.map((l) => { const m = { Speaker: 'speaker', Radeon: 'gpu', 'Tin one': 'can1', 'kettle mug': 'cup', Window: 'sill' }[l.name], q = m === 'sill' ? { x: -1.525, z: 0.6, base: 1.0, h: 0 } : __g.PROPS.find((x) => x.id === m), c = Math.cos(__g.PLACE.yaw), s = Math.sin(__g.PLACE.yaw), wx = q.x * c + q.z * s + __g.PLACE.x, wz = -q.x * s + q.z * c + __g.PLACE.z, y = m === 'speaker' ? 0.55 : q.base + q.h, v = new __g.THREE.Vector3(wx, y, wz).project(__g.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }));
  for (const t of taps) { await p.mouse.click(t[0] + 1, t[1] + 1); await sleep(200); }
  const al = await ev(() => ({ phi: __g.G.align.phi, tx: __g.G.align.tx, tz: __g.G.align.tz, err: __g.G.alignErr, yaw: __g.PLACE.yaw, X: __g.PLACE.x, Z: __g.PLACE.z }));
  const dphi = Math.atan2(Math.sin(al.phi + al.yaw), Math.cos(al.phi + al.yaw)), c0 = Math.cos(al.phi), s0 = Math.sin(al.phi);
  // truth: map point p -> live = R(-yaw) p + (X, Z); compare where the solved transform sends the room centre and the speaker
  const truth = (x, z) => { const c = Math.cos(al.yaw), s = Math.sin(al.yaw); return [x * c + z * s + al.X, -x * s + z * c + al.Z]; };
  const solved = (x, z) => [x * c0 - z * s0 + al.tx, x * s0 + z * c0 + al.tz];
  const errAt = (x, z) => Math.hypot(truth(x, z)[0] - solved(x, z)[0], truth(x, z)[1] - solved(x, z)[1]);
  M.alignYawErrDeg = +(Math.abs(dphi) * 180 / Math.PI).toFixed(3); M.alignErrCm = +(Math.max(errAt(0, 0), errAt(-1.2, -1.4), errAt(1.1, 0.5)) * 100).toFixed(2);
  ok('alignment solves the 30 degree turn and 0.5 m shift', Math.abs(dphi) < 0.01 && M.alignErrCm < 2, 'yaw error ' + M.alignYawErrDeg + ' deg, worst position error across the room ' + M.alignErrCm + ' cm, residual at landmarks ' + (al.err * 100).toFixed(2) + ' cm');
  await shot('08-align.png');
  await p.click('#bAlignOk'); await sleep(500);
  const same = await lines();
  ok('nothing was changed, so no false events after aligning', same.length === 0, JSON.stringify(same));
  ok('the colony is back, placed on the rotated room', await ev(() => __g.G.settlements.length >= 3 && __g.G.settlements.every((S) => S.placed || S.lost)));
  await closeCards();
  const pos = await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')); const dq = __g.PROPS.find((x) => x.id === 'cup'); return [S.tf.x, S.tf.z, S.tf.y, __g.G.zones.find((z) => z.id === S.zid).cx]; });
  await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')); __g.P.yaw = 0.2; __g.P.pitch = 0.7; __g.focusOn(S.tf.x, S.tf.y, S.tf.z, 1.4); });

  // ---- tidying: take two cans away ----
  await ev(() => { __g.removeProp('can1'); __g.removeProp('can2'); });
  const tin0 = await ev(() => __g.G.tidy.tin); await rescan();
  const l1 = await lines(); const tin1 = await ev(() => __g.G.tidy.tin);
  ok('removing two cans: "New land!" lines', l1.filter((t) => /New land!/.test(t)).length === 2, l1[0]);
  ok('recycling: tin from the flattened cans', tin1 - tin0 === 6 && l1.some((t) => /flattens the can/.test(t)), 'tin +' + (tin1 - tin0));
  await ev(() => { __g.focusOn(-1.0, 1.5, -1.45, 0.9); __g.P.yaw = 0.1; __g.P.pitch = 0.55; });
  await shot('09-tidy-new-land.png');
  await closeCards();

  // ---- squashing: a box set down on a building ----
  const before = await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')); return S.things.length; });
  const tgt = await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')), t = S.things.find((q) => q.kind === 'hut' && q.built) || S.things.find((q) => q.kind === 'farm'); const c = Math.cos(S.tf.yaw), s = Math.sin(S.tf.yaw), w = [S.tf.x + t.x * c + t.z * s, S.tf.z - t.x * s + t.z * c]; const c2 = Math.cos(__g.PLACE.yaw), s2 = Math.sin(__g.PLACE.yaw), rx = (w[0] - __g.PLACE.x) * c2 - (w[1] - __g.PLACE.z) * s2, rz = (w[0] - __g.PLACE.x) * s2 + (w[1] - __g.PLACE.z) * c2; __g.movePropTo('box', rx, rz, 0.75); return [t.kind, rx, rz]; });
  await rescan(); const l2 = await lines();
  ok('a box on a building squashes it, with a diary line', l2.some((t) => /squashed by a GIANT BOX/.test(t)), l2.find((t) => /squashed/.test(t)));
  ok('the squashed thing is gone and rubble stays', await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')); return S.things.some((t) => t.kind === 'rubble'); }));
  await ev(() => { const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')); __g.P.yaw = 0.25; __g.P.pitch = 0.65; __g.focusOn(S.tf.x, S.tf.y, S.tf.z, 0.7); });
  await shot('10-squashed.png');
  await closeCards();
  // ---- learning: the same cell again ----
  const cell = await ev(() => { const Z = __g.G.zones.find((z) => z.type === 'TABLE'), L = Z.land; let k0 = -1; for (let k = 0; k < L.dist.length; k++) if (L.dist[k] >= 1) { k0 = k; break; } const c = (function (k) { const u = (k % L.w + L.i0 + 0.5) * 0.02, v = (((k / L.w) | 0) + L.j0 + 0.5) * 0.02; return [L.cx + u * L.c - v * L.s, L.cz + u * L.s + v * L.c]; })(k0); return { d: Math.max(...L.dist), c }; });
  ok('every disturbed cell is counted', cell.d >= 1, 'max disturbance ' + cell.d);
  await ev(() => { __g.movePropTo('box', 0.9, 0.5, 0); }); await rescan(); await closeCards();
  const tgt2 = tgt; await ev(([x, z]) => { __g.movePropTo('box', x, z, 0.75); }, [tgt2[1], tgt2[2]]); await rescan();
  const l3 = await lines(); const dmax = await ev(() => Math.max(...__g.G.zones.find((z) => z.type === 'TABLE').land.dist));
  ok('the same place disturbed again: the colonists learn to avoid it', dmax >= 2 && l3.some((t) => /Don.t build/.test(t)), 'disturbance ' + dmax + ' | ' + (l3.find((t) => /Don.t build/.test(t)) || ''));
  await ev(() => { __g.movePropTo('box', 0.9, 0.5, 0); }); await rescan(); await closeCards();
  const av = await ev(([x, z]) => {
    const S = __g.G.settlements.find((q) => q.zoneName.startsWith('Desk')), Z = S.zoneRef, n0 = S.things.length; S.stock.wood = 40; S.stock.seeds = 10; S.planT = 0;
    let bad = 0; const cw = (rx, rz) => { const c = Math.cos(__g.PLACE.yaw), s = Math.sin(__g.PLACE.yaw); return [rx * c + rz * s + __g.PLACE.x, -rx * s + rz * c + __g.PLACE.z]; }; const w = cw(x, z);
    for (let i = 0; i < 20; i++) { __g.simulate(30, 0.5); for (const t of S.things) { if (t.kind === 'tent' || t.kind === 'rubble' || t.kind === 'lm' || t.kind === 'station') continue; const c2 = Math.cos(S.tf.yaw), s2 = Math.sin(S.tf.yaw), wx = S.tf.x + t.x * c2 + t.z * s2, wz = S.tf.z - t.x * s2 + t.z * c2; if (Math.hypot(wx - w[0], wz - w[1]) < 0.06 && !t.ever) { t.ever = 1; bad++; } } }
    return { bad, built: S.things.length - n0 };
  }, [tgt2[1], tgt2[2]]);
  ok('after 10 minutes nothing new was built on the disturbed cell', av.bad === 0, 'new things ' + av.built + ', on the avoided cell: ' + av.bad);
  M.tidy = await ev(() => __g.G.tidy);

  // ---- MOVED: the speaker moves 30 cm ----
  await ev(() => { const q = __g.PROPS.find((x) => x.id === 'speaker'); __g.movePropTo('speaker', q.x - 0.3, q.z, 0); });
  const popBefore = await ev(() => __g.G.settlements.find((S) => S.zoneName.startsWith('Perch')).cols.length);
  await rescan();
  const ask = await ev(() => ({ n: __g.G.asks.length, vis: !document.getElementById('ask').hidden, text: document.getElementById('ask').innerText }));
  ok('the speaker moved 30 cm: "Did the ... move here?"', ask.n >= 1 && ask.vis && /move here/.test(ask.text), ask.text.split('\n')[0]);
  await shot('moved-question.png');
  const zx0 = await ev(() => __g.G.zones.find((z) => z.type === 'SMALL').cx);
  await p.click('#askYes'); await sleep(300);
  const zx1 = await ev(() => __g.G.zones.find((z) => z.type === 'SMALL').cx);
  ok('answering yes moves the whole colony with the speaker', Math.abs(zx1 - zx0) > 0.2 && await ev(() => __g.G.settlements.find((S) => S.zoneName.startsWith('Perch')).cols.length) === popBefore, 'moved ' + Math.round(Math.abs(zx1 - zx0) * 100) + ' cm');
  ok('moving the speaker does not count as tidying or squashing', (await ev(() => __g.G.report.lines.filter((l) => /New land|squashed/.test(l.text)).length)) === 0);
  await closeCards();

  // ---- practice room: dragging things with the mouse ----
  await ev(() => { __g.setTool('move'); __g.P.yaw = 0.2; __g.P.pitch = 0.9; __g.focusOn(0, 0.75, -0.8, 2.4); }); await sleep(1500);
  const cupPos = await ev(() => { const q = __g.PROPS.find((x) => x.id === 'cup'); const c = Math.cos(__g.PLACE.yaw), s = Math.sin(__g.PLACE.yaw), v = new __g.THREE.Vector3(q.x * c + q.z * s + __g.PLACE.x, q.base + q.h / 2, -q.x * s + q.z * c + __g.PLACE.z).project(__g.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, q.x, q.z]; });
  await p.mouse.move(cupPos[0], cupPos[1]); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(cupPos[0] + i * 12, cupPos[1] + i * 4); await sleep(30); } await p.mouse.up();
  const cup2 = await ev(() => { const q = __g.PROPS.find((x) => x.id === 'cup'); return [q.x, q.z, q.base]; });
  ok('a prop can be dragged across the desk with the mouse', Math.hypot(cup2[0] - cupPos[2], cup2[1] - cupPos[3]) > 0.05, JSON.stringify(cup2));

  // ---- memory is flat over repeated scans ----
  const m1 = await mem(); for (let i = 0; i < 5; i++) await rescan(); const m2 = await mem();
  M.mem = [m0, m1, m2];
  ok('memory is flat over repeated scans', m2.geo - m1.geo <= 12 && m2.tex - m1.tex <= 12 && m2.heapMB - m1.heapMB < 80, JSON.stringify([m1, m2]));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  console.log('METRICS', JSON.stringify(M));
  const fails = results.filter((r) => !r[1]).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + results.length + ' PASSED');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
