import { computed } from '@angular/core';
import { RendererBase } from '../renderer-base';
import { Token } from 'marked';

export abstract class BaseText<T extends Token> extends RendererBase<T> {
  tokens = computed(() => {
    const token = this.token();
    if ('tokens' in token) {
      return token.tokens;
    }
    return undefined;
  });
}
