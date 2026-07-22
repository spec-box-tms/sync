import { Component, input, signal } from '@angular/core';
import { Assertion } from '../../../model/assertion.model';
import { TuiBadge, TuiStatus } from '@taiga-ui/kit';
import { Markdown } from '../../../ui/markdown/markdown.component';
import { TuiIcon } from '@taiga-ui/core';

@Component({
  selector: 'assert',
  templateUrl: 'assert.html',
  styleUrl: 'assert.scss',
  imports: [Markdown, TuiBadge, TuiStatus, TuiIcon],
})
export class Assert {
  assertion = input.required<Assertion>();

  expanded = signal(false);

  toggleExpanded() {
    this.expanded.update((v) => !v);
  }
}
