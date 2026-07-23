import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

const source = '# comment\nfeature: Feature one\nunknown: true\ncode: feature-one\n';

const withServer = async (fn: (url: string) => Promise<void>) => {
  const project = await createProject();
  await writeFile(`${project.root}/specs/feature.spec.yml`, source);
  const service = new ProjectSnapshotService(project.root);
  await service.refresh();
  const server = await startServer({ projectRoot: project.root, port: 0, service });
  try {
    await fn(server.url);
  } finally {
    await server.close();
    await project.dispose();
  }
};

specTest('serve-feature-yaml-get', 'GET /api/features/:code/yaml', 'Успешный ответ', 'GET /api/features/:code/yaml возвращает исходные байты YAML-файла с HTTP 200', () => withServer(async (url) => {
  const response = await fetch(`${url}/api/features/feature-one/yaml`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), source);
}));

specTest('serve-feature-yaml-get', 'GET /api/features/:code/yaml', 'Успешный ответ', 'Ответ GET /api/features/:code/yaml содержит Content-Type application/yaml; charset=utf-8', () => withServer(async (url) => {
  const response = await fetch(`${url}/api/features/feature-one/yaml`);
  assert.equal(response.headers.get('content-type'), 'application/yaml; charset=utf-8');
}));

specTest('serve-feature-yaml-get', 'GET /api/features/:code/yaml', 'Успешный ответ', 'Ответ GET /api/features/:code/yaml содержит ETag в виде MD5 исходных байтов YAML-файла в кавычках', () => withServer(async (url) => {
  const response = await fetch(`${url}/api/features/feature-one/yaml`);
  assert.equal(response.headers.get('etag'), `"${createHash('md5').update(source).digest('hex')}"`);
}));

specTest('serve-feature-yaml-get', 'GET /api/features/:code/yaml', 'Отсутствующая фича', 'GET /api/features/:code/yaml для отсутствующего кода возвращает HTTP 404', () => withServer(async (url) => {
  assert.equal((await fetch(`${url}/api/features/missing/yaml`)).status, 404);
}));
