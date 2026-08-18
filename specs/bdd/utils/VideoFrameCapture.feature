# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/VideoFrameCapture.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @VideoFrameCapture
Feature: VideoFrameCapture
  Behaviour contract for AI-generated and human-maintained code in src/utils/VideoFrameCapture.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @captureVideoFrame @happy-path
  Scenario: captureVideoFrame handles valid input
    Given a prepared VideoFrameCapture context
    When captureVideoFrame is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @captureVideoFrame @guard
  Scenario: captureVideoFrame rejects or normalizes invalid input safely
    Given a prepared VideoFrameCapture context
    When captureVideoFrame is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
