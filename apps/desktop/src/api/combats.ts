import { apiClient } from './client';
import { createSessionScopedCrudApi } from './createCrudApi';

// A GM-visible workspace inside a Session that scopes a subset of pulled-in
// SessionAdversaries/SessionEnvironments ("Boss Fight" vs "Random
// Encounter") — see electron/store.js's "Combats" section. Versioned the
// same way SessionAdversary/SessionEnvironment are: a tab created in one
// Session carries forward into later Sessions of the same Campaign unless
// deleted from some Session on.
export interface Combat {
  id: string;
  sessionId: string;
  name: string;
  order: number;
  /** Battle Points: the PC count to budget for, when it isn't the Party roster's own size (an absent player, a guest). */
  partySizeOverride: number | null;
  /** Battle Points adjustments that are the GM's intent, not readable off the roster — see lib/battlePoints. */
  easier: boolean;
  harder: boolean;
  bonusDamage: boolean;
  /** True when this tab was created (or last renamed/reordered) in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreateCombatRequest {
  sessionId: string;
  name: string;
  order: number;
}

export interface UpdateCombatRequest {
  name?: string;
  order?: number;
  partySizeOverride?: number | null;
  easier?: boolean;
  harder?: boolean;
  bonusDamage?: boolean;
}

export const combatsApi = {
  ...createSessionScopedCrudApi<Combat, CreateCombatRequest, UpdateCombatRequest>('combats'),
  listBySession: (sessionId: string) => apiClient.listCombatsBySession<Combat>(sessionId),
};
