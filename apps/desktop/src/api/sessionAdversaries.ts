import { apiClient } from './client';
import { createSessionScopedCrudApi } from './createCrudApi';
import type { AdversaryType, AttackRange, AttackType } from './adversaries';
import type { Thresholds } from '../components/ThresholdsInput';
import type { Experience } from '../components/ExperienceListEditor';
import type { SessionCondition } from '../lib/conditions';

// A snapshot of a master Adversary at pull-in time, not a live reference —
// see electron/store.js's comment on buildSessionAdversary for why.
export interface SessionAdversary {
  id: string;
  sessionId: string;
  /** Which Combat tab this was pulled into — see api/combats.ts. Records predating Combat tabs read as null until first opened, when they are adopted into the first tab. */
  combatId: string | null;
  adversaryId: string;
  label: string;
  name: string;
  type: AdversaryType | null;
  /** How many identical Minions this one record stands for — always 1 for every other type. See lib/minionGroups. */
  count: number;
  /** Shared by stacks of different Minions dragged into one mixed group; null when this stack stands alone. */
  groupId: string | null;
  tier: number | null;
  /** The book's own Difficulty/Thresholds — no longer edited directly once pulled in; see difficultyModifier/thresholdsModifier. */
  difficulty: number | null;
  thresholds: Thresholds;
  hpMax: number | null;
  stressMax: number | null;
  attackModifier: number | null;
  attackDescription: string | null;
  attackRange: AttackRange | null;
  attackType: AttackType | null;
  experiences: Experience[];
  hpMarked: number;
  stressMarked: number;
  /** A live adjustment layered onto `difficulty` — e.g. a GM toughening a fight, or a Condition's stacked penalty (see lib/conditions). */
  difficultyModifier: number | null;
  /** Same idea as difficultyModifier, one per Threshold. */
  thresholdsModifier: Thresholds;
  conditions: SessionCondition[];
  /** True when this was pulled in (or last changed) in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreateSessionAdversaryRequest {
  sessionId: string;
  combatId: string;
  adversaryId: string;
  /** Defaults to the master Adversary's name — set this to tell two pulled-in copies apart. */
  label?: string;
  count?: number;
  groupId?: string | null;
}

export interface UpdateSessionAdversaryRequest {
  /** Only ever sent to adopt a pre-Combat-tabs record into the first tab — see SessionView. */
  combatId?: string;
  count?: number;
  groupId?: string | null;
  label?: string;
  hpMarked?: number;
  stressMarked?: number;
  conditions?: SessionCondition[];
  /** Adjusted independently of the master Adversary once pulled in — see SessionAdversaryTile. */
  difficulty?: number | null;
  thresholds?: Thresholds;
  difficultyModifier?: number | null;
  thresholdsModifier?: Thresholds;
}

export const sessionAdversariesApi = {
  ...createSessionScopedCrudApi<SessionAdversary, CreateSessionAdversaryRequest, UpdateSessionAdversaryRequest>(
    'sessionAdversaries'
  ),
  listBySession: (sessionId: string) => apiClient.listSessionAdversariesBySession<SessionAdversary>(sessionId),
};
