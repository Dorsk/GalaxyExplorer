import { Injectable, computed, signal } from '@angular/core';
import { BUILDINGS, BUILDINGS_BY_ID } from '../data/buildings.data';
import { GATHER_TASK_IDS } from '../data/gathering.data';
import { PLANETS_BY_ID } from '../data/planets.data';
import { RESOURCE_IDS, resourceEntries } from '../data/resources.data';
import { TALENTS_BY_ID } from '../data/talents.data';
import { computeEconomy, effectiveGatherers, freePopulation } from '../engine/economy';
import { computeModifiers } from '../engine/modifiers';
import { decodeSave, encodeSave } from '../engine/save-codec';
import {
  DEFAULT_ASSIGNMENTS,
  GALAXY_POPULATION_THRESHOLD,
  LEGACY_SAVE_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  START_POPULATION,
  START_RESOURCES,
} from '../game.config';
import {
  Assignments,
  BuildingCounts,
  ConstructionJob,
  GameStats,
  LogEntry,
  LogKind,
  PlanetId,
  ResearchJob,
  ResourceAmounts,
  Resources,
  SaveData,
  TalentId,
} from '../models/game.models';

const MAX_LOG_ENTRIES = 60;

function initialStats(): GameStats {
  return {
    playTime: 0,
    runTime: 0,
    peakPopulation: START_POPULATION,
    runPeakPopulation: START_POPULATION,
    clicks: 0,
    buildingsBuilt: 0,
    talentsResearched: 0,
    arksLaunched: 0,
  };
}

function createInitialSave(): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    resources: { ...START_RESOURCES },
    population: START_POPULATION,
    assignments: { ...DEFAULT_ASSIGNMENTS },
    buildings: {},
    constructionQueue: [],
    talents: [],
    research: null,
    planet: 'earth',
    colonies: [],
    arkBuilt: false,
    stats: initialStats(),
  };
}

const finite = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * Transition : les sauvegardes locales écrites avant le chiffrement étaient du JSON en clair.
 * Elles sont relues une fois puis réécrites chiffrées à la sauvegarde suivante.
 */
function decodeLegacyPlainSave(raw: string): Partial<SaveData> | null {
  if (!raw.trimStart().startsWith('{')) return null;
  try {
    const data: unknown = JSON.parse(raw);
    return typeof data === 'object' && data !== null ? (data as Partial<SaveData>) : null;
  } catch {
    return null;
  }
}

/**
 * Source de vérité de l'état du jeu, exposée sous forme de Signals.
 * Les valeurs dérivées (modificateurs, économie) sont des `computed()` recalculés à la demande.
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
  readonly resources = signal<Resources>({ ...START_RESOURCES });
  readonly population = signal(START_POPULATION);
  /** Nombre d'habitants affectés par le joueur à chaque tâche de récolte. */
  readonly assignments = signal<Assignments>({ ...DEFAULT_ASSIGNMENTS });
  readonly buildings = signal<BuildingCounts>({});
  /** File de construction, traitée dans l'ordre : seul le premier chantier avance. */
  readonly constructionQueue = signal<readonly ConstructionJob[]>([]);
  readonly talents = signal<readonly TalentId[]>([]);
  readonly research = signal<ResearchJob | null>(null);
  readonly planet = signal<PlanetId>('earth');
  readonly colonies = signal<readonly PlanetId[]>([]);
  readonly arkBuilt = signal(false);
  readonly stats = signal<GameStats>(initialStats());
  readonly log = signal<readonly LogEntry[]>([]);

  readonly modifiers = computed(() => computeModifiers(this.talents(), this.colonies()));
  /** Nombre de bâtiments de chaque type en file de construction. */
  readonly pendingBuildings = computed(() => {
    const counts: BuildingCounts = {};
    for (const job of this.constructionQueue()) {
      if (job.kind === 'build') counts[job.building] = (counts[job.building] ?? 0) + 1;
    }
    return counts;
  });
  /** Nombre de bâtiments de chaque type en cours de démolition (encore actifs jusqu'à la fin). */
  readonly demolishingBuildings = computed(() => {
    const counts: BuildingCounts = {};
    for (const job of this.constructionQueue()) {
      if (job.kind === 'demolish') counts[job.building] = (counts[job.building] ?? 0) + 1;
    }
    return counts;
  });
  /** Habitants non employés par les bâtiments. */
  readonly freePopulation = computed(() => freePopulation(this.population(), this.buildings()));
  /** Nombre réel d'habitants à chaque tâche de récolte. */
  readonly gatherers = computed(() => effectiveGatherers(this.assignments(), this.freePopulation()));
  readonly economy = computed(() =>
    computeEconomy(
      {
        population: this.population(),
        gatherers: this.gatherers(),
        resources: this.resources(),
        buildings: this.buildings(),
        pending: this.pendingBuildings(),
        planet: this.planet(),
      },
      this.modifiers(),
    ),
  );
  readonly planetDef = computed(() => PLANETS_BY_ID[this.planet()]);
  readonly galaxyUnlocked = computed(
    () => this.modifiers().galaxyUnlocked && this.stats().runPeakPopulation >= GALAXY_POPULATION_THRESHOLD,
  );

  private logId = 0;

  // ── Ressources ────────────────────────────────────────────────

  canAfford(cost: ResourceAmounts): boolean {
    const r = this.resources();
    return resourceEntries(cost).every(([id, amount]) => r[id] >= amount);
  }

  spend(cost: ResourceAmounts): boolean {
    if (!this.canAfford(cost)) return false;
    this.resources.update((r) => {
      const next = { ...r };
      for (const [id, amount] of resourceEntries(cost)) next[id] -= amount;
      return next;
    });
    return true;
  }

  gain(amounts: ResourceAmounts): void {
    this.resources.update((r) => {
      const next = { ...r };
      for (const [id, amount] of resourceEntries(amounts)) next[id] += amount;
      return next;
    });
  }

  addLog(message: string, kind: LogKind = 'info'): void {
    const entry: LogEntry = { id: ++this.logId, time: Date.now(), message, kind };
    this.log.update((log) => [entry, ...log].slice(0, MAX_LOG_ENTRIES));
  }

  // ── Prestige ──────────────────────────────────────────────────

  /** Réinitialise la partie en cours sur une nouvelle planète, en conservant colonies et statistiques globales. */
  startNewColony(planet: PlanetId, population: number, resources: Resources, assignments: Assignments): void {
    this.colonies.update((c) => [...c, planet]);
    this.planet.set(planet);
    this.population.set(population);
    this.assignments.set({ ...assignments });
    this.resources.set({ ...resources });
    this.buildings.set({});
    this.constructionQueue.set([]);
    this.talents.set([]);
    this.research.set(null);
    this.arkBuilt.set(false);
    this.stats.update((s) => ({ ...s, runTime: 0, runPeakPopulation: population, arksLaunched: s.arksLaunched + 1 }));
  }

  // ── Persistance ───────────────────────────────────────────────

  serialize(): SaveData {
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      resources: this.resources(),
      population: this.population(),
      assignments: this.assignments(),
      buildings: this.buildings(),
      constructionQueue: [...this.constructionQueue()],
      talents: [...this.talents()],
      research: this.research(),
      planet: this.planet(),
      colonies: [...this.colonies()],
      arkBuilt: this.arkBuilt(),
      stats: this.stats(),
    };
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, encodeSave(this.serialize()));
    } catch {
      // Stockage indisponible (navigation privée, quota) : le jeu continue sans sauvegarde.
    }
  }

  /** Charge la sauvegarde locale. Renvoie l'horodatage de la sauvegarde, ou null s'il n'y en a pas. */
  load(): number | null {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    const data = decodeSave(raw) ?? decodeLegacyPlainSave(raw);
    if (!data) {
      this.addLog('⚠️ Sauvegarde invalide ou modifiée : nouvelle partie.', 'danger');
      return null;
    }
    try {
      this.apply(data);
      return finite(data.savedAt, Date.now());
    } catch {
      this.addLog('⚠️ Sauvegarde illisible : nouvelle partie.', 'danger');
      return null;
    }
  }

  /** Sauvegarde chiffrée et signée, à recopier pour l'importer plus tard. */
  exportSave(): string {
    return encodeSave(this.serialize());
  }

  /** N'accepte que les sauvegardes exportées par le jeu ; toute modification les rend invalides. */
  importSave(encoded: string): boolean {
    const data = decodeSave(encoded);
    if (!data || typeof data.population !== 'number') return false;
    try {
      this.apply(data);
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  hardReset(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(LEGACY_SAVE_KEY);
    } catch {
      // ignoré
    }
    this.apply(createInitialSave());
    this.log.set([]);
  }

  /** Applique une sauvegarde en validant chaque champ (tolère les sauvegardes anciennes ou partielles). */
  private apply(data: Partial<SaveData>): void {
    const d = createInitialSave();

    const resources = { ...d.resources };
    for (const id of RESOURCE_IDS) resources[id] = Math.max(0, finite(data.resources?.[id], d.resources[id]));

    const buildings: BuildingCounts = {};
    for (const b of BUILDINGS) {
      const n = Math.floor(finite(data.buildings?.[b.id], 0));
      if (n > 0) buildings[b.id] = n;
    }

    const talents = (Array.isArray(data.talents) ? data.talents : []).filter((t) => t in TALENTS_BY_ID);
    const colonies = (Array.isArray(data.colonies) ? data.colonies : []).filter((p) => p in PLANETS_BY_ID);
    const planet = data.planet && data.planet in PLANETS_BY_ID ? data.planet : d.planet;

    const constructionQueue: ConstructionJob[] = [];
    for (const job of Array.isArray(data.constructionQueue) ? data.constructionQueue : []) {
      const def = job && BUILDINGS_BY_ID[job.building];
      if (!def) continue;
      const total = Math.max(1, finite(job.total, def.buildTime));
      const paid: ResourceAmounts = {};
      for (const id of RESOURCE_IDS) {
        const amount = finite(job.paid?.[id], 0);
        if (amount > 0) paid[id] = amount;
      }
      constructionQueue.push({
        uid: constructionQueue.length + 1,
        kind: job.kind === 'demolish' ? 'demolish' : 'build',
        building: def.id,
        total,
        remaining: Math.min(total, Math.max(0, finite(job.remaining, total))),
        paid,
      });
    }

    const r = data.research;
    const research: ResearchJob | null =
      r && r.talent in TALENTS_BY_ID && !talents.includes(r.talent)
        ? { talent: r.talent, total: Math.max(1, finite(r.total, 1)), remaining: Math.max(0, finite(r.remaining, 0)) }
        : null;

    const population = Math.max(1, finite(data.population, d.population));

    // Les anciennes sauvegardes pouvaient stocker des pourcentages : on les convertit en nombres d'habitants.
    const legacyPercent = (data as { assignMode?: string }).assignMode === 'percent';
    const free = freePopulation(population, buildings);
    const assignments = { ...d.assignments };
    for (const id of GATHER_TASK_IDS) {
      const raw = Math.max(0, finite(data.assignments?.[id], d.assignments[id]));
      assignments[id] = Math.floor(legacyPercent ? (free * raw) / 100 : raw);
    }

    const stats = { ...d.stats };
    for (const key of Object.keys(stats) as (keyof GameStats)[]) stats[key] = finite(data.stats?.[key], d.stats[key]);

    this.resources.set(resources);
    this.population.set(population);
    this.assignments.set(effectiveGatherers(assignments, free));
    this.buildings.set(buildings);
    this.constructionQueue.set(constructionQueue);
    this.talents.set([...new Set(talents)]);
    this.research.set(research);
    this.colonies.set(colonies);
    this.planet.set(planet);
    this.arkBuilt.set(data.arkBuilt === true);
    this.stats.set(stats);
  }
}
