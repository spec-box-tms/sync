import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, inject, input } from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { Feature } from '../../../model/feature.model';
import { Markdown } from '../../../ui/markdown/markdown.component';
import { Attribute } from '../attribute/attribute';
import { FeatureHistorySelector } from "../featrue-history-selector/feature-history-selector";
import { FeatureGroup } from '../feature-group/feature-group';

@Component({
  selector: 'feature-content',
  templateUrl: 'feature-content.html',
  styleUrl: 'feature-content.scss',
  imports: [Markdown, Attribute, FeatureGroup, TuiCopy, TuiScrollbar, FeatureHistorySelector],
})
export class FeatureContent {
  private clipboard = inject(Clipboard);

  readonly feature = input.required<Feature | null>();

  attributes = computed(() => {
    const feature = this.feature();
    if (!feature) {
      return [];
    }
    if (!feature.attributes) {
      return [];
    }

    return Object.entries(feature.attributes).map(([code, values]) => ({ code, values }));
  });

  copy(value: string) {
    this.clipboard.copy(value);
  }
}
