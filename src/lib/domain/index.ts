import {
  Attribute as CfgAttribute,
  AttributeValue as CfgAttributeValue,
  Tree as CfgTree,
} from '../config';
import { Meta } from '../config/models';
import { YamlFile, Statement as YmlStatement } from '../yaml';
import {
  Assertion,
  AssertionGroup,
  Attribute,
  AttributeValue,
  Feature,
  ProjectData,
  Propose,
  Statement,
  Tree,
} from './models';

export { getAttributesContext, getKey } from './keys';
export type { AssertionContext, AttributesContext } from './keys';
export type {
  Assertion,
  AssertionGroup,
  Attribute,
  AttributeValue,
  Feature,
  ProjectData,
  Propose,
  Statement,
  Tree,
} from './models';

const mapStatement = (statement: YmlStatement): Statement =>
  'assert' in statement
    ? {
        type: 'assert',
        title: statement.assert,
        description: statement.description,
        isAutomated: false,
      }
    : {
        type: 'propose',
        title: statement.propose,
        description: statement.description,
        isAutomated: false,
      };

const mapGroup = ([title, list]: [string, YmlStatement[]]): AssertionGroup => {
  const assertions = list.map(mapStatement);

  return { title, assertions };
};

const mapFeature = ({ content, fileName, filePath }: YamlFile): Feature => {
  const {
    code,
    feature: title,
    description,
    definitions: attributes,
    'specs-unit': specs = {},
  } = content;

  const groups = Object.entries(specs).map(mapGroup);

  return { code, title, description, groups, attributes, fileName, filePath };
};

const mapAttributeValue = ({
  code,
  title,
}: CfgAttributeValue): AttributeValue => ({ code, title });

const mapAttribute = ({ code, title, values }: CfgAttribute): Attribute => {
  return {
    title,
    code,
    values: values.map(mapAttributeValue),
  };
};

const mapTree = ({ code, title, 'group-by': attributes }: CfgTree): Tree => {
  return {
    title,
    code,
    attributes,
  };
};

export const processYamlFiles = (
  files: YamlFile[],
  config: { filePath: string; meta: Meta }
): ProjectData => {
  const { title, description, repository } = config.meta;

  const project = { title, description, repository };
  const features = files.map(mapFeature);
  const attributes = config.meta.attributes?.map(mapAttribute);
  const trees = config.meta.trees?.map(mapTree);
  const metaFilePath = config.filePath;
  
  return { features, project, attributes, trees, metaFilePath };
};
