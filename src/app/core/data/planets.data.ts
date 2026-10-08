import { PlanetDef, PlanetId } from '../models/game.models';

export const PLANETS: readonly PlanetDef[] = [
  {
    id: 'earth', name: 'Terre', icon: '🌍',
    description: 'Le berceau de l’humanité. Équilibrée entre terres, forêts et océans.',
    terrain: { land: 40, forest: 25, ocean: 25 }, bonus: [], colors: ['#4fa3ff', '#14532d'],
  },
  {
    id: 'proxima', name: 'Proxima Centauri b', icon: '🔴',
    description: 'Monde rocheux baigné par une naine rouge éruptive.',
    terrain: { land: 55, forest: 10, ocean: 15 },
    bonus: [{ kind: 'production', resource: 'energy', value: 0.5 }], colors: ['#f87171', '#7f1d1d'],
  },
  {
    id: 'trappist', name: 'TRAPPIST-1e', icon: '🔵',
    description: 'Planète-océan aux archipels luxuriants.',
    terrain: { land: 25, forest: 15, ocean: 50 },
    bonus: [{ kind: 'production', resource: 'water', value: 0.5 }, { kind: 'production', resource: 'food', value: 0.25 }],
    colors: ['#38bdf8', '#1e3a8a'],
  },
  {
    id: 'kepler442', name: 'Kepler-442b', icon: '🟢',
    description: 'Super-Terre recouverte de forêts géantes.',
    terrain: { land: 40, forest: 45, ocean: 20 },
    bonus: [{ kind: 'production', resource: 'wood', value: 0.75 }], colors: ['#4ade80', '#14532d'],
  },
  {
    id: 'gliese', name: 'Gliese 667 Cc', icon: '🟠',
    description: 'Vastes plaines tempérées idéales pour bâtir.',
    terrain: { land: 50, forest: 25, ocean: 25 },
    bonus: [{ kind: 'housing', value: 0.25 }], colors: ['#fb923c', '#7c2d12'],
  },
  {
    id: 'kepler186', name: 'Kepler-186f', icon: '🟣',
    description: 'Ruines d’une civilisation disparue à étudier.',
    terrain: { land: 40, forest: 25, ocean: 25 },
    bonus: [{ kind: 'production', resource: 'research', value: 0.75 }], colors: ['#c084fc', '#3b0764'],
  },
  {
    id: 'hd40307', name: 'HD 40307 g', icon: '🟡',
    description: 'Super-Terre immense à la gravité clémente.',
    terrain: { land: 70, forest: 35, ocean: 35 },
    bonus: [{ kind: 'birthRate', value: 0.5 }, { kind: 'happiness', value: 0.05 }], colors: ['#facc15', '#713f12'],
  },
];

export const PLANETS_BY_ID = Object.fromEntries(PLANETS.map((p) => [p.id, p])) as Record<PlanetId, PlanetDef>;
