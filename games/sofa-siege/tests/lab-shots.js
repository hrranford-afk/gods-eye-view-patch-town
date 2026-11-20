/* Round Table Kingdom Lab: the screenshots of the Workshop, the Castle, the Tether marble, the carnage counter and Rate it.
   Run: NODE_PATH=$(npm root -g) node tests/lab-shots.js   (writes shots/lab-6 to lab-10). The scenes are SG.labShot in game.js. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const NAMES = process.argv.slice(2).length ? process.argv.slice(2) : ['lab-6-workshop', 'lab-7-castle', 'lab-8-tether', 'lab-9-carnage', 'lab-10-rate-it'];
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
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
