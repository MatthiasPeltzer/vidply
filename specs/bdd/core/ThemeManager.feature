# Generated starter — extend with concrete examples and edge cases.
# Source: src/core/ThemeManager.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @ThemeManager
Feature: ThemeManager
  Behaviour contract for AI-generated and human-maintained code in src/core/ThemeManager.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @isValidThemeVariableName @happy-path
  Scenario: isValidThemeVariableName handles valid input
    Given a prepared ThemeManager context
    When isValidThemeVariableName is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @isValidThemeVariableName @guard
  Scenario: isValidThemeVariableName rejects or normalizes invalid input safely
    Given a prepared ThemeManager context
    When isValidThemeVariableName is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @isValidThemeVariableValue @happy-path
  Scenario: isValidThemeVariableValue handles valid input
    Given a prepared ThemeManager context
    When isValidThemeVariableValue is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @isValidThemeVariableValue @guard
  Scenario: isValidThemeVariableValue rejects or normalizes invalid input safely
    Given a prepared ThemeManager context
    When isValidThemeVariableValue is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
