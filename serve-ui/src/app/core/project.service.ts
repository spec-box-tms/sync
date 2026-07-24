import { httpResource } from '@angular/common/http';
import { inject, Injectable, Service } from '@angular/core';
import { API_URL } from './api-url.token';
import { ProjectSnapshot } from '../model/project-snapshot.model';

@Service()
export class ProjectService {
  private readonly apiUrl = inject(API_URL);
  private readonly events = new EventSource(`${this.apiUrl}/api/events`);
  readonly projectResource = httpResource<ProjectSnapshot>(() => `${this.apiUrl}/api/project`);

  constructor() {
    this.events.addEventListener('project-updated', () => this.projectResource.reload());
  }
}
