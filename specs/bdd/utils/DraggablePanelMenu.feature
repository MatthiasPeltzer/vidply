# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/DraggablePanelMenu.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @DraggablePanelMenu
Feature: DraggablePanelMenu
  Behaviour contract for AI-generated and human-maintained code in src/utils/DraggablePanelMenu.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @updateToggleMenuItem @happy-path
  Scenario: updateToggleMenuItem handles valid input
    Given a prepared DraggablePanelMenu context
    When updateToggleMenuItem is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @updateToggleMenuItem @guard
  Scenario: updateToggleMenuItem rejects or normalizes invalid input safely
    Given a prepared DraggablePanelMenu context
    When updateToggleMenuItem is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @positionSettingsMenu @happy-path
  Scenario: positionSettingsMenu handles valid input
    Given a prepared DraggablePanelMenu context
    When positionSettingsMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @positionSettingsMenu @guard
  Scenario: positionSettingsMenu rejects or normalizes invalid input safely
    Given a prepared DraggablePanelMenu context
    When positionSettingsMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @positionSettingsMenuDeferred @happy-path
  Scenario: positionSettingsMenuDeferred handles valid input
    Given a prepared DraggablePanelMenu context
    When positionSettingsMenuDeferred is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @positionSettingsMenuDeferred @guard
  Scenario: positionSettingsMenuDeferred rejects or normalizes invalid input safely
    Given a prepared DraggablePanelMenu context
    When positionSettingsMenuDeferred is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
