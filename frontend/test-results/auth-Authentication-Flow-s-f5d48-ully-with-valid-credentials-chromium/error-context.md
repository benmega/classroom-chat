# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication Flow >> should log in successfully with valid credentials
- Location: tests-e2e\auth.spec.js:17:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input#usernameOrEmail')

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
  3  | test.describe('Authentication Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock the status endpoint to return not logged in initially
  6  |     await page.route('**/user/api/auth/status', async (route) => {
  7  |       await route.fulfill({
  8  |         status: 200,
  9  |         contentType: 'application/json',
  10 |         body: JSON.stringify({ data: { logged_in: false } }),
  11 |       });
  12 |     });
  13 | 
  14 |     await page.goto('/login');
  15 |   });
  16 | 
  17 |   test('should log in successfully with valid credentials', async ({ page }) => {
  18 |     // Mock successful login
  19 |     await page.route('**/user/login', async (route) => {
  20 |       await route.fulfill({
  21 |         status: 200,
  22 |         contentType: 'application/json',
  23 |         body: JSON.stringify({
  24 |           user: { id: 1, username: 'testuser', role: 'student' },
  25 |           awarded_duck: true,
  26 |         }),
  27 |       });
  28 |     });
  29 | 
  30 |     // Fill login form
> 31 |     await page.fill('input#usernameOrEmail', 'testuser');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  32 |     await page.fill('input[placeholder="Password"]', 'password123');
  33 |     await page.click('button[id="login-submit-btn"]');
  34 | 
  35 |     // Should show success toast and navigate to home
  36 |     await expect(page).toHaveURL('/chat');
  37 |   });
  38 | 
  39 |   test('should show error on invalid credentials', async ({ page }) => {
  40 |     // Mock failed login
  41 |     await page.route('**/user/login', async (route) => {
  42 |       await route.fulfill({
  43 |         status: 401,
  44 |         contentType: 'application/json',
  45 |         body: JSON.stringify({ error: 'Invalid username or password' }),
  46 |       });
  47 |     });
  48 | 
  49 |     await page.fill('input#usernameOrEmail', 'wronguser');
  50 |     await page.fill('input[placeholder="Password"]', 'wrongpass');
  51 |     await page.click('button[id="login-submit-btn"]');
  52 | 
  53 |     // Should stay on login page and show error message
  54 |     await expect(page).toHaveURL('/login');
  55 |     // Note: react-hot-toast uses aria-live elements
  56 |   });
  57 | });
  58 | 
```