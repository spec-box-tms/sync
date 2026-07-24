import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

type Project = Awaited<ReturnType<typeof createProject>>;
type Snapshot = { revision: number; features: Array<{ code: string; title: string; filePath: string }>; diagnostics: Array<{ code: string }> };
type Feature = {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: Array<{ title: string; assertions: Array<{ title: string; description?: string; isAutomated: boolean }> }>;
  filePath: string;
  optimisticLock: string;
};

const withServer = async (fn: (url: string, project: Project) => Promise<void>, setup?: (project: Project) => Promise<void>) => {
  const project = await createProject();
  if (setup) await setup(project);
  const service = new ProjectSnapshotService(project.root);
  await service.refresh();
  const server = await startServer({ projectRoot: project.root, port: 0, service });
  try {
    await fn(server.url, project);
  } finally {
    await server.close();
    await project.dispose();
  }
};

const json = (url: string, method: 'POST' | 'PUT', body: unknown) => fetch(url, {
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const feature = async (url: string) => (await (await fetch(`${url}/api/features/feature-one`)).json()) as Feature;
const updateBody = (current: Feature, changes: Partial<Feature> = {}) => ({
  code: current.code,
  title: current.title,
  ...(current.description === undefined ? {} : { description: current.description }),
  attributes: current.attributes,
  groups: current.groups,
  optimisticLock: current.optimisticLock,
  ...changes,
});

const useProjectPath = async (project: Project) => {
  await mkdir(join(project.root, 'workspace/specs'), { recursive: true });
  await writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, projectPath: 'workspace', yml: { files: ['specs/**/*.spec.yml'] } }));
  await writeFile(join(project.root, 'workspace/.spec-box-meta.yml'), 'title: Test\nattributes: []\ntrees: []\n');
  await writeFile(join(project.root, 'workspace/specs/feature.spec.yml'), 'code: feature-one\nfeature: Feature one\nspecs-unit:\n  Group:\n    - assert: Works\n');
};

specTest('serve-feature-get', 'GET /api/features/:code', 'Успешный ответ', 'GET /api/features/:code возвращает текущую фичу с HTTP 200', () => withServer(async (url) => {
  assert.equal((await fetch(`${url}/api/features/feature-one`)).status, 200);
}, useProjectPath));

specTest('serve-feature-get', 'GET /api/features/:code', 'Успешный ответ', 'Ответ содержит код, название, необязательное описание, атрибуты, группы утверждений, относительный путь файла и optimisticLock', () => withServer(async (url) => {
  const current = await feature(url);
  assert.deepEqual(Object.keys(current).sort(), ['attributes', 'code', 'filePath', 'groups', 'optimisticLock', 'title']);
  assert.equal(current.code, 'feature-one');
  assert.equal(current.title, 'Feature one');
  assert.deepEqual(current.attributes, {});
  assert.equal(current.groups[0].title, 'Group');
  assert.equal(current.groups[0].assertions[0].title, 'Works');
  assert.equal(current.filePath, 'specs/feature.spec.yml');
  assert.match(current.optimisticLock, /^[a-f0-9]{32}$/);
}));

specTest('serve-feature-get', 'GET /api/features/:code', 'Успешный ответ', 'Каждое утверждение ответа содержит вычисленный признак isAutomated', () => withServer(async (url) => {
  const current = await feature(url);
  assert.equal(current.groups[0].assertions[0].isAutomated, true);
}, async (project) => {
  await mkdir(join(project.root, 'test-results'), { recursive: true });
  await writeFile(join(project.root, 'test-results/junit.xml'), '<testsuites name="x" tests="1"><testsuite name="x" time="0" timestamp="2026-01-01T00:00:00.000Z"><testcase name="feature-one Feature one Group Works" status="passed"/></testsuite></testsuites>');
}));

specTest('serve-feature-get', 'GET /api/features/:code', 'Успешный ответ', 'У фичи без атрибутов и групп ответ содержит attributes как {} и groups как []', () => withServer(async (url) => {
  const current = await feature(url);
  assert.deepEqual(current.attributes, {});
  assert.deepEqual(current.groups, []);
}, async (project) => writeFile(join(project.root, 'specs/feature.spec.yml'), 'code: feature-one\nfeature: Feature one\n')));

specTest('serve-feature-get', 'GET /api/features/:code', 'Успешный ответ', 'У фичи без YAML-описания поле description отсутствует в ответе', () => withServer(async (url) => {
  assert.equal('description' in await feature(url), false);
}));

specTest('serve-feature-get', 'GET /api/features/:code', 'Успешный ответ', 'optimisticLock текущей фичи равен MD5 исходных байтов её YAML-файла', () => withServer(async (url, project) => {
  const bytes = await readFile(join(project.root, 'specs/feature.spec.yml'));
  assert.equal((await feature(url)).optimisticLock, createHash('md5').update(bytes).digest('hex'));
}));

specTest('serve-feature-get', 'GET /api/features/:code', 'Отсутствующая фича', 'GET /api/features/:code для отсутствующего кода возвращает HTTP 404', () => withServer(async (url) => {
  assert.equal((await fetch(`${url}/api/features/missing`)).status, 404);
}));
