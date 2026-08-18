# Generated starter — extend with concrete examples and edge cases.
# Source: src/controls/CaptionStyleMenu.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @CaptionStyleMenu
Feature: CaptionStyleMenu
  Behaviour contract for AI-generated and human-maintained code in src/controls/CaptionStyleMenu.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @showCaptionStyleMenu @happy-path
  Scenario: showCaptionStyleMenu handles valid input
    Given a prepared CaptionStyleMenu context
    When showCaptionStyleMenu is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @showCaptionStyleMenu @guard
  Scenario: showCaptionStyleMenu rejects or normalizes invalid input safely
    Given a prepared CaptionStyleMenu context
    When showCaptionStyleMenu is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
