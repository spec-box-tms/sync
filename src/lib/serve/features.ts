import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import { stringify } from 'yaml';

import { Feature } from '../domain';
import { CreateFeatureRequest, ErrorResponse, FeatureResponse, UpdateFeatureRequest } from './models';
import { ProjectSnapshotService } from './snapshot';

type Validation = ErrorResponse['errors'];
const codePattern = /^[A-Za-z][A-Za-z0-9-_]*$/;

const md5 = (content: Buffer) => createHash('md5').update(content).digest('hex');
const error = (message: string, path = ''): Validation[number] => ({ code: 'invalid-request', message, path });
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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

const validateCreate = (body: unknown): CreateFeatureRequest | Validation => {
  if (!isObject(body)) return [error('Ожидался объект', '')];
  const result: Validation = [];
  for (const key of Object.keys(body)) if (!['filePath', 'code', 'title'].includes(key)) result.push(error('Неизвестное поле', `/${key}`));
  if (typeof body.filePath !== 'string') result.push(error('Ожидалась строка', '/filePath'));
  if (typeof body.code !== 'string') result.push(error('Ожидалась строка', '/code'));
  else if (!codePattern.test(body.code)) result.push(error('Некорректный код', '/code'));
  if (typeof body.title !== 'string') result.push(error('Ожидалась строка', '/title'));
  else if (!body.title.trim()) result.push(error('Название обязательно', '/title'));
  if (result.length) return result;
  return { filePath: body.filePath as string, code: body.code as string, title: body.title as string };
};

const validateUpdate = (body: unknown): UpdateFeatureRequest | Validation => {
  if (!isObject(body)) return [error('Ожидался объект', '')];
  const result: Validation = [];
  const allowed = ['code', 'title', 'description', 'attributes', 'groups', 'optimisticLock', 'filePath'];
  for (const key of Object.keys(body)) if (!allowed.includes(key)) result.push(error('Неизвестное поле', `/${key}`));
  if (typeof body.code !== 'string') result.push(error('Ожидалась строка', '/code'));
  else if (!codePattern.test(body.code)) result.push(error('Некорректный код', '/code'));
  if (typeof body.title !== 'string') result.push(error('Ожидалась строка', '/title'));
  else if (!body.title.trim()) result.push(error('Название обязательно', '/title'));
  if (body.description !== undefined && typeof body.description !== 'string') result.push(error('Некорректное описание', '/description'));
  if (body.filePath !== undefined && typeof body.filePath !== 'string') result.push(error('Некорректный путь', '/filePath'));
  if (typeof body.optimisticLock !== 'string') result.push(error('Ожидалась строка', '/optimisticLock'));
  if (!isObject(body.attributes)) result.push(error('Некорректные атрибуты', '/attributes'));
  if (!Array.isArray(body.groups)) result.push(error('Некорректные группы', '/groups'));
  const groups: UpdateFeatureRequest['groups'] = [];
  const names = new Set<string>();
  for (let index = 0; Array.isArray(body.groups) && index < body.groups.length; index++) {
    const group = body.groups[index];
    if (!isObject(group)) { result.push(error('Ожидался объект', `/groups/${index}`)); continue; }
    for (const key of Object.keys(group)) if (!['title', 'assertions'].includes(key)) result.push(error('Неизвестное поле', `/groups/${index}/${key}`));
    if (typeof group.title !== 'string') { result.push(error('Ожидалась строка', `/groups/${index}/title`)); continue; }
    if (!Array.isArray(group.assertions)) { result.push(error('Некорректные утверждения', `/groups/${index}/assertions`)); continue; }
    if (names.has(group.title)) result.push(error('Повторяющаяся группа', `/groups/${index}/title`));
    names.add(group.title);
    const assertions: UpdateFeatureRequest['groups'][number]['assertions'] = [];
    group.assertions.forEach((assertion, assertionIndex) => {
      const path = `/groups/${index}/assertions/${assertionIndex}`;
      if (!isObject(assertion)) { result.push(error('Ожидался объект', path)); return; }
      for (const key of Object.keys(assertion)) if (!['title', 'description', 'isAutomated'].includes(key)) result.push(error('Неизвестное поле', `${path}/${key}`));
      if (typeof assertion.title !== 'string') { result.push(error('Ожидалась строка', `${path}/title`)); return; }
      if (assertion.description !== undefined && typeof assertion.description !== 'string') result.push(error('Некорректное описание', `${path}/description`));
      if (assertion.isAutomated !== undefined && typeof assertion.isAutomated !== 'boolean') result.push(error('Некорректный признак автоматизации', `${path}/isAutomated`));
      assertions.push({ title: assertion.title, ...(typeof assertion.description === 'string' ? { description: assertion.description } : {}) });
    });
    groups.push({ title: group.title, assertions });
  }
  const attributes: Record<string, string[]> = {};
  for (const [name, values] of isObject(body.attributes) ? Object.entries(body.attributes) : []) {
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) result.push(error('Некорректный атрибут', `/attributes/${name}`));
    else attributes[name] = values as string[];
  }
  if (result.length) return result;
  return { code: body.code as string, title: body.title as string, ...(typeof body.description === 'string' ? { description: body.description } : {}), attributes, groups, optimisticLock: body.optimisticLock as string, ...(typeof body.filePath === 'string' ? { filePath: body.filePath } : {}) };
};

export class FeatureService {
  constructor(private readonly snapshots: ProjectSnapshotService) {}

  async current(code: string): Promise<FeatureResponse | undefined> {
    const feature = this.snapshots.snapshot.features.find((item) => item.code === code);
    return feature ? toResponse(feature, this.contentRoot()) : undefined;
  }

  async create(body: unknown): Promise<{ snapshot: Awaited<ReturnType<ProjectSnapshotService['refresh']>> } | { errors: Validation }> {
    const request = validateCreate(body);
    if (Array.isArray(request)) return { errors: request };
    const invalid = await this.validatePath(request.filePath) || this.validateUnique(request.code);
    if (invalid) return { errors: invalid };
    const target = resolve(this.contentRoot(), request.filePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, stringify({ code: request.code, feature: request.title }));
    return { snapshot: await this.snapshots.refresh() };
  }

  async update(currentCode: string, body: unknown): Promise<{ snapshot: Awaited<ReturnType<ProjectSnapshotService['refresh']>> } | { errors: Validation } | 'conflict' | 'missing'> {
    let request: UpdateFeatureRequest | Validation;
    try {
      request = validateUpdate(body);
    } catch (caught) {
      return { errors: [error('Некорректное утверждение', caught instanceof Error ? caught.message : '')] };
    }
    if (Array.isArray(request)) return { errors: request };
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
