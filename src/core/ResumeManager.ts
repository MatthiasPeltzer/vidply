/**
 * Resume-playback feature extracted from Player.
 *
 * Owns:
 * - Throttled progress persistence during playback.
 * - "Where were we?" detection on `loadedmetadata`.
 * - Clearing persisted progress on `ended`.
 * - The optional resume prompt (accessible modal with two buttons).
 *
 * Because `resumePlayback` is opt-in, the Player only instantiates
 * this manager when the option is enabled — so pages without the
 * feature don't pay for the extra state / event handlers.
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { i18n } from '../i18n/i18n.js';
import { throttle } from '../utils/PerformanceUtils.js';
import type { Player } from './Player.js';

export class ResumeManager {
  private readonly player: Player;
  private saveProgressThrottled: (() => void) | null = null;
  private resumeChecked = false;
  private listenersAttached = false;

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Wire up the progress-save + resume-check listeners. Safe to call
   * multiple times: repeat calls are no-ops so a re-init path during
   * source switching doesn't stack duplicate listeners.
   */
  init(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    this.saveProgressThrottled = throttle(() => this.saveProgress(), 5000);

    this.player.on('timeupdate', () => {
      if (this.player.state.playing && this.player.state.duration > 0) {
        this.saveProgressThrottled?.();
      }
    });

    // First `loadedmetadata` after init is the only place we should
    // offer to resume — after that the user is in charge of seeking.
    this.player.on('loadedmetadata', () => {
      if (!this.resumeChecked) {
        this.resumeChecked = true;
        this.checkForResume();
      }
    });

    this.player.on('ended', () => {
      const videoId = this.player.getVideoId();
      if (videoId) {
        this.player.storage.clearWatchProgress(videoId);
      }
    });
  }

  /**
   * Persist current playback progress to storage. No-op when the
   * feature is disabled, when the video is too short / at the very
   * start, or when playback is effectively complete.
   */
  saveProgress(): void {
    const player = this.player;
    if (!player.options.resumePlayback) return;

    const videoId = player.getVideoId();
    if (!videoId) return;

    const currentTime = player.state.currentTime;
    const duration = player.state.duration;

    // Resume for tiny clips is more annoying than useful.
    if (duration < 30 || currentTime < (player.options.resumeThreshold as number)) {
      return;
    }

    // Near the end? Don't persist — the user effectively finished.
    const percentage = (currentTime / duration) * 100;
    if (percentage > 95) return;

    player.storage.saveWatchProgress(videoId, currentTime, duration);
  }

  /**
   * Check for a previously-saved resume point for the current video
   * and either auto-resume or show the prompt depending on
   * `options.resumePrompt`. Safe to call manually, e.g. after an
   * external source change.
   */
  checkForResume(): void {
    const player = this.player;
    if (!player.options.resumePlayback) return;

    const videoId = player.getVideoId();
    if (!videoId) return;

    const progress = player.storage.getWatchProgress(videoId);
    if (!progress) return;

    const { currentTime, duration, percentage } = progress;
    const threshold = player.options.resumeThreshold as number;

    // Stale / trivial entries get purged instead of offered.
    if (currentTime < threshold || percentage > 95) {
      player.storage.clearWatchProgress(videoId);
      return;
    }

    // Duration mismatch usually means the source URL points to a new
    // cut of the same video — better to start fresh than resume at a
    // time that's outside the new clip.
    if (player.state.duration > 0 && Math.abs(player.state.duration - duration) > 5) {
      player.storage.clearWatchProgress(videoId);
      return;
    }

    if (player.options.resumePrompt) {
      this.showPrompt(currentTime);
    } else {
      player.seek(currentTime);
    }
  }

  /**
   * Format a time value as `mm:ss` (or `hh:mm:ss` once we cross an
   * hour) for display in the resume prompt label. No localisation is
   * needed because the surrounding prompt text is already localised
   * by i18n.
   */
  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  showPrompt(savedTime: number): void {
    const player = this.player;
    if (player.state.resumePromptVisible || !player.container) return;

    const formattedTime = this.formatTime(savedTime);
    const promptText = i18n.t('resume.prompt', { time: formattedTime });

    player.resumePromptElement = DOMUtils.createElement('div', {
      className: `${player.options.classPrefix}-resume-prompt`,
      attributes: {
        role: 'dialog',
        'aria-label': promptText,
        'aria-modal': 'true'
      }
    });

    const promptContent = DOMUtils.createElement('div', {
      className: `${player.options.classPrefix}-resume-prompt-content`
    });

    const promptMessage = DOMUtils.createElement('p', {
      className: `${player.options.classPrefix}-resume-prompt-message`,
      textContent: promptText
    });

    const buttonContainer = DOMUtils.createElement('div', {
      className: `${player.options.classPrefix}-resume-prompt-buttons`
    });

    const resumeButton = DOMUtils.createElement('button', {
      className: `${player.options.classPrefix}-resume-prompt-button ${player.options.classPrefix}-resume-prompt-button-primary`,
      textContent: i18n.t('resume.resume'),
      attributes: { type: 'button' }
    });
    resumeButton.addEventListener('click', () => {
      this.hidePrompt();
      player.seek(savedTime);
      player.play();
    });

    const startOverButton = DOMUtils.createElement('button', {
      className: `${player.options.classPrefix}-resume-prompt-button`,
      textContent: i18n.t('resume.startOver'),
      attributes: { type: 'button' }
    });
    startOverButton.addEventListener('click', () => {
      this.hidePrompt();
      const videoId = player.getVideoId();
      if (videoId) player.storage.clearWatchProgress(videoId);
      player.seek(0);
      player.play();
    });

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hidePrompt();
      }
    };
    player.resumePromptElement.addEventListener('keydown', handleKeydown);

    buttonContainer.appendChild(resumeButton);
    buttonContainer.appendChild(startOverButton);
    promptContent.appendChild(promptMessage);
    promptContent.appendChild(buttonContainer);
    player.resumePromptElement.appendChild(promptContent);

    player.container.appendChild(player.resumePromptElement);
    player.state.resumePromptVisible = true;

    // Focus the primary button after the element is attached to the DOM
    // so the dialog is immediately keyboard-navigable.
    requestAnimationFrame(() => { resumeButton.focus(); });

    player.emit('resumepromptshow', { savedTime });
  }

  hidePrompt(): void {
    const player = this.player;
    if (!player.resumePromptElement) return;

    player.resumePromptElement.remove();
    player.resumePromptElement = null;
    player.state.resumePromptVisible = false;

    player.emit('resumeprompthide');
  }
}
