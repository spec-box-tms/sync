import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import yargs from 'yargs/yargs';

import { cmdServe } from '../../src/commands/serve';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { specTest } from '../serve/spec-name';

const localRequire = createRequire(__filename);

type ParsedServeOptions = {
  port: number;
  readOnly?: boolean;
  config?: string;
};

type StartServerOptions = {
  readOnly?: boolean;
  service: ProjectSnapshotService;
};

type StartServerModule = {
  startServer: (options: StartServerOptions) => Promise<{
    url: string;
    close(): Promise<void>;
  }>;
};

const parseServeOptions = async (args: string[]) => {
  if (typeof cmdServe.builder !== 'function')
    throw new Error('Expected a command builder');

  const parser = await cmdServe.builder(yargs([]) as never);
  return (await parser.parseAsync(args)) as ParsedServeOptions;
};

const captureStartServerOptions = () => {
  const serverModule = localRequire('../../src/lib/serve/server') as StartServerModule;
  const originalStartServer = serverModule.startServer;
  let received: StartServerOptions | undefined;

  serverModule.startServer = async (options) => {
    received = options;
    return { url: 'test', close: async () => undefined };
  };

  return {
    received: () => received,
    restore: () => {
      serverModule.startServer = originalStartServer;
    },
  };
};

const parseAndRun = async (args: string[]) => {
  const parsed = await parseServeOptions(args);
  const startServer = captureStartServerOptions();
  const originalRefresh = ProjectSnapshotService.prototype.refresh;
  const originalLog = console.log;

  ProjectSnapshotService.prototype.refresh = async () => ({}) as never;
  console.log = () => undefined;

  try {
    await (cmdServe.handler as (options: typeof parsed) => Promise<void>)(
      parsed,
    );
    const options = startServer.received();
    return {
      parsed: parsed.readOnly,
      propagated: options?.readOnly,
      snapshotReadOnly: options?.service.snapshot.readOnly,
    };
  } finally {
    startServer.restore();
    ProjectSnapshotService.prototype.refresh = originalRefresh;
    console.log = originalLog;
  }
};

specTest(
  'serve-backend',
  'Локальный backend serve',
  'Режим сервера',
  'команда serve с --read-only запускает сервер в режиме чтения',
  async () => {
    assert.deepEqual(await parseAndRun(['--read-only']), {
      parsed: true,
      propagated: true,
      snapshotReadOnly: true,
    });
  },
);

specTest(
  'serve-backend',
  'Локальный backend serve',
  'Режим сервера',
  'команда serve без --read-only запускает сервер в режиме записи и чтения',
  async () => {
    assert.deepEqual(await parseAndRun([]), {
      parsed: false,
      propagated: false,
      snapshotReadOnly: false,
    });
  },
);
