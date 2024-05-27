import { Feature, ProjectData, Tree } from '../domain';

const featureToLink = (feature: Feature, path: string): string => {
  return `[[${path} | ${feature.title} ( ${feature.code} ) ]]`;
};

const linearIndex = (
  projectData: ProjectData,
  pathMap: Map<string, string>
) => {
  let result = '# Содержание \r\n\r\n';
  const sortedFeatures = [...projectData.features].sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  for (const feature of sortedFeatures) {
    const path = pathMap.get(`$${feature.code}`);
    if (path) {
      result += `- ${featureToLink(feature, path)} \r\n\r\n`;
    }
  }
  return result;
};

export const buildIndex = (
  projectData: ProjectData,
  pathMap: Map<string, string>
): string => {
  return linearIndex(projectData, pathMap);
  // ToDo: сделать построение индекса по деревьям
};
