/* Pictures from the sea page under software GL. node shots.cjs <outdir> <name:query[@@js to run after load]> ...   e.g.  node shots.cjs ../research/sea_proto_shots max_calm:'tier=max&type=calm&s=0.3&t=20'
   Adds freeze=1 and ui=0. Software GL: the pictures show the look, not the speed. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
let pup; for (const n of ['puppeteer', 'puppeteer-core']) { try { pup = require(n); break; } catch (e) {} }
if (!pup) pup = require('/home/user/gods-eye-view-patch-town/node_modules/puppeteer');
const out = process.argv[2], jobs = process.argv.slice(3);
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port + '/sea_proto/index.html';
  const browser = await pup.launch({ headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1100, height: 620 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  for (const j0 of jobs) { const at = j0.indexOf('@@'), j = at >= 0 ? j0.slice(0, at) : j0, js = at >= 0 ? j0.slice(at + 2) : '', i = j.indexOf(':'), name = j.slice(0, i), q = j.slice(i + 1);
    await page.goto(base + '?freeze=1&ui=0&' + q, { waitUntil: 'load' }); await page.waitForFunction('window.__sea&&window.__sea.ready', { timeout: 120000 });
    await new Promise(r => setTimeout(r, +(process.env.WAIT || 2500)));
    if (js) { await page.evaluate(js); await new Promise(r => setTimeout(r, 1500)); }
    await page.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 80 }); console.log('shot', name); }
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors'); await browser.close(); server.close();
})();
