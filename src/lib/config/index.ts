import { glob } from 'fast-glob';
import {
  readTextFile,
  parseObject,
  CWD,
  readYaml,
  readYamlIfExists,
} from '../utils';
import { Validator, printError } from '../validators';
import { getLoaderError } from '../validators/validator';
import { Meta, RootConfig, ValidationConfig, configDecoder, metaDecoder } from './models';
import { loadYaml, YamlFile } from '../yaml';
import { processYamlFiles } from '../domain';

export type { YmlConfig, Attribute, AttributeValue, Tree } from './models';

export const DEFAULT_CONFIG_PATH = '.tms.json';
export const DEFAULT_META_PATH = '.spec-box-meta.yml';

export const loadConfig = async (
  path = DEFAULT_CONFIG_PATH
): Promise<RootConfig> => {
  const json = await readTextFile(path);
  const data = JSON.parse(json);

  const config = parseObject(data, configDecoder);

  return config;
};

export const loadMeta = async (
  validationContext: Validator,
  path?: string,
  basePath: string = CWD // TODO: перенести в resolvePath
): Promise<{ filePath: string; meta: Meta }> => {
  const filePath = path || DEFAULT_META_PATH;
  let fileReader = path
    ? readYaml(metaDecoder, filePath, basePath)
    : readYamlIfExists(metaDecoder, filePath, basePath);

  try {
    const content = await fileReader;
    const meta = content || {};

    return { filePath, meta };
  } catch (error) {
    printError(getLoaderError(error, filePath, 'config'), validationContext.severity);
    throw Error('Ошибка загрузки файла конфигурации');
  }
};

export const loadProject = async (
  metaPath: string | undefined,
  filePaths: string[],
  projectPath: string | undefined,
  validation: ValidationConfig
) => {
  const validationContext = new Validator(validation);

  const meta = await loadMeta(validationContext, metaPath, projectPath);
  const files = await glob(filePaths, { cwd: projectPath });

  const yamls = await Promise.all(
    files.map((path) => loadYaml(validationContext, path, projectPath))
  );
  const successYamls = new Array<YamlFile>();
  yamls.forEach((yaml) => yaml && successYamls.push(yaml));

  const projectData = processYamlFiles(successYamls, meta);
  validationContext.validate(projectData);
  return { projectData, validationContext };
};
