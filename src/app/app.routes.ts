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
    path: 'commerce',
    title: 'GalaxyExplorer · Commerce galactique',
    loadComponent: () => import('./features/trade/trade.component').then((m) => m.TradeComponent),
  },
  {
    path: 'chantier-spatial',
    title: 'GalaxyExplorer · Chantier spatial',
    loadComponent: () => import('./features/shipyard/shipyard.component').then((m) => m.ShipyardComponent),
  },
  {
    path: 'parametres',
    title: 'GalaxyExplorer · Paramètres',
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'terre' },
];
