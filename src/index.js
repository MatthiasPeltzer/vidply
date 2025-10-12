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

