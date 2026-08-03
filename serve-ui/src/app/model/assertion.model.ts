type BaseStatement = {
  title: string;
  description?: string;
};

export type Assertion =
  | (BaseStatement & { type: 'assert'; isAutomated: boolean })
  | (BaseStatement & { type: 'propose'; isAutomated: false });
