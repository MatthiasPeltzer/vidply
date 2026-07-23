export interface ResizeHandle {
    direction: string;
    element: HTMLElement;
}
export declare function createResizeHandles(element: HTMLElement, classPrefix: string, handlePrefix: string): ResizeHandle[];
export declare function removeResizeHandles(element: HTMLElement, classPrefix: string): void;
export declare function toggleResizableState(element: HTMLElement, classPrefix: string, isResizable: boolean): void;
export declare function getCursorForDirection(direction: string): string;
//# sourceMappingURL=ResizeHandles.d.ts.map