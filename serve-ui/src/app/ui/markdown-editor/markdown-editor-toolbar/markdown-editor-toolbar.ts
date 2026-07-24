import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiButton, tuiButtonOptionsProvider } from '@taiga-ui/core';
import type { editor } from 'monaco-editor';
import {
  addToLineStart,
  removeAtLineStart,
  surroundSelectionWith,
  toggleLineStart,
  toggleOrderList,
} from './utils';

const TABLE = `
| Заголовок 1 | Заголовок 2 | Заголовок 3 |
|-------------|-------------|-------------|
|             |             |             |
`;

@Component({
  selector: 'markdown-editor-toolbar',
  standalone: true,
  imports: [TuiButton],
  templateUrl: './markdown-editor-toolbar.html',
  styleUrl: './markdown-editor-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    tuiButtonOptionsProvider({
      size: 's',
    }),
  ],
})
export class MarkdownEditorToolbar {
  editor = input.required<editor.IEditor>();

  heading() {
    addToLineStart('# ', this.editor());
  }
  bold() {
    surroundSelectionWith('**', '**', this.editor());
  }
  italic() {
    surroundSelectionWith('_', '_', this.editor());
  }
  strikethrough() {
    surroundSelectionWith('~', '~', this.editor());
  }
  inlineCode() {
    surroundSelectionWith('`', '`', this.editor());
  }
  codeBlock() {
    surroundSelectionWith('\n```\n', '\n```\n', this.editor());
  }
  link() {
    surroundSelectionWith('[', '](https://)', this.editor());
  }
  image() {
    surroundSelectionWith('![', '](https://)', this.editor());
  }
  blockquote() {
    toggleLineStart('> ', this.editor());
  }
  horizontalRuler() {
    addToLineStart('\n---\n', this.editor());
  }
  ul() {
    toggleLineStart('- ', this.editor());
  }
  ol() {
    toggleOrderList(this.editor());
  }
  checkList() {
    toggleLineStart('- [ ] ', this.editor());
  }
  indentIncrease() {
    addToLineStart('  ', this.editor());
  }
  indentDecrease() {
    removeAtLineStart('  ', this.editor());
  }
  table() {
    addToLineStart(TABLE, this.editor());
  }
  undo() {
    const editor = this.editor();
    editor.trigger(null, 'undo', null);
  }
  redo() {
    const editor = this.editor();
    editor.trigger(null, 'redo', null);
  }
}
