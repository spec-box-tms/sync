import { Injectable } from '@angular/core';
import { highlightAllUnder, plugins } from 'prismjs';
import 'prismjs/plugins/autoloader/prism-autoloader';

@Injectable({
  providedIn: 'root'
})
export class PrismService {
  constructor() {
    plugins['autoloader'].languages_path = '/assets/prismjs/components/';
  }

  highlightElement(element: HTMLElement) {
    highlightAllUnder(element);
  }
}
