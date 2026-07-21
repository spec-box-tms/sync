import * as DE from 'io-ts/DecodeError';
import * as d from 'io-ts/Decoder';
import * as FS from 'io-ts/FreeSemigroup';
import * as E from 'fp-ts/lib/Either';

export type Severity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  code: string;
  severity: Severity;
  path: string;
  message: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
}

export interface FeatureTreeNode {
  attributeCode?: string;
  valueCode?: string;
  valueTitle?: string;
  features: string[];
  children: FeatureTreeNode[];
}

export interface ProjectSnapshot {
  revision: number;
  project?: { title?: string; description?: string; repository?: string };
  attributes: Array<{ code: string; title: string; values: Array<{ code: string; title: string }> }>;
  treeDefinitions: Array<{ code: string; title: string; groupBy: string[] }>;
  features: import('../domain').Feature[];
  diagnostics: Diagnostic[];
  coverage: { total: number; automated: number; uncovered: number };
  storageAreas: Array<{ pattern: string; rootPath: string; directories: DirectoryNode[] }>;
  trees: Array<{ code: string; title: string; groupBy: string[]; root: FeatureTreeNode }>;
  dependencyGraph: {
    nodes: Array<{ code: string; title?: string; exists: boolean }>;
    edges: Array<{ from: string; to: string; resolved: boolean }>;
  };
}

export interface ProjectSnapshotService {
  snapshot: ProjectSnapshot;
}

export interface FeatureAssertionResponse {
  title: string;
  description?: string;
  isAutomated: boolean;
}

export interface FeatureResponse {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: Array<{ title: string; assertions: FeatureAssertionResponse[] }>;
  filePath: string;
  optimisticLock: string;
}

export interface CreateFeatureRequest {
  filePath: string;
  code: string;
  title: string;
}

export interface UpdateFeatureRequest {
  code: string;
  title: string;
  description?: string;
  attributes: Record<string, string[]>;
  groups: Array<{ title: string; assertions: Array<{ title: string; description?: string; isAutomated?: boolean }> }>;
  optimisticLock: string;
  filePath?: string;
}

export interface ErrorResponse {
  errors: Array<{ code: string; message: string; path: string }>;
}

export type RequestDecoding<T> = { value: T } | { errors: ErrorResponse['errors'] };

const pointer = (parts: Array<string | number>) => parts.length
  ? `/${parts.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}`
  : '';

const strict = <A>(decoder: d.Decoder<unknown, A>, allowed: string[]): d.Decoder<unknown, A> => ({
  decode: (input) => {
    const decoded = decoder.decode(input);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return decoded;
    const record = input as Record<string, unknown>;
    const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
    if (!unknown.length) return decoded;
    const unknownErrors = unknown
      .map((key) => FS.of(DE.key(key, 'required', d.error(record[key], 'unknown field'))))
      .reduce(FS.concat);
    return E.isLeft(decoded) ? E.left(FS.concat(decoded.left, unknownErrors)) : E.left(unknownErrors);
  },
});

const collectErrors = (errors: d.DecodeError, path: Array<string | number> = []): ErrorResponse['errors'] => {
  if (errors._tag === 'Concat') return [...collectErrors(errors.left, path), ...collectErrors(errors.right, path)];
  const error = errors.value;
  switch (error._tag) {
    case 'Leaf': return [{ code: 'invalid-request', message: error.error, path: pointer(path) }];
    case 'Key': return collectErrors(error.errors, [...path, error.key]);
    case 'Index': return collectErrors(error.errors, [...path, error.index]);
    case 'Member': return collectErrors(error.errors, [...path, error.index]);
    case 'Lazy': return collectErrors(error.errors, path);
    case 'Wrap': return [{ code: 'invalid-request', message: error.error, path: pointer(path) }, ...collectErrors(error.errors, path)];
  }
};

const codePattern = /^[A-Za-z][A-Za-z0-9-_]*$/;
const codeDecoder = d.parse((value: string) => codePattern.test(value) ? d.success(value) : d.failure(value, 'valid feature code'))(d.string);
const titleDecoder = d.parse((value: string) => value.trim() ? d.success(value) : d.failure(value, 'non-empty title'))(d.string);

const writableAssertionDecoder = strict(d.intersect(
  d.struct({ title: d.string }),
)(d.partial({ description: d.string, isAutomated: d.boolean })), ['title', 'description', 'isAutomated']);

const writableGroupDecoder = strict(d.struct({
  title: d.string,
  assertions: d.array(writableAssertionDecoder),
}), ['title', 'assertions']);

const uniqueGroupsDecoder = d.parse((groups: UpdateFeatureRequest['groups']) => {
  const seen = new Set<string>();
  const duplicate = groups.findIndex((group) => seen.has(group.title) || !seen.add(group.title));
  return duplicate < 0
    ? d.success(groups)
    : E.left(FS.of(DE.index(duplicate, 'required', FS.of(DE.key('title', 'required', d.error(groups[duplicate].title, 'unique group title'))))));
})(d.array(writableGroupDecoder));

export const createFeatureRequestDecoder: d.Decoder<unknown, CreateFeatureRequest> = strict(d.struct({
  filePath: d.string,
  code: codeDecoder,
  title: titleDecoder,
}), ['filePath', 'code', 'title']);

export const updateFeatureRequestDecoder: d.Decoder<unknown, UpdateFeatureRequest> = strict(d.intersect(
  d.struct({
    code: codeDecoder,
    title: titleDecoder,
    attributes: d.record(d.array(d.string)),
    groups: uniqueGroupsDecoder,
    optimisticLock: d.string,
  }),
)(d.partial({ description: d.string, filePath: d.string })), ['code', 'title', 'description', 'attributes', 'groups', 'optimisticLock', 'filePath']);

const decodeRequest = <T>(decoder: d.Decoder<unknown, T>, input: unknown): RequestDecoding<T> => {
  const decoded = decoder.decode(input);
  return E.isLeft(decoded) ? { errors: collectErrors(decoded.left) } : { value: decoded.right };
};

export const decodeCreateFeatureRequest = (input: unknown) => decodeRequest(createFeatureRequestDecoder, input);
export const decodeUpdateFeatureRequest = (input: unknown) => decodeRequest(updateFeatureRequestDecoder, input);
