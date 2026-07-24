import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MarkdownEditor } from '../../../ui/markdown-editor/markdown-editor';
import { TuiNotificationService } from '@taiga-ui/core';
import { CompletionProviderService } from '../completion-provider.service';

@Component({
  selector: 'feature-editor',
  templateUrl: 'feature-editor.html',
  styleUrl: 'feature-editor.scss',
  imports: [MarkdownEditor],
})
export class FeatureEditor {
  protected readonly notifications = inject(TuiNotificationService);
  readonly featureCode = input.required<string>();
  readonly featureYamlResource = httpResource.text(
    () => `/api/features/${this.featureCode()}/yaml`,
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

  readonly hasChanges = computed(() => {
    return this.featureYaml() && this.featureYaml() !== this.editYaml();
  });

  readonly editYaml = linkedSignal(() => {
    const yaml = this.featureYaml();
    if (yaml == null) {
      throw new Error('Yaml should be defined');
    }
    return yaml;
  });

  readonly canClose = output();

  constructor() {
    inject(CompletionProviderService);
  }

  updateYaml(yaml: string) {
    this.editYaml.set(yaml);
  }

  async saveChanges() {
    const currentHash = this.featureYamlHash();
    if (!currentHash) {
      throw new Error('Yaml HASH is undefined');
    }

    const result = await fetch(`/api/features/${this.featureCode()}/yaml`, {
      method: 'PUT',
      body: this.editYaml(),
      headers: {
        'Content-Type': 'application/yaml',
        charset: 'utf-8',
        'If-Match': currentHash,
      },
    });

    if (result.status === 200) {
      this.notifications
        .open('Спецификация успешно сохранена', {
          appearance: 'positive',
        })
        .subscribe();
        this.canClose.emit();
    } else if (result.status === 409) {
      this.notifications
        .open('Невозможно сохранить спецификацию, конфликт изменений', {
          appearance: 'negative',
        })
        .subscribe();
    } else {
      this.notifications
        .open('Ошибка сохранения спецификации', {
          appearance: 'negative',
        })
        .subscribe();
    }
  }
}
