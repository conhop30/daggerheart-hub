// A Session-scoped log of every roll made in Combat — Roll Damage and the
// freeform DiceTray both feed into the same list (owned by SessionView, see
// its comment), newest first. Deliberately not persisted to the store: a
// roll history is table chatter, not campaign data worth saving to disk.

export interface RollLogEntry {
  id: string;
  /** Pre-composed text before the "=", e.g. "Construct damage" or "Dice roller [2d6, 1d10]". */
  label: string;
  total: number;
  time: number;
}

let nextId = 0;

export function makeRollLogEntry(label: string, total: number): RollLogEntry {
  return { id: `roll-${Date.now()}-${nextId++}`, label, total, time: Date.now() };
}
