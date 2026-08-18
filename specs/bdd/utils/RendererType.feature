# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/RendererType.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @RendererType
Feature: RendererType
  Behaviour contract for AI-generated and human-maintained code in src/utils/RendererType.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @classifyRendererType @happy-path
  Scenario: classifyRendererType handles valid input
    Given a prepared RendererType context
    When classifyRendererType is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @classifyRendererType @guard
  Scenario: classifyRendererType rejects or normalizes invalid input safely
    Given a prepared RendererType context
    When classifyRendererType is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
