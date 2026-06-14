/**
 * Unit Tests: DescriptionSpeechManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DescriptionSpeechManager } from '../../src/core/DescriptionSpeechManager.js';

describe('DescriptionSpeechManager', () => {
  let manager;
  let mockPlayer;
  let mockTrack;

  beforeEach(() => {
    mockTrack = {
      kind: 'descriptions',
      language: 'en',
      mode: 'disabled',
      activeCues: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    mockPlayer = {
      options: {
        language: 'en',
        audioDescriptionSpeech: true,
        audioDescriptionExtended: true
      },
      element: document.createElement('video'),
      captionManager: null,
      emit: vi.fn(),
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      state: {
        playing: true,
        paused: false,
        currentTime: 1
      }
    };
    mockPlayer.element.appendChild(document.createElement('track'));

    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn()
    };
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        this.lang = '';
        this.onend = null;
        this.onerror = null;
      }
    };

    manager = new DescriptionSpeechManager(mockPlayer);
    vi.spyOn(manager, 'findDescriptionTrack').mockReturnValue(mockTrack);
  });

  afterEach(() => {
    manager?.destroy();
    document.body.innerHTML = '';
  });

  it('enables cuechange listener and keeps track hidden when speech is available', () => {
    const result = manager.enable();

    expect(result).toBe(true);
    expect(manager.enabled).toBe(true);
    expect(mockTrack.mode).toBe('hidden');
    expect(mockTrack.addEventListener).toHaveBeenCalledWith('cuechange', expect.any(Function));
    expect(mockPlayer.on).toHaveBeenCalledWith('seeked', expect.any(Function));
  });

  it('falls back to showing mode when speech synthesis is unavailable', () => {
    mockPlayer.options.audioDescriptionSpeech = false;
    const result = manager.enable();

    expect(result).toBe(true);
    expect(mockTrack.mode).toBe('showing');
  });

  it('pauses playback and speaks active cue text', () => {
    manager.enable();

    const cue = {
      startTime: 1,
      endTime: 4,
      text: ' A blue circle appears. '
    };
    mockTrack.activeCues = [cue];

    manager.handleCueChange();

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect(mockPlayer.emit).toHaveBeenCalledWith(
      'audiodescriptioncuestart',
      expect.objectContaining({ text: 'A blue circle appears.' })
    );
  });

  it('resumes playback after utterance ends when extended mode is enabled', () => {
    manager.enable();

    const cue = {
      startTime: 1,
      endTime: 4,
      text: 'Description text'
    };
    mockTrack.activeCues = [cue];
    manager.handleCueChange();

    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    utterance.onend();

    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockPlayer.emit).toHaveBeenCalledWith(
      'audiodescriptioncueend',
      expect.objectContaining({ text: 'Description text' })
    );
  });

  it('cancels speech on disable', () => {
    manager.enable();
    manager.disable();

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(mockTrack.removeEventListener).toHaveBeenCalled();
    expect(mockPlayer.off).toHaveBeenCalledWith('seeked', expect.any(Function));
  });
});
