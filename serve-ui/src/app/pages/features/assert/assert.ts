import { Component, effect, input, signal } from '@angular/core';
import { Assertion } from '../../../model/assertion.model';
import { TuiBadge, TuiStatus, TuiInputInline } from '@taiga-ui/kit';
import { Markdown } from '../../../ui/markdown/markdown.component';
import { TuiIcon } from '@taiga-ui/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'assert',
  templateUrl: 'assert.html',
  styleUrl: 'assert.scss',
  imports: [FormsModule, Markdown, TuiBadge, TuiStatus, TuiIcon, TuiInputInline],
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
