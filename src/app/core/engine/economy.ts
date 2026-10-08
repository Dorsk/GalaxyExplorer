import { BUILDINGS } from '../data/buildings.data';
import { GATHER_TASKS, GATHER_TASK_IDS } from '../data/gathering.data';
import { PLANETS_BY_ID } from '../data/planets.data';
import { RESOURCE_IDS, TERRAIN_IDS, emptyResources, resourceEntries } from '../data/resources.data';
import {
  ARK_BASE_COST,
  ARK_COST_GROWTH,
  BASE_HAPPINESS,
  BASE_HOUSING,
  BIRTH_RATE,
  COMFORT_HAPPINESS,
  DEPRIVATION_HAPPINESS_PENALTY,
  FOOD_PER_CAPITA,
  GATHERERS_PER_TILE,
  IMMIGRATION,
  MIN_POPULATION,
  STARVATION_RATE,
  WATER_PER_CAPITA,
} from '../game.config';
import {
  Assignments,
  BuildingCounts,
  BuildingDef,
  GatherTaskId,
  PlanetId,
  ResourceAmounts,
  Resources,
  TerrainId,
} from '../models/game.models';
import { Modifiers } from './modifiers';

/** Fonctions pures : aucune dépendance Angular, faciles à tester et réutilisées par l'UI et la boucle de jeu. */

export interface GameSnapshot {
  population: number;
  /** Habitants effectivement affectés à chaque tâche de récolte (voir effectiveGatherers). */
  gatherers: Assignments;
  resources: Resources;
  buildings: BuildingCounts;
  /** Bâtiments en construction : ils réservent déjà leur emplacement mais ne produisent pas encore. */
  pending: BuildingCounts;
  planet: PlanetId;
}

export interface SpaceUsage {
  used: number;
  total: number;
}

export interface GatherInfo {
  assigned: number;
  /** Nombre maximal d'habitants utiles sur cette tâche (limité par le terrain). */
  cap: number;
  working: number;
  /** Production par seconde de cette tâche, bonus compris. */
  rate: number;
}

export interface Economy {
  space: Record<TerrainId, SpaceUsage>;
  maxPopulation: number;
  gathering: Record<GatherTaskId, GatherInfo>;
  gatherersTotal: number;
  /** Habitants employés par les bâtiments (servis en priorité). */
  buildingWorkers: number;
  /** Habitants libres après les emplois des bâtiments, à répartir entre les tâches de récolte. */
  freePopulation: number;
  /** Habitants libres sans aucune tâche. */
  idle: number;
  jobs: number;
  /** Part des emplois des bâtiments pourvus (0–1). */
  workforce: number;
  comfort: number;
  comfortCoverage: number;
  happiness: number;
  productivity: number;
  /** Part de la demande énergétique satisfaite (0–1). */
  energyRatio: number;
  production: Resources;
  consumption: Resources;
  net: Resources;
  /** Variation de population par seconde. */
  populationGrowth: number;
  starving: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function buildingCost(def: BuildingDef, owned: number): ResourceAmounts {
  const factor = Math.pow(def.costGrowth, owned);
  const cost: ResourceAmounts = {};
  for (const [res, amount] of resourceEntries(def.baseCost)) cost[res] = Math.ceil(amount * factor);
  return cost;
}

export function arkCost(colonies: number): ResourceAmounts {
  const factor = Math.pow(ARK_COST_GROWTH, colonies);
  const cost: ResourceAmounts = {};
  for (const [res, amount] of resourceEntries(ARK_BASE_COST)) cost[res] = Math.ceil(amount * factor);
  return cost;
}

export function totalJobs(buildings: BuildingCounts): number {
  return BUILDINGS.reduce((sum, b) => sum + (b.workers ?? 0) * (buildings[b.id] ?? 0), 0);
}

/** Habitants restant libres une fois les emplois des bâtiments pourvus. */
export function freePopulation(population: number, buildings: BuildingCounts): number {
  const pop = Math.max(0, Math.floor(population));
  return pop - Math.min(pop, totalJobs(buildings));
}

/**
 * Limite la répartition du joueur aux habitants libres. S'ils ne suffisent pas,
 * les tâches les moins prioritaires (fin de GATHER_TASK_IDS) perdent leurs habitants en premier.
 */
export function effectiveGatherers(values: Assignments, freePopulation: number): Assignments {
  let remaining = Math.max(0, Math.floor(freePopulation));
  const result: Assignments = { food: 0, water: 0, wood: 0, research: 0 };
  for (const id of GATHER_TASK_IDS) {
    const n = Math.min(remaining, Math.max(0, Math.floor(values[id])));
    result[id] = n;
    remaining -= n;
  }
  return result;
}

export function computeEconomy(s: GameSnapshot, mods: Modifiers): Economy {
  const planet = PLANETS_BY_ID[s.planet];
  const pop = s.population;

  const space = {} as Record<TerrainId, SpaceUsage>;
  for (const t of TERRAIN_IDS) space[t] = { used: 0, total: Math.floor(planet.terrain[t] * mods.space[t]) };

  let housing = 0;
  let jobs = 0;
  let energyDemand = 0;
  let energySupply = 0;
  for (const b of BUILDINGS) {
    space[b.terrain].used += b.size * (s.pending[b.id] ?? 0);
    const n = s.buildings[b.id] ?? 0;
    if (n <= 0) continue;
    space[b.terrain].used += b.size * n;
    housing += (b.housing ?? 0) * n;
    jobs += (b.workers ?? 0) * n;
    energyDemand += (b.consumes?.energy ?? 0) * n;
    energySupply += (b.produces?.energy ?? 0) * n;
  }

  const maxPopulation = Math.floor(BASE_HOUSING + housing * mods.housing);
  // Les bâtiments embauchent d'abord ; la récolte se partage les habitants restants.
  const buildingWorkers = Math.min(Math.floor(pop), jobs);
  const freePopulation = Math.floor(pop) - buildingWorkers;
  const workforce = jobs > 0 ? buildingWorkers / jobs : 1;
  const gatherersTotal = GATHER_TASK_IDS.reduce((sum, id) => sum + s.gatherers[id], 0);
  const idle = Math.max(0, freePopulation - gatherersTotal);

  // L'énergie ne dépend que de la main-d'œuvre (pas de la satisfaction) pour éviter une dépendance circulaire.
  energySupply *= workforce * mods.production.energy;
  const energyRatio = energyDemand === 0 || s.resources.energy > 0 ? 1 : Math.min(1, energySupply / energyDemand);

  let comfort = 0;
  for (const b of BUILDINGS) {
    const n = s.buildings[b.id] ?? 0;
    if (n > 0 && b.comfort) comfort += b.comfort * n * (b.consumes?.energy ? energyRatio : 1);
  }
  const comfortCoverage = pop > 0 ? Math.min(1, comfort / pop) : 1;
  const deprived = s.resources.food <= 0 || s.resources.water <= 0;
  const happiness = clamp(
    BASE_HAPPINESS + COMFORT_HAPPINESS * comfortCoverage + mods.happiness - (deprived ? DEPRIVATION_HAPPINESS_PENALTY : 0),
    0,
    1,
  );
  const productivity = workforce * (0.7 + 0.6 * happiness);

  const production = emptyResources();
  const consumption = emptyResources();
  for (const b of BUILDINGS) {
    const n = s.buildings[b.id] ?? 0;
    if (n <= 0) continue;
    const powered = b.consumes?.energy ? energyRatio : 1;
    for (const [r, amount] of resourceEntries(b.produces ?? {})) {
      if (r !== 'energy') production[r] += amount * n * powered * productivity * mods.production[r];
    }
    for (const [r, amount] of resourceEntries(b.consumes ?? {})) {
      consumption[r] += amount * n * (r === 'energy' ? energyRatio : 1);
    }
  }
  production.energy = energySupply;

  // Récolte par les habitants : la satisfaction joue sur leur efficacité, le terrain limite leur nombre utile.
  const gatherEfficiency = 0.7 + 0.6 * happiness;
  const gathering = {} as Record<GatherTaskId, GatherInfo>;
  for (const task of GATHER_TASKS) {
    const assigned = s.gatherers[task.id];
    const cap = space[task.terrain].total * GATHERERS_PER_TILE;
    const working = Math.min(assigned, cap);
    const rate = working * task.perWorker * gatherEfficiency * mods.production[task.id];
    production[task.id] += rate;
    gathering[task.id] = { assigned, cap, working, rate };
  }
  consumption.food += pop * FOOD_PER_CAPITA * mods.consumption.food;
  consumption.water += pop * WATER_PER_CAPITA * mods.consumption.water;

  const net = emptyResources();
  for (const r of RESOURCE_IDS) net[r] = production[r] - consumption[r];

  const starving = (s.resources.food <= 0 && net.food < 0) || (s.resources.water <= 0 && net.water < 0);

  let populationGrowth = 0;
  if (starving) {
    populationGrowth = pop > MIN_POPULATION ? -Math.max(0.2, pop * STARVATION_RATE) : 0;
  } else if (pop > maxPopulation) {
    populationGrowth = -Math.max(0.2, (pop - maxPopulation) * 0.1);
  } else {
    const room = 1 - pop / maxPopulation;
    if (room > 0) populationGrowth = (BIRTH_RATE * pop * room + IMMIGRATION) * mods.birthRate * (0.5 + happiness);
  }

  return {
    space,
    maxPopulation,
    gathering,
    gatherersTotal,
    buildingWorkers,
    freePopulation,
    idle,
    jobs,
    workforce,
    comfort,
    comfortCoverage,
    happiness,
    productivity,
    energyRatio,
    production,
    consumption,
    net,
    populationGrowth,
    starving,
  };
}
