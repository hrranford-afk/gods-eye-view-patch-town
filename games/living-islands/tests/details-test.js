/* The opening detail kit (details.js), node plus headless Chromium (software GL).
   Node part: every piece builds at every level of detail, triangle budgets hold, seeded variation is deterministic, no NaN, robots have no mouth geometry (names and bounding checks), jetty planks differ, stock height works, LOD falls.
   Browser part (skipped with browser=0, or when playwright is missing): details_board.html has no console errors for every piece, and opening_proto.html has none at four sample times; the triangle and draw-call counters are read.
   Run: NODE_PATH=/opt/node-tools/node_modules node games/living-islands/tests/details-test.js   (browser=0 for node only)
   Numbers here are triangle COUNTS (what three.js is asked to draw), not speeds: software GL says nothing about a device. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..'), require = createRequire(import.meta.url);
await import('../details.js');
const D = globalThis.LI_DETAILS;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

/* 1. every piece builds at every level; budgets (triangles for ONE piece, TUNING, chosen so the opening scene stays near 60k at the iPad tier) */
const BUD = {   /* [lod0, lod1, lod2] */
  robot_hauler: [5000, 2400, 1000], robot_sorter: [5000, 2400, 1000], robot_stacker: [5000, 2400, 1000], hulk: [5500, 3000, 700], jetty: [16000, 9000, 5500],
  bay_planks: [2000, 1200, 900], bay_rope: [3000, 1200, 700], bay_glass: [3000, 1600, 1200], bay_metal: [2200, 1100, 800],
  hut: [6000, 3000, 700], lantern: [300, 200, 200], washline: [600, 400, 400], firepit: [900, 400, 400], barrels: [1500, 800, 600], battery: [400, 200, 100], hands: [2100, 900, 750]
};
const tri = {};
for (const k of D.KINDS) {
  tri[k.id] = [0, 1, 2].map(lod => { try { const p = D.plan(k.id, { seed: 3, wear: .6, lod, crane: 20 }); return p.tris; } catch (e) { return -1; } });
  ok(tri[k.id].every(t => t > 0), k.id + ' builds at lod 0, 1, 2 (' + tri[k.id].join(' / ') + ' triangles)');
}
for (const k of D.KINDS) ok(tri[k.id].every((t, i) => t <= BUD[k.id][i]), k.id + ' stays inside its budget ' + BUD[k.id].join(' / '));
for (const k of D.KINDS) ok(tri[k.id][0] >= tri[k.id][1] && tri[k.id][1] >= tri[k.id][2] && tri[k.id][0] > tri[k.id][2], k.id + ': lod 0 >= lod 1 >= lod 2 in triangles');

/* 2. the scene budget: what the opening film uses (see OPENING_DETAILS_REPORT.md). iPad tier: lod 1 everywhere except the hero repair robot, hands and battery (lod 0) and the far hulk (lod 1) */
const SCENE = [   /* [kind, opts, count] */
  ['jetty', { u0: -2, u1: 12, apron: true, crane: 9 }, 1], ['jetty', { u0: 12, u1: 24, apron: false }, 1], ['jetty', { u0: 24, u1: 38, apron: false }, 1],
  ['bay_planks', {}, 1], ['bay_rope', {}, 1], ['bay_glass', {}, 1], ['bay_metal', {}, 1], ['hut', {}, 1], ['lantern', {}, 6], ['washline', {}, 1], ['firepit', {}, 1], ['barrels', {}, 1], ['hulk', {}, 1],
  ['robot_hauler', {}, 3], ['robot_sorter', {}, 2], ['robot_stacker', {}, 2], ['hands', {}, 1], ['battery', {}, 1]
];
function sceneTris(lodFor) { let t = 0, calls = 0; for (const [k, o, c] of SCENE) { const p = D.plan(k, Object.assign({ seed: 5, wear: .6, lod: lodFor(k) }, o)); t += p.tris * c; calls += Object.keys(p.nodes).length * c + p.nodes[Object.keys(p.nodes)[0]].inst.length * c; } return { t, calls }; }
const ipad = sceneTris(k => (k === 'hands' || k === 'battery') ? 0 : 1), desk = sceneTris(k => (k.startsWith('robot') || k === 'hulk' || k === 'hut' || k.startsWith('bay') || k === 'hands' || k === 'battery') ? 0 : 1);
console.log('scene triangles: iPad tier (lod 1, hero lod 0) ' + ipad.t + '; desktop tier (lod 0 for the near props) ' + desk.t);
ok(ipad.t <= 60000, 'the whole opening scene at the iPad tier is within 60000 triangles (' + ipad.t + ')');
ok(desk.t <= 90000 && desk.t > ipad.t, 'the desktop tier scene is richer and still bounded (' + desk.t + ' <= 90000)');

/* 3. determinism and variation */
{
  for (const k of D.KINDS) { const a = D.digest(D.plan(k.id, { seed: 7, wear: .5, lod: 0 })), b = D.digest(D.plan(k.id, { seed: 7, wear: .5, lod: 0 })); if (a !== b) { ok(false, k.id + ' is not deterministic'); } }
  ok(D.KINDS.every(k => D.digest(D.plan(k.id, { seed: 7, wear: .5 })) === D.digest(D.plan(k.id, { seed: 7, wear: .5 }))), 'same seed and options give the identical bytes for all ' + D.KINDS.length + ' pieces (digest of every vertex, colour and instance)');
  const varies = D.KINDS.filter(k => !['lantern', 'battery'].includes(k.id)).every(k => D.digest(D.plan(k.id, { seed: 7 })) !== D.digest(D.plan(k.id, { seed: 8 })));
  ok(varies, 'a different seed changes every piece (per-instance variation)');
  ok(D.KINDS.every(k => D.digest(D.plan(k.id, { seed: 7, wear: .1 })) !== D.digest(D.plan(k.id, { seed: 7, wear: .9 }))), 'the wear slider changes the baked wear on every piece');
  const bad = D.KINDS.filter(k => [0, 1, 2].some(lod => D.hasNaN(D.plan(k.id, { seed: 11, wear: .7, lod, broken: .5, crane: 5 })) > 0));
  ok(bad.length === 0, 'no NaN or infinity in any position, normal, colour, uv or instance matrix at any lod' + (bad.length ? ' (' + bad.map(b => b.id) + ')' : ''));
}

/* 4. robots: one lamp eye, no mouth, no face, no speech grille */
{
  const FORBID = /mouth|grille|grill|speaker|speech|teeth|face|jaw|lip|nose|ear/i, HEAD_OK = new Set(['head', 'lensRim', 'visor', 'headBolts', 'neck', 'lens']);
  for (const kind of ['robot_hauler', 'robot_sorter', 'robot_stacker']) {
    for (const lod of [0, 1, 2]) {
      const p = D.plan(kind, { seed: 4, wear: .6, lod }), names = new Set(p.parts.map(q => q.name)), meta = p.meta;
      const allowed = [...names].every(nm => D.ROBOT_NAMES.includes(nm)), forb = [...names].some(nm => FORBID.test(nm));
      const lens = p.parts.filter(q => q.name === 'lens'), rims = p.parts.filter(q => q.name === 'lensRim');
      /* the head box: no part other than the allowed head parts sits in the head's volume; the lower half of the front face carries nothing */
      const hb = meta.headBox, inHead = q => { const c = [0, 1, 2].map(i => (q.min[i] + q.max[i]) / 2); return Math.abs(c[0] - hb.c[0]) < hb.r[0] && Math.abs(c[1] - hb.c[1]) < hb.r[1] && Math.abs(c[2] - hb.c[2]) < hb.r[2]; };
      const stray = p.parts.filter(q => inHead(q) && !HEAD_OK.has(q.name));
      let lowerFront = false; const front = hb.c[0] + .25;
      for (const q of p.parts) { if (q.name === 'head' || q.name === 'neck') continue; if (q.max[0] > front - .02 && q.min[0] > front - .2 && q.max[1] < hb.c[1] - .02 && q.min[1] > hb.c[1] - .18 && Math.abs((q.min[2] + q.max[2]) / 2) < .2 && q.max[1] > hb.c[1] - .17) lowerFront = true; }
      const lensOnFront = lens.length === 1 && Math.abs((lens[0].min[1] + lens[0].max[1]) / 2 - hb.c[1]) < .03 && lens[0].max[0] > hb.c[0] + .25 && Math.abs((lens[0].min[2] + lens[0].max[2]) / 2) < .02;
      ok(allowed && !forb && lens.length === 1 && rims.length === 1 && stray.length === 0 && !lowerFront && lensOnFront, kind + ' lod ' + lod + ': only allowed named parts, exactly one lens and one rim on the front centre of the head, nothing else in the head volume, nothing below the lens' + (stray.length ? ' (stray ' + stray.map(s => s.name) + ')' : ''));
    }
  }
  const p = D.plan('robot_hauler', { seed: 4, wear: .6 });
  ok(p.nodes.hatch && p.nodes.battery && p.nodes.lens && p.parts.some(q => q.name === 'battery') && p.parts.some(q => q.name === 'hatch'), 'robot has a separate hatch node, a battery block and a lens node (open / closed and brightness are runtime states)');
  const hs = p.nodes.hatch.pivot, bs = p.nodes.battery.pivot; ok(Math.abs(hs[2] - (p.meta.bd / 2 + .012)) < 1e-9 && bs[2] < hs[2], 'hatch hinge sits on the +z side face and the battery sits inside it');
}

/* 5. the jetty: planks all differ; broken state; ranges tile */
{
  const jp = D.plan('jetty', { seed: 2, wear: .5, u0: -2, u1: 38 }), pl = jp.nodes.jetty.inst.find(i => i.name === 'planks').items;
  const keys = new Set(pl.map(q => [Math.round(q.m[0] * 1e3), Math.round(q.m[5] * 1e3), Math.round(q.m[10] * 1e3), Math.round(q.col[0] * 100)].join(',')));
  const len = pl.map(q => Math.hypot(q.m[0], q.m[4], q.m[8])), wid = pl.map(q => Math.hypot(q.m[2], q.m[6], q.m[10])), sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
  ok(pl.length > 150 && keys.size / pl.length > .95 && sd(wid) > .015 && sd(len) > .02 && new Set(pl.map(q => q.warp.toFixed(5))).size > pl.length * .6, 'jetty planks differ in length, width, colour and warp (' + pl.length + ' planks, ' + keys.size + ' distinct, width sd ' + sd(wid).toFixed(3) + ' m, length sd ' + sd(len).toFixed(3) + ' m)');
  const bk = D.plan('jetty', { seed: 2, wear: .5, u0: -2, u1: 38, broken: 1 }), pk = bk.nodes.jetty.inst.filter(i => i.name === 'stubs').reduce((a, i) => a + i.items.length, 0), pb = bk.nodes.jetty.inst.find(i => i.name === 'planks').items.length;
  ok(pk >= 5 && pb < pl.length + 12 && D.digest(bk) !== D.digest(jp) && bk.nodes.jetty.inst.some(i => i.name === 'stubs'), 'the broken jetty has snapped piles (' + pk + ' stubs) and loose planks, and differs from the intact one');
  const a = D.plan('jetty', { seed: 2, u0: -2, u1: 12 }), b = D.plan('jetty', { seed: 2, u0: 12, u1: 24 }), c = D.plan('jetty', { seed: 2, u0: -2, u1: 24 });
  const cnt = p => p.nodes.jetty.inst.filter(i => i.name === 'piles').reduce((s, i) => s + i.items.length, 0) + p.nodes.jetty.inst.filter(i => i.name === 'stubs').reduce((s, i) => s + i.items.length, 0);
  ok(cnt(a) + cnt(b) === cnt(c), 'jetty pieces tile: piles in u -2..12 plus 12..24 equal piles in -2..24 (' + cnt(a) + ' + ' + cnt(b) + ' = ' + cnt(c) + ')');
}

/* 6. bays: stack height; hulk; camp bits */
{
  for (const k of ['bay_planks', 'bay_rope', 'bay_glass', 'bay_metal']) { const lo = D.plan(k, { seed: 1, stack: 0 }), hi = D.plan(k, { seed: 1, stack: 1 }); const cp = { bay_planks: 'planks', bay_rope: 'coils', bay_glass: 'bottles', bay_metal: 'pipes' }[k], ct = p => p.parts.filter(q => q.name === cp).reduce((a, q) => a + q.tris, 0); ok(hi.tris > lo.tris && ct(hi) > ct(lo), k + ': stack height 1 holds more than 0 (' + lo.tris + ' -> ' + hi.tris + ' triangles)'); }
  const h = D.plan('hulk', { seed: 1 }), nm = new Set(h.parts.map(q => q.name)); ok(['hull', 'wheelhouse', 'windows', 'mast', 'rigging', 'rail', 'barnacles'].every(x => nm.has(x)), 'hulk has plating hull, wheelhouse with windows, mast, rigging, rail and barnacle band');
  const hut = D.plan('hut', { seed: 1 }), hn = new Set(hut.parts.map(q => q.name)); ok(['roof', 'wall', 'windows', 'tarp'].every(x => hn.has(x)) && hut.meta.lanterns.length === 3, 'hut has a corrugated roof, walls, lit windows, a tarp and three lantern points');
  const wl = D.plan('washline', { seed: 1, cloths: 7 }), sw = wl.nodes.wash.B.cloth.w.filter(v => v > 0).length; ok(sw > 40, 'washing line has swaying cloth vertices (' + sw + ' with a sway weight)');
}

/* 7. browser: the board and the film page, zero console errors */
if (process.argv.includes('browser=0')) console.log('browser part skipped (browser=0)');
else {
  let chromium = null; try { chromium = require('playwright').chromium; } catch (e) { console.log('playwright not found: browser part skipped (set NODE_PATH=/opt/node-tools/node_modules)'); }
  if (chromium) {
    const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 }), page = await ctx.newPage(); let errs = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    const board = 'file://' + path.join(root, 'details_board.html');
    let boardErrs = 0, maxCalls = 0, rows = [];
    for (const id of [...D.KINDS.map(k => k.id), 'camp', 'all']) {
      errs = []; await page.goto(board + '?ui=0&spin=0&t=2&piece=' + id + '&hatch=1&lens=.8');
      await page.waitForFunction(() => window.__board && window.__bframes > 2, null, { timeout: 120000 }); await page.waitForTimeout(150);
      const st = await page.evaluate(() => window.__board.stats()); boardErrs += errs.length; maxCalls = Math.max(maxCalls, st.calls); rows.push(id + ' ' + st.tris + 't/' + st.calls + 'c');
      if (errs.length) console.log(id + ' errors: ' + errs.join(' | '));
    }
    console.log('board counters (triangles/draw calls as three.js counts them): ' + rows.join(', '));
    ok(boardErrs === 0, 'details_board.html: zero console errors for all ' + (D.KINDS.length + 2) + ' piece views');
    {
      errs = []; await page.goto(board + '?ui=0&spin=0&t=2&piece=robot_hauler');
      await page.waitForFunction(() => window.__board && window.__bframes > 2); const before = await page.evaluate(() => window.__board.stats().tris);
      await page.evaluate(() => { window.__board.S.wear = .9; window.__board.S.seed = 9; window.__board.S.lod = 1; window.__board.S.hatch = 1; window.__board.rebuild(); }); await page.waitForTimeout(300);
      const after = await page.evaluate(() => window.__board.stats().tris); ok(errs.length === 0 && after < before, 'board controls: wear, seed, lod and hatch can be changed live with no errors (lod 1 draws ' + after + ' vs ' + before + ' triangles)');
    }
    errs = []; const times = [5, 30, 65, 88];
    for (const t of times) { await page.goto('file://' + path.join(root, 'opening_proto.html') + '?ui=0&freeze=1&tier=ipad&t=' + t); await page.waitForFunction(() => window.__opening && window.__opening.ready && window.__oframes > 2, null, { timeout: 600000 }); await page.waitForTimeout(300); }
    /* the film uses the kit: at 88 s the repair robot's hatch is open, the battery is in, the lens is lit, the hands are on; at 65 s the hulk and three still robots stand with dark lenses */
    await page.goto('file://' + path.join(root, 'opening_proto.html') + '?ui=0&freeze=1&tier=ipad&t=88'); await page.waitForFunction(() => window.__opening && window.__opening.ready && window.__oframes > 2, null, { timeout: 600000 });
    const f88 = await page.evaluate(() => { const o = window.__opening, r = o.robots.repair, h = r.getObjectByName('hatch'), b = r.getObjectByName('battery'), g = r.userData.glow_lens; return { bays: o.G.bays.length, hatch: h.rotation.y, bat: b.visible, lens: g.color.r, hands: o.robots.hands.visible, hut: !!o.G.hut, hulk: !!o.G.hulk }; });
    ok(f88.bays === 4 && f88.hatch < -1.8 && f88.bat && f88.lens > .9 && f88.hands && f88.hut && f88.hulk, 'at 88 s the film shows the kit: 4 bays, hut, hulk, repair robot with the hatch open, battery seated, lens lit (' + f88.lens.toFixed(2) + '), gloved hands on it');
    await page.goto('file://' + path.join(root, 'opening_proto.html') + '?ui=0&freeze=1&tier=ipad&t=65'); await page.waitForFunction(() => window.__opening && window.__opening.ready && window.__oframes > 2, null, { timeout: 600000 });
    const f65 = await page.evaluate(() => { const o = window.__opening; return { stills: [o.robots.still1, o.robots.still2, o.robots.still3].map(r => [r.visible, r.userData.glow_lens.color.r]), hulk: o.G.hulk.visible, hands: o.robots.hands.visible }; });
    ok(f65.hulk && f65.stills.every(s => s[0] && s[1] < .3), 'at 65 s the hulk stands on the shore and three still robots have dark lenses (' + f65.stills.map(s => s[1].toFixed(2)).join(', ') + ')');
    ok(errs.length === 0, 'opening_proto.html: zero console errors at t = ' + times.join(', ') + ' s' + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
    await browser.close();
  }
}
console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
