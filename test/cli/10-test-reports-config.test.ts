import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

import { cmdSync } from '../../src/commands/sync';
import { loadConfig } from '../../src/lib/config';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from '../serve/fixtures';
import { skipTest, specTest } from '../serve/spec-name';

const localRequire = createRequire(__filename);
const report = (name: string) => JSON.stringify({
  startTime: 0,
  numTotalTests: 1,
  testResults: [{
    name: 'report.test.ts', status: 'passed', message: '', startTime: 0, endTime: 1,
    assertionResults: [{ title: name, fullName: `Feature one Group ${name}`, ancestorTitles: ['Feature one', 'Group'], status: 'passed' }],
  }],
});

const config = (reports: Record<string, unknown>) => JSON.stringify({
  api: { host: 'https://example.invalid', project: 'test' },
  yml: { files: ['specs/**/*.spec.yml'] },
  ...reports,
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Текущая нотация', 'Корневые опциональные поля jest и JUnit задают по одному отчёту соответствующего формата', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, '.tms.json'), config({ jest: { reportPath: 'jest.json', keys: ['featureTitle'] } }));
    const loaded = await loadConfig(join(project.root, '.tms.json'));
    assert.deepEqual(loaded.jest, { reportPath: 'jest.json', keys: ['featureTitle'] });
    assert.equal(loaded.JUnit, undefined);
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Текущая нотация', 'Одиночная настройка отчёта содержит строковый reportPath и массив keys', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, '.tms.json'), config({ JUnit: { reportPath: 'test-results/junit.xml', keys: ['featureCode', 'assertionTitle'] } }));
    const loaded = await loadConfig(join(project.root, '.tms.json'));
    assert.deepEqual(loaded.JUnit, { reportPath: 'test-results/junit.xml', keys: ['featureCode', 'assertionTitle'] });
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Текущая нотация', 'Одиночная настройка JUnit может дополнительно содержать строковое поле property', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, '.tms.json'), config({ JUnit: { reportPath: 'junit.xml', keys: ['featureTitle'], property: 'testName' } }));
    const report = (await loadConfig(join(project.root, '.tms.json'))).JUnit;
    if (!report || Array.isArray(report)) throw new Error('Expected a single JUnit report');
    assert.equal(report.property, 'testName');
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Текущая нотация', 'В одной конфигурации могут одновременно присутствовать одиночные настройки jest и JUnit', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, '.tms.json'), config({ jest: { reportPath: 'jest.json', keys: ['featureTitle'] }, JUnit: { reportPath: 'junit.xml', keys: ['featureCode'] } }));
    const loaded = await loadConfig(join(project.root, '.tms.json'));
    assert.equal(Array.isArray(loaded.jest), false);
    assert.equal(Array.isArray(loaded.JUnit), false);
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Несколько отчётов', 'Поля jest и JUnit принимают либо существующий одиночный объект настройки отчёта, либо массив из одного или нескольких таких объектов', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, '.tms.json'), config({ jest: [{ reportPath: 'jest.json', keys: ['featureTitle'] }] }));
    assert.ok(Array.isArray((await loadConfig(join(project.root, '.tms.json'))).jest));
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Несколько отчётов', 'Одиночная нотация jest и JUnit остаётся корректной без миграции в массив', async () => {
  const project = await createProject();
  try {
    const loaded = await loadConfig(join(project.root, '.tms.json'));
    assert.equal(Array.isArray(loaded.JUnit), false);
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Несколько отчётов', 'Каждый элемент массива jest содержит reportPath и keys, а каждый элемент массива JUnit дополнительно может содержать property', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, '.tms.json'), config({ jest: [{ reportPath: 'jest.json', keys: ['featureTitle'] }], JUnit: [{ reportPath: 'junit.xml', keys: ['featureTitle'], property: 'testName' }] }));
    const loaded = await loadConfig(join(project.root, '.tms.json'));
    const reports = loaded.JUnit as unknown;
    assert.ok(Array.isArray(reports));
    assert.equal(reports[0].property, 'testName');
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Несколько отчётов', 'В одной .tms.json можно одновременно указывать несколько отчётов Jest и несколько отчётов JUnit', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, 'specs', 'feature.spec.yml'), 'code: feature-one\nfeature: Feature one\nspecs-unit:\n  Group:\n    - assert: Jest one\n    - assert: Jest two\n    - assert: JUnit one\n    - assert: JUnit two\n');
    await mkdir(join(project.root, 'test-results'));
    await writeFile(join(project.root, 'jest-one.json'), report('Jest one'));
    await writeFile(join(project.root, 'jest-two.json'), report('Jest two'));
    await writeFile(join(project.root, 'test-results', 'junit-one.xml'), '<testsuites><testcase name="feature-one Feature one Group JUnit one"/></testsuites>');
    await writeFile(join(project.root, 'test-results', 'junit-two.xml'), '<testsuites><testcase name="feature-one Feature one Group JUnit two"/></testsuites>');
    await writeFile(join(project.root, '.tms.json'), config({ jest: [{ reportPath: 'jest-one.json', keys: ['featureTitle', 'groupTitle', 'assertionTitle'] }, { reportPath: 'jest-two.json', keys: ['featureTitle', 'groupTitle', 'assertionTitle'] }], JUnit: [{ reportPath: 'test-results/junit-one.xml', keys: ['featureCode', 'featureTitle', 'groupTitle', 'assertionTitle'] }, { reportPath: 'test-results/junit-two.xml', keys: ['featureCode', 'featureTitle', 'groupTitle', 'assertionTitle'] }] }));
    assert.deepEqual((await new ProjectSnapshotService(project.root).refresh()).coverage, { total: 4, automated: 4, uncovered: 0, counters: { failed: 0, skipped: 0, notAutomated: 0, automated: 4, propose: 0 } });
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Несколько отчётов', 'CLI собирает и применяет все отчёты, заданные в одиночной настройке или массивах jest и JUnit', async () => {
  const project = await createProject();
  try {
    await writeFile(join(project.root, 'specs', 'feature.spec.yml'), 'code: feature-one\nfeature: Feature one\nspecs-unit:\n  Group:\n    - assert: Jest\n    - assert: JUnit\n');
    await mkdir(join(project.root, 'test-results'));
    await writeFile(join(project.root, 'jest.json'), report('Jest'));
    await writeFile(join(project.root, 'test-results', 'junit.xml'), '<testsuites><testcase name="feature-one Feature one Group JUnit"/></testsuites>');
    await writeFile(join(project.root, '.tms.json'), config({ jest: { reportPath: 'jest.json', keys: ['featureTitle', 'groupTitle', 'assertionTitle'] }, JUnit: [{ reportPath: 'test-results/junit.xml', keys: ['featureCode', 'featureTitle', 'groupTitle', 'assertionTitle'] }] }));
    assert.deepEqual((await new ProjectSnapshotService(project.root).refresh()).coverage, { total: 2, automated: 2, uncovered: 0, counters: { failed: 0, skipped: 0, notAutomated: 0, automated: 2, propose: 0 } });
  } finally { await project.dispose(); }
});

test('cli-test-reports-config Конфигурация отчётов тестов CLI Несколько отчётов Отсутствие файла, указанного в reportPath, не блокирует выгрузку проекта и работу serve', async () => {
  const project = await createProject();
  const upload = localRequire('../../src/lib/upload/upload-entities') as {
    uploadEntities: () => Promise<void>;
  };
  const originalUpload = upload.uploadEntities;
  upload.uploadEntities = async () => undefined;
  try {
    await writeFile(join(project.root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, projectPath: project.root, yml: { files: ['specs/**/*.spec.yml'] }, JUnit: { reportPath: 'missing.xml', keys: ['featureTitle'] } }));
    await assert.doesNotReject((cmdSync.handler as (args: { config: string }) => Promise<void>)({ config: join(project.root, '.tms.json') }));
    assert.equal((await new ProjectSnapshotService(project.root).refresh()).features.length, 1);
  } finally { upload.uploadEntities = originalUpload; await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Несколько отчётов', 'При отсутствии файла отчёта из reportPath serve возвращает диагностику с severity warning', async () => {
  const project = await createProject();
  try {
    const snapshot = await new ProjectSnapshotService(project.root).refresh();
    assert.equal(snapshot.diagnostics.find(({ path }) => path === 'test-results/junit.xml')?.severity, 'warning');
  } finally { await project.dispose(); }
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Проверки отчётов', 'Этот тест должен быть пройден', async () => {
  assert(true);
});

specTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Проверки отчётов', 'Этот тест должен быть провален', async () => {
  assert(false);
});

skipTest('cli-test-reports-config', 'Конфигурация отчётов тестов CLI', 'Проверки отчётов', 'Этот тест должен быть пропущен', async () => {
  assert(false);
});
