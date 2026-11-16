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
  await ctx.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'text/plain', 'access-control-allow-origin': '*' }, body: LEDGER }));
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
  ok(s.labels.some((t) => t.includes('Workshop · test-new')), 'label for the new branch');
  ok(s.net.ok >= 4 && apiCalls.length <= 16, 'GitHub calls kept small: ' + apiCalls.length);
  const evText = await pg.textContent('#events');
  ok(!evText.includes('someone@example.com'), 'email in a commit message is hidden');
  ok(s.live === true, 'starts live');
  await shot(pg, 'w1-evening-live.png');

  /* zoom: click the yard label -> card */
  await pg.click('.lab[data-key="yard"]');
  await pg.waitForTimeout(1500);
  ok(await pg.isVisible('#card'), 'yard card opens');
  ok((await pg.textContent('#cBody')).includes('Test suites'), 'yard card lists suites');
  await shot(pg, 'w2-yard-card.png');
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
  ok(s.lamps.includes('fail') && s.lamps.includes('pass'), 'yard has green and red lamps');
  await shot(pg, 'w3-storm-1805.png');
  await pg.evaluate(() => window.__works.scrub(16, 30));
  s = await st(pg);
  ok(s.rainbow, 'rainbow after the real-iPad win at 16:10');
  ok(s.walkers > 0, 'walkers out at 16:30: ' + s.walkers);
  await shot(pg, 'w4-rainbow-1630.png');

  /* lost property: the build 29 builder that stopped at 16:27 on 15 Nov */
  await pg.evaluate(() => window.__works.setDay('2026-11-15'));
  await pg.evaluate(() => window.__works.scrub(21, 0));
  s = await st(pg);
  ok(s.lost >= 1, 'lost property at 21:00 on 15 Nov: ' + s.lost);
  await pg.evaluate(() => window.__works.openCard('lost'));
  await pg.waitForTimeout(1500);
  ok((await pg.textContent('#cBody')).includes('no sign of life since 16:27'), 'lost card names the 16:27 stop');
  await shot(pg, 'w5-lost-property.png');
  await pg.evaluate(() => window.__works.closeCard());
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
  await shot(pg, 'w6-harry-town.png');
  await pg.evaluate(() => window.__works.closeCard());
  await pg.click('#bDay');
  await pg.waitForTimeout(1500);
  await shot(pg, 'w7-daylight.png');
  /* tour */
  await pg.click('#bTour');
  await pg.waitForTimeout(1500);
  ok((await st(pg)).card === 'hut', 'tour starts at the hut');
  await pg.click('#bTour');
  ok(errs.length === 0, 'no page errors (mocked) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 2. phone width ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await mockGitHub(ctx);
  const { pg, errs } = await open(ctx, BASE + '?mode=evening&day=2026-11-16&t=17:20');
  const w = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw: innerWidth }));
  ok(w.sw <= w.iw && w.bw <= w.iw, 'phone: no horizontal scroll (' + w.sw + '/' + w.bw + ' vs ' + w.iw + ')');
  await shot(pg, 'w8-phone.png');
  await pg.evaluate(() => window.__works.openCard('shop'));
  await pg.waitForTimeout(1500);
  const w2 = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok(w2, 'phone: card fits');
  await shot(pg, 'w9-phone-card.png');
  ok(errs.length === 0, 'no page errors (phone) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 3. rate-limited: falls back to the ledger ---- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await mockGitHub(ctx, { limited: true });
  const { pg, errs } = await open(ctx, BASE + '?mode=evening');
  const s = await st(pg);
  ok(s.events > 50 && s.workshops.includes('game/bc-depth'), 'rate-limited: town still built from the ledger');
  ok((await pg.textContent('#src')).includes('rate limit'), 'rate-limited: says so');
  ok(errs.length === 0, 'no page errors (rate-limited) ' + errs.join(' | '));
  await ctx.close();
}

/* ---- 4. once against the real GitHub ---- */
if (LIVE) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const { pg, errs } = await open(ctx, BASE + '?mode=evening');
  await pg.waitForTimeout(3000);
  const s = await st(pg);
  console.log('     live: calls', s.net.calls, 'ok', s.net.ok, 'errors', s.net.errors, 'limited', s.net.limited, 'ledger', s.net.ledgerFrom, 'workshops', s.workshops.join(', '));
  ok(s.net.ok > 0 || s.net.limited, 'live: GitHub answered');
  ok(s.workshops.length > 0, 'live: workshops built');
  await shot(pg, 'w10-live-github.png');
  ok(errs.length === 0, 'no page errors (live) ' + errs.join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
