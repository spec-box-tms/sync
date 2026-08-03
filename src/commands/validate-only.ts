import { CommandModule } from 'yargs';

import { loadConfig, loadProject } from '../lib/config';
import { applyTestReport } from '../lib/test-matcher';
import { loadJestReport } from '../lib/test-matcher/jest';
import { loadJUnitReport } from '../lib/test-matcher/junit';
import { CommonOptions } from '../lib/utils';
import { testReportConfigs } from '../lib/config/models';

export const cmdValidateOnly: CommandModule<{}, CommonOptions> = {
  command: 'validate',
  handler: async (args) => {
    console.log('VALIDATION');

    const { yml, jest, JUnit, projectPath, validation = {} } = await loadConfig(args.config);

    const { projectData, validationContext } = await loadProject(
      yml.metaPath,
      yml.files,
      projectPath,
      validation
    );

    for (const reportConfig of testReportConfigs(jest)) {
      try {
        const report = await loadJestReport(reportConfig.reportPath, projectPath);
        applyTestReport(validationContext, projectData, report, reportConfig.keys);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    for (const reportConfig of testReportConfigs(JUnit)) {
      try {
        const report = await loadJUnitReport(reportConfig.reportPath, projectPath, reportConfig.property);
        applyTestReport(validationContext, projectData, report, reportConfig.keys);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }

    validationContext.printReport();
  },
};
