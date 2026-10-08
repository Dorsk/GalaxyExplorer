import { BuildingCategory, BuildingDef, BuildingId } from '../models/game.models';

export const BUILDING_CATEGORIES: readonly { id: BuildingCategory; name: string; icon: string }[] = [
  { id: 'housing', name: 'Habitations', icon: '🏘️' },
  { id: 'production', name: 'Production', icon: '⚒️' },
  { id: 'energy', name: 'Énergie', icon: '⚡' },
  { id: 'research', name: 'Recherche', icon: '🔬' },
  { id: 'comfort', name: 'Confort & Loisirs', icon: '🎡' },
  { id: 'trade', name: 'Commerce spatial', icon: '🛒' },
];

export const BUILDINGS: readonly BuildingDef[] = [
  // ── Habitations ───────────────────────────────────────────────
  {
    id: 'hut', name: 'Cabane', icon: '🛖', category: 'housing', terrain: 'land', size: 1,
    description: 'Un abri rudimentaire de branches et de feuillage.',
    baseCost: { wood: 10 }, costGrowth: 1.15, buildTime: 10, housing: 3, startsUnlocked: true,
  },
  {
    id: 'brickHouse', name: 'Maison en brique', icon: '🏠', category: 'housing', terrain: 'land', size: 1,
    description: 'Solide et durable, elle abrite une famille entière.',
    baseCost: { wood: 60, water: 20 }, costGrowth: 1.15, buildTime: 30, housing: 10,
  },
  {
    id: 'apartment', name: 'Immeuble', icon: '🏢', category: 'housing', terrain: 'land', size: 1,
    description: 'La densification commence.',
    baseCost: { wood: 600, water: 200 }, costGrowth: 1.15, buildTime: 90, housing: 60,
  },
  {
    id: 'skyscraper', name: 'Gratte-ciel', icon: '🏙️', category: 'housing', terrain: 'land', size: 1,
    description: 'Des centaines de logements empilés vers le ciel.',
    baseCost: { wood: 6_000, energy: 2_500 }, costGrowth: 1.15, buildTime: 300, housing: 600, consumes: { energy: 2 },
  },
  {
    id: 'ecoCity', name: 'Éco-cité', icon: '🌆', category: 'housing', terrain: 'land', size: 1,
    description: 'Ville autonome : logements, fermes verticales et espaces verts.',
    baseCost: { wood: 80_000, water: 40_000, energy: 40_000 }, costGrowth: 1.15, buildTime: 900,
    housing: 6_000, comfort: 3_000, produces: { food: 300, water: 300 }, consumes: { energy: 15 }, workers: 500,
  },
  {
    id: 'urbanDome', name: 'Dôme urbain', icon: '🌐', category: 'housing', terrain: 'ocean', size: 1,
    description: 'Mégalopole sous dôme bâtie sur les océans.',
    baseCost: { wood: 500_000, water: 200_000, energy: 600_000 }, costGrowth: 1.12, buildTime: 1800,
    housing: 80_000, comfort: 40_000, consumes: { energy: 60 },
  },

  // ── Production ────────────────────────────────────────────────
  {
    id: 'farm', name: 'Ferme', icon: '🌾', category: 'production', terrain: 'land', size: 1,
    description: 'Champs cultivés et élevage.',
    baseCost: { wood: 50, water: 20 }, costGrowth: 1.15, buildTime: 20, produces: { food: 2.5 }, workers: 2,
  },
  {
    id: 'sawmill', name: 'Scierie', icon: '🪚', category: 'production', terrain: 'forest', size: 1,
    description: 'Transforme les grumes en planches.',
    baseCost: { wood: 150, food: 50 }, costGrowth: 1.15, buildTime: 30, produces: { wood: 3 }, workers: 3,
  },
  {
    id: 'fishingPort', name: 'Port de pêche', icon: '🎣', category: 'production', terrain: 'ocean', size: 1,
    description: 'Chalutiers partant pour la haute mer.',
    baseCost: { wood: 200 }, costGrowth: 1.15, buildTime: 45, produces: { food: 6 }, workers: 3,
  },
  {
    id: 'waterPump', name: 'Station de pompage', icon: '🚰', category: 'production', terrain: 'ocean', size: 1,
    description: 'Pompe, filtre et distribue l’eau.',
    baseCost: { wood: 400, food: 100 }, costGrowth: 1.15, buildTime: 60, produces: { water: 8 }, workers: 3,
  },
  {
    id: 'greenhouse', name: 'Serre automatisée', icon: '🪴', category: 'production', terrain: 'land', size: 1,
    description: 'Culture hors-sol pilotée par ordinateur.',
    baseCost: { wood: 3_000, energy: 800 }, costGrowth: 1.15, buildTime: 180, produces: { food: 40 }, consumes: { energy: 1 }, workers: 5,
  },
  {
    id: 'materialsFactory', name: 'Usine de biomatériaux', icon: '🏭', category: 'production', terrain: 'land', size: 1,
    description: 'Produit des matériaux de construction composites.',
    baseCost: { wood: 10_000, energy: 4_000 }, costGrowth: 1.15, buildTime: 300, produces: { wood: 60 }, consumes: { energy: 4 }, workers: 20,
  },
  {
    id: 'desalinationPlant', name: 'Usine de dessalement', icon: '⚗️', category: 'production', terrain: 'ocean', size: 1,
    description: 'Transforme l’eau de mer en eau potable.',
    baseCost: { wood: 30_000, energy: 15_000 }, costGrowth: 1.15, buildTime: 400, produces: { water: 500 }, consumes: { energy: 8 }, workers: 30,
  },
  {
    id: 'synthFactory', name: 'Usine de nourriture synthétique', icon: '🧪', category: 'production', terrain: 'land', size: 1,
    description: 'Protéines et nutriments synthétisés à grande échelle.',
    baseCost: { wood: 120_000, water: 40_000, energy: 80_000 }, costGrowth: 1.15, buildTime: 600,
    produces: { food: 400 }, consumes: { energy: 12 }, workers: 60,
  },

  // ── Énergie ───────────────────────────────────────────────────
  {
    id: 'windTurbine', name: 'Éolienne', icon: '🌬️', category: 'energy', terrain: 'land', size: 1,
    description: 'Énergie propre, mais modeste.',
    baseCost: { wood: 250 }, costGrowth: 1.15, buildTime: 60, produces: { energy: 2 }, workers: 1,
  },
  {
    id: 'nuclearPlant', name: 'Centrale nucléaire', icon: '☢️', category: 'energy', terrain: 'land', size: 1,
    description: 'Puissante, mais gourmande en eau de refroidissement.',
    baseCost: { wood: 25_000, water: 10_000 }, costGrowth: 1.15, buildTime: 600, produces: { energy: 60 }, consumes: { water: 10 }, workers: 25,
  },
  {
    id: 'fusionReactor', name: 'Réacteur à fusion', icon: '☀️', category: 'energy', terrain: 'land', size: 1,
    description: 'Un soleil miniature en bouteille.',
    baseCost: { wood: 300_000, energy: 150_000 }, costGrowth: 1.15, buildTime: 1200, produces: { energy: 800 }, workers: 60,
  },

  // ── Recherche ─────────────────────────────────────────────────
  {
    id: 'library', name: 'Bibliothèque', icon: '📚', category: 'research', terrain: 'land', size: 1,
    description: 'Le savoir se transmet enfin.',
    baseCost: { wood: 30 }, costGrowth: 1.15, buildTime: 20, produces: { research: 0.5 }, workers: 1,
  },
  {
    id: 'university', name: 'Université', icon: '🎓', category: 'research', terrain: 'land', size: 1,
    description: 'Forme les savants de demain.',
    baseCost: { wood: 300, food: 100 }, costGrowth: 1.15, buildTime: 60, produces: { research: 3 }, workers: 4,
  },
  {
    id: 'researchCenter', name: 'Centre de recherche', icon: '🧬', category: 'research', terrain: 'land', size: 1,
    description: 'Laboratoires de pointe et supercalculateurs.',
    baseCost: { wood: 20_000, energy: 8_000 }, costGrowth: 1.15, buildTime: 300, produces: { research: 40 }, consumes: { energy: 5 }, workers: 40,
  },
  {
    id: 'observatory', name: 'Observatoire', icon: '🔭', category: 'research', terrain: 'land', size: 1,
    description: 'Scrute les exoplanètes habitables.',
    baseCost: { wood: 200_000, energy: 120_000 }, costGrowth: 1.15, buildTime: 900, produces: { research: 350 }, consumes: { energy: 25 }, workers: 100,
  },

  // ── Confort & Loisirs ─────────────────────────────────────────
  {
    id: 'park', name: 'Parc', icon: '🌳', category: 'comfort', terrain: 'land', size: 1,
    description: 'Un espace vert pour souffler.',
    baseCost: { wood: 100 }, costGrowth: 1.15, buildTime: 30, comfort: 25,
  },
  {
    id: 'theater', name: 'Théâtre', icon: '🎭', category: 'comfort', terrain: 'land', size: 1,
    description: 'Culture et divertissement pour tous.',
    baseCost: { wood: 800, water: 200 }, costGrowth: 1.15, buildTime: 90, comfort: 150, workers: 5,
  },
  {
    id: 'powerGrid', name: 'Réseau électrique', icon: '💡', category: 'comfort', terrain: 'land', size: 0,
    description: 'Lumière et électroménager dans chaque foyer. Sans emprise au sol.',
    baseCost: { wood: 2_000 }, costGrowth: 1.15, buildTime: 120, comfort: 1_200, consumes: { energy: 3 },
  },

  // ── Commerce spatial ──────────────────────────────────────────
  {
    id: 'spaceShipyard', name: 'Chantier spatial', icon: '🏗️', category: 'trade', terrain: 'land', size: 2,
    description: 'Construit les vaisseaux cargo. Ouvre l’onglet Chantier spatial. Un seul par planète.',
    baseCost: { wood: 500_000, energy: 300_000 }, costGrowth: 1, buildTime: 900, workers: 50, maxCount: 1,
  },
];

export const BUILDINGS_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, BuildingDef>;
