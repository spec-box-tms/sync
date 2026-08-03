import { AssertionGroup, Feature, Statement } from "../domain";

function mdFeatureTitle(feature: Feature) {
  let result = `# ${feature.title} ( ${feature.code} )\r\n\r\n`;
  if(feature.description) {
    result += `${feature.description.trim()}\r\n\r\n`;
  }
  return result;
}

function mdFeatureGroupTitle(groupTitle: string) {
  return `## ${groupTitle.trim()}\r\n\r\n`;
}

function mdDescriptionToQuote(description: string) {
  const quotedNewLines = description.trim().replace(/\n/g, '\n> ');
  return `> ${quotedNewLines}`;
}

function mdFeatureStatement(statement: Statement) {
  const label = statement.type === 'proposal' ? '**Предложение:** ' : '';
  let result = `- ${label}${statement.title.trim()}\r\n\r\n`;
  if (statement.description) {
    result += `${mdDescriptionToQuote(statement.description)}\r\n\r\n`;
  }
  return result;
}

function mdFeatureGroup(assertionGroup: AssertionGroup) {
  let result = '';
  result += mdFeatureGroupTitle(assertionGroup.title);
  assertionGroup.assertions.forEach((assertion) => {
    result += mdFeatureStatement(assertion);
  });
  return result;
}

export function featureToMarkdown(feature: Feature): string {
  let result = '';
  result += mdFeatureTitle(feature);

  feature.groups.forEach((group) => {
    result += mdFeatureGroup(group);
  });

  return result;
}
