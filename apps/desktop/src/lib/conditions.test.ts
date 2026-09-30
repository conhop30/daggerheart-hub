import { describe, expect, it } from 'vitest';
import { conditionEffect, difficultyModifierFromConditions } from './conditions';

describe('conditionEffect', () => {
  it('matches a known condition case-insensitively', () => {
    expect(conditionEffect('Corrosive')).toEqual({ difficultyPerStack: -1 });
    expect(conditionEffect('corrosive')).toEqual({ difficultyPerStack: -1 });
  });

  it('returns undefined for an unrecognized condition', () => {
    expect(conditionEffect('Restrained')).toBeUndefined();
  });
});

describe('difficultyModifierFromConditions', () => {
  it('sums a stacked known condition\'s effect by its count', () => {
    expect(difficultyModifierFromConditions([{ name: 'Corrosive', count: 3 }])).toBe(-3);
  });

  it('ignores conditions with no known effect', () => {
    expect(difficultyModifierFromConditions([{ name: 'Restrained', count: 2 }])).toBe(0);
  });

  it('sums across a mix of known and unknown conditions', () => {
    expect(
      difficultyModifierFromConditions([
        { name: 'Corrosive', count: 2 },
        { name: 'Restrained', count: 1 },
      ]),
    ).toBe(-2);
  });
});
