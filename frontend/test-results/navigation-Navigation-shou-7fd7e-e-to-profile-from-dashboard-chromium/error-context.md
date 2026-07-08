# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.js >> Navigation >> should navigate to profile from dashboard
- Location: tests-e2e\navigation.spec.js:66:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByTestId('profile-toggle')
Expected: visible
Received: hidden
Timeout:  15000ms

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByTestId('profile-toggle')
    33 × locator resolved to <button title="Account" aria-haspopup="true" aria-expanded="false" class="profile-toggle" data-testid="profile-toggle">…</button>
       - unexpected value "hidden"

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
  - textbox "What's on your mind, testuser?"
  - text: For
  - checkbox "Live"
  - img
  - text: Live
  - button "Add emoji":
    - img
  - button "Post message" [disabled]:
    - img
    - text: Post
  - text: No messages to display. Be the first to post!
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
> 67 |     await expect(page.getByTestId('profile-toggle')).toBeVisible({ timeout: 15000 });
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  68 |     await page.getByTestId('profile-toggle').click();
  69 |     await page.getByTestId('nav-profile').click();
  70 |     await expect(page).toHaveURL(/\/profile/);
  71 |   });
  72 | 
  73 |   test('should navigate to bit-shift', async ({ page }) => {
  74 |     await expect(page.getByTestId('nav-bit-shift')).toBeVisible({ timeout: 15000 });
  75 |     await page.getByTestId('nav-bit-shift').click();
  76 |     await expect(page).toHaveURL('/bit-shift');
  77 |   });
  78 | });
  79 | 
```