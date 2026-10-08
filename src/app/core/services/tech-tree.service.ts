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
  affordable: boolean;
  missing: readonly TalentDef[];
  effects: readonly string[];
  /** Durée totale de la recherche, en secondes. */
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

/** État et déblocage des trois branches de talents. Une seule recherche à la fois, qui prend du temps. */
@Injectable({ providedIn: 'root' })
export class TechTreeService {
  private readonly state = inject(GameStateService);

  readonly researched = computed(() => new Set(this.state.talents()));
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

    return BRANCHES.map((def) => {
      const nodes = TALENTS.filter((t) => t.branch === def.id).map((t) => this.toNode(t, done, research, active));
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

  canResearch(id: TalentId): boolean {
    const t = TALENTS_BY_ID[id];
    const done = this.researched();
    return (
      this.state.research() === null &&
      !done.has(id) &&
      t.requires.every((r) => done.has(r)) &&
      this.state.resources().research >= t.cost
    );
  }

  /** Paie le talent et lance sa recherche. */
  research(id: TalentId): boolean {
    if (!this.canResearch(id)) return false;
    const t = TALENTS_BY_ID[id];
    const duration = researchDuration(t.cost);
    this.state.spend({ research: t.cost });
    this.state.research.set({ talent: id, remaining: duration, total: duration });
    this.state.addLog(`🔬 Recherche lancée : ${t.name} (${formatDuration(duration)}).`, 'info');
    return true;
  }

  /** Abandonne la recherche en cours et rembourse ses points. */
  cancel(): void {
    const job = this.state.research();
    if (!job) return;
    const t = TALENTS_BY_ID[job.talent];
    this.state.research.set(null);
    this.state.gain({ research: t.cost });
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
    this.state.talents.update((list) => (list.includes(id) ? list : [...list, id]));
    this.state.stats.update((s) => ({ ...s, talentsResearched: s.talentsResearched + 1 }));
    this.state.addLog(`${t.icon} Talent découvert : ${t.name} !`, 'success');
    if (t.effects.some((e) => e.kind === 'unlockGalaxy')) {
      this.state.addLog('🌀 Le Moteur à distorsion est prêt. Les étoiles sont à portée !', 'success');
    }
  }

  private toNode(t: TalentDef, done: ReadonlySet<TalentId>, research: number, active: TalentId | null): TalentNode {
    const missing = t.requires.filter((r) => !done.has(r)).map((r) => TALENTS_BY_ID[r]);
    const status: TalentStatus = done.has(t.id)
      ? 'researched'
      : active === t.id
        ? 'researching'
        : missing.length === 0
          ? 'available'
          : 'locked';
    return {
      def: t,
      status,
      affordable: research >= t.cost,
      missing,
      effects: EFFECT_LABELS[t.id],
      duration: researchDuration(t.cost),
    };
  }
}
