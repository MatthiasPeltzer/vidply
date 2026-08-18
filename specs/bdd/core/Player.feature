# Reference spec — concrete examples for AI and test authors.
# Source: src/core/Player.ts
# Tests:  tests/unit/Player.test.js, tests/integration/Player*.test.js, tests/e2e/*.spec.js

@vidply @Player @unit @a11y @security
Feature: Player — universal accessible media player
  Main player class: initialization, playback, volume, captions, themes, and safe URL handling.
  Options are sanitized before use; poster URLs pass through UrlSafe.

  Background:
    Given a DOM container element exists
    And i18n is initialized

  # --- Construction & lifecycle ---

  @constructor @happy-path
  Scenario: Construct a video player on a container element
    When a Player is created with the container and default options
    Then the player element is attached to the container
    And state volume defaults between 0 and 1
    And state paused is true

  @constructor @guard
  Scenario: Reject invalid media type option
    When a Player is created with mediaType "image"
    Then construction fails or falls back to a safe default media type

  @destroy @happy-path
  Scenario: Destroy cleans up without throwing
    Given an initialized Player
    When destroy is called
    Then no error is thrown
    And destroy can be called again safely

  @observeLazy @happy-path
  Scenario: Lazy-init observes elements matching a selector
    Given elements with data-vidply-lazy attribute in the document
    When Player.observeLazy is called with a selector and callback
    Then players are created when elements intersect the viewport

  # --- Playback ---

  @play @happy-path
  Scenario: Play starts playback and emits play event
    Given a paused Player with a loaded source
    When play is called
    Then the renderer play method is invoked
    And a play event is emitted

  @pause @happy-path
  Scenario: Pause stops playback and emits pause event
    Given a playing Player
    When pause is called
    Then the renderer pause method is invoked
    And a pause event is emitted

  @toggle @happy-path
  Scenario: Toggle switches between play and pause
    Given a paused Player
    When toggle is called
    Then playback starts
    When toggle is called again
    Then playback pauses

  @seek @happy-path
  Scenario: Seek moves current time within duration
    Given a Player with duration 100 seconds at time 0
    When seek is called with 30
    Then current time becomes 30

  @seekForward @happy-path
  Scenario: Seek forward uses configured interval
    Given a Player at time 10 with seekInterval 5
    When seekForward is called
    Then seek is called with 15

  @seekBackward @happy-path
  Scenario: Seek backward uses configured interval
    Given a Player at time 10 with seekInterval 5
    When seekBackward is called
    Then seek is called with 5

  # --- Volume ---

  @setVolume @happy-path
  Scenario Outline: Set volume within valid range
    When setVolume is called with <input>
    Then state volume equals <expected>

    Examples:
      | input | expected |
      | 0.5   | 0.5      |
      | 1.0   | 1.0      |

  @setVolume @guard
  Scenario Outline: Clamp out-of-range volume
    When setVolume is called with <input>
    Then state volume equals <expected>

    Examples:
      | input | expected |
      | -0.5  | 0        |
      | 1.5   | 1        |

  @mute @toggleMute @happy-path
  Scenario: Toggle mute switches muted state
    Given an unmuted Player
    When toggleMute is called
    Then isMuted returns true
    When toggleMute is called again
    Then isMuted returns false

  # --- Speed ---

  @setPlaybackSpeed @happy-path
  Scenario: Change playback speed emits event
    When setPlaybackSpeed is called with 1.5
    Then state playbackSpeed is 1.5
    And a playbackspeedchange event is emitted

  # --- Renderer detection & security ---

  @isExternalRendererUrl @happy-path
  Scenario Outline: Detect external renderer URLs
    When isExternalRendererUrl is called with "<url>"
    Then the result is true

    Examples:
      | url                                      |
      | https://www.youtube.com/watch?v=dQw4w9WgXcQ |
      | https://vimeo.com/123456                 |
      | https://soundcloud.com/artist/track      |
      | https://cdn.example.com/stream.m3u8      |

  @isExternalRendererUrl @guard
  Scenario: Treat local file URLs as non-external
    When isExternalRendererUrl is called with "/media/video.mp4"
    Then the result is false

  @resolvePosterPath @security
  Scenario: Sanitize poster path before assignment
    When resolvePosterPath is called with a javascript scheme URL
    Then the result is empty or a safe fallback
    And the raw javascript URL is never assigned to the video element

  @stripVTTFormatting @happy-path
  Scenario: Strip VTT markup for plain-text display
    When stripVTTFormatting is called with "<v Speaker>Hello\nWorld"
    Then the result contains "Hello World"
    And angle-bracket VTT tags are removed

  # --- Captions & accessibility ---

  @enableCaptions @disableCaptions @guard
  Scenario: Caption methods do not throw when manager is unavailable
    Given a Player without an initialized CaptionManager
    When enableCaptions is called
    Then no error is thrown
    When disableCaptions is called
    Then no error is thrown

  @showNotice @a11y
  Scenario: Show notice uses live region priority
    When showNotice is called with message "Buffering" and priority "polite"
    Then an accessible live region announces the message
    And the notice auto-dismisses after the configured timeout

  # --- Theme ---

  @setTheme @happy-path
  Scenario: Apply a built-in theme
    Given a Player instance
    When setTheme is called with a valid theme name from Player.THEMES
    Then getTheme returns that theme name
    And CSS custom properties are applied to the player container

  @setThemeVariable @guard
  Scenario: Reject invalid theme variable names
    When setThemeVariable is called with an invalid variable name
    Then the variable is not applied to the DOM

  # --- Fullscreen & PiP ---

  @toggleFullscreen @happy-path
  Scenario: Toggle fullscreen enters when not fullscreen
    Given a Player that is not fullscreen
    When toggleFullscreen is called
    Then enterFullscreen logic runs

  @enterPiP @guard
  Scenario: PiP gracefully no-ops when unsupported
    Given a browser without Picture-in-Picture support
    When enterPiP is called
    Then no uncaught error is thrown

  # --- Error handling ---

  @handleError @happy-path
  Scenario: Handle error emits error event
    When handleError is called with an Error instance
    Then an error event is emitted with the error payload
