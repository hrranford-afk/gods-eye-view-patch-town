/* Repetition score for a picture of the sea page under software GL (research/VARIETY_AND_SALVAGE_PLAN.md, section 3).
   node repeat_score.cjs <outdir> <name> <query> [js to run after load]   e.g.  node repeat_score.cjs ../research/sea_proto_shots open "tier=ipad&type=calm&s=0.3&t=20&salv=600"
   Takes the same picture with variation on (rep=1) and off (rep=0), saves both, and prints two numbers for each:
   DATA  = the share of drawn instances whose signature (kind, variant, scale, heading, tint, wear) was already seen (from the page, salvage.stats().repetition);
   PATCH = the share of textured 16 px patches (std over 0.07, so smooth sea and sky are skipped) whose nearest other patch (8 x 8 normalised grey plus mean colour, at least 32 px away) is closer than 0.30 (THR env overrides).
   Lower is less samey. Software GL: the picture shows the look, not the speed. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
let pup; for (const n of ['puppeteer', 'puppeteer-core']) { try { pup = require(n); break; } catch (e) {} }
if (!pup) pup = require('/home/user/gods-eye-view-patch-town/node_modules/puppeteer');
const out = process.argv[2], name = process.argv[3], q = process.argv[4] || '', js = process.argv[5] || '';
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });
const SCORE = `(async (b64, thr) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
  const P = 16, S = 8, pts = [];
  for (let y = 0; y + P <= H; y += S) for (let x = 0; x + P <= W; x += S) {
    let m = 0, m2 = 0, r = 0, gg = 0, bb = 0; const grey = new Float32Array(P * P);
    for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) { const k = ((y + j) * W + x + i) * 4, R = d[k] / 255, G = d[k + 1] / 255, B = d[k + 2] / 255, l = .3 * R + .59 * G + .11 * B; grey[j * P + i] = l; m += l; m2 += l * l; r += R; gg += G; bb += B; }
    m /= P * P; const sd = Math.sqrt(Math.max(m2 / (P * P) - m * m, 0)); if (sd < .07) continue;
    const v = new Float32Array(67); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { let s = 0; for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) s += grey[(j * 2 + b) * P + i * 2 + a]; v[j * 8 + i] = (s / 4 - m) / sd; }
    v[64] = r / (P * P) * 3; v[65] = gg / (P * P) * 3; v[66] = bb / (P * P) * 3; pts.push({ x, y, v });
  }
  let rep = 0; for (let a = 0; a < pts.length; a++) { let best = 1e9; const A = pts[a]; for (let b = 0; b < pts.length; b++) { if (a === b) continue; const B = pts[b]; if (Math.abs(A.x - B.x) < 32 && Math.abs(A.y - B.y) < 32) continue; let s = 0; for (let k = 0; k < 67; k++) { const e = A.v[k] - B.v[k]; s += e * e; if (s > best * 67) break; } s = Math.sqrt(s / 67); if (s < best) best = s; } if (best < thr) rep++; }
  return { patches: pts.length, score: pts.length ? rep / pts.length : 0 };
})`;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port + '/sea_proto/index.html';
  const browser = await pup.launch({ headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1100, height: 620 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  const res = {};
  for (const rep of [1, 0]) {
    await page.goto(base + '?freeze=1&ui=0&rep=' + rep + '&' + q, { waitUntil: 'load' }); await page.waitForFunction('window.__sea&&window.__sea.ready', { timeout: 120000 });
    await new Promise(r => setTimeout(r, +(process.env.WAIT || 3500))); if (js) { await page.evaluate(js); await new Promise(r => setTimeout(r, 1500)); }
    const buf = await page.screenshot({ type: 'png' }); fs.writeFileSync(path.join(out, name + '_rep' + rep + '.png'), buf);
    const st = await page.evaluate('window.__sea.salvage().stats()'); const sc = await page.evaluate(SCORE + '(' + JSON.stringify(buf.toString('base64')) + ', ' + (process.env.THR || 0.30) + ')');
    res[rep] = { data: st.repetition, drawn: st.drawn, patches: sc.patches, patch: sc.score };
    console.log(name, 'variation ' + (rep ? 'ON ' : 'OFF'), 'drawn ' + st.drawn, 'DATA ' + (st.repetition * 100).toFixed(1) + ' percent', 'PATCH ' + (sc.score * 100).toFixed(1) + ' percent of ' + sc.patches + ' textured patches');
  }
  fs.writeFileSync(path.join(out, name + '_score.json'), JSON.stringify(res, null, 1)); console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors'); await browser.close(); server.close();
})();
