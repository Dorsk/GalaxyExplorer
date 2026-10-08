import { Injectable, computed, inject, signal } from '@angular/core';
import { MERCHANT_UPGRADES_BY_ID, TRADE_GOOD_IDS, marketPrice, upgradeCost } from '../data/trade.data';
import { TRADE_TRIP_SECONDS } from '../game.config';
import { MerchantUpgradeId, TradeGoodId } from '../models/game.models';
import { formatValue } from '../../shared/format';
import { GameStateService } from './game-state.service';
import { ShipyardService } from './shipyard.service';

export interface TripReport {
  time: number;
  sold: Partial<Record<TradeGoodId, number>>;
  credits: number;
}

/**
 * Commerce galactique (facultatif) : les vaisseaux cargo emportent à chaque voyage le surplus
 * des ressources dont la vente est activée et le vendent au marchand contre des crédits.
 */
@Injectable({ providedIn: 'root' })
export class TradeService {
  private readonly state = inject(GameStateService);
  private readonly shipyard = inject(ShipyardService);

  readonly unlocked = computed(() => this.state.modifiers().tradeUnlocked);
  /** Vaisseaux en vol (limités par la Logistique de flotte) et capacité totale par voyage. */
  readonly ships = computed(() => this.shipyard.fleet().flyingCount);
  readonly capacity = computed(() => this.shipyard.fleet().capacity);
  readonly lastTrip = signal<TripReport | null>(null);

  /** Cours actuel de chaque ressource, et sa tendance sur la dernière minute. */
  readonly prices = computed(() => {
    const t = this.state.stats().playTime;
    return TRADE_GOOD_IDS.map((id) => {
      const price = marketPrice(id, t);
      return { id, price, trend: price - marketPrice(id, t - 60) };
    });
  });

  /** Quantité vendable de chaque ressource (au-dessus de la réserve, si la vente est activée). */
  readonly surplus = computed(() => {
    const res = this.state.resources();
    const orders = this.state.tradeOrders();
    const out = {} as Record<TradeGoodId, number>;
    for (const id of TRADE_GOOD_IDS) out[id] = orders[id].enabled ? Math.max(0, res[id] - orders[id].reserve) : 0;
    return out;
  });

  readonly secondsToDeparture = computed(() => Math.max(0, TRADE_TRIP_SECONDS - this.state.tradeTimer()));

  setOrder(id: TradeGoodId, change: { enabled?: boolean; reserve?: number }): void {
    this.state.tradeOrders.update((orders) => ({
      ...orders,
      [id]: {
        enabled: change.enabled ?? orders[id].enabled,
        reserve: Math.max(0, Math.floor(change.reserve ?? orders[id].reserve)),
      },
    }));
  }

  /** Appelé à chaque tick : la flotte part toutes les TRADE_TRIP_SECONDS si le commerce est actif. */
  advance(dt: number, silent: boolean): void {
    if (!this.unlocked() || this.ships() === 0) return;
    let timer = this.state.tradeTimer() + dt;
    while (timer >= TRADE_TRIP_SECONDS) {
      timer -= TRADE_TRIP_SECONDS;
      this.trip(silent);
    }
    this.state.tradeTimer.set(timer);
  }

  private trip(silent: boolean): void {
    const surplus = this.surplus();
    const total = TRADE_GOOD_IDS.reduce((sum, id) => sum + surplus[id], 0);
    if (total <= 0) return;

    // La cargaison est répartie entre les ressources au prorata de leur surplus.
    const load = Math.min(this.capacity(), total);
    const sold: Partial<Record<TradeGoodId, number>> = {};
    let credits = 0;
    const time = this.state.stats().playTime;
    for (const id of TRADE_GOOD_IDS) {
      const amount = Math.floor((surplus[id] / total) * load);
      if (amount <= 0) continue;
      sold[id] = amount;
      credits += amount * marketPrice(id, time);
    }
    if (credits <= 0) return;

    this.state.resources.update((r) => {
      const next = { ...r };
      for (const id of TRADE_GOOD_IDS) next[id] = Math.max(0, next[id] - (sold[id] ?? 0));
      return next;
    });
    this.state.credits.update((c) => c + credits);
    this.lastTrip.set({ time: Date.now(), sold, credits });
    if (!silent) this.state.addLog(`🚢 Cargaison vendue au marchand : +${formatValue(credits)} 💰.`, 'success');
  }

  // ── Boutique du marchand ──────────────────────────────────────

  level(id: MerchantUpgradeId): number {
    return this.state.merchantLevels()[id] ?? 0;
  }

  /** Prix du prochain niveau, ou null si le niveau maximum est atteint. */
  nextCost(id: MerchantUpgradeId): number | null {
    const def = MERCHANT_UPGRADES_BY_ID[id];
    const level = this.level(id);
    return level >= def.maxLevel ? null : upgradeCost(def, level);
  }

  buy(id: MerchantUpgradeId): boolean {
    const cost = this.nextCost(id);
    if (!this.unlocked() || cost === null || this.state.credits() < cost) return false;
    this.state.credits.update((c) => c - cost);
    this.state.merchantLevels.update((levels) => ({ ...levels, [id]: this.level(id) + 1 }));
    const def = MERCHANT_UPGRADES_BY_ID[id];
    this.state.addLog(`${def.icon} Amélioration achetée : ${def.name} (niveau ${this.level(id)}).`, 'success');
    return true;
  }
}
