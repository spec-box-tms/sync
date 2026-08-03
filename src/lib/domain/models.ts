interface StatementBase {
  title: string;
  description?: string;
}

export type AssertionStatus = 'automated' | 'skipped' | 'failed' | 'not-automated';

export interface Assertion extends StatementBase {
  type: 'assert';
  status: AssertionStatus;
}

export interface Propose extends StatementBase {
  type: 'propose';
}

export type Statement = Assertion | Propose;

export interface AssertionGroup {
  title: string;
  assertions: Statement[];
}

export interface Feature {
  code: string;
  title: string;
  description?: string;

  groups: AssertionGroup[];
  attributes?: Record<string, string[]>;

  fileName: string;
  filePath: string;
}

export interface AttributeValue {
  code: string;
  title: string;
}

export interface Attribute {
  code: string;
  title: string;
  values: AttributeValue[];
}

export interface Tree {
  title: string;
  code: string;
  attributes: string[];
}

export interface ProjectInfo {
  title?: string;
  description?: string;
  repository?: string;
}

export interface ProjectData {
  features: Feature[];
  project: ProjectInfo;

  attributes?: Attribute[];
  trees?: Tree[];
  metaFilePath: string;
}
