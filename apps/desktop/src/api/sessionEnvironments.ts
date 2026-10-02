import { apiClient } from './client';
import { createSessionScopedCrudApi } from './createCrudApi';

// A snapshot of a master Environment at pull-in time, not a live reference —
// see electron/store.js's comment on buildSessionEnvironment for why.
export interface SessionEnvironment {
  id: string;
  sessionId: string;
  environmentId: string;
  label: string;
  name: string;
  tier: number | null;
  difficulty: number | null;
  description: string | null;
  impulses: string[];
  notes: string | null;
  /** True when this was pulled in (or last changed) in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreateSessionEnvironmentRequest {
  sessionId: string;
  environmentId: string;
  /** Defaults to the master Environment's name — set this to tell two pulled-in copies apart. */
  label?: string;
  notes?: string;
}

export interface UpdateSessionEnvironmentRequest {
  label?: string;
  notes?: string;
  /** Adjusted independently of the master Environment once pulled in — see SessionEnvironmentTile. */
  difficulty?: number | null;
}

export const sessionEnvironmentsApi = {
  ...createSessionScopedCrudApi<SessionEnvironment, CreateSessionEnvironmentRequest, UpdateSessionEnvironmentRequest>(
    'sessionEnvironments'
  ),
  listBySession: (sessionId: string) => apiClient.listSessionEnvironmentsBySession<SessionEnvironment>(sessionId),
};
