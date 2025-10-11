/**
 * Settings Dialog Component
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';

export class SettingsDialog {
  constructor(player) {
    this.player = player;
    this.element = null;
    this.isOpen = false;
    
    this.init();
  }

  init() {
    this.createElement();
  }

  createElement() {
    // Create overlay
    this.overlay = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-overlay`,
      attributes: {
        'role': 'dialog',
        'aria-modal': 'true',
        'aria-label': i18n.t('settings.title')
      }
    });

    this.overlay.style.display = 'none';

    // Create dialog
    this.element = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-dialog`
    });

    // Header
    const header = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-header`
    });

    const title = DOMUtils.createElement('h2', {
      textContent: i18n.t('settings.title'),
      attributes: {
        'id': `${this.player.options.classPrefix}-settings-title`
      }
    });

    const closeButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-button ${this.player.options.classPrefix}-settings-close`,
      attributes: {
        'type': 'button',
        'aria-label': i18n.t('settings.close')
      }
    });
    closeButton.appendChild(createIconElement('close'));
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);

    // Content
    const content = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-content`
    });

    content.appendChild(this.createSpeedSettings());
    
    if (this.player.captionManager && this.player.captionManager.tracks.length > 0) {
      content.appendChild(this.createCaptionSettings());
    }

    // Footer
    const footer = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-footer`
    });

    const resetButton = DOMUtils.createElement('button', {
      className: `${this.player.options.classPrefix}-button`,
      textContent: i18n.t('settings.reset'),
      attributes: {
        'type': 'button'
      }
    });
    resetButton.addEventListener('click', () => this.resetSettings());

    footer.appendChild(resetButton);

    // Assemble dialog
    this.element.appendChild(header);
    this.element.appendChild(content);
    this.element.appendChild(footer);

    this.overlay.appendChild(this.element);
    this.player.container.appendChild(this.overlay);

    // Attach events
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    });
  }

  formatSpeedLabel(speed) {
    // Special case: 1x is "Normal" (translated)
    if (speed === 1) {
      return i18n.t('speeds.normal');
    }
    
    // For other speeds, format with locale-specific decimal separator
    const speedStr = speed.toLocaleString(i18n.getLanguage(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    return `${speedStr}×`;
  }

  createSpeedSettings() {
    const section = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-section`
    });

    const label = DOMUtils.createElement('label', {
      textContent: i18n.t('settings.speed'),
      attributes: {
        'for': `${this.player.options.classPrefix}-speed-select`
      }
    });

    const select = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-settings-select`,
      attributes: {
        'id': `${this.player.options.classPrefix}-speed-select`
      }
    });

    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    
    speeds.forEach(speed => {
      const option = DOMUtils.createElement('option', {
        textContent: this.formatSpeedLabel(speed),
        attributes: {
          'value': String(speed)
        }
      });
      
      if (speed === this.player.state.playbackSpeed) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.player.setPlaybackSpeed(parseFloat(e.target.value));
    });

    section.appendChild(label);
    section.appendChild(select);

    return section;
  }

  createCaptionSettings() {
    const section = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-section`
    });

    const heading = DOMUtils.createElement('h3', {
      textContent: i18n.t('settings.captions')
    });

    section.appendChild(heading);

    // Caption track selection
    const trackLabel = DOMUtils.createElement('label', {
      textContent: i18n.t('captions.select'),
      attributes: {
        'for': `${this.player.options.classPrefix}-caption-track-select`
      }
    });

    const trackSelect = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-settings-select`,
      attributes: {
        'id': `${this.player.options.classPrefix}-caption-track-select`
      }
    });

    // Off option
    const offOption = DOMUtils.createElement('option', {
      textContent: i18n.t('captions.off'),
      attributes: { 'value': '-1' }
    });
    trackSelect.appendChild(offOption);

    // Available tracks
    const tracks = this.player.captionManager.getAvailableTracks();
    tracks.forEach(track => {
      const option = DOMUtils.createElement('option', {
        textContent: track.label,
        attributes: { 'value': String(track.index) }
      });
      trackSelect.appendChild(option);
    });

    trackSelect.addEventListener('change', (e) => {
      const index = parseInt(e.target.value);
      if (index === -1) {
        this.player.disableCaptions();
      } else {
        this.player.captionManager.switchTrack(index);
      }
    });

    section.appendChild(trackLabel);
    section.appendChild(trackSelect);

    // Font size
    section.appendChild(this.createCaptionStyleControl('fontSize', i18n.t('captions.fontSize'), [
      { label: i18n.t('fontSizes.small'), value: '80%' },
      { label: i18n.t('fontSizes.medium'), value: '100%' },
      { label: i18n.t('fontSizes.large'), value: '120%' },
      { label: i18n.t('fontSizes.xlarge'), value: '150%' }
    ]));

    // Font family
    section.appendChild(this.createCaptionStyleControl('fontFamily', i18n.t('captions.fontFamily'), [
      { label: i18n.t('fontFamilies.sansSerif'), value: 'sans-serif' },
      { label: i18n.t('fontFamilies.serif'), value: 'serif' },
      { label: i18n.t('fontFamilies.monospace'), value: 'monospace' }
    ]));

    // Color controls
    section.appendChild(this.createColorControl('color', i18n.t('captions.color')));
    section.appendChild(this.createColorControl('backgroundColor', i18n.t('captions.backgroundColor')));

    // Opacity
    section.appendChild(this.createRangeControl('opacity', i18n.t('captions.opacity'), 0, 1, 0.1));

    return section;
  }

  createCaptionStyleControl(property, label, options) {
    const wrapper = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-control`
    });

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': `${this.player.options.classPrefix}-caption-${property}`
      }
    });

    const select = DOMUtils.createElement('select', {
      className: `${this.player.options.classPrefix}-settings-select`,
      attributes: {
        'id': `${this.player.options.classPrefix}-caption-${property}`
      }
    });

    options.forEach(opt => {
      const option = DOMUtils.createElement('option', {
        textContent: opt.label,
        attributes: { 'value': opt.value }
      });
      
      if (opt.value === this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`]) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      this.player.captionManager.setCaptionStyle(property, e.target.value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);

    return wrapper;
  }

  createColorControl(property, label) {
    const wrapper = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-control`
    });

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': `${this.player.options.classPrefix}-caption-${property}`
      }
    });

    const input = DOMUtils.createElement('input', {
      className: `${this.player.options.classPrefix}-settings-color`,
      attributes: {
        'type': 'color',
        'id': `${this.player.options.classPrefix}-caption-${property}`,
        'value': this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`]
      }
    });

    input.addEventListener('change', (e) => {
      this.player.captionManager.setCaptionStyle(property, e.target.value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);

    return wrapper;
  }

  createRangeControl(property, label, min, max, step) {
    const wrapper = DOMUtils.createElement('div', {
      className: `${this.player.options.classPrefix}-settings-control`
    });

    const labelEl = DOMUtils.createElement('label', {
      textContent: label,
      attributes: {
        'for': `${this.player.options.classPrefix}-caption-${property}`
      }
    });

    const input = DOMUtils.createElement('input', {
      className: `${this.player.options.classPrefix}-settings-range`,
      attributes: {
        'type': 'range',
        'id': `${this.player.options.classPrefix}-caption-${property}`,
        'min': String(min),
        'max': String(max),
        'step': String(step),
        'value': String(this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`])
      }
    });

    const valueDisplay = DOMUtils.createElement('span', {
      className: `${this.player.options.classPrefix}-settings-value`,
      textContent: String(this.player.options[`captions${property.charAt(0).toUpperCase() + property.slice(1)}`])
    });

    input.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = value.toFixed(1);
      this.player.captionManager.setCaptionStyle(property, value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    wrapper.appendChild(valueDisplay);

    return wrapper;
  }

  resetSettings() {
    // Reset to default values
    this.player.setPlaybackSpeed(1);
    
    if (this.player.captionManager) {
      this.player.captionManager.setCaptionStyle('fontSize', '100%');
      this.player.captionManager.setCaptionStyle('fontFamily', 'sans-serif');
      this.player.captionManager.setCaptionStyle('color', '#FFFFFF');
      this.player.captionManager.setCaptionStyle('backgroundColor', '#000000');
      this.player.captionManager.setCaptionStyle('opacity', 0.8);
    }

    // Refresh dialog
    this.hide();
    setTimeout(() => this.show(), 100);
  }

  show() {
    this.overlay.style.display = 'flex';
    this.isOpen = true;
    
    // Focus the close button
    const closeButton = this.element.querySelector(`.${this.player.options.classPrefix}-settings-close`);
    if (closeButton) {
      closeButton.focus();
    }
    
    this.player.emit('settingsopen');
  }

  hide() {
    this.overlay.style.display = 'none';
    this.isOpen = false;
    
    // Return focus to settings button
    this.player.container.focus();
    
    this.player.emit('settingsclose');
  }

  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

