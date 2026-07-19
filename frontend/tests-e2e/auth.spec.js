import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/user/api/auth/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { logged_in: false } }),
      });
    });

    await page.goto('/login');
  });

  test('should log in successfully with valid credentials', async ({ page }) => {
    await page.route('**/user/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 1, username: 'testuser', role: 'student' },
          awarded_duck: true,
        }),
      });
    });

    await page.fill('input#usernameOrEmail', 'testuser');
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.click('button[id="login-submit-btn"]');

    await expect(page).toHaveURL('/chat');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.route('**/user/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid username or password' }),
      });
    });

    await page.fill('input#usernameOrEmail', 'wronguser');
    await page.fill('input[placeholder="Password"]', 'wrongpass');
    await page.click('button[id="login-submit-btn"]');

    await expect(page).toHaveURL('/login');
  });
});
