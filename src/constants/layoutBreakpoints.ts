/**
 * Right-panel playlist uses side-by-side layout at this viewport width and above.
 * Below this width the layout stacks (playlist below the player).
 */
export const PLAYLIST_PANEL_RIGHT_DESKTOP_MIN_WIDTH = '75rem';

export const PLAYLIST_PANEL_RIGHT_DESKTOP_MEDIA_QUERY =
  `(width >= ${PLAYLIST_PANEL_RIGHT_DESKTOP_MIN_WIDTH})` as const;

export function isPlaylistPanelRightDesktopViewport(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia(PLAYLIST_PANEL_RIGHT_DESKTOP_MEDIA_QUERY).matches;
}
