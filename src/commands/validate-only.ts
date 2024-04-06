import { CommandModule } from 'yargs';

import { loadConfig, loadMeta } from '../lib/config';
import { CommonOptions } from '../lib/utils';
import { Validator } from '../lib/validators';
import { glob } from 'fast-glob';
import { YamlFile, loadYaml } from '../lib/yaml';
import { processYamlFiles } from '../lib/domain';
import { loadJestReport } from '../lib/test-matcher/jest';
import { applyTestReport } from '../lib/test-matcher';
import { loadJUnitReport } from '../lib/test-matcher/junit';

export const cmdValidateOnly: CommandModule<{}, CommonOptions> = {
  command: 'validate',
  handler: async (args) => {
    console.log('VALIDATION');

    const { yml, jest, JUnit, projectPath } = await loadConfig(args.config);
    const validationContext = new Validator();
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

      applyTestReport(validationContext, projectData, jestReport, jest.keys);
    }

    if (JUnit) {
      const junitReport = await loadJUnitReport(JUnit.reportPath, projectPath);

      applyTestReport(validationContext, projectData, junitReport, JUnit.keys);
    }

    validationContext.printReport();
  },
};
