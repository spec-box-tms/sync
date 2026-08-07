# Serve Read-Only Mode Design

## Goal

Allow CI and other non-mutating consumers to run `spec-box serve --read-only`.
In this mode the local server must not modify specification files and the Angular
UI must not offer specification-editing actions.

## CLI and server capability

`serve` gains a boolean `--read-only` option that defaults to `false`. The
command passes its value to `startServer`; the server does not infer this state
from the filesystem or runtime environment.

The server exposes `GET /api/options`, returning a JSON object with the current
capability:

```ts
interface ServeOptionsResponse {
  readOnly: boolean;
}
```

This endpoint is deliberately named `options` so future non-mutating serve
capabilities can be added without introducing more capability endpoints.

## Write protection

When `readOnly` is `true`, the server rejects every existing route that changes
specifications before invoking the feature service:

- `POST /api/features`
- `PUT /api/features/:code/yaml`

Each request receives HTTP `403 Forbidden` and this exact JSON error response:

```json
{"errors":[{"code":"read-only","message":"Сервер запущен в режиме только для чтения","path":""}]}
```

The restriction is checked by method and path before any request-body parser,
so malformed JSON, unsupported media types, and a missing `Content-Type` cannot
take precedence over read-only mode. The rejected request must not create
directories, write files, refresh a project snapshot, or otherwise mutate the
working copy.

When `readOnly` is `false` (including when the flag is omitted), both routes
retain their current behavior and status codes.

## Angular UI

`ProjectService` loads `GET /api/options` once for the SPA. `FeaturesPage`,
which owns the route query parameters, converts only a read-only `mode=edit`
request to `view` before passing mode to child components. It preserves `view`,
`compare`, and `graph` modes. Feature editing consumes this normalized state.

In read-only mode, the feature YAML remains visible but is rendered without an
editable Monaco editor and without a save control. Any other UI control that
creates a specification is omitted as well. The UI must not rely on hiding
controls for security: the API remains authoritative.

Availability is read-only while options are loading or after an HTTP error.
Once the options resource has a value, the bundled UI trusts the typed
`ServeOptions.readOnly` field directly. Runtime validation of malformed JSON is
unnecessary because the server and frontend are deployed together as one CLI
tool.

In the restricted state the YAML view remains available, while the
`Редактировать` link, `Сохранить` button, and editor are absent. A direct
`?mode=edit` request is displayed as view mode. After a `{readOnly: false}`
response, view mode offers `Редактировать`, and edit mode
offers the editor and `Сохранить`.

## Requirements and tests

Add SpecBox requirements covering:

- CLI parsing and propagation of `--read-only`, including the default writable
  mode.
- `GET /api/options` and its exact `readOnly` response in each mode.
- Exact HTTP 403 error JSON and no filesystem mutation for valid and malformed
  POST bodies and for supported, unsupported, or missing PUT content types.
- Existing create/update behavior remaining available in writable mode.
- Angular loading, error, read-only, and writable states, including direct edit
  URLs and continued availability of the YAML view.

Backend tests use the existing Node test suite and fixtures. Angular tests use
the existing Vitest component tests and HTTP test utilities. Tests are written
before production changes for each behavior.

## Scope

This change does not make the overall project filesystem read-only, change
watching or SSE behavior, alter Git history reads, or add authentication. It
only protects the serve API routes that create or update specifications and
aligns the bundled editor with that capability.
