# Empty JUnit Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow validation and report consumers to accept a configured JUnit XML report with no test suites.

**Architecture:** Normalize the parsed XML report into the existing JUnit data shape when xml2js parses an empty `<testsuites/>` collection as an empty string. Preserve the existing io-ts decoding path for all normal and malformed non-empty reports, then map the synthesized empty suite collection into the existing `TestReport` interface.

**Tech Stack:** TypeScript, Node.js built-in test runner, `xml2js`, `io-ts`.

## Global Constraints

- Preserve invalid-report errors for non-empty reports that do not match the supported JUnit layouts.
- Do not change configured report discovery, command behavior, or matching semantics.
- Leave all Git changes uncommitted, per repository policy.

---

### Task 1: Normalize an empty JUnit report

**Files:**

- Modify: `test/helpers/validate-junit.test.ts`
- Modify: `src/lib/test-matcher/junit/index.ts`

**Interfaces:**

- Consumes: `loadJUnitReport(path, basePath?, property?)` from `src/lib/test-matcher/junit/index.ts`.
- Produces: `Promise<TestReport>` with `{ total: 0, startTime: 0, duration: 0, testResults: [] }` for `<testsuites/>`.

- [ ] **Step 1: Write the failing test**

Extend `test/helpers/validate-junit.test.ts` with a test that writes an XML file containing `<testsuites/>`, calls `loadJUnitReport`, and asserts:

```ts
assert.deepEqual(report, {
  total: 0,
  startTime: 0,
  duration: 0,
  testResults: [],
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test -r ts-node/register test/helpers/validate-junit.test.ts`

Expected: FAIL because the current JUnit decoder requires a `testsuite` or `testcase` member for an empty `<testsuites/>` XML document.

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/test-matcher/junit/index.ts`, normalize parsed XML in `loadJUnitReport` before `parseObject` so an empty `<testsuites/>` becomes the nested report shape:

```ts
{ testsuites: { name: '', tests: '0', testsuite: [] } }
```

Keep `mapTestReport` unchanged: its existing reductions and `mapTestResults` already return the required zero-result values for an empty `testsuite` array.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test -r ts-node/register test/helpers/validate-junit.test.ts`

Expected: PASS, including the new empty-report regression test and the existing validation helper test.

- [ ] **Step 5: Run full verification**

Run: `npm test && npm run build`

Expected: all Node test suites pass and TypeScript compilation completes successfully.
