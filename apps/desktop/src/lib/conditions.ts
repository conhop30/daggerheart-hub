// A stacked Condition on a pulled-in Adversary — count is a real multiplier
// (two stacks of Corrosive is twice the penalty), not just "how many times
// you typed the same word". Condition names stay free text (the corebook
// doesn't define a fixed list, and homebrew Adversaries invent their own),
// so only a handful of known keywords below actually do anything.

export interface SessionCondition {
  name: string;
  count: number;
}

interface ConditionEffect {
  /** Added to effective Difficulty once per stack — negative for a penalty. */
  difficultyPerStack: number;
}

// Keyed lowercase/trimmed — see conditionEffect(). New keyword conditions
// that should carry a mechanical effect (not just a reminder label) get
// added here, not scattered through the UI.
const CONDITION_EFFECTS: Record<string, ConditionEffect> = {
  corrosive: { difficultyPerStack: -1 },
};

// `name` is typed as a required string, but this also runs against data
// read straight off disk (electron/store.js's presentSessionAdversary
// normalizes it going forward, but never rewrites what's already stored) —
// a non-string slipping through here shouldn't crash the whole Combat
// panel over a cosmetic lookup, so this tolerates one instead of trusting
// the type.
export function conditionEffect(name: string): ConditionEffect | undefined {
  return typeof name === 'string' ? CONDITION_EFFECTS[name.trim().toLowerCase()] : undefined;
}

/** Sum of every stacked Condition's Difficulty effect — what SessionAdversaryTile folds into its effective Difficulty readout. */
export function difficultyModifierFromConditions(conditions: SessionCondition[]): number {
  if (!Array.isArray(conditions)) return 0;
  return conditions.reduce((sum, c) => sum + (conditionEffect(c?.name)?.difficultyPerStack ?? 0) * (c?.count ?? 1), 0);
}
