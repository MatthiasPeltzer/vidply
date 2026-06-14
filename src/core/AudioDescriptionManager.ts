/**
 * Audio Description Manager
 * Handles audio-described video source switching and caption track swapping
 */

import { CaptionManager } from '../controls/CaptionManager.js';
import type { Player } from './Player.js';
import { DescriptionSpeechManager } from './DescriptionSpeechManager.js';

export type AudioDescriptionDeliveryMode = 'swap' | 'vtt_speech' | 'none';

/**
 * Caption-track entry tracked by the audio-description manager. Each
 * entry pairs a `<track>` element with its described/original source
 * URLs so the manager can swap the rendered captions when the user
 * toggles audio description.
 */
interface CaptionTrackInfo {
    trackElement: HTMLTrackElement;
    originalSrc: string | null;
    describedSrc: string;
    originalTrackSrc: string | null;
    explicit: boolean;
}

export class AudioDescriptionManager {
    player: Player;
    captionTracks: CaptionTrackInfo[];
    desiredState: boolean;
    enabled: boolean;
    originalSource: string | null;
    sourceElement: Element | null;
    src: string | null;
    speechManager: DescriptionSpeechManager | null;

    constructor(player: Player) {
        this.player = player;
        
        // State
        this.enabled = false;
        this.desiredState = false;
        
        // Sources
        this.src = player.options.audioDescriptionSrc;
        this.sourceElement = null;
        this.originalSource = null;
        this.captionTracks = [];
        this.speechManager = null;
    }

    /**
     * Whether a described video source swap is configured.
     */
    _hasSwapSource(): boolean {
        const hasSourceElementsWithDesc = this.player.sourceElements.some(
            (el: Element) => el.getAttribute('data-desc-src')
        );
        return Boolean(this.src || hasSourceElementsWithDesc);
    }

    /**
     * Whether a descriptions VTT track is present on the media element.
     */
    _hasDescriptionsTrack(): boolean {
        return Boolean(this.player.findTextTrack('descriptions'));
    }

    /**
     * Resolve which audio-description delivery mode applies for the current media.
     */
    resolveDeliveryMode(): AudioDescriptionDeliveryMode {
        const configured = this.player.options.audioDescriptionMode ?? 'auto';
        const hasSwap = this._hasSwapSource();
        const hasDescriptions = this._hasDescriptionsTrack();

        if (configured === 'swap') {
            return hasSwap ? 'swap' : 'none';
        }
        if (configured === 'vtt_speech') {
            return hasDescriptions ? 'vtt_speech' : 'none';
        }
        // auto: described video takes precedence over VTT speech
        if (hasSwap) {
            return 'swap';
        }
        if (hasDescriptions) {
            return 'vtt_speech';
        }
        return 'none';
    }

    _ensureSpeechManager(): DescriptionSpeechManager {
        if (!this.speechManager) {
            this.speechManager = new DescriptionSpeechManager(this.player);
        }
        return this.speechManager;
    }

    /**
     * Initialize audio description from source elements
     * Called during player initialization
     */
    initFromSourceElements(sourceElements: Element[], trackElements: Element[]) {
        // Check for source elements with audio description attributes
        for (const sourceEl of sourceElements) {
            const descSrc = sourceEl.getAttribute('data-desc-src');
            const origSrc = sourceEl.getAttribute('data-orig-src');
            
            if (descSrc || origSrc) {
                if (!this.sourceElement) {
                    this.sourceElement = sourceEl;
                }
                
                if (origSrc) {
                    if (!this.originalSource) {
                        this.originalSource = origSrc;
                    }
                    if (!this.player.originalSrc) {
                        this.player.originalSrc = origSrc;
                    }
                } else {
                    const currentSrcAttr = sourceEl.getAttribute('src');
                    if (!this.originalSource && currentSrcAttr) {
                        this.originalSource = currentSrcAttr;
                    }
                    if (!this.player.originalSrc && currentSrcAttr) {
                        this.player.originalSrc = currentSrcAttr;
                    }
                }
                
                if (descSrc && !this.src) {
                    this.src = descSrc;
                }
            }
        }

        // Check for text tracks with audio description versions
        trackElements.forEach((trackEl: Element) => {
            const trackKind = trackEl.getAttribute('kind');
            const trackDescSrc = trackEl.getAttribute('data-desc-src');

            if ((trackKind === 'captions' || trackKind === 'subtitles' ||
                 trackKind === 'chapters' || trackKind === 'descriptions') &&
                 trackDescSrc && trackEl instanceof HTMLTrackElement) {
                this.captionTracks.push({
                    trackElement: trackEl,
                    originalSrc: trackEl.getAttribute('src'),
                    describedSrc: trackDescSrc,
                    originalTrackSrc: trackEl.getAttribute('data-orig-src') || trackEl.getAttribute('src'),
                    explicit: true
                });
                this.player.log(`Found explicit described ${trackKind} track: ${trackEl.getAttribute('src')} -> ${trackDescSrc}`);
            }
        });
    }

    /**
     * Check if audio description is available
     */
    isAvailable() {
        const mode = this.resolveDeliveryMode();
        if (mode === 'swap' || mode === 'vtt_speech') {
            return true;
        }
        return this.captionTracks.length > 0;
    }

    /**
     * Enable audio description
     */
    async enable() {
        const deliveryMode = this.resolveDeliveryMode();
        const hasTracksWithDesc = this.captionTracks.length > 0;

        if (deliveryMode === 'none' && !hasTracksWithDesc) {
            console.warn('VidPly: No audio description source, descriptions track, or tracks provided');
            return;
        }

        this.desiredState = true;

        if (deliveryMode === 'vtt_speech') {
            const speechManager = this._ensureSpeechManager();
            const started = speechManager.enable();
            if (!started) {
                console.warn('VidPly: No descriptions track available for VTT speech mode');
                return;
            }
            this.enabled = true;
            this.player.state.audioDescriptionEnabled = true;
            this.player.emit('audiodescriptionenabled');
            return;
        }

        // Store current state for restoration
        const currentTime = this.player.state.currentTime;
        const wasPlaying = this.player.state.playing;
        const posterValue = (this.player.element as HTMLVideoElement).poster || 
                           this.player.element.getAttribute('poster') || 
                           this.player.options.poster;
        const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;

        // Get current caption text for synchronization
        const currentCaptionText = this._getCurrentCaptionText();

        // Switch to audio-described version based on what's available
        if (this.sourceElement) {
            // Use source element approach (data-desc-src on <source> elements)
            await this._enableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
        } else if (this.src) {
            // Use direct src approach (audioDescriptionSrc option)
            await this._enableWithDirectSrc(currentTime, wasPlaying, posterValue, shouldKeepPoster);
        } else if (hasTracksWithDesc) {
            // Only caption tracks with descriptions - swap tracks without changing video source
            await this._swapCaptionTracks(true);
            this.enabled = true;
            this.player.emit('audiodescriptionenabled');
        }
        // If none of the above, we already returned at the top check
    }

    /**
     * Disable audio description
     */
    async disable() {
        this.desiredState = false;

        if (this.speechManager?.enabled) {
            this.speechManager.disable();
            this.enabled = false;
            this.player.state.audioDescriptionEnabled = false;
            this.player.emit('audiodescriptiondisabled');
            return;
        }

        // If we only had caption tracks (no video source swap), just swap tracks back
        const hasTracksWithDesc = this.captionTracks.length > 0;
        if (!this.sourceElement && !this.src && hasTracksWithDesc) {
            await this._swapCaptionTracks(false);
            this.enabled = false;
            this.player.emit('audiodescriptiondisabled');
            return;
        }

        if (!this.player.originalSrc) {
            return;
        }

        // Store current state
        const currentTime = this.player.state.currentTime;
        const wasPlaying = this.player.state.playing;
        const posterValue = (this.player.element as HTMLVideoElement).poster || 
                           this.player.element.getAttribute('poster') || 
                           this.player.options.poster;
        const shouldKeepPoster = currentTime < 0.1 && !wasPlaying;

        // Get current caption for sync
        const currentCaptionText = this._getCurrentCaptionText();

        if (this.sourceElement) {
            await this._disableWithSourceElement(currentTime, wasPlaying, posterValue, shouldKeepPoster, currentCaptionText);
        } else if (this.src) {
            await this._disableWithDirectSrc(currentTime, wasPlaying, posterValue);
        }
    }

    /**
     * Toggle audio description
     */
    async toggle() {
        const deliveryMode = this.resolveDeliveryMode();
        const descriptionTrack = this.player.findTextTrack('descriptions');
        const hasSwapOrTracks = this._hasSwapSource() || this.captionTracks.length > 0;

        if (deliveryMode === 'vtt_speech') {
            if (this.enabled) {
                await this.disable();
            } else {
                await this.enable();
            }
            return;
        }

        if (descriptionTrack && !hasSwapOrTracks) {
            // Text-only fallback when speech synthesis is unavailable
            if (descriptionTrack.mode === 'showing') {
                descriptionTrack.mode = 'hidden';
                this.enabled = false;
                this.player.state.audioDescriptionEnabled = false;
                this.player.emit('audiodescriptiondisabled');
            } else {
                descriptionTrack.mode = 'showing';
                this.enabled = true;
                this.player.state.audioDescriptionEnabled = true;
                this.player.emit('audiodescriptionenabled');
            }
        } else if (descriptionTrack && hasSwapOrTracks) {
            // Toggle both
            if (this.enabled) {
                this.desiredState = false;
                await this.disable();
            } else {
                descriptionTrack.mode = 'showing';
                this.desiredState = true;
                await this.enable();
            }
        } else if (hasSwapOrTracks) {
            // Toggle source swap
            if (this.enabled) {
                this.desiredState = false;
                await this.disable();
            } else {
                this.desiredState = true;
                await this.enable();
            }
        }
    }

    /**
     * Get current caption text for synchronization
     */
    _getCurrentCaptionText() {
        if (this.player.captionManager && 
            this.player.captionManager.currentTrack && 
            this.player.captionManager.currentCue) {
            return this.player.captionManager.currentCue.text;
        }
        return null;
    }

    /**
     * Validate that a track URL exists. Bounded by the player's lifecycle
     * AbortController + an 8s timeout so a torn-down player cannot leak
     * the request.
     */
    async _validateTrackExists(url: string): Promise<boolean> {
        if (typeof url !== 'string' || !url) return false;
        const signals: AbortSignal[] = [];
        const lifecycle = (this.player as { lifecycleSignal?: AbortSignal }).lifecycleSignal;
        if (lifecycle) signals.push(lifecycle);
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            signals.push(AbortSignal.timeout(8000));
        }
        let signal: AbortSignal | undefined;
        if (signals.length === 1) signal = signals[0];
        else if (signals.length > 1) {
            const anyFn = (AbortSignal as { any?: (s: AbortSignal[]) => AbortSignal }).any;
            signal = anyFn ? anyFn(signals) : signals[0];
        }
        try {
            const response = await fetch(url, { method: 'HEAD', signal });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Swap caption tracks to described versions
     */
    async _swapCaptionTracks(toDescribed = true) {
        if (this.captionTracks.length === 0) return [];

        const swappedTracks: CaptionTrackInfo[] = [];
        
        const validationPromises = this.captionTracks.map(async (trackInfo) => {
            if (trackInfo.trackElement && trackInfo.describedSrc) {
                if (trackInfo.explicit === true) {
                    const url = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
                    if (!url) return { trackInfo, exists: false };
                    try {
                        const exists = await this._validateTrackExists(url);
                        return { trackInfo, exists };
                    } catch {
                        return { trackInfo, exists: false };
                    }
                }
            }
            return { trackInfo, exists: false };
        });
        
        const validationResults = await Promise.all(validationPromises);
        const tracksToSwap = validationResults.filter(result => result.exists);
        
        if (tracksToSwap.length > 0) {
            // Store track modes before removing
            const trackModes = new Map();
            tracksToSwap.forEach(({ trackInfo }) => {
                const textTrack = trackInfo.trackElement.track;
                if (textTrack) {
                    trackModes.set(trackInfo, {
                        wasShowing: textTrack.mode === 'showing',
                        wasHidden: textTrack.mode === 'hidden'
                    });
                } else {
                    trackModes.set(trackInfo, { wasShowing: false, wasHidden: false });
                }
            });
            
            // Store track info and remove
            const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
                const attributes: Record<string, string> = {};
                Array.from(trackInfo.trackElement.attributes).forEach((attr: Attr) => {
                    attributes[attr.name] = attr.value;
                });
                
                const result = {
                    trackInfo,
                    oldSrc: trackInfo.trackElement.getAttribute('src'),
                    parent: trackInfo.trackElement.parentNode,
                    nextSibling: trackInfo.trackElement.nextSibling,
                    attributes
                };
                
                trackInfo.trackElement.remove();
                return result;
            });
            
            // Force browser to process removal
            this.player.element.load();
            
            // Re-add tracks with new src. Use a managed timeout so the swap
            // is cancelled (and won't mutate a torn-down player) on destroy.
            await new Promise<void>(resolve => {
                this.player.setManagedTimeout(() => {
                    tracksToReadd.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
                        const newSrc = toDescribed ? trackInfo.describedSrc : trackInfo.originalSrc;
                        if (!newSrc) {
                            // Skip tracks without a usable src; no swap can occur.
                            return;
                        }
                        swappedTracks.push(trackInfo);

                        const newTrackElement = document.createElement('track');
                        newTrackElement.setAttribute('src', newSrc);
                        
                        Object.keys(attributes).forEach(attrName => {
                            const attrValue = attributes[attrName];
                            if (attrName !== 'src' && attrName !== 'data-desc-src' && attrValue !== undefined) {
                                newTrackElement.setAttribute(attrName, attrValue);
                            }
                        });
                        
                        // Use the player's video element as parent if the original parent is null
                        const targetParent = parent || this.player.element;
                        
                        if (nextSibling && nextSibling.parentNode) {
                            targetParent.insertBefore(newTrackElement, nextSibling);
                        } else {
                            targetParent.appendChild(newTrackElement);
                        }
                        
                        trackInfo.trackElement = newTrackElement;
                    });
                    
                    this.player.invalidateTrackCache();
                    
                    // Setup new tracks
                    const setupNewTracks = () => {
                        this.player.setManagedTimeout(() => {
                            swappedTracks.forEach((trackInfo) => {
                                const trackElement = trackInfo.trackElement;
                                const newTextTrack = trackElement.track;
                                if (newTextTrack) {
                                    const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                                    newTextTrack.mode = 'hidden';

                                    const restoreMode = () => {
                                        if (modeInfo.wasShowing || modeInfo.wasHidden) {
                                            newTextTrack.mode = 'hidden';
                                        } else {
                                            newTextTrack.mode = 'disabled';
                                        }
                                    };

                                    // `readyState` and the `load`/`error`
                                    // events live on `<track>`, not on
                                    // the underlying TextTrack object.
                                    if (trackElement.readyState >= 2) {
                                        restoreMode();
                                    } else {
                                        trackElement.addEventListener('load', restoreMode, { once: true });
                                        trackElement.addEventListener('error', restoreMode, { once: true });
                                    }
                                }
                            });
                        }, 300);
                    };
                    
                    if (this.player.element.readyState >= 1) {
                        this.player.setManagedTimeout(setupNewTracks, 200);
                    } else {
                        this.player.element.addEventListener('loadedmetadata', setupNewTracks, { once: true });
                        this.player.setManagedTimeout(setupNewTracks, 2000);
                    }
                    
                    resolve();
                }, 100);
            });
        }
        
        return swappedTracks;
    }

    /**
     * Update source elements to described versions
     */
    _updateSourceElements(toDescribed = true) {
        const sourceElements = this.player.sourceElements;
        const sourcesToUpdate: Array<{ src: string | null; type: string | null; origSrc: string | null; descSrc: string | null }> = [];
        
        sourceElements.forEach((sourceEl: Element) => {
            const descSrcAttr = sourceEl.getAttribute('data-desc-src');
            const currentSrc = sourceEl.getAttribute('src');
            
            if (descSrcAttr) {
                const type = sourceEl.getAttribute('type');
                const origSrc = sourceEl.getAttribute('data-orig-src') || currentSrc;
                
                sourcesToUpdate.push({
                    src: toDescribed ? descSrcAttr : origSrc,
                    type,
                    origSrc,
                    descSrc: descSrcAttr
                });
            } else {
                sourcesToUpdate.push({
                    src: sourceEl.getAttribute('src'),
                    type: sourceEl.getAttribute('type'),
                    origSrc: null,
                    descSrc: null
                });
            }
        });
        
        // Remove src attribute if present
        if (this.player.element.hasAttribute('src')) {
            this.player.element.removeAttribute('src');
        }
        
        // Remove all source elements
        sourceElements.forEach((sourceEl: Element) => sourceEl.remove());
        
        // Re-add with updated src
        sourcesToUpdate.forEach((sourceInfo) => {
            if (!sourceInfo.src) {
                return;
            }
            const newSource = document.createElement('source');
            newSource.setAttribute('src', sourceInfo.src);
            if (sourceInfo.type) {
                newSource.setAttribute('type', sourceInfo.type);
            }
            if (sourceInfo.origSrc) {
                newSource.setAttribute('data-orig-src', sourceInfo.origSrc);
            }
            if (sourceInfo.descSrc) {
                newSource.setAttribute('data-desc-src', sourceInfo.descSrc);
            }
            
            const firstTrack = this.player.element.querySelector('track');
            if (firstTrack) {
                this.player.element.insertBefore(newSource, firstTrack);
            } else {
                this.player.element.appendChild(newSource);
            }
        });
        
        this.player._sourceElementsDirty = true;
        this.player._sourceElementsCache = null;
    }

    /**
     * Wait for media to be ready
     */
    async _waitForMediaReady(needSeek = false) {
        // Wait for metadata
        await new Promise<void>((resolve) => {
            if (this.player.element.readyState >= 1) {
                resolve();
            } else {
                const onLoad = () => {
                    this.player.element.removeEventListener('loadedmetadata', onLoad);
                    resolve();
                };
                this.player.element.addEventListener('loadedmetadata', onLoad);
            }
        });
        
        // Wait for tracks
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Wait for playback if needed
        if (needSeek) {
            await new Promise<void>((resolve) => {
                if (this.player.element.readyState >= 3) {
                    resolve();
                } else {
                    const onCanPlay = () => {
                        this.player.element.removeEventListener('canplay', onCanPlay);
                        this.player.element.removeEventListener('canplaythrough', onCanPlay);
                        resolve();
                    };
                    this.player.element.addEventListener('canplay', onCanPlay, { once: true });
                    this.player.element.addEventListener('canplaythrough', onCanPlay, { once: true });
                    setTimeout(() => {
                        this.player.element.removeEventListener('canplay', onCanPlay);
                        this.player.element.removeEventListener('canplaythrough', onCanPlay);
                        resolve();
                    }, 3000);
                }
            });
        }
    }

    /**
     * Restore playback state after source change
     */
    async _restorePlaybackState(currentTime: number, wasPlaying: boolean, shouldKeepPoster: boolean, currentCaptionText: string | null) {
        // Try to find matching caption for sync
        let syncTime = currentTime;
        if (currentCaptionText && this.player.captionManager && this.player.captionManager.tracks.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const matchingTime = this.player.findMatchingCaptionTime(
                currentCaptionText, 
                this.player.captionManager.tracks
            );
            if (matchingTime !== null) {
                syncTime = matchingTime;
                if (this.player.options.debug) {
                    this.player.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
                }
            }
        }
        
        // Seek
        if (syncTime > 0) {
            this.player.seek(syncTime);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Play/pause
        if (wasPlaying) {
            await this.player.play();
            this.player.setManagedTimeout(() => {
                this.player.hidePosterOverlay();
            }, 100);
        } else {
            this.player.pause();
            if (!shouldKeepPoster) {
                this.player.hidePosterOverlay();
            }
        }
    }

    /**
     * Enable with source element method
     */
    async _enableWithSourceElement(currentTime: number, wasPlaying: boolean, posterValue: string | null, shouldKeepPoster: boolean, currentCaptionText: string | null) {
        // Swap caption tracks
        await this._swapCaptionTracks(true);
        
        // Update source elements
        this._updateSourceElements(true);
        
        // Preserve poster
        if (posterValue && this.player.element.tagName === 'VIDEO') {
            (this.player.element as HTMLVideoElement).poster = posterValue;
        }
        
        // Reload
        this.player.element.load();
        
        // Wait for ready
        await this._waitForMediaReady(currentTime > 0 || wasPlaying);
        
        // Restore playback
        await this._restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText);
        
        // Update state
        if (!this.desiredState) return;
        this.enabled = true;
        this.player.state.audioDescriptionEnabled = true;
        this.player.emit('audiodescriptionenabled');
        
        // Reload transcript if visible
        this._reloadTranscript();
    }

    /**
     * Enable with direct src method
     */
    async _enableWithDirectSrc(currentTime: number, wasPlaying: boolean, posterValue: string | null, shouldKeepPoster: boolean) {
        // Swap caption tracks
        await this._swapCaptionTracks(true);
        
        // Set poster
        if (posterValue && this.player.element.tagName === 'VIDEO') {
            (this.player.element as HTMLVideoElement).poster = posterValue;
        }
        
        // Set src (this method should only be called when this.src exists)
        if (!this.src) return;
        this.player.element.src = this.src;
        
        // Wait and restore
        await this._waitForMediaReady(currentTime > 0 || wasPlaying);
        
        if (currentTime > 0) {
            this.player.seek(currentTime);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (wasPlaying) {
            await this.player.play();
        } else {
            this.player.pause();
            if (!shouldKeepPoster) {
                this.player.hidePosterOverlay();
            }
        }
        
        if (!this.desiredState) return;
        this.enabled = true;
        this.player.state.audioDescriptionEnabled = true;
        this.player.emit('audiodescriptionenabled');
        
        // Reload transcript if visible
        this._reloadTranscript();
    }

    /**
     * Disable with source element method
     */
    async _disableWithSourceElement(currentTime: number, wasPlaying: boolean, posterValue: string | null, shouldKeepPoster: boolean, currentCaptionText: string | null) {
        // Swap caption tracks back
        await this._swapCaptionTracks(false);
        
        // Update source elements
        this._updateSourceElements(false);
        
        // Preserve poster
        if (posterValue && this.player.element.tagName === 'VIDEO') {
            (this.player.element as HTMLVideoElement).poster = posterValue;
        }
        
        // Reload
        this.player.element.load();
        this.player.invalidateTrackCache();
        
        // Wait for ready
        await this._waitForMediaReady(currentTime > 0 || wasPlaying);
        
        // Restore playback
        await this._restorePlaybackState(currentTime, wasPlaying, shouldKeepPoster, currentCaptionText);
        
        // Reinitialize caption manager
        if (this.player.captionManager) {
            this.player.captionManager.destroy();
            this.player.captionManager = new CaptionManager(this.player);
        }
        
        // Update state
        if (this.desiredState) return;
        this.enabled = false;
        this.player.state.audioDescriptionEnabled = false;
        this.player.emit('audiodescriptiondisabled');
        
        // Reload transcript if visible
        this._reloadTranscript();
    }

    /**
     * Disable with direct src method
     */
    async _disableWithDirectSrc(currentTime: number, wasPlaying: boolean, posterValue: string | null) {
        // Swap caption tracks back
        await this._swapCaptionTracks(false);
        
        // Set poster
        if (posterValue && this.player.element.tagName === 'VIDEO') {
            (this.player.element as HTMLVideoElement).poster = posterValue;
        }
        
        // Restore original src
        const originalSrcToUse = this.originalSource || this.player.originalSrc;
        if (!originalSrcToUse) {
            return;
        }
        this.player.element.src = originalSrcToUse;
        this.player.element.load();
        
        // Wait and restore
        await this._waitForMediaReady(currentTime > 0 || wasPlaying);
        
        if (currentTime > 0) {
            this.player.seek(currentTime);
        }
        
        if (wasPlaying) {
            await this.player.play();
        }
        
        if (this.desiredState) return;
        this.enabled = false;
        this.player.state.audioDescriptionEnabled = false;
        this.player.emit('audiodescriptiondisabled');
        
        // Reload transcript if visible
        this._reloadTranscript();
    }

    /**
     * Reload transcript after audio description state change
     */
    _reloadTranscript() {
        if (this.player.transcriptManager && this.player.transcriptManager.isVisible) {
            // Wait for tracks to load after source swap
            this.player.setManagedTimeout(() => {
                if (this.player.transcriptManager && this.player.transcriptManager.loadTranscriptData) {
                    this.player.transcriptManager.loadTranscriptData();
                }
            }, 800);
        }
    }

    /**
     * Update sources (called when playlist changes)
     */
    updateSources(audioDescriptionSrc: string | null | undefined) {
        this.speechManager?.destroy();
        this.speechManager = null;
        this.src = audioDescriptionSrc || null;
        // Reset state for new playlist item
        this.enabled = false;
        this.desiredState = false;
        this.sourceElement = null;
        this.originalSource = null;
        this.captionTracks = [];
    }
    
    /**
     * Reinitialize from current player elements (called after playlist loads new tracks)
     */
    reinitialize() {
        this.player.invalidateTrackCache();
        this.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.speechManager?.destroy();
        this.speechManager = null;
        this.enabled = false;
        this.desiredState = false;
        this.captionTracks = [];
        this.sourceElement = null;
        this.originalSource = null;
    }
}

