# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/PerformanceUtils.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @PerformanceUtils
Feature: PerformanceUtils
  Behaviour contract for AI-generated and human-maintained code in src/utils/PerformanceUtils.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @debounce @happy-path
  Scenario: debounce handles valid input
    Given a prepared PerformanceUtils context
    When debounce is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @debounce @guard
  Scenario: debounce rejects or normalizes invalid input safely
    Given a prepared PerformanceUtils context
    When debounce is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @throttle @happy-path
  Scenario: throttle handles valid input
    Given a prepared PerformanceUtils context
    When throttle is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @throttle @guard
  Scenario: throttle rejects or normalizes invalid input safely
    Given a prepared PerformanceUtils context
    When throttle is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @isMobile @happy-path
  Scenario: isMobile handles valid input
    Given a prepared PerformanceUtils context
    When isMobile is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @isMobile @guard
  Scenario: isMobile rejects or normalizes invalid input safely
    Given a prepared PerformanceUtils context
    When isMobile is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @prefersReducedMotion @happy-path
  Scenario: prefersReducedMotion handles valid input
    Given a prepared PerformanceUtils context
    When prefersReducedMotion is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @prefersReducedMotion @guard
  Scenario: prefersReducedMotion rejects or normalizes invalid input safely
    Given a prepared PerformanceUtils context
    When prefersReducedMotion is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @reducedMotionScrollOptions @happy-path
  Scenario: reducedMotionScrollOptions handles valid input
    Given a prepared PerformanceUtils context
    When reducedMotionScrollOptions is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @reducedMotionScrollOptions @guard
  Scenario: reducedMotionScrollOptions rejects or normalizes invalid input safely
    Given a prepared PerformanceUtils context
    When reducedMotionScrollOptions is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @rafWithTimeout @happy-path
  Scenario: rafWithTimeout handles valid input
    Given a prepared PerformanceUtils context
    When rafWithTimeout is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @rafWithTimeout @guard
  Scenario: rafWithTimeout rejects or normalizes invalid input safely
    Given a prepared PerformanceUtils context
    When rafWithTimeout is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
