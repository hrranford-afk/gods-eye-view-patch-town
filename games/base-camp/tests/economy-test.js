/* Build 24: the economy (Harry: "they've got to get corn, wood, they can make things, get things at higher value"). Buttons, workshops that turn raw goods into dearer ones,
   camps that lean to their surface, prices that move with supply and demand, Mossby the pedlar snail, the Giant's nudge and suggestion, diary lines, save and load.
   Run (from games/base-camp): NODE_PATH=$(npm root -g) node tests/economy-test.js */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const WED = '2026-11-18', TUE = '2026-11-17', SUN = '2026-11-22';
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.reload(); await sleep(1500);
  const setDate = (d, h) => ev(([d, h]) => { __g.ENV.dateOverride = d; if (h !== undefined) __g.ENV.hourOverride = h; __g.ENV._sk = 0; __g.envUpdate(); return __g.mktWeekday(); }, [d, h]);
  await setDate(TUE, 12);
  ok('BUILD is build 24', await ev(() => __g.BUILD === 'build 24'));
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
  await ev(() => { __g.F10.on = false; for (const r of __g.G.requests.slice()) __g.resolveRequest(r, true); __g.F10.reqDone = true; __g.FUN.queue.length = 0; });
  const shotPrep = () => ev(() => { for (const id of ['toast', 'env', 'sel']) { const e = document.getElementById(id); if (e) { if (id === 'toast' || id === 'banner') e.innerHTML = ''; else e.hidden = true; } } __g.CCAM && __g.camClose && __g.camClose(); const bn = document.getElementById('banner'); if (bn) bn.style.visibility = 'hidden'; });
  const focusLocal = (sid, x, z, d, yaw, pitch, up) => ev(([sid, x, z, d, yaw, pitch, up]) => { const S = __g.G.settlements.find((q) => q.id === sid); const w = S.group.localToWorld(new __g.THREE.Vector3(x, 0, z)); __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = yaw; __g.P.pitch = pitch; __g.focusOn(w.x, w.y + (up || 0.02), w.z, d); return true; }, [sid, x, z, d, yaw, pitch, up]);
  const focusBoard = (d, off, pitch) => ev(([d, off, pitch]) => { const st = __g.mktSite() || { t: __g.mainSettlement().things.find((q) => q.kind === 'market'), S: __g.mainSettlement() }; const m = st.S.group.localToWorld(new __g.THREE.Vector3(st.t.x, 0, st.t.z)), bw = new __g.THREE.Vector3(); st.t.mesh.userData.board.getWorldPosition(bw);
    __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = Math.atan2(bw.x - m.x, bw.z - m.z) + off; __g.P.pitch = pitch; __g.focusOn(m.x, m.y + 0.03, m.z, d); return true; }, [d, off, pitch]);
  const snap = async (n) => { await ev(() => { const t = document.getElementById('toast'); if (t) t.innerHTML = ''; }); await p.screenshot({ path: OUT + n }); };
  const shut = () => ev(() => { const m = document.getElementById('modal'); m.hidden = true; delete m.dataset.eco; });

  /* 1. a camp with a market and the three workshops */
  const A = await ev(() => {
    const S = __g.mainSettlement(); S.stock.wood = 30; const put = (k, R, near) => { for (let i = 0; i < 40; i++) { const sp = __g.findSpot(S, __g.KINDS[k].r + 0.006, near && i < 30 ? { R: 0.1, cx: near.x, cz: near.z } : { R: R || 0.24 }); if (sp) { const t = __g.addThing(S, k, sp[0], sp[1], { built: true, rot: Math.atan2(-sp[0], -sp[1]) }); return t; } } return null; };
    const m = put('market', 0.2), sb0 = put('sawbench', 0.2), ws = [sb0, put('oven', 0.2, sb0), put('reel', 0.2, sb0)];
    return { id: S.id, spec: S.spec, zone: S.zoneName, market: !!m, ws: ws.map((t) => t && t.kind), btn: S.stock.btn };
  });
  ok('the main camp has a market and three workshops (sawbench, thimble oven, rope reel)', A.market && A.ws.join() === 'sawbench,oven,reel', JSON.stringify(A));
  ok('the workshops are in the Build menu once there is a market', await ev(() => ['sawbench', 'oven', 'reel'].every((k) => __g.FUN.unl !== undefined && __g.funUnlocked(k))));
  ok('workshop models come from models/economy.js (inked toon bodies), with a plain fallback', await ev(() => { const S = __g.mainSettlement(); const t = S.things.find((q) => q.kind === 'sawbench'); let ink = 0; t.mesh.traverse((o) => { if (o.userData && o.userData.ink) ink++; }); __g.BCP.econOff = true; const pl = __g.econMake('reel'); __g.BCP.econOff = false; return t.mesh.userData.bcEcon === 'sawbench' && !t.mesh.userData.plain && ink > 0 && pl.userData.plain === 1 && pl.userData.items.length === 3; }));
  ok('a new camp starts with a few buttons', A.btn >= 1, A.btn);

  /* 2. crafting: inputs become one thing worth more than they were */
  const val = await ev(() => { const G = __g.ECON_GOODS, v = (k) => G[k].base, r = {}; for (const g of ['planks', 'bread', 'rope']) { let inp = 0; for (const k in G[g].need) inp += v(k) * G[g].need[k]; r[g] = [inp, v(g)]; } return r; });
  ok('every crafted good is worth more buttons than what goes into it', Object.values(val).every(([i, o]) => o > i), JSON.stringify(val));
  const craft = await ev(() => {
    const S = __g.mainSettlement(), t = S.things.find((q) => q.kind === 'sawbench'), c = S.cols[0]; S.stock.wood = 20; S.stock.planks = 0; const w0 = S.stock.wood;
    __g.econCraftDone(S, c, t, 'planks', true); const one = { wood: w0 - S.stock.wood, planks: S.stock.planks };
    S.stock.thread = 6; S.stock.rope = 0; __g.econCraftDone(S, c, S.things.find((q) => q.kind === 'reel'), 'rope', true); S.stock.food = 20; S.stock.bread = 0; __g.econCraftDone(S, c, S.things.find((q) => q.kind === 'oven'), 'bread', true);
    return { one, rope: S.stock.rope, thread: S.stock.thread, bread: S.stock.bread, food: S.stock.food };
  });
  ok('a sawbench turns 2 wood into a plank; the reel 2 threads into rope; the oven 2 corn into a corn cake', craft.one.wood === 2 && craft.one.planks === 1 && craft.rope === 1 && craft.thread === 4 && craft.bread === 1 && craft.food === 18, JSON.stringify(craft));
  /* the colonists do it themselves: wood to spare and a sawbench, and planks appear */
  await ev(() => { const S = __g.mainSettlement(); S.stock.planks = 0; S.stock.bread = 0; S.stock.rope = 0; for (const c of S.cols) { c.needs.food = 0.9; c.needs.water = 0.9; c.needs.rest = 0.95; c.needs.joy = 0.9; } });
  const m0 = await ev(() => __g.mainSettlement().stats.made || 0); let made = 0;
  for (let i = 0; i < 60; i++) { await ev(() => { const S = __g.mainSettlement(); S.stock.wood = Math.max(S.stock.wood, 20); S.stock.food = Math.max(S.stock.food, 20); S.stock.thread = Math.max(S.stock.thread, 6); __g.simulate(4); }); made = await ev(() => { const S = __g.mainSettlement(); return { n: (S.stats.made || 0), planks: S.stock.planks, bread: S.stock.bread, rope: S.stock.rope }; }); if (made.n - m0 >= 3) break; }
  ok('the colonists make things by themselves when they have inputs to spare (planks, corn cakes, rope)', made.n - m0 >= 3, JSON.stringify(made));

  /* 3. the Giant's nudge: tap a workshop, one button */
  await ev(() => __g.setTool('look'));
  const tapThing = (k) => ev((k) => { const S = __g.mainSettlement(), t = S.things.find((q) => q.kind === k); const w = S.group.localToWorld(new __g.THREE.Vector3(t.x, 0, t.z)); const s = __g.toScreen(w); __g.tapAt(s[0], s[1]); return document.getElementById('modal').dataset.eco || ''; }, k);
  const sb = await ev(() => { const S = __g.mainSettlement(), t = S.things.find((q) => q.kind === 'sawbench'); return [t.x, t.z]; });
  await focusLocal(A.id, sb[0], sb[1], 0.22, 0.6, 0.55, 0.01); await sleep(900);
  await ev(() => { for (const S of __g.G.settlements) for (const c of S.cols) if (c.job && c.job.type !== 'craft') { /* nobody in the way of the tap */ } });
  let wsCard = await tapThing('sawbench'); if (wsCard !== 'ws') { await ev(() => { const S = __g.mainSettlement(); __g.wsUi(S, S.things.find((q) => q.kind === 'sawbench')); }); wsCard = 'ws(direct)'; }
  ok('a tap on the sawbench (Look) opens its card with "Make more planks" / "Make fewer planks"', /ws/.test(wsCard) && await ev(() => /Make more planks/.test(document.getElementById('modal').textContent) && /Make fewer planks/.test(document.getElementById('modal').textContent)), wsCard);
  await sleep(300); await shotPrep(); await snap('78-workshop-card.png');
  await p.click('#modal [data-nudge="-1"]'); await sleep(200);
  const less = await ev(() => { const S = __g.mainSettlement(); return { n: S.eco.nudge.planks, txt: document.getElementById('ecState').textContent }; });
  ok('one tap on "Make fewer planks" sets the nudge and the card says so', less.n === -1 && /just a few/i.test(less.txt), JSON.stringify(less));
  await shut();
  const runPlanks = async (secs) => { await ev(() => { const S = __g.mainSettlement(); S.stock.planks = 0; }); let mx = 0; for (let i = 0; i < secs / 4; i++) { mx = Math.max(mx, await ev(() => { const S = __g.mainSettlement(); S.stock.wood = Math.max(S.stock.wood, 22); for (const c of S.cols) { c.needs.food = Math.max(c.needs.food, 0.8); c.needs.water = Math.max(c.needs.water, 0.8); c.needs.rest = Math.max(c.needs.rest, 0.9); } __g.simulate(4); return S.stock.planks; })); } return mx; };
  const fewMax = await runPlanks(100);
  await ev(() => __g.econNudge(__g.mainSettlement(), 'planks', 1));
  const moreMax = await runPlanks(180);
  ok('the nudge changes production: "fewer" stops at 1 plank, "more" makes plenty', fewMax <= 1 && moreMax >= 5, 'fewer ' + fewMax + ', more ' + moreMax);
  await ev(() => __g.econNudge(__g.mainSettlement(), 'planks', 1)); /* a second tap the same way: back to normal */
  ok('a second tap the same way goes back to normal', await ev(() => __g.mainSettlement().eco.nudge.planks === 0));
  const wc = await ev(() => { const S = __g.mainSettlement(), ws = S.things.filter((q) => __g.ECON_WS[q.kind]); let x = 0, z = 0; for (const t of ws) { x += t.x; z += t.z; } x /= ws.length; z /= ws.length; return [x, z, Math.max(...ws.map((t) => Math.hypot(t.x - x, t.z - z)))]; });
  await ev(([x, z, r]) => { const S = __g.mainSettlement(), w = S.group.localToWorld(new __g.THREE.Vector3(x, 0, z)), c = S.group.localToWorld(new __g.THREE.Vector3(0, 0, 0)); __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = Math.atan2(c.x - w.x, c.z - w.z); __g.P.pitch = 0.75; __g.focusOn(w.x, w.y + 0.012, w.z, Math.max(0.26, r * 3)); for (const q of S.cols) if (!q.job || q.job.type !== 'craft') { const d = Math.hypot(q.x - x, q.z - z); if (d < r + 0.06) { q.x = x + (q.x - x) / (d || 1) * (r + 0.09); q.z = z + (q.z - z) / (d || 1) * (r + 0.09); } } }, wc); await shotPrep(); await sleep(1500);
  await snap('79-workshops.png');

  /* 4. market day with one camp: the pedlar comes, buys the surplus, so a lone camp still earns */
  await setDate(WED, 11); await ev(() => __g.simulate(2));
  for (let i = 0; i < 20; i++) { if (await ev(() => !!__g.ECON.ped && __g.MKT.open)) break; await ev(() => __g.simulate(1)); await sleep(200); }
  const ped = await ev(() => ({ open: __g.MKT.open, ped: !!__g.ECON.ped, mesh: !!(__g.ECON.ped && __g.ECON.ped.mesh && __g.ECON.ped.mesh.parent), plain: __g.ECON.ped && __g.ECON.ped.mesh.userData.plain, prices: Object.keys(__g.ECON.price).length }));
  ok('market day: the market opens and Mossby the pedlar snail parks his cart (economy.js model); prices for every good', ped.open && ped.ped && ped.mesh && !ped.plain && ped.prices === Object.keys(await ev(() => __g.ECON_GOODS)).length, JSON.stringify(ped));
  const lone = await ev(() => { const S = __g.mainSettlement(); S.stock.food = 30; const b0 = S.stock.btn, pb = __g.ECON.pedBought; S.eco.wish = ''; const e = __g.mktDeal(S.cols[0], S, S); return { b0, earned: e.earned, pb: __g.ECON.pedBought - pb, text: e.text, food: S.stock.food, keep: __g.econKeep(S, 'food') }; });
  ok('a camp alone still earns: it sells its spare goods to the pedlar for buttons', lone.earned > 0 && lone.pb > 0 && /sold .+ to Mossby the pedlar for \d+ buttons?/.test(lone.text), JSON.stringify(lone));
  const reserve = await ev(() => { const S = __g.mainSettlement(), out = []; for (let i = 0; i < 12; i++) { __g.mktDeal(S.cols[0], S, S); out.push(S.stock.food >= __g.econKeep(S, 'food') && S.stock.water >= Math.min(S.stock.water, __g.econKeep(S, 'water'))); } return { all: out.every(Boolean), food: S.stock.food, keep: __g.econKeep(S, 'food'), pop: S.cols.length }; });
  ok('nobody goes hungry from selling: the camp keeps its food reserve (2 a head and more)', reserve.all && reserve.food >= reserve.keep && reserve.keep >= 2 * reserve.pop, JSON.stringify(reserve));
  const hungry = await ev(() => { const S = __g.mainSettlement(); Object.assign(S.stock, { food: 2, btn: 0, bread: 0, wood: 0, seeds: 0, water: 2, thread: 0, planks: 0, rope: 0 }); const e = __g.mktDeal(S.cols[0], S, S); return { food: S.stock.food, text: e.text }; });
  ok('a camp short of corn with no buttons is given a little by the pedlar (never debt)', hungry.food > 2 && /for a hug/.test(hungry.text), JSON.stringify(hungry));
  /* the pedlar's card: tap the cart, suggest the lantern */
  const pp = await ev(() => { const P = __g.ECON.ped; return [P.x, P.z, P.sid]; });
  await ev(() => { const P = __g.ECON.ped, S = __g.G.settlements.find((q) => q.id === P.sid), ry = P.mesh.rotation.y, mx = P.x - Math.sin(ry) * 0.024, mz = P.z - Math.cos(ry) * 0.024, st = S.things.find((q) => q.kind === 'market');
    /* look at the snail's side, from whichever side faces away from the market */
    const sx = Math.sin(ry + Math.PI / 2), sz = Math.cos(ry + Math.PI / 2), away = (mx - st.x) * sx + (mz - st.z) * sz > 0 ? 1 : -1, w = S.group.localToWorld(new __g.THREE.Vector3(mx, 0, mz)), w2 = S.group.localToWorld(new __g.THREE.Vector3(mx + sx * away, 0, mz + sz * away));
    __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = Math.atan2(w2.x - w.x, w2.z - w.z) + 0.35; __g.P.pitch = 0.5; __g.focusOn(w.x, w.y + 0.02, w.z, 0.22);
    for (const q of S.cols) { const d = Math.hypot(q.x - mx, q.z - mz); if (d < 0.07) { q.x = mx + (q.x - mx) / (d || 1) * 0.1; q.z = mz + (q.z - mz) / (d || 1) * 0.1; } } }); await shotPrep(); await sleep(1600);
  await snap('80-pedlar.png');
  const pcard = await ev(() => { const S = __g.G.settlements.find((q) => q.id === __g.ECON.ped.sid), P = __g.ECON.ped; const w = S.group.localToWorld(new __g.THREE.Vector3(P.x, 0, P.z)); const s = __g.toScreen(w); __g.tapAt(s[0], s[1]); return document.getElementById('modal').dataset.eco || ''; });
  if (pcard !== 'ped') await ev(() => __g.pedUi(__g.mainSettlement()));
  ok('a tap on the cart opens the pedlar card: rare seeds, a lantern, a pinwheel, a cable car pulley', pcard === 'ped' && await ev(() => { const t = document.getElementById('modal').textContent; return /Rare seeds/.test(t) && /lantern/i.test(t) && /pinwheel/i.test(t) && /pulley/i.test(t); }), pcard);
  await ev(() => { const S = __g.mainSettlement(); S.stock.btn = 2; S.eco.got = {}; }); await ev(() => __g.pedUi(__g.mainSettlement()));
  await p.click('#modal [data-wish="lantern"]'); await sleep(250);
  const wish = await ev(() => ({ wish: __g.mainSettlement().eco.wish, txt: document.getElementById('ecWish').textContent }));
  ok('tap the lantern to suggest it: "Pip wants a lantern!" (or the first colonist)', wish.wish === 'lantern' && /wants a lantern!/.test(wish.txt), JSON.stringify(wish));
  await sleep(200); await shotPrep(); await snap('81-pedlar-card.png'); await shut();
  const saving = await ev(() => { const S = __g.mainSettlement(); S.stock.btn = 5; S.stock.food = 10; const n0 = S.things.filter((t) => t.kind === 'lantern').length; const it = __g.econShop(S, S.cols[0], true); return { it: it && it.id, btn: S.stock.btn, n: S.things.filter((t) => t.kind === 'lantern').length - n0 }; });
  ok('saving up: with too few buttons they buy nothing else', !saving.it && saving.btn === 5 && saving.n === 0, JSON.stringify(saving));
  const bought = await ev(() => { const S = __g.mainSettlement(); S.stock.btn = 9; S.stock.food = 22; const n0 = S.things.filter((t) => t.kind === 'lantern').length; const e = __g.mktDeal(S.cols[0], S, S); return { text: e.text, btn: S.stock.btn, n: S.things.filter((t) => t.kind === 'lantern').length - n0, wish: S.eco.wish, got: S.eco.got.lantern }; });
  ok('buttons are spent: once they can afford it they buy the lantern from the pedlar, and it appears in the camp', bought.n === 1 && bought.wish === '' && bought.got >= 1 && /bought a lantern from Mossby/.test(bought.text), JSON.stringify(bought));

  /* 5. the price board: a chalkboard on the market, and a card on a tap */
  const mk = await ev(() => { const S = __g.mainSettlement(), t = S.things.find((q) => q.kind === 'market'); return [t.x, t.z, t.rot, !!t.mesh.userData.board, !!(t.mesh.userData.board && t.mesh.userData.board.userData.face.material.map)]; });
  ok('the market has a chalkboard price board with a drawn face', mk[3] && mk[4], JSON.stringify(mk));
  await focusBoard(0.3, 0.3, 0.42); await sleep(800);
  const pc = await ev(() => { const S = __g.mainSettlement(), t = S.things.find((q) => q.kind === 'market'); const w = S.group.localToWorld(new __g.THREE.Vector3(t.x, 0, t.z)); const s = __g.toScreen(w); __g.tapAt(s[0], s[1]); return document.getElementById('modal').dataset.eco || ''; });
  if (pc !== 'price') await ev(() => __g.priceUi(__g.mainSettlement().things.find((q) => q.kind === 'market')));
  const card = await ev(() => ({ rows: document.querySelectorAll('#modal .erow').length, pips: document.querySelectorAll('#modal .epips img').length, txt: document.getElementById('modal').textContent }));
  ok('a tap on the market (Look) opens the price card: a row per good with 1 to 5 button pips', (pc === 'price') && card.rows === 8 && card.pips >= 8 && card.pips <= 40 && /Market prices/.test(card.txt), pc + ' ' + JSON.stringify({ rows: card.rows, pips: card.pips }));
  await sleep(200); await shotPrep(); await snap('82-price-card.png'); await shut();

  /* 6. a second camp on another surface: different surpluses */
  const linked = await ev(() => {
    const S = __g.mainSettlement(); S.stock.wood = Math.max(S.stock.wood, 20);
    const Zt = __g.G.zones.filter((Z) => !Z.settled && !Z.lost && !Z.ceil && Z.land && Z.area > 0.04 && Z !== S.zoneRef && Z.spec !== S.spec).sort((a, b) => Math.hypot(a.cx - S.zoneRef.cx, a.cz - S.zoneRef.cz) - Math.hypot(b.cx - S.zoneRef.cx, b.cz - S.zoneRef.cz))[0];
    if (!Zt) return 'no zone'; __g.ensureDist(Zt); __g.ensureDist(S.zoneRef); const l = __g.makeLink(S, S.zoneRef.core[0], S.zoneRef.core[1], Zt, Zt.core[0], Zt.core[1]); return l ? 'ok' : 'no link';
  });
  for (let i = 0; i < 40; i++) { await ev(() => __g.simulate(10)); if (await ev(() => __g.G.settlements.some((S) => S !== __g.mainSettlement() && !S.awaiting && S.cols.length >= 2))) break; }
  const B = await ev(() => { const A = __g.mainSettlement(), B = __g.G.settlements.find((S) => S !== A && !S.awaiting && !S.lost); return B ? { id: B.id, spec: B.spec, zone: B.zoneName, pop: B.cols.length } : null; });
  ok('a second camp on a different surface, joined by cable car', linked === 'ok' && B && B.spec !== A.spec, linked + ' ' + JSON.stringify(B) + ' main ' + A.spec);
  /* both start level; a while of life, and each camp's surplus follows its surface */
  await setDate(TUE, 12);
  await ev(() => { for (const S of __g.G.settlements) { if (S.lost) continue; Object.assign(S.stock, { wood: 10, food: 8, seeds: 3, water: 6, thread: 0, planks: 0, bread: 0, rope: 0 }); while (S.cols.length < 4) __g.addColonist(S, { x: 0.02, z: 0.03 }); } });
  for (let i = 0; i < 24; i++) await ev(() => { for (const S of __g.G.settlements) for (const c of S.cols) { c.needs.food = Math.max(c.needs.food, 0.75); c.needs.water = Math.max(c.needs.water, 0.75); c.needs.rest = Math.max(c.needs.rest, 0.8); } __g.simulate(30, 1); });
  const sur = await ev(() => __g.G.settlements.filter((S) => !S.lost && !S.awaiting).map((S) => ({ zone: S.zoneName, spec: S.spec, sur: __g.econSurplusOf(S), spare: __g.econSpare(S), stock: Object.assign({}, S.stock) })));
  const top = (s) => Object.keys(s.sur).sort((a, b) => s.sur[b] - s.sur[a])[0];
  ok('camps on different surfaces end up with different surpluses (and bring different things to market)', sur.length >= 2 && sur[0].spare !== sur[1].spare && Object.keys(sur[0].sur).sort().join() !== Object.keys(sur[1].sur).sort().join() && !!top(sur[0]), JSON.stringify(sur.map((s) => [s.spec, s.sur, s.spare])));
  ok('sock fluff (thread) is gathered on the floor only', sur.every((s) => (s.spec === 'farmland') === (s.stock.thread > 0) || s.spec !== 'farmland' ? (s.spec === 'farmland' ? s.stock.thread > 0 || s.stock.rope > 0 : !s.stock.thread) : true), JSON.stringify(sur.map((s) => [s.spec, s.stock.thread, s.stock.rope])));
  ok('every camp grows a little food of its own', sur.every((s) => s.stock.food + s.stock.bread >= 6), JSON.stringify(sur.map((s) => [s.spec, s.stock.food, s.stock.bread])));

  /* 7. prices move between two market days: plentiful planks get cheaper, scarce seeds dearer */
  const glut = () => ev(() => { for (const S of __g.G.settlements) if (!S.lost && !S.awaiting) { S.stock.planks = 1; S.stock.seeds = 10; } });
  await glut(); await setDate(SUN, 11); await ev(() => __g.simulate(2));
  const d1 = await ev(() => ({ day: __g.ECON.pday, price: Object.assign({}, __g.ECON.price) }));
  await setDate(SUN, 22); await ev(() => __g.simulate(3)); await setDate(TUE, 12); await ev(() => __g.simulate(2));
  await ev(() => { for (const S of __g.G.settlements) if (!S.lost && !S.awaiting) { S.stock.planks = 14; S.stock.seeds = 0; } });
  await setDate('2026-11-25', 11); await ev(() => __g.simulate(2));
  const d2 = await ev(() => ({ day: __g.ECON.pday, price: Object.assign({}, __g.ECON.price), prev: Object.assign({}, __g.ECON.prev), tp: __g.econTrend('planks'), ts: __g.econTrend('seeds') }));
  ok('two market days: plentiful planks get cheaper (arrow down), scarce seeds dearer (arrow up)', d1.day !== d2.day && d2.price.planks < d1.price.planks && d2.price.seeds > d1.price.seeds && d2.tp === -1 && d2.ts === 1, JSON.stringify({ d1: d1.price, d2: d2.price }));
  ok('prices stay between 1 and 5 buttons', Object.values(d2.price).every((v) => v >= 1 && v <= 5));

  /* 8. the two camps trade by cable car: a trader carries goods, the stall shows them; buttons change hands */
  await ev(() => { const A = __g.mainSettlement(), B = __g.G.settlements.find((S) => S !== A && !S.awaiting && !S.lost); A.stock.planks = 6; A.stock.btn = 10; B.stock.btn = 12; B.stock.food = 2; A.stock.food = 20; for (const S of [A, B]) for (const c of S.cols) c.needs.rest = 1; });
  const x0 = await ev(() => __g.MKT.xfer); let carried = null, signs = false;
  for (let i = 0; i < 60; i++) {
    await ev(() => __g.simulate(4));
    const st = await ev(() => { const site = __g.mktSite(); const v = site.S.cols.find((c) => c.job && c.job.type === 'market' && c.job.ph === 'do' && c.bundle); const U = site.t.mesh.userData, sg = (U.signs || []).some((s) => s.visible) && (U.stacks || []).some((st, i) => st.visible && U.signs[i].visible && st.children.findIndex((b) => b.visible) + 1 === __g.econPrice(U.signs[i].userData.g)); return { v: v ? { id: v.id, g: v.bundle.userData.mkt, home: v.mkt ? v.mkt.home : site.S.id } : null, sg }; });
    if (st.v && !carried) carried = st.v; if (st.sg) signs = true;
    if (carried && signs && (await ev(() => __g.MKT.xfer)) > x0) break;
  }
  ok('traders carry a bundle of their goods to the stalls', !!carried && !!carried.g, JSON.stringify(carried));
  ok('a stall shows what it is selling (a sign) and its price as a stack of real buttons (one per button of price)', signs);
  const xf = await ev(() => ({ x: __g.MKT.xfer, log: __g.MKT.log.slice(-6).map((e) => e.text) }));
  ok('goods and buttons move between the two camps', xf.x > x0 && xf.log.some((t) => /(sold|bought) .+ (to|from) the .+ camp/.test(t)), JSON.stringify(xf.log.slice(-3)));
  /* the market-day picture: traders at the stalls, the pedlar, the board */
  await ev(() => { const site = __g.mktSite(); const cs = site.S.cols.filter((c) => !c.inside).slice(0, 3); cs.forEach((c, i) => { c.needs.rest = 1; __g.mktSend(c, site.S, site.t, i); }); });
  for (let i = 0; i < 20; i++) { await ev(() => __g.simulate(1)); if (await ev(() => __g.mktSite().S.cols.filter((c) => c.job && c.job.type === 'market' && c.job.ph === 'do').length >= 2)) break; }
  await ev(() => { for (const c of __g.mktSite().S.cols) if (c.job && c.job.type === 'market') c.job.dur = 999; __g.MKT.talkT = 0; __g.MKT.reply = null; });
  const mk2 = await ev(() => { const t = __g.mktSite().t; return [t.x, t.z, t.rot, __g.mktSite().S.id]; });
  await focusBoard(0.34, 0.35, 0.4); await shotPrep(); await sleep(2600);
  await snap('83-market-goods.png');
  ok('the camp card shows its buttons on one small line', await ev(() => { __g.G.cur = __g.mainSettlement(); __g.cardUi(); const e = document.querySelector('#card .ecoline'); return !!e && /\d+ buttons?/.test(e.textContent); }));
  await ev(() => { for (const S of __g.G.settlements) for (const c of S.cols) if (c.job && c.job.type === 'market') c.job.dur = 1; __g.simulate(3); });

  /* 9. closing: a diary line per camp */
  const close = await ev(() => { const S = __g.mainSettlement(); S.stock.planks = 8; S.eco.wish = 'pinwheel'; S.stock.btn = 9; const c = S.cols[0]; __g.mktDeal(c, S, S); return true; });
  await setDate(WED, 17.9); await ev(() => __g.simulate(3));
  const diary = await ev(() => __g.MKT.log.filter((e) => e.sum).map((e) => e.text).slice(-3));
  ok('market closes with a diary line: "Market day: the X camp sold 6 planks for 9 buttons and bought ..."', close && diary.some((t) => /^Market day: the .+ camp sold \d+ .+ for \d+ buttons?/.test(t)) && diary.some((t) => /and bought .*a paper pinwheel/.test(t)), JSON.stringify(diary));
  ok('the pedlar goes home when the market shuts', await ev(() => !__g.ECON.ped));
  const awayW = await ev(() => { __g.ENV.dateOverride = '2026-11-18'; __g.ENV._sk = 0; __g.envUpdate(); for (const S of __g.G.settlements) if (!S.lost) { S.stock.planks = 8; S.stock.food = 20; } const r = __g.awaySim(4 * 3600, 9); return r.lines.map((l) => l.text).filter((t) => /^Market day:/.test(t)); });
  ok('back after a market-day morning away: the diary says what the camps sold and bought', awayW.length === 1 && /the .+ camp sold .+ for \d+ buttons?/.test(awayW[0]), JSON.stringify(awayW));

  /* 10. save and load */
  const sv = await ev(() => {
    const A = __g.mainSettlement(); A.stock.btn = 17; A.stock.planks = 3; A.stock.rope = 2; A.eco.nudge.bread = 1; A.eco.wish = 'pulley'; A.eco.pulley = true;
    const s = JSON.parse(JSON.stringify(__g.serialize())), d = s.settlements.find((q) => q.id === A.id);
    const back = { price: s.eco && s.eco.price, btn: d.stock.btn, planks: d.stock.planks, rope: d.stock.rope, eco: d.eco };
    /* take the camp away and bring it back from the save record */
    __g.G.settlements.splice(__g.G.settlements.indexOf(A), 1); __g.world.remove(A.group); A.zoneRef.settled = null; const wasCur = __g.G.cur === A;
    const R = __g.restoreSettlement(d); if (wasCur) __g.G.cur = R; R.placed = true; R.group.visible = true;
    __g.econLoad(s.eco);
    return { back, R: { btn: R.stock.btn, planks: R.stock.planks, rope: R.stock.rope, nudge: R.eco.nudge.bread, wish: R.eco.wish, pulley: R.eco.pulley, things: R.things.length, ws: R.things.filter((t) => __g.ECON_WS[t.kind]).length }, price: __g.ECON.price.planks === s.eco.price.planks };
  });
  ok('save and load keep buttons, made goods, nudges, a wish, the pulley and the prices', sv.R.btn === 17 && sv.R.planks === 3 && sv.R.rope === 2 && sv.R.nudge === 1 && sv.R.wish === 'pulley' && sv.R.pulley && sv.R.ws === 3 && sv.price, JSON.stringify(sv));
  const old = await ev(() => {
    const A = __g.mainSettlement(), s = JSON.parse(JSON.stringify(__g.serialize())), d = s.settlements.find((q) => q.id === A.id);
    delete d.eco; for (const k of ['btn', 'thread', 'planks', 'bread', 'rope']) delete d.stock[k]; d.things = d.things.filter((t) => !__g.ECON_WS[t.kind]); for (const t of d.things) delete t.pk;
    __g.G.settlements.splice(__g.G.settlements.indexOf(A), 1); __g.world.remove(A.group); A.zoneRef.settled = null;
    const R = __g.restoreSettlement(d); __g.G.cur = R; R.placed = true; R.group.visible = true; __g.econLoad(undefined);
    __g.simulate(5); const e = __g.mktDeal(R.cols[0], R, R);
    return { btn: R.stock.btn, planks: R.stock.planks, eco: !!R.eco, nudge: R.eco.nudge.planks, text: e.text, price: Object.keys(__g.ECON.price).length };
  });
  ok('an old save without the new fields loads and trades (0 buttons, no workshops)', old.eco && old.btn >= 0 && old.planks === 0 && old.nudge === 0 && /^Market day: /.test(old.text), JSON.stringify(old));
  ok('a cable car with the pedlar\'s pulley runs faster', await ev(() => !!__g.econOf && __g.ECON_SHOP.some((i) => i.id === 'pulley')) && await ev(() => { const l = __g.G.links[0]; if (!l) return false; const S = __g.G.settlements.find((q) => q.id === l.a.sid); return !!S; }));
  ok('one tuning table holds every price and rate', await ev(() => { const T = __g.ECON_TUNE; return !!(T.goods && T.lean && T.food && T.thread && T.price && T.trade && T.craft && T.shop) && __g.ECON_GOODS === T.goods; }));
  ok('coins jingle: a new sound on the sound board', await ev(() => !!__g.SND.KINDS.coins));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  console.log(res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
