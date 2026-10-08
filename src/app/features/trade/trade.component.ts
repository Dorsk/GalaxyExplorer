import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MERCHANT_UPGRADES } from '../../core/data/trade.data';
import { RESOURCES_BY_ID } from '../../core/data/resources.data';
import { TALENTS_BY_ID } from '../../core/data/talents.data';
import { describeEffect } from '../../core/engine/modifiers';
import { TRADE_TRIP_SECONDS } from '../../core/game.config';
import { TradeGoodId } from '../../core/models/game.models';
import { GameStateService } from '../../core/services/game-state.service';
import { TechTreeService } from '../../core/services/tech-tree.service';
import { TradeService } from '../../core/services/trade.service';
import { formatDuration } from '../../shared/format';
import { FormatNumberPipe } from '../../shared/format-number.pipe';

@Component({
  selector: 'app-trade',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!trade.unlocked()) {
      <section class="panel locked">
        <div class="lock">🛒</div>
        <h2>Commerce galactique</h2>
        <p class="muted">
          Facultatif : vendez vos surplus au marchand galactique contre des crédits, et achetez-lui des améliorations
          permanentes. Vous pouvez continuer à explorer la galaxie et y revenir plus tard.
        </p>
        <ul class="reqs">
          @for (r of requirements(); track r.label) {
            <li [class.ok]="r.ok">{{ r.ok ? '✅' : '⬜' }} {{ r.label }}</li>
          }
        </ul>
      </section>
    } @else {
      <section class="panel fleet">
        <div class="stat">
          <span class="label">Crédits</span>
          <span class="big mono">💰 {{ credits() | fmt }}</span>
        </div>
        <div class="stat">
          <span class="label">Flotte cargo</span>
          <span class="mono">🚀 {{ trade.ships() }} en vol / {{ fleetLimit() }} max</span>
          <small class="muted">{{ trade.capacity() | fmt: 'int' }} unités par voyage</small>
        </div>
        <div class="stat departure">
          <span class="label">Prochain départ</span>
          @if (trade.ships() > 0) {
            <span class="mono">⏱ {{ departure() }}</span>
            <div class="progress"><div [style.width.%]="departureProgress()"></div></div>
          } @else {
            <small class="warn">Construisez un 🏗️ Chantier spatial, puis des vaisseaux dans l’onglet Chantier spatial.</small>
          }
        </div>
        @if (trade.lastTrip(); as trip) {
          <div class="stat">
            <span class="label">Dernière cargaison</span>
            <span class="mono pos">+{{ trip.credits | fmt }} 💰</span>
          </div>
        }
      </section>

      <section class="panel">
        <h3>📈 Marché</h3>
        <p class="muted hint">
          Activez la vente d’une ressource et fixez la réserve à garder : à chaque départ, les vaisseaux emportent ce qui
          dépasse la réserve. Les cours varient avec le temps.
        </p>
        <div class="goods">
          @for (g of goods(); track g.id) {
            <div class="good" [class.on]="g.enabled">
              <div class="g-head">
                <span class="g-name">{{ g.icon }} {{ g.name }}</span>
                <span class="mono price" [class.up]="g.trend > 0" [class.down]="g.trend < 0">
                  {{ g.trend > 0 ? '▲' : g.trend < 0 ? '▼' : '' }} {{ g.price * 1000 | fmt }} 💰 / 1 K
                </span>
              </div>
              <div class="g-row muted">
                <span>Stock {{ g.stock | fmt }}</span>
                <span>À vendre {{ g.surplus | fmt }}</span>
              </div>
              <label class="toggle">
                <input type="checkbox" [checked]="g.enabled" (change)="toggle(g.id, $event)" />
                Vendre le surplus
              </label>
              <label class="reserve">
                Garder au moins
                <input
                  type="number"
                  min="0"
                  step="1000"
                  [value]="g.reserve"
                  (change)="setReserve(g.id, $event)"
                />
              </label>
            </div>
          }
        </div>
      </section>

      <section class="panel">
        <h3>🏪 Boutique du marchand</h3>
        <p class="muted hint">Améliorations permanentes : elles sont conservées sur toutes vos futures colonies.</p>
        <div class="shop">
          @for (u of upgrades(); track u.def.id) {
            <article class="upgrade">
              <div class="u-head">
                <span class="u-icon">{{ u.def.icon }}</span>
                <div class="u-title">
                  <strong>{{ u.def.name }}</strong>
                  <small class="muted">Niveau {{ u.level }} / {{ u.def.maxLevel }}</small>
                </div>
              </div>
              <p class="muted u-desc">{{ u.def.description }}</p>
              <p class="u-effect">{{ u.effect }} par niveau</p>
              @if (u.cost !== null) {
                <button class="btn btn-primary" [disabled]="credits() < u.cost" (click)="trade.buy(u.def.id)">
                  Acheter · 💰 {{ u.cost | fmt }}
                </button>
              } @else {
                <span class="maxed">✓ Niveau maximum</span>
              }
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .locked { text-align: center; max-width: 640px; margin: 0 auto; }
    .lock { font-size: 3rem; }
    .reqs { list-style: none; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 8px; }
    .reqs li { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); }
    .reqs li.ok { border-color: rgba(74, 222, 128, 0.5); }
    .fleet { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 16px; margin-bottom: 16px; }
    .stat { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .big { font-family: var(--font-display); font-size: 1.4rem; }
    .warn { color: var(--warning); }
    .pos { color: var(--success); }
    section + section { margin-top: 16px; }
    h3 { margin: 0 0 4px; }
    .hint { margin: 0 0 12px; font-size: 0.82rem; }
    .goods { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; }
    .good { padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; }
    .good.on { border-color: rgba(74, 222, 128, 0.45); }
    .g-head, .g-row { display: flex; justify-content: space-between; gap: 8px; }
    .g-name { font-weight: 600; }
    .price { white-space: nowrap; }
    .price.up { color: var(--success); }
    .price.down { color: var(--danger); }
    .g-row { font-size: 0.78rem; }
    .toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .toggle input { accent-color: var(--success); }
    .reserve { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.8rem; color: var(--muted); }
    .reserve input { width: 110px; background: rgba(0, 0, 0, 0.3); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 3px 6px; font: inherit; }
    .shop { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 10px; }
    .upgrade { padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); display: flex; flex-direction: column; gap: 6px; }
    .u-head { display: flex; align-items: center; gap: 10px; }
    .u-icon { font-size: 1.6rem; }
    .u-title { display: flex; flex-direction: column; }
    .u-desc, .u-effect { margin: 0; font-size: 0.8rem; }
    .u-effect { color: var(--accent); }
    .upgrade .btn { margin-top: auto; }
    .maxed { margin-top: auto; color: var(--success); font-size: 0.85rem; }
  `,
})
export class TradeComponent {
  protected readonly trade = inject(TradeService);
  private readonly state = inject(GameStateService);
  private readonly tree = inject(TechTreeService);

  protected readonly credits = this.state.credits;
  protected readonly fleetLimit = computed(() => this.state.modifiers().fleetSize);

  protected readonly requirements = computed(() => [
    { label: 'Fonder une première colonie avec l’Arche Spatiale', ok: this.state.colonies().length > 0 },
    { label: `Rechercher ${TALENTS_BY_ID.cargoShips.icon} ${TALENTS_BY_ID.cargoShips.name}`, ok: this.tree.isResearched('cargoShips') },
    {
      label: `Rechercher ${TALENTS_BY_ID.galacticMerchant.icon} ${TALENTS_BY_ID.galacticMerchant.name}`,
      ok: this.tree.isResearched('galacticMerchant'),
    },
  ]);

  protected readonly departure = computed(() => formatDuration(Math.ceil(this.trade.secondsToDeparture())));
  protected readonly departureProgress = computed(() => (1 - this.trade.secondsToDeparture() / TRADE_TRIP_SECONDS) * 100);

  protected readonly goods = computed(() => {
    const res = this.state.resources();
    const orders = this.state.tradeOrders();
    const surplus = this.trade.surplus();
    return this.trade.prices().map((p) => ({
      ...p,
      icon: RESOURCES_BY_ID[p.id].icon,
      name: RESOURCES_BY_ID[p.id].name,
      stock: res[p.id],
      surplus: surplus[p.id],
      enabled: orders[p.id].enabled,
      reserve: orders[p.id].reserve,
    }));
  });

  protected readonly upgrades = computed(() => {
    this.state.merchantLevels();
    return MERCHANT_UPGRADES.map((def) => ({
      def,
      level: this.trade.level(def.id),
      cost: this.trade.nextCost(def.id),
      effect: describeEffect(def.effect),
    }));
  });

  protected toggle(id: TradeGoodId, event: Event): void {
    this.trade.setOrder(id, { enabled: (event.target as HTMLInputElement).checked });
  }

  protected setReserve(id: TradeGoodId, event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.trade.setOrder(id, { reserve: Number.isFinite(value) ? value : 0 });
  }
}
