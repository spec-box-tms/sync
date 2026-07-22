import { Clipboard } from '@angular/cdk/clipboard';
import { JsonPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { TuiButton, TuiIcon, TuiScrollbar } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { Feature } from '../../../model/feature.model';
import { Markdown } from '../../../ui/markdown/markdown.component';
import { Attribute } from '../attribute/attribute';
import { Assert } from '../assert/assert';

@Component({
  selector: 'feature-content',
  templateUrl: 'feature-content.html',
  styleUrl: 'feature-content.scss',
  imports: [Markdown, Attribute, Assert, TuiButton, TuiCopy, TuiIcon, TuiScrollbar, JsonPipe],
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
