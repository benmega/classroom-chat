import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectManagement } from './useProjectManagement';
import client from '../api/client';
import toast from 'react-hot-toast';
import { extractVideoThumbnail } from '../utils/video';
import { showConfirm } from '../utils/confirm';
import { validateNewFiles } from '../utils/projectFiles';

const mockNavigate = vi.fn();
// Editing project 1 unless a test opens the page for a new project
let mockParams = { projectId: '1' };
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useSearchParams: () => [new URLSearchParams({ student_id: '2' })],
}));

// The caps and allowed types belong to the shared validator; here a test decides what it accepts
vi.mock('../utils/projectFiles', async (importOriginal) => ({
    ...(await importOriginal()),
    validateNewFiles: vi.fn(),
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

// The hook gates the admin-only student list on role, so this is what makes a user an admin
let mockUser = { id: 1, role: 'admin' };
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
        mockUser = { id: 1, role: 'admin' };
        mockParams = { projectId: '1' };
        validateNewFiles.mockImplementation((_kind, files) => ({ accepted: [...files], rejected: [] }));
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
        window.URL.revokeObjectURL = vi.fn();
    });

    // The three endpoints the hook loads on mount: the admin-only student list, the project being
    // edited (project 1, owned by student 2) and the template catalogue.
    const serveProject = ({ project = { name: 'Proj 1', user_id: '2' }, templates = {} } = {}) => {
        client.get.mockImplementation((url) => {
            if (url === '/user/project/new') {
                return Promise.resolve({ data: { data: { students: [{ id: 2, slug: 'student2' }] } } });
            }
            if (url === '/user/project/edit/1') {
                return Promise.resolve({ data: { status: 'success', data: { project } } });
            }
            if (url === '/api/project-templates') {
                return Promise.resolve({ data: { data: { templates } } });
            }
            return Promise.resolve(null);
        });
    };
    const mountProject = async () => {
        const hook = renderHook(() => useProjectManagement());
        await act(async () => {
            await new Promise(r => setTimeout(r, 10));
        });
        return hook;
    };

    it('fetches project data correctly', async () => {
        serveProject({
            project: { name: 'Proj 1', user_id: '2', image_url: '/img.png' },
            templates: { 'Proj 1': { description: 'desc' } },
        });

        const { result } = await mountProject();

        expect(result.current.projectData.name).toBe('Proj 1');
        expect(result.current.projectData.student_id).toBe('2');
        expect(result.current.students).toEqual([{ id: 2, slug: 'student2' }]);
        expect(result.current.selectedTemplate).toBe('Proj 1');
        expect(result.current.imagePreview).toBe('/img.png');
        expect(result.current.isLoading).toBe(false);
    });

    it('keeps the review status and feedback of a rejected project', async () => {
        serveProject({ project: { name: 'Proj 1', user_id: '2', status: 'rejected', teacher_comment: 'Add comments to the loop' } });

        const { result } = await mountProject();

        expect(result.current.projectData.status).toBe('rejected');
        expect(result.current.projectData.teacher_comment).toBe('Add comments to the loop');
    });

    it('treats a project the server sent without a status as pending', async () => {
        serveProject();

        const { result } = await mountProject();

        expect(result.current.projectData.status).toBe('pending');
    });

    it('loads the student list for an admin', async () => {
        serveProject();

        await mountProject();

        expect(client.get).toHaveBeenCalledWith('/user/project/new');
        expect(client.get).toHaveBeenCalledWith('/user/project/edit/1');
        expect(client.get).toHaveBeenCalledWith('/api/project-templates');
    });

    it.each([
        ['a student', { id: 1, role: 'student' }],
        ['a user whose role is unknown', { id: 1 }],
        ['a parent', { id: 1, role: 'parent' }],
    ])('does not ask %s for the student list', async (_name, user) => {
        mockUser = user;
        serveProject();

        const { result } = await mountProject();

        expect(client.get).not.toHaveBeenCalledWith('/user/project/new');
        expect(client.get).toHaveBeenCalledWith('/user/project/edit/1');
        expect(client.get).toHaveBeenCalledWith('/api/project-templates');
        expect(result.current.students).toEqual([]);
        expect(result.current.projectData.name).toBe('Proj 1');
    });

    it('tells the page the project is forbidden or missing', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        client.get.mockRejectedValue({ response: { status: 403 } });
        const forbidden = await mountProject();
        expect(forbidden.result.current.error).toBe('forbidden');
        expect(forbidden.result.current.isLoading).toBe(false);

        client.get.mockRejectedValue({ response: { status: 404 } });
        const missing = await mountProject();
        expect(missing.result.current.error).toBe('not_found');

        client.get.mockRejectedValue(new Error('Network Error'));
        const broken = await mountProject();
        expect(broken.result.current.error).toBeNull();
        expect(toast.error).toHaveBeenCalledWith('Failed to load project details.');
        consoleError.mockRestore();
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
        serveProject();
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        const { result } = await mountProject();

        const event = { preventDefault: vi.fn() };
        await act(async () => {
            await result.current.handleSubmit(event);
        });

        expect(event.preventDefault).toHaveBeenCalled();
        expect(client.post).toHaveBeenCalledWith('/user/project/edit/1', expect.any(FormData));
        const body = client.post.mock.calls[0][1];
        expect(body.get('name')).toBe('Proj 1');
        expect(body.get('student_id')).toBe('2');
        expect(toast.success).toHaveBeenCalledWith('Project updated!');
        // An admin lands on the profile of the student the project belongs to
        expect(mockNavigate).toHaveBeenCalledWith('/profile/student2');
        expect(result.current.isSaving).toBe(false);
    });

    it('tells a student their rejected project was resubmitted for review', async () => {
        mockUser = { id: 2, role: 'student' };
        serveProject({ project: { name: 'Proj 1', user_id: '2', status: 'rejected', teacher_comment: 'Add comments to the loop' } });
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        const { result } = await mountProject();

        await act(async () => {
            await result.current.handleSubmit({ preventDefault: vi.fn() });
        });

        expect(toast.success).toHaveBeenCalledWith('Project resubmitted for review!');
        expect(toast.success).not.toHaveBeenCalledWith('Project updated!');
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('sends an admin to their own profile when the project owner is not in the student list', async () => {
        serveProject({ project: { name: 'Proj 1', user_id: '99' } });
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        const { result } = await mountProject();

        await act(async () => {
            await result.current.handleSubmit({ preventDefault: vi.fn() });
        });

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('sends a student back to their own profile after saving', async () => {
        mockUser = { id: 2, role: 'student' };
        serveProject();
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        const { result } = await mountProject();

        await act(async () => {
            await result.current.handleSubmit({ preventDefault: vi.fn() });
        });

        expect(client.post).toHaveBeenCalledWith('/user/project/edit/1', expect.any(FormData));
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
        expect(mockNavigate).not.toHaveBeenCalledWith('/profile/student2');
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
        serveProject();
        showConfirm.mockResolvedValue(true);
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        const { result } = await mountProject();

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(showConfirm).toHaveBeenCalledWith(
            'Are you sure you want to delete this project?',
            expect.objectContaining({ destructive: true })
        );
        expect(client.post).toHaveBeenCalledWith('/user/project/edit/1', expect.any(FormData));
        expect(client.post.mock.calls[0][1].get('action')).toBe('delete');
        expect(mockNavigate).toHaveBeenCalledWith('/profile/student2');
        expect(result.current.isSaving).toBe(false);
    });

    it('sends a student to their profile after deleting a project', async () => {
        mockUser = { id: 2, role: 'student' };
        serveProject();
        showConfirm.mockResolvedValue(true);
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });
        const { result } = await mountProject();

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
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

    const submitForm = (result) => act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
    });

    describe('project type', () => {
        it('takes the type the loaded project states', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', project_type: '3d' } });

            const { result } = await mountProject();

            expect(result.current.projectType).toBe('3d');
        });

        it('falls back to the type of the template the project was built from', async () => {
            serveProject({
                project: { name: 'My Arm', user_id: '2', template_id: 7 },
                templates: { 'Robot Arm': { id: 7, project_type: '3d' } },
            });

            const { result } = await mountProject();

            expect(result.current.selectedTemplate).toBe('Robot Arm');
            expect(result.current.projectType).toBe('3d');
        });

        it('prefers the type the project states over the one of its template', async () => {
            serveProject({
                project: { name: 'My Arm', user_id: '2', template_id: 7, project_type: 'code' },
                templates: { 'Robot Arm': { id: 7, project_type: '3d' } },
            });

            const { result } = await mountProject();

            expect(result.current.projectType).toBe('code');
        });

        it('treats a project without a known type or a template as a code project', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', project_type: 'hologram' } });

            const { result } = await mountProject();

            expect(result.current.projectType).toBe('code');
        });

        it('changes the type only to a known one', async () => {
            serveProject();
            const { result } = await mountProject();

            act(() => result.current.setProjectType('3d'));
            expect(result.current.projectType).toBe('3d');

            act(() => result.current.setProjectType('hologram'));
            expect(result.current.projectType).toBe('3d');
        });

        it('takes the type of the template that is picked', async () => {
            mockParams = {};
            serveProject({ templates: { 'Robot Arm': { id: 7, project_type: '3d' }, 'Old Maze': { id: 8 } } });
            const { result } = await mountProject();
            expect(result.current.projectType).toBe('code');

            act(() => result.current.handleTemplateChange({ target: { value: 'Robot Arm' } }));
            expect(result.current.projectType).toBe('3d');

            // Back on a custom project the student keeps the type they see, and can change it themselves
            act(() => result.current.handleTemplateChange({ target: { value: 'custom' } }));
            expect(result.current.projectType).toBe('3d');

            // A template that states no type (an older server) makes a code project
            act(() => result.current.handleTemplateChange({ target: { value: 'Old Maze' } }));
            expect(result.current.projectType).toBe('code');
        });

        it('sends the type with a new project', async () => {
            mockParams = {};
            serveProject({ templates: { 'Robot Arm': { id: 7, project_type: '3d' } } });
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            const { result } = await mountProject();

            act(() => result.current.handleTemplateChange({ target: { value: 'Robot Arm' } }));
            await submitForm(result);

            expect(client.post).toHaveBeenCalledWith('/user/project/new', expect.any(FormData));
            const body = client.post.mock.calls[0][1];
            expect(body.get('project_type')).toBe('3d');
            expect(body.get('template_id')).toBe('7');
        });
    });

    describe('project files', () => {
        const savedFiles = [
            { id: 12, kind: 'model', name: 'robot.stl', path: 'robot.stl', size: 684 },
            { id: 13, kind: 'source', name: 'main.py', path: 'src/main.py', size: 1200 },
            { id: 14, kind: 'asset', name: 'logo.png', path: 'logo.png', size: 2048 },
        ];
        // A picked file; folderPath is where it sits in a picked folder, the folder itself first
        const pickedFile = (name, { folderPath, content = 'data' } = {}) => {
            const file = new File([content], name);
            if (folderPath) Object.defineProperty(file, 'webkitRelativePath', { value: folderPath });
            return file;
        };
        const pendingPaths = (result, kind) => result.current.pendingFiles[kind].map((entry) => entry.path);
        const partNames = (body, field) => body.getAll(field).map((part) => part.name);

        it('exposes the saved files of the project and counts them by kind', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', files: savedFiles } });

            const { result } = await mountProject();

            expect(result.current.existingFiles).toEqual(savedFiles);
            expect(result.current.fileCounts).toEqual({ model: 1, source: 1, asset: 1 });
            expect(result.current.pendingFiles).toEqual({ model: [], source: [], asset: [] });
            expect(result.current.removedFileIds.size).toBe(0);
        });

        it('starts without saved files when the project has none', async () => {
            serveProject();

            const { result } = await mountProject();

            expect(result.current.existingFiles).toEqual([]);
            expect(result.current.fileCounts).toEqual({ model: 0, source: 0, asset: 0 });
        });

        it('adds picked files under their names, sorted, each with its own local id', async () => {
            serveProject();
            const { result } = await mountProject();
            const main = pickedFile('main.py');

            act(() => result.current.addFiles('source', [pickedFile('util.py'), main]));

            const pending = result.current.pendingFiles.source;
            expect(pending.map((entry) => entry.path)).toEqual(['main.py', 'util.py']);
            expect(pending[0].file).toBe(main);
            expect(pending[0].id).not.toBe(pending[1].id);
            expect(result.current.fileCounts.source).toBe(2);
        });

        it('keeps the picked folder and its subfolders in each path', async () => {
            serveProject();
            const { result } = await mountProject();

            act(() => result.current.addFiles('source', [
                pickedFile('main.py', { folderPath: 'game/src/main.py' }),
                pickedFile('README.md', { folderPath: 'game/README.md' }),
            ]));

            expect(pendingPaths(result, 'source')).toEqual(['game/README.md', 'game/src/main.py']);
        });

        it('leaves the hidden, dependency and cache folders of a picked folder out, without a toast', async () => {
            serveProject();
            const { result } = await mountProject();
            const main = pickedFile('main.py', { folderPath: '.game/main.py' });

            act(() => result.current.addFiles('source', [
                main,
                pickedFile('HEAD', { folderPath: '.game/.git/HEAD' }),
                pickedFile('.DS_Store', { folderPath: '.game/.DS_Store' }),
                pickedFile('index.js', { folderPath: '.game/node_modules/lib/index.js' }),
                pickedFile('main.cpython-312.pyc', { folderPath: '.game/__pycache__/main.cpython-312.pyc' }),
                pickedFile('site.py', { folderPath: '.game/venv/lib/site.py' }),
            ]));

            // The picked folder's own name never counts against it, even when it starts with a dot
            expect(pendingPaths(result, 'source')).toEqual(['.game/main.py']);
            expect(validateNewFiles).toHaveBeenCalledWith('source', [main], expect.any(Object));
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('checks a hidden file picked on its own like any other file', async () => {
            serveProject();
            const { result } = await mountProject();
            const config = pickedFile('.eslintrc.json');

            act(() => result.current.addFiles('source', [config]));

            expect(validateNewFiles).toHaveBeenCalledWith('source', [config], expect.any(Object));
            expect(pendingPaths(result, 'source')).toEqual(['.eslintrc.json']);
        });

        it('does nothing for an empty pick, a folder of skipped files or an unknown kind', async () => {
            serveProject();
            const { result } = await mountProject();

            act(() => result.current.addFiles('source', []));
            act(() => result.current.addFiles('source', null));
            act(() => result.current.addFiles('source', [pickedFile('HEAD', { folderPath: 'game/.git/HEAD' })]));
            act(() => result.current.addFiles('video', [pickedFile('clip.mp4')]));

            expect(validateNewFiles).not.toHaveBeenCalled();
            expect(result.current.pendingFiles).toEqual({ model: [], source: [], asset: [] });
        });

        it('lets a file picked again under the same path take the place of the earlier one', async () => {
            serveProject();
            const { result } = await mountProject();
            const second = pickedFile('main.py', { content: 'print(2)' });

            act(() => result.current.addFiles('source', [pickedFile('main.py', { content: 'print(1)' }), pickedFile('util.py')]));
            const firstId = result.current.pendingFiles.source[0].id;
            act(() => result.current.addFiles('source', [second, pickedFile('zeta.py')]));

            const pending = result.current.pendingFiles.source;
            expect(pending.map((entry) => entry.path)).toEqual(['main.py', 'util.py', 'zeta.py']);
            expect(pending[0].file).toBe(second);
            expect(pending[0].id).not.toBe(firstId);
        });

        it('checks new files against what the project keeps after removals and pending uploads', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', files: savedFiles } });
            const { result } = await mountProject();
            const model = pickedFile('robot.stl');
            const sound = pickedFile('beep.wav');
            const extra = pickedFile('extra.py');

            act(() => result.current.addFiles('model', [model]));
            act(() => result.current.addFiles('asset', [sound]));
            act(() => result.current.toggleRemoveExisting(14));
            act(() => result.current.addFiles('source', [extra]));

            // The saved robot.stl is replaced by the upload of its path, and logo.png is being removed
            expect(validateNewFiles).toHaveBeenLastCalledWith('source', [extra], {
                existing: [savedFiles[1]],
                pendingAdds: [model, sound],
            });

            // A file picked again under a pending path does not count the one it replaces
            const louder = pickedFile('beep.wav');
            act(() => result.current.addFiles('asset', [louder]));
            expect(validateNewFiles).toHaveBeenLastCalledWith('asset', [louder], {
                existing: [savedFiles[1]],
                pendingAdds: [model, extra],
            });
            // robot.stl counts once, since the upload replaces the saved copy
            expect(result.current.fileCounts).toEqual({ model: 1, source: 2, asset: 1 });
        });

        it('toasts why a file was not added and adds the rest', async () => {
            serveProject();
            const { result } = await mountProject();
            validateNewFiles.mockImplementationOnce((_kind, files) => ({
                accepted: [files[0]],
                rejected: [
                    { file: files[1], reason: 'virus.exe is not a file type this part of the project takes.' },
                    { file: files[2], reason: 'Source files can be at most 1 MB.' },
                    { file: files[3] },
                ],
            }));

            act(() => result.current.addFiles('source', [pickedFile('main.py'), pickedFile('virus.exe'), pickedFile('huge.py'), pickedFile('odd.py')]));

            expect(pendingPaths(result, 'source')).toEqual(['main.py']);
            expect(toast.error).toHaveBeenCalledWith('virus.exe is not a file type this part of the project takes.');
            // A reason that does not name its file gets the name in front
            expect(toast.error).toHaveBeenCalledWith('huge.py: Source files can be at most 1 MB.');
            expect(toast.error).toHaveBeenCalledWith('odd.py: This file cannot be added.');
        });

        it.each([
            [4, '1 more file was not added.'],
            [6, '3 more files were not added.'],
        ])('counts the rejections past the first three in one toast (%i rejected)', async (count, summary) => {
            serveProject();
            const { result } = await mountProject();
            validateNewFiles.mockImplementationOnce((_kind, files) => ({
                accepted: [],
                rejected: files.map((file) => ({ file, reason: `${file.name} is not allowed.` })),
            }));

            act(() => result.current.addFiles('asset', Array.from({ length: count }, (_, i) => pickedFile(`blob${i}.bin`))));

            expect(toast.error).toHaveBeenCalledTimes(4);
            expect(toast.error).toHaveBeenNthCalledWith(1, 'blob0.bin is not allowed.');
            expect(toast.error).toHaveBeenLastCalledWith(summary);
            expect(result.current.pendingFiles.asset).toEqual([]);
        });

        it('removes a pending file by its local id', async () => {
            serveProject();
            const { result } = await mountProject();
            act(() => result.current.addFiles('source', [pickedFile('a.py'), pickedFile('b.py')]));
            const [first, second] = result.current.pendingFiles.source;

            act(() => result.current.removePendingFile('source', first.id));
            expect(result.current.pendingFiles.source).toEqual([second]);

            act(() => result.current.removePendingFile('video', second.id));
            expect(result.current.pendingFiles.source).toEqual([second]);
        });

        it('marks a saved file for removal and keeps it again', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', files: savedFiles } });
            const { result } = await mountProject();

            act(() => result.current.toggleRemoveExisting(13));
            expect([...result.current.removedFileIds]).toEqual([13]);
            expect(result.current.fileCounts.source).toBe(0);

            act(() => result.current.toggleRemoveExisting(13));
            expect(result.current.removedFileIds.size).toBe(0);
            expect(result.current.fileCounts.source).toBe(1);
        });

        it('sends each picked file with its path as the part file name, and the ids to remove', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', files: savedFiles } });
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            const { result } = await mountProject();

            // Several picks before React re-renders: each builds on the one before
            act(() => {
                result.current.addFiles('model', [pickedFile('arm.glb', { content: 'glTF' })]);
                result.current.addFiles('source', [
                    pickedFile('main.py', { folderPath: 'game/src/main.py' }),
                    pickedFile('README.md', { folderPath: 'game/README.md' }),
                ]);
                result.current.addFiles('asset', [pickedFile('jump.wav')]);
            });
            act(() => {
                result.current.toggleRemoveExisting(12);
                result.current.toggleRemoveExisting(14);
            });
            await submitForm(result);

            const [url, body, config] = client.post.mock.calls[0];
            expect(url).toBe('/user/project/edit/1');
            expect(partNames(body, 'model_files')).toEqual(['arm.glb']);
            expect(partNames(body, 'source_files')).toEqual(['game/README.md', 'game/src/main.py']);
            expect(partNames(body, 'asset_files')).toEqual(['jump.wav']);
            expect(await body.get('model_files').text()).toBe('glTF');
            expect(body.getAll('remove_file_ids')).toEqual(['12', '14']);
            expect(body.get('project_type')).toBe('code');
            expect(config).toEqual({ onUploadProgress: expect.any(Function) });
        });

        it('sends no file fields and no upload settings when nothing was picked or removed', async () => {
            serveProject();
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            const { result } = await mountProject();

            await submitForm(result);

            const [, body, config] = client.post.mock.calls[0];
            ['model_files', 'source_files', 'asset_files', 'remove_file_ids'].forEach((field) => {
                expect(body.has(field)).toBe(false);
            });
            expect(config).toBeUndefined();
        });

        it('reports the upload progress of a save that carries files, and clears it afterwards', async () => {
            serveProject();
            let finishSave;
            client.post.mockImplementationOnce((_url, _body, config) => {
                // A progress event without a known total says nothing about how far along the upload is
                config.onUploadProgress({ loaded: 10, total: 0 });
                config.onUploadProgress({ loaded: 50, total: 200 });
                return new Promise((resolve) => { finishSave = resolve; });
            });
            const { result } = await mountProject();
            act(() => result.current.addFiles('asset', [pickedFile('jump.wav')]));
            expect(result.current.uploadProgress).toBeNull();

            let saving;
            act(() => {
                saving = result.current.handleSubmit({ preventDefault: vi.fn() });
            });
            expect(result.current.uploadProgress).toBe(25);

            await act(async () => {
                finishSave({ data: { status: 'success' } });
                await saving;
            });
            expect(result.current.uploadProgress).toBeNull();
            expect(result.current.isSaving).toBe(false);
        });
    });

    describe('model preview object URL', () => {
        const model = (name) => new File(['solid'], name);

        it('previews the first pending model and makes no new URL while it stays first', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:arm').mockReturnValueOnce('blob:base');
            serveProject();
            const { result } = await mountProject();
            expect(result.current.pendingModelPreviewUrl).toBeNull();
            const arm = model('arm.stl');

            act(() => result.current.addFiles('model', [arm]));
            expect(result.current.pendingModelPreviewUrl).toBe('blob:arm');
            expect(URL.createObjectURL).toHaveBeenCalledWith(arm);

            act(() => result.current.addFiles('model', [model('base.stl')]));
            act(() => result.current.addFiles('source', [new File(['x'], 'main.py')]));
            expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            // Removing the first model moves the preview on to the next one and releases the old URL
            act(() => result.current.removePendingFile('model', result.current.pendingFiles.model[0].id));
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:arm');
            expect(result.current.pendingModelPreviewUrl).toBe('blob:base');
        });

        it('makes a new preview when the first model is picked again', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:v1').mockReturnValueOnce('blob:v2');
            serveProject();
            const { result } = await mountProject();

            act(() => result.current.addFiles('model', [model('arm.stl')]));
            act(() => result.current.addFiles('model', [model('arm.stl')]));

            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:v1');
            expect(result.current.pendingModelPreviewUrl).toBe('blob:v2');
        });

        it('releases the preview when the last pending model is removed', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:arm');
            serveProject();
            const { result } = await mountProject();
            act(() => result.current.addFiles('model', [model('arm.stl')]));

            act(() => result.current.removePendingFile('model', result.current.pendingFiles.model[0].id));

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:arm');
            expect(result.current.pendingModelPreviewUrl).toBeNull();
        });

        it('releases the preview on unmount', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:arm');
            serveProject();
            const { result, unmount } = await mountProject();
            act(() => result.current.addFiles('model', [model('arm.stl')]));
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();

            unmount();

            expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:arm');
        });

        it('makes no preview URL for a model picked after the page is gone', async () => {
            serveProject();
            const { result, unmount } = await mountProject();
            const { addFiles } = result.current;
            unmount();

            act(() => addFiles('model', [model('arm.stl')]));

            expect(URL.createObjectURL).not.toHaveBeenCalled();
        });
    });

    describe('cover from a model snapshot', () => {
        const frame = (type = 'image/png') => new Blob(['frame'], { type });

        it('makes the snapshot the cover while the project has none', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:cover');
            serveProject();
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            const { result } = await mountProject();
            expect(result.current.isCustomImage).toBe(false);

            let used;
            act(() => {
                used = result.current.setCoverFromModelSnapshot(frame());
            });

            expect(used).toBe(true);
            expect(result.current.imagePreview).toBe('blob:cover');
            expect(toast.success).toHaveBeenCalledWith('Made a cover image from your 3D model!');
            await submitForm(result);
            const cover = client.post.mock.calls[0][1].get('project_image');
            expect(cover.name).toBe('model_cover.png');
            expect(cover.type).toBe('image/png');
        });

        it.each([
            ['image/jpeg', 'model_cover.jpg', 'image/jpeg'],
            ['image/webp', 'model_cover.webp', 'image/webp'],
            ['', 'model_cover.png', 'image/png'],
        ])('names a snapshot of type "%s" after its type', async (type, name, sentType) => {
            serveProject();
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            const { result } = await mountProject();

            act(() => {
                result.current.setCoverFromModelSnapshot(frame(type));
            });
            await submitForm(result);

            const cover = client.post.mock.calls[0][1].get('project_image');
            expect(cover.name).toBe(name);
            expect(cover.type).toBe(sentType);
        });

        it('replaces a cover it made earlier and releases that preview', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
            serveProject();
            const { result } = await mountProject();

            act(() => {
                result.current.setCoverFromModelSnapshot(frame());
            });
            act(() => {
                result.current.setCoverFromModelSnapshot(frame());
            });

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
            expect(result.current.imagePreview).toBe('blob:second');
        });

        it('leaves a cover the student picked alone, even when the snapshot arrives later', async () => {
            URL.createObjectURL.mockReturnValueOnce('blob:picked');
            serveProject();
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            const { result } = await mountProject();
            // Taken before the student picked an image, as a snapshot still being drawn would be
            const lateSnapshot = result.current.setCoverFromModelSnapshot;
            await act(async () => {
                await result.current.handleFileChange({
                    target: { name: 'project_image', files: [new File(['img'], 'mine.png', { type: 'image/png' })] },
                });
            });

            let used;
            act(() => {
                used = lateSnapshot(frame());
            });

            expect(used).toBe(false);
            expect(result.current.imagePreview).toBe('blob:picked');
            expect(toast.success).not.toHaveBeenCalled();
            await submitForm(result);
            expect(client.post.mock.calls[0][1].get('project_image').name).toBe('mine.png');
        });

        it('leaves the saved cover of the project alone', async () => {
            serveProject({ project: { name: 'Proj 1', user_id: '2', image_url: '/cover.png' } });
            const { result } = await mountProject();
            expect(result.current.isCustomImage).toBe(true);

            let used;
            act(() => {
                used = result.current.setCoverFromModelSnapshot(frame());
            });

            expect(used).toBe(false);
            expect(result.current.imagePreview).toBe('/cover.png');
            expect(URL.createObjectURL).not.toHaveBeenCalled();
        });

        it('ignores a missing snapshot and one that arrives after the page is gone', async () => {
            serveProject();
            const { result, unmount } = await mountProject();

            expect(result.current.setCoverFromModelSnapshot(null)).toBe(false);
            const late = result.current.setCoverFromModelSnapshot;
            unmount();

            expect(late(frame())).toBe(false);
            expect(URL.createObjectURL).not.toHaveBeenCalled();
            expect(toast.success).not.toHaveBeenCalled();
        });
    });
});
