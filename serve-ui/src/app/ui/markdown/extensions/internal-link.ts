import { TokenizerExtension, TokenizerThis, Tokens } from 'marked';

export interface InternalLinkToken extends Tokens.Generic {
  identifier: string;
}

export const internalLinkTokenizer: TokenizerExtension = {
  name: 'internalLink',
  level: 'inline',
  start(src) {
    return src.match(/\$/)?.index;
  },
  tokenizer(this: TokenizerThis, src: string): InternalLinkToken | undefined {
    const match = /^(\$[A-Za-z][A-Za-z0-9-_]*)/g.exec(src);
    if (match) {
      return {
        type: 'internalLink',
        raw: match[0],
        identifier: match[1],
      };
    }
    return undefined;
  },
};
