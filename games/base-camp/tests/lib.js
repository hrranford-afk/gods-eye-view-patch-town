// Shared test helpers: a tiny static server for games/base-camp (so the council JSON files really load), and a Playwright launcher.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.BC_ROOT || path.join(__dirname, '..'); // BC_ROOT: serve a copy of the game folder (lets a long run keep going while the game is edited)
const TYPES = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript' };
function serve(port) {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+$/, '/index.html'));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(port || 0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/index.html' })));
}
async function launch(opts) {
  const { chromium } = require('playwright'); opts = opts || {};
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: opts.ua });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  return { b, ctx, p, errs };
}
module.exports = { serve, launch, ROOT };
