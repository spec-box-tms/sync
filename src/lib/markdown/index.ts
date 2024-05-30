import { ProjectData } from '../domain';
import { LINK_LIKE } from '../validators/validator';
import { buildIndex } from './build-index';
import { featureToMarkdown } from './feature-to-markdown';
import { writeFile, mkdir } from 'fs/promises';

const replaceInternalLinks = (
  markdown: string,
  pathMap: Map<string, string>
) => {
  const re = new RegExp(LINK_LIKE);
  return markdown.replace(re, (link) => {
    const path = pathMap.get(link);
    if(path) {
      return `[[${path} | ${link}]]`
    }
    return link;
  });
};

export const exportMarkdown = async (
  projectData: ProjectData,
  path: string
) => {
  const featureCodeToPath = new Map<string, string>();
  for (const feature of projectData.features) {
    const featurePath = feature.filePath.slice(
      0,
      feature.filePath.lastIndexOf('.')
    );
    featureCodeToPath.set(`$${feature.code}`, featurePath + '.md');
  }

  for (const feature of projectData.features) {
    const markDown = replaceInternalLinks(featureToMarkdown(feature), featureCodeToPath);

    const filePath =
      feature.filePath.slice(0, feature.filePath.lastIndexOf('.')) + '.md';
    const exportPath = `${path}/${filePath}`;
    const exportDirectory = exportPath.slice(0, exportPath.lastIndexOf('/'));

    await mkdir(exportDirectory, { recursive: true });
    await writeFile(exportPath, markDown);
  }

  if(featureCodeToPath.size > 0) {
    writeFile(`${path}/index.md`, buildIndex(projectData, featureCodeToPath));
  }
};
