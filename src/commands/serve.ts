import { CommandModule } from 'yargs';

import { startServer } from '../lib/serve/server';
import { ProjectSnapshotService } from '../lib/serve/snapshot';
import { CommonOptions } from '../lib/utils';

type ServeOptions = CommonOptions & { port: number };

export const cmdServe: CommandModule<{}, ServeOptions> = {
  command: 'serve',
  describe: 'Запустить локальный редактор спецификаций',
  builder: (yargs) => yargs.option('port', {
    type: 'number',
    default: 0,
    describe: 'TCP-порт локального сервера',
  }),
  handler: async ({ port, config }) => {
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new Error('--port должен быть целым числом от 0 до 65535');
    }
    const service = new ProjectSnapshotService(process.cwd(), config);
    await service.refresh();
    const server = await startServer({
      projectRoot: process.cwd(),
      port,
      service,
    });
    console.log(server.url);
  },
};
