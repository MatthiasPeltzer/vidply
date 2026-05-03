/**
 * Unit Tests: SettingsDialog
 * Tests the settings dialog component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsDialog } from '../../src/controls/SettingsDialog.js';

// Mock dependencies
vi.mock('../../src/utils/DOMUtils.js', () => ({
  DOMUtils: {
    createElement: vi.fn((tag, options = {}) => {
      const el = document.createElement(tag);
      if (options.className) el.className = options.className;
      if (options.textContent) el.textContent = options.textContent;
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            el.setAttribute(key, String(value));
          }
        });
      }
      return el;
    })
  }
}));

vi.mock('../../src/icons/Icons.js', () => ({
  createIconElement: vi.fn((iconName) => {
    const span = document.createElement('span');
    span.className = `icon-${iconName}`;
    return span;
  })
}));

vi.mock('../../src/i18n/i18n.js', () => ({
  i18n: {
    t: vi.fn((key) => `translated:${key}`),
    getLanguage: vi.fn(() => 'en')
  }
}));

describe('SettingsDialog', () => {
  let dialog;
  let mockPlayer;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    
    container = document.createElement('div');
    document.body.appendChild(container);

    mockPlayer = {
      container,
      options: {
        classPrefix: 'vidply',
        captionsFontSize: '100%',
        captionsFontFamily: 'sans-serif',
        captionsColor: '#FFFFFF',
        captionsBackgroundColor: '#000000',
        captionsOpacity: 0.8
      },
      state: {
        playbackSpeed: 1
      },
      captionManager: null,
      setPlaybackSpeed: vi.fn(),
      disableCaptions: vi.fn(),
      emit: vi.fn()
    };

    dialog = new SettingsDialog(mockPlayer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should store player reference', () => {
      expect(dialog.player).toBe(mockPlayer);
    });

    it('should initialize isOpen to false', () => {
      expect(dialog.isOpen).toBe(false);
    });

    it('should create element', () => {
      expect(dialog.element).not.toBeNull();
    });

    it('should create overlay', () => {
      expect(dialog.overlay).not.toBeNull();
    });
  });

  describe('createElement', () => {
    it('should create overlay with dialog role', () => {
      expect(dialog.overlay.getAttribute('role')).toBe('dialog');
    });

    it('should set aria-modal on overlay', () => {
      expect(dialog.overlay.getAttribute('aria-modal')).toBe('true');
    });

    it('should hide overlay initially', () => {
      expect(dialog.overlay.style.display).toBe('none');
    });

    it('should create dialog element', () => {
      expect(dialog.element.tagName).toBe('DIV');
    });

    it('should append overlay to container', () => {
      expect(container.contains(dialog.overlay)).toBe(true);
    });

    it('should create close button', () => {
      const closeButton = dialog.element.querySelector('.vidply-settings-close');
      expect(closeButton).not.toBeNull();
    });

    it('should create header with title', () => {
      const title = dialog.element.querySelector('h2');
      expect(title).not.toBeNull();
    });

    it('should create reset button', () => {
      const resetButton = dialog.element.querySelector('.vidply-settings-footer button');
      expect(resetButton).not.toBeNull();
      expect(resetButton.textContent).toBe('translated:settings.reset');
    });
  });

  describe('formatSpeedLabel', () => {
    it('should return "Normal" for speed 1', () => {
      const result = dialog.formatSpeedLabel(1);
      expect(result).toBe('translated:speeds.normal');
    });

    it('should format other speeds with x suffix', () => {
      const result = dialog.formatSpeedLabel(1.5);
      expect(result).toContain('×');
    });

    it('should format speed 0.5', () => {
      const result = dialog.formatSpeedLabel(0.5);
      expect(result).toContain('×');
    });

    it('should format speed 2', () => {
      const result = dialog.formatSpeedLabel(2);
      expect(result).toContain('×');
    });
  });

  describe('createSpeedSettings', () => {
    it('should create speed section', () => {
      const section = dialog.createSpeedSettings();
      expect(section.tagName).toBe('DIV');
    });

    it('should create speed label', () => {
      const section = dialog.createSpeedSettings();
      const label = section.querySelector('label');
      expect(label).not.toBeNull();
      expect(label.textContent).toBe('translated:settings.speed');
    });

    it('should create speed select', () => {
      const section = dialog.createSpeedSettings();
      const select = section.querySelector('select');
      expect(select).not.toBeNull();
    });

    it('should create options for all speeds', () => {
      const section = dialog.createSpeedSettings();
      const options = section.querySelectorAll('option');
      expect(options.length).toBe(8); // 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
    });

    it('should select current playback speed', () => {
      mockPlayer.state.playbackSpeed = 1.5;
      dialog = new SettingsDialog(mockPlayer);
      
      const section = dialog.createSpeedSettings();
      const select = section.querySelector('select');
      
      // Find selected option
      const selectedOption = Array.from(select.options).find(opt => opt.selected);
      expect(selectedOption.value).toBe('1.5');
    });

    it('should call setPlaybackSpeed on change', () => {
      const section = dialog.createSpeedSettings();
      const select = section.querySelector('select');
      
      select.value = '1.5';
      select.dispatchEvent(new Event('change'));
      
      expect(mockPlayer.setPlaybackSpeed).toHaveBeenCalledWith(1.5);
    });
  });

  describe('createCaptionSettings', () => {
    beforeEach(() => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0, label: 'English' }],
        getAvailableTracks: vi.fn().mockReturnValue([
          { index: 0, label: 'English', language: 'en' },
          { index: 1, label: 'Spanish', language: 'es' }
        ]),
        switchTrack: vi.fn(),
        setCaptionStyle: vi.fn()
      };
      dialog = new SettingsDialog(mockPlayer);
    });

    it('should create caption section', () => {
      const section = dialog.createCaptionSettings();
      expect(section.tagName).toBe('DIV');
    });

    it('should create section heading', () => {
      const section = dialog.createCaptionSettings();
      const heading = section.querySelector('h3');
      expect(heading).not.toBeNull();
      expect(heading.textContent).toBe('translated:settings.captions');
    });

    it('should create track select with off option', () => {
      const section = dialog.createCaptionSettings();
      const select = section.querySelector('select');
      const offOption = select.querySelector('option[value="-1"]');
      expect(offOption).not.toBeNull();
    });

    it('should create options for available tracks', () => {
      const section = dialog.createCaptionSettings();
      const select = section.querySelector('select');
      // Off option + 2 tracks
      expect(select.querySelectorAll('option').length).toBe(3);
    });

    it('should call disableCaptions when selecting off', () => {
      const section = dialog.createCaptionSettings();
      const select = section.querySelector('select');
      
      select.value = '-1';
      select.dispatchEvent(new Event('change'));
      
      expect(mockPlayer.disableCaptions).toHaveBeenCalled();
    });

    it('should call switchTrack when selecting a track', () => {
      const section = dialog.createCaptionSettings();
      const select = section.querySelector('select');
      
      select.value = '1';
      select.dispatchEvent(new Event('change'));
      
      expect(mockPlayer.captionManager.switchTrack).toHaveBeenCalledWith(1);
    });
  });

  describe('createCaptionStyleControl', () => {
    beforeEach(() => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0 }],
        getAvailableTracks: vi.fn().mockReturnValue([]),
        setCaptionStyle: vi.fn()
      };
      dialog = new SettingsDialog(mockPlayer);
    });

    it('should create wrapper div', () => {
      const control = dialog.createCaptionStyleControl('fontSize', 'Font Size', [
        { label: 'Small', value: '87.5%' }
      ]);
      expect(control.tagName).toBe('DIV');
    });

    it('should create label', () => {
      const control = dialog.createCaptionStyleControl('fontSize', 'Font Size', [
        { label: 'Small', value: '87.5%' }
      ]);
      const label = control.querySelector('label');
      expect(label).not.toBeNull();
      expect(label.textContent).toBe('Font Size');
    });

    it('should create select with options', () => {
      const control = dialog.createCaptionStyleControl('fontSize', 'Font Size', [
        { label: 'Small', value: '87.5%' },
        { label: 'Normal', value: '100%' }
      ]);
      const select = control.querySelector('select');
      expect(select.querySelectorAll('option').length).toBe(2);
    });

    it('should call setCaptionStyle on change', () => {
      const control = dialog.createCaptionStyleControl('fontSize', 'Font Size', [
        { label: 'Small', value: '87.5%' },
        { label: 'Normal', value: '100%' }
      ]);
      const select = control.querySelector('select');
      
      select.value = '87.5%';
      select.dispatchEvent(new Event('change'));
      
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('fontSize', '87.5%');
    });
  });

  describe('createColorControl', () => {
    beforeEach(() => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0 }],
        getAvailableTracks: vi.fn().mockReturnValue([]),
        setCaptionStyle: vi.fn()
      };
      dialog = new SettingsDialog(mockPlayer);
    });

    it('should create color input', () => {
      const control = dialog.createColorControl('color', 'Text Color');
      const input = control.querySelector('input[type="color"]');
      expect(input).not.toBeNull();
    });

    it('should set default color value', () => {
      const control = dialog.createColorControl('color', 'Text Color');
      const input = control.querySelector('input');
      // Color inputs normalize to lowercase
      expect(input.value.toLowerCase()).toBe('#ffffff');
    });

    it('should call setCaptionStyle on change', () => {
      const control = dialog.createColorControl('color', 'Text Color');
      const input = control.querySelector('input');
      
      input.value = '#FF0000';
      input.dispatchEvent(new Event('change'));
      
      // Color inputs normalize to lowercase
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('color', '#ff0000');
    });
  });

  describe('createRangeControl', () => {
    beforeEach(() => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0 }],
        getAvailableTracks: vi.fn().mockReturnValue([]),
        setCaptionStyle: vi.fn()
      };
      dialog = new SettingsDialog(mockPlayer);
    });

    it('should create range input', () => {
      const control = dialog.createRangeControl('opacity', 'Opacity', 0, 1, 0.1);
      const input = control.querySelector('input[type="range"]');
      expect(input).not.toBeNull();
    });

    it('should set min, max, step attributes', () => {
      const control = dialog.createRangeControl('opacity', 'Opacity', 0, 1, 0.1);
      const input = control.querySelector('input');
      
      expect(input.getAttribute('min')).toBe('0');
      expect(input.getAttribute('max')).toBe('1');
      expect(input.getAttribute('step')).toBe('0.1');
    });

    it('should create value display', () => {
      const control = dialog.createRangeControl('opacity', 'Opacity', 0, 1, 0.1);
      const display = control.querySelector('.vidply-settings-value');
      expect(display).not.toBeNull();
    });

    it('should update value display on input', () => {
      const control = dialog.createRangeControl('opacity', 'Opacity', 0, 1, 0.1);
      const input = control.querySelector('input');
      const display = control.querySelector('.vidply-settings-value');
      
      input.value = '0.5';
      input.dispatchEvent(new Event('input'));
      
      expect(display.textContent).toBe('0.5');
    });

    it('should call setCaptionStyle on input', () => {
      const control = dialog.createRangeControl('opacity', 'Opacity', 0, 1, 0.1);
      const input = control.querySelector('input');
      
      input.value = '0.5';
      input.dispatchEvent(new Event('input'));
      
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('opacity', 0.5);
    });
  });

  describe('resetSettings', () => {
    beforeEach(() => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0 }],
        getAvailableTracks: vi.fn().mockReturnValue([]),
        setCaptionStyle: vi.fn()
      };
      dialog = new SettingsDialog(mockPlayer);
    });

    it('should reset playback speed to 1', () => {
      dialog.resetSettings();
      expect(mockPlayer.setPlaybackSpeed).toHaveBeenCalledWith(1);
    });

    it('should reset caption styles', () => {
      dialog.resetSettings();
      
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('fontSize', '100%');
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('fontFamily', 'sans-serif');
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('color', '#FFFFFF');
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('backgroundColor', '#000000');
      expect(mockPlayer.captionManager.setCaptionStyle).toHaveBeenCalledWith('opacity', 0.8);
    });

    it('should hide dialog', () => {
      dialog.show();
      dialog.resetSettings();
      
      expect(dialog.overlay.style.display).toBe('none');
    });
  });

  describe('show', () => {
    it('should display overlay', () => {
      dialog.show();
      expect(dialog.overlay.style.display).toBe('flex');
    });

    it('should set isOpen to true', () => {
      dialog.show();
      expect(dialog.isOpen).toBe(true);
    });

    it('should emit settingsopen event', () => {
      dialog.show();
      expect(mockPlayer.emit).toHaveBeenCalledWith('settingsopen');
    });

    it('should focus close button', () => {
      const closeButton = dialog.element.querySelector('.vidply-settings-close');
      const focusSpy = vi.spyOn(closeButton, 'focus');
      
      dialog.show();
      
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('hide', () => {
    beforeEach(() => {
      dialog.show();
    });

    it('should hide overlay', () => {
      dialog.hide();
      expect(dialog.overlay.style.display).toBe('none');
    });

    it('should set isOpen to false', () => {
      dialog.hide();
      expect(dialog.isOpen).toBe(false);
    });

    it('should emit settingsclose event', () => {
      dialog.hide();
      expect(mockPlayer.emit).toHaveBeenCalledWith('settingsclose');
    });

    it('should focus container when no opener was captured', () => {
      // hide() restores focus to the element that opened the dialog.
      // When no opener was tracked (e.g. show() never ran in
      // this test) we fall back to focusing the container.
      const focusSpy = vi.spyOn(container, 'focus');
      dialog._triggerElement = null;
      dialog.hide();
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('overlay click behavior', () => {
    it('should hide when clicking overlay', () => {
      dialog.show();
      
      // Simulate click on overlay itself
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: dialog.overlay });
      dialog.overlay.dispatchEvent(clickEvent);
      
      expect(dialog.isOpen).toBe(false);
    });

    it('should not hide when clicking inside dialog', () => {
      dialog.show();
      
      // Simulate click on dialog element
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: dialog.element });
      dialog.overlay.dispatchEvent(clickEvent);
      
      expect(dialog.isOpen).toBe(true);
    });
  });

  describe('escape key behavior', () => {
    it('should hide on Escape key when open', () => {
      dialog.show();
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);
      
      expect(dialog.isOpen).toBe(false);
    });

    it('should not hide on Escape when closed', () => {
      const hideSpy = vi.spyOn(dialog, 'hide');
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);
      
      expect(hideSpy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove overlay from DOM', () => {
      dialog.destroy();
      expect(container.contains(dialog.overlay)).toBe(false);
    });

    it('should handle overlay not in DOM', () => {
      dialog.overlay.parentNode.removeChild(dialog.overlay);
      expect(() => dialog.destroy()).not.toThrow();
    });
  });

  describe('caption settings conditional rendering', () => {
    it('should not show caption settings when no caption manager', () => {
      mockPlayer.captionManager = null;
      dialog = new SettingsDialog(mockPlayer);
      
      const captionHeading = dialog.element.querySelector('h3');
      expect(captionHeading).toBeNull();
    });

    it('should not show caption settings when no tracks', () => {
      mockPlayer.captionManager = {
        tracks: [],
        getAvailableTracks: vi.fn().mockReturnValue([])
      };
      dialog = new SettingsDialog(mockPlayer);
      
      const captionHeading = dialog.element.querySelector('h3');
      expect(captionHeading).toBeNull();
    });

    it('should show caption settings when tracks exist', () => {
      mockPlayer.captionManager = {
        tracks: [{ index: 0 }],
        getAvailableTracks: vi.fn().mockReturnValue([{ index: 0, label: 'English' }]),
        setCaptionStyle: vi.fn()
      };
      dialog = new SettingsDialog(mockPlayer);
      
      const captionHeading = dialog.element.querySelector('h3');
      expect(captionHeading).not.toBeNull();
    });
  });
});
