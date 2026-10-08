import { MerchantUpgradeDef, MerchantUpgradeId, TradeGoodId, TradeOrders } from '../models/game.models';

export const TRADE_GOOD_IDS: readonly TradeGoodId[] = ['food', 'water', 'wood', 'energy'];

/** Prix de base en crédits par unité ; le cours oscille de ±30 % autour (période propre à chaque ressource). */
export const TRADE_GOODS: readonly { id: TradeGoodId; basePrice: number; periodSeconds: number; phase: number }[] = [
  { id: 'food', basePrice: 0.01, periodSeconds: 900, phase: 0 },
  { id: 'water', basePrice: 0.01, periodSeconds: 1200, phase: 2.1 },
  { id: 'wood', basePrice: 0.02, periodSeconds: 1500, phase: 4.2 },
  { id: 'energy', basePrice: 0.04, periodSeconds: 1800, phase: 1.3 },
];

export const PRICE_SWING = 0.3;

/** Aucune vente activée par défaut : le commerce reste facultatif. */
export function defaultTradeOrders(): TradeOrders {
  return {
    food: { enabled: false, reserve: 0 },
    water: { enabled: false, reserve: 0 },
    wood: { enabled: false, reserve: 0 },
    energy: { enabled: false, reserve: 0 },
  };
}

export const MERCHANT_UPGRADES: readonly MerchantUpgradeDef[] = [
  {
    id: 'cargoEngines', name: 'Moteurs de cargo', icon: '🚀', baseCost: 2_000, costGrowth: 2, maxLevel: 10,
    description: 'Des soutes plus grandes et des moteurs plus puissants.',
    effect: { kind: 'cargoCapacity', value: 0.5 },
  },
  {
    id: 'exoticSeeds', name: 'Semences exotiques', icon: '🌱', baseCost: 5_000, costGrowth: 2, maxLevel: 10,
    description: 'Des cultures venues d’autres mondes.',
    effect: { kind: 'production', resource: 'food', value: 0.1 },
  },
  {
    id: 'energyCrystals', name: 'Cristaux d’énergie', icon: '💎', baseCost: 8_000, costGrowth: 2, maxLevel: 10,
    description: 'Des cristaux qui amplifient les réseaux électriques.',
    effect: { kind: 'production', resource: 'energy', value: 0.1 },
  },
  {
    id: 'ancientArchives', name: 'Archives anciennes', icon: '📜', baseCost: 10_000, costGrowth: 2, maxLevel: 10,
    description: 'Le savoir d’une civilisation disparue.',
    effect: { kind: 'production', resource: 'research', value: 0.1 },
  },
  {
    id: 'constructionDrones', name: 'Drones de construction', icon: '🤖', baseCost: 15_000, costGrowth: 2.5, maxLevel: 5,
    description: 'Des essaims de drones qui bâtissent sans relâche.',
    effect: { kind: 'buildTime', value: -0.1 },
  },
  {
    id: 'researchAI', name: 'IA de recherche', icon: '🧠', baseCost: 20_000, costGrowth: 2.5, maxLevel: 5,
    description: 'Une intelligence artificielle qui accélère les découvertes.',
    effect: { kind: 'researchTime', value: -0.1 },
  },
];

export const MERCHANT_UPGRADES_BY_ID = Object.fromEntries(MERCHANT_UPGRADES.map((u) => [u.id, u])) as Record<
  MerchantUpgradeId,
  MerchantUpgradeDef
>;

/** Cours d'une ressource à un instant donné (temps de jeu total) : déterministe, donc identique hors-ligne. */
export function marketPrice(good: TradeGoodId, time: number): number {
  const g = TRADE_GOODS.find((t) => t.id === good)!;
  return g.basePrice * (1 + PRICE_SWING * Math.sin((2 * Math.PI * time) / g.periodSeconds + g.phase));
}

export function upgradeCost(def: MerchantUpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level));
}
