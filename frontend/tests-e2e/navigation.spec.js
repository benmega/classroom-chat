import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
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
            user: { id: 1, username: 'testuser', role: 'student', is_admin: false, packets: 0, duck_balance: 100, has_seen_tutorial: true }
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
    const profileRail = page.locator('.nav-rail-item[data-tooltip="Profile"]');
    const hamburgerToggle = page.locator('.hamburger-toggle');

    await expect(async () => {
      const isRailVisible = await profileRail.isVisible();
      const isHamburgerVisible = await hamburgerToggle.isVisible();
      expect(isRailVisible || isHamburgerVisible).toBe(true);
    }).toPass({ timeout: 15000 });

    if (await profileRail.isVisible()) {
      await profileRail.click();
    } else {
      await hamburgerToggle.click();
      await page.locator('.sidebar-nav').getByRole('link', { name: 'Profile' }).click();
    }

    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.locator('.profile-card-premium')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to bit-shift', async ({ page }) => {
    await expect(page.getByTestId('nav-bit-shift')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('nav-bit-shift').click();
    await expect(page).toHaveURL('/bit-shift');
  });
});
