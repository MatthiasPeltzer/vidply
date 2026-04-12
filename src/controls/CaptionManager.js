/**
 * Caption/Subtitle Manager
 */

import {DOMUtils} from '../utils/DOMUtils.js';
import {i18n} from '../i18n/i18n.js';
import {StorageManager} from '../utils/StorageManager.js';
import {debounce, isMobile, rafWithTimeout} from '../utils/PerformanceUtils.js';

export class CaptionManager {
    constructor(player) {
        this.player = player;
        this.element = null;
        this.tracks = [];
        this.currentTrack = null;
        this.currentCue = null;
        
        // Storage manager
        this.storage = new StorageManager('vidply');
        
        // Load saved preferences
        this.loadSavedPreferences();

        this.init();
    }
    
    loadSavedPreferences() {
        const saved = this.storage.getCaptionPreferences();
        if (saved) {
            // Override player options with saved preferences
            if (saved.fontSize) this.player.options.captionsFontSize = saved.fontSize;
            if (saved.fontFamily) this.player.options.captionsFontFamily = saved.fontFamily;
            if (saved.color) this.player.options.captionsColor = saved.color;
            if (saved.backgroundColor) this.player.options.captionsBackgroundColor = saved.backgroundColor;
            if (saved.opacity !== undefined) this.player.options.captionsOpacity = saved.opacity;
        }
    }
    
    saveCaptionPreferences() {
        this.storage.saveCaptionPreferences({
            fontSize: this.player.options.captionsFontSize,
            fontFamily: this.player.options.captionsFontFamily,
            color: this.player.options.captionsColor,
            backgroundColor: this.player.options.captionsBackgroundColor,
            opacity: this.player.options.captionsOpacity
        });
    }

    init() {
        this.createElement();
        this.loadTracks();
        this.attachEvents();

        // Only enable captions via captionsDefault option if no default track was found
        // (loadTracks() already enables tracks with the default attribute)
        if (this.player.options.captionsDefault && this.tracks.length > 0 && !this.currentTrack) {
            this.enable();
        }
    }

    createElement() {
        this.element = DOMUtils.createElement('div', {
            className: `${this.player.options.classPrefix}-captions`,
            attributes: {
                'role': 'region',
                'aria-label': i18n.t('player.captions')
            }
        });

        // Apply caption styles
        this.updateStyles();

        // Append to videoWrapper if it exists, otherwise to container
        const target = this.player.videoWrapper || this.player.container;
        target.appendChild(this.element);
    }

    loadTracks() {
        const textTracks = this.player.element.textTracks;
        let defaultTrackIndex = -1;

        // Safari's native HLS can expose both SUBTITLES (WebVTT sidecar) and
        // CLOSED-CAPTIONS (inband CEA-608) groups as separate TextTrack objects
        // with the same language and label. Deduplicate to one menu entry per
        // language+label, storing the extras as alternatives. enable() will
        // listen on all of them and use whichever delivers cues first.
        const seen = new Map();

        for (let i = 0; i < textTracks.length; i++) {
            const track = textTracks[i];

            if (track.kind === 'subtitles' || track.kind === 'captions') {
                track.mode = 'hidden';

                const dedupeKey = `${track.language}|${track.label}`;
                const existing = seen.get(dedupeKey);

                if (existing) {
                    existing.alternatives.push(track);
                    continue;
                }

                const trackElement = this.player.findTrackElement(track);
                const isDefault = trackElement && trackElement.hasAttribute('default');
                const entry = {
                    track,
                    language: track.language,
                    label: track.label,
                    kind: track.kind,
                    index: i,
                    isDefault,
                    alternatives: []
                };

                this.tracks.push(entry);
                seen.set(dedupeKey, entry);

                if (isDefault) {
                    defaultTrackIndex = this.tracks.length - 1;
                }
            }
        }
        
        if (defaultTrackIndex >= 0) {
            requestAnimationFrame(() => {
                this.enable(defaultTrackIndex);
            });
        }
    }

    attachEvents() {
        this.player.on('timeupdate', () => {
            this.updateCaptions();
        });

        this.player.on('captionschange', () => {
            this.updateStyles();
        });
        
        // Debounced resize handler to avoid excessive recalculations
        this.debouncedPositionCaptions = debounce(() => {
            this.positionCaptionsOnMobile();
        }, 150);
        
        window.addEventListener('resize', this.debouncedPositionCaptions);
        
        // Recalculate on fullscreen change with RAF
        this.player.on('enterfullscreen', () => {
            rafWithTimeout(() => this.positionCaptionsOnMobile(), 100);
        });
        
        this.player.on('exitfullscreen', () => {
            rafWithTimeout(() => this.positionCaptionsOnMobile(), 100);
        });
    }

    enable(trackIndex = 0) {
        if (this.tracks.length === 0) {
            return;
        }

        // Disable current track and clean up alternative listeners
        this._cleanupTrackListeners();

        // Enable selected track
        const selectedTrack = this.tracks[trackIndex];

        if (selectedTrack && selectedTrack.track) {
            selectedTrack.track.mode = 'hidden';
            this.currentTrack = selectedTrack;
            this.player.state.captionsEnabled = true;
            
            if (selectedTrack.language) {
                this.element.setAttribute('lang', selectedTrack.language);
            }

            this.cueChangeHandler = () => {
                this.updateCaptions();
            };
            selectedTrack.track.addEventListener('cuechange', this.cueChangeHandler);

            // Native HLS dedup: Safari can expose duplicate TextTrack objects
            // for the same language (SUBTITLES vs CLOSED-CAPTIONS groups) but
            // only one actually delivers cues. Listen on all alternatives and
            // swap to whichever fires first with real cues.
            if (selectedTrack.alternatives && selectedTrack.alternatives.length > 0) {
                this._altCueChangeHandler = () => {
                    if (this.currentTrack !== selectedTrack) return;
                    for (const alt of selectedTrack.alternatives) {
                        if (alt.activeCues && alt.activeCues.length > 0) {
                            this.player.log(`Switching to alternative caption track for "${selectedTrack.label}"`, 'info');
                            selectedTrack.track.removeEventListener('cuechange', this.cueChangeHandler);
                            selectedTrack.alternatives.forEach(a => a.removeEventListener('cuechange', this._altCueChangeHandler));
                            selectedTrack.track = alt;
                            selectedTrack.track.addEventListener('cuechange', this.cueChangeHandler);
                            this._altCueChangeHandler = null;
                            this.updateCaptions();
                            return;
                        }
                    }
                };
                selectedTrack.alternatives.forEach(alt => {
                    alt.mode = 'hidden';
                    alt.addEventListener('cuechange', this._altCueChangeHandler);
                });
            }

            const ensureTrackReady = () => {
                if (selectedTrack.track.readyState < 2) {
                    const onTrackLoad = () => {
                        selectedTrack.track.removeEventListener('load', onTrackLoad);
                        selectedTrack.track.removeEventListener('error', onTrackLoad);
                        requestAnimationFrame(() => {
                            if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                                this.updateCaptions();
                            }
                        });
                    };
                    selectedTrack.track.addEventListener('load', onTrackLoad, { once: true });
                    selectedTrack.track.addEventListener('error', onTrackLoad, { once: true });
                } else {
                    requestAnimationFrame(() => {
                        if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                            this.updateCaptions();
                        }
                    });
                }
            };

            requestAnimationFrame(() => {
                if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                    ensureTrackReady();
                }
            });

            this.player.emit('captionsenabled', selectedTrack);
        }
    }

    _cleanupTrackListeners() {
        if (this.currentTrack && this.currentTrack.track) {
            if (this.cueChangeHandler) {
                this.currentTrack.track.removeEventListener('cuechange', this.cueChangeHandler);
            }
            if (this._altCueChangeHandler && this.currentTrack.alternatives) {
                this.currentTrack.alternatives.forEach(alt => {
                    alt.removeEventListener('cuechange', this._altCueChangeHandler);
                });
            }
            this.currentTrack.track.mode = 'hidden';
        }
        this._altCueChangeHandler = null;
    }

    disable() {
        this._cleanupTrackListeners();
        this.currentTrack = null;

        this.element.style.display = 'none';
        this.element.innerHTML = '';
        this.element.removeAttribute('lang');
        this.currentCue = null;
        this.player.state.captionsEnabled = false;
        this.player.emit('captionsdisabled');
    }

    updateCaptions() {
        if (!this.currentTrack || !this.currentTrack.track) {
            return;
        }

        // Ensure track mode is set to 'hidden' (not 'disabled') to receive cue updates
        // 'hidden' mode loads cues and fires cuechange events, but doesn't show native captions
        // If track is 'disabled', it won't have activeCues or fire events
        if (this.currentTrack.track.mode === 'disabled') {
            this.currentTrack.track.mode = 'hidden';
        }

        // Ensure track is in 'hidden' mode (not 'showing') for custom caption display
        if (this.currentTrack.track.mode === 'showing') {
            this.currentTrack.track.mode = 'hidden';
        }

        // Check if track has cues loaded
        if (!this.currentTrack.track.activeCues) {
            // If no activeCues property, track might not be ready yet
            // Try to access cues directly
            if (this.currentTrack.track.cues && this.currentTrack.track.cues.length > 0) {
                // Track has cues but no active ones yet - this is normal
                // Clear any existing caption
                if (this.currentCue) {
                    this.element.innerHTML = '';
                    this.element.style.display = 'none';
                    this.currentCue = null;
                }
            }
            return;
        }

        const activeCues = this.currentTrack.track.activeCues;
        const isAudioPlayer = this.player.element.tagName.toLowerCase() === 'audio';

        if (activeCues.length > 0) {
            const cue = activeCues[0];

            // Only update if the cue has changed
            if (this.currentCue !== cue) {
                this.currentCue = cue;

                // Parse and display cue text
                let text = cue.text;

                // Handle VTT formatting
                text = this.parseVTTFormatting(text);

                // Audio players: transcript-style accumulation
                if (isAudioPlayer) {
                    // Remove highlight from previous active cue
                    const existingCues = this.element.querySelectorAll(`.${this.player.options.classPrefix}-caption-cue`);
                    existingCues.forEach(el => el.classList.remove(`${this.player.options.classPrefix}-caption-active`));
                    
                    // Check if this cue is already displayed
                    const cueId = `cue-${cue.startTime}-${cue.endTime}`;
                    let cueElement = this.element.querySelector(`[data-cue-id="${cueId}"]`);
                    
                    if (!cueElement) {
                        // Create new cue element
                        cueElement = document.createElement('div');
                        cueElement.className = `${this.player.options.classPrefix}-caption-cue`;
                        cueElement.setAttribute('data-cue-id', cueId);
                        cueElement.innerHTML = DOMUtils.sanitizeHTML(text);
                        this.element.appendChild(cueElement);
                    }
                    
                    // Highlight active cue
                    cueElement.classList.add(`${this.player.options.classPrefix}-caption-active`);
                    
                    // Scroll to active cue smoothly - center it for better visibility
                    requestAnimationFrame(() => {
                        if (cueElement) {
                            cueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                } else {
                    // Video players: replace content as before
                    this.element.innerHTML = DOMUtils.sanitizeHTML(text);
                }

                // Make sure it's visible when there's content
                this.element.style.display = 'block';
                
                // Position captions above controls on mobile
                this.positionCaptionsOnMobile();

                this.player.emit('captionchange', cue);
            }
        } else if (this.currentCue) {
            // Clear caption when no active cues (video players only)
            if (!isAudioPlayer) {
                this.element.innerHTML = '';
                this.element.style.display = 'none';
            }
            this.currentCue = null;
        }
    }
    
    positionCaptionsOnMobile() {
        if (!this.element || this.element.style.display === 'none') {
            return;
        }
        
        const isFullscreen = this.player.state?.fullscreen || false;
        const mobile = isMobile();
        
        if (!mobile && !isFullscreen) {
            // Reset to CSS defaults on desktop
            this.element.style.bottom = '';
            return;
        }
        
        const controls = this.player.controlBar?.element;
        if (!controls) {
            return;
        }
        
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
            if (!this.element || this.element.style.display === 'none') {
                return;
            }
            
            const controlsRect = controls.getBoundingClientRect();
            const wrapperRect = this.player.videoWrapper.getBoundingClientRect();
            const bottomOffset = wrapperRect.bottom - controlsRect.top + 16;
            
            this.element.style.bottom = `${bottomOffset}px`;
            
            if (this.player.options.debug) {
                console.log('[VidPly] Caption position:', {
                    mobile,
                    isFullscreen,
                    controlsHeight: controlsRect.height,
                    bottomOffset: `${bottomOffset}px`
                });
            }
        });
    }

    parseVTTFormatting(text) {
        // Basic VTT tag support
        text = text.replace(/<c[^>]*>(.*?)<\/c>/g, '<span class="caption-class">$1</span>');
        text = text.replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>');
        text = text.replace(/<i>(.*?)<\/i>/g, '<em>$1</em>');
        text = text.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

        // Voice tags
        text = text.replace(/<v\s+([^>]+)>(.*?)<\/v>/g, '<span class="caption-voice" data-voice="$1">$2</span>');

        return text;
    }

    updateStyles() {
        if (!this.element) return;

        const options = this.player.options;

        this.element.style.fontSize = options.captionsFontSize;
        this.element.style.fontFamily = options.captionsFontFamily;
        this.element.style.color = options.captionsColor;
        this.element.style.backgroundColor = this.hexToRgba(
            options.captionsBackgroundColor,
            options.captionsOpacity
        );
    }

    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
        }
        return hex;
    }

    setCaptionStyle(property, value) {
        switch (property) {
            case 'fontSize':
                this.player.options.captionsFontSize = value;
                break;
            case 'fontFamily':
                this.player.options.captionsFontFamily = value;
                break;
            case 'color':
                this.player.options.captionsColor = value;
                break;
            case 'backgroundColor':
                this.player.options.captionsBackgroundColor = value;
                break;
            case 'opacity':
                this.player.options.captionsOpacity = value;
                break;
        }

        this.updateStyles();
        this.saveCaptionPreferences();
        this.player.emit('captionschange');
    }

    getAvailableTracks() {
        return this.tracks.map((t, index) => ({
            index,
            language: t.language,
            label: t.label || t.language,
            kind: t.kind
        }));
    }

    /**
     * Refresh tracks list - useful when HLS adds subtitle tracks dynamically
     */
    refreshTracks() {
        // Store current track info to restore after refresh
        const currentLanguage = this.currentTrack?.language;
        const wasEnabled = this.player.state.captionsEnabled;
        
        // Disable current caption
        if (this.currentTrack) {
            this.disable();
        }
        
        // Clear existing tracks
        this.tracks = [];
        
        // Reload tracks from video element
        this.loadTracks();
        
        this.player.log(`Caption tracks refreshed, found ${this.tracks.length} tracks`, 'info');
        
        // Try to restore previous track if it exists
        if (wasEnabled && currentLanguage && this.tracks.length > 0) {
            const matchingIndex = this.tracks.findIndex(t => t.language === currentLanguage);
            if (matchingIndex >= 0) {
                this.enable(matchingIndex);
            }
        }
        
        return this.tracks.length;
    }

    switchTrack(trackIndex) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            this.disable();
            this.enable(trackIndex);
        }
    }

    destroy() {
        this.disable();

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

