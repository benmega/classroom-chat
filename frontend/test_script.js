import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const issuesDir = path.join('..', 'issues');
  const screenshotsDir = path.join(issuesDir, 'screenshots');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:8000/dev-login?role=admin');
  await page.waitForTimeout(1000);
  
  const routes = [
    { name: 'admin_dashboard', url: 'http://localhost:5173/admin/dashboard' },
    { name: 'admin_users', url: 'http://localhost:5173/admin/users' },
    { name: 'admin_library', url: 'http://localhost:5173/admin/library' },
    { name: 'chat', url: 'http://localhost:5173/chat' },
    { name: 'mobile_activity', url: 'http://localhost:5173/activity' }
  ];

  for (const route of routes) {
    console.log(`Going to ${route.name}...`);
    await page.goto(route.url);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(screenshotsDir, `${route.name}.png`) });
  }

  await browser.close();
})();
