/**
 * Playlist Manager - Handles multiple media items in a playlist
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';

export default class PlaylistManager {
  constructor(player, options = {}) {
    this.player = player;
    this.options = {
      autoAdvance: true,
      loop: false,
      showPanel: true,
      ...options
    };

    this.playlist = [];
    this.currentIndex = 0;
    this.panel = null;
    this.trackInfoElement = null;

    this.init();
  }

  init() {
    // Create playlist panel if needed
    if (this.options.showPanel) {
      this.createPlaylistPanel();
    }

    // Create track info display
    this.createTrackInfo();

    // Listen for media end events
    this.player.on('ended', () => {
      if (this.options.autoAdvance && this.hasNext()) {
        this.next();
      } else if (this.options.loop) {
        this.play(0);
      }
    });

    // Listen for track changes
    this.player.on('loadedmetadata', () => {
      this.updateTrackInfo();
    });
  }

  /**
   * Load a playlist
   * @param {Array} items - Array of playlist items { src, type, title, artist, poster, captions }
   */
  loadPlaylist(items) {
    console.log('VidPly Playlist: Loading', items.length, 'items');
    this.playlist = items;
    this.currentIndex = 0;

    if (this.panel) {
      this.renderPlaylistPanel();
    }

    // Load first track
    if (items.length > 0) {
      this.play(0);
    }
  }

  /**
   * Add an item to the playlist
   * @param {Object} item - Playlist item
   */
  addItem(item) {
    this.playlist.push(item);
    if (this.panel) {
      this.renderPlaylistPanel();
    }
  }

  /**
   * Play a specific track by index
   * @param {number} index - Track index
   */
  play(index) {
    if (index < 0 || index >= this.playlist.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }

    console.log('VidPly Playlist: Playing track', index, this.playlist[index].title);
    this.currentIndex = index;
    const item = this.playlist[index];

    // Load the new source
    this.player.load({
      src: item.src,
      type: item.type,
      poster: item.poster,
      tracks: item.tracks || item.captions
    });

    // Update UI
    this.updateTrackInfo();
    this.updatePlaylistPanel();

    // Emit event
    this.player.emit('playlisttrackchange', {
      index: this.currentIndex,
      item: item
    });

    // Auto-play
    this.player.play();
  }

  /**
   * Play next track
   */
  next() {
    if (this.hasNext()) {
      this.play(this.currentIndex + 1);
    } else if (this.options.loop) {
      this.play(0);
    }
  }

  /**
   * Play previous track
   */
  previous() {
    if (this.hasPrevious()) {
      this.play(this.currentIndex - 1);
    } else if (this.options.loop) {
      this.play(this.playlist.length - 1);
    }
  }

  /**
   * Check if there's a next track
   */
  hasNext() {
    return this.currentIndex < this.playlist.length - 1;
  }

  /**
   * Check if there's a previous track
   */
  hasPrevious() {
    return this.currentIndex > 0;
  }

  /**
   * Get current track
   */
  getCurrentTrack() {
    return this.playlist[this.currentIndex];
  }

  /**
   * Create track info display
   */
  createTrackInfo() {
    this.trackInfoElement = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-track-info`
    });

    // Insert before controls
    const controls = this.player.container.querySelector(`.${this.player.options.classPrefix}-controls`);
    if (controls) {
      this.player.container.insertBefore(this.trackInfoElement, controls);
    }

    this.updateTrackInfo();
  }

  /**
   * Update track info display
   */
  updateTrackInfo() {
    if (!this.trackInfoElement || this.playlist.length === 0) return;

    const item = this.getCurrentTrack();
    
    const title = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-track-title`,
      textContent: item.title || `Track ${this.currentIndex + 1}`
    });

    const artist = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-track-artist`,
      textContent: item.artist || ''
    });

    const trackNumber = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-track-number`,
      textContent: `${this.currentIndex + 1} / ${this.playlist.length}`
    });

    this.trackInfoElement.innerHTML = '';
    this.trackInfoElement.appendChild(trackNumber);
    this.trackInfoElement.appendChild(title);
    if (item.artist) {
      this.trackInfoElement.appendChild(artist);
    }
  }

  /**
   * Create playlist panel
   */
  createPlaylistPanel() {
    this.panel = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-panel`
    });

    // Insert after player
    this.player.container.parentNode.insertBefore(
      this.panel,
      this.player.container.nextSibling
    );
  }

  /**
   * Render playlist items in panel
   */
  renderPlaylistPanel() {
    if (!this.panel) return;

    this.panel.innerHTML = '';

    const header = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-header`,
      textContent: `Playlist (${this.playlist.length} tracks)`
    });
    this.panel.appendChild(header);

    const list = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-list`
    });

    this.playlist.forEach((item, index) => {
      const listItem = this.createPlaylistItem(item, index);
      list.appendChild(listItem);
    });

    this.panel.appendChild(list);
    this.updatePlaylistPanel();
  }

  /**
   * Create a playlist item element
   */
  createPlaylistItem(item, index) {
    const itemEl = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-item`,
      attributes: {
        'data-index': index,
        'role': 'button',
        'tabindex': '0'
      }
    });

    if (item.poster) {
      const thumb = DOMUtils.createElement('img', {
        className: `${this.player.options.classPrefix}-playlist-thumb`,
        attributes: {
          'src': item.poster,
          'alt': item.title || `Track ${index + 1}`
        }
      });
      itemEl.appendChild(thumb);
    }

    const info = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-item-info`
    });

    const number = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-item-number`,
      textContent: `${index + 1}.`
    });

    const title = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-playlist-item-title`,
      textContent: item.title || `Track ${index + 1}`
    });

    info.appendChild(number);
    info.appendChild(title);

    if (item.artist) {
      const artist = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-playlist-item-artist`,
        textContent: item.artist
      });
      info.appendChild(artist);
    }

    if (item.duration) {
      const duration = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-playlist-item-duration`,
        textContent: this.formatTime(item.duration)
      });
      info.appendChild(duration);
    }

    itemEl.appendChild(info);

    // Click to play
    itemEl.addEventListener('click', () => {
      this.play(index);
    });

    // Keyboard support
    itemEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.play(index);
      }
    });

    return itemEl;
  }

  /**
   * Update playlist panel to highlight current track
   */
  updatePlaylistPanel() {
    if (!this.panel) return;

    const items = this.panel.querySelectorAll(`.${this.player.options.classPrefix}-playlist-item`);
    items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add(`${this.player.options.classPrefix}-playlist-item-active`);
        item.setAttribute('aria-current', 'true');
      } else {
        item.classList.remove(`${this.player.options.classPrefix}-playlist-item-active`);
        item.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Toggle playlist panel visibility
   */
  togglePanel() {
    if (!this.panel) return;

    if (this.panel.style.display === 'none') {
      this.panel.style.display = 'block';
    } else {
      this.panel.style.display = 'none';
    }
  }

  /**
   * Format seconds to MM:SS
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Destroy the playlist manager
   */
  destroy() {
    if (this.panel) {
      this.panel.remove();
    }
    if (this.trackInfoElement) {
      this.trackInfoElement.remove();
    }
  }
}
