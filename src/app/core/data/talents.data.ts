import { BranchDef, TalentDef, TalentId } from '../models/game.models';

export const BRANCHES: readonly BranchDef[] = [
  {
    id: 'food', name: 'Nourriture & Nature', icon: '🌿', color: '#4ade80',
    description: 'Boost de production et réduction de la consommation par habitant.',
  },
  {
    id: 'housing', name: 'Habitation & Infrastructure', icon: '🏗️', color: '#fbbf24',
    description: 'Capacité de population, espace utilisable et confort.',
  },
  {
    id: 'tech', name: 'Technologie & Conquête spatiale', icon: '🚀', color: '#5cc8ff',
    description: 'Recherche, énergie et projet spatial.',
  },
];

export const TALENTS: readonly TalentDef[] = [
  // ── Nourriture & Nature ───────────────────────────────────────
  {
    id: 'agriculture', branch: 'food', tier: 1, name: 'Agriculture', icon: '🌱', cost: 15, requires: [],
    description: 'Domestiquer les plantes plutôt que les chercher.',
    effects: [{ kind: 'unlockBuilding', building: 'farm' }],
  },
  {
    id: 'intensiveFarming', branch: 'food', tier: 2, name: 'Agriculture intensive', icon: '🚜', cost: 120, requires: ['agriculture'],
    description: 'Rotation des cultures, engrais et outils.',
    effects: [{ kind: 'production', resource: 'food', value: 0.5 }],
  },
  {
    id: 'deepSeaFishing', branch: 'food', tier: 2, name: 'Pêche hauturière', icon: '⛵', cost: 200, requires: ['agriculture'],
    description: 'Des bateaux capables d’affronter la haute mer.',
    effects: [{ kind: 'unlockBuilding', building: 'fishingPort' }],
  },
  {
    id: 'irrigation', branch: 'food', tier: 3, name: 'Irrigation', icon: '🚿', cost: 600, requires: ['intensiveFarming'],
    description: 'Canaux, pompes et réservoirs.',
    effects: [{ kind: 'unlockBuilding', building: 'waterPump' }, { kind: 'production', resource: 'water', value: 0.5 }],
  },
  {
    id: 'automatedGreenhouses', branch: 'food', tier: 4, name: 'Serres automatisées', icon: '🪴', cost: 6_000,
    requires: ['irrigation', 'electricity'],
    description: 'Climat contrôlé, récoltes toute l’année.',
    effects: [{ kind: 'unlockBuilding', building: 'greenhouse' }],
  },
  {
    id: 'resourceManagement', branch: 'food', tier: 4, name: 'Gestion des ressources', icon: '📦', cost: 9_000, requires: ['irrigation'],
    description: 'Conservation, chaîne du froid et lutte contre le gaspillage.',
    effects: [
      { kind: 'consumption', resource: 'food', value: -0.2 },
      { kind: 'consumption', resource: 'water', value: -0.2 },
    ],
  },
  {
    id: 'desalination', branch: 'food', tier: 5, name: 'Dessalement', icon: '⚗️', cost: 30_000, requires: ['automatedGreenhouses'],
    description: 'L’océan devient une réserve d’eau potable.',
    effects: [{ kind: 'unlockBuilding', building: 'desalinationPlant' }],
  },
  {
    id: 'synthFood', branch: 'food', tier: 6, name: 'Nourriture synthétique', icon: '🧪', cost: 150_000,
    requires: ['desalination', 'computing'],
    description: 'Des repas complets sortis d’un bioréacteur.',
    effects: [{ kind: 'unlockBuilding', building: 'synthFactory' }, { kind: 'consumption', resource: 'food', value: -0.3 }],
  },
  {
    id: 'waterRecycling', branch: 'food', tier: 7, name: 'Recyclage intégral', icon: '♻️', cost: 800_000, requires: ['synthFood'],
    description: 'Économie circulaire totale de l’eau et des nutriments.',
    effects: [
      { kind: 'consumption', resource: 'water', value: -0.4 },
      { kind: 'production', resource: 'water', value: 0.5 },
      { kind: 'production', resource: 'food', value: 0.5 },
    ],
  },

  // ── Habitation & Infrastructure ───────────────────────────────
  {
    id: 'brickHouses', branch: 'housing', tier: 1, name: 'Maisons en brique', icon: '🧱', cost: 30, requires: [],
    description: 'Cuire l’argile pour bâtir durablement.',
    effects: [{ kind: 'unlockBuilding', building: 'brickHouse' }, { kind: 'unlockBuilding', building: 'sawmill' }],
  },
  {
    id: 'urbanism', branch: 'housing', tier: 2, name: 'Urbanisme', icon: '📐', cost: 150, requires: ['brickHouses'],
    description: 'Planifier les rues et les quartiers.',
    effects: [{ kind: 'unlockBuilding', building: 'park' }, { kind: 'space', terrain: 'land', value: 0.2 }],
  },
  {
    id: 'culture', branch: 'housing', tier: 3, name: 'Arts & Culture', icon: '🎨', cost: 700, requires: ['urbanism'],
    description: 'Le divertissement rend la vie plus douce.',
    effects: [{ kind: 'unlockBuilding', building: 'theater' }, { kind: 'happiness', value: 0.05 }],
  },
  {
    id: 'apartments', branch: 'housing', tier: 3, name: 'Immeubles', icon: '🏢', cost: 1_000, requires: ['urbanism'],
    description: 'Construire en hauteur pour loger plus.',
    effects: [{ kind: 'unlockBuilding', building: 'apartment' }],
  },
  {
    id: 'skyscrapers', branch: 'housing', tier: 4, name: 'Gratte-ciels', icon: '🏙️', cost: 12_000,
    requires: ['apartments', 'electricity'],
    description: 'Acier, béton et ascenseurs électriques.',
    effects: [
      { kind: 'unlockBuilding', building: 'skyscraper' },
      { kind: 'unlockBuilding', building: 'materialsFactory' },
      { kind: 'housing', value: 0.1 },
    ],
  },
  {
    id: 'landReclamation', branch: 'housing', tier: 5, name: 'Poldérisation', icon: '🚧', cost: 40_000, requires: ['skyscrapers'],
    description: 'Gagner des terres sur la mer et les marais.',
    effects: [{ kind: 'space', terrain: 'land', value: 0.3 }, { kind: 'space', terrain: 'forest', value: 0.2 }],
  },
  {
    id: 'ecoCities', branch: 'housing', tier: 6, name: 'Éco-cités', icon: '🌆', cost: 250_000,
    requires: ['skyscrapers', 'automatedGreenhouses'],
    description: 'Des villes en symbiose avec la nature.',
    effects: [{ kind: 'unlockBuilding', building: 'ecoCity' }, { kind: 'birthRate', value: 0.2 }],
  },
  {
    id: 'urbanDomes', branch: 'housing', tier: 7, name: 'Dômes urbains', icon: '🌐', cost: 1_500_000,
    requires: ['ecoCities', 'fusionPower'],
    description: 'Coloniser les océans sous des dômes pressurisés.',
    effects: [{ kind: 'unlockBuilding', building: 'urbanDome' }, { kind: 'space', terrain: 'ocean', value: 0.5 }],
  },

  // ── Technologie & Conquête spatiale ───────────────────────────
  {
    id: 'writing', branch: 'tech', tier: 1, name: 'Écriture', icon: '✍️', cost: 10, requires: [],
    description: 'Consigner le savoir pour les générations futures.',
    effects: [{ kind: 'unlockBuilding', building: 'library' }],
  },
  {
    id: 'philosophy', branch: 'tech', tier: 2, name: 'Philosophie', icon: '🏛️', cost: 100, requires: ['writing'],
    description: 'La méthode scientifique est née.',
    effects: [{ kind: 'unlockBuilding', building: 'university' }, { kind: 'production', resource: 'research', value: 0.1 }],
  },
  {
    id: 'electricity', branch: 'tech', tier: 3, name: 'Électricité', icon: '⚡', cost: 1_500, requires: ['philosophy'],
    description: 'Dompter la foudre.',
    effects: [{ kind: 'unlockBuilding', building: 'windTurbine' }, { kind: 'unlockBuilding', building: 'powerGrid' }],
  },
  {
    id: 'computing', branch: 'tech', tier: 4, name: 'Informatique', icon: '💻', cost: 10_000, requires: ['electricity'],
    description: 'Calcul automatisé et réseaux mondiaux.',
    effects: [{ kind: 'production', resource: 'research', value: 0.5 }, { kind: 'production', resource: 'wood', value: 0.25 }],
  },
  {
    id: 'researchCenters', branch: 'tech', tier: 5, name: 'Centres de recherche', icon: '🧬', cost: 35_000, requires: ['computing'],
    description: 'La science devient une industrie.',
    effects: [{ kind: 'unlockBuilding', building: 'researchCenter' }],
  },
  {
    id: 'nuclearPower', branch: 'tech', tier: 5, name: 'Énergie nucléaire', icon: '☢️', cost: 50_000, requires: ['computing'],
    description: 'La puissance de l’atome.',
    effects: [{ kind: 'unlockBuilding', building: 'nuclearPlant' }],
  },
  {
    id: 'spacePropulsion', branch: 'tech', tier: 6, name: 'Propulsion spatiale', icon: '🛰️', cost: 200_000, requires: ['researchCenters'],
    description: 'Échapper à la gravité terrestre.',
    effects: [{ kind: 'production', resource: 'research', value: 0.25 }, { kind: 'production', resource: 'energy', value: 0.25 }],
  },
  {
    id: 'fusionPower', branch: 'tech', tier: 6, name: 'Fusion nucléaire', icon: '☀️', cost: 400_000, requires: ['nuclearPower'],
    description: 'Une énergie quasi illimitée.',
    effects: [{ kind: 'unlockBuilding', building: 'fusionReactor' }],
  },
  {
    id: 'rockets', branch: 'tech', tier: 7, name: 'Fusées orbitales', icon: '🚀', cost: 1_000_000, requires: ['spacePropulsion'],
    description: 'Satellites, stations orbitales et vols habités.',
    effects: [{ kind: 'production', resource: 'research', value: 0.5 }, { kind: 'happiness', value: 0.05 }],
  },
  {
    id: 'observatories', branch: 'tech', tier: 8, name: 'Observatoires', icon: '🔭', cost: 2_500_000, requires: ['rockets'],
    description: 'Cartographier les exoplanètes habitables.',
    effects: [{ kind: 'unlockBuilding', building: 'observatory' }],
  },
  {
    id: 'warpDrive', branch: 'tech', tier: 9, name: 'Moteur à distorsion', icon: '🌀', cost: 10_000_000,
    requires: ['observatories', 'fusionPower'],
    description: 'Plier l’espace-temps pour atteindre les étoiles.',
    effects: [{ kind: 'unlockGalaxy' }],
  },
];

export const TALENTS_BY_ID = Object.fromEntries(TALENTS.map((t) => [t.id, t])) as Record<TalentId, TalentDef>;
