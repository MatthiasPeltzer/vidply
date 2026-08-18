# Reference spec — concrete examples for AI and test authors.
# Source: src/utils/TimeUtils.ts
# Tests:  tests/unit/TimeUtils.test.js

@vidply @TimeUtils @unit
Feature: TimeUtils — duration and clock formatting
  Object with formatTime, parseTime, formatDuration, formatPercentage, formatBehindLive.

  Background:
    Given the TimeUtils module is loaded
    And i18n is initialized with English defaults

  @formatTime @happy-path
  Scenario Outline: Format seconds as clock time
    When TimeUtils.formatTime is called with <seconds> and alwaysShowHours <showHours>
    Then the result should be "<expected>"

    Examples:
      | seconds | showHours | expected |
      | 125     | false     | 02:05    |
      | 3661    | false     | 01:01:01 |
      | 45      | true      | 00:00:45 |

  @formatTime @guard
  Scenario Outline: Normalize invalid seconds to zero display
    When TimeUtils.formatTime is called with <seconds> and alwaysShowHours false
    Then the result should be "00:00"

    Examples:
      | seconds |
      | -1      |
      | NaN     |

  @parseTime @happy-path
  Scenario Outline: Parse clock strings to seconds
    When TimeUtils.parseTime is called with "<input>"
    Then the result should be <seconds>

    Examples:
      | input    | seconds |
      | 1:30     | 90      |
      | 1:01:01  | 3661    |
      | 45       | 45      |

  @formatPercentage @guard
  Scenario: Avoid division by zero
    When TimeUtils.formatPercentage is called with value 50 and total 0
    Then the result should be 0

  @formatBehindLive @happy-path
  Scenario: Prefix live delay with minus sign
    When TimeUtils.formatBehindLive is called with 754
    Then the result should start with the Unicode minus sign
    And the result should contain "12:34"
