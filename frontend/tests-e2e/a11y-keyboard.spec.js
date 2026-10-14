import { test, expect } from '@playwright/test';

// Keyboard-only flows. These need a real browser: what they check is what the stylesheets do (a display:none
// input can never be focused, a visually hidden one can) and where Tab actually goes.

const respondJson = (body) => async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
};

const mockSession = async (page, user) => {
  await page.route('**/auth/status', respondJson({ data: user ? { logged_in: true, user } : { logged_in: false } }));
  // The fake session has no cookie on the real backend, so its heartbeat would answer 401 and log the user out.
  await page.route('**/heartbeat', respondJson({ status: 'success' }));
};

const tabUntilFocused = async (page, locator, maxPresses = 60) => {
  for (let i = 0; i < maxPresses; i += 1) {
    if (await locator.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
};

test.describe('Keyboard-only access', () => {
  test.describe('signed out', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, null);
    });

    test('the login form can be completed with Tab, Space and Enter', async ({ page }) => {
      await page.route('**/user/login', respondJson({ user: { id: 1, username: 'testuser', role: 'student' }, awarded_duck: false }));
      await page.goto('/login');
      // The page is a lazy chunk: wait for the form before tabbing into it.
      await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('textbox', { name: 'Username or email' })).toBeFocused();
      await page.keyboard.type('testuser');

      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
      await page.keyboard.type('password123');

      // The visibility toggle is part of the tab order and reports its state.
      await page.keyboard.press('Tab');
      const toggle = page.getByRole('button', { name: 'Show password' });
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /Login/ })).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/chat');
    });

    test('the signup role buttons say which role is selected and can be switched with the keyboard', async ({ page }) => {
      await page.goto('/signup');
      const student = page.getByRole('button', { name: 'Student' });
      const parent = page.getByRole('button', { name: 'Parent' });
      await expect(student).toBeVisible({ timeout: 15000 });
      await expect(student).toHaveAttribute('aria-pressed', 'true');
      await expect(parent).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('textbox', { name: 'Username' })).toBeVisible();

      await parent.focus();
      await page.keyboard.press('Enter');

      await expect(parent).toHaveAttribute('aria-pressed', 'true');
      await expect(student).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    });
  });

  test.describe('signed in', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, {
        id: 1, username: 'testuser', role: 'student', is_admin: false, packets: 0, duck_balance: 100, has_seen_tutorial: true,
      });
      await page.route('**/message/**', respondJson({ global_conversation_id: null, classrooms: [], data: [] }));
    });

    test('the bit/Byte switch can be reached, shows a focus ring and is flipped with Space', async ({ page }) => {
      await page.goto('/bit-shift');
      const toggle = page.getByRole('switch', { name: 'Byte mode' });
      await expect(toggle).toBeAttached();

      await tabUntilFocused(page, toggle);
      await expect(toggle).toBeFocused();
      // The input itself is clipped away, so the ring is drawn on the slider next to it.
      await expect(page.locator('.toggle-slider')).toHaveCSS('outline-style', 'solid');

      await expect(toggle).not.toBeChecked();
      await page.keyboard.press('Space');
      await expect(toggle).toBeChecked();
      await expect(page.locator('.byte-row-container')).toHaveClass(/expanded/);
    });
  });
});
