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
    // Listen to browser console and page errors
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    console.log('1. Navigating to parent dev-login...');
    await page.goto('http://localhost:8000/dev-login?role=parent');
    
    console.log('2. Waiting for redirection to parent dashboard...');
    // The Flask page redirects to http://localhost:5173/ which redirects to /parent/dashboard
    await page.waitForURL('**/parent/dashboard', { timeout: 30000, waitUntil: 'domcontentloaded' });
    
    console.log('3. Waiting for dashboard content to load...');
    // Wait for the loading screen to disappear, and child cards or connection card to appear
    await page.waitForSelector('.parent-loading', { state: 'detached', timeout: 15000 });
    await page.waitForSelector('.parent-dashboard', { state: 'visible', timeout: 15000 });
    
    // Add a small delay for any animations/charts to settle
    await page.waitForTimeout(2000);
    
    const dashboardPath = path.join(screenshotsDir, 'parent_dashboard_mobile_audit.png');
    console.log(`4. Capturing dashboard screenshot to: ${dashboardPath}`);
    await page.screenshot({ path: dashboardPath, fullPage: true });

    // Check if there is a child card available

    const childCardCount = await page.locator('.child-card').count();
    console.log(`Found ${childCardCount} cards on dashboard.`);
    
    // Find the link to a child's report card. Usually a child card exists or we connect one.
    // If child card is available, click it. Otherwise print a warning or handle it.
    if (childCardCount > 1) { // 1 connect card + child cards
      console.log('5. Clicking on the child card to open report card...');
      // The child-card has a click handler on a div inside it for navigation
      // Click the first card that is not the connect card.
      // The connect-card contains the class 'connect-card'. Let's select one without 'connect-card'.
      const childLink = page.locator('.child-card:not(.connect-card)').first();
      await childLink.click();
      
      console.log('6. Waiting for report card page to load...');
      await page.waitForURL(/\/parent\/report\/\d+/, { timeout: 15000 });
      console.log(`Arrived at report card URL: ${page.url()}`);
      
      // Wait for loading to finish
      await page.waitForSelector('.report-loading', { state: 'detached', timeout: 15000 });
      await page.waitForSelector('.report-card-page', { state: 'visible', timeout: 15000 });
      
      // Add a small delay for content to fully render
      await page.waitForTimeout(2000);
      
      const reportPath = path.join(screenshotsDir, 'parent_report_mobile_audit.png');
      console.log(`7. Capturing report card screenshot to: ${reportPath}`);
      await page.screenshot({ path: reportPath, fullPage: true });
    } else {
      console.log('WARNING: No children connected to this parent. Trying to connect a test child or check DB.');
    }
  });
});
