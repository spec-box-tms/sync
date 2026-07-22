import { Component, input } from '@angular/core';
import { Feature } from '../../../model/feature.model';
import { JsonPipe } from '@angular/common';
import { Markdown } from '../../../ui/markdown/markdown.component';

@Component({
  selector: 'feature-content',
  templateUrl: 'feature-content.html',
  styleUrl: 'feature-content.scss',
  imports: [Markdown, JsonPipe],
})
export class FeatureContent {
  readonly feature = input.required<Feature | null>();
}
