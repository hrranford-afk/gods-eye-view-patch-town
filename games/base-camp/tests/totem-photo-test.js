// Base Camp build 11: room totem photos. Generated test images only (canvas test patterns); no real photo is used or committed.
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/totem-photo-test.js
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, ctx, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  const reqs = []; p.on('request', (r) => reqs.push({ url: r.url(), method: r.method(), post: r.postData() || '' }));
  // a generated test pattern as a PNG buffer (1200 x 900: bigger than the 320 px limit)
  const png = async (label, hue) => Buffer.from((await ev(([label, hue]) => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 1200, 900); gr.addColorStop(0, 'hsl(' + hue + ',70%,45%)'); gr.addColorStop(1, 'hsl(' + (hue + 60) + ',70%,25%)'); g.fillStyle = gr; g.fillRect(0, 0, 1200, 900); for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.25)'; g.fillRect(i * 100, 0, 50, 900); } g.fillStyle = '#fff'; g.beginPath(); g.arc(600, 450, 220, 0, 7); g.fill(); g.fillStyle = '#222'; g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.fillText(label, 600, 500); return c.toDataURL('image/png').split(',')[1]; }, [label, hue])), 'base64');
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(1500);
  // make one saved room by playing the practice room, then copy it into two more rooms (the same bytes, named like the shed and the kitchen)
  await ev(() => { __g.ENV.hourOverride = 12; }); await p.click('#bMore'); await p.click('#bPrac');
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.G.settlements.length > 0)) break; }
  await sleep(4000); await ev(() => { __g.simulate(300, 0.5); __g.persist(true); });
  await ev(() => { const g = __g; const m = localStorage.getItem('base-camp-map-v1'), c = localStorage.getItem('base-camp-save-v2'); for (const n of ['r2', 'r3']) { localStorage.setItem('base-camp-map-v1.' + n, m); localStorage.setItem('base-camp-save-v2.' + n, c); g.HOMES.rooms.push({ id: n, name: n === 'r2' ? 'Shed' : 'Kitchen', created: Date.now(), visits: 1, known: 0.5, post: [] }); } g.HOMES.rooms[0].name = 'Garage'; g.HOMES.rooms[0].last = Date.now() - 3600e3; g.HOMES.rooms[1].last = Date.now() - 86400e3 * 2; g.HOMES.rooms[2].last = Date.now() - 86400e3 * 5; localStorage.setItem('bc-test-keys', JSON.stringify(Object.keys(localStorage))); g.homesSave(); });
  await p.reload(); await sleep(1800);
  ok('build 11 or later and three rooms listed as plain rows (no photos yet)', await ev(() => /^build 1[1-9]/.test(__g.BUILD) && document.querySelectorAll('#rooms .lib').length === 3 && !document.querySelector('#rooms .rcard') && !!document.querySelector('#totemIn[capture="environment"][accept="image/*"]')));
  ok('each plain row offers "Add totem photo" and says it stays on the iPad', await ev(() => [...document.querySelectorAll('#rooms .lib')].every((r) => /Add totem photo/.test(r.textContent) && /Stays on this iPad\./.test(r.textContent))));
  const idOf = async (name) => ev((n) => { const r = __g.HOMES.rooms.find((q) => q.name === n); return r.id; }, name);
  const addPhoto = async (name, label, hue) => { const id = await idOf(name); const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#rooms [data-id="' + id + '"] [data-act="tcam"]')]); await fc.setFiles({ name: 'test.png', mimeType: 'image/png', buffer: await png(label, hue) }); await sleep(700); return id; };
  const idShed = await addPhoto('Shed', 'SHED', 20); const idKit = await addPhoto('Kitchen', 'KIT', 150);
  const st = await ev((id) => { const r = JSON.parse(localStorage.getItem('bc-totem-' + id)); return new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight, len: r.jpeg.length, jpeg: r.jpeg.startsWith('data:image/jpeg') }); im.src = r.jpeg; }); }, idShed);
  ok('photo stored as a JPEG scaled to at most 320 px', st.jpeg && Math.max(st.w, st.h) <= 320 && Math.max(st.w, st.h) >= 300, JSON.stringify(st));
  ok('cards show for the two rooms with photos; the third stays a plain row', await ev(() => document.querySelectorAll('#rooms .rcard').length === 2 && document.querySelectorAll('#rooms .lib').length === 1));
  ok('cards are at least 120 px tall and large enough to tap', await ev(() => [...document.querySelectorAll('#rooms .rcard')].every((c) => c.getBoundingClientRect().height >= 120 && c.querySelector('.rph').getBoundingClientRect().width >= 120)));
  ok('card shows name and settlers / last-visit info', await ev(() => { const c = document.querySelector('#rooms .rcard'); return /Shed|Kitchen|Garage/.test(c.textContent) && /last visit/.test(c.textContent) && /colonist|no colony/.test(c.textContent); }));
  ok('"Change photo" and "Remove photo" are on the card', await ev(() => !!document.querySelector('#rooms .rcard [data-act="tcam"]') && !!document.querySelector('#rooms .rcard [data-act="tdel"]')));
  await p.setViewportSize({ width: 1180, height: 820 }); await p.screenshot({ path: OUT + '36-room-cards.png' });
  await p.reload(); await sleep(1800);
  ok('photos survive a reload (cards still there)', await ev(() => document.querySelectorAll('#rooms .rcard').length === 2));
  await p.setViewportSize({ width: 390, height: 844 }); await sleep(400);
  ok('phone width 390: no sideways scroll, cards fit', await ev(() => document.documentElement.scrollWidth <= 391 && [...document.querySelectorAll('#rooms .rcard')].every((c) => c.getBoundingClientRect().right <= 391 && c.getBoundingClientRect().height >= 120)));
  await p.screenshot({ path: OUT + '37-room-cards-phone.png' });
  await p.setViewportSize({ width: 1180, height: 820 }); await sleep(300);
  // tap the photo of the Kitchen: that room only
  await p.click('#rooms [data-id="' + idKit + '"] img.rph');
  for (let i = 0; i < 60; i++) { await sleep(500); if (await ev(() => __g.G.phase === 'play')) break; }
  await sleep(2500);
  const inRoom = await ev(() => ({ cur: __g.HOMES.cur, finding: __g.G.finding, want: __g.G.roomWant, phase: __g.G.phase, name: __g.G.mapName, th: !!document.querySelector('#card img.cth'), w: document.querySelector('#card img.cth') && document.querySelector('#card img.cth').getBoundingClientRect().width, hidden: document.getElementById('card').hidden }));
  ok('tapping the card photo enters that room, and only that room is searched', inRoom.cur === idKit && inRoom.finding === false && inRoom.name === 'Kitchen', JSON.stringify(inRoom));
  ok('the round thumbnail (about 44 px) shows in the top-left info card', inRoom.th && Math.abs(inRoom.w - 44) < 3 && !inRoom.hidden);
  await p.screenshot({ path: OUT + '38-in-room-thumb.png' });
  await p.click('#card img.cth'); await sleep(300); ok('tapping the thumbnail shows the room name', await ev(() => /Kitchen/.test(document.getElementById('toast').textContent)));
  // back to the title: remove a photo, delete a room
  await p.reload(); await sleep(1800);
  await p.click('#rooms [data-id="' + idShed + '"] [data-act="tdel"]'); await sleep(300);
  ok('Remove photo: card turns back into a plain row and the key is gone', await ev((id) => !localStorage.getItem('bc-totem-' + id) && !!document.querySelector('#rooms .lib[data-id="' + id + '"]') && document.querySelectorAll('#rooms .rcard').length === 1, idShed));
  const before = await ev((id) => (localStorage.getItem('bc-totem-' + id) || '').length, idKit);
  ok('the stored room size counts the photo', await ev(([id, n]) => __g.roomChars(id) >= n && n > 1000, [idKit, before]), 'photo chars ' + before);
  await p.click('#rooms [data-id="' + idKit + '"] [data-act="del"]'); await sleep(200); await p.click('#rooms [data-id="' + idKit + '"] [data-act="del"]'); await sleep(400);
  ok('deleting the room deletes its photo', await ev((id) => !localStorage.getItem('bc-totem-' + id) && !__g.HOMES.rooms.some((r) => r.id === id), idKit));
  ok('a map export does not include any photo', await ev(() => { __g.imgSave('totem', 'r1', { v: 1, jpeg: 'data:image/jpeg;base64,AAAA' }); const t = JSON.stringify(__g.mapToJSON()); __g.totemDel('r1'); return !/base64|totem/.test(t); }));
  const bad = reqs.filter((r) => r.method !== 'GET' || r.post || /base64|data:image|\.jpg|\.jpeg/i.test(r.url) || r.url.length > 600);
  ok('no network request carries image data (no POST, no body, no data URL in a URL)', bad.length === 0, reqs.length + ' requests seen' + (bad.length ? ' BAD ' + JSON.stringify(bad.slice(0, 2)).slice(0, 200) : ''));
  ok('0 page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
