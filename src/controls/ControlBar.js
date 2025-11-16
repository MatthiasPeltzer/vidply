/**
 * Control Bar Component
 */

import {DOMUtils} from '../utils/DOMUtils.js';
import {TimeUtils} from '../utils/TimeUtils.js';
import {createIconElement} from '../icons/Icons.js';
import {i18n} from '../i18n/i18n.js';
import {focusElement, focusFirstElement} from '../utils/FocusUtils.js';

export class ControlBar {
    constructor(player) {
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
        this.attachEvents();
        this.setupAutoHide();
        this.setupOverflowDetection();
    }

    // Helper method to check if we're on a mobile device
    isMobile() {
        return window.innerWidth < 768;
    }

    // Smart menu positioning to avoid overflow
    positionMenu(menu, button, immediate = false) {
        const isMobile = this.isMobile();
        const isOverflowMenu = menu.classList.contains(`${this.player.options.classPrefix}-overflow-menu-list`);
        
        if (isMobile) {
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
            let menuTop = buttonTop - menuRect.height - 8;
            let menuBottom = null;
            
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
            
            // Calculate horizontal position
            let menuLeft = 'auto';
            let menuRight = 'auto';
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


    // Helper method to attach close-on-outside-click behavior to menus
    attachMenuCloseHandler(menu, button, preventCloseOnInteraction = false) {
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
        button._vidplyMousedownHandler = handleButtonMousedown; // Store for cleanup
        
        const handleButtonBlur = (e) => {
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
                    const signLanguageWrapper = this.player.signLanguageWrapper;
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
                        delete button._vidplyBlurHandler;
                        delete button._vidplyMousedownHandler;
                    }
                }, 10); // Small delay to ensure focus has fully moved
            });
        };
        button.addEventListener('blur', handleButtonBlur);
        button._vidplyBlurHandler = handleButtonBlur; // Store for cleanup
        
        const closeMenuAndUpdateAria = () => {
            this.closeMenuAndReturnFocus(menu, button);
        };
        
        // Store document handlers for cleanup
        let documentClickHandler = null;
        let documentEscapeHandler = null;
        
        setTimeout(() => {
            documentClickHandler = (e) => {
                // If this menu has form controls, don't close when clicking inside
                if (preventCloseOnInteraction && menu.contains(e.target)) {
                    return;
                }

                // Check if click is outside menu and button
                // Also check if this menu is still the open menu
                if (this.openMenu === menu && !menu.contains(e.target) && !button.contains(e.target)) {
                    closeMenuAndUpdateAria();
                    if (documentClickHandler) {
                        document.removeEventListener('click', documentClickHandler);
                    }
                    if (documentEscapeHandler) {
                        document.removeEventListener('keydown', documentEscapeHandler);
                    }
                }
            };

            documentEscapeHandler = (e) => {
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
    closeMenuAndReturnFocus(menu, button, returnFocus = true) {
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
    attachMenuKeyboardNavigation(menu, button) {
        const menuItems = Array.from(menu.querySelectorAll(`.${this.player.options.classPrefix}-menu-item`));
        
        if (menuItems.length === 0) return;

        const handleKeyDown = (e) => {
            const currentIndex = menuItems.indexOf(document.activeElement);
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent volume/seek actions
                    const nextIndex = (currentIndex + 1) % menuItems.length;
                    menuItems[nextIndex].focus();
                    break;
                
                case 'ArrowUp':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent volume/seek actions
                    const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
                    menuItems[prevIndex].focus();
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
                    menuItems[0].focus();
                    break;
                
                case 'End':
                    e.preventDefault();
                    e.stopPropagation();
                    menuItems[menuItems.length - 1].focus();
                    break;
                
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event from reaching KeyboardManager
                    if (document.activeElement && menuItems.includes(document.activeElement)) {
                        document.activeElement.click();
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
            leftButtons.appendChild(this.createVolumeControl());
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

        // Priority 3: Chapters button (overflow on mobile)
        if (this.player.options.chaptersButton && hasChapters) {
            const btn = this.createChaptersButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 3: Caption styling button (overflow on mobile)
        if (this.player.options.captionStyleButton && hasCaptions) {
            const btn = this.createCaptionStyleButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 3: Transcript button (overflow on mobile)
        if (this.player.options.transcriptButton && hasCaptions) {
            const btn = this.createTranscriptButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 2 desktop, 3 mobile: Quality button (overflow on mobile)
        if (this.player.options.qualityButton && hasQualityLevels) {
            const btn = this.createQualityButton();
            btn.dataset.overflowPriority = '2';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 1 desktop, 3 mobile: Speed button (overflow on mobile)
        if (this.player.options.speedButton) {
            const btn = this.createSpeedButton();
            btn.dataset.overflowPriority = '1';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 1 desktop, 3 mobile: Captions button (overflow on mobile)
        if (this.player.options.captionsButton && hasCaptions) {
            const btn = this.createCaptionsButton();
            btn.dataset.overflowPriority = '1';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 2 desktop, 3 mobile: Audio Description button (overflow on mobile)
        if (this.player.options.audioDescriptionButton && hasAudioDescription) {
            const btn = this.createAudioDescriptionButton();
            btn.dataset.overflowPriority = '2';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 3: Sign Language button (overflow on mobile)
        const hasSignLanguage = this.hasSignLanguage();
        if (this.player.options.signLanguageButton && hasSignLanguage) {
            const btn = this.createSignLanguageButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 3: PiP button (overflow on mobile)
        if (this.player.options.pipButton && 'pictureInPictureEnabled' in document) {
            const btn = this.createPipButton();
            btn.dataset.overflowPriority = '3';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Priority 1 desktop, 3 mobile: Fullscreen button (overflow on mobile)
        // Don't show fullscreen button for audio players
        const isAudioPlayer = this.player.element.tagName.toLowerCase() === 'audio';
        if (this.player.options.fullscreenButton && !isAudioPlayer) {
            const btn = this.createFullscreenButton();
            btn.dataset.overflowPriority = '1';
            btn.dataset.overflowPriorityMobile = '3';
            this.rightButtons.appendChild(btn);
        }

        // Create overflow menu button (initially hidden)
        this.overflowMenuButton = this.createOverflowMenuButton();
        this.overflowMenuButton.style.display = 'none';
        this.rightButtons.appendChild(this.overflowMenuButton);

        buttonContainer.appendChild(leftButtons);
        buttonContainer.appendChild(this.rightButtons);
        this.element.appendChild(buttonContainer);
        
        // Ensure all buttons have title attributes
        this.ensureButtonTitles(buttonContainer);
    }
    
    /**
     * Ensure all buttons in the controls have title attributes
     * Uses aria-label as title if title is not present
     */
    ensureButtonTitles(container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(button => {
            if (!button.hasAttribute('title')) {
                const ariaLabel = button.getAttribute('aria-label');
                if (ariaLabel) {
                    button.setAttribute('title', ariaLabel);
                }
            }
        });
    }

    // Helper methods to check for available features
    hasChapterTracks() {
        const textTracks = this.player.element.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
            if (textTracks[i].kind === 'chapters') {
                return true;
            }
        }
        return false;
    }

    hasCaptionTracks() {
        const textTracks = this.player.element.textTracks;
        for (let i = 0; i < textTracks.length; i++) {
            if (textTracks[i].kind === 'captions' || textTracks[i].kind === 'subtitles') {
                return true;
            }
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
        if (this.player.audioDescriptionSrc && this.player.audioDescriptionSrc.length > 0) {
            return true;
        }
        
        // Check for description tracks
        const textTracks = Array.from(this.player.element.textTracks || []);
        return textTracks.some(track => track.kind === 'descriptions');
    }

    hasSignLanguage() {
        // Check for single source or multiple sources
        const hasSingleSource = this.player.signLanguageSrc && this.player.signLanguageSrc.length > 0;
        const hasMultipleSources = this.player.signLanguageSources && Object.keys(this.player.signLanguageSources).length > 0;
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

        progressContainer.appendChild(this.controls.buffered);
        progressContainer.appendChild(this.controls.played);
        this.controls.played.appendChild(this.controls.progressHandle);
        progressContainer.appendChild(this.controls.progressTooltip);

        this.controls.progress = progressContainer;

        // Progress bar events
        this.setupProgressBarEvents();
    }

    setupProgressBarEvents() {
        const progress = this.controls.progress;

        const updateProgress = (clientX) => {
            const rect = progress.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const time = percent * this.player.state.duration;
            return {percent, time};
        };

        // Mouse events
        progress.addEventListener('mousedown', (e) => {
            this.isDraggingProgress = true;
            const {time} = updateProgress(e.clientX);
            this.player.seek(time);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingProgress) {
                const {time} = updateProgress(e.clientX);
                this.player.seek(time);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDraggingProgress = false;
        });

        // Hover tooltip
        progress.addEventListener('mousemove', (e) => {
            if (!this.isDraggingProgress) {
                const {time} = updateProgress(e.clientX);
                this.controls.progressTooltip.textContent = TimeUtils.formatTime(time);
                this.controls.progressTooltip.style.left = `${e.clientX - progress.getBoundingClientRect().left}px`;
                this.controls.progressTooltip.style.display = 'block';
            }
        });

        progress.addEventListener('mouseleave', () => {
            this.controls.progressTooltip.style.display = 'none';
        });

        // Keyboard navigation
        progress.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.player.seekBackward(5);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.player.seekForward(5);
            }
        });

        // Touch events
        progress.addEventListener('touchstart', (e) => {
            this.isDraggingProgress = true;
            const touch = e.touches[0];
            const {time} = updateProgress(touch.clientX);
            this.player.seek(time);
        });

        progress.addEventListener('touchmove', (e) => {
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
                button.disabled = !this.player.playlistManager.hasPrevious() && !this.player.playlistManager.options.loop;
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
                button.disabled = !this.player.playlistManager.hasNext() && !this.player.playlistManager.options.loop;
            }
        };
        this.player.on('playlisttrackchange', updateState);
        updateState();

        this.controls.next = button;
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

    createVolumeControl() {
        // Mute/Volume button
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

    showVolumeSlider(button) {
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
        const updateVolume = (clientY) => {
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

        volumeSlider.addEventListener('touchmove', (e) => {
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
            }
        });

        // Prevent menu from closing when interacting with slider
        volumeMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Position menu first (before it's visible) to prevent jumping
        volumeMenu.style.visibility = 'hidden';
        volumeMenu.style.display = 'block';
        
        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', volumeMenu);
        
        // Position immediately (synchronously) while hidden
        this.positionMenu(volumeMenu, button, true);
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            volumeMenu.style.visibility = 'visible';
        });

        this.controls.volumeSlider = volumeSlider;
        this.controls.volumeFill = volumeFill;

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

        button.appendChild(createIconElement('playlist'));

        button.addEventListener('click', () => {
            this.showChaptersMenu(button);
        });

        this.controls.chapters = button;
        return button;
    }

    showChaptersMenu(button) {
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
        const chapterTracks = Array.from(this.player.element.textTracks).filter(
            track => track.kind === 'chapters'
        );

        if (chapterTracks.length === 0) {
            // No chapters available
            const noChaptersItem = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noChapters'),
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
                    const cue = cues[i];
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
                        textContent: TimeUtils.formatTime(cue.startTime)
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
                    const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
                    if (firstItem) {
                        firstItem.focus();
                    }
                }, 0);
            }
        }

        // Position menu first (before it's visible) to prevent jumping
        // Set menu to invisible temporarily
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', menu);
        
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
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-quality`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.quality'),
                'aria-expanded': 'false'
            }
        });

        button.appendChild(createIconElement('hd'));

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

    showQualityMenu(button) {
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
            const isHLS = this.player.renderer.hls !== undefined;

            if (qualities.length === 0) {
                // No qualities available
                const noQualityItem = DOMUtils.createElement('div', {
                    className: `${this.player.options.classPrefix}-menu-item`,
                    textContent: i18n.t('player.autoQuality'),
                    style: {opacity: '0.5', cursor: 'default'}
                });
                menu.appendChild(noQualityItem);
            } else {
                let activeItem = null;
                
                // Auto quality option (only for HLS)
                if (isHLS) {
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
                    const isAuto = this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1;
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
                qualities.forEach(quality => {
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
                        focusTarget.focus();
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
        
        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', menu);
        
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
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-caption-style`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.captionStyling'),
                'aria-expanded': 'false',
                'title': i18n.t('player.captionStyling')
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

        button.addEventListener('click', () => {
            this.showCaptionStyleMenu(button);
        });

        this.controls.captionStyle = button;
        return button;
    }

    showCaptionStyleMenu(button) {
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
                style: {opacity: '0.5', cursor: 'default', padding: '12px 16px'}
            });
            menu.appendChild(noTracksItem);

            // Position menu first (before it's visible) to prevent jumping
            // Set menu to invisible temporarily
            menu.style.visibility = 'hidden';
            menu.style.display = 'block';
            
            // Insert menu right after the button in the DOM
            button.insertAdjacentElement('afterend', menu);
            
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
        
        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', menu);
        
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

    createStyleControl(label, property, options) {
        const group = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-style-group`
        });

        const labelEl = DOMUtils.createElement('label', {
            textContent: label,
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
        options.forEach(opt => {
            const option = DOMUtils.createElement('option', {
                textContent: opt.label,
                attributes: {value: opt.value}
            });
            if (opt.value === currentValue) {
                option.selected = true;
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
            this.player.options[property] = e.target.value;
            if (this.player.captionManager) {
                this.player.captionManager.setCaptionStyle(
                    property.replace('captions', '').charAt(0).toLowerCase() + property.replace('captions', '').slice(1),
                    e.target.value
                );
            }
        });

        group.appendChild(select);
        return group;
    }

    createColorControl(label, property) {
        const group = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-style-group`
        });

        const labelEl = DOMUtils.createElement('label', {
            textContent: label,
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
            this.player.options[property] = e.target.value;
            if (this.player.captionManager) {
                this.player.captionManager.setCaptionStyle(
                    property.replace('captions', '').charAt(0).toLowerCase() + property.replace('captions', '').slice(1),
                    e.target.value
                );
            }
        });

        group.appendChild(input);
        return group;
    }

    createOpacityControl(label, property) {
        const group = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-style-group`
        });

        const labelContainer = DOMUtils.createElement('div', {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px'
            }
        });

        const labelEl = DOMUtils.createElement('label', {
            textContent: label,
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
            const value = parseFloat(e.target.value);
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

    formatSpeedLabel(speed) {
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

    showSpeedMenu(button) {
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
        let activeItem = null;

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
        
        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', menu);
        
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
                focusTarget.focus();
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

    showCaptionsMenu(button) {
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
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noTracksItem);

            // Insert menu right after the button in the DOM
            button.insertAdjacentElement('afterend', menu);

            // Close menu on outside click
            this.attachMenuCloseHandler(menu, button);
            return;
        }

        let activeItem = null;

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
        tracks.forEach(track => {
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

        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', menu);

        // Add keyboard navigation for the menu
        this.attachMenuKeyboardNavigation(menu, button);

        // Close menu on outside click and Escape key
        this.attachMenuCloseHandler(menu, button);

        // Focus the active item or the first item
        setTimeout(() => {
            const focusTarget = activeItem || menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
            if (focusTarget) {
                focusTarget.focus();
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
                'aria-pressed': 'false'
            }
        });

        button.appendChild(createIconElement('transcript'));

        button.addEventListener('click', () => {
            if (this.player.transcriptManager) {
                this.player.transcriptManager.toggleTranscript();
                this.updateTranscriptButton();
            }
        });

        this.controls.transcript = button;
        return button;
    }

    updateTranscriptButton() {
        if (!this.controls.transcript) return;

        const isVisible = this.player.transcriptManager && this.player.transcriptManager.isVisible;
        this.controls.transcript.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
    }

    createAudioDescriptionButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-audio-description`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.audioDescription'),
                'aria-pressed': 'false',
                'title': i18n.t('player.audioDescription')
            }
        });

        button.appendChild(createIconElement('audioDescription'));

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

        this.controls.audioDescription.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        this.controls.audioDescription.setAttribute('aria-label',
            isEnabled ? i18n.t('audioDescription.disable') : i18n.t('audioDescription.enable')
        );
    }

    createSignLanguageButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.signLanguage'),
                'aria-pressed': 'false',
                'title': i18n.t('player.signLanguage')
            }
        });

        button.appendChild(createIconElement('signLanguage'));

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
            createIconElement('signLanguageOn').innerHTML :
            createIconElement('signLanguage').innerHTML;

        this.controls.signLanguage.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        this.controls.signLanguage.setAttribute('aria-label',
            isEnabled ? i18n.t('signLanguage.hide') : i18n.t('signLanguage.show')
        );
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
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-pip`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.pip')
            }
        });

        button.appendChild(createIconElement('pip'));

        button.addEventListener('click', () => {
            this.player.togglePiP();
        });

        return button;
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
        this.player.on('qualitychange', () => this.updateQualityIndicator());
        this.player.on('hlslevelswitched', () => this.updateQualityIndicator());
        this.player.on('hlsmanifestparsed', () => {
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
        // Update title to match aria-label
        this.controls.playPause.setAttribute('title', newAriaLabel);
    }

    updateProgress() {
        if (!this.controls.played) return;

        const percent = (this.player.state.currentTime / this.player.state.duration) * 100;
        this.controls.played.style.width = `${percent}%`;
        this.controls.progress.setAttribute('aria-valuenow', String(Math.round(percent)));

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
                // Update title to match aria-label
                this.controls.mute.setAttribute('title', newMuteAriaLabel);
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
        
        // Check if it's HLS with auto mode
        if (this.player.renderer.hls && this.player.renderer.hls.currentLevel === -1) {
            currentQualityText = 'Auto';
        } else if (this.player.renderer.getCurrentQuality) {
            const currentIndex = this.player.renderer.getCurrentQuality();
            const currentQuality = qualities.find(q => q.index === currentIndex);
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
                this.hideTimeout = setTimeout(() => {
                    this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                    this.player.container.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                    this.player.state.controlsVisible = false;
                }, this.player.options.hideControlsDelay);
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
        });

        // Initial state
        showControls();
    }

    createOverflowMenuButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-overflow-menu`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.moreOptions'),
                'aria-expanded': 'false',
                'title': i18n.t('player.moreOptions')
            }
        });

        button.appendChild(createIconElement('moreVertical'));

        button.addEventListener('click', () => {
            this.showOverflowMenu(button);
        });

        this.controls.overflowMenu = button;
        return button;
    }

    showOverflowMenu(button) {
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
        const overflowButtons = Array.from(this.rightButtons.querySelectorAll('button[data-in-overflow="true"]'));

        if (overflowButtons.length === 0) {
            // No overflow items
            const noItemsText = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t('player.noMoreOptions'),
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noItemsText);
        } else {
            // Create menu items for each overflow button
            overflowButtons.forEach(btn => {
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
                        const iconClone = firstChild.cloneNode(true);
                        iconClone.classList.add('vidply-icon'); // Add icon class for consistent styling
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
                const firstItem = menu.querySelector(`.${this.player.options.classPrefix}-menu-item`);
                if (firstItem && firstItem.tagName === 'BUTTON') {
                    firstItem.focus();
                }
            }, 0);
        }

        // Position menu first (before it's visible) to prevent jumping
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        
        // Insert menu right after the button in the DOM
        button.insertAdjacentElement('afterend', menu);
        
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
            // Check screen size on every call
            const isDesktop = window.innerWidth >= 768;
            const isTinyScreen = window.innerWidth < 360;
            
            if (!this.rightButtons || this.rightButtons.children.length === 0) {
                return;
            }

            // Get all buttons (except the overflow menu button itself)
            const allButtons = Array.from(this.rightButtons.children).filter(
                btn => !btn.classList.contains(`${this.player.options.classPrefix}-overflow-menu`)
            );

            if (allButtons.length === 0) {
                return;
            }

            // On desktop (≥768px) or tiny screens (<360px), show all buttons and hide overflow menu
            if (isDesktop || isTinyScreen) {
                allButtons.forEach(btn => {
                    btn.dataset.inOverflow = 'false';
                    btn.style.display = '';
                });
                if (this.overflowMenuButton) {
                    this.overflowMenuButton.style.display = 'none';
                }
                if (this.player.options.debug) {
                    if (isDesktop) {
                        console.log('Desktop view (≥768px) - all buttons visible, overflow menu hidden');
                    } else {
                        console.log('Tiny screen (<360px) - all buttons visible, overflow menu hidden');
                    }
                }
                return;
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
                             parseInt(style.marginLeft || 0) + 
                             parseInt(style.marginRight || 0);
                totalWidth += width;
                return {btn, width};
            });

            // Add gap widths (8px per gap between buttons)
            const gapWidth = 8;
            totalWidth += (allButtons.length - 1) * gapWidth;

            // Check if overflow is needed
            const isSmallScreen = window.innerWidth < 768;
            const needsOverflow = totalWidth > availableWidth || isSmallScreen; // Always overflow on mobile

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

    destroy() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        if (this.overflowResizeObserver) {
            this.overflowResizeObserver.disconnect();
        }

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

