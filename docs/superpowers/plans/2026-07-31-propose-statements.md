# Propose Statements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ordered `propose` statements beside `assert` statements throughout YAML loading, validation, local APIs, Markdown, and the Angular editor. Remote propose uploading is deferred; the legacy upload path must continue uploading assertions and omit proposes.

**Architecture:** Preserve `AssertionGroup.assertions` as the ordered collection, but make its element a discriminated `Statement` union. Carry `type: 'assert' | 'propose'` through local boundaries; only the assert branch can be automated or counted as coverage. Until remote propose uploading is implemented, filter proposes from the legacy assert-only upload payload.

**Tech Stack:** TypeScript 5, Node.js test runner, io-ts Decoder, YAML, Express, generated Azure Core client, Angular 22 signals, Taiga UI, Vitest.

## Global Constraints

- A YAML statement contains exactly one of `assert` and `propose`; both accept optional string `description`.
- Existing assertion-only YAML remains valid without migration.
- Preserve mixed statement order and keep the collection/API property name `assertions`.
- Titles are unique within a group across both statement types.
- Propose-to-assert conversion is a type change for the same group/title identity.
- Proposes participate in links, graph generation, Markdown, grouping, history, and comparison.
- Proposes never participate in test matching and never count toward `total`, `automated`, or `uncovered`.
- Remote propose upload is deferred; legacy upload includes assertions and omits proposes.
- Local UI copy for a propose is exactly `Предложение`; it never shows the negative automation indicator.
- Add no configuration option, migration command, or unrelated refactor.
- Do not commit a task before the user reviews its standard `git diff`; run the listed commit only after explicit approval.

---

## File Structure

- `src/lib/yaml/models.ts`: decode the mutually exclusive YAML statement shapes.
- `src/lib/domain/models.ts`: own the discriminated domain union.
- `src/lib/domain/index.ts`: map YAML statements into the domain while preserving order.
- `src/lib/validators/{models,validator}.ts`: validate cross-type duplicates and propose links.
- `src/lib/test-matcher/index.ts`: restrict report matching to assertions.
- `src/lib/serve/snapshot.ts`: compute assertion-only coverage/tree counts while retaining proposes in graphs.
- `src/lib/markdown/feature-to-markdown.ts`: label proposes in exported Markdown.
- `src/api/models/{index,mappers}.ts`: regenerated propose-aware remote contract.
- `src/lib/upload/upload-entities.ts`: map the domain union to the generated upload union.
- `src/lib/serve/{models,server}.ts`: expose statement types in current and historical local APIs.
- `serve-ui/src/app/model/assertion.model.ts`: mirror the statement union in Angular.
- `serve-ui/src/app/pages/features/assert/*`: render propose and assertion status differently.
- `serve-ui/src/app/pages/features/feature-item/*`: count assertions only.
- `serve-ui/src/app/pages/features/feature-compare/*`: detect and render a type transition.
- `test/proposes/*.test.ts`: executable acceptance tests for notation and processing specs.
- `test/serve/*.test.ts`: executable acceptance tests for local API behavior.
- `serve-ui/src/app/pages/features/**/*.spec.ts`: component and comparison regression tests.
- `README.md`: document propose notation and lifecycle.

---

### Task 1: Decode, Model, and Validate Mixed Statements

**Files:**
- Create: `test/proposes/10-propose-notation.test.ts`
- Modify: `package.json:18-20`
- Modify: `src/lib/yaml/models.ts:1-27`
- Modify: `src/lib/yaml/index.ts:4-8`
- Modify: `src/lib/domain/models.ts:1-10`
- Modify: `src/lib/domain/index.ts:7-43`
- Modify: `src/lib/validators/models.ts:1-88`
- Modify: `src/lib/validators/validator.ts:298-367`

**Interfaces:**
- Consumes: YAML group items shaped as `{assert, description?}` or `{propose, description?}`.
- Produces: `Statement = Assertion | Propose`, where `Assertion.type === 'assert'`, `Propose.type === 'propose'`, and every propose has `isAutomated: false`.
- Produces: unchanged `AssertionGroup.assertions: Statement[]` order for all later tasks.

- [x] **Step 1: Add the propose acceptance-test glob**

Change the root scripts so propose tests are included in the JUnit report and the existing validation helper path is correct:

```json
"test:serve": "mkdir -p test-results && node --test -r ts-node/register --test-reporter=junit test/serve/*.test.ts test/proposes/*.test.ts > test-results/junit.xml",
"test:unit": "node --test -r ts-node/register test/helpers/*.test.ts"
```

- [x] **Step 2: Write failing notation tests**

Create `test/proposes/10-propose-notation.test.ts`. Use `parseObject(parse(source), entityDecoder)` for decoder cases and `processYamlFiles` plus `Validator` for domain cases:

```ts
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { processYamlFiles } from '../../src/lib/domain';
import { parseObject } from '../../src/lib/utils';
import { Validator } from '../../src/lib/validators';
import { entityDecoder } from '../../src/lib/yaml/models';
import { specTest } from '../serve/spec-name';

const decode = (items: string) => parseObject(parse([
  'code: checkout',
  'feature: Checkout',
  'specs-unit:',
  '  Flow:',
  ...items.split('\n').map((line) => `    ${line}`),
].join('\n')), entityDecoder);

const project = (items: string) => processYamlFiles([
  {content: decode(items), fileName: 'checkout', filePath: 'checkout.spec.yml'},
], {filePath: '.spec-box-meta.yml', meta: {}});

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Формат YAML',
  'Элементы assert и propose могут находиться в одной группе specs-unit в любом порядке', () => {
    assert.deepEqual(project('- propose: Later\n- assert: Now').features[0].groups[0].assertions.map(({type}) => type), ['propose', 'assert']);
  });

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Формат YAML',
  'Элемент propose содержит строковое название в поле propose и может содержать строковое поле description', () => {
    assert.deepEqual(project('- propose: Later\n  description: Details').features[0].groups[0].assertions[0],
      {type: 'propose', title: 'Later', description: 'Details', isAutomated: false});
  });

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Формат YAML',
  'Каждый элемент группы specs-unit содержит ровно одно из полей assert и propose', () => {
    assert.doesNotThrow(() => decode('- assert: Now'));
    assert.doesNotThrow(() => decode('- propose: Later'));
  });
specTest('propose-notation', 'Предложения в YAML-спецификации', 'Формат YAML',
  'Элемент с одновременными полями assert и propose или без обоих полей отклоняется как некорректный YAML спецификации', () => {
    assert.throws(() => decode('- assert: Now\n  propose: Later'));
    assert.throws(() => decode('- description: Missing title'));
  });
specTest('propose-notation', 'Предложения в YAML-спецификации', 'Формат YAML',
  'Существующие спецификации только с элементами assert остаются корректными без миграции', () => {
    assert.doesNotThrow(() => decode('- assert: Now'));
  });

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Правила утверждений',
  'Порядок assert и propose из YAML сохраняется в модели проекта', () => {
    assert.deepEqual(project('- assert: First\n- propose: Second\n- assert: Third').features[0].groups[0].assertions.map(({title}) => title), ['First', 'Second', 'Third']);
  });

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Правила утверждений',
  'Два элемента одной группы с одинаковым названием считаются дубликатами независимо от их типа', () => {
    const data = project('- assert: Same\n- propose: Same');
    const validator = new Validator({});
    validator.validate(data);
    assert.ok(validator.errors.some(({type}) => type === 'assertion-duplicate'));
  });

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Правила утверждений',
  'Замена поля propose на assert переводит существующее утверждение из запланированного в обязательное', () => {
    assert.deepEqual(project('- propose: Same').features[0].groups[0].assertions[0].type, 'propose');
    assert.deepEqual(project('- assert: Same').features[0].groups[0].assertions[0].type, 'assert');
  });
```

Add the two link cases with their exact spec titles:

```ts
const linkedProject = (link: string) => processYamlFiles([
  {content: decode(`- propose: Planned ${link}\n  description: Details ${link}`), fileName: 'checkout', filePath: 'checkout.yml'},
  {content: parseObject(parse('code: known\nfeature: Known'), entityDecoder), fileName: 'known', filePath: 'known.yml'},
], {filePath: '.spec-box-meta.yml', meta: {}});

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Правила утверждений',
  'Ссылки на фичи в названии и description элемента propose валидируются так же, как ссылки элемента assert', () => {
    const validator = new Validator({});
    validator.validate(linkedProject('$known'));
    assert.equal(validator.errors.some(({type}) => type === 'feature-missing-link'), false);
  });

specTest('propose-notation', 'Предложения в YAML-спецификации', 'Правила утверждений',
  'Неразрешённая ссылка из propose создаёт существующую диагностику отсутствующей ссылки', () => {
    const validator = new Validator({});
    validator.validate(linkedProject('$missing'));
    assert.equal(validator.errors.filter(({type}) => type === 'feature-missing-link').length, 2);
  });
```

- [x] **Step 3: Run the notation tests and verify failure**

Run:

```bash
node --test -r ts-node/register test/proposes/10-propose-notation.test.ts
```

Expected: FAIL because `propose` is rejected and domain statements have no `type`.

- [x] **Step 4: Implement the mutually exclusive YAML decoder**

Replace the single decoder with an explicit branch selected from an unknown record, so an object with both or neither key fails before domain mapping:

```ts
import * as d from 'io-ts/Decoder';

const description = d.partial({description: d.string});
export const yamlAssertionDecoder = d.intersect(d.struct({assert: d.string}))(description);
export const yamlProposeDecoder = d.intersect(d.struct({propose: d.string}))(description);

export type YamlAssertion = d.TypeOf<typeof yamlAssertionDecoder> & {propose?: never};
export type YamlPropose = d.TypeOf<typeof yamlProposeDecoder> & {assert?: never};
export type Statement = YamlAssertion | YamlPropose;

export const statementDecoder: d.Decoder<unknown, Statement> = d.parse((value) => {
  const hasAssert = Object.prototype.hasOwnProperty.call(value, 'assert');
  const hasPropose = Object.prototype.hasOwnProperty.call(value, 'propose');
  if (hasAssert === hasPropose) return d.failure(value, 'exactly one of assert or propose');
  return (hasAssert ? yamlAssertionDecoder : yamlProposeDecoder).decode(value);
})(d.UnknownRecord);
```

Use `d.record(d.array(statementDecoder))` for `specs-unit`, and export the YAML `Statement` type from `src/lib/yaml/index.ts`.

- [x] **Step 5: Add the domain discriminated union and mapper**

Use separate branches and a shared group collection:

```ts
interface StatementBase { title: string; description?: string }
export interface Assertion extends StatementBase { type: 'assert'; isAutomated: boolean }
export interface Propose extends StatementBase { type: 'propose'; isAutomated: false }
export type Statement = Assertion | Propose;
export interface AssertionGroup { title: string; assertions: Statement[] }
```

Map by source key without reordering:

```ts
const mapStatement = (value: YmlStatement): Statement => 'assert' in value
  ? {type: 'assert', title: value.assert, description: value.description, isAutomated: false}
  : {type: 'propose', title: value.propose, description: value.description, isAutomated: false};
```

Export `Statement` and `Propose` from `src/lib/domain/index.ts`.

- [x] **Step 6: Generalize validation to all statements**

Change `AssertionDuplicateError.assertion` to `Statement`. Keep duplicate identity as `statement.title`. For links, continue using the existing `assert.title` and `assert.description` diagnostic field values for backward compatibility while iterating both statement branches; no new diagnostic type is needed.

- [x] **Step 7: Run focused and type checks**

Run:

```bash
node --test -r ts-node/register test/proposes/10-propose-notation.test.ts
npx tsc --noEmit
```

Expected: both PASS.

- [ ] **Step 8: Review gate, then commit only after approval**

Show `git diff` to the user. After explicit approval:

```bash
git add package.json test/proposes/10-propose-notation.test.ts src/lib/yaml/models.ts src/lib/yaml/index.ts src/lib/domain/models.ts src/lib/domain/index.ts src/lib/validators/models.ts src/lib/validators/validator.ts
git commit -m "feat: add propose statement model"
```

---

### Task 2: Exclude Proposes from Automation and Export Them Correctly

**Files:**
- Create: `test/proposes/20-propose-processing.test.ts`
- Modify: `src/lib/test-matcher/index.ts:36-71`
- Modify: `src/lib/serve/snapshot.ts:58-66`
- Modify: `src/lib/markdown/feature-to-markdown.ts:20-33`

**Interfaces:**
- Consumes: `Statement` from Task 1.
- Produces: assertion-only matching/counting and Markdown where propose list items start with `**Предложение:**`.

- [x] **Step 1: Write failing automation, counter, graph, and Markdown tests**

Create `test/proposes/20-propose-processing.test.ts` with a shared feature containing one assert and one propose:

```ts
const statements: Statement[] = [
  {type: 'assert', title: 'Required', isAutomated: false},
  {type: 'propose', title: 'Planned $target', description: 'Later details', isAutomated: false},
];
const data: ProjectData = {
  project: {}, attributes: [], trees: [], metaFilePath: '.spec-box-meta.yml',
  features: [{code: 'source', title: 'Source', fileName: 'source', filePath: 'source.yml', groups: [{title: 'Flow', assertions: statements}]}],
};
```

Use the exact “Автоматизация и покрытие” acceptance names. The first two share this report setup:

```ts
const report = {testResults: [
  {name: 'Source Flow Required', filePath: 'test.ts', status: 'passed'},
  {name: 'Source Flow Planned $target', filePath: 'test.ts', status: 'passed'},
]};
applyTestReport(new Validator({}), data, report, ['featureTitle', 'groupTitle', 'assertionTitle']);
assert.equal(statements[0].isAutomated, true);
assert.equal(statements[1].isAutomated, false);
```

Wrap that setup in these exact tests:

```ts
specTest('propose-processing', 'Обработка предложений', 'Автоматизация и покрытие',
  'Сопоставление с отчётами Jest и JUnit выполняется только для элементов типа assert', () => {
    assert.equal(statements[0].isAutomated, true);
  });
specTest('propose-processing', 'Обработка предложений', 'Автоматизация и покрытие',
  'Элемент propose остаётся неавтоматизированным при наличии теста с совпадающим составным именем', () => {
    assert.equal(statements[1].isAutomated, false);
  });
```

For coverage, use `createProject()`, overwrite its YAML with one assert and one propose, create a matching one-test JUnit report and one-level metadata tree, then assert:

```ts
specTest('propose-processing', 'Обработка предложений', 'Автоматизация и покрытие',
  'Propose не входит в total, automated и uncovered проекта, деревьев и списка фич', async () => {
    const snapshot = await new ProjectSnapshotService(project.root).refresh();
    assert.deepEqual(snapshot.coverage, {total: 1, automated: 1, uncovered: 0});
    assert.deepEqual(
      {total: snapshot.trees[0].totalCount, automated: snapshot.trees[0].automatedCount},
      {total: 1, automated: 1},
    );
  });
specTest('propose-processing', 'Обработка предложений', 'Автоматизация и покрытие',
  'После замены propose на assert утверждение участвует в сопоставлении тестов и показателях покрытия при следующем пересчёте проекта', async () => {
    await writeFile(featurePath, source.replace('- propose: Planned', '- assert: Planned'));
    const snapshot = await service.refresh();
    assert.deepEqual(snapshot.coverage, {total: 2, automated: 1, uncovered: 1});
  });
```

For graph behavior, add target feature `target` and assert the snapshot edge is `{from: 'source', to: 'target', resolved: true}`.

For Markdown, call `featureToMarkdown` and assert ordered substrings:

```ts
specTest('propose-processing', 'Обработка предложений', 'Остальная обработка',
  'Propose участвует в построении графа зависимостей по ссылкам из названия и description', async () => {
    assert.deepEqual(snapshot.dependencyGraph.edges, [{from: 'source', to: 'target', resolved: true}]);
  });
specTest('propose-processing', 'Обработка предложений', 'Остальная обработка',
  'Markdown-экспорт включает propose в исходной группе и порядке и явно помечает его как предложение', () => {
    assert.match(markdown, /- Required[\s\S]*- \*\*Предложение:\*\* Planned \$target/);
    assert.match(markdown, /> Later details/);
  });
```

- [x] **Step 2: Run the processing tests and verify failure**

Run:

```bash
node --test -r ts-node/register test/proposes/20-propose-processing.test.ts
```

Expected: FAIL because the matcher automates proposes, counters include them, and Markdown has no propose label.

- [x] **Step 3: Filter test matching to assertions**

At the inner loop boundary, skip proposes before constructing the match key:

```ts
for (const assertion of assertions || []) {
  if (assertion.type !== 'assert') continue;
  // existing key construction and matching
}
```

This leaves matching test names unused, which is consistent with proposes not being automation targets.

- [x] **Step 4: Count assertions only**

Change `assertionCounts` to filter before totals:

```ts
const assertions = features
  .flatMap((feature) => feature.groups.flatMap((group) => group.assertions))
  .filter((statement): statement is Assertion => statement.type === 'assert');
```

The existing tree recursion will then inherit assertion-only totals without a second counter implementation. Leave graph extraction unchanged because it already reads every group item.

- [x] **Step 5: Label proposes in Markdown**

Pass the full `Statement` into the renderer:

```ts
function mdFeatureStatement(statement: Statement) {
  const label = statement.type === 'propose' ? '**Предложение:** ' : '';
  let result = `- ${label}${statement.title.trim()}\r\n\r\n`;
  if (statement.description) result += `${mdDescriptionToQuote(statement.description)}\r\n\r\n`;
  return result;
}
```

- [x] **Step 6: Run focused tests**

Run:

```bash
node --test -r ts-node/register test/proposes/10-propose-notation.test.ts test/proposes/20-propose-processing.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Review gate, then commit only after approval**

After the user reviews `git diff` and approves:

```bash
git add test/proposes/20-propose-processing.test.ts src/lib/test-matcher/index.ts src/lib/serve/snapshot.ts src/lib/markdown/feature-to-markdown.ts
git commit -m "feat: process proposes outside coverage"
```

---

### Task 3: Preserve Legacy Assert-Only Upload (Remote Proposes Deferred)

**Files:**
- Modify: `src/lib/upload/upload-entities.ts:1-40`
- Test: `test/helpers/upload-legacy.test.ts`

**Interfaces:**
- Consumes: the domain `Statement` union from Task 1.
- Produces: the unchanged legacy `SpecBoxWebApiModelUploadAssertionGroupModel`, containing assertions only.

- [x] **Step 1: Add a failing compatibility test**

Verify that a mixed group maps to a legacy payload containing the assertion and omitting the propose.

- [x] **Step 2: Observe the test fail**

The focused test failed because `mapGroup` was private and the mapper still accepted assertion-only input.

- [x] **Step 3: Filter the legacy payload by statement type**

Export `mapGroup`, narrow the ordered statements to `type === 'assert'`, and then call the existing `mapAssertion` mapper. Do not regenerate or hand-edit the generated API client.

- [x] **Step 4: Verify the compatibility test and TypeScript build**

Run:

```bash
node --test -r ts-node/register test/helpers/upload-legacy.test.ts
npx tsc --noEmit
```

Expected: PASS. Propose-aware remote upload remains future work, represented by `propose` requirements in the “Синхронизация” group.

---

### Task 4: Expose Propose Types Through the Local API

**Files:**
- Modify: `src/lib/serve/models.ts:52-65`
- Modify: `src/lib/serve/server.ts:153-165`
- Modify: `test/serve/10-project-snapshot-get.test.ts`
- Modify: `test/serve/20-feature-current-get.test.ts`
- Modify: `test/serve/30-feature-revision-get.test.ts`
- Modify: `test/serve/40-feature-create-post.test.ts`
- Create: `test/serve/80-propose-statements.test.ts`

**Interfaces:**
- Consumes: domain `Statement` and assertion-only `assertionCounts` from Tasks 1–2.
- Produces: local current and historical responses that preserve `type`; proposes expose `isAutomated: false`.

- [x] **Step 1: Update test response types and assertion fixtures**

Change local test types to the same union as the API specification and add `type: 'assert'` to existing expected assertion objects. Do not remove `isAutomated` from propose responses.

- [x] **Step 2: Write failing local API acceptance tests**

Create a fixture YAML with one assert and one propose. Cover the four “Локальный API” titles with `specTest`; the core response and snapshot assertions are:

```ts
assert.deepEqual(current.groups[0].assertions, [
  {type: 'assert', title: 'Required', isAutomated: false},
  {type: 'propose', title: 'Planned', description: 'Later', isAutomated: false},
]);
assert.deepEqual(snapshot.coverage, {total: 1, automated: 0, uncovered: 1});
```

For the graph case use `propose: Planned $target` and assert the resolved edge. For history, commit propose YAML, replace the key with `assert`, commit again, and assert each revision endpoint returns its corresponding type.

Use these exact acceptance wrappers:

```ts
specTest('serve-proposes', 'Предложения в локальном редакторе', 'Локальный API',
  'ProjectSnapshot и ответы текущей и исторической фичи сохраняют type каждого assert и propose', async () => {
    const projectStatements = snapshot.features[0].groups[0].assertions;
    const currentStatements = current.groups[0].assertions;
    const historicalStatements = historical.groups[0].assertions;
    assert.deepEqual(projectStatements.map(({type}) => type), ['assert', 'propose']);
    assert.deepEqual(currentStatements.map(({type}) => type), ['assert', 'propose']);
    assert.deepEqual(historicalStatements.map(({type}) => type), ['assert', 'propose']);
  });
specTest('serve-proposes', 'Предложения в локальном редакторе', 'Локальный API',
  'Propose в ответе локального API имеет type равный propose и isAutomated равный false', async () => {
    assert.deepEqual(propose, {type: 'propose', title: 'Planned', description: 'Later', isAutomated: false});
  });
specTest('serve-proposes', 'Предложения в локальном редакторе', 'Локальный API',
  'Показатели total, automated и uncovered в ProjectSnapshot и деревьях учитывают только assert', async () => {
    assert.deepEqual(snapshot.coverage, {total: 1, automated: 0, uncovered: 1});
    assert.equal(snapshot.trees[0].totalCount, 1);
  });
specTest('serve-proposes', 'Предложения в локальном редакторе', 'Локальный API',
  'Граф зависимостей ProjectSnapshot содержит связи из названия и description propose', async () => {
    assert.deepEqual(snapshot.dependencyGraph.edges, [{from: 'feature-one', to: 'target', resolved: true}]);
  });
```

- [x] **Step 3: Run local API tests and verify failure**

Run:

```bash
node --test -r ts-node/register test/serve/10-project-snapshot-get.test.ts test/serve/20-feature-current-get.test.ts test/serve/30-feature-revision-get.test.ts test/serve/80-propose-statements.test.ts
```

Expected: FAIL because historical mapping destructures only `assert` and local response models lack the discriminator.

- [x] **Step 4: Generalize local response models**

Define the response union:

```ts
export type FeatureStatementResponse =
  | {type: 'assert'; title: string; description?: string; isAutomated: boolean}
  | {type: 'propose'; title: string; description?: string; isAutomated: false};
```

Use it in `FeatureResponse.groups[].assertions`.

- [x] **Step 5: Map historical YAML statements through one helper**

Extract a helper in `server.ts`:

```ts
const historicalStatement = (statement: YamlStatement): FeatureStatementResponse =>
  'assert' in statement
    ? {type: 'assert', title: statement.assert, ...(statement.description === undefined ? {} : {description: statement.description}), isAutomated: false}
    : {type: 'propose', title: statement.propose, ...(statement.description === undefined ? {} : {description: statement.description}), isAutomated: false};
```

Use `assertions.map(historicalStatement)` so history preserves order and type.

- [x] **Step 6: Run local backend regression tests**

Run:

```bash
npm run test:serve
npm run test:unit
```

Expected: PASS and regenerated `test-results/junit.xml` contains all backend propose acceptance names.

- [ ] **Step 7: Review gate, then commit only after approval**

After review and approval:

```bash
git add src/lib/serve/models.ts src/lib/serve/server.ts test/serve/10-project-snapshot-get.test.ts test/serve/20-feature-current-get.test.ts test/serve/30-feature-revision-get.test.ts test/serve/40-feature-create-post.test.ts test/serve/80-propose-statements.test.ts
git commit -m "feat: expose proposes in local API"
```

---

### Task 5: Render and Compare Proposes in Angular

**Files:**
- Modify: `serve-ui/src/app/model/assertion.model.ts`
- Modify: `serve-ui/src/app/pages/features/assert/assert.ts`
- Modify: `serve-ui/src/app/pages/features/assert/assert.html`
- Modify: `serve-ui/src/app/pages/features/assert/assert.scss`
- Create: `serve-ui/src/app/pages/features/assert/assert.spec.ts`
- Create: `serve-ui/src/app/pages/features/feature-group/feature-group.spec.ts`
- Modify: `serve-ui/src/app/pages/features/feature-item/feature-item.ts:60-74`
- Create: `serve-ui/src/app/pages/features/feature-item/feature-item.spec.ts`
- Modify: `serve-ui/src/app/pages/features/feature-compare/feature-compare.ts:67-76`
- Modify: `serve-ui/src/app/pages/features/feature-compare/feature-compare.html`
- Modify: `serve-ui/src/app/pages/features/feature-compare/feature-compare.spec.ts`
- Modify: `serve-ui/src/app/pages/features/nav-controls/nav-controls.spec.ts`

**Interfaces:**
- Consumes: local API statement union from Task 4.
- Produces: neutral propose presentation, assertion-only counters, and type-aware revision comparison.

- [x] **Step 1: Mirror the statement union in Angular**

Use:

```ts
type BaseStatement = {title: string; description?: string};
export type Assertion =
  | (BaseStatement & {type: 'assert'; isAutomated: boolean})
  | (BaseStatement & {type: 'propose'; isAutomated: false});
```

Add `type: 'assert'` to existing Angular test fixtures.

- [x] **Step 2: Write failing rendering tests**

In `assert.spec.ts`, render each branch and verify:

```ts
expect(proposeFixture.nativeElement.textContent).toContain('Предложение');
expect(proposeFixture.nativeElement.textContent).not.toContain('Нет автоматической проверки');
expect(assertFixture.nativeElement.querySelector('[tuiStatus]')).not.toBeNull();
expect(proposeFixture.nativeElement.textContent).toContain('Later details');
```

In `feature-group.spec.ts`, render `[assert, propose, assert]` and assert the three statement titles appear in that DOM order:

```ts
const text = fixture.nativeElement.textContent as string;
const positions = [text.indexOf('First'), text.indexOf('Later'), text.indexOf('Third')];
expect(positions).toEqual([...positions].sort((a, b) => a - b));
```

In `feature-item.spec.ts`, provide a project resource with one automated assert and two proposes, then assert `totalCount() === 1` and `automatedCount() === 1`.

In `feature-compare.spec.ts`, use the same group/title with origin `type: 'propose'` and current `type: 'assert'`; assert zero added, zero removed, one changed, and visible `Предложение` → `Проверка` type lines.

The Angular tests trace the frontend acceptance criteria as follows:

- `feature-group.spec.ts`: `Локальный редактор показывает assert и propose в порядке исходного YAML`.
- `assert.spec.ts`: `Propose отображается с нейтральной меткой «Предложение» без индикатора отсутствующей автоматизации`.
- `assert.spec.ts`: `Assert сохраняет существующий положительный или отрицательный индикатор автоматизации`.
- `assert.spec.ts`: `Description элемента propose отображается и раскрывается так же, как description элемента assert`.
- `feature-item.spec.ts`: `Счётчик автоматизации фичи учитывает только assert и не меняется от добавления propose`.
- `feature-compare.spec.ts`: `Сравнение ревизий сопоставляет утверждения по группе и названию независимо от типа`.
- `feature-compare.spec.ts`: `Замена propose на assert с тем же названием отображается как изменение типа одного утверждения, а не удаление и добавление`.

- [x] **Step 3: Run Angular tests and verify failure**

Run:

```bash
npm --prefix serve-ui test -- --watch=false
```

Expected: FAIL because propose status, counting, and type comparison are not implemented.

- [x] **Step 4: Render propose status separately**

Branch before automation status in `assert.html`:

```html
@if (assertion().type === 'propose') {
  <span appearance="neutral" tuiBadge>Предложение</span>
} @else if (assertion().isAutomated) {
  <div appearance="positive" tuiBadge tuiStatus size="m" tuiHint="Проверка автоматизирована"></div>
} @else {
  <div appearance="negative" tuiBadge tuiStatus size="m" tuiHint="Нет автоматической проверки"></div>
}
```

Keep the existing shared title and description rendering.

- [x] **Step 5: Filter feature counters to assertions**

Use one computed source:

```ts
readonly assertions = computed(() => this.feature()?.groups
  .flatMap((group) => group.assertions)
  .filter((statement) => statement.type === 'assert') ?? []);
readonly totalCount = computed(() => this.assertions().length);
readonly automatedCount = computed(() => this.assertions().filter(({isAutomated}) => isAutomated).length);
```

- [x] **Step 6: Treat type as a revision change**

Change the comparison predicate to:

```ts
if (!originItem || (
  item.assertion.description === originItem.assertion.description &&
  item.assertion.type === originItem.assertion.type
)) return [];
```

In the changed-item template, render a `Тип` removed/added pair when types differ, mapping `propose` to `Предложение` and `assert` to `Проверка`.

- [x] **Step 7: Run Angular regression tests and build**

Run:

```bash
npm --prefix serve-ui test -- --watch=false
npm --prefix serve-ui run build
```

Expected: PASS.

- [ ] **Step 8: Review gate, then commit only after approval**

After review and approval:

```bash
git add serve-ui/src/app/model/assertion.model.ts serve-ui/src/app/pages/features
git commit -m "feat: display propose statements"
```

---

### Task 6: Documentation and Full Acceptance Verification

**Files:**
- Modify: `README.md:91-116`
- Modify: `README.md:219-271`
- Verify: all TypeScript statement fixtures use an explicit discriminator.
- Verify: `specs/proposes/*.spec.yml`
- Verify: `specs/serve/20-feature-current-get.spec.yml`
- Verify: `specs/serve/30-feature-revision-get.spec.yml`
- Verify: `specs/serve/80-propose-statements.spec.yml`

**Interfaces:**
- Consumes: all completed backend, generated client, and Angular work.
- Produces: documented notation and a clean end-to-end acceptance run.

- [x] **Step 1: Document propose notation and lifecycle**

Add this mixed example after the existing YAML example:

```yaml
specs-unit:
  Оформление заказа:
    - assert: Пользователь может оформить заказ
    - propose: Пользователь сможет выбрать время доставки
      description: Запланировано для следующей версии
```

State explicitly that an item contains exactly one of `assert`/`propose`; proposes are visible locally, cannot be automated, do not affect coverage, are omitted by legacy remote upload, and become required by replacing `propose` with `assert`.

- [x] **Step 2: Run the complete verification suite**

Run in this order:

```bash
npm run test:serve
npm run test:unit
npm --prefix serve-ui test -- --watch=false
npm run build
npm start -- validate
git diff --check
```

Expected:

- all Node and Angular tests pass;
- build completes;
- validation reports no unmatched propose acceptance tests and no critical errors;
- `git diff --check` prints nothing.

- [ ] **Step 3: Review gate, then commit only after approval**

Show the complete `git diff` and verification output. After explicit approval:

```bash
git add README.md
git commit -m "docs: document propose statements"
```

- [ ] **Step 4: Confirm branch state**

Run:

```bash
git status --short
git log --oneline --decorate -8
```

Expected: clean worktree and the approved task commits on `propose-statement`.
