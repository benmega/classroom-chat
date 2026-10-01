import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectManagement } from './useProjectManagement';
import client from '../api/client';
import toast from 'react-hot-toast';
import { extractVideoThumbnail } from '../utils/video';
import { showConfirm } from '../utils/confirm';

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

vi.mock('../utils/confirm', () => ({
    showConfirm: vi.fn(),
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
        window.URL.revokeObjectURL = vi.fn();
    });

    it.skip('fetches project data correctly', async () => {
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

    it.skip('handles submit', async () => {
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

    it.skip('handles delete', async () => {
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
        
        expect(mockNavigate).toHaveBeenCalledWith('/profile/student2');
    });

    describe('image preview object URLs', () => {
        const mount = async () => {
            client.get.mockResolvedValue(null);
            const hook = renderHook(() => useProjectManagement());
            await act(async () => {
                await new Promise(r => setTimeout(r, 10));
            });
            return hook;
        };
        const pickImage = (result, name = 'img.png') => act(async () => {
            await result.current.handleFileChange({
                target: { name: 'project_image', files: [new File([''], name, { type: 'image/png' })] },
            });
        });

        it('releases the previous preview when another image is chosen', async () => {
            window.URL.createObjectURL.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
            const { result } = await mount();

            await pickImage(result, 'a.png');
            expect(result.current.imagePreview).toBe('blob:first');
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            await pickImage(result, 'b.png');
            expect(result.current.imagePreview).toBe('blob:second');
            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
        });

        it('releases the current preview on unmount', async () => {
            window.URL.createObjectURL.mockReturnValueOnce('blob:only');
            const { result, unmount } = await mount();
            await pickImage(result);
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            unmount();

            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:only');
        });

        it('does not revoke anything when no local preview was made', async () => {
            const { unmount } = await mount();

            unmount();

            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });

        it('releases a video-thumbnail preview when it is replaced by a chosen image', async () => {
            window.URL.createObjectURL.mockReturnValueOnce('blob:thumb').mockReturnValueOnce('blob:chosen');
            const { result } = await mount();

            await act(async () => {
                await result.current.handleFileChange({
                    target: { name: 'project_video', files: [new File([''], 'vid.mp4', { type: 'video/mp4' })] },
                });
            });
            expect(result.current.imagePreview).toBe('blob:thumb');

            await pickImage(result);

            expect(result.current.imagePreview).toBe('blob:chosen');
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb');
        });

        it('releases a recorded-video thumbnail preview on unmount', async () => {
            window.URL.createObjectURL.mockReturnValueOnce('blob:recorded-thumb');
            const { result, unmount } = await mount();

            await act(async () => {
                await result.current.handleRecordedVideo(new Blob(['']));
            });
            expect(result.current.imagePreview).toBe('blob:recorded-thumb');
            unmount();

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recorded-thumb');
        });

        it('makes no preview URL for a thumbnail that finishes extracting after unmount', async () => {
            let finishExtraction;
            extractVideoThumbnail.mockImplementationOnce(() => new Promise((resolve) => { finishExtraction = resolve; }));
            const { result, unmount } = await mount();

            let pending;
            act(() => {
                pending = result.current.handleFileChange({
                    target: { name: 'project_video', files: [new File([''], 'vid.mp4', { type: 'video/mp4' })] },
                });
            });
            unmount();
            await act(async () => {
                finishExtraction(new Blob(['']));
                await pending;
            });

            expect(window.URL.createObjectURL).not.toHaveBeenCalled();
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });

        it('only revokes blob previews, never the saved image URL', async () => {
            client.get.mockImplementation((url) => {
                if (url === '/user/project/edit/1') {
                    return Promise.resolve({ data: { status: 'success', data: { project: { name: 'Proj', user_id: '2', image_url: '/saved.png' } } } });
                }
                if (url === '/api/project-templates') {
                    return Promise.resolve({ data: { data: { templates: {} } } });
                }
                return Promise.resolve(null);
            });
            window.URL.createObjectURL.mockReturnValueOnce('blob:local');
            const { result, unmount } = renderHook(() => useProjectManagement());
            await act(async () => {
                await new Promise(r => setTimeout(r, 10));
            });
            expect(result.current.imagePreview).toBe('/saved.png');
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            await pickImage(result);
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            unmount();
            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local');
        });
    });

    describe('save errors', () => {
        const submit = async (result) => {
            await act(async () => {
                await result.current.handleSubmit({ preventDefault: vi.fn() });
            });
        };

        it('shows the server error of an unsuccessful save response', async () => {
            client.get.mockResolvedValue(null);
            client.post.mockResolvedValueOnce({ data: { status: 'error', error: 'Project name is required.' } });
            const { result } = renderHook(() => useProjectManagement());
            await act(async () => { await new Promise(r => setTimeout(r, 10)); });

            await submit(result);

            expect(toast.error).toHaveBeenCalledWith('Project name is required.');
        });

        it('shows the message of a failed request, whichever field the route uses', async () => {
            client.get.mockResolvedValue(null);
            client.post.mockRejectedValueOnce({ response: { data: { success: false, message: 'Not allowed.' } } });
            const { result } = renderHook(() => useProjectManagement());
            await act(async () => { await new Promise(r => setTimeout(r, 10)); });

            await submit(result);

            expect(toast.error).toHaveBeenCalledWith('Not allowed.');
        });
    });

    describe('delete errors', () => {
        const attemptDelete = async () => {
            client.get.mockResolvedValue(null);
            const { result } = renderHook(() => useProjectManagement());
            await act(async () => { await new Promise(r => setTimeout(r, 10)); });
            await act(async () => { await result.current.handleDelete(); });
            return result;
        };

        beforeEach(() => {
            showConfirm.mockResolvedValue(true);
        });

        it('shows the reason the server gives when the project cannot be deleted', async () => {
            client.post.mockRejectedValueOnce({ response: { status: 403, data: { status: 'error', data: null, error: 'You do not own this project' } } });

            const result = await attemptDelete();

            expect(toast.error).toHaveBeenCalledWith('You do not own this project');
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(result.current.isSaving).toBe(false);
        });

        it('falls back to a generic message when the failure has no body', async () => {
            client.post.mockRejectedValueOnce(new Error('Network Error'));

            await attemptDelete();

            expect(toast.error).toHaveBeenCalledWith('Failed to delete project.');
        });

        it('does nothing when the confirmation is cancelled', async () => {
            showConfirm.mockResolvedValue(false);

            await attemptDelete();

            expect(client.post).not.toHaveBeenCalled();
        });
    });
});
