import { Clipboard } from '@angular/cdk/clipboard';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiItem } from '@taiga-ui/cdk/directives/item';
import { TuiButton, TuiExpand, TuiHint, TuiIcon } from '@taiga-ui/core';
import { TuiBadge, TuiStatus } from '@taiga-ui/kit';
import { Assertion } from '../../../model/assertion.model';
import { FeatureGroup } from '../../../model/feature-group.model';
import { Feature } from '../../../model/feature.model';
import { Markdown } from '../../../ui/markdown/markdown.component';
@Component({
  selector: 'assert',
  templateUrl: 'assert.html',
  styleUrl: 'assert.scss',
  imports: [
    FormsModule,
    Markdown,
    TuiBadge,
    TuiStatus,
    TuiIcon,
    TuiButton,
    TuiExpand,
    TuiItem,
    TuiHint,
  ],
})
export class Assert {
  private readonly clipboardService = inject(Clipboard);

  feature = input.required<Feature>();
  group = input.required<FeatureGroup>();
  assertion = input.required<Assertion>();

  expanded = signal(false);

  title = computed(() => this.assertion().title);
  description = computed(() => this.assertion().description);
  isAutomated = computed(() => this.assertion().isAutomated);
  path = computed(() => `$${this.feature().code} / ${this.group().title} / ${this.title()}`);

  toggleExpanded() {
    this.expanded.update((v) => !v);
  }
  copyPath() {
    this.clipboardService.copy(this.path());
  }
}
