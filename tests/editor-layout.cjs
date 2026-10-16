const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const b = await chromium.launch({
      ...require('./browser-runtime.cjs').launchOptions,
    }),
    page = await b.newPage({
      viewport: { width: 1920, height: 1080 },
      storageState: await require('./browser-runtime.cjs').loginState(),
    });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4320/editor.html#home');
  await page.locator('#studio').waitFor({ state: 'visible' });
  const f = page.frameLocator('#preview');
  await f.locator('h1').waitFor();
  await page.locator('[data-width="2560"]').click();
  await page.waitForTimeout(700);
  assert.equal(await f.locator('body').evaluate(() => innerWidth), 2560);
  await page.locator('[data-width="full"]').click();
  await f.locator('.header nav a[href="#story"]').click();
  await page.locator('#text-value').fill('Brand story');
  await page.selectOption('#page-select', 'story');
  await f.locator('.header nav a[href="#story"]').filter({ hasText: 'Brand story' }).waitFor();
  await f.locator('h1').waitFor();
  await page.selectOption('#page-select', 'catalog');
  await f.locator('.product-card h3').first().click();
  await page.locator('#text-value').fill('My DAILY title');
  await page.locator('#interactive').check();
  await f.locator('[data-filter="beauty"]').click();
  await f.locator('.product-card h3').filter({ hasText: 'CHASHITSU GLOW' }).waitFor();
  await f.locator('[data-filter="all"]').click();
  await f.locator('.product-card h3').filter({ hasText: 'My DAILY title' }).waitFor();
  await page.locator('#interactive').uncheck();
  await page.selectOption('#page-select', 'ingredients');
  await f.locator('h1').waitFor();
  await f.locator('.ig4-art-collagen').click({ position: { x: 40, y: 40 } });
  await page.locator('#pick-image').click();
  await page.locator('.media-item[title="collagen-powder-v3.png"]').click();
  await page.waitForTimeout(200);
  assert.match(
    await f.locator('.ig4-art-collagen').evaluate((e) => getComputedStyle(e).backgroundImage),
    /collagen-powder-v3/,
  );
  await page.locator('#pick-image').click();
  await page.screenshot({ path: 'editor-media.png' });
  assert.ok(
    (await page
      .locator('.media-item img')
      .first()
      .evaluate((e) => e.getBoundingClientRect().width)) < 200,
  );
  assert.deepEqual(errors, []);
  console.log('PASS: 2K, global navigation, catalog filter identity and image replacement');
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
