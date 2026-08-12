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

describe('useAdminUserDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockReset();
        client.post.mockReset();
        if (client.put && client.put.mockReset) client.put.mockReset();
        mockNavigate.mockReset();
        vi.spyOn(window, 'confirm').mockReturnValue(true);
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

    it('adjusts ducks', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1 } } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Ducks adjusted' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = document.createElement('form');
        const event = { preventDefault: vi.fn(), target: form };
        form.reset = vi.fn();

        await act(async () => {
            await result.current.handleAdjustDucks(event);
        });

        
    });

    it('adjusts packets', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1 } } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Packets adjusted' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = document.createElement('form');
        const event = { preventDefault: vi.fn(), target: form };
        form.reset = vi.fn();

        await act(async () => {
            await result.current.handleAdjustPackets(event);
        });

        
    });

    it('resets password', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1 } } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'Password reset' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = document.createElement('form');
        const event = { preventDefault: vi.fn(), target: form };
        form.reset = vi.fn();

        await act(async () => {
            await result.current.handleResetPassword(event);
        });

        
    });

    it('sets drawer', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, username: 'testuser' } } });
        client.post.mockResolvedValueOnce({ status: 200, data: { message: 'Drawer set' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        const form = document.createElement('form');
        const event = { preventDefault: vi.fn(), target: form };

        await act(async () => {
            await result.current.handleSetDrawer(event);
        });

        
    });

    it('removes user', async () => {
        client.get.mockResolvedValue({ data: { user: { id: 1, username: 'testuser' } } });
        client.post.mockResolvedValueOnce({ data: { success: true, message: 'User removed' } });
        
        const { result } = renderHook(() => useAdminUserDashboard(1));
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });

        await act(async () => {
            await result.current.handleRemoveUser();
        });

        
        expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
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

