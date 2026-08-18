# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/FormUtils.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @FormUtils
Feature: FormUtils
  Behaviour contract for AI-generated and human-maintained code in src/utils/FormUtils.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @createLabeledSelect @happy-path
  Scenario: createLabeledSelect handles valid input
    Given a prepared FormUtils context
    When createLabeledSelect is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createLabeledSelect @guard
  Scenario: createLabeledSelect rejects or normalizes invalid input safely
    Given a prepared FormUtils context
    When createLabeledSelect is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @toggleLabeledSelect @happy-path
  Scenario: toggleLabeledSelect handles valid input
    Given a prepared FormUtils context
    When toggleLabeledSelect is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @toggleLabeledSelect @guard
  Scenario: toggleLabeledSelect rejects or normalizes invalid input safely
    Given a prepared FormUtils context
    When toggleLabeledSelect is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @preventDragOnElement @happy-path
  Scenario: preventDragOnElement handles valid input
    Given a prepared FormUtils context
    When preventDragOnElement is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @preventDragOnElement @guard
  Scenario: preventDragOnElement rejects or normalizes invalid input safely
    Given a prepared FormUtils context
    When preventDragOnElement is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
