/* eslint-disable @angular-eslint/component-selector */
import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Tokens } from 'marked';
import { RendererBase } from '../renderer-base';
import { TuiCopy } from '@taiga-ui/kit';
@Component({
  selector: 'span[mdInlineCode]',
  standalone: true,
  templateUrl: './inline-code.component.html',
  styleUrl: './inline-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TuiCopy],
  host: {
    '(click)': 'copyToClipboard()',
  },
})
export class InlineCodeComponent extends RendererBase<Tokens.Codespan> {
  private readonly clipboard = inject(Clipboard);

  text = computed(() => this.token().raw.slice(1, -1));

  copyToClipboard() {
    console.log('info', 'Значение скопировано в буфер обмена');
    this.clipboard.copy(this.text());
  }
}
