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

    it('toggles AI successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'AI toggled' } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await act(async () => {
            await result.current.handleToggleAI();
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/toggle-ai');
        expect(toast.success).toHaveBeenCalledWith('AI toggled');
        expect(client.get).toHaveBeenCalledTimes(2); // refetch
    });

    it('fails to toggle AI', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        await act(async () => {
            await result.current.handleToggleAI();
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/toggle-ai');
        expect(toast.error).toHaveBeenCalledWith('Failed to toggle AI.');
    });

    it('toggles messages successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Messages toggled' } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleToggleMessages();
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/toggle-message-sending');
        expect(toast.success).toHaveBeenCalledWith('Messages toggled');
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
    });

    it('updates multiplier successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleUpdateMultiplier(2.5);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/update_duck_multiplier', { multiplier: 2.5 });
        expect(toast.success).toHaveBeenCalledWith('Multiplier updated!');
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

    it('adds banned word successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Word added' } });
        const { result } = renderHook(() => useAdminDashboard());

        let res;
        await act(async () => {
            res = await result.current.handleAddBannedWord('badword', 'reason');
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/add-banned-word', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('Word added');
        expect(res).toBe(true);
    });

    it('fails to add banned word empty', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleAddBannedWord(' ', 'reason');
        });

        expect(client.post).not.toHaveBeenCalled();
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

    it('validates user creation', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const userIn = document.createElement('input');
        userIn.name = 'username';
        userIn.value = 'a';
        const passIn = document.createElement('input');
        passIn.name = 'password';
        passIn.value = '123';
        form.appendChild(userIn);
        form.appendChild(passIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleCreateUser(mockEvent);
        });

        expect(result.current.formErrors).toEqual({
            username: '3-30 chars, lowercase, numbers, or underscores.',
            password: 'Password must be at least 6 characters.'
        });
        expect(client.post).not.toHaveBeenCalled();
    });

    it('creates user successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'User created' } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const userIn = document.createElement('input');
        userIn.name = 'username';
        userIn.value = 'testuser';
        const passIn = document.createElement('input');
        passIn.name = 'password';
        passIn.value = 'password123';
        form.appendChild(userIn);
        form.appendChild(passIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleCreateUser(mockEvent);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/create_user', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('User created');
        expect(result.current.formErrors).toEqual({});
    });

    it('fails to create user api error', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { message: 'Username taken' } } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const userIn = document.createElement('input');
        userIn.name = 'username';
        userIn.value = 'testuser';
        const passIn = document.createElement('input');
        passIn.name = 'password';
        passIn.value = 'password123';
        form.appendChild(userIn);
        form.appendChild(passIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleCreateUser(mockEvent);
        });

        expect(toast.error).toHaveBeenCalledWith('Username taken');
    });

    it('adjusts ducks validation', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleAdjustDucks(mockEvent);
        });

        expect(result.current.formErrors).toEqual({
            amount: 'Adjustment amount is required'
        });
    });

    it('adjusts ducks successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Ducks adjusted' } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const amountIn = document.createElement('input');
        amountIn.name = 'amount';
        amountIn.value = '10';
        form.appendChild(amountIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleAdjustDucks(mockEvent);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/adjust_ducks', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('Ducks adjusted');
    });
    
    it('fails to adjust ducks api error', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { message: 'User not found' } } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const amountIn = document.createElement('input');
        amountIn.name = 'amount';
        amountIn.value = '10';
        form.appendChild(amountIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleAdjustDucks(mockEvent);
        });

        expect(toast.error).toHaveBeenCalledWith('User not found');
    });

    it('validates reset password', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const userIn = document.createElement('input');
        userIn.name = 'username';
        userIn.value = 'testuser';
        const newPassIn = document.createElement('input');
        newPassIn.name = 'new_password';
        newPassIn.value = 'pass123';
        const confPassIn = document.createElement('input');
        confPassIn.name = 'confirm_password';
        confPassIn.value = 'pass456';
        form.appendChild(userIn);
        form.appendChild(newPassIn);
        form.appendChild(confPassIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleResetPassword(mockEvent);
        });

        expect(result.current.formErrors).toEqual({
            confirm_password: 'Passwords do not match'
        });
    });

    it('resets password successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Password reset' } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const userIn = document.createElement('input');
        userIn.name = 'username';
        userIn.value = 'testuser';
        const newPassIn = document.createElement('input');
        newPassIn.name = 'new_password';
        newPassIn.value = 'pass123';
        const confPassIn = document.createElement('input');
        confPassIn.name = 'confirm_password';
        confPassIn.value = 'pass123';
        form.appendChild(userIn);
        form.appendChild(newPassIn);
        form.appendChild(confPassIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleResetPassword(mockEvent);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/reset_password', {
            username: 'testuser',
            new_password: 'pass123'
        });
        expect(toast.success).toHaveBeenCalledWith('Password reset');
    });
    
    it('fails to reset password api error', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { message: 'Reset failed' } } });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const userIn = document.createElement('input');
        userIn.name = 'username';
        userIn.value = 'testuser';
        const newPassIn = document.createElement('input');
        newPassIn.name = 'new_password';
        newPassIn.value = 'pass123';
        const confPassIn = document.createElement('input');
        confPassIn.name = 'confirm_password';
        confPassIn.value = 'pass123';
        form.appendChild(userIn);
        form.appendChild(newPassIn);
        form.appendChild(confPassIn);

        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleResetPassword(mockEvent);
        });

        expect(toast.error).toHaveBeenCalledWith('Reset failed');
    });

    it('starts conversation successfully', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ status: 201 });
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleStartConversation(mockEvent);
        });

        expect(client.post).toHaveBeenCalledWith('/message/start_conversation', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('New conversation started!');
    });

    it('fails to start conversation', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useAdminDashboard());

        const form = document.createElement('form');
        const mockEvent = {
            preventDefault: vi.fn(),
            target: form
        };

        await act(async () => {
            await result.current.handleStartConversation(mockEvent);
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to start conversation.');
    });

    it('removes user successfully', async () => {
        // mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'User removed' } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleRemoveUser('baduser');
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/remove_user', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('User removed');
    });

    it('cancels removing user', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleRemoveUser('baduser');
        });

        expect(client.post).not.toHaveBeenCalled();
    });

    it('fails to remove user api error', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        client.post.mockRejectedValueOnce({ response: { data: { message: 'Remove failed' } } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            await result.current.handleRemoveUser('baduser');
        });

        expect(toast.error).toHaveBeenCalledWith('Remove failed');
    });
    
    it('clears form errors on activeModal change', async () => {
        client.get.mockResolvedValueOnce({ data: { status: 'success', data: {} } });
        const { result } = renderHook(() => useAdminDashboard());

        await act(async () => {
            const form = document.createElement('form');
            const userIn = document.createElement('input');
            userIn.name = 'username';
            userIn.value = 'a'; // invalid
            const passIn = document.createElement('input');
            passIn.name = 'password';
            passIn.value = '123'; // invalid
            form.appendChild(userIn);
            form.appendChild(passIn);

            const mockEvent = {
                preventDefault: vi.fn(),
                target: form
            };
            await result.current.handleCreateUser(mockEvent);
        });
        
        expect(Object.keys(result.current.formErrors).length).toBeGreaterThan(0);

        await act(async () => {
            result.current.setActiveModal('createUser');
        });
        
        expect(Object.keys(result.current.formErrors).length).toBe(0);
    });
});
