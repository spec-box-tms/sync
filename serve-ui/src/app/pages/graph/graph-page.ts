import { Component, input } from '@angular/core';
import { ProjectSnapshot } from '../../model/project-snapshot.model';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'graph-page',
  templateUrl: 'graph-page.html',
  styleUrl: 'graph-page.scss',
  imports: [JsonPipe],
})
export class GraphPage {
  readonly project = input.required<ProjectSnapshot>();
  readonly featureCode = input.required<string | null>();
}
