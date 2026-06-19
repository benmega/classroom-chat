# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.js >> Navigation >> should navigate to bit-shift
- Location: tests-e2e\navigation.spec.js:73:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('nav-bit-shift')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('nav-bit-shift')

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
  2  | 
  3  | test.describe('Navigation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Enable browser console logging in tests
  6  |     page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
  7  |     page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
  8  | 
  9  |     // Mock user session
  10 |     await page.route('**/auth/status', async (route) => {
  11 |       await route.fulfill({
  12 |         status: 200,
  13 |         contentType: 'application/json',
  14 |         body: JSON.stringify({
  15 |           data: {
  16 |             logged_in: true,
  17 |             user: { id: 1, username: 'testuser', role: 'student', is_admin: false, packets: 0, duck_balance: 100, has_seen_tutorial: true }
  18 |           }
  19 |         }),
  20 |       });
  21 |     });
  22 | 
  23 |     // Mock heartbeat
  24 |     await page.route('**/heartbeat', async (route) => {
  25 |       await route.fulfill({
  26 |         status: 200,
  27 |         contentType: 'application/json',
  28 |         body: JSON.stringify({ status: 'success' }),
  29 |       });
  30 |     });
  31 | 
  32 |     // Mock all message endpoints to return a safe empty or mock response
  33 |     await page.route('**/message/**', async (route) => {
  34 |       const url = route.request().url();
  35 |       if (url.includes('/message/api/me/context')) {
  36 |         await route.fulfill({
  37 |           status: 200,
  38 |           contentType: 'application/json',
  39 |           body: JSON.stringify({
  40 |             global_conversation_id: null,
  41 |             classrooms: []
  42 |           }),
  43 |         });
  44 |       } else if (url.includes('/message/api/conversations')) {
  45 |         await route.fulfill({
  46 |           status: 200,
  47 |           contentType: 'application/json',
  48 |           body: JSON.stringify({ data: [] }),
  49 |         });
  50 |       } else {
  51 |         await route.fulfill({
  52 |           status: 200,
  53 |           contentType: 'application/json',
  54 |           body: JSON.stringify({}),
  55 |         });
  56 |       }
  57 |     });
  58 | 
  59 |     await page.addInitScript(() => {
  60 |       window.localStorage.setItem('hasSeenTutorial', 'true');
  61 |     });
  62 | 
  63 |     await page.goto('/chat');
  64 |   });
  65 | 
  66 |   test('should navigate to profile from dashboard', async ({ page }) => {
  67 |     await expect(page.getByTestId('profile-toggle')).toBeVisible({ timeout: 15000 });
  68 |     await page.getByTestId('profile-toggle').click();
  69 |     await page.getByTestId('nav-profile').click();
  70 |     await expect(page).toHaveURL(/\/profile/);
  71 |   });
  72 | 
  73 |   test('should navigate to bit-shift', async ({ page }) => {
> 74 |     await expect(page.getByTestId('nav-bit-shift')).toBeVisible({ timeout: 15000 });
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  75 |     await page.getByTestId('nav-bit-shift').click();
  76 |     await expect(page).toHaveURL('/bit-shift');
  77 |   });
  78 | });
  79 | 
```