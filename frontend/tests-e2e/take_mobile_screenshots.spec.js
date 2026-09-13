import { test, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test('take admin mobile screenshots', async ({ page }) => {
  await page.goto('/api/dev-login?role=admin');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_dashboard.png', fullPage: true });



  await page.goto('http://localhost:5173/profile');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_profile.png', fullPage: true });

  await page.goto('http://localhost:5173/chat');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_chat.png', fullPage: true });

  await page.goto('http://localhost:5173/projects');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_projects.png', fullPage: true });
});

test('take parent mobile screenshots', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_login_page.png', fullPage: true });
  
    await page.getByPlaceholder(/username/i).fill('test_parent');
    await page.getByPlaceholder(/password/i).fill('parent123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '../issues/screenshots/mobile_parent_dashboard.png', fullPage: true });
    
    await page.goto('http://localhost:5173/chat');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '../issues/screenshots/mobile_parent_chat.png', fullPage: true });
});
