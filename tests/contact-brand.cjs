const { chromium } = require('playwright');
const assert = require('node:assert/strict');
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
    const r = await context.request.put(base + '/api/editor/draft', {
      headers: { origin: base, 'x-editor-request': '1' },
      data: { document, revision: (await draft()).revision },
    });
    assert.equal(r.status(), 200);
  };
  const errors = [];
  try {
    await put({ schema: 1, theme: {}, pages: {}, global: { nodes: {}, additions: [], order: {} } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/editor.html#home');
    await page.locator('#studio').waitFor({ state: 'visible' });
    await page.locator('.management-launch [data-manager="brand"]').click();
    for (const [id, value] of [
      ['brand-name', 'SORA'],
      ['brand-mark', 'S'],
      ['brand-logo', '/assets/story-question.png'],
    ]) {
      await page.locator('#' + id).fill(value);
      await page.locator('#' + id).dispatchEvent('change');
    }
    assert.equal(await page.locator('#studio-brand-name').innerText(), 'SORA');
    assert.equal(
      await page.locator('.studio-brand img').getAttribute('src'),
      '/assets/story-question.png',
    );
    await page.locator('.management-launch [data-manager="contact"]').click();
    assert.equal(await page.locator('#contact-details').innerText(), '');
    const text = 'ติดต่อเรา\ncontact@example.test\n<script>alert(1)</script>';
    await page.locator('#contact-details').fill(text);
    await page.locator('#contact-details').dispatchEvent('change');
    await page.locator('#save').click();
    await page.waitForFunction(
      () => document.getElementById('save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const doc = (await draft()).document;
    assert.equal(doc.contact.details, text);
    await page.reload();
    await page.locator('#studio').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#studio-brand-name').innerText(), 'SORA');
    await page.locator('.management-launch [data-manager="contact"]').click();
    assert.equal(await page.locator('#contact-details').innerText(), text);
    await page.screenshot({ path: 'editor-contact.png' });
    await page.locator('#manager-back').click();
    assert.ok(await page.locator('.studio-body').isVisible());
    const live = await context.newPage();
    live.on('pageerror', (e) => errors.push(e.message));
    await live.route('**/api/content', (r) => r.fulfill({ json: { document: doc, revision: 1 } }));
    await live.goto('http://127.0.0.1:4319' + '/#contact');
    await live.locator('.contact-content').waitFor();
    assert.equal(await live.locator('.contact-content').innerText(), text);
    assert.equal(await live.locator('.contact-content script').count(), 0);
    await live.locator('.contact-back').click();
    await live.waitForURL('**/#home');
    await live.goto('http://127.0.0.1:4319' + '/#product/daily');
    await live.locator('.pd-page').waitFor();
    assert.equal(await live.locator('.pd-sample-note').count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: editor brand name/logo, Contact blank/edit/save/reload/back, safe public text, removed product banner',
    );
  } finally {
    await put(before.document);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
