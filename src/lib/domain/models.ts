interface StatementBase {
  title: string;
  description?: string;
}

export interface Assertion extends StatementBase {
  type: 'assert';
  isAutomated: boolean;
}

export interface Proposal extends StatementBase {
  type: 'proposal';
  isAutomated: false;
}

export type Statement = Assertion | Proposal;

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
