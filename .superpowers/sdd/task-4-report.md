# Task 4 report: Git history and feature revisions

## Scope

Implement the binding assertions in `30-feature-revision-get.spec.yml` and `60-feature-history-get.spec.yml` without changing Task 5 work.

## RED

Added nine exact `specTest` calls, one for every binding YAML assert. The initial focused run failed to compile because `GitAdapter` and `StartServerOptions.git` did not exist:

```
TS2305: Module .../git has no exported member 'GitAdapter'
TS2345: 'git' does not exist in type 'StartServerOptions'
```

This proved the tests required a route-level adapter boundary for controlled empty and throwing Git results.

## GREEN

Implemented the smallest adapter and route changes:

- `src/lib/serve/git.ts` runs only `execFile('git', ...)`; history uses `%cI` and revision reads `git show` as bytes.
- `GitAdapter` permits tests to substitute empty or failing Git without global mocks.
- History converts all adapter/Git failures to `[]`; revisions convert them to `404`.
- Revision reads only commits in the selected YAML path's history, decodes through the existing YAML decoder, rejects a snapshot with another feature code, and omits `optimisticLock`.

Fresh verification:

```
node --test --test-concurrency=1 -r ts-node/register test/lib/serve/git.test.ts
# 9 passed, 0 failed

npm run test:serve
# exit 0

npm run build
# exit 0
```

The focused test command needed loopback-socket permission because the sandbox otherwise rejects `127.0.0.1` with `EPERM`; it then passed unchanged.

## Self-review

- Each of the 4 history and 5 revision YAML assertions is represented by its exact `specTest` string.
- The revision-unavailable test covers both a mismatched feature code and a deleted YAML file; the Git-unavailable tests cover both empty and throwing adapters.
- Git calls are isolated to `execFile`, never shell interpolation. Failure handling is local to history/revision routes, so `/api/project` stays usable after a Git failure.
- Intended Task 4 commit files: `src/lib/serve/server.ts`, `src/lib/serve/git.ts`, `test/lib/serve/git.test.ts`, and this report. Existing unrelated Task 3/5 changes remain unstaged.
