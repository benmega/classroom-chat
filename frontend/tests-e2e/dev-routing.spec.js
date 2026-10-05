import { test, expect } from '@playwright/test';

// Hard loads of SPA paths must reach the app on the Vite dev server. The proxy forwards backend
// prefixes such as /user to Flask; a path that only starts like one (/users) or that is both an API
// and an SPA path (/user/profile/:slug) used to be answered by the backend instead of the app.
// Only XHR/fetch/socket calls are mocked, so page loads go through the real dev server and proxy.
const BACKEND_PREFIX = /^\/(api|user|message|notes|duck_trade|challenge|static|socket\.io)(\/|$)/;
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

test.beforeEach(async ({ page }) => {
  await page.route((url) => BACKEND_PREFIX.test(url.pathname), async (route) => {
    const request = route.request();
    if (request.resourceType() === 'document') return route.fallback();
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/socket.io') || pathname.startsWith('/static')) {
      return route.fulfill({ status: 404, body: '' });
    }
    if (pathname === '/user/api/auth/status') {
      return json(route, {
        data: {
          logged_in: true,
          user: { id: 1, username: 'testuser', role: 'student', is_admin: false, packets: 0, duck_balance: 0, has_seen_tutorial: true },
        },
      });
    }
    if (pathname.startsWith('/user/profile')) {
      const user = { id: 1, username: 'testuser', role: 'student' };
      return json(route, { status: 'success', data: { target: user, viewer: user } });
    }
    if (pathname === '/message/api/me/context') return json(route, { classrooms: [], users: [] });
    if (pathname === '/message/api/unread-count') return json(route, { count: 0, latest_id: null });
    return json(route, {});
  });
  await page.addInitScript(() => window.localStorage.setItem('hasSeenTutorial', 'true'));
});

test('a path that only starts like a backend prefix is served by the app', async ({ page }) => {
  const response = await page.goto('/users');
  expect(response.ok()).toBe(true);
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15000 });
});

test('a printed /user/profile/:slug link opens the app and redirects to the profile page', async ({ page }) => {
  const response = await page.goto('/user/profile/demo-slug');
  expect(response.ok()).toBe(true);
  await expect(page).toHaveURL(/\/profile\/demo-slug$/, { timeout: 15000 });
});
