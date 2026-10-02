import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminDashboard } from './useAdminDashboard';
import client from '../api/client';
import toast from 'react-hot-toast';

vi.mock('../api/client', () => ({
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

describe('useAdminDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockReset();
        client.post.mockReset();
    });

    it('fetches dashboard data on mount successfully', async () => {
        const mockData = { status: 'success', data: { users: 10 } };
        client.get.mockResolvedValueOnce({ data: mockData });

        const { result } = renderHook(() => useAdminDashboard());

        // Wait for fetch to complete
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(client.get).toHaveBeenCalledWith(expect.stringContaining('/api/admin/dashboard?days=7'));
        expect(result.current.dashboardData).toEqual({ users: 10 });
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
    });

    it('handles fetch error', async () => {
        client.get.mockRejectedValueOnce(new Error('Fetch error'));

        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data.');
        expect(result.current.isLoading).toBe(false);
    });

    it('toasts and stops loading when the server answers with a 500', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        client.get.mockRejectedValueOnce({ response: { status: 500, data: { status: 'error', error: 'Internal error' } } });

        const { result } = renderHook(() => useAdminDashboard());
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data.');
        expect(result.current.dashboardData).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isRefreshing).toBe(false);
        consoleError.mockRestore();
    });

    it('keeps the data it has when a later refresh fails', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: { users: 10 } } });
        const { result } = renderHook(() => useAdminDashboard());
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });
        client.get.mockRejectedValueOnce({ response: { status: 500 } });

        await act(async () => {
            await result.current.fetchDashboardData();
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data.');
        expect(result.current.dashboardData).toEqual({ users: 10 });
        expect(result.current.isRefreshing).toBe(false);
        consoleError.mockRestore();
    });

    it('toggles messages successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Messages toggled' } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleToggleMessages();
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/toggle-message-sending');
        
    });

    it('fails to toggle messages', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleToggleMessages();
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/toggle-message-sending');
        expect(toast.error).toHaveBeenCalledWith('Failed to toggle messaging.');
        expect(result.current.pendingToggle).toBe(false);
    });

    it('shows the server reason when the toggle is rejected', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { status: 403, data: { error: 'Admin access required' } } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleToggleMessages();
        });

        expect(toast.error).toHaveBeenCalledWith('Admin access required');
        expect(result.current.pendingToggle).toBe(false);
    });

    it('ignores a second toggle while the first request is still in flight', async () => {
        client.get.mockResolvedValue({ data: { status: 'success', data: {} } });
        let resolvePost;
        client.post.mockImplementationOnce(() => new Promise((resolve) => { resolvePost = resolve; }));
        const { result } = renderHook(() => useAdminDashboard());
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });
        expect(result.current.pendingToggle).toBe(false);

        let first;
        let second;
        await act(async () => {
            // Both calls see the same render, as a fast double click would.
            first = result.current.handleToggleMessages();
            second = result.current.handleToggleMessages();
        });

        expect(client.post).toHaveBeenCalledTimes(1);
        expect(result.current.pendingToggle).toBe(true);

        await act(async () => {
            resolvePost({ data: { success: true } });
            await Promise.all([first, second]);
        });

        expect(client.post).toHaveBeenCalledTimes(1);
        expect(result.current.pendingToggle).toBe(false);
        // The dashboard was refetched before the toggle was released.
        expect(client.get).toHaveBeenCalledTimes(2);

        // Once settled, the toggle works again.
        client.post.mockResolvedValueOnce({ data: { success: true } });
        await act(async () => {
            await result.current.handleToggleMessages();
        });
        expect(client.post).toHaveBeenCalledTimes(2);
    });

    it('releases the toggle after a failed request so it can be retried', async () => {
        client.get.mockResolvedValue({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce(new Error('Network error'));
        client.post.mockResolvedValueOnce({ data: { success: true } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleToggleMessages();
        });
        await act(async () => {
            await result.current.handleToggleMessages();
        });

        expect(client.post).toHaveBeenCalledTimes(2);
        expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it('updates multiplier successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleUpdateMultiplier(2.5);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/update_duck_multiplier', { multiplier: 2.5 });
        
    });

    it('fails to update multiplier', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleUpdateMultiplier(2.5);
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to update multiplier.');
    });

    it('shows the server reason when the multiplier is rejected', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { success: false, error: 'Multiplier must be between 0 and 100' } } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleUpdateMultiplier(500);
        });

        expect(toast.error).toHaveBeenCalledWith('Multiplier must be between 0 and 100');
    });

    it('shows the reason from an enveloped multiplier error', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { status: 'error', data: null, error: 'Invalid multiplier value' } } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleUpdateMultiplier('abc');
        });

        expect(toast.error).toHaveBeenCalledWith('Invalid multiplier value');
    });

    it('adds banned word successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Word added' } });
        const { result } = renderHook(() => useAdminDashboard());

        let res;
        await act(async () => {
            res = await result.current.handleAddBannedWord('badword', 'reason');
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/add-banned-word', expect.any(FormData));
        
        expect(res).toBe(true);
    });

    it('fails to add banned word empty', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        let res;
        await act(async () => {
            res = await result.current.handleAddBannedWord(' ', 'reason');
        });

        expect(client.post).not.toHaveBeenCalled();
        expect(res).toBe(false);
    });

    it('trims the banned word before sending it', async () => {
        client.get.mockResolvedValue({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleAddBannedWord('  padded \t', 'reason');
        });

        const [, formData] = client.post.mock.calls[0];
        expect(formData.get('word')).toBe('padded');
        expect(formData.get('reason')).toBe('reason');
    });

    it('is loading while the banned word request runs', async () => {
        client.get.mockResolvedValue({ data: { status: 'success', data: {} } });
        let resolvePost;
        client.post.mockImplementationOnce(() => new Promise((resolve) => { resolvePost = resolve; }));
        const { result } = renderHook(() => useAdminDashboard());

        let pending;
        await act(async () => {
            pending = result.current.handleAddBannedWord('word', '');
        });
        expect(result.current.formLoading).toBe(true);

        await act(async () => {
            resolvePost({ data: { success: true } });
            await pending;
        });
        expect(result.current.formLoading).toBe(false);
    });

    it('fails to add banned word api error', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { message: 'Word exists' } } });
        const { result } = renderHook(() => useAdminDashboard());

        let res;
        await act(async () => {
            res = await result.current.handleAddBannedWord('badword', 'reason');
        });

        expect(toast.error).toHaveBeenCalledWith('Word exists');
        expect(res).toBe(false);
    });

    describe('requests that overlap', () => {
        // A request the test answers by hand, so it decides in what order the answers arrive
        const deferred = () => {
            const handle = {};
            handle.promise = new Promise((resolve, reject) => {
                handle.resolve = resolve;
                handle.reject = reject;
            });
            return handle;
        };
        const answer = (users) => ({ data: { status: 'success', data: { users } } });
        const daysOf = (call) => new URL(client.get.mock.calls[call][0], 'http://localhost').searchParams.get('days');

        // Mounts with the 7 day request outstanding, then asks for 30 days while it is still out
        const startTwoRequests = () => {
            const week = deferred();
            const month = deferred();
            client.get.mockReturnValueOnce(week.promise).mockReturnValueOnce(month.promise);
            const hook = renderHook(() => useAdminDashboard());
            act(() => hook.result.current.setTimeframe(30));
            expect(client.get).toHaveBeenCalledTimes(2);
            expect(daysOf(0)).toBe('7');
            expect(daysOf(1)).toBe('30');
            return { ...hook, week, month };
        };

        it('keeps the data of the latest timeframe when an older answer arrives last', async () => {
            const { result, week, month } = startTwoRequests();

            await act(async () => { month.resolve(answer(30)); });
            expect(result.current.dashboardData).toEqual({ users: 30 });
            await act(async () => { week.resolve(answer(7)); });

            expect(result.current.dashboardData).toEqual({ users: 30 });
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isRefreshing).toBe(false);
        });

        it('ignores an older answer that arrives first and waits for the latest one', async () => {
            const { result, week, month } = startTwoRequests();

            await act(async () => { week.resolve(answer(7)); });
            expect(result.current.dashboardData).toBeNull();
            expect(result.current.isLoading).toBe(true);
            expect(result.current.isRefreshing).toBe(true);

            await act(async () => { month.resolve(answer(30)); });
            expect(result.current.dashboardData).toEqual({ users: 30 });
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isRefreshing).toBe(false);
        });

        it('does not toast for an older request that failed after a newer one worked', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const { result, week, month } = startTwoRequests();

            await act(async () => { month.resolve(answer(30)); });
            await act(async () => { week.reject(new Error('timeout')); });

            expect(toast.error).not.toHaveBeenCalled();
            expect(result.current.dashboardData).toEqual({ users: 30 });
            expect(result.current.isRefreshing).toBe(false);
            consoleError.mockRestore();
        });

        it('still toasts when the latest request is the one that fails', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const { result, week, month } = startTwoRequests();

            await act(async () => { week.resolve(answer(7)); });
            await act(async () => { month.reject(new Error('timeout')); });

            expect(toast.error).toHaveBeenCalledTimes(1);
            expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard data.');
            expect(result.current.dashboardData).toBeNull();
            expect(result.current.isLoading).toBe(false);
            consoleError.mockRestore();
        });

        it('lets a refresh after an action supersede a timeframe request that is still out', async () => {
            const week = deferred();
            const refresh = deferred();
            client.get.mockReturnValueOnce(week.promise).mockReturnValueOnce(refresh.promise);
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const { result } = renderHook(() => useAdminDashboard());

            await act(async () => { await result.current.handleUpdateMultiplier(2); });
            await act(async () => { refresh.resolve(answer(2)); });
            await act(async () => { week.resolve(answer(7)); });

            expect(result.current.dashboardData).toEqual({ users: 2 });
        });
    });

});
