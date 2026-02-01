/**
 * Player Integration Tests
 * Tests Player initialization and basic interactions using jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../src/core/Player.js';

describe('Player', () => {
  let container;

  beforeEach(() => {
    // Create a clean container for each test
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  describe('initialization', () => {
    it('should create a player from a video element', () => {
      const video = document.createElement('video');
      video.id = 'test-video';
      container.appendChild(video);

      const player = new Player(video);

      expect(player).toBeDefined();
      expect(player.element).toBe(video);
    });

    it('should create a player from a selector string', () => {
      const video = document.createElement('video');
      video.id = 'test-video';
      container.appendChild(video);

      const player = new Player('#test-video');

      expect(player).toBeDefined();
      expect(player.element.id).toBe('test-video');
    });

    it('should throw an error if element not found', () => {
      expect(() => new Player('#nonexistent')).toThrow('VidPly: Element not found');
    });

    it('should auto-create media element from div', () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      container.appendChild(div);

      const player = new Player(div, { mediaType: 'video' });

      expect(player.element.tagName).toBe('VIDEO');
    });

    it('should auto-create audio element when mediaType is audio', () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      container.appendChild(div);

      const player = new Player(div, { mediaType: 'audio' });

      expect(player.element.tagName).toBe('AUDIO');
    });

    it('should assign unique instance IDs to each player', () => {
      const video1 = document.createElement('video');
      const video2 = document.createElement('video');
      container.appendChild(video1);
      container.appendChild(video2);

      const player1 = new Player(video1);
      const player2 = new Player(video2);

      expect(player1.instanceId).toBeDefined();
      expect(player2.instanceId).toBeDefined();
      expect(player1.instanceId).not.toBe(player2.instanceId);
    });
  });

  describe('options', () => {
    it('should use default options', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video);

      expect(player.options.responsive).toBe(true);
      expect(player.options.controls).toBe(true);
      expect(player.options.volume).toBe(0.8);
      expect(player.options.playbackSpeed).toBe(1.0);
    });

    it('should merge custom options with defaults', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        volume: 0.5,
        autoplay: true,
        controls: false
      });

      expect(player.options.volume).toBe(0.5);
      expect(player.options.autoplay).toBe(true);
      expect(player.options.controls).toBe(false);
      // Default options should still be present
      expect(player.options.responsive).toBe(true);
    });

    it('should respect width and height options', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        width: 800,
        height: 450
      });

      expect(player.options.width).toBe(800);
      expect(player.options.height).toBe(450);
    });

    it('should handle caption options', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        captions: true,
        captionsDefault: true,
        captionsFontSize: '120%'
      });

      expect(player.options.captions).toBe(true);
      expect(player.options.captionsDefault).toBe(true);
      expect(player.options.captionsFontSize).toBe('120%');
    });
  });

  describe('event system', () => {
    it('should emit events when methods are called', () => {
      const video = document.createElement('video');
      container.appendChild(video);
      const player = new Player(video);

      const listener = vi.fn();
      player.on('testevent', listener);
      player.emit('testevent', { data: 'test' });

      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support once listeners', () => {
      const video = document.createElement('video');
      container.appendChild(video);
      const player = new Player(video);

      const listener = vi.fn();
      player.once('testevent', listener);
      
      player.emit('testevent');
      player.emit('testevent');
      player.emit('testevent');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should allow removing listeners', () => {
      const video = document.createElement('video');
      container.appendChild(video);
      const player = new Player(video);

      const listener = vi.fn();
      player.on('testevent', listener);
      player.off('testevent', listener);
      player.emit('testevent');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('data attribute parsing', () => {
    it('should parse data-vidply-options JSON', () => {
      const video = document.createElement('video');
      video.setAttribute('data-vidply-options', JSON.stringify({
        autoplay: true,
        muted: true
      }));
      container.appendChild(video);

      // The data attribute parsing happens in index.js, not Player directly
      // This test validates that data attributes can be set
      expect(video.dataset.vidplyOptions).toBe('{"autoplay":true,"muted":true}');
    });

    it('should handle boolean data attributes', () => {
      const video = document.createElement('video');
      video.setAttribute('data-autoplay', 'true');
      video.setAttribute('data-loop', 'false');
      container.appendChild(video);

      expect(video.dataset.autoplay).toBe('true');
      expect(video.dataset.loop).toBe('false');
    });
  });

  describe('accessibility features', () => {
    it('should respect signLanguageButton option', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        signLanguageButton: true,
        signLanguageSrc: 'test-sign.mp4'
      });

      expect(player.options.signLanguageButton).toBe(true);
      expect(player.options.signLanguageSrc).toBe('test-sign.mp4');
    });

    it('should respect audioDescriptionButton option', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        audioDescriptionButton: true,
        audioDescriptionSrc: 'test-desc.mp4'
      });

      expect(player.options.audioDescriptionButton).toBe(true);
      expect(player.options.audioDescriptionSrc).toBe('test-desc.mp4');
    });

    it('should respect transcript options', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        transcript: true,
        transcriptButton: true
      });

      expect(player.options.transcript).toBe(true);
      expect(player.options.transcriptButton).toBe(true);
    });
  });

  describe('control options', () => {
    it('should respect individual control button options', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        playPauseButton: true,
        progressBar: true,
        volumeControl: true,
        muteButton: false,
        fullscreenButton: true,
        pipButton: true,
        speedButton: true,
        captionsButton: true,
        chaptersButton: true
      });

      expect(player.options.playPauseButton).toBe(true);
      expect(player.options.progressBar).toBe(true);
      expect(player.options.volumeControl).toBe(true);
      expect(player.options.muteButton).toBe(false);
      expect(player.options.fullscreenButton).toBe(true);
      expect(player.options.pipButton).toBe(true);
      expect(player.options.speedButton).toBe(true);
      expect(player.options.captionsButton).toBe(true);
      expect(player.options.chaptersButton).toBe(true);
    });
  });

  describe('playback options', () => {
    it('should respect seek interval options', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        seekInterval: 5,
        seekIntervalLarge: 60
      });

      expect(player.options.seekInterval).toBe(5);
      expect(player.options.seekIntervalLarge).toBe(60);
    });

    it('should respect hideControlsDelay option', () => {
      const video = document.createElement('video');
      container.appendChild(video);

      const player = new Player(video, {
        hideControlsDelay: 5000
      });

      expect(player.options.hideControlsDelay).toBe(5000);
    });
  });
});
