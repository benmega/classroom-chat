import { test, expect } from '@playwright/test';

test.describe('Achievements Page', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    await page.route('**/auth/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            logged_in: true,
            user: { id: 1, username: 'testuser', role: 'student', is_admin: false, duck_balance: 100 }
          }
        }),
      });
    });

    await page.route('**/api/achievements/all', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            achievements: [
              { 
                id: 1, 
                name: 'First Steps', 
                description: 'Log in for the first time', 
                reward: 10, 
                slug: 'first-steps',
                type: 'progress',
                current_progress: 1,
                requirement_value: 1
              }
            ],
            user_achievements: [1]
          }
        }),
      });
    });

    await page.route('**/heartbeat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await page.route('**/message/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  });

  test('should display achievements successfully', async ({ page }) => {
    await page.goto('/achievements');
    
    await expect(page.locator('.achievement-name', { hasText: 'First Steps' })).toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('.achievement-card[title="Log in for the first time"]')).toBeVisible({ timeout: 10000 });
  });
});
