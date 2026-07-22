/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiLink } from '@taiga-ui/core';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'a[mdLink]',
  standalone: true,
  imports: [TuiLink, ForTokenDirective],
  templateUrl: './link.component.html',
  styleUrl: './link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [TuiLink],
  host: {
    '[href]': 'href',
  },
})
export class LinkComponent extends RendererBase<Tokens.Link> {
  get href() {
    return this.token().href;
  }
}
