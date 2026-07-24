import { Component, computed, input, signal, viewChild } from '@angular/core';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { Feature } from '../../../model/feature.model';
import { FeatureContent } from '../feature-content/feature-content';
import { FeatureEditor } from '../feature-editor/feature-editor';
import { FeatureCompare } from '../feature-compare/feature-compare';
import { FeatureHistorySelector } from '../feature-history-selector/feature-history-selector';
import { FeatureHistory } from '../../../model/feature-history.model';

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
    FeatureEditor,
    FeatureCompare,
  ],
})
export class FeaturePresenter {
  readonly feature = input.required<Feature | null>();
  readonly editing = signal(false);
  readonly editor = viewChild<FeatureEditor>('editor');
  readonly compareWith = signal<FeatureHistory | null>(null);

  enterEditing() {
    this.editing.set(true);
  }

  exitEditing() {
    this.editing.set(false);
  }

  hasChanges = computed(() => this.editor()?.hasChanges());

  saveChanges() {
    this.editor()?.saveChanges();
  }
}
