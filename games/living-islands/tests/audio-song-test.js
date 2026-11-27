/* ISLAND SONG TEST for audio_song.js and audio_song_proto.html (node + headless Chromium; needs playwright).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/audio-song-test.js   (CHROME=/path/to/chrome to override)
   Cannot listen: checks determinism, scale membership, caps, finite and non-clipping output, different seeds differ. */
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = createRequire((process.env.NODE_PATH || '/opt/node22/lib/node_modules') + '/')('playwright'); }
const LI = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? passes++ : fails++; };
const exe = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
async function open(url) {
  const page = await browser.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url); return { page, errs };
}
/* 1. before the gesture, on the demo page */
{
  const { page, errs } = await open('file://' + LI + '/audio_song_proto.html');
  const r = await page.evaluate(() => {
    const S = LI_SONG; let threw = null, res = [];
    try { res = [S.setIsland('x').mood, S.setTide(2), S.setStorm(-1), S.setWeekBeat('lowtide'), S.setWeekBeat('nonsense'), S.lighthouse(), S.robotBeat('a', 'hauler', 0.5), S.cue('winch'), S.cue('nope'), S.stats().running, S.voices(), S.dump(5).length]; S.stop(); } catch (e) { threw = e.message; }
    return { threw, res };
  });
  ok(r.threw === null, 'before the gesture: every call is safe (no throw)');
  ok(r.res[1] === 1 && r.res[2] === 0 && r.res[4] === false && r.res[5] === false && r.res[7] === false && r.res[9] === false && r.res[10] === 0, 'before the gesture: values clamp, notes refused, not running: ' + JSON.stringify(r.res.slice(1, 11)));
  /* 2. live */
  await page.click('#start'); await page.waitForTimeout(900);
  const L = await page.evaluate(async () => {
    const S = LI_SONG; let max = 0, used = 0;
    for (let i = 0; i < 200; i++) { S.cue(['winch', 'key', 'gull', 'thunder', 'delivery'][i % 5]); S.lighthouse(); S.robotBeat('r' + (i % 9), 'hauler', 0.5); max = Math.max(max, S.voices()); used = Math.max(used, S.stats().used); }
    await new Promise(r => setTimeout(r, 1500)); const st = S.stats();
    return { running: S.isRunning(), max, used, st, notes: st.notes, log: S.dump(100).length };
  });
  ok(L.running, 'after the Start click the song is running (' + L.st.mood + ', root ' + L.st.root + ')');
  ok(L.max <= 8 && L.used <= 0.6 + 1e-9 && L.st.refused > 0, 'live spam of 600 calls: peak voices ' + L.max + ' <= 8, loudness budget used ' + L.used.toFixed(2) + ' <= 0.6, refused ' + L.st.refused);
  ok(L.log <= 30, 'dump(100) is limited to the log kept (' + L.log + ' lines)');
  ok(errs.filter(e => !/GL Driver|GPU stall/.test(e)).length === 0, 'demo page: 0 console errors' + (errs.length ? ' ' + errs.join('|') : ''));
  /* 3..6 offline song runs */
  const off = await page.evaluate(async () => {
    const SIM = async (seed, extra) => {
      const c = new OfflineAudioContext(1, 48000 * 60, 48000), g = c.createGain(); g.gain.value = 0.5; g.connect(c.destination);
      const s = LI_SONG.create(c, g, { seed }); s.sim(0); s.start(); s.robotBeat('h1', 'hauler', 1); s.robotBeat('s1', 'sorter', 0.5); s.robotBeat('k1', 'stacker', 0.2);
      let maxV = 0, maxU = 0, dark = false;
      for (let i = 0; i <= 1200; i++) {
        const t = i * 0.05; s.sim(t);
        if (i === 100 || i === 500 || i === 900) s.lighthouse(); if (i === 200) s.cue('winch'); if (i === 300) s.cue('key'); if (i === 400) s.setWeekBeat('lowtide'); if (i === 800) s.setWeekBeat('lighthouse');
        if (i % 40 === 0) s.cue('gull'); if (extra && i % 3 === 0) { s.cue('key'); s.cue('winch'); s.lighthouse(); }
        s.setTide(0.5 + 0.5 * Math.sin(t / 7)); s.setStorm(i > 700 && i < 1000 ? 0.9 : 0.1); if (i === 800) dark = s.stats().dark;
        maxV = Math.max(maxV, s.voices()); maxU = Math.max(maxU, s.stats().used);
      }
      const d = (await c.startRendering()).getChannelData(0); let pk = 0, sq = 0, nan = 0;
      for (let i = 0; i < d.length; i++) { const x = d[i]; if (x !== x || !isFinite(x)) nan++; else { const a = Math.abs(x); if (a > pk) pk = a; sq += x * x; } }
      const notes = s.notes(); return { seed, pk, rms: Math.sqrt(sq / d.length), nan, maxV, maxU, dark, scale: s.scalePcs(), root: s.root(), mood: s.stats().mood, bpm: s.stats().bpm, notes, log: JSON.stringify(notes), n: s.stats().notes };
    };
    const a1 = await SIM('isle-a'), a2 = await SIM('isle-a'), b = await SIM('isle-b'), c = await SIM(42), spam = await SIM('isle-a', true);
    return [a1, a2, b, c, spam].map(r => Object.assign({}, r, { pcs: [...new Set(r.notes.map(n => ((n.midi - r.root) % 12 + 12) % 12))].sort((x, y) => x - y), midis: [...new Set(r.notes.map(n => n.midi))].sort((x, y) => x - y) }));
  });
  const [a1, a2, b, c, spam] = off;
  ok(a1.n > 20 && a1.log === a2.log, 'same seed and same event stream give the identical note sequence (' + a1.n + ' notes, ' + a1.notes.length + ' logged)');
  ok(off.every(r => r.pcs.every(p => r.scale.includes(p)) && r.pcs.length > 0), 'every note is inside the island scale: ' + off.slice(0, 4).map(r => r.mood + ' [' + r.scale + '] used pcs [' + r.pcs + ']').join('; '));
  ok(a1.dark === true, 'storm 0.9 switches to the dark mode');
  ok(spam.maxV <= 8 && spam.maxU <= 0.6 + 1e-9, 'offline spam: peak voices ' + spam.maxV + ' <= 8, budget used ' + spam.maxU.toFixed(2) + ' <= 0.6');
  for (const r of [a1, b, c, spam]) ok(r.nan === 0 && r.pk < 0.9 && r.rms > 1e-3, 'render 60 s seed ' + r.seed + ': peak ' + r.pk.toFixed(3) + ' rms ' + r.rms.toFixed(4) + ' nan ' + r.nan + (r === spam ? ' (spam stream)' : ''));
  const key = r => r.root + '|' + r.scale + '|' + r.midis;
  ok(key(a1) !== key(b) && key(a1) !== key(c) && key(b) !== key(c), 'three seeds give three different note sets: ' + [a1, b, c].map(r => r.mood + ' root ' + r.root + ' ' + r.bpm + 'bpm').join(' / '));
  await page.close();
}
await browser.close();
console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
