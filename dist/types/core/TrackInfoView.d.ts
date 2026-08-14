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
    /** Duration in seconds. */
    duration?: number;
    trackNumber?: number;
    totalTracks?: number;
}
export declare class TrackInfoView {
    readonly element: HTMLElement;
    private readonly classPrefix;
    private readonly handleClick;
    constructor(classPrefix?: string);
    mount(container: HTMLElement, before?: Node | null): void;
    render(data: TrackInfoData): void;
    hide(): void;
    destroy(): void;
    private hasVisibleContent;
    private toggleLongDescription;
}
//# sourceMappingURL=TrackInfoView.d.ts.map