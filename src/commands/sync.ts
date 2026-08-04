import { CommandModule } from 'yargs';

import { loadConfig, loadProject } from '../lib/config';
import { applyTestReport } from '../lib/test-matcher';
import { loadJestReport } from '../lib/test-matcher/jest';
import { loadJUnitReport } from '../lib/test-matcher/junit';
import { uploadEntities } from '../lib/upload/upload-entities';
import { CommonOptions } from '../lib/utils';
import { testReportConfigs } from '../lib/config/models';

export const cmdSync: CommandModule<{}, CommonOptions> = {
  command: 'sync',
  describe: 'Запустить выгрузку, опционально указав версию',
  handler: async (args) => {
    console.log('SYNC');
    const { config, prjversion: version } = args;
    const { yml, api, jest, JUnit, projectPath, validation = {} } = await loadConfig(config);

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
    if (validationContext.hasCriticalErrors) {
      throw Error('Выгрузка невозможна из-за наличия критических ошибок');
    }

    console.log(`Загрузка проекта ${api.project} версия ${version}`);
    await uploadEntities(projectData, api, version);
    console.log(`Загрузка завершена успешно`);
  },
};
