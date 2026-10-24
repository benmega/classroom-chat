import { test, expect } from './support/mockBackend.js';

// Inter and Outfit are served by the app itself: a visitor's browser must not contact a font host.
test.describe('Self-hosted fonts', () => {
  test('the login page loads Inter and Outfit from the app origin', async ({ page, backend }) => {
    const requested = [];
    page.on('request', (request) => requested.push(request.url()));
    await backend.mockSession(null);

    await page.goto('/login');
    await expect(page.locator('input#usernameOrEmail')).toBeVisible();

    // The faces load on first use: the page body is Inter and its headings are Outfit.
    const loaded = await page.evaluate(async () => {
      await document.fonts.load('400 16px Inter');
      await document.fonts.load('700 16px Outfit');
      await document.fonts.ready;
      return [...document.fonts].filter((face) => face.status === 'loaded').map((face) => `${face.family} ${face.weight}`);
    });
    expect(loaded).toContain('Inter 400');
    expect(loaded).toContain('Outfit 700');

    const origin = new URL(page.url()).origin;
    const external = requested.filter((url) => url.startsWith('http') && new URL(url).origin !== origin);
    expect(external, 'requests that left the app origin').toEqual([]);
  });
});
