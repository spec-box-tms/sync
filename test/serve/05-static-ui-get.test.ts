import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { startServer } from '../../src/lib/serve/server';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

specTest(
  'serve-static-ui',
  'GET /client-side-route',
  'SPA fallback',
  'Не-API маршрут возвращает index.html собранного Angular-приложения',
  async () => {
    const project = await createProject();
    await mkdir(join(project.root, 'dist', 'ui'), { recursive: true });
    await writeFile(join(project.root, 'dist', 'ui', 'index.html'), '<app-root>Serve UI</app-root>');
    const server = await startServer({ projectRoot: project.root, port: 0, service: { snapshot: { revision: 1 } } });
    try {
      assert.equal(await (await fetch(`${server.url}/features/example`)).text(), '<app-root>Serve UI</app-root>');
    } finally {
      await server.close();
      await project.dispose();
    }
  },
);
