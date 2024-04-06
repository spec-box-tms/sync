import { CommandModule } from 'yargs';

import { CommonOptions } from '../lib/utils';
import { loadConfig } from '../lib/config';
import { uploadTestStat } from '../lib/upload/upload-jest-stat';
import { loadJestReport } from '../lib/test-matcher/jest';
import { loadJUnitReport } from '../lib/test-matcher/junit';

export const cmdUploadStat: CommandModule<{}, CommonOptions> = {
  command: 'upload-stat',
  handler: async (args) => {
    console.log('Upload Jest stat');
    const { config, prjversion: version } = args;

    const { api, jest, JUnit, projectPath } = await loadConfig(config);

    if (!jest && !JUnit) {
      console.log('Jest settings are not specified');
      process.exit(1);
    }

    if (jest) {
      const jestReport = await loadJestReport(jest.reportPath, projectPath);

      await uploadTestStat(jestReport, api, version);
    }

    if (JUnit) {
      const junitReport = await loadJUnitReport(JUnit.reportPath, projectPath);

      await uploadTestStat(junitReport, api, version);
    }
  },
};
