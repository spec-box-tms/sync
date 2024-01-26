import { CommandModule } from 'yargs';
import glob from 'fast-glob';

import { CommonOptions } from '../lib/utils';
import { loadConfig, loadMeta } from '../lib/config';
import { YamlFile, loadYaml } from '../lib/yaml';
import { uploadEntities } from '../lib/upload/upload-entities';
import { applyJestReport, loadJestReport } from '../lib/jest';
import { processYamlFiles } from '../lib/domain';
import { Validator } from '../lib/validators';

export const cmdSync: CommandModule<{}, CommonOptions> = {
  command: 'sync',
  handler: async (args) => {
    console.log('SYNC');
    const { config, prjversion: version } = args;
    const validationContext = new Validator();
    const { yml, api, jest, projectPath } = await loadConfig(config);

    const meta = await loadMeta(validationContext, yml.metaPath, projectPath);
    const files = await glob(yml.files, { cwd: projectPath });

    const yamls = await Promise.all(
      files.map((path) => loadYaml(validationContext, path, projectPath))
    );
    const successYamls = new Array<YamlFile>();
    yamls.forEach((yaml) => yaml && successYamls.push(yaml));

    const projectData = processYamlFiles(successYamls, meta);
    validationContext.validate(projectData);

    if (jest) {
      const jestReport = await loadJestReport(jest.reportPath, projectPath);

      applyJestReport(validationContext, projectData, jestReport, jest.keys);
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
