import { test, expect } from '@playwright/test';

test.describe('Profile End-to-End Tests', () => {
    test('verifies Edit Profile redirects to settings', async ({ page }) => {
        // Assume login is handled via a dev-login route or mock
        await page.goto('/dev-login?role=student');

        // Navigate to profile
        await page.goto('/profile');

        // Check that Edit Profile button exists and works
        const editButton = page.locator('button[title="Edit Profile"]');
        await expect(editButton).toBeVisible();
        await editButton.click();

        // Verify URL is /settings
        await expect(page).toHaveURL(/.*\/settings/);
    });
});
