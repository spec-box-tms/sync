import { CommandModule } from 'yargs';

import { loadConfig, loadProject } from '../lib/config';
import { applyTestReport } from '../lib/test-matcher';
import { loadJestReport } from '../lib/test-matcher/jest';
import { loadJUnitReport } from '../lib/test-matcher/junit';
import { uploadEntities } from '../lib/upload/upload-entities';
import { CommonOptions } from '../lib/utils';

export const cmdSync: CommandModule<{}, CommonOptions> = {
  command: 'sync',
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

    if (jest) {
      const jestReport = await loadJestReport(jest.reportPath, projectPath);

      applyTestReport(validationContext, projectData, jestReport, jest.keys);
    }

    if (JUnit) {
      const junitReport = await loadJUnitReport(JUnit.reportPath, projectPath);

      applyTestReport(validationContext, projectData, junitReport, JUnit.keys);
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
