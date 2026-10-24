import { test, expect, STUDENT } from './support/mockBackend.js';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page, backend }) => {
    await backend.mockSession(STUDENT);
    await backend.mockLayout();
    await backend.mockChat();
    await backend.mock('/user/profile', {
      status: 'success',
      data: {
        target: { id: STUDENT.id, username: STUDENT.username, role: STUDENT.role },
        viewer: { id: STUDENT.id, username: STUDENT.username, role: STUDENT.role },
      },
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('hasSeenTutorial', 'true');
    });

    await page.goto('/chat');
    // The page the rest of the spec starts from: signed in, feed loaded.
    await expect(page.getByTestId('feed-container')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('.profile-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { level: 1, name: STUDENT.username })).toBeVisible();
  });

  test('should navigate to bit-shift', async ({ page }) => {
    const ducks = page.getByTestId('nav-bit-shift');
    await expect(ducks).toBeVisible({ timeout: 15000 });
    await expect(ducks).toContainText(String(STUDENT.duck_balance));
    await ducks.click();

    await expect(page).toHaveURL('/bit-shift');
    await expect(page.getByRole('switch', { name: 'Byte mode' })).toBeAttached();
  });
});
