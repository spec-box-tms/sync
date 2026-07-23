import { Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FeatureTree as FeatureTreeModel } from '../../../model/feature-tree.model';
import { Feature } from '../../../model/feature.model';
import { ProjectSnapshot } from '../../../model/project-snapshot.model';
import { ActiveFeatureService } from '../active-feature.service';
import { FeatureList } from '../feature-list/feature-list';
import { FeaturePresenter } from '../feature-presenter/feature-presenter';
import { FeatureTree } from '../feature-tree/feature-tree';
import { NavControls } from '../nav-controls/nav-controls';
import { TuiScrollbar } from "@taiga-ui/core";

@Component({
  selector: 'feature-page-presenter',
  templateUrl: 'feature-page-presenter.html',
  styleUrl: 'feature-page-presenter.scss',
  imports: [FeatureTree, FeatureList, NavControls, FeaturePresenter, TuiScrollbar],
  providers: [ActiveFeatureService],
})
export class FeaturePagePresenter {
  private readonly router = inject(Router);
  private readonly activeFeatureService = inject(ActiveFeatureService);

  readonly projectSnapshot = input.required<ProjectSnapshot>();
  readonly activeTree = input.required<FeatureTreeModel | null>();
  readonly activeFeature = input.required<Feature | null>();

  readonly featureCodes = signal<string[]>([]);

  constructor() {
    effect(() => {
      const activeFeature = this.activeFeature();
      const serviceFeature = this.activeFeatureService.activeFeature();
      if (activeFeature?.code !== serviceFeature?.code) {
        this.activeFeatureService.activate(activeFeature);
      }
    });
  }

  setFeatureCodes(featureCodes: string[]) {
    this.featureCodes.set(featureCodes);
  }
  setActiveTree(tree: FeatureTreeModel | null) {
    this.router.navigate([], {
      queryParams: { tree: tree?.code ?? null },
      queryParamsHandling: 'merge',
    });
  }
}
