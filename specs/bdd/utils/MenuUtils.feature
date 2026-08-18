# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/MenuUtils.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @MenuUtils
Feature: MenuUtils
  Behaviour contract for AI-generated and human-maintained code in src/utils/MenuUtils.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @createMenuItem @happy-path
  Scenario: createMenuItem handles valid input
    Given a prepared MenuUtils context
    When createMenuItem is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createMenuItem @guard
  Scenario: createMenuItem rejects or normalizes invalid input safely
    Given a prepared MenuUtils context
    When createMenuItem is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @attachMenuKeyboardNavigation @happy-path
  Scenario: attachMenuKeyboardNavigation handles valid input
    Given a prepared MenuUtils context
    When attachMenuKeyboardNavigation is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @attachMenuKeyboardNavigation @guard
  Scenario: attachMenuKeyboardNavigation rejects or normalizes invalid input safely
    Given a prepared MenuUtils context
    When attachMenuKeyboardNavigation is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @focusFirstMenuItem @happy-path
  Scenario: focusFirstMenuItem handles valid input
    Given a prepared MenuUtils context
    When focusFirstMenuItem is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @focusFirstMenuItem @guard
  Scenario: focusFirstMenuItem rejects or normalizes invalid input safely
    Given a prepared MenuUtils context
    When focusFirstMenuItem is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
