import { describe, expect, it } from 'vitest';
import { rarityPoolSizes, resolveTableRoll, rollD12Pool, sumPool } from './lootRoll';

describe('rollD12Pool', () => {
  it('rolls the requested number of d12s, each between 1 and 12', () => {
    const dice = rollD12Pool(5, () => 0.999999);
    expect(dice).toHaveLength(5);
    expect(dice.every((d) => d === 12)).toBe(true);
  });

  it('the lowest possible roll is 1, not 0', () => {
    const dice = rollD12Pool(3, () => 0);
    expect(dice).toEqual([1, 1, 1]);
  });

  it('is deterministic given a fixed sequence of rng values', () => {
    const values = [0, 0.5, 0.999];
    let calls = 0;
    const rng = () => values[calls++];
    expect(rollD12Pool(3, rng)).toEqual([1, 7, 12]);
  });
});

describe('sumPool', () => {
  it('adds every die together', () => {
    expect(sumPool([1, 2, 3])).toBe(6);
  });

  it('sums to 0 for an empty pool', () => {
    expect(sumPool([])).toBe(0);
  });
});

describe('resolveTableRoll', () => {
  const entries = [
    { position: 3, lootId: 'a' },
    { position: 7, lootId: 'b' },
  ];

  it('finds the entry at the exact rolled position', () => {
    expect(resolveTableRoll(entries, 7)).toEqual({ position: 7, lootId: 'b' });
  });

  it('returns null for an unfilled position instead of clamping or wrapping', () => {
    expect(resolveTableRoll(entries, 1)).toBeNull();
    expect(resolveTableRoll(entries, 100)).toBeNull();
  });
});

describe('rarityPoolSizes', () => {
  it('matches the corebook Common/Uncommon/Rare/Legendary pool guide', () => {
    expect(rarityPoolSizes('COMMON')).toEqual([1, 2]);
    expect(rarityPoolSizes('UNCOMMON')).toEqual([2, 3]);
    expect(rarityPoolSizes('RARE')).toEqual([3, 4]);
    expect(rarityPoolSizes('LEGENDARY')).toEqual([4, 5]);
  });
});
