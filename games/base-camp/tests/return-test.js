/* Build 20 + return: night beats in the first session and a gentle return.
   At night: the planted seed sprouts within 90 s (a tiny glowing shoot), a second small ask near minute 3 (a log for the fire) that can be answered,
   a surprise with no input near minute 6 (a paper moth). Never more than one card or banner at once. Coming back: the answer to the scout's
   question first, as its own card, then a summary of at most 4 lines until More. 60 new settlers get no names ending in a digit; an old "Pip 2" stays.
   Run (from games/base-camp): NODE_PATH=$(npm root -g) node tests/return-test.js
   Shots: shots/69-night-sprout.png, 70-night-surprise.png, 71-return-answer.png, 72-return-summary.png */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  const night = () => ev(() => { __g.ENV.hourOverride = 22; __g.ENV._sk = 0; __g.envUpdate(); });
  await p.setViewportSize({ width: 820, height: 1180 });
  await p.goto(url + '?player'); await sleep(1500); await ev(() => localStorage.clear()); await p.reload(); await sleep(1500); await night();
  /* a sampler in the page: the most cards, banners and popups seen at one moment */
  await ev(() => {
    window.__cards = { max: 0, worst: [] };
    const vis = (e) => { if (!e || e.hidden) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetParent !== null; };
    setInterval(() => {
      const L = []; for (const id of ['wx', 'ask', 'guess', 'modal', 'diary', 'tagpick']) if (vis(document.getElementById(id))) L.push(id);
      for (const q of document.querySelectorAll('#reqs .req:not(.more)')) if (vis(q)) L.push('request');
      if (document.getElementById('banner').className === 'on') L.push('banner'); if (document.getElementById('home').classList.contains('on')) L.push('home');
      if (L.length > window.__cards.max) { window.__cards.max = L.length; window.__cards.worst = L; }
    }, 150);
  });
  await p.click('#bMore'); await p.click('#bPrac'); const t0 = Date.now(); const T = () => (Date.now() - t0) / 1000;
  /* the seed request, answered with a tap by the tent */
  let reqAt = 0; while (T() < 70 && !reqAt) { await sleep(400); if (await ev(() => __g.G.requests.some((r) => r.def.id === 'f10seeds'))) reqAt = T(); }
  ok('the seed request comes', reqAt > 0, reqAt.toFixed(1) + ' s');
  await sleep(800); await p.click('#reqs .req button'); await sleep(400);
  const tp = await ev(() => { const S = __g.mainSettlement(); return __g.toScreen(new __g.THREE.Vector3(S.tf.x + 0.05, S.tf.y + 0.01, S.tf.z + 0.04)); });
  await p.mouse.click(tp[0], tp[1]); await sleep(500); await night();
  const planted = await ev(() => ({ done: __g.F10.reqDone, tid: __g.F10.tid, g: (__g.f10Tree(__g.mainSettlement()) || {}).g }));
  ok('the first seed is planted', planted.done && planted.tid > 0, JSON.stringify(planted)); const tPlant = T();
  /* the sprout, at night, within 90 s */
  let spAt = 0; while (T() - tPlant < 95 && !spAt) { await sleep(500); if (await ev(() => document.getElementById('wx') && !document.getElementById('wx').hidden)) await p.click('#wxNo').catch(() => {}); if (await ev(() => __g.F10.spr)) spAt = T() - tPlant; }
  await sleep(1200);
  const sp = await ev(() => { const S = __g.mainSettlement(), t = __g.f10Tree(S), U = t && t.mesh.userData; return { night: __g.ENV.night, g: t ? +t.g.toFixed(2) : -1, sprout: !!(U && U.sprout.visible), glow: !!(U && U.f10glow && U.f10glow.visible) }; });
  ok('at night the seed sprouts within 90 s of planting: a tiny glowing shoot', spAt > 0 && spAt <= 90 && sp.night && sp.sprout && sp.glow, spAt.toFixed(1) + ' s ' + JSON.stringify(sp));
  await ev(() => { const S = __g.mainSettlement(), t = __g.f10Tree(S), [wx, wz] = __g.l2w(S, t.x, t.z); __g.P.target.set(wx, S.tf.y + 0.01, wz); __g.P.dist = 0.22; __g.focusOn(wx, S.tf.y + 0.01, wz, 0.22); });
  await sleep(900); await p.screenshot({ path: OUT + '69-night-sprout.png' });
  await ev(() => { const S = __g.mainSettlement(); __g.f10Cam(S); });
  /* the second ask near minute 3 */
  await ev(() => { __g.F10.t = 170; }); let a2At = 0; for (let i = 0; i < 40 && !a2At; i++) { await sleep(500); if (await ev(() => document.getElementById('wx') && !document.getElementById('wx').hidden)) await p.click('#wxNo').catch(() => {}); if (await ev(() => __g.G.requests.some((r) => r.def.id === 'f10log'))) a2At = await ev(() => __g.F10.t); }
  await sleep(800); const card = await ev(() => (document.querySelector('#reqs .req') || {}).innerText || '');
  ok('around minute 3 a second small ask: a log for the fire', a2At >= 170 && a2At < 200 && /log/i.test(card), (a2At || 0).toFixed(0) + ' s: ' + card.replace(/\n/g, ' '));
  await p.click('#reqs .req button'); await sleep(500);
  const a2 = await ev(() => ({ a2: __g.F10.a2, flare: +__g.F10.flare.toFixed(2), left: __g.G.requests.some((r) => r.def.id === 'f10log'), toast: document.getElementById('toast').innerText }));
  ok('tapping the button puts the log on: the fire flares up and the card goes', a2.a2 === 2 && a2.flare > 0.5 && !a2.left && /flare/i.test(a2.toast), JSON.stringify(a2));
  /* the surprise near minute 6, with no input */
  await ev(() => { __g.F10.t = 355; }); let surAt = 0; for (let i = 0; i < 60 && !surAt; i++) { await sleep(500); if (await ev(() => __g.F10.sur)) surAt = await ev(() => __g.F10.surT); }
  await sleep(1500); const sur = await ev(() => { const S = __g.mainSettlement(); return { moth: S.things.some((t) => t.kind === 'visitor'), toast: document.getElementById('toast').innerText }; });
  ok('around minute 6 a surprise with no input: a paper moth flutters into the firelight', surAt >= 355 && surAt < 400 && sur.moth, (surAt || 0).toFixed(0) + ' s ' + JSON.stringify(sur));
  await p.screenshot({ path: OUT + '70-night-surprise.png' });
  /* the question, then Come back later */
  await ev(() => { __g.F10.t = 535; }); let qAt = 0; for (let i = 0; i < 60 && !qAt; i++) { await sleep(500); if (await ev(() => __g.G.requests.some((r) => r.def.id === 'f10back'))) qAt = await ev(() => __g.F10.t); }
  ok('the minute-9 question still comes after the night beats', qAt >= 540 && qAt < 570, (qAt || 0).toFixed(0) + ' s');
  const first = await ev(() => window.__cards); ok('first session: never more than one card or banner at once', first.max <= 1, first.max + ' ' + JSON.stringify(first.worst));
  await sleep(1000); await p.click('#reqs .req button');
  let dia = null; for (let i = 0; i < 120 && !dia; i++) { await sleep(500); dia = await ev(() => { const d = document.getElementById('diary'); return d && !d.hidden ? { html: d.innerHTML, text: d.innerText } : null; }); }
  const r0 = await ev(() => ({ lines: __g.G.awayRes ? __g.G.awayRes.lines.length : 0, ans: !!(__g.G.awayRes && __g.G.awayRes.answer), reqVis: [...document.querySelectorAll('#reqs .req:not(.more)')].some((q) => getComputedStyle(q).visibility !== 'hidden') }));
  ok('on return the answer card comes first: its own card with a picture line', !!dia && /found it!/.test(dia.text) && /anspic/.test(dia.html) && !/While you were away/.test(dia.text) && r0.ans, dia ? dia.text.slice(0, 160).replace(/\n/g, ' | ') : 'no diary');
  await sleep(600); await p.screenshot({ path: OUT + '71-return-answer.png' });
  await p.click('#dNext'); await sleep(500);
  const sm = await ev(() => { const vis = [...document.querySelectorAll('#diary li')].filter((l) => l.offsetParent !== null); return { shown: vis.length, all: document.querySelectorAll('#diary li').length, more: !!document.getElementById('dMore'), byKept: [...document.querySelectorAll('#diary li .by')].length, head: (document.querySelector('#diary .dh') || {}).innerText }; });
  ok('then the summary: at most 4 lines, and a More button when there are more', /While you were away/.test(sm.head) && sm.shown <= 4 && sm.shown >= 1 && (sm.all <= 4 || sm.more), JSON.stringify(sm) + ' lines ' + r0.lines);
  ok('no request card shows on top of the summary', !(await ev(() => [...document.querySelectorAll('#reqs .req:not(.more)')].some((q) => q.offsetParent !== null && getComputedStyle(q).visibility !== 'hidden'))));
  await p.screenshot({ path: OUT + '72-return-summary.png' });
  if (sm.more) { await p.click('#dMore'); await sleep(300); ok('More opens the rest, with their credits kept', await ev(() => [...document.querySelectorAll('#diary li')].every((l) => l.offsetParent !== null) && !document.getElementById('dMore'))); }
  await p.click('#dClose'); await sleep(14000);
  const all = await ev(() => window.__cards); ok('first session and return: never more than one card or banner at once', all.max <= 1, all.max + ' ' + JSON.stringify(all.worst));
  /* names */
  const nm = await ev(() => { const S = __g.mainSettlement(), made = []; for (let i = 0; i < 60; i++) made.push(__g.addColonist(S, { x: 0.02, z: 0.02 })); const names = made.map((c) => c.name);
    const keys = new Set(); let dup = 0; for (const T of __g.G.settlements) for (const c of T.cols) { const k = c.name.toLowerCase(); if (keys.has(k)) dup++; keys.add(k); }
    for (const c of made) { S.cols.splice(S.cols.indexOf(c), 1); if (c.mesh && c.mesh.parent) c.mesh.parent.remove(c.mesh); }
    return { digits: names.filter((n) => /\d$/.test(n)), dup, sample: names.slice(-8) }; });
  ok('60 new settlers: no names ending in a digit, and all names unique', nm.digits.length === 0 && nm.dup === 0, JSON.stringify(nm));
  const old = await ev(() => {
    __g.persist(true); const sv = JSON.parse(localStorage.getItem('base-camp-save-v2')), map = localStorage.getItem('base-camp-map-v1'); const c0 = sv.settlements[0].cols; c0[c0.length - 1].name = 'Pip 2'; sv.t = Date.now() - 60000;
    __g.resetWorld(); __g.G.auto = true; __g.G.previewSecs = null; localStorage.setItem('base-camp-save-v2', JSON.stringify(sv)); localStorage.setItem('base-camp-map-v1', map); __g.prepareContinue();
    return __g.G.settlements.flatMap((S) => S.cols.map((c) => c.name));
  });
  ok('an old save with "Pip 2" keeps it', old.includes('Pip 2'), JSON.stringify(old.slice(0, 12)));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const f = res.filter((r) => !r).length; console.log(f ? f + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(f ? 1 : 0);
})();
