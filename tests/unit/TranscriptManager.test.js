/**
 * Unit Tests: TranscriptManager
 * Tests transcript text processing and parsing logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../../src/utils/DOMUtils.js', () => ({
  DOMUtils: {
    createElement: vi.fn((tag, options = {}) => {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      if (options.textContent) el.textContent = options.textContent;
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (value !== undefined) el.setAttribute(key, String(value));
        });
      }
      return el;
    }),
    attachTooltip: vi.fn()
  }
}));

vi.mock('../../src/utils/TimeUtils.js', () => ({
  TimeUtils: {
    formatTime: vi.fn((seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    })
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn(() => document.createElement('span'))
}));

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => key)
  }
}));

vi.mock('../../src/utils/StorageManager.js', () => ({
  StorageManager: class MockStorageManager {
    constructor() {
      this.getTranscriptPreferences = vi.fn().mockReturnValue(null);
      this.saveTranscriptPreferences = vi.fn();
    }
  }
}));

vi.mock('../../src/utils/FocusUtils.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    focusElement: vi.fn(),
    focusFirstElement: vi.fn(),
  };
});

vi.mock('../../src/utils/MenuUtils.js', () => ({
  createMenuItem: vi.fn(() => document.createElement('button')),
  attachMenuKeyboardNavigation: vi.fn(),
  focusFirstMenuItem: vi.fn()
}));

vi.mock('../../src/utils/DraggableResizable.js', () => ({
  DraggableResizable: class MockDraggableResizable {
    constructor() {
      this.destroy = vi.fn();
      this.manuallyPositioned = false;
      this.disablePointerResizeMode = vi.fn();
      this.pointerResizeMode = false;
    }
  }
}));

vi.mock('../../src/utils/FormUtils.js', () => ({
  createLabeledSelect: vi.fn(() => ({
    label: document.createElement('label'),
    select: document.createElement('select')
  })),
  toggleLabeledSelect: vi.fn(),
  preventDragOnElement: vi.fn()
}));

describe('TranscriptManager', () => {
  let TranscriptManager;
  let manager;
  let mockPlayer;

  beforeEach(async () => {
    document.body.innerHTML = '';
    
    mockPlayer = {
      options: {
        classPrefix: 'vidply',
        debug: false,
        transcriptFontSize: '100%',
        transcriptFontFamily: 'sans-serif',
        transcriptColor: '#ffffff',
        transcriptBackgroundColor: '#1e1e1e',
        transcriptOpacity: 0.98
      },
      container: document.createElement('div'),
      videoWrapper: document.createElement('div'),
      element: document.createElement('video'),
      textTracks: [], // Array of text tracks (for metadata track lookup)
      state: {
        currentTime: 0,
        fullscreen: false,
        paused: true
      },
      controlBar: {
        updateTranscriptButton: vi.fn(),
        controls: { transcript: document.createElement('button') }
      },
      on: vi.fn(),
      emit: vi.fn(),
      pause: vi.fn(),
      handleMetadataCue: vi.fn(),
      invalidateTrackCache: vi.fn(),
      setManagedTimeout: vi.fn((cb) => { cb(); return 1; }),
      clearManagedTimeout: vi.fn()
    };
    
    document.body.appendChild(mockPlayer.container);
    mockPlayer.container.appendChild(mockPlayer.videoWrapper);
    mockPlayer.videoWrapper.appendChild(mockPlayer.element);

    const module = await import('../../src/controls/TranscriptManager.js');
    TranscriptManager = module.TranscriptManager;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('stripVTTFormatting', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should remove simple VTT tags', () => {
      const input = '<v Speaker>Hello world</v>';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('Hello world');
    });

    it('should remove multiple VTT tags', () => {
      const input = '<c.highlight>Important</c> text <b>here</b>';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('Important text here');
    });

    it('should remove voice tags with names', () => {
      const input = '<v John>This is John speaking</v>';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('This is John speaking');
    });

    it('should replace newlines with spaces', () => {
      const input = 'Line one\nLine two\nLine three';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('Line one Line two Line three');
    });

    it('should trim whitespace', () => {
      const input = '   Hello world   ';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('Hello world');
    });

    it('should handle empty string', () => {
      const result = manager.stripVTTFormatting('');
      expect(result).toBe('');
    });

    it('should handle string with only tags', () => {
      const input = '<v Speaker></v>';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('');
    });

    it('should handle nested tags', () => {
      const input = '<v Speaker><c.class>Nested content</c></v>';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('Nested content');
    });

    it('should handle italic and bold tags', () => {
      const input = '<i>Italic</i> and <b>bold</b> text';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('Italic and bold text');
    });

    it('should handle lang tags', () => {
      const input = '<lang en>English text</lang>';
      const result = manager.stripVTTFormatting(input);
      expect(result).toBe('English text');
    });
  });

  describe('handleMetadataCue', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    // Directive parsing (PAUSE / FOCUS / #hashtags) now lives in the
    // scoped MetadataAlertsManager; TranscriptManager only forwards the
    // cue so there is a single, container-scoped processor. See
    // tests/unit/MetadataAlertsManager.test.js for the behaviour tests.
    it('should delegate the cue to the player-level scoped handler', () => {
      const cue = {
        startTime: 10,
        endTime: 15,
        text: 'FOCUS:#my-button'
      };

      manager.handleMetadataCue(cue);

      expect(mockPlayer.handleMetadataCue).toHaveBeenCalledWith(cue);
    });

    it('should not attach its own cuechange pipeline (no duplicate emits)', () => {
      // The manager must not re-emit metadata events itself; that is the
      // MetadataAlertsManager's job. Forwarding must not touch player.emit.
      const cue = { startTime: 1, endTime: 2, text: 'PAUSE' };

      manager.handleMetadataCue(cue);

      const metadataEmits = mockPlayer.emit.mock.calls.filter(
        call => String(call[0]).startsWith('metadata')
      );
      expect(metadataEmits.length).toBe(0);
    });
  });

  describe('updateActiveEntry', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
      manager.isVisible = true;
      
      // Create mock entries
      manager.transcriptEntries = [
        { startTime: 0, endTime: 5, element: document.createElement('div') },
        { startTime: 5, endTime: 10, element: document.createElement('div') },
        { startTime: 10, endTime: 15, element: document.createElement('div') }
      ];
    });

    it('should not update if not visible', () => {
      manager.isVisible = false;
      mockPlayer.state.currentTime = 7;

      manager.updateActiveEntry();

      expect(manager.currentActiveEntry).toBeNull();
    });

    it('should not update if no entries', () => {
      manager.transcriptEntries = [];
      mockPlayer.state.currentTime = 7;

      manager.updateActiveEntry();

      expect(manager.currentActiveEntry).toBeNull();
    });

    it('should find active entry based on current time', () => {
      mockPlayer.state.currentTime = 7;

      manager.updateActiveEntry();

      expect(manager.currentActiveEntry).toBe(manager.transcriptEntries[1]);
    });

    it('should add active class to current entry', () => {
      mockPlayer.state.currentTime = 7;

      manager.updateActiveEntry();

      expect(manager.currentActiveEntry.element.classList.contains('vidply-transcript-entry-active')).toBe(true);
    });

    it('should remove active class from previous entry', () => {
      mockPlayer.state.currentTime = 7;
      manager.updateActiveEntry();
      
      const previousEntry = manager.currentActiveEntry;
      
      mockPlayer.state.currentTime = 12;
      manager.updateActiveEntry();

      expect(previousEntry.element.classList.contains('vidply-transcript-entry-active')).toBe(false);
      expect(manager.currentActiveEntry.element.classList.contains('vidply-transcript-entry-active')).toBe(true);
    });

    it('should handle time between entries', () => {
      mockPlayer.state.currentTime = 20; // After all entries

      manager.updateActiveEntry();

      // Should clear any previous active entry
      if (manager.currentActiveEntry) {
        expect(manager.currentActiveEntry.element.classList.contains('vidply-transcript-entry-active')).toBe(false);
      }
    });
  });

  describe('initialization', () => {
    it('should initialize with default autoscroll enabled', () => {
      manager = new TranscriptManager(mockPlayer);
      expect(manager.autoscrollEnabled).toBe(true);
    });

    it('should initialize with default timestamps hidden', () => {
      manager = new TranscriptManager(mockPlayer);
      expect(manager.showTimestamps).toBe(false);
    });

    it('should initialize transcript style from options', () => {
      manager = new TranscriptManager(mockPlayer);
      
      expect(manager.transcriptStyle.fontSize).toBe('100%');
      expect(manager.transcriptStyle.fontFamily).toBe('sans-serif');
      expect(manager.transcriptStyle.color).toBe('#ffffff');
    });

    it('should set up event listeners', () => {
      manager = new TranscriptManager(mockPlayer);
      
      expect(mockPlayer.on).toHaveBeenCalledWith('timeupdate', expect.any(Function));
      expect(mockPlayer.on).toHaveBeenCalledWith('audiodescriptionenabled', expect.any(Function));
      expect(mockPlayer.on).toHaveBeenCalledWith('audiodescriptiondisabled', expect.any(Function));
    });
  });

  describe('visibility state', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should track visibility state', () => {
      expect(manager.isVisible).toBe(false);
    });

    it('should toggle visibility', () => {
      manager.isVisible = false;
      manager.toggleTranscript();
      // Note: actual show/hide logic depends on DOM elements being created
    });
  });

  describe('timeout management', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should track managed timeouts', () => {
      expect(manager.timeouts).toBeDefined();
      expect(manager.timeouts instanceof Set).toBe(true);
    });
  });

  describe('toggleTranscript', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should show transcript when hidden', () => {
      manager.isVisible = false;
      const showSpy = vi.spyOn(manager, 'showTranscript');
      
      manager.toggleTranscript();
      
      expect(showSpy).toHaveBeenCalled();
    });

    it('should hide transcript when visible', () => {
      manager.isVisible = true;
      const hideSpy = vi.spyOn(manager, 'hideTranscript');
      
      manager.toggleTranscript();
      
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('showTranscript', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should create transcript window if not exists', () => {
      expect(manager.transcriptWindow).toBeNull();
      
      manager.showTranscript();
      
      expect(manager.transcriptWindow).not.toBeNull();
    });

    it('should set isVisible to true', () => {
      manager.showTranscript();
      
      expect(manager.isVisible).toBe(true);
    });

    it('should show existing window if already created', () => {
      manager.transcriptWindow = document.createElement('div');
      manager.transcriptWindow.style.display = 'none';
      manager.transcriptContent = document.createElement('div');

      manager.showTranscript();
      
      expect(manager.transcriptWindow.style.display).toBe('flex');
    });

    it('should set isVisible to true when showing', () => {
      manager.showTranscript();
      
      expect(manager.isVisible).toBe(true);
    });
  });

  describe('hideTranscript', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
      manager.transcriptWindow = document.createElement('div');
      mockPlayer.container.appendChild(manager.transcriptWindow);
      manager.isVisible = true;
    });

    it('should hide transcript window', () => {
      manager.hideTranscript();
      
      expect(manager.transcriptWindow.style.display).toBe('none');
    });

    it('should set isVisible to false', () => {
      manager.hideTranscript();
      
      expect(manager.isVisible).toBe(false);
    });

    it('should call updateTranscriptButton on controlBar', () => {
      manager.hideTranscript();
      
      expect(mockPlayer.controlBar.updateTranscriptButton).toHaveBeenCalled();
    });

    it('should focus transcript button when focusButton is true', () => {
      const transcriptButton = document.createElement('button');
      transcriptButton.focus = vi.fn();
      mockPlayer.controlBar.controls.transcript = transcriptButton;
      
      manager.hideTranscript({ focusButton: true });
      
      expect(transcriptButton.focus).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  describe('createTranscriptWindow', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should create window with dialog role', () => {
      manager.createTranscriptWindow();
      
      expect(manager.transcriptWindow.getAttribute('role')).toBe('dialog');
    });

    it('should create header element', () => {
      manager.createTranscriptWindow();
      
      expect(manager.transcriptHeader).not.toBeNull();
    });

    it('should create settings button', () => {
      manager.createTranscriptWindow();
      
      expect(manager.settingsButton).not.toBeNull();
      expect(manager.settingsButton.tagName).toBe('BUTTON');
    });

    it('should create content container', () => {
      manager.createTranscriptWindow();
      
      expect(manager.transcriptContent).not.toBeNull();
    });

    it('should create autoscroll checkbox', () => {
      manager.createTranscriptWindow();
      
      expect(manager.autoscrollCheckbox).not.toBeNull();
      expect(manager.autoscrollCheckbox.type).toBe('checkbox');
    });

    it('should set autoscroll checkbox based on preference', () => {
      manager.autoscrollEnabled = true;
      manager.createTranscriptWindow();
      
      expect(manager.autoscrollCheckbox.checked).toBe(true);
    });

    it('should create live region for announcements', () => {
      manager.createTranscriptWindow();
      
      expect(manager.liveRegion).not.toBeNull();
      expect(manager.liveRegion.getAttribute('aria-live')).toBe('polite');
    });

    it('should create language selector', () => {
      manager.createTranscriptWindow();
      
      expect(manager.languageSelector).not.toBeNull();
      expect(manager.languageLabel).not.toBeNull();
    });
  });

  describe('autoscroll preference', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
      manager.createTranscriptWindow();
    });

    it('should update autoscrollEnabled when checkbox changes', () => {
      manager.autoscrollCheckbox.checked = false;
      manager.autoscrollCheckbox.dispatchEvent(new Event('change'));
      
      expect(manager.autoscrollEnabled).toBe(false);
    });
  });

  describe('transcript style', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should have default font size', () => {
      expect(manager.transcriptStyle.fontSize).toBe('100%');
    });

    it('should have default font family', () => {
      expect(manager.transcriptStyle.fontFamily).toBe('sans-serif');
    });

    it('should have default color', () => {
      expect(manager.transcriptStyle.color).toBe('#ffffff');
    });

    it('should have default background color', () => {
      expect(manager.transcriptStyle.backgroundColor).toBe('#1e1e1e');
    });

    it('should have default opacity', () => {
      expect(manager.transcriptStyle.opacity).toBe(0.98);
    });
  });

  describe('settings menu', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
      manager.createTranscriptWindow();
    });

    it('should track settings menu visibility', () => {
      expect(manager.settingsMenuVisible).toBe(false);
    });

    it('should have settingsMenuJustOpened flag', () => {
      expect(manager.settingsMenuJustOpened).toBe(false);
    });
  });

  describe('language selection', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should track current transcript language', () => {
      expect(manager.currentTranscriptLanguage).toBeNull();
    });

    it('should track available languages', () => {
      expect(manager.availableTranscriptLanguages).toEqual([]);
    });
  });

  describe('resize handles', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
      manager.createTranscriptWindow();
    });

    it('should create resize handles array', () => {
      expect(manager.transcriptResizeHandles).toBeDefined();
      expect(Array.isArray(manager.transcriptResizeHandles)).toBe(true);
    });
  });

  describe('event handlers', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should store timeupdate handler', () => {
      expect(manager.handlers.timeupdate).toBeDefined();
      expect(typeof manager.handlers.timeupdate).toBe('function');
    });

    it('should store audiodescriptionenabled handler', () => {
      expect(manager.handlers.audiodescriptionenabled).toBeDefined();
      expect(typeof manager.handlers.audiodescriptionenabled).toBe('function');
    });

    it('should store audiodescriptiondisabled handler', () => {
      expect(manager.handlers.audiodescriptiondisabled).toBeDefined();
      expect(typeof manager.handlers.audiodescriptiondisabled).toBe('function');
    });
  });

  describe('draggable/resizable', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should start with null draggableResizable', () => {
      expect(manager.draggableResizable).toBeNull();
    });

    it('should create draggableResizable when window is created', () => {
      manager.createTranscriptWindow();
      
      // setupDragAndDrop creates the draggableResizable
      expect(manager.draggableResizable).not.toBeNull();
    });
  });

  describe('live transcript sync', () => {
    beforeEach(() => {
      mockPlayer.state.isLive = true;
      mockPlayer.isLiveStream = vi.fn(() => true);
      manager = new TranscriptManager(mockPlayer);
      manager.createTranscriptWindow();
      manager.isVisible = true;
    });

    it('should append live cues incrementally without duplicates', () => {
      const cue = {
        startTime: 12,
        endTime: 14,
        text: 'Guten Abend',
        id: 'cue-1',
      };
      const duplicateCueList = {
        0: cue,
        1: cue,
        length: 2,
        [Symbol.iterator]: function* () {
          yield cue;
          yield cue;
        },
      };

      mockPlayer.textTracks = [{
        kind: 'subtitles',
        language: 'de',
        label: 'Deutsch',
        mode: 'hidden',
        cues: duplicateCueList,
      }];

      manager._syncLiveTranscriptCues();
      manager._syncLiveTranscriptCues();

      expect(manager.transcriptEntries).toHaveLength(1);
      expect(manager.transcriptContent.querySelectorAll('.vidply-transcript-entry')).toHaveLength(1);
    });

    it('should treat shifted live timestamps as the same line', () => {
      const cueA = { startTime: 12.04, endTime: 14.1, text: 'Guten Abend', id: 'a' };
      const cueB = { startTime: 12.51, endTime: 14.6, text: 'Guten Abend', id: 'b' };
      mockPlayer.textTracks = [{
        kind: 'subtitles',
        language: 'de',
        label: 'Deutsch',
        mode: 'hidden',
        cues: [cueA, cueB],
      }];

      manager._syncLiveTranscriptCues();

      expect(manager.transcriptEntries).toHaveLength(1);
    });

    it('should dedupe live segment overlap several seconds apart', () => {
      const sentence = 'Die Italienerinnen, die Frauen aus Großbritannien sind in jedem Fall';
      const cues = [
        { startTime: 7198.58, endTime: 7200.02, text: sentence, id: 'a' },
        { startTime: 7202.02, endTime: 7203.02, text: sentence, id: 'b' },
        { startTime: 7200.02, endTime: 7202.02, text: sentence, id: 'c' },
      ];
      mockPlayer.textTracks = [{
        kind: 'subtitles',
        language: 'de',
        label: 'Deutsch',
        mode: 'hidden',
        cues,
      }];

      manager._syncLiveTranscriptCues();

      expect(manager.transcriptEntries).toHaveLength(1);
      expect(manager.transcriptEntries[0].startTime).toBe(7198.58);
    });

    it('should sort live transcript entries by start time', () => {
      const cues = [
        { startTime: 20, endTime: 22, text: 'Zweiter Satz', id: 'b' },
        { startTime: 10, endTime: 12, text: 'Erster Satz', id: 'a' },
      ];
      mockPlayer.textTracks = [{
        kind: 'subtitles',
        language: 'de',
        label: 'Deutsch',
        mode: 'hidden',
        cues,
      }];

      manager._syncLiveTranscriptCues();

      expect(manager.transcriptEntries.map((entry) => entry.startTime)).toEqual([10, 20]);
      const domOrder = [...manager.transcriptContent.querySelectorAll('.vidply-transcript-entry')]
        .map((node) => node.querySelector('.vidply-transcript-text')?.textContent);
      expect(domOrder).toEqual(['Erster Satz', 'Zweiter Satz']);
    });

    it('should not inert player controls when floating transcript is open', () => {
      manager = new TranscriptManager(mockPlayer);
      manager.createTranscriptWindow();
      manager.isVisible = true;
      manager.transcriptWindow.style.position = 'absolute';
      manager.transcriptWindow.style.display = 'flex';

      const controls = document.createElement('div');
      controls.className = 'vidply-controls';
      mockPlayer.videoWrapper.appendChild(controls);

      manager.updateTranscriptModalState();

      expect(mockPlayer.videoWrapper.hasAttribute('inert')).toBe(false);
      expect(manager.transcriptWindow.getAttribute('aria-modal')).toBe('false');
    });

    it('should highlight the latest started live cue during playback', () => {
      manager = new TranscriptManager(mockPlayer);
      manager.createTranscriptWindow();
      manager.isVisible = true;
      manager.transcriptContent = manager.transcriptWindow.querySelector('.vidply-transcript-content');

      const makeEntry = (startTime, text) => {
        const cue = { startTime, endTime: startTime + 2, text, id: String(startTime) };
        const element = document.createElement('button');
        element.className = 'vidply-transcript-entry';
        element.appendChild(document.createElement('span'));
        manager.transcriptEntries.push({
          element,
          cue,
          type: 'caption',
          startTime,
          endTime: startTime + 2,
        });
        manager.transcriptContent.appendChild(element);
        return element;
      };

      makeEntry(100, 'first');
      const second = makeEntry(104, 'second');
      mockPlayer.state.currentTime = 105;

      manager.updateActiveEntry();

      expect(second.classList.contains('vidply-transcript-entry-active')).toBe(true);
    });
  });

  describe('managed timeouts', () => {
    beforeEach(() => {
      manager = new TranscriptManager(mockPlayer);
    });

    it('should have setManagedTimeout method', () => {
      expect(typeof manager.setManagedTimeout).toBe('function');
    });

    it('should track timeout IDs', () => {
      expect(manager.timeouts).toBeDefined();
      expect(manager.timeouts instanceof Set).toBe(true);
    });
  });
});
