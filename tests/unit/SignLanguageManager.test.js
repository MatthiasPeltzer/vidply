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

vi.mock('../../src/utils/DraggableResizable.js', () => ({
  DraggableResizable: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    enableKeyboardDragMode: vi.fn(),
    disableKeyboardDragMode: vi.fn(),
    enableKeyboardResizeMode: vi.fn(),
    disableKeyboardResizeMode: vi.fn()
  }))
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
      state: {},
      emit: vi.fn(),
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

    it('should track document click handler state', () => {
      expect(manager.documentClickHandlerAdded).toBe(false);
    });
  });
});
