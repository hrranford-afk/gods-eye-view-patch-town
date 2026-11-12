// Build 14: seasons from the date, the season goal strip, the advent calendar, the creature cam, the simple card, pacing.
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/seasons-test.js
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
  const setDate = (d) => ev((d) => { __g.ENV.dateOverride = d; __g.ENV._sk = 0; __g.envUpdate(); return __g.ENV.season + '|' + __g.ENV.seasonKey; }, d);
  // 1. the season from the date, all six
  const cases = [['2026-09-01', 'autumn'], ['2026-11-28', 'autumn'], ['2026-11-29', 'advent'], ['2026-12-26', 'advent'], ['2026-12-27', 'newyear'], ['2027-01-06', 'newyear'], ['2027-01-07', 'winter'], ['2027-02-28', 'winter'], ['2027-03-01', 'spring'], ['2027-05-31', 'spring'], ['2027-06-01', 'summer'], ['2027-08-31', 'summer']];
  let allSeasons = true; for (const [d, s] of cases) { const r = (await setDate(d)).split('|')[0]; if (r !== s) { allSeasons = false; console.log('  ' + d + ' gave ' + r + ', wanted ' + s); } }
  ok('season from a date override across all six seasons', allSeasons);
  ok('Jan 3 belongs to the New Year of the year before', (await setDate('2027-01-03')) === 'newyear|newyear-2026');
  ok('every invented entry is marked as a placeholder', await ev(() => __g.SEASONS.every((q) => q.by === 'CAIRN (placeholder)' && q.events.every((e) => e.by === 'CAIRN (placeholder)')) && __g.ADVENT.length === 24 && __g.ADVENT.every((e) => e.by === 'CAIRN (placeholder)')));
  // 2. the goal strip and its completion
  await setDate('2026-10-15'); await sleep(1500);
  const strip0 = await ev(() => __g.seaStripText(__g.seaProgress()));
  ok('autumn goal strip starts empty (pictures, no digits)', /^(▫️+ ?)+$/.test(strip0.replace(/\s+/g, ' ')) && !/\d/.test(strip0), JSON.stringify(strip0));
  await ev(() => { __g.seaPlace('leafpile', true); __g.seaPlace('leafpile', true); __g.seaPlace('plantern', true); });
  const strip1 = await ev(() => __g.seaStripText(__g.seaProgress()));
  ok('the strip fills in as decorations are built', strip1.split('🍂').length - 1 === 2 && strip1.split('🏮').length - 1 === 1, strip1);
  await sleep(500); await p.screenshot({ path: OUT + '44-autumn-goal.png' });
  await ev(() => { __g.seaPlace('leafpile', true); __g.seaPlace('supper', true); for (let i = 0; i < 4; i++) __g.seaPlace('plantern', true); __g.seaPlace('calendar', true); });
  await sleep(2500);
  const done = await ev(() => ({ done: __g.SEA.done[__g.ENV.seasonKey], album: __g.FUN.album.some((e) => e.id === 'sea-' + __g.ENV.seasonKey), unl: __g.SEA.unl[__g.ENV.seasonKey], special: __g.mainSettlement().things.some((t) => t.kind === 'scarecrow' && t.built), banner: document.getElementById('banner').textContent }));
  ok('completing the goal: milestone, album entry, special decoration unlocked and placed', done.done && done.album && done.unl === 'scarecrow' && done.special, JSON.stringify(done));
  ok('the milestone credits Harry', /Harry/.test(await ev(() => __g.MILESTONES['sea-' + __g.ENV.seasonKey].join(' '))));
  // 3. advent calendar
  await ev(() => { __g.ENV.dateOverride = '2026-11-20'; __g.ENV._sk = 0; __g.envUpdate(); }); await sleep(2500);
  ok('the calendar survives from autumn into Advent', await ev(() => __g.advCalendars().length === 1));
  ok('before 29 Nov: a countdown in days, no door can open', await ev(() => { const i = __g.advInfo(); return i.daysToStand === 9 && !i.standing && !__g.advCanOpen(1); }));
  await ev(() => { __g.ENV.dateOverride = '2026-12-01'; __g.ENV._sk = 0; __g.envUpdate(); }); await sleep(2500);
  const d1 = await ev(() => Array.from({ length: 24 }, (_, i) => __g.advCanOpen(i + 1)));
  ok('1 Dec: door 1 can open, 2 to 24 cannot', d1[0] && d1.slice(1).every((x) => !x), d1.filter(Boolean).length + ' open-able');
  await ev(() => { __g.ENV.dateOverride = '2026-12-05'; __g.ENV._sk = 0; __g.envUpdate(); });
  const d5 = await ev(() => Array.from({ length: 24 }, (_, i) => __g.advCanOpen(i + 1)));
  ok('5 Dec, none opened: doors 1 to 5 can open, 6 to 24 cannot', d5.slice(0, 5).every(Boolean) && d5.slice(5).every((x) => !x));
  await ev(() => { __g.calUi(); }); await sleep(300); await p.screenshot({ path: OUT + '45-advent-calendar.png' });
  const opened = await ev(() => [1, 2, 3, 4, 5].map((n) => __g.advOpen(n)));
  ok('opening five doors at once works and queues the gifts', opened.every(Boolean) && (await ev(() => __g.SEA.q.length)) >= 4);
  for (let i = 0; i < 120; i++) { if ((await ev(() => __g.SEA.q.length)) === 0) break; await sleep(1000); } ok('the queued gifts play one after another and drain', (await ev(() => __g.SEA.q.length)) === 0);
  ok('an opened door cannot be opened again', !(await ev(() => __g.advOpen(1))));
  await ev(() => { document.getElementById('modal').hidden = true; });
  // save and reload
  const saved = await ev(() => { __g.persist(true); const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); return { adv: s.seas && s.seas.adv, done: s.seas && s.seas.done, cal: s.settlements.some((q) => q.things.some((t) => t.kind === 'calendar' && t.sea === 'advent-2026')) }; });
  ok('the save has opened doors, goal flags and tagged decorations', saved.adv && saved.adv['2026'] && saved.adv['2026'].length === 5 && saved.done && Object.keys(saved.done).length >= 1 && saved.cal, JSON.stringify(saved.adv));
  await ev(() => { __g.seaLoad(JSON.parse(localStorage.getItem('base-camp-save-v2')).seas); });
  ok('loading it back restores the doors', await ev(() => __g.advList().length === 5 && __g.advState(1) === 'open' && __g.advState(6) === 'locked'));
  ok('an old save without seasons loads clean', await ev(() => { __g.seaLoad(undefined); const r = __g.advList().length === 0; return r; }));
  await ev(() => { __g.seaLoad(JSON.parse(localStorage.getItem('base-camp-save-v2')).seas); });
  // 4. creature cam
  await setDate('2026-10-15'); await sleep(1500);
  await ev(() => { const c = __g.G.settlements[0].cols[0]; __g.camOpen(c); }); await sleep(900);
  const cam = await ev(() => { const s = __g.ccamRender(true); return { on: __g.CCAM.on, n: __g.CCAM.rendered, s, name: document.getElementById('ccamName').textContent, mood: document.getElementById('ccamMood').textContent, doing: document.getElementById('ccamDoing').textContent, who: __g.CCAM.c.name }; });
  ok('creature cam opens with name, mood face and activity', cam.on && cam.name === cam.who && cam.mood.length > 0 && cam.doing.length > 3, JSON.stringify([cam.name, cam.mood, cam.doing]));
  ok('creature cam really renders (colours inside the inset)', cam.n > 2 && cam.s && cam.s.colours >= 3 && cam.s.opaque > 20, JSON.stringify(cam.s));
  await sleep(500); await p.screenshot({ path: OUT + '46-creature-cam.png' });
  await p.click('#ccam'); await sleep(200);
  ok('one tap closes the creature cam', await ev(() => !__g.CCAM.on && document.getElementById('ccam').hidden));
  const n0 = await ev(() => __g.CCAM.rendered); await sleep(600); ok('nothing is drawn while it is closed', (await ev(() => __g.CCAM.rendered)) === n0);
  // 5. the simple card
  await ev(() => { __g.G.cardMore = false; document.getElementById('card')._h = ''; __g.cardUi(); });
  const card = await ev(() => document.getElementById('card').textContent);
  ok('the card has no growth or m2 text until Details', !/x0\.|x1\.|m²|growth|sun \d/.test(card), JSON.stringify(card.slice(0, 120)));
  await p.click('#card button[data-more]'); await sleep(300);
  ok('Details shows the numbers', /m²/.test(await ev(() => document.getElementById('card').textContent)) && /growth x/.test(await ev(() => document.getElementById('card').textContent)));
  await p.click('#card button[data-more]'); await sleep(200);
  // 6. pacing (a day cycle driven from here, alone)
  const stats = () => ev(() => { const A = __g.G.settlements.filter((s) => !s.lost), cols = A.flatMap((s) => s.cols); return { settlements: A.length, pop: cols.length, huts: A.reduce((a, s) => a + s.things.filter((t) => t.kind === 'hut' && t.built).length, 0), mood: +(cols.reduce((a, c) => a + c.needs.joy, 0) / Math.max(1, cols.length)).toFixed(2), wood: A.reduce((a, s) => a + s.stock.wood, 0), food: A.reduce((a, s) => a + s.stock.food, 0), decor: A.reduce((a, s) => a + s.things.filter((t) => t.built && __g.DECOR[t.kind]).length, 0) }; });
  await ev(() => { __g.ENV.hourOverride = 9; }); let t = 0; const pace = {};
  for (const target of [1800, 9000]) { while (t < target) { await ev((a) => { __g.ENV.hourOverride = (9 + a / 3600) % 24; __g.envUpdate(); __g.simulate(60); }, t); t += 60; } pace[target] = await stats(); console.log('pace', target / 60, 'min', JSON.stringify(pace[target])); }
  ok('pacing: 30 min alone has settlers and huts', pace[1800].pop >= 5 && pace[1800].huts >= 2);
  ok('pacing: 2.5 h alone is not a stall (mood up, settlers and huts kept growing)', pace[9000].mood >= 0.4 && pace[9000].pop >= pace[1800].pop && pace[9000].huts >= pace[1800].huts);
  ok('pacing: the colony has decorated or spread by itself', pace[9000].decor >= 2 || pace[9000].settlements >= 2);
  // phone card shot
  await p.setViewportSize({ width: 390, height: 844 }); await ev(() => { __g.ENV.dateOverride = '2026-10-15'; __g.ENV._sk = 0; __g.envUpdate(); __g.G.cardMore = false; }); await sleep(1200);
  await p.screenshot({ path: OUT + '47-card-simple.png' });
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  console.log(res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
