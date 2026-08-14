# Empty JUnit Report Design

## Goal

Treat a configured JUnit XML report with no test suites as a valid report that contains no test results.

## Behavior

- An empty `<testsuites/>` collection maps to a `TestReport` with `total: 0`, `duration: 0`, and an empty `testResults` array.
- The report uses `startTime: 0`, matching the neutral values used for the synthetic empty suite representation.
- Valid nested and flat JUnit reports retain their current decoding and matching behavior.
- Non-empty malformed JUnit reports remain validation errors.

## Implementation

Normalize the parsed JUnit XML input before applying the existing decoder. The normalization supplies an empty `<testsuites>` data structure only when xml2js has parsed an empty `<testsuites/>` element. The existing mapping code can then return a zero-result report without special cases in commands that load JUnit reports.

## Testing

Add a focused unit test around `loadJUnitReport` using an empty `<testsuites/>` XML fixture. The test will assert that loading succeeds and returns the neutral empty report. Existing CLI and serve tests continue to cover integrations and malformed-report diagnostics.
