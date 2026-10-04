// How long to wait for the browser to load and seek the video before giving up
// (a stalled download or an unsupported codec never fires onseeked or onerror).
const THUMBNAIL_TIMEOUT_MS = 10000;

/**
 * Extracts a thumbnail frame from a video file.
 * @param {File} videoFile - The video file object.
 * @param {number} seekTime - Time in seconds to capture the frame.
 * @returns {Promise<Blob>} - A promise that resolves to an image blob.
 */
export const extractVideoThumbnail = (videoFile, seekTime = 1) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        // Use a hidden container to avoid polluting the DOM
        video.style.display = 'none';
        document.body.appendChild(video);

        const objectUrl = URL.createObjectURL(videoFile);
        let timer = null;
        let settled = false;

        // Releases the element and the blob URL exactly once, whichever way we finish.
        // Returns false if something already finished, so a late event is ignored.
        const cleanup = () => {
            if (settled) return false;
            settled = true;
            clearTimeout(timer);
            URL.revokeObjectURL(objectUrl);
            video.remove();
            return true;
        };
        const succeed = (blob) => { if (cleanup()) resolve(blob); };
        const fail = (err) => { if (cleanup()) reject(err); };

        timer = setTimeout(() => fail(new Error('Thumbnail extraction timed out')), THUMBNAIL_TIMEOUT_MS);

        video.onloadedmetadata = () => {
            // Seek to the specified time or the middle if seekTime is longer than duration.
            // duration is NaN/Infinity for some streams: fall back to the first frame.
            const duration = Number.isFinite(video.duration) ? video.duration : 0;
            video.currentTime = Math.min(seekTime, duration / 2);
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob((blob) => {
                    // toBlob yields null when the frame could not be encoded (e.g. zero size)
                    if (!blob) {
                        fail(new Error('Failed to encode thumbnail'));
                        return;
                    }
                    succeed(blob);
                }, 'image/jpeg', 0.85);
            } catch (err) {
                fail(err);
            }
        };

        video.onerror = () => {
            fail(new Error('Failed to load video for thumbnail extraction'));
        };

        video.src = objectUrl;
    });
};
