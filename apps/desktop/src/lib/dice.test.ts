import { describe, expect, it } from 'vitest';
import { parseDamageNotation, rollDamage, rollDice, rollDiceQueue, rollDie } from './dice';

describe('rollDie', () => {
  it('the lowest possible roll is 1, not 0', () => {
    expect(rollDie(20, () => 0)).toBe(1);
  });

  it('the highest possible roll equals the die size', () => {
    expect(rollDie(20, () => 0.999999)).toBe(20);
  });
});

describe('rollDice', () => {
  it('rolls the requested count, each within range', () => {
    const dice = rollDice(4, 6, () => 0.999999);
    expect(dice).toEqual([6, 6, 6, 6]);
  });

  it('is deterministic given a fixed sequence of rng values', () => {
    const values = [0, 0.5, 0.999];
    let calls = 0;
    const rng = () => values[calls++];
    expect(rollDice(3, 12, rng)).toEqual([1, 7, 12]);
  });
});

describe('parseDamageNotation', () => {
  it('parses "count d sides + modifier"', () => {
    expect(parseDamageNotation('Claws: 1d12+2 phy damage')).toEqual({ count: 1, sides: 12, modifier: 2 });
  });

  it('parses dice with no modifier', () => {
    expect(parseDamageNotation('Fist Slam: 1d20 phy damage')).toEqual({ count: 1, sides: 20, modifier: 0 });
  });

  it('parses a negative modifier', () => {
    expect(parseDamageNotation('Curse: 2d6-1 magic damage')).toEqual({ count: 2, sides: 6, modifier: -1 });
  });

  it('parses a flat value with no dice at all', () => {
    expect(parseDamageNotation('Claws: 1 phy damage')).toEqual({ count: 0, sides: 0, modifier: 1 });
  });

  it('returns null for text with no number in it', () => {
    expect(parseDamageNotation('Grapple')).toBeNull();
  });

  it('returns null for empty/missing text', () => {
    expect(parseDamageNotation(null)).toBeNull();
    expect(parseDamageNotation('')).toBeNull();
  });
});

describe('rollDamage', () => {
  it('sums the dice and adds the modifier', () => {
    const values = [0.5, 0.5];
    let calls = 0;
    const rng = () => values[calls++];
    expect(rollDamage({ count: 2, sides: 8, modifier: 3 }, rng)).toEqual({ rolls: [5, 5], modifier: 3, total: 13 });
  });

  it('a flat (diceless) value just returns the modifier as the total', () => {
    expect(rollDamage({ count: 0, sides: 0, modifier: 4 })).toEqual({ rolls: [], modifier: 4, total: 4 });
  });
});

describe('rollDiceQueue', () => {
  it('rolls every queued size and sums them all into one total', () => {
    const values = [0, 0.5, 0.999];
    let calls = 0;
    const rng = () => values[calls++];
    const result = rollDiceQueue(
      [
        { sides: 6, count: 2 },
        { sides: 20, count: 1 },
      ],
      rng,
    );
    expect(result.entries).toEqual([
      { sides: 6, rolls: [1, 4] },
      { sides: 20, rolls: [20] },
    ]);
    expect(result.total).toBe(25);
  });

  it('ignores queue entries with a zero count', () => {
    const result = rollDiceQueue([{ sides: 6, count: 0 }], () => 0);
    expect(result.entries).toEqual([]);
    expect(result.total).toBe(0);
  });
});
