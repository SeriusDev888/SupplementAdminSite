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
    await page.goto(base + '/editor.html#home');
    await page.locator('#studio').waitFor({ state: 'visible' });
    const f = page.frameLocator('#preview');
    await f.locator('h1').waitFor();
    const sectionIds = () =>
        f.locator('.reference-home > section').evaluateAll((es) => es.map((e) => e.dataset.veId)),
      initial = await sectionIds();
    const row = (id) =>
      page.locator('.layer-row').filter({ has: page.locator(`.layer-item[data-id="${id}"]`) });
    assert.equal(
      await page
        .locator('#position-x,#position-y,[data-tab="products"],[data-tab="brand"]')
        .count(),
      0,
    );
    assert.equal(await f.locator('[data-ve-drag]').count(), 0);
    assert.equal(
      await page.locator('.is-locked[draggable="true"],.is-locked [data-order]').count(),
      0,
    );
    await f.locator('.rh-hero h1').click();
    await page.locator('#text-value').fill('Heading stays with its section');
    await row(initial[0]).dragTo(row(initial[1]));
    await page.waitForFunction(
      () => Object.keys(EditorAPI.document().pages.home?.order || {}).length > 0,
    );
    await page.waitForTimeout(150);
    const swapped = [...initial];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    assert.deepEqual(await sectionIds(), swapped);
    assert.equal(await f.locator('.rh-hero h1').innerText(), 'Heading stays with its section');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(150);
    assert.deepEqual(await sectionIds(), initial);
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(150);
    assert.deepEqual(await sectionIds(), swapped);
    await row(initial[0]).dragTo(page.locator('.layer-row.is-locked').last());
    assert.deepEqual(await sectionIds(), swapped);
    const cards = () =>
      f.locator('.hp-grid > article').evaluateAll((es) => es.map((e) => e.dataset.veId));
    let cardIds = await cards();
    if (!cardIds.length)
      cardIds = await f.locator('.hp-card').evaluateAll((es) => es.map((e) => e.dataset.veId));
    await row(cardIds[0]).locator('[data-order="1"]').click();
    await page.waitForTimeout(150);
    assert.deepEqual(
      await f.locator('.hp-card').evaluateAll((es) => es.map((e) => e.dataset.veId)),
      [cardIds[1], cardIds[0], cardIds[2]],
    );
    await row(cardIds[0]).dragTo(row(initial[2]));
    assert.deepEqual(await sectionIds(), swapped);
    await page.locator('.management-launch [data-manager="products"]').click();
    assert.equal(await page.locator('.studio-body').isVisible(), false);
    await page.locator('#product-name').fill('DAILY MANAGED');
    await page.locator('#product-name').dispatchEvent('change');
    await page.locator('#product-pick').click();
    await page.locator('#management-panels .media-item[title="story-question.png"]').click();
    await page.locator('#product-name').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#product-image').inputValue(), '/assets/story-question.png');
    await page.waitForFunction(
      () =>
        document.querySelector('#product-preview').complete &&
        document.querySelector('#product-preview').naturalWidth > 0,
    );
    await page.screenshot({ path: 'editor-management-screen.png' });
    await page.locator('#manager-back').click();
    assert.equal(await page.locator('.studio-body').isVisible(), true);
    assert.equal(new URL(page.url()).hash, '#home');
    await f.locator('.hp-card h3').filter({ hasText: 'DAILY MANAGED' }).waitFor();
    assert.deepEqual(await sectionIds(), swapped);
    await page.locator('.management-launch [data-manager="brand"]').click();
    await page.locator('#brand-name').fill('SORA');
    await page.locator('#brand-name').dispatchEvent('change');
    await page.locator('#manager-back').click();
    await f.locator('.header .cms-brand-name').filter({ hasText: 'SORA' }).waitFor();
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const saved = (await getDraft()).document;
    await page.reload();
    await f.locator('.rh-hero h1').filter({ hasText: 'Heading stays with its section' }).waitFor();
    assert.deepEqual(await sectionIds(), swapped);
    assert.equal(
      await page
        .locator('.layer-row.is-locked')
        .first()
        .innerText()
        .then((v) => v.includes('ส่วนหัว')),
      true,
    );
    await page.screenshot({ path: 'editor-section-order.png' });
    const live = await context.newPage();
    await live.route('**/api/content', (r) =>
      r.fulfill({ json: { document: saved, revision: 1 } }),
    );
    await live.goto('http://127.0.0.1:4319' + '/#home');
    await live
      .locator('.rh-hero h1')
      .filter({ hasText: 'Heading stays with its section' })
      .waitFor();
    assert.deepEqual(
      await live
        .locator('.reference-home > section')
        .evaluateAll((es) => es.map((e) => e.dataset.veId)),
      swapped,
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS: section drag swap, keyboard-accessible buttons, locked header/footer, nested boundaries, stable edits, undo/redo, save/reload/public order, separate managers and image library, no free dragging',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
