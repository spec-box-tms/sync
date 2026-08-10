# Serve Read-Only Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `spec-box serve --read-only` mode that blocks specification writes and removes editing controls from the serve UI.

**Architecture:** The CLI passes an explicit `readOnly` boolean to the local Express server. The server exposes it through `GET /api/options` and rejects both mutating specification routes before they reach `FeatureService`. Angular loads that capability through `ProjectService` and only permits the presenter’s edit mode when the server has explicitly reported writable mode.

**Tech Stack:** TypeScript, yargs, Express, Node built-in test runner, Angular 22 signals/httpResource, Vitest, SpecBoxTMS YAML requirements.

## Global Constraints

- `--read-only` defaults to `false`; omitted flags preserve all existing writable behavior.
- `GET /api/options` responds with exactly `{ readOnly: boolean }`.
- Read-only `POST /api/features` and `PUT /api/features/:code/yaml` respond with HTTP 403 and do not modify the working copy.
- A UI loading or options error state is treated as read-only; after a successful response, the bundled UI trusts the typed `readOnly` field directly.
- Do not create, amend, merge, tag, or push a Git commit; leave all changes uncommitted for user review.

---

## File structure

- Modify `src/commands/serve.ts` to define and pass the CLI option.
- Modify `src/lib/serve/server.ts` to hold the server option, expose `/api/options`, and guard write routes.
- Create `specs/serve/15-options-get.spec.yml` for the options API contract.
- Modify `specs/serve/00-serve-backend.spec.yml`, `specs/serve/40-feature-create-post.spec.yml`, and `specs/serve/50-feature-update-put.spec.yml` to document the flag, route, and 403 behavior.
- Create `test/serve/15-options-get.test.ts` and extend existing POST/PUT tests with read-only no-mutation coverage.
- Create `test/cli/20-serve-read-only.test.ts` for omitted and present CLI flag parsing and propagation.
- Modify `serve-ui/src/app/core/project.service.ts` to load the server capability and publish a conservative computed flag.
- Create `serve-ui/src/app/core/project.service.spec.ts` for loading, error, and writable resource states.
- Modify `serve-ui/src/app/pages/features/features-page.ts` and `.html` to normalize only a direct read-only `?mode=edit` URL to view before children receive the mode; modify `feature-presenter` only to hide edit controls.
- Create `serve-ui/src/app/pages/features/feature-presenter/feature-presenter.spec.ts` for the user-visible capability behavior.

### Task 1: Specify the read-only API and behavior

**Files:**
- Create: `specs/serve/15-options-get.spec.yml`
- Modify: `specs/serve/00-serve-backend.spec.yml`
- Modify: `specs/serve/40-feature-create-post.spec.yml`
- Modify: `specs/serve/50-feature-update-put.spec.yml`

**Interfaces:**
- Produces: the requirement IDs and assertion titles consumed by the server tests in Task 2.

- [ ] **Step 1: Add the server route to the backend feature description**

Add `GET /api/options — параметры режима сервера: $serve-options-get.` to the route list in `specs/serve/00-serve-backend.spec.yml`. Add an assertion stating that `serve --read-only` starts the same loopback-only server with specification modifications disabled, while omitting the flag leaves it editable.

- [ ] **Step 2: Define the options endpoint feature**

Create `specs/serve/15-options-get.spec.yml`:

```yaml
feature: GET /api/options
code: serve-options-get
description: |-
  Возвращает параметры текущего экземпляра локального сервера serve.
  ```ts
  interface ServeOptionsResponse { readOnly: boolean; }
  ```
definitions:
  tool:
    - serve
  module:
    - backend
specs-unit:
  Режим сервера:
    - assert: GET /api/options возвращает HTTP 200 и JSON с единственным boolean-полем readOnly
    - assert: GET /api/options возвращает readOnly true для serve --read-only и false без флага
```

- [ ] **Step 3: Add the creation protection requirement**

Under `Проверка запроса` in `specs/serve/40-feature-create-post.spec.yml`, add:

```yaml
    - assert: POST /api/features в режиме serve --read-only возвращает HTTP 403 и не создаёт каталоги или YAML-файлы
```

- [ ] **Step 4: Add the update protection requirement**

Under `Ошибки сохранения` in `specs/serve/50-feature-update-put.spec.yml`, add:

```yaml
    - assert: PUT /api/features/:code/yaml в режиме serve --read-only возвращает HTTP 403 и не меняет YAML-файл
```

- [ ] **Step 5: Validate requirement syntax and mappings**

Run: `npx spec-box validate`

Expected: exit code 0 with the new feature and updated assertions accepted by the configured SpecBox validation.

### Task 2: Add server and CLI capability behavior using TDD

**Files:**
- Create: `test/serve/15-options-get.test.ts`
- Modify: `test/serve/40-feature-create-post.test.ts`
- Modify: `test/serve/50-feature-update-put.test.ts`
- Modify: `src/commands/serve.ts`
- Modify: `src/lib/serve/server.ts`

**Interfaces:**
- Consumes: `StartServerOptions.readOnly?: boolean` and the Task 1 SpecBox assertion titles.
- Produces: `GET /api/options -> { readOnly: boolean }` and `403` write protection for Task 3’s frontend resource.

- [ ] **Step 1: Write the failing options endpoint tests**

Create a `withServer(readOnly, fn)` helper in `test/serve/15-options-get.test.ts` that passes `readOnly` to `startServer`. Add these spec-mapped tests:

```ts
specTest('serve-options-get', 'GET /api/options', 'Режим сервера', 'GET /api/options возвращает HTTP 200 и JSON с единственным boolean-полем readOnly', () => withServer(false, async (url) => {
  const response = await fetch(`${url}/api/options`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { readOnly: false });
}));

specTest('serve-options-get', 'GET /api/options', 'Режим сервера', 'GET /api/options возвращает readOnly true для serve --read-only и false без флага', () => withServer(true, async (url) => {
  assert.deepEqual(await (await fetch(`${url}/api/options`)).json(), { readOnly: true });
}));
```

- [ ] **Step 2: Run the options tests and verify RED**

Run: `node --test -r ts-node/register test/serve/15-options-get.test.ts`

Expected: FAIL because `StartServerOptions` has no `readOnly` property and `/api/options` does not exist.

- [ ] **Step 3: Write failing no-mutation write-route tests**

Extend both existing test helpers with an optional `readOnly = false` parameter and pass it to `startServer`. Add a POST test that sends a valid nested path under a read-only server, asserts `403`, asserts the response JSON identifies `read-only`, and asserts the target directory is absent. Add a PUT test that reads the original YAML, sends a valid body and current ETag under a read-only server, asserts `403`, then byte-compares the file to the original.

- [ ] **Step 4: Run the write-route tests and verify RED**

Run: `node --test -r ts-node/register test/serve/40-feature-create-post.test.ts test/serve/50-feature-update-put.test.ts`

Expected: the new tests FAIL because valid writes still return 201/200 and mutate the fixture project.

- [ ] **Step 5: Implement the minimal CLI and server contract**

In `src/commands/serve.ts`, extend `ServeOptions` and the yargs builder:

```ts
type ServeOptions = CommonOptions & { port: number; readOnly: boolean };

.option('read-only', {
  type: 'boolean',
  default: false,
  describe: 'Запустить сервер без возможности изменять спецификации',
})
```

Destructure `readOnly` in the handler and pass it to `startServer`.

In `src/lib/serve/server.ts`, add `readOnly?: boolean` to `StartServerOptions`, default it to `false` in the `startServer` destructuring, and install:

```ts
app.get('/api/options', (_req, res) => res.json({ readOnly }));

const rejectWhenReadOnly = (_req: express.Request, res: express.Response, next: express.NextFunction) =>
  readOnly
    ? res.status(403).json({ errors: [{ code: 'read-only', message: 'Сервер запущен в режиме только для чтения', path: '' }] })
    : next();
```

Register `rejectWhenReadOnly` for `POST /api/features` and `PUT /api/features/:code/yaml` before the global body parsers. Keep `express.raw(...)` on the writable PUT route so content parsing remains compatible, but ensure malformed or unsupported bodies cannot take precedence over read-only mode.

- [ ] **Step 6: Run the targeted tests and verify GREEN**

Run: `node --test -r ts-node/register test/serve/15-options-get.test.ts test/serve/40-feature-create-post.test.ts test/serve/50-feature-update-put.test.ts`

Expected: all tests pass, including the existing writable create/update cases.

- [ ] **Step 7: Type-check the backend**

Run: `npx tsc --noEmit`

Expected: exit code 0.

### Task 3: Gate Angular editing on the server capability using TDD

**Files:**
- Create: `serve-ui/src/app/pages/features/feature-presenter/feature-presenter.spec.ts`
- Modify: `serve-ui/src/app/core/project.service.ts`
- Modify: `serve-ui/src/app/pages/features/feature-presenter/feature-presenter.ts`
- Modify: `serve-ui/src/app/pages/features/feature-presenter/feature-presenter.html`

**Interfaces:**
- Consumes: `GET /api/options` response `{ readOnly: boolean }` from Task 2.
- Produces: `ProjectService.readOnly(): boolean`, which is true until the options resource resolves and then reflects its typed `readOnly` field directly.

- [ ] **Step 1: Write failing presenter tests for both modes**

Create a focused `FeaturePresenter` test suite. Provide a `ProjectService` stub where `readOnly` is a writable Angular signal and use a minimal feature/project input. Verify that `readOnly.set(true)` yields no anchor whose text includes `Редактировать`, no `Сохранить` button, and no `feature-editor` element even when `mode` is set to `edit`. Verify that `readOnly.set(false)` and `mode` `view` render the edit link, and `mode` `edit` render the save button and editor.

- [ ] **Step 2: Run the presenter tests and verify RED**

Run: `npm --prefix serve-ui test -- --include src/app/pages/features/feature-presenter/feature-presenter.spec.ts --watch=false`

Expected: FAIL because the presenter currently always renders edit controls and honors `mode=edit`.

- [ ] **Step 3: Add the conservative options resource**

In `serve-ui/src/app/core/project.service.ts`, add:

```ts
export interface ServeOptions { readOnly: boolean; }

readonly optionsResource = httpResource<ServeOptions>(() => `${this.apiUrl}/api/options`);
readonly readOnly = computed(() =>
  this.optionsResource.hasValue() ? this.optionsResource.value().readOnly : true,
);
```

Import `computed` from `@angular/core`. This makes loading and failed requests read-only without adding a separate mutable client state; a successful response is trusted as the bundled CLI contract.

- [ ] **Step 4: Apply the capability to presenter state and template**

Inject `ProjectService` into `FeaturesPage`, expose its `readOnly` computed signal, and add:

```ts
readonly mode = computed(() =>
  this.readOnly() && this.queryMode() === 'edit' ? 'view' : this.queryMode(),
);
```

Pass `FeaturesPage.mode()` to the presenter. Render the `Редактировать` link only when `!readOnly()`. The presenter uses its `mode` input directly, so `compare` and `graph` remain available in read-only mode. No change is required to `FeatureEditor`, because a read-only direct `?mode=edit` is normalized before the presenter is instantiated.

- [ ] **Step 5: Run the presenter tests and verify GREEN**

Run: `npm --prefix serve-ui test -- --include src/app/pages/features/feature-presenter/feature-presenter.spec.ts --watch=false`

Expected: all new read-only and writable presenter tests pass.

- [ ] **Step 6: Run the UI build**

Run: `npm --prefix serve-ui run build`

Expected: Angular production build completes with exit code 0.

### Task 4: Run end-to-end repository verification

**Files:**
- Verify only: all files changed in Tasks 1–3.

**Interfaces:**
- Consumes: completed server and UI behavior from prior tasks.
- Produces: fresh validation evidence for handoff.

- [ ] **Step 1: Run SpecBox validation**

Run: `npx spec-box validate`

Expected: exit code 0.

- [ ] **Step 2: Run all backend tests**

Run: `npm test`

Expected: exit code 0 and no failing Node tests.

- [ ] **Step 3: Run all Angular tests**

Run: `npm --prefix serve-ui test -- --watch=false`

Expected: exit code 0 and no failing Vitest tests.

- [ ] **Step 4: Check changed files and whitespace**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; status lists only the intended uncommitted read-only design, plan, requirements, tests, and implementation changes.
