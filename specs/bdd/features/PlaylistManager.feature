# Reference spec
# Source: src/features/PlaylistManager.ts

@vidply @PlaylistManager
Feature: PlaylistManager
  Playlist rows expose separate select and play controls for browse-first UX and WCAG 2.2 AA.

  @happy-path @a11y
  Scenario: Each playlist row has select and play buttons
    Given a PlaylistManager with at least one track rendered in the panel
    Then each `.vidply-playlist-item` contains a `.vidply-playlist-item-select` button
    And each `.vidply-playlist-item` contains a `.vidply-playlist-item-play` button
    And the track list is a semantic `ul` without `role="listbox"`

  @happy-path
  Scenario: Select button loads track without playback
    Given focus on a playlist select button for track index 2
    When the user activates the select control with Enter or Space
    Then `loadTrack(2)` is called
    And `play()` is not called
    And a polite live region announces the selection

  @happy-path
  Scenario: Play button starts playback
    Given a playlist row for track index 1
    When the user activates the play control
    Then `play(1, true)` is called

  @happy-path @keyboard
  Scenario: Arrow keys move roving focus between select buttons
    Given focus on the select button for track 1
    When the user presses ArrowDown
    Then focus moves to the select button for track 2
    And only one select button has `tabindex="0"`

  @happy-path @keyboard
  Scenario: Right arrow moves focus from select to play on the same row
    Given focus on the select button for track 1
    When the user presses ArrowRight
    Then focus moves to the play button for track 1

  @guard @a11y
  Scenario: Track info does not announce now playing on select-only
    Given a selected but paused playlist track
    When `updateTrackInfo()` runs without `announcePlaying`
    Then no polite live region says "Now playing"

  @guard @a11y
  Scenario: Playback announces now playing
    Given a playlist track starts playing via `play()`
    When `updateTrackInfo()` runs with `announcePlaying: true`
    Then a polite live region announces now playing
