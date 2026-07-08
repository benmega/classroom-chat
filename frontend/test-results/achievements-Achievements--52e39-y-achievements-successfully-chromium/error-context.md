# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: achievements.spec.js >> Achievements Page >> should display achievements successfully
- Location: tests-e2e\achievements.spec.js:67:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.achievement-desc').filter({ hasText: 'Log in for the first time' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.achievement-desc').filter({ hasText: 'Log in for the first time' })

```

```yaml
- complementary:
  - link "Classroom Chat Logo":
    - /url: /chat
    - img "Classroom Chat Logo"
  - link "Chat":
    - /url: /chat
    - img
    - text: Chat
  - link "Submit Work":
    - /url: /submit-work
    - img
    - text: Submit Work
  - link "Learning Path":
    - /url: /profile
    - img
    - text: Learning Path
  - link "BitShift":
    - /url: /bit-shift
    - img
    - text: BitShift
  - link "Profile":
    - /url: /profile
    - img
    - text: Profile
  - link "Settings":
    - /url: /settings
    - img
    - text: Settings
  - button "Logout":
    - img
    - text: Logout
- banner:
  - img
  - textbox "Search users..."
  - navigation:
    - list:
      - listitem:
        - link "100":
          - /url: /bit-shift
          - img
          - text: "100"
- main:
  - heading "Hall of Achievements" [level=1]
  - paragraph: Track your progress and earn badges.
  - strong: "1"
  - text: / 1 Badges 100%
  - img
  - textbox "Search badges..."
  - button "All Categories":
    - img
    - text: All Categories
    - img
  - heading "First Steps" [level=3]
  - img
  - text: "+10"
```

# Test source

```ts
  1  | ﻿import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Achievements Page', () => {
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
  17 |             user: { id: 1, username: 'testuser', role: 'student', is_admin: false, duck_balance: 100 }
  18 |           }
  19 |         }),
  20 |       });
  21 |     });
  22 | 
  23 |     // Mock achievements API
  24 |     await page.route('**/api/achievements/all', async (route) => {
  25 |       await route.fulfill({
  26 |         status: 200,
  27 |         contentType: 'application/json',
  28 |         body: JSON.stringify({
  29 |           data: {
  30 |             achievements: [
  31 |               { 
  32 |                 id: 1, 
  33 |                 name: 'First Steps', 
  34 |                 description: 'Log in for the first time', 
  35 |                 reward: 10, 
  36 |                 slug: 'first-steps',
  37 |                 type: 'progress',
  38 |                 current_progress: 1,
  39 |                 requirement_value: 1
  40 |               }
  41 |             ],
  42 |             user_achievements: [1]
  43 |           }
  44 |         }),
  45 |       });
  46 |     });
  47 | 
  48 |     // Mock heartbeat
  49 |     await page.route('**/heartbeat', async (route) => {
  50 |       await route.fulfill({
  51 |         status: 200,
  52 |         contentType: 'application/json',
  53 |         body: JSON.stringify({ status: 'success' }),
  54 |       });
  55 |     });
  56 | 
  57 |     // Mock message endpoints
  58 |     await page.route('**/message/**', async (route) => {
  59 |       await route.fulfill({
  60 |         status: 200,
  61 |         contentType: 'application/json',
  62 |         body: JSON.stringify({}),
  63 |       });
  64 |     });
  65 |   });
  66 | 
  67 |   test('should display achievements successfully', async ({ page }) => {
  68 |     // Navigate to the Achievements page
  69 |     await page.goto('/achievements');
  70 |     
  71 |     // Wait for the achievement name to be visible
  72 |     await expect(page.locator('.achievement-name', { hasText: 'First Steps' })).toBeVisible({ timeout: 10000 });
  73 |     
  74 |     // Wait for the description to be visible
> 75 |     await expect(page.locator('.achievement-desc', { hasText: 'Log in for the first time' })).toBeVisible({ timeout: 10000 });
     |                                                                                               ^ Error: expect(locator).toBeVisible() failed
  76 |   });
  77 | });
  78 | 
```