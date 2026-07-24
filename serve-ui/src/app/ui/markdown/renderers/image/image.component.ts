/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RendererBase } from '../renderer-base';
import { Tokens } from 'marked';

@Component({
  selector: 'img[mdImage]',
  standalone: true,
  templateUrl: './image.component.html',
  styleUrl: './image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[src]': 'src',
    '[title]': 'title',
    '[alt]': 'text'
  },
})
export class ImageComponent extends RendererBase<Tokens.Image> {
  get src() {
    return this.token().href;
  }

  get text() {
    return this.token().text;
  }

  get title() {
    return this.token().title ?? '';
  }
}
