import { Component, computed, input } from '@angular/core';
import { TuiScrollbar } from '@taiga-ui/core';
import { MarkdownEditor } from '../../../ui/markdown-editor/markdown-editor';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'feature-editor',
  templateUrl: 'feature-editor.html',
  styleUrl: 'feature-editor.scss',
  imports: [MarkdownEditor],
})
export class FeatureEditor {
  readonly featureCode = input.required<string>();
  readonly featureYamlResource = httpResource.text(
    () => `/api/features/${this.featureCode()}/yaml`
  );
  readonly featureYaml = computed(() => {
    if (this.featureYamlResource.hasValue()) {
      return this.featureYamlResource.value();
    }
    return null;
  });
  readonly featureYamlHash = computed(() => {
    if (this.featureYamlResource.hasValue()) {
      return this.featureYamlResource.headers()?.get('ETag') ?? null;
    }
    return null;
  });
}
