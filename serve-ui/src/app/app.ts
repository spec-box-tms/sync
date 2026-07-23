import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { ProjectService } from './core/project.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly projectService = inject(ProjectService);

  readonly title = computed(() => {
    if (this.projectService.projectResource.hasValue()) {
      return this.projectService.projectResource.value().project?.title ?? null;
    }
    return null;
  });
}
