import type { editor, IRange } from 'monaco-editor';

export const nullCallback = () => null;

function processRange(
  before: string,
  after: string,
  range: IRange,
  model: editor.ITextModel
) {
  const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
  const valueAtRange = model.getValueInRange(range);
  const revert =
    valueAtRange.startsWith(before) && valueAtRange.endsWith(after);
  const beforeLen = revert ? before.length : 0;
  const afterLen = revert ? after.length : 0;
  const startRange = {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn: startColumn + beforeLen,
  };
  const endRange = {
    startLineNumber: endLineNumber,
    startColumn: endColumn - afterLen,
    endLineNumber,
    endColumn,
  };
  const operationStart = { range: startRange, text: revert ? '' : before };
  const operationEnd = { range: endRange, text: revert ? '' : after };
  model.pushEditOperations([], [operationStart, operationEnd], nullCallback);
}

export function surroundSelectionWith(
  before: string,
  after: string,
  editor: editor.IEditor
) {
  let model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) {
    return;
  }
  model = model as editor.ITextModel;
  const beforeLen = before.length;
  const afterLen = after.length;
  if (selection.isEmpty()) {
    const wordAtPosition = model.getWordAtPosition(selection.getPosition());
    if (!wordAtPosition) {
      const range = selection;
      const operation = { range, text: `${before}${after}` };
      model.pushEditOperations([selection], [operation], nullCallback);
    } else {
      const { startLineNumber, endLineNumber } = selection;
      const { startColumn, endColumn } = wordAtPosition;

      const extendedRange = {
        startLineNumber,
        endLineNumber,
        startColumn: startColumn - beforeLen,
        endColumn: endColumn + afterLen,
      };
      const extendWord = model.getValueInRange(extendedRange);
      if (extendWord.startsWith(before) && extendWord.endsWith(after)) {
        processRange(before, after, extendedRange, model);
      } else {
        const range = {
          startLineNumber,
          endLineNumber,
          startColumn,
          endColumn,
        };
        processRange(before, after, range, model);
      }
    }
  } else {
    processRange(before, after, selection, model);
  }
}

export function addToLineStart(text: string, editor: editor.IEditor) {
  let model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) {
    return;
  }
  model = model as editor.ITextModel;
  const { startLineNumber, endLineNumber } = selection;

  const operations = new Array<editor.IIdentifiedSingleEditOperation>();
  for (let i = startLineNumber; i <= endLineNumber; i++) {
    const range = {
      startLineNumber: i,
      endLineNumber: i,
      startColumn: 1,
      endColumn: 1,
    };
    operations.push({ range, text });
  }

  model.pushEditOperations([], operations, nullCallback);
}

export function removeAtLineStart(text: string, editor: editor.IEditor) {
  let model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) {
    return;
  }
  model = model as editor.ITextModel;
  const { startLineNumber, endLineNumber } = selection;

  const operations = new Array<editor.IIdentifiedSingleEditOperation>();
  for (let i = startLineNumber; i <= endLineNumber; i++) {
    const range = {
      startLineNumber: i,
      endLineNumber: i,
      startColumn: 1,
      endColumn: 1 + text.length,
    };
    const textAtLineStart = model.getValueInRange(range);
    if (textAtLineStart === text) {
      operations.push({ range, text: '' });
    }
  }

  model.pushEditOperations([], operations, nullCallback);
}

export function toggleLineStart(text: string, editor: editor.IEditor) {
  let model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) {
    return;
  }
  model = model as editor.ITextModel;
  const { startLineNumber, endLineNumber } = selection;
  const textLen = text.length;

  let revert = false;

  const operations = new Array<editor.IIdentifiedSingleEditOperation>();
  for (let i = startLineNumber; i <= endLineNumber; i++) {
    const range = {
      startLineNumber: i,
      endLineNumber: i,
      startColumn: 1,
      endColumn: 1 + textLen,
    };
    const textAtLineStart = model.getValueInRange(range);
    if (textAtLineStart === text) {
      revert = true;
      operations.push({ range, text: '' });
    }
  }

  if (!revert) {
    for (let i = startLineNumber; i <= endLineNumber; i++) {
      const range = {
        startLineNumber: i,
        endLineNumber: i,
        startColumn: 1,
        endColumn: 1,
      };
      operations.push({ range, text });
    }
  }

  model.pushEditOperations([], operations, nullCallback);
}

export function toggleOrderList(editor: editor.IEditor) {
  let model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) {
    return;
  }
  model = model as editor.ITextModel;
  const { startLineNumber, endLineNumber } = selection;

  let revert = false;

  const operations = new Array<editor.IIdentifiedSingleEditOperation>();
  for (let i = startLineNumber; i <= endLineNumber; i++) {
    const range = {
      startLineNumber: i,
      endLineNumber: i,
      startColumn: 1,
      endColumn: 20,
    };
    const textAtLineStart = model.getValueInRange(range);
    const match = /^(\s*)(\d+\.\s+)/g.exec(textAtLineStart);
    if (match) {
      console.log(match);
      revert = true;
      range.startColumn = 1 + match[1].length;
      range.endColumn = range.startColumn + match[2].length;
      operations.push({ range, text: '' });
    }
  }

  if (!revert) {
    let o = 1;
    for (let i = startLineNumber; i <= endLineNumber; i++) {
      const range = {
        startLineNumber: i,
        endLineNumber: i,
        startColumn: 1,
        endColumn: 20,
      };
      const textAtLineStart = model.getValueInRange(range);
      const match = /^(\s*)/g.exec(textAtLineStart);
      if (match) {
        range.startColumn = 1 + match[1].length;
      }
      range.endColumn = range.startColumn;

      operations.push({ range, text: `${o}. ` });
      o++;
    }
  }

  model.pushEditOperations([], operations, nullCallback);
}
