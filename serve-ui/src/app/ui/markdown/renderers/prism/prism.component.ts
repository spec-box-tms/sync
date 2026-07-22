/* eslint-disable @angular-eslint/component-selector */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { PrismService } from './prism.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'pre[mdPrism]',
  standalone: true,
  imports: [TuiButton, TuiIcon],
  templateUrl: './prism.component.html',
  styleUrl: './prism.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrismComponent implements AfterViewInit {
  private clipboard = inject(Clipboard);
  private prismService = inject(PrismService);
  private elementRef = inject(ElementRef<HTMLElement>);
  code = input.required<string>();
  language = input.required<string | undefined>();

  languageClass = computed(() => `language-${this.language() ?? 'none'}`);

  ngAfterViewInit() {
    this.prismService.highlightElement(this.elementRef.nativeElement);
  }

  copy() {
    this.clipboard.copy(this.code());
    console.log('info', 'Значение скопировано в буфер обмена');
  }
}
