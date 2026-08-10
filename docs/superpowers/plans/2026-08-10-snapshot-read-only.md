# Project Snapshot Read-Only Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move serve's `readOnly` capability into `ProjectSnapshot` and remove `GET /api/options`.

**Architecture:** The snapshot service owns an immutable `readOnly` value and includes it in all snapshot shapes. The CLI injects this value into the service, while the Express server still receives it to block writes. Angular derives its conservative editing capability from the project snapshot resource rather than a second HTTP request.

**Tech Stack:** TypeScript, Express, Node built-in test runner, Angular 22 signals/httpResource, Vitest, SpecBoxTMS YAML.

## Global Constraints

- `--read-only` defaults to `false`; writable behavior and existing 403 protections remain unchanged.
- `ProjectSnapshot.readOnly` is required in normal, empty, and invalid-config snapshots.
- Remove `/api/options` completely; do not leave a compatibility route.
- UI is read-only before `/api/project` has a valid value or if it fails.
- Do not create, amend, merge, tag, or push a Git commit; leave all changes uncommitted for review.

---

## File structure

- Modify `src/lib/serve/models.ts` and `src/lib/serve/snapshot.ts` for the backend snapshot contract and construction.
- Modify `src/commands/serve.ts` so the service receives the CLI flag.
- Modify `src/lib/serve/server.ts` to remove the options route and keep write rejection.
- Modify `test/serve/10-project-snapshot-get.test.ts` and `test/cli/20-serve-read-only.test.ts`; delete `test/serve/15-options-get.test.ts`.
- Modify `serve-ui/src/app/model/project-snapshot.model.ts`, `core/project.service.ts`, and its test to consume the embedded flag.
- Modify `specs/serve/00-serve-backend.spec.yml` and `16-read-only-ui.spec.yml`; delete `15-options-get.spec.yml`.

### Task 1: Move the backend contract to ProjectSnapshot

**Files:**
- Modify: `src/lib/serve/models.ts`
- Modify: `src/lib/serve/snapshot.ts`
- Modify: `src/commands/serve.ts`
- Modify: `src/lib/serve/server.ts`
- Modify: `test/serve/10-project-snapshot-get.test.ts`
- Modify: `test/cli/20-serve-read-only.test.ts`
- Delete: `test/serve/15-options-get.test.ts`

**Interfaces:**
- Produces: `ProjectSnapshot.readOnly: boolean` and `new ProjectSnapshotService(projectRoot, configPath?, readOnly?)`.
- Consumes: `StartServerOptions.readOnly?: boolean` only for mutation middleware.

- [ ] **Step 1: Write the failing snapshot contract tests**

In `test/serve/10-project-snapshot-get.test.ts`, add a test that constructs `new ProjectSnapshotService(project.root, '.tms.json', true)`, refreshes it, and asserts `snapshot.readOnly === true`. Extend the `GET /api/project` test to start with a real read-only snapshot service and assert its JSON has `readOnly: true`; add an invalid-config assertion that the snapshot keys include `readOnly` and it remains true.

- [ ] **Step 2: Verify RED**

Run: `node --test -r ts-node/register test/serve/10-project-snapshot-get.test.ts`

Expected: FAIL because the constructor has no third argument and snapshots do not expose `readOnly`.

- [ ] **Step 3: Implement the minimal backend model change**

Add `readOnly: boolean` to `ProjectSnapshot` in `src/lib/serve/models.ts`. Add a `readOnly = false` constructor parameter to `ProjectSnapshotService`; pass it to `emptySnapshot` and `invalidConfigSnapshot`, and include `readOnly: this.readOnly` in the successful refresh object. In `cmdServe`, create the service with `new ProjectSnapshotService(process.cwd(), config, readOnly)`. Remove `app.get('/api/options', ...)` from `startServer`; retain the existing `readOnly` request guard.

- [ ] **Step 4: Verify GREEN**

Run: `node --test -r ts-node/register test/serve/10-project-snapshot-get.test.ts test/cli/20-serve-read-only.test.ts`

Expected: PASS; snapshots are writable by default and read-only when the CLI mode was supplied.

- [ ] **Step 5: Remove the obsolete endpoint test**

Delete `test/serve/15-options-get.test.ts`, then run:

`node --test -r ts-node/register test/serve/10-project-snapshot-get.test.ts test/cli/20-serve-read-only.test.ts`

Expected: PASS without a test targeting `/api/options`.

### Task 2: Consume ProjectSnapshot.readOnly in the UI

**Files:**
- Modify: `serve-ui/src/app/model/project-snapshot.model.ts`
- Modify: `serve-ui/src/app/core/project.service.ts`
- Modify: `serve-ui/src/app/core/project.service.spec.ts`
- Modify: `serve-ui/src/app/pages/features/features-page.spec.ts`

**Interfaces:**
- Consumes: `ProjectSnapshot.readOnly: boolean` from `/api/project`.
- Produces: `ProjectService.readOnly(): boolean`, true until a project value exists, then equal to its `readOnly` field.

- [ ] **Step 1: Write the failing UI tests**

Replace option-request expectations in `project.service.spec.ts` with one test that flushes `/api/project` containing `{ readOnly: false, features: [], trees: [] }` and expects `service.readOnly()` to become false, and one that fails `/api/project` and expects it to remain true. Assert `http.verify()` sees no `/api/options` request. Update the `FeaturesPage` test stub's snapshot resource so the mode tests still exercise the service signal.

- [ ] **Step 2: Verify RED**

Run: `npm --prefix serve-ui test -- --include src/app/core/project.service.spec.ts --watch=false`

Expected: FAIL because `ProjectService` still reads `optionsResource` and requests `/api/options`.

- [ ] **Step 3: Implement the minimal UI change**

Add `readOnly: boolean` to the Angular `ProjectSnapshot` type. Delete `ServeOptions` and `optionsResource` from `ProjectService`; define `readOnly` as `computed(() => this.projectResource.hasValue() ? this.projectResource.value().readOnly : true)`. Do not change existing feature-page mode normalization other than test fixtures required by the stricter snapshot type.

- [ ] **Step 4: Verify GREEN**

Run: `npm --prefix serve-ui test -- --include src/app/core/project.service.spec.ts --include src/app/pages/features/features-page.spec.ts --watch=false`

Expected: PASS; the UI performs only the project request and permits edit mode only after a writable snapshot arrives.

### Task 3: Update requirements and validate the integrated change

**Files:**
- Modify: `specs/serve/00-serve-backend.spec.yml`
- Modify: `specs/serve/16-read-only-ui.spec.yml`
- Delete: `specs/serve/15-options-get.spec.yml`

**Interfaces:**
- Consumes: snapshot-based capability behavior from Tasks 1–2.
- Produces: requirements that no longer mention `/api/options` or `serve-options-get`.

- [ ] **Step 1: Update SpecBox requirements**

Remove the `/api/options` route bullet from `00-serve-backend.spec.yml` and delete `15-options-get.spec.yml`. In `16-read-only-ui.spec.yml`, replace the two availability assertions with: `До ответа GET /api/project и при HTTP-ошибке интерфейс остаётся только для чтения` and `После успешного ответа GET /api/project интерфейс использует поле ProjectSnapshot.readOnly`. Replace the editable-mode assertion reference to `/api/options` with `ProjectSnapshot.readOnly false`.

- [ ] **Step 2: Validate requirements**

Run: `npx spec-box validate`

Expected: exit code 0 and no dangling `serve-options-get` references.

- [ ] **Step 3: Run backend verification**

Run: `npm test`

Expected: exit code 0 with all Node tests passing.

- [ ] **Step 4: Build the UI**

Run: `npm --prefix serve-ui run build`

Expected: exit code 0.

- [ ] **Step 5: Inspect the final diff**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the planned source, test, specification, and uncommitted design/plan files are listed.
