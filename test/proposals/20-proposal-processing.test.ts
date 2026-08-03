import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ProjectData, Statement } from '../../src/lib/domain';
import { featureToMarkdown } from '../../src/lib/markdown/feature-to-markdown';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { applyTestReport } from '../../src/lib/test-matcher';
import { TestReport } from '../../src/lib/test-matcher/models';
import { Validator } from '../../src/lib/validators';
import { createProject } from '../serve/fixtures';
import { specTest } from '../serve/spec-name';

const projectData = (): ProjectData => ({
  project: {},
  attributes: [],
  trees: [],
  metaFilePath: '.spec-box-meta.yml',
  features: [
    {
      code: 'source',
      title: 'Source',
      fileName: 'source',
      filePath: 'source.yml',
      groups: [
        {
          title: 'Flow',
          assertions: [
            { type: 'assert', title: 'Required', isAutomated: false },
            {
              type: 'proposal',
              title: 'Planned $target',
              description: 'Later details',
              isAutomated: false,
            },
          ],
        },
      ],
    },
  ],
});

const matchingReport: TestReport = {
  total: 2,
  startTime: 0,
  duration: 1,
  testResults: [
    { name: 'Source Flow Required', filePath: 'test.ts', status: 'passed' },
    { name: 'Source Flow Planned $target', filePath: 'test.ts', status: 'passed' },
  ],
};

const applyMatchingReport = () => {
  const data = projectData();
  applyTestReport(
    new Validator({}),
    data,
    matchingReport,
    ['featureTitle', 'groupTitle', 'assertionTitle'],
  );
  return data.features[0].groups[0].assertions;
};

const withCoverageProject = async <T>(
  run: (context: {
    root: string;
    service: ProjectSnapshotService;
    featurePath: string;
    featureSource: string;
  }) => Promise<T>,
) => {
  const project = await createProject();
  const featurePath = join(project.root, 'specs', 'feature.spec.yml');
  const featureSource = [
    'code: feature-one',
    'feature: Feature one',
    'definitions:',
    '  tool: [serve]',
    'specs-unit:',
    '  Group:',
    '    - assert: Required',
    '    - proposal: Planned',
    '',
  ].join('\n');
  try {
    await writeFile(featurePath, featureSource);
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
    await mkdir(join(project.root, 'test-results'));
    await writeFile(
      join(project.root, 'test-results', 'junit.xml'),
      '<testsuites><testcase name="feature-one Feature one Group Required"/></testsuites>',
    );
    const service = new ProjectSnapshotService(project.root);
    return await run({ root: project.root, service, featurePath, featureSource });
  } finally {
    await project.dispose();
  }
};

specTest(
  'proposal-processing',
  'Обработка предложений',
  'Автоматизация и покрытие',
  'Сопоставление с отчётами Jest и JUnit выполняется только для элементов типа assert',
  () => {
    const statements = applyMatchingReport();
    assert.equal(statements[0].isAutomated, true);
  },
);

specTest(
  'proposal-processing',
  'Обработка предложений',
  'Автоматизация и покрытие',
  'Элемент proposal остаётся неавтоматизированным при наличии теста с совпадающим составным именем',
  () => {
    const statements = applyMatchingReport();
    assert.equal(statements[1].isAutomated, false);
  },
);

specTest(
  'proposal-processing',
  'Обработка предложений',
  'Автоматизация и покрытие',
  'Proposal не входит в total, automated и uncovered проекта, деревьев и списка фич',
  () =>
    withCoverageProject(async ({ service }) => {
      const snapshot = await service.refresh();
      assert.deepEqual(snapshot.coverage, { total: 1, automated: 1, uncovered: 0 });
      assert.deepEqual(
        {
          total: snapshot.trees[0].totalCount,
          automated: snapshot.trees[0].automatedCount,
        },
        { total: 1, automated: 1 },
      );
    }),
);

specTest(
  'proposal-processing',
  'Обработка предложений',
  'Автоматизация и покрытие',
  'После замены proposal на assert утверждение участвует в сопоставлении тестов и показателях покрытия при следующем пересчёте проекта',
  () =>
    withCoverageProject(async ({ service, featurePath, featureSource }) => {
      await service.refresh();
      await writeFile(
        featurePath,
        featureSource.replace('    - proposal: Planned', '    - assert: Planned'),
      );
      const snapshot = await service.refresh();
      assert.deepEqual(snapshot.coverage, { total: 2, automated: 1, uncovered: 1 });
    }),
);

specTest(
  'proposal-processing',
  'Обработка предложений',
  'Остальная обработка',
  'Proposal участвует в построении графа зависимостей по ссылкам из названия и description',
  () =>
    withCoverageProject(async ({ root, service, featurePath }) => {
      await writeFile(
        featurePath,
        [
          'code: feature-one',
          'feature: Feature one',
          'specs-unit:',
          '  Group:',
          '    - proposal: Planned $target',
          '      description: Depends on $target-description',
          '',
        ].join('\n'),
      );
      await writeFile(join(root, 'specs', 'target.spec.yml'), 'code: target\nfeature: Target\n');
      await writeFile(
        join(root, 'specs', 'target-description.spec.yml'),
        'code: target-description\nfeature: Target description\n',
      );
      const snapshot = await service.refresh();
      assert.deepEqual(snapshot.dependencyGraph.edges, [
        { from: 'feature-one', to: 'target', resolved: true },
        { from: 'feature-one', to: 'target-description', resolved: true },
      ]);
    }),
);

specTest(
  'proposal-processing',
  'Обработка предложений',
  'Остальная обработка',
  'Markdown-экспорт включает proposal в исходной группе и порядке и явно помечает его как предложение',
  () => {
    const markdown = featureToMarkdown(projectData().features[0]);
    assert.match(
      markdown,
      /- Required[\s\S]*- \*\*Предложение:\*\* Planned \$target/,
    );
    assert.match(markdown, /> Later details/);
  },
);
