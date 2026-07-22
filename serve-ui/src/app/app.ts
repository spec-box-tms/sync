import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { ProjectService } from './core/project.service';
import { FeaturesPage } from "./pages/features/features-page";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot, JsonPipe, FeaturesPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly projectService = inject(ProjectService);

  projectSnapshotResource = this.projectService.projectResource;
}
