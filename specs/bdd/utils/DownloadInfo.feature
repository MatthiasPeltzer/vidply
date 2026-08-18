# Generated starter — extend with concrete examples and edge cases.
# Source: src/utils/DownloadInfo.ts
# Regenerate scaffold: node scripts/generate-bdd-specs.mjs

@vidply @DownloadInfo
Feature: DownloadInfo
  Behaviour contract for AI-generated and human-maintained code in src/utils/DownloadInfo.ts.
  Each public function or method has at least one happy-path and one guard scenario.

  @inferFormatFromMime @happy-path
  Scenario: inferFormatFromMime handles valid input
    Given a prepared DownloadInfo context
    When inferFormatFromMime is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @inferFormatFromMime @guard
  Scenario: inferFormatFromMime rejects or normalizes invalid input safely
    Given a prepared DownloadInfo context
    When inferFormatFromMime is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @inferFormatFromUrl @happy-path
  Scenario: inferFormatFromUrl handles valid input
    Given a prepared DownloadInfo context
    When inferFormatFromUrl is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @inferFormatFromUrl @guard
  Scenario: inferFormatFromUrl rejects or normalizes invalid input safely
    Given a prepared DownloadInfo context
    When inferFormatFromUrl is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @formatBytes @happy-path
  Scenario: formatBytes handles valid input
    Given a prepared DownloadInfo context
    When formatBytes is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @formatBytes @guard
  Scenario: formatBytes rejects or normalizes invalid input safely
    Given a prepared DownloadInfo context
    When formatBytes is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @fetchContentLength @happy-path
  Scenario: fetchContentLength handles valid input
    Given a prepared DownloadInfo context
    When fetchContentLength is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @fetchContentLength @guard
  Scenario: fetchContentLength rejects or normalizes invalid input safely
    Given a prepared DownloadInfo context
    When fetchContentLength is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context

  @buildDownloadLabel @happy-path
  Scenario: buildDownloadLabel handles valid input
    Given a prepared DownloadInfo context
    When buildDownloadLabel is invoked with representative valid input
    Then the result matches the documented contract
    And no error is thrown

  @buildDownloadLabel @guard
  Scenario: buildDownloadLabel rejects or normalizes invalid input safely
    Given a prepared DownloadInfo context
    When buildDownloadLabel is invoked with empty, null, or out-of-range input where applicable
    Then the result is null, empty, a safe default, or a typed error
    And untrusted input cannot escape its output context
