import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminUserDashboard } from './useAdminUserDashboard';
import client from '../api/client';
import toast from 'react-hot-toast';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { showConfirm } from '../utils/confirm';

vi.mock('../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

describe('useAdminUserDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockReset();
        client.post.mockReset();
        if (client.put && client.put.mockReset) client.put.mockReset();
        mockNavigate.mockReset();
        showConfirm.mockResolvedValue(true);
    });


    it('fetches user and dependent data successfully on mount for student', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/user/1') && !url.includes('connection_card')) {
                return Promise.resolve({ data: { user: { id: 1, role: 'student', username: 'student1' } } });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [{ id: 2, username: 'parent1' }] } });
            }
            if (url.includes('/api/project-templates')) {
                return Promise.resolve({ data: { data: { templates: { 'T1': {} } } } });
            }
            if (url.includes('connection_card')) {
                return Promise.resolve({ data: { status: 'success', data: { connection_code: 'CODE123' } } });
            }
            if (url.includes('parents')) {
                return Promise.resolve({ data: { success: true, parents: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        const { result } = renderHook(() => useAdminUserDashboard(1));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.user).toEqual({ id: 1, role: 'student', username: 'student1' });
        expect(result.current.connectionCode).toBe('CODE123');
        expect(Object.keys(result.current.templates).length).toBe(1);
    });
    
    it('fetches user and dependent data successfully on mount for parent', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/user/2') && !url.includes('connection_card')) {
                return Promise.resolve({ data: { user: { id: 2, role: 'parent', username: 'parent1' } } });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [{ id: 1, username: 'student1' }] } });
            }
            if (url.includes('children')) {
                return Promise.resolve({ data: { success: true, children: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        const { result } = renderHook(() => useAdminUserDashboard(2));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(result.current.user).toEqual({ id: 2, role: 'parent', username: 'parent1' });
        expect(client.get).toHaveBeenCalledWith('/api/admin/parents/2/children');
    });

    it('handles user fetch error', async () => {
        client.get.mockRejectedValue(new Error('error'));
        renderHook(() => useAdminUserDashboard(1));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        expect(toast.error).toHaveBeenCalledWith('Failed to load user details.');
        expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    it('handles chapter pass preview and confirm', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, role: 'student' } } });
        client.post.mockResolvedValueOnce({ data: { success: true, preview: 'test_preview' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const event = { preventDefault: vi.fn() };
        
        await act(async () => {
            result.current.setSelectedChapterId('ch1');
        });
        
        await act(async () => {
            await result.current.handlePassChapterPreview(event);
        });

        expect(result.current.passPreview).toBe('test_preview');

        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Chapter passed' } });
        await act(async () => {
            await result.current.handlePassChapterConfirm();
        });

        
        expect(result.current.passPreview).toBeNull();
    });

    const makeForm = (fields) => {
        const form = document.createElement('form');
        Object.entries(fields).forEach(([name, value]) => {
            const input = document.createElement('input');
            input.name = name;
            input.value = value;
            form.appendChild(input);
        });
        form.reset = vi.fn();
        return form;
    };

    const rejection = (data, status = 400) => ({ response: { status, data } });

    const loadStudent = async (user = { id: 1, username: 'testuser', role: 'student' }) => {
        client.get.mockResolvedValue({ data: { user } });
        const hook = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });
        return hook.result;
    };

    it('adjusts ducks, resets the form and reloads the user', async () => {
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Ducks adjusted' } });
        const result = await loadStudent();
        const form = makeForm({ username: 'testuser', amount: '5' });
        const getsBefore = client.get.mock.calls.length;

        await act(async () => {
            await result.current.handleAdjustDucks({ preventDefault: vi.fn(), target: form });
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/adjust_ducks', expect.any(FormData));
        expect(client.post.mock.calls[0][1].get('amount')).toBe('5');
        expect(form.reset).toHaveBeenCalled();
        expect(client.get.mock.calls.length).toBeGreaterThan(getsBefore);
        expect(toast.error).not.toHaveBeenCalled();
        expect(result.current.formLoading).toBe(false);
    });

    it('adjusts packets, resets the form and reloads the user', async () => {
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Packets adjusted' } });
        const result = await loadStudent();
        const form = makeForm({ username: 'testuser', amount: '0.25' });

        await act(async () => {
            await result.current.handleAdjustPackets({ preventDefault: vi.fn(), target: form });
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/adjust_packets', expect.any(FormData));
        expect(form.reset).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it.each(['handleAdjustDucks', 'handleAdjustPackets'])('%s rejects an empty amount without calling the server', async (handler) => {
        const result = await loadStudent();

        await act(async () => {
            await result.current[handler]({ preventDefault: vi.fn(), target: makeForm({ username: 'testuser', amount: '' }) });
        });

        expect(toast.error).toHaveBeenCalledWith('Adjustment amount is required');
        expect(client.post).not.toHaveBeenCalled();
    });

    it.each([
        ['handleAdjustDucks', 'Failed to adjust ducks.'],
        ['handleAdjustPackets', 'Failed to adjust packets.'],
    ])('%s shows the message the server sends instead of a generic one', async (handler, fallback) => {
        client.post.mockRejectedValueOnce(rejection({ success: false, message: "User 'testuser' not found." }, 404));
        client.post.mockRejectedValueOnce(new Error('Network Error'));
        const result = await loadStudent();
        const event = () => ({ preventDefault: vi.fn(), target: makeForm({ username: 'testuser', amount: '5' }) });

        await act(async () => { await result.current[handler](event()); });
        expect(toast.error).toHaveBeenLastCalledWith("User 'testuser' not found.");

        await act(async () => { await result.current[handler](event()); });
        expect(toast.error).toHaveBeenLastCalledWith(fallback);
    });

    it('resets the password with a JSON body naming the user', async () => {
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Password reset' } });
        const result = await loadStudent();
        const form = makeForm({ new_password: 'secret', confirm_password: 'secret' });

        await act(async () => {
            await result.current.handleResetPassword({ preventDefault: vi.fn(), target: form });
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/reset_password', { username: 'testuser', new_password: 'secret' });
        expect(form.reset).toHaveBeenCalled();
    });

    it('checks the password confirmation before calling the server', async () => {
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleResetPassword({
                preventDefault: vi.fn(),
                target: makeForm({ new_password: 'one', confirm_password: 'two' }),
            });
        });

        expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
        expect(client.post).not.toHaveBeenCalled();
    });

    it("shows the server's reason when a password cannot be reset", async () => {
        client.post.mockRejectedValueOnce(rejection({ success: false, message: 'Cannot reset password of another admin' }, 403));
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleResetPassword({
                preventDefault: vi.fn(),
                target: makeForm({ new_password: 'x', confirm_password: 'x' }),
            });
        });

        expect(toast.error).toHaveBeenCalledWith('Cannot reset password of another admin');
    });

    const passwordForm = (newPassword, confirmPassword) => {
        const form = document.createElement('form');
        for (const [name, value] of [['new_password', newPassword], ['confirm_password', confirmPassword]]) {
            const input = document.createElement('input');
            input.name = name;
            input.value = value;
            form.appendChild(input);
        }
        form.reset = vi.fn();
        return form;
    };

    it('posts the username and new password as JSON when resetting a password', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, username: 'testuser' } } });
        client.post.mockResolvedValueOnce({ data: { success: true } });

        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = passwordForm('s3cret-pass', 's3cret-pass');
        await act(async () => {
            await result.current.handleResetPassword({ preventDefault: vi.fn(), target: form });
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/reset_password', {
            username: 'testuser',
            new_password: 's3cret-pass',
        });
        expect(form.reset).toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('does not reset a password when the confirmation does not match', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, username: 'testuser' } } });

        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = passwordForm('s3cret-pass', 'different');
        await act(async () => {
            await result.current.handleResetPassword({ preventDefault: vi.fn(), target: form });
        });

        expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
        expect(client.post).not.toHaveBeenCalled();
        expect(form.reset).not.toHaveBeenCalled();
    });

    it('shows the backend message when resetting a password is refused', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, username: 'testuser' } } });
        client.post.mockResolvedValueOnce({ data: { success: false, message: 'Cannot reset password of another admin' } });
        client.post.mockResolvedValueOnce({ data: { success: false } });

        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = passwordForm('s3cret-pass', 's3cret-pass');
        const event = { preventDefault: vi.fn(), target: form };
        await act(async () => { await result.current.handleResetPassword(event); });
        expect(toast.error).toHaveBeenLastCalledWith('Cannot reset password of another admin');

        await act(async () => { await result.current.handleResetPassword(event); });
        expect(toast.error).toHaveBeenLastCalledWith('Failed to reset password.');
        expect(form.reset).not.toHaveBeenCalled();
    });

    it.each([
        ['handleAdjustDucks', 'Failed to adjust ducks.'],
        ['handleAdjustPackets', 'Failed to adjust packets.'],
        ['handleResetPassword', 'Failed to reset password.'],
    ])('%s reports the message from a failed request', async (handler, fallback) => {
        client.get.mockResolvedValue({ data: { user: { id: 1, username: 'testuser' } } });
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        // One form that is valid for all three handlers: the shared validator needs an amount too.
        const form = passwordForm('same-pass', 'same-pass');
        const amount = document.createElement('input');
        amount.name = 'amount';
        amount.value = '5';
        form.appendChild(amount);
        const event = { preventDefault: vi.fn(), target: form };

        // The 400 body of the admin routes carries { message }; the auth guard uses { error }.
        client.post.mockRejectedValueOnce({ response: { data: { message: 'Amount must be a finite number' } } });
        await act(async () => { await result.current[handler](event); });
        expect(toast.error).toHaveBeenLastCalledWith('Amount must be a finite number');

        client.post.mockRejectedValueOnce({ response: { data: { error: 'Admin access required' } } });
        await act(async () => { await result.current[handler](event); });
        expect(toast.error).toHaveBeenLastCalledWith('Admin access required');

        client.post.mockRejectedValueOnce(new Error('Network Error'));
        await act(async () => { await result.current[handler](event); });
        expect(toast.error).toHaveBeenLastCalledWith(fallback);
    });

    it('sets the drawer with a JSON body and reloads the user', async () => {
        client.post.mockResolvedValueOnce({ status: 200, data: { status: 'success', data: { message: 'Drawer updated for testuser' } } });
        const result = await loadStudent();
        const getsBefore = client.get.mock.calls.length;

        await act(async () => {
            await result.current.handleSetDrawer({ preventDefault: vi.fn(), target: makeForm({ drawer: '0x05' }) });
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/set_drawer', { username: 'testuser', drawer: '0x05' });
        expect(client.get.mock.calls.length).toBeGreaterThan(getsBefore);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it('shows a string reason for a failed drawer update, not the whole response body', async () => {
        client.post.mockRejectedValueOnce(rejection({ status: 'error', data: null, error: 'Drawer must be in hex format (e.g. 0xA6 or A6)' }));
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleSetDrawer({ preventDefault: vi.fn(), target: makeForm({ drawer: 'zz' }) });
        });

        expect(toast.error).toHaveBeenCalledWith('Drawer must be in hex format (e.g. 0xA6 or A6)');
        expect(result.current.formLoading).toBe(false);
    });

    it('shows the message of a drawer conflict', async () => {
        client.post.mockRejectedValueOnce(rejection({
            status: 'error',
            data: null,
            error: 'Drawer 0x05 is already assigned to @sam.',
            conflict: true,
            message: 'Drawer 0x05 is already assigned to @sam.',
            current_owner: 'sam',
        }, 409));
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleSetDrawer({ preventDefault: vi.fn(), target: makeForm({ drawer: '0x05' }) });
        });

        expect(toast.error).toHaveBeenCalledWith('Drawer 0x05 is already assigned to @sam.');
    });

    it('removes the user after a labelled confirmation and goes back to the list', async () => {
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'User removed' } });
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleRemoveUser();
        });

        expect(showConfirm).toHaveBeenCalledWith(
            expect.stringContaining('@testuser'),
            expect.objectContaining({ title: 'Remove User', confirmText: 'Remove', destructive: true })
        );
        const [url, body] = client.post.mock.calls[0];
        expect(url).toBe('/api/admin/remove_user');
        expect(body.get('username')).toBe('testuser');
        expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    it('does not remove the user when the confirmation is cancelled', async () => {
        showConfirm.mockResolvedValue(false);
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleRemoveUser();
        });

        expect(client.post).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("shows the server's reason when the removal is refused and stays on the page", async () => {
        client.post.mockRejectedValueOnce(rejection({ success: false, message: 'Cannot remove another admin' }, 403));
        const result = await loadStudent();

        await act(async () => {
            await result.current.handleRemoveUser();
        });

        expect(toast.error).toHaveBeenCalledWith('Cannot remove another admin');
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('labels the confirmation buttons of the other destructive actions', async () => {
        client.post.mockResolvedValue({ data: { success: true, status: 'success', preview: 'p' } });
        const result = await loadStudent();

        await act(async () => { await result.current.handleRejectUser(); });
        expect(showConfirm).toHaveBeenLastCalledWith(
            'Are you sure you want to reject and delete this user?',
            { title: 'Reject User', confirmText: 'Reject & Delete', destructive: true }
        );

        await act(async () => { await result.current.handlePassChapterConfirm(); });
        expect(showConfirm).toHaveBeenLastCalledWith(
            expect.stringContaining('pass this chapter'),
            { title: 'Pass Chapter', confirmText: 'Pass Chapter', destructive: false }
        );
    });

    it.each([
        ['approving a user', (r) => r.current.handleApproveUser(), rejection({ status: 'error', data: null, error: 'User not found' }, 404), 'User not found'],
        ['rejecting a user', (r) => r.current.handleRejectUser(), rejection({ status: 'error', data: null, error: 'User not found' }, 404), 'User not found'],
        ['passing a chapter', (r) => r.current.handlePassChapterConfirm(), rejection({ success: false, message: 'No chapter selected' }), 'No chapter selected'],
        ['previewing a chapter pass', (r) => r.current.handlePassChapterPreview({ preventDefault: vi.fn() }), rejection({ success: false, message: 'Unknown chapter' }), 'Unknown chapter'],
        ['linking a child', (r) => r.current.handleToggleChildLink(2, false), rejection({ success: false, message: 'Student not found' }, 404), 'Student not found'],
        ['linking a parent', (r) => r.current.handleToggleParentLink(2, false), rejection({ success: false, message: 'Parent not found' }, 404), 'Parent not found'],
        ['assigning a project', (r) => r.current.handleAssignProjectSubmit({ preventDefault: vi.fn() }), rejection({ status: 'error', data: null, error: 'Invalid student selection.' }), 'Invalid student selection.'],
        ['updating the profile', (r) => r.current.handleUpdateUser({ nickname: 'x' }), rejection({ status: 'error', data: null, error: 'Username already taken' }, 409), 'Username already taken'],
    ])('shows the server reason when %s fails', async (_label, run, failure, expected) => {
        const result = await loadStudent();
        client.post.mockRejectedValue(failure);
        client.put.mockRejectedValue(failure);
        await act(async () => { result.current.setSelectedTemplateName('Template1'); });

        await act(async () => { await run(result); });

        expect(toast.error).toHaveBeenCalledWith(expected);
        expect(result.current.formLoading).toBe(false);
    });

    it.each([
        ['approving a user', (r) => r.current.handleApproveUser(), 'Failed to approve user.'],
        ['linking a child', (r) => r.current.handleToggleChildLink(2, true), 'Failed to unlink child'],
        ['linking a parent', (r) => r.current.handleToggleParentLink(2, true), 'Failed to unlink parent'],
        ['assigning a project', (r) => r.current.handleAssignProjectSubmit({ preventDefault: vi.fn() }), 'Failed to assign project.'],
        ['updating the profile', (r) => r.current.handleUpdateUser({ nickname: 'x' }), 'Failed to update user profile.'],
    ])('falls back to a generic message when %s fails without a body', async (_label, run, expected) => {
        const result = await loadStudent();
        client.post.mockRejectedValue(new Error('Network Error'));
        client.put.mockRejectedValue(new Error('Network Error'));
        await act(async () => { result.current.setSelectedTemplateName('Template1'); });

        await act(async () => { await run(result); });

        expect(toast.error).toHaveBeenCalledWith(expected);
    });

    it('approves user', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1 } } });
        client.post.mockResolvedValueOnce({ data: { status: 'success', data: { message: 'Approved' } } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            await result.current.handleApproveUser();
        });

        
    });

    it('rejects user', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1 } } });
        client.post.mockResolvedValueOnce({ data: { status: 'success', data: { message: 'Rejected' } } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            await result.current.handleRejectUser();
        });

        
        expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    it('toggles child link', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, role: 'parent' } } });
        client.post.mockResolvedValueOnce({ data: { success: true } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            await result.current.handleToggleChildLink(2, false);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/parents/1/link/2');
        
    });

    it('toggles parent link', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, role: 'student' } } });
        client.post.mockResolvedValueOnce({ data: { success: true } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            await result.current.handleToggleParentLink(2, false);
        });

        expect(client.post).toHaveBeenCalledWith('/api/admin/parents/2/link/1');
        
    });

    it('assigns project submit', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, role: 'student', nickname: 'nick' } } });
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            result.current.setSelectedTemplateName('Template1');
        });

        const event = { preventDefault: vi.fn() };
        await act(async () => {
            await result.current.handleAssignProjectSubmit(event);
        });

        expect(client.post).toHaveBeenCalledWith('/user/project/new', expect.any(FormData));
        
    });

    it('updates user profile via handleUpdateUser', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, role: 'student', nickname: 'oldnick' } } });
        client.put.mockResolvedValueOnce({ data: { message: 'Updated profile for @newnick', user: { id: 1, nickname: 'newnick' } } });

        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            await result.current.handleUpdateUser({ nickname: 'newnick', active_track: 'gd' });
        });

        expect(client.put).toHaveBeenCalledWith('/api/admin/user/1', { nickname: 'newnick', active_track: 'gd' });
        
        expect(result.current.user.nickname).toBe('newnick');
    });
});

