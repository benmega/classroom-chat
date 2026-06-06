# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.js >> Navigation >> should navigate to bit-shift
- Location: tests-e2e\navigation.spec.js:42:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('nav-bit-shift')
    - waiting for" http://localhost:5173/login" navigation to finish...
    - navigated to "http://localhost:5173/login"
    2 × locator resolved to <a href="/bit-shift" data-discover="true" class="stat-badge ducks" data-testid="nav-bit-shift">…</a>
    - attempting click action
      - waiting for element to be visible, enabled and stable
    - element was detached from the DOM, retrying
    2 × locator resolved to <a href="/bit-shift" data-discover="true" class="stat-badge ducks" data-testid="nav-bit-shift">…</a>
    - waiting for" http://localhost:5173/login" navigation to finish...
    - navigated to "http://localhost:5173/login"
    - locator resolved to <a href="/bit-shift" data-discover="true" class="stat-badge ducks" data-testid="nav-bit-shift">…</a>
  - attempting click action
    - waiting for navigation to finish...
    - navigated to "http://localhost:5173/login"
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    2 × waiting for" http://localhost:5173/login" navigation to finish...
      - navigated to "http://localhost:5173/login"
    2 × locator resolved to <a href="/bit-shift" data-discover="true" class="stat-badge ducks" data-testid="nav-bit-shift">…</a>
  - attempting click action
    - waiting for navigation to finish...
    - navigated to "http://localhost:5173/login"
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <a href="/bit-shift" data-discover="true" class="stat-badge ducks" data-testid="nav-bit-shift">…</a>
  - attempting click action
    - waiting for" http://localhost:5173/login" navigation to finish...
    - navigated to "http://localhost:5173/login"
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    2 × waiting for" http://localhost:5173/login" navigation to finish...
      - navigated to "http://localhost:5173/login"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navigation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock user session
  6  |     await page.route('**/auth/status', async (route) => {
  7  |       await route.fulfill({
  8  |         status: 200,
  9  |         contentType: 'application/json',
  10 |         body: JSON.stringify({
  11 |           data: {
  12 |             logged_in: true,
  13 |             user: { id: 1, username: 'testuser', role: 'student', is_admin: false, packets: 0, duck_balance: 100 }
  14 |           }
  15 |         }),
  16 |       });
  17 |     });
  18 | 
  19 |     // Mock heartbeat
  20 |     await page.route('**/heartbeat', async (route) => {
  21 |       await route.fulfill({
  22 |         status: 200,
  23 |         contentType: 'application/json',
  24 |         body: JSON.stringify({ status: 'success' }),
  25 |       });
  26 |     });
  27 | 
  28 |     await page.addInitScript(() => {
  29 |       window.localStorage.setItem('hasSeenTutorial', 'true');
  30 |     });
  31 | 
  32 |     await page.goto('/');
  33 |   });
  34 | 
  35 |   test('should navigate to profile from dashboard', async ({ page }) => {
  36 |     await expect(page.getByTestId('profile-toggle')).toBeVisible({ timeout: 15000 });
  37 |     await page.getByTestId('profile-toggle').click();
  38 |     await page.getByTestId('nav-profile').click();
  39 |     await expect(page).toHaveURL(/\/profile/);
  40 |   });
  41 | 
  42 |   test('should navigate to bit-shift', async ({ page }) => {
  43 |     await expect(page.getByTestId('nav-bit-shift')).toBeVisible({ timeout: 15000 });
> 44 |     await page.getByTestId('nav-bit-shift').click();
     |                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  45 |     await expect(page).toHaveURL('/bit-shift');
  46 |   });
  47 | });
  48 | 
```