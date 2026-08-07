import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import yargs from 'yargs/yargs';

import { cmdServe } from '../../src/commands/serve';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { specTest } from '../serve/spec-name';

const localRequire = createRequire(__filename);

const parseAndRun = async (args: string[]) => {
  if (typeof cmdServe.builder !== 'function') throw new Error('Expected a command builder');
  const parser = await cmdServe.builder(yargs([]) as never);
  const parsed = await parser.parseAsync(args) as {
    port: number;
    readOnly?: boolean;
    config?: string;
  };
  const serverModule = localRequire('../../src/lib/serve/server') as {
    startServer: (options: {
      readOnly?: boolean;
    }) => Promise<{
      url: string;
      close(): Promise<void>;
    }>;
  };
  const originalStartServer = serverModule.startServer;
  const originalRefresh = ProjectSnapshotService.prototype.refresh;
  const originalLog = console.log;
  let propagated: boolean | undefined;
  serverModule.startServer = async (options) => {
    propagated = options.readOnly;
    return { url: 'http://127.0.0.1:3000', close: async () => undefined };
  };
  ProjectSnapshotService.prototype.refresh = async () => ({}) as never;
  console.log = () => undefined;
  try {
    await (cmdServe.handler as (options: typeof parsed) => Promise<void>)(parsed);
  } finally {
    serverModule.startServer = originalStartServer;
    ProjectSnapshotService.prototype.refresh = originalRefresh;
    console.log = originalLog;
  }
  return { parsed: parsed.readOnly, propagated };
};

specTest(
  'serve-backend',
  'Локальный backend serve',
  'Режим сервера',
  'serve без --read-only разбирает и передаёт в startServer значение false',
  async () => {
    assert.deepEqual(await parseAndRun([]), { parsed: false, propagated: false });
  },
);

specTest(
  'serve-backend',
  'Локальный backend serve',
  'Режим сервера',
  'serve с --read-only разбирает и передаёт в startServer значение true',
  async () => {
    assert.deepEqual(await parseAndRun(['--read-only']), { parsed: true, propagated: true });
  },
);
