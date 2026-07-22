/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  TuiTable,
  TuiTableSortable,
  TuiTableSortBy,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import { Tokens } from 'marked';
import { ForTokenDirective } from '../for-token.directive';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'md-table',
  standalone: true,
  imports: [ForTokenDirective, TuiTable, TuiTableSortPipe, TuiTableSortable, TuiTableSortBy],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableComponent extends RendererBase<Tokens.Table> {
  columns = computed(() => {
    const token = this.token();
    return token.header.map((cell) => cell.text);
  });

  columnTokens = computed(() => {
    return this.token().header;
  });

  rows = computed(() => {
    return this.token().rows;
  });
}
