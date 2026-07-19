import { test, expect } from '@playwright/test';

test.describe('Profile End-to-End Tests', () => {
    test('verifies Edit Profile redirects to settings', async ({ page }) => {
        await page.goto('/dev-login?role=student');

        await page.goto('/profile');

        const editButton = page.locator('button[title="Edit Profile"]');
        await expect(editButton).toBeVisible();
        await editButton.click();

        await expect(page).toHaveURL(/.*\/settings/);
    });
});
