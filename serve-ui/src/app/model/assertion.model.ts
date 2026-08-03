type BaseStatement = {
  title: string;
  description?: string;
};

export type Assertion =
  | (BaseStatement & { type: 'assert'; status: 'automated' | 'skipped' | 'failed' | 'not-automated' })
  | (BaseStatement & { type: 'propose' });
