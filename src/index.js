/**
 * VidPly - Universal Video Player
 * Main Entry Point
 */

import { Player } from './core/Player.js';
import { PlaylistManager } from './features/PlaylistManager.js';

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
    
    // Create player instance
    new Player(element, mergedOptions);
  });
}

// Helper function to parse data attributes into options
function parseDataAttributes(dataset) {
  const options = {};
  
  // Map of data attribute names to option keys (camelCase conversion)
  const attributeMap = {
    // Sign Language
    'signLanguageSrc': 'signLanguageSrc',
    'signLanguageButton': 'signLanguageButton',
    'signLanguagePosition': 'signLanguagePosition',
    
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
    'fullscreenButton': 'fullscreenButton'
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

