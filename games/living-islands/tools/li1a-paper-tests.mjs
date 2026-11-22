#!/usr/bin/env node
/* Living Islands LI-1a REFERENCE CALCULATOR (a design aid, NOT the game). It works the paper tests of LI1A_WORLD_CONTRACT.md exactly, with the contract's own rules and numbers,
   so the hand figures below can be checked by code now and compared with the real simulation later. Expected numbers are written by hand (independently of the functions).
   Every number marked TUNING in the contract is an assumption, not a measurement. Read-only. Exit 0 only if every expected number matches. */
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
/* ---- the contract's rules ---- */
const CARRY = { loaded_m_per_min: 60, empty_m_per_min: 90, handoff_min: 0.5 };   /* TUNING */
const trip = (d) => d / CARRY.loaded_m_per_min + d / CARRY.empty_m_per_min + CARRY.handoff_min;          /* one hand, one unit, boat to stores, and back */
function unload({ units, hands, distance, window }) {   /* hands carry one unit each, in parallel rounds; stops when the tide window closes */
  const t = trip(distance), maxRounds = Math.floor(window / t + 1e-9), needRounds = Math.ceil(units / hands), rounds = Math.min(needRounds, maxRounds);
  const landed = Math.min(units, rounds * hands);
  return { trip: t, rounds, landed, left_aboard: units - landed, minutes: rounds * t };
}
const FOUNDERS = 6, RECURRING_TASKS = ['water', 'cooking', 'camp', 'firewood', 'lookout'];   /* priority order: the LAST ones slip first */
const slipped = (hands) => RECURRING_TASKS.slice(Math.max(0, FOUNDERS - hands));
const PROJECTS = { bunk: { boards: 8, workers: 2, minutes: 90 }, stage: { boards: 12, workers: 3, minutes: 120 } };
function reserve(stock, name) { const p = PROJECTS[name]; if (stock.boards < p.boards) return { ok: false, boards_left: stock.boards, reason: 'needs ' + p.boards + ' boards, has ' + stock.boards }; return { ok: true, boards_left: stock.boards - p.boards, worker_minutes: p.workers * p.minutes }; }
const THRESHOLD = 4;   /* TUNING */
function visitor({ berth, work, provisions, safeLanding }) { const score = (berth ? 2 : 0) + (work ? 1 : 0) + (provisions ? 1 : 0) + (safeLanding ? 1 : 0); return { score, response: score >= THRESHOLD ? 'stays' : (score === THRESHOLD - 1 ? 'sleeps aboard, decides next tide' : 'sails away, may return') }; }
function belief(truth, reports, t) { const delivered = reports.filter((r) => r.delivered <= t).sort((a, b) => b.seen - a.seen)[0]; const tr = truth.filter((x) => x.t <= t).slice(-1)[0].state; return { truth: tr, believed: delivered ? delivered.state : 'unknown', report_dated: delivered ? delivered.seen : null }; }
function ledger(events) {   /* each unit has one id and one location; an event moves it once; a repeated event changes nothing (idempotent) */
  const loc = {}, seen = new Set();
  for (const e of events) { if (e.type === 'load') { loc[e.id] = 'aboard'; continue; } if (seen.has(e.key)) continue; seen.add(e.key); if (loc[e.id] === e.from) loc[e.id] = e.to; }
  const count = {}; Object.values(loc).forEach((l) => { count[l] = (count[l] || 0) + 1; }); return count;
}
let bad = 0; const ok = (name, c, got) => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (c ? '' : '  got ' + JSON.stringify(got))); };

/* ---- P1: unloading, and which jobs slip (10 units = 6 crates + 4 bundles of timber; rocky landing 60 m; improved landing stage 25 m; wide window) ---- */
ok('trip time: 60 m = 60/60 + 60/90 + 0.5 = 2.166667 min; 25 m = 25/60 + 25/90 + 0.5 = 1.194444 min', near(trip(60), 2.1666667) && near(trip(25), 1.1944444));
let u = unload({ units: 10, hands: 3, distance: 60, window: 99 });
ok('P1a three hands, rocky landing: ceil(10/3) = 4 rounds x 2.166667 = 8.666667 min; two jobs slip (firewood and lookout)', u.rounds === 4 && near(u.minutes, 8.6666667) && slipped(3).join() === 'firewood,lookout', [u, slipped(3)]);
u = unload({ units: 10, hands: 2, distance: 60, window: 99 });
ok('P1b two hands: 5 rounds = 10.833333 min; one job slips (lookout)', u.rounds === 5 && near(u.minutes, 10.8333333) && slipped(2).join() === 'lookout', u);
u = unload({ units: 10, hands: 3, distance: 25, window: 99 });
ok('P1c three hands, landing stage: 4 rounds x 1.194444 = 4.777778 min (3.888889 min saved)', near(u.minutes, 4.7777778) && near(8.6666667 - u.minutes, 3.8888889), u);
u = unload({ units: 10, hands: 2, distance: 25, window: 99 });
ok('P1d two hands, landing stage: 5 x 1.194444 = 5.972222 min', near(u.minutes, 5.9722222), u);
/* ---- P2: one project's worth of timber (16 boards on the boat) ---- */
let r = reserve({ boards: 16 }, 'bunk');
ok('P2a build the bunk: reserve 8 boards once, 8 left, 2 workers x 90 min = 180 worker-minutes', r.ok && r.boards_left === 8 && r.worker_minutes === 180, r);
r = reserve({ boards: 16 }, 'stage');
ok('P2b build the landing stage: reserve 12 boards, 4 left, 3 workers x 120 min = 360 worker-minutes', r.ok && r.boards_left === 4 && r.worker_minutes === 360, r);
r = reserve({ boards: 8 }, 'stage');
ok('P2c after the bunk (8 left) the stage is refused with a reason: only one project fits the first load, so the choice is real', !r.ok && /needs 12 boards, has 8/.test(r.reason), r);
/* ---- P3: the tide window, the next voyage brings 24 units ---- */
u = unload({ units: 24, hands: 3, distance: 60, window: 9 });
ok('P3a rocky landing, 9 minute window, 3 hands, 24 units: floor(9/2.166667) = 4 rounds, 12 landed, 12 stay aboard for the next tide', u.rounds === 4 && u.landed === 12 && u.left_aboard === 12 && near(u.minutes, 8.6666667), u);
u = unload({ units: 24, hands: 3, distance: 25, window: 30 });
ok('P3b landing stage, 30 minute window: 8 rounds x 1.194444 = 9.555556 min, all 24 landed, none left', u.rounds === 8 && u.landed === 24 && u.left_aboard === 0 && near(u.minutes, 9.5555556), u);
u = unload({ units: 24, hands: 2, distance: 25, window: 30 });
ok('P3c landing stage with only 2 hands: 12 rounds = 14.333333 min, all landed, and four jobs stay covered (one slips)', u.landed === 24 && near(u.minutes, 14.3333333) && slipped(2).length === 1, [u, slipped(2)]);
/* ---- P4: the visitor (an invited carpenter), threshold 4 ---- */
let v = visitor({ berth: true, work: true, provisions: true, safeLanding: false });
ok('P4a opening A (bunk built): berth 2 + work 1 + provisions 1 = 4: stays', v.score === 4 && v.response === 'stays', v);
v = visitor({ berth: false, work: true, provisions: true, safeLanding: true });
ok('P4b opening B (landing stage built): work 1 + provisions 1 + safe landing 1 = 3: sleeps aboard and decides next tide (a third response)', v.score === 3 && /sleeps aboard/.test(v.response), v);
v = visitor({ berth: false, work: true, provisions: true, safeLanding: false });
ok('P4c neither built: 2: sails away, may return on a later voyage', v.score === 2 && /sails away/.test(v.response), v);
v = visitor({ berth: true, work: true, provisions: true, safeLanding: true });
ok('P4d both built (a later state): 5: stays, with room to spare', v.score === 5 && v.response === 'stays', v);
/* ---- P5: knowledge versus truth (hours) ---- */
const truth = [{ t: 0, state: 'slipway usable' }, { t: 6, state: 'slipway broken by storm' }];
const reports = [{ seen: 2, delivered: 8, state: 'slipway usable' }, { seen: 14, delivered: 16, state: 'slipway broken by storm' }];
let b = belief(truth, reports, 5);
ok('P5a hour 5: truth usable, nothing delivered yet, believed unknown', b.truth === 'slipway usable' && b.believed === 'unknown' && b.report_dated === null, b);
b = belief(truth, reports, 7);
ok('P5b hour 7: the slipway is already broken (hour 6) but the colony still knows nothing (report not delivered)', b.truth === 'slipway broken by storm' && b.believed === 'unknown', b);
b = belief(truth, reports, 9);
ok('P5c hour 9: the colony believes "usable" from a report dated hour 2, delivered at hour 8; the truth is broken: a decision is made under uncertainty', b.believed === 'slipway usable' && b.report_dated === 2 && b.truth === 'slipway broken by storm', b);
b = belief(truth, reports, 16);
ok('P5d hour 16: fresh evidence (dated hour 14, delivered hour 16) corrects the belief', b.believed === 'slipway broken by storm' && b.report_dated === 14, b);
/* ---- P6: the ledger counts every unit once ---- */
const ev = [];
for (let i = 1; i <= 10; i++) ev.push({ type: 'load', id: 'u' + i });
for (let i = 1; i <= 10; i++) ev.push({ type: 'move', id: 'u' + i, from: 'aboard', to: 'beach', key: 'land-u' + i });
for (let i = 1; i <= 10; i++) ev.push({ type: 'move', id: 'u' + i, from: 'beach', to: 'stores', key: 'store-u' + i });
let c = ledger(ev);
ok('P6a ten units loaded, landed and stored: 10 in stores, none elsewhere', c.stores === 10 && Object.keys(c).length === 1, c);
c = ledger([...ev, { type: 'move', id: 'u3', from: 'beach', to: 'stores', key: 'store-u3' }, { type: 'move', id: 'u3', from: 'beach', to: 'stores', key: 'store-u3' }]);
ok('P6b the same "store u3" event arriving twice (a save and reload mid-transfer) adds it ONCE: still 10 in stores, never 11', c.stores === 10, c);
c = ledger(ev.slice(0, 10).concat(ev.slice(10, 16)));
ok('P6c a save halfway (6 landed, none stored): 6 on the beach and 4 aboard, 10 in all: nothing created or lost', c.beach === 6 && c.aboard === 4 && c.beach + c.aboard === 10, c);
console.log('\n' + (bad ? bad + ' FAILED' : 'all paper tests match the hand numbers')); process.exit(bad ? 1 : 0);
