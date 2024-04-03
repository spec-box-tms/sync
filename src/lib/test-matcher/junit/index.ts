import { parseStringPromise } from 'xml2js';
import { parseObject, readTextFile } from '../../utils';
import { AssertionResult, TestReport } from '../models';
import { JUnitReport, junitReportDecoder, JUnitTestSuite } from './models';

const mapTestResults = (testResult: JUnitTestSuite[]): AssertionResult[] => {
  const results = new Array<AssertionResult>();

  for (let { testcase: testCases } of testResult) {
    for (let { name, status } of testCases) {
      results.push({
        name,
        filePath: 'unknown',
        status,
      });
    }
  }

  return results;
};

const mapTestReport = (junitReport: JUnitReport): TestReport => {
  const { testsuites } = junitReport;
  const total = testsuites.tests;

  const startTime = testsuites.testsuite.reduce(
    (acc, item) => Math.min(acc, item.timestamp.getTime()),
    Number.MAX_VALUE
  );

  // Сумма затраченного времени на все тест сьюты
  const duration =
    testsuites.testsuite.reduce((sum, item) => sum + item.time, 0) * 1000;

  return {
    startTime,
    total,
    duration,
    testResults: mapTestResults(testsuites.testsuite),
  };
};

export const loadJUnitReport = async (
  path: string,
  basePath?: string
): Promise<TestReport> => {
  const xml = await readTextFile(path, basePath);
  const data: unknown = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
  });
  const entity = parseObject(data, junitReportDecoder);

  return mapTestReport(entity);
};
