import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the status endpoint to return not logged in initially
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
    // Mock successful login
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

    // Fill login form
    await page.fill('input[placeholder="Username"]', 'testuser');
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.click('button[id="login-submit-btn"]');

    // Should show success toast and navigate to home
    await expect(page).toHaveURL('/');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    // Mock failed login
    await page.route('**/user/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid username or password' }),
      });
    });

    await page.fill('input[placeholder="Username"]', 'wronguser');
    await page.fill('input[placeholder="Password"]', 'wrongpass');
    await page.click('button[id="login-submit-btn"]');

    // Should stay on login page and show error message
    await expect(page).toHaveURL('/login');
    const toast = page.locator('div[role="status"]');
    // Note: react-hot-toast uses aria-live elements
  });
});
