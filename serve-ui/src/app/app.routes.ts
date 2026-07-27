import { Routes } from '@angular/router';
import { FeaturesPage } from './pages/features/features-page';
import { GraphPage } from './pages/graph/graph-page';
import { projectResolver } from './core/project.resolver';
import { featureCodeResolver } from './core/feature-code.resolver';

export const routes: Routes = [
  {
    path: '',
    component: FeaturesPage,
  },
  {
    path: 'graph',
    component: GraphPage,
    resolve: {
      project: projectResolver,
      featureCode: featureCodeResolver,
    },
  },
];
