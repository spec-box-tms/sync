import { Component, input, OnInit } from '@angular/core';
import { FeatureTree as FeatureTreeModel } from '../../../model/feature-tree.model';
import { FeatureTreeNode } from '../feature-tree-node/feature-tree-node';

@Component({
  selector: 'feature-tree',
  templateUrl: 'feature-tree.html',
  styleUrl: 'feature-tree.scss',
  imports: [FeatureTreeNode],
})
export class FeatureTree {
  readonly tree = input.required<FeatureTreeModel>();
}
