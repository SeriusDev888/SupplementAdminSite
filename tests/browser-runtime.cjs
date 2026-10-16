// Optional locally installed Chrome; otherwise use Playwright's Chromium.
exports.launchOptions = process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {};
exports.loginState = async () => {
  if (!process.env.STUDIO_TEST_EMAIL || !process.env.STUDIO_TEST_PASSWORD)
    throw new Error('Set STUDIO_TEST_EMAIL and STUDIO_TEST_PASSWORD for the test account');
  const origin = 'http://127.0.0.1:4320';
  const context = await require('playwright').request.newContext();
  try {
    const response = await context.post(origin + '/api/auth/login', {
      headers: { origin, 'x-editor-request': '1' },
      data: { email: process.env.STUDIO_TEST_EMAIL, password: process.env.STUDIO_TEST_PASSWORD },
    });
    if (!response.ok()) throw new Error(await response.text());
    return await context.storageState();
  } finally {
    await context.dispose();
  }
};
