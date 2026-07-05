/**
 * Floating Player Manager
 *
 * Custom in-page Picture-in-Picture. Moves the entire player.container
 * into a position:fixed, draggable and resizable shell that lives outside
 * the document flow (appended to document.body). A transparent placeholder
 * preserves layout and, while floating, serves as the IntersectionObserver
 * sentinel so scroll-based auto-float/redock decisions stay anchored to
 * the original slot.
 *
 * Triggers:
 *   - pinned: the user clicks the control-bar PiP button (only when
 *     options.floating is true; otherwise the button uses native PiP).
 *     Pinned floating ignores scroll-based docking.
 *   - auto: the video is playing and the original slot has scrolled out
 *     of the viewport. Auto-float redocks automatically when the slot
 *     scrolls back in.
 *
 * Close button: pauses playback, exits the floating shell and marks the
 * current play session as dismissed so auto-float will not re-trigger
 * until the user presses play again (matches YouTube miniplayer UX).
 *
 * Only one player is allowed to float at a time across a page; enter()
 * broadcasts a 'vidply:floating-claim' CustomEvent that other managers
 * listen for and auto-exit on.
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { DraggableResizable } from '../utils/DraggableResizable.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import type { Player } from './Player.js';

type FloatingState = 'pinned' | 'auto';
type ExitReason = 'manual' | 'auto' | 'dismiss' | 'claim' | 'destroy';

const FLOATING_CLAIM_EVENT = 'vidply:floating-claim';
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 240;
const EDGE_MARGIN = 16;

interface FloatingPrefs {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
}

export class FloatingPlayerManager {
    player: Player;
    classPrefix: string;

    shell: HTMLElement | null;
    dragHandle: HTMLElement | null;
    closeButton: HTMLButtonElement | null;
    resizeHandles: HTMLElement[];
    placeholder: HTMLElement | null;
    draggable: DraggableResizable | null;

    originalParent: HTMLElement | null;
    originalNextSibling: Node | null;

    intersectionObserver: IntersectionObserver | null;
    observerTarget: HTMLElement | null;
    lastRatio: number;

    _autoDismissedThisPlay: boolean;
    _playListenerAttached: boolean;
    _onPlayAfterDismiss: (() => void) | null;
    _onClaim: ((event: Event) => void) | null;
    _onResize: (() => void) | null;
    _onKeyDown: ((event: KeyboardEvent) => void) | null;
    _onEnterFullscreen: (() => void) | null;
    _destroyed: boolean;
    _triggerFocusEl: HTMLElement | null;
    _claimId: string;
    _lastAutoExitTime: number;

    constructor(player: Player) {
        this.player = player;
        this.classPrefix = player.options.classPrefix || 'vidply';

        this.shell = null;
        this.dragHandle = null;
        this.closeButton = null;
        this.resizeHandles = [];
        this.placeholder = null;
        this.draggable = null;

        this.originalParent = null;
        this.originalNextSibling = null;

        this.intersectionObserver = null;
        this.observerTarget = null;
        this.lastRatio = 1;

        this._autoDismissedThisPlay = false;
        this._playListenerAttached = false;
        this._onPlayAfterDismiss = null;
        this._onClaim = null;
        this._onResize = null;
        this._onKeyDown = null;
        this._onEnterFullscreen = null;
        this._destroyed = false;
        this._triggerFocusEl = null;
        this._claimId = `floating-${player.instanceId}-${Date.now()}`;
        this._lastAutoExitTime = 0;

        this._setupClaimListener();
        this._setupFullscreenGuard();
        this._startObserving();
    }

    // ---------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------

    togglePinned(triggerEl?: HTMLElement | null) {
        if (this._destroyed) return;
        if (this.player.state.floating === 'pinned') {
            // Manual unpin: suppress auto-float for the remainder of the
            // current play session so scrolling doesn't immediately re-pop
            // the floating shell. A fresh 'play' event clears the flag.
            this._autoDismissedThisPlay = true;
            this._armPlayListenerToClearDismiss();
            this.exit('manual');
            return;
        }
        // If the user pins while in 'auto' mode, that's an explicit request
        // to float; any previous auto-dismiss flag should be cleared so the
        // pinned state behaves naturally.
        this._autoDismissedThisPlay = false;
        this._triggerFocusEl = triggerEl || this._activeElement();
        this.enter('pinned');
    }

    enter(reason: FloatingState) {
        if (this._destroyed) return;
        if (this.player.state.floating === reason) return;

        if (!this._canFloat(reason)) {
            return;
        }

        // Upgrade 'auto' -> 'pinned' without rebuilding the shell
        if (this.player.state.floating && this.player.state.floating !== reason) {
            this.player.state.floating = reason;
            this.player.emit('floatingchange', reason);
            return;
        }

        this._claimSingleton();

        this._ensureShell();
        this._mountIntoShell();
        this._applyInitialGeometry();

        this.player.state.floating = reason;
        this.player.emit('floatingchange', reason);

        // Focus the close button after a microtask so screen readers announce
        // the dialog opening.
        queueMicrotask(() => {
            if (this.closeButton && this.player.state.floating) {
                try { this.closeButton.focus({ preventScroll: true }); } catch { /* ignore */ }
            }
        });
    }

    exit(reason: ExitReason = 'manual') {
        if (this._destroyed && reason !== 'destroy') return;
        if (!this.player.state.floating) return;

        if (reason === 'auto') {
            // Record when an auto-exit occurred so the IntersectionObserver
            // callback can apply a cooldown before re-entering auto-float.
            this._lastAutoExitTime = Date.now();
        }

        this._unmountFromShell();
        this._teardownShell();

        const priorTrigger = this._triggerFocusEl;
        this._triggerFocusEl = null;

        this.player.state.floating = null;
        this.player.emit('floatingchange', null);

        // Restore focus to the element that triggered floating (pinned flow).
        // For scroll-based exits we leave focus untouched.
        if ((reason === 'manual' || reason === 'dismiss') && priorTrigger) {
            try { priorTrigger.focus({ preventScroll: true }); } catch { /* ignore */ }
        }
    }

    /**
     * Close button: pause, dismiss, and prevent auto-float until the next
     * user-initiated play event.
     */
    dismiss() {
        if (this._destroyed) return;
        this._autoDismissedThisPlay = true;
        this._armPlayListenerToClearDismiss();

        try {
            this.player.pause();
        } catch { /* ignore */ }

        this.exit('dismiss');
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        if (this.player.state && this.player.state.floating) {
            try { this.exit('destroy'); } catch { /* ignore */ }
        }

        if (this.intersectionObserver) {
            try { this.intersectionObserver.disconnect(); } catch { /* ignore */ }
            this.intersectionObserver = null;
        }
        this.observerTarget = null;

        if (this._onClaim) {
            window.removeEventListener(FLOATING_CLAIM_EVENT, this._onClaim as EventListener);
            this._onClaim = null;
        }
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            this._onResize = null;
        }
        const enterFs = this._onEnterFullscreen;
        if (enterFs) {
            this.player.off('enterfullscreen', enterFs);
            this._onEnterFullscreen = null;
        }
        const playAfterDismiss = this._onPlayAfterDismiss;
        if (playAfterDismiss && this._playListenerAttached) {
            this.player.off('play', playAfterDismiss);
            this._playListenerAttached = false;
            this._onPlayAfterDismiss = null;
        }
    }

    // ---------------------------------------------------------------
    // Internal: guards
    // ---------------------------------------------------------------

    _canFloat(reason: FloatingState): boolean {
        if (!this.player.options.floating) return false;
        if (!this.player.container) return false;
        if (!this.player.element || this.player.element.tagName !== 'VIDEO') return false;
        if (this.player.state.fullscreen) return false;

        // Playlist players move through multiple tracks and manage their own
        // UI; floating support for playlists is out of scope for this v1.
        if (this.player.playlistManager) return false;

        const minWidth = this.player.options.floatingMinViewportWidth ?? 768;
        if (window.innerWidth < minWidth) return false;

        // Auto-float only engages when the user is actively watching.
        if (reason === 'auto') {
            if (this._autoDismissedThisPlay) return false;
            if (this.player.state.paused) return false;
            // Never auto-float before the user has started playback; stops
            // auto-entry from firing while the page is still below the fold
            // on initial load.
            if (!this.player.state.hasStartedPlayback) return false;
        }

        return true;
    }

    _claimSingleton() {
        try {
            window.dispatchEvent(new CustomEvent(FLOATING_CLAIM_EVENT, {
                detail: { claimId: this._claimId }
            }));
        } catch { /* ignore (older browsers) */ }
    }

    _setupClaimListener() {
        this._onClaim = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (!detail || detail.claimId === this._claimId) return;
            if (this.player.state.floating) {
                this.exit('claim');
            }
        };
        const signal = this.player.lifecycleSignal;
        window.addEventListener(FLOATING_CLAIM_EVENT, this._onClaim as EventListener, { signal });

        this._onResize = () => {
            const minWidth = this.player.options.floatingMinViewportWidth ?? 768;
            if (this.player.state.floating && window.innerWidth < minWidth) {
                this.exit('auto');
            }
        };
        window.addEventListener('resize', this._onResize, { signal });
    }

    _setupFullscreenGuard() {
        const onEnterFullscreen = () => {
            if (this.player.state.floating) {
                this.exit('manual');
            }
        };
        this._onEnterFullscreen = onEnterFullscreen;
        this.player.on('enterfullscreen', onEnterFullscreen);
    }

    _armPlayListenerToClearDismiss() {
        if (this._playListenerAttached) return;
        const onPlayAfterDismiss = () => {
            this._autoDismissedThisPlay = false;
            const handler = this._onPlayAfterDismiss;
            if (handler) {
                this.player.off('play', handler);
            }
            this._playListenerAttached = false;
            this._onPlayAfterDismiss = null;
        };
        this._onPlayAfterDismiss = onPlayAfterDismiss;
        this.player.on('play', onPlayAfterDismiss);
        this._playListenerAttached = true;
    }

    // ---------------------------------------------------------------
    // Internal: IntersectionObserver for scroll-triggered auto-float
    // ---------------------------------------------------------------

    _startObserving() {
        if (!('IntersectionObserver' in window)) return;
        if (!this.player.container) return;

        this.observerTarget = this.player.container;
        this.intersectionObserver = new IntersectionObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (!entry) return;
            this.lastRatio = entry.intersectionRatio;

            if (this.player.options.debug) {
                try {
                    console.log('[vidply:floating] intersection', {
                        ratio: Number(entry.intersectionRatio.toFixed(3)),
                        state: this.player.state.floating,
                        paused: this.player.state.paused,
                        hasStartedPlayback: this.player.state.hasStartedPlayback,
                        dismissed: this._autoDismissedThisPlay
                    });
                } catch { /* ignore */ }
            }

            if (this.player.state.floating === 'auto') {
                if (entry.intersectionRatio >= 0.5) {
                    this.exit('auto');
                }
                return;
            }

            // Pinned state: scroll is a no-op, the user has taken control.
            if (this.player.state.floating === 'pinned') {
                return;
            }

            if (entry.intersectionRatio < 0.1 && this._canFloat('auto')) {
                // Brief cooldown after an auto-exit prevents the layout reflow that
                // accompanies the placeholder→container swap from immediately
                // re-triggering auto-float (oscillation guard).
                const AUTO_EXIT_COOLDOWN_MS = 500;
                if (Date.now() - this._lastAutoExitTime < AUTO_EXIT_COOLDOWN_MS) return;
                this.enter('auto');
            }
        }, { threshold: [0, 0.1, 0.5, 0.9] });

        this.intersectionObserver.observe(this.observerTarget);
    }

    _retargetObserver(target: HTMLElement) {
        if (!this.intersectionObserver) return;
        if (this.observerTarget) {
            try { this.intersectionObserver.unobserve(this.observerTarget); } catch { /* ignore */ }
        }
        this.observerTarget = target;
        try { this.intersectionObserver.observe(target); } catch { /* ignore */ }
    }

    // ---------------------------------------------------------------
    // Internal: shell DOM
    // ---------------------------------------------------------------

    _ensureShell() {
        if (this.shell) return;

        this.shell = DOMUtils.createElement('div', {
            className: `${this.classPrefix}-floating-shell`,
            attributes: {
                'role': 'dialog',
                'aria-modal': 'false',
                'aria-label': i18n.t('player.floatingPlayer'),
                'data-vidply-floating': 'true',
                'tabindex': '-1'
            }
        });

        this.dragHandle = DOMUtils.createElement('div', {
            className: `${this.classPrefix}-floating-drag-handle`,
            attributes: { 'aria-hidden': 'true' }
        });
        this.shell.appendChild(this.dragHandle);

        this.closeButton = DOMUtils.createElement('button', {
            className: `${this.classPrefix}-floating-close`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.floatingPlayerClose'),
                'title': i18n.t('player.floatingPlayerClose')
            }
        }) as HTMLButtonElement;
        this.closeButton.appendChild(createIconElement('close'));
        this.closeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.dismiss();
        });
        this.shell.appendChild(this.closeButton);

        this._createResizeHandles();
        const shell = this.shell;
        this.resizeHandles.forEach(handle => shell.appendChild(handle));

        this._onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // If the user is in keyboard drag / resize (or pointer-resize)
                // mode, Escape must exit that mode first — not dismiss the
                // whole floating player. This listener is registered before the
                // DraggableResizable one, so we let the event fall through to
                // it (no dismiss, no stopPropagation) while a mode is active
                // (WCAG 2.1.1). Only a "neutral" Escape dismisses.
                const d = this.draggable;
                const inEditMode = Boolean(
                    d && (d.keyboardDragMode || d.keyboardResizeMode || d.pointerResizeMode)
                );
                if (inEditMode) {
                    return;
                }
                event.stopPropagation();
                this.dismiss();
            }
        };
        this.shell.addEventListener('keydown', this._onKeyDown as EventListener);
    }

    _createResizeHandles() {
        // Resize handles are always-on for the floating shell. Do NOT set
        // `data-vidply-managed-resize="true"`: that flag is used by the
        // transcript / sign-language overlays to gate the handles behind
        // an "R" keypress, and DraggableResizable hides managed handles
        // during init() — which would leave the shell with no visible or
        // hittable edges/corners.
        const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        this.resizeHandles = dirs.map(dir => DOMUtils.createElement('div', {
            className: `${this.classPrefix}-floating-resize-handle ${this.classPrefix}-floating-resize-${dir}`,
            attributes: {
                'data-direction': dir,
                'aria-hidden': 'true'
            }
        }));
    }

    _teardownShell() {
        if (this.draggable) {
            try { this.draggable.destroy(); } catch { /* ignore */ }
            this.draggable = null;
        }
        if (this.shell) {
            if (this._onKeyDown) {
                this.shell.removeEventListener('keydown', this._onKeyDown as EventListener);
                this._onKeyDown = null;
            }
            if (this.shell.parentNode) {
                this.shell.parentNode.removeChild(this.shell);
            }
        }
        this.shell = null;
        this.dragHandle = null;
        this.closeButton = null;
        this.resizeHandles = [];
    }

    // ---------------------------------------------------------------
    // Internal: mount / unmount the player.container
    // ---------------------------------------------------------------

    _mountIntoShell() {
        const container = this.player.container;
        if (!container || !container.parentNode) return;
        if (!this.shell) return;

        const rect = container.getBoundingClientRect();
        this.originalParent = container.parentNode as HTMLElement;
        this.originalNextSibling = container.nextSibling;

        this.placeholder = DOMUtils.createElement('div', {
            className: `${this.classPrefix}-floating-placeholder`,
            attributes: { 'aria-hidden': 'true' }
        });
        this.placeholder.style.width = `${Math.max(1, rect.width)}px`;
        this.placeholder.style.height = `${Math.max(1, rect.height)}px`;

        // Centred PiP glyph that signals "video popped out" in the slot the
        // player used to occupy. Lives as a regular child so it can inherit
        // currentColor and scale with the placeholder; both the icon and
        // the placeholder itself are removed wholesale on _unmountFromShell().
        const placeholderIcon = createIconElement('pip', `${this.classPrefix}-floating-placeholder-icon`);
        this.placeholder.appendChild(placeholderIcon);

        this.originalParent.insertBefore(this.placeholder, container);

        this.shell.appendChild(container);
        document.body.appendChild(this.shell);

        container.classList.add(`${this.classPrefix}-is-floating`);

        // Observe the placeholder while floating so scroll-back decisions are
        // anchored to the original slot instead of the moved container.
        this._retargetObserver(this.placeholder);
    }

    _unmountFromShell() {
        const container = this.player.container;

        if (container) {
            container.classList.remove(`${this.classPrefix}-is-floating`);
            // Clear inline sizes applied while floating
            container.style.removeProperty('width');
            container.style.removeProperty('height');
        }

        if (this.placeholder && this.placeholder.parentNode) {
            if (container) {
                this.placeholder.parentNode.insertBefore(container, this.placeholder);
            }
            this.placeholder.parentNode.removeChild(this.placeholder);
        } else if (container && this.originalParent) {
            if (this.originalNextSibling && this.originalNextSibling.parentNode === this.originalParent) {
                this.originalParent.insertBefore(container, this.originalNextSibling);
            } else {
                this.originalParent.appendChild(container);
            }
        }

        this.placeholder = null;
        this.originalParent = null;
        this.originalNextSibling = null;

        // Retarget the observer to the docked container
        if (container) {
            this._retargetObserver(container);
        }
    }

    // ---------------------------------------------------------------
    // Internal: initial geometry + drag/resize wiring
    // ---------------------------------------------------------------

    _applyInitialGeometry() {
        if (!this.shell) return;

        const prefs = (this.player.storage?.getFloatingPreferences?.() || {}) as FloatingPrefs;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let width = prefs.width && prefs.width >= MIN_WIDTH ? prefs.width : DEFAULT_WIDTH;
        width = Math.min(width, Math.max(MIN_WIDTH, vw - EDGE_MARGIN * 2));

        // If we know the source container's aspect ratio, match it by default.
        const containerRect = this.player.container?.getBoundingClientRect();
        const aspect = containerRect && containerRect.height > 0
            ? containerRect.width / containerRect.height
            : 16 / 9;
        const defaultHeight = Math.round(width / aspect);
        let height = prefs.height && prefs.height >= 100 ? prefs.height : defaultHeight;
        height = Math.min(height, Math.max(100, vh - EDGE_MARGIN * 2));

        let left: number;
        let top: number;

        if (typeof prefs.left === 'number' && typeof prefs.top === 'number') {
            left = Math.max(EDGE_MARGIN, Math.min(prefs.left, vw - width - EDGE_MARGIN));
            top = Math.max(EDGE_MARGIN, Math.min(prefs.top, vh - height - EDGE_MARGIN));
        } else {
            const pos = this.player.options.floatingPosition || 'bottom-right';
            switch (pos) {
                case 'bottom-left':
                    left = EDGE_MARGIN;
                    top = vh - height - EDGE_MARGIN;
                    break;
                case 'top-right':
                    left = vw - width - EDGE_MARGIN;
                    top = EDGE_MARGIN;
                    break;
                case 'top-left':
                    left = EDGE_MARGIN;
                    top = EDGE_MARGIN;
                    break;
                case 'bottom-right':
                default:
                    left = vw - width - EDGE_MARGIN;
                    top = vh - height - EDGE_MARGIN;
                    break;
            }
        }

        this.shell.style.width = `${width}px`;
        this.shell.style.height = `${height}px`;
        this.shell.style.left = `${left}px`;
        this.shell.style.top = `${top}px`;

        this._initDraggable();
    }

    _initDraggable() {
        if (!this.shell) return;
        if (this.draggable) return;

        this.draggable = new DraggableResizable(this.shell, {
            dragHandle: this.dragHandle,
            resizeHandles: this.resizeHandles,
            constrainToViewport: true,
            maintainAspectRatio: true,
            minWidth: MIN_WIDTH,
            minHeight: 100,
            maxWidth: () => Math.max(MIN_WIDTH, window.innerWidth - EDGE_MARGIN * 2),
            maxHeight: () => Math.max(100, window.innerHeight - EDGE_MARGIN * 2),
            classPrefix: `${this.classPrefix}-floating`,
            keyboardDragKey: 'd',
            keyboardResizeKey: 'r',
            keyboardStep: 10,
            keyboardStepLarge: 50,
            pointerResizeIndicatorText: i18n.t('player.floatingPlayerDialog'),
            onDragEnd: () => this._savePrefs(),
            onResizeEnd: () => this._savePrefs(),
            onDragStart: (event: Event) => {
                const target = event.target as HTMLElement;
                if (!target) return true;
                // Don't start drag when interacting with the close button or
                // with any control inside the embedded player (play/pause,
                // captions menu, etc.).
                if (target.closest(`.${this.classPrefix}-floating-close`)) return false;
                if (target.closest(`.${this.classPrefix}-controls`)) return false;
                if (target.closest(`.${this.classPrefix}-floating-resize-handle`)) return false;
                return true;
            }
        });
    }

    _savePrefs() {
        if (!this.shell || !this.player.storage?.saveFloatingPreferences) return;
        const rect = this.shell.getBoundingClientRect();
        this.player.storage.saveFloatingPreferences({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            left: Math.round(rect.left),
            top: Math.round(rect.top)
        });
    }

    _activeElement(): HTMLElement | null {
        const active = document.activeElement;
        return active && active instanceof HTMLElement ? active : null;
    }
}
