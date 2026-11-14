/* Build 23: market day (an idea by Harry). On Wednesdays and Sundays the colonies hold a market: a buildable Market, a request when there is none,
   traders walking and riding to the stalls, real stock moving between camps, a single camp still trading, nothing on a Tuesday, quiet at night, a line in the away diary.
   Run (from games/base-camp): NODE_PATH=$(npm root -g) node tests/market-test.js */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const WED = '2026-11-18', TUE = '2026-11-17';
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.reload(); await sleep(1500);
  const setDate = (d, h) => ev(([d, h]) => { __g.ENV.dateOverride = d; if (h !== undefined) __g.ENV.hourOverride = h; __g.ENV._sk = 0; __g.envUpdate(); return __g.mktWeekday(); }, [d, h]);
  await setDate(TUE, 12);
  ok('BUILD is build 24', await ev(() => __g.BUILD === 'build 24'));
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
  /* the first session's seed request and campfire are another test's business: turn the first session off, keep the rest */
  await ev(() => { __g.F10.on = false; for (const r of __g.G.requests.slice()) __g.resolveRequest(r, true); __g.F10.reqDone = true; });
  const shotPrep = () => ev(() => { for (const id of ['toast', 'env', 'sel']) { const e = document.getElementById(id); if (e) { if (id === 'toast') e.innerHTML = ''; else e.hidden = true; } } __g.CCAM && __g.camClose && __g.camClose(); });
  const focusMarket = (d, yaw, pitch) => ev(([d, yaw, pitch]) => { const st = __g.mktThings(true)[0]; if (!st) return false; const w = st.S.group.localToWorld(new __g.THREE.Vector3(st.t.x, 0, st.t.z)); __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = yaw; __g.P.pitch = pitch; __g.focusOn(w.x, w.y + 0.025, w.z, d); return true; }, [d, yaw, pitch]);
  const focusVisitor = (id, d, rot, pitch) => ev(([id, d, rot, pitch]) => { /* look past the visitor at the market, from a little to the side, so the bubbles sit in the middle */
    const st = __g.mktSite(); const v = st.S.cols.find((c) => c.id === id); if (!v) return false; const m = st.S.group.localToWorld(new __g.THREE.Vector3(st.t.x, 0, st.t.z)), w = st.S.group.localToWorld(new __g.THREE.Vector3(v.x, 0, v.z));
    const a = Math.atan2(w.x - m.x, w.z - m.z) + rot; __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = a; __g.P.pitch = pitch; __g.focusOn((m.x + w.x) / 2, m.y + 0.04, (m.z + w.z) / 2, d); return true; }, [id, d, rot, pitch]);

  /* 1. the Market in the Build menu, locked on a Tuesday for a brand-new camp */
  ok('the Market is a build kind with a cost and a footprint', await ev(() => !!__g.KINDS.market && __g.KINDS.market.wood > 0 && __g.KINDS.market.r > 0.04 && __g.KINDS.market.name === 'Market'));
  ok('Tuesday is not a market day, Wednesday and Sunday are', await ev(() => { const o = __g.ENV.dateOverride, r = []; for (const d of ['2026-11-17', '2026-11-18', '2026-11-22', '2026-11-19']) { __g.ENV.dateOverride = d; r.push(__g.mktIsDay()); } __g.ENV.dateOverride = o; return r.join(); }) === 'false,true,true,false');
  const pop0 = await ev(() => ({ pop: __g.mainSettlement().cols.length, huts: __g.mainSettlement().things.filter((t) => t.kind === 'hut' && t.built).length }));
  await ev(() => __g.setTool('build')); await sleep(300);
  const menu0 = await ev(() => { const bt = document.querySelector('#bmenu button[data-build="market"]'); return bt ? { text: bt.textContent, lock: !!bt.dataset.lock } : null; });
  ok('the Build menu lists the Market', !!menu0 && /Market/.test(menu0.text), JSON.stringify(menu0));
  ok('a brand-new camp on a Tuesday: locked until 2 huts', pop0.pop >= 4 || pop0.huts >= 2 ? true : menu0 && menu0.lock && !(await ev(() => __g.funUnlocked('market'))), JSON.stringify(pop0));
  const unl2 = await ev(() => { const S = __g.mainSettlement(), made = []; for (let i = 0; i < 2; i++) { const sp = __g.findSpot(S, __g.KINDS.hut.r); if (sp) made.push(__g.addThing(S, 'hut', sp[0], sp[1], { built: true })); } const u = __g.funUnlocked('market', S); __g.MKT.unl = false; return { u, n: made.length }; });
  ok('it unlocks early: a camp with 2 huts can build it', unl2.u && unl2.n === 2, JSON.stringify(unl2));
  await ev(() => __g.setTool('look'));
  await ev(() => __g.simulate(30));
  ok('Tuesday: nobody asks for a market', await ev(() => !__g.G.requests.some((r) => r.def.id === 'market')));

  /* 2. Wednesday with no market: a creature asks, the button opens the Build menu on the Market */
  await setDate(WED, 12);
  /* requests wait while a banner shows (one voice at a time), so give it a little while */
  for (let i = 0; i < 45; i++) { await ev(() => __g.simulate(5)); if (await ev(() => __g.G.requests.some((r) => r.def.id === 'market'))) break; await sleep(900); }
  const rq = await ev(() => { const r = __g.G.requests.find((q) => q.def.id === 'market'); __g.reqUi(); return r ? { who: r.who, text: r.def.text, card: document.getElementById('reqs').textContent } : null; });
  ok('market day, no market: a creature asks for one', !!rq && /market day/i.test(rq.text) && /nowhere to trade/.test(rq.text), JSON.stringify(rq));
  ok('the request card shows it with a Build it button', !!rq && /nowhere to trade/.test(rq.card) && /Build it/.test(rq.card));
  await p.click('#reqs .req button'); await sleep(400);
  const bm = await ev(() => { const bt = document.querySelector('#bmenu button[data-build="market"]'); return { tool: __g.G.tool, kind: __g.G.buildKind, menu: !document.getElementById('bmenu').hidden, on: bt && bt.classList.contains('on'), lock: bt && !!bt.dataset.lock }; });
  ok('the button opens the Build menu with the Market picked (unlocked)', bm.tool === 'build' && bm.kind === 'market' && bm.on && !bm.lock, JSON.stringify(bm));
  /* place it the way a player does: a tap on free ground near the camp */
  const placed = await ev(() => {
    const S = __g.mainSettlement(); S.stock.wood = Math.max(S.stock.wood, 12); __g.G.bmenuShut = true; __g.barUi();
    for (let i = 0; i < 30; i++) { const sp = __g.findSpot(S, __g.KINDS.market.r + 0.01, { R: 0.22 }); if (!sp) continue; const w = S.group.localToWorld(new __g.THREE.Vector3(sp[0], 0, sp[1])); __g.P.mode = 'orbit'; __g.P.campCam = false; __g.focusOn(w.x, w.y, w.z, 0.5); return [w.x, w.y, w.z]; }
    return null;
  });
  await sleep(1500);
  let mk = null;
  for (let i = 0; i < 6 && placed && !mk; i++) {
    await ev((w) => { const v = new __g.THREE.Vector3(w[0] + (Math.random() - 0.5) * 0.02, w[1], w[2] + (Math.random() - 0.5) * 0.02), s = __g.toScreen(v); __g.tapAt(s[0], s[1]); }, placed); await sleep(300);
    mk = await ev(() => { const l = __g.mktThings(true); return l.length ? { built: l[0].t.built, giant: !!l[0].t.giant } : null; });
  }
  ok('a tap with the Market picked puts one down (being built)', !!mk && !mk.built, JSON.stringify(mk));
  await ev(() => __g.simulate(8));
  ok('the request ends once the market is placed', await ev(() => !__g.G.requests.some((r) => r.def.id === 'market')));
  for (let i = 0; i < 20; i++) { if (await ev(() => __g.mktThings().length > 0)) break; await ev(() => __g.simulate(10)); }
  ok('the colonists finish building the market', await ev(() => __g.mktThings().length === 1));
  await ev(() => { __g.setTool('look'); __g.simulate(1); });
  for (let i = 0; i < 40; i++) { await sleep(500); if (/Market day!/.test(await ev(() => document.getElementById('banner').textContent))) break; }
  const opened = await ev(() => ({ open: __g.MKT.open, bell: __g.MKT.bell, banner: document.getElementById('banner').textContent, album: __g.FUN.album.some((e) => e.id === 'market') }));
  ok('it opens at once on a market day: the bell, a "Market day!" banner, an album entry', opened.open && opened.bell === '2026-11-18' && /Market day!/.test(opened.banner) && opened.album, JSON.stringify(opened));
  await focusMarket(0.3, 0.5, 0.5); await shotPrep(); await sleep(1800);
  await p.screenshot({ path: OUT + '74-market-built.png' });
  const vis = await ev(() => { const st = __g.mktThings()[0], U = st.t.mesh.userData; return { goods: U.goods && U.goods.visible, covers: U.covers && U.covers.visible, pretty: !!U.bcMarket, draws: (() => { let n = 0; st.t.mesh.traverse((o) => { if ((o.isMesh || o.isSprite || o.isPoints) && o.visible) n++; }); return n; })() }; });
  ok('the stalls show their goods (covers off), the market.js model is used, under 12 draw calls', vis.goods && !vis.covers && vis.pretty && vis.draws <= 12, JSON.stringify(vis));

  /* 3. one camp alone: they still hold a market among themselves */
  ok('only one camp so far', await ev(() => __g.G.settlements.filter((S) => !S.lost).length === 1));
  const d0 = await ev(() => __g.MKT.deals);
  let walked = false; for (let i = 0; i < 30; i++) { await ev(() => __g.simulate(5)); if (!walked) walked = await ev(() => __g.mainSettlement().cols.some((c) => c.job && c.job.type === 'market')); if (walked && (await ev(() => __g.MKT.deals)) > d0) break; }
  const one = await ev(() => ({ deals: __g.MKT.deals, last: __g.MKT.log[__g.MKT.log.length - 1] }));
  ok('one camp: colonists walk to the stalls', walked);
  ok('one camp: they swap among themselves', one.deals > d0 && one.last && one.last.a === one.last.b && /^Market day: .+ (swapped .+ for |sold .+ for \d+ buttons?|bought |got )/.test(one.last.text), JSON.stringify(one.last));
  /* the market-day picture: traders at every stall, haggling */
  await ev(() => { const st = __g.mktSite(); const cs = st.S.cols.filter((c) => !c.inside).slice(0, 3); cs.forEach((c, i) => { c.needs.rest = 1; __g.mktSend(c, st.S, st.t, i); }); });
  for (let i = 0; i < 20; i++) { await ev(() => __g.simulate(1)); if (await ev(() => __g.mainSettlement().cols.filter((c) => c.job && c.job.type === 'market' && c.job.ph === 'do').length >= 2)) break; }
  await ev(() => { for (const c of __g.mainSettlement().cols) if (c.job && c.job.type === 'market') c.job.dur = 999; __g.MKT.talkT = 0; __g.MKT.reply = null; });
  await focusMarket(0.34, 2.3, 0.42); await shotPrep(); await sleep(2600);
  const talk = await ev(() => __g.FUN.log.filter((e) => e.k === 'say').map((e) => e.x).slice(-6));
  await p.screenshot({ path: OUT + '75-market-day.png' });
  ok('haggling bubbles at the stalls', talk.some((t) => /Deal|Sold|acorn|thimble|seed|crumb|bead|twig|hug|bargain|bottle|fluff|wet|smile|Who wants|Get your/i.test(t)), JSON.stringify(talk));
  await ev(() => { for (const S of __g.G.settlements) for (const c of S.cols) if (c.job && c.job.type === 'market') c.job.dur = 1; __g.simulate(3); });

  /* 4. a second camp by cable car: a trader rides over, stock really moves between the camps */
  const linked = await ev(() => {
    const S = __g.mainSettlement(); S.stock.wood = Math.max(S.stock.wood, 20);
    const Zt = __g.G.zones.filter((Z) => !Z.settled && !Z.lost && !Z.ceil && Z.land && Z.area > 0.04 && Z !== S.zoneRef).sort((a, b) => Math.hypot(a.cx - S.zoneRef.cx, a.cz - S.zoneRef.cz) - Math.hypot(b.cx - S.zoneRef.cx, b.cz - S.zoneRef.cz))[0];
    if (!Zt) return 'no zone'; __g.ensureDist(Zt); __g.ensureDist(S.zoneRef); const l = __g.makeLink(S, S.zoneRef.core[0], S.zoneRef.core[1], Zt, Zt.core[0], Zt.core[1]); return l ? 'ok' : 'no link';
  });
  for (let i = 0; i < 40; i++) { await ev(() => __g.simulate(10)); if (await ev(() => __g.G.settlements.some((S) => S !== __g.mktSite().S && !S.awaiting && S.cols.length >= 2))) break; }
  const two = await ev(() => { const A = __g.mktSite().S, B = __g.G.settlements.find((S) => S !== A && !S.awaiting && !S.lost); return B ? { b: B.id, pop: B.cols.length, link: __g.G.links.some((l) => l.ready && (l.a.sid === B.id || l.b.sid === B.id)) } : null; });
  ok('a second camp, joined by cable car', linked === 'ok' && two && two.pop >= 2 && two.link, linked + ' ' + JSON.stringify(two));
  /* make one camp rich in seeds and short of wood, the other the other way round */
  const unbalance = () => ev(() => { const A = __g.mktSite().S, B = __g.G.settlements.find((S) => S !== A && !S.awaiting && !S.lost); A.stock.seeds = 10; A.stock.wood = 1; B.stock.seeds = 0; B.stock.wood = 20; });
  const x0 = await ev(() => __g.MKT.xfer), v0 = await ev(() => __g.MKT.visits); let visitor = null, rode = false, seen76 = false;
  for (let i = 0; i < 70; i++) {
    await unbalance(); await ev(() => __g.simulate(5));
    const st = await ev(() => { const A = __g.mktSite().S; const v = A.cols.find((c) => c.mkt && c.mkt.ph === 'go' && c.job && c.job.type === 'market'); const r = __g.G.links.some((l) => l.g.riders.some((c) => c.mkt)); return { v: v ? { id: v.id, name: v.name, home: v.mkt.home, ph: v.job.ph, bundle: !!v.bundle } : null, r, x: __g.MKT.xfer, visits: __g.MKT.visits }; });
    if (st.r) rode = true; if (st.v && !visitor) visitor = st.v;
    if (st.v && st.v.ph === 'do' && !seen76) { /* the trade picture: the visitor haggling at a stall */
      seen76 = true; await ev((id) => { const A = __g.mktSite().S, v = A.cols.find((c) => c.id === id); if (v) v.job.dur = 999; const o = A.cols.find((c) => c !== v && !c.inside && !(c.job && c.job.type === 'market')); if (o) __g.mktSend(o, A, __g.mktSite().t, (v.job.slot + 1) % 3); }, st.v.id);
      await ev(() => __g.simulate(4)); await ev(() => { __g.MKT.talkT = 0; __g.MKT.reply = null; }); await focusVisitor(st.v.id, 0.3, 0.9, 0.38); await shotPrep(); await sleep(2700);
      await p.screenshot({ path: OUT + '76-market-trade.png' });
      await ev((id) => { for (const S of __g.G.settlements) for (const c of S.cols) if (c.job && c.job.type === 'market') c.job.dur = c.id === id ? 0 : 1; }, st.v.id);
    }
    if (st.x > x0 && st.visits > v0 && seen76) break;
  }
  const tr = await ev(() => ({ x: __g.MKT.xfer, visits: __g.MKT.visits, cross: __g.MKT.log.filter((e) => e.a !== e.b && e.moved > 0).map((e) => e.text).slice(-3) }));
  ok('a trader from the other camp rides the cable car over with a bundle of goods', rode && visitor && visitor.bundle && tr.visits > v0, JSON.stringify(visitor));
  ok('stock actually moves between the two camps', tr.x > x0 && tr.cross.length > 0, JSON.stringify(tr));
  /* the trader goes home again by cable car */
  let home = false; for (let i = 0; i < 50 && visitor; i++) { await ev(() => __g.simulate(5)); home = await ev((v) => { const B = __g.G.settlements.find((S) => S.id === v.home); const c = B && B.cols.find((q) => q.id === v.id); return !!c && !c.mkt; }, visitor); if (home) break; }
  ok('the trader rides home afterwards', home);
  ok('market traders got a joy boost (the deal log has names)', await ev(() => __g.MKT.log.length >= 2 && __g.MKT.log.every((e) => /^Market day: \S/.test(e.text))));

  /* 5. night: quiet; Tuesday: nothing; covers on */
  await setDate(WED, 22.5); await ev(() => __g.simulate(6));
  const night = await ev(() => { const st = __g.mktThings()[0], U = st.t.mesh.userData; return { open: __g.MKT.open, jobs: __g.G.settlements.reduce((a, S) => a + S.cols.filter((c) => c.job && c.job.type === 'market').length, 0), goods: U.goods.visible, covers: U.covers.visible }; });
  await sleep(300); const night2 = await ev(() => { const U = __g.mktThings()[0].t.mesh.userData; return { goods: U.goods.visible, covers: U.covers.visible }; });
  ok('night: the market is shut, nobody trades, the covers go on', !night.open && night.jobs === 0 && !night2.goods && night2.covers, JSON.stringify([night, night2]));
  const dn = await ev(() => __g.MKT.deals); await ev(() => __g.simulate(90)); ok('night: no deals all night', (await ev(() => __g.MKT.deals)) === dn);
  await setDate(TUE, 12); const dt0 = await ev(() => __g.MKT.deals);
  let tueJobs = 0; for (let i = 0; i < 12; i++) { await ev(() => __g.simulate(10)); tueJobs += await ev(() => __g.G.settlements.reduce((a, S) => a + S.cols.filter((c) => c.job && c.job.type === 'market').length, 0)); }
  const tue = await ev(() => ({ open: __g.MKT.open, req: __g.G.requests.some((r) => r.def.id === 'market'), info: __g.mktInfo(__g.mktThings()[0].t) }));
  ok('Tuesday: no market, no deals, no traders, no request', !tue.open && !tue.req && tueJobs === 0 && (await ev(() => __g.MKT.deals)) === dt0, JSON.stringify(tue));
  ok('a tap on the market on a Tuesday says when it opens', /Wednesday or Sunday/.test(tue.info) && /Harry/.test(tue.info));
  await focusMarket(0.32, 0.9, 0.85); await shotPrep(); await sleep(1500);
  await p.screenshot({ path: OUT + '77-market-quiet.png' });
  const q = await ev(() => { const U = __g.mktThings()[0].t.mesh.userData; return { goods: U.goods.visible, covers: U.covers.visible }; });
  ok('Tuesday: the stalls stand empty with their covers on', !q.goods && q.covers, JSON.stringify(q));

  /* 6. the away diary on a market day; none on a Tuesday */
  const awayW = await ev(() => { __g.ENV.dateOverride = '2026-11-18'; __g.ENV._sk = 0; __g.envUpdate(); const r = __g.awaySim(4 * 3600, 9); return r.lines.map((l) => l.text).filter((t) => /^Market day:/.test(t)); });
  ok('back after a market-day morning away: a "Market day:" line in the diary', awayW.length === 1 && /( swapped .+ for | camp sold .+ for \d+ buttons?| camp bought )/.test(awayW[0]), JSON.stringify(awayW));
  const awayT = await ev(() => { __g.ENV.dateOverride = '2026-11-17'; __g.ENV._sk = 0; __g.envUpdate(); const r = __g.awaySim(4 * 3600, 9); return r.lines.filter((l) => /^Market day:/.test(l.text)).length; });
  ok('a Tuesday away has no market line', awayT === 0);

  /* 7. save, sounds, the practice sky, the plain fallback */
  const sv = await ev(() => { const s = __g.serialize(); const m = s.mkt; __g.mktLoad(JSON.parse(JSON.stringify(m))); return { m, kind: s.settlements.some((S) => S.things.some((t) => t.kind === 'market' && t.built)), back: __g.MKT.unl && __g.MKT.bell === m.bell }; });
  ok('the save keeps the market and its day', sv.m && sv.m.unl && sv.kind && sv.back, JSON.stringify(sv.m).slice(0, 160));
  ok('an old save without market data loads clean', await ev(() => { __g.mktLoad(undefined); const r = !__g.MKT.unl && __g.MKT.log.length === 0; return r; }));
  ok('two new sounds: the market bell and haggling, on the sound board list', await ev(() => !!__g.SND.KINDS.mbell && !!__g.SND.KINDS.haggle));
  await ev(() => { __g.envUi(); document.getElementById('env').hidden = false; });
  const opts = await ev(() => Array.from(document.querySelectorAll('#eDate option')).map((o) => [o.textContent, o.value]));
  const wedOpt = opts.find((o) => /Market day \(Wednesday\)/.test(o[0]));
  ok('the practice sky Date has Market day choices (a real Wednesday)', !!wedOpt && opts.some((o) => /Market day \(Sunday\)/.test(o[0])) && new Date(wedOpt[1] + 'T12:00:00Z').getUTCDay() === 3, JSON.stringify(opts.slice(-3)));
  await p.selectOption('#eDate', wedOpt[1]); await sleep(300);
  ok('picking it makes today a market day', await ev(() => __g.mktIsDay() && __g.mktWeekday() === 3));
  ok('without market.js a plain market is built (goods, covers, slots)', await ev(() => { __g.BCP.marketOff = true; const g = __g.marketMake(); __g.BCP.marketOff = false; return !!g.userData.plain && !!g.userData.goods && !!g.userData.covers && g.userData.slots.length === 3; }));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  console.log(res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
