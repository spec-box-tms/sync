import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

type Project = Awaited<ReturnType<typeof createProject>>;
type Snapshot = { revision: number; features: Array<{ code: string; title: string }> };

const source = '# comment\nfeature: Changed\nunknown: true\ncode: feature-one\n';

const withServer = async (fn: (url: string, project: Project) => Promise<void>) => {
  const project = await createProject();
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

const putYaml = (url: string, ifMatch?: string, body: BodyInit = source, contentType: string | undefined = 'application/yaml; charset=utf-8') => fetch(url, {
  method: 'PUT',
  headers: {
    ...(contentType === undefined ? {} : { 'content-type': contentType }),
    ...(ifMatch === undefined ? {} : { 'if-match': ifMatch }),
  },
  body,
});

const currentEtag = async (url: string) => (await fetch(`${url}/api/features/feature-one/yaml`)).headers.get('etag')!;

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Успешное сохранение', 'PUT /api/features/:code/yaml принимает YAML в теле с Content-Type application/yaml; charset=utf-8 и актуальный If-Match', () => withServer(async (url) => {
  const response = await putYaml(`${url}/api/features/feature-one/yaml`, await currentEtag(url));
  assert.equal(response.status, 200);
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Успешное сохранение', 'PUT /api/features/:code/yaml записывает тело YAML без изменения комментариев, неизвестных полей, порядка ключей и форматирования', () => withServer(async (url, project) => {
  await putYaml(`${url}/api/features/feature-one/yaml`, await currentEtag(url));
  assert.deepEqual(await readFile(join(project.root, 'specs/feature.spec.yml')), Buffer.from(source));
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Успешное сохранение', 'PUT /api/features/:code/yaml с актуальным If-Match полностью пересчитывает проект и возвращает ProjectSnapshot с HTTP 200', () => withServer(async (url) => {
  const response = await putYaml(`${url}/api/features/feature-one/yaml`, await currentEtag(url));
  assert.equal(response.status, 200);
  const snapshot = await response.json() as Snapshot;
  assert.equal(snapshot.revision, 2);
  assert.equal(snapshot.features[0].title, 'Changed');
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Успешное сохранение', 'PUT /api/features/:code/yaml сохраняет ошибки YAML, неразрешённые ссылки и повторные названия assert или proposal и возвращает их в diagnostics нового ProjectSnapshot', () => withServer(async (url) => {
  const response = await putYaml(`${url}/api/features/feature-one/yaml`, await currentEtag(url), 'code: feature-one\nfeature: Changed\nspecs-unit: [\n');
  assert.equal(response.status, 200);
  const snapshot = await response.json() as Snapshot & { diagnostics: Array<{ severity: string }> };
  assert.ok(snapshot.diagnostics.some(({ severity }) => severity === 'error'));
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Ошибки сохранения', 'PUT /api/features/:code/yaml возвращает HTTP 409 без тела и не меняет YAML-файл при отсутствующем или несовпавшем If-Match', () => withServer(async (url, project) => {
  const path = join(project.root, 'specs/feature.spec.yml');
  const before = await readFile(path);
  for (const ifMatch of [undefined, '"stale"']) {
    const response = await putYaml(`${url}/api/features/feature-one/yaml`, ifMatch);
    assert.equal(response.status, 409);
    assert.equal(await response.text(), '');
    assert.deepEqual(await readFile(path), before);
  }
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Ошибки сохранения', 'PUT /api/features/:code/yaml возвращает HTTP 404 без записи для отсутствующей фичи', () => withServer(async (url, project) => {
  const path = join(project.root, 'specs/feature.spec.yml');
  const before = await readFile(path);
  const response = await putYaml(`${url}/api/features/missing/yaml`, '"current"');
  assert.equal(response.status, 404);
  assert.deepEqual(await readFile(path), before);
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Ошибки сохранения', 'PUT /api/features/:code/yaml возвращает HTTP 415 без записи для JSON или неподдерживаемого Content-Type', () => withServer(async (url, project) => {
  const path = join(project.root, 'specs/feature.spec.yml');
  const before = await readFile(path);
  const etag = (await fetch(`${url}/api/features/feature-one/yaml`)).headers.get('etag')!;
  for (const [body, contentType] of [[JSON.stringify(source), 'application/json'], [source, 'text/plain']] as const) {
    const response = await putYaml(`${url}/api/features/feature-one/yaml`, etag, body, contentType);
    assert.equal(response.status, 415);
    assert.deepEqual(await readFile(path), before);
  }
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Успешное сохранение', 'Два одновременных PUT /api/features/:code/yaml с одним ETag сохраняют ровно одно тело', () => withServer(async (url, project) => {
  const path = join(project.root, 'specs/feature.spec.yml');
  const etag = (await fetch(`${url}/api/features/feature-one/yaml`)).headers.get('etag')!;
  const bodies = [Buffer.from('code: feature-one\nfeature: First\n'), Buffer.from('code: feature-one\nfeature: Second\n')];
  const responses = await Promise.all(bodies.map((body) => putYaml(`${url}/api/features/feature-one/yaml`, etag, body)));
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 409]);
  const stored = await readFile(path);
  assert.ok(bodies.some((body) => body.equals(stored)));
}));
