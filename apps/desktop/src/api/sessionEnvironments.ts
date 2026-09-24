import { apiClient, type SessionContext } from './client';

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
}

export const sessionEnvironmentsApi = {
  list: () => apiClient.list<SessionEnvironment>('sessionEnvironments'),
  listBySession: (sessionId: string) => apiClient.listSessionEnvironmentsBySession<SessionEnvironment>(sessionId),
  create: (body: CreateSessionEnvironmentRequest) => apiClient.create<SessionEnvironment>('sessionEnvironments', body),
  update: (id: string, body: UpdateSessionEnvironmentRequest, ctx: SessionContext) =>
    apiClient.update<SessionEnvironment>('sessionEnvironments', id, body, ctx),
  remove: (id: string, ctx: SessionContext) => apiClient.remove('sessionEnvironments', id, ctx),
};
