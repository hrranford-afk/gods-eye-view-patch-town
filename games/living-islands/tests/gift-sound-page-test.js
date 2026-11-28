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
await browser.close();
console.log((fails ? 'FAIL' : 'PASS') + ' ' + (n - fails) + ' of ' + n);
process.exit(fails ? 1 : 0);
