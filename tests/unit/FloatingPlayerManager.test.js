/**
 * Unit Tests: FloatingPlayerManager
 *
 * Covers the floating (custom in-page Picture-in-Picture) state machine:
 *   - pinned vs auto entry paths
 *   - scroll-anchored IntersectionObserver retargeting
 *   - close-button dismiss + one-shot play listener that clears the flag
 *   - single-at-a-time claim broadcast
 *   - destroy cleanup
 *
 * The DOM utilities, icons, i18n and DraggableResizable are mocked so tests
 * run in a jsdom environment without pulling in the full player bundle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/utils/DOMUtils.js', () => ({
    DOMUtils: {
        createElement: vi.fn((tag, options = {}) => {
            const el = document.createElement(tag);
            if (options.className) el.className = options.className;
            if (options.textContent) el.textContent = options.textContent;
            if (options.attributes) {
                Object.entries(options.attributes).forEach(([key, value]) => {
                    if (value !== undefined) el.setAttribute(key, value);
                });
            }
            if (options.style) Object.assign(el.style, options.style);
            return el;
        })
    }
}));

vi.mock('../../src/icons/Icons.js', () => ({
    createIconElement: vi.fn(() => {
        const el = document.createElement('span');
        el.className = 'vidply-icon';
        return el;
    })
}));

vi.mock('../../src/i18n/i18n.js', () => ({
    i18n: {
        t: vi.fn((key) => key)
    }
}));

vi.mock('../../src/utils/DraggableResizable.js', () => ({
    DraggableResizable: class MockDraggableResizable {
        constructor(element, options) {
            this.element = element;
            this.options = options;
            this.destroy = vi.fn();
        }
    }
}));

// IntersectionObserver shim driven manually from tests. Each instance keeps
// a reference to its callback so tests can synthetically deliver entries.
class FakeIntersectionObserver {
    constructor(cb) {
        this.cb = cb;
        this.targets = new Set();
        FakeIntersectionObserver.instances.push(this);
    }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
    // Test helper
    fire(ratio, target) {
        const finalTarget = target || Array.from(this.targets)[0];
        if (!finalTarget) return;
        this.cb([{ target: finalTarget, intersectionRatio: ratio, isIntersecting: ratio > 0 }]);
    }
}
FakeIntersectionObserver.instances = [];

describe('FloatingPlayerManager', () => {
    let FloatingPlayerManager;
    let manager;
    let mockPlayer;
    let containerHost;

    beforeEach(async () => {
        document.body.innerHTML = '';
        FakeIntersectionObserver.instances = [];
        globalThis.IntersectionObserver = FakeIntersectionObserver;

        // 1024px viewport so the floatingMinViewportWidth guard passes
        Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 768 });

        containerHost = document.createElement('section');
        document.body.appendChild(containerHost);

        const videoEl = document.createElement('video');

        const container = document.createElement('div');
        container.className = 'vidply-player';
        container.appendChild(videoEl);
        containerHost.appendChild(container);

        // Make getBoundingClientRect deterministic
        container.getBoundingClientRect = () => ({
            width: 640, height: 360, top: 100, left: 50, right: 690, bottom: 460, x: 50, y: 100, toJSON: () => ({})
        });

        const listeners = new Map();
        mockPlayer = {
            instanceId: 1,
            element: videoEl,
            container,
            options: {
                floating: true,
                floatingPosition: 'bottom-right',
                floatingMinViewportWidth: 640,
                classPrefix: 'vidply'
            },
            state: {
                floating: null,
                fullscreen: false,
                paused: false,
                hasStartedPlayback: true
            },
            storage: {
                getFloatingPreferences: vi.fn().mockReturnValue(null),
                saveFloatingPreferences: vi.fn()
            },
            pause: vi.fn(),
            emit: vi.fn((name, payload) => {
                const list = listeners.get(name) || [];
                list.forEach(fn => fn(payload));
            }),
            on: vi.fn((name, fn) => {
                const list = listeners.get(name) || [];
                list.push(fn);
                listeners.set(name, list);
            }),
            off: vi.fn((name, fn) => {
                const list = listeners.get(name) || [];
                listeners.set(name, list.filter(f => f !== fn));
            })
        };

        const module = await import('../../src/core/FloatingPlayerManager.js');
        FloatingPlayerManager = module.FloatingPlayerManager;

        manager = new FloatingPlayerManager(mockPlayer);
    });

    afterEach(() => {
        if (manager && !manager._destroyed) {
            try { manager.destroy(); } catch { /* ignore */ }
        }
        document.body.innerHTML = '';
        vi.clearAllMocks();
        delete globalThis.IntersectionObserver;
    });

    describe('construction', () => {
        it('starts observing the player container for intersection changes', () => {
            expect(FakeIntersectionObserver.instances.length).toBe(1);
            expect(FakeIntersectionObserver.instances[0].targets.has(mockPlayer.container)).toBe(true);
        });

        it('starts in docked state (state.floating is null)', () => {
            expect(mockPlayer.state.floating).toBe(null);
        });
    });

    describe('enter() / exit()', () => {
        it('pinned entry moves the container into a shell appended to body and leaves a placeholder in place', () => {
            manager.togglePinned();

            expect(mockPlayer.state.floating).toBe('pinned');
            expect(manager.shell).not.toBeNull();
            expect(manager.shell.parentNode).toBe(document.body);
            expect(mockPlayer.container.parentNode).toBe(manager.shell);

            // A placeholder now sits where the container used to be
            const placeholder = containerHost.querySelector('.vidply-floating-placeholder');
            expect(placeholder).not.toBeNull();
            expect(placeholder.style.width).toBe('640px');
            expect(placeholder.style.height).toBe('360px');
        });

        it('emits floatingchange with the active reason on enter', () => {
            manager.togglePinned();
            expect(mockPlayer.emit).toHaveBeenCalledWith('floatingchange', 'pinned');
        });

        it('exit puts the container back into its original parent and removes the placeholder', () => {
            manager.togglePinned();
            const placeholder = containerHost.querySelector('.vidply-floating-placeholder');
            expect(placeholder).not.toBeNull();

            manager.exit('manual');

            expect(mockPlayer.state.floating).toBe(null);
            expect(mockPlayer.container.parentNode).toBe(containerHost);
            expect(containerHost.querySelector('.vidply-floating-placeholder')).toBeNull();
            expect(manager.shell).toBeNull();
        });

        it('togglePinned a second time exits the floating state', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe(null);
        });

        it('manual unpin suppresses auto-float until the next play event', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            // Unpin via the button
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe(null);
            expect(manager._autoDismissedThisPlay).toBe(true);

            // Scrolling the still off-screen slot must not auto-refloat
            const observer = FakeIntersectionObserver.instances[0];
            observer.fire(0.05, mockPlayer.container);
            expect(mockPlayer.state.floating).toBe(null);

            // Next play clears the suppression
            mockPlayer.emit('play');
            expect(manager._autoDismissedThisPlay).toBe(false);

            observer.fire(0.05, mockPlayer.container);
            expect(mockPlayer.state.floating).toBe('auto');
        });

        it('refuses to float below the minimum viewport width', () => {
            window.innerWidth = 500;
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe(null);
        });

        it('refuses to float while fullscreen', () => {
            mockPlayer.state.fullscreen = true;
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe(null);
        });

        it('refuses to float on audio elements', async () => {
            mockPlayer.element = document.createElement('audio');
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe(null);
        });

        it('refuses to float when a playlistManager is attached', () => {
            mockPlayer.playlistManager = { current: 0 };
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe(null);
        });
    });

    describe('scroll-triggered auto-float', () => {
        it('enters auto-float when the container scrolls out while playing', () => {
            const observer = FakeIntersectionObserver.instances[0];
            observer.fire(0.05, mockPlayer.container);

            expect(mockPlayer.state.floating).toBe('auto');
        });

        it('redocks when the placeholder scrolls back into view', () => {
            const observer = FakeIntersectionObserver.instances[0];
            observer.fire(0.05, mockPlayer.container);
            expect(mockPlayer.state.floating).toBe('auto');

            // After entering, the observer now tracks the placeholder
            const placeholder = containerHost.querySelector('.vidply-floating-placeholder');
            expect(observer.targets.has(placeholder)).toBe(true);

            observer.fire(0.9, placeholder);
            expect(mockPlayer.state.floating).toBe(null);
            expect(mockPlayer.container.parentNode).toBe(containerHost);
        });

        it('does not auto-float while paused', () => {
            mockPlayer.state.paused = true;
            const observer = FakeIntersectionObserver.instances[0];
            observer.fire(0.05, mockPlayer.container);
            expect(mockPlayer.state.floating).toBe(null);
        });

        it('pinned state survives a scroll-back-in-view event', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            const observer = FakeIntersectionObserver.instances[0];
            const placeholder = containerHost.querySelector('.vidply-floating-placeholder');
            observer.fire(0.95, placeholder);

            expect(mockPlayer.state.floating).toBe('pinned');
        });
    });

    describe('dismiss()', () => {
        it('pauses playback, closes the shell and sets the dismissed flag', () => {
            manager.togglePinned();
            manager.dismiss();

            expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
            expect(mockPlayer.state.floating).toBe(null);
            expect(manager._autoDismissedThisPlay).toBe(true);
        });

        it('blocks subsequent auto-float until the next play event clears the dismiss', () => {
            manager.togglePinned();
            manager.dismiss();

            const observer = FakeIntersectionObserver.instances[0];
            observer.fire(0.05, mockPlayer.container);
            expect(mockPlayer.state.floating).toBe(null);

            // Simulate the user pressing play again
            mockPlayer.emit('play');
            expect(manager._autoDismissedThisPlay).toBe(false);

            observer.fire(0.05, mockPlayer.container);
            expect(mockPlayer.state.floating).toBe('auto');
        });
    });

    describe('single-at-a-time claim', () => {
        it('exits when another floating player broadcasts a claim', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            window.dispatchEvent(new CustomEvent('vidply:floating-claim', {
                detail: { claimId: 'other-player' }
            }));

            expect(mockPlayer.state.floating).toBe(null);
        });

        it('ignores its own claim broadcast', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            window.dispatchEvent(new CustomEvent('vidply:floating-claim', {
                detail: { claimId: manager._claimId }
            }));

            expect(mockPlayer.state.floating).toBe('pinned');
        });
    });

    describe('fullscreen guard', () => {
        it('exits floating when the player enters fullscreen', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            // Flip the state the real Player sets before emitting enterfullscreen
            mockPlayer.state.fullscreen = true;
            mockPlayer.emit('enterfullscreen');

            expect(mockPlayer.state.floating).toBe(null);
        });
    });

    describe('destroy()', () => {
        it('restores the container and disconnects the observer', () => {
            manager.togglePinned();
            expect(mockPlayer.state.floating).toBe('pinned');

            manager.destroy();

            expect(mockPlayer.state.floating).toBe(null);
            expect(mockPlayer.container.parentNode).toBe(containerHost);
            expect(manager.intersectionObserver).toBeNull();
        });
    });
});
