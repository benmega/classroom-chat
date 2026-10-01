import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText('Server Performance Stats')).toBeInTheDocument();
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

  it('fetches and shows the extended server statistics', async () => {
    client.get.mockResolvedValue({
      data: {
        status: 'success',
        data: {
          memory_usage_mb: 128,
          cpu_percent: 7,
          uptime_seconds: 7380,
          table_counts: { users: 3, messages: 12 },
        },
      },
    });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Server Performance Stats'));

    await waitFor(() => expect(screen.getByText('Server Statistics')).toBeInTheDocument());
    expect(client.get).toHaveBeenCalledWith('/api/admin/advanced/stats-extended');
    expect(screen.getByText('128 MB')).toBeInTheDocument();
    expect(screen.getByText('2h 3m')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Server Statistics')).not.toBeInTheDocument();
  });

  it('toasts an error when the statistics cannot be fetched', async () => {
    client.get.mockRejectedValue(new Error('boom'));

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Server Performance Stats'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch server statistics.'));
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

  it('shows the reason the server gives when the statistics cannot be fetched', async () => {
    client.get.mockRejectedValue({ response: { status: 500, data: { status: 'error', data: null, error: 'Statistics unavailable' } } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Server Performance Stats'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Statistics unavailable'));
  });

  it('shows the reason the server gives when the purge fails and keeps the modal open', async () => {
    client.post.mockRejectedValue({ response: { status: 500, data: { error: 'Failed to purge history: database is locked' } } });

    render(<AdvancedPanel />);
    fireEvent.click(screen.getByText('Purge History'));
    fireEvent.click(screen.getByText('Yes, Delete All History'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to purge history: database is locked'));
    expect(screen.getByText('Confirm History Purge')).toBeInTheDocument();
  });
});
