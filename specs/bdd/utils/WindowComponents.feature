# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/WindowComponents.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @WindowComponents
Feature: WindowComponents
  Behaviour contract for AI-generated and human-maintained code in src/utils/WindowComponents.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @createWindowHeader @happy-path
  Scenario: createWindowHeader handles valid input
    Given a prepared WindowComponents context
    When createWindowHeader is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createWindowHeader @guard
  Scenario: createWindowHeader rejects or normalizes invalid input safely
    Given a prepared WindowComponents context
    When createWindowHeader is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createHeaderSelector @happy-path
  Scenario: createHeaderSelector handles valid input
    Given a prepared WindowComponents context
    When createHeaderSelector is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createHeaderSelector @guard
  Scenario: createHeaderSelector rejects or normalizes invalid input safely
    Given a prepared WindowComponents context
    When createHeaderSelector is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @createAutoscrollCheckbox @happy-path
  Scenario: createAutoscrollCheckbox handles valid input
    Given a prepared WindowComponents context
    When createAutoscrollCheckbox is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createAutoscrollCheckbox @guard
  Scenario: createAutoscrollCheckbox rejects or normalizes invalid input safely
    Given a prepared WindowComponents context
    When createAutoscrollCheckbox is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
