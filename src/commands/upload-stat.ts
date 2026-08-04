import { CommandModule } from 'yargs';

import { CommonOptions } from '../lib/utils';
import { loadConfig } from '../lib/config';
import { uploadTestStat } from '../lib/upload/upload-jest-stat';
import { loadJestReport } from '../lib/test-matcher/jest';
import { loadJUnitReport } from '../lib/test-matcher/junit';
import { testReportConfigs } from '../lib/config/models';

export const cmdUploadStat: CommandModule<{}, CommonOptions> = {
  command: 'upload-stat',
  describe: 'Запустить выгрузку статистики о выполнении тестов',
  handler: async (args) => {
    console.log('Upload Jest stat');
    const { config, prjversion: version } = args;

    const { api, jest, JUnit, projectPath } = await loadConfig(config);

    if (!testReportConfigs(jest).length && !testReportConfigs(JUnit).length) {
      console.log('Jest settings are not specified');
      process.exit(1);
    }

    for (const reportConfig of testReportConfigs(jest)) {
      const report = await loadJestReport(reportConfig.reportPath, projectPath);
      await uploadTestStat(report, api, version);
    }

    for (const reportConfig of testReportConfigs(JUnit)) {
      const report = await loadJUnitReport(reportConfig.reportPath, projectPath, reportConfig.property);
      await uploadTestStat(report, api, version);
    }
  },
};
