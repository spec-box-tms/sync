import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

const readEvent = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  let event = '';
  while (!event.includes('\n\n')) {
    const { done, value } = await reader.read();
    if (done) throw new Error('SSE stream closed before an event arrived');
    event += new TextDecoder().decode(value);
  }
  return event;
};

const withEvents = async (fn: (project: Awaited<ReturnType<typeof createProject>>, service: ProjectSnapshotService, response: Response, reader: ReadableStreamDefaultReader<Uint8Array>) => Promise<void>) => {
  const project = await createProject();
  const service = new ProjectSnapshotService(project.root);
  await service.refresh();
  const server = await startServer({ projectRoot: project.root, port: 0, service });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(`${server.url}/api/events`);
    reader = response.body!.getReader();
    await fn(project, service, response, reader);
  } finally {
    await reader?.cancel();
    await server.close();
    await project.dispose();
  }
};


specTest(
  'serve-events-get',
  'GET /api/events',
  'Уведомления',
  'GET /api/events открывает поток text/event-stream',
  () => withEvents(async (_project, _service, response) => {
    assert.match(response.headers.get('content-type') || '', /^text\/event-stream/);
  }),
);

specTest(
  'serve-events-get',
  'GET /api/events',
  'Наблюдение за проектом',
  'Изменение файла вне конфигурации, YAML, метаданных и отчётов не запускает пересчёт проекта',
  () => withEvents(async (project, service) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const revision = service.snapshot.revision;
    await writeFile(join(project.root, 'unwatched.txt'), 'ignore me');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(service.snapshot.revision, revision);
  }),
);

specTest(
  'serve-events-get',
  'GET /api/events',
  'Наблюдение за проектом',
  'Создание настроенного отчёта в отсутствующем каталоге запускает пересчёт проекта',
  () => withEvents(async (project, service) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const revision = service.snapshot.revision;
    await mkdir(join(project.root, 'test-results'));
    await writeFile(join(project.root, 'test-results', 'junit.xml'), '<testsuites/>');
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(service.snapshot.revision, revision + 1);
  }),
);

specTest(
  'serve-events-get',
  'GET /api/events',
  'Уведомления',
  'После каждого полного пересчёта GET /api/events отправляет событие project-updated с новой ревизией',
  () => withEvents(async (_project, service, _response, reader) => {
    await service.refresh();
    assert.match(await readEvent(reader), /event: project-updated\ndata: {"revision":2}/);
  }),
);

specTest(
  'serve-events-get',
  'GET /api/events',
  'Уведомления',
  'Данные события project-updated содержат только JSON с полем revision без ProjectSnapshot',
  () => withEvents(async (_project, service, _response, reader) => {
    await service.refresh();
    const match = (await readEvent(reader)).match(/^data: (.+)$/m);
    assert.ok(match);
    assert.deepEqual(JSON.parse(match[1]), { revision: 2 });
  }),
);

specTest(
  'serve-events-get',
  'GET /api/events',
  'Уведомления',
  'Несколько быстрых изменений наблюдаемых файлов объединяются в один пересчёт и одно событие project-updated',
  () => withEvents(async (project, service, _response, reader) => {
    const revisions: number[] = [];
    const unsubscribe = service.subscribe(({ revision }) => revisions.push(revision));
    try {
      const initialRevision = service.snapshot.revision;
      const path = join(project.root, 'specs', 'feature.spec.yml');
      const source = await readFile(path, 'utf8');
      await writeFile(path, `${source}description: first\n`);
      await writeFile(path, `${source}description: second\n`);
      assert.match(await readEvent(reader), new RegExp(`data: {"revision":${initialRevision + 1}}`));
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.deepEqual(revisions, [initialRevision + 1]);
    } finally {
      unsubscribe();
    }
  }),
);
