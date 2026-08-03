import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { GitAdapter } from '../../src/lib/serve/git';
import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

const exec = promisify(execFile);
type Project = Awaited<ReturnType<typeof createProject>>;

const runGit = (project: Project, args: string[]) => exec('git', args, { cwd: project.root });
const featurePath = join('specs', 'feature.spec.yml');

const commit = async (project: Project, message: string) => {
  await runGit(project, ['add', '.']);
  await runGit(project, ['commit', '-m', message]);
  return (await runGit(project, ['rev-parse', 'HEAD'])).stdout.trim();
};

const initializeHistory = async (project: Project) => {
  await runGit(project, ['init']);
  await runGit(project, ['config', 'user.name', 'Test User']);
  await runGit(project, ['config', 'user.email', 'test@example.com']);
  await writeFile(join(project.root, featurePath), 'code: feature-one\nfeature: Feature one\nspecs-unit:\n  Group:\n    - assert: Works\n    - propose: Later\n');
  const initial = await commit(project, 'Initial feature');
  await writeFile(join(project.root, featurePath), 'code: feature-one\nfeature: Changed feature\ndescription: Revision description\ndefinitions:\n  audience:\n    - user\nspecs-unit:\n  Changed group:\n    - assert: Changed assertion\n');
  const changed = await commit(project, 'Change feature');
  return { initial, changed };
};

const withServer = async (fn: (url: string, project: Project) => Promise<void>, options: { history?: boolean; git?: GitAdapter } = {}) => {
  const project = await createProject();
  if (options.history) await initializeHistory(project);
  const service = new ProjectSnapshotService(project.root);
  await service.refresh();
  const server = await startServer({ projectRoot: project.root, port: 0, service, git: options.git });
  try {
    await fn(server.url, project);
  } finally {
    await server.close();
    await project.dispose();
  }
};

const unavailableGit: GitAdapter = {
  history: async () => [],
  fileAtRevision: async () => undefined,
};

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Недоступная ревизия',
  'GET /api/features/:code?revision=:commit возвращает HTTP 404 при пустом или повторённом параметре revision',
  () => withServer(async (url) => {
    for (const query of ['?revision=', '?revision', '?revision=first&revision=second']) {
      assert.equal((await fetch(`${url}/api/features/feature-one${query}`)).status, 404);
    }
  }),
);

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Успешный ответ',
  'GET /api/features/:code?revision=:commit возвращает модель фичи из указанного коммита её истории с HTTP 200',
  () => withServer(async (url, project) => {
    const revision = (await runGit(project, ['rev-parse', 'HEAD~1'])).stdout.trim();
    const response = await fetch(`${url}/api/features/feature-one?revision=${revision}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      code: 'feature-one',
      title: 'Feature one',
      attributes: {},
      groups: [{ title: 'Group', assertions: [
        { type: 'assert', title: 'Works', isAutomated: false },
        { type: 'propose', title: 'Later', isAutomated: false },
      ] }],
      filePath: 'specs/feature.spec.yml',
    });
  }, { history: true }),
);

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Успешный ответ',
  'Снимок фичи из Git-ревизии сохраняет type каждого assert и propose',
  () => withServer(async (url, project) => {
    const revision = (await runGit(project, ['rev-parse', 'HEAD~1'])).stdout.trim();
    const response = await fetch(`${url}/api/features/feature-one?revision=${revision}`);
    const historical = await response.json() as { groups: Array<{ assertions: Array<{ type: string }> }> };
    assert.deepEqual(historical.groups[0].assertions.map(({ type }) => type), ['assert', 'propose']);
  }, { history: true }),
);

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Успешный ответ',
  'Снимок фичи из Git-ревизии не содержит optimisticLock',
  () => withServer(async (url) => {
    const history = await (await fetch(`${url}/api/features/feature-one/history`)).json() as Array<{ commit: string }>;
    const response = await fetch(`${url}/api/features/feature-one?revision=${history[0].commit}`);
    assert.equal(response.status, 200);
    const snapshot = await response.json() as Record<string, unknown>;
    assert.equal('optimisticLock' in snapshot, false);
  }, { history: true }),
);

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Недоступная ревизия',
  'GET /api/features/:code?revision=:commit возвращает HTTP 404, если коммит не относится к истории фичи',
  () => withServer(async (url, project) => {
    await writeFile(join(project.root, 'notes.txt'), 'Unrelated change\n');
    const unrelated = await commit(project, 'Unrelated change');
    assert.equal((await fetch(`${url}/api/features/feature-one?revision=${unrelated}`)).status, 404);
  }, { history: true }),
);

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Недоступная ревизия',
  'GET /api/features/:code?revision=:commit возвращает HTTP 404, если фича или её файл отсутствуют в указанной ревизии',
  () => withServer(async (url, project) => {
    await writeFile(join(project.root, featurePath), 'code: feature-two\nfeature: Another feature\n');
    const missingFeature = await commit(project, 'Rename feature code');
    await writeFile(join(project.root, featurePath), 'code: feature-one\nfeature: Feature one\n');
    await commit(project, 'Restore feature code');
    await rm(join(project.root, featurePath));
    const missingFile = await commit(project, 'Remove feature file');
    await writeFile(join(project.root, featurePath), 'code: feature-one\nfeature: Feature one\n');
    await commit(project, 'Restore feature file');
    assert.equal((await fetch(`${url}/api/features/feature-one?revision=${missingFeature}`)).status, 404);
    assert.equal((await fetch(`${url}/api/features/feature-one?revision=${missingFile}`)).status, 404);
  }, { history: true }),
);

specTest(
  'serve-feature-revision-get',
  'GET /api/features/:code?revision=:commit',
  'Недоступная ревизия',
  'GET /api/features/:code?revision=:commit возвращает HTTP 404, если Git не может отдать файл фичи',
  () => withServer(async (url) => {
    assert.equal((await fetch(`${url}/api/features/feature-one?revision=any-commit`)).status, 404);
  }, { git: { ...unavailableGit, fileAtRevision: async () => { throw new Error('Git unavailable'); } } }),
);
