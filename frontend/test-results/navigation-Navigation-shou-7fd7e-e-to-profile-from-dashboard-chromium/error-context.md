# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.js >> Navigation >> should navigate to profile from dashboard
- Location: tests-e2e\navigation.spec.js:22:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navigation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock user session
  6  |     await page.route('**/user/api/auth/status', async (route) => {
  7  |       await route.fulfill({
  8  |         status: 200,
  9  |         contentType: 'application/json',
  10 |         body: JSON.stringify({
  11 |           data: {
  12 |             logged_in: true,
  13 |             user: { id: 1, username: 'testuser', role: 'student' }
  14 |           }
  15 |         }),
  16 |       });
  17 |     });
  18 | 
> 19 |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  20 |   });
  21 | 
  22 |   test('should navigate to profile from dashboard', async ({ page }) => {
  23 |     // Click on profile link (adjust selector as necessary)
  24 |     await page.locator('a[href="/profile"]').click();
  25 |     await expect(page).toHaveURL(/\/profile/);
  26 |   });
  27 | 
  28 |   test('should navigate to bit-shift', async ({ page }) => {
  29 |     await page.locator('a[href="/bit-shift"]').click();
  30 |     await expect(page).toHaveURL('/bit-shift');
  31 |   });
  32 | });
  33 | 
```