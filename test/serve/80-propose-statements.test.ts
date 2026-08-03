import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshot } from '../../src/lib/serve/models';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

const exec = promisify(execFile);

type ApiStatement = {
  type: 'assert' | 'propose';
  title: string;
  description?: string;
  isAutomated: boolean;
};

type ApiFeature = {
  groups: Array<{ title: string; assertions: ApiStatement[] }>;
};

const withProposeServer = async <T>(
  run: (context: {
    url: string;
    snapshot: ProjectSnapshot;
    revision: string;
  }) => Promise<T>,
) => {
  const project = await createProject();
  try {
    await writeFile(
      join(project.root, '.spec-box-meta.yml'),
      [
        'attributes:',
        '  - code: tool',
        '    title: Tool',
        '    values:',
        '      - code: serve',
        '        title: Serve',
        'trees:',
        '  - code: by-tool',
        '    title: By tool',
        '    group-by: [tool]',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(project.root, 'specs', 'feature.spec.yml'),
      [
        'code: feature-one',
        'feature: Feature one',
        'definitions:',
        '  tool: [serve]',
        'specs-unit:',
        '  Group:',
        '    - assert: Required',
        '    - propose: Planned $target',
        '      description: Later',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(project.root, 'specs', 'target.spec.yml'),
      'code: target\nfeature: Target\n',
    );
    await exec('git', ['init'], { cwd: project.root });
    await exec('git', ['config', 'user.name', 'Test User'], { cwd: project.root });
    await exec('git', ['config', 'user.email', 'test@example.com'], {
      cwd: project.root,
    });
    await exec('git', ['add', '.'], { cwd: project.root });
    await exec('git', ['commit', '-m', 'Propose feature'], { cwd: project.root });
    const revision = (
      await exec('git', ['rev-parse', 'HEAD'], { cwd: project.root })
    ).stdout.trim();

    const service = new ProjectSnapshotService(project.root);
    const snapshot = await service.refresh();
    const server = await startServer({ projectRoot: project.root, port: 0, service });
    try {
      return await run({ url: server.url, snapshot, revision });
    } finally {
      await server.close();
    }
  } finally {
    await project.dispose();
  }
};

const getFeature = async (url: string) =>
  (await (await fetch(`${url}/api/features/feature-one`)).json()) as ApiFeature;

specTest(
  'serve-proposes',
  'Предложения в локальном редакторе',
  'Локальный API',
  'ProjectSnapshot и ответы текущей и исторической фичи сохраняют type каждого assert и propose',
  () =>
    withProposeServer(async ({ url, snapshot, revision }) => {
      const current = await getFeature(url);
      const historical = (await (
        await fetch(`${url}/api/features/feature-one?revision=${revision}`)
      ).json()) as ApiFeature;
      assert.deepEqual(
        snapshot.features[0].groups[0].assertions.map(({ type }) => type),
        ['assert', 'propose'],
      );
      assert.deepEqual(
        current.groups[0].assertions.map(({ type }) => type),
        ['assert', 'propose'],
      );
      assert.deepEqual(
        historical.groups[0].assertions.map(({ type }) => type),
        ['assert', 'propose'],
      );
    }),
);

specTest(
  'serve-proposes',
  'Предложения в локальном редакторе',
  'Локальный API',
  'Propose в ответе локального API имеет type равный propose и isAutomated равный false',
  () =>
    withProposeServer(async ({ url }) => {
      const feature = await getFeature(url);
      assert.deepEqual(feature.groups[0].assertions[1], {
        type: 'propose',
        title: 'Planned $target',
        description: 'Later',
        isAutomated: false,
      });
    }),
);

specTest(
  'serve-proposes',
  'Предложения в локальном редакторе',
  'Локальный API',
  'Показатели total, automated и uncovered в ProjectSnapshot и деревьях учитывают только assert',
  () =>
    withProposeServer(async ({ snapshot }) => {
      assert.deepEqual(snapshot.coverage, { total: 1, automated: 0, uncovered: 1 });
      assert.equal(snapshot.trees[0].totalCount, 1);
      assert.equal(snapshot.trees[0].automatedCount, 0);
    }),
);

specTest(
  'serve-proposes',
  'Предложения в локальном редакторе',
  'Локальный API',
  'Граф зависимостей ProjectSnapshot содержит связи из названия и description propose',
  () =>
    withProposeServer(async ({ snapshot }) => {
      assert.deepEqual(snapshot.dependencyGraph.edges, [
        { from: 'feature-one', to: 'target', resolved: true },
      ]);
    }),
);
