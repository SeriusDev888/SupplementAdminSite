const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const TITLE = 'Editor integration heading ' + Date.now();
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...require('./browser-runtime.cjs').launchOptions,
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: await require('./browser-runtime.cjs').loginState(),
  });
  const state = await (await context.request.get('http://127.0.0.1:4320/api/editor/draft')).json();
  await context.request.put('http://127.0.0.1:4320/api/editor/draft', {
    headers: { origin: 'http://127.0.0.1:4320', 'x-editor-request': '1' },
    data: {
      revision: state.revision,
      document: {
        schema: 1,
        theme: {},
        pages: {},
        global: { nodes: {}, additions: [], order: {} },
      },
    },
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:4320/editor.html#ingredients');
  await page.locator('#studio').waitFor({ state: 'visible' });
  const frame = page.frameLocator('#preview');
  await frame.locator('h1').waitFor();
  await frame.locator('h1').click();
  await page.locator('#text-value').waitFor({ state: 'visible' });
  const original = await page.locator('#text-value').inputValue();
  await page.locator('#text-value').fill(TITLE);
  await frame.locator('h1').filter({ hasText: TITLE }).waitFor();
  await page.locator('#undo').click();
  await frame
    .locator('h1')
    .filter({ hasText: original.split('\n')[0] })
    .waitFor();
  await page.locator('#redo').click();
  await page.locator('#save').click();
  await page.waitForFunction(
    () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
  );
  await page.reload();
  await page.locator('#studio').waitFor({ state: 'visible' });
  await frame.locator('h1').filter({ hasText: TITLE }).waitFor();
  const live = await context.newPage();
  await live.goto('http://127.0.0.1:4319/#ingredients');
  await live.locator('h1').waitFor();
  assert.ok(!(await live.locator('h1').innerText()).includes(TITLE));
  await page.locator('[data-width="390"]').click();
  await page.waitForFunction(() => document.querySelector('#preview').clientWidth === 390);
  await frame.locator('h1').click();
  await page.selectOption('#style-scope', 'mobile');
  await page.locator('#fontSize').fill('29');
  await page.locator('#fontSize').dispatchEvent('change');
  await page.waitForTimeout(300);
  assert.equal(await frame.locator('h1').evaluate((e) => getComputedStyle(e).fontSize), '29px');
  await page.locator('[data-width="full"]').click();
  await page.waitForTimeout(1500);
  console.log(
    'Desktop preview',
    await frame.locator('h1').evaluate((e) => ({
      width: innerWidth,
      style: e.getAttribute('style'),
      size: getComputedStyle(e).fontSize,
    })),
  );
  await page.screenshot({ path: 'editor-debug.png' });
  assert.notEqual(await frame.locator('h1').evaluate((e) => getComputedStyle(e).fontSize), '29px');
  await page.locator('[data-tab="theme"]').click();
  await page.locator('[data-theme="rose"]').click();
  await page.locator('[data-tab="media"]').click();
  await page.locator('.media-item').first().waitFor();
  await page.locator('#file-input').setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByTitle('pixel.png', { exact: true }).first().waitFor();
  await page.locator('#publish').click();
  await page.locator('#confirm-publish').click();
  await page.waitForFunction(() =>
    document.querySelector('#toast').textContent.includes('เผยแพร่แล้ว'),
  );
  await live.reload();
  await live.locator('h1').filter({ hasText: TITLE }).waitFor();
  await page.locator('[data-tab="versions"]').click();
  await page.locator('.version-card').first().waitFor();
  await page.screenshot({ path: 'editor-desktop.png', fullPage: false });
  // Reset local draft and publication after tests, using the same owner APIs.
  await page.evaluate(async () => {
    const headers = { 'content-type': 'application/json', 'x-editor-request': '1' };
    const state = await (await fetch('/api/editor/draft')).json();
    const data = await (
      await fetch('/api/editor/draft', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          revision: state.revision,
          document: {
            schema: 1,
            theme: {},
            pages: {},
            global: { nodes: {}, additions: [], order: {} },
          },
        }),
      })
    ).json();
    await fetch('/api/editor/publish', {
      method: 'POST',
      headers,
      body: JSON.stringify({ revision: data.revision, publishedRevision: state.publishedRevision }),
    });
  });
  await page.close({ runBeforeUnload: false });
  await live.close();
  const visitor = await browser.newContext();
  const denied = await visitor.newPage();
  await denied.goto('http://127.0.0.1:4320/editor.html');
  await denied.waitForURL('**/login?next=**');
  await denied.locator('#login-form').waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: login required, text, undo/redo, saved draft reload, draft isolation, mobile styles, theme, uploads, publication and history',
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
