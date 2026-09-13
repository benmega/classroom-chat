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
    await page.goto('http://localhost:5173/api/dev-login?role=parent');
    await page.waitForTimeout(1000);
    
    console.log('2. Navigating to parent dashboard...');
    await page.goto('http://localhost:5173/parent/dashboard');
    
    console.log('3. Waiting for dashboard content to load...');
    await page.waitForSelector('.parent-dashboard', { state: 'visible', timeout: 10000 });
    
    await page.waitForTimeout(2000);
    
    const dashboardPath = path.join(screenshotsDir, 'parent_dashboard_mobile_audit.png');
    console.log(`4. Capturing dashboard screenshot to: ${dashboardPath}`);
    await page.screenshot({ path: dashboardPath, fullPage: true });

    const childCardCount = await page.locator('text=blossomstudent01').count();
    console.log(`Found ${childCardCount} instances of blossomstudent01.`);
    
    if (childCardCount > 0) {
      const childId = await page.evaluate(async () => {
        const res = await fetch('/api/parents/children');
        const data = await res.json();
        const children = data.data?.children || data.children || [];
        return children[0]?.id;
      });
      
      console.log(`Navigating to report for child ${childId}...`);
      await page.goto(`http://localhost:5173/parent/report/${childId}`);
      
      console.log('6. Waiting for report card page to load...');
      console.log(`Arrived at report card URL: ${page.url()}`);
      
      await page.waitForSelector('.report-loading', { state: 'detached', timeout: 15000 });
      await page.waitForSelector('.report-card-page', { state: 'visible', timeout: 15000 });
      
      await page.waitForTimeout(2000);
      
      const reportPath = path.join(screenshotsDir, 'parent_report_mobile_audit.png');
      console.log(`7. Capturing report card screenshot to: ${reportPath}`);
      await page.screenshot({ path: reportPath, fullPage: true });
    }
  });
});
