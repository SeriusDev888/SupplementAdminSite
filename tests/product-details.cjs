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
    put = async (document) =>
      context.request.put(base + '/api/editor/draft', {
        headers,
        data: { document, revision: (await draft()).revision },
      });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await put({ schema: 1, theme: {}, pages: {}, global: { nodes: {}, additions: [], order: {} } });
    await page.goto(base + '/editor.html#ingredients');
    await page.locator('#studio').waitFor({ state: 'visible' });
    const f = page.frameLocator('#preview');
    await f.locator('h1').click();
    await page.waitForFunction(() => EditorAPI.selection()?.id);
    const selected = await page.evaluate(() => EditorAPI.selection().id);
    await page.locator('#toggle-element-visibility').click();
    await page.waitForFunction(() => EditorAPI.selection().patch.hidden === true);
    await page.locator('#hidden-elements-list button').waitFor({ state: 'attached' });
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const hidden = (await draft()).document;
    const live = await context.newPage();
    live.on('pageerror', (e) => errors.push(e.message));
    let doc = hidden;
    await live.route('**/api/content', (r) => r.fulfill({ json: { document: doc, revision: 1 } }));
    await live.goto('http://127.0.0.1:4319' + '/#ingredients');
    await live.waitForTimeout(200);
    assert.equal(await live.locator('h1').isVisible(), false);
    await page.reload();
    await page.locator('#studio').waitFor({ state: 'visible' });
    await page.locator('#hidden-elements-panel').evaluate((e) => (e.open = true));
    await page.locator('#hidden-elements-list button').click();
    await page.waitForFunction((id) => EditorAPI.selection()?.id === id, selected);
    await page.locator('#toggle-element-visibility').click();
    await page.waitForFunction(() => EditorAPI.selection().patch.hidden === false);
    await page.locator('.management-launch [data-manager="products"]').click();
    await page.locator('#product-price').fill('฿1,267.82');
    await page.locator('#product-price').dispatchEvent('change');
    await page
      .locator('#product-buyUrl')
      .count()
      .then(async (n) => {
        if (n) {
          await page.locator('#product-buyUrl').fill('https://example.test/order');
          await page.locator('#product-buyUrl').dispatchEvent('change');
        }
      });
    const section = async (text) => {
      const el = page
        .locator('.product-manager-section')
        .filter({ has: page.locator('summary', { hasText: text }) });
      await el.evaluate((e) => (e.open = true));
    };
    const fill = async (id, value) => {
      await page.locator('#' + id).fill(value);
      await page.locator('#' + id).dispatchEvent('change');
    };
    await section('ราคา สถานะ');
    await page.selectOption('#pd-edit-stockStatus', 'in_stock');
    await fill('pd-edit-rating', '4.8');
    await fill('pd-edit-reviewCount', '128');
    await section('รูปแกลเลอรี');
    await page.locator('[data-add-row="gallery"]').click();
    await fill('pd-gallery-0-url', '/assets/ingredients-oranges-v4.png');
    await fill('pd-gallery-0-alt', 'Gallery test');
    await section('ข้อความบริการ');
    await fill('pd-trust-0-title', 'Service test');
    await section('ข้อมูลสรุป');
    await fill('pd-summary-0-value', '1 capsule');
    await section('Overview');
    assert.equal(await page.locator('[id^="benefit-icon-"], [id^="benefit-text-"]').count(), 0);
    await fill('pd-edit-overview', 'Overview test <img onerror=alert(1)>');
    await fill('pd-edit-overviewBullets', 'First point\nSecond point');
    await section('Supplement Facts');
    await fill('pd-edit-servingSize', '1 capsule');
    await fill('pd-edit-servingsPerContainer', '30');
    await page.locator('[data-add-row="nutrition"]').click();
    await fill('pd-nutrition-0-name', 'Vitamin C');
    await fill('pd-nutrition-0-amount', '100 mg');
    await fill('pd-nutrition-0-dailyValue', '111%');
    await section('วิธีใช้');
    await fill('pd-information-0-body', 'Use exactly as labelled.');
    await section('Questions and answers');
    await fill('pd-faq-0-question', 'Test question?');
    await fill('pd-faq-0-answer', 'Test answer.');
    await section('Certifications');
    await page.locator('[data-add-row="certificates"]').click();
    await fill('pd-certificates-0-title', 'Product specification');
    await fill('pd-certificates-0-description', 'Uploaded test document');
    const chooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-pdf-upload="0"]').click();
    const chooser = await chooserPromise;
    const pdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
    );
    await chooser.setFiles({ name: 'ใบรับรอง.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.waitForFunction(() =>
      document.querySelector('#pd-certificates-0-url')?.value.startsWith('/media/'),
    );
    const url = await page.locator('#pd-certificates-0-url').inputValue(),
      download = await context.request.get(base + url);
    assert.equal(download.status(), 200);
    assert.match(download.headers()['content-type'], /application\/pdf/);
    assert.match(download.headers()['content-disposition'], /attachment/);
    assert.deepEqual(await download.body(), pdf);
    const invalid = await context.request.post(base + '/api/editor/documents', {
      headers: { ...headers, 'content-type': 'application/pdf' },
      data: Buffer.from('not a PDF'),
    });
    assert.equal(invalid.status(), 400);
    const unauthorized = await fetch(base + '/api/editor/documents', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/pdf' },
      body: pdf,
    });
    assert.equal(unauthorized.status, 401);
    const crossOrigin = await context.request.post(base + '/api/editor/documents', {
      headers: { ...headers, origin: 'https://other.test', 'content-type': 'application/pdf' },
      data: pdf,
    });
    assert.equal(crossOrigin.status(), 403);
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    doc = (await draft()).document;
    assert.equal(doc.catalog[0].details.certificates[0].url, url);
    assert.equal(doc.catalog[0].details.nutrition[0].amount, '100 mg');
    await page.reload();
    await page.locator('#studio').waitFor({ state: 'visible' });
    await page.locator('.management-launch [data-manager="products"]').click();
    await section('Supplement Facts');
    assert.equal(await page.locator('#pd-nutrition-0-amount').inputValue(), '100 mg');
    await live.goto('http://127.0.0.1:4319' + '/#product/daily');
    await live.reload();
    await live.locator('.pd-page').waitFor();
    assert.equal(await live.locator('.pd-benefits').count(), 0);
    await live.waitForTimeout(300);
    assert.equal(await live.locator('.pd-thumb').count(), 2);
    assert.equal(await live.locator('.pd-sample-note').count(), 0);
    assert.match(await live.locator('.pd-rating').innerText(), /128 reviews/);
    assert.equal(await live.locator('.pd-overview img').count(), 0);
    assert.equal(await live.locator('.pd-pdf-card a').getAttribute('href'), url);
    assert.match(await live.locator('.pd-facts').innerText(), /100 mg/);
    await live.locator('.pd-thumb').nth(1).click();
    assert.match(
      await live.locator('.pd-main-photo img').getAttribute('src'),
      /ingredients-oranges/,
    );
    assert.equal(await live.locator('.pd-quantity, #pd-quantity').count(), 0);
    assert.equal(await live.locator('.pd-pricing > span').count(), 0);
    await live.locator('[data-pd-order]').click();
    assert.match(await live.locator('#dialog-content').innerText(), /CHASHITSU DAILY/);
    await live.locator('#info-dialog').evaluate((e) => e.close());
    await live.locator('.pd-faq summary').first().click();
    assert.equal(await live.locator('.pd-faq details').first().getAttribute('open'), '');
    await live.locator('.pd-thumb').first().click();
    await live.evaluate(() => document.activeElement.blur());
    for (const width of [1440, 390, 2560]) {
      await live.setViewportSize({ width, height: 1000 });
      await live.evaluate(() => window.scrollTo(0, 0));
      await live.waitForTimeout(150);
      assert.ok(
        await live.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'No horizontal overflow at ' + width,
      );
      await live.screenshot({ path: 'product-details-' + width + '.png', fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log(
      'PASS: hide/recover persist, product manager data/save/reload, gallery, price/rating, facts/FAQ, PDF upload/download/rejection, quantity and responsive layout',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
