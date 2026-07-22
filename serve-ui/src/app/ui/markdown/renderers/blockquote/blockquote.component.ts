/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'blockquote[mdBlockquote]',
  standalone: true,
  templateUrl: './blockquote.component.html',
  styleUrl: './blockquote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTokenDirective],
})
export class BlockquoteComponent extends RendererBase<Tokens.Blockquote> {}
