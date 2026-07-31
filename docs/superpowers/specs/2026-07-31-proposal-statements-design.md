# Proposal Statements

## Goal

Add `proposal` as a second statement type in SpecBox YAML. A proposal describes
planned behavior that is visible and uploadable before it becomes a required,
testable assertion.

## YAML contract

Statements remain ordered siblings inside a `specs-unit` group:

```yaml
specs-unit:
  Checkout:
    - assert: The user can submit an order
      description: Existing required behavior
    - proposal: The user can schedule an order
      description: Planned future behavior
```

Each list item must contain exactly one of `assert` or `proposal`. Both forms
accept an optional string `description`. Existing assertion-only YAML remains
valid without migration. Titles must be unique within a group across both
types. Replacing `proposal` with `assert` is the normal transition from planned
to required behavior.

## Domain model

Keep the existing `AssertionGroup.assertions` collection name for compatibility
and preserve source ordering. Its elements become a discriminated union:

```ts
type Statement =
  | {
      type: 'assert';
      title: string;
      description?: string;
      isAutomated: boolean;
    }
  | {
      type: 'proposal';
      title: string;
      description?: string;
      isAutomated: false;
    };
```

Proposal titles and descriptions participate in link validation, dependency
graph extraction, Markdown export, grouping, Git revision reads, and revision
comparison just like assertions.

## Automation and coverage

Only statements with `type: 'assert'` participate in Jest or JUnit matching.
A proposal remains non-automated even if a test has a matching composed name.

Project, tree, and feature-list coverage counters count assertions only.
Proposals do not increase `total`, `automated`, or `uncovered`. After a proposal
is converted to an assertion, it becomes eligible for matching and enters these
counters on the next project refresh.

## API contracts

The local `ProjectSnapshot`, current-feature response, and historical-feature
response expose the statement discriminator. Historical comparison identifies a
statement by group and title, so a `proposal` to `assert` transition is reported
as a type change instead of a removal and an addition.

The remote assertion-group property keeps the name `assertions` and accepts:

```ts
Array<
  | SpecBoxWebApiModelUploadAssertionModel
  | SpecBoxWebApiModelUploadProposalModel
>
```

The assertion upload model carries `type: 'assert'` and `isAutomated`. The
proposal upload model carries `type: 'proposal'`, its title, and optional
description; it carries no automation data.

## Local UI and Markdown

The Angular UI renders mixed statements in YAML order. Assertions retain the
existing positive or negative automation status. Proposals show a neutral
`Предложение` badge and never show the negative “not automated” status.
Automation counters exclude proposals.

Markdown export includes proposals in their original group and order and labels
them visibly as proposals.

## Validation and failure behavior

- An item containing both `assert` and `proposal` is invalid.
- An item containing neither key is invalid.
- Non-string statement titles and descriptions are invalid.
- Equal titles in one group are duplicates even when their types differ.
- Missing links in proposal titles or descriptions produce the existing
  missing-link diagnostic.
- Existing assertion-only projects and API consumers keep their current
  behavior except that assertion responses now include `type: 'assert'`.

## Verification

Backend tests cover mixed YAML decoding and ordering, invalid item shapes,
cross-type duplicates, proposal links, test matching, counters, upload mapping,
local current and historical responses, dependency graphs, and Markdown
output. Angular tests cover proposal rendering, assertion-only counters, and
revision comparison of a proposal-to-assert transition. Existing assertion-only
tests remain regression coverage.
