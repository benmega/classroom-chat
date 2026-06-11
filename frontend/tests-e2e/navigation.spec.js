import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable browser console logging in tests
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    // Mock user session
    await page.route('**/auth/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            logged_in: true,
            user: { id: 1, username: 'testuser', role: 'student', is_admin: false, packets: 0, duck_balance: 100, has_seen_tutorial: true }
          }
        }),
      });
    });

    // Mock heartbeat
    await page.route('**/heartbeat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    // Mock all message endpoints to return a safe empty or mock response
    await page.route('**/message/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/message/api/me/context')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            global_conversation_id: null,
            classrooms: []
          }),
        });
      } else if (url.includes('/message/api/conversations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        });
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenTutorial', 'true');
    });

    await page.goto('/chat');
  });

  test('should navigate to profile from dashboard', async ({ page }) => {
    await expect(page.getByTestId('profile-toggle')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('profile-toggle').click();
    await page.getByTestId('nav-profile').click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should navigate to bit-shift', async ({ page }) => {
    await expect(page.getByTestId('nav-bit-shift')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('nav-bit-shift').click();
    await expect(page).toHaveURL('/bit-shift');
  });
});
