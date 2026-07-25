import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiButton, TuiIcon, TuiRoot } from '@taiga-ui/core';
import { ProjectService } from './core/project.service';
import { Diagnostics } from './ui/diagnostics/diagnostics';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, TuiButton, Diagnostics],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly projectService = inject(ProjectService);

  readonly theme = signal<'auto' | 'dark' | 'light'>(this.savedTheme());
  readonly themeButtonIcon = computed(() => {
    const theme = this.theme();
    if (theme === 'dark') {
      return '@tui.moon';
    }
    if (theme === 'light') {
      return '@tui.sun';
    }
    return '@tui.sun-moon';
  });

  readonly title = computed(() => {
    if (this.projectService.projectResource.hasValue()) {
      return this.projectService.projectResource.value().project?.title ?? null;
    }
    return null;
  });

  toggleTheme() {
    const theme = this.theme();
    const nextTheme = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto';

    this.theme.set(nextTheme);
    localStorage.setItem('spec-box-theme', nextTheme);
  }

  private savedTheme(): 'auto' | 'dark' | 'light' {
    const theme = localStorage.getItem('spec-box-theme');
    return theme === 'dark' || theme === 'light' ? theme : 'auto';
  }
}
