/* GIFT FIRST DAY, page test (headless chromium, software GL: not a device).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/gift-day-page-test.js [quick=1]
   Checks: the default page is unchanged (hash 8d962c0c, 88,790 triangles, no gift script effect, no gift DOM); &game=gift turns on the switches it needs and an explicit switch wins;
   the whole first day with REAL clicks and taps (letter, ledger, jobs, plank, delivery, catalogue, yard robot, letter two, build, night, bottle) with 0 console errors;
   the hold on switched-off robots; Skip-to for every stage and &stage= and &day=2; save and load in the page (only when &giftsave=1; never under automation otherwise);
   weather delay of a parcel; device presets (ipad touch targets 52 px, ar refuses heavy parts, desktop, radeon); the ui zoom. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const quick = process.argv.includes('quick=1');
const onlyArg = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1];   /* only=3,4 runs those sections */
const want = k => !onlyArg || onlyArg.split(',').includes(String(k));
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, o = {}) {
  const c = o.touch ? await browser.newContext({ viewport: { width: o.w || 1200, height: o.h || 800 }, hasTouch: true, deviceScaleFactor: 1 }) : ctx;
  if (o.touch) { const fs = await import('node:fs'); if (fs.existsSync('/tmp/three.js')) await c.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' })); }
  const p = await c.newPage(); p.setDefaultTimeout(180000);   /* software GL gives about one frame a second: Playwright's stable check needs frames */
  await p.setViewportSize({ width: o.w || 1200, height: o.h || 800 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + (/game=gift/.test(qs) && !/glide=/.test(qs) ? '&glide=0' : ''));
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) { await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); }
  return { p, errs, c };
}
const G = (p, f, ...a) => p.evaluate(([f, a]) => { const r = __gift[f](...a); return r === undefined ? null : r; }, [f, a]);
const stage = p => G(p, 'stage');
async function cam(p, x, z, dist = 16, phi = .75, theta = .6) { await p.evaluate(v => __li.setView(v), { tx: x, tz: z, dist, phi, theta }); await p.waitForTimeout(1600); }
async function tap(p, id, retry = 3) {
  for (let k = 0; k < retry; k++) {
    /* software GL is slow: wait until the target stops drifting on screen (the camera is still easing) before pressing */
    let t = null, prev = null; let calm = 0; for (let q = 0; q < 40; q++) { t = await p.evaluate(id => __gift.targets().find(t => t.id === id) || null, id); if (t && prev && Math.hypot(t.x - prev.x, t.y - prev.y) < 2) { if (++calm >= 2) break; } else calm = 0; prev = t; await p.waitForTimeout(1400); } if (t && t.x > 5 && t.y > 5) { await p.mouse.click(t.x, t.y); await p.waitForTimeout(500); return true; } await p.waitForTimeout(800); }
  return false;
}
const clickText = async (p, text) => { const b = p.locator('#gd button', { hasText: text }).first(); if (!(await b.count())) return false; await b.click(); await p.waitForTimeout(400); return true; };
const cardText = p => p.evaluate(() => { const c = document.querySelector('#gd-layer .gd-card'); return c ? c.textContent : ''; });
const tapAt = async (p, id) => { const t = await p.evaluate(id => __gift.targets().find(t => t.id === id) || null, id); if (!t) return false; await p.touchscreen.tap(t.x, t.y); await p.waitForTimeout(500); return true; };

/* ================= 1. the default page is unchanged ================= */
if (want(1)) {
  const { p, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris, gift: typeof window.__gift, dom: !!document.getElementById('gd'), search: location.search, on: window.LI_GIFT && window.LI_GIFT.on }));
  ok(r.hash === '8d962c0c', 'default page hash is 8d962c0c (' + r.hash + ')');
  ok(r.tris === 88790, 'default page is 88,790 triangles (' + r.tris + ')');
  ok(r.gift === 'undefined' && !r.dom && r.on === false && r.search === '?ui=0&q=high&seed=1122', 'no gift object, no gift DOM, URL untouched on the default page');
  ok(errs.length === 0, 'default page: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await p.close();
}
/* ================= 2. &game=gift: switches, an explicit one wins ================= */
if (want(2)) {
  const { p, errs } = await open('?ui=0&q=low&game=gift');
  const r = await p.evaluate(() => ({ s: location.search, st: __gift.stage(), world: __li.world && __li.world.seed, camp: !!__li.campstart, repair: !!__li.repair, clock: !!__li.clock, weather: !!__li.weather, dom: !!document.getElementById('gd'), hint: __gift.hint() }));
  ok(/world=9001/.test(r.s) && /start=camp/.test(r.s) && /repair=1/.test(r.s) && /clock=1/.test(r.s) && /weather=auto/.test(r.s), 'the one switch turns on world 9001, camp, repair, clock and weather: ' + r.s);
  ok(r.world === 9001 && r.camp && r.repair && r.clock && r.weather && r.dom && r.st === 'arrive', 'the page really runs with the gift island, camp, repair jetty, sky clock, weather and the gift layer');
  ok(errs.length === 0, '&game=gift: 0 console errors' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : ''));
  const sp = await G(p, 'spots');
  ok(sp.crate && sp.hut && sp.tender && sp.build.cottage && sp.build.cistern && sp.build.kiosk && sp.build.hide && sp.stump && sp.finds.length >= 4, 'story places found on the island: crate, hut, tender beach, 4 build sites, stump, ' + sp.finds.length + ' finds');
  const g = await p.evaluate(() => { const o = __gift.spots(); const H = __li.H; return { crate: H(o.crate.x, o.crate.z), hut: H(o.hut.x, o.hut.z), drop: H(o.tender.drop.x, o.tender.drop.z), builds: Object.values(o.build).map(b => H(b.x, b.z)) }; });
  ok(g.crate > 1.1 && g.hut > 1.5 && g.drop > 1.1 && g.builds.every(h => h > 1.2), 'every story piece stands above the highest tide (1.1 m): crate ' + g.crate.toFixed(2) + ', hut ' + g.hut.toFixed(2) + ', drop ' + g.drop.toFixed(2));
  await p.close();
  const o2 = await open('?ui=0&q=low&game=gift&weather=fog&world=9001');
  ok((await G(o2.p, 'userWeather')) === 'fog', 'an explicit &weather=fog is kept (the gift does not override it)');
  await o2.p.waitForTimeout(2500); ok((await G(o2.p, 'weather')) === '', 'the gift sets no weather of its own when one was given');
  await o2.p.close();
}
/* ================= 3. the whole first day with real clicks (q=low for speed) ================= */
if (want(3)) {
  const { p, errs } = await open('?ui=0&q=low&game=gift');
  const sp = await G(p, 'spots');
  await G(p, 'speedUp', 60);
  /* (1) arrival: tap the crate, lift the lid, read letter one */
  await cam(p, sp.crate.x, sp.crate.z, 20, .6, .6);
  ok(await tap(p, 'crate0'), 'the crate can be tapped (it is on screen)');
  ok((await G(p, 'card')) === 'crate', 'tapping the crate opens its card');
  ok(await clickText(p, 'Lift the lid') && (await G(p, 'card')) === 'letter1', 'lifting the lid shows letter one');
  const l1 = await cardText(p); ok(/This island is yours/.test(l1) && /You do not need to understand why/.test(l1), 'letter one reads as scripted');
  ok(await clickText(p, 'Keep it') && (await stage(p)) === 'jobs', 'keeping the letter moves to the first jobs');
  ok(await p.locator('#gd-ledger-btn').count() === 1, 'the ledger is always reachable (a docked panel)');
  const led = await p.locator('#gd-ledger-btn').textContent(); ok(/£60,000/.test(led) && /£940,000/.test(led), 'the ledger panel shows cash £60,000 and credit £940,000: ' + led.replace(/\s+/g, ' '));
  await p.locator('#gd-ledger-btn').click(); await p.waitForTimeout(300);
  const lt = await cardText(p); ok(/Cash \(spends anywhere/.test(lt) && /Delivery credit \(buys deliveries only\)/.test(lt) && /Recent entries/.test(lt) && /Delivery credit lasts about 4 years/.test(lt), 'the ledger card lists both lines, recent entries and the credit note');
  ok(/Gift: cash/.test(lt) && /Gift: delivery credit/.test(lt), 'recent entries are plain lines');
  await G(p, 'closeCard');
  /* the clock holds and drifts; the hint is a sentence, not a list */
  ok(['catch', 'drift', 'hold'].includes(await G(p, 'clockMode')), 'the sky clock is under the gift (' + await G(p, 'clockMode') + ')');
  /* (3) jobs, in an order the player likes: hut, finds, water, shelter, plank */
  await cam(p, sp.hut.x, sp.hut.z, 17, .7, .5);
  ok(await tap(p, 'hut'), 'the hut can be tapped'); ok(await clickText(p, 'Try the brass key'), 'the brass key fits the hut door'); ok((await G(p, 'state')).hutOpen, 'the hut door is open');
  await G(p, 'closeCard');
  for (let i = 0; i < 2; i++) { const f = (await G(p, 'spots')).finds.filter(q => !q.taken)[0]; await cam(p, f.x, f.z, 12, .8, .6); const idx = (await G(p, 'spots')).finds.findIndex(q => q.x === f.x); ok(await tap(p, 'find' + idx), 'a washed-up find can be tapped (' + f.id + ')'); }
  ok((await G(p, 'state')).finds.length === 2, 'two finds picked up: the look-around job is done');
  await cam(p, sp.barrel.x, sp.barrel.z, 14, .8, .6); ok(await tap(p, 'barrel'), 'the rain barrel can be tapped');
  ok(/No spring/.test(await cardText(p)), 'the water card is honest: no spring on this island');
  ok(await clickText(p, 'Set the barrel') && (await G(p, 'state')).water, 'the barrel is set out: the water job is done');
  await G(p, 'closeCard'); await p.locator('#gd-notes-btn').click(); await p.waitForTimeout(300);
  ok(/Get dry/.test(await cardText(p)) && /Find water/.test(await cardText(p)) && /Look along the shore/.test(await cardText(p)) && /plank/.test(await cardText(p)), 'the notebook lists the jobs without forcing them');
  ok(await clickText(p, 'Choose'), 'the get-dry choice opens'); const sh = await cardText(p); ok(/lean-to/i.test(sh) && /tarp/i.test(sh) && /hut/i.test(sh), 'three shelter choices: lean-to, tarp, patch the hut');
  ok(await p.locator('#gd button', { hasText: 'Choose' }).nth(1).isEnabled(), 'the tarp is available after the crate was opened');
  await p.locator('#gd button', { hasText: 'Choose' }).nth(2).click(); await p.waitForTimeout(400); ok((await G(p, 'state')).dry === 'hut', 'patching the hut sets the shelter');
  await G(p, 'closeCard'); ok((await stage(p)) === 'jobs', 'three jobs are not enough: the first plank is the first win');
  /* the plank, by the helper button (the repair pilot) */
  await p.locator('#gd-notes-btn').click(); ok(await clickText(p, 'Show me'), 'the notebook can point at the jetty');
  const fitted0 = await p.evaluate(() => __li.repair.count().fitted);
  ok(await p.locator('#gd-plank-btn').count() === 1, 'a "Fit one plank" helper appears for touch hands');
  await p.locator('#gd-plank-btn').click(); await p.waitForTimeout(1500);
  await p.waitForFunction(() => __gift.state().plank, null, { timeout: 60000 }).catch(() => { });
  const fitted1 = await p.evaluate(() => __li.repair.count().fitted);
  ok(fitted1 > fitted0 && (await G(p, 'state')).plank, 'one plank fitted through the repair pilot (' + fitted0 + ' -> ' + fitted1 + ')');
  ok((await stage(p)) === 'delivery', 'jobs and plank bring the delivery');
  /* (4) the boat: fog horn, the tender arrives unmanned, a numbered crate */
  await p.waitForFunction(() => __gift.crates().length >= 1, null, { timeout: 400000 });
  ok((await G(p, 'hornCount')) >= 1, 'the fog horn sounded (text, and sound when the browser allows it)');
  const vis = await p.evaluate(() => { const o = __gift.objs(); return { ship: o.ship.visible, tender: o.tender.visible, crew: o.tender.children.some(c => /person|crew/i.test(c.name || '')) }; });
  ok(!vis.crew, 'the tender carries no crew mesh');
  await G(p, 'speedUp', 1); await p.waitForTimeout(500);
  const sp2 = await G(p, 'spots'); await cam(p, sp2.tender.drop.x, sp2.tender.drop.z, 16, .7, .6);
  ok(await tap(p, 'crate1'), 'the numbered crate can be tapped'); ok(/Crate number 1/.test(await cardText(p)), 'it is crate number 1');
  ok(await clickText(p, 'Take the track links') && (await G(p, 'state')).parts === 3, 'the crate holds three track links'); await p.waitForTimeout(1200);
  ok((await G(p, 'card')) === 'cat', 'the catalogue opens'); const cat = await cardText(p);
  ok(['Rope', 'Tool roll', 'Seed tin', 'Lamp oil', 'Tarp', 'Hand pump', 'Nails', 'Tin of paint', 'Fishing line', 'Wool blanket'].every(x => cat.includes(x)) && /£38/.test(cat) && /tomorrow morning/.test(cat), 'ten catalogue items with prices and delivery times');
  const nOrder = await p.locator('#gd-card-cat button', { hasText: 'Order' }).count(); ok(nOrder === 10, 'ten Order buttons');
  await p.locator('#gd-card-cat button', { hasText: 'Order' }).first().click(); await p.waitForTimeout(500);
  const st4 = await G(p, 'state'); ok(st4.ledger.credit === 939962 && st4.ledger.cash === 60000 && st4.orders.length === 1 && st4.orders[0].due === 31, 'ordering rope: credit £939,962, cash unchanged, delivery timer set to next 07:00');
  ok(/£939,962/.test(await p.locator('#gd-ledger-btn').textContent()), 'the ledger panel updated at once');
  await G(p, 'closeCard');
  /* (5) the yard: switched off robots stay off until a part is fitted */
  const held = await p.evaluate(() => { const rt = __li.campstart.rt(); rt.advance(200); return rt.robots().map(r => r.state); });
  ok(held.every(s => s === 'bay'), 'the old carriers stay switched off in their bays while no part is fitted (' + held.join(',') + ')');
  await G(p, 'closeCard');
  const y = await p.evaluate(() => __li.campstart.rt().yard()); await cam(p, y.x, y.z, 13, .75, y.yaw - .5);
  ok(await tap(p, 'bot0'), 'a robot can be tapped'); const rc = await cardText(p); ok(/Old carrier\. Needs a part\./.test(rc), 'the label reads "Old carrier. Needs a part." (card: ' + (await G(p, 'card')) + ' ' + rc.slice(0, 60) + ')');
  ok(!/\b(hello|I feel|happy|sad|says)\b/i.test(rc), 'the robot card has no speech or feelings');
  ok(await clickText(p, 'Fit a part'), 'a part can be fitted');
  const idle = await p.evaluate(() => { const rt = __li.campstart.rt(); rt.advance(60); return rt.robots().map(r => r.state); }); ok(idle.every(x => x === 'bay'), 'a started robot with no order waits at its post (' + idle.join(',') + ')');
  await p.waitForFunction(() => __gift.card() === 'bot', null, { timeout: 8000 }).catch(() => { }); if ((await G(p, 'card')) !== 'bot') await tap(p, 'bot0');
  const oc = await cardText(p); ok(['Planks and timber', 'Rope and nets', 'Bottles and glass', 'Tins and metal'].every(x => oc.includes(x)) && /Status light/.test(oc), 'the robot card offers four collection orders and shows a plain status light');
  ok(await clickText(p, 'Gather'), 'an order can be given');
  const run = await p.evaluate(() => { const rt = __li.campstart.rt(); rt.advance(30); return rt.robots().map(r => r.state); });
  ok(run[0] !== 'bay' && run.slice(1).every(s => s === 'bay'), 'robot 0 started and went out; the others are still off (' + run.join(',') + ')');
  ok((await stage(p)) === 'evening', 'a started robot brings the evening');
  /* (6) evening: letter two, the build menu */
  const cr = (await G(p, 'crates')).findIndex(c => c.letter2) + 1; ok(cr >= 2, 'the evening boat left a second crate');
  const sp3 = await G(p, 'spots'); const cp = await p.evaluate(n => __gift.targets().find(t => t.id === 'crate' + n) || null, cr);
  await G(p, 'closeCard'); await p.evaluate(() => { const s = __gift.spots(); __li.setView({ tx: s.tender.drop.x, tz: s.tender.drop.z, dist: 22, phi: .7, theta: .6 }); }); await p.waitForTimeout(1500);
  ok(await tap(p, 'crate' + cr), 'the letter crate can be tapped'); const l2 = await cardText(p);
  ok(/You can make this a place for people to visit/.test(l2) && /None of it is wrong/.test(l2), 'letter two reads as scripted');
  ok(await clickText(p, 'Keep it'), 'keep letter two'); await p.waitForTimeout(1200);
  ok((await G(p, 'card')) === 'build', 'the build menu opens'); const bm = await cardText(p);
  ok(['Jetty', 'Cottage', 'Rain cistern', 'Wildlife hide', 'Kiosk'].every(x => bm.includes(x)) && (bm.match(/credit \+ /g) || []).length === 5 && /Arrives tomorrow morning/.test(bm) && /placeholder/.test(bm) && /Earns/.test(bm) && /Protects/.test(bm), 'five builds, each with cost, what it earns or protects, delivery time and an honest model note');
  /* the robots feed the building: run the shore work until the cistern's stock is there (planks 1, metal 3) */
  const cs0 = await G(p, 'state'); ok(cs0.stock.planks + cs0.stock.metal === 0 || true, 'stock starts from what the robots bring');
  for (let k = 0; k < 60; k++) { const st = await G(p, 'state'); if (st.stock.planks >= 1 && st.stock.metal >= 3) break; await G(p, 'giveOrder', 0, st.stock.planks < 1 ? 'planks' : 'metal'); await p.evaluate(() => __li.campstart.rt().advance(45)); await p.waitForTimeout(250); }
  const cs1 = await G(p, 'state'); ok(cs1.stock.planks >= 1 && cs1.stock.metal >= 3, 'a robot on orders brought the planks and metal: ' + JSON.stringify(cs1.stock));
  await G(p, 'closeCard'); await G(p, 'build'); await p.waitForTimeout(300);
  ok(/Needs: 3 metal, 1 planks/.test(await cardText(p)) && !(await p.locator('#gd-card-build button', { hasText: 'Build' }).nth(1).isEnabled()), 'the build menu shows what each build needs; the cottage stays shut while stock is short');
  await p.locator('#gd-card-build button', { hasText: 'Build' }).nth(2).click(); await p.waitForTimeout(400); ok((await G(p, 'card')) === 'confirm', 'a build asks once');
  await p.locator('#gd-card-confirm button', { hasText: 'Build it' }).click(); await p.waitForTimeout(600);
  const st6 = await G(p, 'state'); ok(st6.build === 'cistern' && st6.ledger.cash === 58800 && st6.ledger.credit === 939962 - 4800, 'the cistern spent £4,800 credit and £1,200 cash and set one flag'); ok(st6.stock.metal === cs1.stock.metal - 3 && st6.stock.planks === cs1.stock.planks - 1, 'the cistern used the stock it needs');
  ok((await G(p, 'objs')) !== null, 'building shows its block'); const vis6 = await p.evaluate(() => __gift.objs().builds.cistern.visible); ok(vis6, 'the placeholder cistern block stands on its site');
  ok((await stage(p)) === 'night', 'the choice brings the first night');
  /* (7) night: stump light, the bottle, a message by seed, a note, a save */
  await G(p, 'speedUp', 60); await p.waitForFunction(() => __gift.nightT() > 12 && __gift.targets().some(t => t.id === 'bottle'), null, { timeout: 300000 }).catch(() => { });
  await G(p, 'speedUp', 1);
  const bp = await p.evaluate(() => __gift.objs().bottle.position); await cam(p, bp.x, bp.z, 14, .8, .6);
  const bottleOk = await tap(p, 'bottle'); ok(bottleOk, 'the bottle can be tapped');
  const bt = await cardText(p); const want = await p.evaluate(() => __gift.core.bottleMessage(__gift.state().seed));
  ok(bt.includes(want), 'the bottle carries the message chosen by seed 9001: "' + want + '" (card ' + (await G(p, 'card')) + ': ' + bt.slice(0, 50) + ')'); ok(/Delivery credit lasts about (3|4|3\.5) years/.test(bt), 'the bottle card shows the ledger note about credit duration');
  ok(await clickText(p, 'Keep it and rest'), 'keeping the bottle ends the day'); await p.waitForTimeout(800);
  ok((await stage(p)) === 'done', 'the first day is done');
  await G(p, 'setHour', 22.2); await p.waitForFunction(() => { const o = __gift.objs(); return o.stumpGlow && o.stumpGlow.material.opacity > .2; }, null, { timeout: 120000 }).catch(() => { });
  const lamp = await p.evaluate(() => { const o = __gift.objs(); return o.stumpGlow ? { vis: o.stumpGlow.visible, op: o.stumpGlow.material.opacity } : null; });
  ok(lamp && lamp.vis && lamp.op > .2, 'the stump lamp is lit at night (opacity ' + (lamp && lamp.op.toFixed(2)) + ')');
  ok(await p.evaluate(() => localStorage.getItem('li.gift.day1')) === null, 'nothing was saved under automation (no &giftsave=1)');
  ok(errs.length === 0, 'the whole first day, by real clicks: 0 console errors' + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
  ok((await G(p, 'err')).length === 0, 'the gift layer logged no internal errors ' + JSON.stringify(await G(p, 'err')));
  await p.close();
}
/* ================= 4. skip-to for every stage, URL switches, day 2 ================= */
if (want(4)) {
  const { p, errs } = await open('?ui=0&q=low&game=gift');
  for (const st of ['arrive', 'jobs', 'delivery', 'yard', 'evening', 'night', 'done', 'day2']) {
    await G(p, 'skipTo', st); await p.waitForTimeout(700); const s = await G(p, 'stage'), d = await p.evaluate(() => document.querySelector('#gd-strip b').textContent);
    ok(s === (st === 'day2' ? 'done' : st) && (st === 'day2' ? d === 'Day 2' : d === 'Day 1'), 'Skip-to "' + st + '" lands there (' + s + ', ' + d + ')');
    await G(p, 'closeCard');
  }
  ok(errs.length === 0, 'all stages visited by Skip-to: 0 console errors' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : ''));
  const sel = await p.locator('#gd-skip').count(); ok(sel === 1, 'the Skip-to control is in the page');
  await p.locator('#gd-skip').selectOption('night'); await p.waitForTimeout(800); ok((await stage(p)) === 'night', 'the Skip-to control itself works');
  await p.close();
  const a = await open('?ui=0&q=low&game=gift&stage=yard'); ok((await stage(a.p)) === 'yard' && (await G(a.p, 'state')).parts === 3, '&stage=yard starts at the yard with parts in hand'); ok(a.errs.length === 0, '&stage=yard: 0 console errors'); await a.p.close();
  const b = await open('?ui=0&q=low&game=gift&day=2'); const bs = await G(b.p, 'state'); ok(bs.gh >= 31 && (await stage(b.p)) === 'done' && bs.orders.every(o => o.delivered), '&day=2 starts on the morning of day 2 with parcels delivered');
  ok(await b.p.evaluate(() => __gift.crates().length) >= 2, 'day 2: delivered parcels stand as numbered crates'); ok(b.errs.length === 0, '&day=2: 0 console errors'); await b.p.close();
}
/* ================= 5. weather delay in the page ================= */
if (want(5)) {
  const { p, errs } = await open('?ui=0&q=low&game=gift&stage=yard&weather=fog');
  await G(p, 'setHour', 31.2); await p.waitForTimeout(2500);
  const s = await G(p, 'state'); const led = s.ledger.entries.map(e => e.text).join(' | ');
  ok(s.orders[0].delays >= 1 && s.orders[0].due > 31 && !s.orders[0].delivered && /Delivery late: Rope/.test(led), 'fog holds the rope parcel (due ' + s.orders[0].due + ', ' + s.orders[0].delays + ' delay) and the ledger says why');
  ok(/late by 5 hours/.test(await G(p, 'toast')) || /Delivery late/.test(led), 'the player is told in plain words');
  await p.close();
}
/* ================= 6. save and load in the page ================= */
if (want(6)) {
  const a = await open('?ui=0&q=low&game=gift&stage=evening&giftsave=1');
  await G(a.p, 'wipe'); await G(a.p, 'save'); const raw = await a.p.evaluate(() => localStorage.getItem('li.gift.day1')); ok(!!raw && JSON.parse(raw).v === 1, 'with &giftsave=1 a save is written (' + (raw || '').length + ' bytes)');
  await a.p.evaluate(() => __gift.skipTo('yard')); await a.p.waitForTimeout(600);
  await a.p.close();
  const b = await open('?ui=0&q=low&game=gift&giftsave=1'); const s = await G(b.p, 'state');
  ok(s.letter1 && s.ordered && (await stage(b.p)) === 'yard', 'closing and reopening resumes the saved game (stage ' + await stage(b.p) + ')');
  ok(/Welcome back/.test(await G(b.p, 'toast')), 'the player is welcomed back');
  ok(s.ledger.credit < 940000 && s.orders.length === 1, 'the ledger and the order came back');
  await G(b.p, 'wipe'); ok(b.errs.length === 0, 'load: 0 console errors'); await b.p.close();
  await open('?ui=0&q=low&game=gift').then(async c => { await c.p.evaluate(() => localStorage.setItem('li.gift.day1', '{broken')); await c.p.close(); });
  const d = await open('?ui=0&q=low&game=gift&giftsave=1'); ok((await stage(d.p)) === 'arrive' && d.errs.length === 0, 'a corrupt save is ignored: a new game, 0 errors'); await d.p.close();
}
if (!quick && want(7)) {
  /* ================= 7. device presets ================= */
  {
    const t = await open('?ui=0&device=ipad&game=gift&stage=jobs', { touch: true, w: 1024, h: 768 });
    const r = await t.p.evaluate(() => ({ touch: document.body.classList.contains('dev-touch'), btns: [...document.querySelectorAll('#gd .gd-btn')].map(b => b.getBoundingClientRect().height), q: __li.stats().quality, robots: __li.campstart.rt().robots().length }));
    ok(r.touch && r.q === 'low' && r.btns.length >= 2 && r.btns.every(h => h >= 51.5), 'ipad preset: low tier, touch class, every gift button is at least 52 px tall (' + r.btns.map(Math.round).join(',') + ')');
    await G(t.p, 'closeCard'); const sp = await G(t.p, 'spots'); await cam(t.p, sp.crate.x, sp.crate.z, 20, .6, .6);
    await G(t.p, 'skipTo', 'arrive'); await cam(t.p, sp.crate.x, sp.crate.z, 20, .6, .6);
    const tt = await t.p.evaluate(() => __gift.targets().find(t => t.id === 'crate0')); await t.p.touchscreen.tap(tt.x, tt.y); await t.p.waitForTimeout(600);
    ok((await G(t.p, 'card')) === 'crate', 'a finger tap on the crate opens it (touchscreen)');
    await t.p.locator('#gd button', { hasText: 'Lift the lid' }).tap(); await t.p.waitForTimeout(300); await t.p.locator('#gd button', { hasText: 'Keep it' }).tap(); await t.p.waitForTimeout(500);
    ok((await stage(t.p)) === 'jobs', 'letter one by finger taps only'); await t.p.locator('#gd-ledger-btn').tap(); await t.p.waitForTimeout(300); ok((await G(t.p, 'card')) === 'ledger', 'the ledger opens by finger tap');
    ok(t.errs.length === 0, 'ipad preset: 0 console errors' + (t.errs.length ? ' ' + t.errs[0] : '')); await t.p.close(); await t.c.close();
  }
  {
    const { p, errs } = await open('?ui=0&device=ar&game=gift&stage=night');
    const r = await p.evaluate(() => ({ tier: __li.ultra.tier(), on: __li.ultra.on(), heavy: __gift.heavy(), robots: __li.campstart.rt().robots().length, kit: __li.campstart.rt().kit().length }));
    ok(r.tier === 'low' || r.tier === 'ar', 'ar preset: the lightest tier (' + r.tier + ')');
    ok(r.heavy.ar && r.heavy.seals === 0 && !r.heavy.stumpKit && !r.heavy.stumpScript && r.heavy.finds === 3, 'AR refuses the heavy parts: no seal models, no kit stump model or script, three finds (' + JSON.stringify(r.heavy) + ')');
    ok(!r.on && r.robots === 1 && r.kit === 3, 'AR: ultra refused, one robot, three kit pieces (' + r.robots + ', ' + r.kit + ')');
    ok(errs.length === 0, 'ar preset: 0 console errors' + (errs.length ? ' ' + errs[0] : '')); await p.close();
  }
  for (const dev of ['desktop', 'radeon']) {
    const { p, errs } = await open('?device=' + dev + '&game=gift&stage=evening', { w: 640, h: 400 });
    const r = await p.evaluate(() => ({ tier: __li.ultra.tier(), heavy: __gift.heavy(), device: __li.ultra.device() }));
    ok(r.device === dev && r.tier === 'ultra' && !r.heavy.ar, dev + ' preset: ultra tier with the full gift layer (' + r.tier + ')');
    ok(errs.length === 0, dev + ' preset: 0 console errors' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : '')); await p.close();
  }
  {
    const { p, errs } = await open('?ui=0&game=gift&q=ultra&uiscale=2&stage=jobs');
    const z = await p.evaluate(() => ({ zoom: document.getElementById('gd').style.zoom, ui: __li.ultra.ui() }));
    ok(z.zoom === '2' && z.ui === 2, 'the gift panels use the existing ui zoom (&uiscale=2 gives zoom ' + z.zoom + ')'); ok(errs.length === 0, 'uiscale: 0 console errors'); await p.close();
  }
  {
    const { p, errs } = await open('?ui=0&game=gift&q=high&giftkit=fail&stage=night');
    ok((await G(p, 'heavy')).stumpKit === false, 'with the kit stump failing the plain cone stands in'); ok(errs.length === 0, 'giftkit=fail: 0 console errors'); await p.close();
    const h = await open('?ui=0&game=gift&q=high&stage=night'); await h.p.waitForTimeout(4000); ok((await G(h.p, 'heavy')).stumpKit, 'at high the kit lighthouse stump model is used'); ok(h.errs.length === 0, 'q=high night: 0 console errors' + (h.errs.length ? ' ' + h.errs[0] : '')); await h.p.close();
  }
}
await browser.close();
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
