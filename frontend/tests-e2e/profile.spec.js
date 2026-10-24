import { test, expect, STUDENT } from './support/mockBackend.js';

test.describe('Profile End-to-End Tests', () => {
  test.beforeEach(async ({ page, backend }) => {
    await backend.mockSession(STUDENT);
    await backend.mockLayout();
    await backend.mock('/user/profile', {
      status: 'success',
      data: {
        target: { id: STUDENT.id, username: STUDENT.username, role: STUDENT.role },
        viewer: { id: STUDENT.id, username: STUDENT.username, role: STUDENT.role },
      },
    });
    // The settings page a student is sent to asks for the code a parent connects with.
    await backend.mock('/user/api/parent-code', { data: { connection_code: 'ABC123' } });

    await page.goto('/profile');
    await expect(page.locator('.profile-page')).toBeVisible();
  });

  test('verifies Edit Profile redirects to settings', async ({ page }) => {
    const editButton = page.locator('button[title="Edit Profile"]');
    await expect(editButton).toBeVisible();
    await editButton.click();

    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.getByRole('heading', { level: 1, name: STUDENT.username })).toBeVisible();
    await expect(page.getByText('Account Profile Settings')).toBeVisible();
  });

  test('verifies the header Edit Profile link goes to the same settings page', async ({ page }) => {
    await page.getByRole('link', { name: 'Edit Profile' }).click();

    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.getByText('Account Profile Settings')).toBeVisible();
  });
});
