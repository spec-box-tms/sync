/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'li[mdListItem]',
  standalone: true,
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTokenDirective],
})
export class ListItemComponent extends RendererBase<Tokens.ListItem> {}
