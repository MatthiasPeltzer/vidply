# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/MenuFactory.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @MenuFactory
Feature: MenuFactory
  Behaviour contract for AI-generated and human-maintained code in src/utils/MenuFactory.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @createMenu @happy-path
  Scenario: createMenu handles valid input
    Given a prepared MenuFactory context
    When createMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createMenu @guard
  Scenario: createMenu rejects or normalizes invalid input safely
    Given a prepared MenuFactory context
    When createMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createSpeedMenu @happy-path
  Scenario: createSpeedMenu handles valid input
    Given a prepared MenuFactory context
    When createSpeedMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createSpeedMenu @guard
  Scenario: createSpeedMenu rejects or normalizes invalid input safely
    Given a prepared MenuFactory context
    When createSpeedMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createCaptionsMenu @happy-path
  Scenario: createCaptionsMenu handles valid input
    Given a prepared MenuFactory context
    When createCaptionsMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createCaptionsMenu @guard
  Scenario: createCaptionsMenu rejects or normalizes invalid input safely
    Given a prepared MenuFactory context
    When createCaptionsMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createChaptersMenu @happy-path
  Scenario: createChaptersMenu handles valid input
    Given a prepared MenuFactory context
    When createChaptersMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createChaptersMenu @guard
  Scenario: createChaptersMenu rejects or normalizes invalid input safely
    Given a prepared MenuFactory context
    When createChaptersMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createQualityMenu @happy-path
  Scenario: createQualityMenu handles valid input
    Given a prepared MenuFactory context
    When createQualityMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createQualityMenu @guard
  Scenario: createQualityMenu rejects or normalizes invalid input safely
    Given a prepared MenuFactory context
    When createQualityMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
