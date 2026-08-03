import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeCreateFeatureRequest } from '../../src/lib/serve/models';
import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

type Project = Awaited<ReturnType<typeof createProject>>;
type Snapshot = { revision: number; features: Array<{ code: string; title: string; filePath: string }>; diagnostics: Array<{ code: string }> };
type Statement =
  | { type: 'assert'; title: string; description?: string; isAutomated: boolean }
  | { type: 'proposal'; title: string; description?: string; isAutomated: false };
type Feature = {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: Array<{ title: string; assertions: Statement[] }>;
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

specTest('serve-feature-create-post', 'POST /api/features', 'Проверка запроса', 'Неизвестное поле в теле POST /api/features возвращается с точным JSON Pointer path', () => {
  assert.deepEqual(decodeCreateFeatureRequest({ filePath: 'specs/new.spec.yml', code: 'new', title: 'New', extra: true }), {
    errors: [{ code: 'invalid-request', message: 'unknown field', path: '/extra' }],
  });
});

specTest('serve-feature-create-post', 'POST /api/features', 'Успешное создание', 'POST /api/features принимает только filePath, code и title', () => withServer(async (url) => {
  assert.equal((await json(`${url}/api/features`, 'POST', { filePath: 'specs/new.spec.yml', code: 'new', title: 'New', extra: true })).status, 400);
}));

specTest('serve-feature-create-post', 'POST /api/features', 'Успешное создание', 'POST /api/features с допустимым уникальным путём, кодом и непустым названием создаёт недостающие родительские каталоги, минимально валидный YAML и возвращает пересчитанный ProjectSnapshot с HTTP 201', () => withServer(async (url, project) => {
  const response = await json(`${url}/api/features`, 'POST', { filePath: 'specs/new/deep/feature.spec.yml', code: 'feature-two', title: 'Feature two' });
  assert.equal(response.status, 201);
  const snapshot = await response.json() as Snapshot;
  assert.ok(snapshot.features.some((item) => item.code === 'feature-two'));
  assert.equal(await readFile(join(project.root, 'workspace/specs/new/deep/feature.spec.yml'), 'utf8'), 'code: feature-two\nfeature: Feature two\n');
}, useProjectPath));

specTest('serve-feature-create-post', 'POST /api/features', 'Успешное создание', 'Имя и суффикс нового YAML-файла полностью задаются filePath без добавления сервером', () => withServer(async (url, project) => {
  const filePath = 'specs/custom-name.feature.spec.yml';
  assert.equal((await json(`${url}/api/features`, 'POST', { filePath, code: 'feature-two', title: 'Feature two' })).status, 201);
  assert.equal((await stat(join(project.root, filePath))).isFile(), true);
}, async (project) => writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, yml: { files: ['specs/**/*.{spec.yml,spec.yaml}'] } }))));

specTest('serve-feature-create-post', 'POST /api/features', 'Проверка запроса', 'POST /api/features отклоняет HTTP 400 путь вне каталога проекта, не соответствующий положительному шаблону yml.files или соответствующий исключающему шаблону', () => withServer(async (url) => {
  for (const filePath of ['../outside.spec.yml', 'other/new.spec.yml', 'specs/private/new.spec.yml']) {
    assert.equal((await json(`${url}/api/features`, 'POST', { filePath, code: `code${filePath.length}`, title: 'Title' })).status, 400);
  }
}, async (project) => writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, yml: { files: ['specs/**/*.spec.yml', '!specs/private/**'] } }))));

specTest('serve-feature-create-post', 'POST /api/features', 'Проверка запроса', 'POST /api/features отклоняет HTTP 400 существующий файл, дублирующий код, некорректный код или пустое название', () => withServer(async (url) => {
  for (const body of [
    { filePath: 'specs/feature.spec.yml', code: 'feature-two', title: 'Title' },
    { filePath: 'specs/new.spec.yml', code: 'feature-one', title: 'Title' },
    { filePath: 'specs/new.spec.yml', code: 'bad code', title: 'Title' },
    { filePath: 'specs/new.spec.yml', code: 'feature-two', title: '  ' },
  ]) assert.equal((await json(`${url}/api/features`, 'POST', body)).status, 400);
}));

specTest('serve-feature-create-post', 'POST /api/features', 'Проверка запроса', 'POST /api/features отклоняет HTTP 400 некорректное тело или неизвестное поле', () => withServer(async (url) => {
  assert.equal((await json(`${url}/api/features`, 'POST', { filePath: 'specs/new.spec.yml', code: 'new', title: 1 })).status, 400);
  assert.equal((await json(`${url}/api/features`, 'POST', { filePath: 'specs/new.spec.yml', code: 'new', title: 'New', unknown: true })).status, 400);
  const malformed = await fetch(`${url}/api/features`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.ok(Array.isArray((await malformed.json() as { errors: unknown[] }).errors));
}));

specTest('serve-feature-create-post', 'POST /api/features', 'Проверка запроса', 'Каждый ответ HTTP 400 содержит errors с code, message и JSON Pointer path для каждой найденной ошибки', () => withServer(async (url) => {
  const response = await json(`${url}/api/features`, 'POST', { filePath: 1, code: '', title: '', unknown: true });
  assert.equal(response.status, 400);
  const result = await response.json() as { errors: Array<{ code: string; message: string; path: string }> };
  assert.ok(result.errors.length >= 3);
  result.errors.forEach((error) => {
    assert.equal(typeof error.code, 'string');
    assert.equal(typeof error.message, 'string');
    assert.match(error.path, /^($|\/)/);
  });
}));

specTest('serve-feature-create-post', 'POST /api/features', 'Проверка запроса', 'Отклонённый POST /api/features не создаёт каталогов и не изменяет файлы рабочей копии', () => withServer(async (url, project) => {
  const original = await readFile(join(project.root, 'specs/feature.spec.yml'));
  const escaped = join(tmpdir(), `spec-box-task3-${randomUUID()}.spec.yml`);
  await symlink(tmpdir(), join(project.root, 'specs/link'));
  assert.equal((await json(`${url}/api/features`, 'POST', { filePath: 'blocked/nested/new.spec.yml', code: 'bad code', title: '' })).status, 400);
  assert.equal((await json(`${url}/api/features`, 'POST', { filePath: `specs/link/${escaped.split('/').pop()}`, code: 'feature-two', title: 'Title' })).status, 400);
  await assert.rejects(stat(join(project.root, 'blocked')));
  await assert.rejects(stat(escaped));
  assert.deepEqual(await readFile(join(project.root, 'specs/feature.spec.yml')), original);
  await rm(escaped, { force: true });
}));
