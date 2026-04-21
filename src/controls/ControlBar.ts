/**
 * Control Bar Component
 */

import {DOMUtils} from '../utils/DOMUtils.js';
import {TimeUtils} from '../utils/TimeUtils.js';
import {createIconElement} from '../icons/Icons.js';
import {i18n} from '../i18n/i18n.js';
import {focusElement, focusFirstElement} from '../utils/FocusUtils.js';
import {isMobile} from '../utils/PerformanceUtils.js';
import {captureVideoFrame} from '../utils/VideoFrameCapture.js';
import {
    buildDownloadLabel,
    fetchContentLength,
    inferFormatFromMime,
    inferFormatFromUrl
} from '../utils/DownloadInfo.js';
import type { Player } from '../core/Player.js';

export class ControlBar {
    player: Player;
    _overflowMenuItemRef: any;
    controls: any;
    currentPreviewTime: any;
    element: any;
    hideTimeout: any;
    isDraggingProgress: boolean;
    isDraggingVolume: boolean;
    openMenu: any;
    openMenuButton: any;
    overflowResizeObserver: any;
    previewSupported: any;
    previewThumbnailCache: any;
    previewThumbnailTimeout: any;
    previewUsingMainVideo: any;
    previewVideo: any;
    previewVideoInitialized: any;
    previewVideoReady: any;
    rightButtons: any;
    overflowMenuButton: any;
    setupOverflowMenu: any;

    constructor(player: Player) {
        this.player = player;
        this.element = null;
        this.controls = {};
        this.hideTimeout = null;
        this.isDraggingProgress = false;
        this.isDraggingVolume = false;
        this.openMenu = null; // Track currently open menu
        this.openMenuButton = null; // Track button that opened the menu

        this.init();
    }

    init() {
        this.createElement();
        this.createControls();
        // Ensure time UI reflects any prefilled state (e.g. initialDuration)
        // even when media metadata is deferred and 'loadedmetadata' won't fire yet.
        this.updateDuration();
        this.updateProgress();
        this.attachEvents();
        this.setupAutoHide();
        this.setupOverflowDetection();
    }

    // Helper method to detect touch devices
    isTouchDevice() {
        return (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            ((navigator.msMaxTouchPoints ?? 0) > 0)
        );
    }

    // Smart menu positioning to avoid overflow
    positionMenu(menu: HTMLElement, button: HTMLElement, immediate = false) {
        const mobile = isMobile();
        const isOverflowMenu = menu.classList.contains(`${this.player.options.classPrefix}-overflow-menu-list`);
        const isFullscreen = this.player.state.fullscreen;
        
        // In fullscreen, menu is appended to player container, so use fixed positioning
        if (isFullscreen && menu.parentElement === this.player.container) {
            const doFullscreenPositioning = () => {
                const buttonRect = button.getBoundingClientRect();
                const menuRect = menu.getBoundingClientRect();
                const containerRect = this.player.container.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                // Position relative to player container
                const buttonCenterX = buttonRect.left + buttonRect.width / 2 - containerRect.left;
                const buttonTop = buttonRect.top - containerRect.top;
                const buttonBottom = buttonRect.bottom - containerRect.top;
                
                const spaceAbove = buttonRect.top - containerRect.top;
                const spaceBelow = containerRect.bottom - buttonRect.bottom;
                
                // Position menu above button by default
                if (spaceAbove >= menuRect.height + 20 || spaceAbove > spaceBelow) {
                    menu.style.bottom = `${containerRect.height - buttonTop + 8}px`;
                    menu.style.top = 'auto';
                    menu.classList.remove('vidply-menu-below');
                } else {
                    // Position below if more space there
                    menu.style.top = `${buttonBottom + 8}px`;
                    menu.style.bottom = 'auto';
                    menu.classList.add('vidply-menu-below');
                }
                
                // Horizontal positioning
                if (isOverflowMenu) {
                    // Overflow menu aligns to right
                    const buttonRight = buttonRect.right - containerRect.left;
                    menu.style.right = `${containerRect.width - buttonRight}px`;
                    menu.style.left = 'auto';
                    menu.style.transform = 'none';
                } else {
                    // Other menus center on button
                    menu.style.left = `${buttonCenterX}px`;
                    menu.style.right = 'auto';
                    menu.style.transform = 'translateX(-50%)';
                }
            };
            
            if (immediate) {
                doFullscreenPositioning();
            } else {
                requestAnimationFrame(doFullscreenPositioning);
            }
            return;
        }
        
        if (mobile) {
            // On mobile, ensure menus stay within viewport
            const isVolumeMenu = menu.classList.contains(`${this.player.options.classPrefix}-volume-menu`);
            
            const doMobilePositioning = () => {
                // Get the button's parent container (controls-left or controls-right)
                const parentContainer = button.parentElement;
                if (!parentContainer) return;
                
                const buttonRect = button.getBoundingClientRect();
                const parentRect = parentContainer.getBoundingClientRect();
                const menuRect = menu.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                
                // Volume menu should be centered on its button
                if (isVolumeMenu) {
                    // Calculate button position relative to parent
                    const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
                    
                    // Center menu on button
                    menu.style.left = `${buttonCenterX}px`;
                    menu.style.right = 'auto';
                    menu.style.transform = 'translateX(-50%)';
                    return;
                }
                
                // Check if menu overflows viewport
                if (menuRect.right > viewportWidth) {
                    menu.style.left = 'auto';
                    menu.style.right = '10px';
                    menu.style.transform = 'none';
                }
                
                if (menuRect.left < 0) {
                    menu.style.left = '10px';
                    menu.style.right = 'auto';
                    menu.style.transform = 'none';
                }
                
                // Ensure menu doesn't go off top or bottom
                if (menuRect.top < 10) {
                    menu.style.top = '10px';
                    // Important: clear bottom constraint, otherwise top+bottom will squeeze the menu height
                    // into a tiny strip on some mobile layouts.
                    menu.style.bottom = 'auto';
                }
                
                if (menuRect.bottom > viewportHeight - 10) {
                    menu.style.bottom = '10px';
                    menu.style.top = 'auto';
                }
            };
            
            if (immediate) {
                doMobilePositioning();
            } else {
                requestAnimationFrame(doMobilePositioning);
            }
            return;
        }

        // Desktop: Smart positioning
        // Menu is now a sibling of the button, within controls-left or controls-right container
        // These containers have position: relative, so menus position relative to them
        
        const doPositioning = () => {
            const buttonRect = button.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Get the button's parent container (controls-left or controls-right)
            const parentContainer = button.parentElement;
            if (!parentContainer) return;
            
            const parentRect = parentContainer.getBoundingClientRect();
            
            // Calculate position relative to parent container
            const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
            const buttonBottom = buttonRect.bottom - parentRect.top;
            const buttonTop = buttonRect.top - parentRect.top;
            
            const spaceAbove = buttonRect.top;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            
            // Position menu above button by default
            let menuTop: number | null = buttonTop - menuRect.height - 8;
            let menuBottom: number | null = null;
            
            // Prefer above, but switch to below if not enough space
            if (spaceAbove < menuRect.height + 20 && spaceBelow > spaceAbove) {
                menuTop = null;
                // Calculate bottom position relative to parent container
                // bottom: X means X pixels from the bottom of the positioned parent
                // We want the menu to be 8px below the button
                const parentHeight = parentRect.bottom - parentRect.top;
                menuBottom = parentHeight - buttonBottom + 8;
                menu.classList.add('vidply-menu-below');
            } else {
                menu.classList.remove('vidply-menu-below');
            }
            
            let menuLeft: number | string = 'auto';
            let menuRight: number | string = 'auto';
            let transformX = 'translateX(0)';
            
            // For overflow menu, always align to the right edge
            if (isOverflowMenu) {
                menuLeft = 'auto';
                menuRight = 0;
                transformX = 'translateX(0)';
            } else {
                // For other menus, center on button by default
                menuLeft = buttonCenterX - menuRect.width / 2;
                
                // Check horizontal overflow
                const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
                if (menuLeftAbsolute < 10) {
                    // Too far left, align to left edge of parent
                    menuLeft = 0;
                    transformX = 'translateX(0)';
                } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
                    // Too far right, align to right edge of parent
                    menuLeft = 'auto';
                    menuRight = 0;
                    transformX = 'translateX(0)';
                } else {
                    // Center on button
                    menuLeft = buttonCenterX;
                    transformX = 'translateX(-50%)';
                }
            }
            
            // Apply calculated positions
            if (menuTop !== null) {
                menu.style.top = `${menuTop}px`;
                menu.style.bottom = 'auto';
            } else if (menuBottom !== null) {
                menu.style.top = 'auto';
                menu.style.bottom = `${menuBottom}px`;
            }
            
            if (menuLeft !== 'auto') {
                menu.style.left = `${menuLeft}px`;
                menu.style.right = 'auto';
            } else {
                menu.style.left = 'auto';
                menu.style.right = `${menuRight}px`;
            }
            
            menu.style.transform = transformX;
        };
        
        if (immediate) {
            // Position immediately (synchronously) - used when menu is first shown
            doPositioning();
        } else {
            // Use requestAnimationFrame to ensure layout is stable before positioning
            requestAnimationFrame(() => {
                setTimeout(doPositioning, 10); // Small delay to ensure layout is stable
            });
        }
    }

    // Helper method to insert menu into DOM (handles fullscreen vs normal mode)
    insertMenuIntoDOM(menu: HTMLElement, button: HTMLElement) {
        // Ensure menu has an ID for aria-controls relationship
        if (!menu.id) {
            menu.id = `vidply-menu-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Set ARIA attributes for screen reader users (WCAG 4.1.2)
        button.setAttribute('aria-controls', menu.id);
        button.setAttribute('aria-haspopup', 'true');
        
        // In fullscreen, append menu to player container to escape video-wrapper stacking context
        // This allows menus to appear above the playlist panel
        // Otherwise, keep it after the button for WCAG compliance
        const isFullscreen = this.player.state.fullscreen;
        if (isFullscreen) {
            // Append to player container as sibling to playlist panel
            this.player.container.appendChild(menu);
            // Store reference to button for positioning
            menu.dataset.triggerButton = button.getAttribute('aria-label') || 'button';
        } else {
            // Insert menu right after the button in the DOM for keyboard navigation
            button.insertAdjacentElement('afterend', menu);
        }
    }

    // Helper method to attach close-on-outside-click behavior to menus
    attachMenuCloseHandler(menu: HTMLElement, button: HTMLElement, preventCloseOnInteraction = false) {
        // Close any previously open menu and clean up its handlers
        if (this.openMenu && this.openMenu !== menu && this.openMenuButton) {
            // Remove previous button's blur handler if it exists
            if (this.openMenuButton._vidplyBlurHandler) {
                this.openMenuButton.removeEventListener('blur', this.openMenuButton._vidplyBlurHandler);
                delete this.openMenuButton._vidplyBlurHandler;
            }
            if (this.openMenuButton._vidplyMousedownHandler) {
                this.openMenuButton.removeEventListener('mousedown', this.openMenuButton._vidplyMousedownHandler);
                delete this.openMenuButton._vidplyMousedownHandler;
            }
            
            // Close previous menu without returning focus
            if (this.openMenu && document.contains(this.openMenu)) {
                this.openMenu.remove();
            } else if (this.openMenu && this.openMenu.parentNode) {
                this.openMenu.parentNode.removeChild(this.openMenu);
            }
            if (this.openMenuButton) {
                this.openMenuButton.setAttribute('aria-expanded', 'false');
            }
        }
        
        // Track this menu as open
        this.openMenu = menu;
        this.openMenuButton = button;
        
        // Position menu smartly
        this.positionMenu(menu, button);
        
        // Set aria-expanded to true when menu opens
        if (button) {
            button.setAttribute('aria-expanded', 'true');
        }
        
        // Add focus handler to button to close menu when focus leaves to another control bar button
        // But only if it's a keyboard navigation (Tab), not a click
        let isClickingButton = false;
        let blurHandlerActive = true;
        
        const handleButtonMousedown = () => {
            isClickingButton = true;
            // Temporarily disable blur handler when clicking
            blurHandlerActive = false;
            setTimeout(() => {
                isClickingButton = false;
                blurHandlerActive = true;
            }, 200);
        };
        button.addEventListener('mousedown', handleButtonMousedown);
        (button as any)._vidplyMousedownHandler = handleButtonMousedown; // Store for cleanup
        
        const handleButtonBlur = (e: FocusEvent) => {
            // If blur handler is disabled (during click) or this is a click, don't close the menu
            if (!blurHandlerActive || isClickingButton) {
                return;
            }
            
            // Check if this menu is still the open menu (might have been replaced)
            if (this.openMenu !== menu) {
                return;
            }
            
            // Store the related target (where focus is going) before async operations
            const relatedTarget = e.relatedTarget;
            
            // Use requestAnimationFrame to check where focus went after browser handles focus
            requestAnimationFrame(() => {
                setTimeout(() => {
                    // Check again if blur handler is still active and menu is still open
                    if (!blurHandlerActive || this.openMenu !== menu) {
                        return;
                    }
                    
                    const activeElement = document.activeElement;
                    
                    // Don't close if focus is still within the menu
                    if (menu.contains(activeElement)) {
                        return;
                    }
                    
                    // Don't close if focus moved to sign language or transcript windows
                    const signLanguageWrapper = (this.player as any).signLanguageWrapper;
                    const transcriptWindow = this.player.transcriptManager?.transcriptWindow;
                    if ((signLanguageWrapper && signLanguageWrapper.contains(activeElement)) ||
                        (transcriptWindow && transcriptWindow.contains(activeElement))) {
                        return;
                    }
                    
                    // If focus moved to another button in the control bar, close the menu
                    const controlBarButtons = this.element.querySelectorAll('button');
                    const isFocusOnAnotherButton = Array.from(controlBarButtons).includes(activeElement) && activeElement !== button;
                    
                    // Also check relatedTarget in case activeElement hasn't updated yet
                    const isRelatedTargetAnotherButton = relatedTarget && Array.from(controlBarButtons).includes(relatedTarget) && relatedTarget !== button;
                    
                    // Close menu if focus moved to another control bar button (without returning focus)
                    if (isFocusOnAnotherButton || isRelatedTargetAnotherButton) {
                        // Double-check this menu is still the open menu
                        if (this.openMenu !== menu) {
                            return;
                        }
                        
                        // Just remove the menu, don't touch focus at all
                        if (menu && document.contains(menu)) {
                            menu.remove();
                        } else if (menu && menu.parentNode) {
                            menu.parentNode.removeChild(menu);
                        }
                        if (button) {
                            button.setAttribute('aria-expanded', 'false');
                        }
                        // Clear tracking
                        if (this.openMenu === menu) {
                            this.openMenu = null;
                            this.openMenuButton = null;
                        }
                        button.removeEventListener('blur', handleButtonBlur);
                        button.removeEventListener('mousedown', handleButtonMousedown);
                        delete (button as any)._vidplyBlurHandler;
                        delete (button as any)._vidplyMousedownHandler;
                    }
                }, 10); // Small delay to ensure focus has fully moved
            });
        };
        button.addEventListener('blur', handleButtonBlur);
        (button as any)._vidplyBlurHandler = handleButtonBlur; // Store for cleanup
        
        const closeMenuAndUpdateAria = () => {
            this.closeMenuAndReturnFocus(menu, button);
        };
        
        // Store document handlers for cleanup
        let documentClickHandler: ((e: MouseEvent) => void) | null = null;
        let documentEscapeHandler: ((e: KeyboardEvent) => void) | null = null;
        
        setTimeout(() => {
            documentClickHandler = (e: MouseEvent) => {
                // If this menu has form controls, don't close when clicking inside
                if (preventCloseOnInteraction && menu.contains(e.target as Node)) {
                    return;
                }

                // Check if click is outside menu and button
                // Also check if this menu is still the open menu
                if (this.openMenu === menu && !menu.contains(e.target as Node) && !button.contains(e.target as Node)) {
                    closeMenuAndUpdateAria();
                    if (documentClickHandler) {
                        document.removeEventListener('click', documentClickHandler);
                    }
                    if (documentEscapeHandler) {
                        document.removeEventListener('keydown', documentEscapeHandler);
                    }
                }
            };

            documentEscapeHandler = (e: KeyboardEvent) => {
                if (e.key === 'Escape' && this.openMenu === menu) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Close menu and return focus to the button that opened it
                    this.closeMenuAndReturnFocus(menu, button, true);
                    if (documentClickHandler) {
                        document.removeEventListener('click', documentClickHandler);
                    }
                    if (documentEscapeHandler) {
                        document.removeEventListener('keydown', documentEscapeHandler);
                    }
                }
            };

            document.addEventListener('click', documentClickHandler);
            document.addEventListener('keydown', documentEscapeHandler);
        }, 100);
    }

    // Helper method to close menu and return focus to button
    closeMenuAndReturnFocus(menu: HTMLElement | null, button: HTMLElement | null, returnFocus = true) {
        if (menu) {
            // Remove menu from DOM - use remove() which works reliably
            if (document.contains(menu)) {
                menu.remove();
            } else if (menu.parentNode) {
                // Fallback if menu is not in document but has parent
                menu.parentNode.removeChild(menu);
            }
        }
        if (button) {
            button.setAttribute('aria-expanded', 'false');
            // Clean up aria-controls since menu is removed (optional, but cleaner)
            // Note: Keeping it doesn't cause issues, but removing it is semantically correct
            // when the referenced element no longer exists
            if (menu && menu.id) {
                button.removeAttribute('aria-controls');
            }
            // Only return focus if explicitly requested (not when tabbing away)
            if (returnFocus) {
                // Use requestAnimationFrame to ensure DOM updates are complete before focusing
                // This prevents focus from jumping to next/previous button
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (button && document.contains(button)) {
                            button.focus({ preventScroll: true });
                        }
                    }, 0);
                });
            }
        }
        // Clear tracking
        if (this.openMenu === menu) {
            this.openMenu = null;
            this.openMenuButton = null;
        }
    }
    
    // Close any open menu when tabbing to another button or clicking another button
    closeOpenMenu() {
        if (this.openMenu && this.openMenuButton) {
            // Close without returning focus (user is tabbing to next element or clicking another button)
            if (this.openMenu && document.contains(this.openMenu)) {
                this.openMenu.remove();
            } else if (this.openMenu && this.openMenu.parentNode) {
                this.openMenu.parentNode.removeChild(this.openMenu);
            }
            if (this.openMenuButton) {
                this.openMenuButton.setAttribute('aria-expanded', 'false');
            }
            // Clear tracking
            this.openMenu = null;
            this.openMenuButton = null;
        }
    }

    // Helper method to add keyboard navigation to menus (arrow keys)
    attachMenuKeyboardNavigation(menu: HTMLElement, button: HTMLElement) {
        const menuItems: HTMLElement[] = Array.from(menu.querySelectorAll(`.${this.player.options.classPrefix}-menu-item`));
        
        if (menuItems.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent volume/seek actions
                    const nextIndex = (currentIndex + 1) % menuItems.length;
                    menuItems[nextIndex].focus({ preventScroll: false });
                    menuItems[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    break;
                
                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent volume/seek actions
                    const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
                    menuItems[prevIndex].focus({ preventScroll: false });
                    menuItems[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    break;
                
                case 'ArrowLeft':
                case 'ArrowRight':
                    // Prevent seeking when in menu (but allow menu to handle if needed)
                    e.preventDefault();
                    e.stopPropagation();
                    break;
                
                case 'Home':
                    e.preventDefault();
                    e.stopPropagation();
                    menuItems[0].focus({ preventScroll: false });
                    menuItems[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    break;
                
                case 'End':
                    e.preventDefault();
                    e.stopPropagation();
                    menuItems[menuItems.length - 1].focus({ preventScroll: false });
                    menuItems[menuItems.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    break;
                
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event from reaching KeyboardManager
                    if (document.activeElement && menuItems.includes(document.activeElement as HTMLElement)) {
                        (document.activeElement as HTMLElement).click();
                        // Menu will be closed by the click handler, but ensure focus returns
                        focusElement(button, { delay: 0 });
                    }
                    break;
                
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event from reaching KeyboardManager
                    // Close menu and return focus to the button that opened it
                    this.closeMenuAndReturnFocus(menu, button, true);
                    break;
            }
        };

        menu.addEventListener('keydown', handleKeyDown);
    }

    createElement() {
        this.element = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-controls`,
            attributes: {
                'role': 'region',
                'aria-label': i18n.t('player.label') + ' controls'
            }
        });
    }

    createControls() {
        // Progress bar and time display wrapper
        const progressTimeWrapper = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-time-wrapper`
        });

        // Progress bar container
        if (this.player.options.progressBar) {
            this.createProgressBar();
            progressTimeWrapper.appendChild(this.controls.progress);
        }

        // Time display (right beside progress bar)
        if (this.player.options.currentTime || this.player.options.duration) {
            progressTimeWrapper.appendChild(this.createTimeDisplay());
        }

        this.element.appendChild(progressTimeWrapper);

        // Button container
        const buttonContainer = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-controls-buttons`
        });

        // Left buttons
        const leftButtons = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-controls-left`
        });

        // Previous track button (if playlist)
        if (this.player.playlistManager) {
            leftButtons.appendChild(this.createPreviousButton());
        }

        // Play/Pause button
        if (this.player.options.playPauseButton) {
            leftButtons.appendChild(this.createPlayPauseButton());
        }

        // Restart button (right beside play button)
        leftButtons.appendChild(this.createRestartButton());

        // Next track button (if playlist)
        if (this.player.playlistManager) {
            leftButtons.appendChild(this.createNextButton());
        }

        // Rewind button (not shown in playlist mode)
        if (!this.player.playlistManager) {
            leftButtons.appendChild(this.createRewindButton());
        }

        // Forward button (not shown in playlist mode)
        if (!this.player.playlistManager) {
            leftButtons.appendChild(this.createForwardButton());
        }

        // Volume control
        if (this.player.options.volumeControl) {
            // On touch devices: simple mute button (hardware buttons control volume)
            // On desktop: full volume control with slider
            if (this.isTouchDevice()) {
                leftButtons.appendChild(this.createMuteButton());
            } else {
                leftButtons.appendChild(this.createVolumeControl());
            }
        }

        // Right buttons
        this.rightButtons = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-controls-right`
        });

        // Check for available features
        const hasChapters = this.hasChapterTracks();
        const hasCaptions = this.hasCaptionTracks();
        const hasQualityLevels = this.hasQualityLevels();
        const hasAudioDescription = this.hasAudioDescription();

        // Priority order (lower number = higher priority, stays visible longer)
        // Desktop (>768px):
        //   Priority 1: Play, Volume, Captions, Speed, Fullscreen
        //   Priority 2: Audio Description, Quality  
        //   Priority 3: Chapters, Caption Style, Transcript, Sign Language, PiP
        // Smaller screens (<768px):
        //   Priority 1: Play, Volume, Progress (only left controls visible)
        //   Priority 3: ALL right-side buttons go to overflow menu

        // 1. Chapters button
        if (this.player.options.chaptersButton && hasChapters) {
            const btn = this.createChaptersButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 2. Captions button
        if (this.player.options.captionsButton && hasCaptions) {
            const btn = this.createCaptionsButton();
            btn.dataset.overflowPriority = '1';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 3. Caption styling button
        if (this.player.options.captionStyleButton && hasCaptions) {
            const btn = this.createCaptionStyleButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 4. Playback speed button
        // IMPORTANT: Don't rely on renderer.constructor.name here.
        // In production builds, class names are minified (e.g. "class s"), which would break the check.
        // Instead, detect HLS by the current source URL.
        const src = (this.player as any).currentSource
            || this.player.element?.getAttribute?.('src')
            || this.player.element?.currentSrc
            || this.player.element?.src
            || this.player.element?.querySelector?.('source')?.getAttribute?.('src')
            || this.player.element?.querySelector?.('source')?.src
            || '';
        const isHlsSource = typeof src === 'string' && src.includes('.m3u8');
        const isDashSource = typeof src === 'string' && src.includes('.mpd');
        const isVideoElement = this.player.element?.tagName?.toLowerCase() === 'video';
        const hideSpeedForThisPlayer =
            (!!this.player.options.hideSpeedForHls && isHlsSource)
            || (!!this.player.options.hideSpeedForHlsVideo && isHlsSource && isVideoElement)
            || (!!this.player.options.hideSpeedForDash && isDashSource)
            || (!!this.player.options.hideSpeedForDashVideo && isDashSource && isVideoElement);
        if (this.player.options.speedButton && !hideSpeedForThisPlayer) {
            const btn = this.createSpeedButton();
            btn.dataset.overflowPriority = '1';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 5. Audio Description button
        if (this.player.options.audioDescriptionButton && hasAudioDescription) {
            const btn = this.createAudioDescriptionButton();
            btn.dataset.overflowPriority = '2';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 6. Transcript button
        if (this.player.options.transcriptButton && hasCaptions) {
            const btn = this.createTranscriptButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 6.5 Playlist toggle button (for playlists)
        if (this.player.playlistManager && this.player.options.playlistToggleButton !== false) {
            const btn = this.createPlaylistToggleButton();
            btn.dataset.overflowPriority = '2';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // 7. Sign Language buttons (PiP overlay and/or main view src swap)
        const hasSignLanguage = this.hasSignLanguage();
        const showSignLanguageButtons = this.player.options.signLanguageButton !== false && hasSignLanguage;
        const signLanguageDisplayMode = this.player.options.signLanguageDisplayMode || 'both';
        if (showSignLanguageButtons) {
            // PiP overlay button (show if mode is 'pip' or 'both')
            if (['pip', 'both'].includes(signLanguageDisplayMode)) {
                const pipBtn = this.createSignLanguageButton();
                pipBtn.dataset.overflowPriority = '3';
                pipBtn.dataset.overflowPriorityMobile = '3';
                this.rightButtons.appendChild(pipBtn);
            }
            
            // Main view button (show if mode is 'main' or 'both')
            if (['main', 'both'].includes(signLanguageDisplayMode)) {
                const mainViewBtn = this.createSignLanguageInMainViewButton();
                mainViewBtn.dataset.overflowPriority = '3';
                mainViewBtn.dataset.overflowPriorityMobile = '3';
                this.rightButtons.appendChild(mainViewBtn);
            }
        }

        // Quality button (before fullscreen)
        if (this.player.options.qualityButton && hasQualityLevels) {
            const btn = this.createQualityButton();
            btn.dataset.overflowPriority = '2';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Download button
        if (this.player.options.downloadButton) {
            const downloadUrl = this.player.options.downloadUrl
                || this.player.element?.dataset?.vidplyDownloadUrl;
            if (downloadUrl) {
                const btn = this.createDownloadButton(downloadUrl);
                btn.dataset.overflowPriority = '2';
                btn.dataset.overflowPriorityMobile = '3';
                this.rightButtons.appendChild(btn);
            }
        }

        // PiP button (before fullscreen)
        // When options.floating is enabled, the same button drives our custom
        // in-page floating player; the native PiP capability check is skipped
        // because requestPictureInPicture is not used in that mode.
        const pipEnabled = this.player.options.pipButton &&
            (this.player.options.floating || 'pictureInPictureEnabled' in document);
        const isAudio = this.player.element.tagName.toLowerCase() === 'audio';
        if (pipEnabled && !(this.player.options.floating && isAudio)) {
            const btn = this.createPipButton();
            if (this.player.options.floating) {
                // The floating feature has a hard viewport minimum (default
                // 768px). Below that, the feature is disabled by the
                // FloatingPlayerManager, so the button must neither sit in
                // the main control bar (hidden via CSS media query) nor be
                // shuffled into the overflow menu. Mark it so the overflow
                // detector leaves it alone, regardless of the screen size.
                btn.dataset.skipOverflow = 'true';
                btn.dataset.overflowPriority = '1';
                btn.dataset.overflowPriorityMobile = '1';
            } else {
                btn.dataset.overflowPriority = '3';
                btn.dataset.overflowPriorityMobile = '3';
            }
            this.rightButtons.appendChild(btn);
        }

        // Create overflow menu button (initially hidden). Added before the
        // fullscreen button so that, on mobile viewports where the overflow
        // menu is visible, fullscreen sits immediately to its right as the
        // last control in the bar.
        this.overflowMenuButton = this.createOverflowMenuButton();
        this.overflowMenuButton.style.display = 'none';
        this.rightButtons.appendChild(this.overflowMenuButton);

        // 8. Fullscreen button (very last)
        // Don't show fullscreen button for audio players. Fullscreen is a
        // core action users reach for often, so it stays in the main bar
        // on every viewport (priority 1 on desktop AND mobile) rather than
        // being shuffled into the overflow menu.
        const isAudioPlayer = this.player.element.tagName.toLowerCase() === 'audio';
        if (this.player.options.fullscreenButton && !isAudioPlayer) {
            const btn = this.createFullscreenButton();
            btn.dataset.overflowPriority = '1';
            btn.dataset.overflowPriorityMobile = '1';
            this.rightButtons.appendChild(btn);
        }

        buttonContainer.appendChild(leftButtons);
        buttonContainer.appendChild(this.rightButtons);
        this.element.appendChild(buttonContainer);
        
        // Ensure all buttons have title attributes
        this.ensureButtonTooltips(buttonContainer);
    }
    
    /**
     * Ensure all buttons in the controls have title attributes
     * Uses aria-label as title if title is not present
     */
    ensureButtonTooltips(container: HTMLElement) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach((button: HTMLButtonElement) => {
            // Skip if tooltip already exists
            if (button.querySelector(`.${this.player.options.classPrefix}-tooltip`)) {
                return;
            }
            
            // Skip if button text already exists
            if (button.querySelector(`.${this.player.options.classPrefix}-button-text`)) {
                return;
            }
            
            // Skip menu items - they already have visible text
            if (button.getAttribute('role') === 'menuitem' || 
                button.classList.contains(`${this.player.options.classPrefix}-settings-item`) ||
                button.classList.contains(`${this.player.options.classPrefix}-menu-item`) ||
                button.classList.contains(`${this.player.options.classPrefix}-transcript-settings-item`) ||
                button.classList.contains(`${this.player.options.classPrefix}-sign-language-settings-item`) ||
                button.classList.contains(`${this.player.options.classPrefix}-popup-settings-item`)) {
                return;
            }
            
            const ariaLabel = button.getAttribute('aria-label');
            if (ariaLabel) {
                // Add tooltip (aria-hidden popover)
                DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);
            }
        });
    }

    // Helper methods to check for available features
    hasChapterTracks() {
        // 1) Prefer already-loaded TextTracks (fast + accurate)
        const textTracks = this.player.element.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
            if (textTracks[i].kind === 'chapters') return true;
            }

        // 2) Fallback to DOM <track> elements (works before tracks are fully loaded)
        const trackEls = Array.from(this.player.element.querySelectorAll('track[kind="chapters"]'));
        if (trackEls.length > 0) return true;

        // 3) Playlist metadata fallback (works even when we intentionally defer loading)
        const current = this.player.playlistManager?.getCurrentTrack?.();
        if (current?.tracks && Array.isArray(current.tracks)) {
            return current.tracks.some((t: any) => t?.kind === 'chapters');
        }

        return false;
    }

    hasCaptionTracks() {
        // 1) Prefer already-loaded TextTracks (skip stale tracks from previous dash.js)
        const textTracks = this.player.element.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
            if ((textTracks[i].kind === 'captions' || textTracks[i].kind === 'subtitles') && !textTracks[i]._vidplyStale) {
                return true;
            }
        }

        // 2) Fallback to DOM <track> elements
        const trackEls: HTMLElement[] = Array.from(this.player.element.querySelectorAll('track'));
        if (trackEls.some(el => el.getAttribute('kind') === 'captions' || el.getAttribute('kind') === 'subtitles')) {
            return true;
        }

        // 3) Playlist metadata fallback
        const current = this.player.playlistManager?.getCurrentTrack?.();
        if (current?.tracks?.some((t: any) => t?.kind === 'captions' || t?.kind === 'subtitles')) {
            return true;
        }

        return false;
    }

    hasQualityLevels() {
        // Check if renderer supports quality selection
        if (this.player.renderer && this.player.renderer.getQualities) {
            const qualities = this.player.renderer.getQualities();
            return qualities && qualities.length > 1;
        }
        return false;
    }

    hasAudioDescription() {
        // Check for audio-described video source OR description tracks
        if ((this.player as any).audioDescriptionSrc && (this.player as any).audioDescriptionSrc.length > 0) {
            return true;
        }
        
        // Check for description tracks
        const textTracks: TextTrack[] = Array.from(this.player.element.textTracks || []);
        return textTracks.some(track => track.kind === 'descriptions');
    }

    hasSignLanguage() {
        // Check for single source or multiple sources
        const hasSingleSource = (this.player as any).signLanguageSrc && (this.player as any).signLanguageSrc.length > 0;
        const hasMultipleSources = (this.player as any).signLanguageSources && Object.keys((this.player as any).signLanguageSources).length > 0;
        return hasSingleSource || hasMultipleSources;
    }

    createProgressBar() {
        const progressContainer = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-container`,
            attributes: {
                'role': 'slider',
                'aria-label': i18n.t('player.progress'),
                'aria-valuemin': '0',
                'aria-valuemax': '100',
                'aria-valuenow': '0',
                'tabindex': '0'
            }
        });

        // Buffered progress
        this.controls.buffered = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-buffered`
        });

        // Played progress
        this.controls.played = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-played`
        });

        // Progress handle
        this.controls.progressHandle = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-handle`
        });

        // Tooltip
        this.controls.progressTooltip = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-tooltip`
        });

        // Preview thumbnail (for video only)
        this.controls.progressPreview = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-preview`,
            attributes: {
                'aria-hidden': 'true'
            }
        });
        this.controls.progressTooltip.appendChild(this.controls.progressPreview);

        // Time text
        this.controls.progressTooltipTime = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-progress-tooltip-time`
        });
        this.controls.progressTooltip.appendChild(this.controls.progressTooltipTime);

        progressContainer.appendChild(this.controls.buffered);
        progressContainer.appendChild(this.controls.played);
        this.controls.played.appendChild(this.controls.progressHandle);
        progressContainer.appendChild(this.controls.progressTooltip);

        this.controls.progress = progressContainer;

        // Initialize preview functionality
        this.initPreviewThumbnail();

        // Progress bar events
        this.setupProgressBarEvents();
    }

    /**
     * Initialize preview thumbnail functionality for HTML5 video
     */
    initPreviewThumbnail() {
        this.previewThumbnailCache = new Map();
        this.previewVideo = null;
        this.currentPreviewTime = null;
        this.previewThumbnailTimeout = null;
        this.previewSupported = false;
        this.previewVideoReady = false;
        this.previewVideoInitialized = false;
        this.previewUsingMainVideo = false; // Flag for HLS mode (uses main video instead of separate element)

        // Check if preview is supported (HTML5 video or HLS stream)
        // Check if element is a video
        const isVideo = this.player.element && this.player.element.tagName === 'VIDEO';
        
        if (!isVideo) {
            return;
        }

        // IMPORTANT: do NOT create/load the preview video until the user has started playback at least once.
        // Otherwise we'd trigger heavy MP4 network traffic just by hovering the progress bar.
    }

    /**
     * Lazily create the hidden preview video (only after playback started once)
     * Supports HTML5, HLS, and DASH renderers
     */
    ensurePreviewVideoInitialized() {
        if (this.previewVideoInitialized) return;
        if (!this.player?.state?.hasStartedPlayback) return;

        // Check if thumbnail preview is disabled via options
        if (this.player.options.thumbnailPreview === false) {
            this.previewSupported = false;
            this.previewVideoInitialized = true;
            return;
        }

        const renderer = this.player.renderer;
        const hasVideoMedia = renderer && renderer.media && renderer.media.tagName === 'VIDEO';
        
        if (!hasVideoMedia) {
            this.previewSupported = false;
            this.previewVideoInitialized = true;
            return;
        }

        // Check if this is a streaming renderer (HLS/DASH handle seeking internally)
        const isStreamingRenderer = (renderer.hls && typeof renderer.hls.loadLevel !== 'undefined')
            || (renderer.dash && typeof renderer.dash.getQualityFor === 'function');
        const isHTML5Renderer = hasVideoMedia &&
            renderer.media === this.player.element &&
            !isStreamingRenderer &&
            typeof renderer.seek === 'function';

        // For streaming renderers (HLS/DASH), we use the main video element directly
        // For HTML5, we create a separate hidden video element
        if (isStreamingRenderer) {
            // Streaming: Preview thumbnails are disabled because seeking the main video
            // for thumbnail generation would cause visible playback jumps.
            // A separate instance for preview would be too resource-intensive.
            this.previewVideo = null;
            this.previewVideoReady = false;
            this.previewSupported = false;
            this.previewUsingMainVideo = false;
            this.previewVideoInitialized = true;
            this.player.log('Preview thumbnails disabled for streaming sources', 'info');
            return;
        }

        this.previewSupported = isHTML5Renderer && hasVideoMedia;
        if (!this.previewSupported) {
            this.previewVideoInitialized = true;
            return;
        }

        const mainVideo = renderer.media || this.player.element;
        let videoSrc = null;
        if (mainVideo.src) {
            videoSrc = mainVideo.src;
        } else {
            const source = mainVideo.querySelector('source');
            if (source) {
                videoSrc = source.src;
            }
        }

        if (!videoSrc) {
            this.player.log('No video source found for preview', 'warn');
            this.previewSupported = false;
            this.previewVideoInitialized = true;
            return;
        }

        // Create a hidden video element for capturing frames
        this.previewVideo = document.createElement('video');
        this.previewVideo.muted = true;
        this.previewVideo.preload = 'auto'; // Need more than metadata to capture frames
        this.previewVideo.playsInline = true;
        this.previewVideo.style.position = 'absolute';
        this.previewVideo.style.visibility = 'hidden';
        this.previewVideo.style.width = '1px';
        this.previewVideo.style.height = '1px';
        this.previewVideo.style.top = '-9999px';

        if (mainVideo.crossOrigin) {
            this.previewVideo.crossOrigin = mainVideo.crossOrigin;
        }

        this.previewVideo.addEventListener('error', (e: Event) => {
            this.player.log('Preview video failed to load:', e, 'warn');
            this.previewSupported = false;
        });

        this.previewVideo.addEventListener('loadedmetadata', () => {
            this.previewVideoReady = true;
            
            // Start pregeneration if enabled
            if (this.player.options.thumbnailPregenerate) {
                this.pregenerateThumbnails();
            }
        }, { once: true });

        if (this.player.container) {
            this.player.container.appendChild(this.previewVideo);
        }

        this.previewVideo.src = videoSrc;
        this.previewVideoReady = false;
        this.previewUsingMainVideo = false;
        this.previewVideoInitialized = true;
    }

    /**
     * Pre-generate thumbnails during browser idle time
     * Uses requestIdleCallback to avoid impacting UI performance
     */
    pregenerateThumbnails() {
        if (!this.previewSupported || !this.previewVideo) return;
        if (!window.requestIdleCallback) return; // Not supported in older browsers
        
        const duration = this.player.state.duration;
        if (!duration || duration <= 0) return;
        
        const interval = this.player.options.thumbnailInterval || 10;
        const times: number[] = [];
        
        // Generate list of times to pre-generate
        for (let t = 0; t < duration; t += interval) {
            // Skip times already in cache
            const cacheKey = Math.floor(t);
            if (!this.previewThumbnailCache.has(cacheKey)) {
                times.push(t);
            }
        }
        
        if (times.length === 0) return;
        
        this.player.log(`Pre-generating ${times.length} thumbnails`, 'debug');
        
        const generateNext = (deadline: IdleDeadline) => {
            // Generate thumbnails while we have idle time (at least 50ms)
            while (deadline.timeRemaining() > 50 && times.length > 0) {
                const time = times.shift();
                if (time === undefined) {
                    break;
                }
                // Fire-and-forget thumbnail generation
                this.generatePreviewThumbnail(time).catch(() => {
                    // Silently ignore errors during pregeneration
                });
            }
            
            // Schedule next batch if there are more to generate
            if (times.length > 0 && this.previewSupported) {
                requestIdleCallback(generateNext, { timeout: 5000 });
            }
        };
        
        // Start pre-generation with a timeout to ensure it eventually runs
        requestIdleCallback(generateNext, { timeout: 5000 });
    }

    /**
     * Generate preview thumbnail for a specific time
     * @param {number} time - Time in seconds
     * @returns {Promise<string>} Data URL of the thumbnail
     */
    async generatePreviewThumbnail(time: number) {
        if (!this.previewSupported || !this.previewVideo) {
            return null;
        }

        // Wait for preview video to be ready if not yet loaded
        if (!this.previewVideoReady) {
            if (this.previewVideo.readyState < 2) {
                // Wait for at least HAVE_CURRENT_DATA (2) to ensure we can capture frames
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Preview video data load timeout'));
                    }, 10000);
                    
                    const cleanup = () => {
                        clearTimeout(timeout);
                        this.previewVideo.removeEventListener('loadeddata', checkReady);
                        this.previewVideo.removeEventListener('canplay', checkReady);
                        this.previewVideo.removeEventListener('error', onError);
                    };
                    
                    const checkReady = () => {
                        if (this.previewVideo.readyState >= 2) {
                            cleanup();
                            this.previewVideoReady = true;
                            resolve();
                        }
                    };
                    
                    const onError = () => {
                        cleanup();
                        reject(new Error('Preview video failed to load'));
                    };
                    
                    // Try loadeddata first (faster), fallback to canplay
                    if (this.previewVideo.readyState >= 1) {
                        this.previewVideo.addEventListener('loadeddata', checkReady);
                    }
                    this.previewVideo.addEventListener('canplay', checkReady);
                    this.previewVideo.addEventListener('error', onError);
                    
                    // If already ready, resolve immediately
                    if (this.previewVideo.readyState >= 2) {
                        checkReady();
                    }
                }).catch((): null => {
                    this.previewSupported = false;
                    return null;
                });
            } else {
                this.previewVideoReady = true;
            }
        }

        // Check cache first
        const cacheKey = Math.floor(time);
        if (this.previewThumbnailCache.has(cacheKey)) {
            return this.previewThumbnailCache.get(cacheKey);
        }

        // Use shared frame capture utility
        // For main video (HLS), we need to restore state; for preview video, we don't
        const restoreState = this.previewUsingMainVideo;
        const quality = this.player.options.thumbnailQuality || 0.8;
        const maxWidth = this.player.options.thumbnailWidth || 160;
        const maxHeight = this.player.options.thumbnailHeight || 90;
        
        const dataURL = await captureVideoFrame(this.previewVideo, time, {
            restoreState,
            quality,
            maxWidth,
            maxHeight
        });

        if (dataURL) {
            // Cache the thumbnail (configurable cache size with LRU-like behavior)
            const maxCacheSize = this.player.options.thumbnailCacheSize || 50;
            if (this.previewThumbnailCache.size >= maxCacheSize) {
                // Delete oldest entry (first key in insertion order)
                const firstKey = this.previewThumbnailCache.keys().next().value;
                this.previewThumbnailCache.delete(firstKey);
            }
            this.previewThumbnailCache.set(cacheKey, dataURL);
        }

        return dataURL;
    }

    /**
     * Update preview thumbnail display
     * @param {number} time - Time in seconds
     */
    async updatePreviewThumbnail(time: number) {
        if (!this.previewSupported || !this.controls.progressPreview) {
            return;
        }

        // Clear any pending updates
        if (this.previewThumbnailTimeout) {
            clearTimeout(this.previewThumbnailTimeout);
        }

        // Debounce thumbnail generation to avoid excessive seeking
        this.previewThumbnailTimeout = setTimeout(async () => {
            try {
                const thumbnail = await this.generatePreviewThumbnail(time);
                if (thumbnail && this.controls.progressPreview) {
                    // Set background image and make visible
                    this.controls.progressPreview.style.backgroundImage = `url("${thumbnail}")`;
                    this.controls.progressPreview.style.display = 'block';
                    this.controls.progressPreview.style.backgroundRepeat = 'no-repeat';
                    this.controls.progressPreview.style.backgroundPosition = 'center';
                } else {
                    // Hide if thumbnail generation failed
                    if (this.controls.progressPreview) {
                        this.controls.progressPreview.style.display = 'none';
                    }
                }
                this.currentPreviewTime = time;
            } catch (error) {
                this.player.log('Preview thumbnail update failed:', error, 'warn');
                if (this.controls.progressPreview) {
                    this.controls.progressPreview.style.display = 'none';
                }
            }
        }, 100);
    }

    setupProgressBarEvents() {
        const progress = this.controls.progress;

        const updateProgress = (clientX: number) => {
            const rect = progress.getBoundingClientRect();
            // Guard against division by zero if progress bar has no width
            const percent = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
            const duration = this.player.state.duration || 0;
            const time = percent * duration;
            return {percent, time};
        };

        // Mouse events
        progress.addEventListener('mousedown', (e: MouseEvent) => {
            this.isDraggingProgress = true;
            const {time} = updateProgress(e.clientX);
            this.player.seek(time);
        });

        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isDraggingProgress) {
                const {time} = updateProgress(e.clientX);
                this.player.seek(time);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDraggingProgress = false;
        });

        // Hover tooltip
        progress.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.isDraggingProgress) {
                const {time} = updateProgress(e.clientX);
                const rect = progress.getBoundingClientRect();
                const left = e.clientX - rect.left;
                
                // Update tooltip time text
                this.controls.progressTooltipTime.textContent = TimeUtils.formatTime(time);
                
                // Update tooltip position
                this.controls.progressTooltip.style.left = `${left}px`;
                this.controls.progressTooltip.style.display = 'block';

                // Only show preview thumbnails after the user has started playback at least once.
                // Before that, show just the timestamp (no empty preview box).
                if (!this.player?.state?.hasStartedPlayback) {
                    if (this.controls.progressPreview) {
                        this.controls.progressPreview.style.display = 'none';
                    }
                    return;
                }

                this.ensurePreviewVideoInitialized();
                if (this.previewSupported) {
                    this.updatePreviewThumbnail(time);
                } else if (this.controls.progressPreview) {
                    this.controls.progressPreview.style.display = 'none';
                }
            }
        });

        progress.addEventListener('mouseleave', () => {
            this.controls.progressTooltip.style.display = 'none';
            if (this.previewThumbnailTimeout) {
                clearTimeout(this.previewThumbnailTimeout);
            }
        });

        // Keyboard navigation
        progress.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.player.seekBackward(5);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.player.seekForward(5);
            }
        });

        // Touch events
        progress.addEventListener('touchstart', (e: TouchEvent) => {
            this.isDraggingProgress = true;
            const touch = e.touches[0];
            const {time} = updateProgress(touch.clientX);
            this.player.seek(time);
        });

        progress.addEventListener('touchmove', (e: TouchEvent) => {
            if (this.isDraggingProgress) {
                e.preventDefault();
                const touch = e.touches[0];
                const {time} = updateProgress(touch.clientX);
                this.player.seek(time);
            }
        });

        progress.addEventListener('touchend', () => {
            this.isDraggingProgress = false;
        });
    }

    createPlayPauseButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-play-pause`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.play')
            }
        });

        button.appendChild(createIconElement('play'));

        button.addEventListener('click', () => {
            this.player.toggle();
        });

        this.controls.playPause = button;
        return button;
    }

    createRestartButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-restart`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.restart')
            }
        });

        button.appendChild(createIconElement('restart'));

        button.addEventListener('click', () => {
            this.player.seek(0);
            this.player.play();
        });

        return button;
    }

    createPreviousButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-previous`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.previous')
            }
        });

        button.appendChild(createIconElement('skipPrevious'));

        button.addEventListener('click', () => {
            if (this.player.playlistManager) {
                this.player.playlistManager.previous();
            }
        });

        // Update button state
        const updateState = () => {
            if (this.player.playlistManager) {
                (button as HTMLButtonElement).disabled = !this.player.playlistManager.hasPrevious() && !this.player.playlistManager.options.loop;
            }
        };
        this.player.on('playlisttrackchange', updateState);
        updateState();

        this.controls.previous = button;
        return button;
    }

    createNextButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-next`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.next')
            }
        });

        button.appendChild(createIconElement('skipNext'));

        button.addEventListener('click', () => {
            if (this.player.playlistManager) {
                this.player.playlistManager.next();
            }
        });

        // Update button state
        const updateState = () => {
            if (this.player.playlistManager) {
                (button as HTMLButtonElement).disabled = !this.player.playlistManager.hasNext() && !this.player.playlistManager.options.loop;
            }
        };
        this.player.on('playlisttrackchange', updateState);
        updateState();

        this.controls.next = button;
        return button;
    }

    createPlaylistToggleButton() {
        // Get unique panel ID from playlist manager
        const panelId = this.player.playlistManager ? `${this.player.playlistManager.uniqueId}-panel` : 'vidply-playlist-panel';
        
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-playlist-toggle`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.playlist'),
                'aria-expanded': 'false',
                'aria-pressed': 'false',
                'aria-controls': panelId
            }
        });

        button.appendChild(createIconElement('playlist'));

        button.addEventListener('click', () => {
            if (this.player.playlistManager) {
                this.player.playlistManager.togglePanel();
            }
        });

        this.controls.playlistToggle = button;
        return button;
    }

    createRewindButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-rewind`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.rewindSeconds', { seconds: 15 })
            }
        });

        button.appendChild(createIconElement('rewind'));

        button.addEventListener('click', () => {
            this.player.seekBackward(15);
        });

        return button;
    }

    createForwardButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-forward`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.forwardSeconds', { seconds: 15 })
            }
        });

        button.appendChild(createIconElement('forward'));

        button.addEventListener('click', () => {
            this.player.seekForward(15);
        });

        return button;
    }

    createMuteButton() {
        // Simple mute/unmute button for touch devices
        const muteButton = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.mute')
            }
        });

        muteButton.appendChild(createIconElement('volumeHigh'));

        // Simply toggle mute on click/touch
        muteButton.addEventListener('click', () => {
            this.player.toggleMute();
        });

        this.controls.mute = muteButton;

        return muteButton;
    }

    createVolumeControl() {
        // Mute/Volume button with slider (desktop)
        const muteButton = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-mute`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.volume'),
                'aria-expanded': 'false'
            }
        });

        muteButton.appendChild(createIconElement('volumeHigh'));

        // Toggle mute on right click, show volume slider on left click
        muteButton.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.player.toggleMute();
        });

        muteButton.addEventListener('click', () => {
            this.showVolumeSlider(muteButton);
        });

        this.controls.mute = muteButton;

        return muteButton;
    }

    showVolumeSlider(button: HTMLElement) {
        // Remove existing slider if any
        const existingSlider = document.querySelector(`.${this.player.options.classPrefix}-volume-menu`);
        if (existingSlider) {
            existingSlider.remove();
            button.setAttribute('aria-expanded', 'false');
            return;
        }

        // Volume menu container
        const volumeMenu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-volume-menu ${this.player.options.classPrefix}-menu`
        });

        const volumeSlider = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-volume-slider`,
            attributes: {
                'role': 'slider',
                'aria-label': i18n.t('player.volume'),
                'aria-valuemin': '0',
                'aria-valuemax': '100',
                'aria-valuenow': String(Math.round(this.player.state.volume * 100)),
                'tabindex': '0'
            }
        });

        const volumeTrack = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-volume-track`
        });

        const volumeFill = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-volume-fill`
        });
        
        // Set initial fill height based on current volume
        const initialVolumePercent = this.player.state.volume * 100;
        volumeFill.style.height = `${initialVolumePercent}%`;

        const volumeHandle = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-volume-handle`
        });

        volumeTrack.appendChild(volumeFill);
        volumeFill.appendChild(volumeHandle);
        volumeSlider.appendChild(volumeTrack);
        volumeMenu.appendChild(volumeSlider);

        // Volume slider events
        const updateVolume = (clientY: number) => {
            const rect = volumeTrack.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / rect.height)));
            this.player.setVolume(percent);
        };

        // Mouse events
        volumeSlider.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.isDraggingVolume = true;
            updateVolume(e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingVolume) {
                updateVolume(e.clientY);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDraggingVolume = false;
        });

        // Touch events for iOS and mobile devices
        volumeSlider.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.isDraggingVolume = true;
            const touch = e.touches[0];
            updateVolume(touch.clientY);
        }, { passive: false });

        volumeSlider.addEventListener('touchmove', (e: TouchEvent) => {
            if (this.isDraggingVolume) {
                e.preventDefault();
                const touch = e.touches[0];
                updateVolume(touch.clientY);
            }
        }, { passive: false });

        volumeSlider.addEventListener('touchend', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.isDraggingVolume = false;
        }, { passive: false });

        volumeSlider.addEventListener('touchcancel', () => {
            this.isDraggingVolume = false;
        });

        // Keyboard volume control
        volumeSlider.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.player.setVolume(Math.min(1, this.player.state.volume + 0.1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.player.setVolume(Math.max(0, this.player.state.volume - 0.1));
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                // Close menu and return focus to button
                this.closeMenuAndReturnFocus(volumeMenu, button, true);
            }
        });

        // Prevent menu from closing when interacting with slider
        volumeMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Prevent menu from closing on touch events
        volumeMenu.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });
        
        volumeMenu.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        });
        
        volumeMenu.addEventListener('touchend', (e) => {
            e.stopPropagation();
        });

        // Position menu first (before it's visible) to prevent jumping
        volumeMenu.style.visibility = 'hidden';
        volumeMenu.style.display = 'block';
        
        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(volumeMenu, button);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(volumeMenu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            volumeMenu.style.visibility = 'visible';
        });

        this.controls.volumeSlider = volumeSlider;
        this.controls.volumeFill = volumeFill;

        // Focus the volume slider for keyboard accessibility
        focusElement(volumeSlider, { delay: 50 });

        // Close menu on outside click
        this.attachMenuCloseHandler(volumeMenu, button, true);
    }

    createTimeDisplay() {
        const container = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-time`,
            attributes: {
                'role': 'group',
                'aria-label': i18n.t('time.display')
            }
        });

        // Current time - visual text hidden, accessible text provided via sr-only span
        this.controls.currentTimeDisplay = DOMUtils.createElement('span', {
            className: `${this.player.options.classPrefix}-current-time`
        });
        
        // Create visual text inside, hidden from screen readers
        const currentTimeVisual = DOMUtils.createElement('span', {
            textContent: '00:00',
            attributes: {
                'aria-hidden': 'true'
            }
        });
        const currentTimeAccessible = DOMUtils.createElement('span', {
            className: 'vidply-sr-only',
            textContent: i18n.t('time.seconds', { count: 0 })
        });

        this.controls.currentTimeDisplay.appendChild(currentTimeVisual);
        this.controls.currentTimeDisplay.appendChild(currentTimeAccessible);
        this.controls.currentTimeVisual = currentTimeVisual;
        this.controls.currentTimeAccessible = currentTimeAccessible;

        const separator = DOMUtils.createElement('span', {
            textContent: ' / ',
            attributes: {
                'aria-hidden': 'true'
            }
        });

        // Duration - visual text hidden, accessible text provided via sr-only span
        this.controls.durationDisplay = DOMUtils.createElement('span', {
            className: `${this.player.options.classPrefix}-duration`
        });
        
        // Create visual text inside, hidden from screen readers
        const durationVisual = DOMUtils.createElement('span', {
            textContent: '00:00',
            attributes: {
                'aria-hidden': 'true'
            }
        });
        const durationAccessible = DOMUtils.createElement('span', {
            className: 'vidply-sr-only',
            textContent: i18n.t('time.durationPrefix') + i18n.t('time.seconds', { count: 0 })
        });

        this.controls.durationDisplay.appendChild(durationVisual);
        this.controls.durationDisplay.appendChild(durationAccessible);
        this.controls.durationVisual = durationVisual;
        this.controls.durationAccessible = durationAccessible;

        container.appendChild(this.controls.currentTimeDisplay);
        container.appendChild(separator);
        container.appendChild(this.controls.durationDisplay);

        return container;
    }

    createChaptersButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-chapters`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.chapters'),
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('chapters'));

        button.addEventListener('click', () => {
            this.showChaptersMenu(button);
        });

        this.controls.chapters = button;
        return button;
    }

    showChaptersMenu(button: HTMLElement) {
        // Remove existing menu if any (toggle behavior)
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-chapters-menu`);
        if (existingMenu) {
            existingMenu.remove();
            button.setAttribute('aria-expanded', 'false');
            // Clear tracking if this was the open menu
            if (this.openMenu === existingMenu) {
                this.openMenu = null;
                this.openMenuButton = null;
            }
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-chapters-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': i18n.t('player.chapters')
            }
        });

        // Get chapter tracks
        const chapterTracks: TextTrack[] = (Array.from(this.player.element.textTracks) as TextTrack[]).filter(
            track => track.kind === 'chapters'
        );

        if (chapterTracks.length === 0) {
            // No chapters available
            const noChaptersItem = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noChapters'),
                attributes: {
                    'role': 'menuitem'
                },
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noChaptersItem);
        } else {
            const chapterTrack = chapterTracks[0];

            // Ensure track is in 'hidden' mode to load cues
            if (chapterTrack.mode === 'disabled') {
                chapterTrack.mode = 'hidden';
            }

            if (!chapterTrack.cues || chapterTrack.cues.length === 0) {
                // Cues not loaded yet - wait for them to load
                const loadingItem = DOMUtils.createElement('div', {
                    className: `${this.player.options.classPrefix}-menu-item`,
                    textContent: i18n.t('player.loadingChapters'),
                    attributes: {
                        'role': 'menuitem'
                    },
                    style: {opacity: '0.5', cursor: 'default'}
                });
                menu.appendChild(loadingItem);

                // Listen for track load event
                const onTrackLoad = () => {
                    // Remove loading message and rebuild menu
                    menu.remove();
                    this.showChaptersMenu(button);
                };

                chapterTrack.addEventListener('load', onTrackLoad, {once: true});

                // Also try again after a short delay as fallback
                setTimeout(() => {
                    if (chapterTrack.cues && chapterTrack.cues.length > 0 && document.contains(menu)) {
                        menu.remove();
                        this.showChaptersMenu(button);
                    }
                }, 500);
            } else {
                // Display chapters
                const cues = chapterTrack.cues;
                for (let i = 0; i < cues.length; i++) {
                    const cue = cues[i] as VTTCue;
                    const item = DOMUtils.createElement('button', {
                        className: `${this.player.options.classPrefix}-menu-item`,
                        attributes: {
                            'type': 'button',
                            'role': 'menuitem',
                            'tabindex': '-1'
                        }
                    });

                    const timeLabel = DOMUtils.createElement('span', {
                        className: `${this.player.options.classPrefix}-chapter-time`,
                        textContent: TimeUtils.formatTime(cue.startTime),
                        attributes: {
                            'aria-label': TimeUtils.formatDuration(cue.startTime)
                        }
                    });

                    const titleLabel = DOMUtils.createElement('span', {
                        className: `${this.player.options.classPrefix}-chapter-title`,
                        textContent: cue.text
                    });

                    item.appendChild(timeLabel);
                    item.appendChild(document.createTextNode(' '));
                    item.appendChild(titleLabel);

                    item.addEventListener('click', () => {
                        this.player.seek(cue.startTime);
                        this.closeMenuAndReturnFocus(menu, button);
                    });

                    menu.appendChild(item);
                }
                
                // Add keyboard navigation
                this.attachMenuKeyboardNavigation(menu, button);
                
                // Focus first item
                setTimeout(() => {
                    const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`) as HTMLElement | null;
                    if (firstItem) {
                        firstItem.focus({ preventScroll: true });
                    }
                }, 0);
            }
        }

        // Position menu first (before it's visible) to prevent jumping
        // Set menu to invisible temporarily
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(menu, button);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(menu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            menu.style.visibility = 'visible';
        });

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    createQualityButton() {
        const ariaLabel = i18n.t('player.quality');
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-quality`,
            attributes: {
                'type': 'button',
                'aria-label': ariaLabel,
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('hd'));
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);

        // Add quality indicator text
        const qualityText = DOMUtils.createElement('span', {
            className: `${this.player.options.classPrefix}-quality-text`,
            textContent: ''
        });
        button.appendChild(qualityText);

        button.addEventListener('click', () => {
            this.showQualityMenu(button);
        });

        this.controls.quality = button;
        this.controls.qualityText = qualityText;
        
        // Update quality indicator after a short delay to ensure renderer is ready
        setTimeout(() => this.updateQualityIndicator(), 500);
        
        return button;
    }

    showQualityMenu(button: HTMLElement) {
        // Remove existing menu if any (toggle behavior)
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-quality-menu`);
        if (existingMenu) {
            existingMenu.remove();
            button.setAttribute('aria-expanded', 'false');
            // Clear tracking if this was the open menu
            if (this.openMenu === existingMenu) {
                this.openMenu = null;
                this.openMenuButton = null;
            }
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-quality-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': i18n.t('player.quality')
            }
        });

        // Check if renderer supports quality selection
        if (this.player.renderer && this.player.renderer.getQualities) {
            const qualities = this.player.renderer.getQualities();
            const currentQuality = this.player.renderer.getCurrentQuality ? this.player.renderer.getCurrentQuality() : -1;
            const hasAutoQuality = typeof this.player.renderer.supportsAutoQuality === 'function'
                && this.player.renderer.supportsAutoQuality();

            if (qualities.length === 0) {
                // No qualities available
                const noQualityItem = DOMUtils.createElement('div', {
                    className: `${this.player.options.classPrefix}-menu-item`,
                    textContent: i18n.t('player.autoQuality'),
                    attributes: {
                        'role': 'menuitem'
                    },
                    style: {opacity: '0.5', cursor: 'default'}
                });
                menu.appendChild(noQualityItem);
            } else {
                let activeItem: HTMLElement | null = null;
                
                // Auto quality option (for renderers that support it, e.g. HLS, DASH)
                if (hasAutoQuality) {
                    const autoItem = DOMUtils.createElement('button', {
                        className: `${this.player.options.classPrefix}-menu-item`,
                        textContent: i18n.t('player.auto'),
                        attributes: {
                            'type': 'button',
                            'role': 'menuitem',
                            'tabindex': '-1'
                        }
                    });

                    // Check if auto is currently selected
                    const isAuto = typeof this.player.renderer.isAutoQuality === 'function'
                        && this.player.renderer.isAutoQuality();
                    if (isAuto) {
                        autoItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
                        autoItem.appendChild(createIconElement('check'));
                        activeItem = autoItem;
                    }

                    autoItem.addEventListener('click', () => {
                        if (this.player.renderer.switchQuality) {
                            this.player.renderer.switchQuality(-1); // -1 for auto
                        }
                        this.closeMenuAndReturnFocus(menu, button);
                    });

                    menu.appendChild(autoItem);
                }

                // Quality options
                qualities.forEach((quality: any) => {
                    const item = DOMUtils.createElement('button', {
                        className: `${this.player.options.classPrefix}-menu-item`,
                        textContent: quality.name || `${quality.height}p`,
                        attributes: {
                            'type': 'button',
                            'role': 'menuitem',
                            'tabindex': '-1'
                        }
                    });

                    // Highlight current quality
                    if (quality.index === currentQuality) {
                        item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
                        item.appendChild(createIconElement('check'));
                        activeItem = item;
                    }

                    item.addEventListener('click', () => {
                        if (this.player.renderer.switchQuality) {
                            this.player.renderer.switchQuality(quality.index);
                        }
                        this.closeMenuAndReturnFocus(menu, button);
                    });

                    menu.appendChild(item);
                });
                
                // Add keyboard navigation
                this.attachMenuKeyboardNavigation(menu, button);
                
                // Focus active item or first item
                setTimeout(() => {
                    const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
                    if (focusTarget) {
                        focusTarget.focus({ preventScroll: true });
                    }
                }, 0);
            }
        } else {
            // No quality support
            const noSupportItem = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noQuality'),
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noSupportItem);
        }

        // Position menu first (before it's visible) to prevent jumping
        // Set menu to invisible temporarily
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(menu, button);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(menu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            menu.style.visibility = 'visible';
        });

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    createCaptionStyleButton() {
        const ariaLabel = i18n.t('player.captionStyling');
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-caption-style`,
            attributes: {
                'type': 'button',
                'aria-label': ariaLabel,
                'aria-expanded': 'false'
            }
        });

        // Create "Aa" text icon for styling
        const textIcon = DOMUtils.createElement('span', {
            textContent: 'Aa',
            style: {
                fontSize: '14px',
                fontWeight: 'bold'
            }
        });
        button.appendChild(textIcon);
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);

        button.addEventListener('click', () => {
            this.showCaptionStyleMenu(button);
        });

        this.controls.captionStyle = button;
        return button;
    }

    showCaptionStyleMenu(button: HTMLElement) {
        // Remove existing menu if any (toggle behavior)
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-caption-style-menu`);
        if (existingMenu) {
            existingMenu.remove();
            button.setAttribute('aria-expanded', 'false');
            // Clear tracking if this was the open menu
            if (this.openMenu === existingMenu) {
                this.openMenu = null;
                this.openMenuButton = null;
            }
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-caption-style-menu ${this.player.options.classPrefix}-menu ${this.player.options.classPrefix}-settings-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': i18n.t('player.captionStyling')
            }
        });

        // Prevent menu from closing when clicking inside
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Check if there are any caption tracks
        if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
            // Show "No captions available" message
            const noTracksItem = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noCaptions'),
                attributes: {
                    'role': 'menuitem'
                },
                style: {opacity: '0.5', cursor: 'default', padding: '12px 16px'}
            });
            menu.appendChild(noTracksItem);

            // Position menu first (before it's visible) to prevent jumping
            // Set menu to invisible temporarily
            menu.style.visibility = 'hidden';
            menu.style.display = 'block';
            
            // Insert menu into DOM (handles fullscreen positioning)
            this.insertMenuIntoDOM(menu, button);
            
            // Position immediately (synchronously) while hidden
            this.positionMenu(menu, button, true);
            
            // Make menu visible after positioning
            requestAnimationFrame(() => {
                menu.style.visibility = 'visible';
            });

            // Close menu on outside click
            this.attachMenuCloseHandler(menu, button, true);
            return;
        }

        // Font Size
        const fontSizeGroup = this.createStyleControl(
            i18n.t('styleLabels.fontSize'),
            'captionsFontSize',
            [
                {label: i18n.t('fontSizes.small'), value: '87.5%'},
                {label: i18n.t('fontSizes.normal'), value: '100%'},
                {label: i18n.t('fontSizes.large'), value: '125%'},
                {label: i18n.t('fontSizes.xlarge'), value: '150%'}
            ]
        );
        menu.appendChild(fontSizeGroup);

        // Font Family
        const fontFamilyGroup = this.createStyleControl(
            i18n.t('styleLabels.font'),
            'captionsFontFamily',
            [
                {label: i18n.t('fontFamilies.sansSerif'), value: 'sans-serif'},
                {label: i18n.t('fontFamilies.serif'), value: 'serif'},
                {label: i18n.t('fontFamilies.monospace'), value: 'monospace'}
            ]
        );
        menu.appendChild(fontFamilyGroup);

        // Text Color
        const colorGroup = this.createColorControl(i18n.t('styleLabels.textColor'), 'captionsColor');
        menu.appendChild(colorGroup);

        // Background Color
        const bgColorGroup = this.createColorControl(i18n.t('styleLabels.background'), 'captionsBackgroundColor');
        menu.appendChild(bgColorGroup);

        // Opacity
        const opacityGroup = this.createOpacityControl(i18n.t('styleLabels.opacity'), 'captionsOpacity');
        menu.appendChild(opacityGroup);

        // Set min-width for caption style menu
        menu.style.minWidth = '220px';

        // Position menu first (before it's visible) to prevent jumping
        // Set menu to invisible temporarily
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(menu, button);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(menu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            menu.style.visibility = 'visible';
        });

        // Close menu on outside click (but not when interacting with controls)
        this.attachMenuCloseHandler(menu, button, true);

        // Auto-focus the first style select element
        focusFirstElement(menu, `.${this.player.options.classPrefix}-style-select`);
    }

    createStyleControl(label: string, property: string, options: Array<{label: string; value: any}>) {
        const group = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-style-group`
        });

        // Generate unique ID for the control
        const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;

        const labelEl = DOMUtils.createElement('label', {
            textContent: label,
            attributes: {
                'for': controlId
            },
            style: {
                display: 'block',
                fontSize: '12px',
                marginBottom: '4px',
                color: 'rgba(255,255,255,0.7)'
            }
        });
        group.appendChild(labelEl);

        const select = DOMUtils.createElement('select', {
            className: `${this.player.options.classPrefix}-style-select`,
            attributes: {
                'id': controlId
            },
            style: {
                width: '100%',
                padding: '6px',
                background: 'var(--vidply-white)',
                border: '1px solid var(--vidply-white-10)',
                borderRadius: '4px',
                color: 'var(--vidply-black)',
                fontSize: '13px'
            }
        });

        const currentValue = this.player.options[property];
        options.forEach((opt: {label: string; value: any}) => {
            const option = DOMUtils.createElement('option', {
                textContent: opt.label,
                attributes: {value: opt.value}
            });
            if (opt.value === currentValue) {
                (option as HTMLOptionElement).selected = true;
            }
            select.appendChild(option);
        });

        // Prevent clicks from closing the menu
        select.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        select.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        select.addEventListener('change', (e) => {
            e.stopPropagation();
            this.player.options[property] = (e.target as HTMLSelectElement).value;
            if (this.player.captionManager) {
                this.player.captionManager.setCaptionStyle(
                    property.replace('captions', '').charAt(0).toLowerCase() + property.replace('captions', '').slice(1),
                    (e.target as HTMLSelectElement).value
                );
            }
        });

        group.appendChild(select);
        return group;
    }

    createColorControl(label: string, property: string) {
        const group = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-style-group`
        });

        // Generate unique ID for the control
        const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;

        const labelEl = DOMUtils.createElement('label', {
            textContent: label,
            attributes: {
                'for': controlId
            },
            style: {
                display: 'block',
                fontSize: '12px',
                marginBottom: '4px',
                color: 'rgba(255,255,255,0.7)'
            }
        });
        group.appendChild(labelEl);

        const input = DOMUtils.createElement('input', {
            attributes: {
                'id': controlId,
                type: 'color',
                value: this.player.options[property]
            },
            style: {
                width: '100%',
                height: '32px',
                padding: '2px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                cursor: 'pointer'
            }
        });

        // Prevent clicks from closing the menu
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        input.addEventListener('change', (e) => {
            e.stopPropagation();
            this.player.options[property] = (e.target as HTMLInputElement).value;
            if (this.player.captionManager) {
                this.player.captionManager.setCaptionStyle(
                    property.replace('captions', '').charAt(0).toLowerCase() + property.replace('captions', '').slice(1),
                    (e.target as HTMLInputElement).value
                );
            }
        });

        group.appendChild(input);
        return group;
    }

    createOpacityControl(label: string, property: string) {
        const group = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-style-group`
        });

        // Generate unique ID for the control
        const controlId = `${this.player.options.classPrefix}-${property}-${Date.now()}`;

        const labelContainer = DOMUtils.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px'
            }
        });

        const labelEl = DOMUtils.createElement('label', {
            textContent: label,
            attributes: {
                'for': controlId
            },
            style: {
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)'
            }
        });

        const valueEl = DOMUtils.createElement('span', {
            textContent: Math.round(this.player.options[property] * 100) + '%',
            style: {
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)'
            }
        });

        labelContainer.appendChild(labelEl);
        labelContainer.appendChild(valueEl);
        group.appendChild(labelContainer);

        const input = DOMUtils.createElement('input', {
            attributes: {
                'id': controlId,
                type: 'range',
                min: '0',
                max: '1',
                step: '0.1',
                value: String(this.player.options[property])
            },
            style: {
                width: '100%',
                cursor: 'pointer'
            }
        });

        // Prevent clicks from closing the menu
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        input.addEventListener('input', (e) => {
            e.stopPropagation();
            const value = parseFloat((e.target as HTMLInputElement).value);
            valueEl.textContent = Math.round(value * 100) + '%';
            this.player.options[property] = value;
            if (this.player.captionManager) {
                this.player.captionManager.setCaptionStyle(
                    property.replace('captions', '').charAt(0).toLowerCase() + property.replace('captions', '').slice(1),
                    value
                );
            }
        });

        group.appendChild(input);
        return group;
    }

    createSpeedButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-speed`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.speed'),
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('speed'));

        const speedText = DOMUtils.createElement('span', {
            className: `${this.player.options.classPrefix}-speed-text`,
            textContent: '1x'
        });
        button.appendChild(speedText);

        button.addEventListener('click', () => {
            this.showSpeedMenu(button);
        });

        this.controls.speed = button;
        this.controls.speedText = speedText;
        return button;
    }

    formatSpeedLabel(speed: number) {
        // Special case: 1x is "Normal" (translated)
        if (speed === 1) {
            return i18n.t('speeds.normal');
        }
        
        // For other speeds, format with locale-specific decimal separator
        const speedStr = speed.toLocaleString(i18n.getLanguage(), {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        
        return `${speedStr}×`;
    }

    showSpeedMenu(button: HTMLElement) {
        // Remove existing menu if any (toggle behavior)
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-speed-menu`);
        if (existingMenu) {
            existingMenu.remove();
            button.setAttribute('aria-expanded', 'false');
            // Clear tracking if this was the open menu
            if (this.openMenu === existingMenu) {
                this.openMenu = null;
                this.openMenuButton = null;
            }
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-speed-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu'
            }
        });

        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        let activeItem: HTMLElement | null = null;

        speeds.forEach(speed => {
            const item = DOMUtils.createElement('button', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: this.formatSpeedLabel(speed),
                attributes: {
                    'type': 'button',
                    'role': 'menuitem',
                    'tabindex': '-1'
                }
            });

            if (speed === this.player.state.playbackSpeed) {
                item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
                item.appendChild(createIconElement('check'));
                activeItem = item;
            }

            item.addEventListener('click', () => {
                this.player.setPlaybackSpeed(speed);
                this.closeMenuAndReturnFocus(menu, button);
            });

            menu.appendChild(item);
        });

        // Position menu first (before it's visible) to prevent jumping
        // Set menu to invisible temporarily
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(menu, button);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(menu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            menu.style.visibility = 'visible';
        });

        // Add keyboard navigation
        this.attachMenuKeyboardNavigation(menu, button);

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);

        // Focus the active item or first item
        setTimeout(() => {
            const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
            if (focusTarget) {
                focusTarget.focus({ preventScroll: true });
            }
        }, 0);
    }

    createCaptionsButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-captions-button`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.captions'),
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('captionsOff'));

        button.addEventListener('click', () => {
            this.showCaptionsMenu(button);
        });

        this.controls.captions = button;
        return button;
    }

    showCaptionsMenu(button: HTMLElement) {
        // Remove existing menu if any (toggle behavior)
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-captions-menu`);
        if (existingMenu) {
            existingMenu.remove();
            button.setAttribute('aria-expanded', 'false');
            // Clear tracking if this was the open menu
            if (this.openMenu === existingMenu) {
                this.openMenu = null;
                this.openMenuButton = null;
            }
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-captions-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': i18n.t('captions.select')
            }
        });

        // Check if there are any caption tracks
        if (!this.player.captionManager || this.player.captionManager.tracks.length === 0) {
            // Show "No captions available" message
            const noTracksItem = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noCaptions'),
                attributes: {
                    'role': 'menuitem'
                },
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noTracksItem);

            // Insert menu into DOM (handles fullscreen positioning)
            this.insertMenuIntoDOM(menu, button);

            // Close menu on outside click
            this.attachMenuCloseHandler(menu, button);
            return;
        }

        let activeItem: HTMLElement | null = null;

        // Off option
        const offItem = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: i18n.t('captions.off'),
            attributes: {
                'type': 'button',
                'role': 'menuitem',
                'tabindex': '-1'
            }
        });

        if (!this.player.state.captionsEnabled) {
            offItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
            offItem.appendChild(createIconElement('check'));
            activeItem = offItem;
        }

        offItem.addEventListener('click', () => {
            this.player.disableCaptions();
            this.updateCaptionsButton();
            this.closeMenuAndReturnFocus(menu, button);
        });

        menu.appendChild(offItem);

        // Available tracks
        const tracks = this.player.captionManager.getAvailableTracks();
        tracks.forEach((track: any) => {
            const item = DOMUtils.createElement('button', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: track.label,
                attributes: {
                    'type': 'button',
                    'role': 'menuitem',
                    'lang': track.language,
                    'tabindex': '-1'
                }
            });

            // Check if this is the current track
            if (this.player.state.captionsEnabled &&
                this.player.captionManager.currentTrack === this.player.captionManager.tracks[track.index]) {
                item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
                item.appendChild(createIconElement('check'));
                activeItem = item;
            }

            item.addEventListener('click', () => {
                this.player.captionManager.switchTrack(track.index);
                this.updateCaptionsButton();
                this.closeMenuAndReturnFocus(menu, button);
            });

            menu.appendChild(item);
        });

        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(menu, button);

        // Add keyboard navigation for the menu
        this.attachMenuKeyboardNavigation(menu, button);

        // Close menu on outside click and Escape key
        this.attachMenuCloseHandler(menu, button);

        // Focus the active item or the first item
        setTimeout(() => {
            const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
            if (focusTarget) {
                focusTarget.focus({ preventScroll: true });
            }
        }, 0);
    }

    updateCaptionsButton() {
        if (!this.controls.captions) return;

        const icon = this.controls.captions.querySelector('.vidply-icon');
        const isEnabled = this.player.state.captionsEnabled;

        icon.innerHTML = isEnabled ?
            createIconElement('captions').innerHTML :
            createIconElement('captionsOff').innerHTML;

    }

    createTranscriptButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-transcript`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.transcript'),
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('transcript'));

        button.addEventListener('click', async () => {
            await this.player.toggleTranscript();
                this.updateTranscriptButton();
        });

        this.controls.transcript = button;
        return button;
    }

    updateTranscriptButton() {
        if (!this.controls.transcript) return;

        const isVisible = this.player.transcriptManager && this.player.transcriptManager.isVisible;
        this.controls.transcript.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
    }

    createAudioDescriptionButton() {
        const ariaLabel = i18n.t('player.audioDescription');
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-audio-description`,
            attributes: {
                'type': 'button',
                'aria-label': ariaLabel,
                'role': 'switch',
                'aria-checked': 'false'
            }
        });

        button.appendChild(createIconElement('audioDescription'));
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);

        button.addEventListener('click', async () => {
            await this.player.toggleAudioDescription();
            this.updateAudioDescriptionButton();
        });

        this.controls.audioDescription = button;
        return button;
    }

    updateAudioDescriptionButton() {
        if (!this.controls.audioDescription) return;

        const icon = this.controls.audioDescription.querySelector('.vidply-icon');
        const isEnabled = this.player.state.audioDescriptionEnabled;

        icon.innerHTML = isEnabled ?
            createIconElement('audioDescriptionOn').innerHTML :
            createIconElement('audioDescription').innerHTML;

        this.controls.audioDescription.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
        // Keep aria-label static - let aria-checked convey the state for switch role
        // The label describes what the control is, not what action it performs
    }

    createSignLanguageButton() {
        const ariaLabel = i18n.t('player.signLanguage');
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language`,
            attributes: {
                'type': 'button',
                'aria-label': ariaLabel,
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('signLanguagePip'));
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);

        button.addEventListener('click', () => {
            this.player.toggleSignLanguage();
            this.updateSignLanguageButton();
        });

        this.controls.signLanguage = button;
        return button;
    }

    updateSignLanguageButton() {
        if (!this.controls.signLanguage) return;

        const icon = this.controls.signLanguage.querySelector('.vidply-icon');
        const isEnabled = this.player.state.signLanguageEnabled;

        icon.innerHTML = isEnabled ?
            createIconElement('signLanguagePipOn').innerHTML :
            createIconElement('signLanguagePip').innerHTML;

        this.controls.signLanguage.setAttribute('aria-expanded', isEnabled ? 'true' : 'false');
        this.controls.signLanguage.setAttribute('aria-label',
            isEnabled ? i18n.t('signLanguage.hide') : i18n.t('signLanguage.show')
        );
    }

    /**
     * Create sign language in main view button (src swap, like audio description)
     */
    createSignLanguageInMainViewButton() {
        const ariaLabel = i18n.t('signLanguage.showInMainView');
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language-main-view`,
            attributes: {
                'type': 'button',
                'aria-label': ariaLabel,
                'aria-pressed': 'false'
            }
        });

        button.appendChild(createIconElement('signLanguage'));
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);

        button.addEventListener('click', () => {
            if (this.player.signLanguageManager) {
                this.player.signLanguageManager.toggleInMainView();
            }
        });

        this.controls.signLanguageMainView = button;
        return button;
    }

    /**
     * Update sign language in main view button state
     */
    updateSignLanguageInMainViewButton() {
        const btn = this.controls.signLanguageMainView;
        if (!btn) return;

        const isEnabled = this.player.state.signLanguageInMainView;
        const newLabel = isEnabled ? i18n.t('signLanguage.hideInMainView') : i18n.t('signLanguage.showInMainView');
        const iconName = isEnabled ? 'signLanguageOn' : 'signLanguage';

        btn.querySelector('.vidply-icon').innerHTML = createIconElement(iconName).innerHTML;
        btn.setAttribute('aria-pressed', String(isEnabled));
        btn.setAttribute('aria-label', newLabel);
        
        const tooltip = btn.querySelector(`.${this.player.options.classPrefix}-tooltip`);
        if (tooltip) tooltip.textContent = newLabel;
    }

    /**
     * Update accessibility buttons visibility based on current track data.
     * Called when loading a new playlist track to show/hide buttons accordingly.
     */
    updateAccessibilityButtons() {
        const hasAudioDescription = this.hasAudioDescription();
        const hasSignLanguage = this.hasSignLanguage();
        
        // Handle Audio Description button
        if (hasAudioDescription) {
            // Create button if it doesn't exist
            if (!this.controls.audioDescription && this.player.options.audioDescriptionButton !== false) {
                const btn = this.createAudioDescriptionButton();
                btn.dataset.overflowPriority = '2';
                btn.dataset.overflowPriorityMobile = '3';
                // Insert before transcript or playlist toggle button
                const transcriptBtn = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-transcript`);
                const playlistBtn = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-playlist-toggle`);
                const insertBefore = transcriptBtn || playlistBtn || null;
                if (insertBefore) {
                    this.rightButtons.insertBefore(btn, insertBefore);
                } else {
                    this.rightButtons.appendChild(btn);
                }
                // Re-setup overflow menu after adding button
                this.setupOverflowMenu();
            }
            // Show button
            if (this.controls.audioDescription) {
                this.controls.audioDescription.style.display = '';
            }
        } else {
            // Hide button if no audio description available
            if (this.controls.audioDescription) {
                this.controls.audioDescription.style.display = 'none';
            }
        }
        
        // Handle Sign Language buttons (PiP overlay and/or main view based on displayMode)
        const showSignLanguage = hasSignLanguage && this.player.options.signLanguageButton !== false;
        const classPrefix = this.player.options.classPrefix;
        const displayMode = this.player.options.signLanguageDisplayMode || 'both';
        const showPip = ['pip', 'both'].includes(displayMode);
        const showMain = ['main', 'both'].includes(displayMode);
        
        if (showSignLanguage) {
            // Find insertion point once for both buttons
            const qualityBtn = this.rightButtons.querySelector(`.${classPrefix}-quality`);
            const fullscreenBtn = this.rightButtons.querySelector(`.${classPrefix}-fullscreen`);
            const insertBeforeRef = qualityBtn || fullscreenBtn || null;
            let needsOverflowSetup = false;
            
            // Create PiP button if needed and doesn't exist
            if (showPip && !this.controls.signLanguage) {
                const btn = this.createSignLanguageButton();
                btn.dataset.overflowPriority = '3';
                btn.dataset.overflowPriorityMobile = '3';
                if (insertBeforeRef) {
                    this.rightButtons.insertBefore(btn, insertBeforeRef);
                } else {
                    this.rightButtons.appendChild(btn);
                }
                needsOverflowSetup = true;
            }
            
            // Create main view button if needed and doesn't exist
            if (showMain && !this.controls.signLanguageMainView) {
                const btn = this.createSignLanguageInMainViewButton();
                btn.dataset.overflowPriority = '3';
                btn.dataset.overflowPriorityMobile = '3';
                // Insert after PiP button or at the reference point
                const afterPip = this.controls.signLanguage?.nextSibling;
                if (afterPip) {
                    this.rightButtons.insertBefore(btn, afterPip);
                } else if (insertBeforeRef) {
                    this.rightButtons.insertBefore(btn, insertBeforeRef);
                } else {
                    this.rightButtons.appendChild(btn);
                }
                needsOverflowSetup = true;
            }
            
            if (needsOverflowSetup) {
                this.setupOverflowMenu();
            }
            
            // Show/hide buttons based on displayMode
            if (this.controls.signLanguage) {
                this.controls.signLanguage.style.display = showPip ? '' : 'none';
            }
            if (this.controls.signLanguageMainView) {
                this.controls.signLanguageMainView.style.display = showMain ? '' : 'none';
            }
        } else {
            // Hide both buttons if no sign language available
            if (this.controls.signLanguage) this.controls.signLanguage.style.display = 'none';
            if (this.controls.signLanguageMainView) this.controls.signLanguageMainView.style.display = 'none';
        }
    }

    createSettingsButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-settings`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.settings')
            }
        });

        button.appendChild(createIconElement('settings'));

        button.addEventListener('click', () => {
            this.player.showSettings();
        });

        return button;
    }

    createPipButton() {
        const floating = this.player.options.floating === true;
        const labelKey = floating ? 'player.floatingPlayer' : 'player.pip';
        const prefix = this.player.options.classPrefix;
        // When floating is enabled, add an extra marker class so the CSS
        // media query can hide the button below the feature's minimum
        // viewport width without affecting the native-PiP variant.
        const className = floating
            ? `${prefix}-button ${prefix}-pip ${prefix}-pip-floating`
            : `${prefix}-button ${prefix}-pip`;
        const button = DOMUtils.createElement('button', {
            className,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t(labelKey),
                'aria-pressed': 'false'
            }
        }) as HTMLButtonElement;

        button.appendChild(createIconElement('pip'));

        button.addEventListener('click', () => {
            if (floating) {
                if (this.player.floatingPlayerManager) {
                    this.player.floatingPlayerManager.togglePinned(button);
                }
            } else {
                this.player.togglePiP();
            }
        });

        if (floating) {
            // Keep aria-pressed in sync with the floating state so screen
            // readers announce the toggled state correctly.
            this.player.on('floatingchange', (state: any) => {
                button.setAttribute('aria-pressed', state === 'pinned' ? 'true' : 'false');
                button.classList.toggle(`${this.player.options.classPrefix}-pip-active`, !!state);
            });
        }

        return button;
    }

    createDownloadButton(downloadUrl: string) {
        const dataset = this.player.element?.dataset || ({} as DOMStringMap);

        const format = this.resolveDownloadFormat(downloadUrl);
        const initialSize = this.resolveInitialDownloadSize();

        const baseLabel = i18n.t('player.download');
        const initialLabel = buildDownloadLabel({
            baseLabel,
            format,
            sizeBytes: initialSize,
            locale: i18n.getLanguage(),
            withFormatSizeTemplate: i18n.t('player.downloadWithFormatSize'),
            withFormatTemplate: i18n.t('player.downloadWithFormat'),
            withSizeTemplate: i18n.t('player.downloadWithSize')
        });

        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-download`,
            attributes: {
                'type': 'button',
                'aria-label': initialLabel
            }
        }) as HTMLButtonElement;

        if (format) button.dataset.vidplyDownloadFormat = format;
        if (initialSize != null) button.dataset.vidplyDownloadSize = String(initialSize);

        button.appendChild(createIconElement('download'));

        button.addEventListener('click', () => {
            const url = this.player.options.downloadUrl
                || dataset.vidplyDownloadUrl
                || downloadUrl;
            if (!url) return;

            const a = document.createElement('a');
            a.href = url;
            a.download = url.split('/').pop()?.split('?')[0] || 'download';
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        // If size wasn't provided, try a HEAD request and update the label/tooltip when it resolves.
        const shouldFetchSize = this.player.options.downloadFetchSize !== false && initialSize == null;
        if (shouldFetchSize) {
            fetchContentLength(downloadUrl).then(sizeBytes => {
                if (sizeBytes == null) return;
                const newLabel = buildDownloadLabel({
                    baseLabel,
                    format,
                    sizeBytes,
                    locale: i18n.getLanguage(),
                    withFormatSizeTemplate: i18n.t('player.downloadWithFormatSize'),
                    withFormatTemplate: i18n.t('player.downloadWithFormat'),
                    withSizeTemplate: i18n.t('player.downloadWithSize')
                });
                button.dataset.vidplyDownloadSize = String(sizeBytes);
                this.updateDownloadButtonLabel(button, newLabel);
            });
        }

        return button;
    }

    /**
     * Resolve the human-readable file format (e.g. "MP4") for the download
     * button from options, data attributes, the matching <source type>, or
     * the URL extension. Returns null when nothing can be determined.
     */
    resolveDownloadFormat(downloadUrl: string): string | null {
        const dataset = this.player.element?.dataset || ({} as DOMStringMap);

        const explicit = this.player.options.downloadFormat
            || dataset.vidplyDownloadFormat
            || null;
        if (explicit) return explicit;

        const sourceEls = this.player.element?.querySelectorAll
            ? Array.from(this.player.element.querySelectorAll('source')) as HTMLSourceElement[]
            : [];
        const matching = sourceEls.find(s => (s.getAttribute('src') || s.src || '') === downloadUrl);
        const candidate = matching || sourceEls[0];
        if (candidate) {
            const fromMime = inferFormatFromMime(candidate.getAttribute('type'));
            if (fromMime) return fromMime;
        }

        return inferFormatFromUrl(downloadUrl);
    }

    /**
     * Resolve a known file size from options or data attributes (in bytes).
     * Returns null if no value was provided and a HEAD request should run.
     */
    resolveInitialDownloadSize(): number | null {
        const dataset = this.player.element?.dataset || ({} as DOMStringMap);
        const optionSize = this.player.options.downloadFileSize;
        if (typeof optionSize === 'number' && Number.isFinite(optionSize) && optionSize > 0) {
            return optionSize;
        }
        const datasetSize = dataset.vidplyDownloadSize;
        if (datasetSize) {
            const n = Number(datasetSize);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return null;
    }

    /**
     * Update both aria-label and the visible tooltip text for the download button.
     */
    updateDownloadButtonLabel(button: HTMLButtonElement, label: string): void {
        if (!button || !label) return;
        button.setAttribute('aria-label', label);
        const tooltip = button.querySelector(`.${this.player.options.classPrefix}-tooltip`);
        if (tooltip) {
            tooltip.textContent = label;
        }
    }

    createFullscreenButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-fullscreen`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.fullscreen')
            }
        });

        button.appendChild(createIconElement('fullscreen'));

        button.addEventListener('click', () => {
            this.player.toggleFullscreen();
        });

        this.controls.fullscreen = button;
        return button;
    }

    attachEvents() {
        // Update controls based on player state
        this.player.on('play', () => this.updatePlayPauseButton());
        this.player.on('pause', () => this.updatePlayPauseButton());
        this.player.on('timeupdate', () => this.updateProgress());
        this.player.on('loadedmetadata', () => {
            this.updateDuration();
            this.ensureQualityButton();
            this.updateQualityIndicator();
            // Update preview video source when metadata loads (for playlists)
            this.updatePreviewVideoSource();
        });
        this.player.on('durationchange', () => {
            this.updateDuration();
        });
        this.player.on('sourcechange', () => {
            // Update preview video source when source changes (for playlists)
            this.updatePreviewVideoSource();
        });
        this.player.on('volumechange', () => this.updateVolumeDisplay());
        this.player.on('progress', () => this.updateBuffered());
        this.player.on('playbackspeedchange', () => this.updateSpeedDisplay());
        this.player.on('fullscreenchange', () => this.updateFullscreenButton());
        this.player.on('captionsenabled', () => this.updateCaptionsButton());
        this.player.on('captionsdisabled', () => this.updateCaptionsButton());
        this.player.on('audiodescriptionenabled', () => this.updateAudioDescriptionButton());
        this.player.on('audiodescriptiondisabled', () => this.updateAudioDescriptionButton());
        this.player.on('signlanguageenabled', () => this.updateSignLanguageButton());
        this.player.on('signlanguagedisabled', () => this.updateSignLanguageButton());
        this.player.on('signlanguageinmainviewenabled', () => this.updateSignLanguageInMainViewButton());
        this.player.on('signlanguageinmainviewdisabled', () => this.updateSignLanguageInMainViewButton());
        this.player.on('qualitychange', () => this.updateQualityIndicator());
        this.player.on('hlslevelswitched', () => this.updateQualityIndicator());
        this.player.on('hlsmanifestparsed', () => {
            this.ensureQualityButton();
            this.updateQualityIndicator();
        });
        this.player.on('dashqualitychanged', () => this.updateQualityIndicator());
        this.player.on('dashmanifestparsed', () => {
            this.ensureQualityButton();
            this.updateQualityIndicator();
        });
    }

    updatePlayPauseButton() {
        if (!this.controls.playPause) return;

        const icon = this.controls.playPause.querySelector('.vidply-icon');
        const isPlaying = this.player.state.playing;

        icon.innerHTML = isPlaying ?
            createIconElement('pause').innerHTML :
            createIconElement('play').innerHTML;

        const newAriaLabel = isPlaying ? i18n.t('player.pause') : i18n.t('player.play');
        this.controls.playPause.setAttribute('aria-label', newAriaLabel);
        // Update tooltip to match aria-label
        DOMUtils.attachTooltip(this.controls.playPause, newAriaLabel, this.player.options.classPrefix);
    }

    updateProgress() {
        if (!this.controls.played) return;

        const currentTime = this.player.state.currentTime || 0;
        const duration = this.player.state.duration || 0;
        
        // Guard against division by zero and ensure valid percentage
        const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
        
        this.controls.played.style.width = `${percent}%`;
        this.controls.progress.setAttribute('aria-valuenow', String(Math.round(percent)));
        
        // Set aria-valuetext to announce both percentage and time for screen readers
        const currentTimeText = TimeUtils.formatDuration(this.player.state.currentTime);
        const durationText = TimeUtils.formatDuration(this.player.state.duration);
        this.controls.progress.setAttribute('aria-valuetext', 
            `${Math.round(percent)}%, ${currentTimeText} ${i18n.t('time.of')} ${durationText}`);

        if (this.controls.currentTimeVisual) {
            const currentTime = this.player.state.currentTime;
            // Update visual text (hidden from screen readers)
            this.controls.currentTimeVisual.textContent = TimeUtils.formatTime(currentTime);
            if (this.controls.currentTimeAccessible) {
                this.controls.currentTimeAccessible.textContent = TimeUtils.formatDuration(currentTime);
            }
        }
    }

    updateDuration() {
        if (this.controls.durationVisual) {
            const duration = this.player.state.duration;
            // Update visual text (hidden from screen readers)
            this.controls.durationVisual.textContent = TimeUtils.formatTime(duration);
            if (this.controls.durationAccessible) {
                this.controls.durationAccessible.textContent = i18n.t('time.durationPrefix') + TimeUtils.formatDuration(duration);
            }
        }
    }

    updateVolumeDisplay() {
        const percent = this.player.state.volume * 100;

        // Update volume fill bar if it exists
        if (this.controls.volumeFill) {
            this.controls.volumeFill.style.height = `${percent}%`;
        }
        
        // Update volume slider aria-valuenow if it exists
        if (this.controls.volumeSlider) {
            this.controls.volumeSlider.setAttribute('aria-valuenow', String(Math.round(percent)));
        }

        // Update mute button icon (should always work even if slider not shown)
        if (this.controls.mute) {
            const icon = this.controls.mute.querySelector('.vidply-icon');
            if (icon) {
                let iconName;

                if (this.player.state.muted || this.player.state.volume === 0) {
                    iconName = 'volumeMuted';
                } else if (this.player.state.volume < 0.3) {
                    iconName = 'volumeLow';
                } else if (this.player.state.volume < 0.7) {
                    iconName = 'volumeMedium';
                } else {
                    iconName = 'volumeHigh';
                }

                icon.innerHTML = createIconElement(iconName).innerHTML;

                const newMuteAriaLabel =
                    this.player.state.muted ? i18n.t('player.unmute') : i18n.t('player.mute');
                this.controls.mute.setAttribute('aria-label', newMuteAriaLabel);
                // Update tooltip to match aria-label
                DOMUtils.attachTooltip(this.controls.mute, newMuteAriaLabel, this.player.options.classPrefix);
            }
        }

        // Update volume slider attribute if it exists
        if (this.controls.volumeSlider) {
            this.controls.volumeSlider.setAttribute('aria-valuenow', String(Math.round(percent)));
        }
    }

    updateBuffered() {
        if (!this.controls.buffered || !this.player.element.buffered || this.player.element.buffered.length === 0) return;

        const buffered = this.player.element.buffered.end(this.player.element.buffered.length - 1);
        const percent = (buffered / this.player.state.duration) * 100;
        this.controls.buffered.style.width = `${percent}%`;
    }

    updateSpeedDisplay() {
        if (this.controls.speedText) {
            this.controls.speedText.textContent = `${this.player.state.playbackSpeed}x`;
        }
    }

    updateFullscreenButton() {
        if (!this.controls.fullscreen) return;

        const icon = this.controls.fullscreen.querySelector('.vidply-icon');
        const isFullscreen = this.player.state.fullscreen;

        icon.innerHTML = isFullscreen ?
            createIconElement('fullscreenExit').innerHTML :
            createIconElement('fullscreen').innerHTML;

        this.controls.fullscreen.setAttribute('aria-label',
            isFullscreen ? i18n.t('player.exitFullscreen') : i18n.t('player.fullscreen')
        );
    }

    /**
     * Ensure quality button exists if qualities are available
     * This is called after renderer initialization to dynamically add the button
     */
    ensureQualityButton() {
        // Skip if quality button is disabled
        if (!this.player.options.qualityButton) return;
        
        // Skip if button already exists
        if (this.controls.quality) return;
        
        // Check if qualities are now available
        if (!this.hasQualityLevels()) return;
        
        // Create and insert the quality button before the speed button
        const qualityButton = this.createQualityButton();
        
        // Find the speed button or caption style button to insert before
        const speedButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-speed`);
        const captionStyleButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-caption-style`);
        const insertBefore = captionStyleButton || speedButton;
        
        if (insertBefore) {
            this.rightButtons.insertBefore(qualityButton, insertBefore);
        } else {
            // If no reference button, add it at the beginning of right buttons
            this.rightButtons.insertBefore(qualityButton, this.rightButtons.firstChild);
        }
        
        this.player.log('Quality button added dynamically', 'info');
    }

    /**
     * Dynamically add captions button if HLS subtitle tracks become available
     * Button order: Chapters, Captions, Caption Style, Speed, AD, Transcript, Playlist, Sign, Quality, PiP, Fullscreen
     */
    ensureCaptionsButton() {
        // Skip if captions button is disabled
        if (!this.player.options.captionsButton) return;
        
        // Skip if button already exists
        if (this.controls.captions) return;
        
        // Create the captions button
        const btn = this.createCaptionsButton();
        btn.dataset.overflowPriority = '1';
        btn.dataset.overflowPriorityMobile = '3';
        
        // Insert after chapters button, or at the start
        const chaptersButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-chapters`);
        if (chaptersButton && chaptersButton.nextSibling) {
            this.rightButtons.insertBefore(btn, chaptersButton.nextSibling);
        } else if (chaptersButton) {
            chaptersButton.after(btn);
        } else {
            this.rightButtons.insertBefore(btn, this.rightButtons.firstChild);
        }
        
        this.player.log('Captions button added dynamically for HLS subtitles', 'info');
    }

    /**
     * Dynamically add caption style button if HLS subtitle tracks become available
     */
    ensureCaptionStyleButton() {
        // Skip if caption style button is disabled
        if (!this.player.options.captionStyleButton) return;
        
        // Skip if button already exists
        if (this.controls.captionStyle) return;
        
        // Create the caption style button
        const btn = this.createCaptionStyleButton();
        btn.dataset.overflowPriority = '3';
        btn.dataset.overflowPriorityMobile = '3';
        
        // Insert after captions button
        const captionsButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-captions-button`);
        if (captionsButton) {
            captionsButton.after(btn);
        } else {
            // Insert at start if no captions button
            this.rightButtons.insertBefore(btn, this.rightButtons.firstChild);
        }
        
        this.player.log('Caption style button added dynamically for HLS subtitles', 'info');
    }

    /**
     * Dynamically add transcript button if HLS subtitle tracks become available
     */
    ensureTranscriptButton() {
        // Skip if transcript button is disabled
        if (!this.player.options.transcriptButton) return;
        
        // Skip if button already exists
        if (this.controls.transcript) return;
        
        // Create the transcript button
        const btn = this.createTranscriptButton();
        btn.dataset.overflowPriority = '3';
        btn.dataset.overflowPriorityMobile = '3';
        
        // Insert after AD button, or after speed button
        const adButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-audio-description`);
        const speedButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-speed`);
        const captionStyleButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-caption-style`);
        
        if (adButton) {
            adButton.after(btn);
        } else if (speedButton) {
            speedButton.after(btn);
        } else if (captionStyleButton) {
            captionStyleButton.after(btn);
        } else {
            // Insert before quality/pip/fullscreen buttons
            const qualityButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-quality`);
            const pipButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-pip`);
            const fullscreenButton = this.rightButtons.querySelector(`.${this.player.options.classPrefix}-fullscreen`);
            const insertBefore = qualityButton || pipButton || fullscreenButton;
            
            if (insertBefore) {
                this.rightButtons.insertBefore(btn, insertBefore);
            } else {
                this.rightButtons.appendChild(btn);
            }
        }
        
        this.player.log('Transcript button added dynamically for HLS subtitles', 'info');
    }

    /**
     * Remove caption-related buttons if no HLS subtitle tracks are available
     * and no native caption tracks exist. Called when switching to a stream
     * without subtitles.
     * @param {boolean} force - If true, skip the native captions check and force removal
     */
    removeHlsCaptionButtons(force = false) {
        if (!force) {
            // Check if there are native caption tracks (from <track> elements in the HTML)
            // Note: For HLS streams, we pass force=true because HLS manages its own text tracks
            const trackElements = this.player.element.querySelectorAll('track[kind="captions"], track[kind="subtitles"]');
            if (trackElements.length > 0) {
                this.player.log('Keeping caption buttons - native track elements exist', 'info');
                return;
            }
        }
        
        // Disable all text tracks and clear captions display
        this.disableAllCaptions();
        
        // Remove captions button if it exists
        if (this.controls.captions) {
            this.controls.captions.remove();
            this.controls.captions = null;
            this.player.log('Captions button removed - no subtitle tracks', 'info');
        }
        
        // Remove caption style button if it exists
        if (this.controls.captionStyle) {
            this.controls.captionStyle.remove();
            this.controls.captionStyle = null;
            this.player.log('Caption style button removed - no subtitle tracks', 'info');
        }
        
        // Remove transcript button if it exists
        if (this.controls.transcript) {
            this.controls.transcript.remove();
            this.controls.transcript = null;
            this.player.log('Transcript button removed - no subtitle tracks', 'info');
        }
    }

    /**
     * Disable all caption/subtitle tracks and clear the captions display
     */
    disableAllCaptions() {
        // Disable all text tracks
        const textTracks = this.player.element.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
            textTracks[i].mode = 'disabled';
        }
        
        // Clear caption display
        if ((this.player as any).captionsManager) {
            (this.player as any).captionsManager.hide();
        }
        
        // Clear the captions container if it exists
        const captionsContainer = this.player.container?.querySelector(`.${this.player.options.classPrefix}-captions`);
        if (captionsContainer) {
            captionsContainer.textContent = '';
            (captionsContainer as HTMLElement).style.display = 'none';
        }
        
        // Update player state
        this.player.state.captionsEnabled = false;
        
        this.player.log('All captions disabled and cleared', 'info');
    }

    updateQualityIndicator() {
        if (!this.controls.qualityText) return;
        if (!this.player.renderer || !this.player.renderer.getQualities) return;

        const qualities = this.player.renderer.getQualities();
        if (qualities.length === 0) {
            this.controls.qualityText.textContent = '';
            return;
        }

        // Get current quality
        let currentQualityText = '';
        
        // Check if renderer is in auto quality mode (HLS, DASH, etc.)
        if (typeof this.player.renderer.isAutoQuality === 'function' && this.player.renderer.isAutoQuality()) {
            currentQualityText = 'Auto';
        } else if (this.player.renderer.getCurrentQuality) {
            const currentIndex = this.player.renderer.getCurrentQuality();
            const currentQuality = qualities.find((q: any) => q.index === currentIndex);
            if (currentQuality) {
                currentQualityText = currentQuality.height ? `${currentQuality.height}p` : '';
            }
        }

        this.controls.qualityText.textContent = currentQualityText;
    }

    setupAutoHide() {
        if (this.player.element.tagName !== 'VIDEO') return;

        const showControls = () => {
            this.element.classList.add(`${this.player.options.classPrefix}-controls-visible`);
            this.player.container.classList.add(`${this.player.options.classPrefix}-controls-visible`);
            this.player.state.controlsVisible = true;

            clearTimeout(this.hideTimeout);

            if (this.player.state.playing) {
                // Use longer delay in fullscreen mode for better mobile UX
                const delay = this.player.state.fullscreen 
                    ? this.player.options.hideControlsDelay * 1.5 
                    : this.player.options.hideControlsDelay;
                    
                this.hideTimeout = setTimeout(() => {
                    this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                    this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                    this.player.state.controlsVisible = false;
                }, delay);
            }
        };

        // Mouse and touch events to show controls
        this.player.container.addEventListener('mousemove', showControls);
        this.player.container.addEventListener('touchstart', showControls);
        this.player.container.addEventListener('touchmove', showControls); // Also show on touch drag/swipe
        this.player.container.addEventListener('click', showControls);
        this.player.container.addEventListener('tap', showControls); // Some mobile browsers use tap event

        // Show controls on focus
        this.element.addEventListener('focusin', showControls);

        // Always show when paused
        this.player.on('pause', () => {
            showControls();
            clearTimeout(this.hideTimeout);
        });

        this.player.on('play', () => {
            showControls();
        });

        // Show controls when entering fullscreen (especially important for mobile landscape)
        this.player.on('enterfullscreen', () => {
            showControls();
            // In fullscreen, keep controls visible longer initially
            if (this.player.state.fullscreen) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = setTimeout(() => {
                    if (this.player.state.playing) {
                        this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                        this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                        this.player.state.controlsVisible = false;
                    }
                }, this.player.options.hideControlsDelay * 2); // Double the delay in fullscreen
            }
        });

        // Initial state
        showControls();
    }

    createOverflowMenuButton() {
        const ariaLabel = i18n.t('player.moreOptions');
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-overflow-menu`,
            attributes: {
                'type': 'button',
                'aria-label': ariaLabel,
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('moreVertical'));
        DOMUtils.attachTooltip(button, ariaLabel, this.player.options.classPrefix);

        button.addEventListener('click', () => {
            this.showOverflowMenu(button);
        });

        this.controls.overflowMenu = button;
        return button;
    }

    showOverflowMenu(button: HTMLElement) {
        // Remove existing menu if any (toggle behavior)
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-overflow-menu-list`);
        if (existingMenu) {
            existingMenu.remove();
            button.setAttribute('aria-expanded', 'false');
            if (this.openMenu === existingMenu) {
                this.openMenu = null;
                this.openMenuButton = null;
            }
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-overflow-menu-list ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': i18n.t('player.moreOptions')
            }
        });

        // Get all overflow buttons (those currently hidden)
        const overflowButtons: HTMLElement[] = Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'));

        if (overflowButtons.length === 0) {
            // No overflow items
            const noItemsText = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noMoreOptions'),
                attributes: {
                    'role': 'menuitem'
                },
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noItemsText);
        } else {
            // Create menu items for each overflow button
            overflowButtons.forEach((btn: HTMLElement) => {
                const item = DOMUtils.createElement('button', {
                    className: `${this.player.options.classPrefix}-menu-item`,
                    attributes: {
                        'type': 'button',
                        'role': 'menuitem',
                        'tabindex': '-1'
                    }
                });

                // Get button label
                const label = btn.getAttribute('aria-label') || btn.getAttribute('title') || '';
                
                // Copy icon if present (SVG icon or text icon like "Aa")
                const icon = btn.querySelector('.vidply-icon');
                if (icon) {
                    const iconClone = icon.cloneNode(true);
                    item.appendChild(iconClone);
                } else {
                    // Check for text icon (like caption styling "Aa")
                    const firstChild = btn.querySelector('span');
                    if (firstChild && firstChild.textContent && firstChild.textContent.length <= 3) {
                        const iconClone = firstChild.cloneNode(true) as HTMLElement;
                        iconClone.classList.add('vidply-icon');
                        item.appendChild(iconClone);
                    }
                }
                
                const labelSpan = DOMUtils.createElement('span', {
                    textContent: label
                });
                item.appendChild(labelSpan);

                // When clicked, trigger the original button's click
                item.addEventListener('click', (e) => {
                    // Store the overflow menu item as the positioning reference
                    // This allows submenus to position relative to the visible menu item
                    this._overflowMenuItemRef = item;
                    
                    // Temporarily make the original button visible for positioning
                    const originalDisplay = btn.style.display;
                    btn.style.display = '';
                    btn.style.visibility = 'hidden'; // Keep it invisible but in layout
                    
                    // Trigger the button's menu
                    btn.click();
                    
                    // Restore original state after menu is positioned
                    setTimeout(() => {
                        btn.style.display = originalDisplay;
                        btn.style.visibility = '';
                        this._overflowMenuItemRef = null;
                    }, 100);
                    
                    // Close overflow menu
                    this.closeMenuAndReturnFocus(menu, button);
                });

                menu.appendChild(item);
            });

            // Add keyboard navigation
            this.attachMenuKeyboardNavigation(menu, button);

            // Focus first item
            setTimeout(() => {
                const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`) as HTMLElement | null;
                if (firstItem && firstItem.tagName === 'BUTTON') {
                    firstItem.focus({ preventScroll: true });
                }
            }, 0);
        }

        // Position menu first (before it's visible) to prevent jumping
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu into DOM (handles fullscreen positioning)
        this.insertMenuIntoDOM(menu, button);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(menu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            menu.style.visibility = 'visible';
        });

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    setupOverflowDetection() {
        // Check for overflow after layout is stable
        const checkOverflow = () => {
            // Check screen size and orientation
            const isDesktop = window.innerWidth >= 768;
            const isLandscape = window.innerHeight < window.innerWidth;
            const isFullscreen = this.player.state.fullscreen;
            const isLandscapeFullscreen = isLandscape && isFullscreen;
            
            if (!this.rightButtons || this.rightButtons.children.length === 0) {
                // Hide overflow button if no buttons exist
                if (this.overflowMenuButton) {
                    this.overflowMenuButton.style.display = 'none';
                }
                return;
            }

            // Get all buttons (except the overflow menu button itself and
            // buttons that opt out via data-skip-overflow="true", e.g. the
            // floating-player PiP button which has its own viewport media
            // query and must never appear in the overflow menu list).
            const allButtons = (Array.from(this.rightButtons.children) as HTMLElement[]).filter(
                btn => !btn.classList.contains(`${this.player.options.classPrefix}-overflow-menu`)
                    && btn.dataset.skipOverflow !== 'true'
            );

            if (allButtons.length === 0) {
                // Hide overflow button if no buttons exist
                if (this.overflowMenuButton) {
                    this.overflowMenuButton.style.display = 'none';
                }
                return;
            }

            // Determine if we should use overflow menu
            // Only use overflow on mobile portrait (width < 768px and not in landscape)
            // In landscape mode, always show all buttons (even on mobile) to ensure fullscreen button is accessible
            const shouldUseOverflow = !isDesktop && !isLandscape;
            
            if (this.player.options.debug) {
                console.log('Overflow detection:', {
                    isDesktop,
                    isFullscreen,
                    isLandscape,
                    isLandscapeFullscreen,
                    shouldUseOverflow,
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }

            // If we shouldn't use overflow menu, show all buttons and hide overflow button
            if (!shouldUseOverflow) {
                allButtons.forEach(btn => {
                    btn.dataset.inOverflow = 'false';
                    btn.style.display = '';
                });
                // Always hide overflow menu button
                if (this.overflowMenuButton) {
                    this.overflowMenuButton.style.display = 'none';
                }
                if (this.player.options.debug) {
                    console.log('No overflow menu needed - all buttons visible, overflow button hidden');
                }
                return;
            }
            
            // Continue with overflow detection for mobile portrait only
            if (this.player.options.debug) {
                console.log('Mobile portrait - checking for overflow...');
            }

            // First, make all buttons visible to measure their actual widths
            allButtons.forEach(btn => {
                btn.style.display = '';
            });

            // Get available width
            const containerWidth = this.rightButtons.offsetWidth;
            const overflowButtonWidth = 50; // Reserve space for overflow button + gap
            const availableWidth = containerWidth - overflowButtonWidth;

            // Calculate total width needed for all buttons including gaps
            let totalWidth = 0;
            const buttonWidths = allButtons.map(btn => {
                const style = getComputedStyle(btn);
                const width = btn.offsetWidth + 
                             parseInt(style.marginLeft || '0') + 
                             parseInt(style.marginRight || '0');
                totalWidth += width;
                return {btn, width};
            });

            // Add gap widths (8px per gap between buttons)
            const gapWidth = 8;
            totalWidth += (allButtons.length - 1) * gapWidth;

            // Check if overflow is needed
            const isSmallScreen = window.innerWidth < 768;
            const needsOverflow = totalWidth > availableWidth || isSmallScreen || (isLandscapeFullscreen && !isDesktop); // Always overflow on mobile and mobile landscape fullscreen

            // Debug logging
            if (this.player.options.debug) {
                console.log('Overflow detection:', {
                    containerWidth,
                    availableWidth,
                    totalWidth,
                    needsOverflow,
                    isSmallScreen,
                    reason: isSmallScreen ? 'mobile screen' : (totalWidth > availableWidth ? 'not enough space' : 'enough space'),
                    buttonCount: allButtons.length
                });
            }

            if (needsOverflow) {
                // Use responsive priorities based on screen size
                const isSmallScreen = window.innerWidth < 768;
                const priorityAttr = isSmallScreen ? 'overflowPriorityMobile' : 'overflowPriority';
                
                if (this.player.options.debug) {
                    console.log(`Using ${isSmallScreen ? 'mobile' : 'desktop'} priorities (width: ${window.innerWidth}px)`);
                }
                
                // Sort buttons by priority (highest priority last)
                const sortedButtons = buttonWidths.sort((a, b) => {
                    const priorityA = parseInt(a.btn.dataset[priorityAttr] || a.btn.dataset.overflowPriority || '1');
                    const priorityB = parseInt(b.btn.dataset[priorityAttr] || b.btn.dataset.overflowPriority || '1');
                    return priorityB - priorityA; // Higher priority = lower number = later in array
                });

                // Hide buttons starting with lowest priority until fits
                let currentWidth = totalWidth;
                let movedToOverflow = 0;

                for (const {btn, width} of sortedButtons) {
                    const priority = parseInt(btn.dataset[priorityAttr] || btn.dataset.overflowPriority || '1');
                    const buttonLabel = btn.getAttribute('aria-label') || 'unknown';
                    
                    // Never hide priority 1 buttons
                    if (priority === 1) {
                        btn.dataset.inOverflow = 'false';
                        btn.style.display = '';
                        continue;
                    }

                    // On mobile, hide all non-priority-1 buttons (priority 2 and 3)
                    // On desktop, only hide if not enough space
                    const shouldHide = isSmallScreen ? (priority > 1) : (currentWidth > availableWidth);

                    if (shouldHide) {
                        // Move to overflow
                        btn.dataset.inOverflow = 'true';
                        btn.style.display = 'none';
                        currentWidth -= width;
                        movedToOverflow++;
                        if (this.player.options.debug) {
                            console.log(`  → Hiding button: ${buttonLabel} (priority ${priority}, ${isSmallScreen ? 'mobile' : 'desktop'})`);
                        }
                    } else {
                        // Keep visible
                        btn.dataset.inOverflow = 'false';
                        btn.style.display = '';
                    }
                }

                // Show overflow menu button if we moved any buttons
                if (this.player.options.debug) {
                    console.log('Overflow button exists?', !!this.overflowMenuButton);
                }
                
                if (!this.overflowMenuButton) {
                    console.error('Overflow menu button not found!');
                    return;
                }
                
                if (movedToOverflow > 0) {
                    this.overflowMenuButton.style.display = '';
                    if (this.player.options.debug) {
                        console.log('Showing overflow menu button -', movedToOverflow, 'buttons moved');
                    }
                } else {
                    this.overflowMenuButton.style.display = 'none';
                    if (this.player.options.debug) {
                        console.log('Hiding overflow menu button - all buttons fit');
                    }
                }
            } else {
                // No overflow needed - show all buttons
                allButtons.forEach(btn => {
                    btn.dataset.inOverflow = 'false';
                    btn.style.display = '';
                });
                this.overflowMenuButton.style.display = 'none';
            }
        };

        // Check on resize
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(checkOverflow);
        });
        resizeObserver.observe(this.rightButtons);

        // Check on window resize
        window.addEventListener('resize', () => {
            requestAnimationFrame(checkOverflow);
        });

        // Check on fullscreen changes (important for desktop/tablet fullscreen)
        this.player.on('fullscreenchange', () => {
            // Use setTimeout to ensure fullscreen state is fully updated
            setTimeout(() => {
                requestAnimationFrame(checkOverflow);
            }, 50);
        });

        // Initial checks at multiple intervals to ensure layout is stable
        // Some browsers need more time for font loading, CSS rendering, etc.
        requestAnimationFrame(() => {
            checkOverflow();
            setTimeout(() => checkOverflow(), 100);
            setTimeout(() => checkOverflow(), 300);
            setTimeout(() => checkOverflow(), 500);
        });

        // Also check when fonts are loaded
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                requestAnimationFrame(checkOverflow);
            });
        }

        // Store for cleanup
        this.overflowResizeObserver = resizeObserver;
    }

    show() {
        this.element.style.display = '';
    }

    hide() {
        this.element.style.display = 'none';
    }

    /**
     * Update preview video source when player source changes (for playlists)
     * Also re-initializes if preview wasn't set up initially
     */
    updatePreviewVideoSource() {
        const renderer = this.player.renderer;
        if (!renderer || !renderer.media || renderer.media.tagName !== 'VIDEO') {
            return;
        }

        // If preview wasn't initialized yet, try to initialize it now
        if (!this.previewSupported && !this.previewVideo) {
            this.initPreviewThumbnail();
        }

        if (!this.previewSupported || !this.previewVideo) {
            return;
        }

        const mainVideo = renderer.media;
        const newSrc = mainVideo.src || mainVideo.querySelector('source')?.src;
        
        if (newSrc && this.previewVideo.src !== newSrc) {
            // Clear cache when source changes
            this.previewThumbnailCache.clear();
            this.previewVideoReady = false;
            this.previewVideo.src = newSrc;
            
            // Copy crossOrigin if set
            if (mainVideo.crossOrigin) {
                this.previewVideo.crossOrigin = mainVideo.crossOrigin;
            }
            
            // Wait for new source to load
            this.previewVideo.addEventListener('loadedmetadata', () => {
                this.previewVideoReady = true;
            }, { once: true });
        } else if (newSrc && !this.previewVideoReady && this.previewVideo.readyState >= 1) {
            // If source is the same but video is ready, mark as ready
            this.previewVideoReady = true;
        }
    }

    /**
     * Cleanup preview thumbnail resources
     */
    cleanupPreviewThumbnail() {
        if (this.previewThumbnailTimeout) {
            clearTimeout(this.previewThumbnailTimeout);
            this.previewThumbnailTimeout = null;
        }
        
        if (this.previewVideo && this.previewVideo.parentNode) {
            this.previewVideo.parentNode.removeChild(this.previewVideo);
            this.previewVideo = null;
        }
        
        this.previewThumbnailCache.clear();
    }

    destroy() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        if (this.overflowResizeObserver) {
            this.overflowResizeObserver.disconnect();
        }

        // Cleanup preview thumbnail resources
        this.cleanupPreviewThumbnail();

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

