# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Authentication Flow >> should show error on invalid credentials
- Location: tests-e2e\auth.spec.js:39:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
Call log:
  - navigating to "http://localhost:5173/login", waiting until "load"

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
> 14 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
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
  31 |     await page.fill('input[placeholder="Username"]', 'testuser');
  32 |     await page.fill('input[placeholder="Password"]', 'password123');
  33 |     await page.click('button[id="login-submit-btn"]');
  34 | 
  35 |     // Should show success toast and navigate to home
  36 |     await expect(page).toHaveURL('/');
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
  49 |     await page.fill('input[placeholder="Username"]', 'wronguser');
  50 |     await page.fill('input[placeholder="Password"]', 'wrongpass');
  51 |     await page.click('button[id="login-submit-btn"]');
  52 | 
  53 |     // Should stay on login page and show error message
  54 |     await expect(page).toHaveURL('/login');
  55 |     const toast = page.locator('div[role="status"]');
  56 |     // Note: react-hot-toast uses aria-live elements
  57 |   });
  58 | });
  59 | 
```