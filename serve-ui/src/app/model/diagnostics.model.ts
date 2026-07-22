export type Severity = 'info' | 'warning' | 'error';

export type Diagnostics = {
  code: string;
  severity: Severity;
  path: string;
  message: string;
};
