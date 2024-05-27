import { CommandModule } from "yargs";

import { CommonOptions } from "../lib/utils";
import { loadConfig, loadProject } from "../lib/config";
import { exportMarkdown } from "../lib/markdown";

export const cmdMarkdown: CommandModule<{}, CommonOptions> = {
  command: 'markdown',
  handler: async (args) => {
    console.log('Export to Markdown');
    const { config } = args;
    const { yml, api, markdown, projectPath } = await loadConfig(config);

    const { projectData, validationContext } = await loadProject(
      yml.metaPath,
      yml.files,
      projectPath
    );
    
    
    validationContext.printReport();
    if (validationContext.hasCriticalErrors) {
      throw Error('Экспорт невозможен из-за наличия критических ошибок');
    }
    
    await exportMarkdown(projectData, markdown?.path || 'docs');
    
    console.log(`Экспорт проекта ${api.project} завершен успешно`);
  }
};
