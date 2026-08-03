import { Component, input } from '@angular/core';
import { FeatureGroup as FeatureGroupModel } from '../../../model/feature-group.model';
import { Assert } from '../assert/assert';
import { Feature } from '../../../model/feature.model';

@Component({
  selector: 'feature-group',
  templateUrl: 'feature-group.html',
  styleUrl: 'feature-group.scss',
  imports: [Assert],
})
export class FeatureGroup {
  readonly feature = input.required<Feature>();
  readonly group = input.required<FeatureGroupModel>();
}
