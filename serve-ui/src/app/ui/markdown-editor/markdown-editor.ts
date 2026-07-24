import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { editor } from 'monaco-editor';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { MarkdownEditorCompletionProviderService } from './markdown-editor-completion-provider.service';
import { MarkdownEditorToolbar } from './markdown-editor-toolbar/markdown-editor-toolbar';

@Component({
  selector: 'markdown-editor',
  standalone: true,
  imports: [MonacoEditorModule, FormsModule, MarkdownEditorToolbar],
  templateUrl: './markdown-editor.html',
  styleUrl: './markdown-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownEditor {
  private completionProviderService = inject(MarkdownEditorCompletionProviderService, {
    optional: true,
  });

  editor = signal<editor.ICodeEditor | null>(null);

  value = input.required<string>();
  valueChange = output<string>();
  editValue = signal<string>('');

  editorOptions = {
    theme: 'vs-dark',
    language: 'yaml',
    minimap: { enabled: false },
    automaticLayout: true,
  };

  constructor() {
    effect(() => {
      const value = this.value();
      untracked(() => this.editValue.set(value));
    });
    effect(() => {
      const editedValue = this.editValue();
      untracked(() => this.valueChange.emit(editedValue));
    });
  }

  initEditor(editor: editor.ICodeEditor) {
    this.editor.set(editor);
    this.completionProviderService?.initialize();
  }
}
