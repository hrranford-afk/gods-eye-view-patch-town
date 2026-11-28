/* GIFT SOUND, page test (headless chromium, software GL: not a device, and nobody can listen here).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/gift-sound-page-test.js [only=unlock,beds,events,song,smoke]
   Item 1: the default page loads no audio; a gift page shows the 'Sound on' chip, starts on a tap or a key, the Menu has the Sound panel (master, effects, music, mute), settings are remembered,
   sound is suspended while the tab is hidden, and a device with no audio makes no errors.
   Items 2 to 4 check the same page: beds follow the weather, events fire from real game state, the song is fed. Smoke: the gift page at 834x1062 touch, 1280x720 desktop and radeon with zero console errors. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1];
const want = k => !only || only.split(',').includes(k);
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h, o = {}) {
  const p = await ctx.newPage(); p.setDefaultTimeout(180000); await p.setViewportSize({ width: w || 834, height: h || 1062 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  if (!o.keep) await p.addInitScript(() => { try { if (!sessionStorage.getItem('gsk')) { localStorage.removeItem('li.gift.sound'); localStorage.removeItem('li.gift.day1'); sessionStorage.setItem('gsk', '1'); } } catch (e) { /* none */ } });
  if (o.noAudio) await p.addInitScript(() => { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
  await p.waitForTimeout(o.wait === undefined ? 1500 : o.wait); return { p, errs };
}
const GIFT = '?game=gift&glide=0&device=ipad';

if (want('unlock')) {
  /* the default page: no audio at all */
  { const { p, errs } = await open('?ui=0', 1200, 800);
    const r = await p.evaluate(() => ({ audio: typeof window.LI_AUDIO, song: typeof window.LI_SONG, gs: typeof window.LI_GSOUND, scripts: [...document.scripts].map(s => s.src).filter(s => /audio|gift_sound/.test(s)).length }));
    ok(r.audio === 'undefined' && r.song === 'undefined' && r.gs === 'undefined' && r.scripts === 0, 'default page: no audio.js, no audio_song.js, no gift_sound.js (' + JSON.stringify(r) + ')');
    ok(errs.length === 0, 'default page: zero console errors' + (errs.length ? ': ' + errs[0] : '')); await p.close(); }
  /* a gift page: chip, tap starts */
  { const { p, errs } = await open(GIFT);
    const r = await p.evaluate(() => { const c = document.getElementById('gs-chip'), b = c && c.getBoundingClientRect(); return { has: !!c, shown: !!c && getComputedStyle(c).display !== 'none', h: b ? b.height : 0, text: c ? c.textContent.trim() : '', run: LI_AUDIO.isRunning(), song: typeof LI_SONG }; });
    ok(r.has && r.shown && /Sound on/.test(r.text) && r.song === 'object', 'gift page: the "Sound on" chip shows before any tap and both audio modules are loaded (' + r.text + ')');
    ok(r.h >= 48, 'the chip is a touch target (' + Math.round(r.h) + ' px high)');
    ok(!r.run, 'nothing is running before the first tap');
    await p.click('#gs-chip'); await p.waitForTimeout(1200);
    const g = await p.evaluate(() => ({ run: LI_AUDIO.isRunning(), chip: getComputedStyle(document.getElementById('gs-chip')).display, st: LI_AUDIO.stats(), ls: localStorage.getItem('li.gift.sound') }));
    ok(g.run && g.st.state === 'running', 'a tap on the chip starts the audio context (' + g.st.state + ')');
    ok(g.chip === 'none', 'the chip goes away once the sound runs');
    ok(Math.abs(g.st.music - 0.35) < 0.01, 'music defaults to 0.35 (' + g.st.music + ')');
    ok(!!g.ls && JSON.parse(g.ls).on === true, 'the choice is remembered in localStorage');
    /* the Sound panel in the Menu */
    await p.click('#gd-menu-btn'); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const pn = document.querySelector('#gd-menu #gs-panel'); return pn ? { sliders: pn.querySelectorAll('input[type=range]').length, mute: !!pn.querySelector('.gs-mute'), labels: [...pn.querySelectorAll('label')].map(l => l.textContent.trim()) } : null; });
    ok(!!m && m.sliders === 3 && m.mute && m.labels.join() === 'Master,Effects,Music', 'the Menu holds a Sound panel: Master, Effects, Music sliders and a mute toggle');
    await p.evaluate(() => { const i = document.querySelectorAll('#gs-panel input[type=range]'); i[0].value = 40; i[0].dispatchEvent(new Event('input')); i[1].value = 80; i[1].dispatchEvent(new Event('input')); i[2].value = 50; i[2].dispatchEvent(new Event('input')); i[2].dispatchEvent(new Event('change')); });
    const v = await p.evaluate(() => LI_AUDIO.stats());
    ok(Math.abs(v.master - 0.4) < 0.01 && Math.abs(v.fx - 0.8) < 0.01 && Math.abs(v.music - 0.5) < 0.01, 'the three sliders drive master, effects and music (' + v.master + ', ' + v.fx + ', ' + v.music + ')');
    await p.click('#gs-panel .gs-mute'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => LI_AUDIO.isMuted()), 'the mute toggle mutes');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('li.gift.sound')).mute === true), 'mute is remembered');
    await p.click('#gs-panel .gs-mute'); await p.waitForTimeout(200);
    /* hidden tab */
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(500); const hs = await p.evaluate(() => LI_AUDIO.stats().state);
    ok(hs === 'suspended', 'the tab hidden: the audio context is suspended (' + hs + ')');
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(500); ok(await p.evaluate(() => LI_AUDIO.stats().state) === 'running', 'the tab visible again: running again');
    ok(errs.length === 0, 'zero console errors on the unlock path' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : '')); await p.close(); }
}
if (want('unlock') || want('remember')) {
  /* a key starts it too, and the saved settings come back */
  { const { p, errs } = await open(GIFT, 834, 1062, { keep: false });
    await p.evaluate(() => localStorage.setItem('li.gift.sound', JSON.stringify({ master: 0.55, fx: 0.9, music: 0.2, mute: false, on: true })));
    await p.reload(); await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForTimeout(1000);
    const s0 = await p.evaluate(() => ({ run: LI_AUDIO.isRunning(), st: LI_AUDIO.stats() }));
    ok(!s0.run && Math.abs(s0.st.master - 0.55) < 0.01 && Math.abs(s0.st.music - 0.2) < 0.01, 'remembered settings come back after a reload, and the sound still waits for a tap (run ' + s0.run + ', master ' + s0.st.master + ', music ' + s0.st.music + ')');
    await p.keyboard.press('Space'); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => LI_AUDIO.isRunning()), 'the first key press starts the sound'); await p.close(); }
}
if (want('unlock') || want('noaudio')) {
  /* no audio on the device */
  { const { p, errs } = await open(GIFT, 834, 1062, { noAudio: true });
    const r = await p.evaluate(() => ({ chip: !!document.getElementById('gs-chip') && getComputedStyle(document.getElementById('gs-chip')).display !== 'none', panel: !!document.getElementById('gs-panel') }));
    await p.click('#gd-menu-btn'); await p.waitForTimeout(400);
    const t = await p.evaluate(() => { const s = document.querySelector('#gs-panel .gs-state'); return s ? s.textContent : null; });
    ok(!r.chip, 'no AudioContext: the chip stays hidden'); ok(errs.length === 0, 'no AudioContext: zero console errors' + (errs.length ? ': ' + errs[0] : '')); await p.close(); }
}

/* a spy on the real audio and song modules: every call the game makes is recorded (the sound still plays) */
const SPY = () => { window.__ev = []; window.__sg = []; const A = LI_AUDIO, o = A.playEvent.bind(A), rw = A.robotWork.bind(A);
  A.playEvent = (n, x) => { window.__ev.push(n + (x && x.pitch !== undefined ? ':' + x.pitch.toFixed(2) : '') + (x && x.ground ? '@' + x.ground : '')); return o(n, x); }; A.robotWork = (...a) => { window.__ev.push('robotWork:' + a[1] + ':' + a[2]); return rw(...a); };
  ['cue', 'lighthouse', 'robotBeat', 'setStorm', 'setIsland', 'setWeekBeat', 'setTide'].forEach(k => { const f = LI_SONG[k]; LI_SONG[k] = (...a) => { window.__sg.push(k + (k === 'cue' || k === 'setWeekBeat' ? ':' + a[0] : '')); return f(...a); }; }); };
const evCount = (p, name) => p.evaluate(nm => window.__ev.filter(e => e.split(/[:@]/)[0] === nm).length, name);
const waitEv = (p, name, to) => p.waitForFunction(nm => window.__ev.some(e => e.split(/[:@]/)[0] === nm), name, { timeout: to || 120000 }).then(() => true, () => false);
const params = p => p.evaluate(() => LI_AUDIO.stats().params);
async function unlockAndSpy(p) { await p.click('#gs-chip'); await p.waitForFunction(() => LI_AUDIO.isRunning(), null, { timeout: 60000 }); await p.evaluate(SPY); }

if (want('beds') || want('events') || want('song')) {
  const { p, errs } = await open(GIFT + '&weather=rain', 834, 1062); await unlockAndSpy(p); await p.waitForTimeout(3000);
  /* item 2: the beds follow the weather, the sky and the sea */
  const b = await params(p);
  ok(b.rain > 0.3 && b.wind > 0.05, 'beds: rain weather drives the rain and wind beds (rain ' + b.rain.toFixed(2) + ', wind ' + b.wind.toFixed(2) + ')');
  ok(b.sea > 0.05 && b.sea < 0.4, 'beds: the sea bed stays gentle in the arrival bay (' + b.sea.toFixed(2) + ')');
  const sea = await p.evaluate(() => ({ name: __li.sea.name(), s: __li.sea.s() })); ok(['squall', 'calm', 'after', 'fog'].includes(sea.name), 'beds: the wave sea is in a weather state the bed can read (' + sea.name + ' ' + sea.s.toFixed(2) + ')');
  await p.evaluate(() => __gift.setHour(23.5)); await p.waitForFunction(() => LI_AUDIO.stats().params.night > 0.5, null, { timeout: 120000 }).then(() => ok(true, 'beds: night falls on the sky clock and the night bed (lighthouse hum) rises'), () => ok(false, 'beds: night bed did not rise'));
  await p.evaluate(() => __gift.setHour(11)); await p.waitForFunction(() => LI_AUDIO.stats().params.night < 0.3, null, { timeout: 120000 }).then(() => ok(true, 'beds: and falls again by day'), () => ok(false, 'beds: night bed did not fall'));
  /* item 3: events from real game state */
  if (want('events')) {
    await p.evaluate(() => __gift.addStock('planks', 2)); ok(await waitEv(p, 'crateThud'), 'events: stock added to the yard plays the crate thud');
    await p.evaluate(() => { LI_PHYS.page.hold('test'); }); ok(await waitEv(p, 'holdLoop'), 'events: a held press plays the hold loop'); await p.evaluate(() => LI_PHYS.page.hold(null));
    const hn = await evCount(p, 'holdLoop'); await p.waitForTimeout(3500); ok((await evCount(p, 'holdLoop')) - hn <= 1, 'events: let go and the hold loop stops');
    const u0 = await evCount(p, 'uiTick'); await p.click('#gd-menu-btn'); await p.waitForTimeout(300); await p.click('#gd-menu-btn'); await p.waitForTimeout(300); ok((await evCount(p, 'uiTick')) - u0 >= 1, 'events: a tap on a button plays the UI tick');
    await p.evaluate(() => LI_PHYS.page.forceBuild('cottage', 1)); await p.waitForTimeout(800); await p.evaluate(() => LI_PHYS.page.forceBuild('cottage', 2)); await p.waitForTimeout(1500);
    ok((await evCount(p, 'plankFit')) >= 1, 'events: a build stage completes, the plank fits'); const w0 = await evCount(p, 'winch');
    await p.evaluate(() => LI_PHYS.page.forceBuild('cottage', 3)); ok(await waitEv(p, 'winch'), 'events: the frame stage (lifting) plays the winch two-note after the plank'); await p.evaluate(() => LI_PHYS.page.forceBuild(null));
    await p.evaluate(() => { __gift.letter1(); }); await p.waitForTimeout(500); await p.evaluate(() => __gift.clickBtn('Keep it')); ok(await waitEv(p, 'key'), 'events: lifting the lid and taking the brass key plays the key');
  }
  /* item 4: the song is fed from the game */
  if (want('song')) {
    const st = await p.evaluate(() => LI_SONG.stats()); ok(st.running && st.root >= 45 && st.root <= 52 && st.scale.length === 5, 'song: running with the island\'s scale and root (' + st.mood + ', root ' + st.root + ', ' + st.bpm + ' bpm)');
    const sg = await p.evaluate(() => window.__sg); ok(sg.includes('setWeekBeat:tender') || st.week === 'tender', 'song: day 1 is tender\'s day (week beat ' + st.week + ')');
    const tide = await p.evaluate(() => ({ s: LI_SONG.stats().tide, t: __li.tide ? 0 : 0 })); ok(tide.s >= 0 && tide.s <= 1, 'song: the tide level is fed (' + tide.s.toFixed(2) + ')');
    const pl = await p.evaluate(() => ({ music: LI_AUDIO.stats().music, vol: LI_AUDIO.stats().master })); ok(Math.abs(pl.music - 0.35) < 0.01, 'song: music slider at its 0.35 default');
    await p.evaluate(() => __gift.setHour(23.5)); const lh = await p.waitForFunction(() => window.__sg.includes('lighthouse'), null, { timeout: 180000 }).then(() => true, () => false); ok(lh, 'song: a lighthouse note at the sweep once night has fallen');
    await p.evaluate(() => LI_AUDIO.mute(true)); await p.evaluate(() => { document.querySelector('#gd-menu-btn') && 0; }); }
  ok(errs.length === 0, 'beds, events, song: zero console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : '')); await p.close();
}
if (want('storm')) {
  const { p, errs } = await open(GIFT + '&storm=1&stormsec=40&stormfast=2', 834, 1062); await unlockAndSpy(p);
  const hum = await waitEv(p, 'rockHum', 240000); ok(hum, 'storm: the rock hum comes before the storm');
  const roar = await waitEv(p, 'stormRoar', 400000); { const e0 = await p.evaluate(() => window.__ev.map(e => e.split(/[:@]/)[0])); ok(e0.indexOf('rockHum') >= 0 && e0.indexOf('rockHum') < e0.indexOf('stormRoar'), 'storm: the hum is heard before the roar'); } ok(roar, 'storm: then the roar');
  const th = await waitEv(p, 'thunder', 600000); ok(th, 'storm: then thunder');
  const ev = await p.evaluate(() => window.__ev), hp = ev.filter(e => e.startsWith('rockHum:')).map(e => parseFloat(e.split(':')[1]));
  ok(hp.length >= 1 && hp.every((v, i) => i === 0 || v >= hp[i - 1] - 1e-9), 'storm: the hum pitch only rises (' + hp.map(v => v.toFixed(2)).join(' ') + '; raw ' + ev.filter(e => e.startsWith('rockHum')).slice(0, 4).join(' ') + ')');
  const sg = await p.evaluate(() => ({ calls: window.__sg.filter(x => x === 'setStorm').length, cue: window.__sg.filter(x => x === 'cue:thunder').length, dark: LI_SONG.stats().storm }));
  ok(sg.calls >= 1 && sg.dark > 0.3, 'storm: the song is told (storm ' + sg.dark.toFixed(2) + ')'); await p.waitForFunction(() => LI_AUDIO.stats().params.rain > 0.1, null, { timeout: 60000 }).catch(() => 0); const pr = await params(p); ok(pr.rain > 0.1 && pr.wind > 0.1 && pr.sea > 0.2, 'storm: wind, rain and an opened sea (' + pr.wind.toFixed(2) + ', ' + pr.rain.toFixed(2) + ', ' + pr.sea.toFixed(2) + ')');
  ok(errs.length === 0, 'storm: zero console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : '')); await p.close();
}
if (want('robots')) {
  const { p, errs } = await open('?game=gift&glide=0&device=ipad&stage=yard', 834, 1062); await unlockAndSpy(p);
  await p.evaluate(() => { __gift.startRobot(0); __gift.giveOrder(0, 'planks'); });
  const rw = await p.waitForFunction(() => window.__ev.some(e => e.startsWith('robotWork:')), null, { timeout: 600000 }).then(() => true, () => false); ok(rw, 'robots: a working robot calls robotWork with a kind and a state');
  const ev = await p.evaluate(() => window.__ev.filter(e => e.startsWith('robotWork:')).slice(0, 3)); ok(ev.every(e => /^robotWork:(hauler|sorter|stacker):(work|tired|wet)$/.test(e)), 'robots: kinds map to hauler, sorter or stacker (' + ev.join(', ') + ')');
  const rb = await p.waitForFunction(() => window.__sg.includes('robotBeat'), null, { timeout: 60000 }).then(() => true, () => false); ok(rb, 'robots: and the song gets a robotBeat for it');
  ok(errs.length === 0, 'robots: zero console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : '')); await p.close();
}
if (want('smoke')) {
  for (const [name, qs, w, h] of [['ipad 834x1062 touch', GIFT, 834, 1062], ['desktop 1280x720', '?game=gift&glide=0&device=desktop', 1280, 720], ['radeon 1280x720', '?game=gift&glide=0&device=radeon', 1280, 720]]) {
    const { p, errs } = await open(qs, w, h); await p.click('#gs-chip'); await p.waitForFunction(() => LI_AUDIO.isRunning(), null, { timeout: 60000 }); await p.waitForTimeout(6000);
    const r = await p.evaluate(() => ({ st: LI_AUDIO.stats(), core: LI_GSOUND.core().stats(), song: LI_SONG.stats(), gerr: __gift.err() }));
    ok(r.st.state === 'running' && r.core.ticks > 3 && r.song.running && r.st.voices <= r.st.cap, name + ': running, ' + r.core.ticks + ' sound ticks, song running, ' + r.st.voices + ' of ' + r.st.cap + ' voices');
    ok(errs.length === 0 && r.gerr.length === 0, name + ': zero console errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : '') + (r.gerr.length ? ' gift errs ' + r.gerr[0] : '')); await p.close(); }
}
await browser.close();
console.log((fails ? 'FAIL' : 'PASS') + ' ' + (n - fails) + ' of ' + n);
process.exit(fails ? 1 : 0);
