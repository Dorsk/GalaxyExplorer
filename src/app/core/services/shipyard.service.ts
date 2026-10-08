import { Injectable, computed, inject } from '@angular/core';
import { SHIPS, SHIPS_BY_ID } from '../data/ships.data';
import { TALENTS_BY_ID } from '../data/talents.data';
import { ShipCounts, ShipTypeId } from '../models/game.models';
import { formatDuration } from '../../shared/format';
import { GameStateService } from './game-state.service';

export interface Fleet {
  /** Vaisseaux construits, au total. */
  total: number;
  /** Nombre maximal de vaisseaux en vol (talent Logistique de flotte). */
  limit: number;
  flyingCount: number;
  /** Vaisseaux en vol par modèle : les plus gros volent en priorité. */
  flying: ShipCounts;
  hangar: number;
  /** Unités transportées par voyage, améliorations comprises. */
  capacity: number;
}

/** Chantier spatial : construction des vaisseaux cargo (un à la fois, nombre illimité). */
@Injectable({ providedIn: 'root' })
export class ShipyardService {
  private readonly state = inject(GameStateService);

  /** Le chantier spatial est construit : l'onglet est disponible. */
  readonly unlocked = computed(() => (this.state.buildings().spaceShipyard ?? 0) > 0);

  readonly fleet = computed<Fleet>(() => {
    const counts = this.state.ships();
    const mods = this.state.modifiers();
    let slots = mods.fleetSize;
    let total = 0;
    let capacity = 0;
    const flying: ShipCounts = {};
    for (const ship of [...SHIPS].sort((a, b) => b.capacity - a.capacity)) {
      const n = counts[ship.id] ?? 0;
      total += n;
      const f = Math.min(n, slots);
      if (f > 0) flying[ship.id] = f;
      slots -= f;
      capacity += f * ship.capacity;
    }
    const flyingCount = mods.fleetSize - slots;
    return { total, limit: mods.fleetSize, flyingCount, flying, hangar: total - flyingCount, capacity: capacity * mods.cargoCapacity };
  });

  /** Vaisseau en construction, avec sa progression (0–1). */
  readonly current = computed(() => {
    const job = this.state.shipJob();
    if (!job) return null;
    return { ...job, def: SHIPS_BY_ID[job.ship], progress: 1 - job.remaining / job.total };
  });

  /** Durée de construction, réduite par les drones de construction du marchand. */
  duration(id: ShipTypeId): number {
    return Math.ceil(SHIPS_BY_ID[id].buildTime * this.state.modifiers().buildTime);
  }

  /** Raison empêchant la construction, ou null si elle est possible. */
  blocker(id: ShipTypeId): string | null {
    const def = SHIPS_BY_ID[id];
    if (!this.unlocked()) return 'Construisez d’abord un chantier spatial';
    if (def.requires && !this.state.talents().includes(def.requires)) {
      return `Requiert ${TALENTS_BY_ID[def.requires].icon} ${TALENTS_BY_ID[def.requires].name}`;
    }
    if (this.state.shipJob()) return 'Un vaisseau est déjà en construction';
    if (!this.state.canAfford(def.cost)) return 'Ressources insuffisantes';
    return null;
  }

  build(id: ShipTypeId): boolean {
    if (this.blocker(id) !== null) return false;
    const def = SHIPS_BY_ID[id];
    const duration = this.duration(id);
    this.state.spend(def.cost);
    this.state.shipJob.set({ ship: id, remaining: duration, total: duration, paid: { ...def.cost } });
    this.state.addLog(`🏗️ Construction lancée : ${def.icon} ${def.name} (${formatDuration(duration)}).`, 'info');
    return true;
  }

  /** Annule la construction en cours et rembourse intégralement. */
  cancel(): void {
    const job = this.state.shipJob();
    if (!job) return;
    this.state.shipJob.set(null);
    this.state.gain(job.paid);
    this.state.addLog(`↩️ Construction annulée : ${SHIPS_BY_ID[job.ship].name} (remboursé).`, 'info');
  }

  /** Appelé à chaque tick par la boucle de jeu. */
  advance(dt: number, silent: boolean): void {
    const job = this.state.shipJob();
    if (!job) return;
    const remaining = job.remaining - dt;
    if (remaining > 0) {
      this.state.shipJob.set({ ...job, remaining });
      return;
    }
    this.state.shipJob.set(null);
    this.state.ships.update((s) => ({ ...s, [job.ship]: (s[job.ship] ?? 0) + 1 }));
    const def = SHIPS_BY_ID[job.ship];
    if (!silent) this.state.addLog(`${def.icon} Vaisseau livré : ${def.name}.`, 'success');
  }
}
