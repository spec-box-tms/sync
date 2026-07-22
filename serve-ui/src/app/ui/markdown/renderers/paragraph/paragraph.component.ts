/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'p[mdParagraph]',
  standalone: true,
  templateUrl: './paragraph.component.html',
  styleUrl: './paragraph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTokenDirective],
})
export class ParagraphComponent extends RendererBase<Tokens.Paragraph> {}
