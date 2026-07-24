/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { BaseText } from './base-text';
import { ForTokenDirective } from '../for-token.directive';

@Component({
  selector: 'i[mdItalic]',
  standalone: true,
  templateUrl: './text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTokenDirective],
})
export class ItalicComponent extends BaseText<Tokens.Em> {}
