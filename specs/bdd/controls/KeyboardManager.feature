# Generated starter — extend with concrete examples and edge cases.
# Source: src/controls/KeyboardManager.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @KeyboardManager
Feature: KeyboardManager
  Behaviour contract for AI-generated and human-maintained code in src/controls/KeyboardManager.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @if @happy-path
  Scenario: KeyboardManager.if handles valid input
    Given a prepared KeyboardManager context
    When KeyboardManager.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: KeyboardManager.if rejects or normalizes invalid input safely
    Given a prepared KeyboardManager context
    When KeyboardManager.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
