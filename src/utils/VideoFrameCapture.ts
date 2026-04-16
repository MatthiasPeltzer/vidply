export interface CaptureFrameOptions {
  restoreState?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export async function captureVideoFrame(
  video: HTMLVideoElement | null,
  time: number,
  options: CaptureFrameOptions = {}
): Promise<string | null> {
  if (!video || video.tagName !== 'VIDEO') {
    return null;
  }

  const { restoreState = true, quality = 0.9, maxWidth, maxHeight } = options;

  const wasPlaying = !video.paused;
  const originalTime = video.currentTime;
  const originalMuted = video.muted;

  if (restoreState) {
    video.muted = true;
  }

  return new Promise<string | null>((resolve) => {
    const captureFrame = () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

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

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0, width, height);

        const dataURL = canvas.toDataURL('image/jpeg', quality);

        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch(() => {});
          }
        }

        resolve(dataURL);
      } catch {
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
      requestAnimationFrame(() => {
        requestAnimationFrame(captureFrame);
      });
    };

    const timeDiff = Math.abs(video.currentTime - time);
    if (timeDiff < 0.1 && video.readyState >= 2) {
      captureFrame();
    } else if (video.readyState >= 1) {
      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;
    } else {
      const onLoadedMetadata = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('seeked', onSeeked);
        video.currentTime = time;
      };
      video.addEventListener('loadedmetadata', onLoadedMetadata);
    }
  });
}
