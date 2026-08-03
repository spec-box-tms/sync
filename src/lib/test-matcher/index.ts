import {
  AssertionContext,
  AssertionStatus,
  getAttributesContext,
  getKey,
  ProjectData,
} from '../domain';
import { Validator } from '../validators';
import { AssertionStatus as TestStatus, TestReport } from './models';

export const getFullName = (...parts: string[]) => parts.join(' ');

const status = (value: TestStatus): AssertionStatus =>
  value === 'failed' ? 'failed' : value === 'passed' ? 'automated' : 'skipped';

const priority: Record<AssertionStatus, number> = {
  'not-automated': 0,
  skipped: 1,
  automated: 2,
  failed: 3,
};

export const applyTestReport = (
  validationContext: Validator,
  { features, attributes }: ProjectData,
  report: TestReport,
  keyParts: string[]
) => {
  const names = new Map<string, { paths: string[]; status: AssertionStatus }>();

  for (let { name, filePath, status: testStatus } of report.testResults) {
    const result = names.get(name) || { paths: [], status: 'not-automated' as const };
    result.paths.push(filePath || '');
    const next = status(testStatus);
    if (priority[next] > priority[result.status]) result.status = next;
    names.set(name, result);
  }

  const searchNames = [...names.keys()];

  const attributesCtx = getAttributesContext(attributes);

  // заполняем статус assert
  for (let {
    title: featureTitle,
    code: featureCode,
    groups,
    fileName,
    filePath,
    attributes = {},
  } of features) {
    for (let { title: groupTitle, assertions } of groups || []) {
      for (let assertion of assertions || []) {
        if (assertion.type !== 'assert') {
          continue;
        }
        // TODO: перенести в domain?
        const assertionCtx: AssertionContext = {
          featureTitle,
          featureCode,
          groupTitle,
          assertionTitle: assertion.title,
          attributes,
          fileName,
          filePath,
        };

        const parts = getKey(keyParts, assertionCtx, attributesCtx);
        const fullName = getFullName(...parts);

        const matchedName = names.has(fullName)
          ? fullName
          : searchNames.find((name) => names.has(name) && name.endsWith(fullName));
        if (matchedName) {
          const result = names.get(matchedName);
          if (result && priority[result.status] > priority[assertion.status]) {
            assertion.status = result.status;
          }
          names.delete(matchedName);
        }
      }
    }
  }
  Array.from(names.keys()).forEach((name) => {
    const result = names.get(name);
    result?.paths.forEach((path) =>
      validationContext.registerJestUnusedTests(name, path)
    );
  });
};
