import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.use({
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
});

test.describe('Desktop UI Audit', () => {
  const screenshotsDir = path.resolve('..', 'issues', 'screenshots');
  
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Navigate admin portal and capture desktop screenshots', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    console.log('1. Navigating to dev-login as admin...');
    await page.goto('http://localhost:8000/dev-login?role=admin');
    
    console.log('2. Waiting for redirection to dashboard...');
    await page.waitForURL('**/', { timeout: 15000 });
    
    // Wait for the loading screen to disappear
    await page.waitForTimeout(2000);
    
    const dashboardPath = path.join(screenshotsDir, 'desktop_dashboard_audit.png');
    console.log(`4. Capturing dashboard screenshot to: ${dashboardPath}`);
    await page.screenshot({ path: dashboardPath, fullPage: true });

    // Navigate to Chat
    console.log('5. Clicking on the chat link...');
    const chatLink = page.locator('a[href="/chat"], a[href="/channels"]').first();
    if (await chatLink.count() > 0) {
      await chatLink.click();
      await page.waitForTimeout(3000);
      const chatPath = path.join(screenshotsDir, 'desktop_chat_audit.png');
      console.log(`6. Capturing chat screenshot to: ${chatPath}`);
      await page.screenshot({ path: chatPath, fullPage: true });
    } else {
      console.log('WARNING: No chat link found.');
    }

    // Navigate to Profile
    console.log('7. Clicking on the profile link...');
    const profileLink = page.locator('a[href="/profile"]').first();
    if (await profileLink.count() > 0) {
      await profileLink.click();
      await page.waitForTimeout(3000);
      const profilePath = path.join(screenshotsDir, 'desktop_profile_audit.png');
      console.log(`8. Capturing profile screenshot to: ${profilePath}`);
      await page.screenshot({ path: profilePath, fullPage: true });
    } else {
      console.log('WARNING: No profile link found.');
    }
  });
});
