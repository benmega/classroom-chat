import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProfile } from './useProfile';
import client from '../api/client';
import toast from 'react-hot-toast';
import { loadCropper } from '../utils/loadCropper';

const mockNavigate = vi.fn();
let mockSlug;
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: mockSlug }),
}));

vi.mock('../api/client', () => ({
    default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const mockCheckAuth = vi.fn();
vi.mock('../store/useAuthStore', () => ({
    default: () => ({ checkAuth: mockCheckAuth }),
}));

vi.mock('../utils/confirm', () => ({
    showConfirm: vi.fn().mockResolvedValue(true),
}));

vi.mock('../utils/loadCropper', () => ({
    loadCropper: vi.fn(),
}));

const profile = { viewer: { id: 1, role: 'student' }, target: { id: 1, notes: [{ id: 5 }, { id: 6 }] } };
const ok = (data = profile) => ({ data: { data } });
const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data: {} } });

// A stand-in for the Cropper.js class that records how it was built and torn down.
const makeFakeCropper = () => {
    const instances = [];
    class FakeCropper {
        constructor(element, options) {
            this.element = element;
            this.options = options;
            this.destroy = vi.fn();
            this.getCroppedCanvas = vi.fn(() => ({
                toBlob: (callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })),
            }));
            instances.push(this);
        }
    }
    return { FakeCropper, instances };
};

const mountLoaded = async () => {
    client.get.mockResolvedValue(ok());
    const hook = renderHook(() => useProfile());
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
};

describe('useProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockReset();
        client.post.mockReset();
        mockSlug = undefined;
    });

    describe('loading the profile', () => {
        it('loads the own profile', async () => {
            const { result } = await mountLoaded();

            expect(client.get).toHaveBeenCalledWith('/user/profile');
            expect(result.current.profileData).toEqual(profile);
            expect(result.current.loadError).toBe(false);
            expect(result.current.isOwner).toBe(true);
        });

        it('loads another user\'s profile by slug', async () => {
            mockSlug = 'ada';
            client.get.mockResolvedValue(ok({ viewer: { id: 1, role: 'student' }, target: { id: 2 } }));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(client.get).toHaveBeenCalledWith('/user/profile/ada');
            expect(result.current.isOwner).toBe(false);
        });

        it('redirects the settings aliases to /settings without fetching', () => {
            mockSlug = 'edit';
            renderHook(() => useProfile());

            expect(mockNavigate).toHaveBeenCalledWith('/settings', { replace: true });
            expect(client.get).not.toHaveBeenCalled();
        });

        it('sends an unauthenticated own-profile load (401) to the login page', async () => {
            client.get.mockRejectedValue(httpError(401));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(mockNavigate).toHaveBeenCalledWith('/login');
            expect(result.current.loadError).toBe(false);
        });

        it.each([500, 503])('stays on the page with a retryable error for a %i on the own profile', async (status) => {
            client.get.mockRejectedValue(httpError(status));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('Failed to load profile.');
            expect(result.current.loadError).toBe(true);
            expect(result.current.profileData).toBeNull();
        });

        it('treats a network failure (no response) as retryable, not as logged out', async () => {
            client.get.mockRejectedValue(new Error('Network Error'));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(result.current.loadError).toBe(true);
        });

        it('does not offer a retry for a profile that does not exist (404)', async () => {
            mockSlug = 'nobody';
            client.get.mockRejectedValue(httpError(404));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(result.current.loadError).toBe(false);
            expect(result.current.profileData).toBeNull();
        });

        it('offers a retry for a server error on another user\'s profile', async () => {
            mockSlug = 'ada';
            client.get.mockRejectedValue(httpError(500));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(result.current.loadError).toBe(true);
        });

        it('retryProfile reloads and clears the error', async () => {
            client.get.mockRejectedValueOnce(httpError(500));
            const { result } = renderHook(() => useProfile());
            await waitFor(() => expect(result.current.loadError).toBe(true));

            client.get.mockResolvedValue(ok());
            await act(async () => { await result.current.retryProfile(); });

            expect(result.current.loadError).toBe(false);
            expect(result.current.profileData).toEqual(profile);
            expect(client.get).toHaveBeenCalledTimes(2);
        });
    });

    describe('notes', () => {
        it('removes a deleted note from the profile', async () => {
            const { result } = await mountLoaded();
            client.post.mockResolvedValue({});

            await act(async () => { await result.current.handleDeleteNote(5); });

            expect(client.post).toHaveBeenCalledWith('/notes/delete/5');
            expect(result.current.profileData.target.notes).toEqual([{ id: 6 }]);
        });
    });

    describe('choosing a profile picture', () => {
        const pick = (result, file) => act(async () => {
            result.current.handlePfpChange({ target: { files: [file] } });
        });

        it('rejects files that are not supported images', async () => {
            const { result } = await mountLoaded();

            await pick(result, new File(['x'], 'doc.pdf', { type: 'application/pdf' }));

            expect(toast.error).toHaveBeenCalledWith('Please select a valid image file (JPG, PNG, WebP).');
            expect(result.current.isCropping).toBe(false);
        });

        it.each(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])('opens the cropper for %s', async (type) => {
            const { result } = await mountLoaded();
            loadCropper.mockReturnValue(new Promise(() => {}));

            await pick(result, new File(['x'], 'pic', { type }));

            await waitFor(() => expect(result.current.isCropping).toBe(true));
            expect(result.current.cropImage).toMatch(/^data:/);
        });

        it('ignores an empty selection', async () => {
            const { result } = await mountLoaded();

            act(() => { result.current.handlePfpChange({ target: { files: [] } }); });

            expect(result.current.isCropping).toBe(false);
            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('cropper lifecycle', () => {
        const openCropper = async (hook, deferredLoad) => {
            hook.result.current.cropImgRef.current = document.createElement('img');
            loadCropper.mockReturnValue(deferredLoad);
            act(() => { hook.result.current.setIsCropping(true); });
        };

        it('builds the cropper once the library has loaded', async () => {
            const hook = await mountLoaded();
            const { FakeCropper, instances } = makeFakeCropper();

            await openCropper(hook, Promise.resolve(FakeCropper));

            await waitFor(() => expect(instances).toHaveLength(1));
            expect(instances[0].element).toBe(hook.result.current.cropImgRef.current);
            expect(instances[0].options).toMatchObject({ aspectRatio: 1, viewMode: 2, minCropBoxWidth: 100 });
        });

        it('builds nothing if the dialog closes before the library has loaded', async () => {
            const hook = await mountLoaded();
            const { FakeCropper, instances } = makeFakeCropper();
            let finishLoad;
            await openCropper(hook, new Promise((resolve) => { finishLoad = resolve; }));

            act(() => { hook.result.current.setIsCropping(false); });
            await act(async () => { finishLoad(FakeCropper); });

            expect(instances).toHaveLength(0);
        });

        it('builds nothing if the hook unmounts before the library has loaded', async () => {
            const hook = await mountLoaded();
            const { FakeCropper, instances } = makeFakeCropper();
            let finishLoad;
            await openCropper(hook, new Promise((resolve) => { finishLoad = resolve; }));

            hook.unmount();
            await act(async () => { finishLoad(FakeCropper); });

            expect(instances).toHaveLength(0);
        });

        it('does not build a cropper when the image element is gone', async () => {
            const hook = await mountLoaded();
            const { FakeCropper, instances } = makeFakeCropper();
            loadCropper.mockReturnValue(Promise.resolve(FakeCropper));

            act(() => { hook.result.current.setIsCropping(true); });
            await act(async () => { await Promise.resolve(); });

            expect(instances).toHaveLength(0);
        });

        it('destroys the cropper when the dialog closes', async () => {
            const hook = await mountLoaded();
            const { FakeCropper, instances } = makeFakeCropper();
            await openCropper(hook, Promise.resolve(FakeCropper));
            await waitFor(() => expect(instances).toHaveLength(1));

            act(() => { hook.result.current.setIsCropping(false); });

            expect(instances[0].destroy).toHaveBeenCalledTimes(1);
        });

        it('tells the user and closes the dialog when the library cannot be loaded', async () => {
            const hook = await mountLoaded();
            vi.spyOn(console, 'error').mockImplementation(() => {});

            await openCropper(hook, Promise.reject(new Error('Failed to load the image cropper')));

            await waitFor(() => expect(hook.result.current.isCropping).toBe(false));
            expect(toast.error).toHaveBeenCalledWith('Could not load the image editor. Please try again.');
        });

        it('stays quiet about a failed load that arrives after the dialog was closed', async () => {
            const hook = await mountLoaded();
            vi.spyOn(console, 'error').mockImplementation(() => {});
            let failLoad;
            await openCropper(hook, new Promise((_, reject) => { failLoad = reject; }));

            act(() => { hook.result.current.setIsCropping(false); });
            await act(async () => { failLoad(new Error('late')); });

            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('saving the crop', () => {
        const openAndCrop = async () => {
            const hook = await mountLoaded();
            const { FakeCropper, instances } = makeFakeCropper();
            hook.result.current.cropImgRef.current = document.createElement('img');
            loadCropper.mockReturnValue(Promise.resolve(FakeCropper));
            act(() => { hook.result.current.setIsCropping(true); });
            await waitFor(() => expect(instances).toHaveLength(1));
            return { ...hook, instances };
        };
        const save = (hook) => act(async () => { await hook.result.current.handleSaveCrop(); });

        it('does nothing without a cropper', async () => {
            const hook = await mountLoaded();

            await save(hook);

            expect(client.post).not.toHaveBeenCalled();
        });

        it('uploads the cropped picture, refreshes the profile and the signed-in user', async () => {
            const hook = await openAndCrop();
            client.post.mockResolvedValue({ data: { status: 'success' } });

            await save(hook);

            expect(client.post).toHaveBeenCalledWith('/user/api/profile-picture', expect.any(FormData));
            await waitFor(() => expect(hook.result.current.isCropping).toBe(false));
            expect(mockCheckAuth).toHaveBeenCalledTimes(1);
            expect(client.get).toHaveBeenCalledTimes(2);
        });

        it('does not refresh the signed-in user when viewing someone else\'s profile', async () => {
            mockSlug = 'ada';
            client.get.mockResolvedValue(ok({ viewer: { id: 1, role: 'admin' }, target: { id: 2 } }));
            const hook = renderHook(() => useProfile());
            await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
            const { FakeCropper, instances } = makeFakeCropper();
            hook.result.current.cropImgRef.current = document.createElement('img');
            loadCropper.mockReturnValue(Promise.resolve(FakeCropper));
            act(() => { hook.result.current.setIsCropping(true); });
            await waitFor(() => expect(instances).toHaveLength(1));
            client.post.mockResolvedValue({ data: { status: 'success' } });

            await save(hook);

            expect(mockCheckAuth).not.toHaveBeenCalled();
        });

        it('shows the server\'s message when the upload is rejected in the response body', async () => {
            const hook = await openAndCrop();
            client.post.mockResolvedValue({ data: { status: 'error', error: 'File too large.' } });

            await save(hook);

            expect(toast.error).toHaveBeenCalledWith('File too large.');
            expect(hook.result.current.isCropping).toBe(true);
        });

        it('shows the message of a failed request, whichever field the route uses', async () => {
            const hook = await openAndCrop();
            client.post.mockRejectedValue({ response: { data: { success: false, message: 'Upload blocked.' } } });

            await save(hook);

            expect(toast.error).toHaveBeenCalledWith('Upload blocked.');
        });

        it('falls back to a generic message when the failure carries no text', async () => {
            const hook = await openAndCrop();
            client.post.mockRejectedValue(new Error('Network Error'));

            await save(hook);

            expect(toast.error).toHaveBeenCalledWith('Server error during upload.');
        });

        it('reports an image that could not be encoded', async () => {
            const hook = await openAndCrop();
            hook.instances[0].getCroppedCanvas = vi.fn(() => ({ toBlob: (callback) => callback(null) }));

            await save(hook);

            expect(toast.error).toHaveBeenCalledWith('Failed to process image.');
            expect(client.post).not.toHaveBeenCalled();
        });

        it('reports a crop that throws', async () => {
            const hook = await openAndCrop();
            vi.spyOn(console, 'error').mockImplementation(() => {});
            hook.instances[0].getCroppedCanvas = vi.fn(() => { throw new Error('canvas'); });

            await save(hook);

            expect(toast.error).toHaveBeenCalledWith('Error cropping image.');
        });
    });
});
