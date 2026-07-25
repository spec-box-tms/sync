import { Component, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeatureTree } from '../../../model/feature-tree.model';
import { ProjectSnapshot } from '../../../model/project-snapshot.model';
import { TuiChevron, TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { TuiIcon, TuiInput, tuiItemsHandlersProvider } from '@taiga-ui/core';
import { Feature } from '../../../model/feature.model';

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
      const features = this.matchFeatures(this.search(), this.projectSnapshot().features);

      features.sort((a, b) => a.title.localeCompare(b.title, 'ru-Ru'));
      const featureCodes = features.map((ft) => ft.code);
      this.featureCodes.emit(featureCodes);
    });
  }

  private matchFeatures(search: string | undefined, features: Feature[]): Feature[] {
    if (!search || !search.trim()) {
      return [...features];
    }

    const terms = search
      .trim()
      .split(/\s+/)
      .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    return features.filter((feature) => {
      const text = [
        feature.code,
        feature.title,
        feature.description,
        ...feature.groups.flatMap((group) => [
          group.title,
          ...group.assertions.flatMap((assertion) => [assertion.title, assertion.description]),
        ]),
      ].join('\n');

      return terms.every((term) => term.test(text));
    });
  }
}
