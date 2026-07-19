import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.use({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
});

test.describe('Parent Portal Mobile UI Audit', () => {
  const screenshotsDir = path.resolve('..', 'issues', 'screenshots');
  
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('Navigate parent portal and capture mobile screenshots', async ({ page }) => {
    test.slow(); // This audit test visits multiple pages and can exceed 30s
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    console.log('1. Navigating to parent dev-login...');
    await page.goto('/api/dev-login?role=parent');
    
    console.log('2. Waiting for redirection to parent dashboard...');
    await page.waitForURL('**/parent/dashboard', { timeout: 30000, waitUntil: 'domcontentloaded' });
    
    console.log('3. Waiting for dashboard content to load...');
    await page.waitForSelector('.parent-loading', { state: 'detached', timeout: 15000 });
    await page.waitForSelector('.parent-dashboard', { state: 'visible', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    const dashboardPath = path.join(screenshotsDir, 'parent_dashboard_mobile_audit.png');
    console.log(`4. Capturing dashboard screenshot to: ${dashboardPath}`);
    await page.screenshot({ path: dashboardPath, fullPage: true });

    // Check if there is a child card available

    const childCardCount = await page.locator('.child-card').count();
    console.log(`Found ${childCardCount} cards on dashboard.`);
    
    if (childCardCount > 1) {
      const childLink = page.locator('.child-card-clickable').first();
      await childLink.click();
      
      console.log('6. Waiting for report card page to load...');
      await page.waitForURL(/\/parent\/report\/\d+/, { timeout: 15000 });
      console.log(`Arrived at report card URL: ${page.url()}`);
      
      await page.waitForSelector('.report-loading', { state: 'detached', timeout: 15000 });
      await page.waitForSelector('.report-card-page', { state: 'visible', timeout: 15000 });
      
      await page.waitForTimeout(2000);
      
      const reportPath = path.join(screenshotsDir, 'parent_report_mobile_audit.png');
      console.log(`7. Capturing report card screenshot to: ${reportPath}`);
      await page.screenshot({ path: reportPath, fullPage: true });
    } else {
      console.log('WARNING: No children connected to this parent. Trying to connect a test child or check DB.');
    }
  });
});
