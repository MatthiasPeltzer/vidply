/**
 * Extended audio description via WebVTT descriptions cues and speech synthesis.
 * Pauses the video, speaks the cue text, then resumes playback when finished.
 */

import type { Player } from './Player.js';

export interface DescriptionCueDetail {
    time: number;
    endTime: number;
    text: string;
    cue: TextTrackCue;
}

export class DescriptionSpeechManager {
    player: Player;
    enabled = false;
    descriptionTrack: TextTrack | null = null;
    cueChangeHandler: (() => void) | null = null;
    seekedHandler: (() => void) | null = null;
    wasPlayingBeforeCue = false;
    speaking = false;
    lastSpokenCueKey: string | null = null;
    private _pendingUtterance: SpeechSynthesisUtterance | null = null;

    constructor(player: Player) {
        this.player = player;
    }

    /**
     * Whether speech synthesis is available and enabled in player options.
     */
    canUseSpeech(): boolean {
        if (this.player.options.audioDescriptionSpeech === false) {
            return false;
        }
        return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }

    /**
     * Resolve the descriptions track, preferring the active caption language.
     */
    findDescriptionTrack(): TextTrack | null {
        const textTracks = this.player.element
            ? Array.from(this.player.element.textTracks || [])
            : [];

        const descriptionsTracks = textTracks.filter(
            (track) => track.kind === 'descriptions' && !(track as TextTrack & { _vidplyStale?: boolean })._vidplyStale
        );

        if (descriptionsTracks.length === 0) {
            return null;
        }

        const captionLang = this.player.captionManager?.currentTrack?.track?.language;
        if (captionLang) {
            const match = descriptionsTracks.find((track) => track.language === captionLang);
            if (match) {
                return match;
            }
        }

        return descriptionsTracks[0] ?? null;
    }

    /**
     * Enable VTT speech mode: wire cuechange/seeked listeners.
     */
    enable(): boolean {
        const track = this.findDescriptionTrack();
        if (!track) {
            return false;
        }

        if (!this.canUseSpeech()) {
            track.mode = 'showing';
            return true;
        }

        this.descriptionTrack = track;
        track.mode = 'hidden';

        this.cueChangeHandler = () => {
            this.handleCueChange();
        };
        track.addEventListener('cuechange', this.cueChangeHandler);

        this.seekedHandler = () => {
            this.cancelSpeech();
            this.lastSpokenCueKey = null;
            this.handleCueChange();
        };
        this.player.on('seeked', this.seekedHandler);

        this.enabled = true;
        this.handleCueChange();
        return true;
    }

    /**
     * Disable VTT speech mode and restore track state.
     */
    disable(): void {
        this.cancelSpeech();
        this.lastSpokenCueKey = null;
        this.enabled = false;

        if (this.descriptionTrack && this.cueChangeHandler) {
            this.descriptionTrack.removeEventListener('cuechange', this.cueChangeHandler);
        }
        if (this.seekedHandler) {
            this.player.off('seeked', this.seekedHandler);
        }

        if (this.descriptionTrack) {
            this.descriptionTrack.mode = 'hidden';
        }

        this.cueChangeHandler = null;
        this.seekedHandler = null;
        this.descriptionTrack = null;
        this.wasPlayingBeforeCue = false;
    }

    /**
     * Handle active description cues on the wired track.
     */
    handleCueChange(): void {
        if (!this.enabled || !this.descriptionTrack || !this.canUseSpeech()) {
            return;
        }

        const activeCues = this.descriptionTrack.activeCues;
        if (!activeCues || activeCues.length === 0) {
            return;
        }

        const cue = activeCues[0] as VTTCue;
        const text = cue.text?.trim();
        if (!text) {
            return;
        }

        const cueKey = `${cue.startTime}:${cue.endTime}:${text}`;
        if (this.speaking && this.lastSpokenCueKey === cueKey) {
            return;
        }
        if (this.lastSpokenCueKey === cueKey && !this.player.state.playing) {
            return;
        }

        this.speakCue(cue, cueKey);
    }

    /**
     * Pause playback and speak a description cue.
     */
    speakCue(cue: VTTCue, cueKey: string): void {
        if (!this.canUseSpeech()) {
            return;
        }

        // Do not hijack an intentional user pause (video already paused and not mid-speech).
        if (this.player.state.paused && !this.speaking && !this.wasPlayingBeforeCue) {
            return;
        }

        this.cancelSpeech();

        this.wasPlayingBeforeCue = this.player.state.playing;
        if (this.wasPlayingBeforeCue) {
            this.player.pause();
        }

        this.speaking = true;
        this.lastSpokenCueKey = cueKey;

        const detail: DescriptionCueDetail = {
            time: cue.startTime,
            endTime: cue.endTime,
            text: cue.text.trim(),
            cue
        };
        this.player.emit('audiodescriptioncuestart', detail);

        const utterance = new SpeechSynthesisUtterance(detail.text);
        const lang = this.descriptionTrack?.language || this.player.options.language || 'en';
        utterance.lang = lang;

        const finish = () => {
            if (this._pendingUtterance !== utterance) {
                return;
            }
            this._pendingUtterance = null;
            this.speaking = false;
            this.player.emit('audiodescriptioncueend', detail);

            const extended = this.player.options.audioDescriptionExtended !== false;
            const shouldResume = extended
                ? this.wasPlayingBeforeCue
                : this.wasPlayingBeforeCue && this.player.state.currentTime < cue.endTime;

            if (shouldResume && this.enabled) {
                void this.player.play();
            }
            this.wasPlayingBeforeCue = false;
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        this._pendingUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    /**
     * Cancel any in-progress speech synthesis.
     */
    cancelSpeech(): void {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this._pendingUtterance = null;
        this.speaking = false;
        this.wasPlayingBeforeCue = false;
    }

    destroy(): void {
        this.disable();
    }
}
