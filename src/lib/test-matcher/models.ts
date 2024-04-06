export type AssertionStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'todo';

export interface AssertionResult {
  name: string;
  filePath?: string;
  status: AssertionStatus;
}

export interface TestReport {
  total: number;
  startTime: number;
  duration: number;
  testResults: AssertionResult[];
}
