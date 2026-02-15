/**
 * VidPly - Universal Video Player
 * Main Entry Point
 */

import { Player } from './core/Player.js';
import { PlaylistManager } from './features/PlaylistManager.js';

// Map to track pending lazy-initialized players
const pendingPlayers = new Map();

// Auto-initialize players
function initializePlayers() {
  const elements = document.querySelectorAll('[data-vidply]');
  
  elements.forEach(element => {
    // Parse options from data attribute (JSON format)
    const options = element.dataset.vidplyOptions 
      ? JSON.parse(element.dataset.vidplyOptions)
      : {};
    
    // Parse individual data attributes and merge with options
    // This allows for easier HTML-based configuration
    const dataOptions = parseDataAttributes(element.dataset);
    const mergedOptions = { ...dataOptions, ...options };
    
    // Check for lazy initialization settings
    // Default to true for auto-init, can be disabled with data-vidply-lazy="false"
    const lazyInit = element.dataset.vidplyLazy !== 'false' && mergedOptions.lazyInit !== false;
    const lazyMargin = element.dataset.vidplyLazyMargin || mergedOptions.lazyMargin || '500px';
    
    // Use IntersectionObserver for lazy loading if supported and enabled
    if (lazyInit && 'IntersectionObserver' in window) {
      observeForLazyInit(element, mergedOptions, lazyMargin);
    } else {
      // Immediate initialization
      new Player(element, mergedOptions);
    }
  });
}

/**
 * Set up IntersectionObserver to lazily initialize a player when visible
 * @param {HTMLElement} element - The video element to observe
 * @param {Object} options - Player options
 * @param {string} margin - Root margin for IntersectionObserver
 */
function observeForLazyInit(element, options, margin) {
  // Check if element has very small dimensions - CSS may not have loaded yet
  // In this case, initialize immediately as IntersectionObserver won't work reliably
  const rect = element.getBoundingClientRect();
  if (rect.height < 20) {
    new Player(element, options);
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stop observing once triggered
        observer.unobserve(entry.target);
        
        // Remove from pending map
        pendingPlayers.delete(entry.target);
        
        // Initialize the player
        new Player(entry.target, options);
      }
    });
  }, {
    rootMargin: margin,
    threshold: 0
  });
  
  observer.observe(element);
  
  // Store for potential cleanup
  pendingPlayers.set(element, { observer, options });
}

/**
 * Cancel lazy initialization for an element
 * @param {HTMLElement} element - The element to cancel lazy init for
 */
function cancelLazyInit(element) {
  const pending = pendingPlayers.get(element);
  if (pending) {
    pending.observer.unobserve(element);
    pendingPlayers.delete(element);
  }
}

/**
 * Manually trigger lazy observation for an element
 * Useful for programmatic setup outside of auto-initialization
 * @param {string|HTMLElement} selector - Element or selector
 * @param {Object} options - Player options
 * @param {string} margin - Root margin (default: '200px')
 * @returns {Object|null} Reference to cancel lazy init, or null if immediate init
 */
Player.observeLazy = function(selector, options = {}, margin = '200px') {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
  
  if (!element) {
    console.warn('VidPly: Element not found for lazy observation');
    return null;
  }
  
  if ('IntersectionObserver' in window) {
    observeForLazyInit(element, options, margin);
    return {
      cancel: () => cancelLazyInit(element)
    };
  } else {
    // Fallback to immediate initialization
    new Player(element, options);
    return null;
  }
};

// Helper function to parse data attributes into options
function parseDataAttributes(dataset) {
  const options = {};
  
  // Map of data attribute names to option keys (camelCase conversion)
  const attributeMap = {
    // Sign Language
    'signLanguageSrc': 'signLanguageSrc',
    'signLanguageButton': 'signLanguageButton',
    'signLanguagePosition': 'signLanguagePosition',
    'signLanguageDisplayMode': 'signLanguageDisplayMode',
    
    // Audio Description
    'audioDescriptionSrc': 'audioDescriptionSrc',
    'audioDescriptionButton': 'audioDescriptionButton',
    
    // Other common options
    'autoplay': 'autoplay',
    'loop': 'loop',
    'muted': 'muted',
    'controls': 'controls',
    'poster': 'poster',
    'width': 'width',
    'height': 'height',
    'language': 'language',
    'captions': 'captions',
    'captionsDefault': 'captionsDefault',
    'transcript': 'transcript',
    'transcriptButton': 'transcriptButton',
    'keyboard': 'keyboard',
    'responsive': 'responsive',
    'pipButton': 'pipButton',
    'fullscreenButton': 'fullscreenButton',

    // Layout
    
    // Lazy Loading
    'lazyInit': 'lazyInit',
    'lazyMargin': 'lazyMargin',
    
    // Theming
    'theme': 'theme'
  };
  
  // Parse each data attribute
  Object.keys(attributeMap).forEach(dataKey => {
    const optionKey = attributeMap[dataKey];
    const value = dataset[dataKey];
    
    if (value !== undefined) {
      // Convert string values to appropriate types
      if (value === 'true') {
        options[optionKey] = true;
      } else if (value === 'false') {
        options[optionKey] = false;
      } else if (!isNaN(value) && value !== '') {
        options[optionKey] = Number(value);
      } else {
        options[optionKey] = value;
      }
    }
  });
  
  // Parse sign language sources with language codes (e.g., data-sign-language-src-en, data-sign-language-src-de)
  // In dataset, hyphens become camelCase: data-sign-language-src-en -> signLanguageSrcEn
  const signLanguageSources = {};
  Object.keys(dataset).forEach(key => {
    if (key.startsWith('signLanguageSrc') && key !== 'signLanguageSrc') {
      // Extract language code from key (e.g., 'signLanguageSrcEn' -> 'en', 'signLanguageSrcDe' -> 'de')
      // Handle both single and multi-word language codes
      const langMatch = key.match(/^signLanguageSrc([A-Z][a-z]*)$/);
      if (langMatch) {
        const langCode = langMatch[1].toLowerCase();
        signLanguageSources[langCode] = dataset[key];
      }
    }
  });
  
  if (Object.keys(signLanguageSources).length > 0) {
    options.signLanguageSources = signLanguageSources;
    // If there's also a single signLanguageSrc, use it as default/fallback
    if (dataset.signLanguageSrc && !options.signLanguageSrc) {
      options.signLanguageSrc = dataset.signLanguageSrc;
    }
  }
  
  // Handle language file attributes
  // Support for multiple language files: data-vidply-language-files='{"pt": "path/to/pt.json", "it": "path/to/it.json"}'
  if (dataset.vidplyLanguageFiles) {
    try {
      options.languageFiles = JSON.parse(dataset.vidplyLanguageFiles);
    } catch (e) {
      console.warn('Invalid JSON in data-vidply-language-files:', e);
    }
  }
  
  // Support for single language file: data-vidply-language-file='{"pt": "path/to/pt.json"}'
  // or data-vidply-language-file-code="pt" + data-vidply-language-file-url="path/to/pt.json"
  if (dataset.vidplyLanguageFile) {
    try {
      const parsed = JSON.parse(dataset.vidplyLanguageFile);
      // If it's an object, treat it as languageFiles
      if (typeof parsed === 'object' && parsed !== null) {
        options.languageFiles = parsed;
      }
    } catch (e) {
      // If parsing fails, check for separate code and URL attributes
      if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
        options.languageFile = dataset.vidplyLanguageFileCode;
        options.languageFileUrl = dataset.vidplyLanguageFileUrl;
      }
    }
  } else if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
    // Support separate attributes for single language file
    options.languageFile = dataset.vidplyLanguageFileCode;
    options.languageFileUrl = dataset.vidplyLanguageFileUrl;
  }
  
  return options;
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePlayers);
} else {
  initializePlayers();
}

// Export for manual initialization
export { Player, PlaylistManager };
export default Player;

