/**
 * Caption/Subtitle Manager
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { i18n } from '../i18n/i18n.js';

export class CaptionManager {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.tracks = [];
    this.currentTrack = null;
    this.currentCue = null;
    
    this.init();
  }

  init() {
    this.createElement();
    this.loadTracks();
    this.attachEvents();
    
    if (this.player.options.captionsDefault && this.tracks.length > 0) {
      this.enable();
    }
  }

  createElement() {
    this.element = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-captions`,
      attributes: {
        'aria-live': 'polite',
        'aria-atomic': 'true',
        'role': 'region',
        'aria-label': i18n.t('player.captions')
      }
    });

    // Apply caption styles
    this.updateStyles();
    
    this.player.container.appendChild(this.element);
  }

  loadTracks() {
    const textTracks = this.player.element.textTracks;
    
    console.log('VidPly: Loading caption tracks, found', textTracks.length, 'text tracks');
    
    for (let i = 0; i < textTracks.length; i++) {
      const track = textTracks[i];
      
      console.log(`VidPly: Track ${i}:`, {
        kind: track.kind,
        language: track.language,
        label: track.label,
        mode: track.mode
      });
      
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        this.tracks.push({
          track: track,
          language: track.language,
          label: track.label,
          kind: track.kind,
          index: i
        });
        
        // Disable all tracks initially
        track.mode = 'hidden';
        
        console.log('VidPly: Added caption/subtitle track:', track.label || track.language);
      }
    }
    
    console.log('VidPly: Total caption/subtitle tracks loaded:', this.tracks.length);
  }

  attachEvents() {
    this.player.on('timeupdate', () => {
      this.updateCaptions();
    });

    this.player.on('captionschange', () => {
      this.updateStyles();
    });
  }

  enable(trackIndex = 0) {
    console.log('VidPly: enable() called with trackIndex:', trackIndex);
    console.log('VidPly: Total tracks available:', this.tracks.length);
    
    if (this.tracks.length === 0) {
      console.log('VidPly: No tracks available, returning');
      return;
    }

    // Disable current track
    if (this.currentTrack) {
      this.currentTrack.track.mode = 'hidden';
      console.log('VidPly: Disabled current track:', this.currentTrack.label);
    }

    // Enable selected track
    const selectedTrack = this.tracks[trackIndex];
    console.log('VidPly: Selected track:', selectedTrack);
    
    if (selectedTrack) {
      // Set to 'hidden' not 'showing' to prevent browser from displaying native captions
      // We'll handle the display ourselves
      selectedTrack.track.mode = 'hidden';
      this.currentTrack = selectedTrack;
      this.player.state.captionsEnabled = true;
      
      console.log('VidPly: Enabled track:', selectedTrack.label || selectedTrack.language);
      console.log('VidPly: Track mode:', selectedTrack.track.mode);
      console.log('VidPly: Setting caption element display to block');
      
      // Remove any existing cuechange listener
      if (this.cueChangeHandler) {
        selectedTrack.track.removeEventListener('cuechange', this.cueChangeHandler);
      }
      
      // Add event listener for cue changes
      this.cueChangeHandler = () => {
        console.log('VidPly: Cue changed');
        this.updateCaptions();
      };
      selectedTrack.track.addEventListener('cuechange', this.cueChangeHandler);
      
      this.element.style.display = 'block';
      console.log('VidPly: Caption element display set to:', this.element.style.display);
      
      this.player.emit('captionsenabled', selectedTrack);
    }
  }

  disable() {
    if (this.currentTrack) {
      this.currentTrack.track.mode = 'hidden';
      this.currentTrack = null;
    }

    this.element.style.display = 'none';
    this.element.innerHTML = '';
    this.currentCue = null;
    this.player.state.captionsEnabled = false;
    this.player.emit('captionsdisabled');
  }

  updateCaptions() {
    if (!this.currentTrack) {
      return;
    }
    
    if (!this.currentTrack.track.activeCues) {
      console.log('VidPly: No activeCues available yet for track:', this.currentTrack.label);
      return;
    }

    const activeCues = this.currentTrack.track.activeCues;
    
    if (activeCues.length > 0) {
      const cue = activeCues[0];
      
      // Only update if the cue has changed
      if (this.currentCue !== cue) {
        this.currentCue = cue;
        
        console.log('VidPly: Displaying caption:', cue.text);
        
        // Parse and display cue text
        let text = cue.text;
        
        // Handle VTT formatting
        text = this.parseVTTFormatting(text);
        
        this.element.innerHTML = DOMUtils.sanitizeHTML(text);
        console.log('VidPly: Caption element innerHTML set to:', this.element.innerHTML);
        
        // Make sure it's visible when there's content
        this.element.style.display = 'block';
        
        this.player.emit('captionchange', cue);
      }
    } else if (this.currentCue) {
      // Clear caption
      console.log('VidPly: Clearing caption');
      this.element.innerHTML = '';
      this.element.style.display = 'none';
      this.currentCue = null;
    }
  }

  parseVTTFormatting(text) {
    // Basic VTT tag support
    text = text.replace(/<c[^>]*>(.*?)<\/c>/g, '<span class="caption-class">$1</span>');
    text = text.replace(/<b>(.*?)<\/b>/g, '<strong>$1</strong>');
    text = text.replace(/<i>(.*?)<\/i>/g, '<em>$1</em>');
    text = text.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
    
    // Voice tags
    text = text.replace(/<v\s+([^>]+)>(.*?)<\/v>/g, '<span class="caption-voice" data-voice="$1">$2</span>');
    
    return text;
  }

  updateStyles() {
    if (!this.element) return;

    const options = this.player.options;
    
    this.element.style.fontSize = options.captionsFontSize;
    this.element.style.fontFamily = options.captionsFontFamily;
    this.element.style.color = options.captionsColor;
    this.element.style.backgroundColor = this.hexToRgba(
      options.captionsBackgroundColor, 
      options.captionsOpacity
    );
  }

  hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }
    return hex;
  }

  setCaptionStyle(property, value) {
    switch (property) {
      case 'fontSize':
        this.player.options.captionsFontSize = value;
        break;
      case 'fontFamily':
        this.player.options.captionsFontFamily = value;
        break;
      case 'color':
        this.player.options.captionsColor = value;
        break;
      case 'backgroundColor':
        this.player.options.captionsBackgroundColor = value;
        break;
      case 'opacity':
        this.player.options.captionsOpacity = value;
        break;
    }
    
    this.updateStyles();
    this.player.emit('captionschange');
  }

  getAvailableTracks() {
    return this.tracks.map((t, index) => ({
      index,
      language: t.language,
      label: t.label || t.language,
      kind: t.kind
    }));
  }

  switchTrack(trackIndex) {
    if (trackIndex >= 0 && trackIndex < this.tracks.length) {
      this.disable();
      this.enable(trackIndex);
    }
  }

  destroy() {
    this.disable();
    
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

