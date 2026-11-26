/* Sea prototype page test under Chromium software GL (SwiftShader). Run from anywhere:  node test_sea.js [camera|readout|bench|tiers|islands|all]
   Serves games/living-islands over http, drives sea_proto/index.html, fails on any console error or page error. Software numbers mean nothing about a real GPU.
   Needs puppeteer (or puppeteer-core with CHROME_PATH). No downloads. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream' };
let pup; for (const n of ['puppeteer', 'puppeteer-core']) { try { pup = require(n); break; } catch (e) {} }
if (!pup) { try { pup = require(path.join(process.env.PUPPETEER_DIR || '/home/user/gods-eye-view-patch-town/node_modules', 'puppeteer')); } catch (e) { console.error('puppeteer not found'); process.exit(2); } }
const which = process.argv[2] || 'all'; let fails = 0;
function check(n, ok, d) { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '   [' + d + ']' : '')); }
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (f.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('no'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); }); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port + '/sea_proto/index.html';
  const opts = { headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'] };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  const browser = await pup.launch(opts), page = await browser.newPage(); await page.setViewport({ width: 900, height: 600 });
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const open = async q => { await page.goto(base + (q || ''), { waitUntil: 'load' }); await page.waitForFunction('window.__sea&&window.__sea.ready', { timeout: 120000 }); await new Promise(r => setTimeout(r, 600)); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const T = { };
  if (which === 'camera' || which === 'all') {
    await open('?tier=ipad&type=squall&s=0.9');
    const pose = () => page.evaluate(() => { const c = window.__sea.camera.position; return { x: c.x, y: c.y, z: c.z, dist: window.__sea.cam.dist, yaw: window.__sea.cam.yaw, pitch: window.__sea.cam.pitch, tx: window.__sea.cam.tx, tz: window.__sea.cam.tz, free: window.__sea.state.free, floor: window.__sea.camFloor(window.__sea.camera.position.x, window.__sea.camera.position.z) }; });
    const p0 = await pose(), mid = { x: 450, y: 300 };
    await page.mouse.move(mid.x, mid.y); await page.mouse.down(); await page.mouse.move(mid.x + 120, mid.y + 40, { steps: 6 }); await page.mouse.up(); await sleep(300);
    const p1 = await pose(); check('drag orbits (yaw and pitch change)', Math.abs(p1.yaw - p0.yaw) > 0.3 && p1.pitch !== p0.pitch, 'yaw ' + p0.yaw.toFixed(2) + ' to ' + p1.yaw.toFixed(2));
    await page.mouse.move(mid.x, mid.y); await page.mouse.wheel({ deltaY: -400 }); await sleep(300);
    const p2 = await pose(); check('wheel zooms in', p2.dist < p1.dist * 0.7, p1.dist.toFixed(1) + ' to ' + p2.dist.toFixed(1));
    await page.mouse.move(mid.x, mid.y); await page.mouse.down({ button: 'right' }); await page.mouse.move(mid.x + 100, mid.y, { steps: 5 }); await page.mouse.up({ button: 'right' }); await sleep(300);
    const p3 = await pose(); check('right-drag pans the look-at point', Math.hypot(p3.tx - p2.tx, p3.tz - p2.tz) > 0.5, 'moved ' + Math.hypot(p3.tx - p2.tx, p3.tz - p2.tz).toFixed(2) + ' m');
    /* synthetic two-finger pinch with pointer events */
    await page.evaluate(() => { const c = document.getElementById('c'), f = (t, id, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: y, button: 0, bubbles: true, pointerType: 'touch' }));
      f('pointerdown', 1, 400, 300); f('pointerdown', 2, 500, 300); for (let i = 1; i <= 5; i++) { f('pointermove', 1, 400 - i * 20, 300); f('pointermove', 2, 500 + i * 20, 300); } f('pointerup', 1, 300, 300); f('pointerup', 2, 600, 300); });
    await sleep(300); const p4 = await pose(); check('pinch (two touch pointers apart) zooms in', p4.dist < p3.dist * 0.8, p3.dist.toFixed(1) + ' to ' + p4.dist.toFixed(1));
    await page.click('#bFree'); await sleep(200); const f0 = await pose(); check('Free fly toggle on', f0.free === true);
    await page.keyboard.down('w'); await sleep(700); await page.keyboard.up('w'); const f1 = await pose();
    check('W flies forward in free mode', Math.hypot(f1.x - f0.x, f1.z - f0.z) > 2, 'moved ' + Math.hypot(f1.x - f0.x, f1.z - f0.z).toFixed(1) + ' m');
    await page.keyboard.down('ArrowRight'); await sleep(400); await page.keyboard.up('ArrowRight'); const f2 = await pose(); check('arrow key strafes', Math.hypot(f2.x - f1.x, f2.z - f1.z) > 1);
    await page.keyboard.down('e'); await sleep(500); await page.keyboard.up('e'); const f3 = await pose(); check('E goes up', f3.y > f2.y + 1, f2.y.toFixed(1) + ' to ' + f3.y.toFixed(1));
    await page.keyboard.down('q'); await sleep(2500); await page.keyboard.up('q'); const f4 = await pose();
    check('Q down: camera never goes under the wave height plus 0.5 m (storm)', f4.y >= f4.floor - 0.01 && f4.y < f3.y, 'y ' + f4.y.toFixed(2) + ' floor ' + f4.floor.toFixed(2));
    /* speed scales with height: same key time, high vs low */
    await page.evaluate(() => { const c = window.__sea.cam; c.py = 80; }); await sleep(100); const h0 = await pose(); await page.keyboard.down('w'); await sleep(500); await page.keyboard.up('w'); const h1 = await pose();
    await page.evaluate(() => { const c = window.__sea.cam; c.py = 3; }); await sleep(100); const l0 = await pose(); await page.keyboard.down('w'); await sleep(500); await page.keyboard.up('w'); const l1 = await pose();
    const dH = Math.hypot(h1.x - h0.x, h1.z - h0.z), dL = Math.hypot(l1.x - l0.x, l1.z - l0.z); check('fly speed grows with height', dH > dL * 3, 'high ' + dH.toFixed(1) + ' m, low ' + dL.toFixed(1) + ' m');
    await page.click('#bReset'); await sleep(300); const r0 = await pose(); check('Reset camera returns to the framed view', !r0.free && Math.abs(r0.dist - Math.hypot(22, 6)) < 0.5, 'dist ' + r0.dist.toFixed(1));
    await page.click('#bFollow'); await sleep(200); check('Follow boat toggle on', await page.evaluate(() => window.__sea.state.follow));
    check('camera test: no console errors', errs.length === 0, errs.join(' | '));
  }
  await page.close(); await browser.close(); server.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
