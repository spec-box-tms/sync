import { FeatureGroup } from './feature-group.model';

export type Feature = {
  code: string;
  title: string;
  description: string;
  groups: FeatureGroup[];
  attributes: Record<string, string[]>;
  fileName: string;
  filePath: string;
  gitStatus: 'clean' | 'modified' | 'untracked';
};
