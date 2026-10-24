import { test, expect, STUDENT } from './support/mockBackend.js';

// A short window: the sign-in card is taller than the viewport, so what the page does with the overflow shows.
test.describe('Page scrolling on a short window', () => {
  test.use({ viewport: { width: 1280, height: 360 } });

  test('a page outside the signed-in shell scrolls the document, so its end can be reached', async ({ page, backend }) => {
    await backend.mockSession(null);
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();

    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
    expect(await page.evaluate(() => document.scrollingElement.scrollHeight)).toBeGreaterThan(360);

    await page.mouse.move(640, 180);
    await page.mouse.wheel(0, 2000);

    await expect.poll(() => page.evaluate(() => document.scrollingElement.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'Forgot Password?' })).toBeInViewport();
  });

  // The scroll lock of a dialog opened inside the shell must not outlive the shell: it used to write the
  // computed overflow (hidden, from the shell rule) back as an inline style on close.
  test('a page reached after closing a dialog and signing out still scrolls the document', async ({ page, backend }) => {
    await backend.mockSession(STUDENT);
    await backend.mockLayout();
    await backend.mock('/user/profile', {
      status: 'success',
      data: {
        target: { id: STUDENT.id, username: STUDENT.username, role: STUDENT.role },
        viewer: { id: STUDENT.id, username: STUDENT.username, role: STUDENT.role },
      },
    });
    await backend.mock('/user/logout', {});
    await page.goto('/profile');
    await expect(page.locator('.profile-page')).toBeVisible();

    await page.getByRole('button', { name: 'Join Classroom' }).click();
    const dialog = page.getByRole('dialog', { name: 'Join a classroom' });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

    // Leave the shell without a page load: sign out, then follow the landing page's Login button.
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();

    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    expect(await page.evaluate(() => document.scrollingElement.scrollHeight)).toBeGreaterThan(360);
    await page.mouse.move(640, 180);
    await page.mouse.wheel(0, 2000);

    await expect.poll(() => page.evaluate(() => document.scrollingElement.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'Forgot Password?' })).toBeInViewport();
  });

  test('the signed-in shell keeps the document locked and scrolls inside itself', async ({ page, backend }) => {
    await backend.mockSession(STUDENT);
    await backend.mockLayout();
    await backend.mockChat();
    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenTutorial', 'true');
    });
    await page.goto('/chat');
    await expect(page.getByTestId('feed-container')).toBeVisible({ timeout: 15000 });

    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('hidden');
    expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe('hidden');
    // The shell fills the window exactly; nothing is left over for the document to scroll
    expect(await page.evaluate(() => document.scrollingElement.scrollHeight)).toBe(360);
  });
});
