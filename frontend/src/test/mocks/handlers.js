import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/user/api/auth/status', () => {
    return HttpResponse.json({
      data: {
        logged_in: true,
        user: {
          id: 1,
          username: 'testuser',
          role: 'student',
          ducks: 10,
        },
      },
    });
  }),

  http.post('*/user/login', async ({ request }) => {
    const { username, password } = await request.json();
    
    if (username === 'testuser' && password === 'password123') {
      return HttpResponse.json({
        user: {
          id: 1,
          username: 'testuser',
          role: 'student',
          ducks: 10,
        },
        awarded_duck: true,
      });
    }

    return new HttpResponse(
      JSON.stringify({ error: 'Invalid username or password.' }),
      { status: 401 }
    );
  }),

  http.get('*/user/logout', () => {
    return HttpResponse.json({ status: 'success', message: 'Logged out' });
  }),

  // Silence session heartbeat requests in tests
  http.post('*/api/session/heartbeat', () => {
    return HttpResponse.json({ success: true });
  }),
];
