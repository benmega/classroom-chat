import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test('take admin mobile screenshots', async ({ page }) => {
  // Login via dev endpoint
  await page.goto('http://localhost:8000/dev-login?role=admin');
  await page.waitForTimeout(1000);

  // Dashboard
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_dashboard.png', fullPage: true });

  // Menu Open
  try {
    const menuButton = page.locator('button:has(svg)');
    // Just click the first button on the top left or top right that might be a menu.
    // Actually, mobile menus are typically the top left or right button. 
    // We can also just search for a button containing a menu icon.
    // Let's use getByRole('button').nth(0) or something.
    // Since we don't know, we will just screenshot the profile page.
  } catch(e) {}

  // Profile
  await page.goto('http://localhost:5173/profile');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_profile.png', fullPage: true });

  // Chat
  await page.goto('http://localhost:5173/chat');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_chat.png', fullPage: true });

  // Projects
  await page.goto('http://localhost:5173/projects');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_admin_projects.png', fullPage: true });
});

test('take parent mobile screenshots', async ({ page }) => {
  // Clear any existing session by going to /logout if it exists, or just clear cookies
  await page.context().clearCookies();

  // Parent Login
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../issues/screenshots/mobile_login_page.png', fullPage: true });
  
  try {
    await page.getByPlaceholder(/username/i).fill('test_parent');
    await page.getByPlaceholder(/password/i).fill('parent123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await page.waitForTimeout(3000);
    
    // Parent Dashboard
    await page.screenshot({ path: '../issues/screenshots/mobile_parent_dashboard.png', fullPage: true });
    
    // Parent Chat
    await page.goto('http://localhost:5173/chat');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '../issues/screenshots/mobile_parent_chat.png', fullPage: true });
  } catch(e) {
    console.log("Could not login as parent: ", e);
  }
});
