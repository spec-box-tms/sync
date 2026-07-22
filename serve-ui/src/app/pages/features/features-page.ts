import { JsonPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ProjectService } from '../../core/project.service';
import { FeatureTree as FeatureTreeModel } from '../../model/feature-tree.model';
import { FeatureList } from './feature-list/feature-list';
import { FeatureTree } from './feature-tree/feature-tree';
import { NavControls } from './nav-controls/nav-controls';
import { ActiveFeatureService } from './active-feature.service';
import { FeatureContent } from './feature-content/feature-content';
import { ActivatedRoute, Router } from '@angular/router';
import { Feature } from '../../model/feature.model';
import { FeaturePagePresenter } from './feature-page-presenter/feature-page-presenter';
import { toSignal } from '@angular/core/rxjs-interop';
@Component({
  imports: [FeaturePagePresenter],
  selector: 'features-page',
  templateUrl: 'features-page.html',
  styleUrl: 'features-page.scss',
  providers: [ActiveFeatureService],
})
export class FeaturesPage {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.activatedRoute.queryParams);
  private readonly queryTree = computed(() => this.queryParams()?.['tree'] ?? null);
  private readonly queryFeature = computed(() => this.queryParams()?.['feature'] ?? null);

  readonly projectSnapshotResource = inject(ProjectService).projectResource;

  readonly activeFeature = computed(() => {
    const queryFeature = this.queryFeature();
    if (!queryFeature) {
      return null;
    }
    if (this.projectSnapshotResource.hasValue()) {
      return (
        this.projectSnapshotResource.value().features.find((f) => f.code === queryFeature) ?? null
      );
    }
    return null;
  });
  readonly activeTree = computed(() => {
    const queryTree = this.queryTree();
    if (!queryTree) {
      return null;
    }
    if (this.projectSnapshotResource.hasValue()) {
      return this.projectSnapshotResource.value().trees.find((t) => t.code === queryTree) ?? null;
    }
    return null;
  });

  readonly featureCodes = signal<string[]>([]);
}
