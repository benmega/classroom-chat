# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fun-checks.spec.js >> Fun Features and Personality Guardrails >> Admin page should show fun Gandalf Access Denied message
- Location: tests-e2e\fun-checks.spec.js:22:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('h1')
Expected: "YOU SHALL NOT PASS! 🧙‍♂️"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('h1')

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
  3  | test.describe('Fun Features and Personality Guardrails', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock user session as a student (non-admin)
  6  |     await page.route('**/auth/status', async (route) => {
  7  |       await route.fulfill({
  8  |         status: 200,
  9  |         contentType: 'application/json',
  10 |         body: JSON.stringify({
  11 |           data: {
  12 |             logged_in: true,
  13 |             user: { id: 1, username: 'student1', role: 'student', is_admin: false, duck_balance: 10 }
  14 |           }
  15 |         }),
  16 |       });
  17 |     });
  18 | 
  19 |     await page.goto('/chat');
  20 |   });
  21 | 
  22 |   test('Admin page should show fun Gandalf Access Denied message', async ({ page }) => {
  23 |     // Attempt to navigate to an admin route
  24 |     await page.goto('/admin');
  25 |     
  26 |     // Expect to see the fun error message instead of a boring one
  27 |     const heading = page.locator('h1');
> 28 |     await expect(heading).toHaveText('YOU SHALL NOT PASS! 🧙‍♂️');
     |                           ^ Error: expect(locator).toHaveText(expected) failed
  29 |     
  30 |     const description = page.locator('p');
  31 |     await expect(description).toContainText('flame of Udûn');
  32 |   });
  33 | });
  34 | 
```