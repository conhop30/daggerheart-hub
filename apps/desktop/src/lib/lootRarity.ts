// Mirrors the RARITIES/RARITY_MAX constants in electron/store.js — main and
// renderer don't share modules today, so this is deliberately duplicated;
// keep both in sync if the corebook's item-rarity table ever changes.
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';

export const RARITIES: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'];

// The highest table position each rarity can hold — the larger of that
// rarity's two valid pool sizes rolled at once (5d12 max, so LEGENDARY
// tops out at 60). A table can be sparse; an unfilled position is a valid
// "nothing found" result at roll time, so there's no wraparound to worry
// about.
export const RARITY_MAX: Record<Rarity, number> = {
  COMMON: 24,
  UNCOMMON: 36,
  RARE: 48,
  LEGENDARY: 60,
};

// Each rarity supports one of two dice-pool sizes at roll time, straight
// from the corebook's Common/Uncommon/Rare/Legendary items table — the GM
// picks which one to roll.
export const RARITY_POOLS: Record<Rarity, [number, number]> = {
  COMMON: [1, 2],
  UNCOMMON: [2, 3],
  RARE: [3, 4],
  LEGENDARY: [4, 5],
};

export interface RarityEntries<E> {
  COMMON: E[];
  UNCOMMON: E[];
  RARE: E[];
  LEGENDARY: E[];
}

export function emptyRarityEntries<E>(): RarityEntries<E> {
  return { COMMON: [], UNCOMMON: [], RARE: [], LEGENDARY: [] };
}
