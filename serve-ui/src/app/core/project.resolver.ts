import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { ProjectSnapshot } from '../model/project-snapshot.model';
import { ProjectService } from './project.service';
import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';

export const projectResolver: ResolveFn<ProjectSnapshot> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const projectService = inject(ProjectService);
  return toObservable(projectService.projectResource.value).pipe(
    filter((p) => !!p),
    take(1),
  );
};
