const { chromium } = require('playwright');
const sleep = (p, ms) => p.waitForTimeout(ms);
const tap = async (p, key, ms = 130) => { await p.keyboard.down(key); await sleep(p, ms); await p.keyboard.up(key); };
const state = (p) => p.evaluate(() => ({
  cls: document.body.className,
  ui: getComputedStyle(document.getElementById('facility-ui')).display,
  canvasW: document.querySelector('#game-canvas-wrap canvas')?.clientWidth,
  active: window.__game ? window.__game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key) : 'no game',
}));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('http://localhost:3000/game.html', { waitUntil: 'load' });
  await sleep(page, 1200);
  await tap(page, 'Enter'); await sleep(page, 800); await tap(page, 'Enter'); await sleep(page, 2500);
  console.log('HUB:', JSON.stringify(await state(page)));

  // Enter phishing room directly, then complete it via the scene API
  await page.evaluate(() => window.__game.scene.start('PhishingScene'));
  await sleep(page, 1000);
  console.log('IN ROOM:', JSON.stringify(await state(page)));

  await page.evaluate(() => {
    const s = window.__game.scene.getScene('PhishingScene');
    if (s && s.submitPhishing) s.submitPhishing();
  });
  await sleep(page, 2500);
  console.log('BACK IN HUB:', JSON.stringify(await state(page)));
  await page.screenshot({ path: 'tmp-back.png' });
  await browser.close();
})();
