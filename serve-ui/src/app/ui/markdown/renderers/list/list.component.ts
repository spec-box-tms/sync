/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'ol[mdList]',
  standalone: true,
  imports: [ForTokenDirective],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.start]': 'start',
  },
})
export class ListComponent extends RendererBase<Tokens.List> {
  get start() {
    return this.token().start;
  }
}
