/**
 * Caption/Subtitle Manager
 */

import {DOMUtils} from '../utils/DOMUtils.js';
import {i18n} from '../i18n/i18n.js';
import {StorageManager} from '../utils/StorageManager.js';
import {debounce, isMobile, rafWithTimeout} from '../utils/PerformanceUtils.js';
import {deriveTrackLabel} from '../utils/TrackLabelUtils.js';
import type { Player } from '../core/Player.js';

/**
 * Deduplicated subtitle/captions entry shown in the captions menu. Native HLS
 * on Safari can expose the same language as both `SUBTITLES` (WebVTT sidecar)
 * and `CLOSED-CAPTIONS` (inband CEA-608) groups; the duplicates are kept in
 * `alternatives` so we can listen on all of them and use whichever delivers
 * cues first.
 */
export type CaptionTrackEntry = {
    track: TextTrack;
    language: string;
    label: string;
    kind: string;
    index: number;
    isDefault: boolean;
    alternatives: TextTrack[];
};

type CueChangeHandler = () => void;

export class CaptionManager {
    player: Player;
    _altCueChangeHandler: CueChangeHandler | null = null;
    cueChangeHandler: CueChangeHandler | null = null;
    currentCue: VTTCue | null;
    currentTrack: CaptionTrackEntry | null;
    debouncedPositionCaptions!: () => void;
    element!: HTMLElement;
    storage: StorageManager;
    tracks: CaptionTrackEntry[];

    constructor(player: Player) {
        this.player = player;
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
            if (typeof saved.fontSize === 'string') this.player.options.captionsFontSize = saved.fontSize;
            if (typeof saved.fontFamily === 'string') this.player.options.captionsFontFamily = saved.fontFamily;
            if (typeof saved.color === 'string') this.player.options.captionsColor = saved.color;
            if (typeof saved.backgroundColor === 'string') this.player.options.captionsBackgroundColor = saved.backgroundColor;
            if (typeof saved.opacity === 'number') this.player.options.captionsOpacity = saved.opacity;
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

            if ((track.kind === 'subtitles' || track.kind === 'captions') && !track._vidplyStale) {
                track.mode = 'hidden';

                const dedupeKey = `${track.language}|${track.label}`;
                const existing = seen.get(dedupeKey);

                if (existing) {
                    existing.alternatives.push(track);
                    continue;
                }

                const trackElement = this.player.findTrackElement(track) as Element | undefined;
                const isDefault = trackElement ? trackElement.hasAttribute('default') : false;
                const entry: CaptionTrackEntry = {
                    track,
                    language: track.language,
                    label: deriveTrackLabel(track.label, track.language),
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

    /**
     * Sync hls.js subtitle rendition to match the given language.
     * Matches by lang, language, or falls back to name/label.
     */
    private _syncHlsSubtitleTrack(targetLang: string, targetLabel?: string) {
        const renderer = this.player.renderer;
        if (!renderer?.hls || !renderer.hls.subtitleTracks?.length) return;

        const tracks = renderer.hls.subtitleTracks as Array<{ lang?: string; name?: string }>;
        let hlsIndex = tracks.findIndex(
            (t) => t.lang === targetLang
        );
        // Fallback: match by name/label
        if (hlsIndex < 0 && targetLabel) {
            hlsIndex = tracks.findIndex(
                (t) => t.name === targetLabel
            );
        }
        if (hlsIndex >= 0 && renderer.hls.subtitleTrack !== hlsIndex) {
            renderer.hls.subtitleTrack = hlsIndex;
            this.player.log(`HLS subtitle track set to index ${hlsIndex} (${targetLang})`, 'info');
        }
    }

    attachEvents() {
        this.player.on('timeupdate', () => {
            this.updateCaptions();
        });

        // When hls.js finishes loading new subtitle cues, refresh captions
        this.player.on('textcuesupdate', () => {
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

            // Bind handlers to locals so the non-null narrowing survives both
            // closure captures and `this.X = …` reassignments. Without this,
            // `addEventListener(this.cueChangeHandler)` widens to `… | null`
            // and stops type-checking even though we just assigned a function.
            const cueChangeHandler: CueChangeHandler = () => {
                this.updateCaptions();
            };
            this.cueChangeHandler = cueChangeHandler;
            selectedTrack.track.addEventListener('cuechange', cueChangeHandler);

            // Native HLS dedup: Safari can expose duplicate TextTrack objects
            // for the same language (SUBTITLES vs CLOSED-CAPTIONS groups) but
            // only one actually delivers cues. Listen on all alternatives and
            // swap to whichever fires first with real cues.
            if (selectedTrack.alternatives && selectedTrack.alternatives.length > 0) {
                const altCueChangeHandler: CueChangeHandler = () => {
                    if (this.currentTrack !== selectedTrack) return;
                    for (const alt of selectedTrack.alternatives) {
                        if (alt.activeCues && alt.activeCues.length > 0) {
                            this.player.log(`Switching to alternative caption track for "${selectedTrack.label}"`, 'info');
                            selectedTrack.track.removeEventListener('cuechange', cueChangeHandler);
                            selectedTrack.alternatives.forEach((a) => a.removeEventListener('cuechange', altCueChangeHandler));
                            selectedTrack.track = alt;
                            selectedTrack.track.addEventListener('cuechange', cueChangeHandler);
                            this._altCueChangeHandler = null;
                            this.updateCaptions();
                            return;
                        }
                    }
                };
                this._altCueChangeHandler = altCueChangeHandler;
                selectedTrack.alternatives.forEach((alt) => {
                    alt.mode = 'hidden';
                    alt.addEventListener('cuechange', altCueChangeHandler);
                });
            }

            // The "ready" sense actually lives on the underlying <track> HTML
            // element — not on the TextTrack itself, which has no `readyState`
            // or `load` event. Look the element up so this is type-safe and
            // also fires the load callback in browsers where TextTrack alone
            // would never have done so.
            const trackElement = this.player.findTrackElement(selectedTrack.track) as HTMLTrackElement | undefined;
            const ensureTrackReady = () => {
                if (trackElement && trackElement.readyState < 2) {
                    const onTrackLoad = () => {
                        trackElement.removeEventListener('load', onTrackLoad);
                        trackElement.removeEventListener('error', onTrackLoad);
                        requestAnimationFrame(() => {
                            if (this.currentTrack && this.currentTrack.track === selectedTrack.track) {
                                this.updateCaptions();
                            }
                        });
                    };
                    trackElement.addEventListener('load', onTrackLoad, { once: true });
                    trackElement.addEventListener('error', onTrackLoad, { once: true });
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

            // Sync hls.js subtitle rendition to match the selected track language
            this._syncHlsSubtitleTrack(selectedTrack.language, selectedTrack.label);

            this.player.emit('captionsenabled', selectedTrack);
        }
    }

    _cleanupTrackListeners() {
        if (this.currentTrack && this.currentTrack.track) {
            const cueChangeHandler = this.cueChangeHandler;
            if (cueChangeHandler) {
                this.currentTrack.track.removeEventListener('cuechange', cueChangeHandler);
            }
            const altCueChangeHandler = this._altCueChangeHandler;
            if (altCueChangeHandler && this.currentTrack.alternatives) {
                this.currentTrack.alternatives.forEach((alt) => {
                    alt.removeEventListener('cuechange', altCueChangeHandler);
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
        this.element.replaceChildren();
        this.element.removeAttribute('lang');
        this.currentCue = null;
        this.player.state.captionsEnabled = false;
        this.player.emit('captionsdisabled');
    }

    updateCaptions() {
        if (!this.currentTrack || !this.currentTrack.track) {
            return;
        }

        // When the renderer handles its own caption display (e.g. dash.js TTML
        // rendering div), skip VidPly's caption overlay entirely.
        if (this.player.renderer?.handlesOwnCaptions?.()) {
            return;
        }

        // Ensure track mode is set to 'hidden' (not 'disabled') to receive cue updates
        // 'hidden' mode loads cues and fires cuechange events, but doesn't show native captions
        if (this.currentTrack.track.mode === 'disabled') {
            this.currentTrack.track.mode = 'hidden';
        }

        if (this.currentTrack.track.mode === 'showing') {
            this.currentTrack.track.mode = 'hidden';
        }

        if (!this.currentTrack.track.activeCues) {
            if (this.currentTrack.track.cues && this.currentTrack.track.cues.length > 0) {
                if (this.currentCue) {
                    this.element.replaceChildren();
                    this.element.style.display = 'none';
                    this.currentCue = null;
                }
            }
            return;
        }

        const activeCues = this.currentTrack.track.activeCues;
        const isAudioPlayer = this.player.element.tagName.toLowerCase() === 'audio';

        if (activeCues.length > 0) {
            // VTT/SRT subtitle tracks deliver `VTTCue` instances (which extend
            // TextTrackCue with `.text`). The lib.dom typing widens this to
            // `TextTrackCue`, so cast at the boundary.
            const cue = activeCues[0] as VTTCue;

            if (this.currentCue !== cue) {
                this.currentCue = cue;

                const rawText = cue.text || '';
                if (!rawText.trim()) {
                    return;
                }

                const fragment = DOMUtils.renderVTTToDOM(rawText);

                if (isAudioPlayer) {
                    const existingCues = this.element.querySelectorAll(`.${this.player.options.classPrefix}-caption-cue`);
                    existingCues.forEach((el: Element) => el.classList.remove(`${this.player.options.classPrefix}-caption-active`));

                    const cueId = `cue-${cue.startTime}-${cue.endTime}`;
                    let cueElement = this.element.querySelector(`[data-cue-id="${cueId}"]`);

                    if (!cueElement) {
                        cueElement = document.createElement('div');
                        cueElement.className = `${this.player.options.classPrefix}-caption-cue`;
                        cueElement.setAttribute('data-cue-id', cueId);
                        cueElement.replaceChildren(fragment);
                        this.element.appendChild(cueElement);
                    } else {
                        cueElement.replaceChildren(fragment);
                    }

                    cueElement.classList.add(`${this.player.options.classPrefix}-caption-active`);

                    requestAnimationFrame(() => {
                        if (cueElement) {
                            cueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                } else {
                    this.element.replaceChildren(fragment);
                }

                this.element.style.display = 'block';
                this.positionCaptionsOnMobile();
                this.player.emit('captionchange', cue);
            }
        } else if (this.currentCue) {
            if (!isAudioPlayer) {
                this.element.replaceChildren();
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
            if (!this.player.videoWrapper) return;
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

    // VTT formatting is parsed via DOMUtils.renderVTTToDOM() which returns
    // a DocumentFragment built with createElement / createTextNode. The
    // previous regex-based parseVTTFormatting helper was removed because
    // it produced strings that were assigned to `innerHTML`, which is
    // unsafe for cue text from third-party WebVTT sources.

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

    hexToRgba(hex: string, alpha: number) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
        }
        return hex;
    }

    setCaptionStyle(property: string, value: string | number) {
        // The persisted preference shape is mixed (string for font/colors,
        // number for opacity). Cast through the player's loose options
        // index so we don't have to split this method into 5 strongly-typed
        // overloads when the underlying string-keyed bag is itself loose.
        switch (property) {
            case 'fontSize':
                this.player.options.captionsFontSize = String(value);
                break;
            case 'fontFamily':
                this.player.options.captionsFontFamily = String(value);
                break;
            case 'color':
                this.player.options.captionsColor = String(value);
                break;
            case 'backgroundColor':
                this.player.options.captionsBackgroundColor = String(value);
                break;
            case 'opacity':
                this.player.options.captionsOpacity = Number(value);
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
            const matchingIndex = this.tracks.findIndex((t) => t.language === currentLanguage);
            if (matchingIndex >= 0) {
                this.enable(matchingIndex);
            }
        }
        
        return this.tracks.length;
    }

    switchTrack(trackIndex: number) {
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

