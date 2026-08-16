/**
 * Renders the track metadata header above the media element (title, artist,
 * short description, and an optional collapsible long description).
 */
export interface TrackInfoData {
    title?: string;
    artist?: string;
    description?: string;
    /** Host-supplied RTE HTML; sanitised before render. */
    longDescription?: string;
    /** Preformatted, already localised publish date. */
    date?: string;
    /** Duration in seconds (playlists only; standalone players omit this). */
    duration?: number;
    trackNumber?: number;
    totalTracks?: number;
}
export declare class TrackInfoView {
    readonly element: HTMLElement;
    private readonly classPrefix;
    private readonly titleElementId;
    private readonly longDescPanelId;
    private readonly handleClick;
    private static instanceCounter;
    constructor(classPrefix?: string);
    mount(container: HTMLElement, before?: Node | null): void;
    render(data: TrackInfoData): void;
    hide(): void;
    destroy(): void;
    private hasVisibleContent;
    private toggleLongDescription;
}
//# sourceMappingURL=TrackInfoView.d.ts.map