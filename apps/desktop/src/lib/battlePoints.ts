import type { AdversaryType } from '../api/adversaries';

// The corebook's encounter-building budget ("Battle Points"): a party gets
// (3 x PCs) + 2 points, each Adversary type has a price, and a handful of
// circumstances move the budget up or down. Pure functions, no React and no
// API — everything a Combat tab's BattlePointsBar shows is derived here.

/** Minions are priced per party-sized group, not per head — see spentOn(). */
const COST: Record<Exclude<AdversaryType, 'MINION'>, number> = {
  SOCIAL: 1,
  SUPPORT: 1,
  HORDE: 2,
  RANGED: 2,
  SKULK: 2,
  STANDARD: 2,
  LEADER: 3,
  BRUISER: 4,
  SOLO: 5,
};

const TYPE_LABEL: Record<AdversaryType, string> = {
  STANDARD: 'Standard',
  BRUISER: 'Bruiser',
  HORDE: 'Horde',
  LEADER: 'Leader',
  MINION: 'Minion',
  RANGED: 'Ranged',
  SKULK: 'Skulk',
  SOCIAL: 'Social',
  SOLO: 'Solo',
  SUPPORT: 'Support',
};

/** The four types whose total absence earns the "+1, nothing heavy" adjustment. */
const HEAVY: AdversaryType[] = ['BRUISER', 'HORDE', 'LEADER', 'SOLO'];

export interface BattlePointsCombatant {
  type: AdversaryType | null;
  tier: number | null;
  /** How many of this Adversary the record stands for (a Minion stack); 1 otherwise. */
  count: number;
}

export interface BattlePointsInput {
  partySize: number;
  /** The party's tier, from its level — see tierForLevel. */
  partyTier: number;
  combatants: BattlePointsCombatant[];
  easier: boolean;
  harder: boolean;
  bonusDamage: boolean;
}

export interface BattlePointsLine {
  label: string;
  count: number;
  cost: number;
}

export interface BattlePointsAdjustment {
  key: 'easier' | 'harder' | 'bonusDamage' | 'multipleSolos' | 'lowerTier' | 'nothingHeavy';
  label: string;
  delta: number;
  applied: boolean;
  /** True when the GM toggles it; false when it's read off the roster. */
  manual: boolean;
}

export interface BattlePointsResult {
  base: number;
  budget: number;
  spent: number;
  lines: BattlePointsLine[];
  adjustments: BattlePointsAdjustment[];
  /** Pulled-in Adversaries with no type set — unpriced, so the total is understated until they're fixed. */
  untyped: number;
}

/** Daggerheart's level bands: 1 is Tier 1, 2-4 Tier 2, 5-7 Tier 3, 8-10 Tier 4. */
export function tierForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

export function computeBattlePoints(input: BattlePointsInput): BattlePointsResult {
  const partySize = Math.max(1, Math.round(input.partySize) || 1);
  const base = 3 * partySize + 2;

  const counts = new Map<AdversaryType, number>();
  let untyped = 0;
  for (const c of input.combatants) {
    const n = Math.max(1, c.count || 1);
    if (!c.type) untyped += n;
    else counts.set(c.type, (counts.get(c.type) ?? 0) + n);
  }

  const lines: BattlePointsLine[] = [];
  for (const [type, count] of counts) {
    // A partial group of Minions still costs a whole point.
    const cost = type === 'MINION' ? Math.ceil(count / partySize) : COST[type] * count;
    lines.push({ label: TYPE_LABEL[type], count, cost });
  }
  lines.sort((a, b) => b.cost - a.cost || a.label.localeCompare(b.label));
  const spent = lines.reduce((sum, line) => sum + line.cost, 0);

  // The two "nothing on the board yet" cases would otherwise hand out a
  // bonus for an empty roster.
  const hasCombatants = input.combatants.length > 0;
  const adjustments: BattlePointsAdjustment[] = [
    { key: 'easier', label: 'Easier or shorter fight', delta: -1, applied: input.easier, manual: true },
    { key: 'harder', label: 'Harder or longer fight', delta: 2, applied: input.harder, manual: true },
    { key: 'bonusDamage', label: '+1d4 (or +2) to all adversary damage', delta: -2, applied: input.bonusDamage, manual: true },
    { key: 'multipleSolos', label: 'Two or more Solos', delta: -2, applied: (counts.get('SOLO') ?? 0) >= 2, manual: false },
    {
      key: 'lowerTier',
      label: 'An adversary from a lower tier',
      delta: 1,
      applied: input.combatants.some((c) => c.tier != null && c.tier < input.partyTier),
      manual: false,
    },
    {
      key: 'nothingHeavy',
      label: 'No Bruisers, Hordes, Leaders or Solos',
      delta: 1,
      applied: hasCombatants && !HEAVY.some((type) => counts.has(type)),
      manual: false,
    },
  ];
  const budget = base + adjustments.reduce((sum, a) => sum + (a.applied ? a.delta : 0), 0);

  return { base, budget, spent, lines, adjustments, untyped };
}
