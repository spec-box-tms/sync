import { JsonPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ProjectService } from '../../core/project.service';
import { FeatureTree as FeatureTreeModel } from '../../model/feature-tree.model';
import { FeatureList } from './feature-list/feature-list';
import { FeatureTree } from './feature-tree/feature-tree';
import { NavControls } from './nav-controls/nav-controls';
import { ActiveFeatureService } from './active-feature.service';
import { FeatureContent } from './feature-content/feature-content';

@Component({
  imports: [FeatureTree, FeatureList, NavControls, JsonPipe, FeatureContent],
  selector: 'features-page',
  templateUrl: 'features-page.html',
  styleUrl: 'features-page.scss',
  providers: [ActiveFeatureService],
})
export class FeaturesPage {
  readonly projectSnapshotResource = inject(ProjectService).projectResource;
  readonly activeFeature = inject(ActiveFeatureService).activeFeature;

  readonly activeTree = signal<FeatureTreeModel | null>(null);
  readonly featureCodes = signal<string[]>([]);

  setFeatureCodes(featureCodes: string[]) {
    this.featureCodes.set(featureCodes);
  }
  setActiveTree(tree: FeatureTreeModel | null) {
    this.activeTree.set(tree);
  }
}
