# Project Snapshot Read-Only Flag Design

## Goal

Remove the dedicated `GET /api/options` endpoint and make the serve mode's
read-only status part of every `ProjectSnapshot` response.

## Architecture

`ProjectSnapshot.readOnly` is a required boolean on both the backend and
Angular snapshot models. `ProjectSnapshotService` accepts the serve mode when
constructed and includes that immutable value in its initial, successful, and
invalid-configuration snapshots. The `serve` command passes `--read-only` to
the service; `startServer` continues receiving it solely to reject mutating
requests.

`GET /api/project` and successful create/update responses therefore carry the
flag without an extra request. The server no longer registers `/api/options`.

## UI Behavior

`ProjectService` derives `readOnly` from `projectResource` instead of an
options resource. Until the project snapshot has loaded, or if that request
fails, the UI remains read-only. Once a snapshot is available it uses its
`readOnly` field, so existing edit-mode guards and controls continue to work.

## API and Specification Changes

- Delete the `/api/options` route, its dedicated specification, and its
  backend tests.
- Update the serve route inventory and read-only UI requirements to reference
  `ProjectSnapshot.readOnly` from `GET /api/project`.
- Test that snapshots expose `readOnly` in writable and read-only modes,
  including snapshots returned after feature mutations where applicable.

## Error Handling

The read-only middleware remains unchanged: all mutation routes return the
existing HTTP 403 `read-only` error before parsing or writing request data.
Invalid project configuration snapshots still include `readOnly`, ensuring the
SPA can safely determine the mode even when only diagnostics are available.

## Scope

This is an API consolidation only. It does not change the CLI flag, editing
permissions, SSE payload shape, or the semantics of any write route.
