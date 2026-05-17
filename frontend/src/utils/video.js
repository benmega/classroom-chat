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

        video.onloadedmetadata = () => {
            // Seek to the specified time or the middle if seekTime is longer than duration
            const captureTime = Math.min(seekTime, video.duration / 2);
            video.currentTime = captureTime;
        };

        video.onseeked = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob((blob) => {
                    // Cleanup
                    URL.revokeObjectURL(video.src);
                    document.body.removeChild(video);
                    resolve(blob);
                }, 'image/jpeg', 0.85);
            } catch (err) {
                // Cleanup on error
                URL.revokeObjectURL(video.src);
                document.body.removeChild(video);
                reject(err);
            }
        };

        video.onerror = () => {
            // Cleanup
            URL.revokeObjectURL(video.src);
            if (video.parentNode) document.body.removeChild(video);
            reject(new Error('Failed to load video for thumbnail extraction'));
        };

        video.src = URL.createObjectURL(videoFile);
    });
};
