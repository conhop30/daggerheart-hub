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

export function conditionEffect(name: string): ConditionEffect | undefined {
  return CONDITION_EFFECTS[name.trim().toLowerCase()];
}

/** Sum of every stacked Condition's Difficulty effect — what SessionAdversaryTile folds into its effective Difficulty readout. */
export function difficultyModifierFromConditions(conditions: SessionCondition[]): number {
  return conditions.reduce((sum, c) => sum + (conditionEffect(c.name)?.difficultyPerStack ?? 0) * c.count, 0);
}
