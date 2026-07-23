import { provideTaiga } from '@taiga-ui/core';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { API_URL } from './core/api-url.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTaiga(),
    {
      provide: API_URL,
      useValue: ``,
    },
  ],
};
