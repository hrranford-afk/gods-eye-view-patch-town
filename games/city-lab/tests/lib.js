/* Shared helpers for the page tests: a static server on localhost for the games folder (so ../sofa-siege/ resolves exactly as on gh-pages),
   a headless Chromium with software GL, and the three.js r128 file served locally in place of the CDN (no network is used). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const GAMES = path.resolve(__dirname, '..', '..');
const THREE_CANDIDATES = [process.env.THREE_PATH,
  path.resolve(GAMES, '..', '.worktrees', 'brick-lab', 'games', 'brick-lab', 'vendor', 'three', 'three.min.js'),
  '/home/user/gods-eye-view-patch-town/.worktrees/brick-lab/games/brick-lab/vendor/three/three.min.js',
  '/home/user/gods-eye-view-patch-town/.worktrees/pages/brick-lab/vendor/three/three.min.js'].filter(Boolean);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.md': 'text/plain', '.wasm': 'application/wasm' };
function threeFile() { for (const f of THREE_CANDIDATES) if (fs.existsSync(f)) return f; throw new Error('no local three.min.js r128 found; set THREE_PATH'); }
function serve(root) {
  root = root || GAMES;
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(root, u);
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve({ srv, base: 'http://127.0.0.1:' + srv.address().port }));
  });
}
async function launch() {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  return browser;
}
async function newPage(browser, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1180, height: 820 } });
  const three = fs.readFileSync(threeFile());
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   /* nothing but localhost */
  await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: three }));   /* later routes win */
  const errs = [];
  page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); }); page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.errs = errs;
  return page;
}
async function open(page, base, query) {
  await page.goto(base + '/city-lab/index.html' + (query || '?auto=0'));
  await page.waitForFunction('window.__done', null, { timeout: 60000 });
}
module.exports = { serve, launch, newPage, open, GAMES };
