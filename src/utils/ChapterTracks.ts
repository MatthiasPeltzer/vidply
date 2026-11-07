/**
 * Chapter track selection shared by the chapters menu and the context menu.
 */

import { i18n } from '../i18n/i18n.js';

const CUE_LOAD_TIMEOUT = 2000;

function primaryLanguage(lang: string | null | undefined): string {
  return (lang ?? '').toLowerCase().split(/[-_]/)[0] ?? '';
}

/**
 * The chapters track for the current player language, falling back to an
 * already active chapters track and then to the first one.
 */
export function getChapterTrack(element: HTMLMediaElement): TextTrack | null {
  const tracks = (Array.from(element.textTracks) as TextTrack[]).filter(
    (track) => track.kind === 'chapters'
  );
  if (tracks.length === 0) return null;
  const language = primaryLanguage(i18n.getLanguage());
  return (
    tracks.find((track) => primaryLanguage(track.language) === language) ??
    tracks.find((track) => track.mode !== 'disabled') ??
    tracks[0] ??
    null
  );
}

/** Enable the track (hidden) and resolve once its cues are available. */
export function loadTrackCues(
  track: TextTrack,
  element: HTMLMediaElement,
  timeout = CUE_LOAD_TIMEOUT
): Promise<TextTrack> {
  if (track.mode === 'disabled') {
    track.mode = 'hidden';
  }
  if (track.cues && track.cues.length > 0) return Promise.resolve(track);

  const trackElement = (Array.from(element.querySelectorAll('track')) as HTMLTrackElement[]).find(
    (el) => el.track === track
  );
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      trackElement?.removeEventListener('load', finish);
      trackElement?.removeEventListener('error', finish);
      resolve(track);
    };
    const timer = setTimeout(finish, timeout);
    trackElement?.addEventListener('load', finish);
    trackElement?.addEventListener('error', finish);
  });
}
