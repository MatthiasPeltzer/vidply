/**
 * Transcript Manager Component
 * Manages transcript display and interaction
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { StorageManager } from '../utils/StorageManager.js';
import { focusElement, focusFirstElement } from '../utils/FocusUtils.js';
import { createMenuItem, attachMenuKeyboardNavigation, focusFirstMenuItem } from '../utils/MenuUtils.js';
import { DraggableResizable } from '../utils/DraggableResizable.js';
import { createLabeledSelect, toggleLabeledSelect, preventDragOnElement } from '../utils/FormUtils.js';

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
    
    // Draggable/Resizable utility
    this.draggableResizable = null;
    
    // Settings menu state
    this.settingsMenuVisible = false;
    this.settingsMenu = null;
    this.settingsButton = null;
    this.settingsMenuJustOpened = false;
    
    // Resize mode state
    this.resizeOptionButton = null;
    this.resizeOptionText = null;
    this.dragOptionButton = null;
    this.dragOptionText = null;
    this.resizeModeIndicator = null;
    this.resizeModeIndicatorTimeout = null;
    this.transcriptResizeHandles = [];
    this.liveRegion = null;
    
    // Style dialog state
    this.styleDialog = null;
    this.styleDialogVisible = false;
    this.styleDialogJustOpened = false;
    
    // Language selector state
    this.languageSelector = null;
    this.languageLabel = null;
    this.currentTranscriptLanguage = null;
    this.availableTranscriptLanguages = [];
    this.languageSelectorHandler = null;
    
    // Load saved preferences from localStorage
    const savedPreferences = this.storage.getTranscriptPreferences();
    
    // Autoscroll state (default: true)
    this.autoscrollEnabled = savedPreferences?.autoscroll !== undefined ? savedPreferences.autoscroll : true;
    
    // Show timestamps state (default: false)
    this.showTimestamps = savedPreferences?.showTimestamps !== undefined ? savedPreferences.showTimestamps : false;
    
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
      seeked: () => this.updateActiveEntry(),
      audiodescriptionenabled: () => {
        if (this.isVisible) {
          this.loadTranscriptData();
        }
      },
      audiodescriptiondisabled: () => {
        if (this.isVisible) {
          this.loadTranscriptData();
        }
      },
      textcuesupdate: null,
      resize: null,
      settingsClick: null,
      settingsKeydown: null,
      documentClick: null,
      styleDialogKeydown: null
    };

    this._cueUpdateTimeout = null;
    
    // Timeout management (for cleanup)
    this.timeouts = new Set();
    
    this.init();
  }

  init() {
    // Set up metadata handling immediately (independent of transcript display)
    this.setupMetadataHandlingOnLoad();
    
    // Listen for time updates to highlight active transcript entry
    this.player.on('timeupdate', this.handlers.timeupdate);
    this.player.on('seeked', this.handlers.seeked);
    
    // Listen for audio description changes to reload transcript
    this.player.on('audiodescriptionenabled', this.handlers.audiodescriptionenabled);
    this.player.on('audiodescriptiondisabled', this.handlers.audiodescriptiondisabled);

    // Listen for text cue updates (cues arrive incrementally as segments load in HLS/DASH)
    this.handlers.textcuesupdate = () => {
      if (!this.isVisible) return;
      if (this._cueUpdateTimeout) {
        this.clearManagedTimeout(this._cueUpdateTimeout);
      }
      this._cueUpdateTimeout = this.setManagedTimeout(() => {
        this._cueUpdateTimeout = null;
        this.loadTranscriptData();
      }, 400);
    };
    this.player.on('textcuesupdate', this.handlers.textcuesupdate);
    
    // Reposition transcript when entering/exiting fullscreen
    this.player.on('fullscreenchange', () => {
      if (this.isVisible) {
        // Re-setup drag/drop when entering/exiting fullscreen on mobile devices
        // This enables drag/resize when entering fullscreen on mobile
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          this.setupDragAndDrop();
        }
        
        // Only auto-position if user hasn't manually positioned it
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          // Add a small delay to ensure DOM has updated after fullscreen transition
          this.setManagedTimeout(() => this.positionTranscript(), 100);
        }
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
    // Always invalidate track cache to get fresh HLS subtitle tracks
    this.player.invalidateTrackCache();
    
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'flex';
      this.isVisible = true;
      
      // Reload transcript data to get fresh HLS tracks
      this.loadTranscriptData();
      this.updateLanguageSelector();

      if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === 'function') {
        this.player.controlBar.updateTranscriptButton();
      }
      
      // Focus the settings button for keyboard accessibility
      focusElement(this.settingsButton, { delay: 150 });
      return;
    }

    // Create transcript window
    this.createTranscriptWindow();
    this.loadTranscriptData();
    
    // Show the window
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'flex';
      
      // Only auto-position if user hasn't manually positioned it
      // This prevents overwriting saved positions from localStorage
      if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
        this.setManagedTimeout(() => this.positionTranscript(), 0);
      }
      
      // Focus the settings button for keyboard accessibility
      focusElement(this.settingsButton, { delay: 150 });
    }
    this.isVisible = true;
  }

  /**
   * Hide transcript window
   */
  hideTranscript({ focusButton = false } = {}) {
    if (this.transcriptWindow) {
      this.transcriptWindow.style.display = 'none';
      this.isVisible = false;
    }
    if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
      this.draggableResizable.disablePointerResizeMode();
      this.updateResizeOptionState();
    }
    this.hideResizeModeIndicator();
    this.announceLive('');

    // Update transcript button state in control bar
    if (this.player.controlBar && typeof this.player.controlBar.updateTranscriptButton === 'function') {
      this.player.controlBar.updateTranscriptButton();
    }

    if (focusButton) {
      const transcriptButton = this.player.controlBar?.controls?.transcript;
      if (transcriptButton && typeof transcriptButton.focus === 'function') {
        transcriptButton.focus({ preventScroll: true });
      }
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
        'aria-label': i18n.t('transcript.ariaLabel'),
        'tabindex': '-1'
      }
    });

    // Header (draggable)
    this.transcriptHeader = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-header`,
      attributes: {
        'tabindex': '0'
      }
    });

    // Header left side (settings button + title)
    this.headerLeft = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-header-left`
    });

    // Settings button
    const settingsAriaLabel = i18n.t('transcript.settingsMenu');
    this.settingsButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-settings`,
      attributes: {
        'type': 'button',
        'aria-label': settingsAriaLabel,
        'aria-expanded': 'false'
      }
    });
    this.settingsButton.appendChild(createIconElement('settings'));
    DOMUtils.attachTooltip(this.settingsButton, settingsAriaLabel, this.player.options.classPrefix);
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
      textContent: `${i18n.t('transcript.title')}. ${i18n.t('transcript.dragResizePrompt')}`
    });

    // Autoscroll checkbox
    const autoscrollId = `${this.player.options.classPrefix}-transcript-autoscroll-${Date.now()}`;
    
    const autoscrollLabel = DOMUtils.createElement('label', {
      className: `${this.player.options.classPrefix}-transcript-autoscroll-label`,
      attributes: {
        'for': autoscrollId
      }
    });
    
    this.autoscrollCheckbox = DOMUtils.createElement('input', {
      attributes: {
        'id': autoscrollId,
        'type': 'checkbox'
      }
    });
    // Set checked property directly (boolean attribute, not "true" string)
    if (this.autoscrollEnabled) {
      this.autoscrollCheckbox.checked = true;
    }
    
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

    preventDragOnElement(autoscrollLabel);

    this.transcriptHeader.appendChild(title);
    this.headerLeft.appendChild(this.settingsButton);
    this.headerLeft.appendChild(autoscrollLabel);
    
    // Language selector (will be populated after tracks are loaded)
    const selectId = `${this.player.options.classPrefix}-transcript-language-select-${Date.now()}`;
    const { label: languageLabel, select: languageSelector } = createLabeledSelect({
      classPrefix: this.player.options.classPrefix,
      labelClass: `${this.player.options.classPrefix}-transcript-language-label`,
      selectClass: `${this.player.options.classPrefix}-transcript-language-select`,
      labelText: 'settings.language',
      selectId: selectId,
      hidden: false // Don't hide individual elements, we'll hide the wrapper instead
    });
    
    this.languageLabel = languageLabel;
    this.languageSelector = languageSelector;
    
    // Wrap label and select in a container for vertical stacking
    const languageSelectorWrapper = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-language-wrapper`,
      attributes: {
        'style': 'display: none;' // Hidden until we detect multiple languages
      }
    });
    languageSelectorWrapper.appendChild(this.languageLabel);
    languageSelectorWrapper.appendChild(this.languageSelector);
    this.languageSelectorWrapper = languageSelectorWrapper;
    
    // Prevent drag when interacting with wrapper
    preventDragOnElement(languageSelectorWrapper);
    
    this.headerLeft.appendChild(languageSelectorWrapper);

    const closeAriaLabel = i18n.t('transcript.close');
    const closeButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-close`,
      attributes: {
        'type': 'button',
        'aria-label': closeAriaLabel
      }
    });
    closeButton.appendChild(createIconElement('close'));
    DOMUtils.attachTooltip(closeButton, closeAriaLabel, this.player.options.classPrefix);
    closeButton.addEventListener('click', () => this.hideTranscript({ focusButton: true }));

    this.transcriptHeader.appendChild(this.headerLeft);
    this.transcriptHeader.appendChild(closeButton);

    // Content container
    this.transcriptContent = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-content`
    });

    this.transcriptWindow.appendChild(this.transcriptHeader);
    this.transcriptWindow.appendChild(this.transcriptContent);

    this.createResizeHandles();

    // Live region for announcements (screen reader feedback)
    this.liveRegion = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      attributes: {
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });
    this.transcriptWindow.appendChild(this.liveRegion);

    // Append to player container
    this.player.container.appendChild(this.transcriptWindow);
    
    // Setup drag functionality FIRST (this will restore saved position if it exists)
    this.setupDragAndDrop();
    
    // Then position it next to the video wrapper ONLY if user hasn't manually positioned it
    // This ensures we don't overwrite saved positions from localStorage
    if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
      this.positionTranscript();
    }
    
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
    
    // Re-position on window resize (debounced) - but only if not manually positioned
    let resizeTimeout;
    this.handlers.resize = () => {
      if (resizeTimeout) {
        this.clearManagedTimeout(resizeTimeout);
      }
      resizeTimeout = this.setManagedTimeout(() => {
        // Only auto-position if user hasn't manually moved it
        if (!this.draggableResizable || !this.draggableResizable.manuallyPositioned) {
          this.positionTranscript();
        }
      }, 100);
    };
    window.addEventListener('resize', this.handlers.resize);
  }
  
  createResizeHandles() {
    if (!this.transcriptWindow) return;

    const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    this.transcriptResizeHandles = directions.map(direction => {
      const handle = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-resize-handle ${this.player.options.classPrefix}-transcript-resize-${direction}`,
        attributes: {
          'data-direction': direction,
          'data-vidply-managed-resize': 'true',
          'aria-hidden': 'true'
        }
      });

      handle.style.display = 'none';
      this.transcriptWindow.appendChild(handle);
      return handle;
    });
  }

  /**
   * Position transcript window next to video
   */
  positionTranscript() {
    if (!this.transcriptWindow || !this.player.videoWrapper || !this.isVisible) return;
    
    // Don't auto-position if user has manually positioned it
    if (this.draggableResizable && this.draggableResizable.manuallyPositioned) {
      return;
    }
    
    const isMobile = window.innerWidth < 768;
    const videoRect = this.player.videoWrapper.getBoundingClientRect();
    
    // Check if player is in fullscreen mode
    const isFullscreen = this.player.state.fullscreen;
    
    if (isMobile && !isFullscreen) {
      // Mobile: Position directly underneath the video controls as part of the layout
      this.transcriptWindow.style.position = 'relative';
      this.transcriptWindow.style.left = '0';
      this.transcriptWindow.style.right = '0';
      this.transcriptWindow.style.bottom = 'auto';
      this.transcriptWindow.style.top = 'auto';
      this.transcriptWindow.style.width = '100%';
      this.transcriptWindow.style.maxWidth = '100%';
      this.transcriptWindow.style.maxHeight = '300px';
      this.transcriptWindow.style.height = 'auto';
      this.transcriptWindow.style.borderRadius = '0';
      this.transcriptWindow.style.transform = 'none';
      this.transcriptWindow.style.border = 'none';
      this.transcriptWindow.style.borderTop = '1px solid var(--vidply-border-light)';
      // Remove any empty border properties that might have been set
      this.transcriptWindow.style.removeProperty('border-right');
      this.transcriptWindow.style.removeProperty('border-bottom');
      this.transcriptWindow.style.removeProperty('border-left');
      // Remove border-image properties that can cause parse errors
      this.transcriptWindow.style.removeProperty('border-image');
      this.transcriptWindow.style.removeProperty('border-image-source');
      this.transcriptWindow.style.removeProperty('border-image-slice');
      this.transcriptWindow.style.removeProperty('border-image-width');
      this.transcriptWindow.style.removeProperty('border-image-outset');
      this.transcriptWindow.style.removeProperty('border-image-repeat');
      this.transcriptWindow.style.boxShadow = 'none';
      // Disable dragging on mobile
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'default';
      }
      
      // Insert directly after video wrapper to appear right under controls
      const videoWrapper = this.player.videoWrapper;
      if (videoWrapper && videoWrapper.nextSibling !== this.transcriptWindow) {
        videoWrapper.parentNode.insertBefore(this.transcriptWindow, videoWrapper.nextSibling);
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
      const fullscreenMinWidth = 260;
      const fullscreenAvailable = Math.max(fullscreenMinWidth, window.innerWidth - 40);
      const fullscreenDesired = parseFloat(this.transcriptWindow.style.width) || 400;
      const fullscreenWidth = Math.max(fullscreenMinWidth, Math.min(fullscreenDesired, fullscreenAvailable));
      this.transcriptWindow.style.width = `${fullscreenWidth}px`;
      this.transcriptWindow.style.maxWidth = 'none';
      this.transcriptWindow.style.borderRadius = '8px';
      this.transcriptWindow.style.border = '1px solid var(--vidply-border)';
      // Remove borderTop and any other individual border properties to avoid empty values
      this.transcriptWindow.style.removeProperty('border-top');
      this.transcriptWindow.style.removeProperty('border-right');
      this.transcriptWindow.style.removeProperty('border-bottom');
      this.transcriptWindow.style.removeProperty('border-left');
      // Remove border-image properties that can cause parse errors
      this.transcriptWindow.style.removeProperty('border-image');
      this.transcriptWindow.style.removeProperty('border-image-source');
      this.transcriptWindow.style.removeProperty('border-image-slice');
      this.transcriptWindow.style.removeProperty('border-image-width');
      this.transcriptWindow.style.removeProperty('border-image-outset');
      this.transcriptWindow.style.removeProperty('border-image-repeat');
      // Enable dragging in fullscreen (including touch devices)
      if (this.transcriptHeader) {
        this.transcriptHeader.style.cursor = 'move';
      }
      
      // Move back to container for fullscreen
      if (this.transcriptWindow.parentNode !== this.player.container) {
        this.player.container.appendChild(this.transcriptWindow);
      }
    } else {
      // Desktop mode: position to the right of video, or overlay if insufficient space
      const transcriptWidth = parseFloat(this.transcriptWindow.style.width) || 400;
      const padding = 20;
      const minWidth = 260;
      const containerRect = this.player.container.getBoundingClientRect();

      const ensureContainerPositioned = () => {
        const computed = window.getComputedStyle(this.player.container);
        if (computed.position === 'static') {
          this.player.container.style.position = 'relative';
        }
      };

      ensureContainerPositioned();

      // Calculate available space to the right of the video
      // WCAG 1.4.10 Reflow: Avoid horizontal overflow and content being cut off
      const availableWidth = window.innerWidth - videoRect.right - padding;
      
      // Switch to overlay mode when:
      // 1. Available width is less than the desired transcript width (would cause squeezing/cutoff)
      // 2. OR available width is below minimum usable width
      // This triggers earlier - as soon as the transcript would be squeezed
      const wouldBeCutOff = availableWidth < transcriptWidth;
      const hasMinimumSpace = availableWidth >= minWidth;
      const useOverlay = wouldBeCutOff || !hasMinimumSpace;

      if (!useOverlay) {
        // Position to the right of the video (original behavior)
        const left = (videoRect.right - containerRect.left) + padding;
        const appliedWidth = Math.max(minWidth, Math.min(transcriptWidth, availableWidth));
        const appliedHeight = videoRect.height;

        this.transcriptWindow.style.position = 'absolute';
        this.transcriptWindow.style.left = `${left}px`;
        this.transcriptWindow.style.right = 'auto';
        this.transcriptWindow.style.bottom = 'auto';
        this.transcriptWindow.style.top = '0';
        this.transcriptWindow.style.height = `${appliedHeight}px`;
        this.transcriptWindow.style.maxHeight = 'none';
        this.transcriptWindow.style.width = `${appliedWidth}px`;
        this.transcriptWindow.style.maxWidth = 'none';
        this.transcriptWindow.style.boxShadow = '';
      } else {
        // Insufficient space: fall back to compact overlay mode inside video area
        // Positioned above controls to prevent horizontal overflow
        const overlayMaxWidth = 320;
        const overlayMaxHeight = 280;
        const overlayWidth = Math.min(overlayMaxWidth, videoRect.width - 40);
        const overlayHeight = Math.min(overlayMaxHeight, videoRect.height - 120);
        
        // Calculate position relative to container, placing overlay inside video area
        const videoWrapperRect = this.player.videoWrapper.getBoundingClientRect();
        const controlsHeight = 70; // Approximate height of controls
        
        // Position from top of container to bottom of video minus controls and overlay height
        const overlayActualHeight = Math.max(180, overlayHeight);
        const topPosition = (videoWrapperRect.bottom - containerRect.top) - controlsHeight - overlayActualHeight;
        const rightPosition = (containerRect.right - videoWrapperRect.right) + 12;

        this.transcriptWindow.style.position = 'absolute';
        this.transcriptWindow.style.left = 'auto';
        this.transcriptWindow.style.right = `${rightPosition}px`;
        this.transcriptWindow.style.top = `${topPosition}px`;
        this.transcriptWindow.style.bottom = 'auto';
        this.transcriptWindow.style.width = `${Math.max(minWidth, overlayWidth)}px`;
        this.transcriptWindow.style.maxWidth = `${overlayMaxWidth}px`;
        this.transcriptWindow.style.height = `${overlayActualHeight}px`;
        this.transcriptWindow.style.maxHeight = `${overlayMaxHeight}px`;
        this.transcriptWindow.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.6)'; // Enhanced shadow for overlay visibility
      }

      this.transcriptWindow.style.borderRadius = '8px';
      this.transcriptWindow.style.border = '1px solid var(--vidply-border)';
      // Remove borderTop and any other individual border properties to avoid empty values
      this.transcriptWindow.style.removeProperty('border-top');
      this.transcriptWindow.style.removeProperty('border-right');
      this.transcriptWindow.style.removeProperty('border-bottom');
      this.transcriptWindow.style.removeProperty('border-left');
      // Remove border-image properties that can cause parse errors
      this.transcriptWindow.style.removeProperty('border-image');
      this.transcriptWindow.style.removeProperty('border-image-source');
      this.transcriptWindow.style.removeProperty('border-image-slice');
      this.transcriptWindow.style.removeProperty('border-image-width');
      this.transcriptWindow.style.removeProperty('border-image-outset');
      this.transcriptWindow.style.removeProperty('border-image-repeat');
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
    const textTracks = this.player.textTracks;
    const languages = new Map();
    
    // Collect all caption/subtitle tracks with their languages
    textTracks.forEach(track => {
      if ((track.kind === 'captions' || track.kind === 'subtitles') && track.language && !track._vidplyStale) {
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
      if (this.languageSelectorWrapper) {
        this.languageSelectorWrapper.style.display = 'none';
      }
      return;
    }
    
    // Show selector wrapper
    if (this.languageSelectorWrapper) {
      this.languageSelectorWrapper.style.display = 'flex';
    }
    
    this.availableTranscriptLanguages.forEach((langInfo, index) => {
      const option = DOMUtils.createElement('option', {
        textContent: langInfo.label,
        attributes: {
          'value': langInfo.language,
          'lang': langInfo.language
        }
      });
      this.languageSelector.appendChild(option);
    });
    
    // Set current selection
    if (this.currentTranscriptLanguage) {
      this.languageSelector.value = this.currentTranscriptLanguage;
    } else if (this.availableTranscriptLanguages.length > 0) {
      // Default to first language or active track
      const activeTrack = this.player.textTracks.find(
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
      
      // Set lang attribute for screen readers to pronounce text correctly
      if (this.transcriptContent && this.currentTranscriptLanguage) {
        this.transcriptContent.setAttribute('lang', this.currentTranscriptLanguage);
      }
    };
    this.languageSelector.addEventListener('change', this.languageSelectorHandler);
  }

  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    this.transcriptContent.innerHTML = '';

    // Get all text tracks
    const textTracks = this.player.textTracks;
    
    // Find track for selected language, or default to first available.
    // Safari native HLS can expose duplicate TextTrack objects for the same
    // language (SUBTITLES vs CLOSED-CAPTIONS); prefer the one with cues loaded.
    let captionTrack = null;
    if (this.currentTranscriptLanguage) {
      const candidates = textTracks.filter(
        track => (track.kind === 'captions' || track.kind === 'subtitles') && 
                 track.language === this.currentTranscriptLanguage &&
                 !track._vidplyStale
      );
      captionTrack = candidates.find(t => t.cues && t.cues.length > 0) || candidates[0] || null;
    }
    
    if (!captionTrack) {
      const candidates = textTracks.filter(
        track => (track.kind === 'captions' || track.kind === 'subtitles') && !track._vidplyStale
      );
      captionTrack = candidates.find(t => t.cues && t.cues.length > 0) || candidates[0] || null;
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

    // We need at least one track type available for display
    // (captions, descriptions, or metadata - though metadata is not displayed)
    if (!captionTrack && !descriptionTrack && !metadataTrack) {
      this.showNoTranscriptMessage();
      return;
    }

    // Enable all tracks to load cues so they're available for the transcript
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
      this.setManagedTimeout(() => {
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
    
    // Always include description cues in transcript for completeness
    // (Audio description toggle only controls whether they're read aloud,
    // but the transcript should always show all content for accessibility)
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
    
    // Apply timestamp visibility preference
    this.updateTimestampVisibility();
    
    // Set lang attribute for screen readers to pronounce text correctly
    if (this.transcriptContent && this.currentTranscriptLanguage) {
      this.transcriptContent.setAttribute('lang', this.currentTranscriptLanguage);
    }
    
    // Update language selector after loading
    this.updateLanguageSelector();

    this.updateActiveEntry();
  }

  /**
   * Setup metadata handling on player load
   * This runs independently of transcript loading
   */
  setupMetadataHandlingOnLoad() {
    // Wait for metadata to be loaded
    const setupMetadata = () => {
      const textTracks = this.player.textTracks;
      const metadataTrack = textTracks.find(track => track.kind === 'metadata');
      
      if (metadataTrack) {
        // Enable the metadata track so cuechange events fire
        // Use 'hidden' mode so it doesn't display anything, but events still work
        if (metadataTrack.mode === 'disabled') {
          metadataTrack.mode = 'hidden';
        }
        
        // Check if we already added the listener
        if (this.metadataCueChangeHandler) {
          metadataTrack.removeEventListener('cuechange', this.metadataCueChangeHandler);
        }
        
        // Add event listener for cue changes
        this.metadataCueChangeHandler = () => {
          const activeCues = Array.from(metadataTrack.activeCues || []);
          if (activeCues.length > 0) {
            // Debug logging (can be removed in production)
            if (this.player.options.debug) {
              console.log('[VidPly Metadata] Active cues:', activeCues.map(c => ({
                start: c.startTime,
                end: c.endTime,
                text: c.text
              })));
            }
          }
          activeCues.forEach(cue => {
            this.handleMetadataCue(cue);
          });
        };
        
        metadataTrack.addEventListener('cuechange', this.metadataCueChangeHandler);
        
        // Debug: Log metadata track setup
        if (this.player.options.debug) {
          const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
          console.log('[VidPly Metadata] Track enabled,', cueCount, 'cues available');
        }
      } else if (this.player.options.debug) {
        console.warn('[VidPly Metadata] No metadata track found');
      }
    };
    
    // Try immediately
    setupMetadata();
    
    // Also try after loadedmetadata event
    this.player.on('loadedmetadata', setupMetadata);
  }

  /**
   * Setup metadata handling
   * Metadata cues are not displayed but can be used programmatically
   * This is called when transcript data is loaded (for storing cues)
   */
  setupMetadataHandling() {
    if (!this.metadataCues || this.metadataCues.length === 0) {
      return;
    }

    // The actual event handling is set up in setupMetadataHandlingOnLoad()
    // This method just stores the cues for reference
    if (this.player.options.debug) {
      console.log('[VidPly Metadata]', this.metadataCues.length, 'cues stored from transcript load');
    }
  }

  /**
   * Handle individual metadata cues
   * Parses metadata text and emits events or triggers actions
   */
  handleMetadataCue(cue) {
    const text = cue.text.trim();
    
    // Debug logging
    if (this.player.options.debug) {
      console.log('[VidPly Metadata] Processing cue:', {
        time: cue.startTime,
        text: text
      });
    }
    
    // Emit a generic metadata event that developers can listen to
    this.player.emit('metadata', {
      time: cue.startTime,
      endTime: cue.endTime,
      text: text,
      cue: cue
    });

    // Parse for specific commands (examples based on wwa_meta.vtt format)
    if (text.includes('PAUSE')) {
      // Automatically pause the video
      if (!this.player.state.paused) {
        if (this.player.options.debug) {
          console.log('[VidPly Metadata] Pausing video at', cue.startTime);
        }
        this.player.pause();
      }
      // Also emit event for developers who want to listen
      this.player.emit('metadata:pause', { time: cue.startTime, text: text });
    }

    // Parse for focus directives
    const focusMatch = text.match(/FOCUS:([\w#-]+)/);
    if (focusMatch) {
      const targetSelector = focusMatch[1];
      // Automatically focus the target element
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        if (this.player.options.debug) {
          console.log('[VidPly Metadata] Focusing element:', targetSelector);
        }
        // Use setTimeout to ensure DOM is ready
        this.setManagedTimeout(() => {
          targetElement.focus({ preventScroll: true });
        }, 10);
      } else if (this.player.options.debug) {
        console.warn('[VidPly Metadata] Element not found:', targetSelector);
      }
      // Also emit event for developers who want to listen
      this.player.emit('metadata:focus', { 
        time: cue.startTime, 
        target: targetSelector,
        element: targetElement,
        text: text 
      });
    }

    // Parse for hashtag references
    const hashtags = text.match(/#[\w-]+/g);
    if (hashtags) {
      if (this.player.options.debug) {
        console.log('[VidPly Metadata] Hashtags found:', hashtags);
      }
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
    const entryText = this.stripVTTFormatting(cue.text);
    
    const entry = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-entry ${this.player.options.classPrefix}-transcript-${type}`,
      attributes: {
        'tabindex': '0',
        'data-start': String(cue.startTime),
        'data-end': String(cue.endTime),
        'data-type': type
      }
    });

    const timestamp = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-transcript-time`,
      textContent: TimeUtils.formatTime(cue.startTime),
      attributes: {
        'aria-hidden': 'true'  // Hide from screen readers - decorative timestamp
      }
    });

    const text = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-transcript-text`,
      textContent: entryText
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

    // Check if we're on mobile and not in fullscreen
    const isMobile = window.innerWidth < 768;
    const isFullscreen = this.player.state.fullscreen;
    
    // On mobile devices (< 768px), only enable drag/resize in fullscreen
    // On desktop/tablets (>= 768px), always enable drag/resize
    if (isMobile && !isFullscreen) {
      // Destroy existing instance if exiting fullscreen on mobile
      if (this.draggableResizable) {
        this.draggableResizable.destroy();
        this.draggableResizable = null;
      }
      return; // No drag/resize on mobile when not in fullscreen
    }

    // If already initialized, don't re-initialize
    if (this.draggableResizable) {
      return;
    }

    // Create DraggableResizable utility with touch support
    this.draggableResizable = new DraggableResizable(this.transcriptWindow, {
      dragHandle: this.transcriptHeader,
      resizeHandles: this.transcriptResizeHandles,
      constrainToViewport: true,
      classPrefix: `${this.player.options.classPrefix}-transcript`,
      keyboardDragKey: 'd',
      keyboardResizeKey: 'r',
      keyboardStep: 10,
      keyboardStepLarge: 50,
      minWidth: 300,
      minHeight: 200,
      maxWidth: () => Math.max(320, window.innerWidth - 40),
      maxHeight: () => Math.max(200, window.innerHeight - 120),
      pointerResizeIndicatorText: i18n.t('transcript.resizeModeHint'),
      onPointerResizeToggle: (enabled) => {
        // Update resize handles visibility
        this.transcriptResizeHandles.forEach(handle => {
          handle.style.display = enabled ? 'block' : 'none';
        });
        // Call the state change handler
        this.onPointerResizeModeChange(enabled);
      },
      onDragStart: (e) => {
        // Don't drag if clicking on certain elements
        const ignoreSelectors = [
          `.${this.player.options.classPrefix}-transcript-close`,
          `.${this.player.options.classPrefix}-transcript-settings`,
          `.${this.player.options.classPrefix}-transcript-language-select`,
          `.${this.player.options.classPrefix}-transcript-language-label`,
          `.${this.player.options.classPrefix}-transcript-settings-menu`,
          `.${this.player.options.classPrefix}-transcript-style-dialog`
        ];
        
        for (const selector of ignoreSelectors) {
          if (e.target.closest(selector)) {
            return false; // Prevent drag
          }
        }
        
        return true; // Allow drag
      }
    });

    // Add custom keyboard handler for special keys (Escape, Home)
    this.customKeyHandler = (e) => {
      const key = e.key.toLowerCase();
      const alreadyPrevented = e.defaultPrevented;

      // Don't handle keys if settings menu or style dialog is open (let them handle keys)
      if (this.settingsMenuVisible || this.styleDialogVisible) {
        return;
      }

      if (key === 'home') {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggableResizable) {
          if (this.draggableResizable.pointerResizeMode) {
            this.draggableResizable.disablePointerResizeMode();
          }
          this.draggableResizable.manuallyPositioned = false;
          this.positionTranscript();
          this.updateResizeOptionState();
          this.announceLive(i18n.t('transcript.positionReset'));
        }
        return;
      }
      
      if (key === 'r') {
        if (alreadyPrevented) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const enabled = this.toggleResizeMode();
        if (enabled) {
          this.transcriptWindow.focus({ preventScroll: true });
        }
        return;
      }
      
      if (key === 'escape') {
        // Check priority: resize mode > drag mode > close transcript
        // (settings menu and style dialog already handled by early return above)
        if (this.draggableResizable && this.draggableResizable.pointerResizeMode) {
          e.preventDefault();
          e.stopPropagation();
          this.draggableResizable.disablePointerResizeMode();
          return;
        }
        if (this.draggableResizable && this.draggableResizable.keyboardDragMode) {
          e.preventDefault();
          e.stopPropagation();
          this.draggableResizable.disableKeyboardDragMode();
          this.announceLive(i18n.t('transcript.dragModeDisabled'));
          return;
        }
        // Only close transcript if nothing else is open
        e.preventDefault();
        e.stopPropagation();
        this.hideTranscript({ focusButton: true });
        return;
      }
    };
    
    this.transcriptWindow.addEventListener('keydown', this.customKeyHandler);
  }


  /**
   * Toggle keyboard drag mode
   */
  toggleKeyboardDragMode() {
    if (this.draggableResizable) {
      const wasEnabled = this.draggableResizable.keyboardDragMode;
      this.draggableResizable.toggleKeyboardDragMode();
      const isEnabled = this.draggableResizable.keyboardDragMode;
      if (!wasEnabled && isEnabled) {
        this.enableMoveMode();
      }
      
      // Update drag option state
      this.updateDragOptionState();
      
      // Hide settings menu if open
      if (this.settingsMenuVisible) {
        this.hideSettingsMenu();
      }
      
      // Focus the window for keyboard navigation
      this.transcriptWindow.focus({ preventScroll: true });
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
      if (this.settingsButton) {
        this.settingsButton.setAttribute('aria-expanded', 'true');
      }
      // Re-attach keyboard navigation handler
      this.attachSettingsMenuKeyboardNavigation();
      // Position menu immediately
      this.positionSettingsMenuImmediate();
      this.updateResizeOptionState();
      // Focus first menu item after positioning
      setTimeout(() => {
        const menuItems = this.settingsMenu.querySelectorAll(`.${this.player.options.classPrefix}-transcript-settings-item`);
        if (menuItems.length > 0) {
          menuItems[0].setAttribute('tabindex', '0');
          for (let i = 1; i < menuItems.length; i++) {
            menuItems[i].setAttribute('tabindex', '-1');
          }
          menuItems[0].focus({ preventScroll: true });
        }
      }, 50);
      return;
    }
    // Create settings menu
    this.settingsMenu = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-settings-menu`,
      attributes: {
        'role': 'menu'
      }
    });

    // Keyboard drag option
    const keyboardDragOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: 'move',
      label: 'transcript.enableDragMode',
      hasTextClass: true,
      onClick: () => {
        this.toggleKeyboardDragMode();
        this.hideSettingsMenu();
      }
    });
    keyboardDragOption.setAttribute('role', 'switch');
    keyboardDragOption.setAttribute('aria-checked', 'false');
    // Remove any tooltips from menu items (they have visible text)
    const dragTooltip = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (dragTooltip) dragTooltip.remove();
    const dragButtonText = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (dragButtonText) dragButtonText.remove();
    this.dragOptionButton = keyboardDragOption;
    this.dragOptionText = keyboardDragOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
    this.updateDragOptionState();
    
    // Style option
    const styleOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: 'settings',
      label: 'transcript.styleTranscript',
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hideSettingsMenu();
        // Delay to ensure menu is fully closed before opening dialog
        setTimeout(() => {
          this.showStyleDialog();
        }, 50);
      }
    });
    // Remove any tooltips from menu items (they have visible text)
    const styleTooltip = styleOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (styleTooltip) styleTooltip.remove();
    const styleButtonText = styleOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (styleButtonText) styleButtonText.remove();

    // Resize option
    const resizeOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: 'resize',
      label: 'transcript.enableResizeMode',
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        const enabled = this.toggleResizeMode({ focus: false });
        
        if (enabled) {
          this.hideSettingsMenu({ focusButton: false });
          // Focus transcript window after handles appear
          setTimeout(() => {
            if (this.transcriptWindow) {
              this.transcriptWindow.focus({ preventScroll: true });
            }
          }, 20);
        } else {
          this.hideSettingsMenu({ focusButton: true });
        }
      }
    });
    resizeOption.setAttribute('role', 'switch');
    resizeOption.setAttribute('aria-checked', 'false');
    // Remove any tooltips from menu items (they have visible text)
    const resizeTooltip = resizeOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (resizeTooltip) resizeTooltip.remove();
    const resizeButtonText = resizeOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (resizeButtonText) resizeButtonText.remove();
    this.resizeOptionButton = resizeOption;
    this.resizeOptionText = resizeOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
    this.updateResizeOptionState();

    // Show timestamps option
    const showTimestampsOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: 'clock',
      label: 'transcript.showTimestamps',
      hasTextClass: true,
      onClick: () => {
        this.toggleShowTimestamps();
      }
    });
    showTimestampsOption.setAttribute('role', 'switch');
    showTimestampsOption.setAttribute('aria-checked', this.showTimestamps ? 'true' : 'false');
    // Remove any tooltips from menu items (they have visible text)
    const timestampsTooltip = showTimestampsOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (timestampsTooltip) timestampsTooltip.remove();
    const timestampsButtonText = showTimestampsOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (timestampsButtonText) timestampsButtonText.remove();
    this.showTimestampsButton = showTimestampsOption;
    this.showTimestampsText = showTimestampsOption.querySelector(`.${this.player.options.classPrefix}-settings-text`);
    this.updateShowTimestampsState();

    // Close option
    const closeOption = createMenuItem({
      classPrefix: this.player.options.classPrefix,
      itemClass: `${this.player.options.classPrefix}-transcript-settings-item`,
      icon: 'close',
      label: 'transcript.closeMenu',
      onClick: () => {
        this.hideSettingsMenu();
      }
    });
    // Remove any tooltips from menu items (they have visible text)
    const closeTooltip = closeOption.querySelector(`.${this.player.options.classPrefix}-tooltip`);
    if (closeTooltip) closeTooltip.remove();
    const closeButtonText = closeOption.querySelector(`.${this.player.options.classPrefix}-button-text`);
    if (closeButtonText) closeButtonText.remove();

    this.settingsMenu.appendChild(keyboardDragOption);
    this.settingsMenu.appendChild(resizeOption);
    this.settingsMenu.appendChild(styleOption);
    this.settingsMenu.appendChild(showTimestampsOption);
    this.settingsMenu.appendChild(closeOption);

    // Position menu first (before it's visible) to prevent jumping
    // Set menu to invisible temporarily
    this.settingsMenu.style.visibility = 'hidden';
    this.settingsMenu.style.display = 'block';
    
    // Insert menu right after settings button for proper positioning
    if (this.settingsButton && this.settingsButton.parentNode) {
      this.settingsButton.insertAdjacentElement('afterend', this.settingsMenu);
    } else if (this.headerLeft) {
      this.headerLeft.appendChild(this.settingsMenu);
    } else if (this.transcriptHeader) {
      this.transcriptHeader.appendChild(this.settingsMenu);
    } else {
      this.transcriptWindow.appendChild(this.settingsMenu);
    }
    
    // Position the menu relative to the settings button (immediately while hidden)
    this.positionSettingsMenuImmediate();
    
    // Make menu visible after positioning
    requestAnimationFrame(() => {
      if (this.settingsMenu) {
        this.settingsMenu.style.visibility = 'visible';
      }
    });
    
    // Add keyboard navigation
    this.settingsMenuKeyHandler = attachMenuKeyboardNavigation(
      this.settingsMenu,
      this.settingsButton,
      `.${this.player.options.classPrefix}-transcript-settings-item`,
      () => this.hideSettingsMenu({ focusButton: true })
    );
    
    // Set the menu as visible and display it
    this.settingsMenuVisible = true;
    this.settingsMenu.style.display = 'block';
    
    // Update aria-expanded
    if (this.settingsButton) {
      this.settingsButton.setAttribute('aria-expanded', 'true');
    }
    this.updateResizeOptionState();
    
    // Focus first menu item after visibility is set
    setTimeout(() => {
      const menuItems = this.settingsMenu.querySelectorAll(`.${this.player.options.classPrefix}-transcript-settings-item`);
      if (menuItems.length > 0) {
        menuItems[0].setAttribute('tabindex', '0');
        for (let i = 1; i < menuItems.length; i++) {
          menuItems[i].setAttribute('tabindex', '-1');
        }
        menuItems[0].focus({ preventScroll: true });
      }
    }, 50);
  }

  /**
   * Position settings menu relative to settings button (immediate/synchronous)
   */
  positionSettingsMenuImmediate() {
    if (!this.settingsMenu || !this.settingsButton) return;
    
    // Get the parent container (header-left) which has position: relative
    const container = this.settingsButton.parentElement;
    if (!container) return;
    
    // Position immediately (synchronously) - used when menu is first shown
    const buttonRect = this.settingsButton.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const menuRect = this.settingsMenu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate position relative to the container
    const buttonLeft = buttonRect.left - containerRect.left;
    const buttonBottom = buttonRect.bottom - containerRect.top;
    const buttonTop = buttonRect.top - containerRect.top;
    
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // Position menu below button by default (left-aligned with button)
    let menuTop = buttonBottom + 4;
    
    // Check if we should position above instead
    if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
      // Position above the button
      menuTop = buttonTop - menuRect.height - 4;
      this.settingsMenu.classList.add('vidply-menu-above');
    } else {
      this.settingsMenu.classList.remove('vidply-menu-above');
    }
    
    // Apply positions (left-aligned with button)
    this.settingsMenu.style.top = `${menuTop}px`;
    this.settingsMenu.style.left = `${buttonLeft}px`;
    this.settingsMenu.style.right = 'auto';
    this.settingsMenu.style.bottom = 'auto';
  }
  
  /**
   * Position settings menu relative to settings button (async for repositioning)
   */
  positionSettingsMenu() {
    if (!this.settingsMenu || !this.settingsButton) return;
    
    // Use requestAnimationFrame to ensure layout is stable before positioning (for repositioning)
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.positionSettingsMenuImmediate();
      }, 10); // Small delay to ensure layout is stable
    });
  }

  /**
   * Attach keyboard navigation to settings menu
   */
  attachSettingsMenuKeyboardNavigation() {
    if (!this.settingsMenu) return;
    
    // Remove existing handler if any
    if (this.settingsMenuKeyHandler) {
      this.settingsMenu.removeEventListener('keydown', this.settingsMenuKeyHandler, true);
    }
    
    const handler = attachMenuKeyboardNavigation(
      this.settingsMenu,
      this.settingsButton,
      `.${this.player.options.classPrefix}-transcript-settings-item`,
      () => this.hideSettingsMenu({ focusButton: true })
    );
    
    // Store the handler reference
    this.settingsMenuKeyHandler = handler;
    
  }

  /**
   * Hide settings menu
   */
  hideSettingsMenu({ focusButton = true } = {}) {
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'none';
      this.settingsMenuVisible = false;
      this.settingsMenuJustOpened = false;
      
      // Remove keyboard handler to prevent duplicate listeners
      if (this.settingsMenuKeyHandler) {
        this.settingsMenu.removeEventListener('keydown', this.settingsMenuKeyHandler, true);
        this.settingsMenuKeyHandler = null;
      }
      
      // Update aria-expanded
      if (this.settingsButton) {
        this.settingsButton.setAttribute('aria-expanded', 'false');
        if (focusButton) {
          // Return focus to settings button
          this.settingsButton.focus({ preventScroll: true });
        }
      }
    }
  }

  /**
   * Enable move mode (gives visual feedback)
   */
  enableMoveMode() {
    this.hideResizeModeIndicator();

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
  toggleResizeMode({ focus = true } = {}) {
    if (!this.draggableResizable) {
      return false;
    }

    if (this.draggableResizable.pointerResizeMode) {
      this.draggableResizable.disablePointerResizeMode({ focus });
      return false;
    }

    this.draggableResizable.enablePointerResizeMode({ focus });
    return true;
  }

  updateDragOptionState() {
    if (!this.dragOptionButton) {
      return;
    }
    
    const isEnabled = !!(this.draggableResizable && this.draggableResizable.keyboardDragMode);
    const text = isEnabled
      ? i18n.t('transcript.disableDragMode')
      : i18n.t('transcript.enableDragMode');
    const ariaLabel = isEnabled
      ? i18n.t('transcript.disableDragModeAria')
      : i18n.t('transcript.enableDragModeAria');

    this.dragOptionButton.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
    this.dragOptionButton.setAttribute('aria-label', ariaLabel);

    if (this.dragOptionText) {
      this.dragOptionText.textContent = text;
    }
  }

  updateResizeOptionState() {
    if (!this.resizeOptionButton) {
      return;
    }
    
    const isEnabled = !!(this.draggableResizable && this.draggableResizable.pointerResizeMode);
    const text = isEnabled
      ? i18n.t('transcript.disableResizeMode')
      : i18n.t('transcript.enableResizeMode');
    const ariaLabel = isEnabled
      ? i18n.t('transcript.disableResizeModeAria')
      : i18n.t('transcript.enableResizeModeAria');

    this.resizeOptionButton.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
    this.resizeOptionButton.setAttribute('aria-label', ariaLabel);

    if (this.resizeOptionText) {
      this.resizeOptionText.textContent = text;
    }
  }

  toggleShowTimestamps() {
    this.showTimestamps = !this.showTimestamps;
    this.updateShowTimestampsState();
    this.updateTimestampVisibility();
    this.saveTimestampsPreference();
  }

  updateShowTimestampsState() {
    if (!this.showTimestampsButton) {
      return;
    }
    
    const text = this.showTimestamps
      ? i18n.t('transcript.hideTimestamps')
      : i18n.t('transcript.showTimestamps');
    const ariaLabel = this.showTimestamps
      ? i18n.t('transcript.hideTimestampsAria')
      : i18n.t('transcript.showTimestampsAria');

    this.showTimestampsButton.setAttribute('aria-checked', this.showTimestamps ? 'true' : 'false');
    this.showTimestampsButton.setAttribute('aria-label', ariaLabel);

    if (this.showTimestampsText) {
      this.showTimestampsText.textContent = text;
    }
  }

  updateTimestampVisibility() {
    if (!this.transcriptContent) return;
    
    const timestamps = this.transcriptContent.querySelectorAll(`.${this.player.options.classPrefix}-transcript-time`);
    timestamps.forEach(timestamp => {
      timestamp.style.display = this.showTimestamps ? '' : 'none';
    });
  }

  saveTimestampsPreference() {
    const savedPreferences = this.storage.getTranscriptPreferences() || {};
    savedPreferences.showTimestamps = this.showTimestamps;
    this.storage.saveTranscriptPreferences(savedPreferences);
  }

  showResizeModeIndicator() {
    if (!this.transcriptHeader) {
      return;
    }

    this.hideResizeModeIndicator();

    const indicator = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-resize-tooltip`,
      textContent: i18n.t('transcript.resizeModeHint') || 'Resize handles enabled. Drag edges or corners to adjust. Press Esc or R to exit.'
    });

    this.transcriptHeader.appendChild(indicator);
    this.resizeModeIndicator = indicator;

    this.resizeModeIndicatorTimeout = this.setManagedTimeout(() => {
      this.hideResizeModeIndicator();
    }, 3000);
  }

  hideResizeModeIndicator() {
    if (this.resizeModeIndicatorTimeout) {
      this.clearManagedTimeout(this.resizeModeIndicatorTimeout);
      this.resizeModeIndicatorTimeout = null;
    }

    if (this.resizeModeIndicator && this.resizeModeIndicator.parentNode) {
      this.resizeModeIndicator.remove();
    }

    this.resizeModeIndicator = null;
  }

  onPointerResizeModeChange(enabled) {
    this.updateResizeOptionState();

    if (enabled) {
      this.showResizeModeIndicator();
      this.announceLive(i18n.t('transcript.resizeModeEnabled'));
    } else {
      this.hideResizeModeIndicator();
      this.announceLive(i18n.t('transcript.resizeModeDisabled'));
    }
  }

  /**
   * Show style dialog
   */
  showStyleDialog() {
    // If dialog already exists, just show it
    if (this.styleDialog) {
      this.styleDialog.style.display = 'block';
      this.styleDialogVisible = true;
      
      // Re-add keyboard handler
      if (this.handlers.styleDialogKeydown) {
        document.addEventListener('keydown', this.handlers.styleDialogKeydown);
      }
      
      // Set flag to prevent immediate closing from document click
      this.styleDialogJustOpened = true;
      setTimeout(() => {
        this.styleDialogJustOpened = false;
      }, 350);
      
      // Focus first control
      setTimeout(() => {
        const firstSelect = this.styleDialog.querySelector('select, input');
        if (firstSelect) {
          firstSelect.focus({ preventScroll: true });
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
        { label: i18n.t('fontSizes.small'), value: '90%' },
        { label: i18n.t('fontSizes.normal'), value: '100%' },
        { label: i18n.t('fontSizes.large'), value: '110%' },
        { label: i18n.t('fontSizes.xlarge'), value: '120%' }
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

    // Keyboard navigation for style dialog
    this.handlers.styleDialogKeydown = (e) => {
      // Only handle keys when dialog is visible
      if (!this.styleDialogVisible) return;
      
      // ESC to close
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hideStyleDialog();
        return;
      }
      
      // Tab navigation (allow default behavior but trap focus)
      if (e.key === 'Tab') {
        // Get all focusable elements
        const focusableElements = this.styleDialog.querySelectorAll(
          'select, input, button'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // Trap focus within dialog
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus({ preventScroll: true });
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener('keydown', this.handlers.styleDialogKeydown);

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
        firstSelect.focus({ preventScroll: true });
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
      
      // Remove keyboard handler
      if (this.handlers.styleDialogKeydown) {
        document.removeEventListener('keydown', this.handlers.styleDialogKeydown);
      }
      
      // Return focus to settings button
      if (this.settingsButton) {
        this.settingsButton.focus({ preventScroll: true });
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

    // Generate unique ID for the control
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': controlId
      }
    });
    group.appendChild(labelEl);

    const select = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-transcript-style-select`,
      attributes: {
        'id': controlId
      }
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

    // Generate unique ID for the control
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': controlId
      }
    });
    group.appendChild(labelEl);

    const input = DOMUtils.createElement('input', {
      attributes: {
        'id': controlId,
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

    // Generate unique ID for the control
    const controlId = `${this.player.options.classPrefix}-transcript-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': controlId
      }
    });
    group.appendChild(labelEl);

    const valueDisplay = DOMUtils.createElement('span', {
      textContent: Math.round(this.transcriptStyle[property] * 100) + '%',
      className: `${this.player.options.classPrefix}-transcript-style-value`
    });

    const input = DOMUtils.createElement('input', {
      attributes: {
        'id': controlId,
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
   * Set a managed timeout that will be cleaned up on destroy
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID
   */
  setManagedTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  /**
   * Clear a managed timeout
   * @param {number} timeoutId - Timeout ID to clear
   */
  clearManagedTimeout(timeoutId) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(timeoutId);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.hideResizeModeIndicator();
    
    // Destroy draggableResizable utility
    if (this.draggableResizable) {
      if (this.draggableResizable.pointerResizeMode) {
        this.draggableResizable.disablePointerResizeMode();
        this.updateResizeOptionState();
      }
      this.draggableResizable.destroy();
      this.draggableResizable = null;
    }
    
    // Remove custom key handler
    if (this.transcriptWindow && this.customKeyHandler) {
      this.transcriptWindow.removeEventListener('keydown', this.customKeyHandler);
      this.customKeyHandler = null;
    }

    // Remove timeupdate and seeked listeners from player
    if (this.handlers.timeupdate) {
      this.player.off('timeupdate', this.handlers.timeupdate);
    }
    if (this.handlers.seeked) {
      this.player.off('seeked', this.handlers.seeked);
    }
    
    // Remove audio description listeners from player
    if (this.handlers.audiodescriptionenabled) {
      this.player.off('audiodescriptionenabled', this.handlers.audiodescriptionenabled);
    }
    if (this.handlers.audiodescriptiondisabled) {
      this.player.off('audiodescriptiondisabled', this.handlers.audiodescriptiondisabled);
    }

    // Remove text cue update listener
    if (this.handlers.textcuesupdate) {
      this.player.off('textcuesupdate', this.handlers.textcuesupdate);
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
    if (this.handlers.styleDialogKeydown) {
      document.removeEventListener('keydown', this.handlers.styleDialogKeydown);
    }

    // Remove document click listener
    if (this.handlers.documentClick) {
      document.removeEventListener('click', this.handlers.documentClick);
    }
    
    // Remove window-level listeners
    if (this.handlers.resize) {
      window.removeEventListener('resize', this.handlers.resize);
    }

    // Cleanup all managed timeouts
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts.clear();

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
    this.transcriptResizeHandles = [];
    this.resizeOptionButton = null;
    this.resizeOptionText = null;
    this.liveRegion = null;
  }

  announceLive(message) {
    if (!this.liveRegion) return;
    this.liveRegion.textContent = message || '';
  }
}
