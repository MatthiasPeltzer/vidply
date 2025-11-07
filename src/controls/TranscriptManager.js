/**
 * Transcript Manager Component
 * Manages transcript display and interaction
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { StorageManager } from '../utils/StorageManager.js';

export class TranscriptManager {
  constructor(player) {
    this.player = player;
    this.transcriptWindow = null;
    this.transcriptEntries = [];
    this.metadataCues = [];
    this.currentActiveEntry = null;
    this.isVisible = false;
    
    // Storage manager
    this.storage = new StorageManager('vidply');
    
    // Dragging state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    // Resizing state
    this.isResizing = false;
    this.resizeDirection = null;
    this.resizeStartX = 0;
    this.resizeStartY = 0;
    this.resizeStartWidth = 0;
    this.resizeStartHeight = 0;
    this.resizeEnabled = false;
    
    // Settings menu state
    this.settingsMenuVisible = false;
    this.settingsMenu = null;
    this.settingsButton = null;
    this.settingsMenuJustOpened = false;
    
    // Keyboard drag mode
    this.keyboardDragMode = false;
    
    // Style dialog state
    this.styleDialog = null;
    this.styleDialogVisible = false;
    this.styleDialogJustOpened = false;
    
    // Language selector state
    this.languageSelector = null;
    this.currentTranscriptLanguage = null;
    this.availableTranscriptLanguages = [];
    this.languageSelectorHandler = null;
    
    // Load saved preferences from localStorage
    const savedPreferences = this.storage.getTranscriptPreferences();
    
    // Autoscroll state (default: true)
    this.autoscrollEnabled = savedPreferences?.autoscroll !== undefined ? savedPreferences.autoscroll : true;
    
    // Transcript styling options (with defaults, then player options, then saved preferences)
    this.transcriptStyle = {
      fontSize: savedPreferences?.fontSize || this.player.options.transcriptFontSize || '100%',
      fontFamily: savedPreferences?.fontFamily || this.player.options.transcriptFontFamily || 'sans-serif',
      color: savedPreferences?.color || this.player.options.transcriptColor || '#ffffff',
      backgroundColor: savedPreferences?.backgroundColor || this.player.options.transcriptBackgroundColor || '#1e1e1e',
      opacity: savedPreferences?.opacity ?? this.player.options.transcriptOpacity ?? 0.98
    };
    
    // Store event handlers for cleanup
    this.handlers = {
      timeupdate: () => this.updateActiveEntry(),
      resize: null,
      mousemove: null,
      mouseup: null,
      touchmove: null,
      touchend: null,
      mousedown: null,
      touchstart: null,
      keydown: null,
      settingsClick: null,
      settingsKeydown: null,
      documentClick: null,
      styleDialogKeydown: null
    };
    
    this.init();
  }

  init() {
    // Listen for time updates to highlight active transcript entry
    this.player.on('timeupdate', this.handlers.timeupdate);
    
    // Reposition transcript when entering/exiting fullscreen
    this.player.on('fullscreenchange', () => {
      if (this.isVisible) {
        // Add a small delay to ensure DOM has updated after fullscreen transition
        setTimeout(() => this.positionTranscript(), 100);
      }
    });
  }

  /**
   * Toggle transcript window visibility
   */
  toggleTranscript() {
    if (this.isVisible) {
      this.hideTranscript();
    } else {
      this.showTranscript();
    }
  }

  /**
   * Show transcript window
   */
  showTranscript() {
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'flex';
      this.isVisible = true;
      
      // Focus the settings button for keyboard accessibility
      setTimeout(() => {
        if (this.settingsButton) {
          this.settingsButton.focus();
        }
      }, 150);
      return;
    }

    // Create transcript window
    this.createTranscriptWindow();
    this.loadTranscriptData();
    
    // Show the window
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'flex';
      // Re-position after showing (in case window was resized while hidden)
      setTimeout(() => this.positionTranscript(), 0);
      
      // Focus the settings button for keyboard accessibility
      setTimeout(() => {
        if (this.settingsButton) {
          this.settingsButton.focus();
        }
      }, 150);
    }
    this.isVisible = true;
  }

  /**
   * Hide transcript window
   */
  hideTranscript() {
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Create the transcript window UI
   */
  createTranscriptWindow() {
    this.transcriptWindow = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-window`,
      attributes: {
        'role': 'dialog',
        'aria-label': 'Video Transcript',
        'tabindex': '-1'
      }
    });

    // Header (draggable)
    this.transcriptHeader = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-header`,
      attributes: {
        'aria-label': 'Drag to reposition transcript. Use arrow keys to move, Home to reset position, Escape to close.',
        'tabindex': '0'
      }
    });

    // Header left side (settings button + title)
    this.headerLeft = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-header-left`
    });

    // Settings button
    this.settingsButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('transcript.settings'),
        'aria-expanded': 'false'
      }
    });
    this.settingsButton.appendChild(createIconElement('settings'));
    this.handlers.settingsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      } else {
        this.showSettingsMenu();
      }
    };
    this.settingsButton.addEventListener('click', this.handlers.settingsClick);
    
    // Keyboard handler for settings button
    this.handlers.settingsKeydown = (e) => {
      // D key to toggle keyboard drag mode
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleKeyboardDragMode();
      }
      // R key to toggle resize mode
      else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        this.toggleResizeMode();
      }
      // Escape to close menu if open
      else if (e.key === 'Escape' && this.settingsMenuVisible) {
        e.preventDefault();
        e.stopPropagation();
        this.hideSettingsMenu();
      }
    };
    this.settingsButton.addEventListener('keydown', this.handlers.settingsKeydown);

    const title = DOMUtils.createElement('h3', {
      textContent: i18n.t('transcript.title')
    });

    // Autoscroll checkbox
    const autoscrollLabel = DOMUtils.createElement('label', {
      className: `${this.player.options.classPrefix}-transcript-autoscroll-label`,
      attributes: {
        'title': i18n.t('transcript.autoscroll')
      }
    });
    
    this.autoscrollCheckbox = DOMUtils.createElement('input', {
      attributes: {
        'type': 'checkbox',
        'checked': this.autoscrollEnabled,
        'aria-label': i18n.t('transcript.autoscroll')
      }
    });
    
    const autoscrollText = DOMUtils.createElement('span', {
      textContent: i18n.t('transcript.autoscroll'),
      className: `${this.player.options.classPrefix}-transcript-autoscroll-text`
    });
    
    autoscrollLabel.appendChild(this.autoscrollCheckbox);
    autoscrollLabel.appendChild(autoscrollText);
    
    // Handle autoscroll checkbox change
    this.autoscrollCheckbox.addEventListener('change', (e) => {
      this.autoscrollEnabled = e.target.checked;
      this.saveAutoscrollPreference();
    });

    this.headerLeft.appendChild(this.settingsButton);
    this.headerLeft.appendChild(title);
    this.headerLeft.appendChild(autoscrollLabel);
    
    // Language selector (will be populated after tracks are loaded)
    this.languageSelector = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-transcript-language-select`,
      attributes: {
        'aria-label': i18n.t('settings.language') || 'Language',
        'style': 'display: none;' // Hidden until we detect multiple languages
      }
    });
    this.headerLeft.appendChild(this.languageSelector);

    const closeButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-close`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('transcript.close')
      }
    });
    closeButton.appendChild(createIconElement('close'));
    closeButton.addEventListener('click', () => this.hideTranscript());

    this.transcriptHeader.appendChild(this.headerLeft);
    this.transcriptHeader.appendChild(closeButton);

    // Content container
    this.transcriptContent = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-content`
    });

    this.transcriptWindow.appendChild(this.transcriptHeader);
    this.transcriptWindow.appendChild(this.transcriptContent);

    // Append to player container
    this.player.container.appendChild(this.transcriptWindow);
    
    // Position it next to the video wrapper
    this.positionTranscript();
    
    // Setup drag functionality
    this.setupDragAndDrop();
    
    // Setup document click handler to close settings menu and style dialog
    // DON'T add it yet - it will be added when the menu is first opened
    this.handlers.documentClick = (e) => {
      // Ignore if menu was just opened (prevents immediate closing)
      if (this.settingsMenuJustOpened) {
        return;
      }
      
      // Ignore if style dialog was just opened (prevents immediate closing)
      if (this.styleDialogJustOpened) {
        return;
      }
      
      // Ignore clicks on the settings button itself
      if (this.settingsButton && this.settingsButton.contains(e.target)) {
        return;
      }
      
      // Ignore clicks on the settings menu items
      if (this.settingsMenu && this.settingsMenu.contains(e.target)) {
        return;
      }
      
      // Close settings menu if clicking outside
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
      
      // Close style dialog if clicking outside (but not on settings button)
      if (this.styleDialogVisible && this.styleDialog && 
          !this.styleDialog.contains(e.target)) {
        this.hideStyleDialog();
      }
    };
    // Store flag to track if handler has been added
    this.documentClickHandlerAdded = false;
    
    // Re-position on window resize (debounced)
    let resizeTimeout;
    this.handlers.resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.positionTranscript(), 100);
    };
    window.addEventListener('resize', this.handlers.resize);
  }
  
  /**
   * Position transcript window next to video
   */
  positionTranscript() {
    if (!this.transcriptWindow || !this.player.videoWrapper || !this.isVisible) return;
    
    const isMobile = window.innerWidth < 640;
    const videoRect = this.player.videoWrapper.getBoundingClientRect();
    
    // Check if player is in fullscreen mode
    const isFullscreen = this.player.state.fullscreen;
    
    if (isMobile && !isFullscreen) {
      // Mobile: Position underneath the video and controls as part of the layout
      this.transcriptWindow.style.position = 'relative';
      this.transcriptWindow.style.left = '0';
      this.transcriptWindow.style.right = '0';
      this.transcriptWindow.style.bottom = 'auto';
      this.transcriptWindow.style.top = 'auto';
      this.transcriptWindow.style.width = '100%';
      this.transcriptWindow.style.maxWidth = '100%';
      this.transcriptWindow.style.maxHeight = '400px';
      this.transcriptWindow.style.height = 'auto';
      this.transcriptWindow.style.borderRadius = '0';
      this.transcriptWindow.style.transform = 'none';
      this.transcriptWindow.style.border = 'none';
      this.transcriptWindow.style.borderTop = '1px solid var(--vidply-border-light)';
      this.transcriptWindow.style.boxShadow = 'none';
      // Disable dragging on mobile
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'default';
      }
      
      // Ensure transcript is at the container level for proper stacking
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    } else if (isFullscreen) {
      // In fullscreen: position in bottom right corner inside the video
      this.transcriptWindow.style.position = 'fixed';
      this.transcriptWindow.style.left = 'auto';
      this.transcriptWindow.style.right = '20px';
      this.transcriptWindow.style.bottom = '80px'; // Above controls
      this.transcriptWindow.style.top = 'auto';
      this.transcriptWindow.style.maxHeight = 'calc(100vh - 180px)'; // Leave space for controls
      this.transcriptWindow.style.height = 'auto';
      this.transcriptWindow.style.width = '400px';
      this.transcriptWindow.style.maxWidth = '400px';
      this.transcriptWindow.style.borderRadius = '8px';
      this.transcriptWindow.style.border = '1px solid var(--vidply-border)';
      this.transcriptWindow.style.borderTop = '';
      
      // Move back to container for fullscreen
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    } else {
      // Desktop mode: position next to video
      this.transcriptWindow.style.position = 'absolute';
      this.transcriptWindow.style.left = `${videoRect.width + 8}px`;
      this.transcriptWindow.style.right = 'auto';
      this.transcriptWindow.style.bottom = 'auto';
      this.transcriptWindow.style.top = '0';
      this.transcriptWindow.style.height = `${videoRect.height}px`;
      this.transcriptWindow.style.maxHeight = 'none';
      this.transcriptWindow.style.width = '400px';
      this.transcriptWindow.style.maxWidth = '400px';
      this.transcriptWindow.style.borderRadius = '8px';
      this.transcriptWindow.style.border = '1px solid var(--vidply-border)';
      this.transcriptWindow.style.borderTop = '';
      // Enable dragging on desktop
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'move';
      }
      
      // Move back to container for desktop
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    }
  }

  /**
   * Get available transcript languages from tracks
   */
  getAvailableTranscriptLanguages() {
    const textTracks = Array.from(this.player.element.textTracks);
    const languages = new Map();
    
    // Collect all caption/subtitle tracks with their languages
    textTracks.forEach(track => {
      if ((track.kind === 'captions' || track.kind === 'subtitles') && track.language) {
        if (!languages.has(track.language)) {
          languages.set(track.language, {
            language: track.language,
            label: track.label || track.language,
            track: track
          });
        }
      }
    });
    
    return Array.from(languages.values());
  }

  /**
   * Update language selector dropdown
   */
  updateLanguageSelector() {
    if (!this.languageSelector) return;
    
    this.availableTranscriptLanguages = this.getAvailableTranscriptLanguages();
    
    // Clear existing options
    this.languageSelector.innerHTML = '';
    
    // Only show selector if there are 2+ languages
    if (this.availableTranscriptLanguages.length < 2) {
      this.languageSelector.style.display = 'none';
      return;
    }
    
    // Show selector and populate options
    this.languageSelector.style.display = 'block';
    
    this.availableTranscriptLanguages.forEach((langInfo, index) => {
      const option = DOMUtils.createElement('option', {
        textContent: langInfo.label,
        attributes: {
          'value': langInfo.language
        }
      });
      this.languageSelector.appendChild(option);
    });
    
    // Set current selection
    if (this.currentTranscriptLanguage) {
      this.languageSelector.value = this.currentTranscriptLanguage;
    } else if (this.availableTranscriptLanguages.length > 0) {
      // Default to first language or active track
      const activeTrack = Array.from(this.player.element.textTracks).find(
        track => (track.kind === 'captions' || track.kind === 'subtitles') && track.mode === 'showing'
      );
      this.currentTranscriptLanguage = activeTrack ? activeTrack.language : this.availableTranscriptLanguages[0].language;
      this.languageSelector.value = this.currentTranscriptLanguage;
    }
    
    // Remove existing change listener if any
    if (this.languageSelectorHandler) {
      this.languageSelector.removeEventListener('change', this.languageSelectorHandler);
    }
    
    // Handle language change
    this.languageSelectorHandler = (e) => {
      this.currentTranscriptLanguage = e.target.value;
      this.loadTranscriptData();
    };
    this.languageSelector.addEventListener('change', this.languageSelectorHandler);
  }

  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.transcriptContent.innerHTML = '';

    // Get all text tracks
    const textTracks = Array.from(this.player.element.textTracks);
    
    // Find track for selected language, or default to first available
    let captionTrack = null;
    if (this.currentTranscriptLanguage) {
      captionTrack = textTracks.find(
        track => (track.kind === 'captions' || track.kind === 'subtitles') && 
                 track.language === this.currentTranscriptLanguage
      );
    }
    
    // Fallback to first available caption/subtitle track
    if (!captionTrack) {
      captionTrack = textTracks.find(
        track => track.kind === 'captions' || track.kind === 'subtitles'
      );
      if (captionTrack) {
        this.currentTranscriptLanguage = captionTrack.language;
      }
    }
    
    // Find description track matching the selected language
    let descriptionTrack = null;
    if (this.currentTranscriptLanguage) {
      descriptionTrack = textTracks.find(
        track => track.kind === 'descriptions' && track.language === this.currentTranscriptLanguage
      );
    }
    // Fallback to first available description track if no match found
    if (!descriptionTrack) {
      descriptionTrack = textTracks.find(track => track.kind === 'descriptions');
    }
    
    const metadataTrack = textTracks.find(track => track.kind === 'metadata');

    // We need at least one track type
    if (!captionTrack && !descriptionTrack && !metadataTrack) {
      this.showNoTranscriptMessage();
      return;
    }

    // Enable all tracks to load cues
    const tracksToLoad = [captionTrack, descriptionTrack, metadataTrack].filter(Boolean);
    tracksToLoad.forEach(track => {
      if (track.mode === 'disabled') {
        track.mode = 'hidden';
      }
    });

    // Check if any tracks are still loading
    const needsLoading = tracksToLoad.some(track => !track.cues || track.cues.length === 0);
    
    if (needsLoading) {
      // Wait for cues to load
      const loadingMessage = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: i18n.t('transcript.loading')
      });
      this.transcriptContent.appendChild(loadingMessage);

      let loaded = 0;
      const onLoad = () => {
        loaded++;
        if (loaded >= tracksToLoad.length) {
          this.loadTranscriptData();
        }
      };

      tracksToLoad.forEach(track => {
        track.addEventListener('load', onLoad, { once: true });
      });

      // Fallback timeout
      setTimeout(() => {
        this.loadTranscriptData();
      }, 500);
      
      return;
    }

    // Collect all cues from all tracks with their type
    const allCues = [];
    
    if (captionTrack && captionTrack.cues) {
      Array.from(captionTrack.cues).forEach(cue => {
        allCues.push({ cue, type: 'caption' });
      });
    }
    
    if (descriptionTrack && descriptionTrack.cues) {
      Array.from(descriptionTrack.cues).forEach(cue => {
        allCues.push({ cue, type: 'description' });
      });
    }
    
    // Store metadata separately for programmatic use (don't display in transcript)
    if (metadataTrack && metadataTrack.cues) {
      this.metadataCues = Array.from(metadataTrack.cues);
      this.setupMetadataHandling();
    }

    // Sort all cues by start time
    allCues.sort((a, b) => a.cue.startTime - b.cue.startTime);

    // Build transcript from captions and descriptions only
    allCues.forEach((item, index) => {
      const entry = this.createTranscriptEntry(item.cue, index, item.type);
      this.transcriptEntries.push({
        element: entry,
        cue: item.cue,
        type: item.type,
        startTime: item.cue.startTime,
        endTime: item.cue.endTime
      });
      this.transcriptContent.appendChild(entry);
    });
    
    // Apply current styles to newly loaded entries
    this.applyTranscriptStyles();
    
    // Update language selector after loading
    this.updateLanguageSelector();
  }

  /**
   * Setup metadata handling
   * Metadata cues are not displayed but can be used programmatically
   */
  setupMetadataHandling() {
    if (!this.metadataCues || this.metadataCues.length === 0) {
      return;
    }

    // Listen for cuechange events on the metadata track to trigger custom actions
    const textTracks = Array.from(this.player.element.textTracks);
    const metadataTrack = textTracks.find(track => track.kind === 'metadata');
    
    if (metadataTrack) {
      metadataTrack.addEventListener('cuechange', () => {
        const activeCues = Array.from(metadataTrack.activeCues || []);
        activeCues.forEach(cue => {
          this.handleMetadataCue(cue);
        });
      });
    }
  }

  /**
   * Handle individual metadata cues
   * Parses metadata text and emits events or triggers actions
   */
  handleMetadataCue(cue) {
    const text = cue.text.trim();
    
    // Emit a generic metadata event that developers can listen to
    this.player.emit('metadata', {
      time: cue.startTime,
      endTime: cue.endTime,
      text: text,
      cue: cue
    });

    // Parse for specific commands (examples based on wwa_meta.vtt format)
    if (text.includes('PAUSE')) {
      // Emit pause suggestion event (don't auto-pause, let developer decide)
      this.player.emit('metadata:pause', { time: cue.startTime, text: text });
    }

    // Parse for focus directives
    const focusMatch = text.match(/FOCUS:([\w#-]+)/);
    if (focusMatch) {
      this.player.emit('metadata:focus', { 
        time: cue.startTime, 
        target: focusMatch[1],
        text: text 
      });
    }

    // Parse for hashtag references
    const hashtags = text.match(/#[\w-]+/g);
    if (hashtags) {
      this.player.emit('metadata:hashtags', {
        time: cue.startTime,
        hashtags: hashtags,
        text: text
      });
    }
  }

  /**
   * Create a single transcript entry element
   */
  createTranscriptEntry(cue, index, type = 'caption') {
    const entry = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-entry ${this.player.options.classPrefix}-transcript-${type}`,
      attributes: {
        'data-start': String(cue.startTime),
        'data-end': String(cue.endTime),
        'data-type': type,
        'role': 'button',
        'tabindex': '0'
      }
    });

    const timestamp = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-transcript-time`,
      textContent: TimeUtils.formatTime(cue.startTime)
    });

    const text = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-transcript-text`,
      textContent: this.stripVTTFormatting(cue.text)
    });

    entry.appendChild(timestamp);
    entry.appendChild(text);

    // Click to seek
    const seekToTime = () => {
      this.player.seek(cue.startTime);
      if (this.player.state.paused) {
        this.player.play();
      }
    };

    entry.addEventListener('click', seekToTime);
    entry.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        seekToTime();
      }
    });

    return entry;
  }

  /**
   * Strip VTT formatting tags from text
   */
  stripVTTFormatting(text) {
    // Remove VTT tags like <v Speaker>, <c>, etc.
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * Show message when no transcript is available
   */
  showNoTranscriptMessage() {
    const message = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-empty`,
      textContent: i18n.t('transcript.noTranscript')
    });
    this.transcriptContent.appendChild(message);
  }

  /**
   * Update active transcript entry based on current time
   */
  updateActiveEntry() {
    if (!this.isVisible || this.transcriptEntries.length === 0) return;

    const currentTime = this.player.state.currentTime;
    
    // Find the entry that matches current time
    const activeEntry = this.transcriptEntries.find(
      entry => currentTime >= entry.startTime && currentTime < entry.endTime
    );

    if (activeEntry && activeEntry !== this.currentActiveEntry) {
      // Remove previous active class
      if (this.currentActiveEntry) {
        this.currentActiveEntry.element.classList.remove(
          `${this.player.options.classPrefix}-transcript-entry-active`
        );
      }

      // Add active class to current entry
      activeEntry.element.classList.add(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      
      // Scroll to active entry
      this.scrollToEntry(activeEntry.element);
      
      this.currentActiveEntry = activeEntry;
    } else if (!activeEntry && this.currentActiveEntry) {
      // No active entry, remove active class
      this.currentActiveEntry.element.classList.remove(
        `${this.player.options.classPrefix}-transcript-entry-active`
      );
      this.currentActiveEntry = null;
    }
  }

  /**
   * Scroll transcript window to show active entry
   */
  scrollToEntry(entryElement) {
    if (!this.transcriptContent || !this.autoscrollEnabled) return;

    const contentRect = this.transcriptContent.getBoundingClientRect();
    const entryRect = entryElement.getBoundingClientRect();

    // Check if entry is out of view
    if (entryRect.top < contentRect.top || entryRect.bottom > contentRect.bottom) {
      // Scroll to center the entry
      const scrollTop = entryElement.offsetTop - (this.transcriptContent.clientHeight / 2) + (entryElement.clientHeight / 2);
      this.transcriptContent.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }
  
  /**
   * Save autoscroll preference to localStorage
   */
  saveAutoscrollPreference() {
    const savedPreferences = this.storage.getTranscriptPreferences() || {};
    savedPreferences.autoscroll = this.autoscrollEnabled;
    this.storage.saveTranscriptPreferences(savedPreferences);
  }

  /**
   * Setup drag and drop functionality
   */
  setupDragAndDrop() {
    if (!this.transcriptHeader || !this.transcriptWindow) return;

    // Create and store handler functions
    this.handlers.mousedown = (e) => {
      // Don't drag if clicking on close button
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-close`)) {
        return;
      }
      
      // Don't drag if clicking on settings button
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-settings`)) {
        return;
      }
      
      // Don't drag if clicking on language selector
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-language-select`)) {
        return;
      }
      
      // Don't drag if clicking on settings menu
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-settings-menu`)) {
        return;
      }
      
      // Don't drag if clicking on style dialog
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-style-dialog`)) {
        return;
      }
      
      this.startDragging(e.clientX, e.clientY);
      e.preventDefault();
    };

    this.handlers.mousemove = (e) => {
      if (this.isDragging) {
        this.drag(e.clientX, e.clientY);
      }
    };

    this.handlers.mouseup = () => {
      if (this.isDragging) {
        this.stopDragging();
      }
    };

    this.handlers.touchstart = (e) => {
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-close`)) {
        return;
      }
      
      // Don't drag if touching settings button
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-settings`)) {
        return;
      }
      
      // Don't drag if touching language selector
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-language-select`)) {
        return;
      }
      
      // Don't drag if touching settings menu
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-settings-menu`)) {
        return;
      }
      
      // Don't drag if touching style dialog
      if (e.target.closest(`.${this.player.options.classPrefix}-transcript-style-dialog`)) {
        return;
      }
      
      const isMobile = window.innerWidth < 640;
      const isFullscreen = this.player.state.fullscreen;
      const touch = e.touches[0];
      
      if (isMobile && !isFullscreen) {
        // Mobile (not fullscreen): No dragging/swiping, transcript is part of layout
        return;
      } else {
        // Desktop or fullscreen: Normal dragging
        this.startDragging(touch.clientX, touch.clientY);
      }
    };

    this.handlers.touchmove = (e) => {
      const isMobile = window.innerWidth < 640;
      const isFullscreen = this.player.state.fullscreen;
      
      if (isMobile && !isFullscreen) {
        // Mobile (not fullscreen): No dragging/swiping
        return;
      } else if (this.isDragging) {
        // Desktop or fullscreen: Normal drag
        const touch = e.touches[0];
        this.drag(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    };

    this.handlers.touchend = () => {
      if (this.isDragging) {
        // Stop dragging
        this.stopDragging();
      }
    };

    this.handlers.keydown = (e) => {
      // Handle arrow keys only in keyboard drag mode
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (!this.keyboardDragMode) {
          // Not in drag mode, let other handlers deal with it
          return;
        }
        
        // In drag mode - move the window
        e.preventDefault();
        e.stopPropagation();
        
        const step = e.shiftKey ? 50 : 10; // Larger steps with Shift key
        
        // Get current position
        let currentLeft = parseFloat(this.transcriptWindow.style.left) || 0;
        let currentTop = parseFloat(this.transcriptWindow.style.top) || 0;
        
        // If window is still centered with transform, convert to absolute position first
        const computedStyle = window.getComputedStyle(this.transcriptWindow);
        if (computedStyle.transform !== 'none') {
          const rect = this.transcriptWindow.getBoundingClientRect();
          currentLeft = rect.left;
          currentTop = rect.top;
          this.transcriptWindow.style.transform = 'none';
          this.transcriptWindow.style.left = `${currentLeft}px`;
          this.transcriptWindow.style.top = `${currentTop}px`;
        }
        
        // Calculate new position based on arrow key
        let newX = currentLeft;
        let newY = currentTop;

        switch(e.key) {
          case 'ArrowLeft':
            newX -= step;
            break;
          case 'ArrowRight':
            newX += step;
            break;
          case 'ArrowUp':
            newY -= step;
            break;
          case 'ArrowDown':
            newY += step;
            break;
        }

        // Set new position directly
        this.transcriptWindow.style.left = `${newX}px`;
        this.transcriptWindow.style.top = `${newY}px`;
        return;
      }
      
      // Handle other special keys
      if (e.key === 'Home') {
        e.preventDefault();
        e.stopPropagation();
        this.resetPosition();
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (this.styleDialogVisible) {
          // Close style dialog first
          this.hideStyleDialog();
        } else if (this.keyboardDragMode) {
          // Exit drag mode
          this.disableKeyboardDragMode();
        } else if (this.settingsMenuVisible) {
          // Close settings menu
          this.hideSettingsMenu();
        } else {
          // Close transcript
          this.hideTranscript();
        }
        return;
      }
    };

    // Add event listeners using stored handlers
    this.transcriptHeader.addEventListener('mousedown', this.handlers.mousedown);
    document.addEventListener('mousemove', this.handlers.mousemove);
    document.addEventListener('mouseup', this.handlers.mouseup);
    
    this.transcriptHeader.addEventListener('touchstart', this.handlers.touchstart);
    document.addEventListener('touchmove', this.handlers.touchmove);
    document.addEventListener('touchend', this.handlers.touchend);
    
    this.transcriptHeader.addEventListener('keydown', this.handlers.keydown);
  }

  /**
   * Start dragging
   */
  startDragging(clientX, clientY) {
    // Get current rendered position (this is where it actually appears on screen)
    const rect = this.transcriptWindow.getBoundingClientRect();
    
    // Get the parent container position (player container)
    const containerRect = this.player.container.getBoundingClientRect();
    
    // Calculate position RELATIVE to container (not viewport)
    const relativeLeft = rect.left - containerRect.left;
    const relativeTop = rect.top - containerRect.top;
    
    // If window is centered with transform, convert to absolute position
    const computedStyle = window.getComputedStyle(this.transcriptWindow);
    if (computedStyle.transform !== 'none') {
      // Remove transform and set position relative to container
      this.transcriptWindow.style.transform = 'none';
      this.transcriptWindow.style.left = `${relativeLeft}px`;
      this.transcriptWindow.style.top = `${relativeTop}px`;
    }
    
    // Calculate offset based on viewport coordinates (where user clicked)
    this.dragOffsetX = clientX - rect.left;
    this.dragOffsetY = clientY - rect.top;
    
    this.isDragging = true;
    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-dragging`);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }

  /**
   * Perform drag
   */
  drag(clientX, clientY) {
    if (!this.isDragging) return;

    // Calculate new viewport position based on mouse position minus the offset
    const newViewportX = clientX - this.dragOffsetX;
    const newViewportY = clientY - this.dragOffsetY;
    
    // Convert to position relative to container
    const containerRect = this.player.container.getBoundingClientRect();
    const newX = newViewportX - containerRect.left;
    const newY = newViewportY - containerRect.top;
    
    // During drag, set position relative to container
    this.transcriptWindow.style.left = `${newX}px`;
    this.transcriptWindow.style.top = `${newY}px`;
  }

  /**
   * Stop dragging
   */
  stopDragging() {
    this.isDragging = false;
    this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-dragging`);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  /**
   * Set window position with boundary constraints
   */
  setPosition(x, y) {
    const rect = this.transcriptWindow.getBoundingClientRect();
    
    // Use document dimensions for fixed positioning
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    
    // Very relaxed boundaries - allow window to go mostly off-screen
    // Just keep a small part visible so user can always drag it back
    const minVisible = 100; // Keep at least 100px visible
    const minX = -(rect.width - minVisible);  // Can go way off-screen to the left
    const minY = -(rect.height - minVisible); // Can go way off-screen to the top
    const maxX = viewportWidth - minVisible;  // Can go way off-screen to the right
    const maxY = viewportHeight - minVisible; // Can go way off-screen to the bottom
    
    // Clamp position to boundaries (very loose)
    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(minY, Math.min(y, maxY));
    
    this.transcriptWindow.style.left = `${x}px`;
    this.transcriptWindow.style.top = `${y}px`;
    this.transcriptWindow.style.transform = 'none';
  }

  /**
   * Reset position to center
   */
  resetPosition() {
    this.transcriptWindow.style.left = '50%';
    this.transcriptWindow.style.top = '50%';
    this.transcriptWindow.style.transform = 'translate(-50%, -50%)';
  }

  /**
   * Toggle keyboard drag mode
   */
  toggleKeyboardDragMode() {
    if (this.keyboardDragMode) {
      this.disableKeyboardDragMode();
    } else {
      this.enableKeyboardDragMode();
    }
  }

  /**
   * Enable keyboard drag mode
   */
  enableKeyboardDragMode() {
    this.keyboardDragMode = true;
    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-keyboard-drag`);
    
    // Update settings button aria label
    if (this.settingsButton) {
      this.settingsButton.setAttribute('aria-label', 'Keyboard drag mode active. Use arrow keys to move window. Press D or Escape to exit.');
    }
    
    // Add visual indicator
    const indicator = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-drag-indicator`,
      textContent: i18n.t('transcript.keyboardDragActive')
    });
    this.transcriptHeader.appendChild(indicator);
    
    // Hide settings menu if open
    if (this.settingsMenuVisible) {
      this.hideSettingsMenu();
    }
    
    // Focus the header for keyboard navigation
    this.transcriptHeader.focus();
  }

  /**
   * Disable keyboard drag mode
   */
  disableKeyboardDragMode() {
    this.keyboardDragMode = false;
    this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-keyboard-drag`);
    
    // Update settings button aria label
    if (this.settingsButton) {
      this.settingsButton.setAttribute('aria-label', 'Transcript settings. Press Enter to open menu, or D to enable drag mode');
    }
    
    // Remove visual indicator
    const indicator = this.transcriptHeader.querySelector(`.${this.player.options.classPrefix}-transcript-drag-indicator`);
    if (indicator) {
      indicator.remove();
    }
    
    // Focus back to settings button
    if (this.settingsButton) {
      this.settingsButton.focus();
    }
  }

  /**
   * Toggle settings menu visibility
   */
  toggleSettingsMenu() {
    if (this.settingsMenuVisible) {
      this.hideSettingsMenu();
    } else {
      this.showSettingsMenu();
    }
  }

  /**
   * Show settings menu
   */
  showSettingsMenu() {
    // Set flag to prevent immediate closing
    this.settingsMenuJustOpened = true;
    setTimeout(() => {
      this.settingsMenuJustOpened = false;
    }, 350);
    
    // Add document click handler on FIRST menu open (not at window creation)
    if (!this.documentClickHandlerAdded) {
      setTimeout(() => {
        document.addEventListener('click', this.handlers.documentClick);
        this.documentClickHandlerAdded = true;
      }, 300);
    }
    
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'block';
      this.settingsMenuVisible = true;
      return;
    }
    // Create settings menu
    this.settingsMenu = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-settings-menu`
    });

    // Keyboard drag option
    const keyboardDragOption = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings-item`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('transcript.keyboardDragMode')
      }
    });
    const keyboardIcon = createIconElement('move');
    const keyboardText = DOMUtils.createElement('span', {
      textContent: i18n.t('transcript.keyboardDragMode')
    });
    keyboardDragOption.appendChild(keyboardIcon);
    keyboardDragOption.appendChild(keyboardText);
    keyboardDragOption.addEventListener('click', () => {
      this.toggleKeyboardDragMode();
      this.hideSettingsMenu();
    });
    
    // Style option
    const styleOption = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings-item`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('transcript.styleTranscript')
      }
    });
    const styleIcon = createIconElement('settings');
    const styleText = DOMUtils.createElement('span', {
      textContent: i18n.t('transcript.styleTranscript')
    });
    styleOption.appendChild(styleIcon);
    styleOption.appendChild(styleText);
    styleOption.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hideSettingsMenu();
      // Delay to ensure menu is fully closed before opening dialog
      setTimeout(() => {
        this.showStyleDialog();
      }, 50);
    });

    // Resize option
    const resizeOption = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings-item`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('transcript.resizeWindow')
      }
    });
    const resizeIcon = createIconElement('resize');
    const resizeText = DOMUtils.createElement('span', {
      textContent: i18n.t('transcript.resizeWindow')
    });
    resizeOption.appendChild(resizeIcon);
    resizeOption.appendChild(resizeText);
    resizeOption.addEventListener('click', () => {
      this.toggleResizeMode();
      this.hideSettingsMenu();
    });

    // Close option
    const closeOption = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings-item`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('transcript.closeMenu')
      }
    });
    const closeIcon = createIconElement('close');
    const closeText = DOMUtils.createElement('span', {
      textContent: i18n.t('transcript.closeMenu')
    });
    closeOption.appendChild(closeIcon);
    closeOption.appendChild(closeText);
    closeOption.addEventListener('click', () => {
      this.hideSettingsMenu();
    });

    this.settingsMenu.appendChild(keyboardDragOption);
    this.settingsMenu.appendChild(resizeOption);
    this.settingsMenu.appendChild(styleOption);
    this.settingsMenu.appendChild(closeOption);

    // Append menu to header left container for proper positioning
    if (this.headerLeft) {
      this.headerLeft.appendChild(this.settingsMenu);
    } else {
      this.transcriptHeader.appendChild(this.settingsMenu);
    }
    
    // Set the menu as visible and display it
    this.settingsMenuVisible = true;
    this.settingsMenu.style.display = 'block';
    
    // Update aria-expanded
    if (this.settingsButton) {
      this.settingsButton.setAttribute('aria-expanded', 'true');
    }
    
    // Focus first menu item
    setTimeout(() => {
      const firstItem = this.settingsMenu.querySelector(`.${this.player.options.classPrefix}-transcript-settings-item`);
      if (firstItem) {
        firstItem.focus();
      }
    }, 0);
  }

  /**
   * Hide settings menu
   */
  hideSettingsMenu() {
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'none';
      this.settingsMenuVisible = false;
      this.settingsMenuJustOpened = false;
      
      // Update aria-expanded
      if (this.settingsButton) {
        this.settingsButton.setAttribute('aria-expanded', 'false');
        // Return focus to settings button
        this.settingsButton.focus();
      }
    }
  }

  /**
   * Enable move mode (gives visual feedback)
   */
  enableMoveMode() {
    // Add visual feedback for move mode
    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-move-mode`);
    
    // Show tooltip about keyboard drag option
    const tooltip = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-move-tooltip`,
      textContent: 'Drag with mouse or press D for keyboard drag mode'
    });
    this.transcriptHeader.appendChild(tooltip);
    
    // Remove after 2 seconds
    setTimeout(() => {
      this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-move-mode`);
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 2000);
  }

  /**
   * Toggle resize mode
   */
  toggleResizeMode() {
    this.resizeEnabled = !this.resizeEnabled;
    
    if (this.resizeEnabled) {
      this.enableResizeHandles();
    } else {
      this.disableResizeHandles();
    }
  }

  /**
   * Enable resize handles
   */
  enableResizeHandles() {
    if (!this.transcriptWindow) return;

    // Add resize handles if they don't exist
    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    
    directions.forEach(direction => {
      const handle = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-resize-handle ${this.player.options.classPrefix}-transcript-resize-${direction}`,
        attributes: {
          'data-direction': direction
        }
      });

      handle.addEventListener('mousedown', (e) => this.startResize(e, direction));
      handle.addEventListener('touchstart', (e) => this.startResize(e.touches[0], direction));

      this.transcriptWindow.appendChild(handle);
    });

    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-resizable`);

    // Setup resize event handlers
    this.handlers.resizeMove = (e) => {
      if (this.isResizing) {
        this.performResize(e.clientX, e.clientY);
      }
    };

    this.handlers.resizeEnd = () => {
      if (this.isResizing) {
        this.stopResize();
      }
    };

    this.handlers.resizeTouchMove = (e) => {
      if (this.isResizing) {
        this.performResize(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    };

    document.addEventListener('mousemove', this.handlers.resizeMove);
    document.addEventListener('mouseup', this.handlers.resizeEnd);
    document.addEventListener('touchmove', this.handlers.resizeTouchMove);
    document.addEventListener('touchend', this.handlers.resizeEnd);
  }

  /**
   * Disable resize handles
   */
  disableResizeHandles() {
    if (!this.transcriptWindow) return;

    // Remove all resize handles
    const handles = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-resize-handle`);
    handles.forEach(handle => handle.remove());

    this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-resizable`);

    // Remove resize event handlers
    if (this.handlers.resizeMove) {
      document.removeEventListener('mousemove', this.handlers.resizeMove);
    }
    if (this.handlers.resizeEnd) {
      document.removeEventListener('mouseup', this.handlers.resizeEnd);
    }
    if (this.handlers.resizeTouchMove) {
      document.removeEventListener('touchmove', this.handlers.resizeTouchMove);
    }
    document.removeEventListener('touchend', this.handlers.resizeEnd);
  }

  /**
   * Start resizing
   */
  startResize(e, direction) {
    e.stopPropagation();
    e.preventDefault();

    this.isResizing = true;
    this.resizeDirection = direction;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;

    const rect = this.transcriptWindow.getBoundingClientRect();
    this.resizeStartWidth = rect.width;
    this.resizeStartHeight = rect.height;

    this.transcriptWindow.classList.add(`${this.player.options.classPrefix}-transcript-resizing`);
    document.body.style.cursor = this.getResizeCursor(direction);
    document.body.style.userSelect = 'none';
  }

  /**
   * Perform resize
   */
  performResize(clientX, clientY) {
    if (!this.isResizing) return;

    const deltaX = clientX - this.resizeStartX;
    const deltaY = clientY - this.resizeStartY;

    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;

    const direction = this.resizeDirection;

    // Calculate new dimensions based on direction
    if (direction.includes('e')) {
      newWidth = this.resizeStartWidth + deltaX;
    }
    if (direction.includes('w')) {
      newWidth = this.resizeStartWidth - deltaX;
    }
    if (direction.includes('s')) {
      newHeight = this.resizeStartHeight + deltaY;
    }
    if (direction.includes('n')) {
      newHeight = this.resizeStartHeight - deltaY;
    }

    // Apply minimum and maximum constraints
    const minWidth = 300;
    const minHeight = 200;
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;

    newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

    // Apply new dimensions
    this.transcriptWindow.style.width = `${newWidth}px`;
    this.transcriptWindow.style.height = `${newHeight}px`;
    this.transcriptWindow.style.maxWidth = `${newWidth}px`;
    this.transcriptWindow.style.maxHeight = `${newHeight}px`;

    // Adjust position if resizing from top or left
    if (direction.includes('w')) {
      const currentLeft = parseFloat(this.transcriptWindow.style.left) || 0;
      this.transcriptWindow.style.left = `${currentLeft + (this.resizeStartWidth - newWidth)}px`;
    }
    if (direction.includes('n')) {
      const currentTop = parseFloat(this.transcriptWindow.style.top) || 0;
      this.transcriptWindow.style.top = `${currentTop + (this.resizeStartHeight - newHeight)}px`;
    }
  }

  /**
   * Stop resizing
   */
  stopResize() {
    this.isResizing = false;
    this.resizeDirection = null;
    this.transcriptWindow.classList.remove(`${this.player.options.classPrefix}-transcript-resizing`);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  /**
   * Get cursor style for resize direction
   */
  getResizeCursor(direction) {
    const cursors = {
      'n': 'ns-resize',
      's': 'ns-resize',
      'e': 'ew-resize',
      'w': 'ew-resize',
      'ne': 'nesw-resize',
      'nw': 'nwse-resize',
      'se': 'nwse-resize',
      'sw': 'nesw-resize'
    };
    return cursors[direction] || 'default';
  }

  /**
   * Show style dialog
   */
  showStyleDialog() {
    // If dialog already exists, just show it
    if (this.styleDialog) {
      this.styleDialog.style.display = 'block';
      this.styleDialogVisible = true;
      
      // Set flag to prevent immediate closing from document click
      this.styleDialogJustOpened = true;
      setTimeout(() => {
        this.styleDialogJustOpened = false;
      }, 350);
      
      // Focus first control
      setTimeout(() => {
        const firstSelect = this.styleDialog.querySelector('select, input');
        if (firstSelect) {
          firstSelect.focus();
        }
      }, 0);
      return;
    }

    // Create style dialog
    this.styleDialog = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-dialog`
    });

    // Dialog title
    const title = DOMUtils.createElement('h4', {
      textContent: i18n.t('transcript.styleTitle'),
      className: `${this.player.options.classPrefix}-transcript-style-title`
    });
    this.styleDialog.appendChild(title);

    // Font Size
    const fontSizeControl = this.createStyleSelectControl(
      i18n.t('captions.fontSize'),
      'fontSize',
      [
        { label: i18n.t('fontSizes.small'), value: '87.5%' },
        { label: i18n.t('fontSizes.normal'), value: '100%' },
        { label: i18n.t('fontSizes.large'), value: '125%' },
        { label: i18n.t('fontSizes.xlarge'), value: '150%' }
      ]
    );
    this.styleDialog.appendChild(fontSizeControl);

    // Font Family
    const fontFamilyControl = this.createStyleSelectControl(
      i18n.t('captions.fontFamily'),
      'fontFamily',
      [
        { label: i18n.t('fontFamilies.sansSerif'), value: 'sans-serif' },
        { label: i18n.t('fontFamilies.serif'), value: 'serif' },
        { label: i18n.t('fontFamilies.monospace'), value: 'monospace' }
      ]
    );
    this.styleDialog.appendChild(fontFamilyControl);

    // Text Color
    const colorControl = this.createStyleColorControl(i18n.t('captions.color'), 'color');
    this.styleDialog.appendChild(colorControl);

    // Background Color
    const bgColorControl = this.createStyleColorControl(i18n.t('captions.backgroundColor'), 'backgroundColor');
    this.styleDialog.appendChild(bgColorControl);

    // Opacity
    const opacityControl = this.createStyleOpacityControl(i18n.t('captions.opacity'), 'opacity');
    this.styleDialog.appendChild(opacityControl);

    // Close button
    const closeBtn = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-style-close`,
      textContent: i18n.t('settings.close'),
      attributes: {
        'type': 'button'
      }
    });
    closeBtn.addEventListener('click', () => this.hideStyleDialog());
    this.styleDialog.appendChild(closeBtn);

    // ESC key handler for style dialog
    this.handlers.styleDialogKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hideStyleDialog();
      }
    };
    this.styleDialog.addEventListener('keydown', this.handlers.styleDialogKeydown);

    // Append to header left container (same as settings menu) for correct positioning
    if (this.headerLeft) {
      this.headerLeft.appendChild(this.styleDialog);
    } else {
      this.transcriptHeader.appendChild(this.styleDialog);
    }
    
    // Apply current styles
    this.applyTranscriptStyles();
    
    // Important: Set visible state and display before focusing
    this.styleDialogVisible = true;
    this.styleDialog.style.display = 'block';
    
    // Set flag to prevent immediate closing from document click
    this.styleDialogJustOpened = true;
    setTimeout(() => {
      this.styleDialogJustOpened = false;
    }, 350);
    
    // Focus first control for keyboard accessibility
    setTimeout(() => {
      const firstSelect = this.styleDialog.querySelector('select, input');
      if (firstSelect) {
        firstSelect.focus();
      }
    }, 0);
  }

  /**
   * Hide style dialog
   */
  hideStyleDialog() {
    if (this.styleDialog) {
      this.styleDialog.style.display = 'none';
      this.styleDialogVisible = false;
      
      // Return focus to settings button
      if (this.settingsButton) {
        this.settingsButton.focus();
      }
    }
  }

  /**
   * Create style select control
   */
  createStyleSelectControl(label, property, options) {
    const group = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });

    const labelEl = DOMUtils.createElement('label', {
      textContent: label
    });
    group.appendChild(labelEl);

    const select = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-transcript-style-select`
    });

    options.forEach(opt => {
      const option = DOMUtils.createElement('option', {
        textContent: opt.label,
        attributes: {
          'value': opt.value
        }
      });
      if (this.transcriptStyle[property] === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.transcriptStyle[property] = e.target.value;
      this.applyTranscriptStyles();
      this.savePreferences();
    });

    group.appendChild(select);
    return group;
  }

  /**
   * Create style color control
   */
  createStyleColorControl(label, property) {
    const group = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });

    const labelEl = DOMUtils.createElement('label', {
      textContent: label
    });
    group.appendChild(labelEl);

    const input = DOMUtils.createElement('input', {
      attributes: {
        'type': 'color',
        'value': this.transcriptStyle[property]
      },
      className: `${this.player.options.classPrefix}-transcript-style-color`
    });

    input.addEventListener('input', (e) => {
      this.transcriptStyle[property] = e.target.value;
      this.applyTranscriptStyles();
      this.savePreferences();
    });

    group.appendChild(input);
    return group;
  }

  /**
   * Create style opacity control
   */
  createStyleOpacityControl(label, property) {
    const group = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-group`
    });

    const labelEl = DOMUtils.createElement('label', {
      textContent: label
    });
    group.appendChild(labelEl);

    const valueDisplay = DOMUtils.createElement('span', {
      textContent: Math.round(this.transcriptStyle[property] * 100) + '%',
      className: `${this.player.options.classPrefix}-transcript-style-value`
    });

    const input = DOMUtils.createElement('input', {
      attributes: {
        'type': 'range',
        'min': '0',
        'max': '1',
        'step': '0.1',
        'value': String(this.transcriptStyle[property])
      },
      className: `${this.player.options.classPrefix}-transcript-style-range`
    });

    input.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.transcriptStyle[property] = value;
      valueDisplay.textContent = Math.round(value * 100) + '%';
      this.applyTranscriptStyles();
      this.savePreferences();
    });

    const inputContainer = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-style-range-container`
    });
    inputContainer.appendChild(input);
    inputContainer.appendChild(valueDisplay);

    group.appendChild(labelEl);
    group.appendChild(inputContainer);
    return group;
  }

  /**
   * Save transcript preferences to localStorage
   */
  savePreferences() {
    this.storage.saveTranscriptPreferences(this.transcriptStyle);
  }

  /**
   * Apply transcript styles
   */
  applyTranscriptStyles() {
    if (!this.transcriptWindow) return;

    // Apply to transcript window background
    this.transcriptWindow.style.backgroundColor = this.transcriptStyle.backgroundColor;
    this.transcriptWindow.style.opacity = String(this.transcriptStyle.opacity);

    // Apply to content area
    if (this.transcriptContent) {
      this.transcriptContent.style.fontSize = this.transcriptStyle.fontSize;
      this.transcriptContent.style.fontFamily = this.transcriptStyle.fontFamily;
      this.transcriptContent.style.color = this.transcriptStyle.color;
    }

    // Apply to all text entries (important: override CSS defaults)
    const textEntries = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-text`);
    textEntries.forEach(entry => {
      entry.style.fontSize = this.transcriptStyle.fontSize;
      entry.style.fontFamily = this.transcriptStyle.fontFamily;
      entry.style.color = this.transcriptStyle.color;
    });
    
    // Apply to timestamp entries as well
    const timeEntries = this.transcriptWindow.querySelectorAll(`.${this.player.options.classPrefix}-transcript-time`);
    timeEntries.forEach(entry => {
      entry.style.fontFamily = this.transcriptStyle.fontFamily;
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    // Disable modes if active
    if (this.resizeEnabled) {
      this.disableResizeHandles();
    }
    if (this.keyboardDragMode) {
      this.disableKeyboardDragMode();
    }

    // Remove timeupdate listener from player
    if (this.handlers.timeupdate) {
      this.player.off('timeupdate', this.handlers.timeupdate);
    }

    // Remove drag event listeners
    if (this.transcriptHeader) {
      if (this.handlers.mousedown) {
        this.transcriptHeader.removeEventListener('mousedown', this.handlers.mousedown);
      }
      if (this.handlers.touchstart) {
        this.transcriptHeader.removeEventListener('touchstart', this.handlers.touchstart);
      }
      if (this.handlers.keydown) {
        this.transcriptHeader.removeEventListener('keydown', this.handlers.keydown);
      }
    }
    
    // Remove settings button event listeners
    if (this.settingsButton) {
      if (this.handlers.settingsClick) {
        this.settingsButton.removeEventListener('click', this.handlers.settingsClick);
      }
      if (this.handlers.settingsKeydown) {
        this.settingsButton.removeEventListener('keydown', this.handlers.settingsKeydown);
      }
    }
    
    // Remove style dialog event listeners
    if (this.styleDialog && this.handlers.styleDialogKeydown) {
      this.styleDialog.removeEventListener('keydown', this.handlers.styleDialogKeydown);
    }

    // Remove document-level listeners
    if (this.handlers.mousemove) {
      document.removeEventListener('mousemove', this.handlers.mousemove);
    }
    if (this.handlers.mouseup) {
      document.removeEventListener('mouseup', this.handlers.mouseup);
    }
    if (this.handlers.touchmove) {
      document.removeEventListener('touchmove', this.handlers.touchmove);
    }
    if (this.handlers.touchend) {
      document.removeEventListener('touchend', this.handlers.touchend);
    }
    if (this.handlers.documentClick) {
      document.removeEventListener('click', this.handlers.documentClick);
    }
    
    // Remove window-level listeners
    if (this.handlers.resize) {
      window.removeEventListener('resize', this.handlers.resize);
    }

    // Clear handlers
    this.handlers = null;

    // Remove DOM element
    if (this.transcriptWindow && this.transcriptWindow.parentNode) {
      this.transcriptWindow.parentNode.removeChild(this.transcriptWindow);
    }
    
    this.transcriptWindow = null;
    this.transcriptHeader = null;
    this.transcriptContent = null;
    this.transcriptEntries = [];
    this.settingsMenu = null;
    this.styleDialog = null;
  }
}
