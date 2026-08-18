# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/FocusUtils.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @FocusUtils
Feature: FocusUtils
  Behaviour contract for AI-generated and human-maintained code in src/utils/FocusUtils.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @getFocusableElements @happy-path
  Scenario: getFocusableElements handles valid input
    Given a prepared FocusUtils context
    When getFocusableElements is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @getFocusableElements @guard
  Scenario: getFocusableElements rejects or normalizes invalid input safely
    Given a prepared FocusUtils context
    When getFocusableElements is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @trapFocusInContainer @happy-path
  Scenario: trapFocusInContainer handles valid input
    Given a prepared FocusUtils context
    When trapFocusInContainer is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @trapFocusInContainer @guard
  Scenario: trapFocusInContainer rejects or normalizes invalid input safely
    Given a prepared FocusUtils context
    When trapFocusInContainer is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @setContainerChildrenInert @happy-path
  Scenario: setContainerChildrenInert handles valid input
    Given a prepared FocusUtils context
    When setContainerChildrenInert is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @setContainerChildrenInert @guard
  Scenario: setContainerChildrenInert rejects or normalizes invalid input safely
    Given a prepared FocusUtils context
    When setContainerChildrenInert is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @focusElement @happy-path
  Scenario: focusElement handles valid input
    Given a prepared FocusUtils context
    When focusElement is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @focusElement @guard
  Scenario: focusElement rejects or normalizes invalid input safely
    Given a prepared FocusUtils context
    When focusElement is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @focusFirstElement @happy-path
  Scenario: focusFirstElement handles valid input
    Given a prepared FocusUtils context
    When focusFirstElement is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @focusFirstElement @guard
  Scenario: focusFirstElement rejects or normalizes invalid input safely
    Given a prepared FocusUtils context
    When focusFirstElement is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
