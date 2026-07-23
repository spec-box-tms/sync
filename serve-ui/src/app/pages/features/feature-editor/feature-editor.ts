import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { API_URL } from '../../../core/api-url.token';
import { Feature } from '../../../model/feature.model';

@Component({
  selector: 'feature-editor',
  templateUrl: 'feature-editor.html',
  styleUrl: 'feature-editor.scss',
})
export class FeatureEditor {
  private readonly apiUrl = inject(API_URL);
  private readonly http = inject(HttpClient);
  private readonly etag = signal<string | null>(null);
  private requestId = 0;

  readonly feature = input.required<Feature | null>();
  private readonly selectedCode = computed(() => this.feature()?.code ?? null);
  readonly yaml = signal('');
  readonly message = signal('');
  readonly ready = signal(false);
  readonly saving = signal(false);

  constructor() {
    effect(() => {
      const code = this.selectedCode();
      if (code) {
        this.yaml.set('');
        this.etag.set(null);
        this.load(code);
      } else {
        this.requestId++;
        this.yaml.set('');
        this.etag.set(null);
        this.ready.set(false);
      }
    });
  }

  load(code = this.selectedCode()) {
    if (!code) {
      return;
    }

    const requestId = ++this.requestId;
    this.message.set('');
    this.ready.set(false);
    this.http.get(this.url(code), { observe: 'response', responseType: 'text' }).subscribe({
      next: (response) => {
        if (this.selectedCode() === code && requestId === this.requestId) {
          this.yaml.set(response.body ?? '');
          this.etag.set(response.headers.get('ETag'));
          this.ready.set(true);
        }
      },
      error: () => {
        if (this.selectedCode() === code && requestId === this.requestId) {
          this.message.set('Не удалось загрузить YAML.');
        }
      },
    });
  }

  save() {
    const code = this.selectedCode();
    const etag = this.etag();
    if (!code || !etag || !this.ready() || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.http
      .put(this.url(code), this.yaml(), {
        headers: {
          'Content-Type': 'application/yaml; charset=utf-8',
          'If-Match': etag,
        },
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          if (this.selectedCode() === code) {
            this.load(code);
          }
        },
        error: (error) => {
          this.saving.set(false);
          if (this.selectedCode() === code) {
            if (error.status === 409) {
              this.ready.set(false);
              this.message.set('YAML изменён. Перезагрузите редактор.');
            } else {
              this.message.set('Не удалось сохранить YAML.');
            }
          }
        },
      });
  }

  setYaml(value: string) {
    if (this.ready() && !this.saving()) {
      this.yaml.set(value);
    }
  }

  private url(code: string) {
    return `${this.apiUrl}/api/features/${encodeURIComponent(code)}/yaml`;
  }
}
