const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
    ...require('./browser-runtime.cjs').launchOptions,
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        storageState: await require('./browser-runtime.cjs').loginState(),
      }),
      page = await context.newPage(),
      base = 'http://127.0.0.1:4320',
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4319' + '/#product/daily');
    await page.locator('.pd-page').waitFor();
    assert.equal(await page.locator('.pd-sample-note').count(), 0);
    assert.match(await page.locator('.pd-pricing').innerText(), /฿1,267.82/);
    assert.match(await page.locator('.pd-rating').innerText(), /128 reviews/);
    assert.equal(await page.locator('.pd-summary>div').count(), 6);
    assert.equal(await page.locator('.pd-facts tbody tr').count(), 8);
    assert.equal(await page.locator('.pd-information-grid article').count(), 6);
    assert.equal(await page.locator('.pd-faq details').count(), 6);
    assert.equal(await page.locator('.pd-pdf-card').count(), 1);
    const href = await page.locator('.pd-pdf-card a').getAttribute('href');
    assert.equal(href, '/assets/daily-product-information-sample.pdf');
    const response = await context.request.get(base + href);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /pdf/);
    assert.ok((await response.body()).subarray(0, 5).toString() === '%PDF-');
    const admin = await context.newPage();
    await admin.goto(base + '/editor.html#product/daily');
    await admin.locator('#studio').waitFor({ state: 'visible' });
    await admin.locator('.management-launch [data-manager="products"]').click();
    assert.equal(await admin.locator('#pd-edit-sampleInfo').isChecked(), true);
    assert.equal(await admin.locator('#pd-summary-0-value').inputValue(), '1 capsule');
    assert.equal(
      await admin.locator('#pd-certificates-0-title').inputValue(),
      'Sample Product Information Sheet',
    );
    await page.screenshot({ path: 'product-sample-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'product-sample-mobile.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    console.log(
      'PASS: sample price, review count, facts, summary, FAQ, labelled PDF and manager defaults render on desktop and mobile',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
