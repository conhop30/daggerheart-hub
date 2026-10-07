import { describe, expect, it } from 'vitest';
import { computeBattlePoints, tierForLevel, type BattlePointsCombatant } from './battlePoints';

const of = (type: BattlePointsCombatant['type'], count = 1, tier: number | null = 1): BattlePointsCombatant => ({ type, count, tier });
const input = (combatants: BattlePointsCombatant[], extra = {}) => ({
  partySize: 4,
  partyTier: 1,
  combatants,
  easier: false,
  harder: false,
  bonusDamage: false,
  ...extra,
});
const applied = (r: ReturnType<typeof computeBattlePoints>) => r.adjustments.filter((a) => a.applied).map((a) => a.key);

describe('tierForLevel', () => {
  it('maps the level bands to tiers', () => {
    expect([1, 2, 4, 5, 7, 8, 10].map(tierForLevel)).toEqual([1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('computeBattlePoints', () => {
  it('budgets (3 x PCs) + 2', () => {
    expect(computeBattlePoints(input([])).base).toBe(14);
    expect(computeBattlePoints(input([], { partySize: 5 })).base).toBe(17);
  });

  it('treats a party of zero as one PC', () => {
    expect(computeBattlePoints(input([], { partySize: 0 })).base).toBe(5);
  });

  it('prices each type', () => {
    const r = computeBattlePoints(input([of('SOLO'), of('BRUISER'), of('LEADER'), of('STANDARD'), of('SUPPORT')]));
    expect(r.spent).toBe(5 + 4 + 3 + 2 + 1);
  });

  it('prices Minions per party-sized group, rounding a partial group up', () => {
    expect(computeBattlePoints(input([of('MINION', 4)])).spent).toBe(1);
    expect(computeBattlePoints(input([of('MINION', 5)])).spent).toBe(2);
    // Stacks are pooled before grouping: 3 + 3 is 6 Minions, 2 groups of 4.
    expect(computeBattlePoints(input([of('MINION', 3), of('MINION', 3)])).spent).toBe(2);
  });

  it('leaves an untyped Adversary unpriced and reports it', () => {
    const r = computeBattlePoints(input([of(null), of('STANDARD')]));
    expect(r.spent).toBe(2);
    expect(r.untyped).toBe(1);
  });

  it('applies the manual adjustments', () => {
    const r = computeBattlePoints(input([of('SOLO')], { easier: true, harder: true, bonusDamage: true }));
    expect(r.budget).toBe(14 - 1 + 2 - 2);
  });

  it('takes 2 off for two or more Solos', () => {
    expect(applied(computeBattlePoints(input([of('SOLO')])))).toEqual([]);
    const r = computeBattlePoints(input([of('SOLO'), of('SOLO')]));
    expect(applied(r)).toEqual(['multipleSolos']);
    expect(r.budget).toBe(12);
  });

  it('adds 1 when an adversary is from a lower tier than the party', () => {
    const r = computeBattlePoints(input([of('SOLO', 1, 1)], { partyTier: 2 }));
    expect(applied(r)).toEqual(['lowerTier']);
    expect(r.budget).toBe(15);
  });

  it('adds 1 when there are no Bruisers, Hordes, Leaders or Solos, but not for an empty board', () => {
    expect(applied(computeBattlePoints(input([of('STANDARD')])))).toEqual(['nothingHeavy']);
    expect(applied(computeBattlePoints(input([of('STANDARD'), of('HORDE')])))).toEqual([]);
    expect(applied(computeBattlePoints(input([])))).toEqual([]);
  });
});
