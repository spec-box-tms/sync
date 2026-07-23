# YAML Editor API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a raw-YAML read/write API while retaining the structural API for UI data.

**Architecture:** `FeatureService` owns byte-exact reads, ETag creation, and conditional writes. Express exposes these operations only under `/api/features/:code/yaml`; existing JSON routes stay unchanged.

**Tech Stack:** Node.js, Express 4, TypeScript, node:test.

## Global Constraints

- `GET /api/project` and `GET /api/features/:code` keep their current JSON responses.
- `GET /api/features/:code/yaml` returns original bytes, `Content-Type: application/yaml; charset=utf-8`, and quoted-MD5 `ETag`.
- `PUT /api/features/:code/yaml` accepts YAML unchanged and requires the GET ETag in `If-Match`.
- Missing or stale `If-Match` returns empty `409` and changes no file.
- Successful PUT writes supplied bytes without parsing, formatting, or validation, then returns refreshed `ProjectSnapshot`.
- No frontend files are part of this change.

---

### Task 1: Raw YAML backend API

**Files:**
- Modify: `src/lib/serve/features.ts`
- Modify: `src/lib/serve/server.ts`
- Modify: `src/lib/serve/models.ts`
- Create: `test/serve/25-feature-yaml-get.test.ts`
- Modify: `test/serve/50-feature-update-put.test.ts`

**Interfaces:**
- Produces: `FeatureService.yaml(code): Promise<{ bytes: Buffer; etag: string } | undefined>`.
- Produces: `FeatureService.updateYaml(code, bytes, ifMatch): Promise<{ snapshot } | 'missing' | 'conflict'>`.

- [ ] **Step 1: Write the failing GET tests**

```ts
const response = await fetch(`${url}/api/features/feature-one/yaml`);
assert.equal(response.status, 200);
assert.equal(await response.text(), source);
assert.equal(response.headers.get('content-type'), 'application/yaml; charset=utf-8');
assert.equal(response.headers.get('etag'), `"${createHash('md5').update(source).digest('hex')}"`);
```

Also test `404` for an unknown code.

- [ ] **Step 2: Run the GET test to verify it fails**

Run: `node --test -r ts-node/register test/serve/25-feature-yaml-get.test.ts`

Expected: FAIL because the YAML route does not exist.

- [ ] **Step 3: Add the minimal read path**

```ts
app.get('/api/features/:code/yaml', async (req, res) => {
  const yaml = await features?.yaml(req.params.code);
  if (!yaml) return res.sendStatus(404);
  return res.type('application/yaml').set('ETag', yaml.etag).send(yaml.bytes);
});
```

Create the ETag from original bytes with the existing MD5 helper and quote the hash. Do not parse or stringify YAML here.

- [ ] **Step 4: Run the GET test to verify it passes**

Run: `node --test -r ts-node/register test/serve/25-feature-yaml-get.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing PUT tests**

```ts
const current = await fetch(`${url}/api/features/feature-one/yaml`);
const response = await fetch(`${url}/api/features/feature-one/yaml`, {
  method: 'PUT',
  headers: { 'content-type': 'application/yaml; charset=utf-8', 'if-match': current.headers.get('etag')! },
  body: '# comment\nfeature: Changed\nunknown: true\ncode: feature-one\n',
});
assert.equal(response.status, 200);
```

Assert exact stored bytes, refreshed snapshot, and empty `409` with unchanged file for missing or stale `If-Match`. Retire JSON-PUT tests because the route is removed.

- [ ] **Step 6: Run the PUT test to verify it fails**

Run: `node --test -r ts-node/register test/serve/50-feature-update-put.test.ts`

Expected: FAIL because raw YAML writes are not implemented.

- [ ] **Step 7: Add the minimal conditional write path**

```ts
app.put('/api/features/:code/yaml', express.raw({ type: ['application/yaml', 'text/yaml'] }), async (req, res) => {
  const result = await features!.updateYaml(req.params.code, req.body, req.get('if-match'));
  if (result === 'missing') return res.sendStatus(404);
  if (result === 'conflict') return res.status(409).end();
  return res.json(result.snapshot);
});
```

Compare `If-Match` to the quoted current ETag, write the received `Buffer`, then refresh. Remove the obsolete JSON update decoder and service method when no caller remains.

- [ ] **Step 8: Run backend verification**

Run: `npm run test:serve && npm run build`

Expected: exit 0.

- [ ] **Step 9: Commit**

Run: `git add src/lib/serve/features.ts src/lib/serve/server.ts src/lib/serve/models.ts test/serve/25-feature-yaml-get.test.ts test/serve/50-feature-update-put.test.ts && git commit -m "Добавить API исходного YAML"`
