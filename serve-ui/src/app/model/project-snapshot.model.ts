import { Diagnostics } from './diagnostics.model';
import { DirectoryNode } from './directory-node.model';
import { FeatureTree } from './feature-tree.model';
import { Feature } from './feature.model';

export type ProjectSnapshot = {
  revision: number;
  project?: { title?: string; description?: string; repository?: string };
  attributes: Array<{
    code: string;
    title: string;
    values: Array<{ code: string; title: string }>;
  }>;
  treeDefinitions: Array<{ code: string; title: string; groupBy: string[] }>;
  features: Feature[];
  diagnostics: Diagnostics[];
  coverage: { total: number; automated: number; uncovered: number };
  storageAreas: Array<{ pattern: string; rootPath: string; directories: DirectoryNode[] }>;
  trees: FeatureTree[];
  dependencyGraph: {
    nodes: Array<{ code: string; title?: string; exists: boolean }>;
    edges: Array<{ from: string; to: string; resolved: boolean }>;
  };
};
