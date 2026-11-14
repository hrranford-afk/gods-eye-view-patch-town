/* First 10 minutes (build 19 + first10): a brand-new player at night on an iPad-sized screen.
   The camera frames the camp on landing, one card at a time, the scout's seed request by about 45 s, a campfire instead of bedtime,
   no dance-party milestone without huts, a question near minute 9 answered by the next visit's diary, and an old save keeps normal sleep.
   Run (from games/base-camp): NODE_PATH=$(npm root -g) node tests/first10-test.js
   Shots: shots/65-first10-landing-night.png, 66-first10-campfire.png, 67-first10-seed-request.png, 68-first10-question.png */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  const night = () => ev(() => { __g.ENV.hourOverride = 22; __g.ENV._sk = 0; __g.envUpdate(); });
  await p.setViewportSize({ width: 820, height: 1180 });
  /* a player, not a test tool: ?player hides the Practice sky panel as it is for real players */
  await p.goto(url + '?player'); await sleep(1500); await ev(() => localStorage.clear()); await p.reload(); await sleep(1500); await night();
  await p.click('#bMore'); await p.click('#bPrac'); const t0 = Date.now(); const T = () => (Date.now() - t0) / 1000;
  const cards = () => ev(() => {
    const vis = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
    const L = []; if (vis('wx')) L.push('weather'); for (const q of document.querySelectorAll('#reqs .req:not(.more)')) L.push('request'); if (document.getElementById('banner').className === 'on') L.push('banner');
    for (const id of ['ask', 'guess', 'modal', 'diary', 'tagpick']) if (vis(id)) L.push(id); return L;
  });
  let maxCards = 0, worst = [], landedAt = 0, reqAt = 0, glow = false, framed = null, doneAt = 0, wxBefore = false, shot67 = false;
  while (T() < 62) {
    await sleep(400); const c = await cards(); if (c.length > maxCards) { maxCards = c.length; worst = c.slice(); }
    if (c.includes('weather') && !doneAt) wxBefore = true;
    const st = await ev(() => ({ n: __g.G.settlements.length, req: __g.G.requests.some((r) => r.def.id === 'f10seeds'), done: __g.F10.reqDone }));
    if (st.n && !landedAt) landedAt = T();
    if (landedAt && !framed && T() - landedAt > 6) {
      framed = await ev(() => { /* the tent and the creatures on screen: how much of the height they fill, and where */
        const S = __g.mainSettlement(), V = __g.THREE.Vector3, pts = [];
        const add = (lx, lz, y) => { const [wx, wz] = __g.l2w(S, lx, lz); pts.push(__g.toScreen(new V(wx, S.tf.y + y, wz))); };
        for (let i = 0; i < 6; i++) { const a = i * 1.047; add(Math.cos(a) * 0.034, Math.sin(a) * 0.034, 0); } add(0, 0, 0.062);
        for (const c of S.cols) { add(c.x, c.z, 0); add(c.x, c.z, 0.035); }
        const ys = pts.filter((q) => q[2]).map((q) => q[1]), xs = pts.filter((q) => q[2]).map((q) => q[0]);
        return { frac: +((Math.max(...ys) - Math.min(...ys)) / innerHeight).toFixed(2), cx: Math.round((Math.max(...xs) + Math.min(...xs)) / 2), cy: Math.round((Math.max(...ys) + Math.min(...ys)) / 2), all: ys.length === pts.length, W: innerWidth, H: innerHeight, campCam: !!__g.P.campCam };
      });
      await p.screenshot({ path: OUT + '65-first10-landing-night.png' });
    }
    if (st.req && !reqAt) { reqAt = T(); glow = await ev(() => !!document.querySelector('#bar [data-tool="seed"].f10glow')); }
    if (reqAt && !shot67 && T() - reqAt > 1.2) { shot67 = true; await p.screenshot({ path: OUT + '67-first10-seed-request.png' }); await ev(() => { const S = __g.mainSettlement(), c = S.cols.find((q) => q.scout) || S.cols[0]; __g.camOpen(c); }); await sleep(500);
      ok('the Pip cam moves below the card while a card is up', await ev(() => { const a = document.getElementById('ccam').getBoundingClientRect(), r = document.querySelector('#reqs .req').getBoundingClientRect(); return document.body.classList.contains('card-up') && a.top >= r.bottom && a.height > 20; }));
      await p.click('#reqs .req button'); await sleep(400);
      ok('the request button picks the Seeds tool', await ev(() => __g.G.tool === 'seed'));
      const tp = await ev(() => { const S = __g.mainSettlement(); return __g.toScreen(new __g.THREE.Vector3(S.tf.x, S.tf.y + 0.01, S.tf.z)); }); /* right on the tent: normally "No room there" */
      const trees0 = await ev(() => __g.mainSettlement().things.filter((t) => t.kind === 'tree').length);
      await p.mouse.click(tp[0], tp[1]); await sleep(600);
      const d = await ev(() => ({ done: __g.F10.reqDone, trees: __g.mainSettlement().things.filter((t) => t.kind === 'tree').length, toast: document.getElementById('toast').innerText, reqs: __g.G.requests.length, tool: __g.G.tool }));
      ok('a tap on the tent itself still plants the first seed, and the scout says thanks', d.done && d.trees === trees0 + 1 && /thank you/i.test(d.toast) && d.tool === 'look', JSON.stringify(d)); if (d.done) doneAt = T();
      await ev(() => __g.camClose());
    }
    if (c.includes('weather') && doneAt) { await sleep(300); await p.click('#wxNo').catch(() => {}); }
  }
  ok('landed', landedAt > 0 && landedAt < 30, landedAt.toFixed(1) + ' s');
  ok('the camera frames the camp: tent and creatures fill about a third of the screen height, near the middle', framed && framed.campCam && framed.all && framed.frac >= 0.2 && framed.frac <= 0.55 && Math.abs(framed.cx - framed.W / 2) < framed.W * 0.25 && Math.abs(framed.cy - framed.H / 2) < framed.H * 0.25, JSON.stringify(framed));
  ok('at most one card or popup at any moment in the first 60 s', maxCards <= 1, maxCards + ' ' + JSON.stringify(worst));
  ok('the seed request appears by about 45 s, and the Seeds button glows', reqAt > 0 && reqAt <= 50 && glow, reqAt.toFixed(1) + ' s, glow ' + glow);
  ok('the weather card waits until the request is done', !wxBefore);
  ok('the Practice sky panel is hidden for a player; the Menu has it', await ev(() => { const h = document.getElementById('env').hidden; __g.menuUi(); const m = !!document.getElementById('mSky'); document.getElementById('modal').hidden = true; return h && m; }));
  /* the campfire */
  await night(); await sleep(6000);
  const fire = await ev(() => { const S = __g.mainSettlement(); return { cols: S.cols.length, inside: S.cols.filter((c) => c.inside).length, fireside: S.cols.filter((c) => c.job && c.job.type === 'fireside').length, fire: !!(S.f10fire && S.f10fire.visible), night: __g.ENV.night, on: __g.F10.on, job: __g.chooseJob(S, S.cols[0], __g.ENV).type }; });
  ok('night in the first session: nobody in bed, they sit round a glowing campfire', fire.night && fire.on && fire.inside === 0 && fire.fireside >= Math.min(2, fire.cols) && fire.fire && fire.job === 'fireside', JSON.stringify(fire));
  await p.screenshot({ path: OUT + '66-first10-campfire.png' });
  /* the build menu closes after one pick */
  await p.click('button[data-tool="build"]'); await sleep(300); const m1 = await ev(() => !document.getElementById('bmenu').hidden); await p.click('button[data-build="lantern"]'); await sleep(300);
  ok('the build menu closes after one pick (Build opens it again)', m1 && await ev(() => document.getElementById('bmenu').hidden && __g.G.buildKind === 'lantern' && __g.G.tool === 'build'));
  await p.click('button[data-tool="look"]');
  /* no dance party without huts */
  await ev(() => __g.partyToggle(true)); await sleep(6000);
  const pa = await ev(() => { const S = __g.mainSettlement(); return { album: __g.FUN.album.some((e) => e.id === 'party'), huts: S.things.filter((t) => t.kind === 'hut' && t.built).length, real: __g.partyReal(S) }; });
  await ev(() => __g.partyToggle(false));
  ok('no "First dance party" milestone with no huts', !pa.album && !pa.real, JSON.stringify(pa));
  ok('with a built hut and creatures awake in the pit, the party counts', await ev(() => { const S = __g.mainSettlement(), h = __g.addThing(S, 'hut', 0.3, 0.3, { built: true }); S.cols.forEach((c) => { c.inside = false; c.job = { type: 'mosh' }; }); const r = __g.partyReal(S); S.things.splice(S.things.indexOf(h), 1); h.mesh.parent.remove(h.mesh); S.cols.forEach((c) => { c.job = null; }); return r; }));
  /* the question near minute 9 (the clock is moved on through the F10 hook) */
  await ev(() => { __g.F10.t = 535; }); let qAt = 0; for (let i = 0; i < 40 && !qAt; i++) { await sleep(500); if (await ev(() => __g.G.requests.some((r) => r.def.id === 'f10back'))) qAt = await ev(() => __g.F10.t); }
  await sleep(1200);
  const q = await ev(() => ({ q: __g.F10.q, text: (document.querySelector('#reqs .req') || {}).innerText || '', glow: !!document.querySelector('#bBack.f10glow') }));
  ok('around minute 9 the scout names a far place to explore, and Come back later glows', qAt >= 540 && qAt < 560 && q.q && q.text.includes(q.q.name) && q.glow, JSON.stringify(q) + ' at ' + (qAt || 0).toFixed(0) + ' s');
  await p.screenshot({ path: OUT + '68-first10-question.png' });
  /* the next visit: Come back later, and the diary answers */
  await p.click('#reqs .req button'); let back = null;
  for (let i = 0; i < 60 && !back; i++) { await sleep(500); back = await ev(() => __g.G.awayRes && __g.G.awayRes.lines ? [__g.G.awayRes.answer ? __g.G.awayRes.answer.text : ''].concat(__g.G.awayRes.lines.map((l) => l.text)) : null); } /* build 20 + return: the answer is its own card (awayRes.answer) */
  const ans = back && back.find((l) => /kept the promise/.test(l));
  ok('the next visit\'s diary answers the question', !!ans && ans.includes(q.q ? q.q.name : '#') && await ev(() => __g.F10.ans), ans || JSON.stringify(back));
  /* an old save (no first-session record) keeps normal sleep */
  const old = await ev(() => {
    const sv = JSON.parse(localStorage.getItem('base-camp-save-v2')), map = localStorage.getItem('base-camp-map-v1'); delete sv.f10; sv.t = Date.now() - 60000;
    __g.resetWorld(); __g.G.auto = true; __g.G.previewSecs = null; localStorage.setItem('base-camp-save-v2', JSON.stringify(sv)); localStorage.setItem('base-camp-map-v1', map);
    __g.prepareContinue(); __g.ENV.hourOverride = 22; __g.ENV._sk = 0; __g.envUpdate();
    const S = __g.G.settlements[0]; return { on: __g.F10.on, jobs: S.cols.map((c) => __g.chooseJob(S, c, __g.ENV).type), night: __g.ENV.night, f10: __g.f10Save() };
  });
  ok('an old save has no first session: at night they go to bed as before', !old.on && old.night && old.jobs.length && old.jobs.every((j) => j === 'sleep'), JSON.stringify(old));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const f = res.filter((r) => !r).length; console.log(f ? f + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(f ? 1 : 0);
})();
