import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { GitAdapter } from '../../../src/lib/serve/git';
import { startServer } from '../../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../../src/lib/serve/snapshot';
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
  'serve-feature-history-get',
  'GET /api/features/:code/history',
  'История файла',
  'GET /api/features/:code/history возвращает HTTP 200 и записи истории от новых коммитов к старым',
  () => withServer(async (url) => {
    const response = await fetch(`${url}/api/features/feature-one/history`);
    assert.equal(response.status, 200);
    const history = await response.json() as Array<{ message: string }>;
    assert.deepEqual(history.map(({ message }) => message), ['Change feature', 'Initial feature']);
  }, { history: true }),
);

specTest(
  'serve-feature-history-get',
  'GET /api/features/:code/history',
  'История файла',
  'Каждая запись истории содержит идентификатор коммита, автора, дату ISO 8601 с часовым поясом и сообщение коммита',
  () => withServer(async (url) => {
    const history = await (await fetch(`${url}/api/features/feature-one/history`)).json() as Array<{ commit: string; author: string; date: string; message: string }>;
    assert.ok(history.length > 0);
    history.forEach((entry) => {
      assert.match(entry.commit, /^[0-9a-f]{40}$/);
      assert.equal(entry.author, 'Test User');
      assert.match(entry.date, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
      assert.equal(typeof entry.message, 'string');
    });
  }, { history: true }),
);

specTest(
  'serve-feature-history-get',
  'GET /api/features/:code/history',
  'История файла',
  'GET /api/features/:code/history возвращает HTTP 200 и [] для неотслеживаемого YAML-файла или недоступного Git',
  async () => {
    await withServer(async (url) => {
      const response = await fetch(`${url}/api/features/feature-one/history`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), []);
    });
    await withServer(async (url) => {
      const response = await fetch(`${url}/api/features/feature-one/history`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), []);
    }, { git: unavailableGit });
  },
);

specTest(
  'serve-feature-history-get',
  'GET /api/features/:code/history',
  'История файла',
  'Ошибка Git при GET /api/features/:code/history не нарушает работу остальных маршрутов',
  () => withServer(async (url) => {
    assert.equal((await fetch(`${url}/api/features/feature-one/history`)).status, 200);
    assert.equal((await fetch(`${url}/api/project`)).status, 200);
  }, { git: { ...unavailableGit, history: async () => { throw new Error('Git unavailable'); } } }),
);
