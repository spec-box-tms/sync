import { existsSync, FSWatcher, watch } from 'node:fs';
import { createServer, Server } from 'node:http';
import { join } from 'node:path';

import express from 'express';

import { ProjectSnapshot } from './models';
import { FeatureService } from './features';
import { GitAdapter, gitAdapter } from './git';
import { parse } from 'yaml';
import { parseObject } from '../utils';
import { entityDecoder } from '../yaml/models';

export interface StartServerOptions {
  projectRoot: string;
  port: number;
  service: { snapshot: ProjectSnapshot | Record<string, unknown> };
  git?: GitAdapter;
}

export interface RunningServer {
  httpServer: Server;
  url: string;
  close(): Promise<void>;
}

export const startServer = async ({
  projectRoot,
  port,
  service,
  git = gitAdapter,
}: StartServerOptions): Promise<RunningServer> => {
  const app = express();
  const clients = new Set<import('express').Response>();
  let unsubscribe: (() => void) | undefined;
  let watcher: FSWatcher | undefined;
  let refreshTimer: NodeJS.Timeout | undefined;
  app.use(express.json());
  app.use((error: Error & { body?: unknown }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ errors: [{ code: 'invalid-request', message: 'Некорректный JSON', path: '' }] });
    }
    return next(error);
  });
  app.get('/api/project', (_req, res) => res.json(service.snapshot));
  const features = service instanceof Object && 'refresh' in service ? new FeatureService(service as never) : undefined;
  if (service instanceof Object && 'subscribe' in service) {
    unsubscribe = (service as { subscribe(listener: (snapshot: ProjectSnapshot) => void): () => void }).subscribe(({ revision }) => {
      for (const client of clients) client.write(`event: project-updated\ndata: ${JSON.stringify({ revision })}\n\n`);
    });
  }
  app.get('/api/events', (req, res) => {
    res.status(200).set({
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    }).flushHeaders();
    clients.add(res);
    req.on('close', () => clients.delete(res));
  });
  app.get('/api/features/:code/history', async (req, res) => {
    if (!features || !('projectRoot' in service)) return res.json([]);
    const feature = (service.snapshot as ProjectSnapshot).features.find((item) => item.code === req.params.code);
    if (!feature) return res.json([]);
    try {
      return res.json(await git.history((service as { projectRoot: string }).projectRoot, feature.filePath));
    } catch {
      return res.json([]);
    }
  });
  app.get('/api/features/:code', async (req, res) => {
    if (!features) return res.sendStatus(404);
    const revision = typeof req.query.revision === 'string' ? req.query.revision : undefined;
    if (revision && 'projectRoot' in service) {
      const current = (service.snapshot as ProjectSnapshot).features.find((item) => item.code === req.params.code);
      if (!current) return res.sendStatus(404);
      let source: Buffer | undefined;
      try {
        source = await git.fileAtRevision((service as { projectRoot: string }).projectRoot, current.filePath, revision);
      } catch {
        return res.sendStatus(404);
      }
      if (!source) return res.sendStatus(404);
      try {
        const entity = parseObject(parse(source.toString('utf8')), entityDecoder);
        if (entity.code !== req.params.code) return res.sendStatus(404);
        return res.json({
          code: entity.code,
          title: entity.feature,
          ...(entity.description === undefined ? {} : { description: entity.description }),
          attributes: entity.definitions || {},
          groups: Object.entries(entity['specs-unit'] || {}).map(([title, assertions]) => ({
            title,
            assertions: assertions.map(({ assert: assertionTitle, description }) => ({ title: assertionTitle, ...(description === undefined ? {} : { description }), isAutomated: false })),
          })),
          filePath: current.filePath,
        });
      } catch {
        return res.sendStatus(404);
      }
    }
    const feature = await features.current(req.params.code);
    return feature ? res.json(feature) : res.sendStatus(404);
  });
  app.post('/api/features', async (req, res) => {
    if (!features) return res.sendStatus(404);
    const result = await features.create(req.body);
    return 'errors' in result ? res.status(400).json(result) : res.status(201).json(result.snapshot);
  });
  app.put('/api/features/:code', async (req, res) => {
    if (!features) return res.sendStatus(404);
    const result = await features.update(req.params.code, req.body);
    if (result === 'missing') return res.sendStatus(404);
    if (result === 'conflict') return res.status(409).end();
    return 'errors' in result ? res.status(400).json(result) : res.json(result.snapshot);
  });

  const staticPath = join(projectRoot, 'dist', 'ui');
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
  }

  const httpServer = createServer(app);
  if (service instanceof Object && 'refresh' in service) {
    try {
      watcher = watch(projectRoot, { recursive: true }, () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => void (service as { refresh(): Promise<unknown> }).refresh(), 50);
      });
    } catch {
      // fs.watch is a best-effort local convenience; the API remains usable without it.
    }
  }
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, '127.0.0.1', () => {
      httpServer.off('error', reject);
      resolve();
    });
  });
  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Сервер не вернул TCP-адрес');
  }
  const url = `http://127.0.0.1:${address.port}`;

  return {
    httpServer,
    url,
    close: () => new Promise((resolve, reject) => {
      if (refreshTimer) clearTimeout(refreshTimer);
      watcher?.close();
      unsubscribe?.();
      clients.forEach((client) => client.end());
      httpServer.close((error) => error ? reject(error) : resolve());
    }),
  };
};
