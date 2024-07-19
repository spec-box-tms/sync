import { pipe } from 'fp-ts/lib/function';
import * as d from 'io-ts/Decoder';

const singleItemOrArray = <T>(decoder: d.Decoder<unknown, T>) =>
  pipe(
    d.union(decoder, d.array(decoder)),
    d.parse((value) => {
      if (Array.isArray(value)) {
        return d.success(value);
      }
      return d.success([value]);
    })
  );

export type JUnitStatuses = 'skipped' | 'failed' | 'passed';

const junitTestCaseStatusDecoder = d.partial({
  skipped: d.string,
  failed: d.string,
});

export type JUnitTestCaseStatus = d.TypeOf<typeof junitTestCaseStatusDecoder>;

const mapStatus = (testCase: JUnitTestCaseStatus): JUnitStatuses => {
  const { skipped, failed } = testCase;
  if (skipped !== undefined) {
    return 'skipped';
  }
  if (failed !== undefined) {
    return 'failed';
  }
  return 'passed';
};

const junitTestCaseDecoder = d.intersect(
  d.struct({
    name: d.string,
  })
)(
  pipe(
    junitTestCaseStatusDecoder,
    d.parse((s) => d.success({ status: mapStatus(s) }))
  )
);

const junitTestSuiteDecoder = d.struct({
  name: d.string,
  timestamp: pipe(
    d.string,
    d.parse((s) => d.success(new Date(s)))
  ),
  time: pipe(
    d.string,
    d.parse((v) => d.success(Number(v)))
  ),
  testcase: singleItemOrArray(junitTestCaseDecoder),
});

const junitTestSuitesDecoder = d.struct({
  name: d.string,
  tests: pipe(
    d.string,
    d.parse((v) => d.success(Number(v)))
  ),
  testsuite: singleItemOrArray(junitTestSuiteDecoder),
});

export const junitReportDecoder = d.struct({
  testsuites: junitTestSuitesDecoder,
});

export type JUnitReport = d.TypeOf<typeof junitReportDecoder>;
export type JUnitTestSuite = d.TypeOf<typeof junitTestSuiteDecoder>;
export type JUnitTestCase = d.TypeOf<typeof junitTestCaseDecoder>;
