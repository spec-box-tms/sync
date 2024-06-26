import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { cmdSync } from './commands/sync';
import { cmdUploadStat } from './commands/upload-stat';
import { cmdValidateOnly } from './commands/validate-only';
import { cmdMarkdown } from './commands/markdown';

yargs(hideBin(process.argv))
  .command(cmdSync)
  .command(cmdUploadStat)
  .command(cmdValidateOnly)
  .command(cmdMarkdown)
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'config path',
  })
  .options('prjversion', {
    alias: 'v',
    type: 'string',
    description: 'project version',
  })
  .parse();
