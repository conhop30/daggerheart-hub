import type { Rarity } from './lootRarity';
import { RARITY_POOLS } from './lootRarity';

// Pure dice math — no IPC, no store access — so the Loot Roller can call
// this directly and so it's deterministically testable via an injectable
// rng instead of mocking Math.random.
export function rollD12Pool(size: number, rng: () => number = Math.random): number[] {
  return Array.from({ length: size }, () => Math.floor(rng() * 12) + 1);
}

export function sumPool(dice: number[]): number {
  return dice.reduce((total, die) => total + die, 0);
}

// The corebook mechanic: sum the pool, look up that exact position in the
// table. No clamping or wraparound — a position nothing was placed at is a
// valid "nothing found" result, signaled by returning null.
export function resolveTableRoll<E extends { position: number }>(entries: E[], total: number): E | null {
  return entries.find((entry) => entry.position === total) ?? null;
}

// The GM's choice of *which* pool size to roll for a rarity — Common is
// 1d12 or 2d12, Uncommon 2d12 or 3d12, and so on, straight from the
// corebook's item-rarity guide.
export function rarityPoolSizes(rarity: Rarity): [number, number] {
  return RARITY_POOLS[rarity];
}
