import { Component, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatureTree } from '../../../model/feature-tree.model';
import { ProjectSnapshot } from '../../../model/project-snapshot.model';
import { TuiChevron, TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { TuiIcon, TuiInput, tuiItemsHandlersProvider } from '@taiga-ui/core';

@Component({
  selector: 'nav-controls',
  templateUrl: 'nav-controls.html',
  styleUrl: 'nav-controls.scss',
  imports: [FormsModule, TuiChevron, TuiDataListWrapper, TuiSelect, TuiInput],
  providers: [
    tuiItemsHandlersProvider({
      stringify: signal((x: FeatureTree) => x.title),
      identityMatcher: signal((a: FeatureTree, b: FeatureTree) => a.code === b.code),
    }),
  ],
})
export class NavControls {
  readonly projectSnapshot = input.required<ProjectSnapshot>();

  readonly search = model<string>();
  readonly activeTree = model<FeatureTree | null>(null);

  readonly featureCodes = output<string[]>();

  constructor() {
    effect(() => {
      const search = this.search()?.toLowerCase();
      const features = this.projectSnapshot().features.filter((ft) => {
        if (!search) {
          return true;
        }
        return (
          ft.title.toLowerCase().indexOf(search) >= 0 || ft.code.toLowerCase().indexOf(search) >= 0
        );
      });

      features.sort((a, b) => a.title.localeCompare(b.title, 'ru-Ru'));
      const featureCodes = features.map((ft) => ft.code);
      this.featureCodes.emit(featureCodes);
    });
  }
}
