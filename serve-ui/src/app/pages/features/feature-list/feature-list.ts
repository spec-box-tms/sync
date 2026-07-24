import { Component, input, OnInit } from '@angular/core';
import { FeatureItem } from '../feature-item/feature-item';

@Component({
  selector: 'feature-list',
  templateUrl: 'feature-list.html',
  styleUrl: 'feature-list.scss',
  imports: [FeatureItem],
})
export class FeatureList {
  readonly featureCodes = input.required<string[]>();
}
