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
    
    // Initialize
    this.init();
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
    
    // Auto-play first track
    if (tracks.length > 0) {
      this.play(0);
    }
  }
  
  /**
   * Play a specific track
   * @param {number} index - Track index
   */
  play(index) {
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
      className: 'vidply-track-info'
    });
    this.trackInfoElement.style.display = 'none';
    
    this.container.appendChild(this.trackInfoElement);
    
    // Create playlist panel
    this.playlistPanel = DOMUtils.createElement('div', {
      className: 'vidply-playlist-panel'
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
    
    this.trackInfoElement.innerHTML = `
      <div class="vidply-track-number">Track ${trackNumber} of ${totalTracks}</div>
      <div class="vidply-track-title">${DOMUtils.escapeHTML(track.title || 'Untitled')}</div>
      ${track.artist ? `<div class="vidply-track-artist">${DOMUtils.escapeHTML(track.artist)}</div>` : ''}
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
    const header = DOMUtils.createElement('div', {
      className: 'vidply-playlist-header'
    });
    header.textContent = `Playlist (${this.tracks.length})`;
    this.playlistPanel.appendChild(header);
    
    // Create list
    const list = DOMUtils.createElement('div', {
      className: 'vidply-playlist-list'
    });
    
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
    const item = DOMUtils.createElement('div', {
      className: 'vidply-playlist-item',
      role: 'button',
      tabIndex: 0,
      'aria-label': `Play ${track.title || 'Track ' + (index + 1)}`
    });
    
    // Add active class if current
    if (index === this.currentIndex) {
      item.classList.add('vidply-playlist-item-active');
    }
    
    // Thumbnail or icon
    const thumbnail = DOMUtils.createElement('div', {
      className: 'vidply-playlist-thumbnail'
    });
    
    if (track.poster) {
      thumbnail.style.backgroundImage = `url(${track.poster})`;
    } else {
      // Show music/speaker icon for audio tracks
      const icon = createIconElement('music');
      icon.classList.add('vidply-playlist-thumbnail-icon');
      thumbnail.appendChild(icon);
    }
    
    item.appendChild(thumbnail);
    
    // Info
    const info = DOMUtils.createElement('div', {
      className: 'vidply-playlist-item-info'
    });
    
    const title = DOMUtils.createElement('div', {
      className: 'vidply-playlist-item-title'
    });
    title.textContent = track.title || `Track ${index + 1}`;
    info.appendChild(title);
    
    if (track.artist) {
      const artist = DOMUtils.createElement('div', {
        className: 'vidply-playlist-item-artist'
      });
      artist.textContent = track.artist;
      info.appendChild(artist);
    }
    
    item.appendChild(info);
    
    // Play icon
    const playIcon = createIconElement('play');
    playIcon.classList.add('vidply-playlist-item-icon');
    item.appendChild(playIcon);
    
    // Click handler
    item.addEventListener('click', () => {
      this.play(index);
    });
    
    // Keyboard handler
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.play(index);
      }
    });
    
    return item;
  }
  
  /**
   * Update playlist UI (highlight current track)
   */
  updatePlaylistUI() {
    if (!this.playlistPanel) return;
    
    const items = this.playlistPanel.querySelectorAll('.vidply-playlist-item');
    
    items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add('vidply-playlist-item-active');
        
        // Scroll into view
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('vidply-playlist-item-active');
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
      hasNext: this.currentIndex < this.tracks.length - 1,
      hasPrevious: this.currentIndex > 0
    };
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
