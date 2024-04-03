import { AssertionResult, TestReport } from '../models';
import { parseObject, readTextFile } from '../../utils';
import { JestReport, jestReportDecoder, JestTestResult } from './models';

const getFullName = (...parts: string[]) => parts.join(' ');

const mapTestResults = (testResult: JestTestResult[]): AssertionResult[] => {
  const results = new Array<AssertionResult>();
  // формируем список ключей тест-кейсов из отчета jest
  for (let { assertionResults, name: filePath } of testResult) {
    for (let { title, ancestorTitles, status } of assertionResults) {
      const name = getFullName(...ancestorTitles, title);
      results.push({
        name,
        filePath,
        status,
      });
    }
  }
  return results;
};

const mapTestReport = (jestReport: JestReport): TestReport => {
  const { startTime, numTotalTests: total } = jestReport;

  // Сумма затраченного времени на все тест сьюты
  const duration = jestReport.testResults.reduce(
    (sum, item) => sum + item.endTime - item.startTime,
    0
  );

  return {
    startTime,
    total,
    duration,
    testResults: mapTestResults(jestReport.testResults),
  };
};

export const loadJestReport = async (
  path: string,
  basePath?: string
): Promise<TestReport> => {
  const json = await readTextFile(path, basePath);
  const data: unknown = JSON.parse(json);

  const entity = parseObject(data, jestReportDecoder);

  return mapTestReport(entity);
};
