import { Assignments, Resources } from './models/game.models';

// Constantes d'équilibrage et de fonctionnement. Ajustez-les ici pour rééquilibrer le jeu.

export const TICK_MS = 1000;
export const AUTOSAVE_EVERY_TICKS = 10;
export const SAVE_KEY = 'galaxyexplorer.save.v1';
/** Clé utilisée quand le projet s'appelait OneLife : relue une fois pour ne pas perdre la partie. */
export const LEGACY_SAVE_KEY = 'onelife.save.v1';
export const SAVE_VERSION = 1;

/** Progression hors-ligne : plafond et nombre maximal de pas de simulation. */
export const MAX_OFFLINE_SECONDS = 8 * 3600;
export const MAX_CATCH_UP_STEPS = 2000;
/** Au-delà de cet écart entre deux ticks (onglet en veille), on simule par pas. */
export const CATCH_UP_THRESHOLD_SECONDS = 5;

export const START_POPULATION = 2;
export const MIN_POPULATION = 2;
/** Abris naturels (grottes) disponibles sans aucune habitation. */
export const BASE_HOUSING = 5;

export const FOOD_PER_CAPITA = 0.02;
export const WATER_PER_CAPITA = 0.02;
export const BIRTH_RATE = 0.03;
export const IMMIGRATION = 0.05;
export const STARVATION_RATE = 0.03;

export const BASE_HAPPINESS = 0.35;
export const COMFORT_HAPPINESS = 0.5;
export const DEPRIVATION_HAPPINESS_PENALTY = 0.3;

/** Nombre d'habitants pouvant récolter par emplacement de terrain (au-delà, ils ne produisent plus). */
export const GATHERERS_PER_TILE = 10;
/** Les 2 premiers habitants : un à la cueillette, un à l'eau. */
export const DEFAULT_ASSIGNMENTS: Assignments = { food: 1, water: 1, wood: 0, research: 0 };
/** Répartition des colons à l'arrivée sur une nouvelle planète. */
export const COLONY_START_ASSIGNMENTS: Assignments = { food: 3, water: 3, wood: 3, research: 1 };

export const GALAXY_POPULATION_THRESHOLD = 1_000_000;
/** Bonus de production globale par colonie fondée. */
export const COLONY_GLOBAL_BONUS = 0.1;

/** Stock minimal : quelques secondes de survie, le joueur doit récolter à la main avant que l'automatisation ne prenne le relais. */
export const START_RESOURCES: Resources = { food: 3, wood: 0, water: 3, energy: 0, research: 0 };
export const COLONY_START_POPULATION = 10;
export const COLONY_START_RESOURCES: Resources = { food: 150, wood: 100, water: 150, energy: 0, research: 25 };

export const ARK_BASE_COST: Resources = {
  food: 2_000_000,
  wood: 5_000_000,
  water: 2_000_000,
  energy: 5_000_000,
  research: 5_000_000,
};
export const ARK_COST_GROWTH = 2.5;

/** Commerce galactique : un départ de la flotte toutes les TRADE_TRIP_SECONDS. */
export const TRADE_TRIP_SECONDS = 60;
/** Vaisseaux pouvant voler en même temps sans le talent Logistique de flotte. */
export const BASE_FLEET_SIZE = 1;

/** Un seul bâtiment en construction à la fois. */
export const CONSTRUCTION_QUEUE_MAX = 1;

/** Durée d'une recherche selon son coût : ~18 s à 10 pts, ~1 min 30 à 1 500 pts, ~7 min à 10 M pts. */
export function researchDuration(cost: number): number {
  const magnitude = Math.log10(Math.max(1, cost));
  return Math.round(10 + 8 * magnitude * magnitude);
}

export const POPULATION_MILESTONES = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];
