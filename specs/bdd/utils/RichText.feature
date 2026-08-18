# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/RichText.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @RichText
Feature: RichText
  Behaviour contract for AI-generated and human-maintained code in src/utils/RichText.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @createSanitizedRichTextFragment @happy-path
  Scenario: createSanitizedRichTextFragment handles valid input
    Given a prepared RichText context
    When createSanitizedRichTextFragment is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createSanitizedRichTextFragment @guard
  Scenario: createSanitizedRichTextFragment rejects or normalizes invalid input safely
    Given a prepared RichText context
    When createSanitizedRichTextFragment is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @setSanitizedRichText @happy-path
  Scenario: setSanitizedRichText handles valid input
    Given a prepared RichText context
    When setSanitizedRichText is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @setSanitizedRichText @guard
  Scenario: setSanitizedRichText rejects or normalizes invalid input safely
    Given a prepared RichText context
    When setSanitizedRichText is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
