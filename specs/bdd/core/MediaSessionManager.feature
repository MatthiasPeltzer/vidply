# Generated starter — extend with concrete examples and edge cases.
# Source: src/core/MediaSessionManager.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @MediaSessionManager
Feature: MediaSessionManager
  Behaviour contract for AI-generated and human-maintained code in src/core/MediaSessionManager.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @if @happy-path
  Scenario: MediaSessionManager.if handles valid input
    Given a prepared MediaSessionManager context
    When MediaSessionManager.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: MediaSessionManager.if rejects or normalizes invalid input safely
    Given a prepared MediaSessionManager context
    When MediaSessionManager.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @if @happy-path
  Scenario: MediaSessionManager.if handles valid input
    Given a prepared MediaSessionManager context
    When MediaSessionManager.if is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @if @guard
  Scenario: MediaSessionManager.if rejects or normalizes invalid input safely
    Given a prepared MediaSessionManager context
    When MediaSessionManager.if is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
