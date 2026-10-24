import { test, expect, respondJson, STUDENT } from './support/mockBackend.js';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page, backend }) => {
    await backend.mockSession(null);
    await page.goto('/login');
  });

  test('should log in successfully with valid credentials', async ({ page, backend }) => {
    let sentCredentials;
    await backend.mock('/user/login', async (route) => {
      sentCredentials = route.request().postDataJSON();
      await respondJson({ user: STUDENT, awarded_duck: true })(route);
    });
    // Signing in lands on /chat, which loads its own data behind the new session.
    await backend.mockLayout();
    await backend.mockChat();

    await page.fill('input#usernameOrEmail', 'testuser');
    await page.fill('input[placeholder="Password"]', 'password123');
    await page.click('button[id="login-submit-btn"]');

    await expect(page).toHaveURL('/chat');
    await expect(page.getByTestId('feed-container')).toBeVisible();
    await expect(page.getByText('Login successful!')).toBeVisible();
    await expect(page.getByText('Welcome! Daily duck awarded.')).toBeVisible();
    expect(sentCredentials).toEqual({ username: 'testuser', password: 'password123' });
  });

  test('should show error on invalid credentials', async ({ page, backend }) => {
    // The backend answers a failed JSON login with a 401 and this body.
    await backend.mock('/user/login', respondJson({ error: 'Invalid username or password.' }, 401));

    await page.fill('input#usernameOrEmail', 'wronguser');
    await page.fill('input[placeholder="Password"]', 'wrongpass');
    await page.click('button[id="login-submit-btn"]');

    // The toast shows the response was handled; only then does staying on /login mean something.
    await expect(page.getByRole('alert')).toHaveText('Invalid username or password.');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Login successful!')).toHaveCount(0);
    await expect(page.locator('button[id="login-submit-btn"]')).toBeEnabled();
  });
});
