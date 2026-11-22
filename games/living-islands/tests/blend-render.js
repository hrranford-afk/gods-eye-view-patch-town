/* Renders blend round 1 at 1200 x 900 with every clock frozen, so a shot is repeatable.
   Usage: NODE_PATH=$(npm root -g) node tests/blend-render.js [blend=A|B|C] [view=wide|zoom|both] [out=DIR] [name=blend-A] [qs=extra&query]
   Writes <out>/<name>-wide.png and <name>-zoom.png (default out: shots/). */
import path from 'node:path';
import fs from 'node:fs';
import { launch, open, ROOT } from './blend-lib.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const blend = arg('blend') || 'A', view = arg('view') || 'both', out = arg('out') || path.join(ROOT, 'shots'), name = arg('name') || ('blend-' + blend);
const L = await launch(1200, 900);
const { page, errs } = await open(L, '?ui=0&q=high&tide=0&freeze=3&blend=' + blend + (arg('qs') ? '&' + arg('qs') : ''));
await page.evaluate(() => { __li.setTide(0); __li.home(); });
const grab = async f => fs.writeFileSync(f, Buffer.from((await page.evaluate(() => __li.shot())).split(',')[1], 'base64'));
await page.waitForTimeout(800);
if (view !== 'zoom') await grab(path.join(out, name + '-wide.png'));
if (view !== 'wide') { await page.evaluate(() => __li.zoomLanding()); await page.waitForTimeout(800); await grab(path.join(out, name + '-zoom.png')); }
console.log('errors:', errs.length, errs.slice(0, 6).join('\n'));
console.log(JSON.stringify(await page.evaluate(() => ({ ...__li.stats(), hash: __li.hash(), kit: __li.kit(), layers: __li.layers() }))));
await L.close();
