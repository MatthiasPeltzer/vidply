/**
 * VidPly - Universal Video Player
 * Main Entry Point
 */
import { Player } from './core/Player.js';
import { PlaylistManager } from './features/PlaylistManager.js';
export type { LazyHandle } from './core/LazyInit.js';
export { Player, PlaylistManager };
export type { PlayerOptions } from './types/options.js';
export type { PlayerEventMap, PlaylistTrack, FloatingChangeDetail } from './types/events.js';
export type { PlayerState } from './types/state.js';
export type { Renderer, QualityLevel } from './types/renderer.js';
export default Player;
//# sourceMappingURL=index.d.ts.map