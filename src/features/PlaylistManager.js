/**
 * VidPly Playlist Manager
 * Manages playlists for audio and video content
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';

// Static counter for unique IDs
let playlistInstanceCounter = 0;

export class PlaylistManager {
  constructor(player, options = {}) {
    this.player = player;
    this.tracks = [];
    this.currentIndex = -1;
    
    // Generate unique instance ID for this playlist
    this.instanceId = ++playlistInstanceCounter;
    this.uniqueId = `vidply-playlist-${this.instanceId}`;
    
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
    this.navigationFeedback = null; // Live region for keyboard navigation feedback
    this.isPanelVisible = this.options.showPanel !== false;
    
    // Bind methods
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
    
    // Register this playlist manager with the player
    this.player.playlistManager = this;
    
    // Initialize
    this.init();
    
    // Update controls to add playlist buttons
    this.updatePlayerControls();
    
    // Load tracks if provided in options
    if (options.tracks && Array.isArray(options.tracks)) {
      this.loadPlaylist(options.tracks);
    }
  }
  
  init() {
    // Listen for track end
    this.player.on('ended', this.handleTrackEnd);
    this.player.on('error', this.handleTrackError);
    
    // Create UI if needed
    if (this.options.showPanel) {
      this.createUI();
    }
    
    // Check for data-playlist attribute on player container (only if tracks weren't provided in options)
    if (this.tracks.length === 0) {
      this.loadPlaylistFromAttribute();
    }
  }
  
  /**
   * Load playlist from data-playlist attribute if present
   */
  loadPlaylistFromAttribute() {
    // Check the original wrapper element for data-playlist
    // Structure: #audio-player -> .vidply-player -> .vidply-video-wrapper -> <audio>
    // So we need to go up 3 levels
    if (!this.player.element || !this.player.element.parentElement) {
      console.log('VidPly Playlist: No player element found');
      return;
    }
    
    const videoWrapper = this.player.element.parentElement; // .vidply-video-wrapper
    const playerContainer = videoWrapper.parentElement; // .vidply-player
    const originalElement = playerContainer ? playerContainer.parentElement : null; // #audio-player (original div)
    
    if (!originalElement) {
      console.log('VidPly Playlist: No original element found');
      return;
    }
    
    // Load playlist options from data attributes
    this.loadOptionsFromAttributes(originalElement);
    
    const playlistData = originalElement.getAttribute('data-playlist');
    if (!playlistData) {
      console.log('VidPly Playlist: No data-playlist attribute found');
      return;
    }
    
    console.log('VidPly Playlist: Found data-playlist attribute, parsing...');
    try {
      const tracks = JSON.parse(playlistData);
      if (Array.isArray(tracks) && tracks.length > 0) {
        console.log(`VidPly Playlist: Loaded ${tracks.length} tracks from data-playlist`);
        this.loadPlaylist(tracks);
      } else {
        console.warn('VidPly Playlist: data-playlist is not a valid array or is empty');
      }
    } catch (error) {
      console.error('VidPly Playlist: Failed to parse data-playlist attribute', error);
    }
  }
  
  /**
   * Load playlist options from data attributes
   * @param {HTMLElement} element - Element to read attributes from
   */
  loadOptionsFromAttributes(element) {
    // data-playlist-auto-advance
    const autoAdvance = element.getAttribute('data-playlist-auto-advance');
    if (autoAdvance !== null) {
      this.options.autoAdvance = autoAdvance === 'true';
    }
    
    // data-playlist-auto-play-first
    const autoPlayFirst = element.getAttribute('data-playlist-auto-play-first');
    if (autoPlayFirst !== null) {
      this.options.autoPlayFirst = autoPlayFirst === 'true';
    }
    
    // data-playlist-loop
    const loop = element.getAttribute('data-playlist-loop');
    if (loop !== null) {
      this.options.loop = loop === 'true';
    }
    
    // data-playlist-show-panel
    const showPanel = element.getAttribute('data-playlist-show-panel');
    if (showPanel !== null) {
      this.options.showPanel = showPanel === 'true';
    }
    
    console.log('VidPly Playlist: Options from attributes:', this.options);
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
      attributes: {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });
    this.trackInfoElement.style.display = 'none';
    
    this.container.appendChild(this.trackInfoElement);
    
    // Create navigation feedback live region
    this.navigationFeedback = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      attributes: {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });
    this.container.appendChild(this.navigationFeedback);
    
    // Create playlist panel with proper landmark
    this.playlistPanel = DOMUtils.createElement('div', {
      className: 'vidply-playlist-panel',
      attributes: {
        id: `${this.uniqueId}-panel`,
        role: 'region',
        'aria-label': 'Media playlist',
        'aria-labelledby': `${this.uniqueId}-heading`
      }
    });
    this.playlistPanel.style.display = this.isPanelVisible ? 'none' : 'none'; // Will be shown when playlist is loaded
    
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
      attributes: {
        id: `${this.uniqueId}-heading`
      }
    });
    header.textContent = `Playlist (${this.tracks.length})`;
    this.playlistPanel.appendChild(header);
    
    // Add keyboard instructions (visually hidden)
    const instructions = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      attributes: {
        id: `${this.uniqueId}-keyboard-instructions`
      }
    });
    instructions.textContent = 'Playlist navigation: Use Up and Down arrow keys to move between tracks. Press Page Up or Page Down to skip 5 tracks. Press Home to go to first track, End to go to last track. Press Enter or Space to play the selected track.';
    this.playlistPanel.appendChild(instructions);
    
    // Create list (proper ul element)
    const list = DOMUtils.createElement('ul', {
      className: 'vidply-playlist-list',
      attributes: {
        'aria-labelledby': `${this.uniqueId}-heading`,
        'aria-describedby': `${this.uniqueId}-keyboard-instructions`
      }
    });
    
    this.tracks.forEach((track, index) => {
      const item = this.createPlaylistItem(track, index);
      list.appendChild(item);
    });
    
    this.playlistPanel.appendChild(list);
    
    // Show panel if it should be visible
    if (this.isPanelVisible) {
      this.playlistPanel.style.display = 'block';
    }
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
    
    // Create list item container (semantic HTML)
    const item = DOMUtils.createElement('li', {
      className: isActive ? 'vidply-playlist-item vidply-playlist-item-active' : 'vidply-playlist-item',
      attributes: {
        'data-playlist-index': index
      }
    });
    
    // Create button wrapper for interactive content
    const button = DOMUtils.createElement('button', {
      className: 'vidply-playlist-item-button',
      attributes: {
        type: 'button',
        tabIndex: index === 0 ? 0 : -1, // Only first item is in tab order initially
        'aria-label': `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`,
        'aria-posinset': index + 1,
        'aria-setsize': this.tracks.length
      }
    });
    
    // Add aria-current if active
    if (isActive) {
      button.setAttribute('aria-current', 'true');
      button.setAttribute('tabIndex', '0'); // Active item should always be tabbable
    }
    
    // Thumbnail or icon (using span for valid button content)
    const thumbnail = DOMUtils.createElement('span', {
      className: 'vidply-playlist-thumbnail',
      attributes: {
        'aria-hidden': 'true'
      }
    });
    
    if (track.poster) {
      thumbnail.style.backgroundImage = `url(${track.poster})`;
    } else {
      // Show music/speaker icon for audio tracks
      const icon = createIconElement('music');
      icon.classList.add('vidply-playlist-thumbnail-icon');
      thumbnail.appendChild(icon);
    }
    
    button.appendChild(thumbnail);
    
    // Info (using span for valid button content)
    const info = DOMUtils.createElement('span', {
      className: 'vidply-playlist-item-info',
      attributes: {
        'aria-hidden': 'true'
      }
    });
    
    const title = DOMUtils.createElement('span', {
      className: 'vidply-playlist-item-title'
    });
    title.textContent = trackTitle;
    info.appendChild(title);
    
    if (track.artist) {
      const artist = DOMUtils.createElement('span', {
        className: 'vidply-playlist-item-artist'
      });
      artist.textContent = track.artist;
      info.appendChild(artist);
    }
    
    button.appendChild(info);
    
    // Play icon
    const playIcon = createIconElement('play');
    playIcon.classList.add('vidply-playlist-item-icon');
    playIcon.setAttribute('aria-hidden', 'true');
    button.appendChild(playIcon);
    
    // Click handler
    button.addEventListener('click', () => {
      this.play(index, true); // User-initiated
    });
    
    // Keyboard handler
    button.addEventListener('keydown', (e) => {
      this.handlePlaylistItemKeydown(e, index);
    });
    
    // Append button to list item
    item.appendChild(button);
    
    return item;
  }
  
  /**
   * Handle keyboard navigation in playlist items
   */
  handlePlaylistItemKeydown(e, index) {
    const buttons = Array.from(this.playlistPanel.querySelectorAll('.vidply-playlist-item-button'));
    let newIndex = -1;
    let announcement = '';
    
    switch(e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        this.play(index, true); // User-initiated
        return; // No need to move focus
        
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        // Move to next item
        if (index < buttons.length - 1) {
          newIndex = index + 1;
        } else {
          // At the end, announce boundary
          announcement = `End of playlist. ${buttons.length} of ${buttons.length}.`;
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        // Move to previous item
        if (index > 0) {
          newIndex = index - 1;
        } else {
          // At the beginning, announce boundary
          announcement = 'Beginning of playlist. 1 of ' + buttons.length + '.';
        }
        break;
        
      case 'PageDown':
        e.preventDefault();
        e.stopPropagation();
        // Move 5 items down (or to end)
        newIndex = Math.min(index + 5, buttons.length - 1);
        if (newIndex === buttons.length - 1 && index !== newIndex) {
          announcement = `Jumped to last track. ${newIndex + 1} of ${buttons.length}.`;
        }
        break;
        
      case 'PageUp':
        e.preventDefault();
        e.stopPropagation();
        // Move 5 items up (or to beginning)
        newIndex = Math.max(index - 5, 0);
        if (newIndex === 0 && index !== newIndex) {
          announcement = `Jumped to first track. 1 of ${buttons.length}.`;
        }
        break;
        
      case 'Home':
        e.preventDefault();
        e.stopPropagation();
        // Move to first item
        newIndex = 0;
        if (index !== 0) {
          announcement = `First track. 1 of ${buttons.length}.`;
        }
        break;
        
      case 'End':
        e.preventDefault();
        e.stopPropagation();
        // Move to last item
        newIndex = buttons.length - 1;
        if (index !== buttons.length - 1) {
          announcement = `Last track. ${buttons.length} of ${buttons.length}.`;
        }
        break;
    }
    
    // Update tab indices for roving tabindex pattern
    if (newIndex !== -1 && newIndex !== index) {
      buttons[index].setAttribute('tabIndex', '-1');
      buttons[newIndex].setAttribute('tabIndex', '0');
      buttons[newIndex].focus();
    }
    
    // Announce navigation feedback
    if (announcement && this.navigationFeedback) {
      this.navigationFeedback.textContent = announcement;
      // Clear after a short delay to allow for repeated announcements
      setTimeout(() => {
        if (this.navigationFeedback) {
          this.navigationFeedback.textContent = '';
        }
      }, 1000);
    }
  }
  
  /**
   * Update playlist UI (highlight current track)
   */
  updatePlaylistUI() {
    if (!this.playlistPanel) return;
    
    const items = this.playlistPanel.querySelectorAll('.vidply-playlist-item');
    const buttons = this.playlistPanel.querySelectorAll('.vidply-playlist-item-button');
    
    items.forEach((item, index) => {
      const button = buttons[index];
      if (!button) return;
      
      const track = this.tracks[index];
      const trackPosition = `Track ${index + 1} of ${this.tracks.length}`;
      const trackTitle = track.title || `Track ${index + 1}`;
      const trackArtist = track.artist ? ` by ${track.artist}` : '';
      
      if (index === this.currentIndex) {
        // Update list item styling
        item.classList.add('vidply-playlist-item-active');
        
        // Update button ARIA attributes
        button.setAttribute('aria-current', 'true');
        button.setAttribute('tabIndex', '0'); // Active item should be tabbable
        
        const statusText = 'Currently playing';
        const actionText = 'Press Enter to restart';
        button.setAttribute('aria-label', `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`);
        
        // Scroll into view
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        // Update list item styling
        item.classList.remove('vidply-playlist-item-active');
        
        // Update button ARIA attributes
        button.removeAttribute('aria-current');
        button.setAttribute('tabIndex', '-1'); // Remove from tab order (use arrow keys)
        
        const statusText = 'Not playing';
        const actionText = 'Press Enter to play';
        button.setAttribute('aria-label', `${trackPosition}. ${trackTitle}${trackArtist}. ${statusText}. ${actionText}.`);
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
   * Toggle playlist panel visibility
   * @param {boolean} show - Optional: force show (true) or hide (false)
   * @returns {boolean} - New visibility state
   */
  togglePanel(show) {
    if (!this.playlistPanel) return false;
    
    // Determine new state
    const shouldShow = show !== undefined ? show : this.playlistPanel.style.display === 'none';
    
    if (shouldShow) {
      this.playlistPanel.style.display = 'block';
      this.isPanelVisible = true;
      
      // Focus first item if playlist has tracks
      if (this.tracks.length > 0) {
        setTimeout(() => {
          const firstItem = this.playlistPanel.querySelector('.vidply-playlist-item[tabindex="0"]');
          if (firstItem) {
            firstItem.focus();
          }
        }, 100);
      }
      
      // Update toggle button state if it exists
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-expanded', 'true');
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-pressed', 'true');
      }
    } else {
      this.playlistPanel.style.display = 'none';
      this.isPanelVisible = false;
      
      // Update toggle button state if it exists
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-expanded', 'false');
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-pressed', 'false');
        
        // Return focus to toggle button
        this.player.controlBar.controls.playlistToggle.focus();
      }
    }
    
    return this.isPanelVisible;
  }
  
  /**
   * Show playlist panel
   */
  showPanel() {
    return this.togglePanel(true);
  }
  
  /**
   * Hide playlist panel
   */
  hidePanel() {
    return this.togglePanel(false);
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
