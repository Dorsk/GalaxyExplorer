// Types centraux du jeu. Les données statiques (bâtiments, talents, planètes)
// sont décrites dans core/data, l'état mutable dans GameStateService.

export type ResourceId = 'food' | 'wood' | 'water' | 'energy' | 'research';
export type Resources = Record<ResourceId, number>;
export type ResourceAmounts = Partial<Resources>;

export type TerrainId = 'land' | 'forest' | 'ocean';

/** Tâches de récolte confiées aux habitants (toutes les ressources sauf l'énergie). */
export type GatherTaskId = Exclude<ResourceId, 'energy'>;
/** Nombre d'habitants affectés par le joueur à chaque tâche de récolte. */
export type Assignments = Record<GatherTaskId, number>;

export interface GatherTaskDef {
  id: GatherTaskId;
  name: string;
  icon: string;
  description: string;
  /** Production par habitant et par seconde (avant bonus). */
  perWorker: number;
  /** Terrain exploité : limite le nombre d'habitants pouvant travailler sur cette tâche. */
  terrain: TerrainId;
  /** Bouton de récolte manuelle du joueur. */
  clickLabel: string;
  clickAmount: number;
}

export type BuildingCategory = 'housing' | 'production' | 'energy' | 'research' | 'comfort' | 'trade';

export type BuildingId =
  // Habitations
  | 'hut'
  | 'brickHouse'
  | 'apartment'
  | 'skyscraper'
  | 'ecoCity'
  | 'urbanDome'
  // Production
  | 'farm'
  | 'sawmill'
  | 'fishingPort'
  | 'waterPump'
  | 'greenhouse'
  | 'materialsFactory'
  | 'desalinationPlant'
  | 'synthFactory'
  // Énergie
  | 'windTurbine'
  | 'nuclearPlant'
  | 'fusionReactor'
  // Recherche
  | 'library'
  | 'university'
  | 'researchCenter'
  | 'observatory'
  // Confort & loisirs
  | 'park'
  | 'theater'
  | 'powerGrid'
  // Commerce spatial
  | 'spaceShipyard';

export type BuildingCounts = Partial<Record<BuildingId, number>>;

export type BranchId = 'food' | 'housing' | 'tech';

export type TalentId =
  // Nourriture & Nature
  | 'agriculture'
  | 'intensiveFarming'
  | 'deepSeaFishing'
  | 'irrigation'
  | 'automatedGreenhouses'
  | 'resourceManagement'
  | 'desalination'
  | 'synthFood'
  | 'waterRecycling'
  // Habitation & Infrastructure
  | 'brickHouses'
  | 'urbanism'
  | 'culture'
  | 'apartments'
  | 'skyscrapers'
  | 'landReclamation'
  | 'ecoCities'
  | 'urbanDomes'
  // Technologie & Conquête spatiale
  | 'writing'
  | 'philosophy'
  | 'electricity'
  | 'computing'
  | 'researchCenters'
  | 'nuclearPower'
  | 'spacePropulsion'
  | 'fusionPower'
  | 'rockets'
  | 'observatories'
  | 'warpDrive'
  // Commerce (facultatif, après la première colonie)
  | 'cargoShips'
  | 'galacticMerchant'
  | 'fleetLogistics';

export type PlanetId = 'earth' | 'proxima' | 'trappist' | 'kepler442' | 'gliese' | 'kepler186' | 'hd40307';

/** Effet d'un talent ou d'un bonus de colonie. Les valeurs sont des pourcentages additifs (0.5 = +50 %). */
export type Effect =
  | { kind: 'unlockBuilding'; building: BuildingId }
  | { kind: 'production'; resource: ResourceId | 'all'; value: number }
  | { kind: 'consumption'; resource: 'food' | 'water'; value: number }
  | { kind: 'space'; terrain: TerrainId | 'all'; value: number }
  | { kind: 'housing'; value: number }
  | { kind: 'happiness'; value: number }
  | { kind: 'birthRate'; value: number }
  | { kind: 'cargoCapacity'; value: number }
  /** Nombre de vaisseaux cargo pouvant voler en même temps. */
  | { kind: 'fleetSize'; value: number }
  /** Valeur négative = durée réduite (-0.1 = 10 % plus rapide). */
  | { kind: 'buildTime'; value: number }
  | { kind: 'researchTime'; value: number }
  | { kind: 'unlockGalaxy' }
  | { kind: 'unlockTrade' };

export interface ResourceDef {
  id: ResourceId;
  name: string;
  icon: string;
  description: string;
}

export interface TerrainDef {
  id: TerrainId;
  name: string;
  icon: string;
  description: string;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  icon: string;
  description: string;
  category: BuildingCategory;
  terrain: TerrainId;
  /** Emplacements occupés sur le terrain. */
  size: number;
  baseCost: ResourceAmounts;
  /** Multiplicateur de coût appliqué à chaque exemplaire déjà construit. */
  costGrowth: number;
  /** Durée de construction en secondes. */
  buildTime: number;
  housing?: number;
  /** Production par seconde et par bâtiment (avant bonus). */
  produces?: ResourceAmounts;
  /** Consommation par seconde et par bâtiment. */
  consumes?: ResourceAmounts;
  workers?: number;
  /** Nombre maximal d'exemplaires (ex. : un seul chantier spatial). */
  maxCount?: number;
  /** Nombre d'habitants dont ce bâtiment assure le confort. */
  comfort?: number;
  startsUnlocked?: boolean;
}

export interface BranchDef {
  id: BranchId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface TalentDef {
  id: TalentId;
  branch: BranchId;
  tier: number;
  name: string;
  icon: string;
  description: string;
  cost: number;
  requires: readonly TalentId[];
  /** Nombre de colonies fondées nécessaire pour rechercher ce talent. */
  requiresColonies?: number;
  /** Talent recherchable plusieurs fois ; chaque niveau coûte costGrowth fois plus cher que le précédent. */
  repeatable?: { maxLevel: number; costGrowth: number };
  effects: readonly Effect[];
}

export interface PlanetDef {
  id: PlanetId;
  name: string;
  icon: string;
  description: string;
  terrain: Record<TerrainId, number>;
  bonus: readonly Effect[];
  colors: readonly [string, string];
}

export interface GameStats {
  playTime: number;
  runTime: number;
  peakPopulation: number;
  runPeakPopulation: number;
  clicks: number;
  buildingsBuilt: number;
  talentsResearched: number;
  arksLaunched: number;
}

/** Chantier en cours : construction (payée au lancement) ou démolition (gratuite, même durée). */
export interface ConstructionJob {
  uid: number;
  kind: 'build' | 'demolish';
  building: BuildingId;
  /** Secondes restantes. */
  remaining: number;
  total: number;
  /** Ressources payées, remboursées en cas d'annulation. */
  paid: ResourceAmounts;
}

/** Talent en cours de recherche (une seule recherche à la fois). */
export interface ResearchJob {
  talent: TalentId;
  remaining: number;
  total: number;
}

export type ShipTypeId = 'lightCargo' | 'heavyCargo' | 'warpCargo';
export type ShipCounts = Partial<Record<ShipTypeId, number>>;

export interface ShipDef {
  id: ShipTypeId;
  name: string;
  icon: string;
  description: string;
  /** Unités transportées par voyage (avant améliorations). */
  capacity: number;
  cost: ResourceAmounts;
  buildTime: number;
  /** Talent nécessaire pour construire ce modèle. */
  requires?: TalentId;
}

/** Vaisseau en construction au chantier spatial (un à la fois). */
export interface ShipJob {
  ship: ShipTypeId;
  remaining: number;
  total: number;
  paid: ResourceAmounts;
}

/** Ressources vendables au marchand galactique. */
export type TradeGoodId = 'food' | 'wood' | 'water' | 'energy';

/** Consigne de vente : les vaisseaux emportent ce qui dépasse la réserve. Désactivée par défaut. */
export interface TradeOrder {
  enabled: boolean;
  reserve: number;
}

export type TradeOrders = Record<TradeGoodId, TradeOrder>;

export type MerchantUpgradeId =
  | 'cargoEngines'
  | 'exoticSeeds'
  | 'energyCrystals'
  | 'ancientArchives'
  | 'constructionDrones'
  | 'researchAI';

export type MerchantLevels = Partial<Record<MerchantUpgradeId, number>>;

export interface MerchantUpgradeDef {
  id: MerchantUpgradeId;
  name: string;
  icon: string;
  description: string;
  /** Prix du niveau 1 en crédits ; multiplié par costGrowth à chaque niveau. */
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  /** Effet d'un niveau (cumulé à chaque niveau acheté). */
  effect: Effect;
}

export type LogKind = 'info' | 'success' | 'warning' | 'danger';

export interface LogEntry {
  id: number;
  time: number;
  message: string;
  kind: LogKind;
}

export interface SaveData {
  version: number;
  savedAt: number;
  resources: Resources;
  population: number;
  assignments: Assignments;
  buildings: BuildingCounts;
  constructionQueue: ConstructionJob[];
  talents: TalentId[];
  research: ResearchJob | null;
  planet: PlanetId;
  colonies: PlanetId[];
  arkBuilt: boolean;
  stats: GameStats;
  /** Commerce : conservé d'une colonie à l'autre. */
  credits: number;
  tradeOrders: TradeOrders;
  merchantLevels: MerchantLevels;
  tradeTimer: number;
  ships: ShipCounts;
  shipJob: ShipJob | null;
}
