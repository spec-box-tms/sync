/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RendererBase } from '../renderer-base';
import { Tokens } from 'marked';
import { isHtmlResource, resourceUrl } from '../../resource-url';

@Component({
  selector: 'md-image',
  standalone: true,
  templateUrl: './image.component.html',
  styleUrl: './image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageComponent extends RendererBase<Tokens.Image> {
  private readonly sanitizer = inject(DomSanitizer);
  readonly isHtml = computed(() => isHtmlResource(this.token().href));
  // Only HTTP(S) or our encoded file endpoint can reach the sandboxed iframe.
  readonly frameSrc = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.src));

  get src() {
    return resourceUrl(this.token().href);
  }

  get text() {
    return this.token().text;
  }

  get title() {
    return this.token().title ?? '';
  }
}
