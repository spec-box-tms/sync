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

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Успешное сохранение', 'PUT /api/features/:code/yaml с актуальным If-Match сохраняет исходные YAML-байты и возвращает пересчитанный ProjectSnapshot', () => withServer(async (url, project) => {
  const current = await fetch(`${url}/api/features/feature-one/yaml`);
  const response = await putYaml(`${url}/api/features/feature-one/yaml`, current.headers.get('etag')!);
  assert.equal(response.status, 200);
  assert.deepEqual(await readFile(join(project.root, 'specs/feature.spec.yml')), Buffer.from(source));
  const snapshot = await response.json() as Snapshot;
  assert.equal(snapshot.revision, 2);
  assert.equal(snapshot.features[0].title, 'Changed');
}));

specTest('serve-feature-update-put', 'PUT /api/features/:code/yaml', 'Ошибки сохранения', 'PUT /api/features/:code/yaml возвращает HTTP 409 без тела и не меняет YAML-файл без If-Match или с устаревшим If-Match', () => withServer(async (url, project) => {
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
