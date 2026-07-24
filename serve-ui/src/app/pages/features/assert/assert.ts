import { Component, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiItem } from '@taiga-ui/cdk/directives/item';
import { TuiExpand, TuiHint, TuiIcon } from '@taiga-ui/core';
import { TuiBadge, TuiStatus } from '@taiga-ui/kit';
import { Assertion } from '../../../model/assertion.model';
import { Markdown } from '../../../ui/markdown/markdown.component';

@Component({
  selector: 'assert',
  templateUrl: 'assert.html',
  styleUrl: 'assert.scss',
  imports: [FormsModule, Markdown, TuiBadge, TuiStatus, TuiIcon, TuiExpand, TuiItem, TuiHint],
})
export class Assert {
  assertion = input.required<Assertion>();

  expanded = signal(false);

  title = '';
  description?: string;

  constructor() {
    effect(() => {
      const assertion = this.assertion();
      this.title = assertion.title;
      this.description = assertion.description;
    });
  }

  toggleExpanded() {
    this.expanded.update((v) => !v);
  }
}
