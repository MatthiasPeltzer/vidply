import type { StorageManager } from './StorageManager.js';
export interface DraggableResizableOptions {
    dragHandle?: HTMLElement | null;
    resizeHandles?: HTMLElement[];
    onDragStart?: ((e: Event) => boolean | void) | null;
    onDrag?: ((pos: {
        x?: number;
        y?: number;
        centered?: boolean;
    }) => void) | null;
    onDragEnd?: (() => void) | null;
    onResizeStart?: (() => void) | null;
    onResize?: ((dims: {
        width: number;
        height: number;
        left?: number;
        top?: number;
    }) => void) | null;
    onResizeEnd?: (() => void) | null;
    constrainToViewport?: boolean;
    minWidth?: number;
    minHeight?: number;
    maintainAspectRatio?: boolean;
    keyboardDragKey?: string;
    keyboardResizeKey?: string;
    keyboardStep?: number;
    keyboardStepLarge?: number;
    maxWidth?: number | (() => number) | null;
    maxHeight?: number | (() => number) | null;
    pointerResizeIndicatorText?: string | null;
    onPointerResizeToggle?: ((enabled: boolean) => void) | null;
    classPrefix?: string;
    storage?: StorageManager | null;
    storageKey?: string | null;
}
interface ResolvedOptions extends Required<Omit<DraggableResizableOptions, 'maxWidth' | 'maxHeight'>> {
    maxWidth: number | (() => number) | null;
    maxHeight: number | (() => number) | null;
}
export declare class DraggableResizable {
    element: HTMLElement;
    options: ResolvedOptions;
    isDragging: boolean;
    isResizing: boolean;
    resizeDirection: string | null;
    dragOffsetX: number;
    dragOffsetY: number;
    positionOffsetX: number;
    positionOffsetY: number;
    initialMouseX: number;
    initialMouseY: number;
    needsPositionConversion: boolean;
    resizeStartX: number;
    resizeStartY: number;
    resizeStartWidth: number;
    resizeStartHeight: number;
    resizeStartLeft: number;
    resizeStartTop: number;
    keyboardDragMode: boolean;
    keyboardResizeMode: boolean;
    pointerResizeMode: boolean;
    manuallyPositioned: boolean;
    resizeHandlesManaged: Map<HTMLElement, boolean>;
    resizeIndicatorElement: HTMLElement | null;
    handlers: {
        mousedown: (e: MouseEvent) => void;
        mousemove: (e: MouseEvent) => void;
        mouseup: () => void;
        touchstart: (e: TouchEvent) => void;
        touchmove: (e: TouchEvent) => void;
        touchend: () => void;
        pointerdown: (e: PointerEvent) => void;
        pointermove: (e: PointerEvent) => void;
        pointerup: (e: PointerEvent) => void;
        pointercancel: (e: PointerEvent) => void;
        keydown: (e: KeyboardEvent) => void;
        resizeHandleMousedown: (e: MouseEvent | TouchEvent) => void;
        resizeHandlePointerDown: (e: PointerEvent) => void;
    };
    activePointerId: number | null;
    activePointerType: string | null;
    constructor(element: HTMLElement, options?: DraggableResizableOptions);
    hasManagedResizeHandles(): boolean;
    storeOriginalHandleDisplay(handle: HTMLElement): void;
    hideResizeHandle(handle: HTMLElement): void;
    showResizeHandle(handle: HTMLElement): void;
    setManagedHandlesVisible(visible: boolean): void;
    init(): void;
    onPointerDown(e: PointerEvent): void;
    onPointerMove(e: PointerEvent): void;
    onPointerUp(e: PointerEvent): void;
    onMouseDown(e: MouseEvent): void;
    onTouchStart(e: TouchEvent): void;
    onResizeHandlePointerDown(e: PointerEvent): void;
    onResizeHandleMouseDown(e: MouseEvent | TouchEvent): void;
    onMouseMove(e: MouseEvent): void;
    onTouchMove(e: TouchEvent): void;
    onMouseUp(): void;
    onTouchEnd(): void;
    onKeyDown(e: KeyboardEvent): void;
    startDragging(clientX: number, clientY: number): void;
    drag(clientX: number, clientY: number): void;
    stopDragging(): void;
    startResizing(clientX: number, clientY: number): void;
    resize(clientX: number, clientY: number): void;
    stopResizing(): void;
    toggleKeyboardDragMode(): void;
    enableKeyboardDragMode(): void;
    disableKeyboardDragMode(): void;
    toggleKeyboardResizeMode(): void;
    enableKeyboardResizeMode(): void;
    disableKeyboardResizeMode(): void;
    enablePointerResizeMode({ focus }?: {
        focus?: boolean;
    }): void;
    disablePointerResizeMode({ focus }?: {
        focus?: boolean;
    }): void;
    togglePointerResizeMode(): boolean;
    focusElement(): void;
    keyboardDrag(key: string, shiftKey: boolean): void;
    keyboardResize(key: string, shiftKey: boolean): void;
    resetPosition(): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=DraggableResizable.d.ts.map