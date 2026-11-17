/* PatchTown Works test.
   Run from the repo root:  NODE_PATH=$(npm root -g) node games/works/tests/works-test.js
   (add --no-live to skip the one run against the real GitHub API)
   The repo's package.json says "type": "module", so this is an ES module; playwright comes from NODE_PATH via createRequire. */
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SHOTS = path.join(ROOT, 'shots');
const LIVE = !process.argv.includes('--no-live');
fs.mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

/* a tiny static server for games/works */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jsonl': 'text/plain', '.md': 'text/plain', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port + '/index.html';

/* GitHub API fixtures: the real branches plus one brand-new branch that only GitHub knows about */
const now = Date.now(), iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const sha = (s) => (s + '0000000000000000000000000000000000000000').replace(/[^0-9a-f]/g, 'a').slice(0, 40);
const FIX = {
  branches: ['main', 'gh-pages', 'game/micro-precinct', 'game/bc-mac', 'game/bc-depth', 'game/bc-snap', 'game/test-new'].map((n, i) => ({ name: n, commit: { sha: sha('b' + i) } })),
  events: [
    { type: 'PushEvent', created_at: iso(now - 20 * 60000), payload: { ref: 'refs/heads/game/test-new', head: sha('f1') } },
    { type: 'CreateEvent', created_at: iso(now - 50 * 60000), payload: { ref: 'game/test-new', ref_type: 'branch' } },
    { type: 'PushEvent', created_at: iso(now - 30 * 60000), payload: { ref: 'refs/heads/game/bc-depth', head: sha('d1') } },
    { type: 'PushEvent', created_at: iso(now - 40 * 60000), payload: { ref: 'refs/heads/gh-pages', head: sha('e1') } },
    { type: 'PushEvent', created_at: iso(now - 9 * 86400000), payload: { ref: 'refs/heads/game/old-thing', head: sha('c1') } }
  ],
  commits: {
    'game/test-new': [{ sha: sha('f1'), commit: { message: 'Fixture: a brand new branch\n\nbody line', author: { date: iso(now - 20 * 60000) } }, parents: [{}] },
      { sha: sha('f2'), commit: { message: 'Fixture: first step, mail me at someone@example.com', author: { date: iso(now - 45 * 60000) } }, parents: [{}] }],
    'game/bc-depth': [{ sha: sha('d1'), commit: { message: 'Fixture: depth keeps going', author: { date: iso(now - 30 * 60000) } }, parents: [{}] }],
    'gh-pages': [{ sha: sha('e1'), commit: { message: 'Fixture: something new in the window', author: { date: iso(now - 40 * 60000) } }, parents: [{}] }]
  },
  runs: { total_count: 1, workflow_runs: [{ name: 'pages build and deployment', head_branch: 'gh-pages', status: 'completed', conclusion: 'success', updated_at: iso(now - 39 * 60000), run_number: 58, head_sha: sha('e1') }] },
  deployments: [{ environment: 'github-pages', created_at: iso(now - 39 * 60000), sha: sha('e1') }]
};
const LEDGER = fs.readFileSync(path.join(ROOT, 'ledger.jsonl'), 'utf8');
const apiCalls = [];
async function mockGitHub(ctx, { limited = false } = {}) {
  await ctx.route('https://api.github.com/**', (route) => {
    const u = new URL(route.request().url()); apiCalls.push(u.pathname + u.search);
    const hdr = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'ETag, X-RateLimit-Remaining, X-RateLimit-Reset', 'x-ratelimit-remaining': limited ? '0' : '55', 'x-ratelimit-reset': String(Math.floor(now / 1000) + 3600), etag: '"fx1"' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: Object.assign(hdr, { 'access-control-allow-headers': 'If-None-Match, Accept' }) });
    if (limited) return route.fulfill({ status: 403, headers: hdr, body: '{"message":"API rate limit exceeded"}' });
    const p = u.pathname.replace('/repos/hrranford-afk/gods-eye-view-patch-town', '');
    let body = [];
    if (p === '/branches') body = FIX.branches;
    else if (p === '/events') body = FIX.events;
    else if (p === '/commits') body = FIX.commits[u.searchParams.get('sha')] || [];
    else if (p === '/actions/runs') body = FIX.runs;
    else if (p === '/deployments') body = FIX.deployments;
    return route.fulfill({ status: 200, headers: hdr, body: JSON.stringify(body) });
  });
  await ctx.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'text/plain', 'access-control-allow-origin': '*' },
    body: route.request().url().endsWith('asks.json') ? fs.readFileSync(path.join(ROOT, 'asks.json'), 'utf8') : LEDGER }));
}

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined
});
async function open(ctx, url) {
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(url, { waitUntil: 'load', timeout: 60000 });
  const has = await pg.waitForFunction(() => window.__works, null, { timeout: 30000 }).catch(() => null);
  if (!has) { console.log('page never started:', errs.join(' | ')); throw new Error('page did not start'); }
  await pg.evaluate(() => window.__works.ready);
  await pg.waitForTimeout(1200);
  return { pg, errs };
}
const shot = async (pg, name) => { await pg.waitForTimeout(700); await pg.screenshot({ path: path.join(SHOTS, name) }); console.log('     shot', name); };
const st = (pg) => pg.evaluate(() => window.__works.state());

/* glance checks run on any page: smallest text, label overlaps, the mood line is the biggest text */
const glance = (pg) => pg.evaluate(() => {
  const H = innerHeight, vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && r.bottom > 0 && r.top < H; };
  let min = 1e9, minWhat = '', max = 0, maxWhat = '';
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.closest('[hidden]')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const f = parseFloat(getComputedStyle(el).fontSize);
    if (f < min) { min = f; minWhat = el.className || el.tagName; }
    if (f > max) { max = f; maxWhat = el.id || el.className || el.tagName; }
  }
  const labs = [...document.querySelectorAll('.lab')].filter(vis).map((l) => l.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) { const a = labs[i], b = labs[j]; if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps++; }
  const words = ['#mood', '#since'].map((q) => document.querySelector(q)).filter((el) => el && vis(el)).map((el) => el.innerText).join(' ') + ' ' + [...document.querySelectorAll('.lab')].filter(vis).map((l) => l.innerText).join(' ');
  return { H, min, minWhat, max, maxWhat, overlaps, labels: labs.length, words: words.split(/\s+/).filter(Boolean).length };
});

/* ---- 1. mocked GitHub, desktop projector size, evening ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await mockGitHub(ctx);
  const { pg, errs } = await open(ctx, BASE + '?mode=evening&shots=1');
  let s = await st(pg);
  ok(s.events > 50, 'events loaded: ' + s.events);
  for (const b of ['game/bc-mac', 'game/bc-depth', 'game/bc-snap', 'game/test-new']) ok(s.workshops.includes(b), 'workshop for ' + b);
  ok(!s.workshops.includes('game/old-thing'), 'no workshop for a branch idle for 9 days');
  ok(!s.workshops.includes('gh-pages') && !s.workshops.includes('main'), 'gh-pages and main are not workshops');
  ok(s.labels.some((t) => t.includes('Test new workshop')), 'plain-name label for the new branch');
  ok(s.net.ok >= 4 && apiCalls.length <= 16, 'GitHub calls kept small: ' + apiCalls.length);
  ok(s.live === true, 'starts live');
  ok(await pg.isHidden('#diary'), 'diary closed by default');
  ok(s.mood.length > 0 && /needs? you\.$/.test(s.mood), 'mood line written: "' + s.mood + '"');
  ok(s.since.length <= 3, 'since you looked: at most 3 lines (' + s.since.length + ')');
  const g = await glance(pg);
  ok(g.min >= g.H / 45 - 0.01, 'wall: smallest text ' + g.min.toFixed(1) + ' px >= 1/45 of ' + g.H + ' (' + g.minWhat + ')');
  ok(g.maxWhat === 'mood' || g.maxWhat.includes('m-'), 'wall: the mood line is the biggest text (' + g.maxWhat + ', ' + g.max.toFixed(0) + ' px)');
  ok(g.overlaps === 0, 'wall: no label overlaps (' + g.labels + ' labels shown)');
  ok(g.words <= 60, 'wall: glance words on screen ' + g.words);
  const lab = await pg.evaluate(() => { const l = [...document.querySelectorAll('.lab:not(.tiny)')].find((x) => x.style.display !== 'none'); return l ? parseFloat(getComputedStyle(l).fontSize) : 0; });
  ok(lab >= 900 / 30 - 0.5, 'wall: place labels about 1/30 of the height (' + lab + ' px)');
  const cam0 = s.cam; await pg.waitForTimeout(2500);
  ok((await st(pg)).cam === cam0, 'still camera by default (no orbit)');
  ok(s.fresh.some((f) => f.name === 'Ledger') && s.fresh.some((f) => f.name === 'GitHub' && !f.old) && s.fresh.some((f) => f.name === "Harry's town" && f.old), 'freshness strip: ledger, GitHub (fresh), the sample wall (old)');
  await shot(pg, 'v11-wall-live.png');

  /* the diary on demand; email in a commit message hidden */
  await pg.click('#bDiary');
  ok(await pg.isVisible('#diary'), 'diary opens on demand');
  const evText = await pg.textContent('#events');
  ok(!evText.includes('someone@example.com'), 'email in a commit message is hidden');
  await pg.click('#bDiary');

  /* zoom: the yard card */
  await pg.evaluate(() => window.__works.openCard('yard'));
  await pg.waitForTimeout(1500);
  ok(await pg.isVisible('#card'), 'yard card opens');
  const yc = await pg.textContent('#cBody');
  ok(yc.includes('Test lamps by suite and branch') && yc.includes('not run'), 'yard card: lamps by suite and branch, grey "not run"');
  await shot(pg, 'v11-yard-card.png');
  await pg.click('#bClose');
  ok(await pg.isHidden('#card'), 'card closes');

  /* click a building in 3D (raycast) */
  await pg.evaluate(() => window.__works.view(0.7, 0.62, 27));
  await pg.waitForTimeout(1800);
  const pt = await pg.evaluate(() => window.__works.pick('shop'));
  await pg.mouse.click(pt.x, pt.y);
  await pg.waitForTimeout(400);
  s = await st(pg);
  ok(s.card === 'shop', 'clicking the shop in 3D opens its card (' + s.card + ')');
  await pg.click('#bClose');

  /* timeline: scrub back to 12:30 on 16 Nov */
  await pg.evaluate(() => window.__works.setDay('2026-11-16'));
  await pg.evaluate(() => window.__works.scrub(12, 30));
  s = await st(pg);
  const at1230 = s.dayEvents;
  ok(!s.live && new Date(s.T).getHours() === 12, 'scrubbed to 12:30');
  await pg.evaluate(() => window.__works.scrub(18, 5));
  s = await st(pg);
  ok(s.dayEvents > at1230, 'more has happened by 18:05 (' + at1230 + ' -> ' + s.dayEvents + ')');
  ok(s.weather === 'storm', 'storm at 18:05 (roomfix failing on build 30): ' + s.weather);
  ok(s.lamps.includes('fail') && s.lamps.includes('pass'), 'yard has passing and failing lamps');
  ok(s.mood.startsWith('Roomfix fails on Depth.'), 'mood at 18:05 leads with the failure: "' + s.mood + '"');
  await shot(pg, 'v11-storm-1805.png');
  await pg.evaluate(() => window.__works.scrub(18, 20));
  s = await st(pg);
  ok(s.suites.includes('roomfix@game/bc-depth') && s.suites.includes('roomfix@game/bc-mac') && s.lamps.includes('fail'), "18:20: build 29's roomfix pass does not hide build 30's fail");
  ok(s.lamps.includes('rerun'), 'a pass on rerun is shown as a rerun');
  await pg.evaluate(() => window.__works.scrub(16, 30));
  s = await st(pg);
  ok(s.rainbow === (s.weather !== 'storm'), 'one weather at a time: rainbow ' + s.rainbow + ' with ' + s.weather);
  ok(s.walkers > 0, 'walkers out at 16:30: ' + s.walkers);

  /* lost property: the build 29 builder that stopped at 16:27 on 15 Nov */
  await pg.evaluate(() => window.__works.setDay('2026-11-15'));
  await pg.evaluate(() => window.__works.scrub(21, 0));
  s = await st(pg);
  ok(s.lost >= 1, 'lost property at 21:00 on 15 Nov: ' + s.lost);
  ok(/Mac builder lost since 16:27/.test(s.mood), 'mood names the lost builder: "' + s.mood + '"');
  await pg.evaluate(() => window.__works.openCard('lost'));
  await pg.waitForTimeout(1500);
  ok((await pg.textContent('#cBody')).includes('no sign of life since 16:27'), 'lost card names the 16:27 stop');
  await shot(pg, 'v11-lost-property.png');
  await pg.evaluate(() => window.__works.closeCard());
  await pg.evaluate(() => window.__works.setDay('2026-11-15'));
  await pg.evaluate(() => window.__works.scrub(17, 15));
  s = await st(pg);
  ok(s.quiet >= 1 && s.lost === 0, 'late (amber) at 17:15 on 15 Nov: 48 min after the last sign of life at 16:27');
  await pg.evaluate(() => window.__works.setDay('2026-11-16'));
  await pg.evaluate(() => window.__works.scrub(13, 0));
  s = await st(pg);
  ok(s.lost === 0, 'picked up again by 13:00 on 16 Nov');

  /* replay runs forward */
  await pg.evaluate(() => window.__works.startReplay());
  const t0 = (await st(pg)).T;
  await pg.waitForTimeout(2000);
  s = await st(pg);
  ok(s.playing && s.T > t0 + 10 * 60000, 'replay moves the clock (' + Math.round((s.T - t0) / 60000) + ' min in 2 s)');
  await pg.click('#bLive');
  ok((await st(pg)).live, 'Live button goes back to now');

  /* Harry's town card + day mode */
  await pg.evaluate(() => window.__works.openCard('harry'));
  await pg.waitForTimeout(2000);
  const ht = await pg.textContent('#cBody');
  ok(ht.includes('Who is speaking') && ht.includes('as of 16:35'), "Harry's town card shows the wall, labelled as a sample");
  await pg.evaluate(() => window.__works.closeCard());
  await pg.click('#bDay');
  await pg.waitForTimeout(1500);
  await shot(pg, 'v11-daylight.png');
  /* tour: optional, only places that are not quiet, 6 stops at most */
  await pg.click('#bTour');
  await pg.waitForTimeout(1500);
  s = await st(pg);
  ok(!!s.card && s.card !== 'hut', 'tour starts at the most urgent place (' + s.card + ')');
  await pg.click('#bTour');
  /* Still */
  await pg.click('#bStill');
  ok((await st(pg)).still === true, 'the Still button stops motion');
  await pg.click('#bStill');
  ok(errs.length === 0, 'no page errors (mocked) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 2. the real ledger at a fixed time: mood, question board, order wagons and their ages ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const { pg, errs } = await open(ctx, BASE + '?offline&mode=evening&now=2026-11-17T15:00:00Z');
  let s = await st(pg);
  ok(s.mood === 'Roomfix fails on Depth. 2 more problems. 5 things need you.', 'mood (failing ledger): "' + s.mood + '"');
  ok(s.refused.length === 0, 'the real ledger passes the checker in the page');
  const o = Object.fromEntries(s.orderList.map((x) => [x.id, x]));
  ok(o['keep-1'] && o['keep-1'].state === 'back' && o['keep-1'].tookMin === 989, 'keep-1: order 15:51 16 Nov -> result 08:20 17 Nov, back after 16 h 29 min (' + JSON.stringify(o['keep-1']) + ')');
  ok(o['mega-review-1'] && o['mega-review-1'].state === 'back' && o['mega-review-1'].tookMin === 985, 'mega-review-1 back after 16 h 25 min');
  ok(o['scan-1'] && o['scan-1'].state === 'back' && o['scan-1'].tookMin === 1153, 'scan-1 back after 19 h 13 min');
  ok(o['report-1'] && o['report-1'].state === 'late' && o['report-1'].ageMin === 1414, 'report-1 still out, late: 23 h 34 min (' + JSON.stringify(o['report-1']) + ')');
  ok(o['mega-1'] && o['mega-1'].state === 'overdue', 'mega-1 never came back: overdue');
  await pg.evaluate(() => window.__works.openCard('bridge'));
  await pg.waitForTimeout(1800);
  const bt = await pg.textContent('#cBody');
  ok(bt.includes('back after 16 h 29 min') && bt.includes('overdue'), 'bridge card shows wagon ages and states');
  s = await st(pg);
  ok(s.shownLabels.some((t) => t.includes('keep-1')), 'wagon labels name the order when you look at the bridge');
  await shot(pg, 'v11-bridge-orders.png');
  await pg.evaluate(() => window.__works.closeCard());
  /* Harry's question board */
  await pg.click('#bAsk');
  await pg.waitForTimeout(800);
  s = await st(pg);
  const qt = await pg.textContent('#cBody');
  ok(s.card === 'hall' && s.asks.join(',') === 'S1,S2,S3,D1,M1', 'question board opens with 5 open asks: ' + s.asks.join(','));
  ok(qt.includes('Recommended') && qt.includes('silence means no') && qt.includes('54 more'), 'question board: recommended answers, the silence rule, the rest in DECISIONS.md');
  ok((await pg.textContent('#bAsk')).includes('5 questions'), 'the Questions button counts open asks');
  await shot(pg, 'v11-question-board.png');
  await pg.click('#bClose');
  const f = (await st(pg)).fresh;
  ok(f.find((x) => x.name === 'GitHub').old && (await pg.textContent('#fresh')).includes('offline'), 'freshness strip: offline GitHub is grey and says so');
  ok(errs.length === 0, 'no page errors (fixed time) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 3. planted ledgers: all good, a personal line, heartbeats ---- */
{
  const T = Date.parse('2026-11-17T15:00:00Z'), at = (min) => iso(T - min * 60000);
  const L = (o) => JSON.stringify(Object.assign({ who: 'foreman', where: 'hut', trust: 'measured' }, o));
  const allGood = [
    L({ t: at(300), what: 'Builder starts', kind: 'start', who: 'builder:alpha', where: 'workshop:game/alpha', ref: 'game/alpha' }),
    L({ t: at(240), what: 'Alpha step', kind: 'commit', who: 'builder:alpha', where: 'workshop:game/alpha', ref: 'abc1234', branch: 'game/alpha' }),
    L({ t: at(200), what: 'house 43 of 43', kind: 'test', who: 'town', where: 'yard', suite: 'house', status: 'pass', n: '43/43', branch: 'game/alpha', ref: 'abc1234' }),
    L({ t: at(180), what: 'Builder done', kind: 'end', who: 'builder:alpha', where: 'workshop:game/alpha', ref: 'game/alpha' }),
    L({ t: at(170), what: 'Alpha went live', kind: 'deploy', where: 'shop', ref: 'abc1234' }),
    L({ t: at(160), what: 'Order tiny-1 to the town', kind: 'order', where: 'bridge', ref: 'tiny-1', trust: 'typed' }),
    L({ t: at(60), what: 'Results back for tiny-1: done', kind: 'result', who: 'town', where: 'bridge', ref: 'results/file.md', trust: 'reported' })
  ];
  const planted = L({ t: at(50), what: 'Ring me on 07700 900123 about it', kind: 'step' });
  const beats = [
    L({ t: at(50), what: 'Beta starts', kind: 'start', who: 'builder:beta', where: 'workshop:game/beta', ref: 'game/beta' }),
    L({ t: at(30), what: 'still working', kind: 'heartbeat', who: 'builder:beta', where: 'workshop:game/beta', job: 'game/beta' }),
    L({ t: at(50), what: 'Gamma starts', kind: 'start', who: 'builder:gamma', where: 'workshop:game/gamma', ref: 'game/gamma' }),
    L({ t: at(30), what: 'Gamma commit', kind: 'commit', who: 'builder:gamma', where: 'workshop:game/gamma', ref: 'def5678', branch: 'game/gamma' }),
    L({ t: at(140), what: 'Delta starts', kind: 'start', who: 'builder:delta', where: 'workshop:game/delta', ref: 'game/delta' }),
    L({ t: at(70), what: 'still working', kind: 'heartbeat', who: 'builder:delta', where: 'workshop:game/delta', job: 'game/delta' })
  ];
  const oneAsk = JSON.stringify({ asks: [{ id: 'T9', q: 'A taste question?', default: 'Yes', type: 'taste', asked: at(600), status: 'open' }, { id: 'S1', q: 'Done one', default: 'Yes', status: 'yes' }] });
  async function withLedger(lines, asks, w = 1600, h = 900) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await ctx.route('**/ledger.jsonl', (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: lines.join('\n') + '\n' }));
    if (asks) await ctx.route('**/asks.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: asks }));
    const o = await open(ctx, BASE + '?offline&mode=evening&now=' + iso(T));
    return Object.assign(o, { ctx });
  }
  /* all good */
  {
    const { pg, errs, ctx } = await withLedger(allGood, oneAsk);
    const s = await st(pg);
    ok(s.mood === 'All good. 1 thing needs you.', 'mood (all-good ledger): "' + s.mood + '"');
    ok(s.orderList.length === 1 && s.orderList[0].state === 'back' && s.orderList[0].tookMin === 100, 'order tiny-1 came back after 100 min (matched by name, not ref)');
    await shot(pg, 'v11-all-good.png');
    /* reduced motion: nothing moves */
    const snap = () => pg.evaluate(() => JSON.stringify([window.__works.state().cam, window.__works.walkerSpots()]));
    const a = await snap(); await pg.waitForTimeout(3000); const b = await snap();
    ok(a === b, 'reduced motion: camera and walkers do not move for 3 s');
    ok(errs.length === 0, 'no page errors (all good) ' + errs.join(' | '));
    await ctx.close();
  }
  /* a planted personal line is refused: not drawn, counted, not shown */
  {
    const { pg, errs, ctx } = await withLedger(allGood.concat([planted]), oneAsk);
    const s = await st(pg);
    ok(s.refused.length === 1 && s.refused[0].line === 8 && s.refused[0].why.join().includes('phone'), 'page refuses the planted phone-number line: ' + JSON.stringify(s.refused));
    const body = await pg.evaluate(() => document.body.innerText);
    ok(!body.includes('07700') && (await pg.textContent('#fresh')).includes('1 line refused'), 'the refused line is never drawn; the strip says 1 line refused');
    await pg.evaluate(() => window.__works.openCard('library'));
    await pg.waitForTimeout(1200);
    ok((await pg.textContent('#cBody')).includes('line 8'), 'library card names the refused line and rule');
    await shot(pg, 'v11-refused.png');
    ok(errs.length === 0, 'no page errors (refused) ' + errs.join(' | '));
    await ctx.close();
  }
  /* heartbeats: count as life, and tighten the stall alarm to 20 / 60 min for that job */
  {
    const { pg, errs, ctx } = await withLedger(beats, null);
    const s = await st(pg), by = Object.fromEntries(s.stalls.map((x) => [x.who, x]));
    ok(by['builder:beta'] && by['builder:beta'].level === 'amber' && by['builder:beta'].lateMin === 20, 'heartbeat job quiet 30 min: late (20 min rule) ' + JSON.stringify(by['builder:beta']));
    ok(!by['builder:gamma'], 'no-heartbeat job quiet 30 min: fine (45 min rule)');
    ok(by['builder:delta'] && by['builder:delta'].level === 'red' && by['builder:delta'].lostMin === 60, 'heartbeat job quiet 70 min: lost (60 min rule)');
    ok(s.walkers === 1, 'heartbeats make no walkers (only the commit walks): ' + s.walkers);
    ok(/Delta builder lost since 13:50/.test(s.mood), 'mood names the lost heartbeat job: "' + s.mood + '"');
    ok(errs.length === 0, 'no page errors (heartbeats) ' + errs.join(' | '));
    await ctx.close();
  }
  /* the checker script itself */
  {
    const { checkText } = await import(path.join(ROOT, 'tools', 'ledger-check.mjs'));
    const real = checkText(LEDGER);
    ok(real.refused.length === 0 && real.ok.length > 100, 'tools/ledger-check.mjs: the real ledger passes (' + real.ok.length + ' lines)');
    const bad = [planted,
      L({ t: at(5), what: 'Mail someone@example.com', kind: 'step' }),
      L({ t: at(5), what: 'Left it at 12 Acacia Road', kind: 'step' }),
      L({ t: at(5), what: 'iPad field report: played at 16:42', kind: 'step', where: 'harry' }),
      L({ t: at(5), what: 'ok', kind: 'party' }),
      '{"t":"2026-11-17T10:00:00Z","who":"town"',
      L({ t: at(5), what: 'a test with no suite', kind: 'test' })];
    const r = checkText(bad.join('\n'));
    ok(r.ok.length === 0 && r.refused.length === bad.length, 'checker refuses every planted line (' + r.refused.map((x) => x.why[0]).join(' | ') + ')');
    ok(checkText(beats.join('\n')).refused.length === 0, 'checker accepts heartbeat lines');
  }
}

/* ---- 4. phone width ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await mockGitHub(ctx);
  const { pg, errs } = await open(ctx, BASE + '?mode=evening&day=2026-11-16&t=17:20');
  const w = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw: innerWidth }));
  ok(w.sw <= w.iw && w.bw <= w.iw, 'phone: no horizontal scroll (' + w.sw + '/' + w.bw + ' vs ' + w.iw + ')');
  const g = await glance(pg);
  ok(g.min >= 15, 'phone: smallest text ' + g.min + ' px (15 px floor)');
  ok(g.overlaps === 0, 'phone: no label overlaps (' + g.labels + ' shown)');
  const pr = await pg.evaluate(() => { const r = (q) => document.querySelector(q).getBoundingClientRect(); return { since: r('#since').bottom, fresh: r('#fresh').top, glance: r('.glance').bottom }; });
  ok(pr.since <= pr.fresh + 1, 'phone: since-you-looked sits above the freshness strip');
  await shot(pg, 'v11-phone.png');
  await pg.evaluate(() => window.__works.openCard('shop'));
  await pg.waitForTimeout(1500);
  const w2 = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(w2, 'phone: card fits');
  await shot(pg, 'v11-phone-card.png');
  await pg.evaluate(() => window.__works.closeCard());
  await pg.click('#bAsk');
  await pg.waitForTimeout(800);
  ok((await st(pg)).card === 'hall', 'phone: question board opens');
  await shot(pg, 'v11-phone-questions.png');
  ok(errs.length === 0, 'no page errors (phone) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 5. rate-limited: falls back to the ledger ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await mockGitHub(ctx, { limited: true });
  const { pg, errs } = await open(ctx, BASE + '?mode=evening');
  const s = await st(pg);
  ok(s.events > 50 && s.workshops.includes('game/bc-depth'), 'rate-limited: town still built from the ledger');
  ok((await pg.textContent('#fresh')).includes('rate limit'), 'rate-limited: the freshness strip says so');
  const still = () => pg.evaluate(() => JSON.stringify(window.__works.walkerSpots()));
  const a = await still(); await pg.waitForTimeout(1500); const b = await still();
  ok(a === b, 'reduced motion: walkers stand still');
  ok(errs.length === 0, 'no page errors (rate-limited) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 6. once against the real GitHub ---- */
if (LIVE) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const { pg, errs } = await open(ctx, BASE + '?mode=evening');
  await pg.waitForTimeout(3000);
  const s = await st(pg);
  console.log('     live: calls', s.net.calls, 'ok', s.net.ok, 'errors', s.net.errors, 'limited', s.net.limited, 'ledger', s.net.ledgerFrom, 'workshops', s.workshops.join(', '));
  ok(s.net.ok > 0 || s.net.limited, 'live: GitHub answered');
  ok(s.workshops.length > 0, 'live: workshops built');
  await shot(pg, 'v11-live-github.png');
  ok(errs.length === 0, 'no page errors (live) ' + errs.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
