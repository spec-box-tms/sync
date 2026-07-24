import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { ProjectService } from '../../../core/project.service';
import { TuiIcon } from '@taiga-ui/core';
import { ActiveFeatureService } from '../active-feature.service';
import { Router } from '@angular/router';
import { Feature } from '../../../model/feature.model';

@Component({
  selector: 'feature-item',
  templateUrl: 'feature-item.html',
  styleUrl: 'feature-item.scss',
  imports: [TuiIcon],
  host: {
    '[class.active]': 'isActive()',
    '(click)': 'activate()',
  },
})
export class FeatureItem {
  private readonly projectSnapshotResource = inject(ProjectService).projectResource;
  private readonly activeFeatureService = inject(ActiveFeatureService);
  private readonly router = inject(Router);

  readonly featureCode = input.required<string>();
  readonly isMissing = signal(false);
  readonly isActive = computed(() => {
    const activeFeature = this.activeFeatureService.activeFeature();
    if (!activeFeature) {
      return false;
    }

    return this.featureCode() === activeFeature.code;
  });
  readonly hasAsserts = computed(() => {
    const feature = this.feature();
    if (!feature) {
      return false;
    }
    return feature.groups.length > 0;
  });

  readonly feature = computed(() => {
    if (!this.projectSnapshotResource.hasValue()) {
      return null;
    }

    const featureCode = this.featureCode();

    const feature = this.projectSnapshotResource
      .value()
      .features.find((ft) => ft.code === featureCode);

    if (!feature) {
      this.isMissing.set(true);
      return null;
    }

    return feature;
  });

  readonly totalCount = computed(() => {
    const feature = this.feature();
    if (!feature) {
      return 0;
    }
    return feature.groups.flatMap((group) => group.assertions).length;
  });

  readonly automatedCount = computed(() => {
    const feature = this.feature();
    if (!feature) {
      return 0;
    }
    return feature.groups.flatMap((group) => group.assertions.filter((a) => a.isAutomated)).length;
  });

  activate() {
    this.activeFeatureService.activate(this.feature());
    this.router.navigate([], {
      queryParams: { feature: this.featureCode() },
      queryParamsHandling: 'merge',
    });
  }

  gitStatusToLetter(status: Feature['gitStatus']): string {
    if (status === 'untracked') {
      return 'U';
    }
    if (status === 'modified') {
      return 'M';
    }
    return ' ';
  }
}
