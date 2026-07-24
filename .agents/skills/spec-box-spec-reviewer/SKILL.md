---
name: spec-box-spec-reviewer
description: "Use for SpecBox QA work: shift-left requirements review, SpecBox testability checks, final testing, qa-report.md, regression, negative scenarios, and acceptance confirmation."
---

# SpecBox Spec Reviewer

## Inputs

- Related SpecBox YAML from `specs/`.
- `task.md`, `technical-spec.md`, acceptance criteria, and implementation notes.
- Logs, traces, replay artifacts, fixtures, and test entry points.

## Requirements Quality Checks

- Review requirements and acceptance criteria for correctness, completeness,
  feasibility, necessity, priority, unambiguity, and verifiability.
- Check the specification for consistency, traceability, and safe changeability.
- Require an observable product scenario: actor, trigger, expected behavior,
  and outcome; require measurable limits where timing, volume, or quality
  matters.
- Reject implementation-led wording (classes, services, queues, databases,
  algorithms) unless it is an explicit legal, security, integration, or
  platform constraint. Request the intended product behavior instead.

## Workflow

5. Cover happy path, negative cases, regressions, state transitions, recovery behavior, and diagnostics.
6. Run the smallest relevant backend spec checks through
   `scripts/run-spec-tests.sh`, using `--service <app>` or
   `--feature <feature-code>` for partial runs.
7. Confirm the JUnit report exists when automated coverage should be synced to
   SpecBoxTMS.
8. Run `spec-box validate` to verify specs and test-report binding before
   accepting SpecBoxTMS-traceable automated coverage.
9. Add missing tests only where evidence is weak.
10. Write results in `docs/tasks/<task-id>/qa-report.md`.

## SpecBoxTMS Checks

- Require stable unique `code`, valid `definitions`, and traceable assertions.
- Require assertions for testable behavior; allow assertion-free overview features only for explanatory docs.
- Reject fake assertions added only to fill the template.
- For automated coverage, the JUnit test title/property configured in
  `.tms.json` must match the SpecBoxTMS key segments; `assert` text must match
  exactly.
- Verify class docstring is `<feature-code> <specs-unit group title>` and test
  method docstring is the exact YAML `assert` text for SpecBoxTMS-traceable
  tests.
- Use `spec-box validate` after generating `test-results/junit.xml`; it must
  pass before QA treats automated coverage as linked to specs.
- Backend spec tests should live in `apps/<app>/tests/specs/<module>/`; specs
  with more than 20 assertions may be split into
  `apps/<app>/tests/specs/<module>/<feature-code>/` by group.
- `spec-box sync -v <version>` is the normal task-closure sync after specs,
  code, and automated tests are ready. `spec-box upload-stat` is only for
  test-only coverage updates where specs did not change.
- Frontend spec-test coverage is out of scope until its workflow is defined.

## Output

- Requirements review findings or QA acceptance evidence.
- Defects with reproduction steps, expected behavior, actual behavior, and logs when available.
- Release risks and recommended additional checks.

## Boundaries

- Do not accept untestable requirements.
- Do not change acceptance criteria without routing back to analysis.
- Do not replace SpecBoxTMS requirements with implicit assumptions.
- Return defects with evidence, expected behavior, and reproduction steps.
