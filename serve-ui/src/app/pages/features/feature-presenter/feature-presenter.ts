import { Component, computed, input, signal, viewChild } from '@angular/core';
import { TuiButton, TuiScrollbar } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { Feature } from '../../../model/feature.model';
import { FeatureContent } from '../feature-content/feature-content';
import { FeatureEditor } from '../feature-editor/feature-editor';
import { FeatureHistorySelector } from '../featrue-history-selector/feature-history-selector';

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
  ],
})
export class FeaturePresenter {
  readonly feature = input.required<Feature | null>();
  readonly editing = signal(false);
  readonly editor = viewChild<FeatureEditor>('editor');

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
