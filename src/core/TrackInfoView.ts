/**
 * Renders the track metadata header above the media element (title, artist,
 * short description, and an optional collapsible long description).
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { setSanitizedRichText } from '../utils/RichText.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { TimeUtils } from '../utils/TimeUtils.js';

export interface TrackInfoData {
  title?: string;
  artist?: string;
  description?: string;
  /** Host-supplied RTE HTML; sanitised before render. */
  longDescription?: string;
  /** Preformatted, already localised publish date. */
  date?: string;
  /** Duration in seconds (playlists only; standalone players omit this). */
  duration?: number;
  trackNumber?: number;
  totalTracks?: number;
}

export class TrackInfoView {
  readonly element: HTMLElement;
  private readonly classPrefix: string;
  private readonly titleElementId: string;
  private readonly longDescPanelId: string;
  private readonly handleClick: (event: Event) => void;
  private static instanceCounter = 0;

  constructor(classPrefix = 'vidply') {
    TrackInfoView.instanceCounter += 1;
    this.classPrefix = classPrefix;
    this.titleElementId = `${classPrefix}-track-info-title-${TrackInfoView.instanceCounter}`;
    this.longDescPanelId = `${classPrefix}-track-longdesc-panel-${TrackInfoView.instanceCounter}`;
    this.element = DOMUtils.createElement('div', {
      className: `${classPrefix}-track-info`,
      attributes: {
        role: 'region',
        'aria-labelledby': this.titleElementId
      }
    });
    this.element.style.display = 'none';

    this.handleClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const toggle = target.closest(`.${this.classPrefix}-track-longdesc-toggle`);
      if (!(toggle instanceof HTMLButtonElement) || !this.element.contains(toggle)) {
        return;
      }
      this.toggleLongDescription(toggle);
    };
    this.element.addEventListener('click', this.handleClick);
  }

  mount(container: HTMLElement, before?: Node | null): void {
    if (before) {
      container.insertBefore(this.element, before);
    } else {
      container.appendChild(this.element);
    }
  }

  render(data: TrackInfoData): void {
    const hasContent = this.hasVisibleContent(data);
    if (!hasContent) {
      this.hide();
      return;
    }

    const prefix = this.classPrefix;
    const trackTitle = (data.title ?? '').trim() || i18n.t('playlist.untitled');
    const trackArtist = (data.artist ?? '').trim();
    const trackDescription = (data.description ?? '').trim();
    const trackDate = (data.date ?? '').trim();
    const longDescription = (data.longDescription ?? '').trim();

    const trackNumber = data.trackNumber ?? 0;
    const totalTracks = data.totalTracks ?? 0;
    const showTrackHeader = totalTracks > 1 && trackNumber > 0;
    const isPlaylistContext = totalTracks > 1;

    const effectiveDuration = isPlaylistContext
      && typeof data.duration === 'number'
      && data.duration > 0
      ? data.duration
      : 0;
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : '';
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : '';

    const artistPart = trackArtist ? i18n.t('playlist.by') + trackArtist : '';
    const datePart = trackDate ? `. ${trackDate}` : '';
    const durationPart = trackDurationReadable ? `. ${trackDurationReadable}` : '';

    let playlistAnnouncement = trackTitle + artistPart + datePart + durationPart;
    if (showTrackHeader) {
      playlistAnnouncement = i18n.t('playlist.nowPlaying', {
        current: trackNumber,
        total: totalTracks,
        title: trackTitle,
        artist: artistPart
      }) + datePart + durationPart;
    }

    this.element.replaceChildren();

    if (isPlaylistContext) {
      this.element.appendChild(DOMUtils.createElement('span', {
        className: `${prefix}-sr-only`,
        attributes: { 'aria-live': 'polite' },
        textContent: playlistAnnouncement
      }));
    }

    if (showTrackHeader) {
      const header = DOMUtils.createElement('div', {
        className: `${prefix}-track-header`
      });
      header.appendChild(DOMUtils.createElement('span', {
        className: `${prefix}-track-number`,
        textContent: i18n.t('playlist.trackOf', { current: trackNumber, total: totalTracks })
      }));
      if (trackDuration) {
        header.appendChild(DOMUtils.createElement('span', {
          className: `${prefix}-track-duration`,
          textContent: trackDuration
        }));
      }
      this.element.appendChild(header);
    }

    this.element.appendChild(DOMUtils.createElement('p', {
      className: `${prefix}-track-title`,
      attributes: { id: this.titleElementId },
      textContent: trackTitle
    }));

    if (trackArtist) {
      this.element.appendChild(DOMUtils.createElement('p', {
        className: `${prefix}-track-artist`,
        textContent: trackArtist
      }));
    }

    if (trackDate) {
      this.element.appendChild(DOMUtils.createElement('p', {
        className: `${prefix}-track-date`,
        textContent: trackDate
      }));
    }

    if (trackDescription) {
      this.element.appendChild(DOMUtils.createElement('p', {
        className: `${prefix}-track-description`,
        textContent: trackDescription
      }));
    }

    if (longDescription) {
      const showLabel = i18n.t('trackInfo.descriptionShow');
      const toggle = DOMUtils.createElement('button', {
        className: `${prefix}-track-longdesc-toggle`,
        attributes: {
          type: 'button',
          'aria-expanded': 'false',
          'aria-controls': this.longDescPanelId,
          'aria-label': trackTitle ? `${showLabel}: ${trackTitle}` : showLabel
        },
        children: [
          createIconElement('chevronDown', `${prefix}-track-longdesc-toggle-icon`),
          DOMUtils.createElement('span', {
            className: `${prefix}-track-longdesc-toggle-text`,
            textContent: showLabel
          })
        ]
      });
      toggle.dataset.labelShow = showLabel;
      toggle.dataset.labelHide = i18n.t('trackInfo.descriptionHide');
      toggle.dataset.trackTitle = trackTitle;

      const actions = DOMUtils.createElement('div', {
        className: `${prefix}-track-actions`
      });
      actions.appendChild(toggle);
      this.element.appendChild(actions);

      const panel = DOMUtils.createElement('div', {
        className: `${prefix}-track-longdesc`,
        attributes: {
          id: this.longDescPanelId,
          hidden: ''
        }
      });
      setSanitizedRichText(panel, longDescription);
      this.element.appendChild(panel);
    }

    this.element.style.display = 'block';
  }

  hide(): void {
    this.element.replaceChildren();
    this.element.style.display = 'none';
  }

  destroy(): void {
    this.element.removeEventListener('click', this.handleClick);
    this.element.remove();
  }

  private hasVisibleContent(data: TrackInfoData): boolean {
    const isPlaylistContext = (data.totalTracks ?? 0) > 1;

    return Boolean(
      (data.title ?? '').trim()
      || (data.artist ?? '').trim()
      || (data.description ?? '').trim()
      || (data.longDescription ?? '').trim()
      || (data.date ?? '').trim()
      || (isPlaylistContext && typeof data.duration === 'number' && data.duration > 0)
      || (isPlaylistContext && (data.trackNumber ?? 0) > 0)
    );
  }

  private toggleLongDescription(button: HTMLButtonElement): void {
    const panel = button.closest(`.${this.classPrefix}-track-info`)
      ?.querySelector(`#${CSS.escape(this.longDescPanelId)}`);
    if (!(panel instanceof HTMLElement)) return;

    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    panel.toggleAttribute('hidden', !expanded);

    const label = expanded
      ? button.dataset.labelHide ?? i18n.t('trackInfo.descriptionHide')
      : button.dataset.labelShow ?? i18n.t('trackInfo.descriptionShow');
    const text = button.querySelector(`.${this.classPrefix}-track-longdesc-toggle-text`);
    if (text instanceof HTMLElement) {
      text.textContent = label;
    }

    const title = button.dataset.trackTitle ?? '';
    button.setAttribute('aria-label', title ? `${label}: ${title}` : label);

    const icon = button.querySelector(`.${this.classPrefix}-track-longdesc-toggle-icon`);
    const newIcon = createIconElement(
      expanded ? 'chevronUp' : 'chevronDown',
      `${this.classPrefix}-track-longdesc-toggle-icon`
    );
    if (icon instanceof HTMLElement) {
      icon.replaceWith(newIcon);
    } else {
      button.insertBefore(newIcon, button.firstChild);
    }
  }
}
