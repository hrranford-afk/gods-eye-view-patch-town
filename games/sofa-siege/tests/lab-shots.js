/* Round Table Kingdom Lab: the screenshots of the Workshop, the Castle, the Tether marble, the carnage counter, Rate it, and the Building Yard.
   Run: NODE_PATH=$(npm root -g) node tests/lab-shots.js   (writes shots/lab-6 to lab-16, arsenal-1 to arsenal-8 and defence-1 to defence-8; name some scenes to make only those). The scenes are SG.labShot in game.js.
   With --frames it makes no pictures and prints the frame time of the page as drawn, for the Castle, a Building Yard of 3 (and the market row) and the Arsenal's camp with every counter: software GL in a headless browser, so only the ratio means anything. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const FRAMES = process.argv.indexOf('--frames') >= 0;
const ARGS = process.argv.slice(2).filter((a) => a[0] !== '-');
const NAMES = ARGS.length ? ARGS : ['lab-6-workshop', 'lab-7-castle', 'lab-8-tether', 'lab-9-carnage', 'lab-10-rate-it', 'lab-11-yard', 'lab-12-cottage-trim', 'lab-13-barn-side', 'lab-14-windmill-sails', 'lab-15-market-chain', 'lab-16-bridge-supports', 'arsenal-1-lobber', 'arsenal-2-flinger', 'arsenal-3-roller', 'arsenal-4-popper', 'arsenal-5-hook', 'arsenal-6-thumper', 'arsenal-7-fan-and-heavy', 'arsenal-8-shield-and-ditch', 'defence-1-courtyard', 'defence-2-popgun', 'defence-3-counter', 'defence-4-traps', 'defence-5-upkeep', 'defence-6-rooms', 'defence-7-warden', 'defence-8-report'];
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  if (FRAMES) {
    for (const tg of ['castle', 'yard', 'market', 'castle', 'yard', 'ars_all', 'castle', 'ars_all']) {
      const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?lab=1'); await p.waitForFunction('window.__done', null, { timeout: 60000 });
      await p.evaluate((t) => { SG.lab.card = false; SG.lab.panel = false; SG.labLoadTarget(t); SG.setCam(3); SG.labTool('fire'); SG.labFrameReset(); }, tg);
      await p.waitForTimeout(8000); console.log(tg, JSON.stringify(await p.evaluate(() => SG.labFrameStats()))); await p.close();
    }
    await b.close(); return;
  }
  for (const name of NAMES) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    if (name === 'lab-7-castle') { /* the real loop, so that the readout shows the frame time of the page as it is drawn */
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?lab=1'); await p.waitForFunction('window.__done', null, { timeout: 60000 });
      await p.evaluate(() => { SG.lab.card = false; SG.lab.panel = false; SG.labLoadTarget('castle'); SG.setCam(3); SG.labTool('fire'); SG.labFrameReset(); });
      await p.waitForTimeout(6000); console.log('Castle frame time', JSON.stringify(await p.evaluate(() => SG.labFrameStats())));
    } else {
      await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?shot=' + name); await p.waitForFunction('window.__done', null, { timeout: 60000 });
      await p.waitForTimeout(1500);
    }
    await p.screenshot({ path: path.resolve(__dirname, '..', 'shots', name + '.png') });
    console.log(name, errs.length ? 'ERRORS ' + errs.join(' | ') : 'ok'); await p.close();
  }
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(2); });
