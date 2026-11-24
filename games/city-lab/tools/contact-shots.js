/* City Lab: screenshots of the cottage contact sheet (shots/contact-1..4.png, 1200 wide, six cottages each).
   Run: NODE_PATH=$(npm root -g) node tools/contact-shots.js [page numbers, e.g. 1 3] */
'use strict';
const path = require('path');
const L = require('../tests/lib.js');
const OUT = path.join(__dirname, '..', 'shots');
(async () => {
  const { srv, base } = await L.serve(); const browser = await L.launch();
  const want = process.argv.slice(2).map(Number).filter(Boolean), pages = want.length ? want : [1, 2, 3, 4];
  for (const n of pages) {
    const page = await L.newPage(browser, { width: 1200, height: 900 });
    await page.goto(base + '/city-lab/contact.html?page=' + n);
    await page.waitForFunction(() => window.__done || window.__error, null, { timeout: 60000 });
    const err = await page.evaluate(() => window.__error); if (err) throw new Error(err);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'contact-' + n + '.png'), fullPage: true });
    console.log('contact-' + n, page.errs.length ? page.errs : 'no errors');
    await page.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
