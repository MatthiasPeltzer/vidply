# Reference spec — concrete examples for AI and test authors.
# Source: src/utils/UrlSafe.ts
# Tests:  tests/unit/UrlSafe.test.js

@vidply @UrlSafe @security @unit
Feature: UrlSafe — poster and artwork URL sanitization
  Pure functions that validate URLs before they flow into CSS url() values
  or HTML poster attributes. Reject anything that could break out of context.

  Background:
    Given the UrlSafe module is loaded

  @sanitizePosterUrl @happy-path
  Scenario Outline: Accept safe poster URLs
    When sanitizePosterUrl is called with <input>
    Then the result should be <expected>

    Examples:
      | input                              | expected                        |
      | /media/poster.jpg                  | /media/poster.jpg               |
      | ./poster.jpg                       | ./poster.jpg                    |
      | https://example.com/p.jpg          | https://example.com/p.jpg       |
      | data:image/png;base64,AAAA         | data:image/png;base64,AAAA      |

  @sanitizePosterUrl @guard @security
  Scenario Outline: Reject unsafe poster URLs
    When sanitizePosterUrl is called with <input>
    Then the result should be null

    Examples:
      | input                    |
      | javascript:alert(1)      |
      | data:text/html;base64,AA |
      | /a"),url("//evil         |
      |                          |
      | null                     |

  @cssEscapeUrl @happy-path
  Scenario: Escape characters that break CSS url()
    When cssEscapeUrl is called with 'a"b(c)d\e'
    Then the result should be 'a\"b\(c\)d\\e'

  @toCssBackgroundImage @happy-path
  Scenario: Build a safe CSS background-image value
    When toCssBackgroundImage is called with "/media/poster.jpg"
    Then the result should be 'url("/media/poster.jpg")'

  @toCssBackgroundImage @guard @security
  Scenario: Return null for unsafe background input
    When toCssBackgroundImage is called with "javascript:alert(1)"
    Then the result should be null
