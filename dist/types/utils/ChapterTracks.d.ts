/**
 * Chapter track selection shared by the chapters menu and the context menu.
 */
/**
 * The chapters track for the current player language, falling back to an
 * already active chapters track and then to the first one.
 */
export declare function getChapterTrack(element: HTMLMediaElement): TextTrack | null;
/** Enable the track (hidden) and resolve once its cues are available. */
export declare function loadTrackCues(track: TextTrack, element: HTMLMediaElement, timeout?: number): Promise<TextTrack>;
//# sourceMappingURL=ChapterTracks.d.ts.map