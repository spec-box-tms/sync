/* eslint-disable @angular-eslint/component-selector */
import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Token } from 'marked';
import { RendererBase } from '../renderer-base';

@Component({
  selector: 'md-generic-renderer',
  standalone: true,
  templateUrl: './generic-renderer.component.html',
  styleUrl: './generic-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericRendererComponent extends RendererBase<Token> {
  private sanitizer = inject(DomSanitizer);

  @HostBinding('innerHtml')
  get htmlContent() {
    return this.sanitizer.bypassSecurityTrustHtml(this.token().raw);
  }
}
