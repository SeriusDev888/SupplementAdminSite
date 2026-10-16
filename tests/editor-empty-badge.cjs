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
  const draft = () => context.request.get(base + '/api/editor/draft').then((r) => r.json()),
    before = await draft();
  const put = async (document) =>
    context.request.put(base + '/api/editor/draft', {
      headers,
      data: { document, revision: (await draft()).revision },
    });
  await put({ schema: 1, theme: {}, pages: {}, global: { nodes: {}, additions: [], order: {} } });
  const page = await context.newPage();
  try {
    await page.goto(base + '/editor.html#ingredients');
    const f = page.frameLocator('#preview'),
      note = f.locator('.ig4-art-orange .ig4-art-note');
    await note.click();
    await page.waitForFunction(() => EditorAPI.selection()?.text?.includes('Citrus'));
    await page.locator('#text-value').fill('');
    for (const width of ['2560', '390']) {
      await page.locator(`[data-width="${width}"]`).click();
      await page.waitForTimeout(250);
      await page.locator('#empty-texts-list button').click();
      await note.scrollIntoViewIfNeeded();
      const metrics = await note.evaluate((e) => ({
        height: e.getBoundingClientRect().height,
        width: e.getBoundingClientRect().width,
        rotate: getComputedStyle(e).rotate,
        transform: getComputedStyle(e).transform,
      }));
      assert.ok(metrics.height <= 34, JSON.stringify(metrics));
      assert.ok(metrics.width < 180, JSON.stringify(metrics));
      assert.equal(metrics.rotate, 'none');
      assert.equal(metrics.transform, 'none');
    }
    await page.locator('[data-width="full"]').click();
    await page.waitForTimeout(250);
    await page.locator('#empty-texts-list button').click();
    await note.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'editor-compact-empty-badge.png' });
    await page.locator('#restore-original-text').click();
    await page.waitForFunction(() => document.querySelector('#text-value').value.trim().length > 0);
    assert.equal(await note.getAttribute('data-ve-empty-text'), null);
    console.log(
      'PASS: orange caption placeholder stays under 180×34 px, unrotated at 2K and mobile, and restores original text',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
