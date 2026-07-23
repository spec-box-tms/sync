import { NgxMonacoEditorConfig, provideMonacoEditor } from 'ngx-monaco-editor-v2';

const monacoConfig: NgxMonacoEditorConfig = {
  baseUrl: 'assets', // configure base path for monaco editor. Starting with version 8.0.0 it defaults to './assets'. Previous releases default to '/assets'
  defaultOptions: { scrollBeyondLastLine: false }, // pass default options to be used
  requireConfig: { preferScriptTags: true }, // allows to oweride configuration passed to monacos loader
  monacoRequire: (<any>window).monacoRequire, // pass here monacos require function if you loaded monacos loader (loader.js) yourself
};

export const provideMonaco = () => provideMonacoEditor(monacoConfig);
