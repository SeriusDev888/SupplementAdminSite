const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const stickers = require('../src/shared/sticker-library.json');
(async () => {
  const browser = await chromium.launch(require('./browser-runtime.cjs').launchOptions);
  const base = 'http://127.0.0.1:4320';
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    storageState: await require('./browser-runtime.cjs').loginState(),
  });
  const draft = () => context.request.get(base + '/api/editor/draft').then((r) => r.json());
  const before = await draft();
  const put = async (document) => {
    const response = await context.request.put(base + '/api/editor/draft', {
      headers: { origin: base, 'x-editor-request': '1' },
      data: { document, revision: (await draft()).revision },
    });
    assert.equal(response.status(), 200);
  };
  const errors = [];
  try {
    await put({
      schema: 1,
      theme: {},
      global: { nodes: {} },
      pages: {
        catalog: { nodes: { main: { text: 'STALE PRODUCT OVERRIDE' } } },
        'product/daily': { nodes: { main: { text: 'STALE PRODUCT OVERRIDE' } } },
      },
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/editor.html#catalog');
    await page.locator('#studio').waitFor({ state: 'visible' });
    const frame = page.frameLocator('#preview');
    await page.locator('#product-page-lock').waitFor({ state: 'visible' });
    await frame.locator('.product-card').first().waitFor();
    assert.equal(await frame.locator('main [data-ve-id], main[data-ve-id]').count(), 0);
    await page.selectOption('#page-select', 'product/daily');
    await frame.locator('.pd-hero h1').waitFor();
    await frame.locator('.pd-hero h1').dblclick();
    assert.equal(await frame.locator('main [contenteditable]').count(), 0);
    assert.equal(await page.evaluate(() => EditorAPI.selection()), null);
    const state = await page.evaluate(() => JSON.stringify(EditorAPI.document()));
    await page.evaluate(() =>
      EditorAPI.patch({ text: 'Blocked edit' }, 'page', 'main', 'product/daily'),
    );
    assert.equal(await page.evaluate(() => JSON.stringify(EditorAPI.document())), state);
    await page.locator('#product-page-lock [data-manager="products"]').click();
    await page.locator('#product-name').fill('DAILY UPDATED');
    await page.locator('#product-name').dispatchEvent('change');
    await page.locator('#product-open').click();
    await frame.locator('.pd-hero h1').filter({ hasText: 'DAILY UPDATED' }).waitFor();
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    assert.equal((await draft()).document.catalog[0].name, 'DAILY UPDATED');
    await page.locator('.management-launch [data-manager="contact"]').click();
    assert.equal(await page.locator('#tab-contact').innerText(), '');
    assert.equal(
      await page.locator('#tab-contact textarea, #tab-contact h2, #tab-contact label').count(),
      0,
    );
    await page.screenshot({ path: 'editor-contact-blank.png' });
    await page.locator('#manager-back').click();
    await page.selectOption('#page-select', 'origins');
    await frame.locator('.or-benefits svg').first().click();
    await page.locator('#sticker-grid').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-sticker]').count(), 123);
    assert.equal(Object.keys(stickers).length, 100);
    assert.equal(new Set(Object.values(stickers).map((x) => x.path)).size, 100);
    await page.locator('[data-sticker="lucide-crown"]').click();
    await page.waitForFunction(() =>
      Object.values(EditorAPI.document().pages.origins.nodes).some(
        (n) => n.sticker === 'lucide-crown',
      ),
    );
    assert.equal(
      await frame.locator('.or-benefits svg path').first().getAttribute('d'),
      stickers['lucide-crown'].path,
    );
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const saved = (await draft()).document;
    assert.ok(Object.values(saved.pages.origins.nodes).some((n) => n.sticker === 'lucide-crown'));
    await page.reload();
    await page.locator('#studio').waitFor({ state: 'visible' });
    await frame.locator('.or-benefits svg').first().waitFor();
    await page.waitForFunction(
      (path) =>
        document
          .querySelector('#preview')
          .contentDocument.querySelector('.or-benefits svg path')
          ?.getAttribute('d') === path,
      stickers['lucide-crown'].path,
    );
    const live = await context.newPage();
    live.on('pageerror', (e) => errors.push(e.message));
    await live.route('**/api/content', (r) =>
      r.fulfill({ json: { document: saved, revision: 1 } }),
    );
    await live.goto('http://127.0.0.1:4319' + '/#partner');
    await live.locator('.partner-line-qr img').waitFor();
    assert.equal(await live.locator('.partner-types, .partner-type').count(), 0);
    assert.equal(
      await live.locator('.partner-line-qr').getAttribute('href'),
      'https://lin.ee/SVyOMJG',
    );
    await live.waitForFunction(
      () => document.querySelector('.partner-line-qr img').naturalWidth === 480,
    );
    for (const width of [1440, 390]) {
      await live.setViewportSize({ width, height: 1000 });
      assert.ok(await live.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await live.screenshot({ path: 'editor-partner-qr-' + width + '.png', fullPage: true });
    }
    await live.goto('http://127.0.0.1:4319' + '/#product/daily');
    await live.locator('.pd-hero h1').filter({ hasText: 'DAILY UPDATED' }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      'PASS: product pages locked with stale overrides ignored; manager saves; blank Contact; 100 new stickers save/reload; LINE QR and responsive partner page',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
