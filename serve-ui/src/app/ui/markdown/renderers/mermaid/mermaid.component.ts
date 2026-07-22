/* eslint-disable @angular-eslint/component-selector */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { MermaidService } from './mermaid.service';

@Component({
  selector: 'md-mermaid',
  standalone: true,
  templateUrl: './mermaid.component.html',
  styleUrl: './mermaid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MermaidComponent implements AfterViewInit {
  private mermaidService = inject(MermaidService);

  code = input.required<string>();

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    const nodes = this.elementRef.nativeElement.querySelectorAll('code');

    if (nodes) {
      this.mermaidService.runMermaid([this.elementRef.nativeElement]);
    }
  }
}
