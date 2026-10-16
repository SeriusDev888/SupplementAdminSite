const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
      ...require('./browser-runtime.cjs').launchOptions,
    }),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      storageState: await require('./browser-runtime.cjs').loginState(),
    }),
    base = 'http://127.0.0.1:4320',
    headers = { origin: base, 'x-editor-request': '1' };
  const draft = () => context.request.get(base + '/api/editor/draft').then((r) => r.json()),
    before = await draft(),
    put = async (document) => {
      const r = await context.request.put(base + '/api/editor/draft', {
        headers,
        data: { document, revision: (await draft()).revision },
      });
      assert.equal(r.status(), 200);
    };
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await put({ schema: 1, theme: {}, pages: {}, global: { nodes: {}, additions: [], order: {} } });
    const open = async () => {
      await page.goto(base + '/editor.html#home');
      await page.locator('#studio').waitFor({ state: 'visible' });
      await page.locator('.management-launch [data-manager="products"]').click();
    };
    const select = async (id) => page.locator('[data-catalog-product="' + id + '"]').click();
    const fill = async (id, value) => {
      await page.locator('#' + id).fill(value);
      await page.locator('#' + id).dispatchEvent('change');
    };
    const del = async () => {
      await page.locator('#product-delete').click();
      await page.locator('#product-delete-confirm').click();
    };
    await open();
    assert.equal(await page.locator('.product-catalog-card').count(), 3);
    assert.equal(await page.locator('#product-price').inputValue(), '฿1,267.82');
    assert.ok(await page.locator('#product-original-photo').isVisible());
    await page.screenshot({ path: 'editor-product-catalog.png', fullPage: true });
    await select('glow');
    assert.equal(await page.locator('#product-name').inputValue(), 'GLOW');
    await fill('product-price', '฿990');
    await select('daily');
    assert.equal(await page.locator('#product-price').inputValue(), '฿1,267.82');
    await select('glow');
    assert.equal(await page.locator('#product-price').inputValue(), '฿990');
    await page.locator('#product-add').click();
    const id = await page.evaluate(() => CMSAdmin.getProduct().id);
    await fill('product-name', 'TEST PRODUCT');
    await fill('product-description', 'Only this product');
    await fill('product-price', '฿450');
    assert.equal(await page.locator('.product-catalog-card').count(), 4);
    await page.locator('#product-delete').click();
    assert.match(await page.locator('#product-delete-dialog').innerText(), /TEST PRODUCT/);
    await page.locator('#product-delete-cancel').click();
    assert.equal(await page.locator('.product-catalog-card').count(), 4);
    await del();
    assert.equal(await page.locator('.product-catalog-card').count(), 3);
    await page.locator('#undo').click();
    assert.equal(await page.locator('.product-catalog-card').count(), 4);
    await select(id);
    assert.equal(await page.locator('#product-description').inputValue(), 'Only this product');
    await del();
    await select('daily');
    await del();
    assert.equal(await page.locator('.product-catalog-card').count(), 2);
    assert.equal(await page.locator('#page-select option[value="product/daily"]').count(), 0);
    await page.locator('#undo').click();
    assert.equal(await page.locator('.product-catalog-card').count(), 3);
    await page.locator('#redo').click();
    assert.equal(await page.locator('.product-catalog-card').count(), 2);
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const saved = (await draft()).document;
    assert.equal(saved.catalog.find((x) => x.id === 'daily').deleted, true);
    await open();
    assert.equal(await page.locator('.product-catalog-card').count(), 2);
    const live = await context.newPage();
    live.on('pageerror', (e) => errors.push(e.message));
    await live.route('**/api/content', (r) =>
      r.fulfill({ json: { document: saved, revision: 1 } }),
    );
    await live.goto('http://127.0.0.1:4319' + '/#product/daily');
    await live.locator('.pd-unavailable').waitFor();
    for (const route of ['home', 'catalog', 'origins', 'origins/1', 'wellness']) {
      await live.goto('http://127.0.0.1:4319' + '/#' + route);
      await live.waitForTimeout(250);
      assert.equal(await live.locator('a[href="#product/daily"]:visible').count(), 0);
      if (route === 'origins') assert.equal(await live.locator('.or-product').isVisible(), false);
    }
    await select('glow');
    await del();
    await del();
    assert.ok(await page.locator('#product-catalog-empty').isVisible());
    assert.equal(await page.locator('#product-core-fields').isVisible(), false);
    assert.equal(await page.locator('#product-detail-manager').isVisible(), false);
    await page.locator('#product-add').click();
    await fill('product-name', 'FIRST PRODUCT');
    assert.equal(await page.locator('.product-catalog-card').count(), 1);
    assert.equal(await page.locator('#product-name').inputValue(), 'FIRST PRODUCT');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: 'editor-product-catalog-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log(
      'PASS: product identity and prices, isolated edits, add/delete/cancel, undo/redo, save/reload, deleted routes and promotions, empty catalog and mobile',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
