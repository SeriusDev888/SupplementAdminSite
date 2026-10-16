const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
      ...require('./browser-runtime.cjs').launchOptions,
    }),
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      storageState: await require('./browser-runtime.cjs').loginState(),
    }),
    base = 'http://127.0.0.1:4320',
    headers = { origin: base, 'x-editor-request': '1' };
  const getDraft = () => context.request.get(base + '/api/editor/draft').then((r) => r.json()),
    before = await getDraft();
  const put = async (document) =>
    context.request.put(base + '/api/editor/draft', {
      headers,
      data: { document, revision: (await getDraft()).revision },
    });
  await put({ schema: 1, theme: {}, pages: {}, global: { nodes: {}, additions: [], order: {} } });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(base + '/editor.html#origins');
    await page.locator('#studio').waitFor({ state: 'visible' });
    const f = page.frameLocator('#preview');
    await f.locator('.or-product').waitFor();
    assert.equal(
      await page
        .locator('[data-add],#delete-element,#duplicate,#hide-element,#animation,#theme-motion')
        .count(),
      0,
    );
    assert.equal(await f.locator('.or-map').isVisible(), false);
    const labels = await page.locator('.layer-item span').allTextContents();
    assert.equal(labels[0], 'ส่วนหัวเว็บไซต์');
    assert.equal(labels.at(-1), 'ส่วนท้ายเว็บไซต์');
    assert.equal(new Set(labels).size, labels.length);
    await f.locator('.or-product-art .v2-bottle').click();
    await page.waitForFunction(() => window.EditorAPI.selection()?.productId === 'daily');
    assert.ok((await page.locator('#image-label').textContent()).includes('สินค้า'));
    const background = await f
      .locator('.or-product')
      .evaluate((e) => getComputedStyle(e).backgroundImage);
    await page.locator('#image-value').fill('/assets/ingredients-gummies-v4.png');
    await page.locator('#image-value').dispatchEvent('change');
    await page.waitForTimeout(200);
    assert.match(
      await f
        .locator('.or-product-art .v2-bottle')
        .evaluate((e) => getComputedStyle(e, '::after').backgroundImage),
      /ingredients-gummies-v4/,
    );
    assert.equal(
      await f.locator('.or-product').evaluate((e) => getComputedStyle(e).backgroundImage),
      background,
    );
    await page.locator('.management-launch [data-manager="products"]').click();
    await page.locator('#product-name').fill('DAILY TEST');
    await page.locator('#product-name').dispatchEvent('change');
    await page.locator('#manager-back').click();
    await f.locator('.or-product h2').filter({ hasText: 'DAILY TEST' }).waitFor();
    await page.locator('.management-launch [data-manager="products"]').click();
    await page.locator('#product-add').click();
    await page.locator('#product-name').fill('NEW <sample>');
    await page.locator('#product-name').dispatchEvent('change');
    await page.locator('#product-title').fill('New product title');
    await page.locator('#product-title').dispatchEvent('change');
    await page.locator('#product-description').fill('Custom product description');
    await page.locator('#product-description').dispatchEvent('change');
    await page.locator('#product-price').fill('฿990');
    await page.locator('#product-price').dispatchEvent('change');
    await page.locator('#product-image').fill('/assets/ingredients-gummies-v4.png');
    await page.locator('#product-image').dispatchEvent('change');
    await page.locator('#product-open').click();
    await f.locator('.product-hero h1').filter({ hasText: 'NEW <sample>' }).waitFor();
    assert.equal(await f.locator('sample').count(), 0);
    await f.locator('.cms-price').filter({ hasText: '฿990' }).waitFor();
    await page.selectOption('#page-select', 'catalog');
    await f.locator('.product-card h3').filter({ hasText: 'NEW <sample>' }).waitFor();
    assert.equal(await f.locator('.product-card').count(), 4);
    await page.locator('.management-launch [data-manager="brand"]').click();
    await page.locator('#brand-name').fill('SORA');
    await page.locator('#brand-name').dispatchEvent('change');
    await page.locator('#brand-logo').fill('/assets/story-question.png');
    await page.locator('#brand-logo').dispatchEvent('change');
    await page.locator('#manager-back').click();
    await f.locator('.header .cms-brand-name').filter({ hasText: 'SORA' }).waitFor();
    assert.equal(await f.locator('.brand-symbol img').count(), 2);
    await page.selectOption('#page-select', 'origins');
    await f.locator('.or-benefits svg').first().click();
    await page.locator('#sticker-grid').waitFor({ state: 'visible' });
    await page.locator('[data-sticker="star"]').click();
    await page.waitForTimeout(150);
    assert.match(
      await f.locator('.or-benefits svg').first().locator('path').getAttribute('d'),
      /3 6 7 1/,
    );
    await f.locator('.or-hero h1').click();
    await page.locator('[data-tab="effects"]').click();
    await page.selectOption('#effect-type', 'none');
    await page.waitForTimeout(150);
    assert.equal(await f.locator('.or-hero .motion-atmosphere').isVisible(), false);
    await page.selectOption('#effect-type', 'leaves');
    await page.locator('#effect-density').fill('7');
    await page.locator('#effect-density').dispatchEvent('change');
    await page.waitForTimeout(150);
    assert.equal(await f.locator('.or-hero .motion-fleck').count(), 7);
    await page.selectOption('#effect-type', 'custom');
    await page.locator('#effect-upload').click();
    await page.locator('#file-input').setInputFiles({
      name: 'effect-' + Date.now() + '.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await page.waitForFunction(() =>
      document.querySelector('#effect-image').value.startsWith('/media/'),
    );
    assert.match(
      await f
        .locator('.or-hero .motion-fleck')
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundImage),
      /media/,
    );
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const saved = (await getDraft()).document;
    assert.equal(saved.catalog.length, 4);
    assert.equal(saved.brand.name, 'SORA');
    assert.ok(Object.values(saved.pages.origins.nodes).some((n) => n.sticker === 'star'));
    assert.ok(Object.values(saved.pages.origins.nodes).some((n) => n.effect?.type === 'custom'));
    await page.reload();
    await page.locator('#studio').waitFor({ state: 'visible' });
    await f.locator('.header .cms-brand-name').filter({ hasText: 'SORA' }).waitFor();
    assert.equal(await f.locator('.or-map').isVisible(), false);
    await page.locator('.management-launch [data-manager="products"]').click();
    await page.screenshot({ path: 'editor-cms-products.png' });
    // Published rendering consumes exactly the saved catalog and brand data.
    const live = await context.newPage();
    await live.route('**/api/content', (r) =>
      r.fulfill({ json: { document: saved, revision: 1 } }),
    );
    await live.goto('http://127.0.0.1:4319' + '/#catalog');
    await live.locator('.product-card h3').filter({ hasText: 'NEW <sample>' }).waitFor();
    assert.equal(await live.locator('.ve-selection-tools').count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: no general add/delete or animation controls; ordered structure; no Origins map; separate product imagery; add/edit products; safe text; logo/name; sticker presets; uploaded effects; persistent draft and public rendering',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
