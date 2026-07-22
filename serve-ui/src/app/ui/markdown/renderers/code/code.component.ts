/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RendererBase } from '../renderer-base';
import { Tokens } from 'marked';
import { PrismComponent } from '../prism/prism.component';
import { MermaidComponent } from "../mermaid/mermaid.component";

@Component({
  selector: 'md-code',
  standalone: true,
  imports: [PrismComponent, MermaidComponent],
  templateUrl: './code.component.html',
  styleUrl: './code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeComponent extends RendererBase<Tokens.Code> {}
