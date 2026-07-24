# Task 2 — invalid `.tms.json` snapshot contract

## RED

Command: `node --test -r ts-node/register --test-reporter=spec test/lib/serve/task6-project.test.ts`

The invalid-config case failed at `task6-project.test.ts:43`: the snapshot contained `attributes`, `coverage`, `dependencyGraph`, `features`, `storageAreas`, `treeDefinitions`, and `trees` in addition to `revision` and `diagnostics`.

## GREEN

Changed the invalid-config refresh branch to publish only `{ revision, diagnostics }`; the initial empty snapshot remains complete for existing callers.

Command: `node --test -r ts-node/register --test-reporter=spec test/lib/serve/task6-project.test.ts`

Result: 6 passed, 0 failed.

Command: `npm run build`

Result: passed (`tsc --build tsconfig.json`).
