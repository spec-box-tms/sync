type StatementCounters = { failed: number; skipped: number; notAutomated: number; automated: number; propose: number };
export type FeatureTree = {
  code: string;
  title: string;
  groupBy: string[];
  totalCount: number;
  automatedCount: number;
  root: FeatureTreeNode;
  counters: StatementCounters;
};
export type FeatureTreeNode = {
  attributeCode?: string;
  valueCode: string;
  valueTitle?: string;
  totalCount: number;
  automatedCount: number;
  features: string[];
  gitStatus?: 'modified' | 'untracked';
  children: FeatureTreeNode[];
  counters: StatementCounters;
};
