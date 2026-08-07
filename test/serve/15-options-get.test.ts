import assert from 'node:assert/strict';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

const withServer = async (
  readOnly: boolean | undefined,
  fn: (url: string) => Promise<void>,
) => {
  const project = await createProject();
  const service = new ProjectSnapshotService(project.root);
  await service.refresh();
  const server = await startServer({
    projectRoot: project.root,
    port: 0,
    service,
    ...(readOnly === undefined ? {} : { readOnly }),
  });
  try {
    await fn(server.url);
  } finally {
    await server.close();
    await project.dispose();
  }
};

specTest(
  'serve-options-get',
  'GET /api/options',
  'Режим сервера',
  'GET /api/options возвращает HTTP 200 и JSON с единственным boolean-полем readOnly',
  () =>
    withServer(false, async (url) => {
      const response = await fetch(`${url}/api/options`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { readOnly: false });
    }),
);

specTest(
  'serve-options-get',
  'GET /api/options',
  'Режим сервера',
  'startServer без опции readOnly возвращает readOnly false',
  () =>
    withServer(undefined, async (url) => {
      assert.deepEqual(await (await fetch(`${url}/api/options`)).json(), {
        readOnly: false,
      });
    }),
);

specTest(
  'serve-options-get',
  'GET /api/options',
  'Режим сервера',
  'GET /api/options возвращает readOnly true для serve --read-only и false без флага',
  () =>
    withServer(true, async (url) => {
      assert.deepEqual(await (await fetch(`${url}/api/options`)).json(), {
        readOnly: true,
      });
    }),
);
