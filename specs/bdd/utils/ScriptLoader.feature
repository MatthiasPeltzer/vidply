# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/ScriptLoader.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @ScriptLoader
Feature: ScriptLoader
  Behaviour contract for AI-generated and human-maintained code in src/utils/ScriptLoader.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @loadScriptOnce @happy-path
  Scenario: loadScriptOnce handles valid input
    Given a prepared ScriptLoader context
    When loadScriptOnce is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @loadScriptOnce @guard
  Scenario: loadScriptOnce rejects or normalizes invalid input safely
    Given a prepared ScriptLoader context
    When loadScriptOnce is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @loadPinnedScript @happy-path
  Scenario: loadPinnedScript handles valid input
    Given a prepared ScriptLoader context
    When loadPinnedScript is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @loadPinnedScript @guard
  Scenario: loadPinnedScript rejects or normalizes invalid input safely
    Given a prepared ScriptLoader context
    When loadPinnedScript is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @_resetScriptLoaderCache @happy-path
  Scenario: _resetScriptLoaderCache handles valid input
    Given a prepared ScriptLoader context
    When _resetScriptLoaderCache is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @_resetScriptLoaderCache @guard
  Scenario: _resetScriptLoaderCache rejects or normalizes invalid input safely
    Given a prepared ScriptLoader context
    When _resetScriptLoaderCache is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
