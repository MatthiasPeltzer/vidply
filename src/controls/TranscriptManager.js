/**
 * Transcript Manager Component
 * Manages transcript display and interaction
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { createIconElement } from '../icons/Icons.js';

export class TranscriptManager {
  constructor(player) {
    this.player = player;
    this.transcriptWindow = null;
    this.transcriptEntries = [];
    this.currentActiveEntry = null;
    this.isVisible = false;
    
    // Dragging state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
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
      keydown: null
    };
    
    this.init();
  }

  init() {
    // Listen for time updates to highlight active transcript entry
    this.player.on('timeupdate', this.handlers.timeupdate);
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

    const title = DOMUtils.createElement('h3', {
      textContent: 'Transcript'
    });

    const closeButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-transcript-close`,
      attributes: {
        'type': 'button',
        'aria-label': 'Close transcript'
      }
    });
    closeButton.appendChild(createIconElement('close'));
    closeButton.addEventListener('click', () => this.hideTranscript());

    this.transcriptHeader.appendChild(title);
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
    
    const videoRect = this.player.videoWrapper.getBoundingClientRect();
    
    // Calculate position relative to container
    const leftOffset = videoRect.width + 8; // 8px gap
    const height = videoRect.height;
    
    this.transcriptWindow.style.left = `${leftOffset}px`;
    this.transcriptWindow.style.height = `${height}px`;
  }

  /**
   * Load transcript data from caption/subtitle tracks
   */
  loadTranscriptData() {
    this.transcriptEntries = [];
    this.transcriptContent.innerHTML = '';

    // Get caption/subtitle tracks
    const textTracks = Array.from(this.player.element.textTracks);
    const transcriptTrack = textTracks.find(
      track => track.kind === 'captions' || track.kind === 'subtitles'
    );

    if (!transcriptTrack) {
      this.showNoTranscriptMessage();
      return;
    }

    // Enable track to load cues
    if (transcriptTrack.mode === 'disabled') {
      transcriptTrack.mode = 'hidden';
    }

    if (!transcriptTrack.cues || transcriptTrack.cues.length === 0) {
      // Wait for cues to load
      const loadingMessage = DOMUtils.createElement('div', {
        className: `${this.player.options.classPrefix}-transcript-loading`,
        textContent: 'Loading transcript...'
      });
      this.transcriptContent.appendChild(loadingMessage);

      const onLoad = () => {
        this.loadTranscriptData();
      };

      transcriptTrack.addEventListener('load', onLoad, { once: true });

      // Fallback timeout
      setTimeout(() => {
        if (transcriptTrack.cues && transcriptTrack.cues.length > 0) {
          this.loadTranscriptData();
        }
      }, 500);
      
      return;
    }

    // Build transcript from cues
    const cues = Array.from(transcriptTrack.cues);
    cues.forEach((cue, index) => {
      const entry = this.createTranscriptEntry(cue, index);
      this.transcriptEntries.push({
        element: entry,
        cue: cue,
        startTime: cue.startTime,
        endTime: cue.endTime
      });
      this.transcriptContent.appendChild(entry);
    });
  }

  /**
   * Create a single transcript entry element
   */
  createTranscriptEntry(cue, index) {
    const entry = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-transcript-entry`,
      attributes: {
        'data-start': String(cue.startTime),
        'data-end': String(cue.endTime),
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
      textContent: 'No transcript available for this video.'
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
    if (!this.transcriptContent) return;

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
      
      const touch = e.touches[0];
      this.startDragging(touch.clientX, touch.clientY);
    };

    this.handlers.touchmove = (e) => {
      if (this.isDragging) {
        const touch = e.touches[0];
        this.drag(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    };

    this.handlers.touchend = () => {
      if (this.isDragging) {
        this.stopDragging();
      }
    };

    this.handlers.keydown = (e) => {
      // Check if this is a navigation key
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'Escape'].includes(e.key)) {
        return;
      }
      
      // Prevent default behavior and stop event from bubbling to transcript entries
      e.preventDefault();
      e.stopPropagation();
      
      // Handle special keys first
      if (e.key === 'Home') {
        this.resetPosition();
        return;
      }
      
      if (e.key === 'Escape') {
        this.hideTranscript();
        return;
      }
      
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
   * Cleanup
   */
  destroy() {
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
  }
}
