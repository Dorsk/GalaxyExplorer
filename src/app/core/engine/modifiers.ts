import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.data';
import { PLANETS_BY_ID } from '../data/planets.data';
import { RESOURCE_IDS, RESOURCES_BY_ID, TERRAIN_IDS, TERRAINS_BY_ID } from '../data/resources.data';
import { TALENTS_BY_ID } from '../data/talents.data';
import { MERCHANT_UPGRADES } from '../data/trade.data';
import { BASE_FLEET_SIZE, COLONY_GLOBAL_BONUS, GALAXY_POPULATION_THRESHOLD } from '../game.config';
import { BuildingId, Effect, MerchantLevels, PlanetId, Resources, TalentId, TerrainId } from '../models/game.models';
import { formatValue } from '../../shared/format';

/** Multiplicateurs agrégés à partir des talents recherchés, des colonies fondées et des améliorations du marchand. */
export interface Modifiers {
  production: Resources;
  consumption: Record<'food' | 'water', number>;
  space: Record<TerrainId, number>;
  housing: number;
  happiness: number;
  birthRate: number;
  /** Multiplicateurs de capacité des cargos et de durée des chantiers / recherches. */
  cargoCapacity: number;
  /** Nombre de vaisseaux cargo pouvant voler en même temps. */
  fleetSize: number;
  buildTime: number;
  researchTime: number;
  unlockedBuildings: ReadonlySet<BuildingId>;
  galaxyUnlocked: boolean;
  tradeUnlocked: boolean;
}

export function computeModifiers(
  talents: readonly TalentId[],
  colonies: readonly PlanetId[],
  merchantLevels: MerchantLevels = {},
): Modifiers {
  const production = { food: 1, wood: 1, water: 1, energy: 1, research: 1 };
  const consumption = { food: 1, water: 1 };
  const space = { land: 1, forest: 1, ocean: 1 };
  const unlocked = new Set<BuildingId>(BUILDINGS.filter((b) => b.startsUnlocked).map((b) => b.id));
  let housing = 1;
  let happiness = 0;
  let birthRate = 1;
  let cargoCapacity = 1;
  let fleetSize = BASE_FLEET_SIZE;
  let buildTime = 1;
  let researchTime = 1;
  let galaxyUnlocked = false;
  let tradeUnlocked = false;

  const effects: Effect[] = [];
  for (const id of talents) effects.push(...(TALENTS_BY_ID[id]?.effects ?? []));
  for (const id of colonies) {
    effects.push(...(PLANETS_BY_ID[id]?.bonus ?? []));
    effects.push({ kind: 'production', resource: 'all', value: COLONY_GLOBAL_BONUS });
  }
  for (const u of MERCHANT_UPGRADES) {
    for (let i = 0; i < (merchantLevels[u.id] ?? 0); i++) effects.push(u.effect);
  }

  for (const e of effects) {
    switch (e.kind) {
      case 'unlockBuilding':
        unlocked.add(e.building);
        break;
      case 'production':
        for (const r of e.resource === 'all' ? RESOURCE_IDS : [e.resource]) production[r] += e.value;
        break;
      case 'consumption':
        consumption[e.resource] += e.value;
        break;
      case 'space':
        for (const t of e.terrain === 'all' ? TERRAIN_IDS : [e.terrain]) space[t] += e.value;
        break;
      case 'housing':
        housing += e.value;
        break;
      case 'happiness':
        happiness += e.value;
        break;
      case 'birthRate':
        birthRate += e.value;
        break;
      case 'cargoCapacity':
        cargoCapacity += e.value;
        break;
      case 'fleetSize':
        fleetSize += e.value;
        break;
      case 'buildTime':
        buildTime += e.value;
        break;
      case 'researchTime':
        researchTime += e.value;
        break;
      case 'unlockGalaxy':
        galaxyUnlocked = true;
        break;
      case 'unlockTrade':
        tradeUnlocked = true;
        break;
    }
  }

  consumption.food = Math.max(0.1, consumption.food);
  consumption.water = Math.max(0.1, consumption.water);
  buildTime = Math.max(0.1, buildTime);
  researchTime = Math.max(0.1, researchTime);

  return {
    production,
    consumption,
    space,
    housing,
    happiness,
    birthRate,
    cargoCapacity,
    fleetSize,
    buildTime,
    researchTime,
    unlockedBuildings: unlocked,
    galaxyUnlocked,
    tradeUnlocked,
  };
}

const pct = (v: number) => `${v >= 0 ? '+' : '−'}${formatValue(Math.abs(v) * 100, 'int')} %`;

export function describeEffect(e: Effect): string {
  switch (e.kind) {
    case 'unlockBuilding': {
      const b = BUILDINGS_BY_ID[e.building];
      return `Débloque ${b.icon} ${b.name}`;
    }
    case 'production':
      return e.resource === 'all'
        ? `${pct(e.value)} production globale`
        : `${pct(e.value)} production ${RESOURCES_BY_ID[e.resource].icon} ${RESOURCES_BY_ID[e.resource].name.toLowerCase()}`;
    case 'consumption':
      return `${pct(e.value)} consommation ${RESOURCES_BY_ID[e.resource].icon} par habitant`;
    case 'space':
      return e.terrain === 'all'
        ? `${pct(e.value)} espace utilisable`
        : `${pct(e.value)} espace ${TERRAINS_BY_ID[e.terrain].icon} ${TERRAINS_BY_ID[e.terrain].name.toLowerCase()}`;
    case 'housing':
      return `${pct(e.value)} capacité des habitations`;
    case 'happiness':
      return `${pct(e.value)} satisfaction`;
    case 'birthRate':
      return `${pct(e.value)} natalité`;
    case 'cargoCapacity':
      return `${pct(e.value)} capacité des vaisseaux cargo`;
    case 'fleetSize':
      return '+' + e.value + ' vaisseau cargo en vol simultanément';
    case 'buildTime':
      return `${pct(e.value)} durée de construction`;
    case 'researchTime':
      return `${pct(e.value)} durée de recherche`;
    case 'unlockTrade':
      return 'Débloque le commerce avec le Marchand galactique';
    case 'unlockGalaxy':
      return `Débloque l’Exploration Galactique (dès ${formatValue(GALAXY_POPULATION_THRESHOLD, 'int')} habitants)`;
  }
}
