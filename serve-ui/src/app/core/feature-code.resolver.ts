import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from "@angular/router";

export const featureCodeResolver: ResolveFn<string | null> = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  console.log(route);
  return route.queryParams['feature'] ?? null;
};