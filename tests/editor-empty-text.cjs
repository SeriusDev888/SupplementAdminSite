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
    const f = page.frameLocator('#preview'),
      caption = f.locator('.or-script').first();
    await caption.click();
    await page.waitForFunction(() =>
      document.querySelector('#text-value').value.includes('From Nature'),
    );
    const original = await page.locator('#text-value').inputValue();
    assert.match(original, /From Nature/);
    await page.locator('#color').fill('#125533');
    await page.locator('#color').dispatchEvent('change');
    await page.locator('#text-value').fill('My custom caption');
    await page.locator('#text-value').fill('');
    await caption.locator('xpath=self::*[@data-ve-empty-text]').waitFor();
    assert.ok((await caption.evaluate((e) => e.getBoundingClientRect().height)) >= 30);
    assert.match(
      await caption.evaluate((e) => getComputedStyle(e, '::after').content),
      /ข้อความว่าง/,
    );
    assert.equal(await caption.textContent(), '');
    await page.locator('#empty-texts-list button').first().click();
    await page.locator('#restore-last-text').waitFor({ state: 'visible' });
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const saved = (await getDraft()).document;
    assert.ok(
      Object.values(saved.pages.origins.nodes).some(
        (n) => n.lastText === 'My custom caption' && n.text === '',
      ),
    );
    await page.reload();
    await page.locator('#empty-texts-list button').first().click();
    assert.equal(await page.locator('#text-value').inputValue(), '');
    await page.locator('#restore-last-text').click();
    await caption.filter({ hasText: 'My custom caption' }).waitFor();
    assert.equal(await f.locator('[data-ve-empty-text]').count(), 0);
    await page.locator('#text-value').fill('');
    await page.locator('#restore-original-text').click();
    await caption.filter({ hasText: 'From Nature' }).waitFor();
    assert.equal(await page.locator('#text-value').inputValue(), original);
    assert.equal(await caption.evaluate((e) => getComputedStyle(e).color), 'rgb(18, 85, 51)');
    await page.locator('#text-value').fill('');
    await page.locator('#interactive').check();
    await f.locator('body.ve-interactive').waitFor();
    assert.ok(
      !/ข้อความว่าง/.test(await caption.evaluate((e) => getComputedStyle(e, '::after').content)),
    );
    await page.locator('#interactive').uncheck();
    await f.locator('body.ve-editable').waitFor();
    await page.locator('#empty-texts-list button').first().click();
    await caption.dblclick();
    await caption.fill('Typed into recovered empty field');
    await page.locator('#save-state').click();
    await caption.filter({ hasText: 'Typed into recovered empty field' }).waitFor();
    // Already-empty drafts from older versions have an original-text fallback.
    const old = structuredClone(saved);
    Object.values(old.pages.origins.nodes).forEach((n) => delete n.lastText);
    await put(old);
    await page.reload();
    await page.locator('#empty-texts-list button').first().click();
    assert.equal(await page.locator('#restore-last-text').isVisible(), false);
    await page.screenshot({ path: 'editor-empty-caption.png' });
    await page.locator('#restore-original-text').click();
    await caption.filter({ hasText: 'From Nature' }).waitFor();
    const live = await context.newPage();
    await live.route('**/api/content', (r) =>
      r.fulfill({ json: { document: saved, revision: 1 } }),
    );
    await live.goto('http://127.0.0.1:4319' + '/#origins');
    await live.waitForFunction(() => document.querySelector('.or-script')?.textContent === '');
    assert.equal(await live.locator('[data-ve-empty-text]').count(), 0);
    assert.ok(
      !/ข้อความว่าง/.test(
        await live
          .locator('.or-script')
          .first()
          .evaluate((e) => getComputedStyle(e, '::after').content),
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS: cleared caption remains selectable; empty-field list; saved previous text; restore original preserves style; inline retyping; legacy empty drafts; no public or interactive placeholder',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
