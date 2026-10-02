import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import Users from './Users';

// Unlike Users.test.jsx this runs the real useUsersManagement hook against a mocked server, so it
// counts the requests a click on Next or Previous really causes.
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const TOTAL = 120;

// The real endpoint echoes the page it was asked for and names its users after it
const servePages = () => {
  const requested = [];
  server.use(
    http.get('*/api/admin/users', ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get('page'));
      requested.push(page);
      return HttpResponse.json({
        users: [{ id: page, username: `onpage${page}`, nickname: `Page ${page} user`, role: 'student' }],
        total: TOTAL,
        pages: 3,
        current_page: page,
        stats: { online: 0, admins: 0, pending: 0 },
      });
    })
  );
  return requested;
};

const quiet = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
const next = () => screen.getByText(/Next/i).closest('button');
const previous = () => screen.getByText(/Previous/i).closest('button');
const pageIndicator = () => document.querySelector('.page-indicator').textContent;

describe('Users page pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the first page after a single request', async () => {
    const requested = servePages();

    renderWithProviders(<Users />);

    expect(await screen.findByText('@onpage1')).toBeInTheDocument();
    await quiet();
    expect(requested).toEqual([1]);
    expect(pageIndicator()).toBe('Page 1 of 3');
  });

  it('requests each page once when the user steps through with Next and Previous', async () => {
    const requested = servePages();
    renderWithProviders(<Users />);
    await screen.findByText('@onpage1');
    await waitFor(() => expect(next()).toBeEnabled());

    fireEvent.click(next());
    expect(await screen.findByText('@onpage2')).toBeInTheDocument();
    await quiet();
    expect(requested).toEqual([1, 2]);
    expect(pageIndicator()).toBe('Page 2 of 3');

    await waitFor(() => expect(next()).toBeEnabled());
    fireEvent.click(next());
    expect(await screen.findByText('@onpage3')).toBeInTheDocument();
    await quiet();
    expect(requested).toEqual([1, 2, 3]);
    expect(next()).toBeDisabled();

    await waitFor(() => expect(previous()).toBeEnabled());
    fireEvent.click(previous());
    expect(await screen.findByText('@onpage2')).toBeInTheDocument();
    await quiet();
    expect(requested).toEqual([1, 2, 3, 2]);
    expect(pageIndicator()).toBe('Page 2 of 3');
  });

  it('shows the range of the page it moved to', async () => {
    servePages();
    renderWithProviders(<Users />);
    await screen.findByText('@onpage1');
    await waitFor(() => expect(next()).toBeEnabled());

    fireEvent.click(next());
    await screen.findByText('@onpage2');

    expect(document.querySelector('.pagination-info').textContent.replace(/\s+/g, ' ').trim())
      .toBe(`Showing 51-100 of ${TOTAL} users`);
  });
});
