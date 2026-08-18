# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/ResizeHandles.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @ResizeHandles
Feature: ResizeHandles
  Behaviour contract for AI-generated and human-maintained code in src/utils/ResizeHandles.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @createResizeHandles @happy-path
  Scenario: createResizeHandles handles valid input
    Given a prepared ResizeHandles context
    When createResizeHandles is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @createResizeHandles @guard
  Scenario: createResizeHandles rejects or normalizes invalid input safely
    Given a prepared ResizeHandles context
    When createResizeHandles is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @removeResizeHandles @happy-path
  Scenario: removeResizeHandles handles valid input
    Given a prepared ResizeHandles context
    When removeResizeHandles is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @removeResizeHandles @guard
  Scenario: removeResizeHandles rejects or normalizes invalid input safely
    Given a prepared ResizeHandles context
    When removeResizeHandles is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @toggleResizableState @happy-path
  Scenario: toggleResizableState handles valid input
    Given a prepared ResizeHandles context
    When toggleResizableState is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @toggleResizableState @guard
  Scenario: toggleResizableState rejects or normalizes invalid input safely
    Given a prepared ResizeHandles context
    When toggleResizableState is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @getCursorForDirection @happy-path
  Scenario: getCursorForDirection handles valid input
    Given a prepared ResizeHandles context
    When getCursorForDirection is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @getCursorForDirection @guard
  Scenario: getCursorForDirection rejects or normalizes invalid input safely
    Given a prepared ResizeHandles context
    When getCursorForDirection is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
