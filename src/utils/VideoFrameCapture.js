/**
 * Utility for capturing frames from video elements
 */

/**
 * Capture a frame from a video element at a specific time
 * @param {HTMLVideoElement} video - Video element to capture from
 * @param {number} time - Time in seconds to capture
 * @param {Object} options - Options for frame capture
 * @param {boolean} [options.restoreState=true] - Whether to restore video state after capture
 * @param {number} [options.quality=0.9] - JPEG quality (0-1)
 * @param {number} [options.maxWidth] - Maximum width for thumbnail
 * @param {number} [options.maxHeight] - Maximum height for thumbnail
 * @returns {Promise<string|null>} Data URL of the captured frame or null if failed
 */
export async function captureVideoFrame(video, time, options = {}) {
    if (!video || video.tagName !== 'VIDEO') {
        return null;
    }

    const {
        restoreState = true,
        quality = 0.9,
        maxWidth,
        maxHeight
    } = options;

    // Save original state if we need to restore it
    const wasPlaying = !video.paused;
    const originalTime = video.currentTime;
    const originalMuted = video.muted;

    // Ensure video is muted during capture to avoid audio playback
    if (restoreState) {
        video.muted = true;
    }

    return new Promise((resolve) => {
        const captureFrame = () => {
            try {
                // Get video dimensions
                let width = video.videoWidth || 640;
                let height = video.videoHeight || 360;

                // Scale down if max dimensions specified
                if (maxWidth && width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = Math.round(height * ratio);
                }
                if (maxHeight && height > maxHeight) {
                    const ratio = maxHeight / height;
                    height = maxHeight;
                    width = Math.round(width * ratio);
                }

                // Create canvas to capture frame
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, width, height);
                
                const dataURL = canvas.toDataURL('image/jpeg', quality);
                
                // Restore original state if needed
                if (restoreState) {
                    video.currentTime = originalTime;
                    video.muted = originalMuted;
                    if (wasPlaying && !video.paused) {
                        video.play().catch(() => {});
                    }
                }
                
                resolve(dataURL);
            } catch (error) {
                // Restore original state on error
                if (restoreState) {
                    video.currentTime = originalTime;
                    video.muted = originalMuted;
                    if (wasPlaying && !video.paused) {
                        video.play().catch(() => {});
                    }
                }
                resolve(null);
            }
        };

        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            // Wait for frame to be ready (double RAF for better frame quality)
            requestAnimationFrame(() => {
                requestAnimationFrame(captureFrame);
            });
        };

        // Check if video is already at the right time and ready
        const timeDiff = Math.abs(video.currentTime - time);
        // Need at least HAVE_METADATA (1) to know duration, but HAVE_CURRENT_DATA (2) is better for frame capture
        if (timeDiff < 0.1 && video.readyState >= 2) {
            // Video is already at the right position, capture immediately
            captureFrame();
        } else if (video.readyState >= 1) {
            // Video has metadata, we can seek
            video.addEventListener('seeked', onSeeked);
            video.currentTime = time;
        } else {
            // Video not ready yet, wait for metadata first
            const onLoadedMetadata = () => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                video.addEventListener('seeked', onSeeked);
                video.currentTime = time;
            };
            video.addEventListener('loadedmetadata', onLoadedMetadata);
        }
    });
}

