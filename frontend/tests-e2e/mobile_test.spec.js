import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.use({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
});

test.describe('Mobile UI Audit Navigation', () => {
  const screenshotsDir = path.resolve('..', 'issues', 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  test('Explore all routes', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));

    console.log('Logging in as admin...');
    await page.goto('http://localhost:8000/dev-login?role=admin');
    await page.waitForURL('**/localhost:5173/**', { timeout: 10000 });
    
    // 1. Home / Chat Page
    console.log('Navigating to Chat...');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_home.png') });

    // 2. Profile page
    console.log('Navigating to Profile...');
    await page.goto('http://localhost:5173/profile');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_profile.png') });

    // 3. Open Sidebar / Hamburger Menu (on Profile page where it's visible)
    console.log('Opening hamburger menu on Profile page...');
    const hamburger = page.locator('header button.hamburger-toggle').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, 'mobile_sidebar_open.png') });
      
      // Close sidebar by clicking overlay or close button
      const closeBtn = page.locator('.mobile-sidebar .sidebar-close, .mobile-overlay').first();
      await closeBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log('Hamburger menu not found on Profile page!');
    }

    // 4. Achievements page
    console.log('Navigating to Achievements...');
    await page.goto('http://localhost:5173/achievements');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_achievements.png') });

    // 5. Bit-Shift page
    console.log('Navigating to Bit-Shift...');
    await page.goto('http://localhost:5173/bit-shift');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_bit_shift.png') });

    // 6. Admin Panel
    console.log('Navigating to Admin Panel...');
    await page.goto('http://localhost:5173/admin');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin.png') });

    // 7. Admin Advanced Panel
    console.log('Navigating to Admin Advanced...');
    await page.goto('http://localhost:5173/admin/advanced');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'mobile_admin_advanced.png') });

    console.log('Mobile UI Audit Navigation complete!');
  });
});
