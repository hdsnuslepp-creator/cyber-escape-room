const { chromium } = require('playwright');
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://localhost:3000/game.html', { waitUntil: 'load' });
  await sleep(page, 1500);
  await page.screenshot({ path: 'tmp-title.png' }); // PRESS ENTER screen
  await page.keyboard.down('Enter'); await sleep(page, 120); await page.keyboard.up('Enter');
  await sleep(page, 3500);
  await page.screenshot({ path: 'tmp-cinema.png' }); // mid cinematic (facility map etc.)
  await browser.close();
})();
