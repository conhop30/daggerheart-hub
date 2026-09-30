// Pure dice math — no IPC, no store access — same shape as lootRoll.ts:
// an injectable rng makes every roll deterministically testable instead of
// mocking Math.random.

export const DIE_SIZES = [4, 6, 8, 10, 12, 20, 100] as const;
export type DieSize = (typeof DIE_SIZES)[number];

export function rollDie(sides: number, rng: () => number = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

export function rollDice(count: number, sides: number, rng: () => number = Math.random): number[] {
  return Array.from({ length: count }, () => rollDie(sides, rng));
}

export interface ParsedDamage {
  /** 0 when the text carries a flat value with no dice at all (e.g. "1 phy damage"). */
  count: number;
  /** 0 alongside count: 0 for a flat value. */
  sides: number;
  modifier: number;
}

// Adversary attackDescription is free text like "Claws: 1d12+2 phy damage"
// or, for the weakest attacks, just a flat "1 phy damage" with no die at
// all — both are real data in the imported corebook content.
export function parseDamageNotation(text: string | null | undefined): ParsedDamage | null {
  if (!text) return null;
  const diceMatch = text.match(/(\d+)?d(\d+)\s*([+-]\s*\d+)?/i);
  if (diceMatch) {
    const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
    const sides = parseInt(diceMatch[2], 10);
    const modifier = diceMatch[3] ? parseInt(diceMatch[3].replace(/\s+/g, ''), 10) : 0;
    if (count > 0 && sides > 0) return { count, sides, modifier };
  }
  const flatMatch = text.match(/(\d+)/);
  if (flatMatch) return { count: 0, sides: 0, modifier: parseInt(flatMatch[1], 10) };
  return null;
}

export interface DamageRollResult {
  rolls: number[];
  modifier: number;
  total: number;
}

export function rollDamage(parsed: ParsedDamage, rng: () => number = Math.random): DamageRollResult {
  const rolls = parsed.count > 0 ? rollDice(parsed.count, parsed.sides, rng) : [];
  const total = rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier;
  return { rolls, modifier: parsed.modifier, total };
}

/** One die size's queued count in the dice tray, e.g. { sides: 20, count: 2 }. */
export interface DiceQueueEntry {
  sides: number;
  count: number;
}

export interface DiceTrayRollResult {
  entries: { sides: number; rolls: number[] }[];
  total: number;
}

// Rolls every queued die size's full count in one pass and sums everything
// together — the dice tray only ever reports one grand total plus the
// per-size breakdown that produced it.
export function rollDiceQueue(queue: DiceQueueEntry[], rng: () => number = Math.random): DiceTrayRollResult {
  const entries = queue
    .filter((q) => q.count > 0)
    .map((q) => ({ sides: q.sides, rolls: rollDice(q.count, q.sides, rng) }));
  const total = entries.reduce((sum, e) => sum + e.rolls.reduce((a, b) => a + b, 0), 0);
  return { entries, total };
}
