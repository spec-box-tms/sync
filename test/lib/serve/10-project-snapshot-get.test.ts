import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { startServer } from '../../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

specTest(
  'serve-project-get',
  'GET /api/project',
  'Успешный ответ',
  'Корректный ProjectSnapshot содержит ревизию, сведения о проекте, атрибуты, определения деревьев, фичи, диагностики, покрытие, области хранения, деревья и граф зависимостей',
  async () => {
    const project = await createProject();
    try {
      const service = new ProjectSnapshotService(project.root);
      const snapshot = await service.refresh();
      assert.equal(snapshot.revision, 1);
      assert.equal(snapshot.project?.title, 'Test');
      assert.equal(snapshot.features[0].code, 'feature-one');
      assert.deepEqual(snapshot.coverage, { total: 1, automated: 0, uncovered: 1 });
      assert.equal(snapshot.dependencyGraph.nodes[0].code, 'feature-one');
    } finally {
      await project.dispose();
    }
  },
);


specTest(
  'serve-project-get',
  'GET /api/project',
  'Успешный ответ',
  'Ревизия ProjectSnapshot увеличивается после каждого полного пересчёта проекта',
  async () => {
    const project = await createProject();
    try {
      const service = new ProjectSnapshotService(project.root);
      assert.equal((await service.refresh()).revision, 1);
      assert.equal((await service.refresh()).revision, 2);
    } finally {
      await project.dispose();
    }
  },
);
specTest(
  'serve-project-get',
  'GET /api/project',
  'Успешный ответ',
  'GET /api/project возвращает текущий ProjectSnapshot с HTTP 200 и JSON в кодировке UTF-8',
  async () => {
    const server = await startServer({
      projectRoot: process.cwd(),
      port: 0,
      service: { snapshot: { revision: 1, diagnostics: [] } },
    });
    try {
      const response = await fetch(`${server.url}/api/project`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') || '', /^application\/json; charset=utf-8/);
      assert.deepEqual(await response.json(), { revision: 1, diagnostics: [] });
    } finally {
      await server.close();
    }
  },
);

specTest('serve-project-get', 'GET /api/project', 'Успешный ответ', 'При ошибке YAML, мета-файла или отчёта ProjectSnapshot сохраняет данные остальных корректных файлов и содержит соответствующую диагностику', async () => {
  const project = await createProject();
  try {
    const service = new ProjectSnapshotService(project.root);
    await writeFile(join(project.root, 'specs', 'invalid.spec.yml'), 'code: [');
    let snapshot = await service.refresh();
    assert.equal(snapshot.features.length, 1);
    assert.ok(snapshot.diagnostics.some(({ code }) => code === 'loader-error'));
    await writeFile(join(project.root, '.spec-box-meta.yml'), 'attributes: [');
    snapshot = await service.refresh();
    assert.equal(snapshot.features.length, 1);
    assert.ok(snapshot.diagnostics.some(({ path }) => path === '.spec-box-meta.yml'));
    await writeFile(join(project.root, '.spec-box-meta.yml'), 'title: Test\nattributes: []\ntrees: []\n');
    await mkdir(join(project.root, 'test-results'));
    await writeFile(join(project.root, 'test-results', 'junit.xml'), '<not-junit/>');
    await writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, yml: { files: ['specs/feature.spec.yml'] }, JUnit: { reportPath: 'test-results/junit.xml', keys: ['featureCode', 'featureTitle', 'groupTitle', 'assertionTitle'] } }));
    snapshot = await service.refresh();
    assert.equal(snapshot.features.length, 1);
    assert.ok(snapshot.diagnostics.some(({ path }) => path === 'test-results/junit.xml'));
  } finally { await project.dispose(); }
});

specTest('serve-project-get', 'GET /api/project', 'Успешный ответ', 'При некорректной новой версии .tms.json работающий сервер возвращает ProjectSnapshot только с ревизией и диагностиками', async () => {
  const project = await createProject();
  const service = new ProjectSnapshotService(project.root);
  await service.refresh();
  const server = await startServer({ projectRoot: project.root, port: 0, service });
  try {
    await writeFile(join(project.root, '.tms.json'), '{');
    const snapshot = await service.refresh();
    const response = await fetch(`${server.url}/api/project`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), snapshot);
    assert.deepEqual(Object.keys(snapshot).sort(), ['diagnostics', 'revision']);
    assert.ok(snapshot.diagnostics.length > 0);
  } finally { await server.close(); await project.dispose(); }
});

specTest('serve-project-get', 'GET /api/project', 'Покрытие и зависимости', 'Покрытие в ProjectSnapshot показывает количество всех, автоматизированных и непокрытых утверждений по загруженным отчётам Jest и JUnit', async () => {
  const project = await createProject();
  try {
    await mkdir(join(project.root, 'test-results'));
    await writeFile(join(project.root, 'jest.json'), JSON.stringify({ startTime: 0, numTotalTests: 1, testResults: [{ name: 'spec.ts', status: 'passed', message: '', startTime: 0, endTime: 1, assertionResults: [{ title: 'Works', fullName: 'Feature one Group Works', ancestorTitles: ['Feature one', 'Group'], status: 'passed' }] }] }));
    await writeFile(join(project.root, 'test-results', 'junit.xml'), '<testsuites name="" tests="1"><testsuite name="" timestamp="2026-01-01T00:00:00.000Z" time="0"><testcase name="feature-one Feature one Group Works"/></testsuite></testsuites>');
    await writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, yml: { files: ['specs/**/*.spec.yml'] }, jest: { reportPath: 'jest.json', keys: ['featureTitle', 'groupTitle', 'assertionTitle'] }, JUnit: { reportPath: 'test-results/junit.xml', keys: ['featureCode', 'featureTitle', 'groupTitle', 'assertionTitle'] } }));
    assert.deepEqual((await new ProjectSnapshotService(project.root).refresh()).coverage, { total: 1, automated: 1, uncovered: 0 });
  } finally { await project.dispose(); }
});

specTest('serve-project-get', 'GET /api/project', 'Покрытие и зависимости', 'Покрытие загружается из плоского JUnit-отчёта Node.js', async () => {
  const project = await createProject();
  try {
    await mkdir(join(project.root, 'test-results'));
    await writeFile(join(project.root, 'test-results', 'junit.xml'), '<testsuites><testcase name="feature-one Feature one Group Works" time="0.01"/></testsuites>');
    assert.deepEqual((await new ProjectSnapshotService(project.root).refresh()).coverage, { total: 1, automated: 1, uncovered: 0 });
  } finally { await project.dispose(); }
});

specTest('serve-project-get', 'GET /api/project', 'Покрытие и зависимости', 'Признак автоматизации утверждения означает его сопоставление с тестом в текущем отчёте и не зависит от успешности запуска теста', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, 'jest.json'), JSON.stringify({ startTime: 0, numTotalTests: 1, testResults: [{ name: 'spec.ts', status: 'failed', message: '', startTime: 0, endTime: 1, assertionResults: [{ title: 'Works', fullName: 'Feature one Group Works', ancestorTitles: ['Feature one', 'Group'], status: 'failed' }] }] }));
    await writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, yml: { files: ['specs/**/*.spec.yml'] }, jest: { reportPath: 'jest.json', keys: ['featureTitle', 'groupTitle', 'assertionTitle'] } }));
    assert.equal((await new ProjectSnapshotService(project.root).refresh()).features[0].groups[0].assertions[0].isAutomated, true);
  } finally { await project.dispose(); }
});

specTest('serve-project-get', 'GET /api/project', 'Покрытие и зависимости', 'Граф зависимостей содержит вершины существующих фич и рёбра для ссылок между фичами', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, 'specs', 'references.spec.yml'), 'code: references\nfeature: References\ndescription: $feature-one\n');
    const snapshot = await new ProjectSnapshotService(project.root).refresh();
    assert.deepEqual(snapshot.dependencyGraph.nodes.filter(({ exists }) => exists).map(({ code }) => code).sort(), ['feature-one', 'references']);
    assert.deepEqual(snapshot.dependencyGraph.edges, [{ from: 'references', to: 'feature-one', resolved: true }]);
  } finally { await project.dispose(); }
});

specTest('serve-project-get', 'GET /api/project', 'Покрытие и зависимости', 'Неразрешённая ссылка добавляется в граф как несуществующая вершина и неразрешённое ребро вместе с диагностикой', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, 'specs', 'references.spec.yml'), 'code: references\nfeature: References\ndescription: $missing\n');
    const snapshot = await new ProjectSnapshotService(project.root).refresh();
    assert.deepEqual(snapshot.dependencyGraph.nodes.find(({ code }) => code === 'missing'), { code: 'missing', exists: false });
    assert.ok(snapshot.dependencyGraph.edges.some((edge) => edge.from === 'references' && edge.to === 'missing' && !edge.resolved));
    assert.ok(snapshot.diagnostics.some(({ code }) => code === 'feature-missing-link'));
  } finally { await project.dispose(); }
});
