import {
  AssertionContext,
  getAttributesContext,
  getKey,
  ProjectData,
} from '../domain';
import { Validator } from '../validators';
import { AssertionStatus, TestReport } from './models';

export const getFullName = (...parts: string[]) => parts.join(' ');

export const ignoredStatuses = new Set<AssertionStatus>([
  'pending',
  'todo',
  'skipped',
]);

export const applyTestReport = (
  validationContext: Validator,
  { features, attributes }: ProjectData,
  report: TestReport,
  keyParts: string[]
) => {
  const names = new Map<string, string[]>();

  for (let { name, filePath } of report.testResults) {
    const paths = names.get(name) || [];
    paths.push(filePath || '');
    names.set(name, paths);
  }

  const attributesCtx = getAttributesContext(attributes);

  // заполняем поле isAutomated
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

        assertion.isAutomated = names.has(fullName);
        names.delete(fullName);
      }
    }
  }
  Array.from(names.keys()).forEach((name) => {
    const paths = names.get(name);
    paths?.forEach((path) =>
      validationContext.registerJestUnusedTests(name, path)
    );
  });
};
