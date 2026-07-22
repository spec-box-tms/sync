export type FeatureTree = { code: string; title: string; groupBy: string[]; root: FeatureTreeNode };
export type FeatureTreeNode = {
  attributeCode?: string;
  valueCode: string;
  valueTitle?: string;
  features: string[];
  children: FeatureTreeNode[];
};
