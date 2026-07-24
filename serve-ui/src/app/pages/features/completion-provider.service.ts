import { effect, inject, Service } from '@angular/core';
import { ProjectService } from '../../core/project.service';
import { MarkdownEditorCompletionProviderService } from '../../ui/markdown-editor/markdown-editor-completion-provider.service';

@Service()
export class CompletionProviderService {
  private mdCompletionProviderService = inject(MarkdownEditorCompletionProviderService);
  private projectService = inject(ProjectService);

  constructor() {
    effect(() => {
      if (this.projectService.projectResource.hasValue()) {
        const projectSnapshot = this.projectService.projectResource.value();
        const suggestions = projectSnapshot.features.map((feature) => ({
          label: feature.code,
          description: feature.title,
          insertText: feature.code,
        }));

        this.mdCompletionProviderService.register(
          suggestions,
          ['$'],
          /\s(\$([A-Za-z][A-Za-z\d-]*)?)$/,
        );
      }
    });
  }
}
