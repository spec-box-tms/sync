# QA Report — `specs/serve`

## Scope

Read-only requirements and traceability review of all 12 SpecBox YAML files in
`specs/serve`, including the local backend test suite and SpecBox validation.
No acceptance criteria or implementation files were changed.

## Result

**Not accepted for SpecBox-traceable automated coverage.** The serve backend
test suite is green, but two response-model specifications contradict the
implemented contract. `spec-box validate` did not complete: it produced no
output and was interrupted.

## Evidence

- `node --test -r ts-node/register test/serve/**/*.test.ts` (with loopback
  access) — **69 passed, 0 failed**.
- `npx spec-box validate` — interrupted after 60 seconds without output
  (exit 130); no successful SpecBox/JUnit binding evidence is available.
- `.tms.json` expects `test-results/junit.xml` with the keys `featureCode`,
  `featureTitle`, `groupTitle`, and `assertionTitle`.

## Defects

### SB-SERVE-001 — response model uses the wrong assertion status field

**Severity:** High

**Reproduction:** Read the response model in
`specs/serve/20-feature-current-get.spec.yml:16-17` or
`specs/serve/30-feature-revision-get.spec.yml:16-17`, then call the
corresponding endpoint for a feature containing an `assert`.

**Expected:** The declared response model and the observable response use the
same assertion field.

**Actual:** Both specifications declare `isAutomated: boolean`, whereas the
implemented and tested API exposes `status` with the values `automated`,
`skipped`, `failed`, or `not-automated` (`src/lib/serve/models.ts:68` and
`test/serve/20-feature-current-get.test.ts:92-95`). The current-feature spec
itself also requires a computed `status`, contradicting its type declaration.

**Risk:** Consumers implementing the published contract will read a field that
does not exist; the revision-response contract has the same defect.

**Recommended resolution:** Route this to analysis and replace the two model
fragments with the agreed `status` discriminated union. Add an explicit
revision-response assertion for `status` if that field is part of its public
contract.

### SB-SERVE-002 — automated test title has no exact SpecBox assertion

**Status:** Resolved on 2026-08-10.

The regression test in `test/serve/10-project-snapshot-get.test.ts` now uses
the exact assertion title `Корректный ProjectSnapshot содержит обязательное
boolean-поле readOnly`, and its mapped test file passes 19/19. The historical
finding and resolution evidence remain below.

**Severity:** Medium

**Reproduction:** Compare
`test/serve/10-project-snapshot-get.test.ts:177` with the assertions under
`specs/serve/10-project-snapshot-get.spec.yml:60-68`.

**Expected:** A SpecBox-traceable automated test title exactly matches its YAML
`assert` text.

**Actual:** The test title is `ProjectSnapshot сохраняет режим readOnly,
переданный при создании сервиса`; no assertion has that exact text. The related
requirements only state that valid and empty snapshots contain a boolean
`readOnly` field.

**Risk:** The test cannot be reliably linked to an acceptance criterion in the
configured JUnit-to-SpecBox mapping, so its coverage can be omitted or reported
as unbound.

**Recommended resolution:** Either rename the test to the intended existing
assertion, or add a product-level assertion that the server mode is preserved
in each refreshed snapshot. The choice changes acceptance criteria and should
go through analysis.

## Coverage and release risks

- `serve-read-only-ui` has four frontend assertions. Frontend SpecBox coverage
  is explicitly out of scope in the current workflow, so these requirements
  have no accepted JUnit evidence.
- `serve-proposes` has nine frontend assertions with no backend `specTest`
  title matches. This is the same workflow limitation, not evidence that the
  UI behavior is absent.
- The endpoint-level backend scenarios are otherwise testable and the 69-test
  `test/serve` suite passed, including happy paths, missing resources,
  validation errors, read-only write rejection, invalid configuration,
  watcher events, and Git-history error recovery.

## Recommended next checks

1. Resolve SB-SERVE-001 and SB-SERVE-002 through requirements analysis.
2. Regenerate `test-results/junit.xml` from the full mapped test command and
   run `spec-box validate` to a successful completion.
3. Define a frontend SpecBox coverage workflow before accepting UI assertions
   as automated coverage.
