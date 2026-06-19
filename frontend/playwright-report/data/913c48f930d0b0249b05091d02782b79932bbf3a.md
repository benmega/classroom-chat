# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parent_mobile_audit.spec.js >> Parent Portal Mobile UI Audit >> Navigate parent portal and capture mobile screenshots
- Location: tests-e2e\parent_mobile_audit.spec.js:21:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/parent/dashboard" until "load"
  navigated to "http://localhost:5173/"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:react-babel] C:\\Users\\Ben\\AntiGravity\\classroom-chat\\frontend\\src\\pages\\General\\Shop.jsx: Unexpected character '�'. (1:0) 4 | \x00"
  - generic [ref=e5]: C:/Users/Ben/AntiGravity/classroom-chat/frontend/src/pages/General/Shop.jsx:1:0
  - generic [ref=e6]: "1 | ��i\x00m\x00p\x00o\x00r\x00t\x00 \x00R\x00e\x00a\x00c\x00t\x00,\x00 \x00{\x00 \x00u\x00s\x00e\x00S\x00t\x00a\x00t\x00e\x00,\x00 \x00u\x00s\x00e\x00E\x00f\x00f\x00e\x00c\x00t\x00 \x00}\x00 \x00f\x00r\x00o\x00m\x00 \x00'\x00r\x00e\x00a\x00c\x00t\x00'\x00;\x00 \x00 | ^ 2 | \x00i\x00m\x00p\x00o\x00r\x00t\x00 \x00{\x00 \x00S\x00h\x00i\x00e\x00l\x00d\x00,\x00 \x00U\x00n\x00l\x00o\x00c\x00k\x00,\x00 \x00S\x00t\x00a\x00r\x00,\x00 \x00L\x00o\x00a\x00d\x00e\x00r\x002\x00,\x00 \x00S\x00h\x00o\x00p\x00p\x00i\x00n\x00g\x00C\x00a\x00r\x00t\x00 \x00}\x00 \x00f\x00r\x00o\x00m\x00 \x00'\x00l\x00u\x00c\x00i\x00d\x00e\x00-\x00r\x00e\x00a\x00c\x00t\x00'\x00;\x00 \x00 3 | \x00i\x00m\x00p\x00o\x00r\x00t\x00 \x00t\x00o\x00a\x00s\x00t\x00 \x00f\x00r\x00o\x00m\x00 \x00'\x00r\x00e\x00a\x00c\x00t\x00-\x00h\x00o\x00t\x00-\x00t\x00o\x00a\x00s\x00t\x00'\x00;\x00 \x00"
  - generic [ref=e7]: at constructor (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:365:19) at JSXParserMixin.raise (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:6599:19) at JSXParserMixin.getTokenFromCode (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:6306:16) at JSXParserMixin.getTokenFromCode (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:4797:11) at JSXParserMixin.nextToken (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:5782:10) at JSXParserMixin.parse (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:14486:10) at parse (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\parser\lib\index.js:14522:38) at parser (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\parser\index.js:41:34) at parser.next (<anonymous>) at normalizeFile (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\transformation\normalize-file.js:64:37) at normalizeFile.next (<anonymous>) at run (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\transformation\index.js:22:50) at run.next (<anonymous>) at transform (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\transform.js:22:33) at transform.next (<anonymous>) at step (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:261:32) at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:273:13 at async.call.result.err.err (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:223:11) at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:189:28 at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\@babel\core\lib\gensync-utils\async.js:67:7 at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:113:33 at step (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:287:14) at C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:273:13 at async.call.result.err.err (C:\Users\Ben\AntiGravity\classroom-chat\frontend\node_modules\gensync\index.js:223:11
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.js
    - text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import * as fs from 'fs';
  3  | import * as path from 'path';
  4  | 
  5  | test.use({
  6  |   viewport: { width: 390, height: 844 },
  7  |   userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  8  |   hasTouch: true,
  9  |   isMobile: true,
  10 | });
  11 | 
  12 | test.describe('Parent Portal Mobile UI Audit', () => {
  13 |   const screenshotsDir = path.resolve('..', 'issues', 'screenshots');
  14 |   
  15 |   test.beforeAll(() => {
  16 |     if (!fs.existsSync(screenshotsDir)) {
  17 |       fs.mkdirSync(screenshotsDir, { recursive: true });
  18 |     }
  19 |   });
  20 | 
  21 |   test('Navigate parent portal and capture mobile screenshots', async ({ page }) => {
  22 |     // Listen to browser console and page errors
  23 |     page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
  24 |     page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
  25 | 
  26 |     console.log('1. Navigating to parent dev-login...');
  27 |     await page.goto('http://localhost:8000/dev-login?role=parent');
  28 |     
  29 |     console.log('2. Waiting for redirection to parent dashboard...');
  30 |     // The Flask page redirects to http://localhost:5173/ which redirects to /parent/dashboard
> 31 |     await page.waitForURL('**/parent/dashboard', { timeout: 15000 });
     |                ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  32 |     
  33 |     console.log('3. Waiting for dashboard content to load...');
  34 |     // Wait for the loading screen to disappear, and child cards or connection card to appear
  35 |     await page.waitForSelector('.parent-loading', { state: 'detached', timeout: 15000 });
  36 |     await page.waitForSelector('.parent-dashboard', { state: 'visible', timeout: 15000 });
  37 |     
  38 |     // Add a small delay for any animations/charts to settle
  39 |     await page.waitForTimeout(2000);
  40 |     
  41 |     const dashboardPath = path.join(screenshotsDir, 'parent_dashboard_mobile_audit.png');
  42 |     console.log(`4. Capturing dashboard screenshot to: ${dashboardPath}`);
  43 |     await page.screenshot({ path: dashboardPath, fullPage: true });
  44 | 
  45 |     // Check if there is a child card available
  46 |     const childCard = page.locator('.child-card').first();
  47 |     const childCardCount = await page.locator('.child-card').count();
  48 |     console.log(`Found ${childCardCount} cards on dashboard.`);
  49 |     
  50 |     // Find the link to a child's report card. Usually a child card exists or we connect one.
  51 |     // If child card is available, click it. Otherwise print a warning or handle it.
  52 |     if (childCardCount > 1) { // 1 connect card + child cards
  53 |       console.log('5. Clicking on the child card to open report card...');
  54 |       // The child-card has a click handler on a div inside it for navigation
  55 |       // Click the first card that is not the connect card.
  56 |       // The connect-card contains the class 'connect-card'. Let's select one without 'connect-card'.
  57 |       const childLink = page.locator('.child-card:not(.connect-card)').first();
  58 |       await childLink.click();
  59 |       
  60 |       console.log('6. Waiting for report card page to load...');
  61 |       await page.waitForURL(/\/parent\/report\/\d+/, { timeout: 15000 });
  62 |       console.log(`Arrived at report card URL: ${page.url()}`);
  63 |       
  64 |       // Wait for loading to finish
  65 |       await page.waitForSelector('.report-loading', { state: 'detached', timeout: 15000 });
  66 |       await page.waitForSelector('.report-card-page', { state: 'visible', timeout: 15000 });
  67 |       
  68 |       // Add a small delay for content to fully render
  69 |       await page.waitForTimeout(2000);
  70 |       
  71 |       const reportPath = path.join(screenshotsDir, 'parent_report_mobile_audit.png');
  72 |       console.log(`7. Capturing report card screenshot to: ${reportPath}`);
  73 |       await page.screenshot({ path: reportPath, fullPage: true });
  74 |     } else {
  75 |       console.log('WARNING: No children connected to this parent. Trying to connect a test child or check DB.');
  76 |     }
  77 |   });
  78 | });
  79 | 
```