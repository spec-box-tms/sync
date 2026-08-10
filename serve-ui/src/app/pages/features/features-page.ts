import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TuiNotification } from '@taiga-ui/core';
import { ProjectService } from '../../core/project.service';
import { ActiveFeatureService } from './active-feature.service';
import { FeaturePagePresenter } from './feature-page-presenter/feature-page-presenter';
import { Title } from '@angular/platform-browser';
@Component({
  imports: [FeaturePagePresenter, TuiNotification],
  selector: 'features-page',
  templateUrl: 'features-page.html',
  styleUrl: 'features-page.scss',
  providers: [ActiveFeatureService],
})
export class FeaturesPage {
  private readonly titleService = inject(Title);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly queryParams = toSignal(this.activatedRoute.queryParams);
  private readonly queryTree = computed(() => this.queryParams()?.['tree'] ?? null);
  private readonly queryFeature = computed(() => this.queryParams()?.['feature'] ?? null);

  readonly queryMode = computed(() => this.queryParams()?.['mode'] ?? null);
  readonly readOnly = this.projectService.readOnly;
  readonly mode = computed(() => {
    const readOnly = this.readOnly();
    const queryMode = this.queryMode();

    return readOnly && queryMode === 'edit' ? 'view' : queryMode;
  });

  readonly projectSnapshotResource = this.projectService.projectResource;

  readonly errors = computed(() => {
    if (this.projectSnapshotResource.hasValue()) {
      const diagnostics = this.projectSnapshotResource.value().diagnostics;
      const errors = diagnostics.filter((d) => d.severity === 'error');
      if (errors.length) {
        return errors;
      }
    }
    return null;
  });

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

  constructor() {
    effect(() => {
      if (this.projectSnapshotResource.hasValue()) {
        const activeFeature = this.activeFeature();
        const project = this.projectSnapshotResource.value();
        if (activeFeature) {
          this.titleService.setTitle(
            `${project.project?.title ?? 'SpecBoxTMS'} - ${activeFeature.title}`,
          );
        } else {
          this.titleService.setTitle(`${project.project?.title ?? 'SpecBoxTMS'}`);
        }
      } else {
        this.titleService.setTitle('SpecBoxTMS');
      }
    });
  }

  severityToAppearance(severity: string): string {
    if (severity === 'error') {
      return 'negative';
    }
    return 'info';
  }
}
