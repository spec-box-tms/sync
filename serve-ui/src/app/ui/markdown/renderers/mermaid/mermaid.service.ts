import { Injectable } from '@angular/core';
import type { Mermaid } from 'mermaid';
import { from, map, shareReplay } from 'rxjs';

declare const mermaid: Mermaid;

@Injectable()
export class MermaidService {
  private isLoaded = false;
  private mermaidLoader?: Promise<void>;

  private loadMermaid(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (!this.mermaidLoader) {
      this.mermaidLoader = new Promise<void>((resolve, reject) => {
        const scriptElement = document.createElement('script');
        scriptElement.src = '/assets/mermaid/mermaid.min.js';
        scriptElement.async = true;
        scriptElement.onload = () => {
          this.isLoaded = true;
          resolve();
        };
        scriptElement.onerror = (error) => reject(error);
        document.body.appendChild(scriptElement);
      });
    }
    return this.mermaidLoader;
  }

  private mermaid$ = from(this.loadMermaid()).pipe(
    map(() => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
      });
      return mermaid;
    }),
    shareReplay(1)
  );

  runMermaid(nodes: ArrayLike<HTMLElement>) {
    this.mermaid$.subscribe((mermaid) => {
      mermaid.run({ nodes: nodes });
    });
  }
}
