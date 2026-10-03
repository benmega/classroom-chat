import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import AdvancedPanel from './AdvancedPanel';
import client from '../../api/client';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../components/admin/AdminPageHeader', () => ({
  default: () => <div data-testid="AdminPageHeader">Header</div>,
}));

describe('AdvancedPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the advanced actions and no API documentation link', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<AdvancedPanel />);

    expect(screen.getByText('Headless Database CRUD')).toBeInTheDocument();
    expect(screen.getByText('System Logs')).toBeInTheDocument();
    expect(screen.getByText('Purge History')).toBeInTheDocument();
    // Swagger/OpenAPI was removed (#85): there is no API Documentation entry.
    expect(screen.queryByText(/API Documentation/i)).not.toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('navigates to the headless database CRUD page', () => {
    render(<AdvancedPanel />);

    fireEvent.click(screen.getByText('Headless Database CRUD'));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/advanced-crud');
  });

  it('fetches and shows the system logs, then closes the modal', async () => {
    client.get.mockResolvedValue({ data: { status: 'success', data: { logs: 'line one\nline two' } } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('System Logs'));

    await waitFor(() => expect(screen.getByText(/line one/)).toBeInTheDocument());
    expect(client.get).toHaveBeenCalledWith('/api/admin/logs');

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText(/line one/)).not.toBeInTheDocument();
  });

  it('falls back to a placeholder when there are no logs', async () => {
    client.get.mockResolvedValue({ data: { status: 'success', data: { logs: '' } } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('System Logs'));

    await waitFor(() => expect(screen.getByText('No logs found.')).toBeInTheDocument());
  });

  it('toasts an error when the logs cannot be fetched', async () => {
    client.get.mockRejectedValue(new Error('boom'));

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('System Logs'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch system logs.'));
  });

  it('purges history after confirmation and closes the modal', async () => {
    client.post.mockResolvedValue({ data: { status: 'success' } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Purge History'));
    expect(screen.getByText('Confirm History Purge')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Yes, Delete All History'));

    await waitFor(() => expect(screen.queryByText('Confirm History Purge')).not.toBeInTheDocument());
    expect(client.post).toHaveBeenCalledWith('/api/admin/advanced/purge-history');
  });

  it('can cancel the purge without calling the API', () => {
    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Purge History'));

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Confirm History Purge')).not.toBeInTheDocument();
    expect(client.post).not.toHaveBeenCalled();
  });

  it('toasts an error when the purge fails and keeps the modal open', async () => {
    client.post.mockRejectedValue(new Error('boom'));

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Purge History'));
    fireEvent.click(screen.getByText('Yes, Delete All History'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to purge history.'));
    expect(screen.getByText('Confirm History Purge')).toBeInTheDocument();
  });

  it('shows the reason the server gives when the logs cannot be fetched', async () => {
    client.get.mockRejectedValue({ response: { status: 403, data: { error: 'Admin access required' } } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('System Logs'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Admin access required'));
  });

  it('shows the reason the server gives when the purge fails and keeps the modal open', async () => {
    client.post.mockRejectedValue({ response: { status: 500, data: { error: 'Failed to purge history: database is locked' } } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Purge History'));
    fireEvent.click(screen.getByText('Yes, Delete All History'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to purge history: database is locked'));
    expect(screen.getByText('Confirm History Purge')).toBeInTheDocument();
  });

  describe('keyboard and dialog semantics', () => {
    it('shows the logs in a modal dialog named by its title', async () => {
      client.get.mockResolvedValue({ data: { status: 'success', data: { logs: 'line one' } } });

      render(<AdvancedPanel />);
      fireEvent.click(screen.getByRole('button', { name: /System Logs/ }));

      const dialog = await screen.findByRole('dialog', { name: 'System Logs' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveTextContent('line one');
    });

    it('closes the logs with Escape and puts focus back on the button that opened them', async () => {
      const user = userEvent.setup();
      client.get.mockResolvedValue({ data: { status: 'success', data: { logs: 'line one' } } });

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: /System Logs/ }));
      await screen.findByRole('dialog', { name: 'System Logs' });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /System Logs/ })).toHaveFocus();
    });

    // A browser moves focus off a button that gets disabled (the focus fixup rule), and the buttons that open the
    // logs and the statistics are disabled while their data loads. happy-dom does not do that, so the request
    // mock drops the focus itself (the button is not disabled yet at that point, which happy-dom needs to blur it).
    it.each([
      ['System Logs', 'System Logs', { data: { status: 'success', data: { logs: 'line one' } } }],
    ])('returns focus to the %s button on close although the browser moved it off while the data loaded', async (name, dialogName, response) => {
      const user = userEvent.setup();
      client.get.mockImplementation(() => {
        document.activeElement.blur();
        return Promise.resolve(response);
      });

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: new RegExp(name) }));
      await screen.findByRole('dialog', { name: dialogName });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: new RegExp(name) })).toHaveFocus();
    });

    it('activates the Close and Refresh buttons with the keyboard (the dialog no longer swallows Enter and Space)', async () => {
      const user = userEvent.setup();
      client.get.mockResolvedValue({ data: { status: 'success', data: { logs: 'line one' } } });

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: /System Logs/ }));
      await screen.findByRole('dialog', { name: 'System Logs' });
      expect(client.get).toHaveBeenCalledTimes(1);

      screen.getByRole('button', { name: 'Refresh' }).focus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
      await user.keyboard(' ');
      await waitFor(() => expect(client.get).toHaveBeenCalledTimes(3));

      screen.getByRole('button', { name: 'Close' }).focus();
      await user.keyboard('{Enter}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the logs with the close button in the header', async () => {
      client.get.mockResolvedValue({ data: { status: 'success', data: { logs: 'line one' } } });

      render(<AdvancedPanel />);
      fireEvent.click(screen.getByRole('button', { name: /System Logs/ }));
      await screen.findByRole('dialog', { name: 'System Logs' });

      fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('starts the purge dialog on Cancel, not on the destructive button', async () => {
      const user = userEvent.setup();

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: /Purge History/ }));

      expect(screen.getByRole('dialog', { name: 'Confirm History Purge' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Yes, Delete All History' })).not.toHaveFocus();
    });

    it('cancels the purge with Escape, without calling the API, and returns focus to Purge History', async () => {
      const user = userEvent.setup();

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: /Purge History/ }));

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(client.post).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Purge History/ })).toHaveFocus();
    });

    it('cancels the purge with Enter on Cancel and confirms it with Enter on the destructive button', async () => {
      const user = userEvent.setup();
      client.post.mockResolvedValue({ data: { status: 'success' } });

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: /Purge History/ }));
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(client.post).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: /Purge History/ }));
      await user.tab();
      expect(screen.getByRole('button', { name: 'Yes, Delete All History' })).toHaveFocus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(client.post).toHaveBeenCalledWith('/api/admin/advanced/purge-history'));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('says the purge deletes messages, which is all that it deletes', () => {
      render(<AdvancedPanel />);
      fireEvent.click(screen.getByRole('button', { name: /Purge History/ }));

      const dialog = screen.getByRole('dialog', { name: 'Confirm History Purge' });
      expect(dialog).toHaveTextContent('delete all messages from the database');
      expect(dialog).not.toHaveTextContent(/conversations/i);
    });

    it('keeps Tab inside the purge dialog', async () => {
      const user = userEvent.setup();

      render(<AdvancedPanel />);
      await user.click(screen.getByRole('button', { name: /Purge History/ }));
      const close = screen.getByRole('button', { name: 'Close modal' });

      // Cancel has focus; Tab goes to the destructive button, then wraps to the header close button
      await user.tab();
      await user.tab();

      expect(close).toHaveFocus();
    });
  });
});
