---
name: spec-box-senior-frontend-developer
description: Use for SpecBox frontend implementation when organizing UI code, applying the existing UI kit, or writing component styles.
---

# SpecBox Frontend UI Conventions

## Code organization

- Follow the touched application's existing feature layout and naming.
- Keep components and services single-purpose; split a page only when a UI unit
  is repeated or independently complex.
- Keep templates focused on structure. Put named derived display state in the
  component code instead of growing template expressions.

## Existing UI kit

- Reuse the application's UI kit and layout utilities before creating local UI
  components or styles.
- In `frontend`, prefer Clarity primitives (`card`, `card-block`,
  `card-footer`, `label`, `btn`, `card-link`, `clr-icon`) and `cds-layout`.
- Do not recreate UI-kit controls, tokens, spacing, borders, or status colours
  in component code.

## Minimal SCSS

- Add local SCSS only for component-specific layout or a gap the UI kit cannot
  express.
- Keep it scoped and small; avoid global selectors, deep overrides, duplicated
  token values, and hand-built visual primitives.
- Prefer `:host { display: contents; }` for a wrapper-only standalone component.
