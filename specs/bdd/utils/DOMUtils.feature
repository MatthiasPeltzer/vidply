# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/DOMUtils.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @DOMUtils
Feature: DOMUtils
  Behaviour contract for AI-generated and human-maintained code in src/utils/DOMUtils.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @show @happy-path
  Scenario: DOMUtils.show handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.show is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @show @guard
  Scenario: DOMUtils.show rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.show is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @if @happy-path
  Scenario: DOMUtils.if handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: DOMUtils.if rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @hide @happy-path
  Scenario: DOMUtils.hide handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.hide is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @hide @guard
  Scenario: DOMUtils.hide rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.hide is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @if @happy-path
  Scenario: DOMUtils.if handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: DOMUtils.if rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @fadeIn @happy-path
  Scenario: DOMUtils.fadeIn handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.fadeIn is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @fadeIn @guard
  Scenario: DOMUtils.fadeIn rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.fadeIn is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @if @happy-path
  Scenario: DOMUtils.if handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: DOMUtils.if rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @if @happy-path
  Scenario: DOMUtils.if handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: DOMUtils.if rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @if @happy-path
  Scenario: DOMUtils.if handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: DOMUtils.if rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @onComplete @happy-path
  Scenario: DOMUtils.onComplete handles valid input
    Given a prepared DOMUtils context
    When DOMUtils.onComplete is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @onComplete @guard
  Scenario: DOMUtils.onComplete rejects or normalizes invalid input safely
    Given a prepared DOMUtils context
    When DOMUtils.onComplete is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
