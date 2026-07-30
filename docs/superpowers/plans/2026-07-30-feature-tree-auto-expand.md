# Feature Tree One-Time Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reveal the selected feature's path on navigation without pinning it open or changing other branches.

**Architecture:** `FeatureTree` owns one writable set of expanded node objects. When the feature code changes, a `linkedSignal` adds its ancestor nodes to that set; clicking any node toggles only that node. `FeatureTreeNode` renders solely from the set passed by its parent.

**Tech Stack:** Angular 22 signals, Angular TestBed, Vitest.

## Global Constraints

- Do not change the URL, `FeatureTreeNode` model, or add dependencies.
- Preserve all existing expanded and collapsed states when navigation selects another feature.
- A selected feature's ancestors can be collapsed manually after navigation.
- Do not create a Git commit; the user explicitly requested uncommitted changes.

---

### Task 1: Store and update tree expansion once per navigation

**Files:**
- Delete: `serve-ui/src/app/pages/features/feature-tree-node/feature-tree-node.spec.ts`
- Modify: `serve-ui/src/app/pages/features/feature-tree/feature-tree.spec.ts`
- Modify: `serve-ui/src/app/pages/features/feature-tree/feature-tree.ts`
- Modify: `serve-ui/src/app/pages/features/feature-tree/feature-tree.html`
- Modify: `serve-ui/src/app/pages/features/feature-tree-node/feature-tree-node.ts`
- Modify: `serve-ui/src/app/pages/features/feature-tree-node/feature-tree-node.html`

**Interfaces:**
- Consumes: `FeatureTree.activeFeatureCode(): string | null` and `FeatureTreeNodeModel`.
- Produces: `FeatureTree.expandedNodes(): ReadonlySet<FeatureTreeNodeModel>` and the existing `expandedChange` child event.

- [ ] **Step 1: Write failing tests for the new interaction**

```ts
it('allows collapsing the selected feature path after navigation', async () => {
  fixture.componentRef.setInput('activeFeatureCode', 'selected');
  await fixture.whenStable();
  selectedParent.querySelector<HTMLElement>(':scope > .item')?.click();
  await fixture.whenStable();
  expect(element.textContent).not.toContain('selected фича');
});

it('keeps another open branch expanded after navigation', async () => {
  openManualBranch();
  fixture.componentRef.setInput('activeFeatureCode', 'other');
  await fixture.whenStable();
  expect(element.textContent).toContain('manual фича');
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- --watch=false --include=src/app/pages/features/feature-tree/feature-tree.spec.ts`

Expected: FAIL because computed automatic expansion still keeps the selected path open and replaces the previous automatic path.

- [ ] **Step 3: Replace automatic expansion with one writable set**

```ts
readonly expandedNodes = linkedSignal({
  source: computed(() => ({ tree: this.tree(), featureCode: this.activeFeatureCode() })),
  computation: ({ tree, featureCode }, previous) => {
    const nodes = new Set(previous?.value ?? []);
    this.nodesContainingFeature(tree.root, featureCode).forEach((node) => nodes.add(node));
    return nodes;
  },
});
```

`toggleExpanded` adds or removes exactly one node from `expandedNodes`. Remove the node-level feature containment check and pass only `expandedNodes` through recursive children.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm test -- --watch=false --include=src/app/pages/features/feature-tree/feature-tree.spec.ts`

Expected: PASS; the selected path opens once, can be collapsed, and another manually open branch remains open after navigation.

- [ ] **Step 5: Run full verification**

Run: `npm test -- --watch=false`

Expected: all tests pass.

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 6: Leave changes uncommitted**

Do not stage or commit any files.
