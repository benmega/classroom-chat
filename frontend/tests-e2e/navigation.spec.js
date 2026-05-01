import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session
    await page.route('**/user/api/auth/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            logged_in: true,
            user: { id: 1, username: 'testuser', role: 'student' }
          }
        }),
      });
    });

    await page.goto('/');
  });

  test('should navigate to profile from dashboard', async ({ page }) => {
    // Click on profile link (adjust selector as necessary)
    await page.locator('a[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should navigate to bit-shift', async ({ page }) => {
    await page.locator('a[href="/bit-shift"]').click();
    await expect(page).toHaveURL('/bit-shift');
  });
});
