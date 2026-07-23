/**
 * Unit Tests: MenuFactory
 * Tests menu creation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the dependencies before importing MenuFactory
vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn((name) => {
    const span = document.createElement('span');
    span.className = `icon-${name}`;
    return span;
  })
}));

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => {
      const translations = {
        'player.speed': 'Playback Speed',
        'player.captions': 'Captions',
        'player.chapters': 'Chapters',
        'player.quality': 'Quality',
        'player.normalSpeed': 'Normal',
        'player.captionsOff': 'Off',
        'player.noChapters': 'No chapters available',
        'player.auto': 'Auto',
        'player.autoQuality': 'Auto (no quality selection)'
      };
      return translations[key] || key;
    })
  }
}));

vi.mock('../../src/utils/MenuUtils.js', () => ({
  attachMenuKeyboardNavigation: vi.fn(),
  focusFirstMenuItem: vi.fn()
}));

describe('MenuFactory', () => {
  let createMenu, createSpeedMenu, createCaptionsMenu, createChaptersMenu, createQualityMenu;
  let mockPlayer;
  let mockButton;

  beforeEach(async () => {
    // Clear document
    document.body.innerHTML = '';
    
    // Create mock player and button
    mockPlayer = {
      options: {
        classPrefix: 'vidply'
      },
      // Menus are inserted next to the button (inside the player container in
      // real usage); the toggle lookup is scoped to this container so that
      // multiple players on a page don't close each other's menus.
      container: document.body
    };
    
    mockButton = document.createElement('button');
    mockButton.setAttribute('aria-expanded', 'false');
    document.body.appendChild(mockButton);

    // Import after mocks are set up
    const module = await import('../../src/utils/MenuFactory.js');
    createMenu = module.createMenu;
    createSpeedMenu = module.createSpeedMenu;
    createCaptionsMenu = module.createCaptionsMenu;
    createChaptersMenu = module.createChaptersMenu;
    createQualityMenu = module.createQualityMenu;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('createMenu', () => {
    it('should create menu with correct structure', () => {
      const menu = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [
          { text: 'Item 1', onClick: vi.fn() },
          { text: 'Item 2', onClick: vi.fn() }
        ]
      });

      expect(menu).toBeTruthy();
      expect(menu.getAttribute('role')).toBe('menu');
      expect(menu.getAttribute('aria-label')).toBe('Test Menu');
      expect(menu.classList.contains('vidply-test-menu')).toBe(true);
    });

    it('should create menu items', () => {
      const menu = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [
          { text: 'Item 1', onClick: vi.fn() },
          { text: 'Item 2', onClick: vi.fn() },
          { text: 'Item 3', onClick: vi.fn() }
        ]
      });

      const items = menu.querySelectorAll('.vidply-menu-item');
      expect(items.length).toBe(3);
    });

    it('should mark active item', () => {
      const menu = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [
          { text: 'Item 1', onClick: vi.fn() },
          { text: 'Item 2', active: true, onClick: vi.fn() },
          { text: 'Item 3', onClick: vi.fn() }
        ]
      });

      const activeItems = menu.querySelectorAll('.vidply-menu-item-active');
      expect(activeItems.length).toBe(1);
    });

    it('should create divider items', () => {
      const menu = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [
          { text: 'Item 1', onClick: vi.fn() },
          { type: 'divider' },
          { text: 'Item 2', onClick: vi.fn() }
        ]
      });

      const dividers = menu.querySelectorAll('.vidply-menu-divider');
      expect(dividers.length).toBe(1);
      expect(dividers[0].getAttribute('role')).toBe('separator');
    });

    it('should create header items', () => {
      const menu = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [
          { type: 'header', text: 'Section Title' },
          { text: 'Item 1', onClick: vi.fn() }
        ]
      });

      const headers = menu.querySelectorAll('.vidply-menu-header');
      expect(headers.length).toBe(1);
      expect(headers[0].textContent).toBe('Section Title');
    });

    it('should toggle menu on second call (remove existing)', () => {
      const menu1 = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [{ text: 'Item 1', onClick: vi.fn() }]
      });

      expect(menu1).toBeTruthy();

      const menu2 = createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [{ text: 'Item 1', onClick: vi.fn() }]
      });

      // Second call should remove menu and return null
      expect(menu2).toBe(null);
    });

    it('should set aria-expanded on button', () => {
      createMenu({
        player: mockPlayer,
        button: mockButton,
        menuClass: 'test-menu',
        ariaLabel: 'Test Menu',
        items: [{ text: 'Item 1', onClick: vi.fn() }]
      });

      expect(mockButton.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('createSpeedMenu', () => {
    it('should create speed menu with default speeds', () => {
      const onSpeedChange = vi.fn();
      
      const menu = createSpeedMenu({
        player: mockPlayer,
        button: mockButton,
        currentSpeed: 1,
        onSpeedChange
      });

      expect(menu).toBeTruthy();
      const items = menu.querySelectorAll('.vidply-menu-item');
      expect(items.length).toBe(8); // 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
    });

    it('should mark current speed as active', () => {
      const menu = createSpeedMenu({
        player: mockPlayer,
        button: mockButton,
        currentSpeed: 1.5,
        onSpeedChange: vi.fn()
      });

      const activeItems = menu.querySelectorAll('.vidply-menu-item-active');
      expect(activeItems.length).toBe(1);
    });

    it('should use custom speeds array', () => {
      const menu = createSpeedMenu({
        player: mockPlayer,
        button: mockButton,
        currentSpeed: 1,
        speeds: [0.5, 1, 2],
        onSpeedChange: vi.fn()
      });

      const items = menu.querySelectorAll('.vidply-menu-item');
      expect(items.length).toBe(3);
    });
  });

  describe('createCaptionsMenu', () => {
    it('should create captions menu with tracks', () => {
      const menu = createCaptionsMenu({
        player: mockPlayer,
        button: mockButton,
        tracks: [
          { label: 'English', language: 'en' },
          { label: 'German', language: 'de' }
        ],
        currentTrackIndex: 0,
        captionsEnabled: true,
        onTrackSelect: vi.fn(),
        onDisable: vi.fn()
      });

      expect(menu).toBeTruthy();
      const items = menu.querySelectorAll('.vidply-menu-item');
      // Off + 2 tracks = 3 items
      expect(items.length).toBe(3);
    });

    it('should include Off option', () => {
      const menu = createCaptionsMenu({
        player: mockPlayer,
        button: mockButton,
        tracks: [{ label: 'English', language: 'en' }],
        currentTrackIndex: 0,
        captionsEnabled: false,
        onTrackSelect: vi.fn(),
        onDisable: vi.fn()
      });

      const items = menu.querySelectorAll('.vidply-menu-item');
      const offItem = items[0];
      expect(offItem.textContent).toContain('Off');
    });
  });

  describe('createChaptersMenu', () => {
    it('should create chapters menu with chapters', () => {
      const menu = createChaptersMenu({
        player: mockPlayer,
        button: mockButton,
        chapters: [
          { startTime: 0, text: 'Introduction' },
          { startTime: 60, text: 'Chapter 1' },
          { startTime: 120, text: 'Chapter 2' }
        ],
        onChapterSelect: vi.fn(),
        formatTime: (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`,
        formatDuration: (s) => `${s} seconds`
      });

      expect(menu).toBeTruthy();
      const items = menu.querySelectorAll('.vidply-menu-item');
      expect(items.length).toBe(3);
    });

    it('should show no chapters message when empty', () => {
      const menu = createChaptersMenu({
        player: mockPlayer,
        button: mockButton,
        chapters: [],
        onChapterSelect: vi.fn(),
        formatTime: vi.fn(),
        formatDuration: vi.fn()
      });

      expect(menu).toBeTruthy();
      // Should have disabled item with "no chapters" message
    });
  });

  describe('createQualityMenu', () => {
    it('should create quality menu with options', () => {
      const menu = createQualityMenu({
        player: mockPlayer,
        button: mockButton,
        qualities: [
          { index: 0, height: 1080, name: '1080p' },
          { index: 1, height: 720, name: '720p' },
          { index: 2, height: 480, name: '480p' }
        ],
        currentQuality: 1,
        isHLS: false,
        onQualitySelect: vi.fn()
      });

      expect(menu).toBeTruthy();
      const items = menu.querySelectorAll('.vidply-menu-item');
      expect(items.length).toBe(3);
    });

    it('should include Auto option for HLS', () => {
      const menu = createQualityMenu({
        player: mockPlayer,
        button: mockButton,
        qualities: [
          { index: 0, height: 1080 },
          { index: 1, height: 720 }
        ],
        currentQuality: -1,
        isHLS: true,
        onQualitySelect: vi.fn()
      });

      const items = menu.querySelectorAll('.vidply-menu-item');
      // Auto + 2 qualities = 3 items
      expect(items.length).toBe(3);
    });
  });
});
