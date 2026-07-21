import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeUpdateFeatureRequest } from '../../../src/lib/serve/models';
import { startServer } from '../../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../../src/lib/serve/snapshot';
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

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Ошибки сохранения', 'Неизвестное поле в теле PUT /api/features/:code возвращается с точным JSON Pointer path', () => {
  assert.deepEqual(decodeUpdateFeatureRequest({
    code: 'feature-one', title: 'Feature one', attributes: {}, groups: [{ title: 'Group', assertions: [{ title: 'Works', extra: true }] }], optimisticLock: 'lock',
  }), {
    errors: [{ code: 'invalid-request', message: 'unknown field', path: '/groups/0/assertions/0/extra' }],
  });
});

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Успешное сохранение', 'PUT /api/features/:code принимает код, название, необязательное описание, атрибуты, группы утверждений и optimisticLock', () => withServer(async (url) => {
  const current = await feature(url);
  const response = await json(`${url}/api/features/feature-one`, 'PUT', updateBody(current, { description: 'Details', groups: [{ title: 'Changed', assertions: [{ title: 'Works', isAutomated: false }] }] }));
  assert.equal(response.status, 200);
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Успешное сохранение', 'PUT /api/features/:code с актуальным optimisticLock сохраняет фичу, полностью пересчитывает проект и возвращает ProjectSnapshot с HTTP 200', () => withServer(async (url) => {
  const response = await json(`${url}/api/features/feature-one`, 'PUT', updateBody(await feature(url), { title: 'Changed' }));
  assert.equal(response.status, 200);
  const snapshot = await response.json() as Snapshot;
  assert.equal(snapshot.revision, 2);
  assert.equal(snapshot.features[0].title, 'Changed');
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Успешное сохранение', 'PUT /api/features/:code игнорирует filePath и isAutomated из тела запроса', () => withServer(async (url, project) => {
  const current = await feature(url);
  const response = await json(`${url}/api/features/feature-one`, 'PUT', {
    ...updateBody(current, { groups: [{ title: 'Group', assertions: [{ title: 'Works', isAutomated: true }] }] }),
    filePath: 'specs/other.spec.yml',
  });
  assert.equal(response.status, 200);
  assert.equal((await feature(url)).filePath, 'specs/feature.spec.yml');
  assert.match(await readFile(join(project.root, 'specs/feature.spec.yml'), 'utf8'), /assert: Works/);
  await assert.rejects(stat(join(project.root, 'specs/other.spec.yml')));
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Успешное сохранение', 'PUT /api/features/:code допускает изменение кода фичи и сохраняет прежний путь YAML-файла', () => withServer(async (url) => {
  const response = await json(`${url}/api/features/feature-one`, 'PUT', updateBody(await feature(url), { code: 'feature-renamed' }));
  assert.equal(response.status, 200);
  const snapshot = await response.json() as Snapshot;
  assert.deepEqual(snapshot.features.find((item) => item.code === 'feature-renamed')?.filePath, 'specs/feature.spec.yml');
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Успешное сохранение', 'При изменении кода PUT /api/features/:code не переписывает ссылки на прежний код и ключи тестов', () => withServer(async (url, project) => {
  await writeFile(join(project.root, 'specs/references.spec.yml'), 'code: references\nfeature: References\ndescription: $feature-one\n');
  await mkdir(join(project.root, 'test-results'), { recursive: true });
  const report = '<testsuites name="x" tests="0"><testsuite name="x" time="0" timestamp="2026-01-01T00:00:00.000Z"/></testsuites>';
  await writeFile(join(project.root, 'test-results/junit.xml'), report);
  const response = await json(`${url}/api/features/feature-one`, 'PUT', updateBody(await feature(url), { code: 'renamed' }));
  assert.equal(response.status, 200);
  assert.match(await readFile(join(project.root, 'specs/references.spec.yml'), 'utf8'), /\$feature-one/);
  assert.equal(await readFile(join(project.root, 'test-results/junit.xml'), 'utf8'), report);
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Успешное сохранение', 'PUT /api/features/:code сохраняет неразрешённые ссылки и повторные assert и возвращает их как диагностики нового ProjectSnapshot', () => withServer(async (url) => {
  const response = await json(`${url}/api/features/feature-one`, 'PUT', updateBody(await feature(url), {
    description: '$missing',
    groups: [{ title: 'Group', assertions: [{ title: 'Repeated', isAutomated: false }, { title: 'Repeated', isAutomated: false }] }],
  }));
  assert.equal(response.status, 200);
  const snapshot = await response.json() as Snapshot;
  assert.ok(snapshot.diagnostics.some((item) => item.code === 'feature-missing-link'));
  assert.ok(snapshot.diagnostics.some((item) => item.code === 'assertion-duplicate'));
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Ошибки сохранения', 'PUT /api/features/:code возвращает HTTP 409 без тела и не меняет YAML-файл при несовпадении optimisticLock с текущим содержимым файла', () => withServer(async (url, project) => {
  const path = join(project.root, 'specs/feature.spec.yml');
  const before = await readFile(path);
  const response = await json(`${url}/api/features/feature-one`, 'PUT', updateBody(await feature(url), { title: 'Changed', optimisticLock: 'stale' }));
  assert.equal(response.status, 409);
  assert.equal(await response.text(), '');
  assert.deepEqual(await readFile(path), before);
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Ошибки сохранения', 'PUT /api/features/:code возвращает HTTP 400 без записи при некорректном теле, неизвестном поле, дублирующем коде, повторном названии группы или некорректном атрибуте', () => withServer(async (url, project) => {
  const before = await readFile(join(project.root, 'specs/feature.spec.yml'));
  const current = await feature(url);
  for (const body of [
    { invalid: true },
    { ...updateBody(current), unknown: true },
    updateBody(current, { code: 'feature-two' }),
    updateBody(current, { groups: [{ title: 'Group', assertions: [] }, { title: 'Group', assertions: [] }] }),
    updateBody(current, { attributes: { unknown: ['value'] } }),
  ]) assert.equal((await json(`${url}/api/features/feature-one`, 'PUT', body)).status, 400);
  assert.deepEqual(await readFile(join(project.root, 'specs/feature.spec.yml')), before);
}, async (project) => writeFile(join(project.root, 'specs/other.spec.yml'), 'code: feature-two\nfeature: Feature two\n')));

specTest('serve-feature-update-put', 'PUT /api/features/:code', 'Ошибки сохранения', 'PUT /api/features/:code возвращает HTTP 404 без записи для отсутствующей фичи', () => withServer(async (url, project) => {
  const before = await readFile(join(project.root, 'specs/feature.spec.yml'));
  assert.equal((await json(`${url}/api/features/missing`, 'PUT', updateBody(await feature(url)))).status, 404);
  assert.deepEqual(await readFile(join(project.root, 'specs/feature.spec.yml')), before);
}));
