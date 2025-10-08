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
    // Parse options from data attribute
    const options = element.dataset.vidplyOptions 
      ? JSON.parse(element.dataset.vidplyOptions)
      : {};
    
    // Create player instance
    new Player(element, options);
  });
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

