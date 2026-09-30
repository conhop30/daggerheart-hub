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

// The "2d10+10 mag" half of "2d10+10 mag = 23" — re-derived from the same
// free text parseDamageNotation reads, including the damage-type word
// (phy/mag/etc.) that parseDamageNotation itself discards, since that's
// worth keeping for display even though it plays no role in the math.
// Falls back to reconstructing plain notation from the already-parsed
// numbers if the text doesn't match either shape (e.g. imported homebrew
// phrased its damage differently).
export function damageNotationLabel(text: string | null | undefined, parsed: ParsedDamage): string {
  if (text) {
    const diceMatch = text.match(/(\d+)?d(\d+)\s*([+-]\s*\d+)?\s*(\w+)?\s*damage/i);
    if (diceMatch) {
      const notation = `${diceMatch[1] ?? '1'}d${diceMatch[2]}${diceMatch[3] ? diceMatch[3].replace(/\s+/g, '') : ''}`;
      return diceMatch[4] ? `${notation} ${diceMatch[4]}` : notation;
    }
    const flatMatch = text.match(/(\d+)\s*(\w+)?\s*damage/i);
    if (flatMatch) return flatMatch[2] ? `${flatMatch[1]} ${flatMatch[2]}` : flatMatch[1];
  }
  if (parsed.count > 0) {
    return `${parsed.count}d${parsed.sides}${parsed.modifier ? (parsed.modifier > 0 ? `+${parsed.modifier}` : parsed.modifier) : ''}`;
  }
  return `${parsed.modifier}`;
}

/** The "[2d6, 1d10]" half of a DiceTray roll's log line. */
export function formatDiceQueueLabel(queue: DiceQueueEntry[]): string {
  return `[${queue.map((q) => `${q.count}d${q.sides}`).join(', ')}]`;
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
