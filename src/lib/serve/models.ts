export type Severity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  code: string;
  severity: Severity;
  path: string;
  message: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
}

export interface FeatureTreeNode {
  attributeCode?: string;
  valueCode?: string;
  valueTitle?: string;
  features: string[];
  children: FeatureTreeNode[];
}

export interface ProjectSnapshot {
  revision: number;
  project?: { title?: string; description?: string; repository?: string };
  attributes: Array<{ code: string; title: string; values: Array<{ code: string; title: string }> }>;
  treeDefinitions: Array<{ code: string; title: string; groupBy: string[] }>;
  features: import('../domain').Feature[];
  diagnostics: Diagnostic[];
  coverage: { total: number; automated: number; uncovered: number };
  storageAreas: Array<{ pattern: string; rootPath: string; directories: DirectoryNode[] }>;
  trees: Array<{ code: string; title: string; groupBy: string[]; root: FeatureTreeNode }>;
  dependencyGraph: {
    nodes: Array<{ code: string; title?: string; exists: boolean }>;
    edges: Array<{ from: string; to: string; resolved: boolean }>;
  };
}

export interface ProjectSnapshotService {
  snapshot: ProjectSnapshot;
}

export interface FeatureAssertionResponse {
  title: string;
  description?: string;
  isAutomated: boolean;
}

export interface FeatureResponse {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: Array<{ title: string; assertions: FeatureAssertionResponse[] }>;
  filePath: string;
  optimisticLock: string;
}

export interface CreateFeatureRequest {
  filePath: string;
  code: string;
  title: string;
}

export interface UpdateFeatureRequest {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: Array<{ title: string; assertions: Array<{ title: string; description?: string; isAutomated?: boolean }> }>;
  optimisticLock: string;
  filePath?: string;
}

export interface ErrorResponse {
  errors: Array<{ code: string; message: string; path: string }>;
}

const writableAssertionDecoder = d.intersect(
  d.struct({ title: d.string }),
)(d.partial({ description: d.string, isAutomated: d.boolean }));

const writableGroupDecoder = d.struct({
  title: d.string,
  assertions: d.array(writableAssertionDecoder),
});

export const createFeatureRequestDecoder = d.struct({
  filePath: d.string,
  code: d.string,
  title: d.string,
});

export const updateFeatureRequestDecoder = d.intersect(
  d.struct({
    code: d.string,
    title: d.string,
    attributes: d.record(d.array(d.string)),
    groups: d.array(writableGroupDecoder),
    optimisticLock: d.string,
  }),
)(d.partial({ description: d.string, filePath: d.string }));
import * as d from 'io-ts/Decoder';
