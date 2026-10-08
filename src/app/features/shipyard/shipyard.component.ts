import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RESOURCES_BY_ID, resourceEntries } from '../../core/data/resources.data';
import { SHIPS } from '../../core/data/ships.data';
import { TALENTS_BY_ID } from '../../core/data/talents.data';
import { GameStateService } from '../../core/services/game-state.service';
import { ShipyardService } from '../../core/services/shipyard.service';
import { formatDuration } from '../../shared/format';
import { FormatNumberPipe } from '../../shared/format-number.pipe';

@Component({
  selector: 'app-shipyard',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!shipyard.unlocked()) {
      <section class="panel locked">
        <div class="lock">🏗️</div>
        <h2>Chantier spatial</h2>
        <p class="muted">Construisez un 🏗️ Chantier spatial (catégorie Commerce spatial, talent 🚢 Vaisseaux cargo) pour fabriquer des vaisseaux.</p>
      </section>
    } @else {
      <section class="panel fleet">
        <div class="stat">
          <span class="label">En vol</span>
          <span class="big mono">🚀 {{ fleet().flyingCount }} / {{ fleet().limit }}</span>
          <small class="muted">Limite augmentée par 🛰️ {{ logisticsName }}</small>
        </div>
        <div class="stat">
          <span class="label">Au hangar</span>
          <span class="big mono">🅿️ {{ fleet().hangar }}</span>
          <small class="muted">En attente d’une place en vol</small>
        </div>
        <div class="stat">
          <span class="label">Capacité par voyage</span>
          <span class="big mono">📦 {{ fleet().capacity | fmt: 'int' }}</span>
          <small class="muted">Les plus gros vaisseaux volent en priorité</small>
        </div>
      </section>

      @if (shipyard.current(); as job) {
        <section class="panel current">
          <span class="c-icon">{{ job.def.icon }}</span>
          <div class="c-body">
            <div class="c-head">
              <strong>En construction : {{ job.def.name }}</strong>
              <span class="mono">⏱ {{ duration(job.remaining) }}</span>
            </div>
            <div class="progress"><div [style.width.%]="job.progress * 100"></div></div>
          </div>
          <button class="btn btn-ghost" (click)="shipyard.cancel()" title="Annuler (remboursé)">✕ Annuler</button>
        </section>
      }

      <h3 class="section-title">Choisir le vaisseau à construire</h3>
      <div class="ships">
        @for (s of ships(); track s.def.id) {
          <article class="ship" [class.ready]="s.blocker === null">
            <header>
              <span class="s-icon">{{ s.def.icon }}</span>
              <div class="s-title">
                <h4>{{ s.def.name }}</h4>
                <small class="muted">{{ s.owned }} construit{{ s.owned > 1 ? 's' : '' }} · {{ s.flying }} en vol</small>
              </div>
            </header>
            <p class="muted desc">{{ s.def.description }}</p>
            <p class="capacity">📦 {{ s.capacity | fmt: 'int' }} unités par voyage</p>
            <div class="cost">
              <span class="chip time">⏱ {{ duration(s.duration) }}</span>
              @for (c of s.cost; track c.id) {
                <span class="chip" [class.lacking]="!c.enough">{{ c.icon }} {{ c.amount | fmt }}</span>
              }
            </div>
            @if (s.requires) {
              <small class="warn">🔒 Requiert {{ s.requires }}</small>
            }
            <button class="btn btn-primary" [disabled]="s.blocker !== null" [title]="s.blocker ?? ''" (click)="shipyard.build(s.def.id)">
              Construire
            </button>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .locked { text-align: center; max-width: 640px; margin: 0 auto; }
    .lock { font-size: 3rem; }
    .fleet { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 16px; margin-bottom: 16px; }
    .stat { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .big { font-family: var(--font-display); font-size: 1.3rem; }
    .current { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; border-color: rgba(92, 200, 255, 0.45); }
    .c-icon { font-size: 2rem; }
    .c-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .c-head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .section-title { margin: 0 0 8px; }
    .ships { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 10px; }
    .ship { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); }
    .ship.ready { border-color: rgba(92, 200, 255, 0.45); }
    header { display: flex; align-items: center; gap: 10px; }
    .s-icon { font-size: 2rem; }
    h4 { margin: 0; }
    .desc, .capacity { margin: 0; font-size: 0.82rem; }
    .capacity { color: var(--accent); }
    .cost { display: flex; flex-wrap: wrap; gap: 4px; }
    .chip.lacking { color: var(--danger); border-color: rgba(248, 113, 113, 0.35); }
    .chip.time { color: var(--muted); }
    .warn { color: var(--warning); }
    .ship .btn { margin-top: auto; }
  `,
})
export class ShipyardComponent {
  protected readonly shipyard = inject(ShipyardService);
  private readonly state = inject(GameStateService);

  protected readonly fleet = this.shipyard.fleet;
  protected readonly logisticsName = TALENTS_BY_ID.fleetLogistics.name;

  protected readonly ships = computed(() => {
    const res = this.state.resources();
    const owned = this.state.ships();
    const fleet = this.fleet();
    const talents = this.state.talents();
    const cargoMult = this.state.modifiers().cargoCapacity;
    this.state.shipJob();
    return SHIPS.map((def) => ({
      def,
      owned: owned[def.id] ?? 0,
      flying: fleet.flying[def.id] ?? 0,
      capacity: def.capacity * cargoMult,
      duration: this.shipyard.duration(def.id),
      requires:
        def.requires && !talents.includes(def.requires)
          ? `${TALENTS_BY_ID[def.requires].icon} ${TALENTS_BY_ID[def.requires].name}`
          : null,
      cost: resourceEntries(def.cost).map(([id, amount]) => ({ id, amount, icon: RESOURCES_BY_ID[id].icon, enough: res[id] >= amount })),
      blocker: this.shipyard.blocker(def.id),
    }));
  });

  protected duration(seconds: number): string {
    return formatDuration(Math.ceil(seconds));
  }
}
