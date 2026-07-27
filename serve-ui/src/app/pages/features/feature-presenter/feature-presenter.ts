import { Component, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { FeatureHistory } from '../../../model/feature-history.model';
import { Feature } from '../../../model/feature.model';
import { FeatureCompare } from '../feature-compare/feature-compare';
import { FeatureContent } from '../feature-content/feature-content';
import { FeatureEditor } from '../feature-editor/feature-editor';
import { FeatureHistorySelector } from '../feature-history-selector/feature-history-selector';
import { Graph } from '../graph/graph';
import { ProjectSnapshot } from '../../../model/project-snapshot.model';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'feature-presenter',
  templateUrl: 'feature-presenter.html',
  styleUrl: 'feature-presenter.scss',
  imports: [
    TuiCopy,
    TuiScrollbar,
    FeatureHistorySelector,
    FeatureContent,
    TuiButton,
    TuiIcon,
    FeatureEditor,
    FeatureCompare,
    Graph,
    RouterLink,
  ],
})
export class FeaturePresenter {
  private readonly router = inject(Router);
  readonly mode = input.required<'view' | 'edit' | 'compare' | 'graph', string | null>({
    transform: (queryMode) => {
      if (queryMode === 'edit') {
        return 'edit';
      }
      if (queryMode === 'compare') {
        return 'compare';
      }
      if (queryMode === 'graph') {
        return 'graph';
      }
      return 'view';
    },
  });

  readonly project = input.required<ProjectSnapshot>();
  readonly feature = input.required<Feature | null>();
  readonly editor = viewChild<FeatureEditor>('editor');
  readonly compareWith = signal<FeatureHistory | null>(null);
  readonly graphMode = signal<boolean>(false);

  hasChanges = computed(() => this.editor()?.hasChanges());

  saveChanges() {
    this.editor()?.saveChanges();
  }

  enterView() {
    this.router.navigate([], {
      queryParams: { mode: 'view' },
      queryParamsHandling: 'merge',
    });
  }

  onCompareWithChange(value: FeatureHistory | null) {
    this.compareWith.set(value);
    if (value != null) {
      this.router.navigate([], {
        queryParams: { mode: 'compare' },
        queryParamsHandling: 'merge',
      });
    } else {
      this.router.navigate([], {
        queryParams: { mode: 'view' },
        queryParamsHandling: 'merge',
      });
    }
  }
}
