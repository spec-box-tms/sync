import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { loadJUnitReport } from '../../src/lib/test-matcher/junit';

const exec = promisify(execFile);

test('validate has no unmatched tests after test:serve', async () => {
  const { stdout } = await exec(process.execPath, ['-r', 'ts-node/register', 'src/cli.ts', 'validate']);
  assert.doesNotMatch(stdout, /WARN/);
});

test('loads an empty JUnit testsuites report as an empty test report', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spec-box-junit-'));
  const reportPath = join(directory, 'e2e-junit.xml');

  try {
    await writeFile(reportPath, '<testsuites/>');

    const report = await loadJUnitReport(reportPath);

    assert.deepEqual(report, {
      total: 0,
      startTime: 0,
      duration: 0,
      testResults: [],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
