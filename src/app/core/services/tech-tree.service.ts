import { Injectable, computed, inject } from '@angular/core';
import { BRANCHES, TALENTS, TALENTS_BY_ID } from '../data/talents.data';
import { describeEffect } from '../engine/modifiers';
import { researchDuration } from '../game.config';
import { BranchDef, TalentDef, TalentId } from '../models/game.models';
import { formatDuration } from '../../shared/format';
import { GameStateService } from './game-state.service';

export type TalentStatus = 'researched' | 'researching' | 'available' | 'locked';

export interface TalentNode {
  def: TalentDef;
  status: TalentStatus;
  /** Niveau atteint (0 ou 1 pour un talent simple, jusqu'à maxLevel pour un talent à niveaux). */
  level: number;
  /** Coût du prochain niveau. */
  cost: number;
  affordable: boolean;
  missing: readonly TalentDef[];
  /** Le talent exige une colonie fondée (commerce galactique). */
  needsColony: boolean;
  effects: readonly string[];
  /** Durée totale de la recherche du prochain niveau, en secondes. */
  duration: number;
}

export interface BranchView {
  def: BranchDef;
  researched: number;
  total: number;
  tiers: { tier: number; nodes: TalentNode[] }[];
}

const EFFECT_LABELS = Object.fromEntries(TALENTS.map((t) => [t.id, t.effects.map(describeEffect)])) as Record<
  TalentId,
  string[]
>;

/**
 * État et déblocage des trois branches de talents. Une seule recherche à la fois, qui prend du temps.
 * Un talent « à niveaux » peut être recherché plusieurs fois : chaque niveau figure une fois de plus dans la liste
 * des talents de l'état, ce qui cumule naturellement ses effets.
 */
@Injectable({ providedIn: 'root' })
export class TechTreeService {
  private readonly state = inject(GameStateService);

  readonly researched = computed(() => new Set(this.state.talents()));
  readonly levels = computed(() => {
    const counts = new Map<TalentId, number>();
    for (const id of this.state.talents()) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  });

  /** Recherche en cours, avec sa progression (0–1). */
  readonly current = computed(() => {
    const job = this.state.research();
    if (!job) return null;
    return { ...job, def: TALENTS_BY_ID[job.talent], progress: 1 - job.remaining / job.total };
  });

  readonly branches = computed<BranchView[]>(() => {
    const done = this.researched();
    const research = this.state.resources().research;
    const active = this.state.research()?.talent ?? null;
    const colonies = this.state.colonies().length;
    const timeMult = this.state.modifiers().researchTime;

    return BRANCHES.map((def) => {
      const nodes = TALENTS.filter((t) => t.branch === def.id).map((t) => this.toNode(t, done, research, active, colonies, timeMult));
      const tierIds = [...new Set(nodes.map((n) => n.def.tier))].sort((a, b) => a - b);
      return {
        def,
        researched: nodes.filter((n) => n.status === 'researched').length,
        total: nodes.length,
        tiers: tierIds.map((tier) => ({ tier, nodes: nodes.filter((n) => n.def.tier === tier) })),
      };
    });
  });

  readonly availableCount = computed(
    () => this.branches().flatMap((b) => b.tiers.flatMap((t) => t.nodes)).filter((n) => n.status === 'available' && n.affordable).length,
  );

  isResearched(id: TalentId): boolean {
    return this.researched().has(id);
  }

  level(id: TalentId): number {
    return this.levels().get(id) ?? 0;
  }

  maxLevel(t: TalentDef): number {
    return t.repeatable?.maxLevel ?? 1;
  }

  /** Coût du prochain niveau du talent. */
  cost(t: TalentDef): number {
    return Math.ceil(t.cost * Math.pow(t.repeatable?.costGrowth ?? 1, this.level(t.id)));
  }

  /** Durée de recherche du prochain niveau, réduite par l'IA de recherche du marchand. */
  duration(t: TalentDef): number {
    return Math.ceil(researchDuration(this.cost(t)) * this.state.modifiers().researchTime);
  }

  canResearch(id: TalentId): boolean {
    const t = TALENTS_BY_ID[id];
    const done = this.researched();
    return (
      this.state.research() === null &&
      this.level(id) < this.maxLevel(t) &&
      t.requires.every((r) => done.has(r)) &&
      this.state.colonies().length >= (t.requiresColonies ?? 0) &&
      this.state.resources().research >= this.cost(t)
    );
  }

  /** Paie le talent et lance sa recherche. */
  research(id: TalentId): boolean {
    if (!this.canResearch(id)) return false;
    const t = TALENTS_BY_ID[id];
    const duration = this.duration(t);
    this.state.spend({ research: this.cost(t) });
    this.state.research.set({ talent: id, remaining: duration, total: duration });
    this.state.addLog(`🔬 Recherche lancée : ${this.label(t, this.level(id) + 1)} (${formatDuration(duration)}).`, 'info');
    return true;
  }

  /** Abandonne la recherche en cours et rembourse ses points (le niveau n'a pas changé : même coût). */
  cancel(): void {
    const job = this.state.research();
    if (!job) return;
    const t = TALENTS_BY_ID[job.talent];
    this.state.research.set(null);
    this.state.gain({ research: this.cost(t) });
    this.state.addLog(`↩️ Recherche annulée : ${t.name} (points remboursés).`, 'info');
  }

  /** Appelé à chaque tick par la boucle de jeu. */
  advance(dt: number): void {
    const job = this.state.research();
    if (!job) return;
    const remaining = job.remaining - dt;
    if (remaining > 0) {
      this.state.research.set({ ...job, remaining });
      return;
    }
    this.state.research.set(null);
    this.complete(job.talent);
  }

  private complete(id: TalentId): void {
    const t = TALENTS_BY_ID[id];
    if (this.level(id) >= this.maxLevel(t)) return;
    this.state.talents.update((list) => [...list, id]);
    this.state.stats.update((s) => ({ ...s, talentsResearched: s.talentsResearched + 1 }));
    this.state.addLog(`${t.icon} Talent découvert : ${this.label(t, this.level(id))} !`, 'success');
    if (t.effects.some((e) => e.kind === 'unlockGalaxy')) {
      this.state.addLog('🌀 Le Moteur à distorsion est prêt. Les étoiles sont à portée !', 'success');
    }
  }

  private label(t: TalentDef, level: number): string {
    return t.repeatable ? `${t.name} niv. ${level}` : t.name;
  }

  private toNode(
    t: TalentDef,
    done: ReadonlySet<TalentId>,
    research: number,
    active: TalentId | null,
    colonies: number,
    timeMult: number,
  ): TalentNode {
    const level = this.level(t.id);
    const cost = this.cost(t);
    const missing = t.requires.filter((r) => !done.has(r)).map((r) => TALENTS_BY_ID[r]);
    const needsColony = colonies < (t.requiresColonies ?? 0);
    const status: TalentStatus =
      level >= this.maxLevel(t)
        ? 'researched'
        : active === t.id
          ? 'researching'
          : missing.length === 0 && !needsColony
            ? 'available'
            : 'locked';
    return {
      def: t,
      status,
      level,
      cost,
      affordable: research >= cost,
      missing,
      needsColony,
      effects: EFFECT_LABELS[t.id],
      duration: Math.ceil(researchDuration(cost) * timeMult),
    };
  }
}
