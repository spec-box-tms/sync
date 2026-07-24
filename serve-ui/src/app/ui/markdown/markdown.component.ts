import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { MarkdownService } from './markdown.service';
import { ForTokenDirective } from './renderers/for-token.directive';
import { provideMarkdown } from './renderers/provide-markdown';

@Component({
  selector: 'markdown',
  standalone: true,
  imports: [ForTokenDirective],
  templateUrl: './markdown.component.html',
  styleUrl: './markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    ...provideMarkdown()
  ]
})
export class Markdown {
  private myMarkdownService = inject(MarkdownService);

  value = input.required<string>();

  tokens = computed(() => this.myMarkdownService.parse(this.value()));
}
