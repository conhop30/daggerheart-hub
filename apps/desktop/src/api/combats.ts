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
}

export const combatsApi = {
  ...createSessionScopedCrudApi<Combat, CreateCombatRequest, UpdateCombatRequest>('combats'),
  listBySession: (sessionId: string) => apiClient.listCombatsBySession<Combat>(sessionId),
};
