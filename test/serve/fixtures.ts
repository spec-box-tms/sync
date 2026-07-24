import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const createProject = async () => {
  const root = await mkdtemp(join(tmpdir(), 'spec-box-serve-'));
  await writeFile(join(root, '.tms.json'), JSON.stringify({
    api: { host: 'https://example.invalid', project: 'test' },
    yml: { files: ['specs/**/*.spec.yml'] },
    JUnit: { reportPath: 'test-results/junit.xml', keys: ['featureCode', 'featureTitle', 'groupTitle', 'assertionTitle'] },
  }));
  await writeFile(join(root, '.spec-box-meta.yml'), 'title: Test\nattributes: []\ntrees: []\n');
  await mkdir(join(root, 'specs'));
  await writeFile(join(root, 'specs', 'feature.spec.yml'), 'code: feature-one\nfeature: Feature one\nspecs-unit:\n  Group:\n    - assert: Works\n');
  return {
    root,
    dispose: () => rm(root, { recursive: true, force: true }),
  };
};
