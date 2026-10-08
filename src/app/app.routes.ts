import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'terre' },
  {
    path: 'terre',
    title: 'GalaxyExplorer · Planète',
    loadComponent: () => import('./features/earth/earth.component').then((m) => m.EarthComponent),
  },
  {
    path: 'talents',
    title: 'GalaxyExplorer · Arbres de talents',
    loadComponent: () => import('./features/tech-tree/tech-tree.component').then((m) => m.TechTreeComponent),
  },
  {
    path: 'population',
    title: 'GalaxyExplorer · Population & Statistiques',
    loadComponent: () => import('./features/stats/stats.component').then((m) => m.StatsComponent),
  },
  {
    path: 'galaxie',
    title: 'GalaxyExplorer · Exploration Galactique',
    loadComponent: () => import('./features/galaxy/galaxy.component').then((m) => m.GalaxyComponent),
  },
  {
    path: 'parametres',
    title: 'GalaxyExplorer · Paramètres',
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'terre' },
];
