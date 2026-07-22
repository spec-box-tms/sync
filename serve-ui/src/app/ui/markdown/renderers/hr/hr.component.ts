/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RendererBase } from "../renderer-base";
import { Tokens } from "marked";

@Component({
  selector: 'hr[mdHr]',
  standalone: true,
  templateUrl: './hr.component.html',
  styleUrl: './hr.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrComponent extends RendererBase<Tokens.Hr> { }
