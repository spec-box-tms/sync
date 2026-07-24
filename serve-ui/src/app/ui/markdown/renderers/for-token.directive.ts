/* eslint-disable @angular-eslint/directive-selector */
import {
  Directive,
  inject,
  InjectionToken,
  Injector,
  Input,
  OnChanges,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { Token, Tokens } from 'marked';
import { GenericRendererComponent } from './generic-renderer/generic-renderer.component';
import { AnyTokenRenderer } from './renderer-base';

export const TOKEN_RENDERERS = new InjectionToken<
  Record<string, Type<AnyTokenRenderer>>
>('TOKEN_RENDERERS');

@Directive({
  selector: '[forToken]',
  standalone: true,
})
export class ForTokenDirective implements OnChanges {
  private readonly injector = inject(Injector);
  private readonly renderers = inject(TOKEN_RENDERERS);

  @Input({ required: true, alias: 'forToken' })
  tokens?: Token[];

  constructor(private viewContainerRef: ViewContainerRef) {}

  ngOnChanges() {
    this.viewContainerRef.clear();
    if (this.tokens) {
      this.render(this.tokens);
    }
  }

  private render(tokens: Token[] | undefined) {
    this.viewContainerRef.clear();
    if (tokens) {
      for (const token of tokens) {
        this.renderToken(token);
      }
    }
  }
  private renderToken(token: Token) {
    const renderer = this.renderers[token.type] ?? GenericRendererComponent;

    if (this.isInlineText(token)) {
      this.viewContainerRef.element.nativeElement.before(token.raw);
    } else {
      const componentRef = this.viewContainerRef.createComponent(renderer, {
        injector: this.injector,
      });
      componentRef.setInput('token', token);
      componentRef.changeDetectorRef.markForCheck();
    }
  }

  private isInlineText(token: Token): token is Tokens.Text {
    return (
      token.type === 'text' &&
      (!('tokens' in token) ||
        token.tokens === undefined ||
        token.tokens.length === 0)
    );
  }
}
