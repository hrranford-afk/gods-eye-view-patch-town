/* Build 19 fixes: unique names, one bubble per radius, stale banners, follow-on goal, portrait request card, 1-line report, friendly places, GLB ink hull.
   Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/fixes19-test.js   Screenshots: shots/58-card-portrait.png, 59-noticed-panel.png, 60-bubbles-calm.png */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; __g.ENV.dateOverride = '2026-10-15'; __g.ENV._sk = 0; __g.envUpdate(); });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1500);
  /* 4. unique names */
  await ev(() => __g.simulate(3 * 3600, 0.5));
  const nm = await ev(() => { const a = __g.G.settlements.flatMap((S) => S.cols.map((c) => c.name)); return { n: a.length, u: new Set(a).size }; });
  ok('no two creatures share a name after 3 simulated hours', nm.n > 12 && nm.n === nm.u, JSON.stringify(nm));
  /* 2. one bubble at a time within a radius */
  const bub = await ev(() => {
    const S = __g.mainSettlement(), cs = S.cols.filter((c) => !c.inside).slice(0, 4); for (const T of __g.G.settlements) for (const q of T.cols) q.sayT = 0; __g.FUN.bubbles = 0;
    cs.forEach((c, i) => { c.x = 0.01 * i; c.z = 0; c.sayT = 0; });
    const r = cs.map((c, i) => { const v = __g.sayLine(c, 'Is it us?', 2, false); __g.FUN.bubbles = 0; return v; }); const shown = cs.filter((c) => c.sayT > 0).length;
    const f = __g.sayLine(cs[3], 'Ouch!', 2, true); return { r, shown, f, after: cs.filter((c) => c.sayT > 0).length };
  });
  ok('four creatures side by side: only one bubble opens', bub.shown === 1 && bub.r[0] === true && bub.r.slice(1).every((x) => !x), JSON.stringify(bub));
  ok('a forced bubble (a poke) clears its neighbours and shows', bub.f === true && bub.after === 1);
  /* 3. stale banners */
  const st = await ev(() => { __g.FUN.queue.length = 0; __g.FUN.bannerT = 99; __g.FUN.queue.push({ id: 'first-hut', S: __g.mainSettlement(), gt: __g.G.time - 60, st: __g.G.simT - 5000 }, { id: 'x', S: __g.mainSettlement(), gt: __g.G.time, st: __g.G.simT }); return 0; });
  await sleep(1200);
  ok('an old queued banner is dropped, a fresh one stays', await ev(() => !__g.FUN.queue.some((q) => q.id === 'first-hut') && __g.FUN.queue.some((q) => q.id === 'x')));
  await ev(() => { __g.FUN.queue.length = 0; __g.FUN.bannerT = 0; });
  /* 1. follow-on goal */
  await ev(() => { __g.seaPlace('leafpile', true); __g.seaPlace('leafpile', true); __g.seaPlace('leafpile', true); __g.seaPlace('supper', true); for (let i = 0; i < 5; i++) __g.seaPlace('plantern', true); __g.seaPlace('calendar', true); });
  await sleep(3000);
  const g1 = await ev(() => { const P = __g.seaProgress(); return { done: !!__g.SEA.done[__g.ENV.seasonKey], stage: P.stage, title: P.gl.title, items: P.items.length, pd: P.done }; });
  ok('autumn goal done, and a follow-on goal starts at once', g1.done && g1.stage === 1 && /winter/i.test(g1.title) && !g1.pd, JSON.stringify(g1));
  ok('the new goal text is marked as a placeholder', await ev(() => __g.SEASONS.every((q) => q.goal2 && q.by === 'CAIRN (placeholder)')));
  ok('the card shows the new goal title', await ev(() => __g.goalHtml().includes('Prepare for winter')));
  const g2 = await ev(() => { for (const it of __g.seaProgress().items) for (let i = it.b; i < it.n; i++) __g.seaPlace(it.k, true); return 1; }); await sleep(3000);
  const g3 = await ev(() => ({ st: __g.SEA.st[__g.ENV.seasonKey], title: __g.seaProgress().gl.title, saved: JSON.stringify(__g.SEA.st) }));
  ok('finishing the follow-on starts another, never a dead end', g3.st === 1 && /lovely/i.test(g3.title), JSON.stringify(g3));
  ok('an old save without "st" loads clean', await ev(() => { const d = { done: __g.SEA.done, adv: {}, unl: {}, packed: __g.SEA.packed }; __g.seaLoad(d); const r = __g.SEA.st && Object.keys(__g.SEA.st).length === 0; __g.seaLoad({ st: { [__g.ENV.seasonKey]: 1 }, done: d.done, packed: d.packed }); return r && __g.SEA.st[__g.ENV.seasonKey] === 1; }));
  /* 8. place names */
  ok('no place is called "Perch 2" or has a bare number', await ev(() => __g.G.zones.every((z) => !/\b\d\b/.test(z.name)) && !__g.G.zones.some((z) => /Perch \d/.test(z.name))), await ev(() => __g.G.zones.map((z) => z.name).join(' | ')));
  /* 9. count label */
  ok('every camp with huts has settlers (a "0 settlers" label cannot come from the game)', await ev(() => __g.G.settlements.filter((S) => !S.lost && S.things.some((t) => t.kind === 'hut' && t.built)).every((S) => S.cols.length > 0)));
  /* 5. ink hull */
  await sleep(1500);
  const ink = await ev(() => { let hulls = 0, scouts = 0; for (const S of __g.G.settlements) for (const c of S.cols) if (c.scout && c.mesh.userData.scout17) { scouts++; c.mesh.userData.scout17.model.traverse((o) => { if (o.userData && o.userData.ink) hulls++; }); } return { scouts, hulls, status: __g.SCOUT17.status }; });
  ok('the GLB scout wears a thin ink hull (a few meshes only)', ink.scouts >= 1 && ink.hulls >= ink.scouts && ink.hulls <= ink.scouts * 14, JSON.stringify(ink));
  /* 6. portrait card */
  const calm = () => ev(() => { __g.FUN.queue.length = 0; __g.FUN.bannerT = 0; document.getElementById('banner').className = ''; });
  await calm();
  await p.setViewportSize({ width: 820, height: 1180 }); await sleep(600);
  await ev(() => { __g.G.requests.length = 0; __g.G.requests.push({ who: 'Pip', S: __g.mainSettlement(), def: { text: "We can't reach the other places. Build us a cable car!", icon: 'bang', give: 'cablecar', by: 'CAIRN (placeholder)' }, id: 99 }); __g.G.reqDirty = true; });
  await ev(() => { document.getElementById('reqs').innerHTML = ''; try { __g.requestsStep(0.1); } catch (e) {} });
  /* build the card through the real UI function if it is exposed, else by the same markup */
  const card = await ev(() => { const f = window.reqUi; if (typeof f === 'function') f(); const r = document.getElementById('reqs'); const q = r.querySelector('.req'); if (!q) return null; const t = q.querySelector('div').getBoundingClientRect(), bt = q.querySelector('button').getBoundingClientRect(), qr = q.getBoundingClientRect(); return { tw: Math.round(t.width), tb: Math.round(t.bottom), bt: Math.round(bt.top), bw: Math.round(bt.width), cw: Math.round(qr.width), inside: bt.right <= innerWidth && qr.right <= innerWidth }; });
  ok('portrait: the request card has a real text column and the Yes button sits under the text', card && card.tw >= 200 && card.bt >= card.tb - 1 && card.inside, JSON.stringify(card));
  await calm(); await sleep(300); await p.screenshot({ path: OUT + '58-card-portrait.png' });
  /* 7. noticed panel */
  await ev(() => { __g.G.requests.length = 0; document.getElementById('reqs').innerHTML = ''; __g.G.report = { same: [], lines: [1, 2, 3, 4, 5].map((i) => ({ text: 'The colonists noticed thing number ' + i + ' on the desk and wrote it down.', by: '' })) }; __g.toast('Welcome back! The colony kept going.', 6); __g.showReport(); });
  await calm(); await sleep(500);
  const rp = await ev(() => { const c = document.getElementById('repc'), t = document.getElementById('toast'); const rl = c.querySelectorAll('.rl'), a = c.getBoundingClientRect(), tb = t.getBoundingClientRect(); const ov = !(a.bottom <= tb.top || a.top >= tb.bottom || a.right <= tb.left || a.left >= tb.right); return { shown: !c.hidden, lines: rl.length, last: rl.length ? rl[rl.length - 1].textContent : '', h: Math.round(a.height), overlap: ov && tb.height > 0, diary: !document.getElementById('diary').hidden }; });
  ok('the noticed panel: 1 line plus "and 4 more", short, no overlap with the toast, no tall side panel', rp.shown && rp.lines === 2 && /and 4 more/.test(rp.last) && rp.h < 120 && !rp.overlap && !rp.diary, JSON.stringify(rp));
  await p.screenshot({ path: OUT + '59-noticed-panel.png' });
  await ev(() => { const x = document.getElementById('repX'); if (x) x.click(); });
  /* calm bubbles screenshot */
  await p.setViewportSize({ width: 1180, height: 820 }); await sleep(600);
  await ev(() => { const S = __g.mainSettlement(); __g.focusOn && 0; for (const q of S.cols) q.sayT = 0; S.cols.filter((c) => !c.inside).forEach((c) => __g.sayLine(c, 'Is it us?', 6, false)); });
  await calm(); await sleep(800); const nb = await ev(() => __g.G.settlements.flatMap((S) => S.cols).filter((c) => c.sayT > 0).length);
  ok('a whole camp asked to speak at once shows at most 4 bubbles', nb >= 1 && nb <= 4, nb + ' bubbles');
  await p.screenshot({ path: OUT + '60-bubbles-calm.png' });
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); srv.close(); const f = res.filter((x) => !x).length; console.log(f ? f + ' FAILED' : 'ALL PASS (' + res.length + ')'); process.exit(f ? 1 : 0);
})();
