export type FeatureTree = { code: string; title: string; groupBy: string[]; totalCount: number; automatedCount: number; root: FeatureTreeNode };
export type FeatureTreeNode = {
  attributeCode?: string;
  valueCode: string;
  valueTitle?: string;
  totalCount: number;
  automatedCount: number;
  features: string[];
  children: FeatureTreeNode[];
};
