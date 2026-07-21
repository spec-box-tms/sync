import { resolve } from 'node:path';

import { glob } from 'fast-glob';

import { loadConfig, loadMeta } from '../config';
import { RootConfig } from '../config/models';
import { processYamlFiles } from '../domain';
import { Feature, ProjectData } from '../domain/models';
import { applyTestReport } from '../test-matcher';
import { loadJestReport } from '../test-matcher/jest';
import { loadJUnitReport } from '../test-matcher/junit';
import { getLoaderError, LINK_LIKE, Validator } from '../validators/validator';
import { ValidationError } from '../validators/models';
import { loadYaml, YamlFile } from '../yaml';

import { Diagnostic, FeatureTreeNode, ProjectSnapshot } from './models';

const emptySnapshot = (revision: number, diagnostics: Diagnostic[]): ProjectSnapshot => ({
  revision,
  diagnostics,
  attributes: [],
  treeDefinitions: [],
  features: [],
  coverage: { total: 0, automated: 0, uncovered: 0 },
  storageAreas: [],
  trees: [],
  dependencyGraph: { nodes: [], edges: [] },
});

const invalidConfigSnapshot = (revision: number, diagnostics: Diagnostic[]): ProjectSnapshot => ({
  revision,
  diagnostics,
} as ProjectSnapshot);

const toDiagnostic = (error: ValidationError, validator: Validator): Diagnostic => ({
  code: error.type,
  severity: validator.severity[error.type] === 'warning' ? 'warning' : validator.severity[error.type] === 'info' ? 'info' : 'error',
  path: error.filePath,
  message: 'description' in error ? error.description : error.type,
});

const treeNode = (features: Feature[], groupBy: string[], depth = 0): FeatureTreeNode => {
  if (depth === groupBy.length) {
    return { features: features.map(({ code }) => code), children: [] };
  }
  const attributeCode = groupBy[depth];
  const values = new Map<string, Feature[]>();
  for (const feature of features) {
    for (const value of feature.attributes?.[attributeCode] || ['UNDEFINED']) {
      values.set(value, [...(values.get(value) || []), feature]);
    }
  }
  return {
    features: [],
    children: [...values.entries()].map(([valueCode, group]) => ({
      attributeCode,
      valueCode,
      valueTitle: valueCode === 'UNDEFINED' ? 'Не задано' : valueCode,
      ...treeNode(group, groupBy, depth + 1),
    })),
  };
};

const graph = (features: Feature[]) => {
  const known = new Map(features.map((feature) => [feature.code, feature]));
  const nodes = new Map<string, { code: string; title?: string; exists: boolean }>(
    [...known.entries()].map(([code, feature]) => [code, { code, title: feature.title, exists: true }]),
  );
  const edges: Array<{ from: string; to: string; resolved: boolean }> = [];
  for (const feature of features) {
    const text = [
      feature.title,
      feature.description,
      ...feature.groups.flatMap((group) => [
        group.title,
        ...group.assertions.flatMap((assertion) => [assertion.title, assertion.description]),
      ]),
    ].filter(Boolean).join('\n');
    const re = new RegExp(LINK_LIKE);
    for (let match = re.exec(text); match; match = re.exec(text)) {
      const to = match.groups!.link;
      const resolved = known.has(to);
      if (!nodes.has(to)) nodes.set(to, { code: to, exists: false });
      edges.push({ from: feature.code, to, resolved });
    }
  }
  return { nodes: [...nodes.values()], edges };
};

export class ProjectSnapshotService {
  public snapshot: ProjectSnapshot = emptySnapshot(0, []);
  public config?: RootConfig;
  private readonly listeners = new Set<(snapshot: ProjectSnapshot) => void>();

  constructor(public readonly projectRoot: string, public readonly configPath = '.tms.json') {}

  subscribe(listener: (snapshot: ProjectSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<ProjectSnapshot> {
    const revision = this.snapshot.revision + 1;
    let config: RootConfig;
    try {
      config = await loadConfig(resolve(this.projectRoot, this.configPath));
    } catch (error) {
      const validator = new Validator({});
      validator.registerLoaderError(error, this.configPath, 'config');
      this.snapshot = invalidConfigSnapshot(revision, validator.errors.map((item) => toDiagnostic(item, validator)));
      this.publish();
      return this.snapshot;
    }
    this.config = config;
    const root = config.projectPath ? resolve(this.projectRoot, config.projectPath) : this.projectRoot;
    const validator = new Validator(config.validation || {});
    let meta = { filePath: config.yml.metaPath || '.spec-box-meta.yml', meta: {} };
    try {
      meta = await loadMeta(validator, config.yml.metaPath, root, true);
    } catch {
      // loadMeta has registered the diagnostic; YAML files can still be read.
    }
    const files = await glob(config.yml.files, { cwd: root });
    const yamls = await Promise.all(files.map((path) => loadYaml(validator, path, root)));
    const loaded = yamls.filter((yaml): yaml is YamlFile => Boolean(yaml));
    const projectData = processYamlFiles(loaded, meta);
    validator.validate(projectData);
    await this.applyReports(config, root, projectData, validator);

    const automated = projectData.features.flatMap((feature) => feature.groups).flatMap((group) => group.assertions).filter((assertion) => assertion.isAutomated).length;
    const total = projectData.features.flatMap((feature) => feature.groups).reduce((count, group) => count + group.assertions.length, 0);
    this.snapshot = {
      revision,
      project: projectData.project,
      attributes: projectData.attributes || [],
      treeDefinitions: (projectData.trees || []).map(({ code, title, attributes: groupBy }) => ({ code, title, groupBy })),
      features: projectData.features,
      diagnostics: validator.errors.map((item) => toDiagnostic(item, validator)),
      coverage: { total, automated, uncovered: total - automated },
      storageAreas: config.yml.files.filter((pattern) => !pattern.startsWith('!')).map((pattern) => ({ pattern, rootPath: root, directories: [] })),
      trees: (projectData.trees || []).map(({ code, title, attributes: groupBy }) => ({ code, title, groupBy, root: treeNode(projectData.features, groupBy) })),
      dependencyGraph: graph(projectData.features),
    };
    this.publish();
    return this.snapshot;
  }

  private publish() {
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  private async applyReports(config: RootConfig, root: string, data: ProjectData, validator: Validator) {
    const reports = [
      config.jest && [config.jest, loadJestReport] as const,
      config.JUnit && [config.JUnit, loadJUnitReport] as const,
    ].filter(Boolean) as Array<readonly [NonNullable<RootConfig['jest']>, typeof loadJestReport | typeof loadJUnitReport]>;
    for (const [reportConfig, load] of reports) {
      try {
        const report = load === loadJUnitReport
          ? await load(reportConfig.reportPath, root, reportConfig.property)
          : await load(reportConfig.reportPath, root);
        applyTestReport(validator, data, report, reportConfig.keys);
      } catch (error) {
        validator.registerLoaderError(error, reportConfig.reportPath, 'feature');
      }
    }
  }
}
