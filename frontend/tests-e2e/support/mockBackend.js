import { test as base, expect } from '@playwright/test';

export { expect };

// Specs built on this fixture run against the Vite dev server alone: every call the page makes to the
// backend must be answered by a mock, so the result is the same with a backend running (CI) and without.
// A call nothing mocks is answered with a 501 and fails the test when it ends. Without that, a live
// backend would answer a faked session with a 401, which the API client treats as an expired session
// and answers by signing the user out under the assertions.

// The paths vite.config.js forwards to the backend.
const BACKEND_PREFIXES = ['/api', '/message', '/user', '/challenge', '/duck_trade', '/notes', '/static', '/socket.io'];

const isBackendPath = (pathname) => BACKEND_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const respondJson = (body, status = 200) => async (route) => {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
};

export const STUDENT = {
  id: 1, username: 'testuser', role: 'student', packets: 0, duck_balance: 100, has_seen_tutorial: true,
};

export const ADMIN = {
  id: 2, username: 'testadmin', role: 'admin', packets: 0, duck_balance: 0, has_seen_tutorial: true,
};

export const test = base.extend({
  backend: async ({ page }, provide) => {
    const unmocked = [];
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    // Registered first, so every later mock wins over it (Playwright runs the newest matching route first).
    await page.route((url) => isBackendPath(url.pathname), async (route) => {
      const request = route.request();
      // Page navigations (/user/profile/:slug is also an SPA path) are the dev server's to answer.
      if (!['xhr', 'fetch'].includes(request.resourceType())) {
        await route.fallback();
        return;
      }
      unmocked.push(`${request.method()} ${new URL(request.url()).pathname}`);
      await respondJson({ error: 'No mock for this request' }, 501)(route);
    });

    // There is no chat server: let the socket's polling handshake fail, so it sits in its reconnect loop.
    await page.route((url) => url.pathname.startsWith('/socket.io/'), (route) => route.abort('connectionrefused'));

    const backend = {
      unmocked,
      // Answers every call to the path (query string ignored). `reply` is a JSON body or a route handler.
      mock: (pathname, reply) => page.route(
        (url) => url.pathname === pathname,
        typeof reply === 'function' ? reply : respondJson(reply),
      ),
      // The auth check every page of the app makes. user = null is a signed-out visitor.
      mockSession: (user) => backend.mock(
        '/user/api/auth/status',
        { data: user ? { logged_in: true, user } : { logged_in: false } },
      ),
      // What the student/teacher page shell (Layout) calls: the heartbeat and the unread badge.
      mockLayout: async () => {
        await backend.mock('/api/session/heartbeat', { status: 'success' });
        await backend.mock('/message/api/unread-count', { count: 0, latest_id: null });
      },
      // What /chat loads on top of that: the classroom context and the feed.
      mockChat: async () => {
        await backend.mock('/message/api/me/context', { global_conversation_id: null, classrooms: [], users: [] });
        await backend.mock('/message/api/feed', { messages: [] });
      },
    };

    // Not named `use`, the name Playwright documents: the react-hooks lint rule mistakes that for a React hook.
    await provide(backend);

    expect(unmocked, 'backend calls no mock answered').toEqual([]);
    expect(pageErrors, 'uncaught errors in the page').toEqual([]);
  },
});
