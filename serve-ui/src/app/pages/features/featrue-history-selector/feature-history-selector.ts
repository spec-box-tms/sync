import { httpResource } from '@angular/common/http';
import { Component, computed, input, model, signal } from '@angular/core';
import { FeatureHistory } from '../../../model/feature-history.model';
import { FormsModule } from '@angular/forms';
import { TuiChevron, TuiDataListWrapper, TuiSelect, TuiTooltip } from '@taiga-ui/kit';
import { TuiIcon, tuiItemsHandlersProvider } from '@taiga-ui/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'feature-history-selector',
  templateUrl: 'feature-history-selector.html',
  styleUrl: 'feature-history-selector.scss',
  imports: [FormsModule, TuiChevron, TuiDataListWrapper, TuiIcon, TuiSelect, TuiTooltip, DatePipe],
  providers: [
    tuiItemsHandlersProvider({
      stringify: signal((x: FeatureHistory) => x.message),
      identityMatcher: signal((a: FeatureHistory, b: FeatureHistory) => a.commit === b.commit),
    }),
  ],
})
export class FeatureHistorySelector {
  featureCode = input.required<string>();

  featureHistoryResource = httpResource<FeatureHistory[]>(
    () => `/api/features/${this.featureCode()}/history`,
  );

  featureHistory = computed(() => {
    if (this.featureHistoryResource.hasValue()) {
      return this.featureHistoryResource.value();
    }
    return null;
  });

  value = model<string | null>(null);
}
