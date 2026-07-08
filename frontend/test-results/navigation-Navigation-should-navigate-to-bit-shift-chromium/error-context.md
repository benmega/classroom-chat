# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.js >> Navigation >> should navigate to bit-shift
- Location: tests-e2e\navigation.spec.js:73:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/chat", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - link "Classroom Chat Logo" [ref=e5] [cursor=pointer]:
      - /url: /chat
      - img "Classroom Chat Logo" [ref=e6]
    - generic [ref=e7]:
      - link "Chat" [ref=e10] [cursor=pointer]:
        - /url: /chat
        - img [ref=e11]
        - text: Chat
      - link "Submit Work" [ref=e14] [cursor=pointer]:
        - /url: /submit-work
        - img [ref=e15]
        - text: Submit Work
      - link "Learning Path" [ref=e20] [cursor=pointer]:
        - /url: /profile
        - img [ref=e21]
        - text: Learning Path
      - link "BitShift" [ref=e24] [cursor=pointer]:
        - /url: /bit-shift
        - img [ref=e25]
        - text: BitShift
      - link "Profile" [ref=e31] [cursor=pointer]:
        - /url: /profile
        - img [ref=e32]
        - text: Profile
    - generic [ref=e35]:
      - link "Settings" [ref=e37] [cursor=pointer]:
        - /url: /settings
        - img [ref=e38]
        - text: Settings
      - button "Logout" [ref=e42] [cursor=pointer]:
        - img [ref=e43]
        - text: Logout
  - generic [ref=e46]:
    - banner [ref=e47]:
      - generic [ref=e48]:
        - generic [ref=e51]:
          - img [ref=e52]
          - textbox "Search users..." [ref=e55]
        - navigation [ref=e56]:
          - list [ref=e57]:
            - listitem [ref=e58]:
              - link "100" [ref=e59] [cursor=pointer]:
                - /url: /bit-shift
                - img [ref=e60]
                - generic [ref=e71]: "100"
    - main [ref=e72]:
      - generic [ref=e74]:
        - generic [ref=e77]:
          - textbox "What's on your mind, testuser?" [ref=e78]
          - generic [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e81]: For
              - generic "Send to online users" [ref=e82] [cursor=pointer]:
                - checkbox "Live" [ref=e83]
                - img [ref=e84]
                - text: Live
            - generic [ref=e90]:
              - button "Add emoji" [ref=e92] [cursor=pointer]:
                - img [ref=e93]
              - button "Post message" [disabled] [ref=e96]:
                - img [ref=e97]
                - text: Post
        - generic [ref=e102]: No messages to display. Be the first to post!
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
> 63 |     await page.goto('/chat');
     |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
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
  74 |     await expect(page.getByTestId('nav-bit-shift')).toBeVisible({ timeout: 15000 });
  75 |     await page.getByTestId('nav-bit-shift').click();
  76 |     await expect(page).toHaveURL('/bit-shift');
  77 |   });
  78 | });
  79 | 
```