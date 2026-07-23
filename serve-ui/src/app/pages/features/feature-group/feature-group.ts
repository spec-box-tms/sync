import { Component, input } from '@angular/core';
import { FeatureGroup as FeatureGroupModel } from '../../../model/feature-group.model';
import { Assert } from '../assert/assert';

@Component({
  selector: 'feature-group',
  templateUrl: 'feature-group.html',
  styleUrl: 'feature-group.scss',
  imports: [Assert],
})
export class FeatureGroup {
  readonly group = input.required<FeatureGroupModel>();
}
