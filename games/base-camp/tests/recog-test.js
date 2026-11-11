// Base Camp recognition (phase 2): the practice room's eyes, library override, "What is this?", mocked detector, and (needs network) the real COCO-SSD and CLIP models.
// Run:  NODE_PATH=$(npm root -g) node games/base-camp/tests/recog-test.js        (REAL=0 skips the model downloads)
const path = require('path');
const { serve, launch } = require('./lib.js');
const OUT = path.join(__dirname, '..', 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const M = {};
const ok = (name, cond, extra) => { results.push(!!cond); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1200);
  await ev(() => { __g.ENV.hourOverride = 12; localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); __g.RECOG.cool = 0; });
  await p.click('#bMore'); await p.click('#bMap'); await ev(() => __g.injectScan(0.02)); await ev(() => __g.doneScanning()); await sleep(400);
  await ev(() => { __g.P.yaw = 0.15; __g.P.pitch = 0.9; __g.focusOn(-0.3, 0.9, -1.0, 2.9); }); await sleep(1500);
  const tick = async (n) => { for (let i = 0; i < n; i++) { await ev(() => __g.recogTick()); await sleep(80); } };
  const propTop = (id) => ev((id) => { const q = __g.PROPS.find((x) => x.id === id); return [q.x, q.base + q.h, q.z]; }, id);
  // ---- the practice eyes: a cup is recognised, asked about, confirmed ----
  await tick(4);
  const ask1 = await ev(() => ({ vis: !document.getElementById('guess').hidden, text: document.getElementById('guess').innerText, g: __g.RECOG.ask && { name: __g.RECOG.ask.name, tag: __g.RECOG.ask.tag, x: __g.RECOG.ask.x, y: __g.RECOG.ask.y, z: __g.RECOG.ask.z, cls: __g.RECOG.ask.cls } }));
  ok('a detected cup becomes "I think this is a cup! Right?"', ask1.vis && /I think this is a cup/.test(ask1.text), ask1.text.split('\n')[0]);
  const cupTop = await propTop('cup'); const err1 = Math.hypot(ask1.g.x - cupTop[0], ask1.g.z - cupTop[2]);
  ok('the ray from the detection\'s feet finds the cup\'s spot within 5 cm', err1 < 0.05 && Math.abs(ask1.g.y - cupTop[1]) < 0.03, 'off by ' + (err1 * 100).toFixed(1) + ' cm');
  await p.screenshot({ path: OUT + '11a-i-think.png' });
  await p.click('#gYes'); await sleep(200);
  ok('Yes: the cup is a spot and goes into the library', await ev(() => __g.G.spots.some((s) => s.tag === 'cup' && s.src === 'player') && __g.G.library.some((e) => e.key === 'coco:cup' && e.by === 'you')));
  // ---- a can seen as an unsure "bottle": Something else teaches the library ----
  await tick(6);
  const ask2 = await ev(() => ({ vis: !document.getElementById('guess').hidden, text: document.getElementById('guess').innerText }));
  ok('an unsure guess asks too (a can looks like a bottle)', ask2.vis && /bottle/.test(ask2.text), ask2.text.split('\n')[0]);
  const auto0 = await ev(() => __g.RECOG.stats.auto);
  await p.click('#gElse'); await sleep(200);
  const pick = await ev(() => ({ vis: !document.getElementById('tagpick').hidden, text: document.getElementById('tagpick').innerText }));
  ok('"Something else" opens the picker with "What is this?"', pick.vis && /What is this\?/.test(pick.text) && /bottle/.test(pick.text));
  await p.fill('#tagName', 'Tin can'); await p.click('#tagpick [data-tag=can]'); await sleep(200);
  ok('the answer teaches the library: what it calls a bottle here is a can', await ev(() => { const e = __g.libFind('coco:bottle'); return e && e.tag === 'can' && e.name === 'Tin can'; }));
  // ---- library overrides: the other cans are named without asking ----
  await tick(8);
  const auto1 = await ev(() => __g.RECOG.stats.auto);
  const cans = await ev(() => __g.G.spots.filter((s) => s.tag === 'can').length);
  ok('library overrides the guess: the other cans are named without a question', auto1 - auto0 >= 1 && cans >= 2, 'auto-named ' + (auto1 - auto0) + ', cans now ' + cans);
  // ---- a wrong guess (the GPU box is not a laptop): No ----
  await tick(6); let sawLaptop = await ev(() => { const g = document.getElementById('guess'); return !g.hidden && /laptop/.test(g.innerText); });
  if (sawLaptop) { await p.click('#gNo'); await sleep(200); }
  ok('a wrong guess can be turned down', await ev(() => !__g.G.spots.some((s) => s.tag === 'computer')), sawLaptop ? 'asked and answered No' : 'not asked');
  // ---- the unknowns: "What is this?" ----
  await ev(() => { document.getElementById('guess').hidden = true; __g.RECOG.ask = null; });
  const nUnk = await ev(() => __g.unknownTops().length);
  ok('things nobody has named are counted ("What are these?")', nUnk >= 2, nUnk + ' unknown');
  await p.click('#bAsk'); await sleep(600);
  const unk = await ev(() => ({ vis: !document.getElementById('tagpick').hidden, text: document.getElementById('tagpick').innerText.split('\n')[0] }));
  ok('"What is this?" with the tag picker for something nobody knows', unk.vis && /What is this\?/.test(unk.text));
  await ev(() => { document.querySelectorAll('.chip').forEach((c) => (c.style.display = 'none')); });
  await p.screenshot({ path: OUT + '11-what-is-this.png' });
  await p.fill('#tagName', 'Hi-fi speaker'); await p.click('#tagpick [data-tag=speaker]'); await sleep(200);
  ok('naming it makes a spot with its role (broadcast tower) and a library entry', await ev(() => __g.G.spots.some((s) => s.name === 'Hi-fi speaker' && s.role === 'tower') && __g.G.library.some((e) => e.name === 'Hi-fi speaker' && e.key.startsWith('spot:'))));
  // ---- the library card, saved with the map, survives export/import and a reload ----
  await ev(() => __g.libUi()); await sleep(300); await p.screenshot({ path: OUT + '12-library.png' });
  const libText = await ev(() => document.getElementById('modal').innerText);
  ok('"Our library" shows icon, name, role and who taught it', /cup/.test(libText) && /Tin can/.test(libText) && /taught by you/.test(libText) && /Water tower|Tin silo|Broadcast tower/.test(libText));
  await ev(() => { document.getElementById('modal').hidden = true; __g.saveMap(); });
  const exp = await ev(() => JSON.stringify(__g.mapToJSON())); const lib0 = await ev(() => JSON.stringify(__g.G.library));
  await p.reload(); await sleep(1200); await ev(() => { __g.ENV.hourOverride = 12; });
  await ev((t) => { __g.importMapText(t); }, exp); const lib1 = await ev(() => JSON.stringify(__g.G.library));
  ok('the library travels with the map (export, import)', lib0 === lib1 && JSON.parse(lib1).length >= 3, JSON.parse(lib1).length + ' entries');
  M.libraryEntries = JSON.parse(lib1).length;

  // ---- a mocked detector in screen pixels (what the AR camera path feeds): bottom-centre -> ray -> spot ----
  await ev(() => { __g.resetWorld(); __g.G.intent = 'map'; __g.G.mode = 'practice'; __g.startScan(false); __g.injectScan(0.02); __g.doneScanning(); __g.P.yaw = 0.15; __g.P.pitch = 0.9; __g.focusOn(-0.3, 0.9, -1.0, 2.9); }); await sleep(1500);
  const box = await ev(() => { const q = __g.PROPS.find((x) => x.id === 'cup'); const pts = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yy of [0, 1]) { const v = new __g.THREE.Vector3(q.x + sx * q.w / 2, q.base + yy * q.h, q.z + sz * q.d / 2).project(__g.camera); pts.push([(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]); } const xs = pts.map((a) => a[0]), ys = pts.map((a) => a[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; });
  await ev((b2) => { __g.RECOG.detector = async (fr) => [{ class: 'cup', score: 0.8, bbox: [b2[0] * fr.w / innerWidth, b2[1] * fr.h / innerHeight, b2[2] * fr.w / innerWidth, b2[3] * fr.h / innerHeight] }, { class: 'cat', score: 0.9, bbox: [10, 10, 50, 50] }]; }, box);
  await tick(4); const mk = await ev(() => __g.RECOG.ask && { name: __g.RECOG.ask.name, x: __g.RECOG.ask.x, z: __g.RECOG.ask.z });
  const cupTop2 = await propTop('cup');
  ok('mocked detector (frame pixels): the cup is found and the unknown class "cat" is ignored', mk && mk.name === 'cup' && Math.hypot(mk.x - cupTop2[0], mk.z - cupTop2[2]) < 0.05, JSON.stringify(mk));
  await ev(() => { __g.RECOG.detector = null; });
  M.recogTickMs = await ev(async () => { const t0 = performance.now(); for (let i = 0; i < 10; i++) await __g.recogTick(); return +((performance.now() - t0) / 10).toFixed(1); });

  // ---- the real models (network) ----
  if (process.env.REAL !== '0') {
    await ev(() => { __g.RECOG.detector = null; });
    const coco = await ev(async () => { const t0 = performance.now(); await __g.cocoLoad(); const st = __g.RECOG.coco.state, err = __g.RECOG.coco.err; if (st !== 'ready') return { st, err };
      const img = new Image(); img.crossOrigin = 'anonymous'; await new Promise((r, j) => { img.onload = r; img.onerror = () => j(new Error('image')); img.src = 'https://cdn.jsdelivr.net/gh/tensorflow/tfjs-models@master/coco-ssd/demo/image1.jpg'; });
      const fr = { img, w: img.naturalWidth, h: img.naturalHeight }; let dets = await __g.RECOG.coco.model.detect(img, 12, 0.3); const t1 = performance.now(); for (let i = 0; i < 3; i++) dets = await __g.RECOG.coco.model.detect(img, 12, 0.3); const ms = (performance.now() - t1) / 3;
      return { st, loadMs: Math.round(__g.RECOG.coco.loadMs), ms: Math.round(ms), size: [img.naturalWidth, img.naturalHeight], dets: dets.map((d) => d.class + ':' + d.score.toFixed(2)) }; });
    console.log('COCO-SSD', JSON.stringify(coco));
    ok('real COCO-SSD (lite_mobilenet_v2) loads from the CDN and finds things in a photo', coco.st === 'ready' && coco.dets && coco.dets.length > 0, coco.dets ? coco.dets.join(' ') : coco.err);
    M.cocoLoadMs = coco.loadMs; M.cocoDetectMs = coco.ms;
    const clip = await ev(async () => {
      const k = __g.RECOG.clip; k.on = true; const t0 = performance.now(); await __g.clipLoad(); if (k.state !== 'ready') return { st: k.state, err: k.err };
      const img = new Image(); img.crossOrigin = 'anonymous'; await new Promise((r, j) => { img.onload = r; img.onerror = () => j(new Error('image')); img.src = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg'; });
      const c = document.createElement('canvas'); c.width = 224; c.height = 224; c.getContext('2d').drawImage(img, 0, 0, 224, 224);
      let emb = await __g.clipEmbed(c); const t1 = performance.now(); emb = await __g.clipEmbed(c); const ms = performance.now() - t1; const sc = k.labels.concat(k.checks).length && __g.clipScores(emb, true);
      return { st: 'ready', loadMs: Math.round(performance.now() - t0), dtype: k.dtype, ms: Math.round(ms), top: sc.slice(0, 3).map((s) => s.label + ':' + s.p.toFixed(2)) };
    });
    console.log('CLIP', JSON.stringify(clip));
    ok('real CLIP vision model loads on demand, and a photo of two cats comes out as "a cat" (the text and vision sides belong together)', clip.st === 'ready' && /a cat/.test(clip.top[0]), JSON.stringify(clip));
    M.clipLoadMs = clip.loadMs; M.clipEmbedMs = clip.ms; M.clipDtype = clip.dtype;
  }
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  console.log('METRICS', JSON.stringify(M));
  const fails = results.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + results.length + ' PASSED');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
