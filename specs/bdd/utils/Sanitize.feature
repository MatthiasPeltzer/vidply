# Reference spec — concrete examples for AI and test authors.
# Source: src/utils/Sanitize.ts
# Tests:  tests/unit/Sanitize.test.js

@vidply @Sanitize @security @unit
Feature: Sanitize — option object hardening
  Strip prototype-pollution keys from user-influenced option objects.

  Background:
    Given the Sanitize module is loaded

  @isForbiddenKey @guard @security
  Scenario Outline: Detect dangerous property keys
    When isForbiddenKey is called with <key>
    Then the result should be true

    Examples:
      | key        |
      | __proto__  |
      | constructor|
      | prototype  |

  @shallowSanitize @happy-path
  Scenario: Copy safe own properties only
    Given an input object with own property "volume" set to 0.8
    When shallowSanitize is applied
    Then the result volume should be 0.8
    And the result should not inherit polluted prototype keys

  @deepSanitize @guard @security
  Scenario: Remove nested forbidden keys
    Given a nested object containing "__proto__" at any depth
    When deepSanitize is applied
    Then the output must not contain "__proto__" keys
    And safe nested values are preserved
