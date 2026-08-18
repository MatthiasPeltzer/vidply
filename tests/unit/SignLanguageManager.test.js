/**
 * Unit Tests: SignLanguageManager
 * Tests sign language video management
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
          if (value !== undefined) el.setAttribute(key, value);
        });
      }
      return el;
    }),
    attachTooltip: vi.fn()
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

vi.mock('../../src/utils/DraggableResizable.js', () => ({
  DraggableResizable: class MockDraggableResizable {
    constructor() {
      this.destroy = vi.fn();
      this.enableKeyboardDragMode = vi.fn();
      this.disableKeyboardDragMode = vi.fn();
      this.enableKeyboardResizeMode = vi.fn();
      this.disableKeyboardResizeMode = vi.fn();
      this.manuallyPositioned = false;
    }
  }
}));

vi.mock('../../src/utils/MenuUtils.js', () => ({
  createMenuItem: vi.fn(() => document.createElement('button')),
  attachMenuKeyboardNavigation: vi.fn(),
  focusFirstMenuItem: vi.fn()
}));

vi.mock('../../src/utils/FormUtils.js', () => ({
  createLabeledSelect: vi.fn(() => ({
    label: document.createElement('label'),
    select: document.createElement('select')
  })),
  preventDragOnElement: vi.fn()
}));

describe('SignLanguageManager', () => {
  let SignLanguageManager;
  let manager;
  let mockPlayer;

  beforeEach(async () => {
    document.body.innerHTML = '';
    
    // Create mock player
    mockPlayer = {
      options: {
        signLanguageSrc: null,
        signLanguageSources: {},
        signLanguagePosition: 'bottom-right',
        classPrefix: 'vidply'
      },
      element: document.createElement('video'),
      container: document.createElement('div'),
      state: {
        currentTime: 0,
        paused: true
      },
      storage: {
        getSignLanguagePreferences: vi.fn().mockReturnValue(null),
        saveSignLanguagePreferences: vi.fn()
      },
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setManagedTimeout: vi.fn((cb) => cb()),
      clearManagedTimeout: vi.fn()
    };
    
    document.body.appendChild(mockPlayer.container);
    mockPlayer.container.appendChild(mockPlayer.element);
    
    // Import after mocks
    const module = await import('../../src/core/SignLanguageManager.js');
    SignLanguageManager = module.SignLanguageManager;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with player reference', () => {
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.player).toBe(mockPlayer);
      expect(manager.enabled).toBe(false);
      expect(manager.wrapper).toBe(null);
    });

    it('should use sign language sources from options', () => {
      mockPlayer.options.signLanguageSources = {
        en: '/sign/en.mp4',
        de: '/sign/de.mp4'
      };
      
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.sources).toEqual({
        en: '/sign/en.mp4',
        de: '/sign/de.mp4'
      });
    });

    it('should use single src from options', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.src).toBe('/sign/video.mp4');
    });

    it('should use default position', () => {
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.desiredPosition).toBe('bottom-right');
    });

    it('should use custom position from options', () => {
      mockPlayer.options.signLanguagePosition = 'top-left';
      
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.desiredPosition).toBe('top-left');
    });
  });

  describe('isAvailable', () => {
    it('should return false when no sources configured', () => {
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(false);
    });

    it('should return true when single src is configured', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(true);
    });

    it('should read signLanguageSrc from the player instance (playlist tracks)', () => {
      mockPlayer.signLanguageSrc = '/sign/playlist-track.mp4';

      manager = new SignLanguageManager(mockPlayer);

      expect(manager.src).toBe('/sign/playlist-track.mp4');
      expect(manager.isAvailable()).toBe(true);
    });

    it('should return true when multiple sources are configured', () => {
      mockPlayer.options.signLanguageSources = {
        en: '/sign/en.mp4',
        de: '/sign/de.mp4'
      };
      
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(true);
    });

    it('should return true with both src and sources', () => {
      mockPlayer.options.signLanguageSrc = '/sign/default.mp4';
      mockPlayer.options.signLanguageSources = {
        en: '/sign/en.mp4'
      };
      
      manager = new SignLanguageManager(mockPlayer);
      
      expect(manager.isAvailable()).toBe(true);
    });
  });

  describe('state management', () => {
    beforeEach(() => {
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should track enabled state', () => {
      expect(manager.enabled).toBe(false);
      
      manager.enabled = true;
      expect(manager.enabled).toBe(true);
    });

    it('should track inMainView state', () => {
      expect(manager.inMainView).toBe(false);
      
      manager.inMainView = true;
      expect(manager.inMainView).toBe(true);
    });

    it('should track current language', () => {
      expect(manager.currentLanguage).toBe(null);
      
      manager.currentLanguage = 'de';
      expect(manager.currentLanguage).toBe('de');
    });
  });

  describe('DOM elements', () => {
    beforeEach(() => {
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should have null DOM elements initially', () => {
      expect(manager.wrapper).toBe(null);
      expect(manager.header).toBe(null);
      expect(manager.video).toBe(null);
      expect(manager.selector).toBe(null);
      expect(manager.settingsButton).toBe(null);
      expect(manager.settingsMenu).toBe(null);
    });

    it('should have empty resize handles array', () => {
      expect(manager.resizeHandles).toEqual([]);
    });
  });

  describe('handlers', () => {
    beforeEach(() => {
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should have null handlers initially', () => {
      expect(manager.handlers).toBe(null);
      expect(manager.settingsHandlers).toBe(null);
      expect(manager.interactionHandlers).toBe(null);
      expect(manager.draggable).toBe(null);
    });
  });

  describe('menu options', () => {
    beforeEach(() => {
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should have null menu option references initially', () => {
      expect(manager.dragOptionButton).toBe(null);
      expect(manager.dragOptionText).toBe(null);
      expect(manager.resizeOptionButton).toBe(null);
      expect(manager.resizeOptionText).toBe(null);
    });
  });

  describe('settings menu state', () => {
    beforeEach(() => {
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should track settings menu visibility', () => {
      expect(manager.settingsMenuVisible).toBe(false);
    });

    it('should track if menu was just opened', () => {
      expect(manager.settingsMenuJustOpened).toBe(false);
    });
  });

  describe('enable', () => {
    it('should warn when no source configured', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable();
      
      expect(warnSpy).toHaveBeenCalledWith('No sign language video source provided');
      warnSpy.mockRestore();
    });

    it('should set enabled to true when src available', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable();
      
      expect(manager.enabled).toBe(true);
    });

    it('should set player state signLanguageEnabled', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable();
      
      expect(mockPlayer.state.signLanguageEnabled).toBe(true);
    });

    it('should emit signlanguageenabled event', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable();
      
      expect(mockPlayer.emit).toHaveBeenCalledWith('signlanguageenabled');
    });

    it('should create wrapper element', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable();
      
      expect(manager.wrapper).not.toBeNull();
    });

    it('should create video element', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable();
      
      expect(manager.video).not.toBeNull();
    });

    it('should show existing wrapper if already created', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      
      manager.enable(); // First enable
      manager.wrapper.style.display = 'none';
      manager.enabled = false;
      
      manager.enable(); // Second enable
      
      expect(manager.wrapper.style.display).toBe('block');
    });
  });

  describe('disable', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      manager.enable();
    });

    it('should hide wrapper', () => {
      manager.disable();
      
      expect(manager.wrapper.style.display).toBe('none');
    });

    it('should set enabled to false', () => {
      manager.disable();
      
      expect(manager.enabled).toBe(false);
    });

    it('should set player state signLanguageEnabled to false', () => {
      manager.disable();
      
      expect(mockPlayer.state.signLanguageEnabled).toBe(false);
    });

    it('should emit signlanguagedisabled event', () => {
      manager.disable();
      
      expect(mockPlayer.emit).toHaveBeenCalledWith('signlanguagedisabled');
    });
  });

  describe('toggle', () => {
    it('should enable when disabled', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      manager.enabled = false;
      
      manager.toggle();
      
      expect(manager.enabled).toBe(true);
    });

    it('should disable when enabled', () => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      manager.enable();
      
      manager.toggle();
      
      expect(manager.enabled).toBe(false);
    });
  });

  describe('switchLanguage', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSources = {
        en: '/sign/en.mp4',
        de: '/sign/de.mp4'
      };
      manager = new SignLanguageManager(mockPlayer);
      manager.enable();
    });

    it('should update currentLanguage', () => {
      manager.switchLanguage('de');
      
      expect(manager.currentLanguage).toBe('de');
    });

    it('should update video src', () => {
      manager.switchLanguage('de');
      
      expect(manager.video.src).toContain('/sign/de.mp4');
    });

    it('should ignore invalid language code', () => {
      const originalLang = manager.currentLanguage;
      
      manager.switchLanguage('invalid');
      
      expect(manager.currentLanguage).toBe(originalLang);
    });
  });

  describe('main view mode', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      mockPlayer.state = {
        currentTime: 0,
        playing: false,
        muted: false
      };
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should track inMainView state', () => {
      expect(manager.inMainView).toBe(false);
    });

    it('should track mainViewOriginalSrc', () => {
      expect(manager.mainViewOriginalSrc).toBeNull();
    });

    it('should track _mainViewMutedBefore', () => {
      expect(manager._mainViewMutedBefore).toBe(false);
    });
  });

  describe('toggleInMainView', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      mockPlayer.state = {
        currentTime: 0,
        playing: false,
        muted: false
      };
      mockPlayer.videoWrapper = document.createElement('div');
      mockPlayer.seek = vi.fn();
      mockPlayer.play = vi.fn().mockResolvedValue();
      mockPlayer.pause = vi.fn();
      mockPlayer.invalidateTrackCache = vi.fn();
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should call enableInMainView when not in main view', () => {
      manager.inMainView = false;
      const enableSpy = vi.spyOn(manager, 'enableInMainView').mockResolvedValue();
      
      manager.toggleInMainView();
      
      expect(enableSpy).toHaveBeenCalled();
    });

    it('should call disableInMainView when in main view', () => {
      manager.inMainView = true;
      const disableSpy = vi.spyOn(manager, 'disableInMainView').mockResolvedValue();
      
      manager.toggleInMainView();
      
      expect(disableSpy).toHaveBeenCalled();
    });
  });

  describe('_determineInitialLanguage', () => {
    it('should return first available language', () => {
      mockPlayer.options.signLanguageSources = {
        en: '/sign/en.mp4',
        de: '/sign/de.mp4'
      };
      manager = new SignLanguageManager(mockPlayer);
      
      const lang = manager._determineInitialLanguage();
      
      // Should return first key
      expect(['en', 'de']).toContain(lang);
    });
  });

  describe('video synchronization', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      mockPlayer.state.paused = true;
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should sync video currentTime on enable', () => {
      mockPlayer.state.currentTime = 30;
      
      manager.enable();
      
      expect(manager.video.currentTime).toBe(30);
    });
  });

  describe('constrainPosition', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      manager.enable();
    });

    it('should have constrainPosition method', () => {
      expect(typeof manager.constrainPosition).toBe('function');
    });
  });

  describe('resize handles', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
      manager.enable();
    });

    it('should create resize handles array', () => {
      expect(manager.resizeHandles).toBeDefined();
      expect(Array.isArray(manager.resizeHandles)).toBe(true);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should have null handlers initially', () => {
      expect(manager.handlers).toBeNull();
    });

    it('should have null draggable initially', () => {
      expect(manager.draggable).toBeNull();
    });
  });

  describe('video type inference', () => {
    beforeEach(() => {
      mockPlayer.options.signLanguageSrc = '/sign/video.mp4';
      manager = new SignLanguageManager(mockPlayer);
    });

    it('should have _inferVideoType method', () => {
      expect(typeof manager._inferVideoType).toBe('function');
    });

    it('should return video/mp4 for mp4 files', () => {
      const type = manager._inferVideoType('/video.mp4');
      expect(type).toBe('video/mp4');
    });

    it('should return video/webm for webm files', () => {
      const type = manager._inferVideoType('/video.webm');
      expect(type).toBe('video/webm');
    });

    it('should return empty string for unknown extensions', () => {
      const type = manager._inferVideoType('/video.xyz');
      expect(type).toBeFalsy();
    });
  });
});
