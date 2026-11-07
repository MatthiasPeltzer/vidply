/**
 * Context menu entries
 *
 * Builds the list of actions the VidPly context menu offers for the player's
 * current state. The list is rebuilt every time the menu opens, so it only
 * contains what works right now (captions, chapters, quality levels, live
 * controls and playlist buttons all change after metadata loads).
 */

import { i18n } from '../i18n/i18n.js';
import { PLAYBACK_SPEEDS } from '../constants/playbackSpeeds.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { ariaShortcutKey, formatShortcutKey } from '../utils/ShortcutKeys.js';
import { getChapterTrack, loadTrackCues } from '../utils/ChapterTracks.js';
import type { Player } from '../core/Player.js';
import type { KeyboardShortcuts } from '../types/options.js';
import type { QualityLevel } from '../types/renderer.js';

export type ContextMenuEntryType = 'action' | 'checkbox' | 'radio' | 'submenu' | 'separator';

export interface ContextMenuEntry {
  id: string;
  type: ContextMenuEntryType;
  label?: string;
  /** BCP 47 language of the label (caption track names). */
  lang?: string;
  checked?: boolean;
  /** Non-operable placeholder (empty submenu). */
  disabled?: boolean;
  /** Visible shortcut hint, e.g. "Space" or "M". */
  shortcut?: string;
  /** Value for `aria-keyshortcuts`. */
  ariaShortcut?: string;
  /** Submenu entries; may load lazily (embed caption tracks). */
  children?: () => ContextMenuEntry[] | Promise<ContextMenuEntry[]>;
  /** Shown as a disabled item when `children` resolves to nothing. */
  emptyLabel?: string;
  run?: () => void;
}

const DIALOG_SUFFIX = '\u2026';

const separator = (id: string): ContextMenuEntry => ({ id, type: 'separator' });

/**
 * Whether a control-bar button is offered right now. Besides
 * `ControlBar.hasControl()` (connected, no `hidden` attribute) this also
 * honours buttons hidden with `display: none` for missing features, while
 * still counting buttons that only collapsed into the overflow menu.
 */
export function isControlAvailable(player: Player, name: string): boolean {
  const controlBar = player.controlBar;
  if (!controlBar?.hasControl(name)) return false;
  const control = controlBar.controls[name];
  if (!control) return false;
  if ((control as HTMLButtonElement).disabled) return false;
  if (control.dataset.inOverflow === 'true') return true;
  return getComputedStyle(control).display !== 'none';
}

function shortcutFor(
  player: Player,
  action: keyof KeyboardShortcuts
): Pick<ContextMenuEntry, 'shortcut' | 'ariaShortcut'> {
  if (!player.options.keyboard) return {};
  const key = player.options.keyboardShortcuts?.[action]?.[0];
  if (!key) return {};
  return { shortcut: formatShortcutKey(key), ariaShortcut: ariaShortcutKey(key) };
}

function isPressed(control: HTMLElement | undefined): boolean {
  if (!control) return false;
  return ['aria-pressed', 'aria-checked', 'aria-expanded'].some(
    (attr) => control.getAttribute(attr) === 'true'
  );
}

/** Entry that clicks the matching control-bar button. */
function barEntry(
  player: Player,
  name: string,
  options: { type?: 'action' | 'checkbox'; label?: string; checked?: boolean } = {}
): ContextMenuEntry | null {
  const controlBar = player.controlBar;
  const control = controlBar?.controls[name];
  if (!controlBar || !control || !isControlAvailable(player, name)) return null;
  const type = options.type ?? 'action';
  return {
    id: name,
    type,
    label: options.label ?? control.getAttribute('aria-label') ?? '',
    checked: type === 'checkbox' ? (options.checked ?? isPressed(control)) : undefined,
    run: () => controlBar.activateControl(control)
  };
}

function captionEntries(player: Player): ContextMenuEntry[] {
  const manager = player.captionManager;
  if (!manager) return [];
  const enabled = Boolean(player.state.captionsEnabled);
  const refreshButton = () => player.controlBar?.updateCaptionsButton();
  return [
    {
      id: 'captions-off',
      type: 'radio',
      label: i18n.t('captions.off'),
      checked: !enabled,
      run: () => {
        player.disableCaptions();
        refreshButton();
      }
    },
    ...manager.getAvailableTracks().map((track): ContextMenuEntry => ({
      id: `captions-${track.index}`,
      type: 'radio',
      label: track.label,
      lang: track.language || undefined,
      checked: enabled && manager.currentTrack === manager.tracks[track.index],
      run: () => {
        manager.switchTrack(track.index);
        refreshButton();
      }
    }))
  ];
}

async function loadCaptionEntries(player: Player): Promise<ContextMenuEntry[]> {
  const manager = player.captionManager;
  if (manager && manager.tracks.length === 0 && player.controlBar?.hasEmbedCaptionBridge()) {
    await manager.refreshTracks();
  }
  return captionEntries(player);
}

async function chapterEntries(player: Player): Promise<ContextMenuEntry[]> {
  const chapterTrack = getChapterTrack(player.element);
  if (!chapterTrack) return [];
  const track = await loadTrackCues(chapterTrack, player.element);
  const cues = track.cues ? (Array.from(track.cues) as VTTCue[]) : [];
  const now = player.state.currentTime;
  return cues.map((cue, index) => ({
    id: `chapter-${index}`,
    type: 'radio',
    label: `${TimeUtils.formatTime(cue.startTime)}  ${cue.text}`,
    checked: now >= cue.startTime && now < cue.endTime,
    run: () => player.seek(cue.startTime)
  }));
}

const CAPTION_COLORS: ReadonlyArray<readonly [string, string]> = [
  ['white', '#FFFFFF'],
  ['yellow', '#FFFF00'],
  ['green', '#00FF00'],
  ['cyan', '#00FFFF'],
  ['blue', '#0000FF'],
  ['magenta', '#FF00FF'],
  ['red', '#FF0000'],
  ['black', '#000000']
];

const CAPTION_OPACITIES: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

type CaptionStyleProperty = 'fontSize' | 'fontFamily' | 'color' | 'backgroundColor' | 'opacity';

function setCaptionStyle(
  player: Player,
  property: CaptionStyleProperty,
  value: string | number
): void {
  if (player.captionManager) {
    player.captionManager.setCaptionStyle(property, value);
    return;
  }
  const key = `captions${property.charAt(0).toUpperCase()}${property.slice(1)}`;
  (player.options as unknown as Record<string, unknown>)[key] = value;
}

function styleRadios(
  player: Player,
  property: CaptionStyleProperty,
  current: string | number | undefined,
  choices: Array<{ label: string; value: string | number }>
): ContextMenuEntry[] {
  const same = (a: string | number | undefined, b: string | number) =>
    typeof b === 'string' ? String(a ?? '').toLowerCase() === b.toLowerCase() : Number(a) === b;
  return choices.map((choice) => ({
    id: `caption-${property}-${choice.value}`,
    type: 'radio',
    label: choice.label,
    checked: same(current, choice.value),
    run: () => setCaptionStyle(player, property, choice.value)
  }));
}

function colorChoices(): Array<{ label: string; value: string }> {
  return CAPTION_COLORS.map(([name, value]) => ({
    label: i18n.t(`contextMenu.colors.${name}`),
    value
  }));
}

function captionStyleEntries(player: Player): ContextMenuEntry[] {
  const options = player.options;
  const opacity = Number(options.captionsOpacity);
  const opacities = CAPTION_OPACITIES.includes(opacity)
    ? CAPTION_OPACITIES
    : [...CAPTION_OPACITIES, opacity].sort((a, b) => a - b);
  const submenu = (
    id: string,
    label: string,
    children: () => ContextMenuEntry[]
  ): ContextMenuEntry => ({ id, type: 'submenu', label, children });

  return normalizeEntries([
    submenu('caption-font-size', i18n.t('styleLabels.fontSize'), () =>
      styleRadios(player, 'fontSize', options.captionsFontSize, [
        { label: i18n.t('fontSizes.small'), value: '87.5%' },
        { label: i18n.t('fontSizes.normal'), value: '100%' },
        { label: i18n.t('fontSizes.large'), value: '125%' },
        { label: i18n.t('fontSizes.xlarge'), value: '150%' }
      ])
    ),
    submenu('caption-font', i18n.t('styleLabels.font'), () =>
      styleRadios(player, 'fontFamily', options.captionsFontFamily, [
        { label: i18n.t('fontFamilies.sansSerif'), value: 'sans-serif' },
        { label: i18n.t('fontFamilies.serif'), value: 'serif' },
        { label: i18n.t('fontFamilies.monospace'), value: 'monospace' }
      ])
    ),
    submenu('caption-color', i18n.t('styleLabels.textColor'), () =>
      styleRadios(player, 'color', options.captionsColor, colorChoices())
    ),
    submenu('caption-background', i18n.t('styleLabels.background'), () =>
      styleRadios(player, 'backgroundColor', options.captionsBackgroundColor, colorChoices())
    ),
    submenu('caption-opacity', i18n.t('styleLabels.opacity'), () =>
      styleRadios(
        player,
        'opacity',
        opacity,
        opacities.map((value) => ({ label: `${Math.round(value * 100)}%`, value }))
      )
    ),
    separator('sep-caption-style-more'),
    barEntry(player, 'captionStyle', {
      label: `${i18n.t('contextMenu.moreStyleOptions')}${DIALOG_SUFFIX}`
    })
  ]);
}

function speedEntries(player: Player): ContextMenuEntry[] {
  const controlBar = player.controlBar;
  return PLAYBACK_SPEEDS.map((speed) => ({
    id: `speed-${speed}`,
    type: 'radio',
    label: controlBar ? controlBar.formatSpeedLabel(speed) : `${speed}\u00d7`,
    checked: speed === player.state.playbackSpeed,
    run: () => player.setPlaybackSpeed(speed)
  }));
}

function qualityEntries(player: Player): ContextMenuEntry[] {
  const renderer = player.renderer;
  if (!renderer?.getQualities) return [];
  const qualities = renderer.getQualities() ?? [];
  if (qualities.length === 0) return [];
  const auto = renderer.isAutoQuality?.() ?? false;
  const current = renderer.getCurrentQuality?.() ?? -1;
  const entries: ContextMenuEntry[] = [];
  if (renderer.supportsAutoQuality?.()) {
    entries.push({
      id: 'quality-auto',
      type: 'radio',
      label: i18n.t('player.auto'),
      checked: auto,
      run: () => renderer.switchQuality?.(-1)
    });
  }
  (qualities as QualityLevel[]).forEach((quality, position) => {
    const index = quality.index ?? position;
    entries.push({
      id: `quality-${index}`,
      type: 'radio',
      label: quality.name || `${quality.height}p`,
      checked: !auto && index === current,
      run: () => renderer.switchQuality?.(index)
    });
  });
  return entries;
}

/** Drop empty slots and leading, trailing or repeated separators. */
export function normalizeEntries(entries: Array<ContextMenuEntry | null>): ContextMenuEntry[] {
  const result: ContextMenuEntry[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.type === 'separator') {
      if (result.length === 0 || result[result.length - 1]?.type === 'separator') continue;
    }
    result.push(entry);
  }
  while (result.length > 0 && result[result.length - 1]?.type === 'separator') {
    result.pop();
  }
  return result;
}

export function getContextMenuEntries(player: Player): ContextMenuEntry[] {
  const state = player.state;
  const options = player.options;
  const has = (name: string) => isControlAvailable(player, name);

  const chapterTrack = has('chapters') ? getChapterTrack(player.element) : null;
  if (chapterTrack) {
    void loadTrackCues(chapterTrack, player.element);
  }

  const playback: Array<ContextMenuEntry | null> = [
    {
      id: 'play-pause',
      type: 'action',
      label: state.playing ? i18n.t('player.pause') : i18n.t('player.play'),
      ...shortcutFor(player, 'play-pause'),
      run: () => player.toggle()
    },
    barEntry(player, 'restart', { label: i18n.t('player.restart') }),
    has('rewind')
      ? {
          id: 'rewind',
          type: 'action',
          label: i18n.t('player.rewindSeconds', { seconds: Number(options.seekInterval) }),
          ...shortcutFor(player, 'seek-backward'),
          run: () => player.seekBackward()
        }
      : null,
    has('forward')
      ? {
          id: 'forward',
          type: 'action',
          label: i18n.t('player.forwardSeconds', { seconds: Number(options.seekInterval) }),
          ...shortcutFor(player, 'seek-forward'),
          run: () => player.seekForward()
        }
      : null,
    has('goLive')
      ? {
          id: 'go-live',
          type: 'action',
          label: i18n.t('player.goLive'),
          run: () => player.seekToLive()
        }
      : null
  ];

  const tracks: Array<ContextMenuEntry | null> = [
    barEntry(player, 'previous', { label: i18n.t('player.previous') }),
    barEntry(player, 'next', { label: i18n.t('player.next') })
  ];

  const loopSupported =
    !player.playlistManager && !state.isLive && player.renderer?.rendererType !== 'vimeo';
  const audio: Array<ContextMenuEntry | null> = [
    has('mute')
      ? {
          id: 'mute',
          type: 'checkbox',
          label: i18n.t('player.mute'),
          checked: Boolean(state.muted),
          ...shortcutFor(player, 'mute'),
          run: () => player.toggleMute()
        }
      : null,
    loopSupported
      ? {
          id: 'loop',
          type: 'checkbox',
          label: i18n.t('contextMenu.loop'),
          checked: Boolean(options.loop),
          run: () => {
            options.loop = !options.loop;
          }
        }
      : null
  ];

  const text: Array<ContextMenuEntry | null> = [
    has('captions')
      ? {
          id: 'captions',
          type: 'submenu',
          label: i18n.t('player.captions'),
          emptyLabel: i18n.t('player.noCaptions'),
          children: () => loadCaptionEntries(player)
        }
      : null,
    has('captionStyle')
      ? {
          id: 'caption-style',
          type: 'submenu',
          label: i18n.t('player.captionStyling'),
          children: () => captionStyleEntries(player)
        }
      : null,
    has('chapters')
      ? {
          id: 'chapters',
          type: 'submenu',
          label: i18n.t('player.chapters'),
          emptyLabel: i18n.t('player.loadingChapters'),
          children: () => chapterEntries(player)
        }
      : null,
    has('speed')
      ? {
          id: 'speed',
          type: 'submenu',
          label: i18n.t('player.speed'),
          children: () => speedEntries(player)
        }
      : null,
    has('quality') && qualityEntries(player).length > 0
      ? {
          id: 'quality',
          type: 'submenu',
          label: i18n.t('player.quality'),
          children: () => qualityEntries(player)
        }
      : null
  ];

  const accessibility: Array<ContextMenuEntry | null> = [
    barEntry(player, 'transcript', {
      type: 'checkbox',
      label: i18n.t('transcript.title'),
      checked: Boolean(player.transcriptManager?.isVisible)
    }),
    barEntry(player, 'audioDescription', {
      type: 'checkbox',
      label: i18n.t('player.audioDescription'),
      checked: Boolean(state.audioDescriptionEnabled)
    }),
    barEntry(player, 'signLanguage', {
      type: 'checkbox',
      label: i18n.t('player.signLanguage'),
      checked: Boolean(state.signLanguageEnabled)
    }),
    barEntry(player, 'signLanguageMainView', {
      type: 'checkbox',
      label: i18n.t('contextMenu.signLanguageMainView'),
      checked: Boolean(state.signLanguageInMainView)
    }),
    barEntry(player, 'playlistToggle', {
      type: 'checkbox',
      label: i18n.t('playlist.title')
    })
  ];

  const view: Array<ContextMenuEntry | null> = [
    barEntry(player, 'pip', {
      type: 'checkbox',
      label: options.floating ? i18n.t('player.floatingPlayer') : i18n.t('player.pip'),
      checked: options.floating ? state.floating === 'pinned' : Boolean(state.pip)
    }),
    has('fullscreen')
      ? {
          id: 'fullscreen',
          type: 'action',
          label: state.fullscreen ? i18n.t('player.exitFullscreen') : i18n.t('player.fullscreen'),
          ...shortcutFor(player, 'fullscreen'),
          run: () => player.toggleFullscreen()
        }
      : null
  ];

  const links: Array<ContextMenuEntry | null> = [
    barEntry(player, 'download'),
    barEntry(player, 'embedProviderLink')
  ];

  const help: Array<ContextMenuEntry | null> = [
    options.keyboard
      ? {
          id: 'help',
          type: 'action',
          label: `${i18n.t('help.button')}${DIALOG_SUFFIX}`,
          ...shortcutFor(player, 'help'),
          run: () => player.toggleKeyboardHelp()
        }
      : null
  ];

  return normalizeEntries([
    ...playback,
    separator('sep-tracks'),
    ...tracks,
    separator('sep-audio'),
    ...audio,
    separator('sep-text'),
    ...text,
    separator('sep-accessibility'),
    ...accessibility,
    separator('sep-view'),
    ...view,
    separator('sep-links'),
    ...links,
    separator('sep-help'),
    ...help
  ]);
}
