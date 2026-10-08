import { ResourceAmounts, ResourceDef, ResourceId, Resources, TerrainDef, TerrainId } from '../models/game.models';

export const RESOURCE_IDS: readonly ResourceId[] = ['food', 'wood', 'water', 'energy', 'research'];
export const TERRAIN_IDS: readonly TerrainId[] = ['land', 'forest', 'ocean'];

export const RESOURCES: readonly ResourceDef[] = [
  { id: 'food', name: 'Nourriture', icon: '🌾', description: 'Consommée chaque seconde par chaque habitant.' },
  { id: 'wood', name: 'Bois', icon: '🪵', description: 'Matériau de construction de base.' },
  { id: 'water', name: 'Eau', icon: '💧', description: 'Consommée chaque seconde par chaque habitant.' },
  { id: 'energy', name: 'Énergie', icon: '⚡', description: 'Alimente les bâtiments avancés.' },
  { id: 'research', name: 'Recherche', icon: '🔬', description: 'Permet de débloquer les talents.' },
];

export const TERRAINS: readonly TerrainDef[] = [
  { id: 'land', name: 'Terres habitables', icon: '🏞️', description: 'Accueillent la plupart des bâtiments.' },
  { id: 'forest', name: 'Forêt', icon: '🌲', description: 'Cueillette et exploitation du bois.' },
  { id: 'ocean', name: 'Océan', icon: '🌊', description: 'Pêche, pompage et cités sous-marines.' },
];

export const RESOURCES_BY_ID = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<ResourceId, ResourceDef>;
export const TERRAINS_BY_ID = Object.fromEntries(TERRAINS.map((t) => [t.id, t])) as Record<TerrainId, TerrainDef>;

export function emptyResources(): Resources {
  return { food: 0, wood: 0, water: 0, energy: 0, research: 0 };
}

/** Entrées non nulles d'un montant partiel, dans l'ordre canonique des ressources. */
export function resourceEntries(amounts: ResourceAmounts): [ResourceId, number][] {
  return RESOURCE_IDS.filter((id) => (amounts[id] ?? 0) !== 0).map((id) => [id, amounts[id] ?? 0]);
}
