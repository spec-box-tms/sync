import { parseStringPromise } from 'xml2js';
import { parseObject, readTextFile } from '../../utils';
import { AssertionResult, TestReport } from '../models';
import { JUnitReport, junitReportDecoder, JUnitTestCaseProperty, JUnitTestSuite } from './models';

const getPropertyValue = (properties?: JUnitTestCaseProperty[], property?: string): string | undefined => {
  if(!properties || !property) {
    return undefined;
  }

  return properties.find(p => p.name === property)?.value;
}

const mapTestResults = (
  testResult: JUnitTestSuite[],
  suitesName = '',
  property?: string,
): AssertionResult[] => {
  const results = new Array<AssertionResult>();

  for (let { testcase: testCases, name: suiteName = '' } of testResult) {
    for (let { name: caseName, status, properties } of testCases) {
      let name = getPropertyValue(properties?.property, property);

      if (!name) {
        name = caseName;
        if (suiteName) {
          name = suiteName + ' ' + name;
        }
        if (suitesName) {
          name = suitesName + ' ' + name;
        }
      }

      results.push({
        name,
        filePath: 'unknown',
        status,
      });
    }
  }

  return results;
};

const mapTestReport = (
  junitReport: JUnitReport,
  property?: string,
): TestReport => {
  const { testsuites } = junitReport;
  const { tests: total, name } = testsuites;

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
    testResults: mapTestResults(testsuites.testsuite, name, property),
  };
};

export const loadJUnitReport = async (
  path: string,
  basePath?: string,
  property?: string,
): Promise<TestReport> => {
  const xml = await readTextFile(path, basePath);
  const data: unknown = await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: true,
  });
  const entity = parseObject(data, junitReportDecoder);
  return mapTestReport(entity, property);
};
