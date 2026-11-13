/* Run: NODE_PATH=$(npm root -g) node tests/places-test.js */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SHOTS = path.resolve(__dirname, '..', 'shots');
let fails = 0;
function ok(c, m) { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); }
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(URL);
  await pg.evaluate(() => window.__p.ready);
  await pg.evaluate(() => { window.__p.speed = 12; });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: SHOTS + '/p1-places.png' });
  const places = await pg.evaluate(() => window.__p.places.map((p) => ({ id: p.id, name: p.name, areas: p.areas.map((a) => ({ id: a.id, name: a.name, rooms: a.rooms.map((r) => ({ id: r.id, name: r.name, totems: r.totems.map((t) => t.id) })) })), links: p.links.map((l) => l.tag.id) })));
  ok(places.length >= 2, 'two places');
  for (const p of places) {
    for (const a of p.areas) for (const r of a.rooms) {
      const res = await pg.evaluate((x) => window.__p.goTo(x), [p.id, a.id, r.id]);
      ok(res && res.ok !== false, 'walk ' + p.id + '/' + a.id + '/' + r.id);
      let st = await pg.evaluate(() => window.__p.state());
      ok(st.crumbs[0] === p.name && st.crumbs.includes(a.name) && st.crumbs[st.crumbs.length - 1] === r.name, 'crumbs ' + st.crumbs.join(' > '));
      for (const t of r.totems) {
        await pg.evaluate(() => window.__p.showPlaces());
        const s = await pg.evaluate((id) => window.__p.seen(id), t);
        st = await pg.evaluate(() => window.__p.state());
        ok(s.ok && st.loadedRoom === r.id, 'totem ' + t + ' loads ' + r.id);
      }
    }
    for (const tag of p.links) { const s = await pg.evaluate((id) => window.__p.seen(id), tag); ok(s.ok, 'door totem ' + tag); }
  }
  await pg.evaluate(() => window.__p.goTo(['home', 'house']));
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: SHOTS + '/p2-house-map.png' });
  await pg.evaluate(() => window.__p.seen('home:kitchen:mug'));
  await pg.waitForTimeout(900);
  await pg.screenshot({ path: SHOTS + '/p3-totem-seen.png' });
  await pg.evaluate(() => window.__p.goTo(['home', 'shed', 'workshop']));
  await pg.waitForTimeout(900);
  await pg.screenshot({ path: SHOTS + '/p4-shed.png' });
  await pg.evaluate(() => window.__p.goTo(['mumdad', 'house']));
  await pg.waitForTimeout(900);
  await pg.screenshot({ path: SHOTS + '/p5-mum-and-dads.png' });
  ok(errs.length === 0, '0 page errors ' + errs.join('|'));
  await b.close();
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
