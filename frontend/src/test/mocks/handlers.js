import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock checkAuth status
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

  // Mock login
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
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401 }
    );
  }),

  // Mock logout
  http.get('*/user/logout', () => {
    return HttpResponse.json({ success: true });
  }),
];
