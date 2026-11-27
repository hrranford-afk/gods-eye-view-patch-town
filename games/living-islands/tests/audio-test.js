/* AUDIO TEST for audio.js and audio_proto.html (node + headless Chromium; needs playwright).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/audio-test.js   (CHROME=/path/to/chrome to override)
   Cannot listen: checks only that sound exists, is finite, is not clipping, voices are capped, parameters clamp. */
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = createRequire((process.env.NODE_PATH || '/opt/node22/lib/node_modules') + '/')('playwright'); }
const HERE = dirname(fileURLToPath(import.meta.url)), LI = resolve(HERE, '..');
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? passes++ : fails++; };
const exe = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
async function open(url) {
  const page = await browser.newPage(), errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url); return { page, errs };
}
/* 1. API before the gesture */
{
  const { page, errs } = await open('file://' + LI + '/audio_proto.html');
  const r = await page.evaluate(() => {
    const A = window.LI_AUDIO, names = ['init', 'unlock', 'isRunning', 'setSeaEnergy', 'setWind', 'setRain', 'setNight', 'robotWork', 'robotStop', 'playEvent', 'setMasterVolume', 'setEffectsVolume', 'setMusicVolume', 'mute', 'isMuted', 'voices', 'stats', 'renderOffline'];
    const missing = names.filter(n => typeof A[n] !== 'function'); let threw = null, played;
    try { A.setSeaEnergy(0.5); A.setWind(2); A.setRain(-1); A.setNight(NaN); A.robotWork('a', 'hauler', 'work', 0.5); played = A.playEvent('key'); A.setMasterVolume(0.5); A.mute(false); A.robotStop('a'); } catch (e) { threw = e.message; }
    return { missing, threw, played, running: A.isRunning(), voices: A.voices(), btn: getComputedStyle(document.getElementById('start')).display };
  });
  ok(r.missing.length === 0, 'API has all ' + 18 + ' functions' + (r.missing.length ? ' missing ' + r.missing : ''));
  ok(r.threw === null && r.played === false && !r.running && r.voices === 0, 'before the gesture: no throw, playEvent false, not running, 0 voices');
  ok(r.btn !== 'none', 'Start audio button visible before the gesture');
  /* 2. gesture */
  await page.click('#start'); await page.waitForTimeout(400);
  const g = await page.evaluate(() => ({ run: LI_AUDIO.isRunning(), st: LI_AUDIO.stats(), btn: getComputedStyle(document.getElementById('start')).display }));
  ok(g.run && g.st.state === 'running', 'after click: context running (' + g.st.state + ', ' + g.st.sampleRate + ' Hz)');
  await page.waitForTimeout(600); ok(await page.evaluate(() => getComputedStyle(document.getElementById('start')).display) === 'none', 'Start button hides once running');
  /* 3. voice limits */
  const v = await page.evaluate(async () => {
    const A = LI_AUDIO, names = A.events(); let max = 0, acc = 0;
    for (let i = 0; i < 200; i++) { if (A.playEvent(names[i % names.length], { duration: 4, ground: 'sand' })) acc++; max = Math.max(max, A.voices()); }
    const cap = A.stats().cap; for (let i = 0; i < 20; i++) A.robotWork('r' + i, 'hauler', 'work', 1);
    await new Promise(r => setTimeout(r, 700)); max = Math.max(max, A.voices());
    return { max, cap, acc, robots: A.stats().robots };
  });
  ok(v.max <= v.cap && v.max > 0, '200 events spammed: peak voices ' + v.max + ' <= cap ' + v.cap + ' (' + v.acc + ' accepted)');
  ok(v.robots <= 6, 'robot count capped: ' + v.robots + ' of 20 requested');
  /* 4. clamps */
  const c = await page.evaluate(() => { const A = LI_AUDIO; A.setSeaEnergy(0.4); return [A.setWind(5), A.setWind(-3), A.setRain('x'), A.setSeaEnergy(undefined), A.setMasterVolume(9), A.setMasterVolume(NaN), A.setEffectsVolume(-1), A.setMusicVolume(0.2), A.mute(1), A.isMuted(), A.mute(false)]; });
  ok(c[0] === 1 && c[1] === 0 && c[2] === 0 && c[3] === 0.4 && c[4] === 1 && c[5] === 1 && c[6] === 0 && c[7] === 0.2 && c[8] === true && c[9] === true && c[10] === false, 'parameters clamp to 0..1, NaN and junk ignored: ' + JSON.stringify(c));
  const bi = await page.evaluate(() => [1, 0.5, 0.2, 0.05].map(b => LI_AUDIO.robotInterval('hauler', b)));
  ok(bi[0] < bi[1] && bi[1] < bi[2] && bi[2] < bi[3], 'robot clicks space out as battery falls: ' + bi.map(x => x.toFixed(2)) + ' s');
  /* 5. offline render of every event */
  const rep = await page.evaluate(async () => {
    const A = LI_AUDIO, out = []; const cases = [['hauler', {}], ['hauler', { state: 'tired', wear: 1 }], ['hauler', { state: 'wet' }], ['hauler', { state: 'new' }], ['sorter', {}], ['stacker', {}], ['scrape', { ground: 'pebble' }], ['scrape', { ground: 'sand' }], ['crateThud', {}], ['plankFit', {}], ['holdLoop', {}], ['key', {}], ['uiTick', {}], ['horn', {}], ['winch', {}], ['boatCreak', {}], ['wake', {}], ['gull', {}], ['cricket', {}], ['thunder', { level: 1 }], ['stormRoar', { level: 1 }], ['rockHum', { pitch: 0 }], ['rockHum', { pitch: 1 }], ['chord', {}]];
    for (const [n, o] of cases) { const d = await A.renderOffline(n, o, 8, 48000); let pk = 0, s = 0, nan = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; if (x !== x || !isFinite(x)) nan++; else { const a = Math.abs(x); if (a > pk) pk = a; s += x * x; } } out.push({ n: n + (o.state ? ':' + o.state : '') + (o.ground ? ':' + o.ground : '') + (o.pitch != null ? ':' + o.pitch : ''), pk, rms: Math.sqrt(s / d.length), nan }); }
    return out;
  });
  for (const r of rep) ok(r.nan === 0 && r.pk < 1 && r.pk > 0.005 && r.rms > 2e-4, 'render ' + r.n + ': peak ' + r.pk.toFixed(3) + ' rms ' + r.rms.toFixed(4) + ' nan ' + r.nan);
  ok(errs.filter(e => !/GL Driver|GPU stall/.test(e)).length === 0, 'demo page: 0 console errors' + (errs.length ? ' ' + errs.join('|') : ''));
  await page.close();
}
/* 6. engine alone: touch gesture */
{
  const { page, errs } = await open('data:text/html,<body>hi</body>');
  await page.addScriptTag({ path: LI + '/audio.js' });
  const before = await page.evaluate(() => LI_AUDIO.isRunning());
  await page.touchscreen?.tap?.(5, 5).catch(() => { }); await page.mouse.click(5, 5); await page.waitForTimeout(400);
  const after = await page.evaluate(() => { LI_AUDIO.setRain(0.8); return LI_AUDIO.isRunning(); });
  ok(!before && after && errs.length === 0, 'bare page: first user gesture starts the context by itself, 0 errors');
  await page.close();
}
await browser.close();
console.log(passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
