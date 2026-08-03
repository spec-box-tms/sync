import { existsSync, FSWatcher, watch } from 'node:fs';
import { createServer, Server } from 'node:http';
import { basename, dirname, join, relative, resolve } from 'node:path';

import express from 'express';

import { FeatureStatementResponse, ProjectSnapshot } from './models';
import { FeatureService } from './features';
import { GitAdapter, gitAdapter } from './git';
import { parse } from 'yaml';
import { parseObject } from '../utils';
import { entityDecoder, Statement as YamlStatement } from '../yaml/models';
import { RootConfig } from '../config/models';

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

type RefreshableService = StartServerOptions['service'] & {
  refresh(): Promise<unknown>;
  config?: RootConfig;
  configPath?: string;
};

const historicalStatement = (
  statement: YamlStatement,
): FeatureStatementResponse =>
  'assert' in statement
    ? {
        type: 'assert',
        title: statement.assert,
        ...(statement.description === undefined
          ? {}
          : { description: statement.description }),
        isAutomated: false,
      }
    : {
        type: 'proposal',
        title: statement.proposal,
        ...(statement.description === undefined
          ? {}
          : { description: statement.description }),
        isAutomated: false,
      };

const staticRoot = (pattern: string) => {
  const parts = pattern.split(/[\\/]/);
  const dynamicPart = parts.findIndex((part) => /[*?\[\]{}()!]/.test(part));
  const root = parts.slice(0, dynamicPart < 0 ? -1 : dynamicPart);
  return root.length ? root.join('/') : '.';
};

export const startServer = async ({
  projectRoot,
  port,
  service,
  git = gitAdapter,
}: StartServerOptions): Promise<RunningServer> => {
  const app = express();
  const clients = new Set<import('express').Response>();
  let unsubscribe: (() => void) | undefined;
  let watchers: FSWatcher[] = [];
  let refreshTimer: NodeJS.Timeout | undefined;
  let closed = false;
  const refreshable = service instanceof Object && 'refresh' in service ? service as RefreshableService : undefined;

  const closeWatchers = () => {
    watchers.forEach((watcher) => watcher.close());
    watchers = [];
  };
  const watchPaths = (): Array<{ path: string; recursive: boolean; fileName?: string }> => {
    const configPath = resolve(projectRoot, refreshable?.configPath || '.tms.json');
    const config = refreshable?.config;
    const file = (path: string) => {
      let directory = dirname(path);
      while (!existsSync(directory) && dirname(directory) !== directory) directory = dirname(directory);
      return { path: directory, recursive: directory !== dirname(path), fileName: relative(directory, path) || basename(path) };
    };
    if (!config) return [file(configPath)];
    const root = config.projectPath ? resolve(projectRoot, config.projectPath) : projectRoot;
    return [
      file(configPath),
      file(resolve(root, config.yml.metaPath || '.spec-box-meta.yml')),
      ...config.yml.files.filter((pattern) => !pattern.startsWith('!')).map((pattern) => ({ path: resolve(root, staticRoot(pattern)), recursive: true })),
      ...(config.jest ? [file(resolve(root, config.jest.reportPath))] : []),
      ...(config.JUnit ? [file(resolve(root, config.JUnit.reportPath))] : []),
    ];
  };
  const configureWatchers = () => {
    if (closed) return;
    closeWatchers();
    for (const target of watchPaths()) {
      try {
        watchers.push(watch(target.path, { recursive: target.recursive }, (_event, filename) => {
          if (target.fileName && (!filename || filename.toString() !== target.fileName)) return;
          scheduleRefresh();
        }));
      } catch {
        // A missing optional report must not stop the local server.
      }
    }
  };
  const scheduleRefresh = () => {
    if (closed) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      void refreshable?.refresh().then(configureWatchers).catch(() => undefined);
    }, 50);
  };
  app.use(express.json());
  app.use((error: Error & { body?: unknown }, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.endsWith('/yaml')) return res.sendStatus(415);
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ errors: [{ code: 'invalid-request', message: 'Некорректный JSON', path: '' }] });
    }
    return next(error);
  });
  app.get('/api/project', (_req, res) => res.json(service.snapshot));
  const features = refreshable ? new FeatureService(service as never) : undefined;
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
  app.get('/api/features/:code/yaml', async (req, res) => {
    const yaml = await features?.yaml(req.params.code);
    if (!yaml) return res.sendStatus(404);
    return res.type('application/yaml; charset=utf-8').set('ETag', yaml.etag).send(yaml.bytes);
  });
  app.get('/api/features/:code', async (req, res) => {
    if (!features) return res.sendStatus(404);
    if (Object.prototype.hasOwnProperty.call(req.query, 'revision')) {
      const revision = req.query.revision;
      if (typeof revision !== 'string' || !revision || !('projectRoot' in service)) return res.sendStatus(404);
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
            assertions: assertions.map(historicalStatement),
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
  app.put('/api/features/:code/yaml', express.raw({ type: ['application/yaml', 'text/yaml'] }), async (req, res) => {
    if (!features) return res.sendStatus(404);
    if (!Buffer.isBuffer(req.body)) return res.sendStatus(415);
    const result = await features.updateYaml(req.params.code, req.body, req.get('if-match'));
    if (result === 'missing') return res.sendStatus(404);
    if (result === 'conflict') return res.status(409).end();
    return res.json(result.snapshot);
  });
  const packagedUiPath = join(__dirname, '..', '..', 'ui');
  const staticPath = existsSync(packagedUiPath) ? packagedUiPath : join(projectRoot, 'dist', 'ui');
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => res.sendFile(join(staticPath, 'index.html')));
  }

  const httpServer = createServer(app);
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
  if (refreshable) configureWatchers();

  return {
    httpServer,
    url,
    close: () => new Promise((resolve, reject) => {
      closed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      closeWatchers();
      unsubscribe?.();
      clients.forEach((client) => client.end());
      httpServer.close((error) => error ? reject(error) : resolve());
    }),
  };
};
