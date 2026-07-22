import { Directive, input, InputSignal } from '@angular/core';
import { Token } from 'marked';

export interface AnyTokenRenderer {
  token: InputSignal<unknown>;
}

@Directive()
export abstract class RendererBase<T extends Token> {
  token = input.required<T>();
}
