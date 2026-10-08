import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Routage par hash : le jeu fonctionne sur n'importe quel hébergement statique (GitHub Pages…).
    provideRouter(routes, withHashLocation()),
  ],
};
