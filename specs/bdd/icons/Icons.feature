# Generated starter — extend with concrete examples and edge cases.
# Source: src/icons/Icons.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @Icons
Feature: Icons
  Behaviour contract for AI-generated and human-maintained code in src/icons/Icons.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @getIcon @happy-path
  Scenario: getIcon handles valid input
    Given a prepared Icons context
    When getIcon is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @getIcon @guard
  Scenario: getIcon rejects or normalizes invalid input safely
    Given a prepared Icons context
    When getIcon is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createIconElement @happy-path
  Scenario: createIconElement handles valid input
    Given a prepared Icons context
    When createIconElement is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createIconElement @guard
  Scenario: createIconElement rejects or normalizes invalid input safely
    Given a prepared Icons context
    When createIconElement is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createPlayOverlay @happy-path
  Scenario: createPlayOverlay handles valid input
    Given a prepared Icons context
    When createPlayOverlay is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createPlayOverlay @guard
  Scenario: createPlayOverlay rejects or normalizes invalid input safely
    Given a prepared Icons context
    When createPlayOverlay is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
