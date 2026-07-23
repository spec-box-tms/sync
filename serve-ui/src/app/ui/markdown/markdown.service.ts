import { Injectable } from '@angular/core';
import { marked, TokensList } from 'marked';
import { internalLinkTokenizer } from './extensions/internal-link';

@Injectable()
export class MarkdownService {
  constructor() {
    marked.use({ extensions: [internalLinkTokenizer] });
  }

  parse(markdown: string): TokensList {
    const tokens = marked.lexer(markdown);
    return tokens;
  }
}
