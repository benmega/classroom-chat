import { test, expect } from '@playwright/test';

test.describe('Admin Packets Adjustment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/dev-login?role=admin');
    
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });

    await page.goto('/admin/users');
  });

  test('should adjust packets for a user positively and negatively', async ({ page }) => {
    await expect(page.locator('.users-table')).toBeVisible({ timeout: 15000 });

    const studentRow = page.locator('tr:has(.user-role-badge.student)').first();
    await expect(studentRow).toBeVisible();

    await studentRow.click();
    await page.waitForURL('**/admin/users/*', { timeout: 15000 });

    const initialPacketsText = await page.locator('.hud-stat-box:has-text("Packets") .val.packets').innerText();
    const initialPackets = parseFloat(initialPacketsText.replace('📦', '').replace(/,/g, '').trim());

    const packetsForm = page.locator('form:has-text("Packets")');
    await expect(packetsForm).toBeVisible();

    await packetsForm.locator('input[name="amount"]').fill('5');
    
    await packetsForm.locator('button[type="submit"]').click();

    await expect(page.locator('.hud-stat-box:has-text("Packets") .val.packets')).toHaveText(
      new RegExp(`📦\\s*${(initialPackets + 5).toLocaleString(undefined, { maximumFractionDigits: 3 })}`)
    );

    await packetsForm.locator('input[name="amount"]').fill('-20');
    await packetsForm.locator('button[type="submit"]').click();
    
    await expect(page.locator('.hud-stat-box:has-text("Packets") .val.packets')).toHaveText(
      new RegExp(`📦\\s*${(initialPackets - 15).toLocaleString(undefined, { maximumFractionDigits: 3 })}`)
    );
  });
});
