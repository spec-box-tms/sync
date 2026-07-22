/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'md-heading',
  standalone: true,
  imports: [ForTokenDirective],
  templateUrl: './heading.component.html',
  styleUrl: './heading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadingComponent extends RendererBase<Tokens.Heading> {}
