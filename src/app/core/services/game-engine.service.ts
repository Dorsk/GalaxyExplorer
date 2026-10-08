import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { BUILDINGS_BY_ID } from '../data/buildings.data';
import { GATHER_TASKS_BY_ID, GATHER_TASK_IDS } from '../data/gathering.data';
import { PLANETS_BY_ID } from '../data/planets.data';
import { RESOURCE_IDS } from '../data/resources.data';
import { arkCost, buildingCost, effectiveGatherers } from '../engine/economy';
import {
  AUTOSAVE_EVERY_TICKS,
  CATCH_UP_THRESHOLD_SECONDS,
  COLONY_START_ASSIGNMENTS,
  COLONY_START_POPULATION,
  COLONY_START_RESOURCES,
  CONSTRUCTION_QUEUE_MAX,
  MAX_CATCH_UP_STEPS,
  MAX_OFFLINE_SECONDS,
  MIN_POPULATION,
  POPULATION_MILESTONES,
  TICK_MS,
} from '../game.config';
import { BuildingId, ConstructionJob, GatherTaskId, PlanetId, ResourceAmounts } from '../models/game.models';
import { formatDuration, formatValue } from '../../shared/format';
import { GameStateService } from './game-state.service';
import { TechTreeService } from './tech-tree.service';
import { ShipyardService } from './shipyard.service';
import { TradeService } from './trade.service';

/**
 * Boucle de jeu (tick chaque seconde via `interval` RxJS) et commandes du joueur.
 * Le temps réellement écoulé est mesuré : un onglet en veille ou une absence est rattrapé par simulation.
 */
@Injectable({ providedIn: 'root' })
export class GameEngineService {
  private readonly state = inject(GameStateService);
  private readonly tree = inject(TechTreeService);
  private readonly trade = inject(TradeService);
  private readonly shipyard = inject(ShipyardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly running = signal(false);
  readonly tickCount = signal(0);

  private lastTick = 0;
  private wasStarving = false;
  private readonly saveOnExit = () => this.state.save();

  start(): void {
    if (this.running()) return;
    this.running.set(true);

    const savedAt = this.state.load();
    if (savedAt === null) {
      this.state.addLog('🌍 Deux humains s’éveillent sur Terre. Répartissez-les entre la cueillette, l’eau, le bois et l’étude des sciences.', 'success');
    } else {
      const away = Math.min(MAX_OFFLINE_SECONDS, (Date.now() - savedAt) / 1000);
      if (away > CATCH_UP_THRESHOLD_SECONDS) {
        const before = this.state.population();
        this.simulate(away);
        this.state.addLog(
          `⏳ Absence de ${formatDuration(away)} : population ${formatValue(before, 'int')} → ${formatValue(this.state.population(), 'int')}.`,
          'info',
        );
      }
    }

    this.lastTick = Date.now();
    interval(TICK_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const now = Date.now();
        const elapsed = (now - this.lastTick) / 1000;
        this.lastTick = now;
        if (elapsed > CATCH_UP_THRESHOLD_SECONDS) this.simulate(Math.min(elapsed, MAX_OFFLINE_SECONDS));
        else this.tick(elapsed, false);

        this.tickCount.update((n) => n + 1);
        if (this.tickCount() % AUTOSAVE_EVERY_TICKS === 0) this.state.save();
      });

    window.addEventListener('beforeunload', this.saveOnExit);
    this.destroyRef.onDestroy(() => window.removeEventListener('beforeunload', this.saveOnExit));
  }

  /** Simule une longue période par pas successifs (progression hors-ligne). */
  private simulate(seconds: number): void {
    const steps = Math.min(MAX_CATCH_UP_STEPS, Math.ceil(seconds));
    const dt = seconds / steps;
    for (let i = 0; i < steps; i++) this.tick(dt, true);
  }

  private tick(dt: number, silent: boolean): void {
    const s = this.state;
    const eco = s.economy();

    const res = s.resources();
    const next = { ...res };
    for (const r of RESOURCE_IDS) next[r] = Math.max(0, res[r] + eco.net[r] * dt);
    s.resources.set(next);

    const before = s.population();
    let pop = before + eco.populationGrowth * dt;
    if (eco.populationGrowth > 0) pop = Math.min(pop, Math.max(before, eco.maxPopulation));
    else if (!eco.starving && before > eco.maxPopulation) pop = Math.max(pop, eco.maxPopulation);
    pop = Math.max(MIN_POPULATION, pop);
    s.population.set(pop);

    this.trimAssignments();
    this.advanceConstruction(dt, silent);
    this.tree.advance(dt);
    this.shipyard.advance(dt, silent);
    this.trade.advance(dt, silent);

    const previousPeak = s.stats().runPeakPopulation;
    s.stats.update((st) => ({
      ...st,
      playTime: st.playTime + dt,
      runTime: st.runTime + dt,
      peakPopulation: Math.max(st.peakPopulation, pop),
      runPeakPopulation: Math.max(st.runPeakPopulation, pop),
    }));

    if (silent) return;
    if (eco.starving && !this.wasStarving) {
      s.addLog('⚠️ Pénurie de nourriture ou d’eau : la population décline !', 'danger');
    }
    this.wasStarving = eco.starving;
    for (const m of POPULATION_MILESTONES) {
      if (previousPeak < m && pop >= m) s.addLog(`🎉 Votre civilisation compte ${formatValue(m, 'int')} habitants !`, 'success');
    }
  }

  // ── Commandes du joueur ───────────────────────────────────────

  /** Quantité obtenue par clic : profite des bonus de production des talents et des colonies. */
  clickYield(task: GatherTaskId): number {
    return GATHER_TASKS_BY_ID[task].clickAmount * this.state.modifiers().production[task];
  }

  /** Récolte manuelle du joueur, en plus du travail des habitants. */
  gather(task: GatherTaskId): void {
    this.state.gain({ [task]: this.clickYield(task) });
    this.state.stats.update((st) => ({ ...st, clicks: st.clicks + 1 }));
  }

  /** Maximum d'habitants qu'une tâche peut recevoir compte tenu des autres affectations. */
  assignmentLimit(task: GatherTaskId): number {
    const values = this.state.assignments();
    const others = GATHER_TASK_IDS.reduce((sum, id) => (id === task ? sum : sum + values[id]), 0);
    return Math.max(0, this.state.freePopulation() - others);
  }

  setAssignment(task: GatherTaskId, value: number): void {
    const v = Math.min(this.assignmentLimit(task), Math.max(0, Math.round(value)));
    this.state.assignments.update((a) => ({ ...a, [task]: v }));
  }

  /** Si les habitants libres diminuent (famine, nouveau bâtiment), on retire des habitants des tâches les moins prioritaires. */
  private trimAssignments(): void {
    const s = this.state;
    const free = s.freePopulation();
    const assigned = GATHER_TASK_IDS.reduce((sum, id) => sum + s.assignments()[id], 0);
    if (assigned > free) s.assignments.set(effectiveGatherers(s.assignments(), free));
  }

  /** Coût du prochain exemplaire : les bâtiments déjà commandés comptent dans la progression du prix. */
  nextBuildingCost(id: BuildingId): ResourceAmounts {
    const owned = (this.state.buildings()[id] ?? 0) + (this.state.pendingBuildings()[id] ?? 0);
    return buildingCost(BUILDINGS_BY_ID[id], owned);
  }

  /** Raison empêchant la construction, ou null si elle est possible. */
  buildBlocker(id: BuildingId): string | null {
    const def = BUILDINGS_BY_ID[id];
    if (!this.state.modifiers().unlockedBuildings.has(id)) return 'Bâtiment non débloqué';
    if (this.state.constructionQueue().length >= CONSTRUCTION_QUEUE_MAX) return 'Un chantier est déjà en cours';
    if (def.maxCount !== undefined && (this.state.buildings()[id] ?? 0) + (this.state.pendingBuildings()[id] ?? 0) >= def.maxCount) {
      return 'Déjà construit';
    }
    const space = this.state.economy().space[def.terrain];
    if (space.used + def.size > space.total) return 'Espace insuffisant';
    if (!this.state.canAfford(this.nextBuildingCost(id))) return 'Ressources insuffisantes';
    return null;
  }

  canBuild(id: BuildingId): boolean {
    return this.buildBlocker(id) === null;
  }

  /** Durée de construction (ou de démolition), réduite par les améliorations du marchand. */
  buildDuration(id: BuildingId): number {
    return Math.ceil(BUILDINGS_BY_ID[id].buildTime * this.state.modifiers().buildTime);
  }

  /** Paie le bâtiment et l'ajoute à la file de construction. */
  build(id: BuildingId): boolean {
    if (!this.canBuild(id)) return false;
    const duration = this.buildDuration(id);
    const paid = this.nextBuildingCost(id);
    this.state.spend(paid);
    const queue = this.state.constructionQueue();
    const uid = queue.reduce((max, job) => Math.max(max, job.uid), 0) + 1;
    this.state.constructionQueue.set([
      ...queue,
      { uid, kind: 'build', building: id, remaining: duration, total: duration, paid },
    ]);
    return true;
  }

  /** Raison empêchant la démolition, ou null si elle est possible. */
  demolishBlocker(id: BuildingId): string | null {
    const owned = this.state.buildings()[id] ?? 0;
    if (owned - (this.state.demolishingBuildings()[id] ?? 0) <= 0) return 'Aucun bâtiment à démolir';
    if (this.state.constructionQueue().length >= CONSTRUCTION_QUEUE_MAX) return 'Un chantier est déjà en cours';
    return null;
  }

  /** Lance la démolition d'un exemplaire : même durée que sa construction, sans remboursement. */
  demolish(id: BuildingId): boolean {
    if (this.demolishBlocker(id) !== null) return false;
    const duration = this.buildDuration(id);
    const queue = this.state.constructionQueue();
    const uid = queue.reduce((max, job) => Math.max(max, job.uid), 0) + 1;
    this.state.constructionQueue.set([
      ...queue,
      { uid, kind: 'demolish', building: id, remaining: duration, total: duration, paid: {} },
    ]);
    return true;
  }

  /** Annule un chantier ; une construction annulée est intégralement remboursée. */
  cancelConstruction(uid: number): void {
    const job = this.state.constructionQueue().find((j) => j.uid === uid);
    if (!job) return;
    this.state.constructionQueue.update((q) => q.filter((j) => j.uid !== uid));
    const name = BUILDINGS_BY_ID[job.building].name;
    if (job.kind === 'demolish') {
      this.state.addLog(`↩️ Démolition annulée : ${name}.`, 'info');
      return;
    }
    this.state.gain(job.paid);
    this.state.addLog(`↩️ Construction annulée : ${name} (remboursé).`, 'info');
  }

  /** Fait avancer la file de construction ; le temps restant d'un chantier terminé profite au suivant. */
  private advanceConstruction(dt: number, silent: boolean): void {
    const s = this.state;
    let queue = s.constructionQueue();
    if (queue.length === 0) return;

    let time = dt;
    const completed: ConstructionJob[] = [];
    while (time > 0 && queue.length > 0) {
      const [job, ...rest] = queue;
      if (job.remaining > time) {
        queue = [{ ...job, remaining: job.remaining - time }, ...rest];
        time = 0;
      } else {
        time -= job.remaining;
        completed.push(job);
        queue = rest;
      }
    }
    s.constructionQueue.set(queue);
    if (completed.length === 0) return;

    s.buildings.update((b) => {
      const next = { ...b };
      for (const job of completed) next[job.building] = Math.max(0, (next[job.building] ?? 0) + (job.kind === 'build' ? 1 : -1));
      return next;
    });
    const built = completed.filter((job) => job.kind === 'build').length;
    if (built > 0) s.stats.update((st) => ({ ...st, buildingsBuilt: st.buildingsBuilt + built }));
    this.trimAssignments();
    if (silent) return;
    for (const job of completed) {
      const def = BUILDINGS_BY_ID[job.building];
      if (job.kind === 'demolish') {
        s.addLog(`🧨 Démolition terminée : ${def.name}.`, 'warning');
        continue;
      }
      const first = s.buildings()[job.building] === 1;
      s.addLog(`${def.icon} ${first ? 'Premier bâtiment' : 'Construction terminée'} : ${def.name}.`, first ? 'success' : 'info');
    }
  }

  // ── Exploration galactique ────────────────────────────────────

  readonly arkCost = computed(() => arkCost(this.state.colonies().length));

  buildArk(): boolean {
    if (!this.state.galaxyUnlocked() || this.state.arkBuilt()) return false;
    if (!this.state.spend(this.arkCost())) return false;
    this.state.arkBuilt.set(true);
    this.state.addLog('🛸 L’Arche Spatiale est prête au lancement !', 'success');
    return true;
  }

  canColonize(planet: PlanetId): boolean {
    return (
      this.state.arkBuilt() &&
      this.state.galaxyUnlocked() &&
      planet !== 'earth' &&
      planet !== this.state.planet() &&
      !this.state.colonies().includes(planet)
    );
  }

  launchArk(planet: PlanetId): boolean {
    if (!this.canColonize(planet)) return false;
    this.state.startNewColony(planet, COLONY_START_POPULATION, COLONY_START_RESOURCES, COLONY_START_ASSIGNMENTS);
    this.wasStarving = false;
    const def = PLANETS_BY_ID[planet];
    this.state.addLog(`🚀 L’Arche a atteint ${def.name} ! Une nouvelle civilisation commence.`, 'success');
    this.state.save();
    return true;
  }
}
