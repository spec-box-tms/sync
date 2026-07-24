import { Injectable } from '@angular/core';
import type {
  editor,
  IDisposable,
  IPosition,
  IRange,
  languages,
} from 'monaco-editor';
import { MdSuggestion } from './md-suggestion.model';

declare const monaco: typeof import('monaco-editor');

@Injectable({
  providedIn: 'root',
})
export class MarkdownEditorCompletionProviderService {
  private existingProvider?: IDisposable;
  private completionProvider?: languages.CompletionItemProvider;

  register(
    suggestions: MdSuggestion[],
    triggerCharacters: string[],
    matchRegex: RegExp
  ) {
    this.completionProvider = this.mapCompletionProvider(
      suggestions,
      triggerCharacters,
      matchRegex
    );
    if (this.existingProvider) {
      this.initialize();
    }
  }

  initialize() {
    if (this.existingProvider) {
      this.existingProvider.dispose();
    }
    if (this.completionProvider) {
      this.existingProvider = monaco.languages.registerCompletionItemProvider(
        'yaml',
        this.completionProvider
      );
    }
  }

  private mapCompletionProvider(
    suggestionDescriptions: MdSuggestion[],
    triggerCharacters: string[],
    matchRegex: RegExp
  ): languages.CompletionItemProvider {
    return {
      triggerCharacters,
      provideCompletionItems: function (
        model: editor.ITextModel,
        position: IPosition
      ): languages.ProviderResult<languages.CompletionList> {
        const { column, lineNumber } = position;

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const match = textUntilPosition.match(matchRegex);

        if (!match) {
          return { suggestions: [] };
        }
        const matchValue = match[1];
        const found = matchValue.slice(1);

        const range: IRange = {
          startColumn: column - found.length,
          endColumn: column,
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
        };

        const suggestions = suggestionDescriptions
          .filter((suggestion) => suggestion.label.startsWith(found))
          .map<languages.CompletionItem>(
            ({ label, description, insertText }) => ({
              label,
              kind: monaco.languages.CompletionItemKind.Reference,
              insertText: insertText ?? label,
              detail: description,
              range,
            })
          );

        return {
          suggestions,
        };
      },
    };
  }
}
