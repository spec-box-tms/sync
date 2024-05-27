import { CommandModule } from 'yargs';

import { loadConfig, loadProject } from '../lib/config';
import { applyTestReport } from '../lib/test-matcher';
import { loadJestReport } from '../lib/test-matcher/jest';
import { loadJUnitReport } from '../lib/test-matcher/junit';
import { CommonOptions } from '../lib/utils';

export const cmdValidateOnly: CommandModule<{}, CommonOptions> = {
  command: 'validate',
  handler: async (args) => {
    console.log('VALIDATION');

    const { yml, jest, JUnit, projectPath } = await loadConfig(args.config);

    const { projectData, validationContext } = await loadProject(
      yml.metaPath,
      yml.files,
      projectPath
    );

    if (jest) {
      const jestReport = await loadJestReport(jest.reportPath, projectPath);

      applyTestReport(validationContext, projectData, jestReport, jest.keys);
    }

    if (JUnit) {
      const junitReport = await loadJUnitReport(JUnit.reportPath, projectPath);

      applyTestReport(validationContext, projectData, junitReport, JUnit.keys);
    }

    validationContext.printReport();
  },
};
