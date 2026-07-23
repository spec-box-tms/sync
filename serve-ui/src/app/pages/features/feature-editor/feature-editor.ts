import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
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

  readonly feature = input.required<Feature | null>();
  readonly yaml = signal('');
  readonly message = signal('');

  constructor() {
    effect(() => {
      const code = this.feature()?.code;
      if (code) {
        this.load(code);
      }
    });
  }

  load(code = this.feature()?.code) {
    if (!code) {
      return;
    }

    this.message.set('');
    this.http.get(this.url(code), { observe: 'response', responseType: 'text' }).subscribe({
      next: (response) => {
        if (this.feature()?.code === code) {
          this.yaml.set(response.body ?? '');
          this.etag.set(response.headers.get('ETag'));
        }
      },
      error: () => this.message.set('Не удалось загрузить YAML.'),
    });
  }

  save() {
    const code = this.feature()?.code;
    if (!code) {
      return;
    }

    this.http
      .put(this.url(code), this.yaml(), {
        headers: {
          'Content-Type': 'application/yaml; charset=utf-8',
          'If-Match': this.etag() ?? '',
        },
      })
      .subscribe({
        next: () => this.message.set('Сохранено.'),
        error: (error) =>
          this.message.set(error.status === 409 ? 'YAML изменён. Перезагрузите редактор.' : 'Не удалось сохранить YAML.'),
      });
  }

  private url(code: string) {
    return `${this.apiUrl}/api/features/${encodeURIComponent(code)}/yaml`;
  }
}
