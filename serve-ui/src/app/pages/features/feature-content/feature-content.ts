import { Component, computed, input } from '@angular/core';
import { TuiCopy, TuiHighlight } from '@taiga-ui/kit';
import { Feature } from '../../../model/feature.model';
import { Markdown } from '../../../ui/markdown/markdown.component';
import { Attribute } from '../attribute/attribute';
import { FeatureGroup } from '../feature-group/feature-group';

@Component({
  selector: 'feature-content',
  templateUrl: 'feature-content.html',
  styleUrl: 'feature-content.scss',
  imports: [Markdown, Attribute, FeatureGroup, TuiCopy],
})
export class FeatureContent {
  readonly feature = input.required<Feature>();

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
}
