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

test('loads JUnit error elements as failed tests, including Playwright errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'spec-box-junit-'));
  const reportPath = join(directory, 'playwright-junit.xml');
  const cases = [
    ['Playwright error', '<error message="page.evaluate: TypeError: Scene is not a constructor" type="Error"><![CDATA[Error: page.evaluate: TypeError: Scene is not a constructor]]></error>', 'failed'],
    ['Empty error', '<error/>', 'failed'],
    ['Text error', '<error>Setup failed</error>', 'failed'],
    ['Multiple errors', '<error/><error message="Teardown failed"/>', 'failed'],
    ['Error with skipped', '<skipped/><error/>', 'failed'],
    ['Failure', '<failure/>', 'failed'],
    ['Skipped', '<skipped/>', 'skipped'],
    ['Passed', '', 'passed'],
  ];

  try {
    await writeFile(reportPath, `<testsuites name="" tests="8" failures="1" errors="5">
      <testsuite name="primitives/M-C-010.spec.js" timestamp="2026-10-02T16:50:28.921Z" time="6.926">
        ${cases.map(([name, result]) => `<testcase name="Group › ${name}">
          <properties><property name="specbox" value="M-C-010 ${name}"/></properties>
          ${result}
        </testcase>`).join('\n')}
      </testsuite>
    </testsuites>`);

    const report = await loadJUnitReport(reportPath, undefined, 'specbox');
    assert.deepEqual(report.testResults, cases.map(([name, , status]) => ({
      name: `M-C-010 ${name}`,
      filePath: 'unknown',
      status,
    })));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
