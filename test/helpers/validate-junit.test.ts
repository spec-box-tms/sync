import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { test } from 'node:test';
import { promisify } from 'node:util';

const exec = promisify(execFile);

test('validate has no unmatched tests after test:serve', async () => {
  const { stdout } = await exec(process.execPath, ['-r', 'ts-node/register', 'src/cli.ts', 'validate']);
  assert.doesNotMatch(stdout, /WARN/);
});
