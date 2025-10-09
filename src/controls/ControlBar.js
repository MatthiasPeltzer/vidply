/**
 * Control Bar Component
 */

import {DOMUtils} from '../utils/DOMUtils.js';
import {TimeUtils} from '../utils/TimeUtils.js';
import {createIconElement} from '../icons/Icons.js';
import {i18n} from '../i18n/i18n.js';

export class ControlBar {
    constructor(player) {
        this.player = player;
        this.element = null;
        this.controls = {};
        this.hideTimeout = null;
        this.isDraggingProgress = false;
        this.isDraggingVolume = false;

        this.init();
    }

    init() {
        this.createElement();
        this.createControls();
        this.attachEvents();
        this.setupAutoHide();
    }

    // Helper method to attach close-on-outside-click behavior to menus
    attachMenuCloseHandler(menu, button, preventCloseOnInteraction = false) {
        setTimeout(() => {
            const closeMenu = (e) => {
                // If this menu has form controls, don't close when clicking inside
                if (preventCloseOnInteraction && menu.contains(e.target)) {
                    return;
                }

                // Check if click is outside menu and button
                if (!menu.contains(e.target) && !button.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                    document.removeEventListener('keydown', handleEscape);
                }
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                    document.removeEventListener('keydown', handleEscape);
                    // Return focus to button
                    button.focus();
                }
            };

            document.addEventListener('click', closeMenu);
            document.addEventListener('keydown', handleEscape);
        }, 100);
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
        // Progress bar container
        if (this.player.options.progressBar) {
            this.createProgressBar();
        }

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

        // Time display
        if (this.player.options.currentTime || this.player.options.duration) {
            leftButtons.appendChild(this.createTimeDisplay());
        }

        // Right buttons
        const rightButtons = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-controls-right`
        });

        // Check for available features
        const hasChapters = this.hasChapterTracks();
        const hasCaptions = this.hasCaptionTracks();
        const hasQualityLevels = this.hasQualityLevels();
        const hasAudioDescription = this.hasAudioDescription();

        // Chapters button - only show if chapters are available
        if (this.player.options.chaptersButton && hasChapters) {
            rightButtons.appendChild(this.createChaptersButton());
        }

        // Quality button - only show if quality levels are available
        if (this.player.options.qualityButton && hasQualityLevels) {
            rightButtons.appendChild(this.createQualityButton());
        }

        // Caption styling button (font, size, color) - only show if captions are available
        if (this.player.options.captionStyleButton && hasCaptions) {
            rightButtons.appendChild(this.createCaptionStyleButton());
        }

        // Speed button - always available
        if (this.player.options.speedButton) {
            rightButtons.appendChild(this.createSpeedButton());
        }

        // Captions language selector button - only show if captions are available
        if (this.player.options.captionsButton && hasCaptions) {
            rightButtons.appendChild(this.createCaptionsButton());
        }

        // Transcript button - only show if captions/subtitles are available
        if (this.player.options.transcriptButton && hasCaptions) {
            rightButtons.appendChild(this.createTranscriptButton());
        }

        // Audio Description button - only show if audio description source is available
        if (this.player.options.audioDescriptionButton && hasAudioDescription) {
            rightButtons.appendChild(this.createAudioDescriptionButton());
        }

        // Sign Language button - only show if sign language source is available
        const hasSignLanguage = this.hasSignLanguage();
        if (this.player.options.signLanguageButton && hasSignLanguage) {
            rightButtons.appendChild(this.createSignLanguageButton());
        }

        // PiP button
        if (this.player.options.pipButton && 'pictureInPictureEnabled' in document) {
            rightButtons.appendChild(this.createPipButton());
        }

        // Fullscreen button
        if (this.player.options.fullscreenButton) {
            rightButtons.appendChild(this.createFullscreenButton());
        }

        buttonContainer.appendChild(leftButtons);
        buttonContainer.appendChild(rightButtons);
        this.element.appendChild(buttonContainer);
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
        // Check if using HLS with multiple quality levels
        if (this.player.renderer && this.player.renderer.hls) {
            const levels = this.player.renderer.hls.levels;
            return levels && levels.length > 1;
        }
        // For non-HLS, quality switching is not available
        return false;
    }

    hasAudioDescription() {
        return this.player.audioDescriptionSrc && this.player.audioDescriptionSrc.length > 0;
    }

    hasSignLanguage() {
        return this.player.signLanguageSrc && this.player.signLanguageSrc.length > 0;
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
        this.element.appendChild(progressContainer);

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

    createPreviousButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-previous`,
            attributes: {
                'type': 'button',
                'aria-label': 'Previous track'
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
                'aria-label': 'Next track'
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
                'aria-label': 'Rewind 15 seconds'
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
                'aria-label': 'Forward 15 seconds'
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
                'aria-haspopup': 'true'
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

        volumeSlider.addEventListener('mousedown', (e) => {
            e.stopPropagation();
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

        // Append menu to button
        button.appendChild(volumeMenu);

        this.controls.volumeSlider = volumeSlider;
        this.controls.volumeFill = volumeFill;

        // Close menu on outside click
        this.attachMenuCloseHandler(volumeMenu, button, true);
    }

    createTimeDisplay() {
        const container = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-time`
        });

        this.controls.currentTimeDisplay = DOMUtils.createElement('span', {
            className: `${this.player.options.classPrefix}-current-time`,
            textContent: '00:00'
        });

        const separator = DOMUtils.createElement('span', {
            textContent: ' / ',
            attributes: {
                'aria-hidden': 'true'
            }
        });

        this.controls.durationDisplay = DOMUtils.createElement('span', {
            className: `${this.player.options.classPrefix}-duration`,
            textContent: '00:00'
        });

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
                'aria-label': 'Chapters',
                'aria-haspopup': 'menu'
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
        // Remove existing menu if any
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-chapters-menu`);
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-chapters-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': 'Chapters'
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
                textContent: 'No chapters available',
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
                    textContent: 'Loading chapters...',
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
                            'role': 'menuitem'
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
                        menu.remove();
                    });

                    menu.appendChild(item);
                }
            }
        }

        // Append menu directly to button for proper positioning
        button.appendChild(menu);

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    createQualityButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-quality`,
            attributes: {
                'type': 'button',
                'aria-label': 'Quality',
                'aria-haspopup': 'menu'
            }
        });

        button.appendChild(createIconElement('hd'));

        button.addEventListener('click', () => {
            this.showQualityMenu(button);
        });

        this.controls.quality = button;
        return button;
    }

    showQualityMenu(button) {
        // Remove existing menu if any
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-quality-menu`);
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-quality-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': 'Quality'
            }
        });

        // Check if renderer supports quality selection
        if (this.player.renderer && this.player.renderer.getQualities) {
            const qualities = this.player.renderer.getQualities();

            if (qualities.length === 0) {
                // No qualities available
                const noQualityItem = DOMUtils.createElement('div', {
                    className: `${this.player.options.classPrefix}-menu-item`,
                    textContent: 'Auto (no quality selection available)',
                    style: {opacity: '0.5', cursor: 'default'}
                });
                menu.appendChild(noQualityItem);
            } else {
                // Auto quality option
                const autoItem = DOMUtils.createElement('button', {
                    className: `${this.player.options.classPrefix}-menu-item`,
                    textContent: 'Auto',
                    attributes: {
                        'type': 'button',
                        'role': 'menuitem'
                    }
                });

                autoItem.addEventListener('click', () => {
                    if (this.player.renderer.switchQuality) {
                        this.player.renderer.switchQuality(-1); // -1 for auto
                    }
                    menu.remove();
                });

                menu.appendChild(autoItem);

                // Quality options
                qualities.forEach(quality => {
                    const item = DOMUtils.createElement('button', {
                        className: `${this.player.options.classPrefix}-menu-item`,
                        textContent: quality.name || `${quality.height}p`,
                        attributes: {
                            'type': 'button',
                            'role': 'menuitem'
                        }
                    });

                    item.addEventListener('click', () => {
                        if (this.player.renderer.switchQuality) {
                            this.player.renderer.switchQuality(quality.index);
                        }
                        menu.remove();
                    });

                    menu.appendChild(item);
                });
            }
        } else {
            // No quality support
            const noSupportItem = DOMUtils.createElement('div', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: 'Quality selection not available',
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noSupportItem);
        }

        // Append menu directly to button for proper positioning
        button.appendChild(menu);

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    createCaptionStyleButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-caption-style`,
            attributes: {
                'type': 'button',
                'aria-label': 'Caption styling',
                'aria-haspopup': 'menu',
                'title': 'Caption styling'
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
        // Remove existing menu if any
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-caption-style-menu`);
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-caption-style-menu ${this.player.options.classPrefix}-menu ${this.player.options.classPrefix}-settings-menu`,
            attributes: {
                'role': 'menu',
                'aria-label': 'Caption styling'
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
                textContent: 'No captions available',
                style: {opacity: '0.5', cursor: 'default', padding: '12px 16px'}
            });
            menu.appendChild(noTracksItem);

            // Append menu to button
            button.appendChild(menu);

            // Close menu on outside click
            this.attachMenuCloseHandler(menu, button, true);
            return;
        }

        // Font Size
        const fontSizeGroup = this.createStyleControl(
            'Font Size',
            'captionsFontSize',
            [
                {label: 'Small', value: '80%'},
                {label: 'Medium', value: '100%'},
                {label: 'Large', value: '120%'},
                {label: 'X-Large', value: '150%'}
            ]
        );
        menu.appendChild(fontSizeGroup);

        // Font Family
        const fontFamilyGroup = this.createStyleControl(
            'Font',
            'captionsFontFamily',
            [
                {label: 'Sans-serif', value: 'sans-serif'},
                {label: 'Serif', value: 'serif'},
                {label: 'Monospace', value: 'monospace'}
            ]
        );
        menu.appendChild(fontFamilyGroup);

        // Text Color
        const colorGroup = this.createColorControl('Text Color', 'captionsColor');
        menu.appendChild(colorGroup);

        // Background Color
        const bgColorGroup = this.createColorControl('Background', 'captionsBackgroundColor');
        menu.appendChild(bgColorGroup);

        // Opacity
        const opacityGroup = this.createOpacityControl('Opacity', 'captionsOpacity');
        menu.appendChild(opacityGroup);

        // Set min-width for caption style menu
        menu.style.minWidth = '220px';

        // Append menu directly to button for proper positioning
        button.appendChild(menu);

        // Close menu on outside click (but not when interacting with controls)
        this.attachMenuCloseHandler(menu, button, true);
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
                'aria-haspopup': 'menu'
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

    showSpeedMenu(button) {
        // Remove existing menu if any
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-speed-menu`);
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-speed-menu ${this.player.options.classPrefix}-menu`,
            attributes: {
                'role': 'menu'
            }
        });

        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

        speeds.forEach(speed => {
            const item = DOMUtils.createElement('button', {
                className: `${this.player.options.classPrefix}-menu-item`,
                textContent: i18n.t(`speeds.${speed}`) || `${speed}x`,
                attributes: {
                    'type': 'button',
                    'role': 'menuitem'
                }
            });

            if (speed === this.player.state.playbackSpeed) {
                item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
                item.appendChild(createIconElement('check'));
            }

            item.addEventListener('click', () => {
                this.player.setPlaybackSpeed(speed);
                menu.remove();
            });

            menu.appendChild(item);
        });

        // Append menu directly to button for proper positioning
        button.appendChild(menu);

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    createCaptionsButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-captions-button`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('player.captions'),
                'aria-pressed': 'false',
                'aria-haspopup': 'menu'
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
        // Remove existing menu if any
        const existingMenu = document.querySelector(`.${this.player.options.classPrefix}-captions-menu`);
        if (existingMenu) {
            existingMenu.remove();
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
                textContent: 'No captions available',
                style: {opacity: '0.5', cursor: 'default'}
            });
            menu.appendChild(noTracksItem);

            // Append menu to button
            button.appendChild(menu);

            // Close menu on outside click
            this.attachMenuCloseHandler(menu, button);
            return;
        }

        // Off option
        const offItem = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-menu-item`,
            textContent: i18n.t('captions.off'),
            attributes: {
                'type': 'button',
                'role': 'menuitem'
            }
        });

        if (!this.player.state.captionsEnabled) {
            offItem.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
            offItem.appendChild(createIconElement('check'));
        }

        offItem.addEventListener('click', () => {
            this.player.disableCaptions();
            this.updateCaptionsButton();
            menu.remove();
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
                    'lang': track.language
                }
            });

            // Check if this is the current track
            if (this.player.state.captionsEnabled &&
                this.player.captionManager.currentTrack === this.player.captionManager.tracks[track.index]) {
                item.classList.add(`${this.player.options.classPrefix}-menu-item-active`);
                item.appendChild(createIconElement('check'));
            }

            item.addEventListener('click', () => {
                this.player.captionManager.switchTrack(track.index);
                this.updateCaptionsButton();
                menu.remove();
            });

            menu.appendChild(item);
        });

        // Append menu directly to button for proper positioning
        button.appendChild(menu);

        // Close menu on outside click
        this.attachMenuCloseHandler(menu, button);
    }

    updateCaptionsButton() {
        if (!this.controls.captions) return;

        const icon = this.controls.captions.querySelector('.vidply-icon');
        const isEnabled = this.player.state.captionsEnabled;

        icon.innerHTML = isEnabled ?
            createIconElement('captions').innerHTML :
            createIconElement('captionsOff').innerHTML;

        this.controls.captions.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
    }

    createTranscriptButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-transcript`,
            attributes: {
                'type': 'button',
                'aria-label': 'Toggle transcript',
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
                'aria-label': 'Audio description',
                'aria-pressed': 'false',
                'title': 'Toggle audio description'
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
            isEnabled ? 'Disable audio description' : 'Enable audio description'
        );
    }

    createSignLanguageButton() {
        const button = DOMUtils.createElement('button', {
            className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-sign-language`,
            attributes: {
                'type': 'button',
                'aria-label': 'Sign language video',
                'aria-pressed': 'false',
                'title': 'Toggle sign language video'
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
            isEnabled ? 'Hide sign language video' : 'Show sign language video'
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
        this.player.on('loadedmetadata', () => this.updateDuration());
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
    }

    updatePlayPauseButton() {
        if (!this.controls.playPause) return;

        const icon = this.controls.playPause.querySelector('.vidply-icon');
        const isPlaying = this.player.state.playing;

        icon.innerHTML = isPlaying ?
            createIconElement('pause').innerHTML :
            createIconElement('play').innerHTML;

        this.controls.playPause.setAttribute('aria-label',
            isPlaying ? i18n.t('player.pause') : i18n.t('player.play')
        );
    }

    updateProgress() {
        if (!this.controls.played) return;

        const percent = (this.player.state.currentTime / this.player.state.duration) * 100;
        this.controls.played.style.width = `${percent}%`;
        this.controls.progress.setAttribute('aria-valuenow', String(Math.round(percent)));

        if (this.controls.currentTimeDisplay) {
            this.controls.currentTimeDisplay.textContent = TimeUtils.formatTime(this.player.state.currentTime);
        }
    }

    updateDuration() {
        if (this.controls.durationDisplay) {
            this.controls.durationDisplay.textContent = TimeUtils.formatTime(this.player.state.duration);
        }
    }

    updateVolumeDisplay() {
        if (!this.controls.volumeFill) return;

        const percent = this.player.state.volume * 100;
        this.controls.volumeFill.style.height = `${percent}%`;

        // Update mute button icon
        if (this.controls.mute) {
            const icon = this.controls.mute.querySelector('.vidply-icon');
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

            this.controls.mute.setAttribute('aria-label',
                this.player.state.muted ? i18n.t('player.unmute') : i18n.t('player.mute')
            );
        }

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

    setupAutoHide() {
        if (this.player.element.tagName !== 'VIDEO') return;

        const showControls = () => {
            this.element.classList.add(`${this.player.options.classPrefix}-controls-visible`);
            this.player.state.controlsVisible = true;

            clearTimeout(this.hideTimeout);

            if (this.player.state.playing) {
                this.hideTimeout = setTimeout(() => {
                    this.element.classList.remove(`${this.player.options.classPrefix}-controls-visible`);
                    this.player.state.controlsVisible = false;
                }, this.player.options.hideControlsDelay);
            }
        };

        this.player.container.addEventListener('mousemove', showControls);
        this.player.container.addEventListener('touchstart', showControls);
        this.player.container.addEventListener('click', showControls);

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

        // Initial state
        showControls();
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

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

