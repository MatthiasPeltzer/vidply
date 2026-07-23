export interface CaptureFrameOptions {
    restoreState?: boolean;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
}
export declare function captureVideoFrame(video: HTMLVideoElement | null, time: number, options?: CaptureFrameOptions): Promise<string | null>;
//# sourceMappingURL=VideoFrameCapture.d.ts.map