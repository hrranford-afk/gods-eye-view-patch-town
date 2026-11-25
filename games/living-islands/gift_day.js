/* THE GIFT, first day (switch: islands_look.html?game=gift). See GIFT_FIRST_DAY.md.
   One classic script, two halves:
   PART A  the pure core (no DOM, no three.js): ledger arithmetic, catalogue, delivery timing with weather delay, save and load, the bottle by seed, the finds, the stage logic. Tested in tests/gift-day-test.js.
   PART B  the page layer (only when a page asks for it): switch handling (it rewrites the URL first so the other switches turn on), the panels, the 3D story pieces, the taps, the sky clock, the camp robots.
   All money here is in-game pounds. Letters, hints and bottle messages are our own words. No person is drawn; the helper is never named. */
(function (root) {
'use strict';
/* ====================================================================== PART A: the core ====================================================================== */
const START_CASH = 60000, START_CREDIT = 940000;
const BASE_YEARLY = 235000;             /* the quiet pace of use of delivery credit, pounds a year (TUNING: 940,000 lasts about 4 years) */
const PACE_WINDOW_DAYS = 90;            /* a one-off spend is spread over at least this many days when the pace is read (TUNING) */
const SAVE_VERSION = 1;
const SAVE_KEY = 'li.gift.day1';
const STAGES = ['arrive', 'jobs', 'delivery', 'yard', 'evening', 'night', 'done'];
const STAGE_LABEL = { arrive: 'Arrive', jobs: 'First jobs', delivery: 'Delivery', yard: 'The yard', evening: 'Evening', night: 'Night' };
const CAMP_CAP = 2.5;                    /* the bigger battery (camp_start.js CAP_BIG) */
const START_HOUR = 5.0;                 /* game hours since midnight of day 1: first light */

/* ten cheap things; price in delivery credit (pounds); extra = hours added to the usual next-morning arrival */
const CATALOGUE = [
  { id: 'rope', name: 'Rope, 30 m', price: 38, extra: 0, use: 'Lashings for the jetty and the lean-to.' },
  { id: 'tools', name: 'Tool roll', price: 420, extra: 0, use: 'Saw, hammer, plane, a good knife.' },
  { id: 'seeds', name: 'Seed tin', price: 65, extra: 0, use: 'Hardy greens and roots for a first bed.' },
  { id: 'oil', name: 'Lamp oil', price: 54, extra: 0, use: 'A month of evenings.' },
  { id: 'tarp', name: 'Tarp', price: 120, extra: 0, use: 'Rain cover. It wears out in a year or two.' },
  { id: 'pump', name: 'Hand pump', price: 560, extra: 24, use: 'For a cistern or a well later. Heavy, so slower.' },
  { id: 'nails', name: 'Nails, a tin', price: 28, extra: 0, use: 'Nails hold better than rope in a surge.' },
  { id: 'paint', name: 'Tin of paint', price: 46, extra: 0, use: 'Keeps salt off timber.' },
  { id: 'line', name: 'Fishing line', price: 24, extra: 0, use: 'Line, hooks and a few floats.' },
  { id: 'blanket', name: 'Wool blanket', price: 80, extra: 0, use: 'Warm even when damp.' }
];
/* two robot kits (Job 6b): they come in a named kit crate and are fitted at the charging post (a short hold). Kept apart from the ten small things above. */
const KITS = [
  { id: 'battery', name: 'Bigger battery', price: 180, extra: 0, kit: true, use: 'A kit crate for one carrier: it holds 2.5 times the charge, so it works on through the night.' },
  { id: 'solar', name: 'Solar panel', price: 140, extra: 0, kit: true, use: 'A kit crate for one carrier: a daytime top-up and a slower drain.' }];
const FIT_S = 4;   /* seconds of holding at the charging post to swap a part in */
const modsOf = (s, i) => { const m = (s.mods || [])[i] || {}; return { bat: !!m.bat, solar: !!m.solar }; };
const partsText = m => m.bat || m.solar ? [m.bat ? 'bigger battery' : null, m.solar ? 'solar panel' : null].filter(Boolean).join(', ') : 'none';
const batteryLine = (m, charge) => 'Battery ' + Math.round((charge || 0) * 100) + ' percent. Parts: ' + partsText(m) + '.' + (m.bat ? '' : ' Short night shift.');
function fitKit(s, i, kit) {   /* pure: use one kit on carrier i; returns { ok, state, why } */
  if (!KITS.some(k => k.id === kit)) return { ok: false, state: s, why: 'No such kit.' }; if (!(s.robots || [])[i]) return { ok: false, state: s, why: 'That carrier is switched off.' };
  if (((s.kits || {})[kit] || 0) < 1) return { ok: false, state: s, why: 'No ' + KITS.find(k => k.id === kit).name.toLowerCase() + ' kit in the yard.' };
  const m = modsOf(s, i), key = kit === 'battery' ? 'bat' : 'solar'; if (m[key]) return { ok: false, state: s, why: 'It has one already.' };
  const mods = (s.mods || []).slice(); while (mods.length <= i) mods.push({ bat: false, solar: false }); mods[i] = Object.assign({}, modsOf(s, i), { [key]: true });
  return { ok: true, state: Object.assign({}, s, { mods, kits: Object.assign({}, s.kits, { [kit]: s.kits[kit] - 1 }) }) };
}
const WEATHER_DELAY = { storm: 24, fog: 5, rain: 3, showers: 1, overcast: 0, fair: 0, clear: 0, goldenhour: 0 };   /* hours added when the boat cannot land (TUNING) */
const MAX_WEATHER_DELAYS = 2;

/* five things to build; 80 percent of a price is materials (delivery credit), 20 percent is local work (cash). Totals from research/THE_GIFT_DESIGN.md section 4.2 (TUNING). */
const STOCKS = [
  { id: 'planks', name: 'Planks and timber', short: 'Planks', site: 'wood' },
  { id: 'rope', name: 'Rope and nets', short: 'Rope', site: 'plastic' },
  { id: 'glass', name: 'Bottles and glass', short: 'Glass', site: 'plastic' },
  { id: 'metal', name: 'Tins and metal', short: 'Metal', site: 'metal' }];
const UNITS_PER_TRIP = 2, STOCK_CAP = 60;
const BUILD_NEEDS = { jetty: { planks: 4, rope: 2 }, cottage: { planks: 12, metal: 4 }, cistern: { metal: 3, planks: 1 }, hide: { planks: 3, rope: 1 }, kiosk: { planks: 8, metal: 3, glass: 2 } };
const stockById = id => STOCKS.find(x => x.id === id) || null;
const emptyStock = () => ({ planks: 0, rope: 0, glass: 0, metal: 0 });
const needText = n => Object.keys(n).map(k => n[k] + ' ' + stockById(k).short.toLowerCase()).join(', ');
function missing(stock, needs) { const m = {}; for (const k in needs) if ((stock[k] || 0) < needs[k]) m[k] = needs[k] - (stock[k] || 0); return m; }
/* STARTER BUFFER (Job 6b): the first crate holds a sack of tins and a plank, enough for the rain cistern (the cheapest build), so the first build is never blocked */
const STARTER = { metal: BUILD_NEEDS.cistern.metal, planks: BUILD_NEEDS.cistern.planks };
const joinAnd = (a, w) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + (w || 'and') + ' ' + a[a.length - 1];
/* what is missing and exactly where to get it, from the whole need: 'Needs 3 metal: you have 0. Set a robot to Metal (daytime) or gather by hand.' */
function missingText(stock, needs) {
  const m = missing(stock, needs), ks = Object.keys(m); if (!ks.length) return '';
  return 'Needs ' + joinAnd(ks.map(k => needs[k] + ' ' + stockById(k).short.toLowerCase())) + ': you have ' + joinAnd(ks.map(k => String((stock || {})[k] || 0))) + '. Set a robot to ' + joinAnd(ks.map(k => stockById(k).short), 'or') + ' (daytime) or gather by hand.';
}
/* a robot brought trips of one kind to the yard heap: pure, returns a new state */
function addHaul(s, stockId, trips) {
  if (!stockById(stockId) || !(trips > 0)) return s; const st = Object.assign({}, s.stock); st[stockId] = Math.min(STOCK_CAP, (st[stockId] || 0) + Math.round(trips) * UNITS_PER_TRIP);
  return Object.assign({}, s, { stock: st });
}
/* the collection order of robot i: one stock id, or null (waits in its bay) */
function setJob(s, i, stockId) {
  if (i < 0 || i > 3) return s; const jobs = (s.jobs || []).slice(); while (jobs.length <= i) jobs.push(null); jobs[i] = stockById(stockId) ? stockId : null; return Object.assign({}, s, { jobs });
}
const BUILDS = [
  { id: 'jetty', name: 'Jetty (finish the repair)', total: 18000, earns: 'Earns nothing itself. Protects deliveries: fewer boats turned away, and guests can land.', year: 'The tender lands closer. Fewer weather delays.', hours: 'tomorrow morning', kit: 'real: reuses the repair jetty and its planks' },
  { id: 'cottage', name: 'Cottage', total: 85000, earns: 'Earns about £9,000 a year after costs, from guests (counted, never followed).', year: 'Guests come. Your year is about visitors.', hours: 'the morning after next', kit: 'placeholder block (no cottage model in the kit yet)' },
  { id: 'cistern', name: 'Rain cistern', total: 6000, earns: 'Protects: 12,000 litres in store for dry weeks. Earns nothing.', year: 'Staying power. Dry weeks hurt less.', hours: 'tomorrow morning', kit: 'placeholder tank (the kit rain barrel is the small one)' },
  { id: 'hide', name: 'Wildlife hide', total: 9000, earns: 'Earns about £2 a head in donations. Protects the seals and birds: they keep their distance.', year: 'Wildlife. Counts of seals and birds start to matter.', hours: 'tomorrow morning', kit: 'placeholder block (no hide model in the kit yet)' },
  { id: 'kiosk', name: 'Kiosk', total: 42000, earns: 'Earns about £4,000 a year in a good summer, if guests come.', year: 'Visitors spend. Needs a jetty to do well.', hours: 'the morning after next', kit: 'placeholder block (no kiosk model in the kit yet)' }
].map(b => Object.assign(b, { credit: Math.round(b.total * .8), cash: b.total - Math.round(b.total * .8), needs: BUILD_NEEDS[b.id] || {} }));
/* what the robots gather (an order picks one) and the stock each build uses up. 1 trip = UNITS_PER_TRIP units. TUNING. */


/* six bottle messages, our own words: hopeful, a little too well informed, no hint of what writes them */
const BOTTLES = [
  'The plank you fitted today will hold. The one beside it wants a longer nail.',
  'Between the second and third autumn storm there is always one still day. Plan your roof for it.',
  'The seals come to the east rocks when the water is coldest. Leave them room and they will stay.',
  'The first rain fills a barrel faster than you expect. Do not mind the small leak. Mend it on a dry morning.',
  'A lamp that burns all night will not be missed. A lamp that burns one hour at dusk will be seen.',
  'Someone is hoping this place is kind to you. That is all this note is for.'
];
/* what can wash up on the lee shore (our own table, weights add up to the pick) */
const FINDS = [
  { id: 'float', name: 'A glass float', note: 'Green glass, cold and smooth. Not one scratch.', w: 2 },
  { id: 'rope', name: 'A coil of rope', note: 'Stiff with salt, but sound.', w: 3 },
  { id: 'plank', name: 'A grey plank', note: 'Good for the jetty. It has been in the sea for years.', w: 3 },
  { id: 'buoy', name: 'A faded buoy', note: 'Red once. A marker for a net that is long gone.', w: 2 },
  { id: 'tin', name: 'A tin lid', note: 'A bright circle. Useful for a hundred small things.', w: 2 },
  { id: 'shell', name: 'A big shell', note: 'Whorled and pale. It still hums.', w: 1 },
  { id: 'crate', name: 'A broken fish box', note: 'Half of one. The slats are good timber.', w: 2 },
  { id: 'net', name: 'A tangle of net', note: 'Too knotted to mend today. Maybe later.', w: 1 }
];
const SHELTERS = {
  leanto: { name: 'The lean-to', line: 'Quick. Dry from the wind, drips a little in a long rain.' },
  tarp: { name: 'The tarp', line: 'Quick. Keeps the rain off, but wears out in a year or two.' },
  hut: { name: 'Patch the hut', line: 'Slow, but the best. Needs the key, and takes the rest of the morning.' }
};
const LETTER1 = ['This island is yours. So is what is in the ledger.', 'Spend it slowly.', 'Parcels will come by boat.', 'If something looks old, it is probably still useful.', 'You do not need to understand why.'];
const LETTER2 = ['You can make this a place for people to visit.', 'You can make it a place for wildlife.', 'You can make it somewhere to live quietly.', 'Or you can do all three badly.', 'None of it is wrong.'];

function hashStr(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pound = n => (n < 0 ? '-' : '') + '£' + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const signed = n => (n >= 0 ? '+' : '-') + pound(Math.abs(n));

/* ---- ledger ---- */
function newLedger() {
  return { cash: START_CASH, credit: START_CREDIT, spentCash: 0, spentCredit: 0, entries: [
    { h: START_HOUR, text: 'Gift: cash', cash: START_CASH, credit: 0 },
    { h: START_HOUR, text: 'Gift: delivery credit', cash: 0, credit: START_CREDIT }] };
}
/* spend {cash, credit}: returns { ok, ledger, why }. The old ledger is never changed. Credit buys deliveries; it cannot be turned into cash and it never buys land. */
function spend(L, tx, h) {
  const c = Math.round(tx.cash === undefined ? 0 : tx.cash), r = Math.round(tx.credit === undefined ? 0 : tx.credit);
  if (c < 0 || r < 0 || !Number.isFinite(c) || !Number.isFinite(r)) return { ok: false, ledger: L, why: 'That is not an amount.' };
  if (c > L.cash) return { ok: false, ledger: L, why: 'Not enough cash. You have ' + pound(L.cash) + '.' };
  if (r > L.credit) return { ok: false, ledger: L, why: 'Not enough delivery credit. You have ' + pound(L.credit) + '.' };
  const N = { cash: L.cash - c, credit: L.credit - r, spentCash: L.spentCash + c, spentCredit: L.spentCredit + r, entries: L.entries.concat([{ h: h || 0, text: tx.text || 'Spent', cash: -c, credit: -r }]) };
  return { ok: true, ledger: N };
}
function entryLine(e) {
  const d = Math.floor(e.h / 24) + 1, hh = Math.floor(e.h % 24), mm = Math.floor((e.h % 1) * 60);
  const parts = []; if (e.cash) parts.push(signed(e.cash) + ' cash'); if (e.credit) parts.push(signed(e.credit) + ' credit');
  return 'Day ' + d + ' ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + '  ' + e.text + (parts.length ? '  ' + parts.join(', ') : '');
}
const recent = (L, n) => L.entries.slice(-(n || 6)).map(entryLine).reverse();
/* years of delivery credit left at the current pace: the quiet baseline, or what has been spent so far spread over at least 90 days */
function creditYears(L, nowH) {
  const days = Math.max(PACE_WINDOW_DAYS, nowH / 24), pace = Math.max(BASE_YEARLY, L.spentCredit / days * 365);
  return L.credit / pace;
}
function creditNote(L, nowH) {
  const y = creditYears(L, nowH);
  if (y < 0.5) return 'Delivery credit is almost used. Only the basics will come.';
  if (y < 1.25) return 'Delivery credit lasts about a year at this pace.';
  const r = Math.round(y * 2) / 2;
  return 'Delivery credit lasts about ' + (r % 1 === 0 ? r : r.toFixed(1)) + ' years at this pace.';
}

/* ---- deliveries ---- */
const itemById = id => CATALOGUE.find(c => c.id === id) || KITS.find(c => c.id === id) || null;
/* next morning at 07:00 game time after the order, plus the item's extra hours */
function etaFor(orderH, extra) { return (Math.floor(orderH / 24) + 1) * 24 + 7 + (extra || 0); }
function placeOrder(L, itemId, h) {
  const it = itemById(itemId); if (!it) return { ok: false, ledger: L, why: 'No such item.' };
  const r = spend(L, { credit: it.price, text: 'Order: ' + it.name }, h); if (!r.ok) return r;
  return { ok: true, ledger: r.ledger, order: { id: 'o' + (hashStr(itemId + ':' + h) % 100000), item: itemId, placed: h, due: etaFor(h, it.extra), delays: 0, delayH: 0, delivered: false, taken: false } };
}
/* does the boat come now? (nowH in game hours; weather is the state name at the landing). Returns { order, arrived, delayedBy } and never changes the old order. */
function resolveDelivery(order, nowH, weather) {
  if (order.delivered) return { order, arrived: false, delayedBy: 0 };
  if (nowH < order.due) return { order, arrived: false, delayedBy: 0 };
  const d = WEATHER_DELAY[weather] || 0;
  if (d > 0 && order.delays < MAX_WEATHER_DELAYS) return { order: Object.assign({}, order, { due: order.due + d, delays: order.delays + 1, delayH: order.delayH + d }), arrived: false, delayedBy: d };
  return { order: Object.assign({}, order, { delivered: true }), arrived: true, delayedBy: 0 };
}
function etaText(due, nowH) {
  const dd = Math.floor(due / 24) - Math.floor(nowH / 24), hr = due % 24, clock = String(Math.floor(hr)).padStart(2, '0') + ':' + String(Math.floor((hr % 1) * 60)).padStart(2, '0');
  return (dd <= 1 ? 'tomorrow morning' : dd === 2 ? 'the morning after next' : 'in ' + dd + ' days') + ' (about ' + clock + ', weather permitting)';
}

/* ---- the bottle and the finds, by seed ---- */
const bottleIndex = seed => hashStr('bottle:' + (seed >>> 0)) % BOTTLES.length;
const bottleMessage = seed => BOTTLES[bottleIndex(seed)];
function pickFinds(seed, n) {
  const R = mulberry(hashStr('finds:' + (seed >>> 0))), pool = [], out = [];
  FINDS.forEach(f => { for (let i = 0; i < f.w; i++) pool.push(f.id); });
  for (let i = 0; i < n; i++) { let id = pool[Math.floor(R() * pool.length)], k = 0; while (out.includes(id) && k++ < 30) id = pool[Math.floor(R() * pool.length)]; out.push(id); }
  return out;
}

/* ---- state, stages, save and load ---- */
function newState(seed) {
  return { v: SAVE_VERSION, seed: seed >>> 0, gh: START_HOUR, stage: 'arrive', letter1: false, keyUsed: false, hutOpen: false,
    dry: null, water: false, finds: [], plank: false, shipSeen: false, crate1: false, parts: 0, partFrom: null, ordered: false, orders: [], delivered: [],
    robots: [], mods: [], kits: { battery: 0, solar: 0 }, jobs: [], stock: emptyStock(), boat: null, storm: null, phys: null, opening: false, dockDone: false, letter2: false, build: null, bottle: false, night: false, saved: false, ledger: newLedger(),
    dial: { year: 1, creditThin: [1, 0.9, 0.6, 0.3, 0.1], note: 'stored for later years, not used on day 1' } };
}
const boatOf = o => { const K = root.LI_BOAT_DRIVE; return K && K.sanitize ? K.serializeBoat(K.sanitize(o)) : (o && typeof o === 'object' ? JSON.parse(JSON.stringify(o)) : null); };
const jobsDone = s => (s.dry ? 1 : 0) + (s.water ? 1 : 0) + (s.finds.length >= 2 ? 1 : 0);
/* the stage from the flags alone (pure) */
function stageOf(s) {
  if (s.opening && !s.dockDone) return 'dock';   /* the physical opening: you arrive by boat and the dock is half built (only when physical.js set s.opening) */
  if (!s.letter1) return 'arrive';
  if (!(jobsDone(s) >= 3 && s.plank)) return 'jobs';
  if (!s.ordered) return 'delivery';
  if (!s.robots.some(Boolean)) return 'yard';
  if (!(s.letter2 && s.build)) return 'evening';
  if (!s.bottle) return 'night';
  return 'done';
}
function progress(s) {
  const cur = stageOf(s), ci = STAGES.indexOf(cur);
  return STAGES.slice(0, 6).map((id, i) => ({ id, label: STAGE_LABEL[id], done: i < ci, current: i === ci }));
}
function validState(o) {
  if (!o || typeof o !== 'object' || o.v !== SAVE_VERSION) return null;
  const B = new State(o); return B.ok ? B.s : null;
}
function State(o) {
  const base = newState(o.seed >>> 0), s = base, num = (v, d, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d), bool = v => v === true;
  s.gh = num(o.gh, s.gh, 0, 24 * 400); s.letter1 = bool(o.letter1); s.keyUsed = bool(o.keyUsed); s.hutOpen = bool(o.hutOpen);
  s.dry = ['leanto', 'tarp', 'hut'].includes(o.dry) ? o.dry : null; s.water = bool(o.water);
  s.finds = Array.isArray(o.finds) ? o.finds.filter(x => FINDS.some(f => f.id === x)).slice(0, 8) : [];
  s.plank = bool(o.plank); s.shipSeen = bool(o.shipSeen); s.crate1 = bool(o.crate1); s.parts = Math.round(num(o.parts, 0, 0, 99)); s.partFrom = ['crate', 'wreck'].includes(o.partFrom) ? o.partFrom : null;
  s.ordered = bool(o.ordered); s.letter2 = bool(o.letter2); s.bottle = bool(o.bottle); s.night = bool(o.night); s.saved = bool(o.saved);
  s.build = BUILDS.some(b => b.id === o.build) ? o.build : null;
  s.robots = Array.isArray(o.robots) ? o.robots.slice(0, 4).map(bool) : [];
  s.boat = o.boat && typeof o.boat === 'object' ? boatOf(o.boat) : null;   /* the boat's part of the save (boat_drive.js sanitises it; absent = no boat yet) */
  s.storm = o.storm && typeof o.storm === 'object' ? (root.LI_STORM && root.LI_STORM.sanitize ? root.LI_STORM.sanitize(o.storm) : null) : null;   /* the storm and the haul's part of the save (storm.js sanitises it; absent = no storm yet) */
  s.opening = bool(o.opening); s.dockDone = bool(o.dockDone);
  s.mods = Array.isArray(o.mods) ? o.mods.slice(0, 4).map(m => ({ bat: !!(m && m.bat), solar: !!(m && m.solar) })) : [];
  s.kits = { battery: Math.round(num(o.kits && o.kits.battery, 0, 0, 9)), solar: Math.round(num(o.kits && o.kits.solar, 0, 0, 9)) };
  s.jobs = Array.isArray(o.jobs) ? o.jobs.slice(0, 4).map(j => (stockById(j) ? j : null)) : [];
  s.stock = emptyStock(); if (o.stock && typeof o.stock === 'object') for (const k in s.stock) s.stock[k] = Math.round(num(o.stock[k], 0, 0, STOCK_CAP));
  s.orders = Array.isArray(o.orders) ? o.orders.filter(q => q && itemById(q.item) && Number.isFinite(q.due)).slice(0, 40).map(q => ({ id: String(q.id).slice(0, 12), item: q.item, placed: num(q.placed, 0, 0, 1e5), due: num(q.due, 0, 0, 1e5), delays: Math.round(num(q.delays, 0, 0, 9)), delayH: num(q.delayH, 0, 0, 999), delivered: bool(q.delivered), taken: bool(q.taken) })) : [];
  s.delivered = Array.isArray(o.delivered) ? o.delivered.filter(x => itemById(x)).slice(0, 40) : [];
  { const PH = root.LI_PHYS; s.phys = PH && PH.sanitize ? PH.sanitize(o.phys) : null; if (s.phys && PH.restoreStock) s.stock = PH.restoreStock(s.stock, s.phys); }   /* the physical layer's part of the save (physical.js sanitises it; a unit in a robot's hand goes back on the heap) */
  const L = o.ledger;
  if (L && Number.isFinite(L.cash) && Number.isFinite(L.credit) && Array.isArray(L.entries)) {
    s.ledger = { cash: Math.round(L.cash), credit: Math.round(L.credit), spentCash: Math.round(num(L.spentCash, 0, 0, 1e9)), spentCredit: Math.round(num(L.spentCredit, 0, 0, 1e9)),
      entries: L.entries.slice(-60).filter(e => e && typeof e.text === 'string' && Number.isFinite(e.h)).map(e => ({ h: e.h, text: e.text.slice(0, 80), cash: Math.round(num(e.cash, 0, -1e9, 1e9)), credit: Math.round(num(e.credit, 0, -1e9, 1e9)) })) };
    if (s.ledger.cash < 0 || s.ledger.credit < 0) { this.ok = false; return; }
  } else { this.ok = false; return; }
  s.dial = o.dial && Array.isArray(o.dial.creditThin) ? { year: Math.round(num(o.dial.year, 1, 1, 99)), creditThin: o.dial.creditThin.slice(0, 8).map(v => num(v, 1, 0, 1)), note: String(o.dial.note || '').slice(0, 80) } : s.dial;
  s.stage = stageOf(s); this.s = s; this.ok = true;
}
const serialize = s => JSON.stringify(Object.assign({}, s, { stage: stageOf(s) }));
const deserialize = txt => { try { return validState(JSON.parse(txt)); } catch (e) { return null; } };
/* a state as if the player had done every earlier beat (the Skip-to button, &stage=, &day=2) */
function canned(stage, seed) {
  const s = newState(seed), L0 = s.ledger, i = STAGES.indexOf(stage); if (i <= 0) return s;
  s.letter1 = true; s.keyUsed = true; s.hutOpen = true; s.gh = 6.4;
  if (i >= 2) { s.dry = 'leanto'; s.water = true; s.finds = pickFinds(seed, 2); s.plank = true; s.shipSeen = i >= 3; s.gh = 11.6; }
  if (i >= 3) { const r = placeOrder(L0, 'rope', 12.2); s.ledger = r.ledger; s.orders.push(r.order); s.ordered = true; s.crate1 = true; s.parts = 3; s.partFrom = 'crate'; s.stock = Object.assign(emptyStock(), STARTER); s.gh = 14.2; }   /* crate one is open: its sack of tins and plank is in the yard (Job 6b) */
  if (i >= 4) { s.robots = [true, false, false]; s.jobs = ['planks']; s.stock = Object.assign({}, s.stock, { planks: (s.stock.planks || 0) + 6 }); s.parts = 2; s.gh = 18.1; }   /* what a normal day makes: the starter sack, one carrier on planks for a few minutes, and a part used (Job 6b: the old canned rope and glass could not have come from a carrier on planks) */
  if (i >= 5) { s.letter2 = true; const b = BUILDS.find(x => x.id === 'cistern'), r = spend(s.ledger, { cash: b.cash, credit: b.credit, text: 'Build: ' + b.name }, 19); s.ledger = r.ledger; s.stock = Object.assign({}, s.stock); for (const k in b.needs) s.stock[k] -= b.needs[k]; s.build = 'cistern'; s.gh = 21.6; s.night = true; }
  if (i >= 6) { s.bottle = true; s.saved = true; s.gh = 23.4; }
  s.stage = stageOf(s); return s;
}
/* a gentle hint for the player now (one short plain sentence, never an order) */
function hintFor(s) {
  switch (stageOf(s)) {
    case 'dock': return 'The robots wait for supplies. Row to the glow.';
    case 'arrive': return 'A crate sits above the tideline, with a paper label. Tap it.';
    case 'jobs': {
      const t = [];
      if (!s.dry) t.push('get dry'); if (!s.water) t.push('find water'); if (s.finds.length < 2) t.push('look along the shore'); if (!s.plank) t.push('fit a plank on the old jetty');
      return 'When you like: ' + t.join(', ') + '. The notebook has the details.';
    }
    case 'delivery': return s.crate1 ? 'The catalogue is open. Order something small.' : 'A boat is coming in. Wait on the beach.';
    case 'yard': if (s.robots.some(Boolean)) return 'Tap the robot and give it an order: what should it gather?'; return s.parts > 0 ? 'Three old carriers sit in the yard. One of them might start with a part.' : 'Three old carriers sit in the yard. A part might be in the crate, or in the old hull.';
    case 'evening': if (s.letter2 && !s.build && !BUILDS.some(b => !Object.keys(missing(s.stock, b.needs)).length)) return 'The build menu shows what each thing needs. The robots are bringing stock from the shore.'; return s.letter2 ? 'Open the build menu and choose one thing for the year ahead.' : 'A second crate came with the evening boat. It holds a letter.';
    case 'night': return 'The light on the headland is lit. Something washed up on the beach.';
    default: return 'The first day is done. You can close the page. Your place is saved.';
  }
}
function canBuild(s, id) {
  const b = BUILDS.find(x => x.id === id); if (!b) return { ok: false, why: 'No such thing.' };
  if (s.build) return { ok: false, why: 'You have chosen one thing for the year ahead.' };
  if (b.cash > s.ledger.cash) return { ok: false, why: 'Not enough cash for the local work: ' + pound(b.cash) + ' needed, you have ' + pound(s.ledger.cash) + '.' };
  if (b.credit > s.ledger.credit) return { ok: false, why: 'Not enough delivery credit.' };
  const m = missing(s.stock || {}, b.needs); if (Object.keys(m).length) return { ok: false, why: 'Short of stock: ' + needText(m) + ' more from the robots.', short: m };
  return { ok: true };
}
function doBuild(s, id) {
  const c = canBuild(s, id); if (!c.ok) return { ok: false, why: c.why, state: s };
  const b = BUILDS.find(x => x.id === id), r = spend(s.ledger, { cash: b.cash, credit: b.credit, text: 'Build: ' + b.name }, s.gh);
  const st = Object.assign({}, s.stock); for (const k in b.needs) st[k] -= b.needs[k];
  return { ok: true, state: Object.assign({}, s, { ledger: r.ledger, build: id, stock: st }) };
}
/* HAND GATHERING (Job 6b). A hold on a pile or a heap, one unit every HAND_UNIT_S seconds of holding: about one robot's output per minute on a matching order (tests/night-test.js measures the robots from the camp routine). */
const ROBOT_RATE = { metal: 1.4, planks: 1.3, rope: 1.3, glass: 1.3 };   /* units a minute, one robot, one order (measured, night-test.js) */
const HAND_UNIT_S = 50, LITTER_UNITS = UNITS_PER_TRIP;
const SITE_STOCK = { wood: 'planks', metal: 'metal' };
const litterStock = (kind, i) => SITE_STOCK[kind] || (i % 2 ? 'glass' : 'rope');
const WRACK_LINE = 'Planks and rope wash up at the tide line.';   /* Job 6d item 1: where the timber comes from */
const wrackAfterStorm = phase => phase === 'haul' ? 1.5 : 1;   /* the tide leaves a third more for a while after a storm (timer speed-up, the base economy is unchanged) */
const rateStr = v => (Math.round(v * 10) / 10).toFixed(1);
const handRate = () => 60 / HAND_UNIT_S;
function rateText(stockId) { return 'By hand: about ' + rateStr(handRate()) + ' a minute.' + (stockId && ROBOT_RATE[stockId] ? ' This robot on ' + stockById(stockId).short + ': about ' + rateStr(ROBOT_RATE[stockId]) + ' a minute.' : ''); }
/* one frame of a hold: progress seconds in, whole units out */
function handStep(p, dt, holding) { if (!holding) return { p, units: 0 }; p += dt; let u = 0; while (p >= HAND_UNIT_S) { p -= HAND_UNIT_S; u++; } return { p, units: u }; }
/* WAIT FOR DAWN (Job 6b). mode: null, 'manual' (the Menu button: the night goes by at 8 times speed, ramped in over RAMP_S) or 'auto' (nothing needs you for IDLE_S at night: a gentle 3 times, ramped). Any player action cancels either; dawn ends either. Pure: waitStep(w, dt, o) with
   o = { start: the button, stop: the button again, night, dark (dusk or night), idle: seconds since the last action, busy: something needs the player, act: the player acted since the last step }. */
const WAIT = { idleS: 45, manualSpeed: 8, autoSpeed: 3, rampS: 5 };
function waitStep(w, dt, o) {
  let mode = w && w.mode || null, k = w && w.k || 0;
  if (o.act || o.stop) { mode = null; k = 0; }
  else if (mode && !o.dark) { mode = null; k = 0; }
  else if (mode === 'auto' && (o.busy || !o.night)) { mode = null; k = 0; }
  if (!mode) { if (o.start && o.dark) mode = 'manual'; else if (o.night && !o.busy && !o.act && !o.stop && o.idle >= WAIT.idleS) mode = 'auto'; }
  if (mode) k = Math.min(1, k + dt / WAIT.rampS); else k = 0;
  const top = mode === 'manual' ? WAIT.manualSpeed : WAIT.autoSpeed;
  return { mode, k, speed: mode ? 1 + (top - 1) * k : 1 };
}
/* AMBIENT EVENTS (Job 6b): when nothing visible has happened for quietS seconds (no robot moving or working, no hold, no card), one small thing happens in turn: a boat passes far out, gulls wheel over the wrack line, the tender's horn sounds, a tide pool has something small in it.
   They last dur seconds each. tests/deadtime-test.js holds the longest stretch of nothing visible and nothing doable under 120 s with them (and shows it fails without them). */
const AMBIENT = { quietS: 55, order: ['boat', 'gulls', 'horn', 'pool'], dur: { boat: 50, gulls: 20, horn: 8, pool: 12 }, text: { boat: 'A small boat passes, far out.', gulls: 'Gulls wheel low over the wrack line.', horn: 'The tender sounds its horn, far out. Two long notes.', pool: 'A tide pool glitters at the edge of the shoal. Something small is in it.' } };
function ambientStep(a, dt, visible) {
  a = Object.assign({ q: 0, k: 0, active: 0, id: null }, a);
  if (a.active > 0) { a.active -= dt; if (a.active <= 0) { a.active = 0; a.id = null; } return { a, fire: null }; }
  if (visible) { a.q = 0; return { a, fire: null }; }
  a.q += dt; if (a.q >= AMBIENT.quietS) { const id = AMBIENT.order[a.k % AMBIENT.order.length]; a.k++; a.q = 0; a.active = AMBIENT.dur[id]; a.id = id; return { a, fire: id }; }
  return { a, fire: null };
}
/* the icons over a stopped robot (Job 6c): name -> SVG inner paths on a 24 box, drawn by the page; every reason code in camp_start.js STOPS names one */
const STOP_ICONS = {
  battery: '<rect x="4" y="8" width="14" height="9" rx="1.5"/><rect x="18" y="10.5" width="2.5" height="4"/><rect x="5.5" y="9.5" width="3" height="6" fill="#fff"/>',
  bolt: '<path d="M13 3 L6 14 H11 L10 21 L18 9 H12.5 Z"/>',
  moon: '<path d="M16 4 A8 8 0 1 0 20 16 A6.5 6.5 0 0 1 16 4 Z"/>',
  cloud: '<path d="M7 17 A4 4 0 0 1 7.5 9 A5 5 0 0 1 17 8.5 A4 4 0 0 1 17 17 Z"/><path d="M9 19 L8 22 M13 19 L12 22 M17 19 L16 22" stroke-width="1.6"/>',
  hand: '<path d="M8 21 V11 L9.5 11 V6 H11.5 V11 H12.5 V5 H14.5 V11 H15.5 V7 H17.5 V15 Q17.5 21 12 21 Z"/>',
  box: '<path d="M4 8 L12 4 L20 8 V17 L12 21 L4 17 Z"/><path d="M4 8 L12 12 L20 8 M12 12 V21" stroke-width="1.4"/>',
  wave: '<path d="M3 10 Q6 6 9 10 T15 10 T21 10 M3 16 Q6 12 9 16 T15 16 T21 16" fill="none" stroke-width="2"/>',
  zz: '<path d="M6 7 H12 L6 13 H12 M13 13 H18 L13 18 H18" fill="none" stroke-width="2"/>',
  rock: '<path d="M3 19 L7 9 L12 6 L17 9 L21 19 Z"/><path d="M9 12 L12 15 L15 11" stroke="#fff" stroke-width="1.4" fill="none"/>',
  off: '<circle cx="12" cy="13" r="7" fill="none" stroke-width="2"/><path d="M12 4 V12" stroke-width="2.2"/>',
  wait: '<circle cx="12" cy="12" r="8" fill="none" stroke-width="2"/><path d="M12 7 V12 L15.5 14" fill="none" stroke-width="2"/>'
};
/* EXPLORATION (Job 6c item 1). Pure: the compass arrow in degrees clockwise from straight up on the screen, for a camera looking along (fx, fz) on the ground. */
function arrowDeg(from, to, fx, fz) { const dx = to.x - from.x, dz = to.z - from.z, rx = -fz, rz = fx; return Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz) * 180 / Math.PI; }
/* the places the player knows: id, name, which landing marks it, when it is known, the one line when heading there */
const PLACES = [
  { id: 'home', name: 'Home: the jetty', land: 'jetty', known: () => true, line: 'Row home to the jetty.' },
  { id: 'skerry', name: 'The outer skerry', land: 'skerry', known: () => true, line: 'Something is wedged on the skerry.' },
  { id: 'woods', name: 'The woods', land: null, known: () => false, line: 'Row to the woods.' }   /* later: no woods in the world yet; the row is here so the chart grows with the map */
];
/* ---------------- STORY V2 CALENDAR (Job 6e item 2): a 360-day year of twelve 30-day months, day 1 is 1 May (GIFT_WEEK_ONE_AND_SPINE.md). Letters and events key on the game day through this table. ---------------- */
const CAL_MONTHS = ['May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'], CAL_YEAR = 360, CAL_MONTH = 30;
const CAL_SEASONS = [['spring', 1, 30], ['summer', 31, 120], ['autumn', 121, 210], ['winter', 211, 300], ['spring', 301, 360]];   /* four seasons of 90 days, spring split across the new year */
function calOf(day) {
  const d = Math.max(1, Math.floor(+day || 1)), year = Math.floor((d - 1) / CAL_YEAR) + 1, yd = (d - 1) % CAL_YEAR + 1, mi = Math.floor((yd - 1) / CAL_MONTH), dom = (yd - 1) % CAL_MONTH + 1;
  const se = CAL_SEASONS.find(q => yd >= q[1] && yd <= q[2]);
  return { day: d, year, yearDay: yd, month: mi + 1, monthName: CAL_MONTHS[mi], dom, season: se[0], label: dom + ' ' + CAL_MONTHS[mi], long: dom + ' ' + CAL_MONTHS[mi] + ', year ' + year + ', ' + se[0] };
}
/* when each letter may arrive, in game days (the trigger is still the event; this is the earliest and latest day): L3 follows the first storm (never before day 3), L4 is the first winter (day 211), L9 only in year three from day 842 */
const LETTER_DAYS = { L1: { from: 1 }, L2: { from: 1 }, L3: { from: 3 }, L4: { from: 211 }, L9: { from: 842, to: 1080 } };
const letterOk = (id, day) => { const r = LETTER_DAYS[id]; return !!r && day >= r.from && (r.to === undefined || day <= r.to); };
const CORE = { CAL_MONTHS, CAL_SEASONS, CAL_YEAR, CAL_MONTH, calOf, LETTER_DAYS, letterOk, STOP_ICONS, arrowDeg, PLACES, AMBIENT, ambientStep, STARTER, missingText, WAIT, waitStep, KITS, FIT_S, CAMP_CAP, modsOf, partsText, batteryLine, fitKit, ROBOT_RATE, HAND_UNIT_S, LITTER_UNITS, litterStock, rateText, handRate, handStep, STOCKS, BUILD_NEEDS, UNITS_PER_TRIP, STOCK_CAP, emptyStock, missing, needText, addHaul, setJob, START_CASH, START_CREDIT, START_HOUR, BASE_YEARLY, CATALOGUE, BUILDS, BOTTLES, FINDS, SHELTERS, LETTER1, LETTER2, STAGES, STAGE_LABEL, WEATHER_DELAY, SAVE_KEY, SAVE_VERSION,
  pound, signed, newLedger, spend, recent, entryLine, creditYears, creditNote, itemById, etaFor, placeOrder, resolveDelivery, etaText, bottleIndex, bottleMessage, pickFinds,
  newState, stageOf, progress, jobsDone, serialize, deserialize, validState, canned, hintFor, canBuild, doBuild, hashStr, mulberry };
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
root.LI_GIFT = root.LI_GIFT || {}; root.LI_GIFT.core = CORE;

/* ====================================================================== PART B: the page layer ====================================================================== */
if (typeof window === 'undefined' || typeof document === 'undefined') return;
const Q0 = new URLSearchParams(location.search);
const GIFT = Q0.get('game') === 'gift';
/* the switches the first day needs, turned on by this one (a switch given in the URL always wins) */
const USER_WEATHER = Q0.has('weather') ? Q0.get('weather') : null;
/* THE HOME ISLAND is one swap point: this world id (landform/worlds/seed<id>/) plus the page's own landing and camp scan, which place every story piece. A level can replace it with ?giftworld=<id> or by changing this one constant. */
const GIFT_WORLD = Q0.get('giftworld') || '9001';
if (GIFT) {
  const need = { world: GIFT_WORLD, start: 'camp', repair: '1', clock: '1', weather: 'auto', cd: '121', ch: String(START_HOUR), cspeed: '0.2', cm: '9', clat: '46', boatkit: '1' };
  if (Q0.get('physical') !== '0') need.boat = '1';   /* the physical opening: the rowing boat is there from the first minute (boat_drive.js FORCE_BOAT) */   /* boatkit: the kit dinghy is the boat you drive (boat_drive.js); &boatkit=0 keeps the old hulls */
  let changed = false; for (const k in need) if (!Q0.has(k)) { Q0.set(k, need[k]); changed = true; }
  if (changed) { try { history.replaceState(null, '', location.pathname + '?' + Q0.toString() + location.hash); } catch (e) { /* the page still works on its own switches */ } }
}
root.LI_GIFT.on = GIFT;
if (!GIFT) { root.LI_GIFT.init = function () { return null; }; return; }

const DEV = Q0.get('dev') === '1';                  /* &dev=1 keeps the page's test chrome and the old crowded HUD (every pilot and test button) */
const GD_CLEAN = !DEV;
const AUTOMATION = !!(navigator.webdriver);
const SAVE_OK = () => !AUTOMATION || Q0.get('giftsave') === '1';
let C = null, THREE = null;                         /* the page context given by init() */
const G = { s: null, ui: {}, tgt: [], cardOpen: null, idle: 0, lastTap: 0, focusT: null, spots: null, objs: {}, shown: {}, hold: [], err: [], horn: null, hintRing: null, anim: [], toast: '', clockMode: '', weather: '', robotsDone: false, savedAt: 0, ready: false };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const PX = (n) => n + 'px';
const mark = (sz, col) => '<svg class="gd-mark" width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="' + (col || 'currentColor') + '" stroke-width="2"/><path d="M12 3 A9 9 0 0 1 21 12" stroke="' + (col || 'currentColor') + '" stroke-width="5" fill="none"/><circle cx="12" cy="12" r="2" fill="' + (col || 'currentColor') + '"/></svg>';

/* ---------------- DOM ---------------- */
const CSS = `
#gd{position:fixed;inset:0;z-index:7;pointer-events:none;font:16px/1.35 Georgia,"Iowan Old Style","Palatino Linotype",serif;color:#2b2118;transform-origin:0 0}
#gd *{box-sizing:border-box}
#gd .gd-pill{background:rgba(251,246,236,.93);border:2px solid #cdbb98;border-radius:14px;padding:8px 12px;pointer-events:auto}
#gd .gd-btn{min-height:48px;min-width:48px;padding:10px 16px;border-radius:14px;border:2px solid #cdbb98;background:#fff;color:#2b2118;font:inherit;font-weight:700;cursor:pointer;touch-action:manipulation;pointer-events:auto}
body.dev-touch #gd .gd-btn{min-height:52px;min-width:52px;font-size:17px}
#gd .gd-btn.pri{background:#2f6fe6;border-color:#2f6fe6;color:#fff}
#gd .gd-btn[disabled]{opacity:.45;cursor:default}
#gd .gd-btn.dim{opacity:.55}
#gd .gd-btn.pulse{animation:gdp 1.6s ease-in-out infinite}
@keyframes gdp{0%,100%{box-shadow:0 0 0 0 rgba(47,111,230,.0)}50%{box-shadow:0 0 0 7px rgba(47,111,230,.28)}}
#gd-strip{position:absolute;left:50%;top:68px;transform:translateX(-50%);display:flex;gap:4px;align-items:center;padding:5px 8px;max-width:calc(100vw - 24px);overflow:hidden}
#gd-strip b{font-size:14px;margin-right:4px;white-space:nowrap}
#gd-strip i{font-style:normal;font-size:12px;padding:3px 8px;border-radius:10px;background:#efe6d3;color:#7a6a52;white-space:nowrap}
#gd-strip i.cur{background:#2f6fe6;color:#fff;font-weight:700}
#gd-strip i.done{background:#cfe6c8;color:#37552f}
#gd-strip small{font-size:12px;opacity:.75;margin-left:6px;white-space:nowrap;font-variant-numeric:tabular-nums}
#gd-right{position:absolute;right:10px;top:66px;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
#gd-left{position:absolute;left:10px;bottom:150px;display:flex;flex-direction:column;gap:6px;max-width:min(300px,45vw)}
#gd-hint{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);width:min(620px,calc(100vw - 24px));display:flex;gap:10px;align-items:center;justify-content:space-between}
#gd-hint span{flex:1}
@media (max-width:760px){#gd-left{bottom:214px}#gd-strip{top:62px}#gd-right{top:62px}}
#gd-toast{position:absolute;left:50%;top:126px;transform:translateX(-50%);max-width:min(560px,calc(100vw - 24px));text-align:center;opacity:0;transition:opacity .4s;pointer-events:none}
#gd-toast.on{opacity:1}
#gd #gd-toast{pointer-events:none}   /* a pill class sets pointer-events:auto; the toast must never catch a tap meant for the island */
#gd .gd-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 120px);overflow:auto;padding:18px 20px;pointer-events:auto;box-shadow:0 12px 40px rgba(0,0,0,.35)}
#gd .gd-card.gd-side{left:10px;top:150px;transform:none;width:min(470px,calc(100vw - 20px));max-height:calc(100vh - 250px)}
#gd .gd-card h2{margin:0 0 8px;font-size:21px}
#gd .gd-card p{margin:6px 0}
#gd .gd-paper{background:#f7efd9;border-color:#d9c79b;transform:translate(-50%,-50%) rotate(-.6deg);font-family:"Segoe Print","Bradley Hand","Noteworthy","Comic Sans MS",cursive,Georgia,serif;font-size:19px;line-height:1.55}
#gd .gd-paper .sig{display:flex;justify-content:flex-end;opacity:.55;margin-top:10px}
#gd .gd-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
#gd .gd-item{display:flex;gap:10px;align-items:center;justify-content:space-between;border-top:1px solid #e3d6b8;padding:8px 0}
#gd .gd-item div{flex:1;min-width:0}
#gd .gd-item small{display:block;opacity:.75;font-size:13px}
#gd .gd-money{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}
#gd .gd-money div{flex:1;min-width:140px;background:#fffaf0;border:2px solid #e3d6b8;border-radius:12px;padding:8px 10px}
#gd .gd-money b{display:block;font-size:24px;font-variant-numeric:tabular-nums}
#gd .gd-money small{opacity:.7}
#gd pre{margin:6px 0;white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,Consolas,monospace}
#gd .gd-mark{vertical-align:middle}
#gd .gd-tip{position:absolute;pointer-events:auto;max-width:min(360px,calc(100vw - 24px))}
#gd .gd-x{position:absolute;right:8px;top:8px;min-height:44px;min-width:44px}
#gd .gd-sel{min-height:44px;border-radius:12px;border:2px solid #cdbb98;background:#fff;font:inherit;padding:6px 8px}
#gd-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity 1.6s;pointer-events:none}

/* ---- the clean HUD (HUD pass): one owner per corner. top left: the day strip and one status line. top right: ledger, one contextual button, Menu. bottom left: stock and barrel. bottom centre: one short hint. bottom right: the boat's buttons. Everything else is behind Menu. &dev=1 turns this off. ---- */
body.gd-clean:not(.gd-showdev) #top,body.gd-clean:not(.gd-showdev) #bar,body.gd-clean:not(.gd-showdev) #info,body.gd-clean:not(.gd-showdev) #gpuInfo,body.gd-clean:not(.gd-showdev) #campChip,body.gd-clean:not(.gd-showdev) #rpChip,body.gd-clean:not(.gd-showdev) #rpRow{display:none!important}
body.gd-clean.gd-showdev #top{z-index:9;top:auto;bottom:110px;left:10px;right:10px}
body.gd-clean #rpMsg{display:none!important}
body.gd-clean #rpHud{left:50%;top:auto;bottom:130px;transform:translateX(-50%);align-items:center;max-width:calc(100vw - 20px)}
body.gd-clean:not(.gd-showdev) #rpRow button:not(#rpTurn){display:none!important}
body.gd-clean.rp-held #rpRow{display:flex!important}
body.gd-clean #rpRow #rpTurn{min-height:52px;min-width:52px;font-size:17px}
body.gd-clean #gd-strip{left:10px;top:10px;transform:none;max-width:calc(100vw - 196px);flex-wrap:wrap;gap:3px 5px;padding:6px 10px;overflow:visible;border-radius:14px}
body.gd-clean #gd-strip .gd-dots{display:inline-flex;gap:3px;align-items:center}
body.gd-clean #gd-strip .gd-dots u{width:8px;height:8px;border-radius:4px;background:#e0d4bb;display:inline-block}
body.gd-clean #gd-strip .gd-dots u.done{background:#7fb36e}
body.gd-clean #gd-strip .gd-dots u.cur{background:#2f6fe6}
body.gd-clean #gd-strip .gd-line2{flex-basis:100%;font-size:12px;opacity:.8;margin:0;white-space:normal}
body.gd-clean #gd-right{top:10px;right:10px}
body.gd-clean #gd-right .gd-btn{min-height:52px}
body.gd-clean #gd-left{bottom:160px;align-items:flex-start}
body.gd-clean #bd-st{display:none!important}
body.gd-clean #gd-hint{bottom:100px;width:min(420px,calc(100vw - 24px));justify-content:center;text-align:center;font-size:18px;font-weight:700}
body.gd-clean #gd-toast{top:96px}
body.gd-clean #stormBaro{top:84px}
#gd-compass{position:absolute;left:10px;top:38%;display:none;align-items:center;gap:8px;min-height:52px;font-size:14px;font-weight:700;border-color:#d9a21c;cursor:pointer;max-width:min(200px,50vw)}
#gd-compass svg{flex:none;transition:transform .25s}
#gd-menu{position:absolute;right:10px;top:76px;display:none;flex-direction:column;gap:8px;align-items:stretch;min-width:190px;padding:10px}
body.gd-menuopen #gd-menu{display:flex}
#gd-plankhint{position:absolute;left:50%;top:92px;transform:translateX(-50%);font-size:15px;font-weight:700;display:none}
@media (max-width:760px){body.gd-clean #gd-left{bottom:250px}body.gd-clean #gd-strip{top:10px;max-width:calc(100vw - 200px)}body.gd-clean #gd-hint{left:10px;transform:none;width:calc(100vw - 150px);font-size:16px;bottom:28px}body.gd-clean #gd-right{top:10px}}
`;
function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
function buildDom() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  if (GD_CLEAN) document.body.classList.add('gd-clean');
  const r = h('div'); r.id = 'gd'; document.body.appendChild(r); G.ui.root = r;
  r.innerHTML = '<div id="gd-fade"></div><div id="gd-strip" class="gd-pill"></div><div id="gd-left"></div><div id="gd-right"></div><div id="gd-hint" class="gd-pill"></div><div id="gd-toast" class="gd-pill"></div><div id="gd-plankhint" class="gd-pill">Tap a plank, then a yellow slot</div><div id="gd-layer"></div>';
  for (const k of ['strip', 'left', 'right', 'hint', 'toast', 'layer', 'fade']) G.ui[k] = document.getElementById('gd-' + k);
  r.addEventListener('pointerdown', e => { G.actAt = performance.now(); G.idle = 0; e.stopPropagation(); }); addEventListener('keydown', () => { G.actAt = performance.now(); G.idle = 0; }); r.addEventListener('pointerup', e => e.stopPropagation());
  ['wheel', 'touchstart', 'touchmove'].forEach(n => r.addEventListener(n, e => { if (e.target.closest('.gd-card,.gd-pill,.gd-btn')) e.stopPropagation(); }, { passive: true }));
  applyZoom(); addEventListener('resize', applyZoom);
}
function applyZoom() { const z = (C && C.ui) ? C.ui() : 1; if (G.ui.root) { G.ui.root.style.zoom = z === 1 ? '' : String(z); } }
function toast(t, ms) { G.toast = t; const e = G.ui.toast; e.textContent = t; e.classList.add('on'); clearTimeout(G.toastT); G.toastT = setTimeout(() => e.classList.remove('on'), ms || 4200); }
function closeCard() { G.ui.layer.innerHTML = ''; G.cardOpen = null; }
function card(id, html, cls) {
  closeCard(); const c = h('div', 'gd-card gd-pill ' + (['cat', 'build', 'ledger', 'notes', 'shelter', 'confirm', 'barrel', 'hut'].includes(id) ? 'gd-side ' : '') + (cls || ''), html); c.id = 'gd-card-' + id; G.ui.layer.appendChild(c); G.cardOpen = id; return c;
}
function btn(label, fn, cls, dis) { const b = h('button', 'gd-btn ' + (cls || ''), label); b.type = 'button'; if (dis) b.disabled = true; b.addEventListener('click', e => { e.stopPropagation(); if (!b.disabled) fn(); }); return b; }
function row(...bs) { const r = h('div', 'gd-row'); bs.forEach(b => r.appendChild(b)); return r; }
function xbtn() { const b = btn('Close', closeCard, 'gd-x'); b.innerHTML = '&times;'; b.setAttribute('aria-label', 'Close'); b.classList.add('gd-x'); return b; }

/* ---------------- clock and weather ---------------- */
const WIN = { dock: [5.0, 5.7], arrive: [5.0, 5.7], jobs: [6.0, 10.5], delivery: [11.6, 14.0], yard: [14.2, 17.4], evening: [18.1, 19.3], night: [21.6, 26.0], done: [23.4, 31.0] };
function ck() { return C && C.li && C.li().clock; }
function gameHour() { return G.s.gh; }
/* page clock hours = moon age days * 24 + local solar hour - 12 (the page's own rule); game hours are local solar hours since midnight of day 1 */
function clk0() { return Math.round(parseFloat(Q0.get('cm') || '9')) * 24 - 12; }
function clockTick(dt) {
  const c = ck(), s = G.s; if (!c) { s.gh += dt * 0.05; return; }
  if (G.clk0 === undefined) G.clk0 = clk0();
  s.gh = c.hours() - G.clk0;
  if (G.waitSpeed > 1.01) { c.freeze(false); c.setSpeed(G.waitSpeed); G.clockMode = 'wait'; return; }   /* Job 6b: wait for dawn */
  const st = stageOf(s), w = WIN[st] || WIN.done; let lo = w[0];
  if (st === 'jobs') lo = Math.min(w[1] - 0.2, w[0] + 1.15 * jobsDone(s) + (s.plank ? 0.6 : 0));
  const dayOff = Math.floor(s.gh / 24) * 24;                         /* windows are for day 1; later days just run at the quiet pace */
  if (dayOff >= 24 && st !== 'done') { c.freeze(false); c.setSpeed(0.3); return; }
  if (s.gh < lo - 0.04) { c.freeze(false); c.setSpeed(st === 'night' || st === 'evening' ? 3.5 : 3.0); G.clockMode = 'catch'; }
  else if (s.gh < w[1]) { c.freeze(false); c.setSpeed(0.07); G.clockMode = 'drift'; }
  else { c.freeze(true); G.clockMode = 'hold'; }
}
function weatherWant() {
  const s = G.s, st = stageOf(s), gh = s.gh;
  try { const sw = SHP() && SHP().weatherWant(); if (sw) return sw; } catch (e) { /* no storm layer */ }   /* a storm builds over the game: the storm layer names the weather while it runs */
  if (Math.floor(gh / 24) >= 1 && st === 'done') return 'auto';
  if (st === 'arrive' || st === 'dock') return 'clear';
  if (st === 'jobs') return gh > 8.4 && gh < 10.2 ? 'showers' : 'overcast';
  if (st === 'delivery') return s.crate1 ? 'fair' : 'fog';
  if (st === 'yard') return 'fair';
  if (st === 'evening') return 'goldenhour';
  return 'clear';
}
function weatherTick() {
  if (USER_WEATHER && USER_WEATHER !== 'auto') return;
  const l = C.li(), w = l.weatherRT; if (!w) return; const want = weatherWant(); if (want === G.weather) return; G.weather = want;
  try { w.set(want); } catch (e) { G.err.push('weather ' + e.message); }
}
function weatherState() { try { const l = C.li(); if (USER_WEATHER && USER_WEATHER !== 'auto' && /^[a-z]+$/.test(USER_WEATHER)) return USER_WEATHER; return G.weather || 'fair'; } catch (e) { return 'fair'; } }
function isRaining() { const w = weatherState(); return w === 'showers' || w === 'rain' || w === 'storm'; }
function isNight() { const c = ck(); if (!c) return false; try { return c.light().elev < -3; } catch (e) { return false; } }   /* sunDir() is the light direction (the moon at night), so the sun's own elevation is read */
function hhmm(g) { const hh = Math.floor(g % 24), mm = Math.floor((g % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
const dayNo = () => Math.floor(G.s.gh / 24) + 1;

/* ---------------- save and load ---------------- */
function save(force) {
  if (!SAVE_OK() && !force) return false;
  try { if (PHYS()) G.s.phys = PHYS().snapshot(); localStorage.setItem(SAVE_KEY, serialize(G.s)); G.savedAt = Date.now(); return true; } catch (e) { return false; }
}
function load() {
  if (!SAVE_OK()) return null;
  try { const t = localStorage.getItem(SAVE_KEY); return t ? deserialize(t) : null; } catch (e) { return null; }
}
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to do */ } }

/* ---------------- sites on the island ---------------- */
function siteInfo() {
  const W = C.W, f = W.camp && W.camp.fire; if (!f) return null;
  const rt = C.li().campstart && C.li().campstart.rt(), plan = C.li().campstart && C.li().campstart.plan();
  const ex = [];                                            /* exclusion circles: x, z, r */
  ex.push({ x: f.x, z: f.z, r: 3.8 }); (W.tents || []).forEach(t => ex.push({ x: t.x, z: t.z, r: 3.2 }));
  if (plan) { (plan.pieces || []).forEach(p => ex.push({ x: p.cx !== undefined ? p.cx : p.x, z: p.cz !== undefined ? p.cz : p.z, r: (p.fr || 2.5) + 0.8 })); }
  let yard = null; try { yard = rt && rt.yard(); } catch (e) { yard = null; } if (yard) ex.push({ x: yard.x, z: yard.z, r: 8.5 });
  let rp = null; try { rp = C.li().repair && C.li().repair.site(); } catch (e) { rp = null; } if (rp) ex.push({ x: rp.ox, z: rp.oz, r: 7 });
  return { f, dir: W.camp.dir || [1, 0], rt: W.camp.rt || [0, 1], shoreR: W.camp.shoreR || 8, ex, yard, jetty: rp, plan };
}
function free(S, x, z, r) { for (const o of S.ex) if (Math.hypot(o.x - x, o.z - z) < o.r + r) return false; return true; }
function slopeAt(x, z) { const e = 1.2, H = C.H; return Math.hypot((H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e)); }
function scan(S, o) {   /* best free ground near (o.x,o.z): height range, low slope, clear of everything, nearest to the wish */
  let best = null, bs = 1e9; const R = o.R || 24, step = o.step || 1.5;
  for (let dx = -R; dx <= R; dx += step) for (let dz = -R; dz <= R; dz += step) {
    const x = o.x + dx, z = o.z + dz, hh = C.H(x, z); if (hh < o.hmin || hh > o.hmax) continue; if (Math.hypot(x, z) > 100) continue;
    const sl = slopeAt(x, z); if (sl > (o.slope || .16)) continue; if (!free(S, x, z, o.r)) continue;
    let ok = true; for (const q of (o.avoid || [])) if (Math.hypot(q[0] - x, q[1] - z) < q[2]) { ok = false; break; } if (!ok) continue;
    const sc = Math.hypot(dx, dz) + sl * 18 + (o.hpref !== undefined ? Math.abs(hh - o.hpref) * 2 : 0); if (sc < bs) { bs = sc; best = { x, z, y: hh }; }
  }
  return best;
}
function waterPoint(x0, z0, dx, dz) {     /* walk seaward from a point on land to the waterline (h = 0.15) */
  let x = x0, z = z0; for (let i = 0; i < 160; i++) { if (C.H(x, z) < 0.15) return { x, z }; x += dx * .5; z += dz * .5; } return { x, z };
}
function computeSites() {
  const S = siteInfo(); if (!S) return null;
  const f = S.f, d = S.dir, r = S.rt, out = { S }, M = C.man ? C.man() : null;
  const shore = { x: f.x + d[0] * S.shoreR, z: f.z + d[1] * S.shoreR };
  out.shore = shore;
  /* the key crate: above the tideline a few metres along the beach from the camp shore, on the side away from the jetty */
  let kc = null; for (const k of [-6, 6, -9, 9, -4, 4, -12, 12]) { const x = shore.x - d[0] * 2.4 + r[0] * k, z = shore.z - d[1] * 2.4 + r[1] * k, hh = C.H(x, z); if (hh > 1.2 && hh < 2.4 && free(S, x, z, 1.8)) { kc = { x, z, y: hh }; break; } }
  out.crate = kc || scan(S, { x: shore.x - d[0] * 3, z: shore.z - d[1] * 3, R: 14, hmin: 1.2, hmax: 2.6, r: 1.8 }) || { x: f.x + 6, z: f.z, y: C.H(f.x + 6, f.z) };
  S.ex.push({ x: out.crate.x, z: out.crate.z, r: 2.4 });
  /* the tender's beach: along the shore on the other side, an open waterline with the drop spot a little inland */
  let td = null; for (const k of [9, -9, 12, -12, 15, -15]) { const sx = shore.x + r[0] * k - d[0] * 4, sz = shore.z + r[1] * k - d[1] * 4; const wp = waterPoint(sx, sz, d[0], d[1]); const dropx = wp.x - d[0] * 2.6, dropz = wp.z - d[1] * 2.6, hh = C.H(dropx, dropz);
    if (hh > 1.2 && hh < 2.6 && free(S, dropx, dropz, 2.2) && Math.hypot(dropx - out.crate.x, dropz - out.crate.z) > 5) { td = { wp, drop: { x: dropx, z: dropz, y: hh } }; break; } }
  if (!td) { const sc = scan(S, { x: shore.x + r[0] * 10, z: shore.z + r[1] * 10, R: 18, hmin: 1.2, hmax: 2.6, r: 2.2 }) || { x: shore.x, z: shore.z + 6, y: 1.5 }; td = { wp: waterPoint(sc.x, sc.z, d[0], d[1]), drop: sc }; }
  out.tender = td; S.ex.push({ x: td.drop.x, z: td.drop.z, r: 3.5 });
  /* the rusted hut: a low rise near the camp, between the fire and the island's middle */
  const hutWish = M && M.gift && M.gift.hut ? M.gift.hut : [f.x - d[0] * 14, f.z - d[1] * 14];
  out.hut = scan(S, { x: hutWish[0], z: hutWish[1], R: 22, hmin: 1.7, hmax: 3.6, r: 3.4, slope: .12, hpref: 2.9 }) || scan(S, { x: f.x - d[0] * 14, z: f.z - d[1] * 14, R: 30, hmin: 1.5, hmax: 4, r: 3.4 }) || { x: f.x - d[0] * 14, z: f.z - d[1] * 14, y: C.H(f.x - d[0] * 14, f.z - d[1] * 14) };
  S.ex.push({ x: out.hut.x, z: out.hut.z, r: 4.2 });
  out.hutYaw = Math.atan2(f.x - out.hut.x, f.z - out.hut.z);
  /* build sites */
  const near = out.hut, bs = {};
  bs.cottage = scan(S, { x: near.x - d[0] * 8 + r[0] * 6, z: near.z - d[1] * 8 + r[1] * 6, R: 26, hmin: 1.6, hmax: 3.6, r: 4.2, slope: .12 });
  if (bs.cottage) S.ex.push({ x: bs.cottage.x, z: bs.cottage.z, r: 5 });
  bs.kiosk = scan(S, { x: out.tender.drop.x - d[0] * 2, z: out.tender.drop.z - d[1] * 2, R: 22, hmin: 1.5, hmax: 3.2, r: 2.6, slope: .12 });
  if (bs.kiosk) S.ex.push({ x: bs.kiosk.x, z: bs.kiosk.z, r: 3.4 });
  bs.cistern = scan(S, { x: near.x + r[0] * 5, z: near.z + r[1] * 5, R: 18, hmin: 1.6, hmax: 3.6, r: 2.2, slope: .14 });
  if (bs.cistern) S.ex.push({ x: bs.cistern.x, z: bs.cistern.z, r: 3 });
  const sk = M && M.gift ? M.gift.skerries[1] : [72, 46];
  bs.hide = scan(S, { x: sk[0] - 14, z: sk[1] - 14, R: 40, hmin: 1.3, hmax: 3.0, r: 2.6, slope: .14, avoid: [[out.tender.drop.x, out.tender.drop.z, 10]] });
  if (bs.hide) S.ex.push({ x: bs.hide.x, z: bs.hide.z, r: 3.4 });
  out.build = bs;
  /* finds: along the lee beach in the washed band, deterministic by seed */
  const R = mulberry(hashStr('findsites:' + G.s.seed)), ids = pickFinds(G.s.seed, 6), fs = [];
  for (let tries = 0; tries < 1500 && fs.length < ids.length; tries++) {
    const k = (R() - .5) * 90, x0 = shore.x + r[0] * k - d[0] * (R() * 7) + d[0] * (R() * 3), z0 = shore.z + r[1] * k - d[1] * (R() * 7) + d[1] * (R() * 3), hh = C.H(x0, z0);
    if (hh < .25 || hh > 1.3 || slopeAt(x0, z0) > .5) continue; if (!free(S, x0, z0, .9)) continue; if (fs.some(q => Math.hypot(q.x - x0, q.z - z0) < 3.2)) continue;
    fs.push({ id: ids[fs.length], x: x0, z: z0, y: hh, taken: false });
  }
  out.finds = fs;
  const wreck = (S.plan && S.plan.pieces || []).find(p => p.kind === 'relic_hull'); out.wreck = wreck ? { x: wreck.cx !== undefined ? wreck.cx : wreck.x, z: wreck.cz !== undefined ? wreck.cz : wreck.z } : null;
  const barrel = (S.plan && S.plan.pieces || []).find(p => p.kind === 'rain_barrel'), lean = (S.plan && S.plan.pieces || []).find(p => p.kind === 'lean_to');
  out.barrel = barrel ? { x: barrel.cx !== undefined ? barrel.cx : barrel.x, z: barrel.cz !== undefined ? barrel.cz : barrel.z, kit: true } : null;
  out.lean = lean ? { x: lean.cx !== undefined ? lean.cx : lean.x, z: lean.cz !== undefined ? lean.cz : lean.z } : null;
  if (!out.barrel) { const b = scan(S, { x: out.hut.x + 5, z: out.hut.z, R: 12, hmin: 1.5, hmax: 3.6, r: 1.2 }) || { x: out.hut.x + 5, z: out.hut.z, y: out.hut.y }; out.barrel = { x: b.x, z: b.z, kit: false }; }
  out.stump = M && M.gift ? { x: M.gift.stump[0], z: M.gift.stump[1] } : null;
  const dist = Math.min(100, C.tableR() - 14); out.ship = { x: f.x * .3 + d[0] * dist, z: f.z * .3 + d[1] * dist };
  const L = Math.hypot(out.ship.x, out.ship.z); if (L > dist) { out.ship.x *= dist / L; out.ship.z *= dist / L; }
  return out;
}

/* ---------------- 3D pieces (low poly, our own, placeholders marked as such) ---------------- */
function canvasTex(w, hgt, draw) { const c = document.createElement('canvas'); c.width = w; c.height = hgt; draw(c.getContext('2d'), w, hgt); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
function lambert(col, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: .85, metalness: .02, flatShading: true }, o || {})); }
function shadowed(m) { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; }
function groundY(x, z) { return Math.max(C.H(x, z), -0.3); }
function labelSprite(text, w, hgt) {
  const t = canvasTex(512, 128, (g, W, Hh) => { g.fillStyle = 'rgba(255,248,230,.95)'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#b44'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, Hh - 6); g.fillStyle = '#7a2a2a'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, Hh / 2); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(w, hgt, 1); sp.renderOrder = 20; return sp;
}
function mkCrate(num, open) {
  const g = new THREE.Group(), wood = lambert(0x9a7448), dark = lambert(0x6e5233);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, .72, .8), wood); b.position.y = .36; g.add(b);
  for (const z of [-.28, 0, .28]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.14, .1, .06), dark); s.position.set(0, .5, z * 1.4 + (z ? 0 : 0)); g.add(s); }
  for (const x of [-.5, .5]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.08, .76, .84), dark); s.position.set(x, .38, 0); g.add(s); }
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.14, .06, .84), wood); lid.position.set(0, .75, 0); g.add(lid); g.userData.lid = lid;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(.5, .28), new THREE.MeshBasicMaterial({ map: canvasTex(128, 72, (c, W, Hh) => { c.fillStyle = '#f4ead0'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#a89868'; c.lineWidth = 3; c.strokeRect(2, 2, W - 4, Hh - 4); c.fillStyle = '#3a2d1c'; c.font = 'bold 26px Georgia,serif'; c.textAlign = 'center'; c.fillText(num ? 'No. ' + String(num).padStart(4, '0') : 'FOR YOU', W / 2, 34); c.beginPath(); c.arc(W / 2, 54, 9, 0, 6.3); c.lineWidth = 3; c.stroke(); c.fillRect(W / 2 - 1, 44, 12, 4); }) }));
  lab.position.set(0, .4, .41); g.add(lab);
  if (open) lid.position.set(.2, .98, -.32), lid.rotation.x = -.9;
  return shadowed(g);
}
function mkKey() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: .65, roughness: .32 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 6, 12), m); ring.position.set(0, 0, 0); g.add(ring);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .26, 6), m); sh.rotation.z = Math.PI / 2; sh.position.set(.2, 0, 0); g.add(sh);
  for (const x of [.28, .33]) { const t = new THREE.Mesh(new THREE.BoxGeometry(.04, .08, .03), m); t.position.set(x, -.05, 0); g.add(t); }
  g.scale.setScalar(1.6); return g;
}
function mkHut() {
  const g = new THREE.Group();
  const rustTex = canvasTex(256, 256, (c, W, Hh) => { c.fillStyle = '#9b4f2a'; c.fillRect(0, 0, W, Hh); const R = mulberry(7); for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(' + (60 + R() * 120 | 0) + ',' + (30 + R() * 50 | 0) + ',' + (10 + R() * 30 | 0) + ',' + (.1 + R() * .3) + ')'; c.fillRect(R() * W, R() * Hh, 2 + R() * 14, 6 + R() * 50); } c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 2; for (let x = 0; x < W; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, Hh); c.stroke(); } });
  rustTex.wrapS = rustTex.wrapT = THREE.RepeatWrapping;
  const wall = lambert(0xffffff, { map: rustTex, roughness: .95 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.3, 3.2), wall); box.position.y = 1.15; g.add(box);
  const roofM = lambert(0x8a5a3c, { map: rustTex }); roofM.color.setHex(0xe0b090);
  for (const sgn of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(4.8, .09, 1.95), roofM); r.position.set(0, 2.62, sgn * .85); r.rotation.x = sgn * .42; g.add(r); }
  const door = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.7, .08), lambert(0x4a3020)); door.position.set(-.9, .88, 1.62); g.add(door); g.userData.door = door;
  const dark = lambert(0x1c130d); const win = new THREE.Mesh(new THREE.BoxGeometry(.8, .6, .06), dark); win.position.set(1.0, 1.35, 1.62); g.add(win);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 1.0, 8), lambert(0x5a4a40)); pipe.position.set(1.4, 3.1, -.4); g.add(pipe);
  const patch = new THREE.Mesh(new THREE.BoxGeometry(1.6, .06, 1.1), lambert(0xb9bfc2, { metalness: .4 })); patch.position.set(.6, 2.85, .98); patch.rotation.x = .42; patch.visible = false; g.add(patch); g.userData.patch = patch;
  return shadowed(g);
}
function mkTarp() {
  const geo = new THREE.PlaneGeometry(3.4, 2.6, 8, 6), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -.25 * (1 - (x / 1.7) ** 2) + .05 * Math.sin(y * 3)); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4b82a8, roughness: .7, side: THREE.DoubleSide, flatShading: true })); m.rotation.x = -1.15; m.position.y = 2.1;
  const g = new THREE.Group(); g.add(m);
  for (const x of [-1.7, 1.7]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 2.4, 6), lambert(0x6e5233)); po.position.set(x, 1.2, 1.05); g.add(po); }
  return shadowed(g);
}
function boatShape(L, Wd) { const s = new THREE.Shape(); s.moveTo(-L / 2, -Wd * .42); s.lineTo(L * .18, -Wd / 2); s.quadraticCurveTo(L * .42, -Wd * .3, L / 2, 0); s.quadraticCurveTo(L * .42, Wd * .3, L * .18, Wd / 2); s.lineTo(-L / 2, Wd * .42); s.lineTo(-L / 2, -Wd * .42); return s; }
function mkTender() {
  const g = new THREE.Group(), L = 5.2, Wd = 1.9;
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(boatShape(L, Wd), { depth: .6, bevelEnabled: false }), lambert(0x2f5f6b)); hull.rotation.x = Math.PI / 2; hull.position.y = .5; g.add(hull);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(boatShape(L * .9, Wd * .82)), lambert(0xc9b78d)); deck.rotation.x = -Math.PI / 2; deck.position.y = .52; g.add(deck);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(L * .82, .07, Wd * 1.0), lambert(0xf0ead8)); stripe.position.y = .45; stripe.scale.z = .98; g.add(stripe);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(.5, .6, .5), lambert(0x38404a)); motor.position.set(-L / 2 + .15, .7, 0); g.add(motor);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.3, .6, 1.0), lambert(0xb9a98a)); cover.position.set(-.1, .8, 0); g.add(cover); g.userData.cargo = cover;
  g.userData.L = L; return shadowed(g);
}
function mkShip() {
  const g = new THREE.Group(), L = 30, Wd = 8;
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(boatShape(L, Wd), { depth: 3.4, bevelEnabled: false }), lambert(0x3d4650)); hull.rotation.x = Math.PI / 2; hull.position.y = 2.3; g.add(hull);
  const band = new THREE.Mesh(new THREE.BoxGeometry(L * .78, .5, Wd * .98), lambert(0xa83a2f)); band.position.set(-1, 2.2, 0); g.add(band);
  const house = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5), lambert(0xe4e0d4)); house.position.set(-6, 4.6, 0); g.add(house);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 4.2), lambert(0xe4e0d4)); bridge.position.set(-6.5, 7, 0); g.add(bridge);
  const fun = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, 3, 8), lambert(0x33393f)); fun.position.set(-9.5, 6, 0); g.add(fun);
  for (const x of [4, 9]) { const c = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 5), lambert(0x6a7a4a)); c.position.set(x, 4, 0); g.add(c); }
  return shadowed(g);
}
function mkBottle() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x6fb9a8, transparent: true, opacity: .7, roughness: .1, metalness: .1 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .36, 10), m); b.rotation.z = Math.PI / 2; b.position.y = .1; g.add(b);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .15, 8), m); n.rotation.z = Math.PI / 2; n.position.set(.25, .1, 0); g.add(n);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .04, 6), lambert(0xb08050)); c.rotation.z = Math.PI / 2; c.position.set(.34, .1, 0); g.add(c);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .24, 6), lambert(0xf2e8c8)); p.rotation.z = Math.PI / 2; p.position.set(-.02, .1, 0); g.add(p);
  g.scale.setScalar(2.2); return g;
}
function mkFind(id) {
  const g = new THREE.Group();
  const add = (geo, col, o) => { const m = new THREE.Mesh(geo, lambert(col, o)); g.add(m); return m; };
  switch (id) {
    case 'float': { const m = add(new THREE.SphereGeometry(.22, 10, 8), 0x58b8a4, { transparent: true, opacity: .85, roughness: .2 }); m.position.y = .2; break; }
    case 'rope': { const m = add(new THREE.TorusGeometry(.26, .06, 5, 12), 0xb19a6b); m.rotation.x = Math.PI / 2; m.position.y = .08; const m2 = add(new THREE.TorusGeometry(.16, .05, 5, 10), 0xa68f60); m2.rotation.x = Math.PI / 2; m2.position.y = .16; break; }
    case 'plank': { const m = add(new THREE.BoxGeometry(1.3, .07, .2), 0x8f8c84); m.position.y = .06; m.rotation.y = .5; break; }
    case 'buoy': { const m = add(new THREE.SphereGeometry(.24, 8, 6), 0xc2503f); m.position.y = .22; m.scale.y = .8; const t = add(new THREE.CylinderGeometry(.1, .1, .1, 6), 0xe8e2d0); t.position.y = .42; break; }
    case 'tin': { const m = add(new THREE.CylinderGeometry(.22, .22, .03, 12), 0xcfd2d4, { metalness: .6, roughness: .4 }); m.position.y = .04; break; }
    case 'shell': { const m = add(new THREE.ConeGeometry(.16, .34, 7), 0xe9dcc6); m.rotation.z = 1.2; m.position.y = .12; break; }
    case 'crate': { const m = add(new THREE.BoxGeometry(.7, .3, .45), 0x9a7448); m.position.y = .15; m.rotation.y = .7; m.rotation.z = .1; break; }
    default: { const m = add(new THREE.SphereGeometry(.28, 6, 5), 0x6a6a52); m.scale.y = .4; m.position.y = .1; }
  }
  return shadowed(g);
}
function mkBlock(kind) {   /* labelled placeholder blocks for the buildings the kit does not have yet */
  const g = new THREE.Group(); let w = 4, d = 3.4, hgt = 2.6, col = 0xd8c9a8;
  if (kind === 'kiosk') { w = 2.6; d = 2.2; hgt = 2.2; col = 0xe0b86a; }
  if (kind === 'hide') { w = 3.2; d = 1.8; hgt = 1.8; col = 0x7d6a4a; }
  if (kind === 'cistern') { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.2, 14), lambert(0x8a9aa0)); c.position.y = 1.1; g.add(c); }
  else {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), lambert(col)); b.position.y = hgt / 2; g.add(b);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * .78, hgt * .5, 4), lambert(kind === 'hide' ? 0x4a3f2c : 0x8a3f33)); roof.rotation.y = Math.PI / 4; roof.position.y = hgt + hgt * .25; roof.scale.set(1, 1, d / w); g.add(roof);
    if (kind === 'hide') { const sl = new THREE.Mesh(new THREE.BoxGeometry(2.0, .14, .06), lambert(0x15100a)); sl.position.set(0, 1.2, d / 2 + .02); g.add(sl); }
    if (kind === 'kiosk') { const aw = new THREE.Mesh(new THREE.BoxGeometry(w + .6, .08, 1.0), lambert(0x3f7fb2)); aw.position.set(0, 1.7, d / 2 + .5); aw.rotation.x = .25; g.add(aw); }
  }
  const lab = labelSprite('PLACEHOLDER: ' + kind, 4.4, 1.1); lab.position.set(0, hgt + 2.0, 0); g.add(lab);
  return shadowed(g);
}
function mkSeal() { const g = new THREE.Group(), m = lambert(0x7b6e63); const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), m); b.scale.set(1.5, .55, .7); b.position.y = .3; g.add(b); const hd = new THREE.Mesh(new THREE.SphereGeometry(.22, 7, 6), m); hd.position.set(.7, .42, 0); g.add(hd); return shadowed(g); }
function glowTex() { return canvasTex(128, 128, (c, W) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(.25, 'rgba(255,200,100,.5)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); }); }
function mkRing(col) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1.15, 32), new THREE.MeshBasicMaterial({ color: col || 0xffe9a8, transparent: true, opacity: .0, depthTest: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = 19; return m; }
function place(o, p, yaw, lift) { o.position.set(p.x, groundY(p.x, p.z) + (lift || 0), p.z); if (yaw !== undefined) o.rotation.y = yaw; return o; }

/* ---------------- building the scene pieces ---------------- */
function isAR() { return Q0.get('tier') === 'ar' || Q0.get('device') === 'ar' || Q0.get('clockdome') === '0'; }   /* the page's own AR rule: tier=ar, or the clock without its dome */
function buildWorld() {
  const sites = computeSites(); if (!sites) return false; G.ar = isAR();
  if (G.ar) sites.finds = sites.finds.slice(0, 3);          /* AR refuses the heavy parts: no seals, no kit stump model, three finds */
  G.spots = sites; const root = new THREE.Group(); root.name = 'gift_day'; G.root = root; C.scene.add(root);
  const O = G.objs = {};
  /* the crate with the key, the hut */
  O.crate = place(mkCrate(0), sites.crate, 0.4); O.crate.userData.num = 0; root.add(O.crate);
  const key = mkKey(); key.position.set(-.25, .86, .0); key.rotation.z = .3; O.crate.add(key); O.key = key;
  O.hut = place(mkHut(), sites.hut, sites.hutYaw); root.add(O.hut);
  O.tarp = place(mkTarp(), { x: sites.hut.x + Math.cos(sites.hutYaw) * 4.4, z: sites.hut.z - Math.sin(sites.hutYaw) * 4.4 }, sites.hutYaw); O.tarp.visible = false; root.add(O.tarp);
  /* placeholder barrel only when the kit barrel is not in this tier */
  if (!sites.barrel.kit) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.5, .45, .9, 10), lambert(0x6e5233)); place(b, sites.barrel, 0, .45); root.add(b); O.barrelPh = b; b.add((() => { const l = labelSprite('PLACEHOLDER: barrel', 3.2, .8); l.position.y = 1.6; return l; })()); }
  /* finds */
  O.finds = sites.finds.map(f => { const m = mkFind(f.id); place(m, f, Math.random() * 0); m.rotation.y = (hashStr(f.id + f.x) % 628) / 100; root.add(m); return m; });
  /* ship and tender, delivery crates */
  O.ship = mkShip(); O.ship.visible = false; root.add(O.ship);
  O.tender = mkTender(); O.tender.visible = false; root.add(O.tender);
  O.crates = []; O.bottle = mkBottle(); O.bottle.visible = false; root.add(O.bottle);
  /* build sites: ghost rings and the placeholder block when built */
  O.builds = {}; for (const id of Object.keys(sites.build)) { const p = sites.build[id]; if (!p) continue; const m = id === 'jetty' ? null : mkBlock(id); if (!m) continue; place(m, p, sites.hutYaw + .3); m.visible = false; root.add(m); O.builds[id] = m; }
  /* skerry seals (placeholder blobs) */
  O.seals = []; const M = C.man ? C.man() : null; if (!G.ar && M && M.gift) M.gift.skerries.forEach((s, i) => { for (let k = 0; k < 2; k++) { const sl = mkSeal(); const x = s[0] + (k ? 1.4 : -1), z = s[1] + (k ? -.8 : .9); sl.position.set(x, Math.max(C.H(x, z), 0.2) + 0.05, z); sl.rotation.y = i * 2 + k; sl.userData.base = sl.position.y; root.add(sl); O.seals.push(sl); } });
  /* the stump on the headland and its lamp */
  if (sites.stump) { const y = C.H(sites.stump.x, sites.stump.z); const st = new THREE.Group(); st.position.set(sites.stump.x, y, sites.stump.z); const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.8, 4.6, 10), lambert(0xa49b8a)); cone.position.y = 2.3; st.add(cone); const top = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.3, .4, 10), lambert(0x6b655a)); top.position.y = 4.8; st.add(top); shadowed(st); O.stumpFallback = st; root.add(st);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, depthTest: false })); gl.scale.set(5, 5, 1); gl.position.set(sites.stump.x, y + 5.4, sites.stump.z); gl.renderOrder = 18; root.add(gl); O.stumpGlow = gl; loadStump(sites.stump, y); }
  if (sites.stump) stumpPlinth(sites.stump, C.H(sites.stump.x, sites.stump.z), 1.9);
  O.ring = mkRing(); root.add(O.ring);
  return true;
}
/* THE LIGHTHOUSE STUMP'S BASE (Job 6c item 5; owner: "looking underneath it, is that meant to look like that?"): the stump stands on its centre height, so on the sloping headland the downhill side hung in the air and the underside showed a gap.
   A rock plinth (one mesh, a short wide cone about 50 triangles) is sunk below the lowest ground round the base and rises a little above the centre, so any slope meets stone. It is resized to the model when the kit stump loads. */
function stumpPlinth(p, y, r0) {
  const T = THREE, O = G.objs; let lo = y; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; for (const f of [1, 1.4]) lo = Math.min(lo, C.H(p.x + Math.cos(a) * r0 * f, p.z + Math.sin(a) * r0 * f)); }
  const top = y + .3, bot = lo - .7, hgt = top - bot, drop = y - lo;
  if (!O.stumpPlinth) { const m = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 16, 1, false), lambert(0x8a8272)); m.name = 'stumpPlinth'; shadowed(m); G.root.add(m); O.stumpPlinth = m; }
  const m = O.stumpPlinth; m.geometry.dispose(); m.geometry = new T.CylinderGeometry(r0 + .12, r0 + .5 + drop * .8, hgt, 16, 1, false); m.position.set(p.x, bot + hgt / 2, p.z); m.userData.plinth = { x: p.x, z: p.z, top, bot, r0, rBot: r0 + .5 + drop * .8 };
}
function loadStump(p, y) {   /* the kit's lighthouse stump (live level) from its base64 twin; the plain cone stands in until it loads and if it fails (and always under AR) */
  if (G.ar || !C.THREE.GLTFLoader || Q0.get('giftkit') === 'fail') return;
  const use = () => { try { const b64 = window.LI_KIT_GLB && window.LI_KIT_GLB.lighthouse_stump_live; if (!b64) return; const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    new C.THREE.GLTFLoader().parse(u.buffer, '', gl => { try { const m = gl.scene; m.position.set(p.x, y - .03, p.z); m.scale.setScalar(1.3); shadowed(m); G.root.add(m); G.objs.stumpKit = m; if (G.objs.stumpFallback) G.objs.stumpFallback.visible = false;
      const bb = new THREE.Box3().setFromObject(m); G.objs.stumpGlow.position.y = Math.max(bb.max.y - .5, y + 3); stumpPlinth(p, y, Math.max(1.9, Math.min(3.2, Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2 + .1))); } catch (e) { G.err.push('stump ' + e.message); } }, () => { /* fallback stays */ }); } catch (e) { G.err.push('stump ' + e.message); } };
  if (window.LI_KIT_GLB && window.LI_KIT_GLB.lighthouse_stump_live) { use(); return; }
  const s = document.createElement('script'); s.src = 'assets/gift/stump_b64.js'; s.onload = use; s.onerror = () => { /* the cone stays */ }; document.head.appendChild(s);
}

/* ---------------- targets and taps ---------------- */
const PHYS = () => root.LI_PHYS && root.LI_PHYS.page && G.physOn ? root.LI_PHYS.page : null;   /* the physical layer (physical.js), when it is on the page */
const SHP = () => root.LI_STORM && root.LI_STORM.page && G.stormOn ? root.LI_STORM.page : null;   /* the storm and haul layer (storm.js), when it is on the page */
const BDP = () => root.LI_BOAT_DRIVE && root.LI_BOAT_DRIVE.page;   /* the boat layer, when boat_drive.js is on the page */
const _v = () => new THREE.Vector3();
function screenOf(x, y, z) {
  const v = _v().set(x, y, z); C.camera.updateMatrixWorld(); v.project(C.camera); if (v.z > 1 || v.z < -1) return null;
  const r = C.renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x * .5 + .5) * r.width, y: r.top + (1 - (v.y * .5 + .5)) * r.height };
}
function targets() {
  const T = [], S = G.spots, s = G.s, O = G.objs; if (!S) return T;
  const add = (id, p, up, rad, ok) => { if (ok === false) return; const sc = screenOf(p.x, groundY(p.x, p.z) + up, p.z); if (sc) T.push({ id, x: sc.x, y: sc.y, r: rad }); };
  add('crate0', S.crate, .5, 52, !s.letter1 || !G.crateDone);
  add('hut', S.hut, 1.3, 70);
  if (S.lean) add('lean', S.lean, 1.2, 56);
  add('barrel', S.barrel, .6, 48);
  S.finds.forEach((f, i) => add('find' + i, f, .2, 44, !f.taken));
  if (S.wreck) add('wreck', S.wreck, 1.4, 60);
  G.crates && G.crates.forEach((c, i) => { if (c.mesh && c.mesh.visible) add('crate' + (i + 1), c.pos, .5, 52); });
  const rt = C.li().campstart && C.li().campstart.rt(); let bots = []; try { bots = rt ? rt.robots() : []; } catch (e) { bots = []; }
  try { const B = G.objs.bays; if (B && B.list) B.list.forEach(b => { const sc = screenOf(b.x, groundY(b.x, b.z) + .5, b.z); if (sc) T.push({ id: 'bay_' + b.id, x: sc.x, y: sc.y, r: 40 }); }); } catch (e) { /* none */ }
  bots.forEach(b => { if (b.ready) { const sc = screenOf(b.x, b.y + .9, b.z); if (sc) T.push({ id: 'bot' + b.id, x: sc.x, y: sc.y, r: 60 }); } });
  try { if (BDP() && BDP().targets) BDP().targets().forEach(t => T.push(t)); } catch (e) { G.err.push('boat targets ' + e.message); }
  try { if (G.fit && fitReady() && O.post) { const sc = screenOf(O.post.position.x, groundY(O.post.position.x, O.post.position.z) + 1.5, O.post.position.z); if (sc) T.push({ id: 'fitpost', x: sc.x, y: sc.y, r: 64 }); } handTargets().forEach(t => T.push(t)); } catch (e) { G.err.push('hand targets ' + e.message); }
  try { if (PHYS()) PHYS().targets().forEach(t => T.push(t)); } catch (e) { G.err.push('phys targets ' + e.message); }
  try { if (SHP()) SHP().targets().forEach(t => T.push(t)); } catch (e) { G.err.push('storm targets ' + e.message); }
  try { const xi = exploreInfo(); if (xi) { const sc = screenOf(xi.pos.x, C.tide() + 1.5, xi.pos.z); if (sc) T.push({ id: 'dest', x: sc.x, y: sc.y, r: 64 }); } } catch (e) { /* none */ }
  if (O.bottle && O.bottle.visible && G.bottleOn) { const p = O.bottle.position; const sc = screenOf(p.x, p.y + .2, p.z); if (sc) T.push({ id: 'bottle', x: sc.x, y: sc.y, r: 56 }); }
  return T;
}

/* ---------------- the INSPECT layer (OWNER 25 Nov: "anything you can interact with should light up and tell you exactly what it is and what it is used for") ----------------
   Desktop: hover an object and a soft ring and a small card show its name, what it is for, what it needs and what the action is. Touch: a first tap opens the same card with the action button, the second tap on the
   action (or on the object again) does it; a tap elsewhere closes it. Three classes: GOLD = the one next thing that needs you (a pulsing soft gold ring), WHITE = interactive, not urgent (a soft white ring, on hover or tap),
   LOCKED = it cannot be used yet: a dim ring and the reason, never a glow. The words are in ONE table (INSPECT below; physical.js has the same kind of table for its own objects, info(id)): id pattern, name, use, needs, action. */
const INSPECT = [
  { re: /^crate0$/, f: s => ({ name: 'The crate', use: 'Washed up on the beach. A brass key hangs from the lid.', needs: null, action: s.letter1 ? 'Read the letter again' : 'Lift the lid' }) },
  { re: /^hut$/, f: s => ({ name: 'The hut', use: 'Your shelter. The door sticks.', needs: 'The brass key from the crate', action: 'Look inside' }) },
  { re: /^lean$/, f: () => ({ name: 'The lean-to', use: 'A dry place out of the rain.', needs: null, action: 'Look' }) },
  { re: /^barrel$/, f: () => ({ name: 'Water barrel', use: 'Catches rain. Rain is the only water on this island.', needs: null, action: 'Check it' }) },
  { re: /^find\d+$/, f: () => ({ name: 'Something on the shore', use: 'A small find washed up by the tide.', needs: null, action: 'Pick it up' }) },
  { re: /^wreck$/, f: s => ({ name: 'The old hull', use: 'An old hull on the shore. A track link may be inside.', needs: null, action: 'Look' }) },
  { re: /^crate\d+$/, f: (s, id) => { const c = G.crates[parseInt(id.slice(5), 10) - 1] || {}, n = c.n || id.slice(5); return { name: 'Crate number ' + n, use: c.letter2 ? 'The evening boat left it. A letter lies on top.' : c.item ? 'A delivery from the boat: ' + ((itemById(c.item) || {}).name || 'goods') + '.' : 'Supplies from the boat.', needs: c.phys && c.phys.heavy ? 'A robot and you together: tap to call one' : null, action: c.phys && c.phys.heavy ? 'Tap to call a robot' : c.letter2 && !s.letter2 ? 'Open it' : 'Open', locked: (() => { try { return PHYS() && PHYS().crateLock ? PHYS().crateLock(+n) : null; } catch (e) { return null; } })() }; } },
  { re: /^bot\d+$/, f: (s, id) => { const i = parseInt(id.slice(3), 10), b = robotState(i), on = s.robots[i], note = PHYS() && PHYS().robotNote ? PHYS().robotNote(i) : null; const sto = on ? stopOf(i) : null; if (note) return Object.assign({ name: 'Carrier ' + (i + 1) }, note, sto ? { use: sto.say + ' ' + (note.use || '') } : {}); if (sto) return { name: 'Carrier ' + (i + 1), use: sto.say, needs: sto.code === 'wait_player' ? 'You: tap to give it an order' : sto.code === 'wait_supplies' ? 'Supplies from your boat' : 'Nothing from you: it handles this itself', action: 'Open its card' }; return { name: 'Carrier ' + (i + 1), use: on ? 'An old machine that gathers washed-up stock for the yard. Its light shows how it is.' : 'An old machine, switched off. Dust in the tracks, one worn link.', needs: on ? (b && typeof b.charge === 'number' ? 'Battery ' + Math.round(b.charge * 100) + ' percent. ' : '') + (((s.jobs || [])[i]) ? 'Order: ' + (stockById((s.jobs || [])[i]) || {}).name : 'No order yet') : 'A track link (parts: ' + s.parts + ')', action: on ? 'Give an order' : 'Fit a part', locked: !on && !s.parts ? 'It needs a track link first' : null }; } },
  { re: /^dest$/, f: () => { const i = exploreInfo(); return i ? { name: i.name, use: i.line, needs: 'A row of about ' + Math.round(i.dist) + ' m. Follow the gold arrow.', action: 'Show the way' } : null; } },
  { re: /^bottle$/, f: () => ({ name: 'The bottle', use: 'A message in a bottle.', needs: null, action: 'Read it' }) },
  { re: /^fitpost$/, f: () => ({ name: 'The charging post', use: 'The carrier stands in its bay. Hold here while the old part comes out and the new one goes in.', needs: 'Your hands, a few seconds', action: 'Hold to fit' }) },
  { re: /^litter\d+$/, f: (st, id) => { const i = parseInt(id.slice(6), 10), w = (() => { try { return C.li().campstart.rt().sim().pl.work[i]; } catch (e) { return null; } })(), wr = w && root.LI_CAMP && root.LI_CAMP.wrackOf(w, i); return ({ name: wr === 'planks' ? 'Drift timber' : wr === 'rope' ? 'Drift rope' : 'Shore litter', use: (wr ? 'Washed up at the tide line. The tide leaves a little more every few hours. ' : 'Washed-up scraps. ') + 'A robot on a matching order gathers them; you can too.', needs: 'Hold: ' + rateText(null), action: 'Hold to gather' }); } },
  { re: /^bay_[a-z]+$/, f: (st, id) => { const t = bayInfo(id); return t ? { name: t.name, use: t.use, needs: t.flow, action: 'Look' } : null; } },
  { re: /^(hulk|heap\d+)$/, f: () => ({ name: 'Washed-up stock', use: 'What the storm left on the shore.', needs: 'A robot with an order, or your hands', action: 'Look' }) },
  { re: /^boat$/, f: () => ({ name: 'Your rowing boat', use: 'Row to the supplies, the skerry and the landings.', needs: null, action: 'Board' }) }
];
function inspectInfo(id) {
  const s = G.s; let i = null;
  try { if (PHYS() && PHYS().info) i = PHYS().info(id); } catch (e) { i = null; }
  if (!i) { const e = INSPECT.find(q => q.re.test(id)); if (e) { try { i = e.f(s, id); } catch (x) { i = null; } } }
  if (!i) return null; return Object.assign({ id, needs: null, action: null, locked: null }, i);
}
function goldId() { try { const g = PHYS() && PHYS().goldId && PHYS().goldId(); if (g) return g; } catch (e) { /* none */ } const s = G.s; if (!s.letter1 && !G.crateDone) return 'crate0'; if (exploreInfo() && exploreHint(s)) return 'dest'; return null; }
const INS = { hov: null, hovT: 0, sel: null, el: null, ring: null, gring: null, mx: -1, my: -1, coarse: false };
function inspectDom() {
  if (INS.el) return; const d = (cls, css) => { const e = document.createElement('div'); e.className = cls; e.style.cssText = css; document.body.appendChild(e); return e; };
  INS.el = d('gd-ins', 'position:fixed;z-index:9;display:none;max-width:236px;padding:8px 11px;border-radius:12px;background:rgba(251,246,236,.96);border:2px solid #cdbb98;color:#2b2118;font:13px/1.3 Georgia,serif;pointer-events:none;box-shadow:0 2px 10px rgba(40,25,10,.25)');
  INS.ring = d('gd-ring', 'position:fixed;z-index:6;display:none;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;pointer-events:none;border:2px solid rgba(255,255,255,.85);box-shadow:0 0 14px 4px rgba(255,255,255,.55),inset 0 0 12px 2px rgba(255,255,255,.35)');
  INS.gring = d('gd-ring gold', 'position:fixed;z-index:6;display:none;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;pointer-events:none;border:2px solid rgba(255,208,80,.95);box-shadow:0 0 16px 5px rgba(255,200,60,.6),inset 0 0 12px 2px rgba(255,200,60,.35);animation:gdp 1.6s ease-in-out infinite');
}
function inspectCls(id, info) { if (info.locked) return 'locked'; return id === goldId() ? 'gold' : 'white'; }
function showInspect(t, touch) {
  inspectDom(); const info = inspectInfo(t.id); if (!info) { hideInspect(); return false; } const cls = inspectCls(t.id, info), el = INS.el;
  el.innerHTML = '<b style="font-size:14px">' + info.name + '</b>' + (cls === 'gold' ? ' <span style="color:#a67800;font-size:11px;font-weight:700">NEXT</span>' : '') + (cls === 'locked' ? ' <span style="color:#7a6a58;font-size:11px;font-weight:700">LOCKED</span>' : '') + '<div>' + info.use + '</div>' + (info.locked ? '<div style="color:#8a4a2a"><small>' + info.locked + '</small></div>' : info.needs ? '<div><small>Needs: ' + info.needs + '</small></div>' : '') + (info.action ? '<div style="margin-top:4px;font-weight:700;color:' + (info.locked ? '#7a6a58' : '#1f4fb0') + '">' + (touch ? '' : 'Click: ') + info.action + '</div>' : '');
  if (touch && info.action && !info.locked) { const b = btn(info.action, () => { hideInspect(); activate(t.id); }, 'pri'); b.style.cssText = 'margin-top:6px;min-height:46px;width:100%'; b.id = 'gd-ins-act'; el.appendChild(b); el.style.pointerEvents = 'auto'; } else el.style.pointerEvents = 'none';
  el.style.display = 'block'; INS.sel = { id: t.id, touch }; INS.cur = t; inspectPlace(t, true); return true;
}
function inspectPlace(t, force) {
  const el = INS.el; if (!el || el.style.display === 'none') return; if (!force && INS.pp && Math.hypot(INS.pp.x - t.x, INS.pp.y - t.y) < 24) return; INS.pp = { x: t.x, y: t.y };   /* a bobbing object must not drag the card (and its button) about: it moves only when the object has moved on a little */ const w = el.offsetWidth || 220, h2 = el.offsetHeight || 80, W = innerWidth, H = innerHeight;
  let x = t.x - w / 2, y = t.y - h2 - 44; if (y < 110) y = t.y + 40; x = Math.max(10, Math.min(W - w - 10, x)); y = Math.max(110, Math.min(H - h2 - 150, y)); el.style.left = x + 'px'; el.style.top = y + 'px';
}
function hideInspect() { INS.sel = null; INS.cur = null; if (INS.el) INS.el.style.display = 'none'; if (INS.ring) INS.ring.style.display = 'none'; }
function nearestTarget(cx, cy) { let best = null, bd = 1e9; for (const t of targets()) { const d = Math.hypot(t.x - cx, t.y - cy), lim = t.r * (INS.coarse ? 1.15 : 1) * (C.ui ? Math.max(1, C.ui()) : 1); if (d < lim && d < bd) { bd = d; best = t; } } return best; }
function inspectMove(e) {
  if (INS.coarse || e.pointerType === 'touch' || G.cardOpen) return; INS.mx = e.clientX; INS.my = e.clientY; if (e.buttons) return;
  const t = nearestTarget(e.clientX, e.clientY); if (!t) { if (INS.hov) { INS.hov = null; hideInspect(); } return; } if (!INS.hov || INS.hov.id !== t.id) { INS.hov = t; showInspect(t, false); }
}
function inspectTick(dt) {
  if (!INS.el) return; const t = INS.cur; if (t && INS.sel) { const fresh = targets().find(q => q.id === t.id); if (fresh) { INS.cur = fresh; inspectPlace(fresh); INS.ring.style.left = fresh.x + 'px'; INS.ring.style.top = fresh.y + 'px'; const info = inspectInfo(fresh.id), cls = info && inspectCls(fresh.id, info); INS.ring.style.display = 'block'; INS.ring.style.opacity = cls === 'locked' ? '.35' : '1'; } else hideInspect(); }
  const gid = goldId(), gt = gid && !G.cardOpen ? targets().find(q => q.id === gid) : null; if (gt) { INS.gring.style.left = gt.x + 'px'; INS.gring.style.top = gt.y + 'px'; INS.gring.style.display = 'block'; } else INS.gring.style.display = 'none';
}
function onTap(cx, cy) {
  if (PHYS() && PHYS().swallowTap()) return;   /* a hold that just ended is not a tap */
  if (G.cardOpen && G.cardOpen !== 'tip') return;
  const T = targets(), coarse = document.body.classList.contains('dev-touch') || matchMedia('(pointer:coarse)').matches; let best = null, bd = 1e9;
  for (const t of T) { const d = Math.hypot(t.x - cx, t.y - cy), lim = t.r * (coarse ? 1.15 : 1) * (C.ui ? Math.max(1, C.ui()) : 1); if (d < lim && d < bd) { bd = d; best = t; } }
  if (best) { G.idle = 0; INS.coarse = coarse;
    if (coarse && !(INS.sel && INS.sel.id === best.id)) { if (showInspect(best, true)) return; }   /* touch: the first tap shows what it is; the second does it */
    hideInspect(); activate(best.id); }
  else if (INS.sel) hideInspect();
}
function wireInput() {
  const el = C.renderer.domElement, pts = new Map(); let down = null, multi = false;
  el.addEventListener('pointerdown', e => { pts.set(e.pointerId, 1); if (pts.size > 1) multi = true; down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; G.actAt = performance.now(); G.idle = 0; ensureAudio();
    if (pts.size === 1 && !G.cardOpen) { try { const T = targets().filter(t => /^(litter|heap)\d+$/.test(t.id) || t.id === 'fitpost'); let best = null, bd = 1e9; for (const t of T) { const d = Math.hypot(t.x - e.clientX, t.y - e.clientY); if (d < t.r * 1.15 && d < bd) { bd = d; best = t; } } if (best) handStart(best.id, e.clientX, e.clientY); } catch (x) { /* a courtesy */ } } }, true);
  el.addEventListener('pointerup', e => { handStop(); pts.delete(e.pointerId); const d = down; if (!pts.size) { down = null; const was = multi; multi = false; if (d && !was && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && e.timeStamp - d.t < 700) onTap(e.clientX, e.clientY); } }, true);
  el.addEventListener('pointercancel', e => { handStop(); pts.delete(e.pointerId); if (!pts.size) { down = null; multi = false; } }, true);
  el.addEventListener('pointermove', e => { if (G.hand && G.hand.down && Math.hypot(e.clientX - G.hand.sx, e.clientY - G.hand.sy) > 18) handStop(); try { inspectMove(e); } catch (x) { /* the layer is a courtesy */ } }, true);
  el.addEventListener('pointerleave', () => { if (INS.hov) { INS.hov = null; hideInspect(); } }, true);
}

/* ---------------- HAND GATHERING (Job 6b): hold on shore litter or a storm heap; works day or night (at night only inside the lit radius, with the lantern lit) ---------------- */
function phaseNow() { if (G.phaseOverride) return G.phaseOverride; try { if (PHYS()) { const st = PHYS().state(); return st.phase || 'day'; } } catch (e) { /* fall through */ } const h = ((G.s.gh % 24) + 24) % 24; return h >= 20.5 || h < 5.3 ? 'night' : h >= 18.5 ? 'dusk' : 'day'; }
const isDark = () => { const p = phaseNow(); return p === 'night' || p === 'dusk'; };
function lanternOn() { try { if (PHYS()) return !!PHYS().state().ph.lantern; } catch (e) { /* none */ } return true; }
function litCircle() { try { const rt = C.li().campstart.rt(), sim = rt.sim(), a = rt.yard().points.apron, LC = root.LI_CAMP; return { x: a.x, z: a.z, r: sim.nightR || (sim.nightR = LC.litRadius(sim)) }; } catch (e) { return null; } }
function handOk(x, z, say) { if (!isDark()) return true; const c = litCircle(); if (!lanternOn()) { if (say) toast('Too dark to gather. Light the lantern at the post.', 3600); return false; } if (c && Math.hypot(x - c.x, z - c.z) > c.r) { if (say) toast('Too far from the lantern light. Gather inside the lit ring.', 3600); return false; } return true; }
function litterNow() {   /* the shore litter a hand may take now: dry, not taken, no robot on it */
  const out = []; try { const rt = C.li().campstart.rt(), sim = rt.sim(); sim.pl.work.forEach((w, i) => { if (w.dead || sim.litter[i].taken || w.haul !== undefined) return; if (!(w.y > sim.env.tide + .3) && w.y !== undefined) return; if (sim.robots.some(r => r.siteI === i && (r.state === 'out' || r.state === 'work') && G.s.robots[r.id])) return; out.push({ i, x: w.x, z: w.z, kind: w.kind, stock: litterStock(w.kind, i) }); }); } catch (e) { /* camp not ready */ }
  return out;
}
function handTargets() {
  const T = []; if (G.hand && G.hand.noTargets) return T; for (const q of litterNow()) { const sc = screenOf(q.x, groundY(q.x, q.z) + .3, q.z); if (sc) T.push({ id: 'litter' + q.i, x: sc.x, y: sc.y, r: 46 }); } return T;
}
function handInfo(id) {   /* what a pile or heap is, for the hand: { stock, x, z, units, take(), left } or null */
  if (/^litter\d+$/.test(id)) { const i = parseInt(id.slice(6), 10), q = litterNow().find(z => z.i === i); if (!q) return null; return { id, stock: q.stock, x: q.x, z: q.z, units: LITTER_UNITS, kind: 'litter', i }; }
  if (/^heap\d+$/.test(id) && SHP() && SHP().heaps) { const hp = SHP().heaps().find(z => 'heap' + z.id === id); if (!hp || hp.rem <= 0) return null; return { id, stock: hp.stock, x: hp.x, z: hp.z, units: hp.rem, kind: 'heap', i: hp.id }; }
  return null;
}
function handStart(id, sx, sy) { if (id === 'fitpost') { if (!fitReady()) return false; G.hand = { id, down: true, p: G.fit.p || 0, fit: true, sx, sy, stock: null }; handHud(true); return true; } const inf = handInfo(id); if (!inf) return false; if ((G.s.stock[inf.stock] || 0) >= STOCK_CAP) { toast(stockById(inf.stock).name + ': the stock is full (' + STOCK_CAP + '). Build something first.', 3600); return false; } if (!handOk(inf.x, inf.z, true)) return false;
  const h0 = G.hand && G.hand.id === id ? G.hand : null; G.hand = { id, down: true, p: h0 ? h0.p : 0, got: h0 ? h0.got : 0, sx, sy, stock: inf.stock }; handHud(true); return true; }
function handStop() { if (G.hand) G.hand.down = false; handHud(false); }
function handHud(on) { let e = G.ui.handbar; if (!e) { e = G.ui.handbar = h('div', 'gd-pill'); e.id = 'gd-hand'; e.style.cssText = 'position:absolute;left:50%;bottom:210px;transform:translateX(-50%);display:none;font-size:15px;pointer-events:none;min-width:190px;text-align:center'; e.innerHTML = '<span id="gd-hand-t"></span><div style="height:6px;border-radius:3px;background:rgba(255,255,255,.25);margin-top:5px"><div id="gd-hand-b" style="height:6px;border-radius:3px;background:#e8c070;width:0"></div></div>'; G.ui.root.appendChild(e); } e.style.display = on ? 'block' : 'none'; if (on && G.hand) { const t = document.getElementById('gd-hand-t'); if (t) t.textContent = G.hand.fit ? 'Fitting the part. Keep holding.' : 'Gathering ' + stockById(G.hand.stock).name.toLowerCase() + '. Keep holding.'; } }
function handTick(dt) {
  const H = G.hand; litRing(); fitFx(!!G.fit && fitReady());
  if (H && H.down && H.fit) { if (!fitReady()) { handStop(); return; } H.p += dt; G.fit.p = H.p; const b = document.getElementById('gd-hand-b'); if (b) b.style.width = Math.round(100 * Math.min(1, H.p / FIT_S)) + '%'; if (H.p >= FIT_S) { handStop(); G.hand = null; finishFit(); } return; }
  if (!H || !H.down) return; const inf = handInfo(H.id); if (!inf || !handOk(inf.x, inf.z, true) || (G.s.stock[inf.stock] || 0) >= STOCK_CAP) { handStop(); return; }
  const r = handStep(H.p, dt, true); H.p = r.p; const b = document.getElementById('gd-hand-b'); if (b) b.style.width = Math.round(100 * (H.p / HAND_UNIT_S)) + '%';
  for (let u = 0; u < r.units; u++) {
    if (inf.kind === 'heap') { const t = SHP().handUnit(inf.i); if (!t) { handStop(); return; } addStockUnits(t.stock, 1); toast('+1 ' + stockById(t.stock).short.toLowerCase() + ' by hand.', 1800); }
    else { addStockUnits(inf.stock, 1); H.got++; toast('+1 ' + stockById(inf.stock).short.toLowerCase() + ' by hand.', 1800); if (H.got >= LITTER_UNITS) { try { const sim = C.li().campstart.rt().sim(); sim.litter[inf.i].taken = true; sim.litter[inf.i].back = 150; } catch (e) { /* none */ } H.got = 0; handStop(); G.hand = null; break; } }
    G.hands = (G.hands || 0) + 1;
  }
  if (G.hand) { G.sig = null; }
}
function litRing() {   /* a soft ring on the shore marks the lit radius while the lantern is lit at dusk and night */
  const on = isDark() && lanternOn() && !!G.root; if (!on && !G.ring) return; const c = on ? litCircle() : null;
  if (on && c && !G.ring) { const pts = []; for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, x = c.x + Math.cos(a) * c.r, z = c.z + Math.sin(a) * c.r; pts.push(new THREE.Vector3(x, groundY(x, z) + .25, z)); } const g = new THREE.BufferGeometry().setFromPoints(pts); G.ring = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .32, depthWrite: false })); G.ring.name = 'litRing'; G.ring.frustumCulled = false; G.root.add(G.ring); }
  if (G.ring) G.ring.visible = on;
}
/* ---------------- ambient events (Job 6b) ---------------- */
function ambientVisible() { if (G.cardOpen || (G.hand && G.hand.down) || G.fit || G.dlv || (G.wait && G.wait.mode)) return true; try { return C.li().campstart.rt().robots().some((b, i) => G.s.robots[i] && (b.moving || b.state === 'work' || b.state === 'drop' || b.state === 'sort' || b.state === 'carry' || b.state === 'out' || b.state === 'task')); } catch (e) { return false; } }
function ambientTick(dt) {
  if (!G.ready || !G.s.letter1 || stageOf(G.s) === 'arrive') return; const r = ambientStep(G.amb, dt, ambientVisible()); G.amb = r.a; const O = G.objs;
  if (r.fire) { G.ambN = (G.ambN || 0) + 1; G.ambLast = r.fire; if (r.fire === 'horn') foghorn(); else toast(AMBIENT.text[r.fire], 5200); if (r.fire === 'pool') { addStockUnits('glass', 1); } if (r.fire === 'boat') ambBoatStart(); }
  if (O.ambBoat && O.ambBoat.visible) ambBoatMove(dt);
}
function ambBoatStart() {
  const O = G.objs, T = THREE, S = G.spots; if (!S || !S.tender) return; if (!O.ambBoat) { const g = new T.Group(), hull = new T.Mesh(new T.BoxGeometry(5.5, 1.1, 2), new T.MeshLambertMaterial({ color: 0x3a3a40 })); hull.position.y = .55; g.add(hull); const sail = new T.Mesh(new T.ConeGeometry(1.6, 6, 3), new T.MeshLambertMaterial({ color: 0xe8e2d0, side: T.DoubleSide })); sail.position.set(0, 4, 0); g.add(sail); O.ambBoat = g; G.root.add(g); }
  const d = C.W.camp.dir, rt = C.W.camp.rt, c = S.tender.drop, R = 150, a0 = (G.ambN % 2 ? -1 : 1);
  G.ambB = { t: 0, x0: c.x + d[0] * R + rt[0] * 90 * a0, z0: c.z + d[1] * R + rt[1] * 90 * a0, x1: c.x + d[0] * R - rt[0] * 90 * a0, z1: c.z + d[1] * R - rt[1] * 90 * a0 }; O.ambBoat.visible = true; ambBoatMove(0);
}
function ambBoatMove(dt) { const O = G.objs, b = G.ambB; if (!b) return; b.t += dt; const k = Math.min(1, b.t / AMBIENT.dur.boat), x = b.x0 + (b.x1 - b.x0) * k, z = b.z0 + (b.z1 - b.z0) * k; O.ambBoat.position.set(x, Math.max(C.tide(), -0.2) + .1, z); O.ambBoat.rotation.y = Math.atan2(b.x1 - b.x0, b.z1 - b.z0) + Math.PI / 2; if (k >= 1) O.ambBoat.visible = false; }
/* ---------------- wait for dawn (Job 6b) ---------------- */
function waitBusy() { if (G.cardOpen || (G.hand && G.hand.down) || G.fit) return true; try { if (PHYS()) { const m = PHYS().state().marker; if (m && ['site', 'beam', 'beamA', 'crate', 'heavy', 'open', 'unload', 'float'].includes(m.tag)) return true; } } catch (e) { /* none */ } return false; }
function waitTick(dt) {
  const w = G.wait || (G.wait = { mode: null, k: 0, at: 0, speed: 1 }), ph = phaseNow(), act = (G.actAt || 0) > w.at; w.at = performance.now();
  const r = waitStep(w, dt, { start: !!G.waitReq && G.waitReq === 'start', stop: G.waitReq === 'stop', night: ph === 'night', dark: ph === 'night' || ph === 'dusk', idle: G.idle, busy: waitBusy(), act: act && !G.waitReq });
  G.waitReq = null; const was = w.mode; w.mode = r.mode; w.k = r.k; G.waitSpeed = r.speed; if (was !== w.mode) { if (w.mode === null && was) { G.idle = 0; } G.sig = null; renderUi(); }
}
function waitReq(v) { G.waitReq = v; G.actAt = 0; }
/* ---------------- audio: one fog horn, made in the browser ---------------- */
function ensureAudio() { if (G.horn || !(window.AudioContext || window.webkitAudioContext)) return; try { G.horn = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { G.horn = null; } if (G.horn && G.horn.state === 'suspended') G.horn.resume().catch(() => { }); }
function foghorn() {
  toast('A fog horn, far out. Two long notes.', 5200); G.hornCount = (G.hornCount || 0) + 1;
  const a = G.horn; if (!a || a.state !== 'running') return;
  try { for (let k = 0; k < 2; k++) { const t0 = a.currentTime + k * 3.2, g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.22, t0 + .5); g.gain.setValueAtTime(.22, t0 + 1.9); g.gain.linearRampToValueAtTime(0, t0 + 2.8); g.connect(lp); lp.connect(a.destination);
    for (const f of [82, 124]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(t0); o.stop(t0 + 3); } } } catch (e) { /* silent */ }
}

/* ---------------- camera helper ---------------- */
function focus(x, z, dist, theta, phi) {
  const cam = C.cam; G.focusT = { tx: x, tz: z, dist: dist || cam.dist, theta: theta === undefined ? cam.theta : theta, phi: phi === undefined ? cam.phi : phi, t: 0 };
}
function focusTick(dt) {
  const f = G.focusT; if (!f) return; const cam = C.cam, k = Math.min(1, dt * (f.slow ? 0.8 : 2.6));
  cam.tx += (f.tx - cam.tx) * k; cam.tz += (f.tz - cam.tz) * k; cam.dist += (f.dist - cam.dist) * k; cam.phi += (f.phi - cam.phi) * k;
  let dth = f.theta - cam.theta; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI; cam.theta += dth * k;
  f.t += dt; if (f.t > (f.slow ? 7 : 2.4) || (Math.hypot(f.tx - cam.tx, f.tz - cam.tz) < .2 && Math.abs(f.dist - cam.dist) < .5)) { G.focusT = null; }
}

/* ---------------- actions: the beats ---------------- */
function setS(patch) { G.s = Object.assign({}, G.s, patch); }
function ledgerLine(text, cash, credit) { G.s.ledger = Object.assign({}, G.s.ledger, { entries: G.s.ledger.entries.concat([{ h: G.s.gh, text, cash: cash || 0, credit: credit || 0 }]) }); }
function afterChange() { const was = G.s.stage, now = stageOf(G.s); G.s.stage = now; if (now !== was) onStage(now, was); renderUi(); save(); }
function onStage(now) {
  G.idle = 0; clockTick(0);
  if (now === 'delivery' && !G.s.shipSeen) startDelivery();
  if (now === 'evening') startEvening();
  if (now === 'night') startNight();
  if (now === 'done') { toast('The first day is done. Your place is saved.', 7000); G.s.saved = save() || G.s.saved; }
  G.fresh = now;
}
function activate(id) {
  const s = G.s, S = G.spots;
  if (PHYS() && PHYS().activate(id)) return;
  if (id === 'dest') { const i = exploreInfo(); if (i) toast(i.line + ' Follow the gold arrow, ' + Math.round(i.dist) + ' m.', 4800); return; }
  if (id === 'boat') { if (BDP()) BDP().activate('boat'); return; }
  if (id === 'crate0') return openKeyCrate();
  if (id === 'hut') return hutCard();
  if (id === 'lean') return shelterCard();
  if (id === 'barrel') return barrelCard();
  if (id === 'wreck') return wreckCard();
  if (id.startsWith('find')) return takeFind(parseInt(id.slice(4), 10));
  if (id.startsWith('crate')) return deliveryCrate(parseInt(id.slice(5), 10));
  if (id === 'fitpost') { toast('Hold on the charging post while the part is swapped in.', 3600); return; }
  if (/^litter\d+$/.test(id)) { const inf = handInfo(id); toast(inf ? 'Hold on it to gather by hand. ' + rateText(null) : 'Nothing here now.', 4200); return; }
  if (/^bay_[a-z]+$/.test(id)) { const t = bayInfo(id); if (t) toast(t.name + '. ' + t.use + ' ' + t.flow, 7000); return; }
  if (id === 'hulk' || /^heap\d+$/.test(id)) { if (SHP()) SHP().activate(id); return; }
  if (id === 'bottle') return readBottle();
  if (/^bot\d+$/.test(id)) return robotCard(parseInt(id.slice(3), 10));   /* 'bottle' also starts with 'bot': test it first */
}
/* (1) the crate, the letter, the ledger opening */
function openKeyCrate() {
  focus(G.spots.crate.x, G.spots.crate.z, 16);
  const c = card('crate', '<h2>The crate</h2><p>A paper label with a number you cannot read yet. A brass key hangs on a string from the lid. The lid is not nailed.</p>');
  c.appendChild(xbtn()); c.appendChild(row(btn(G.s.letter1 ? 'Read the letter again' : 'Lift the lid', readLetter1, 'pri')));
}
function readLetter1() {
  const first = !G.s.letter1;
  const c = card('letter1', '<h2>Letter one</h2>' + LETTER1.map(l => '<p>' + l + '</p>').join('') + '<div class="sig">' + mark(30) + '</div>', 'gd-paper');
  c.appendChild(row(btn('Keep it', () => { closeCard(); if (first) { G.crateDone = true; if (PHYS()) PHYS().openLid(G.objs.crate); else { G.objs.crate.userData.lid.position.set(.2, .98, -.32); G.objs.crate.userData.lid.rotation.x = -.9; } if (G.objs.key) G.objs.key.visible = false; setS({ letter1: true, keyUsed: false }); G.s.ledger = Object.assign({}, G.s.ledger); afterChange(); toast('The ledger is open. A tarp lay folded under the letter, and a brass key.', 6500); pulse('ledger'); focus(G.spots.hut.x, G.spots.hut.z, 34); } }, 'pri')));
}
/* the ledger panel */
function ledgerCard() {
  const s = G.s, L = s.ledger, c = card('ledger', '<h2>The ledger ' + mark(22) + '</h2>' +
    '<div class="gd-money"><div><small>Cash (spends anywhere, for local things)</small><b>' + pound(L.cash) + '</b></div><div><small>Delivery credit (buys deliveries only)</small><b>' + pound(L.credit) + '</b></div></div>' +
    '<p><small>Recent entries</small></p><pre>' + recent(L, 7).join('\n') + '</pre><p><b>' + creditNote(L, s.gh) + '</b></p><p><small>All money here is made up and only exists in this game. Credit buys things, not land.</small></p>');
  c.appendChild(xbtn()); c.appendChild(row(btn('Close', closeCard, 'pri')));
}
/* (3) the jobs notebook */
function notebook() {
  const s = G.s, c = card('notes', '<h2>Notebook</h2><p><small>Nothing here is a must. Do what you like first.</small></p>');
  const job = (done, title, sub, bt) => { const d = h('div', 'gd-item'); d.innerHTML = '<div><b>' + (done ? '&#10003; ' : '') + title + '</b><small>' + sub + '</small></div>'; if (bt) d.appendChild(bt); c.appendChild(d); };
  job(!!s.dry, 'Get dry', s.dry ? SHELTERS[s.dry].name + ' is your shelter.' : 'Pick a shelter. Rain is coming in.', s.dry ? null : btn('Choose', shelterCard));
  job(s.water, 'Find water', s.water ? 'The barrel is out. No spring on this island: rain only.' : 'Not every island has a spring. This one does not.', s.water ? null : btn('Look', barrelCard));
  job(s.finds.length >= 2, 'Look along the shore', 'Finds taken: ' + s.finds.length + ' of 2. Seals keep to the far rocks.', null);
  job(s.plank, 'Fit one plank of the old jetty', s.plank ? 'One plank is in. The tender can land a little closer.' : 'Drag a loose plank to a gap, or tap a plank and then a gap.', s.plank ? null : btn('Show me', showJetty));
  { const L = stopLines(10); if (L.length) { c.appendChild(h('p', '', '<b>Recent stops</b> <small>(the last ' + L.length + ')</small>')); L.forEach(q => c.appendChild(h('div', 'gd-stopline', '<small>' + q.text + '</small>'))); } }
  c.appendChild(xbtn()); c.appendChild(row(btn('Close', closeCard, 'pri')));
}
function showJetty() { closeCard(); const rp = C.li().repair; try { const v = rp.view; if (typeof v === 'function') v(); } catch (e) { /* the camera stays */ } const j = G.spots.S.jetty; if (j) focus(j.ox, j.oz, 22, undefined, .8); toast('The loose planks lie near the old jetty. A "Fit one plank" button is under the notes if your hands need help.', 6500); G.helpPlank = true; renderUi(); }
function fitOnePlank() {
  const rp = C.li().repair; if (!rp) return toast('The jetty is not here in this build.');
  try {
    const socks = rp.sockets().filter(q => !q.filled && q.kind === 'plank'), bodies = rp.bodies().filter(b => b.kind === 'plank' && b.state === 'dyn' && !b.lost);
    if (!socks.length || !bodies.length) return toast('No plank or no gap to use right now.');
    const so = socks[socks.length - 1]; const bo = bodies[0]; rp.teleport(bo.id, so.p.slice()); rp.fit(bo.id); rp.step(30);
  } catch (e) { G.err.push('plank ' + e.message); }
}
function plankWatch() { if (G.s.plank) return; try { const rp = C.li().repair; if (rp && rp.count().fitted >= 1) { setS({ plank: true }); toast('One plank fitted. The old jetty remembers how.', 5200); afterChange(); } } catch (e) { /* not ready */ } }
function shelterCard() {
  const s = G.s, c = card('shelter', '<h2>Get dry</h2><p>Three ways. Each has a catch.</p>'); c.appendChild(xbtn());
  const opt = (id, ok, why) => { const d = h('div', 'gd-item'); d.innerHTML = '<div><b>' + SHELTERS[id].name + '</b><small>' + SHELTERS[id].line + (ok ? '' : ' (' + why + ')') + '</small></div>'; d.appendChild(btn(s.dry === id ? 'Chosen' : 'Choose', () => chooseShelter(id), 'pri', !ok || s.dry === id)); c.appendChild(d); };
  opt('leanto', true); opt('tarp', s.letter1, 'it is in the crate: open the crate first'); opt('hut', s.hutOpen, 'the door is locked: the key may fit');
  c.appendChild(row(btn('Close', closeCard)));
}
function chooseShelter(id) {
  closeCard(); const O = G.objs; setS({ dry: id });
  if (id === 'tarp') O.tarp.visible = true;
  if (id === 'hut') { O.hut.userData.patch.visible = true; const c = ck(); if (c) c.setHours(c.hours() + 1.5); }
  if (id === 'leanto' && G.spots.lean) focus(G.spots.lean.x, G.spots.lean.z, 22);
  toast(SHELTERS[id].name + '. ' + (id === 'hut' ? 'The roof sheet is patched. It takes the rest of the morning.' : 'Dry enough.'), 5200); ledgerLine('Shelter: ' + SHELTERS[id].name.toLowerCase(), 0, 0); afterChange();
}
function hutCard() {
  const s = G.s, c = card('hut', '<h2>The hut</h2><p>' + (s.hutOpen ? 'The door stands open. Bare boards, a dry corner, a stove with no pipe. The roof has one bad sheet.' : 'Rust and salt. The door is locked.') + '</p>'); c.appendChild(xbtn());
  const bs = [];
  if (!s.hutOpen) bs.push(btn(s.letter1 ? 'Try the brass key' : 'Try the door', () => { if (!s.letter1) { closeCard(); return toast('Locked. Perhaps the crate has something.'); } closeCard(); G.objs.hut.userData.door.position.x = -1.6; setS({ hutOpen: true, keyUsed: true }); toast('The key turns. Inside is dry.', 4200); afterChange(); }, 'pri'));
  else if (!s.dry) bs.push(btn('Patch the roof', () => chooseShelter('hut'), 'pri'));
  bs.push(btn('Close', closeCard)); c.appendChild(row(...bs));
}
function barrelCard() {
  const s = G.s, c = card('barrel', '<h2>Water</h2><p>' + (s.water ? 'The barrel stands under the roof edge. It holds 40 litres. Right now: ' + Math.round(G.barrel || 0) + ' litres.' : 'No spring on this island. Not every island has one. Rain is the water here. The kit barrel will do for a start.') + '</p><p><small>Later: a cistern, and a hand pump from the catalogue.</small></p>'); c.appendChild(xbtn());
  const bs = []; if (!s.water) bs.push(btn('Set the barrel under the roof edge', () => { closeCard(); setS({ water: true }); toast('The barrel is out. It will fill when it rains.', 5200); focus(G.spots.barrel.x, G.spots.barrel.z, 20); afterChange(); }, 'pri')); bs.push(btn('Close', closeCard)); c.appendChild(row(...bs));
}
function takeFind(i) {
  const f = G.spots.finds[i]; if (!f || f.taken) return; const def = FINDS.find(x => x.id === f.id); f.taken = true; G.objs.finds[i].visible = false;
  setS({ finds: G.s.finds.concat([f.id]) }); const n = G.s.finds.length; toast(def.name + '. ' + def.note + (n < 2 ? '' : ''), 5000); afterChange();
}
function wreckCard() {
  const s = G.s, c = card('wreck', '<h2>The old hull</h2><p>Half buried. Plates and ribs, orange with age. ' + (s.partFrom === 'wreck' ? 'You took the track link already.' : 'Something small and flat still turns under a loose plate.') + '</p>'); c.appendChild(xbtn());
  const bs = []; if (s.partFrom !== 'wreck') bs.push(btn('Take the track link', () => { closeCard(); setS({ parts: s.parts + 1, partFrom: s.partFrom || 'wreck' }); G.wreckTaken = true; toast('A track link, stiff but whole. A part for an old carrier.', 5000); afterChange(); }, 'pri')); bs.push(btn('Close', closeCard)); c.appendChild(row(...bs));
}
/* (4) the first delivery */
function startDelivery() {
  G.s.shipSeen = true; const O = G.objs, S = G.spots; O.ship.visible = true; O.ship.userData.fade = 0; O.ship.position.set(S.ship.x, -.4, S.ship.z);
  const to = [S.tender.wp.x - S.ship.x, S.tender.wp.z - S.ship.z]; O.ship.rotation.y = Math.atan2(-to[1], to[0]); O.ship.scale.setScalar(0.1);
  G.dlv = { t: 0, phase: 'ship' };
  focus(S.tender.wp.x, S.tender.wp.z, 56, undefined, .7); foghorn();
}
function deliveryTick(dt) {
  const d = G.dlv; if (!d) return; const sp = G.fast || 1; dt *= sp; d.t += dt; const O = G.objs, S = G.spots, tide = C.tide();
  const sh = O.ship, td = O.tender, wp = S.tender.wp, dir = C.W.camp.dir;
  const bob = Math.sin(performance.now() / 900) * .05;
  if (d.phase === 'ship') {   /* the ship slides in from the rim, grows into view, stops; the tender is lowered */
    const k = clamp(d.t / 7, 0, 1); sh.scale.setScalar(.15 + .85 * k); sh.position.y = tide - .15 + bob;
    if (d.t > 9) { d.phase = 'out'; d.t = 0; td.visible = true; td.userData.p0 = [sh.position.x - dir[0] * 4, sh.position.z - dir[1] * 4]; td.position.set(td.userData.p0[0], tide, td.userData.p0[1]); td.rotation.y = Math.atan2(-(wp.z - td.userData.p0[1]), wp.x - td.userData.p0[0]); }
  } else if (d.phase === 'out') {
    const p0 = td.userData.p0, p1 = [wp.x + dir[0] * 2.5, wp.z + dir[1] * 2.5], k = clamp(d.t / 13, 0, 1), e = k * k * (3 - 2 * k);
    td.position.set(p0[0] + (p1[0] - p0[0]) * e, tide + .03 + bob, p0[1] + (p1[1] - p0[1]) * e); td.rotation.y = Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]);
    if (k >= 1) { d.phase = 'drop'; d.t = 0; }
  } else if (d.phase === 'drop') {
    td.position.y = tide + .03 + bob; if (d.t > 2.2 && !d.dropped) { d.dropped = true; addDeliveryCrate(1, true); td.userData.cargo.visible = false; toast('Crate number 1. Nobody on the boat. It just knows the way.', 6500); focus(S.tender.drop.x, S.tender.drop.z, 22); }
    if (d.t > 5 && (!PHYS() || PHYS().unloaded())) { d.phase = 'back'; d.t = 0; }
  } else if (d.phase === 'back') {
    const p0 = [wp.x + dir[0] * 2.5, wp.z + dir[1] * 2.5], p1 = td.userData.p0, k = clamp(d.t / 14, 0, 1), e = k * k * (3 - 2 * k);
    td.position.set(p0[0] + (p1[0] - p0[0]) * e, tide + .03 + bob, p0[1] + (p1[1] - p0[1]) * e); td.rotation.y = Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]);
    if (k >= 1) { d.phase = 'away'; d.t = 0; td.visible = false; }
  } else if (d.phase === 'away') {
    const k = clamp(d.t / 8, 0, 1); sh.position.x += dir[0] * dt * 3.2 * k; sh.position.z += dir[1] * dt * 3.2 * k; sh.position.y = tide - .15 + bob; sh.scale.setScalar(1 - .5 * k);
    if (k >= 1) { sh.visible = false; G.dlv = null; }
  }
}
function addDeliveryCrate(n, fromTender) {   /* with the physical layer on, a crate that comes in by boat is carried up the beach (physical.js onCrate) */
  const S = G.spots, r = C.W.camp.rt, i = G.crates.length, base = S.tender.drop;
  const m = mkCrate(n, false); const p = { x: base.x + r[0] * (i * 1.35), z: base.z + r[1] * (i * 1.35) }; place(m, p, .15 * (i % 3)); G.root.add(m); G.crates.push({ n, mesh: m, pos: p, opened: false });
  if (PHYS()) PHYS().onCrate(G.crates[i], !!fromTender);
  return m;
}
function deliveryCrate(n) {
  const cr = G.crates[n - 1]; if (!cr) return; if (PHYS() && PHYS().crateTap(n)) return; focus(cr.pos.x, cr.pos.z, 15); const s = G.s;
  if (n === 1) {
    const c = card('c1', '<h2>Crate number 1</h2><p>' + (cr.opened ? 'Empty now, but for the card.' : 'Inside: three spare track links in oiled paper, a sack of tins and one plank for a first tank, and a card with the same small mark as the letter. The card is a catalogue.') + '</p>'); c.appendChild(xbtn());
    const bs = []; if (!cr.opened) bs.push(btn('Take the track links', () => { cr.opened = true; closeCard(); { const st = Object.assign({}, G.s.stock); for (const k in STARTER) st[k] = Math.min(STOCK_CAP, (st[k] || 0) + STARTER[k]); setS({ crate1: true, parts: s.parts + 3, partFrom: s.partFrom || 'crate', stock: st }); } if (PHYS()) PHYS().openLid(cr.mesh); else { cr.mesh.userData.lid.position.set(.2, .98, -.32); cr.mesh.userData.lid.rotation.x = -.9; } toast('Three track links, a sack of tins and a plank. The catalogue is open.', 5000); afterChange(); setTimeout(catalogueCard, 500); }, 'pri')); bs.push(btn('Catalogue', catalogueCard)); bs.push(btn('Close', closeCard)); c.appendChild(row(...bs));
  } else if (cr.letter2) { readLetter2(); }
  else if (cr.l9) { if (SHP()) SHP().readL9(); }
  else {
    const it = itemById(cr.item);
    if (it && it.kit) { const o = s.orders.find(q => q.delivered && q.item === it.id && !q.taken), done = cr.opened || !o;
      const c = card('cn', '<h2>Kit crate: ' + it.name + '</h2><p>' + (done ? 'Empty now. The kit is in the yard.' : it.use) + '</p><p><small>' + (done ? 'Open a carrier\'s card to fit it.' : 'Take it out, then fit it at the charging post: hold there while the old part comes out and the new one goes in.') + '</small></p>'); c.appendChild(xbtn());
      c.appendChild(row(...(done ? [] : [btn('Take the kit', () => { cr.opened = true; o.taken = true; const kits = Object.assign({}, G.s.kits); kits[it.id] = (kits[it.id] || 0) + 1; setS({ kits }); closeCard(); toast(it.name + ' kit taken. Open a carrier\'s card to fit it.', 5200); afterChange(); }, 'pri')]), btn('Close', closeCard)));
    } else { const c = card('cn', '<h2>Crate number ' + n + '</h2><p>' + (it ? it.name + '. ' + it.use : 'A parcel.') + '</p>'); c.appendChild(xbtn()); c.appendChild(row(btn('Close', closeCard, 'pri'))); }
  }
}
function catalogueCard() {
  const s = G.s, L = s.ledger, c = card('cat', '<h2>Catalogue</h2><p><small>Ten small things and two robot kits. Paid from delivery credit (' + pound(L.credit) + ' left). Credit buys things, not land. The boat brings them ' + 'by next morning, and weather can slow it.</small></p>'); c.appendChild(xbtn());
  CATALOGUE.forEach(it => {
    const eta = etaText(etaFor(s.gh, it.extra), s.gh), ordered = s.orders.filter(o => o.item === it.id && !o.delivered).length;
    const d = h('div', 'gd-item'); d.innerHTML = '<div><b>' + it.name + '</b> &middot; ' + pound(it.price) + '<small>' + it.use + ' Arrives ' + eta + '.' + (ordered ? ' (' + ordered + ' on the way)' : '') + '</small></div>';
    d.appendChild(btn('Order', () => orderItem(it.id), 'pri', it.price > L.credit)); c.appendChild(d);
  });
  const kh = h('p', '', '<small><b>Robot kits.</b> A named kit crate comes by the same boat. Fit it at the charging post.</small>'); c.appendChild(kh);
  KITS.forEach(it => { const ordered = s.orders.filter(o => o.item === it.id && !o.delivered).length, d = h('div', 'gd-item'); d.innerHTML = '<div><b>' + it.name + '</b> &middot; ' + pound(it.price) + '<small>' + it.use + ' Arrives ' + etaText(etaFor(s.gh, it.extra), s.gh) + '.' + (ordered ? ' (' + ordered + ' on the way)' : '') + ((s.kits || {})[it.id] ? ' In the yard now: ' + s.kits[it.id] + '.' : '') + '</small></div>'; d.appendChild(btn('Order', () => orderItem(it.id), 'pri', it.price > L.credit)); c.appendChild(d); });
  c.appendChild(row(btn('Close', closeCard)));
}
function orderItem(id) {
  const r = placeOrder(G.s.ledger, id, G.s.gh); if (!r.ok) return toast(r.why);
  const was = G.s.ordered; setS({ ledger: r.ledger, orders: G.s.orders.concat([r.order]), ordered: true }); toast('Ordered: ' + itemById(id).name + '. It comes ' + etaText(r.order.due, G.s.gh) + '.', 6000);
  afterChange(); if (G.cardOpen === 'cat') catalogueCard(); pulse('ledger');
}
function deliveriesTick() {
  const s = G.s; let changed = false; const w = weatherState(); if (!s.orders.length) return;
  const orders = s.orders.map(o => { if (o.delivered) return o; const r = resolveDelivery(o, s.gh, w); if (r.delayedBy) { toast('The boat could not land in this weather. ' + itemById(o.item).name + ' is late by ' + r.delayedBy + ' hours.', 6500); ledgerLine('Delivery late: ' + itemById(o.item).name + ' (weather, ' + r.delayedBy + ' h)', 0, 0); changed = true; } if (r.arrived) { changed = true; G.arrivals = (G.arrivals || []).concat([o.item]); } return r.order; });
  if (changed) { s.orders = orders; s.delivered = orders.filter(o => o.delivered).map(o => o.item); renderUi(); save(); }
  if (G.arrivals && G.arrivals.length && !G.dlv && G.spots) { const it = G.arrivals.shift(), n = G.crates.length + 1; const m = addDeliveryCrate(n, true); G.crates[n - 1].item = it; if (!PHYS()) toast('Crate number ' + n + ' came in: ' + itemById(it).name + '.', 6000); }
}
/* (5) the yard */
const LAMP_WORDS = { green: 'green: charged and working', amber: 'amber: on its way', dim: 'dim: low battery, going to the post' };
function robotState(i) { try { const b = C.li().campstart.rt().robots()[i]; return b || null; } catch (e) { return null; } }
function robotCard(i) {
  const s = G.s, on = s.robots[i], b = robotState(i); if (!b) return; focus(b.x, b.z, 13);
  const job = (s.jobs || [])[i], jn = job ? stockById(job).name.toLowerCase() : null;
  const c = card('bot', '<h2>' + (on ? 'Old carrier' : 'Old carrier. Needs a part.') + '</h2><p>' + (on ? (jn ? 'Order: ' + jn + '. It works the tide line and brings the pile to the yard. Planks and rope: washed up at the tide line. <small>' + rateText(job) + '</small>' : 'Running, but it has no order. It waits at its post.') : 'Switched off. Dust in the tracks, one worn link.') + '</p>' + (on ? '<p><small>Status light: ' + (LAMP_WORDS[b.lamp] || b.lamp || 'on') + '. A small mark is stamped on the chassis. You have seen it on the letter.</small> ' + mark(22) + '</p>' : '<p><small>Parts in hand: ' + s.parts + '. ' + (s.parts ? '' : 'The missing part is a track link: it is in the first crate from the boat, or in the old hull on the shore.') + '</small></p>')); c.appendChild(xbtn());
  { const st = on ? stopOf(i) : null; if (st) c.appendChild(h('p', '', '<b>' + st.say + '</b>')); else if (on) c.appendChild(h('p', '', '<b>Working.</b> <small>' + (b.state === 'out' ? 'Walking to the shore.' : b.state === 'carry' ? 'Carrying a load to the yard.' : b.state === 'work' ? 'Gathering at the shore.' : 'On the job.') + '</small>')); }
  if (on) STOCKS.forEach(k => { const d = h('div', 'gd-item'); d.innerHTML = '<div><b>' + k.name + '</b></div>'; d.appendChild(btn(job === k.id ? 'Ordered' : 'Gather', () => giveOrder(i, k.id), job === k.id ? '' : 'pri', job === k.id)); c.appendChild(d); });
  if (on) { const m = modsOf(s, i); c.appendChild(h('p', '', '<small>' + batteryLine(m, b.charge) + '</small>')); KITS.forEach(k => { const key = k.id === 'battery' ? 'bat' : 'solar', have = (s.kits || {})[k.id] || 0; if (have || m[key]) c.appendChild(row(btn(m[key] ? k.name + ': fitted' : 'Fit ' + k.name.toLowerCase() + ' (' + have + ' kit)', () => startFit(i, k.id), 'pri', !!m[key]))); }); if (G.fit && G.fit.i === i) c.appendChild(h('p', '', '<small>Hold on the charging post to swap the part in.</small>')); }
  const bs = []; if (!on) bs.push(btn('Fit a part (' + s.parts + ')', () => startRobot(i), 'pri', s.parts < 1)); if (on) bs.push(btn('Stock and builds', robotsCard)); bs.push(btn('Close', closeCard)); c.appendChild(row(...bs));
}
function giveOrder(i, id) {
  G.s = setJob(G.s, i, id); toast('Order given: ' + stockById(id).name.toLowerCase() + '. It heads for the shore.', 4500);
  const rt = C.li().campstart.rt(); try { const r = rt.sim().robots[i]; if (r && r.state === 'bay' && r.timer > 1e5) r.timer = 0.4; } catch (e) { G.err.push('order ' + e.message); }
  afterChange(); robotCard(i);
}
function stockLine(st) { return STOCKS.map(k => k.short + ' ' + (st[k.id] || 0)).join(' · '); }
function robotsCard() {
  const s = G.s, c = card('stock', '<h2>Robots and stock</h2><p><small>Stock in the yard: ' + stockLine(s.stock) + '. ' + WRACK_LINE + ' Each trip from the shore brings ' + UNITS_PER_TRIP + '. ' + rateText(null) + ' Hold on a pile on the shore or a heap, day or night (at night, inside the lit ring).</small></p>'); c.appendChild(xbtn());
  const nb = (() => { try { return C.li().campstart.rt().robots().length; } catch (e) { return 0; } })();
  for (let i = 0; i < nb; i++) { const b = robotState(i), on = s.robots[i], job = (s.jobs || [])[i]; const d = h('div', 'gd-item'); d.innerHTML = '<div><b>Carrier ' + (i + 1) + '</b><small>' + (on ? (job ? 'Gathering ' + stockById(job).name.toLowerCase() + '. Light: ' + (b && b.lamp) + '. ' + rateText(job) : 'No order.') + ' ' + batteryLine(modsOf(s, i), b && b.charge) : 'Switched off. Needs a part.') + '</small></div>'; if (on) d.appendChild(btn('Order', () => robotCard(i))); c.appendChild(d); }
  const t = h('div'); t.innerHTML = '<p><small>What each build needs</small></p>' + BUILDS.map(b => '<p style="margin:2px 0"><b>' + b.name.replace(' (finish the repair)', '') + '</b>: ' + needText(b.needs) + (Object.keys(missing(s.stock, b.needs)).length ? '' : ' (ready)') + '</p>').join(''); c.appendChild(t);
  c.appendChild(row(btn('Close', closeCard, 'pri')));
}
function startRobot(i) {
  if (G.s.parts < 1) return; closeCard(); const rob = G.s.robots.slice(); while (rob.length <= i) rob.push(false); rob[i] = true; setS({ parts: G.s.parts - 1, robots: rob });
  const rt = C.li().campstart.rt(); try { const r = rt.sim().robots[i]; if (r) { r.timer = 1e9; r.charge = .95; r.state = 'bay'; } } catch (e) { G.err.push('robot ' + e.message); }
  toast('It starts. A lamp, a hum. Give it an order: what should it gather?', 6500); afterChange(); setTimeout(() => { if (!G.cardOpen) robotCard(i); }, 900);
}
/* FITTING A KIT (Job 6b): the card sets G.fit; the carrier is called home; when it stands in its bay, a hold on the charging post swaps the part in, with a visible part and the old one left beside the post. */
function startFit(i, kit) {
  const r = fitKit(G.s, i, kit); if (!r.ok) return toast(r.why, 3600); G.fit = { i, kit, p: 0 }; closeCard();
  const b = robotState(i); toast(b && b.state === 'bay' ? 'Hold on the charging post to fit the ' + KITS.find(k => k.id === kit).name.toLowerCase() + '.' : 'Carrier ' + (i + 1) + ' is coming home. Then hold on the charging post.', 5200); G.sig = null; renderUi();
}
const fitReady = () => { if (!G.fit) return false; const b = robotState(G.fit.i); return !!(b && b.state === 'bay' && G.objs.post); };
function fitFx(on) {
  const O = G.objs; if (!G.fit && !O.fitPart) return; const T = THREE;
  if (on && G.fit) { const b = robotState(G.fit.i); if (!b) return; if (!O.fitPart) { O.fitPart = new T.Mesh(new T.BoxGeometry(.34, .2, .26), new T.MeshLambertMaterial({ color: 0x4a6a8a })); G.root.add(O.fitPart); }
    O.fitPart.material.color.setHex(G.fit.kit === 'solar' ? 0x2f4f8f : 0x3d5a40); O.fitPart.scale.set(G.fit.kit === 'solar' ? 1.6 : 1, G.fit.kit === 'solar' ? .25 : 1, G.fit.kit === 'solar' ? 1.4 : 1); const k = Math.min(1, (G.fit.p || 0) / FIT_S); O.fitPart.visible = true; O.fitPart.position.set(b.x, groundY(b.x, b.z) + 1.0 + .5 * (1 - k) + Math.sin(performance.now() / 160) * .04, b.z); O.fitPart.rotation.y = k * 3; }
  else if (O.fitPart) O.fitPart.visible = false;
}
function finishFit() {
  const f = G.fit; if (!f) return; const r = fitKit(G.s, f.i, f.kit); G.fit = null; fitFx(false); if (!r.ok) return toast(r.why, 3600); G.s = r.state; const b = robotState(f.i), O = G.objs;
  if (b) { const T = THREE, old = new T.Mesh(new T.BoxGeometry(.3, .18, .22), new T.MeshLambertMaterial({ color: 0x5a5148 })); const a = (O.oldParts = O.oldParts || []).length, x = b.x + .9 + a * .35, z = b.z + 1.2; old.position.set(x, groundY(x, z) + .1, z); old.rotation.y = a * 1.1; G.root.add(old); O.oldParts.push(old); if (O.oldParts.length > 4) { G.root.remove(O.oldParts.shift()); } }
  toast('Fitted: ' + KITS.find(k => k.id === f.kit).name.toLowerCase() + ' on carrier ' + (f.i + 1) + '. The old part lies by the post.', 5200); afterChange();
}
/* the robots, every frame: the unstarted ones are held in their bays; a started one with no order waits; one with an order goes out. Each finished trip adds stock. */
function holdRobots() {
  let rt = null; try { rt = C.li().campstart.rt(); } catch (e) { return; } if (!rt) return;
  try { const sim = rt.sim(); G.deliv = G.deliv || [];
    sim.robots.forEach((r, i) => {
      sim.shifts = true; r.off = !G.s.robots[i]; { const m = (G.s.mods || [])[i] || {}; r.cap = m.bat ? CAMP_CAP : 1; r.solar = !!m.solar; r.fit = !!(G.fit && G.fit.i === i); }   /* Job 6b: night shifts and the fitted parts */
      if (!G.s.robots[i]) { r.state = 'bay'; r.timer = 1e9; r.charge = Math.min(r.charge, .3); r.load = false; r.want = undefined; G.deliv[i] = r.delivered; return; }
      const job = (G.s.jobs || [])[i], st = job && stockById(job);
      r.want = st ? st.site : undefined;
      if (!st && r.state === 'bay') r.timer = Math.max(r.timer, 1e9);
      if (st && r.state === 'bay' && r.timer > 1e5) r.timer = 0.4;
      G.kind = G.kind || []; if (r.kindLoad) G.kind[i] = r.kindLoad;
      const d0 = G.deliv[i] === undefined ? r.delivered : G.deliv[i];
      if (r.delivered > d0) { const kd = G.kind[i], k = kd === 'wood' ? 'planks' : kd === 'metal' ? 'metal' : (job === 'rope' ? 'rope' : 'glass');
        for (let q = d0; q < r.delivered; q++) { const tk = SHP() ? SHP().tripStock(i) : null; if (tk) { if (tk.units > 0) addStockUnits(tk.stock, tk.units); } else G.s = addHaul(G.s, k, 1); }   /* a trip from the storm haul adds what its heap held, by the heap's own kind */
        G.hauls = (G.hauls || 0) + (r.delivered - d0); }
      G.deliv[i] = r.delivered;
    });
    try { sim.wrackK = wrackAfterStorm(SHP() ? SHP().state().phase : 'none'); } catch (e) { /* none */ }
    const w = weatherState(); rt.force({ rain: (w === 'storm' || w === 'rain' || w === 'showers') ? true : null });
  } catch (e) { /* the camp is still starting */ }
}
/* the charging post: a lamp-post with a small panel at the yard, a labelled placeholder (no kit piece for it yet). Its lamp is green while a robot charges, amber while one is on its way home, dim otherwise. */
/* STORAGE BAYS (Job 6d item 2): one open bay per material at the yard, a stack that grows and shrinks with the stock in four steps, a plain sign each. Pure parts in where_from.js (LI_WHERE). */
const BAYCOL = { planks: 0xa98c5c, rope: 0xb19a6b, glass: 0x8fb4b0, metal: 0x7d8286 };
function bayNext() { const s = G.s; return BUILDS.find(b => b.id === (s.build || 'cistern')); }
function bayInfo(id) {
  const W = root.LI_WHERE, mat = id.slice(4), s = G.s; if (!W || !stockById(mat)) return null; const bots = (s.robots || []).map((on, i) => ({ on, job: (s.jobs || [])[i] })), nb = bayNext();
  const f = W.bayFlow(mat, s.stock[mat] || 0, STOCK_CAP, { robots: bots, robotPerMin: ROBOT_RATE, handPerMin: handRate(), needs: nb ? nb.needs : {} }), from = mat === 'planks' || mat === 'rope' ? 'Washed up at the tide line.' : mat === 'metal' ? 'Gathered from the shore piles.' : 'Gathered from the shore piles and the finds.';
  return W.bayText(f, k => stockById(k).short, from);
}
function storageBays() {
  const W = root.LI_WHERE, O = G.objs; if (!W || !G.root || O.bays === false) return; let rt = null; try { rt = C.li().campstart.rt(); } catch (e) { return; } if (!rt) return;
  if (!O.bays) {
    const y = rt.yard(), sim = rt.sim(), YP = sim.YP; if (!YP || !YP.heap) return;
    const obs = (rt.plan().pieces || []).map(p => ({ x: p.cx, z: p.cz, r: p.fr })).concat(YP.bays.map(b => ({ x: b.x, z: b.z, r: 1.6 })), [{ x: YP.apron.x, z: YP.apron.z, r: 3.4 }], YP.drops.map(d => ({ x: d.x, z: d.z, r: 1.6 })), (G.objs.post ? [{ x: G.objs.post.position.x, z: G.objs.post.position.z, r: 1 }] : []));
    const lay = W.bayLayout(YP.heap, obs, (x, z) => C.H(x, z), (C.tide ? C.tide() : 0) + .4, y.yaw); if (!lay) { O.bays = false; return; }
    const T = THREE, grp = new T.Group(); grp.name = 'storage_bays'; O.bays = { grp, list: [], step: {} };
    lay.forEach(sl => {
      const g = new T.Group(), gy = groundY(sl.x, sl.z), col = BAYCOL[sl.id]; g.position.set(sl.x, gy, sl.z); g.rotation.y = sl.yaw;
      const base = new T.Mesh(new T.BoxGeometry(1.7, .12, 1.3), lambert(0x6b5d49)); base.position.y = .06; g.add(base);
      const stack = []; for (let k = 0; k < 4; k++) { const m = new T.Mesh(new T.BoxGeometry(sl.id === 'rope' ? 1.0 : 1.4 - k * .1, .22, sl.id === 'metal' ? .8 : 1.0), lambert(col)); m.position.set(0, .23 + k * .22, 0); m.rotation.y = k * .12; m.visible = false; g.add(m); stack.push(m); }
      const post = new T.Mesh(new T.BoxGeometry(.06, .8, .06), lambert(0x5a4a38)); post.position.set(-.75, .4, .62); g.add(post);
      const tex = canvasTex(256, 64, (c, Wd, Hh) => { c.fillStyle = '#efe4c8'; c.fillRect(0, 0, Wd, Hh); c.strokeStyle = '#6b5d49'; c.lineWidth = 5; c.strokeRect(2, 2, Wd - 4, Hh - 4); c.fillStyle = '#3a2f22'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(W.SIGN[sl.id], Wd / 2, Hh / 2 + 2); });
      const sign = new T.Mesh(new T.PlaneGeometry(.7, .18), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide })); sign.position.set(-.75, .86, .66); g.add(sign);
      shadowed(g); grp.add(g); O.bays.list.push({ id: sl.id, x: sl.x, z: sl.z, stack }); });
    G.root.add(grp);
  }
  const B = O.bays; if (!B || !B.list) return; B.list.forEach(b => { const st = W.bayStep(G.s.stock[b.id] || 0); if (B.step[b.id] !== st) { B.step[b.id] = st; b.stack.forEach((m, k) => { m.visible = k < st; }); } });
}
function chargePost() {
  const O = G.objs; let rt = null; try { rt = C.li().campstart.rt(); } catch (e) { return; } if (!rt || !G.root) return;
  if (!O.post) {
    const y = rt.yard(), pt = y.points && y.points.apron; if (!pt) return; const T = THREE, g = new T.Group();
    const wood = new T.MeshLambertMaterial({ color: 0x6e5a40 }), tin = new T.MeshLambertMaterial({ color: 0x8d9291 });
    const pole = new T.Mesh(new T.CylinderGeometry(.07, .09, 2.1, 6), wood); pole.position.y = 1.05; g.add(pole);
    const pan = new T.Mesh(new T.BoxGeometry(.5, .34, .06), tin); pan.position.set(0, 1.55, .09); g.add(pan);
    const lamp = new T.Mesh(new T.SphereGeometry(.09, 8, 6), new T.MeshBasicMaterial({ color: 0x334433 })); lamp.position.set(0, 1.84, .1); g.add(lamp);
    const arm = new T.Mesh(new T.BoxGeometry(.6, .05, .05), wood); arm.position.set(0, 2.08, 0); g.add(arm);
    const cs = Math.cos(y.yaw), sn = Math.sin(y.yaw), x = pt.x + cs * 3.4, z = pt.z - sn * 3.4; g.position.set(x, groundY(x, z), z); g.rotation.y = y.yaw; g.userData.lamp = lamp; g.userData.label = 'charging post (placeholder, no kit model yet)'; G.root.add(g); O.post = g;
  }
  const bots = rt.robots(); let col = 0x2c382c, nm = 'dim'; if (bots.some(b => b.state === 'bay' && b.charge < .99 && G.s.robots[b.id])) { col = 0x58e060; nm = 'green'; } else if (bots.some(b => b.state === 'home' && G.s.robots[b.id])) { col = 0xe8a030; nm = 'amber'; }
  O.post.userData.lamp.material.color.setHex(col); O.post.userData.lampCol = nm;
}
/* (6) the evening */
function startEvening() {
  const S = G.spots; if (!S) return; const n = G.crates.length + 1; const m = addDeliveryCrate(n, true); G.crates[n - 1].letter2 = true; if (PHYS()) PHYS().onCrate(G.crates[n - 1], true);
  if (!PHYS()) { toast('The evening boat left crate number ' + n + '. There is a letter on top.', 6500); focus(G.crates[n - 1].pos.x, G.crates[n - 1].pos.z, 24); }
}
function readLetter2() {
  const first = !G.s.letter2, c = card('letter2', '<h2>Letter two</h2>' + LETTER2.map(l => '<p>' + l + '</p>').join('') + '<div class="sig">' + mark(30) + '</div>', 'gd-paper');
  c.appendChild(row(btn(first ? 'Keep it' : 'Close', () => { closeCard(); if (first) { setS({ letter2: true }); afterChange(); toast('The build menu is open. Choose one thing for the year ahead.', 6000); pulse('build'); setTimeout(buildCard, 700); } }, 'pri')));
}
function buildCard() {
  const s = G.s, L = s.ledger, c = card('build', '<h2>What do you build first?</h2><p><small>One thing for the year ahead. Materials come by boat on delivery credit (80 percent), local work is paid in cash (20 percent). You have ' + pound(L.cash) + ' cash and ' + pound(L.credit) + ' credit.</small></p>'); c.appendChild(xbtn());
  BUILDS.filter(b => !(PHYS() && b.id === 'jetty')).forEach(b => {
    const ok = PHYS() ? PHYS().canCommit(s, b.id) : canBuild(s, b.id), d = h('div', 'gd-item'); const done = s.build === b.id;
    d.innerHTML = '<div><b>' + b.name + '</b> &middot; ' + pound(b.total) + ' (' + pound(b.credit) + ' credit + ' + pound(b.cash) + ' cash)<small>' + b.earns + '</small><small>Year ahead: ' + b.year + '</small><small>Needs: ' + needText(b.needs) + ' (you have ' + stockLine(s.stock) + ').</small><small>Arrives ' + b.hours + '. Model: ' + b.kit + '.</small>' + (ok.ok || done ? '' : '<small>' + ok.why + '</small>') + '</div>';
    d.appendChild(btn(done ? 'Chosen' : 'Build', () => { if (!ok.ok) { toast(ok.why, 5600); return; } confirmBuild(b.id); }, 'pri' + (ok.ok || done ? '' : ' dim'), done)); c.appendChild(d);   /* OWNER bug: a card that cannot be chosen is dim, not dead: a tap says why (and where to get what is missing) */
  });
  c.appendChild(row(btn('Not yet', closeCard)));
}
function confirmBuild(id) {
  const b = BUILDS.find(x => x.id === id), c = card('confirm', '<h2>' + b.name + '</h2><p>' + b.earns + '</p><p>Cost: ' + pound(b.credit) + ' delivery credit, ' + pound(b.cash) + ' cash and ' + needText(b.needs) + ' from the yard stock.</p><p><small>You can only choose one this year.</small></p>');
  c.appendChild(row(btn('Build it', () => { if (PHYS()) { closeCard(); PHYS().commitBuild(id); return; } const r = doBuild(G.s, id); if (!r.ok) return toast(r.why); closeCard(); G.s = r.state; showBuilt(id); toast(b.name + ': materials arrive ' + b.hours + '. Your year: ' + b.year, 7500); afterChange(); pulse('ledger'); }, 'pri'), btn('Back', buildCard)));
}
function showBuilt(id) {
  if (id === 'jetty') { try { const rp = C.li().repair; if (rp) { let n = 0; for (let k = 0; k < 12; k++) { const m = rp.fitAll(); n += m; if (!m) break; } rp.step(30); } } catch (e) { G.err.push('jetty ' + e.message); } const j = G.spots.S.jetty; if (j) focus(j.ox, j.oz, 26); return; }
  const m = G.objs.builds[id]; if (m) { m.visible = true; const p = G.spots.build[id]; focus(p.x, p.z, 26); }
}
/* (7) the night */
function startNight() {
  G.nightT = 0; G.bottleOn = false; toast('Night. The light on the headland is lit.' + (Q0.get('names') === '0' ? '' : ' Over it, five stars in a crooked line. Call it the Latch.'), 7000);   /* BOLD-2: a name for a star group, text only (switch off: &names=0) */ if (G.spots && G.spots.stump) focus(G.spots.stump.x * .6 + G.spots.shore.x * .4, G.spots.stump.z * .6 + G.spots.shore.z * .4, 90, undefined, .8);
}
function nightTick(dt) {
  if (stageOf(G.s) !== 'night' && !(G.s.bottle === false && stageOf(G.s) === 'done')) return;
  dt *= G.fast || 1; G.nightT = (G.nightT || 0) + dt; const O = G.objs, S = G.spots; if (!S) return;
  if (G.nightT > 10 && !G.bottleOn) { G.bottleOn = true; O.bottle.visible = true; const t = S.tender.drop; const wp = waterPoint(t.x + C.W.camp.rt[0] * 8, t.z + C.W.camp.rt[1] * 8, C.W.camp.dir[0], C.W.camp.dir[1]); G.bottleP = { x0: wp.x + C.W.camp.dir[0] * 7, z0: wp.z + C.W.camp.dir[1] * 7, x1: wp.x - C.W.camp.dir[0] * 1.6, z1: wp.z - C.W.camp.dir[1] * 1.6 }; G.bottleT = 0; }
  if (G.bottleOn) { G.bottleT = (G.bottleT || 0) + dt; const k = clamp(G.bottleT / 16, 0, 1), P = G.bottleP, x = P.x0 + (P.x1 - P.x0) * k, z = P.z0 + (P.z1 - P.z0) * k; O.bottle.position.set(x, Math.max(C.tide() + .12, C.H(x, z) + .1) + Math.sin(performance.now() / 700) * .03 * (1 - k), z); O.bottle.rotation.y = 1.2; if (k >= 1 && !G.bottleToast) { G.bottleToast = true; toast('Something small has washed up. Tap the bottle.', 6000); } }
}
function readBottle() {
  const first = !G.s.bottle, msg = bottleMessage(G.s.seed);
  const c = card('bottle', '<h2>A bottle</h2><p>A cork, a rolled page. The writing is small and even.</p><p style="font-style:italic;font-size:19px">"' + msg + '"</p><div class="gd-money"><div><small>Ledger</small><b style="font-size:16px">' + creditNote(G.s.ledger, G.s.gh) + '</b></div></div>', 'gd-paper');
  c.appendChild(row(btn(first ? 'Keep it and rest' : 'Close', () => { closeCard(); if (first) { setS({ bottle: true }); ledgerLine('Bottle found on the lee shore', 0, 0); G.s.saved = true; afterChange(); save(); endOfDay(); } }, 'pri')));
}
function endOfDay() { toast('The island at night. Saved. You can close the page and come back.', 8000); G.ui.fade.style.opacity = '.0'; renderUi(); }
function sleepToMorning() {
  closeCard(); G.ui.fade.style.opacity = '1';
  setTimeout(() => { const c = ck(); const to = 24 + 7.2; if (G.clk0 === undefined) G.clk0 = clk0(); if (c) { c.freeze(false); c.setHours(G.clk0 + to); } G.s.gh = to; G.arrivals = []; deliveriesTick(); G.ui.fade.style.opacity = '0'; toast('Day 2. Morning. ' + (G.s.delivered.length ? 'Parcels came in the night.' : 'Nothing yet on the beach.'), 7000); renderUi(); save(); }, 1700);
}

/* ---------------- the HUD ---------------- */
function pulse(which) { G.pulse = which; setTimeout(() => { if (G.pulse === which) G.pulse = null; renderUi(); }, 9000); renderUi(); }
function renderUi() {
  if (!G.ui.strip) return; const s = G.s, stage = stageOf(s);
  const sig = [stage, jobsDone(s), s.plank, s.letter1, s.letter2, s.build, s.ledger.cash, s.ledger.credit, s.parts, s.water, G.pulse, G.helpPlank, G.crates.length, dayNo(), s.dry, s.crate1, s.finds.length, s.shipSeen, s.bottle, s.robots.join(), stockLine(s.stock), (s.jobs || []).join(), s.ordered, G.bottleOn, s.night, (PHYS() && PHYS().buildLine && PHYS().buildLine()) || '', (PHYS() && PHYS().hint && PHYS().hint()) || '', exploreHint(s) || '', fitHint() || '', JSON.stringify(s.mods || []), JSON.stringify(s.kits || {}), phaseNow(), G.wait ? G.wait.mode : '', lanternOn(), G.fit ? G.fit.i + G.fit.kit : ''].join('|');
  const tm = document.getElementById('gd-time'); if (tm) tm.textContent = hhmm(s.gh);
  const wx = document.getElementById('gd-wx'); if (wx && wx.textContent !== weatherState()) wx.textContent = weatherState();
  const bp = document.getElementById('gd-barrel'); if (bp) bp.textContent = 'Barrel: ' + Math.round(G.barrel || 0) + ' of 40 litres';   /* updated in place: a rebuilt HUD every frame while it rains made buttons impossible to press */
  if (sig === G.sig) return; G.sig = sig; const P = progress(s);
  const hintText = (G.wait && G.wait.mode ? (G.wait.mode === 'manual' ? 'Waiting for dawn. Tap anywhere to stop.' : 'Time is passing. Tap anywhere to stop.') : null) || (PHYS() && PHYS().hint && PHYS().hint()) || fitHint() || exploreHint(s) || nightHint(s) || (GD_CLEAN ? shortHint(s) : hintFor(s));
  G.ui.hint.innerHTML = ''; const sp = h('span', '', hintText); G.ui.hint.appendChild(sp);
  const mk = {};   /* every action button, made once; where it goes depends on the HUD mode */
  if (s.letter1) { const led = btn('<small style="display:block;font-weight:600;opacity:.7">Ledger</small>Cash ' + pound(s.ledger.cash) + '<br>Credit ' + pound(s.ledger.credit), ledgerCard, G.pulse === 'ledger' ? 'pulse' : ''); led.id = 'gd-ledger-btn'; led.style.textAlign = 'right'; led.style.lineHeight = '1.25'; mk.ledger = led; }
  if (s.letter1 && stage === 'jobs') { const b = btn('Notebook', notebook); b.id = 'gd-notes-btn'; mk.notes = b; if (G.helpPlank && !s.plank) { const fb = btn('Fit one plank', fitOnePlank, 'pri'); fb.id = 'gd-plank-btn'; mk.plank = fb; } }
  if (s.crate1 || G.crates.length) { const b = btn('Catalogue', catalogueCard); b.id = 'gd-cat-btn'; mk.cat = b; }
  if (s.letter2) { const bl = PHYS() && PHYS().buildLine && PHYS().buildLine(); const b = btn(bl ? 'Build<small style="display:block;font-weight:600;opacity:.75;font-size:11px;max-width:150px;white-space:normal">' + bl + '</small>' : (s.build ? 'Built: ' + BUILDS.find(x => x.id === s.build).name : GD_CLEAN ? 'Build' : 'Build menu'), buildCard, G.pulse === 'build' ? 'pulse' : ''); b.id = 'gd-build-btn'; mk.build = b; }
  if (exploreOn()) { const b = btn('Chart', chartCard); b.id = 'gd-chart-btn'; mk.chart = b; }
  if (isDark()) { const b = btn(G.wait && G.wait.mode ? 'Stop waiting' : 'Wait for dawn', () => waitReq(G.wait && G.wait.mode ? 'stop' : 'start')); b.id = 'gd-wait-btn'; mk.wait = b; }
  if (stage === 'done' && dayNo() === 1) { const b = btn('Sleep until morning', sleepToMorning, 'pri'); b.id = 'gd-sleep-btn'; mk.sleep = b; }
  const sk = h('select', 'gd-sel'); sk.id = 'gd-skip'; sk.setAttribute('aria-label', 'Test: skip to'); sk.innerHTML = '<option value="">Test: skip to...</option>' + ['arrive', 'jobs', 'delivery', 'yard', 'evening', 'night', 'done'].map(x => '<option value="' + x + '">' + (STAGE_LABEL[x] || 'Day 1 done') + '</option>').join('') + '<option value="day2">Day 2 morning</option><option value="storm">The storm (now)</option><option value="new">New game (forget the save)</option>';
  sk.addEventListener('change', () => { const v = sk.value; sk.value = ''; skipTo(v); });
  const R = G.ui.right; R.innerHTML = '';
  if (!GD_CLEAN) {
    G.ui.strip.innerHTML = '<b title="' + calOf(dayNo()).long + '">Day ' + dayNo() + '</b>' + P.map(p => '<i class="' + (p.done ? 'done' : p.current ? 'cur' : '') + '">' + p.label + (p.id === 'jobs' && p.current ? ' ' + (jobsDone(s) + (s.plank ? 1 : 0)) + '/4' : '') + '</i>').join('') + '<small id="gd-time">' + hhmm(s.gh) + '</small>';
    ['ledger', 'notes', 'plank', 'cat', 'build', 'chart', 'sleep', 'wait'].forEach(k => { if (mk[k]) R.appendChild(mk[k]); }); R.appendChild(sk);
  } else {
    /* top left: Day, the stage you are in, six dots, and one line of status */
    const cur = P.find(q => q.current); G.ui.strip.innerHTML = '<b title="' + calOf(dayNo()).long + '">Day ' + dayNo() + '</b><i class="cur">' + (cur ? cur.label + (cur.id === 'jobs' ? ' ' + (jobsDone(s) + (s.plank ? 1 : 0)) + '/4' : '') : (stage === 'dock' ? 'The dock' : 'Done')) + '</i><span class="gd-dots">' + P.map(q => '<u class="' + (q.done ? 'done' : q.current ? 'cur' : '') + '"></u>').join('') + '</span><small class="gd-line2" id="gd-status"><span id="gd-time">' + hhmm(s.gh) + '</span> &middot; <span id="gd-wx">' + weatherState() + '</span></small>';
    /* top right: the ledger, then the one button that fits this moment, then Menu. The rest live in the Menu. */
    const main = stage === 'jobs' ? 'notes' : (stage === 'delivery' || stage === 'yard') ? 'cat' : stage === 'evening' ? 'build' : stage === 'done' ? 'sleep' : null;
    if (mk.ledger) R.appendChild(mk.ledger);
    if (mk.plank) R.appendChild(mk.plank);
    if (main && mk[main]) R.appendChild(mk[main]);
    if (mk.build && main !== 'build') R.appendChild(mk.build);   /* OWNER 25 Nov: the Build button is permanent once the letter is read, not behind Menu */
    const mb = btn(G.menuOpen ? 'Close menu' : 'Menu', () => { G.menuOpen = !G.menuOpen; document.body.classList.toggle('gd-menuopen', G.menuOpen); G.sig = null; renderUi(); }); mb.id = 'gd-menu-btn'; R.appendChild(mb);
    const mn = h('div', 'gd-pill'); mn.id = 'gd-menu'; ['notes', 'cat', 'chart', 'sleep', 'wait'].forEach(k => { if (mk[k] && k !== main) mn.appendChild(mk[k]); }); mn.appendChild(sk);
    const dv = btn(document.body.classList.contains('gd-showdev') ? 'Hide test controls' : 'Test controls', () => { document.body.classList.toggle('gd-showdev'); G.sig = null; renderUi(); }); dv.id = 'gd-dev-btn'; mn.appendChild(dv); R.appendChild(mn);
  }
  const L = G.ui.left; L.innerHTML = '';
  const hasStock = s.robots.some(Boolean) || STOCKS.some(k => (s.stock[k.id] || 0) > 0), tot = STOCKS.reduce((a, k) => a + (s.stock[k.id] || 0), 0);
  if (G.leftCollapsed === undefined) G.leftCollapsed = GD_CLEAN && innerWidth < 600;
  if (GD_CLEAN && (hasStock || s.water) && G.leftCollapsed) { const w = btn('Stock ' + tot, () => { G.leftCollapsed = false; G.sig = null; renderUi(); }); w.id = 'gd-stock-btn'; w.style.fontSize = '14px'; L.appendChild(w); }
  else {
    if (s.water) { const w = h('div', 'gd-pill', 'Barrel: ' + Math.round(G.barrel || 0) + ' of 40 litres'); w.id = 'gd-barrel'; w.style.fontSize = '14px'; L.appendChild(w); }
    if (hasStock) { const w = btn(stockLine(s.stock) + '<small style="display:block;font-size:11px;font-weight:600;opacity:.75">' + rateText(null) + '<br>Washed up at the tide line</small>', robotsCard); w.id = 'gd-stock-btn'; w.title = 'Washed up at the tide line'; w.style.fontSize = '14px'; w.style.textAlign = 'left'; L.appendChild(w); }
    if (GD_CLEAN && (hasStock || s.water)) { const c = btn('Hide', () => { G.leftCollapsed = true; G.sig = null; renderUi(); }); c.style.fontSize = '13px'; c.id = 'gd-left-hide'; L.appendChild(c); }
    if (s.parts) { const w = h('div', 'gd-pill', 'Parts: ' + s.parts); w.style.fontSize = '14px'; L.appendChild(w); }
  }
}

/* one short imperative sentence for the bottom centre (under eight words). The long hintFor stays in the core for tests and the notebook. */
/* the night hint: real choices, not one order (Job 6b). Only when the physical layer has nothing more urgent and the night's own story beat (the bottle) is not waiting. */
function nightHint(s) { if (phaseNow() !== 'night') return null; if (stageOf(s) === 'night' && !s.bottle) return null; if (stageOf(s) === 'arrive' || stageOf(s) === 'dock') return null; return lanternOn() ? 'Robots charging. Work by lantern, or wait for dawn.' : 'Robots charging. Light the lantern, or wait for dawn.'; }
function shortHint(s) {
  switch (stageOf(s)) {
    case 'dock': return 'Row to the glow.';
    case 'arrive': return 'Tap the crate.';
    case 'jobs': if (!s.dry) return 'Get dry.'; if (!s.water) return 'Find water.'; if (s.finds.length < 2) return 'Look along the shore.'; return 'Fit a jetty plank.';
    case 'delivery': return s.crate1 ? 'Order something small.' : 'Wait for the boat.';
    case 'yard': return s.robots.some(Boolean) ? 'Give the robot an order.' : s.parts > 0 ? 'Fit a part to a carrier.' : 'Find a track link.';
    case 'evening': return s.letter2 ? 'Choose one thing to build.' : 'Open the new crate.';
    case 'night': return 'Tap the bottle.';
    default: return 'Day one is done.';
  }
}
/* ---------------- skip to ---------------- */
function applyWorldToState() {
  const s = G.s, O = G.objs, S = G.spots; if (!S || !O.crate) return;
  O.crate.userData.lid.position.set(s.letter1 ? .2 : 0, s.letter1 ? .98 : .75, s.letter1 ? -.32 : 0); O.crate.userData.lid.rotation.x = s.letter1 ? -.9 : 0; if (O.key) O.key.visible = !s.letter1; G.crateDone = s.letter1;
  O.hut.userData.door.position.x = s.hutOpen ? -1.6 : -.9; O.hut.userData.patch.visible = s.dry === 'hut'; O.tarp.visible = s.dry === 'tarp';
  G.crates.forEach(c => G.root.remove(c.mesh)); G.crates = [];
  if (s.crate1) { const m = addDeliveryCrate(1, false); G.crates[0].opened = true; m.userData.lid.position.set(.2, .98, -.32); m.userData.lid.rotation.x = -.9; }
  if (s.letter2 || stageOf(s) === 'evening') { const n = G.crates.length + 1; addDeliveryCrate(n, false); G.crates[n - 1].letter2 = true; }
  s.orders.filter(o => o.delivered).forEach(o => { const n = G.crates.length + 1; addDeliveryCrate(n, false); G.crates[n - 1].item = o.item; G.crates[n - 1].opened = !!o.taken; });
  S.finds.forEach((f, i) => { f.taken = s.finds.length > 0 && i < s.finds.length; O.finds[i].visible = !f.taken; });
  Object.keys(O.builds).forEach(k => { O.builds[k].visible = s.build === k; }); if (s.build === 'jetty') showBuilt('jetty');
  O.ship.visible = false; O.tender.visible = false; G.dlv = null; G.bottleOn = false; O.bottle.visible = false; G.bottleToast = false; G.nightT = 0;
  if (s.plank) { try { const rp = C.li().repair; if (rp && rp.count().fitted < 1) { const so = rp.sockets().filter(q => !q.filled && q.kind === 'plank'), bo = rp.bodies().filter(b => b.kind === 'plank' && b.state === 'dyn' && !b.lost); if (so.length && bo.length) { rp.teleport(bo[0].id, so[so.length - 1].p.slice()); rp.fit(bo[0].id); rp.step(30); } } } catch (e) { /* later */ } }
  G.weather = ''; clockSet(s.gh); renderUi();
  try { if (PHYS()) PHYS().invalidate(s.phys); } catch (e) { G.err.push('phys resync ' + e.message); }
  try { if (SHP()) { SHP().onLoad(s.storm); SHP().restoreCrates(); } } catch (e) { G.err.push('storm resync ' + e.message); }
  try { const bd = BDP(); if (bd && bd.resync) { bd.resync(); G.boatRev = !!(s.ordered); } } catch (e) { G.err.push('boat resync ' + e.message); }
}
function clockSet(gh) { const c = ck(); if (!c) return; if (G.clk0 === undefined) G.clk0 = clk0(); c.setHours(G.clk0 + gh); c.freeze(true); G.clockMode = 'hold'; }
function skipTo(v) {
  if (!v) return; if (v === 'new') { wipeSave(); G.s = newState(G.s.seed); closeCard(); applyWorldToState(); toast('A new start. The save is forgotten.', 4000); return; }
  closeCard(); let st;
  if (v === 'storm') { closeCard(); if (SHP()) SHP().start(); return; }
  if (v === 'day2') { st = canned('done', G.s.seed); st.gh = 31.2; st.orders.forEach(o => { o.delivered = true; }); st.delivered = st.orders.map(o => o.item); st.stock = Object.assign({}, st.stock, { planks: (st.stock.planks || 0) + 4 }); }   /* the night shift brought a few more */
  else st = canned(v, G.s.seed);
  G.s = st; applyWorldToState();
  const f = G.spots; focus(f.shore.x - 4, f.shore.z, 40);
  if (stageOf(st) === 'delivery' && !st.shipSeen) startDelivery();
  if (stageOf(st) === 'evening' && !G.crates.some(c => c.letter2)) startEvening();
  renderUi(); save();
}

/* ---------------- the frame ---------------- */
function tick(dt) {
  if (!G.ready || !G.root) return;
  const s = G.s; G.idle += dt; try { inspectTick(dt); } catch (e) { if (G.err.length < 20) G.err.push('inspect ' + e.message); }
  if (G.root.parent !== C.scene) C.scene.add(G.root);
  waitTick(dt); ambientTick(dt); clockTick(dt); weatherTick(); try { if (SHP()) SHP().tick(dt * (G.fast || 1)); } catch (e) { if (G.err.length < 20) G.err.push('storm ' + e.message); } holdRobots(); chargePost(); try { storageBays(); } catch (e) { if (G.err.length < 20) G.err.push('bays ' + e.message); } handTick(dt);  plankWatch(); try { if (PHYS()) PHYS().tick(dt * (G.fast || 1)); } catch (e) { if (G.err.length < 20) G.err.push('phys ' + e.message); } deliveriesTick(); deliveryTick(dt); nightTick(dt); focusTick(dt);
  try { const bd = BDP(); if (bd && bd.tick) { bd.tick(dt); if (!G.boatRev && s.ordered) { G.boatRev = true; if (bd.reveal) bd.reveal(); } } } catch (e) { if (G.err.length < 20) G.err.push('boat ' + e.message); }
  try { exploreTick(dt); } catch (e) { if (G.err.length < 20) G.err.push('explore ' + e.message); }
  try { G.stT = (G.stT || 0) + dt; if (G.stT > .12) { G.stT = 0; stopChips(); } } catch (e) { if (G.err.length < 20) G.err.push('stops ' + e.message); }
  const O = G.objs, tide = C.tide();
  /* barrel fills in rain */
  if (s.water) { if (isRaining()) G.barrel = Math.min(40, (G.barrel || 0) + dt * 1.6); }
  /* seals slip into the water when the view comes near their rock */
  O.seals.forEach(sl => { const near = (Math.hypot(C.cam.tx - sl.position.x, C.cam.tz - sl.position.z) < 34 && C.cam.dist < 120) || !!sl.userData.boatFlee; const target = near ? -.8 : sl.userData.base; sl.position.y += (target - sl.position.y) * Math.min(1, dt * 2); sl.visible = sl.position.y > -.6; });
  /* the stump lamp at night, a slow flicker */
  if (O.stumpGlow) { const night = isNight() ? 1 : 0; G.lamp = (G.lamp || 0) + (night - (G.lamp || 0)) * Math.min(1, dt * .8); O.stumpGlow.material.opacity = G.lamp * (.8 + .15 * Math.sin(performance.now() / 380) + .05 * Math.sin(performance.now() / 91)); O.stumpGlow.visible = G.lamp > .01; }
  /* no person is drawn in the gift: the camp's three figures and the jetty marker stay hidden (people are counted, not shown) */
  G.pT = (G.pT || 0) + dt; if (G.pT > .4) { G.pT = 0; try { (C.people ? C.people() : []).forEach(p => { if (p.g) p.g.visible = false; }); const rp = C.li().repair && C.li().repair.dbg(); if (rp && rp.marker && rp.marker.g) rp.marker.g.visible = false; } catch (e) { /* not built yet */ } }
  /* hint ring: only after a quiet while, never a quest marker */
  const ring = O.ring; let want = null; if (G.idle > 22 && !G.cardOpen) want = hintTarget(); if (want && hintLocked(want)) want = null;   /* Job 6c: nothing glows that you cannot use yet */
  if (want) { ring.position.set(want.x, groundY(want.x, want.z) + .08, want.z); ring.scale.setScalar(want.r || 1.8); ring.material.opacity += (.55 + .25 * Math.sin(performance.now() / 400) - ring.material.opacity) * Math.min(1, dt * 3); }
  else ring.material.opacity += (0 - ring.material.opacity) * Math.min(1, dt * 4);
  ring.visible = ring.material.opacity > .02;
  G.hudT = (G.hudT || 0) + dt; if (G.hudT > 1) { G.hudT = 0; renderUi(); }
  hudTick(dt);
}
/* HUD helpers: the one-time plank hint near the jetty, and no wooden rim above the horizon in portrait (cheap: the page's own rim switch) */
function hudTick(dt) {
  G.hT = (G.hT || 0) + dt; if (G.hT < .5) return; G.hT = 0;
  const ph = document.getElementById('gd-plankhint');
  if (ph) { const j = G.spots && G.spots.S && G.spots.S.jetty; const near = j && Math.hypot(C.cam.tx - j.ox, C.cam.tz - j.oz) < 40 && C.cam.dist < 70; ph.style.display = (GD_CLEAN && near && !G.s.plank && stageOf(G.s) === 'jobs' && !G.cardOpen) ? 'block' : 'none'; }
  try { const port = innerHeight > innerWidth * 1.1, bow = BDP() && BDP().state && (BDP().state().mode === 'drive'); if (GD_CLEAN && port && !bow && Q0.get('rim') !== '1') C.li().xboat.rim(false); } catch (e) { /* the rim stays */ }
}
function hintLocked(w) { try { const sc = screenOf(w.x, groundY(w.x, w.z) + .5, w.z); if (!sc) return false; let best = null, bd = 1e9; for (const t of targets()) { const d = Math.hypot(t.x - sc.x, t.y - sc.y); if (d < t.r * 1.2 && d < bd) { bd = d; best = t; } } const i = best && inspectInfo(best.id); return !!(i && i.locked); } catch (e) { return false; } }
function hintTarget() {
  const s = G.s, S = G.spots, st = stageOf(s); if (!S) return null;
  try { const bd = BDP(), t = bd && bd.hintTarget && bd.hintTarget(); if (t && st !== 'arrive' && st !== 'jobs') return t; } catch (e) { /* none */ }
  try { const t = SHP() && SHP().hintTarget(); if (t && st === 'done') return t; } catch (e) { /* none */ }
  if (st === 'arrive') return { x: S.crate.x, z: S.crate.z, r: 1.7 };
  if (st === 'jobs') { if (!s.dry) return { x: S.hut.x, z: S.hut.z, r: 3 }; if (!s.water) return { x: S.barrel.x, z: S.barrel.z, r: 1.4 }; const f = S.finds.find(q => !q.taken); if (s.finds.length < 2 && f) return { x: f.x, z: f.z, r: 1.3 }; if (!s.plank && S.S.jetty) return { x: S.S.jetty.ox, z: S.S.jetty.oz, r: 3 }; }
  if (st === 'delivery' && G.crates[0]) return { x: G.crates[0].pos.x, z: G.crates[0].pos.z, r: 1.7 };
  if (st === 'yard') { try { const y = C.li().campstart.rt().yard(); return { x: y.x, z: y.z, r: 4 }; } catch (e) { return null; } }
  if (st === 'evening') { const c = G.crates.find(q => q.letter2); if (c) return { x: c.pos.x, z: c.pos.z, r: 1.7 }; }
  if (st === 'night' && G.bottleOn) return { x: G.objs.bottle.position.x, z: G.objs.bottle.position.z, r: 1.5 };
  return null;
}

/* ---------------- ROBOT STOPS on the page (Job 6c item 2): the icon over a stopped robot, the sentence on its card, the last ten stops in the notebook ---------------- */
const STOPQ = () => root.LI_CAMP;
function stopOf(i) {   /* { code, say, label, icon, place } for a robot that is not working, else null */
  try { const rt = C.li().campstart.rt(), sim = rt.sim(), r = sim.robots[i], K = STOPQ(); if (!r || !K || !K.stopReason) return null; const code = K.stopReason(sim, r); if (!code) return null;
    if (code === 'switched_off' && ['arrive', 'jobs', 'delivery', 'dock'].includes(stageOf(G.s))) return null;
    return { code, say: K.stopSay(sim, r, code), label: K.STOPS[code].label, icon: K.STOPS[code].icon, place: K.placeOf(sim, r) }; } catch (e) { return null; }
}
function stopSvg(icon) { return '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ffe9b0" stroke="#ffe9b0" stroke-linejoin="round" aria-hidden="true">' + (STOP_ICONS[icon] || STOP_ICONS.wait) + '</svg>'; }
function stopChips() {
  G.ui.chips = G.ui.chips || []; let bots = []; try { bots = C.li().campstart.rt().robots(); } catch (e) { bots = []; }
  bots.forEach((b, i) => { let c = G.ui.chips[i]; if (!c) { c = G.ui.chips[i] = h('div', 'gd-stopchip'); c.style.cssText = 'position:fixed;z-index:5;display:none;width:28px;height:28px;margin:-40px 0 0 -14px;border-radius:50%;background:rgba(48,36,24,.82);border:2px solid #e0b040;pointer-events:none;align-items:center;justify-content:center'; document.body.appendChild(c); }
    const st = G.cardOpen === 'bot' ? null : stopOf(i), sc = st && b.ready !== false ? screenOf(b.x, b.y + 1.5, b.z) : null;
    if (!st || !sc) { c.style.display = 'none'; c.dataset.code = ''; return; }
    if (c.dataset.code !== st.code) { c.dataset.code = st.code; c.innerHTML = stopSvg(st.icon); c.title = st.say; c.setAttribute('aria-label', st.say); }
    c.style.display = 'flex'; c.style.left = Math.round(sc.x) + 'px'; c.style.top = Math.round(sc.y) + 'px'; });
}
function stopLines(n) {   /* the last n stops that lasted (no passing 'letting another pass' or 'pausing'), newest first */
  try { const rt = C.li().campstart.rt(), sim = rt.sim(), K = STOPQ(); return (sim.stops || []).filter(e => e.code !== 'give_way' && e.code !== 'resting' && (e.kind === 'abort' || e.dur === null || e.dur >= 8)).slice(-n).reverse().map(e => { const mins = Math.max(0, Math.round((sim.t - e.t0) / 60)); return { id: e.id, code: e.code, text: 'Carrier ' + (e.id + 1) + ': ' + K.STOPS[e.code].label.toLowerCase() + (e.pct !== undefined && (e.code === 'battery_low' || e.code === 'charging') ? ', ' + e.pct + ' percent' : '') + ', ' + e.place + (e.kind === 'abort' ? ' (a job was dropped)' : '') + '. ' + (mins < 1 ? 'Just now.' : mins + ' min ago.') }; }); } catch (e) { return []; }
}
/* ---------------- EXPLORATION (Job 6c item 1; owner playtest 25 Nov: "it is not clear how to explore") ----------------
   After the dock is finished the first destination is the outer skerry: a gold column and ring on the water there, a compass chip at the left edge (an arrow that turns with the camera and the distance in metres),
   the one line 'Something is wedged on the skerry.' while you row, and a Chart in the Menu that lists the places you know; tap one to head for it. The marker clears when the boat gets within reach of a chosen place
   or, by default, when the first skerry trip has been made (the motor is in the boat). */
const EXPLORE = { reachM: 14, tick: 0 };
function exploreOn() { try { const st = BDP().state(); return !!(G.ready && st.ready && st.avail && !(G.s.opening && !G.s.dockDone)); } catch (e) { return false; } }
function placePos(p) { try { const l = p.land && BDP().landings().find(q => q.id === p.land); if (!l) return null; const b = l.berth || l; return { x: b.x, z: b.z }; } catch (e) { return null; } }
function placesKnown() { return exploreOn() ? PLACES.filter(p => p.known(G.s) && placePos(p)) : []; }
function destNow() { if (!exploreOn()) return null; if (G.destSet !== undefined) return G.destSet; try { const st = BDP().state(); if (st.b && !st.b.got.engine) return 'skerry'; } catch (e) { /* none */ } return null; }
function camFwd() { const v = new THREE.Vector3(); C.camera.getWorldDirection(v); const l = Math.hypot(v.x, v.z); return l < 1e-4 ? { x: -Math.sin(C.cam.theta || 0), z: -Math.cos(C.cam.theta || 0) } : { x: v.x / l, z: v.z / l }; }
function exploreInfo() {
  const id = destNow(); if (!id) return null; const p = PLACES.find(q => q.id === id), pos = p && placePos(p); if (!pos) return null;
  let from = pos; try { const st = BDP().state(); if (st.b) from = { x: st.b.x, z: st.b.z }; } catch (e) { /* none */ }
  const f = camFwd(); return { id, name: p.name, line: p.line, pos, from, dist: Math.hypot(pos.x - from.x, pos.z - from.z), deg: arrowDeg(from, pos, f.x, f.z) };
}
function fitHint() { return G.fit && fitReady() ? 'Hold on the charging post to fit the part.' : null; }   /* Job 6c: the kit fit says what to do before you do it */
function exploreHint(s) {   /* one line, only while you are out rowing or the day has nothing else for you */
  const i = exploreInfo(); if (!i) return null; let drive = false; try { drive = BDP().state().mode === 'drive'; } catch (e) { drive = false; } return drive || stageOf(s) === 'done' ? i.line : null;
}
function exploreDom() {
  if (G.ui.compass) return G.ui.compass; const c = h('div', 'gd-pill'); c.id = 'gd-compass'; c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'Chart: the way to your destination');
  c.innerHTML = '<svg id="gd-compass-a" width="40" height="40" viewBox="-20 -20 40 40" aria-hidden="true"><circle r="18" fill="rgba(255,208,80,.25)" stroke="#d9a21c" stroke-width="2"/><path d="M0 -14 L8 8 L0 4 L-8 8 Z" fill="#d9a21c" stroke="#7a5a00" stroke-width="1.2"/></svg><span id="gd-compass-t"></span>';
  c.addEventListener('click', e => { e.stopPropagation(); chartCard(); }); G.ui.root.appendChild(c); G.ui.compass = c; return c;
}
function exploreMarker(info) {
  const O = G.objs, T = THREE; let m = O.dest;
  if (!m) { m = new T.Group(); m.name = 'destMarker'; const col = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 12, 1, true), new T.MeshBasicMaterial({ color: 0xffd050, transparent: true, opacity: .26, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending })); col.position.y = .5; m.add(col);
    const ring = new T.Mesh(new T.RingGeometry(.8, 1, 40), new T.MeshBasicMaterial({ color: 0xffd050, transparent: true, opacity: .85, depthWrite: false, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; m.add(ring); m.userData = { col, ring }; m.frustumCulled = false; G.root.add(m); O.dest = m; }
  m.visible = !!info; if (!info) return; const k = Math.max(3.2, C.cam.dist * .045), pul = 1 + .06 * Math.sin(performance.now() / 380);
  m.position.set(info.pos.x, C.tide(), info.pos.z); m.userData.col.scale.set(k * .55, 26 + k * 2, k * .55); m.userData.ring.scale.setScalar(k * pul);
}
function exploreTick(dt) {
  EXPLORE.tick += dt; const info = exploreInfo(), O = G.objs;
  if (info && G.destSet !== undefined && G.destSet !== null && info.dist < EXPLORE.reachM) { toast('You are at ' + info.name.toLowerCase() + '.', 4200); G.destSet = null; G.sig = null; }
  exploreMarker(exploreInfo());
  const c = exploreDom(), i2 = exploreInfo(); c.style.display = i2 && !G.cardOpen ? 'flex' : 'none';   /* never over a card: it sat on top of the barrel card's button */
  if (i2) { c.querySelector('#gd-compass-a').style.transform = 'rotate(' + Math.round(i2.deg) + 'deg)'; c.querySelector('#gd-compass-t').textContent = i2.name.replace(/^Home: /, '') + ', ' + Math.round(i2.dist) + ' m'; }
  const key = (i2 ? i2.id : '') + '|' + (exploreHint(G.s) || '') + '|' + placesKnown().length; if (key !== G.exKey) { G.exKey = key; G.sig = null; }
}
function chartCard() {
  closeCard(); const cur = destNow(), c = card('chart', '<h2>Chart</h2><p><small>The places you know. Tap one to set where you are headed.</small></p>');
  placesKnown().forEach(p => { const pos = placePos(p); let d = null; try { const b = BDP().state().b; d = Math.hypot(pos.x - b.x, pos.z - b.z); } catch (e) { d = null; }
    const b = btn(p.name + (d !== null ? ' (' + Math.round(d) + ' m)' : '') + (cur === p.id ? ' - heading here' : ''), () => { G.destSet = p.id; closeCard(); toast('Heading for ' + p.name.replace(/^Home: /, '').toLowerCase() + '. Follow the gold arrow.', 4200); G.sig = null; renderUi(); }, cur === p.id ? 'pri' : ''); b.dataset.place = p.id; b.style.cssText = 'display:block;width:100%;margin:6px 0;min-height:52px;text-align:left'; c.appendChild(b); });
  c.appendChild(h('p', '', '<small>More places appear on the chart as you find them.</small>'));
  c.appendChild(xbtn()); c.appendChild(row(btn('No destination', () => { G.destSet = null; closeCard(); G.sig = null; renderUi(); }), btn('Close', closeCard, 'pri')));
}
/* ---------------- the boat layer (boat_drive.js) gets a small handle on this page ---------------- */
function attachBoat() {
  const K = root.LI_BOAT_DRIVE; if (!K || !K.attach || G.boatAttached) return; G.boatAttached = true;
  K.attach({ C: () => C, THREE: () => THREE, S: () => G.s, patch: o => setS(o), save: () => save(), afterChange, toast, card, closeCard, btn, row, xbtn, weatherState, isNight, isAR, dayNo, hhmm, spots: () => G.spots, seals: () => (G.objs.seals || []), root: () => G.ui.root,
    screenOf, focus, focusing: () => !!G.focusT, cardOpen: () => !!G.cardOpen, targets: () => targets(), stockLine, STOCKS: () => STOCKS });
}
/* ---------------- the storm and haul layer (storm.js) gets a handle on this page ---------------- */
function addStockUnits(id, n) { if (!stockById(id) || !(n > 0)) return; const st = Object.assign({}, G.s.stock); st[id] = Math.min(STOCK_CAP, (st[id] || 0) + Math.round(n)); G.s = Object.assign({}, G.s, { stock: st }); renderUi(); }
function crateAdd(tag, msg) { const n = G.crates.length + 1; addDeliveryCrate(n, true); G.crates[n - 1][tag] = true; if (msg) { toast(msg, 7000); focus(G.crates[n - 1].pos.x, G.crates[n - 1].pos.z, 22); } }
function stormCtx() {
  const l = C.li(), U = () => l.ultra;
  return { THREE, scene: C.scene, camera: C.camera, renderer: C.renderer, cam: C.cam, W: C.W, H: C.H, tableR: () => C.tableR(), tier: () => U().tier(), device: () => U().device(), ar: isAR(), search: location.search, seed: C.seed, li: C.li,
    autoReset: () => !(U().on() || U().panelVisible()), setView: v => l.setView(v), getCam: () => Object.assign({}, C.cam),
    info: () => { const g = U().gpu(), r = C.renderer.domElement; return { gpu: g.name || g.raw, gpuKind: g.kind, screen: innerWidth + 'x' + innerHeight, canvas: r.width + 'x' + r.height }; } };
}
function attachPhys() {
  const K = root.LI_PHYS; if (!K || !K.attach || G.physAttached || Q0.get('physical') === '0') return; G.physAttached = true;
  const ok = K.attach({ C: () => C, THREE: () => THREE, S: () => G.s, patch: o => setS(o), save: () => save(), afterChange, toast, card, closeCard, btn, row, xbtn, focus, screenOf, spots: () => G.spots, groot: () => G.root, objs: () => G.objs, crates: () => G.crates, pulse, root: () => G.ui.root,
    isAR, groundY, dlv: () => G.dlv && G.dlv.phase, H: (x, z) => C.H(x, z), slope: slopeAt, free: (x, z, r) => free(G.spots.S, x, z, r), renderUi, weatherState, isNight });
  G.physOn = !!ok; if (ok && K.page && K.page.begin) K.page.begin();
}
function attachStorm() {
  const K = root.LI_STORM; if (!K || !K.attach || G.stormOn) return; if (Q0.get('storm') === '0') return;
  const ok = K.attach({ C: stormCtx, THREE: () => THREE, S: () => G.s, patch: o => setS(o), save: () => save(), afterChange, toast, card, closeCard, btn, row, xbtn, mark, focus, screenOf, root: () => G.ui.root, spots: () => G.spots, camp: () => C.W.camp.fire, tide: () => C.tide(), seed: () => C.seed,
    cardOpen: () => !!G.cardOpen, addStock: addStockUnits, STOCK_CAP, crateAdd });
  G.stormOn = !!ok;
}
/* ---------------- start ---------------- */
function start() {
  if (!G.s) { G.s = newState(C.seed); G.crates = []; G.barrel = 0; }
  if (!buildWorld()) { setTimeout(start, 500); return; }
  const loaded = Q0.get('stage') || Q0.get('day') ? null : load(), seed = C.seed;
  const qs = Q0.get('stage'), qd = Q0.get('day');
  G.s = newState(seed); G.crates = []; G.barrel = 0;
  if (qs && STAGES.includes(qs)) G.s = canned(qs, seed);
  else if (qd && parseInt(qd, 10) >= 2) { G.s = canned('done', seed); G.s.gh = 31.2; G.s.orders.forEach(o => { o.delivered = true; }); G.s.delivered = G.s.orders.map(o => o.item); }
  else if (loaded) G.s = loaded;
  G.s.seed = seed >>> 0; G.s.stage = stageOf(G.s);
  if (!qs && !qd && !loaded && Q0.get('physical') !== '0' && root.LI_PHYS && root.LI_PHYS.attach) G.s.opening = true;   /* the physical opening: arrive by boat, the dock half built */
  G.ready = true; attachBoat(); attachStorm(); attachPhys(); applyWorldToState();
  const sp = G.spots, dd = C.W.camp.dir, th = Math.atan2(-dd[0], -dd[1]) + .55, portPhi = innerHeight > innerWidth * 1.1 ? .22 : 0;   /* portrait: a higher pitch keeps the table's rim off the horizon */ if (!qs && !loaded && Q0.get('glide') === '0') Object.assign(C.cam, { tx: sp.crate.x, tz: sp.crate.z, dist: 30, phi: .5 + portPhi, theta: th });
  else if (!qs && !loaded) { /* BOLD-1 dawn glide: the view starts out over the water and settles on the crate (switch off: &glide=0) */ Object.assign(C.cam, { tx: sp.shore.x + (sp.shore.x - sp.crate.x) * 1.2, tz: sp.shore.z + (sp.shore.z - sp.crate.z) * 1.2, dist: 85, phi: .95, theta: th }); focus(sp.crate.x, sp.crate.z, 30, th, .5 + portPhi); G.focusT.slow = true; } else focus(sp.crate.x, sp.crate.z, 36, th, .55 + portPhi);
  if (G.s.stage === 'night' && !G.s.bottle) startNight();
  if (G.s.stage === 'evening' && !G.crates.some(c => c.letter2)) startEvening();
  if (G.s.stage === 'delivery' && !G.s.shipSeen) { setTimeout(() => { if (G.s.stage === 'delivery' && !G.s.shipSeen) startDelivery(); }, 600); }
  if (G.s.letter1) pulse('ledger');
  renderUi(); toast(loaded ? 'Welcome back. Your place was saved.' : 'Dawn. A small beach, a rusted hut, an old jetty.', 6000);
  let last = performance.now(); const loop = () => { const n = performance.now(), dt = Math.min(.25, (n - last) / 1000); last = n; try { tick(dt); } catch (e) { if (G.err.length < 20) G.err.push('tick ' + e.message); } requestAnimationFrame(loop); }; requestAnimationFrame(loop);
}
function init(ctx) {
  if (C) return G; C = ctx; THREE = ctx.THREE; buildDom(); wireInput();
  const w = document.getElementById('worldSel'); if (w) w.style.display = 'none';            /* the picker lists other worlds; the gift has one island */
  const wait = () => { let ok = false; try { const rt = C.li().campstart && C.li().campstart.rt(); ok = !!(C.W.camp && C.W.camp.fire && rt); } catch (e) { ok = false; } if (ok) start(); else setTimeout(wait, 300); }; wait();
  root.__gift = {
    state: () => JSON.parse(JSON.stringify(G.s)), stage: () => stageOf(G.s), core: CORE, err: () => G.err.slice(), spots: () => G.spots && { crate: G.spots.crate, hut: G.spots.hut, tender: G.spots.tender, build: G.spots.build, stump: G.spots.stump, shore: G.spots.shore, wreck: G.spots.wreck, barrel: G.spots.barrel, finds: G.spots.finds.map(f => ({ id: f.id, x: f.x, z: f.z, taken: f.taken })), ship: G.spots.ship },
    targets: () => targets(), tap: (cx, cy) => onTap(cx, cy), act: id => activate(id), skipTo, card: () => G.cardOpen, closeCard, toast: () => G.toast, hint: () => hintFor(G.s), save: () => save(false), load: () => load(), wipe: wipeSave, saveOk: SAVE_OK,
    ledger: ledgerCard, notebook, catalogue: catalogueCard, build: buildCard, letter1: readLetter1, letter2: readLetter2, fitPlank: fitOnePlank, order: orderItem, startRobot, giveOrder, robotsCard, doBuild: confirmBuild, post: () => G.objs.post && { x: G.objs.post.position.x, z: G.objs.post.position.z, lamp: G.objs.post.userData.lampCol }, bottle: readBottle, sleep: sleepToMorning,
    focus, calendar: () => calOf(dayNo()), clockMode: () => G.clockMode, weather: () => G.weather, hornCount: () => G.hornCount || 0, dlv: () => G.dlv && G.dlv.phase, barrel: () => G.barrel, crates: () => G.crates.map(c => ({ n: c.n, item: c.item || null, letter2: !!c.letter2, l9: !!c.l9 })),
    heavy: () => ({ ar: !!G.ar, seals: G.objs.seals.length, stumpKit: !!G.objs.stumpKit, finds: G.spots.finds.length, stumpScript: !!document.querySelector('script[src*="stump_b64"]') }),
    handHold: (id, sec) => { const st0 = Object.assign({}, G.s.stock); if (!handStart(id, 0, 0)) return { ok: false, got: 0 }; for (let t = 0; t < sec && G.hand && G.hand.down; t += .25) handTick(.25); handStop(); const st1 = G.s.stock; return { ok: true, got: STOCKS.reduce((n, k) => n + (st1[k.id] || 0) - (st0[k.id] || 0), 0) }; }, litterNow: () => litterNow(), stockSet: st => { G.s = Object.assign({}, G.s, { stock: Object.assign(emptyStock(), st) }); G.sig = null; }, bays: () => { const B = G.objs.bays; return B && B.list ? B.list.map(b => ({ id: b.id, x: b.x, z: b.z, step: B.step[b.id], shown: b.stack.filter(m => m.visible).length })) : []; }, bayInfo: id => bayInfo(id), baysTris: () => { const B = G.objs.bays; let t = 0; if (B && B.grp) B.grp.traverse(m => { if (m.isMesh && m.visible) t += m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3; }); return t; }, wrack: () => { try { const s = C.li().campstart.rt().sim(); return { k: s.wrackK || 1, w: s.wrack || null }; } catch (e) { return null; } }, phaseNow, litCircle, handOk: (x, z) => handOk(x, z, false), ringShown: () => !!(G.ring && G.ring.visible), setPhase: p => { G.phaseOverride = p; },
    deliverNow: id => { orderItem(id); const o = G.s.orders[G.s.orders.length - 1]; if (o) o.delivered = true; G.arrivals = (G.arrivals || []).concat([id]); }, openCrate: n => deliveryCrate(n), robotCardOpen: i => robotCard(i), startFit: (i, k) => startFit(i, k), fitState: () => G.fit && { i: G.fit.i, kit: G.fit.kit, ready: fitReady() }, cardText: () => (document.querySelector('.gd-card') || {}).textContent || '', clickBtn: txt => { const b = [...document.querySelectorAll('.gd-card button')].find(q => q.textContent.indexOf(txt) >= 0 && !q.disabled); if (b) { b.click(); return true; } return false; },
    waitReq: v => waitReq(v), waitState: () => ({ mode: G.wait && G.wait.mode, speed: G.waitSpeed || 1, mode0: G.clockMode }), actNow: () => { G.actAt = performance.now(); G.idle = 0; }, idleSet: v => { G.idle = v; }, hintNow: () => (G.ui.hint && G.ui.hint.textContent) || '',
    speedUp: k => { G.fast = k; }, inspect: id => { const t = targets().find(q => q.id === id); return t ? inspectInfo(id) : null; }, inspectAt: (cx, cy, touch) => { INS.coarse = !!touch; const t = nearestTarget(cx, cy); if (!t) { hideInspect(); return null; } showInspect(t, !!touch); return { id: t.id, info: inspectInfo(t.id), cls: inspectCls(t.id, inspectInfo(t.id) || {}), card: INS.el && INS.el.style.display !== 'none' ? INS.el.textContent : '' }; }, goldId: () => goldId(), targetsNow: () => targets(), insTable: () => INSPECT.map(q => String(q.re)), setHour: g => { G.s.gh = g; clockSet(g); }, uiRoot: () => G.ui.root, phys: () => PHYS(), addStock: (id, n) => addStockUnits(id, n),   /* test handle: stock without waiting for the shore */ userWeather: () => USER_WEATHER, objs: () => G.objs, nightT: () => G.nightT
    ,stops: () => { const out = []; try { const sim = C.li().campstart.rt().sim(); (sim.robots || []).forEach((r, i) => out.push({ i, st: stopOf(i), chip: !!(G.ui.chips && G.ui.chips[i] && G.ui.chips[i].style.display !== 'none') })); } catch (e) { /* none */ } return out; }, stopLines: n => stopLines(n || 10), stopChips: () => stopChips(),
    plinth: () => { const m = G.objs.stumpPlinth; return m && m.userData.plinth && Object.assign({ tris: m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3 }, m.userData.plinth); }, stumpAt: () => G.spots && G.spots.stump && { x: G.spots.stump.x, z: G.spots.stump.z },
    refresh: () => { G.sig = null; renderUi(); },
    startEvening: () => startEvening(), crateAdd: t => crateAdd(t, null), giveKit: k => { const kk = Object.assign({}, G.s.kits || {}); kk[k] = (kk[k] || 0) + 1; setS({ kits: kk }); }, setRobots: a => { setS({ robots: a }); },
    hintRing: () => { const r = G.objs.ring; return { on: !!(r && r.visible), x: r && r.position.x, z: r && r.position.z }; }, glow: () => { const r = G.objs.ring, on = !!(r && r.visible); return { gold: goldId(), mk: PHYS() && PHYS().state().marker, hint: (G.ui.hint && G.ui.hint.textContent) || '', ring: on, ringLocked: on ? hintLocked({ x: r.position.x, z: r.position.z }) : false }; },
    explore: () => { const i = exploreInfo(), c = G.ui.compass, m = G.objs.dest; return { on: exploreOn(), dest: destNow(), info: i, marker: !!(m && m.visible), compass: !!(c && c.style.display !== 'none'), compassText: c ? c.textContent : '', compassDeg: c ? c.querySelector('#gd-compass-a').style.transform : '', hint: exploreHint(G.s), places: placesKnown().map(p => p.id), gold: goldId() }; }, chart: () => chartCard(), setDest: v => { G.destSet = v; G.sig = null; renderUi(); }
  };
  return G;
}
root.LI_GIFT.init = init;
})(typeof window !== 'undefined' ? window : globalThis);
