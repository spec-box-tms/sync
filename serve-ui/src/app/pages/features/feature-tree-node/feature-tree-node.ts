import { Component, input, signal } from '@angular/core';
import { FeatureTreeNode as FeatureTreeNodeModel } from '../../../model/feature-tree.model';
import { FeatureItem } from '../feature-item/feature-item';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  standalone: true,
  imports: [FeatureItem, TuiIcon],
  selector: 'feature-tree-node',
  templateUrl: 'feature-tree-node.html',
  styleUrl: 'feature-tree-node.scss',
})
export class FeatureTreeNode {
  readonly node = input.required<FeatureTreeNodeModel>();
  readonly expanded = signal(false);

  toggleExpanded() {
    this.expanded.update((v) => !v);
  }
}
