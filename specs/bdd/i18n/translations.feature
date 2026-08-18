# Generated starter — extend with concrete examples and edge cases.
# Source: src/i18n/translations.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @translations
Feature: translations
  Behaviour contract for AI-generated and human-maintained code in src/i18n/translations.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @getBaseTranslations @happy-path
  Scenario: getBaseTranslations handles valid input
    Given a prepared translations context
    When getBaseTranslations is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @getBaseTranslations @guard
  Scenario: getBaseTranslations rejects or normalizes invalid input safely
    Given a prepared translations context
    When getBaseTranslations is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @getBuiltInLanguageLoaders @happy-path
  Scenario: getBuiltInLanguageLoaders handles valid input
    Given a prepared translations context
    When getBuiltInLanguageLoaders is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @getBuiltInLanguageLoaders @guard
  Scenario: getBuiltInLanguageLoaders rejects or normalizes invalid input safely
    Given a prepared translations context
    When getBuiltInLanguageLoaders is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @loadBuiltInTranslation @happy-path
  Scenario: loadBuiltInTranslation handles valid input
    Given a prepared translations context
    When loadBuiltInTranslation is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @loadBuiltInTranslation @guard
  Scenario: loadBuiltInTranslation rejects or normalizes invalid input safely
    Given a prepared translations context
    When loadBuiltInTranslation is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
