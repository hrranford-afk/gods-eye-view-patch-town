/* Round Table Kingdom cards: the checker page and the setup flow, driven in headless Chromium with made-up frames.
   Run from games/sofa-siege/cards:   NODE_PATH=$(npm root -g) node tests/page-test.js
   Writes shots/cards-page-demo.png, -locked.png, -lost.png, -manual.png, print-page.png and tests/browser-timing.json.
   This is software rendering on a shared build machine. It says nothing about a real iPad camera. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), ROOT = path.resolve(DIR, '..');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const base = 'http://127.0.0.1:' + server.address().port + '/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
let n = 0, bad = 0; const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const ev = (f, a) => p.evaluate(f, a);
const frames = (k) => p.waitForFunction((k) => window.CARDS_PAGE.P.frames >= k, k, { timeout: 180000 });
const more = async (k) => { const f = await ev(() => CARDS_PAGE.P.frames); await frames(f + k); };
const shot = (name) => p.screenshot({ path: path.join(DIR, 'shots', name.replace('.png', SUF + '.png')), fullPage: true });

const A5 = process.argv.includes('--a5'), SETRAW = process.argv.includes('--set') ? process.argv[process.argv.indexOf('--set') + 1] : '1', SETQ = SETRAW + (A5 ? '&size=a5' : ''), SUF = (SETRAW === '1' ? '' : '-set' + SETRAW) + (A5 ? '-a5' : '');
await p.goto(base + 'cards.html?demo=1&fps=10&set=' + SETQ);
ok('page says the picture stays on the device', await ev(() => /stays on this device/.test(document.querySelector('.private').textContent)));
ok('demo is labelled as made-up frames', await ev(() => /made-up/.test(document.getElementById('modeTag').textContent)));
ok('before start: every card NOT SEEN, values UNKNOWN', await ev(() => CARDS_PAGE.registry.snapshot().every((c) => c.state === 'NOT_SEEN' && c.first_seen_ms === 'UNKNOWN') && /UNKNOWN/.test(document.getElementById('cardRows').textContent)));
await p.click('#bStart'); await frames(8);
ok('recogniser runs in a worker', await ev(() => CARDS_PAGE.P.useWorker === true));
const st = await ev(() => CARDS_PAGE.registry.snapshot().map((c) => [c.card_id, c.state, c.sightings]));
ok('the four cards in the demo scene are tracked, the two absent ones are not', st.filter((c) => c[1] === 'TRACKING').map((c) => c[0]).join() === '00,01,02,03' && st.filter((c) => c[1] === 'NOT_SEEN').map((c) => c[0]).join() === '04,05', st);
const err1 = await ev(() => CARDS_PAGE.P.demoErr); ok('previews exist for blue, red and flag', err1 && err1.length === 3, err1);
const worst = (e) => Math.max(...e.map((s) => +s.split(': ')[1].split(' mm')[0]));
ok('preview within 10 mm of the made-up truth', worst(err1) < 10, worst(err1) + ' mm worst');
ok('LOCK TABLE is offered', await ev(() => !document.getElementById('bLock').disabled));
await shot('cards-page-demo.png');
const before = await ev(() => ({ ...CARDS_PAGE.setup.placements['03'].t }));
await p.click('#bMove'); await more(9);
const after = await ev(() => ({ ...CARDS_PAGE.setup.placements['03'].t }));
ok('moving the FLAG card moves its preview (about 150 mm)', Math.abs(Math.hypot(after.x_mm - before.x_mm, after.y_mm - before.y_mm) - 150.3) < 12, { before, after });
await p.click('#bLock');
const locked = await ev(() => CARDS_PAGE.setup.locked);
ok('lock gives schema_version 1 JSON with three LOCKED placements and two NOT_SCANNED', locked && locked.schema_version === 1 && locked.reference_card_id === '00' && locked.placement_mode === 'card_scan' && locked.placements.filter((q) => q.status === 'LOCKED').length === 3 && locked.placements.filter((q) => q.status === 'NOT_SCANNED' && q.transform_anchor_relative === null).length === 2, locked && locked.placements.map((q) => q.card_id + ':' + q.status));
ok('locked JSON passes its own validator and was saved on the device', await ev(() => RTK_SETUP.LockedPlacementStore.validate(CARDS_PAGE.setup.locked).length === 0 && JSON.stringify(RTK_SETUP.LockedPlacementStore.load()) === JSON.stringify(CARDS_PAGE.setup.locked)));
await p.click('#bHide'); await p.click('#bMove'); await more(9);
ok('after the lock, hiding BLUE and moving FLAG changes nothing', JSON.stringify(await ev(() => CARDS_PAGE.setup.locked)) === JSON.stringify(locked) && JSON.stringify(await ev(() => CARDS_PAGE.setup.placements['03'].t)) === JSON.stringify(after));
ok('the checker still reports BLUE as lost while locked', await ev(() => CARDS_PAGE.registry.entries['01'].state === 'LOST'));
await shot('cards-page-locked.png');
await p.click('#bUnlock'); await more(6);
const msgs = await ev(() => CARDS_PAGE.setup.messages(1e9).map((m) => m.text));
ok('after unlock, the hidden BLUE card gives a clear lost message', msgs.some((m) => /BLUE BASE is lost from view/.test(m)), msgs);
await shot('cards-page-lost.png');
await p.click('#bCopy'); await p.waitForTimeout(300);
const log = JSON.parse(await ev(() => CARDS_PAGE.P.lastLog));
ok('log has user agent, camera size, six cards with sightings and distances', !!log.user_agent && log.camera.width === 1280 && log.cards.length === 6 && log.cards[0].sightings > 5 && typeof log.cards[0].distance_mm.median === 'number' && log.cards[4].distance_mm === 'UNKNOWN', { ms: log.recogniser.ms_per_frame_median, events: log.events.length });
fs.writeFileSync(path.join(DIR, 'tests', 'demo-log-example' + SUF + '.json'), JSON.stringify(log, null, 1));

/* touch fallback, no camera and no cards at all */
await p.goto(base + 'cards.html?demo=1&set=' + SETQ);
const tap = async (id, fx, fy) => { await p.click('#manualRow button[data-id="' + id + '"]'); const r = await p.locator('#top').boundingBox(); await p.mouse.click(r.x + r.width * fx, r.y + r.height * fy); };
await tap('01', 0.5, 0.85); await tap('02', 0.5, 0.15); ok('LOCK is refused until the flag is placed', await ev(() => document.getElementById('bLock').disabled));
await tap('03', 0.64, 0.4); await p.click('#bTurnL');
ok('touch placement alone allows the lock', await ev(() => !document.getElementById('bLock').disabled));
await p.click('#bLock'); const lm = await ev(() => CARDS_PAGE.setup.locked);
ok('touch lock gives the same JSON shape, placement_mode manual_touch', lm && lm.schema_version === 1 && lm.placement_mode === 'manual_touch' && lm.placements.filter((q) => q.status === 'LOCKED' && q.source === 'manual_touch').length === 3 && lm.placements[2].transform_anchor_relative.yaw_deg === 15 && Object.keys(lm).join() === Object.keys(locked).join(), lm && lm.placements.slice(0, 3).map((q) => q.transform_anchor_relative));
ok('game helper turns the JSON into table units', await ev(() => { const g = RTK_SETUP.LockedPlacementStore.toTableUnits(CARDS_PAGE.setup.locked, { mmPerUnit: 200 }); return g.length === 5 && g[0].placed && Math.abs(g[0].z - (-CARDS_PAGE.setup.locked.placements[0].transform_anchor_relative.y_mm / 200)) < 1e-9 && g[3].placed === false; }));
await shot('cards-page-manual.png');
await p.reload(); ok('after a reload the saved layout is offered, and using it locks the table with the same numbers', await ev(() => { if (document.getElementById('bLoad').disabled || CARDS_PAGE.setup.state === 'LOCKED') return false; document.getElementById('bLoad').click(); const a = CARDS_PAGE.setup, s = RTK_SETUP.LockedPlacementStore.load(); return a.state === 'LOCKED' && JSON.stringify(RTK_SETUP.LockedPlacementStore.build(a).placements.map((q) => q.transform_anchor_relative)) === JSON.stringify(s.placements.map((q) => q.transform_anchor_relative)) && a.placements['01'].t.y_mm === s.placements[0].transform_anchor_relative.y_mm; }));

/* print page: true size */
await p.goto(base + 'cards/print.html?set=' + SETQ); await p.waitForLoadState('networkidle');
const sz = await ev(() => Array.from(document.querySelectorAll('.sheet img')).map((i) => { const r = i.getBoundingClientRect(); return [r.width, r.height, i.naturalWidth > 0]; }));
const PW = SETRAW === '1' || A5 ? 210 : 148, PH = SETRAW === '1' || A5 ? 148.5 : 105;
ok('print page: six cards, each ' + PW + ' x ' + PH + ' mm in CSS units, two per sheet', sz.length === 6 && sz.every((s) => Math.abs(s[0] - PW * 96 / 25.4) < 0.6 && Math.abs(s[1] - PH * 96 / 25.4) < 0.6 && s[2]) && await ev(() => document.querySelectorAll('.sheet').length === 3), sz[0]);
await p.setViewportSize({ width: 900, height: 1200 }); await p.screenshot({ path: path.join(DIR, 'shots', 'print-page' + SUF + '.png'), fullPage: false });

/* time per frame in this Chromium, main thread, on made-up frames */
await p.goto(base + 'cards.html?demo=1&set=' + SETQ); await p.addScriptTag({ url: base + 'cards/synth.js' });
const timing = await ev(async () => { const ims = await CARDS_PAGE.loadCards(), t0 = performance.now(); CV_CARDS.init(ims); const init = performance.now() - t0, lib = {}; ims.forEach((m) => { lib[m.id] = CARD_SYNTH.mips({ d: m.gray, w: m.w, h: m.h }); }); const r = CARD_SYNTH.rng(5), out = { init_ms: Math.round(init), user_agent: navigator.userAgent, cores: navigator.hardwareConcurrency };
  for (const [w, h] of [[640, 480], [1280, 720]]) { const ts = []; let found = 0; for (let k = 0; k < 10; k++) { const sc = CARD_SYNTH.singleScene(r, w, h, ims[k % 6].id, [0.5, 0.9], [40, 70]), f = CARD_SYNTH.render(sc, lib, 100 + k), a = performance.now(), d = CV_CARDS.detect(f.gray, w, h); ts.push(performance.now() - a); found += d.length; } ts.sort((x, y) => x - y); out[w + 'x' + h] = { median_ms: Math.round(ts[5]), min_ms: Math.round(ts[0]), max_ms: Math.round(ts[9]), frames: 10, cards_found: found }; } return out; });
timing.note = 'Headless Chromium, software rendering, shared build machine. NOT an iPad. iPad speed is UNKNOWN.';
fs.writeFileSync(path.join(DIR, 'tests', 'browser-timing' + SUF + '.json'), JSON.stringify(timing, null, 1)); console.log('timing', JSON.stringify(timing));
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(n - bad + ' of ' + n + ' passed'); await b.close(); server.close(); process.exit(bad ? 1 : 0);
