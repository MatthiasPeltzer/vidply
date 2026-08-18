# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/TrackLabelUtils.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @TrackLabelUtils
Feature: TrackLabelUtils
  Behaviour contract for AI-generated and human-maintained code in src/utils/TrackLabelUtils.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @deriveTrackLabel @happy-path
  Scenario: deriveTrackLabel handles valid input
    Given a prepared TrackLabelUtils context
    When deriveTrackLabel is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @deriveTrackLabel @guard
  Scenario: deriveTrackLabel rejects or normalizes invalid input safely
    Given a prepared TrackLabelUtils context
    When deriveTrackLabel is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
