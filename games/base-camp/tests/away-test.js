// Base Camp build 7: a colony never expires. Return after 1 h, 3 days, 3 weeks, 6 months, 5 years: sane results, under 1 s, nothing lost, a short diary.
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/away-test.js
const { serve, launch } = require('./lib.js'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); __g.ENV.hourOverride = 12; }); await p.reload(); await sleep(1500);
  await p.click('#bMore'); await p.click('#bPrac'); const t0 = Date.now(); while (Date.now() - t0 < 120000) { await sleep(500); if (await ev(() => __g.G.settlements.length > 0)) break; }
  for (let i = 0; i < 200; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; }
  await ev(() => { __g.simulate(900, 0.5); __g.persist(true); });
  const base = await ev(() => ({ save: localStorage.getItem('base-camp-save-v2'), map: localStorage.getItem('base-camp-map-v1') })); const v = JSON.parse(base.save);
  ok('the colony save is schema-versioned (v2) and has settlements', v.v === 2 && v.settlements.length > 0, 'settlements ' + v.settlements.length + ', colonists ' + v.settlements.reduce((a, S) => a + S.cols.length, 0));
  const D = [['1 h', 3600], ['3 days', 3 * 86400], ['3 weeks', 21 * 86400], ['6 months', 183 * 86400], ['5 years', 5 * 365 * 86400]];
  for (const [name, secs] of D) {
    const r = await ev(async ([secs, base]) => {
      __g.resetWorld(); __g.G.auto = true; __g.G.previewSecs = null; const sv = JSON.parse(base.save); sv.t = Date.now() - secs * 1000; localStorage.setItem('base-camp-save-v2', JSON.stringify(sv)); localStorage.setItem('base-camp-map-v1', base.map);
      const t = performance.now(), okk = __g.prepareContinue(), wall = performance.now() - t, A = __g.G.awayRes;
      return { okk, wall, ms: A && A.ms, lines: A && A.lines.map((l) => l.text), cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), sett: __g.G.settlements.length, things: __g.G.settlements.reduce((a, S) => a + S.things.length, 0), zones: __g.G.zones.length, away: A && A.secs, fmt: A && window.__fmtAway ? 0 : 0 };
    }, [secs, base]);
    console.log(name, JSON.stringify({ wall: Math.round(r.wall), cols: r.cols, sett: r.sett, things: r.things, nLines: r.lines && r.lines.length })); console.log('   ' + (r.lines || []).map((l) => l.slice(0, 110)).join('\n   '));
    ok(name + ': loads, takes under 1 s (' + Math.round(r.wall) + ' ms), nothing lost, a diary of at most 10 lines', r.okk && r.wall < 1000 && r.cols >= v.settlements.reduce((a, S) => a + S.cols.length, 0) && r.sett === v.settlements.length && r.zones > 0 && r.lines.length >= 3 && r.lines.length <= 10 && Math.abs(r.away - secs) < 120);
    if (secs >= 21 * 86400) ok(name + ': the diary says how long (while you were away ' + name + ')', /away for ([\d.]+ (weeks?|months?|years?))/.test(r.lines[0]), r.lines[0]);
  }
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const f = res.filter((r) => !r).length; console.log(f ? f + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(f ? 1 : 0);
})();
