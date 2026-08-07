import { httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { API_URL } from './api-url.token';
import { ProjectSnapshot } from '../model/project-snapshot.model';
import { Feature } from '../model/feature.model';
import { FeatureTreeNode } from '../model/feature-tree.model';

export interface ServeOptions {
  readOnly: boolean;
}

@Service()
export class ProjectService {
  private readonly apiUrl = inject(API_URL);
  private readonly events = new EventSource(`${this.apiUrl}/api/events`);
  readonly optionsResource = httpResource<ServeOptions>(() => `${this.apiUrl}/api/options`);
  readonly readOnly = computed(() =>
    this.optionsResource.hasValue() ? this.optionsResource.value().readOnly : true,
  );
  readonly projectResource = httpResource<ProjectSnapshot>(() => `${this.apiUrl}/api/project`, {
    parse: (value) => this.processTreeGitStatus(value as ProjectSnapshot),
  });

  constructor() {
    this.events.addEventListener('project-updated', () => this.projectResource.reload());
  }

  private processTreeGitStatus(project: ProjectSnapshot): ProjectSnapshot {
    const featuresMap = new Map<string, Feature>(project.features.map((f) => [f.code, f]));

    const processNode = (node: FeatureTreeNode): FeatureTreeNode['gitStatus'] => {
      const statuses = [
        ...node.features.map((code) => featuresMap.get(code)?.gitStatus),
        ...node.children.map(processNode),
      ];
      node.gitStatus = statuses.includes('untracked')
        ? 'untracked'
        : statuses.includes('modified')
          ? 'modified'
          : undefined;
      return node.gitStatus;
    }

    project.trees.forEach(({ root }) => processNode(root));
    return project;
  }
}
