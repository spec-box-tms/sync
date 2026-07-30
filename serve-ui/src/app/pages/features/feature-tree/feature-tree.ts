import { Component, computed, input, linkedSignal, untracked } from '@angular/core';
import { FeatureTree as FeatureTreeModel, FeatureTreeNode as FeatureTreeNodeModel } from '../../../model/feature-tree.model';
import { FeatureTreeNode } from '../feature-tree-node/feature-tree-node';

@Component({
  selector: 'feature-tree',
  templateUrl: 'feature-tree.html',
  styleUrl: 'feature-tree.scss',
  imports: [FeatureTreeNode],
})
export class FeatureTree {
  readonly tree = input.required<FeatureTreeModel>();
  readonly activeFeatureCode = input<string | null>(null);
  readonly expandedNodes = linkedSignal<string | null, ReadonlySet<string>>({
    source: computed(() => this.activeFeatureCode()),
    computation: (featureCode, previous) => {
      const nodes = new Set(previous?.value ?? []);
      if (featureCode) {
        this.nodesContainingFeature(untracked(() => this.tree()).root, featureCode)
          .forEach((node) => nodes.add(node));
      }
      return nodes;
    },
  });

  toggleExpanded(nodePath: string) {
    this.expandedNodes.update((nodes) => {
      const next = new Set(nodes);
      next.has(nodePath) ? next.delete(nodePath) : next.add(nodePath);
      return next;
    });
  }

  private nodesContainingFeature(node: FeatureTreeNodeModel, featureCode: string): Set<string> {
    const nodes = new Set<string>();
    const visit = (current: FeatureTreeNodeModel, path: string): boolean => {
      const containsChild = current.children
        .map((child) => visit(child, path ? `${path}/${child.valueCode}` : child.valueCode))
        .some(Boolean);
      const contains = current.features.includes(featureCode) || containsChild;
      if (contains && path) {
        nodes.add(path);
      }
      return contains;
    };
    visit(node, '');
    return nodes;
  }
}
