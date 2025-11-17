/**
 * VidPly Playlist Manager
 * Manages playlists for audio and video content
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';

export class PlaylistManager {
  constructor(player, options = {}) {
    this.player = player;
    this.tracks = [];
    this.currentIndex = -1;
    
    // Options
    this.options = {
      autoAdvance: options.autoAdvance !== false, // Default true
      autoPlayFirst: options.autoPlayFirst !== false, // Default true - auto-play first track on load
      loop: options.loop || false,
      showPanel: options.showPanel !== false, // Default true
      ...options
    };
    
    // UI elements
    this.container = null;
    this.playlistPanel = null;
    this.trackInfoElement = null;
    
    // Bind methods
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
    
    // Register this playlist manager with the player
    this.player.playlistManager = this;
    
    // Initialize
    this.init();
    
    // Update controls to add playlist buttons
    this.updatePlayerControls();
  }
  
  init() {
    // Listen for track end
    this.player.on('ended', this.handleTrackEnd);
    this.player.on('error', this.handleTrackError);
    
    // Create UI if needed
    if (this.options.showPanel) {
      this.createUI();
    }
  }
  
  /**
   * Update player controls to add playlist navigation buttons
   */
  updatePlayerControls() {
    if (!this.player.controlBar) return;
    
    const controlBar = this.player.controlBar;
    
    // Clear existing controls content (except the element itself)
    controlBar.element.innerHTML = '';
    
    // Recreate controls with playlist buttons now available
    controlBar.createControls();
    
    // Reattach events for the new controls
    controlBar.attachEvents();
    controlBar.setupAutoHide();
  }
  
  /**
   * Load a playlist
   * @param {Array} tracks - Array of track objects
   */
  loadPlaylist(tracks) {
    this.tracks = tracks;
    this.currentIndex = -1;
    
    // Add playlist class to container
    if (this.container) {
      this.container.classList.add('vidply-has-playlist');
    }
    
    // Update UI
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
    
    // Auto-play first track (if enabled)
    if (tracks.length > 0) {
      if (this.options.autoPlayFirst) {
        this.play(0);
      } else {
        // Load first track without playing
        this.loadTrack(0);
      }
    }
  }
  
  /**
   * Load a track without playing
   * @param {number} index - Track index
   */
  loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }
    
    const track = this.tracks[index];
    
    // Update current index
    this.currentIndex = index;
    
    // Load track into player
    this.player.load({
      src: track.src,
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || []
    });
    
    // Update UI
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    
    // Emit event
    this.player.emit('playlisttrackchange', {
      index: index,
      item: track,
      total: this.tracks.length
    });
  }
  
  /**
   * Play a specific track
   * @param {number} index - Track index
   * @param {boolean} userInitiated - Whether this was triggered by user action (default: false)
   */
  play(index, userInitiated = false) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }
    
    const track = this.tracks[index];
    
    // Update current index
    this.currentIndex = index;
    
    // Load track into player
    this.player.load({
      src: track.src,
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || []
    });
    
    // Update UI
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    
    // Emit event
    this.player.emit('playlisttrackchange', {
      index: index,
      item: track,
      total: this.tracks.length
    });
    
    // Return focus to player for keyboard navigation (only on user action)
    if (userInitiated && this.player.container) {
      this.player.container.focus();
    }
    
    // Auto-play
    setTimeout(() => {
      this.player.play();
    }, 100);
  }
  
  /**
   * Play next track
   */
  next() {
    let nextIndex = this.currentIndex + 1;
    
    if (nextIndex >= this.tracks.length) {
      if (this.options.loop) {
        nextIndex = 0;
      } else {
        return;
      }
    }
    
    this.play(nextIndex);
  }
  
  /**
   * Play previous track
   */
  previous() {
    let prevIndex = this.currentIndex - 1;
    
    if (prevIndex < 0) {
      if (this.options.loop) {
        prevIndex = this.tracks.length - 1;
      } else {
        return;
      }
    }
    
    this.play(prevIndex);
  }
  
  /**
   * Handle track end
   */
  handleTrackEnd() {
    if (this.options.autoAdvance) {
      this.next();
    }
  }
  
  /**
   * Handle track error
   */
  handleTrackError(e) {
    console.error('VidPly Playlist: Track error', e);
    
    // Try next track
    if (this.options.autoAdvance) {
      setTimeout(() => {
        this.next();
      }, 1000);
    }
  }
  
  /**
   * Create playlist UI
   */
  createUI() {
    // Find player container
    this.container = this.player.container;
    
    if (!this.container) {
      console.warn('VidPly Playlist: No container found');
      return;
    }
    
    // Create track info element (shows current track)
    this.trackInfoElement = DOMUtils.createElement('div', {
      className: 'vidply-track-info',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true'
    });
    this.trackInfoElement.style.display = 'none';
    
    this.container.appendChild(this.trackInfoElement);
    
    // Create playlist panel with proper landmark
    this.playlistPanel = DOMUtils.createElement('div', {
      className: 'vidply-playlist-panel',
      role: 'region',
      'aria-label': 'Media playlist'
    });
    this.playlistPanel.style.display = 'none';
    
    this.container.appendChild(this.playlistPanel);
  }
  
  /**
   * Update track info display
   */
  updateTrackInfo(track) {
    if (!this.trackInfoElement) return;
    
    const trackNumber = this.currentIndex + 1;
    const totalTracks = this.tracks.length;
    const trackTitle = track.title || 'Untitled';
    const trackArtist = track.artist || '';
    
    // Screen reader announcement
    const announcement = `Now playing: Track ${trackNumber} of ${totalTracks}. ${trackTitle}${trackArtist ? ' by ' + trackArtist : ''}`;
    
    this.trackInfoElement.innerHTML = `
      <span class="vidply-sr-only">${DOMUtils.escapeHTML(announcement)}</span>
      <div class="vidply-track-number" aria-hidden="true">Track ${trackNumber} of ${totalTracks}</div>
      <div class="vidply-track-title" aria-hidden="true">${DOMUtils.escapeHTML(trackTitle)}</div>
      ${trackArtist ? `<div class="vidply-track-artist" aria-hidden="true">${DOMUtils.escapeHTML(trackArtist)}</div>` : ''}
    `;
    
    this.trackInfoElement.style.display = 'block';
  }
  
  /**
   * Render playlist
   */
  renderPlaylist() {
    if (!this.playlistPanel) return;
    
    // Clear existing
    this.playlistPanel.innerHTML = '';
    
    // Create header
    const header = DOMUtils.createElement('h2', {
      className: 'vidply-playlist-header',
      id: 'vidply-playlist-heading'
    });
    header.textContent = `Playlist (${this.tracks.length})`;
    this.playlistPanel.appendChild(header);
    
    // Add keyboard instructions (visually hidden)
    const instructions = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      'aria-hidden': 'false'
    });
    instructions.textContent = 'Use arrow keys to navigate between tracks. Press Enter or Space to play a track. Press Home or End to jump to first or last track.';
    this.playlistPanel.appendChild(instructions);
    
    // Create list (proper ul element)
    const list = DOMUtils.createElement('ul', {
      className: 'vidply-playlist-list',
      'aria-labelledby': 'vidply-playlist-heading',
      'aria-describedby': 'vidply-playlist-instructions'
    });
    
    // Add list description
    const listDescription = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      id: 'vidply-playlist-instructions'
    });
    listDescription.textContent = `Playlist with ${this.tracks.length} ${this.tracks.length === 1 ? 'track' : 'tracks'}`;
    this.playlistPanel.appendChild(listDescription);
    
    this.tracks.forEach((track, index) => {
      const item = this.createPlaylistItem(track, index);
      list.appendChild(item);
    });
    
    this.playlistPanel.appendChild(list);
    this.playlistPanel.style.display = 'block';
  }
  
  /**
   * Create playlist item element
   */
  createPlaylistItem(track, index) {
    const trackPosition = `Track ${index + 1} of ${this.tracks.length}`;
    const trackTitle = track.title || `Track ${index + 1}`;
    const trackArtist = track.artist ? ` by ${track.artist}` : '';
    const isActive = index === this.currentIndex;
    const statusText = isActive ? 'Currently playing' : 'Not playing';
    const actionText = isActive ? 'Press Enter to restart' : 'Press Enter to play';
    
    const item = DOMUtils.createElement('li', {
      className: 'vidply-playlist-item',
      tabIndex: index === 0 ? 0 : -1, // Only first item is in tab order initially
      'aria-label': `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`,
      'aria-posinset': index + 1,
      'aria-setsize': this.tracks.length,
      'data-playlist-index': index
    });
    
    // Add active class if current
    if (isActive) {
      item.classList.add('vidply-playlist-item-active');
      item.setAttribute('aria-current', 'true');
      item.setAttribute('tabIndex', '0'); // Active item should always be tabbable
    }
    
    // Add screen reader only position info
    const positionInfo = DOMUtils.createElement('span', {
      className: 'vidply-sr-only'
    });
    positionInfo.textContent = `${trackPosition}: `;
    item.appendChild(positionInfo);
    
    // Thumbnail or icon
    const thumbnail = DOMUtils.createElement('div', {
      className: 'vidply-playlist-thumbnail',
      'aria-hidden': 'true'
    });
    
    if (track.poster) {
      thumbnail.style.backgroundImage = `url(${track.poster})`;
      thumbnail.setAttribute('role', 'img');
      thumbnail.setAttribute('aria-label', `${trackTitle} thumbnail`);
    } else {
      // Show music/speaker icon for audio tracks
      const icon = createIconElement('music');
      icon.classList.add('vidply-playlist-thumbnail-icon');
      thumbnail.appendChild(icon);
    }
    
    item.appendChild(thumbnail);
    
    // Info
    const info = DOMUtils.createElement('div', {
      className: 'vidply-playlist-item-info',
      'aria-hidden': 'true'
    });
    
    const title = DOMUtils.createElement('div', {
      className: 'vidply-playlist-item-title'
    });
    title.textContent = trackTitle;
    info.appendChild(title);
    
    if (track.artist) {
      const artist = DOMUtils.createElement('div', {
        className: 'vidply-playlist-item-artist'
      });
      artist.textContent = track.artist;
      info.appendChild(artist);
    }
    
    item.appendChild(info);
    
    // Status indicator for screen readers
    if (isActive) {
      const statusIndicator = DOMUtils.createElement('span', {
        className: 'vidply-sr-only'
      });
      statusIndicator.textContent = ' (Currently playing)';
      item.appendChild(statusIndicator);
    }
    
    // Play icon
    const playIcon = createIconElement('play');
    playIcon.classList.add('vidply-playlist-item-icon');
    playIcon.setAttribute('aria-hidden', 'true');
    item.appendChild(playIcon);
    
    // Click handler
    item.addEventListener('click', () => {
      this.play(index, true); // User-initiated
    });
    
    // Keyboard handler
    item.addEventListener('keydown', (e) => {
      this.handlePlaylistItemKeydown(e, index);
    });
    
    return item;
  }
  
  /**
   * Handle keyboard navigation in playlist items
   */
  handlePlaylistItemKeydown(e, index) {
    const items = Array.from(this.playlistPanel.querySelectorAll('.vidply-playlist-item'));
    let newIndex = -1;
    
    switch(e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.play(index, true); // User-initiated
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        // Move to next item
        if (index < items.length - 1) {
          newIndex = index + 1;
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        // Move to previous item
        if (index > 0) {
          newIndex = index - 1;
        }
        break;
        
      case 'Home':
        e.preventDefault();
        // Move to first item
        newIndex = 0;
        break;
        
      case 'End':
        e.preventDefault();
        // Move to last item
        newIndex = items.length - 1;
        break;
    }
    
    // Update tab indices for roving tabindex pattern
    if (newIndex !== -1 && newIndex !== index) {
      items[index].setAttribute('tabIndex', '-1');
      items[newIndex].setAttribute('tabIndex', '0');
      items[newIndex].focus();
    }
  }
  
  /**
   * Update playlist UI (highlight current track)
   */
  updatePlaylistUI() {
    if (!this.playlistPanel) return;
    
    const items = this.playlistPanel.querySelectorAll('.vidply-playlist-item');
    
    items.forEach((item, index) => {
      const track = this.tracks[index];
      const trackPosition = `Track ${index + 1} of ${this.tracks.length}`;
      const trackTitle = track.title || `Track ${index + 1}`;
      const trackArtist = track.artist ? ` by ${track.artist}` : '';
      
      if (index === this.currentIndex) {
        item.classList.add('vidply-playlist-item-active');
        item.setAttribute('aria-current', 'true');
        item.setAttribute('tabIndex', '0'); // Active item should be tabbable
        
        const statusText = 'Currently playing';
        const actionText = 'Press Enter to restart';
        item.setAttribute('aria-label', `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`);
        
        // Scroll into view
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('vidply-playlist-item-active');
        item.removeAttribute('aria-current');
        item.setAttribute('tabIndex', '-1'); // Remove from tab order (use arrow keys)
        
        const statusText = 'Not playing';
        const actionText = 'Press Enter to play';
        item.setAttribute('aria-label', `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`);
      }
    });
  }
  
  /**
   * Get current track
   */
  getCurrentTrack() {
    return this.tracks[this.currentIndex] || null;
  }
  
  /**
   * Get playlist info
   */
  getPlaylistInfo() {
    return {
      currentIndex: this.currentIndex,
      totalTracks: this.tracks.length,
      currentTrack: this.getCurrentTrack(),
      hasNext: this.hasNext(),
      hasPrevious: this.hasPrevious()
    };
  }
  
  /**
   * Check if there is a next track
   */
  hasNext() {
    if (this.options.loop) return true;
    return this.currentIndex < this.tracks.length - 1;
  }
  
  /**
   * Check if there is a previous track
   */
  hasPrevious() {
    if (this.options.loop) return true;
    return this.currentIndex > 0;
  }
  
  /**
   * Add track to playlist
   */
  addTrack(track) {
    this.tracks.push(track);
    
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  
  /**
   * Remove track from playlist
   */
  removeTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;
    
    this.tracks.splice(index, 1);
    
    // Adjust current index if needed
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      // Current track was removed, play next or stop
      if (this.currentIndex >= this.tracks.length) {
        this.currentIndex = this.tracks.length - 1;
      }
      
      if (this.currentIndex >= 0) {
        this.play(this.currentIndex);
      }
    }
    
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  
  /**
   * Clear playlist
   */
  clear() {
    this.tracks = [];
    this.currentIndex = -1;
    
    if (this.playlistPanel) {
      this.playlistPanel.innerHTML = '';
      this.playlistPanel.style.display = 'none';
    }
    
    if (this.trackInfoElement) {
      this.trackInfoElement.innerHTML = '';
      this.trackInfoElement.style.display = 'none';
    }
  }
  
  /**
   * Destroy playlist manager
   */
  destroy() {
    // Remove event listeners
    this.player.off('ended', this.handleTrackEnd);
    this.player.off('error', this.handleTrackError);
    
    // Remove UI
    if (this.trackInfoElement) {
      this.trackInfoElement.remove();
    }
    
    if (this.playlistPanel) {
      this.playlistPanel.remove();
    }
    
    // Clear data
    this.clear();
  }
}

export default PlaylistManager;
