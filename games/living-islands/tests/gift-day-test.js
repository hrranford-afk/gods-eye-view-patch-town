/* GIFT FIRST DAY, pure node test: ledger arithmetic, the catalogue, delivery timing and weather delay, the build menu, save and load round trip,
   the bottle message by seed, finds, stages, canned states, tone rails on the text.
   Run: node games/living-islands/tests/gift-day-test.js */
await import('../gift_day.js');
const K = globalThis.LI_GIFT.core;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : '  got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)));

/* ---- money format and the opening ledger ---- */
eq([K.pound(60000), K.pound(940000), K.pound(1000000), K.pound(38), K.pound(-1800)], ['£60,000', '£940,000', '£1,000,000', '£38', '-£1,800'], 'pound sign and thousands commas');
let L = K.newLedger();
ok(L.cash === 60000 && L.credit === 940000 && L.cash + L.credit === 1000000, 'opening ledger: cash £60,000, credit £940,000, total £1,000,000');
eq(K.recent(L, 5).length, 2, 'two opening entries');
ok(/£60,000 cash/.test(K.recent(L, 5)[1]) && /£940,000 credit/.test(K.recent(L, 5)[0]), 'entries read in plain words with pound signs: ' + K.recent(L, 5)[0]);

/* ---- spending: exact arithmetic, never negative, old ledger untouched ---- */
let r = K.spend(L, { credit: 1800, text: 'Test' }, 12);
ok(r.ok && r.ledger.credit === 938200 && r.ledger.cash === 60000, 'spending £1,800 credit leaves £938,200 credit and cash unchanged (the script example)');
ok(L.credit === 940000 && L.entries.length === 2, 'the old ledger is not changed');
r = K.spend(L, { cash: 60001 }, 1); ok(!r.ok && /cash/i.test(r.why), 'cannot spend more cash than you have: ' + r.why);
r = K.spend(L, { credit: 940001 }, 1); ok(!r.ok && /credit/i.test(r.why), 'cannot spend more credit than you have');
r = K.spend(L, { cash: -5 }, 1); ok(!r.ok, 'negative spends are refused');
r = K.spend(L, { cash: NaN }, 1); ok(!r.ok, 'NaN spends are refused');
r = K.spend(L, { cash: 60000, credit: 940000, text: 'Everything' }, 2); ok(r.ok && r.ledger.cash === 0 && r.ledger.credit === 0, 'spending exactly everything is allowed and lands on zero');
let M = L; for (let i = 0; i < 100; i++) { const q = K.spend(M, { cash: 7, credit: 31 }, i); M = q.ledger; }
ok(M.cash === 60000 - 700 && M.credit === 940000 - 3100 && M.spentCash === 700 && M.spentCredit === 3100, 'a hundred small spends add up exactly (no drift): ' + M.cash + ' / ' + M.credit);
ok(M.cash + M.spentCash === 60000 && M.credit + M.spentCredit === 940000, 'cash plus spent cash is always the start (conservation)');

/* ---- credit duration note ---- */
ok(K.creditNote(L, 5.3) === 'Delivery credit lasts about 4 years at this pace.', 'untouched credit: "about 4 years": ' + K.creditNote(L, 5.3));
const big = K.spend(L, { credit: 73000, text: 'Cottage' }, 20).ledger;
ok(/about (3|3\.5) years/.test(K.creditNote(big, 21)), 'after a cottage the note shortens: ' + K.creditNote(big, 21));
const huge = K.spend(L, { credit: 900000, text: 'Too much' }, 20).ledger;
ok(/almost used|about a year/.test(K.creditNote(huge, 21)), 'nearly spent credit gives a firm note: ' + K.creditNote(huge, 21));
ok(K.creditYears(big, 21) < K.creditYears(L, 21), 'spending shortens the years');
ok(K.creditYears(big, 21 + 24 * 400) > K.creditYears(big, 21), 'a long quiet time spreads a one-off spend (the pace window)');

/* ---- the catalogue ---- */
eq(K.CATALOGUE.length, 10, 'ten catalogue items');
const want = ['rope', 'tools', 'seeds', 'oil', 'tarp', 'pump', 'nails', 'paint', 'line', 'blanket'];
eq(K.CATALOGUE.map(c => c.id), want, 'the ten asked for: rope, tools, seed tin, lamp oil, tarp, hand pump, nails, paint, fishing line, blanket');
ok(K.CATALOGUE.every(c => c.price > 0 && c.price < 1000 && c.name && c.use), 'all prices are small and every item has a name and a use');
ok(new Set(K.CATALOGUE.map(c => c.id)).size === 10, 'ids are unique');

/* ---- delivery timing ---- */
eq(K.etaFor(12.5, 0), 31, 'ordered at 12:30 on day 1 arrives at 07:00 on day 2 (hour 31)');
eq(K.etaFor(5.3, 0), 31, 'ordered at dawn arrives next morning too');
eq(K.etaFor(23.9, 0), 31, 'ordered at 23:54 still arrives next morning');
eq(K.etaFor(24.2, 0), 55, 'ordered just after midnight of day 2 arrives the morning of day 3');
eq(K.etaFor(12, 24), 55, 'a heavy item adds a day (hand pump)');
let po = K.placeOrder(L, 'rope', 12.5);
ok(po.ok && po.ledger.credit === 940000 - 38 && po.ledger.cash === 60000 && po.order.due === 31 && !po.order.delivered, 'ordering rope spends £38 credit, not cash, and sets a timer for hour 31');
ok(/Order: Rope/.test(po.ledger.entries.at(-1).text), 'the ledger records the order');
po = K.placeOrder(L, 'nonsense', 1); ok(!po.ok, 'unknown item refused');
const pump = K.placeOrder(L, 'pump', 12.5); ok(pump.order.due === 55, 'the hand pump comes the morning after next');
let o = K.placeOrder(L, 'rope', 12.5).order;
let q = K.resolveDelivery(o, 20, 'clear'); ok(!q.arrived && q.order === o, 'before the time, nothing arrives');
q = K.resolveDelivery(o, 31, 'clear'); ok(q.arrived && q.order.delivered, 'at 07:00 next day in clear weather it arrives');
q = K.resolveDelivery(o, 31, 'fair'); ok(q.arrived, 'fair weather: arrives');
q = K.resolveDelivery(o, 31, 'fog'); ok(!q.arrived && q.delayedBy === 5 && q.order.due === 36, 'fog delays by 5 hours');
q = K.resolveDelivery(o, 31, 'storm'); ok(!q.arrived && q.delayedBy === 24 && q.order.due === 55, 'a storm delays by a day');
q = K.resolveDelivery(o, 31, 'rain'); ok(!q.arrived && q.delayedBy === 3, 'rain delays by 3 hours');
q = K.resolveDelivery(o, 31, 'showers'); ok(!q.arrived && q.delayedBy === 1, 'showers delay by 1 hour');
ok(o.due === 31 && o.delays === 0, 'resolving does not change the old order');
/* delays are capped so a long storm cannot hold a parcel for ever */
let t = 31, od = o, steps = 0; for (; steps < 20; steps++) { const z = K.resolveDelivery(od, t, 'storm'); od = z.order; if (z.arrived) break; t = od.due; }
ok(od.delivered && od.delays === 2 && steps === 2, 'at most two weather delays, then it comes (' + od.delays + ' delays, due ' + od.due + ')');
ok(K.resolveDelivery(od, 999, 'clear').arrived === false, 'a delivered order does not arrive twice');
ok(/tomorrow morning/.test(K.etaText(31, 12.5)) && /the morning after next/.test(K.etaText(55, 12.5)), 'delivery times read in words: ' + K.etaText(31, 12.5));

/* ---- build menu ---- */
eq(K.BUILDS.map(b => b.id), ['jetty', 'cottage', 'cistern', 'hide', 'kiosk'], 'five builds: jetty, cottage, cistern, wildlife hide, kiosk');
ok(K.BUILDS.every(b => b.credit + b.cash === b.total && b.cash === b.total - Math.round(b.total * .8) && b.earns && b.year && b.hours && b.kit), 'each build has cost split, what it earns or protects, the year effect, a delivery time and a model note');
ok(K.BUILDS.every(b => b.cash <= K.START_CASH), 'every build is possible on the opening cash');
let S = K.canned('evening', 1122);
ok(!K.doBuild(S, 'cottage').ok && /Short of stock/.test(K.doBuild(S, 'cottage').why), 'the cottage is refused while the yard stock is short (6 planks of 12)');
ok(K.doBuild(S, 'cistern').ok && K.doBuild(S, 'cistern').state.stock.metal === S.stock.metal - 3, 'the cistern uses 3 metal and 1 plank from the stock');
S = Object.assign({}, S, { stock: { planks: 20, rope: 5, glass: 5, metal: 9 } });
let br = K.doBuild(S, 'cottage'); ok(br.ok && br.state.stock.planks === 8 && br.state.stock.metal === 5, 'the cottage uses 12 planks and 4 metal');
ok(br.ok && br.state.build === 'cottage' && br.state.ledger.credit === S.ledger.credit - 68000 && br.state.ledger.cash === S.ledger.cash - 17000, 'building the cottage spends £68,000 credit and £17,000 cash, and sets one flag');
ok(!K.doBuild(br.state, 'hide').ok && K.doBuild(br.state, 'hide').why, 'a second build is refused: one flag for the year');
ok(S.build === null, 'building does not change the old state');
const poor = Object.assign({}, S, { ledger: Object.assign({}, S.ledger, { cash: 1000 }) }); ok(!K.doBuild(poor, 'cottage').ok, 'not enough cash refuses a build');
ok(K.BUILDS.find(b => b.id === 'jetty').kit.startsWith('real') && K.BUILDS.filter(b => /placeholder/.test(b.kit)).length === 4, 'the build list says honestly which are placeholders (4) and which is real (jetty)');

/* ---- robots: orders, stock, save ---- */
eq(K.STOCKS.map(x => x.id), ['planks', 'rope', 'glass', 'metal'], 'four things to gather: planks and timber, rope and nets, bottles and glass, tins and metal');
ok(Object.keys(K.BUILD_NEEDS).length === 5 && K.BUILDS.every(b => Object.keys(b.needs).length >= 1), 'every build has a stock need');
let rs = K.newState(1); eq(rs.stock, { planks: 0, rope: 0, glass: 0, metal: 0 }, 'stock starts empty');
rs = K.setJob(rs, 0, 'metal'); eq(rs.jobs, ['metal'], 'an order is stored per robot'); eq(K.setJob(rs, 0, 'nonsense').jobs, [null], 'an unknown order clears it');
rs = K.addHaul(rs, 'metal', 3); eq(rs.stock.metal, 3 * K.UNITS_PER_TRIP, 'each trip adds ' + K.UNITS_PER_TRIP + ' units'); ok(K.addHaul(rs, 'metal', 999).stock.metal === K.STOCK_CAP, 'the stock is capped');
ok(K.addHaul(rs, 'planks', 0) === rs && K.addHaul(rs, 'bogus', 2) === rs, 'no trips or an unknown kind changes nothing');
const rl = K.deserialize(K.serialize(K.setJob(Object.assign(K.canned('yard', 3), {}), 0, 'rope'))); ok(rl && rl.jobs[0] === 'rope', 'orders survive a save and load');
const rl2 = K.deserialize(K.serialize(K.addHaul(K.canned('yard', 3), 'planks', 4))); ok(rl2 && rl2.stock.planks === 8, 'stock survives a save and load');
const bad = JSON.parse(K.serialize(K.canned('yard', 3))); bad.stock = { planks: -5, rope: 'x', glass: 1e9, metal: 2 }; bad.jobs = ['zzz', 'planks', 'planks', 'planks', 'planks'];
const rb = K.validState(bad); ok(rb && rb.stock.planks === 0 && rb.stock.rope === 0 && rb.stock.glass === K.STOCK_CAP && rb.jobs.length === 4 && rb.jobs[0] === null, 'a damaged stock or order list is clamped on load');
ok(!/\b(feel|happy|sad|says|smile|face|eyes|hello)\b/i.test(K.STOCKS.map(x => x.name).join(' ') + JSON.stringify(K.BUILDS.map(b => b.needs))), 'robot and stock text has no speech, faces or feelings');

/* ---- bottle by seed ---- */
eq(K.BOTTLES.length, 6, 'six bottle messages');
ok(K.BOTTLES.every(m => m.length > 30 && m.length < 140), 'messages are short and plain');
for (const sd of [1, 7, 1122, 9001, 123456]) ok(K.bottleMessage(sd) === K.bottleMessage(sd) && K.bottleIndex(sd) >= 0 && K.bottleIndex(sd) < 6, 'seed ' + sd + ' gives the same message every time');
const seen = new Set(); for (let sd = 0; sd < 300; sd++) seen.add(K.bottleIndex(sd)); eq(seen.size, 6, 'all six messages are reachable across seeds');
const cnt = new Array(6).fill(0); for (let sd = 0; sd < 3000; sd++) cnt[K.bottleIndex(sd)]++; ok(Math.min(...cnt) > 380, 'the seeds spread the messages evenly: ' + cnt.join(','));
ok(K.bottleMessage(1) !== undefined && K.bottleMessage(9001) === K.bottleMessage(9001 >>> 0), 'unsigned and plain seeds agree');
/* ---- finds by seed ---- */
eq(K.pickFinds(9001, 6), K.pickFinds(9001, 6), 'finds are deterministic by seed');
ok(new Set(K.pickFinds(9001, 6)).size === 6 && new Set(K.pickFinds(5, 6)).size === 6, 'six distinct finds');
ok(K.pickFinds(1, 6).join() !== K.pickFinds(2, 6).join() || K.pickFinds(2, 6).join() !== K.pickFinds(3, 6).join(), 'different seeds can give different finds');

/* ---- stages and hints ---- */
let s = K.newState(9001); eq(K.stageOf(s), 'arrive', 'a new game starts at the arrival');
s.letter1 = true; eq(K.stageOf(s), 'jobs', 'reading the letter opens the jobs');
s.dry = 'tarp'; s.water = true; s.finds = ['rope', 'plank']; eq(K.stageOf(s), 'jobs', 'three jobs alone are not enough: the first plank is the first win');
s.plank = true; eq(K.stageOf(s), 'delivery', 'jobs plus the plank bring the boat');
s.ordered = true; eq(K.stageOf(s), 'yard', 'the first order opens the yard');
s.robots = [false, true]; eq(K.stageOf(s), 'evening', 'a started robot brings the evening');
s.letter2 = true; eq(K.stageOf(s), 'evening', 'letter two alone is not the choice');
s.build = 'hide'; eq(K.stageOf(s), 'night', 'the choice brings the night');
s.bottle = true; eq(K.stageOf(s), 'done', 'the bottle ends the first day');
for (const st of K.STAGES) { const c = K.canned(st, 9001); ok(K.stageOf(c) === st, 'canned state for "' + st + '" lands on that stage'); }
ok(K.progress(K.canned('yard', 1)).filter(p => p.done).length === 3 && K.progress(K.canned('yard', 1)).find(p => p.current).id === 'yard', 'the strip marks three done and the yard current');
ok(K.STAGES.every(st => K.hintFor(K.canned(st, 1)).length > 20), 'every stage has a plain hint');

/* ---- save and load ---- */
for (const st of K.STAGES) {
  const c = K.canned(st, 9001); const txt = K.serialize(c), d = K.deserialize(txt);
  ok(d && JSON.stringify(Object.assign({}, c, { stage: K.stageOf(c) })) === JSON.stringify(d), 'save then load is exact at stage "' + st + '" (' + txt.length + ' bytes)');
}
const c1 = K.canned('night', 9001); c1.orders.push(K.placeOrder(c1.ledger, 'tarp', 14).order); const d1 = K.deserialize(K.serialize(c1));
ok(d1 && d1.orders.length === 2 && d1.ledger.credit === c1.ledger.credit && d1.ledger.cash === c1.ledger.cash && d1.dial.creditThin.length === 5, 'orders, money and the stored later-years dial survive a round trip');
ok(K.deserialize('not json') === null && K.deserialize('{}') === null && K.deserialize('null') === null, 'garbage loads as nothing, no throw');
ok(K.deserialize(JSON.stringify(Object.assign({}, c1, { v: 99 }))) === null, 'a wrong version is refused');
ok(K.deserialize(JSON.stringify(Object.assign({}, c1, { ledger: { cash: -5, credit: 1, entries: [] } }))) === null, 'a negative balance is refused');
const tamper = JSON.parse(K.serialize(c1)); tamper.dry = 'castle'; tamper.build = 'rocket'; tamper.finds = ['x', 'rope']; tamper.parts = 1e9; tamper.gh = 'soon';
const dt = K.deserialize(JSON.stringify(tamper)); ok(dt && dt.dry === null && dt.build === null && dt.finds.length === 1 && dt.parts === 99 && Number.isFinite(dt.gh), 'unknown values are dropped or clamped on load');
ok(K.canned('done', 1).saved && K.serialize(K.canned('done', 1)).length < 6000, 'a full save is small (' + K.serialize(K.canned('done', 1)).length + ' bytes)');

/* ---- tone rails on every line of our own text ---- */
const text = [].concat(K.LETTER1, K.LETTER2, K.BOTTLES, K.FINDS.map(f => f.name + ' ' + f.note), Object.values(K.SHELTERS).map(x => x.line), K.CATALOGUE.map(c => c.name + ' ' + c.use), K.BUILDS.map(b => b.name + ' ' + b.earns + ' ' + b.year)).join(' ');
ok(!/\b(blood|dead|death|kill|corpse|gore|murder|body|bodies)\b/i.test(text), 'nothing gory or cruel in our text');
ok(!/\b(AI|robot says|I am|machine|algorithm|computer|artificial)\b/.test(K.BOTTLES.concat(K.LETTER1, K.LETTER2).join(' ')), 'letters and bottles never name the helper or hint at what writes them');
ok(![].concat(K.LETTER1, K.LETTER2, K.BOTTLES).some(l => /[A-Z][a-z]+ [A-Z][a-z]+ (said|wrote)/.test(l)), 'no names in the letters');
ok(!/\b(Amazon|Google|Apple|Tesco|Ikea|Lego|Nike|Coca)\b/i.test(text), 'no real brands in the catalogue or text');
ok(K.LETTER1.length === 5 && K.LETTER2.length === 5 && K.LETTER1.join(' ').length < 220, 'letters are short and plain');
ok(K.START_CASH / (K.START_CASH + K.START_CREDIT) === 0.06, 'the split is the script default: 6 percent cash');

console.log('\n' + (n - fails) + ' of ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
