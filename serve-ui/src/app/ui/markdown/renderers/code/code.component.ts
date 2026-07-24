/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Tokens } from 'marked';
import { Highlight } from 'ngx-highlightjs';
import { HighlightLineNumbers } from 'ngx-highlightjs/line-numbers';
import { MermaidComponent } from '../mermaid/mermaid.component';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'md-code',
  standalone: true,
  imports: [Highlight, MermaidComponent, HighlightLineNumbers],
  templateUrl: './code.component.html',
  styleUrl: './code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeComponent extends RendererBase<Tokens.Code> {}
