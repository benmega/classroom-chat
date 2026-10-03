import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractVideoThumbnail } from './video';

const file = new File(['bytes'], 'clip.mp4', { type: 'video/mp4' });

const hiddenVideo = () => document.body.querySelector('video');
const setVideoProps = (video, props) => {
    Object.entries(props).forEach(([key, value]) => {
        Object.defineProperty(video, key, { value, configurable: true, writable: true });
    });
};

describe('extractVideoThumbnail', () => {
    let originalToBlob;
    let originalGetContext;
    let drawImage;

    beforeEach(() => {
        vi.useFakeTimers();
        window.URL.createObjectURL = vi.fn(() => 'blob:video-url');
        window.URL.revokeObjectURL = vi.fn();
        drawImage = vi.fn();
        originalGetContext = HTMLCanvasElement.prototype.getContext;
        originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage }));
        HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })));
    });

    afterEach(() => {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        HTMLCanvasElement.prototype.toBlob = originalToBlob;
        document.body.innerHTML = '';
        vi.useRealTimers();
    });

    it('resolves with the encoded frame and cleans up after itself', async () => {
        const promise = extractVideoThumbnail(file);
        const video = hiddenVideo();
        expect(video).not.toBeNull();
        expect(video.style.display).toBe('none');
        expect(video.src).toBe('blob:video-url');
        setVideoProps(video, { duration: 20, videoWidth: 640, videoHeight: 360 });

        video.onloadedmetadata();
        expect(video.currentTime).toBe(1);
        video.onseeked();

        const blob = await promise;
        expect(blob).toBeInstanceOf(Blob);
        expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360);
        expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
        expect(hiddenVideo()).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-url');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('captures at the requested time', () => {
        extractVideoThumbnail(file, 3);
        const video = hiddenVideo();
        setVideoProps(video, { duration: 20 });

        video.onloadedmetadata();

        expect(video.currentTime).toBe(3);
    });

    it('captures the middle of a video shorter than twice the seek time', () => {
        extractVideoThumbnail(file);
        const video = hiddenVideo();
        setVideoProps(video, { duration: 1.2 });

        video.onloadedmetadata();

        expect(video.currentTime).toBeCloseTo(0.6);
    });

    it.each([NaN, Infinity])('falls back to the first frame when the duration is %p', (duration) => {
        extractVideoThumbnail(file);
        const video = hiddenVideo();
        setVideoProps(video, { duration });

        video.onloadedmetadata();

        expect(video.currentTime).toBe(0);
    });

    it('rejects and cleans up when the video fails to load', async () => {
        const promise = extractVideoThumbnail(file);
        const video = hiddenVideo();

        video.onerror();

        await expect(promise).rejects.toThrow('Failed to load video for thumbnail extraction');
        expect(hiddenVideo()).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-url');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects when the frame cannot be encoded (toBlob yields null)', async () => {
        HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => callback(null));
        const promise = extractVideoThumbnail(file);
        const video = hiddenVideo();
        setVideoProps(video, { duration: 10, videoWidth: 0, videoHeight: 0 });

        video.onloadedmetadata();
        video.onseeked();

        await expect(promise).rejects.toThrow('Failed to encode thumbnail');
        expect(hiddenVideo()).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects and cleans up when drawing the frame throws', async () => {
        HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
        const promise = extractVideoThumbnail(file);
        const video = hiddenVideo();
        setVideoProps(video, { duration: 10, videoWidth: 10, videoHeight: 10 });

        video.onloadedmetadata();
        video.onseeked();

        await expect(promise).rejects.toThrow(TypeError);
        expect(hiddenVideo()).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-url');
    });

    it('gives up after 10 seconds when the browser never loads or seeks', async () => {
        const promise = extractVideoThumbnail(file);
        const assertion = expect(promise).rejects.toThrow('Thumbnail extraction timed out');
        expect(hiddenVideo()).not.toBeNull();

        vi.advanceTimersByTime(9999);
        expect(hiddenVideo()).not.toBeNull();
        vi.advanceTimersByTime(1);

        await assertion;
        expect(hiddenVideo()).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-url');
    });

    it('ignores events that arrive after it has already settled', async () => {
        const promise = extractVideoThumbnail(file);
        const video = hiddenVideo();
        setVideoProps(video, { duration: 10, videoWidth: 10, videoHeight: 10 });
        video.onloadedmetadata();
        video.onseeked();
        await promise;

        // A second seek, an error and the timeout must not clean up (or fail) twice.
        expect(() => {
            video.onseeked();
            video.onerror();
            vi.advanceTimersByTime(20000);
        }).not.toThrow();
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    });

    it('does not settle a second time after a timeout', async () => {
        const promise = extractVideoThumbnail(file);
        const video = hiddenVideo();
        setVideoProps(video, { duration: 10, videoWidth: 10, videoHeight: 10 });
        const assertion = expect(promise).rejects.toThrow('Thumbnail extraction timed out');
        vi.advanceTimersByTime(10000);
        await assertion;

        expect(() => {
            video.onloadedmetadata();
            video.onseeked();
        }).not.toThrow();
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    });
});
