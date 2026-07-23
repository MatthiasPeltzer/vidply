/**
 * Unit Tests: MetadataAlertsManager
 *
 * This is the single, scoped processor for metadata-cue directives
 * (PAUSE / FOCUS: / #hashtags). These tests were consolidated here from
 * TranscriptManager once the duplicate cue pipeline was removed, and
 * extended to cover the security-relevant scoping behaviour: an
 * untrusted VTT cue must not be able to move focus to arbitrary
 * elements on the host page unless the embedder explicitly opts into
 * `metadataDirectives: 'global'`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetadataAlertsManager } from '../../src/core/MetadataAlertsManager.js';

describe('MetadataAlertsManager', () => {
  let manager;
  let mockPlayer;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';

    container = document.createElement('div');
    const element = document.createElement('video');
    container.appendChild(element);
    document.body.appendChild(container);

    mockPlayer = {
      options: {
        debug: false,
        // Directives are OFF by default — the secure default.
        metadataDirectives: undefined,
        metadataAlerts: undefined,
        metadataHashtags: undefined
      },
      container,
      element,
      state: { paused: true },
      controlBar: { controls: {} },
      emit: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      log: vi.fn(),
      setManagedTimeout: vi.fn((cb) => { cb(); return 1; })
    };

    manager = new MetadataAlertsManager(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  const cueOf = (text, startTime = 10, endTime = 15) => ({ startTime, endTime, text });

  describe('generic metadata event', () => {
    it('emits a metadata event for every cue', () => {
      const cue = cueOf('Test metadata');
      manager.handleCue(cue);

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata', {
        time: 10,
        endTime: 15,
        text: 'Test metadata',
        cue
      });
    });
  });

  describe('PAUSE directive', () => {
    it('pauses when playing and emits metadata:pause', () => {
      mockPlayer.state.paused = false;
      manager.handleCue(cueOf('PAUSE'));

      expect(mockPlayer.pause).toHaveBeenCalled();
      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:pause', {
        time: 10,
        text: 'PAUSE'
      });
    });

    it('does not pause when already paused', () => {
      mockPlayer.state.paused = true;
      manager.handleCue(cueOf('PAUSE'));

      expect(mockPlayer.pause).not.toHaveBeenCalled();
    });
  });

  describe('FOCUS directive scoping (security)', () => {
    it('does NOT resolve an element when directives are disabled (default)', () => {
      const button = document.createElement('button');
      button.id = 'my-button';
      document.body.appendChild(button);

      manager.handleCue(cueOf('FOCUS:#my-button'));

      // Event still fires, but the element must be null so an untrusted
      // cue cannot steal focus on a page that never opted in.
      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:focus', expect.objectContaining({
        time: 10,
        target: '#my-button',
        element: null
      }));
    });

    it('resolves a document-wide element only under metadataDirectives: "global"', () => {
      mockPlayer.options.metadataDirectives = 'global';
      const button = document.createElement('button');
      button.id = 'my-button';
      document.body.appendChild(button);

      manager.handleCue(cueOf('FOCUS:#my-button'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:focus', expect.objectContaining({
        target: '#my-button',
        element: button
      }));
    });

    it('scoped mode resolves inside the player container only', () => {
      mockPlayer.options.metadataDirectives = 'scoped';
      const inside = document.createElement('button');
      inside.id = 'inside';
      container.appendChild(inside);

      manager.handleCue(cueOf('FOCUS:#inside'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:focus', expect.objectContaining({
        element: inside
      }));
    });

    it('scoped mode does NOT resolve an element outside the container', () => {
      mockPlayer.options.metadataDirectives = 'scoped';
      const outside = document.createElement('button');
      outside.id = 'outside';
      document.body.appendChild(outside); // sibling of container, not inside it

      manager.handleCue(cueOf('FOCUS:#outside'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:focus', expect.objectContaining({
        target: '#outside',
        element: null
      }));
    });

    it('handles FOCUS with a non-existent element', () => {
      manager.handleCue(cueOf('FOCUS:#nonexistent'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:focus', expect.objectContaining({
        target: '#nonexistent',
        element: null
      }));
    });
  });

  describe('hashtag directive', () => {
    it('parses multiple hashtags', () => {
      manager.handleCue(cueOf('Check out #feature and #update'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:hashtags', {
        time: 10,
        hashtags: ['#feature', '#update'],
        text: 'Check out #feature and #update'
      });
    });

    it('parses a single hashtag', () => {
      manager.handleCue(cueOf('Important #milestone'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:hashtags', expect.objectContaining({
        hashtags: ['#milestone']
      }));
    });

    it('parses hashtags with hyphens', () => {
      manager.handleCue(cueOf('#new-feature is ready'));

      expect(mockPlayer.emit).toHaveBeenCalledWith('metadata:hashtags', expect.objectContaining({
        hashtags: ['#new-feature']
      }));
    });

    it('does not emit a hashtag event when there are none', () => {
      manager.handleCue(cueOf('No hashtags here'));

      const hashtagCalls = mockPlayer.emit.mock.calls.filter(
        (call) => call[0] === 'metadata:hashtags'
      );
      expect(hashtagCalls.length).toBe(0);
    });

    it('caps hashtags at 32 per cue', () => {
      const many = Array.from({ length: 50 }, (_, i) => `#tag${i}`).join(' ');
      manager.handleCue(cueOf(many));

      const call = mockPlayer.emit.mock.calls.find((c) => c[0] === 'metadata:hashtags');
      expect(call).toBeTruthy();
      expect(call[1].hashtags.length).toBe(32);
    });
  });
});
