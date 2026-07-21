import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import { stringify } from 'yaml';

import { Feature } from '../domain';
import { ErrorResponse, FeatureResponse, decodeCreateFeatureRequest, decodeUpdateFeatureRequest } from './models';
import { ProjectSnapshotService } from './snapshot';

type Validation = ErrorResponse['errors'];
const md5 = (content: Buffer) => createHash('md5').update(content).digest('hex');
const error = (message: string, path = ''): Validation[number] => ({ code: 'invalid-request', message, path });

const { isMatch } = require('micromatch') as { isMatch(path: string, patterns: string[]): boolean };

const toResponse = async (feature: Feature, root: string): Promise<FeatureResponse> => {
  const bytes = await readFile(resolve(root, feature.filePath));
  return {
    code: feature.code,
    title: feature.title,
    ...(feature.description === undefined ? {} : { description: feature.description }),
    attributes: feature.attributes || {},
    groups: feature.groups,
    filePath: feature.filePath,
    optimisticLock: md5(bytes),
  };
};

export class FeatureService {
  constructor(private readonly snapshots: ProjectSnapshotService) {}

  async current(code: string): Promise<FeatureResponse | undefined> {
    const feature = this.snapshots.snapshot.features.find((item) => item.code === code);
    return feature ? toResponse(feature, this.contentRoot()) : undefined;
  }

  async create(body: unknown): Promise<{ snapshot: Awaited<ReturnType<ProjectSnapshotService['refresh']>> } | { errors: Validation }> {
    const decoded = decodeCreateFeatureRequest(body);
    if ('errors' in decoded) return decoded;
    const request = decoded.value;
    const invalid = await this.validatePath(request.filePath) || this.validateUnique(request.code);
    if (invalid) return { errors: invalid };
    const target = resolve(this.contentRoot(), request.filePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, stringify({ code: request.code, feature: request.title }));
    return { snapshot: await this.snapshots.refresh() };
  }

  async update(currentCode: string, body: unknown): Promise<{ snapshot: Awaited<ReturnType<ProjectSnapshotService['refresh']>> } | { errors: Validation } | 'conflict' | 'missing'> {
    const decoded = decodeUpdateFeatureRequest(body);
    if ('errors' in decoded) return decoded;
    const request = decoded.value;
    const feature = this.snapshots.snapshot.features.find((item) => item.code === currentCode);
    if (!feature) return 'missing';
    const target = await this.existingTarget(feature.filePath);
    if (!target) return { errors: [error('Путь вне проекта', '/filePath')] };
    const bytes = await readFile(target);
    if (md5(bytes) !== request.optimisticLock) return 'conflict';
    const duplicate = this.validateUnique(request.code, currentCode);
    if (duplicate) return { errors: duplicate };
    const metaAttributes = new Set(this.snapshots.snapshot.attributes.map(({ code }) => code));
    if (Object.keys(request.attributes).some((name) => !metaAttributes.has(name))) return { errors: [error('Неизвестный атрибут', '/attributes')] };
    const document = {
      code: request.code,
      feature: request.title,
      ...(request.description === undefined ? {} : { description: request.description }),
      ...(Object.keys(request.attributes).length ? { definitions: request.attributes } : {}),
      ...(request.groups.length ? { 'specs-unit': Object.fromEntries(request.groups.map((group) => [group.title, group.assertions.map(({ title, description }) => ({ assert: title, ...(description === undefined ? {} : { description }) }))])) } : {}),
    };
    await writeFile(target, stringify(document));
    return { snapshot: await this.snapshots.refresh() };
  }

  private validateUnique(code: string, current?: string): Validation | undefined {
    return this.snapshots.snapshot.features.some((feature) => feature.code === code && feature.code !== current)
      ? [error('Код фичи уже используется', '/code')]
      : undefined;
  }

  private contentRoot() {
    return this.snapshots.config?.projectPath
      ? resolve(this.snapshots.projectRoot, this.snapshots.config.projectPath)
      : this.snapshots.projectRoot;
  }

  private async existingTarget(filePath: string): Promise<string | undefined> {
    const target = resolve(this.contentRoot(), filePath);
    return await this.isContained(target, true) ? target : undefined;
  }

  private async isContained(target: string, includeTarget = false): Promise<boolean> {
    const root = await realpath(this.contentRoot());
    let path = includeTarget ? target : dirname(target);
    while (true) {
      try {
        const resolved = await realpath(path);
        const location = relative(root, resolved);
        return !location.startsWith('..') && !isAbsolute(location);
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') return false;
        const parent = dirname(path);
        if (parent === path) return false;
        path = parent;
      }
    }
  }

  private async validatePath(filePath: string): Promise<Validation | undefined> {
    const normalized = filePath.replace(/\\/g, '/');
    const target = resolve(this.contentRoot(), normalized);
    if (!normalized || normalized.startsWith('/') || relative(this.contentRoot(), target).startsWith('..')) return [error('Путь вне проекта', '/filePath')];
    const patterns = this.snapshots.config?.yml.files || [];
    const included = isMatch(normalized, patterns.filter((pattern) => !pattern.startsWith('!')));
    const excluded = isMatch(normalized, patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1)));
    if (!included || excluded) return [error('Путь не соответствует yml.files', '/filePath')];
    try {
      await lstat(target);
      return [error('Файл уже существует', '/filePath')];
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return await this.isContained(target) ? undefined : [error('Путь вне проекта', '/filePath')];
      return [error('Невозможно проверить путь', '/filePath')];
    }
  }
}
