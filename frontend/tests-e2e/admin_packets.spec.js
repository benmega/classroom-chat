import { test, expect } from '@playwright/test';

test.describe('Admin Packets Adjustment', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin via the dev-login endpoint
    await page.goto('/api/dev-login?role=admin');
    
    // Wait to be redirected to home or dashboard
    await page.waitForURL('**/', { timeout: 15000 });

    // Navigate to admin users page
    await page.goto('/admin/users');
  });

  test('should adjust packets for a user positively and negatively', async ({ page }) => {
    // Wait for the users table to load
    await expect(page.locator('.users-table')).toBeVisible({ timeout: 15000 });

    // Wait for at least one user row that has a student role
    // Using the text "Student" inside the user role badge
    const studentRow = page.locator('tr:has(.user-role-badge.student)').first();
    await expect(studentRow).toBeVisible();

    // Get the initial packets count string
    const initialPacketsText = await studentRow.locator('.packet-count').innerText();
    const initialPackets = parseFloat(initialPacketsText.replace('📦', '').trim());

    // Click the Adjust Packets button for this specific student
    await studentRow.locator('button.adjust-packets').click();

    // Wait for modal
    const modal = page.locator('.admin-modal-content:has-text("Adjust Packets Balance")');
    await expect(modal).toBeVisible();

    // Fill in positive amount
    await modal.locator('input[name="amount"]').fill('5');
    
    // Submit
    await modal.locator('button[type="submit"]:has-text("Apply")').click();

    // Wait for modal to disappear and success toast
    await expect(modal).toBeHidden();
    
    // Check UI updated
    await expect(studentRow.locator('.packet-count')).toHaveText(
      new RegExp(`📦\\s*${(initialPackets + 5).toLocaleString(undefined, { maximumFractionDigits: 3 })}`)
    );

    // Now test negative amount
    await studentRow.locator('button.adjust-packets').click();
    await expect(modal).toBeVisible();
    await modal.locator('input[name="amount"]').fill('-20');
    await modal.locator('button[type="submit"]:has-text("Apply")').click();
    await expect(modal).toBeHidden();
    
    // Check UI updated to negative adjustment
    await expect(studentRow.locator('.packet-count')).toHaveText(
      new RegExp(`📦\\s*${(initialPackets - 15).toLocaleString(undefined, { maximumFractionDigits: 3 })}`)
    );
  });
});
