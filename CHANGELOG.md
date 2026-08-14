# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.6] - 2026-08-14

### Changed
- `resumePlayback` now defaults to `false`. Resume-from-last-position must be
  enabled explicitly via player options.

### Added
- `TrackInfoView`: the track-info header above the player can show a collapsible
  long description (`longDescription` on tracks / player options) with a
  sanitised RTE body and accessible show/hide toggle.
- New `playButtonOverlay` option (`'auto' | true | false`, default `'auto'`)
  that allows the centered play button on audio players. On audio the
  overlay is rendered as a real, i18n-labelled `<button>` on top of the
  track artwork — an `<audio>` element offers no click surface — and its
  accessible name follows the play/pause state. `'auto'` keeps the
  previous video-only behaviour, `false` disables the overlay entirely.
- `PlaylistTrack.date`: an optional, **preformatted and already localised**
  publish date. It is rendered in the playlist panel rows
  (`.vidply-playlist-item-date`) and in the now-playing track info
  (`.vidply-track-date`), and is included in the row's `aria-label` so it
  is announced together with title and duration. The library renders the
  string verbatim; locale handling stays with the host application.
- Per-track downloads in playlists: `PlaylistTrack.downloadUrl` (plus optional
  `downloadFormat` and `downloadFileSize`) makes the control bar's download
  button follow the selection — it offers the current track's file, relabels
  itself with that file's format and size, and is hidden on tracks that carry
  no `downloadUrl`. A known `downloadFileSize` also skips the HEAD request the
  button would otherwise send. Playlists that set no track-level URL keep
  using the player-wide `downloadUrl` / `data-vidply-download-url` target.

### Fixed
- Mixed-media playlists loaded YouTube, Vimeo, and SoundCloud tracks two or
  three times when selected from the panel. `PlaylistManager.play()` fired
  `player.play()` on a 100 ms timer before `load()` finished; with the
  renderer still null, `Player.play()` re-entered the playlist and started
  duplicate loads. Track changes now await `load()` before playback, and
  `Player.play()` ignores the playlist fallback while a track change is in
  progress.
- `screenReaderAnnouncements: false` no longer had any effect on play/pause,
  volume, mute, caption, fullscreen and speed announcements. Those moved from
  the keyboard handler onto player events so pointer and touch use announces
  too, and the option check stayed behind. It now gates them again.
  `showNotice()` and the sign-language drag/resize hints keep announcing, as
  suppressing them would leave the action they belong to without feedback.
- Every player announced its own volume to screen readers on page load. A
  volume restored from storage is pushed to the renderer after `ready`, so it
  arrived as a `volumechange` the listener could not tell apart from a real
  one; on a page with two players that meant hearing "Volume 53 percent"
  twice before touching anything. The level is now announced only when it
  actually differs from the last announced one, the way the mute state
  already worked.
- The download button in playlists offered the element-level file for every
  track, so a playlist could only ever hand out one download (usually none at
  all, since streaming manifests have no progressive URL).
- The keyboard help and settings dialogs were unreadable on audio players.
  They are positioned inside the player box, which for audio is just the
  control bar, so `max-height: 80%` squeezed them to about 80 pixels. On
  audio players the overlay is now anchored to the viewport (and layout
  containment is dropped there, since it would otherwise keep the fixed
  overlay trapped inside the player).
- Page content could paint over an open dialog. A dialog escapes the player's
  box but not its stacking context, so a host stylesheet that gives the player
  a stacking level of its own — a common way to lift it over page decoration —
  left anything stacked above that level covering the dialog. The player is now
  lifted to the modal level itself (`vidply-modal-open`) while one is open.

## [1.2.5] - 2026-07-23

### Security
- Poster/artwork URLs are now validated and CSS-escaped before being
  written into the `--vidply-poster-image` custom property, so an
  attacker-influenced poster value can no longer break out of the CSS
  `url(...)` context (`PosterManager`, `Player.load`).
- Metadata-cue directives (`PAUSE` / `FOCUS:` / `#hashtags`) are handled
  by a single, container-scoped processor. The duplicate pipeline in the
  transcript layer that resolved `FOCUS:` selectors document-wide has
  been removed, so an untrusted VTT cue can no longer move focus to
  arbitrary elements on the host page (opt in with
  `metadataDirectives: 'global'` for the old document-wide behaviour).
- The default hls.js and dash.js CDN builds now load with a built-in
  Subresource Integrity hash, so the pinned scripts are verified out of
  the box. A custom `hlsScriptUrl`/`dashScriptUrl` still requires its own
  `*ScriptIntegrity` value; the built-in hash is only applied to the
  pinned default URL.
- Placeholder replacement in `i18n.t()` now inserts values literally, so
  `$`-sequences (`$&`, `$1`, `$$`, `` $` ``) in a substituted value can
  no longer be reinterpreted as `String.prototype.replace` patterns.

### Fixed
- Type declarations are now actually emitted to `dist/types` during the
  build (the `types` entry point was previously dangling because
  `tsc` ran with `noEmit`); CI asserts `dist/types/index.d.ts` exists.
- Removed a duplicate metadata `cuechange`/`loadedmetadata` listener
  registration in the transcript layer that accumulated across source
  changes.
- Renderer selection on source changes now uses a stable `rendererType`
  field instead of `constructor.name`, which minifiers mangle in
  production builds — fixing needless renderer re-creation (or missed
  swaps) in minified bundles.
- Recreating the player for a different track type no longer hangs if the
  new player becomes ready before the `ready` listener is attached; the
  wait resolves immediately when already ready and has a safety timeout.
- Playlist deferred callbacks (auto-play, guard-flag resets, live-region
  clears, focus moves) are now tracked and cancelled on `destroy()`, so
  they can no longer fire against a torn-down player.
- The player now tears down the iOS pseudo-fullscreen fallback in
  `destroy()`, restoring body/document scroll lock, background styles,
  viewport meta and inert siblings if destroyed while pseudo-fullscreen.
- Rebuilding the control bar (feature detection / playlist refresh /
  renderer swap) no longer stacks duplicate player-event listeners,
  `ResizeObserver`s or auto-hide DOM handlers — each control rebuild now
  detaches its previous listeners before re-attaching, and `destroy()`
  removes them all.
- On pages with multiple players, opening a menu (volume, chapters,
  quality, speed, captions, caption-style, overflow) no longer closes or
  toggles another player's open menu: the "already open" lookup is scoped
  to the player's own container instead of the whole document.
- The YouTube video-ID parser no longer folds trailing query/hash
  segments into the ID (e.g. `youtu.be/ID?t=60`, `.../embed/ID?autoplay=1`)
  and now also handles `v` appearing as a later query parameter, `/shorts/`
  and legacy `/v/` paths, and `youtube-nocookie.com`.

### Accessibility
- The draggable/resizable single-letter shortcuts (`d`/`r`) are no longer
  hijacked while typing in a form control or contenteditable, or when a
  modifier (Ctrl/Cmd/Alt) is held (e.g. Ctrl+D, Cmd+R).
- The resume ("Where were we?") prompt now traps Tab/Shift+Tab within the
  dialog while it is open and restores focus to the previously focused
  element (falling back to the play button) when it closes, matching its
  `role="dialog"`/`aria-modal` semantics (WCAG 2.4.3).

### Changed
- Source-URL → renderer detection is consolidated into one
  `classifyRendererType()` helper used by both `_detectRendererClass`
  (which renderer to build) and `shouldChangeRenderer` (whether to swap),
  so the two can no longer drift apart; `youtube-nocookie.com` is now
  recognised as a YouTube source.
- The pinned hls.js/dash.js default-URL + Subresource-Integrity resolution
  is centralised in a shared `loadPinnedScript()` loader, keeping the
  "built-in hash only applies to the pinned default URL" rule in one place.
- Light-theme focus rings and accents now reference the `--vidply-primary`
  custom property instead of a repeated hardcoded `#0a406e`, so theming the
  primary colour restyles them consistently.

### Removed
- Deleted the dead `SettingsDialog` component and its unreachable wiring
  (the settings button was never rendered and `showSettings()` had been a
  no-op stub); the public `showSettings()`/`hideSettings()` methods remain
  as deprecation stubs.

### Build
- The `dev` server dependency (`serve`) is now a pinned devDependency and
  run from the local install instead of being fetched at runtime via
  `npx serve`, removing a runtime supply-chain fetch.
- Production (minified) bundles now emit external source maps: the esbuild
  bundle map is chained through Terser so `dist/prod` / `dist/legacy`
  `.min.js` files map back to the original TypeScript for field debugging.
- CI now runs the unit/integration suite with coverage (`test:coverage`)
  so the configured coverage thresholds actually gate builds; thresholds
  were realigned to the current measured coverage as regression floors.

### Tests
- Added adversarial unit suites for the prototype-pollution sanitiser
  (`Sanitize`) and the poster URL allow-list/CSS-escaping (`UrlSafe`),
  and a dedicated `MetadataAlertsManager` suite covering scoped vs.
  global `FOCUS:` resolution.
- Added regression tests for the `i18n` `$`-escape, the drag/resize
  keyboard-shortcut guards, and the stable renderer-type identifier.
- Strengthened the YouTube `extractVideoId` suite to assert exact IDs
  (query/hash stripped) and cover `?si=` share links, `v` as a later
  query parameter, `/shorts/`, `youtube-nocookie.com`, and `#fragment`s.
- Added unit suites for the `classifyRendererType` URL classifier and the
  `loadPinnedScript` default-URL/SRI resolution rules.

## [1.2.4] - 2026-07-07

### Changed
- GitHub Actions CI: lint and Playwright e2e jobs, GitLab CI pipeline, expanded
  `.editorconfig`, and GitHub Actions artifact/cache actions v6 (Node 24).

### Fixed
- ESLint CI failures: `no-this-alias` in `MediaSessionManager` and implicit
  coercion warnings in player/renderers.

## [1.2.3] - 2026-06-27

### Added
- Caption preferences persist across sessions: the player remembers whether
  captions were turned on/off and which language was selected, restoring that
  choice on the next visit (preserving the last language even while captions
  are off).

### Changed
- Keyboard-shortcuts help dialog now lists only the shortcuts relevant to each
  player. Feature shortcuts (captions, caption styling, speed, quality,
  chapters, transcript, fullscreen) appear only when that feature is available,
  and the list is rebuilt on open so later-loading features (e.g. HLS
  captions/qualities) show up once ready.

## [1.2.2] - 2026-06-27

### Added
- Media Session API integration (`mediaSession` option, default on): exposes
  now-playing metadata (title/artist/album/artwork) and routes OS / lock-screen /
  notification / headset controls (play, pause, stop, seek, and previous/next
  track for playlists) back into the player. New `title`/`artist`/`album` options
  feed the metadata; playlist items take precedence. Position state is reported
  to the OS scrubber and degrades silently where unsupported.
- Keyboard-shortcuts help dialog: a focus-trapped, screen-reader-friendly modal
  listing the active key bindings. Reachable via a new control-bar help button
  (`helpButton` option, default on), the `?` keyboard shortcut, and the
  `player.toggleKeyboardHelp()` / `showKeyboardHelp()` / `hideKeyboardHelp()`
  API. Fully translated (en, de, es, fr, ja).

### Fixed
- Media Session: on pages with multiple players, the OS controls now drive the
  player that is actually playing. The single, document-global
  `navigator.mediaSession` is claimed by the most-recently-played player;
  background players no longer hijack it on init or wipe it on destroy. Fixes
  play/pause/seek/next/prev appearing in the OS dialog but doing nothing.

## [1.2.1] - 2026-06-14

### Added
- `descriptionSpeechManager` with mode routing, options, events and tests.
- Audio-description-mode documentation and demo page.

### Changed
- Lazy-load audio-description and sign-language chunks only when their content is present.
- Updated devDependencies and rebuilt `dist`.
- Enforce LF line endings via `.gitattributes`.

## [1.2.0] - 2026-06-04

### Changed
- Code-review hardening: accessibility, memory-leak, bundle-size and type-safety fixes.

## [1.1.19] - 2026-05-29

### Changed
- Updated vendored streaming libraries to hls.js 1.6.16 and dash.js 5.2.0.
- Bumped the pinned hls.js and dash.js CDN defaults to 1.6.16 and 5.2.0.

## [1.1.18] - 2026-05-18

### Fixed
- Video poster `max-width`/`width`.
- Auto-float PiP not redocking when scrolling back up.

## [1.1.17] - 2026-05-05

### Changed
- Removed `.npmrc` from version control.

## [1.1.16] - 2026-05-05

### Added
- Keep the transcript out of the mini-player and decorate the vacated slot with a centred PiP glyph.

### Changed
- Dropped ~2.1k lines of dead legacy code and plugged document/window listener leaks (-18% ESM bundle); sign-language mode badges are now translatable DOM nodes.
- Strict TypeScript: eliminated all `any`, dropped `eslint-disable`, fixed 91 lint warnings.
- Build now targets Node 24.

### Fixed
- White color in batches.
- README↔types drift check handles generics, nested-paren defaults and inherited EventEmitter methods.

## [1.1.15] - 2026-05-03

### Fixed
- Playwright tests.

## [1.1.12] - 2026-05-03

### Fixed
- Playwright tests.

## [1.1.11] - 2026-05-03

### Fixed
- Small `h1` fix and forwarding to the demo.

## [1.1.10] - 2026-05-03

### Changed
- Security/accessibility/quality audit.

### Fixed
- Mixed-playlist handling.
- Captions & transcript: full VTT fetch, HLS support and endonym labels.

## [1.1.9] - 2026-04-25

### Fixed
- DASH renderer: predictable initial audio-track selection.
- DASH track with label "null" but a valid language code (e.g. `de`).
- Pinned dash.js to 5.1.1.
- Console errors with preview images in HLS and DASH.
- Show captions and `lang` attributes on the language switcher.

## [1.1.8] - 2026-04-25

### Changed
- Updated terser dependencies.

## [1.1.7] - 2026-04-23

### Changed
- Maintenance release (version bump only).

## [1.1.6] - 2026-04-23

### Fixed
- Tooltip chevron stayed gray when the player is in light mode.
- Label the desktop volume button as "Volume <percent>%" instead of "Mute".

## [1.1.5] - 2026-04-21

### Fixed
- Resize handling for the floating/PiP player.

## [1.1.4] - 2026-04-21

### Added
- `FloatingPlayerManager` / PiP player module.
- Show file format and size on the download button label/tooltip.

## [1.1.3] - 2026-04-19

### Changed
- Refreshed docs and demos (TypeScript migration, SoundCloud renderer, buffering spinner, download button, native iOS HLS bridge).

### Fixed
- Sync the hls.js subtitle track on language switch and listen for `textcuesupdate`.

## [1.1.2] - 2026-04-17

### Fixed
- Listen to `SUBTITLE_FRAG_PROCESSED` for HLS subtitles.

## [1.1.1] - 2026-04-16

### Added
- Buffering spinner.

## [1.1.0] - 2026-04-16

### Added
- Buffering spinner shown until the media can play.

### Changed
- Converted ES modules to strict TypeScript; updated build and type definitions.

## [1.0.51] - 2026-04-14

### Added
- Download capability.

## [1.0.50] - 2026-04-12

### Added
- MPEG-DASH streaming support via dash.js.
- Captions, transcript and quality controls on Apple platforms via the native HLS TextTrack API.

### Fixed
- Show the menu button in fullscreen on iOS.

### Changed
- Updated HTML feature sections and README for DASH support.

## [1.0.45] - 2026-04-03

### Fixed
- Volume dot.

## [1.0.44] - 2026-04-03

### Accessibility
- WCAG 2.2 AA compliance: target size and dragging movements.

### Changed
- npm esbuild update.

## [1.0.43] - 2026-03-27

### Added
- Testing example video and audio.

### Changed
- npm updates (vitest, esbuild).

### Fixed
- Duration display and seek-forward in Firefox when the duration field is empty.
- Audio-description source init timing; demo pages use `data-vidply` auto-init.
- Removed unused CSS in demo files.

## [1.0.42] - 2026-02-22

### Fixed
- Set duration on initial load.

## [1.0.41] - 2026-02-21

### Added
- Dynamic HLS subtitle handling and light-theme fixes.

### Changed
- Updated copyright and docs.

### Fixed
- Removed a blocked Akamai video from the HLS stream page.

## [1.0.40] - 2026-02-11

### Fixed
- Transcript dialog overflow for full-width video players (WCAG 1.4.10).

## [1.0.39] - 2026-02-09

### Fixed
- Removed the browser fallback message.

## [1.0.38] - 2026-02-09

### Added
- vitest and Playwright tests.

### Changed
- esbuild update to 0.2.73.

### Fixed
- HTML5 validation errors for accessibility and media elements.

## [1.0.37] - 2026-02-01

### Added
- Sign-language display-mode option and a new PiP icon.
- Single-player and playlist test pages.

### Fixed
- Comprehensive fullscreen mode improvements.
- Close fullscreen when external media is in the playlist preview list.

## [1.0.35] - 2026-01-05

### Added
- Sign-language touch drag/resize via Pointer Events.

### Fixed
- Numerous iOS playlist fixes.
- Mobile overflow-menu height when positioned below the trigger.
- Aspect ratio applied only for the Vimeo/YouTube layer.
- Keyboard drag mode.

## [1.0.34] - 2026-01-01

### Fixed
- Audio artwork in mixed playlists when present.

## [1.0.33] - 2025-12-27

### Added
- Playlist selection loads metadata without autoplay; shows initial duration; defers loading audio/video/HLS files until play.

### Changed
- Updated docs and demo files.

## [1.0.32] - 2025-12-25

### Changed
- npm update.

### Fixed
- Hide the speed control for HLS streams (detected by `.m3u8` source).
- Removed outdated JS.

## [1.0.31] - 2025-12-22

### Added
- Video preview thumbnails and auto-poster generation in playlists.

## [1.0.30] - 2025-12-22

### Added
- Video preview thumbnails and auto-poster generation.

### Changed
- esbuild update.

## [1.0.29] - 2025-12-16

### Added
- Transcript: always show descriptions and swap tracks for audio-described videos.

### Fixed
- Audio-description caption-track swapping in playlists.

## [1.0.28] - 2025-12-15

### Fixed
- Added a missing translation.

## [1.0.27] - 2025-12-14

### Added
- Mixed playlist.

## [1.0.26] - 2025-12-12

### Fixed
- vidply language-detection lazy-loading.

## [1.0.25] - 2025-12-11

### Added
- Ship the `dist` directory on GitHub.
- ESM optimization with legacy code as an option.

## [1.0.24] - 2025-12-10

### Changed
- Maintenance release (version bump only).

## [1.0.23] - 2025-12-10

### Added
- `scrollIntoView` for keyboard navigation in all menu popups.

## [1.0.22] - 2025-12-03

### Changed
- Reworked theming: added a WCAG-compliant light mode with `color-scheme`, then removed light-mode support in favor of rem units.

## [1.0.21] - 2025-12-01

### Added
- Optional poster image for audio in single and playlist mode.

### Fixed
- Playlist accessibility and auto-scroll.
- Added a title to the quality button; added the quality button to Chrome in HLS mode.
- Added playlist translations.

## [1.0.20] - 2025-11-20

### Fixed
- iOS fullscreen issues where videos were positioned incorrectly and playlists weren't swipeable.

## [1.0.19] - 2025-11-20

### Added
- Horizontal auto-hiding playlist panel for fullscreen mode.
- New clock icon for timestamp show/hide.
- Playlist: WCAG accessibility and declarative configuration.

### Changed
- Transcript: improved semantic HTML and screen-reader UX.

### Fixed
- Portal fullscreen menus to container level so they appear above the playlist panel (WCAG).
- Fullscreen playlist overlay positioning in portrait mode.
- Prevented doubled screen-reader announcements for transcript autoscroll.
- Menu layout: prevent horizontal scrollbars and improve fullscreen display.
- Unique chapters icon to avoid duplication with the playlist toggle.
- Removed unused code.

## [1.0.18] - 2025-11-18

### Added
- Footer on all demo pages with improved accessibility.

### Changed
- Improved accessibility and screen-reader support.

### Fixed
- Transcript timestamp now hidden by default and made optional.

## [1.0.17] - 2025-11-17

### Added
- iOS fullscreen support with a pseudo-fullscreen fallback.
- Improved form labels and screen-reader support for time displays.

### Fixed
- Multi-player IDs and iOS sign-language playback.
- Keyboard navigation and ARIA semantics in settings menus.
- iOS touch events and drag-and-drop on touch devices.
- Landscape-mode problems on touch devices.
- Mute button on touch devices without a slider.
- Fullscreen button in landscape mode.
- Remove the overflow menu in landscape or on desktop > 768px.

## [1.0.16] - 2025-11-16

### Fixed
- Build all `dist` files.

## [1.0.15] - 2025-11-16

### Changed
- Updated docs and demo pages.

## [1.0.14] - 2025-11-16

### Added
- Responsive overflow menu and transcript view for audio players.
- Improved drag/resize button labels with shortcuts and full i18n support.
- `forced-colors` support for control icons.

### Changed
- Optimized mobile UX with dynamic caption/overlay positioning and accessibility improvements.
- Mobile view breakpoint set to 768px.

### Fixed
- Audio-description toggle with caption-based sync for differing video lengths.
- Moved the time display beside the progress bar.

## [1.0.12] - 2025-11-15

### Fixed
- Poster 404 error when enabling audio description.

## [1.0.11] - 2025-11-15

### Added
- Multi-language support for sign-language video.
- Settings menu in the sign-language video header.
- License.

### Changed
- Refactored the i18n system and improved accessibility.
- Switched the default language to English.

### Fixed
- Accessible labels on language select boxes.
- Sign-language settings-menu positioning, keyboard navigation and resize-icon display.
- Dropdown menu focus and closing behavior; improved focus management for menus and dialogs.
- HTML validation and CSS parse errors.

## [1.0.10] - 2025-11-09

### Changed
- Improved transcript accessibility and audio-description toggling.

## [1.0.9] - 2025-11-08

### Fixed
- Improved transcript language selector and fixed caption timelines.
- Added audio description to the first video; synced demo code blocks with implementations.

## [1.0.8] - 2025-11-05

### Changed
- Improved audio description with source and track swapping.

## [1.0.7] - 2025-10-31

### Changed
- Better contrast on demo pages and in the player.

### Fixed
- Prevent drag on UI interactions; complete i18n support.

## [1.0.6] - 2025-10-27

### Changed
- npm esbuild update.

### Fixed
- Added `playsinline` support for iOS/Android mobile playback.
- Video dimensions not resetting when exiting fullscreen with ESC.

## [1.0.5] - 2025-10-15

### Added
- Internationalized time display and duration formatting.

## [1.0.4] - 2025-10-15

### Added
- Enhanced playlist accessibility and UX.

### Fixed
- No more focus hijacking on load.
- Replaced the visual time format with natural language for screen readers.

## [1.0.3] - 2025-10-13

### Added
- Comprehensive keyboard navigation and accessibility.

### Fixed
- Only show the caption container when text is active.

## [1.0.2] - 2025-10-12

### Fixed
- Correct z-index stacking and sign-language video placement.
- Sign-language video positioned relative to the controls.
- Removed the circle from the sign-language SVG.
- Caption popups positioned above the play control with shorter popups.

## [1.0.1] - 2025-10-12

### Added
- Working sign-language demo page.

## [1.0.0] - 2025-10-11

- Initial release of the vidply accessible media player.

[1.2.5]: https://github.com/MatthiasPeltzer/vidply/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/MatthiasPeltzer/vidply/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/MatthiasPeltzer/vidply/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/MatthiasPeltzer/vidply/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/MatthiasPeltzer/vidply/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.19...v1.2.0
[1.1.19]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.18...v1.1.19
[1.1.18]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.17...v1.1.18
[1.1.17]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.16...v1.1.17
[1.1.16]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.15...v1.1.16
[1.1.15]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.12...v1.1.15
[1.1.12]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.11...v1.1.12
[1.1.11]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.10...v1.1.11
[1.1.10]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.9...v1.1.10
[1.1.9]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/MatthiasPeltzer/vidply/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.51...v1.1.0
[1.0.51]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.50...v1.0.51
[1.0.50]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.45...v1.0.50
[1.0.45]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.44...v1.0.45
[1.0.44]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.43...v1.0.44
[1.0.43]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.42...v1.0.43
[1.0.42]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.41...v1.0.42
[1.0.41]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.40...v1.0.41
[1.0.40]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.39...v1.0.40
[1.0.39]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.38...v1.0.39
[1.0.38]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.37...v1.0.38
[1.0.37]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.35...v1.0.37
[1.0.35]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.34...v1.0.35
[1.0.34]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.33...v1.0.34
[1.0.33]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.32...v1.0.33
[1.0.32]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.31...v1.0.32
[1.0.31]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.30...v1.0.31
[1.0.30]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.29...v1.0.30
[1.0.29]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.28...v1.0.29
[1.0.28]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.27...v1.0.28
[1.0.27]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.26...v1.0.27
[1.0.26]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.25...v1.0.26
[1.0.25]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.24...v1.0.25
[1.0.24]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.23...v1.0.24
[1.0.23]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.22...v1.0.23
[1.0.22]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.21...v1.0.22
[1.0.21]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.20...v1.0.21
[1.0.20]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.19...v1.0.20
[1.0.19]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.18...v1.0.19
[1.0.18]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.17...v1.0.18
[1.0.17]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.16...v1.0.17
[1.0.16]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.15...v1.0.16
[1.0.15]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.14...v1.0.15
[1.0.14]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.12...v1.0.14
[1.0.12]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.11...v1.0.12
[1.0.11]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.10...v1.0.11
[1.0.10]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.9...v1.0.10
[1.0.9]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/MatthiasPeltzer/vidply/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/MatthiasPeltzer/vidply/releases/tag/v1.0.0
