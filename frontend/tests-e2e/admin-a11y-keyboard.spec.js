import { test, expect, respondJson, ADMIN } from './support/mockBackend.js';

// Keyboard-only use of the admin app (#75): Tab, Shift+Tab, Enter, Space and Escape through the sidebar,
// the dashboard cards, the user directory and its menus, and the dialogs. These need a real browser: Tab
// order, focus restore and the stylesheet's hiding of controls are not things a DOM simulation decides.
// The session and every admin call are mocked, so no backend is needed.

const REVIEW_COUNTS = {
  status: 'success',
  data: {
    pending_users: 0, pending_trades: 0, pending_projects: 0, pending_certificates: 0,
    pending_course_requests: 0, pending_submissions: 0, total_incomplete: 0,
  },
};

const DASHBOARD = {
  status: 'success',
  data: {
    total_ducks: 1200,
    ducks_earned_this_week: 85,
    total_users_count: 3,
    active_users_count: 1,
    user_distribution: { active_students: 1, inactive_students: 1, parents: 0, admins: 1 },
    top_earners: [{ id: 11, username: 'student_a', nickname: 'Student A', duck_balance: 50 }],
    config: { message_sending_enabled: true, duck_multiplier: 1 },
    chart_data: {
      dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
      labels: ['Mon', 'Tue', 'Wed'],
      earned: [10, 20, 15],
      spent: [5, 8, 12],
      max_history_days: 90,
    },
  },
};

const USERS = {
  users: [
    {
      id: 11, username: 'student_a', nickname: 'Student A', role: 'student',
      duck_balance: 50, packets: 2, total_levels: 3, is_online: true, can_chat: true,
    },
    {
      id: 12, username: 'parent_a', nickname: null, role: 'parent',
      duck_balance: 0, packets: 0, total_levels: 0, is_online: false, can_chat: false,
    },
  ],
  total: 2,
  pages: 1,
  stats: { online: 1, admins: 0, pending: 0 },
};

// Presses Tab until the control has focus. Unlike a bounded loop that gives up silently, it fails the test
// when the control is not in the tab order at all, which is the failure this spec exists to catch.
const tabTo = async (page, locator, maxPresses = 60) => {
  for (let i = 0; i <= maxPresses; i += 1) {
    if (await locator.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached the control in ${maxPresses} presses`);
};

test.describe('Admin keyboard-only access', () => {
  test.beforeEach(async ({ backend }) => {
    await backend.mockSession(ADMIN);
    await backend.mock('/api/admin/review_counts', REVIEW_COUNTS);
    await backend.mock('/api/admin/dashboard', DASHBOARD);
    await backend.mock('/api/admin/users', USERS);
  });

  test('the sidebar is in the tab order, marks the current page and Enter follows a link', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    const current = page.getByRole('link', { name: 'Admin Dashboard' });
    await expect(current).toHaveAttribute('aria-current', 'page');

    const tests = page.getByRole('link', { name: 'Tests', exact: true });
    const advanced = page.getByRole('link', { name: 'Advanced System CRUD' });
    await tabTo(page, advanced);
    // Shift+Tab walks back through the same list, one link at a time.
    await page.keyboard.press('Shift+Tab');
    await expect(tests).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(advanced).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/admin/advanced');
    await expect(page.getByRole('heading', { level: 1, name: 'Database' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Advanced System CRUD' })).toHaveAttribute('aria-current', 'page');
  });

  test('the dashboard stat cards are buttons: Enter and Space open the user directory', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const totalUsers = page.getByRole('button', { name: /Total Users/ });
    const online = page.getByRole('button', { name: /Online Users/ });
    await expect(totalUsers).toBeVisible();
    // A card that only shows a figure is not a control.
    await expect(page.getByRole('button', { name: /Avg\. Balance/ })).toHaveCount(0);

    await tabTo(page, totalUsers);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/admin/users');
    await expect(page.getByRole('heading', { level: 1, name: 'User Directory' })).toBeVisible();

    await page.goBack();
    await expect(online).toBeVisible();
    await tabTo(page, online);
    await page.keyboard.press('Space');
    await expect(page).toHaveURL('/admin/users?filter=online');
  });

  test('Content Moderation opens a dialog that holds focus, closes on Escape and submits with Enter', async ({ page, backend }) => {
    let sentWord;
    await backend.mock('/api/admin/add-banned-word', async (route) => {
      sentWord = route.request().postData();
      await respondJson({ success: true })(route);
    });
    await page.goto('/admin/dashboard');
    const opener = page.getByRole('button', { name: 'Content Moderation' });
    await expect(opener).toBeVisible();

    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Add Banned Word' });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close modal' });
    const word = dialog.getByLabel('Word to Ban');
    const submit = dialog.getByRole('button', { name: 'Ban Word' });

    // Focus moves into the dialog and Tab cycles inside it, in both directions.
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(word).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(submit).toBeFocused();

    // Escape closes it and gives focus back to the button that opened it.
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(word).toBeFocused();
    await page.keyboard.type('badword');
    await page.keyboard.press('Enter');

    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(sentWord).toContain('badword');
  });

  test('the purge confirmation starts on Cancel, keeps Tab inside and Escape never purges', async ({ page }) => {
    // /api/admin/advanced/purge-history is deliberately not mocked: a call to it fails the test.
    await page.goto('/admin/advanced');
    const opener = page.getByRole('button', { name: 'Purge History' });
    await expect(opener).toBeVisible();

    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Confirm History Purge' });
    await expect(dialog).toBeVisible();
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    const confirm = dialog.getByRole('button', { name: 'Yes, Delete All History' });
    const close = dialog.getByRole('button', { name: 'Close modal' });

    await expect(cancel).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(confirm).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();

    // Enter on the safe default closes the dialog the same way.
    await page.keyboard.press('Enter');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test('System Logs opens with Space and Escape returns focus to its button', async ({ page, backend }) => {
    await backend.mock('/api/admin/logs', { status: 'success', data: { logs: 'line one\nline two' } });
    await page.goto('/admin/advanced');
    const opener = page.getByRole('button', { name: 'System Logs' });
    await expect(opener).toBeVisible();

    await tabTo(page, opener);
    await page.keyboard.press('Space');
    const dialog = page.getByRole('dialog', { name: 'System Logs' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('line two');
    // The button is disabled while the logs load, so focus goes into the dialog, not back to the button.
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test.describe('user directory', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin/users');
      await expect(page.getByRole('heading', { level: 1, name: 'User Directory' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Student A' })).toBeVisible();
    });

    test('a user is reachable as a link and the row menu opens and closes from the keyboard', async ({ page }) => {
      const name = page.getByRole('link', { name: 'Student A' });
      await expect(name).toHaveAttribute('href', '/admin/users/11');
      await tabTo(page, name);
      await expect(name).toBeFocused();

      // Tab continues to the row's action button, which says whose menu it is and whether it is open.
      const trigger = page.getByRole('button', { name: 'Actions for @student_a' });
      await page.keyboard.press('Tab');
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const menu = page.locator(`#${await trigger.getAttribute('aria-controls')}`);
      await expect(menu).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(menu.getByRole('button', { name: 'Adjust Ducks' })).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toHaveCount(0);
      await expect(trigger).toBeFocused();

      await page.keyboard.press('Space');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    test('a menu action opens a dialog with focus inside, wrapping Tab, and Escape closes it', async ({ page }) => {
      const trigger = page.getByRole('button', { name: 'Actions for @student_a' });
      await tabTo(page, trigger);
      await page.keyboard.press('Enter');
      const reset = page.getByRole('button', { name: 'Reset Password' });
      await tabTo(page, reset);
      await page.keyboard.press('Enter');

      const dialog = page.getByRole('dialog', { name: 'Reset User Password' });
      await expect(dialog).toBeVisible();
      // The menu closed behind the dialog; focus starts on the dialog's first control.
      const close = dialog.getByRole('button', { name: 'Close modal' });
      await expect(close).toBeFocused();
      // Shift+Tab from the first control wraps to the last instead of leaving the dialog.
      await page.keyboard.press('Shift+Tab');
      await expect(close).not.toBeFocused();
      await expect(dialog.locator(':focus')).toHaveCount(1);
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });
  });
});
