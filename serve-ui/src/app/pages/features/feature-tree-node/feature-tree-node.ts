import { Component, computed, input, output } from '@angular/core';
import { FeatureTreeNode as FeatureTreeNodeModel } from '../../../model/feature-tree.model';
import { FeatureItem } from '../feature-item/feature-item';
import { TuiIcon, TuiHintDirective } from '@taiga-ui/core';

@Component({
  standalone: true,
  imports: [FeatureItem, TuiIcon, TuiHintDirective],
  selector: 'feature-tree-node',
  templateUrl: 'feature-tree-node.html',
  styleUrl: 'feature-tree-node.scss',
})
export class FeatureTreeNode {
  readonly node = input.required<FeatureTreeNodeModel>();
  readonly nodePath = input.required<string>();
  readonly expandedNodes = input<ReadonlySet<string>>(new Set());
  readonly expandedChange = output<string>();
  readonly expanded = computed(() => this.expandedNodes().has(this.nodePath()));

  toggleExpanded() {
    this.expandedChange.emit(this.nodePath());
  }
}
