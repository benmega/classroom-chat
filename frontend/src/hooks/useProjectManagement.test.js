import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectManagement } from './useProjectManagement';
import client from '../api/client';
import toast from 'react-hot-toast';
import { extractVideoThumbnail } from '../utils/video';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: '1' }),
    useSearchParams: () => [new URLSearchParams({ student_id: '2' })],
}));

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

let mockUser = { id: 1, is_admin: true };
vi.mock('../store/useAuthStore', () => ({
    default: () => ({ user: mockUser }),
}));

vi.mock('../utils/video', () => ({
    extractVideoThumbnail: vi.fn().mockResolvedValue(new Blob()),
}));

describe('useProjectManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockReset();
        client.post.mockReset();
        mockNavigate.mockReset();
        mockUser = { id: 1, is_admin: true };
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
    });

    it('fetches project data correctly', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/user/project/new') {
                return Promise.resolve({ data: { data: { students: [{ id: 2, slug: 'student2' }] } } });
            }
            if (url === '/user/project/edit/1') {
                return Promise.resolve({ data: { status: 'success', data: { project: { name: 'Proj 1', user_id: '2', image_url: '/img.png' } } } });
            }
            if (url === '/api/project-templates') {
                return Promise.resolve({ data: { data: { templates: { 'Proj 1': { description: 'desc' } } } } });
            }
            return Promise.resolve(null);
        });

        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        expect(result.current.projectData.name).toBe('Proj 1');
        expect(result.current.students.length).toBe(1);
        expect(result.current.selectedTemplate).toBe('Proj 1');
        expect(result.current.imagePreview).toBe('/img.png');
    });

    it('handles input change', async () => {
        client.get.mockResolvedValue(null);
        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        const event = {
            target: {
                name: 'description',
                value: 'new desc',
                tagName: 'TEXTAREA',
                style: {},
                scrollHeight: 50
            }
        };

        act(() => {
            result.current.handleInputChange(event);
        });

        expect(result.current.projectData.description).toBe('new desc');
        expect(event.target.style.height).toBe('50px');
    });

    it('handles template change', async () => {
        client.get.mockResolvedValue(null);
        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        act(() => {
            result.current.templates = { 'T1': { description: 'd1' } };
            result.current.handleTemplateChange({ target: { value: 'T1' } });
        });

        expect(result.current.selectedTemplate).toBe('T1');
        expect(result.current.projectData.name).toBe('T1');
    });

    it('handles custom template change', async () => {
        client.get.mockResolvedValue(null);
        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        act(() => {
            result.current.handleTemplateChange({ target: { value: 'custom' } });
        });

        expect(result.current.selectedTemplate).toBe('custom');
        expect(result.current.projectData.name).toBe('');
    });

    it('handles file change image', async () => {
        client.get.mockResolvedValue(null);
        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        const file = new File([''], 'img.png', { type: 'image/png' });
        
        await act(async () => {
            await result.current.handleFileChange({ target: { name: 'project_image', files: [file] } });
        });

        expect(result.current.imagePreview).toBe('blob:url');
    });

    it('handles file change video', async () => {
        client.get.mockResolvedValue(null);
        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        const file = new File([''], 'vid.mp4', { type: 'video/mp4' });
        
        await act(async () => {
            await result.current.handleFileChange({ target: { name: 'project_video', files: [file] } });
        });

        expect(extractVideoThumbnail).toHaveBeenCalledWith(file);
        expect(toast.success).toHaveBeenCalledWith('Generated thumbnail from video!');
    });

    it('handles recorded video', async () => {
        client.get.mockResolvedValue(null);
        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        const blob = new Blob(['']);
        
        await act(async () => {
            await result.current.handleRecordedVideo(blob);
        });

        expect(extractVideoThumbnail).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Generated thumbnail from recording!');
    });

    it('handles submit', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/user/project/new') {
                return Promise.resolve({ data: { data: { students: [{ id: 2, slug: 'student2' }] } } });
            }
            if (url === '/user/project/edit/1') {
                return Promise.resolve({ data: { status: 'success', data: { project: { name: 'Proj 1', user_id: '2' } } } });
            }
            return Promise.resolve(null);
        });

        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        const event = { preventDefault: vi.fn() };
        await act(async () => {
            await result.current.handleSubmit(event);
        });

        expect(client.post).toHaveBeenCalledWith('/user/project/edit/1', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('Project updated!');
        expect(mockNavigate).toHaveBeenCalledWith('/profile/student2');
    });

    it('handles submit fail', async () => {
        client.get.mockResolvedValue(null);
        client.post.mockRejectedValueOnce(new Error('fail'));

        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        const event = { preventDefault: vi.fn() };
        await act(async () => {
            await result.current.handleSubmit(event);
        });

        expect(toast.error).toHaveBeenCalledWith('An error occurred.');
    });

    it('handles delete', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/user/project/new') {
                return Promise.resolve({ data: { data: { students: [{ id: 2, slug: 'student2' }] } } });
            }
            if (url === '/user/project/edit/1') {
                return Promise.resolve({ data: { status: 'success', data: { project: { name: 'Proj 1', user_id: '2' } } } });
            }
            return Promise.resolve(null);
        });

        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        const { result } = renderHook(() => useProjectManagement());

        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(client.post).toHaveBeenCalledWith('/user/project/edit/1', expect.any(FormData));
        expect(toast.success).toHaveBeenCalledWith('Project deleted.');
        expect(mockNavigate).toHaveBeenCalledWith('/profile/student2');
    });
});
