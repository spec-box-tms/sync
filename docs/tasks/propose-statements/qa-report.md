# QA report: propose statements

Date: 2026-07-31

## Scope

Verified the `propose` statement flow through YAML decoding, domain validation,
automation matching, coverage, dependency graph, Markdown export, local current and
historical APIs, and Angular presentation/comparison.

Remote propose upload is deliberately deferred. The existing assert-only upload
payload keeps assertions and omits proposes; four remote-upload requirements remain
`propose` items in `propose-processing`.

## Acceptance evidence

- `npm test`: passed. The generated JUnit report contains 80 backend/spec test cases
  and no failure or error elements; helper tests passed 2/2.
- `npm --prefix serve-ui test -- --watch=false`: passed 7 files and 17 tests.
- `npm run build`: passed. Angular reports the pre-existing initial-bundle budget
  warning (1.25 MB versus 500 kB), but emits the production bundle successfully.
- `npm start -- validate`: passed with `VALIDATION` and no diagnostics.
- `git diff --check`: passed with no whitespace errors.

## Behavior covered

- Mixed `assert` and `propose` items preserve source order.
- Invalid zero-key and two-key statement shapes are rejected.
- Titles collide across statement types, so changing propose to assert does not
  create a second item.
- Proposes never become automated and do not affect coverage counters.
- Propose links participate in validation and the dependency graph.
- Local APIs and history preserve statement type and expose proposes as
  `isAutomated: false`.
- The UI uses a neutral `Предложение` badge, preserves description behavior, and
  displays propose-to-assert as one type change.
- Legacy remote upload excludes proposes without changing the generated remote API
  client.

## Risks and deferred work

- Remote propose upload is not implemented by request. Implement it only after the
  generated client exposes `UploadProposeModel` and a discriminated statement array.
- Angular's native LMDB disk cache aborts under the current Node 24/macOS environment.
  The workspace disables Angular disk caching to keep production builds reliable;
  incremental local builds may be slower.
