import { test, expect } from '@playwright/test';

test.describe('Fun Features and Personality Guardrails', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session as a student (non-admin)
    await page.route('**/auth/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            logged_in: true,
            user: { id: 1, username: 'student1', role: 'student', is_admin: false, duck_balance: 10 }
          }
        }),
      });
    });

    await page.goto('/chat');
  });

  test('Admin page should show fun Gandalf Access Denied message', async ({ page }) => {
    // Attempt to navigate to an admin route
    await page.goto('/admin');
    
    // Expect to see the fun error message instead of a boring one
    const heading = page.locator('h1');
    await expect(heading).toHaveText('YOU SHALL NOT PASS! 🧙‍♂️');
    
    const description = page.locator('p');
    await expect(description).toContainText('flame of Udûn');
  });
});
