const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({
    ...require('./browser-runtime.cjs').launchOptions,
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: await require('./browser-runtime.cjs').loginState(),
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const base = 'http://127.0.0.1:4320',
    before = await (await context.request.get(base + '/api/editor/draft')).json();
  try {
    await page.goto(base + '/editor.html#ingredients');
    await page.locator('#studio').waitFor({ state: 'visible' });
    const frame = page.frameLocator('#preview'),
      heading = frame.locator('h1');
    await heading.click();
    const original = await page.locator('#text-value').inputValue(),
      changed = 'Shortcut check ' + Date.now();
    await page.locator('#text-value').fill(changed);
    await heading.filter({ hasText: changed }).waitFor();
    await page.keyboard.press('Control+z');
    await heading.filter({ hasText: original.split('\n')[0] }).waitFor();
    await page.keyboard.press('Control+y');
    await heading.filter({ hasText: changed }).waitFor();
    await page.keyboard.press('Control+z');
    await heading.filter({ hasText: original.split('\n')[0] }).waitFor();
    await page.keyboard.press('Control+Shift+z');
    await heading.filter({ hasText: changed }).waitFor();
    await heading.click();
    await page.keyboard.press('Control+z');
    await heading.filter({ hasText: original.split('\n')[0] }).waitFor();
    await page.keyboard.press('Control+y');
    await heading.filter({ hasText: changed }).waitFor();
    // Mac equivalents should follow the same editor history while the frame has focus.
    await page.keyboard.press('Meta+z');
    await heading.filter({ hasText: original.split('\n')[0] }).waitFor();
    await page.keyboard.press('Meta+Shift+z');
    await heading.filter({ hasText: changed }).waitFor();
    await page.keyboard.press('Control+s');
    await page.waitForFunction(
      () => document.querySelector('#save-state').textContent === 'บันทึกฉบับร่างแล้ว',
    );
    const saved = await (await context.request.get(base + '/api/editor/draft')).json();
    assert.ok(JSON.stringify(saved.document).includes(changed));
    await heading.dblclick();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Inline native edit');
    assert.equal(await heading.innerText(), 'Inline native edit');
    await page.keyboard.press('Control+z');
    assert.notEqual(await heading.innerText(), 'Inline native edit');
    assert.deepEqual(errors, []);
    console.log(
      'PASS: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z in panel and preview, Mac equivalents, Ctrl+S from preview, native inline text undo',
    );
  } finally {
    const current = await (await context.request.get(base + '/api/editor/draft')).json();
    await context.request.put(base + '/api/editor/draft', {
      headers: { origin: base, 'x-editor-request': '1' },
      data: { document: before.document, revision: current.revision },
    });
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
