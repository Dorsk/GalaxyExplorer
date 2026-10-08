import { ShipDef, ShipTypeId } from '../models/game.models';

/** Modèles de vaisseaux cargo, construits au chantier spatial. Nombre illimité, mais seule une partie peut voler. */
export const SHIPS: readonly ShipDef[] = [
  {
    id: 'lightCargo', name: 'Navette cargo', icon: '🛸', capacity: 20_000, buildTime: 300,
    description: 'Petite et rapide à construire.',
    cost: { wood: 150_000, energy: 100_000 },
  },
  {
    id: 'heavyCargo', name: 'Cargo lourd', icon: '🚢', capacity: 100_000, buildTime: 900,
    description: 'Des soutes immenses propulsées par la fusion.',
    cost: { wood: 600_000, water: 200_000, energy: 500_000 },
    requires: 'fusionPower',
  },
  {
    id: 'warpCargo', name: 'Cargo à distorsion', icon: '🌠', capacity: 500_000, buildTime: 1800,
    description: 'Le summum du transport interstellaire.',
    cost: { wood: 3_000_000, energy: 3_000_000, research: 500_000 },
    requires: 'warpDrive',
  },
];

export const SHIPS_BY_ID = Object.fromEntries(SHIPS.map((s) => [s.id, s])) as Record<ShipTypeId, ShipDef>;
