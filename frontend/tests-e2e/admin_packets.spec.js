import { test, expect } from '@playwright/test';

test.describe('Admin Packets Adjustment', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin via the dev-login endpoint
    await page.goto('/api/dev-login?role=admin');
    
    // Wait to be redirected to home or dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    // Navigate to admin users page
    await page.goto('/admin/users');
  });

  test('should adjust packets for a user positively and negatively', async ({ page }) => {
    // Wait for the users table to load
    await expect(page.locator('.users-table')).toBeVisible({ timeout: 15000 });

    // Using the class user-role-badge student
    const studentRow = page.locator('tr:has(.user-role-badge.student)').first();
    await expect(studentRow).toBeVisible();

    // Click the row to navigate to the user's dashboard
    await studentRow.click();
    await page.waitForURL('**/admin/users/*', { timeout: 15000 });

    // Get the initial packets count string from the HUD
    const initialPacketsText = await page.locator('.hud-stat-box:has-text("Packets") .val.packets').innerText();
    const initialPackets = parseFloat(initialPacketsText.replace('📦', '').replace(/,/g, '').trim());

    // Locate the Packets adjustment form in the Economy panel
    const packetsForm = page.locator('form:has-text("Packets")');
    await expect(packetsForm).toBeVisible();

    // Fill in positive amount
    await packetsForm.locator('input[name="amount"]').fill('5');
    
    // Submit
    await packetsForm.locator('button[type="submit"]').click();

    // Check UI updated in the HUD
    await expect(page.locator('.hud-stat-box:has-text("Packets") .val.packets')).toHaveText(
      new RegExp(`📦\\s*${(initialPackets + 5).toLocaleString(undefined, { maximumFractionDigits: 3 })}`)
    );

    // Now test negative amount
    await packetsForm.locator('input[name="amount"]').fill('-20');
    await packetsForm.locator('button[type="submit"]').click();
    
    // Check UI updated to negative adjustment
    await expect(page.locator('.hud-stat-box:has-text("Packets") .val.packets')).toHaveText(
      new RegExp(`📦\\s*${(initialPackets - 15).toLocaleString(undefined, { maximumFractionDigits: 3 })}`)
    );
  });
});
