import { Injectable, signal } from '@angular/core';
import { Feature } from '../../model/feature.model';

@Injectable()
export class ActiveFeatureService {
  private readonly activeFeatureSignal = signal<Feature | null>(null);

  readonly activeFeature = this.activeFeatureSignal.asReadonly();

  activate(feature: Feature | null) {
    this.activeFeatureSignal.set(feature);
  }
}
